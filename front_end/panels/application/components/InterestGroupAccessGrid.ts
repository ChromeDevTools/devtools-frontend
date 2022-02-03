// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as DataGrid from '../../../ui/components/data_grid/data_grid.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import type * as Protocol from '../../../generated/protocol.js';

import interestGroupAccessGridStyles from './interestGroupAccessGrid.css.js';

const UIStrings = {
  /**
  *@description Hover text for an info icon in the Interest Group Event panel
  */
  allInterestGroupStorageEvents: 'All interest group storage events.',
  /**
    *@description Text in InterestGroupStorage Items View of the Application panel
    */
  eventTime: 'Event Time',
  /**
  *@description Text in InterestGroupStorage Items View of the Application panel
  */
  eventType: 'Access Type',
  /**
   *@description Text in InterestGroupStorage Items View of the Application panel
  */
  groupOwner: 'Owner',
  /**
   *@description Text in InterestGroupStorage Items View of the Application panel
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
  static readonly litTagName = LitHtml.literal`devtools-interest-group-access-grid`;
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
    LitHtml.render(LitHtml.html`
      <div>
        <span class="heading">Interest Groups</span>
        <${IconButton.Icon.Icon.litTagName} class="info-icon" title=${
            i18nString(UIStrings.allInterestGroupStorageEvents)}
          .data=${
            {iconName: 'ic_info_black_18dp', color: 'var(--color-link)', width: '14px'} as
            IconButton.Icon.IconWithName}>
        </${IconButton.Icon.Icon.litTagName}>
        ${this.#renderGridOrNoDataMessage()}
      </div>
    `, this.#shadow, {host: this});
    // clang-format on
  }

  #renderGridOrNoDataMessage(): LitHtml.TemplateResult {
    if (this.#datastores.length === 0) {
      return LitHtml.html`<div class="no-events-message">${i18nString(UIStrings.noEvents)}</div>`;
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

    return LitHtml.html`
      <${DataGrid.DataGridController.DataGridController.litTagName} .data=${
        gridData as DataGrid.DataGridController.DataGridControllerData}></${
        DataGrid.DataGridController.DataGridController.litTagName}>
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
    return LitHtml.html`${date.toLocaleString()}`;
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-interest-group-access-grid', InterestGroupAccessGrid);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-interest-group-access-grid': InterestGroupAccessGrid;
  }
}
