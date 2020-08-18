// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Network from '../network/network.js';
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
    this._unreachableURL = this._generalSection.appendField(ls`Unreachable URL`);
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
    if (!this._frame.unreachableUrl()) {
      const revealSources = this._urlFieldValue.createChild('span', 'report-field-value-part devtools-link');
      revealSources.textContent = ls`View Source`;
      revealSources.addEventListener('click', () => {
        const sourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(this._frame.url);
        Common.Revealer.reveal(sourceCode);
      });
    }
    FrameDetailsView.maybeAppendLinkToRequest(this._urlFieldValue, this._frame.resourceForURL(this._frame.url));
    this._maybeAppendLinkForUnreachableUrl();
    if (this._frame.securityOrigin && this._frame.securityOrigin !== '://') {
      this._originFieldValue.textContent = this._frame.securityOrigin;
      this._generalSection.setFieldVisible(ls`Origin`, true);
    } else {
      this._generalSection.setFieldVisible(ls`Origin`, false);
    }
    this._ownerDomNode = await this._frame.getOwnerDOMNodeOrDocument();
    this._updateAdStatus();
    if (this._ownerDomNode) {
      this._ownerElementFieldValue.textContent = `<${this._ownerDomNode.nodeName().toLocaleLowerCase()}>`;
    }
  }

  /**
   * @param {!Element} element
   * @param {?SDK.Resource.Resource} resource
   */
  static maybeAppendLinkToRequest(element, resource) {
    if (resource && resource.request) {
      const request = resource.request;
      const revealRequest = element.createChild('span', 'report-field-value-part');
      revealRequest.textContent = ls`View Request`;
      revealRequest.classList.add('devtools-link');
      revealRequest.addEventListener('click', () => {
        Network.NetworkPanel.NetworkPanel.selectAndShowRequest(request, Network.NetworkItemView.Tabs.Headers);
      });
    }
  }

  _maybeAppendLinkForUnreachableUrl() {
    if (!this._frame.unreachableUrl()) {
      this._generalSection.setFieldVisible(ls`Unreachable URL`, false);
      return;
    }
    this._generalSection.setFieldVisible(ls`Unreachable URL`, true);
    this._unreachableURL.textContent = this._frame.unreachableUrl();
    const unreachableUrl = Common.ParsedURL.ParsedURL.fromString(this._frame.unreachableUrl());
    if (!unreachableUrl) {
      return;
    }
    const revealRequest = this._unreachableURL.createChild('span', 'report-field-value-part devtools-link');
    revealRequest.textContent = ls`Show matching requests`;
    revealRequest.title = ls`Requires network log, try reloading the inspected page if unavailable`;
    revealRequest.addEventListener('click', () => {
      Network.NetworkPanel.NetworkPanel.revealAndFilter([
        {
          filterType: 'domain',
          filterValue: unreachableUrl.domain(),
        },
        {
          filterType: null,
          filterValue: unreachableUrl.path,
        }
      ]);
    });
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

export class OpenedWindowDetailsView extends UI.ThrottledWidget.ThrottledWidget {
  /**
   * @param {!Protocol.Target.TargetInfo} targetInfo
   * @param {boolean} isWindowClosed
   */
  constructor(targetInfo, isWindowClosed) {
    super();
    this._targetInfo = targetInfo;
    this._isWindowClosed = isWindowClosed;
    this._reportView = new UI.ReportView.ReportView(this.buildTitle());
    this._reportView.registerRequiredCSS('resources/frameDetailsReportView.css');
    this._reportView.show(this.contentElement);

    this._documentSection = this._reportView.appendSection(ls`Document`);
    this._URLFieldValue = this._documentSection.appendField(ls`URL`);

    this._securitySection = this._reportView.appendSection(ls`Security`);
    this._hasDOMAccessValue = this._securitySection.appendField(ls`Access to opener`);

    this.update();
  }

  /**
   * @override
   * @return {!Promise<?>}
   */
  async doUpdate() {
    this._reportView.setTitle(this.buildTitle());
    this._URLFieldValue.textContent = this._targetInfo.url;
    this._hasDOMAccessValue.textContent = this._targetInfo.canAccessOpener ? ls`Yes` : ls`No`;
  }

  /**
   * @return {string}
   */
  buildTitle() {
    let title = this._targetInfo.title || ls`Window without title`;
    if (this._isWindowClosed) {
      title += ` (${ls`closed`})`;
    }
    return title;
  }

  /**
   * @param {boolean} isWindowClosed
   */
  setIsWindowClosed(isWindowClosed) {
    this._isWindowClosed = isWindowClosed;
  }

  /**
   * @param {!Protocol.Target.TargetInfo} targetInfo
   */
  setTargetInfo(targetInfo) {
    this._targetInfo = targetInfo;
  }
}
