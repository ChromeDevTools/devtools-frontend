// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as CrUXManager from '../../../models/crux-manager/crux-manager.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithMockConnection} from '../../../testing/MockConnection.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../../ui/legacy/legacy.js';

import * as Components from './components.js';

const OPEN_BUTTON_SELECTOR = 'devtools-button';
const ENABLE_BUTTON_SELECTOR = 'devtools-button[data-field-data-enable]';
const DISABLE_BUTTON_SELECTOR = 'devtools-button[data-field-data-disable]';
const OVERRIDE_CHECKBOX_SELECTOR = 'input[type="checkbox"]';
const OVERRIDE_TEXT_SELECTOR = 'input[type="text"]';

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

function createFieldSettingsDialog(): Components.FieldSettingsDialog.FieldSettingsDialog {
  const root = document.createElement('div');
  renderElementIntoDOM(root);

  const widget = new UI.Widget.Widget();
  widget.markAsRoot();
  widget.show(root);

  const view = new Components.FieldSettingsDialog.FieldSettingsDialog();
  widget.contentElement.append(view);

  return view;
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
      warnings: [],
    };

    cruxManager.getConfigSetting().set({enabled: false, override: ''});
  });

  afterEach(async () => {
    getFieldDataStub.restore();
  });

  it('should enable field when enable button clicked', async () => {
    const view = createFieldSettingsDialog();
    await RenderCoordinator.done();

    assert.isFalse(cruxManager.getConfigSetting().get().enabled);

    const openButton = view.shadowRoot!.querySelector(OPEN_BUTTON_SELECTOR) as HTMLElement;
    assert.strictEqual(openButton.innerText, 'Set up');
    openButton.click();

    await RenderCoordinator.done();

    view.shadowRoot!.querySelector<HTMLElement>(ENABLE_BUTTON_SELECTOR)!.click();

    await RenderCoordinator.done();

    assert.isFalse(view.shadowRoot!.querySelector('devtools-dialog')!.shadowRoot!.querySelector('dialog')!.open);
    assert.isTrue(cruxManager.getConfigSetting().get().enabled);
  });

  it('should disable field data when disable button clicked', async () => {
    cruxManager.getConfigSetting().set({enabled: true, override: ''});

    const view = createFieldSettingsDialog();
    await RenderCoordinator.done();

    const openButton = view.shadowRoot!.querySelector(OPEN_BUTTON_SELECTOR)!;
    assert.strictEqual(openButton.innerText, 'Configure');
    openButton.click();

    await RenderCoordinator.done();

    const disableButton = view.shadowRoot!.querySelector(DISABLE_BUTTON_SELECTOR) as HTMLElement;
    assert.strictEqual(disableButton.innerText, 'Opt out');
    disableButton.click();

    await RenderCoordinator.done();

    assert.isFalse(view.shadowRoot!.querySelector('devtools-dialog')!.shadowRoot!.querySelector('dialog')!.open);
    assert.isFalse(cruxManager.getConfigSetting().get().enabled);
  });

  it('should set URL override on enable', async () => {
    mockFieldData['url-ALL'] = mockResponse();

    const view = createFieldSettingsDialog();
    await RenderCoordinator.done();

    view.shadowRoot!.querySelector<HTMLElement>(OPEN_BUTTON_SELECTOR)!.click();

    await RenderCoordinator.done();

    view.shadowRoot!.querySelector<HTMLElement>(OVERRIDE_CHECKBOX_SELECTOR)!.click();

    await RenderCoordinator.done();

    const urlOverride = view.shadowRoot!.querySelector(OVERRIDE_TEXT_SELECTOR) as HTMLInputElement;
    urlOverride.value = 'https://example.com';
    urlOverride.dispatchEvent(new Event('change'));

    await RenderCoordinator.done();

    view.shadowRoot!.querySelector<HTMLElement>(ENABLE_BUTTON_SELECTOR)!.click();

    await RenderCoordinator.done({waitForWork: true});

    assert.isFalse(view.shadowRoot!.querySelector('devtools-dialog')!.shadowRoot!.querySelector('dialog')!.open);
    assert.isTrue(cruxManager.getConfigSetting().get().enabled);
    assert.strictEqual(cruxManager.getConfigSetting().get().override, 'https://example.com');
    assert.isTrue(cruxManager.getConfigSetting().get().overrideEnabled);
  });

  it('should still set URL override on disable', async () => {
    mockFieldData['url-ALL'] = mockResponse();

    const view = createFieldSettingsDialog();
    await RenderCoordinator.done();

    view.shadowRoot!.querySelector<HTMLElement>(OPEN_BUTTON_SELECTOR)!.click();

    await RenderCoordinator.done();

    view.shadowRoot!.querySelector<HTMLElement>(OVERRIDE_CHECKBOX_SELECTOR)!.click();

    await RenderCoordinator.done();

    const urlOverride = view.shadowRoot!.querySelector(OVERRIDE_TEXT_SELECTOR) as HTMLInputElement;
    urlOverride.value = 'https://example.com';
    urlOverride.dispatchEvent(new Event('change'));

    await RenderCoordinator.done();

    view.shadowRoot!.querySelector<HTMLElement>(DISABLE_BUTTON_SELECTOR)!.click();

    await RenderCoordinator.done({waitForWork: true});

    assert.isFalse(view.shadowRoot!.querySelector('devtools-dialog')!.shadowRoot!.querySelector('dialog')!.open);
    assert.isFalse(cruxManager.getConfigSetting().get().enabled);
    assert.strictEqual(cruxManager.getConfigSetting().get().override, 'https://example.com');
    assert.isTrue(cruxManager.getConfigSetting().get().overrideEnabled);
  });

  it('should show message for URL override with no data', async () => {
    const view = createFieldSettingsDialog();
    await RenderCoordinator.done();

    view.shadowRoot!.querySelector<HTMLElement>(OPEN_BUTTON_SELECTOR)!.click();

    await RenderCoordinator.done();

    view.shadowRoot!.querySelector<HTMLElement>(OVERRIDE_CHECKBOX_SELECTOR)!.click();

    await RenderCoordinator.done();

    const urlOverride = view.shadowRoot!.querySelector(OVERRIDE_TEXT_SELECTOR) as HTMLInputElement;
    urlOverride.value = 'https://example.com';
    urlOverride.dispatchEvent(new Event('change'));

    await RenderCoordinator.done();

    view.shadowRoot!.querySelector<HTMLElement>(ENABLE_BUTTON_SELECTOR)!.click();

    await RenderCoordinator.done({waitForWork: true});

    assert.strictEqual(
        view.shadowRoot!.querySelector('.warning')!.textContent,
        'The Chrome UX Report does not have sufficient real-world speed data for this page.');

    assert.isTrue(view.shadowRoot!.querySelector('devtools-dialog')!.shadowRoot!.querySelector('dialog')!.open);
    assert.isFalse(cruxManager.getConfigSetting().get().enabled);
    assert.strictEqual(cruxManager.getConfigSetting().get().override, '');
  });

  it('should show message for malformed URL', async () => {
    const view = createFieldSettingsDialog();
    await RenderCoordinator.done();

    view.shadowRoot!.querySelector<HTMLElement>(OPEN_BUTTON_SELECTOR)!.click();

    await RenderCoordinator.done();

    view.shadowRoot!.querySelector<HTMLElement>(OVERRIDE_CHECKBOX_SELECTOR)!.click();

    await RenderCoordinator.done();

    const urlOverride = view.shadowRoot!.querySelector(OVERRIDE_TEXT_SELECTOR) as HTMLInputElement;
    urlOverride.value = '//example.com';
    urlOverride.dispatchEvent(new Event('change'));

    await RenderCoordinator.done();

    view.shadowRoot!.querySelector<HTMLElement>(ENABLE_BUTTON_SELECTOR)!.click();

    await RenderCoordinator.done({waitForWork: true});

    assert.strictEqual(
        view.shadowRoot!.querySelector('.warning')!.textContent, '"//example.com" is not a valid origin or URL.');

    assert.isTrue(view.shadowRoot!.querySelector('devtools-dialog')!.shadowRoot!.querySelector('dialog')!.open);
    assert.isFalse(cruxManager.getConfigSetting().get().enabled);
    assert.strictEqual(cruxManager.getConfigSetting().get().override, '');
  });

  it('should restore URL override from setting', async () => {
    cruxManager.getConfigSetting().set({
      enabled: true,
      override: 'https://example.com',
      overrideEnabled: true,
    });

    const view = createFieldSettingsDialog();
    await RenderCoordinator.done();

    view.shadowRoot!.querySelector<HTMLElement>(OPEN_BUTTON_SELECTOR)!.click();

    await RenderCoordinator.done();

    const checked = view.shadowRoot!.querySelector<HTMLInputElement>(OVERRIDE_CHECKBOX_SELECTOR)!.checked;
    const urlOverride = view.shadowRoot!.querySelector<HTMLInputElement>(OVERRIDE_TEXT_SELECTOR)!.value;

    assert.strictEqual(urlOverride, 'https://example.com');
    assert.isTrue(checked);
  });

  it('should restore URL override from setting if override disabled', async () => {
    cruxManager.getConfigSetting().set({
      enabled: true,
      override: 'https://example.com',
      overrideEnabled: false,
    });

    const view = createFieldSettingsDialog();
    await RenderCoordinator.done();

    view.shadowRoot!.querySelector<HTMLElement>(OPEN_BUTTON_SELECTOR)!.click();

    await RenderCoordinator.done();

    const checked = view.shadowRoot!.querySelector<HTMLInputElement>(OVERRIDE_CHECKBOX_SELECTOR)!.checked;
    const urlOverride = view.shadowRoot!.querySelector<HTMLInputElement>(OVERRIDE_TEXT_SELECTOR)!.value;

    assert.strictEqual(urlOverride, 'https://example.com');
    assert.isFalse(checked);
  });
});
