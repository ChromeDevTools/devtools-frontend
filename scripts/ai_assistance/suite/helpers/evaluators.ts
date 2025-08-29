// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import assert from 'node:assert';

import {loadInstructions} from '../instructions/load.ts';
import type {Conversation} from '../types';

import {generateGeminiContent} from './gemini.ts';
import {getMarkdownConversation, getOutputs, type Output} from './outputs.ts';

abstract class Evaluator {}

export class FunctionCalled extends Evaluator {
  static nameOnly(example: Conversation, funcName: string): boolean {
    return example.queries.some(q => {
      return q.response.functionCallRequests?.some(call => call.name === funcName);
    });
  }
}

export class LLMComparison extends Evaluator {
  static async judge(example: Conversation, prompt: string): Promise<{score: number, reasons: string}> {
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
            score: {type: 'number', description: 'A numerical score assigned by the AI.'},
            reasons: {type: 'string', description: 'A string containing the reasons for the assigned score.'}
          },
          required: ['score', 'reasons']
        });
    const r = JSON.parse(response) as {score: number, reasons: string};
    return {score: r.score, reasons: r.reasons};
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
  judge: (example: Conversation) => Promise<{score: number, reasons: string}>,
});

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
      const scores = await Promise.all(allDevToolsConversations.map(async example => {
        const result = await config.judge(example);
        return result.score;
      }));
      const totalOfAllScores = scores.reduce((acc: number, score: number) => acc + score, 0);
      const average = totalOfAllScores / scores.length;
      state.store.saveResult(config.test, date, {type: 'JUDGE', average, allScores: scores, total: totalOfAllScores});
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

function printResults(store: ResultStore): void {
  log(0, `Results for: ${store.type}/${store.label}`);

  // Structures the results in Date => <Test Name, Test Output>.
  const dataForTable: Record<string, Record<string, string>> = {};

  for (const [test, dateToResult] of store.results) {
    for (const [date, result] of dateToResult) {
      dataForTable[date] ??= {};
      switch (result.type) {
        case 'BINARY':
          dataForTable[date][test] = `${result.success} / ${result.total} passed`;
          break;
        case 'JUDGE':
          dataForTable[date][test] = `${result.average.toFixed(1)} average from ${result.allScores.length} inputs.`;
          break;
        default:
          throw new Error('Unknown result type!');
      }
    }
  }
  console.table(dataForTable);
}

type Result = {
  type: 'BINARY',
  total: number,
  success: number,
}|{
  type: 'JUDGE',
  average: number,
  total: number,
  allScores: number[],
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
