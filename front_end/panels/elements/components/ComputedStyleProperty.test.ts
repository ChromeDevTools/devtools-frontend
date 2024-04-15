// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {getEventPromise, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';

import * as ElementsComponents from './components.js';

describe('ComputedStyleProperty', () => {
  it('renders inherited property correctly', () => {
    const component = new ElementsComponents.ComputedStyleProperty.ComputedStyleProperty();
    renderElementIntoDOM(component);
    component.traceable = false;
    component.inherited = true;

    const wrapper = component.shadowRoot!.querySelector('.computed-style-property.inherited');
    assert.exists(wrapper, 'it should add .inherited class to wrapper for inherited properties');
  });

  it('renders a clickable goto icon that dispatches a onNavigateToSource event', async () => {
    const component = new ElementsComponents.ComputedStyleProperty.ComputedStyleProperty();
    renderElementIntoDOM(component);
    component.traceable = true;
    component.inherited = false;

    const navigateEvent =
        getEventPromise(component, ElementsComponents.ComputedStyleProperty.NavigateToSourceEvent.eventName);

    const goto = component.shadowRoot!.querySelector<HTMLElement>('.goto');
    if (!goto) {
      assert.fail('goto icon should exist');
      return;
    }
    goto.click();
    const event = await navigateEvent;
    assert.exists(event);
  });
});
