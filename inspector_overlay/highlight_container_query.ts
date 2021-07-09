// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {PathCommands} from './common.js';
import type {LineStyle} from './highlight_common.js';
import {buildPath, drawPathWithLineStyle, emptyBounds} from './highlight_common.js';

export interface ContainerQueryContainerHighlight {
  containerBorder: PathCommands;
  containerQueryContainerHighlightConfig: {
    containerBorder?: LineStyle,
  };
}

export function drawContainerQueryContainerHighlight(
    highlight: ContainerQueryContainerHighlight, context: CanvasRenderingContext2D, emulationScaleFactor: number) {
  const config = highlight.containerQueryContainerHighlightConfig;
  const bounds = emptyBounds();
  const borderPath = buildPath(highlight.containerBorder, bounds, emulationScaleFactor);
  drawPathWithLineStyle(context, borderPath, config.containerBorder);
}
