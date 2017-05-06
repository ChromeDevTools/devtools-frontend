// Copyright (c) 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Coverage.CoverageListView = class extends UI.VBox {
  constructor() {
    super(true);
    /** @type {!Map<!Coverage.URLCoverageInfo, !Coverage.CoverageListView.GridNode>} */
    this._nodeForCoverageInfo = new Map();
    this.registerRequiredCSS('coverage/coverageListView.css');
    var columns = [
      {id: 'url', title: Common.UIString('URL'), width: '300px', fixedWidth: false, sortable: true},
      {id: 'type', title: Common.UIString('Type'), width: '45px', fixedWidth: true, sortable: true}, {
        id: 'size',
        title: Common.UIString('Total Bytes'),
        width: '60px',
        fixedWidth: true,
        sortable: true,
        align: DataGrid.DataGrid.Align.Right
      },
      {
        id: 'unusedSize',
        title: Common.UIString('Unused Bytes'),
        width: '60px',
        fixedWidth: true,
        sortable: true,
        align: DataGrid.DataGrid.Align.Right,
        sort: DataGrid.DataGrid.Order.Descending
      },
      {id: 'bars', title: '', width: '500px', fixedWidth: false, sortable: true}
    ];
    this._dataGrid = new DataGrid.SortableDataGrid(columns);
    this._dataGrid.setResizeMethod(DataGrid.DataGrid.ResizeMethod.Last);
    this._dataGrid.element.classList.add('flex-auto');
    this._dataGrid.element.addEventListener('keydown', this._onKeyDown.bind(this), false);
    this._dataGrid.addEventListener(DataGrid.DataGrid.Events.OpenedNode, this._onOpenedNode, this);
    this._dataGrid.addEventListener(DataGrid.DataGrid.Events.SortingChanged, this._sortingChanged, this);

    var dataGridWidget = this._dataGrid.asWidget();
    dataGridWidget.show(this.contentElement);
  }

  /**
   * @param {!Array<!Coverage.URLCoverageInfo>} coverageInfo
   */
  update(coverageInfo) {
    var hadUpdates = false;
    var maxSize = coverageInfo.reduce((acc, entry) => Math.max(acc, entry.size()), 0);
    var rootNode = this._dataGrid.rootNode();
    for (var entry of coverageInfo) {
      var node = this._nodeForCoverageInfo.get(entry);
      if (node) {
        hadUpdates = node._refreshIfNeeded(maxSize) || hadUpdates;
        continue;
      }
      hadUpdates = true;
      node = new Coverage.CoverageListView.GridNode(entry, maxSize);
      this._nodeForCoverageInfo.set(entry, node);
      rootNode.appendChild(node);
    }
    if (hadUpdates)
      this._sortingChanged();
  }

  reset() {
    this._nodeForCoverageInfo.clear();
    this._dataGrid.rootNode().removeChildren();
  }

  /**
   * @param {!Common.Event} event
   */
  _onOpenedNode(event) {
    var node = /** @type Coverage.CoverageListView.GridNode */ (event.data);
    this._revealSourceForNode(node);
  }

  /**
   * @param {!Event} event
   */
  _onKeyDown(event) {
    if (!isEnterKey(event))
      return;
    event.consume(true);
    this._revealSourceForNode(this._dataGrid.selectedNode);
  }

  /**
   * @param {?DataGrid.DataGridNode} node
   */
  async _revealSourceForNode(node) {
    if (!node)
      return;
    var coverageInfo = /** @type {!Coverage.CoverageListView.GridNode} */ (node)._coverageInfo;
    var sourceCode = Workspace.workspace.uiSourceCodeForURL(coverageInfo.url());
    if (!sourceCode)
      return;
    var content = await sourceCode.requestContent();
    if (TextUtils.isMinified(content)) {
      var formatData = await Sources.sourceFormatter.format(sourceCode);
      Common.Revealer.reveal(formatData.formattedSourceCode);
    } else {
      Common.Revealer.reveal(sourceCode);
    }
  }

  _sortingChanged() {
    var columnId = this._dataGrid.sortColumnId();
    if (!columnId)
      return;
    var sortFunction;
    switch (columnId) {
      case 'url':
        sortFunction = compareURL;
        break;
      case 'type':
        sortFunction = compareType;
        break;
      case 'size':
        sortFunction = compareNumericField.bind(null, 'size');
        break;
      case 'bars':
      case 'unusedSize':
        sortFunction = compareNumericField.bind(null, 'unusedSize');
        break;
      default:
        console.assert(false, 'Unknown sort field: ' + columnId);
        return;
    }

    this._dataGrid.sortNodes(sortFunction, !this._dataGrid.isSortOrderAscending());

    /**
     * @param {!DataGrid.DataGridNode} a
     * @param {!DataGrid.DataGridNode} b
     * @return {number}
     */
    function compareURL(a, b) {
      var nodeA = /** @type {!Coverage.CoverageListView.GridNode} */ (a);
      var nodeB = /** @type {!Coverage.CoverageListView.GridNode} */ (b);

      return nodeA._displayURL.localeCompare(nodeB._displayURL);
    }

    /**
     * @param {string} fieldName
     * @param {!DataGrid.DataGridNode} a
     * @param {!DataGrid.DataGridNode} b
     * @return {number}
     */
    function compareNumericField(fieldName, a, b) {
      var nodeA = /** @type {!Coverage.CoverageListView.GridNode} */ (a);
      var nodeB = /** @type {!Coverage.CoverageListView.GridNode} */ (b);

      return nodeA._coverageInfo[fieldName]() - nodeB._coverageInfo[fieldName]() || compareURL(a, b);
    }

    /**
     * @param {!DataGrid.DataGridNode} a
     * @param {!DataGrid.DataGridNode} b
     * @return {number}
     */
    function compareType(a, b) {
      var nodeA = /** @type {!Coverage.CoverageListView.GridNode} */ (a);
      var nodeB = /** @type {!Coverage.CoverageListView.GridNode} */ (b);
      var typeA = Coverage.CoverageListView._typeToString(nodeA._coverageInfo.type());
      var typeB = Coverage.CoverageListView._typeToString(nodeB._coverageInfo.type());
      return typeA.localeCompare(typeB) || compareURL(a, b);
    }
  }

  /**
   * @param {!Coverage.CoverageType} type
   */
  static _typeToString(type) {
    var types = [];
    if (type & Coverage.CoverageType.CSS)
      types.push(Common.UIString('CSS'));
    if (type & Coverage.CoverageType.JavaScript)
      types.push(Common.UIString('JS'));
    return types.join('+');
  }
};

Coverage.CoverageListView.GridNode = class extends DataGrid.SortableDataGridNode {
  /**
   * @param {!Coverage.URLCoverageInfo} coverageInfo
   * @param {number} maxSize
   */
  constructor(coverageInfo, maxSize) {
    super();
    this._coverageInfo = coverageInfo;
    /** @type {number|undefined} */
    this._lastUsedSize;
    this._url = coverageInfo.url();
    this._displayURL = new Common.ParsedURL(this._url).displayName;
    this._maxSize = maxSize;
  }

  /**
   * @param {number} maxSize
   * @return {boolean}
   */
  _refreshIfNeeded(maxSize) {
    if (this._lastUsedSize === this._coverageInfo.usedSize() && maxSize === this._maxSize)
      return false;
    this._lastUsedSize = this._coverageInfo.usedSize();
    this._maxSize = maxSize;
    this.refresh();
    return true;
  }

  /**
   * @override
   * @param {string} columnId
   * @return {!Element}
   */
  createCell(columnId) {
    var cell = this.createTD(columnId);
    switch (columnId) {
      case 'url':
        cell.title = this._url;
        var outer = cell.createChild('div', 'url-outer');
        var prefix = outer.createChild('div', 'url-prefix');
        var suffix = outer.createChild('div', 'url-suffix');
        var splitURL = /^(.*)(\/[^/]*)$/.exec(this._url);
        prefix.textContent = splitURL ? splitURL[1] : this._url;
        suffix.textContent = splitURL ? splitURL[2] : '';
        break;
      case 'type':
        cell.textContent = Coverage.CoverageListView._typeToString(this._coverageInfo.type());
        break;
      case 'size':
        cell.textContent = Number.withThousandsSeparator(this._coverageInfo.size() || 0);
        break;
      case 'unusedSize':
        var unusedSize = this._coverageInfo.unusedSize() || 0;
        var unusedSizeSpan = cell.createChild('span');
        var unusedPercentsSpan = cell.createChild('span', 'percent-value');
        unusedSizeSpan.textContent = Number.withThousandsSeparator(unusedSize);
        unusedPercentsSpan.textContent = Common.UIString('%.1f\xa0%%', unusedSize / this._coverageInfo.size() * 100);
        break;
      case 'bars':
        var barContainer = cell.createChild('div', 'bar-container');
        var unusedSizeBar = barContainer.createChild('div', 'bar bar-unused-size');
        unusedSizeBar.style.width = Math.ceil(100 * this._coverageInfo.unusedSize() / this._maxSize) + '%';
        var usedSizeBar = barContainer.createChild('div', 'bar bar-used-size');
        usedSizeBar.style.width = Math.floor(100 * this._coverageInfo.usedSize() / this._maxSize) + '%';
    }
    return cell;
  }
};
