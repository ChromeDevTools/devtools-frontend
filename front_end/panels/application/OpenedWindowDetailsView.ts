// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/components/report_view/report_view.js';
import '../../ui/kit/kit.js';

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, type LitTemplate, nothing, render} from '../../ui/lit/lit.js';

import openedWindowDetailsViewStyles from './openedWindowDetailsView.css.js';

const UIStrings = {
  /**
   * @description Text indicating that the opened window has access to its opener.
   */
  yes: 'Yes',
  /**
   * @description Text indicating that the opened window does not have access to its opener.
   */
  no: 'No',
  /**
   * @description Tooltip for the button to reveal the opener frame DOM node in the Elements panel.
   */
  clickToOpenInElementsPanel: 'Click to open in Elements panel',
  /**
   * @description Section header for document details in the opened window details view and worker details view.
   */
  document: 'Document',
  /**
   * @description Field label for the URL in the opened window details view and worker details view.
   */
  url: 'URL',
  /**
   * @description Section header for security information in the opened window details view.
   */
  security: 'Security',
  /**
   * @description Field label for the link to the opener frame in the opened window details view.
   */
  openerFrame: 'Opener frame',
  /**
   * @description Field label indicating whether the opened window has access to its opener in the opened window details view.
   */
  accessToOpener: 'Access to opener',
  /**
   * @description Tooltip explaining whether the opened window has access to its opener in the opened window details view.
   */
  showsWhetherTheOpenedWindowIs: 'Shows whether the opened window is able to access its opener and vice versa',
  /**
   * @description Fallback title for an opened window without a title in the opened window details view.
   */
  windowWithoutTitle: 'Window without title',
  /**
   * @description Suffix for the title of an opened window that has been closed in the opened window details view.
   */
  closed: 'closed',
  /**
   * @description Fallback title for a worker in the worker details view.
   */
  worker: 'worker',
  /**
   * @description Field label for the worker type in the worker details view.
   */
  type: 'Type',
  /**
   * @description Section header for security and isolation in the worker details view.
   */
  securityIsolation: 'Security & isolation',
  /**
   * @description Field label for the Cross-Origin Embedder Policy in the worker details view.
   */
  crossoriginEmbedderPolicy: 'Cross-Origin Embedder Policy',
  /**
   * @description Value for dedicated Web Worker type in the worker details view.
   */
  webWorker: 'Web Worker',
  /**
   * @description Value for an unknown worker type in the worker details view.
   */
  unknown: 'Unknown',
  /**
   * @description Prefix for the reporting endpoint in the security & isolation section of the worker details view.
   */
  reportingTo: 'reporting to',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/application/OpenedWindowDetailsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const booleanToYesNo = (b: boolean): Common.UIString.LocalizedString =>
    b ? i18nString(UIStrings.yes) : i18nString(UIStrings.no);

function linkifyIcon(iconType: string, title: string, eventHandler: () => (void|Promise<void>),
                     label?: LitTemplate): LitTemplate {
  // Disabled until https://crbug.com/1079231 is fixed.
  // clang-format off
  return html`
    <button class="devtools-link link-style text-button" title=${title}
        @click=${(event: Event) => {
          event.consume(true);
          void eventHandler();
        }}>${label ?? nothing}<devtools-icon class="icon-link devtools-link" name=${iconType}></devtools-icon>
    </button>`;
  // clang-format on
}

async function maybeCreateLinkToElementsPanel(opener: Protocol.Page.FrameId|SDK.ResourceTreeModel.ResourceTreeFrame|
                                              undefined): Promise<LitTemplate|null> {
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
  const label = html`<span>${`<${linkTargetDOMNode.nodeName().toLocaleLowerCase()}>`}</span>`;
  const linkElement = linkifyIcon('code-circle', i18nString(UIStrings.clickToOpenInElementsPanel),
                                  () => Common.Revealer.reveal(linkTargetDOMNode), label);
  // Disabled until https://crbug.com/1079231 is fixed.
  // clang-format off
  return html`
    <span
        @mouseenter=${() => {
          if (openerFrame) {
            void openerFrame.highlight();
          }
        }}
        @mouseleave=${() => {
          SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight(SDK.TargetManager.TargetManager.instance());
        }}>${linkElement}</span>`;
  // clang-format on
}

export interface OpenedWindowViewInput {
  title: string;
  url: string;
  openerElement: LitTemplate|null;
  canAccessOpener: boolean;
}

export type OpenedWindowView = (input: OpenedWindowViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_OPENED_WINDOW_VIEW: OpenedWindowView = (input, _output, target) => {
  // Disabled until https://crbug.com/1079231 is fixed.
  // clang-format off
  render(html`
    <style>${openedWindowDetailsViewStyles}</style>
    <devtools-report class="frame-details-report-container" .data=${{reportTitle: input.title}}>
      <devtools-report-section-header>${i18nString(UIStrings.document)}</devtools-report-section-header>
      <devtools-report-key>${i18nString(UIStrings.url)}</devtools-report-key>
      <devtools-report-value>
        <div class="text-ellipsis" title=${input.url}>${input.url}</div>
      </devtools-report-value>
      <devtools-report-divider></devtools-report-divider>
      <devtools-report-section-header>${i18nString(UIStrings.security)}</devtools-report-section-header>
      ${input.openerElement ? html`
        <devtools-report-key>${i18nString(UIStrings.openerFrame)}</devtools-report-key>
        <devtools-report-value>${input.openerElement}</devtools-report-value>
      ` : nothing}
      <devtools-report-key>${i18nString(UIStrings.accessToOpener)}</devtools-report-key>
      <devtools-report-value title=${i18nString(UIStrings.showsWhetherTheOpenedWindowIs)}>
        ${booleanToYesNo(input.canAccessOpener)}
      </devtools-report-value>
      <devtools-report-divider></devtools-report-divider>
    </devtools-report>
  `, target);
  // clang-format on
};

export class OpenedWindowDetailsView extends UI.Widget.VBox {
  private targetInfo: Protocol.Target.TargetInfo;
  private isWindowClosed: boolean;
  readonly #view: OpenedWindowView;

  constructor(targetInfo: Protocol.Target.TargetInfo, isWindowClosed: boolean,
              view: OpenedWindowView = DEFAULT_OPENED_WINDOW_VIEW) {
    super(undefined, {useShadowDom: true});
    this.targetInfo = targetInfo;
    this.isWindowClosed = isWindowClosed;
    this.#view = view;
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  override async performUpdate(signal?: AbortSignal): Promise<void> {
    const openerElement = await this.maybeDisplayOpenerFrame();
    if (signal?.aborted) {
      return;
    }
    this.#view({
      title: this.buildTitle(),
      url: this.targetInfo.url,
      openerElement,
      canAccessOpener: this.targetInfo.canAccessOpener,
    },
               undefined, this.contentElement);
  }

  private async maybeDisplayOpenerFrame(): Promise<LitTemplate|null> {
    return await maybeCreateLinkToElementsPanel(this.targetInfo.openerFrameId);
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
    this.requestUpdate();
  }

  setTargetInfo(targetInfo: Protocol.Target.TargetInfo): void {
    this.targetInfo = targetInfo;
    this.requestUpdate();
  }
}

export interface WorkerViewInput {
  title: string;
  url: string;
  workerType: string;
  coepPolicy?: Protocol.Network.CrossOriginEmbedderPolicyStatus|null;
}

export type WorkerView = (input: WorkerViewInput, output: undefined, target: HTMLElement) => void;

function renderCrossOriginPolicy(info: Protocol.Network.CrossOriginEmbedderPolicyStatus|null|undefined): LitTemplate {
  if (!info) {
    return nothing;
  }
  const isEnabled = (value: Protocol.Network.CrossOriginEmbedderPolicyValue): boolean =>
      value !== Protocol.Network.CrossOriginEmbedderPolicyValue.None;
  const enabled = isEnabled(info.value);
  const value = enabled ? info.value : info.reportOnlyValue;
  const endpoint = enabled ? info.reportingEndpoint : info.reportOnlyReportingEndpoint;

  // Disabled until https://crbug.com/1079231 is fixed.
  // clang-format off
  return html`${value}${!enabled && isEnabled(info.reportOnlyValue) ?
      html`<span class="inline-comment">report-only</span>` : nothing}${endpoint ?
      html`<span class="inline-name">${i18nString(UIStrings.reportingTo)}</span><span>${endpoint}</span>` : nothing}`;
  // clang-format on
}

export const DEFAULT_WORKER_VIEW: WorkerView = (input, _output, target) => {
  // Disabled until https://crbug.com/1079231 is fixed.
  // clang-format off
  render(html`
    <style>${openedWindowDetailsViewStyles}</style>
    <devtools-report class="frame-details-report-container" .data=${{reportTitle: input.title}}>
      <devtools-report-section-header>${i18nString(UIStrings.document)}</devtools-report-section-header>
      <devtools-report-key>${i18nString(UIStrings.url)}</devtools-report-key>
      <devtools-report-value>
        <div class="text-ellipsis" title=${input.url}>${input.url}</div>
      </devtools-report-value>
      <devtools-report-key>${i18nString(UIStrings.type)}</devtools-report-key>
      <devtools-report-value>${input.workerType}</devtools-report-value>
      <devtools-report-divider></devtools-report-divider>
      <devtools-report-section-header>${i18nString(UIStrings.securityIsolation)}</devtools-report-section-header>
      <devtools-report-key>${i18nString(UIStrings.crossoriginEmbedderPolicy)}</devtools-report-key>
      <devtools-report-value>
        ${renderCrossOriginPolicy(input.coepPolicy)}
      </devtools-report-value>
      <devtools-report-divider></devtools-report-divider>
    </devtools-report>
  `, target);
  // clang-format on
};

export class WorkerDetailsView extends UI.Widget.VBox {
  private readonly targetInfo: Protocol.Target.TargetInfo;
  readonly #view: WorkerView;

  constructor(targetInfo: Protocol.Target.TargetInfo, view: WorkerView = DEFAULT_WORKER_VIEW) {
    super(undefined, {useShadowDom: true});
    this.targetInfo = targetInfo;
    this.#view = view;
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
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

  private async updateCoopCoepStatus(): Promise<Protocol.Network.CrossOriginEmbedderPolicyStatus|null|undefined> {
    const target = SDK.TargetManager.TargetManager.instance().targetById(this.targetInfo.targetId);
    if (!target) {
      return null;
    }
    const model = target.model(SDK.NetworkManager.NetworkManager);
    const info = model && await model.getSecurityIsolationStatus(null);
    if (!info) {
      return null;
    }
    return info.coep;
  }

  override async performUpdate(signal?: AbortSignal): Promise<void> {
    const coepPolicy = await this.updateCoopCoepStatus();
    if (signal?.aborted) {
      return;
    }
    this.#view({
      title: this.targetInfo.title || this.targetInfo.url || i18nString(UIStrings.worker),
      url: this.targetInfo.url,
      workerType: this.workerTypeToString(this.targetInfo.type),
      coepPolicy,
    },
               undefined, this.contentElement);
  }
}
