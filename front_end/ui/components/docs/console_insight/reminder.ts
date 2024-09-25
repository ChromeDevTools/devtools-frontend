// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as Host from '../../../../core/host/host.js';
import * as Explain from '../../../../panels/explain/explain.js';
import * as FrontendHelpers from '../../../../testing/EnvironmentHelpers.js';
import * as ComponentHelpers from '../../helpers/helpers.js';

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();
Common.Settings.Settings.instance().createLocalSetting('console-insights-onboarding-finished', false).set(false);

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
              type: Explain.SourceType.NETWORK_REQUEST,
              value: `Request: https://example.com/data.html

Request headers:
:authority: example.com
:method: GET
:path: https://example.com/data.json
:scheme: https
accept: */*
accept-encoding: gzip, deflate, br
accept-language: en-DE,en;q=0.9,de-DE;q=0.8,de;q=0.7,en-US;q=0.6
referer: https://example.com/demo.html
sec-ch-ua: "Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"
sec-ch-ua-arch: "arm"
sec-ch-ua-bitness: "64"
sec-ch-ua-full-version: "121.0.6116.0"
sec-ch-ua-full-version-list: "Not A(Brand";v="99.0.0.0", "Google Chrome";v="121.0.6116.0", "Chromium";v="121.0.6116.0"
sec-ch-ua-mobile: ?0
sec-ch-ua-model: ""
sec-ch-ua-platform: "macOS"
sec-ch-ua-platform-version: "14.1.0"
sec-ch-ua-wow64: ?0
sec-fetch-dest: empty
sec-fetch-mode: cors
sec-fetch-site: same-origin
user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36

Response headers:
accept-ch: Sec-CH-UA, Sec-CH-UA-Arch, Sec-CH-UA-Bitness, Sec-CH-UA-Full-Version, Sec-CH-UA-Full-Version-List, Sec-CH-UA-Mobile, Sec-CH-UA-Model, Sec-CH-UA-Platform, Sec-CH-UA-Platform-Version, Sec-CH-UA-WoW64
content-length: 1646
content-type: text/html; charset=UTF-8
cross-origin-opener-policy-report-only: same-origin; report-to="gfe-static-content-corp"
date: Fri, 10 Nov 2023 13:46:47 GMT
permissions-policy: ch-ua=*, ch-ua-arch=*, ch-ua-bitness=*, ch-ua-full-version=*, ch-ua-full-version-list=*, ch-ua-mobile=*, ch-ua-model=*, ch-ua-platform=*, ch-ua-platform-version=*, ch-ua-wow64=*
server: sffe
strict-transport-security: max-age=31536000; includeSubdomains
vary: Origin

Response status: 404`,
            },
          ],
        };
      },
    },
    {
      async *
          fetch() {
            await new Promise(resolve => setTimeout(resolve, 2000));
            yield {
              explanation: `Some text with \`code\`. Some code:
\`\`\`ts
console.log('test');
document.querySelector('test').style = 'black';
\`\`\`
Some text with \`code\`. Some code:
\`\`\`ts
console.log('test');
document.querySelector('test').style = 'black';
\`\`\`
Some text with \`code\`. Some code:
\`\`\`ts
console.log('test');
document.querySelector('test').style = 'black';
\`\`\`
`,
              metadata: {},
              completed: true,
            };
          },
      registerClientEvent: () => Promise.resolve({}),
    },
    Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
document.getElementById('container')?.appendChild(component);
