// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import type * as Components from '../ui/components/components.js';

import * as Bindings from '../bindings/bindings.js';
import * as Common from '../common/common.js';
import * as LitHtml from '../third_party/lit-html/lit-html.js';
import * as Network from '../network/network.js';
import {ls} from '../platform/platform.js';
import * as Root from '../root/root.js';
import * as SDK from '../sdk/sdk.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';
import * as Workspace from '../workspace/workspace.js';

const booleanToYesNo = (b: boolean): Common.UIString.LocalizedString => b ? ls`Yes` : ls`No`;

export class FrameDetailsView extends UI.ThrottledWidget.ThrottledWidget {
  private readonly reportView = new FrameDetailsReportView();

  _protocolMonitorExperimentEnabled: boolean;
  _frame: SDK.ResourceTreeModel.ResourceTreeFrame;
  _reportView: UI.ReportView.ReportView;
  _generalSection: UI.ReportView.Section;
  _urlFieldValue: HTMLElement;
  _urlStringElement: HTMLElement;
  _unreachableURL: HTMLElement;
  _originStringElement: HTMLElement;
  _ownerFieldValue: HTMLElement;
  _adStatus: HTMLElement;
  _isolationSection: UI.ReportView.Section;
  _secureContext: HTMLElement;
  _crossOriginIsolatedContext: HTMLElement;
  _coepPolicy: HTMLElement;
  _coopPolicy: HTMLElement;
  _apiAvailability: UI.ReportView.Section;
  _apiSharedArrayBuffer: HTMLElement;
  _apiMeasureMemory: HTMLElement;
  _additionalInfo: UI.ReportView.Section|undefined;

  constructor(frame: SDK.ResourceTreeModel.ResourceTreeFrame) {
    super();
    this._protocolMonitorExperimentEnabled = Root.Runtime.experiments.isEnabled('protocolMonitor');
    this.registerRequiredCSS('resources/frameDetailsReportView.css', {enableLegacyPatching: false});
    this._frame = frame;
    this.contentElement.classList.add('frame-details-container');

    this.contentElement.appendChild(this.reportView);

    // TODO(crbug.com/1156978): Replace UI.ReportView.ReportView with ReportView.ts web component.
    this._reportView = new UI.ReportView.ReportView();
    this._reportView.registerRequiredCSS('resources/frameDetailsReportView.css', {enableLegacyPatching: false});
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
    this._apiSharedArrayBuffer = this._apiAvailability.appendField(ls`Shared Array Buffers`);
    this._apiMeasureMemory = this._apiAvailability.appendField(ls`Measure Memory`);

    if (this._protocolMonitorExperimentEnabled) {
      this._additionalInfo = this._reportView.appendSection(ls`Additional Information`);
      this._additionalInfo.setTitle(
          ls`Additional Information`,
          ls`This additional (debugging) information is shown because the 'Protocol Monitor' experiment is enabled.`);
      const frameIDField = this._additionalInfo.appendField(ls`Frame ID`);
      frameIDField.textContent = frame.id;
    }
    this.update();
  }

  async doUpdate(): Promise<void> {
    this.reportView.data = {frame: this._frame};

    this._urlFieldValue.removeChildren();
    this._urlStringElement.textContent = this._frame.url;
    UI.Tooltip.Tooltip.install(this._urlStringElement, this._frame.url);
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
      UI.Tooltip.Tooltip.install(this._originStringElement, this._frame.securityOrigin);
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
    this._updateApiAvailability();
  }

  uiSourceCodeForFrame(frame: SDK.ResourceTreeModel.ResourceTreeFrame): Workspace.UISourceCode.UISourceCode|null {
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

  static fillCrossOriginPolicy(
      field: HTMLElement,
      isEnabled: (value: Protocol.Network.CrossOriginEmbedderPolicyValue|
                  Protocol.Network.CrossOriginOpenerPolicyValue) => boolean,
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
      reportingEndpointPrefix.textContent = ls`reporting to`;
      const reportingEndpointName = field.createChild('span');
      reportingEndpointName.textContent = endpoint;
    }
  }

  async _updateCoopCoepStatus(): Promise<void> {
    const model = this._frame.resourceTreeModel().target().model(SDK.NetworkManager.NetworkManager);
    const info = model && await model.getSecurityIsolationStatus(this._frame.id);
    if (!info) {
      return;
    }
    const coepIsEnabled =
        (value: Protocol.Network.CrossOriginEmbedderPolicyValue|Protocol.Network.CrossOriginOpenerPolicyValue):
            boolean => value !== Protocol.Network.CrossOriginEmbedderPolicyValue.None;
    FrameDetailsView.fillCrossOriginPolicy(this._coepPolicy, coepIsEnabled, info.coep);
    this._isolationSection.setFieldVisible(ls`Cross-Origin Embedder Policy`, Boolean(info.coep));

    const coopIsEnabled =
        (value: Protocol.Network.CrossOriginEmbedderPolicyValue|Protocol.Network.CrossOriginOpenerPolicyValue):
            boolean => value !== Protocol.Network.CrossOriginOpenerPolicyValue.UnsafeNone;
    FrameDetailsView.fillCrossOriginPolicy(this._coopPolicy, coopIsEnabled, info.coop);
    this._isolationSection.setFieldVisible(ls`Cross-Origin Opener Policy`, Boolean(info.coop));
  }

  _explanationFromSecureContextType(type: Protocol.Page.SecureContextType|null): string|null {
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

  _updateContextStatus(): void {
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

  _updateApiAvailability(): void {
    const features = this._frame.getGatedAPIFeatures();
    this._apiAvailability.setFieldVisible(ls`Shared Array Buffers`, Boolean(features));

    if (!features) {
      return;
    }
    const sabAvailable = features.includes(Protocol.Page.GatedAPIFeatures.SharedArrayBuffers);
    if (sabAvailable) {
      const sabTransferAvailable = features.includes(Protocol.Page.GatedAPIFeatures.SharedArrayBuffersTransferAllowed);
      this._apiSharedArrayBuffer.textContent =
          sabTransferAvailable ? ls`available, transferable` : ls`available, not transferable`;
      UI.Tooltip.Tooltip.install(
          this._apiSharedArrayBuffer,
          sabTransferAvailable ?
              ls`SharedArrayBuffer constructor is available and SABs can be transferred via postMessage` :
              ls`SharedArrayBuffer constructor is available but SABs cannot be transferred via postMessage`);
      if (!this._frame.isCrossOriginIsolated()) {
        const reasonHint = this._apiSharedArrayBuffer.createChild('span', 'inline-span');
        reasonHint.textContent = ls`⚠️ will require cross-origin isolated context in the future`;
      }
    } else {
      this._apiSharedArrayBuffer.textContent = ls`unavailable`;
      if (!this._frame.isCrossOriginIsolated()) {
        const reasonHint = this._apiSharedArrayBuffer.createChild('span', 'inline-comment');
        reasonHint.textContent = ls`requires cross-origin isolated context`;
      }
    }

    const measureMemoryAvailable = this._frame.isCrossOriginIsolated();
    UI.Tooltip.Tooltip.install(
        this._apiMeasureMemory,
        measureMemoryAvailable ? ls`The performance.measureUserAgentSpecificMemory() API is available` :
                                 ls`The performance.measureUserAgentSpecificMemory() API is not available`);
    this._apiMeasureMemory.textContent = '';
    const status = measureMemoryAvailable ? ls`available` : ls`unavailable`;
    const link = 'https://web.dev/monitor-total-page-memory-usage/';
    this._apiMeasureMemory.appendChild(
        UI.Fragment.html`<div>${status} ${UI.XLink.XLink.create(link, ls`Learn more`)}</div>`);
  }

  static maybeAppendLinkToRequest(element: Element, resource: SDK.Resource.Resource|null): void {
    if (resource && resource.request) {
      const request = resource.request;
      const revealRequest = linkifyIcon(
          'mediumicon-network-panel', ls`Click to reveal in Network panel`,
          () => Network.NetworkPanel.NetworkPanel.selectAndShowRequest(request, Network.NetworkItemView.Tabs.Headers));
      element.appendChild(revealRequest);
    }
  }

  _maybeAppendLinkForUnreachableUrl(): void {
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
            },
          ]);
        });
    this._unreachableURL.appendChild(revealRequest);
  }

  _updateAdStatus(): void {
    switch (this._frame.adFrameType()) {
      case Protocol.Page.AdFrameType.Root:
        this._generalSection.setFieldVisible(ls`Ad Status`, true);
        this._adStatus.textContent = ls`root`;
        UI.Tooltip.Tooltip.install(this._adStatus, ls`This frame has been identified as the root frame of an ad`);
        break;
      case Protocol.Page.AdFrameType.Child:
        this._generalSection.setFieldVisible(ls`Ad Status`, true);
        this._adStatus.textContent = ls`child`;
        UI.Tooltip.Tooltip.install(this._adStatus, ls`This frame has been identified as the a child frame of an ad`);
        break;
      default:
        this._generalSection.setFieldVisible(ls`Ad Status`, false);
        break;
    }
  }
}

export interface FrameDetailsReportViewData {
  frame: SDK.ResourceTreeModel.ResourceTreeFrame;
}

export class FrameDetailsReportView extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private frame?: SDK.ResourceTreeModel.ResourceTreeFrame;

  set data(data: FrameDetailsReportViewData) {
    this.frame = data.frame;
    this.render();
  }

  private async render(): Promise<void> {
    if (!this.frame) {
      return;
    }

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    LitHtml.render(LitHtml.html`
      <devtools-report .data=${{reportTitle: this.frame.displayName()} as Components.ReportView.ReportData}>
      </devtools-report>
    `, this.shadow);
    // clang-format on
  }
}

customElements.define('devtools-resources-frame-details-view', FrameDetailsReportView);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-resources-frame-details-view': FrameDetailsReportView;
  }
}

function linkifyIcon(iconType: string, title: string, eventHandler: () => (void|Promise<void>)): Element {
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

async function maybeCreateLinkToElementsPanel(opener: string|SDK.ResourceTreeModel.ResourceTreeFrame|
                                              undefined): Promise<Element|null> {
  let openerFrame: SDK.ResourceTreeModel.ResourceTreeFrame|null = null;
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
