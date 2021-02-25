// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import type * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

export class AccessibilitySubPane extends UI.View.SimpleView {
  _axNode: SDK.AccessibilityModel.AccessibilityNode|null;
  _node?: SDK.DOMModel.DOMNode|null;
  constructor(name: string) {
    super(name);

    this._axNode = null;
    this.registerRequiredCSS('accessibility/accessibilityProperties.css', {enableLegacyPatching: false});
  }

  setAXNode(_axNode: SDK.AccessibilityModel.AccessibilityNode|null): void {
  }

  node(): SDK.DOMModel.DOMNode|null {
    return this._node || null;
  }

  setNode(node: SDK.DOMModel.DOMNode|null): void {
    this._node = node;
  }

  createInfo(textContent: string, className?: string): Element {
    const classNameOrDefault = className || 'gray-info-message';
    const info = this.element.createChild('div', classNameOrDefault);
    info.textContent = textContent;
    return info;
  }

  createTreeOutline(): UI.TreeOutline.TreeOutline {
    const treeOutline = new UI.TreeOutline.TreeOutlineInShadow();
    treeOutline.registerRequiredCSS('accessibility/accessibilityNode.css', {enableLegacyPatching: false});
    treeOutline.registerRequiredCSS('accessibility/accessibilityProperties.css', {enableLegacyPatching: false});
    treeOutline.registerRequiredCSS('object_ui/objectValue.css', {enableLegacyPatching: true});

    treeOutline.element.classList.add('hidden');
    treeOutline.hideOverflow();
    this.element.appendChild(treeOutline.element);
    return treeOutline;
  }
}
