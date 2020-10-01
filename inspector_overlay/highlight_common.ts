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

import {Bounds} from './common.js';

export type PathBounds = Bounds&{
  leftmostXForY: {[key: string]: number};
  rightmostXForY: {[key: string]: number};
  topmostYForX: {[key: string]: number};
  bottommostYForX: {[key: string]: number};
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
    maxX: Number.MIN_VALUE,
    maxY: Number.MIN_VALUE,
    leftmostXForY: {},
    rightmostXForY: {},
    topmostYForX: {},
    bottommostYForX: {},
    allPoints: [],
  };
  return bounds;
}

export function applyMatrixToPoint(point: {x: number; y: number;}, matrix: DOMMatrix): {x: number; y: number;} {
  let domPoint = new DOMPoint(point.x, point.y);
  domPoint = domPoint.matrixTransform(matrix);
  return {x: domPoint.x, y: domPoint.y};
}
