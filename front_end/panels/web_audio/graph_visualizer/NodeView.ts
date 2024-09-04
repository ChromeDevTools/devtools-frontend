// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../../../ui/legacy/legacy.js';

import {
  BottomPaddingWithoutParam,
  BottomPaddingWithParam,
  LeftMarginOfText,
  LeftSideTopPadding,
  NodeLabelFontStyle,
  ParamLabelFontStyle,
  PortTypes,
  RightMarginOfText,
  TotalInputPortHeight,
  TotalOutputPortHeight,
  TotalParamPortHeight,
  type NodeCreationData,
  type NodeLayout,
  type Port,
} from './GraphStyle.js';
import {calculateInputPortXY, calculateOutputPortXY, calculateParamPortXY} from './NodeRendererUtility.js';

// A class that represents a node of a graph, consisting of the information needed to layout the
// node and display the node. Each node has zero or more ports, including input, output, and param ports.
export class NodeView {
  id: string;
  type: string;
  numberOfInputs: number;
  numberOfOutputs: number;
  label: string;
  size: {
    width: number,
    height: number,
  };
  position: Object|null;
  private layout: NodeLayout;
  ports: Map<string, Port>;
  constructor(data: NodeCreationData, label: string) {
    this.id = data.nodeId;
    this.type = data.nodeType;
    this.numberOfInputs = data.numberOfInputs;
    this.numberOfOutputs = data.numberOfOutputs;
    this.label = label;

    this.size = {width: 0, height: 0};
    // Position of the center. If null, it means the graph layout has not been computed
    // and this node should not be rendered. It will be set after layouting.
    this.position = null;

    this.layout = {
      inputPortSectionHeight: 0,
      outputPortSectionHeight: 0,
      maxTextLength: 0,
      totalHeight: 0,
    };
    this.ports = new Map();

    this.initialize(data);
  }

  private initialize(data: NodeCreationData): void {
    this.updateNodeLayoutAfterAddingNode(data);
    this.setupInputPorts();
    this.setupOutputPorts();
  }

  /**
   * Add an AudioParam to this node.
   * Note for @method removeParamPort: removeParamPort is not necessary because it will only happen
   * when the parent NodeView is destroyed. So there is no need to remove port individually
   * when the whole NodeView will be gone.
   */
  addParamPort(paramId: string, paramType: string): void {
    const paramPorts = this.getPortsByType(PortTypes.PARAM);
    const numberOfParams = paramPorts.length;

    const {x, y} = calculateParamPortXY(numberOfParams, this.layout.inputPortSectionHeight);
    this.addPort({
      id: generateParamPortId(this.id, paramId),
      type: PortTypes.PARAM,
      label: paramType,
      x,
      y,
    });

    this.updateNodeLayoutAfterAddingParam(numberOfParams + 1, paramType);

    // The position of output ports may be changed if adding a param increases the total height.
    this.setupOutputPorts();
  }

  getPortsByType(type: PortTypes): Port[] {
    const result: Port[] = [];
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
   */
  private updateNodeLayoutAfterAddingNode(data: NodeCreationData): void {
    // Even if there are no input ports, leave room for the node label.
    const inputPortSectionHeight = TotalInputPortHeight * Math.max(1, data.numberOfInputs) + LeftSideTopPadding;
    this.layout.inputPortSectionHeight = inputPortSectionHeight;
    this.layout.outputPortSectionHeight = TotalOutputPortHeight * data.numberOfOutputs;

    // Use the max of the left and right side heights as the total height.
    // Include a little padding on the left.
    this.layout.totalHeight =
        Math.max(inputPortSectionHeight + BottomPaddingWithoutParam, this.layout.outputPortSectionHeight);

    // Update max length with node label.
    const nodeLabelLength = measureTextWidth(this.label, NodeLabelFontStyle);
    this.layout.maxTextLength = Math.max(this.layout.maxTextLength, nodeLabelLength);

    this.updateNodeSize();
  }

  /**
   * After adding a param port, update the node layout based on the y value
   * and label length.
   */
  private updateNodeLayoutAfterAddingParam(numberOfParams: number, paramType: string): void {
    // The height after adding param ports and input ports.
    // Include a little padding on the left.
    const leftSideMaxHeight =
        this.layout.inputPortSectionHeight + numberOfParams * TotalParamPortHeight + BottomPaddingWithParam;

    // Use the max of the left and right side heights as the total height.
    this.layout.totalHeight = Math.max(leftSideMaxHeight, this.layout.outputPortSectionHeight);

    // Update max length with param label.
    const paramLabelLength = measureTextWidth(paramType, ParamLabelFontStyle);
    this.layout.maxTextLength = Math.max(this.layout.maxTextLength, paramLabelLength);

    this.updateNodeSize();
  }

  private updateNodeSize(): void {
    this.size = {
      width: Math.ceil(LeftMarginOfText + this.layout.maxTextLength + RightMarginOfText),
      height: this.layout.totalHeight,
    };
  }

  // Setup the properties of each input port.
  private setupInputPorts(): void {
    for (let i = 0; i < this.numberOfInputs; i++) {
      const {x, y} = calculateInputPortXY(i);
      this.addPort({id: generateInputPortId(this.id, i), type: PortTypes.IN, x, y, label: undefined});
    }
  }

  // Setup the properties of each output port.
  private setupOutputPorts(): void {
    for (let i = 0; i < this.numberOfOutputs; i++) {
      const portId = generateOutputPortId(this.id, i);
      const {x, y} = calculateOutputPortXY(i, this.size, this.numberOfOutputs);
      if (this.ports.has(portId)) {
        // Update y value of an existing output port.
        const port = this.ports.get(portId);
        if (!port) {
          throw new Error(`Unable to find port with id ${portId}`);
        }

        port.x = x;
        port.y = y;
      } else {
        this.addPort({id: portId, type: PortTypes.OUT, x, y, label: undefined});
      }
    }
  }

  private addPort(port: Port): void {
    this.ports.set(port.id, port);
  }
}

/**
 * Generates the port id for the input of node.
 */
export const generateInputPortId = (nodeId: string, inputIndex: number|undefined): string => {
  return `${nodeId}-input-${inputIndex || 0}`;
};

/**
 * Generates the port id for the output of node.
 */
export const generateOutputPortId = (nodeId: string, outputIndex: number|undefined): string => {
  return `${nodeId}-output-${outputIndex || 0}`;
};

/**
 * Generates the port id for the param of node.
 */
export const generateParamPortId = (nodeId: string, paramId: string): string => {
  return `${nodeId}-param-${paramId}`;
};

// A label generator to convert UUID of node to shorter label to display.
// Each graph should have its own generator since the node count starts from 0.
export class NodeLabelGenerator {
  private totalNumberOfNodes: number;
  constructor() {
    this.totalNumberOfNodes = 0;
  }

  /**
   * Generates the label for a node of a graph.
   */
  generateLabel(nodeType: string): string {
    // To make the label concise, remove the suffix "Node" from the nodeType.
    if (nodeType.endsWith('Node')) {
      nodeType = nodeType.slice(0, nodeType.length - 4);
    }

    // Also, use an integer to replace the long UUID.
    this.totalNumberOfNodes += 1;
    const label = `${nodeType} ${this.totalNumberOfNodes}`;
    return label;
  }
}

let contextForFontTextMeasuring: CanvasRenderingContext2D;

/**
 * Get the text width using given font style.
 */
export const measureTextWidth = (text: string, fontStyle: string|null): number => {
  if (!contextForFontTextMeasuring) {
    const context = document.createElement('canvas').getContext('2d');
    if (!context) {
      throw new Error('Unable to create canvas context.');
    }

    contextForFontTextMeasuring = context;
  }

  const context = contextForFontTextMeasuring;
  context.save();
  if (fontStyle) {
    context.font = fontStyle;
  }

  const width = UI.UIUtils.measureTextWidth(context, text);
  context.restore();
  return width;
};
