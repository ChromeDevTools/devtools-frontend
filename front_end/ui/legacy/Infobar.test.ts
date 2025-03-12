// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  renderElementIntoDOM,
} from '../../testing/DOMHelpers.js';
import {
  describeWithEnvironment,
} from '../../testing/EnvironmentHelpers.js';

import * as UI from './legacy.js';

describeWithEnvironment('Infobar', () => {
  const checkDetailsMessage = (component: UI.Infobar.Infobar, messageText: string) => {
    renderElementIntoDOM(component.element);

    const infobar = component.element.shadowRoot!.querySelector('.infobar');
    assert.instanceOf(infobar, HTMLDivElement);
    const details = infobar.querySelector('details');
    assert.exists(details);
    assert.isFalse(details.hasAttribute('open'));

    const detailsRow = details.querySelector('.infobar-details-rows');
    assert.strictEqual(detailsRow?.textContent, messageText);

    const summary = details.querySelector('summary');
    assert.exists(summary);
    summary.click();
    assert.isTrue(details.hasAttribute('open'));
  };

  it('shows main message', () => {
    const component = new UI.Infobar.Infobar(UI.Infobar.Type.WARNING, 'This is a warning');
    assert.deepEqual(
        component.element.shadowRoot?.querySelector('.infobar-main-row')?.textContent, 'This is a warning');
  });

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
