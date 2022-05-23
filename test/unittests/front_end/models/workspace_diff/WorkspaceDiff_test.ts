// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as WorkspaceDiff from '../../../../../front_end/models/workspace_diff/workspace_diff.js';

import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import {describeWithRealConnection} from '../../helpers/RealConnection.js';
import {createFileSystemUISourceCode} from '../../helpers/UISourceCodeHelpers.js';

describeWithRealConnection('UISourceCodeDiff', () => {
  it('returns formatted mapping with a diff', async () => {
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const URL = 'file:///tmp/example.html' as Platform.DevToolsPath.UrlString;
    const {uiSourceCode, project} =
        createFileSystemUISourceCode({url: URL, content: 'const data={original:true}', mimeType: 'text/javascript'});
    uiSourceCode.setWorkingCopyGetter(() => 'const data={modified:true,original:false}');

    const uiSourceCodeDiff = new WorkspaceDiff.WorkspaceDiff.UISourceCodeDiff(uiSourceCode);
    const diff = await uiSourceCodeDiff.requestDiff({shouldFormatDiff: true});
    assertNotNullOrUndefined(diff);
    assert.deepEqual(diff.diff, [
      {'0': 0, '1': ['const data = {']},
      {'0': -1, '1': ['    original: true']},
      {'0': 1, '1': ['    modified: true,', '    original: false']},
      {'0': 0, '1': ['}', '']},
    ]);
    assert.deepEqual(diff.formattedCurrentMapping?.originalToFormatted(0, 'const data={'.length), [1, 4]);
    assert.deepEqual(diff.formattedCurrentMapping?.originalToFormatted(0, 'const data={modified:true,'.length), [2, 4]);
    workspace.removeProject(project);
  });
});
