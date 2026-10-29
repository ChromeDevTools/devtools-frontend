// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {after, before, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Trace from '../../models/trace/trace.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {deinitializeGlobalVars, initializeGlobalVars} from '../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Timeline from './timeline.js';

describe('Third party tree', function() {
  before(async () => {
    await initializeGlobalVars();
  });

  after(async () => {
    await deinitializeGlobalVars();
  });
  it('does not select the first row by default', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const treeView = new Timeline.ThirdPartyTreeView.ThirdPartyTreeViewWidget();
    const mapper = new Trace.EntityMapper.EntityMapper(parsedTrace);
    const events = [...mapper.mappings().eventsByEntity.values()].flat().sort((a, b) => a.ts - b.ts);
    treeView.model = {selectedEvents: events, parsedTrace, entityMapper: mapper};
    const sel: Timeline.TimelineSelection.TimeRangeSelection = {
      bounds: parsedTrace.data.Meta.traceBounds,
    };
    const box = new UI.Widget.VBox();
    treeView.show(box.element);
    treeView.activeSelection = sel;
    assert.isNull(treeView.dataGrid.selectedNode);
  });

  it('hides the table if there are no events', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const mapper = new Trace.EntityMapper.EntityMapper(parsedTrace);
    const treeView = new Timeline.ThirdPartyTreeView.ThirdPartyTreeViewWidget();
    renderElementIntoDOM(treeView);
    treeView.model = {selectedEvents: null, parsedTrace, entityMapper: mapper};
    assert.isTrue(treeView.element.classList.contains('empty-table'));

    const events = [...mapper.mappings().eventsByEntity.values()].flat().sort((a, b) => a.ts - b.ts);
    treeView.model = {selectedEvents: events, parsedTrace, entityMapper: mapper};
    assert.isFalse(treeView.element.classList.contains('empty-table'));

    treeView.model = {selectedEvents: [], parsedTrace, entityMapper: mapper};
    assert.isTrue(treeView.element.classList.contains('empty-table'));
  });

  it('includes 1p and extension badges', async function() {
    // This trace creates 3 nodes in the tree: first party (localhost), a chrome extension,
    // and a third-party image request (wikimedia.org) with transfer size but 0 main-thread selfTime.
    const parsedTrace = await TraceLoader.traceEngine(this, 'extension-tracks-and-marks.json.gz');
    const treeView = new Timeline.ThirdPartyTreeView.ThirdPartyTreeViewWidget();
    const mapper = new Trace.EntityMapper.EntityMapper(parsedTrace);
    const events = [...mapper.mappings().eventsByEntity.values()].flat().sort((a, b) => a.ts - b.ts);

    treeView.model = {selectedEvents: events, parsedTrace, entityMapper: mapper};
    const sel: Timeline.TimelineSelection.TimeRangeSelection = {
      bounds: parsedTrace.data.Meta.traceBounds,
    };
    treeView.activeSelection = sel;
    const tree = treeView.buildTree() as Trace.Extras.TraceTree.BottomUpRootNode;
    const topNodesIterator = [...tree.children().values()].flat().sort((a, b) => b.selfTime - a.selfTime);

    // Node with first party
    let node = topNodesIterator[0];
    assert.strictEqual(node.id.toString(), 'localhost');
    assert.strictEqual(node.selfTime, 1008.4510016441345);
    let gridNode =
        new Timeline.TimelineTreeView.TreeGridNode(node, node.totalTime, node.selfTime, node.totalTime, treeView);
    let entity = gridNode?.createCell('site');
    let gotBadgeName = entity.querySelector<HTMLTableRowElement>('.entity-badge')?.textContent || '';
    assert.strictEqual(gotBadgeName, '1st party');

    // Node with ext
    node = topNodesIterator[1];
    assert.strictEqual(node.id.toString(), 'ienfalfjdbdpebioblfackkekamfmbnh');
    assert.strictEqual(node.selfTime, 2.5320003032684326);
    gridNode =
        new Timeline.TimelineTreeView.TreeGridNode(node, node.totalTime, node.selfTime, node.totalTime, treeView);
    entity = gridNode?.createCell('site');
    gotBadgeName = entity.querySelector<HTMLTableRowElement>('.entity-badge')?.textContent || '';
    assert.strictEqual(gotBadgeName, 'Extension');

    // Node for third party origin (network request only, so 0 CPU selfTime)
    node = topNodesIterator[2];
    assert.strictEqual(node.id.toString(), 'wikimedia.org');
    assert.strictEqual(node.selfTime, 0);
    assert.isAbove(node.transferSize, 0);
    gridNode =
        new Timeline.TimelineTreeView.TreeGridNode(node, node.totalTime, node.selfTime, node.totalTime, treeView);
    entity = gridNode?.createCell('site');
    gotBadgeName = entity.querySelector<HTMLTableRowElement>('.entity-badge')?.textContent || '';
    assert.strictEqual(gotBadgeName, '');  // no badge
  });

  it('allows setting maxRows', async function() {
    const treeView = new Timeline.ThirdPartyTreeView.ThirdPartyTreeViewWidget();
    treeView.maxRows = 5;
    assert.strictEqual(treeView.element.style.getPropertyValue('--max-rows'), '5');
    assert.isTrue(treeView.element.classList.contains('has-max-rows'));
  });

  it('allows setting onRowHovered', async function() {
    const treeView = new Timeline.ThirdPartyTreeView.ThirdPartyTreeViewWidget();
    let hoveredNode: Trace.Extras.TraceTree.Node|null|undefined;
    treeView.onRowHovered = node => {
      hoveredNode = node;
    };
    treeView.dispatchEventToListeners(Timeline.TimelineTreeView.TimelineTreeView.Events.TREE_ROW_HOVERED, {node: null});
    assert.isNull(hoveredNode);
  });

  it('allows setting onRowClicked', async function() {
    const treeView = new Timeline.ThirdPartyTreeView.ThirdPartyTreeViewWidget();
    let clickedNode: Trace.Extras.TraceTree.Node|null|undefined;
    treeView.onRowClicked = node => {
      clickedNode = node;
    };
    treeView.dispatchEventToListeners(Timeline.TimelineTreeView.TimelineTreeView.Events.TREE_ROW_CLICKED, {node: null});
    assert.isNull(clickedNode);
  });

  it('allows setting onBottomUpButtonClicked', async function() {
    const treeView = new Timeline.ThirdPartyTreeView.ThirdPartyTreeViewWidget();
    let bottomUpNode: Trace.Extras.TraceTree.Node|null|undefined;
    treeView.onBottomUpButtonClicked = node => {
      bottomUpNode = node;
    };
    treeView.dispatchEventToListeners(Timeline.TimelineTreeView.TimelineTreeView.Events.BOTTOM_UP_BUTTON_CLICKED, null);
    assert.isNull(bottomUpNode);
  });

  it('does not build tree with undefined bounds when model is set before activeSelection', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const treeView = new Timeline.ThirdPartyTreeView.ThirdPartyTreeViewWidget();
    const mapper = new Trace.EntityMapper.EntityMapper(parsedTrace);
    const events = [...mapper.mappings().eventsByEntity.values()].flat().sort((a, b) => a.ts - b.ts);
    renderElementIntoDOM(treeView);

    const buildSpy = sinon.spy(treeView, 'buildTree');
    treeView.model = {selectedEvents: events, parsedTrace, entityMapper: mapper};
    sinon.assert.callCount(buildSpy, 0);

    const sel: Timeline.TimelineSelection.TimeRangeSelection = {
      bounds: parsedTrace.data.Meta.traceBounds,
    };
    treeView.activeSelection = sel;
    sinon.assert.callCount(buildSpy, 1);
  });
});
