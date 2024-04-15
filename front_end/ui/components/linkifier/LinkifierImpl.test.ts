// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import {describeWithLocale} from '../../../testing/EnvironmentHelpers.js';
import * as Coordinator from '../render_coordinator/render_coordinator.js';

import * as Linkifier from './linkifier.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

import {
  dispatchClickEvent,
  getEventPromise,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
describeWithLocale('Linkifier', () => {
  it('renders a link when given a URL', async () => {
    const component = new Linkifier.Linkifier.Linkifier();
    component.data = {
      url: 'https://example.com' as Platform.DevToolsPath.UrlString,
    };
    renderElementIntoDOM(component);
    await coordinator.done();
    assert.isNotNull(component.shadowRoot);
    const link = component.shadowRoot.querySelector('a');
    assert.instanceOf(link, HTMLAnchorElement);
    assert.strictEqual(link.innerText, 'example.com');
  });

  it('throws when given an invalid URL', () => {
    const component = new Linkifier.Linkifier.Linkifier();

    assert.throws(() => {
      component.data = {url: Platform.DevToolsPath.EmptyUrlString};
    }, 'Cannot construct a Linkifier without providing a valid string URL.');
  });

  it('appends the line number to the URL if given, and adds one to deal with 0 indexing', async () => {
    const component = new Linkifier.Linkifier.Linkifier();
    component.data = {
      url: 'https://example.com' as Platform.DevToolsPath.UrlString,
      lineNumber: 1,
    };
    renderElementIntoDOM(component);
    await coordinator.done();
    assert.isNotNull(component.shadowRoot);
    const link = component.shadowRoot.querySelector('a');
    assert.instanceOf(link, HTMLAnchorElement);
    assert.strictEqual(link.innerText, 'example.com:2');
  });

  it('emits an event when clicked', async () => {
    const component = new Linkifier.Linkifier.Linkifier();
    component.data = {
      url: 'https://example.com' as Platform.DevToolsPath.UrlString,
      lineNumber: 1,
      columnNumber: 50,
    };
    // Suppress the event so that the link is not actually opened in the test
    // runner by the global handler.
    component.addEventListener('linkifieractivated', e => {
      e.stopPropagation();
      e.preventDefault();
    });
    renderElementIntoDOM(component);
    await coordinator.done();
    assert.isNotNull(component.shadowRoot);
    const link = component.shadowRoot.querySelector('a');
    assert.instanceOf(link, HTMLAnchorElement);

    const clickEventPromise = getEventPromise<Linkifier.Linkifier.LinkifierClick>(component, 'linkifieractivated');
    dispatchClickEvent(link, {
      cancelable: true,
    });
    const clickEvent = await clickEventPromise;
    assert.deepEqual(clickEvent.data, {
      url: 'https://example.com' as Platform.DevToolsPath.UrlString,
      lineNumber: 1,
      columnNumber: 50,
    });
  });
});
