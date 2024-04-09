// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
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
