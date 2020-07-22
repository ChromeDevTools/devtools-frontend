// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {drawGridAreaNamesAndAssertLabels, drawGridLineNumbersAndAssertLabels, drawMultipleGridLineNumbersAndAssertLabels, getGridLineNumberLabelContainer, getGridTrackSizesLabelContainer, initFrameForGridLabels, initFrameForMultipleGridLabels} from '../helpers/InspectorOverlayHelpers.js';
import {drawGridLineNumbers, drawGridTrackSizes, _normalizeOffsetData} from '../../../../front_end/inspector_overlay/css_grid_label_helpers.js';

describe('drawGridLineNumbers label creation', () => {
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
      const el = getGridLineNumberLabelContainer();
      const data = _normalizeOffsetData(config, bounds);
      drawGridLineNumbers(el, data);

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
    it(description, () => drawGridLineNumbersAndAssertLabels(config, bounds, expectedLabels));
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
    it(description, () => drawGridLineNumbersAndAssertLabels(config, bounds, expectedLabels));
  }
});

describe('drawGridLineNumbers label skipping logic', () => {
  beforeEach(initFrameForGridLabels);

  it('skips labels on all sides when they are too close to each other', () => {
    drawGridLineNumbersAndAssertLabels(
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
    const data = _normalizeOffsetData({gridHighlightConfig: {}}, {minX: 0, maxX: 100, minY: 0, maxY: 100});
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
          gridHighlightConfig: {},
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
          gridHighlightConfig: {},
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

  it('prefers line names over line numbers when present', () => {
    const data = _normalizeOffsetData(
        {
          gridHighlightConfig: {showLineNames: true},
          positiveRowLineNumberOffsets: [0, 10, 20],
          positiveColumnLineNumberOffsets: [0, 10, 20],
          rowLineNameOffsets: [{name: 'foo', offset: 5}],
          columnLineNameOffsets: [{name: 'bar', offset: 15}, {name: 'baz', offset: 17}],
        },
        {minX: 0, maxX: 30, minY: 0, maxY: 30});

    assert.strictEqual(data.rows.negative.offsets.length, 0);
    assert.strictEqual(data.columns.negative.offsets.length, 0);
    assert.strictEqual(
        data.rows.positive.offsets.length, 1, 'There should be only one row offset since there is only one name');
    assert.strictEqual(
        data.columns.positive.offsets.length, 2, 'There should be 2 column offsets since there are 2 names');
  });

  it('returns the correct line name structure', () => {
    const data = _normalizeOffsetData(
        {
          gridHighlightConfig: {showLineNames: true},
          rowLineNameOffsets: [
            {name: 'foo', offset: 5},
            {name: 'bar', offset: 5},
            {name: 'baz', offset: 5},
            {name: 'test', offset: 20},
          ],
          columnLineNameOffsets: [{name: 'edge-start', offset: 15}, {name: 'edge-end', offset: 17}],
        },
        {minX: 0, maxX: 30, minY: 0, maxY: 30});

    assert.deepStrictEqual(data.rows.positive.offsets, [5, 20]);
    assert.deepStrictEqual(data.rows.positive.names, [['foo', 'bar', 'baz'], ['test']]);
    assert.deepStrictEqual(data.columns.positive.offsets, [15, 17]);
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
          bounds: {minX: 0, maxX: 0, minY: 0, maxY: 0},
        },
        {
          name: 'bar',
          bounds: {minX: 0, maxX: 0, minY: 0, maxY: 0},
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
          bounds: {minX: 125, maxX: 376, minY: 22, maxY: 428},
        },
        {
          name: 'bar',
          bounds: {minX: 678, maxX: 1092, minY: 435, maxY: 450},
        },
      ],
      expectedLabels: [
        {textContent: 'foo', top: '22px', left: '125px'},
        {textContent: 'bar', top: '435px', left: '678px'},
      ],
    },
  ];

  for (const {description, areaBounds, expectedLabels} of TESTS) {
    it(description, () => drawGridAreaNamesAndAssertLabels(areaBounds, expectedLabels));
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
    };
    const configs = [
      {
        layerId: 1,
        gridHighlightConfig: {
          showPositiveLineNumbers: true,
        },
        positiveRowLineNumberOffsets: [0, 50, 100],
      },
      {
        layerId: 2,
        gridHighlightConfig: {
          showPositiveLineNumbers: true,
        },
        positiveRowLineNumberOffsets: [0, 50, 100],
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
    drawMultipleGridLineNumbersAndAssertLabels(configs, bounds, expectedLayers);
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
      drawGridTrackSizes(el, config.rotationAngle, config.rowTrackSizes, 'row');
      drawGridTrackSizes(el, config.rotationAngle, config.columnTrackSizes, 'column');
      assert.strictEqual(el.children.length, expectedLabels.length, 'The right number of labels got created');
      assert.strictEqual(el.textContent, expectedLabels.join(''), 'The labels text is correct');
    });
  }
});
