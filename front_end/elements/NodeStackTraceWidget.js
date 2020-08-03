// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Components from '../components/components.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

/**
 * @unrestricted
 */
export class NodeStackTraceWidget extends UI.ThrottledWidget.ThrottledWidget {
  constructor() {
    super(true /* isWebComponent */);
    this.registerRequiredCSS('elements/nodeStackTraceWidget.css');

    this._noStackTraceElement = this.contentElement.createChild('div', 'gray-info-message');
    this._noStackTraceElement.textContent = ls`No stack trace available`;
    this._creationStackTraceElement = this.contentElement.createChild('div', 'stack-trace');

    this._linkifier = new Components.Linkifier.Linkifier(MaxLengthForLinks);
  }

  /**
   * @override
   */
  wasShown() {
    self.UI.context.addFlavorChangeListener(SDK.DOMModel.DOMNode, this.update, this);
    this.update();
  }

  /**
   * @override
   */
  willHide() {
    self.UI.context.removeFlavorChangeListener(SDK.DOMModel.DOMNode, this.update, this);
  }

  /**
   * @override
   * @protected
   * @return {!Promise<undefined>}
   */
  async doUpdate() {
    const node = self.UI.context.flavor(SDK.DOMModel.DOMNode);

    if (!node) {
      this._noStackTraceElement.classList.remove('hidden');
      this._creationStackTraceElement.classList.add('hidden');
      return;
    }

    const creationStackTrace = await node.creationStackTrace();
    if (creationStackTrace) {
      this._noStackTraceElement.classList.add('hidden');
      this._creationStackTraceElement.classList.remove('hidden');

      const stackTracePreview = Components.JSPresentationUtils.buildStackTracePreviewContents(
          node.domModel().target(), this._linkifier, {stackTrace: creationStackTrace});
      this._creationStackTraceElement.removeChildren();
      this._creationStackTraceElement.appendChild(stackTracePreview.element);
    } else {
      this._noStackTraceElement.classList.remove('hidden');
      this._creationStackTraceElement.classList.add('hidden');
    }
  }
}

/**
 * @const
 * @type {number}
 */
export const MaxLengthForLinks = 40;
