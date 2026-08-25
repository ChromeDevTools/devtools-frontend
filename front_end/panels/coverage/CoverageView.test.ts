// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as TextUtils from '../../core/text_utils/text_utils.js';
import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment, registerNoopActions} from '../../testing/EnvironmentHelpers.js';
import {activate, getMainFrame, navigate} from '../../testing/ResourceTreeHelpers.js';
import * as RenderCoordinator from '../../ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Coverage from './coverage.js';

const {urlString} = Platform.DevToolsPath;

const isShowingLandingPage = (view: Coverage.CoverageView.CoverageView) => {
  return Boolean(view.contentElement.querySelector('devtools-widget')?.shadowRoot?.querySelector('.empty-state'));
};

const isShowingResults = (view: Coverage.CoverageView.CoverageView) => {
  return Boolean(view.contentElement.querySelector('.coverage-results .results'));
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
  const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
  Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
    forceNew: true,
    resourceMapping,
    targetManager,
    ignoreListManager,
    workspace,
  });
  Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance({forceNew: true, resourceMapping, targetManager});

  const coverageModel = target.model(Coverage.CoverageModel.CoverageModel);
  assert.exists(coverageModel);
  const startSpy = sinon.spy(coverageModel, 'start');
  const stopSpy = sinon.spy(coverageModel, 'stop');

  const cssModel = target.model(SDK.CSSModel.CSSModel);
  assert.exists(cssModel);
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

  return {startSpy, stopSpy, target};
};

describeWithEnvironment('CoverageView', () => {
  beforeEach(() => {
    registerNoopActions([
      'coverage.clear',
      'coverage.export',
      'coverage.start-with-reload',
      'coverage.toggle-recording',
      'inspector-main.reload',
    ]);
  });

  afterEach(() => {
    Coverage.CoverageView.CoverageView.removeInstance();
  });

  it('dispatches a record/reload action when the button is clicked', async () => {
    const view = Coverage.CoverageView.CoverageView.instance();
    renderElementIntoDOM(view);
    await view.updateComplete;
    assert.isTrue(isShowingLandingPage(view));

    const button = view.contentElement.querySelector('devtools-widget devtools-button');
    assert.exists(button);

    const toggleSpy =
        sinon.spy(UI.ActionRegistry.ActionRegistry.instance().getAction('coverage.toggle-recording'), 'execute');
    const reloadSpy =
        sinon.spy(UI.ActionRegistry.ActionRegistry.instance().getAction('coverage.start-with-reload'), 'execute');

    (button as HTMLElement).onclick?.(new PointerEvent('click'));
    assert.isTrue(toggleSpy.calledOnce || reloadSpy.calledOnce);
  });

  it('can handle back/forward cache navigations', async () => {
    const {startSpy, stopSpy, target} = setupTargetAndModels();
    const view = Coverage.CoverageView.CoverageView.instance();
    renderElementIntoDOM(view);
    await view.updateComplete;
    assert.isTrue(isShowingLandingPage(view));
    assert.isFalse(isShowingResults(view));
    assert.isFalse(isShowingPrerenderPage(view));
    assert.isFalse(isShowingBfcachePage(view));
    sinon.assert.notCalled(startSpy);

    await view.startRecording({reload: false, jsCoveragePerBlock: false});
    await RenderCoordinator.done();
    assert.isFalse(isShowingLandingPage(view));
    assert.isTrue(isShowingResults(view));
    assert.isFalse(isShowingPrerenderPage(view));
    assert.isFalse(isShowingBfcachePage(view));
    sinon.assert.calledOnce(startSpy);

    navigate(getMainFrame(target), {}, Protocol.Page.NavigationType.BackForwardCacheRestore);
    await view.updateComplete;

    assert.isFalse(isShowingLandingPage(view));
    assert.isFalse(isShowingResults(view));
    assert.isFalse(isShowingPrerenderPage(view));
    assert.isTrue(isShowingBfcachePage(view));
    sinon.assert.calledOnce(startSpy);
    sinon.assert.notCalled(stopSpy);

    navigate(getMainFrame(target));
    await view.updateComplete;
    assert.isFalse(isShowingLandingPage(view));
    assert.isTrue(isShowingResults(view));
    assert.isFalse(isShowingPrerenderPage(view));
    assert.isFalse(isShowingBfcachePage(view));
    sinon.assert.calledOnce(startSpy);
    sinon.assert.notCalled(stopSpy);

    await view.stopRecording();
    view.willHide();
    view.wasShown();
    view.detach();
    Coverage.CoverageView.CoverageView.removeInstance();
  });

  it('can handle prerender activations', async () => {
    const {startSpy, stopSpy} = setupTargetAndModels();
    const view = Coverage.CoverageView.CoverageView.instance();
    await view.updateComplete;
    renderElementIntoDOM(view);
    assert.isTrue(isShowingLandingPage(view));
    assert.isFalse(isShowingResults(view));
    assert.isFalse(isShowingPrerenderPage(view));
    assert.isFalse(isShowingBfcachePage(view));
    sinon.assert.notCalled(startSpy);

    await view.startRecording({reload: false, jsCoveragePerBlock: false});
    await RenderCoordinator.done({waitForWork: true});
    assert.isFalse(isShowingLandingPage(view));
    assert.isTrue(isShowingResults(view));
    assert.isFalse(isShowingPrerenderPage(view));
    assert.isFalse(isShowingBfcachePage(view));
    sinon.assert.calledOnce(startSpy);

    // Create 2nd target for the prerendered frame.
    const {startSpy: startSpy2, stopSpy: stopSpy2, target: target2} = setupTargetAndModels();
    activate(target2);
    await RenderCoordinator.done({waitForWork: true});
    assert.isFalse(isShowingLandingPage(view));
    assert.isFalse(isShowingResults(view));
    assert.isTrue(isShowingPrerenderPage(view));
    assert.isFalse(isShowingBfcachePage(view));
    sinon.assert.calledOnce(startSpy);
    sinon.assert.calledOnce(stopSpy);
    sinon.assert.calledOnce(startSpy2);
    sinon.assert.notCalled(stopSpy2);

    navigate(getMainFrame(target2), {url: 'http://www.example.com/page'});
    await view.updateComplete;
    assert.isFalse(isShowingLandingPage(view));
    assert.isTrue(isShowingResults(view));
    assert.isFalse(isShowingPrerenderPage(view));
    assert.isFalse(isShowingBfcachePage(view));
    sinon.assert.calledOnce(startSpy);
    sinon.assert.calledOnce(stopSpy);
    sinon.assert.calledOnce(startSpy2);
    sinon.assert.notCalled(stopSpy2);

    await view.stopRecording();
    view.willHide();
    view.wasShown();
    view.detach();
    Coverage.CoverageView.CoverageView.removeInstance();
  });

  it('properly applies filter to coverage list view', async () => {
    const {target} = setupTargetAndModels();
    const coverageModel = target.model(Coverage.CoverageModel.CoverageModel);
    assert.exists(coverageModel);

    const jsUrl = urlString`http://example.com/devtools/coverage/resources/coverage.js`;
    const cssUrl = urlString`http://example.com/devtools/coverage/resources/highlight-in-source.css`;
    const htmlUrl = urlString`http://example.com/devtools/coverage/resources/basic-coverage.html`;

    const jsCoverage = new Coverage.CoverageModel.URLCoverageInfo(jsUrl);
    jsCoverage.ensureEntry(null as unknown as TextUtils.ContentProvider.ContentProvider, 568, 0, 0,
                           Coverage.CoverageModel.CoverageType.JAVA_SCRIPT_PER_FUNCTION);
    jsCoverage.addToSizes(411, 0);

    const cssCoverage = new Coverage.CoverageModel.URLCoverageInfo(cssUrl);
    cssCoverage.ensureEntry(null as unknown as TextUtils.ContentProvider.ContentProvider, 209, 0, 0,
                            Coverage.CoverageModel.CoverageType.CSS);
    cssCoverage.addToSizes(67, 0);

    const htmlCoverage = new Coverage.CoverageModel.URLCoverageInfo(htmlUrl);
    htmlCoverage.ensureEntry(null as unknown as TextUtils.ContentProvider.ContentProvider, 51, 0, 0,
                             Coverage.CoverageModel.CoverageType.JAVA_SCRIPT_PER_FUNCTION);
    htmlCoverage.addToSizes(51, 0);

    sinon.stub(coverageModel, 'entries').returns([jsCoverage, cssCoverage, htmlCoverage]);

    const view = Coverage.CoverageView.CoverageView.instance();
    renderElementIntoDOM(view);
    await view.startRecording({reload: false, jsCoveragePerBlock: false});
    coverageModel.dispatchEventToListeners(Coverage.CoverageModel.Events.CoverageUpdated, []);
    await view.updateComplete;

    const resultsWidget = view.contentElement.querySelector('.results');
    assert.exists(resultsWidget);
    const coverageListView =
        UI.Widget.Widget.get(resultsWidget as HTMLElement) as Coverage.CoverageListView.CoverageListView;
    assert.exists(coverageListView);

    const filterInput = view.contentElement.querySelector('devtools-toolbar-input');
    assert.exists(filterInput);

    const setFilter = async (text: string) => {
      filterInput.dispatchEvent(new CustomEvent('change', {detail: text}));
      await view.updateComplete;
    };

    const getItemDetails = (item: Coverage.CoverageListView.CoverageListItem) => ({
      url: item.url,
      size: item.size,
      usedSize: item.usedSize,
      unusedSize: item.unusedSize,
    });

    await setFilter('devtools');
    assert.deepEqual(coverageListView.coverageInfo.map(getItemDetails), [
      {url: jsUrl, size: 568, usedSize: 411, unusedSize: 157},
      {url: cssUrl, size: 209, usedSize: 67, unusedSize: 142},
      {url: htmlUrl, size: 51, usedSize: 51, unusedSize: 0},
    ]);

    await setFilter('CES/COV');
    assert.deepEqual(coverageListView.coverageInfo.map(getItemDetails), [
      {url: jsUrl, size: 568, usedSize: 411, unusedSize: 157},
    ]);

    await setFilter('no pasaran');
    assert.deepEqual(coverageListView.coverageInfo.map(getItemDetails), []);

    await setFilter('');
    assert.deepEqual(coverageListView.coverageInfo.map(getItemDetails), [
      {url: jsUrl, size: 568, usedSize: 411, unusedSize: 157},
      {url: cssUrl, size: 209, usedSize: 67, unusedSize: 142},
      {url: htmlUrl, size: 51, usedSize: 51, unusedSize: 0},
    ]);

    await view.stopRecording();
    view.willHide();
    view.wasShown();
    view.detach();
    Coverage.CoverageView.CoverageView.removeInstance();
  });

  it('migrates coverage-repeated-per-function legacy test', async () => {
    const {target} = setupTargetAndModels();
    const coverageModel = target.model(Coverage.CoverageModel.CoverageModel);
    assert.exists(coverageModel);
    const cssModel = target.model(SDK.CSSModel.CSSModel);
    assert.exists(cssModel);
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assert.exists(debuggerModel);

    const jsUrl = urlString`http://example.com/devtools/coverage/resources/coverage.js`;
    const cssUrl = urlString`http://example.com/devtools/coverage/resources/highlight-in-source.css`;

    const jsScriptId = '1' as Protocol.Runtime.ScriptId;
    const cssStyleSheetId = '2' as Protocol.DOM.StyleSheetId;

    const mockScript = {
      scriptId: jsScriptId,
      sourceURL: jsUrl,
      contentLength: 568,
      lineOffset: 0,
      columnOffset: 0,
      isContentScript: () => false,
      contentURL: () => jsUrl,
    } as unknown as SDK.Script.Script;

    const mockHeader = {
      styleSheetId: cssStyleSheetId,
      resourceURL: cssUrl,
      contentLength: 209,
      startLine: 0,
      startColumn: 0,
      contentURL: () => cssUrl,
    } as unknown as SDK.CSSStyleSheetHeader.CSSStyleSheetHeader;

    sinon.stub(debuggerModel, 'scriptForId').withArgs(jsScriptId).returns(mockScript);
    sinon.stub(cssModel, 'styleSheetHeaderForId').withArgs(cssStyleSheetId).returns(mockHeader);
    sinon.stub(cssModel, 'getAllStyleSheetHeaders').returns([mockHeader]);

    const takeCoverageDeltaStub = cssModel.agent.invoke_takeCoverageDelta as sinon.SinonStub;
    const profilerAgent = target.profilerAgent();
    const takePreciseCoverageStub = profilerAgent.invoke_takePreciseCoverage as sinon.SinonStub;

    const jsCoverageData1: Protocol.Profiler.ScriptCoverage = {
      scriptId: jsScriptId,
      url: jsUrl,
      functions: [{
        functionName: 'performActions',
        ranges: [{startOffset: 0, endOffset: 411, count: 1}],
        isBlockCoverage: false,
      }],
    };

    const cssCoverageData1: Protocol.CSS.RuleUsage = {
      styleSheetId: cssStyleSheetId,
      startOffset: 0,
      endOffset: 67,
      used: true,
    };

    // In Session 1, both JS and CSS have coverage.
    takePreciseCoverageStub.resolves({
      result: [jsCoverageData1],
      timestamp: 100,
      getError: () => undefined,
    });
    takeCoverageDeltaStub.resolves({
      coverage: [cssCoverageData1],
      timestamp: 100,
      getError: () => undefined,
    });

    const view = Coverage.CoverageView.CoverageView.instance();
    renderElementIntoDOM(view);

    const getItemDetails = (item: Coverage.CoverageListView.CoverageListItem) => ({
      url: item.url,
      size: item.size,
      usedSize: item.usedSize,
      unusedSize: item.unusedSize,
    });

    // Record and verify Session 1.
    await view.startRecording({reload: false, jsCoveragePerBlock: false});
    await view.stopRecording();
    await RenderCoordinator.done();

    const resultsWidget1 = view.contentElement.querySelector('.results');
    assert.exists(resultsWidget1);
    const coverageListView1 =
        UI.Widget.Widget.get(resultsWidget1 as HTMLElement) as Coverage.CoverageListView.CoverageListView;
    assert.exists(coverageListView1);

    const sortByUrl = (a: {url: string}, b: {url: string}) => a.url.localeCompare(b.url);

    const actual1 = coverageListView1.coverageInfo.map(getItemDetails).sort(sortByUrl);
    const expected1 = [
      {url: jsUrl, size: 568, usedSize: 411, unusedSize: 157},
      {url: cssUrl, size: 209, usedSize: 67, unusedSize: 142},
    ].sort(sortByUrl);
    assert.deepEqual(actual1, expected1);

    // Set up Session 2: JS coverage is now empty, CSS remains the same.
    takePreciseCoverageStub.resolves({
      result: [],
      timestamp: 200,
      getError: () => undefined,
    });
    takeCoverageDeltaStub.resolves({
      coverage: [cssCoverageData1],
      timestamp: 200,
      getError: () => undefined,
    });

    await view.startRecording({reload: false, jsCoveragePerBlock: false});
    await view.stopRecording();
    await RenderCoordinator.done();

    const resultsWidget2 = view.contentElement.querySelector('.results');
    assert.exists(resultsWidget2);
    const coverageListView2 =
        UI.Widget.Widget.get(resultsWidget2 as HTMLElement) as Coverage.CoverageListView.CoverageListView;
    assert.exists(coverageListView2);

    // JS coverage should still be present because it was not reset.
    const actual2 = coverageListView2.coverageInfo.map(getItemDetails).sort(sortByUrl);
    const expected2 = [
      {url: jsUrl, size: 568, usedSize: 411, unusedSize: 157},
      {url: cssUrl, size: 209, usedSize: 67, unusedSize: 142},
    ].sort(sortByUrl);
    assert.deepEqual(actual2, expected2);

    // Clear the coverage and record Session 3.
    view.clear();
    await RenderCoordinator.done();

    await view.startRecording({reload: false, jsCoveragePerBlock: false});
    await view.stopRecording();
    await RenderCoordinator.done();

    const resultsWidget3 = view.contentElement.querySelector('.results');
    assert.exists(resultsWidget3);
    const coverageListView3 =
        UI.Widget.Widget.get(resultsWidget3 as HTMLElement) as Coverage.CoverageListView.CoverageListView;
    assert.exists(coverageListView3);

    // JS coverage should be gone, only CSS coverage remains.
    const actual3 = coverageListView3.coverageInfo.map(getItemDetails).sort(sortByUrl);
    const expected3 = [
      {url: cssUrl, size: 209, usedSize: 67, unusedSize: 142},
    ].sort(sortByUrl);
    assert.deepEqual(actual3, expected3);

    view.detach();
    Coverage.CoverageView.CoverageView.removeInstance();
  });
});
