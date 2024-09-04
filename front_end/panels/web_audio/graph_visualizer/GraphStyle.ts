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
 */
export const enum PortTypes {
  IN = 'In',
  OUT = 'Out',
  PARAM = 'Param',
}

export interface Size {
  width: number;
  height: number;
}
export interface Point {
  x: number;
  y: number;
}
export interface NodeLayout {
  inputPortSectionHeight: number;
  outputPortSectionHeight: number;
  maxTextLength: number;
  totalHeight: number;
}
export interface Port {
  id: string;
  type: PortTypes;
  label?: string;
  x: number;
  y: number;
}
export interface NodeCreationData {
  nodeId: string;
  nodeType: string;
  numberOfInputs: number;
  numberOfOutputs: number;
}
export interface ParamCreationData {
  paramId: string;
  paramType: string;
  nodeId: string;
}
export interface NodesConnectionData {
  sourceId: string;
  destinationId: string;
  sourceOutputIndex?: number;
  destinationInputIndex?: number;
}
export interface NodesDisconnectionData {
  sourceId: string;
  destinationId?: string|null;
  sourceOutputIndex?: number;
  destinationInputIndex?: number;
}
export interface NodesDisconnectionDataWithDestination {
  sourceId: string;
  destinationId: string;
  sourceOutputIndex?: number;
  destinationInputIndex?: number;
}
export interface NodeParamConnectionData {
  sourceId: string;
  destinationId: string;
  sourceOutputIndex?: number;
  destinationParamId: string;
}
export interface NodeParamDisconnectionData {
  sourceId: string;
  destinationId: string;
  sourceOutputIndex?: number;
  destinationParamId: string;
}
