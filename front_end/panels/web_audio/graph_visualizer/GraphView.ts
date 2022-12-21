// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Platform from '../../../core/platform/platform.js';

import {EdgeTypes, EdgeView, generateEdgePortIdsByData} from './EdgeView.js';
import {
  type NodeCreationData,
  type NodeParamConnectionData,
  type NodeParamDisconnectionData,
  type NodesConnectionData,
  type NodesDisconnectionData,
  type NodesDisconnectionDataWithDestination,
  type ParamCreationData,
} from './GraphStyle.js';
import {NodeLabelGenerator, NodeView} from './NodeView.js';

// A class that tracks all the nodes and edges of an audio graph.
export class GraphView extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  contextId: string;
  private readonly nodes: Map<string, NodeView>;
  private readonly edges: Map<string, EdgeView>;
  private readonly outboundEdgeMap: Platform.MapUtilities.Multimap<string, string>;
  private readonly inboundEdgeMap: Platform.MapUtilities.Multimap<string, string>;
  private readonly nodeLabelGenerator: NodeLabelGenerator;
  private readonly paramIdToNodeIdMap: Map<string, string>;
  constructor(contextId: string) {
    super();

    this.contextId = contextId;

    this.nodes = new Map();
    this.edges = new Map();

    /**
     * For each node ID, keep a set of all out-bound edge IDs.
     */
    this.outboundEdgeMap = new Platform.MapUtilities.Multimap();

    /**
     * For each node ID, keep a set of all in-bound edge IDs.
     */
    this.inboundEdgeMap = new Platform.MapUtilities.Multimap();

    // Use concise node label to replace the long UUID.
    // Each graph has its own label generator so that the label starts from 0.
    this.nodeLabelGenerator = new NodeLabelGenerator();

    /**
     * For each param ID, save its corresponding node Id.
     */
    this.paramIdToNodeIdMap = new Map();
  }

  /**
   * Add a node to the graph.
   */
  addNode(data: NodeCreationData): void {
    const label = this.nodeLabelGenerator.generateLabel(data.nodeType);
    const node = new NodeView(data, label);
    this.nodes.set(data.nodeId, node);
    this.notifyShouldRedraw();
  }

  /**
   * Remove a node by id and all related edges.
   */
  removeNode(nodeId: string): void {
    this.outboundEdgeMap.get(nodeId).forEach(edgeId => this.removeEdge(edgeId));
    this.inboundEdgeMap.get(nodeId).forEach(edgeId => this.removeEdge(edgeId));
    this.nodes.delete(nodeId);
    this.notifyShouldRedraw();
  }

  /**
   * Add a param to the node.
   */
  addParam(data: ParamCreationData): void {
    const node = this.getNodeById(data.nodeId);
    if (!node) {
      console.error('AudioNode should be added before AudioParam');
      return;
    }
    node.addParamPort(data.paramId, data.paramType);
    this.paramIdToNodeIdMap.set(data.paramId, data.nodeId);
    this.notifyShouldRedraw();
  }

  /**
   * Remove a param.
   */
  removeParam(paramId: string): void {
    // Only need to delete the entry from the param id to node id map.
    this.paramIdToNodeIdMap.delete(paramId);
    // No need to remove the param port from the node because removeParam will always happen with
    // removeNode(). Since the whole Node will be gone, there is no need to remove port individually.
  }

  /**
   * Add a Node-to-Node connection to the graph.
   */
  addNodeToNodeConnection(edgeData: NodesConnectionData): void {
    const edge = new EdgeView(edgeData, EdgeTypes.NodeToNode);
    this.addEdge(edge);
  }

  /**
   * Remove a Node-to-Node connection from the graph.
   */
  removeNodeToNodeConnection(edgeData: NodesDisconnectionData): void {
    if (edgeData.destinationId) {
      // Remove a single edge if destinationId is specified.
      const edgePortIds =
          generateEdgePortIdsByData((edgeData as NodesDisconnectionDataWithDestination), EdgeTypes.NodeToNode);

      if (!edgePortIds) {
        throw new Error('Unable to generate edge port IDs');
      }
      const {edgeId} = edgePortIds;

      this.removeEdge(edgeId);
    } else {
      // Otherwise, remove all outgoing edges from source node.
      this.outboundEdgeMap.get(edgeData.sourceId).forEach(edgeId => this.removeEdge(edgeId));
    }
  }

  /**
   * Add a Node-to-Param connection to the graph.
   */
  addNodeToParamConnection(edgeData: NodeParamConnectionData): void {
    const edge = new EdgeView(edgeData, EdgeTypes.NodeToParam);
    this.addEdge(edge);
  }

  /**
   * Remove a Node-to-Param connection from the graph.
   */
  removeNodeToParamConnection(edgeData: NodeParamDisconnectionData): void {
    const edgePortIds = generateEdgePortIdsByData(edgeData, EdgeTypes.NodeToParam);
    if (!edgePortIds) {
      throw new Error('Unable to generate edge port IDs');
    }

    const {edgeId} = edgePortIds;
    this.removeEdge(edgeId);
  }

  getNodeById(nodeId: string): NodeView|null {
    return this.nodes.get(nodeId) || null;
  }

  getNodes(): Map<string, NodeView> {
    return this.nodes;
  }

  getEdges(): Map<string, EdgeView> {
    return this.edges;
  }

  getNodeIdByParamId(paramId: string): string|null {
    return this.paramIdToNodeIdMap.get(paramId) || null;
  }

  /**
   * Add an edge to the graph.
   */
  private addEdge(edge: EdgeView): void {
    const sourceId = edge.sourceId;
    // Do nothing if the edge already exists.
    if (this.outboundEdgeMap.hasValue(sourceId, edge.id)) {
      return;
    }

    this.edges.set(edge.id, edge);
    this.outboundEdgeMap.set(sourceId, edge.id);
    this.inboundEdgeMap.set(edge.destinationId, edge.id);

    this.notifyShouldRedraw();
  }

  /**
   * Given an edge id, remove the edge from the graph.
   * Also remove the edge from inbound and outbound edge maps.
   */
  private removeEdge(edgeId: string): void {
    const edge = this.edges.get(edgeId);
    if (!edge) {
      return;
    }

    this.outboundEdgeMap.delete(edge.sourceId, edgeId);
    this.inboundEdgeMap.delete(edge.destinationId, edgeId);

    this.edges.delete(edgeId);
    this.notifyShouldRedraw();
  }

  private notifyShouldRedraw(): void {
    this.dispatchEventToListeners(Events.ShouldRedraw, this);
  }
}

export const enum Events {
  ShouldRedraw = 'ShouldRedraw',
}

export type EventTypes = {
  [Events.ShouldRedraw]: GraphView,
};
