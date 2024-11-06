// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import eventSourceMessagesViewStyles from './eventSourceMessagesView.css.js';

const UIStrings = {
  /**
   *@description Text in Event Source Messages View of the Network panel
   */
  id: 'Id',
  /**
   *@description Text that refers to some types
   */
  type: 'Type',
  /**
   *@description Text in Event Source Messages View of the Network panel
   */
  data: 'Data',
  /**
   *@description Text that refers to the time
   */
  time: 'Time',
  /**
   *@description Data grid name for Event Source data grids
   */
  eventSource: 'Event Source',
  /**
   *@description A context menu item in the Resource Web Socket Frame View of the Network panel
   */
  copyMessage: 'Copy message',
  /**
   *@description Text to clear everything
   */
  clearAll: 'Clear all',
  /**
   *@description Example for placeholder text
   */
  filterByRegex: 'Filter using regex (example: https?)',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/EventSourceMessagesView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class EventSourceMessagesView extends UI.Widget.VBox {
  private readonly request: SDK.NetworkRequest.NetworkRequest;
  private dataGrid: DataGrid.SortableDataGrid.SortableDataGrid<EventSourceMessageNode>;
  private readonly mainToolbar: UI.Toolbar.Toolbar;
  private readonly clearAllButton: UI.Toolbar.ToolbarButton;
  private readonly filterTextInput: UI.Toolbar.ToolbarInput;
  private filterRegex: RegExp|null;

  private messageFilterSetting: Common.Settings.Setting<string> =
      Common.Settings.Settings.instance().createSetting('network-event-source-message-filter', '');

  constructor(request: SDK.NetworkRequest.NetworkRequest) {
    super();

    this.element.classList.add('event-source-messages-view');
    this.element.setAttribute('jslog', `${VisualLogging.pane('event-stream').track({resize: true})}`);
    this.request = request;

    this.mainToolbar = new UI.Toolbar.Toolbar('');

    this.clearAllButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.clearAll), 'clear');
    this.clearAllButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, this.clearMessages, this);
    this.mainToolbar.appendToolbarItem(this.clearAllButton);

    const placeholder = i18nString(UIStrings.filterByRegex);
    this.filterTextInput = new UI.Toolbar.ToolbarFilter(placeholder, 0.4);
    this.filterTextInput.addEventListener(UI.Toolbar.ToolbarInput.Event.TEXT_CHANGED, this.updateFilterSetting, this);
    const filter = this.messageFilterSetting.get();
    this.filterRegex = null;
    this.setFilter(filter);
    if (filter) {
      this.filterTextInput.setValue(filter);
    }
    this.mainToolbar.appendToolbarItem(this.filterTextInput);

    this.element.appendChild(this.mainToolbar.element);

    const columns = ([
      {id: 'id', title: i18nString(UIStrings.id), sortable: true, weight: 8},
      {id: 'type', title: i18nString(UIStrings.type), sortable: true, weight: 8},
      {id: 'data', title: i18nString(UIStrings.data), sortable: false, weight: 88},
      {id: 'time', title: i18nString(UIStrings.time), sortable: true, weight: 8},
    ] as DataGrid.DataGrid.ColumnDescriptor[]);

    this.dataGrid = new DataGrid.SortableDataGrid.SortableDataGrid({
      displayName: i18nString(UIStrings.eventSource),
      columns,
      editCallback: undefined,
      deleteCallback: undefined,
      refreshCallback: undefined,
    });
    this.dataGrid.setStriped(true);
    this.dataGrid.setEnableAutoScrollToBottom(true);
    this.dataGrid.setRowContextMenuCallback(this.onRowContextMenu.bind(this));
    this.dataGrid.markColumnAsSortedBy('time', DataGrid.DataGrid.Order.Ascending);
    this.sortItems();
    this.dataGrid.addEventListener(DataGrid.DataGrid.Events.SORTING_CHANGED, this.sortItems, this);

    this.dataGrid.setName('event-source-messages-view');
    this.dataGrid.asWidget().show(this.element);
  }

  override wasShown(): void {
    this.refresh();
    this.registerCSSFiles([eventSourceMessagesViewStyles]);
    this.request.addEventListener(SDK.NetworkRequest.Events.EVENT_SOURCE_MESSAGE_ADDED, this.messageAdded, this);
  }

  override willHide(): void {
    this.request.removeEventListener(SDK.NetworkRequest.Events.EVENT_SOURCE_MESSAGE_ADDED, this.messageAdded, this);
  }

  private messageAdded(event: Common.EventTarget.EventTargetEvent<SDK.NetworkRequest.EventSourceMessage>): void {
    const message = event.data;
    if (!this.messageFilter(message)) {
      return;
    }
    this.dataGrid.insertChild(new EventSourceMessageNode(message));
  }

  private messageFilter(message: SDK.NetworkRequest.EventSourceMessage): boolean {
    return !this.filterRegex || this.filterRegex.test(message.eventName) || this.filterRegex.test(message.eventId) ||
        this.filterRegex.test(message.data);
  }

  private clearMessages(): void {
    clearMessageOffsets.set(this.request, this.request.eventSourceMessages().length);
    this.refresh();
  }

  private updateFilterSetting(): void {
    const text = this.filterTextInput.value();
    this.messageFilterSetting.set(text);
    this.setFilter(text);
    this.refresh();
  }

  private setFilter(text: string): void {
    this.filterRegex = null;
    if (text) {
      try {
        this.filterRegex = new RegExp(text, 'i');
      } catch (e) {
        // this regex will never match any input
        this.filterRegex = new RegExp('(?!)', 'i');
      }
    }
  }

  private sortItems(): void {
    const sortColumnId = this.dataGrid.sortColumnId();
    if (!sortColumnId) {
      return;
    }
    const comparator =
        (Comparators[sortColumnId] as
             ((arg0: DataGrid.SortableDataGrid.SortableDataGridNode<EventSourceMessageNode>,
               arg1: DataGrid.SortableDataGrid.SortableDataGridNode<EventSourceMessageNode>) => number) |
         undefined);
    if (!comparator) {
      return;
    }
    this.dataGrid.sortNodes(comparator, !this.dataGrid.isSortOrderAscending());
  }

  private onRowContextMenu(
      contextMenu: UI.ContextMenu.ContextMenu,
      node: DataGrid.DataGrid.DataGridNode<DataGrid.ViewportDataGrid.ViewportDataGridNode<
          DataGrid.SortableDataGrid.SortableDataGridNode<EventSourceMessageNode>>>): void {
    contextMenu.clipboardSection().appendItem(
        i18nString(UIStrings.copyMessage),
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText.bind(
            Host.InspectorFrontendHost.InspectorFrontendHostInstance, node.data.data),
        {jslogContext: 'copy'});
  }

  refresh(): void {
    this.dataGrid.rootNode().removeChildren();

    let messages = this.request.eventSourceMessages();
    const offset = clearMessageOffsets.get(this.request) || 0;
    messages = messages.slice(offset);
    messages = messages.filter(this.messageFilter.bind(this));
    messages.forEach(message => this.dataGrid.insertChild(new EventSourceMessageNode(message)));
  }
}

export class EventSourceMessageNode extends DataGrid.SortableDataGrid.SortableDataGridNode<EventSourceMessageNode> {
  readonly message: SDK.NetworkRequest.EventSourceMessage;

  constructor(message: SDK.NetworkRequest.EventSourceMessage) {
    const time = new Date(message.time * 1000);
    const timeText = ('0' + time.getHours()).substr(-2) + ':' + ('0' + time.getMinutes()).substr(-2) + ':' +
        ('0' + time.getSeconds()).substr(-2) + '.' + ('00' + time.getMilliseconds()).substr(-3);
    const timeNode = document.createElement('div');
    UI.UIUtils.createTextChild(timeNode, timeText);
    UI.Tooltip.Tooltip.install(timeNode, time.toLocaleString());
    super({id: message.eventId, type: message.eventName, data: message.data, time: timeNode});
    this.message = message;
  }
}

function eventSourceMessageNodeComparator(
    fieldGetter: (arg0: SDK.NetworkRequest.EventSourceMessage) => (number | string), a: EventSourceMessageNode,
    b: EventSourceMessageNode): number {
  const aValue = fieldGetter(a.message);
  const bValue = fieldGetter(b.message);
  return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
}

export const Comparators: {
  [x: string]: (arg0: EventSourceMessageNode, arg1: EventSourceMessageNode) => number,
} = {
  id: eventSourceMessageNodeComparator.bind(null, message => message.eventId),
  type: eventSourceMessageNodeComparator.bind(null, message => message.eventName),
  time: eventSourceMessageNodeComparator.bind(null, message => message.time),
};

const clearMessageOffsets = new WeakMap<SDK.NetworkRequest.NetworkRequest, number>();
