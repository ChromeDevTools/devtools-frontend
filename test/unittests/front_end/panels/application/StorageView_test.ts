// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as Resources from '../../../../../front_end/panels/application/application.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection, dispatchEvent} from '../../helpers/MockConnection.js';

describeWithMockConnection('StorageView', () => {
  const tests = (targetFactory: () => SDK.Target.Target) => {
    const testKey = 'test-storage-key';
    const testOrigin = 'test-origin';
    let target: SDK.Target.Target;
    let domStorageModel: Resources.DOMStorageModel.DOMStorageModel|null;
    let storageKeyManager: SDK.StorageKeyManager.StorageKeyManager|null;
    let securityOriginManager: SDK.SecurityOriginManager.SecurityOriginManager|null;

    beforeEach(() => {
      target = targetFactory();
      domStorageModel = target.model(Resources.DOMStorageModel.DOMStorageModel);
      domStorageModel?.enable();
      storageKeyManager = target.model(SDK.StorageKeyManager.StorageKeyManager);
      securityOriginManager = target.model(SDK.SecurityOriginManager.SecurityOriginManager);
    });

    it('emits correct events on clearStorageByStorageKey', () => {
      const testId = {storageKey: testKey, isLocalStorage: true} as Protocol.DOMStorage.StorageId;

      assertNotNullOrUndefined(domStorageModel);
      assert.isEmpty(domStorageModel.storages());
      assertNotNullOrUndefined(storageKeyManager);
      storageKeyManager.dispatchEventToListeners(SDK.StorageKeyManager.Events.StorageKeyAdded, testKey);
      assertNotNullOrUndefined(domStorageModel.storageForId(testId));

      const dispatcherSpy = sinon.spy(domStorageModel, 'dispatchEventToListeners');
      const spyClearDataForStorageKey = sinon.stub(target.storageAgent(), 'invoke_clearDataForStorageKey');
      Resources.StorageView.StorageView.clearByStorageKey(
          target, testKey, undefined, [Protocol.Storage.StorageType.All], false);
      // must be called 4 times, twice with DOMStorageRemoved for local and non-local storage and twice with DOMStorageAdded
      assert.isTrue(spyClearDataForStorageKey.calledOnce);
      assert.strictEqual(dispatcherSpy.callCount, 4);
      sinon.assert.calledWith(
          dispatcherSpy, Resources.DOMStorageModel.Events.DOMStorageRemoved as unknown as sinon.SinonMatcher);
      sinon.assert.calledWith(
          dispatcherSpy, Resources.DOMStorageModel.Events.DOMStorageAdded as unknown as sinon.SinonMatcher);
    });

    it('changes subtitle on MainStorageKeyChanged event', () => {
      assertNotNullOrUndefined(domStorageModel);
      assertNotNullOrUndefined(storageKeyManager);
      const view = new Resources.StorageView.StorageView();

      storageKeyManager.dispatchEventToListeners(
          SDK.StorageKeyManager.Events.MainStorageKeyChanged, {mainStorageKey: testKey});
      const subtitle =
          view.element.shadowRoot?.querySelector('div.flex-auto')?.shadowRoot?.querySelector('div.report-subtitle');
      assert.strictEqual(subtitle?.textContent, testKey);
    });

    it('also clears cookies on clearByStorageKey', () => {
      /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
      const cookieModel = target.model(SDK.CookieModel.CookieModel)!;
      const clearByOriginSpy = sinon.spy(target.storageAgent(), 'invoke_clearDataForOrigin');
      const cookieClearSpy = sinon.spy(cookieModel, 'clear');

      Resources.StorageView.StorageView.clearByStorageKey(
          target, testKey, testOrigin, [Protocol.Storage.StorageType.All], false);

      assert.isTrue(clearByOriginSpy.calledOnceWithExactly({origin: testOrigin, storageTypes: 'cookies'}));
      assert.isTrue(cookieClearSpy.calledOnceWithExactly(undefined, testOrigin));
    });

    it('also clears WebSQL on clearByStorageKey', async () => {
      const databaseModel = target.model(Resources.DatabaseModel.DatabaseModel);
      assertNotNullOrUndefined(databaseModel);
      const databaseRemoved = new Promise(resolve => {
        databaseModel.addEventListener(Resources.DatabaseModel.Events.DatabasesRemoved, resolve);
      });
      const testDatabase = new Resources.DatabaseModel.Database(
          databaseModel, 'test-id' as Protocol.Database.DatabaseId, 'test-domain', 'test-name', '1');
      databaseModel.enable();
      databaseModel.addDatabase(testDatabase);
      assert.deepEqual(databaseModel.databases()[0], testDatabase);

      Resources.StorageView.StorageView.clearByStorageKey(
          target, testKey, '', [Protocol.Storage.StorageType.All], false);

      await databaseRemoved;
      assert.isEmpty(databaseModel.databases());
    });

    it('clears cache storage on clear (by origin)', async () => {
      const cacheStorageModel = target.model(SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel);
      assertNotNullOrUndefined(cacheStorageModel);
      let caches = [
        {
          cacheId: 'id1' as Protocol.CacheStorage.CacheId,
          securityOrigin: testOrigin,
          storageKey: '',
          cacheName: 'test-cache-1',
        },
        {
          cacheId: 'id2' as Protocol.CacheStorage.CacheId,
          securityOrigin: testOrigin,
          storageKey: '',
          cacheName: 'test-cache-2',
        },
      ];
      sinon.stub(target.cacheStorageAgent(), 'invoke_requestCacheNames').resolves({caches, getError: () => undefined});
      cacheStorageModel.enable();
      const cacheAddedPromise = cacheStorageModel.once(SDK.ServiceWorkerCacheModel.Events.CacheAdded);
      securityOriginManager?.dispatchEventToListeners(SDK.SecurityOriginManager.Events.SecurityOriginAdded, testOrigin);
      await cacheAddedPromise;
      caches = [];

      Resources.StorageView.StorageView.clear(target, testOrigin, [Protocol.Storage.StorageType.Cache_storage], false);

      assert.isEmpty(cacheStorageModel.caches());
    });

    it('clears e.g. WebSQL on clear site data', async () => {
      const FRAME = {
        id: 'main',
        loaderId: 'test',
        url: 'http://example.com',
        securityOrigin: 'http://example.com',
        mimeType: 'text/html',
      };
      const databaseModel = target.model(Resources.DatabaseModel.DatabaseModel);
      assertNotNullOrUndefined(databaseModel);
      const databaseRemoved = databaseModel.once(Resources.DatabaseModel.Events.DatabasesRemoved);
      const testDatabase = new Resources.DatabaseModel.Database(
          databaseModel, 'test-id' as Protocol.Database.DatabaseId, 'test-domain', 'test-name', '1');
      databaseModel.enable();
      databaseModel.addDatabase(testDatabase);
      assert.deepEqual(databaseModel.databases()[0], testDatabase);
      sinon.stub(target.storageAgent(), 'invoke_getStorageKeyForFrame')
          .resolves({storageKey: testKey, getError: () => undefined});
      dispatchEvent(target, 'Page.frameNavigated', {frame: FRAME});
      const actionDelegate = Resources.StorageView.ActionDelegate.instance();

      actionDelegate.handleAction(
          UI.ActionRegistration.ActionCategory.RESOURCES as unknown as UI.Context.Context, 'resources.clear');

      await databaseRemoved;
      assert.isEmpty(databaseModel.databases());
    });

    it('clears cache on clearByStorageKey', async () => {
      const cacheStorageModel = target.model(SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel);
      assertNotNullOrUndefined(cacheStorageModel);
      let caches = [
        {
          cacheId: 'id1' as Protocol.CacheStorage.CacheId,
          securityOrigin: '',
          storageKey: testKey,
          cacheName: 'test-cache-1',
        },
        {
          cacheId: 'id2' as Protocol.CacheStorage.CacheId,
          securityOrigin: '',
          storageKey: testKey,
          cacheName: 'test-cache-2',
        },
      ];
      sinon.stub(target.cacheStorageAgent(), 'invoke_requestCacheNames').resolves({caches, getError: () => undefined});
      cacheStorageModel.enable();
      const cacheAddedPromise = new Promise<void>(resolve => {
        cacheStorageModel.addEventListener(SDK.ServiceWorkerCacheModel.Events.CacheAdded, () => {
          resolve();
        });
      });
      storageKeyManager?.dispatchEventToListeners(SDK.StorageKeyManager.Events.StorageKeyAdded, testKey);
      await cacheAddedPromise;
      caches = [];

      Resources.StorageView.StorageView.clearByStorageKey(
          target, testKey, '', [Protocol.Storage.StorageType.Cache_storage], false);

      assert.isEmpty(cacheStorageModel.caches());
    });
  };

  describe('without tab target', () => tests(createTarget));
  describe('with tab target', () => tests(() => {
                                const tabTarget = createTarget({type: SDK.Target.Type.Tab});
                                createTarget({parentTarget: tabTarget, subtype: 'prerender'});
                                return createTarget({parentTarget: tabTarget});
                              }));
});
