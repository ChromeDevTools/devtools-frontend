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
  renderElementIntoDOM,
} from '../../../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../../../testing/LocaleHelpers.js';
import {createViewFunctionStub} from '../../../../testing/ViewFunctionHelpers.js';
import * as Buttons from '../../../../ui/components/buttons/buttons.js';

import * as EmulationComponents from './components.js';

const {UserAgentClientHintsForm, Events} = EmulationComponents.UserAgentClientHintsForm;
type UserAgentClientHintsForm = EmulationComponents.UserAgentClientHintsForm.UserAgentClientHintsForm;

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
   * Returns a deep copy of the test metadata, so that each test uses its own
   * brand arrays.
   */
  const createTestMetaData = (): typeof testMetaData => structuredClone(testMetaData);

  const renderUserAgentClientHintsForm =
      async(data?: EmulationComponents.UserAgentClientHintsForm.UserAgentClientHintsFormData,
            renderOptions?: Parameters<typeof renderElementIntoDOM>[1]): Promise<UserAgentClientHintsForm> => {
    const component = new UserAgentClientHintsForm();
    renderElementIntoDOM(component, renderOptions);
    if (data) {
      component.value = data;
    }
    await component.updateComplete;
    return component;
  };

  const query =
      <T extends Element>(component: UserAgentClientHintsForm, selector: string, elementClass: new () => T): T => {
        const element = component.contentElement.querySelector(selector);
        assert.instanceOf(element, elementClass);
        return element;
      };

  const queryAll =
      <T extends Element>(component: UserAgentClientHintsForm, selector: string, elementClass: new () => T): T[] => {
        const elements = [...component.contentElement.querySelectorAll(selector)];
        for (const element of elements) {
          assert.instanceOf(element, elementClass);
        }
        return elements as T[];
      };

  const getTreeToggle = (component: UserAgentClientHintsForm) =>
      query(component, '[aria-controls="form-container"]', HTMLElement);

  const getFormContainer = (component: UserAgentClientHintsForm) =>
      query(component, '#form-container', HTMLFormElement);

  /**
   * Opens the collapsed form. Elements in a collapsed form cannot get focus.
   */
  const openForm = async (component: UserAgentClientHintsForm) => {
    dispatchClickEvent(getTreeToggle(component));
    await component.updateComplete;
  };

  /**
   * Returns the metadata values that the form reports through
   * `CLIENT_HINTS_CHANGE` events.
   */
  const recordChanges = (component: UserAgentClientHintsForm) => {
    const changes: Protocol.Emulation.UserAgentMetadata[] = [];
    component.addEventListener(Events.CLIENT_HINTS_CHANGE, event => changes.push(event.data));
    return changes;
  };

  /**
   * Returns the metadata values that the form reports through
   * `CLIENT_HINTS_SUBMIT` events.
   */
  const recordSubmits = (component: UserAgentClientHintsForm) => {
    const submits: Protocol.Emulation.UserAgentMetadata[] = [];
    component.addEventListener(Events.CLIENT_HINTS_SUBMIT, event => submits.push(event.data));
    return submits;
  };

  it('renders the UA brands form with brand values', async () => {
    const component = await renderUserAgentClientHintsForm({metaData: createTestMetaData()});

    const brandInputs = queryAll(component, '.ua-brand-name-input', HTMLInputElement);
    assert.deepEqual(brandInputs.map(brandInput => brandInput.value), ['Brand1', 'Brand2']);
  });

  it('renders the full-version-list brands form with brand values', async () => {
    const component = await renderUserAgentClientHintsForm({metaData: createTestMetaData()});

    const brandInputs = queryAll(component, '.fvl-brand-name-input', HTMLInputElement);
    assert.deepEqual(brandInputs.map(brandInput => brandInput.value), ['Brand3']);
  });

  it('renders form factors checkboxes with initial values and updates on change', async () => {
    const initialFormFactors: string[] = [
      'Desktop',
      'Mobile',
    ];
    const component = await renderUserAgentClientHintsForm({
      metaData: {
        ...createTestMetaData(),
        formFactors: initialFormFactors,
      },
    });

    const checkboxLabels = queryAll(component, '.form-factor-checkbox-label', HTMLLabelElement);
    assert.lengthOf(checkboxLabels, EmulationComponents.UserAgentClientHintsForm.ALL_PROTOCOL_FORM_FACTORS.length,
                    'Should render all form factor checkboxes');

    for (const ff of EmulationComponents.UserAgentClientHintsForm.ALL_PROTOCOL_FORM_FACTORS) {
      const checkbox = query(component, `input[value="${ff}"]`, HTMLInputElement);
      if (initialFormFactors.includes(ff)) {
        assert.isTrue(checkbox.checked, `Checkbox for ${ff} should be checked initially`);
      } else {
        assert.isFalse(checkbox.checked, `Checkbox for ${ff} should be unchecked initially`);
      }
    }

    // Simulate changing a checkbox
    const tabletCheckbox = query(component, 'input[value=Tablet]', HTMLInputElement);
    assert.isFalse(tabletCheckbox.checked, 'Tablet checkbox should be unchecked before click');
    tabletCheckbox.click();
    await component.updateComplete;

    assert.deepEqual(component.value.metaData?.formFactors?.sort(), ['Desktop', 'Mobile', 'Tablet'],
                     'Form factors in component value should be updated after checkbox click');

    // Simulate unchecking a checkbox
    const mobileCheckbox = query(component, 'input[value="Mobile"]', HTMLInputElement);
    assert.isTrue(mobileCheckbox.checked, 'Mobile checkbox should be checked before unchecking');
    mobileCheckbox.click();
    await component.updateComplete;

    assert.deepEqual(component.value.metaData?.formFactors?.sort(), ['Desktop', 'Tablet'],
                     'Form factors in component value should be updated after unchecking a checkbox');
  });

  it('Submitting the form returns metaData', async () => {
    const metaData = createTestMetaData();
    const component = await renderUserAgentClientHintsForm({metaData, showSubmitButton: true});
    const submitted = recordSubmits(component);

    query(component, 'devtools-button', Buttons.Button.Button).click();

    assert.deepEqual(submitted, [metaData]);
  });

  it('dispatches the events as DOM events on the widget element', async () => {
    const metaData = createTestMetaData();
    const component = await renderUserAgentClientHintsForm({metaData, showSubmitButton: true});
    const domEvents: Array<{type: string, detail: unknown}> = [];
    const recordDomEvent = (event: Event) => {
      assert.instanceOf(event, CustomEvent);
      domEvents.push({type: event.type, detail: event.detail});
    };
    component.element.addEventListener('clienthintschange', recordDomEvent);
    component.element.addEventListener('clienthintssubmit', recordDomEvent);

    const input = query(component, 'input[placeholder="Platform (e.g. Android)"]', HTMLInputElement);
    input.value = 'Android';
    dispatchInputEvent(input);
    query(component, 'devtools-button', Buttons.Button.Button).click();

    assert.deepEqual(domEvents.map(event => event.type), ['clienthintschange', 'clienthintssubmit']);
    assert.deepEqual(domEvents[0].detail, {...metaData, platform: 'Android'});
    assert.strictEqual(domEvents[1].detail, component.value.metaData);
  });

  describe('tree toggle', () => {
    it('opens and closes the form on click', async () => {
      const component = await renderUserAgentClientHintsForm({metaData: createTestMetaData()});

      assert.strictEqual(getTreeToggle(component).getAttribute('aria-expanded'), 'false');
      assert.isTrue(getFormContainer(component).classList.contains('hide-container'));

      dispatchClickEvent(getTreeToggle(component));
      await component.updateComplete;
      assert.strictEqual(getTreeToggle(component).getAttribute('aria-expanded'), 'true');
      assert.isFalse(getFormContainer(component).classList.contains('hide-container'));

      dispatchClickEvent(getTreeToggle(component));
      await component.updateComplete;
      assert.strictEqual(getTreeToggle(component).getAttribute('aria-expanded'), 'false');
      assert.isTrue(getFormContainer(component).classList.contains('hide-container'));
    });

    it('opens and closes the form with the keyboard', async () => {
      const component = await renderUserAgentClientHintsForm({metaData: createTestMetaData()});
      const pressKey = async (code: string) => {
        dispatchKeyDownEvent(getTreeToggle(component), {code});
        await component.updateComplete;
        return getTreeToggle(component).getAttribute('aria-expanded');
      };

      assert.strictEqual(await pressKey('ArrowLeft'), 'false', 'ArrowLeft keeps a closed form closed');
      assert.strictEqual(await pressKey('ArrowRight'), 'true', 'ArrowRight opens the form');
      assert.strictEqual(await pressKey('ArrowRight'), 'true', 'ArrowRight keeps an open form open');
      assert.strictEqual(await pressKey('ArrowLeft'), 'false', 'ArrowLeft closes the form');
      assert.strictEqual(await pressKey('Enter'), 'true', 'Enter opens the form');
      assert.strictEqual(await pressKey('Space'), 'false', 'Space closes the form');
    });

    it('does not open the form when the form is disabled', async () => {
      const component = await renderUserAgentClientHintsForm({metaData: createTestMetaData()});
      component.disabled = true;
      await component.updateComplete;

      const toggle = getTreeToggle(component);
      assert.strictEqual(toggle.getAttribute('aria-disabled'), 'true');
      assert.strictEqual(toggle.getAttribute('tabindex'), '-1');

      dispatchClickEvent(toggle);
      await component.updateComplete;
      assert.strictEqual(toggle.getAttribute('aria-expanded'), 'false');
      dispatchKeyDownEvent(toggle, {code: 'Enter'});
      await component.updateComplete;
      assert.strictEqual(toggle.getAttribute('aria-expanded'), 'false');
    });

    it('closes an open form when the form becomes disabled', async () => {
      const component = await renderUserAgentClientHintsForm({metaData: createTestMetaData()});
      await openForm(component);
      assert.strictEqual(getTreeToggle(component).getAttribute('aria-expanded'), 'true');

      component.disabled = true;
      await component.updateComplete;
      assert.strictEqual(getTreeToggle(component).getAttribute('aria-expanded'), 'false');
      assert.isTrue(component.disabled);

      component.disabled = false;
      await component.updateComplete;
      assert.strictEqual(getTreeToggle(component).getAttribute('tabindex'), '0');
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
        const getDeleteIcon = (component: UserAgentClientHintsForm) => {
          const deleteIcon = queryAll(component, '.delete-icon', HTMLElement)
                                 .find(icon => icon.closest('.brand-row')?.querySelector(brandInputSelector));
          assert.exists(deleteIcon);
          return deleteIcon;
        };

        it('adds a brand row on click and focuses the new brand input', async () => {
          const metaData = createTestMetaData();
          const initialLength = metaData[metaDataKey].length;
          const component = await renderUserAgentClientHintsForm({metaData});
          await openForm(component);
          const changes = recordChanges(component);

          dispatchClickEvent(query(component, `#${addButtonId}`, HTMLElement));
          await component.updateComplete;

          assert.lengthOf(changes, 1);
          const brandList = component.value.metaData?.[metaDataKey];
          assert.lengthOf(brandList ?? [], initialLength + 1);
          assert.deepEqual(brandList?.at(-1), {brand: '', version: ''});

          const brandInputs = queryAll(component, brandInputSelector, HTMLInputElement);
          assert.lengthOf(brandInputs, initialLength + 1);
          assert.strictEqual(document.activeElement, brandInputs.at(-1));

          const ariaLive = query(component, '[aria-live="polite"]', HTMLElement);
          assert.strictEqual(ariaLive.getAttribute('aria-label'), 'Added brand row');
        });

        it('adds a brand row when Enter or Space is pressed on the add button', async () => {
          const metaData = createTestMetaData();
          const initialLength = metaData[metaDataKey].length;
          const component = await renderUserAgentClientHintsForm({metaData});

          const pressKey = async (code: string) => {
            query(component, `#${addButtonId}`, HTMLElement).dispatchEvent(new KeyboardEvent('keypress', {code}));
            await component.updateComplete;
            return component.value.metaData?.[metaDataKey]?.length;
          };

          assert.strictEqual(await pressKey('Enter'), initialLength + 1);
          assert.strictEqual(await pressKey('Space'), initialLength + 2);
          assert.strictEqual(await pressKey('KeyA'), initialLength + 2);
        });

        it('deletes a brand row and focuses the next brand input', async () => {
          const metaData = createTestMetaData();
          metaData[metaDataKey] = [
            {brand: 'First', version: '1'},
            {brand: 'Second', version: '2'},
          ];
          const component = await renderUserAgentClientHintsForm({metaData});
          await openForm(component);
          const changes = recordChanges(component);

          dispatchClickEvent(getDeleteIcon(component));
          await component.updateComplete;

          assert.lengthOf(changes, 1);
          assert.deepEqual(component.value.metaData?.[metaDataKey], [{brand: 'Second', version: '2'}]);
          const brandInputs = queryAll(component, brandInputSelector, HTMLInputElement);
          assert.deepEqual(brandInputs.map(input => input.value), ['Second']);
          assert.strictEqual(document.activeElement, brandInputs[0]);
          assert.strictEqual(brandInputs[0].id, `${idPrefix}-brand-1-input`);

          const ariaLive = query(component, '[aria-live="polite"]', HTMLElement);
          assert.strictEqual(ariaLive.getAttribute('aria-label'), 'Deleted brand row');
        });

        it('deletes the last brand row and focuses the add button', async () => {
          const metaData = createTestMetaData();
          metaData[metaDataKey] = [{brand: 'Only', version: '1'}];
          const component = await renderUserAgentClientHintsForm({metaData});
          await openForm(component);

          getDeleteIcon(component).dispatchEvent(new KeyboardEvent('keypress', {code: 'Enter'}));
          await component.updateComplete;

          assert.deepEqual(component.value.metaData?.[metaDataKey], []);
          assert.lengthOf(queryAll(component, brandInputSelector, HTMLInputElement), 0);
          assert.strictEqual(document.activeElement, query(component, `#${addButtonId}`, HTMLElement));
        });

        it('does not change the given brand array when a row is deleted', async () => {
          const metaData = createTestMetaData();
          const givenBrands = [
            {brand: 'First', version: '1'},
            {brand: 'Second', version: '2'},
          ];
          metaData[metaDataKey] = givenBrands;
          const component = await renderUserAgentClientHintsForm({metaData});

          dispatchClickEvent(getDeleteIcon(component));
          await component.updateComplete;

          assert.deepEqual(component.value.metaData?.[metaDataKey], [{brand: 'Second', version: '2'}]);
          assert.deepEqual(givenBrands, [
            {brand: 'First', version: '1'},
            {brand: 'Second', version: '2'},
          ]);
        });

        it('does not change the default metadata when a default row is deleted', async () => {
          const firstComponent = await renderUserAgentClientHintsForm({});
          dispatchClickEvent(getDeleteIcon(firstComponent));
          await firstComponent.updateComplete;
          assert.deepEqual(firstComponent.value.metaData?.[metaDataKey], []);

          const secondComponent = new UserAgentClientHintsForm();
          renderElementIntoDOM(secondComponent, {allowMultipleChildren: true});
          secondComponent.value = {};
          assert.deepEqual(secondComponent.value.metaData?.[metaDataKey], [{brand: '', version: ''}]);
        });

        it('updates the brand name and version on input', async () => {
          const metaData = createTestMetaData();
          metaData[metaDataKey] = [{brand: 'Old', version: '1'}];
          const component = await renderUserAgentClientHintsForm({metaData});
          const changes = recordChanges(component);

          const brandInput = query(component, brandInputSelector, HTMLInputElement);
          brandInput.value = 'New';
          dispatchInputEvent(brandInput);
          await component.updateComplete;
          assert.deepEqual(component.value.metaData?.[metaDataKey], [{brand: 'New', version: '1'}]);

          const versionInput = brandInput.nextElementSibling;
          assert.instanceOf(versionInput, HTMLInputElement);
          versionInput.value = '2';
          dispatchInputEvent(versionInput);
          await component.updateComplete;
          assert.deepEqual(component.value.metaData?.[metaDataKey], [{brand: 'New', version: '2'}]);
          assert.lengthOf(changes, 2);
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
        const component = await renderUserAgentClientHintsForm({metaData: createTestMetaData()});
        const changes = recordChanges(component);

        const input = query(component, `input[placeholder="${placeholder}"]`, HTMLInputElement);
        input.value = 'test-value';
        dispatchInputEvent(input);

        assert.strictEqual(component.value.metaData?.[stateKey], 'test-value');
        assert.strictEqual(changes.at(-1)?.[stateKey], 'test-value');
      });
    }
  });

  describe('mobile checkbox', () => {
    it('does not render the mobile checkbox by default', async () => {
      const component = await renderUserAgentClientHintsForm({metaData: createTestMetaData()});

      assert.isNull(component.contentElement.querySelector('.mobile-checkbox-container'));
      const modelInput = query(component, 'input[placeholder="Device model (Sec-CH-UA-Model)"]', HTMLInputElement);
      assert.isTrue(modelInput.classList.contains('full-row'));
    });

    it('renders the mobile checkbox and updates the mobile value', async () => {
      const component =
          await renderUserAgentClientHintsForm({metaData: createTestMetaData(), showMobileCheckbox: true});

      const modelInput = query(component, 'input[placeholder="Device model (Sec-CH-UA-Model)"]', HTMLInputElement);
      assert.isTrue(modelInput.classList.contains('device-model-input'));

      const checkbox = query(component, '.mobile-checkbox-container input[type="checkbox"]', HTMLInputElement);
      assert.isFalse(checkbox.checked);

      checkbox.checked = true;
      dispatchInputEvent(checkbox);

      assert.isTrue(component.value.metaData?.mobile);
    });
  });

  describe('submit button', () => {
    it('does not render the submit button by default', async () => {
      const component = await renderUserAgentClientHintsForm({metaData: createTestMetaData()});

      assert.isNull(component.contentElement.querySelector('devtools-button'));
    });

    it('does not dispatch a submit event when the submit button is hidden', async () => {
      const component = await renderUserAgentClientHintsForm({metaData: createTestMetaData()});
      const submitted = recordSubmits(component);

      getFormContainer(component).dispatchEvent(new SubmitEvent('submit', {cancelable: true}));

      assert.lengthOf(submitted, 0);
    });
  });

  describe('validate', () => {
    it('returns valid for representable values', async () => {
      const component =
          await renderUserAgentClientHintsForm({metaData: {...createTestMetaData(), formFactors: ['Desktop', 'XR']}});

      assert.deepEqual(component.validate(), {valid: true});
    });

    it('returns invalid for a brand that is not representable', async () => {
      const metaData = createTestMetaData();
      metaData.brands = [{brand: 'Brand\u2603', version: '1'}];
      const component = await renderUserAgentClientHintsForm({metaData});

      assert.deepEqual(component.validate(),
                       {valid: false, errorMessage: 'Not representable as structured headers string'});
    });

    it('returns invalid for a full version list brand that is not representable', async () => {
      const metaData = createTestMetaData();
      metaData.fullVersionList = [{brand: 'Brand', version: '1.\u2603'}];
      const component = await renderUserAgentClientHintsForm({metaData});

      assert.deepEqual(component.validate(),
                       {valid: false, errorMessage: 'Not representable as structured headers string'});
    });

    it('returns invalid for a text field that is not representable', async () => {
      const component =
          await renderUserAgentClientHintsForm({metaData: {...createTestMetaData(), platform: 'Platform\u2603'}});

      assert.deepEqual(component.validate(),
                       {valid: false, errorMessage: 'Not representable as structured headers string'});
    });

    it('returns invalid for an unknown form factor', async () => {
      const component =
          await renderUserAgentClientHintsForm({metaData: {...createTestMetaData(), formFactors: ['Toaster']}});

      const result = component.validate();
      assert.isFalse(result.valid);
      assert.include(result.errorMessage, 'Toaster');
    });
  });

  describe('presenter', () => {
    const createWidget = async () => {
      const view = createViewFunctionStub(UserAgentClientHintsForm);
      const widget = new UserAgentClientHintsForm(undefined, view);
      renderElementIntoDOM(widget);
      await view.nextInput;
      return {view, widget};
    };

    it('passes the value and the display options to the view', async () => {
      const {view, widget} = await createWidget();
      const metaData = createTestMetaData();

      widget.value = {metaData, showMobileCheckbox: true, showSubmitButton: true};
      const input = await view.nextInput;

      assert.deepEqual(input.brands, metaData.brands);
      assert.deepEqual(input.fullVersionList, metaData.fullVersionList);
      assert.deepEqual(input.formFactors, metaData.formFactors);
      assert.strictEqual(input.platform, metaData.platform);
      assert.strictEqual(input.mobile, metaData.mobile);
      assert.isTrue(input.showMobileCheckbox);
      assert.isTrue(input.showSubmitButton);
      assert.isFalse(input.isFormOpened);
      assert.isFalse(input.isFormDisabled);
    });

    it('toggles the form when the view calls onTreeToggle', async () => {
      const {view} = await createWidget();

      view.input.onTreeToggle();
      assert.isTrue((await view.nextInput).isFormOpened);

      view.input.onTreeToggle('ArrowRight');
      view.input.onTreeToggle('ArrowLeft');
      assert.isFalse((await view.nextInput).isFormOpened);
    });

    it('focuses the new brand input through the view output after a brand is added', async () => {
      const {view, widget} = await createWidget();
      widget.value = {metaData: createTestMetaData()};
      await view.nextInput;
      const focusedInputs: Array<{list: string, index: number}> = [];
      view.args[0][1].focusBrandInput = (list: string, index: number) => focusedInputs.push({list, index});

      view.input.onBrandAdd('fullVersionList');
      await view.nextInput;
      await widget.updateComplete;

      assert.deepEqual(focusedInputs, [{list: 'fullVersionList', index: 1}]);
    });

    it('keeps an open form open when disabled is set to false again', async () => {
      const {view, widget} = await createWidget();
      view.input.onTreeToggle();
      assert.isTrue((await view.nextInput).isFormOpened);
      const callCount = view.callCount;

      widget.disabled = false;
      await widget.updateComplete;

      assert.strictEqual(view.callCount, callCount, 'The widget does not update for the same value');
      assert.isTrue(view.input.isFormOpened);
    });

    it('closes the form and updates the view when the form becomes disabled', async () => {
      const {view, widget} = await createWidget();
      view.input.onTreeToggle();
      assert.isTrue((await view.nextInput).isFormOpened);

      widget.disabled = true;
      const disabledInput = await view.nextInput;
      assert.isTrue(disabledInput.isFormDisabled);
      assert.isFalse(disabledInput.isFormOpened);

      widget.disabled = false;
      const enabledInput = await view.nextInput;
      assert.isFalse(enabledInput.isFormDisabled);
      assert.isFalse(enabledInput.isFormOpened);
    });

    it('dispatches a change event with the new metadata when the view changes a value', async () => {
      const {view, widget} = await createWidget();
      const changes = recordChanges(widget);

      view.input.onTextFieldChange('architecture', 'arm');

      assert.lengthOf(changes, 1);
      assert.strictEqual(changes[0].architecture, 'arm');
      assert.strictEqual((await view.nextInput).architecture, 'arm');
    });
  });

  describe('presenter view input', () => {
    it('passes one empty brand row when the metadata has no brand list', async () => {
      const view = createViewFunctionStub(UserAgentClientHintsForm);
      const widget = new UserAgentClientHintsForm(undefined, view);
      renderElementIntoDOM(widget);
      widget.value = {
        metaData: {
          brands: undefined,
          fullVersionList: undefined,
          formFactors: undefined,
          fullVersion: undefined,
          platform: '',
          platformVersion: '',
          architecture: '',
          model: '',
          mobile: false,
        },
      };
      const input = await view.nextInput;

      assert.deepEqual(input.brands, [{brand: '', version: ''}]);
      assert.deepEqual(input.fullVersionList, [{brand: '', version: ''}]);
      assert.deepEqual(input.formFactors, []);
      assert.strictEqual(input.fullVersion, '');
    });

    it('updates the mobile value when the view calls onMobileChange', async () => {
      const view = createViewFunctionStub(UserAgentClientHintsForm);
      const widget = new UserAgentClientHintsForm(undefined, view);
      renderElementIntoDOM(widget);
      await view.nextInput;

      view.input.onMobileChange(true);

      assert.isTrue(widget.value.metaData?.mobile);
      assert.isTrue((await view.nextInput).mobile);
    });
  });

  it('renders the expanded form', async () => {
    const component = await renderUserAgentClientHintsForm({
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
    },
                                                           {includeCommonStyles: true, width: 400});
    await openForm(component);

    await assertScreenshot('settings/user_agent_client_hints_form.png');
  });
});
