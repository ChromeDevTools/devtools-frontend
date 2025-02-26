// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/expandable_list/expandable_list.js';
import '../../../ui/components/report_view/report_view.js';
import './StackTrace.js';

import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as Root from '../../../core/root/root.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Protocol from '../../../generated/protocol.js';
import * as Bindings from '../../../models/bindings/bindings.js';
import * as Workspace from '../../../models/workspace/workspace.js';
import * as NetworkForward from '../../../panels/network/forward/forward.js';
import * as CspEvaluator from '../../../third_party/csp_evaluator/csp_evaluator.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import type * as ExpandableList from '../../../ui/components/expandable_list/expandable_list.js';
import * as LegacyWrapper from '../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import type * as ReportView from '../../../ui/components/report_view/report_view.js';
import * as Components from '../../../ui/legacy/components/utils/utils.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import frameDetailsReportViewStylesRaw from './frameDetailsReportView.css.js';
import {OriginTrialTreeView} from './OriginTrialTreeView.js';
import {
  type PermissionsPolicySectionData,
  renderIconLink,
} from './PermissionsPolicySection.js';
import type {StackTraceData} from './StackTrace.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const frameDetailsReportViewStyles = new CSSStyleSheet();
frameDetailsReportViewStyles.replaceSync(frameDetailsReportViewStylesRaw.cssContent);

const {html} = Lit;

const UIStrings = {
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
   *@description A web URL (for a lot of languages this does not need to be translated, please translate only where necessary)
   */
  url: 'URL',
  /**
  /**
   *@description Title for a link to the Sources panel
   */
  clickToOpenInSourcesPanel: 'Click to open in Sources panel',
  /**
   *@description Title for a link to the Network panel
   */
  clickToOpenInNetworkPanel: 'Click to open in Network panel',
  /**
   *@description Title for unreachable URL field
   */
  unreachableUrl: 'Unreachable URL',
  /**
   *@description Title for a link that applies a filter to the network panel
   */
  clickToOpenInNetworkPanelMight: 'Click to open in Network panel (might require page reload)',
  /**
   *@description The origin of a URL (https://web.dev/same-site-same-origin/#origin)
   *(for a lot of languages this does not need to be translated, please translate only where necessary)
   */
  origin: 'Origin',
  /**
  /**
   *@description Related node label in Timeline UIUtils of the Performance panel
   */
  ownerElement: 'Owner Element',
  /**
   *@description Title for a link to the Elements panel
   */
  clickToOpenInElementsPanel: 'Click to open in Elements panel',
  /**
   *@description Title for ad frame type field
   */
  adStatus: 'Ad Status',
  /**
   *@description Description for ad frame type
   */
  rootDescription: 'This frame has been identified as the root frame of an ad',
  /**
   *@description Value for ad frame type
   */
  root: 'root',
  /**
   *@description Description for ad frame type
   */
  childDescription: 'This frame has been identified as a child frame of an ad',
  /**
   *@description Value for ad frame type
   */
  child: 'child',
  /**
   *@description Section header in the Frame Details view
   */
  securityIsolation: 'Security & Isolation',
  /**
   *@description Section header in the Frame Details view
   */
  contentSecurityPolicy: 'Content Security Policy (CSP)',
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
   *@description Label for whether a frame is cross-origin isolated
   *(https://developer.chrome.com/docs/extensions/mv3/cross-origin-isolation/)
   *(for a lot of languages this does not need to be translated, please translate only where necessary)
   */
  crossoriginIsolated: 'Cross-Origin Isolated',
  /**
   *@description Explanatory text in the Frame Details view
   */
  localhostIsAlwaysASecureContext: '`Localhost` is always a secure context',
  /**
   *@description Explanatory text in the Frame Details view
   */
  aFrameAncestorIsAnInsecure: 'A frame ancestor is an insecure context',
  /**
   *@description Explanatory text in the Frame Details view
   */
  theFramesSchemeIsInsecure: 'The frame\'s scheme is insecure',
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
   *@description Explanation of why cross-origin isolation is important
   *(https://web.dev/why-coop-coep/)
   *(for a lot of languages 'cross-origin isolation' does not need to be translated, please translate only where necessary)
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
      '`SharedArrayBuffer` constructor is available and `SABs` can be transferred via `postMessage`',
  /**
   *@description Tooltip for the SharedArrayBuffer availability status
   */
  sharedarraybufferConstructorIsAvailable:
      '`SharedArrayBuffer` constructor is available but `SABs` cannot be transferred via `postMessage`',
  /**
   *@description Explanation why SharedArrayBuffer will not be available in the future
   *(https://developer.chrome.com/docs/extensions/mv3/cross-origin-isolation/)
   *(for a lot of languages 'cross-origin isolation' does not need to be translated, please translate only where necessary)
   */
  willRequireCrossoriginIsolated: '⚠️ will require cross-origin isolated context in the future',
  /**
   *@description Explanation why SharedArrayBuffer is not available
   *(https://developer.chrome.com/docs/extensions/mv3/cross-origin-isolation/)
   *(for a lot of languages 'cross-origin isolation' does not need to be translated, please translate only where necessary).
   */
  requiresCrossoriginIsolated: 'requires cross-origin isolated context',
  /**
   *@description Explanation for the SharedArrayBuffer availability status in case the transfer of a SAB requires the
   * permission policy `cross-origin-isolated` to be enabled (e.g. because the message refers to the situation in an iframe).
   */
  transferRequiresCrossoriginIsolatedPermission:
      '`SharedArrayBuffer` transfer requires enabling the permission policy:',
  /**
   *@description Explanation for the Measure Memory availability status
   */
  available: 'available',
  /**
   *@description Tooltip for the Measure Memory availability status
   */
  thePerformanceAPI: 'The `performance.measureUserAgentSpecificMemory()` API is available',
  /**
   *@description Tooltip for the Measure Memory availability status
   */
  thePerformancemeasureuseragentspecificmemory:
      'The `performance.measureUserAgentSpecificMemory()` API is not available',
  /**
   *@description Entry in the API availability section of the frame details view
   */
  measureMemory: 'Measure Memory',
  /**
   *@description Text that is usually a hyperlink to more documentation
   */
  learnMore: 'Learn more',
  /**
   *@description Label for a stack trace. If a frame is created programmatically (i.e. via JavaScript), there is a
   * stack trace for the line of code which caused the creation of the iframe. This is the stack trace we are showing here.
   */
  creationStackTrace: 'Frame Creation `Stack Trace`',
  /**
   *@description Tooltip for 'Frame Creation Stack Trace' explaining that the stack
   *trace shows where in the code the frame has been created programmatically
   */
  creationStackTraceExplanation:
      'This frame was created programmatically. The `stack trace` shows where this happened.',
  /**
   *@description Text descripting why a frame has been indentified as an advertisement.
   */
  parentIsAdExplanation: 'This frame is considered an ad frame because its parent frame is an ad frame.',
  /**
   *@description Text descripting why a frame has been indentified as an advertisement.
   */
  matchedBlockingRuleExplanation:
      'This frame is considered an ad frame because its current (or previous) main document is an ad resource.',
  /**
   *@description Text descripting why a frame has been indentified as an advertisement.
   */
  createdByAdScriptExplanation:
      'There was an ad script in the `(async) stack` when this frame was created. Examining the creation `stack trace` of this frame might provide more insight.',
  /**
   *@description Label for a link to an ad script, which created the current iframe.
   */
  creatorAdScript: 'Creator Ad Script',
  /**
   *@description Text describing the absence of a value.
   */
  none: 'None',
  /**
   *@description Explanation of what origin trials are
   *(https://developer.chrome.com/docs/web-platform/origin-trials/)
   *(please don't translate 'origin trials').
   */
  originTrialsExplanation: 'Origin trials give you access to a new or experimental feature.',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/application/components/FrameDetailsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface FrameDetailsReportViewData {
  frame: SDK.ResourceTreeModel.ResourceTreeFrame;
  target?: SDK.Target.Target;
  adScriptId: Protocol.Page.AdScriptId|null;
}

export class FrameDetailsReportView extends LegacyWrapper.LegacyWrapper.WrappableComponent {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #frame?: SDK.ResourceTreeModel.ResourceTreeFrame;
  #target?: SDK.Target.Target;
  #protocolMonitorExperimentEnabled = false;
  #permissionsPolicies: Promise<Protocol.Page.PermissionsPolicyFeatureState[]|null>|null = null;
  #permissionsPolicySectionData: PermissionsPolicySectionData = {policies: [], showDetails: false};
  #originTrialTreeView: OriginTrialTreeView = new OriginTrialTreeView();
  #linkifier = new Components.Linkifier.Linkifier();
  #adScriptId: Protocol.Page.AdScriptId|null = null;

  constructor(frame: SDK.ResourceTreeModel.ResourceTreeFrame) {
    super();
    this.#frame = frame;
    void this.render();
  }

  connectedCallback(): void {
    this.parentElement?.classList.add('overflow-auto');
    this.#protocolMonitorExperimentEnabled = Root.Runtime.experiments.isEnabled('protocol-monitor');
    this.#shadow.adoptedStyleSheets = [frameDetailsReportViewStyles];
  }

  override async render(): Promise<void> {
    this.#adScriptId = (await this.#frame?.parentFrame()?.getAdScriptId(this.#frame?.id)) || null;
    const debuggerModel = this.#adScriptId?.debuggerId ?
        await SDK.DebuggerModel.DebuggerModel.modelForDebuggerId(this.#adScriptId?.debuggerId) :
        null;
    this.#target = debuggerModel?.target();
    if (!this.#permissionsPolicies && this.#frame) {
      this.#permissionsPolicies = this.#frame.getPermissionsPolicyState();
    }
    await RenderCoordinator.write('FrameDetailsView render', () => {
      if (!this.#frame) {
        return;
      }

      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      Lit.render(html`
        <devtools-report .data=${{reportTitle: this.#frame.displayName()} as ReportView.ReportView.ReportData}
        jslog=${VisualLogging.pane('frames')}>
          ${this.#renderDocumentSection()}
          ${this.#renderIsolationSection()}
          ${this.#renderApiAvailabilitySection()}
          ${this.#renderOriginTrial()}
          ${Lit.Directives.until(this.#permissionsPolicies?.then(policies => {
            this.#permissionsPolicySectionData.policies = policies || [];
            return html`
              <devtools-resources-permissions-policy-section
                .data=${this.#permissionsPolicySectionData}
              >
              </devtools-resources-permissions-policy-section>
            `;
          }), Lit.nothing)}
          ${this.#protocolMonitorExperimentEnabled ? this.#renderAdditionalInfoSection() : Lit.nothing}
        </devtools-report>
      `, this.#shadow, {host: this});
      // clang-format on
    });
  }

  #renderOriginTrial(): Lit.LitTemplate {
    if (!this.#frame) {
      return Lit.nothing;
    }

    this.#originTrialTreeView.classList.add('span-cols');

    void this.#frame.getOriginTrials().then(trials => {
      this.#originTrialTreeView.data = {trials};
    });

    // clang-format off
    return html`
    <devtools-report-section-header>${i18n.i18n.lockedString('Origin trials')}</devtools-report-section-header>
    <div class="span-cols">
        ${i18nString(UIStrings.originTrialsExplanation)}
        <x-link href="https://developer.chrome.com/docs/web-platform/origin-trials/" class="link"
        jslog=${VisualLogging.link('learn-more.origin-trials').track({click: true})}>${i18nString(UIStrings.learnMore)}</x-link>
    </div>
    ${this.#originTrialTreeView}
    <devtools-report-divider></devtools-report-divider>
    `;
    // clang-format on
  }

  #renderDocumentSection(): Lit.LitTemplate {
    if (!this.#frame) {
      return Lit.nothing;
    }

    return html`
      <devtools-report-section-header>${i18nString(UIStrings.document)}</devtools-report-section-header>
      <devtools-report-key>${i18nString(UIStrings.url)}</devtools-report-key>
      <devtools-report-value>
        <div class="inline-items">
          ${this.#maybeRenderSourcesLinkForURL()}
          ${this.#maybeRenderNetworkLinkForURL()}
          <div class="text-ellipsis" title=${this.#frame.url}>${this.#frame.url}</div>
        </div>
      </devtools-report-value>
      ${this.#maybeRenderUnreachableURL()}
      ${this.#maybeRenderOrigin()}
      ${Lit.Directives.until(this.#renderOwnerElement(), Lit.nothing)}
      ${this.#maybeRenderCreationStacktrace()}
      ${this.#maybeRenderAdStatus()}
      <devtools-report-divider></devtools-report-divider>
    `;
  }

  #maybeRenderSourcesLinkForURL(): Lit.LitTemplate {
    if (!this.#frame || this.#frame.unreachableUrl()) {
      return Lit.nothing;
    }
    const sourceCode = this.#uiSourceCodeForFrame(this.#frame);
    return renderIconLink(
        'breakpoint-circle',
        i18nString(UIStrings.clickToOpenInSourcesPanel),
        () => Common.Revealer.reveal(sourceCode),
        'reveal-in-sources',
    );
  }

  #maybeRenderNetworkLinkForURL(): Lit.LitTemplate {
    if (this.#frame) {
      const resource = this.#frame.resourceForURL(this.#frame.url);
      if (resource?.request) {
        const request = resource.request;
        return renderIconLink('arrow-up-down-circle', i18nString(UIStrings.clickToOpenInNetworkPanel), () => {
          const requestLocation = NetworkForward.UIRequestLocation.UIRequestLocation.tab(
              request, NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT);
          return Common.Revealer.reveal(requestLocation);
        }, 'reveal-in-network');
      }
    }
    return Lit.nothing;
  }

  #uiSourceCodeForFrame(frame: SDK.ResourceTreeModel.ResourceTreeFrame): Workspace.UISourceCode.UISourceCode|null {
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

  #maybeRenderUnreachableURL(): Lit.LitTemplate {
    if (!this.#frame || !this.#frame.unreachableUrl()) {
      return Lit.nothing;
    }
    return html`
      <devtools-report-key>${i18nString(UIStrings.unreachableUrl)}</devtools-report-key>
      <devtools-report-value>
        <div class="inline-items">
          ${this.#renderNetworkLinkForUnreachableURL()}
          <div class="text-ellipsis" title=${this.#frame.unreachableUrl()}>${this.#frame.unreachableUrl()}</div>
        </div>
      </devtools-report-value>
    `;
  }

  #renderNetworkLinkForUnreachableURL(): Lit.LitTemplate {
    if (this.#frame) {
      const unreachableUrl = Common.ParsedURL.ParsedURL.fromString(this.#frame.unreachableUrl());
      if (unreachableUrl) {
        return renderIconLink(
            'arrow-up-down-circle',
            i18nString(UIStrings.clickToOpenInNetworkPanelMight),
            ():
                void => {
                  void Common.Revealer.reveal(NetworkForward.UIFilter.UIRequestFilter.filters([
                    {
                      filterType: NetworkForward.UIFilter.FilterType.Domain,
                      filterValue: unreachableUrl.domain(),
                    },
                    {
                      filterType: null,
                      filterValue: unreachableUrl.path,
                    },
                  ]));
                },
            'unreachable-url.reveal-in-network',
        );
      }
    }
    return Lit.nothing;
  }

  #maybeRenderOrigin(): Lit.LitTemplate {
    if (this.#frame && this.#frame.securityOrigin && this.#frame.securityOrigin !== '://') {
      return html`
        <devtools-report-key>${i18nString(UIStrings.origin)}</devtools-report-key>
        <devtools-report-value>
          <div class="text-ellipsis" title=${this.#frame.securityOrigin}>${this.#frame.securityOrigin}</div>
        </devtools-report-value>
      `;
    }
    return Lit.nothing;
  }

  async #renderOwnerElement(): Promise<Lit.LitTemplate> {
    if (this.#frame) {
      const linkTargetDOMNode = await this.#frame.getOwnerDOMNodeOrDocument();
      if (linkTargetDOMNode) {
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        return html`
          <devtools-report-key>${i18nString(UIStrings.ownerElement)}</devtools-report-key>
          <devtools-report-value class="without-min-width">
            <div class="inline-items">
              <button class="link text-link" role="link" tabindex=0 title=${i18nString(UIStrings.clickToOpenInElementsPanel)}
                @mouseenter=${() => this.#frame?.highlight()}
                @mouseleave=${() => SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight()}
                @click=${() => Common.Revealer.reveal(linkTargetDOMNode)}
                jslog=${VisualLogging.action('reveal-in-elements').track({click: true})}
              >
                &lt;${linkTargetDOMNode.nodeName().toLocaleLowerCase()}&gt;
              </button>
            </div>
          </devtools-report-value>
        `;
        // clang-format on
      }
    }
    return Lit.nothing;
  }

  #maybeRenderCreationStacktrace(): Lit.LitTemplate {
    const creationStackTraceData = this.#frame?.getCreationStackTraceData();
    if (creationStackTraceData?.creationStackTrace) {
      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      return html`
        <devtools-report-key title=${i18nString(UIStrings.creationStackTraceExplanation)}>${
          i18nString(UIStrings.creationStackTrace)}</devtools-report-key>
        <devtools-report-value
        jslog=${VisualLogging.section('frame-creation-stack-trace')}
        >
          <devtools-resources-stack-trace .data=${{
            frame: this.#frame,
            buildStackTraceRows: Components.JSPresentationUtils.buildStackTraceRows,
          } as StackTraceData}>
          </devtools-resources-stack-trace>
        </devtools-report-value>
      `;
      // clang-format on
    }
    return Lit.nothing;
  }

  #getAdFrameTypeStrings(type: Protocol.Page.AdFrameType.Child|Protocol.Page.AdFrameType.Root):
      {value: Platform.UIString.LocalizedString, description: Platform.UIString.LocalizedString} {
    switch (type) {
      case Protocol.Page.AdFrameType.Child:
        return {value: i18nString(UIStrings.child), description: i18nString(UIStrings.childDescription)};
      case Protocol.Page.AdFrameType.Root:
        return {value: i18nString(UIStrings.root), description: i18nString(UIStrings.rootDescription)};
    }
  }

  #getAdFrameExplanationString(explanation: Protocol.Page.AdFrameExplanation): Platform.UIString.LocalizedString {
    switch (explanation) {
      case Protocol.Page.AdFrameExplanation.CreatedByAdScript:
        return i18nString(UIStrings.createdByAdScriptExplanation);
      case Protocol.Page.AdFrameExplanation.MatchedBlockingRule:
        return i18nString(UIStrings.matchedBlockingRuleExplanation);
      case Protocol.Page.AdFrameExplanation.ParentIsAd:
        return i18nString(UIStrings.parentIsAdExplanation);
    }
  }

  #maybeRenderAdStatus(): Lit.LitTemplate {
    if (!this.#frame) {
      return Lit.nothing;
    }
    const adFrameType = this.#frame.adFrameType();
    if (adFrameType === Protocol.Page.AdFrameType.None) {
      return Lit.nothing;
    }
    const typeStrings = this.#getAdFrameTypeStrings(adFrameType);
    const rows = [html`<div title=${typeStrings.description}>${typeStrings.value}</div>`];
    for (const explanation of this.#frame.adFrameStatus()?.explanations || []) {
      rows.push(html`<div>${this.#getAdFrameExplanationString(explanation)}</div>`);
    }

    const adScriptLinkElement = this.#target ? this.#linkifier.linkifyScriptLocation(
                                                   this.#target, this.#adScriptId?.scriptId || null,
                                                   Platform.DevToolsPath.EmptyUrlString, undefined, undefined) :
                                               null;

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <devtools-report-key>${i18nString(UIStrings.adStatus)}</devtools-report-key>
      <devtools-report-value
      jslog=${VisualLogging.section('ad-status')}>
        <devtools-expandable-list .data=${
          {rows, title: i18nString(UIStrings.adStatus)} as ExpandableList.ExpandableList.ExpandableListData}></devtools-expandable-list></devtools-report-value>
      ${this.#target ? html`
        <devtools-report-key>${i18nString(UIStrings.creatorAdScript)}</devtools-report-key>
        <devtools-report-value class="ad-script-link">${adScriptLinkElement?.setAttribute('jslog', `${VisualLogging.link('ad-script').track({click: true})}`)}</devtools-report-value>
      ` : Lit.nothing}
    `;
    // clang-format on
  }

  #renderIsolationSection(): Lit.LitTemplate {
    if (!this.#frame) {
      return Lit.nothing;
    }
    return html`
      <devtools-report-section-header>${i18nString(UIStrings.securityIsolation)}</devtools-report-section-header>
      <devtools-report-key>${i18nString(UIStrings.secureContext)}</devtools-report-key>
      <devtools-report-value>
        ${this.#frame.isSecureContext() ? i18nString(UIStrings.yes) : i18nString(UIStrings.no)}\xA0${
        this.#maybeRenderSecureContextExplanation()}
      </devtools-report-value>
      <devtools-report-key>${i18nString(UIStrings.crossoriginIsolated)}</devtools-report-key>
      <devtools-report-value>
        ${this.#frame.isCrossOriginIsolated() ? i18nString(UIStrings.yes) : i18nString(UIStrings.no)}
      </devtools-report-value>
      ${Lit.Directives.until(this.#maybeRenderCoopCoepCSPStatus(), Lit.nothing)}
      <devtools-report-divider></devtools-report-divider>
    `;
  }

  #maybeRenderSecureContextExplanation(): Lit.LitTemplate {
    const explanation = this.#getSecureContextExplanation();
    if (explanation) {
      return html`<span class="inline-comment">${explanation}</span>`;
    }
    return Lit.nothing;
  }

  #getSecureContextExplanation(): Platform.UIString.LocalizedString|null {
    switch (this.#frame?.getSecureContextType()) {
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

  async #maybeRenderCoopCoepCSPStatus(): Promise<Lit.LitTemplate> {
    if (this.#frame) {
      const model = this.#frame.resourceTreeModel().target().model(SDK.NetworkManager.NetworkManager);
      const info = model && await model.getSecurityIsolationStatus(this.#frame.id);
      if (info) {
        return html`
          ${
            this.#maybeRenderCrossOriginStatus(
                info.coep, i18n.i18n.lockedString('Cross-Origin Embedder Policy (COEP)'),
                Protocol.Network.CrossOriginEmbedderPolicyValue.None)}
          ${
            this.#maybeRenderCrossOriginStatus(
                info.coop, i18n.i18n.lockedString('Cross-Origin Opener Policy (COOP)'),
                Protocol.Network.CrossOriginOpenerPolicyValue.UnsafeNone)}
          ${this.#renderCSPSection(info.csp)}
        `;
      }
    }
    return Lit.nothing;
  }

  #maybeRenderCrossOriginStatus(
      info: Protocol.Network.CrossOriginEmbedderPolicyStatus|Protocol.Network.CrossOriginOpenerPolicyStatus|undefined,
      policyName: string,
      noneValue: Protocol.Network.CrossOriginEmbedderPolicyValue|
      Protocol.Network.CrossOriginOpenerPolicyValue): Lit.LitTemplate {
    if (!info) {
      return Lit.nothing;
    }
    const isEnabled = info.value !== noneValue;
    const isReportOnly = (!isEnabled && info.reportOnlyValue !== noneValue);
    const endpoint = isEnabled ? info.reportingEndpoint : info.reportOnlyReportingEndpoint;
    return html`
      <devtools-report-key>${policyName}</devtools-report-key>
      <devtools-report-value>
        ${isEnabled ? info.value : info.reportOnlyValue}
        ${isReportOnly ? html`<span class="inline-comment">report-only</span>` : Lit.nothing}
        ${
        endpoint ? html`<span class="inline-name">${i18nString(UIStrings.reportingTo)}</span>${endpoint}` : Lit.nothing}
      </devtools-report-value>
    `;
  }

  #renderEffectiveDirectives(directives: string): Lit.LitTemplate[] {
    const parsedDirectives = new CspEvaluator.CspParser.CspParser(directives).csp.directives;
    const result = [];
    for (const directive in parsedDirectives) {
      result.push(
          html`<div><span class="bold">${directive}</span>${': ' + parsedDirectives[directive]?.join(', ')}</div>`);
    }
    return result;
  }

  #renderSingleCSP(cspInfo: Protocol.Network.ContentSecurityPolicyStatus): Lit.LitTemplate {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <devtools-report-key>${
        cspInfo.isEnforced ? i18n.i18n.lockedString('Content-Security-Policy') :
          html`${
            i18n.i18n.lockedString('Content-Security-Policy-Report-Only')
          }<devtools-button
          .iconName=${'help'}
          class='help-button'
          .variant=${Buttons.Button.Variant.ICON}
          .size=${Buttons.Button.Size.SMALL}
          @click=${()=> {window.location.href = 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy-Report-Only';}}
          jslog=${VisualLogging.link('learn-more.csp-report-only').track({click: true})}
          ></devtools-button>`
        }
      </devtools-report-key>
      <devtools-report-value>
        ${cspInfo.source === Protocol.Network.ContentSecurityPolicySource.HTTP ? i18n.i18n.lockedString('HTTP header') : i18n.i18n.lockedString('Meta tag')}
        ${this.#renderEffectiveDirectives(cspInfo.effectiveDirectives)}
      </devtools-report-value>
    `;
    // clang-format on
  }

  #renderCSPSection(cspInfos: Protocol.Network.ContentSecurityPolicyStatus[]|undefined): Lit.LitTemplate {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <devtools-report-divider></devtools-report-divider>
      <devtools-report-section-header>
        ${i18nString(UIStrings.contentSecurityPolicy)}
      </devtools-report-section-header>
      ${(cspInfos?.length) ? cspInfos.map(cspInfo => this.#renderSingleCSP(cspInfo)) : html`
        <devtools-report-key>${
          i18n.i18n.lockedString('Content-Security-Policy')}</devtools-report-key>
        <devtools-report-value>
          ${i18nString(UIStrings.none)}
        </devtools-report-value>
      `}
    `;
    // clang-format on
  }

  #renderApiAvailabilitySection(): Lit.LitTemplate {
    if (!this.#frame) {
      return Lit.nothing;
    }

    return html`
      <devtools-report-section-header>${i18nString(UIStrings.apiAvailability)}</devtools-report-section-header>
      <div class="span-cols">
        ${i18nString(UIStrings.availabilityOfCertainApisDepends)}
        <x-link href="https://web.dev/why-coop-coep/" class="link" jslog=${
        VisualLogging.link('learn-more.coop-coep').track({click: true})}>${i18nString(UIStrings.learnMore)}</x-link>
      </div>
      ${this.#renderSharedArrayBufferAvailability()}
      ${this.#renderMeasureMemoryAvailability()}
      <devtools-report-divider></devtools-report-divider>
    `;
  }

  #renderSharedArrayBufferAvailability(): Lit.LitTemplate {
    if (this.#frame) {
      const features = this.#frame.getGatedAPIFeatures();
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

        function renderHint(frame: SDK.ResourceTreeModel.ResourceTreeFrame): Lit.LitTemplate {
          switch (frame.getCrossOriginIsolatedContextType()) {
            case Protocol.Page.CrossOriginIsolatedContextType.Isolated:
              return Lit.nothing;
            case Protocol.Page.CrossOriginIsolatedContextType.NotIsolated:
              if (sabAvailable) {
                return html`<span class="inline-comment">${
                    i18nString(UIStrings.willRequireCrossoriginIsolated)}</span>`;
              }
              return html`<span class="inline-comment">${i18nString(UIStrings.requiresCrossoriginIsolated)}</span>`;
            case Protocol.Page.CrossOriginIsolatedContextType.NotIsolatedFeatureDisabled:
              if (!sabTransferAvailable) {
                return html`<span class="inline-comment">${
                    i18nString(
                        UIStrings
                            .transferRequiresCrossoriginIsolatedPermission)} <code>cross-origin-isolated</code></span>`;
              }
              break;
          }
          return Lit.nothing;
        }

        // SharedArrayBuffer is an API name, so we don't translate it.
        return html`
          <devtools-report-key>SharedArrayBuffers</devtools-report-key>
          <devtools-report-value title=${tooltipText}>
            ${availabilityText}\xA0${renderHint(this.#frame)}
          </devtools-report-value>
        `;
      }
    }
    return Lit.nothing;
  }

  #renderMeasureMemoryAvailability(): Lit.LitTemplate {
    if (this.#frame) {
      const measureMemoryAvailable = this.#frame.isCrossOriginIsolated();
      const availabilityText =
          measureMemoryAvailable ? i18nString(UIStrings.available) : i18nString(UIStrings.unavailable);
      const tooltipText = measureMemoryAvailable ? i18nString(UIStrings.thePerformanceAPI) :
                                                   i18nString(UIStrings.thePerformancemeasureuseragentspecificmemory);
      return html`
        <devtools-report-key>${i18nString(UIStrings.measureMemory)}</devtools-report-key>
        <devtools-report-value>
          <span title=${tooltipText}>${
          availabilityText}</span>\xA0<x-link class="link" href="https://web.dev/monitor-total-page-memory-usage/" jslog=${
          VisualLogging.link('learn-more.monitor-memory-usage').track({click: true})}>${
          i18nString(UIStrings.learnMore)}</x-link>
        </devtools-report-value>
      `;
    }
    return Lit.nothing;
  }

  #renderAdditionalInfoSection(): Lit.LitTemplate {
    if (!this.#frame) {
      return Lit.nothing;
    }

    return html`
      <devtools-report-section-header
        title=${i18nString(UIStrings.thisAdditionalDebugging)}
      >${i18nString(UIStrings.additionalInformation)}</devtools-report-section-header>
      <devtools-report-key>${i18nString(UIStrings.frameId)}</devtools-report-key>
      <devtools-report-value>
        <div class="text-ellipsis" title=${this.#frame.id}>${this.#frame.id}</div>
      </devtools-report-value>
      <devtools-report-divider></devtools-report-divider>
    `;
  }
}

customElements.define('devtools-resources-frame-details-view', FrameDetailsReportView);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-resources-frame-details-view': FrameDetailsReportView;
  }
}
