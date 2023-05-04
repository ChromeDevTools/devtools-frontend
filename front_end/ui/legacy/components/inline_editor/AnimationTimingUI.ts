// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../../core/platform/platform.js';
import * as UI from '../../legacy.js';

import {BezierUI} from './BezierUI.js';

import {type AnimationTimingModel} from './AnimationTimingModel.js';
import {type Point, CSSLinearEasingModel} from './CSSLinearEasingModel.js';

const DOUBLE_CLICK_DELAY = 500;

type Params = {
  container: Element,
  bezier: UI.Geometry.CubicBezier,
  onBezierChange: (bezier: UI.Geometry.CubicBezier) => void,
};

class BezierCurveUI {
  #curveUI: BezierUI;
  #bezier: UI.Geometry.CubicBezier;
  #curve: Element;
  #mouseDownPosition?: UI.Geometry.Point;
  #controlPosition?: UI.Geometry.Point;
  #selectedPoint?: number;
  #onBezierChange: (bezier: UI.Geometry.CubicBezier) => void;

  constructor({bezier, container, onBezierChange}: Params) {
    this.#bezier = bezier;
    this.#curveUI = new BezierUI({
      width: 150,
      height: 250,
      marginTop: 50,
      controlPointRadius: 7,
      shouldDrawLine: true,
    });

    this.#curve = UI.UIUtils.createSVGChild(container, 'svg', 'bezier-curve');
    this.#onBezierChange = onBezierChange;

    UI.UIUtils.installDragHandle(
        this.#curve, this.dragStart.bind(this), this.dragMove.bind(this), this.dragEnd.bind(this), 'default');
  }

  private dragStart(event: MouseEvent): boolean {
    this.#mouseDownPosition = new UI.Geometry.Point(event.x, event.y);
    const ui = this.#curveUI;
    this.#controlPosition = new UI.Geometry.Point(
        Platform.NumberUtilities.clamp((event.offsetX - ui.radius) / ui.curveWidth(), 0, 1),
        (ui.curveHeight() + ui.marginTop + ui.radius - event.offsetY) / ui.curveHeight());

    const firstControlPointIsCloser = this.#controlPosition.distanceTo(this.#bezier.controlPoints[0]) <
        this.#controlPosition.distanceTo(this.#bezier.controlPoints[1]);
    this.#selectedPoint = firstControlPointIsCloser ? 0 : 1;

    this.#bezier.controlPoints[this.#selectedPoint] = this.#controlPosition;
    this.#onBezierChange(this.#bezier);

    event.consume(true);
    return true;
  }

  private updateControlPosition(mouseX: number, mouseY: number): void {
    if (this.#mouseDownPosition === undefined || this.#controlPosition === undefined ||
        this.#selectedPoint === undefined) {
      return;
    }
    const deltaX = (mouseX - this.#mouseDownPosition.x) / this.#curveUI.curveWidth();
    const deltaY = (mouseY - this.#mouseDownPosition.y) / this.#curveUI.curveHeight();
    const newPosition = new UI.Geometry.Point(
        Platform.NumberUtilities.clamp(this.#controlPosition.x + deltaX, 0, 1), this.#controlPosition.y - deltaY);
    this.#bezier.controlPoints[this.#selectedPoint] = newPosition;
  }

  private dragMove(event: MouseEvent): void {
    this.updateControlPosition(event.x, event.y);
    this.#onBezierChange(this.#bezier);
  }

  private dragEnd(event: MouseEvent): void {
    this.updateControlPosition(event.x, event.y);
    this.#onBezierChange(this.#bezier);
  }

  setBezier(bezier: UI.Geometry.CubicBezier): void {
    this.#bezier = bezier;
    this.draw();
  }

  draw(): void {
    this.#curveUI.drawCurve(this.#bezier, this.#curve);
  }
}

type LinearEasingPresentationParams = {
  width: number,
  height: number,
  marginTop: number,
  pointRadius: number,
};
type Position = {
  x: number,
  y: number,
};
class LinearEasingPresentation {
  params: LinearEasingPresentationParams;
  renderedPositions?: Position[];

  constructor(params: LinearEasingPresentationParams) {
    this.params = params;
  }

  #curveWidth(): number {
    return this.params.width - this.params.pointRadius * 2;
  }

  #curveHeight(): number {
    return this.params.height - this.params.pointRadius * 2 - this.params.marginTop * 2;
  }

  #drawControlPoint(parentElement: Element, controlX: number, controlY: number, index: number): void {
    const circle = UI.UIUtils.createSVGChild(parentElement, 'circle', 'bezier-control-circle');
    circle.setAttribute('data-point-index', String(index));
    circle.setAttribute('cx', String(controlX));
    circle.setAttribute('cy', String(controlY));
    circle.setAttribute('r', String(this.params.pointRadius));
  }

  timingPointToPosition(point: Point): Position {
    return {
      x: (point.input / 100) * this.#curveWidth() + this.params.pointRadius,
      y: (1 - point.output) * this.#curveHeight() + this.params.pointRadius,
    };
  }

  positionToTimingPoint(position: Position): Point {
    return {
      input: ((position.x - this.params.pointRadius) / this.#curveWidth()) * 100,
      output: 1 - (position.y - this.params.pointRadius) / this.#curveHeight(),
    };
  }

  draw(linearEasingModel: CSSLinearEasingModel, svg: Element): void {
    svg.setAttribute('width', String(this.#curveWidth()));
    svg.setAttribute('height', String(this.#curveHeight()));
    svg.removeChildren();
    const group = UI.UIUtils.createSVGChild(svg, 'g');

    const positions = linearEasingModel.points().map(point => this.timingPointToPosition(point));
    this.renderedPositions = positions;
    let startingPoint = positions[0];
    for (let i = 1; i < positions.length; i++) {
      const position = positions[i];
      const line = UI.UIUtils.createSVGChild(group, 'path', 'bezier-path linear-path');
      line.setAttribute('d', `M ${startingPoint.x} ${startingPoint.y} L ${position.x} ${position.y}`);
      line.setAttribute('data-line-index', String(i));
      startingPoint = position;
    }

    for (let i = 0; i < positions.length; i++) {
      const point = positions[i];
      this.#drawControlPoint(group, point.x, point.y, i);
    }
  }
}

class LinearEasingUI {
  #model: CSSLinearEasingModel;
  #onChange: (model: CSSLinearEasingModel) => void;
  #presentation: LinearEasingPresentation;
  #selectedPointIndex?: number;
  #doubleClickTimer?: number;
  #pointIndexForDoubleClick?: number;
  #mouseDownPosition?: {x: number, y: number};

  #svg: Element;

  constructor({
    model,
    container,
    onChange,
  }: {
    model: CSSLinearEasingModel,
    container: HTMLElement,
    onChange: (model: CSSLinearEasingModel) => void,
  }) {
    this.#model = model;
    this.#onChange = onChange;
    this.#presentation = new LinearEasingPresentation({
      width: 150,
      height: 250,
      pointRadius: 7,
      marginTop: 50,
    });
    this.#svg = UI.UIUtils.createSVGChild(container, 'svg', 'bezier-curve linear');

    UI.UIUtils.installDragHandle(
        this.#svg, this.#dragStart.bind(this), this.#dragMove.bind(this), this.#dragEnd.bind(this), 'default');
  }

  #handleLineClick(event: MouseEvent, lineIndex: number): void {
    const newPoint = this.#presentation.positionToTimingPoint({x: event.offsetX, y: event.offsetY});
    this.#model.addPoint(newPoint, lineIndex);
    this.#selectedPointIndex = undefined;
    this.#mouseDownPosition = undefined;
  }

  #handleControlPointClick(event: MouseEvent, pointIndex: number): void {
    this.#selectedPointIndex = pointIndex;
    this.#mouseDownPosition = {x: event.x, y: event.y};

    // This is a workaround to understand whether the user double clicked
    // a point or not. The reason is, we also want to handle drag interactions
    // for the point and the way we install drag handlers (starting with mousedown event)
    // doesn't allow us to register a `dblclick` handler. So, we're checking
    // whether user double clicked (or mouse downed) a point with a timer.
    // `#pointIndexForDoubleClick` holds the point clicked in a double click
    // delay time frame. We reset that point after
    // the DOUBLE_CLICK_DELAY time has passed.
    clearTimeout(this.#doubleClickTimer);
    if (this.#pointIndexForDoubleClick === this.#selectedPointIndex) {
      this.#model.removePoint(this.#selectedPointIndex);
      this.#pointIndexForDoubleClick = undefined;
      this.#selectedPointIndex = undefined;
      this.#mouseDownPosition = undefined;
      return;
    }

    this.#pointIndexForDoubleClick = this.#selectedPointIndex;
    this.#doubleClickTimer = window.setTimeout(() => {
      this.#pointIndexForDoubleClick = undefined;
    }, DOUBLE_CLICK_DELAY);
  }

  #dragStart(event: MouseEvent): boolean {
    if (!(event.target instanceof SVGElement)) {
      return false;
    }

    if (event.target.dataset.lineIndex !== undefined) {
      this.#handleLineClick(event, Number(event.target.dataset.lineIndex));
      event.consume(true);
      return true;
    }

    if (event.target.dataset.pointIndex !== undefined) {
      this.#handleControlPointClick(event, Number(event.target.dataset.pointIndex));
      event.consume(true);
      return true;
    }

    return false;
  }

  #updatePointPosition(mouseX: number, mouseY: number): void {
    if (this.#selectedPointIndex === undefined || this.#mouseDownPosition === undefined) {
      return;
    }

    const controlPosition = this.#presentation.renderedPositions?.[this.#selectedPointIndex];
    if (!controlPosition) {
      return;
    }

    const deltaX = mouseX - this.#mouseDownPosition.x;
    const deltaY = mouseY - this.#mouseDownPosition.y;

    this.#mouseDownPosition = {
      x: mouseX,
      y: mouseY,
    };

    const newPoint = {
      x: controlPosition.x + deltaX,
      y: controlPosition.y + deltaY,
    };

    this.#model.setPoint(this.#selectedPointIndex, this.#presentation.positionToTimingPoint(newPoint));
  }

  #dragMove(event: MouseEvent): void {
    this.#updatePointPosition(event.x, event.y);
    this.#onChange(this.#model);
  }

  #dragEnd(event: MouseEvent): void {
    this.#updatePointPosition(event.x, event.y);
    this.#onChange(this.#model);
  }

  setCSSLinearEasingModel(model: CSSLinearEasingModel): void {
    this.#model = model;
    this.draw();
  }

  draw(): void {
    this.#presentation.draw(this.#model, this.#svg);
  }
}

export class PresetUI {
  #linearEasingPresentation: LinearEasingPresentation;
  #bezierPresentation: BezierUI;

  constructor() {
    this.#linearEasingPresentation = new LinearEasingPresentation({
      width: 40,
      height: 40,
      marginTop: 0,
      pointRadius: 2,
    });

    this.#bezierPresentation = new BezierUI({
      width: 40,
      height: 40,
      marginTop: 0,
      controlPointRadius: 2,
      shouldDrawLine: false,
    });
  }

  draw(model: AnimationTimingModel, svg: Element): void {
    if (model instanceof CSSLinearEasingModel) {
      this.#linearEasingPresentation.draw(model, svg);
    } else if (model instanceof UI.Geometry.CubicBezier) {
      this.#bezierPresentation.drawCurve(model, svg);
    }
  }
}

interface AnimationTimingUIParams {
  model: AnimationTimingModel;
  onChange: (model: AnimationTimingModel) => void;
}
export class AnimationTimingUI {
  #container: HTMLElement;
  #bezierContainer: HTMLElement;
  #linearEasingContainer: HTMLElement;
  #model: AnimationTimingModel;
  #onChange: (model: AnimationTimingModel) => void;
  #bezierCurveUI?: BezierCurveUI;
  #linearEasingUI?: LinearEasingUI;

  constructor({model, onChange}: AnimationTimingUIParams) {
    this.#container = document.createElement('div');
    this.#container.className = 'animation-timing-ui';
    this.#container.style.width = '150px';
    this.#container.style.height = '250px';

    this.#bezierContainer = document.createElement('div');
    this.#bezierContainer.classList.add('bezier-ui-container');
    this.#linearEasingContainer = document.createElement('div');
    this.#linearEasingContainer.classList.add('linear-easing-ui-container');

    this.#container.appendChild(this.#bezierContainer);
    this.#container.appendChild(this.#linearEasingContainer);

    this.#model = model;
    this.#onChange = onChange;

    if (this.#model instanceof UI.Geometry.CubicBezier) {
      this.#bezierCurveUI =
          new BezierCurveUI({bezier: this.#model, container: this.#bezierContainer, onBezierChange: this.#onChange});
    } else if (this.#model instanceof CSSLinearEasingModel) {
      this.#linearEasingUI = new LinearEasingUI({
        model: this.#model,
        container: this.#linearEasingContainer,
        onChange: this.#onChange,
      });
    }
  }

  element(): Element {
    return this.#container;
  }

  setModel(model: AnimationTimingModel): void {
    this.#model = model;
    if (this.#model instanceof UI.Geometry.CubicBezier) {
      if (this.#bezierCurveUI) {
        this.#bezierCurveUI.setBezier(this.#model);
      } else {
        this.#bezierCurveUI =
            new BezierCurveUI({bezier: this.#model, container: this.#bezierContainer, onBezierChange: this.#onChange});
      }
    } else if (this.#model instanceof CSSLinearEasingModel) {
      if (this.#linearEasingUI) {
        this.#linearEasingUI.setCSSLinearEasingModel(this.#model);
      } else {
        this.#linearEasingUI =
            new LinearEasingUI({model: this.#model, container: this.#linearEasingContainer, onChange: this.#onChange});
      }
    }

    this.draw();
  }

  draw(): void {
    this.#linearEasingContainer.classList.toggle('hidden', !(this.#model instanceof CSSLinearEasingModel));
    this.#bezierContainer.classList.toggle('hidden', !(this.#model instanceof UI.Geometry.CubicBezier));

    if (this.#bezierCurveUI) {
      this.#bezierCurveUI.draw();
    }

    if (this.#linearEasingUI) {
      this.#linearEasingUI.draw();
    }
  }
}
