// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  getCleanTextContentFromElements,
  getElementWithinComponent,
  renderElementIntoDOM,
} from '../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../testing/EnvironmentHelpers.js';
import * as Coordinator from '../../ui/components/render_coordinator/render_coordinator.js';
import * as ReportView from '../../ui/components/report_view/report_view.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Application from './application.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

// Disabled due to flakiness
describeWithLocale.skip('[crbug.com/1473557]: IDBDatabaseView', () => {
  it('renders with a title and top-level site', async function() {
    if (this.timeout() > 0) {
      this.timeout(10000);
    }

    const databaseId = new Application.IndexedDBModel.DatabaseId(
        {storageKey: 'https://example.com/^0https://example.org'}, 'My Database');
    const database = new Application.IndexedDBModel.Database(databaseId, 1);
    const model = {
      target: () => ({
        model: () => ({
          getBucketByName: () => null,
        }),
      }),
    } as unknown as Application.IndexedDBModel.IndexedDBModel;
    const component = new Application.IndexedDBViews.IDBDatabaseView(model, database);
    renderElementIntoDOM(component);

    assert.isNotNull(component.shadowRoot);
    await coordinator.done();
    const report = getElementWithinComponent(component, 'devtools-report', ReportView.ReportView.Report);
    assert.isNotNull(report.shadowRoot);

    const titleElement = report.shadowRoot.querySelector('.report-title');
    assert.strictEqual(titleElement?.textContent, 'My Database');
    const keys = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-key');
    assert.deepEqual(keys, ['Origin', 'Top-level site', 'Is third-party', 'Version', 'Object stores']);

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
    const model = {
      target: () => ({
        model: () => ({
          getBucketByName: () => null,
        }),
      }),
    } as unknown as Application.IndexedDBModel.IndexedDBModel;
    const component = new Application.IndexedDBViews.IDBDatabaseView(model, database);
    renderElementIntoDOM(component);

    assert.isNotNull(component.shadowRoot);
    await coordinator.done();
    const report = getElementWithinComponent(component, 'devtools-report', ReportView.ReportView.Report);
    assert.isNotNull(report.shadowRoot);

    const keys = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-key');
    assert.deepEqual(keys, ['Origin', 'Is third-party', 'Is opaque', 'Version', 'Object stores']);

    const values = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-value');
    assert.deepEqual(values, ['https://example.com', 'Yes, because the storage key is opaque', 'Yes', '1', '0']);
  });

  it('renders with a storage bucket', async function() {
    if (this.timeout() > 0) {
      this.timeout(10000);
    }

    const databaseId =
        new Application.IndexedDBModel.DatabaseId({storageKey: 'https://example.com/^112345^267890'}, '');
    const database = new Application.IndexedDBModel.Database(databaseId, 1);
    const model = {
      target: () => ({
        model: () => ({
          getBucketByName: () => ({
            bucket: {storageKey: 'https://example.com/^112345^267890', name: 'My bucket'},
            quota: 1024,
            expiration: 42,
            durability: 'strict',
          }),
        }),
      }),
    } as unknown as Application.IndexedDBModel.IndexedDBModel;
    const component = new Application.IndexedDBViews.IDBDatabaseView(model, database);
    renderElementIntoDOM(component);

    assert.isNotNull(component.shadowRoot);
    await coordinator.done();
    const report = getElementWithinComponent(component, 'devtools-report', ReportView.ReportView.Report);
    assert.isNotNull(report.shadowRoot);

    const keys = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-key');
    assert.deepEqual(keys, [
      'Origin',
      'Is third-party',
      'Is opaque',
      'Bucket name',
      'Is persistent',
      'Durability',
      'Quota',
      'Expiration',
      'Version',
      'Object stores',
    ]);

    const values = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-value');
    assert.deepEqual(values, [
      'https://example.com',
      'Yes, because the storage key is opaque',
      'Yes',
      'My bucket',
      'No',
      'strict',
      '1.0 kB',
      (new Date(42000)).toLocaleString(),
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
    const model = {
      refreshDatabase: sinon.spy(),
      deleteDatabase: sinon.spy(),
      target: () => ({
        model: () => ({
          getBucketByName: () => null,
        }),
      }),
    };
    const component = new Application.IndexedDBViews.IDBDatabaseView(
        model as unknown as Application.IndexedDBModel.IndexedDBModel, database);
    renderElementIntoDOM(component);

    assert.isNotNull(component.shadowRoot);
    await coordinator.done({waitForWork: true});

    const buttons = component.shadowRoot.querySelectorAll('devtools-button');
    assert.strictEqual(buttons.length, 2);
    assert.instanceOf(buttons[0], HTMLElement);
    assert.strictEqual(buttons[0].textContent?.trim(), 'Delete database');
    const showDialog = sinon.stub(UI.UIUtils.ConfirmDialog, 'show').resolves(true);
    buttons[0].click();
    assert.isTrue(showDialog.calledOnce);
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.isTrue(model.deleteDatabase.calledOnceWithExactly(databaseId));

    assert.instanceOf(buttons[1], HTMLElement);
    assert.strictEqual(buttons[1].textContent?.trim(), 'Refresh database');
    buttons[1].click();
    assert.isTrue(model.refreshDatabase.calledOnceWithExactly(databaseId));
  });
});
