// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

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
const gridLabelMinWidth = 10;
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
  if (config.positiveColumnLineNumberOffsets) {
    for (const [i, offset] of config.positiveColumnLineNumberOffsets.entries()) {
      const isFirstColumn = offset === config.positiveColumnLineNumberOffsets[0];
      const isLastColumn =
          offset === config.positiveColumnLineNumberOffsets[config.positiveColumnLineNumberOffsets.length];
      _placeColumnLabel(
          labelContainer, (i + 1).toString(), bounds.minX + offset, bounds.minY, isFirstColumn, isLastColumn);
    }
  }
  if (config.positiveRowLineNumberOffsets) {
    for (const [i, offset] of config.positiveRowLineNumberOffsets.entries()) {
      const isTopRow = offset === config.positiveRowLineNumberOffsets[0];
      const isBottomRow = offset === config.positiveRowLineNumberOffsets[config.positiveRowLineNumberOffsets.length];
      const avoidColumnLabel = bounds.minY < gridPageMargin;
      _placeRowLabel(
          labelContainer, (i + 1).toString(), bounds.minX, bounds.minY + offset, isTopRow, isBottomRow,
          avoidColumnLabel);
    }
  }
}

/**
 * Places the grid row labels on the overlay.
 *
 * @param {HTMLElement} labelLayer
 * @param {string} label
 * @param {number} x
 * @param {number} y
 * @param {boolean} isTopRow
 * @param {boolean} isBottomRow
 * @param {boolean} avoidColumnLabel
 */
function _placeRowLabel(labelLayer, label, x, y, isTopRow, isBottomRow, avoidColumnLabel) {
  const labelContainer = labelLayer.createChild('div');
  const labelContent = labelContainer.createChild('div', 'grid-label-content');
  labelContent.textContent = label;

  let arrowType = GridArrowTypes.rightMid;

  // Flip inside if too close to page margin
  if (x < gridPageMargin) {
    if (isTopRow) {
      arrowType = GridArrowTypes.leftTop;
    } else if (isBottomRow) {
      arrowType = GridArrowTypes.leftBottom;
    } else {
      arrowType = GridArrowTypes.leftMid;
    }
  } else if (isTopRow) {
    // Shift down to avoid column label
    arrowType = GridArrowTypes.rightTop;
  } else if (isBottomRow && (canvasHeight - y) < gridPageMargin) {
    // Shift up to keep on page
    arrowType = GridArrowTypes.rightBottom;
  }

  const labelWidth = _getAdjustedLabelWidth(labelContent);
  const labelHeight = labelContent.getBoundingClientRect().height;
  const labelParams = _getLabelPositionByArrowType(arrowType, x, y, labelWidth, labelHeight);

  if (avoidColumnLabel && isTopRow) {
    // Move top left corner row label to avoid column label.
    labelParams.contentLeft += gridLabelMinWidth;
  }
  labelContent.classList.add(arrowType);
  labelContent.style.left = labelParams.contentLeft + 'px';
  labelContent.style.top = labelParams.contentTop + 'px';
}

/**
 * Places the grid column labels on the overlay.
 *
 * @param {HTMLElement} labelLayer
 * @param {string} label
 * @param {number} x
 * @param {number} y
 * @param {boolean} isFirstColumn
 * @param {boolean} isLastColumn
 */
function _placeColumnLabel(labelLayer, label, x, y, isFirstColumn, isLastColumn) {
  const labelContainer = labelLayer.createChild('div');
  const labelContent = labelContainer.createChild('div', 'grid-label-content');
  labelContent.textContent = label;

  let arrowType = GridArrowTypes.bottomMid;

  // Move label to avoid margins of page
  if (y < gridPageMargin) {
    if (isFirstColumn) {
      arrowType = GridArrowTypes.topLeft;
    } else if (isLastColumn) {
      arrowType = GridArrowTypes.topRight;
    } else {
      arrowType = GridArrowTypes.topMid;
    }
  } else if (isLastColumn && (canvasWidth - x) < gridPageMargin) {
    arrowType = GridArrowTypes.bottomRight;
  } else if (isFirstColumn && x < gridPageMargin) {
    arrowType = GridArrowTypes.bottomLeft;
  }

  const labelWidth = _getAdjustedLabelWidth(labelContent);
  const labelHeight = labelContent.getBoundingClientRect().height;
  const labelParams = _getLabelPositionByArrowType(arrowType, x, y, labelWidth, labelHeight);
  labelContent.classList.add(arrowType);
  labelContent.style.left = labelParams.contentLeft + 'px';
  labelContent.style.top = labelParams.contentTop + 'px';
}

/**
 * Forces the width of the provided grid label element to be an even
 * number of pixels to allow centered placement of the arrow
 *
 * @param {HTMLElement} labelContent
 * @returns {number}
 */
function _getAdjustedLabelWidth(labelContent) {
  let labelWidth = labelContent.getBoundingClientRect().width;
  if (labelWidth % 2 === 1) {
    labelWidth += 1;
    labelContent.style.width = labelWidth + 'px';
  }
  return labelWidth;
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
