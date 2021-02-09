// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../sdk/sdk.js';
import * as LitHtml from '../third_party/lit-html/lit-html.js';
import * as Components from '../ui/components/components.js';
import * as UI from '../ui/ui.js';

import type {ResourcesPanel} from './ResourcesPanel.js';

import {ApplicationPanelTreeElement} from './ApplicationPanelTreeElement.js';

import * as i18n from '../i18n/i18n.js';
export const UIStrings = {
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
};
const str_ = i18n.i18n.registerUIStrings('resources/TrustTokensView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
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

class TrustTokensViewWidgetWrapper extends UI.Widget.VBox {
  private readonly trustTokensView = new TrustTokensView();

  constructor() {
    super();
    this.contentElement.appendChild(this.trustTokensView);
  }

  async wasShown(): Promise<void> {
    const mainTarget = SDK.SDKModel.TargetManager.instance().mainTarget();
    if (!mainTarget) {
      return;
    }

    const {tokens} = await mainTarget.storageAgent().invoke_getTrustTokens();
    this.trustTokensView.data = {tokens};
  }
}

export interface TrustTokensViewData {
  tokens: Protocol.Storage.TrustTokens[];
}

export class TrustTokensView extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private tokens: Protocol.Storage.TrustTokens[] = [];

  connectedCallback(): void {
    this.render();
  }

  set data(data: TrustTokensViewData) {
    this.tokens = data.tokens;
    this.render();
  }

  private render(): void {
    const gridData: Components.DataGridController.DataGridControllerData = {
      columns: [
        {
          id: 'issuer',
          title: i18nString(UIStrings.issuer),
          widthWeighting: 2,
          hideable: false,
          visible: true,
          sortable: true,
        },
        {
          id: 'count',
          title: i18nString(UIStrings.storedTokenCount),
          widthWeighting: 1,
          hideable: false,
          visible: true,
          sortable: true,
        },
      ],
      rows: this.buildRowsFromTokens(),
      initialSort: {
        columnId: 'issuer',
        direction: Components.DataGridUtils.SortDirection.ASC,
      },
    };

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
      </style>
      <div>
        <span class="heading">Trust Tokens</span>
        <devtools-icon class="info-icon" title=${i18nString(UIStrings.allStoredTrustTokensAvailableIn)}
          .data=${
            {iconName: 'ic_info_black_18dp', color: 'var(--color-link)', width: '14px'} as
            Components.Icon.IconWithName}>
        </devtools-icon>
        <devtools-data-grid-controller .data=${
            gridData as Components.DataGridController.DataGridControllerData}></devtools-data-grid-controller>
      </div>
    `,
        this.shadow);
  }

  private buildRowsFromTokens(): Components.DataGridUtils.Row[] {
    const tokens = this.tokens.filter(token => token.count > 0);
    return tokens.map(token => ({
                        cells: [
                          {columnId: 'issuer', value: removeTrailingSlash(token.issuerOrigin)},
                          {columnId: 'count', value: token.count},
                        ],
                      }));
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
