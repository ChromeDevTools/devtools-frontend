// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import '../../../ui/components/icon_button/icon_button.js';
import '../../../ui/components/report_view/report_view.js';
import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as NetworkForward from '../../../panels/network/forward/forward.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import permissionsPolicySectionStyles from './permissionsPolicySection.css.js';
const { html } = Lit;
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
    jslog=${VisualLogging.action().track({ click: true }).context(jsLogContext)}></devtools-button>
  `;
    // clang-format on
}
export class PermissionsPolicySection extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #permissionsPolicySectionData = { policies: [], showDetails: false };
    set data(data) {
        this.#permissionsPolicySectionData = data;
        void this.#render();
    }
    #toggleShowPermissionsDisallowedDetails() {
        this.#permissionsPolicySectionData.showDetails = !this.#permissionsPolicySectionData.showDetails;
        void this.#render();
    }
    #renderAllowed() {
        const allowed = this.#permissionsPolicySectionData.policies.filter(p => p.allowed).map(p => p.feature).sort();
        if (!allowed.length) {
            return Lit.nothing;
        }
        return html `
      <devtools-report-key>${i18nString(UIStrings.allowedFeatures)}</devtools-report-key>
      <devtools-report-value>
        ${allowed.join(', ')}
      </devtools-report-value>
    `;
    }
    async #renderDisallowed() {
        const disallowed = this.#permissionsPolicySectionData.policies.filter(p => !p.allowed)
            .sort((a, b) => a.feature.localeCompare(b.feature));
        if (!disallowed.length) {
            return Lit.nothing;
        }
        if (!this.#permissionsPolicySectionData.showDetails) {
            return html `
        <devtools-report-key>${i18nString(UIStrings.disabledFeatures)}</devtools-report-key>
        <devtools-report-value>
          ${disallowed.map(p => p.feature).join(', ')}
          <devtools-button
          class="disabled-features-button"
          .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}
          @click=${() => this.#toggleShowPermissionsDisallowedDetails()}
          jslog=${VisualLogging.action('show-disabled-features-details').track({
                click: true,
            })}>${i18nString(UIStrings.showDetails)}
        </devtools-button>
        </devtools-report-value>
      `;
        }
        const frameManager = SDK.FrameManager.FrameManager.instance();
        const featureRows = await Promise.all(disallowed.map(async (policy) => {
            const frame = policy.locator ? frameManager.getFrame(policy.locator.frameId) : null;
            const blockReason = policy.locator?.blockReason;
            const linkTargetDOMNode = await (blockReason === "IframeAttribute" /* Protocol.Page.PermissionsPolicyBlockReason.IframeAttribute */ &&
                frame?.getOwnerDOMNodeOrDocument());
            const resource = frame?.resourceForURL(frame.url);
            const linkTargetRequest = blockReason === "Header" /* Protocol.Page.PermissionsPolicyBlockReason.Header */ && resource?.request;
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
            const revealHeader = async () => {
                if (!linkTargetRequest) {
                    return;
                }
                const headerName = linkTargetRequest.responseHeaderValue('permissions-policy') ? 'permissions-policy' : 'feature-policy';
                const requestLocation = NetworkForward.UIRequestLocation.UIRequestLocation.responseHeaderMatch(linkTargetRequest, { name: headerName, value: '' });
                await Common.Revealer.reveal(requestLocation);
            };
            // Disabled until https://crbug.com/1079231 is fixed.
            // clang-format off
            return html `
        <div class="permissions-row">
          <div>
            <devtools-icon class="allowed-icon extra-large" name="cross-circle">
            </devtools-icon>
          </div>
          <div class="feature-name text-ellipsis">
            ${policy.feature}
          </div>
          <div class="block-reason">${blockReasonText}</div>
          <div>
            ${linkTargetDOMNode ? renderIconLink('code-circle', i18nString(UIStrings.clickToShowIframe), () => Common.Revealer.reveal(linkTargetDOMNode), 'reveal-in-elements') :
                Lit.nothing}
            ${linkTargetRequest ? renderIconLink('arrow-up-down-circle', i18nString(UIStrings.clickToShowHeader), revealHeader, 'reveal-in-network') :
                Lit.nothing}
          </div>
        </div>
      `;
            // clang-format on
        }));
        return html `
      <devtools-report-key>${i18nString(UIStrings.disabledFeatures)}</devtools-report-key>
      <devtools-report-value class="policies-list">
        ${featureRows}
        <div class="permissions-row">
        <devtools-button
          .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}
          @click=${() => this.#toggleShowPermissionsDisallowedDetails()}
          jslog=${VisualLogging.action('hide-disabled-features-details').track({
            click: true,
        })}>${i18nString(UIStrings.hideDetails)}
        </devtools-button>
        </div>
      </devtools-report-value>
    `;
    }
    async #render() {
        await RenderCoordinator.write('PermissionsPolicySection render', () => {
            // Disabled until https://crbug.com/1079231 is fixed.
            // clang-format off
            Lit.render(html `
          <style>${permissionsPolicySectionStyles}</style>
          <devtools-report-section-header>${i18n.i18n.lockedString('Permissions Policy')}</devtools-report-section-header>
          ${this.#renderAllowed()}
          ${(this.#permissionsPolicySectionData.policies.findIndex(p => p.allowed) > 0 ||
                this.#permissionsPolicySectionData.policies.findIndex(p => !p.allowed) > 0) ?
                html `<devtools-report-divider class="subsection-divider"></devtools-report-divider>` : Lit.nothing}
          ${Lit.Directives.until(this.#renderDisallowed(), Lit.nothing)}
          <devtools-report-divider></devtools-report-divider>
        `, this.#shadow, { host: this });
            // clang-format on
        });
    }
}
customElements.define('devtools-resources-permissions-policy-section', PermissionsPolicySection);
//# sourceMappingURL=PermissionsPolicySection.js.map