// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {PathCommands} from './common.js';
import {buildPath, drawPathWithLineStyle, emptyBounds, type LineStyle} from './highlight_common.js';

interface QueryingDescendantData {
  descendantBorder: PathCommands;
}
export interface ContainerQueryHighlight {
  containerBorder: PathCommands;
  queryingDescendants?: QueryingDescendantData[];
  containerQueryContainerHighlightConfig: {
    containerBorder?: LineStyle,
    descendantBorder?: LineStyle,
  };
}

export function drawContainerQueryHighlight(
    highlight: ContainerQueryHighlight, context: CanvasRenderingContext2D, emulationScaleFactor: number) {
  const config = highlight.containerQueryContainerHighlightConfig;
  const bounds = emptyBounds();
  const borderPath = buildPath(highlight.containerBorder, bounds, emulationScaleFactor);
  drawPathWithLineStyle(context, borderPath, config.containerBorder, 2 /* thicker container outline */);

  if (!highlight.queryingDescendants) {
    return;
  }

  for (const descendant of highlight.queryingDescendants) {
    const descendantBounds = emptyBounds();
    const descendantBorderPath = buildPath(descendant.descendantBorder, descendantBounds, emulationScaleFactor);
    drawPathWithLineStyle(context, descendantBorderPath, config.descendantBorder);
  }
}
