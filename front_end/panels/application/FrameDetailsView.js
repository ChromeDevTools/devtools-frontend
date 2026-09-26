// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/kit/kit.js';
import '../../ui/components/expandable_list/expandable_list.js';
import '../../ui/components/report_view/report_view.js';
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as PanelCommon from '../../panels/common/common.js';
import * as NetworkForward from '../../panels/network/forward/forward.js';
import * as CspEvaluator from '../../third_party/csp_evaluator/csp_evaluator.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UIHelpers from '../../ui/helpers/helpers.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import { html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as ApplicationComponents from './components/components.js';
import frameDetailsReportViewStyles from './frameDetailsReportView.css.js';
import { OriginTrialTreeView } from './OriginTrialTreeView.js';
const { widget } = UI.Widget;
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
    sharedarraybufferConstructorIs: '`SharedArrayBuffer` constructor is available and `SABs` can be transferred via `postMessage`',
    /**
     * @description Tooltip explaining that the SharedArrayBuffer constructor is available but SABs cannot be transferred via postMessage in the frame details view.
     */
    sharedarraybufferConstructorIsAvailable: '`SharedArrayBuffer` constructor is available but `SABs` can’t be transferred via `postMessage`',
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
    transferRequiresCrossoriginIsolatedPermission: '`SharedArrayBuffer` transfer requires enabling the permission policy:',
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
    thePerformancemeasureuseragentspecificmemory: 'The `performance.measureUserAgentSpecificMemory()` API isn’t available',
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
    creationStackTraceExplanation: 'This frame was created programmatically. The `stack trace` shows where this happened.',
    /**
     * @description Tooltip explaining that this frame is considered an ad because its parent frame is an ad in the frame details view.
     */
    parentIsAdExplanation: 'This frame is considered an ad frame because its parent frame is an ad frame',
    /**
     * @description Tooltip explaining that this frame is considered an ad because its main document is an ad resource in the frame details view.
     */
    matchedBlockingRuleExplanation: 'This frame is considered an ad frame because its current (or previous) main document is an ad resource',
    /**
     * @description Tooltip explaining that this frame is considered an ad because an ad script was in the stack when it was created in the frame details view.
     */
    createdByAdScriptExplanation: 'An ad script was in the `(async) stack` when this frame was created. Examining the creation `stack trace` of this frame might provide more insight.',
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
};
const str_ = i18n.i18n.registerUIStrings('panels/application/FrameDetailsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const DEFAULT_VIEW = (input, _output, target) => {
    if (!input.frame) {
        return;
    }
    // clang-format off
    render(html `
    <style>${frameDetailsReportViewStyles}</style>
    <devtools-report .data=${{ reportTitle: input.frame.displayName() }}
    jslog=${VisualLogging.pane('frames')}>
      ${renderDocumentSection(input)}
      ${renderIsolationSection(input)}
      ${renderApiAvailabilitySection(input.frame)}
      ${renderOriginTrial(input.trials)}
      ${input.permissionsPolicies ?
        widget(ApplicationComponents.PermissionsPolicySection.PermissionsPolicySection, {
            policies: input.permissionsPolicies,
            showDetails: false
        }) : nothing}
      ${input.protocolMonitorExperimentEnabled ? renderAdditionalInfoSection(input.frame) : nothing}
    </devtools-report>
  `, target);
    // clang-format on
};
function renderOriginTrial(trials) {
    if (!trials) {
        return nothing;
    }
    const data = { trials };
    // clang-format off
    return html `
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
    <devtools-widget class="span-cols" ${widget(OriginTrialTreeView, { data })}>
    </devtools-widget>
    <devtools-report-divider></devtools-report-divider>`;
    // clang-format on
}
function renderDocumentSection(input) {
    if (!input.frame) {
        return nothing;
    }
    // clang-format off
    return html `
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
function renderSourcesLinkForURL(onRevealInSources) {
    return ApplicationComponents.PermissionsPolicySection.renderIconLink('label', i18nString(UIStrings.clickToOpenInSourcesPanel), onRevealInSources, 'reveal-in-sources');
}
function renderNetworkLinkForURL(onRevealInNetwork) {
    return ApplicationComponents.PermissionsPolicySection.renderIconLink('arrow-up-down-circle', i18nString(UIStrings.clickToOpenInNetworkPanel), onRevealInNetwork, 'reveal-in-network');
}
function maybeRenderUnreachableURL(unreachableUrl) {
    if (!unreachableUrl) {
        return nothing;
    }
    return html `
      <devtools-report-key>${i18nString(UIStrings.unreachableUrl)}</devtools-report-key>
      <devtools-report-value>
        <div class="inline-items">
          ${renderNetworkLinkForUnreachableURL(unreachableUrl)}
          <div class="text-ellipsis" title=${unreachableUrl}>${unreachableUrl}</div>
        </div>
      </devtools-report-value>
    `;
}
function renderNetworkLinkForUnreachableURL(unreachableUrlString) {
    const unreachableUrl = Common.ParsedURL.ParsedURL.fromString(unreachableUrlString);
    if (unreachableUrl) {
        return ApplicationComponents.PermissionsPolicySection.renderIconLink('arrow-up-down-circle', i18nString(UIStrings.clickToOpenInNetworkPanelMight), () => {
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
        }, 'unreachable-url.reveal-in-network');
    }
    return nothing;
}
function maybeRenderOrigin(securityOrigin) {
    if (securityOrigin && !securityOrigin.isOpaque()) {
        const originString = securityOrigin.siteId();
        return html `
        <devtools-report-key>${i18nString(UIStrings.origin)}</devtools-report-key>
        <devtools-report-value>
          <div class="text-ellipsis" title=${originString}>${originString}</div>
        </devtools-report-value>
      `;
    }
    return nothing;
}
function renderOwnerElement(linkTargetDOMNode) {
    if (linkTargetDOMNode) {
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        return html `
        <devtools-report-key>${i18nString(UIStrings.ownerElement)}</devtools-report-key>
        <devtools-report-value class="without-min-width">
          <div class="inline-items">
            ${widget(PanelCommon.DOMLinkifier.DOMNodeLink, { node: linkTargetDOMNode })}
          </div>
        </devtools-report-value>
      `;
        // clang-format on
    }
    return nothing;
}
function maybeRenderCreationStacktrace(stackTrace) {
    if (stackTrace) {
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        return html `
        <devtools-report-key title=${i18nString(UIStrings.creationStackTraceExplanation)}>${i18nString(UIStrings.creationStackTrace)}</devtools-report-key>
        <devtools-report-value jslog=${VisualLogging.section('frame-creation-stack-trace')}>
          ${widget(Components.JSPresentationUtils.StackTracePreviewContent, { stackTrace, options: { expandable: true } })}
        </devtools-report-value>
      `;
        // clang-format on
    }
    return nothing;
}
function getAdFrameTypeStrings(type) {
    switch (type) {
        case "child" /* Protocol.Page.AdFrameType.Child */:
            return { value: i18nString(UIStrings.child), description: i18nString(UIStrings.childDescription) };
        case "root" /* Protocol.Page.AdFrameType.Root */:
            return { value: i18nString(UIStrings.root), description: i18nString(UIStrings.rootDescription) };
    }
}
function getAdFrameExplanationString(explanation) {
    switch (explanation) {
        case "CreatedByAdScript" /* Protocol.Page.AdFrameExplanation.CreatedByAdScript */:
            return i18nString(UIStrings.createdByAdScriptExplanation);
        case "MatchedBlockingRule" /* Protocol.Page.AdFrameExplanation.MatchedBlockingRule */:
            return i18nString(UIStrings.matchedBlockingRuleExplanation);
        case "ParentIsAd" /* Protocol.Page.AdFrameExplanation.ParentIsAd */:
            return i18nString(UIStrings.parentIsAdExplanation);
    }
}
function maybeRenderAdStatus(adFrameType, adFrameStatus) {
    if (adFrameType === undefined || adFrameType === "none" /* Protocol.Page.AdFrameType.None */) {
        return nothing;
    }
    const typeStrings = getAdFrameTypeStrings(adFrameType);
    const rows = [html `<div title=${typeStrings.description}>${typeStrings.value}</div>`];
    for (const explanation of adFrameStatus?.explanations || []) {
        rows.push(html `<div>${getAdFrameExplanationString(explanation)}</div>`);
    }
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html `
      <devtools-report-key>${i18nString(UIStrings.adStatus)}</devtools-report-key>
      <devtools-report-value class="ad-status-list" jslog=${VisualLogging.section('ad-status')}>
        <devtools-expandable-list .data=${{ rows, title: i18nString(UIStrings.adStatus) }}>
        </devtools-expandable-list>
      </devtools-report-value>`;
    // clang-format on
}
function maybeRenderCreatorAdScriptAncestry(adFrameType, target, adScriptAncestry) {
    if (adFrameType === "none" /* Protocol.Page.AdFrameType.None */) {
        return nothing;
    }
    if (!target || !adScriptAncestry || adScriptAncestry.ancestryChain.length === 0) {
        return nothing;
    }
    const rows = adScriptAncestry.ancestryChain.map(adScriptId => {
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        return html `<div>
      ${widget(Components.Linkifier.ScriptLocationLink, { target, scriptId: adScriptId.scriptId, options: { jslogContext: 'ad-script' } })}
    </div>`;
        // clang-format on
    });
    const shouldRenderFilterlistRule = (adScriptAncestry.rootScriptFilterlistRule !== undefined);
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html `
      <devtools-report-key>${i18nString(UIStrings.creatorAdScriptAncestry)}</devtools-report-key>
      <devtools-report-value class="creator-ad-script-ancestry-list" jslog=${VisualLogging.section('creator-ad-script-ancestry')}>
        <devtools-expandable-list .data=${{ rows, title: i18nString(UIStrings.creatorAdScriptAncestry) }}>
        </devtools-expandable-list>
      </devtools-report-value>
      ${shouldRenderFilterlistRule ? html `
        <devtools-report-key>${i18nString(UIStrings.rootScriptFilterlistRule)}</devtools-report-key>
        <devtools-report-value jslog=${VisualLogging.section('root-script-filterlist-rule')}>${adScriptAncestry.rootScriptFilterlistRule}</devtools-report-value>
      ` : nothing}
    `;
    // clang-format on
}
function renderIsolationSection(input) {
    if (!input.frame) {
        return nothing;
    }
    return html `
      <devtools-report-section-header>${i18nString(UIStrings.securityIsolation)}</devtools-report-section-header>
      <devtools-report-key>${i18nString(UIStrings.secureContext)}</devtools-report-key>
      <devtools-report-value>
        ${input.frame.isSecureContext() ? i18nString(UIStrings.yes) : i18nString(UIStrings.no)}\xA0${maybeRenderSecureContextExplanation(input.frame)}
      </devtools-report-value>
      <devtools-report-key>${i18nString(UIStrings.crossoriginIsolated)}</devtools-report-key>
      <devtools-report-value>
        ${input.frame.isCrossOriginIsolated() ? i18nString(UIStrings.yes) : i18nString(UIStrings.no)}
      </devtools-report-value>
      ${maybeRenderCoopCoepCSPStatus(input.securityIsolationInfo)}
      <devtools-report-divider></devtools-report-divider>
    `;
}
function maybeRenderSecureContextExplanation(frame) {
    const explanation = getSecureContextExplanation(frame);
    if (explanation) {
        return html `<span class="inline-comment">${explanation}</span>`;
    }
    return nothing;
}
function getSecureContextExplanation(frame) {
    switch (frame?.getSecureContextType()) {
        case "Secure" /* Protocol.Page.SecureContextType.Secure */:
            return null;
        case "SecureLocalhost" /* Protocol.Page.SecureContextType.SecureLocalhost */:
            return i18nString(UIStrings.localhostIsAlwaysASecureContext);
        case "InsecureAncestor" /* Protocol.Page.SecureContextType.InsecureAncestor */:
            return i18nString(UIStrings.aFrameAncestorIsAnInsecure);
        case "InsecureScheme" /* Protocol.Page.SecureContextType.InsecureScheme */:
            return i18nString(UIStrings.theFramesSchemeIsInsecure);
    }
    return null;
}
function maybeRenderCoopCoepCSPStatus(info) {
    if (info) {
        return html `
          ${maybeRenderCrossOriginStatus(info.coep, i18n.i18n.lockedString('Cross-Origin Embedder Policy (COEP)'), "None" /* Protocol.Network.CrossOriginEmbedderPolicyValue.None */)}
          ${maybeRenderCrossOriginStatus(info.coop, i18n.i18n.lockedString('Cross-Origin Opener Policy (COOP)'), "UnsafeNone" /* Protocol.Network.CrossOriginOpenerPolicyValue.UnsafeNone */)}
          ${renderCSPSection(info.csp)}
        `;
    }
    return nothing;
}
function maybeRenderCrossOriginStatus(info, policyName, noneValue) {
    if (!info) {
        return nothing;
    }
    function crossOriginValueToString(value) {
        switch (value) {
            case "Credentialless" /* Protocol.Network.CrossOriginEmbedderPolicyValue.Credentialless */:
                return 'credentialless';
            case "None" /* Protocol.Network.CrossOriginEmbedderPolicyValue.None */:
                return 'none';
            case "RequireCorp" /* Protocol.Network.CrossOriginEmbedderPolicyValue.RequireCorp */:
                return 'require-corp';
            case "NoopenerAllowPopups" /* Protocol.Network.CrossOriginOpenerPolicyValue.NoopenerAllowPopups */:
                return 'noopenener-allow-popups';
            case "SameOrigin" /* Protocol.Network.CrossOriginOpenerPolicyValue.SameOrigin */:
                return 'same-origin';
            case "SameOriginAllowPopups" /* Protocol.Network.CrossOriginOpenerPolicyValue.SameOriginAllowPopups */:
                return 'same-origin-allow-popups';
            case "SameOriginPlusCoep" /* Protocol.Network.CrossOriginOpenerPolicyValue.SameOriginPlusCoep */:
                return 'same-origin-plus-coep';
            case "RestrictProperties" /* Protocol.Network.CrossOriginOpenerPolicyValue.RestrictProperties */:
                return 'restrict-properties';
            case "RestrictPropertiesPlusCoep" /* Protocol.Network.CrossOriginOpenerPolicyValue.RestrictPropertiesPlusCoep */:
                return 'restrict-properties-plus-coep';
            case "UnsafeNone" /* Protocol.Network.CrossOriginOpenerPolicyValue.UnsafeNone */:
                return 'unsafe-none';
        }
    }
    const isEnabled = info.value !== noneValue;
    const isReportOnly = (!isEnabled && info.reportOnlyValue !== noneValue);
    const endpoint = isEnabled ? info.reportingEndpoint : info.reportOnlyReportingEndpoint;
    return html `
      <devtools-report-key>${policyName}</devtools-report-key>
      <devtools-report-value>
        ${crossOriginValueToString(isEnabled ? info.value : info.reportOnlyValue)}
        ${isReportOnly ? html `<span class="inline-comment">report-only</span>` : nothing}
        ${endpoint ? html `<span class="inline-name">${i18nString(UIStrings.reportingTo)}</span>${endpoint}` : nothing}
      </devtools-report-value>
    `;
}
function renderEffectiveDirectives(directives) {
    const parsedDirectives = new CspEvaluator.CspParser.CspParser(directives).csp.directives;
    const result = [];
    for (const directive in parsedDirectives) {
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        result.push(html `
          <div>
            <span class="bold">${directive}</span>
            ${': ' + parsedDirectives[directive]?.join(', ')}
          </div>`);
        // clang-format on
    }
    return result;
}
function renderSingleCSP(cspInfo, divider) {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html `
      <devtools-report-key>
        ${cspInfo.isEnforced ? i18n.i18n.lockedString('Content-Security-Policy') : html `
          ${i18n.i18n.lockedString('Content-Security-Policy-Report-Only')}
          <devtools-button
            .iconName=${'help'}
            class='help-button'
            .accessibleLabel=${i18nString(UIStrings.learnMore)}
            .variant=${"icon" /* Buttons.Button.Variant.ICON */}
            .size=${"SMALL" /* Buttons.Button.Size.SMALL */}
            @click=${() => { UIHelpers.openInNewTab('https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy-Report-Only'); }}
            jslog=${VisualLogging.link('learn-more.csp-report-only').track({ click: true })}
            ></devtools-button>`}
      </devtools-report-key>
      <devtools-report-value>
        ${cspInfo.source === "HTTP" /* Protocol.Network.ContentSecurityPolicySource.HTTP */ ?
        i18n.i18n.lockedString('HTTP header') : i18n.i18n.lockedString('Meta tag')}
        ${renderEffectiveDirectives(cspInfo.effectiveDirectives)}
      </devtools-report-value>
      ${divider ? html `<devtools-report-divider class="subsection-divider"></devtools-report-divider>` : nothing}
    `;
    // clang-format on
}
function renderCSPSection(cspInfos) {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html `
      <devtools-report-divider></devtools-report-divider>
      <devtools-report-section-header>
        ${i18nString(UIStrings.contentSecurityPolicy)}
      </devtools-report-section-header>
      ${(cspInfos?.length) ? cspInfos.map((cspInfo, index) => renderSingleCSP(cspInfo, index < cspInfos?.length - 1)) : html `
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
function renderApiAvailabilitySection(frame) {
    if (!frame) {
        return nothing;
    }
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html `
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
function renderSharedArrayBufferAvailability(frame) {
    if (frame) {
        const features = frame.getGatedAPIFeatures();
        if (features) {
            const sabAvailable = features.includes("SharedArrayBuffers" /* Protocol.Page.GatedAPIFeatures.SharedArrayBuffers */);
            const sabTransferAvailable = sabAvailable && features.includes("SharedArrayBuffersTransferAllowed" /* Protocol.Page.GatedAPIFeatures.SharedArrayBuffersTransferAllowed */);
            const availabilityText = sabTransferAvailable ?
                i18nString(UIStrings.availableTransferable) :
                (sabAvailable ? i18nString(UIStrings.availableNotTransferable) : i18nString(UIStrings.unavailable));
            const tooltipText = sabTransferAvailable ?
                i18nString(UIStrings.sharedarraybufferConstructorIs) :
                (sabAvailable ? i18nString(UIStrings.sharedarraybufferConstructorIsAvailable) : '');
            function renderHint(frame) {
                switch (frame.getCrossOriginIsolatedContextType()) {
                    case "Isolated" /* Protocol.Page.CrossOriginIsolatedContextType.Isolated */:
                        return nothing;
                    case "NotIsolated" /* Protocol.Page.CrossOriginIsolatedContextType.NotIsolated */:
                        if (sabAvailable) {
                            // clang-format off
                            return html `
                  <span class="inline-comment">
                    ${i18nString(UIStrings.willRequireCrossoriginIsolated)}
                  </span>`;
                            // clang-format on
                        }
                        return html `<span class="inline-comment">${i18nString(UIStrings.requiresCrossoriginIsolated)}</span>`;
                    case "NotIsolatedFeatureDisabled" /* Protocol.Page.CrossOriginIsolatedContextType.NotIsolatedFeatureDisabled */:
                        if (!sabTransferAvailable) {
                            // clang-format off
                            return html `
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
            return html `
          <devtools-report-key>SharedArrayBuffers</devtools-report-key>
          <devtools-report-value title=${tooltipText}>
            ${availabilityText}\xA0${renderHint(frame)}
          </devtools-report-value>
        `;
        }
    }
    return nothing;
}
function renderMeasureMemoryAvailability(frame) {
    if (frame) {
        const measureMemoryAvailable = frame.isCrossOriginIsolated();
        const availabilityText = measureMemoryAvailable ? i18nString(UIStrings.available) : i18nString(UIStrings.unavailable);
        const tooltipText = measureMemoryAvailable ? i18nString(UIStrings.thePerformanceAPI) :
            i18nString(UIStrings.thePerformancemeasureuseragentspecificmemory);
        return html `
        <devtools-report-key>${i18nString(UIStrings.measureMemory)}</devtools-report-key>
        <devtools-report-value>
          <span title=${tooltipText}>${availabilityText}</span>\xA0<devtools-link class="link" href="https://web.dev/monitor-total-page-memory-usage/" jslogcontext="learn-more.monitor-memory-usage">${i18nString(UIStrings.learnMore)}</devtools-link>
        </devtools-report-value>
      `;
    }
    return nothing;
}
function renderAdditionalInfoSection(frame) {
    if (!frame) {
        return nothing;
    }
    return html `
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
    #frame;
    #target = null;
    #creationStackTrace = null;
    #securityIsolationInfo = null;
    #linkTargetDOMNode = null;
    #trials = null;
    #protocolMonitorExperimentEnabled = false;
    #permissionsPolicies = null;
    #linkifier = new Components.Linkifier.Linkifier();
    #adScriptAncestry = null;
    #view;
    constructor(element, view = DEFAULT_VIEW) {
        super(element, { useShadowDom: true });
        this.#protocolMonitorExperimentEnabled =
            Root.Runtime.experiments.isEnabled(Root.ExperimentNames.ExperimentName.PROTOCOL_MONITOR);
        this.#view = view;
    }
    set frame(frame) {
        this.#frame = frame;
        void this.#frame.getPermissionsPolicyState().then(permissionsPolicies => {
            this.#permissionsPolicies = permissionsPolicies;
            this.requestUpdate();
        });
        const { creationStackTrace: rawCreationStackTrace, creationStackTraceTarget: creationTarget } = frame.getCreationStackTraceData();
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
    get frame() {
        return this.#frame;
    }
    async performUpdate() {
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
                    const requestLocation = NetworkForward.UIRequestLocation.UIRequestLocation.tab(frameRequest, "headers-component" /* NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT */);
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
    #uiSourceCodeForFrame(frame) {
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
//# sourceMappingURL=FrameDetailsView.js.map