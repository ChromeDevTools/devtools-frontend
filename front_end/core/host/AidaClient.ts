// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Platform from '../platform/platform.js';

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
  metadata?: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    disable_user_content_logging: boolean,
  };
}

export interface AidaResponse {
  explanation: string;
  metadata: {
    rpcGlobalId?: number,
  };
}

export class AidaClient {
  static buildConsoleInsightsRequest(input: string): AidaRequest {
    const request: AidaRequest = {
      input,
      client: 'CHROME_DEVTOOLS',
    };
    const config = Common.Settings.Settings.instance().getHostConfig();
    let temperature = NaN;
    let modelId = null;
    let disallowLogging = false;
    if (config?.devToolsConsoleInsightsDogfood.enabled) {
      temperature = config.devToolsConsoleInsightsDogfood.aidaTemperature;
      modelId = config.devToolsConsoleInsightsDogfood.aidaModelId;
    } else if (config?.devToolsConsoleInsights.enabled) {
      temperature = config.devToolsConsoleInsights.aidaTemperature;
      modelId = config.devToolsConsoleInsights.aidaModelId;
      disallowLogging = config.devToolsConsoleInsights.disallowLogging;
    }

    if (!isNaN(temperature)) {
      request.options ??= {};
      request.options.temperature = temperature;
    }
    if (modelId) {
      request.options ??= {};
      request.options.model_id = modelId;
    }
    if (disallowLogging) {
      request.metadata = {
        disable_user_content_logging: true,
      };
    }
    return request;
  }

  async * fetch(request: AidaRequest): AsyncGenerator<AidaResponse, void, void> {
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
    InspectorFrontendHostInstance.doAidaConversation(JSON.stringify(request), streamId, result => {
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
    const metadata = {rpcGlobalId: 0};
    while ((chunk = await stream.read())) {
      let textUpdated = false;
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
        if ('metadata' in result) {
          metadata.rpcGlobalId = result.metadata.rpcGlobalId;
        }
        if ('textChunk' in result) {
          if (inCodeChunk) {
            text.push(CODE_CHUNK_SEPARATOR);
            inCodeChunk = false;
          }
          text.push(result.textChunk.text);
          textUpdated = true;
        } else if ('codeChunk' in result) {
          if (!inCodeChunk) {
            text.push(CODE_CHUNK_SEPARATOR);
            inCodeChunk = true;
          }
          text.push(result.codeChunk.code);
          textUpdated = true;
        } else if ('error' in result) {
          throw new Error(`Server responded: ${JSON.stringify(result)}`);
        } else {
          throw new Error('Unknown chunk result');
        }
      }
      if (textUpdated) {
        yield {
          explanation: text.join('') + (inCodeChunk ? CODE_CHUNK_SEPARATOR : ''),
          metadata,
        };
      }
    }
  }
}
