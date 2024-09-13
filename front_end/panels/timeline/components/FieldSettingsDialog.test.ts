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
const ENABLE_BUTTON_SELECTOR = 'devtools-button[data-field-data-enable]';
const DISABLE_BUTTON_SELECTOR = 'devtools-button[data-field-data-disable]';
const OVERRIDE_CHECKBOX_SELECTOR = 'input[type="checkbox"]';
const OVERRIDE_TEXT_SELECTOR = 'input[type="text"]';

function getMappingInputs(view: Element): Array<HTMLInputElement|undefined> {
  const dgController = view.shadowRoot!.querySelector('devtools-data-grid-controller');
  const dataGrid = dgController!.shadowRoot!.querySelector('devtools-data-grid');
  const inputs = dataGrid!.shadowRoot!.querySelectorAll('input');
  return Array.from(inputs);
}

function getAddMappingButton(view: Element): HTMLElementTagNameMap['devtools-button']|null {
  const dgController = view.shadowRoot!.querySelector('devtools-data-grid-controller');
  const dataGrid = dgController!.shadowRoot!.querySelector('devtools-data-grid');
  return dataGrid!.shadowRoot!.querySelector('devtools-button#add-mapping-button');
}

function getDeleteMappingButtons(view: Element): HTMLElementTagNameMap['devtools-button'][] {
  const dgController = view.shadowRoot!.querySelector('devtools-data-grid-controller');
  const dataGrid = dgController!.shadowRoot!.querySelector('devtools-data-grid');
  return Array.from(dataGrid!.shadowRoot!.querySelectorAll('devtools-button.delete-mapping'));
}

function getNewMappingButton(view: Element): HTMLElementTagNameMap['devtools-button'] {
  return view.shadowRoot!.querySelector('.origin-mapping-button-section devtools-button') as
      HTMLElementTagNameMap['devtools-button'];
}

function getMappingTableTextCells(view: Element): HTMLElement[] {
  const dgController = view.shadowRoot!.querySelector('devtools-data-grid-controller');
  const dataGrid = dgController!.shadowRoot!.querySelector('devtools-data-grid');
  const cells = Array.from(dataGrid!.shadowRoot!.querySelectorAll('tr[aria-rowindex] td'));
  return cells.filter(c => !c.firstElementChild) as HTMLElement[];
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
    assert.isTrue(cruxManager.getConfigSetting().get().overrideEnabled);
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
    assert.isTrue(cruxManager.getConfigSetting().get().overrideEnabled);
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

  it('should show message for malformed URL', async () => {
    const view = new Components.FieldSettingsDialog.FieldSettingsDialog();
    renderElementIntoDOM(view);
    await coordinator.done();

    view.shadowRoot!.querySelector<HTMLElement>(OPEN_BUTTON_SELECTOR)!.click();

    await coordinator.done();

    view.shadowRoot!.querySelector<HTMLElement>(OVERRIDE_CHECKBOX_SELECTOR)!.click();

    await coordinator.done();

    const urlOverride = view.shadowRoot!.querySelector(OVERRIDE_TEXT_SELECTOR) as HTMLInputElement;
    urlOverride.value = '//example.com';
    urlOverride.dispatchEvent(new Event('change'));

    await coordinator.done();

    view.shadowRoot!.querySelector<HTMLElement>(ENABLE_BUTTON_SELECTOR)!.click();

    await coordinator.done({waitForWork: true});

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

    const view = new Components.FieldSettingsDialog.FieldSettingsDialog();
    renderElementIntoDOM(view);
    await coordinator.done();

    view.shadowRoot!.querySelector<HTMLElement>(OPEN_BUTTON_SELECTOR)!.click();

    await coordinator.done();

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

    const view = new Components.FieldSettingsDialog.FieldSettingsDialog();
    renderElementIntoDOM(view);
    await coordinator.done();

    view.shadowRoot!.querySelector<HTMLElement>(OPEN_BUTTON_SELECTOR)!.click();

    await coordinator.done();

    const checked = view.shadowRoot!.querySelector<HTMLInputElement>(OVERRIDE_CHECKBOX_SELECTOR)!.checked;
    const urlOverride = view.shadowRoot!.querySelector<HTMLInputElement>(OVERRIDE_TEXT_SELECTOR)!.value;

    assert.strictEqual(urlOverride, 'https://example.com');
    assert.isFalse(checked);
  });

  describe('origin mapping', () => {
    it('should flush to settings on submit', async () => {
      mockFieldData['url-ALL'] = mockResponse();

      const view = new Components.FieldSettingsDialog.FieldSettingsDialog();
      renderElementIntoDOM(view);
      await coordinator.done();

      view.shadowRoot!.querySelector<HTMLElement>(OPEN_BUTTON_SELECTOR)!.click();

      await coordinator.done();

      const newMappingButton = getNewMappingButton(view);
      newMappingButton.click();

      await coordinator.done();

      const [devInput, prodInput] = getMappingInputs(view);
      devInput!.value = 'http://localhost:8080/page1/';
      devInput!.dispatchEvent(new Event('change'));

      prodInput!.value = 'https://example.com/#asdf';
      prodInput!.dispatchEvent(new Event('change'));

      await coordinator.done();

      const addMappingButton = getAddMappingButton(view);
      addMappingButton!.click();

      await coordinator.done({waitForWork: true});

      const textCells = getMappingTableTextCells(view);
      assert.deepStrictEqual(textCells.map(c => c!.textContent), [
        'http://localhost:8080',
        'https://example.com',
      ]);

      view.shadowRoot!.querySelector<HTMLElement>(ENABLE_BUTTON_SELECTOR)!.click();

      await coordinator.done({waitForWork: true});

      assert.isFalse(view.shadowRoot!.querySelector('devtools-dialog')!.shadowRoot!.querySelector('dialog')!.open);
      assert.isTrue(cruxManager.getConfigSetting().get().enabled);
      assert.strictEqual(cruxManager.getConfigSetting().get().override, '');
      assert.deepStrictEqual(cruxManager.getConfigSetting().get().originMappings, [
        {developmentOrigin: 'http://localhost:8080', productionOrigin: 'https://example.com'},
      ]);
    });

    it('should warn if either URL is invalid', async () => {
      mockFieldData['url-ALL'] = mockResponse();

      const view = new Components.FieldSettingsDialog.FieldSettingsDialog();
      renderElementIntoDOM(view);
      await coordinator.done();

      view.shadowRoot!.querySelector<HTMLElement>(OPEN_BUTTON_SELECTOR)!.click();

      await coordinator.done();

      const newMappingButton = getNewMappingButton(view);
      newMappingButton.click();

      await coordinator.done();

      const [devInput, prodInput] = getMappingInputs(view);
      devInput!.value = 'bad-one';
      devInput!.dispatchEvent(new Event('change'));

      prodInput!.value = 'bad-two';
      prodInput!.dispatchEvent(new Event('change'));

      await coordinator.done();

      const addMappingButton = getAddMappingButton(view);
      addMappingButton!.click();

      await coordinator.done({waitForWork: true});

      {
        const textCells = getMappingTableTextCells(view);
        assert.deepStrictEqual(textCells, []);
      }

      assert.strictEqual(
          view.shadowRoot!.querySelector('.warning')!.textContent, '"bad-one" is not a valid origin or URL.');

      devInput!.value = 'https://localhost:8080';
      devInput!.dispatchEvent(new Event('change'));

      await coordinator.done();

      addMappingButton!.click();

      await coordinator.done({waitForWork: true});

      {
        const textCells = getMappingTableTextCells(view);
        assert.deepStrictEqual(textCells, []);
      }

      assert.strictEqual(
          view.shadowRoot!.querySelector('.warning')!.textContent, '"bad-two" is not a valid origin or URL.');
    });

    it('should warn if there is not CrUX data for the prod origin', async () => {
      const view = new Components.FieldSettingsDialog.FieldSettingsDialog();
      renderElementIntoDOM(view);
      await coordinator.done();

      view.shadowRoot!.querySelector<HTMLElement>(OPEN_BUTTON_SELECTOR)!.click();

      await coordinator.done();

      const newMappingButton = getNewMappingButton(view);
      newMappingButton.click();

      await coordinator.done();

      const [devInput, prodInput] = getMappingInputs(view);
      devInput!.value = 'http://localhost:8080';
      devInput!.dispatchEvent(new Event('change'));

      prodInput!.value = 'https://no-field.com';
      prodInput!.dispatchEvent(new Event('change'));

      await coordinator.done();

      const addMappingButton = getAddMappingButton(view);
      addMappingButton!.click();

      await coordinator.done({waitForWork: true});

      const textCells = getMappingTableTextCells(view);
      assert.deepStrictEqual(textCells, []);

      assert.strictEqual(
          view.shadowRoot!.querySelector('.warning')!.textContent,
          'The Chrome UX Report does not have sufficient real-world speed data for this page.');
    });

    it('should warn if a mapping for the dev origin already exists', async () => {
      mockFieldData['url-ALL'] = mockResponse();
      cruxManager.getConfigSetting().set({
        enabled: false,
        override: '',
        originMappings: [{developmentOrigin: 'http://localhost:8080', productionOrigin: 'https://google.com'}],
      });

      const view = new Components.FieldSettingsDialog.FieldSettingsDialog();
      renderElementIntoDOM(view);
      await coordinator.done();

      view.shadowRoot!.querySelector<HTMLElement>(OPEN_BUTTON_SELECTOR)!.click();

      await coordinator.done();

      const newMappingButton = getNewMappingButton(view);
      newMappingButton.click();

      await coordinator.done();

      const [devInput, prodInput] = getMappingInputs(view);
      devInput!.value = 'http://localhost:8080';
      devInput!.dispatchEvent(new Event('change'));

      prodInput!.value = 'https://example.com';
      prodInput!.dispatchEvent(new Event('change'));

      await coordinator.done();

      const addMappingButton = getAddMappingButton(view);
      addMappingButton!.click();

      await coordinator.done({waitForWork: true});

      const textCells = getMappingTableTextCells(view);
      assert.deepStrictEqual(textCells.map(c => c!.textContent), [
        'http://localhost:8080',
        'https://google.com',
      ]);

      assert.strictEqual(
          view.shadowRoot!.querySelector('.warning')!.textContent,
          '"http://localhost:8080" is already mapped to a production origin.');
    });

    it('should handle deleting entries', async () => {
      cruxManager.getConfigSetting().set({
        enabled: false,
        override: '',
        originMappings: [{developmentOrigin: 'http://localhost:8080', productionOrigin: 'https://google.com'}],
      });

      const view = new Components.FieldSettingsDialog.FieldSettingsDialog();
      renderElementIntoDOM(view);
      await coordinator.done();

      view.shadowRoot!.querySelector<HTMLElement>(OPEN_BUTTON_SELECTOR)!.click();

      await coordinator.done();

      {
        const textCells = getMappingTableTextCells(view);
        assert.deepStrictEqual(textCells.map(c => c!.textContent), [
          'http://localhost:8080',
          'https://google.com',
        ]);
      }

      const deleteButtons = getDeleteMappingButtons(view);
      deleteButtons[0].click();

      await coordinator.done();

      {
        const textCells = getMappingTableTextCells(view);
        assert.deepStrictEqual(textCells, []);
      }

      view.shadowRoot!.querySelector<HTMLElement>(ENABLE_BUTTON_SELECTOR)!.click();

      await coordinator.done({waitForWork: true});

      assert.isFalse(view.shadowRoot!.querySelector('devtools-dialog')!.shadowRoot!.querySelector('dialog')!.open);
      assert.isTrue(cruxManager.getConfigSetting().get().enabled);
      assert.strictEqual(cruxManager.getConfigSetting().get().override, '');
      assert.deepStrictEqual(cruxManager.getConfigSetting().get().originMappings, []);
    });
  });
});
