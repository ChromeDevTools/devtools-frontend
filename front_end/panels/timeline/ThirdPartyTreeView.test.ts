// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Trace from '../../models/trace/trace.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Timeline from './timeline.js';
import * as Utils from './utils/utils.js';

describeWithEnvironment('Third party tree', function() {
  it('does not select the first row by default', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const treeView = new Timeline.ThirdPartyTreeView.ThirdPartyTreeViewWidget();
    const mapper = new Utils.EntityMapper.EntityMapper(parsedTrace);
    const events = [...mapper.mappings().eventsByEntity.values()].flat();
    treeView.setModelWithEvents(events, parsedTrace, mapper);
    const sel: Timeline.TimelineSelection.TimeRangeSelection = {
      bounds: parsedTrace.Meta.traceBounds,
    };
    const box = new UI.Widget.VBox();
    treeView.show(box.element);
    treeView.updateContents(sel);
    assert.isNull(treeView.dataGrid.selectedNode);
  });

  it('hides the table if there are no events', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const mapper = new Utils.EntityMapper.EntityMapper(parsedTrace);
    const treeView = new Timeline.ThirdPartyTreeView.ThirdPartyTreeViewWidget();
    renderElementIntoDOM(treeView);
    treeView.setModelWithEvents(null, parsedTrace, mapper);
    assert.isTrue(treeView.element.classList.contains('empty-table'));

    const events = [...mapper.mappings().eventsByEntity.values()].flat();
    treeView.setModelWithEvents(events, parsedTrace, mapper);
    assert.isFalse(treeView.element.classList.contains('empty-table'));

    treeView.setModelWithEvents([], parsedTrace, mapper);
    assert.isTrue(treeView.element.classList.contains('empty-table'));
  });

  it('includes 1p and extension badges', async function() {
    // This trace creates 2 nodes in the tree. One representing the first party entity, and one for
    // a chrome extension.
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'extension-tracks-and-marks.json.gz');
    const treeView = new Timeline.ThirdPartyTreeView.ThirdPartyTreeViewWidget();
    const mapper = new Utils.EntityMapper.EntityMapper(parsedTrace);
    const events = [...mapper.mappings().eventsByEntity.values()].flat();

    treeView.setModelWithEvents(events, parsedTrace, mapper);
    const sel: Timeline.TimelineSelection.TimeRangeSelection = {
      bounds: parsedTrace.Meta.traceBounds,
    };
    treeView.updateContents(sel);
    const tree = treeView.buildTree() as Trace.Extras.TraceTree.BottomUpRootNode;
    const topNodesIterator = [...tree.children().values()].flat();

    // Node with ext
    const firstNode = topNodesIterator[0];
    assert.strictEqual(firstNode.id.toString(), 'ienfalfjdbdpebioblfackkekamfmbnh');

    const extensionNode = new Timeline.TimelineTreeView.TreeGridNode(
        firstNode, firstNode.totalTime, firstNode.selfTime, firstNode.totalTime, treeView);
    const extEntity = extensionNode?.createCell('site');

    let gotBadgeName = extEntity.querySelector<HTMLTableRowElement>('.entity-badge')?.textContent || '';
    assert.strictEqual(gotBadgeName, 'Extension');

    // Node with first party
    const secondNode = topNodesIterator[1];
    assert.strictEqual(secondNode.id.toString(), 'localhost');

    const firstPartyNode = new Timeline.TimelineTreeView.TreeGridNode(
        secondNode, secondNode.totalTime, secondNode.selfTime, secondNode.totalTime, treeView);
    const firstPartyEntity = firstPartyNode?.createCell('site');

    gotBadgeName = firstPartyEntity.querySelector<HTMLTableRowElement>('.entity-badge')?.textContent || '';
    assert.strictEqual(gotBadgeName, '1st party');
  });
});
