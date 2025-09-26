// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Logs from '../../models/logs/logs.js';
import {assertScreenshot, dispatchClickEvent, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, registerNoopActions} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection, setMockConnectionResponseHandler} from '../../testing/MockConnection.js';

import * as Network from './network.js';

const {urlString} = Platform.DevToolsPath;

describeWithMockConnection('BlockedURLsPane', () => {
  beforeEach(() => {
    setMockConnectionResponseHandler('Debugger.enable', () => ({}));
    setMockConnectionResponseHandler('Storage.getStorageKeyForFrame', () => ({}));
    registerNoopActions([
      'network.add-network-request-blocking-pattern',
      'network.remove-all-network-request-blocking-patterns',
    ]);
  });

  it('shows a placeholder', async () => {
    const blockedURLsPane = new Network.BlockedURLsPane.BlockedURLsPane();
    renderElementIntoDOM(blockedURLsPane);
    const blockedElement = blockedURLsPane.contentElement.querySelector('.blocked-urls');
    const placeholder = blockedElement?.shadowRoot?.querySelector('.empty-state');
    assert.exists(placeholder);
    assert.deepEqual(placeholder.querySelector('.empty-state-header')?.textContent, 'No blocked network requests');
    assert.deepEqual(
        placeholder.querySelector('.empty-state-description > span')?.textContent,
        'Add a pattern to block network requests by clicking on the \"Add pattern\" button.');

    await assertScreenshot('request_conditions/placeholder.png');
  });

  it('Add pattern button triggers showing the editor view', async () => {
    const blockedURLsPane = new Network.BlockedURLsPane.BlockedURLsPane();
    renderElementIntoDOM(blockedURLsPane);
    const blockedElement = blockedURLsPane.contentElement.querySelector('.blocked-urls');
    const list = blockedElement?.shadowRoot?.querySelector('.list');
    const placeholder = list?.querySelector('.empty-state');

    const button = placeholder?.querySelector('devtools-button');
    assert.exists(button);

    assert.isNull(list?.querySelector('.editor-content'));
    dispatchClickEvent(button);
    assert.exists(list?.querySelector('.editor-content'));

    await assertScreenshot('request_conditions/editor.png');
  });

  describe('update', () => {
    const updatesOnRequestFinishedEvent = (inScope: boolean) => async () => {
      const target = createTarget();
      SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
      const networkManager = target.model(SDK.NetworkManager.NetworkManager);
      sinon.stub(SDK.NetworkManager.MultitargetNetworkManager.instance(), 'blockedPatterns').returns([
        {url: '*', enabled: true}
      ]);
      const blockedURLsPane = new Network.BlockedURLsPane.BlockedURLsPane();
      renderElementIntoDOM(blockedURLsPane);
      assert.exists(networkManager);
      const updateStub = sinon.spy(blockedURLsPane, 'update');

      const request = sinon.createStubInstance(SDK.NetworkRequest.NetworkRequest, {
        wasBlocked: true,
        url: urlString`http://example.com`,
      });
      networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, request);

      assert.strictEqual(updateStub.calledOnce, inScope);
      if (inScope) {
        await assertScreenshot(`request_conditions/blocked-matched.png`);
      } else {
        await assertScreenshot(`request_conditions/blocked-not-matched.png`);
      }
    };

    it('is called upon RequestFinished event (when target is in scope)', updatesOnRequestFinishedEvent(true));
    it('is called upon RequestFinished event (when target is out of scope)', updatesOnRequestFinishedEvent(false));

    it('is called upon Reset event', () => {
      const blockedURLsPane = new Network.BlockedURLsPane.BlockedURLsPane();
      const updateStub = sinon.stub(blockedURLsPane, 'update');

      Logs.NetworkLog.NetworkLog.instance().dispatchEventToListeners(
          Logs.NetworkLog.Events.Reset, {clearIfPreserved: true});

      sinon.assert.calledOnce(updateStub);
    });
  });
});
