// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */

import type * as SDK from '../../core/sdk/sdk.js';
import objectValueStyles from '../../ui/legacy/components/object_ui/objectValue.css.js';
import * as UI from '../../ui/legacy/legacy.js';

import accessibilityNodeStyles from './accessibilityNode.css.js';
import accessibilityPropertiesStyles from './accessibilityProperties.css.js';

export class AccessibilitySubPane<ContentTypeT extends HTMLElement|DocumentFragment = HTMLElement> extends
    UI.View.SimpleView<ContentTypeT> {
  protected axNodeInternal: SDK.AccessibilityModel.AccessibilityNode|null = null;
  protected nodeInternal: SDK.DOMModel.DOMNode|null = null;

  constructor(element: HTMLElement|undefined, options: UI.View.SimpleViewOptions<ContentTypeT>) {
    if (element) {
      super(element, options);
    } else {
      super(options);
    }
    this.registerRequiredCSS(accessibilityPropertiesStyles);
  }

  get axNode(): SDK.AccessibilityModel.AccessibilityNode|null {
    return this.axNodeInternal;
  }

  set axNode(axNode: SDK.AccessibilityModel.AccessibilityNode|null) {
    this.setAXNode(axNode);
  }

  protected setAXNode(axNode: SDK.AccessibilityModel.AccessibilityNode|null): void {
    this.axNodeInternal = axNode;
  }

  get node(): SDK.DOMModel.DOMNode|null {
    return this.nodeInternal;
  }

  set node(node: SDK.DOMModel.DOMNode|null) {
    this.setNode(node);
  }

  protected setNode(node: SDK.DOMModel.DOMNode|null): void {
    this.nodeInternal = node;
  }

  createInfo(textContent: string, ...classNames: string[]): UI.Widget.Widget {
    const info = new UI.EmptyWidget.EmptyWidget(textContent);
    if (classNames.length === 0) {
      classNames.push('gray-info-message');
    }
    info.element.classList.add(...classNames, 'info-message-overflow');
    return info;
  }

  createTreeOutline(): UI.TreeOutline.TreeOutline {
    const treeOutline = new UI.TreeOutline.TreeOutlineInShadow();
    treeOutline.registerRequiredCSS(accessibilityNodeStyles, accessibilityPropertiesStyles, objectValueStyles);

    treeOutline.element.classList.add('hidden');
    treeOutline.setHideOverflow(true);
    this.element.appendChild(treeOutline.element);
    return treeOutline;
  }
}
