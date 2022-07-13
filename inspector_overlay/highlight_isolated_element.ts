// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {type PathCommands} from './common.js';
import {buildPath, emptyBounds, fillPathWithBoxStyle} from './highlight_common.js';

export interface IsolatedElementHighlight {
  widthResizerBorder: PathCommands;
  heightResizerBorder: PathCommands;
  bidirectionResizerBorder: PathCommands;
  currentX: number;
  currentY: number;
  currentWidth: number;
  currentHeight: number;
  highlightIndex: number;
  isolationModeHighlightConfig: {
    resizerColor: string,
    resizerHandleColor: string,
    maskColor: string,
  };
}

export function drawIsolatedElementHighlight(
    highlight: IsolatedElementHighlight, context: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number,
    emulationScaleFactor: number) {
  const {currentX, currentY, currentWidth, currentHeight, highlightIndex} = highlight;
  // Draw a mask covering other area of the canvas.
  context.save();
  context.fillStyle = highlight.isolationModeHighlightConfig.maskColor;
  context.fillRect(0, 0, canvasWidth, canvasHeight);
  context.clearRect(currentX, currentY, currentWidth, currentHeight);
  context.restore();

  // Draw the width resizer with handle bars.
  const bounds = emptyBounds();
  const widthPath = buildPath(highlight.widthResizerBorder, bounds, emulationScaleFactor);
  fillPathWithBoxStyle(context, widthPath, bounds, 0 /* angle */, {
    fillColor: highlight.isolationModeHighlightConfig.resizerColor,
  });

  // Draw the height resizer with handle bars.
  const heightPath = buildPath(highlight.heightResizerBorder, bounds, emulationScaleFactor);
  fillPathWithBoxStyle(context, heightPath, bounds, 0 /* angle */, {
    fillColor: highlight.isolationModeHighlightConfig.resizerColor,
  });

  // Draw the bidirection resizer with handle bars.
  const bidirectionPath = buildPath(highlight.bidirectionResizerBorder, bounds, emulationScaleFactor);
  fillPathWithBoxStyle(context, bidirectionPath, bounds, 0 /* angle */, {
    fillColor: highlight.isolationModeHighlightConfig.resizerColor,
  });

  return {
    widthPath,
    heightPath,
    bidirectionPath,
    currentWidth,
    currentHeight,
    highlightIndex,
  };
}
