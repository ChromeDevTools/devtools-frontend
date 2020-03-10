// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {NodeParamConnectionData, NodesConnectionData} from './GraphStyle.js';  // eslint-disable-line no-unused-vars
import {generateInputPortId, generateOutputPortId, generateParamPortId} from './NodeView.js';

// A class that represents an edge of a graph, including node-to-node connection,
// and node-to-param connection.
export class EdgeView {
  /**
   * @param {!NodesConnectionData | !NodeParamConnectionData} data
   * @param {!EdgeTypes} type
   */
  constructor(data, type) {
    const {edgeId, sourcePortId, destinationPortId} = generateEdgePortIdsByData(data, type);

    this.id = edgeId;
    this.type = type;
    this.sourceId = data.sourceId;
    this.destinationId = data.destinationId;
    this.sourcePortId = sourcePortId;
    this.destinationPortId = destinationPortId;
  }
}

/**
 * Generates the edge id and source/destination portId using edge data and type.
 * @param {!NodesConnectionData | !NodeParamConnectionData} data
 * @param {!EdgeTypes} type
 * @return {?{edgeId: string, sourcePortId: string, destinationPortId: string}}
 */
export const generateEdgePortIdsByData = (data, type) => {
  if (!data.sourceId || !data.destinationId) {
    console.error(`Undefined node message: ${JSON.stringify(data)}`);
    return null;
  }

  const sourcePortId = generateOutputPortId(data.sourceId, data.sourceOutputIndex);
  const destinationPortId = getDestinationPortId(data, type);

  return {
    edgeId: `${sourcePortId}->${destinationPortId}`,
    sourcePortId: sourcePortId,
    destinationPortId: destinationPortId,
  };

  /**
   * Get the destination portId based on connection type.
   * @param {!NodesConnectionData | !NodeParamConnectionData} data
   * @param {!EdgeTypes} type
   * @return {string}
   */
  function getDestinationPortId(data, type) {
    if (type === EdgeTypes.NodeToNode) {
      return generateInputPortId(data.destinationId, data.destinationInputIndex);
    }
    if (type === EdgeTypes.NodeToParam) {
      return generateParamPortId(data.destinationId, data.destinationParamId);
    }
    console.error(`Unknown edge type: ${type}`);
    return '';
  }
};

/**
 * Supported edge types.
 * @enum {symbol}
 */
export const EdgeTypes = {
  NodeToNode: Symbol('NodeToNode'),
  NodeToParam: Symbol('NodeToParam'),
};
