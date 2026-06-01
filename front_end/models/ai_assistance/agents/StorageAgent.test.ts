// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as SDK from '../../../core/sdk/sdk.js';
import {mockAidaClient} from '../../../testing/AiAssistanceHelpers.js';
import {createTarget} from '../../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../../testing/MockConnection.js';
import * as AiAssistance from '../ai_assistance.js';

describeWithMockConnection('StorageAgent', function() {
  beforeEach(() => {
    const target = createTarget();
    const domStorageModel = target.model(SDK.DOMStorageModel.DOMStorageModel);
    assert.exists(domStorageModel);

    const mockStorage = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(mockStorage, 'storageKey').get(() => 'https://example.com^0');
    sinon.stub(mockStorage, 'isLocalStorage').get(() => true);
    mockStorage.getItems.resolves([['key1', 'value1'], ['key2', 'value2']]);

    sinon.stub(domStorageModel, 'enable');
    sinon.stub(domStorageModel, 'storages').returns([mockStorage]);
  });

  it('can list keys for local storage', async () => {
    const aidaClient = mockAidaClient([
      [{
        functionCalls: [{name: 'listStorageKeys', args: {type: 'localStorage'}}],
        explanation: '',
      }],
      [{explanation: 'Here are the keys.'}]
    ]);

    const agent = new AiAssistance.StorageAgent.StorageAgent({aidaClient});
    const context = new AiAssistance.StorageAgent.StorageContext(
        {origin: 'https://example.com', storageType: 'localStorage', key: ''});

    const responses = await Array.fromAsync(agent.run('list keys', {selected: context}));

    const actionResponse = responses.find((r): r is AiAssistance.AiAgent.ActionResponse => r.type === 'action');
    assert.exists(actionResponse, 'Expected an action response');
    assert.strictEqual(actionResponse.code, 'listStorageKeys(\'localStorage\')');
    assert.include(actionResponse.output, 'key1');
    assert.include(actionResponse.output, 'key2');
  });

  it('can get storage item with approval', async () => {
    const aidaClient = mockAidaClient([
      [{
        functionCalls: [{name: 'getStorageValues', args: {type: 'localStorage', keys: ['key1']}}],
        explanation: '',
      }],
      [{explanation: 'Here is the value.'}]
    ]);

    const sideEffectPromise = Promise.withResolvers<boolean>();
    const agent = new AiAssistance.StorageAgent.StorageAgent({
      aidaClient,
      confirmSideEffectForTest: (<T>() => sideEffectPromise as unknown as PromiseWithResolvers<T>),
    });

    const context = new AiAssistance.StorageAgent.StorageContext(
        {origin: 'https://example.com', storageType: 'localStorage', key: ''});

    sideEffectPromise.resolve(true);
    const responses = await Array.fromAsync(agent.run('get key1', {selected: context}));

    const actionResponses = responses.filter((r): r is AiAssistance.AiAgent.ActionResponse => r.type === 'action');
    assert.lengthOf(actionResponses, 2, 'Expected exactly two action responses for approval flow');

    assert.strictEqual(actionResponses[0].code, 'getStorageValues(\'localStorage\', ["key1"])');
    assert.isUndefined(actionResponses[0].output, 'Pre-approval yield should not contain execution output');

    assert.strictEqual(actionResponses[1].code, 'getStorageValues(\'localStorage\', ["key1"])');
    assert.include(actionResponses[1].output, 'value1', 'Post-approval yield should contain storage values');
  });

  it('returns error when approval is denied', async () => {
    const aidaClient = mockAidaClient([[{
      functionCalls: [{name: 'getStorageValues', args: {type: 'localStorage', keys: ['key1']}}],
      explanation: '',
    }]]);

    const sideEffectPromise = Promise.withResolvers<boolean>();
    const agent = new AiAssistance.StorageAgent.StorageAgent({
      aidaClient,
      confirmSideEffectForTest: (<T>() => sideEffectPromise as unknown as PromiseWithResolvers<T>),
    });

    const context = new AiAssistance.StorageAgent.StorageContext(
        {origin: 'https://example.com', storageType: 'localStorage', key: ''});

    sideEffectPromise.resolve(false);
    const responses = await Array.fromAsync(agent.run('get key1', {selected: context}));

    const finalAction = responses.findLast((r): r is AiAssistance.AiAgent.ActionResponse => r.type === 'action');
    assert.exists(finalAction, 'Expected an action response');
    assert.isTrue(finalAction.canceled, 'Expected action to be marked as canceled');
    assert.include(finalAction.output, 'User denied code execution with side effects');
  });

  it('can list keys for local storage when storageKey is specified in context', async () => {
    const aidaClient = mockAidaClient([
      [{
        functionCalls: [{name: 'listStorageKeys', args: {type: 'localStorage'}}],
        explanation: '',
      }],
      [{explanation: 'Here are the keys.'}]
    ]);

    const agent = new AiAssistance.StorageAgent.StorageAgent({aidaClient});
    const context = new AiAssistance.StorageAgent.StorageContext({
      origin: 'https://example.com',
      storageKey: 'https://example.com^0',
      storageType: 'localStorage',
      key: '',
    });

    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    assert.exists(target);
    const domStorageModel = target.model(SDK.DOMStorageModel.DOMStorageModel);
    assert.exists(domStorageModel);

    const mockStorage = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(mockStorage, 'storageKey').get(() => 'https://example.com^0');
    sinon.stub(mockStorage, 'isLocalStorage').get(() => true);
    mockStorage.getItems.resolves([['key1-keypass', 'value1']]);

    const storageForIdStub = sinon.stub(domStorageModel, 'storageForId')
                                 .withArgs({storageKey: 'https://example.com^0', isLocalStorage: true})
                                 .returns(mockStorage);

    const responses = await Array.fromAsync(agent.run('list keys', {selected: context}));

    const actionResponse = responses.find((r): r is AiAssistance.AiAgent.ActionResponse => r.type === 'action');
    assert.exists(actionResponse, 'Expected an action response');
    assert.strictEqual(actionResponse.code, 'listStorageKeys(\'localStorage\')');
    assert.include(actionResponse.output, 'key1-keypass');
    sinon.assert.calledOnce(storageForIdStub);
  });
});
