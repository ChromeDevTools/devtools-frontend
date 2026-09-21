// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {PathCommands} from './common.js';
import {
  buildPath,
  drawPathWithLineStyle,
  emptyBounds,
  fillPathWithBoxStyle,
  LinePattern,
  type LineStyle,
} from './highlight_common.js';

export interface AnchorTargetHighlight {
  anchorBorder: PathCommands;
  name?: string;
}

export interface PositionAreaGridHighlight {
  gridBorder?: PathCommands;
  gridLines?: PathCommands[];
  activeRegion?: PathCommands;
}

export interface AnchorHighlightConfig {
  imcbBorder?: LineStyle;
  imcbFillColor?: string;
  insetsFillColor?: string;
  insetsHatchColor?: string;
  anchorBorder?: LineStyle;
  anchorFillColor?: string;
  showPositionAreaGrid?: boolean;
  positionAreaGridLineColor?: LineStyle;
  positionAreaActiveRegionColor?: string;
}

export interface AnchorHighlight {
  imcbBorder: PathCommands;
  containingBlockBorder?: PathCommands;
  anchorTargets?: AnchorTargetHighlight[];
  positionAreaGrid?: PositionAreaGridHighlight;
  imcbHighlightConfig: AnchorHighlightConfig;
}

function drawBadge(context: CanvasRenderingContext2D, text: string, x: number, y: number, canvasWidth: number,
                   _canvasHeight: number, backgroundColor = 'rgba(127, 32, 210, 0.85)', textColor = '#ffffff'): void {
  context.save();
  context.font = '11px system-ui, -apple-system, sans-serif';
  context.textBaseline = 'top';

  const paddingH = 6;
  const paddingV = 3;
  const metrics = context.measureText(text);
  const badgeWidth = metrics.width + paddingH * 2;
  const badgeHeight = 18;

  // Position badge above the coordinates if space allows, otherwise below
  let clampedX = x;
  let clampedY = y - badgeHeight - 4;
  if (clampedY < 4) {
    clampedY = y + 4;
  }
  if (canvasWidth > 0 && clampedX + badgeWidth > canvasWidth - 4) {
    clampedX = canvasWidth - badgeWidth - 4;
  }
  if (clampedX < 4) {
    clampedX = 4;
  }

  // Background
  context.fillStyle = backgroundColor;
  context.beginPath();
  if (typeof context.roundRect === 'function') {
    context.roundRect(clampedX, clampedY, badgeWidth, badgeHeight, 3);
  } else {
    context.rect(clampedX, clampedY, badgeWidth, badgeHeight);
  }
  context.fill();

  // Text
  context.fillStyle = textColor;
  context.fillText(text, clampedX + paddingH, clampedY + paddingV);
  context.restore();
}

export function drawAnchorHighlight(highlight: AnchorHighlight, context: CanvasRenderingContext2D,
                                    emulationScaleFactor: number, canvasWidth = 0, canvasHeight = 0): void {
  const config = highlight.imcbHighlightConfig;

  // 1. Inset modifiers: If containingBlockBorder is provided, shade the difference between CB and IMCB.
  if (highlight.containingBlockBorder && (config.insetsFillColor || config.insetsHatchColor)) {
    const cbBounds = emptyBounds();
    const cbPath = buildPath(highlight.containingBlockBorder, cbBounds, emulationScaleFactor);
    fillPathWithBoxStyle(context, cbPath, cbBounds, 0, {
      fillColor: config.insetsFillColor,
      hatchColor: config.insetsHatchColor,
    });

    // Clear the IMCB area from the containing block fill so only the insets remain.
    context.save();
    context.globalCompositeOperation = 'destination-out';
    const clearBounds = emptyBounds();
    const clearPath = buildPath(highlight.imcbBorder, clearBounds, emulationScaleFactor);
    context.fillStyle = 'white';
    context.fill(clearPath);
    context.restore();
  }

  // 2. IMCB Rectangle
  const imcbBounds = emptyBounds();
  const imcbPath = buildPath(highlight.imcbBorder, imcbBounds, emulationScaleFactor);

  if (config.imcbFillColor) {
    context.save();
    context.fillStyle = config.imcbFillColor;
    context.fill(imcbPath);
    context.restore();
  }

  const imcbLineStyle: LineStyle = config.imcbBorder ?? {
    color: 'rgba(127, 32, 210, 0.9)',
    pattern: LinePattern.DASHED,
  };
  drawPathWithLineStyle(context, imcbPath, imcbLineStyle, 1.5);

  // IMCB Size Badge
  if (canvasWidth > 0 && canvasHeight > 0) {
    const width = Math.round((imcbBounds.maxX - imcbBounds.minX) / emulationScaleFactor);
    const height = Math.round((imcbBounds.maxY - imcbBounds.minY) / emulationScaleFactor);
    if (width > 0 && height > 0) {
      drawBadge(context, `IMCB: ${width} \xD7 ${height}px`, imcbBounds.minX, imcbBounds.minY, canvasWidth, canvasHeight,
                'rgba(127, 32, 210, 0.9)', '#ffffff');
    }
  }

  // 3. Anchor Target Elements
  if (highlight.anchorTargets) {
    const targetLineStyle: LineStyle = config.anchorBorder ?? {
      color: 'rgba(26, 115, 232, 0.9)',
      pattern: LinePattern.SOLID,
    };
    for (const target of highlight.anchorTargets) {
      const targetBounds = emptyBounds();
      const targetPath = buildPath(target.anchorBorder, targetBounds, emulationScaleFactor);

      if (config.anchorFillColor) {
        context.save();
        context.fillStyle = config.anchorFillColor;
        context.fill(targetPath);
        context.restore();
      }

      drawPathWithLineStyle(context, targetPath, targetLineStyle, 1.5);

      if (target.name && canvasWidth > 0 && canvasHeight > 0) {
        drawBadge(context, `anchor: ${target.name}`, targetBounds.minX, targetBounds.minY, canvasWidth, canvasHeight,
                  'rgba(26, 115, 232, 0.9)', '#ffffff');
      }
    }
  }

  // 4. 9-Cell position-area Grid
  if (config.showPositionAreaGrid && highlight.positionAreaGrid) {
    const grid = highlight.positionAreaGrid;

    // Active Region Fill
    if (grid.activeRegion && config.positionAreaActiveRegionColor) {
      const activeBounds = emptyBounds();
      const activePath = buildPath(grid.activeRegion, activeBounds, emulationScaleFactor);
      context.save();
      context.fillStyle = config.positionAreaActiveRegionColor;
      context.fill(activePath);
      context.restore();
    }

    // Grid Lines
    const gridLineStyle: LineStyle = config.positionAreaGridLineColor ?? {
      color: 'rgba(26, 115, 232, 0.6)',
      pattern: LinePattern.DASHED,
    };

    if (grid.gridBorder) {
      const gridBorderBounds = emptyBounds();
      const gridBorderPath = buildPath(grid.gridBorder, gridBorderBounds, emulationScaleFactor);
      drawPathWithLineStyle(context, gridBorderPath, gridLineStyle, 1);
    }

    if (grid.gridLines) {
      for (const lineCommands of grid.gridLines) {
        const lineBounds = emptyBounds();
        const linePath = buildPath(lineCommands, lineBounds, emulationScaleFactor);
        drawPathWithLineStyle(context, linePath, gridLineStyle, 1);
      }
    }
  }
}
