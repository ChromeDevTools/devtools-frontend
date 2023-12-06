// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as Root from '../../core/root/root.js';

export interface AidaRequest {
  input: string;
  client: string;
  options?: {
    temperature: Number,
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
      request.options = {temperature};
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
              const text = results
                               .map(
                                   (
                                       result:|{textChunk: {text: string}}|{codeChunk: {code: string}},
                                       ) => {
                                     if ('textChunk' in result) {
                                       return result.textChunk.text;
                                     }
                                     if ('codeChunk' in result) {
                                       return '\n`````\n' + result.codeChunk.code + '\n`````\n';
                                     }
                                     if ('error' in result) {
                                       throw new Error(`${result['error']}: ${result['detail']}`);
                                     }
                                     throw new Error('Unknown chunk result');
                                   },
                                   )
                               .join('');
              resolve(text);
            } catch (err) {
              reject(err);
            }
          },
      );
    });
  }
}
