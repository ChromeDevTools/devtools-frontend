// Copyright (c) 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as ThemeSupport from '../../theme_support/theme_support.js';

import {ARROW_SIDE} from './FlameChart.js';

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
