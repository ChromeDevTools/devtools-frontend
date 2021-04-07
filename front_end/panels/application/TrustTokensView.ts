// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as LitHtml from '../../third_party/lit-html/lit-html.js';
import * as Components from '../../ui/components/components.js';
import * as UI from '../../ui/legacy/legacy.js';

import type {ResourcesPanel} from './ResourcesPanel.js';

import {ApplicationPanelTreeElement} from './ApplicationPanelTreeElement.js';

const UIStrings = {
  /**
  *@description Hover text for an info icon in the Trust Token panel
  */
  trustTokens: 'Trust Tokens',
  /**
  *@description Text for the issuer of an item
  */
  issuer: 'Issuer',
  /**
  *@description Column header for Trust Token table
  */
  storedTokenCount: 'Stored token count',
  /**
  *@description Hover text for an info icon in the Trust Token panel
  */
  allStoredTrustTokensAvailableIn: 'All stored Trust Tokens available in this browser instance.',
  /**
   * @description Text shown instead of a table when the table would be empty.
   */
  noTrustTokensStored: 'No Trust Tokens are currently stored.',
  /**
   * @description Each row in the Trust Token table has a delete button. This is the text shown
   * when hovering over this button. The placeholder is a normal URL, indicating the site which
   * provided the Trust Tokens that will be deleted when the button is clicked.
   * @example {https://google.com} PH1
   */
  deleteTrustTokens: 'Delete all stored Trust Tokens issued by {PH1}.',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/TrustTokensView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

/** Fetch the Trust Token data regularly from the backend while the panel is open */
const REFRESH_INTERVAL_MS = 1000;

export class TrustTokensTreeElement extends ApplicationPanelTreeElement {
  private view?: TrustTokensViewWidgetWrapper;

  constructor(storagePanel: ResourcesPanel) {
    super(storagePanel, i18nString(UIStrings.trustTokens), false);
    const icon = UI.Icon.Icon.create('mediumicon-database', 'resource-tree-item');
    this.setLeadingIcons([icon]);
  }

  get itemURL(): string {
    return 'trustTokens://';
  }

  onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    if (!this.view) {
      this.view = new TrustTokensViewWidgetWrapper();
    }
    this.showView(this.view);
    return false;
  }
}

class TrustTokensViewWidgetWrapper extends UI.ThrottledWidget.ThrottledWidget {
  private readonly trustTokensView = new TrustTokensView();

  constructor() {
    super(/* isWebComponent */ false, REFRESH_INTERVAL_MS);
    this.contentElement.appendChild(this.trustTokensView);
    this.update();
  }

  protected async doUpdate(): Promise<void> {
    const mainTarget = SDK.SDKModel.TargetManager.instance().mainTarget();
    if (!mainTarget) {
      return;
    }
    const {tokens} = await mainTarget.storageAgent().invoke_getTrustTokens();
    this.trustTokensView.data = {
      tokens,
      deleteClickHandler: (issuer: string): void => {
        mainTarget.storageAgent().invoke_clearTrustTokens({issuerOrigin: issuer});
      },
    };

    this.update();
  }
}

export interface TrustTokensViewData {
  tokens: Protocol.Storage.TrustTokens[];
  deleteClickHandler: (issuerOrigin: string) => void;
}

export class TrustTokensView extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private tokens: Protocol.Storage.TrustTokens[] = [];
  private deleteClickHandler: (issuerOrigin: string) => void = () => {};

  connectedCallback(): void {
    this.render();
  }

  set data(data: TrustTokensViewData) {
    this.tokens = data.tokens;
    this.deleteClickHandler = data.deleteClickHandler;
    this.render();
  }

  private render(): void {
    LitHtml.render(
        LitHtml.html`
      <style>
        :host {
          padding: 20px;
        }

        .heading {
          font-size: 15px;
        }

        devtools-data-grid-controller {
          border: 1px solid var(--color-details-hairline);
          margin-top: 20px;
        }

        .info-icon {
          vertical-align: text-bottom;
          height: 14px;
        }

        .no-tt-message {
          margin-top: 20px;
        }
      </style>
      <div>
        <span class="heading">Trust Tokens</span>
        <devtools-icon class="info-icon" title=${i18nString(UIStrings.allStoredTrustTokensAvailableIn)}
          .data=${
            {iconName: 'ic_info_black_18dp', color: 'var(--color-link)', width: '14px'} as
            Components.Icon.IconWithName}>
        </devtools-icon>
        ${this.renderGridOrNoDataMessage()}
      </div>
    `,
        this.shadow);
  }

  private renderGridOrNoDataMessage(): LitHtml.TemplateResult {
    if (this.tokens.length === 0) {
      return LitHtml.html`<div class="no-tt-message">${i18nString(UIStrings.noTrustTokensStored)}</div>`;
    }

    const gridData: Components.DataGridController.DataGridControllerData = {
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
      rows: this.buildRowsFromTokens(),
      initialSort: {
        columnId: 'issuer',
        direction: Components.DataGridUtils.SortDirection.ASC,
      },
    };

    return LitHtml.html`
      <devtools-data-grid-controller .data=${
        gridData as Components.DataGridController.DataGridControllerData}></devtools-data-grid-controller>
    `;
  }

  private buildRowsFromTokens(): Components.DataGridUtils.Row[] {
    const tokens = this.tokens.filter(token => token.count > 0);
    return tokens.map(token => ({
                        cells: [
                          {
                            columnId: 'delete-button',
                            value: removeTrailingSlash(token.issuerOrigin),
                            renderer: this.deleteButtonRenderer.bind(this),
                          },
                          {columnId: 'issuer', value: removeTrailingSlash(token.issuerOrigin)},
                          {columnId: 'count', value: token.count},
                        ],
                      }));
  }

  private deleteButtonRenderer(issuer: Components.DataGridUtils.CellValue): LitHtml.TemplateResult {
    // clang-format off
    return LitHtml.html`
      <style>
        .delete-button {
          width: 16px;
          height: 16px;
          background: transparent;
          overflow: hidden;
          border: none;
          padding: 0;
          outline: none;
          cursor: pointer;
        }

        .delete-button:hover devtools-icon {
          --icon-color: var(--color-text-primary);
        }

        .delete-button:focus devtools-icon {
          --icon-color: var(--color-text-secondary);
        }

        .button-container {
          display: block;
          text-align: center;
        }
      </style>
      <!-- Wrap the button in a container, otherwise we can't center it inside the column. -->
      <span class="button-container">
        <button class="delete-button"
          title=${i18nString(UIStrings.deleteTrustTokens, {PH1: issuer as string})}
          @click=${(): void => this.deleteClickHandler(issuer as string)}>
          <devtools-icon .data=${
        {iconName: 'trash_bin_icon', color: 'var(--color-text-secondary)', width: '9px', height: '14px'} as
        Components.Icon.IconWithName}>
          </devtools-icon>
        </button>
      </span>`;
    // clang-format on
  }
}

function removeTrailingSlash(s: string): string {
  return s.replace(/\/$/, '');
}

customElements.define('devtools-trust-tokens-storage-view', TrustTokensView);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-trust-tokens-storage-view': TrustTokensView;
  }
}
