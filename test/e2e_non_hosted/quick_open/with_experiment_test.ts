// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {readQuickOpenResults, typeIntoQuickOpen} from '../../e2e/helpers/quick_open-helpers';
import {setIgnoreListPattern} from '../../e2e/helpers/settings-helpers';
import {openSourcesPanel} from '../../e2e/helpers/sources-helpers';

describe('Quick Open menu with experiment', () => {
  setup({enabledDevToolsExperiments: ['just-my-code']});

  it('does not list ignore-listed files', async ({devToolsPage, inspectedPage}) => {
    await setIgnoreListPattern('workers.js', devToolsPage);
    await inspectedPage.goToResource('sources/multi-workers-sourcemap.html');
    await openSourcesPanel(devToolsPage);

    await typeIntoQuickOpen('mult', undefined, devToolsPage);
    const list = await readQuickOpenResults(devToolsPage);
    assert.deepEqual(list, ['multi-workers.min.js', 'multi-workers-sourcemap.html']);
  });
});
