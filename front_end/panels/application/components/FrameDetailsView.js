// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import '../../../ui/components/expandable_list/expandable_list.js';
import '../../../ui/components/report_view/report_view.js';
import './StackTrace.js';
import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as Root from '../../../core/root/root.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Bindings from '../../../models/bindings/bindings.js';
import * as Workspace from '../../../models/workspace/workspace.js';
import * as NetworkForward from '../../../panels/network/forward/forward.js';
import * as CspEvaluator from '../../../third_party/csp_evaluator/csp_evaluator.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as LegacyWrapper from '../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as Components from '../../../ui/legacy/components/utils/utils.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import frameDetailsReportViewStyles from './frameDetailsReportView.css.js';
import { OriginTrialTreeView } from './OriginTrialTreeView.js';
import { renderIconLink, } from './PermissionsPolicySection.js';
const { html } = Lit;
const { widgetConfig } = UI.Widget;
const UIStrings = {
    /**
     * @description Section header in the Frame Details view
     */
    additionalInformation: 'Additional Information',
    /**
     * @description Explanation for why the additional information section is being shown
     */
    thisAdditionalDebugging: 'This additional (debugging) information is shown because the \'Protocol Monitor\' experiment is enabled.',
    /**
     * @description Label for subtitle of frame details view
     */
    frameId: 'Frame ID',
    /**
     * @description Name of a network resource type
     */
    document: 'Document',
    /**
     * @description A web URL (for a lot of languages this does not need to be translated, please translate only where necessary)
     */
    url: 'URL',
    /**
     * /**
     * @description Title for a link to the Sources panel
     */
    clickToOpenInSourcesPanel: 'Click to open in Sources panel',
    /**
     * @description Title for a link to the Network panel
     */
    clickToOpenInNetworkPanel: 'Click to open in Network panel',
    /**
     * @description Title for unreachable URL field
     */
    unreachableUrl: 'Unreachable URL',
    /**
     * @description Title for a link that applies a filter to the network panel
     */
    clickToOpenInNetworkPanelMight: 'Click to open in Network panel (might require page reload)',
    /**
     * @description The origin of a URL (https://web.dev/same-site-same-origin/#origin)
     *(for a lot of languages this does not need to be translated, please translate only where necessary)
     */
    origin: 'Origin',
    /**
     * /**
     * @description Related node label in Timeline UIUtils of the Performance panel
     */
    ownerElement: 'Owner Element',
    /**
     * @description Title for a link to the Elements panel
     */
    clickToOpenInElementsPanel: 'Click to open in Elements panel',
    /**
     * @description Title for ad frame type field
     */
    adStatus: 'Ad Status',
    /**
     * @description Description for ad frame type
     */
    rootDescription: 'This frame has been identified as the root frame of an ad',
    /**
     * @description Value for ad frame type
     */
    root: 'root',
    /**
     * @description Description for ad frame type
     */
    childDescription: 'This frame has been identified as a child frame of an ad',
    /**
     * @description Value for ad frame type
     */
    child: 'child',
    /**
     * @description Section header in the Frame Details view
     */
    securityIsolation: 'Security & Isolation',
    /**
     * @description Section header in the Frame Details view
     */
    contentSecurityPolicy: 'Content Security Policy (CSP)',
    /**
     * @description Row title for in the Frame Details view
     */
    secureContext: 'Secure Context',
    /**
     * @description Text in Timeline indicating that input has happened recently
     */
    yes: 'Yes',
    /**
     * @description Text in Timeline indicating that input has not happened recently
     */
    no: 'No',
    /**
     * @description Label for whether a frame is cross-origin isolated
     *(https://developer.chrome.com/docs/extensions/mv3/cross-origin-isolation/)
     *(for a lot of languages this does not need to be translated, please translate only where necessary)
     */
    crossoriginIsolated: 'Cross-Origin Isolated',
    /**
     * @description Explanatory text in the Frame Details view
     */
    localhostIsAlwaysASecureContext: '`Localhost` is always a secure context',
    /**
     * @description Explanatory text in the Frame Details view
     */
    aFrameAncestorIsAnInsecure: 'A frame ancestor is an insecure context',
    /**
     * @description Explanatory text in the Frame Details view
     */
    theFramesSchemeIsInsecure: 'The frame\'s scheme is insecure',
    /**
     * @description This label specifies the server endpoints to which the server is reporting errors
     *and warnings through the Report-to API. Following this label will be the URL of the server.
     */
    reportingTo: 'reporting to',
    /**
     * @description Section header in the Frame Details view
     */
    apiAvailability: 'API availability',
    /**
     * @description Explanation of why cross-origin isolation is important
     *(https://web.dev/why-coop-coep/)
     *(for a lot of languages 'cross-origin isolation' does not need to be translated, please translate only where necessary)
     */
    availabilityOfCertainApisDepends: 'Availability of certain APIs depends on the document being cross-origin isolated.',
    /**
     * @description Description of the SharedArrayBuffer status
     */
    availableTransferable: 'available, transferable',
    /**
     * @description Description of the SharedArrayBuffer status
     */
    availableNotTransferable: 'available, not transferable',
    /**
     * @description Explanation for the SharedArrayBuffer availability status
     */
    unavailable: 'unavailable',
    /**
     * @description Tooltip for the SharedArrayBuffer availability status
     */
    sharedarraybufferConstructorIs: '`SharedArrayBuffer` constructor is available and `SABs` can be transferred via `postMessage`',
    /**
     * @description Tooltip for the SharedArrayBuffer availability status
     */
    sharedarraybufferConstructorIsAvailable: '`SharedArrayBuffer` constructor is available but `SABs` cannot be transferred via `postMessage`',
    /**
     * @description Explanation why SharedArrayBuffer will not be available in the future
     *(https://developer.chrome.com/docs/extensions/mv3/cross-origin-isolation/)
     *(for a lot of languages 'cross-origin isolation' does not need to be translated, please translate only where necessary)
     */
    willRequireCrossoriginIsolated: '⚠️ will require cross-origin isolated context in the future',
    /**
     * @description Explanation why SharedArrayBuffer is not available
     *(https://developer.chrome.com/docs/extensions/mv3/cross-origin-isolation/)
     *(for a lot of languages 'cross-origin isolation' does not need to be translated, please translate only where necessary).
     */
    requiresCrossoriginIsolated: 'requires cross-origin isolated context',
    /**
     * @description Explanation for the SharedArrayBuffer availability status in case the transfer of a SAB requires the
     * permission policy `cross-origin-isolated` to be enabled (e.g. because the message refers to the situation in an iframe).
     */
    transferRequiresCrossoriginIsolatedPermission: '`SharedArrayBuffer` transfer requires enabling the permission policy:',
    /**
     * @description Explanation for the Measure Memory availability status
     */
    available: 'available',
    /**
     * @description Tooltip for the Measure Memory availability status
     */
    thePerformanceAPI: 'The `performance.measureUserAgentSpecificMemory()` API is available',
    /**
     * @description Tooltip for the Measure Memory availability status
     */
    thePerformancemeasureuseragentspecificmemory: 'The `performance.measureUserAgentSpecificMemory()` API is not available',
    /**
     * @description Entry in the API availability section of the frame details view
     */
    measureMemory: 'Measure Memory',
    /**
     * @description Text that is usually a hyperlink to more documentation
     */
    learnMore: 'Learn more',
    /**
     * @description Label for a stack trace. If a frame is created programmatically (i.e. via JavaScript), there is a
     * stack trace for the line of code which caused the creation of the iframe. This is the stack trace we are showing here.
     */
    creationStackTrace: 'Frame Creation `Stack Trace`',
    /**
     * @description Tooltip for 'Frame Creation Stack Trace' explaining that the stack
     *trace shows where in the code the frame has been created programmatically
     */
    creationStackTraceExplanation: 'This frame was created programmatically. The `stack trace` shows where this happened.',
    /**
     * @description Text descripting why a frame has been indentified as an advertisement.
     */
    parentIsAdExplanation: 'This frame is considered an ad frame because its parent frame is an ad frame.',
    /**
     * @description Text descripting why a frame has been indentified as an advertisement.
     */
    matchedBlockingRuleExplanation: 'This frame is considered an ad frame because its current (or previous) main document is an ad resource.',
    /**
     * @description Text descripting why a frame has been indentified as an advertisement.
     */
    createdByAdScriptExplanation: 'There was an ad script in the `(async) stack` when this frame was created. Examining the creation `stack trace` of this frame might provide more insight.',
    /**
     * @description Label for the link(s) to the ad script(s) that led to this frame's creation.
     */
    creatorAdScriptAncestry: 'Creator Ad Script Ancestry',
    /**
     * @description Label for the filterlist rule that identified the root script in 'Creator Ad Script Ancestry' as an ad.
     */
    rootScriptFilterlistRule: 'Root Script Filterlist Rule',
    /**
     * @description Text describing the absence of a value.
     */
    none: 'None',
    /**
     * @description Explanation of what origin trials are
     *(https://developer.chrome.com/docs/web-platform/origin-trials/)
     *(please don't translate 'origin trials').
     */
    originTrialsExplanation: 'Origin trials give you access to a new or experimental feature.',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/components/FrameDetailsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class FrameDetailsReportView extends LegacyWrapper.LegacyWrapper.WrappableComponent {
    #shadow = this.attachShadow({ mode: 'open' });
    #frame;
    #target = null;
    #protocolMonitorExperimentEnabled = false;
    #permissionsPolicies = null;
    #permissionsPolicySectionData = { policies: [], showDetails: false };
    #linkifier = new Components.Linkifier.Linkifier();
    #adScriptAncestry = null;
    constructor(frame) {
        super();
        this.#frame = frame;
        void this.render();
    }
    connectedCallback() {
        this.parentElement?.classList.add('overflow-auto');
        this.#protocolMonitorExperimentEnabled = Root.Runtime.experiments.isEnabled('protocol-monitor');
    }
    async render() {
        const result = await this.#frame?.parentFrame()?.getAdScriptAncestry(this.#frame?.id);
        if (result && result.ancestryChain.length > 0) {
            this.#adScriptAncestry = result;
            // Obtain the Target associated with the first ad script, because in most scenarios all
            // scripts share the same debuggerId. However, discrepancies might arise when content scripts
            // from browser extensions are involved. We will monitor the debugging experiences and revisit
            // this approach if it proves problematic.
            const firstScript = this.#adScriptAncestry.ancestryChain[0];
            const debuggerModel = firstScript?.debuggerId ?
                await SDK.DebuggerModel.DebuggerModel.modelForDebuggerId(firstScript.debuggerId) :
                null;
            this.#target = debuggerModel?.target() ?? null;
        }
        if (!this.#permissionsPolicies && this.#frame) {
            this.#permissionsPolicies = this.#frame.getPermissionsPolicyState();
        }
        await RenderCoordinator.write('FrameDetailsView render', async () => {
            if (!this.#frame) {
                return;
            }
            // Disabled until https://crbug.com/1079231 is fixed.
            // clang-format off
            Lit.render(html `
        <style>${frameDetailsReportViewStyles}</style>
        <devtools-report .data=${{ reportTitle: this.#frame.displayName() }}
        jslog=${VisualLogging.pane('frames')}>
          ${this.#renderDocumentSection()}
          ${this.#renderIsolationSection()}
          ${this.#renderApiAvailabilitySection()}
          ${await this.#renderOriginTrial()}
          ${Lit.Directives.until(this.#permissionsPolicies?.then(policies => {
                this.#permissionsPolicySectionData.policies = policies || [];
                return html `
              <devtools-resources-permissions-policy-section
                .data=${this.#permissionsPolicySectionData}
              >
              </devtools-resources-permissions-policy-section>
            `;
            }), Lit.nothing)}
          ${this.#protocolMonitorExperimentEnabled ? this.#renderAdditionalInfoSection() : Lit.nothing}
        </devtools-report>
      `, this.#shadow, { host: this });
            // clang-format on
        });
    }
    async #renderOriginTrial() {
        if (!this.#frame) {
            return Lit.nothing;
        }
        const data = { trials: await this.#frame.getOriginTrials() };
        // clang-format off
        return html `
    <devtools-report-section-header>
      ${i18n.i18n.lockedString('Origin trials')}
    </devtools-report-section-header>
    <devtools-report-section>
      <span class="report-section">
        ${i18nString(UIStrings.originTrialsExplanation)}
        <x-link href="https://developer.chrome.com/docs/web-platform/origin-trials/" class="link"
                jslog=${VisualLogging.link('learn-more.origin-trials').track({ click: true })}>
          ${i18nString(UIStrings.learnMore)}
        </x-link>
      </span>
    </devtools-report-section>
    <devtools-widget class="span-cols" .widgetConfig=${widgetConfig(OriginTrialTreeView, { data })}>
    </devtools-widget>
    <devtools-report-divider></devtools-report-divider>`;
        // clang-format on
    }
    #renderDocumentSection() {
        if (!this.#frame) {
            return Lit.nothing;
        }
        return html `
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
      ${this.#maybeRenderCreatorAdScriptAncestry()}
      <devtools-report-divider></devtools-report-divider>
    `;
    }
    #maybeRenderSourcesLinkForURL() {
        const frame = this.#frame;
        if (!frame || frame.unreachableUrl()) {
            return Lit.nothing;
        }
        return renderIconLink('label', i18nString(UIStrings.clickToOpenInSourcesPanel), async () => {
            const sourceCode = this.#uiSourceCodeForFrame(frame);
            if (sourceCode) {
                await Common.Revealer.reveal(sourceCode);
            }
        }, 'reveal-in-sources');
    }
    #maybeRenderNetworkLinkForURL() {
        if (this.#frame) {
            const resource = this.#frame.resourceForURL(this.#frame.url);
            if (resource?.request) {
                const request = resource.request;
                return renderIconLink('arrow-up-down-circle', i18nString(UIStrings.clickToOpenInNetworkPanel), () => {
                    const requestLocation = NetworkForward.UIRequestLocation.UIRequestLocation.tab(request, "headers-component" /* NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT */);
                    return Common.Revealer.reveal(requestLocation);
                }, 'reveal-in-network');
            }
        }
        return Lit.nothing;
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
    #maybeRenderUnreachableURL() {
        if (!this.#frame || !this.#frame.unreachableUrl()) {
            return Lit.nothing;
        }
        return html `
      <devtools-report-key>${i18nString(UIStrings.unreachableUrl)}</devtools-report-key>
      <devtools-report-value>
        <div class="inline-items">
          ${this.#renderNetworkLinkForUnreachableURL()}
          <div class="text-ellipsis" title=${this.#frame.unreachableUrl()}>${this.#frame.unreachableUrl()}</div>
        </div>
      </devtools-report-value>
    `;
    }
    #renderNetworkLinkForUnreachableURL() {
        if (this.#frame) {
            const unreachableUrl = Common.ParsedURL.ParsedURL.fromString(this.#frame.unreachableUrl());
            if (unreachableUrl) {
                return renderIconLink('arrow-up-down-circle', i18nString(UIStrings.clickToOpenInNetworkPanelMight), () => {
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
        }
        return Lit.nothing;
    }
    #maybeRenderOrigin() {
        if (this.#frame && this.#frame.securityOrigin && this.#frame.securityOrigin !== '://') {
            return html `
        <devtools-report-key>${i18nString(UIStrings.origin)}</devtools-report-key>
        <devtools-report-value>
          <div class="text-ellipsis" title=${this.#frame.securityOrigin}>${this.#frame.securityOrigin}</div>
        </devtools-report-value>
      `;
        }
        return Lit.nothing;
    }
    async #renderOwnerElement() {
        if (this.#frame) {
            const linkTargetDOMNode = await this.#frame.getOwnerDOMNodeOrDocument();
            if (linkTargetDOMNode) {
                // Disabled until https://crbug.com/1079231 is fixed.
                // clang-format off
                return html `
          <devtools-report-key>${i18nString(UIStrings.ownerElement)}</devtools-report-key>
          <devtools-report-value class="without-min-width">
            <div class="inline-items">
              <button class="link text-link" role="link" tabindex=0 title=${i18nString(UIStrings.clickToOpenInElementsPanel)}
                @mouseenter=${() => this.#frame?.highlight()}
                @mouseleave=${() => SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight()}
                @click=${() => Common.Revealer.reveal(linkTargetDOMNode)}
                jslog=${VisualLogging.action('reveal-in-elements').track({ click: true })}
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
    #maybeRenderCreationStacktrace() {
        const creationStackTraceData = this.#frame?.getCreationStackTraceData();
        if (creationStackTraceData?.creationStackTrace) {
            // Disabled until https://crbug.com/1079231 is fixed.
            // clang-format off
            return html `
        <devtools-report-key title=${i18nString(UIStrings.creationStackTraceExplanation)}>${i18nString(UIStrings.creationStackTrace)}</devtools-report-key>
        <devtools-report-value
        jslog=${VisualLogging.section('frame-creation-stack-trace')}
        >
          <devtools-resources-stack-trace .data=${{
                frame: this.#frame,
                buildStackTraceRows: Components.JSPresentationUtils.buildStackTraceRowsForLegacyRuntimeStackTrace,
            }}>
          </devtools-resources-stack-trace>
        </devtools-report-value>
      `;
            // clang-format on
        }
        return Lit.nothing;
    }
    #getAdFrameTypeStrings(type) {
        switch (type) {
            case "child" /* Protocol.Page.AdFrameType.Child */:
                return { value: i18nString(UIStrings.child), description: i18nString(UIStrings.childDescription) };
            case "root" /* Protocol.Page.AdFrameType.Root */:
                return { value: i18nString(UIStrings.root), description: i18nString(UIStrings.rootDescription) };
        }
    }
    #getAdFrameExplanationString(explanation) {
        switch (explanation) {
            case "CreatedByAdScript" /* Protocol.Page.AdFrameExplanation.CreatedByAdScript */:
                return i18nString(UIStrings.createdByAdScriptExplanation);
            case "MatchedBlockingRule" /* Protocol.Page.AdFrameExplanation.MatchedBlockingRule */:
                return i18nString(UIStrings.matchedBlockingRuleExplanation);
            case "ParentIsAd" /* Protocol.Page.AdFrameExplanation.ParentIsAd */:
                return i18nString(UIStrings.parentIsAdExplanation);
        }
    }
    #maybeRenderAdStatus() {
        if (!this.#frame) {
            return Lit.nothing;
        }
        const adFrameType = this.#frame.adFrameType();
        if (adFrameType === "none" /* Protocol.Page.AdFrameType.None */) {
            return Lit.nothing;
        }
        const typeStrings = this.#getAdFrameTypeStrings(adFrameType);
        const rows = [html `<div title=${typeStrings.description}>${typeStrings.value}</div>`];
        for (const explanation of this.#frame.adFrameStatus()?.explanations || []) {
            rows.push(html `<div>${this.#getAdFrameExplanationString(explanation)}</div>`);
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
    #maybeRenderCreatorAdScriptAncestry() {
        if (!this.#frame) {
            return Lit.nothing;
        }
        const adFrameType = this.#frame.adFrameType();
        if (adFrameType === "none" /* Protocol.Page.AdFrameType.None */) {
            return Lit.nothing;
        }
        if (!this.#target || !this.#adScriptAncestry || this.#adScriptAncestry.ancestryChain.length === 0) {
            return Lit.nothing;
        }
        const rows = this.#adScriptAncestry.ancestryChain.map(adScriptId => {
            const adScriptLinkElement = this.#linkifier.linkifyScriptLocation(this.#target, adScriptId.scriptId || null, Platform.DevToolsPath.EmptyUrlString, undefined, undefined);
            adScriptLinkElement?.setAttribute('jslog', `${VisualLogging.link('ad-script').track({ click: true })}`);
            return html `<div>${adScriptLinkElement}</div>`;
        });
        const shouldRenderFilterlistRule = (this.#adScriptAncestry.rootScriptFilterlistRule !== undefined);
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
        <devtools-report-value jslog=${VisualLogging.section('root-script-filterlist-rule')}>${this.#adScriptAncestry.rootScriptFilterlistRule}</devtools-report-value>
      ` : Lit.nothing}
    `;
        // clang-format on
    }
    #renderIsolationSection() {
        if (!this.#frame) {
            return Lit.nothing;
        }
        return html `
      <devtools-report-section-header>${i18nString(UIStrings.securityIsolation)}</devtools-report-section-header>
      <devtools-report-key>${i18nString(UIStrings.secureContext)}</devtools-report-key>
      <devtools-report-value>
        ${this.#frame.isSecureContext() ? i18nString(UIStrings.yes) : i18nString(UIStrings.no)}\xA0${this.#maybeRenderSecureContextExplanation()}
      </devtools-report-value>
      <devtools-report-key>${i18nString(UIStrings.crossoriginIsolated)}</devtools-report-key>
      <devtools-report-value>
        ${this.#frame.isCrossOriginIsolated() ? i18nString(UIStrings.yes) : i18nString(UIStrings.no)}
      </devtools-report-value>
      ${Lit.Directives.until(this.#maybeRenderCoopCoepCSPStatus(), Lit.nothing)}
      <devtools-report-divider></devtools-report-divider>
    `;
    }
    #maybeRenderSecureContextExplanation() {
        const explanation = this.#getSecureContextExplanation();
        if (explanation) {
            return html `<span class="inline-comment">${explanation}</span>`;
        }
        return Lit.nothing;
    }
    #getSecureContextExplanation() {
        switch (this.#frame?.getSecureContextType()) {
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
    async #maybeRenderCoopCoepCSPStatus() {
        if (this.#frame) {
            const model = this.#frame.resourceTreeModel().target().model(SDK.NetworkManager.NetworkManager);
            const info = model && await model.getSecurityIsolationStatus(this.#frame.id);
            if (info) {
                return html `
          ${this.#maybeRenderCrossOriginStatus(info.coep, i18n.i18n.lockedString('Cross-Origin Embedder Policy (COEP)'), "None" /* Protocol.Network.CrossOriginEmbedderPolicyValue.None */)}
          ${this.#maybeRenderCrossOriginStatus(info.coop, i18n.i18n.lockedString('Cross-Origin Opener Policy (COOP)'), "UnsafeNone" /* Protocol.Network.CrossOriginOpenerPolicyValue.UnsafeNone */)}
          ${this.#renderCSPSection(info.csp)}
        `;
            }
        }
        return Lit.nothing;
    }
    #maybeRenderCrossOriginStatus(info, policyName, noneValue) {
        if (!info) {
            return Lit.nothing;
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
        ${isReportOnly ? html `<span class="inline-comment">report-only</span>` : Lit.nothing}
        ${endpoint ? html `<span class="inline-name">${i18nString(UIStrings.reportingTo)}</span>${endpoint}` : Lit.nothing}
      </devtools-report-value>
    `;
    }
    #renderEffectiveDirectives(directives) {
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
    #renderSingleCSP(cspInfo, divider) {
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        return html `
      <devtools-report-key>
        ${cspInfo.isEnforced ? i18n.i18n.lockedString('Content-Security-Policy') : html `
          ${i18n.i18n.lockedString('Content-Security-Policy-Report-Only')}
          <devtools-button
            .iconName=${'help'}
            class='help-button'
            .variant=${"icon" /* Buttons.Button.Variant.ICON */}
            .size=${"SMALL" /* Buttons.Button.Size.SMALL */}
            @click=${() => { window.location.href = 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy-Report-Only'; }}
            jslog=${VisualLogging.link('learn-more.csp-report-only').track({ click: true })}
            ></devtools-button>`}
      </devtools-report-key>
      <devtools-report-value>
        ${cspInfo.source === "HTTP" /* Protocol.Network.ContentSecurityPolicySource.HTTP */ ?
            i18n.i18n.lockedString('HTTP header') : i18n.i18n.lockedString('Meta tag')}
        ${this.#renderEffectiveDirectives(cspInfo.effectiveDirectives)}
      </devtools-report-value>
      ${divider ? html `<devtools-report-divider class="subsection-divider"></devtools-report-divider>` : Lit.nothing}
    `;
        // clang-format on
    }
    #renderCSPSection(cspInfos) {
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        return html `
      <devtools-report-divider></devtools-report-divider>
      <devtools-report-section-header>
        ${i18nString(UIStrings.contentSecurityPolicy)}
      </devtools-report-section-header>
      ${(cspInfos?.length) ? cspInfos.map((cspInfo, index) => this.#renderSingleCSP(cspInfo, index < cspInfos?.length - 1)) : html `
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
    #renderApiAvailabilitySection() {
        if (!this.#frame) {
            return Lit.nothing;
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
          <x-link
            href="https://web.dev/why-coop-coep/" class="link"
            jslog=${VisualLogging.link('learn-more.coop-coep').track({ click: true })}>
            ${i18nString(UIStrings.learnMore)}
          </x-link>
        </span>
      </devtools-report-section>
      ${this.#renderSharedArrayBufferAvailability()}
      ${this.#renderMeasureMemoryAvailability()}
      <devtools-report-divider></devtools-report-divider>`;
        // clang-format on
    }
    #renderSharedArrayBufferAvailability() {
        if (this.#frame) {
            const features = this.#frame.getGatedAPIFeatures();
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
                            return Lit.nothing;
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
                    return Lit.nothing;
                }
                // SharedArrayBuffer is an API name, so we don't translate it.
                return html `
          <devtools-report-key>SharedArrayBuffers</devtools-report-key>
          <devtools-report-value title=${tooltipText}>
            ${availabilityText}\xA0${renderHint(this.#frame)}
          </devtools-report-value>
        `;
            }
        }
        return Lit.nothing;
    }
    #renderMeasureMemoryAvailability() {
        if (this.#frame) {
            const measureMemoryAvailable = this.#frame.isCrossOriginIsolated();
            const availabilityText = measureMemoryAvailable ? i18nString(UIStrings.available) : i18nString(UIStrings.unavailable);
            const tooltipText = measureMemoryAvailable ? i18nString(UIStrings.thePerformanceAPI) :
                i18nString(UIStrings.thePerformancemeasureuseragentspecificmemory);
            return html `
        <devtools-report-key>${i18nString(UIStrings.measureMemory)}</devtools-report-key>
        <devtools-report-value>
          <span title=${tooltipText}>${availabilityText}</span>\xA0<x-link class="link" href="https://web.dev/monitor-total-page-memory-usage/" jslog=${VisualLogging.link('learn-more.monitor-memory-usage').track({ click: true })}>${i18nString(UIStrings.learnMore)}</x-link>
        </devtools-report-value>
      `;
        }
        return Lit.nothing;
    }
    #renderAdditionalInfoSection() {
        if (!this.#frame) {
            return Lit.nothing;
        }
        return html `
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
//# sourceMappingURL=FrameDetailsView.js.map