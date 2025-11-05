// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Logs from '../../models/logs/logs.js';
import {assertScreenshot, dispatchClickEvent, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, registerNoopActions, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {describeWithMockConnection, setMockConnectionResponseHandler} from '../../testing/MockConnection.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as PanelUtils from '../utils/utils.js';

import * as Network from './network.js';

const {urlString} = Platform.DevToolsPath;

for (const individualThrottlingEnabled of [false, true]) {
  describeWithMockConnection(
      `RequestConditionsDrawer${individualThrottlingEnabled ? ' with individual request throttling enabled' : ''}`,
      () => {
        beforeEach(() => {
          updateHostConfig({devToolsIndividualRequestThrottling: {enabled: individualThrottlingEnabled}});
          setMockConnectionResponseHandler('Debugger.enable', () => ({} as Protocol.Debugger.EnableResponse));
          setMockConnectionResponseHandler(
              'Storage.getStorageKey', () => ({} as Protocol.Storage.GetStorageKeyResponse));
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
          renderElementIntoDOM(requestConditionsDrawer);
          await requestConditionsDrawer.updateComplete;
          const blockedElement = requestConditionsDrawer.contentElement.querySelector('.blocked-urls');
          const placeholder = blockedElement?.shadowRoot?.querySelector('.empty-state');
          assert.exists(placeholder);
          assert.deepEqual(
              placeholder.querySelector('.empty-state-header')?.textContent,
              individualThrottlingEnabled ? 'No request throttling or blocking patterns' :
                                            'No blocked network requests');
          assert.deepEqual(
              placeholder.querySelector('.empty-state-description > span')?.textContent,
              'Add a pattern by clicking on the \"Add pattern\" button.');

          if (individualThrottlingEnabled) {
            await assertScreenshot('request_conditions/throttling_placeholder.png');
          } else {
            await assertScreenshot('request_conditions/placeholder.png');
          }
        });

        it('Add pattern button triggers showing the editor view', async () => {
          const requestConditionsDrawer = new Network.RequestConditionsDrawer.RequestConditionsDrawer();
          renderElementIntoDOM(requestConditionsDrawer);
          await requestConditionsDrawer.updateComplete;
          const blockedElement = requestConditionsDrawer.contentElement.querySelector('.blocked-urls');
          const list = blockedElement?.shadowRoot?.querySelector('.list');
          const placeholder = list?.querySelector('.empty-state');

          const button = placeholder?.querySelector('devtools-button');
          assert.exists(button);

          assert.isNull(list?.querySelector('.editor-content'));
          dispatchClickEvent(button);
          await requestConditionsDrawer.updateComplete;
          assert.exists(list?.querySelector('.editor-content'));

          if (individualThrottlingEnabled) {
            await assertScreenshot('request_conditions/throttling_editor.png');
          } else {
            await assertScreenshot('request_conditions/editor.png');
          }
        });

        describe('update', () => {
          const updatesOnRequestFinishedEvent = (inScope: boolean) => async () => {
            const target = createTarget();
            SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
            const networkManager = target.model(SDK.NetworkManager.NetworkManager);

            SDK.NetworkManager.MultitargetNetworkManager.instance().requestConditions.add(
                SDK.NetworkManager.RequestCondition.createFromSetting({url: '*', enabled: true}));
            const requestConditionsDrawer = new Network.RequestConditionsDrawer.RequestConditionsDrawer();
            renderElementIntoDOM(requestConditionsDrawer);
            await requestConditionsDrawer.updateComplete;
            assert.exists(networkManager);
            const updateStub = sinon.spy(requestConditionsDrawer, 'requestUpdate');

            const request = new SDK.NetworkRequest.NetworkRequest(
                '', undefined, urlString`http://example.com`, urlString`http://example.com`, null, null, null);
            request.setBlockedReason(Protocol.Network.BlockedReason.Inspector);

            networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, request);

            assert.strictEqual(updateStub.calledOnce, inScope);
            if (inScope) {
              await requestConditionsDrawer.updateComplete;
              if (individualThrottlingEnabled) {
                await assertScreenshot(`request_conditions/throttling_blocked-matched.png`);
              } else {
                await assertScreenshot(`request_conditions/blocked-matched.png`);
              }
            } else if (individualThrottlingEnabled) {
              await assertScreenshot(`request_conditions/throttling_blocked-not-matched.png`);
            } else {
              await assertScreenshot(`request_conditions/blocked-not-matched.png`);
            }
          };

          it('is called upon RequestFinished event (when target is in scope)', updatesOnRequestFinishedEvent(true));
          it('is called upon RequestFinished event (when target is out of scope)',
             updatesOnRequestFinishedEvent(false));

          it('is called upon Reset event', async () => {
            const viewFunction = createViewFunctionStub(Network.RequestConditionsDrawer.RequestConditionsDrawer);
            new Network.RequestConditionsDrawer.RequestConditionsDrawer(undefined, viewFunction);
            await viewFunction.nextInput;

            Logs.NetworkLog.NetworkLog.instance().dispatchEventToListeners(
                Logs.NetworkLog.Events.Reset, {clearIfPreserved: true});
            await viewFunction.nextInput;
          });
        });
      });
}

describeWithMockConnection('RequestConditionsDrawer', () => {
  beforeEach(() => {
    SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true});
    updateHostConfig({devToolsIndividualRequestThrottling: {enabled: true}});
  });

  describe('shows information for upgrading wildcard patterns to URLPatterns', () => {
    it('shows the URLPattern breakdown', () => {
      const requestConditionsDrawer = new Network.RequestConditionsDrawer.RequestConditionsDrawer();
      const index = 0;
      const item = requestConditionsDrawer.renderItem(
          SDK.NetworkManager.RequestCondition.createFromSetting({
            urlPattern: 'http://example.com/*bar' as SDK.NetworkManager.URLPatternConstructorString,
            enabled: true,
            conditions: 'NO_THROTTLING' as SDK.NetworkManager.ThrottlingConditionKey,
          }),
          /* editable=*/ true, index);
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

    it('shows a warning icon when a pattern was upgraded', () => {
      const requestConditionsDrawer = new Network.RequestConditionsDrawer.RequestConditionsDrawer();
      const index = 1;
      const item = requestConditionsDrawer.renderItem(
          SDK.NetworkManager.RequestCondition.createFromSetting({url: 'example.com/*bar', enabled: true}),
          /* editable=*/ true, index);
      const hovered = item.querySelector(`[aria-details=url-pattern-${index}]`);
      assert.exists(hovered);
      assert.strictEqual(hovered.textContent, '*://example.com/*bar*');
      assert.exists(item.querySelector('devtools-icon[name=warning-filled]'));
      const tooltip = item.querySelector(`devtools-tooltip[id=url-pattern-warning-${index}]`);
      assert.exists(tooltip);
      assert.strictEqual(tooltip.textContent, 'This pattern was upgraded from "example.com/*bar"');
    });

    it('shows an error icon when a pattern is invalid', () => {
      const requestConditionsDrawer = new Network.RequestConditionsDrawer.RequestConditionsDrawer();
      const index = 3;
      const item = requestConditionsDrawer.renderItem(
          SDK.NetworkManager.RequestCondition.createFromSetting({url: 'ht tp://*', enabled: true}),
          /* editable=*/ true, index);
      assert.isTrue(item.querySelector('input')?.disabled);
      assert.exists(item.querySelector('devtools-icon[name=cross-circle-filled]'));
      const tooltip = item.querySelector(`devtools-tooltip[id=url-pattern-error-${index}]`);
      assert.exists(tooltip);
      assert.strictEqual(tooltip.textContent, 'This pattern failed to parse as a URLPatternLearn more');
    });

    it('shows an error icon when a pattern contains regexp groups', () => {
      const requestConditionsDrawer = new Network.RequestConditionsDrawer.RequestConditionsDrawer();
      const index = 0;
      const item = requestConditionsDrawer.renderItem(
          SDK.NetworkManager.RequestCondition.createFromSetting({url: 'http://*/(\\d+)', enabled: true}),
          /* editable=*/ true, index);
      assert.isTrue(item.querySelector('input')?.disabled);
      assert.exists(item.querySelector('devtools-icon[name=cross-circle-filled]'));
      const tooltip = item.querySelector(`devtools-tooltip[id=url-pattern-error-${index}]`);
      assert.exists(tooltip);
      assert.strictEqual(tooltip.textContent, 'RegExp groups are not allowedLearn more');
    });

    it('shows an error message in the editor when the pattern is invalid or has regexp groups', () => {
      const requestConditionsDrawer = new Network.RequestConditionsDrawer.RequestConditionsDrawer();

      const regexpPatternEditor = requestConditionsDrawer.beginEdit(
          SDK.NetworkManager.RequestCondition.createFromSetting({url: 'http://*/(\\d+)', enabled: true}));
      regexpPatternEditor.requestValidation();
      assert.strictEqual(
          regexpPatternEditor.element.querySelector('.list-widget-input-validation-error')?.textContent,
          'RegExp groups are not allowed');

      const invalidPatternEditor = requestConditionsDrawer.beginEdit(
          SDK.NetworkManager.RequestCondition.createFromSetting({url: 'ht tp://*', enabled: true}));
      invalidPatternEditor.requestValidation();
      assert.strictEqual(
          invalidPatternEditor.element.querySelector('.list-widget-input-validation-error')?.textContent,
          'This pattern failed to parse as a URLPattern');
    });
  });

  it('can reorder the conditions', async () => {
    const increasePriority =
        sinon.stub(SDK.NetworkManager.MultitargetNetworkManager.instance().requestConditions, 'increasePriority');
    const decreasePriority =
        sinon.stub(SDK.NetworkManager.MultitargetNetworkManager.instance().requestConditions, 'decreasePriority');
    SDK.NetworkManager.MultitargetNetworkManager.instance().requestConditions.conditionsEnabled = true;

    const requestConditionsDrawer =
        new Network.RequestConditionsDrawer.RequestConditionsDrawer(undefined, sinon.stub());
    const condition = SDK.NetworkManager.RequestCondition.createFromSetting({url: 'example.com/*bar', enabled: true});
    const item = requestConditionsDrawer.renderItem(condition, /* editable=*/ true, 0);

    const [decreaseButton, increaseButton] = item.querySelectorAll('devtools-button');

    increaseButton.click();
    sinon.assert.calledOnceWithExactly(increasePriority, condition);
    sinon.assert.notCalled(decreasePriority);
    decreaseButton.click();
    sinon.assert.calledOnceWithExactly(increasePriority, condition);
    sinon.assert.calledOnceWithExactly(decreasePriority, condition);
  });

  it('highlights conditions', async () => {
    const requestConditionsDrawer = new Network.RequestConditionsDrawer.RequestConditionsDrawer();
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
    const item = requestConditionsDrawer.renderItem(conditions, /* editable=*/ true, index);
    const viewShown = expectCall(sinon.stub(UI.ViewManager.ViewManager.instance(), 'showView').resolves());
    const highlighted = expectCall(sinon.stub(PanelUtils.PanelUtils, 'highlightElement'));
    void Network.RequestConditionsDrawer.RequestConditionsDrawer.reveal(
        new SDK.NetworkManager.AppliedNetworkConditions(SDK.NetworkManager.NoThrottlingConditions, 'abc', urlPattern));

    assert.deepEqual(['network.blocked-urls'], await viewShown);
    assert.deepEqual([item], await highlighted);
  });
});
