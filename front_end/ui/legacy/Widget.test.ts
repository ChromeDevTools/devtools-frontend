// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';

import * as UI from './legacy.js';

describe('Widget', () => {
  it('monkey-patches `Element#appendChild()` to sanity-check that widgets are properly attached', () => {
    const div = document.createElement('div');
    renderElementIntoDOM(div);

    const widget = new UI.Widget.Widget();
    widget.markAsRoot();

    assert.throws(() => div.appendChild(widget.element));
  });

  it('monkey-patches `Element#insertBefore()` to sanity-check that widgets are properly attached', () => {
    const div = document.createElement('div');
    renderElementIntoDOM(div);
    const child = document.createElement('span');
    div.appendChild(child);

    const widget = new UI.Widget.Widget();
    widget.markAsRoot();

    assert.throws(() => div.insertBefore(widget.element, child));
  });

  it('monkey-patches `Element#removeChild()` to sanity-check that widgets are properly detached', () => {
    const div = document.createElement('div');
    renderElementIntoDOM(div);

    const widget = new UI.Widget.Widget();
    widget.markAsRoot();
    widget.show(div);

    assert.throws(() => div.removeChild(widget.element));
  });

  it('monkey-patches `Element#removeChildren()` to sanity-check that widgets are properly detached', () => {
    const div = document.createElement('div');
    renderElementIntoDOM(div);

    const widget = new UI.Widget.Widget();
    widget.markAsRoot();
    widget.show(div);

    assert.throws(() => div.removeChildren());
  });
});
