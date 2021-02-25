// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Components from '../ui/components/components.js';

import * as Bindings from '../bindings/bindings.js';
import * as Common from '../common/common.js';
import * as LitHtml from '../third_party/lit-html/lit-html.js';
import * as Network from '../network/network.js';
import * as Platform from '../platform/platform.js';
import * as Root from '../root/root.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';
import * as Workspace from '../workspace/workspace.js';

import * as i18n from '../i18n/i18n.js';

export const UIStrings = {
  /**
  *@description Section header in the Frame Details view
  */
  additionalInformation: 'Additional Information',
  /**
  *@description Explanation for why the additional information section is being shown
  */
  thisAdditionalDebugging:
      'This additional (debugging) information is shown because the \'Protocol Monitor\' experiment is enabled.',
  /**
  *@description Label for subtitle of frame details view
  */
  frameId: 'Frame ID',
  /**
  *@description Name of a network resource type
  */
  document: 'Document',
  /**
  *@description Text for web URLs
  */
  url: 'URL',
  /**
  *@description Title for a link to the Sources panel
  */
  clickToRevealInSourcesPanel: 'Click to reveal in Sources panel',
  /**
  *@description Title for a link to the Network panel
  */
  clickToRevealInNetworkPanel: 'Click to reveal in Network panel',
  /**
  *@description Title for unreachable URL field
  */
  unreachableUrl: 'Unreachable URL',
  /**
  *@description Title for a link that applies a filter to the network panel
  */
  clickToRevealInNetworkPanelMight: 'Click to reveal in Network panel (might require page reload)',
  /**
  *@description Text for the origin of something
  */
  origin: 'Origin',
  /**
  *@description Related node label in Timeline UIUtils of the Performance panel
  */
  ownerElement: 'Owner Element',
  /**
  *@description Title for a link to the Elements panel
  */
  clickToRevealInElementsPanel: 'Click to reveal in Elements panel',
  /**
  *@description Title for ad frame type field
  */
  adStatus: 'Ad Status',
  /**
  *@description Description for ad frame type
  */
  thisFrameHasBeenIdentifiedAsThe: 'This frame has been identified as the root frame of an ad',
  /**
  *@description Value for ad frame type
  */
  root: 'root',
  /**
  *@description Description for ad frame type
  */
  thisFrameHasBeenIdentifiedAsTheA: 'This frame has been identified as a child frame of an ad',
  /**
  *@description Value for ad frame type
  */
  child: 'child',
  /**
  *@description Section header in the Frame Details view
  */
  securityIsolation: 'Security & Isolation',
  /**
  *@description Row title for in the Frame Details view
  */
  secureContext: 'Secure Context',
  /**
  *@description Text in Timeline indicating that input has happened recently
  */
  yes: 'Yes',
  /**
  *@description Text in Timeline indicating that input has not happened recently
  */
  no: 'No',
  /**
  *@description Row title for in the Frame Details view
  */
  crossoriginIsolated: 'Cross-Origin Isolated',
  /**
  *@description Explanatory text in the Frame Details view
  */
  localhostIsAlwaysASecureContext: 'Localhost is always a secure context',
  /**
  *@description Explanatory text in the Frame Details view
  */
  aFrameAncestorIsAnInsecure: 'A frame ancestor is an insecure context',
  /**
  *@description Explanatory text in the Frame Details view
  */
  theFramesSchemeIsInsecure: 'The frame\'s scheme is insecure',
  /**
  *@description Row title in the Frame Details view
  */
  crossoriginEmbedderPolicy: 'Cross-Origin Embedder Policy',
  /**
  *@description Row title in the Frame Details view
  */
  crossoriginOpenerPolicy: 'Cross-Origin Opener Policy',
  /**
  *@description This label specifies the server endpoints to which the server is reporting errors
  *and warnings through the Report-to API. Following this label will be the URL of the server.
  */
  reportingTo: 'reporting to',
  /**
  *@description Section header in the Frame Details view
  */
  apiAvailability: 'API availability',
  /**
  *@description Explanatory text in the Frame Details view for the API availability section
  */
  availabilityOfCertainApisDepends: 'Availability of certain APIs depends on the document being cross-origin isolated.',
  /**
  *@description Description of the SharedArrayBuffer status
  */
  availableTransferable: 'available, transferable',
  /**
  *@description Description of the SharedArrayBuffer status
  */
  availableNotTransferable: 'available, not transferable',
  /**
  *@description Explanation for the SharedArrayBuffer availability status
  */
  unavailable: 'unavailable',
  /**
  *@description Tooltip for the SharedArrayBuffer availability status
  */
  sharedarraybufferConstructorIs:
      'SharedArrayBuffer constructor is available and SABs can be transferred via postMessage',
  /**
  *@description Tooltip for the SharedArrayBuffer availability status
  */
  sharedarraybufferConstructorIsAvailable:
      'SharedArrayBuffer constructor is available but SABs cannot be transferred via postMessage',
  /**
  *@description Explanation for the SharedArrayBuffer availability status
  */
  WillRequireCrossoriginIsolated: '⚠️ will require cross-origin isolated context in the future',
  /**
  *@description Explanation for the SharedArrayBuffer availability status
  */
  requiresCrossoriginIsolated: 'requires cross-origin isolated context',
  /**
  *@description Explanation for the Measure Memory availability status
  */
  available: 'available',
  /**
  *@description Tooltip for the Measure Memory availability status
  */
  thePerformanceAPI: 'The performance.measureUserAgentSpecificMemory() API is available',
  /**
  *@description Tooltip for the Measure Memory availability status
  */
  thePerformancemeasureuseragentspecificmemory: 'The performance.measureUserAgentSpecificMemory() API is not available',
  /**
  *@description Entry in the API availability section of the frame details view
  */
  measureMemory: 'Measure Memory',
  /**
  *@description Text that is usually a hyperlink to more documentation
  */
  learnMore: 'Learn more',
};
const str_ = i18n.i18n.registerUIStrings('resources/FrameDetailsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class FrameDetailsView extends UI.ThrottledWidget.ThrottledWidget {
  private readonly reportView = new FrameDetailsReportView();
  private readonly frame: SDK.ResourceTreeModel.ResourceTreeFrame;

  constructor(frame: SDK.ResourceTreeModel.ResourceTreeFrame) {
    super();
    this.frame = frame;
    this.contentElement.classList.add('overflow-auto');
    this.contentElement.appendChild(this.reportView);
    this.update();
  }

  async doUpdate(): Promise<void> {
    this.reportView.data = {frame: this.frame};
  }
}

export interface FrameDetailsReportViewData {
  frame: SDK.ResourceTreeModel.ResourceTreeFrame;
}

export class FrameDetailsReportView extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private frame?: SDK.ResourceTreeModel.ResourceTreeFrame;
  private protocolMonitorExperimentEnabled = false;

  connectedCallback(): void {
    this.protocolMonitorExperimentEnabled = Root.Runtime.experiments.isEnabled('protocolMonitor');
  }

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
      <style>
        .text-ellipsis {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        button ~ .text-ellipsis {
          padding-left: 2px;
        }

        .link {
          color: var(--color-link);
          text-decoration: underline;
          cursor: pointer;
          padding: 2px 0; /* adjust focus ring size */
        }

        button.link {
          border: none;
          background: none;
          font-family: inherit;
          font-size: inherit;
        }

        .inline-comment {
          padding-left: 1ex;
          white-space: pre-line;
        }

        .inline-comment::before {
          content: "(";
        }

        .inline-comment::after {
          content: ")";
        }

        .inline-name {
          color: var(--color-text-secondary);
          padding-left: 2ex;
          user-select: none;
          white-space: pre-line;
        }

        .inline-name::after {
          content: ':\u00a0';
        }

        .inline-items {
          display: flex;
        }
      </style>
      <devtools-report .data=${{reportTitle: this.frame.displayName()} as Components.ReportView.ReportData}>
        ${this.renderDocumentSection()}
        ${this.renderIsolationSection()}
        ${this.renderApiAvailabilitySection()}
        ${LitHtml.Directives.until(this.renderPermissionPolicy(), LitHtml.nothing)}
        ${this.protocolMonitorExperimentEnabled ? this.renderAdditionalInfoSection() : LitHtml.nothing}
      </devtools-report>
    `, this.shadow);
    // clang-format on
  }

  private async renderPermissionPolicy(): Promise<LitHtml.TemplateResult|{}> {
    const stats = await (this.frame && this.frame.getPermissionsPolicyState());
    if (!stats) {
      return LitHtml.nothing;
    }
    const allowed = stats.filter(s => s.allowed).map(s => s.feature).sort();
    const disallowed = stats.filter(s => !s.allowed).map(s => s.feature).sort();
    return LitHtml.html`<devtools-report-section-header>Permissions Policy</devtools-report-section-header>
    ${
        allowed.length ? LitHtml.html`<devtools-report-key>Allowed Features</devtools-report-key>
    <devtools-report-value>${allowed.join(', ')}</devtools-report-value>` :
                         LitHtml.nothing}
    ${
        disallowed.length ? LitHtml.html`<devtools-report-key>Disallowed Features</devtools-report-key>
    <devtools-report-value>${disallowed.join(', ')}</devtools-report-value>` :
                            LitHtml.nothing}
    `;
  }

  private renderDocumentSection(): LitHtml.TemplateResult|{} {
    if (!this.frame) {
      return LitHtml.nothing;
    }

    return LitHtml.html`
      <devtools-report-section-header>${i18nString(UIStrings.document)}</devtools-report-section-header>
      <devtools-report-key>${i18nString(UIStrings.url)}</devtools-report-key>
      <devtools-report-value>
        <div class="inline-items">
          ${this.maybeRenderSourcesLinkForURL()}
          ${this.maybeRenderNetworkLinkForURL()}
          <div class="text-ellipsis" title=${this.frame.url}>${this.frame.url}</div>
        </div>
      </devtools-report-value>
      ${this.maybeRenderUnreachableURL()}
      ${this.maybeRenderOrigin()}
      ${LitHtml.Directives.until(this.renderOwnerElement(), LitHtml.nothing)}
      ${this.maybeRenderAdStatus()}
      <devtools-report-divider></devtools-report-divider>
    `;
  }

  private maybeRenderSourcesLinkForURL(): LitHtml.TemplateResult|{} {
    if (!this.frame || this.frame.unreachableUrl()) {
      return LitHtml.nothing;
    }
    const sourceCode = this.uiSourceCodeForFrame(this.frame);
    return this.renderIconLink(
        'sources_panel_icon',
        i18nString(UIStrings.clickToRevealInSourcesPanel),
        (): Promise<void> => Common.Revealer.reveal(sourceCode),
    );
  }

  private maybeRenderNetworkLinkForURL(): LitHtml.TemplateResult|{} {
    if (this.frame) {
      const resource = this.frame.resourceForURL(this.frame.url);
      if (resource && resource.request) {
        const request = resource.request;
        return this.renderIconLink(
            'network_panel_icon',
            i18nString(UIStrings.clickToRevealInNetworkPanel),
            (): Promise<void> =>
                Network.NetworkPanel.NetworkPanel.selectAndShowRequest(request, Network.NetworkItemView.Tabs.Headers),
        );
      }
    }
    return LitHtml.nothing;
  }

  private renderIconLink(
      iconName: string, title: Platform.UIString.LocalizedString,
      clickHandler: (() => void)|(() => Promise<void>)): LitHtml.TemplateResult {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return LitHtml.html`
      <button class="link" role="link" tabindex=0 @click=${clickHandler} title=${title}>
        <devtools-icon .data=${{
          iconName: iconName,
          color: 'var(--color-primary)',
          width: '16px',
          height: '16px',
        } as Components.Icon.IconData}>
      </button>
    `;
    // clang-format on
  }

  private uiSourceCodeForFrame(frame: SDK.ResourceTreeModel.ResourceTreeFrame): Workspace.UISourceCode.UISourceCode
      |null {
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

  private maybeRenderUnreachableURL(): LitHtml.TemplateResult|{} {
    if (!this.frame || !this.frame.unreachableUrl()) {
      return LitHtml.nothing;
    }
    return LitHtml.html`
      <devtools-report-key>${i18nString(UIStrings.unreachableUrl)}</devtools-report-key>
      <devtools-report-value>
        <div class="inline-items">
          ${this.renderNetworkLinkForUnreachableURL()}
          <div class="text-ellipsis" title=${this.frame.unreachableUrl()}>${this.frame.unreachableUrl()}</div>
        </div>
      </devtools-report-value>
    `;
  }

  private renderNetworkLinkForUnreachableURL(): LitHtml.TemplateResult|{} {
    if (this.frame) {
      const unreachableUrl = Common.ParsedURL.ParsedURL.fromString(this.frame.unreachableUrl());
      if (unreachableUrl) {
        return this.renderIconLink(
            'network_panel_icon',
            i18nString(UIStrings.clickToRevealInNetworkPanelMight),
            ():
                void => {
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
                },
        );
      }
    }
    return LitHtml.nothing;
  }

  private maybeRenderOrigin(): LitHtml.TemplateResult|{} {
    if (this.frame && this.frame.securityOrigin && this.frame.securityOrigin !== '://') {
      return LitHtml.html`
        <devtools-report-key>${i18nString(UIStrings.origin)}</devtools-report-key>
        <devtools-report-value>
          <div class="text-ellipsis" title=${this.frame.securityOrigin}>${this.frame.securityOrigin}</div>
        </devtools-report-value>
      `;
    }
    return LitHtml.nothing;
  }

  private async renderOwnerElement(): Promise<LitHtml.TemplateResult|{}> {
    if (this.frame) {
      const linkTargetDOMNode = await this.frame.getOwnerDOMNodeOrDocument();
      if (linkTargetDOMNode) {
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        return LitHtml.html`
          <style>
            .button-icon-with-text {
              vertical-align: sub;
            }

            .without-min-width {
              min-width: auto;
            }
          </style>
            <devtools-report-key>${i18nString(UIStrings.ownerElement)}</devtools-report-key>
          <devtools-report-value class="without-min-width">
              <button class="link" role="link" tabindex=0 title=${i18nString(UIStrings.clickToRevealInElementsPanel)}
              @mouseenter=${(): Promise<void>|undefined => this.frame?.highlight()}
              @mouseleave=${(): void => SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight()}
              @click=${(): Promise<void> => Common.Revealer.reveal(linkTargetDOMNode)}
            >
              <devtools-icon class="button-icon-with-text" .data=${{
                iconName: 'elements_panel_icon',
                color: 'var(--color-primary)',
                width: '16px',
                height: '16px',
              } as Components.Icon.IconData}></devtools-icon>
              <${linkTargetDOMNode.nodeName().toLocaleLowerCase()}>
            </button>
          </devtools-report-value>
        `;
        // clang-format on
      }
    }
    return LitHtml.nothing;
  }

  private maybeRenderAdStatus(): LitHtml.TemplateResult|{} {
    if (this.frame) {
      if (this.frame.adFrameType() === Protocol.Page.AdFrameType.Root) {
        return LitHtml.html`
          <devtools-report-key>${i18nString(UIStrings.adStatus)}</devtools-report-key>
          <devtools-report-value title=${i18nString(UIStrings.thisFrameHasBeenIdentifiedAsThe)}>${
            i18nString(UIStrings.root)}</devtools-report-value>
        `;
      }
      if (this.frame.adFrameType() === Protocol.Page.AdFrameType.Child) {
        return LitHtml.html`
          <devtools-report-key>${i18nString(UIStrings.adStatus)}</devtools-report-key>
          <devtools-report-value title=${i18nString(UIStrings.thisFrameHasBeenIdentifiedAsTheA)}>${
            i18nString(UIStrings.child)}</devtools-report-value>
        `;
      }
    }
    return LitHtml.nothing;
  }

  private renderIsolationSection(): LitHtml.TemplateResult|{} {
    if (!this.frame) {
      return LitHtml.nothing;
    }
    return LitHtml.html`
      <devtools-report-section-header>${i18nString(UIStrings.securityIsolation)}</devtools-report-section-header>
      <devtools-report-key>${i18nString(UIStrings.secureContext)}</devtools-report-key>
      <devtools-report-value>
        ${this.frame.isSecureContext() ? i18nString(UIStrings.yes) : i18nString(UIStrings.no)}
        ${this.maybeRenderSecureContextExplanation()}
      </devtools-report-value>
      <devtools-report-key>${i18nString(UIStrings.crossoriginIsolated)}</devtools-report-key>
      <devtools-report-value>
        ${this.frame.isCrossOriginIsolated() ? i18nString(UIStrings.yes) : i18nString(UIStrings.no)}
      </devtools-report-value>
      ${LitHtml.Directives.until(this.maybeRenderCoopCoepStatus(), LitHtml.nothing)}
      <devtools-report-divider></devtools-report-divider>
    `;
  }

  private maybeRenderSecureContextExplanation(): LitHtml.TemplateResult|{} {
    const explanation = this.getSecureContextExplanation();
    if (explanation) {
      return LitHtml.html`
        <span class="inline-comment">${explanation}</span>
      `;
    }
    return LitHtml.nothing;
  }

  private getSecureContextExplanation(): Platform.UIString.LocalizedString|null {
    switch (this.frame?.getSecureContextType()) {
      case Protocol.Page.SecureContextType.Secure:
        return null;
      case Protocol.Page.SecureContextType.SecureLocalhost:
        return i18nString(UIStrings.localhostIsAlwaysASecureContext);
      case Protocol.Page.SecureContextType.InsecureAncestor:
        return i18nString(UIStrings.aFrameAncestorIsAnInsecure);
      case Protocol.Page.SecureContextType.InsecureScheme:
        return i18nString(UIStrings.theFramesSchemeIsInsecure);
    }
    return null;
  }

  private async maybeRenderCoopCoepStatus(): Promise<LitHtml.TemplateResult|{}> {
    if (this.frame) {
      const model = this.frame.resourceTreeModel().target().model(SDK.NetworkManager.NetworkManager);
      const info = model && await model.getSecurityIsolationStatus(this.frame.id);
      if (info) {
        return LitHtml.html`
          ${
            this.maybeRenderCrossOriginStatus(
                info.coep, i18nString(UIStrings.crossoriginEmbedderPolicy),
                Protocol.Network.CrossOriginEmbedderPolicyValue.None)}
          ${
            this.maybeRenderCrossOriginStatus(
                info.coop, i18nString(UIStrings.crossoriginOpenerPolicy),
                Protocol.Network.CrossOriginOpenerPolicyValue.UnsafeNone)}
        `;
      }
    }
    return LitHtml.nothing;
  }

  private maybeRenderCrossOriginStatus(
      info: Protocol.Network.CrossOriginEmbedderPolicyStatus|Protocol.Network.CrossOriginOpenerPolicyStatus|undefined,
      policyName: string,
      noneValue: Protocol.Network.CrossOriginEmbedderPolicyValue|
      Protocol.Network.CrossOriginOpenerPolicyValue): LitHtml.TemplateResult|{} {
    if (!info) {
      return LitHtml.nothing;
    }
    const isEnabled = info.value !== noneValue;
    const isReportOnly = (!isEnabled && info.reportOnlyValue !== noneValue);
    const endpoint = isEnabled ? info.reportingEndpoint : info.reportOnlyReportingEndpoint;
    return LitHtml.html`
      <devtools-report-key>${policyName}</devtools-report-key>
      <devtools-report-value>
        ${isEnabled ? info.value : info.reportOnlyValue}
        ${isReportOnly ? LitHtml.html`<span class="inline-comment">report-only</span>` : LitHtml.nothing}
        ${
        endpoint ? LitHtml.html`<span class="inline-name">${i18nString(UIStrings.reportingTo)}</span>${endpoint}` :
                   LitHtml.nothing}
      </devtools-report-value>
    `;
  }

  private renderApiAvailabilitySection(): LitHtml.TemplateResult|{} {
    if (!this.frame) {
      return LitHtml.nothing;
    }

    return LitHtml.html`
      <style>
        .span-cols {
          grid-column-start: span 2;
          margin: 0 0 8px 30px;
          line-height: 28px;
        }
      </style>
      <devtools-report-section-header>${i18nString(UIStrings.apiAvailability)}</devtools-report-section-header>
      <div class="span-cols">
        ${i18nString(UIStrings.availabilityOfCertainApisDepends)}
        <x-link href="https://web.dev/why-coop-coep/" class="link">Learn more</x-link>
      </div>
      ${this.renderSharedArrayBufferAvailability()}
      ${this.renderMeasureMemoryAvailability()}
      <devtools-report-divider></devtools-report-divider>
    `;
  }

  private renderSharedArrayBufferAvailability(): LitHtml.TemplateResult|{} {
    if (this.frame) {
      const features = this.frame.getGatedAPIFeatures();
      if (features) {
        const sabAvailable = features.includes(Protocol.Page.GatedAPIFeatures.SharedArrayBuffers);
        const sabTransferAvailable =
            sabAvailable && features.includes(Protocol.Page.GatedAPIFeatures.SharedArrayBuffersTransferAllowed);
        const availabilityText = sabTransferAvailable ?
            i18nString(UIStrings.availableTransferable) :
            (sabAvailable ? i18nString(UIStrings.availableNotTransferable) : i18nString(UIStrings.unavailable));
        const tooltipText = sabTransferAvailable ?
            i18nString(UIStrings.sharedarraybufferConstructorIs) :
            (sabAvailable ? i18nString(UIStrings.sharedarraybufferConstructorIsAvailable) : '');

        // SharedArrayBuffer is an API name, so we don't translate it.
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        return LitHtml.html`
          <devtools-report-key>SharedArrayBuffers</devtools-report-key>
          <devtools-report-value title=${tooltipText}>
            ${availabilityText}
            ${!this.frame.isCrossOriginIsolated() ?
              (sabAvailable ?
                LitHtml.html`<span class="inline-comment">${
                  i18nString(UIStrings.WillRequireCrossoriginIsolated)}</span>` :
                LitHtml.html`<span class="inline-comment">${i18nString(UIStrings.requiresCrossoriginIsolated)}</span>`) :
              LitHtml.nothing}
          </devtools-report-value>
        `;
        // clang-format on
      }
    }
    return LitHtml.nothing;
  }

  private renderMeasureMemoryAvailability(): LitHtml.TemplateResult|{} {
    if (this.frame) {
      const measureMemoryAvailable = this.frame.isCrossOriginIsolated();
      const availabilityText =
          measureMemoryAvailable ? i18nString(UIStrings.available) : i18nString(UIStrings.unavailable);
      const tooltipText = measureMemoryAvailable ? i18nString(UIStrings.thePerformanceAPI) :
                                                   i18nString(UIStrings.thePerformancemeasureuseragentspecificmemory);
      return LitHtml.html`
        <devtools-report-key>${i18nString(UIStrings.measureMemory)}</devtools-report-key>
        <devtools-report-value>
          <span title=${tooltipText}>${availabilityText}</span>
          <x-link class="link" href="https://web.dev/monitor-total-page-memory-usage/">${
          i18nString(UIStrings.learnMore)}</x-link>
        </devtools-report-value>
      `;
    }
    return LitHtml.nothing;
  }

  private renderAdditionalInfoSection(): LitHtml.TemplateResult|{} {
    if (!this.frame) {
      return LitHtml.nothing;
    }

    return LitHtml.html`
      <devtools-report-section-header
        title=${i18nString(UIStrings.thisAdditionalDebugging)}
      >${i18nString(UIStrings.additionalInformation)}</devtools-report-section-header>
      <devtools-report-key>${i18nString(UIStrings.frameId)}</devtools-report-key>
      <devtools-report-value>
        <div class="text-ellipsis" title=${this.frame.id}>${this.frame.id}</div>
      </devtools-report-value>
      <devtools-report-divider></devtools-report-divider>
    `;
  }
}

customElements.define('devtools-resources-frame-details-view', FrameDetailsReportView);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-resources-frame-details-view': FrameDetailsReportView;
  }
}
