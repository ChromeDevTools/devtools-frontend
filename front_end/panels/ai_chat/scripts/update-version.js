#!/usr/bin/env node

// Script to update version during build/release process
// Usage: node update-version.js <new-version>
// Example: node update-version.js 0.3.0

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node update-version.js <new-version>');
  console.error('Example: node update-version.js 0.3.0');
  process.exit(1);
}

const newVersion = args[0];
const today = new Date().toISOString().split('T')[0];

// Update Version.ts
const versionTsPath = path.join(__dirname, '..', 'core', 'Version.ts');
const versionTsContent = `// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export const VERSION_INFO = {
  version: '${newVersion}',
  buildDate: '${today}',
  channel: 'stable'
} as const;

export const CURRENT_VERSION = VERSION_INFO.version;
`;

fs.writeFileSync(versionTsPath, versionTsContent);
console.log(`Updated Version.ts to version ${newVersion}`);

console.log('Version update complete!');