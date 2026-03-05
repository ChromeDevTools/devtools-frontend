// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {Position} from './common.js';
import {drawLayoutGridHighlight, type GridHighlight} from './highlight_grid_common.js';
import {getGridAreaNameLabelContainer, initFrameForGridLabels} from './testing/InspectorOverlayHelpers.js';

function createGridHighlight(writingModeRoot?: Position): GridHighlight {
  const areaPath: Array<string|number> = ['M', 100, 100, 'L', 200, 100, 'L', 200, 200, 'L', 100, 200, 'Z'];

  return {
    gridBorder: areaPath,
    writingMode: 'vertical-rl',
    writingModeRoot,
    rowGaps: [],
    rotationAngle: 0,
    columnGaps: [],
    rows: [],
    columns: [],
    areaNames: {foo: areaPath},
    gridHighlightConfig: {
      gridBorderDash: false,
      rowLineDash: false,
      columnLineDash: false,
      showGridExtensionLines: false,
      showPositiveLineNumbers: false,
      showNegativeLineNumbers: false,
      rowLineColor: '',
      columnLineColor: '',
      rowHatchColor: '',
      columnHatchColor: '',
      showLineNames: false,
    },
  };
}

function drawGridAndGetAreaLabel(highlight: GridHighlight): HTMLElement {
  const canvas = document.createElement('canvas');
  canvas.width = 500;
  canvas.height = 500;

  const context = canvas.getContext('2d');
  assert.instanceOf(context, CanvasRenderingContext2D);

  drawLayoutGridHighlight(highlight, context, 1, canvas.width, canvas.height, 1, {gridLayerCounter: 1});

  const areaLabelsContainer = getGridAreaNameLabelContainer(1);
  const label = areaLabelsContainer.querySelector('.grid-label-content');
  assert.exists(label, `Expected area label, container html: ${areaLabelsContainer.innerHTML}`);
  assert.instanceOf(label, HTMLElement);

  return label;
}

describe('drawLayoutGridHighlight', () => {
  beforeEach(initFrameForGridLabels);

  it('positions area labels in vertical-rl mode from grid bounds by default', () => {
    const label = drawGridAndGetAreaLabel(createGridHighlight());

    assert.strictEqual(label.style.left, '100px');
    assert.strictEqual(label.style.top, '100px');
  });

  it('positions area labels in vertical-rl mode from writingModeRoot when provided', () => {
    const label = drawGridAndGetAreaLabel(createGridHighlight({x: 150, y: 100}));

    assert.strictEqual(label.style.left, '150px');
    assert.strictEqual(label.style.top, '50px');
  });
});
