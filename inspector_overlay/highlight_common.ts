// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

//  Copyright (C) 2012 Google Inc. All rights reserved.

//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions
//  are met:

//  1.  Redistributions of source code must retain the above copyright
//      notice, this list of conditions and the following disclaimer.
//  2.  Redistributions in binary form must reproduce the above copyright
//      notice, this list of conditions and the following disclaimer in the
//      documentation and/or other materials provided with the distribution.
//  3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
//      its contributors may be used to endorse or promote products derived
//      from this software without specific prior written permission.

//  THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
//  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
//  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
//  DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
//  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
//  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
//  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
//  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
//  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
//  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

// eslint-disable-next-line rulesdir/es_modules_import
import {
  rgbaToHsla,
  rgbaToHwba,
  type Color4D,
} from '../front_end/core/common/ColorUtils.js';

import {type Bounds, type PathCommands, type Quad} from './common.js';

export type PathBounds = Bounds&{
  leftmostXForY: {[key: string]: number},
  rightmostXForY: {[key: string]: number},
  topmostYForX: {[key: string]: number},
  bottommostYForX: {[key: string]: number},
};

export interface LineStyle {
  color?: string;
  pattern?: LinePattern;
}

export interface BoxStyle {
  fillColor?: string;
  hatchColor?: string;
}

export const enum LinePattern {
  SOLID = 'solid',
  DOTTED = 'dotted',
  DASHED = 'dashed',
}

export function drawPathWithLineStyle(
    context: CanvasRenderingContext2D, path: Path2D, lineStyle?: LineStyle, lineWidth: number = 1) {
  if (lineStyle && lineStyle.color) {
    context.save();
    context.translate(0.5, 0.5);
    context.lineWidth = lineWidth;
    if (lineStyle.pattern === LinePattern.DASHED) {
      context.setLineDash([3, 3]);
    }
    if (lineStyle.pattern === LinePattern.DOTTED) {
      context.setLineDash([2, 2]);
    }
    context.strokeStyle = lineStyle.color;
    context.stroke(path);
    context.restore();
  }
}

export function fillPathWithBoxStyle(
    context: CanvasRenderingContext2D, path: Path2D, bounds: PathBounds, angle: number, boxStyle?: BoxStyle) {
  if (!boxStyle) {
    return;
  }

  context.save();
  if (boxStyle.fillColor) {
    context.fillStyle = boxStyle.fillColor;
    context.fill(path);
  }
  if (boxStyle.hatchColor) {
    hatchFillPath(context, path, bounds, 10, boxStyle.hatchColor, angle, false);
  }
  context.restore();
}

export function buildPath(commands: Array<string|number>, bounds: PathBounds, emulationScaleFactor: number): Path2D {
  let commandsIndex = 0;

  function extractPoints(count: number): number[] {
    const points = [];

    for (let i = 0; i < count; ++i) {
      const x = Math.round(commands[commandsIndex++] as number * emulationScaleFactor);
      bounds.maxX = Math.max(bounds.maxX, x);
      bounds.minX = Math.min(bounds.minX, x);

      const y = Math.round(commands[commandsIndex++] as number * emulationScaleFactor);
      bounds.maxY = Math.max(bounds.maxY, y);
      bounds.minY = Math.min(bounds.minY, y);

      bounds.leftmostXForY[y] = Math.min(bounds.leftmostXForY[y] || Number.MAX_VALUE, x);
      bounds.rightmostXForY[y] = Math.max(bounds.rightmostXForY[y] || Number.MIN_VALUE, x);
      bounds.topmostYForX[x] = Math.min(bounds.topmostYForX[x] || Number.MAX_VALUE, y);
      bounds.bottommostYForX[x] = Math.max(bounds.bottommostYForX[x] || Number.MIN_VALUE, y);

      bounds.allPoints.push({x, y});

      points.push(x, y);
    }

    return points;
  }

  const commandsLength = commands.length;
  const path = new Path2D();
  while (commandsIndex < commandsLength) {
    switch (commands[commandsIndex++]) {
      case 'M':
        path.moveTo.apply(path, extractPoints(1) as [number, number]);
        break;
      case 'L':
        path.lineTo.apply(path, extractPoints(1) as [number, number]);
        break;
      case 'C':
        path.bezierCurveTo.apply(path, extractPoints(3) as [number, number, number, number, number, number]);
        break;
      case 'Q':
        path.quadraticCurveTo.apply(path, extractPoints(2) as [number, number, number, number]);
        break;
      case 'Z':
        path.closePath();
        break;
    }
  }

  return path;
}

export function emptyBounds(): PathBounds {
  const bounds = {
    minX: Number.MAX_VALUE,
    minY: Number.MAX_VALUE,
    maxX: -Number.MAX_VALUE,
    maxY: -Number.MAX_VALUE,
    leftmostXForY: {},
    rightmostXForY: {},
    topmostYForX: {},
    bottommostYForX: {},
    allPoints: [],
  };
  return bounds;
}

export function applyMatrixToPoint(point: {x: number, y: number}, matrix: DOMMatrix): {x: number, y: number} {
  let domPoint = new DOMPoint(point.x, point.y);
  domPoint = domPoint.matrixTransform(matrix);
  return {x: domPoint.x, y: domPoint.y};
}

const HATCH_LINE_LENGTH = 5;
const HATCH_LINE_GAP = 3;
let hatchLinePattern: CanvasPattern;
let hatchLineColor: string = '';

/**
 * Draw line hatching at a 45 degree angle for a given
 * path.
 *   __________
 *   |\  \  \ |
 *   | \  \  \|
 *   |  \  \  |
 *   |\  \  \ |
 *   **********
 */
export function hatchFillPath(
    context: CanvasRenderingContext2D, path: Path2D, bounds: Bounds, delta: number, color: string,
    rotationAngle: number, flipDirection: boolean|undefined) {
  // Make the bounds be at most the canvas size if it is bigger in any direction.
  // Making the bounds bigger than the canvas is useless as what's drawn there won't be visible.
  if (context.canvas.width < bounds.maxX - bounds.minX || context.canvas.height < bounds.maxY - bounds.minY) {
    bounds = {
      minX: 0,
      maxX: context.canvas.width,
      minY: 0,
      maxY: context.canvas.height,
      allPoints: [],
    };
  }

  // If we haven't done it yet, initialize an offscreen canvas used to create the dashed line repeated pattern.
  if (!hatchLinePattern || color !== hatchLineColor) {
    hatchLineColor = color;

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = delta;
    offscreenCanvas.height = HATCH_LINE_LENGTH + HATCH_LINE_GAP;

    const offscreenCtx = offscreenCanvas.getContext('2d') as CanvasRenderingContext2D;
    offscreenCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
    offscreenCtx.rect(0, 0, 1, HATCH_LINE_LENGTH);
    offscreenCtx.fillStyle = color;
    offscreenCtx.fill();

    hatchLinePattern = context.createPattern(offscreenCanvas, 'repeat') as CanvasPattern;
  }

  context.save();

  const matrix = new DOMMatrix();
  hatchLinePattern.setTransform(matrix.scale(flipDirection ? -1 : 1, 1).rotate(0, 0, -45 + rotationAngle));

  context.fillStyle = hatchLinePattern;
  context.fill(path);

  context.restore();
}

/**
 * Given a quad, create the corresponding path object. This also accepts a list of quads to clip from the resulting
 * path.
 */
export function createPathForQuad(
    outerQuad: Quad, quadsToClip: Quad[], bounds: PathBounds, emulationScaleFactor: number) {
  let commands = [
    'M',
    outerQuad.p1.x,
    outerQuad.p1.y,
    'L',
    outerQuad.p2.x,
    outerQuad.p2.y,
    'L',
    outerQuad.p3.x,
    outerQuad.p3.y,
    'L',
    outerQuad.p4.x,
    outerQuad.p4.y,
  ];
  for (const quad of quadsToClip) {
    commands = [
      ...commands,    'L', quad.p4.x, quad.p4.y, 'L', quad.p3.x, quad.p3.y, 'L', quad.p2.x,
      quad.p2.y,      'L', quad.p1.x, quad.p1.y, 'L', quad.p4.x, quad.p4.y, 'L', outerQuad.p4.x,
      outerQuad.p4.y,
    ];
  }
  commands.push('Z');

  return buildPath(commands, bounds, emulationScaleFactor);
}

export function parseHexa(hexa: string): Color4D {
  return (hexa.match(/#(\w\w)(\w\w)(\w\w)(\w\w)/) || []).slice(1).map(c => parseInt(c, 16) / 255) as Color4D;
}

export function formatRgba(rgba: Color4D, colorFormat: 'rgb'|'hsl'|'hwb'): string {
  if (colorFormat === 'rgb') {
    const [r, g, b, a] = rgba;
    // rgb(r g b [ / a])
    return `rgb(${(r * 255).toFixed()} ${(g * 255).toFixed()} ${(b * 255).toFixed()}${
        a === 1 ? '' : ' / ' + Math.round(a * 100) / 100})`;
  }

  if (colorFormat === 'hsl') {
    const [h, s, l, a] = rgbaToHsla(rgba);
    // hsl(hdeg s l [ / a])
    return `hsl(${Math.round(h * 360)}deg ${Math.round(s * 100)} ${Math.round(l * 100)}${
        a === 1 ? '' : ' / ' + Math.round((a ?? 1) * 100) / 100})`;
  }

  if (colorFormat === 'hwb') {
    const [h, w, b, a] = rgbaToHwba(rgba);
    // hwb(hdeg w b [ / a])
    return `hwb(${Math.round(h * 360)}deg ${Math.round(w * 100)} ${Math.round(b * 100)}${
        a === 1 ? '' : ' / ' + Math.round((a ?? 1) * 100) / 100})`;
  }

  throw new Error('NOT_REACHED');
}

export function formatColor(hexa: string, colorFormat: string): string {
  if (colorFormat === 'rgb' || colorFormat === 'hsl' || colorFormat === 'hwb') {
    return formatRgba(parseHexa(hexa), colorFormat);
  }

  if (hexa.endsWith('FF')) {
    // short hex if no alpha
    return hexa.substr(0, 7);
  }

  return hexa;
}

export function drawPath(
    context: CanvasRenderingContext2D, commands: PathCommands, fillColor: string|undefined,
    outlineColor: string|undefined, outlinePattern: LinePattern|undefined, bounds: PathBounds,
    emulationScaleFactor: number) {
  context.save();
  const path = buildPath(commands, bounds, emulationScaleFactor);
  if (fillColor) {
    context.fillStyle = fillColor;
    context.fill(path);
  }
  if (outlineColor) {
    if (outlinePattern === LinePattern.DASHED) {
      context.setLineDash([3, 3]);
    }
    if (outlinePattern === LinePattern.DOTTED) {
      context.setLineDash([2, 2]);
    }
    context.lineWidth = 2;
    context.strokeStyle = outlineColor;
    context.stroke(path);
  }
  context.restore();
  return path;
}
