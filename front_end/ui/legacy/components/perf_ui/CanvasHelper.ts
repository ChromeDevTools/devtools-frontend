// Copyright (c) 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as ThemeSupport from '../../theme_support/theme_support.js';

import {ARROW_SIDE, type Legend} from './FlameChart.js';
import {getFontFamilyForCanvas} from './Font.js';

const LEGEND_SHAPE_DIMENSION = 8;
const LEGEND_SHAPE_RADIUS = 2;
const LEGEND_SHAPE_TEXT_GAP = 4;
const LEGEND_ITEM_GAP = 12;

// The DEFAULT_FONT_SIZE is 11px, the legends' font size should be slightly smaller.
const LEGEND_FONT_SIZE = '8px';

export function horizontalLine(context: CanvasRenderingContext2D, width: number, y: number): void {
  context.moveTo(0, y);
  context.lineTo(width, y);
}

export function drawExpansionArrow(context: CanvasRenderingContext2D, x: number, y: number, expanded: boolean): void {
  // We will draw a equilateral triangle, so first calculate the height of the triangle.
  const arrowHeight = ARROW_SIDE * Math.sqrt(3) / 2;
  const arrowCenterOffset = Math.round(arrowHeight / 2);
  context.save();
  context.beginPath();
  context.translate(x, y);
  context.rotate(expanded ? Math.PI / 2 : 0);
  // The final triangle will be this shape: (the rotation will be handled by `context.rotate`)
  // |\
  // | \
  // | /
  // |/

  // Move to the top vertex
  context.moveTo(-arrowCenterOffset, -ARROW_SIDE / 2);
  // Line to the bottom vertex
  context.lineTo(-arrowCenterOffset, ARROW_SIDE / 2);
  // Line to the right vertex
  context.lineTo(arrowHeight - arrowCenterOffset, 0);
  context.fill();
  context.restore();
}

export function drawIcon(
    context: CanvasRenderingContext2D, x: number, y: number, width: number, pathData: string,
    iconColor: string = '--sys-color-on-surface'): void {
  const p = new Path2D(pathData);

  context.save();
  context.translate(x, y);
  // This color is same as the background of the whole flame chart.
  context.fillStyle = ThemeSupport.ThemeSupport.instance().getComputedValue('--sys-color-cdt-base-container');
  context.fillRect(0, 0, width, width);

  context.fillStyle = ThemeSupport.ThemeSupport.instance().getComputedValue(iconColor);
  // The pathData from front_end/images folder is for a 20 pixel icon.
  // So we add a scale to draw the icon in a correct size.
  const scale = width / 20;
  context.scale(scale, scale);
  context.fill(p);
  context.restore();
}

export function drawLegends(context: CanvasRenderingContext2D, x: number, y: number, legends: Legend[]): void {
  context.save();
  context.translate(x, y);
  let xForLegend = 0;
  for (const legend of legends) {
    xForLegend = drawOneLegend(context, xForLegend, 4, legend.color, legend.category);
  }
  context.restore();
}

/**
 * Draw a legend for the given color and category.
 *
 * @param color should be a string parsed as CSS <color> value
 * @returns the x offset of the current legend
 */
function drawOneLegend(
    context: CanvasRenderingContext2D, x: number, y: number, color: string, category: string): number {
  context.save();

  context.beginPath();
  context.fillStyle = color;
  drawRoundedRectangle(context, x, y, LEGEND_SHAPE_DIMENSION, LEGEND_SHAPE_DIMENSION, LEGEND_SHAPE_RADIUS);
  context.fill();

  context.textBaseline = 'top';
  context.fillStyle = ThemeSupport.ThemeSupport.instance().getComputedValue('--color-text-primary');
  context.font = `${LEGEND_FONT_SIZE} ${getFontFamilyForCanvas()}`;
  context.fillText(category, x + LEGEND_SHAPE_DIMENSION + LEGEND_SHAPE_TEXT_GAP, y);
  const renderedTextWidth = context.measureText(category).width;
  const endXPositionForEntry = x + LEGEND_SHAPE_DIMENSION + LEGEND_SHAPE_TEXT_GAP + renderedTextWidth;

  context.restore();

  return endXPositionForEntry + LEGEND_ITEM_GAP;
}

function drawRoundedRectangle(
    context: CanvasRenderingContext2D, startX: number, startY: number, width: number, height: number,
    borderRadius: number): void {
  context.save();
  const endY = startY + height;
  const endX = startX + width;

  const bezierCurveHandlerAmount = borderRadius * 0.25;

  context.beginPath();
  // Start at the top left, and draw a line to the top right.
  context.moveTo(startX + borderRadius, startY);
  context.lineTo(endX - borderRadius, startY);
  // Curve from top right corner round and down
  context.bezierCurveTo(
      endX - bezierCurveHandlerAmount, startY, endX, startY + bezierCurveHandlerAmount, endX, startY + borderRadius);
  // Draw down to bottom right corner
  context.lineTo(endX, endY - borderRadius);
  // Curve from bottom right corner round to face the bottom left corner
  context.bezierCurveTo(
      endX, endY - bezierCurveHandlerAmount, endX - bezierCurveHandlerAmount, endY, endX - borderRadius, endY);
  // Draw line to bottom left corner
  context.lineTo(startX + borderRadius, endY);
  // Curve round and up from bottom left corner
  context.bezierCurveTo(
      startX + bezierCurveHandlerAmount, endY, startX, endY - bezierCurveHandlerAmount, startX, endY - borderRadius);
  // Draw line up to top left corner
  context.lineTo(startX, startY + borderRadius);
  // Curve from top left corner round to meet the line we first drew.
  context.bezierCurveTo(
      startX, startY + bezierCurveHandlerAmount, startX + bezierCurveHandlerAmount, startY, startX + borderRadius,
      startY);
  context.closePath();
  context.restore();
}
