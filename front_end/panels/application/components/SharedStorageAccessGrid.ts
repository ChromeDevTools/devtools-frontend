// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as DataGrid from '../../../ui/components/data_grid/data_grid.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import type * as Protocol from '../../../generated/protocol.js';

import sharedStorageAccessGridStyles from './sharedStorageAccessGrid.css.js';

const UIStrings = {
  /**
   *@description Text in Shared Storage Events View of the Application panel
   */
  sharedStorage: 'Shared Storage',
  /**
   *@description Hover text for an info icon in the Shared Storage Events panel
   */
  allSharedStorageEvents: 'All shared storage events for this page.',
  /**
   *@description Text in Shared Storage Events View of the Application panel
   * Date and time of an Shared Storage event in a locale-
   * dependent format.
   */
  eventTime: 'Event Time',
  /**
   *@description Text in Shared Storage Events View of the Application panel
   * Type of shared storage event such as 'documentAddModule', 'documentRun',
   * 'documentSet', 'workletDelete', or 'workletGet'.
   */
  eventType: 'Access Type',
  /**
   *@description Text in Shared Storage Events View of the Application panel
   * Id of the page's main frame for this access event.
   */
  mainFrameId: 'Main Frame ID',
  /**
   *@description Text in Shared Storage Events View of the Application panel
   * Owner origin of the shared storage for this access event.
   */
  ownerOrigin: 'Owner Origin',
  /**
   *@description Text in Shared Storage Events View of the Application panel
   * Event parameters whose presence/absence depend on the access type.
   */
  eventParams: 'Optional Event Params',
  /**
   *@description Text shown instead of a table when the table would be empty.
   */
  noEvents: 'No shared storage events recorded.',
};

const str_ = i18n.i18n.registerUIStrings('panels/application/components/SharedStorageAccessGrid.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class SharedStorageAccessGrid extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-shared-storage-access-grid`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  #datastores: Array<Protocol.Storage.SharedStorageAccessedEvent> = [];

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [sharedStorageAccessGridStyles];
    this.#render();
  }

  set data(data: Array<Protocol.Storage.SharedStorageAccessedEvent>) {
    this.#datastores = data;
    this.#render();
  }

  #render(): void {
    // clang-format off
    LitHtml.render(LitHtml.html`
      <div>
        <span class="heading">${i18nString(UIStrings.sharedStorage)}</span>
        <${IconButton.Icon.Icon.litTagName} class="info-icon" title=${
            i18nString(UIStrings.allSharedStorageEvents)}
          .data=${
            {iconName: 'ic_info_black_18dp',
              color: 'var(--color-link)', width: '14px'} as
            IconButton.Icon.IconWithName}>
        </${IconButton.Icon.Icon.litTagName}>
        ${this.#renderGridOrNoDataMessage()}
      </div>
    `, this.#shadow, {host: this});
    // clang-format on
  }

  #renderGridOrNoDataMessage(): LitHtml.TemplateResult {
    if (this.#datastores.length === 0) {
      return LitHtml.html`<div
        class="no-events-message">${i18nString(UIStrings.noEvents)}</div>`;
    }

    const gridData: DataGrid.DataGridController.DataGridControllerData = {
      columns: [
        {
          id: 'event-main-frame-id',
          title: i18nString(UIStrings.mainFrameId),
          widthWeighting: 10,
          hideable: false,
          visible: false,
          sortable: false,
        },
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
          widthWeighting: 10,
          hideable: false,
          visible: true,
          sortable: true,
        },
        {
          id: 'event-owner-origin',
          title: i18nString(UIStrings.ownerOrigin),
          widthWeighting: 10,
          hideable: false,
          visible: true,
          sortable: true,
        },
        {
          id: 'event-params',
          title: i18nString(UIStrings.eventParams),
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
                                    {columnId: 'event-main-frame-id', value: event.mainFrameId},
                                    {
                                      columnId: 'event-time',
                                      value: event.accessTime,
                                      renderer: this.#renderDateForDataGridCell.bind(this),
                                    },
                                    {columnId: 'event-type', value: event.type},
                                    {columnId: 'event-owner-origin', value: event.ownerOrigin},
                                    {columnId: 'event-params', value: JSON.stringify(event.params)},
                                  ],
                                }));
  }

  #renderDateForDataGridCell(value: DataGrid.DataGridUtils.CellValue): LitHtml.TemplateResult {
    const date = new Date(1e3 * (value as number));
    return LitHtml.html`${date.toLocaleString()}`;
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-shared-storage-access-grid', SharedStorageAccessGrid);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-shared-storage-access-grid': SharedStorageAccessGrid;
  }
}
