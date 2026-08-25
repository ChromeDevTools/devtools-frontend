// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as UI from './legacy.js';

describeWithEnvironment('EmptyWidget', () => {
  it('renders header and text', () => {
    const widget = new UI.EmptyWidget.EmptyWidget('No Data', 'Please select an item');
    widget.markAsRoot();
    renderElementIntoDOM(widget);

    const header = widget.contentElement.querySelector('.empty-state-header');
    assert.strictEqual(header?.textContent, 'No Data');

    const text = widget.contentElement.querySelector('.empty-state-description span');
    assert.strictEqual(text?.textContent, 'Please select an item');
  });

  it('renders elements in the default slot', () => {
    const widget = new UI.EmptyWidget.EmptyWidget('No Recording', 'Click to start');

    const button = document.createElement('button');
    button.id = 'test-button';
    button.textContent = 'Start';
    widget.element.appendChild(button);

    widget.markAsRoot();
    renderElementIntoDOM(widget);

    const slot = widget.contentElement.querySelector('slot');
    assert.exists(slot);
    const assignedNodes = slot?.assignedNodes();
    assert.strictEqual(assignedNodes?.length, 1);
    assert.strictEqual(assignedNodes?.[0], button);
  });
});
