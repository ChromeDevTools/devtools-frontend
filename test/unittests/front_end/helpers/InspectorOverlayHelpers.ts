// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {assertNotNull, renderElementIntoDOM} from './DOMHelpers.js';
import {reset} from '../../../../front_end/inspector_overlay/common.js';
import {_normalizePositionData, drawGridAreaNames, drawGridLineNumbers} from '../../../../front_end/inspector_overlay/css_grid_label_helpers.js';
import {AreaBounds, Bounds} from '../../../../front_end/inspector_overlay/common.js';

const GRID_LABEL_CONTAINER_ID = 'grid-label-container';
const DEFAULT_GRID_LABEL_LAYER_ID = 'grid-labels';
const GRID_LINE_NUMBER_LABEL_CONTAINER_CLASS = 'line-numbers';
const GRID_LINE_AREA_LABEL_CONTAINER_CLASS = 'area-names';
const GRID_TRACK_SIZES_LABEL_CONTAINER_CLASS = 'track-sizes';

// Make sure typescript knows about the custom properties that are set on the window object.
declare global {
  interface Window {
    gridPageMargin: number;
    canvasWidth: number;
    canvasHeight: number,
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
  window.canvasHeight = 600;
  window.canvasWidth = 800;
}

/**
 * This does the same as initFrame but also prepares the DOM for testing grid labels.
 */
export function initFrameForGridLabels() {
  initFrame();
  createGridLabelContainer();
}

export function initFrameForMultipleGridLabels(numGrids: number) {
  initFrame();
  for (let i = 1; i <= numGrids; i++) {
    createGridLabelContainer(i);
  }
}

export function createGridLabelContainer(layerId?: number) {
  // Ensure main layer is created first
  let el = document.getElementById(GRID_LABEL_CONTAINER_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = GRID_LABEL_CONTAINER_ID;
  }

  const layerEl = el.createChild('div');
  layerEl.id = layerId ? `grid-${layerId}-labels` : DEFAULT_GRID_LABEL_LAYER_ID;
  layerEl.createChild('div', GRID_LINE_NUMBER_LABEL_CONTAINER_CLASS);
  layerEl.createChild('div', GRID_LINE_AREA_LABEL_CONTAINER_CLASS);
  layerEl.createChild('div', GRID_TRACK_SIZES_LABEL_CONTAINER_CLASS);

  renderElementIntoDOM(el, {allowMultipleChildren: true});
}

export function getMainGridLabelContainer(): HTMLElement {
  const el = document.getElementById(GRID_LABEL_CONTAINER_ID) as HTMLElement;
  assertNotNull(el);
  return el;
}

export function getGridLabelContainer(layerId?: number): HTMLElement {
  const id = layerId ? `grid-${layerId}-labels` : DEFAULT_GRID_LABEL_LAYER_ID;
  const el = document.querySelector(`#${GRID_LABEL_CONTAINER_ID} #${CSS.escape(id)}`) as HTMLElement;
  assertNotNull(el);
  return el;
}

export function getGridLineNumberLabelContainer(layerId?: number): HTMLElement {
  const id = layerId ? `grid-${layerId}-labels` : DEFAULT_GRID_LABEL_LAYER_ID;
  const el =
      document.querySelector(
          `#${GRID_LABEL_CONTAINER_ID} #${CSS.escape(id)} .${GRID_LINE_NUMBER_LABEL_CONTAINER_CLASS}`) as HTMLElement;
  assertNotNull(el);
  return el;
}

export function getGridTrackSizesLabelContainer(layerId?: number): HTMLElement {
  const id = layerId ? `grid-${layerId}-labels` : DEFAULT_GRID_LABEL_LAYER_ID;
  const el =
      document.querySelector(
          `#${GRID_LABEL_CONTAINER_ID} #${CSS.escape(id)} .${GRID_TRACK_SIZES_LABEL_CONTAINER_CLASS}`) as HTMLElement;
  assertNotNull(el);
  return el;
}

export function getGridAreaNameLabelContainer(layerId?: number): HTMLElement {
  const id = layerId ? `grid-${layerId}-labels` : DEFAULT_GRID_LABEL_LAYER_ID;
  const el =
      document.querySelector(
          `#${GRID_LABEL_CONTAINER_ID} #${CSS.escape(id)} .${GRID_LINE_AREA_LABEL_CONTAINER_CLASS}`) as HTMLElement;
  assertNotNull(el);
  return el;
}

interface GridHighlightConfig {
  showPositiveLineNumbers?: boolean;
  showNegativeLineNumbers?: boolean;
}

interface Position {
  x: number;
  y: number;
}

interface TrackSize extends Position {
  computedSize: number;
}

interface HighlightConfig {
  gridHighlightConfig: GridHighlightConfig;
  positiveRowLineNumberPositions?: Position[];
  negativeRowLineNumberPositions?: Position[];
  positiveColumnLineNumberPositions?: Position[];
  negativeColumnLineNumberPositions?: Position[];
  layerId?: number;
  rowTrackSizes?: TrackSize[];
  columnTrackSizes?: TrackSize[];
  rotationAngle?: number;
}

interface ExpectedLayerLabel {
  layerId: number;
  expectedLabels: ExpectedLineNumberLabel[];
}
interface ExpectedLineNumberLabel {
  className: string;
  count: number;
}

interface ExpectedAreaNameLabel {
  textContent: string;
  left?: string;
  top?: string;
}

export function drawGridLineNumbersAndAssertLabels(
    config: HighlightConfig, bounds: Bounds, expectedLabels: ExpectedLineNumberLabel[]) {
  const el = getGridLineNumberLabelContainer(config.layerId);
  const data = _normalizePositionData(config, bounds);
  drawGridLineNumbers(el, data);

  let totalLabelCount = 0;
  for (const {className, count} of expectedLabels) {
    const labels = el.querySelectorAll(`.line-numbers .grid-label-content.${CSS.escape(className)}`);
    assert.strictEqual(labels.length, count, `Expected ${count} labels to be displayed for ${className}`);
    totalLabelCount += count;
  }

  assert.strictEqual(
      el.querySelectorAll('.line-numbers .grid-label-content').length, totalLabelCount,
      'The right total number of line number labels were displayed');
}

export function drawGridAreaNamesAndAssertLabels(areaNames: AreaBounds[], expectedLabels: ExpectedAreaNameLabel[]) {
  const el = getGridAreaNameLabelContainer();
  drawGridAreaNames(el, areaNames);

  const labels = el.querySelectorAll('.area-names .grid-label-content');
  assert.strictEqual(labels.length, expectedLabels.length, 'The right total number of area name labels were displayed');

  const foundLabels: ExpectedAreaNameLabel[] = [];
  labels.forEach(label => {
    foundLabels.push({
      textContent: label.textContent || '',
      top: (label as HTMLElement).style.top,
      left: (label as HTMLElement).style.left,
    });
  });
  for (const expected of expectedLabels) {
    const foundLabel = foundLabels.find(({textContent}) => textContent === expected.textContent);

    if (!foundLabel) {
      assert.fail(`Expected area label with text content ${expected.textContent} not found`);
      return;
    }

    if (typeof expected.left !== 'undefined') {
      assert.strictEqual(
          foundLabel.left, expected.left,
          `Expected label ${expected.textContent} to be left positioned to ${expected.left}`);
    }
    if (typeof expected.top !== 'undefined') {
      assert.strictEqual(
          foundLabel.top, expected.top,
          `Expected label ${expected.textContent} to be top positioned to ${expected.top}`);
    }
  }
}

export function drawMultipleGridLineNumbersAndAssertLabels(
    configs: HighlightConfig[], bounds: Bounds, expectedLabelList: ExpectedLayerLabel[]) {
  for (const config of configs) {
    const el = getGridLineNumberLabelContainer(config.layerId);
    const data = _normalizePositionData(config, bounds);
    drawGridLineNumbers(el, data);
  }

  let totalLabelCount = 0;
  for (const {layerId, expectedLabels} of expectedLabelList) {
    const el = getGridLineNumberLabelContainer(layerId);
    for (const {className, count} of expectedLabels) {
      const labels = el.querySelectorAll(`.line-numbers .grid-label-content.${CSS.escape(className)}`);
      assert.strictEqual(labels.length, count, `Expected ${count} labels to be displayed for ${className}`);
      totalLabelCount += count;
    }
  }

  const mainLayerEl = getMainGridLabelContainer();
  assert.strictEqual(
      mainLayerEl.querySelectorAll('.line-numbers .grid-label-content').length, totalLabelCount,
      'The right total number of line number labels were displayed');
}
