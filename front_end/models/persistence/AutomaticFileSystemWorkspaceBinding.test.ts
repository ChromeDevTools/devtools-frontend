// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as Workspace from '../workspace/workspace.js';

import * as Persistence from './persistence.js';

describe('Persistence', () => {
  describe('AutomaticFileSystemWorkspaceBinding', () => {
    const {AutomaticFileSystemManager, Events: AutomaticFileSystemManagerEvents} =
        Persistence.AutomaticFileSystemManager;
    const {AutomaticFileSystemWorkspaceBinding, FileSystem} = Persistence.AutomaticFileSystemWorkspaceBinding;
    const {IsolatedFileSystemManager} = Persistence.IsolatedFileSystemManager;
    const {PlatformFileSystem} = Persistence.PlatformFileSystem;
    const root = '/path/to/bar' as Platform.DevToolsPath.RawPathString;
    const rootURL = Platform.DevToolsPath.urlString`file://${root}`;
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
        const isolatedFileSystemManager = sinon.createStubInstance(IsolatedFileSystemManager);
        const workspace = sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl);

        const automaticFileSystemWorkspaceBinding = AutomaticFileSystemWorkspaceBinding.instance({
          forceNew: true,
          automaticFileSystemManager,
          isolatedFileSystemManager,
          workspace,
        });

        sinon.assert.calledOnceWithMatch(
            automaticFileSystemManager.addEventListener, AutomaticFileSystemManagerEvents.AUTOMATIC_FILE_SYSTEM_CHANGED,
            sinon.match.func, automaticFileSystemWorkspaceBinding);
      });

      it('doesn\'t add a placeholder project when there\'s no automatic file system', () => {
        const automaticFileSystemManager = sinon.createStubInstance(AutomaticFileSystemManager);
        sinon.stub(automaticFileSystemManager, 'automaticFileSystem').value(null);
        const isolatedFileSystemManager = sinon.createStubInstance(IsolatedFileSystemManager);
        const workspace = sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl);

        AutomaticFileSystemWorkspaceBinding.instance({
          forceNew: true,
          automaticFileSystemManager,
          isolatedFileSystemManager,
          workspace,
        });

        sinon.assert.notCalled(workspace.addProject);
      });

      it('doesn\'t add a placeholder project when there\'s a connected automatic file system', () => {
        const automaticFileSystemManager = sinon.createStubInstance(AutomaticFileSystemManager);
        sinon.stub(automaticFileSystemManager, 'automaticFileSystem').value({root, uuid, state: 'connected'});
        const isolatedFileSystemManager = sinon.createStubInstance(IsolatedFileSystemManager);
        const workspace = sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl);

        AutomaticFileSystemWorkspaceBinding.instance({
          forceNew: true,
          automaticFileSystemManager,
          isolatedFileSystemManager,
          workspace,
        });

        sinon.assert.notCalled(workspace.addProject);
      });

      it('doesn\'t add a placeholder project when there\'s a manually added file system with the same path', () => {
        const automaticFileSystemManager = sinon.createStubInstance(AutomaticFileSystemManager);
        sinon.stub(automaticFileSystemManager, 'automaticFileSystem').value({root, uuid, state: 'connecting'});
        const isolatedFileSystemManager = sinon.createStubInstance(IsolatedFileSystemManager);
        isolatedFileSystemManager.fileSystem.returns(sinon.createStubInstance(PlatformFileSystem));
        const workspace = sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl);

        AutomaticFileSystemWorkspaceBinding.instance({
          forceNew: true,
          automaticFileSystemManager,
          isolatedFileSystemManager,
          workspace,
        });

        sinon.assert.calledOnceWithExactly(isolatedFileSystemManager.fileSystem, rootURL);
        sinon.assert.notCalled(workspace.addProject);
      });

      it('adds a placeholder project when there\'s a connecting automatic file system', () => {
        const automaticFileSystem = {root, uuid, state: 'connecting'};
        const automaticFileSystemManager = sinon.createStubInstance(AutomaticFileSystemManager);
        sinon.stub(automaticFileSystemManager, 'automaticFileSystem').value(automaticFileSystem);
        const isolatedFileSystemManager = sinon.createStubInstance(IsolatedFileSystemManager);
        isolatedFileSystemManager.fileSystem.returns(null);
        const workspace = sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl);

        AutomaticFileSystemWorkspaceBinding.instance({
          forceNew: true,
          automaticFileSystemManager,
          isolatedFileSystemManager,
          workspace,
        });

        sinon.assert.calledOnceWithExactly(isolatedFileSystemManager.fileSystem, rootURL);
        sinon.assert.calledOnceWithMatch(
            workspace.addProject,
            sinon.match.instanceOf(FileSystem).and(sinon.match.has('automaticFileSystem', automaticFileSystem)));
      });

      it('adds a placeholder project when there\'s a disconnected automatic file system', () => {
        const automaticFileSystem = {root, uuid, state: 'disconnected'};
        const automaticFileSystemManager = sinon.createStubInstance(AutomaticFileSystemManager);
        sinon.stub(automaticFileSystemManager, 'automaticFileSystem').value(automaticFileSystem);
        const isolatedFileSystemManager = sinon.createStubInstance(IsolatedFileSystemManager);
        isolatedFileSystemManager.fileSystem.returns(null);
        const workspace = sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl);

        AutomaticFileSystemWorkspaceBinding.instance({
          forceNew: true,
          automaticFileSystemManager,
          isolatedFileSystemManager,
          workspace,
        });

        sinon.assert.calledOnceWithMatch(
            workspace.addProject,
            sinon.match.instanceOf(FileSystem).and(sinon.match.has('automaticFileSystem', automaticFileSystem)));
      });

      it('correctly transitions from none to disconnected automatic file system', () => {
        const automaticFileSystemManager = sinon.createStubInstance(AutomaticFileSystemManager);
        sinon.stub(automaticFileSystemManager, 'automaticFileSystem').value(null);
        const isolatedFileSystemManager = sinon.createStubInstance(IsolatedFileSystemManager);
        isolatedFileSystemManager.fileSystem.returns(null);
        const workspace = sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl);
        const automaticFileSystemWorkspaceBinding = AutomaticFileSystemWorkspaceBinding.instance({
          forceNew: true,
          automaticFileSystemManager,
          isolatedFileSystemManager,
          workspace,
        });
        const [, automaticFileSystemChanged] = automaticFileSystemManager.addEventListener.lastCall.args;

        const automaticFileSystem = {root, uuid, state: 'disconnected'} as const;
        sinon.stub(automaticFileSystemManager, 'automaticFileSystem').value(automaticFileSystem);
        automaticFileSystemChanged.call(automaticFileSystemWorkspaceBinding, {data: automaticFileSystem});

        sinon.assert.calledOnceWithMatch(
            workspace.addProject,
            sinon.match.instanceOf(FileSystem).and(sinon.match.has('automaticFileSystem', automaticFileSystem)));
      });

      it('correctly transitions from disconnected to connecting automatic file system', () => {
        const automaticFileSystemManager = sinon.createStubInstance(AutomaticFileSystemManager);
        sinon.stub(automaticFileSystemManager, 'automaticFileSystem').value({root, uuid, state: 'disconnected'});
        const isolatedFileSystemManager = sinon.createStubInstance(IsolatedFileSystemManager);
        isolatedFileSystemManager.fileSystem.returns(null);
        const workspace = sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl);
        const automaticFileSystemWorkspaceBinding = AutomaticFileSystemWorkspaceBinding.instance({
          forceNew: true,
          automaticFileSystemManager,
          isolatedFileSystemManager,
          workspace,
        });
        const [, automaticFileSystemChanged] = automaticFileSystemManager.addEventListener.lastCall.args;
        const [fileSystem] = workspace.addProject.lastCall.args;
        workspace.addProject.resetHistory();

        const automaticFileSystem = {root, uuid, state: 'connecting'} as const;
        sinon.stub(automaticFileSystemManager, 'automaticFileSystem').value(automaticFileSystem);
        automaticFileSystemChanged.call(automaticFileSystemWorkspaceBinding, {data: automaticFileSystem});

        sinon.assert.calledOnceWithExactly(workspace.removeProject, fileSystem);
        sinon.assert.calledOnceWithMatch(
            workspace.addProject,
            sinon.match.instanceOf(FileSystem).and(sinon.match.has('automaticFileSystem', automaticFileSystem)));
      });

      it('correctly transitions from connecting to connected automatic file system', () => {
        const automaticFileSystemManager = sinon.createStubInstance(AutomaticFileSystemManager);
        sinon.stub(automaticFileSystemManager, 'automaticFileSystem').value({root, uuid, state: 'connecting'});
        const isolatedFileSystemManager = sinon.createStubInstance(IsolatedFileSystemManager);
        isolatedFileSystemManager.fileSystem.returns(null);
        const workspace = sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl);
        const automaticFileSystemWorkspaceBinding = AutomaticFileSystemWorkspaceBinding.instance({
          forceNew: true,
          automaticFileSystemManager,
          isolatedFileSystemManager,
          workspace,
        });
        const [, automaticFileSystemChanged] = automaticFileSystemManager.addEventListener.lastCall.args;
        const [fileSystem] = workspace.addProject.lastCall.args;
        workspace.addProject.resetHistory();

        const automaticFileSystem = {root, uuid, state: 'connected'} as const;
        sinon.stub(automaticFileSystemManager, 'automaticFileSystem').value(automaticFileSystem);
        automaticFileSystemChanged.call(automaticFileSystemWorkspaceBinding, {data: automaticFileSystem});

        sinon.assert.calledOnceWithExactly(workspace.removeProject, fileSystem);
        sinon.assert.notCalled(workspace.addProject);
      });
    });
  });
});
