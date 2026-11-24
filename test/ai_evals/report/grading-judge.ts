// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Asks the LLM judge for a verdict on each Grading V1 expectation of a task.
 *
 * The judge gets the instructions from `<evalsDir>/grading/judge_prompt.md`,
 * the trajectory (user messages, agent answers, tool calls with arguments and
 * tool results, but no agent thoughts) and the expectation statements. It never
 * sees the weights.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import {generateGeminiContent} from './gemini.js';
import {type Expectation, GRADING_DIR} from './grading-loader.js';
import type {ToolCallResult, Trajectory} from './trajectory-builder.js';

export const JUDGE_PROMPT_FILE = 'judge_prompt.md';

// The judge is called once more if the first call fails or returns invalid verdicts.
const MAX_JUDGE_ATTEMPTS = 2;

export interface JudgeExpectation {
  id: string;
  expectation: Expectation;
}

export interface JudgeVerdict {
  id: string;
  reason: string;
  verdict: boolean;
}

/**
 * Either one verdict per expectation (in the order of the expectations), or a
 * grading error if the judge could not produce valid verdicts.
 */
export type JudgeResult = {
  verdicts: JudgeVerdict[],
}|{
  gradingError: string,
};

export interface JudgeExpectationsOptions {
  evalsDir: string;
  trajectory: Trajectory;
  expectations: JudgeExpectation[];
  /** Gemini model name. Defaults to `generateGeminiContent`'s default model. */
  model?: string;
}

function formatToolResult(result: ToolCallResult|undefined): string {
  if (!result) {
    return '(no result)';
  }
  if (result.error !== undefined) {
    return `Error: ${result.error}`;
  }
  const keys = Object.keys(result);
  const value = (keys.length === 1 && keys[0] === 'result') ? result.result : result;
  return typeof value === 'string' ? value : JSON.stringify(value);
}

/**
 * Serializes a trajectory for the judge: user messages, the text the agent showed
 * to the user, and every tool call with its JSON arguments and result. Agent
 * thoughts are left out on purpose, since the judge must only use what the
 * agent said and did. XML-like tags are used as delimiters, because answers and
 * tool results often contain Markdown headings.
 */
export function formatTrajectoryForJudge(trajectory: Trajectory): string {
  const messages: string[] = [];
  for (const turn of trajectory.data) {
    const role = turn.role === 'user' ? 'user' : 'agent';
    const lines = [`<message id="${turn.turn_id}" role="${role}">`];
    if (turn.role === 'user') {
      lines.push(...turn.content);
    } else {
      if (turn.content.length) {
        lines.push('<agent_text>', ...turn.content, '</agent_text>');
      }
      for (const call of turn.tool_calls) {
        lines.push(
            `<tool_call name="${call.name}">`,
            `<arguments>${JSON.stringify(call.args ?? {})}</arguments>`,
            `<result>\n${formatToolResult(call.result)}\n</result>`,
            '</tool_call>',
        );
      }
    }
    lines.push('</message>');
    messages.push(lines.join('\n'));
  }
  return messages.join('\n\n');
}

function buildJudgePrompt(instructions: string, trajectory: Trajectory, expectations: JudgeExpectation[]): string {
  // Only ids and statements are sent. Weights stay with the scorer.
  const statements = Object.fromEntries(expectations.map(({id, expectation}) => [id, expectation]));
  return [
    instructions.trim(),
    `# Trajectory\n\n<trajectory>\n${formatTrajectoryForJudge(trajectory)}\n</trajectory>`,
    `# Expectations\n\n<expectations>\n${JSON.stringify(statements, null, 2)}\n</expectations>`,
  ].join('\n\n');
}

function buildVerdictSchema(ids: string[]): object {
  return {
    type: 'object',
    properties: {
      verdicts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: {type: 'string', enum: ids},
            reason: {type: 'string', description: 'One short sentence that refers to the evidence.'},
            verdict: {type: 'boolean'},
          },
          required: ['id', 'reason', 'verdict'],
          // The reason comes before the verdict, so the judge explains first and decides after.
          propertyOrdering: ['id', 'reason', 'verdict'],
        },
      },
    },
    required: ['verdicts'],
  };
}

/**
 * Parses the judge response and checks that it has exactly one valid verdict
 * per expected id. Throws if it does not.
 *
 * Expected JSON format:
 * ```json
 * {
 *   "verdicts": [
 *     {"id": "cls_root_cause", "reason": "Names hero.jpg.", "verdict": true}
 *   ]
 * }
 * ```
 */
function parseVerdicts(responseText: string, ids: string[]): JudgeVerdict[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    throw new Error(`Judge response is not valid JSON: ${responseText.slice(0, 200)}`);
  }
  const entries = (parsed as {verdicts?: unknown} | null)?.verdicts;
  if (!Array.isArray(entries)) {
    throw new Error('Judge response has no "verdicts" array.');
  }
  const expectedIds = new Set(ids);
  const verdictsById = new Map<string, JudgeVerdict>();
  for (const entry of entries as Array<Partial<JudgeVerdict>|null>) {
    const {id, reason, verdict} = entry ?? {};
    if (typeof id !== 'string' || !expectedIds.has(id)) {
      throw new Error(`Judge returned an unknown id: ${JSON.stringify(id)}.`);
    }
    if (verdictsById.has(id)) {
      throw new Error(`Judge returned more than one verdict for "${id}".`);
    }
    if (typeof verdict !== 'boolean' || typeof reason !== 'string' || !reason.trim()) {
      throw new Error(`Judge returned an invalid verdict for "${id}": ${JSON.stringify(entry)}.`);
    }
    verdictsById.set(id, {id, reason: reason.trim(), verdict});
  }
  const missingIds = ids.filter(id => !verdictsById.has(id));
  if (missingIds.length) {
    throw new Error(`Judge returned no verdict for: ${missingIds.join(', ')}.`);
  }
  return ids.map(id => verdictsById.get(id) as JudgeVerdict);
}

/**
 * Calls the LLM judge for all expectations of a task. Retries once if the call
 * fails or the response is invalid. Never throws: a failure is returned as a
 * `gradingError`, so that the caller reports a null score instead of 0.
 */
export async function judgeExpectations(options: JudgeExpectationsOptions): Promise<JudgeResult> {
  const {evalsDir, trajectory, expectations, model} = options;
  if (expectations.length === 0) {
    return {verdicts: []};
  }
  if (!process.env.GEMINI_API_KEY) {
    return {gradingError: 'GEMINI_API_KEY is not set, so the LLM judge cannot run.'};
  }
  const promptPath = path.join(evalsDir, GRADING_DIR, JUDGE_PROMPT_FILE);
  if (!fs.existsSync(promptPath)) {
    return {gradingError: `Judge prompt not found at ${promptPath}.`};
  }
  const ids = expectations.map(({id}) => id);
  const prompt = buildJudgePrompt(fs.readFileSync(promptPath, 'utf-8'), trajectory, expectations);
  const schema = buildVerdictSchema(ids);
  const errors: string[] = [];
  for (let attempt = 1; attempt <= MAX_JUDGE_ATTEMPTS; attempt++) {
    try {
      const responseText = await generateGeminiContent(prompt, model, schema);
      return {verdicts: parseVerdicts(responseText, ids)};
    } catch (error) {
      errors.push(`Attempt ${attempt}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return {gradingError: `LLM judge failed after ${MAX_JUDGE_ATTEMPTS} attempts.\n${errors.join('\n')}`};
}
