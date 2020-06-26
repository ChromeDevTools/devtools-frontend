// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {assertNotNull} from '../helpers/DOMHelpers.js';
import {drawGridNumbersAndAssertLabels, getGridLabelContainer, initFrameForGridLabels} from '../helpers/InspectorOverlayHelpers.js';
import {drawGridNumbers, _normalizeOffsetData} from '../../../../front_end/inspector_overlay/css_grid_label_helpers.js';

describe('drawGridNumbers label creation', () => {
  beforeEach(initFrameForGridLabels);

  const bounds = {
    minX: 100,
    minY: 100,
    maxX: 200,
    maxY: 200,
  };

  const TESTS = [
    {
      description: 'can display positive row line numbers',
      config: {
        gridHighlightConfig: {
          showPositiveLineNumbers: true,
        },
        positiveRowLineNumberOffsets: [0, 50, 100, 150],
      },
      bounds,
      expectedLabels: [1, 2, 3, 4],
    },
    {
      description: 'can display negative row line numbers',
      config: {
        gridHighlightConfig: {
          showNegativeLineNumbers: true,
        },
        negativeRowLineNumberOffsets: [0, 50, 100, 150],
      },
      bounds,
      expectedLabels: [-4, -3, -2, -1],
    },
    {
      description: 'can display positive column line numbers',
      config: {
        gridHighlightConfig: {
          showPositiveLineNumbers: true,
        },
        positiveColumnLineNumberOffsets: [0, 50, 100],
      },
      bounds,
      expectedLabels: [1, 2, 3],
    },
    {
      description: 'can display negative column line numbers',
      config: {
        gridHighlightConfig: {
          showNegativeLineNumbers: true,
        },
        negativeColumnLineNumberOffsets: [0, 50, 100],
      },
      bounds,
      expectedLabels: [-3, -2, -1],
    },
    {
      description: 'can display all line numbers',
      config: {
        gridHighlightConfig: {
          showPositiveLineNumbers: true,
          showNegativeLineNumbers: true,
        },
        positiveColumnLineNumberOffsets: [0, 50, 100],
        positiveRowLineNumberOffsets: [0, 50, 100, 150],
        negativeColumnLineNumberOffsets: [0, 50, 100],
        negativeRowLineNumberOffsets: [0, 50, 100, 150],
      },
      bounds,
      expectedLabels: [1, 2, 3, 1, 2, 3, 4, -3, -2, -1, -4, -3, -2, -1],
    },
  ];

  for (const {description, config, bounds, expectedLabels} of TESTS) {
    it(description, () => {
      drawGridNumbers(config, bounds);

      const el = getGridLabelContainer();
      assertNotNull(el);

      assert.strictEqual(el.children.length, expectedLabels.length, 'The right number of labels got created');
      assert.strictEqual(el.textContent, expectedLabels.join(''), 'The labels text is correct');
    });
  }
});

describe('drawGridNumbers label placement', () => {
  beforeEach(initFrameForGridLabels);

  const bounds = {
    minX: 100,
    maxX: 300,
    minY: 100,
    maxY: 300,
  };

  const TESTS = [
    {
      description: 'places row labels left and right under normal conditions',
      config: {
        gridHighlightConfig: {
          showPositiveLineNumbers: true,
          showNegativeLineNumbers: true,
        },
        positiveRowLineNumberOffsets: [40, 80, 120, 160],
        negativeRowLineNumberOffsets: [40, 80, 120, 160],
      },
      bounds,
      expectedLabels: [
        {className: 'left-mid', count: 4},
        {className: 'right-mid', count: 4},
      ],
    },
    {
      description: 'places column labels top and bottom under normal conditions',
      config: {
        gridHighlightConfig: {
          showPositiveLineNumbers: true,
          showNegativeLineNumbers: true,
        },
        positiveColumnLineNumberOffsets: [40, 80, 120, 160],
        negativeColumnLineNumberOffsets: [40, 80, 120, 160],
      },
      bounds,
      expectedLabels: [
        {className: 'top-mid', count: 4},
        {className: 'bottom-mid', count: 4},
      ],
    },
    {
      description: 'shifts the first row label down when the first column also has a label',
      config: {
        gridHighlightConfig: {
          showPositiveLineNumbers: true,
        },
        positiveRowLineNumberOffsets: [0, 40],
        positiveColumnLineNumberOffsets: [0, 40],
      },
      bounds,
      expectedLabels: [
        {className: 'bottom-mid', count: 2},
        {className: 'right-top', count: 1},
        {className: 'right-mid', count: 1},
      ],
    },
    {
      description: 'moves positive row labels inside the grid when they are too close to the edge',
      config: {
        gridHighlightConfig: {showPositiveLineNumbers: true},
        positiveRowLineNumberOffsets: [20, 40],
      },
      bounds: {
        minX: 5,
        maxX: 995,
        minY: 100,
        maxY: 200,
      },
      expectedLabels: [
        {className: 'left-mid', count: 2},
      ],
    },
    {
      description: 'moves negative row labels inside the grid when they are too close to the edge',
      config: {
        gridHighlightConfig: {showNegativeLineNumbers: true},
        negativeRowLineNumberOffsets: [20, 40],
      },
      bounds: {
        minX: 5,
        maxX: 995,
        minY: 100,
        maxY: 200,
      },
      expectedLabels: [
        {className: 'right-mid', count: 2},
      ],
    },
    {
      description: 'moves positive column labels inside the grid when they are too close to the edge',
      config: {
        gridHighlightConfig: {showPositiveLineNumbers: true},
        positiveColumnLineNumberOffsets: [20, 40],
      },
      bounds: {
        minX: 100,
        maxX: 200,
        minY: 5,
        maxY: 995,
      },
      expectedLabels: [
        {className: 'top-mid', count: 2},
      ],
    },
    {
      description: 'moves negative column labels inside the grid when they are too close to the edge',
      config: {
        gridHighlightConfig: {showNegativeLineNumbers: true},
        negativeColumnLineNumberOffsets: [20, 40],
      },
      bounds: {
        minX: 100,
        maxX: 200,
        minY: 5,
        maxY: 995,
      },
      expectedLabels: [
        {className: 'bottom-mid', count: 2},
      ],
    },
  ];

  for (const {description, config, bounds, expectedLabels} of TESTS) {
    it(description, () => drawGridNumbersAndAssertLabels(config, bounds, expectedLabels));
  }
});

describe('drawGridNumbers inner-grid label placement', () => {
  beforeEach(initFrameForGridLabels);

  // Making a grid bounds object that's the size of the viewport so all labels flip inside the grid.
  const bounds = {
    minX: 0,
    maxX: 1000,
    minY: 0,
    maxY: 1000,
  };

  const TESTS = [
    {
      description: 'flips positive row labels inside the grid',
      config: {
        gridHighlightConfig: {
          showPositiveLineNumbers: true,
        },
        positiveRowLineNumberOffsets: [0, 500, 1000],
      },
      bounds,
      expectedLabels: [
        {className: 'left-top', count: 1},
        {className: 'left-mid', count: 1},
        {className: 'left-bottom', count: 1},
      ],
    },
    {
      description: 'flips negative row labels inside the grid',
      config: {
        gridHighlightConfig: {
          showNegativeLineNumbers: true,
        },
        negativeRowLineNumberOffsets: [0, 500, 1000],
      },
      bounds,
      expectedLabels: [
        {className: 'right-top', count: 1},
        {className: 'right-mid', count: 1},
        {className: 'right-bottom', count: 1},
      ],
    },
    {
      description: 'flips positive column labels inside the grid',
      config: {
        gridHighlightConfig: {
          showPositiveLineNumbers: true,
        },
        positiveColumnLineNumberOffsets: [0, 500, 1000],
      },
      bounds,
      expectedLabels: [
        {className: 'top-left', count: 1},
        {className: 'top-mid', count: 1},
        {className: 'top-right', count: 1},
      ],
    },
    {
      description: 'flips negative column labels inside the grid',
      config: {
        gridHighlightConfig: {
          showNegativeLineNumbers: true,
        },
        negativeColumnLineNumberOffsets: [0, 500, 1000],
      },
      bounds,
      expectedLabels: [
        {className: 'bottom-left', count: 1},
        {className: 'bottom-mid', count: 1},
        {className: 'bottom-right', count: 1},
      ],
    },
  ];

  for (const {description, config, bounds, expectedLabels} of TESTS) {
    it(description, () => drawGridNumbersAndAssertLabels(config, bounds, expectedLabels));
  }
});

describe('drawGridNumbers label skipping logic', () => {
  beforeEach(initFrameForGridLabels);

  it('skips labels on all sides when they are too close to each other', () => {
    drawGridNumbersAndAssertLabels(
        {
          gridHighlightConfig: {
            showPositiveLineNumbers: true,
            showNegativeLineNumbers: true,
          },
          positiveRowLineNumberOffsets: [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200],
          negativeRowLineNumberOffsets: [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200],
          positiveColumnLineNumberOffsets: [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200],
          negativeColumnLineNumberOffsets: [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200],
        },
        {
          minX: 100,
          maxX: 300,
          minY: 100,
          maxY: 300,
        },
        [
          // Expecting every other positive column labels.
          {className: 'bottom-mid', count: 6},
          // Expecting every other negative column labels.
          {className: 'top-mid', count: 6},
          // Expecting every other positive row labels, except the first and last which are set to avoid
          // column labels.
          {className: 'right-mid', count: 4},
          // Expected the first and last positive row labels.
          {className: 'right-top', count: 1},
          {className: 'right-bottom', count: 1},
          // Expecting every other negative row labels, except the first and last which are set to avoid
          // column labels.
          {className: 'left-mid', count: 4},
          // Expected the first and last negative row labels.
          {className: 'left-top', count: 1},
          {className: 'left-bottom', count: 1},
        ]);
  });
});

describe('_normalizeOffsetData', () => {
  it('returns an object with default values', () => {
    const data = _normalizeOffsetData({}, {minX: 0, maxX: 100, minY: 0, maxY: 100});
    assert.deepStrictEqual(data, {
      bounds: {
        minX: 0,
        maxX: 100,
        minY: 0,
        maxY: 100,
        width: 100,
        height: 100,
      },
      rows: {
        positive: {
          offsets: [],
          hasFirst: false,
          hasLast: false,
        },
        negative: {
          offsets: [],
          hasFirst: false,
          hasLast: false,
        },
      },
      columns: {
        positive: {
          offsets: [],
          hasFirst: false,
          hasLast: false,
        },
        negative: {
          offsets: [],
          hasFirst: false,
          hasLast: false,
        },
      },
    });
  });

  it('rounds offsets', () => {
    const data = _normalizeOffsetData(
        {
          positiveRowLineNumberOffsets: [1.54, 5.89, 10, 123.7564353278],
          negativeRowLineNumberOffsets: [3, 6.3265, 28.463532, 50],
          positiveColumnLineNumberOffsets: [0.654535365378, 1.1323256, 1.896057],
          negativeColumnLineNumberOffsets: [2, 6, 10.564543],
        },
        {minX: 0, maxX: 100, minY: 0, maxY: 100});

    assert.deepStrictEqual(data.rows.positive.offsets, [2, 6, 10, 124]);
    assert.deepStrictEqual(data.rows.negative.offsets, [3, 6, 28, 50]);
    assert.deepStrictEqual(data.columns.positive.offsets, [1, 1, 2]);
    assert.deepStrictEqual(data.columns.negative.offsets, [2, 6, 11]);
  });

  it('detects first and last offsets', () => {
    const data = _normalizeOffsetData(
        {
          positiveRowLineNumberOffsets: [0, 10, 20],
          negativeRowLineNumberOffsets: [10, 20, 30],
          positiveColumnLineNumberOffsets: [10, 20],
          negativeColumnLineNumberOffsets: [0, 30],
        },
        {minX: 0, maxX: 30, minY: 0, maxY: 30});

    assert.isTrue(data.rows.positive.hasFirst);
    assert.isFalse(data.rows.positive.hasLast);
    assert.isFalse(data.rows.negative.hasFirst);
    assert.isTrue(data.rows.negative.hasLast);
    assert.isFalse(data.columns.positive.hasFirst);
    assert.isFalse(data.columns.positive.hasLast);
    assert.isTrue(data.columns.negative.hasFirst);
    assert.isTrue(data.columns.negative.hasLast);
  });
});
