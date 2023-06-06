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
import {assertElement, assertShadowRoot, dispatchFocusOutEvent} from '../../helpers/DOMHelpers.js';
import * as Coordinator from '../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

describeWithMockConnection('StorageView', () => {
  const tests = (targetFactory: () => SDK.Target.Target) => {
    const testKey = 'test-storage-key';
    const testOrigin = 'test-origin';
    let target: SDK.Target.Target;
    let domStorageModel: Resources.DOMStorageModel.DOMStorageModel|null;
    let storageKeyManager: SDK.StorageKeyManager.StorageKeyManager|null;

    beforeEach(() => {
      target = targetFactory();
      domStorageModel = target.model(Resources.DOMStorageModel.DOMStorageModel);
      domStorageModel?.enable();
      storageKeyManager = target.model(SDK.StorageKeyManager.StorageKeyManager);
    });

    it('emits correct events on clear', () => {
      const testId = {storageKey: testKey, isLocalStorage: true} as Protocol.DOMStorage.StorageId;

      assertNotNullOrUndefined(domStorageModel);
      assert.isEmpty(domStorageModel.storages());
      assertNotNullOrUndefined(storageKeyManager);
      storageKeyManager.dispatchEventToListeners(SDK.StorageKeyManager.Events.StorageKeyAdded, testKey);
      assertNotNullOrUndefined(domStorageModel.storageForId(testId));

      const dispatcherSpy = sinon.spy(domStorageModel, 'dispatchEventToListeners');
      const spyClearDataForStorageKey = sinon.stub(target.storageAgent(), 'invoke_clearDataForStorageKey');
      Resources.StorageView.StorageView.clear(target, testKey, null, [Protocol.Storage.StorageType.All], false);
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

    it('shows a warning message when entering a too big custom quota', async () => {
      assertNotNullOrUndefined(domStorageModel);
      assertNotNullOrUndefined(storageKeyManager);
      const securityOriginManager = target.model(SDK.SecurityOriginManager.SecurityOriginManager);
      assertNotNullOrUndefined(securityOriginManager);
      sinon.stub(securityOriginManager, 'mainSecurityOrigin').returns(testOrigin);

      const view = new Resources.StorageView.StorageView();
      const container = view.element.shadowRoot?.querySelector('.clear-storage-header') || null;
      assertElement(container, HTMLDivElement);
      assertShadowRoot(container.shadowRoot);
      const customQuotaCheckbox = container.shadowRoot.querySelector('.quota-override-row span')
                                      ?.shadowRoot?.querySelector('[title="Simulate custom storage quota"]') ||
          null;
      assertElement(customQuotaCheckbox, HTMLInputElement);
      customQuotaCheckbox.checked = true;
      const errorDiv = container.shadowRoot.querySelector('.quota-override-error');
      assertElement(errorDiv, HTMLDivElement);
      assert.strictEqual(errorDiv.textContent, '');

      const editor = container.shadowRoot.querySelector('.quota-override-notification-editor');
      assertElement(editor, HTMLInputElement);
      editor.value = '9999999999999';
      dispatchFocusOutEvent(editor);
      await coordinator.done();
      assert.strictEqual(errorDiv.textContent, 'Number must be smaller than 9,000,000,000,000');
    });

    it('also clears cookies on clear', () => {
      /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
      const cookieModel = target.model(SDK.CookieModel.CookieModel)!;
      const clearByOriginSpy = sinon.spy(target.storageAgent(), 'invoke_clearDataForOrigin');
      const cookieClearSpy = sinon.spy(cookieModel, 'clear');

      Resources.StorageView.StorageView.clear(target, testKey, testOrigin, [Protocol.Storage.StorageType.All], false);

      assert.isTrue(clearByOriginSpy.calledOnceWithExactly({origin: testOrigin, storageTypes: 'cookies'}));
      assert.isTrue(cookieClearSpy.calledOnceWithExactly(undefined, testOrigin));
    });

    it('also clears WebSQL on clear', async () => {
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

      Resources.StorageView.StorageView.clear(target, testKey, '', [Protocol.Storage.StorageType.All], false);

      await databaseRemoved;
      assert.isEmpty(databaseModel.databases());
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

    it('clears cache on clear', async () => {
      const cacheStorageModel = target.model(SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel);
      assertNotNullOrUndefined(cacheStorageModel);

      const storageBucketModel = target.model(SDK.StorageBucketsModel.StorageBucketsModel);
      assertNotNullOrUndefined(storageBucketModel);

      const testStorageBucket = {
        storageKey: testKey,
        name: 'inbox',
      };
      const testStorageBucketInfo = {
        bucket: testStorageBucket,
        id: '0',
        expiration: 0,
        quota: 0,
        persistent: false,
        durability: Protocol.Storage.StorageBucketsDurability.Strict,
      };
      let caches = [
        {
          cacheId: 'id1' as Protocol.CacheStorage.CacheId,
          securityOrigin: '',
          storageKey: testStorageBucket.storageKey,
          storageBucket: testStorageBucket,
          cacheName: 'test-cache-1',
        },
        {
          cacheId: 'id2' as Protocol.CacheStorage.CacheId,
          securityOrigin: '',
          storageKey: testStorageBucket.storageKey,
          storageBucket: testStorageBucket,
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
      storageBucketModel?.storageBucketCreatedOrUpdated({bucketInfo: testStorageBucketInfo});
      await cacheAddedPromise;
      caches = [];

      Resources.StorageView.StorageView.clear(target, testKey, '', [Protocol.Storage.StorageType.Cache_storage], false);

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
