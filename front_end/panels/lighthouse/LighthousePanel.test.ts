// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, it} from 'mocha';
import sinon from 'sinon';

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import type * as LighthouseModel from '../../models/lighthouse/lighthouse.js';
import {raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import type * as LighthouseModule from './lighthouse.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('LighthousePanel', () => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  let Lighthouse: typeof LighthouseModule;
  let target: SDK.Target.Target;
  let prerenderTarget: SDK.Target.Target;
  let resourceTreeModelNavigate: sinon.SinonStub;
  let protocolService: LighthouseModule.LighthouseProtocolService.ProtocolService;
  let controller: LighthouseModule.LighthouseController.LighthouseController;

  const URL = 'http://example.com';
  const LH_REPORT = {
    lhr: {
      finalDisplayedUrl: URL,
      configSettings: {},
      audits: {},
      categories: {_: {auditRefs: [], id: ''}},
      lighthouseVersion: '',
      userAgent: '',
      fetchTime: 0,
      environment: {benchmarkIndex: 0},
      i18n: {rendererFormattedStrings: {}},
    },
  } as unknown as LighthouseModel.ReporterTypes.RunnerResult;

  beforeEach(async () => {
    Lighthouse = await import('./lighthouse.js');
    Lighthouse.LighthouseController.clearSettingsCacheForTest();
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    prerenderTarget = createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    target = createTarget({parentTarget: tabTarget});
    target.setInspectedURL(urlString`${URL}`);
    sinon.stub(target.pageAgent(), 'invoke_getNavigationHistory').resolves({
      currentIndex: 0,
      entries: [{url: URL}],
      getError: () => null,
    } as unknown as Protocol.Page.GetNavigationHistoryResponse);

    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.exists(resourceTreeModel);
    resourceTreeModelNavigate = sinon.stub(resourceTreeModel, 'navigate').resolves();

    protocolService = new Lighthouse.LighthouseProtocolService.ProtocolService();
    sinon.stub(protocolService, 'attach').resolves();
    sinon.stub(protocolService, 'detach').resolves();
    sinon.stub(protocolService, 'collectLighthouseResults').resolves(LH_REPORT);

    controller = new Lighthouse.LighthouseController.LighthouseController(protocolService);
    sinon.stub(controller, 'getFlags').returns({formFactor: 'desktop', mode: 'navigation'});
  });

  it('restores the original URL when done', async () => {
    const instance = Lighthouse.LighthousePanel.LighthousePanel.instance({forceNew: true, protocolService, controller});
    void instance.handleCompleteRun();

    await new Promise<void>(resolve => resourceTreeModelNavigate.withArgs(URL).callsFake(() => {
      resolve();
      return Promise.resolve();
    }));
  });

  it('stores the report in the UI Context when done', async () => {
    const context = UI.Context.Context.instance();
    const instance = Lighthouse.LighthousePanel.LighthousePanel.instance({forceNew: true, protocolService, controller});
    assert.isNull(context.flavor(Lighthouse.LighthousePanel.ActiveLighthouseReport));
    await instance.handleCompleteRun();
    assert.instanceOf(
        context.flavor(Lighthouse.LighthousePanel.ActiveLighthouseReport),
        Lighthouse.LighthousePanel.ActiveLighthouseReport);
  });

  it('linkifies report nodes on render and re-linkifies on primary target load', async () => {
    const linkifyStub =
        sinon.stub(Lighthouse.LighthouseReportRenderer.LighthouseReportRenderer, 'linkifyNodeDetails').resolves();
    const instance = Lighthouse.LighthousePanel.LighthousePanel.instance({forceNew: true, protocolService, controller});
    renderElementIntoDOM(instance);

    await instance.handleCompleteRun();
    await UI.Widget.Widget.allUpdatesComplete;
    sinon.assert.calledOnce(linkifyStub);

    const prerenderResourceTreeModel = prerenderTarget.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.exists(prerenderResourceTreeModel);
    prerenderResourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.Load,
                                                        {resourceTreeModel: prerenderResourceTreeModel, loadTime: 0});
    await raf();
    sinon.assert.calledOnce(linkifyStub);

    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.exists(resourceTreeModel);
    resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.Load, {resourceTreeModel, loadTime: 0});
    await raf();
    sinon.assert.calledTwice(linkifyStub);
    assert.isTrue(linkifyStub.firstCall.args[2]?.aborted);
    instance.detach();
  });

  it('aborts linkification on detach and re-linkifies when shown again', async () => {
    const linkifyStub =
        sinon.stub(Lighthouse.LighthouseReportRenderer.LighthouseReportRenderer, 'linkifyNodeDetails').resolves();
    const instance = Lighthouse.LighthousePanel.LighthousePanel.instance({forceNew: true, protocolService, controller});
    renderElementIntoDOM(instance);

    await instance.handleCompleteRun();
    await UI.Widget.Widget.allUpdatesComplete;
    sinon.assert.calledOnce(linkifyStub);

    instance.detach();
    assert.isTrue(linkifyStub.firstCall.args[2]?.aborted);

    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.exists(resourceTreeModel);
    resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.Load, {resourceTreeModel, loadTime: 0});
    await raf();
    sinon.assert.calledOnce(linkifyStub);

    renderElementIntoDOM(instance);
    await raf();
    sinon.assert.calledTwice(linkifyStub);
    instance.detach();
  });

  it('unlinks report nodes when primary target loads an unrelated URL', async () => {
    const linkifyStub =
        sinon.stub(Lighthouse.LighthouseReportRenderer.LighthouseReportRenderer, 'linkifyNodeDetails').resolves();
    const unlinkSpy = sinon.spy(Lighthouse.LighthouseReportRenderer.LighthouseReportRenderer, 'unlinkNodeDetails');
    const instance = Lighthouse.LighthousePanel.LighthousePanel.instance({forceNew: true, protocolService, controller});
    renderElementIntoDOM(instance);

    await instance.handleCompleteRun();
    await UI.Widget.Widget.allUpdatesComplete;
    sinon.assert.calledOnce(linkifyStub);

    target.setInspectedURL(urlString`http://other.example.com`);
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.exists(resourceTreeModel);
    resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.Load, {resourceTreeModel, loadTime: 0});
    await raf();

    sinon.assert.calledOnce(linkifyStub);
    sinon.assert.calledOnce(unlinkSpy);
    instance.detach();
  });

  it('defers linkifying until shown when report renders while hidden', async () => {
    const linkifyStub =
        sinon.stub(Lighthouse.LighthouseReportRenderer.LighthouseReportRenderer, 'linkifyNodeDetails').resolves();
    const instance = Lighthouse.LighthousePanel.LighthousePanel.instance({forceNew: true, protocolService, controller});

    await instance.handleCompleteRun();
    await UI.Widget.Widget.allUpdatesComplete;
    sinon.assert.notCalled(linkifyStub);

    renderElementIntoDOM(instance);
    await raf();
    sinon.assert.calledOnce(linkifyStub);
    instance.detach();
  });

  it('shows the report widget only once when completing a run', async () => {
    const showSpy = sinon.spy(Lighthouse.LighthouseReportRenderer.LighthouseReportRenderer.prototype, 'show');
    const detachSpy = sinon.spy(Lighthouse.LighthouseReportRenderer.LighthouseReportRenderer.prototype, 'detach');

    const instance = Lighthouse.LighthousePanel.LighthousePanel.instance({forceNew: true, protocolService, controller});
    await instance.handleCompleteRun();
    await UI.Widget.Widget.allUpdatesComplete;

    sinon.assert.calledOnce(showSpy);
    sinon.assert.notCalled(detachSpy);
  });

  it('can receive an external request and trigger a recording', async () => {
    const REPORT_JSON = {} as LighthouseModel.ReporterTypes.ReportJSON;
    sinon.stub(Lighthouse.LighthousePanel.LighthousePanel.prototype, 'handleCompleteRun').callsFake(() => {
      return Promise.resolve({status: 'completed', report: REPORT_JSON});
    });
    const viewManager = UI.ViewManager.ViewManager.instance();
    const showViewStub = sinon.stub(viewManager, 'showView');
    const result = await Lighthouse.LighthousePanel.LighthousePanel.executeLighthouseRecording();
    sinon.assert.calledOnceWithExactly(showViewStub, 'lighthouse');
    assert.deepEqual(result, {status: 'completed', report: REPORT_JSON});
  });

  it('cancels the recording when the abort signal fires during an external request', async () => {
    const instance = Lighthouse.LighthousePanel.LighthousePanel.instance({forceNew: true, protocolService, controller});
    const handleRunCancelSpy = sinon.spy(instance, 'handleRunCancel');
    const abortController = new AbortController();
    sinon.stub(instance, 'handleCompleteRun').callsFake(async () => {
      abortController.abort();
      return {status: 'cancelled'};
    });
    sinon.stub(UI.ViewManager.ViewManager.instance(), 'showView').resolves();

    const result = await Lighthouse.LighthousePanel.LighthousePanel.executeLighthouseRecording(
        undefined, {signal: abortController.signal});

    sinon.assert.calledOnce(handleRunCancelSpy);
    assert.deepEqual(result, {status: 'cancelled'});
  });

  it('returns the report when the run completes', async () => {
    const instance = Lighthouse.LighthousePanel.LighthousePanel.instance({forceNew: true, protocolService, controller});
    const result = await instance.handleCompleteRun();
    assert.deepEqual(result, {status: 'completed', report: LH_REPORT.lhr});
  });

  it('returns a cancelled result when the user cancels the run', async () => {
    (protocolService.collectLighthouseResults as sinon.SinonStub)
        .rejects(new Lighthouse.LighthouseProtocolService.CancelledError());
    const instance = Lighthouse.LighthousePanel.LighthousePanel.instance({forceNew: true, protocolService, controller});
    const result = await instance.handleCompleteRun();
    assert.deepEqual(result, {status: 'cancelled'});
  });

  it('returns a failed result when the run fails to start, and can run again afterwards', async () => {
    const consoleErrorStub = sinon.stub(console, 'error');
    (protocolService.attach as sinon.SinonStub).onFirstCall().rejects(new Error('attach failed'));
    const instance = Lighthouse.LighthousePanel.LighthousePanel.instance({forceNew: true, protocolService, controller});

    const failedResult = await instance.handleCompleteRun();
    assert.deepEqual(failedResult, {status: 'failed'});
    sinon.assert.calledWith(consoleErrorStub, sinon.match({message: 'attach failed'}));

    const secondResult = await instance.handleCompleteRun();
    assert.deepEqual(secondResult, {status: 'completed', report: LH_REPORT.lhr});
  });

  it('can select a specific report', async () => {
    const instance = Lighthouse.LighthousePanel.LighthousePanel.instance({forceNew: true, protocolService, controller});
    await instance.handleCompleteRun();

    const secondReport = {
      ...LH_REPORT.lhr,
      fetchTime: 100,
    } as unknown as LighthouseModel.ReporterTypes.ReportJSON;
    (protocolService.collectLighthouseResults as sinon.SinonStub).resolves({
      lhr: secondReport,
    } as unknown as LighthouseModel.ReporterTypes.RunnerResult);
    await instance.handleCompleteRun();

    const context = UI.Context.Context.instance();
    assert.strictEqual(context.flavor(Lighthouse.LighthousePanel.ActiveLighthouseReport)?.report, secondReport);

    instance.selectReport(LH_REPORT.lhr);
    assert.strictEqual(context.flavor(Lighthouse.LighthousePanel.ActiveLighthouseReport)?.report, LH_REPORT.lhr);
  });

  it('focuses the report topbar URL after the report widget finishes rendering', async () => {
    const instance = Lighthouse.LighthousePanel.LighthousePanel.instance({forceNew: true, protocolService, controller});
    renderElementIntoDOM(instance);

    await instance.handleCompleteRun();
    await UI.Widget.Widget.allUpdatesComplete;

    const topbarUrl = instance.contentElement.querySelector<HTMLElement>('.lh-topbar__url');
    assert.exists(topbarUrl);
    assert.strictEqual(document.activeElement, topbarUrl);
    instance.detach();
  });
});
