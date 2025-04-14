// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-imperative-dom-api */

import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {AccessibilitySubPane} from './AccessibilitySubPane.js';

const UIStrings = {
  /**
   * @description Name of a tool which allows the developer to view the contents of the page in the
   * 'source order' (the order in which the HTML elements show up in the source code). In the
   * Accessibility panel.
   */
  sourceOrderViewer: 'Source Order Viewer',
  /**
   *@description Text in Source Order Viewer of the Accessibility panel shown when the selected node has no child elements
   */
  noSourceOrderInformation: 'No source order information available',
  /**
   *@description Text in Source Order Viewer of the Accessibility panel shown when the selected node has many child elements
   */
  thereMayBeADelayInDisplaying: 'There may be a delay in displaying source order for elements with many children',
  /**
   * @description Checkbox label in Source Order Viewer of the Accessibility panel. Source order
   * means the order in which the HTML elements show up in the source code.
   */
  showSourceOrder: 'Show source order',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/accessibility/SourceOrderView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const MAX_CHILD_ELEMENTS_THRESHOLD = 300;

export class SourceOrderPane extends AccessibilitySubPane {
  private readonly noNodeInfo: Element;
  private readonly warning: Element;
  private checked: boolean;
  private checkbox: UI.UIUtils.CheckboxLabel;
  private overlayModel: SDK.OverlayModel.OverlayModel|null;
  constructor() {
    super(i18nString(UIStrings.sourceOrderViewer));

    this.element.setAttribute('jslog', `${VisualLogging.section('source-order-viewer')}`);
    this.noNodeInfo = this.createInfo(i18nString(UIStrings.noSourceOrderInformation));
    this.warning = this.createInfo(i18nString(UIStrings.thereMayBeADelayInDisplaying));
    this.warning.id = 'source-order-warning';
    this.checked = false;
    this.checkbox = UI.UIUtils.CheckboxLabel.create(
        /* title */ i18nString(UIStrings.showSourceOrder), /* checked */ false);

    this.checkbox.classList.add('source-order-checkbox');
    this.checkbox.setAttribute('jslog', `${VisualLogging.toggle().track({click: true})}`);
    this.checkbox.addEventListener('click', this.checkboxClicked.bind(this), false);
    this.element.appendChild(this.checkbox);

    this.nodeInternal = null;
    this.overlayModel = null;
  }

  async setNodeAsync(node: SDK.DOMModel.DOMNode|null): Promise<void> {
    if (!this.checkbox.classList.contains('hidden')) {
      this.checked = this.checkbox.checked;
    }
    this.checkbox.checked = false;
    this.checkboxClicked();
    super.setNode(node);
    if (!this.nodeInternal) {
      this.overlayModel = null;
      return;
    }

    let foundSourceOrder = false;
    const childCount = this.nodeInternal.childNodeCount();
    if (childCount > 0) {
      if (!this.nodeInternal.children()) {
        await this.nodeInternal.getSubtree(1, false);
      }
      const children = this.nodeInternal.children() as SDK.DOMModel.DOMNode[];
      foundSourceOrder = children.some(child => child.nodeType() === Node.ELEMENT_NODE);
    }

    this.noNodeInfo.classList.toggle('hidden', foundSourceOrder);
    this.warning.classList.toggle('hidden', childCount < MAX_CHILD_ELEMENTS_THRESHOLD);
    this.checkbox.classList.toggle('hidden', !foundSourceOrder);
    if (foundSourceOrder) {
      this.overlayModel = this.nodeInternal.domModel().overlayModel();
      this.checkbox.checked = this.checked;
      this.checkboxClicked();
    } else {
      this.overlayModel = null;
    }
  }

  private checkboxClicked(): void {
    if (!this.nodeInternal || !this.overlayModel) {
      return;
    }

    if (this.checkbox.checked) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.SourceOrderViewActivated);
      this.overlayModel.highlightSourceOrderInOverlay(this.nodeInternal);
    } else {
      this.overlayModel.hideSourceOrderInOverlay();
    }
  }
}
