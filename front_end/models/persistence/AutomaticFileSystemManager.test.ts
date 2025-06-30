// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import type * as Platform from '../../core/platform/platform.js';
import * as ProjectSettings from '../project_settings/project_settings.js';

import * as Persistence from './persistence.js';

function createStubInstances(
    availability: ProjectSettings.ProjectSettingsModel.ProjectSettingsAvailability,
    projectSettings: ProjectSettings.ProjectSettingsModel.ProjectSettings,
) {
  const inspectorFrontendHost =
      sinon.createStubInstance(class extends Host.InspectorFrontendHost.InspectorFrontendHostStub {
        override events = sinon.createStubInstance(Common.ObjectWrapper.ObjectWrapper);
      });
  inspectorFrontendHost.events = sinon.createStubInstance(Common.ObjectWrapper.ObjectWrapper);
  const projectSettingsModel = sinon.createStubInstance(ProjectSettings.ProjectSettingsModel.ProjectSettingsModel);
  sinon.stub(projectSettingsModel, 'availability').value(availability);
  sinon.stub(projectSettingsModel, 'projectSettings').value(projectSettings);
  return {inspectorFrontendHost, projectSettingsModel};
}

describe('Persistence', () => {
  describe('AutomaticFileSystemManager', () => {
    describe('AutomaticFileSystemManager', () => {
      const AUTOMATIC_FILE_SYSTEM_CHANGED = Persistence.AutomaticFileSystemManager.Events.AUTOMATIC_FILE_SYSTEM_CHANGED;
      const {AutomaticFileSystemManager} = Persistence.AutomaticFileSystemManager;
      const root = '/path/to/bar' as Platform.DevToolsPath.RawPathString;
      const uuid = '549bbf9b-48b2-4af7-aebd-d3ba68993094';

      afterEach(() => {
        AutomaticFileSystemManager.removeInstance();
      });

      it('initially doesn\'t report an automatic file system', () => {
        const {inspectorFrontendHost, projectSettingsModel} = createStubInstances('available', {});

        const manager = AutomaticFileSystemManager.instance({
          forceNew: true,
          inspectorFrontendHost,
          projectSettingsModel,
        });

        assert.isNull(manager.automaticFileSystem);
      });

      it('listens to FileSystemRemoved events', () => {
        const {inspectorFrontendHost, projectSettingsModel} = createStubInstances('available', {});

        const automaticFileSystemManager = AutomaticFileSystemManager.instance({
          forceNew: true,
          inspectorFrontendHost,
          projectSettingsModel,
        });

        sinon.assert.calledOnceWithMatch(
            inspectorFrontendHost.events.addEventListener, Host.InspectorFrontendHostAPI.Events.FileSystemRemoved,
            sinon.match.func, automaticFileSystemManager);
      });

      it('attempts to automatically connect the file system initially', () => {
        const {inspectorFrontendHost, projectSettingsModel} =
            createStubInstances('available', {workspace: {root, uuid}});

        const manager = AutomaticFileSystemManager.instance({
          forceNew: true,
          inspectorFrontendHost,
          projectSettingsModel,
        });

        assert.deepEqual(manager.automaticFileSystem, {root, uuid, state: 'connecting'});
        sinon.assert.calledOnceWithMatch(
            inspectorFrontendHost.connectAutomaticFileSystem, root, uuid, false, sinon.match.func);
      });

      it('reflects state correctly when automatic connection succeeds', async () => {
        const {inspectorFrontendHost, projectSettingsModel} =
            createStubInstances('available', {workspace: {root, uuid}});

        const manager = AutomaticFileSystemManager.instance({
          forceNew: true,
          inspectorFrontendHost,
          projectSettingsModel,
        });
        const [, , , setupCallback] = inspectorFrontendHost.connectAutomaticFileSystem.lastCall.args;
        setupCallback({success: true});
        const automaticFileSystem = await manager.once(AUTOMATIC_FILE_SYSTEM_CHANGED);

        assert.strictEqual(automaticFileSystem, manager.automaticFileSystem);
        assert.deepEqual(automaticFileSystem, {root, uuid, state: 'connected'});
      });

      it('reflects state correctly when automatic connection fails', async () => {
        const {inspectorFrontendHost, projectSettingsModel} =
            createStubInstances('available', {workspace: {root, uuid}});

        const manager = AutomaticFileSystemManager.instance({
          forceNew: true,
          inspectorFrontendHost,
          projectSettingsModel,
        });
        const [, , , setupCallback] = inspectorFrontendHost.connectAutomaticFileSystem.lastCall.args;
        setupCallback({success: false});
        const automaticFileSystem = await manager.once(AUTOMATIC_FILE_SYSTEM_CHANGED);

        assert.strictEqual(automaticFileSystem, manager.automaticFileSystem);
        assert.deepEqual(automaticFileSystem, {root, uuid, state: 'disconnected'});
      });

      it('performs first-time setup of automatic file system correctly', async () => {
        const {inspectorFrontendHost, projectSettingsModel} =
            createStubInstances('available', {workspace: {root, uuid}});
        const manager = AutomaticFileSystemManager.instance({
          forceNew: true,
          inspectorFrontendHost,
          projectSettingsModel,
        });
        const [, , , setupCallback] = inspectorFrontendHost.connectAutomaticFileSystem.lastCall.args;
        setupCallback({success: false});
        await manager.once(AUTOMATIC_FILE_SYSTEM_CHANGED);
        inspectorFrontendHost.connectAutomaticFileSystem.reset();
        const connectingPromise = manager.once(AUTOMATIC_FILE_SYSTEM_CHANGED);

        const successPromise = manager.connectAutomaticFileSystem(/* addIfMissing= */ true);
        assert.strictEqual(manager.automaticFileSystem, await connectingPromise);
        assert.deepEqual(manager.automaticFileSystem, {root, uuid, state: 'connecting'});
        const connectedPromise = manager.once(AUTOMATIC_FILE_SYSTEM_CHANGED);
        const [, , , connectCallback] = inspectorFrontendHost.connectAutomaticFileSystem.lastCall.args;
        connectCallback({success: true});

        const [success, automaticFileSystem] = await Promise.all([successPromise, connectedPromise]);
        assert.isTrue(success);
        assert.strictEqual(manager.automaticFileSystem, automaticFileSystem);
        assert.deepEqual(manager.automaticFileSystem, {root, uuid, state: 'connected'});
      });

      it('correctly disconnects automatic file systems', async () => {
        const {inspectorFrontendHost, projectSettingsModel} =
            createStubInstances('available', {workspace: {root, uuid}});
        const manager = AutomaticFileSystemManager.instance({
          forceNew: true,
          inspectorFrontendHost,
          projectSettingsModel,
        });
        const [, , , setupCallback] = inspectorFrontendHost.connectAutomaticFileSystem.lastCall.args;
        setupCallback({success: true});
        await manager.once(AUTOMATIC_FILE_SYSTEM_CHANGED);
        const automaticFileSystemPromise = manager.once(AUTOMATIC_FILE_SYSTEM_CHANGED);

        manager.disconnectedAutomaticFileSystem();

        const automaticFileSystem = await automaticFileSystemPromise;
        sinon.assert.calledOnceWithExactly(inspectorFrontendHost.disconnectAutomaticFileSystem, root);
        assert.strictEqual(manager.automaticFileSystem, automaticFileSystem);
        assert.deepEqual(manager.automaticFileSystem, {root, uuid, state: 'disconnected'});
      });

      it('reflects disconnected state correctly when the file system is removed', async () => {
        const {inspectorFrontendHost, projectSettingsModel} =
            createStubInstances('available', {workspace: {root, uuid}});
        const manager = AutomaticFileSystemManager.instance({
          forceNew: true,
          inspectorFrontendHost,
          projectSettingsModel,
        });
        const [, fileSystemRemoved] = inspectorFrontendHost.events.addEventListener.lastCall.args;
        const [, , , setupCallback] = inspectorFrontendHost.connectAutomaticFileSystem.lastCall.args;
        setupCallback({success: true});
        await manager.once(AUTOMATIC_FILE_SYSTEM_CHANGED);
        const automaticFileSystemPromise = manager.once(AUTOMATIC_FILE_SYSTEM_CHANGED);

        fileSystemRemoved.call(manager, {data: root});

        const automaticFileSystem = await automaticFileSystemPromise;
        assert.strictEqual(manager.automaticFileSystem, automaticFileSystem);
        assert.deepEqual(manager.automaticFileSystem, {root, uuid, state: 'disconnected'});
      });

      it('reports available when project settings are available', () => {
        const {inspectorFrontendHost, projectSettingsModel} = createStubInstances('available', {});

        const manager = AutomaticFileSystemManager.instance({
          forceNew: true,
          inspectorFrontendHost,
          projectSettingsModel,
        });

        assert.strictEqual(manager.availability, 'available');
      });

      it('reports unavailable when project settings are unavailable', () => {
        const {inspectorFrontendHost, projectSettingsModel} = createStubInstances('unavailable', {});

        const manager = AutomaticFileSystemManager.instance({
          forceNew: true,
          inspectorFrontendHost,
          projectSettingsModel,
        });

        assert.strictEqual(manager.availability, 'unavailable');
      });
    });
  });
});
