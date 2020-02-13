// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../sdk/sdk.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';

import {AccessibilityNode} from './AccessibilityModel.js';  // eslint-disable-line no-unused-vars

/**
 * @unrestricted
 */
export class AccessibilitySubPane extends UI.View.SimpleView {
  /**
   * @param {string} name
   */
  constructor(name) {
    super(name);

    /**
     * @protected
     * @suppress {accessControls}
     */
    this._axNode = null;
    this.registerRequiredCSS('accessibility/accessibilityProperties.css');
  }

  /**
   * @param {?AccessibilityNode} axNode
   */
  setAXNode(axNode) {
  }

  /**
   * @return {?SDK.DOMModel.DOMNode}
   */
  node() {
    return this._node;
  }

  /**
   * @param {?SDK.DOMModel.DOMNode} node
   */
  setNode(node) {
    this._node = node;
  }

  /**
   * @param {string} textContent
   * @param {string=} className
   * @return {!Element}
   */
  createInfo(textContent, className) {
    const classNameOrDefault = className || 'gray-info-message';
    const info = this.element.createChild('div', classNameOrDefault);
    info.textContent = textContent;
    return info;
  }

  /**
   * @return {!UI.TreeOutline.TreeOutline}
   */
  createTreeOutline() {
    const treeOutline = new UI.TreeOutline.TreeOutlineInShadow();
    treeOutline.registerRequiredCSS('accessibility/accessibilityNode.css');
    treeOutline.registerRequiredCSS('accessibility/accessibilityProperties.css');
    treeOutline.registerRequiredCSS('object_ui/objectValue.css');

    treeOutline.element.classList.add('hidden');
    treeOutline.hideOverflow();
    this.element.appendChild(treeOutline.element);
    return treeOutline;
  }
}
