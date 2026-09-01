// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Logs from '../../models/logs/logs.js';
import * as Tracing from '../../services/tracing/tracing.js';
import {
  createTarget,
  describeWithEnvironment,
} from '../../testing/EnvironmentHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {createNetworkPanelForMockConnection} from '../../testing/NetworkHelpers.js';
import * as RenderCoordinator from '../../ui/components/render_coordinator/render_coordinator.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';

import type * as Network from './network.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('NetworkPanel', () => {
  let target: SDK.Target.Target;
  let networkPanel: Network.NetworkPanel.NetworkPanel;

  beforeEach(async () => {
    const connection = new MockCDPConnection();
    connection.setSuccessHandler('Tracing.start', () => ({}));
    connection.setSuccessHandler('Tracing.end', () => ({}));
    target = createTarget({connection});
    networkPanel = await createNetworkPanelForMockConnection();
  });

  afterEach(async () => {
    await RenderCoordinator.done();
    networkPanel.detach();
  });

  const tracingTests = (inScope: boolean) => () => {
    it('starts recording on page reload', async () => {
      SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
      Common.Settings.Settings.instance().moduleSetting('network-record-film-strip-setting').set(true);
      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      assert.exists(resourceTreeModel);
      const tracingManager = target.model(Tracing.TracingManager.TracingManager);
      assert.exists(tracingManager);
      const tracingStart = sinon.spy(tracingManager, 'start');
      resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.WillReloadPage);
      assert.strictEqual(tracingStart.called, inScope);
    });

    it('stops recording on page load', async () => {
      SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
      Common.Settings.Settings.instance().moduleSetting('network-record-film-strip-setting').set(true);
      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      assert.exists(resourceTreeModel);
      const tracingManager = target.model(Tracing.TracingManager.TracingManager);
      assert.exists(tracingManager);
      resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.WillReloadPage);
      SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);

      const tracingStop = sinon.spy(tracingManager, 'stop');
      resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.Load, {resourceTreeModel, loadTime: 42});
      await new Promise(resolve => setTimeout(resolve, 0));
      assert.strictEqual(tracingStop.called, inScope);
    });
  };

  describe('in scope', tracingTests(true));
  describe('out of scpe', tracingTests(false));

  it('filters network log when a film strip frame is selected', async () => {
    Common.Settings.Settings.instance().moduleSetting('network-record-film-strip-setting').set(true);
    const filmStripElement = networkPanel.element.querySelector('.network-film-strip');
    assert.instanceOf(filmStripElement, HTMLElement);
    const filmStripView = UI.Widget.Widget.get(filmStripElement) as PerfUI.FilmStripView.FilmStripView;
    assert.exists(filmStripView);

    const request = SDK.NetworkRequest.NetworkRequest.create(
        '1' as Protocol.Network.RequestId,
        urlString`https://example.com`,
        urlString``,
        null,
        null,
        null,
    );
    request.setIssueTime(0, 0);
    request.endTime = 10;
    Logs.NetworkLog.NetworkLog.instance().dispatchEventToListeners(Logs.NetworkLog.Events.RequestUpdated, {request});

    const setWindowSpy = sinon.spy(networkPanel.networkLogView, 'setWindow');
    filmStripView.dispatchEventToListeners(PerfUI.FilmStripView.Events.FRAME_SELECTED, 5000);

    sinon.assert.calledOnce(setWindowSpy);
    sinon.assert.calledWith(setWindowSpy, 0, 5);
  });

  it('clears network log on button click', async () => {
    const networkLogResetSpy = sinon.spy(Logs.NetworkLog.NetworkLog.instance(), 'reset');
    const button = networkPanel.element.querySelector('[aria-label="Clear network log"]');
    assert.instanceOf(button, HTMLElement);
    button.click();
    await RenderCoordinator.done({waitForWork: true});
    sinon.assert.called(networkLogResetSpy);
  });
});
