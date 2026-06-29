// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {
  assertScreenshot,
  getCleanTextContentFromElements,
  getElementWithinComponent,
  renderElementIntoDOM,
} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as RenderCoordinator from '../../ui/components/render_coordinator/render_coordinator.js';
import * as ReportView from '../../ui/components/report_view/report_view.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Application from './application.js';

// Disabled due to flakiness
describeWithEnvironment('[crbug.com/1473557]: IDBDatabaseView', () => {
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

describeWithEnvironment('IDBDataGridNode', () => {
  it('creates a read-only object properties section for value column', async () => {
    const remoteObject = SDK.RemoteObject.RemoteObject.fromLocalObject({foo: 'bar'});
    const node = new Application.IndexedDBViews.IDBDataGridNode({value: remoteObject});

    node.createCell('value');

    assert.exists(node.valueObjectPresentation);
    const rootElement = node.valueObjectPresentation.objectTreeElement();
    await rootElement.onpopulate();
    const child = rootElement.childAt(0);
    assert.instanceOf(child, ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement);
    assert.isFalse(child.editable);
  });
});

describeWithEnvironment('IDBDataView', () => {
  it('renders toolbar and data grid', async () => {
    const model = sinon.createStubInstance(Application.IndexedDBModel.IndexedDBModel);
    model.loadObjectStoreData.callsFake((dbId, storeName, keyRange, skipCount, pageSize, callback) => {
      const key = SDK.RemoteObject.RemoteObject.fromLocalObject('foo');
      const primaryKey = SDK.RemoteObject.RemoteObject.fromLocalObject('foo');
      const value = SDK.RemoteObject.RemoteObject.fromLocalObject('bar');
      callback([{key, primaryKey, value}], false);
    });
    model.getMetadata.resolves({entriesCount: 1, keyGeneratorValue: 0});

    const databaseId = new Application.IndexedDBModel.DatabaseId({storageKey: 'https://example.com'}, 'My Database');

    const objectStore = new Application.IndexedDBModel.ObjectStore('My Object Store', 'key', false);

    const refreshCallback = sinon.spy();

    const component = new Application.IndexedDBViews.IDBDataView(model, databaseId, objectStore, null, refreshCallback);

    renderElementIntoDOM(component, {includeCommonStyles: true});

    // Verify toolbar elements exist
    const toolbar = component.element.querySelector('devtools-toolbar');
    assert.isNotNull(toolbar);

    // Verify datagrid exists
    const dataGrid = component.element.querySelector('.data-grid');
    assert.isNotNull(dataGrid);

    // Verify row rendered
    const rows = dataGrid?.querySelectorAll('.data-grid-data-grid-node');
    assert.strictEqual(rows?.length, 1);

    await assertScreenshot('idb_data_view_baseline.png');
  });
});
