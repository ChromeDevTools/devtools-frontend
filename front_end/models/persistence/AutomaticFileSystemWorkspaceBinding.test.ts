// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../core/platform/platform.js';
import * as Workspace from '../workspace/workspace.js';

import * as Persistence from './persistence.js';

describe('Persistence', () => {
  describe('AutomaticFileSystemWorkspaceBinding', () => {
    const {AutomaticFileSystemManager, Events} = Persistence.AutomaticFileSystemManager;
    const {AutomaticFileSystemWorkspaceBinding, FileSystem} = Persistence.AutomaticFileSystemWorkspaceBinding;
    const root = '/path/to/bar' as Platform.DevToolsPath.RawPathString;
    const uuid = '549bbf9b-48b2-4af7-aebd-d3ba68993094';

    describe('FileSystem', () => {
      it('is of type ConnectableFileSystem', () => {
        const automaticFileSystemManager = sinon.createStubInstance(AutomaticFileSystemManager);
        const workspace = sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl);
        const fileSystem = new FileSystem({root, uuid, state: 'disconnected'}, automaticFileSystemManager, workspace);

        assert.strictEqual(fileSystem.type(), Workspace.Workspace.projectTypes.ConnectableFileSystem);
      });

      it('uses the last path component as display name', () => {
        const automaticFileSystemManager = sinon.createStubInstance(AutomaticFileSystemManager);
        const workspace = sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl);
        const fileSystem = new FileSystem({root, uuid, state: 'disconnected'}, automaticFileSystemManager, workspace);

        assert.strictEqual(fileSystem.displayName(), 'bar');
      });
    });

    describe('AutomaticFileSystemWorkspaceBinding', () => {
      afterEach(() => {
        AutomaticFileSystemWorkspaceBinding.removeInstance();
      });

      it('listens to automatic file system changes', () => {
        const automaticFileSystemManager = sinon.createStubInstance(AutomaticFileSystemManager);
        sinon.stub(automaticFileSystemManager, 'automaticFileSystem').value(null);
        const workspace = sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl);

        const automaticFileSystemWorkspaceBinding = AutomaticFileSystemWorkspaceBinding.instance({
          forceNew: true,
          automaticFileSystemManager,
          workspace,
        });

        sinon.assert.calledOnceWithMatch(
            automaticFileSystemManager.addEventListener, Events.AUTOMATIC_FILE_SYSTEM_CHANGED, sinon.match.func,
            automaticFileSystemWorkspaceBinding);
      });

      it('doesn\'t add a placeholder project when there\'s no automatic file system', () => {
        const automaticFileSystemManager = sinon.createStubInstance(AutomaticFileSystemManager);
        sinon.stub(automaticFileSystemManager, 'automaticFileSystem').value(null);
        const workspace = sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl);

        AutomaticFileSystemWorkspaceBinding.instance({
          forceNew: true,
          automaticFileSystemManager,
          workspace,
        });

        sinon.assert.notCalled(workspace.addProject);
      });

      it('doesn\'t add a placeholder project when there\'s a connected automatic file system', () => {
        const automaticFileSystemManager = sinon.createStubInstance(AutomaticFileSystemManager);
        sinon.stub(automaticFileSystemManager, 'automaticFileSystem').value({root, uuid, state: 'connected'});
        const workspace = sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl);

        AutomaticFileSystemWorkspaceBinding.instance({
          forceNew: true,
          automaticFileSystemManager,
          workspace,
        });

        sinon.assert.notCalled(workspace.addProject);
      });

      it('adds a placeholder project when there\'s a connecting automatic file system', () => {
        const automaticFileSystem = {root, uuid, state: 'connecting'};
        const automaticFileSystemManager = sinon.createStubInstance(AutomaticFileSystemManager);
        sinon.stub(automaticFileSystemManager, 'automaticFileSystem').value(automaticFileSystem);
        const workspace = sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl);

        AutomaticFileSystemWorkspaceBinding.instance({
          forceNew: true,
          automaticFileSystemManager,
          workspace,
        });

        sinon.assert.calledOnceWithMatch(
            workspace.addProject,
            sinon.match.instanceOf(FileSystem).and(sinon.match.has('automaticFileSystem', automaticFileSystem)));
      });

      it('adds a placeholder project when there\'s a disconnected automatic file system', () => {
        const automaticFileSystem = {root, uuid, state: 'disconnected'};
        const automaticFileSystemManager = sinon.createStubInstance(AutomaticFileSystemManager);
        sinon.stub(automaticFileSystemManager, 'automaticFileSystem').value(automaticFileSystem);
        const workspace = sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl);

        AutomaticFileSystemWorkspaceBinding.instance({
          forceNew: true,
          automaticFileSystemManager,
          workspace,
        });

        sinon.assert.calledOnceWithMatch(
            workspace.addProject,
            sinon.match.instanceOf(FileSystem).and(sinon.match.has('automaticFileSystem', automaticFileSystem)));
      });

      it('correctly transitions from none to disconnected automatic file system', () => {
        const automaticFileSystemManager = sinon.createStubInstance(AutomaticFileSystemManager);
        sinon.stub(automaticFileSystemManager, 'automaticFileSystem').value(null);
        const workspace = sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl);
        const automaticFileSystemWorkspaceBinding = AutomaticFileSystemWorkspaceBinding.instance({
          forceNew: true,
          automaticFileSystemManager,
          workspace,
        });
        const [, automaticFileSystemChanged] = automaticFileSystemManager.addEventListener.lastCall.args;

        automaticFileSystemChanged.call(
            automaticFileSystemWorkspaceBinding, {data: {root, uuid, state: 'disconnected'}});

        sinon.assert.calledOnceWithMatch(
            workspace.addProject,
            sinon.match.instanceOf(FileSystem)
                .and(sinon.match.has('automaticFileSystem', sinon.match({root, uuid, state: 'disconnected'}))));
      });

      it('correctly transitions from disconnected to connecting automatic file system', () => {
        const automaticFileSystemManager = sinon.createStubInstance(AutomaticFileSystemManager);
        sinon.stub(automaticFileSystemManager, 'automaticFileSystem').value({root, uuid, state: 'disconnected'});
        const workspace = sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl);
        const automaticFileSystemWorkspaceBinding = AutomaticFileSystemWorkspaceBinding.instance({
          forceNew: true,
          automaticFileSystemManager,
          workspace,
        });
        const [, automaticFileSystemChanged] = automaticFileSystemManager.addEventListener.lastCall.args;
        const [fileSystem] = workspace.addProject.lastCall.args;
        workspace.addProject.resetHistory();

        automaticFileSystemChanged.call(automaticFileSystemWorkspaceBinding, {data: {root, uuid, state: 'connecting'}});

        sinon.assert.calledOnceWithExactly(workspace.removeProject, fileSystem);
        sinon.assert.calledOnceWithMatch(
            workspace.addProject,
            sinon.match.instanceOf(FileSystem)
                .and(sinon.match.has('automaticFileSystem', sinon.match({root, uuid, state: 'connecting'}))));
      });

      it('correctly transitions from connecting to connected automatic file system', () => {
        const automaticFileSystemManager = sinon.createStubInstance(AutomaticFileSystemManager);
        sinon.stub(automaticFileSystemManager, 'automaticFileSystem').value({root, uuid, state: 'connecting'});
        const workspace = sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl);
        const automaticFileSystemWorkspaceBinding = AutomaticFileSystemWorkspaceBinding.instance({
          forceNew: true,
          automaticFileSystemManager,
          workspace,
        });
        const [, automaticFileSystemChanged] = automaticFileSystemManager.addEventListener.lastCall.args;
        const [fileSystem] = workspace.addProject.lastCall.args;
        workspace.addProject.resetHistory();

        automaticFileSystemChanged.call(automaticFileSystemWorkspaceBinding, {data: {root, uuid, state: 'connected'}});

        sinon.assert.calledOnceWithExactly(workspace.removeProject, fileSystem);
        sinon.assert.notCalled(workspace.addProject);
      });
    });
  });
});
