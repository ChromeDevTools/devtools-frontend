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
import * as SDK from '../sdk/sdk.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';
import * as Workspace from '../workspace/workspace.js';
import {ls} from '../platform/platform.js';

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
        ${this.protocolMonitorExperimentEnabled ? this.renderAdditionalInfoSection() : LitHtml.nothing}
      </devtools-report>
    `, this.shadow);
    // clang-format on
  }

  private renderDocumentSection(): LitHtml.TemplateResult|{} {
    if (!this.frame) {
      return LitHtml.nothing;
    }

    return LitHtml.html`
      <devtools-report-section-header>${ls`Document`}</devtools-report-section-header>
      <devtools-report-key>${ls`URL`}</devtools-report-key>
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
        ls`Click to reveal in Sources panel`,
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
            ls`Click to reveal in Network panel`,
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
      <devtools-report-key>${ls`Unreachable URL`}</devtools-report-key>
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
            ls`Click to reveal in Network panel (might require page reload)`,
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
        <devtools-report-key>${ls`Origin`}</devtools-report-key>
        <devtools-report-value>
          <div class="text-ellipsis" title=${this.frame.securityOrigin}>${this.frame.securityOrigin}</div>
        </devtools-report-value>
      `;
    }
    return LitHtml.nothing;
  }

  private async renderOwnerElement(): Promise<LitHtml.TemplateResult|{}> {
    if (this.frame) {
      const openerFrame = this.frame instanceof SDK.ResourceTreeModel.ResourceTreeFrame ?
          this.frame :
          SDK.FrameManager.FrameManager.instance().getFrame(this.frame);
      if (openerFrame) {
        const linkTargetDOMNode = await openerFrame.getOwnerDOMNodeOrDocument();
        if (linkTargetDOMNode) {
          // Disabled until https://crbug.com/1079231 is fixed.
          // clang-format off
          return LitHtml.html`
            <style>
               .button-icon-with-text {
                vertical-align: sub;
              }
            </style>
            <devtools-report-key>${ls`Owner Element`}</devtools-report-key>
            <devtools-report-value>
              <button class="link" role="link" tabindex=0 title=${ls`Click to reveal in Elements panel`}
                @mouseenter=${(): Promise<void> => openerFrame.highlight()}
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
              </a>
            </devtools-report-value>
          `;
          // clang-format on
        }
      }
    }
    return LitHtml.nothing;
  }

  private maybeRenderAdStatus(): LitHtml.TemplateResult|{} {
    if (this.frame) {
      if (this.frame.adFrameType() === Protocol.Page.AdFrameType.Root) {
        return LitHtml.html`
          <devtools-report-key>${ls`Ad Status`}</devtools-report-key>
          <devtools-report-value title=${ls`This frame has been identified as the root frame of an ad`}>${
            ls`root`}</devtools-report-value>
        `;
      }
      if (this.frame.adFrameType() === Protocol.Page.AdFrameType.Child) {
        return LitHtml.html`
          <devtools-report-key>${ls`Ad Status`}</devtools-report-key>
          <devtools-report-value title=${ls`This frame has been identified as the a child frame of an ad`}>${
            ls`child`}</devtools-report-value>
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
      <devtools-report-section-header>${ls`Security & Isolation`}</devtools-report-section-header>
      <devtools-report-key>${ls`Secure Context`}</devtools-report-key>
      <devtools-report-value>
        ${this.frame.isSecureContext() ? ls`Yes` : ls`No`}
        ${this.maybeRenderSecureContextExplanation()}
      </devtools-report-value>
      <devtools-report-key>${ls`Cross-Origin Isolated`}</devtools-report-key>
      <devtools-report-value>
        ${this.frame.isCrossOriginIsolated() ? ls`Yes` : ls`No`}
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
        return ls`Localhost is always a secure context`;
      case Protocol.Page.SecureContextType.InsecureAncestor:
        return ls`A frame ancestor is an insecure context`;
      case Protocol.Page.SecureContextType.InsecureScheme:
        return ls`The frame's scheme is insecure`;
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
                info.coep, ls`Cross-Origin Embedder Policy`, Protocol.Network.CrossOriginEmbedderPolicyValue.None)}
          ${
            this.maybeRenderCrossOriginStatus(
                info.coop, ls`Cross-Origin Opener Policy`, Protocol.Network.CrossOriginOpenerPolicyValue.UnsafeNone)}
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
        ${endpoint ? LitHtml.html`<span class="inline-name">${ls`reporting to`}</span>${endpoint}` : LitHtml.nothing}
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
          line-height: 28px
        }
      </style>
      <devtools-report-section-header>${ls`API availability`}</devtools-report-section-header>
      <div class="span-cols">
        ${ls`Availability of certain APIs depends on the document being cross-origin isolated.`}
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
            ls`available, transferable` :
            (sabAvailable ? ls`available, not transferable` : ls`unavailable`);
        const tooltipText = sabTransferAvailable ?
            ls`SharedArrayBuffer constructor is available and SABs can be transferred via postMessage` :
            (sabAvailable ?
                 ls`SharedArrayBuffer constructor is available but SABs cannot be transferred via postMessage` :
                 '');

        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        return LitHtml.html`
          <devtools-report-key>${ls`Shared Array Buffers`}</devtools-report-key>
          <devtools-report-value title=${tooltipText}>
            ${availabilityText}
            ${!this.frame.isCrossOriginIsolated() ?
              (sabAvailable ?
                LitHtml.html`<span class="inline-comment">${
                  ls`⚠️ will require cross-origin isolated context in the future`}</span>` :
                LitHtml.html`<span class="inline-comment">${ls`requires cross-origin isolated context`}</span>`) :
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
      const availabilityText = measureMemoryAvailable ? ls`available` : ls`unavailable`;
      const tooltipText = measureMemoryAvailable ?
          ls`The performance.measureUserAgentSpecificMemory() API is available` :
          ls`The performance.measureUserAgentSpecificMemory() API is not available`;
      return LitHtml.html`
        <devtools-report-key>${ls`Measure Memory`}</devtools-report-key>
        <devtools-report-value>
          <span title=${tooltipText}>${availabilityText}</span>
          <x-link class="link" href="https://web.dev/monitor-total-page-memory-usage/">${ls`Learn more`}</a>
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
        title=${
        ls`This additional (debugging) information is shown because the 'Protocol Monitor' experiment is enabled.`}
      >${ls`Additional Information`}</devtools-report-section-header>
      <devtools-report-key>${ls`Frame ID`}</devtools-report-key>
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
