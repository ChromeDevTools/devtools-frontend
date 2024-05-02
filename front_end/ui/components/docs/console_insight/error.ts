// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Explain from '../../../../panels/explain/explain.js';
import * as FrontendHelpers from '../../../../testing/EnvironmentHelpers.js';
import * as ComponentHelpers from '../../helpers/helpers.js';

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

const ConsoleInsight = Explain.ConsoleInsight;

const component = new ConsoleInsight(
    {
      async buildPrompt() {
        return {prompt: '', sources: []};
      },
    },
    {
      async *
          // eslint-disable-next-line require-yield
          fetch() {
            throw new Error('Could not connect to the server');
          },
    },
    'Understand this error', {
      isSyncActive: true,
      accountEmail: 'some-email',
    });
document.getElementById('container')?.appendChild(component);
