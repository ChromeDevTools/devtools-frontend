// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 * @suppress {accessControls}
 */

/**
 * @param {!DataGrid.DataGrid} dataGrid
 */
DataGridTestRunner.dumpDataGrid = function(dataGrid) {
  TestRunner.addResult(DataGridTestRunner.dumpDataGridIntoString(dataGrid));
};

/**
 * @param {!DataGrid.DataGrid} dataGrid
 * @return {string}
 */
DataGridTestRunner.dumpDataGridIntoString = function(dataGrid) {
  var tableElement = dataGrid.element;
  var textRows = [];
  var textWidths = [];
  var rows = tableElement.getElementsByTagName('tr');
  for (var i = 0; i < rows.length; ++i) {
    var row = rows[i];
    if (!row.offsetHeight || !row.textContent)
      continue;
    var textCols = [];
    var cols = row.getElementsByTagName('td');
    for (var j = 0; j < cols.length; ++j) {
      var col = cols[j];
      if (!col.offsetHeight)
        continue;
      var index = textCols.length;
      var content = col.textContent || (col.firstChild && col.firstChild.title) || '';
      var text = padding(col) + content;
      textWidths[index] = Math.max(textWidths[index] || 0, text.length);
      textCols[index] = text;
    }
    if (textCols.length)
      textRows.push(textCols);
  }

  /**
   * @param {!Node} target
   * @return {string}
   */
  function padding(target) {
    var cell = target.enclosingNodeOrSelfWithNodeName('td');
    if (!cell.classList.contains('disclosure'))
      return '';
    var node = dataGrid.dataGridNodeFromNode(target);
    var spaces = (node ? node.depth : 0) * 2;
    return Array(spaces + 1).join(' ');
  }

  /**
   * @param {string} text
   * @param {number} width
   */
  function alignText(text, width) {
    var spaces = width - text.length;
    return text + Array(spaces + 1).join(' ');
  }

  var output = [];
  for (var i = 0; i < textRows.length; ++i) {
    var line = '';
    for (var j = 0; j < textRows[i].length; ++j) {
      if (j)
        line += ' | ';
      line += alignText(textRows[i][j], textWidths[j]);
    }
    line += '|';
    output.push(line);
  }
  return output.join('\n');
};

DataGridTestRunner.validateDataGrid = function(root) {
  var children = root.children;

  for (var i = 0; i < children.length; ++i) {
    var child = children[i];

    if (child.parent !== root)
      throw 'Wrong parent for child ' + child.data.id + ' of ' + root.data.id;

    if (child.nextSibling !== ((i + 1 === children.length ? null : children[i + 1])))
      throw 'Wrong child.nextSibling for ' + child.data.id + ' (' + i + ' of ' + children.length + ') ';

    if (child.previousSibling !== ((i ? children[i - 1] : null)))
      throw 'Wrong child.previousSibling for ' + child.data.id + ' (' + i + ' of ' + children.length + ') ';

    if (child.parent && !child.parent._isRoot && child.depth !== root.depth + 1)
      throw 'Wrong depth for ' + child.data.id + ' expected ' + (root.depth + 1) + ' but got ' + child.depth;

    DataGridTestRunner.validateDataGrid(child);
  }

  var selectedNode = root.dataGrid.selectedNode;

  if (!root.parent && selectedNode) {
    if (!selectedNode.selectable)
      throw 'Selected node is not selectable';

    for (var node = selectedNode; node && node !== root; node = node.parent) {
    }

    if (!node)
      throw 'Selected node (' + selectedNode.data.id + ') is not within the DataGrid';
  }
};

DataGridTestRunner.dumpAndValidateDataGrid = function(root) {
  DataGridTestRunner.dumpDataGrid(root);
  DataGridTestRunner.validateDataGrid(root);
};
