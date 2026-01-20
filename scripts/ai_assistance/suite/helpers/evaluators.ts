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
const OVERALL_STATS = 'Overall';
const PASS_RATE = 'Pass Rate';

export class FunctionCalled extends Evaluator {
  static nameOnly(example: Conversation, funcName: string): boolean {
    return example.queries.some(q => {
      return q.response.functionCallRequests?.some(call => call.name === funcName);
    });
  }
}

export class LLMComparison extends Evaluator {
  static async judge(example: Conversation, prompt: string):
      Promise<{rubricScores: Array<{rubric: string, score: number, reason: string}>}> {
    const scoringInstructions = loadInstructions('scoring');
    const exampleAsMarkdown = getMarkdownConversation(example);
    const response = await generateGeminiContent(
        `${scoringInstructions}
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
    const r = JSON.parse(response) as {rubricScores: Array<{rubric: string, score: number, reason: string}>};
    return {rubricScores: r.rubricScores};
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
  judge: (example: Conversation) => Promise<{rubricScores: Array<{rubric: string, score: number, reason: string}>}>,
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
      const results: Array<Array<{rubric: string, score: number, reason: string}>> = [];

      // Collect scores from all examples.
      await Promise.all(allDevToolsConversations.map(async example => {
        for (let i = 0; i < repeatCount; i++) {
          const result = await config.judge(example);
          results.push(result.rubricScores);
        }
      }));

      // Calculate stats for each rubric.
      const inputCount = allDevToolsConversations.length;
      const statsByRubric: Record<string, RubricStats> = {};
      const allRubrics = new Set(results.flatMap(r => r.map(i => i.rubric)));
      for (const rubric of allRubrics) {
        const scores = results.flatMap(r => r.filter(i => i.rubric === rubric).map(i => i.score));
        const total = scores.reduce((acc, score) => acc + score, 0);

        const average = scores.length ? total / scores.length : 0;
        const standardDeviation = calculateStandardDeviation(scores);
        statsByRubric[rubric] = {average, standardDeviation, allScores: scores};
      }

      // Calculate overall stats.
      const allScoresFlattened = results.flatMap(r => r.map(i => i.score));
      const overallTotal = allScoresFlattened.reduce((acc, score) => acc + score, 0);

      const overallAverage = allScoresFlattened.length ? overallTotal / allScoresFlattened.length : 0;
      const overallStandardDeviation = calculateStandardDeviation(allScoresFlattened);
      const overallStats: RubricStats = {
        average: overallAverage,
        standardDeviation: overallStandardDeviation,
        allScores: allScoresFlattened,
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

  statsByRubric: Record<string, RubricStats>,
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
