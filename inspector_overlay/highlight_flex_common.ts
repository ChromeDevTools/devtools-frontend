// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {PathCommands, Position, Quad} from './common.js';
import {BoxStyle, buildPath, createPathForQuad, drawPathWithLineStyle, emptyBounds, hatchFillPath, LineStyle} from './highlight_common.js';

type FlexLinesHighlight = FlexItemHighlight[][];

interface FlexItemHighlight {
  itemBorder: PathCommands;
  baseline: number;
}
export interface FlexContainerHighlight {
  containerBorder: PathCommands;
  lines: FlexLinesHighlight;
  isHorizontalFlow: boolean;
  alignItemsStyle: string;
  flexContainerHighlightConfig: {
    containerBorder?: LineStyle;
    lineSeparator?: LineStyle;
    itemSeparator?: LineStyle;
    mainDistributedSpace?: BoxStyle;
    crossDistributedSpace?: BoxStyle;
    rowGapSpace?: BoxStyle;
    columnGapSpace?: BoxStyle;
    crossAlignment?: LineStyle;
  };
}

interface LineQuads {
  quad: Quad;
  items: Quad[];
  extendedItems: Quad[];
}

const ALIGNMENT_LINE_THICKNESS = 2;
const ALIGNMENT_ARROW_BODY_HEIGHT = 5;
const ALIGNMENT_ARROW_BODY_WIDTH = 5;
const ALIGNMENT_ARROW_TIP_HEIGHT = 6;
const ALIGNMENT_ARROW_TIP_WIDTH = 11;
const ALIGNMENT_ARROW_DISTANCE_FROM_LINE = 2;

export function drawLayoutFlexContainerHighlight(
    highlight: FlexContainerHighlight, context: CanvasRenderingContext2D, deviceScaleFactor: number,
    canvasWidth: number, canvasHeight: number, emulationScaleFactor: number) {
  const config = highlight.flexContainerHighlightConfig;
  const bounds = emptyBounds();
  const borderPath = buildPath(highlight.containerBorder, bounds, emulationScaleFactor);
  const {isHorizontalFlow, lines} = highlight;
  drawPathWithLineStyle(context, borderPath, config.containerBorder);

  // If there are no lines, bail out now.
  if (!lines || !lines.length) {
    return;
  }

  // Process the item paths we received from the backend into quads we can use to draw what we need.
  const lineQuads = getLinesAndItemsQuads(highlight.containerBorder, lines, isHorizontalFlow);

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
 * Note: space created by gaps isn't taken into account yet, and requires the backend to send data about the gap size.
 */
function drawFlexSpace(
    highlight: FlexContainerHighlight, context: CanvasRenderingContext2D, emulationScaleFactor: number,
    container: PathCommands, lineQuads: LineQuads[]) {
  const {mainDistributedSpace, crossDistributedSpace} = highlight.flexContainerHighlightConfig;
  const drawMainSpace = mainDistributedSpace && !!(mainDistributedSpace.fillColor || mainDistributedSpace.hatchColor);
  const drawCrossSpace = lineQuads.length > 1 && crossDistributedSpace &&
      !!(crossDistributedSpace.fillColor || crossDistributedSpace.hatchColor);

  if (!drawMainSpace && !drawCrossSpace) {
    return;
  }

  const containerQuad = rectPathToQuad(container);

  // Start with the case where we want to draw all types of space, with the same style. This is important because it's
  // a common case that we can optimize by drawing in one go, and therefore avoiding having visual offsets between
  // mutliple hatch patterns.
  if (drawMainSpace && drawCrossSpace && mainDistributedSpace && crossDistributedSpace &&
      mainDistributedSpace.fillColor === crossDistributedSpace.fillColor &&
      mainDistributedSpace.hatchColor === crossDistributedSpace.hatchColor) {
    // Draw in one go by constructing a path that covers the entire container but punches holes where items are.
    const allItemQuads = lineQuads.map(line => line.extendedItems).flat().map(item => item);
    drawHatchPatternInQuad(containerQuad, allItemQuads, mainDistributedSpace, context, emulationScaleFactor);
    return;
  }

  // In other cases, we're forced to draw the empty space in multiple go's. First drawing the space betweeb flex lines.
  // And then the space between flex items, per line.
  if (drawCrossSpace) {
    // If we're drawing only cross space, then we do the same thing but punching holes where flex lines are.
    const allLineQuads = lineQuads.map(line => line.quad);
    drawHatchPatternInQuad(containerQuad, allLineQuads, crossDistributedSpace, context, emulationScaleFactor);
  }

  if (drawMainSpace) {
    for (const line of lineQuads) {
      const itemQuads = line.extendedItems;
      drawHatchPatternInQuad(line.quad, itemQuads, mainDistributedSpace, context, emulationScaleFactor);
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

  context.restore();
}

function drawHatchPatternInQuad(
    outerQuad: Quad, quadsToClip: Quad[], boxStyle: BoxStyle|undefined, context: CanvasRenderingContext2D,
    emulationScaleFactor: number) {
  if (!boxStyle || !boxStyle.hatchColor) {
    return;
  }

  const angle = Math.atan2(outerQuad.p2.y - outerQuad.p1.y, outerQuad.p2.x - outerQuad.p1.x) * 180 / Math.PI;
  const bounds = emptyBounds();
  const path = createPathForQuad(outerQuad, quadsToClip, bounds, emulationScaleFactor);
  hatchFillPath(context, path, bounds, 10, boxStyle.hatchColor, angle, false);
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
function getLinesAndItemsQuads(
    container: PathCommands, lines: FlexLinesHighlight, isHorizontalFlow: boolean): LineQuads[] {
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
      lineQuad = !lineQuad ? itemQuad : uniteQuads(lineQuad, itemQuad, isHorizontalFlow);
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
 * This only works if quad1 is before quad2 in the flow direction and if both quads have their respective sides parallel
 * to eachother.
 * @param quad1
 * @param quad2
 * @param isHorizontalFlow
 */
function uniteQuads(quad1: Quad, quad2: Quad, isHorizontalFlow: boolean): Quad {
  const mainStartSegment = isHorizontalFlow ? [quad1.p1, quad1.p4] : [quad1.p1, quad1.p2];
  const mainEndSegment = isHorizontalFlow ? [quad2.p2, quad2.p3] : [quad2.p3, quad2.p4];

  const crossStartSegment1 = isHorizontalFlow ? [quad1.p1, quad1.p2] : [quad1.p1, quad1.p4];
  const crossStartSegment2 = isHorizontalFlow ? [quad2.p1, quad2.p2] : [quad2.p1, quad2.p4];
  const crossEndSegment1 = isHorizontalFlow ? [quad1.p4, quad1.p3] : [quad1.p2, quad1.p3];
  const crossEndSegment2 = isHorizontalFlow ? [quad2.p4, quad2.p3] : [quad2.p2, quad2.p3];

  let p1 = intersectSegments(mainStartSegment, crossStartSegment2);
  if (segmentContains(mainStartSegment, p1)) {
    p1 = quad1.p1;
  }

  let p4 = intersectSegments(mainStartSegment, crossEndSegment2);
  if (segmentContains(mainStartSegment, p4)) {
    p4 = quad1.p4;
  }

  let p2 = intersectSegments(mainEndSegment, crossStartSegment1);
  if (segmentContains(mainEndSegment, p2)) {
    p2 = quad2.p2;
  }

  let p3 = intersectSegments(mainEndSegment, crossEndSegment1);
  if (segmentContains(mainEndSegment, p3)) {
    p3 = quad2.p3;
  }

  return {p1, p2, p3, p4};
}

function growQuadToEdgesOf(innerQuad: Quad, outerQuad: Quad, horizontally: boolean) {
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
function intersectSegments([p1, p2]: Position[], [p3, p4]: Position[]): Position {
  const x = (((p1.x * p2.y - p1.y * p2.x) * (p3.x - p4.x)) - ((p1.x - p2.x) * (p3.x * p4.y - p3.y * p4.x))) /
      (((p1.x - p2.x) * (p3.y - p4.y)) - (p1.y - p2.y) * (p3.x - p4.x));
  const y = (((p1.x * p2.y - p1.y * p2.x) * (p3.y - p4.y)) - ((p1.y - p2.y) * (p3.x * p4.y - p3.y * p4.x))) /
      (((p1.x - p2.x) * (p3.y - p4.y)) - (p1.y - p2.y) * (p3.x - p4.x));
  return {x, y};
}

/**
 * Does the provided segment contain the provided point
 * @param segment
 * @param point
 */
function segmentContains([p1, p2]: Position[], point: Position): boolean {
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
