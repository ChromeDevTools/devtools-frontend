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

    var columns = /** @type {!Array<!DataGrid.DataGrid.ColumnDescriptor>} */ ([
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
    this._dataGrid.setRowContextMenuCallback(onRowContextMenu);
    this._dataGrid.setStickToBottom(true);
    this._dataGrid.setCellClass('websocket-frame-view-td');
    this._timeComparator =
        /** @type {function(!Network.ResourceWebSocketFrameNode, !Network.ResourceWebSocketFrameNode):number} */ (
            Network.ResourceWebSocketFrameNodeTimeComparator);
    this._dataGrid.sortNodes(this._timeComparator, false);
    this._dataGrid.markColumnAsSortedBy('time', DataGrid.DataGrid.Order.Ascending);
    this._dataGrid.addEventListener(DataGrid.DataGrid.Events.SortingChanged, this._sortItems, this);

    this._dataGrid.setName('ResourceWebSocketFrameView');
    this._dataGrid.addEventListener(DataGrid.DataGrid.Events.SelectedNode, this._onFrameSelected, this);
    this._dataGrid.addEventListener(DataGrid.DataGrid.Events.DeselectedNode, this._onFrameDeselected, this);
    this._splitWidget.setMainWidget(this._dataGrid.asWidget());

    var view = new UI.EmptyWidget('Select frame to browse its content.');
    this._splitWidget.setSidebarWidget(view);

    /** @type {?Network.ResourceWebSocketFrameNode} */
    this._selectedNode = null;

    /**
     * @param {!UI.ContextMenu} contextMenu
     * @param {!DataGrid.DataGridNode} node
     */
    function onRowContextMenu(contextMenu, node) {
      contextMenu.appendItem(
          Common.UIString.capitalize('Copy ^message'),
          InspectorFrontendHost.copyText.bind(InspectorFrontendHost, node.data.data));
    }
  }

  /**
   * @param {number} opCode
   * @param {boolean} mask
   * @return {string}
   */
  static opCodeDescription(opCode, mask) {
    var rawDescription = Network.ResourceWebSocketFrameView.opCodeDescriptions[opCode] || '';
    var localizedDescription = Common.UIString(rawDescription);
    return Common.UIString('%s (Opcode %d%s)', localizedDescription, opCode, (mask ? ', mask' : ''));
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
    var frame = /** @type {!SDK.NetworkRequest.WebSocketFrame} */ (event.data);
    this._dataGrid.insertChild(new Network.ResourceWebSocketFrameNode(this._request.url(), frame));
  }

  /**
   * @param {!Common.Event} event
   */
  _onFrameSelected(event) {
    var selectedNode = /** @type {!Network.ResourceWebSocketFrameNode} */ (event.data);
    this._currentSelectedNode = selectedNode;
    var contentProvider = selectedNode.contentProvider();
    contentProvider.requestContent().then(contentHandler.bind(this));

    /**
     * @param {(string|null)} content
     * @this {Network.ResourceWebSocketFrameView}
     */
    function contentHandler(content) {
      if (this._currentSelectedNode !== selectedNode)
        return;
      Network.JSONView.parseJSON(content).then(handleJSONData.bind(this));
    }

    /**
     * @param {?Network.ParsedJSON} parsedJSON
     * @this {Network.ResourceWebSocketFrameView}
     */
    function handleJSONData(parsedJSON) {
      if (this._currentSelectedNode !== selectedNode)
        return;
      if (parsedJSON)
        this._splitWidget.setSidebarWidget(Network.JSONView.createSearchableView(parsedJSON));
      else
        this._splitWidget.setSidebarWidget(new SourceFrame.ResourceSourceFrame(contentProvider));
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _onFrameDeselected(event) {
    this._currentSelectedNode = null;
  }

  refresh() {
    this._dataGrid.rootNode().removeChildren();
    var frames = this._request.frames();
    for (var i = 0; i < frames.length; ++i)
      this._dataGrid.insertChild(new Network.ResourceWebSocketFrameNode(this._request.url(), frames[i]));
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
  var opCodes = Network.ResourceWebSocketFrameView.OpCodes;
  var map = [];
  map[opCodes.ContinuationFrame] = 'Continuation Frame';
  map[opCodes.TextFrame] = 'Text Frame';
  map[opCodes.BinaryFrame] = 'Binary Frame';
  map[opCodes.ContinuationFrame] = 'Connection Close Frame';
  map[opCodes.PingFrame] = 'Ping Frame';
  map[opCodes.PongFrame] = 'Pong Frame';
  return map;
})();


/**
 * @unrestricted
 */
Network.ResourceWebSocketFrameNode = class extends DataGrid.SortableDataGridNode {
  /**
   * @param {string} url
   * @param {!SDK.NetworkRequest.WebSocketFrame} frame
   */
  constructor(url, frame) {
    var dataText = frame.text;
    var length = frame.text.length;
    var time = new Date(frame.time * 1000);
    var timeText = ('0' + time.getHours()).substr(-2) + ':' + ('0' + time.getMinutes()).substr(-2) + ':' +
        ('0' + time.getSeconds()).substr(-2) + '.' + ('00' + time.getMilliseconds()).substr(-3);
    var timeNode = createElement('div');
    timeNode.createTextChild(timeText);
    timeNode.title = time.toLocaleString();

    var isTextFrame = frame.opCode === Network.ResourceWebSocketFrameView.OpCodes.TextFrame;
    if (!isTextFrame)
      dataText = Network.ResourceWebSocketFrameView.opCodeDescription(frame.opCode, frame.mask);

    super({data: dataText, length: length, time: timeNode});

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
        'websocket-frame-view-row-outcoming', this._frame.type === SDK.NetworkRequest.WebSocketFrameType.Send);
    element.classList.toggle('websocket-frame-view-row-opcode', !this._isTextFrame);
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
   * @return {!Common.ContentProvider}
   */
  contentProvider() {
    return Common.StaticContentProvider.fromString(this._url, Common.resourceTypes.WebSocket, this._dataText);
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
