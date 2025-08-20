// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as assert from 'node:assert';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {hideBin} from 'yargs/helpers';
import yargs from 'yargs/yargs';

import type {Conversation, EvalFileOutput, ProcessedQuery} from './types';

const userArgs =
    yargs(hideBin(process.argv))
        .option('file', {type: 'string', demandOption: true, description: 'The raw JSON file from Auto Run.'})
        .option('label', {type: 'string', demandOption: true, desc: 'A human readable, short label to use.'})
        .option('pretty', {
          type: 'boolean',
          demandOption: false,
          default: false,
          description: 'Output formatted JSON rather than minified.'
        })
        .parseSync();

const inputPath = path.isAbsolute(userArgs.file) ? userArgs.file : path.join(process.cwd(), userArgs.file);
const contents = fs.readFileSync(inputPath, 'utf8');

const INPUT_HASH = hash(contents, null);

// Note: non-exhaustive.
interface RawOutput {
  metadata: Array<{exampleId: string, explanation: string}>;
  examples: Array<{
    exampleId: string,
    request: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      current_message: {
        parts: Array<{
          text?: string,
          functionResponse?: {
            name: string,
            response: {result: Record<string, string>},
          },
        }>,
      },
      // eslint-disable-next-line @typescript-eslint/naming-convention
      function_declarations: Array<{
        name: string,
        description: string,
        parameters: {
          properties?: Record<string, unknown>,
        },
      }>,
      metadata: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        client_version: string,
      },
    },
    aidaResponse: {
      metadata: {
        rcpGlobalId: string,
        inferenceOptionMetadata: {
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

const json = JSON.parse(contents) as RawOutput;

const examples = json.metadata.map(m => m.exampleId);

const processedExamples: Conversation[] =
    examples
        .map((exampleIdFromInput, index) => {
          const data = json.examples.filter(e => e.exampleId === exampleIdFromInput);
          if (!data.length) {
            return null;
          }

          const exampleMetadata = json.metadata[index];

          const id = INPUT_HASH + '-' + index;
          const chromeVersion = data.at(0)?.request.metadata.client_version;
          assert.ok(chromeVersion, 'No client_version');
          const modelData = data.at(0)?.aidaResponse.metadata.inferenceOptionMetadata;
          assert.ok(modelData, 'No inferenceOptionMetadata');
          const processed: Conversation = {
            id,
            chromeVersion,
            explanation: exampleMetadata?.explanation ?? '',
            model: {
              id: modelData?.modelId,
              version: modelData?.modelVersion,
            },
            queries: [],
          };

          for (const {request, aidaResponse} of data) {
            if (!aidaResponse.completed) {
              continue;
            }

            const responseText = aidaResponse.explanation?.trim() ?? undefined;

            const query: ProcessedQuery = {
              request: {
                prompt: request.current_message.parts[0].text,
                functionCallResponse: request.current_message.parts[0].functionResponse?.name,
                availableFunctionNames: request.function_declarations.map(dec => dec.name),
              },
              response: {
                rpcGlobalId: aidaResponse.metadata.rcpGlobalId,
                text: responseText,
                functionCallRequests: aidaResponse.functionCalls?.map(call => {
                  return {
                    name: call.name,
                    args: call.args,
                  };
                }),
              }
            };
            processed.queries.push(query);
          }
          return processed;
        })
        .filter(x => x !== null);

const finalOutput: EvalFileOutput = {
  metadata: {
    createdAt: new Date().toISOString(),
    id: hash(processedExamples.map(x => x.id).join(''), 16),
    label: userArgs.label,
  },
  conversations: processedExamples,
};

const stringified = userArgs.pretty ? JSON.stringify(finalOutput, null, 2) : JSON.stringify(finalOutput);

const fileName = `${slug(userArgs.label)}-${finalOutput.metadata.id}.json`;
fs.writeFileSync(path.join(process.cwd(), fileName), stringified, 'utf8');
console.log(`Wrote ${fileName} to disk.`);

function hash(str: string, length: number|null) {
  const hash = crypto.createHash('md5').update(str).digest('hex');
  if (length) {
    return hash.substring(0, length);
  }
  return hash;
}

function slug(str: string): string {
  str = str.replace(/^\s+|\s+$/g, '');  // Trim leading/trailing whitespace
  str = str.toLowerCase();
  str = str.replace(/[^a-z0-9 -]/g, '')  // Remove invalid chars
            .replace(/\s+/g, '-')        // Collapse whitespace and replace with -
            .replace(/-+/g, '-');        // Collapse dashes

  return str;
}
