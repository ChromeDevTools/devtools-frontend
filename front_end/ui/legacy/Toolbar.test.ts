// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Coordinator from '../components/render_coordinator/render_coordinator.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

import {
  dispatchClickEvent,
  renderElementIntoDOM,
} from '../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../testing/EnvironmentHelpers.js';

import * as UI from './legacy.js';

describe('Toolbar', () => {
  describeWithLocale('ToolbarInput', () => {
    it('sets a title on the clear button', async () => {
      const input = new UI.Toolbar.ToolbarInput('placeholder');
      renderElementIntoDOM(input.element);
      input.setValue('test value');
      const clearButton = input.element.querySelector('.toolbar-input-clear-button');
      await coordinator.done();
      const innerButton = clearButton?.shadowRoot?.querySelector('button');
      assert.instanceOf(innerButton, HTMLElement);
      assert.strictEqual(innerButton.title, 'Clear');
    });

    it('clears the input when the clear button is clicked', () => {
      const input = new UI.Toolbar.ToolbarInput('placeholder');
      renderElementIntoDOM(input.element);
      const clearButton = input.element.querySelector('.toolbar-input-clear-button');
      assert.instanceOf(clearButton, HTMLElement);
      input.setValue('test value');
      dispatchClickEvent(clearButton);
      assert.strictEqual(input.value(), '');
    });
  });
});
