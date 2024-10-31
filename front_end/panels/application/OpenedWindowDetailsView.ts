// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as UI from '../../ui/legacy/legacy.js';

import openedWindowDetailsViewStyles from './openedWindowDetailsView.css.js';

const UIStrings = {
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
  clickToOpenInElementsPanel: 'Click to open in Elements panel',
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
   *@description Text for an unspecified service worker response source
   */
  unknown: 'Unknown',
  /**
   *@description This label specifies the server endpoints to which the server is reporting errors
   *and warnings through the Report-to API. Following this label will be the URL of the server.
   */
  reportingTo: 'reporting to',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/OpenedWindowDetailsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const booleanToYesNo = (b: boolean): Common.UIString.LocalizedString =>
    b ? i18nString(UIStrings.yes) : i18nString(UIStrings.no);

function linkifyIcon(iconType: string, title: string, eventHandler: () => (void|Promise<void>)): Element {
  const icon = IconButton.Icon.create(iconType, 'icon-link devtools-link');
  const button = document.createElement('button');
  UI.Tooltip.Tooltip.install(button, title);
  button.classList.add('devtools-link', 'link-style', 'text-button');
  button.appendChild(icon);
  button.addEventListener('click', event => {
    event.consume(true);
    void eventHandler();
  });
  return button;
}

async function maybeCreateLinkToElementsPanel(opener: Protocol.Page.FrameId|SDK.ResourceTreeModel.ResourceTreeFrame|
                                              undefined): Promise<Element|null> {
  let openerFrame: SDK.ResourceTreeModel.ResourceTreeFrame|(SDK.ResourceTreeModel.ResourceTreeFrame | null)|null = null;
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
      'code-circle', i18nString(UIStrings.clickToOpenInElementsPanel), () => Common.Revealer.reveal(linkTargetDOMNode));
  const label = document.createElement('span');
  label.textContent = `<${linkTargetDOMNode.nodeName().toLocaleLowerCase()}>`;
  linkElement.insertBefore(label, linkElement.firstChild);
  linkElement.addEventListener('mouseenter', () => {
    if (openerFrame) {
      void openerFrame.highlight();
    }
  });
  linkElement.addEventListener('mouseleave', () => {
    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
  });
  return linkElement;
}

export class OpenedWindowDetailsView extends UI.ThrottledWidget.ThrottledWidget {
  private targetInfo: Protocol.Target.TargetInfo;
  private isWindowClosed: boolean;
  private readonly reportView: UI.ReportView.ReportView;
  private readonly documentSection: UI.ReportView.Section;
  #urlFieldValue: HTMLElement;
  private readonly securitySection: UI.ReportView.Section;
  private readonly openerElementField: HTMLElement;
  private hasDOMAccessValue: HTMLElement;

  constructor(targetInfo: Protocol.Target.TargetInfo, isWindowClosed: boolean) {
    super();
    this.targetInfo = targetInfo;
    this.isWindowClosed = isWindowClosed;

    this.contentElement.classList.add('frame-details-container');
    // TODO(crbug.com/1156978): Replace UI.ReportView.ReportView with ReportView.ts web component.
    this.reportView = new UI.ReportView.ReportView(this.buildTitle());

    this.reportView.show(this.contentElement);
    this.reportView.element.classList.add('frame-details-report-container');

    this.documentSection = this.reportView.appendSection(i18nString(UIStrings.document));
    this.#urlFieldValue =
        this.documentSection.appendField(i18nString(UIStrings.url)).createChild('div', 'text-ellipsis');

    this.securitySection = this.reportView.appendSection(i18nString(UIStrings.security));
    this.openerElementField = this.securitySection.appendField(i18nString(UIStrings.openerFrame));
    this.securitySection.setFieldVisible(i18nString(UIStrings.openerFrame), false);
    this.hasDOMAccessValue = this.securitySection.appendField(i18nString(UIStrings.accessToOpener));
    UI.Tooltip.Tooltip.install(this.hasDOMAccessValue, i18nString(UIStrings.showsWhetherTheOpenedWindowIs));
    this.update();
  }

  override async doUpdate(): Promise<void> {
    this.reportView.setTitle(this.buildTitle());
    this.#urlFieldValue.textContent = this.targetInfo.url;
    this.#urlFieldValue.title = this.targetInfo.url;
    this.hasDOMAccessValue.textContent = booleanToYesNo(this.targetInfo.canAccessOpener);
    void this.maybeDisplayOpenerFrame();
  }

  async maybeDisplayOpenerFrame(): Promise<void> {
    this.openerElementField.removeChildren();
    const linkElement = await maybeCreateLinkToElementsPanel(this.targetInfo.openerFrameId);
    if (linkElement) {
      this.openerElementField.append(linkElement);
      this.securitySection.setFieldVisible(i18nString(UIStrings.openerFrame), true);
      return;
    }
    this.securitySection.setFieldVisible(i18nString(UIStrings.openerFrame), false);
  }

  buildTitle(): string {
    let title = this.targetInfo.title || i18nString(UIStrings.windowWithoutTitle);
    if (this.isWindowClosed) {
      title += ` (${i18nString(UIStrings.closed)})`;
    }
    return title;
  }

  setIsWindowClosed(isWindowClosed: boolean): void {
    this.isWindowClosed = isWindowClosed;
  }

  setTargetInfo(targetInfo: Protocol.Target.TargetInfo): void {
    this.targetInfo = targetInfo;
  }
  override wasShown(): void {
    super.wasShown();
    this.reportView.registerCSSFiles([openedWindowDetailsViewStyles]);
    this.registerCSSFiles([openedWindowDetailsViewStyles]);
  }
}

export class WorkerDetailsView extends UI.ThrottledWidget.ThrottledWidget {
  private readonly targetInfo: Protocol.Target.TargetInfo;
  private readonly reportView: UI.ReportView.ReportView;
  private readonly documentSection: UI.ReportView.Section;
  private readonly isolationSection: UI.ReportView.Section;
  private readonly coepPolicy: HTMLElement;

  constructor(targetInfo: Protocol.Target.TargetInfo) {
    super();
    this.targetInfo = targetInfo;

    this.contentElement.classList.add('frame-details-container');
    // TODO(crbug.com/1156978): Replace UI.ReportView.ReportView with ReportView.ts web component.
    this.reportView =
        new UI.ReportView.ReportView(this.targetInfo.title || this.targetInfo.url || i18nString(UIStrings.worker));

    this.reportView.show(this.contentElement);
    this.reportView.element.classList.add('frame-details-report-container');

    this.documentSection = this.reportView.appendSection(i18nString(UIStrings.document));
    const URLFieldValue =
        this.documentSection.appendField(i18nString(UIStrings.url)).createChild('div', 'text-ellipsis');
    URLFieldValue.textContent = this.targetInfo.url;
    URLFieldValue.title = this.targetInfo.url;
    const workerType = this.documentSection.appendField(i18nString(UIStrings.type));
    workerType.textContent = this.workerTypeToString(this.targetInfo.type);

    this.isolationSection = this.reportView.appendSection(i18nString(UIStrings.securityIsolation));
    this.coepPolicy = this.isolationSection.appendField(i18nString(UIStrings.crossoriginEmbedderPolicy));
    this.update();
  }

  workerTypeToString(type: string): Common.UIString.LocalizedString {
    if (type === 'worker') {
      return i18nString(UIStrings.webWorker);
    }
    if (type === 'service_worker') {
      return i18n.i18n.lockedString('Service Worker');
    }
    return i18nString(UIStrings.unknown);
  }

  private async updateCoopCoepStatus(): Promise<void> {
    const target = SDK.TargetManager.TargetManager.instance().targetById(this.targetInfo.targetId);
    if (!target) {
      return;
    }
    const model = target.model(SDK.NetworkManager.NetworkManager);
    const info = model && await model.getSecurityIsolationStatus(null);
    if (!info) {
      return;
    }
    const coepIsEnabled =
        (value: Protocol.Network.CrossOriginEmbedderPolicyValue|Protocol.Network.CrossOriginOpenerPolicyValue):
            boolean => value !== Protocol.Network.CrossOriginEmbedderPolicyValue.None;
    this.fillCrossOriginPolicy(this.coepPolicy, coepIsEnabled, info.coep);
  }

  private fillCrossOriginPolicy(
      field: HTMLElement,
      isEnabled: (arg0: (Protocol.Network.CrossOriginEmbedderPolicyValue|
                         Protocol.Network.CrossOriginOpenerPolicyValue)) => boolean,
      info: Protocol.Network.CrossOriginEmbedderPolicyStatus|Protocol.Network.CrossOriginOpenerPolicyStatus|null|
      undefined): void {
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

  override async doUpdate(): Promise<void> {
    await this.updateCoopCoepStatus();
  }
  override wasShown(): void {
    super.wasShown();
    this.reportView.registerCSSFiles([openedWindowDetailsViewStyles]);
    this.registerCSSFiles([openedWindowDetailsViewStyles]);
  }
}
