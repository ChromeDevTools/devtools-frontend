// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {PathCommands, Position, Quad} from './common.js';
import {BoxStyle, buildPath, createPathForQuad, drawPathWithLineStyle, emptyBounds, hatchFillPath, LineStyle} from './highlight_common.js';

export interface FlexContainerHighlight {
  containerBorder: PathCommands;
  lines: Array<Array<PathCommands>>;
  isHorizontalFlow: boolean;
  flexContainerHighlightConfig: {
    containerBorder?: LineStyle;
    lineSeparator?: LineStyle;
    itemSeparator?: LineStyle;
    mainDistributedSpace?: BoxStyle;
    crossDistributedSpace?: BoxStyle;
    rowGapSpace?: BoxStyle;
    columnGapSpace?: BoxStyle;
  };
}

interface LineQuads {
  quad: Quad;
  items: Quad[];
}

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
      items: line.items.map((item, itemIndex) => {
        const nextItemQuad = line.items[itemIndex + 1] && line.items[itemIndex + 1];
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
    const allItemQuads = lineQuads.map(line => line.items).flat().map(item => item);
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
      const itemQuads = line.items;
      drawHatchPatternInQuad(line.quad, itemQuads, mainDistributedSpace, context, emulationScaleFactor);
    }
  }
}

function drawHatchPatternInQuad(
    outerQuad: Quad, quadsToClip: Quad[], boxStyle: BoxStyle|undefined, context: CanvasRenderingContext2D,
    emulationScaleFactor: number) {
  if (!boxStyle || !boxStyle.hatchColor) {
    return;
  }
  const bounds = emptyBounds();
  const path = createPathForQuad(outerQuad, quadsToClip, bounds, emulationScaleFactor);
  hatchFillPath(context, path, bounds, 10, boxStyle.hatchColor, 0, false);
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
    container: PathCommands, lines: PathCommands[][], isHorizontalFlow: boolean): LineQuads[] {
  const containerQuad = rectPathToQuad(container);

  // Create a quad for each line that's as big as the items it contains and extends to the edges of the container in the
  // main direction.
  const lineQuads: {quad: Quad, items: Quad[]}[] = [];
  for (const line of lines) {
    if (!line.length) {
      continue;
    }

    let lineQuad = rectPathToQuad(line[0]);
    const itemQuads: Quad[] = [];
    for (const item of line) {
      const itemQuad = rectPathToQuad(item);
      lineQuad = !lineQuad ? itemQuad : uniteQuads(lineQuad, itemQuad, isHorizontalFlow);
      itemQuads.push(itemQuad);
    }

    const extendedLineQuad =
        lines.length === 1 ? containerQuad : growQuadToEdgesOf(lineQuad, containerQuad, isHorizontalFlow);
    const extendItemQuads = itemQuads.map(itemQuad => growQuadToEdgesOf(itemQuad, extendedLineQuad, !isHorizontalFlow));

    lineQuads.push({
      quad: extendedLineQuad,
      items: extendItemQuads,
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
