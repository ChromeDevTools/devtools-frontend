// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../../core/host/host.js';
import * as Explain from '../../../../panels/explain/explain.js';
import * as FrontendHelpers from '../../../../testing/EnvironmentHelpers.js';
import * as ComponentHelpers from '../../helpers/helpers.js';

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

const ConsoleInsight = Explain.ConsoleInsight;

const component = new ConsoleInsight(
    {
      getSearchQuery() {
        return '';
      },
      async buildPrompt() {
        return {
          prompt: '',
          isPageReloadRecommended: false,
          sources: [
            {
              type: Explain.SourceType.MESSAGE,
              value: 'Something went wrong\n\nSomething went wrong',
            },
            {
              type: Explain.SourceType.STACKTRACE,
              value: 'Stacktrace line1\nStacketrace line2',
            },
            {
              type: Explain.SourceType.RELATED_CODE,
              value: 'RelatedCode',
            },
            {
              type: Explain.SourceType.NETWORK_REQUEST,
              value: `Request: https://example.com/data.html

Request headers:
:authority: example.com
user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36

Response headers:
Response status: 404`,
            },
          ],
        };
      },
    },
    {
      async *
          fetch() {
            yield {
              explanation: `## Result

Here is a text which contains both direct and indirect citations.

An indirect citation is a link to a reference which applies to the whole response.

A direct citation is a link to a reference, but it only applies to a specific part of the response. Direct citations are numbered and are shown as a number within square brackets in the response text.
`,
              metadata: {
                attributionMetadata: {
                  attributionAction: Host.AidaClient.RecitationAction.CITE,
                  citations: [
                    {
                      startIndex: 20,
                      endIndex: 50,
                      uri: 'https://www.direct-citation.dev',
                      sourceType: Host.AidaClient.CitationSourceType.WORLD_FACTS,
                    },
                    {
                      startIndex: 170,
                      endIndex: 176,
                      uri: 'https://www.another-direct-citation.dev',
                      sourceType: Host.AidaClient.CitationSourceType.WORLD_FACTS,
                    },
                  ],
                },
                factualityMetadata: {
                  facts: [
                    {
                      sourceUri: 'https://www.indirect-citation.dev',
                    },
                    {
                      sourceUri: 'https://www.the-whole-world.dev',
                    },
                    {
                      sourceUri: 'https://www.even-more-content.dev',
                    },
                  ]
                }
              },
              completed: true,
            };
          },
      registerClientEvent: () => Promise.resolve({}),
    },

    Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
document.getElementById('container')?.appendChild(component);
