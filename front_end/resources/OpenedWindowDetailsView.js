// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as SDK from '../sdk/sdk.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';

export const UIStrings = {
  /**
  *@description Text in Timeline indicating that input has happened recently
  */
  yes: 'Yes',
  /**
  *@description Text in Timeline indicating that input has not happened recently
  */
  no: 'No',
  /**
  *@description Title for a link to the Elements panel
  */
  clickToRevealInElementsPanel: 'Click to reveal in Elements panel',
  /**
  *@description Name of a network resource type
  */
  document: 'Document',
  /**
  *@description Text for web URLs
  */
  url: 'URL',
  /**
  *@description Title of the 'Security' tool
  */
  security: 'Security',
  /**
  *@description Label for link to Opener Frame in Detail View for Opened Window
  */
  openerFrame: 'Opener Frame',
  /**
  *@description Label in opened window's details view whether window has access to its opener
  */
  accessToOpener: 'Access to opener',
  /**
  *@description Description for the 'Access to Opener' field
  */
  showsWhetherTheOpenedWindowIs: 'Shows whether the opened window is able to access its opener and vice versa',
  /**
  *@description Text in Frames View of the Application panel
  */
  windowWithoutTitle: 'Window without title',
  /**
  *@description Label suffix in the Application Panel Frames section for windows which are already closed
  */
  closed: 'closed',
  /**
  *@description Default name for worker
  */
  worker: 'worker',
  /**
  *@description Text that refers to some types
  */
  type: 'Type',
  /**
  *@description Section header in the Frame Details view
  */
  securityIsolation: 'Security & Isolation',
  /**
  *@description Row title in the Frame Details view
  */
  crossoriginEmbedderPolicy: 'Cross-Origin Embedder Policy',
  /**
  *@description Label for worker type: web worker
  */
  webWorker: 'Web Worker',
  /**
  *@description Text in Request Timing View of the Network panel
  */
  serviceWorker: '`Service Worker`',
  /**
  *@description Text for an unspecified service worker response source
  */
  unknown: 'Unknown',
  /**
  *@description This label specifies the server endpoints to which the server is reporting errors and warnings through the Report-to API
  */
  reportingTo: 'reporting to',
};
const str_ = i18n.i18n.registerUIStrings('resources/OpenedWindowDetailsView.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/**
 * @param {boolean} b
 */
const booleanToYesNo = b => b ? i18nString(UIStrings.yes) : i18nString(UIStrings.no);

/**
 * @param {string} iconType
 * @param {string} title
 * @param {function():(void|!Promise<void>)} eventHandler
 * @return {!Element}
 */
function linkifyIcon(iconType, title, eventHandler) {
  const icon = UI.Icon.Icon.create(iconType, 'icon-link devtools-link');
  const span = document.createElement('span');
  UI.Tooltip.Tooltip.install(span, title);
  span.classList.add('devtools-link');
  span.tabIndex = 0;
  span.appendChild(icon);
  span.addEventListener('click', event => {
    event.consume(true);
    eventHandler();
  });
  span.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.consume(true);
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
      'mediumicon-elements-panel', i18nString(UIStrings.clickToRevealInElementsPanel),
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
    this.registerRequiredCSS('resources/frameDetailsReportView.css', {enableLegacyPatching: false});
    this.contentElement.classList.add('frame-details-container');
    // TODO(crbug.com/1156978): Replace UI.ReportView.ReportView with ReportView.ts web component.
    this._reportView = new UI.ReportView.ReportView(this.buildTitle());
    this._reportView.registerRequiredCSS('resources/frameDetailsReportView.css', {enableLegacyPatching: false});
    this._reportView.show(this.contentElement);
    this._reportView.element.classList.add('frame-details-report-container');

    this._documentSection = this._reportView.appendSection(i18nString(UIStrings.document));
    this._URLFieldValue = this._documentSection.appendField(i18nString(UIStrings.url));

    this._securitySection = this._reportView.appendSection(i18nString(UIStrings.security));
    this._openerElementField = this._securitySection.appendField(i18nString(UIStrings.openerFrame));
    this._securitySection.setFieldVisible(i18nString(UIStrings.openerFrame), false);
    this._hasDOMAccessValue = this._securitySection.appendField(i18nString(UIStrings.accessToOpener));
    UI.Tooltip.Tooltip.install(this._hasDOMAccessValue, i18nString(UIStrings.showsWhetherTheOpenedWindowIs));
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
      this._securitySection.setFieldVisible(i18nString(UIStrings.openerFrame), true);
      return;
    }
    this._securitySection.setFieldVisible(i18nString(UIStrings.openerFrame), false);
  }

  /**
   * @return {string}
   */
  buildTitle() {
    let title = this._targetInfo.title || i18nString(UIStrings.windowWithoutTitle);
    if (this._isWindowClosed) {
      title += ` (${i18nString(UIStrings.closed)})`;
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
    this.registerRequiredCSS('resources/frameDetailsReportView.css', {enableLegacyPatching: false});
    this.contentElement.classList.add('frame-details-container');
    // TODO(crbug.com/1156978): Replace UI.ReportView.ReportView with ReportView.ts web component.
    this._reportView =
        new UI.ReportView.ReportView(this._targetInfo.title || this._targetInfo.url || i18nString(UIStrings.worker));
    this._reportView.registerRequiredCSS('resources/frameDetailsReportView.css', {enableLegacyPatching: false});
    this._reportView.show(this.contentElement);
    this._reportView.element.classList.add('frame-details-report-container');

    this._documentSection = this._reportView.appendSection(i18nString(UIStrings.document));
    this._URLFieldValue = this._documentSection.appendField(i18nString(UIStrings.url));
    this._URLFieldValue.textContent = this._targetInfo.url;
    const workerType = this._documentSection.appendField(i18nString(UIStrings.type));
    workerType.textContent = this.workerTypeToString(this._targetInfo.type);

    this._isolationSection = this._reportView.appendSection(i18nString(UIStrings.securityIsolation));
    this._coepPolicy = this._isolationSection.appendField(i18nString(UIStrings.crossoriginEmbedderPolicy));
    this.update();
  }

  /**
   * @param {string} type
   */
  workerTypeToString(type) {
    if (type === 'worker') {
      return i18nString(UIStrings.webWorker);
    }
    if (type === 'service_worker') {
      return i18nString(UIStrings.serviceWorker);
    }
    return i18nString(UIStrings.unknown);
  }

  async _updateCoopCoepStatus() {
    const target = SDK.SDKModel.TargetManager.instance().targetById(this._targetInfo.targetId);
    if (!target) {
      return;
    }
    const model = target.model(SDK.NetworkManager.NetworkManager);
    const info = model && await model.getSecurityIsolationStatus('');
    if (!info) {
      return;
    }
    /**
    * @param {!Protocol.Network.CrossOriginEmbedderPolicyValue|!Protocol.Network.CrossOriginOpenerPolicyValue} value
    */
    const coepIsEnabled = value => value !== Protocol.Network.CrossOriginEmbedderPolicyValue.None;
    this._fillCrossOriginPolicy(this._coepPolicy, coepIsEnabled, info.coep);
  }

  /**
   *
   * @param {!HTMLElement} field
   * @param {function((!Protocol.Network.CrossOriginEmbedderPolicyValue|!Protocol.Network.CrossOriginOpenerPolicyValue)):boolean} isEnabled
   * @param {?Protocol.Network.CrossOriginEmbedderPolicyStatus|?Protocol.Network.CrossOriginOpenerPolicyStatus|undefined} info
   */
  _fillCrossOriginPolicy(field, isEnabled, info) {
    if (!info) {
      field.textContent = '';
      return;
    }
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
      reportingEndpointPrefix.textContent = i18nString(UIStrings.reportingTo);
      const reportingEndpointName = field.createChild('span');
      reportingEndpointName.textContent = endpoint;
    }
  }

  /**
   * @override
   * @return {!Promise<?>}
   */
  async doUpdate() {
    await this._updateCoopCoepStatus();
  }
}
