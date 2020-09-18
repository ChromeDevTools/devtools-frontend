// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {renderElementIntoDOM, assertElements, assertElement} from './DOMHelpers.js';
import {reset, setPlatform} from '../../../../inspector_overlay/common.js';
import {_normalizePositionData, drawGridAreaNames, drawGridLineNumbers, drawGridLineNames} from '../../../../inspector_overlay/css_grid_label_helpers.js';
import {AreaBounds, Bounds} from '../../../../inspector_overlay/common.js';
import {gridStyle} from '../../../../inspector_overlay/highlight_grid_common.js';

const GRID_LABEL_CONTAINER_ID = 'grid-label-container';
const DEFAULT_GRID_LABEL_LAYER_ID = 'grid-labels';
const GRID_LINE_NUMBER_LABEL_CONTAINER_CLASS = 'line-numbers';
const GRID_LINE_NAME_LABEL_CONTAINER_CLASS = 'line-names';
const GRID_LINE_AREA_LABEL_CONTAINER_CLASS = 'area-names';
const GRID_TRACK_SIZES_LABEL_CONTAINER_CLASS = 'track-sizes';

// Make sure typescript knows about the custom properties that are set on the window object.
declare global {
  interface Window {
    gridPageMargin: number;
    canvasWidth: number;
    canvasHeight: number;
    setPlatform: Function;
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
  const styleTag = document.createElement('style');
  styleTag.textContent = gridStyle;
  document.head.append(styleTag);
  initFrame();
  setPlatform('mac');
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
  layerEl.createChild('div', GRID_LINE_NAME_LABEL_CONTAINER_CLASS);
  layerEl.createChild('div', GRID_LINE_AREA_LABEL_CONTAINER_CLASS);
  layerEl.createChild('div', GRID_TRACK_SIZES_LABEL_CONTAINER_CLASS);

  renderElementIntoDOM(el, {allowMultipleChildren: true});
}

export function getMainGridLabelContainer(): HTMLElement {
  const el = document.getElementById(GRID_LABEL_CONTAINER_ID);
  assertElement(el, HTMLElement);
  return el;
}

export function getGridLabelContainer(layerId?: number): HTMLElement {
  const id = layerId ? `grid-${layerId}-labels` : DEFAULT_GRID_LABEL_LAYER_ID;
  const el = document.querySelector(`#${GRID_LABEL_CONTAINER_ID} #${CSS.escape(id)}`);
  assertElement(el, HTMLElement);
  return el;
}

export function getGridLineNumberLabelContainer(layerId?: number): HTMLElement {
  const id = layerId ? `grid-${layerId}-labels` : DEFAULT_GRID_LABEL_LAYER_ID;
  const el = document.querySelector(
      `#${GRID_LABEL_CONTAINER_ID} #${CSS.escape(id)} .${GRID_LINE_NUMBER_LABEL_CONTAINER_CLASS}`);
  assertElement(el, HTMLElement);
  return el;
}

export function getGridLineNameLabelContainer(layerId?: number): HTMLElement {
  const id = layerId ? `grid-${layerId}-labels` : DEFAULT_GRID_LABEL_LAYER_ID;
  const el =
      document.querySelector(`#${GRID_LABEL_CONTAINER_ID} #${CSS.escape(id)} .${GRID_LINE_NAME_LABEL_CONTAINER_CLASS}`);
  assertElement(el, HTMLElement);
  return el;
}

export function getGridTrackSizesLabelContainer(layerId?: number): HTMLElement {
  const id = layerId ? `grid-${layerId}-labels` : DEFAULT_GRID_LABEL_LAYER_ID;
  const el = document.querySelector(
      `#${GRID_LABEL_CONTAINER_ID} #${CSS.escape(id)} .${GRID_TRACK_SIZES_LABEL_CONTAINER_CLASS}`);
  assertElement(el, HTMLElement);
  return el;
}

export function getGridAreaNameLabelContainer(layerId?: number): HTMLElement {
  const id = layerId ? `grid-${layerId}-labels` : DEFAULT_GRID_LABEL_LAYER_ID;
  const el =
      document.querySelector(`#${GRID_LABEL_CONTAINER_ID} #${CSS.escape(id)} .${GRID_LINE_AREA_LABEL_CONTAINER_CLASS}`);
  assertElement(el, HTMLElement);
  return el;
}

interface GridHighlightConfig {
  showPositiveLineNumbers?: boolean;
  showNegativeLineNumbers?: boolean;
  showLineNames?: boolean;
}

interface Position {
  x: number;
  y: number;
}

interface TrackSize extends Position {
  computedSize: number;
}

interface NamedLinePosition extends Position {
  name: string;
}

interface HighlightConfig {
  gridHighlightConfig: GridHighlightConfig;
  positiveRowLineNumberPositions?: Position[];
  negativeRowLineNumberPositions?: Position[];
  positiveColumnLineNumberPositions?: Position[];
  negativeColumnLineNumberPositions?: Position[];
  rowLineNameOffsets?: NamedLinePosition[], columnLineNameOffsets?: NamedLinePosition[], layerId?: number;
  rowTrackSizes?: TrackSize[];
  columnTrackSizes?: TrackSize[];
  rotationAngle?: number;
  writingMode?: string;
}

interface ExpectedLayerLabel {
  layerId: number;
  expectedLabels: ExpectedLineNumberLabel[];
}
interface ExpectedLineNumberLabel {
  className: string;
  count: number;
}

interface ExpectedLineNameLabel {
  type: string;
  textContent: string;
  x?: number;
  y?: number;
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

  // Note that this test helper is focused on testing the number and orientation of the labels, not their exact position
  // so we pass the identity matrix here in all cases, even when a different writing mode is provided.
  drawGridLineNumbers(el, data, new DOMMatrix(), config.writingMode);
  let totalLabelCount = 0;
  for (const {className, count} of expectedLabels) {
    const labels =
        el.querySelectorAll(`.${GRID_LINE_NUMBER_LABEL_CONTAINER_CLASS} .grid-label-content.${CSS.escape(className)}`);
    assert.strictEqual(labels.length, count, `Expected ${count} labels to be displayed for ${className}`);
    totalLabelCount += count;
  }

  assert.strictEqual(
      el.querySelectorAll(`.${GRID_LINE_NUMBER_LABEL_CONTAINER_CLASS} .grid-label-content`).length, totalLabelCount,
      'The right total number of line number labels were displayed');
}

export function drawGridLineNamesAndAssertLabels(
    config: HighlightConfig, bounds: Bounds, expectedLabels: ExpectedLineNameLabel[]) {
  const el = getGridLineNameLabelContainer(config.layerId);
  const data = _normalizePositionData(config, bounds);
  drawGridLineNames(el, data);

  const labels = el.querySelectorAll(`.${GRID_LINE_NAME_LABEL_CONTAINER_CLASS} .grid-label-content`);
  assert.strictEqual(labels.length, expectedLabels.length, 'The right total number of line name labels were displayed');
  assertElements(labels, HTMLElement);

  const foundLabels: {textContent: string, x: number, y: number}[] = [];
  labels.forEach(el => {
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    const top = parseInt(el.style.top, 10);
    const left = parseInt(el.style.left, 10);

    let rowOffset = height / 2;
    if (el.classList.contains('right-top')) {
      rowOffset = 0;
    } else if (el.classList.contains('right-bottom')) {
      rowOffset = height;
    }

    let columnOffset = width / 2;
    if (el.classList.contains('bottom-left')) {
      columnOffset = 0;
    } else if (el.classList.contains('bottom-right')) {
      columnOffset = width;
    }

    foundLabels.push({
      textContent: el.textContent || '',
      x: left + columnOffset,
      y: top + rowOffset,
    });
  });

  for (const expected of expectedLabels) {
    const foundLabel = foundLabels.find(({textContent}) => textContent === expected.textContent);

    if (!foundLabel) {
      assert.fail(`Expected line name label with text content ${expected.textContent} not found`);
      return;
    }

    if (expected.type === 'column' && typeof expected.x !== 'undefined') {
      assert.strictEqual(
          foundLabel.x, expected.x,
          `Expected column line name label ${expected.textContent} to be positioned at ${expected.x}px`);
    }
    if (expected.type === 'row' && typeof expected.y !== 'undefined') {
      assert.strictEqual(
          foundLabel.y, expected.y,
          `Expected row line name label ${expected.textContent} to be positioned at ${expected.y}px`);
    }
  }
}

export function drawGridAreaNamesAndAssertLabels(
    areaNames: AreaBounds[], writingModeMatrix: DOMMatrix|undefined, writingMode: string|undefined,
    expectedLabels: ExpectedAreaNameLabel[]) {
  const el = getGridAreaNameLabelContainer();
  drawGridAreaNames(el, areaNames, writingModeMatrix, writingMode);

  const labels = el.querySelectorAll(`.${GRID_LINE_AREA_LABEL_CONTAINER_CLASS} .grid-label-content`);
  assert.strictEqual(labels.length, expectedLabels.length, 'The right total number of area name labels were displayed');
  assertElements(labels, HTMLElement);

  const foundLabels: ExpectedAreaNameLabel[] = [];
  labels.forEach(label => {
    foundLabels.push({
      textContent: label.textContent || '',
      top: label.style.top,
      left: label.style.left,
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
      const labels = el.querySelectorAll(
          `.${GRID_LINE_NUMBER_LABEL_CONTAINER_CLASS} .grid-label-content.${CSS.escape(className)}`);
      assert.strictEqual(labels.length, count, `Expected ${count} labels to be displayed for ${className}`);
      totalLabelCount += count;
    }
  }

  const mainLayerEl = getMainGridLabelContainer();
  assert.strictEqual(
      mainLayerEl.querySelectorAll(`.${GRID_LINE_NUMBER_LABEL_CONTAINER_CLASS} .grid-label-content`).length,
      totalLabelCount, 'The right total number of line number labels were displayed');
}
