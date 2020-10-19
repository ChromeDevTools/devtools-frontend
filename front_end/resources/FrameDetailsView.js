// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Bindings from '../bindings/bindings.js';
import * as Common from '../common/common.js';
import * as Network from '../network/network.js';
import * as SDK from '../sdk/sdk.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';
import * as Workspace from '../workspace/workspace.js';

/**
 * @param {boolean} b
 */
const booleanToYesNo = b => b ? ls`Yes` : ls`No`;

export class FrameDetailsView extends UI.ThrottledWidget.ThrottledWidget {
  /**
   * @param {!SDK.ResourceTreeModel.ResourceTreeFrame} frame
   */
  constructor(frame) {
    super();
    this.registerRequiredCSS('resources/frameDetailsReportView.css');
    this._frame = frame;
    this.contentElement.classList.add('frame-details-container');

    this._reportView = new UI.ReportView.ReportView(frame.displayName());
    this._reportView.registerRequiredCSS('resources/frameDetailsReportView.css');
    this._reportView.show(this.contentElement);
    this._reportView.element.classList.add('frame-details-report-container');

    this._generalSection = this._reportView.appendSection(ls`Document`);
    this._urlFieldValue = this._generalSection.appendField(ls`URL`);
    this._urlStringElement = this._urlFieldValue.createChild('div', 'text-ellipsis');
    this._unreachableURL = this._generalSection.appendField(ls`Unreachable URL`);
    const originFieldValue = this._generalSection.appendField(ls`Origin`);
    this._originStringElement = originFieldValue.createChild('div', 'text-ellipsis');
    this._ownerFieldValue = this._generalSection.appendField(ls`Owner Element`);
    this._adStatus = this._generalSection.appendField(ls`Ad Status`);

    this._isolationSection = this._reportView.appendSection(ls`Security & Isolation`);
    this._secureContext = this._isolationSection.appendField(ls`Secure Context`);
    this._crossOriginIsolatedContext = this._isolationSection.appendField(ls`Cross-Origin Isolated`);
    this._coepPolicy = this._isolationSection.appendField(ls`Cross-Origin Embedder Policy`);
    this._coopPolicy = this._isolationSection.appendField(ls`Cross-Origin Opener Policy`);

    this._apiAvailability = this._reportView.appendSection(ls`API availablity`);
    const summaryRow = this._apiAvailability.appendRow();
    const summaryText = ls`Availability of certain APIs depends on the document being cross-origin isolated.`;
    const link = 'https://web.dev/why-coop-coep/';
    summaryRow.appendChild(UI.Fragment.html`<div>${summaryText} ${UI.XLink.XLink.create(link, ls`Learn more`)}</div>`);
    this.update();
  }

  /**
   * @override
   * @return {!Promise<?>}
   */
  async doUpdate() {
    this._urlFieldValue.removeChildren();
    this._urlStringElement.textContent = this._frame.url;
    this._urlStringElement.title = this._frame.url;
    this._urlFieldValue.appendChild(this._urlStringElement);
    if (!this._frame.unreachableUrl()) {
      const sourceCode = this.uiSourceCodeForFrame(this._frame);
      const revealSource = linkifyIcon(
          'mediumicon-sources-panel', ls`Click to reveal in Sources panel`, () => Common.Revealer.reveal(sourceCode));
      this._urlFieldValue.appendChild(revealSource);
    }
    FrameDetailsView.maybeAppendLinkToRequest(this._urlFieldValue, this._frame.resourceForURL(this._frame.url));
    this._maybeAppendLinkForUnreachableUrl();
    if (this._frame.securityOrigin && this._frame.securityOrigin !== '://') {
      this._originStringElement.textContent = this._frame.securityOrigin;
      this._originStringElement.title = this._frame.securityOrigin;
      this._generalSection.setFieldVisible(ls`Origin`, true);
    } else {
      this._generalSection.setFieldVisible(ls`Origin`, false);
    }
    this._updateAdStatus();
    this._ownerFieldValue.removeChildren();
    const linkElement = await maybeCreateLinkToElementsPanel(this._frame);
    if (linkElement) {
      this._ownerFieldValue.appendChild(linkElement);
    }
    await this._updateCoopCoepStatus();
    this._updateContextStatus();
  }

  /**
   * @param {!SDK.ResourceTreeModel.ResourceTreeFrame} frame
   * @return {?Workspace.UISourceCode.UISourceCode}
   */
  uiSourceCodeForFrame(frame) {
    for (const project of Workspace.Workspace.WorkspaceImpl.instance().projects()) {
      const projectTarget = Bindings.NetworkProject.NetworkProject.getTargetForProject(project);
      if (projectTarget && projectTarget === frame.resourceTreeModel().target()) {
        const uiSourceCode = project.uiSourceCodeForURL(frame.url);
        if (uiSourceCode) {
          return uiSourceCode;
        }
      }
    }
    return null;
  }

  /**
   *
   * @param {!HTMLElement} field
   * @param {function((!Protocol.Network.CrossOriginEmbedderPolicyValue|!Protocol.Network.CrossOriginOpenerPolicyValue)):boolean} isEnabled
   * @param {!Protocol.Network.CrossOriginEmbedderPolicyStatus|!Protocol.Network.CrossOriginOpenerPolicyStatus} info
   */
  static fillCrossOriginPolicy(field, isEnabled, info) {
    const enabled = isEnabled(info.value);
    field.textContent = enabled ? info.value : info.reportOnlyValue;
    if (!enabled && isEnabled(info.reportOnlyValue)) {
      const reportOnly = document.createElement('span');
      reportOnly.classList.add('inline-comment');
      reportOnly.textContent = 'report-only';
      field.appendChild(reportOnly);
    }
    const endpoint = enabled ? info.reportingEndpoint : info.reportOnlyReportingEndpoint;
    if (endpoint) {
      const reportingEndpointPrefix = field.createChild('span', 'inline-name');
      reportingEndpointPrefix.textContent = ls`reporting to`;
      const reportingEndpointName = field.createChild('span');
      reportingEndpointName.textContent = endpoint;
    }
  }

  async _updateCoopCoepStatus() {
    const model = this._frame.resourceTreeModel().target().model(SDK.NetworkManager.NetworkManager);
    const info = model && await model.getSecurityIsolationStatus(this._frame.id);
    if (!info) {
      return;
    }
    /**
    * @param {!Protocol.Network.CrossOriginEmbedderPolicyValue|!Protocol.Network.CrossOriginOpenerPolicyValue} value
    */
    const coepIsEnabled = value => value !== Protocol.Network.CrossOriginEmbedderPolicyValue.None;
    FrameDetailsView.fillCrossOriginPolicy(this._coepPolicy, coepIsEnabled, info.coep);
    /**
    * @param {!Protocol.Network.CrossOriginEmbedderPolicyValue|!Protocol.Network.CrossOriginOpenerPolicyValue} value
    */
    const coopIsEnabled = value => value !== Protocol.Network.CrossOriginOpenerPolicyValue.UnsafeNone;
    FrameDetailsView.fillCrossOriginPolicy(this._coopPolicy, coopIsEnabled, info.coop);
  }

  /**
   * @param {?Protocol.Page.SecureContextType} type
   * @returns {?string}
   */
  _explanationFromSecureContextType(type) {
    switch (type) {
      case Protocol.Page.SecureContextType.Secure:
        return null;
      case Protocol.Page.SecureContextType.SecureLocalhost:
        return ls`Localhost is always a secure context`;
      case Protocol.Page.SecureContextType.InsecureAncestor:
        return ls`A frame ancestor is an insecure context`;
      case Protocol.Page.SecureContextType.InsecureScheme:
        return ls`The frame's scheme is insecure`;
    }
    return null;
  }

  _updateContextStatus() {
    if (this._frame.unreachableUrl()) {
      this._isolationSection.setFieldVisible(ls`Secure Context`, false);
      this._isolationSection.setFieldVisible(ls`Cross-Origin Isolated`, false);
      return;
    }
    this._isolationSection.setFieldVisible(ls`Secure Context`, true);
    this._isolationSection.setFieldVisible(ls`Cross-Origin Isolated`, true);

    this._secureContext.textContent = booleanToYesNo(this._frame.isSecureContext());
    const secureContextExplanation = this._explanationFromSecureContextType(this._frame.getSecureContextType());
    if (secureContextExplanation) {
      const secureContextType = this._secureContext.createChild('span', 'inline-comment');
      secureContextType.textContent = secureContextExplanation;
    }
    this._crossOriginIsolatedContext.textContent = booleanToYesNo(this._frame.isCrossOriginIsolated());
  }

  /**
   * @param {!Element} element
   * @param {?SDK.Resource.Resource} resource
   */
  static maybeAppendLinkToRequest(element, resource) {
    if (resource && resource.request) {
      const request = resource.request;
      const revealRequest = linkifyIcon(
          'mediumicon-network-panel', ls`Click to reveal in Network panel`,
          () => Network.NetworkPanel.NetworkPanel.selectAndShowRequest(request, Network.NetworkItemView.Tabs.Headers));
      element.appendChild(revealRequest);
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

    const revealRequest = linkifyIcon(
        'mediumicon-network-panel', ls`Click to reveal in Network panel (might require page reload)`, () => {
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
    this._unreachableURL.appendChild(revealRequest);
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

/**
 * @param {string} iconType
 * @param {string} title
 * @param {function():(void|!Promise<void>)} eventHandler
 * @return {!Element}
 */
function linkifyIcon(iconType, title, eventHandler) {
  const icon = UI.Icon.Icon.create(iconType, 'icon-link devtools-link');
  const span = document.createElement('span');
  span.title = title;
  span.classList.add('devtools-link');
  span.tabIndex = 0;
  span.appendChild(icon);
  span.addEventListener('click', () => eventHandler());
  span.addEventListener('keydown', event => {
    if (isEnterKey(event)) {
      eventHandler();
    }
  });
  return span;
}

/**
 * @param {!SDK.ResourceTreeModel.ResourceTreeFrame|!Protocol.Page.FrameId|undefined} opener
 * @return {!Promise<?Element>}
 */
async function maybeCreateLinkToElementsPanel(opener) {
  /** @type {?SDK.ResourceTreeModel.ResourceTreeFrame} */
  let openerFrame = null;
  if (opener instanceof SDK.ResourceTreeModel.ResourceTreeFrame) {
    openerFrame = opener;
  } else if (opener) {
    openerFrame = SDK.FrameManager.FrameManager.instance().getFrame(opener);
  }
  if (!openerFrame) {
    return null;
  }
  const linkTargetDOMNode = await openerFrame.getOwnerDOMNodeOrDocument();
  if (!linkTargetDOMNode) {
    return null;
  }
  const linkElement = linkifyIcon(
      'mediumicon-elements-panel', ls`Click to reveal in Elements panel`,
      () => Common.Revealer.reveal(linkTargetDOMNode));
  const label = document.createElement('span');
  label.textContent = `<${linkTargetDOMNode.nodeName().toLocaleLowerCase()}>`;
  linkElement.insertBefore(label, linkElement.firstChild);
  linkElement.addEventListener('mouseenter', () => {
    if (openerFrame) {
      openerFrame.highlight();
    }
  });
  linkElement.addEventListener('mouseleave', () => {
    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
  });
  return linkElement;
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
    this.registerRequiredCSS('resources/frameDetailsReportView.css');
    this.contentElement.classList.add('frame-details-container');
    this._reportView = new UI.ReportView.ReportView(this.buildTitle());
    this._reportView.registerRequiredCSS('resources/frameDetailsReportView.css');
    this._reportView.show(this.contentElement);
    this._reportView.element.classList.add('frame-details-report-container');

    this._documentSection = this._reportView.appendSection(ls`Document`);
    this._URLFieldValue = this._documentSection.appendField(ls`URL`);

    this._securitySection = this._reportView.appendSection(ls`Security`);
    this._openerElementField = this._securitySection.appendField(ls`Opener Frame`);
    this._securitySection.setFieldVisible(ls`Opener Frame`, false);
    this._hasDOMAccessValue = this._securitySection.appendField(ls`Access to opener`);
    this._hasDOMAccessValue.title = ls`Shows whether the opened window is able to access its opener and vice versa`;
    this.update();
  }

  /**
   * @override
   * @return {!Promise<?>}
   */
  async doUpdate() {
    this._reportView.setTitle(this.buildTitle());
    this._URLFieldValue.textContent = this._targetInfo.url;
    this._hasDOMAccessValue.textContent = booleanToYesNo(this._targetInfo.canAccessOpener);
    this.maybeDisplayOpenerFrame();
  }

  async maybeDisplayOpenerFrame() {
    this._openerElementField.removeChildren();
    const linkElement = await maybeCreateLinkToElementsPanel(this._targetInfo.openerFrameId);
    if (linkElement) {
      this._openerElementField.append(linkElement);
      this._securitySection.setFieldVisible(ls`Opener Frame`, true);
      return;
    }
    this._securitySection.setFieldVisible(ls`Opener Frame`, false);
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

export class WorkerDetailsView extends UI.ThrottledWidget.ThrottledWidget {
  /**
   * @param {!Protocol.Target.TargetInfo} targetInfo
   */
  constructor(targetInfo) {
    super();
    this._targetInfo = targetInfo;
    this.registerRequiredCSS('resources/frameDetailsReportView.css');
    this.contentElement.classList.add('frame-details-container');
    this._reportView = new UI.ReportView.ReportView(this._targetInfo.title || this._targetInfo.url || ls`worker`);
    this._reportView.registerRequiredCSS('resources/frameDetailsReportView.css');
    this._reportView.show(this.contentElement);
    this._reportView.element.classList.add('frame-details-report-container');

    this._documentSection = this._reportView.appendSection(ls`Document`);
    this._URLFieldValue = this._documentSection.appendField(ls`URL`);
    this._URLFieldValue.textContent = this._targetInfo.url;
  }
}
