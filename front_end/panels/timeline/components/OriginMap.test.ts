// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../core/sdk/sdk.js';
import * as CrUXManager from '../../../models/crux-manager/crux-manager.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithMockConnection} from '../../../testing/MockConnection.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../../ui/legacy/legacy.js';

import * as Components from './components.js';

function getOriginMappings(view: Element): Array<[string, string, string?]> {
  const rows = view.querySelector('.vbox')!.shadowRoot!.querySelectorAll('.origin-mapping-row:not(.header)');
  return Array.from(rows).map(row => {
    const warning = row.querySelector<HTMLElement>('.origin-warning-icon');
    return [
      row.querySelector('.development-origin .origin')!.textContent || '',
      row.querySelector('.production-origin .origin')!.textContent || '',
      warning?.title,
    ];
  });
}

function getDevInput(view: Element): HTMLInputElement|null {
  return view.querySelector('.vbox')!.shadowRoot!.querySelector('.development-origin-input input');
}

function getProdInput(view: Element): HTMLInputElement|null {
  return view.querySelector('.vbox')!.shadowRoot!.querySelector('.production-origin-input input');
}

function getConfirmButton(view: Element): HTMLElementTagNameMap['devtools-button']|null {
  const buttons = view.querySelector('.vbox')!.shadowRoot!.querySelectorAll('devtools-button');
  return Array.from(buttons).find(b => b.textContent === 'Add') || null;
}

function getCancelButton(view: Element): HTMLElementTagNameMap['devtools-button']|null {
  const buttons = view.querySelector('.vbox')!.shadowRoot!.querySelectorAll('devtools-button');
  return Array.from(buttons).find(b => b.textContent === 'Cancel') || null;
}

function getValidationErrors(view: Element): string {
  const errors =
      view.querySelector('.vbox')!.shadowRoot!.querySelector<HTMLElement>('.list-widget-input-validation-error');
  return errors?.innerText || '';
}

function mockResponse(): CrUXManager.CrUXResponse {
  return {
    record: {
      key: {},
      metrics: {
        largest_contentful_paint: {
          histogram: [
            {start: 0, end: 2500, density: 0.5},
            {start: 2500, end: 4000, density: 0.3},
            {start: 4000, density: 0.2},
          ],
          percentiles: {p75: 1000},
        },
        cumulative_layout_shift: {
          histogram: [
            {start: 0, end: 0.1, density: 0.1},
            {start: 0.1, end: 0.25, density: 0.1},
            {start: 0.25, density: 0.8},
          ],
          percentiles: {p75: 0.25},
        },
      },
      collectionPeriod: {
        firstDate: {year: 2024, month: 1, day: 1},
        lastDate: {year: 2024, month: 1, day: 29},
      },
    },
  };
}

function createOriginMap(): Components.OriginMap.OriginMap {
  const root = document.createElement('div');
  renderElementIntoDOM(root);

  const widget = new UI.Widget.Widget();
  widget.markAsRoot();
  widget.show(root);

  const view = new Components.OriginMap.OriginMap();
  widget.contentElement.append(view);

  return view;
}

describeWithMockConnection('OriginMap', () => {
  let cruxManager: CrUXManager.CrUXManager;
  let targetManager: SDK.TargetManager.TargetManager;
  let mockFieldData: CrUXManager.PageResult;
  let getFieldDataStub: sinon.SinonStub;
  let mockInspectedURL: sinon.SinonStub;

  beforeEach(async () => {
    cruxManager = CrUXManager.CrUXManager.instance({forceNew: true});
    targetManager = SDK.TargetManager.TargetManager.instance({forceNew: true});
    getFieldDataStub = sinon.stub(cruxManager, 'getFieldDataForPage').callsFake(async () => mockFieldData);
    mockInspectedURL = sinon.stub(targetManager, 'inspectedURL').returns('http://localhost:8080');

    mockFieldData = {
      'origin-ALL': mockResponse(),
      'origin-DESKTOP': null,
      'origin-PHONE': null,
      'origin-TABLET': null,
      'url-ALL': null,
      'url-DESKTOP': null,
      'url-PHONE': null,
      'url-TABLET': null,
      warnings: [],
    };

    cruxManager.getConfigSetting().set({enabled: true, override: ''});
  });

  afterEach(async () => {
    getFieldDataStub.restore();
    mockInspectedURL.restore();
  });

  it('should show mappings from setting', async () => {
    cruxManager.getConfigSetting().set({
      enabled: true,
      override: '',
      originMappings: [
        {developmentOrigin: 'http://localhost:8080', productionOrigin: 'https://example.com'},
      ],
    });
    const view = createOriginMap();
    await RenderCoordinator.done();

    const mappings = getOriginMappings(view);
    assert.deepEqual(mappings, [
      ['http://localhost:8080', 'https://example.com', undefined],
    ]);
  });

  it('should show warning if there is no field data', async () => {
    mockFieldData['origin-ALL'] = null;
    cruxManager.getConfigSetting().set({
      enabled: true,
      override: '',
      originMappings: [
        {developmentOrigin: 'http://localhost:8080', productionOrigin: 'https://no-data.com'},
      ],
    });
    const view = createOriginMap();
    await RenderCoordinator.done();

    const mappings = getOriginMappings(view);
    assert.deepEqual(mappings, [
      [
        'http://localhost:8080',
        'https://no-data.com',
        'The Chrome UX Report does not have sufficient real user data for this page.',
      ],
    ]);
  });

  it('should not show warning if field is disabled', async () => {
    mockFieldData['origin-ALL'] = null;
    cruxManager.getConfigSetting().set({
      enabled: false,
      override: '',
      originMappings: [
        {developmentOrigin: 'http://localhost:8080', productionOrigin: 'https://no-data.com'},
      ],
    });
    const view = createOriginMap();
    await RenderCoordinator.done();

    const mappings = getOriginMappings(view);
    assert.deepEqual(mappings, [
      ['http://localhost:8080', 'https://no-data.com', undefined],
    ]);
  });

  it('should react to setting changes', async () => {
    cruxManager.getConfigSetting().set({
      enabled: true,
      override: '',
      originMappings: [
        {developmentOrigin: 'http://localhost:8080', productionOrigin: 'https://example.com'},
      ],
    });
    const view = createOriginMap();
    await RenderCoordinator.done();

    {
      const mappings = getOriginMappings(view);
      assert.deepEqual(mappings, [
        ['http://localhost:8080', 'https://example.com', undefined],
      ]);
    }

    cruxManager.getConfigSetting().set({
      enabled: true,
      override: '',
      originMappings: [
        {developmentOrigin: 'http://localhost:8080', productionOrigin: 'https://example.com'},
        {developmentOrigin: 'http://localhost:8081', productionOrigin: 'https://example2.com'},
      ],
    });
    await RenderCoordinator.done();

    {
      const mappings = getOriginMappings(view);
      assert.deepEqual(mappings, [
        ['http://localhost:8080', 'https://example.com', undefined],
        ['http://localhost:8081', 'https://example2.com', undefined],
      ]);
    }
  });

  it('should pre-fill new mapping fields', async () => {
    const originMap = createOriginMap();
    originMap.startCreation();
    await RenderCoordinator.done();

    const devInput = getDevInput(originMap)!;
    assert.strictEqual(devInput.value, 'http://localhost:8080');

    const prodInput = getProdInput(originMap)!;
    assert.strictEqual(prodInput.value, '');
  });

  it('should accept new entries', async () => {
    const originMap = createOriginMap();
    originMap.startCreation();
    await RenderCoordinator.done();

    const devInput = getDevInput(originMap)!;
    devInput.value = 'http://localhost:8080';
    devInput.dispatchEvent(new Event('input'));

    const prodInput = getProdInput(originMap)!;
    prodInput.value = 'https://example.com';
    prodInput.dispatchEvent(new Event('input'));

    await RenderCoordinator.done();

    getConfirmButton(originMap)!.click();

    await RenderCoordinator.done();

    const mappings = getOriginMappings(originMap);
    assert.deepEqual(mappings, [
      ['http://localhost:8080', 'https://example.com', undefined],
    ]);
  });

  it('should ignore cancelled entries', async () => {
    const originMap = createOriginMap();
    originMap.startCreation();
    await RenderCoordinator.done();

    const devInput = getDevInput(originMap)!;
    devInput.value = 'http://localhost:8080';
    devInput.dispatchEvent(new Event('input'));

    const prodInput = getProdInput(originMap)!;
    prodInput.value = 'https://example.com';
    prodInput.dispatchEvent(new Event('input'));

    await RenderCoordinator.done();

    getCancelButton(originMap)!.click();

    await RenderCoordinator.done();

    const mappings = getOriginMappings(originMap);
    assert.deepEqual(mappings, []);
    assert.isNull(getDevInput(originMap));
    assert.isNull(getProdInput(originMap));
  });

  it('should coerce inputs to origin values', async () => {
    const originMap = createOriginMap();
    originMap.startCreation();
    await RenderCoordinator.done();

    const devInput = getDevInput(originMap)!;
    devInput.value = 'http://localhost:8080/path/to/something';
    devInput.dispatchEvent(new Event('input'));

    const prodInput = getProdInput(originMap)!;
    prodInput.value = 'https://example.com?hello';
    prodInput.dispatchEvent(new Event('input'));

    await RenderCoordinator.done();

    getConfirmButton(originMap)!.click();

    await RenderCoordinator.done();

    const mappings = getOriginMappings(originMap);
    assert.deepEqual(mappings, [
      ['http://localhost:8080', 'https://example.com', undefined],
    ]);
  });

  it('should show errors from invalid origins', async () => {
    const originMap = createOriginMap();
    originMap.startCreation();
    await RenderCoordinator.done();

    const devInput = getDevInput(originMap)!;
    devInput.value = 'bad-origin';
    devInput.dispatchEvent(new Event('input'));

    const prodInput = getProdInput(originMap)!;
    prodInput.value = 'jj**Sdafsdf';
    prodInput.dispatchEvent(new Event('input'));

    await RenderCoordinator.done();

    const errors = getValidationErrors(originMap);
    assert.deepEqual(errors, '"bad-origin" is not a valid origin or URL.\n"jj**Sdafsdf" is not a valid origin or URL.');

    const confirmButton = getConfirmButton(originMap);
    assert.isTrue(confirmButton!.shadowRoot?.querySelector('button')!.disabled);
  });

  it('should show warning for duplicate dev origin', async () => {
    cruxManager.getConfigSetting().set({
      enabled: true,
      override: '',
      originMappings: [
        {developmentOrigin: 'http://localhost:8080', productionOrigin: 'https://example.com'},
      ],
    });

    const originMap = createOriginMap();
    originMap.startCreation();
    await RenderCoordinator.done();

    const devInput = getDevInput(originMap)!;
    devInput.value = 'http://localhost:8080';
    devInput.dispatchEvent(new Event('input'));

    const prodInput = getProdInput(originMap)!;
    prodInput.value = 'https://example2.com';
    prodInput.dispatchEvent(new Event('input'));

    await RenderCoordinator.done();

    const errors = getValidationErrors(originMap);
    assert.deepEqual(errors, '"http://localhost:8080" is already mapped to a production origin.');

    const confirmButton = getConfirmButton(originMap);
    assert.isFalse(confirmButton!.shadowRoot?.querySelector('button')!.disabled);
  });
});
