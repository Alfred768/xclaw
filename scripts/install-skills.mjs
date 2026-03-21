#!/usr/bin/env zx

/**
 * install-skills.mjs
 *
 * Reads resources/skills/bundles.json and installs all recommended skills
 * to ~/.openclaw/skills/ using clawhub.
 */

import 'zx/globals';

const ROOT = path.resolve(__dirname, '..');
const BUNDLES_PATH = path.join(ROOT, 'resources', 'skills', 'bundles.json');

echo`📦 Installing recommended skills from bundles.json...`;

// 1. Read bundles.json
if (!fs.existsSync(BUNDLES_PATH)) {
  echo`❌ bundles.json not found at ${BUNDLES_PATH}`;
  process.exit(1);
}

const bundles = JSON.parse(fs.readFileSync(BUNDLES_PATH, 'utf8'));

// 2. Collect all unique skills from all bundles
const allSkills = new Set();
for (const bundle of bundles.bundles) {
  for (const skill of bundle.skills) {
    allSkills.add(skill);
  }
}

echo`   Found ${allSkills.size} unique skills to install`;

// 3. Install each skill using clawhub
let installed = 0;
let failed = 0;

for (const slug of allSkills) {
  process.stdout.write(`   Installing ${slug}... `);
  try {
    await $`npx clawhub install ${slug}`.quiet();
    echo`✓`;
    installed++;
  } catch (err) {
    echo`✗ (may not exist in registry)`;
    failed++;
  }
}

echo``;
echo`✅ Skills installation complete`;
echo`   Installed: ${installed}`;
echo`   Failed: ${failed}`;
