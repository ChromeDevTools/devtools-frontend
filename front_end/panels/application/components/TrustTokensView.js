// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../../ui/kit/kit.js';
import '../../../ui/legacy/components/data_grid/data_grid.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import trustTokensViewStyles from './trustTokensView.css.js';
const PRIVATE_STATE_TOKENS_EXPLANATION_URL = 'https://developers.google.com/privacy-sandbox/protections/private-state-tokens';
const { html } = Lit;
const UIStrings = {
    /**
     * @description Text for the issuer of an item
     */
    issuer: 'Issuer',
    /**
     * @description Column header for Trust Token table
     */
    storedTokenCount: 'Stored token count',
    /**
     * @description Hover text for an info icon in the Private State Token panel
     */
    allStoredTrustTokensAvailableIn: 'All stored private state tokens available in this browser instance.',
    /**
     * @description Text shown instead of a table when the table would be empty. https://developers.google.com/privacy-sandbox/protections/private-state-tokens
     */
    noTrustTokens: 'No private state tokens detected',
    /**
     * @description Text shown if there are no private state tokens. https://developers.google.com/privacy-sandbox/protections/private-state-tokens
     */
    trustTokensDescription: 'On this page you can view all available private state tokens in the current browsing context.',
    /**
     * @description Each row in the Private State Token table has a delete button. This is the text shown
     * when hovering over this button. The placeholder is a normal URL, indicating the site which
     * provided the Private State Tokens that will be deleted when the button is clicked.
     * @example {https://google.com} PH1
     */
    deleteTrustTokens: 'Delete all stored private state tokens issued by {PH1}.',
    /**
     * @description Heading label for a view. Previously known as 'Trust Tokens'.
     */
    trustTokens: 'Private state tokens',
    /**
     * @description Text used in a link to learn more about the topic.
     */
    learnMore: 'Learn more',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/components/TrustTokensView.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/** Fetch the Trust Token data regularly from the backend while the panel is open */
const REFRESH_INTERVAL_MS = 1000;
function renderGridOrNoDataMessage(input) {
    if (input.tokens.length === 0) {
        // clang-format off
        return html `
        <div jslog=${VisualLogging.pane('trust-tokens')}>
          <div class="empty-state" jslog=${VisualLogging.section().context('empty-view')}>
            <div class="empty-state-header">${i18nString(UIStrings.noTrustTokens)}</div>
            <div class="empty-state-description">
              <span>${i18nString(UIStrings.trustTokensDescription)}</span>
              <x-link
                class="x-link devtools-link"
                href=${PRIVATE_STATE_TOKENS_EXPLANATION_URL}
                jslog=${VisualLogging.link()
            .track({ click: true, keydown: 'Enter|Space' })
            .context('learn-more')}
              >${i18nString(UIStrings.learnMore)}</x-link>
            </div>
          </div>
        </div>
      `;
        // clang-format on
    }
    // clang-format off
    return html `
      <div jslog=${VisualLogging.pane('trust-tokens')}>
        <span class="heading">${i18nString(UIStrings.trustTokens)}</span>
        <devtools-icon name="info" title=${i18nString(UIStrings.allStoredTrustTokensAvailableIn)}></devtools-icon>
        <devtools-data-grid striped inline>
          <table>
            <tr>
              <th id="issuer" weight="10" sortable>${i18nString(UIStrings.issuer)}</th>
              <th id="count" weight="5" sortable>${i18nString(UIStrings.storedTokenCount)}</th>
              <th id="delete-button" weight="1" sortable></th>
            </tr>
            ${input.tokens.filter(token => token.count > 0)
        .map(token => html `
                <tr>
                  <td>${removeTrailingSlash(token.issuerOrigin)}</td>
                  <td>${token.count}</td>
                  <td>
                    <devtools-button .iconName=${'bin'}
                                    .jslogContext=${'delete-all'}
                                    .size=${"SMALL" /* Buttons.Button.Size.SMALL */}
                                    .title=${i18nString(UIStrings.deleteTrustTokens, { PH1: removeTrailingSlash(token.issuerOrigin) })}
                                    .variant=${"icon" /* Buttons.Button.Variant.ICON */}
                                    @click=${() => input.deleteClickHandler(removeTrailingSlash(token.issuerOrigin))}></devtools-button>
                  </td>
                </tr>
              `)}
          </table>
        </devtools-data-grid>
      </div>
    `;
    // clang-format on
}
const DEFAULT_VIEW = (input, output, target) => {
    // clang-format off
    Lit.render(html `
    <style>${trustTokensViewStyles}</style>
    <style>${UI.inspectorCommonStyles}</style>
    ${renderGridOrNoDataMessage(input)}
  `, target);
    // clang-format on
};
export class TrustTokensView extends UI.Widget.VBox {
    #updateInterval = 0;
    #tokens = [];
    #view;
    constructor(element, view = DEFAULT_VIEW) {
        super(element, { useShadowDom: true });
        this.#view = view;
    }
    wasShown() {
        super.wasShown();
        this.requestUpdate();
        this.#updateInterval = setInterval(this.requestUpdate.bind(this), REFRESH_INTERVAL_MS);
    }
    willHide() {
        super.willHide();
        clearInterval(this.#updateInterval);
        this.#updateInterval = 0;
    }
    async performUpdate() {
        const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        if (!mainTarget) {
            return;
        }
        const { tokens } = await mainTarget.storageAgent().invoke_getTrustTokens();
        tokens.sort((a, b) => a.issuerOrigin.localeCompare(b.issuerOrigin));
        this.#tokens = tokens;
        this.#view({ tokens: this.#tokens, deleteClickHandler: this.#deleteClickHandler.bind(this) }, undefined, this.contentElement);
    }
    #deleteClickHandler(issuerOrigin) {
        const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        void mainTarget?.storageAgent().invoke_clearTrustTokens({ issuerOrigin });
    }
}
function removeTrailingSlash(s) {
    return s.replace(/\/$/, '');
}
//# sourceMappingURL=TrustTokensView.js.map