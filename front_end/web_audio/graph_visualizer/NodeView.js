// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../../ui/ui.js';

import {BottomPaddingWithoutParam, BottomPaddingWithParam, LeftMarginOfText, LeftSideTopPadding, NodeCreationData, NodeLabelFontStyle, NodeLayout, ParamLabelFontStyle, Port, PortTypes, RightMarginOfText, TotalInputPortHeight, TotalOutputPortHeight, TotalParamPortHeight} from './GraphStyle.js';  // eslint-disable-line no-unused-vars
import {calculateInputPortXY, calculateOutputPortXY, calculateParamPortXY} from './NodeRendererUtility.js';

// A class that represents a node of a graph, consisting of the information needed to layout the
// node and display the node. Each node has zero or more ports, including input, output, and param ports.
export class NodeView {
  /**
   * @param {!NodeCreationData} data
   * @param {string} label
   */
  constructor(data, label) {
    this.id = data.nodeId;
    this.type = data.nodeType;
    this.numberOfInputs = data.numberOfInputs;
    this.numberOfOutputs = data.numberOfOutputs;
    this.label = label;

    this.size = {width: 0, height: 0};
    // Position of the center. If null, it means the graph layout has not been computed
    // and this node should not be rendered. It will be set after layouting.
    this.position = null;

    /** @type {!NodeLayout} */
    this._layout = {
      inputPortSectionHeight: 0,
      outputPortSectionHeight: 0,
      maxTextLength: 0,
      totalHeight: 0,
    };
    /** @type {!Map<string, !Port>} */
    this.ports = new Map();

    this._initialize(data);
  }

  /**
   * @param {!NodeCreationData} data
   */
  _initialize(data) {
    this._updateNodeLayoutAfterAddingNode(data);
    this._setupInputPorts();
    this._setupOutputPorts();
  }

  /**
   * Add an AudioParam to this node.
   * Note for @method removeParamPort: removeParamPort is not necessary because it will only happen
   * when the parent NodeView is destroyed. So there is no need to remove port individually
   * when the whole NodeView will be gone.
   * @param {string} paramId
   * @param {string} paramType
   */
  addParamPort(paramId, paramType) {
    const paramPorts = this.getPortsByType(PortTypes.Param);
    const numberOfParams = paramPorts.length;

    const {x, y} = calculateParamPortXY(numberOfParams, this._layout.inputPortSectionHeight);
    this._addPort({
      id: generateParamPortId(this.id, paramId),
      type: PortTypes.Param,
      label: paramType,
      x,
      y,
    });

    this._updateNodeLayoutAfterAddingParam(numberOfParams + 1, paramType);

    // The position of output ports may be changed if adding a param increases the total height.
    this._setupOutputPorts();
  }

  /**
   * @param {!PortTypes} type
   * @return {!Array<!Port>}
   */
  getPortsByType(type) {
    const result = [];
    this.ports.forEach(port => {
      if (port.type === type) {
        result.push(port);
      }
    });
    return result;
  }

  /**
   * Use number of inputs and outputs to compute the layout
   * for text and ports.
   * Credit: This function is mostly borrowed from Audion/
   *      `audion.entryPoints.handleNodeCreated_()`.
   *      https://github.com/google/audion/blob/master/js/entry-points/panel.js
   * @param {!NodeCreationData} data
   */
  _updateNodeLayoutAfterAddingNode(data) {
    // Even if there are no input ports, leave room for the node label.
    const inputPortSectionHeight = TotalInputPortHeight * Math.max(1, data.numberOfInputs) + LeftSideTopPadding;
    this._layout.inputPortSectionHeight = inputPortSectionHeight;
    this._layout.outputPortSectionHeight = TotalOutputPortHeight * data.numberOfOutputs;

    // Use the max of the left and right side heights as the total height.
    // Include a little padding on the left.
    this._layout.totalHeight =
        Math.max(inputPortSectionHeight + BottomPaddingWithoutParam, this._layout.outputPortSectionHeight);

    // Update max length with node label.
    const nodeLabelLength = measureTextWidth(this.label, NodeLabelFontStyle);
    this._layout.maxTextLength = Math.max(this._layout.maxTextLength, nodeLabelLength);

    this._updateNodeSize();
  }

  /**
   * After adding a param port, update the node layout based on the y value
   * and label length.
   * @param {number} numberOfParams
   * @param {string} paramType
   */
  _updateNodeLayoutAfterAddingParam(numberOfParams, paramType) {
    // The height after adding param ports and input ports.
    // Include a little padding on the left.
    const leftSideMaxHeight =
        this._layout.inputPortSectionHeight + numberOfParams * TotalParamPortHeight + BottomPaddingWithParam;

    // Use the max of the left and right side heights as the total height.
    this._layout.totalHeight = Math.max(leftSideMaxHeight, this._layout.outputPortSectionHeight);

    // Update max length with param label.
    const paramLabelLength = measureTextWidth(paramType, ParamLabelFontStyle);
    this._layout.maxTextLength = Math.max(this._layout.maxTextLength, paramLabelLength);

    this._updateNodeSize();
  }

  _updateNodeSize() {
    this.size = {
      width: Math.ceil(LeftMarginOfText + this._layout.maxTextLength + RightMarginOfText),
      height: this._layout.totalHeight,
    };
  }

  // Setup the properties of each input port.
  _setupInputPorts() {
    for (let i = 0; i < this.numberOfInputs; i++) {
      const {x, y} = calculateInputPortXY(i);
      this._addPort({
        id: generateInputPortId(this.id, i),
        type: PortTypes.In,
        x,
        y,
      });
    }
  }

  // Setup the properties of each output port.
  _setupOutputPorts() {
    for (let i = 0; i < this.numberOfOutputs; i++) {
      const portId = generateOutputPortId(this.id, i);
      const {x, y} = calculateOutputPortXY(i, this.size, this.numberOfOutputs);
      if (this.ports.has(portId)) {
        // Update y value of an existing output port.
        const port = this.ports.get(portId);
        port.x = x;
        port.y = y;
      } else {
        this._addPort({
          id: portId,
          type: PortTypes.Out,
          x,
          y,
        });
      }
    }
  }

  /** @param {!Port} port */
  _addPort(port) {
    this.ports.set(port.id, port);
  }
}

/**
 * Generates the port id for the input of node.
 * @param {string} nodeId
 * @param {number | undefined} inputIndex
 * @return {string}
 */
export const generateInputPortId = (nodeId, inputIndex) => {
  return `${nodeId}-input-${inputIndex || 0}`;
};

/**
 * Generates the port id for the output of node.
 * @param {string} nodeId
 * @param {number | undefined} outputIndex
 * @return {string}
 */
export const generateOutputPortId = (nodeId, outputIndex) => {
  return `${nodeId}-output-${outputIndex || 0}`;
};

/**
 * Generates the port id for the param of node.
 * @param {string} nodeId
 * @param {string} paramId
 * @return {string}
 */
export const generateParamPortId = (nodeId, paramId) => {
  return `${nodeId}-param-${paramId}`;
};

// A label generator to convert UUID of node to shorter label to display.
// Each graph should have its own generator since the node count starts from 0.
export class NodeLabelGenerator {
  constructor() {
    this._totalNumberOfNodes = 0;
  }

  /**
   * Generates the label for a node of a graph.
   * @param {string} nodeType
   * @return {string}
   */
  generateLabel(nodeType) {
    // To make the label concise, remove the suffix "Node" from the nodeType.
    if (nodeType.endsWith('Node')) {
      nodeType = nodeType.slice(0, nodeType.length - 4);
    }

    // Also, use an integer to replace the long UUID.
    this._totalNumberOfNodes += 1;
    const label = `${nodeType} ${this._totalNumberOfNodes}`;
    return label;
  }
}

let _contextForFontTextMeasuring;

/**
 * Get the text width using given font style.
 * @param {string} text
 * @param {?string} fontStyle
 * @return {number}
 */
export const measureTextWidth = (text, fontStyle) => {
  if (!_contextForFontTextMeasuring) {
    _contextForFontTextMeasuring = createElement('canvas').getContext('2d');
  }

  const context = _contextForFontTextMeasuring;
  context.save();
  context.font = fontStyle;
  const width = UI.UIUtils.measureTextWidth(context, text);
  context.restore();
  return width;
};
