// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Logs from '../../models/logs/logs.js';
import * as Tracing from '../../services/tracing/tracing.js';
import {
  createTarget,
  describeWithEnvironment,
  updateHostConfig,
} from '../../testing/EnvironmentHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {createNetworkPanelForMockConnection} from '../../testing/NetworkHelpers.js';
import {createNetworkRequest} from '../../testing/NetworkRequestHelpers.js';
import * as RenderCoordinator from '../../ui/components/render_coordinator/render_coordinator.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';

import type * as NetworkForward from './forward/forward.js';
import * as Network from './network.js';

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

    const request = createNetworkRequest({
      requestId: '1',
      url: 'https://example.com',
    });
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

describeWithEnvironment('BackendLinking', () => {
  let setting: Common.Settings.Setting<NetworkForward.BackendLinking.BackendLinkingRule[]>;
  let backendLinking: Network.NetworkPanel.BackendLinking;

  beforeEach(() => {
    updateHostConfig({
      devToolsNetworkBackendLinking: {enabled: true},
    });
    setting = Common.Settings.Settings.instance().createSetting<NetworkForward.BackendLinking.BackendLinkingRule[]>(
        'test-backend-linking-rules', []);
    backendLinking = new Network.NetworkPanel.BackendLinking(setting);
  });

  describe('rule parsing', () => {
    it('parses valid rules and extracts placeholders', () => {
      setting.set([
        {
          urlPattern: 'https://example.com/api/*',
          targetUrlTemplate: 'https://trace.example.com/trace/${traceId}/${spanId}',
          label: 'Trace Link',
        },
      ]);
      assert.lengthOf(backendLinking.rules, 1);
      const rule = backendLinking.rules[0];
      assert.strictEqual(rule.label, 'Trace Link');
      assert.strictEqual(rule.template, 'https://trace.example.com/trace/${traceId}/${spanId}');
      assert.deepEqual(rule.placeholders, ['${traceId}', '${spanId}']);
      assert.isTrue(rule.urlPattern.test('https://example.com/api/test'));
      assert.isFalse(rule.urlPattern.test('https://example.com/other'));
    });

    it('ignores rules with invalid URL patterns', () => {
      setting.set([
        {
          urlPattern: ':::invalid-pattern[',
          targetUrlTemplate: 'https://trace.example.com/trace/${traceId}',
          label: 'Invalid Pattern Rule',
        },
        {
          urlPattern: 'https://example.com/api/*',
          targetUrlTemplate: 'https://trace.example.com/trace/${traceId}',
          label: 'Valid Rule',
        },
      ]);
      assert.lengthOf(backendLinking.rules, 1);
      assert.strictEqual(backendLinking.rules[0].label, 'Valid Rule');
    });

    it('ignores rules without any recognized placeholders in targetUrlTemplate', () => {
      setting.set([
        {
          urlPattern: 'https://example.com/api/*',
          targetUrlTemplate: 'https://trace.example.com/no-placeholders',
          label: 'Static Link',
        },
      ]);
      assert.lengthOf(backendLinking.rules, 0);
    });

    it('updates rules dynamically when setting changes', () => {
      setting.set([
        {
          urlPattern: 'https://example.com/v1/*',
          targetUrlTemplate: 'https://dashboard.example.com/v1?id=${requestId}',
          label: 'V1 Dashboard',
        },
      ]);
      assert.lengthOf(backendLinking.rules, 1);
      assert.strictEqual(backendLinking.rules[0].label, 'V1 Dashboard');

      setting.set([
        {
          urlPattern: 'https://example.com/v2/*',
          targetUrlTemplate: 'https://dashboard.example.com/v2?id=${requestId}',
          label: 'V2 Dashboard',
        },
      ]);
      assert.lengthOf(backendLinking.rules, 1);
      assert.strictEqual(backendLinking.rules[0].label, 'V2 Dashboard');
      assert.isTrue(backendLinking.rules[0].urlPattern.test('https://example.com/v2/foo'));
      assert.isFalse(backendLinking.rules[0].urlPattern.test('https://example.com/v1/foo'));
    });
  });

  describe('link construction', () => {
    it('respects rule precedence when multiple rules match', () => {
      setting.set([
        {
          urlPattern: 'https://example.com/api/*',
          targetUrlTemplate: 'https://first.example.com/${requestId}',
          label: 'First Rule',
        },
        {
          urlPattern: 'https://example.com/api/*',
          targetUrlTemplate: 'https://second.example.com/${requestId}',
          label: 'Second Rule',
        },
      ]);
      const request = createNetworkRequest(
          {url: 'https://example.com/api/test', responseHeaders: [{name: 'X-Request-ID', value: 'abc'}]});
      const link = backendLinking.getLink(request);
      assert.exists(link);
      assert.strictEqual(link.label, 'First Rule');
      assert.strictEqual(link.url.toString(), 'https://first.example.com/abc');
    });

    it('matches requests by URL pattern and returns null for non-matching URLs', () => {
      setting.set([
        {
          urlPattern: 'https://example.com/api/v1/*',
          targetUrlTemplate: 'https://trace.example.com/${requestId}',
          label: 'API V1',
        },
      ]);
      const matchingRequest = createNetworkRequest(
          {url: 'https://example.com/api/v1/users', responseHeaders: [{name: 'X-Request-ID', value: '1'}]});
      const nonMatchingRequest = createNetworkRequest(
          {url: 'https://example.com/api/v2/users', responseHeaders: [{name: 'X-Request-ID', value: '1'}]});

      assert.exists(backendLinking.getLink(matchingRequest));
      assert.isNull(backendLinking.getLink(nonMatchingRequest));
    });

    describe('placeholder matching', () => {
      it('skips rule when required placeholders are missing from the request', () => {
        setting.set([
          {
            urlPattern: 'https://example.com/*',
            targetUrlTemplate: 'https://trace.example.com/${traceId}/${spanId}',
            label: 'Trace and Span',
          },
          {
            urlPattern: 'https://example.com/*',
            targetUrlTemplate: 'https://trace.example.com/fallback/${traceId}',
            label: 'Trace Fallback',
          },
        ]);
        const request = createNetworkRequest(
            {url: 'https://example.com/api', responseHeaders: [{name: 'trace-id', value: 'trace-abc'}]});
        const link = backendLinking.getLink(request);
        assert.exists(link);
        assert.strictEqual(link.label, 'Trace Fallback');
        assert.strictEqual(link.url.toString(), 'https://trace.example.com/fallback/trace-abc');
      });

      it('extracts devtoolsDebugId from Server-Timing header', () => {
        setting.set([
          {
            urlPattern: 'https://example.com/*',
            targetUrlTemplate: 'https://debug.example.com/session/${devtoolsDebugId}',
            label: 'Debug Session',
          },
        ]);
        const request = createNetworkRequest({
          url: 'https://example.com/test',
          responseHeaders: [{name: 'Server-Timing', value: 'devtools-debug-id;desc="session-42"'}],
        });
        const link = backendLinking.getLink(request);
        assert.exists(link);
        assert.strictEqual(link.url.toString(), 'https://debug.example.com/session/session-42');
      });

      it('extracts traceId and spanId from Server-Timing traceparent', () => {
        setting.set([
          {
            urlPattern: 'https://example.com/*',
            targetUrlTemplate: 'https://trace.example.com/${traceId}/${spanId}',
            label: 'APM Trace',
          },
        ]);
        const request = createNetworkRequest({
          url: 'https://example.com/test',
          responseHeaders: [{name: 'Server-Timing', value: 'traceparent;desc="00-abcabcabc-defdefdef-01"'}],
        });
        const link = backendLinking.getLink(request);
        assert.exists(link);
        assert.strictEqual(link.url.toString(), 'https://trace.example.com/abcabcabc/defdefdef');
      });

      it('extracts traceId and spanId from traceparent response header', () => {
        setting.set([
          {
            urlPattern: 'https://example.com/*',
            targetUrlTemplate: 'https://trace.example.com/${traceId}/${spanId}',
            label: 'APM Trace',
          },
        ]);
        const request = createNetworkRequest({
          url: 'https://example.com/test',
          responseHeaders: [{name: 'traceparent', value: '00-abcabcabc-defdefdef-01'}],
        });
        const link = backendLinking.getLink(request);
        assert.exists(link);
        assert.strictEqual(link.url.toString(), 'https://trace.example.com/abcabcabc/defdefdef');
      });

      it('extracts traceId from trace-id response header as fallback', () => {
        setting.set([
          {
            urlPattern: 'https://example.com/*',
            targetUrlTemplate: 'https://trace.example.com/${traceId}',
            label: 'Trace Link',
          },
        ]);
        const request = createNetworkRequest({
          url: 'https://example.com/test',
          responseHeaders: [{name: 'trace-id', value: 'trace-xyz'}],
        });
        const link = backendLinking.getLink(request);
        assert.exists(link);
        assert.strictEqual(link.url.toString(), 'https://trace.example.com/trace-xyz');
      });

      it('extracts requestId from X-Request-ID or Request-ID response headers', () => {
        setting.set([
          {
            urlPattern: 'https://example.com/*',
            targetUrlTemplate: 'https://dash.example.com/?req=${requestId}',
            label: 'Dashboard',
          },
        ]);
        const request1 = createNetworkRequest(
            {url: 'https://example.com/test', responseHeaders: [{name: 'X-Request-ID', value: 'x-req-123'}]});
        const link1 = backendLinking.getLink(request1);
        assert.exists(link1);
        assert.strictEqual(link1.url.toString(), 'https://dash.example.com/?req=x-req-123');

        const request2 = createNetworkRequest(
            {url: 'https://example.com/test', responseHeaders: [{name: 'Request-ID', value: 'req-456'}]});
        const link2 = backendLinking.getLink(request2);
        assert.exists(link2);
        assert.strictEqual(link2.url.toString(), 'https://dash.example.com/?req=req-456');
      });

      it('extracts correlationId from X-Correlation-ID or Correlation-ID response headers', () => {
        setting.set([
          {
            urlPattern: 'https://example.com/*',
            targetUrlTemplate: 'https://dash.example.com/?cor=${correlationId}',
            label: 'Dashboard',
          },
        ]);
        const request1 = createNetworkRequest(
            {url: 'https://example.com/test', responseHeaders: [{name: 'X-Correlation-ID', value: 'x-cor-123'}]});
        const link1 = backendLinking.getLink(request1);
        assert.exists(link1);
        assert.strictEqual(link1.url.toString(), 'https://dash.example.com/?cor=x-cor-123');

        const request2 = createNetworkRequest(
            {url: 'https://example.com/test', responseHeaders: [{name: 'Correlation-ID', value: 'cor-456'}]});
        const link2 = backendLinking.getLink(request2);
        assert.exists(link2);
        assert.strictEqual(link2.url.toString(), 'https://dash.example.com/?cor=cor-456');
      });
    });

    describe('placeholder sanitization and URL encoding', () => {
      it('URL-encodes header values to prevent path traversal', () => {
        setting.set([
          {
            urlPattern: 'https://example.com/*',
            targetUrlTemplate: 'https://trace.example.com/api/trace/${traceId}',
            label: 'Trace Link',
          },
        ]);
        const request = createNetworkRequest({
          url: 'https://example.com/test',
          responseHeaders: [{name: 'trace-id', value: '../delete'}],
        });
        const link = backendLinking.getLink(request);
        assert.exists(link);
        assert.strictEqual(link.url.pathname, '/api/trace/..%2Fdelete');
      });

      it('URL-encodes header values to prevent query parameter injection', () => {
        setting.set([
          {
            urlPattern: 'https://example.com/*',
            targetUrlTemplate: 'https://dash.example.com/?req=${requestId}',
            label: 'Dashboard',
          },
        ]);
        const request = createNetworkRequest({
          url: 'https://example.com/test',
          responseHeaders: [{name: 'X-Request-ID', value: '123&action=delete'}],
        });
        const link = backendLinking.getLink(request);
        assert.exists(link);
        assert.strictEqual(link.url.search, '?req=123%26action%3Ddelete');
        assert.strictEqual(link.url.searchParams.get('req'), '123&action=delete');
        assert.isFalse(link.url.searchParams.has('action'));
      });

      it('URL-encodes delimiter characters to prevent fragment or query breakout', () => {
        setting.set([
          {
            urlPattern: 'https://example.com/*',
            targetUrlTemplate: 'https://dash.example.com/trace/${traceId}?view=full',
            label: 'Trace Link',
          },
        ]);
        const request = createNetworkRequest({
          url: 'https://example.com/test',
          responseHeaders: [{name: 'trace-id', value: 'id#secret?injected=true'}],
        });
        const link = backendLinking.getLink(request);
        assert.exists(link);
        assert.strictEqual(link.url.pathname, '/trace/id%23secret%3Finjected%3Dtrue');
        assert.strictEqual(link.url.search, '?view=full');
        assert.strictEqual(link.url.hash, '');
      });

      it('URL-encodes multiple occurrences of the same placeholder', () => {
        setting.set([
          {
            urlPattern: 'https://example.com/*',
            targetUrlTemplate: 'https://trace.example.com/api/${traceId}?id=${traceId}',
            label: 'Trace Link',
          },
        ]);
        const request = createNetworkRequest({
          url: 'https://example.com/test',
          responseHeaders: [{name: 'trace-id', value: 'a/b'}],
        });
        const link = backendLinking.getLink(request);
        assert.exists(link);
        assert.strictEqual(link.url.pathname, '/api/a%2Fb');
        assert.strictEqual(link.url.search, '?id=a%2Fb');
      });

      it('handles dollar signs in placeholder values correctly without replacement pattern expansion', () => {
        setting.set([
          {
            urlPattern: 'https://example.com/*',
            targetUrlTemplate: 'https://dash.example.com/?req=${requestId}',
            label: 'Dashboard',
          },
        ]);
        const request = createNetworkRequest({
          url: 'https://example.com/test',
          responseHeaders: [{name: 'X-Request-ID', value: '$1$$$\''}],
        });
        const link = backendLinking.getLink(request);
        assert.exists(link);
        assert.strictEqual(link.url.searchParams.get('req'), '$1$$$\'');
      });
    });

    it('substitutes multiple placeholders in targetUrlTemplate', () => {
      setting.set([
        {
          urlPattern: 'https://example.com/*',
          targetUrlTemplate:
              'https://observability.example.com/trace/${traceId}?span=${spanId}&req=${requestId}&cor=${correlationId}',
          label: 'Full Observability',
        },
      ]);
      const request = createNetworkRequest({
        url: 'https://example.com/api',
        responseHeaders: [
          {name: 'traceparent', value: '00-abcabcabc-defdefdef-01'},
          {name: 'X-Request-ID', value: 'req-999'},
          {name: 'X-Correlation-ID', value: 'cor-888'},
        ],
      });
      const link = backendLinking.getLink(request);
      assert.exists(link);
      assert.strictEqual(link.url.toString(),
                         'https://observability.example.com/trace/abcabcabc?span=defdefdef&req=req-999&cor=cor-888');
    });
  });
});
