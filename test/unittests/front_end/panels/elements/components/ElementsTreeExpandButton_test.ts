// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ElementsComponents from '../../../../../../front_end/panels/elements/components/components.js';
import * as Coordinator from '../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import {
  assertElement,
  assertShadowRoot,
  dispatchClickEvent,
  renderElementIntoDOM,
} from '../../../helpers/DOMHelpers.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

describe('Elements tree expand button', () => {
  it('render and click handler trigger correctly', async () => {
    const component = new ElementsComponents.ElementsTreeExpandButton.ElementsTreeExpandButton();

    let clicks = 0;
    const clickHandler = () => clicks++;
    component.data = {
      clickHandler: clickHandler,
    };

    renderElementIntoDOM(component);
    await coordinator.done();
    assertShadowRoot(component.shadowRoot);

    const button = component.shadowRoot.querySelector('.expand-button');
    assertElement(button, HTMLElement);

    dispatchClickEvent(button);
    assert.strictEqual(clicks, 1);
  });

  it('it should only contains html tags, no other visible characters', async () => {
    const component = new ElementsComponents.ElementsTreeExpandButton.ElementsTreeExpandButton();

    const noop = () => {};
    component.data = {
      clickHandler: noop,
    };

    renderElementIntoDOM(component);
    await coordinator.done();
    assertShadowRoot(component.shadowRoot);

    const button = component.shadowRoot.querySelector('.expand-button');
    assertElement(button, HTMLElement);

    assert.strictEqual(button.innerText, '');
  });
});
