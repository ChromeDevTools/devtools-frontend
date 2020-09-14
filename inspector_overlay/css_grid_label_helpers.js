// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import {Color, Format} from '../front_end/common/Color.js';
import {luminance} from '../front_end/common/ColorUtils.js';

import {AreaBounds, Bounds, Position} from './common.js';  // eslint-disable-line no-unused-vars
import {applyMatrixToPoint} from './highlight_common.js';

/**
 * There are 12 different types of arrows for labels.
 *
 * The first word in an arrow type corresponds to the side of the label
 * container the arrow is on (e.g. 'left' means the arrow is on the left side of
 * the container).
 *
 * The second word defines where, along that side, the arrow is (e.g. 'top' in
 * a 'leftTop' type means the arrow is at the top of the left side of the
 * container).
 *
 * Here are 2 examples to illustrate:
 *
 *              +----+
 * rightMid:    |     >
 *              +----+
 *
 *              +----+
 * bottomRight: |    |
 *              +--  +
 *                  \|
 */
const GridArrowTypes = {
  leftTop: 'left-top',
  leftMid: 'left-mid',
  leftBottom: 'left-bottom',
  topLeft: 'top-left',
  topMid: 'top-mid',
  topRight: 'top-right',
  rightTop: 'right-top',
  rightMid: 'right-mid',
  rightBottom: 'right-bottom',
  bottomLeft: 'bottom-left',
  bottomMid: 'bottom-mid',
  bottomRight: 'bottom-right',
};

// The size (in px) of a label arrow.
const gridArrowWidth = 3;
// The minimum distance (in px) a label has to be from the edge of the viewport
// to avoid being flipped inside the grid.
const gridPageMargin = 20;
// The minimum distance (in px) 2 labels can be to eachother. This is set to
// allow 2 consecutive 2-digits labels to not overlap.
const gridLabelDistance = 20;
// The maximum number of custom line names that can be displayed in a label.
const maxLineNamesCount = 3;
const defaultLabelColor = '#1A73E8';

/** @typedef {!{contentTop: number, contentLeft: number}} */
let GridLabelPositions;  // eslint-disable-line no-unused-vars

/** @typedef {!{positions: Position[], hasFirst: boolean, hasLast: boolean, names?: string[][]}} */
let PositionData;  // eslint-disable-line no-unused-vars

/** @typedef {!{positive: PositionData, negative: PositionData}} */
let TracksPositionData;  // eslint-disable-line no-unused-vars

/** @typedef {!{rows: TracksPositionData, columns: TracksPositionData, bounds: Bounds}} */
let GridPositionNormalizedData;  // eslint-disable-line no-unused-vars

/** @typedef {!{computedSize: number, x: number, y: number}} */
let TrackSize;  // eslint-disable-line no-unused-vars

/** @typedef {!{
 * rotationAngle?: number,
 * writingMode?: string,
 * columnTrackSizes?: TrackSize[],
 * rowTrackSizes?: TrackSize[],
 * positiveRowLineNumberPositions?: Position[],
 * negativeRowLineNumberPositions?: Position[],
 * positiveColumnLineNumberPositions?: Position[],
 * negativeColumnLineNumberPositions?: Position[],
 * rowLineNameOffsets?: {name: string, x: number, y: number}[],
 * columnLineNameOffsets?: {name: string, x: number, y: number}[],
 * gridHighlightConfig?: Object
 * } */
let GridHighlightConfig;  // eslint-disable-line no-unused-vars

/** @typedef {!{width: number, height: number, mainSize: number, crossSize: number}} */
let LabelSize;  // eslint-disable-line no-unused-vars

/**
 * Places all of the required grid labels on the overlay. This includes row and
 * column line number labels, and area labels.
 *
 * @param {GridHighlightConfig} config The grid highlight configuration.
 * @param {Bounds} gridBounds The grid container bounds.
 * @param {AreaBounds[]} areaBounds The list of named grid areas with their bounds.
 * @param {DOMMatrix=} writingModeMatrix The transformation matrix in case a vertical writing-mode is applied, to map label positions
 */
export function drawGridLabels(config, gridBounds, areaBounds, writingModeMatrix = new DOMMatrix()) {
  // Find and clear the layer for the node specified in the config, or the default layer:
  // Each node has a layer for grid labels in order to draw multiple grid highlights
  // at once.
  const labelContainerId = window._gridLayerCounter ? `grid-${window._gridLayerCounter++}-labels` : 'grid-labels';
  let labelContainerForNode = document.getElementById(labelContainerId);
  if (!labelContainerForNode) {
    const mainLabelLayerContainer = document.getElementById('grid-label-container');
    labelContainerForNode = mainLabelLayerContainer.createChild('div');
    labelContainerForNode.id = labelContainerId;

    const labelColor = getLabelColors(config);
    labelContainerForNode.style.setProperty('--row-label-color', labelColor.rowBackground);
    labelContainerForNode.style.setProperty('--column-label-color', labelColor.columnBackground);
    labelContainerForNode.style.setProperty('--row-label-text-color', labelColor.rowText);
    labelContainerForNode.style.setProperty('--column-label-text-color', labelColor.columnText);
  }
  labelContainerForNode.removeChildren();

  // Add the containers for the line and area to the node's layer
  const areaNameContainer = labelContainerForNode.createChild('div', 'area-names');
  const lineNameContainer = labelContainerForNode.createChild('div', 'line-names');
  const lineNumberContainer = labelContainerForNode.createChild('div', 'line-numbers');
  const trackSizesContainer = labelContainerForNode.createChild('div', 'track-sizes');

  // Draw line numbers and names.
  const normalizedData = _normalizePositionData(config, gridBounds, writingModeMatrix);
  if (config.gridHighlightConfig.showLineNames) {
    drawGridLineNames(lineNameContainer, normalizedData, writingModeMatrix, config.writingMode);
  } else {
    drawGridLineNumbers(lineNumberContainer, normalizedData, writingModeMatrix, config.writingMode);
  }

  // Draw area names.
  drawGridAreaNames(areaNameContainer, areaBounds, writingModeMatrix, config.writingMode);

  if (config.columnTrackSizes) {
    // Draw column sizes.
    drawGridTrackSizes(trackSizesContainer, config.columnTrackSizes, 'column', writingModeMatrix, config.writingMode);
  }
  if (config.rowTrackSizes) {
    // Draw row sizes.
    drawGridTrackSizes(trackSizesContainer, config.rowTrackSizes, 'row', writingModeMatrix, config.writingMode);
  }
}

function getLabelColors(config) {
  // Use semi-transparent white to create a label background color from the line color.
  const white = (new Color([1, 1, 1], Format.RGB)).setAlpha(.2);
  const rowBackground = Color.parse(config.gridHighlightConfig.rowLineColor || defaultLabelColor).blendWith(white);
  const columnBackground =
      Color.parse(config.gridHighlightConfig.columnLineColor || defaultLabelColor).blendWith(white);

  // Decide the text color between white and black, by comparing the luminance with the label background color,
  // using WCAG's color contrast's formula: https://www.w3.org/TR/WCAG20/#contrast-ratiodef
  const rowL = luminance(rowBackground.rgba());
  const rowContrastForBlack = (rowL + 0.05) / 0.05;
  const rowContrastForWhite = 1.05 / (rowL + 0.05);

  const columnL = luminance(columnBackground.rgba());
  const columnContrastForBlack = (columnL + 0.05) / 0.05;
  const columnContrastForWhite = 1.05 / (columnL + 0.05);

  return {
    rowBackground: rowBackground.asString(),
    columnBackground: columnBackground.asString(),
    rowText: rowContrastForBlack > rowContrastForWhite ? '#121212' : 'white',
    columnText: columnContrastForBlack > columnContrastForWhite ? '#121212' : 'white'
  };
}

/**
 * This is a generator function used to iterate over grid label positions in a way
 * that skips the ones that are too close to eachother, in order to avoid overlaps.
 *
 * @param {Position[]} positions
 * @param {string} axis - 'x' or 'y' in Position
 */
function* positionIterator(positions, axis) {
  let lastEmittedPos = null;

  for (const [i, pos] of positions.entries()) {
    // Only emit the position if this is the first.
    const isFirst = i === 0;
    // Or if this is the last.
    const isLast = i === positions.length - 1;
    // Or if there is some minimum distance between the last emitted position.
    const isFarEnoughFromPrevious =
        Math.abs(pos[axis] - (lastEmittedPos ? lastEmittedPos[axis] : 0)) > gridLabelDistance;
    // And if there is also some minium distance from the very last position.
    const isFarEnoughFromLast =
        Math.abs(!isLast && positions[positions.length - 1][axis] - pos[axis]) > gridLabelDistance;

    if (isFirst || isLast || (isFarEnoughFromPrevious && isFarEnoughFromLast)) {
      yield [i, pos];
      lastEmittedPos = pos;
    }
  }
}

const last = array => array[array.length - 1];
const first = array => array[0];

/**
 * Massage the list of line name positions given by the backend for easier consumption.
 *
 * @param {!{name: string, x: number, y: number}[]} namePositions
 * @return {!{positions: {x: number, y: number}[], names: string[][]}}
 */
function _normalizeNameData(namePositions) {
  const positions = [];
  const names = [];

  for (const {name, x, y} of namePositions) {
    const normalizedX = Math.round(x);
    const normalizedY = Math.round(y);

    // If the same position already exists, just add the name to the existing entry, as there can be
    // several custom names for a single line.
    const existingIndex = positions.findIndex(({x, y}) => x === normalizedX && y === normalizedY);
    if (existingIndex > -1) {
      names[existingIndex].push(name);
    } else {
      positions.push({x: normalizedX, y: normalizedY});
      names.push([name]);
    }
  }

  return {positions, names};
}

/**
 * Take the highlight config and bound objects in, and spits out an object with
 * the same information, but with 2 key differences:
 * - the information is organized in a way that makes the rest of the code more
 *   readable
 * - all pixel values are rounded to integers in order to safely compare
 *   positions (on high-dpi monitors floats are passed by the backend, this means
 *   checking if a position is at either edges of the container can't be done).
 *
 * @param {GridHighlightConfig} config The highlight config object from the backend
 * @param {Bounds} bounds The bounds of the grid container
 * @return {GridPositionNormalizedData} The new, normalized, data object
 */
export function _normalizePositionData(config, bounds) {
  const width = Math.round(bounds.maxX - bounds.minX);
  const height = Math.round(bounds.maxY - bounds.minY);

  const data = {
    rows: {
      positive: {positions: [], hasFirst: false, hasLast: false},
      negative: {positions: [], hasFirst: false, hasLast: false},
    },
    columns: {
      positive: {positions: [], hasFirst: false, hasLast: false},
      negative: {positions: [], hasFirst: false, hasLast: false},
    },
    bounds: {
      minX: Math.round(bounds.minX),
      maxX: Math.round(bounds.maxX),
      minY: Math.round(bounds.minY),
      maxY: Math.round(bounds.maxY),
      allPoints: bounds.allPoints,
      width,
      height,
    }
  };

  // Line numbers and line names can't be shown together at once for now.
  // If showLineNames is set to true, then don't show line numbers, even if the
  // data is present.

  if (config.gridHighlightConfig.showLineNames) {
    const rowData = _normalizeNameData(config.rowLineNameOffsets);
    data.rows.positive = {
      positions: rowData.positions,
      names: rowData.names,
      hasFirst: rowData.positions.length && first(rowData.positions).y === data.bounds.minY,
      hasLast: rowData.positions.length && last(rowData.positions).y === data.bounds.maxY
    };

    const columnData = _normalizeNameData(config.columnLineNameOffsets);
    data.columns.positive = {
      positions: columnData.positions,
      names: columnData.names,
      hasFirst: columnData.positions.length && first(columnData.positions).x === data.bounds.minX,
      hasLast: columnData.positions.length && last(columnData.positions).x === data.bounds.maxX
    };
  } else {
    const normalizeXY = ({x, y}) => ({x: Math.round(x), y: Math.round(y)});
    // TODO (alexrudenko): hasFirst & hasLast checks won't probably work for rotated grids.
    if (config.positiveRowLineNumberPositions) {
      data.rows.positive = {
        positions: config.positiveRowLineNumberPositions.map(normalizeXY),
        hasFirst: Math.round(first(config.positiveRowLineNumberPositions).y) === data.bounds.minY,
        hasLast: Math.round(last(config.positiveRowLineNumberPositions).y) === data.bounds.maxY,
      };
    }

    if (config.negativeRowLineNumberPositions) {
      data.rows.negative = {
        positions: config.negativeRowLineNumberPositions.map(normalizeXY),
        hasFirst: Math.round(first(config.negativeRowLineNumberPositions).y) === data.bounds.minY,
        hasLast: Math.round(last(config.negativeRowLineNumberPositions).y) === data.bounds.maxY
      };
    }

    if (config.positiveColumnLineNumberPositions) {
      data.columns.positive = {
        positions: config.positiveColumnLineNumberPositions.map(normalizeXY),
        hasFirst: Math.round(first(config.positiveColumnLineNumberPositions).x) === data.bounds.minX,
        hasLast: Math.round(last(config.positiveColumnLineNumberPositions).x) === data.bounds.maxX
      };
    }

    if (config.negativeColumnLineNumberPositions) {
      data.columns.negative = {
        positions: config.negativeColumnLineNumberPositions.map(normalizeXY),
        hasFirst: Math.round(first(config.negativeColumnLineNumberPositions).x) === data.bounds.minX,
        hasLast: Math.round(last(config.negativeColumnLineNumberPositions).x) === data.bounds.maxX
      };
    }
  }

  return data;
}

/**
 * Places the grid row and column number labels on the overlay.
 *
 * @param {HTMLElement} container Where to append the labels
 * @param {GridPositionNormalizedData} data The grid line number data
 * @param {DOMMatrix=} writingModeMatrix The transformation matrix in case a vertical writing-mode is applied, to map label positions
 * @param {string=} writingMode The current writing-mode value
 */
export function drawGridLineNumbers(
    container, data, writingModeMatrix = new DOMMatrix(), writingMode = 'horizontal-tb') {
  if (!data.columns.positive.names) {
    for (const [i, pos] of positionIterator(data.columns.positive.positions, 'x')) {
      const element = _createLabelElement(container, (i + 1).toString(), 'column');
      _placePositiveColumnLabel(element, applyMatrixToPoint(pos, writingModeMatrix), data, writingMode);
    }
  }

  if (!data.rows.positive.names) {
    for (const [i, pos] of positionIterator(data.rows.positive.positions, 'y')) {
      const element = _createLabelElement(container, (i + 1).toString(), 'row');
      _placePositiveRowLabel(element, applyMatrixToPoint(pos, writingModeMatrix), data, writingMode);
    }
  }

  for (const [i, pos] of positionIterator(data.columns.negative.positions, 'x')) {
    // Negative positions are sorted such that the first position corresponds to the line closest to start edge of the grid.
    const element =
        _createLabelElement(container, (data.columns.negative.positions.length * -1 + i).toString(), 'column');
    _placeNegativeColumnLabel(element, applyMatrixToPoint(pos, writingModeMatrix), data, writingMode);
  }

  for (const [i, pos] of positionIterator(data.rows.negative.positions, 'y')) {
    // Negative positions are sorted such that the first position corresponds to the line closest to start edge of the grid.
    const element = _createLabelElement(container, (data.rows.negative.positions.length * -1 + i).toString(), 'row');
    _placeNegativeRowLabel(element, applyMatrixToPoint(pos, writingModeMatrix), data, writingMode);
  }
}

/**
 * Places the grid track size labels on the overlay.
 *
 * @param {HTMLElement} container Where to append the labels
 * @param {!Array<TrackSize>} trackSizes The list of sizes to draw
 * @param {string} direction Either 'column' or 'row'
 * @param {DOMMatrix=} writingModeMatrix The transformation matrix in case a vertical writing-mode is applied, to map label positions
 * @param {string=} writingMode The current writing-mode value
 */
export function drawGridTrackSizes(
    container, trackSizes, direction, writingModeMatrix = new DOMMatrix(), writingMode = 'horizontal-tb') {
  const {main, cross} = _getAxes(writingMode);
  const {crossSize} = _getCanvasSizes(writingMode);

  for (const {x, y, computedSize, authoredSize} of trackSizes) {
    const point = applyMatrixToPoint({x, y}, writingModeMatrix);

    const size = computedSize.toFixed(2);
    const formattedComputed = `${size.endsWith('.00') ? size.slice(0, -3) : size}px`;
    const element =
        _createLabelElement(container, `${authoredSize ? authoredSize + '·' : ''}${formattedComputed}`, direction);
    const labelSize = _getLabelSize(element, writingMode);

    let flipIn = point[main] - labelSize.mainSize < gridPageMargin;
    if (direction === 'column') {
      flipIn = writingMode === 'vertical-rl' ? crossSize - point[cross] - labelSize.crossSize < gridPageMargin :
                                               point[cross] - labelSize.crossSize < gridPageMargin;
    }

    let arrowType = _adaptArrowTypeForWritingMode(
        direction === 'column' ? GridArrowTypes.bottomMid : GridArrowTypes.rightMid, writingMode);
    arrowType = _flipArrowTypeIfNeeded(arrowType, flipIn);

    _placeLineLabel(element, arrowType, point.x, point.y, labelSize);
  }
}

/**
 * Places the grid row and column name labels on the overlay.
 *
 * @param {HTMLElement} container
 * @param {GridPositionNormalizedData} data
 * @param {DOMMatrix=} writingModeMatrix The transformation matrix in case a vertical writing-mode is applied, to map label positions
 * @param {string=} writingMode The current writing-mode value
 */
export function drawGridLineNames(container, data, writingModeMatrix = new DOMMatrix(), writingMode = 'horizontal-tb') {
  for (const [i, pos] of data.columns.positive.positions.entries()) {
    const names = data.columns.positive.names[i];
    const element = _createLabelElement(container, _makeLineNameLabelContent(names), 'column');
    _placePositiveColumnLabel(element, applyMatrixToPoint(pos, writingModeMatrix), data, writingMode);
  }

  for (const [i, pos] of data.rows.positive.positions.entries()) {
    const names = data.rows.positive.names[i];
    const element = _createLabelElement(container, _makeLineNameLabelContent(names), 'row');
    _placePositiveRowLabel(element, applyMatrixToPoint(pos, writingModeMatrix), data, writingMode);
  }
}

/**
 * Turn an array of custom line names into DOM content that can be used in a label.
 *
 * @param {string[]} names
 * @return {HTMLElement}
 */
function _makeLineNameLabelContent(names) {
  const content = document.createElement('ul');
  const namesToDisplay = names.slice(0, maxLineNamesCount);

  for (const name of namesToDisplay) {
    content.createChild('li', 'line-name').textContent = name;
  }

  return content;
}

/**
 * Places the grid area name labels on the overlay.
 *
 * @param {HTMLElement} container
 * @param {AreaBounds[]} areaBounds
 * @param {DOMMatrix=} writingModeMatrix The transformation matrix in case a vertical writing-mode is applied, to map label positions
 * @param {string=} writingMode The current writing mode
 */
export function drawGridAreaNames(
    container, areaBounds, writingModeMatrix = new DOMMatrix(), writingMode = 'horizontal-tb') {
  for (const {name, bounds} of areaBounds) {
    const element = _createLabelElement(container, name, 'row');
    const {width, height} = _getLabelSize(element, writingMode);

    // The list of all points comes from the path created by the backend. This path is a rectangle with its starting point being
    // the top left corner, which is where we want to place the label (except for vertical-rl writing-mode).
    const point = writingMode === 'vertical-rl' ? bounds.allPoints[3] : bounds.allPoints[0];
    const corner = applyMatrixToPoint(point, writingModeMatrix);

    const flipX = bounds.allPoints[1].x < bounds.allPoints[0].x;
    const flipY = bounds.allPoints[3].y < bounds.allPoints[0].y;
    element.style.left = (corner.x - (flipX ? width : 0)) + 'px';
    element.style.top = (corner.y - (flipY ? height : 0)) + 'px';
  }
}

/**
 * Create the necessary DOM for a single label element.
 *
 * @param {HTMLElement} container The DOM element where to append the label
 * @param {string|HTMLElement} textContent The text, or DOM node to display in the label
 * @param {string} direction "row" if this label is for rows, "column" otherwise
 * @return {Element} The new label element
 */
function _createLabelElement(container, textContent, direction) {
  const wrapper = container.createChild('div');
  const element = wrapper.createChild('div', 'grid-label-content');
  element.dataset.direction = direction;

  if (typeof textContent === 'string') {
    element.textContent = textContent;
  } else {
    element.appendChild(textContent);
  }

  return element;
}

/**
 * Get the start and end points of the edge where labels are displayed.
 *
 * @param {Bounds} gridBounds The grid container bounds
 * @param {string} direction "row" if we are considering row labels, "column" otherwise
 * @param {string} side "positive" if we are considering positive labels, "negative" otherwise
 * @return {{start: {x: number, y: number}, end: {x: number, y: number}}} The start and end {x,y} points
 */
function _getLabelSideEdgePoints(gridBounds, direction, side) {
  const [p1, p2, p3, p4] = gridBounds.allPoints;

  // Here are where all the points are in standard, untransformed, horizontal-tb mode:
  // p1                        p2
  //   +----------------------+
  //   |                      |
  //   +----------------------+
  // p4                        p3

  if (direction === 'row') {
    return side === 'positive' ? {start: p1, end: p4} : {start: p2, end: p3};
  }

  return side === 'positive' ? {start: p1, end: p2} : {start: p4, end: p3};
}

/**
 * Get the name of the main and cross axes depending on the writing mode.
 * In "normal" horizonta-tb mode, the main axis is the one that goes horizontally from left to right,
 * hence, the x axis.
 * In vertical writing modes, the axes are swapped.
 *
 * @param {string} writingMode The current writing mode.
 * @return {{main: string, cross: string}}
 */
function _getAxes(writingMode) {
  return writingMode.startsWith('vertical') ? {main: 'y', cross: 'x'} : {main: 'x', cross: 'y'};
}

/**
 * Get the main and cross sizes of the canvas area depending on the writing mode.
 * In "normal" horizonta-tb mode, the main axis is the one that goes horizontally from left to right,
 * hence, the main size of the canvas is its width, and its cross size is its height.
 * In vertical writing modes, those sizes are swapped.
 *
 * @param {string} writingMode The current writing mode.
 * @return {{mainSize: number, crossSize: number}}
 */
function _getCanvasSizes(writingMode) {
  return writingMode.startsWith('vertical') ? {mainSize: canvasHeight, crossSize: canvasWidth} :
                                              {mainSize: canvasWidth, crossSize: canvasHeight};
}

/**
 * Determine the position of a positive row label, and place it.
 *
 * @param {HTMLElement} element The label DOM element
 * @param {Position} pos The corresponding grid line position
 * @param {GridPositionNormalizedData} data The normalized position data
 * @param {string} writingMode The current writing mode
 */
function _placePositiveRowLabel(element, pos, data, writingMode) {
  const {start, end} = _getLabelSideEdgePoints(data.bounds, 'row', 'positive');
  const {main, cross} = _getAxes(writingMode);
  const {crossSize} = _getCanvasSizes(writingMode);
  const labelSize = _getLabelSize(element, writingMode);

  const isAtSharedStartCorner = pos[cross] === start[cross] && data.columns && data.columns.positive.hasFirst;
  const isAtSharedEndCorner = pos[cross] === end[cross] && data.columns && data.columns.negative.hasFirst;
  const isTooCloseToViewportStart = pos[cross] < gridPageMargin;
  const isTooCloseToViewportEnd = crossSize - pos[cross] < gridPageMargin;
  const flipIn = pos[main] - labelSize.mainSize < gridPageMargin;

  if (flipIn && (isAtSharedStartCorner || isAtSharedEndCorner)) {
    element.classList.add('inner-shared-corner');
  }

  let arrowType = _adaptArrowTypeForWritingMode(GridArrowTypes.rightMid, writingMode);
  if (isTooCloseToViewportStart || isAtSharedStartCorner) {
    arrowType = _adaptArrowTypeForWritingMode(GridArrowTypes.rightTop, writingMode);
  } else if (isTooCloseToViewportEnd || isAtSharedEndCorner) {
    arrowType = _adaptArrowTypeForWritingMode(GridArrowTypes.rightBottom, writingMode);
  }
  arrowType = _flipArrowTypeIfNeeded(arrowType, flipIn);

  _placeLineLabel(element, arrowType, pos.x, pos.y, labelSize);
}

/**
 * Determine the position of a negative row label, and place it.
 *
 * @param {HTMLElement} element The label DOM element
 * @param {Position} pos The corresponding grid line position
 * @param {GridPositionNormalizedData} data The normalized position data
 * @param {string} writingMode The current writing mode
 */
function _placeNegativeRowLabel(element, pos, data, writingMode) {
  const {start, end} = _getLabelSideEdgePoints(data.bounds, 'row', 'negative');
  const {main, cross} = _getAxes(writingMode);
  const {mainSize, crossSize} = _getCanvasSizes(writingMode);
  const labelSize = _getLabelSize(element, writingMode);

  const isAtSharedStartCorner = pos[cross] === start[cross] && data.columns && data.columns.positive.hasLast;
  const isAtSharedEndCorner = pos[cross] === end[cross] && data.columns && data.columns.negative.hasLast;
  const isTooCloseToViewportStart = pos[cross] < gridPageMargin;
  const isTooCloseToViewportEnd = crossSize - pos[cross] < gridPageMargin;
  const flipIn = mainSize - pos[main] - labelSize.mainSize < gridPageMargin;

  if (flipIn && (isAtSharedStartCorner || isAtSharedEndCorner)) {
    element.classList.add('inner-shared-corner');
  }

  let arrowType = _adaptArrowTypeForWritingMode(GridArrowTypes.leftMid, writingMode);
  if (isTooCloseToViewportStart || isAtSharedStartCorner) {
    arrowType = _adaptArrowTypeForWritingMode(GridArrowTypes.leftTop, writingMode);
  } else if (isTooCloseToViewportEnd || isAtSharedEndCorner) {
    arrowType = _adaptArrowTypeForWritingMode(GridArrowTypes.leftBottom, writingMode);
  }
  arrowType = _flipArrowTypeIfNeeded(arrowType, flipIn);

  _placeLineLabel(element, arrowType, pos.x, pos.y, labelSize);
}

/**
 * Determine the position of a positive column label, and place it.
 *
 * @param {HTMLElement} element The label DOM element
 * @param {Position} pos The corresponding grid line position
 * @param {GridPositionNormalizedData} data The normalized position data
 * @param {string} writingMode The current writing mode
 */
function _placePositiveColumnLabel(element, pos, data, writingMode) {
  const {start, end} = _getLabelSideEdgePoints(data.bounds, 'column', 'positive');
  const {main, cross} = _getAxes(writingMode);
  const {mainSize, crossSize} = _getCanvasSizes(writingMode);
  const labelSize = _getLabelSize(element, writingMode);

  const isAtSharedStartCorner = pos[main] === start[main] && data.rows && data.rows.positive.hasFirst;
  const isAtSharedEndCorner = pos[main] === end[main] && data.rows && data.rows.negative.hasFirst;
  const isTooCloseToViewportStart = pos[main] < gridPageMargin;
  const isTooCloseToViewportEnd = mainSize - pos[main] < gridPageMargin;
  const flipIn = writingMode === 'vertical-rl' ? crossSize - pos[cross] - labelSize.crossSize < gridPageMargin :
                                                 pos[cross] - labelSize.crossSize < gridPageMargin;

  if (flipIn && (isAtSharedStartCorner || isAtSharedEndCorner)) {
    element.classList.add('inner-shared-corner');
  }

  let arrowType = _adaptArrowTypeForWritingMode(GridArrowTypes.bottomMid, writingMode);
  if (isTooCloseToViewportStart) {
    arrowType = _adaptArrowTypeForWritingMode(GridArrowTypes.bottomLeft, writingMode);
  } else if (isTooCloseToViewportEnd) {
    arrowType = _adaptArrowTypeForWritingMode(GridArrowTypes.bottomRight, writingMode);
  }

  arrowType = _flipArrowTypeIfNeeded(arrowType, flipIn);

  _placeLineLabel(element, arrowType, pos.x, pos.y, labelSize);
}

/**
 * Determine the position of a negative column label, and place it.
 *
 * @param {HTMLElement} element The label DOM element
 * @param {Position} pos The corresponding grid line position
 * @param {GridPositionNormalizedData} data The normalized position data
 * @param {string} writingMode The current writing mode
 */
function _placeNegativeColumnLabel(element, pos, data, writingMode) {
  const {start, end} = _getLabelSideEdgePoints(data.bounds, 'column', 'negative');
  const {main, cross} = _getAxes(writingMode);
  const {mainSize, crossSize} = _getCanvasSizes(writingMode);
  const labelSize = _getLabelSize(element, writingMode);

  const isAtSharedStartCorner = pos[main] === start[main] && data.rows && data.rows.positive.hasLast;
  const isAtSharedEndCorner = pos[main] === end[main] && data.rows && data.rows.negative.hasLast;
  const isTooCloseToViewportStart = pos[main] < gridPageMargin;
  const isTooCloseToViewportEnd = mainSize - pos[main] < gridPageMargin;
  const flipIn = writingMode === 'vertical-rl' ? pos[cross] - labelSize.crossSize < gridPageMargin :
                                                 crossSize - pos[cross] - labelSize.crossSize < gridPageMargin;

  if (flipIn && (isAtSharedStartCorner || isAtSharedEndCorner)) {
    element.classList.add('inner-shared-corner');
  }

  let arrowType = _adaptArrowTypeForWritingMode(GridArrowTypes.topMid, writingMode);
  if (isTooCloseToViewportStart) {
    arrowType = _adaptArrowTypeForWritingMode(GridArrowTypes.topLeft, writingMode);
  } else if (isTooCloseToViewportEnd) {
    arrowType = _adaptArrowTypeForWritingMode(GridArrowTypes.topRight, writingMode);
  }
  arrowType = _flipArrowTypeIfNeeded(arrowType, flipIn);

  _placeLineLabel(element, arrowType, pos.x, pos.y, labelSize);
}

/**
 * Correctly place a line label element in the page. The given coordinates are
 * the ones where the arrow of the label needs to point.
 * Therefore, the width of the text in the label, and the position of the arrow
 * relative to the label are taken into account here to calculate the final x
 * and y coordinates of the label DOM element.
 *
 * @param {HTMLElement} element The label element
 * @param {string} arrowType One of GridArrowTypes' values
 * @param {number} x Where to place the label on the x axis
 * @param {number} y Where to place the label on the y axis
 * @param {LabelSize} labelSize The size of the label element
 */
function _placeLineLabel(element, arrowType, x, y, labelSize) {
  const {contentLeft, contentTop} = _getLabelPositionByArrowType(arrowType, x, y, labelSize.width, labelSize.height);

  element.classList.add(arrowType);
  element.style.left = contentLeft + 'px';
  element.style.top = contentTop + 'px';
}

/**
 * Given a label element, return its width and height, as well as what the main and cross sizes are depending on
 * the current writing mode.
 *
 * @param {HTMLElement} element  The label DOM element
 * @param {string} writingMode The current writing mode
 * @return {LabelSize}
 */
function _getLabelSize(element, writingMode) {
  const width = _getAdjustedLabelWidth(element);
  const height = element.getBoundingClientRect().height;
  const mainSize = writingMode.startsWith('vertical') ? height : width;
  const crossSize = writingMode.startsWith('vertical') ? width : height;

  return {width, height, mainSize, crossSize};
}

/**
 * Forces the width of the provided grid label element to be an even
 * number of pixels to allow centered placement of the arrow
 *
 * @param {HTMLElement} element
 * @return {number} The width of the element
 */
function _getAdjustedLabelWidth(element) {
  let labelWidth = element.getBoundingClientRect().width;
  if (labelWidth % 2 === 1) {
    labelWidth += 1;
    element.style.width = labelWidth + 'px';
  }
  return labelWidth;
}

/**
 * In some cases, a label doesn't fit where it's supposed to be displayed.
 * This happens when it's too close to the edge of the viewport. When it does,
 * the label's position is flipped so that instead of being outside the grid, it
 * moves inside the grid.
 *
 * Example of a leftMid arrowType, which is by default outside the grid:
 *  -----------------------------
 * |                             |   +------+
 * |                             |   |      |
 * |-----------------------------|  <       |
 * |                             |   |      |
 * |                             |   +------+
 *  -----------------------------
 * When flipped, the label will be drawn inside the grid, so the arrow now needs
 * to point the other way:
 *  -----------------------------
 * |                  +------+   |
 * |                  |      |   |
 * |------------------|       >--|
 * |                  |      |   |
 * |                  +------+   |
 *  -----------------------------
 *
 * @param {string} arrowType
 * @param {boolean} flipIn
 * @return {string} The new arrow type
 */
function _flipArrowTypeIfNeeded(arrowType, flipIn) {
  if (!flipIn) {
    return arrowType;
  }

  switch (arrowType) {
    case GridArrowTypes.leftTop:
      return GridArrowTypes.rightTop;
    case GridArrowTypes.leftMid:
      return GridArrowTypes.rightMid;
    case GridArrowTypes.leftBottom:
      return GridArrowTypes.rightBottom;
    case GridArrowTypes.rightTop:
      return GridArrowTypes.leftTop;
    case GridArrowTypes.rightMid:
      return GridArrowTypes.leftMid;
    case GridArrowTypes.rightBottom:
      return GridArrowTypes.leftBottom;
    case GridArrowTypes.topLeft:
      return GridArrowTypes.bottomLeft;
    case GridArrowTypes.topMid:
      return GridArrowTypes.bottomMid;
    case GridArrowTypes.topRight:
      return GridArrowTypes.bottomRight;
    case GridArrowTypes.bottomLeft:
      return GridArrowTypes.topLeft;
    case GridArrowTypes.bottomMid:
      return GridArrowTypes.topMid;
    case GridArrowTypes.bottomRight:
      return GridArrowTypes.topRight;
  }
}


/**
 * Given an arrow type for the standard horizontal-tb writing-mode, return the corresponding type for a differnet
 * writing-mode.
 *
 * @param {string} arrowType
 * @param {string} writingMode
 * @return {string} the new arrow type
 */
function _adaptArrowTypeForWritingMode(arrowType, writingMode) {
  if (writingMode !== 'vertical-rl' && writingMode !== 'vertical-lr') {
    return arrowType;
  }

  if (writingMode === 'vertical-lr') {
    switch (arrowType) {
      case GridArrowTypes.leftTop:
        return GridArrowTypes.topLeft;
      case GridArrowTypes.leftMid:
        return GridArrowTypes.topMid;
      case GridArrowTypes.leftBottom:
        return GridArrowTypes.topRight;
      case GridArrowTypes.topLeft:
        return GridArrowTypes.leftTop;
      case GridArrowTypes.topMid:
        return GridArrowTypes.leftMid;
      case GridArrowTypes.topRight:
        return GridArrowTypes.leftBottom;
      case GridArrowTypes.rightTop:
        return GridArrowTypes.bottomRight;
      case GridArrowTypes.rightMid:
        return GridArrowTypes.bottomMid;
      case GridArrowTypes.rightBottom:
        return GridArrowTypes.bottomLeft;
      case GridArrowTypes.bottomLeft:
        return GridArrowTypes.rightTop;
      case GridArrowTypes.bottomMid:
        return GridArrowTypes.rightMid;
      case GridArrowTypes.bottomRight:
        return GridArrowTypes.rightBottom;
    }
  }

  if (writingMode === 'vertical-rl') {
    switch (arrowType) {
      case GridArrowTypes.leftTop:
        return GridArrowTypes.topRight;
      case GridArrowTypes.leftMid:
        return GridArrowTypes.topMid;
      case GridArrowTypes.leftBottom:
        return GridArrowTypes.topLeft;
      case GridArrowTypes.topLeft:
        return GridArrowTypes.rightTop;
      case GridArrowTypes.topMid:
        return GridArrowTypes.rightMid;
      case GridArrowTypes.topRight:
        return GridArrowTypes.rightBottom;
      case GridArrowTypes.rightTop:
        return GridArrowTypes.bottomRight;
      case GridArrowTypes.rightMid:
        return GridArrowTypes.bottomMid;
      case GridArrowTypes.rightBottom:
        return GridArrowTypes.bottomLeft;
      case GridArrowTypes.bottomLeft:
        return GridArrowTypes.leftTop;
      case GridArrowTypes.bottomMid:
        return GridArrowTypes.leftMid;
      case GridArrowTypes.bottomRight:
        return GridArrowTypes.leftBottom;
    }
  }
}

/**
 * Returns the required properties needed to place a label arrow based on the
 * arrow type and dimensions of the label
 *
 * @param {string} arrowType
 * @param {number} x
 * @param {number} y
 * @param {number} labelWidth
 * @param {number} labelHeight
 * @returns {GridLabelPositions}
 */
function _getLabelPositionByArrowType(arrowType, x, y, labelWidth, labelHeight) {
  let contentTop;
  let contentLeft;
  switch (arrowType) {
    case GridArrowTypes.leftTop:
      contentTop = y;
      contentLeft = x + gridArrowWidth;
      break;
    case GridArrowTypes.leftMid:
      contentTop = y - (labelHeight / 2);
      contentLeft = x + gridArrowWidth;
      break;
    case GridArrowTypes.leftBottom:
      contentTop = y - labelHeight;
      contentLeft = x + gridArrowWidth;
      break;
    case GridArrowTypes.rightTop:
      contentTop = y;
      contentLeft = x - gridArrowWidth - labelWidth;
      break;
    case GridArrowTypes.rightMid:
      contentTop = y - (labelHeight / 2);
      contentLeft = x - gridArrowWidth - labelWidth;
      break;
    case GridArrowTypes.rightBottom:
      contentTop = y - labelHeight;
      contentLeft = x - labelWidth - gridArrowWidth;
      break;
    case GridArrowTypes.topLeft:
      contentTop = y + gridArrowWidth;
      contentLeft = x;
      break;
    case GridArrowTypes.topMid:
      contentTop = y + gridArrowWidth;
      contentLeft = x - (labelWidth / 2);
      break;
    case GridArrowTypes.topRight:
      contentTop = y + gridArrowWidth;
      contentLeft = x - labelWidth;
      break;
    case GridArrowTypes.bottomLeft:
      contentTop = y - gridArrowWidth - labelHeight;
      contentLeft = x;
      break;
    case GridArrowTypes.bottomMid:
      contentTop = y - gridArrowWidth - labelHeight;
      contentLeft = x - (labelWidth / 2);
      break;
    case GridArrowTypes.bottomRight:
      contentTop = y - gridArrowWidth - labelHeight;
      contentLeft = x - labelWidth;
      break;
  }
  return {
    contentTop,
    contentLeft,
  };
}
