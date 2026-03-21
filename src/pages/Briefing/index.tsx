/**
 * Briefing Page
 * Daily AI Briefing - Generate and manage daily news summaries
 */
import { useEffect, useState } from 'react';
import {
  Gear,
  Play,
  Clock,
  FileText,
  ArrowClockwise,
  Calendar,
  Link,
  X,
  FloppyDisk,
  Plus,
  FolderOpen,
} from '@phosphor-icons/react';
import { Card, CardContent } from '@/components/ui/card';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';

interface BriefingSettings {
  briefingTime: string;
  focusTopics: string[];
  obsidianVaultPath: string;
  timezoneOffset: number;
  enabled: boolean;
  searchMode: 'knowledge' | 'web';
}

interface BriefingData {
  lastGenerated: string | null;
  content: string;
  topics: string[];
}

export function Briefing() {
  const { t } = useTranslation('briefing');
  // Note: language is detected at generation time using navigator.language
  // to ensure it follows system language dynamically

  const [settings, setSettings] = useState<BriefingSettings>({
    briefingTime: '08:00',
    focusTopics: ['AI News', 'Bitcoin'],
    obsidianVaultPath: '',
    timezoneOffset: -new Date().getTimezoneOffset(),
    enabled: false,
    searchMode: 'knowledge',
  });

  const [briefingData, setBriefingData] = useState<BriefingData>({
    lastGenerated: null,
    content: '',
    topics: [],
  });

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showObsidianTip, setShowObsidianTip] = useState(false);

  // Fetch settings and content on mount
  useEffect(() => {
    fetchSettings();
    fetchContent();
  }, []);

  const fetchSettings = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('briefing:getSettings') as {
        success: boolean;
        settings?: BriefingSettings;
        error?: string;
      };
      console.log('[Briefing] Fetched settings:', JSON.stringify(result));
      if (result.success && result.settings) {
        setSettings(result.settings);
        console.log('[Briefing] Settings applied, focusTopics:', result.settings.focusTopics);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  const fetchContent = async () => {
    try {
      setLoading(true);
      const result = await window.electron.ipcRenderer.invoke('briefing:getContent') as {
        success: boolean;
        data?: BriefingData;
        error?: string;
      };
      if (result.success && result.data) {
        setBriefingData(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch content:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      // Auto-add new topic if there's input
      let topicsToSave = [...settings.focusTopics];
      const newTopicLower = newTopic.trim().toLowerCase();

      // Check for duplicates (case-insensitive)
      const isDuplicate = topicsToSave.some(t => t.toLowerCase() === newTopicLower);

      if (newTopic.trim() && !isDuplicate) {
        topicsToSave = [...topicsToSave, newTopic.trim()];
        setNewTopic('');
      }

      const settingsToSave = { ...settings, focusTopics: topicsToSave };

      const result = await window.electron.ipcRenderer.invoke('briefing:saveSettings', settingsToSave) as {
        success: boolean;
        error?: string;
      };
      console.log('[Briefing] Saved settings, topics:', settingsToSave.focusTopics);
      if (result.success) {
        setSettings(settingsToSave);
        setShowSettings(false);
      } else {
        setError(result.error || 'Failed to save settings');
      }
    } catch (err) {
      setError(String(err));
    }
  };

  const selectDirectory = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('briefing:selectDirectory') as {
        success: boolean;
        path?: string;
        canceled?: boolean;
        error?: string;
      };

      if (result.success && result.path) {
        setSettings({ ...settings, obsidianVaultPath: result.path });
      }
    } catch (err) {
      console.error('Failed to select directory:', err);
    }
  };

  const generateBriefing = async () => {
    try {
      setGenerating(true);
      setError(null);

      console.log('[Briefing] Generate called, topics:', settings.focusTopics);

      // Detect current system language at generation time via Electron main process
      // navigator.language in Electron webview reflects app/Chromium locale, not OS locale
      // Use IPC to get the real OS locale via app.getLocale()
      const systemLocale = await window.electron.ipcRenderer.invoke('system:getLocale') as string;
      const lowerLocale = systemLocale.toLowerCase();
      const detectedLang = lowerLocale.startsWith('zh') ? 'zh' : lowerLocale.startsWith('ja') ? 'ja' : 'en';
      console.log('[Briefing] System locale:', systemLocale, '-> detected:', detectedLang);

      const result = await window.electron.ipcRenderer.invoke('briefing:generate', {
        topics: settings.focusTopics,
        obsidianVaultPath: settings.obsidianVaultPath,
        language: detectedLang,
        searchMode: settings.searchMode,
      }) as {
        success: boolean;
        content?: string;
        obsidianPath?: string;
        topics?: string[];
        lastGenerated?: string;
        error?: string;
      };

      // Add a small delay to ensure backend file I/O is complete
      await new Promise(resolve => setTimeout(resolve, 500));

      if (result.success) {
        // Use returned content directly instead of re-reading from file
        if (result.content) {
          console.log('[Briefing] Setting state with new content');

          // Strip outer markdown code block wrapper if present (AI often wraps in ```markdown ... ```)
          let rawContent = result.content;
          const codeBlockMatch = result.content.match(/^```(?:markdown)?\s*\n?([\s\S]*?)\n?```\s*$/);
          if (codeBlockMatch) {
            rawContent = codeBlockMatch[1].trim();
            console.log('[Briefing] Stripped code block wrapper from content');
          }

          // Parse content if it's a JSON string (from Gateway response)
          let parsedContent = rawContent;
          try {
            const parsed = JSON.parse(rawContent);
            if (Array.isArray(parsed)) {
              // Handle array of content blocks (new Gateway format)
              // Supports: text blocks and toolCall blocks
              const textParts: string[] = [];
              for (const block of parsed) {
                if (block.type === 'text' && block.text) {
                  textParts.push(block.text);
                } else if (block.type === 'toolCall' || block.type === 'toolUse') {
                  // toolCall blocks: extract URL or other useful info
                  if (block.arguments && typeof block.arguments === 'object' && 'url' in block.arguments) {
                    textParts.push(`[${block.name || 'Tool'}: ${(block.arguments as Record<string, unknown>).url}]`);
                  } else if (block.arguments && typeof block.arguments === 'object' && 'content' in block.arguments) {
                    const content = (block.arguments as Record<string, unknown>).content;
                    if (typeof content === 'string') {
                      textParts.push(content);
                    }
                  }
                  // Skip raw toolCall JSON - it's not human-readable content
                } else if (block.type === 'tool_result' || block.type === 'toolResult') {
                  // tool_result blocks: extract actual tool execution results (e.g., web_fetch content)
                  const resultContent = block.content;
                  if (typeof resultContent === 'string') {
                    textParts.push(resultContent);
                  } else if (typeof resultContent === 'object' && resultContent !== null && 'content' in resultContent) {
                    const content = (resultContent as Record<string, unknown>).content;
                    if (typeof content === 'string') {
                      textParts.push(content);
                    }
                  } else if (typeof resultContent === 'object' && resultContent !== null && 'text' in resultContent) {
                    const text = (resultContent as Record<string, unknown>).text;
                    if (typeof text === 'string') {
                      textParts.push(text);
                    }
                  }
                }
              }
              parsedContent = textParts.join('\n');
              console.log('[Briefing] Parsed content from JSON array, parts:', textParts.length);
            }
          } catch {
            // Not JSON, use as-is
          }

          const newData = {
            content: parsedContent,
            topics: result.topics || settings.focusTopics,
            lastGenerated: result.lastGenerated || new Date().toISOString(),
          };
          console.log('[Briefing] New data:', newData);
          setBriefingData(newData);
          console.log('[Briefing] State set, content length:', parsedContent.length);
        } else {
          console.log('[Briefing] ERROR: No content in result!');
        }
        // Show Obsidian tip if path is set
        if (settings.obsidianVaultPath) {
          setShowObsidianTip(true);
        }
      } else {
        setError(result.error || 'Failed to generate briefing');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setGenerating(false);
    }
  };

  const addTopic = () => {
    if (newTopic.trim() && !settings.focusTopics.includes(newTopic.trim())) {
      setSettings({
        ...settings,
        focusTopics: [...settings.focusTopics, newTopic.trim()],
      });
      setNewTopic('');
    }
  };

  const removeTopic = (topic: string) => {
    setSettings({
      ...settings,
      focusTopics: settings.focusTopics.filter((t) => t !== topic),
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  // Calculate time until next briefing
  const getNextBriefingTime = () => {
    if (!settings.enabled || !settings.briefingTime) return null;

    const [hours, minutes] = settings.briefingTime.split(':').map(Number);
    const now = new Date();
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);

    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    const diff = next.getTime() - now.getTime();
    const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
    const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hoursLeft}h ${minutesLeft}m`;
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-lg">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground">{t('description')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setShowSettings(true)}>
            <Gear className="h-5 w-5" />
          </Button>
          <Button onClick={generateBriefing} disabled={generating}>
            {generating ? (
              <>
                <ArrowClockwise className="h-4 w-4 mr-2 animate-spin" />
                {t('generating')}
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                {t('generateNow')}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Status Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm">{t('nextBriefing')}</span>
              </div>
              <div className="text-2xl font-bold">
                {settings.enabled ? getNextBriefingTime() || '-' : t('disabled')}
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">{t('lastGenerated')}</span>
              </div>
              <div className="text-lg font-medium">
                {formatDate(briefingData.lastGenerated)}
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
                <Link className="h-4 w-4" />
                <span className="text-sm">{t('topics')}</span>
              </div>
              <div className="flex flex-wrap justify-center gap-1">
                {settings.focusTopics.slice(0, 3).map((topic) => (
                  <Badge key={topic} variant="secondary" className="text-xs">
                    {topic}
                  </Badge>
                ))}
                {settings.focusTopics.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{settings.focusTopics.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            {t('dismiss')}
          </button>
        </div>
      )}

      {/* Briefing Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t('loading')}</p>
        </div>
      ) : briefingData.content ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{briefingData.topics.join(', ')}</Badge>
              </div>
            </div>
            <div className="prose dark:prose-invert max-w-none">
              <MarkdownRenderer content={briefingData.content} unwrapMarkdownCodeBlocks />
            </div>

            {/* Obsidian Tip */}
            {showObsidianTip && settings.obsidianVaultPath && (
              <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-sm text-primary">
                  {t('obsidianTip')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('noBriefing')}</h3>
            <p className="text-muted-foreground mb-4">{t('noBriefingDesc')}</p>
            <Button onClick={generateBriefing} disabled={generating}>
              <Play className="h-4 w-4 mr-2" />
              {t('generateNow')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold">{t('settings')}</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">{t('autoGenerate')}</label>
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                  className="w-5 h-5"
                />
              </div>

              {/* Briefing Time */}
              <div>
                <label className="text-sm font-medium block mb-2">{t('briefingTime')}</label>
                <Input
                  type="time"
                  value={settings.briefingTime}
                  onChange={(e) => setSettings({ ...settings, briefingTime: e.target.value })}
                  disabled={!settings.enabled}
                />
              </div>

              {/* Search Mode */}
              <div>
                <label className="text-sm font-medium block mb-2">{t('searchMode')}</label>
                <select
                  value={settings.searchMode}
                  onChange={(e) => setSettings({ ...settings, searchMode: e.target.value as 'knowledge' | 'web' })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm"
                >
                  <option value="knowledge">{t('searchModeKnowledge')}</option>
                  <option value="web">{t('searchModeWeb')}</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  {settings.searchMode === 'knowledge' ? t('searchModeKnowledgeDesc') : t('searchModeWebDesc')}
                </p>
              </div>

              {/* Focus Topics */}
              <div>
                <label className="text-sm font-medium block mb-2">{t('focusTopics')}</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {settings.focusTopics.map((topic) => (
                    <Badge key={topic} variant="secondary" className="flex items-center gap-1">
                      {topic}
                      <button onClick={() => removeTopic(topic)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder={t('addTopic')}
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTopic()}
                  />
                  <Button variant="outline" onClick={addTopic}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Save Path */}
              <div>
                <label className="text-sm font-medium block mb-2">{t('savePath')}</label>
                <div className="flex gap-2">
                  <Input
                    placeholder={t('savePathPlaceholder')}
                    value={settings.obsidianVaultPath}
                    readOnly
                    onClick={selectDirectory}
                    className="cursor-pointer flex-1"
                  />
                  <Button variant="outline" onClick={selectDirectory}>
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Save Button */}
              <Button className="w-full" onClick={saveSettings}>
                <FloppyDisk className="h-4 w-4 mr-2" />
                {t('save')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Briefing;
