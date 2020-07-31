// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';
import * as Workspace from '../workspace/workspace.js';

export class FrameDetailsView extends UI.ThrottledWidget.ThrottledWidget {
  /**
   * @param {!SDK.ResourceTreeModel.ResourceTreeFrame} frame
   */
  constructor(frame) {
    super();
    this._frame = frame;
    this._reportView = new UI.ReportView.ReportView(frame.displayName());
    this._reportView.registerRequiredCSS('resources/frameDetailsReportView.css');
    this._reportView.show(this.contentElement);

    this._generalSection = this._reportView.appendSection(ls`Document`);
    this._urlFieldValue = this._generalSection.appendField(ls`URL`);
    this._originFieldValue = this._generalSection.appendField(ls`Origin`);

    this._ownerElementFieldValue = this._generalSection.appendField(ls`Owner Element`);
    this._ownerElementFieldValue.classList.add('devtools-link');
    this._ownerElementFieldValue.title = ls`Click to reveal in Elements panel`;
    /** @type {?SDK.DOMModel.DOMNode} */
    this._ownerDomNode = null;
    this._ownerElementFieldValue.addEventListener('click', () => {
      if (this._ownerDomNode) {
        Common.Revealer.reveal(this._ownerDomNode);
      }
    });
    this._adStatus = this._generalSection.appendField(ls`Ad Status`);
    this.update();
  }

  /**
   * @override
   * @return {!Promise<?>}
   */
  async doUpdate() {
    this._urlFieldValue.textContent = this._frame.url;
    const revealSources = this._urlFieldValue.createChild('span', 'report-field-value-part devtools-link');
    revealSources.textContent = ls`View Source`;
    revealSources.addEventListener('click', () => {
      const sourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(this._frame.url);
      Common.Revealer.reveal(sourceCode);
    });
    const documentResource = this._frame.resourceForURL(this._frame.url);
    if (documentResource && documentResource.request) {
      const revealRequest = this._urlFieldValue.createChild('span', 'report-field-value-part devtools-link');
      revealRequest.textContent = ls`View Request`;
      revealRequest.addEventListener('click', () => {
        Common.Revealer.reveal(documentResource.request);
      });
    }
    this._originFieldValue.textContent = this._frame.securityOrigin;
    this._ownerDomNode = await this._frame.getOwnerDOMNodeOrDocument();
    this._updateAdStatus();
    if (this._ownerDomNode) {
      this._ownerElementFieldValue.textContent = `<${this._ownerDomNode.nodeName().toLocaleLowerCase()}>`;
    }
  }

  _updateAdStatus() {
    switch (this._frame.adFrameType()) {
      case Protocol.Page.AdFrameType.Root:
        this._generalSection.setFieldVisible(ls`Ad Status`, true);
        this._adStatus.textContent = ls`root`;
        this._adStatus.title = ls`This frame has been identified as the root frame of an ad`;
        break;
      case Protocol.Page.AdFrameType.Child:
        this._generalSection.setFieldVisible(ls`Ad Status`, true);
        this._adStatus.textContent = ls`child`;
        this._adStatus.title = ls`This frame has been identified as the a child frame of an ad`;
        break;
      default:
        this._generalSection.setFieldVisible(ls`Ad Status`, false);
        break;
    }
  }
}
