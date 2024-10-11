// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {PathCommands, Position, Quad} from './common.js';
import {
  type BoxStyle,
  buildPath,
  createPathForQuad,
  drawPathWithLineStyle,
  emptyBounds,
  fillPathWithBoxStyle,
  hatchFillPath,
  type LineStyle,
} from './highlight_common.js';

type FlexLinesData = FlexItemData[][];

interface FlexItemData {
  itemBorder: PathCommands;
  baseline: number;
}
export interface FlexContainerHighlight {
  containerBorder: PathCommands;
  lines: FlexLinesData;
  isHorizontalFlow: boolean;
  isReverse: boolean;
  alignItemsStyle: string;
  mainGap: number;
  crossGap: number;
  flexContainerHighlightConfig: {
    containerBorder?: LineStyle,
    lineSeparator?: LineStyle,
    itemSeparator?: LineStyle,
    mainDistributedSpace?: BoxStyle,
    crossDistributedSpace?: BoxStyle,
    rowGapSpace?: BoxStyle,
    columnGapSpace?: BoxStyle,
    crossAlignment?: LineStyle,
  };
}

export interface FlexItemHighlight {
  baseSize: number;
  isHorizontalFlow: boolean;
  flexItemHighlightConfig: {baseSizeBox?: BoxStyle, baseSizeBorder?: LineStyle, flexibilityArrow?: LineStyle};
  boxSizing: 'content'|'border';
}

interface LineQuads {
  quad: Quad;
  items: Quad[];
  extendedItems: Quad[];
}

interface GapQuads {
  mainGaps: Quad[][];
  crossGaps: Quad[];
}

const ALIGNMENT_LINE_THICKNESS = 2;
const ALIGNMENT_ARROW_BODY_HEIGHT = 5;
const ALIGNMENT_ARROW_BODY_WIDTH = 5;
const ALIGNMENT_ARROW_TIP_HEIGHT = 6;
const ALIGNMENT_ARROW_TIP_WIDTH = 11;
const ALIGNMENT_ARROW_DISTANCE_FROM_LINE = 2;
const FLEXIBILITY_ARROW_THICKNESS = 1;
const FLEXIBILITY_ARROW_TIP_SIZE = 5;

export function drawLayoutFlexItemHighlight(
    highlight: FlexItemHighlight, itemPath: PathCommands, context: CanvasRenderingContext2D, deviceScaleFactor: number,
    canvasWidth: number, canvasHeight: number, emulationScaleFactor: number) {
  const {baseSize, isHorizontalFlow} = highlight;

  const itemQuad = rectPathToQuad(itemPath);
  const baseSizeQuad = isHorizontalFlow ? {
    p1: itemQuad.p1,
    p2: getColinearPointAtDistance(itemQuad.p1, itemQuad.p2, baseSize),
    p3: getColinearPointAtDistance(itemQuad.p4, itemQuad.p3, baseSize),
    p4: itemQuad.p4,
  } :
                                          {
                                            p1: itemQuad.p1,
                                            p2: itemQuad.p2,
                                            p3: getColinearPointAtDistance(itemQuad.p2, itemQuad.p3, baseSize),
                                            p4: getColinearPointAtDistance(itemQuad.p1, itemQuad.p4, baseSize),
                                          };

  drawItemBaseSize(highlight, itemQuad, baseSizeQuad, context, emulationScaleFactor);
  drawFlexibilityArrow(highlight, itemQuad, baseSizeQuad, context, emulationScaleFactor);
}

function drawItemBaseSize(
    highlight: FlexItemHighlight, itemQuad: Quad, baseSizeQuad: Quad, context: CanvasRenderingContext2D,
    emulationScaleFactor: number) {
  const config = highlight.flexItemHighlightConfig;

  const bounds = emptyBounds();
  const path = buildPath(quadToPath(baseSizeQuad), bounds, emulationScaleFactor);

  // Fill the base size box.
  const angle = Math.atan2(itemQuad.p4.y - itemQuad.p1.y, itemQuad.p4.x - itemQuad.p1.x) + (Math.PI * 45 / 180);
  fillPathWithBoxStyle(context, path, bounds, angle, config.baseSizeBox);

  // Draw the base size border.
  drawPathWithLineStyle(context, path, config.baseSizeBorder);
}

function drawFlexibilityArrow(
    highlight: FlexItemHighlight, itemQuad: Quad, baseSizeQuad: Quad, context: CanvasRenderingContext2D,
    emulationScaleFactor: number) {
  const {isHorizontalFlow} = highlight;
  const config = highlight.flexItemHighlightConfig;

  if (!config.flexibilityArrow) {
    return;
  }

  // Figure out where the arrow should start and end.
  const from = isHorizontalFlow ? {
    x: (baseSizeQuad.p2.x + baseSizeQuad.p3.x) / 2,
    y: (baseSizeQuad.p2.y + baseSizeQuad.p3.y) / 2,
  } :
                                  {
                                    x: (baseSizeQuad.p4.x + baseSizeQuad.p3.x) / 2,
                                    y: (baseSizeQuad.p4.y + baseSizeQuad.p3.y) / 2,
                                  };

  const to = isHorizontalFlow ? {
    x: (itemQuad.p2.x + itemQuad.p3.x) / 2,
    y: (itemQuad.p2.y + itemQuad.p3.y) / 2,
  } :
                                {
                                  x: (itemQuad.p4.x + itemQuad.p3.x) / 2,
                                  y: (itemQuad.p4.y + itemQuad.p3.y) / 2,
                                };

  if (to.x === from.x && to.y === from.y) {
    return;
  }
  // Draw the arrow line.
  const path = segmentToPath([from, to]);
  drawPathWithLineStyle(
      context, buildPath(path, emptyBounds(), emulationScaleFactor), config.flexibilityArrow,
      FLEXIBILITY_ARROW_THICKNESS);

  if (!config.flexibilityArrow.color) {
    return;
  }

  // Draw the tip of the arrow.
  const tipPath = buildPath(
      [
        'M',
        to.x - FLEXIBILITY_ARROW_TIP_SIZE,
        to.y - FLEXIBILITY_ARROW_TIP_SIZE,
        'L',
        to.x,
        to.y,
        'L',
        to.x - FLEXIBILITY_ARROW_TIP_SIZE,
        to.y + FLEXIBILITY_ARROW_TIP_SIZE,
      ],
      emptyBounds(), emulationScaleFactor);

  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  context.save();
  context.translate(to.x + .5, to.y + .5);
  context.rotate(angle);
  context.translate(-to.x - .5, -to.y - .5);

  drawPathWithLineStyle(context, tipPath, config.flexibilityArrow, FLEXIBILITY_ARROW_THICKNESS);

  context.restore();
}

export function drawLayoutFlexContainerHighlight(
    highlight: FlexContainerHighlight, context: CanvasRenderingContext2D, deviceScaleFactor: number,
    canvasWidth: number, canvasHeight: number, emulationScaleFactor: number) {
  const config = highlight.flexContainerHighlightConfig;
  const bounds = emptyBounds();
  const borderPath = buildPath(highlight.containerBorder, bounds, emulationScaleFactor);
  const {isHorizontalFlow, isReverse, lines} = highlight;
  drawPathWithLineStyle(context, borderPath, config.containerBorder);

  // If there are no lines, bail out now.
  if (!lines || !lines.length) {
    return;
  }

  // Process the item paths we received from the backend into quads we can use to draw what we need.
  const lineQuads = getLinesAndItemsQuads(highlight.containerBorder, lines, isHorizontalFlow, isReverse);

  // Draw lines and items.
  drawFlexLinesAndItems(highlight, context, emulationScaleFactor, lineQuads, isHorizontalFlow);

  // Draw the hatching pattern outside of items.
  drawFlexSpace(highlight, context, emulationScaleFactor, highlight.containerBorder, lineQuads);

  // Draw the self-alignment lines and arrows.
  drawFlexAlignment(
      highlight, context, emulationScaleFactor, lineQuads, lines.map(line => line.map(item => item.baseline)));
}

function drawFlexLinesAndItems(
    highlight: FlexContainerHighlight, context: CanvasRenderingContext2D, emulationScaleFactor: number,
    lineQuads: LineQuads[], isHorizontalFlow: boolean) {
  const config = highlight.flexContainerHighlightConfig;

  const paths = lineQuads.map((line, lineIndex) => {
    const nextLineQuad = lineQuads[lineIndex + 1] && lineQuads[lineIndex + 1].quad;
    return {
      path: isHorizontalFlow ? quadToHorizontalLinesPath(line.quad, nextLineQuad) :
                               quadToVerticalLinesPath(line.quad, nextLineQuad),
      items: line.extendedItems.map((item, itemIndex) => {
        const nextItemQuad = line.extendedItems[itemIndex + 1] && line.extendedItems[itemIndex + 1];
        return isHorizontalFlow ? quadToVerticalLinesPath(item, nextItemQuad) :
                                  quadToHorizontalLinesPath(item, nextItemQuad);
      }),
    };
  });

  // Only draw lines when there's more than 1.
  const drawLines = paths.length > 1;

  for (const {path, items} of paths) {
    for (const itemPath of items) {
      drawPathWithLineStyle(context, buildPath(itemPath, emptyBounds(), emulationScaleFactor), config.itemSeparator);
    }
    if (drawLines) {
      drawPathWithLineStyle(context, buildPath(path, emptyBounds(), emulationScaleFactor), config.lineSeparator);
    }
  }
}

/**
 * Draw the hatching pattern in all of the empty space between items and lines (either due to gaps or content
 * distribution).
 * Space created by content distribution along the cross axis (align-content) appears between flex lines.
 * Space created by content distribution along the main axis (justify-content) appears between flex items.
 * Space created by gap along the cross axis appears between flex lines.
 * Space created by gap along the main axis appears between flex items.
 */
function drawFlexSpace(
    highlight: FlexContainerHighlight, context: CanvasRenderingContext2D, emulationScaleFactor: number,
    container: PathCommands, lineQuads: LineQuads[]) {
  const {isHorizontalFlow} = highlight;
  const {mainDistributedSpace, crossDistributedSpace, rowGapSpace, columnGapSpace} =
      highlight.flexContainerHighlightConfig;
  const mainGapSpace = isHorizontalFlow ? columnGapSpace : rowGapSpace;
  const crossGapSpace = isHorizontalFlow ? rowGapSpace : columnGapSpace;

  const drawMainSpace =
      mainDistributedSpace && Boolean(mainDistributedSpace.fillColor || mainDistributedSpace.hatchColor);
  const drawCrossSpace = lineQuads.length > 1 && crossDistributedSpace &&
      Boolean(crossDistributedSpace.fillColor || crossDistributedSpace.hatchColor);
  const drawMainGapSpace = mainGapSpace && Boolean(mainGapSpace.fillColor || mainGapSpace.hatchColor);
  const drawCrossGapSpace =
      lineQuads.length > 1 && crossGapSpace && Boolean(crossGapSpace.fillColor || crossGapSpace.hatchColor);

  const isSameStyle = mainDistributedSpace && crossDistributedSpace && mainGapSpace && crossGapSpace &&
      mainDistributedSpace.fillColor === crossDistributedSpace.fillColor &&
      mainDistributedSpace.hatchColor === crossDistributedSpace.hatchColor &&
      mainDistributedSpace.fillColor === mainGapSpace.fillColor &&
      mainDistributedSpace.hatchColor === mainGapSpace.hatchColor &&
      mainDistributedSpace.fillColor === crossGapSpace.fillColor &&
      mainDistributedSpace.hatchColor === crossGapSpace.hatchColor;

  const containerQuad = rectPathToQuad(container);

  // Start with the case where we want to draw all types of space, with the same style. This is important because it's
  // a common case that we can optimize by drawing in one go, and therefore avoiding having visual offsets between
  // mutliple hatch patterns.
  if (isSameStyle) {
    // Draw in one go by constructing a path that covers the entire container but punches holes where items are.
    const allItemQuads = lineQuads.map(line => line.extendedItems).flat().map(item => item);
    drawFlexSpaceInQuad(containerQuad, allItemQuads, mainDistributedSpace, context, emulationScaleFactor);
    return;
  }

  // Compute quads for the gaps between lines and items, if any. This will be useful when drawing the flex space.
  const gapQuads = getGapQuads(highlight, lineQuads);

  if (drawCrossSpace) {
    // For cross-space we draw a path that covers everything.
    const quadsToClip = [
      // But we clip holes where lines are.
      ...lineQuads.map(line => line.quad),
      // And also clip holds where gaps are, if those are also drawn.
      ...(drawCrossGapSpace ? gapQuads.crossGaps : []),
    ];
    drawFlexSpaceInQuad(containerQuad, quadsToClip, crossDistributedSpace, context, emulationScaleFactor);
  }

  if (drawMainSpace) {
    // Main space is draw per flex line.
    for (const [index, line] of lineQuads.entries()) {
      // For main-space, we draw a path that covers each line.
      const quadsToClip = [
        // But we clip holes were items on the lines are.
        ...line.extendedItems,
        // And where gaps are, if those are also drawn.
        ...(drawMainGapSpace ? gapQuads.mainGaps[index] : []),
      ];
      drawFlexSpaceInQuad(line.quad, quadsToClip, mainDistributedSpace, context, emulationScaleFactor);
    }
  }

  if (drawCrossGapSpace) {
    for (const quad of gapQuads.crossGaps) {
      drawFlexSpaceInQuad(quad, [], crossGapSpace, context, emulationScaleFactor);
    }
  }

  if (drawMainGapSpace) {
    for (const line of gapQuads.mainGaps) {
      for (const quad of line) {
        drawFlexSpaceInQuad(quad, [], mainGapSpace, context, emulationScaleFactor);
      }
    }
  }
}

function drawFlexAlignment(
    highlight: FlexContainerHighlight, context: CanvasRenderingContext2D, emulationScaleFactor: number,
    lineQuads: LineQuads[], itemBaselines: number[][]) {
  lineQuads.forEach(({quad, items}, i) => {
    drawFlexAlignmentForLine(highlight, context, emulationScaleFactor, quad, items, itemBaselines[i]);
  });
}

function drawFlexAlignmentForLine(
    highlight: FlexContainerHighlight, context: CanvasRenderingContext2D, emulationScaleFactor: number, lineQuad: Quad,
    itemQuads: Quad[], itemBaselines: number[]) {
  const {alignItemsStyle, isHorizontalFlow} = highlight;
  const {crossAlignment} = highlight.flexContainerHighlightConfig;
  if (!crossAlignment || !crossAlignment.color) {
    return;
  }

  // Note that the order of the 2 points in the array matters as it is used to determine where the arrow will be drawn.
  //
  // first                second
  // point                point
  //   o--------------------o
  //             ^
  //             |
  //           arrow
  //
  //
  //           arrow
  // second      |        first
  // point       V        point
  //   o--------------------o
  const linesToDraw: [Position, Position][] = [];

  switch (alignItemsStyle) {
    case 'flex-start':
      linesToDraw.push([
        isHorizontalFlow ? lineQuad.p1 : lineQuad.p4,
        isHorizontalFlow ? lineQuad.p2 : lineQuad.p1,
      ]);
      break;
    case 'flex-end':
      linesToDraw.push([
        isHorizontalFlow ? lineQuad.p3 : lineQuad.p2,
        isHorizontalFlow ? lineQuad.p4 : lineQuad.p3,
      ]);
      break;
    case 'center':
      if (isHorizontalFlow) {
        linesToDraw.push([
          {
            x: (lineQuad.p1.x + lineQuad.p4.x) / 2,
            y: (lineQuad.p1.y + lineQuad.p4.y) / 2,
          },
          {
            x: (lineQuad.p2.x + lineQuad.p3.x) / 2,
            y: (lineQuad.p2.y + lineQuad.p3.y) / 2,
          },
        ]);
        linesToDraw.push([
          {
            x: (lineQuad.p2.x + lineQuad.p3.x) / 2,
            y: (lineQuad.p2.y + lineQuad.p3.y) / 2,
          },
          {
            x: (lineQuad.p1.x + lineQuad.p4.x) / 2,
            y: (lineQuad.p1.y + lineQuad.p4.y) / 2,
          },
        ]);
      } else {
        linesToDraw.push([
          {
            x: (lineQuad.p1.x + lineQuad.p2.x) / 2,
            y: (lineQuad.p1.y + lineQuad.p2.y) / 2,
          },
          {
            x: (lineQuad.p3.x + lineQuad.p4.x) / 2,
            y: (lineQuad.p3.y + lineQuad.p4.y) / 2,
          },
        ]);
        linesToDraw.push([
          {
            x: (lineQuad.p3.x + lineQuad.p4.x) / 2,
            y: (lineQuad.p3.y + lineQuad.p4.y) / 2,
          },
          {
            x: (lineQuad.p1.x + lineQuad.p2.x) / 2,
            y: (lineQuad.p1.y + lineQuad.p2.y) / 2,
          },
        ]);
      }
      break;
    case 'stretch':
    case 'normal':
      linesToDraw.push([
        isHorizontalFlow ? lineQuad.p1 : lineQuad.p4,
        isHorizontalFlow ? lineQuad.p2 : lineQuad.p1,
      ]);
      linesToDraw.push([
        isHorizontalFlow ? lineQuad.p3 : lineQuad.p2,
        isHorizontalFlow ? lineQuad.p4 : lineQuad.p3,
      ]);
      break;
    case 'baseline':
      // Baseline alignment only works in horizontal direction.
      if (isHorizontalFlow) {
        // We know the baseline for each item, it's an offset value from the top of the item's quad box.
        // If align-items:baseline is applied to the container, then all of the items' baselines are aligned and we can
        // just use the first item's baseline to draw the alignment line we need.
        // Any item may, however, override its own self-alignment with align-self. We don't know if some items are
        // aligned differently, or if no items at all inherit from the container's align-items:baseline property, so in
        // theory, drawing the alignment line is impossible.
        // That said, in situations where align-items:baseline is used, it is safe to assume that most (if not all) of
        // the items are actually using this alignment value.
        // Given this, we still draw the alignment line using the first item's baseline value.
        const itemQuad = itemQuads[0];

        const start = intersectSegments([itemQuad.p1, itemQuad.p2], [lineQuad.p2, lineQuad.p3]);
        const end = intersectSegments([itemQuad.p1, itemQuad.p2], [lineQuad.p1, lineQuad.p4]);

        const baseline = itemBaselines[0];
        const angle = Math.atan2(itemQuad.p4.y - itemQuad.p1.y, itemQuad.p4.x - itemQuad.p1.x);

        linesToDraw.push([
          {
            x: start.x + (baseline * Math.cos(angle)),
            y: start.y + (baseline * Math.sin(angle)),
          },
          {
            x: end.x + (baseline * Math.cos(angle)),
            y: end.y + (baseline * Math.sin(angle)),
          },
        ]);
      }
      break;
  }

  for (const points of linesToDraw) {
    const path = segmentToPath(points);
    drawPathWithLineStyle(
        context, buildPath(path, emptyBounds(), emulationScaleFactor), crossAlignment, ALIGNMENT_LINE_THICKNESS);
    drawAlignmentArrow(highlight, context, emulationScaleFactor, points[0], points[1]);
  }
}

/**
 * Draw an arrow pointed at the middle of a segment. The segment isn't necessarily vertical or horizontal.
 *
 * start          C             end
 *  o-------------x--------------o
 *               / \
 *              /   \
 *             /_   _\
 *               | |
 *               |_|
 */
function drawAlignmentArrow(
    highlight: FlexContainerHighlight, context: CanvasRenderingContext2D, emulationScaleFactor: number,
    startPoint: Position, endPoint: Position) {
  const {crossAlignment} = highlight.flexContainerHighlightConfig;
  if (!crossAlignment || !crossAlignment.color) {
    return;
  }

  // The angle of the segment.
  const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);

  // Where the tip of the arrow meets the segment, plus some offset so they don't overlap.
  const C = {
    x: (-ALIGNMENT_ARROW_DISTANCE_FROM_LINE * Math.cos(angle - .5 * Math.PI)) + ((startPoint.x + endPoint.x) / 2),
    y: (-ALIGNMENT_ARROW_DISTANCE_FROM_LINE * Math.sin(angle - .5 * Math.PI)) + ((startPoint.y + endPoint.y) / 2),
  };

  const path = buildPath(
      [
        'M',
        C.x,
        C.y,
        'L',
        C.x + (ALIGNMENT_ARROW_TIP_WIDTH / 2),
        C.y + ALIGNMENT_ARROW_TIP_HEIGHT,
        'L',
        C.x + (ALIGNMENT_ARROW_BODY_WIDTH / 2),
        C.y + ALIGNMENT_ARROW_TIP_HEIGHT,
        'L',
        C.x + (ALIGNMENT_ARROW_BODY_WIDTH / 2),
        C.y + ALIGNMENT_ARROW_TIP_HEIGHT + ALIGNMENT_ARROW_BODY_HEIGHT,
        'L',
        C.x - (ALIGNMENT_ARROW_BODY_WIDTH / 2),
        C.y + ALIGNMENT_ARROW_TIP_HEIGHT + ALIGNMENT_ARROW_BODY_HEIGHT,
        'L',
        C.x - (ALIGNMENT_ARROW_BODY_WIDTH / 2),
        C.y + ALIGNMENT_ARROW_TIP_HEIGHT,
        'L',
        C.x - (ALIGNMENT_ARROW_TIP_WIDTH / 2),
        C.y + ALIGNMENT_ARROW_TIP_HEIGHT,
        'Z',
      ],
      emptyBounds(), emulationScaleFactor);

  context.save();
  context.translate(C.x, C.y);
  context.rotate(angle);
  context.translate(-C.x, -C.y);

  context.fillStyle = crossAlignment.color;
  context.fill(path);

  context.lineWidth = 1;
  context.strokeStyle = 'white';
  context.stroke(path);

  context.restore();
}

function drawFlexSpaceInQuad(
    outerQuad: Quad, quadsToClip: Quad[], boxStyle: BoxStyle|undefined, context: CanvasRenderingContext2D,
    emulationScaleFactor: number) {
  if (!boxStyle) {
    return;
  }

  if (boxStyle.fillColor) {
    const bounds = emptyBounds();
    const path = createPathForQuad(outerQuad, quadsToClip, bounds, emulationScaleFactor);
    context.fillStyle = boxStyle.fillColor;
    context.fill(path);
  }

  if (boxStyle.hatchColor) {
    const angle = Math.atan2(outerQuad.p2.y - outerQuad.p1.y, outerQuad.p2.x - outerQuad.p1.x) * 180 / Math.PI;
    const bounds = emptyBounds();
    const path = createPathForQuad(outerQuad, quadsToClip, bounds, emulationScaleFactor);
    hatchFillPath(context, path, bounds, 10, boxStyle.hatchColor, angle, false);
  }
}

/**
 * We get a list of paths for each flex item from the backend. From this list, we compute the resulting paths for each
 * flex line too (making it span the entire container size (in the main direction)). We also process the item path so
 * they span the entire flex line size (in the cross direction).
 *
 * @param container
 * @param lines
 * @param isHorizontalFlow
 */
export function getLinesAndItemsQuads(
    container: PathCommands, lines: FlexLinesData, isHorizontalFlow: boolean, isReverse: boolean): LineQuads[] {
  const containerQuad = rectPathToQuad(container);

  // Create a quad for each line that's as big as the items it contains and extends to the edges of the container in the
  // main direction.
  const lineQuads: LineQuads[] = [];
  for (const line of lines) {
    if (!line.length) {
      continue;
    }

    let lineQuad = rectPathToQuad(line[0].itemBorder);
    const itemQuads: Quad[] = [];
    for (const {itemBorder} of line) {
      const itemQuad = rectPathToQuad(itemBorder);
      lineQuad = !lineQuad ? itemQuad : uniteQuads(lineQuad, itemQuad, isHorizontalFlow, isReverse);
      itemQuads.push(itemQuad);
    }

    const extendedLineQuad =
        lines.length === 1 ? containerQuad : growQuadToEdgesOf(lineQuad, containerQuad, isHorizontalFlow);
    const extendItemQuads = itemQuads.map(itemQuad => growQuadToEdgesOf(itemQuad, extendedLineQuad, !isHorizontalFlow));

    lineQuads.push({
      quad: extendedLineQuad,
      items: itemQuads,
      extendedItems: extendItemQuads,
    });
  }

  return lineQuads;
}

export function getGapQuads(
    highlight: Pick<FlexContainerHighlight, 'crossGap'|'mainGap'|'isHorizontalFlow'|'isReverse'>,
    lineQuads: LineQuads[]): GapQuads {
  const {crossGap, mainGap, isHorizontalFlow, isReverse} = highlight;
  const mainGaps: Quad[][] = [];
  const crossGaps: Quad[] = [];

  if (crossGap && lineQuads.length > 1) {
    for (let i = 0, j = i + 1; i < lineQuads.length - 1; i++, j = i + 1) {
      const line1 = lineQuads[i].quad;
      const line2 = lineQuads[j].quad;

      crossGaps.push(getGapQuadBetweenQuads(line1, line2, crossGap, isHorizontalFlow));
    }
  }

  for (const {extendedItems} of lineQuads) {
    const lineGapQuads = [];
    if (mainGap) {
      for (let i = 0, j = i + 1; i < extendedItems.length - 1; i++, j = i + 1) {
        const item1 = extendedItems[i];
        const item2 = extendedItems[j];

        lineGapQuads.push(getGapQuadBetweenQuads(item1, item2, mainGap, !isHorizontalFlow, isReverse));
      }
    }
    mainGaps.push(lineGapQuads);
  }

  return {mainGaps, crossGaps};
}

/**
 * Create a quad for the gap that exists between 2 quads.
 *
 * +-------+   +-+   +-------+
 * | quad1 |   |/|   | quad2 |
 * +-------+   +-+   +-------+
 *           gap quad
 *
 * @param quad1
 * @param quad2
 * @param size The size of the gap between the 2 quads
 * @param vertically whether the 2 quads are stacked vertically (quad1 above quad2), or horizontally (quad1 left of
 * quad2)
 * @param isReverse whether the direction is reversed (quad1 below quad2 or quad1 right of quad2)
 */
export function getGapQuadBetweenQuads(
    quad1: Quad, quad2: Quad, size: number, vertically: boolean, isReverse?: boolean) {
  if (isReverse) {
    [quad1, quad2] = [quad2, quad1];
  }
  const angle = vertically ? Math.atan2(quad1.p4.y - quad1.p1.y, quad1.p4.x - quad1.p1.x) :
                             Math.atan2(quad1.p2.y - quad1.p1.y, quad1.p2.x - quad1.p1.x);
  const d = vertically ? distance(quad1.p4, quad2.p1) : distance(quad1.p2, quad2.p1);
  const startOffset = (d / 2) - (size / 2);
  const endOffset = (d / 2) + (size / 2);

  return vertically ? {
    p1: {
      x: Math.round(quad1.p4.x + (startOffset * Math.cos(angle))),
      y: Math.round(quad1.p4.y + (startOffset * Math.sin(angle))),
    },
    p2: {
      x: Math.round(quad1.p3.x + (startOffset * Math.cos(angle))),
      y: Math.round(quad1.p3.y + (startOffset * Math.sin(angle))),
    },
    p3: {
      x: Math.round(quad1.p3.x + (endOffset * Math.cos(angle))),
      y: Math.round(quad1.p3.y + (endOffset * Math.sin(angle))),
    },
    p4: {
      x: Math.round(quad1.p4.x + (endOffset * Math.cos(angle))),
      y: Math.round(quad1.p4.y + (endOffset * Math.sin(angle))),
    },
  } :
                      {
                        p1: {
                          x: Math.round(quad1.p2.x + (startOffset * Math.cos(angle))),
                          y: Math.round(quad1.p2.y + (startOffset * Math.sin(angle))),
                        },
                        p2: {
                          x: Math.round(quad1.p2.x + (endOffset * Math.cos(angle))),
                          y: Math.round(quad1.p2.y + (endOffset * Math.sin(angle))),
                        },
                        p3: {
                          x: Math.round(quad1.p3.x + (endOffset * Math.cos(angle))),
                          y: Math.round(quad1.p3.y + (endOffset * Math.sin(angle))),
                        },
                        p4: {
                          x: Math.round(quad1.p3.x + (startOffset * Math.cos(angle))),
                          y: Math.round(quad1.p3.y + (startOffset * Math.sin(angle))),
                        },
                      };
}

function quadToHorizontalLinesPath(quad: Quad, nextQuad: Quad|undefined): PathCommands {
  const skipEndLine = nextQuad && quad.p4.y === nextQuad.p1.y;
  const startLine = ['M', quad.p1.x, quad.p1.y, 'L', quad.p2.x, quad.p2.y];
  return skipEndLine ? startLine : [...startLine, 'M', quad.p3.x, quad.p3.y, 'L', quad.p4.x, quad.p4.y];
}

function quadToVerticalLinesPath(quad: Quad, nextQuad: Quad|undefined): PathCommands {
  const skipEndLine = nextQuad && quad.p2.x === nextQuad.p1.x;
  const startLine = ['M', quad.p1.x, quad.p1.y, 'L', quad.p4.x, quad.p4.y];
  return skipEndLine ? startLine : [...startLine, 'M', quad.p3.x, quad.p3.y, 'L', quad.p2.x, quad.p2.y];
}

function quadToPath(quad: Quad): PathCommands {
  return [
    'M',
    quad.p1.x,
    quad.p1.y,
    'L',
    quad.p2.x,
    quad.p2.y,
    'L',
    quad.p3.x,
    quad.p3.y,
    'L',
    quad.p4.x,
    quad.p4.y,
    'Z',
  ];
}

function segmentToPath(segment: [Position, Position]): PathCommands {
  return ['M', segment[0].x, segment[0].y, 'L', segment[1].x, segment[1].y];
}

/**
 * Transform a path array (as returned by the backend) that corresponds to a rectangle into a quad.
 * @param commands
 * @return The quad object
 */
function rectPathToQuad(commands: PathCommands): Quad {
  return {
    p1: {x: commands[1] as number, y: commands[2] as number},
    p2: {x: commands[4] as number, y: commands[5] as number},
    p3: {x: commands[7] as number, y: commands[8] as number},
    p4: {x: commands[10] as number, y: commands[11] as number},
  };
}

/**
 * Get a quad that bounds the provided 2 quads.
 * This only works if both quads have their respective sides parallel to eachother.
 * Note that it is more complicated because rectangles can be transformed (i.e. their sides aren't necessarily parallel
 * to the x and y axes).
 * @param quad1
 * @param quad2
 * @param isHorizontalFlow
 * @param isReverse
 */
export function uniteQuads(quad1: Quad, quad2: Quad, isHorizontalFlow: boolean, isReverse: boolean): Quad {
  if (isReverse) {
    [quad1, quad2] = [quad2, quad1];
  }

  const mainStartSegment = isHorizontalFlow ? [quad1.p1, quad1.p4] : [quad1.p1, quad1.p2];
  const mainEndSegment = isHorizontalFlow ? [quad2.p2, quad2.p3] : [quad2.p4, quad2.p3];

  const crossStartSegment1 = isHorizontalFlow ? [quad1.p1, quad1.p2] : [quad1.p1, quad1.p4];
  const crossEndSegment1 = isHorizontalFlow ? [quad1.p4, quad1.p3] : [quad1.p2, quad1.p3];

  const crossStartSegment2 = isHorizontalFlow ? [quad2.p1, quad2.p2] : [quad2.p1, quad2.p4];
  const crossEndSegment2 = isHorizontalFlow ? [quad2.p4, quad2.p3] : [quad2.p2, quad2.p3];

  let p1, p2, p3, p4;

  if (isHorizontalFlow) {
    p1 = intersectSegments(mainStartSegment, crossStartSegment2);
    if (segmentContains(mainStartSegment, p1)) {
      p1 = quad1.p1;
    }

    p2 = intersectSegments(mainEndSegment, crossStartSegment1);
    if (segmentContains(mainEndSegment, p2)) {
      p2 = quad2.p2;
    }

    p3 = intersectSegments(mainEndSegment, crossEndSegment1);
    if (segmentContains(mainEndSegment, p3)) {
      p3 = quad2.p3;
    }

    p4 = intersectSegments(mainStartSegment, crossEndSegment2);
    if (segmentContains(mainStartSegment, p4)) {
      p4 = quad1.p4;
    }
  } else {
    p1 = intersectSegments(mainStartSegment, crossStartSegment2);
    if (segmentContains(mainStartSegment, p1)) {
      p1 = quad1.p1;
    }

    p2 = intersectSegments(mainStartSegment, crossEndSegment2);
    if (segmentContains(mainStartSegment, p2)) {
      p2 = quad1.p2;
    }

    p3 = intersectSegments(mainEndSegment, crossEndSegment1);
    if (segmentContains(mainEndSegment, p3)) {
      p3 = quad2.p3;
    }

    p4 = intersectSegments(mainEndSegment, crossStartSegment1);
    if (segmentContains(mainEndSegment, p4)) {
      p4 = quad2.p4;
    }
  }

  return {p1, p2, p3, p4};
}

/**
 * Given 2 quads, with one being contained inside the other, grow the inner one, along one direction, so it ends up
 * flush aginst the outer one.
 * @param innerQuad
 * @param outerQuad
 * @param horizontally The direction to grow the inner quad along
 */
export function growQuadToEdgesOf(innerQuad: Quad, outerQuad: Quad, horizontally: boolean): Quad {
  return {
    p1: horizontally ? intersectSegments([outerQuad.p1, outerQuad.p4], [innerQuad.p1, innerQuad.p2]) :
                       intersectSegments([outerQuad.p1, outerQuad.p2], [innerQuad.p1, innerQuad.p4]),
    p2: horizontally ? intersectSegments([outerQuad.p2, outerQuad.p3], [innerQuad.p1, innerQuad.p2]) :
                       intersectSegments([outerQuad.p1, outerQuad.p2], [innerQuad.p2, innerQuad.p3]),
    p3: horizontally ? intersectSegments([outerQuad.p2, outerQuad.p3], [innerQuad.p3, innerQuad.p4]) :
                       intersectSegments([outerQuad.p3, outerQuad.p4], [innerQuad.p2, innerQuad.p3]),
    p4: horizontally ? intersectSegments([outerQuad.p1, outerQuad.p4], [innerQuad.p3, innerQuad.p4]) :
                       intersectSegments([outerQuad.p3, outerQuad.p4], [innerQuad.p1, innerQuad.p4]),
  };
}

/**
 * Return the x/y intersection of the 2 segments
 * @param segment1
 * @param segment2
 * @return the point where the segments intersect
 */
export function intersectSegments([p1, p2]: Position[], [p3, p4]: Position[]): Position {
  const x = (((p1.x * p2.y - p1.y * p2.x) * (p3.x - p4.x)) - ((p1.x - p2.x) * (p3.x * p4.y - p3.y * p4.x))) /
      (((p1.x - p2.x) * (p3.y - p4.y)) - (p1.y - p2.y) * (p3.x - p4.x));
  const y = (((p1.x * p2.y - p1.y * p2.x) * (p3.y - p4.y)) - ((p1.y - p2.y) * (p3.x * p4.y - p3.y * p4.x))) /
      (((p1.x - p2.x) * (p3.y - p4.y)) - (p1.y - p2.y) * (p3.x - p4.x));

  return {
    x: Object.is(x, -0) ? 0 : x,
    y: Object.is(y, -0) ? 0 : y,
  };
}

/**
 * Does the provided segment contain the provided point
 * @param segment
 * @param point
 */
export function segmentContains([p1, p2]: Position[], point: Position): boolean {
  if (p1.x < p2.x && (point.x < p1.x || point.x > p2.x)) {
    return false;
  }

  if (p1.x > p2.x && (point.x > p1.x || point.x < p2.x)) {
    return false;
  }

  if (p1.y < p2.y && (point.y < p1.y || point.y > p2.y)) {
    return false;
  }

  if (p1.y > p2.y && (point.y > p1.y || point.y < p2.y)) {
    return false;
  }

  return (point.y - p1.y) * (p2.x - p1.x) === (p2.y - p1.y) * (point.x - p1.x);
}

export function distance(p1: Position, p2: Position) {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

export function getColinearPointAtDistance(p1: Position, p2: Position, distance: number): Position {
  const slope = (p2.y - p1.y) / (p2.x - p1.x);
  const angle = Math.atan(slope);
  return {
    x: p1.x + distance * Math.cos(angle),
    y: p1.y + distance * Math.sin(angle),
  };
}
