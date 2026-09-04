// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as assert from 'node:assert';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {hideBin} from 'yargs/helpers';
import yargs from 'yargs/yargs';

import type {Trajectory, Turn} from './types.js';

/** Note: non-exhaustive. **/
/* eslint-disable @typescript-eslint/naming-convention */
export interface RawMetadata {
  session_id: string;
  explanation: string;
}

export interface RawRequest {
  current_message: {
    parts: Array<{
      text?: string,
      functionResponse?: {
        name: string,
        response: {result: Record<string, string>},
      },
    }>,
  };
  function_declarations: Array<{
    name: string,
    description: string,
    parameters: {
      properties?: Record<string, unknown>,
    },
  }>;
  metadata: {
    client_version: string,
  };
}

export interface RawFunctionCall {
  name: string;
  args: Record<string, unknown>;
}

export interface RawAidaResponse {
  metadata: {
    rcpGlobalId?: string,
    inferenceOptionMetadata?: {
      modelId: string,
      modelVersion: string,
    },
  };
  explanation?: string;
  functionCalls?: RawFunctionCall[];
  completed?: true;
}

export interface RawExample {
  session_id: string;
  request: RawRequest;
  aidaResponse: RawAidaResponse;
}

export interface RawOutput {
  metadata: RawMetadata[];
  examples: RawExample[];
}
/* eslint-enable @typescript-eslint/naming-convention */

interface RawToEvalOptions {
  inputFromAutoRun: RawOutput;
  label: string;
}

/**
 * Converts raw DevTools AIDA interaction logs collected during auto-run
 * into standard evaluation trajectories used by LLM grading suites.
 */
export function convertRawOutputToEval(opts: RawToEvalOptions): Trajectory[] {
  const inputHash = hash(JSON.stringify(opts.inputFromAutoRun));
  const {metadata, examples} = opts.inputFromAutoRun;

  return metadata
      .map((meta, index) => {
        const sessionExamples = examples.filter(e => e.session_id === meta.session_id);
        if (!sessionExamples.length) {
          return null;
        }
        const sessionId = `${inputHash}-${index}`;
        return buildTrajectory(sessionId, meta, sessionExamples);
      })
      .filter((trajectory): trajectory is Trajectory => trajectory !== null);
}

/**
 * Constructs a single Trajectory from session metadata and its corresponding raw turns.
 */
function buildTrajectory(
    sessionId: string,
    meta: RawMetadata,
    examples: RawExample[],
    ): Trajectory {
  const firstExample = examples[0];
  const chromeVersion = firstExample?.request.metadata.client_version;
  assert.ok(chromeVersion, 'No client_version found in example');

  const modelData = firstExample?.aidaResponse.metadata.inferenceOptionMetadata;
  assert.ok(modelData, 'No inferenceOptionMetadata found in example');

  return {
    metadata: {
      session_id: sessionId,
      model: modelData.modelId ?? '',
      chromeVersion,
      autoRunExampleId: meta.session_id,
      explanation: meta.explanation ?? '',
    },
    data: buildTurns(examples),
  };
}

/**
 * Iterates through raw request/response pairs and reconstructs the chronological turn history.
 */
function buildTurns(examples: RawExample[]): Turn[] {
  const turns: Turn[] = [];
  let turnIndex = 1;

  for (const {request, aidaResponse} of examples) {
    if (!aidaResponse.completed) {
      continue;
    }

    const [requestPart] = request.current_message.parts;
    const userText = requestPart?.text;
    const functionResponse = requestPart?.functionResponse;

    if (userText) {
      // User prompt starts a new turn.
      turns.push(createUserTurn(String(turnIndex++), userText));
    } else if (functionResponse) {
      // Tool responses from DevTools are attached back to the preceding Gemini turn that invoked them.
      attachToolResultToLastTurn(turns, functionResponse.name, functionResponse.response);
    }

    // AIDA response turn (text explanation and/or tool call invocations).
    turns.push(createGeminiTurn(String(turnIndex++), aidaResponse));
  }

  return turns;
}

function createUserTurn(turnId: string, userText: string): Turn {
  return {
    turn_id: turnId,
    role: 'user',
    // TODO: Look into capturing the actual execution timestamp instead of current time.
    timestamp: Math.floor(Date.now() * 1000),
    // TODO: Temporarily assigning an empty tokens object to match the KAF eval schema. We need to get the actual token usage.
    tokens: {},
    content: [userText],
    thoughts: [],
    tool_calls: [],
  };
}

function createGeminiTurn(turnId: string, aidaResponse: RawAidaResponse): Turn {
  const responseText = aidaResponse.explanation?.trim();
  // TODO: Look into capturing the actual execution timestamp instead of current time.
  const timestamp = Math.floor(Date.now() * 1000);
  const functionCalls = aidaResponse.functionCalls ?? [];
  const toolCalls = functionCalls.map(call => ({
                                        name: call.name,
                                        args: call.args,
                                        timestamp,
                                      }));

  return {
    turn_id: turnId,
    role: 'gemini',
    timestamp,
    // TODO: Temporarily assigning an empty tokens object to match the KAF eval schema. We need to get the actual token usage.
    tokens: {},
    content: responseText ? [responseText] : [],
    thoughts: buildThoughts(functionCalls, timestamp),
    tool_calls: toolCalls,
  };
}

/**
 * Extracts model thoughts/explanations from tool function calls into structured thought objects.
 */
function buildThoughts(functionCalls: RawFunctionCall[], timestamp: number): Turn['thoughts'] {
  return functionCalls.flatMap(call => {
    if (!call.args.explanation) {
      return [];
    }
    // Prefer the explicit title provided by the model (e.g. in executeJavaScript), otherwise fall back to tool name.
    const subject = (call.args.title as string) || call.name;
    const description = call.args.explanation as string;
    return [{subject, description, timestamp}];
  });
}

/**
 * Finds the preceding Gemini turn and associates the tool execution result with the matching tool call.
 * Note: DevTools executes at most one tool call per turn, so matching by tool name is sufficient.
 */
function attachToolResultToLastTurn(turns: Turn[], toolName: string, response: unknown): void {
  const prevTurn = turns.at(-1);
  if (prevTurn && prevTurn.role === 'gemini' && prevTurn.tool_calls) {
    const toolCall = prevTurn.tool_calls.find(tc => tc.name === toolName);
    if (toolCall) {
      toolCall.result = response;
      toolCall.status = (response && typeof response === 'object' && 'error' in response) ? 'error' : 'success';
    }
  }
}

if (import.meta.main) {
  const userArgs =
      yargs(hideBin(process.argv))
          .option('file', {type: 'string', demandOption: true, description: 'The raw JSON file from Auto Run.'})
          .option('label', {type: 'string', demandOption: true, desc: 'A human readable, short label to use.'})
          .option('pretty', {
            type: 'boolean',
            demandOption: false,
            default: false,
            description: 'Output formatted JSON rather than minified.',
          })
          .parseSync();

  const inputPath = path.isAbsolute(userArgs.file) ? userArgs.file : path.join(process.cwd(), userArgs.file);
  const contents = fs.readFileSync(inputPath, 'utf8');
  const trajectories =
      convertRawOutputToEval({inputFromAutoRun: JSON.parse(contents) as RawOutput, label: userArgs.label});

  for (const trajectory of trajectories) {
    const stringified = userArgs.pretty ? JSON.stringify(trajectory, null, 2) : JSON.stringify(trajectory);
    const fileName = `${slug(userArgs.label)}-${trajectory.metadata.session_id}.json`;
    fs.writeFileSync(path.join(process.cwd(), fileName), stringified, 'utf8');
    console.log(`Wrote ${fileName} to disk.`);
  }
}

/**
 * Computes a 15-character MD5 hash of the string for generating unique session IDs.
 */
function hash(str: string) {
  const hash = crypto.createHash('md5').update(str).digest('hex');
  return hash.substring(0, 15);
}

export function slug(str: string): string {
  str = str.replace(/^\s+|\s+$/g, '');  // Trim leading/trailing whitespace
  str = str.toLowerCase();
  str = str.replace(/[^a-z0-9 -]/g, '')  // Remove invalid chars
            .replace(/\s+/g, '-')        // Collapse whitespace and replace with -
            .replace(/-+/g, '-');        // Collapse dashes

  return str;
}
