// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../models/trace/trace.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Timeline from './timeline.js';

describeWithEnvironment('Third party tree', function() {
  it('does not select the first row by default', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const treeView = new Timeline.ThirdPartyTreeView.ThirdPartyTreeViewWidget();
    const mapper = new Trace.EntityMapper.EntityMapper(parsedTrace);
    const events = [...mapper.mappings().eventsByEntity.values()].flat().sort((a, b) => a.ts - b.ts);
    treeView.setModelWithEvents(events, parsedTrace, mapper);
    const sel: Timeline.TimelineSelection.TimeRangeSelection = {
      bounds: parsedTrace.data.Meta.traceBounds,
    };
    const box = new UI.Widget.VBox();
    treeView.show(box.element);
    treeView.updateContents(sel);
    assert.isNull(treeView.dataGrid.selectedNode);
  });

  it('hides the table if there are no events', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const mapper = new Trace.EntityMapper.EntityMapper(parsedTrace);
    const treeView = new Timeline.ThirdPartyTreeView.ThirdPartyTreeViewWidget();
    renderElementIntoDOM(treeView);
    treeView.setModelWithEvents(null, parsedTrace, mapper);
    assert.isTrue(treeView.element.classList.contains('empty-table'));

    const events = [...mapper.mappings().eventsByEntity.values()].flat().sort((a, b) => a.ts - b.ts);
    treeView.setModelWithEvents(events, parsedTrace, mapper);
    assert.isFalse(treeView.element.classList.contains('empty-table'));

    treeView.setModelWithEvents([], parsedTrace, mapper);
    assert.isTrue(treeView.element.classList.contains('empty-table'));
  });

  it('includes 1p and extension badges', async function() {
    // This trace creates 2 nodes in the tree. One representing the first party entity, and one for
    // a chrome extension.
    const parsedTrace = await TraceLoader.traceEngine(this, 'extension-tracks-and-marks.json.gz');
    const treeView = new Timeline.ThirdPartyTreeView.ThirdPartyTreeViewWidget();
    const mapper = new Trace.EntityMapper.EntityMapper(parsedTrace);
    const events = [...mapper.mappings().eventsByEntity.values()].flat().sort((a, b) => a.ts - b.ts);

    treeView.setModelWithEvents(events, parsedTrace, mapper);
    const sel: Timeline.TimelineSelection.TimeRangeSelection = {
      bounds: parsedTrace.data.Meta.traceBounds,
    };
    treeView.updateContents(sel);
    const tree = treeView.buildTree() as Trace.Extras.TraceTree.BottomUpRootNode;
    const topNodesIterator = [...tree.children().values()].flat().sort((a, b) => b.selfTime - a.selfTime);

    // Node with first party
    let node = topNodesIterator[0];
    assert.strictEqual(node.id.toString(), 'localhost');
    assert.strictEqual(node.selfTime, 1008.3260016441345);
    let gridNode =
        new Timeline.TimelineTreeView.TreeGridNode(node, node.totalTime, node.selfTime, node.totalTime, treeView);
    let entity = gridNode?.createCell('site');
    let gotBadgeName = entity.querySelector<HTMLTableRowElement>('.entity-badge')?.textContent || '';
    assert.strictEqual(gotBadgeName, '1st party');

    // Node for third party origin
    node = topNodesIterator[1];
    assert.strictEqual(node.id.toString(), 'wikimedia.org');
    assert.strictEqual(node.selfTime, 148.06499981880188);
    gridNode =
        new Timeline.TimelineTreeView.TreeGridNode(node, node.totalTime, node.selfTime, node.totalTime, treeView);
    entity = gridNode?.createCell('site');
    gotBadgeName = entity.querySelector<HTMLTableRowElement>('.entity-badge')?.textContent || '';
    assert.strictEqual(gotBadgeName, '');  // no badge

    // Node with ext
    node = topNodesIterator[2];
    assert.strictEqual(node.id.toString(), 'ienfalfjdbdpebioblfackkekamfmbnh');
    assert.strictEqual(node.selfTime, 2.5320003032684326);
    gridNode =
        new Timeline.TimelineTreeView.TreeGridNode(node, node.totalTime, node.selfTime, node.totalTime, treeView);
    entity = gridNode?.createCell('site');
    gotBadgeName = entity.querySelector<HTMLTableRowElement>('.entity-badge')?.textContent || '';
    assert.strictEqual(gotBadgeName, 'Extension');
  });
});
