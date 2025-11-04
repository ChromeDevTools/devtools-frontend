// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Platform from '../../../../core/platform/platform.js';
import * as Geometry from '../../../../models/geometry/geometry.js';
import * as VisualLogging from '../../../visual_logging/visual_logging.js';
import * as UI from '../../legacy.js';
import { BezierUI } from './BezierUI.js';
import { CSSLinearEasingModel } from './CSSLinearEasingModel.js';
const DOUBLE_CLICK_DELAY = 500;
class BezierCurveUI {
    #curveUI;
    #bezier;
    #curve;
    #mouseDownPosition;
    #controlPosition;
    #selectedPoint;
    #onBezierChange;
    constructor({ bezier, container, onBezierChange }) {
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
        UI.UIUtils.installDragHandle(this.#curve, this.dragStart.bind(this), this.dragMove.bind(this), this.dragEnd.bind(this), 'default');
    }
    dragStart(event) {
        this.#mouseDownPosition = new Geometry.Point(event.x, event.y);
        const ui = this.#curveUI;
        this.#controlPosition = new Geometry.Point(Platform.NumberUtilities.clamp((event.offsetX - ui.radius) / ui.curveWidth(), 0, 1), (ui.curveHeight() + ui.marginTop + ui.radius - event.offsetY) / ui.curveHeight());
        const firstControlPointIsCloser = this.#controlPosition.distanceTo(this.#bezier.controlPoints[0]) <
            this.#controlPosition.distanceTo(this.#bezier.controlPoints[1]);
        this.#selectedPoint = firstControlPointIsCloser ? 0 : 1;
        this.#bezier.controlPoints[this.#selectedPoint] = this.#controlPosition;
        this.#onBezierChange(this.#bezier);
        event.consume(true);
        return true;
    }
    updateControlPosition(mouseX, mouseY) {
        if (this.#mouseDownPosition === undefined || this.#controlPosition === undefined ||
            this.#selectedPoint === undefined) {
            return;
        }
        const deltaX = (mouseX - this.#mouseDownPosition.x) / this.#curveUI.curveWidth();
        const deltaY = (mouseY - this.#mouseDownPosition.y) / this.#curveUI.curveHeight();
        const newPosition = new Geometry.Point(Platform.NumberUtilities.clamp(this.#controlPosition.x + deltaX, 0, 1), this.#controlPosition.y - deltaY);
        this.#bezier.controlPoints[this.#selectedPoint] = newPosition;
    }
    dragMove(event) {
        this.updateControlPosition(event.x, event.y);
        this.#onBezierChange(this.#bezier);
    }
    dragEnd(event) {
        this.updateControlPosition(event.x, event.y);
        this.#onBezierChange(this.#bezier);
    }
    setBezier(bezier) {
        this.#bezier = bezier;
        this.draw();
    }
    draw() {
        this.#curveUI.drawCurve(this.#bezier, this.#curve);
    }
}
class LinearEasingPresentation {
    params;
    renderedPositions;
    constructor(params) {
        this.params = params;
    }
    #curveWidth() {
        return this.params.width - this.params.pointRadius * 2;
    }
    #curveHeight() {
        return this.params.height - this.params.pointRadius * 2 - this.params.marginTop * 2;
    }
    #drawControlPoint(parentElement, controlX, controlY, index) {
        const circle = UI.UIUtils.createSVGChild(parentElement, 'circle', 'bezier-control-circle');
        circle.setAttribute('jslog', `${VisualLogging.controlPoint('bezier.linear-control-circle').track({ drag: true, dblclick: true })}`);
        circle.setAttribute('data-point-index', String(index));
        circle.setAttribute('cx', String(controlX));
        circle.setAttribute('cy', String(controlY));
        circle.setAttribute('r', String(this.params.pointRadius));
    }
    timingPointToPosition(point) {
        return {
            x: (point.input / 100) * this.#curveWidth() + this.params.pointRadius,
            y: (1 - point.output) * this.#curveHeight() + this.params.pointRadius,
        };
    }
    positionToTimingPoint(position) {
        return {
            input: ((position.x - this.params.pointRadius) / this.#curveWidth()) * 100,
            output: 1 - (position.y - this.params.pointRadius) / this.#curveHeight(),
        };
    }
    draw(linearEasingModel, svg) {
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
    #model;
    #onChange;
    #presentation;
    #selectedPointIndex;
    #doubleClickTimer;
    #pointIndexForDoubleClick;
    #mouseDownPosition;
    #svg;
    constructor({ model, container, onChange, }) {
        this.#model = model;
        this.#onChange = onChange;
        this.#presentation = new LinearEasingPresentation({
            width: 150,
            height: 250,
            pointRadius: 7,
            marginTop: 50,
        });
        this.#svg = UI.UIUtils.createSVGChild(container, 'svg', 'bezier-curve linear');
        UI.UIUtils.installDragHandle(this.#svg, this.#dragStart.bind(this), this.#dragMove.bind(this), this.#dragEnd.bind(this), 'default');
    }
    #handleLineClick(event, lineIndex) {
        const newPoint = this.#presentation.positionToTimingPoint({ x: event.offsetX, y: event.offsetY });
        this.#model.addPoint(newPoint, lineIndex);
        this.#selectedPointIndex = undefined;
        this.#mouseDownPosition = undefined;
    }
    #handleControlPointClick(event, pointIndex) {
        this.#selectedPointIndex = pointIndex;
        this.#mouseDownPosition = { x: event.x, y: event.y };
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
    #dragStart(event) {
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
    #updatePointPosition(mouseX, mouseY) {
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
    #dragMove(event) {
        this.#updatePointPosition(event.x, event.y);
        this.#onChange(this.#model);
    }
    #dragEnd(event) {
        this.#updatePointPosition(event.x, event.y);
        this.#onChange(this.#model);
    }
    setCSSLinearEasingModel(model) {
        this.#model = model;
        this.draw();
    }
    draw() {
        this.#presentation.draw(this.#model, this.#svg);
    }
}
export class PresetUI {
    #linearEasingPresentation;
    #bezierPresentation;
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
    draw(model, svg) {
        if (model instanceof CSSLinearEasingModel) {
            this.#linearEasingPresentation.draw(model, svg);
        }
        else if (model instanceof Geometry.CubicBezier) {
            this.#bezierPresentation.drawCurve(model, svg);
        }
    }
}
export class AnimationTimingUI {
    #container;
    #bezierContainer;
    #linearEasingContainer;
    #model;
    #onChange;
    #bezierCurveUI;
    #linearEasingUI;
    constructor({ model, onChange }) {
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
        if (this.#model instanceof Geometry.CubicBezier) {
            this.#bezierCurveUI =
                new BezierCurveUI({ bezier: this.#model, container: this.#bezierContainer, onBezierChange: this.#onChange });
        }
        else if (this.#model instanceof CSSLinearEasingModel) {
            this.#linearEasingUI = new LinearEasingUI({
                model: this.#model,
                container: this.#linearEasingContainer,
                onChange: this.#onChange,
            });
        }
    }
    element() {
        return this.#container;
    }
    setModel(model) {
        this.#model = model;
        if (this.#model instanceof Geometry.CubicBezier) {
            if (this.#bezierCurveUI) {
                this.#bezierCurveUI.setBezier(this.#model);
            }
            else {
                this.#bezierCurveUI =
                    new BezierCurveUI({ bezier: this.#model, container: this.#bezierContainer, onBezierChange: this.#onChange });
            }
        }
        else if (this.#model instanceof CSSLinearEasingModel) {
            if (this.#linearEasingUI) {
                this.#linearEasingUI.setCSSLinearEasingModel(this.#model);
            }
            else {
                this.#linearEasingUI =
                    new LinearEasingUI({ model: this.#model, container: this.#linearEasingContainer, onChange: this.#onChange });
            }
        }
        this.draw();
    }
    draw() {
        this.#linearEasingContainer.classList.toggle('hidden', !(this.#model instanceof CSSLinearEasingModel));
        this.#bezierContainer.classList.toggle('hidden', !(this.#model instanceof Geometry.CubicBezier));
        if (this.#bezierCurveUI) {
            this.#bezierCurveUI.draw();
        }
        if (this.#linearEasingUI) {
            this.#linearEasingUI.draw();
        }
    }
}
//# sourceMappingURL=AnimationTimingUI.js.map