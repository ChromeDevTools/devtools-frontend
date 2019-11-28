// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Supported port types.
 * @enum {symbol}
 */
export const PortTypes = {
  In: Symbol('In'),
  Out: Symbol('Out'),
  Param: Symbol('Param'),
};

/* Legacy exported object */
self.WebAudio = self.WebAudio || {};

/* Legacy exported object */
WebAudio = WebAudio || {};

/* Legacy exported object */
WebAudio.GraphVisualizer = WebAudio.GraphVisualizer || {};

/**
 * @typedef {{width: number, height: number}}
 */
WebAudio.GraphVisualizer.Size;

/**
 * @typedef {{x: number, y: number}}
 */
WebAudio.GraphVisualizer.Point;

/**
 * @typedef {{
 *   inputPortSectionHeight: number,
 *   outputPortSectionHeight: number,
 *   maxTextLength: number,
 *   totalHeight: number
 * }}
 */
WebAudio.GraphVisualizer.NodeLayout;

/**
 * Supported port types.
 * @enum {symbol}
 */
WebAudio.GraphVisualizer.PortTypes = PortTypes;

/**
 * y: The Y value relative to the top of node.
 * edgeCounter: The number of edges connected to the port, default 0.
 * @typedef {{
 *   id: string,
 *   type: !WebAudio.GraphVisualizer.PortTypes,
 *   label: (string|undefined),
 *   x: number,
 *   y: number,
 * }}
 */
WebAudio.GraphVisualizer.Port;

// Message data

/**
 * @typedef {{
 *   nodeId: string,
 *   nodeType: string,
 *   numberOfInputs: number,
 *   numberOfOutputs: number,
 * }}
 */
WebAudio.GraphVisualizer.NodeCreationData;

/**
 * @typedef {{
 *   paramId: string,
 *   paramType: string,
 *   nodeId: string,
 * }}
 */
WebAudio.GraphVisualizer.ParamCreationData;

/**
 * @typedef {{
 *   sourceId: string,
 *   destinationId: string,
 *   sourceOutputIndex: (number|undefined),
 *   destinationInputIndex: (number|undefined),
 * }}
 */
WebAudio.GraphVisualizer.NodesConnectionData;

/**
 * @typedef {{
 *   sourceId: string,
 *   destinationId: (?string|undefined),
 *   sourceOutputIndex: (number|undefined),
 *   destinationInputIndex: (number|undefined),
 * }}
 */
WebAudio.GraphVisualizer.NodesDisconnectionData;

/**
 * @typedef {{
 *   sourceId: string,
 *   destinationId: string,
 *   sourceOutputIndex: (number|undefined),
 *   destinationInputIndex: (number|undefined),
 * }}
 */
WebAudio.GraphVisualizer.NodesDisconnectionDataWithDestination;

/**
 * @typedef {{
 *   sourceId: string,
 *   destinationId: string,
 *   sourceOutputIndex: (number|undefined),
 *   destinationParamId: string,
 * }}
 */
WebAudio.GraphVisualizer.NodeParamConnectionData;

/**
 * @typedef {{
 *   sourceId: string,
 *   destinationId: string,
 *   sourceOutputIndex: (number|undefined),
 *   destinationParamId: string,
 * }}
 */
WebAudio.GraphVisualizer.NodeParamDisconnectionData;
