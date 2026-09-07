// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type * as SDK from '../../core/sdk/sdk.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as RenderCoordinator from '../../ui/components/render_coordinator/render_coordinator.js';

import * as LayerViewer from './layer_viewer.js';

function createMockLayerTree() {
  const rootLayer = {
    id: () => '1',
    width: () => 800,
    height: () => 600,
    drawsContent: () => true,
    gpuMemoryUsage: () => 1024 * 1024,
    parent: () => null,
    nodeForSelfOrAncestor: () => null,
  } as unknown as SDK.LayerTreeBase.Layer;

  const childLayer = {
    id: () => '2',
    width: () => 400,
    height: () => 300,
    drawsContent: () => true,
    gpuMemoryUsage: () => 512 * 1024,
    parent: () => rootLayer,
    nodeForSelfOrAncestor: () => null,
  } as unknown as SDK.LayerTreeBase.Layer;

  const layerTree = {
    contentRoot: () => rootLayer,
    root: () => rootLayer,
    forEachLayer: (callback: (layer: SDK.LayerTreeBase.Layer) => void) => {
      callback(rootLayer);
      callback(childLayer);
    },
  } as SDK.LayerTreeBase.LayerTreeBase;

  return {rootLayer, childLayer, layerTree};
}

describeWithEnvironment('LayerTreeOutline', () => {
  it('renders a layer tree', async () => {
    const {rootLayer, childLayer} = createMockLayerTree();

    const treeData = [{
      layer: rootLayer,
      isExpanded: true,
      children: [{
        layer: childLayer,
        isExpanded: false,
        children: [],
      }],
    }];

    const viewInput = {
      treeData,
      hoveredLayer: null,
      selectedLayer: rootLayer,
      layerCount: 2,
      totalLayerMemory: 1024 * 1024 + 512 * 1024,
      onSelect: () => {},
      onHover: () => {},
      onContextMenu: () => {},
    };

    const target = document.createElement('div');
    renderElementIntoDOM(target, {includeCommonStyles: true});
    LayerViewer.LayerTreeOutline.DEFAULT_VIEW(viewInput, {}, target);

    await RenderCoordinator.done();
    const tree = target.querySelector('devtools-tree');
    if (tree) {
      const outline = tree.getInternalTreeOutlineForTest();
      await outline.firstChild()?.expandRecursively();
    }

    await assertScreenshot('layer_viewer/layer_tree_outline.png');
  });

  it('handles hover and selection of layers', async () => {
    const layerViewHost = new LayerViewer.LayerViewHost.LayerViewHost();
    const view = createViewFunctionStub(LayerViewer.LayerTreeOutline.LayerTreeOutline);
    const treeOutline = new LayerViewer.LayerTreeOutline.LayerTreeOutline(layerViewHost, view);
    renderElementIntoDOM(treeOutline);

    const {childLayer, layerTree} = createMockLayerTree();

    treeOutline.setLayerTree(layerTree);

    // Wait for the initial render triggered by wasShown / setLayerTree
    let viewInput = await view.nextInput;
    assert.strictEqual(viewInput.layerCount, 2);

    // Simulate hover over the child layer
    viewInput.onHover(childLayer);
    viewInput = await view.nextInput;
    assert.strictEqual(viewInput.hoveredLayer, childLayer, 'hovered layer should be updated');

    // Simulate mouse leave
    viewInput.onHover(null);
    viewInput = await view.nextInput;
    assert.isNull(viewInput.hoveredLayer, 'hovered layer should be null after mouse leave');

    // Simulate selecting the child layer
    viewInput.onSelect(childLayer);
    viewInput = await view.nextInput;
    assert.strictEqual(viewInput.selectedLayer, childLayer, 'selected layer should be updated');
    assert.strictEqual(layerViewHost.selection()?.layer(), childLayer,
                       'layerViewHost selection should be the child layer');
  });

  it('renders data-backend-node-id and data-target-id on layer items with DOM nodes', async () => {
    const mockDomNode = {
      backendNodeId: () => 123,
      domModel: () => ({
        target: () => ({
          id: () => 'target-xyz',
        }),
      }),
      simpleSelector: () => 'div#my-layer',
    } as unknown as SDK.DOMModel.DOMNode;

    const layerWithNode = {
      id: () => 'layer-1',
      width: () => 100,
      height: () => 100,
      nodeForSelfOrAncestor: () => mockDomNode,
    } as unknown as SDK.LayerTreeBase.Layer;

    const viewInput = {
      treeData: [{
        layer: layerWithNode,
        isExpanded: false,
        children: [],
      }],
      hoveredLayer: null,
      selectedLayer: null,
      layerCount: 1,
      totalLayerMemory: 100,
      onSelect: () => {},
      onHover: () => {},
      onContextMenu: () => {},
    };

    const target = document.createElement('div');
    renderElementIntoDOM(target, {includeCommonStyles: true});
    LayerViewer.LayerTreeOutline.DEFAULT_VIEW(viewInput, {}, target);

    await RenderCoordinator.done();
    const tree = target.querySelector('devtools-tree');
    assert.exists(tree);
    const item = tree.templateRoot.querySelector('li[role="treeitem"]');
    assert.exists(item);
    assert.strictEqual(item?.getAttribute('data-backend-node-id'), '123');
    assert.strictEqual(item?.getAttribute('data-target-id'), 'target-xyz');
  });
});

describeWithEnvironment('LayerDetailsView', () => {
  it('renders data-backend-node-id and data-target-id on layer details container with DOM nodes', async () => {
    const mockDomNode = {
      backendNodeId: () => 456,
      domModel: () => ({
        target: () => ({
          id: () => 'target-abc',
        }),
      }),
    } as unknown as SDK.DOMModel.DOMNode;

    const layerWithNode = {
      id: () => 'layer-2',
      width: () => 200,
      height: () => 150,
      offsetX: () => 0,
      offsetY: () => 0,
      nodeForSelfOrAncestor: () => mockDomNode,
      gpuMemoryUsage: () => 2048,
      paintCount: () => 1,
      scrollRects: () => [],
      stickyPositionConstraint: () => null,
    } as unknown as SDK.LayerTreeBase.Layer;

    const viewInput = {
      layer: layerWithNode,
      snapshotSelection: null,
      compositingReasons: [],
      onScrollRectClick: () => {},
      onPaintProfilerRequested: () => {},
    };

    const target = document.createElement('div');
    renderElementIntoDOM(target, {includeCommonStyles: true});
    LayerViewer.LayerDetailsView.DEFAULT_VIEW(viewInput, undefined, target as unknown as DocumentFragment);

    await RenderCoordinator.done();
    const container = target.querySelector('.layer-details-container');
    assert.exists(container);
    assert.strictEqual(container?.getAttribute('data-backend-node-id'), '456');
    assert.strictEqual(container?.getAttribute('data-target-id'), 'target-abc');
  });
});
