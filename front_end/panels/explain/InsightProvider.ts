// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
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

  async getInsights(input: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!Host.InspectorFrontendHost.InspectorFrontendHostInstance.doAidaConversation) {
        return reject(new Error('doAidaConversation is not available'));
      }
      console.time('request');
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.doAidaConversation(
          JSON.stringify(InsightProvider.buildApiRequest(input)),
          result => {
            console.timeEnd('request');
            try {
              const results = JSON.parse(result.response);
              const text = [];
              let inCodeChunk = false;
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
                  if (result['detail']?.[0]?.error?.code === 403) {
                    throw new Error('Server responded: permission denied');
                  }
                  throw new Error(`Server responded: ${JSON.stringify(result)}`);
                } else {
                  throw new Error('Unknown chunk result');
                }
              }
              if (inCodeChunk) {
                text.push(CODE_CHUNK_SEPARATOR);
                inCodeChunk = false;
              }
              resolve(text.join(''));
            } catch (err) {
              reject(err);
            }
          },
      );
    });
  }
}
