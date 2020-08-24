// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

/**
 * @param {?Node} node
 */
function WidgetfocusWidgetForNode(node) {
  while (node) {
    if (node.__widget) {
      break;
    }
    node = node.parentNodeOrShadowHost();
  }
  if (!node) {
    return;
  }

  let widget = node.__widget;
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
        node._defaultFocusedElement = widget;
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
  const document = event.target && event.target.ownerDocument;
  const element = document ? document.deepActiveElement() : null;
  WidgetfocusWidgetForNode(element);
  XWidgetfocusWidgetForNode(element);
}
