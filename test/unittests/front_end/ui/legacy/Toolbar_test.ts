// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import {assertElement, dispatchClickEvent, renderElementIntoDOM} from '../../helpers/DOMHelpers.js';

const {assert} = chai;

describe('Toolbar', () => {
  describe('ToolbarInput', () => {
    it('sets a title on the clear button', () => {
      const input = new UI.Toolbar.ToolbarInput('placeholder');
      renderElementIntoDOM(input.element);
      const clearButton = input.element.querySelector('.toolbar-input-clear-button');
      assertElement(clearButton, HTMLElement);
      assert.strictEqual(clearButton.title, 'Clear input');
    });

    it('clears the input when the clear button is clicked', () => {
      const input = new UI.Toolbar.ToolbarInput('placeholder');
      renderElementIntoDOM(input.element);
      const clearButton = input.element.querySelector('.toolbar-input-clear-button');
      assertElement(clearButton, HTMLElement);
      input.setValue('test value');
      dispatchClickEvent(clearButton);
      assert.strictEqual(input.value(), '');
    });
  });
});
