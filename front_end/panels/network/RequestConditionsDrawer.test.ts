// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Logs from '../../models/logs/logs.js';
import {assertScreenshot, dispatchClickEvent, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, registerNoopActions, stubNoopSettings} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {describeWithMockConnection, setMockConnectionResponseHandler} from '../../testing/MockConnection.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as PanelUtils from '../utils/utils.js';

import * as Network from './network.js';

const {urlString} = Platform.DevToolsPath;

describeWithMockConnection(`RequestConditionsDrawer with individual request throttling enabled`, () => {
  beforeEach(() => {
    stubNoopSettings();
    setMockConnectionResponseHandler('Debugger.enable', () => ({} as Protocol.Debugger.EnableResponse));
    setMockConnectionResponseHandler('Storage.getStorageKey', () => ({} as Protocol.Storage.GetStorageKeyResponse));
    registerNoopActions([
      'network.add-network-request-blocking-pattern',
      'network.remove-all-network-request-blocking-patterns',
    ]);
    SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true}).requestConditions.conditionsEnabled =
        (true);
    sinon.stub(SDK.NetworkManager.MultitargetNetworkManager.instance().requestConditions, 'applyConditions')
        .returns(false);
  });

  it('shows a placeholder', async () => {
    const requestConditionsDrawer = new Network.RequestConditionsDrawer.RequestConditionsDrawer();
    renderElementIntoDOM(requestConditionsDrawer, {includeCommonStyles: true});
    await requestConditionsDrawer.updateComplete;
    const placeholder = requestConditionsDrawer.contentElement.querySelector('.empty-state');
    assert.exists(placeholder);
    assert.deepEqual(placeholder.querySelector('.empty-state-header')?.textContent, 'Nothing throttled or blocked');
    assert.deepEqual(
        placeholder.querySelector('.empty-state-description > span')?.textContent,
        'To throttle or block a network request, add a rule here manually or via the network panel\'s context menu. Learn more');

    await assertScreenshot('request_conditions/throttling_placeholder.png');
  });

  it('Add pattern button triggers showing the editor view', async () => {
    const requestConditionsDrawer = new Network.RequestConditionsDrawer.RequestConditionsDrawer();
    requestConditionsDrawer.contentElement.style.width = '400px';
    renderElementIntoDOM(requestConditionsDrawer, {includeCommonStyles: true});
    await requestConditionsDrawer.updateComplete;
    const placeholder = requestConditionsDrawer.contentElement.querySelector('.empty-state');

    const button = placeholder?.querySelector('devtools-button');
    assert.exists(button);

    assert.isNull(requestConditionsDrawer.contentElement.querySelector('devtools-prompt'));
    dispatchClickEvent(button);
    await requestConditionsDrawer.updateComplete;
    assert.exists(requestConditionsDrawer.contentElement.querySelector('devtools-prompt'));

    await assertScreenshot('request_conditions/throttling_editor.png');
  });

  describe('affected counts', () => {
    const updatesOnRequestFinishedEvent = (inScope: boolean) => async () => {
      const target = createTarget();
      SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
      const networkManager = target.model(SDK.NetworkManager.NetworkManager);

      SDK.NetworkManager.MultitargetNetworkManager.instance().requestConditions.add(
          SDK.NetworkManager.RequestCondition.createFromSetting({url: '*', enabled: true}));
      const requestConditionsDrawer = new Network.RequestConditionsDrawer.RequestConditionsDrawer();
      renderElementIntoDOM(requestConditionsDrawer, {includeCommonStyles: true});
      await requestConditionsDrawer.updateComplete;
      assert.exists(networkManager);
      const countWidget = requestConditionsDrawer.contentElement
                              .querySelector<UI.Widget.WidgetElement<UI.Widget.Widget>>('.blocked-url-count')
                              ?.getWidget();
      assert.exists(countWidget);
      const updateStub = sinon.spy(countWidget, 'requestUpdate');

      const request = new SDK.NetworkRequest.NetworkRequest(
          '', undefined, urlString`http://example.com`, urlString`http://example.com`, null, null, null);
      request.setBlockedReason(Protocol.Network.BlockedReason.Inspector);

      networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, request);

      assert.strictEqual(updateStub.calledOnce, inScope);
      if (inScope) {
        await countWidget.updateComplete;
        await assertScreenshot(`request_conditions/throttling_blocked-matched.png`);
      } else {
        await assertScreenshot(`request_conditions/throttling_blocked-not-matched.png`);
      }
    };

    it('are updated upon RequestFinished event (when target is in scope)', updatesOnRequestFinishedEvent(true));
    it('are updated upon RequestFinished event (when target is out of scope)', updatesOnRequestFinishedEvent(false));

    // Test is failing on CQ
    it('are updated upon Reset event', async () => {
      const viewFunction = createViewFunctionStub(Network.RequestConditionsDrawer.AffectedCountWidget);
      const widget = new Network.RequestConditionsDrawer.AffectedCountWidget(undefined, viewFunction);
      widget.condition = SDK.NetworkManager.RequestCondition.createFromSetting({url: '*', enabled: true});
      widget.lookUpRequestCount = sinon.stub();
      await viewFunction.nextInput;
      renderElementIntoDOM(widget);

      Logs.NetworkLog.NetworkLog.instance().dispatchEventToListeners(
          Logs.NetworkLog.Events.Reset, {clearIfPreserved: true});
      await viewFunction.nextInput;
    });
  });
});

describeWithMockConnection('RequestConditionsDrawer', () => {
  beforeEach(() => {
    stubNoopSettings();
    registerNoopActions([
      'network.add-network-request-blocking-pattern',
      'network.remove-all-network-request-blocking-patterns',
    ]);
    SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true});
  });

  describe('shows information for upgrading wildcard patterns to URLPatterns', () => {
    it('shows the URLPattern breakdown', async () => {
      const requestConditionsDrawer = new Network.RequestConditionsDrawer.RequestConditionsDrawer();
      renderElementIntoDOM(requestConditionsDrawer, {includeCommonStyles: true});
      const index = 0;
      const condition = SDK.NetworkManager.RequestCondition.createFromSetting({
        urlPattern: 'http://example.com/*bar' as SDK.NetworkManager.URLPatternConstructorString,
        enabled: true,
        conditions: 'NO_THROTTLING' as SDK.NetworkManager.ThrottlingConditionKey,
      });
      SDK.NetworkManager.MultitargetNetworkManager.instance().requestConditions.add(condition);
      await requestConditionsDrawer.updateComplete;

      const item = requestConditionsDrawer.contentElement.querySelectorAll('.blocked-url')[index];
      assert.exists(item);
      assert.notExists(item.querySelector('devtools-icon'));
      const hovered = item.querySelector(`[aria-details=url-pattern-${index}]`);
      assert.exists(hovered);
      assert.strictEqual(hovered.textContent, 'http://example.com/*bar');
      const tooltip = item.querySelector(`devtools-tooltip[id=url-pattern-${index}]`);
      assert.exists(tooltip);
      assert.strictEqual(
          tooltip.textContent,
          'hash: *hostname: example.compassword: *pathname: /*barport: protocol: httpsearch: *username: *Learn more');
    });

    it('shows a warning icon when a pattern was upgraded', async () => {
      const requestConditionsDrawer = new Network.RequestConditionsDrawer.RequestConditionsDrawer();
      renderElementIntoDOM(requestConditionsDrawer, {includeCommonStyles: true});
      const index = 0;
      const condition = SDK.NetworkManager.RequestCondition.createFromSetting({url: 'example.com/*bar', enabled: true});
      SDK.NetworkManager.MultitargetNetworkManager.instance().requestConditions.add(condition);
      await requestConditionsDrawer.updateComplete;

      const item = requestConditionsDrawer.contentElement.querySelectorAll('.blocked-url')[index];
      assert.exists(item);
      const hovered = item.querySelector(`[aria-details=url-pattern-${index}]`);
      assert.exists(hovered);
      assert.strictEqual(hovered.textContent, '*://example.com/*bar*');
      assert.exists(item.querySelector('devtools-icon[name=warning-filled]'));
      const tooltip = item.querySelector(`devtools-tooltip[id=url-pattern-warning-${index}]`);
      assert.exists(tooltip);
      assert.strictEqual(tooltip.textContent, 'This pattern was upgraded from "example.com/*bar"');
    });

    it('shows an error icon when a pattern is invalid', async () => {
      const requestConditionsDrawer = new Network.RequestConditionsDrawer.RequestConditionsDrawer();
      renderElementIntoDOM(requestConditionsDrawer, {includeCommonStyles: true});
      const index = 0;
      const condition = SDK.NetworkManager.RequestCondition.createFromSetting({url: 'ht tp://*', enabled: true});
      SDK.NetworkManager.MultitargetNetworkManager.instance().requestConditions.add(condition);
      await requestConditionsDrawer.updateComplete;

      const item = requestConditionsDrawer.contentElement.querySelectorAll('.blocked-url')[index];
      assert.exists(item);
      assert.isTrue(item.querySelector('input')?.disabled);
      assert.exists(item.querySelector('devtools-icon[name=cross-circle-filled]'));
      const tooltip = item.querySelector(`devtools-tooltip[id=url-pattern-error-${index}]`);
      assert.exists(tooltip);
      assert.strictEqual(tooltip.textContent, 'This pattern failed to parse as a URLPatternLearn more');
    });

    it('shows an error icon when a pattern contains regexp groups', async () => {
      const requestConditionsDrawer = new Network.RequestConditionsDrawer.RequestConditionsDrawer();
      renderElementIntoDOM(requestConditionsDrawer, {includeCommonStyles: true});
      const index = 0;
      const condition = SDK.NetworkManager.RequestCondition.createFromSetting({url: 'http://*/(\\d+)', enabled: true});
      SDK.NetworkManager.MultitargetNetworkManager.instance().requestConditions.add(condition);
      await requestConditionsDrawer.updateComplete;

      const item = requestConditionsDrawer.contentElement.querySelectorAll('.blocked-url')[index];
      assert.exists(item);
      assert.isTrue(item.querySelector('input')?.disabled);
      assert.exists(item.querySelector('devtools-icon[name=cross-circle-filled]'));
      const tooltip = item.querySelector(`devtools-tooltip[id=url-pattern-error-${index}]`);
      assert.exists(tooltip);
      assert.strictEqual(tooltip.textContent, 'RegExp groups are not allowedLearn more');
    });

    it('shows an error message in the editor when the pattern is invalid or has regexp groups', async () => {
      const requestConditionsDrawer = new Network.RequestConditionsDrawer.RequestConditionsDrawer();
      renderElementIntoDOM(requestConditionsDrawer, {includeCommonStyles: true});
      await requestConditionsDrawer.updateComplete;

      requestConditionsDrawer.addPattern();
      await requestConditionsDrawer.updateComplete;

      const prompt = requestConditionsDrawer.contentElement.querySelector('devtools-prompt');
      assert.exists(prompt);

      assert.strictEqual(prompt?.validator?.('http://*/(\\d+)'), 'RegExp groups are not allowed');

      assert.strictEqual(prompt?.validator?.('ht tp://*'), 'This pattern failed to parse as a URLPattern');
    });
  });

  it('can reorder the conditions', async () => {
    const increasePriority =
        sinon.stub(SDK.NetworkManager.MultitargetNetworkManager.instance().requestConditions, 'increasePriority');
    const decreasePriority =
        sinon.stub(SDK.NetworkManager.MultitargetNetworkManager.instance().requestConditions, 'decreasePriority');
    SDK.NetworkManager.MultitargetNetworkManager.instance().requestConditions.conditionsEnabled = true;

    const requestConditionsDrawer = new Network.RequestConditionsDrawer.RequestConditionsDrawer();
    renderElementIntoDOM(requestConditionsDrawer, {includeCommonStyles: true});
    const condition = SDK.NetworkManager.RequestCondition.createFromSetting({url: 'example.com/*bar', enabled: true});
    SDK.NetworkManager.MultitargetNetworkManager.instance().requestConditions.add(condition);
    await requestConditionsDrawer.updateComplete;

    const item = requestConditionsDrawer.contentElement.querySelectorAll('.blocked-url')[0];
    assert.exists(item);

    const [increaseButton, decreaseButton] = item.querySelectorAll('devtools-button');

    increaseButton.click();
    sinon.assert.calledOnceWithExactly(increasePriority, condition);
    sinon.assert.notCalled(decreasePriority);
    decreaseButton.click();
    sinon.assert.calledOnceWithExactly(increasePriority, condition);
    sinon.assert.calledOnceWithExactly(decreasePriority, condition);
  });

  it('highlights conditions', async () => {
    const requestConditionsDrawer = new Network.RequestConditionsDrawer.RequestConditionsDrawer();
    renderElementIntoDOM(requestConditionsDrawer, {includeCommonStyles: true});
    UI.Context.Context.instance().setFlavor(
        Network.RequestConditionsDrawer.RequestConditionsDrawer, requestConditionsDrawer);
    const index = 0;
    const urlPattern = 'http://example.com/*bar' as SDK.NetworkManager.URLPatternConstructorString;
    const conditions = SDK.NetworkManager.RequestCondition.createFromSetting({
      urlPattern,
      enabled: true,
      conditions: 'NO_THROTTLING' as SDK.NetworkManager.ThrottlingConditionKey,
    });
    conditions.ruleIds.add('abc');
    SDK.NetworkManager.MultitargetNetworkManager.instance().requestConditions.add(conditions);
    await requestConditionsDrawer.updateComplete;

    const item = requestConditionsDrawer.contentElement.querySelectorAll('.blocked-url')[index];
    assert.exists(item);
    const viewShown = expectCall(sinon.stub(UI.ViewManager.ViewManager.instance(), 'showView').resolves());
    const highlighted = expectCall(sinon.stub(PanelUtils.PanelUtils, 'highlightElement'));
    void Network.RequestConditionsDrawer.RequestConditionsDrawer.reveal(
        new SDK.NetworkManager.AppliedNetworkConditions(SDK.NetworkManager.NoThrottlingConditions, 'abc', urlPattern));

    assert.deepEqual(['network.blocked-urls'], await viewShown);
    assert.deepEqual([item], await highlighted);
  });
});
