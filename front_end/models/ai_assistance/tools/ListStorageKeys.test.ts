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

describe('ListStorageKeysTool', () => {
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

  it('lists keys for local storage successfully when allowed', async () => {
    setupPrimaryTarget('https://example.com');

    const mockStorage = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(mockStorage, 'storageKey').get(() => 'https://example.com/');
    sinon.stub(mockStorage, 'isLocalStorage').get(() => true);
    mockStorage.getItems.resolves([['key1', 'value1'], ['key2', 'value2']]);
    activeStorages = [mockStorage];

    const disableLoggingStub = sinon.stub();
    const context = {
      getEstablishedOrigin: sinon.stub().returns('https://example.com'),
      disableLogging: disableLoggingStub,
    };

    const tool = new AiAssistance.ListStorageKeys.ListStorageKeysTool();
    const response = await tool.handler({type: 'localStorage', origins: ['https://example.com']}, context);

    sinon.assert.calledOnce(disableLoggingStub);
    assertIsResult(response);
    assert.deepEqual(response.result.storageKeysByOrigin, {
      'https://example.com': {
        partitions: [
          {
            storageKey: 'https://example.com/',
            keys: ['key1', 'key2'],
          },
        ],
      },
    });
  });

  it('lists keys for session storage successfully', async () => {
    setupPrimaryTarget('https://example.com');

    const mockStorage = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(mockStorage, 'storageKey').get(() => 'https://example.com/');
    sinon.stub(mockStorage, 'isLocalStorage').get(() => false);
    mockStorage.getItems.resolves([['sessionKey', 'sessionVal']]);
    activeStorages = [mockStorage];

    const context = {
      getEstablishedOrigin: sinon.stub().returns('https://example.com'),
      disableLogging: sinon.stub(),
    };

    const tool = new AiAssistance.ListStorageKeys.ListStorageKeysTool();
    const response = await tool.handler({type: 'sessionStorage', origins: ['https://example.com']}, context);

    assertIsResult(response);
    assert.deepEqual(response.result.storageKeysByOrigin, {
      'https://example.com': {
        partitions: [
          {
            storageKey: 'https://example.com/',
            keys: ['sessionKey'],
          },
        ],
      },
    });
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
    mockStorage2.getItems.resolves([['key2', 'val2']]);

    activeStorages = [mockStorage1, mockStorage2];

    const context = {
      getEstablishedOrigin: sinon.stub().returns('https://example.com'),
      disableLogging: sinon.stub(),
    };

    const tool = new AiAssistance.ListStorageKeys.ListStorageKeysTool();
    const response = await tool.handler(
        {type: 'localStorage', origins: ['https://example.com'], storageKey: 'https://example.com^1'},
        context,
    );

    assertIsResult(response);
    assert.deepEqual(response.result.storageKeysByOrigin, {
      'https://example.com': {
        partitions: [
          {
            storageKey: 'https://example.com^1',
            keys: ['key2'],
          },
        ],
      },
    });
  });

  it('returns error when allowed origin is missing or opaque', async () => {
    setupPrimaryTarget('https://example.com');

    const context = {
      getEstablishedOrigin: sinon.stub().returns(''),
      disableLogging: sinon.stub(),
    };

    const tool = new AiAssistance.ListStorageKeys.ListStorageKeysTool();
    const response = await tool.handler({type: 'localStorage', origins: ['https://example.com']}, context);

    assertIsError(response);
    assert.strictEqual(response.error, 'No origin available or not allowed.');
  });

  it('returns error when primary page target does not match allowed origin', async () => {
    setupPrimaryTarget('https://other-domain.com');

    const context = {
      getEstablishedOrigin: sinon.stub().returns('https://example.com'),
      disableLogging: sinon.stub(),
    };

    const tool = new AiAssistance.ListStorageKeys.ListStorageKeysTool();
    const response = await tool.handler({type: 'localStorage', origins: ['https://example.com']}, context);

    assertIsError(response);
    assert.strictEqual(response.error, 'No origin available or not allowed.');
  });

  it('filters out origins that are not same-origin to the allowed origin', async () => {
    setupPrimaryTarget('https://example.com');

    const mockStorage = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(mockStorage, 'storageKey').get(() => 'https://example.com/');
    sinon.stub(mockStorage, 'isLocalStorage').get(() => true);
    mockStorage.getItems.resolves([['key1', 'val1']]);
    activeStorages = [mockStorage];

    const context = {
      getEstablishedOrigin: sinon.stub().returns('https://example.com'),
      disableLogging: sinon.stub(),
    };

    const tool = new AiAssistance.ListStorageKeys.ListStorageKeysTool();
    const response = await tool.handler(
        {type: 'localStorage', origins: ['https://example.com', 'https://blocked-origin.com']},
        context,
    );

    assertIsResult(response);
    assert.deepEqual(response.result.storageKeysByOrigin, {
      'https://example.com': {
        partitions: [
          {
            storageKey: 'https://example.com/',
            keys: ['key1'],
          },
        ],
      },
    });
    assert.isUndefined(response.result.storageKeysByOrigin['https://blocked-origin.com']);
  });

  it('ignores DOMStorageModel from other outermost targets', async () => {
    setupPrimaryTarget('https://example.com');

    const otherTarget = universe.createTarget({url: urlString`https://example.com/`});
    sinon.stub(otherTarget, 'outermostTarget').returns(otherTarget);
    const otherDomStorageModel = otherTarget.model(SDK.DOMStorageModel.DOMStorageModel);
    assert.exists(otherDomStorageModel);

    const otherStorage = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(otherStorage, 'storageKey').get(() => 'https://example.com/');
    sinon.stub(otherStorage, 'isLocalStorage').get(() => true);
    otherStorage.getItems.resolves([['otherKey', 'otherVal']]);
    sinon.stub(otherDomStorageModel, 'storages').returns([otherStorage]);

    const primaryStorage = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(primaryStorage, 'storageKey').get(() => 'https://example.com/');
    sinon.stub(primaryStorage, 'isLocalStorage').get(() => true);
    primaryStorage.getItems.resolves([['primaryKey', 'primaryVal']]);
    activeStorages = [primaryStorage];

    const context = {
      getEstablishedOrigin: sinon.stub().returns('https://example.com'),
      disableLogging: sinon.stub(),
    };

    const tool = new AiAssistance.ListStorageKeys.ListStorageKeysTool();
    const response = await tool.handler({type: 'localStorage', origins: ['https://example.com']}, context);

    assertIsResult(response);
    assert.deepEqual(response.result.storageKeysByOrigin, {
      'https://example.com': {
        partitions: [
          {
            storageKey: 'https://example.com/',
            keys: ['primaryKey'],
          },
        ],
      },
    });
  });

  it('returns error when all requested origins are disallowed', async () => {
    setupPrimaryTarget('https://example.com');

    const context = {
      getEstablishedOrigin: sinon.stub().returns('https://example.com'),
      disableLogging: sinon.stub(),
    };

    const tool = new AiAssistance.ListStorageKeys.ListStorageKeysTool();
    const response = await tool.handler({type: 'localStorage', origins: ['https://blocked-domain.com']}, context);

    assertIsError(response);
    assert.strictEqual(response.error, 'No valid origins found.');
  });

  it('returns correct displayInfoFromArgs for localStorage', () => {
    const tool = new AiAssistance.ListStorageKeys.ListStorageKeysTool();
    const info = tool.displayInfoFromArgs({type: 'localStorage', origins: ['https://example.com']});
    assert.strictEqual(info.title, 'Reading local storage keys');
    assert.strictEqual(info.action, 'listStorageKeys(\'localStorage\', ["https://example.com"])');
  });

  it('returns correct displayInfoFromArgs for sessionStorage', () => {
    const tool = new AiAssistance.ListStorageKeys.ListStorageKeysTool();
    const info = tool.displayInfoFromArgs({type: 'sessionStorage', origins: ['https://example.com']});
    assert.strictEqual(info.title, 'Reading session storage keys');
    assert.strictEqual(info.action, 'listStorageKeys(\'sessionStorage\', ["https://example.com"])');
  });

  it('normalizes origins with trailing slashes', async () => {
    setupPrimaryTarget('https://example.com');

    const mockStorage = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(mockStorage, 'storageKey').get(() => 'https://example.com/');
    sinon.stub(mockStorage, 'isLocalStorage').get(() => true);
    mockStorage.getItems.resolves([['key1', 'value1']]);
    activeStorages = [mockStorage];

    const context = {
      getEstablishedOrigin: sinon.stub().returns('https://example.com'),
      disableLogging: sinon.stub(),
    };

    const tool = new AiAssistance.ListStorageKeys.ListStorageKeysTool();
    const response = await tool.handler({type: 'localStorage', origins: ['https://example.com/']}, context);

    assertIsResult(response);
    assert.deepEqual(response.result.storageKeysByOrigin, {
      'https://example.com': {
        partitions: [
          {
            storageKey: 'https://example.com/',
            keys: ['key1'],
          },
        ],
      },
    });
  });

  it('defaults to allowedOrigin when origins array is empty', async () => {
    setupPrimaryTarget('https://example.com');

    const mockStorage = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(mockStorage, 'storageKey').get(() => 'https://example.com/');
    sinon.stub(mockStorage, 'isLocalStorage').get(() => true);
    mockStorage.getItems.resolves([['key1', 'value1']]);
    activeStorages = [mockStorage];

    const context = {
      getEstablishedOrigin: sinon.stub().returns('https://example.com'),
      disableLogging: sinon.stub(),
    };

    const tool = new AiAssistance.ListStorageKeys.ListStorageKeysTool();
    const response = await tool.handler({type: 'localStorage', origins: []}, context);

    assertIsResult(response);
    assert.deepEqual(response.result.storageKeysByOrigin, {
      'https://example.com': {
        partitions: [
          {
            storageKey: 'https://example.com/',
            keys: ['key1'],
          },
        ],
      },
    });
  });

  it('deduplicates identical storageKey partitions across subtargets', async () => {
    const primaryTarget = universe.createTarget({url: urlString`https://example.com/`});
    primaryTarget.setInspectedURL(urlString`https://example.com/`);
    sinon.stub(universe.targetManager, 'primaryPageTarget').returns(primaryTarget);

    const subTarget =
        universe.createTarget({url: urlString`https://example.com/sub.html`, parentTarget: primaryTarget});
    subTarget.setInspectedURL(urlString`https://example.com/sub.html`);

    const mockStorage1 = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(mockStorage1, 'storageKey').get(() => 'https://example.com/');
    sinon.stub(mockStorage1, 'isLocalStorage').get(() => true);
    mockStorage1.getItems.resolves([['k1', 'v1']]);

    const mockStorage2 = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(mockStorage2, 'storageKey').get(() => 'https://example.com/');
    sinon.stub(mockStorage2, 'isLocalStorage').get(() => true);
    mockStorage2.getItems.resolves([['k1', 'v1']]);

    const model1 = primaryTarget.model(SDK.DOMStorageModel.DOMStorageModel);
    assert.exists(model1);
    sinon.stub(model1, 'storages').callsFake(() => [mockStorage1]);

    const model2 = subTarget.model(SDK.DOMStorageModel.DOMStorageModel);
    assert.exists(model2);
    sinon.stub(model2, 'storages').callsFake(() => [mockStorage2]);

    const context = {
      conversationContext: null,
      getEstablishedOrigin: sinon.stub().returns('https://example.com'),
      disableLogging: sinon.stub(),
    };

    const tool = new AiAssistance.ListStorageKeys.ListStorageKeysTool();
    const response = await tool.handler({type: 'localStorage', origins: ['https://example.com']}, context);

    assertIsResult(response);
    assert.deepEqual(response.result.storageKeysByOrigin, {
      'https://example.com': {
        partitions: [
          {
            storageKey: 'https://example.com/',
            keys: ['k1'],
          },
        ],
      },
    });
  });
});
