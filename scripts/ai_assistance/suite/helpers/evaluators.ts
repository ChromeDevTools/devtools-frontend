// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as jsRouge from 'js-rouge';
import assert from 'node:assert';
import {hideBin} from 'yargs/helpers';
import yargs from 'yargs/yargs';

import {loadInstructions} from '../instructions/load.ts';
import type {Conversation} from '../types.js';

import {generateGeminiContent} from './gemini.ts';
import {getGolden, getMarkdownConversation, getOutputs, type Output} from './outputs.ts';

const argv = yargs(hideBin(process.argv)).option('repeat', {type: 'number', default: 1}).parseSync();

abstract class Evaluator {}

const NUM_CONVERSATIONS = '# of conversations';
const NUM_EVALS_PER_CONVERSATION = '# of evals';
const OVERALL_STATS = 'Weighted Overall';
const PASS_RATE = 'Pass Rate';
const ROUGE_L_SUM = 'ROUGE-Lsum';

type RubricName = string;
interface RubricScore {
  rubric: RubricName;
  score: number;
  reason: string;
}
type RubricWeights = Record<RubricName, number>;

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
}

let state: GroupTestState|null = null;

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

export async function itEval(config: ItEval): Promise<void> {
  assert.ok(state);
  if ('succeed' in config) {
    for (const [date, outputs] of Object.entries(state.outputsByDate)) {
      if (!outputs) {
        continue;
      }

      const allDevToolsConversations = outputs.flatMap(o => o.contents.conversations);

      let total = 0;
      let succeeded = 0;
      for (const conversation of allDevToolsConversations) {
        total++;
        if (config.succeed(conversation)) {
          succeeded++;
        }
        state.store.saveResult(config.test, date, {type: 'BINARY', success: succeeded, total});
      }
    }
  } else if ('judge' in config) {
    for (const [date, outputs] of Object.entries(state.outputsByDate)) {
      if (!outputs) {
        continue;
      }
      const allDevToolsConversations = outputs.flatMap(o => o.contents.conversations);
      const repeatCount = argv.repeat;
      const results: Array<{rubricScores: RubricScore[], rubricWeights: RubricWeights}> = [];

      // Collect scores from all examples.
      await Promise.all(allDevToolsConversations.map(async example => {
        for (let i = 0; i < repeatCount; i++) {
          const result = await config.judge(example);
          results.push(result);
        }
      }));

      // Calculate stats for each rubric (take the average for each rubric among multiple conversations)
      const inputCount = allDevToolsConversations.length;
      const statsByRubric: Record<RubricName, RubricStats> = {};
      const allRubrics = new Set(results.flatMap(r => r.rubricScores.map(i => i.rubric)));
      for (const rubric of allRubrics) {
        const scores = results.flatMap(r => r.rubricScores.filter(i => i.rubric === rubric).map(i => i.score));
        const total = scores.reduce((acc, score) => acc + score, 0);

        const average = scores.length ? total / scores.length : 0;
        const standardDeviation = calculateStandardDeviation(scores);
        statsByRubric[rubric] = {average, standardDeviation, allScores: scores};
      }

      // Weight all rubrics (take the first result's weights, as they should be the same for all results).
      const weights = results.length > 0 ? results[0].rubricWeights : {};
      const allWeightedScores: number[] = [];
      for (const rubricScores of results) {
        let totalWeightedScore = 0;
        let totalWeight = 0;
        for (const {rubric, score} of rubricScores.rubricScores) {
          const weight = weights[rubric] ?? IMPORTANCE_WEIGHTS.minor;
          totalWeightedScore += score * weight;
          totalWeight += weight;
        }
        if (totalWeight > 0) {
          allWeightedScores.push(totalWeightedScore / totalWeight);
        }
      }

      // Calculate average and standard deviation for the overall score.
      const overallAverage = allWeightedScores.length ?
          allWeightedScores.reduce((acc, score) => acc + score, 0) / allWeightedScores.length :
          0;
      const overallStandardDeviation = calculateStandardDeviation(allWeightedScores);
      const overallStats: RubricStats = {
        average: overallAverage,
        standardDeviation: overallStandardDeviation,
        allScores: allWeightedScores,
      };

      state.store.saveResult(config.test, date, {
        type: 'JUDGE',
        statsByRubric,
        overallStats,
        inputCount,
        repetitionCount: repeatCount,
      });
    }
  } else if ('rouge' in config) {
    const golden = await getGolden(state.store.type, state.store.label);
    const goldenText = golden?.queries.at(-1)?.response.text ?? '';

    for (const [date, outputs] of Object.entries(state.outputsByDate)) {
      if (!outputs) {
        continue;
      }
      const allDevToolsConversations = outputs.flatMap(o => o.contents.conversations);
      const scores: number[] = [];

      for (const conversation of allDevToolsConversations) {
        const candidateText = conversation.queries.at(-1)?.response.text ?? '';
        const score = ROUGE.score(candidateText, goldenText);
        scores.push(score);
      }

      const total = scores.reduce((acc, score) => acc + score, 0);
      const average = scores.length ? total / scores.length : 0;
      const standardDeviation = calculateStandardDeviation(scores);

      state.store.saveResult(config.test, date, {
        type: 'ROUGE',
        stats: {average, standardDeviation, allScores: scores},
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
  const outputs = await getOutputs(config.type, config.label);
  const outputsByDate = Object.groupBy(outputs, o => o.dateFolder);
  state = {
    store,
    outputsByDate,
  };

  await cb();
  printResults(state.store);
}

function log(indentation: number, message: string): void {
  console.log(`${' '.repeat(indentation)}${message}`);
}

function formatRubricStats(stats: RubricStats): string {
  return `${stats.average.toFixed(2)} (mean) ±${stats.standardDeviation.toFixed(2)}`;
}

function formatJudgeResult(result: Extract<Result, {type: 'JUDGE'}>, row: string): string {
  if (row === NUM_CONVERSATIONS) {
    return String(result.inputCount);
  }
  if (row === NUM_EVALS_PER_CONVERSATION) {
    return String(result.repetitionCount);
  }
  if (row === OVERALL_STATS) {
    return formatRubricStats(result.overallStats);
  }
  const stats = result.statsByRubric[row];
  return stats ? formatRubricStats(stats) : '-';
}

function printResults(store: ResultStore): void {
  log(0, `Results for: ${store.type}/${store.label}`);

  for (const [test, dateToResult] of store.results) {
    if (Object.keys(Object.fromEntries(dateToResult)).length === 0) {
      continue;
    }
    log(0, `\nTest: ${test}`);

    const sortedDates = Array.from(dateToResult.keys()).sort();
    // Collect all rubric names, if this is a LLM-as-a-judge rating
    const allRubrics = new Set<string>();
    for (const result of dateToResult.values()) {
      if (result.type === 'JUDGE') {
        Object.keys(result.statsByRubric).forEach(r => allRubrics.add(r));
      }
    }

    const tableData: Record<string, Record<string, string>> = {};
    for (const date of sortedDates) {
      const result = dateToResult.get(date);
      if (!result) {
        continue;
      }

      switch (result.type) {
        case 'BINARY':
          if (!tableData[PASS_RATE]) {
            tableData[PASS_RATE] = {};
          }
          tableData[PASS_RATE][date] = `${result.success} / ${result.total} passed`;
          break;
        case 'JUDGE':
          // Create a row for each rubric, including overall and runs per query/input
          for (const row
                   of [OVERALL_STATS, ...Array.from(allRubrics).sort(), NUM_CONVERSATIONS,
                       NUM_EVALS_PER_CONVERSATION]) {
            if (!tableData[row]) {
              tableData[row] = {};
            }
            tableData[row][date] = formatJudgeResult(result, row);
          }
          break;
        case 'ROUGE':
          if (!tableData[ROUGE_L_SUM]) {
            tableData[ROUGE_L_SUM] = {};
          }
          tableData[ROUGE_L_SUM][date] = formatRubricStats(result.stats);
          break;
      }
    }
    console.table(tableData);
  }
}

interface RubricStats {
  average: number;
  standardDeviation: number;
  allScores: number[];
}

type Result = {
  type: 'BINARY',
  total: number,
  success: number,
}|{
  type: 'JUDGE',

  statsByRubric: Record<RubricName, RubricStats>,
  overallStats: RubricStats,
  inputCount: number,
  repetitionCount: number,
}|{
  type: 'ROUGE',
  stats: RubricStats,
};

class ResultStore {
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
