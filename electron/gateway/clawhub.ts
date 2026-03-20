/**
 * ClawHub Service
 * Manages interactions with the ClawHub CLI for skills management
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { app, shell } from 'electron';
import { getOpenClawConfigDir, ensureDir, getClawHubCliBinPath, getClawHubCliEntryPath } from '../utils/paths';

export interface ClawHubSearchParams {
    query: string;
    limit?: number;
}

export interface ClawHubInstallParams {
    slug: string;
    version?: string;
    force?: boolean;
}

export interface ClawHubUninstallParams {
    slug: string;
}

export interface ClawHubSkillResult {
    slug: string;
    name: string;
    description: string;
    version: string;
    author?: string;
    downloads?: number;
    stars?: number;
}

export class ClawHubService {
    private workDir: string;
    private cliPath: string;
    private cliEntryPath: string;
    private useNodeRunner: boolean;
    private ansiRegex: RegExp;

    constructor() {
        // Use the user's OpenClaw config directory (~/.openclaw) for skill management
        // This avoids installing skills into the project's openclaw submodule
        this.workDir = getOpenClawConfigDir();
        ensureDir(this.workDir);

        const binPath = getClawHubCliBinPath();
        const entryPath = getClawHubCliEntryPath();

        this.cliEntryPath = entryPath;

        // Prefer using node to run the entry script directly for better compatibility
        // The bin wrapper is a shell script that may not work well with spawn() on all platforms
        if (fs.existsSync(entryPath)) {
            // Use node to run the CLI entry script directly
            this.cliPath = process.execPath;
            this.useNodeRunner = true;
            console.log(`[ClawHub] Using node runner with entry: ${entryPath}`);
        } else if (!app.isPackaged && fs.existsSync(binPath)) {
            // Fallback to bin wrapper (only in development)
            this.cliPath = binPath;
            this.useNodeRunner = false;
            console.log(`[ClawHub] Using bin wrapper: ${binPath}`);
        } else {
            this.cliPath = process.execPath;
            this.useNodeRunner = true;
            console.log(`[ClawHub] Using node runner (fallback)`);
        }

        const esc = String.fromCharCode(27);
        const csi = String.fromCharCode(155);
        const pattern = `(?:${esc}|${csi})[[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]`;
        this.ansiRegex = new RegExp(pattern, 'g');
    }

    private stripAnsi(line: string): string {
        return line.replace(this.ansiRegex, '').trim();
    }

    /**
     * Run a ClawHub CLI command
     */
    private async runCommand(args: string[], timeoutMs = 60000): Promise<string> {
        return new Promise((resolve, reject) => {
            if (this.useNodeRunner && !fs.existsSync(this.cliEntryPath)) {
                reject(new Error(`ClawHub CLI entry not found at: ${this.cliEntryPath}`));
                return;
            }

            if (!this.useNodeRunner && !fs.existsSync(this.cliPath)) {
                reject(new Error(`ClawHub CLI not found at: ${this.cliPath}`));
                return;
            }

            const commandArgs = this.useNodeRunner ? [this.cliEntryPath, ...args] : args;
            const displayCommand = [this.cliPath, ...commandArgs].join(' ');
            console.log(`Running ClawHub command: ${displayCommand}`);

            const isWin = process.platform === 'win32';
            const env = {
                ...process.env,
                CI: 'true',
                FORCE_COLOR: '0', // Disable colors for easier parsing
            };
            if (this.useNodeRunner) {
                env.ELECTRON_RUN_AS_NODE = '1';
            }
            const child = spawn(this.cliPath, commandArgs, {
                cwd: this.workDir,
                shell: isWin && !this.useNodeRunner,
                env: {
                    ...env,
                    CLAWHUB_WORKDIR: this.workDir,
                },
            });

            let stdout = '';
            let stderr = '';
            let resolved = false;
            let timeoutId: NodeJS.Timeout | null = null;

            // Set timeout to prevent hanging
            timeoutId = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    child.kill();
                    const timeoutError = new Error(`ClawHub command timed out after ${timeoutMs}ms: ${displayCommand}`);
                    console.error(timeoutError.message);
                    reject(timeoutError);
                }
            }, timeoutMs);

            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('error', (error) => {
                if (timeoutId) clearTimeout(timeoutId);
                if (!resolved) {
                    resolved = true;
                    console.error('ClawHub process error:', error);
                    reject(error);
                }
            });

            child.on('close', (code) => {
                if (timeoutId) clearTimeout(timeoutId);
                if (resolved) return; // Already resolved (timeout)

                if (code !== 0 && code !== null) {
                    console.error(`ClawHub command failed with code ${code}`);
                    console.error('Stderr:', stderr);
                    reject(new Error(`Command failed: ${stderr || stdout}`));
                } else {
                    console.log(`ClawHub command completed: ${displayCommand}`);
                    resolve(stdout.trim());
                }
            });
        });
    }

    /**
     * Search for skills
     */
    async search(params: ClawHubSearchParams): Promise<ClawHubSkillResult[]> {
        try {
            // If query is empty, use a default popular search to show trending skills
            // Note: 'explore' command doesn't work in all environments, so we use search instead
            const query = params.query?.trim() || 'tool';

            const args = ['search', query];
            if (params.limit) {
                args.push('--limit', String(params.limit));
            }

            const output = await this.runCommand(args);
            if (!output || output.includes('No skills found')) {
                return [];
            }

            const lines = output.split('\n').filter(l => l.trim());
            const results: ClawHubSkillResult[] = lines.map(line => {
                const cleanLine = this.stripAnsi(line);

                // Format 1: search results - "slug  Name  (score)"
                // Example: "ai-agent-helper  AI Agent Helper  (3.536)"
                const searchMatch = cleanLine.match(/^(\S+)\s+(.+?)\s+\((\d+\.\d+)\)$/);
                if (searchMatch) {
                    return {
                        slug: searchMatch[1],
                        name: searchMatch[2],
                        version: '', // Search results don't include version
                        description: searchMatch[2],
                    };
                }

                // Format 2: list output - "slug vversion"
                // Example: "apple-reminders  1.0.0"
                const listMatch = cleanLine.match(/^(\S+)\s+v?(\d+\.\S+)$/);
                if (listMatch) {
                    return {
                        slug: listMatch[1],
                        name: listMatch[1],
                        version: listMatch[2],
                        description: '',
                    };
                }

                return null;
            }).filter((s): s is ClawHubSkillResult => s !== null);

            // Fetch stats for top results (limit to 10 for performance)
            const statsLimit = 10;
            const topResults = results.slice(0, statsLimit);
            const statsResults = await Promise.all(
                topResults.map(async (result) => {
                    const stats = await this.inspectSkill(result.slug);
                    return {
                        ...result,
                        downloads: stats.downloads,
                        stars: stats.stars,
                    };
                })
            );

            // Merge stats back with original results
            const statsMap = new Map(statsResults.map(r => [r.slug, r]));
            return results.map(r => ({
                ...r,
                downloads: statsMap.get(r.slug)?.downloads ?? r.downloads,
                stars: statsMap.get(r.slug)?.stars ?? r.stars,
            }));
        } catch (error) {
            console.error('ClawHub search error:', error);
            return [];
        }
    }

    /**
     * Explore trending skills
     */
    async explore(params: { limit?: number } = {}): Promise<ClawHubSkillResult[]> {
        try {
            const args = ['explore'];
            if (params.limit) {
                args.push('--limit', String(params.limit));
            }

            const output = await this.runCommand(args);
            if (!output) return [];

            const lines = output.split('\n').filter(l => l.trim());
            return lines.map(line => {
                const cleanLine = this.stripAnsi(line);

                // Format: slug vversion time description
                // Example: my-skill v1.0.0 2 hours ago A great skill
                const match = cleanLine.match(/^(\S+)\s+v?(\d+\.\S+)\s+(.+? ago|just now|yesterday)\s+(.+)$/i);
                if (match) {
                    return {
                        slug: match[1],
                        name: match[1],
                        version: match[2],
                        description: match[4],
                    };
                }
                return null;
            }).filter((s): s is ClawHubSkillResult => s !== null);
        } catch (error) {
            console.error('ClawHub explore error:', error);
            return [];
        }
    }

    /**
     * Inspect a skill to get detailed stats (stars, downloads, etc.)
     */
    async inspectSkill(slug: string): Promise<{ stars?: number; downloads?: number; installsAllTime?: number }> {
        try {
            const output = await this.runCommand(['inspect', slug, '--json']);
            if (!output) return {};

            // Extract JSON from output (remove any non-JSON lines like "- Fetching skill")
            const jsonMatch = output.match(/\{[\s\S]*\}/);
            if (!jsonMatch) return {};

            const data = JSON.parse(jsonMatch[0]);
            if (data.skill?.stats) {
                return {
                    stars: data.skill.stats.stars,
                    downloads: data.skill.stats.downloads,
                    installsAllTime: data.skill.stats.installsAllTime,
                };
            }
            return {};
        } catch (error) {
            console.error(`ClawHub inspect error for ${slug}:`, error);
            return {};
        }
    }

    /**
     * Install a skill
     */
    async install(params: ClawHubInstallParams): Promise<void> {
        const args = ['install', params.slug];

        if (params.version) {
            args.push('--version', params.version);
        }

        if (params.force) {
            args.push('--force');
        }

        await this.runCommand(args);
    }

    /**
     * Uninstall a skill
     */
    async uninstall(params: ClawHubUninstallParams): Promise<void> {
        const fsPromises = fs.promises;

        // 1. Delete the skill directory
        const skillDir = path.join(this.workDir, 'skills', params.slug);
        if (fs.existsSync(skillDir)) {
            console.log(`Deleting skill directory: ${skillDir}`);
            await fsPromises.rm(skillDir, { recursive: true, force: true });
        }

        // 2. Remove from lock.json
        const lockFile = path.join(this.workDir, '.clawhub', 'lock.json');
        if (fs.existsSync(lockFile)) {
            try {
                const lockData = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
                if (lockData.skills && lockData.skills[params.slug]) {
                    console.log(`Removing ${params.slug} from lock.json`);
                    delete lockData.skills[params.slug];
                    await fsPromises.writeFile(lockFile, JSON.stringify(lockData, null, 2));
                }
            } catch (err) {
                console.error('Failed to update ClawHub lock file:', err);
            }
        }
    }

    /**
     * List installed skills
     */
    async listInstalled(): Promise<Array<{ slug: string; version: string }>> {
        try {
            const output = await this.runCommand(['list']);
            if (!output || output.includes('No installed skills')) {
                return [];
            }

            const lines = output.split('\n').filter(l => l.trim());
            return lines.map(line => {
                const cleanLine = this.stripAnsi(line);
                const match = cleanLine.match(/^(\S+)\s+v?(\d+\.\S+)/);
                if (match) {
                    return {
                        slug: match[1],
                        version: match[2],
                    };
                }
                return null;
            }).filter((s): s is { slug: string; version: string } => s !== null);
        } catch (error) {
            console.error('ClawHub list error:', error);
            return [];
        }
    }

    /**
     * Open skill README/manual in default editor
     */
    async openSkillReadme(slug: string): Promise<boolean> {
        const skillDir = path.join(this.workDir, 'skills', slug);

        // Try to find documentation file
        const possibleFiles = ['SKILL.md', 'README.md', 'skill.md', 'readme.md'];
        let targetFile = '';

        for (const file of possibleFiles) {
            const filePath = path.join(skillDir, file);
            if (fs.existsSync(filePath)) {
                targetFile = filePath;
                break;
            }
        }

        if (!targetFile) {
            // If no md file, just open the directory
            if (fs.existsSync(skillDir)) {
                targetFile = skillDir;
            } else {
                throw new Error('Skill directory not found');
            }
        }

        try {
            // Open file with default application
            await shell.openPath(targetFile);
            return true;
        } catch (error) {
            console.error('Failed to open skill readme:', error);
            throw error;
        }
    }
}
