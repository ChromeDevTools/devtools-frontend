// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import eventDisplayTableStyles from './eventDisplayTable.css.js';
import {type PlayerEvent} from './MediaModel.js';

const UIStrings = {
  /**
   *@description Text for timestamps of items
   */
  timestamp: 'Timestamp',
  /**
   *@description The column header for event names.
   */
  eventName: 'Event name',
  /**
   *@description Text for the value of something
   */
  value: 'Value',
  /**
   *@description The accessible name of a table that displays information about events that occurred
   * while a video/media player was present on the page.
   */
  eventDisplay: 'Event display',
};
const str_ = i18n.i18n.registerUIStrings('panels/media/EventDisplayTable.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export interface EventDisplayColumnConfig {
  id: string;
  title: string;
  sortable: boolean;
  weight?: number;
}

export const enum MediaEventColumnKeys {
  TIMESTAMP = 'display-timestamp',
  EVENT = 'event',
  VALUE = 'value',
}

export class EventNode extends DataGrid.DataGrid.DataGridNode<EventNode> {
  private expandableElement: SourceFrame.JSONView.JSONView|null;

  constructor(event: PlayerEvent) {
    super(event, false);
    this.expandableElement = null;
  }

  override createCell(columnId: string): HTMLElement {
    const cell = this.createTD(columnId);
    const cellData = this.data[columnId] as string;
    if (columnId === MediaEventColumnKeys.VALUE) {
      const enclosed = cell.createChild('div', 'event-display-table-contents-json-wrapper');
      this.expandableElement =
          new SourceFrame.JSONView.JSONView(new SourceFrame.JSONView.ParsedJSON(cellData, '', ''), true);
      this.expandableElement.markAsRoot();
      this.expandableElement.show(enclosed);
    } else {
      cell.classList.add('event-display-table-basic-text-table-entry');
      UI.UIUtils.createTextChild(cell, cellData);
    }
    return cell;
  }
}

export class PlayerEventsView extends UI.Widget.VBox {
  private readonly dataGrid: DataGrid.DataGrid.DataGridImpl<EventNode>;
  private firstEventTime: number;

  constructor() {
    super();

    this.element.setAttribute('jslog', `${VisualLogging.pane('events')}`);

    // Set up element styles.

    this.contentElement.classList.add('event-display-table-contents-table-container');

    this.dataGrid = this.createDataGrid([
      {
        id: MediaEventColumnKeys.TIMESTAMP,
        title: i18nString(UIStrings.timestamp),
        weight: 1,
        sortable: false,
      },
      {id: MediaEventColumnKeys.EVENT, title: i18nString(UIStrings.eventName), weight: 2, sortable: false},
      {
        id: MediaEventColumnKeys.VALUE,
        title: i18nString(UIStrings.value),
        weight: 7,
        sortable: false,
      },
    ]);

    this.firstEventTime = 0;
    this.dataGrid.setStriped(true);
    this.dataGrid.asWidget().show(this.contentElement);
  }

  private createDataGrid(headers: EventDisplayColumnConfig[]): DataGrid.DataGrid.DataGridImpl<EventNode> {
    const gridColumnDescs = [];
    for (const headerDesc of headers) {
      gridColumnDescs.push(PlayerEventsView.convertToGridDescriptor(headerDesc));
    }

    // TODO(tmathmeyer) SortableDataGrid doesn't play nice with nested JSON
    // renderers, since they can change size, and this breaks the visible
    // element computation in ViewportDataGrid.
    const datagrid = new DataGrid.DataGrid.DataGridImpl({
      displayName: i18nString(UIStrings.eventDisplay),
      columns: gridColumnDescs,
      deleteCallback: undefined,
      editCallback: undefined,
      refreshCallback: undefined,
    });
    datagrid.asWidget().contentElement.classList.add('no-border-top-datagrid');
    return datagrid;
  }

  onEvent(event: PlayerEvent): void {
    if (this.firstEventTime === 0 && typeof event.timestamp === 'number') {
      this.firstEventTime = event.timestamp;
    }

    event = this.subtractFirstEventTime(event);
    const stringified = event.value as string;
    try {
      const json = JSON.parse(stringified);
      event.event = json.event;
      delete json['event'];
      event.value = json;
      const node = new EventNode(event);
      const scroll = this.dataGrid.scrollContainer as HTMLElement;
      const isAtBottom = scroll.scrollTop === (scroll.scrollHeight - scroll.offsetHeight);
      this.dataGrid.rootNode().appendChild(node as DataGrid.DataGrid.DataGridNode<EventNode>);
      if (isAtBottom) {
        scroll.scrollTop = scroll.scrollHeight;
      }
    } catch (e) {
      // If this is a legacy message event, ignore it for now until they
      // are handled.
    }
  }

  private subtractFirstEventTime(event: PlayerEvent): PlayerEvent {
    if (typeof event.timestamp === 'number') {
      event.displayTimestamp = (event.timestamp - this.firstEventTime).toFixed(3);
    }
    return event;
  }

  private static convertToGridDescriptor(columnConfig: EventDisplayColumnConfig): DataGrid.DataGrid.ColumnDescriptor {
    return {
      id: columnConfig.id,
      title: columnConfig.title,
      sortable: columnConfig.sortable,
      weight: columnConfig.weight || 0,
      sort: DataGrid.DataGrid.Order.Ascending,
    } as DataGrid.DataGrid.ColumnDescriptor;
  }
  override wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([eventDisplayTableStyles]);
  }
}
