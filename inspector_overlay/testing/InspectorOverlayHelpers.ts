// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {AreaBounds, Bounds} from '../common.js';
import {
  type CanvasSize,
  drawGridAreaNames,
  drawGridLineNames,
  drawGridLineNumbers,
  type GridPositionNormalizedDataWithNames,
  normalizePositionData,
  type NormalizePositionDataConfig,
} from '../css_grid_label_helpers.js';
import {gridStyle} from '../highlight_grid_common.js';

const GRID_LABEL_CONTAINER_ID = 'grid-label-container';
const DEFAULT_GRID_LABEL_LAYER_ID = 'grid-labels';
const GRID_LINE_NUMBER_LABEL_CONTAINER_CLASS = 'line-numbers';
const GRID_LINE_NAME_LABEL_CONTAINER_CLASS = 'line-names';
const GRID_LINE_AREA_LABEL_CONTAINER_CLASS = 'area-names';
const GRID_TRACK_SIZES_LABEL_CONTAINER_CLASS = 'track-sizes';

const TEST_CONTAINER_ID = '__devtools-test-container-id';

interface RenderOptions {
  allowMultipleChildren?: boolean;
}

const renderElementIntoDOM = (element: HTMLElement, renderOptions: RenderOptions = {}) => {
  const container = document.getElementById(TEST_CONTAINER_ID);

  if (!container) {
    throw new Error(`renderElementIntoDOM expects to find ${TEST_CONTAINER_ID}`);
  }

  const allowMultipleChildren = Boolean(renderOptions.allowMultipleChildren);

  if (container.childNodes.length !== 0 && !allowMultipleChildren) {
    throw new Error(`renderElementIntoDOM expects the container to be empty ${container.innerHTML}`);
  }

  container.appendChild(element);
  return element;
};

type Constructor<T> = {
  new (...args: unknown[]): T,
};

function assertElements<T extends Element>(
    nodeList: NodeListOf<Element>, elementClass: Constructor<T>): asserts nodeList is NodeListOf<T> {
  nodeList.forEach(e => assert.instanceOf(e, elementClass));
}

/**
 * This does the same as initFrame but also prepares the DOM for testing grid labels.
 */
export function initFrameForGridLabels() {
  const styleTag = document.createElement('style');
  styleTag.textContent = gridStyle;
  document.head.append(styleTag);
  createGridLabelContainer();
}

export function initFrameForMultipleGridLabels(numGrids: number) {
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
  assert.instanceOf(el, HTMLElement);
  return el;
}

export function getGridLabelContainer(layerId?: number): HTMLElement {
  const id = layerId ? `grid-${layerId}-labels` : DEFAULT_GRID_LABEL_LAYER_ID;
  const el = document.querySelector(`#${GRID_LABEL_CONTAINER_ID} #${CSS.escape(id)}`);
  assert.instanceOf(el, HTMLElement);
  return el;
}

export function getGridLineNumberLabelContainer(layerId?: number): HTMLElement {
  const id = layerId ? `grid-${layerId}-labels` : DEFAULT_GRID_LABEL_LAYER_ID;
  const el = document.querySelector(
      `#${GRID_LABEL_CONTAINER_ID} #${CSS.escape(id)} .${GRID_LINE_NUMBER_LABEL_CONTAINER_CLASS}`);
  assert.instanceOf(el, HTMLElement);
  return el;
}

export function getGridLineNameLabelContainer(layerId?: number): HTMLElement {
  const id = layerId ? `grid-${layerId}-labels` : DEFAULT_GRID_LABEL_LAYER_ID;
  const el =
      document.querySelector(`#${GRID_LABEL_CONTAINER_ID} #${CSS.escape(id)} .${GRID_LINE_NAME_LABEL_CONTAINER_CLASS}`);
  assert.instanceOf(el, HTMLElement);
  return el;
}

export function getGridTrackSizesLabelContainer(layerId?: number): HTMLElement {
  const id = layerId ? `grid-${layerId}-labels` : DEFAULT_GRID_LABEL_LAYER_ID;
  const el = document.querySelector(
      `#${GRID_LABEL_CONTAINER_ID} #${CSS.escape(id)} .${GRID_TRACK_SIZES_LABEL_CONTAINER_CLASS}`);
  assert.instanceOf(el, HTMLElement);
  return el;
}

export function getGridAreaNameLabelContainer(layerId?: number): HTMLElement {
  const id = layerId ? `grid-${layerId}-labels` : DEFAULT_GRID_LABEL_LAYER_ID;
  const el =
      document.querySelector(`#${GRID_LABEL_CONTAINER_ID} #${CSS.escape(id)} .${GRID_LINE_AREA_LABEL_CONTAINER_CLASS}`);
  assert.instanceOf(el, HTMLElement);
  return el;
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
    config: NormalizePositionDataConfig&{writingMode?: string}, bounds: Bounds, canvasSize: CanvasSize, layerId: number,
    expectedLabels: ExpectedLineNumberLabel[]) {
  const el = getGridLineNumberLabelContainer(layerId);
  const data = normalizePositionData(config, bounds);

  // Note that this test helper is focused on testing the number and orientation of the labels, not their exact position
  // so we pass the identity matrix here in all cases, even when a different writing mode is provided.
  drawGridLineNumbers(el, data, canvasSize, 1, new DOMMatrix(), config.writingMode);
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
    config: NormalizePositionDataConfig, bounds: Bounds, canvasSize: CanvasSize, layerId: number,
    deviceEmulationFactor: number, expectedLabels: ExpectedLineNameLabel[]) {
  const el = getGridLineNameLabelContainer(layerId);
  const data = normalizePositionData(config, bounds);
  drawGridLineNames(el, data as GridPositionNormalizedDataWithNames, canvasSize, deviceEmulationFactor);

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
      assert.closeTo(
          foundLabel.x, expected.x, 0.5,
          `Expected column line name label ${expected.textContent} to be positioned at ${expected.x}px`);
    }
    if (expected.type === 'row' && typeof expected.y !== 'undefined') {
      assert.closeTo(
          foundLabel.y, expected.y, 0.5,
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
    configs: Array<{config: NormalizePositionDataConfig, layerId: number}>, bounds: Bounds, canvasSize: CanvasSize,
    expectedLabelList: ExpectedLayerLabel[]) {
  for (const item of configs) {
    const el = getGridLineNumberLabelContainer(item.layerId);
    const data = normalizePositionData(item.config, bounds);
    drawGridLineNumbers(el, data, canvasSize, 1);
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
