// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as assert from 'node:assert';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {hideBin} from 'yargs/helpers';
import yargs from 'yargs/yargs';

import {Role, type Trajectory, type Turn} from './types.js';

/** Note: non-exhaustive. **/
/* eslint-disable @typescript-eslint/naming-convention */
export interface RawOutput {
  metadata: Array<{session_id: string, explanation: string}>;
  examples: Array<{
    session_id: string,
    request: {

      current_message: {
        parts: Array<{
          text?: string,
          functionResponse?: {
            name: string,
            response: {result: Record<string, string>},
          },
        }>,
      },

      function_declarations: Array<{
        name: string,
        description: string,
        parameters: {
          properties?: Record<string, unknown>,
        },
      }>,
      metadata: {

        client_version: string,
      },
    },
    aidaResponse: {
      metadata: {
        rcpGlobalId?: string,
        inferenceOptionMetadata?: {
          modelId: string,
          modelVersion: string,
        },
      },
      explanation?: string,
      functionCalls?: Array<{name: string, args: Record<string, unknown>}>,
      completed?: true,
    },
  }>;
}
/* eslint-enable @typescript-eslint/naming-convention */

interface RawToEvalOptions {
  inputFromAutoRun: RawOutput;
  label: string;
}

export function convertRawOutputToEval(opts: RawToEvalOptions): Trajectory[] {
  const inputHash = hash(JSON.stringify(opts.inputFromAutoRun));
  const sessionIds = opts.inputFromAutoRun.metadata.map(m => m.session_id);

  const processedExamples: Trajectory[] =
      sessionIds
          .map((sessionIdFromInput, index) => {
            const data = opts.inputFromAutoRun.examples.filter(e => e.session_id === sessionIdFromInput);
            if (!data.length) {
              return null;
            }
            const exampleMetadata = opts.inputFromAutoRun.metadata[index];

            const id = inputHash + '-' + index;
            const chromeVersion = data.at(0)?.request.metadata.client_version;
            assert.ok(chromeVersion, 'No client_version');
            const modelData = data.at(0)?.aidaResponse.metadata.inferenceOptionMetadata;
            assert.ok(modelData, 'No inferenceOptionMetadata');

            const processed: Trajectory = {
              metadata: {
                session_id: id,
                model: modelData?.modelId ?? '',
                chromeVersion,
                autoRunExampleId: sessionIdFromInput,
                explanation: exampleMetadata?.explanation ?? '',
              },
              data: [],
            };

            let turnIndex = 1;
            for (const {request, aidaResponse} of data) {
              if (!aidaResponse.completed) {
                continue;
              }

              const userText = request.current_message.parts[0].text;
              const functionResponse = request.current_message.parts[0].functionResponse;

              // A client message part can either be a user text query or a tool call result.
              if (userText) {
                // If it is user text, it starts a new user turn in the conversation.
                processed.data.push({
                  turn_id: String(turnIndex++),
                  role: Role.USER,
                  content: [userText],
                });
              } else if (functionResponse) {
                // If it is a tool response, we attach the result back to the matching
                // tool call in the previous Gemini turn to keep them associated.
                const prevTurn = processed.data.at(-1);
                if (prevTurn && prevTurn.role === Role.GEMINI && prevTurn.tool_calls) {
                  const toolCall = prevTurn.tool_calls.find(tc => tc.name === functionResponse.name);
                  if (toolCall) {
                    toolCall.result = functionResponse.response;
                  }
                }
              }

              const responseText = aidaResponse.explanation?.trim();
              const geminiTurn: Turn = {
                turn_id: String(turnIndex++),
                role: Role.GEMINI,
                content: responseText ? [responseText] : [],
              };
              if (aidaResponse.functionCalls?.length) {
                geminiTurn.tool_calls = aidaResponse.functionCalls.map(call => ({
                                                                         name: call.name,
                                                                         args: call.args,
                                                                       }));
              }
              processed.data.push(geminiTurn);
            }
            return processed;
          })
          .filter(x => x !== null);

  return processedExamples;
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
