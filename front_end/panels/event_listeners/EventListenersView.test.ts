// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../testing/EnvironmentHelpers.js';

import * as EventListeners from './event_listeners.js';

describeWithLocale('EventListenersView placeholder', () => {
  function assertElementDisplayStyle(
      view: EventListeners.EventListenersView.EventListenersView, selector: string, style: string) {
    const element = view.element.querySelector(selector);
    assert.exists(element);
    assert.deepEqual(window.getComputedStyle(element).display, style);
  }

  it('shows one-liner if in sources', () => {
    const eventListenersView = new EventListeners.EventListenersView.EventListenersView();
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    container.classList.add('sources', 'panel');
    eventListenersView.markAsRoot();
    eventListenersView.show(container);

    assertElementDisplayStyle(eventListenersView, '.empty-view-scroller', 'none');
    assertElementDisplayStyle(eventListenersView, '.placeholder .gray-info-message', 'inline');

    assert.deepEqual(
        eventListenersView.contentElement.querySelector('.placeholder .gray-info-message')?.textContent,
        'No event listeners');
  });

  it('shows empty widget if in elements panel', () => {
    const eventListenersView = new EventListeners.EventListenersView.EventListenersView();
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    container.classList.add('elements', 'panel');
    eventListenersView.markAsRoot();
    eventListenersView.show(container);
    assertElementDisplayStyle(eventListenersView, '.empty-view-scroller', 'flex');
    assertElementDisplayStyle(eventListenersView, '.placeholder .gray-info-message', 'none');

    assert.deepEqual(
        eventListenersView.contentElement.querySelector('.empty-state-header')?.textContent, 'No event listeners');
    assert.deepEqual(
        eventListenersView.contentElement.querySelector('.empty-state-description')?.textContent,
        'On this page you will find registered event listeners');
  });
});
