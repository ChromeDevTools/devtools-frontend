// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {
  describeWithEnvironment,
} from '../../../testing/EnvironmentHelpers.js';
import * as Freestyler from '../freestyler.js';

describeWithEnvironment('UserActionRow', () => {
  it('should show the feedback form when canShowFeedbackForm is true', async () => {
    const component = new Freestyler.UserActionRow({
      showRateButtons: true,
      onFeedbackSubmit: sinon.stub(),
      canShowFeedbackForm: true,
      handleSuggestionClick: sinon.stub(),
    });
    renderElementIntoDOM(component);
    const button = component.shadowRoot!.querySelector('.rate-buttons devtools-button')! as HTMLElement;
    button.click();

    assert(component.shadowRoot!.querySelector('.feedback-form'));
  });

  it('should not show the feedback form when canShowFeedbackForm is false', async () => {
    const component = new Freestyler.UserActionRow({
      showRateButtons: true,
      onFeedbackSubmit: sinon.stub(),
      canShowFeedbackForm: false,
      handleSuggestionClick: sinon.stub(),
    });
    renderElementIntoDOM(component);

    const button = component.shadowRoot!.querySelector('.rate-buttons devtools-button')! as HTMLElement;
    button.click();

    assert.notExists(component.shadowRoot!.querySelector('.feedback-form'));
  });

  it('should disable the submit button when the input is empty', async () => {
    const component = new Freestyler.UserActionRow({
      showRateButtons: true,
      onFeedbackSubmit: sinon.stub(),
      canShowFeedbackForm: true,
      handleSuggestionClick: sinon.stub(),
    });
    renderElementIntoDOM(component);
    const button = component.shadowRoot!.querySelector('.rate-buttons devtools-button')! as HTMLElement;
    button.click();

    assert(component.shadowRoot!.querySelector('.feedback-form'));
    const submitButton = component.shadowRoot!.querySelector('[aria-label="Submit"]') as HTMLButtonElement;
    assert.isTrue(submitButton?.disabled);
    const inputField = component.shadowRoot!.querySelector('.feedback-form input')! as HTMLInputElement;
    inputField.value = 'test';
    inputField.dispatchEvent(new Event('input'));
    assert.isFalse(submitButton?.disabled);
  });
});
