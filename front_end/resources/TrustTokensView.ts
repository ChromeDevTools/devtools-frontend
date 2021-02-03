// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import {ls} from '../platform/platform.js';
import * as SDK from '../sdk/sdk.js';
import * as LitHtml from '../third_party/lit-html/lit-html.js';
import * as Components from '../ui/components/components.js';
import * as UI from '../ui/ui.js';

import type {ResourcesPanel} from './ResourcesPanel.js';

import {ApplicationPanelTreeElement} from './ApplicationPanelTreeElement.js';

export class TrustTokensTreeElement extends ApplicationPanelTreeElement {
  private view?: TrustTokensViewWidgetWrapper;

  constructor(storagePanel: ResourcesPanel) {
    super(storagePanel, Common.UIString.UIString('Trust Tokens'), false);
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
    const gridData: Components.DataGrid.DataGridData = {
      columns: [
        {id: 'issuer', title: ls`Issuer`, widthWeighting: 2, hideable: false, visible: true},
        {id: 'count', title: ls`Stored token count`, widthWeighting: 1, hideable: false, visible: true},
      ],
      rows: this.buildRowsFromTokens(),
      activeSort: null,
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

        devtools-data-grid {
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
        <devtools-icon class="info-icon" title=${ls`All stored Trust Tokens available in this browser instance.`}
          .data=${
            {iconName: 'ic_info_black_18dp', color: 'var(--color-link)', width: '14px'} as
            Components.Icon.IconWithName}>
        </devtools-icon>
        <devtools-data-grid .data=${gridData as Components.DataGrid.DataGridData}></devtools-data-grid>
      </div>
    `,
        this.shadow);
  }

  private buildRowsFromTokens(): Components.DataGridUtils.Row[] {
    const tokens = this.tokens.filter(token => token.count > 0);
    return tokens.map(token => ({
                        cells: [
                          {columnId: 'issuer', value: token.issuerOrigin},
                          {columnId: 'count', value: token.count},
                        ],
                      }));
  }
}

customElements.define('devtools-trust-tokens-storage-view', TrustTokensView);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-trust-tokens-storage-view': TrustTokensView;
  }
}
