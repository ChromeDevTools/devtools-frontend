// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';

import type * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';

import * as Layers from './layers.js';

const ROOT_LAYER_ID = '6' as Protocol.LayerTree.LayerId;
const DOC_SCROLL_LAYER_ID = '7' as Protocol.LayerTree.LayerId;
const DOC_CONTENTS_LAYER_ID = '14' as Protocol.LayerTree.LayerId;
const SUBFRAME1_LAYER_ID = '15' as Protocol.LayerTree.LayerId;
const LAYER_A_ID = '9' as Protocol.LayerTree.LayerId;
const LAYER_B1_INITIAL_ID = '10' as Protocol.LayerTree.LayerId;
const LAYER_B1_REPARENTED_ID = '16' as Protocol.LayerTree.LayerId;
const LAYER_B2_ID = '11' as Protocol.LayerTree.LayerId;
const LAYER_C_ID = '12' as Protocol.LayerTree.LayerId;
const LAYER_B3_ID = '13' as Protocol.LayerTree.LayerId;
const LAYER_B4_ID = '17' as Protocol.LayerTree.LayerId;
const TRAILING_LAYER_ID = '5' as Protocol.LayerTree.LayerId;

const DOCUMENT_BACKEND_ID = 5 as Protocol.DOM.BackendNodeId;
const SUBFRAME1_BACKEND_ID = 31 as Protocol.DOM.BackendNodeId;
const A_BACKEND_ID = 19 as Protocol.DOM.BackendNodeId;
const B1_BACKEND_ID = 20 as Protocol.DOM.BackendNodeId;
const B2_BACKEND_ID = 21 as Protocol.DOM.BackendNodeId;
const C_BACKEND_ID = 22 as Protocol.DOM.BackendNodeId;
const B3_BACKEND_ID = 23 as Protocol.DOM.BackendNodeId;
const B4_BACKEND_ID = 33 as Protocol.DOM.BackendNodeId;

const DOCUMENT_NODE_ID = 7 as Protocol.DOM.NodeId;
const A_NODE_ID = 11 as Protocol.DOM.NodeId;
const SUBFRAME1_NODE_ID = 17 as Protocol.DOM.NodeId;
const B1_NODE_ID = 18 as Protocol.DOM.NodeId;
const B2_NODE_ID = 19 as Protocol.DOM.NodeId;
const B3_NODE_ID = 20 as Protocol.DOM.NodeId;
const C_NODE_ID = 21 as Protocol.DOM.NodeId;
const B4_NODE_ID = 22 as Protocol.DOM.NodeId;

const BACKEND_NODE_ID_TO_NODE_ID = new Map<Protocol.DOM.BackendNodeId, Protocol.DOM.NodeId>([
  [DOCUMENT_BACKEND_ID, DOCUMENT_NODE_ID],
  [SUBFRAME1_BACKEND_ID, SUBFRAME1_NODE_ID],
  [A_BACKEND_ID, A_NODE_ID],
  [B1_BACKEND_ID, B1_NODE_ID],
  [B2_BACKEND_ID, B2_NODE_ID],
  [C_BACKEND_ID, C_NODE_ID],
  [B3_BACKEND_ID, B3_NODE_ID],
  [B4_BACKEND_ID, B4_NODE_ID],
]);

const MAIN_FRAME_ID = '9F7EC7C5452DD1B24C1B75E68C4EB3B1' as Protocol.Page.FrameId;
const SUBFRAME_ID = '7DDCA92FA9A2E9D78B7D5AA1A60E67E6' as Protocol.Page.FrameId;

function createDocumentTreePayload(): Protocol.DOM.Node {
  return {
    nodeId: DOCUMENT_NODE_ID,
    backendNodeId: DOCUMENT_BACKEND_ID,
    nodeType: 9,
    nodeName: '#document',
    localName: '',
    nodeValue: '',
    childNodeCount: 1,
    documentURL: 'http://127.0.0.1:8000/devtools/resources/inspected-page.html',
    baseURL: 'http://127.0.0.1:8000/devtools/layers/',
    xmlVersion: '',
    children: [
      {
        nodeId: 8 as Protocol.DOM.NodeId,
        parentId: DOCUMENT_NODE_ID,
        backendNodeId: 14 as Protocol.DOM.BackendNodeId,
        nodeType: 1,
        nodeName: 'HTML',
        localName: 'html',
        nodeValue: '',
        childNodeCount: 2,
        attributes: [],
        frameId: MAIN_FRAME_ID,
        children: [
          {
            nodeId: 9 as Protocol.DOM.NodeId,
            parentId: 8 as Protocol.DOM.NodeId,
            backendNodeId: 15 as Protocol.DOM.BackendNodeId,
            nodeType: 1,
            nodeName: 'HEAD',
            localName: 'head',
            nodeValue: '',
            childNodeCount: 2,
            attributes: [],
          },
          {
            nodeId: 10 as Protocol.DOM.NodeId,
            parentId: 8 as Protocol.DOM.NodeId,
            backendNodeId: 18 as Protocol.DOM.BackendNodeId,
            nodeType: 1,
            nodeName: 'BODY',
            localName: 'body',
            nodeValue: '',
            childNodeCount: 2,
            attributes: [],
            children: [
              {
                nodeId: A_NODE_ID,
                parentId: 10 as Protocol.DOM.NodeId,
                backendNodeId: A_BACKEND_ID,
                nodeType: 1,
                nodeName: 'DIV',
                localName: 'div',
                nodeValue: '',
                childNodeCount: 3,
                attributes: ['id', 'a', 'style', 'width: 200px; height: 200px', 'class', 'layer'],
                children: [
                  {
                    nodeId: B1_NODE_ID,
                    parentId: A_NODE_ID,
                    backendNodeId: B1_BACKEND_ID,
                    nodeType: 1,
                    nodeName: 'DIV',
                    localName: 'div',
                    nodeValue: '',
                    childNodeCount: 0,
                    attributes: ['class', 'layer', 'id', 'b1', 'style', 'width: 150px; height: 100px'],
                  },
                  {
                    nodeId: B2_NODE_ID,
                    parentId: A_NODE_ID,
                    backendNodeId: B2_BACKEND_ID,
                    nodeType: 1,
                    nodeName: 'DIV',
                    localName: 'div',
                    nodeValue: '',
                    childNodeCount: 1,
                    attributes: ['id', 'b2', 'class', 'layer', 'style', 'width: 140px; height: 110px'],
                    children: [
                      {
                        nodeId: C_NODE_ID,
                        parentId: B2_NODE_ID,
                        backendNodeId: C_BACKEND_ID,
                        nodeType: 1,
                        nodeName: 'DIV',
                        localName: 'div',
                        nodeValue: '',
                        childNodeCount: 0,
                        attributes: ['id', 'c', 'class', 'layer', 'style', 'width: 100px; height: 90px'],
                      },
                    ],
                  },
                  {
                    nodeId: B3_NODE_ID,
                    parentId: A_NODE_ID,
                    backendNodeId: B3_BACKEND_ID,
                    nodeType: 1,
                    nodeName: 'DIV',
                    localName: 'div',
                    nodeValue: '',
                    childNodeCount: 0,
                    attributes: ['id', 'b3', 'class', 'layer', 'style', 'width: 140px; height: 110px'],
                  },
                ],
              },
              {
                nodeId: 12 as Protocol.DOM.NodeId,
                parentId: 10 as Protocol.DOM.NodeId,
                backendNodeId: 24 as Protocol.DOM.BackendNodeId,
                nodeType: 1,
                nodeName: 'IFRAME',
                localName: 'iframe',
                nodeValue: '',
                childNodeCount: 0,
                attributes: ['src', 'resources/composited-iframe.html', 'id', 'frame', 'name', ''],
                frameId: SUBFRAME_ID,
                contentDocument: {
                  nodeId: 13 as Protocol.DOM.NodeId,
                  backendNodeId: 28 as Protocol.DOM.BackendNodeId,
                  nodeType: 9,
                  nodeName: '#document',
                  localName: '',
                  nodeValue: '',
                  childNodeCount: 1,
                  documentURL: 'http://127.0.0.1:8000/devtools/layers/resources/composited-iframe.html',
                  baseURL: 'http://127.0.0.1:8000/devtools/layers/resources/composited-iframe.html',
                  xmlVersion: '',
                  children: [
                    {
                      nodeId: 14 as Protocol.DOM.NodeId,
                      parentId: 13 as Protocol.DOM.NodeId,
                      backendNodeId: 29 as Protocol.DOM.BackendNodeId,
                      nodeType: 1,
                      nodeName: 'HTML',
                      localName: 'html',
                      nodeValue: '',
                      childNodeCount: 2,
                      attributes: [],
                      frameId: SUBFRAME_ID,
                      children: [
                        {
                          nodeId: 15 as Protocol.DOM.NodeId,
                          parentId: 14 as Protocol.DOM.NodeId,
                          backendNodeId: 32 as Protocol.DOM.BackendNodeId,
                          nodeType: 1,
                          nodeName: 'HEAD',
                          localName: 'head',
                          nodeValue: '',
                          childNodeCount: 0,
                          attributes: [],
                        },
                        {
                          nodeId: 16 as Protocol.DOM.NodeId,
                          parentId: 14 as Protocol.DOM.NodeId,
                          backendNodeId: 30 as Protocol.DOM.BackendNodeId,
                          nodeType: 1,
                          nodeName: 'BODY',
                          localName: 'body',
                          nodeValue: '',
                          childNodeCount: 1,
                          attributes: [],
                          children: [
                            {
                              nodeId: SUBFRAME1_NODE_ID,
                              parentId: 16 as Protocol.DOM.NodeId,
                              backendNodeId: SUBFRAME1_BACKEND_ID,
                              nodeType: 1,
                              nodeName: 'DIV',
                              localName: 'div',
                              nodeValue: '',
                              childNodeCount: 0,
                              attributes: [
                                'id',
                                'subframe1',
                                'style',
                                'left: 20px; top: 20px; width: 80px; height: 80px; transform: translateZ(20px);',
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

function translationMatrix(x: number, y: number, z: number): number[] {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
}

function createChildLayer(
    layerId: Protocol.LayerTree.LayerId,
    width: number,
    height: number,
    options: {
      backendNodeId?: Protocol.DOM.BackendNodeId,
      drawsContent?: boolean,
      paintCount?: number,
      translate?: [number, number, number],
    } = {},
    ): Protocol.LayerTree.Layer {
  const layer: Protocol.LayerTree.Layer = {
    layerId,
    parentLayerId: ROOT_LAYER_ID,
    offsetX: 0,
    offsetY: 0,
    width,
    height,
    paintCount: options.paintCount ?? 0,
    drawsContent: options.drawsContent ?? true,
  };
  if (options.backendNodeId !== undefined) {
    layer.backendNodeId = options.backendNodeId;
  }
  if (options.translate) {
    layer.transform = translationMatrix(...options.translate);
    layer.anchorX = 0;
    layer.anchorY = 0;
    layer.anchorZ = 0;
  }
  return layer;
}

const BASE_PREFIX_LAYERS: Protocol.LayerTree.Layer[] = [
  {
    layerId: ROOT_LAYER_ID,
    offsetX: 0,
    offsetY: 0,
    width: 0,
    height: 0,
    paintCount: 0,
    drawsContent: true,
  },
  createChildLayer(DOC_SCROLL_LAYER_ID, 800, 600, {backendNodeId: DOCUMENT_BACKEND_ID, drawsContent: false}),
  createChildLayer(DOC_CONTENTS_LAYER_ID, 800, 600, {backendNodeId: DOCUMENT_BACKEND_ID, paintCount: 2}),
  createChildLayer(SUBFRAME1_LAYER_ID, 80, 80, {
    backendNodeId: SUBFRAME1_BACKEND_ID,
    drawsContent: false,
    translate: [18, 218, 20],
  }),
  createChildLayer(LAYER_A_ID, 200, 200, {backendNodeId: A_BACKEND_ID, translate: [8, 8, 10]}),
];

const TRAILING_LAYER: Protocol.LayerTree.Layer = createChildLayer(TRAILING_LAYER_ID, 800, 600, {drawsContent: false});

function buildInitialLayers(): Protocol.LayerTree.Layer[] {
  return [
    ...BASE_PREFIX_LAYERS,
    createChildLayer(LAYER_B1_INITIAL_ID, 150, 100, {backendNodeId: B1_BACKEND_ID, translate: [8, 8, 10]}),
    createChildLayer(LAYER_B2_ID, 140, 110, {backendNodeId: B2_BACKEND_ID, translate: [8, 108, 10]}),
    createChildLayer(LAYER_C_ID, 100, 90, {backendNodeId: C_BACKEND_ID, translate: [8, 108, 10]}),
    createChildLayer(LAYER_B3_ID, 140, 110, {backendNodeId: B3_BACKEND_ID, translate: [8, 218, 10]}),
    TRAILING_LAYER,
  ];
}

function buildUpdatedTreeLayers(cWidth: number): Protocol.LayerTree.Layer[] {
  return [
    ...BASE_PREFIX_LAYERS,
    createChildLayer(LAYER_B2_ID, 140, 110, {backendNodeId: B2_BACKEND_ID, translate: [8, 8, 10]}),
    createChildLayer(LAYER_C_ID, cWidth, 90, {backendNodeId: C_BACKEND_ID, translate: [8, 8, 10]}),
    createChildLayer(LAYER_B1_REPARENTED_ID, 150, 100, {backendNodeId: B1_BACKEND_ID, translate: [8, 8, 10]}),
    createChildLayer(LAYER_B4_ID, 77, 88, {backendNodeId: B4_BACKEND_ID, translate: [8, 118, 10]}),
    TRAILING_LAYER,
  ];
}

function describeLayerSummary(layer: SDK.LayerTreeBase.Layer): string {
  const node = layer.nodeForSelfOrAncestor();
  if (!node) {
    return `<invalid node id> ${layer.height()}x${layer.width()}`;
  }
  const idAttr = node.getAttribute('id');
  const selector = idAttr ? `${node.localName()}#${idAttr}` : node.nodeName();
  return `${selector} ${layer.height()}x${layer.width()}`;
}

describe('LayerTreeModel', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let connection: MockCDPConnection;
  let layerTreeModel: Layers.LayerTreeModel.LayerTreeModel;
  let enabledPromise: Promise<void>;

  beforeEach(() => {
    connection = new MockCDPConnection();
    connection.setSuccessHandler('DOM.enable', () => ({}));
    connection.setSuccessHandler('DOM.getDocument', () => ({root: createDocumentTreePayload()}));
    connection.setSuccessHandler(
        'DOM.pushNodesByBackendIdsToFrontend',
        params => ({
          nodeIds: params.backendNodeIds.map(id => BACKEND_NODE_ID_TO_NODE_ID.get(id) ?? (0 as Protocol.DOM.NodeId)),
        }));
    let resolveEnable!: () => void;
    enabledPromise = new Promise<void>(resolve => {
      resolveEnable = resolve;
    });
    connection.setSuccessHandler('LayerTree.enable', () => {
      resolveEnable();
      return {};
    });

    const universe = new TestUniverse();
    const target = universe.createTarget({connection});
    const model = target.model(Layers.LayerTreeModel.LayerTreeModel);
    assert.exists(model);
    layerTreeModel = model;
  });

  async function applyLayerTreeUpdate(layers: Protocol.LayerTree.Layer[]): Promise<SDK.LayerTreeBase.LayerTreeBase> {
    const changed = layerTreeModel.once(Layers.LayerTreeModel.Events.LayerTreeChanged);
    connection.dispatchEvent('LayerTree.layerTreeDidChange', {layers}, undefined);
    await changed;
    const layerTree = layerTreeModel.layerTree();
    assert.exists(layerTree);
    return layerTree;
  }

  function insertB4IntoDom(): void {
    connection.dispatchEvent('DOM.childNodeRemoved', {parentNodeId: A_NODE_ID, nodeId: B1_NODE_ID}, undefined);
    connection.dispatchEvent('DOM.childNodeRemoved', {parentNodeId: A_NODE_ID, nodeId: B3_NODE_ID}, undefined);
    connection.dispatchEvent('DOM.childNodeInserted', {
      parentNodeId: A_NODE_ID,
      previousNodeId: B2_NODE_ID,
      node: {
        nodeId: B4_NODE_ID,
        backendNodeId: B4_BACKEND_ID,
        nodeType: 1,
        nodeName: 'DIV',
        localName: 'div',
        nodeValue: '',
        childNodeCount: 0,
        attributes: ['id', 'b4', 'class', 'layer', 'style', 'width: 77px; height: 88px;'],
      },
    },
                             undefined);
  }

  it('builds the initial layer tree with resolved DOM nodes including nested iframes', async () => {
    layerTreeModel.enable();
    await enabledPromise;

    const layerTree = await applyLayerTreeUpdate(buildInitialLayers());
    const root = layerTree.root();
    assert.exists(root);
    assert.strictEqual(layerTree.contentRoot(), root);
    assert.isNull(root.parent());
    assert.isNull(root.nodeForSelfOrAncestor());
    assert.strictEqual(describeLayerSummary(root), '<invalid node id> 0x0');

    const children = root.children();
    assert.deepEqual(children.map(describeLayerSummary), [
      '#document 600x800',
      '#document 600x800',
      'div#subframe1 80x80',
      'div#a 200x200',
      'div#b1 100x150',
      'div#b2 110x140',
      'div#c 90x100',
      'div#b3 110x140',
      '<invalid node id> 600x800',
    ]);
    for (const child of children) {
      assert.strictEqual(child.parent(), root);
    }

    const layerC = layerTree.layerById(LAYER_C_ID);
    assert.exists(layerC);
    assert.strictEqual(layerC.width(), 100);
    assert.strictEqual(layerC.height(), 90);
    assert.deepEqual(layerC.quad(), [8, 108, 108, 108, 108, 198, 8, 198]);
  });

  it('reuses unchanged AgentLayer instances and replaces moved ones on structural updates', async () => {
    layerTreeModel.enable();
    await enabledPromise;

    const initialTree = await applyLayerTreeUpdate(buildInitialLayers());
    const initialById = new Map<Protocol.LayerTree.LayerId, SDK.LayerTreeBase.Layer>();
    for (const id of [ROOT_LAYER_ID,
                      DOC_SCROLL_LAYER_ID,
                      DOC_CONTENTS_LAYER_ID,
                      SUBFRAME1_LAYER_ID,
                      LAYER_A_ID,
                      LAYER_B1_INITIAL_ID,
                      LAYER_B2_ID,
                      LAYER_C_ID,
                      LAYER_B3_ID,
                      TRAILING_LAYER_ID,
    ]) {
      const layer = initialTree.layerById(id);
      assert.exists(layer);
      initialById.set(id, layer);
    }

    insertB4IntoDom();
    const updatedTree = await applyLayerTreeUpdate(buildUpdatedTreeLayers(100));
    const updatedRoot = updatedTree.root();
    assert.exists(updatedRoot);
    assert.strictEqual(updatedRoot, initialById.get(ROOT_LAYER_ID));

    assert.deepEqual(updatedRoot.children().map(describeLayerSummary), [
      '#document 600x800',
      '#document 600x800',
      'div#subframe1 80x80',
      'div#a 200x200',
      'div#b2 110x140',
      'div#c 90x100',
      'div#b1 100x150',
      'div#b4 88x77',
      '<invalid node id> 600x800',
    ]);

    for (const reusedId of [DOC_SCROLL_LAYER_ID,
                            DOC_CONTENTS_LAYER_ID,
                            SUBFRAME1_LAYER_ID,
                            LAYER_A_ID,
                            LAYER_B2_ID,
                            LAYER_C_ID,
                            TRAILING_LAYER_ID,
    ]) {
      assert.strictEqual(updatedTree.layerById(reusedId), initialById.get(reusedId));
    }

    assert.isNull(updatedTree.layerById(LAYER_B1_INITIAL_ID));
    assert.isNull(updatedTree.layerById(LAYER_B3_ID));

    const reparentedB1 = updatedTree.layerById(LAYER_B1_REPARENTED_ID);
    assert.exists(reparentedB1);
    assert.notStrictEqual(reparentedB1, initialById.get(LAYER_B1_INITIAL_ID));
    assert.strictEqual(reparentedB1.width(), 150);
    assert.strictEqual(reparentedB1.height(), 100);

    const addedB4 = updatedTree.layerById(LAYER_B4_ID);
    assert.exists(addedB4);
    assert.strictEqual(addedB4.width(), 77);
    assert.strictEqual(addedB4.height(), 88);
  });

  it('preserves AgentLayer object identity when only layer geometry changes', async () => {
    layerTreeModel.enable();
    await enabledPromise;

    await applyLayerTreeUpdate(buildInitialLayers());
    insertB4IntoDom();
    const updatedTree = await applyLayerTreeUpdate(buildUpdatedTreeLayers(100));

    const preGeometryById = new Map<Protocol.LayerTree.LayerId, SDK.LayerTreeBase.Layer>();
    for (const id of [ROOT_LAYER_ID,
                      DOC_SCROLL_LAYER_ID,
                      DOC_CONTENTS_LAYER_ID,
                      SUBFRAME1_LAYER_ID,
                      LAYER_A_ID,
                      LAYER_B2_ID,
                      LAYER_C_ID,
                      LAYER_B1_REPARENTED_ID,
                      LAYER_B4_ID,
                      TRAILING_LAYER_ID,
    ]) {
      const layer = updatedTree.layerById(id);
      assert.exists(layer);
      preGeometryById.set(id, layer);
    }

    const geometryTree = await applyLayerTreeUpdate(buildUpdatedTreeLayers(80));
    const geometryRoot = geometryTree.root();
    assert.exists(geometryRoot);
    assert.deepEqual(geometryRoot.children().map(describeLayerSummary), [
      '#document 600x800',
      '#document 600x800',
      'div#subframe1 80x80',
      'div#a 200x200',
      'div#b2 110x140',
      'div#c 90x80',
      'div#b1 100x150',
      'div#b4 88x77',
      '<invalid node id> 600x800',
    ]);

    for (const [id, previousLayer] of preGeometryById) {
      assert.strictEqual(geometryTree.layerById(id), previousLayer);
    }

    const resizedC = geometryTree.layerById(LAYER_C_ID);
    assert.exists(resizedC);
    assert.strictEqual(resizedC.width(), 80);
    assert.strictEqual(resizedC.height(), 90);
    assert.deepEqual(resizedC.quad(), [8, 8, 88, 8, 88, 98, 8, 98]);
  });
});
