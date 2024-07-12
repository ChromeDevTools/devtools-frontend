// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as CrUXManager from '../../../models/crux-manager/crux-manager.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithMockConnection} from '../../../testing/MockConnection.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';

import * as Components from './components.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const OPEN_BUTTON_SELECTOR = 'devtools-button';
const ENABLE_BUTTON_SELECTOR = 'devtools-button[jslogcontext="field-data-enable"]';
const DISABLE_BUTTON_SELECTOR = 'devtools-button[jslogcontext="field-data-disable"]';
const OVERRIDE_CHECKBOX_SELECTOR = 'input[type="checkbox"]';
const OVERRIDE_TEXT_SELECTOR = 'input[type="text"]';

function mockResponse(): CrUXManager.CrUXResponse {
  return {
    record: {
      key: {},
      metrics: {
        'largest_contentful_paint': {
          histogram: [
            {start: 0, end: 2500, density: 0.5},
            {start: 2500, end: 4000, density: 0.3},
            {start: 4000, density: 0.2},
          ],
          percentiles: {p75: 1000},
        },
        'cumulative_layout_shift': {
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

describeWithMockConnection('FieldSettingsDialog', () => {
  let cruxManager: CrUXManager.CrUXManager;
  let mockFieldData: CrUXManager.PageResult;
  let getFieldDataStub: sinon.SinonStub;

  beforeEach(async () => {
    cruxManager = CrUXManager.CrUXManager.instance({forceNew: true});
    getFieldDataStub = sinon.stub(cruxManager, 'getFieldDataForPage').callsFake(async () => mockFieldData);

    mockFieldData = {
      'origin-ALL': null,
      'origin-DESKTOP': null,
      'origin-PHONE': null,
      'origin-TABLET': null,
      'url-ALL': null,
      'url-DESKTOP': null,
      'url-PHONE': null,
      'url-TABLET': null,
    };

    cruxManager.getConfigSetting().set({enabled: false, override: ''});
  });

  afterEach(async () => {
    getFieldDataStub.restore();
  });

  it('should enable field when enable button clicked', async () => {
    const view = new Components.FieldSettingsDialog.FieldSettingsDialog();
    renderElementIntoDOM(view);
    await coordinator.done();

    assert.isFalse(cruxManager.getConfigSetting().get().enabled);

    const openButton = view.shadowRoot!.querySelector(OPEN_BUTTON_SELECTOR) as HTMLElement;
    assert.strictEqual(openButton.innerText, 'Set up');
    openButton.click();

    await coordinator.done();

    view.shadowRoot!.querySelector<HTMLElement>(ENABLE_BUTTON_SELECTOR)!.click();

    await coordinator.done();

    assert.isFalse(view.shadowRoot!.querySelector('devtools-dialog')!.shadowRoot!.querySelector('dialog')!.open);
    assert.isTrue(cruxManager.getConfigSetting().get().enabled);
  });

  it('should disable field data when disable button clicked', async () => {
    cruxManager.getConfigSetting().set({enabled: true, override: ''});

    const view = new Components.FieldSettingsDialog.FieldSettingsDialog();
    renderElementIntoDOM(view);
    await coordinator.done();

    const openButton = view.shadowRoot!.querySelector(OPEN_BUTTON_SELECTOR) as HTMLElement;
    assert.strictEqual(openButton.innerText, 'Configure');
    openButton.click();

    await coordinator.done();

    const disableButton = view.shadowRoot!.querySelector(DISABLE_BUTTON_SELECTOR) as HTMLElement;
    assert.strictEqual(disableButton.innerText, 'Opt out');
    disableButton.click();

    await coordinator.done();

    assert.isFalse(view.shadowRoot!.querySelector('devtools-dialog')!.shadowRoot!.querySelector('dialog')!.open);
    assert.isFalse(cruxManager.getConfigSetting().get().enabled);
  });

  it('should set URL override on enable', async () => {
    mockFieldData['url-ALL'] = mockResponse();

    const view = new Components.FieldSettingsDialog.FieldSettingsDialog();
    renderElementIntoDOM(view);
    await coordinator.done();

    view.shadowRoot!.querySelector<HTMLElement>(OPEN_BUTTON_SELECTOR)!.click();

    await coordinator.done();

    view.shadowRoot!.querySelector<HTMLElement>(OVERRIDE_CHECKBOX_SELECTOR)!.click();

    await coordinator.done();

    const urlOverride = view.shadowRoot!.querySelector(OVERRIDE_TEXT_SELECTOR) as HTMLInputElement;
    urlOverride.value = 'https://example.com';
    urlOverride.dispatchEvent(new Event('change'));

    await coordinator.done();

    view.shadowRoot!.querySelector<HTMLElement>(ENABLE_BUTTON_SELECTOR)!.click();

    await coordinator.done({waitForWork: true});

    assert.isFalse(view.shadowRoot!.querySelector('devtools-dialog')!.shadowRoot!.querySelector('dialog')!.open);
    assert.isTrue(cruxManager.getConfigSetting().get().enabled);
    assert.strictEqual(cruxManager.getConfigSetting().get().override, 'https://example.com');
  });

  it('should still set URL override on disable', async () => {
    mockFieldData['url-ALL'] = mockResponse();

    const view = new Components.FieldSettingsDialog.FieldSettingsDialog();
    renderElementIntoDOM(view);
    await coordinator.done();

    view.shadowRoot!.querySelector<HTMLElement>(OPEN_BUTTON_SELECTOR)!.click();

    await coordinator.done();

    view.shadowRoot!.querySelector<HTMLElement>(OVERRIDE_CHECKBOX_SELECTOR)!.click();

    await coordinator.done();

    const urlOverride = view.shadowRoot!.querySelector(OVERRIDE_TEXT_SELECTOR) as HTMLInputElement;
    urlOverride.value = 'https://example.com';
    urlOverride.dispatchEvent(new Event('change'));

    await coordinator.done();

    view.shadowRoot!.querySelector<HTMLElement>(DISABLE_BUTTON_SELECTOR)!.click();

    await coordinator.done({waitForWork: true});

    assert.isFalse(view.shadowRoot!.querySelector('devtools-dialog')!.shadowRoot!.querySelector('dialog')!.open);
    assert.isFalse(cruxManager.getConfigSetting().get().enabled);
    assert.strictEqual(cruxManager.getConfigSetting().get().override, 'https://example.com');
  });

  it('should show message for URL override with no data', async () => {
    const view = new Components.FieldSettingsDialog.FieldSettingsDialog();
    renderElementIntoDOM(view);
    await coordinator.done();

    view.shadowRoot!.querySelector<HTMLElement>(OPEN_BUTTON_SELECTOR)!.click();

    await coordinator.done();

    view.shadowRoot!.querySelector<HTMLElement>(OVERRIDE_CHECKBOX_SELECTOR)!.click();

    await coordinator.done();

    const urlOverride = view.shadowRoot!.querySelector(OVERRIDE_TEXT_SELECTOR) as HTMLInputElement;
    urlOverride.value = 'https://example.com';
    urlOverride.dispatchEvent(new Event('change'));

    await coordinator.done();

    view.shadowRoot!.querySelector<HTMLElement>(ENABLE_BUTTON_SELECTOR)!.click();

    await coordinator.done({waitForWork: true});

    assert.strictEqual(
        view.shadowRoot!.querySelector('.warning')!.textContent,
        'The Chrome UX Report does not have sufficient real-world speed data for this page.');

    assert.isTrue(view.shadowRoot!.querySelector('devtools-dialog')!.shadowRoot!.querySelector('dialog')!.open);
    assert.isFalse(cruxManager.getConfigSetting().get().enabled);
    assert.strictEqual(cruxManager.getConfigSetting().get().override, '');
  });
});
