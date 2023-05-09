// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * Copyright (C) 2012 Research In Motion Limited. All rights reserved.
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301  USA
 */

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';

import {BinaryResourceView} from './BinaryResourceView.js';
import webSocketFrameViewStyles from './webSocketFrameView.css.js';

const UIStrings = {
  /**
   *@description Text in Event Source Messages View of the Network panel
   */
  data: 'Data',
  /**
   *@description Text in Resource Web Socket Frame View of the Network panel
   */
  length: 'Length',
  /**
   *@description Text that refers to the time
   */
  time: 'Time',
  /**
   *@description Data grid name for Web Socket Frame data grids
   */
  webSocketFrame: 'Web Socket Frame',
  /**
   *@description Text to clear everything
   */
  clearAll: 'Clear All',
  /**
   *@description Text to filter result items
   */
  filter: 'Filter',
  /**
   *@description Text in Resource Web Socket Frame View of the Network panel
   */
  selectMessageToBrowseItsContent: 'Select message to browse its content.',
  /**
   *@description Text in Resource Web Socket Frame View of the Network panel
   */
  copyMessageD: 'Copy message...',
  /**
   *@description A context menu item in the Resource Web Socket Frame View of the Network panel
   */
  copyMessage: 'Copy message',
  /**
   *@description Text to clear everything
   */
  clearAllL: 'Clear all',
  /**
   * @description Text in Resource Web Socket Frame View of the Network panel. Displays which Opcode
   * is relevant to a particular operation. 'mask' indicates that the Opcode used a mask, which is a
   * way of modifying a value by overlaying another value on top of it, partially covering/changing
   * it, hence 'masking' it.
   * https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers
   * @example {Localized name of the Opcode} PH1
   * @example {0} PH2
   */
  sOpcodeSMask: '{PH1} (Opcode {PH2}, mask)',
  /**
   * @description Text in Resource Web Socket Frame View of the Network panel. Displays which Opcode
   * is relevant to a particular operation.
   * @example {Localized name of the Opcode} PH1
   * @example {0} PH2
   */
  sOpcodeS: '{PH1} (Opcode {PH2})',
  /**
   *@description Op codes continuation frame of map in Resource Web Socket Frame View of the Network panel
   */
  continuationFrame: 'Continuation Frame',
  /**
   *@description Op codes text frame of map in Resource Web Socket Frame View of the Network panel
   */
  textMessage: 'Text Message',
  /**
   *@description Op codes binary frame of map in Resource Web Socket Frame View of the Network panel
   */
  binaryMessage: 'Binary Message',
  /**
   *@description Op codes continuation frame of map in Resource Web Socket Frame View of the Network panel indicating that the web socket connection has been closed.
   */
  connectionCloseMessage: 'Connection Close Message',
  /**
   *@description Op codes ping frame of map in Resource Web Socket Frame View of the Network panel
   */
  pingMessage: 'Ping Message',
  /**
   *@description Op codes pong frame of map in Resource Web Socket Frame View of the Network panel
   */
  pongMessage: 'Pong Message',
  /**
   *@description Text for everything
   */
  all: 'All',
  /**
   *@description Text in Resource Web Socket Frame View of the Network panel
   */
  send: 'Send',
  /**
   *@description Text in Resource Web Socket Frame View of the Network panel
   */
  receive: 'Receive',
  /**
   *@description Text for something not available
   */
  na: 'N/A',
  /**
   *@description Example for placeholder text
   */
  enterRegex: 'Enter regex, for example: (web)?socket',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/ResourceWebSocketFrameView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
export class ResourceWebSocketFrameView extends UI.Widget.VBox {
  private readonly request: SDK.NetworkRequest.NetworkRequest;
  private readonly splitWidget: UI.SplitWidget.SplitWidget;
  private dataGrid: DataGrid.SortableDataGrid.SortableDataGrid<unknown>;
  private readonly timeComparator:
      (arg0: DataGrid.SortableDataGrid.SortableDataGridNode<ResourceWebSocketFrameNode>,
       arg1: DataGrid.SortableDataGrid.SortableDataGridNode<ResourceWebSocketFrameNode>) => number;
  private readonly mainToolbar: UI.Toolbar.Toolbar;
  private readonly clearAllButton: UI.Toolbar.ToolbarButton;
  private readonly filterTypeCombobox: UI.Toolbar.ToolbarComboBox;
  private filterType: string|null;
  private readonly filterTextInput: UI.Toolbar.ToolbarInput;
  private filterRegex: RegExp|null;
  private readonly frameEmptyWidget: UI.EmptyWidget.EmptyWidget;
  private readonly selectedNode: ResourceWebSocketFrameNode|null;
  private currentSelectedNode?: ResourceWebSocketFrameNode|null;

  private messageFilterSetting: Common.Settings.Setting<string> =
      Common.Settings.Settings.instance().createSetting('networkWebSocketMessageFilter', '');

  constructor(request: SDK.NetworkRequest.NetworkRequest) {
    super();

    this.element.classList.add('websocket-frame-view');
    this.request = request;

    this.splitWidget = new UI.SplitWidget.SplitWidget(false, true, 'resourceWebSocketFrameSplitViewState');
    this.splitWidget.show(this.element);

    const columns = ([
      {id: 'data', title: i18nString(UIStrings.data), sortable: false, weight: 88},
      {
        id: 'length',
        title: i18nString(UIStrings.length),
        sortable: false,
        align: DataGrid.DataGrid.Align.Right,
        weight: 5,
      },
      {id: 'time', title: i18nString(UIStrings.time), sortable: true, weight: 7},
    ] as DataGrid.DataGrid.ColumnDescriptor[]);

    this.dataGrid = new DataGrid.SortableDataGrid.SortableDataGrid({
      displayName: i18nString(UIStrings.webSocketFrame),
      columns,
      editCallback: undefined,
      deleteCallback: undefined,
      refreshCallback: undefined,
    });
    this.dataGrid.setRowContextMenuCallback(onRowContextMenu.bind(this));
    this.dataGrid.setStickToBottom(true);
    this.dataGrid.setCellClass('websocket-frame-view-td');
    this.timeComparator =
        (ResourceWebSocketFrameNodeTimeComparator as
             (arg0: DataGrid.SortableDataGrid.SortableDataGridNode<ResourceWebSocketFrameNode>,
              arg1: DataGrid.SortableDataGrid.SortableDataGridNode<ResourceWebSocketFrameNode>) => number);
    this.dataGrid.sortNodes(this.timeComparator, false);
    this.dataGrid.markColumnAsSortedBy('time', DataGrid.DataGrid.Order.Ascending);
    this.dataGrid.addEventListener(DataGrid.DataGrid.Events.SortingChanged, this.sortItems, this);

    this.dataGrid.setName('ResourceWebSocketFrameView');
    this.dataGrid.addEventListener(DataGrid.DataGrid.Events.SelectedNode, event => {
      void this.onFrameSelected(event);
    }, this);
    this.dataGrid.addEventListener(DataGrid.DataGrid.Events.DeselectedNode, this.onFrameDeselected, this);

    this.mainToolbar = new UI.Toolbar.Toolbar('');

    this.clearAllButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.clearAll), 'clear');
    this.clearAllButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this.clearFrames, this);
    this.mainToolbar.appendToolbarItem(this.clearAllButton);

    this.filterTypeCombobox =
        new UI.Toolbar.ToolbarComboBox(this.updateFilterSetting.bind(this), i18nString(UIStrings.filter));
    for (const filterItem of _filterTypes) {
      const option = this.filterTypeCombobox.createOption(filterItem.label(), filterItem.name);
      this.filterTypeCombobox.addOption(option);
    }
    this.mainToolbar.appendToolbarItem(this.filterTypeCombobox);
    this.filterType = null;

    const placeholder = i18nString(UIStrings.enterRegex);
    this.filterTextInput = new UI.Toolbar.ToolbarInput(placeholder, '', 0.4);
    this.filterTextInput.addEventListener(UI.Toolbar.ToolbarInput.Event.TextChanged, this.updateFilterSetting, this);
    const filter = this.messageFilterSetting.get();
    if (filter) {
      this.filterTextInput.setValue(filter);
    }
    this.filterRegex = null;
    this.mainToolbar.appendToolbarItem(this.filterTextInput);

    const mainContainer = new UI.Widget.VBox();
    mainContainer.element.appendChild(this.mainToolbar.element);
    this.dataGrid.asWidget().show(mainContainer.element);
    mainContainer.setMinimumSize(0, 72);
    this.splitWidget.setMainWidget(mainContainer);

    this.frameEmptyWidget = new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.selectMessageToBrowseItsContent));
    this.splitWidget.setSidebarWidget(this.frameEmptyWidget);

    this.selectedNode = null;
    if (filter) {
      this.applyFilter(filter);
    }

    function onRowContextMenu(
        this: ResourceWebSocketFrameView, contextMenu: UI.ContextMenu.ContextMenu,
        genericNode: DataGrid.DataGrid.DataGridNode<unknown>): void {
      const node = (genericNode as ResourceWebSocketFrameNode);
      const binaryView = node.binaryView();
      if (binaryView) {
        binaryView.addCopyToContextMenu(contextMenu, i18nString(UIStrings.copyMessageD));
      } else {
        contextMenu.clipboardSection().appendItem(
            i18nString(UIStrings.copyMessage),
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText.bind(
                Host.InspectorFrontendHost.InspectorFrontendHostInstance, node.data.data));
      }
      contextMenu.footerSection().appendItem(i18nString(UIStrings.clearAllL), this.clearFrames.bind(this));
    }
  }

  static opCodeDescription(opCode: number, mask: boolean): string {
    const localizedDescription = opCodeDescriptions[opCode] || ((): string => '');
    if (mask) {
      return i18nString(UIStrings.sOpcodeSMask, {PH1: localizedDescription(), PH2: opCode});
    }
    return i18nString(UIStrings.sOpcodeS, {PH1: localizedDescription(), PH2: opCode});
  }

  override wasShown(): void {
    this.refresh();
    this.registerCSSFiles([webSocketFrameViewStyles]);
    this.request.addEventListener(SDK.NetworkRequest.Events.WebsocketFrameAdded, this.frameAdded, this);
  }

  override willHide(): void {
    this.request.removeEventListener(SDK.NetworkRequest.Events.WebsocketFrameAdded, this.frameAdded, this);
  }

  private frameAdded(event: Common.EventTarget.EventTargetEvent<SDK.NetworkRequest.WebSocketFrame>): void {
    const frame = event.data;
    if (!this.frameFilter(frame)) {
      return;
    }
    this.dataGrid.insertChild(new ResourceWebSocketFrameNode(this.request.url(), frame));
  }

  private frameFilter(frame: SDK.NetworkRequest.WebSocketFrame): boolean {
    if (this.filterType && frame.type !== this.filterType) {
      return false;
    }
    return !this.filterRegex || this.filterRegex.test(frame.text);
  }

  private clearFrames(): void {
    // TODO(allada): actially remove frames from request.
    _clearFrameOffsets.set(this.request, this.request.frames().length);
    this.refresh();
  }

  private updateFilterSetting(): void {
    const text = this.filterTextInput.value();
    this.messageFilterSetting.set(text);
    this.applyFilter(text);
  }

  private applyFilter(text: string): void {
    const type = (this.filterTypeCombobox.selectedOption() as HTMLOptionElement).value;
    this.filterRegex = text ? new RegExp(Platform.StringUtilities.escapeForRegExp(text), 'i') : null;
    this.filterType = type === 'all' ? null : type;
    this.refresh();
  }

  private async onFrameSelected(event: Common.EventTarget.EventTargetEvent<DataGrid.DataGrid.DataGridNode<unknown>>):
      Promise<void> {
    this.currentSelectedNode = (event.data as ResourceWebSocketFrameNode);
    const content = this.currentSelectedNode.dataText();

    const binaryView = this.currentSelectedNode.binaryView();
    if (binaryView) {
      this.splitWidget.setSidebarWidget(binaryView);
      return;
    }

    const jsonView = await SourceFrame.JSONView.JSONView.createView(content);
    if (jsonView) {
      this.splitWidget.setSidebarWidget(jsonView);
      return;
    }

    this.splitWidget.setSidebarWidget(new SourceFrame.ResourceSourceFrame.ResourceSourceFrame(
        TextUtils.StaticContentProvider.StaticContentProvider.fromString(
            this.request.url(), Common.ResourceType.resourceTypes.WebSocket, content),
        ''));
  }

  private onFrameDeselected(): void {
    this.currentSelectedNode = null;
    this.splitWidget.setSidebarWidget(this.frameEmptyWidget);
  }

  refresh(): void {
    this.dataGrid.rootNode().removeChildren();

    const url = this.request.url();
    let frames = this.request.frames();
    const offset = _clearFrameOffsets.get(this.request) || 0;
    frames = frames.slice(offset);
    frames = frames.filter(this.frameFilter.bind(this));
    frames.forEach(frame => this.dataGrid.insertChild(new ResourceWebSocketFrameNode(url, frame)));
  }

  private sortItems(): void {
    this.dataGrid.sortNodes(this.timeComparator, !this.dataGrid.isSortOrderAscending());
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum OpCodes {
  ContinuationFrame = 0,
  TextFrame = 1,
  BinaryFrame = 2,
  ConnectionCloseFrame = 8,
  PingFrame = 9,
  PongFrame = 10,
}

export const opCodeDescriptions: (() => string)[] = (function(): (() => Common.UIString.LocalizedString)[] {
  const opCodes = OpCodes;
  const map = [];
  map[opCodes.ContinuationFrame] = i18nLazyString(UIStrings.continuationFrame);
  map[opCodes.TextFrame] = i18nLazyString(UIStrings.textMessage);
  map[opCodes.BinaryFrame] = i18nLazyString(UIStrings.binaryMessage);
  map[opCodes.ConnectionCloseFrame] = i18nLazyString(UIStrings.connectionCloseMessage);
  map[opCodes.PingFrame] = i18nLazyString(UIStrings.pingMessage);
  map[opCodes.PongFrame] = i18nLazyString(UIStrings.pongMessage);
  return map;
})();

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
// eslint-disable-next-line @typescript-eslint/naming-convention
export const _filterTypes: UI.FilterBar.Item[] = [
  {name: 'all', label: i18nLazyString(UIStrings.all), title: undefined},
  {name: 'send', label: i18nLazyString(UIStrings.send), title: undefined},
  {name: 'receive', label: i18nLazyString(UIStrings.receive), title: undefined},
];

export class ResourceWebSocketFrameNode extends DataGrid.SortableDataGrid.SortableDataGridNode<unknown> {
  private readonly url: Platform.DevToolsPath.UrlString;
  readonly frame: SDK.NetworkRequest.WebSocketFrame;
  private readonly isTextFrame: boolean;
  private dataTextInternal: string;
  private binaryViewInternal: BinaryResourceView|null;

  constructor(url: Platform.DevToolsPath.UrlString, frame: SDK.NetworkRequest.WebSocketFrame) {
    let length = String(frame.text.length);
    const time = new Date(frame.time * 1000);
    const timeText = ('0' + time.getHours()).substr(-2) + ':' + ('0' + time.getMinutes()).substr(-2) + ':' +
        ('0' + time.getSeconds()).substr(-2) + '.' + ('00' + time.getMilliseconds()).substr(-3);
    const timeNode = document.createElement('div');
    UI.UIUtils.createTextChild(timeNode, timeText);
    UI.Tooltip.Tooltip.install(timeNode, time.toLocaleString());

    let dataText: string = frame.text;
    let description = ResourceWebSocketFrameView.opCodeDescription(frame.opCode, frame.mask);
    const isTextFrame = frame.opCode === OpCodes.TextFrame;

    if (frame.type === SDK.NetworkRequest.WebSocketFrameType.Error) {
      description = dataText;
      length = i18nString(UIStrings.na);

    } else if (isTextFrame) {
      description = dataText;

    } else if (frame.opCode === OpCodes.BinaryFrame) {
      length = Platform.NumberUtilities.bytesToString(Platform.StringUtilities.base64ToSize(frame.text));
      description = opCodeDescriptions[frame.opCode]();

    } else {
      dataText = description;
    }

    super({data: description, length: length, time: timeNode});

    this.url = url;
    this.frame = frame;
    this.isTextFrame = isTextFrame;
    this.dataTextInternal = dataText;

    this.binaryViewInternal = null;
  }

  override createCells(element: Element): void {
    element.classList.toggle(
        'websocket-frame-view-row-error', this.frame.type === SDK.NetworkRequest.WebSocketFrameType.Error);
    element.classList.toggle(
        'websocket-frame-view-row-send', this.frame.type === SDK.NetworkRequest.WebSocketFrameType.Send);
    element.classList.toggle(
        'websocket-frame-view-row-receive', this.frame.type === SDK.NetworkRequest.WebSocketFrameType.Receive);
    super.createCells(element);
  }

  override nodeSelfHeight(): number {
    return 21;
  }

  dataText(): string {
    return this.dataTextInternal;
  }

  opCode(): OpCodes {
    return this.frame.opCode as OpCodes;
  }

  binaryView(): BinaryResourceView|null {
    if (this.isTextFrame || this.frame.type === SDK.NetworkRequest.WebSocketFrameType.Error) {
      return null;
    }

    if (!this.binaryViewInternal) {
      if (this.dataTextInternal.length > 0) {
        this.binaryViewInternal = new BinaryResourceView(
            this.dataTextInternal, Platform.DevToolsPath.EmptyUrlString, Common.ResourceType.resourceTypes.WebSocket);
      }
    }
    return this.binaryViewInternal;
  }
}

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
// eslint-disable-next-line @typescript-eslint/naming-convention
export function ResourceWebSocketFrameNodeTimeComparator(
    a: ResourceWebSocketFrameNode, b: ResourceWebSocketFrameNode): number {
  return a.frame.time - b.frame.time;
}

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
// eslint-disable-next-line @typescript-eslint/naming-convention
const _clearFrameOffsets = new WeakMap<SDK.NetworkRequest.NetworkRequest, number>();
