// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {type NodeParamConnectionData, type NodesConnectionData} from './GraphStyle.js';
import {generateInputPortId, generateOutputPortId, generateParamPortId} from './NodeView.js';

// A class that represents an edge of a graph, including node-to-node connection,
// and node-to-param connection.
export class EdgeView {
  id: string;
  type: EdgeTypes;
  sourceId: string;
  destinationId: string;
  sourcePortId: string;
  destinationPortId: string;

  constructor(data: NodesConnectionData|NodeParamConnectionData, type: EdgeTypes) {
    const edgePortsIds = generateEdgePortIdsByData(data, type);
    if (!edgePortsIds) {
      throw new Error('Unable to generate edge port IDs');
    }

    const {edgeId, sourcePortId, destinationPortId} = edgePortsIds;

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
 */
export const generateEdgePortIdsByData = (data: NodesConnectionData|NodeParamConnectionData, type: EdgeTypes): {
  edgeId: string,
  sourcePortId: string,
  destinationPortId: string,
}|null => {
  if (!data.sourceId || !data.destinationId) {
    console.error(`Undefined node message: ${JSON.stringify(data)}`);
    return null;
  }

  const sourcePortId = generateOutputPortId(data.sourceId, data.sourceOutputIndex);
  const destinationPortId = getDestinationPortId(data, type);

  return {
    edgeId: `${sourcePortId}->${destinationPortId}`,
    sourcePortId,
    destinationPortId,
  };

  /**
   * Get the destination portId based on connection type.
   */
  function getDestinationPortId(data: NodesConnectionData|NodeParamConnectionData, type: EdgeTypes): string {
    if (type === EdgeTypes.NODE_TO_NODE) {
      const portData = (data as NodesConnectionData);
      return generateInputPortId(data.destinationId, portData.destinationInputIndex);
    }
    if (type === EdgeTypes.NODE_TO_PARAM) {
      const portData = (data as NodeParamConnectionData);
      return generateParamPortId(data.destinationId, portData.destinationParamId);
    }
    console.error(`Unknown edge type: ${type}`);
    return '';
  }
};

/**
 * Supported edge types.
 */
export const enum EdgeTypes {
  NODE_TO_NODE = 'NodeToNode',
  NODE_TO_PARAM = 'NodeToParam',
}
