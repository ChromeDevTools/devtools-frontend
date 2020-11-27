// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UIComponents from '../../../../../front_end/ui/components/components.js';

import {assertElement, assertShadowRoot, dispatchClickEvent, getEventPromise, renderElementIntoDOM} from '../../helpers/DOMHelpers.js';
const {assert} = chai;

describe('Linkifier', () => {
  it('renders a link when given a URL', () => {
    const component = new UIComponents.Linkifier.Linkifier();
    component.data = {
      url: 'https://example.com',
    };
    renderElementIntoDOM(component);
    assertShadowRoot(component.shadowRoot);
    const link = component.shadowRoot.querySelector('a');
    assertElement(link, HTMLAnchorElement);
    assert.strictEqual(link.innerText, 'example.com');
  });

  it('throws when given an invalid URL', () => {
    const component = new UIComponents.Linkifier.Linkifier();
    assert.throws(() => {
      component.data = {
        url: '',
      };
    }, 'Cannot construct a Linkifier without providing a valid string URL.');
  });

  it('appends the line number to the URL if given, and adds one to deal with 0 indexing', () => {
    const component = new UIComponents.Linkifier.Linkifier();
    component.data = {
      url: 'https://example.com',
      lineNumber: 1,
    };
    renderElementIntoDOM(component);
    assertShadowRoot(component.shadowRoot);
    const link = component.shadowRoot.querySelector('a');
    assertElement(link, HTMLAnchorElement);
    assert.strictEqual(link.innerText, 'example.com:2');
  });

  it('emits an event when clicked', async () => {
    const component = new UIComponents.Linkifier.Linkifier();
    component.data = {
      url: 'https://example.com',
      lineNumber: 1,
      columnNumber: 50,
    };
    renderElementIntoDOM(component);
    assertShadowRoot(component.shadowRoot);
    const link = component.shadowRoot.querySelector('a');
    assertElement(link, HTMLAnchorElement);

    const clickEventPromise = getEventPromise<UIComponents.Linkifier.LinkifierClick>(component, 'linkifier-activated');
    dispatchClickEvent(link, {
      cancelable: true,
    });
    const clickEvent = await clickEventPromise;
    assert.deepEqual(clickEvent.data, {
      url: 'https://example.com',
      lineNumber: 1,
      columnNumber: 50,
    });
  });
});
