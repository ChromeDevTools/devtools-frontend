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
  let activeStorages: SDK.DOMStorageModel.DOMStorage[] = [];

  beforeEach(() => {
    const target = createTarget();
    const domStorageModel = target.model(SDK.DOMStorageModel.DOMStorageModel);
    assert.exists(domStorageModel);

    const mockStorage = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(mockStorage, 'storageKey').get(() => 'https://example.com/');
    sinon.stub(mockStorage, 'isLocalStorage').get(() => true);
    mockStorage.getItems.resolves([['key1', 'value1'], ['key2', 'value2']]);

    sinon.stub(domStorageModel, 'enable');
    sinon.stub(domStorageModel, 'storages').callsFake(() => activeStorages);
    activeStorages = [mockStorage];

    const mockFrame = sinon.createStubInstance(SDK.ResourceTreeModel.ResourceTreeFrame);
    sinon.stub(mockFrame, 'securityOrigin').get(() => 'https://example.com');
    mockFrame.isPrimaryFrame.returns(true);
    mockFrame.parentFrame.returns(null);

    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.exists(resourceTreeModel);
    mockFrame.resourceTreeModel.returns(resourceTreeModel);

    sinon.stub(SDK.ResourceTreeModel.ResourceTreeModel, 'frames').returns([mockFrame]);
  });

  it('can list keys for local storage', async () => {
    const aidaClient = mockAidaClient([
      [{
        functionCalls: [{name: 'listStorageKeys', args: {type: 'localStorage', origin: 'https://example.com'}}],
        explanation: '',
      }],
      [{explanation: 'Here are the keys.'}]
    ]);

    const agent = new AiAssistance.StorageAgent.StorageAgent({aidaClient});
    const context = new AiAssistance.StorageAgent.StorageContext(new AiAssistance.StorageItem.DOMStorageItem(
        'https://example.com', 'https://example.com', 'https://example.com/', 'localStorage'));

    const responses = await Array.fromAsync(agent.run('list keys', {selected: context}));

    const actionResponse = responses.find((r): r is AiAssistance.AiAgent.ActionResponse => r.type === 'action');
    assert.exists(actionResponse, 'Expected an action response');
    assert.strictEqual(actionResponse.code, 'listStorageKeys(\'localStorage\', \'https://example.com\')');
    assert.include(actionResponse.output, 'key1');
    assert.include(actionResponse.output, 'key2');
  });

  it('can get storage item with approval', async () => {
    const aidaClient = mockAidaClient([
      [{
        functionCalls:
            [{name: 'getStorageValues', args: {type: 'localStorage', keys: ['key1'], origin: 'https://example.com'}}],
        explanation: '',
      }],
      [{explanation: 'Here is the value.'}]
    ]);

    const sideEffectPromise = Promise.withResolvers<boolean>();
    const agent = new AiAssistance.StorageAgent.StorageAgent({
      aidaClient,
      confirmSideEffectForTest: (<T>() => sideEffectPromise as unknown as PromiseWithResolvers<T>),
    });

    const context = new AiAssistance.StorageAgent.StorageContext(new AiAssistance.StorageItem.DOMStorageItem(
        'https://example.com', 'https://example.com', 'https://example.com/', 'localStorage'));

    sideEffectPromise.resolve(true);
    const responses = await Array.fromAsync(agent.run('get key1', {selected: context}));

    const actionResponses = responses.filter((r): r is AiAssistance.AiAgent.ActionResponse => r.type === 'action');
    assert.lengthOf(actionResponses, 2, 'Expected exactly two action responses for approval flow');

    assert.strictEqual(
        actionResponses[0].code, 'getStorageValues(\'localStorage\', ["key1"], \'https://example.com\')');
    assert.isUndefined(actionResponses[0].output, 'Pre-approval yield should not contain execution output');

    assert.strictEqual(
        actionResponses[1].code, 'getStorageValues(\'localStorage\', ["key1"], \'https://example.com\')');
    assert.include(actionResponses[1].output, 'value1', 'Post-approval yield should contain storage values');
  });

  it('returns error when approval is denied', async () => {
    const aidaClient = mockAidaClient([[{
      functionCalls:
          [{name: 'getStorageValues', args: {type: 'localStorage', keys: ['key1'], origin: 'https://example.com'}}],
      explanation: '',
    }]]);

    const sideEffectPromise = Promise.withResolvers<boolean>();
    const agent = new AiAssistance.StorageAgent.StorageAgent({
      aidaClient,
      confirmSideEffectForTest: (<T>() => sideEffectPromise as unknown as PromiseWithResolvers<T>),
    });

    const context = new AiAssistance.StorageAgent.StorageContext(new AiAssistance.StorageItem.DOMStorageItem(
        'https://example.com', 'https://example.com', 'https://example.com/', 'localStorage'));

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
        functionCalls: [{name: 'listStorageKeys', args: {type: 'localStorage', origin: 'https://example.com'}}],
        explanation: '',
      }],
      [{explanation: 'Here are the keys.'}]
    ]);

    const agent = new AiAssistance.StorageAgent.StorageAgent({aidaClient});
    const context = new AiAssistance.StorageAgent.StorageContext(new AiAssistance.StorageItem.DOMStorageItem(
        'https://example.com', 'https://example.com', 'https://example.com^0', 'localStorage'));

    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    assert.exists(target);
    const domStorageModel = target.model(SDK.DOMStorageModel.DOMStorageModel);
    assert.exists(domStorageModel);

    const mockStorage = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(mockStorage, 'storageKey').get(() => 'https://example.com^0');
    sinon.stub(mockStorage, 'isLocalStorage').get(() => true);
    mockStorage.getItems.resolves([['key1-keypass', 'value1']]);

    activeStorages = [mockStorage];

    const responses = await Array.fromAsync(agent.run('list keys', {selected: context}));

    const actionResponse = responses.find((r): r is AiAssistance.AiAgent.ActionResponse => r.type === 'action');
    assert.exists(actionResponse, 'Expected an action response');
    assert.strictEqual(actionResponse.code, 'listStorageKeys(\'localStorage\', \'https://example.com\')');
    assert.include(actionResponse.output, 'key1-keypass');
  });

  it('getStorageValues truncates large values to 10000 characters', async () => {
    const aidaClient = mockAidaClient([
      [{
        functionCalls: [
          {name: 'getStorageValues', args: {type: 'localStorage', keys: ['hugeKey'], origin: 'https://example.com'}}
        ],
        explanation: '',
      }],
      [{explanation: 'Here is the value.'}]
    ]);

    const sideEffectPromise = Promise.withResolvers<boolean>();
    const agent = new AiAssistance.StorageAgent.StorageAgent({
      aidaClient,
      confirmSideEffectForTest: (<T>() => sideEffectPromise as unknown as PromiseWithResolvers<T>),
    });

    const context = new AiAssistance.StorageAgent.StorageContext(new AiAssistance.StorageItem.DOMStorageItem(
        'https://example.com', 'https://example.com', 'https://example.com/', 'localStorage'));

    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    assert.exists(target);
    const domStorageModel = target.model(SDK.DOMStorageModel.DOMStorageModel);
    assert.exists(domStorageModel);

    const mockStorage = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(mockStorage, 'storageKey').get(() => 'https://example.com/');
    sinon.stub(mockStorage, 'isLocalStorage').get(() => true);

    const hugeValue = 'A'.repeat(15000);
    mockStorage.getItems.resolves([['hugeKey', hugeValue]]);

    activeStorages = [mockStorage];

    sideEffectPromise.resolve(true);
    const responses = await Array.fromAsync(agent.run('get hugeKey', {selected: context}));

    const actionResponses = responses.filter((r): r is AiAssistance.AiAgent.ActionResponse => r.type === 'action');
    assert.lengthOf(actionResponses, 2);

    const output = actionResponses[1].output;
    assert.exists(output);
    const expectedTruncated = 'A'.repeat(10000) + '... <truncated>';
    assert.include(output, expectedTruncated);
    assert.notInclude(output, 'A'.repeat(15000), 'Should not contain the full untruncated value');
  });

  describe('resolveDOMStorages', () => {
    it('returns active matching DOM storage instances in the active tab', () => {
      const context = new AiAssistance.StorageAgent.StorageContext(new AiAssistance.StorageItem.DOMStorageItem(
          'https://example.com', 'https://example.com', 'https://example.com/', 'localStorage'));

      const resolved = AiAssistance.StorageAgent.resolveDOMStorages(context, 'localStorage', 'https://example.com');
      assert.lengthOf(resolved, 1);
      assert.strictEqual(resolved[0].storageKey, 'https://example.com/');
    });

    it('filters out storages that do not belong to the conversation top-site', () => {
      const context = new AiAssistance.StorageAgent.StorageContext(new AiAssistance.StorageItem.DOMStorageItem(
          'https://different.com', 'https://different.com', 'https://different.com/', 'localStorage'));

      const resolved = AiAssistance.StorageAgent.resolveDOMStorages(context, 'localStorage', 'https://different.com');
      assert.lengthOf(resolved, 0);
    });

    it('targets a specific storageKey partition if specified', () => {
      const context = new AiAssistance.StorageAgent.StorageContext(new AiAssistance.StorageItem.DOMStorageItem(
          'https://example.com', 'https://example.com', 'https://example.com/', 'localStorage'));

      const resolved = AiAssistance.StorageAgent.resolveDOMStorages(
          context, 'localStorage', 'https://example.com', 'https://example.com/');
      assert.lengthOf(resolved, 1);

      const nonMatching = AiAssistance.StorageAgent.resolveDOMStorages(
          context, 'localStorage', 'https://example.com', 'https://different-partition/');
      assert.lengthOf(nonMatching, 0);
    });
  });
});
