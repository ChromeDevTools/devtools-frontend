// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as ProjectSettings from '../project_settings/project_settings.js';

import * as Persistence from './persistence.js';

describe('AutomaticFileSystemManager', () => {
  const AUTOMATIC_FILE_SYSTEM_CHANGED = Persistence.AutomaticFileSystemManager.Events.AUTOMATIC_FILE_SYSTEM_CHANGED;
  const {AutomaticFileSystemManager} = Persistence.AutomaticFileSystemManager;
  const root = '/path/to/bar';
  const uuid = '549bbf9b-48b2-4af7-aebd-d3ba68993094';
  const hostConfig = {devToolsAutomaticFileSystems: {enabled: true}};

  afterEach(() => {
    AutomaticFileSystemManager.removeInstance();
  });

  it('initially doesn\'t report an automatic file system', () => {
    const inspectorFrontendHost = sinon.createStubInstance(Host.InspectorFrontendHost.InspectorFrontendHostStub);
    const projectSettingsModel = sinon.createStubInstance(ProjectSettings.ProjectSettingsModel.ProjectSettingsModel);
    sinon.stub(projectSettingsModel, 'projectSettings').value({});

    const manager = AutomaticFileSystemManager.instance({
      forceNew: true,
      hostConfig,
      inspectorFrontendHost,
      projectSettingsModel,
    });

    assert.isNull(manager.automaticFileSystem);
  });

  it('doesn\'t listen to project settings changes when `devToolsAutomaticFileSystems` is off', () => {
    const hostConfig = {devToolsAutomaticFileSystems: {enabled: false}};
    const inspectorFrontendHost = sinon.createStubInstance(Host.InspectorFrontendHost.InspectorFrontendHostStub);
    const projectSettingsModel = sinon.createStubInstance(ProjectSettings.ProjectSettingsModel.ProjectSettingsModel);

    AutomaticFileSystemManager.instance({
      forceNew: true,
      hostConfig,
      inspectorFrontendHost,
      projectSettingsModel,
    });

    assert(projectSettingsModel.addEventListener.notCalled);
  });

  it('attempts to automatically connect the file system initially', () => {
    const inspectorFrontendHost = sinon.createStubInstance(Host.InspectorFrontendHost.InspectorFrontendHostStub);
    const projectSettingsModel = sinon.createStubInstance(ProjectSettings.ProjectSettingsModel.ProjectSettingsModel);
    sinon.stub(projectSettingsModel, 'projectSettings').value({workspace: {root, uuid}});

    const manager = AutomaticFileSystemManager.instance({
      forceNew: true,
      hostConfig,
      inspectorFrontendHost,
      projectSettingsModel,
    });

    assert.deepEqual(manager.automaticFileSystem, {root, uuid, state: 'connecting'});
    assert(inspectorFrontendHost.connectAutomaticFileSystem.calledOnceWith(root, uuid, false));
  });

  it('reflects state correctly when automatic connection succeeds', async () => {
    const inspectorFrontendHost = sinon.createStubInstance(Host.InspectorFrontendHost.InspectorFrontendHostStub);
    const projectSettingsModel = sinon.createStubInstance(ProjectSettings.ProjectSettingsModel.ProjectSettingsModel);
    sinon.stub(projectSettingsModel, 'projectSettings').value({workspace: {root, uuid}});

    const manager = AutomaticFileSystemManager.instance({
      forceNew: true,
      hostConfig,
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
    const inspectorFrontendHost = sinon.createStubInstance(Host.InspectorFrontendHost.InspectorFrontendHostStub);
    const projectSettingsModel = sinon.createStubInstance(ProjectSettings.ProjectSettingsModel.ProjectSettingsModel);
    sinon.stub(projectSettingsModel, 'projectSettings').value({workspace: {root, uuid}});

    const manager = AutomaticFileSystemManager.instance({
      forceNew: true,
      hostConfig,
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
    const inspectorFrontendHost = sinon.createStubInstance(Host.InspectorFrontendHost.InspectorFrontendHostStub);
    const projectSettingsModel = sinon.createStubInstance(ProjectSettings.ProjectSettingsModel.ProjectSettingsModel);
    sinon.stub(projectSettingsModel, 'projectSettings').value({workspace: {root, uuid}});
    const manager = AutomaticFileSystemManager.instance({
      forceNew: true,
      hostConfig,
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
    const inspectorFrontendHost = sinon.createStubInstance(Host.InspectorFrontendHost.InspectorFrontendHostStub);
    const projectSettingsModel = sinon.createStubInstance(ProjectSettings.ProjectSettingsModel.ProjectSettingsModel);
    sinon.stub(projectSettingsModel, 'projectSettings').value({workspace: {root, uuid}});
    const manager = AutomaticFileSystemManager.instance({
      forceNew: true,
      hostConfig,
      inspectorFrontendHost,
      projectSettingsModel,
    });
    const [, , , setupCallback] = inspectorFrontendHost.connectAutomaticFileSystem.lastCall.args;
    setupCallback({success: true});
    await manager.once(AUTOMATIC_FILE_SYSTEM_CHANGED);
    const automaticFileSystemPromise = manager.once(AUTOMATIC_FILE_SYSTEM_CHANGED);

    manager.disconnectedAutomaticFileSystem();

    const automaticFileSystem = await automaticFileSystemPromise;
    assert(inspectorFrontendHost.disconnectAutomaticFileSystem.calledOnceWith(root));
    assert.strictEqual(manager.automaticFileSystem, automaticFileSystem);
    assert.deepEqual(manager.automaticFileSystem, {root, uuid, state: 'disconnected'});
  });
});
