// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import commonStyle from './common.css';
import {adoptStyleSheet} from './common.js';
import {gridStyle} from './highlight_grid_common.js';
import {DistancesOverlay} from './tool_distances_impl.js';
import highlightStyle from './tool_highlight.css';
import highlightGridStyle from './tool_highlight_grid.css';
import {HighlightGridOverlay} from './tool_highlight_grid_impl.js';
import {HighlightOverlay} from './tool_highlight_impl.js';
import pausedStyle from './tool_paused.css';
import {PausedOverlay} from './tool_paused_impl.js';
import screenshotStyle from './tool_screenshot.css';
import {ScreenshotOverlay} from './tool_screenshot_impl.js';
import sourceOrderStyle from './tool_source_order.css';
import {SourceOrderOverlay} from './tool_source_order_impl.js';
import {ViewportSizeOverlay} from './tool_viewport_size_impl.js';

adoptStyleSheet(commonStyle);

const gridStyleSheet = new CSSStyleSheet();
gridStyleSheet.replaceSync(gridStyle);

const highlightOverlay = new HighlightOverlay(window, [highlightStyle, gridStyleSheet]);
const highlightGridOverlay = new HighlightGridOverlay(window, [highlightGridStyle, gridStyleSheet]);
const distancesOverlay = new DistancesOverlay(window);
const pausedOverlay = new PausedOverlay(window, pausedStyle);
const screenshotOverlay = new ScreenshotOverlay(window, screenshotStyle);
const sourceOrderOverlay = new SourceOrderOverlay(window, sourceOrderStyle);
const viewportSizeOverlay = new ViewportSizeOverlay(window);

let currentOverlay;
let platformName;

// Key in this object is the name the backend refers to a particular overlay by.
const overlays = {
  distances: distancesOverlay,
  highlight: highlightOverlay,
  highlightGrid: highlightGridOverlay,
  paused: pausedOverlay,
  screenshot: screenshotOverlay,
  sourceOrder: sourceOrderOverlay,
  viewportSize: viewportSizeOverlay,
};

window.dispatch = message => {
  const functionName = message[0] as string;
  if (functionName === 'setOverlay') {
    const overlayName = message[1] as string;
    if (currentOverlay) {
      currentOverlay.uninstall();
    }
    currentOverlay = overlays[overlayName];
    currentOverlay.setPlatform(platformName);
    // TODO: setPlatform invokes install() for compatibility with the backend.
    // The call to install() can be removed from setPlatform() after the backend is updated.
    if (!currentOverlay.installed) {
      currentOverlay.install();
    }
  } else if (functionName === 'setPlatform') {
    platformName = message[1] as string;
  } else {
    currentOverlay.dispatch(message);
  }
};
