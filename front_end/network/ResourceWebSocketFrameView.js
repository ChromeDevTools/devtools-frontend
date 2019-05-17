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

/**
 * @unrestricted
 */
Network.ResourceWebSocketFrameView = class extends UI.VBox {
  /**
   * @param {!SDK.NetworkRequest} request
   */
  constructor(request) {
    super();
    this.registerRequiredCSS('network/webSocketFrameView.css');
    this.element.classList.add('websocket-frame-view');
    this._request = request;

    this._splitWidget = new UI.SplitWidget(false, true, 'resourceWebSocketFrameSplitViewState');
    this._splitWidget.show(this.element);

    const columns = /** @type {!Array<!DataGrid.DataGrid.ColumnDescriptor>} */ ([
      {id: 'data', title: Common.UIString('Data'), sortable: false, weight: 88}, {
        id: 'length',
        title: Common.UIString('Length'),
        sortable: false,
        align: DataGrid.DataGrid.Align.Right,
        weight: 5
      },
      {id: 'time', title: Common.UIString('Time'), sortable: true, weight: 7}
    ]);

    this._dataGrid = new DataGrid.SortableDataGrid(columns);
    this._dataGrid.setRowContextMenuCallback(onRowContextMenu.bind(this));
    this._dataGrid.setStickToBottom(true);
    this._dataGrid.setStriped(true);
    this._timeComparator =
        /** @type {function(!Network.ResourceWebSocketFrameNode, !Network.ResourceWebSocketFrameNode):number} */ (
            Network.ResourceWebSocketFrameNodeTimeComparator);
    this._dataGrid.sortNodes(this._timeComparator, false);
    this._dataGrid.markColumnAsSortedBy('time', DataGrid.DataGrid.Order.Ascending);
    this._dataGrid.addEventListener(DataGrid.DataGrid.Events.SortingChanged, this._sortItems, this);

    this._dataGrid.setName('ResourceWebSocketFrameView');
    this._dataGrid.addEventListener(DataGrid.DataGrid.Events.SelectedNode, this._onFrameSelected, this);
    this._dataGrid.addEventListener(DataGrid.DataGrid.Events.DeselectedNode, this._onFrameDeselected, this);

    this._mainToolbar = new UI.Toolbar('');

    this._clearAllButton = new UI.ToolbarButton(Common.UIString('Clear All'), 'largeicon-clear');
    this._clearAllButton.addEventListener(UI.ToolbarButton.Events.Click, this._clearFrames, this);
    this._mainToolbar.appendToolbarItem(this._clearAllButton);

    this._filterTypeCombobox = new UI.ToolbarComboBox(this._updateFilterSetting.bind(this));
    for (const filterItem of Network.ResourceWebSocketFrameView._filterTypes) {
      const option = this._filterTypeCombobox.createOption(filterItem.label, filterItem.label, filterItem.name);
      this._filterTypeCombobox.addOption(option);
    }
    this._mainToolbar.appendToolbarItem(this._filterTypeCombobox);
    this._filterType = null;

    const placeholder = 'Enter regex, for example: (web)?socket';
    this._filterTextInput = new UI.ToolbarInput(Common.UIString(placeholder), 0.4);
    this._filterTextInput.addEventListener(UI.ToolbarInput.Event.TextChanged, this._updateFilterSetting, this);
    this._mainToolbar.appendToolbarItem(this._filterTextInput);
    this._filterRegex = null;

    const mainContainer = new UI.VBox();
    mainContainer.element.appendChild(this._mainToolbar.element);
    this._dataGrid.asWidget().show(mainContainer.element);
    mainContainer.setMinimumSize(0, 72);
    this._splitWidget.setMainWidget(mainContainer);

    this._frameEmptyWidget = new UI.EmptyWidget(Common.UIString('Select message to browse its content.'));
    this._splitWidget.setSidebarWidget(this._frameEmptyWidget);

    /** @type {?Network.ResourceWebSocketFrameNode} */
    this._selectedNode = null;

    /**
     * @param {!UI.ContextMenu} contextMenu
     * @param {!DataGrid.DataGridNode} genericNode
     * @this {Network.ResourceWebSocketFrameView}
     */
    function onRowContextMenu(contextMenu, genericNode) {
      const node = /** @type {!Network.ResourceWebSocketFrameNode} */ (genericNode);
      const binaryView = node.binaryView();
      if (binaryView) {
        binaryView.addCopyToContextMenu(contextMenu, ls`Copy message...`);
      } else {
        contextMenu.clipboardSection().appendItem(
            Common.UIString('Copy message'),
            InspectorFrontendHost.copyText.bind(InspectorFrontendHost, node.data.data));
      }
      contextMenu.footerSection().appendItem(Common.UIString('Clear all'), this._clearFrames.bind(this));
    }
  }

  /**
   * @param {number} opCode
   * @param {boolean} mask
   * @return {string}
   */
  static opCodeDescription(opCode, mask) {
    const localizedDescription = Network.ResourceWebSocketFrameView.opCodeDescriptions[opCode] || '';
    if (mask)
      return ls`${localizedDescription} (Opcode ${opCode}, mask)`;
    return ls`${localizedDescription} (Opcode ${opCode})`;
  }

  /**
   * @override
   */
  wasShown() {
    this.refresh();
    this._request.addEventListener(SDK.NetworkRequest.Events.WebsocketFrameAdded, this._frameAdded, this);
  }

  /**
   * @override
   */
  willHide() {
    this._request.removeEventListener(SDK.NetworkRequest.Events.WebsocketFrameAdded, this._frameAdded, this);
  }

  /**
   * @param {!Common.Event} event
   */
  _frameAdded(event) {
    const frame = /** @type {!SDK.NetworkRequest.WebSocketFrame} */ (event.data);
    if (!this._frameFilter(frame))
      return;
    this._dataGrid.insertChild(new Network.ResourceWebSocketFrameNode(this._request.url(), frame));
  }

  /**
   * @param {!SDK.NetworkRequest.WebSocketFrame} frame
   * @return {boolean}
   */
  _frameFilter(frame) {
    if (this._filterType && frame.type !== this._filterType)
      return false;
    return !this._filterRegex || this._filterRegex.test(frame.text);
  }

  _clearFrames() {
    // TODO(allada): actially remove frames from request.
    this._request[Network.ResourceWebSocketFrameView._clearFrameOffsetSymbol] = this._request.frames().length;
    this.refresh();
  }

  _updateFilterSetting() {
    const text = this._filterTextInput.value();
    const type = this._filterTypeCombobox.selectedOption().value;
    this._filterRegex = text ? new RegExp(text, 'i') : null;
    this._filterType = type === 'all' ? null : type;
    this.refresh();
  }

  /**
  * @param {!Common.Event} event
   */
  async _onFrameSelected(event) {
    this._currentSelectedNode = /** @type {!Network.ResourceWebSocketFrameNode} */ (event.data);
    const content = this._currentSelectedNode.dataText();

    const binaryView = this._currentSelectedNode.binaryView();
    if (binaryView) {
      this._splitWidget.setSidebarWidget(binaryView);
      return;
    }

    const jsonView = await SourceFrame.JSONView.createView(content);
    if (jsonView) {
      this._splitWidget.setSidebarWidget(jsonView);
      return;
    }

    this._splitWidget.setSidebarWidget(new SourceFrame.ResourceSourceFrame(
        Common.StaticContentProvider.fromString(this._request.url(), Common.resourceTypes.WebSocket, content)));
  }

  /**
   * @param {!Common.Event} event
   */
  _onFrameDeselected(event) {
    this._currentSelectedNode = null;
    this._splitWidget.setSidebarWidget(this._frameEmptyWidget);
  }

  refresh() {
    this._dataGrid.rootNode().removeChildren();

    const url = this._request.url();
    let frames = this._request.frames();
    const offset = this._request[Network.ResourceWebSocketFrameView._clearFrameOffsetSymbol] || 0;
    frames = frames.slice(offset);
    frames = frames.filter(this._frameFilter.bind(this));
    frames.forEach(frame => this._dataGrid.insertChild(new Network.ResourceWebSocketFrameNode(url, frame)));
  }

  _sortItems() {
    this._dataGrid.sortNodes(this._timeComparator, !this._dataGrid.isSortOrderAscending());
  }
};

/** @enum {number} */
Network.ResourceWebSocketFrameView.OpCodes = {
  ContinuationFrame: 0,
  TextFrame: 1,
  BinaryFrame: 2,
  ConnectionCloseFrame: 8,
  PingFrame: 9,
  PongFrame: 10
};

/** @type {!Array.<string> } */
Network.ResourceWebSocketFrameView.opCodeDescriptions = (function() {
  const opCodes = Network.ResourceWebSocketFrameView.OpCodes;
  const map = [];
  map[opCodes.ContinuationFrame] = ls`Continuation Frame`;
  map[opCodes.TextFrame] = ls`Text Message`;
  map[opCodes.BinaryFrame] = ls`Binary Message`;
  map[opCodes.ContinuationFrame] = ls`Connection Close Message`;
  map[opCodes.PingFrame] = ls`Ping Message`;
  map[opCodes.PongFrame] = ls`Pong Message`;
  return map;
})();

/** @type {!Array<!UI.NamedBitSetFilterUI.Item>} */
Network.ResourceWebSocketFrameView._filterTypes = [
  {name: 'all', label: Common.UIString('All')},
  {name: 'send', label: Common.UIString('Send')},
  {name: 'receive', label: Common.UIString('Receive')},
];

/**
 * @unrestricted
 */
Network.ResourceWebSocketFrameNode = class extends DataGrid.SortableDataGridNode {
  /**
   * @param {string} url
   * @param {!SDK.NetworkRequest.WebSocketFrame} frame
   */
  constructor(url, frame) {
    let length = frame.text.length;
    const time = new Date(frame.time * 1000);
    const timeText = ('0' + time.getHours()).substr(-2) + ':' + ('0' + time.getMinutes()).substr(-2) + ':' +
        ('0' + time.getSeconds()).substr(-2) + '.' + ('00' + time.getMilliseconds()).substr(-3);
    const timeNode = createElement('div');
    timeNode.createTextChild(timeText);
    timeNode.title = time.toLocaleString();

    let dataText = frame.text;
    let description = Network.ResourceWebSocketFrameView.opCodeDescription(frame.opCode, frame.mask);
    const isTextFrame = frame.opCode === Network.ResourceWebSocketFrameView.OpCodes.TextFrame;

    if (frame.type === SDK.NetworkRequest.WebSocketFrameType.Error) {
      description = dataText;
      length = ls`N/A`;

    } else if (isTextFrame) {
      description = dataText;

    } else if (frame.opCode === Network.ResourceWebSocketFrameView.OpCodes.BinaryFrame) {
      length = Number.bytesToString(base64ToSize(frame.text));
      description = Network.ResourceWebSocketFrameView.opCodeDescriptions[frame.opCode];

    } else {
      dataText = description;
    }

    super({data: description, length: length, time: timeNode});

    this._url = url;
    this._frame = frame;
    this._isTextFrame = isTextFrame;
    this._dataText = dataText;
  }

  /**
   * @override
   * @param {!Element} element
   */
  createCells(element) {
    element.classList.toggle(
        'websocket-frame-view-row-error', this._frame.type === SDK.NetworkRequest.WebSocketFrameType.Error);
    element.classList.toggle(
        'websocket-frame-view-row-send', this._frame.type === SDK.NetworkRequest.WebSocketFrameType.Send);
    element.classList.toggle(
        'websocket-frame-view-row-receive', this._frame.type === SDK.NetworkRequest.WebSocketFrameType.Receive);
    super.createCells(element);
  }

  /**
   * @override
   * @return {number}
   */
  nodeSelfHeight() {
    return 21;
  }

  /**
   * @return {string}
   */
  dataText() {
    return this._dataText;
  }

  /**
   * @return {!Network.ResourceWebSocketFrameView.OpCodes}
   */
  opCode() {
    return /** @type {!Network.ResourceWebSocketFrameView.OpCodes} */ (this._frame.opCode);
  }

  /**
   * @return {?Network.BinaryResourceView}
   */
  binaryView() {
    if (this._isTextFrame || this._frame.type === SDK.NetworkRequest.WebSocketFrameType.Error)
      return null;

    if (!this._binaryView)
      this._binaryView = new Network.BinaryResourceView(this._dataText, /* url */ '', Common.resourceTypes.WebSocket);
    return this._binaryView;
  }
};

/**
 * @param {!Network.ResourceWebSocketFrameNode} a
 * @param {!Network.ResourceWebSocketFrameNode} b
 * @return {number}
 */
Network.ResourceWebSocketFrameNodeTimeComparator = function(a, b) {
  return a._frame.time - b._frame.time;
};

Network.ResourceWebSocketFrameView._clearFrameOffsetSymbol = Symbol('ClearFrameOffset');
