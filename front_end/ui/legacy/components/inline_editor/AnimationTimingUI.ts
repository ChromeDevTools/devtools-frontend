// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../../core/platform/platform.js';
import * as UI from '../../legacy.js';

import {BezierUI} from './BezierUI.js';

import {type AnimationTimingModel} from './AnimationTimingModel.js';
import {CSSLinearEasingModel} from './CSSLinearEasingModel.js';

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

class LinearEasingUI {
  #cssLinearEasingModel: CSSLinearEasingModel;
  #container: HTMLElement;
  #element: HTMLElement;

  constructor({
    model,
    container,
  }: {
    model: CSSLinearEasingModel,
    container: HTMLElement,
  }) {
    this.#cssLinearEasingModel = model;
    this.#container = container;

    this.#element = document.createElement('div');
    this.#container.appendChild(this.#element);
  }

  setCSSLinearEasingModel(cssLinearEasingModel: CSSLinearEasingModel): void {
    this.#cssLinearEasingModel = cssLinearEasingModel;
    this.draw();
  }

  draw(): void {
    this.#element.textContent = this.#cssLinearEasingModel.asCSSText();
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
    this.#linearEasingContainer = document.createElement('div');

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

      this.#linearEasingContainer.classList.add('hidden');
      this.#bezierContainer.classList.remove('hidden');
    } else if (this.#model instanceof CSSLinearEasingModel) {
      if (this.#linearEasingUI) {
        this.#linearEasingUI.setCSSLinearEasingModel(this.#model);
      } else {
        this.#linearEasingUI = new LinearEasingUI({model: this.#model, container: this.#linearEasingContainer});
      }

      this.#linearEasingContainer.classList.remove('hidden');
      this.#bezierContainer.classList.add('hidden');
    }

    this.draw();
  }

  draw(): void {
    if (this.#bezierCurveUI) {
      this.#bezierCurveUI.draw();
    }

    if (this.#linearEasingUI) {
      this.#linearEasingUI.draw();
    }
  }
}
