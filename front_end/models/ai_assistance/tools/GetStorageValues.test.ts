// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import {
  assertIsError,
  assertIsResult,
} from '../../../testing/AiAssistanceHelpers.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../../testing/TestUniverse.js';
import * as AiAssistance from '../ai_assistance.js';

const {urlString} = Platform.DevToolsPath;

describe('GetStorageValuesTool', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let universe: TestUniverse;
  let activeStorages: SDK.DOMStorageModel.DOMStorage[] = [];

  beforeEach(() => {
    universe = new TestUniverse();
    sinon.stub(SDK.TargetManager.TargetManager, 'instance').returns(universe.targetManager);
  });

  function setupPrimaryTarget(origin = 'https://example.com'): {
    primaryTarget: SDK.Target.Target,
    domStorageModel: SDK.DOMStorageModel.DOMStorageModel,
  } {
    const primaryTarget = universe.createTarget({url: urlString`${origin}/`});
    primaryTarget.setInspectedURL(urlString`${origin}/`);
    sinon.stub(universe.targetManager, 'primaryPageTarget').returns(primaryTarget);

    const domStorageModel = primaryTarget.model(SDK.DOMStorageModel.DOMStorageModel);
    assert.exists(domStorageModel);
    sinon.stub(domStorageModel, 'storages').callsFake(() => activeStorages);

    return {primaryTarget, domStorageModel};
  }

  it('requests approval when not yet approved', async () => {
    setupPrimaryTarget('https://example.com');

    const mockStorage = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(mockStorage, 'storageKey').get(() => 'https://example.com/');
    sinon.stub(mockStorage, 'isLocalStorage').get(() => true);
    mockStorage.getItems.resolves([['key1', 'value1']]);
    activeStorages = [mockStorage];

    const setLoggingEnabledStub = sinon.stub();
    const context = {
      conversationContext: null,
      getEstablishedOrigin: sinon.stub().returns('https://example.com'),
      setLoggingEnabled: setLoggingEnabledStub,
    };

    const tool = new AiAssistance.GetStorageValues.GetStorageValuesTool();
    const response = await tool.handler(
        {type: 'localStorage', keys: ['key1'], origins: ['https://example.com']},
        context,
    );

    sinon.assert.calledWith(setLoggingEnabledStub, false);
    assert.isTrue('requiresApproval' in response && response.requiresApproval);
    if ('requiresApproval' in response) {
      assert.include(response.description || '', 'key1');
    }
  });

  it('retrieves storage values when approved', async () => {
    setupPrimaryTarget('https://example.com');

    const mockStorage = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(mockStorage, 'storageKey').get(() => 'https://example.com/');
    sinon.stub(mockStorage, 'isLocalStorage').get(() => true);
    mockStorage.getItems.resolves([['key1', 'value1'], ['key2', 'value2']]);
    activeStorages = [mockStorage];

    const context = {
      conversationContext: null,
      getEstablishedOrigin: sinon.stub().returns('https://example.com'),
      setLoggingEnabled: sinon.stub(),
    };

    const tool = new AiAssistance.GetStorageValues.GetStorageValuesTool();
    const response = await tool.handler(
        {type: 'localStorage', keys: ['key1', 'key2'], origins: ['https://example.com']},
        context,
        {approved: true},
    );

    assertIsResult(response);
    assert.deepEqual(response.result.storageValuesByOrigin, {
      'https://example.com': {
        items: [
          {
            storageKey: 'https://example.com/',
            values: {
              key1: 'value1',
              key2: 'value2',
            },
          },
        ],
      },
    });
  });

  it('retrieves sessionStorage values when approved', async () => {
    setupPrimaryTarget('https://example.com');

    const mockStorage = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(mockStorage, 'storageKey').get(() => 'https://example.com/');
    sinon.stub(mockStorage, 'isLocalStorage').get(() => false);
    mockStorage.getItems.resolves([['sessKey', 'sessVal']]);
    activeStorages = [mockStorage];

    const context = {
      conversationContext: null,
      getEstablishedOrigin: sinon.stub().returns('https://example.com'),
      setLoggingEnabled: sinon.stub(),
    };

    const tool = new AiAssistance.GetStorageValues.GetStorageValuesTool();
    const response = await tool.handler(
        {type: 'sessionStorage', keys: ['sessKey'], origins: ['https://example.com']},
        context,
        {approved: true},
    );

    assertIsResult(response);
    assert.deepEqual(response.result.storageValuesByOrigin, {
      'https://example.com': {
        items: [
          {
            storageKey: 'https://example.com/',
            values: {
              sessKey: 'sessVal',
            },
          },
        ],
      },
    });
  });

  it('returns error when no matching storage partitions found', async () => {
    setupPrimaryTarget('https://example.com');
    activeStorages = [];

    const context = {
      conversationContext: null,
      getEstablishedOrigin: sinon.stub().returns('https://example.com'),
      setLoggingEnabled: sinon.stub(),
    };

    const tool = new AiAssistance.GetStorageValues.GetStorageValuesTool();
    const response = await tool.handler(
        {type: 'localStorage', keys: ['key1'], origins: ['https://example.com']},
        context,
        {approved: true},
    );

    assertIsError(response);
    assert.strictEqual(response.error, 'No matching storage partitions found.');
  });

  it('truncates large values exceeding 10000 characters', async () => {
    setupPrimaryTarget('https://example.com');

    const largeValue = 'a'.repeat(10050);
    const mockStorage = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(mockStorage, 'storageKey').get(() => 'https://example.com/');
    sinon.stub(mockStorage, 'isLocalStorage').get(() => true);
    mockStorage.getItems.resolves([['hugeKey', largeValue]]);
    activeStorages = [mockStorage];

    const context = {
      conversationContext: null,
      getEstablishedOrigin: sinon.stub().returns('https://example.com'),
      setLoggingEnabled: sinon.stub(),
    };

    const tool = new AiAssistance.GetStorageValues.GetStorageValuesTool();
    const response = await tool.handler(
        {type: 'localStorage', keys: ['hugeKey'], origins: ['https://example.com']},
        context,
        {approved: true},
    );

    assertIsResult(response);
    const retrievedValue = response.result.storageValuesByOrigin['https://example.com'].items?.[0].values['hugeKey'];
    assert.exists(retrievedValue);
    assert.strictEqual(retrievedValue.length, 10000 + '... <truncated>'.length);
    assert.isTrue(retrievedValue.endsWith('... <truncated>'));
  });

  it('returns error when allowed origin is missing or opaque', async () => {
    setupPrimaryTarget('https://example.com');

    const context = {
      conversationContext: null,
      getEstablishedOrigin: sinon.stub().returns(''),
      setLoggingEnabled: sinon.stub(),
    };

    const tool = new AiAssistance.GetStorageValues.GetStorageValuesTool();
    const response = await tool.handler(
        {type: 'localStorage', keys: ['key1'], origins: ['https://example.com']},
        context,
        {approved: true},
    );

    assertIsError(response);
    assert.strictEqual(response.error, 'No origin available or not allowed.');
  });

  it('returns error when primary page target does not match allowed origin', async () => {
    setupPrimaryTarget('https://other-domain.com');

    const context = {
      conversationContext: null,
      getEstablishedOrigin: sinon.stub().returns('https://example.com'),
      setLoggingEnabled: sinon.stub(),
    };

    const tool = new AiAssistance.GetStorageValues.GetStorageValuesTool();
    const response = await tool.handler(
        {type: 'localStorage', keys: ['key1'], origins: ['https://example.com']},
        context,
        {approved: true},
    );

    assertIsError(response);
    assert.strictEqual(response.error, 'No origin available or not allowed.');
  });

  it('filters by storageKey when specified for a single origin', async () => {
    setupPrimaryTarget('https://example.com');

    const mockStorage1 = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(mockStorage1, 'storageKey').get(() => 'https://example.com^0');
    sinon.stub(mockStorage1, 'isLocalStorage').get(() => true);
    mockStorage1.getItems.resolves([['key1', 'val1']]);

    const mockStorage2 = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(mockStorage2, 'storageKey').get(() => 'https://example.com^1');
    sinon.stub(mockStorage2, 'isLocalStorage').get(() => true);
    mockStorage2.getItems.resolves([['key1', 'val2']]);

    activeStorages = [mockStorage1, mockStorage2];

    const context = {
      conversationContext: null,
      getEstablishedOrigin: sinon.stub().returns('https://example.com'),
      setLoggingEnabled: sinon.stub(),
    };

    const tool = new AiAssistance.GetStorageValues.GetStorageValuesTool();
    const response = await tool.handler(
        {type: 'localStorage', keys: ['key1'], origins: ['https://example.com'], storageKey: 'https://example.com^1'},
        context,
        {approved: true},
    );

    assertIsResult(response);
    assert.deepEqual(response.result.storageValuesByOrigin, {
      'https://example.com': {
        items: [
          {
            storageKey: 'https://example.com^1',
            values: {
              key1: 'val2',
            },
          },
        ],
      },
    });
  });

  it('returns error when all requested origins are disallowed', async () => {
    setupPrimaryTarget('https://example.com');

    const context = {
      conversationContext: null,
      getEstablishedOrigin: sinon.stub().returns('https://example.com'),
      setLoggingEnabled: sinon.stub(),
    };

    const tool = new AiAssistance.GetStorageValues.GetStorageValuesTool();
    const response = await tool.handler(
        {type: 'localStorage', keys: ['key1'], origins: ['https://blocked-domain.com']},
        context,
        {approved: true},
    );

    assertIsError(response);
    assert.strictEqual(response.error, 'No valid origins found.');
  });

  it('returns correct displayInfoFromArgs', () => {
    const tool = new AiAssistance.GetStorageValues.GetStorageValuesTool();
    const info = tool.displayInfoFromArgs({type: 'localStorage', keys: ['key1'], origins: ['https://example.com']});
    assert.strictEqual(info.title, 'Reading storage values');
    assert.strictEqual(info.action, 'getStorageValues(\'localStorage\', ["key1"], ["https://example.com"])');
  });

  it('omits non-existent keys from returned values', async () => {
    setupPrimaryTarget('https://example.com');

    const mockStorage = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(mockStorage, 'storageKey').get(() => 'https://example.com/');
    sinon.stub(mockStorage, 'isLocalStorage').get(() => true);
    mockStorage.getItems.resolves([['existingKey', 'value1']]);
    activeStorages = [mockStorage];

    const context = {
      conversationContext: null,
      getEstablishedOrigin: sinon.stub().returns('https://example.com'),
      setLoggingEnabled: sinon.stub(),
    };

    const tool = new AiAssistance.GetStorageValues.GetStorageValuesTool();
    const response = await tool.handler(
        {type: 'localStorage', keys: ['nonExistentKey'], origins: ['https://example.com']},
        context,
        {approved: true},
    );

    assertIsResult(response);
    assert.deepEqual(response.result.storageValuesByOrigin, {
      'https://example.com': {
        items: [
          {
            storageKey: 'https://example.com/',
            values: {},
          },
        ],
      },
    });
  });

  it('normalizes origins with trailing slashes', async () => {
    setupPrimaryTarget('https://example.com');

    const mockStorage = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(mockStorage, 'storageKey').get(() => 'https://example.com/');
    sinon.stub(mockStorage, 'isLocalStorage').get(() => true);
    mockStorage.getItems.resolves([['key1', 'val1']]);
    activeStorages = [mockStorage];

    const context = {
      conversationContext: null,
      getEstablishedOrigin: sinon.stub().returns('https://example.com'),
      setLoggingEnabled: sinon.stub(),
    };

    const tool = new AiAssistance.GetStorageValues.GetStorageValuesTool();
    const response = await tool.handler(
        {type: 'localStorage', keys: ['key1'], origins: ['https://example.com/']},
        context,
        {approved: true},
    );

    assertIsResult(response);
    assert.deepEqual(response.result.storageValuesByOrigin, {
      'https://example.com': {
        items: [
          {
            storageKey: 'https://example.com/',
            values: {
              key1: 'val1',
            },
          },
        ],
      },
    });
  });

  it('retrieves values across multiple storage partitions for an origin when storageKey is omitted', async () => {
    setupPrimaryTarget('https://example.com');

    const mockStorage1 = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(mockStorage1, 'storageKey').get(() => 'https://example.com^0');
    sinon.stub(mockStorage1, 'isLocalStorage').get(() => true);
    mockStorage1.getItems.resolves([['key1', 'val1']]);

    const mockStorage2 = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(mockStorage2, 'storageKey').get(() => 'https://example.com^1');
    sinon.stub(mockStorage2, 'isLocalStorage').get(() => true);
    mockStorage2.getItems.resolves([['key1', 'val2']]);

    activeStorages = [mockStorage1, mockStorage2];

    const context = {
      conversationContext: null,
      getEstablishedOrigin: sinon.stub().returns('https://example.com'),
      setLoggingEnabled: sinon.stub(),
    };

    const tool = new AiAssistance.GetStorageValues.GetStorageValuesTool();
    const response = await tool.handler(
        {
          type: 'localStorage',
          keys: ['key1'],
          origins: ['https://example.com'],
        },
        context,
        {approved: true},
    );

    assertIsResult(response);
    assert.deepEqual(response.result.storageValuesByOrigin, {
      'https://example.com': {
        items: [
          {
            storageKey: 'https://example.com^0',
            values: {
              key1: 'val1',
            },
          },
          {
            storageKey: 'https://example.com^1',
            values: {
              key1: 'val2',
            },
          },
        ],
      },
    });
  });
});
