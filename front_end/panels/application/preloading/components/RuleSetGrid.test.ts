// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import type * as Protocol from '../../../../generated/protocol.js';
import {createTarget, describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../../../testing/ViewFunctionHelpers.js';
import * as NetworkForward from '../../../network/forward/forward.js';
import * as PreloadingHelper from '../helper/helper.js';

import * as PreloadingComponents from './components.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('RuleSetGrid', () => {
  it('updates view with correct data', async () => {
    const view = createViewFunctionStub(PreloadingComponents.RuleSetGrid.RuleSetGrid);
    const ruleSetGrid = new PreloadingComponents.RuleSetGrid.RuleSetGrid(view);
    const data: PreloadingComponents.RuleSetGrid.RuleSetGridData = {
      rows: [{
        ruleSet: {
          id: 'ruleSetId:0.1' as Protocol.Preload.RuleSetId,
          loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
          sourceText: '{}',
        },
        preloadsStatusSummary: 'Summary',
      }],
      pageURL: urlString`https://example.com/`,
    };

    ruleSetGrid.data = data;
    const input = await view.nextInput;
    assert.deepEqual(input.data, data);
  });

  it('dispatches select event on onSelect', async () => {
    const view = createViewFunctionStub(PreloadingComponents.RuleSetGrid.RuleSetGrid);
    const ruleSetGrid = new PreloadingComponents.RuleSetGrid.RuleSetGrid(view);
    const data: PreloadingComponents.RuleSetGrid.RuleSetGridData = {
      rows: [],
      pageURL: urlString`https://example.com/`,
    };
    ruleSetGrid.data = data;
    const input = await view.nextInput;

    const eventPromise = ruleSetGrid.once(PreloadingComponents.RuleSetGrid.Events.SELECT);

    input.onSelect('ruleSetId:1' as Protocol.Preload.RuleSetId);

    const ruleSetId = await eventPromise;
    assert.strictEqual(ruleSetId, 'ruleSetId:1');
  });

  it('reveals in elements on onRevealInElements', async () => {
    const view = createViewFunctionStub(PreloadingComponents.RuleSetGrid.RuleSetGrid);
    const ruleSetGrid = new PreloadingComponents.RuleSetGrid.RuleSetGrid(view);
    const target = createTarget();
    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
    const revealStub = sinon.stub(Common.Revealer.RevealerRegistry.prototype, 'reveal');

    const data: PreloadingComponents.RuleSetGrid.RuleSetGridData = {
      rows: [],
      pageURL: urlString`https://example.com/`,
    };
    ruleSetGrid.data = data;
    const input = await view.nextInput;

    const ruleSet = {
      id: 'ruleSetId:1' as Protocol.Preload.RuleSetId,
      loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
      sourceText: '{}',
      backendNodeId: 42 as Protocol.DOM.BackendNodeId,
    };
    input.onRevealInElements(ruleSet);

    sinon.assert.calledOnce(revealStub);
    const revealedObject = revealStub.firstCall.args[0];
    assert.instanceOf(revealedObject, SDK.DOMModel.DeferredDOMNode);
    assert.strictEqual((revealedObject as SDK.DOMModel.DeferredDOMNode).backendNodeId(), 42);
  });

  it('reveals in network on onRevealInNetwork', async () => {
    const view = createViewFunctionStub(PreloadingComponents.RuleSetGrid.RuleSetGrid);
    const ruleSetGrid = new PreloadingComponents.RuleSetGrid.RuleSetGrid(view);
    const target = createTarget();
    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    assert.exists(networkManager);
    const request = {requestId: 'requestId:1'} as unknown as SDK.NetworkRequest.NetworkRequest;

    // Explicitly stub the method on the instance to avoid potential issues with prototype stubbing
    const requestForIdStub = sinon.stub();
    requestForIdStub.withArgs('requestId:1').returns(request);
    networkManager!.requestForId = requestForIdStub;

    const revealStub = sinon.stub(Common.Revealer.RevealerRegistry.prototype, 'reveal');

    const data: PreloadingComponents.RuleSetGrid.RuleSetGridData = {
      rows: [],
      pageURL: urlString`https://example.com/`,
    };
    ruleSetGrid.data = data;
    const input = await view.nextInput;

    const ruleSet = {
      id: 'ruleSetId:1' as Protocol.Preload.RuleSetId,
      loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
      sourceText: '{}',
      requestId: 'requestId:1' as Protocol.Network.RequestId,
      url: 'https://example.com/rules.json',
    };
    input.onRevealInNetwork(ruleSet);

    sinon.assert.calledOnce(revealStub);
    const revealedObject = revealStub.firstCall.args[0];
    assert.instanceOf(revealedObject, NetworkForward.UIRequestLocation.UIRequestLocation);
    assert.strictEqual((revealedObject as NetworkForward.UIRequestLocation.UIRequestLocation).request, request);
  });

  it('reveals preloads on onRevealPreloadsAssociatedWithRuleSet', async () => {
    const view = createViewFunctionStub(PreloadingComponents.RuleSetGrid.RuleSetGrid);
    const ruleSetGrid = new PreloadingComponents.RuleSetGrid.RuleSetGrid(view);
    const revealStub = sinon.stub(Common.Revealer.RevealerRegistry.prototype, 'reveal');

    const data: PreloadingComponents.RuleSetGrid.RuleSetGridData = {
      rows: [],
      pageURL: urlString`https://example.com/`,
    };
    ruleSetGrid.data = data;
    const input = await view.nextInput;

    const ruleSet = {
      id: 'ruleSetId:1' as Protocol.Preload.RuleSetId,
      loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
      sourceText: '{}',
    };
    input.onRevealPreloadsAssociatedWithRuleSet(ruleSet);

    sinon.assert.calledOnce(revealStub);
    const revealedObject = revealStub.firstCall.args[0];
    assert.instanceOf(revealedObject, PreloadingHelper.PreloadingForward.AttemptViewWithFilter);
    assert.strictEqual(
        (revealedObject as PreloadingHelper.PreloadingForward.AttemptViewWithFilter).ruleSetId, 'ruleSetId:1');
  });
});
