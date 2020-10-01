// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

//  Copyright (C) 2012 Google Inc. All rights reserved.

//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions
//  are met:

//  1.  Redistributions of source code must retain the above copyright
//      notice, this list of conditions and the following disclaimer.
//  2.  Redistributions in binary form must reproduce the above copyright
//      notice, this list of conditions and the following disclaimer in the
//      documentation and/or other materials provided with the distribution.
//  3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
//      its contributors may be used to endorse or promote products derived
//      from this software without specific prior written permission.

//  THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
//  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
//  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
//  DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
//  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
//  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
//  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
//  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
//  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
//  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


import {AreaBounds, Bounds} from './common.js';
import {drawGridLabels, GridLabelState} from './css_grid_label_helpers.js';
import {applyMatrixToPoint, buildPath, emptyBounds} from './highlight_common.js';

const DEFAULT_EXTENDED_LINE_COLOR = 'rgba(128, 128, 128, 0.3)';

// TODO(alexrudenko): Grid label unit tests depend on this style so it cannot be extracted yet.
export const gridStyle = `
/* Grid row and column labels */
.grid-label-content {
  position: absolute;
  -webkit-user-select: none;
  padding: 2px;
  font-family: Menlo, monospace;
  font-size: 10px;
  min-width: 17px;
  min-height: 15px;
  border-radius: 2px;
  box-sizing: border-box;
  z-index: 1;
  background-clip: padding-box;
  pointer-events: none;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
}

.grid-label-content[data-direction=row] {
  background-color: var(--row-label-color, #1A73E8);
  color: var(--row-label-text-color, #FFFFFF);
}

.grid-label-content[data-direction=column] {
  background-color: var(--column-label-color, #1A73E8);
  color: var(--column-label-text-color, #FFFFFF);
}

.line-names ul,
.line-names .line-name {
  margin: 0;
  padding: 0;
  list-style: none;
}

.line-names .line-name {
  max-width: 100px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.line-names .grid-label-content,
.line-numbers .grid-label-content,
.track-sizes .grid-label-content {
  border: 1px solid white;
  --inner-corner-avoid-distance: 15px;
}

.grid-label-content.top-left.inner-shared-corner,
.grid-label-content.top-right.inner-shared-corner {
  transform: translateY(var(--inner-corner-avoid-distance));
}

.grid-label-content.bottom-left.inner-shared-corner,
.grid-label-content.bottom-right.inner-shared-corner {
  transform: translateY(calc(var(--inner-corner-avoid-distance) * -1));
}

.grid-label-content.left-top.inner-shared-corner,
.grid-label-content.left-bottom.inner-shared-corner {
  transform: translateX(var(--inner-corner-avoid-distance));
}

.grid-label-content.right-top.inner-shared-corner,
.grid-label-content.right-bottom.inner-shared-corner {
  transform: translateX(calc(var(--inner-corner-avoid-distance) * -1));
}

.line-names .grid-label-content::before,
.line-numbers .grid-label-content::before,
.track-sizes .grid-label-content::before {
  position: absolute;
  z-index: 1;
  pointer-events: none;
  content: "";
  width: 3px;
  height: 3px;
  border: 1px solid white;
  border-width: 0 1px 1px 0;
}

.line-names .grid-label-content[data-direction=row]::before,
.line-numbers .grid-label-content[data-direction=row]::before,
.track-sizes .grid-label-content[data-direction=row]::before {
  background: var(--row-label-color, #1A73E8);
}

.line-names .grid-label-content[data-direction=column]::before,
.line-numbers .grid-label-content[data-direction=column]::before,
.track-sizes .grid-label-content[data-direction=column]::before {
  background: var(--column-label-color, #1A73E8);
}

.grid-label-content.bottom-mid::before {
  transform: translateY(-1px) rotate(45deg);
  top: 100%;
}

.grid-label-content.top-mid::before {
  transform: translateY(-3px) rotate(-135deg);
  top: 0%;
}

.grid-label-content.left-mid::before {
  transform: translateX(-3px) rotate(135deg);
  left: 0%
}

.grid-label-content.right-mid::before {
  transform: translateX(3px) rotate(-45deg);
  right: 0%;
}

.grid-label-content.right-top::before {
  transform: translateX(3px) translateY(-1px) rotate(-90deg) skewY(30deg);
  right: 0%;
  top: 0%;
}

.grid-label-content.right-bottom::before {
  transform: translateX(3px) translateY(-3px) skewX(30deg);
  right: 0%;
  top: 100%;
}

.grid-label-content.bottom-right::before {
  transform:  translateX(1px) translateY(-1px) skewY(30deg);
  right: 0%;
  top: 100%;
}

.grid-label-content.bottom-left::before {
  transform:  translateX(-1px) translateY(-1px) rotate(90deg) skewX(30deg);
  left: 0%;
  top: 100%;
}

.grid-label-content.left-top::before {
  transform: translateX(-3px) translateY(-1px) rotate(180deg) skewX(30deg);
  left: 0%;
  top: 0%;
}

.grid-label-content.left-bottom::before {
  transform: translateX(-3px) translateY(-3px) rotate(90deg) skewY(30deg);
  left: 0%;
  top: 100%;
}

.grid-label-content.top-right::before {
  transform:  translateX(1px) translateY(-3px) rotate(-90deg) skewX(30deg);
  right: 0%;
  top: 0%;
}

.grid-label-content.top-left::before {
  transform:  translateX(-1px) translateY(-3px) rotate(180deg) skewY(30deg);
  left: 0%;
  top: 0%;
}

@media (forced-colors: active) {
  .grid-label-content {
      border-color: Highlight;
      background-color: Canvas;
      color: Text;
      forced-color-adjust: none;
  }
  .grid-label-content::before {
    background-color: Canvas;
    border-color: Highlight;
  }
}`;

export interface GridHighlight {
  gridBorder: Array<string|number>;
  writingMode: string;
  rowGaps: Array<string|number>;
  rotationAngle: number, columnGaps: Array<string|number>;
  rows: Array<string|number>;
  columns: Array<string|number>;
  areaNames: {[key: string]: Array<string|number>};
  gridHighlightConfig: {
    gridBackgroundColor?: string;
    gridBorderColor?: string;
    rowGapColor?: string;
    columnGapColor?: string;
    areaBorderColor?: string; gridBorderDash: boolean; rowLineDash: boolean; columnLineDash: boolean;
    showGridExtensionLines: boolean;
    showPositiveLineNumbers: boolean;
    showNegativeLineNumbers: boolean;
    rowLineColor: string;
    columnLineColor: string;
    rowHatchColor: string;
    columnHatchColor: string;
    showLineNames: boolean;
  }
}

export function drawLayoutGridHighlight(
    highlight: GridHighlight, context: CanvasRenderingContext2D, deviceScaleFactor: number, canvasWidth: number,
    canvasHeight: number, emulationScaleFactor: number, labelState: GridLabelState) {
  const gridBounds = emptyBounds();
  const gridPath = buildPath(highlight.gridBorder, gridBounds, emulationScaleFactor);

  // Transform the context to match the current writing-mode.
  context.save();
  _applyWritingModeTransformation(highlight.writingMode, gridBounds, context);

  // Draw grid background
  if (highlight.gridHighlightConfig.gridBackgroundColor) {
    context.fillStyle = highlight.gridHighlightConfig.gridBackgroundColor;
    context.fill(gridPath);
  }

  // Draw Grid border
  if (highlight.gridHighlightConfig.gridBorderColor) {
    context.save();
    context.translate(0.5, 0.5);
    context.lineWidth = 0;
    if (highlight.gridHighlightConfig.gridBorderDash) {
      context.setLineDash([3, 3]);
    }
    context.strokeStyle = highlight.gridHighlightConfig.gridBorderColor;
    context.stroke(gridPath);
    context.restore();
  }

  // Draw grid lines
  const rowBounds = _drawGridLines(context, highlight, 'row', emulationScaleFactor);
  const columnBounds = _drawGridLines(context, highlight, 'column', emulationScaleFactor);

  // Draw gaps
  _drawGridGap(
      context, highlight.rowGaps, highlight.gridHighlightConfig.rowGapColor,
      highlight.gridHighlightConfig.rowHatchColor, highlight.rotationAngle, emulationScaleFactor,
      /* flipDirection */ true);
  _drawGridGap(
      context, highlight.columnGaps, highlight.gridHighlightConfig.columnGapColor,
      highlight.gridHighlightConfig.columnHatchColor, highlight.rotationAngle, emulationScaleFactor,
      /* flipDirection */ false);

  // Draw named grid areas
  const areaBounds =
      _drawGridAreas(context, highlight.areaNames, highlight.gridHighlightConfig.areaBorderColor, emulationScaleFactor);

  // The rest of the overlay is drawn without the writing-mode transformation, but we keep the matrix to transform relevant points.
  const writingModeMatrix = context.getTransform();
  writingModeMatrix.scaleSelf(1 / deviceScaleFactor);
  context.restore();

  if (highlight.gridHighlightConfig.showGridExtensionLines) {
    if (rowBounds) {
      _drawExtendedGridLines(
          context, rowBounds, highlight.gridHighlightConfig.rowLineDash, writingModeMatrix, canvasWidth, canvasHeight);
    }
    if (columnBounds) {
      _drawExtendedGridLines(
          context, columnBounds, highlight.gridHighlightConfig.columnLineDash, writingModeMatrix, canvasWidth,
          canvasHeight);
    }
  }

  // Draw all the labels
  drawGridLabels(highlight, gridBounds, areaBounds, {canvasWidth, canvasHeight}, labelState, writingModeMatrix);
}

function _applyWritingModeTransformation(writingMode: string, gridBounds: Bounds, context: CanvasRenderingContext2D) {
  if (writingMode !== 'vertical-rl' && writingMode !== 'vertical-lr') {
    return;
  }

  const topLeft = gridBounds.allPoints[0];
  const bottomLeft = gridBounds.allPoints[3];

  // Move to the top-left corner to do all transformations there.
  context.translate(topLeft.x, topLeft.y);

  if (writingMode === 'vertical-rl') {
    context.rotate(90 * Math.PI / 180);
    context.translate(0, -1 * (bottomLeft.y - topLeft.y));
  }

  if (writingMode === 'vertical-lr') {
    context.rotate(90 * Math.PI / 180);
    context.scale(1, -1);
  }

  // Move back to the original point.
  context.translate(topLeft.x * -1, topLeft.y * -1);
}

function _drawGridLines(
    context: CanvasRenderingContext2D, highlight: GridHighlight, direction: 'row'|'column',
    emulationScaleFactor: number) {
  const tracks = highlight[`${direction}s` as 'rows' | 'columns'];
  const color = highlight.gridHighlightConfig[`${direction}LineColor` as 'rowLineColor' | 'columnLineColor'];
  const dash = highlight.gridHighlightConfig[`${direction}LineDash` as 'rowLineDash' | 'columnLineDash'];

  if (!color) {
    return null;
  }

  const bounds = emptyBounds();
  const path = buildPath(tracks, bounds, emulationScaleFactor);

  context.save();
  context.translate(0.5, 0.5);
  if (dash) {
    context.setLineDash([3, 3]);
  }
  context.lineWidth = 0;
  context.strokeStyle = color;

  context.save();
  context.stroke(path);
  context.restore();

  context.restore();

  return bounds;
}

function _drawExtendedGridLines(
    context: CanvasRenderingContext2D, bounds: Bounds, dash: boolean|undefined, writingModeMatrix: DOMMatrix,
    canvasWidth: number, canvasHeight: number) {
  context.save();
  context.strokeStyle = DEFAULT_EXTENDED_LINE_COLOR;
  context.lineWidth = 1;
  context.translate(0.5, 0.5);
  if (dash) {
    context.setLineDash([3, 3]);
  }

  // A grid track path is a list of lines defined by 2 points.
  // Here we're going through the list of all points 2 by 2, so we can draw the extensions at the edges of each line.
  for (let i = 0; i < bounds.allPoints.length; i += 2) {
    let point1 = applyMatrixToPoint(bounds.allPoints[i], writingModeMatrix);
    let point2 = applyMatrixToPoint(bounds.allPoints[i + 1], writingModeMatrix);
    let edgePoint1;
    let edgePoint2;

    if (point1.x === point2.x) {
      // Special case for a vertical line.
      edgePoint1 = {x: point1.x, y: 0};
      edgePoint2 = {x: point1.x, y: canvasHeight};
      if (point2.y < point1.y) {
        [point1, point2] = [point2, point1];
      }
    } else if (point1.y === point2.y) {
      // Special case for a horizontal line.
      edgePoint1 = {x: 0, y: point1.y};
      edgePoint2 = {x: canvasWidth, y: point1.y};
      if (point2.x < point1.x) {
        [point1, point2] = [point2, point1];
      }
    } else {
      // When the line isn't straight, we need to do some maths.
      const a = (point2.y - point1.y) / (point2.x - point1.x);
      const b = (point1.y * point2.x - point2.y * point1.x) / (point2.x - point1.x);

      edgePoint1 = {x: 0, y: b};
      edgePoint2 = {x: canvasWidth, y: (canvasWidth * a) + b};

      if (point2.x < point1.x) {
        [point1, point2] = [point2, point1];
      }
    }

    context.beginPath();
    context.moveTo(edgePoint1.x, edgePoint1.y);
    context.lineTo(point1.x, point1.y);
    context.moveTo(point2.x, point2.y);
    context.lineTo(edgePoint2.x, edgePoint2.y);
    context.stroke();
  }

  context.restore();
}

/**
 * Draw all of the named grid area paths. This does not draw the labels, as
 * placing labels in and around the grid for various things is handled later.
 */
function _drawGridAreas(
    context: CanvasRenderingContext2D, areas: {[key: string]: Array<string|number>}, borderColor: string|undefined,
    emulationScaleFactor: number): AreaBounds[] {
  if (!areas || !Object.keys(areas).length) {
    return [];
  }

  context.save();
  if (borderColor) {
    context.strokeStyle = borderColor;
  }
  context.lineWidth = 2;

  const areaBounds = [];

  for (const name in areas) {
    const areaCommands = areas[name];

    const bounds = emptyBounds();
    const path = buildPath(areaCommands, bounds, emulationScaleFactor);

    context.stroke(path);

    areaBounds.push({name, bounds});
  }

  context.restore();

  return areaBounds;
}

function _drawGridGap(
    context: CanvasRenderingContext2D, gapCommands: Array<number|string>, gapColor: string|undefined,
    hatchColor: string|undefined, rotationAngle: number, emulationScaleFactor: number,
    flipDirection: boolean|undefined) {
  if (!gapColor && !hatchColor) {
    return;
  }

  context.save();
  context.translate(0.5, 0.5);
  context.lineWidth = 0;

  const bounds = emptyBounds();
  const path = buildPath(gapCommands, bounds, emulationScaleFactor);

  // Fill the gap background if needed.
  if (gapColor) {
    context.fillStyle = gapColor;
    context.fill(path);
  }

  // And draw the hatch pattern if needed.
  if (hatchColor) {
    _hatchFillPath(context, path, bounds, /* delta */ 10, hatchColor, rotationAngle, flipDirection);
  }
  context.restore();
}

/**
 * Draw line hatching at a 45 degree angle for a given
 * path.
 *   __________
 *   |\  \  \ |
 *   | \  \  \|
 *   |  \  \  |
 *   |\  \  \ |
 *   **********
 */
function _hatchFillPath(
    context: CanvasRenderingContext2D, path: Path2D, bounds: Bounds, delta: number, color: string,
    rotationAngle: number, flipDirection: boolean|undefined) {
  const dx = bounds.maxX - bounds.minX;
  const dy = bounds.maxY - bounds.minY;
  context.rect(bounds.minX, bounds.minY, dx, dy);
  context.save();
  context.clip(path);
  context.setLineDash([5, 3]);
  const majorAxis = Math.max(dx, dy);
  context.strokeStyle = color;
  const centerX = bounds.minX + dx / 2;
  const centerY = bounds.minY + dy / 2;
  context.translate(centerX, centerY);
  context.rotate(rotationAngle * Math.PI / 180);
  context.translate(-centerX, -centerY);
  if (flipDirection) {
    for (let i = -majorAxis; i < majorAxis; i += delta) {
      context.beginPath();
      context.moveTo(bounds.maxX - i, bounds.minY);
      context.lineTo(bounds.maxX - dy - i, bounds.maxY);
      context.stroke();
    }
  } else {
    for (let i = -majorAxis; i < majorAxis; i += delta) {
      context.beginPath();
      context.moveTo(i + bounds.minX, bounds.minY);
      context.lineTo(dy + i + bounds.minX, bounds.maxY);
      context.stroke();
    }
  }
  context.restore();
}
