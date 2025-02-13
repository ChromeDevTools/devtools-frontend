// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';

import * as ProjectSettings from './project_settings.js';

const {urlString} = Platform.DevToolsPath;

describe('ProjectSettingsModel', () => {
  const {ProjectSettingsModel} = ProjectSettings.ProjectSettingsModel;

  afterEach(() => {
    ProjectSettingsModel.removeInstance();
  });

  it('yields an empty configuration initially', () => {
    const hostConfig = {devToolsWellKnown: {enabled: true}};
    const pageResourceLoader = sinon.createStubInstance(SDK.PageResourceLoader.PageResourceLoader);
    const targetManager = sinon.createStubInstance(SDK.TargetManager.TargetManager);

    const projectSettingsModel = ProjectSettingsModel.instance({
      forceNew: true,
      hostConfig,
      pageResourceLoader,
      targetManager,
    });

    assert.deepEqual(projectSettingsModel.projectSettings, {});
  });

  it('yields an empty configuration if `devToolsWellKnown` is disabled', () => {
    const hostConfig = {devToolsWellKnown: {enabled: false}};
    const pageResourceLoader = sinon.createStubInstance(SDK.PageResourceLoader.PageResourceLoader);
    const targetManager = sinon.createStubInstance(SDK.TargetManager.TargetManager);

    const projectSettingsModel = ProjectSettingsModel.instance({
      forceNew: true,
      hostConfig,
      pageResourceLoader,
      targetManager,
    });

    assert.deepEqual(projectSettingsModel.projectSettings, {});
  });

  it('doesn\'t load the devtools.json from non-local origins', async () => {
    const hostConfig = {devToolsWellKnown: {enabled: true}};
    const pageResourceLoader = sinon.createStubInstance(SDK.PageResourceLoader.PageResourceLoader);
    const targetManager = sinon.createStubInstance(SDK.TargetManager.TargetManager);

    const target = sinon.createStubInstance(SDK.Target.Target);
    targetManager.primaryPageTarget.returns(target);

    const resourceTreeModel = sinon.createStubInstance(SDK.ResourceTreeModel.ResourceTreeModel);
    target.model.withArgs(SDK.ResourceTreeModel.ResourceTreeModel).returns(resourceTreeModel);

    const frame = sinon.createStubInstance(SDK.ResourceTreeModel.ResourceTreeFrame);
    resourceTreeModel.mainFrame = frame;
    sinon.stub(frame, 'securityOriginDetails').get(() => ({isLocalhost: false}));

    const projectSettingsModel = ProjectSettingsModel.instance({
      forceNew: true,
      hostConfig,
      pageResourceLoader,
      targetManager,
    });

    const projectSettings = await projectSettingsModel.projectSettingsPromise;
    assert.deepEqual(projectSettings, {});
  });

  it('correctly loads the devtools.json from local origins', async () => {
    const hostConfig = {devToolsWellKnown: {enabled: true}};
    const pageResourceLoader = sinon.createStubInstance(SDK.PageResourceLoader.PageResourceLoader);
    const targetManager = sinon.createStubInstance(SDK.TargetManager.TargetManager);

    const target = sinon.createStubInstance(SDK.Target.Target);
    targetManager.primaryPageTarget.returns(target);

    const resourceTreeModel = sinon.createStubInstance(SDK.ResourceTreeModel.ResourceTreeModel);
    target.model.withArgs(SDK.ResourceTreeModel.ResourceTreeModel).returns(resourceTreeModel);

    const url = urlString`http://localhost:8090/.well-known/appspecific/com.chrome.devtools.json`;
    const frameId = 'frame1';
    const initiatorUrl = urlString`http://localhost:8090/foo`;
    const frame = sinon.createStubInstance(SDK.ResourceTreeModel.ResourceTreeFrame);
    resourceTreeModel.mainFrame = frame;
    sinon.stub(frame, 'securityOriginDetails').get(() => ({isLocalhost: true}));
    sinon.stub(frame, 'url').get(() => initiatorUrl);
    sinon.stub(frame, 'id').get(() => frameId);

    pageResourceLoader.loadResource.withArgs(url, sinon.match({target, frameId, initiatorUrl}))
        .returns(Promise.resolve({content: '{"workspace":{"root":"/home/foo","uuid":"foo"}}'}));

    const projectSettingsModel = ProjectSettingsModel.instance({
      forceNew: true,
      hostConfig,
      pageResourceLoader,
      targetManager,
    });

    const projectSettings = await projectSettingsModel.projectSettingsPromise;
    assert.deepEqual(projectSettings, {workspace: {root: '/home/foo', uuid: 'foo'}});
  });

  it('listens for navigations', () => {
    const hostConfig = {devToolsWellKnown: {enabled: true}};
    const pageResourceLoader = sinon.createStubInstance(SDK.PageResourceLoader.PageResourceLoader);
    const targetManager = sinon.createStubInstance(SDK.TargetManager.TargetManager);

    ProjectSettingsModel.instance({
      forceNew: true,
      hostConfig,
      pageResourceLoader,
      targetManager,
    });

    assert.isTrue(targetManager.addEventListener.calledOnceWith(SDK.TargetManager.Events.INSPECTED_URL_CHANGED));
  });

  it('doesn\'t listen for navigations if `devToolsWellKnown` is disabled', () => {
    const hostConfig = {devToolsWellKnown: {enabled: false}};
    const pageResourceLoader = sinon.createStubInstance(SDK.PageResourceLoader.PageResourceLoader);
    const targetManager = sinon.createStubInstance(SDK.TargetManager.TargetManager);

    ProjectSettingsModel.instance({
      forceNew: true,
      hostConfig,
      pageResourceLoader,
      targetManager,
    });

    assert.isTrue(targetManager.addEventListener.notCalled);
  });
});
