// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as LayerViewer from './layer_viewer.js';

describeWithEnvironment('LayerTreeOutline', () => {
  it('renders a layer tree', async () => {
    const layerViewHost = new LayerViewer.LayerViewHost.LayerViewHost();
    const treeOutline = new LayerViewer.LayerTreeOutline.LayerTreeOutline(layerViewHost);
    renderElementIntoDOM(treeOutline, {includeCommonStyles: true});

    const rootLayer = {
      id: () => '1',
      children: () => [],
      drawsContent: () => true,
      gpuMemoryUsage: () => 1024 * 1024,
      width: () => 800,
      height: () => 600,
      nodeForSelfOrAncestor: () => null,
      parent: () => null,
    } as unknown as SDK.LayerTreeBase.Layer;

    const childLayer = {
      id: () => '2',
      children: () => [],
      drawsContent: () => true,
      gpuMemoryUsage: () => 512 * 1024,
      width: () => 400,
      height: () => 300,
      nodeForSelfOrAncestor: () => null,
      parent: () => rootLayer,
    } as unknown as SDK.LayerTreeBase.Layer;

    rootLayer.children = () => [childLayer];

    const layerTree = {
      root: () => rootLayer,
      contentRoot: () => rootLayer,
      forEachLayer: (callback: (layer: SDK.LayerTreeBase.Layer) => void) => {
        callback(rootLayer);
        callback(childLayer);
        return false;
      },
      layerById: (id: string) => {
        if (id === '1') {
          return rootLayer;
        }
        if (id === '2') {
          return childLayer;
        }
        return null;
      },
    } as unknown as SDK.LayerTreeBase.LayerTreeBase;

    treeOutline.setLayerTree(layerTree);

    const rootNode = LayerViewer.LayerTreeOutline.layerToTreeElement.get(rootLayer);
    if (rootNode) {
      await rootNode.expandRecursively();
    }

    await assertScreenshot('layer_viewer/layer_tree_outline.png');
  });
});
