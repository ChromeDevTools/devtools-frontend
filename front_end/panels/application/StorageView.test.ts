// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {dispatchFocusOutEvent, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {SECURITY_ORIGIN} from '../../testing/ResourceTreeHelpers.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as RenderCoordinator from '../../ui/components/render_coordinator/render_coordinator.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Resources from './application.js';

describeWithEnvironment('StorageView', () => {
  const testKey = 'test-storage-key';
  let target: SDK.Target.Target;
  let domStorageModel: SDK.DOMStorageModel.DOMStorageModel|null;
  let storageKeyManager: SDK.StorageKeyManager.StorageKeyManager|null;
  let view: Resources.StorageView.StorageView|null = null;

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
    sinon.stub(Common.Throttler.Throttler.prototype, 'schedule').resolves();
  });

  afterEach(() => {
    if (view) {
      SDK.TargetManager.TargetManager.instance().unobserveTargets(view);
      view.detach();
      view = null;
    }
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
    view = new Resources.StorageView.StorageView();

    storageKeyManager.dispatchEventToListeners(
        SDK.StorageKeyManager.Events.MAIN_STORAGE_KEY_CHANGED, {mainStorageKey: testKey});
    const subtitle =
        view.element.shadowRoot?.querySelector('div.flex-auto')?.shadowRoot?.querySelector('div.report-subtitle');
    assert.strictEqual(subtitle?.textContent, testKey);
  });

  it('groups site-data checkboxes into columns and indents third-party cookies under cookies', () => {
    view = new Resources.StorageView.StorageView();
    renderElementIntoDOM(view);
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

    view = new Resources.StorageView.StorageView();
    renderElementIntoDOM(view);
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

  for (const checked of [true, false]) {
    it(`${checked ? 'includes' : 'excludes'} file systems when the checkbox is ${checked ? 'checked' : 'unchecked'}`,
        async () => {
          assert.exists(storageKeyManager);
          const securityOriginManager = target.model(SDK.SecurityOriginManager.SecurityOriginManager);
          assert.exists(securityOriginManager);

          sinon.stub(securityOriginManager, 'mainSecurityOrigin').returns(SECURITY_ORIGIN);
          sinon.stub(storageKeyManager, 'mainStorageKey').returns(testKey);

          const clearDataStub = sinon.stub(target.storageAgent(), 'invoke_clearDataForStorageKey');

          const view = new Resources.StorageView.StorageView();
          renderElementIntoDOM(view);
          try {
            await RenderCoordinator.done();

            const container = view.element.shadowRoot?.querySelector('.clear-storage-header') || null;
            assert.instanceOf(container, HTMLDivElement);

            const checkbox = container.shadowRoot!.querySelector('.file-systems-checkbox');
            assert.instanceOf(checkbox, HTMLElement);

            const input = checkbox.shadowRoot!.querySelector('input');
            assert.instanceOf(input, HTMLInputElement);
            assert.isTrue(input.checked);

            if (!checked) {
              checkbox.click();
              await RenderCoordinator.done();
            }
            assert.strictEqual(input.checked, checked);

            const clearButton = container.shadowRoot!.querySelector('#storage-view-clear-button');
            assert.instanceOf(clearButton, HTMLElement);
            clearButton.click();

            sinon.assert.calledOnce(clearDataStub);
            const request = clearDataStub.firstCall.args[0];
            assert.strictEqual(request.storageKey, testKey);

            const storageTypes = request.storageTypes.split(',');
            if (checked) {
              assert.include(storageTypes, Protocol.Storage.StorageType.File_systems);
            } else {
              assert.notInclude(storageTypes, Protocol.Storage.StorageType.File_systems);
            }
          } finally {
            view.detach();
          }
        });
  }

  it('shows a warning message when entering a too big custom quota', async () => {
    assert.exists(domStorageModel);
    assert.exists(storageKeyManager);
    const securityOriginManager = target.model(SDK.SecurityOriginManager.SecurityOriginManager);
    assert.exists(securityOriginManager);
    sinon.stub(securityOriginManager, 'mainSecurityOrigin').returns(SECURITY_ORIGIN);

    view = new Resources.StorageView.StorageView();
    renderElementIntoDOM(view);
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

  describe('usage and quota', () => {
    function stubUsageAndQuota(response: Partial<Protocol.Storage.GetUsageAndQuotaResponse>): sinon
        .SinonStub<[Protocol.Storage.GetUsageAndQuotaRequest], Promise<Protocol.Storage.GetUsageAndQuotaResponse>> {
      const securityOriginManager = target.model(SDK.SecurityOriginManager.SecurityOriginManager);
      assert.exists(securityOriginManager);
      sinon.stub(securityOriginManager, 'mainSecurityOrigin').returns(SECURITY_ORIGIN);
      return sinon.stub(target.storageAgent(), 'invoke_getUsageAndQuota').resolves({
        usage: 0,
        quota: 0,
        overrideActive: false,
        usageBreakdown: [],
        getError: () => undefined,
        ...response,
      } as Protocol.Storage.GetUsageAndQuotaResponse);
    }

    async function renderAndAwaitUsage(getUsageStub: sinon.SinonStub): Promise<ShadowRoot> {
      view = new Resources.StorageView.StorageView();
      renderElementIntoDOM(view);
      await Promise.all(getUsageStub.returnValues);
      await RenderCoordinator.done();
      const container = view.element.shadowRoot?.querySelector('.clear-storage-header') || null;
      assert.instanceOf(container, HTMLDivElement);
      assert.exists(container.shadowRoot);
      return container.shadowRoot;
    }

    it('renders the usage row and pie chart breakdown', async () => {
      const getUsageStub = stubUsageAndQuota({
        usage: 1000,
        quota: 200_000_000,
        usageBreakdown: [
          {storageType: Protocol.Storage.StorageType.Cache_storage, usage: 400},
          {storageType: Protocol.Storage.StorageType.Indexeddb, usage: 600},
          {storageType: Protocol.Storage.StorageType.Service_workers, usage: 0},
        ],
      });
      const shadowRoot = await renderAndAwaitUsage(getUsageStub);

      const quotaRow = shadowRoot.querySelector('.quota-usage-row');
      assert.instanceOf(quotaRow, HTMLElement);
      assert.strictEqual(quotaRow.textContent?.trim(), '1.0\u00A0kB used out of 200\u00A0MB storage quota');
      assert.strictEqual(quotaRow.title, '1,000 bytes used out of 200,000,000 bytes storage quota');
      assert.isNull(quotaRow.querySelector('b'), 'Expected no custom quota marker');
      assert.isNull(quotaRow.querySelector('devtools-icon'), 'Expected no limited quota icon');

      const pieChart = shadowRoot.querySelector('.usage-breakdown-row devtools-perf-piechart');
      assert.instanceOf(pieChart, PerfUI.PieChart.PieChart);
      assert.strictEqual(pieChart.data.total, 1000);
      assert.deepEqual(pieChart.data.slices.map(({title, value}) => ({title, value})), [
        {title: 'IndexedDB', value: 600},
        {title: 'Cache storage', value: 400},
      ]);
    });

    it('marks the quota as custom when an override is active', async () => {
      const getUsageStub = stubUsageAndQuota({usage: 500, quota: 1000, overrideActive: true});
      const shadowRoot = await renderAndAwaitUsage(getUsageStub);

      const quotaRow = shadowRoot.querySelector('.quota-usage-row');
      assert.instanceOf(quotaRow, HTMLElement);
      const customMarker = quotaRow.querySelector('b');
      assert.instanceOf(customMarker, HTMLElement);
      assert.strictEqual(customMarker.textContent, '1.0\u00A0kB (custom)');
      assert.isNull(quotaRow.querySelector('devtools-icon'), 'Expected no limited quota icon');
    });

    it('shows a limited quota icon for small quotas without an override', async () => {
      const getUsageStub = stubUsageAndQuota({usage: 500, quota: 1000, overrideActive: false});
      const shadowRoot = await renderAndAwaitUsage(getUsageStub);

      const icon = shadowRoot.querySelector('.quota-usage-row devtools-icon');
      assert.instanceOf(icon, HTMLElement);
      assert.strictEqual(icon.title, 'Storage quota is limited in Incognito mode');
    });

    it('clears the usage row when the request fails', async () => {
      const getUsageStub = stubUsageAndQuota({getError: () => 'boom'});
      const shadowRoot = await renderAndAwaitUsage(getUsageStub);

      const quotaRow = shadowRoot.querySelector('.quota-usage-row');
      assert.instanceOf(quotaRow, HTMLElement);
      assert.strictEqual(quotaRow.textContent, '');
      const pieChart = shadowRoot.querySelector('.usage-breakdown-row devtools-perf-piechart');
      assert.instanceOf(pieChart, PerfUI.PieChart.PieChart);
      assert.strictEqual(pieChart.data.total, 0);
      assert.isEmpty(pieChart.data.slices);
    });
  });

  describe('quota override', () => {
    function setUpOverrideView(): {shadowRoot: ShadowRoot, overrideStub: sinon.SinonStub} {
      const securityOriginManager = target.model(SDK.SecurityOriginManager.SecurityOriginManager);
      assert.exists(securityOriginManager);
      sinon.stub(securityOriginManager, 'mainSecurityOrigin').returns(SECURITY_ORIGIN);
      const overrideStub = sinon.stub(target.storageAgent(), 'invoke_overrideQuotaForOrigin').resolves({
        getError: () => undefined,
      });

      view = new Resources.StorageView.StorageView();
      renderElementIntoDOM(view);
      const container = view.element.shadowRoot?.querySelector('.clear-storage-header') || null;
      assert.instanceOf(container, HTMLDivElement);
      assert.exists(container.shadowRoot);
      return {shadowRoot: container.shadowRoot, overrideStub};
    }

    it('toggles the override editor and applies the quota in megabytes', async () => {
      const {shadowRoot, overrideStub} = setUpOverrideView();
      const controlRow = shadowRoot.querySelector('.quota-override-notification-editor')?.parentElement;
      assert.instanceOf(controlRow, HTMLElement);
      assert.isTrue(controlRow.classList.contains('hidden'));

      const checkbox = shadowRoot.querySelector<HTMLElement>('.quota-override-row devtools-checkbox');
      assert.instanceOf(checkbox, HTMLElement);
      checkbox.click();
      assert.isFalse(controlRow.classList.contains('hidden'));

      const editor = shadowRoot.querySelector('.quota-override-notification-editor');
      assert.instanceOf(editor, HTMLInputElement);
      editor.value = '1.5';
      dispatchFocusOutEvent(editor);
      await RenderCoordinator.done();

      sinon.assert.calledOnceWithExactly(overrideStub, {origin: SECURITY_ORIGIN, quotaSize: 1_500_000});
      assert.strictEqual(editor.value, '1.5');
      const errorDiv = shadowRoot.querySelector('.quota-override-error');
      assert.instanceOf(errorDiv, HTMLDivElement);
      assert.strictEqual(errorDiv.textContent, '');
    });

    it('clears the override when the editor is emptied', async () => {
      const {shadowRoot, overrideStub} = setUpOverrideView();
      const checkbox = shadowRoot.querySelector<HTMLElement>('.quota-override-row devtools-checkbox');
      assert.instanceOf(checkbox, HTMLElement);
      checkbox.click();

      const editor = shadowRoot.querySelector('.quota-override-notification-editor');
      assert.instanceOf(editor, HTMLInputElement);
      editor.value = '';
      dispatchFocusOutEvent(editor);
      await RenderCoordinator.done();
      sinon.assert.calledOnceWithExactly(overrideStub, {origin: SECURITY_ORIGIN});
    });

    it('clears the override and hides controls when the checkbox is unchecked', async () => {
      const {shadowRoot, overrideStub} = setUpOverrideView();
      const checkbox = shadowRoot.querySelector<HTMLElement>('.quota-override-row devtools-checkbox');
      assert.instanceOf(checkbox, HTMLElement);
      checkbox.click();

      const editor = shadowRoot.querySelector('.quota-override-notification-editor');
      assert.instanceOf(editor, HTMLInputElement);
      const controlRow = editor.parentElement;
      assert.instanceOf(controlRow, HTMLElement);
      assert.isFalse(controlRow.classList.contains('hidden'));

      checkbox.click();
      await RenderCoordinator.done();
      sinon.assert.calledOnceWithExactly(overrideStub, {origin: SECURITY_ORIGIN});
      assert.isTrue(controlRow.classList.contains('hidden'));
    });

    it('rejects negative quotas', async () => {
      const {shadowRoot, overrideStub} = setUpOverrideView();
      const editor = shadowRoot.querySelector('.quota-override-notification-editor');
      assert.instanceOf(editor, HTMLInputElement);
      const errorDiv = shadowRoot.querySelector('.quota-override-error');
      assert.instanceOf(errorDiv, HTMLDivElement);

      editor.value = '-1';
      dispatchFocusOutEvent(editor);
      await RenderCoordinator.done();
      assert.strictEqual(errorDiv.textContent, 'Number must be non-negative');
      sinon.assert.notCalled(overrideStub);
    });

    it('rejects non-numeric quotas', async () => {
      const {shadowRoot, overrideStub} = setUpOverrideView();
      const editor = shadowRoot.querySelector('.quota-override-notification-editor');
      assert.instanceOf(editor, HTMLInputElement);
      const errorDiv = shadowRoot.querySelector('.quota-override-error');
      assert.instanceOf(errorDiv, HTMLDivElement);

      editor.value = 'abc';
      dispatchFocusOutEvent(editor);
      await RenderCoordinator.done();
      assert.strictEqual(errorDiv.textContent, 'Enter a number');
      sinon.assert.notCalled(overrideStub);
    });
  });

  it('disables the clear button and announces while clearing', () => {
    assert.exists(storageKeyManager);
    const securityOriginManager = target.model(SDK.SecurityOriginManager.SecurityOriginManager);
    assert.exists(securityOriginManager);
    sinon.stub(securityOriginManager, 'mainSecurityOrigin').returns(SECURITY_ORIGIN);
    sinon.stub(storageKeyManager, 'mainStorageKey').returns(testKey);
    sinon.stub(target.storageAgent(), 'invoke_clearDataForStorageKey');
    const alertStub = sinon.stub(UI.ARIAUtils.LiveAnnouncer, 'alert');

    view = new Resources.StorageView.StorageView();
    renderElementIntoDOM(view);
    const container = view.element.shadowRoot?.querySelector('.clear-storage-header') || null;
    assert.instanceOf(container, HTMLDivElement);
    assert.exists(container.shadowRoot);
    const clearButton = container.shadowRoot.querySelector('#storage-view-clear-button');
    assert.instanceOf(clearButton, Buttons.Button.Button);

    const clock = sinon.useFakeTimers();
    try {
      clearButton.click();
      assert.isTrue(clearButton.disabled);
      assert.strictEqual(clearButton.textContent, 'Clearing…');
      sinon.assert.calledOnceWithExactly(alertStub, 'Site data cleared');

      clock.tick(500);
      assert.isFalse(clearButton.disabled);
      assert.strictEqual(clearButton.textContent, 'Clear selected');
    } finally {
      clock.restore();
    }
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
          'File system');
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
      assert.strictEqual(Resources.StorageView.StorageView.getStorageTypeNameForWidget('file_systems'), 'File system');
      assert.strictEqual(Resources.StorageView.StorageView.getStorageTypeNameForWidget('unknown'), 'Other');
    });
  });
});
