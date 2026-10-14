// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import {
  getValuesOfAllBodyRows,
} from '../../testing/DataGridHelpers.js';
import {assertScreenshot, raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as Application from './application.js';

async function renderSubAppsView(subApps: Application.SubAppsView.SubAppEntry[],
                                 isSiblingSubApps = false): Promise<Application.SubAppsView.SubAppsView> {
  const component = new Application.SubAppsView.SubAppsView();
  component.element.style.display = 'block';
  component.element.style.width = '640px';
  component.element.style.height = '480px';
  component.subApps = subApps;
  component.isSiblingSubApps = isSiblingSubApps;
  renderElementIntoDOM(component);

  await component.updateComplete;
  await raf();

  return component;
}

function getInternalDataGridShadowRoot(component: Application.SubAppsView.SubAppsView): ShadowRoot {
  const dataGrid = component.contentElement.querySelector('devtools-data-grid')!;
  assert.isNotNull(dataGrid);
  assert.isNotNull(dataGrid.shadowRoot);
  return dataGrid.shadowRoot!;
}

describeWithEnvironment('SubAppsView', () => {
  it('renders merged column when manifestId matches startUrl for all items', async () => {
    const subApps: Application.SubAppsView.SubAppEntry[] = [
      {
        name: 'Sub App 1',
        scope: 'https://example.com/app1/',
        manifestId: 'https://example.com/app1/',
        startUrl: 'https://example.com/app1/',
      },
      {
        name: 'Sub App 2',
        scope: 'https://example.com/app2/',
        manifestId: 'https://example.com/app2/',
        startUrl: 'https://example.com/app2/',
      },
    ];

    const component = await renderSubAppsView(subApps);
    const dataGridShadowRoot = getInternalDataGridShadowRoot(component);
    const headerColumns = Array.from(component.contentElement.querySelectorAll('th')).map(th => th.textContent?.trim());
    assert.deepEqual(headerColumns, ['Name', 'Scope', 'Manifest ID / Start URL']);

    const rowValues = getValuesOfAllBodyRows(dataGridShadowRoot);
    assert.deepEqual(rowValues, [
      ['Sub App 1', '/app1/', '/app1/'],
      ['Sub App 2', '/app2/', '/app2/'],
    ]);
  });

  it('renders separate manifestId and startUrl columns when at least one entry differs', async () => {
    const subApps: Application.SubAppsView.SubAppEntry[] = [
      {
        name: 'Sub App 1',
        scope: 'https://example.com/app1/',
        manifestId: 'https://example.com/app1/id',
        startUrl: 'https://example.com/app1/start',
      },
      {
        name: 'Sub App 2',
        scope: 'https://example.com/app2/',
        manifestId: 'https://example.com/app2/',
        startUrl: 'https://example.com/app2/',
      },
    ];

    const component = await renderSubAppsView(subApps);
    const dataGridShadowRoot = getInternalDataGridShadowRoot(component);
    const headerColumns = Array.from(component.contentElement.querySelectorAll('th')).map(th => th.textContent?.trim());
    assert.deepEqual(headerColumns, ['Name', 'Scope', 'Manifest ID', 'Start URL']);

    const rowValues = getValuesOfAllBodyRows(dataGridShadowRoot);
    assert.deepEqual(rowValues, [
      ['Sub App 1', '/app1/', '/app1/id', '/app1/start'],
      ['Sub App 2', '/app2/', '/app2/', '/app2/'],
    ]);
  });

  it('renders accessibility grid role and aria-label for Sub Apps and Sibling Sub Apps', async () => {
    const subApps: Application.SubAppsView.SubAppEntry[] = [
      {
        name: 'Sub App 1',
        scope: 'https://example.com/app1/',
        manifestId: 'https://example.com/app1/',
        startUrl: 'https://example.com/app1/',
      },
    ];

    const component = await renderSubAppsView(subApps, false);
    const heading = component.contentElement.querySelector('.heading');
    assert.strictEqual(heading?.textContent?.trim(), 'Sub Apps');
    const dataGrid = component.contentElement.querySelector('devtools-data-grid');
    assert.isNotNull(dataGrid);
    assert.strictEqual(dataGrid?.getAttribute('role'), 'grid');
    assert.strictEqual(dataGrid?.getAttribute('aria-label'), 'Sub Apps');

    component.isSiblingSubApps = true;
    await component.updateComplete;
    await raf();
    const siblingHeading = component.contentElement.querySelector('.heading');
    assert.strictEqual(siblingHeading?.textContent?.trim(), 'Sibling Sub Apps');
    const siblingGrid = component.contentElement.querySelector('devtools-data-grid');
    assert.strictEqual(siblingGrid?.getAttribute('aria-label'), 'Sibling Sub Apps');
  });

  it('re-renders only when assigned values change', async () => {
    const view = sinon.spy();
    const component = new Application.SubAppsView.SubAppsView(undefined, view);
    renderElementIntoDOM(component);
    const subApps: Application.SubAppsView.SubAppEntry[] = [{
      name: 'Sub App 1',
      scope: 'https://example.com/app1/',
      manifestId: 'https://example.com/app1/',
      startUrl: 'https://example.com/app1/',
    }];
    component.subApps = subApps;
    component.isSiblingSubApps = true;
    await component.updateComplete;
    const renderCount = view.callCount;

    component.subApps = subApps;
    component.isSiblingSubApps = true;
    await component.updateComplete;
    sinon.assert.callCount(view, renderCount);

    component.subApps = [...subApps];
    await component.updateComplete;
    sinon.assert.callCount(view, renderCount + 1);
  });

  describe('view', () => {
    let target!: HTMLElement;

    beforeEach(() => {
      target = document.createElement('div');
      renderElementIntoDOM(target);
      target.style.display = 'flex';
      target.style.width = '640px';
      target.style.height = '200px';
    });

    it('looks fine with merged Manifest ID / Start URL column', async () => {
      Application.SubAppsView.DEFAULT_VIEW({
        subApps: [
          {
            name: 'Sub App 1',
            scope: 'https://example.com/app1/',
            manifestId: 'https://example.com/app1/',
            startUrl: 'https://example.com/app1/',
          },
          {
            name: 'Sub App 2',
            scope: 'https://example.com/app2/',
            manifestId: 'https://example.com/app2/',
            startUrl: 'https://example.com/app2/',
          },
        ],
      },
                                           undefined, target);
      await assertScreenshot('application/sub_apps_view_merged.png');
    });

    it('looks fine with separate Manifest ID and Start URL columns', async () => {
      Application.SubAppsView.DEFAULT_VIEW({
        subApps: [
          {
            name: 'Sub App 1',
            scope: 'https://example.com/app1/',
            manifestId: 'https://example.com/app1/id',
            startUrl: 'https://example.com/app1/start',
          },
          {
            name: 'Sub App 2',
            scope: 'https://example.com/app2/',
            manifestId: 'https://example.com/app2/',
            startUrl: 'https://example.com/app2/',
          },
        ],
        isSiblingSubApps: true,
      },
                                           undefined, target);
      await assertScreenshot('application/sub_apps_view_split.png');
    });
  });
});
