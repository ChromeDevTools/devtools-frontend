// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as DataGrid from '../../../ui/components/data_grid/data_grid.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import interestGroupAccessGridStyles from './interestGroupAccessGrid.css.js';

const {html} = LitHtml;

const UIStrings = {
  /**
   *@description Hover text for an info icon in the Interest Group Event panel
   * An interest group is an ad targeting group stored on the browser that can
   * be used to show a certain set of advertisements in the future as the
   * outcome of a FLEDGE auction.
   */
  allInterestGroupStorageEvents: 'All interest group storage events.',
  /**
   *@description Text in InterestGroupStorage Items View of the Application panel
   * Date and time of an Interest Group storage event in a locale-
   * dependent format.
   */
  eventTime: 'Event Time',
  /**
   *@description Text in InterestGroupStorage Items View of the Application panel
   * Type of interest group event such as 'join', 'bid', 'win', or 'leave'.
   */
  eventType: 'Access Type',
  /**
   *@description Text in InterestGroupStorage Items View of the Application panel
   * Owner of the interest group. The origin that controls the
   * content of information associated with the interest group such as which
   * ads get displayed.
   */
  groupOwner: 'Owner',
  /**
   *@description Text in InterestGroupStorage Items View of the Application panel
   * Name of the interest group. The name is unique per-owner and identifies the
   * interest group.
   */
  groupName: 'Name',
  /**
   *@description Text shown instead of a table when the table would be empty.
   */
  noEvents: 'No interest group events recorded.',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/components/InterestGroupAccessGrid.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class InterestGroupAccessGrid extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #datastores: Array<Protocol.Storage.InterestGroupAccessedEvent> = [];

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [interestGroupAccessGridStyles];
    this.#render();
  }

  set data(data: Array<Protocol.Storage.InterestGroupAccessedEvent>) {
    this.#datastores = data;
    this.#render();
  }

  #render(): void {
    // clang-format off
    LitHtml.render(html`
      <div>
        <span class="heading">Interest Groups</span>
        <devtools-icon class="info-icon"
                       title=${i18nString(UIStrings.allInterestGroupStorageEvents)}
                       .data=${{iconName: 'info', color: 'var(--icon-default)', width: '16px'}}>
        </devtools-icon>
        ${this.#renderGridOrNoDataMessage()}
      </div>
    `, this.#shadow, {host: this});
    // clang-format on
  }

  #renderGridOrNoDataMessage(): LitHtml.TemplateResult {
    if (this.#datastores.length === 0) {
      return html`<div class="no-events-message">${i18nString(UIStrings.noEvents)}</div>`;
    }

    const gridData: DataGrid.DataGridController.DataGridControllerData = {
      columns: [
        {
          id: 'event-time',
          title: i18nString(UIStrings.eventTime),
          widthWeighting: 10,
          hideable: false,
          visible: true,
          sortable: true,
        },
        {
          id: 'event-type',
          title: i18nString(UIStrings.eventType),
          widthWeighting: 5,
          hideable: false,
          visible: true,
          sortable: true,
        },
        {
          id: 'event-group-owner',
          title: i18nString(UIStrings.groupOwner),
          widthWeighting: 10,
          hideable: false,
          visible: true,
          sortable: true,
        },
        {
          id: 'event-group-name',
          title: i18nString(UIStrings.groupName),
          widthWeighting: 10,
          hideable: false,
          visible: true,
          sortable: true,
        },
      ],
      rows: this.#buildRows(),
      initialSort: {
        columnId: 'event-time',
        direction: DataGrid.DataGridUtils.SortDirection.ASC,
      },
    };

    return html`
      <devtools-data-grid-controller .data=${gridData}></devtools-data-grid-controller>
    `;
  }

  #buildRows(): DataGrid.DataGridUtils.Row[] {
    return this.#datastores.map(event => ({
                                  cells: [
                                    {
                                      columnId: 'event-time',
                                      value: event.accessTime,
                                      renderer: this.#renderDateForDataGridCell.bind(this),
                                    },
                                    {columnId: 'event-type', value: event.type},
                                    {columnId: 'event-group-owner', value: event.ownerOrigin},
                                    {columnId: 'event-group-name', value: event.name},
                                  ],
                                }));
  }

  #renderDateForDataGridCell(value: DataGrid.DataGridUtils.CellValue): LitHtml.TemplateResult {
    const date = new Date(1e3 * (value as number));
    return html`${date.toLocaleString()}`;
  }
}

customElements.define('devtools-interest-group-access-grid', InterestGroupAccessGrid);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-interest-group-access-grid': InterestGroupAccessGrid;
  }
}
