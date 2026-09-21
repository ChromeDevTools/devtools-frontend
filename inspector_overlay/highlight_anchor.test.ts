// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type {PathCommands} from './common.js';
import {
  type AnchorHighlight,
  drawAnchorHighlight,
} from './highlight_anchor.js';

function createRectPath(x: number, y: number, w: number, h: number): PathCommands {
  return ['M', x, y, 'L', x + w, y, 'L', x + w, y + h, 'L', x, y + h, 'Z'];
}

describe('highlight_anchor', () => {
  let canvas: HTMLCanvasElement;
  let context: CanvasRenderingContext2D;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    assert.instanceOf(ctx, CanvasRenderingContext2D);
    context = ctx;
  });

  it('draws IMCB box and badge without errors', () => {
    const highlight: AnchorHighlight = {
      imcbBorder: createRectPath(100, 100, 200, 150),
      imcbHighlightConfig: {
        imcbFillColor: 'rgba(127, 32, 210, 0.15)',
        imcbBorder: {
          color: 'rgba(127, 32, 210, 1)',
        },
      },
    };

    assert.doesNotThrow(() => {
      drawAnchorHighlight(highlight, context, 1, canvas.width, canvas.height);
    });
  });

  it('draws insets between containing block and IMCB', () => {
    const highlight: AnchorHighlight = {
      containingBlockBorder: createRectPath(50, 50, 400, 400),
      imcbBorder: createRectPath(100, 100, 200, 200),
      imcbHighlightConfig: {
        insetsFillColor: 'rgba(246, 178, 107, 0.25)',
        insetsHatchColor: 'rgba(246, 178, 107, 0.8)',
      },
    };

    assert.doesNotThrow(() => {
      drawAnchorHighlight(highlight, context, 1, canvas.width, canvas.height);
    });
  });

  it('draws anchor targets and badges', () => {
    const highlight: AnchorHighlight = {
      imcbBorder: createRectPath(100, 100, 200, 200),
      anchorTargets: [
        {
          anchorBorder: createRectPath(20, 20, 60, 40),
          name: '--my-anchor',
        },
      ],
      imcbHighlightConfig: {
        anchorFillColor: 'rgba(26, 115, 232, 0.15)',
        anchorBorder: {
          color: 'rgba(26, 115, 232, 1)',
        },
      },
    };

    assert.doesNotThrow(() => {
      drawAnchorHighlight(highlight, context, 1, canvas.width, canvas.height);
    });
  });

  it('draws 9-cell position area grid and active region without activeRegionName badge', () => {
    const highlight: AnchorHighlight = {
      imcbBorder: createRectPath(100, 100, 200, 200),
      positionAreaGrid: {
        gridBorder: createRectPath(0, 0, 400, 400),
        gridLines: [
          ['M', 100, 0, 'L', 100, 400],
          ['M', 200, 0, 'L', 200, 400],
          ['M', 0, 100, 'L', 400, 100],
          ['M', 0, 200, 'L', 400, 200],
        ],
        activeRegion: createRectPath(200, 200, 200, 200),
      },
      imcbHighlightConfig: {
        showPositionAreaGrid: true,
        positionAreaActiveRegionColor: 'rgba(26, 115, 232, 0.25)',
        positionAreaGridLineColor: {
          color: 'rgba(26, 115, 232, 0.6)',
        },
      },
    };

    assert.doesNotThrow(() => {
      drawAnchorHighlight(highlight, context, 1, canvas.width, canvas.height);
    });
  });
});
