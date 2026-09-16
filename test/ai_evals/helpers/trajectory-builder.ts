// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

/**
 * Creates a temporary directory for staging evaluation trajectories during a run.
 */
export function createTempEvalDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ai-evals-'));
}

/**
 * Generates the default session ID matching autorun's 15-character MD5 hash format.
 */
export function createDefaultSessionId(data: unknown, index = 0): string {
  const hash = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex').substring(0, 15);
  return `${hash}-${index}`;
}

export interface Thought {
  subject: string;
  description: string;
  timestamp: number;
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  timestamp: number;
  status?: 'success'|'error';
  result?: unknown;
}

/* eslint-disable @typescript-eslint/naming-convention */
export interface Turn {
  turn_id: string;
  role: 'user'|'gemini';
  timestamp: number;
  tokens: Record<string, never>;
  content: string[];
  thoughts: Thought[];
  tool_calls: ToolCall[];
}

export interface TrajectoryMetadata {
  session_id: string;
  model: string;
  chrome_version: string;
  auto_run_example_id?: string;
}

export interface Trajectory {
  metadata: TrajectoryMetadata;
  data: Turn[];
}

export interface RawRequest {
  current_message: {
    parts: Array<{
      text?: string,
      functionResponse?: {
        name: string,
        response: Record<string, unknown>,
      },
    }>,
  };
  metadata?: {
    client_version?: string,
    string_session_id?: string,
  };
}

export interface RawFunctionCall {
  name: string;
  args: Record<string, unknown>;
}

export interface RawAidaResponse {
  metadata?: {
    rpcGlobalId?: string|number,
    inferenceOptionMetadata?: {
      modelId?: string,
      modelVersion?: string,
    },
  };
  explanation?: string;
  functionCalls?: RawFunctionCall[];
  completed?: boolean;
}

export interface Step {
  session_id?: string;
  request: RawRequest;
  aidaResponse: RawAidaResponse;
}

export type RawExample = Step;
/* eslint-enable @typescript-eslint/naming-convention */

export interface TrajectoryBuilderOptions {
  sessionId?: string;
  autoRunExampleId?: string;
}

/**
 * Constructs a single Trajectory from session metadata and its corresponding raw turns.
 */
function buildTrajectory(
    sessionId: string,
    autoRunExampleId: string,
    steps: Step[],
    ): Trajectory {
  const firstStep = steps[0];
  const chromeVersion = firstStep?.request?.metadata?.client_version;
  assert.isOk(chromeVersion, 'No client_version found in step');

  const modelData = firstStep?.aidaResponse?.metadata?.inferenceOptionMetadata;
  assert.isOk(modelData, 'No inferenceOptionMetadata found in step');

  return {
    metadata: {
      session_id: sessionId,
      model: modelData.modelId ?? '',
      chrome_version: chromeVersion,
      auto_run_example_id: autoRunExampleId,
    },
    data: buildTurns(steps),
  };
}

/**
 * Iterates through raw request/response pairs and reconstructs the chronological turn history.
 */
function buildTurns(steps: Step[]): Turn[] {
  const turns: Turn[] = [];
  let turnIndex = 1;

  for (const {request, aidaResponse} of steps) {
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

/**
 * Standalone utility responsible for collecting AI conversation interaction logs
 * (as emitted by `handleExternalAIRequest` / `aiAssistanceStructuredLog`) and compiling
 * them into standard `trajectory.json` evaluation outputs.
 */
export class TrajectoryBuilder {
  readonly #options: TrajectoryBuilderOptions;
  readonly #steps: Step[] = [];
  readonly #seenRpcIds = new Set<string|number>();

  constructor(options: TrajectoryBuilderOptions = {}) {
    this.#options = options;
  }

  addSteps(steps: Step[]): this {
    for (const step of steps) {
      this.addStep(step);
    }
    return this;
  }

  /**
   * Appends a single raw interaction step. Deduplicates by rpcGlobalId if present (matching auto-run).
   */
  addStep(step: Step): this {
    if (!step || typeof step !== 'object') {
      return this;
    }
    const rpcId = step.aidaResponse?.metadata?.rpcGlobalId;
    if (rpcId !== undefined && rpcId !== null && rpcId !== '') {
      if (this.#seenRpcIds.has(rpcId)) {
        return this;
      }
      this.#seenRpcIds.add(rpcId);
    }
    this.#steps.push(step);
    return this;
  }

  /**
   * Builds the complete Trajectory object matching autorun conventions.
   */
  build(): Trajectory {
    const sessionId = this.#options.sessionId ?? createDefaultSessionId(this.#steps);
    const autoRunExampleId = this.#options.autoRunExampleId ?? '';
    return buildTrajectory(sessionId, autoRunExampleId, this.#steps);
  }

  /**
   * Builds the trajectory and writes it to disk as formatted JSON.
   */
  writeToFile(filePath: string): Trajectory {
    const trajectory = this.build();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, {recursive: true});
    }
    fs.writeFileSync(filePath, JSON.stringify(trajectory, null, 2), 'utf-8');
    return trajectory;
  }

  /**
   * Builds and exports the trajectory to the specified evaluation output directory.
   */
  exportToFile(label: string, outputDir: string): {trajectory: Trajectory, outputPath: string} {
    const trajectory = this.build();
    const outputPath = exportEvalTrajectory(trajectory, label, outputDir);
    return {trajectory, outputPath};
  }
}

/**
 * Formats a trajectory into a clean, human-readable plaintext chat log.
 * Shows user queries, agent explanations, and any tool calls/results.
 */
export function formatChatLog(trajectory: Trajectory): string {
  const parts: string[] = [];
  for (const turn of trajectory.data) {
    if (turn.role === 'user') {
      parts.push('User:');
      if (turn.content?.length) {
        parts.push(turn.content.join('\n'));
      }
    } else {
      parts.push('Agent:');
      if (turn.thoughts?.length) {
        for (const thought of turn.thoughts) {
          if (thought.description) {
            parts.push(`[Thought: ${thought.description}]`);
          }
        }
      }
      if (turn.content?.length) {
        parts.push(turn.content.join('\n'));
      }
      if (turn.tool_calls?.length) {
        for (const tc of turn.tool_calls) {
          const argsStr = tc.args ? JSON.stringify(tc.args) : '';
          parts.push(`[Tool Call: ${tc.name}(${argsStr})]`);
          if (tc.result !== undefined) {
            const resultStr = typeof tc.result === 'string' ? tc.result : JSON.stringify(tc.result);
            parts.push(`[Tool Result: ${resultStr}]`);
          }
        }
      }
    }
    parts.push('');
  }
  return parts.join('\n').trimEnd() + '\n';
}

export function slug(str: string): string {
  str = str.replace(/^\s+|\s+$/g, '');  // Trim leading/trailing whitespace
  str = str.toLowerCase();
  str = str.replace(/[^a-z0-9 -]/g, '')  // Remove invalid chars
            .replace(/\s+/g, '-')        // Collapse whitespace and replace with -
            .replace(/-+/g, '-');        // Collapse dashes

  return str;
}

/**
 * Writes the eval trajectory to the specified output directory.
 * Returns the path of the written `.eval.json` file.
 */
export function exportEvalTrajectory(
    trajectory: Trajectory,
    label: string,
    outputDir: string,
    ): string {
  const fileName = `${slug(label)}-${trajectory.metadata.session_id}`;
  fs.mkdirSync(outputDir, {recursive: true});
  const evalOutputPath = path.resolve(outputDir, `${fileName}.eval.json`);
  fs.writeFileSync(evalOutputPath, JSON.stringify(trajectory, null, 2), 'utf-8');
  return evalOutputPath;
}
