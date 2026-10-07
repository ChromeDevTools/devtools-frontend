// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/kit/kit.js';
import '../../../ui/legacy/components/data_grid/data_grid.js';

import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import trustTokensViewStyles from './trustTokensView.css.js';

const PRIVATE_STATE_TOKENS_EXPLANATION_URL =
    'https://developers.google.com/privacy-sandbox/protections/private-state-tokens';

const {html} = Lit;

const UIStrings = {
  /**
   * @description Column header for the token issuer in the private state tokens table in the Application panel.
   */
  issuer: 'Issuer',
  /**
   * @description Column header for the stored token count in the private state tokens table in the Application panel.
   */
  storedTokenCount: 'Stored token count',
  /**
   * @description Tooltip text for the info icon in the private state tokens view of the Application panel.
   */
  allStoredTrustTokensAvailableIn: 'All stored private state tokens available in this browser instance',
  /**
   * @description Header text when there are no private state tokens to display in the private state tokens view of the Application panel.
   */
  noTrustTokens: 'No private state tokens detected',
  /**
   * @description Description text when there are no private state tokens to display in the private state tokens view of the Application panel.
   */
  trustTokensDescription:
      'On this page you can view all available private state tokens in the current browsing context',
  /**
   * @description Tooltip text for the button to delete private state tokens issued by a site in the private state tokens view of the Application panel.
   * @example {https://google.com} PH1
   */
  deleteTrustTokens: 'Delete all stored private state tokens issued by {PH1}',
  /**
   * @description Title for the private state tokens view in the Application panel.
   */
  trustTokens: 'Private state tokens',
  /**
   * @description Link text to learn more about private state tokens in the private state tokens view of the Application panel.
   */
  learnMore: 'Learn more',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/application/components/TrustTokensView.ts', UIStrings);
export const i18nString: i18n.LocalizeString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface TrustTokensViewInput {
  tokens: Protocol.Storage.TrustTokens[];
  deleteClickHandler: (issuerOrigin: string) => void;
}

/** Fetch the Trust Token data regularly from the backend while the panel is open */
const REFRESH_INTERVAL_MS = 1000;

function renderGridOrNoDataMessage(input: TrustTokensViewInput): Lit.TemplateResult {
  if (input.tokens.length === 0) {
    // clang-format off
      return html`
        <div jslog=${VisualLogging.pane('trust-tokens')}>
          <div class="empty-state" jslog=${VisualLogging.section().context('empty-view')}>
            <div class="empty-state-header">${i18nString(UIStrings.noTrustTokens)}</div>
            <div class="empty-state-description">
              <span>${i18nString(UIStrings.trustTokensDescription)}</span>
              <devtools-link
                class="devtools-link"
                href=${PRIVATE_STATE_TOKENS_EXPLANATION_URL}
                .jslogContext=${'learn-more'}
              >${i18nString(UIStrings.learnMore)}</devtools-link>
            </div>
          </div>
        </div>
      `;
    // clang-format on
  }

  // clang-format off
    return html`
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
                                    @click=${() =>input.deleteClickHandler(removeTrailingSlash(token.issuerOrigin))}></devtools-button>
                  </td>
                </tr>
              `)}
          </table>
        </devtools-data-grid>
      </div>
    `;
  // clang-format on
}

type View = (input: TrustTokensViewInput, output: undefined, target: HTMLElement) => void;

const DEFAULT_VIEW: View = (input, output, target) => {
  // clang-format off
  Lit.render(html`
    <style>${trustTokensViewStyles}</style>
    <style>${UI.inspectorCommonStyles}</style>
    ${renderGridOrNoDataMessage(input)}
  `, target);
  // clang-format on
};

export class TrustTokensView extends UI.Widget.VBox {
  #updateInterval = 0;
  #tokens: Protocol.Storage.TrustTokens[] = [];
  #view: View;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element, {useShadowDom: true});
    this.#view = view;
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
    this.#updateInterval = window.setInterval(this.requestUpdate.bind(this), REFRESH_INTERVAL_MS);
  }

  override willHide(): void {
    super.willHide();
    window.clearInterval(this.#updateInterval);
    this.#updateInterval = 0;
  }

  override async performUpdate(): Promise<void> {
    const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!mainTarget) {
      return;
    }
    const {tokens} = await mainTarget.storageAgent().invoke_getTrustTokens();
    tokens.sort((a, b) => a.issuerOrigin.localeCompare(b.issuerOrigin));
    this.#tokens = tokens;
    this.#view(
        {tokens: this.#tokens, deleteClickHandler: this.#deleteClickHandler.bind(this)}, undefined,
        this.contentElement);
  }

  #deleteClickHandler(issuerOrigin: string): void {
    const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    void mainTarget?.storageAgent().invoke_clearTrustTokens({issuerOrigin});
  }
}

function removeTrailingSlash(s: string): string {
  return s.replace(/\/$/, '');
}
