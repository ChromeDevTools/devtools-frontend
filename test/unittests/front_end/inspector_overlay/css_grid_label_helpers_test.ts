// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {assertNotNull} from '../helpers/DOMHelpers.js';
import {getGridLabelContainer, initFrameForGridLabels} from '../helpers/InspectorOverlayHelpers.js';
import {drawGridNumbers} from '../../../../front_end/inspector_overlay/css_grid_label_helpers.js';

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
    maxX: 200,
    minY: 100,
    maxY: 200,
  };

  const TESTS = [
    {
      description: 'places row labels left and right under normal conditions',
      config: {
        gridHighlightConfig: {
          showPositiveLineNumbers: true,
          showNegativeLineNumbers: true,
        },
        positiveRowLineNumberOffsets: [20, 40, 60, 80],
        negativeRowLineNumberOffsets: [20, 40, 60, 80],
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
        positiveColumnLineNumberOffsets: [20, 40, 60, 80],
        negativeColumnLineNumberOffsets: [20, 40, 60, 80],
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
        positiveRowLineNumberOffsets: [0, 20],
        positiveColumnLineNumberOffsets: [0, 20],
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
    it(description, () => {
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
    });
  }
});
