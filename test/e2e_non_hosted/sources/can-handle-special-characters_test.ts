// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import {resolve} from 'path';

import {
  addBreakpointForLine,
  executionLineHighlighted,
  getBreakpointDecorators,
  getOpenSources,
  openFileInEditor,
  openFileInSourcesPanel,
  openSourcesPanel,
  RESUME_BUTTON,
} from '../../e2e/helpers/sources-helpers.js';
import type {DevToolsPage} from '../../e2e_non_hosted/shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

describe('Sources Tab', () => {
  async function runTest(
      filename: string, functionName: string, devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    await openFileInEditor(filename, devToolsPage);
    await addBreakpointForLine(2, devToolsPage);

    const scriptEvaluation = inspectedPage.evaluate(functionName + '();');
    await devToolsPage.waitFor(RESUME_BUTTON);

    // Breakpoint is still visible
    assert.deepEqual(await getBreakpointDecorators(false, 1, devToolsPage), [2]);

    await executionLineHighlighted(devToolsPage);

    // Title of tab matches filename
    assert.deepEqual(await getOpenSources(devToolsPage), [filename]);

    await devToolsPage.click(RESUME_BUTTON);
    await scriptEvaluation;
  }

  async function loadFromFilePath(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    const fileUrl = 'file://' +
        resolve(__dirname, '..', '..', 'e2e', 'resources', 'sources', 'filesystem', 'special-characters.html');
    await inspectedPage.goTo(fileUrl);
    await openSourcesPanel(devToolsPage);
  }

  it('can handle filename with space loading over the network', async ({devToolsPage, inspectedPage}) => {
    await openFileInSourcesPanel('filesystem/special-characters.html', devToolsPage, inspectedPage);
    await runTest('with space.js', 'f1', devToolsPage, inspectedPage);
  });

  it('can handle filename with escape sequence loading over the network', async ({devToolsPage, inspectedPage}) => {
    await openFileInSourcesPanel('filesystem/special-characters.html', devToolsPage, inspectedPage);
    await runTest('with%20space.js', 'f2', devToolsPage, inspectedPage);
  });

  it('can handle filename with space loading from local file', async ({devToolsPage, inspectedPage}) => {
    await loadFromFilePath(devToolsPage, inspectedPage);
    await runTest('with space.js', 'f1', devToolsPage, inspectedPage);
  });

  it('can handle filename with escape sequence loading from local file', async ({devToolsPage, inspectedPage}) => {
    await loadFromFilePath(devToolsPage, inspectedPage);
    await runTest('with%20space.js', 'f2', devToolsPage, inspectedPage);
  });
});
