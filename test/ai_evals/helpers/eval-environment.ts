// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'node:fs';
import * as path from 'node:path';

import {SOURCE_ROOT} from '../../conductor/paths.js';

export const EVAL_DATA_DIR: string = path.join(SOURCE_ROOT, 'test', 'ai_evals', 'eval_data');
export const BASE_APPS_DIR: string = path.join(EVAL_DATA_DIR, 'base-apps');
export const EVALS_DIR: string = path.join(EVAL_DATA_DIR, 'evals');

export class MissingEvalDependenciesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MissingEvalDependenciesError';
  }
}

/**
 * Checks if a given directory exists, is a directory, and contains at least one entry other than .git.
 */
export function isDirectoryPopulated(dirPath: string): boolean {
  if (!fs.existsSync(dirPath)) {
    return false;
  }
  try {
    const stat = fs.statSync(dirPath);
    if (!stat.isDirectory()) {
      return false;
    }
    const entries = fs.readdirSync(dirPath).filter(entry => entry !== '.git');
    return entries.length > 0;
  } catch {
    return false;
  }
}

export function getBaseAppsDir(): string|null {
  return isDirectoryPopulated(BASE_APPS_DIR) ? BASE_APPS_DIR : null;
}

export function getEvalsDir(): string|null {
  return isDirectoryPopulated(EVALS_DIR) ? EVALS_DIR : null;
}

export function formatMissingDependenciesMessage(): string {
  return `[AI Evals] Missing evaluation dependencies in test/ai_evals/eval_data (requires base-apps and evals).
To fix this:
1. Add "checkout_ai_evals": True to "custom_vars" in your .gclient file.
2. Run "gclient sync".`;
}

export interface ValidateEvalEnvironmentOptions {
  exitOnError?: boolean;
}

/**
 * Validates that both base-apps and evals directories exist and are populated.
 */
export function validateEvalEnvironment(options: ValidateEvalEnvironmentOptions = {}): void {
  const hasBaseApps = isDirectoryPopulated(BASE_APPS_DIR);
  const hasEvals = isDirectoryPopulated(EVALS_DIR);

  if (!hasBaseApps || !hasEvals) {
    const message = formatMissingDependenciesMessage();
    if (options.exitOnError) {
      console.error(`\n${message}\n`);
      process.exit(1);
    }
    throw new MissingEvalDependenciesError(message);
  }
}
