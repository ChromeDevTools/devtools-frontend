
// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {type Bounds, type PathCommands, type Position} from './common.js';

import {drawPath, emptyBounds, type LineStyle, type PathBounds} from './highlight_common.js';

type SnapAlignment = 'none'|'start'|'end'|'center';
export interface ScrollSnapHighlight {
  snapport: PathCommands;
  paddingBox: PathCommands;
  snapAreas: Array<{
    path: PathCommands,
    borderBox: PathCommands,
    alignBlock?: SnapAlignment,
    alignInline?: SnapAlignment,
  }>;
  snapportBorder: LineStyle;
  snapAreaBorder: LineStyle;
  scrollMarginColor: string;
  scrollPaddingColor: string;
}

function getSnapAlignBlockPoint(bounds: Bounds, align: SnapAlignment): Position|undefined {
  if (align === 'start') {
    return {
      x: (bounds.minX + bounds.maxX) / 2,
      y: bounds.minY,
    };
  }
  if (align === 'center') {
    return {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
    };
  }
  if (align === 'end') {
    return {
      x: (bounds.minX + bounds.maxX) / 2,
      y: bounds.maxY,
    };
  }
  return;
}

function getSnapAlignInlinePoint(bounds: Bounds, align: SnapAlignment): Position|undefined {
  if (align === 'start') {
    return {
      x: bounds.minX,
      y: (bounds.minY + bounds.maxY) / 2,
    };
  }
  if (align === 'center') {
    return {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
    };
  }
  if (align === 'end') {
    return {
      x: bounds.maxX,
      y: (bounds.minY + bounds.maxY) / 2,
    };
  }
  return;
}

const ALIGNMENT_POINT_STROKE_WIDTH = 5;
const ALIGNMENT_POINT_STROKE_COLOR = 'white';
const ALIGNMENT_POINT_OUTER_RADIUS = 6;
const ALIGNMENT_POINT_FILL_COLOR = '#4585f6';
const ALIGNMENT_POINT_INNER_RADIUS = 4;

function drawAlignment(context: CanvasRenderingContext2D, point: Position, bounds: Bounds): void {
  let startAngle = 0;
  let renderFullCircle = true;
  if (point.x === bounds.minX) {
    startAngle = -0.5 * Math.PI;
    renderFullCircle = false;
  } else if (point.x === bounds.maxX) {
    startAngle = 0.5 * Math.PI;
    renderFullCircle = false;
  } else if (point.y === bounds.minY) {
    startAngle = 0;
    renderFullCircle = false;
  } else if (point.y === bounds.maxY) {
    startAngle = Math.PI;
    renderFullCircle = false;
  }
  const endAngle = startAngle + (renderFullCircle ? 2 * Math.PI : Math.PI);
  context.save();
  context.beginPath();
  context.lineWidth = ALIGNMENT_POINT_STROKE_WIDTH;
  context.strokeStyle = ALIGNMENT_POINT_STROKE_COLOR;
  context.arc(point.x, point.y, ALIGNMENT_POINT_OUTER_RADIUS, startAngle, endAngle);
  context.stroke();
  context.fillStyle = ALIGNMENT_POINT_FILL_COLOR;
  context.arc(point.x, point.y, ALIGNMENT_POINT_INNER_RADIUS, startAngle, endAngle);
  context.fill();
  context.restore();
}

function drawScrollPadding(
    highlight: ScrollSnapHighlight, context: CanvasRenderingContext2D, emulationScaleFactor: number) {
  drawPath(
      context, highlight.paddingBox, highlight.scrollPaddingColor, undefined, undefined, emptyBounds(),
      emulationScaleFactor);

  // Clear the area so that previously rendered paddings remain.
  context.save();
  context.globalCompositeOperation = 'destination-out';
  drawPath(context, highlight.snapport, 'white', undefined, undefined, emptyBounds(), emulationScaleFactor);
  context.restore();
}

function drawSnapAreas(
    highlight: ScrollSnapHighlight, context: CanvasRenderingContext2D, emulationScaleFactor: number): PathBounds[] {
  const bounds = [];
  for (const area of highlight.snapAreas) {
    const areaBounds = emptyBounds();
    drawPath(
        context, area.path, highlight.scrollMarginColor, highlight.snapAreaBorder.color,
        highlight.snapAreaBorder.pattern, areaBounds, emulationScaleFactor);

    // Clear the area so that previously rendered margins remain.
    context.save();
    context.globalCompositeOperation = 'destination-out';
    drawPath(context, area.borderBox, 'white', undefined, undefined, emptyBounds(), emulationScaleFactor);
    context.restore();

    bounds.push(areaBounds);
  }
  return bounds;
}

function drawAlignmentPoints(
    areaBounds: PathBounds[], highlight: ScrollSnapHighlight, context: CanvasRenderingContext2D) {
  for (let i = 0; i < highlight.snapAreas.length; i++) {
    const area = highlight.snapAreas[i];
    const inlinePoint = area.alignInline ? getSnapAlignInlinePoint(areaBounds[i], area.alignInline) : null;
    const blockPoint = area.alignBlock ? getSnapAlignBlockPoint(areaBounds[i], area.alignBlock) : null;
    if (inlinePoint) {
      drawAlignment(context, inlinePoint, areaBounds[i]);
    }
    if (blockPoint) {
      drawAlignment(context, blockPoint, areaBounds[i]);
    }
  }
}

function drawSnapportBorder(
    highlight: ScrollSnapHighlight, context: CanvasRenderingContext2D, emulationScaleFactor: number) {
  drawPath(
      context, highlight.snapport, undefined, highlight.snapportBorder.color, undefined, emptyBounds(),
      emulationScaleFactor);
}

export function drawScrollSnapHighlight(
    highlight: ScrollSnapHighlight, context: CanvasRenderingContext2D, emulationScaleFactor: number) {
  // The order of the following draw calls is important, change it carefully.
  drawScrollPadding(highlight, context, emulationScaleFactor);
  const areaBounds = drawSnapAreas(highlight, context, emulationScaleFactor);
  drawSnapportBorder(highlight, context, emulationScaleFactor);
  drawAlignmentPoints(areaBounds, highlight, context);
}
