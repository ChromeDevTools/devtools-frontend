// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  drawGridLineNumbers,
  drawGridTrackSizes,
  generateLegibleTextColor,
  normalizePositionData,
} from './css_grid_label_helpers.js';
import {
  drawGridAreaNamesAndAssertLabels,
  drawGridLineNamesAndAssertLabels,
  drawGridLineNumbersAndAssertLabels,
  drawMultipleGridLineNumbersAndAssertLabels,
  getGridLineNumberLabelContainer,
  getGridTrackSizesLabelContainer,
  initFrameForGridLabels,
  initFrameForMultipleGridLabels,
} from './testing/InspectorOverlayHelpers.js';

describe('drawGridLineNumbers label creation', () => {
  beforeEach(initFrameForGridLabels);

  const bounds = {
    minX: 100,
    minY: 100,
    maxX: 200,
    maxY: 200,
    allPoints: [{x: 100, y: 100}, {x: 200, y: 100}, {x: 200, y: 200}, {x: 100, y: 200}],
  };

  const TESTS = [
    {
      description: 'can display positive row line numbers',
      config: {
        positiveRowLineNumberPositions: [{x: 0, y: 0}, {x: 0, y: 50}, {x: 0, y: 100}, {x: 0, y: 150}],
      },
      bounds,
      expectedLabels: [1, 2, 3, 4],
    },
    {
      description: 'can display negative row line numbers',
      config: {
        negativeRowLineNumberPositions: [{x: 0, y: 0}, {x: 0, y: 50}, {x: 0, y: 100}, {x: 0, y: 150}],
      },
      bounds,
      expectedLabels: [-4, -3, -2, -1],
    },
    {
      description: 'can display positive column line numbers',
      config: {
        positiveColumnLineNumberPositions: [{x: 0, y: 0}, {x: 50, y: 0}, {x: 100, y: 0}],
      },
      bounds,
      expectedLabels: [1, 2, 3],
    },
    {
      description: 'can display negative column line numbers',
      config: {
        negativeColumnLineNumberPositions: [{x: 0, y: 0}, {x: 50, y: 0}, {x: 100, y: 0}],
      },
      bounds,
      expectedLabels: [-3, -2, -1],
    },
    {
      description: 'can display all line numbers',
      config: {
        positiveColumnLineNumberPositions: [{x: 0, y: 0}, {x: 50, y: 0}, {x: 100, y: 0}],
        positiveRowLineNumberPositions: [{x: 0, y: 0}, {x: 0, y: 50}, {x: 0, y: 100}, {x: 0, y: 150}],
        negativeColumnLineNumberPositions: [{x: 0, y: 0}, {x: 50, y: 0}, {x: 100, y: 0}],
        negativeRowLineNumberPositions: [{x: 0, y: 0}, {x: 0, y: 50}, {x: 0, y: 100}, {x: 0, y: 150}],
      },
      bounds,
      expectedLabels: [1, 2, 3, 1, 2, 3, 4, -3, -2, -1, -4, -3, -2, -1],
    },
  ];

  for (const {description, config, bounds, expectedLabels} of TESTS) {
    it(description, () => {
      const el = getGridLineNumberLabelContainer();
      const data = normalizePositionData(config, bounds);
      drawGridLineNumbers(el, data, {canvasWidth: 800, canvasHeight: 600}, 1);

      assert.strictEqual(el.children.length, expectedLabels.length, 'The right number of labels got created');
      assert.strictEqual(el.textContent, expectedLabels.join(''), 'The labels text is correct');
    });
  }
});

describe('drawGridLineNumbers label placement', () => {
  beforeEach(initFrameForGridLabels);

  const bounds = {
    minX: 100,
    maxX: 300,
    minY: 100,
    maxY: 300,
    allPoints: [{x: 100, y: 100}, {x: 300, y: 100}, {x: 300, y: 300}, {x: 100, y: 300}],
  };

  const TESTS = [
    {
      description: 'places row labels left and right under normal conditions',
      config: {
        positiveRowLineNumberPositions: [{x: 100, y: 140}, {x: 100, y: 180}, {x: 100, y: 220}, {x: 100, y: 260}],
        negativeRowLineNumberPositions: [{x: 300, y: 140}, {x: 300, y: 180}, {x: 300, y: 220}, {x: 300, y: 260}],
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
        positiveColumnLineNumberPositions: [{x: 140, y: 100}, {x: 180, y: 100}, {x: 220, y: 100}, {x: 260, y: 100}],
        negativeColumnLineNumberPositions: [{x: 140, y: 300}, {x: 180, y: 300}, {x: 220, y: 300}, {x: 260, y: 300}],
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
        positiveRowLineNumberPositions: [{x: 100, y: 100}, {x: 100, y: 140}],
        positiveColumnLineNumberPositions: [{x: 100, y: 100}, {x: 140, y: 100}],
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
        positiveRowLineNumberPositions: [{x: 0, y: 20}, {x: 0, y: 40}],
      },
      bounds: {
        minX: 5,
        maxX: 995,
        minY: 100,
        maxY: 200,
        allPoints: [{x: 5, y: 100}, {x: 995, y: 100}, {x: 995, y: 200}, {x: 5, y: 200}],
      },
      expectedLabels: [
        {className: 'left-mid', count: 2},
      ],
    },
    {
      description: 'moves negative row labels inside the grid when they are too close to the edge',
      config: {
        negativeRowLineNumberPositions: [{x: 995, y: 120}, {x: 995, y: 140}],
      },
      bounds: {
        minX: 5,
        maxX: 995,
        minY: 100,
        maxY: 200,
        allPoints: [{x: 5, y: 100}, {x: 995, y: 100}, {x: 995, y: 200}, {x: 5, y: 200}],
      },
      expectedLabels: [
        {className: 'right-mid', count: 2},
      ],
    },
    {
      description: 'moves positive column labels inside the grid when they are too close to the edge',
      config: {
        positiveColumnLineNumberPositions: [{x: 20, y: 0}, {x: 40, y: 0}],
      },
      bounds: {
        minX: 100,
        maxX: 200,
        minY: 5,
        maxY: 995,
        allPoints: [{x: 100, y: 5}, {x: 200, y: 5}, {x: 200, y: 995}, {x: 100, y: 995}],
      },
      expectedLabels: [
        {className: 'top-mid', count: 2},
      ],
    },
    {
      description: 'moves negative column labels inside the grid when they are too close to the edge',
      config: {
        negativeColumnLineNumberPositions: [{x: 20, y: 995}, {x: 40, y: 995}],
      },
      bounds: {
        minX: 100,
        maxX: 200,
        minY: 5,
        maxY: 995,
        allPoints: [{x: 100, y: 5}, {x: 200, y: 5}, {x: 200, y: 995}, {x: 100, y: 995}],
      },
      expectedLabels: [
        {className: 'bottom-mid', count: 2},
      ],
    },
  ];

  for (const {description, config, bounds, expectedLabels} of TESTS) {
    it(description,
       () => drawGridLineNumbersAndAssertLabels(
           config, bounds, {canvasWidth: 800, canvasHeight: 600}, 0, expectedLabels));
  }
});

describe('drawGridLineNumbers inner-grid label placement', () => {
  beforeEach(initFrameForGridLabels);

  // Making a grid bounds object that's the size of the viewport so all labels flip inside the grid.
  const bounds = {
    minX: 0,
    maxX: 1000,
    minY: 0,
    maxY: 1000,
    allPoints: [{x: 0, y: 0}, {x: 1000, y: 0}, {x: 1000, y: 1000}, {x: 0, y: 1000}],
  };

  const TESTS = [
    {
      description: 'flips positive row labels inside the grid',
      config: {
        positiveRowLineNumberPositions: [{x: 0, y: 0}, {x: 0, y: 500}, {x: 0, y: 1000}],
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
        negativeRowLineNumberPositions: [{x: 1000, y: 0}, {x: 1000, y: 500}, {x: 1000, y: 1000}],
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
        positiveColumnLineNumberPositions: [{x: 0, y: 0}, {x: 500, y: 0}, {x: 1000, y: 0}],
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
        negativeColumnLineNumberPositions: [{x: 0, y: 1000}, {x: 500, y: 1000}, {x: 1000, y: 1000}],
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
    it(description,
       () => drawGridLineNumbersAndAssertLabels(
           config, bounds, {canvasWidth: 800, canvasHeight: 600}, 0, expectedLabels));
  }
});

describe('drawGridLineNumbers label skipping logic', () => {
  beforeEach(initFrameForGridLabels);

  it('skips labels on all sides when they are too close to each other', () => {
    drawGridLineNumbersAndAssertLabels(
        {
          positiveRowLineNumberPositions:
              [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200].map(y => ({x: 100, y: y + 100})),
          negativeRowLineNumberPositions:
              [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200].map(y => ({x: 300, y: y + 100})),
          positiveColumnLineNumberPositions:
              [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200].map(x => ({y: 100, x: x + 100})),
          negativeColumnLineNumberPositions:
              [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200].map(x => ({y: 300, x: x + 100})),
        },
        {
          minX: 100,
          maxX: 300,
          minY: 100,
          maxY: 300,
          allPoints: [{x: 100, y: 100}, {x: 300, y: 100}, {x: 300, y: 300}, {x: 100, y: 300}],
        },
        {
          canvasWidth: 800,
          canvasHeight: 600,
        },
        0, [
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

describe('drawGridLineNumbers label placement with vertical writing mode', () => {
  beforeEach(initFrameForGridLabels);

  const bounds = {
    minX: 100,
    maxX: 300,
    minY: 100,
    maxY: 300,
    allPoints: [{x: 100, y: 100}, {x: 300, y: 100}, {x: 300, y: 300}, {x: 100, y: 300}],
  };

  const TESTS = [
    {
      description: 'vertical-lr positive row labels should be displayed at the top of the grid',
      config: {
        writingMode: 'vertical-lr',
        positiveRowLineNumberPositions: [{x: 100, y: 140}, {x: 100, y: 180}, {x: 100, y: 220}, {x: 100, y: 260}],
      },
      bounds,
      expectedLabels: [
        {className: 'bottom-mid', count: 4},
      ],
    },
    {
      description: 'vertical-lr positive column labels should be displayed left of the grid',
      config: {
        writingMode: 'vertical-lr',
        positiveColumnLineNumberPositions: [{x: 140, y: 100}, {x: 180, y: 100}, {x: 220, y: 100}, {x: 260, y: 100}],
      },
      bounds,
      expectedLabels: [
        {className: 'right-mid', count: 4},
      ],
    },
    {
      description: 'vertical-lr negative row labels should be displayed at the bottom of the grid',
      config: {
        writingMode: 'vertical-lr',
        negativeRowLineNumberPositions: [{x: 300, y: 140}, {x: 300, y: 180}, {x: 300, y: 220}, {x: 300, y: 260}],
      },
      bounds,
      expectedLabels: [
        {className: 'top-mid', count: 4},
      ],
    },
    {
      description: 'vertical-lr negative column labels should be displayed right of the grid',
      config: {
        writingMode: 'vertical-lr',
        negativeColumnLineNumberPositions: [{x: 140, y: 300}, {x: 180, y: 300}, {x: 220, y: 300}, {x: 260, y: 300}],
      },
      bounds,
      expectedLabels: [
        {className: 'left-mid', count: 4},
      ],
    },

    {
      description: 'vertical-rl positive row labels should be displayed at the top of the grid',
      config: {
        writingMode: 'vertical-rl',
        positiveRowLineNumberPositions: [{x: 100, y: 140}, {x: 100, y: 180}, {x: 100, y: 220}, {x: 100, y: 260}],
      },
      bounds,
      expectedLabels: [
        {className: 'bottom-mid', count: 4},
      ],
    },
    {
      description: 'vertical-rl positive column labels should be displayed right of the grid',
      config: {
        writingMode: 'vertical-rl',
        positiveColumnLineNumberPositions: [{x: 140, y: 100}, {x: 180, y: 100}, {x: 220, y: 100}, {x: 260, y: 100}],
      },
      bounds,
      expectedLabels: [
        {className: 'left-mid', count: 4},
      ],
    },
    {
      description: 'vertical-rl negative row labels should be displayed at the bottom of the grid',
      config: {
        writingMode: 'vertical-rl',
        negativeRowLineNumberPositions: [{x: 300, y: 140}, {x: 300, y: 180}, {x: 300, y: 220}, {x: 300, y: 260}],
      },
      bounds,
      expectedLabels: [
        {className: 'top-mid', count: 4},
      ],
    },
    {
      description: 'vertical-rl negative column labels should be displayed left of the grid',
      config: {
        writingMode: 'vertical-rl',
        negativeColumnLineNumberPositions: [{x: 140, y: 300}, {x: 180, y: 300}, {x: 220, y: 300}, {x: 260, y: 300}],
      },
      bounds,
      expectedLabels: [
        {className: 'right-mid', count: 4},
      ],
    },

    {
      description: 'sideways-lr positive row labels should be displayed at the bottom of the grid',
      config: {
        writingMode: 'sideways-lr',
        positiveRowLineNumberPositions: [{x: 100, y: 140}, {x: 100, y: 180}, {x: 100, y: 220}, {x: 100, y: 260}],
      },
      bounds,
      expectedLabels: [
        {className: 'top-mid', count: 4},
      ],
    },
    {
      description: 'sideways-lr positive column labels should be displayed left of the grid',
      config: {
        writingMode: 'sideways-lr',
        positiveColumnLineNumberPositions: [{x: 140, y: 100}, {x: 180, y: 100}, {x: 220, y: 100}, {x: 260, y: 100}],
      },
      bounds,
      expectedLabels: [
        {className: 'right-mid', count: 4},
      ],
    },
    {
      description: 'sideways-lr negative row labels should be displayed at the top of the grid',
      config: {
        writingMode: 'sideways-lr',
        negativeRowLineNumberPositions: [{x: 300, y: 140}, {x: 300, y: 180}, {x: 300, y: 220}, {x: 300, y: 260}],
      },
      bounds,
      expectedLabels: [
        {className: 'bottom-mid', count: 4},
      ],
    },
    {
      description: 'sideways-lr negative column labels should be displayed right of the grid',
      config: {
        writingMode: 'sideways-lr',
        negativeColumnLineNumberPositions: [{x: 140, y: 300}, {x: 180, y: 300}, {x: 220, y: 300}, {x: 260, y: 300}],
      },
      bounds,
      expectedLabels: [
        {className: 'left-mid', count: 4},
      ],
    },

    {
      description: 'sideways-rl positive row labels should be displayed at the top of the grid',
      config: {
        writingMode: 'sideways-rl',
        positiveRowLineNumberPositions: [{x: 100, y: 140}, {x: 100, y: 180}, {x: 100, y: 220}, {x: 100, y: 260}],
      },
      bounds,
      expectedLabels: [
        {className: 'bottom-mid', count: 4},
      ],
    },
    {
      description: 'sideways-rl positive column labels should be displayed right of the grid',
      config: {
        writingMode: 'sideways-rl',
        positiveColumnLineNumberPositions: [{x: 140, y: 100}, {x: 180, y: 100}, {x: 220, y: 100}, {x: 260, y: 100}],
      },
      bounds,
      expectedLabels: [
        {className: 'left-mid', count: 4},
      ],
    },
    {
      description: 'sideways-rl negative row labels should be displayed at the bottom of the grid',
      config: {
        writingMode: 'sideways-rl',
        negativeRowLineNumberPositions: [{x: 300, y: 140}, {x: 300, y: 180}, {x: 300, y: 220}, {x: 300, y: 260}],
      },
      bounds,
      expectedLabels: [
        {className: 'top-mid', count: 4},
      ],
    },
    {
      description: 'sideways-rl negative column labels should be displayed left of the grid',
      config: {
        writingMode: 'sideways-rl',
        negativeColumnLineNumberPositions: [{x: 140, y: 300}, {x: 180, y: 300}, {x: 220, y: 300}, {x: 260, y: 300}],
      },
      bounds,
      expectedLabels: [
        {className: 'right-mid', count: 4},
      ],
    },
  ];

  for (const {description, config, bounds, expectedLabels} of TESTS) {
    it(description,
       () => drawGridLineNumbersAndAssertLabels(
           config, bounds, {canvasWidth: 800, canvasHeight: 600}, 0, expectedLabels));
  }
});

describe('normalizePositionData', () => {
  it('returns an object with default values', () => {
    const data = normalizePositionData({}, {
      minX: 0,
      maxX: 100,
      minY: 0,
      maxY: 100,
      allPoints: [{x: 0, y: 0}, {x: 100, y: 0}, {x: 100, y: 100}, {x: 0, y: 100}],
    });

    assert.deepStrictEqual(data, {
      bounds: {
        minX: 0,
        maxX: 100,
        minY: 0,
        maxY: 100,
        width: 100,
        height: 100,
        allPoints: [{x: 0, y: 0}, {x: 100, y: 0}, {x: 100, y: 100}, {x: 0, y: 100}],
      },
      rows: {
        positive: {
          positions: [],
          hasFirst: false,
          hasLast: false,
        },
        negative: {
          positions: [],
          hasFirst: false,
          hasLast: false,
        },
      },
      columns: {
        positive: {
          positions: [],
          hasFirst: false,
          hasLast: false,
        },
        negative: {
          positions: [],
          hasFirst: false,
          hasLast: false,
        },
      },
    });
  });

  it('rounds positions', () => {
    const data = normalizePositionData(
        {
          positiveRowLineNumberPositions: [{y: 1.54, x: 0}, {y: 5.89, x: 0}, {y: 10, x: 0}, {y: 123.7564353278, x: 0}],
          negativeRowLineNumberPositions: [{y: 3, x: 0}, {y: 6.3265, x: 0}, {y: 28.463532, x: 0}, {y: 50, x: 0}],
          positiveColumnLineNumberPositions: [{x: 0.654535365378, y: 0}, {x: 1.1323256, y: 0}, {x: 1.896057, y: 0}],
          negativeColumnLineNumberPositions: [{x: 2, y: 0}, {x: 6, y: 0}, {x: 10.564543, y: 0}],
        },
        {
          minX: 0,
          maxX: 100,
          minY: 0,
          maxY: 100,
          allPoints: [{x: 0, y: 0}, {x: 100, y: 0}, {x: 100, y: 100}, {x: 0, y: 100}],
        });

    assert.deepStrictEqual(data.rows.positive.positions.map(p => p.y), [2, 6, 10, 124]);
    assert.deepStrictEqual(data.rows.negative.positions.map(p => p.y), [3, 6, 28, 50]);
    assert.deepStrictEqual(data.columns.positive.positions.map(p => p.x), [1, 1, 2]);
    assert.deepStrictEqual(data.columns.negative.positions.map(p => p.x), [2, 6, 11]);
  });

  it('detects first and last positions', () => {
    const data = normalizePositionData(
        {
          positiveRowLineNumberPositions: [{y: 0, x: 0}, {y: 10, x: 0}, {y: 20, x: 0}],
          negativeRowLineNumberPositions: [{y: 10, x: 30}, {y: 20, x: 30}, {y: 30, x: 30}],
          positiveColumnLineNumberPositions: [{x: 10, y: 0}, {x: 20, y: 0}],
          negativeColumnLineNumberPositions: [{x: 0, y: 30}, {x: 30, y: 30}],
        },
        {
          minX: 0,
          maxX: 30,
          minY: 0,
          maxY: 30,
          allPoints: [{x: 0, y: 0}, {x: 30, y: 0}, {x: 30, y: 30}, {x: 0, y: 30}],
        });

    assert.isTrue(data.rows.positive.hasFirst);
    assert.isFalse(data.rows.positive.hasLast);
    assert.isFalse(data.rows.negative.hasFirst);
    assert.isTrue(data.rows.negative.hasLast);
    assert.isFalse(data.columns.positive.hasFirst);
    assert.isFalse(data.columns.positive.hasLast);
    assert.isTrue(data.columns.negative.hasFirst);
    assert.isTrue(data.columns.negative.hasLast);
  });

  it('prefers line names over line numbers when present', () => {
    const data = normalizePositionData(
        {
          gridHighlightConfig: {showLineNames: true},
          positiveRowLineNumberPositions: [{x: 0, y: 10}, {x: 0, y: 20}, {x: 0, y: 30}],
          positiveColumnLineNumberPositions: [{x: 10, y: 0}, {x: 20, y: 0}, {x: 30, y: 0}],
          rowLineNameOffsets: [{name: 'foo', x: 0, y: 10}],
          columnLineNameOffsets: [{name: 'bar', x: 10, y: 0}, {name: 'baz', x: 20, y: 0}],
        },
        {
          minX: 0,
          maxX: 30,
          minY: 0,
          maxY: 30,
          allPoints: [{x: 0, y: 0}, {x: 30, y: 0}, {x: 30, y: 30}, {x: 0, y: 30}],
        });

    assert.strictEqual(data.rows.negative.positions.length, 0);
    assert.strictEqual(data.columns.negative.positions.length, 0);
    assert.strictEqual(
        data.rows.positive.positions.length, 1, 'There should be only one row offset since there is only one name');
    assert.strictEqual(
        data.columns.positive.positions.length, 2, 'There should be 2 column offsets since there are 2 names');
  });

  it('returns the correct line name structure', () => {
    const data = normalizePositionData(
        {
          gridHighlightConfig: {showLineNames: true},
          rowLineNameOffsets: [
            {name: 'foo', x: 0, y: 5},
            {name: 'bar', x: 0, y: 5},
            {name: 'test', x: 0, y: 20},
            {name: 'baz', x: 0, y: 5},
          ],
          columnLineNameOffsets: [
            {name: 'edge-start', x: 15, y: 0},
            {name: 'edge-end', x: 17, y: 0},
          ],
        },
        {
          minX: 0,
          maxX: 30,
          minY: 0,
          maxY: 30,
          allPoints: [{x: 0, y: 0}, {x: 30, y: 0}, {x: 30, y: 30}, {x: 0, y: 30}],
        });

    assert.deepStrictEqual(data.rows.positive.positions, [{x: 0, y: 5}, {x: 0, y: 20}]);
    assert.deepStrictEqual(data.rows.positive.names, [['foo', 'bar', 'baz'], ['test']]);
    assert.deepStrictEqual(data.columns.positive.positions, [{x: 15, y: 0}, {x: 17, y: 0}]);
    assert.deepStrictEqual(data.columns.positive.names, [['edge-start'], ['edge-end']]);
  });
});

describe('drawGridAreaNames', () => {
  beforeEach(initFrameForGridLabels);

  const TESTS = [
    {
      description: 'does not create labels when not needed',
      areaBounds: [],
      expectedLabels: [],
    },
    {
      description: 'creates the necessary number of area labels',
      areaBounds: [
        {
          name: 'foo',
          bounds: {allPoints: [{x: 0, y: 0}, {x: 10, y: 0}, {x: 10, y: 10}, {x: 0, y: 10}]},
        },
        {
          name: 'bar',
          bounds: {allPoints: [{x: 0, y: 0}, {x: 10, y: 0}, {x: 10, y: 10}, {x: 0, y: 10}]},
        },
      ],
      expectedLabels: [
        {textContent: 'foo'},
        {textContent: 'bar'},
      ],
    },
    {
      description: 'positions area labels correctly',
      areaBounds: [
        {
          name: 'foo',
          bounds: {allPoints: [{x: 125, y: 22}, {x: 225, y: 22}, {x: 225, y: 42}, {x: 125, y: 42}]},
        },
        {
          name: 'bar',
          bounds: {allPoints: [{x: 678, y: 435}, {x: 878, y: 435}, {x: 878, y: 635}, {x: 678, y: 635}]},
        },
      ],
      expectedLabels: [
        {textContent: 'foo', top: '22px', left: '125px'},
        {textContent: 'bar', top: '435px', left: '678px'},
      ],
    },
  ];

  for (const {description, areaBounds, expectedLabels} of TESTS) {
    it(description, () => drawGridAreaNamesAndAssertLabels(areaBounds, undefined, undefined, expectedLabels));
  }
});

describe('drawGridAreaNames  label placement with vertical writing mode', () => {
  beforeEach(initFrameForGridLabels);

  const areaBounds =
      [{name: 'foo', bounds: {allPoints: [{x: 20, y: 30}, {x: 100, y: 30}, {x: 100, y: 50}, {x: 20, y: 50}]}}];
  const TESTS = [
    {
      description: 'positions area labels correctly in vertical-lr writing-mode',
      writingMode: 'vertical-lr',
      areaBounds,
      expectedLabels: [{textContent: 'foo', top: '30px', left: '20px'}],
    },
    {
      description: 'positions area labels correctly in vertical-rl writing-mode',
      writingMode: 'vertical-rl',
      areaBounds,
      expectedLabels: [{textContent: 'foo', top: '50px', left: '20px'}],
    },
    {
      description: 'positions area labels correctly in sideways-lr writing-mode',
      writingMode: 'sideways-lr',
      areaBounds,
      expectedLabels: [{textContent: 'foo', top: '30px', left: '100px'}],
    },
    {
      description: 'positions area labels correctly in sideways-rl writing-mode',
      writingMode: 'sideways-rl',
      areaBounds,
      expectedLabels: [{textContent: 'foo', top: '50px', left: '20px'}],
    },
  ];

  for (const {description, writingMode, areaBounds, expectedLabels} of TESTS) {
    // The way points are transformed using the writingMode matrix isn't what we're interested in testing here, so we
    // just pass the identity matrix to make our life easier.
    it(description, () => drawGridAreaNamesAndAssertLabels(areaBounds, new DOMMatrix(), writingMode, expectedLabels));
  }
});

describe('drawMultipleGridLabels', () => {
  it('can set labels on multiple grid nodes', () => {
    initFrameForMultipleGridLabels(2);
    const bounds = {
      minX: 100,
      maxX: 500,
      minY: 100,
      maxY: 500,
      allPoints: [{x: 100, y: 100}, {x: 500, y: 100}, {x: 500, y: 500}, {x: 100, y: 500}],
    };
    const configs = [
      {
        layerId: 1,
        positiveRowLineNumberPositions: [{x: 100, y: 100}, {x: 100, y: 150}, {x: 100, y: 200}],
      },
      {
        layerId: 2,
        positiveRowLineNumberPositions: [{x: 100, y: 100}, {x: 100, y: 150}, {x: 100, y: 200}],
      },
    ];
    const expectedLayers = [
      {
        layerId: 1,
        expectedLabels: [
          {className: 'right-mid', count: 3},
        ],
      },
      {
        layerId: 2,
        expectedLabels: [
          {className: 'right-mid', count: 3},
        ],
      },
    ];
    drawMultipleGridLineNumbersAndAssertLabels(
        configs.map(config => ({config, layerId: config.layerId})), bounds, {canvasWidth: 800, canvasHeight: 600},
        expectedLayers);
  });
});

describe('drawGridTrackSizes label creation', () => {
  beforeEach(initFrameForGridLabels);

  const TESTS = [
    {
      description: 'can display track sizes',
      config: {
        gridHighlightConfig: {
          showTrackSizes: true,
        },
        columnTrackSizes: [{computedSize: 10, x: 10, y: 0}, {computedSize: 20, x: 20, y: 0}],
        rowTrackSizes: [{computedSize: 10, x: 0, y: 10}, {computedSize: 20, x: 0, y: 20}],
        rotationAngle: 0,
      },
      expectedLabels: ['10px', '20px', '10px', '20px'],
    },
  ];

  for (const {description, config, expectedLabels} of TESTS) {
    it(description, () => {
      const el = getGridTrackSizesLabelContainer();
      drawGridTrackSizes(el, config.rowTrackSizes, 'row', {canvasWidth: 800, canvasHeight: 600}, 1);
      drawGridTrackSizes(el, config.columnTrackSizes, 'column', {canvasWidth: 800, canvasHeight: 600}, 1);
      assert.strictEqual(el.children.length, expectedLabels.length, 'The right number of labels got created');
      assert.strictEqual(el.textContent, expectedLabels.join(''), 'The labels text is correct');
    });
  }
});

describe('drawGridLineNames', () => {
  beforeEach(initFrameForGridLabels);

  const TESTS = [
    {
      description: 'places labels in the right spot',
      rowLineNameOffsets: [
        {x: 100, y: 100, name: 'first-row'},
        {x: 100, y: 200, name: 'second-row'},
        {x: 100, y: 300, name: 'third-row'},
      ],
      columnLineNameOffsets: [
        {x: 100, y: 100, name: 'first-col'},
        {x: 200, y: 100, name: 'second-col'},
        {x: 300, y: 100, name: 'third-col'},
      ],
      expectedLabels: [
        {type: 'row', textContent: 'first-row', y: 100},
        {type: 'row', textContent: 'second-row', y: 199.5},
        {type: 'row', textContent: 'third-row', y: 299.5},
        {type: 'column', textContent: 'first-col', x: 99.5},
        {type: 'column', textContent: 'second-col', x: 199.5},
        {type: 'column', textContent: 'third-col', x: 299.5},
      ],
      deviceEmulationFactor: 1,
    },
    {
      description: 'groups labels together when they are for the same line',
      rowLineNameOffsets: [],
      columnLineNameOffsets: [
        {x: 100, y: 100, name: 'first-col'},
        {x: 100, y: 100, name: 'also-first-col'},
        {x: 200, y: 100, name: 'second-col'},
        {x: 100, y: 100, name: 'and-another-first-col'},
        {x: 200, y: 100, name: 'also-second-col'},
      ],
      expectedLabels: [
        {type: 'column', textContent: 'first-colalso-first-coland-another-first-col'},
        {type: 'column', textContent: 'second-colalso-second-col'},
      ],
      deviceEmulationFactor: 1,
    },
    {
      description: 'places labels in the right spot with emulation factor = 2',
      rowLineNameOffsets: [
        {x: 100, y: 100, name: 'first-row'},
        {x: 100, y: 200, name: 'second-row'},
        {x: 100, y: 300, name: 'third-row'},
      ],
      columnLineNameOffsets: [
        {x: 100, y: 100, name: 'first-col'},
        {x: 200, y: 100, name: 'second-col'},
        {x: 300, y: 100, name: 'third-col'},
      ],
      expectedLabels: [
        {type: 'row', textContent: 'first-row', y: 200},
        {type: 'row', textContent: 'second-row', y: 399.5},
        {type: 'row', textContent: 'third-row', y: 599.5},
        {type: 'column', textContent: 'first-col', x: 199.5},
        {type: 'column', textContent: 'second-col', x: 399.5},
        {type: 'column', textContent: 'third-col', x: 599.5},
      ],
      deviceEmulationFactor: 2,
    },
  ];

  for (const {description, rowLineNameOffsets, columnLineNameOffsets, deviceEmulationFactor, expectedLabels} of TESTS) {
    it(description,
       () => drawGridLineNamesAndAssertLabels(
           {
             gridHighlightConfig: {
               showLineNames: true,
             },
             rowLineNameOffsets,
             columnLineNameOffsets,
           },
           {
             minX: 100,
             maxX: 300,
             minY: 100,
             maxY: 300,
             allPoints: [{x: 100, y: 100}, {x: 300, y: 100}, {x: 300, y: 300}, {x: 100, y: 300}],
           },
           {canvasWidth: 800, canvasHeight: 600}, 0, deviceEmulationFactor, expectedLabels));
  }
});

describe('generateLegibleTextColor', () => {
  it('returns expected colors depending on the background color', () => {
    // black
    assert.strictEqual(generateLegibleTextColor('rgb(0, 0, 0)'), 'white');

    // dark grey
    assert.strictEqual(generateLegibleTextColor('rgb(50, 50, 50)'), 'white');

    // light grey
    assert.strictEqual(generateLegibleTextColor('rgb(200, 200, 200)'), '#121212');

    // white
    assert.strictEqual(generateLegibleTextColor('rgb(255, 255, 255)'), '#121212');

    // several of the default colors (from OverlayColorGenerator.js)
    assert.strictEqual(generateLegibleTextColor('rgb(245, 151, 148)'), '#121212');
    assert.strictEqual(generateLegibleTextColor('rgb(212, 237, 49)'), '#121212');
    assert.strictEqual(generateLegibleTextColor('rgb(91, 209, 215)'), '#121212');
    assert.strictEqual(generateLegibleTextColor('rgb(188, 206, 251)'), '#121212');
    assert.strictEqual(generateLegibleTextColor('rgb(208, 148, 234)'), '#121212');
    assert.strictEqual(generateLegibleTextColor('rgb(235, 148, 207)'), '#121212');
  });

  it('ignores alpha', () => {
    assert.strictEqual(generateLegibleTextColor('rgba(0, 0, 0, 0.8)'), 'white');
  });

  it('returns null for unparsable rgb colors', () => {
    assert.isNull(generateLegibleTextColor('not a color'));
    assert.isNull(generateLegibleTextColor(''));
    assert.isNull(generateLegibleTextColor('rgb(r g b)'));
  });

  it('accepts #hex colors too', () => {
    assert.strictEqual(generateLegibleTextColor('#000000'), 'white');
    assert.strictEqual(generateLegibleTextColor('#FFFFFF'), '#121212');
    assert.strictEqual(generateLegibleTextColor('#a68cf0'), '#121212');
  });
});
