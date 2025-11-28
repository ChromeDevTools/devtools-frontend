// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../../ui/kit/kit.js';
import '../../../ui/components/report_view/report_view.js';
import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as NetworkForward from '../../../panels/network/forward/forward.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as UI from '../../../ui/legacy/legacy.js';
import { html, nothing, render } from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import permissionsPolicySectionStyles from './permissionsPolicySection.css.js';
const UIStrings = {
    /**
     * @description Label for a button. When clicked more details (for the content this button refers to) will be shown.
     */
    showDetails: 'Show details',
    /**
     * @description Label for a button. When clicked some details (for the content this button refers to) will be hidden.
     */
    hideDetails: 'Hide details',
    /**
     * @description Label for a list of features which are allowed according to the current Permissions policy
     *(a mechanism that allows developers to enable/disable browser features and APIs (e.g. camera, geolocation, autoplay))
     */
    allowedFeatures: 'Allowed Features',
    /**
     * @description Label for a list of features which are disabled according to the current Permissions policy
     *(a mechanism that allows developers to enable/disable browser features and APIs (e.g. camera, geolocation, autoplay))
     */
    disabledFeatures: 'Disabled Features',
    /**
     * @description Tooltip text for a link to a specific request's headers in the Network panel.
     */
    clickToShowHeader: 'Click to reveal the request whose "`Permissions-Policy`" HTTP header disables this feature.',
    /**
     * @description Tooltip text for a link to a specific iframe in the Elements panel (Iframes can be nested, the link goes
     *  to the outer-most iframe which blocks a certain feature).
     */
    clickToShowIframe: 'Click to reveal the top-most iframe which does not allow this feature in the elements panel.',
    /**
     * @description Text describing that a specific feature is blocked by not being included in the iframe's "allow" attribute.
     */
    disabledByIframe: 'missing in iframe "`allow`" attribute',
    /**
     * @description Text describing that a specific feature is blocked by a Permissions Policy specified in a request header.
     */
    disabledByHeader: 'disabled by "`Permissions-Policy`" header',
    /**
     * @description Text describing that a specific feature is blocked by virtue of being inside a fenced frame tree.
     */
    disabledByFencedFrame: 'disabled inside a `fencedframe`',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/components/PermissionsPolicySection.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export function renderIconLink(iconName, title, clickHandler, jsLogContext) {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html `
    <devtools-button
      .iconName=${iconName}
      title=${title}
      aria-label=${title}
      .variant=${"icon" /* Buttons.Button.Variant.ICON */}
      .size=${"SMALL" /* Buttons.Button.Size.SMALL */}
      @click=${clickHandler}
      jslog=${VisualLogging.action().track({ click: true }).context(jsLogContext)}>
    </devtools-button>`;
    // clang-format on
}
function renderAllowed(allowed) {
    if (!allowed.length) {
        return nothing;
    }
    return html `
    <devtools-report-key>${i18nString(UIStrings.allowedFeatures)}</devtools-report-key>
    <devtools-report-value>${allowed.map(({ feature }) => feature).join(', ')}</devtools-report-value>`;
}
function renderDisallowed(data, showDetails, onToggleShowDetails, onRevealDOMNode, onRevealHeader) {
    if (!data.length) {
        return nothing;
    }
    if (!showDetails) {
        // clang-format off
        return html `
      <devtools-report-key>${i18nString(UIStrings.disabledFeatures)}</devtools-report-key>
      <devtools-report-value>
        ${data.map(({ policy }) => policy.feature).join(', ')}
        <devtools-button
            class="disabled-features-button"
            .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}
            @click=${onToggleShowDetails}
            jslog=${VisualLogging.action('show-disabled-features-details').track({ click: true })}>
          ${i18nString(UIStrings.showDetails)}
        </devtools-button>
      </devtools-report-value>`;
        // clang-format on
    }
    const featureRows = data.map(({ policy, blockReason, linkTargetDOMNode, linkTargetRequest }) => {
        const blockReasonText = (() => {
            switch (blockReason) {
                case "IframeAttribute" /* Protocol.Page.PermissionsPolicyBlockReason.IframeAttribute */:
                    return i18nString(UIStrings.disabledByIframe);
                case "Header" /* Protocol.Page.PermissionsPolicyBlockReason.Header */:
                    return i18nString(UIStrings.disabledByHeader);
                case "InFencedFrameTree" /* Protocol.Page.PermissionsPolicyBlockReason.InFencedFrameTree */:
                    return i18nString(UIStrings.disabledByFencedFrame);
                default:
                    return '';
            }
        })();
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        return html `
      <div class="permissions-row">
        <div>
          <devtools-icon class="allowed-icon extra-large" name="cross-circle">
          </devtools-icon>
        </div>
        <div class="feature-name text-ellipsis">${policy.feature}</div>
        <div class="block-reason">${blockReasonText}</div>
        <div>
          ${linkTargetDOMNode ?
            renderIconLink('code-circle', i18nString(UIStrings.clickToShowIframe), () => onRevealDOMNode(linkTargetDOMNode), 'reveal-in-elements') :
            nothing}
          ${linkTargetRequest ?
            renderIconLink('arrow-up-down-circle', i18nString(UIStrings.clickToShowHeader), () => onRevealHeader(linkTargetRequest), 'reveal-in-network') :
            nothing}
        </div>
      </div>`;
        // clang-format on
    });
    // clang-format off
    return html `
    <devtools-report-key>${i18nString(UIStrings.disabledFeatures)}</devtools-report-key>
    <devtools-report-value class="policies-list">
      ${featureRows}
      <div class="permissions-row">
        <devtools-button
            .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}
            @click=${onToggleShowDetails}
            jslog=${VisualLogging.action('hide-disabled-features-details').track({ click: true })}>
          ${i18nString(UIStrings.hideDetails)}
        </devtools-button>
      </div>
    </devtools-report-value>`;
    // clang-format on
}
const DEFAULT_VIEW = (input, output, target) => {
    // clang-format off
    render(html `
    <style>${permissionsPolicySectionStyles}</style>
    <devtools-report-section-header>
      ${i18n.i18n.lockedString('Permissions Policy')}
    </devtools-report-section-header>
    ${renderAllowed(input.allowed)}
    ${(input.allowed.length > 0 && input.disallowed.length > 0) ?
        html `<devtools-report-divider class="subsection-divider"></devtools-report-divider>` : nothing}
    ${renderDisallowed(input.disallowed, input.showDetails, input.onToggleShowDetails, input.onRevealDOMNode, input.onRevealHeader)}
    <devtools-report-divider></devtools-report-divider>`, target);
    // clang-format on
};
export class PermissionsPolicySection extends UI.Widget.Widget {
    #policies = [];
    #showDetails = false;
    #view;
    constructor(element, view = DEFAULT_VIEW) {
        super(element, { useShadowDom: true });
        this.#view = view;
    }
    set policies(policies) {
        this.#policies = policies;
        this.requestUpdate();
    }
    get policies() {
        return this.#policies;
    }
    set showDetails(showDetails) {
        this.#showDetails = showDetails;
        this.requestUpdate();
    }
    get showDetails() {
        return this.#showDetails;
    }
    #toggleShowPermissionsDisallowedDetails() {
        this.showDetails = !this.showDetails;
    }
    async #revealDOMNode(linkTargetDOMNode) {
        await Common.Revealer.reveal(linkTargetDOMNode);
    }
    async #revealHeader(linkTargetRequest) {
        if (!linkTargetRequest) {
            return;
        }
        const headerName = linkTargetRequest.responseHeaderValue('permissions-policy') ? 'permissions-policy' : 'feature-policy';
        const requestLocation = NetworkForward.UIRequestLocation.UIRequestLocation.responseHeaderMatch(linkTargetRequest, { name: headerName, value: '' });
        await Common.Revealer.reveal(requestLocation);
    }
    async performUpdate() {
        const frameManager = SDK.FrameManager.FrameManager.instance();
        const policies = this.#policies.sort((a, b) => a.feature.localeCompare(b.feature));
        const allowed = policies.filter(p => p.allowed).sort((a, b) => a.feature.localeCompare(b.feature));
        const disallowed = policies.filter(p => !p.allowed).sort((a, b) => a.feature.localeCompare(b.feature));
        const disallowedData = this.#showDetails ? await Promise.all(disallowed.map(async (policy) => {
            const frame = policy.locator ? frameManager.getFrame(policy.locator.frameId) : undefined;
            const blockReason = policy.locator?.blockReason;
            const linkTargetDOMNode = await ((blockReason === "IframeAttribute" /* Protocol.Page.PermissionsPolicyBlockReason.IframeAttribute */ &&
                frame?.getOwnerDOMNodeOrDocument()) ||
                undefined);
            const resource = frame?.resourceForURL(frame.url);
            const linkTargetRequest = (blockReason === "Header" /* Protocol.Page.PermissionsPolicyBlockReason.Header */ && resource?.request) || undefined;
            return { policy, blockReason, linkTargetDOMNode, linkTargetRequest };
        })) :
            disallowed.map(policy => ({ policy }));
        this.#view({
            allowed,
            disallowed: disallowedData,
            showDetails: this.#showDetails,
            onToggleShowDetails: this.#toggleShowPermissionsDisallowedDetails.bind(this),
            onRevealDOMNode: this.#revealDOMNode.bind(this),
            onRevealHeader: this.#revealHeader.bind(this),
        }, undefined, this.contentElement);
    }
}
//# sourceMappingURL=PermissionsPolicySection.js.map