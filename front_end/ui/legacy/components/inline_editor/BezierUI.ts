// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../../legacy.js';

interface Params {
  width: number;
  height: number;
  marginTop: number;
  controlPointRadius: number;
  shouldDrawLine: boolean;
}

export class BezierUI {
  width: number;
  height: number;
  marginTop: number;
  radius: number;
  shouldDrawLine: boolean;

  constructor({width, height, marginTop, controlPointRadius, shouldDrawLine}: Params) {
    this.width = width;
    this.height = height;
    this.marginTop = marginTop;
    this.radius = controlPointRadius;
    this.shouldDrawLine = shouldDrawLine;
  }

  static drawVelocityChart(bezier: UI.Geometry.CubicBezier, path: Element, width: number): void {
    const height = Height;
    let pathBuilder: (string|number)[]|(string | number)[] = ['M', 0, height];
    /** @const */ const sampleSize = 1 / 40;

    let prev = bezier.evaluateAt(0);
    for (let t = sampleSize; t < 1 + sampleSize; t += sampleSize) {
      const current = bezier.evaluateAt(t);
      let slope: number = (current.y - prev.y) / (current.x - prev.x);
      const weightedX = prev.x * (1 - t) + current.x * t;
      slope = Math.tanh(slope / 1.5);  // Normalise slope
      pathBuilder = pathBuilder.concat(['L', (weightedX * width).toFixed(2), (height - slope * height).toFixed(2)]);
      prev = current;
    }
    pathBuilder = pathBuilder.concat(['L', width.toFixed(2), height, 'Z']);
    path.setAttribute('d', pathBuilder.join(' '));
  }

  curveWidth(): number {
    return this.width - this.radius * 2;
  }

  curveHeight(): number {
    return this.height - this.radius * 2 - this.marginTop * 2;
  }

  private drawLine(parentElement: Element, className: string, x1: number, y1: number, x2: number, y2: number): void {
    const line = UI.UIUtils.createSVGChild(parentElement, 'line', className);
    line.setAttribute('x1', String(x1 + this.radius));
    line.setAttribute('y1', String(y1 + this.radius + this.marginTop));
    line.setAttribute('x2', String(x2 + this.radius));
    line.setAttribute('y2', String(y2 + this.radius + this.marginTop));
  }

  private drawControlPoints(parentElement: Element, startX: number, startY: number, controlX: number, controlY: number):
      void {
    this.drawLine(parentElement, 'bezier-control-line', startX, startY, controlX, controlY);
    const circle = UI.UIUtils.createSVGChild(parentElement, 'circle', 'bezier-control-circle');
    circle.setAttribute('cx', String(controlX + this.radius));
    circle.setAttribute('cy', String(controlY + this.radius + this.marginTop));
    circle.setAttribute('r', String(this.radius));
  }

  drawCurve(bezier: UI.Geometry.CubicBezier|null, svg: Element): void {
    if (!bezier) {
      return;
    }
    const width = this.curveWidth();
    const height = this.curveHeight();
    svg.setAttribute('width', String(this.width));
    svg.setAttribute('height', String(this.height));
    svg.removeChildren();
    const group = UI.UIUtils.createSVGChild(svg, 'g');

    if (this.shouldDrawLine) {
      this.drawLine(group, 'linear-line', 0, height, width, 0);
    }

    const curve = UI.UIUtils.createSVGChild(group, 'path', 'bezier-path');
    const curvePoints = [
      new UI.Geometry.Point(
          bezier.controlPoints[0].x * width + this.radius,
          (1 - bezier.controlPoints[0].y) * height + this.radius + this.marginTop),
      new UI.Geometry.Point(
          bezier.controlPoints[1].x * width + this.radius,
          (1 - bezier.controlPoints[1].y) * height + this.radius + this.marginTop),
      new UI.Geometry.Point(width + this.radius, this.marginTop + this.radius),
    ];
    curve.setAttribute(
        'd', 'M' + this.radius + ',' + (height + this.radius + this.marginTop) + ' C' + curvePoints.join(' '));

    this.drawControlPoints(
        group, 0, height, bezier.controlPoints[0].x * width, (1 - bezier.controlPoints[0].y) * height);
    this.drawControlPoints(
        group, width, 0, bezier.controlPoints[1].x * width, (1 - bezier.controlPoints[1].y) * height);
  }
}

export const Height = 26;
