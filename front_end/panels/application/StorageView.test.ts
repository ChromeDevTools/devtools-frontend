// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {dispatchFocusOutEvent} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment, expectConsoleLogs} from '../../testing/EnvironmentHelpers.js';
import {SECURITY_ORIGIN} from '../../testing/ResourceTreeHelpers.js';
import * as RenderCoordinator from '../../ui/components/render_coordinator/render_coordinator.js';

import * as Resources from './application.js';

describeWithEnvironment('StorageView', () => {
  const testKey = 'test-storage-key';
  let target: SDK.Target.Target;
  let domStorageModel: SDK.DOMStorageModel.DOMStorageModel|null;
  let storageKeyManager: SDK.StorageKeyManager.StorageKeyManager|null;

  beforeEach(() => {
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    target = createTarget({parentTarget: tabTarget});
    domStorageModel = target.model(SDK.DOMStorageModel.DOMStorageModel);
    domStorageModel?.enable();
    storageKeyManager = target.model(SDK.StorageKeyManager.StorageKeyManager);
    sinon.stub(target.networkAgent(), 'invoke_getCookies').resolves({
      cookies: [],
      getError: () => undefined,
    });
  });

  expectConsoleLogs({
    error: ['Error: No LanguageSelector instance exists yet.'],
  });

  it('emits correct events on clear', () => {
    const testId = {storageKey: testKey, isLocalStorage: true} as Protocol.DOMStorage.StorageId;

    assert.exists(domStorageModel);
    assert.isEmpty(domStorageModel.storages());
    assert.exists(storageKeyManager);
    storageKeyManager.dispatchEventToListeners(SDK.StorageKeyManager.Events.STORAGE_KEY_ADDED, testKey);
    assert.exists(domStorageModel.storageForId(testId));

    const dispatcherSpy = sinon.spy(domStorageModel, 'dispatchEventToListeners');
    const spyClearDataForStorageKey = sinon.stub(target.storageAgent(), 'invoke_clearDataForStorageKey');
    Resources.StorageView.StorageView.clear(target, testKey, null, [Protocol.Storage.StorageType.All], false);
    // must be called 4 times, twice with DOMStorageRemoved for local and non-local storage and twice with DOMStorageAdded
    sinon.assert.calledOnce(spyClearDataForStorageKey);
    sinon.assert.callCount(dispatcherSpy, 4);
    sinon.assert.calledWith(
        dispatcherSpy, SDK.DOMStorageModel.Events.DOM_STORAGE_REMOVED as unknown as sinon.SinonMatcher);
    sinon.assert.calledWith(
        dispatcherSpy, SDK.DOMStorageModel.Events.DOM_STORAGE_ADDED as unknown as sinon.SinonMatcher);
  });

  it('changes subtitle on MainStorageKeyChanged event', () => {
    assert.exists(domStorageModel);
    assert.exists(storageKeyManager);
    const view = new Resources.StorageView.StorageView();

    storageKeyManager.dispatchEventToListeners(
        SDK.StorageKeyManager.Events.MAIN_STORAGE_KEY_CHANGED, {mainStorageKey: testKey});
    const subtitle =
        view.element.shadowRoot?.querySelector('div.flex-auto')?.shadowRoot?.querySelector('div.report-subtitle');
    assert.strictEqual(subtitle?.textContent, testKey);
  });

  it('groups site-data checkboxes into columns and indents third-party cookies under cookies', () => {
    const view = new Resources.StorageView.StorageView();
    const container = view.element.shadowRoot?.querySelector('.clear-storage-header') || null;
    assert.instanceOf(container, HTMLDivElement);

    const checkboxesRow = container.shadowRoot!.querySelector('.clear-site-data-checkboxes-row');
    assert.instanceOf(checkboxesRow, HTMLDivElement);
    const columns = checkboxesRow.querySelectorAll('.clear-site-data-checkbox-column');
    assert.lengthOf(columns, 2);

    const cookiesCheckbox = container.shadowRoot!.querySelector('.cookies-checkbox');
    assert.instanceOf(cookiesCheckbox, HTMLElement);

    const includeThirdPartyCookiesRow = container.shadowRoot!.querySelector('.include-third-party-cookies-row');
    assert.instanceOf(includeThirdPartyCookiesRow, HTMLDivElement);
    assert.strictEqual(cookiesCheckbox.nextElementSibling, includeThirdPartyCookiesRow);

    const clearButton = container.shadowRoot!.querySelector('#storage-view-clear-button');
    assert.instanceOf(clearButton, HTMLElement);
    assert.strictEqual(clearButton.textContent, 'Clear selected');
  });

  it('makes include-third-party-cookies dependent on cookies', async () => {
    const cookiesSetting = Common.Settings.Settings.instance().createSetting('clear-storage-cookies', true);
    const includeThirdPartyCookiesSetting =
        Common.Settings.Settings.instance().createSetting('clear-storage-include-third-party-cookies', false);
    cookiesSetting.set(true);
    includeThirdPartyCookiesSetting.set(false);

    const view = new Resources.StorageView.StorageView();
    const container = view.element.shadowRoot?.querySelector('.clear-storage-header') || null;
    assert.instanceOf(container, HTMLDivElement);

    const includeThirdPartyCookiesCheckbox =
        container.shadowRoot!.querySelector('.third-party-cookies-checkbox') as HTMLElement;
    assert.instanceOf(includeThirdPartyCookiesCheckbox, HTMLElement);
    const includeThirdPartyCookiesCheckboxInput =
        includeThirdPartyCookiesCheckbox.shadowRoot!.querySelector('input') as HTMLInputElement;
    assert.instanceOf(includeThirdPartyCookiesCheckboxInput, HTMLInputElement);

    includeThirdPartyCookiesSetting.set(true);
    await RenderCoordinator.done();
    assert.isTrue(cookiesSetting.get());
    assert.isTrue(includeThirdPartyCookiesSetting.get());

    includeThirdPartyCookiesSetting.set(false);
    await RenderCoordinator.done();
    assert.isTrue(cookiesSetting.get());
    assert.isFalse(includeThirdPartyCookiesSetting.get());

    includeThirdPartyCookiesSetting.set(true);
    await RenderCoordinator.done();
    assert.isTrue(includeThirdPartyCookiesSetting.get());

    cookiesSetting.set(false);
    await RenderCoordinator.done();
    assert.isFalse(cookiesSetting.get());
    assert.isFalse(includeThirdPartyCookiesSetting.get());
    assert.isTrue(includeThirdPartyCookiesCheckboxInput.disabled);

    cookiesSetting.set(true);
    await RenderCoordinator.done();
    assert.isTrue(cookiesSetting.get());
    assert.isFalse(includeThirdPartyCookiesCheckboxInput.disabled);
  });

  it('shows a warning message when entering a too big custom quota', async () => {
    assert.exists(domStorageModel);
    assert.exists(storageKeyManager);
    const securityOriginManager = target.model(SDK.SecurityOriginManager.SecurityOriginManager);
    assert.exists(securityOriginManager);
    sinon.stub(securityOriginManager, 'mainSecurityOrigin').returns(SECURITY_ORIGIN);

    const view = new Resources.StorageView.StorageView();
    const container = view.element.shadowRoot?.querySelector('.clear-storage-header') || null;
    assert.instanceOf(container, HTMLDivElement);
    const customQuotaCheckbox =
        container.shadowRoot!.querySelector('.quota-override-row devtools-checkbox')!.shadowRoot!.querySelector(
            '[title="Simulate custom storage quota"]');
    assert.instanceOf(customQuotaCheckbox, HTMLInputElement);
    customQuotaCheckbox.checked = true;
    const errorDiv = container.shadowRoot!.querySelector('.quota-override-error');
    assert.instanceOf(errorDiv, HTMLDivElement);
    assert.strictEqual(errorDiv.textContent, '');

    const editor = container.shadowRoot!.querySelector('.quota-override-notification-editor');
    assert.instanceOf(editor, HTMLInputElement);
    editor.value = '9999999999999';
    dispatchFocusOutEvent(editor);
    await RenderCoordinator.done();
    assert.strictEqual(errorDiv.textContent, 'Number must be smaller than 9,000,000,000,000');
  });

  it('also clears cookies on clear', () => {
    const cookieModel = target.model(SDK.CookieModel.CookieModel)!;
    const clearByOriginSpy = sinon.spy(target.storageAgent(), 'invoke_clearDataForOrigin');
    const cookieClearSpy = sinon.spy(cookieModel, 'clear');

    Resources.StorageView.StorageView.clear(
        target, testKey, SECURITY_ORIGIN, [Protocol.Storage.StorageType.All], false);

    sinon.assert.calledOnceWithExactly(clearByOriginSpy, {origin: SECURITY_ORIGIN, storageTypes: 'cookies'});
    sinon.assert.calledOnceWithExactly(cookieClearSpy, undefined, SECURITY_ORIGIN);
  });

  it('clears cache on clear', async () => {
    const cacheStorageModel = target.model(SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel);
    assert.exists(cacheStorageModel);

    const storageBucketModel = target.model(SDK.StorageBucketsModel.StorageBucketsModel);
    assert.exists(storageBucketModel);

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
      cacheStorageModel.addEventListener(SDK.ServiceWorkerCacheModel.Events.CACHE_ADDED, () => {
        resolve();
      });
    });
    storageBucketModel?.storageBucketCreatedOrUpdated({bucketInfo: testStorageBucketInfo});
    await cacheAddedPromise;
    caches = [];

    Resources.StorageView.StorageView.clear(target, testKey, '', [Protocol.Storage.StorageType.Cache_storage], false);

    assert.isEmpty(cacheStorageModel.caches());
  });

  describe('getStorageTypeName', () => {
    it('returns correct titles for storage types', () => {
      assert.strictEqual(
          Resources.StorageView.StorageView.getStorageTypeName(Protocol.Storage.StorageType.File_systems),
          'File System');
      assert.strictEqual(Resources.StorageView.StorageView.getStorageTypeName(Protocol.Storage.StorageType.Indexeddb),
                         'IndexedDB');
      assert.strictEqual(
          Resources.StorageView.StorageView.getStorageTypeName(Protocol.Storage.StorageType.Cache_storage),
          'Cache storage');
      assert.strictEqual(
          Resources.StorageView.StorageView.getStorageTypeName(Protocol.Storage.StorageType.Service_workers),
          'Service workers');
      assert.strictEqual(Resources.StorageView.StorageView.getStorageTypeName(Protocol.Storage.StorageType.Cookies),
                         'Other');
    });
  });

  describe('getStorageTypeNameForWidget', () => {
    it('returns correct titles for widget storage types', () => {
      assert.strictEqual(Resources.StorageView.StorageView.getStorageTypeNameForWidget('session_storage'),
                         'Session storage');
      assert.strictEqual(Resources.StorageView.StorageView.getStorageTypeNameForWidget('local_storage'),
                         'Local storage');
      assert.strictEqual(Resources.StorageView.StorageView.getStorageTypeNameForWidget('cookies'), 'Cookies');
      assert.strictEqual(Resources.StorageView.StorageView.getStorageTypeNameForWidget('indexeddb'), 'IndexedDB');
      assert.strictEqual(Resources.StorageView.StorageView.getStorageTypeNameForWidget('cache_storage'),
                         'Cache storage');
      assert.strictEqual(Resources.StorageView.StorageView.getStorageTypeNameForWidget('service_workers'),
                         'Service workers');
      assert.strictEqual(Resources.StorageView.StorageView.getStorageTypeNameForWidget('file_systems'), 'File System');
      assert.strictEqual(Resources.StorageView.StorageView.getStorageTypeNameForWidget('unknown'), 'Other');
    });
  });
});
