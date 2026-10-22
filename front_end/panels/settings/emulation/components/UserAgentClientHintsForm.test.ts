// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

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
import * as Lit from '../../../../ui/lit/lit.js';

import * as EmulationComponents from './components.js';

const {UserAgentClientHintsForm, DEFAULT_VIEW, ALL_PROTOCOL_FORM_FACTORS, Events} =
    EmulationComponents.UserAgentClientHintsForm;
type ViewInput = EmulationComponents.UserAgentClientHintsForm.ViewInput;
type ViewOutput = EmulationComponents.UserAgentClientHintsForm.ViewOutput;

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

  const brandLists = [
    {
      list: 'brands',
      idPrefix: 'ua',
      brandInputSelector: '.ua-brand-name-input',
      addButtonId: 'add-brand-button',
    },
    {
      list: 'fullVersionList',
      idPrefix: 'fvl',
      brandInputSelector: '.fvl-brand-name-input',
      addButtonId: 'add-fvl-brand-button',
    },
  ] as const;

  describe('presenter', () => {
    const createWidget = async (data?: EmulationComponents.UserAgentClientHintsForm.UserAgentClientHintsFormData) => {
      const view = createViewFunctionStub(UserAgentClientHintsForm);
      const widget = new UserAgentClientHintsForm(undefined, view);
      renderElementIntoDOM(widget);
      if (data) {
        widget.value = data;
      }
      await view.nextInput;
      const output: ViewOutput = view.args[0][1];
      return {view, widget, output};
    };

    /**
     * Returns the metadata values that the form reports through
     * `CLIENT_HINTS_CHANGE` events.
     */
    const recordChanges = (widget: InstanceType<typeof UserAgentClientHintsForm>) => {
      const changes: Protocol.Emulation.UserAgentMetadata[] = [];
      widget.addEventListener(Events.CLIENT_HINTS_CHANGE, event => changes.push(event.data));
      return changes;
    };

    /**
     * Returns the metadata values that the form reports through
     * `CLIENT_HINTS_SUBMIT` events.
     */
    const recordSubmits = (widget: InstanceType<typeof UserAgentClientHintsForm>) => {
      const submits: Protocol.Emulation.UserAgentMetadata[] = [];
      widget.addEventListener(Events.CLIENT_HINTS_SUBMIT, event => submits.push(event.data));
      return submits;
    };

    describe('view input', () => {
      it('passes the value and the display options to the view', async () => {
        const metaData = {...createTestMetaData(), fullVersion: '1.2.3.4', platform: 'Android', model: 'Pixel'};
        const {view} = await createWidget({metaData, showMobileCheckbox: true, showSubmitButton: true});

        assert.deepEqual(view.input.brands, metaData.brands);
        assert.deepEqual(view.input.fullVersionList, metaData.fullVersionList);
        assert.deepEqual(view.input.formFactors, metaData.formFactors);
        assert.strictEqual(view.input.fullVersion, '1.2.3.4');
        assert.strictEqual(view.input.platform, 'Android');
        assert.strictEqual(view.input.model, 'Pixel');
        assert.isFalse(view.input.mobile);
        assert.isTrue(view.input.showMobileCheckbox);
        assert.isTrue(view.input.showSubmitButton);
        assert.isFalse(view.input.isFormOpened);
        assert.isFalse(view.input.isFormDisabled);
        assert.strictEqual(view.input.useragentModifiedAriaMessage, '');
      });

      it('passes one empty brand row when the metadata has no brand list', async () => {
        const {view} = await createWidget({
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
        });

        assert.deepEqual(view.input.brands, [{brand: '', version: ''}]);
        assert.deepEqual(view.input.fullVersionList, [{brand: '', version: ''}]);
        assert.deepEqual(view.input.formFactors, []);
        assert.strictEqual(view.input.fullVersion, '');
      });

      it('returns the current metadata from the value getter', async () => {
        const metaData = createTestMetaData();
        const {widget} = await createWidget({metaData});

        assert.deepEqual(widget.value, {metaData});
      });
    });

    describe('tree toggle', () => {
      it('opens and closes the form', async () => {
        const {view} = await createWidget({metaData: createTestMetaData()});

        view.input.onTreeToggle();
        assert.isTrue((await view.nextInput).isFormOpened);

        view.input.onTreeToggle();
        assert.isFalse((await view.nextInput).isFormOpened);
      });

      it('opens only with ArrowRight and closes only with ArrowLeft', async () => {
        const {view} = await createWidget({metaData: createTestMetaData()});

        view.input.onTreeToggle('ArrowLeft');
        view.input.onTreeToggle('ArrowRight');
        assert.isTrue((await view.nextInput).isFormOpened, 'ArrowLeft keeps a closed form closed');

        view.input.onTreeToggle('ArrowRight');
        view.input.onTreeToggle('ArrowLeft');
        assert.isFalse((await view.nextInput).isFormOpened, 'ArrowRight keeps an open form open');

        view.input.onTreeToggle('Enter');
        assert.isTrue((await view.nextInput).isFormOpened, 'Enter toggles the form');
      });

      it('does not open the form when the form is disabled', async () => {
        const {view, widget} = await createWidget({metaData: createTestMetaData()});
        widget.disabled = true;
        assert.isTrue((await view.nextInput).isFormDisabled);
        const callCount = view.callCount;

        view.input.onTreeToggle();
        await widget.updateComplete;

        sinon.assert.callCount(view, callCount);
        assert.isFalse(view.input.isFormOpened);
      });
    });

    describe('disabled', () => {
      it('keeps an open form open when disabled is set to false again', async () => {
        const {view, widget} = await createWidget();
        view.input.onTreeToggle();
        assert.isTrue((await view.nextInput).isFormOpened);
        const callCount = view.callCount;

        widget.disabled = false;
        await widget.updateComplete;

        assert.strictEqual(view.callCount, callCount, 'The widget does not update for the same value');
        assert.isTrue(view.input.isFormOpened);
        assert.isFalse(widget.disabled);
      });

      it('closes the form and updates the view when the form becomes disabled', async () => {
        const {view, widget} = await createWidget();
        view.input.onTreeToggle();
        assert.isTrue((await view.nextInput).isFormOpened);

        widget.disabled = true;
        const disabledInput = await view.nextInput;
        assert.isTrue(disabledInput.isFormDisabled);
        assert.isFalse(disabledInput.isFormOpened);
        assert.isTrue(widget.disabled);

        widget.disabled = false;
        const enabledInput = await view.nextInput;
        assert.isFalse(enabledInput.isFormDisabled);
        assert.isFalse(enabledInput.isFormOpened);
      });
    });

    describe('brand rows', () => {
      for (const {list} of brandLists) {
        describe(list, () => {
          it('adds an empty brand row and focuses its brand input', async () => {
            const metaData = createTestMetaData();
            const initialLength = metaData[list].length;
            const {view, widget, output} = await createWidget({metaData});
            const changes = recordChanges(widget);
            const focusBrandInput = sinon.spy();
            output.focusBrandInput = focusBrandInput;

            view.input.onBrandAdd(list);
            const input = await view.nextInput;
            await widget.updateComplete;

            assert.lengthOf(input[list], initialLength + 1);
            assert.deepEqual(input[list].at(-1), {brand: '', version: ''});
            assert.strictEqual(input.useragentModifiedAriaMessage, 'Added brand row');
            assert.lengthOf(changes, 1);
            assert.deepEqual(changes[0][list], input[list]);
            sinon.assert.calledOnceWithExactly(focusBrandInput, list, initialLength);
          });

          it('deletes a brand row and focuses the next brand input', async () => {
            const metaData = createTestMetaData();
            metaData[list] = [
              {brand: 'First', version: '1'},
              {brand: 'Second', version: '2'},
            ];
            const {view, widget, output} = await createWidget({metaData});
            const changes = recordChanges(widget);
            const focusBrandInput = sinon.spy();
            const focusAddBrandButton = sinon.spy();
            output.focusBrandInput = focusBrandInput;
            output.focusAddBrandButton = focusAddBrandButton;

            view.input.onBrandDelete(list, 0);
            const input = await view.nextInput;
            await widget.updateComplete;

            assert.deepEqual(input[list], [{brand: 'Second', version: '2'}]);
            assert.strictEqual(input.useragentModifiedAriaMessage, 'Deleted brand row');
            assert.lengthOf(changes, 1);
            sinon.assert.calledOnceWithExactly(focusBrandInput, list, 0);
            sinon.assert.notCalled(focusAddBrandButton);
          });

          it('deletes the last brand row and focuses the add button', async () => {
            const metaData = createTestMetaData();
            metaData[list] = [{brand: 'Only', version: '1'}];
            const {view, widget, output} = await createWidget({metaData});
            const focusBrandInput = sinon.spy();
            const focusAddBrandButton = sinon.spy();
            output.focusBrandInput = focusBrandInput;
            output.focusAddBrandButton = focusAddBrandButton;

            view.input.onBrandDelete(list, 0);
            const input = await view.nextInput;
            await widget.updateComplete;

            assert.deepEqual(input[list], []);
            sinon.assert.notCalled(focusBrandInput);
            sinon.assert.calledOnceWithExactly(focusAddBrandButton, list);
          });

          it('does not change the given brand array when a row is deleted', async () => {
            const metaData = createTestMetaData();
            const givenBrands = [
              {brand: 'First', version: '1'},
              {brand: 'Second', version: '2'},
            ];
            metaData[list] = givenBrands;
            const {view, widget} = await createWidget({metaData});

            view.input.onBrandDelete(list, 0);
            await view.nextInput;

            assert.deepEqual(widget.value.metaData?.[list], [{brand: 'Second', version: '2'}]);
            assert.deepEqual(givenBrands, [
              {brand: 'First', version: '1'},
              {brand: 'Second', version: '2'},
            ]);
          });

          it('does not change the default metadata when a default row is deleted', async () => {
            const {view, widget} = await createWidget({});
            view.input.onBrandDelete(list, 0);
            await view.nextInput;
            assert.deepEqual(widget.value.metaData?.[list], []);

            const secondWidget =
                new UserAgentClientHintsForm(undefined, createViewFunctionStub(UserAgentClientHintsForm));
            secondWidget.value = {};
            assert.deepEqual(secondWidget.value.metaData?.[list], [{brand: '', version: ''}]);
          });

          it('updates the brand name and version', async () => {
            const metaData = createTestMetaData();
            metaData[list] = [{brand: 'Old', version: '1'}];
            const {view, widget} = await createWidget({metaData});
            const changes = recordChanges(widget);

            view.input.onBrandInputChange(list, 0, 'brandName', 'New');
            assert.deepEqual((await view.nextInput)[list], [{brand: 'New', version: '1'}]);

            view.input.onBrandInputChange(list, 0, 'brandVersion', '2');
            assert.deepEqual((await view.nextInput)[list], [{brand: 'New', version: '2'}]);
            assert.lengthOf(changes, 2);
          });
        });
      }
    });

    describe('fields', () => {
      const textFields = ['fullVersion', 'platform', 'platformVersion', 'architecture', 'model'] as const;

      for (const field of textFields) {
        it(`updates ${field}`, async () => {
          const {view, widget} = await createWidget({metaData: createTestMetaData()});
          const changes = recordChanges(widget);

          view.input.onTextFieldChange(field, 'test-value');

          assert.strictEqual((await view.nextInput)[field], 'test-value');
          assert.strictEqual(widget.value.metaData?.[field], 'test-value');
          assert.strictEqual(changes.at(-1)?.[field], 'test-value');
        });
      }

      it('updates the mobile value', async () => {
        const {view, widget} = await createWidget({metaData: createTestMetaData()});
        const changes = recordChanges(widget);

        view.input.onMobileChange(true);

        assert.isTrue((await view.nextInput).mobile);
        assert.isTrue(widget.value.metaData?.mobile);
        assert.lengthOf(changes, 1);
      });

      it('adds and removes form factors', async () => {
        const {view, widget} =
            await createWidget({metaData: {...createTestMetaData(), formFactors: ['Desktop', 'Mobile']}});
        const changes = recordChanges(widget);

        view.input.onFormFactorChange('Tablet', true);
        assert.deepEqual((await view.nextInput).formFactors, ['Desktop', 'Mobile', 'Tablet']);

        view.input.onFormFactorChange('Tablet', true);
        assert.deepEqual((await view.nextInput).formFactors, ['Desktop', 'Mobile', 'Tablet']);

        view.input.onFormFactorChange('Mobile', false);
        assert.deepEqual((await view.nextInput).formFactors, ['Desktop', 'Tablet']);
        assert.lengthOf(changes, 3);
      });
    });

    describe('submit', () => {
      it('dispatches a submit event with the metadata when the submit button is shown', async () => {
        const metaData = createTestMetaData();
        const {view, widget} = await createWidget({metaData, showSubmitButton: true});
        const submits = recordSubmits(widget);

        view.input.onSubmit();

        assert.deepEqual(submits, [metaData]);
      });

      it('does not dispatch a submit event when the submit button is hidden', async () => {
        const {view, widget} = await createWidget({metaData: createTestMetaData()});
        const submits = recordSubmits(widget);

        view.input.onSubmit();

        assert.lengthOf(submits, 0);
      });
    });

    describe('validate', () => {
      it('returns valid for representable values', async () => {
        const {widget} = await createWidget({metaData: {...createTestMetaData(), formFactors: ['Desktop', 'XR']}});

        assert.deepEqual(widget.validate(), {valid: true});
      });

      it('returns invalid for a brand that is not representable', async () => {
        const metaData = createTestMetaData();
        metaData.brands = [{brand: 'Brand\u2603', version: '1'}];
        const {widget} = await createWidget({metaData});

        assert.deepEqual(widget.validate(),
                         {valid: false, errorMessage: 'Not representable as structured headers string'});
      });

      it('returns invalid for a full version list brand that is not representable', async () => {
        const metaData = createTestMetaData();
        metaData.fullVersionList = [{brand: 'Brand', version: '1.\u2603'}];
        const {widget} = await createWidget({metaData});

        assert.deepEqual(widget.validate(),
                         {valid: false, errorMessage: 'Not representable as structured headers string'});
      });

      it('returns invalid for a text field that is not representable', async () => {
        const {widget} = await createWidget({metaData: {...createTestMetaData(), platform: 'Platform\u2603'}});

        assert.deepEqual(widget.validate(),
                         {valid: false, errorMessage: 'Not representable as structured headers string'});
      });

      it('returns invalid for an unknown form factor', async () => {
        const {widget} = await createWidget({metaData: {...createTestMetaData(), formFactors: ['Toaster']}});

        const result = widget.validate();
        assert.isFalse(result.valid);
        assert.include(result.errorMessage, 'Toaster');
      });
    });
  });

  describe('presenter with the default view', () => {
    const renderForm = async (data: EmulationComponents.UserAgentClientHintsForm.UserAgentClientHintsFormData) => {
      const widget = new UserAgentClientHintsForm();
      renderElementIntoDOM(widget);
      widget.value = data;
      await widget.updateComplete;
      return widget;
    };

    const query = <T extends Element>(widget: InstanceType<typeof UserAgentClientHintsForm>, selector: string,
                                      elementClass: new () => T): T => {
      const element = widget.contentElement.querySelector(selector);
      assert.instanceOf(element, elementClass);
      return element;
    };

    const openForm = async (widget: InstanceType<typeof UserAgentClientHintsForm>) => {
      dispatchClickEvent(query(widget, '[aria-controls="form-container"]', HTMLElement));
      await widget.updateComplete;
    };

    it('renders the metadata', async () => {
      const widget = await renderForm({metaData: createTestMetaData()});

      const brandInputs = widget.contentElement.querySelectorAll<HTMLInputElement>('.ua-brand-name-input');
      assert.deepEqual([...brandInputs].map(input => input.value), ['Brand1', 'Brand2']);
    });

    for (const {list, brandInputSelector, addButtonId} of brandLists) {
      it(`focuses the new ${list} brand input after a click on the add button`, async () => {
        const widget = await renderForm({metaData: createTestMetaData()});
        await openForm(widget);

        dispatchClickEvent(query(widget, `#${addButtonId}`, HTMLElement));
        await widget.updateComplete;

        const brandInputs = [...widget.contentElement.querySelectorAll(brandInputSelector)];
        assert.strictEqual(document.activeElement, brandInputs.at(-1));
        assert.deepEqual(widget.value.metaData?.[list]?.at(-1), {brand: '', version: ''});
      });

      it(`focuses the ${list} add button after the last brand row is deleted`, async () => {
        const metaData = createTestMetaData();
        metaData[list] = [{brand: 'Only', version: '1'}];
        const widget = await renderForm({metaData});
        await openForm(widget);

        const deleteIcon = [...widget.contentElement.querySelectorAll<HTMLElement>('.delete-icon')].find(
            icon => icon.closest('.brand-row')?.querySelector(brandInputSelector));
        assert.exists(deleteIcon);
        dispatchClickEvent(deleteIcon);
        await widget.updateComplete;

        assert.deepEqual(widget.value.metaData?.[list], []);
        assert.strictEqual(document.activeElement, query(widget, `#${addButtonId}`, HTMLElement));
      });
    }

    it('reports a text field change through a change event', async () => {
      const widget = await renderForm({metaData: createTestMetaData()});
      const changes: Protocol.Emulation.UserAgentMetadata[] = [];
      widget.addEventListener(Events.CLIENT_HINTS_CHANGE, event => changes.push(event.data));

      const input = query(widget, 'input[placeholder="Platform (e.g. Android)"]', HTMLInputElement);
      input.value = 'Android';
      dispatchInputEvent(input);

      assert.strictEqual(changes.at(-1)?.platform, 'Android');
      assert.strictEqual(widget.value.metaData?.platform, 'Android');
    });

    it('dispatches the events as DOM events on the widget element', async () => {
      const metaData = createTestMetaData();
      const widget = await renderForm({metaData, showSubmitButton: true});
      const domEvents: Array<{type: string, detail: unknown}> = [];
      const recordDomEvent = (event: Event) => {
        assert.instanceOf(event, CustomEvent);
        domEvents.push({type: event.type, detail: event.detail});
      };
      widget.element.addEventListener('clienthintschange', recordDomEvent);
      widget.element.addEventListener('clienthintssubmit', recordDomEvent);

      const input = query(widget, 'input[placeholder="Platform (e.g. Android)"]', HTMLInputElement);
      input.value = 'Android';
      dispatchInputEvent(input);
      query(widget, 'devtools-button', Buttons.Button.Button).click();

      assert.deepEqual(domEvents.map(event => event.type), ['clienthintschange', 'clienthintssubmit']);
      assert.deepEqual(domEvents[0].detail, {...metaData, platform: 'Android'});
      assert.strictEqual(domEvents[1].detail, widget.value.metaData);
    });

    it('dispatches a submit event when the user clicks the submit button', async () => {
      const metaData = createTestMetaData();
      const widget = await renderForm({metaData, showSubmitButton: true});
      const submits: Protocol.Emulation.UserAgentMetadata[] = [];
      widget.addEventListener(Events.CLIENT_HINTS_SUBMIT, event => submits.push(event.data));

      query(widget, 'devtools-button', Buttons.Button.Button).click();

      assert.deepEqual(submits, [metaData]);
    });
  });

  describe('view', () => {
    const createViewInput = (overrides: Partial<ViewInput> = {}) => {
      const callbacks = {
        onTreeToggle: sinon.stub<[key?: string], void>(),
        onBrandAdd: sinon.stub<Parameters<ViewInput['onBrandAdd']>, void>(),
        onBrandDelete: sinon.stub<Parameters<ViewInput['onBrandDelete']>, void>(),
        onBrandInputChange: sinon.stub<Parameters<ViewInput['onBrandInputChange']>, void>(),
        onTextFieldChange: sinon.stub<Parameters<ViewInput['onTextFieldChange']>, void>(),
        onMobileChange: sinon.stub<[mobile: boolean], void>(),
        onFormFactorChange: sinon.stub<[formFactor: string, isChecked: boolean], void>(),
        onSubmit: sinon.stub<[], void>(),
      };
      const metaData = createTestMetaData();
      const input: ViewInput = {
        brands: metaData.brands,
        fullVersionList: metaData.fullVersionList,
        fullVersion: metaData.fullVersion,
        formFactors: metaData.formFactors,
        platform: metaData.platform,
        platformVersion: metaData.platformVersion,
        architecture: metaData.architecture,
        model: metaData.model,
        mobile: metaData.mobile,
        isFormOpened: false,
        isFormDisabled: false,
        showMobileCheckbox: false,
        showSubmitButton: false,
        useragentModifiedAriaMessage: '',
        ...callbacks,
        ...overrides,
      };
      return {input, callbacks};
    };

    const renderView = (input: ViewInput, renderOptions?: Parameters<typeof renderElementIntoDOM>[1]) => {
      const target = document.createElement('div');
      renderElementIntoDOM(target, renderOptions);
      const output: ViewOutput = {};
      DEFAULT_VIEW(input, output, target);
      return {target, output};
    };

    const query = <T extends Element>(target: HTMLElement, selector: string, elementClass: new () => T): T => {
      const element = target.querySelector(selector);
      assert.instanceOf(element, elementClass);
      return element;
    };

    const queryAll = <T extends Element>(target: HTMLElement, selector: string, elementClass: new () => T): T[] => {
      const elements = [...target.querySelectorAll(selector)];
      for (const element of elements) {
        assert.instanceOf(element, elementClass);
      }
      return elements as T[];
    };

    const getTreeToggle = (target: HTMLElement) => query(target, '[aria-controls="form-container"]', HTMLElement);

    it('renders the brand rows with their values', () => {
      const {input} = createViewInput();
      const {target} = renderView(input);

      const uaBrandInputs = queryAll(target, '.ua-brand-name-input', HTMLInputElement);
      assert.deepEqual(uaBrandInputs.map(element => element.value), ['Brand1', 'Brand2']);
      assert.deepEqual(uaBrandInputs.map(element => element.id), ['ua-brand-1-input', 'ua-brand-2-input']);
      const fvlBrandInputs = queryAll(target, '.fvl-brand-name-input', HTMLInputElement);
      assert.deepEqual(fvlBrandInputs.map(element => element.value), ['Brand3']);
      assert.deepEqual(fvlBrandInputs.map(element => element.id), ['fvl-brand-1-input']);
    });

    it('hides the form when the form is closed', () => {
      const {input} = createViewInput();
      const {target} = renderView(input);
      assert.strictEqual(getTreeToggle(target).getAttribute('aria-expanded'), 'false');
      assert.isTrue(query(target, '#form-container', HTMLFormElement).classList.contains('hide-container'));

      DEFAULT_VIEW({...input, isFormOpened: true}, {}, target);
      assert.strictEqual(getTreeToggle(target).getAttribute('aria-expanded'), 'true');
      assert.isFalse(query(target, '#form-container', HTMLFormElement).classList.contains('hide-container'));
    });

    it('calls onTreeToggle on click and on the toggle keys', () => {
      const {input, callbacks} = createViewInput();
      const {target} = renderView(input);

      dispatchClickEvent(getTreeToggle(target));
      sinon.assert.calledOnceWithExactly(callbacks.onTreeToggle);

      for (const code of ['ArrowLeft', 'ArrowRight', 'Enter', 'Space']) {
        callbacks.onTreeToggle.resetHistory();
        dispatchKeyDownEvent(getTreeToggle(target), {code});
        sinon.assert.calledOnceWithExactly(callbacks.onTreeToggle, code);
      }

      callbacks.onTreeToggle.resetHistory();
      dispatchKeyDownEvent(getTreeToggle(target), {code: 'KeyA'});
      sinon.assert.notCalled(callbacks.onTreeToggle);
    });

    it('removes the header controls from the tab order when the form is disabled', () => {
      const {input} = createViewInput({isFormDisabled: true});
      const {target} = renderView(input);

      assert.strictEqual(getTreeToggle(target).getAttribute('aria-disabled'), 'true');
      assert.strictEqual(getTreeToggle(target).getAttribute('tabindex'), '-1');
      assert.strictEqual(query(target, '.info-icon', HTMLElement).getAttribute('tabindex'), '-1');
      assert.strictEqual(query(target, 'devtools-link', HTMLElement).getAttribute('tabindex'), '-1');
    });

    it('renders the screen reader message', () => {
      const {input} = createViewInput({useragentModifiedAriaMessage: 'Added brand row'});
      const {target} = renderView(input);

      assert.strictEqual(query(target, '[aria-live="polite"]', HTMLElement).getAttribute('aria-label'),
                         'Added brand row');
    });

    for (const {list, brandInputSelector, addButtonId} of brandLists) {
      describe(`${list} rows`, () => {
        const getDeleteIcons = (target: HTMLElement) =>
            queryAll(target, '.delete-icon', HTMLElement)
                .filter(icon => icon.closest('.brand-row')?.querySelector(brandInputSelector));

        it('calls onBrandAdd on click, Enter, and Space', () => {
          const {input, callbacks} = createViewInput();
          const {target} = renderView(input);
          const addButton = query(target, `#${addButtonId}`, HTMLElement);

          dispatchClickEvent(addButton);
          addButton.dispatchEvent(new KeyboardEvent('keypress', {code: 'Enter'}));
          addButton.dispatchEvent(new KeyboardEvent('keypress', {code: 'Space'}));
          addButton.dispatchEvent(new KeyboardEvent('keypress', {code: 'KeyA'}));

          assert.deepEqual(callbacks.onBrandAdd.args, [[list], [list], [list]]);
        });

        it('calls onBrandDelete with the row index on click and Enter', () => {
          const overrides: Partial<ViewInput> = {};
          overrides[list] = [
            {brand: 'First', version: '1'},
            {brand: 'Second', version: '2'},
          ];
          const {input, callbacks} = createViewInput(overrides);
          const {target} = renderView(input);
          const deleteIcons = getDeleteIcons(target);
          assert.lengthOf(deleteIcons, 2);

          dispatchClickEvent(deleteIcons[1]);
          deleteIcons[0].dispatchEvent(new KeyboardEvent('keypress', {code: 'Enter'}));

          assert.deepEqual(callbacks.onBrandDelete.args, [[list, 1], [list, 0]]);
        });

        it('calls onBrandInputChange when the brand name or version changes', () => {
          const overrides: Partial<ViewInput> = {};
          overrides[list] = [{brand: 'Old', version: '1'}];
          const {input, callbacks} = createViewInput(overrides);
          const {target} = renderView(input);

          const brandInput = query(target, brandInputSelector, HTMLInputElement);
          brandInput.value = 'New';
          dispatchInputEvent(brandInput);
          const versionInput = brandInput.nextElementSibling;
          assert.instanceOf(versionInput, HTMLInputElement);
          versionInput.value = '2';
          dispatchInputEvent(versionInput);

          assert.deepEqual(callbacks.onBrandInputChange.args, [
            [list, 0, 'brandName', 'New'],
            [list, 0, 'brandVersion', '2'],
          ]);
        });
      });
    }

    it('calls onTextFieldChange when a text field changes', () => {
      const textFields = [
        {field: 'fullVersion', placeholder: 'Full browser version (e.g. 87.0.4280.88)'},
        {field: 'platform', placeholder: 'Platform (e.g. Android)'},
        {field: 'platformVersion', placeholder: 'Platform version'},
        {field: 'architecture', placeholder: 'Architecture (e.g. x86)'},
        {field: 'model', placeholder: 'Device model (Sec-CH-UA-Model)'},
      ] as const;
      const {input, callbacks} = createViewInput({
        fullVersion: '1.2.3',
        platform: 'Android',
        platformVersion: '14',
        architecture: 'arm',
        model: 'Pixel',
      });
      const {target} = renderView(input);

      for (const {field, placeholder} of textFields) {
        const textInput = query(target, `input[placeholder="${placeholder}"]`, HTMLInputElement);
        assert.strictEqual(textInput.value, input[field]);
        textInput.value = `new-${field}`;
        dispatchInputEvent(textInput);
      }

      assert.deepEqual(callbacks.onTextFieldChange.args, textFields.map(({field}) => [field, `new-${field}`]));
    });

    it('renders the form factor checkboxes and calls onFormFactorChange', () => {
      const {input, callbacks} = createViewInput({formFactors: ['Desktop', 'Mobile']});
      const {target} = renderView(input);

      assert.lengthOf(queryAll(target, '.form-factor-checkbox-label', HTMLLabelElement),
                      ALL_PROTOCOL_FORM_FACTORS.length);
      for (const formFactor of ALL_PROTOCOL_FORM_FACTORS) {
        const checkbox = query(target, `input[value="${formFactor}"]`, HTMLInputElement);
        assert.strictEqual(checkbox.checked, input.formFactors.includes(formFactor), formFactor);
      }

      query(target, 'input[value="Tablet"]', HTMLInputElement).click();
      query(target, 'input[value="Mobile"]', HTMLInputElement).click();

      assert.deepEqual(callbacks.onFormFactorChange.args, [['Tablet', true], ['Mobile', false]]);
    });

    it('does not render the mobile checkbox by default', () => {
      const {input} = createViewInput();
      const {target} = renderView(input);

      assert.isNull(target.querySelector('.mobile-checkbox-container'));
      const modelInput = query(target, 'input[placeholder="Device model (Sec-CH-UA-Model)"]', HTMLInputElement);
      assert.isTrue(modelInput.classList.contains('full-row'));
    });

    it('renders the mobile checkbox and calls onMobileChange', () => {
      const {input, callbacks} = createViewInput({showMobileCheckbox: true, mobile: false});
      const {target} = renderView(input);

      const modelInput = query(target, 'input[placeholder="Device model (Sec-CH-UA-Model)"]', HTMLInputElement);
      assert.isTrue(modelInput.classList.contains('device-model-input'));
      const checkbox = query(target, '.mobile-checkbox-container input[type="checkbox"]', HTMLInputElement);
      assert.isFalse(checkbox.checked);

      checkbox.checked = true;
      dispatchInputEvent(checkbox);

      sinon.assert.calledOnceWithExactly(callbacks.onMobileChange, true);
    });

    it('does not render the submit button by default', () => {
      const {input} = createViewInput();
      const {target} = renderView(input);

      assert.isNull(target.querySelector('devtools-button'));
    });

    it('renders the submit button and calls onSubmit without the default action', () => {
      const {input, callbacks} = createViewInput({showSubmitButton: true});
      const {target} = renderView(input);
      query(target, 'devtools-button', Buttons.Button.Button);

      const submitEvent = new SubmitEvent('submit', {cancelable: true});
      query(target, '#form-container', HTMLFormElement).dispatchEvent(submitEvent);

      sinon.assert.calledOnceWithExactly(callbacks.onSubmit);
      assert.isTrue(submitEvent.defaultPrevented);
    });

    it('focuses brand inputs and add buttons through the view output', () => {
      const {input} = createViewInput({isFormOpened: true});
      const {target, output} = renderView(input);

      output.focusBrandInput?.('brands', 1);
      assert.strictEqual(document.activeElement, query(target, '#ua-brand-2-input', HTMLInputElement));

      output.focusBrandInput?.('fullVersionList', 0);
      assert.strictEqual(document.activeElement, query(target, '#fvl-brand-1-input', HTMLInputElement));

      output.focusAddBrandButton?.('brands');
      assert.strictEqual(document.activeElement, query(target, '#add-brand-button', HTMLElement));

      output.focusAddBrandButton?.('fullVersionList');
      assert.strictEqual(document.activeElement, query(target, '#add-fvl-brand-button', HTMLElement));
    });

    it('clears the view output when the form is removed', () => {
      const {input} = createViewInput();
      const {target, output} = renderView(input);
      assert.exists(output.focusBrandInput);
      assert.exists(output.focusAddBrandButton);

      Lit.render(Lit.nothing, target);

      assert.isUndefined(output.focusBrandInput);
      assert.isUndefined(output.focusAddBrandButton);
    });

    it('renders the expanded form', async () => {
      const {input} = createViewInput({
        formFactors: ['Desktop', 'XR'],
        fullVersion: '1.2.3.4',
        platform: 'Android',
        platformVersion: '14',
        architecture: 'arm',
        model: 'Pixel',
        mobile: true,
        showMobileCheckbox: true,
        showSubmitButton: true,
        isFormOpened: true,
      });
      renderView(input, {includeCommonStyles: true, width: 400});

      await assertScreenshot('settings/user_agent_client_hints_form.png');
    });
  });
});
