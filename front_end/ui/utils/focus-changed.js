// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {Widget} from '../Widget.js';
import {XWidget} from '../XWidget.js';

/**
 * @param {!Event} event
 */
export function focusChanged(event) {
  const document = event.target && event.target.ownerDocument;
  const element = document ? document.deepActiveElement() : null;
  Widget.focusWidgetForNode(element);
  XWidget.focusWidgetForNode(element);
  if (!UI._keyboardFocus) {
    return;
  }

  markAsFocusedByKeyboard(element);
}

export function markAsFocusedByKeyboard(element) {
  element.setAttribute('data-keyboard-focus', 'true');
  element.addEventListener('blur', () => element.removeAttribute('data-keyboard-focus'), {once: true, capture: true});
}
