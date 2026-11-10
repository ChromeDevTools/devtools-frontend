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

export interface ToolCallResult {
  result?: unknown;
  error?: string;
  [key: string]: unknown;
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  timestamp: number;
  duration?: number;
  status?: 'success'|'error';
  result?: ToolCallResult;
}

export interface TurnTokens {
  input?: number;
  output?: number;
  thoughts?: number;
  tool?: number;
  cached?: number;
  total?: number;
}

/* eslint-disable @typescript-eslint/naming-convention */
export interface Turn {
  turn_id: string;
  role: 'user'|'gemini';
  timestamp: number;
  /** Optional because user turns have no span and tool calls are initialized before execution completes. */
  duration?: number;
  tokens: TurnTokens;
  content: string[];
  thoughts: Thought[];
  tool_calls: ToolCall[];
}

export interface TrajectoryMetadata {
  /**
   * Deterministic identifier for this trajectory session (`<15-char-hash>-<index>`,
   * e.g. `'07a8fb33eca1976-0'`), used in HTML reports and `.eval.json` filenames.
   */
  session_id: string;
  /** LLM model identifier resolved by AIDA (e.g. `'gemini-2.5-pro'`). */
  model: string;
  chrome_version: string;
  /**
   * Identifies the eval task that produced this trajectory (e.g. `'coffee-alchemy'`).
   * Matches `task_id` in `eval_task_completed.json` and the GCS `tasks/<taskId>/` directory.
   */
  task_id: string;
  start_time: string;
  last_updated: string;
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
        response: ToolCallResult,
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
    usageMetadata?: {
      promptTokenCount?: number,
      candidatesTokenCount?: number,
      totalTokenCount?: number,
      thoughtsTokenCount?: number,
      cachedContentTokenCount?: number,
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
  requestTimestamp: number;
  responseTimestamp: number;
}
/* eslint-enable @typescript-eslint/naming-convention */

export interface TrajectoryBuilderOptions {
  sessionId?: string;
  taskId?: string;
}

/**
 * Constructs a single Trajectory from session metadata and its corresponding raw turns.
 */
function buildTrajectory(
    sessionId: string,
    taskId: string,
    steps: Step[],
    ): Trajectory {
  const firstStep = steps[0];
  const chromeVersion = firstStep?.request?.metadata?.client_version;
  assert.isOk(chromeVersion, 'No client_version found in step');

  const modelData = firstStep?.aidaResponse?.metadata?.inferenceOptionMetadata;
  assert.isOk(modelData, 'No inferenceOptionMetadata found in step');

  const lastStep = steps.findLast(s => s.aidaResponse.completed) ?? steps[steps.length - 1];

  return {
    metadata: {
      session_id: sessionId,
      model: modelData.modelId ?? '',
      chrome_version: chromeVersion,
      task_id: taskId,
      start_time: new Date(firstStep.requestTimestamp / 1000).toISOString(),
      last_updated: new Date(lastStep.responseTimestamp / 1000).toISOString(),
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

  for (const {request, aidaResponse, requestTimestamp, responseTimestamp} of steps) {
    if (!aidaResponse.completed) {
      continue;
    }

    for (const requestPart of request.current_message.parts) {
      if (requestPart?.text) {
        // User prompt starts a new turn.
        turns.push(createUserTurn(String(turnIndex++), requestPart.text, requestTimestamp));
      } else if (requestPart?.functionResponse) {
        // Tool responses from DevTools are attached back to the preceding Gemini turn that invoked them.
        const {name, response} = requestPart.functionResponse;
        attachToolResultToLastTurn(turns, name, response, requestTimestamp);
      }
    }

    // AIDA response turn (text explanation and/or tool call invocations).
    const duration = responseTimestamp - requestTimestamp;
    turns.push(createGeminiTurn(String(turnIndex++), aidaResponse, responseTimestamp, duration));
  }

  return turns;
}

function createUserTurn(turnId: string, userText: string, timestamp: number): Turn {
  return {
    turn_id: turnId,
    role: 'user',
    timestamp,
    tokens: {},
    content: [userText],
    thoughts: [],
    tool_calls: [],
  };
}

const TOKEN_KEYS: Array<keyof TurnTokens> = ['input', 'output', 'thoughts', 'tool', 'cached', 'total'];

function extractTurnTokens(aidaResponse: RawAidaResponse): TurnTokens {
  const usage = aidaResponse.metadata?.usageMetadata;
  if (!usage) {
    return {};
  }
  const tokens: TurnTokens = {};
  if (usage.promptTokenCount !== undefined) {
    tokens.input = usage.promptTokenCount;
  }
  if (usage.candidatesTokenCount !== undefined) {
    tokens.output = usage.candidatesTokenCount;
  }
  if (usage.thoughtsTokenCount !== undefined) {
    tokens.thoughts = usage.thoughtsTokenCount;
  }
  if (usage.cachedContentTokenCount !== undefined) {
    tokens.cached = usage.cachedContentTokenCount;
  }
  if (usage.totalTokenCount !== undefined) {
    tokens.total = usage.totalTokenCount;
  }
  return tokens;
}

/**
 * Aggregates token counts across all turns in a trajectory.
 * Returns an empty object if no turn reported token usage.
 */
export function calculateTrajectoryTokens(trajectory: Trajectory): TurnTokens {
  const totals: TurnTokens = {};
  for (const {tokens} of trajectory.data) {
    for (const key of TOKEN_KEYS) {
      const value = tokens?.[key];
      if (value !== undefined) {
        totals[key] = (totals[key] ?? 0) + value;
      }
    }
  }
  return totals;
}

export interface ToolCallStats {
  total: number;
  byTool: Record<string, number>;
  failedByTool: Record<string, number>;
  activationsBySkill: Record<string, number>;
}

/**
 * Computes total tool call counts, per-tool frequency maps, and skill
 * activation counts across all turns in a trajectory.
 */
export function calculateTrajectoryToolCalls(trajectory: Trajectory): ToolCallStats {
  let total = 0;
  const byTool: Record<string, number> = {};
  const failedByTool: Record<string, number> = {};
  const activationsBySkill: Record<string, number> = {};
  for (const turn of trajectory.data) {
    for (const tc of turn.tool_calls ?? []) {
      total++;
      byTool[tc.name] = (byTool[tc.name] ?? 0) + 1;
      if (tc.status === 'error') {
        failedByTool[tc.name] = (failedByTool[tc.name] ?? 0) + 1;
      } else if (tc.name === 'learnSkills') {
        const skills = tc.args?.['skills'];
        if (Array.isArray(skills)) {
          for (const skill of skills) {
            if (typeof skill === 'string' && skill.trim()) {
              activationsBySkill[skill] = (activationsBySkill[skill] ?? 0) + 1;
            }
          }
        }
      }
    }
  }
  return {total, byTool, failedByTool, activationsBySkill};
}

function createGeminiTurn(turnId: string, aidaResponse: RawAidaResponse, timestamp: number, duration: number): Turn {
  const responseText = aidaResponse.explanation?.trim();
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
    duration,
    tokens: extractTurnTokens(aidaResponse),
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
 * Finds the preceding Gemini turn and attaches the tool result to the matching tool call.
 * Note that the model can call the same tool multiple times in a single turn. Since
 * `functionResponse` parts are returned in the same order as the requests, we match the
 * first call for `toolName` that doesn't have a result yet, such that earlier results
 * aren't overwritten.
 */
function attachToolResultToLastTurn(
    turns: Turn[],
    toolName: string,
    response: ToolCallResult,
    resultTimestamp: number,
    ): void {
  const prevTurn = turns.at(-1);
  if (prevTurn && prevTurn.role === 'gemini' && prevTurn.tool_calls) {
    const toolCall = prevTurn.tool_calls.find(tc => tc.name === toolName && tc.result === undefined) ??
        prevTurn.tool_calls.find(tc => tc.name === toolName);
    if (toolCall) {
      toolCall.duration = resultTimestamp - toolCall.timestamp;
      toolCall.timestamp = resultTimestamp;
      toolCall.result = response;
      toolCall.status = 'error' in response ? 'error' : 'success';
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

  hasSteps(): boolean {
    return this.#steps.length > 0;
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
    const taskId = this.#options.taskId ?? '';
    return buildTrajectory(sessionId, taskId, this.#steps);
  }
}

export function getMarkdownConversation(example: Trajectory): string {
  let markdown = '';
  for (const turn of example.data ?? []) {
    if (turn.role === 'user') {
      markdown += '## REQUEST FROM CLIENT:\n';
      if (turn.content?.length) {
        markdown += `### QUERY:\n${turn.content.join('\n')}\n`;
      }
    } else {
      markdown += '## RESPONSE FROM SERVER:\n';
      if (turn.content?.length) {
        markdown += `### EXPLANATION:\n${turn.content.join('\n')}\n`;
      }
      if (turn.tool_calls?.length) {
        const calls = turn.tool_calls.map(tc => tc.name).join(', ');
        markdown += `### FUNCTION CALL REQUESTS:\n${calls}\n`;
        for (const tc of turn.tool_calls) {
          if (tc.result) {
            markdown += `### FUNCTION CALL RESPONSE FOR ${tc.name}:\n${JSON.stringify(tc.result)}\n`;
          }
        }
      }
    }
    markdown += '\n';
  }
  return markdown;
}

function formatToolResult(result: ToolCallResult): string {
  const keys = Object.keys(result);
  const value = (keys.length === 1 && keys[0] === 'result') ? result.result : result;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        return JSON.stringify(JSON.parse(trimmed), null, 2);
      } catch (err) {
        console.warn(`Failed to parse JSON-like tool result in formatChatLog: ${err}`);
      }
    }
    return value;
  }
  return JSON.stringify(value);
}

/**
 * Formats a trajectory into a clean, human-readable plaintext chat log.
 * Shows user queries, agent explanations, turn metadata, and readable tool calls/results.
 */
export function formatChatLog(trajectory: Trajectory): string {
  const parts: string[] = [];
  const headerItems: string[] = [];
  if (trajectory.metadata?.task_id) {
    headerItems.push(`Task: ${trajectory.metadata.task_id}`);
  }
  if (trajectory.metadata?.model) {
    headerItems.push(`Model: ${trajectory.metadata.model}`);
  }
  if (headerItems.length > 0 && trajectory.data.length > 0) {
    parts.push(headerItems.join(' | '));
    parts.push('');
  }
  for (const turn of trajectory.data) {
    if (turn.role === 'user') {
      parts.push('User:');
      if (turn.content?.length) {
        parts.push(turn.content.join('\n'));
      }
    } else {
      const turnMeta: string[] = [];
      if (turn.duration !== undefined && turn.duration > 0) {
        const durationSec = turn.duration / 1_000_000;
        turnMeta.push(`duration=${durationSec.toFixed(2)}s`);
      }
      if (turn.tokens?.total !== undefined) {
        turnMeta.push(`tokens=${turn.tokens.total}`);
      }
      parts.push(turnMeta.length > 0 ? `Agent (${turnMeta.join(', ')}):` : 'Agent:');
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
            const resultStr = formatToolResult(tc.result);
            if (resultStr.includes('\n')) {
              parts.push(`[Tool Result]\n${resultStr}`);
            } else {
              parts.push(`[Tool Result: ${resultStr}]`);
            }
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
