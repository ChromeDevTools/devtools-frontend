// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

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
const gridArrowWidth = 3;
const gridPageMargin = 20;
/** @typedef {!{contentTop: number, contentLeft: number}} */
let GridLabelPositions;  // eslint-disable-line no-unused-vars

/**
 * Places the grid row and column labels on the overlay.
 * Currently only positive labels are supported.
 *
 * @param {Object} config
 * @param {Object} bounds
 */
export function drawGridNumbers(config, bounds) {
  const labelContainer = document.getElementById('grid-label-container');
  labelContainer.removeChildren();

  if (config.gridHighlightConfig.showPositiveLineNumbers && config.positiveColumnLineNumberOffsets) {
    for (const [i, offset] of config.positiveColumnLineNumberOffsets.entries()) {
      const element = _createLabelElement(labelContainer, i + 1);
      _placePositiveColumnLabel(element, offset, config, bounds);
    }
  }

  if (config.gridHighlightConfig.showPositiveLineNumbers && config.positiveRowLineNumberOffsets) {
    for (const [i, offset] of config.positiveRowLineNumberOffsets.entries()) {
      const element = _createLabelElement(labelContainer, i + 1);
      _placePositiveRowLabel(element, offset, config, bounds);
    }
  }

  if (config.gridHighlightConfig.showNegativeLineNumbers && config.negativeColumnLineNumberOffsets) {
    for (const [i, offset] of config.negativeColumnLineNumberOffsets.entries()) {
      // Negative offsets are sorted such that the first offset corresponds to the line closest to start edge of the grid.
      const element = _createLabelElement(labelContainer, config.negativeColumnLineNumberOffsets.length * -1 + i);
      _placeNegativeColumnLabel(element, offset, config, bounds);
    }
  }

  if (config.gridHighlightConfig.showNegativeLineNumbers && config.negativeRowLineNumberOffsets) {
    for (const [i, offset] of config.negativeRowLineNumberOffsets.entries()) {
      // Negative offsets are sorted such that the first offset corresponds to the line closest to start edge of the grid.
      const element = _createLabelElement(labelContainer, config.negativeRowLineNumberOffsets.length * -1 + i);
      _placeNegativeRowLabel(element, offset, config, bounds);
    }
  }
}

/**
 * Create the necessary DOM for a single label element.
 *
 * @param {HTMLElement} container The DOM element where to append the label
 * @param {string} textContent The text to display in the label
 * @return {HTMLElement} The new label element
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
 * @param {Object} config The grid highlight config object
 * @param {object} bounbds The grid bounds
 */
function _placePositiveRowLabel(element, offset, config, bounds) {
  const x = bounds.minX;
  const y = bounds.minY + offset;
  const isAtSharedStartCorner = offset === 0 && config.gridHighlightConfig.showPositiveLineNumbers &&
      config.positiveColumnLineNumberOffsets && config.positiveColumnLineNumberOffsets[0] === 0;
  const isAtSharedEndCorner = offset === bounds.maxY - bounds.minY &&
      config.gridHighlightConfig.showNegativeLineNumbers && config.negativeColumnLineNumberOffsets &&
      config.negativeColumnLineNumberOffsets[0] === 0;
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

  _placeLabel(element, arrowType, x, y);
}

/**
 * Determine the position of a negative row label, and place it.
 *
 * @param {HTMLElement} element The label DOM element
 * @param {number} offset The corresponding grid line offset
 * @param {Object} config The grid highlight config object
 * @param {object} bounbds The grid bounds
 */
function _placeNegativeRowLabel(element, offset, config, bounds) {
  const x = bounds.maxX;
  const y = bounds.minY + offset;
  const isAtSharedStartCorner = offset === 0 && config.gridHighlightConfig.showPositiveLineNumbers &&
      config.positiveColumnLineNumberOffsets &&
      config.positiveColumnLineNumberOffsets[config.positiveColumnLineNumberOffsets.length - 1] ===
          bounds.maxX - bounds.minX;
  const isAtSharedEndCorner = offset === bounds.maxY - bounds.minY &&
      config.gridHighlightConfig.showNegativeLineNumbers && config.negativeColumnLineNumberOffsets &&
      config.negativeColumnLineNumberOffsets[config.negativeColumnLineNumberOffsets.length - 1] ===
          bounds.maxX - bounds.minX;
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

  _placeLabel(element, arrowType, x, y);
}

/**
 * Determine the position of a positive column label, and place it.
 *
 * @param {HTMLElement} element The label DOM element
 * @param {number} offset The corresponding grid line offset
 * @param {Object} config The grid highlight config object
 * @param {object} bounbds The grid bounds
 */
function _placePositiveColumnLabel(element, offset, config, bounds) {
  const x = bounds.minX + offset;
  const y = bounds.minY;
  const isAtSharedStartCorner = offset === 0 && config.gridHighlightConfig.showPositiveLineNumbers &&
      config.positiveRowLineNumberOffsets && config.positiveRowLineNumberOffsets[0] === 0;
  const isAtSharedEndCorner = offset === bounds.maxX - bounds.minX &&
      config.gridHighlightConfig.showNegativeLineNumbers && config.negativeRowLineNumberOffsets &&
      config.negativeRowLineNumberOffsets[0] === 0;
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

  _placeLabel(element, arrowType, x, y);
}

/**
 * Determine the position of a negative column label, and place it.
 *
 * @param {HTMLElement} element The label DOM element
 * @param {number} offset The corresponding grid line offset
 * @param {Object} config The grid highlight config object
 * @param {object} bounbds The grid bounds
 */
function _placeNegativeColumnLabel(element, offset, config, bounds) {
  const x = bounds.minX + offset;
  const y = bounds.maxY;
  const isAtSharedStartCorner = offset === 0 && config.gridHighlightConfig.showPositiveLineNumbers &&
      config.positiveRowLineNumberOffsets &&
      config.positiveRowLineNumberOffsets[config.positiveRowLineNumberOffsets.length - 1] === bounds.maxY - bounds.minY;
  const isAtSharedEndCorner = offset === bounds.maxX - bounds.minX &&
      config.gridHighlightConfig.showNegativeLineNumbers && config.negativeRowLineNumberOffsets &&
      config.negativeRowLineNumberOffsets[config.negativeRowLineNumberOffsets.length - 1] === bounds.maxY - bounds.minY;
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

  _placeLabel(element, arrowType, x, y);
}

/**
 * Correctly place a label element in the page. The given coordinates are the
 * ones where the arrow of the label needs to point.
 * Therefore, the width of the text in the label, and the position of the arrow
 * relative to the label are taken into account here to calculate the final x
 * and y coordinates of the label DOM element.
 *
 * @param {HTMLElement} element The label element
 * @param {string} arrowType One of GridArrowTypes' values
 * @param {number} x Where to place the label on the x axis
 * @param {number} y Where to place the label on the y axis
 */
function _placeLabel(element, arrowType, x, y) {
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
