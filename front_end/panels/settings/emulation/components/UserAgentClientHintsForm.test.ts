// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';
import {describe, it} from 'mocha';

import type * as Protocol from '../../../../generated/protocol.js';
import {
  assertScreenshot,
  dispatchClickEvent,
  dispatchInputEvent,
  dispatchKeyDownEvent,
  getElementsWithinComponent,
  getElementWithinComponent,
  getEventPromise,
  renderElementIntoDOM,
} from '../../../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../../../testing/LocaleHelpers.js';
import * as Buttons from '../../../../ui/components/buttons/buttons.js';

import * as EmulationComponents from './components.js';

describe('UserAgentClientHintsForm', () => {
  setupLocaleHooks();
  const testMetaData = {
    brands: [
      {
        brand: 'Brand1',
        version: 'v1',
      },
      {
        brand: 'Brand2',
        version: 'v2',
      },
    ],
    fullVersionList: [
      {
        brand: 'Brand3',
        version: '1.2.3',
      },
    ],
    formFactors: [] as string[],
    fullVersion: '',
    platform: '',
    platformVersion: '',
    architecture: '',
    model: '',
    mobile: false,
  };

  /**
   * Returns a deep copy of the test metadata. The component can change the
   * brand arrays in place, so each test must use its own copy.
   */
  const createTestMetaData = (): typeof testMetaData => structuredClone(testMetaData);

  const renderUserAgentClientHintsForm = () => {
    const component = new EmulationComponents.UserAgentClientHintsForm.UserAgentClientHintsForm();
    renderElementIntoDOM(component);
    return component;
  };

  const getTreeToggle = (component: HTMLElement) =>
      getElementWithinComponent(component, '[aria-controls="form-container"]', HTMLElement);

  const getFormContainer = (component: HTMLElement) =>
      getElementWithinComponent(component, '#form-container', HTMLFormElement);

  const getActiveElement = (component: HTMLElement) => component.shadowRoot?.activeElement;

  /**
   * Opens the collapsed form. Elements in a collapsed form cannot get focus.
   */
  const openForm = (component: HTMLElement) => dispatchClickEvent(getTreeToggle(component));

  it('renders the UA brands form with brand values', () => {
    const component = renderUserAgentClientHintsForm();
    component.value = {
      metaData: testMetaData,
    };

    const brandInputs = getElementsWithinComponent(component, '.ua-brand-name-input', HTMLInputElement);
    const brandInputValues = [...brandInputs].map(brandInput => brandInput.value);
    assert.deepEqual(brandInputValues, ['Brand1', 'Brand2']);
  });

  it('renders the full-version-list brands form with brand values', () => {
    const component = renderUserAgentClientHintsForm();
    component.value = {
      metaData: testMetaData,
    };

    const brandInputs = getElementsWithinComponent(component, '.fvl-brand-name-input', HTMLInputElement);
    const brandInputValues = [...brandInputs].map(brandInput => brandInput.value);
    assert.deepEqual(brandInputValues, ['Brand3']);
  });

  it('renders form factors checkboxes with initial values and updates on change', () => {
    const component = renderUserAgentClientHintsForm();
    const initialFormFactors: string[] = [
      'Desktop',
      'Mobile',
    ];
    component.value = {
      metaData: {
        ...testMetaData,
        formFactors: initialFormFactors,
      },
    };

    const checkboxLabels = getElementsWithinComponent(component, '.form-factor-checkbox-label', HTMLLabelElement);
    assert.strictEqual(
        checkboxLabels.length, EmulationComponents.UserAgentClientHintsForm.ALL_PROTOCOL_FORM_FACTORS.length,
        'Should render all form factor checkboxes');

    for (const ff of EmulationComponents.UserAgentClientHintsForm.ALL_PROTOCOL_FORM_FACTORS) {
      const checkbox = getElementWithinComponent(component, `input[value="${ff}"]`, HTMLInputElement);
      assert.isNotNull(checkbox, `Checkbox for ${ff} should exist`);
      if (initialFormFactors.includes(ff)) {
        assert.isTrue(checkbox.checked, `Checkbox for ${ff} should be checked initially`);
      } else {
        assert.isFalse(checkbox.checked, `Checkbox for ${ff} should be unchecked initially`);
      }
    }

    // Simulate changing a checkbox
    const tabletCheckbox = getElementWithinComponent(component, 'input[value=Tablet]', HTMLInputElement);
    assert.isFalse(tabletCheckbox.checked, 'Tablet checkbox should be unchecked before click');
    tabletCheckbox.click();

    const expectedFormFactorsAfterClick: string[] = [
      'Desktop',
      'Mobile',
      'Tablet',
    ];
    const currentMetaData =
        component.value.metaData as (Protocol.Emulation.UserAgentMetadata & {formFactors?: string[]});
    assert.deepEqual(
        currentMetaData.formFactors?.sort(), expectedFormFactorsAfterClick.sort(),
        'Form factors in component value should be updated after checkbox click');

    // Simulate unchecking a checkbox
    const mobileCheckbox = getElementWithinComponent(component, 'input[value="Mobile"]', HTMLInputElement);
    assert.isTrue(mobileCheckbox.checked, 'Mobile checkbox should be checked before unchecking');
    mobileCheckbox.click();

    const expectedFormFactorsAfterUncheck: string[] = [
      'Desktop',
      'Tablet',
    ];
    const finalMetaData = component.value.metaData as (Protocol.Emulation.UserAgentMetadata & {formFactors?: string[]});
    assert.deepEqual(
        finalMetaData.formFactors?.sort(), expectedFormFactorsAfterUncheck.sort(),
        'Form factors in component value should be updated after unchecking a checkbox');
  });

  it('Submitting the form returns metaData', async () => {
    const component = renderUserAgentClientHintsForm();
    component.value = {
      metaData: testMetaData,
      showSubmitButton: true,
    };

    const eventPromise = getEventPromise<EmulationComponents.UserAgentClientHintsForm.ClientHintsSubmitEvent>(
        component, 'clienthintssubmit');

    const submitButton = getElementWithinComponent(component, 'devtools-button', Buttons.Button.Button);
    submitButton.click();

    const event = await eventPromise;
    assert.deepEqual(event.detail, {value: testMetaData});
  });

  describe('tree toggle', () => {
    it('opens and closes the form on click', () => {
      const component = renderUserAgentClientHintsForm();
      component.value = {metaData: createTestMetaData()};

      const toggle = getTreeToggle(component);
      assert.strictEqual(toggle.getAttribute('aria-expanded'), 'false');
      assert.isTrue(getFormContainer(component).classList.contains('hide-container'));

      dispatchClickEvent(toggle);
      assert.strictEqual(toggle.getAttribute('aria-expanded'), 'true');
      assert.isFalse(getFormContainer(component).classList.contains('hide-container'));

      dispatchClickEvent(toggle);
      assert.strictEqual(toggle.getAttribute('aria-expanded'), 'false');
      assert.isTrue(getFormContainer(component).classList.contains('hide-container'));
    });

    it('opens and closes the form with the keyboard', () => {
      const component = renderUserAgentClientHintsForm();
      component.value = {metaData: createTestMetaData()};

      const toggle = getTreeToggle(component);

      dispatchKeyDownEvent(toggle, {code: 'ArrowLeft'});
      assert.strictEqual(toggle.getAttribute('aria-expanded'), 'false', 'ArrowLeft keeps a closed form closed');

      dispatchKeyDownEvent(toggle, {code: 'ArrowRight'});
      assert.strictEqual(toggle.getAttribute('aria-expanded'), 'true', 'ArrowRight opens the form');

      dispatchKeyDownEvent(toggle, {code: 'ArrowRight'});
      assert.strictEqual(toggle.getAttribute('aria-expanded'), 'true', 'ArrowRight keeps an open form open');

      dispatchKeyDownEvent(toggle, {code: 'ArrowLeft'});
      assert.strictEqual(toggle.getAttribute('aria-expanded'), 'false', 'ArrowLeft closes the form');

      dispatchKeyDownEvent(toggle, {code: 'Enter'});
      assert.strictEqual(toggle.getAttribute('aria-expanded'), 'true', 'Enter opens the form');

      dispatchKeyDownEvent(toggle, {code: 'Space'});
      assert.strictEqual(toggle.getAttribute('aria-expanded'), 'false', 'Space closes the form');
    });

    it('does not open the form when the form is disabled', () => {
      const component = renderUserAgentClientHintsForm();
      component.value = {metaData: createTestMetaData()};
      component.disabled = true;

      const toggle = getTreeToggle(component);
      assert.strictEqual(toggle.getAttribute('aria-disabled'), 'true');
      assert.strictEqual(toggle.getAttribute('tabindex'), '-1');

      dispatchClickEvent(toggle);
      assert.strictEqual(toggle.getAttribute('aria-expanded'), 'false');
      dispatchKeyDownEvent(toggle, {code: 'Enter'});
      assert.strictEqual(toggle.getAttribute('aria-expanded'), 'false');
    });

    it('closes an open form when the form becomes disabled', () => {
      const component = renderUserAgentClientHintsForm();
      component.value = {metaData: createTestMetaData()};

      const toggle = getTreeToggle(component);
      dispatchClickEvent(toggle);
      assert.strictEqual(toggle.getAttribute('aria-expanded'), 'true');

      component.disabled = true;
      assert.strictEqual(toggle.getAttribute('aria-expanded'), 'false');
      assert.isTrue(component.disabled);

      component.disabled = false;
      assert.strictEqual(toggle.getAttribute('tabindex'), '0');
      assert.isFalse(component.disabled);
    });
  });

  describe('brand rows', () => {
    const brandLists = [
      {
        name: 'user agent',
        metaDataKey: 'brands',
        brandInputSelector: '.ua-brand-name-input',
        idPrefix: 'ua',
        addButtonId: 'add-brand-button',
      },
      {
        name: 'full version list',
        metaDataKey: 'fullVersionList',
        brandInputSelector: '.fvl-brand-name-input',
        idPrefix: 'fvl',
        addButtonId: 'add-fvl-brand-button',
      },
    ] as const;

    for (const {name, metaDataKey, brandInputSelector, idPrefix, addButtonId} of brandLists) {
      describe(name, () => {
        it('adds a brand row on click and focuses the new brand input', async () => {
          const component = renderUserAgentClientHintsForm();
          const metaData = createTestMetaData();
          const initialLength = metaData[metaDataKey].length;
          component.value = {metaData};
          openForm(component);

          const changePromise = getEventPromise(component, 'clienthintschange');
          dispatchClickEvent(getElementWithinComponent(component, `#${addButtonId}`, HTMLElement));
          await changePromise;

          const brandList = component.value.metaData?.[metaDataKey];
          assert.lengthOf(brandList ?? [], initialLength + 1);
          assert.deepEqual(brandList?.at(-1), {brand: '', version: ''});

          const brandInputs = getElementsWithinComponent(component, brandInputSelector, HTMLInputElement);
          assert.lengthOf(brandInputs, initialLength + 1);
          assert.strictEqual(getActiveElement(component), [...brandInputs].at(-1));

          const ariaLive = getElementWithinComponent(component, '[aria-live="polite"]', HTMLElement);
          assert.strictEqual(ariaLive.getAttribute('aria-label'), 'Added brand row');
        });

        it('adds a brand row when Enter or Space is pressed on the add button', () => {
          const component = renderUserAgentClientHintsForm();
          const metaData = createTestMetaData();
          const initialLength = metaData[metaDataKey].length;
          component.value = {metaData};

          const addButton = getElementWithinComponent(component, `#${addButtonId}`, HTMLElement);
          addButton.dispatchEvent(new KeyboardEvent('keypress', {code: 'Enter'}));
          assert.lengthOf(component.value.metaData?.[metaDataKey] ?? [], initialLength + 1);

          addButton.dispatchEvent(new KeyboardEvent('keypress', {code: 'Space'}));
          assert.lengthOf(component.value.metaData?.[metaDataKey] ?? [], initialLength + 2);

          addButton.dispatchEvent(new KeyboardEvent('keypress', {code: 'KeyA'}));
          assert.lengthOf(component.value.metaData?.[metaDataKey] ?? [], initialLength + 2);
        });

        it('deletes a brand row and focuses the next brand input', async () => {
          const component = renderUserAgentClientHintsForm();
          const metaData = createTestMetaData();
          metaData[metaDataKey] = [
            {brand: 'First', version: '1'},
            {brand: 'Second', version: '2'},
          ];
          component.value = {metaData};
          openForm(component);

          const deleteIcons = getElementsWithinComponent(component, '.delete-icon', HTMLElement);
          const deleteIcon =
              [...deleteIcons].find(icon => icon.closest('.brand-row')?.querySelector(brandInputSelector));
          assert.exists(deleteIcon);

          const changePromise = getEventPromise(component, 'clienthintschange');
          dispatchClickEvent(deleteIcon);
          await changePromise;

          assert.deepEqual(component.value.metaData?.[metaDataKey], [{brand: 'Second', version: '2'}]);
          const brandInputs = getElementsWithinComponent(component, brandInputSelector, HTMLInputElement);
          assert.deepEqual([...brandInputs].map(input => input.value), ['Second']);
          assert.strictEqual(getActiveElement(component), brandInputs[0]);
          assert.strictEqual(brandInputs[0].id, `${idPrefix}-brand-1-input`);

          const ariaLive = getElementWithinComponent(component, '[aria-live="polite"]', HTMLElement);
          assert.strictEqual(ariaLive.getAttribute('aria-label'), 'Deleted brand row');
        });

        it('deletes the last brand row and focuses the add button', () => {
          const component = renderUserAgentClientHintsForm();
          const metaData = createTestMetaData();
          metaData[metaDataKey] = [{brand: 'Only', version: '1'}];
          component.value = {metaData};
          openForm(component);

          const deleteIcons = getElementsWithinComponent(component, '.delete-icon', HTMLElement);
          const deleteIcon =
              [...deleteIcons].find(icon => icon.closest('.brand-row')?.querySelector(brandInputSelector));
          assert.exists(deleteIcon);
          deleteIcon.dispatchEvent(new KeyboardEvent('keypress', {code: 'Enter'}));

          assert.deepEqual(component.value.metaData?.[metaDataKey], []);
          assert.lengthOf(getElementsWithinComponent(component, brandInputSelector, HTMLInputElement), 0);
          assert.strictEqual(getActiveElement(component),
                             getElementWithinComponent(component, `#${addButtonId}`, HTMLElement));
        });

        it('updates the brand name and version on input', async () => {
          const component = renderUserAgentClientHintsForm();
          const metaData = createTestMetaData();
          metaData[metaDataKey] = [{brand: 'Old', version: '1'}];
          component.value = {metaData};

          const brandInput = getElementWithinComponent(component, brandInputSelector, HTMLInputElement);
          brandInput.value = 'New';
          let changePromise = getEventPromise(component, 'clienthintschange');
          dispatchInputEvent(brandInput);
          await changePromise;
          assert.deepEqual(component.value.metaData?.[metaDataKey], [{brand: 'New', version: '1'}]);

          const versionInput = brandInput.nextElementSibling;
          assert.instanceOf(versionInput, HTMLInputElement);
          versionInput.value = '2';
          changePromise = getEventPromise(component, 'clienthintschange');
          dispatchInputEvent(versionInput);
          await changePromise;
          assert.deepEqual(component.value.metaData?.[metaDataKey], [{brand: 'New', version: '2'}]);
        });
      });
    }
  });

  describe('text fields', () => {
    const textFields = [
      {stateKey: 'fullVersion', placeholder: 'Full browser version (e.g. 87.0.4280.88)'},
      {stateKey: 'platform', placeholder: 'Platform (e.g. Android)'},
      {stateKey: 'platformVersion', placeholder: 'Platform version'},
      {stateKey: 'architecture', placeholder: 'Architecture (e.g. x86)'},
      {stateKey: 'model', placeholder: 'Device model (Sec-CH-UA-Model)'},
    ] as const;

    for (const {stateKey, placeholder} of textFields) {
      it(`updates ${stateKey} on input`, async () => {
        const component = renderUserAgentClientHintsForm();
        component.value = {metaData: createTestMetaData()};

        const input = getElementWithinComponent(component, `input[placeholder="${placeholder}"]`, HTMLInputElement);
        input.value = 'test-value';
        const changePromise = getEventPromise(component, 'clienthintschange');
        dispatchInputEvent(input);
        await changePromise;

        assert.strictEqual(component.value.metaData?.[stateKey], 'test-value');
      });
    }
  });

  describe('mobile checkbox', () => {
    it('does not render the mobile checkbox by default', () => {
      const component = renderUserAgentClientHintsForm();
      component.value = {metaData: createTestMetaData()};

      assert.isNull(component.shadowRoot?.querySelector('.mobile-checkbox-container'));
      const modelInput =
          getElementWithinComponent(component, 'input[placeholder="Device model (Sec-CH-UA-Model)"]', HTMLInputElement);
      assert.isTrue(modelInput.classList.contains('full-row'));
    });

    it('renders the mobile checkbox and updates the mobile value', async () => {
      const component = renderUserAgentClientHintsForm();
      component.value = {metaData: createTestMetaData(), showMobileCheckbox: true};

      const modelInput =
          getElementWithinComponent(component, 'input[placeholder="Device model (Sec-CH-UA-Model)"]', HTMLInputElement);
      assert.isTrue(modelInput.classList.contains('device-model-input'));

      const checkbox =
          getElementWithinComponent(component, '.mobile-checkbox-container input[type="checkbox"]', HTMLInputElement);
      assert.isFalse(checkbox.checked);

      checkbox.checked = true;
      const changePromise = getEventPromise(component, 'clienthintschange');
      dispatchInputEvent(checkbox);
      await changePromise;

      assert.isTrue(component.value.metaData?.mobile);
    });
  });

  describe('submit button', () => {
    it('does not render the submit button by default', () => {
      const component = renderUserAgentClientHintsForm();
      component.value = {metaData: createTestMetaData()};

      assert.isNull(component.shadowRoot?.querySelector('devtools-button'));
    });

    it('does not dispatch a submit event when the submit button is hidden', () => {
      const component = renderUserAgentClientHintsForm();
      component.value = {metaData: createTestMetaData()};

      let submitted = false;
      component.addEventListener('clienthintssubmit', () => {
        submitted = true;
      });
      getFormContainer(component).dispatchEvent(new SubmitEvent('submit', {cancelable: true}));

      assert.isFalse(submitted);
    });
  });

  describe('validate', () => {
    it('returns valid for representable values', () => {
      const component = renderUserAgentClientHintsForm();
      component.value = {metaData: {...createTestMetaData(), formFactors: ['Desktop', 'XR']}};

      assert.deepEqual(component.validate(), {valid: true});
    });

    it('returns invalid for a brand that is not representable', () => {
      const component = renderUserAgentClientHintsForm();
      const metaData = createTestMetaData();
      metaData.brands = [{brand: 'Brand\u2603', version: '1'}];
      component.value = {metaData};

      assert.deepEqual(component.validate(),
                       {valid: false, errorMessage: 'Not representable as structured headers string'});
    });

    it('returns invalid for a text field that is not representable', () => {
      const component = renderUserAgentClientHintsForm();
      component.value = {metaData: {...createTestMetaData(), platform: 'Platform\u2603'}};

      assert.deepEqual(component.validate(),
                       {valid: false, errorMessage: 'Not representable as structured headers string'});
    });

    it('returns invalid for an unknown form factor', () => {
      const component = renderUserAgentClientHintsForm();
      component.value = {metaData: {...createTestMetaData(), formFactors: ['Toaster']}};

      const result = component.validate();
      assert.isFalse(result.valid);
      assert.include(result.errorMessage, 'Toaster');
    });
  });

  it('renders the expanded form', async () => {
    const component = new EmulationComponents.UserAgentClientHintsForm.UserAgentClientHintsForm();
    renderElementIntoDOM(component, {includeCommonStyles: true, width: 400});
    component.value = {
      metaData: {
        ...createTestMetaData(),
        formFactors: ['Desktop', 'XR'],
        fullVersion: '1.2.3.4',
        platform: 'Android',
        platformVersion: '14',
        architecture: 'arm',
        model: 'Pixel',
        mobile: true,
      },
      showMobileCheckbox: true,
      showSubmitButton: true,
    };
    dispatchClickEvent(getTreeToggle(component));

    await assertScreenshot('settings/user_agent_client_hints_form.png');
  });
});
