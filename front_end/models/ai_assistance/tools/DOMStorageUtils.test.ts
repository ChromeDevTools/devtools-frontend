// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';
import {TestUniverse} from '../../../testing/TestUniverse.js';
import * as AiAssistance from '../ai_assistance.js';

const {urlString} = Platform.DevToolsPath;

describe('DOMStorageUtils', () => {
  setupLocaleHooks();

  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
  });

  function createMockStorage(
      storageKey: string,
      isLocalStorage: boolean,
      ): sinon.SinonStubbedInstance<SDK.DOMStorageModel.DOMStorage> {
    const mockStorage = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(mockStorage, 'storageKey').get(() => storageKey);
    sinon.stub(mockStorage, 'isLocalStorage').get(() => isLocalStorage);
    return mockStorage;
  }

  describe('resolveDOMStorages', () => {
    it('deduplicates storages with identical storageKey across multiple DOMStorageModels', () => {
      const primaryTarget = universe.createTarget({url: urlString`https://example.com/`});
      primaryTarget.setInspectedURL(urlString`https://example.com/`);

      const subTarget =
          universe.createTarget({url: urlString`https://example.com/embed.html`, parentTarget: primaryTarget});
      subTarget.setInspectedURL(urlString`https://example.com/embed.html`);

      const model1 = primaryTarget.model(SDK.DOMStorageModel.DOMStorageModel);
      assert.exists(model1);
      const storage1 = createMockStorage('https://example.com/', true);
      sinon.stub(model1, 'storages').callsFake(() => [storage1]);

      const model2 = subTarget.model(SDK.DOMStorageModel.DOMStorageModel);
      assert.exists(model2);
      const storage2 = createMockStorage('https://example.com/', true);
      sinon.stub(model2, 'storages').callsFake(() => [storage2]);

      const result = AiAssistance.DOMStorageUtils.resolveDOMStorages(
          'https://example.com',
          'localStorage',
          universe.targetManager,
          primaryTarget,
      );

      assert.lengthOf(result, 1);
      assert.strictEqual(result[0], storage1);
    });

    it('preserves distinct partitioned storage keys for the same origin', () => {
      const primaryTarget = universe.createTarget({url: urlString`https://example.com/`});
      primaryTarget.setInspectedURL(urlString`https://example.com/`);

      const model = primaryTarget.model(SDK.DOMStorageModel.DOMStorageModel);
      assert.exists(model);

      const firstPartyStorage = createMockStorage('https://example.com/', true);
      const partitionedStorage = createMockStorage('https://example.com/^0https://thirdparty.com', true);
      sinon.stub(model, 'storages').callsFake(() => [firstPartyStorage, partitionedStorage]);

      const result = AiAssistance.DOMStorageUtils.resolveDOMStorages(
          'https://example.com',
          'localStorage',
          universe.targetManager,
          primaryTarget,
      );

      assert.lengthOf(result, 2);
      assert.strictEqual(result[0], firstPartyStorage);
      assert.strictEqual(result[1], partitionedStorage);
    });

    it('filters by storageKey if provided', () => {
      const primaryTarget = universe.createTarget({url: urlString`https://example.com/`});
      primaryTarget.setInspectedURL(urlString`https://example.com/`);

      const model = primaryTarget.model(SDK.DOMStorageModel.DOMStorageModel);
      assert.exists(model);

      const firstPartyStorage = createMockStorage('https://example.com/', true);
      const partitionedStorage = createMockStorage('https://example.com/^0https://thirdparty.com', true);
      sinon.stub(model, 'storages').callsFake(() => [firstPartyStorage, partitionedStorage]);

      const result = AiAssistance.DOMStorageUtils.resolveDOMStorages(
          'https://example.com',
          'localStorage',
          universe.targetManager,
          primaryTarget,
          'https://example.com/^0https://thirdparty.com',
      );

      assert.lengthOf(result, 1);
      assert.strictEqual(result[0], partitionedStorage);
    });

    it('skips models that belong to a different outermost target', () => {
      const primaryTarget = universe.createTarget({url: urlString`https://example.com/`});
      primaryTarget.setInspectedURL(urlString`https://example.com/`);

      const otherPrimaryTarget = universe.createTarget({url: urlString`https://example.com/`});
      otherPrimaryTarget.setInspectedURL(urlString`https://example.com/`);

      const otherModel = otherPrimaryTarget.model(SDK.DOMStorageModel.DOMStorageModel);
      assert.exists(otherModel);
      const foreignStorage = createMockStorage('https://example.com/', true);
      sinon.stub(otherModel, 'storages').callsFake(() => [foreignStorage]);

      const result = AiAssistance.DOMStorageUtils.resolveDOMStorages(
          'https://example.com',
          'localStorage',
          universe.targetManager,
          primaryTarget,
      );

      assert.lengthOf(result, 0);
    });

    it('distinguishes between localStorage and sessionStorage', () => {
      const primaryTarget = universe.createTarget({url: urlString`https://example.com/`});
      primaryTarget.setInspectedURL(urlString`https://example.com/`);

      const model = primaryTarget.model(SDK.DOMStorageModel.DOMStorageModel);
      assert.exists(model);

      const localStorage = createMockStorage('https://example.com/', true);
      const sessionStorage = createMockStorage('https://example.com/', false);
      sinon.stub(model, 'storages').callsFake(() => [localStorage, sessionStorage]);

      const localResult = AiAssistance.DOMStorageUtils.resolveDOMStorages(
          'https://example.com',
          'localStorage',
          universe.targetManager,
          primaryTarget,
      );
      assert.lengthOf(localResult, 1);
      assert.strictEqual(localResult[0], localStorage);

      const sessionResult = AiAssistance.DOMStorageUtils.resolveDOMStorages(
          'https://example.com',
          'sessionStorage',
          universe.targetManager,
          primaryTarget,
      );
      assert.lengthOf(sessionResult, 1);
      assert.strictEqual(sessionResult[0], sessionStorage);
    });

    it('returns empty array for opaque or disallowed origins', () => {
      const primaryTarget = universe.createTarget({url: urlString`https://example.com/`});
      primaryTarget.setInspectedURL(urlString`https://example.com/`);

      const model = primaryTarget.model(SDK.DOMStorageModel.DOMStorageModel);
      assert.exists(model);

      const storage = createMockStorage('https://example.com/', true);
      sinon.stub(model, 'storages').callsFake(() => [storage]);

      const result = AiAssistance.DOMStorageUtils.resolveDOMStorages(
          'about:blank',
          'localStorage',
          universe.targetManager,
          primaryTarget,
      );

      assert.lengthOf(result, 0);
    });

    it('enables DOMStorageModel on demand when querying storages', () => {
      const primaryTarget = universe.createTarget({url: urlString`https://example.com/`});
      primaryTarget.setInspectedURL(urlString`https://example.com/`);

      const model = primaryTarget.model(SDK.DOMStorageModel.DOMStorageModel);
      assert.exists(model);
      const enableSpy = sinon.spy(model, 'enable');

      AiAssistance.DOMStorageUtils.resolveDOMStorages(
          'https://example.com',
          'localStorage',
          universe.targetManager,
          primaryTarget,
      );

      sinon.assert.calledOnce(enableSpy);
    });
  });

  describe('calculateDOMStoragesUsage', () => {
    it('calculates total byte size across partitions with 2 bytes per char', async () => {
      const storage1 = createMockStorage('https://example.com/', true);
      storage1.getItems.resolves([['a', 'b']]);

      const storage2 = createMockStorage('https://example.com/^0https://other.com', true);
      storage2.getItems.resolves([['key', 'val']]);

      const total = await AiAssistance.DOMStorageUtils.calculateDOMStoragesUsage([storage1, storage2]);
      assert.strictEqual(total, 16);
    });

    it('handles null items from failed getItems calls gracefully', async () => {
      const storage = createMockStorage('https://example.com/', true);
      storage.getItems.rejects(new Error('Target detached'));

      const total = await AiAssistance.DOMStorageUtils.calculateDOMStoragesUsage([storage]);
      assert.strictEqual(total, 0);
    });
  });
});
