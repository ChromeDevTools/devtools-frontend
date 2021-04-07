// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @param {?Node} node
 */
function WidgetfocusWidgetForNode(node) {
  while (node) {
    if (/** @type {?} */ (node).__widget) {
      break;
    }
    node = node.parentNodeOrShadowHost();
  }
  if (!node) {
    return;
  }

  let widget = /** @type {?} */ (node).__widget;
  while (widget._parentWidget) {
    widget._parentWidget._defaultFocusedChild = widget;
    widget = widget._parentWidget;
  }
}

/**
 * @param {?Node} node
 */
function XWidgetfocusWidgetForNode(node) {
  node = node && node.parentNodeOrShadowHost();
  const XWidgetCtor = customElements.get('x-widget');
  let widget = null;
  while (node) {
    if (node instanceof XWidgetCtor) {
      if (widget) {
        /** @type {?} */ (node)._defaultFocusedElement = widget;
      }
      widget = node;
    }
    node = node.parentNodeOrShadowHost();
  }
}

/**
 * @param {!Event} event
 */
export function focusChanged(event) {
  const target = /** @type {!HTMLElement} */ (event.target);
  const document = target ? target.ownerDocument : null;
  const element = document ? document.deepActiveElement() : null;
  WidgetfocusWidgetForNode(element);
  XWidgetfocusWidgetForNode(element);
}
