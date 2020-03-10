// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {EdgeTypes, EdgeView, generateEdgePortIdsByData} from './EdgeView.js';
import {NodeCreationData, NodeParamConnectionData, NodeParamDisconnectionData, NodesConnectionData, NodesDisconnectionData, NodesDisconnectionDataWithDestination, ParamCreationData} from './GraphStyle.js';  // eslint-disable-line no-unused-vars
import {NodeLabelGenerator, NodeView} from './NodeView.js';

// A class that tracks all the nodes and edges of an audio graph.
export class GraphView extends Common.Object {
  /**
   * @param {!Protocol.WebAudio.GraphObjectId} contextId
   */
  constructor(contextId) {
    super();

    this.contextId = contextId;

    /** @type {!Map<!Protocol.WebAudio.GraphObjectId, !NodeView>} */
    this._nodes = new Map();
    /** @type {!Map<!Protocol.WebAudio.GraphObjectId, !EdgeView>} */
    this._edges = new Map();

    /**
     * For each node ID, keep a set of all out-bound edge IDs.
     * @type {!Platform.Multimap<!Protocol.WebAudio.GraphObjectId, string>}
     */
    this._outboundEdgeMap = new Platform.Multimap();

    /**
     * For each node ID, keep a set of all in-bound edge IDs.
     * @type {!Platform.Multimap<!Protocol.WebAudio.GraphObjectId, string>}
     */
    this._inboundEdgeMap = new Platform.Multimap();

    // Use concise node label to replace the long UUID.
    // Each graph has its own label generator so that the label starts from 0.
    this._nodeLabelGenerator = new NodeLabelGenerator();

    /**
     * For each param ID, save its corresponding node Id.
     * @type {!Map<!Protocol.WebAudio.GraphObjectId, !Protocol.WebAudio.GraphObjectId>}
      */
    this._paramIdToNodeIdMap = new Map();
  }

  /**
   * Add a node to the graph.
   * @param {!NodeCreationData} data
   */
  addNode(data) {
    const label = this._nodeLabelGenerator.generateLabel(data.nodeType);
    const node = new NodeView(data, label);
    this._nodes.set(data.nodeId, node);
    this._notifyShouldRedraw();
  }

  /**
   * Remove a node by id and all related edges.
   * @param {!Protocol.WebAudio.GraphObjectId} nodeId
   */
  removeNode(nodeId) {
    this._outboundEdgeMap.get(nodeId).forEach(edgeId => this._removeEdge(edgeId));
    this._inboundEdgeMap.get(nodeId).forEach(edgeId => this._removeEdge(edgeId));
    this._nodes.delete(nodeId);
    this._notifyShouldRedraw();
  }

  /**
   * Add a param to the node.
   * @param {!ParamCreationData} data
   */
  addParam(data) {
    const node = this.getNodeById(data.nodeId);
    if (!node) {
      console.error('AudioNode should be added before AudioParam');
      return;
    }
    node.addParamPort(data.paramId, data.paramType);
    this._paramIdToNodeIdMap.set(data.paramId, data.nodeId);
    this._notifyShouldRedraw();
  }

  /**
   * Remove a param.
   * @param {!Protocol.WebAudio.GraphObjectId} paramId
   */
  removeParam(paramId) {
    // Only need to delete the entry from the param id to node id map.
    this._paramIdToNodeIdMap.delete(paramId);
    // No need to remove the param port from the node because removeParam will always happen with
    // removeNode(). Since the whole Node will be gone, there is no need to remove port individually.
  }

  /**
   * Add a Node-to-Node connection to the graph.
   * @param {!NodesConnectionData} edgeData
   */
  addNodeToNodeConnection(edgeData) {
    const edge = new EdgeView(edgeData, EdgeTypes.NodeToNode);
    this._addEdge(edge);
  }

  /**
   * Remove a Node-to-Node connection from the graph.
   * @param {!NodesDisconnectionData} edgeData
   */
  removeNodeToNodeConnection(edgeData) {
    if (edgeData.destinationId) {
      // Remove a single edge if destinationId is specified.
      const {edgeId} = generateEdgePortIdsByData(
          /** @type {!NodesDisconnectionDataWithDestination} */ (edgeData), EdgeTypes.NodeToNode);
      this._removeEdge(edgeId);
    } else {
      // Otherwise, remove all outgoing edges from source node.
      this._outboundEdgeMap.get(edgeData.sourceId).forEach(edgeId => this._removeEdge(edgeId));
    }
  }

  /**
   * Add a Node-to-Param connection to the graph.
   * @param {!NodeParamConnectionData} edgeData
   */
  addNodeToParamConnection(edgeData) {
    const edge = new EdgeView(edgeData, EdgeTypes.NodeToParam);
    this._addEdge(edge);
  }

  /**
   * Remove a Node-to-Param connection from the graph.
   * @param {!NodeParamDisconnectionData} edgeData
   */
  removeNodeToParamConnection(edgeData) {
    const {edgeId} = generateEdgePortIdsByData(edgeData, EdgeTypes.NodeToParam);
    this._removeEdge(edgeId);
  }

  /**
   * @param {!Protocol.WebAudio.GraphObjectId} nodeId
   * @return {?NodeView}
   */
  getNodeById(nodeId) {
    return this._nodes.get(nodeId);
  }

  /** @return {!Map<!Protocol.WebAudio.GraphObjectId, !NodeView>} */
  getNodes() {
    return this._nodes;
  }

  /** @return {!Map<!Protocol.WebAudio.GraphObjectId, !EdgeView>} */
  getEdges() {
    return this._edges;
  }

  /**
   * @param {!Protocol.WebAudio.GraphObjectId} paramId
   * @return {?Protocol.WebAudio.GraphObjectId}
   */
  getNodeIdByParamId(paramId) {
    return this._paramIdToNodeIdMap.get(paramId);
  }

  /**
   * Add an edge to the graph.
   * @param {!EdgeView} edge
   */
  _addEdge(edge) {
    const sourceId = edge.sourceId;
    // Do nothing if the edge already exists.
    if (this._outboundEdgeMap.hasValue(sourceId, edge.id)) {
      return;
    }

    this._edges.set(edge.id, edge);
    this._outboundEdgeMap.set(sourceId, edge.id);
    this._inboundEdgeMap.set(edge.destinationId, edge.id);

    this._notifyShouldRedraw();
  }

  /**
   * Given an edge id, remove the edge from the graph.
   * Also remove the edge from inbound and outbound edge maps.
   * @param {string} edgeId
   */
  _removeEdge(edgeId) {
    const edge = this._edges.get(edgeId);
    if (!edge) {
      return;
    }

    this._outboundEdgeMap.delete(edge.sourceId, edgeId);
    this._inboundEdgeMap.delete(edge.destinationId, edgeId);

    this._edges.delete(edgeId);
    this._notifyShouldRedraw();
  }

  _notifyShouldRedraw() {
    this.dispatchEventToListeners(Events.ShouldRedraw, this);
  }
}

/** @enum {symbol} */
export const Events = {
  ShouldRedraw: Symbol('ShouldRedraw')
};
