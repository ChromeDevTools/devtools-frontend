// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export const PortPadding = 4;
export const InputPortRadius = 10;
export const AudioParamRadius = 5;
export const LeftMarginOfText = 12;
export const RightMarginOfText = 30;
export const LeftSideTopPadding = 5;
export const BottomPaddingWithoutParam = 6;
export const BottomPaddingWithParam = 8;
export const ArrowHeadSize = 12;

// GraphPadding is used to add extra space for the graph layout.
export const GraphPadding = 20;
export const GraphMargin = 20;

export const TotalInputPortHeight = InputPortRadius * 2 + PortPadding;
export const TotalOutputPortHeight = TotalInputPortHeight;
export const TotalParamPortHeight = AudioParamRadius * 2 + PortPadding;

export const NodeLabelFontStyle = '14px Segoe UI, Arial';
export const ParamLabelFontStyle = '12px Segoe UI, Arial';

/**
 * Supported port types.
 * @enum {symbol}
 */
export const PortTypes = {
  In: Symbol('In'),
  Out: Symbol('Out'),
  Param: Symbol('Param'),
};

/**
 * @typedef {{width: number, height: number}}
 */
export let Size;

/**
 * @typedef {{x: number, y: number}}
 */
export let Point;

/**
 * @typedef {{
 *   inputPortSectionHeight: number,
 *   outputPortSectionHeight: number,
 *   maxTextLength: number,
 *   totalHeight: number
 * }}
 */
export let NodeLayout;

/**
 * y: The Y value relative to the top of node.
 * edgeCounter: The number of edges connected to the port, default 0.
 * @typedef {{
 *   id: string,
 *   type: !PortTypes,
 *   label: (string|undefined),
 *   x: number,
 *   y: number,
 * }}
 */
export let Port;

/**
 * @typedef {{
 *   nodeId: string,
 *   nodeType: string,
 *   numberOfInputs: number,
 *   numberOfOutputs: number,
 * }}
 */
export let NodeCreationData;

/**
 * @typedef {{
 *   paramId: string,
 *   paramType: string,
 *   nodeId: string,
 * }}
 */
export let ParamCreationData;

/**
 * @typedef {{
 *   sourceId: string,
 *   destinationId: string,
 *   sourceOutputIndex: (number|undefined),
 *   destinationInputIndex: (number|undefined),
 * }}
 */
export let NodesConnectionData;

/**
 * @typedef {{
 *   sourceId: string,
 *   destinationId: (?string|undefined),
 *   sourceOutputIndex: (number|undefined),
 *   destinationInputIndex: (number|undefined),
 * }}
 */
export let NodesDisconnectionData;

/**
 * @typedef {{
 *   sourceId: string,
 *   destinationId: string,
 *   sourceOutputIndex: (number|undefined),
 *   destinationInputIndex: (number|undefined),
 * }}
 */
export let NodesDisconnectionDataWithDestination;

/**
 * @typedef {{
 *   sourceId: string,
 *   destinationId: string,
 *   sourceOutputIndex: (number|undefined),
 *   destinationParamId: string,
 * }}
 */
export let NodeParamConnectionData;

/**
 * @typedef {{
 *   sourceId: string,
 *   destinationId: string,
 *   sourceOutputIndex: (number|undefined),
 *   destinationParamId: string,
 * }}
 */
export let NodeParamDisconnectionData;
