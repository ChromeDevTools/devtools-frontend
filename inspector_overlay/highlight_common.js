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


// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

const DEFAULT_RULER_COLOR = 'rgba(128, 128, 128, 0.3)';

export function drawRulers(context, bounds, rulerAtRight, rulerAtBottom, color, dash) {
  context.save();
  const width = canvasWidth;
  const height = canvasHeight;
  context.strokeStyle = color || DEFAULT_RULER_COLOR;
  context.lineWidth = 1;
  context.translate(0.5, 0.5);
  if (dash) {
    context.setLineDash([3, 3]);
  }

  if (rulerAtRight) {
    for (const y in bounds.rightmostXForY) {
      context.beginPath();
      context.moveTo(width, y);
      context.lineTo(bounds.rightmostXForY[y], y);
      context.stroke();
    }
  } else {
    for (const y in bounds.leftmostXForY) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(bounds.leftmostXForY[y], y);
      context.stroke();
    }
  }

  if (rulerAtBottom) {
    for (const x in bounds.bottommostYForX) {
      context.beginPath();
      context.moveTo(x, height);
      context.lineTo(x, bounds.topmostYForX[x]);
      context.stroke();
    }
  } else {
    for (const x in bounds.topmostYForX) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, bounds.topmostYForX[x]);
      context.stroke();
    }
  }

  context.restore();
}

export function buildPath(commands, bounds) {
  let commandsIndex = 0;

  function extractPoints(count) {
    const points = [];

    for (let i = 0; i < count; ++i) {
      const x = Math.round(commands[commandsIndex++] * emulationScaleFactor);
      bounds.maxX = Math.max(bounds.maxX, x);
      bounds.minX = Math.min(bounds.minX, x);

      const y = Math.round(commands[commandsIndex++] * emulationScaleFactor);
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
        path.moveTo.apply(path, extractPoints(1));
        break;
      case 'L':
        path.lineTo.apply(path, extractPoints(1));
        break;
      case 'C':
        path.bezierCurveTo.apply(path, extractPoints(3));
        break;
      case 'Q':
        path.quadraticCurveTo.apply(path, extractPoints(2));
        break;
      case 'Z':
        path.closePath();
        break;
    }
  }

  return path;
}

export function emptyBounds() {
  const bounds = {
    minX: Number.MAX_VALUE,
    minY: Number.MAX_VALUE,
    maxX: Number.MIN_VALUE,
    maxY: Number.MIN_VALUE,
    leftmostXForY: {},
    rightmostXForY: {},
    topmostYForX: {},
    bottommostYForX: {},
    allPoints: []
  };
  return bounds;
}

/**
 * @param {{x: number, y: number}} point
 * @param {DOMMatrix} matrix
 * @return {{x: number, y: number}}
 */
export function applyMatrixToPoint(point, matrix) {
  point = new DOMPoint(point.x, point.y);
  point = point.matrixTransform(matrix);
  return {x: point.x, y: point.y};
}
