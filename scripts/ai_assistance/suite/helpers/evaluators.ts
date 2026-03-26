// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as jsRouge from 'js-rouge';
import assert from 'node:assert';
import {AsyncLocalStorage} from 'node:async_hooks';
import {hideBin} from 'yargs/helpers';
import yargs from 'yargs/yargs';

import {loadInstructions} from '../instructions/load.ts';
import type {Conversation} from '../types.js';

import {generateGeminiContent} from './gemini.ts';
import {getGolden, getMarkdownConversation, getOutputs, type Output} from './outputs.ts';
import {generateReport} from './report_generator.ts';

const argv = yargs(hideBin(process.argv)).option('repeat', {type: 'number', default: 1}).parseSync();

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

const allStores: ResultStore[] = [];

process.on('exit', () => {
  if (allStores.length > 0) {
    generateReport(allStores);
  }
});

abstract class Evaluator {}

const NUM_CONVERSATIONS = '# of conversations';
const NUM_EVALS_PER_CONVERSATION = '# of evals';
const OVERALL_STATS = 'Weighted Overall';
const PASS_RATE = 'Pass Rate';
const ROUGE_L_SUM = 'ROUGE-Lsum';

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

export class FunctionCalled extends Evaluator {
  static nameOnly(example: Conversation, funcName: string): boolean {
    return example.queries.some(q => {
      return q.response.functionCallRequests?.some(call => call.name === funcName);
    });
  }

  static nameAndArguments(example: Conversation, funcName: string, argCheck: Record<string, unknown>): boolean {
    return example.queries.some(q => {
      return q.response.functionCallRequests?.some(call => {
        if (call.name !== funcName) {
          return false;
        }
        return Object.entries(argCheck).every(([key, value]) => call.args[key] === value);
      });
    });
  }
}

export class LLMComparison extends Evaluator {
  static #cachedScoring: {scoringPrompt: string, rubricWeights: RubricWeights}|null = null;

  static async judge(example: Conversation, prompt: string):
      Promise<{rubricScores: RubricScore[], rubricWeights: RubricWeights}> {
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
        'gemini-2.5-flash', {
          type: 'object',
          properties: {
            rubricScores: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  rubric: {type: 'string', description: 'The name of the rubric.'},
                  score: {type: 'number', description: 'A numerical score assigned by the AI.'},
                  reason: {type: 'string', description: 'A string containing the reasons for the assigned score.'}
                },
                required: ['rubric', 'score', 'reason']
              }
            }
          },
          required: ['rubricScores']
        });
    const r = JSON.parse(response) as {rubricScores: RubricScore[]};
    return {rubricScores: r.rubricScores, rubricWeights};
  }
}

export class ROUGE extends Evaluator {
  private static tokenize(text: string): string[] {
    // Normalizing newlines to spaces before tokenizing ensures that tokens
    // separated by newlines are correctly split and recognized identically
    // by both the full-text tokenizer and the sentence-level tokenizer.
    // Without this, words joined by a newline (like "word\nnext") might be
    // treated as a single token by some tokenizers but split by the segmenter.
    const normalizedText = text.replace(/\n/g, ' ');
    return jsRouge.treeBankTokenize(normalizedText.toLowerCase());
  }

  /**
   * Returns the indices of tokens in 'a' that are part of the Longest Common Subsequence with 'b'.
   *
   * This is used to identify which parts of a candidate sentence are covered by a reference sentence.
   */
  private static lcsIndices(a: string[], b: string[]): number[] {
    // First, create a matrix to find the longest matching subsequence up
    // to a point.
    const n = a.length;
    const m = b.length;
    const matrix = Array(n + 1).fill(0).map(() => Array(m + 1).fill(0));
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        if (a[i - 1] === b[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1] + 1;
        } else {
          matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
        }
      }
    }

    // Now backtrack and collect all indices of tokens in a, that match tokens in b.
    const indices: number[] = [];
    let i = n, j = m;
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) {
        indices.push(i - 1);
        i--;
        j--;
      } else if (matrix[i - 1][j] >= matrix[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }
    return indices;
  }

  private static segment(text: string): string[] {
    // Segments sentences.
    // 1. Split by newlines (common in walkthroughs/bullet points)
    // 2. Further split by sentence-ending punctuation followed by a space and a capital letter.
    // (This avoids splitting on abbreviations like v146.0 or i.e.)
    return text.split(/\n+/)
        .flatMap(line => line.split(/(?<=[.!?])\s+(?=[A-Z])/g))
        .map(s => s.trim())
        .filter(s => s.length > 0);
  }

  /**
   * Calculates the ROUGE-Lsum score (Summary-level LCS union).
   *
   * It calculates the union of LCS matches between each sentence in the candidate
   * and each sentence in the golden reference. This ensures that the structural
   * flow of information is captured while allowing for sentence reordering.
   */
  static score(candidate: string, golden: string): number {
    if (!candidate.trim() || !golden.trim()) {
      return 0;
    }

    const candSentences = this.segment(candidate);
    const goldenSentences = this.segment(golden);

    const candTokenizedSentences = candSentences.map(s => this.tokenize(s));
    const goldenTokenizedSentences = goldenSentences.map(s => this.tokenize(s));

    let totalCandTokensCount = 0;
    for (const tokens of candTokenizedSentences) {
      totalCandTokensCount += tokens.length;
    }
    let totalGoldenTokensCount = 0;
    for (const tokens of goldenTokenizedSentences) {
      totalGoldenTokensCount += tokens.length;
    }

    if (totalGoldenTokensCount === 0 || totalCandTokensCount === 0) {
      return 0;
    }

    // union_lcs_C: Precision perspective (unique matched tokens in candidate)
    let totalCandUnionLcsCount = 0;
    for (const candTokens of candTokenizedSentences) {
      const matchedIndices = new Set<number>();
      for (const goldenTokens of goldenTokenizedSentences) {
        const indices = this.lcsIndices(candTokens, goldenTokens);
        for (const idx of indices) {
          // We mark the token index in the candidate sentence as matched.
          // This implements the "union" part of ROUGE-Lsum: a candidate token
          // is counted only once per candidate sentence.
          matchedIndices.add(idx);
        }
      }
      totalCandUnionLcsCount += matchedIndices.size;
    }

    // union_lcs_G: Recall perspective (unique matched tokens in golden)
    let totalGoldenUnionLcsCount = 0;
    for (const goldenTokens of goldenTokenizedSentences) {
      const matchedIndices = new Set<number>();
      for (const candTokens of candTokenizedSentences) {
        const indices = this.lcsIndices(goldenTokens, candTokens);
        for (const idx of indices) {
          // We mark the token index in the golden sentence as matched.
          matchedIndices.add(idx);
        }
      }
      totalGoldenUnionLcsCount += matchedIndices.size;
    }

    const recall = totalGoldenUnionLcsCount / totalGoldenTokensCount;
    const precision = totalCandUnionLcsCount / totalCandTokensCount;
    const f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    return f1;
  }
}

interface GroupTestState {
  store: ResultStore;
  outputsByDate: Partial<Record<string, Output[]>>;
  logs: string[];
}

const stateStorage = new AsyncLocalStorage<GroupTestState>();

export type ItEval = {
  test: string,
}&({
  succeed: (example: Conversation) => boolean,
}|{
  judge: (example: Conversation) => Promise<{rubricScores: RubricScore[], rubricWeights: RubricWeights}>,
}|{
  rouge: true,
});

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

export async function itEval(config: ItEval): Promise<void> {
  const state = stateStorage.getStore();
  assert.ok(state);

  let goldenText = '';
  if ('rouge' in config) {
    const golden = await getGolden(state.store.type, state.store.label);
    goldenText = golden?.queries.at(-1)?.response.text ?? '';
  }

  for (const [date, outputs] of Object.entries(state.outputsByDate)) {
    if (!outputs) {
      continue;
    }
    const conversations = outputs.flatMap(o => o.contents.conversations);

    if ('succeed' in config) {
      const details = conversations.map(conversation => ({
                                          success: config.succeed(conversation),
                                          conversation,
                                        }));
      state.store.saveResult(config.test, date, {type: 'BINARY', details});
    } else if ('judge' in config) {
      const repeatCount = argv.repeat;
      const scoredEvals =
          conversations.flatMap(conversation => Array.from({length: repeatCount}, () => geminiLimiter.run(async () => {
            const res = await config.judge(conversation);
            return {
              conversation,
              rubricScores: res.rubricScores,
              rubricWeights: res.rubricWeights,
            };
          })));
      const results = await Promise.all(scoredEvals);
      const rubricWeights = results.length > 0 ? results[0].rubricWeights : {};

      state.store.saveResult(config.test, date, {
        type: 'JUDGE',
        repetitionCount: repeatCount,
        rubricWeights,
        details: results.map(r => ({
                               conversation: r.conversation,
                               rubricScores: r.rubricScores,
                             })),
      });
    } else if ('rouge' in config) {
      const details = conversations.map(conversation => {
        const candidateText = conversation.queries.at(-1)?.response.text ?? '';
        return {
          conversation,
          score: ROUGE.score(candidateText, goldenText),
          goldenResponse: goldenText,
        };
      });

      state.store.saveResult(config.test, date, {
        type: 'ROUGE',
        details,
      });
    }
  }
}

export interface GroupConfig {
  type: string;
  label: string;
}

export async function evalGroup(config: GroupConfig, cb: (() => Promise<void>)): Promise<void> {
  const store = new ResultStore(config.type, config.label);
  allStores.push(store);
  const outputs = await getOutputs(config.type, config.label);
  const outputsByDate = Object.groupBy(outputs, o => o.dateFolder);

  const state: GroupTestState = {
    store,
    outputsByDate,
    logs: [],
  };

  log(0, `Evaluating ${config.type} / ${config.label}...`);
  await stateStorage.run(state, async () => {
    await cb();
  });
  log(0, state.logs.join('\n'));
  printResults(state.store);
}

function log(indentation: number, message: string): void {
  const state = stateStorage.getStore();
  const formatted = `${' '.repeat(indentation)}${message}`;
  if (state) {
    state.logs.push(formatted);
  } else {
    console.log(formatted);
  }
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
  const stats = calculateStats(result);
  if (!stats) {
    return;
  }

  switch (result.type) {
    case 'BINARY': {
      if (!tableData[PASS_RATE]) {
        tableData[PASS_RATE] = {};
      }
      const binary = stats as BinaryStats;
      tableData[PASS_RATE][date] = `${binary.success} / ${binary.total} passed`;
      break;
    }
    case 'JUDGE': {
      const judge = stats as JudgeStats;
      const rubrics = Object.keys(judge.statsByRubric).sort();
      for (const row of [OVERALL_STATS, ...rubrics, NUM_CONVERSATIONS, NUM_EVALS_PER_CONVERSATION]) {
        if (!tableData[row]) {
          tableData[row] = {};
        }
        tableData[row][date] = formatJudgeResult(judge, row, result.repetitionCount);
      }
      break;
    }
    case 'ROUGE': {
      if (!tableData[ROUGE_L_SUM]) {
        tableData[ROUGE_L_SUM] = {};
      }
      const rouge = stats as RougeStats;
      tableData[ROUGE_L_SUM][date] = formatRubricStats(rouge);
      break;
    }
  }
}

function printResults(store: ResultStore): void {
  log(0, `Results for: ${store.type}/${store.label}`);

  for (const [test, dateToResult] of store.results) {
    if (dateToResult.size === 0) {
      continue;
    }
    log(0, `\nTest: ${test}`);

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

export interface RubricStats {
  average: number;
  standardDeviation: number;
  allScores: number[];
}

export interface BinaryStats {
  success: number;
  total: number;
}
export type RougeStats = RubricStats;
export interface JudgeStats {
  statsByRubric: Record<string, RubricStats>;
  overallStats: RubricStats;
  inputCount: number;
}

export type Result = {
  type: 'BINARY',
  details: Array<{success: boolean, conversation: Conversation}>,
}|{
  type: 'JUDGE',
  repetitionCount: number,
  rubricWeights: RubricWeights,
  details: Array<{conversation: Conversation, rubricScores: RubricScore[]}>,
}|{
  type: 'ROUGE',
  details: Array<{conversation: Conversation, score: number, goldenResponse: string}>,
};

function calculateBinaryStats(result: Extract<Result, {type: 'BINARY'}>): BinaryStats {
  const success = result.details.filter(d => d.success).length;
  return {success, total: result.details.length};
}

function calculateRougeStats(result: Extract<Result, {type: 'ROUGE'}>): RougeStats {
  const scores = result.details.map(d => d.score);
  const average = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  return {average, standardDeviation: calculateStandardDeviation(scores), allScores: scores};
}

function calculateJudgeStats(result: Extract<Result, {type: 'JUDGE'}>): JudgeStats {
  const statsByRubric: Record<string, RubricStats> = {};
  assert.ok(result.details.length > 0, 'A judge result must have at least one conversation');

  const allRubrics = result.details[0].rubricScores.map(s => s.rubric).sort();
  for (const detail of result.details) {
    const currentRubrics = detail.rubricScores.map(s => s.rubric).sort();
    assert.deepStrictEqual(
        currentRubrics, allRubrics, 'All conversations in a judge result must have the same rubrics');
  }

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

export function calculateStats(result: Result): BinaryStats|RougeStats|JudgeStats|null {
  switch (result.type) {
    case 'BINARY':
      return calculateBinaryStats(result);
    case 'ROUGE':
      return calculateRougeStats(result);
    case 'JUDGE':
      return calculateJudgeStats(result);
    default:
      return null;
  }
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
