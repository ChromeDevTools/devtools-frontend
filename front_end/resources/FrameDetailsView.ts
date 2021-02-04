// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

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

  _protocolMonitorExperimentEnabled: boolean;
  _frame: SDK.ResourceTreeModel.ResourceTreeFrame;
  _reportView: UI.ReportView.ReportView;
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
    this._updateApiAvailability();
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
}

customElements.define('devtools-resources-frame-details-view', FrameDetailsReportView);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-resources-frame-details-view': FrameDetailsReportView;
  }
}
