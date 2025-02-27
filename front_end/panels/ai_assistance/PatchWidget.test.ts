// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {
  cleanup,
  createPatchWidget,
} from '../../testing/AiAssistanceHelpers.js';
import {updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {createFileSystemUISourceCode} from '../../testing/UISourceCodeHelpers.js';

describeWithMockConnection('workspace', () => {
  afterEach(() => {
    cleanup();
  });

  function createTestFilesystem(fileSystemPath: string) {
    const {project, uiSourceCode} = createFileSystemUISourceCode({
      url: Platform.DevToolsPath.urlString`file:///example.html`,
      mimeType: 'text/html',
      content: 'content',
      fileSystemPath,
    });
    return {project, uiSourceCode};
  }

  it('does not report a workspace project if disabled', async () => {
    createTestFilesystem('file://test');
    updateHostConfig({
      devToolsFreestyler: {
        enabled: true,
        patching: false,
      },
    });
    const {
      initialViewInput,
    } = await createPatchWidget();
    assert.isUndefined(initialViewInput.projectName);
  });

  it('reports a current workspace project', async () => {
    createTestFilesystem('file://test');
    updateHostConfig({
      devToolsFreestyler: {
        enabled: true,
        patching: true,
      },
    });
    const {
      initialViewInput,
    } = await createPatchWidget();
    assert.strictEqual(initialViewInput.projectName, 'test');
  });

  it('reports an updated project', async () => {
    const {project} = createTestFilesystem('file://test');
    updateHostConfig({
      devToolsFreestyler: {
        enabled: true,
        patching: true,
      },
    });
    const {initialViewInput, expectViewUpdate} = await createPatchWidget();
    assert.strictEqual(initialViewInput.projectName, 'test');

    const updatedViewInput = await expectViewUpdate(() => {
      Workspace.Workspace.WorkspaceImpl.instance().removeProject(project);
      createTestFilesystem('file://test2');
    });
    assert.strictEqual(updatedViewInput.projectName, 'test2');
  });
});
