// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Workspace from '../../models/workspace/workspace.js';
import {
  cleanup,
  createPatchWidget,
  createTestFilesystem,
  initializePersistenceImplForTests,
} from '../../testing/AiAssistanceHelpers.js';
import {updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';

describeWithMockConnection('workspace', () => {
  beforeEach(() => {
    initializePersistenceImplForTests();
  });

  afterEach(() => {
    cleanup();
  });

  it('does not report a workspace project if disabled', async () => {
    createTestFilesystem('file://test');
    updateHostConfig({
      devToolsFreestyler: {
        enabled: true,
        patching: false,
      },
    });
    const {view} = await createPatchWidget();
    assert.isUndefined(view.input.projectName);
  });

  it('reports a current workspace project', async () => {
    createTestFilesystem('file://test');
    updateHostConfig({
      devToolsFreestyler: {
        enabled: true,
        patching: true,
      },
    });
    const {view} = await createPatchWidget();
    assert.strictEqual(view.input.projectName, 'test');
  });

  it('reports an updated project', async () => {
    const {project} = createTestFilesystem('file://test');
    updateHostConfig({
      devToolsFreestyler: {
        enabled: true,
        patching: true,
      },
    });
    const {view} = await createPatchWidget();
    assert.strictEqual(view.input.projectName, 'test');

    Workspace.Workspace.WorkspaceImpl.instance().removeProject(project);
    createTestFilesystem('file://test2');
    assert.strictEqual((await view.nextInput).projectName, 'test2');
  });
});
