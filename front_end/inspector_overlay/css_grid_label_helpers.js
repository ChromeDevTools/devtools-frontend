// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import {AreaBounds, Bounds} from './common.js';  // eslint-disable-line no-unused-vars

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

/** @typedef {!{contentTop: number, contentLeft: number}} */
let GridLabelPositions;  // eslint-disable-line no-unused-vars

/** @typedef {!{offsets: number[], hasFirst: boolean, hasLast: boolean}} */
let OffsetData;  // eslint-disable-line no-unused-vars

/** @typedef {!{positive: OffsetData, negative: OffsetData}} */
let TracksOffsetData;  // eslint-disable-line no-unused-vars

/** @typedef {!{rows: TracksOffsetData, columns: TracksOffsetData, bounds: Bounds}} */
let GridOffsetNormalizedData;  // eslint-disable-line no-unused-vars

/** @typedef {!{positiveRowLineNumberOffsets?: number[], negativeRowLineNumberOffsets?: number[], positiveColumnLineNumberOffsets?: number[], negativeColumnLineNumberOffsets?: number[]}} */
let GridHighlightConfig;  // eslint-disable-line no-unused-vars

/**
 * Places all of the required grid labels on the overlay. This includes row and
 * column line number labels, and area labels.
 *
 * @param {GridHighlightConfig} config The grid highlight configuration.
 * @param {Bounds} gridBounds The grid container bounds.
 * @param {AreaBounds[]} areaBounds The list of named grid areas with their bounds.
 */
export function drawGridLabels(config, gridBounds, areaBounds) {
  // Find and clear the layer for the node specified in the config, or the default layer:
  // Each node has a layer for grid labels in order to draw multiple grid highlights
  // at once.
  const labelContainerId = window._gridLayerCounter ? `grid-${window._gridLayerCounter++}-labels` : 'grid-labels';
  let labelContainerForNode = document.getElementById(labelContainerId);
  if (!labelContainerForNode) {
    const mainLabelLayerContainer = document.getElementById('grid-label-container');
    labelContainerForNode = mainLabelLayerContainer.createChild('div');
    labelContainerForNode.id = labelContainerId;
  }
  labelContainerForNode.removeChildren();

  // Add the containers for the line and area to the node's layer
  const lineNumberContainer = labelContainerForNode.createChild('div', 'line-numbers');
  const areaNameContainer = labelContainerForNode.createChild('div', 'area-names');

  // Draw line numbers.
  drawGridNumbers(lineNumberContainer, config, gridBounds);

  // Draw area names.
  drawGridAreaNames(areaNameContainer, areaBounds);
}

/**
 * This is a generator function used to iterate over grid line offsets in a way
 * that skips the ones that are too close to eachother, in order to avoid overlaps.
 *
 * @param {number[]} offsets
 */
function* offsetIterator(offsets) {
  let lastEmittedOffset = null;

  for (const [i, offset] of offsets.entries()) {
    // Only emit the offset if this is the first.
    const isFirst = i === 0;
    // Or if this is the last.
    const isLast = i === offsets.length - 1;
    // Or if there is some minimum distance between the last emitted offset.
    const isFarEnoughFromPrevious = offset - lastEmittedOffset > gridLabelDistance;
    // And if there is also some minium distance from the very last offset.
    const isFarEnoughFromLast = !isLast && offsets[offsets.length - 1] - offset > gridLabelDistance;

    if (isFirst || isLast || (isFarEnoughFromPrevious && isFarEnoughFromLast)) {
      yield [i, offset];
      lastEmittedOffset = offset;
    }
  }
}

/**
 * Take the highlight config and bound objects in, and spits out an object with
 * the same information, but with 2 key differences:
 * - the information is organized in a way that makes the rest of the code more
 *   readable
 * - all pixel values are rounded to integers in order to safely compare
 *   offsets (on high-dpi monitors floats are passed by the backend, this means
 *   checking if an offset is at either edges of the container can't be done).
 *
 * @param {GridHighlightConfig} config The highlight config object from the backend
 * @param {Bounds} bounds The bounds of the grid container
 * @return {GridOffsetNormalizedData} The new, normalized, data object
 */
export function _normalizeOffsetData(config, bounds) {
  const width = Math.round(bounds.maxX - bounds.minX);
  const height = Math.round(bounds.maxY - bounds.minY);

  const data = {
    rows: {
      positive: {offsets: [], hasFirst: false, hasLast: false},
      negative: {offsets: [], hasFirst: false, hasLast: false},
    },
    columns: {
      positive: {offsets: [], hasFirst: false, hasLast: false},
      negative: {offsets: [], hasFirst: false, hasLast: false},
    },
    bounds: {
      minX: Math.round(bounds.minX),
      maxX: Math.round(bounds.maxX),
      minY: Math.round(bounds.minY),
      maxY: Math.round(bounds.maxY),
      width,
      height,
    }
  };

  if (config.positiveRowLineNumberOffsets) {
    data.rows.positive = {
      offsets: config.positiveRowLineNumberOffsets.map(offset => Math.round(offset)),
      hasFirst: Math.round(config.positiveRowLineNumberOffsets[0]) === 0,
      hasLast:
          Math.round(config.positiveRowLineNumberOffsets[config.positiveRowLineNumberOffsets.length - 1]) === height
    };
  }
  if (config.negativeRowLineNumberOffsets) {
    data.rows.negative = {
      offsets: config.negativeRowLineNumberOffsets.map(offset => Math.round(offset)),
      hasFirst: Math.round(config.negativeRowLineNumberOffsets[0]) === 0,
      hasLast:
          Math.round(config.negativeRowLineNumberOffsets[config.negativeRowLineNumberOffsets.length - 1]) === height
    };
  }
  if (config.positiveColumnLineNumberOffsets) {
    data.columns.positive = {
      offsets: config.positiveColumnLineNumberOffsets.map(offset => Math.round(offset)),
      hasFirst: Math.round(config.positiveColumnLineNumberOffsets[0]) === 0,
      hasLast: Math.round(config.positiveColumnLineNumberOffsets[config.positiveColumnLineNumberOffsets.length - 1]) ===
          width
    };
  }
  if (config.negativeColumnLineNumberOffsets) {
    data.columns.negative = {
      offsets: config.negativeColumnLineNumberOffsets.map(offset => Math.round(offset)),
      hasFirst: Math.round(config.negativeColumnLineNumberOffsets[0]) === 0,
      hasLast: Math.round(config.negativeColumnLineNumberOffsets[config.negativeColumnLineNumberOffsets.length - 1]) ===
          width
    };
  }

  return data;
}

/**
 * Places the grid row and column labels on the overlay.
 *
 * @param {HTMLElement} container
 * @param {GridHighlightConfig} config
 * @param {Bounds} bounds
 */
export function drawGridNumbers(container, config, bounds) {
  const data = _normalizeOffsetData(config, bounds);

  for (const [i, offset] of offsetIterator(data.columns.positive.offsets)) {
    const element = _createLabelElement(container, i + 1);
    _placePositiveColumnLabel(element, offset, data);
  }

  for (const [i, offset] of offsetIterator(data.rows.positive.offsets)) {
    const element = _createLabelElement(container, i + 1);
    _placePositiveRowLabel(element, offset, data);
  }

  for (const [i, offset] of offsetIterator(data.columns.negative.offsets)) {
    // Negative offsets are sorted such that the first offset corresponds to the line closest to start edge of the grid.
    const element = _createLabelElement(container, data.columns.negative.offsets.length * -1 + i);
    _placeNegativeColumnLabel(element, offset, data);
  }

  for (const [i, offset] of offsetIterator(data.rows.negative.offsets)) {
    // Negative offsets are sorted such that the first offset corresponds to the line closest to start edge of the grid.
    const element = _createLabelElement(container, data.rows.negative.offsets.length * -1 + i);
    _placeNegativeRowLabel(element, offset, data);
  }
}

/**
 * Places the grid area name labels on the overlay.
 *
 * @param {HTMLElement} container
 * @param {AreaBounds[]} areaBounds
 */
export function drawGridAreaNames(container, areaBounds) {
  for (const {name, bounds} of areaBounds) {
    const element = _createLabelElement(container, name);

    element.style.left = bounds.minX + 'px';
    element.style.top = bounds.minY + 'px';
  }
}

/**
 * Create the necessary DOM for a single label element.
 *
 * @param {HTMLElement} container The DOM element where to append the label
 * @param {string} textContent The text to display in the label
 * @return {Element} The new label element
 */
function _createLabelElement(container, textContent) {
  const wrapper = container.createChild('div');
  const element = wrapper.createChild('div', 'grid-label-content');
  element.textContent = textContent.toString();
  return element;
}

/**
 * Determine the position of a positive row label, and place it.
 *
 * @param {HTMLElement} element The label DOM element
 * @param {number} offset The corresponding grid line offset
 * @param {GridOffsetNormalizedData} data The normalized offset data
 */
function _placePositiveRowLabel(element, offset, data) {
  const x = data.bounds.minX;
  const y = data.bounds.minY + offset;
  const isAtSharedStartCorner = offset === 0 && data.columns.positive.hasFirst;
  const isAtSharedEndCorner = offset === data.bounds.height && data.columns.negative.hasFirst;
  const isTooCloseToViewportStart = y < gridPageMargin;
  const isTooCloseToViewportEnd = canvasHeight - y < gridPageMargin;
  const flipIn = x < gridPageMargin;

  if (flipIn && (isAtSharedStartCorner || isAtSharedEndCorner)) {
    element.classList.add('inner-shared-corner');
  }

  let arrowType = GridArrowTypes.rightMid;
  if (isTooCloseToViewportStart || isAtSharedStartCorner) {
    arrowType = GridArrowTypes.rightTop;
  } else if (isTooCloseToViewportEnd || isAtSharedEndCorner) {
    arrowType = GridArrowTypes.rightBottom;
  }
  arrowType = _flipArrowTypeIfNeeded(arrowType, flipIn);

  _placeLineNumberLabel(element, arrowType, x, y);
}

/**
 * Determine the position of a negative row label, and place it.
 *
 * @param {HTMLElement} element The label DOM element
 * @param {number} offset The corresponding grid line offset
 * @param {GridOffsetNormalizedData} data The normalized offset data
 */
function _placeNegativeRowLabel(element, offset, data) {
  const x = data.bounds.maxX;
  const y = data.bounds.minY + offset;
  const isAtSharedStartCorner = offset === 0 && data.columns.positive.hasLast;
  const isAtSharedEndCorner = offset === data.bounds.height && data.columns.negative.hasLast;
  const isTooCloseToViewportStart = y < gridPageMargin;
  const isTooCloseToViewportEnd = canvasHeight - y < gridPageMargin;
  const flipIn = canvasWidth - x < gridPageMargin;

  if (flipIn && (isAtSharedStartCorner || isAtSharedEndCorner)) {
    element.classList.add('inner-shared-corner');
  }

  let arrowType = GridArrowTypes.leftMid;
  if (isTooCloseToViewportStart || isAtSharedStartCorner) {
    arrowType = GridArrowTypes.leftTop;
  } else if (isTooCloseToViewportEnd || isAtSharedEndCorner) {
    arrowType = GridArrowTypes.leftBottom;
  }
  arrowType = _flipArrowTypeIfNeeded(arrowType, flipIn);

  _placeLineNumberLabel(element, arrowType, x, y);
}

/**
 * Determine the position of a positive column label, and place it.
 *
 * @param {HTMLElement} element The label DOM element
 * @param {number} offset The corresponding grid line offset
 * @param {GridOffsetNormalizedData} data The normalized offset data
 */
function _placePositiveColumnLabel(element, offset, data) {
  const x = data.bounds.minX + offset;
  const y = data.bounds.minY;
  const isAtSharedStartCorner = offset === 0 && data.rows.positive.hasFirst;
  const isAtSharedEndCorner = offset === data.bounds.width && data.rows.negative.hasFirst;
  const isTooCloseToViewportStart = x < gridPageMargin;
  const isTooCloseToViewportEnd = canvasWidth - x < gridPageMargin;
  const flipIn = y < gridPageMargin;

  if (flipIn && (isAtSharedStartCorner || isAtSharedEndCorner)) {
    element.classList.add('inner-shared-corner');
  }

  let arrowType = GridArrowTypes.bottomMid;
  if (isTooCloseToViewportStart) {
    arrowType = GridArrowTypes.bottomLeft;
  } else if (isTooCloseToViewportEnd) {
    arrowType = GridArrowTypes.bottomRight;
  }
  arrowType = _flipArrowTypeIfNeeded(arrowType, flipIn);

  _placeLineNumberLabel(element, arrowType, x, y);
}

/**
 * Determine the position of a negative column label, and place it.
 *
 * @param {HTMLElement} element The label DOM element
 * @param {number} offset The corresponding grid line offset
 * @param {GridOffsetNormalizedData} data The normalized offset data
 */
function _placeNegativeColumnLabel(element, offset, data) {
  const x = data.bounds.minX + offset;
  const y = data.bounds.maxY;
  const isAtSharedStartCorner = offset === 0 && data.rows.positive.hasLast;
  const isAtSharedEndCorner = offset === data.bounds.width && data.rows.negative.hasLast;
  const isTooCloseToViewportStart = x < gridPageMargin;
  const isTooCloseToViewportEnd = canvasWidth - x < gridPageMargin;
  const flipIn = canvasHeight - y < gridPageMargin;

  if (flipIn && (isAtSharedStartCorner || isAtSharedEndCorner)) {
    element.classList.add('inner-shared-corner');
  }

  let arrowType = GridArrowTypes.topMid;
  if (isTooCloseToViewportStart) {
    arrowType = GridArrowTypes.topLeft;
  } else if (isTooCloseToViewportEnd) {
    arrowType = GridArrowTypes.topRight;
  }
  arrowType = _flipArrowTypeIfNeeded(arrowType, flipIn);

  _placeLineNumberLabel(element, arrowType, x, y);
}

/**
 * Correctly place a line number label element in the page. The given
 * coordinates are the ones where the arrow of the label needs to point.
 * Therefore, the width of the text in the label, and the position of the arrow
 * relative to the label are taken into account here to calculate the final x
 * and y coordinates of the label DOM element.
 *
 * @param {HTMLElement} element The label element
 * @param {string} arrowType One of GridArrowTypes' values
 * @param {number} x Where to place the label on the x axis
 * @param {number} y Where to place the label on the y axis
 */
function _placeLineNumberLabel(element, arrowType, x, y) {
  const labelWidth = _getAdjustedLabelWidth(element);
  const labelHeight = element.getBoundingClientRect().height;
  const {contentLeft, contentTop} = _getLabelPositionByArrowType(arrowType, x, y, labelWidth, labelHeight);

  element.classList.add(arrowType);
  element.style.left = contentLeft + 'px';
  element.style.top = contentTop + 'px';
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
