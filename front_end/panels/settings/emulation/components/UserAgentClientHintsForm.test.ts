// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type * as Protocol from '../../../../generated/protocol.js';
import {
  getElementsWithinComponent,
  getElementWithinComponent,
  getEventPromise,
  renderElementIntoDOM,
} from '../../../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../../../testing/EnvironmentHelpers.js';
import * as Buttons from '../../../../ui/components/buttons/buttons.js';

import * as EmulationComponents from './components.js';

describeWithLocale('UserAgentClientHintsForm', () => {
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

  const renderUserAgentClientHintsForm = () => {
    const component = new EmulationComponents.UserAgentClientHintsForm.UserAgentClientHintsForm();
    renderElementIntoDOM(component);
    return component;
  };

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
});
