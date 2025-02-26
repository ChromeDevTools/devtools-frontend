// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/icon_button/icon_button.js';
import '../../../ui/legacy/components/data_grid/data_grid.js';

import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as LegacyWrapper from '../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
// inspectorCommonStyles is imported for the empty state styling that is used for the start view
// eslint-disable-next-line rulesdir/es-modules-import
import inspectorCommonStylesRaw from '../../../ui/legacy/inspectorCommon.css.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import trustTokensViewStylesRaw from './trustTokensView.css.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const trustTokensViewStyles = new CSSStyleSheet();
trustTokensViewStyles.replaceSync(trustTokensViewStylesRaw.cssContent);

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const inspectorCommonStyles = new CSSStyleSheet();
inspectorCommonStyles.replaceSync(inspectorCommonStylesRaw.cssContent);

const PRIVATE_STATE_TOKENS_EXPLANATION_URL =
    'https://developers.google.com/privacy-sandbox/protections/private-state-tokens';

const {html} = Lit;

const UIStrings = {
  /**
   *@description Text for the issuer of an item
   */
  issuer: 'Issuer',
  /**
   *@description Column header for Trust Token table
   */
  storedTokenCount: 'Stored token count',
  /**
   *@description Hover text for an info icon in the Private State Token panel
   */
  allStoredTrustTokensAvailableIn: 'All stored private state tokens available in this browser instance.',
  /**
   * @description Text shown instead of a table when the table would be empty. https://developers.google.com/privacy-sandbox/protections/private-state-tokens
   */
  noTrustTokens: 'No private state tokens detected',
  /**
   * @description Text shown if there are no private state tokens. https://developers.google.com/privacy-sandbox/protections/private-state-tokens
   */
  trustTokensDescription:
      'On this page you can view all available private state tokens in the current browsing context.',
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
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/application/components/TrustTokensView.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface TrustTokensViewData {
  tokens: Protocol.Storage.TrustTokens[];
  deleteClickHandler: (issuerOrigin: string) => void;
}

/** Fetch the Trust Token data regularly from the backend while the panel is open */
const REFRESH_INTERVAL_MS = 1000;

export class TrustTokensView extends LegacyWrapper.LegacyWrapper.WrappableComponent {
  readonly #shadow = this.attachShadow({mode: 'open'});

  #deleteClickHandler(issuerOrigin: string): void {
    const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    void mainTarget?.storageAgent().invoke_clearTrustTokens({issuerOrigin});
  }

  connectedCallback(): void {
    this.wrapper?.contentElement.classList.add('vbox');
    this.#shadow.adoptedStyleSheets = [trustTokensViewStyles, inspectorCommonStyles];
    void this.render();
  }

  override async render(): Promise<void> {
    const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!mainTarget) {
      return;
    }
    const {tokens} = await mainTarget.storageAgent().invoke_getTrustTokens();
    tokens.sort((a, b) => a.issuerOrigin.localeCompare(b.issuerOrigin));

    await RenderCoordinator.write('Render TrustTokensView', () => {
      // clang-format off
      Lit.render(html`
        ${this.#renderGridOrNoDataMessage(tokens)}
      `, this.#shadow, {host: this});
      // clang-format on
      if (this.isConnected) {
        setTimeout(() => this.render(), REFRESH_INTERVAL_MS);
      }
    });
  }

  #renderGridOrNoDataMessage(tokens: Protocol.Storage.TrustTokens[]): Lit.TemplateResult {
    if (tokens.length === 0) {
      // clang-format off
      return html`
        <div class="empty-state" jslog=${VisualLogging.section().context('empty-view')}>
          <div class="empty-state-header">${i18nString(UIStrings.noTrustTokens)}</div>
          <div class="empty-state-description">
            <span>${i18nString(UIStrings.trustTokensDescription)}</span>
            ${UI.XLink.XLink.create(PRIVATE_STATE_TOKENS_EXPLANATION_URL, i18nString(UIStrings.learnMore), 'x-link', undefined, 'learn-more')}
          </div>
        </div>
      `;
      // clang-format on
    }

    // clang-format off
    return html`
      <div>
        <span class="heading">${i18nString(UIStrings.trustTokens)}</span>
        <devtools-icon name="info" title=${i18nString(UIStrings.allStoredTrustTokensAvailableIn)}></devtools-icon>
        <devtools-data-grid striped inline>
          <table>
            <tr>
              <th id="issuer" weight="10" sortable>${i18nString(UIStrings.issuer)}</th>
              <th id="count" weight="5" sortable>${i18nString(UIStrings.storedTokenCount)}</th>
              <th id="delete-button" weight="1" sortable></th>
            </tr>
            ${tokens.filter(token => token.count > 0)
                  .map(token => html`
                <tr>
                  <td>${removeTrailingSlash(token.issuerOrigin)}</td>
                  <td>${token.count}</td>
                  <td>
                    <devtools-button .iconName=${'bin'}
                                    .jslogContext=${'delete-all'}
                                    .size=${Buttons.Button.Size.SMALL}
                                    .title=${i18nString(UIStrings.deleteTrustTokens, {PH1: removeTrailingSlash(token.issuerOrigin)})}
                                    .variant=${Buttons.Button.Variant.ICON}
                                    @click=${this.#deleteClickHandler.bind(this, removeTrailingSlash(token.issuerOrigin))}></devtools-button>
                  </td>
                </tr>
              `)}
          </table>
        </devtools-data-grid>
      </div>
    `;
    // clang-format on
  }
}

function removeTrailingSlash(s: string): string {
  return s.replace(/\/$/, '');
}

customElements.define('devtools-trust-tokens-storage-view', TrustTokensView);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-trust-tokens-storage-view': TrustTokensView;
  }
}
