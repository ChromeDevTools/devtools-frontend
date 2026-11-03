// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {it} from 'mocha';
import sinon from 'sinon';

import type * as Protocol from '../../generated/protocol.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as WebAudio from './web_audio.js';

describeWithEnvironment('WebAudioModel', () => {
  it('defers enabling while suspended and enables on resume', async () => {
    const target = createTarget();
    sinon.stub(target, 'suspended').returns(true);
    const agent = target.webAudioAgent();
    const enable = sinon.stub(agent, 'invoke_enable').resolves({getError: () => undefined});
    const model = target.model(WebAudio.WebAudioModel.WebAudioModel);
    assert.exists(model);

    model.ensureEnabled();
    model.ensureEnabled();
    sinon.assert.notCalled(enable);
    await model.resumeModel();
    sinon.assert.calledOnce(enable);
    model.ensureEnabled();
    sinon.assert.calledOnce(enable);
  });

  it('does not enable an unused model on resume', async () => {
    const target = createTarget();
    const enable = sinon.stub(target.webAudioAgent(), 'invoke_enable').resolves({getError: () => undefined});
    const model = target.model(WebAudio.WebAudioModel.WebAudioModel);
    assert.exists(model);
    await model.resumeModel();
    sinon.assert.notCalled(enable);
  });

  it('disables notifications and realtime data requests until resumed', async () => {
    const target = createTarget();
    const agent = target.webAudioAgent();
    const enable = sinon.stub(agent, 'invoke_enable').resolves({getError: () => undefined});
    const disable = sinon.stub(agent, 'invoke_disable').resolves({getError: () => undefined});
    const realtimeData: Protocol.WebAudio.ContextRealtimeData = {
      currentTime: 1,
      renderCapacity: 0.5,
      callbackIntervalMean: 0.01,
      callbackIntervalVariance: 0,
    };
    const request = sinon.stub(agent, 'invoke_getRealtimeData').resolves({realtimeData, getError: () => undefined});
    const model = target.model(WebAudio.WebAudioModel.WebAudioModel);
    assert.exists(model);
    const listener = sinon.spy();
    model.addEventListener(WebAudio.WebAudioModel.Events.MODEL_SUSPEND, listener);
    const reset = sinon.spy();
    model.addEventListener(WebAudio.WebAudioModel.Events.MODEL_RESET, reset);
    model.ensureEnabled();
    const contextId = 'context' as Protocol.WebAudio.GraphObjectId;
    assert.deepEqual(await model.requestRealtimeData(contextId), realtimeData);

    await model.suspendModel();
    sinon.assert.calledOnce(disable);
    sinon.assert.calledOnce(listener);
    sinon.assert.calledOnce(reset);
    assert.isNull(await model.requestRealtimeData(contextId));
    sinon.assert.calledOnce(request);

    await model.resumeModel();
    sinon.assert.calledTwice(enable);
    assert.deepEqual(await model.requestRealtimeData(contextId), realtimeData);
    sinon.assert.calledTwice(request);
  });

  it('discards realtime data returned after suspension starts', async () => {
    const target = createTarget();
    const agent = target.webAudioAgent();
    sinon.stub(agent, 'invoke_disable').resolves({getError: () => undefined});
    const response = Promise.withResolvers<Protocol.WebAudio.GetRealtimeDataResponse>();
    sinon.stub(agent, 'invoke_getRealtimeData').returns(response.promise);
    const model = target.model(WebAudio.WebAudioModel.WebAudioModel);
    assert.exists(model);
    const pendingData = model.requestRealtimeData('context' as Protocol.WebAudio.GraphObjectId);
    await model.suspendModel();
    response.resolve({
      realtimeData: {currentTime: 1, renderCapacity: 0.5, callbackIntervalMean: 0.01, callbackIntervalVariance: 0},
      getError: () => undefined,
    });
    assert.isNull(await pendingData);
  });
});
