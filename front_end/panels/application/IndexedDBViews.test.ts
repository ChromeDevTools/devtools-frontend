// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {
  getAllRows,
  getCellByIndexes,
  getValuesOfAllBodyRows,
} from '../../testing/DataGridHelpers.js';
import {
  assertScreenshot,
  doubleRaf,
  getCleanTextContentFromElements,
  getElementWithinComponent,
  renderElementIntoDOM,
} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import type * as Buttons from '../../ui/components/buttons/buttons.js';
import * as RenderCoordinator from '../../ui/components/render_coordinator/render_coordinator.js';
import * as ReportView from '../../ui/components/report_view/report_view.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Application from './application.js';

describeWithEnvironment('IDBDatabaseView', () => {
  it('renders with a title and top-level site', async function() {
    if (this.timeout() > 0) {
      this.timeout(10000);
    }

    const databaseId = new Application.IndexedDBModel.DatabaseId(
        {storageKey: 'https://example.com/^0https://example.org'}, 'My Database');
    const database = new Application.IndexedDBModel.Database(databaseId, 1);
    const model = sinon.createStubInstance(Application.IndexedDBModel.IndexedDBModel);
    const target = sinon.createStubInstance(SDK.Target.Target);
    const storageBucketsModel = sinon.createStubInstance(SDK.StorageBucketsModel.StorageBucketsModel);

    model.target.returns(target);
    target.model.withArgs(SDK.StorageBucketsModel.StorageBucketsModel).returns(storageBucketsModel);
    storageBucketsModel.getBucketByName.returns(null);
    const component = new Application.IndexedDBViews.IDBDatabaseView(model, database);
    renderElementIntoDOM(component);

    assert.isNotNull(component.shadowRoot);
    await RenderCoordinator.done({waitForWork: true});
    const report = getElementWithinComponent(component, 'devtools-report', ReportView.ReportView.Report);
    assert.isNotNull(report.shadowRoot);

    const titleElement = report.shadowRoot.querySelector('.report-title');
    assert.strictEqual(titleElement?.textContent, 'My Database');
    const keys = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-key');
    assert.deepEqual(keys, ['Frame origin', 'Top-level site', 'Is third-party', 'Version', 'Object stores']);

    const values = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-value');
    assert.deepEqual(values, [
      'https://example.com',
      'https://example.org',
      'Yes, because the origin is outside of the top-level site',
      '1',
      '0',
    ]);
  });

  it('renders with an opaque storage key', async function() {
    if (this.timeout() > 0) {
      this.timeout(10000);
    }

    const databaseId =
        new Application.IndexedDBModel.DatabaseId({storageKey: 'https://example.com/^112345^267890'}, '');
    const database = new Application.IndexedDBModel.Database(databaseId, 1);
    const model = sinon.createStubInstance(Application.IndexedDBModel.IndexedDBModel);
    const target = sinon.createStubInstance(SDK.Target.Target);
    const storageBucketsModel = sinon.createStubInstance(SDK.StorageBucketsModel.StorageBucketsModel);

    model.target.returns(target);
    target.model.withArgs(SDK.StorageBucketsModel.StorageBucketsModel).returns(storageBucketsModel);
    storageBucketsModel.getBucketByName.returns(null);
    const component = new Application.IndexedDBViews.IDBDatabaseView(model, database);
    renderElementIntoDOM(component);

    assert.isNotNull(component.shadowRoot);
    await RenderCoordinator.done({waitForWork: true});
    const report = getElementWithinComponent(component, 'devtools-report', ReportView.ReportView.Report);
    assert.isNotNull(report.shadowRoot);

    const keys = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-key');
    assert.deepEqual(keys, ['Is third-party', 'Is opaque', 'Version', 'Object stores']);

    const values = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-value');
    assert.deepEqual(values, ['Yes, because the storage key is opaque', 'Yes', '1', '0']);
  });

  it('renders with a storage bucket', async function() {
    if (this.timeout() > 0) {
      this.timeout(10000);
    }

    const databaseId =
        new Application.IndexedDBModel.DatabaseId({storageKey: 'https://example.com/^112345^267890'}, '');
    const database = new Application.IndexedDBModel.Database(databaseId, 1);
    const model = sinon.createStubInstance(Application.IndexedDBModel.IndexedDBModel);
    const target = sinon.createStubInstance(SDK.Target.Target);
    const storageBucketsModel = sinon.createStubInstance(SDK.StorageBucketsModel.StorageBucketsModel);

    model.target.returns(target);
    target.model.withArgs(SDK.StorageBucketsModel.StorageBucketsModel).returns(storageBucketsModel);
    storageBucketsModel.getBucketByName.returns({
      bucket: {storageKey: 'https://example.com/^112345^267890', name: 'My bucket'},
      id: 'my-bucket-id',
      quota: 1024,
      expiration: 42,
      persistent: false,
      durability: Protocol.Storage.StorageBucketsDurability.Strict,
    });
    const component = new Application.IndexedDBViews.IDBDatabaseView(model, database);
    renderElementIntoDOM(component);

    assert.isNotNull(component.shadowRoot);
    await RenderCoordinator.done({waitForWork: true});
    const report = getElementWithinComponent(component, 'devtools-report', ReportView.ReportView.Report);
    assert.isNotNull(report.shadowRoot);

    const keys = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-key');
    assert.deepEqual(keys, [
      'Is third-party',
      'Is opaque',
      'Bucket name',
      'Version',
      'Object stores',
    ]);

    const values = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-value');
    assert.deepEqual(values, [
      'Yes, because the storage key is opaque',
      'Yes',
      'My bucket',
      '1',
      '0',
    ]);
  });

  it('renders only minimal fields for a default bucket', async function() {
    if (this.timeout() > 0) {
      this.timeout(10000);
    }
    const defaultBucketDatabaseId =
        new Application.IndexedDBModel.DatabaseId({storageKey: 'https://example.com/^112345^267890'}, '');
    const defaultBucketDatabase = new Application.IndexedDBModel.Database(defaultBucketDatabaseId, 1);
    const defaultBucketModel = sinon.createStubInstance(Application.IndexedDBModel.IndexedDBModel);
    const target = sinon.createStubInstance(SDK.Target.Target);
    const storageBucketsModel = sinon.createStubInstance(SDK.StorageBucketsModel.StorageBucketsModel);

    defaultBucketModel.target.returns(target);
    target.model.withArgs(SDK.StorageBucketsModel.StorageBucketsModel).returns(storageBucketsModel);
    storageBucketsModel.getBucketByName.returns({
      bucket: {storageKey: 'https://example.com/^112345^267890', name: ''},  // Default bucket
      id: 'default-bucket-id',
      quota: 1024,
      expiration: 42,
      persistent: false,
      durability: Protocol.Storage.StorageBucketsDurability.Strict,
    });
    const defaultBucketComponent =
        new Application.IndexedDBViews.IDBDatabaseView(defaultBucketModel, defaultBucketDatabase);
    renderElementIntoDOM(defaultBucketComponent);

    assert.isNotNull(defaultBucketComponent.shadowRoot);
    await RenderCoordinator.done({waitForWork: true});
    const defaultReport =
        getElementWithinComponent(defaultBucketComponent, 'devtools-report', ReportView.ReportView.Report);
    assert.isNotNull(defaultReport.shadowRoot);

    const defaultKeys = getCleanTextContentFromElements(defaultBucketComponent.shadowRoot, 'devtools-report-key');
    assert.deepEqual(defaultKeys, [
      'Is third-party',
      'Is opaque',
      'Bucket name',
      'Version',
      'Object stores',
    ]);

    const defaultValues = getCleanTextContentFromElements(defaultBucketComponent.shadowRoot, 'devtools-report-value');
    assert.deepEqual(defaultValues, [
      'Yes, because the storage key is opaque',
      'Yes',
      'Default bucket',
      '1',
      '0',
    ]);
  });

  it('renders buttons', async function() {
    if (this.timeout() > 0) {
      this.timeout(10000);
    }

    const databaseId = new Application.IndexedDBModel.DatabaseId({storageKey: ''}, '');
    const database = new Application.IndexedDBModel.Database(databaseId, 1);
    const model = sinon.createStubInstance(Application.IndexedDBModel.IndexedDBModel);
    const target = sinon.createStubInstance(SDK.Target.Target);
    const storageBucketsModel = sinon.createStubInstance(SDK.StorageBucketsModel.StorageBucketsModel);

    model.target.returns(target);
    target.model.withArgs(SDK.StorageBucketsModel.StorageBucketsModel).returns(storageBucketsModel);
    storageBucketsModel.getBucketByName.returns(null);
    const component = new Application.IndexedDBViews.IDBDatabaseView(model, database);
    renderElementIntoDOM(component);

    assert.isNotNull(component.shadowRoot);
    await RenderCoordinator.done({waitForWork: true});

    const buttons = component.shadowRoot.querySelectorAll('devtools-button');
    assert.lengthOf(buttons, 2);
    assert.instanceOf(buttons[0], HTMLElement);
    assert.strictEqual(buttons[0].textContent?.trim(), 'Delete database');
    const showDialog = sinon.stub(UI.UIUtils.ConfirmDialog, 'show').resolves(true);
    buttons[0].click();
    sinon.assert.calledOnce(showDialog);
    await new Promise(resolve => setTimeout(resolve, 0));
    sinon.assert.calledOnceWithExactly(model.deleteDatabase, databaseId);

    assert.instanceOf(buttons[1], HTMLElement);
    assert.strictEqual(buttons[1].textContent?.trim(), 'Refresh database');
    buttons[1].click();
    sinon.assert.calledOnceWithExactly(model.refreshDatabase, databaseId);
  });
});

describeWithEnvironment('IDBDataView', () => {
  async function performActionAndWaitForSettle(component: Application.IndexedDBViews.IDBDataView,
                                               action: () => void|Promise<void>) {
    interface DataViewWithTestHook {
      updatedDataForTests(): void;
    }
    const stub = sinon.stub(component as unknown as DataViewWithTestHook, 'updatedDataForTests');
    const updatedDataPromise = expectCall(stub);

    await action();

    await updatedDataPromise;
    await UI.Widget.Widget.allUpdatesComplete;
    await doubleRaf();
    stub.restore();
  }

  it('creates a read-only object properties section for value column', async () => {
    const model = sinon.createStubInstance(Application.IndexedDBModel.IndexedDBModel);
    model.loadObjectStoreData.callsFake((dbId, storeName, keyRange, skipCount, pageSize, callback) => {
      const entries = [
        {
          key: SDK.RemoteObject.RemoteObject.fromLocalObject(1),
          primaryKey: SDK.RemoteObject.RemoteObject.fromLocalObject(1),
          value: SDK.RemoteObject.RemoteObject.fromLocalObject({foo: 'bar'}),
        },
      ];
      callback(entries, false);
    });
    model.getMetadata.resolves({entriesCount: 1, keyGeneratorValue: 0});

    const databaseId = new Application.IndexedDBModel.DatabaseId({storageKey: 'https://example.com'}, 'My Database');
    const objectStore = new Application.IndexedDBModel.ObjectStore('My Object Store', 'key', false);
    const refreshCallback = sinon.spy();

    const component = new Application.IndexedDBViews.IDBDataView(model, databaseId, objectStore, null, refreshCallback);

    (component.element as HTMLElement).style.height = '500px';
    renderElementIntoDOM(component, {includeCommonStyles: true});

    await performActionAndWaitForSettle(component, () => {
      component.update(objectStore);
    });

    const dataGrid = component.element.querySelector('devtools-data-grid');
    assert.isNotNull(dataGrid);

    const valueCell = getCellByIndexes(dataGrid?.shadowRoot!, {column: 2, row: 1});

    const widgetElement = valueCell.firstElementChild;
    assert.exists(widgetElement);
    const widget = UI.Widget.Widget.get(widgetElement) as Application.IndexedDBViews.ObjectPropertiesSectionWidget;
    assert.isTrue(widget.objectTree?.readOnly);
  });

  it('renders toolbar and data grid', async () => {
    const model = sinon.createStubInstance(Application.IndexedDBModel.IndexedDBModel);
    model.loadObjectStoreData.callsFake((dbId, storeName, keyRange, skipCount, pageSize, callback) => {
      const entries = [
        {
          key: SDK.RemoteObject.RemoteObject.fromLocalObject('string_key'),
          primaryKey: SDK.RemoteObject.RemoteObject.fromLocalObject('string_key'),
          value: SDK.RemoteObject.RemoteObject.fromLocalObject('string_value'),
        },
        {
          key: SDK.RemoteObject.RemoteObject.fromLocalObject(42),
          primaryKey: SDK.RemoteObject.RemoteObject.fromLocalObject(42),
          value: SDK.RemoteObject.RemoteObject.fromLocalObject({name: 'Item', count: 5}),
        },
        {
          key: SDK.RemoteObject.RemoteObject.fromLocalObject('boolean_key'),
          primaryKey: SDK.RemoteObject.RemoteObject.fromLocalObject('boolean_key'),
          value: SDK.RemoteObject.RemoteObject.fromLocalObject(true),
        },
      ];
      callback(entries, false);
    });
    model.getMetadata.resolves({entriesCount: 3, keyGeneratorValue: 0});

    const databaseId = new Application.IndexedDBModel.DatabaseId({storageKey: 'https://example.com'}, 'My Database');

    const objectStore = new Application.IndexedDBModel.ObjectStore('My Object Store', 'key', false);

    const refreshCallback = sinon.spy();

    const component = new Application.IndexedDBViews.IDBDataView(model, databaseId, objectStore, null, refreshCallback);

    renderElementIntoDOM(component, {includeCommonStyles: true});
    component.element.style.height = '200px';
    component.element.style.width = '600px';
    // Wait for async decoration and rendering
    await performActionAndWaitForSettle(component, () => {
      component.update(objectStore);
    });

    // Verify toolbar elements exist
    const toolbar = component.element.querySelector('devtools-toolbar');
    assert.isNotNull(toolbar);

    // Verify datagrid exists
    const dataGrid = component.element.querySelector('devtools-data-grid');
    assert.isNotNull(dataGrid);
    assert.strictEqual(dataGrid.getAttribute('row-height'), 'auto');

    // Verify rows rendered
    const bodyRows = getValuesOfAllBodyRows(dataGrid.shadowRoot!);
    assert.lengthOf(bodyRows, 3);

    await UI.Widget.Widget.allUpdatesComplete;
    await doubleRaf();

    await assertScreenshot('application/idb_data_view_baseline.png');
  });

  it('deletes entry from object store', async () => {
    const model = sinon.createStubInstance(Application.IndexedDBModel.IndexedDBModel);
    model.loadObjectStoreData.callsFake((dbId, storeName, keyRange, skipCount, pageSize, callback) => {
      const entries = [
        {
          key: SDK.RemoteObject.RemoteObject.fromLocalObject('testKey1'),
          primaryKey: SDK.RemoteObject.RemoteObject.fromLocalObject('testKey1'),
          value: SDK.RemoteObject.RemoteObject.fromLocalObject('testValue'),
        },
      ];
      callback(entries, false);
    });
    model.getMetadata.resolves({entriesCount: 1, keyGeneratorValue: 0});

    const databaseId = new Application.IndexedDBModel.DatabaseId({storageKey: 'https://example.com'}, 'My Database');
    const objectStore = new Application.IndexedDBModel.ObjectStore('My Object Store', 'key', false);
    const refreshCallback = sinon.spy();

    const component = new Application.IndexedDBViews.IDBDataView(model, databaseId, objectStore, null, refreshCallback);
    renderElementIntoDOM(component);

    await performActionAndWaitForSettle(component, () => {
      component.update(objectStore);
    });

    const dataGrid = component.element.querySelector('devtools-data-grid');
    assert.isNotNull(dataGrid);
    assert.isNotNull(dataGrid.shadowRoot);

    const dataRows = getAllRows(dataGrid.shadowRoot);
    assert.lengthOf(dataRows, 1);
    dataRows[0].click();

    const buttons = component.element.querySelectorAll<Buttons.Button.Button>('devtools-button');
    const deleteButton = Array.from(buttons).find(b => b.title === 'Delete selected');
    assert.exists(deleteButton, 'Delete button not found');
    assert.isFalse(deleteButton.disabled);

    const deleteEntriesPromise = expectCall(model.deleteEntries);
    deleteButton!.click();
    await deleteEntriesPromise;

    sinon.assert.calledOnce(model.deleteEntries);
    const args = model.deleteEntries.getCall(0).args;
    assert.strictEqual(args[0], databaseId);
    assert.strictEqual(args[1], 'My Object Store');
    assert.strictEqual(args[2].lower, 'testKey1');
    assert.strictEqual(args[2].upper, 'testKey1');

    sinon.assert.calledOnce(refreshCallback);
  });

  it('deletes entry from index', async () => {
    const model = sinon.createStubInstance(Application.IndexedDBModel.IndexedDBModel);
    model.loadIndexData.callsFake((dbId, storeName, indexName, keyRange, skipCount, pageSize, callback) => {
      const entries = [
        {
          key: SDK.RemoteObject.RemoteObject.fromLocalObject('indexKey1'),
          primaryKey: SDK.RemoteObject.RemoteObject.fromLocalObject('primaryKey1'),
          value: SDK.RemoteObject.RemoteObject.fromLocalObject('testValue'),
        },
      ];
      callback(entries, false);
    });
    model.getMetadata.resolves({entriesCount: 1, keyGeneratorValue: 0});

    const databaseId = new Application.IndexedDBModel.DatabaseId({storageKey: 'https://example.com'}, 'My Database');
    const objectStore = new Application.IndexedDBModel.ObjectStore('My Object Store', 'key', false);
    const index = new Application.IndexedDBModel.Index('My Index', 'index_key', false, false);
    const refreshCallback = sinon.spy();

    const component =
        new Application.IndexedDBViews.IDBDataView(model, databaseId, objectStore, index, refreshCallback);
    renderElementIntoDOM(component);

    await performActionAndWaitForSettle(component, () => {
      component.update(objectStore, index);
    });

    const dataGrid = component.element.querySelector('devtools-data-grid');
    assert.isNotNull(dataGrid);
    assert.isNotNull(dataGrid.shadowRoot);

    const dataRows = getAllRows(dataGrid.shadowRoot);
    assert.lengthOf(dataRows, 1);
    dataRows[0].click();

    const buttons = component.element.querySelectorAll<Buttons.Button.Button>('devtools-button');
    const deleteButton = Array.from(buttons).find(b => b.title === 'Delete selected');
    assert.exists(deleteButton, 'Delete button not found');
    assert.isFalse(deleteButton.disabled);

    const deleteEntriesPromise = expectCall(model.deleteEntries);
    deleteButton!.click();
    await deleteEntriesPromise;

    sinon.assert.calledOnce(model.deleteEntries);
    const args = model.deleteEntries.getCall(0).args;
    assert.strictEqual(args[0], databaseId);
    assert.strictEqual(args[1], 'My Object Store');
    assert.strictEqual(args[2].lower, 'primaryKey1');
    assert.strictEqual(args[2].upper, 'primaryKey1');

    sinon.assert.calledOnce(refreshCallback);
  });

  it('shows stale data warning on markNeedsRefresh and hides it after refresh', async () => {
    const model = sinon.createStubInstance(Application.IndexedDBModel.IndexedDBModel);
    model.loadObjectStoreData.callsFake((_dbId, _storeName, _keyRange, _skipCount, _pageSize, callback) => {
      callback([], false);
    });
    model.getMetadata.resolves({entriesCount: 0, keyGeneratorValue: 0});

    const databaseId = new Application.IndexedDBModel.DatabaseId({storageKey: 'https://example.com'}, 'My Database');
    const objectStore = new Application.IndexedDBModel.ObjectStore('My Object Store', 'key', false);
    const refreshCallback = sinon.spy();

    const component = new Application.IndexedDBViews.IDBDataView(model, databaseId, objectStore, null, refreshCallback);
    renderElementIntoDOM(component);

    await performActionAndWaitForSettle(component, () => {
      component.update(objectStore);
    });

    assert.isNull(component.element.querySelector('.stale-data-warning'));

    component.markNeedsRefresh();
    assert.isNotNull(component.element.querySelector('.stale-data-warning'));

    await performActionAndWaitForSettle(component, () => {
      component.refreshData();
    });

    assert.isNull(component.element.querySelector('.stale-data-warning'));
  });
});
