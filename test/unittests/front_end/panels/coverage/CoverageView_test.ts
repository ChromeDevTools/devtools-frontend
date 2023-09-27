// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Bindings from '../../../../../front_end/models/bindings/bindings.js';
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';
import * as Coverage from '../../../../../front_end/panels/coverage/coverage.js';
import {createTarget, registerNoopActions} from '../../helpers/EnvironmentHelpers.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as Coordinator from '../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const isShowingLandingPage = (view: Coverage.CoverageView.CoverageView) => {
  return Boolean(view.contentElement.querySelector('.landing-page'));
};

const isShowingResults = (view: Coverage.CoverageView.CoverageView) => {
  return Boolean(view.contentElement.querySelector('.coverage-results .vbox.flex-auto'));
};

const isShowingPrerenderPage = (view: Coverage.CoverageView.CoverageView) => {
  return Boolean(view.contentElement.querySelector('.prerender-page'));
};

const isShowingBfcachePage = (view: Coverage.CoverageView.CoverageView) => {
  return Boolean(view.contentElement.querySelector('.bfcache-page'));
};

const setupTargetAndModels = () => {
  const target = createTarget();

  const workspace = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
  const targetManager = SDK.TargetManager.TargetManager.instance();
  const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
  const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
    forceNew: true,
    resourceMapping,
    targetManager,
  });
  Bindings.IgnoreListManager.IgnoreListManager.instance({forceNew: true, debuggerWorkspaceBinding});
  Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance({forceNew: true, resourceMapping, targetManager});

  const coverageModel = target.model(Coverage.CoverageModel.CoverageModel);
  assertNotNullOrUndefined(coverageModel);
  const startSpy = sinon.spy(coverageModel, 'start');
  const stopSpy = sinon.spy(coverageModel, 'stop');

  const cssModel = target.model(SDK.CSSModel.CSSModel);
  assertNotNullOrUndefined(cssModel);
  sinon.stub(cssModel.agent, 'invoke_startRuleUsageTracking').resolves({
    getError: () => undefined,
  });
  sinon.stub(cssModel.agent, 'invoke_takeCoverageDelta').resolves({
    coverage: [],
    getError: () => undefined,
    timestamp: 0,
  });
  sinon.stub(cssModel.agent, 'invoke_stopRuleUsageTracking').resolves({
    getError: () => undefined,
    ruleUsage: [],
  });

  const profilerAgent = target.profilerAgent();
  sinon.stub(profilerAgent, 'invoke_startPreciseCoverage').resolves({
    timestamp: 0,
    getError: () => undefined,
  });
  sinon.stub(profilerAgent, 'invoke_stopPreciseCoverage').resolves({
    getError: () => undefined,
  });
  sinon.stub(profilerAgent, 'invoke_takePreciseCoverage').resolves({
    result: [],
    getError: () => undefined,
    timestamp: 0,
  });

  const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
  assertNotNullOrUndefined(resourceTreeModel);

  return {startSpy, stopSpy, resourceTreeModel};
};

describeWithMockConnection('CoverageView', () => {
  beforeEach(() => {
    registerNoopActions(['coverage.toggle-recording', 'coverage.reload', 'coverage.start-with-reload']);
  });

  it('can handle back/forward cache navigations', async () => {
    const {startSpy, stopSpy, resourceTreeModel} = setupTargetAndModels();
    const view = Coverage.CoverageView.CoverageView.instance();
    view.markAsRoot();
    view.show(document.body);
    assert.isTrue(isShowingLandingPage(view));
    assert.isFalse(isShowingResults(view));
    assert.isFalse(isShowingPrerenderPage(view));
    assert.isFalse(isShowingBfcachePage(view));
    assert.isTrue(startSpy.notCalled);

    await view.startRecording({reload: false, jsCoveragePerBlock: false});
    await coordinator.done();
    assert.isFalse(isShowingLandingPage(view));
    assert.isTrue(isShowingResults(view));
    assert.isFalse(isShowingPrerenderPage(view));
    assert.isFalse(isShowingBfcachePage(view));
    assert.isTrue(startSpy.calledOnce);

    let frame = {
      url: 'http://www.example.com/',
      displayName: () => 'frameName',
      parentFrame: () => null,
      resourceTreeModel: () => resourceTreeModel,
      backForwardCacheDetails: {restoredFromCache: true},
      id: 'myFrameId',
      childFrames: [],
    } as unknown as SDK.ResourceTreeModel.ResourceTreeFrame;
    resourceTreeModel.dispatchEventToListeners(
        SDK.ResourceTreeModel.Events.PrimaryPageChanged,
        {frame, type: SDK.ResourceTreeModel.PrimaryPageChangeType.Navigation});
    assert.isFalse(isShowingLandingPage(view));
    assert.isFalse(isShowingResults(view));
    assert.isFalse(isShowingPrerenderPage(view));
    assert.isTrue(isShowingBfcachePage(view));
    assert.isTrue(startSpy.calledOnce);
    assert.isTrue(stopSpy.notCalled);

    frame = {
      ...frame,
      url: 'http://www.example.com/page',
      backForwardCacheDetails: {restoredFromCache: false},
    } as unknown as SDK.ResourceTreeModel.ResourceTreeFrame;
    resourceTreeModel.dispatchEventToListeners(
        SDK.ResourceTreeModel.Events.PrimaryPageChanged,
        {frame, type: SDK.ResourceTreeModel.PrimaryPageChangeType.Navigation});
    assert.isFalse(isShowingLandingPage(view));
    assert.isTrue(isShowingResults(view));
    assert.isFalse(isShowingPrerenderPage(view));
    assert.isFalse(isShowingBfcachePage(view));
    assert.isTrue(startSpy.calledOnce);
    assert.isTrue(stopSpy.notCalled);

    await view.stopRecording();
    view.willHide();
    view.wasShown();
    view.detach();
    Coverage.CoverageView.CoverageView.removeInstance();
  });

  it('can handle prerender activations', async () => {
    const {startSpy, stopSpy} = setupTargetAndModels();
    const view = Coverage.CoverageView.CoverageView.instance();
    view.markAsRoot();
    view.show(document.body);
    assert.isTrue(isShowingLandingPage(view));
    assert.isFalse(isShowingResults(view));
    assert.isFalse(isShowingPrerenderPage(view));
    assert.isFalse(isShowingBfcachePage(view));
    assert.isTrue(startSpy.notCalled);

    await view.startRecording({reload: false, jsCoveragePerBlock: false});
    await coordinator.done({waitForWork: true});
    assert.isFalse(isShowingLandingPage(view));
    assert.isTrue(isShowingResults(view));
    assert.isFalse(isShowingPrerenderPage(view));
    assert.isFalse(isShowingBfcachePage(view));
    assert.isTrue(startSpy.calledOnce);

    // Create 2nd target for the prerendered frame.
    const {startSpy: startSpy2, stopSpy: stopSpy2, resourceTreeModel} = setupTargetAndModels();
    let frame = {
      url: 'http://www.example.com/',
      displayName: () => 'frameName',
      parentFrame: () => null,
      resourceTreeModel: () => resourceTreeModel,
      backForwardCacheDetails: {restoredFromCache: false},
      id: 'myFrameId',
      childFrames: [],
    } as unknown as SDK.ResourceTreeModel.ResourceTreeFrame;
    resourceTreeModel.dispatchEventToListeners(
        SDK.ResourceTreeModel.Events.PrimaryPageChanged,
        {frame, type: SDK.ResourceTreeModel.PrimaryPageChangeType.Activation});
    await coordinator.done({waitForWork: true});
    assert.isFalse(isShowingLandingPage(view));
    assert.isFalse(isShowingResults(view));
    assert.isTrue(isShowingPrerenderPage(view));
    assert.isFalse(isShowingBfcachePage(view));
    assert.isTrue(startSpy.calledOnce);
    assert.isTrue(stopSpy.calledOnce);
    assert.isTrue(startSpy2.calledOnce);
    assert.isTrue(stopSpy2.notCalled);

    frame = {
      ...frame,
      url: 'http://www.example.com/page',
    } as unknown as SDK.ResourceTreeModel.ResourceTreeFrame;
    resourceTreeModel.dispatchEventToListeners(
        SDK.ResourceTreeModel.Events.PrimaryPageChanged,
        {frame, type: SDK.ResourceTreeModel.PrimaryPageChangeType.Navigation});
    assert.isFalse(isShowingLandingPage(view));
    assert.isTrue(isShowingResults(view));
    assert.isFalse(isShowingPrerenderPage(view));
    assert.isFalse(isShowingBfcachePage(view));
    assert.isTrue(startSpy.calledOnce);
    assert.isTrue(stopSpy.calledOnce);
    assert.isTrue(startSpy2.calledOnce);
    assert.isTrue(stopSpy2.notCalled);

    await view.stopRecording();
    view.willHide();
    view.wasShown();
    view.detach();
    Coverage.CoverageView.CoverageView.removeInstance();
  });
});
