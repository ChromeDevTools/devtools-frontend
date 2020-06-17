// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {reset} from '../../../../front_end/inspector_overlay/common.js';

import {renderElementIntoDOM} from './DOMHelpers.js';

const GRID_LABEL_CONTAINER_ID = 'grid-label-container';

// Make sure typescript knows about the custom properties that are set on the window object.
declare global {
  interface Window {
    gridPageMargin: number;
  }
}

/**
 * Before the content of an overlay can be added to the page, the backend normally calls a reset function on window to
 * set the viewport size and resize the canvas to it, and do a few other things.
 * This helper function can be called before each overlay test to simulate this.
 * Consider using initFrameForGridLabels instead if you are going to be testing grid labels.
 */
export function initFrame() {
  reset({
    viewportSize: {
      width: 1000,
      height: 1000,
    },
    deviceScaleFactor: 1,
    emulationScaleFactor: 1,
    pageScaleFactor: 1,
    pageZoomFactor: 1,
    scrollX: 0,
    scrollY: 0,
  });

  window.gridPageMargin = 20;
}

/**
 * This does the same as initFrame but also prepares the DOM for testing grid labels.
 */
export function initFrameForGridLabels() {
  initFrame();
  createGridLabelContainer();
}

export function createGridLabelContainer() {
  const el = document.createElement('div');
  el.id = GRID_LABEL_CONTAINER_ID;
  renderElementIntoDOM(el);
}

export function getGridLabelContainer() {
  return document.getElementById(GRID_LABEL_CONTAINER_ID);
}
