// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import nodeAssert from 'node:assert';

import {generateGeminiContent} from './gemini.js';
import {loadInstructions} from './instructions.js';
import {getMarkdownConversation, type Trajectory} from './trajectory-builder.js';

/* eslint-disable no-console */

/**
 * Ensures we don't exceed a certain number of concurrent tasks.
 * Used globally for Gemini API calls to respect rate limits while parallelizing groups.
 */
class ConcurrencyLimiter {
  #activeCount = 0;
  #queue: Array<() => void> = [];
  #limit: number;

  constructor(limit: number) {
    this.#limit = limit;
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.#activeCount >= this.#limit) {
      await new Promise<void>(resolve => {
        this.#queue.push(resolve);
      });
    }
    this.#activeCount++;
    try {
      return await task();
    } finally {
      this.#activeCount--;
      const next = this.#queue.shift();
      if (next) {
        next();
      }
    }
  }
}

const geminiLimiter = new ConcurrencyLimiter(25);

const NUM_CONVERSATIONS = '# of conversations';
const NUM_EVALS_PER_CONVERSATION = '# of evals';
const OVERALL_STATS = 'Weighted Overall';

export type RubricName = string;
export interface RubricScore {
  rubric: RubricName;
  score: number;
  reason: string;
}
export type RubricWeights = Record<RubricName, number>;

const IMPORTANCE_WEIGHTS: Record<string, number> = {
  critical: 5,
  important: 2,
  minor: 1,
};

function getWeightForImportance(importance?: string): number {
  if (!importance) {
    return IMPORTANCE_WEIGHTS.minor;
  }
  return IMPORTANCE_WEIGHTS[importance.toLowerCase()] ?? IMPORTANCE_WEIGHTS.minor;
}

function parseScoringInstructions(instructions: string): {scoringPrompt: string, rubricWeights: RubricWeights} {
  const rubricWeights: RubricWeights = {};
  const lines = instructions.split('\n');
  // The instructions without the importance weights to not bias the LLM judge
  const scoringPrompt: string[] = [];
  let currentRubric: RubricName|null = null;

  for (const line of lines) {
    const rubricMatch = line.match(/^(?:#|##) Rubric: (.*)$/);
    if (rubricMatch) {
      currentRubric = rubricMatch[1].trim();
      scoringPrompt.push(line);
      continue;
    }

    const importanceMatch = line.match(/^Importance: (.*)$/);
    if (importanceMatch && currentRubric) {
      rubricWeights[currentRubric] = getWeightForImportance(importanceMatch[1].trim());
      // Remove the importance line from the scoring prompt
      continue;
    }

    scoringPrompt.push(line);
  }

  return {
    scoringPrompt: scoringPrompt.join('\n'),
    rubricWeights,
  };
}

export class LLMComparison {
  static #cachedScoring: {scoringPrompt: string, rubricWeights: RubricWeights}|null = null;

  static async judge(
      example: Trajectory,
      prompt: string,
      ): Promise<{rubricScores: RubricScore[], rubricWeights: RubricWeights}> {
    if (!this.#cachedScoring) {
      const scoringInstructions = loadInstructions('scoring');
      this.#cachedScoring = parseScoringInstructions(scoringInstructions);
    }
    const {scoringPrompt, rubricWeights} = this.#cachedScoring;
    const exampleAsMarkdown = getMarkdownConversation(example);
    const response = await generateGeminiContent(
        `${scoringPrompt}
        ${prompt}.

## Conversation to score:
${exampleAsMarkdown}`,
        process.env.GEMINI_MODEL || 'gemini-3.6-flash',
        {
          type: 'object',
          properties: {
            rubricScores: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  rubric: {type: 'string', description: 'The name of the rubric.'},
                  score: {type: 'number', description: 'A numerical score assigned by the AI.'},
                  reason: {type: 'string', description: 'A string containing the reasons for the assigned score.'},
                },
                required: ['rubric', 'score', 'reason'],
              },
            },
          },
          required: ['rubricScores'],
        },
    );
    const r = JSON.parse(response) as {rubricScores: RubricScore[]};
    return {rubricScores: r.rubricScores, rubricWeights};
  }
}

export interface ItEval {
  test: string;
  judge: (example: Trajectory) => Promise<{rubricScores: RubricScore[], rubricWeights: RubricWeights}>;
}

function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const mean = values.reduce((acc, val) => acc + val, 0) / values.length;
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Calculate the overall score for a conversation based on rubric importance.
 */
export function calculateWeightedScore(rubricScores: RubricScore[], weights: RubricWeights): number {
  let totalWeightedScore = 0;
  let totalWeight = 0;
  for (const {rubric, score} of rubricScores) {
    const weight = weights[rubric] ?? IMPORTANCE_WEIGHTS.minor;
    totalWeightedScore += score * weight;
    totalWeight += weight;
  }
  return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
}

export interface EvaluateTrajectoryOptions {
  repeat?: number;
}

/**
 * Runs a list of `ItEval` criteria against a trajectory, records results in `store`,
 * and returns the weighted rubric score (`[0.0 - 1.0]`) if a judge evaluation ran, or `null` otherwise.
 */
export async function evaluateTrajectory(
    trajectory: Trajectory,
    evals: ItEval[],
    store: ResultStore,
    dateFolder: string,
    options: EvaluateTrajectoryOptions = {},
    ): Promise<number|null> {
  const repeatCount = options.repeat ?? 1;
  let weightedScore: number|null = null;

  for (const config of evals) {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('[AI Evals]: Skipping LLM judge evaluation because GEMINI_API_KEY is not set.');
      continue;
    }
    const scoredEvals = Array.from({length: repeatCount}, () => geminiLimiter.run(async () => {
      const res = await config.judge(trajectory);
      return {
        conversation: trajectory,
        rubricScores: res.rubricScores,
        rubricWeights: res.rubricWeights,
      };
    }));
    const results = await Promise.all(scoredEvals);
    const rubricWeights = results.length > 0 ? results[0].rubricWeights : {};
    for (const r of results) {
      weightedScore = Number(calculateWeightedScore(r.rubricScores, r.rubricWeights).toFixed(2));
    }

    store.saveResult(config.test, dateFolder, {
      repetitionCount: repeatCount,
      rubricWeights,
      details: results.map(r => ({
                             conversation: r.conversation,
                             rubricScores: r.rubricScores,
                           })),
    });
  }

  return weightedScore;
}

function formatRubricStats(stats: RubricStats): string {
  return `${stats.average.toFixed(2)} (mean) ±${stats.standardDeviation.toFixed(2)}`;
}

function formatJudgeResult(stats: JudgeStats, row: string, repetitionCount: number): string {
  if (row === NUM_CONVERSATIONS) {
    return String(stats.inputCount);
  }
  if (row === NUM_EVALS_PER_CONVERSATION) {
    return String(repetitionCount);
  }
  if (row === OVERALL_STATS) {
    return formatRubricStats(stats.overallStats);
  }
  const rubricStats = stats.statsByRubric[row];
  return rubricStats ? formatRubricStats(rubricStats) : '-';
}

function populateTableData(tableData: Record<string, Record<string, string>>, date: string, result: Result): void {
  const stats = calculateJudgeStats(result);
  const rubrics = Object.keys(stats.statsByRubric).sort();
  for (const row of [OVERALL_STATS, ...rubrics, NUM_CONVERSATIONS, NUM_EVALS_PER_CONVERSATION]) {
    if (!tableData[row]) {
      tableData[row] = {};
    }
    tableData[row][date] = formatJudgeResult(stats, row, result.repetitionCount);
  }
}

export function printResults(store: ResultStore): void {
  console.log(`Results for: ${store.type}/${store.label}`);

  for (const [test, dateToResult] of store.results) {
    if (dateToResult.size === 0) {
      continue;
    }
    console.log(`\nTest: ${test}`);

    const sortedDates = Array.from(dateToResult.keys()).sort();
    const tableData: Record<string, Record<string, string>> = {};
    for (const date of sortedDates) {
      const result = dateToResult.get(date);
      if (result) {
        populateTableData(tableData, date, result);
      }
    }
    console.table(tableData);
  }
}

export function formatStoreResults(store: ResultStore): string {
  const lines: string[] = [`Results for: ${store.type}/${store.label}`];

  for (const [test, dateToResult] of store.results) {
    if (dateToResult.size === 0) {
      continue;
    }
    lines.push(`\nTest: ${test}`);
    const sortedDates = Array.from(dateToResult.keys()).sort();
    const tableData: Record<string, Record<string, string>> = {};
    for (const date of sortedDates) {
      const result = dateToResult.get(date);
      if (result) {
        populateTableData(tableData, date, result);
      }
    }
    lines.push(JSON.stringify(tableData, null, 2));
  }

  return lines.join('\n') + '\n';
}

export interface RubricStats {
  average: number;
  standardDeviation: number;
  allScores: number[];
}

export interface JudgeStats {
  statsByRubric: Record<string, RubricStats>;
  overallStats: RubricStats;
  inputCount: number;
}

export interface Result {
  repetitionCount: number;
  rubricWeights: RubricWeights;
  details: Array<{conversation: Trajectory, rubricScores: RubricScore[]}>;
}

function calculateJudgeStats(result: Result): JudgeStats {
  const statsByRubric: Record<string, RubricStats> = {};
  nodeAssert.ok(result.details.length > 0, 'A judge result must have at least one conversation');

  const rubricsSet = new Set<string>();
  Object.keys(result.rubricWeights).forEach(r => rubricsSet.add(r));
  for (const detail of result.details) {
    detail.rubricScores.forEach(s => rubricsSet.add(s.rubric));
  }
  const allRubrics = Array.from(rubricsSet).sort();

  for (const rubric of allRubrics) {
    const scores = result.details.flatMap(d => d.rubricScores.filter(s => s.rubric === rubric).map(s => s.score));
    const average = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    statsByRubric[rubric] = {average, standardDeviation: calculateStandardDeviation(scores), allScores: scores};
  }

  const overallScores = result.details.map(d => calculateWeightedScore(d.rubricScores, result.rubricWeights));
  const overallAverage = overallScores.length ? overallScores.reduce((a, b) => a + b, 0) / overallScores.length : 0;
  const overallStats = {
    average: overallAverage,
    standardDeviation: calculateStandardDeviation(overallScores),
    allScores: overallScores,
  };

  return {
    statsByRubric,
    overallStats,
    inputCount: result.details.length / result.repetitionCount,
  };
}

export class ResultStore {
  // Map of testName => YYYY-MM-DD => Result
  #results = new Map<string, Map<string, Result>>();
  #type: string;
  #label: string;

  constructor(type: string, label: string) {
    this.#type = type;
    this.#label = label;
  }

  get type(): string {
    return this.#type;
  }
  get label(): string {
    return this.#label;
  }

  get results(): ReadonlyMap<string, ReadonlyMap<string, Result>> {
    return this.#results;
  }

  saveResult(testName: string, dateFolder: string, result: Result): void {
    const forTest = this.#results.get(testName) ?? new Map<string, Result>();
    forTest.set(dateFolder, result);
    this.#results.set(testName, forTest);
  }
}
