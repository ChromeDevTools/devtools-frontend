// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  dispatchClickEvent,
  renderElementIntoDOM,
} from '../../testing/DOMHelpers.js';
import {
  deinitializeGlobalVars,
  initializeGlobalVars,
} from '../../testing/EnvironmentHelpers.js';
import * as Buttons from '../components/buttons/buttons.js';

import * as UI from './legacy.js';

describe('Infobar', () => {
  before(async () => {
    await initializeGlobalVars();
  });

  after(async () => {
    await deinitializeGlobalVars();
  });

  const checkDetailsMessage = (component: UI.Infobar.Infobar, messageText: string) => {
    renderElementIntoDOM(component.element);

    const infobar = component.element.shadowRoot!.querySelector('.infobar');
    assert.instanceOf(infobar, HTMLDivElement);
    const learnMoreButton = infobar.querySelector('devtools-button');
    assert.instanceOf(learnMoreButton, Buttons.Button.Button);
    const detailsRow = infobar.querySelector('.infobar-details-rows');
    assert.instanceOf(detailsRow, HTMLDivElement);

    assert.isTrue(detailsRow.classList.contains('hidden'), 'Details row should initially be hidden');
    assert.strictEqual(detailsRow.textContent, messageText);

    dispatchClickEvent(learnMoreButton);
    assert.isFalse(
        detailsRow.classList.contains('hidden'),
        'Details row should not be hidden after clicking on learn-more-button');
  };

  it('shows details message containing a string', () => {
    const component = new UI.Infobar.Infobar(UI.Infobar.Type.WARNING, 'This is a warning');
    const messageText = 'This is a more detailed warning';
    component.createDetailsRowMessage(messageText);
    checkDetailsMessage(component, messageText);
  });

  it('shows details message containing HTML element(s)', () => {
    const component = new UI.Infobar.Infobar(UI.Infobar.Type.WARNING, 'This is a warning');
    const linkText = 'example-link';
    const link = UI.XLink.XLink.create('https://www.example.com', linkText);
    component.createDetailsRowMessage(link);
    checkDetailsMessage(component, linkText);
  });
});
