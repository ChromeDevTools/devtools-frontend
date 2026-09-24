// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/kit/kit.js';
import '../../ui/components/expandable_list/expandable_list.js';
import '../../ui/components/report_view/report_view.js';

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import type * as StackTrace from '../../models/stack_trace/stack_trace.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as PanelCommon from '../../panels/common/common.js';
import * as NetworkForward from '../../panels/network/forward/forward.js';
import * as CspEvaluator from '../../third_party/csp_evaluator/csp_evaluator.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import type * as ExpandableList from '../../ui/components/expandable_list/expandable_list.js';
import type * as ReportView from '../../ui/components/report_view/report_view.js';
import * as UIHelpers from '../../ui/helpers/helpers.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, type LitTemplate, nothing, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import * as ApplicationComponents from './components/components.js';
import frameDetailsReportViewStyles from './frameDetailsReportView.css.js';
import {OriginTrialTreeView} from './OriginTrialTreeView.js';

const {widget} = UI.Widget;

const UIStrings = {
  /**
   * @description Section header for debugging information in the frame details view.
   */
  additionalInformation: 'More information',
  /**
   * @description Explanation for why the debugging information section is shown in the frame details view.
   */
  thisAdditionalDebugging: 'This debugging information is shown because the "Protocol Monitor" experiment is enabled',
  /**
   * @description Field label for the frame ID in the frame details view.
   */
  frameId: 'Frame ID',
  /**
   * @description Section header for document details in the frame details view.
   */
  document: 'Document',
  /**
   * @description Field label for the URL in the frame details view.
   */
  url: 'URL',
  /**
   * @description Tooltip for the button to open the URL in the Sources panel.
   */
  clickToOpenInSourcesPanel: 'Click to open in Sources panel',
  /**
   * @description Tooltip for the button to open the URL in the Network panel.
   */
  clickToOpenInNetworkPanel: 'Click to open in Network panel',
  /**
   * @description Field label for an unreachable URL in the frame details view.
   */
  unreachableUrl: 'Unreachable URL',
  /**
   * @description Tooltip for the button to filter by frame in the Network panel.
   */
  clickToOpenInNetworkPanelMight: 'Click to open in Network panel (might require page reload)',
  /**
   * @description Field label for the origin of a URL in the frame details view.
   */
  origin: 'Origin',
  /**
   * @description Field label for the owner DOM element of the frame in the frame details view.
   */
  ownerElement: 'Owner element',
  /**
   * @description Field label for the ad status in the frame details view.
   */
  adStatus: 'Ad status',
  /**
   * @description Description explaining that this frame is the root frame of an ad in the frame details view.
   */
  rootDescription: 'This frame has been identified as the root frame of an ad',
  /**
   * @description Value for the root ad frame type in the frame details view.
   */
  root: 'root',
  /**
   * @description Description explaining that this frame is a child frame of an ad in the frame details view.
   */
  childDescription: 'This frame has been identified as a child frame of an ad',
  /**
   * @description Value for the child ad frame type in the frame details view.
   */
  child: 'child',
  /**
   * @description Section header for security and isolation in the frame details view.
   */
  securityIsolation: 'Security & isolation',
  /**
   * @description Section header for Content Security Policy in the frame details view.
   */
  contentSecurityPolicy: 'Content Security Policy (CSP)',
  /**
   * @description Field label indicating whether the frame is a secure context in the frame details view.
   */
  secureContext: 'Secure context',
  /**
   * @description Value indicating affirmative status in the frame details view.
   */
  yes: 'Yes',
  /**
   * @description Value indicating negative status in the frame details view.
   */
  no: 'No',
  /**
   * @description Field label indicating whether the frame is cross-origin isolated in the frame details view.
   */
  crossoriginIsolated: 'Cross-origin isolated',
  /**
   * @description Explanatory text indicating that localhost is always a secure context in the frame details view.
   */
  localhostIsAlwaysASecureContext: '`Localhost` is always a secure context',
  /**
   * @description Explanatory text indicating that a frame ancestor is an insecure context in the frame details view.
   */
  aFrameAncestorIsAnInsecure: 'A frame ancestor is an insecure context',
  /**
   * @description Explanatory text indicating that the frame's scheme is insecure in the frame details view.
   */
  theFramesSchemeIsInsecure: 'The frame’s scheme is insecure',
  /**
   * @description Label prefix for the reporting endpoint in the security & isolation section of the frame details view.
   */
  reportingTo: 'reporting to',
  /**
   * @description Section header for API availability in the frame details view.
   */
  apiAvailability: 'API availability',
  /**
   * @description Explanation of why cross-origin isolation is needed for certain APIs in the frame details view.
   */
  availabilityOfCertainApisDepends: 'Availability of certain APIs depends on the document being cross-origin isolated',
  /**
   * @description Status indicating that SharedArrayBuffer is available and transferable in the frame details view.
   */
  availableTransferable: 'available, transferable',
  /**
   * @description Status indicating that SharedArrayBuffer is available but not transferable in the frame details view.
   */
  availableNotTransferable: 'available, not transferable',
  /**
   * @description Status indicating that a feature is unavailable in the frame details view.
   */
  unavailable: 'unavailable',
  /**
   * @description Tooltip explaining that the SharedArrayBuffer constructor is available and SABs can be transferred via postMessage in the frame details view.
   */
  sharedarraybufferConstructorIs:
      '`SharedArrayBuffer` constructor is available and `SABs` can be transferred via `postMessage`',
  /**
   * @description Tooltip explaining that the SharedArrayBuffer constructor is available but SABs cannot be transferred via postMessage in the frame details view.
   */
  sharedarraybufferConstructorIsAvailable:
      '`SharedArrayBuffer` constructor is available but `SABs` can’t be transferred via `postMessage`',
  /**
   * @description Warning indicating that a feature will require a cross-origin isolated context in the future in the frame details view.
   */
  willRequireCrossoriginIsolated: '⚠️ will require cross-origin isolated context in the future',
  /**
   * @description Status explanation indicating that a feature requires a cross-origin isolated context in the frame details view.
   */
  requiresCrossoriginIsolated: 'requires cross-origin isolated context',
  /**
   * @description Explanation that SharedArrayBuffer transfer requires enabling the permission policy in the frame details view.
   */
  transferRequiresCrossoriginIsolatedPermission:
      '`SharedArrayBuffer` transfer requires enabling the permission policy:',
  /**
   * @description Status indicating that a feature is available in the frame details view.
   */
  available: 'available',
  /**
   * @description Tooltip indicating that the performance.measureUserAgentSpecificMemory() API is available in the frame details view.
   */
  thePerformanceAPI: 'The `performance.measureUserAgentSpecificMemory()` API is available',
  /**
   * @description Tooltip indicating that the performance.measureUserAgentSpecificMemory() API is not available in the frame details view.
   */
  thePerformancemeasureuseragentspecificmemory:
      'The `performance.measureUserAgentSpecificMemory()` API isn’t available',
  /**
   * @description Field label for the measure memory API in the frame details view.
   */
  measureMemory: 'Measure memory',
  /**
   * @description Link text to open documentation in the frame details view.
   */
  learnMore: 'Learn more',
  /**
   * @description Field label for the stack trace showing where the frame was created in the frame details view.
   */
  creationStackTrace: 'Frame creation `stack trace`',
  /**
   * @description Tooltip explaining that the stack trace shows where the frame was created in the frame details view.
   */
  creationStackTraceExplanation:
      'This frame was created programmatically. The `stack trace` shows where this happened.',
  /**
   * @description Tooltip explaining that this frame is considered an ad because its parent frame is an ad in the frame details view.
   */
  parentIsAdExplanation: 'This frame is considered an ad frame because its parent frame is an ad frame',
  /**
   * @description Tooltip explaining that this frame is considered an ad because its main document is an ad resource in the frame details view.
   */
  matchedBlockingRuleExplanation:
      'This frame is considered an ad frame because its current (or previous) main document is an ad resource',
  /**
   * @description Tooltip explaining that this frame is considered an ad because an ad script was in the stack when it was created in the frame details view.
   */
  createdByAdScriptExplanation:
      'An ad script was in the `(async) stack` when this frame was created. Examining the creation `stack trace` of this frame might provide more insight.',
  /**
   * @description Field label for the ad script ancestry that led to the frame creation in the frame details view.
   */
  creatorAdScriptAncestry: 'Creator ad script ancestry',
  /**
   * @description Field label for the filterlist rule that identified the root script as an ad in the frame details view.
   */
  rootScriptFilterlistRule: 'Root script filterlist rule',
  /**
   * @description Value indicating the absence of a value in the frame details view.
   */
  none: 'None',
  /**
   * @description Explanation of origin trials in the origin trials section of the frame details view.
   */
  originTrialsExplanation: 'Origin trials give you access to a new or experimental feature',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/application/FrameDetailsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface FrameDetailsReportViewData {
  frame: SDK.ResourceTreeModel.ResourceTreeFrame;
  target?: SDK.Target.Target;
  adScriptAncestry: Protocol.Network.AdAncestry|null;
}

export interface FrameDetailsViewInput {
  frame: SDK.ResourceTreeModel.ResourceTreeFrame;
  target: SDK.Target.Target|null;
  creationStackTrace: StackTrace.StackTrace.StackTrace|null;
  adScriptAncestry: Protocol.Network.AdAncestry|null;
  linkTargetDOMNode: SDK.DOMModel.DOMNode|null;
  permissionsPolicies: Protocol.Page.PermissionsPolicyFeatureState[]|null;
  protocolMonitorExperimentEnabled: boolean;
  trials: Protocol.Page.OriginTrial[]|null;
  securityIsolationInfo: Protocol.Network.SecurityIsolationStatus|null;
  onRevealInNetwork?: () => void;
  onRevealInSources: () => void;
}

export type View = (input: FrameDetailsViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  if (!input.frame) {
    return;
  }
  // clang-format off
  render(html`
    <style>${frameDetailsReportViewStyles}</style>
    <devtools-report .data=${{reportTitle: input.frame.displayName()} as ReportView.ReportView.ReportData}
    jslog=${VisualLogging.pane('frames')}>
      ${renderDocumentSection(input)}
      ${renderIsolationSection(input)}
      ${renderApiAvailabilitySection(input.frame)}
      ${renderOriginTrial(input.trials)}
      ${input.permissionsPolicies ?
          widget(ApplicationComponents.PermissionsPolicySection.PermissionsPolicySection, {
             policies: input.permissionsPolicies,
             showDetails: false}) : nothing}
      ${input.protocolMonitorExperimentEnabled ? renderAdditionalInfoSection(input.frame) : nothing}
    </devtools-report>
  `, target);
  // clang-format on
};

function renderOriginTrial(trials: Protocol.Page.OriginTrial[]|null): LitTemplate {
  if (!trials) {
    return nothing;
  }

  const data = {trials};
  // clang-format off
  return html`
    <devtools-report-section-header>
      ${i18n.i18n.lockedString('Origin trials')}
    </devtools-report-section-header>
    <devtools-report-section>
      <span class="report-section">
        ${i18nString(UIStrings.originTrialsExplanation)}
        <devtools-link href="https://developer.chrome.com/docs/web-platform/origin-trials/" class="link"
                jslogcontext="learn-more.origin-trials">
          ${i18nString(UIStrings.learnMore)}
        </devtools-link>
      </span>
    </devtools-report-section>
    <devtools-widget class="span-cols" ${widget(OriginTrialTreeView, {data})}>
    </devtools-widget>
    <devtools-report-divider></devtools-report-divider>`;
  // clang-format on
}

function renderDocumentSection(input: FrameDetailsViewInput): LitTemplate {
  if (!input.frame) {
    return nothing;
  }

  // clang-format off
  return html`
      <devtools-report-section-header>${i18nString(UIStrings.document)}</devtools-report-section-header>
      <devtools-report-key>${i18nString(UIStrings.url)}</devtools-report-key>
      <devtools-report-value>
        <div class="inline-items">
          ${!input.frame?.unreachableUrl() ? renderSourcesLinkForURL(input.onRevealInSources) : nothing}
          ${input.onRevealInNetwork ? renderNetworkLinkForURL(input.onRevealInNetwork) : nothing}
          <div class="text-ellipsis" title=${input.frame.url}>${input.frame.url}</div>
        </div>
      </devtools-report-value>
      ${maybeRenderUnreachableURL(input.frame?.unreachableUrl())}
      ${maybeRenderOrigin(input.frame?.securityOrigin())}
      ${renderOwnerElement(input.linkTargetDOMNode)}
      ${maybeRenderCreationStacktrace(input.creationStackTrace)}
      ${maybeRenderAdStatus(input.frame?.adFrameType(), input.frame?.adFrameStatus())}
      ${maybeRenderCreatorAdScriptAncestry(input.frame?.adFrameType(), input.target, input.adScriptAncestry)}
      <devtools-report-divider></devtools-report-divider>`;
  // clang-format on
}

function renderSourcesLinkForURL(onRevealInSources: () => void): LitTemplate {
  return ApplicationComponents.PermissionsPolicySection.renderIconLink(
      'label',
      i18nString(UIStrings.clickToOpenInSourcesPanel),
      onRevealInSources,
      'reveal-in-sources',
  );
}

function renderNetworkLinkForURL(onRevealInNetwork: () => void): LitTemplate {
  return ApplicationComponents.PermissionsPolicySection.renderIconLink(
      'arrow-up-down-circle', i18nString(UIStrings.clickToOpenInNetworkPanel), onRevealInNetwork, 'reveal-in-network');
}

function maybeRenderUnreachableURL(unreachableUrl: Platform.DevToolsPath.UrlString): LitTemplate {
  if (!unreachableUrl) {
    return nothing;
  }
  return html`
      <devtools-report-key>${i18nString(UIStrings.unreachableUrl)}</devtools-report-key>
      <devtools-report-value>
        <div class="inline-items">
          ${renderNetworkLinkForUnreachableURL(unreachableUrl)}
          <div class="text-ellipsis" title=${unreachableUrl}>${unreachableUrl}</div>
        </div>
      </devtools-report-value>
    `;
}

function renderNetworkLinkForUnreachableURL(unreachableUrlString: Platform.DevToolsPath.UrlString): LitTemplate {
  const unreachableUrl = Common.ParsedURL.ParsedURL.fromString(unreachableUrlString);
  if (unreachableUrl) {
    return ApplicationComponents.PermissionsPolicySection.renderIconLink(
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
  return nothing;
}

function maybeRenderOrigin(securityOrigin: SDK.SecurityOrigin.SecurityOrigin|undefined): LitTemplate {
  if (securityOrigin && !securityOrigin.isOpaque()) {
    const originString = securityOrigin.siteId();
    return html`
        <devtools-report-key>${i18nString(UIStrings.origin)}</devtools-report-key>
        <devtools-report-value>
          <div class="text-ellipsis" title=${originString}>${originString}</div>
        </devtools-report-value>
      `;
  }
  return nothing;
}

function renderOwnerElement(linkTargetDOMNode: SDK.DOMModel.DOMNode|null): LitTemplate {
  if (linkTargetDOMNode) {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
      return html`
        <devtools-report-key>${i18nString(UIStrings.ownerElement)}</devtools-report-key>
        <devtools-report-value class="without-min-width">
          <div class="inline-items">
            ${widget(PanelCommon.DOMLinkifier.DOMNodeLink, {node: linkTargetDOMNode})}
          </div>
        </devtools-report-value>
      `;
    // clang-format on
  }
  return nothing;
}

function maybeRenderCreationStacktrace(stackTrace: StackTrace.StackTrace.StackTrace|null): LitTemplate {
  if (stackTrace) {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
      return html`
        <devtools-report-key title=${i18nString(UIStrings.creationStackTraceExplanation)}>${
          i18nString(UIStrings.creationStackTrace)}</devtools-report-key>
        <devtools-report-value jslog=${VisualLogging.section('frame-creation-stack-trace')}>
          ${widget(Components.JSPresentationUtils.StackTracePreviewContent,
                   {stackTrace, options: {expandable: true}})}
        </devtools-report-value>
      `;
    // clang-format on
  }
  return nothing;
}

function getAdFrameTypeStrings(type: Protocol.Page.AdFrameType.Child|Protocol.Page.AdFrameType.Root):
    {value: Platform.UIString.LocalizedString, description: Platform.UIString.LocalizedString} {
  switch (type) {
    case Protocol.Page.AdFrameType.Child:
      return {value: i18nString(UIStrings.child), description: i18nString(UIStrings.childDescription)};
    case Protocol.Page.AdFrameType.Root:
      return {value: i18nString(UIStrings.root), description: i18nString(UIStrings.rootDescription)};
  }
}

function getAdFrameExplanationString(explanation: Protocol.Page.AdFrameExplanation): Platform.UIString.LocalizedString {
  switch (explanation) {
    case Protocol.Page.AdFrameExplanation.CreatedByAdScript:
      return i18nString(UIStrings.createdByAdScriptExplanation);
    case Protocol.Page.AdFrameExplanation.MatchedBlockingRule:
      return i18nString(UIStrings.matchedBlockingRuleExplanation);
    case Protocol.Page.AdFrameExplanation.ParentIsAd:
      return i18nString(UIStrings.parentIsAdExplanation);
  }
}

function maybeRenderAdStatus(
    adFrameType: Protocol.Page.AdFrameType|undefined,
    adFrameStatus: Protocol.Page.AdFrameStatus|undefined): LitTemplate {
  if (adFrameType === undefined || adFrameType === Protocol.Page.AdFrameType.None) {
    return nothing;
  }
  const typeStrings = getAdFrameTypeStrings(adFrameType);
  const rows = [html`<div title=${typeStrings.description}>${typeStrings.value}</div>`];
  for (const explanation of adFrameStatus?.explanations || []) {
    rows.push(html`<div>${getAdFrameExplanationString(explanation)}</div>`);
  }

  // Disabled until https://crbug.com/1079231 is fixed.
  // clang-format off
    return html`
      <devtools-report-key>${i18nString(UIStrings.adStatus)}</devtools-report-key>
      <devtools-report-value class="ad-status-list" jslog=${VisualLogging.section('ad-status')}>
        <devtools-expandable-list .data=${
          {rows, title: i18nString(UIStrings.adStatus)} as ExpandableList.ExpandableList.ExpandableListData}>
        </devtools-expandable-list>
      </devtools-report-value>`;
  // clang-format on
}

function maybeRenderCreatorAdScriptAncestry(
    adFrameType: Protocol.Page.AdFrameType|null, target: SDK.Target.Target|null,
    adScriptAncestry: Protocol.Network.AdAncestry|null): LitTemplate {
  if (adFrameType === Protocol.Page.AdFrameType.None) {
    return nothing;
  }

  if (!target || !adScriptAncestry || adScriptAncestry.ancestryChain.length === 0) {
    return nothing;
  }

  const rows = adScriptAncestry.ancestryChain.map(adScriptId => {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`<div>
      ${widget(Components.Linkifier.ScriptLocationLink,
              {target, scriptId: adScriptId.scriptId, options: {jslogContext: 'ad-script'}})}
    </div>`;
    // clang-format on
  });

  const shouldRenderFilterlistRule = (adScriptAncestry.rootScriptFilterlistRule !== undefined);

  // Disabled until https://crbug.com/1079231 is fixed.
  // clang-format off
    return html`
      <devtools-report-key>${i18nString(UIStrings.creatorAdScriptAncestry)}</devtools-report-key>
      <devtools-report-value class="creator-ad-script-ancestry-list" jslog=${VisualLogging.section('creator-ad-script-ancestry')}>
        <devtools-expandable-list .data=${
          {rows, title: i18nString(UIStrings.creatorAdScriptAncestry)} as ExpandableList.ExpandableList.ExpandableListData}>
        </devtools-expandable-list>
      </devtools-report-value>
      ${shouldRenderFilterlistRule ? html`
        <devtools-report-key>${i18nString(UIStrings.rootScriptFilterlistRule)}</devtools-report-key>
        <devtools-report-value jslog=${VisualLogging.section('root-script-filterlist-rule')}>${adScriptAncestry.rootScriptFilterlistRule}</devtools-report-value>
      ` : nothing}
    `;
  // clang-format on
}

function renderIsolationSection(input: FrameDetailsViewInput): LitTemplate {
  if (!input.frame) {
    return nothing;
  }
  return html`
      <devtools-report-section-header>${i18nString(UIStrings.securityIsolation)}</devtools-report-section-header>
      <devtools-report-key>${i18nString(UIStrings.secureContext)}</devtools-report-key>
      <devtools-report-value>
        ${input.frame.isSecureContext() ? i18nString(UIStrings.yes) : i18nString(UIStrings.no)}\xA0${
      maybeRenderSecureContextExplanation(input.frame)}
      </devtools-report-value>
      <devtools-report-key>${i18nString(UIStrings.crossoriginIsolated)}</devtools-report-key>
      <devtools-report-value>
        ${input.frame.isCrossOriginIsolated() ? i18nString(UIStrings.yes) : i18nString(UIStrings.no)}
      </devtools-report-value>
      ${maybeRenderCoopCoepCSPStatus(input.securityIsolationInfo)}
      <devtools-report-divider></devtools-report-divider>
    `;
}

function maybeRenderSecureContextExplanation(frame: SDK.ResourceTreeModel.ResourceTreeFrame|null): LitTemplate {
  const explanation = getSecureContextExplanation(frame);
  if (explanation) {
    return html`<span class="inline-comment">${explanation}</span>`;
  }
  return nothing;
}

function getSecureContextExplanation(frame: SDK.ResourceTreeModel.ResourceTreeFrame|null):
    Platform.UIString.LocalizedString|null {
  switch (frame?.getSecureContextType()) {
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

function maybeRenderCoopCoepCSPStatus(info: Protocol.Network.SecurityIsolationStatus|null): LitTemplate {
  if (info) {
    return html`
          ${
        maybeRenderCrossOriginStatus(
            info.coep, i18n.i18n.lockedString('Cross-Origin Embedder Policy (COEP)'),
            Protocol.Network.CrossOriginEmbedderPolicyValue.None)}
          ${
        maybeRenderCrossOriginStatus(
            info.coop, i18n.i18n.lockedString('Cross-Origin Opener Policy (COOP)'),
            Protocol.Network.CrossOriginOpenerPolicyValue.UnsafeNone)}
          ${renderCSPSection(info.csp)}
        `;
  }
  return nothing;
}

function maybeRenderCrossOriginStatus(
    info: Protocol.Network.CrossOriginEmbedderPolicyStatus|Protocol.Network.CrossOriginOpenerPolicyStatus|undefined,
    policyName: string,
    noneValue: Protocol.Network.CrossOriginEmbedderPolicyValue|
    Protocol.Network.CrossOriginOpenerPolicyValue): LitTemplate {
  if (!info) {
    return nothing;
  }
  function crossOriginValueToString(
      value: Protocol.Network.CrossOriginEmbedderPolicyValue|Protocol.Network.CrossOriginOpenerPolicyValue): string {
    switch (value) {
      case Protocol.Network.CrossOriginEmbedderPolicyValue.Credentialless:
        return 'credentialless';
      case Protocol.Network.CrossOriginEmbedderPolicyValue.None:
        return 'none';
      case Protocol.Network.CrossOriginEmbedderPolicyValue.RequireCorp:
        return 'require-corp';
      case Protocol.Network.CrossOriginOpenerPolicyValue.NoopenerAllowPopups:
        return 'noopenener-allow-popups';
      case Protocol.Network.CrossOriginOpenerPolicyValue.SameOrigin:
        return 'same-origin';
      case Protocol.Network.CrossOriginOpenerPolicyValue.SameOriginAllowPopups:
        return 'same-origin-allow-popups';
      case Protocol.Network.CrossOriginOpenerPolicyValue.SameOriginPlusCoep:
        return 'same-origin-plus-coep';
      case Protocol.Network.CrossOriginOpenerPolicyValue.RestrictProperties:
        return 'restrict-properties';
      case Protocol.Network.CrossOriginOpenerPolicyValue.RestrictPropertiesPlusCoep:
        return 'restrict-properties-plus-coep';
      case Protocol.Network.CrossOriginOpenerPolicyValue.UnsafeNone:
        return 'unsafe-none';
    }
  }

  const isEnabled = info.value !== noneValue;
  const isReportOnly = (!isEnabled && info.reportOnlyValue !== noneValue);
  const endpoint = isEnabled ? info.reportingEndpoint : info.reportOnlyReportingEndpoint;
  return html`
      <devtools-report-key>${policyName}</devtools-report-key>
      <devtools-report-value>
        ${crossOriginValueToString(isEnabled ? info.value : info.reportOnlyValue)}
        ${isReportOnly ? html`<span class="inline-comment">report-only</span>` : nothing}
        ${endpoint ? html`<span class="inline-name">${i18nString(UIStrings.reportingTo)}</span>${endpoint}` : nothing}
      </devtools-report-value>
    `;
}

function renderEffectiveDirectives(directives: string): LitTemplate[] {
  const parsedDirectives = new CspEvaluator.CspParser.CspParser(directives).csp.directives;
  const result = [];
  for (const directive in parsedDirectives) {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
      result.push(html`
          <div>
            <span class="bold">${directive}</span>
            ${': ' + parsedDirectives[directive]?.join(', ')}
          </div>`);
    // clang-format on
  }
  return result;
}

function renderSingleCSP(cspInfo: Protocol.Network.ContentSecurityPolicyStatus, divider: boolean): LitTemplate {
  // Disabled until https://crbug.com/1079231 is fixed.
  // clang-format off
    return html`
      <devtools-report-key>
        ${cspInfo.isEnforced ? i18n.i18n.lockedString('Content-Security-Policy') : html`
          ${i18n.i18n.lockedString('Content-Security-Policy-Report-Only')}
          <devtools-button
            .iconName=${'help'}
            class='help-button'
            .accessibleLabel=${i18nString(UIStrings.learnMore)}
            .variant=${Buttons.Button.Variant.ICON}
            .size=${Buttons.Button.Size.SMALL}
            @click=${()=> {UIHelpers.openInNewTab('https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy-Report-Only');}}
            jslog=${VisualLogging.link('learn-more.csp-report-only').track({click: true})}
            ></devtools-button>`}
      </devtools-report-key>
      <devtools-report-value>
        ${cspInfo.source === Protocol.Network.ContentSecurityPolicySource.HTTP ?
          i18n.i18n.lockedString('HTTP header') : i18n.i18n.lockedString('Meta tag')}
        ${renderEffectiveDirectives(cspInfo.effectiveDirectives)}
      </devtools-report-value>
      ${divider ? html`<devtools-report-divider class="subsection-divider"></devtools-report-divider>` : nothing}
    `;
  // clang-format on
}

function renderCSPSection(cspInfos: Protocol.Network.ContentSecurityPolicyStatus[]|undefined): LitTemplate {
  // Disabled until https://crbug.com/1079231 is fixed.
  // clang-format off
    return html`
      <devtools-report-divider></devtools-report-divider>
      <devtools-report-section-header>
        ${i18nString(UIStrings.contentSecurityPolicy)}
      </devtools-report-section-header>
      ${(cspInfos?.length) ? cspInfos.map((cspInfo, index) => renderSingleCSP(cspInfo, index < cspInfos?.length - 1)) : html`
        <devtools-report-key>
          ${i18n.i18n.lockedString('Content-Security-Policy')}
        </devtools-report-key>
        <devtools-report-value>
          ${i18nString(UIStrings.none)}
        </devtools-report-value>
      `}
    `;
  // clang-format on
}

function renderApiAvailabilitySection(frame: SDK.ResourceTreeModel.ResourceTreeFrame|null): LitTemplate {
  if (!frame) {
    return nothing;
  }

  // Disabled until https://crbug.com/1079231 is fixed.
  // clang-format off
    return html`
      <devtools-report-section-header>
        ${i18nString(UIStrings.apiAvailability)}
      </devtools-report-section-header>
      <devtools-report-section>
        <span class="report-section">
          ${i18nString(UIStrings.availabilityOfCertainApisDepends)}
          <devtools-link
            href="https://web.dev/why-coop-coep/" class="link"
            jslogcontext="learn-more.coop-coep">
            ${i18nString(UIStrings.learnMore)}
          </devtools-link>
        </span>
      </devtools-report-section>
      ${renderSharedArrayBufferAvailability(frame)}
      ${renderMeasureMemoryAvailability(frame)}
      <devtools-report-divider></devtools-report-divider>`;
  // clang-format on
}

function renderSharedArrayBufferAvailability(frame: SDK.ResourceTreeModel.ResourceTreeFrame|null): LitTemplate {
  if (frame) {
    const features = frame.getGatedAPIFeatures();
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

      function renderHint(frame: SDK.ResourceTreeModel.ResourceTreeFrame): LitTemplate {
        switch (frame.getCrossOriginIsolatedContextType()) {
          case Protocol.Page.CrossOriginIsolatedContextType.Isolated:
            return nothing;
          case Protocol.Page.CrossOriginIsolatedContextType.NotIsolated:
            if (sabAvailable) {
              // clang-format off
                return html`
                  <span class="inline-comment">
                    ${i18nString(UIStrings.willRequireCrossoriginIsolated)}
                  </span>`;
              // clang-format on
            }
            return html`<span class="inline-comment">${i18nString(UIStrings.requiresCrossoriginIsolated)}</span>`;
          case Protocol.Page.CrossOriginIsolatedContextType.NotIsolatedFeatureDisabled:
            if (!sabTransferAvailable) {
              // clang-format off
                return html`
                  <span class="inline-comment">
                    ${i18nString(UIStrings.transferRequiresCrossoriginIsolatedPermission)}
                    <code> cross-origin-isolated</code>
                  </span>`;
              // clang-format on
            }
            break;
        }
        return nothing;
      }

      // SharedArrayBuffer is an API name, so we don't translate it.
      return html`
          <devtools-report-key>SharedArrayBuffers</devtools-report-key>
          <devtools-report-value title=${tooltipText}>
            ${availabilityText}\xA0${renderHint(frame)}
          </devtools-report-value>
        `;
    }
  }
  return nothing;
}

function renderMeasureMemoryAvailability(frame: SDK.ResourceTreeModel.ResourceTreeFrame|null): LitTemplate {
  if (frame) {
    const measureMemoryAvailable = frame.isCrossOriginIsolated();
    const availabilityText =
        measureMemoryAvailable ? i18nString(UIStrings.available) : i18nString(UIStrings.unavailable);
    const tooltipText = measureMemoryAvailable ? i18nString(UIStrings.thePerformanceAPI) :
                                                 i18nString(UIStrings.thePerformancemeasureuseragentspecificmemory);
    return html`
        <devtools-report-key>${i18nString(UIStrings.measureMemory)}</devtools-report-key>
        <devtools-report-value>
          <span title=${tooltipText}>${
        availabilityText}</span>\xA0<devtools-link class="link" href="https://web.dev/monitor-total-page-memory-usage/" jslogcontext="learn-more.monitor-memory-usage">${
        i18nString(UIStrings.learnMore)}</devtools-link>
        </devtools-report-value>
      `;
  }
  return nothing;
}

function renderAdditionalInfoSection(frame: SDK.ResourceTreeModel.ResourceTreeFrame|null): LitTemplate {
  if (!frame) {
    return nothing;
  }

  return html`
      <devtools-report-section-header
        title=${i18nString(UIStrings.thisAdditionalDebugging)}
      >${i18nString(UIStrings.additionalInformation)}</devtools-report-section-header>
      <devtools-report-key>${i18nString(UIStrings.frameId)}</devtools-report-key>
      <devtools-report-value>
        <div class="text-ellipsis" title=${frame.id}>${frame.id}</div>
      </devtools-report-value>
      <devtools-report-divider></devtools-report-divider>
    `;
}

export class FrameDetailsReportView extends UI.Widget.Widget {
  #frame?: SDK.ResourceTreeModel.ResourceTreeFrame;
  #target: SDK.Target.Target|null = null;
  #creationStackTrace: StackTrace.StackTrace.StackTrace|null = null;
  #securityIsolationInfo: Protocol.Network.SecurityIsolationStatus|null = null;
  #linkTargetDOMNode: SDK.DOMModel.DOMNode|null = null;
  #trials: Protocol.Page.OriginTrial[]|null = null;
  #protocolMonitorExperimentEnabled = false;
  #permissionsPolicies: Protocol.Page.PermissionsPolicyFeatureState[]|null = null;
  #linkifier = new Components.Linkifier.Linkifier();
  #adScriptAncestry: Protocol.Network.AdAncestry|null = null;
  #view: View;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element, {useShadowDom: true});
    this.#protocolMonitorExperimentEnabled =
        Root.Runtime.experiments.isEnabled(Root.ExperimentNames.ExperimentName.PROTOCOL_MONITOR);
    this.#view = view;
  }

  set frame(frame: SDK.ResourceTreeModel.ResourceTreeFrame) {
    this.#frame = frame;
    void this.#frame.getPermissionsPolicyState().then(permissionsPolicies => {
      this.#permissionsPolicies = permissionsPolicies;
      this.requestUpdate();
    });
    const {creationStackTrace: rawCreationStackTrace, creationStackTraceTarget: creationTarget} =
        frame.getCreationStackTraceData();
    if (rawCreationStackTrace) {
      void Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance()
          .createStackTraceFromProtocolRuntime(rawCreationStackTrace, creationTarget)
          .then(creationStackTrace => {
            this.#creationStackTrace = creationStackTrace;
            this.requestUpdate();
          });
    }
    const networkManager = frame.resourceTreeModel().target().model(SDK.NetworkManager.NetworkManager);
    void networkManager?.getSecurityIsolationStatus(frame.id).then(securityIsolationInfo => {
      this.#securityIsolationInfo = securityIsolationInfo;
      this.requestUpdate();
    });
    void frame.getOwnerDOMNodeOrDocument().then(linkTargetDOMNode => {
      this.#linkTargetDOMNode = linkTargetDOMNode;
      this.requestUpdate();
    });
    void frame.getOriginTrials().then(trials => {
      this.#trials = trials;
      this.requestUpdate();
    });
    this.requestUpdate();
  }

  get frame(): SDK.ResourceTreeModel.ResourceTreeFrame|undefined {
    return this.#frame;
  }

  override async performUpdate(): Promise<void> {
    const result = await this.#frame?.parentFrame()?.getAdScriptAncestry(this.#frame?.id);
    if (result && result.ancestryChain.length > 0) {
      this.#adScriptAncestry = result;
      this.#target = this.#frame?.resourceTreeModel().target() ?? null;
    }

    const frame = this.#frame;
    if (!frame) {
      return;
    }
    const frameRequest = frame.resourceForURL(frame.url)?.request;

    const input = {
      frame,
      target: this.#target,
      creationStackTrace: this.#creationStackTrace,
      protocolMonitorExperimentEnabled: this.#protocolMonitorExperimentEnabled,
      permissionsPolicies: this.#permissionsPolicies,
      adScriptAncestry: this.#adScriptAncestry,
      linkifier: this.#linkifier,
      linkTargetDOMNode: this.#linkTargetDOMNode,
      trials: this.#trials,
      securityIsolationInfo: this.#securityIsolationInfo,
      onRevealInNetwork: frameRequest ?
          () => {
            const requestLocation = NetworkForward.UIRequestLocation.UIRequestLocation.tab(
                frameRequest, NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT);
            return Common.Revealer.reveal(requestLocation);
          } :
          undefined,
      onRevealInSources: async () => {
        const sourceCode = this.#uiSourceCodeForFrame(frame);
        if (sourceCode) {
          await Common.Revealer.reveal(sourceCode);
        }
      },
    };
    this.#view(input, undefined, this.contentElement);
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
}
