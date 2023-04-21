// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import {assertElement, assertShadowRoot, dispatchClickEvent, renderElementIntoDOM} from '../../helpers/DOMHelpers.js';
import {deinitializeGlobalVars, initializeGlobalVars} from '../../helpers/EnvironmentHelpers.js';

const {assert} = chai;

describe('Infobar', () => {
  before(async () => {
    await initializeGlobalVars();
  });

  after(async () => {
    await deinitializeGlobalVars();
  });

  const checkDetailsMessage = (component: UI.Infobar.Infobar, messageText: string): void => {
    renderElementIntoDOM(component.element);
    assertShadowRoot(component.element.shadowRoot);

    const infobar = component.element.shadowRoot.querySelector('.infobar');
    assertElement(infobar, HTMLDivElement);
    const learnMoreButton = infobar.querySelector('button.text-button');
    assertElement(learnMoreButton, HTMLButtonElement);
    const detailsRow = infobar.querySelector('.infobar-details-rows');
    assertElement(detailsRow, HTMLDivElement);

    assert.isTrue(detailsRow.classList.contains('hidden'), 'Details row should initially be hidden');
    assert.strictEqual(detailsRow.textContent, messageText);

    dispatchClickEvent(learnMoreButton);
    assert.isFalse(
        detailsRow.classList.contains('hidden'),
        'Details row should not be hidden after clicking on learn-more-button');
  };

  it('shows details message containing a string', () => {
    const component = new UI.Infobar.Infobar(UI.Infobar.Type.Warning, 'This is a warning');
    const messageText = 'This is a more detailed warning';
    component.createDetailsRowMessage(messageText);
    checkDetailsMessage(component, messageText);
  });

  it('shows details message containing HTML element(s)', () => {
    const component = new UI.Infobar.Infobar(UI.Infobar.Type.Warning, 'This is a warning');
    const linkText = 'example-link';
    const link = UI.XLink.XLink.create('https://www.example.com', linkText);
    component.createDetailsRowMessage(link);
    checkDetailsMessage(component, linkText);
  });
});
