// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  dispatchClickEvent,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../../testing/EnvironmentHelpers.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';

import * as ElementsComponents from './components.js';

describeWithLocale('Elements tree expand button', () => {
  it('render and click handler trigger correctly', async () => {
    const component = new ElementsComponents.ElementsTreeExpandButton.ElementsTreeExpandButton();

    let clicks = 0;
    const clickHandler = () => clicks++;
    component.data = {
      clickHandler,
    };

    renderElementIntoDOM(component);
    await RenderCoordinator.done();

    const button = component.shadowRoot!.querySelector('.expand-button');
    assert.instanceOf(button, HTMLElement);

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
    await RenderCoordinator.done();

    const button = component.shadowRoot!.querySelector('.expand-button');
    assert.instanceOf(button, HTMLElement);

    assert.strictEqual(button.innerText, '');
  });
});
