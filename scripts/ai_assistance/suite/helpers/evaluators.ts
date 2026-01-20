// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import assert from 'node:assert';
import {hideBin} from 'yargs/helpers';
import yargs from 'yargs/yargs';

import {loadInstructions} from '../instructions/load.ts';
import type {Conversation} from '../types.js';

import {generateGeminiContent} from './gemini.ts';
import {getMarkdownConversation, getOutputs, type Output} from './outputs.ts';

const argv = yargs(hideBin(process.argv)).option('repeat', {type: 'number', default: 1}).parseSync();

abstract class Evaluator {}

const NUM_CONVERSATIONS = '# of conversations';
const NUM_EVALS_PER_CONVERSATION = '# of evals';
const OVERALL_STATS = 'Weighted Overall';
const PASS_RATE = 'Pass Rate';

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
