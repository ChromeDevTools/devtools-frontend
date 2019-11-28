// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Calculate the x, y value of input port.
 * Input ports are placed near the top of the left-side border.
 * @param {number} portIndex
 * @return {!WebAudio.GraphVisualizer.Point}
 */
export const calculateInputPortXY = portIndex => {
  const y = WebAudio.GraphVisualizer.GraphStyles.InputPortRadius +
      WebAudio.GraphVisualizer.GraphStyles.LeftSideTopPadding +
      portIndex * WebAudio.GraphVisualizer.GraphStyles.TotalInputPortHeight;
  return {x: 0, y: y};
};

/**
 * Calculate the x, y value of output port.
 * Output ports are placed near the center of the right-side border.
 * @param {number} portIndex
 * @param {!WebAudio.GraphVisualizer.Size} nodeSize
 * @param {number} numberOfOutputs
 * @return {!WebAudio.GraphVisualizer.Point}
 */
export const calculateOutputPortXY = (portIndex, nodeSize, numberOfOutputs) => {
  const {width, height} = nodeSize;
  const outputPortY = (height / 2) +
      (2 * portIndex - numberOfOutputs + 1) * WebAudio.GraphVisualizer.GraphStyles.TotalOutputPortHeight / 2;

  return {x: width, y: outputPortY};
};

/**
 * Calculate the x, y value of param port.
 * Param ports are placed near the bottom of the left-side border.
 * @param {number} portIndex
 * @param {number} offsetY
 * @return {!WebAudio.GraphVisualizer.Point}
 */
export const calculateParamPortXY = (portIndex, offsetY) => {
  const paramPortY = offsetY + WebAudio.GraphVisualizer.GraphStyles.TotalParamPortHeight * (portIndex + 1) -
      WebAudio.GraphVisualizer.GraphStyles.AudioParamRadius;
  return {x: 0, y: paramPortY};
};

/* Legacy exported object */
self.WebAudio = self.WebAudio || {};

/* Legacy exported object */
WebAudio = WebAudio || {};

/* Legacy exported object */
WebAudio.GraphVisualizer = WebAudio.GraphVisualizer || {};

// Utility functions to render node onto Canvas.
WebAudio.GraphVisualizer.NodeRendererUtility = WebAudio.GraphVisualizer.NodeRendererUtility || {};

WebAudio.GraphVisualizer.NodeRendererUtility.calculateInputPortXY = calculateInputPortXY;
WebAudio.GraphVisualizer.NodeRendererUtility.calculateOutputPortXY = calculateOutputPortXY;
WebAudio.GraphVisualizer.NodeRendererUtility.calculateParamPortXY = calculateParamPortXY;
