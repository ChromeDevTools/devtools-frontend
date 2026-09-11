// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Platform from '../../core/platform/platform.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import {createContentProviderUISourceCode, createFileSystemUISourceCode} from '../../testing/UISourceCodeHelpers.js';
import * as Formatter from '../formatter/formatter.js';
import * as Persistence from '../persistence/persistence.js';
import * as WorkspaceDiff from '../workspace_diff/workspace_diff.js';

const {urlString} = Platform.DevToolsPath;

describe('UISourceCodeDiff', () => {
  setupSettingsHooks();

  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
  });

  afterEach(() => {
    Formatter.FormatterWorkerPool.FormatterWorkerPool.removeInstance();
  });

  it('returns formatted mapping with a diff', async () => {
    const workspace = universe.workspace;
    const URL = urlString`file:///tmp/example.html`;
    const {uiSourceCode, project} = createFileSystemUISourceCode(
        {url: URL, content: 'const data={original:true}', mimeType: 'text/javascript', universe});
    uiSourceCode.setWorkingCopyGetter(() => 'const data={modified:true,original:false}');

    const uiSourceCodeDiff = new WorkspaceDiff.WorkspaceDiff.UISourceCodeDiff(
        uiSourceCode, universe.networkPersistenceManager, universe.settings);
    const {diff, formattedCurrentMapping} = (await uiSourceCodeDiff.requestDiff())!;
    assert.deepEqual(diff, [
      {0: 0, 1: ['const data = {']},
      {0: -1, 1: ['    original: true']},
      {0: 1, 1: ['    modified: true,', '    original: false']},
      {0: 0, 1: ['}', '']},
    ]);
    assert.deepEqual(formattedCurrentMapping!.originalToFormatted(0, 'const data={'.length), [1, 4]);
    assert.deepEqual(formattedCurrentMapping!.originalToFormatted(0, 'const data={modified:true,'.length), [2, 4]);
    workspace.removeProject(project);
  });

  it('returns only the file uiSourceCode as modified', async () => {
    const persistence = universe.persistence;

    const network = createContentProviderUISourceCode({
      url: urlString`http://example.com`,
      content: 'const data={original:true}',
      mimeType: 'text/javascript',
      universe,
    });
    const file = createFileSystemUISourceCode(
        {
          url: urlString`file:///tmp/example.html`,
          content: 'const data={original:true}',
          mimeType: 'text/javascript',
          universe,
        },
    );
    // Mock a binding
    await persistence.addBindingForTest(
        new Persistence.Persistence.PersistenceBinding(network.uiSourceCode, file.uiSourceCode));
    const uiSourceDiff = universe.workspaceDiff;
    network.uiSourceCode.setWorkingCopyGetter(() => 'const data={modified:true,original:false}');

    assert.deepEqual(uiSourceDiff.modifiedUISourceCodes(), [file.uiSourceCode]);
  });
});
