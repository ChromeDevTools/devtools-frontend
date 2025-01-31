// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../core/platform/platform.js';
import type * as SDK from '../../core/sdk/sdk.js';
// eslint-disable-next-line rulesdir/es-modules-import
import objectValueStylesRaw from '../../ui/legacy/components/object_ui/objectValue.css.legacy.js';
import * as UI from '../../ui/legacy/legacy.js';

import accessibilityNodeStylesRaw from './accessibilityNode.css.legacy.js';
import accessibilityPropertiesStylesRaw from './accessibilityProperties.css.legacy.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const accessibilityPropertiesStyles = new CSSStyleSheet();
accessibilityPropertiesStyles.replaceSync(accessibilityPropertiesStylesRaw.cssContent);
const accessibilityNodeStyles = new CSSStyleSheet();
accessibilityNodeStyles.replaceSync(accessibilityNodeStylesRaw.cssContent);
const objectValueStyles = new CSSStyleSheet();
objectValueStyles.replaceSync(objectValueStylesRaw.cssContent);

export class AccessibilitySubPane extends UI.View.SimpleView {
  axNode: SDK.AccessibilityModel.AccessibilityNode|null;
  protected nodeInternal?: SDK.DOMModel.DOMNode|null;
  constructor(name: Platform.UIString.LocalizedString) {
    super(name);

    this.axNode = null;
  }

  setAXNode(_axNode: SDK.AccessibilityModel.AccessibilityNode|null): void {
  }

  node(): SDK.DOMModel.DOMNode|null {
    return this.nodeInternal || null;
  }

  setNode(node: SDK.DOMModel.DOMNode|null): void {
    this.nodeInternal = node;
  }

  createInfo(textContent: string, className?: string): Element {
    const classNameOrDefault = className || 'gray-info-message';
    const info = this.element.createChild('div', classNameOrDefault);
    info.textContent = textContent;
    return info;
  }

  createTreeOutline(): UI.TreeOutline.TreeOutline {
    const treeOutline = new UI.TreeOutline.TreeOutlineInShadow();
    treeOutline.registerCSSFiles([accessibilityNodeStyles, accessibilityPropertiesStyles, objectValueStyles]);

    treeOutline.element.classList.add('hidden');
    treeOutline.hideOverflow();
    this.element.appendChild(treeOutline.element);
    return treeOutline;
  }
  override wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([accessibilityPropertiesStyles]);
  }
}
