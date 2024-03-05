// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../platform/platform.js';
import * as Root from '../root/root.js';
import {InspectorFrontendHostInstance} from './InspectorFrontendHost.js';
import {bindOutputStream} from './ResourceLoader.js';

export interface AidaRequest {
  input: string;
  client: string;
  options?: {
    temperature?: Number,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    model_id?: string,
  };
}

export interface AidaResponse {
  explanation: string;
  metadata: {
    rpcGlobalId?: number,
  };
}

export class AidaClient {
  static buildApiRequest(input: string): AidaRequest {
    const request: AidaRequest = {
      input,
      client: 'CHROME_DEVTOOLS',
    };
    const temperature = parseFloat(Root.Runtime.Runtime.queryParam('aidaTemperature') || '');
    if (!isNaN(temperature)) {
      request.options ??= {};
      request.options.temperature = temperature;
    }
    const modelId = Root.Runtime.Runtime.queryParam('aidaModelId');
    if (modelId) {
      request.options ??= {};
      request.options.model_id = modelId;
    }
    return request;
  }

  async * fetch(input: string): AsyncGenerator<AidaResponse, void, void> {
    if (!InspectorFrontendHostInstance.doAidaConversation) {
      throw new Error('doAidaConversation is not available');
    }
    const stream = (() => {
      let {promise, resolve, reject} = Platform.PromiseUtilities.promiseWithResolvers<string|null>();
      return {
        write: async(data: string): Promise<void> => {
          resolve(data);
          ({promise, resolve, reject} = Platform.PromiseUtilities.promiseWithResolvers<string|null>());
        },
        close: async(): Promise<void> => {
          resolve(null);
        },
        read: (): Promise<string|null> => {
          return promise;
        },
        fail: (e: Error) => reject(e),
      };
    })();
    const streamId = bindOutputStream(stream);
    InspectorFrontendHostInstance.doAidaConversation(
        JSON.stringify(AidaClient.buildApiRequest(input)), streamId, result => {
          if (result.statusCode === 403) {
            stream.fail(new Error('Server responded: permission denied'));
          } else if (result.error) {
            stream.fail(new Error(`Cannot send request: ${result.error} ${result.detail || ''}`));
          } else if (result.statusCode !== 200) {
            stream.fail(new Error(`Request failed: ${JSON.stringify(result)}`));
          } else {
            void stream.close();
          }
        });
    let chunk;
    const text = [];
    let inCodeChunk = false;
    while ((chunk = await stream.read())) {
      // The AIDA response is a JSON array of objects, split at the object
      // boundary. Therefore each chunk may start with `[` or `,` and possibly
      // followed by `]`. Each chunk may include one or more objects, so we
      // make sure that each chunk becomes a well-formed JSON array when we
      // parse it by adding `[` and `]` and removing `,` where appropriate.
      if (!chunk.length) {
        continue;
      }
      if (chunk.startsWith(',')) {
        chunk = chunk.slice(1);
      }
      if (!chunk.startsWith('[')) {
        chunk = '[' + chunk;
      }
      if (!chunk.endsWith(']')) {
        chunk = chunk + ']';
      }
      let results;
      try {
        results = JSON.parse(chunk);
      } catch (error) {
        throw new Error('Cannot parse chunk: ' + chunk, {cause: error});
      }
      const CODE_CHUNK_SEPARATOR = '\n`````\n';
      for (const result of results) {
        if ('textChunk' in result) {
          if (inCodeChunk) {
            text.push(CODE_CHUNK_SEPARATOR);
            inCodeChunk = false;
          }
          text.push(result.textChunk.text);
        } else if ('codeChunk' in result) {
          if (!inCodeChunk) {
            text.push(CODE_CHUNK_SEPARATOR);
            inCodeChunk = true;
          }
          text.push(result.codeChunk.code);
        } else if ('error' in result) {
          throw new Error(`Server responded: ${JSON.stringify(result)}`);
        } else {
          throw new Error('Unknown chunk result');
        }
      }
      yield {
        explanation: text.join('') + (inCodeChunk ? CODE_CHUNK_SEPARATOR : ''),
        metadata: {rpcGlobalId: results[0]?.metadata?.rpcGlobalId},
      };
    }
  }
}
