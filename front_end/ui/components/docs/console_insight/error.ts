// Copyright 2023 The Chromium Authors
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
        return {prompt: '', sources: [], isPageReloadRecommended: false};
      },
    },
    {
      async *
          // eslint-disable-next-line require-yield
          doConversation() {
            throw new Error('Could not connect to the server');
          },
      registerClientEvent: () => Promise.resolve({}),
    },
    Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
document.getElementById('container')?.appendChild(component);
