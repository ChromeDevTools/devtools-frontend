// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';

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

export class InsightProvider {
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

  async * getInsights(input: string): AsyncGenerator<AidaResponse, void, void> {
    if (!Host.InspectorFrontendHost.InspectorFrontendHostInstance.doAidaConversation) {
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
    const streamId = Host.ResourceLoader.bindOutputStream(stream);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.doAidaConversation(
        JSON.stringify(InsightProvider.buildApiRequest(input)), streamId, result => {
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
      if (chunk.endsWith(']')) {
        chunk = chunk.slice(0, -1);
      }
      if (chunk.startsWith(',') || chunk.startsWith('[')) {
        chunk = chunk.slice(1);
      }
      if (!chunk.length) {
        continue;
      }
      const result = JSON.parse(chunk);
      const CODE_CHUNK_SEPARATOR = '\n`````\n';
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
      yield {
        explanation: text.join('') + (inCodeChunk ? CODE_CHUNK_SEPARATOR : ''),
        metadata: {rpcGlobalId: result?.metadata?.rpcGlobalId},
      };
    }
  }
}
