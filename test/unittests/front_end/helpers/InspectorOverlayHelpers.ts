// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {assertNotNull, renderElementIntoDOM} from './DOMHelpers.js';
import {reset} from '../../../../front_end/inspector_overlay/common.js';
import {drawGridNumbers} from '../../../../front_end/inspector_overlay/css_grid_label_helpers.js';

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

interface GridHighlightConfig {
  showPositiveLineNumbers?: boolean;
  showNegativeLineNumbers?: boolean;
}
interface HighlightConfig {
  gridHighlightConfig: GridHighlightConfig;
  positiveRowLineNumberOffsets?: number[];
  negativeRowLineNumberOffsets?: number[];
  positiveColumnLineNumberOffsets?: number[];
  negativeColumnLineNumberOffsets?: number[];
}
interface Bounds {
  minX: number, maxX: number, minY: number, maxY: number,
}
interface ExpectedLabel {
  className: string;
  count: number;
}

export function drawGridNumbersAndAssertLabels(
    config: HighlightConfig, bounds: Bounds, expectedLabels: ExpectedLabel[]) {
  drawGridNumbers(config, bounds);

  const el = getGridLabelContainer();
  assertNotNull(el);

  let totalLabelCount = 0;
  for (const {className, count} of expectedLabels) {
    const labels = el.querySelectorAll(`.grid-label-content.${className}`);
    assert.strictEqual(labels.length, count, `Expected ${count} labels to be displayed ${className}`);
    totalLabelCount += count;
  }

  assert.strictEqual(
      el.querySelectorAll('.grid-label-content').length, totalLabelCount,
      'The right total number of labels were displayed');
}
