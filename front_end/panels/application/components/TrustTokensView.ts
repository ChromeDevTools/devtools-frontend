// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as DataGrid from '../../../ui/components/data_grid/data_grid.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as LegacyWrapper from '../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import trustTokensViewStyles from './trustTokensView.css.js';

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
   * @description Text shown instead of a table when the table would be empty.
   */
  noTrustTokensStored: 'No private state tokens are currently stored.',
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
};
const str_ = i18n.i18n.registerUIStrings('panels/application/components/TrustTokensView.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface TrustTokensViewData {
  tokens: Protocol.Storage.TrustTokens[];
  deleteClickHandler: (issuerOrigin: string) => void;
}

const coordinator = RenderCoordinator.RenderCoordinator.RenderCoordinator.instance();

/** Fetch the Trust Token data regularly from the backend while the panel is open */
const REFRESH_INTERVAL_MS = 1000;

export class TrustTokensView extends LegacyWrapper.LegacyWrapper.WrappableComponent {
  static readonly litTagName = LitHtml.literal`devtools-trust-tokens-storage-view`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  #deleteClickHandler(issuerOrigin: string): void {
    const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    void mainTarget?.storageAgent().invoke_clearTrustTokens({issuerOrigin});
  }

  connectedCallback(): void {
    this.wrapper?.contentElement.classList.add('vbox');
    this.#shadow.adoptedStyleSheets = [trustTokensViewStyles];
    void this.render();
  }

  override async render(): Promise<void> {
    const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!mainTarget) {
      return;
    }
    const {tokens} = await mainTarget.storageAgent().invoke_getTrustTokens();

    await coordinator.write('Render TrustTokensView', () => {
      // clang-format off
      LitHtml.render(LitHtml.html`
        <div>
          <span class="heading">${i18nString(UIStrings.trustTokens)}</span>
          <${IconButton.Icon.Icon.litTagName} name="info" title=${i18nString(UIStrings.allStoredTrustTokensAvailableIn)}></${IconButton.Icon.Icon.litTagName}>
          ${this.#renderGridOrNoDataMessage(tokens)}
        </div>
      `, this.#shadow, {host: this});
      // clang-format on
      if (this.isConnected) {
        setTimeout(() => this.render(), REFRESH_INTERVAL_MS);
      }
    });
  }

  #renderGridOrNoDataMessage(tokens: Protocol.Storage.TrustTokens[]): LitHtml.TemplateResult {
    if (tokens.length === 0) {
      return LitHtml.html`<div class="no-tt-message">${i18nString(UIStrings.noTrustTokensStored)}</div>`;
    }

    const gridData: DataGrid.DataGridController.DataGridControllerData = {
      columns: [
        {
          id: 'issuer',
          title: i18nString(UIStrings.issuer),
          widthWeighting: 10,
          hideable: false,
          visible: true,
          sortable: true,
        },
        {
          id: 'count',
          title: i18nString(UIStrings.storedTokenCount),
          widthWeighting: 5,
          hideable: false,
          visible: true,
          sortable: true,
        },
        {
          id: 'delete-button',
          title: '',
          widthWeighting: 1,
          hideable: false,
          visible: true,
          sortable: false,
        },
      ],
      rows: this.#buildRowsFromTokens(tokens),
      initialSort: {
        columnId: 'issuer',
        direction: DataGrid.DataGridUtils.SortDirection.ASC,
      },
    };

    return LitHtml.html`
      <${DataGrid.DataGridController.DataGridController.litTagName} .data=${
        gridData as DataGrid.DataGridController.DataGridControllerData}></${
        DataGrid.DataGridController.DataGridController.litTagName}>
    `;
  }

  #buildRowsFromTokens(tokens: Protocol.Storage.TrustTokens[]): DataGrid.DataGridUtils.Row[] {
    return tokens.filter(token => token.count > 0)
        .map(token => ({
               cells: [
                 {
                   columnId: 'delete-button',
                   value: removeTrailingSlash(token.issuerOrigin),
                   renderer: this.#deleteButtonRendererForDataGridCell.bind(this),
                 },
                 {columnId: 'issuer', value: removeTrailingSlash(token.issuerOrigin)},
                 {columnId: 'count', value: token.count},
               ],
             }));
  }

  #deleteButtonRendererForDataGridCell(issuer: DataGrid.DataGridUtils.CellValue): LitHtml.TemplateResult {
    // clang-format off
    return LitHtml.html`
      <${Buttons.Button.Button.litTagName} .iconName=${'bin'}
                                           .jslogContext=${'delete-all'}
                                           .size=${Buttons.Button.Size.SMALL}
                                           .title=${i18nString(UIStrings.deleteTrustTokens, {PH1: issuer as string})}
                                           .variant=${Buttons.Button.Variant.ICON}
                                           @click=${this.#deleteClickHandler.bind(this, issuer as string)}></${Buttons.Button.Button.litTagName}>
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
