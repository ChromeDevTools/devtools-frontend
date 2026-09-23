// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as i18n from '../../../../core/i18n/i18n.js';

import * as DataGrid from './data_grid.js';

describe('DataGridExporter', () => {
  let dataGrid: DataGrid.DataGrid.DataGridImpl<unknown>;

  beforeEach(() => {
    const columns: DataGrid.DataGrid.ColumnDescriptor[] = [
      {id: 'col1', title: i18n.i18n.lockedString('Column 1'), sortable: false},
      {id: 'col2', title: i18n.i18n.lockedString('Column 2'), sortable: false},
    ];
    dataGrid = new DataGrid.DataGrid.DataGridImpl({displayName: 'Test', columns});
  });

  it('exports simple grid to Markdown', () => {
    const node1 = new DataGrid.DataGrid.DataGridNode({col1: 'val1', col2: 'val2'});
    const node2 = new DataGrid.DataGrid.DataGridNode({col1: 'val3', col2: 'val4'});
    dataGrid.rootNode().appendChild(node1);
    dataGrid.rootNode().appendChild(node2);

    const markdown = DataGrid.DataGridExporter.exportToMarkdown(dataGrid);
    const expected = '| Column 1 | Column 2 |\n' +
        '| --- | --- |\n' +
        '| val1 | val2 |\n' +
        '| val3 | val4 |';
    assert.strictEqual(markdown, expected);
  });

  it('exports simple grid to CSV', () => {
    const node1 = new DataGrid.DataGrid.DataGridNode({col1: 'val1', col2: 'val2'});
    const node2 = new DataGrid.DataGrid.DataGridNode({col1: 'val3', col2: 'val4'});
    dataGrid.rootNode().appendChild(node1);
    dataGrid.rootNode().appendChild(node2);

    const csv = DataGrid.DataGridExporter.exportToCSV(dataGrid);
    const expected = 'Column 1,Column 2\n' +
        'val1,val2\n' +
        'val3,val4';
    assert.strictEqual(csv, expected);
  });

  it('escapes special characters in CSV', () => {
    const node = new DataGrid.DataGrid.DataGridNode({
      col1: 'val,with,commas',
      col2: 'val"with"quotes\nand newlines',
    });
    dataGrid.rootNode().appendChild(node);

    const csv = DataGrid.DataGridExporter.exportToCSV(dataGrid);
    const expected = 'Column 1,Column 2\n' +
        '"val,with,commas","val""with""quotes\nand newlines"';
    assert.strictEqual(csv, expected);
  });

  it('extracts text from HTMLElement cells', () => {
    const span = document.createElement('span');
    span.textContent = 'rendered text';
    const node = new DataGrid.DataGrid.DataGridNode({col1: span, col2: 'plain text'});
    dataGrid.rootNode().appendChild(node);

    const markdown = DataGrid.DataGridExporter.exportToMarkdown(dataGrid);
    assert.include(markdown, '| rendered text | plain text |');
  });

  it('escapes special characters in Markdown', () => {
    const node = new DataGrid.DataGrid.DataGridNode({
      col1: 'val|with|pipes',
      col2: 'val\nwith\nnewlines',
    });
    dataGrid.rootNode().appendChild(node);

    const markdown = DataGrid.DataGridExporter.exportToMarkdown(dataGrid);
    const expected = '| Column 1 | Column 2 |\n' +
        '| --- | --- |\n' +
        '| val\\|with\\|pipes | val<br>with<br>newlines |';
    assert.strictEqual(markdown, expected);
  });

  it('escapes Markdown formatting characters in Markdown export', () => {
    const node = new DataGrid.DataGrid.DataGridNode({
      col1: 'val *with* stars and _underscores_ and `backticks`',
      col2: 'val with [links](url) and \\ backslashes',
    });
    dataGrid.rootNode().appendChild(node);

    const markdown = DataGrid.DataGridExporter.exportToMarkdown(dataGrid);
    const expected = '| Column 1 | Column 2 |\n' +
        '| --- | --- |\n' +
        '| val \\*with\\* stars and \\_underscores\\_ and \\`backticks\\` | val with \\[links\\]\\(url\\) and \\\\ backslashes |';
    assert.strictEqual(markdown, expected);
  });

  it('escapes HTML tags and entities in Markdown export', () => {
    const node = new DataGrid.DataGrid.DataGridNode({
      col1: 'val with <div class="test">HTML tags</div>',
      col2: 'val with & symbols',
    });
    dataGrid.rootNode().appendChild(node);

    const markdown = DataGrid.DataGridExporter.exportToMarkdown(dataGrid);
    const expected = '| Column 1 | Column 2 |\n' +
        '| --- | --- |\n' +
        '| val with &lt;div class="test"&gt;HTML tags&lt;/div&gt; | val with &amp; symbols |';
    assert.strictEqual(markdown, expected);
  });

  it('handles null and undefined cell values by exporting them as empty strings', () => {
    const node = new DataGrid.DataGrid.DataGridNode({col1: null, col2: undefined});
    dataGrid.rootNode().appendChild(node);

    const markdown = DataGrid.DataGridExporter.exportToMarkdown(dataGrid);
    const expectedMarkdown = '| Column 1 | Column 2 |\n' +
        '| --- | --- |\n' +
        '|  |  |';
    assert.strictEqual(markdown, expectedMarkdown);

    const csv = DataGrid.DataGridExporter.exportToCSV(dataGrid);
    const expectedCSV = 'Column 1,Column 2\n' +
        ',';
    assert.strictEqual(csv, expectedCSV);
  });

  it('handles empty column lists by returning an empty string', () => {
    const emptyDataGrid = new DataGrid.DataGrid.DataGridImpl({displayName: 'Empty', columns: []});
    const markdown = DataGrid.DataGridExporter.exportToMarkdown(emptyDataGrid);
    assert.strictEqual(markdown, '');

    const csv = DataGrid.DataGridExporter.exportToCSV(emptyDataGrid);
    assert.strictEqual(csv, '');
  });

  it('escapes formula prefixes in CSV headers and cells', () => {
    const columns: DataGrid.DataGrid.ColumnDescriptor[] = [
      {id: 'col1', title: i18n.i18n.lockedString('=HeaderFormula'), sortable: false},
      {id: 'col2', title: i18n.i18n.lockedString('Column 2'), sortable: false},
    ];
    const grid = new DataGrid.DataGrid.DataGridImpl({displayName: 'Test', columns});
    grid.rootNode().appendChild(new DataGrid.DataGrid.DataGridNode({col1: '=SUM(1,2)', col2: -42}));

    const csv = DataGrid.DataGridExporter.exportToCSV(grid);
    const expected = '\'=HeaderFormula,Column 2\n' +
        '"\'=SUM(1,2)",-42';
    assert.strictEqual(csv, expected);
  });
});
