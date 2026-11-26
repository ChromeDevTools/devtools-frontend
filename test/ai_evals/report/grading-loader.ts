// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Loads the Grading V1 files (`grading/expectations.json` and
 * `grading/weights.json`) of an eval task from the eval data directory and
 * validates them.
 *
 * Levels that are loaded:
 * - general: `<evalsDir>/grading/` (applies to every test, optional)
 * - domain: `<evalsDir>/grading/<domain>/` (applies to every test in `<domain>`, optional)
 * - test: `<evalsDir>/<taskId>/grading/` (or `<evalsDir>/<evalFolder>/<taskId>/grading/`)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export const GRADING_DIR = 'grading';
export const EXPECTATIONS_FILE = 'expectations.json';
export const WEIGHTS_FILE = 'weights.json';

const MAX_WEIGHT = 5;
const ALLOWED_WEIGHTS_KEYS = new Set(['expectations', 'penalties', 'critical']);

/**
 * An expectation that applies to a single turn of a multi-turn conversation.
 * A turn is the N-th user request (counted from 1) and everything the agent did in response to it.
 */
export interface TurnExpectation {
  turn: number;
  text: string;
}

/**
 * A statement given to the LLM judge as is: either a plain string that applies to
 * the whole conversation, or a statement bound to a turn.
 */
export type Expectation = string|TurnExpectation;

export type GradingLevel = 'general'|'domain'|'test';

export interface GradingItem {
  id: string;
  level: GradingLevel;
  /** The statement for the judge. */
  expectation: Expectation;
  /** Integer weight: 1..5 for expectations, -5..-1 for penalties. Never sent to the judge. */
  weight: number;
  /** True if the item is listed in `weights.critical` (only allowed for penalties). */
  critical: boolean;
}

export interface TaskGrading {
  taskId: string;
  /** Grading directories that were loaded, from the general to the test level. */
  gradingDirs: string[];
  items: GradingItem[];
}

export class GradingConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GradingConfigError';
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readJsonObject(filePath: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    throw new GradingConfigError(`Cannot parse ${filePath}: ${error instanceof Error ? error.message : error}`);
  }
  if (!isPlainObject(parsed)) {
    throw new GradingConfigError(`${filePath} must contain a JSON object.`);
  }
  return parsed;
}

function parseExpectation(value: unknown, id: string, filePath: string): Expectation {
  if (typeof value === 'string') {
    if (!value.trim()) {
      throw new GradingConfigError(`${filePath}: expectation "${id}" is empty.`);
    }
    return value;
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    const {turn, text} = value;
    if (keys.length === 2 && Number.isInteger(turn) && (turn as number) >= 1 && typeof text === 'string' &&
        text.trim()) {
      return {turn: turn as number, text};
    }
  }
  throw new GradingConfigError(
      `${filePath}: expectation "${id}" must be a non-empty string or {"turn": <integer >= 1>, "text": <string>}.`);
}

function parseWeightSection(weights: Record<string, unknown>, section: 'expectations'|'penalties',
                            filePath: string): Map<string, number> {
  const value = weights[section] ?? {};
  if (!isPlainObject(value)) {
    throw new GradingConfigError(`${filePath}: "${section}" must be an object that maps ids to weights.`);
  }
  const sign = section === 'expectations' ? 1 : -1;
  const result = new Map<string, number>();
  for (const [id, weight] of Object.entries(value)) {
    const valid =
        typeof weight === 'number' && Number.isInteger(weight) && weight * sign >= 1 && weight * sign <= MAX_WEIGHT;
    if (!valid) {
      const range = section === 'expectations' ? `1..${MAX_WEIGHT}` : `-${MAX_WEIGHT}..-1`;
      throw new GradingConfigError(`${filePath}: weight of "${id}" under "${section}" must be an integer in ${
          range}, got ${JSON.stringify(weight)}.`);
    }
    result.set(id, weight);
  }
  return result;
}

function parseCritical(weights: Record<string, unknown>, penalties: Map<string, number>,
                       filePath: string): Set<string> {
  const value = weights.critical ?? [];
  if (!Array.isArray(value) || value.some(id => typeof id !== 'string')) {
    throw new GradingConfigError(`${filePath}: "critical" must be an array of penalty ids.`);
  }
  const critical = new Set<string>();
  for (const id of value as string[]) {
    if (critical.has(id)) {
      throw new GradingConfigError(`${filePath}: "${id}" is listed more than once in "critical".`);
    }
    if (!penalties.has(id)) {
      throw new GradingConfigError(`${filePath}: critical id "${id}" must be listed under "penalties".`);
    }
    critical.add(id);
  }
  return critical;
}

/**
 * Reads and validates one grading directory. Returns null if it contains neither
 * `expectations.json` nor `weights.json`.
 */
function loadGradingLevel(gradingDir: string, level: GradingLevel): GradingItem[]|null {
  const expectationsPath = path.join(gradingDir, EXPECTATIONS_FILE);
  const weightsPath = path.join(gradingDir, WEIGHTS_FILE);
  const hasExpectations = fs.existsSync(expectationsPath);
  const hasWeights = fs.existsSync(weightsPath);
  if (!hasExpectations && !hasWeights) {
    return null;
  }
  if (!hasExpectations || !hasWeights) {
    const [found, missing] = hasExpectations ? [EXPECTATIONS_FILE, WEIGHTS_FILE] : [WEIGHTS_FILE, EXPECTATIONS_FILE];
    throw new GradingConfigError(`${gradingDir} has ${found} but no ${missing}. Both files are required.`);
  }

  const expectations = readJsonObject(expectationsPath);
  const weights = readJsonObject(weightsPath);
  const unknownKeys = Object.keys(weights).filter(key => !ALLOWED_WEIGHTS_KEYS.has(key));
  if (unknownKeys.length) {
    throw new GradingConfigError(`${weightsPath}: unknown top-level keys: ${
        unknownKeys.join(', ')}. Allowed keys are "expectations", "penalties" and "critical".`);
  }
  const positive = parseWeightSection(weights, 'expectations', weightsPath);
  const penalties = parseWeightSection(weights, 'penalties', weightsPath);
  const critical = parseCritical(weights, penalties, weightsPath);

  const errors: string[] = [];
  for (const id of positive.keys()) {
    if (penalties.has(id)) {
      errors.push(`"${id}" is listed under both "expectations" and "penalties" in ${weightsPath}`);
    }
  }
  const allWeights = new Map([...positive, ...penalties]);
  for (const id of Object.keys(expectations)) {
    if (!allWeights.has(id)) {
      errors.push(`"${id}" in ${expectationsPath} has no weight in ${weightsPath}`);
    }
  }
  for (const id of allWeights.keys()) {
    if (!Object.hasOwn(expectations, id)) {
      errors.push(`"${id}" in ${weightsPath} has no statement in ${expectationsPath}`);
    }
  }
  if (errors.length) {
    throw new GradingConfigError(`Invalid grading files in ${gradingDir}:\n- ${errors.join('\n- ')}`);
  }

  const items: GradingItem[] = [];
  for (const [id, value] of Object.entries(expectations)) {
    const expectation = parseExpectation(value, id, expectationsPath);
    items.push({id, level, expectation, weight: allWeights.get(id) as number, critical: critical.has(id)});
  }
  if (!items.length) {
    throw new GradingConfigError(`${expectationsPath} must define at least one expectation or penalty.`);
  }
  return items;
}

/**
 * Returns the test-level grading directory of a task. Like `setupAndRunEvalApp`, a task folder
 * nested under `<evalFolder>/` takes precedence over the flat `<evalsDir>/<taskId>/` folder.
 */
export function getTaskGradingDir(evalsDir: string, taskId: string, evalFolder = ''): string {
  const nestedTaskDir = path.join(evalsDir, evalFolder, taskId);
  const taskDir = (evalFolder && fs.existsSync(nestedTaskDir)) ? nestedTaskDir : path.join(evalsDir, taskId);
  return path.join(taskDir, GRADING_DIR);
}

/**
 * Loads and validates the general, domain, and test-level grading files of a task.
 * Returns null if the task has no test-level grading files (so unmigrated tasks
 * skip grading even when general or domain files exist).
 * Throws a `GradingConfigError` if any loaded grading files are incomplete or invalid.
 */
export function loadTaskGrading(evalsDir: string, taskId: string, evalFolder = ''): TaskGrading|null {
  const testGradingDir = getTaskGradingDir(evalsDir, taskId, evalFolder);
  const testItems = loadGradingLevel(testGradingDir, 'test');
  if (!testItems) {
    return null;
  }

  const generalDir = path.join(evalsDir, GRADING_DIR);
  const levels: Array<[GradingLevel, string, GradingItem[] | null]> = [
    ['general', generalDir, loadGradingLevel(generalDir, 'general')],
  ];
  if (evalFolder) {
    const domainDir = path.join(evalsDir, GRADING_DIR, evalFolder);
    levels.push(['domain', domainDir, loadGradingLevel(domainDir, 'domain')]);
  }
  levels.push(['test', testGradingDir, testItems]);

  const gradingDirs: string[] = [];
  const items: GradingItem[] = [];
  const levelById = new Map<string, GradingLevel>();
  for (const [level, gradingDir, levelItems] of levels) {
    if (!levelItems) {
      continue;
    }
    for (const item of levelItems) {
      const otherLevel = levelById.get(item.id);
      if (otherLevel) {
        throw new GradingConfigError(`Expectation id "${item.id}" is defined at both the ${otherLevel} and the ${
            level} level. Ids must be unique across levels.`);
      }
      levelById.set(item.id, level);
    }
    gradingDirs.push(gradingDir);
    items.push(...levelItems);
  }
  return {taskId, gradingDirs, items};
}
