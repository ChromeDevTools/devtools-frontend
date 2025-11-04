var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/legacy/components/inline_editor/AnimationTimingModel.js
var AnimationTimingModel_exports = {};
__export(AnimationTimingModel_exports, {
  AnimationTimingModel: () => AnimationTimingModel,
  LINEAR_BEZIER: () => LINEAR_BEZIER2
});
import * as Geometry from "./../../../../models/geometry/geometry.js";

// gen/front_end/ui/legacy/components/inline_editor/CSSLinearEasingModel.js
var CSSLinearEasingModel_exports = {};
__export(CSSLinearEasingModel_exports, {
  CSSLinearEasingModel: () => CSSLinearEasingModel
});
import * as CodeMirror from "./../../../../third_party/codemirror.next/codemirror.next.js";
var cssParser = CodeMirror.css.cssLanguage.parser;
var numberFormatter = new Intl.NumberFormat("en", {
  maximumFractionDigits: 2
});
function findNextDefinedInputIndex(points, currentIndex) {
  for (let i = currentIndex; i < points.length; i++) {
    if (!isNaN(points[i].input)) {
      return i;
    }
  }
  return -1;
}
function consumeLinearStop(cursor, referenceText) {
  const tokens = [];
  while (cursor.type.name !== "," && cursor.type.name !== ")") {
    const token = referenceText.substring(cursor.from, cursor.to);
    if (cursor.type.name !== "NumberLiteral") {
      return null;
    }
    tokens.push(token);
    cursor.next(false);
  }
  if (tokens.length > 3) {
    return null;
  }
  const percentages = tokens.filter((token) => token.includes("%"));
  if (percentages.length > 2) {
    return null;
  }
  const numbers = tokens.filter((token) => !token.includes("%"));
  if (numbers.length !== 1) {
    return null;
  }
  return {
    number: Number(numbers[0]),
    lengthA: percentages[0] ? Number(percentages[0].substring(0, percentages[0].length - 1)) : void 0,
    lengthB: percentages[1] ? Number(percentages[1].substring(0, percentages[1].length - 1)) : void 0
  };
}
function consumeLinearFunction(text) {
  const textToParse = `*{--a: ${text}}`;
  const parsed = cssParser.parse(textToParse);
  const cursor = parsed.cursorAt(textToParse.indexOf(":") + 1);
  while (cursor.name !== "ArgList" && cursor.next(true)) {
    if (cursor.name === "Callee" && textToParse.substring(cursor.from, cursor.to) !== "linear") {
      return null;
    }
  }
  if (cursor.name !== "ArgList") {
    return null;
  }
  cursor.firstChild();
  const stops = [];
  while (cursor.type.name !== ")" && cursor.next(false)) {
    const linearStop = consumeLinearStop(cursor, textToParse);
    if (!linearStop) {
      return null;
    }
    stops.push(linearStop);
  }
  return stops;
}
var KeywordToValue = {
  linear: "linear(0 0%, 1 100%)"
};
var CSSLinearEasingModel = class _CSSLinearEasingModel {
  #points;
  constructor(points) {
    this.#points = points;
  }
  // https://w3c.github.io/csswg-drafts/css-easing/#linear-easing-function-parsing
  static parse(text) {
    if (KeywordToValue[text]) {
      return _CSSLinearEasingModel.parse(KeywordToValue[text]);
    }
    const stops = consumeLinearFunction(text);
    if (!stops || stops.length < 2) {
      return null;
    }
    let largestInput = -Infinity;
    const points = [];
    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      const point = { input: NaN, output: stop.number };
      points.push(point);
      if (stop.lengthA !== void 0) {
        point.input = Math.max(stop.lengthA, largestInput);
        largestInput = point.input;
        if (stop.lengthB !== void 0) {
          const extraPoint = { input: NaN, output: point.output };
          points.push(extraPoint);
          extraPoint.input = Math.max(stop.lengthB, largestInput);
          largestInput = extraPoint.input;
        }
      } else if (i === 0) {
        point.input = 0;
        largestInput = 0;
      } else if (i === stops.length - 1) {
        point.input = Math.max(100, largestInput);
      }
    }
    let upperIndex = 0;
    for (let i = 1; i < points.length; i++) {
      if (isNaN(points[i].input)) {
        if (i > upperIndex) {
          upperIndex = findNextDefinedInputIndex(points, i);
        }
        points[i].input = points[i - 1].input + (points[upperIndex].input - points[i - 1].input) / (upperIndex - (i - 1));
      }
    }
    return new _CSSLinearEasingModel(points);
  }
  addPoint(point, index) {
    if (index !== void 0) {
      this.#points.splice(index, 0, point);
      return;
    }
    this.#points.push(point);
  }
  removePoint(index) {
    this.#points.splice(index, 1);
  }
  setPoint(index, point) {
    this.#points[index] = point;
  }
  points() {
    return this.#points;
  }
  asCSSText() {
    const args = this.#points.map((point) => `${numberFormatter.format(point.output)} ${numberFormatter.format(point.input)}%`).join(", ");
    const text = `linear(${args})`;
    for (const [keyword, value2] of Object.entries(KeywordToValue)) {
      if (value2 === text) {
        return keyword;
      }
    }
    return text;
  }
};

// gen/front_end/ui/legacy/components/inline_editor/AnimationTimingModel.js
var AnimationTimingModel = class {
  static parse(text) {
    const cssLinearEasingModel = CSSLinearEasingModel.parse(text);
    if (cssLinearEasingModel) {
      return cssLinearEasingModel;
    }
    return Geometry.CubicBezier.parse(text) || null;
  }
};
var LINEAR_BEZIER2 = Geometry.LINEAR_BEZIER;

// gen/front_end/ui/legacy/components/inline_editor/AnimationTimingUI.js
var AnimationTimingUI_exports = {};
__export(AnimationTimingUI_exports, {
  AnimationTimingUI: () => AnimationTimingUI,
  PresetUI: () => PresetUI
});
import * as Platform from "./../../../../core/platform/platform.js";
import * as Geometry3 from "./../../../../models/geometry/geometry.js";
import * as VisualLogging2 from "./../../../visual_logging/visual_logging.js";
import * as UI2 from "./../../legacy.js";

// gen/front_end/ui/legacy/components/inline_editor/BezierUI.js
var BezierUI_exports = {};
__export(BezierUI_exports, {
  BezierUI: () => BezierUI,
  Height: () => Height
});
import * as Geometry2 from "./../../../../models/geometry/geometry.js";
import * as VisualLogging from "./../../../visual_logging/visual_logging.js";
import * as UI from "./../../legacy.js";
var BezierUI = class {
  width;
  height;
  marginTop;
  radius;
  shouldDrawLine;
  constructor({ width, height, marginTop, controlPointRadius, shouldDrawLine }) {
    this.width = width;
    this.height = height;
    this.marginTop = marginTop;
    this.radius = controlPointRadius;
    this.shouldDrawLine = shouldDrawLine;
  }
  static drawVelocityChart(bezier, path, width) {
    const height = Height;
    let pathBuilder = ["M", 0, height];
    const sampleSize = 1 / 40;
    let prev = bezier.evaluateAt(0);
    for (let t = sampleSize; t < 1 + sampleSize; t += sampleSize) {
      const current = bezier.evaluateAt(t);
      let slope = (current.y - prev.y) / (current.x - prev.x);
      const weightedX = prev.x * (1 - t) + current.x * t;
      slope = Math.tanh(slope / 1.5);
      pathBuilder = pathBuilder.concat(["L", (weightedX * width).toFixed(2), (height - slope * height).toFixed(2)]);
      prev = current;
    }
    pathBuilder = pathBuilder.concat(["L", width.toFixed(2), height, "Z"]);
    path.setAttribute("d", pathBuilder.join(" "));
  }
  curveWidth() {
    return this.width - this.radius * 2;
  }
  curveHeight() {
    return this.height - this.radius * 2 - this.marginTop * 2;
  }
  drawLine(parentElement, className, x1, y1, x2, y2) {
    const line = UI.UIUtils.createSVGChild(parentElement, "line", className);
    line.setAttribute("x1", String(x1 + this.radius));
    line.setAttribute("y1", String(y1 + this.radius + this.marginTop));
    line.setAttribute("x2", String(x2 + this.radius));
    line.setAttribute("y2", String(y2 + this.radius + this.marginTop));
  }
  drawControlPoints(parentElement, startX, startY, controlX, controlY) {
    this.drawLine(parentElement, "bezier-control-line", startX, startY, controlX, controlY);
    const circle = UI.UIUtils.createSVGChild(parentElement, "circle", "bezier-control-circle");
    circle.setAttribute("jslog", `${VisualLogging.controlPoint("bezier.control-circle").track({ drag: true })}`);
    circle.setAttribute("cx", String(controlX + this.radius));
    circle.setAttribute("cy", String(controlY + this.radius + this.marginTop));
    circle.setAttribute("r", String(this.radius));
  }
  drawCurve(bezier, svg) {
    if (!bezier) {
      return;
    }
    const width = this.curveWidth();
    const height = this.curveHeight();
    svg.setAttribute("width", String(this.width));
    svg.setAttribute("height", String(this.height));
    svg.removeChildren();
    const group = UI.UIUtils.createSVGChild(svg, "g");
    if (this.shouldDrawLine) {
      this.drawLine(group, "linear-line", 0, height, width, 0);
    }
    const curve = UI.UIUtils.createSVGChild(group, "path", "bezier-path");
    const curvePoints = [
      new Geometry2.Point(bezier.controlPoints[0].x * width + this.radius, (1 - bezier.controlPoints[0].y) * height + this.radius + this.marginTop),
      new Geometry2.Point(bezier.controlPoints[1].x * width + this.radius, (1 - bezier.controlPoints[1].y) * height + this.radius + this.marginTop),
      new Geometry2.Point(width + this.radius, this.marginTop + this.radius)
    ];
    curve.setAttribute("d", "M" + this.radius + "," + (height + this.radius + this.marginTop) + " C" + curvePoints.join(" "));
    this.drawControlPoints(group, 0, height, bezier.controlPoints[0].x * width, (1 - bezier.controlPoints[0].y) * height);
    this.drawControlPoints(group, width, 0, bezier.controlPoints[1].x * width, (1 - bezier.controlPoints[1].y) * height);
  }
};
var Height = 26;

// gen/front_end/ui/legacy/components/inline_editor/AnimationTimingUI.js
var DOUBLE_CLICK_DELAY = 500;
var BezierCurveUI = class {
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
      shouldDrawLine: true
    });
    this.#curve = UI2.UIUtils.createSVGChild(container, "svg", "bezier-curve");
    this.#onBezierChange = onBezierChange;
    UI2.UIUtils.installDragHandle(this.#curve, this.dragStart.bind(this), this.dragMove.bind(this), this.dragEnd.bind(this), "default");
  }
  dragStart(event) {
    this.#mouseDownPosition = new Geometry3.Point(event.x, event.y);
    const ui = this.#curveUI;
    this.#controlPosition = new Geometry3.Point(Platform.NumberUtilities.clamp((event.offsetX - ui.radius) / ui.curveWidth(), 0, 1), (ui.curveHeight() + ui.marginTop + ui.radius - event.offsetY) / ui.curveHeight());
    const firstControlPointIsCloser = this.#controlPosition.distanceTo(this.#bezier.controlPoints[0]) < this.#controlPosition.distanceTo(this.#bezier.controlPoints[1]);
    this.#selectedPoint = firstControlPointIsCloser ? 0 : 1;
    this.#bezier.controlPoints[this.#selectedPoint] = this.#controlPosition;
    this.#onBezierChange(this.#bezier);
    event.consume(true);
    return true;
  }
  updateControlPosition(mouseX, mouseY) {
    if (this.#mouseDownPosition === void 0 || this.#controlPosition === void 0 || this.#selectedPoint === void 0) {
      return;
    }
    const deltaX = (mouseX - this.#mouseDownPosition.x) / this.#curveUI.curveWidth();
    const deltaY = (mouseY - this.#mouseDownPosition.y) / this.#curveUI.curveHeight();
    const newPosition = new Geometry3.Point(Platform.NumberUtilities.clamp(this.#controlPosition.x + deltaX, 0, 1), this.#controlPosition.y - deltaY);
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
};
var LinearEasingPresentation = class {
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
    const circle = UI2.UIUtils.createSVGChild(parentElement, "circle", "bezier-control-circle");
    circle.setAttribute("jslog", `${VisualLogging2.controlPoint("bezier.linear-control-circle").track({ drag: true, dblclick: true })}`);
    circle.setAttribute("data-point-index", String(index));
    circle.setAttribute("cx", String(controlX));
    circle.setAttribute("cy", String(controlY));
    circle.setAttribute("r", String(this.params.pointRadius));
  }
  timingPointToPosition(point) {
    return {
      x: point.input / 100 * this.#curveWidth() + this.params.pointRadius,
      y: (1 - point.output) * this.#curveHeight() + this.params.pointRadius
    };
  }
  positionToTimingPoint(position) {
    return {
      input: (position.x - this.params.pointRadius) / this.#curveWidth() * 100,
      output: 1 - (position.y - this.params.pointRadius) / this.#curveHeight()
    };
  }
  draw(linearEasingModel, svg) {
    svg.setAttribute("width", String(this.#curveWidth()));
    svg.setAttribute("height", String(this.#curveHeight()));
    svg.removeChildren();
    const group = UI2.UIUtils.createSVGChild(svg, "g");
    const positions = linearEasingModel.points().map((point) => this.timingPointToPosition(point));
    this.renderedPositions = positions;
    let startingPoint = positions[0];
    for (let i = 1; i < positions.length; i++) {
      const position = positions[i];
      const line = UI2.UIUtils.createSVGChild(group, "path", "bezier-path linear-path");
      line.setAttribute("d", `M ${startingPoint.x} ${startingPoint.y} L ${position.x} ${position.y}`);
      line.setAttribute("data-line-index", String(i));
      startingPoint = position;
    }
    for (let i = 0; i < positions.length; i++) {
      const point = positions[i];
      this.#drawControlPoint(group, point.x, point.y, i);
    }
  }
};
var LinearEasingUI = class {
  #model;
  #onChange;
  #presentation;
  #selectedPointIndex;
  #doubleClickTimer;
  #pointIndexForDoubleClick;
  #mouseDownPosition;
  #svg;
  constructor({ model, container, onChange }) {
    this.#model = model;
    this.#onChange = onChange;
    this.#presentation = new LinearEasingPresentation({
      width: 150,
      height: 250,
      pointRadius: 7,
      marginTop: 50
    });
    this.#svg = UI2.UIUtils.createSVGChild(container, "svg", "bezier-curve linear");
    UI2.UIUtils.installDragHandle(this.#svg, this.#dragStart.bind(this), this.#dragMove.bind(this), this.#dragEnd.bind(this), "default");
  }
  #handleLineClick(event, lineIndex) {
    const newPoint = this.#presentation.positionToTimingPoint({ x: event.offsetX, y: event.offsetY });
    this.#model.addPoint(newPoint, lineIndex);
    this.#selectedPointIndex = void 0;
    this.#mouseDownPosition = void 0;
  }
  #handleControlPointClick(event, pointIndex) {
    this.#selectedPointIndex = pointIndex;
    this.#mouseDownPosition = { x: event.x, y: event.y };
    clearTimeout(this.#doubleClickTimer);
    if (this.#pointIndexForDoubleClick === this.#selectedPointIndex) {
      this.#model.removePoint(this.#selectedPointIndex);
      this.#pointIndexForDoubleClick = void 0;
      this.#selectedPointIndex = void 0;
      this.#mouseDownPosition = void 0;
      return;
    }
    this.#pointIndexForDoubleClick = this.#selectedPointIndex;
    this.#doubleClickTimer = window.setTimeout(() => {
      this.#pointIndexForDoubleClick = void 0;
    }, DOUBLE_CLICK_DELAY);
  }
  #dragStart(event) {
    if (!(event.target instanceof SVGElement)) {
      return false;
    }
    if (event.target.dataset.lineIndex !== void 0) {
      this.#handleLineClick(event, Number(event.target.dataset.lineIndex));
      event.consume(true);
      return true;
    }
    if (event.target.dataset.pointIndex !== void 0) {
      this.#handleControlPointClick(event, Number(event.target.dataset.pointIndex));
      event.consume(true);
      return true;
    }
    return false;
  }
  #updatePointPosition(mouseX, mouseY) {
    if (this.#selectedPointIndex === void 0 || this.#mouseDownPosition === void 0) {
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
      y: mouseY
    };
    const newPoint = {
      x: controlPosition.x + deltaX,
      y: controlPosition.y + deltaY
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
};
var PresetUI = class {
  #linearEasingPresentation;
  #bezierPresentation;
  constructor() {
    this.#linearEasingPresentation = new LinearEasingPresentation({
      width: 40,
      height: 40,
      marginTop: 0,
      pointRadius: 2
    });
    this.#bezierPresentation = new BezierUI({
      width: 40,
      height: 40,
      marginTop: 0,
      controlPointRadius: 2,
      shouldDrawLine: false
    });
  }
  draw(model, svg) {
    if (model instanceof CSSLinearEasingModel) {
      this.#linearEasingPresentation.draw(model, svg);
    } else if (model instanceof Geometry3.CubicBezier) {
      this.#bezierPresentation.drawCurve(model, svg);
    }
  }
};
var AnimationTimingUI = class {
  #container;
  #bezierContainer;
  #linearEasingContainer;
  #model;
  #onChange;
  #bezierCurveUI;
  #linearEasingUI;
  constructor({ model, onChange }) {
    this.#container = document.createElement("div");
    this.#container.className = "animation-timing-ui";
    this.#container.style.width = "150px";
    this.#container.style.height = "250px";
    this.#bezierContainer = document.createElement("div");
    this.#bezierContainer.classList.add("bezier-ui-container");
    this.#linearEasingContainer = document.createElement("div");
    this.#linearEasingContainer.classList.add("linear-easing-ui-container");
    this.#container.appendChild(this.#bezierContainer);
    this.#container.appendChild(this.#linearEasingContainer);
    this.#model = model;
    this.#onChange = onChange;
    if (this.#model instanceof Geometry3.CubicBezier) {
      this.#bezierCurveUI = new BezierCurveUI({ bezier: this.#model, container: this.#bezierContainer, onBezierChange: this.#onChange });
    } else if (this.#model instanceof CSSLinearEasingModel) {
      this.#linearEasingUI = new LinearEasingUI({
        model: this.#model,
        container: this.#linearEasingContainer,
        onChange: this.#onChange
      });
    }
  }
  element() {
    return this.#container;
  }
  setModel(model) {
    this.#model = model;
    if (this.#model instanceof Geometry3.CubicBezier) {
      if (this.#bezierCurveUI) {
        this.#bezierCurveUI.setBezier(this.#model);
      } else {
        this.#bezierCurveUI = new BezierCurveUI({ bezier: this.#model, container: this.#bezierContainer, onBezierChange: this.#onChange });
      }
    } else if (this.#model instanceof CSSLinearEasingModel) {
      if (this.#linearEasingUI) {
        this.#linearEasingUI.setCSSLinearEasingModel(this.#model);
      } else {
        this.#linearEasingUI = new LinearEasingUI({ model: this.#model, container: this.#linearEasingContainer, onChange: this.#onChange });
      }
    }
    this.draw();
  }
  draw() {
    this.#linearEasingContainer.classList.toggle("hidden", !(this.#model instanceof CSSLinearEasingModel));
    this.#bezierContainer.classList.toggle("hidden", !(this.#model instanceof Geometry3.CubicBezier));
    if (this.#bezierCurveUI) {
      this.#bezierCurveUI.draw();
    }
    if (this.#linearEasingUI) {
      this.#linearEasingUI.draw();
    }
  }
};

// gen/front_end/ui/legacy/components/inline_editor/BezierEditor.js
var BezierEditor_exports = {};
__export(BezierEditor_exports, {
  BezierEditor: () => BezierEditor,
  Presets: () => Presets
});
import * as Common from "./../../../../core/common/common.js";
import * as VisualLogging3 from "./../../../visual_logging/visual_logging.js";
import * as UI3 from "./../../legacy.js";

// gen/front_end/ui/legacy/components/inline_editor/bezierEditor.css.js
var bezierEditor_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  width: 270px;
  height: 350px;
  user-select: none;
  padding: 16px;
  overflow: hidden;
}

.bezier-preset-selected > svg {
  background-color: var(--sys-color-tonal-container);
}

.bezier-container {
  --override-bezier-control-color: var(--sys-color-purple-bright);

  display: flex;
  margin-top: 38px;
  flex-shrink: 0;
  /* overflown bezier visualization must be on top of the source text */
  z-index: 2;
  background-image: radial-gradient(circle, var(--sys-color-surface-variant) 1px, var(--color-background-inverted-opacity-0) 1px);
  background-size: 17px 17px;
  background-position: -5px -10px;
}

.bezier-preset {
  width: 50px;
  height: 50px;
  padding: 5px;
  margin: auto;
  background-color: var(--sys-color-surface1);
  border-radius: 3px;
}

.bezier-preset line.bezier-control-line {
  stroke: var(--sys-color-token-subtle);
  stroke-width: 1;
  stroke-linecap: round;
  fill: none;
}

.bezier-preset circle.bezier-control-circle {
  fill: var(--sys-color-token-subtle);
}

.bezier-preset path.bezier-path {
  stroke: var(--sys-color-inverse-surface);
  stroke-width: 2;
  stroke-linecap: round;
  fill: none;
}

.bezier-preset-selected path.bezier-path,
.bezier-preset-selected line.bezier-control-line {
  stroke: var(--sys-color-on-tonal-container);
}

.bezier-preset-selected circle.bezier-control-circle {
  fill: var(--sys-color-on-tonal-container);
}

.bezier-curve line.linear-line {
  stroke: var(--sys-color-neutral-outline);
  stroke-width: 2;
  stroke-linecap: round;
  fill: none;
}

.bezier-curve line.bezier-control-line {
  stroke: var(--override-bezier-control-color);
  stroke-width: 2;
  stroke-linecap: round;
  fill: none;
  opacity: 60%;
}

.bezier-curve circle.bezier-control-circle {
  fill: var(--override-bezier-control-color);
  cursor: pointer;
}

.bezier-curve path.bezier-path {
  stroke: var(--sys-color-inverse-surface);
  stroke-width: 3;
  stroke-linecap: round;
  fill: none;
}

.bezier-curve path.bezier-path.linear-path {
  cursor: pointer;
}

.bezier-preview-container {
  position: relative;
  background-color: var(--sys-color-cdt-base-container);
  overflow: hidden;
  border-radius: 20px;
  width: 200%;
  height: 20px;
  z-index: 2;
  flex-shrink: 0;
  opacity: 0%;
}

.bezier-preview-animation {
  background-color: var(--sys-color-purple-bright);
  width: 20px;
  height: 20px;
  border-radius: 20px;
  position: absolute;
}

.bezier-preview-onion {
  margin-top: -20px;
  position: relative;
  z-index: 1;
}

.bezier-preview-onion > .bezier-preview-animation {
  opacity: 10%;
}

svg.bezier-preset-modify {
  background-color: var(--sys-color-cdt-base-container);
  border-radius: 35px;
  display: inline-block;
  visibility: hidden;
  transition: transform 100ms cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: absolute;
}

svg.bezier-preset-modify:hover,
.bezier-preset:hover {
  background-color: var(--sys-color-state-hover-on-subtle);
}

.bezier-preset-selected .bezier-preset:hover {
  background-color: var(--sys-color-tonal-container);
}

.bezier-preset-modify path {
  stroke-width: 2;
  stroke: var(--sys-color-on-surface-subtle);
  fill: none;
}

.bezier-presets {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.bezier-preset-selected .bezier-preset-modify {
  opacity: 100%;
}

.bezier-preset-category {
  width: 50px;
  cursor: pointer;
  transition: transform 100ms cubic-bezier(0.4, 0, 0.2, 1);
}

span.bezier-display-value {
  width: 100%;
  user-select: text;
  display: block;
  text-align: center;
  line-height: 20px;
  min-height: 20px;
  cursor: text;
}

svg.bezier-curve {
  margin-left: 32px;
  margin-top: -8px;
}

svg.bezier-curve.linear {
  margin-top: 42px;
  overflow: visible;
}

svg.bezier-preset-modify.bezier-preset-plus {
  right: 0;
}

.bezier-header {
  margin-top: 16px;
  z-index: 1;
}

svg.bezier-preset-modify:active {
  transform: scale(1.1);
  background-color: var(--sys-color-state-ripple-neutral-on-subtle);
}

.bezier-preset-category:active {
  transform: scale(1.05);
}

.bezier-header-active > svg.bezier-preset-modify {
  visibility: visible;
}

.bezier-preset-modify:active path {
  stroke: var(--sys-color-on-surface-subtle);
}

/*# sourceURL=${import.meta.resolve("./bezierEditor.css")} */`;

// gen/front_end/ui/legacy/components/inline_editor/BezierEditor.js
var PREVIEW_ANIMATION_DEBOUNCE_DELAY = 300;
var BezierEditor = class extends Common.ObjectWrapper.eventMixin(UI3.Widget.VBox) {
  model;
  previewElement;
  previewOnion;
  outerContainer;
  selectedCategory;
  presetsContainer;
  presetUI;
  presetCategories;
  animationTimingUI;
  header;
  label;
  previewAnimation;
  debouncedStartPreviewAnimation;
  constructor(model) {
    super({ useShadowDom: true });
    this.registerRequiredCSS(bezierEditor_css_default);
    this.model = model;
    this.contentElement.tabIndex = 0;
    this.contentElement.setAttribute("jslog", `${VisualLogging3.dialog("bezierEditor").parent("mapped").track({ keydown: "Enter|Escape" })}`);
    this.setDefaultFocusedElement(this.contentElement);
    this.element.style.overflowY = "auto";
    this.previewElement = this.contentElement.createChild("div", "bezier-preview-container");
    this.previewElement.setAttribute("jslog", `${VisualLogging3.preview().track({ click: true })}`);
    this.previewElement.createChild("div", "bezier-preview-animation");
    this.previewElement.addEventListener("click", this.startPreviewAnimation.bind(this));
    this.previewOnion = this.contentElement.createChild("div", "bezier-preview-onion");
    this.previewOnion.setAttribute("jslog", `${VisualLogging3.preview().track({ click: true })}`);
    this.previewOnion.addEventListener("click", this.startPreviewAnimation.bind(this));
    this.outerContainer = this.contentElement.createChild("div", "bezier-container");
    this.selectedCategory = null;
    this.presetsContainer = this.outerContainer.createChild("div", "bezier-presets");
    this.presetUI = new PresetUI();
    this.presetCategories = [];
    for (let i = 0; i < Presets.length; i++) {
      const category = this.createCategory(Presets[i]);
      if (!category) {
        continue;
      }
      this.presetCategories[i] = category;
      this.presetsContainer.appendChild(this.presetCategories[i].icon);
    }
    this.debouncedStartPreviewAnimation = Common.Debouncer.debounce(this.startPreviewAnimation.bind(this), PREVIEW_ANIMATION_DEBOUNCE_DELAY);
    this.animationTimingUI = new AnimationTimingUI({
      model: this.model,
      onChange: (model2) => {
        this.setModel(model2);
        this.onchange();
        this.unselectPresets();
        this.debouncedStartPreviewAnimation();
      }
    });
    this.animationTimingUI.element().setAttribute("jslog", `${VisualLogging3.bezierCurveEditor().track({ click: true, drag: true })}`);
    this.outerContainer.appendChild(this.animationTimingUI.element());
    this.header = this.contentElement.createChild("div", "bezier-header");
    const minus = this.createPresetModifyIcon(this.header, "bezier-preset-minus", "M 12 6 L 8 10 L 12 14");
    minus.addEventListener("click", this.presetModifyClicked.bind(this, false));
    minus.setAttribute("jslog", `${VisualLogging3.action("bezier.prev-preset").track({ click: true })}`);
    const plus = this.createPresetModifyIcon(this.header, "bezier-preset-plus", "M 8 6 L 12 10 L 8 14");
    plus.addEventListener("click", this.presetModifyClicked.bind(this, true));
    plus.setAttribute("jslog", `${VisualLogging3.action("bezier.next-preset").track({ click: true })}`);
    this.label = this.header.createChild("span", "source-code bezier-display-value");
  }
  setModel(model) {
    this.model = model;
    this.animationTimingUI?.setModel(this.model);
    this.updateUI();
  }
  wasShown() {
    super.wasShown();
    this.unselectPresets();
    for (const category of this.presetCategories) {
      for (let i = 0; i < category.presets.length; i++) {
        if (this.model.asCSSText() === category.presets[i].value) {
          category.presetIndex = i;
          this.presetCategorySelected(category);
        }
      }
    }
    this.updateUI();
    this.startPreviewAnimation();
  }
  onchange() {
    this.updateUI();
    this.dispatchEventToListeners("BezierChanged", this.model.asCSSText());
  }
  updateUI() {
    const labelText = this.selectedCategory ? this.selectedCategory.presets[this.selectedCategory.presetIndex].name : this.model.asCSSText().replace(/\s(-\d\.\d)/g, "$1");
    this.label.textContent = labelText;
    this.animationTimingUI?.draw();
  }
  createCategory(presetGroup) {
    const pivot = AnimationTimingModel.parse(presetGroup[0].value);
    if (!pivot) {
      return null;
    }
    const presetElement = document.createElement("div");
    presetElement.classList.add("bezier-preset-category");
    presetElement.setAttribute("jslog", `${VisualLogging3.bezierPresetCategory().track({ click: true }).context(presetGroup[0].name)}`);
    const iconElement = UI3.UIUtils.createSVGChild(presetElement, "svg", "bezier-preset monospace");
    const category = { presets: presetGroup, presetIndex: 0, icon: presetElement };
    this.presetUI.draw(pivot, iconElement);
    iconElement.addEventListener("click", this.presetCategorySelected.bind(this, category));
    return category;
  }
  createPresetModifyIcon(parentElement, className, drawPath) {
    const icon = UI3.UIUtils.createSVGChild(parentElement, "svg", "bezier-preset-modify " + className);
    icon.setAttribute("width", "20");
    icon.setAttribute("height", "20");
    const path = UI3.UIUtils.createSVGChild(icon, "path");
    path.setAttribute("d", drawPath);
    return icon;
  }
  unselectPresets() {
    for (const category of this.presetCategories) {
      category.icon.classList.remove("bezier-preset-selected");
    }
    this.selectedCategory = null;
    this.header.classList.remove("bezier-header-active");
  }
  presetCategorySelected(category, event) {
    if (this.selectedCategory === category) {
      return;
    }
    this.unselectPresets();
    this.header.classList.add("bezier-header-active");
    this.selectedCategory = category;
    this.selectedCategory.icon.classList.add("bezier-preset-selected");
    const newModel = AnimationTimingModel.parse(category.presets[category.presetIndex].value);
    if (newModel) {
      this.setModel(newModel);
      this.onchange();
      this.startPreviewAnimation();
    }
    if (event) {
      event.consume(true);
    }
  }
  presetModifyClicked(intensify, _event) {
    if (this.selectedCategory === null) {
      return;
    }
    const length = this.selectedCategory.presets.length;
    this.selectedCategory.presetIndex = (this.selectedCategory.presetIndex + (intensify ? 1 : -1) + length) % length;
    const selectedPreset = this.selectedCategory.presets[this.selectedCategory.presetIndex].value;
    const newModel = AnimationTimingModel.parse(selectedPreset);
    if (newModel) {
      this.setModel(newModel);
      this.onchange();
      this.startPreviewAnimation();
    }
  }
  startPreviewAnimation() {
    this.previewOnion.removeChildren();
    if (this.previewAnimation) {
      this.previewAnimation.cancel();
    }
    const animationDuration = 1600;
    const numberOnionSlices = 20;
    const keyframes = [
      { offset: 0, transform: "translateX(0px)", opacity: 1 },
      { offset: 1, transform: "translateX(218px)", opacity: 1 }
    ];
    this.previewAnimation = this.previewElement.animate(keyframes, {
      easing: this.model.asCSSText(),
      duration: animationDuration
    });
    this.previewOnion.removeChildren();
    for (let i = 0; i <= numberOnionSlices; i++) {
      const slice = this.previewOnion.createChild("div", "bezier-preview-animation");
      const player = slice.animate([{ transform: "translateX(0px)", easing: this.model.asCSSText() }, { transform: "translateX(218px)" }], { duration: animationDuration, fill: "forwards" });
      player.pause();
      player.currentTime = animationDuration * i / numberOnionSlices;
    }
  }
};
var Presets = [
  [
    { name: "linear", value: "linear" },
    {
      name: "elastic",
      value: "linear(0 0%, 0.22 2.1%, 0.86 6.5%, 1.11 8.6%, 1.3 10.7%, 1.35 11.8%, 1.37 12.9%, 1.37 13.7%, 1.36 14.5%, 1.32 16.2%, 1.03 21.8%, 0.94 24%, 0.89 25.9%, 0.88 26.85%, 0.87 27.8%, 0.87 29.25%, 0.88 30.7%, 0.91 32.4%, 0.98 36.4%, 1.01 38.3%, 1.04 40.5%, 1.05 42.7%, 1.05 44.1%, 1.04 45.7%, 1 53.3%, 0.99 55.4%, 0.98 57.5%, 0.99 60.7%, 1 68.1%, 1.01 72.2%, 1 86.7%, 1 100%)"
    },
    {
      name: "bounce",
      value: "linear(0 0%, 0 2.27%, 0.02 4.53%, 0.04 6.8%, 0.06 9.07%, 0.1 11.33%, 0.14 13.6%, 0.25 18.15%, 0.39 22.7%, 0.56 27.25%, 0.77 31.8%, 1 36.35%, 0.89 40.9%, 0.85 43.18%, 0.81 45.45%, 0.79 47.72%, 0.77 50%, 0.75 52.27%, 0.75 54.55%, 0.75 56.82%, 0.77 59.1%, 0.79 61.38%, 0.81 63.65%, 0.85 65.93%, 0.89 68.2%, 1 72.7%, 0.97 74.98%, 0.95 77.25%, 0.94 79.53%, 0.94 81.8%, 0.94 84.08%, 0.95 86.35%, 0.97 88.63%, 1 90.9%, 0.99 93.18%, 0.98 95.45%, 0.99 97.73%, 1 100%)"
    },
    {
      name: "emphasized",
      value: "linear(0 0%, 0 1.8%, 0.01 3.6%, 0.03 6.35%, 0.07 9.1%, 0.13 11.4%, 0.19 13.4%, 0.27 15%, 0.34 16.1%, 0.54 18.35%, 0.66 20.6%, 0.72 22.4%, 0.77 24.6%, 0.81 27.3%, 0.85 30.4%, 0.88 35.1%, 0.92 40.6%, 0.94 47.2%, 0.96 55%, 0.98 64%, 0.99 74.4%, 1 86.4%, 1 100%)"
    }
  ],
  [
    { name: "ease-in-out", value: "ease-in-out" },
    { name: "In Out \xB7 Sine", value: "cubic-bezier(0.45, 0.05, 0.55, 0.95)" },
    { name: "In Out \xB7 Quadratic", value: "cubic-bezier(0.46, 0.03, 0.52, 0.96)" },
    { name: "In Out \xB7 Cubic", value: "cubic-bezier(0.65, 0.05, 0.36, 1)" },
    { name: "Fast Out, Slow In", value: "cubic-bezier(0.4, 0, 0.2, 1)" },
    { name: "In Out \xB7 Back", value: "cubic-bezier(0.68, -0.55, 0.27, 1.55)" }
  ],
  [
    { name: "Fast Out, Linear In", value: "cubic-bezier(0.4, 0, 1, 1)" },
    { name: "ease-in", value: "ease-in" },
    { name: "In \xB7 Sine", value: "cubic-bezier(0.47, 0, 0.75, 0.72)" },
    { name: "In \xB7 Quadratic", value: "cubic-bezier(0.55, 0.09, 0.68, 0.53)" },
    { name: "In \xB7 Cubic", value: "cubic-bezier(0.55, 0.06, 0.68, 0.19)" },
    { name: "In \xB7 Back", value: "cubic-bezier(0.6, -0.28, 0.74, 0.05)" }
  ],
  [
    { name: "ease-out", value: "ease-out" },
    { name: "Out \xB7 Sine", value: "cubic-bezier(0.39, 0.58, 0.57, 1)" },
    { name: "Out \xB7 Quadratic", value: "cubic-bezier(0.25, 0.46, 0.45, 0.94)" },
    { name: "Out \xB7 Cubic", value: "cubic-bezier(0.22, 0.61, 0.36, 1)" },
    { name: "Linear Out, Slow In", value: "cubic-bezier(0, 0, 0.2, 1)" },
    { name: "Out \xB7 Back", value: "cubic-bezier(0.18, 0.89, 0.32, 1.28)" }
  ]
];

// gen/front_end/ui/legacy/components/inline_editor/ColorMixSwatch.js
var ColorMixSwatch_exports = {};
__export(ColorMixSwatch_exports, {
  ColorMixChangedEvent: () => ColorMixChangedEvent,
  ColorMixSwatch: () => ColorMixSwatch
});
import * as Common2 from "./../../../../core/common/common.js";
import * as Platform2 from "./../../../../core/platform/platform.js";
import * as Lit from "./../../../lit/lit.js";
import * as VisualLogging4 from "./../../../visual_logging/visual_logging.js";

// gen/front_end/ui/legacy/components/inline_editor/colorMixSwatch.css.js
var colorMixSwatch_css_default = `/*
 * Copyright 2022 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.swatch-icon {
  display: inline-grid;
  inline-size: 15px;
  grid: [stack] 1fr / [stack] 1fr;
  margin-left: 1px;
  margin-right: 1px;
  vertical-align: -1px;
  color: var(--color); /* stylelint-disable-line plugin/use_theme_colors */
}

.swatch {
  aspect-ratio: 1 / 1;
  display: inline-block;
  width: 10px;
  border-radius: 1e5px;
  /* stylelint-disable-next-line plugin/use_theme_colors */
  background: linear-gradient(var(--color), var(--color)),
    var(--image-file-checker);
  box-shadow: inset 0 0 0 0.5px rgb(128 128 128 / 60%); /* stylelint-disable-line plugin/use_theme_colors */
  grid-area: stack;
}

.swatch-right {
  justify-self: end;
}

.swatch-mix {
  box-shadow: none;
  justify-self: end;
  mask: radial-gradient(
    circle at 0% center,
    rgb(0 0 0) 50%,
    rgb(0 0 0 / 0%) calc(50% + 0.5px)
  );
}

/*# sourceURL=${import.meta.resolve("./colorMixSwatch.css")} */`;

// gen/front_end/ui/legacy/components/inline_editor/ColorMixSwatch.js
var { html, render, Directives: { ref } } = Lit;
var ColorMixChangedEvent = class _ColorMixChangedEvent extends Event {
  static eventName = "colormixchanged";
  data;
  constructor(text) {
    super(_ColorMixChangedEvent.eventName, {});
    this.data = { text };
  }
};
var ColorMixSwatch = class extends HTMLElement {
  shadow = this.attachShadow({ mode: "open" });
  colorMixText = "";
  // color-mix(in srgb, hotpink, white)
  firstColorText = "";
  // hotpink
  secondColorText = "";
  // white
  #icon = null;
  mixedColor() {
    const colorText = this.#icon?.computedStyleMap().get("color")?.toString() ?? null;
    return colorText ? Common2.Color.parse(colorText) : null;
  }
  setFirstColor(text) {
    if (this.firstColorText) {
      this.colorMixText = this.colorMixText.replace(this.firstColorText, text);
    }
    this.firstColorText = text;
    this.dispatchEvent(new ColorMixChangedEvent(this.colorMixText));
    this.#render();
  }
  setSecondColor(text) {
    if (this.secondColorText) {
      this.colorMixText = Platform2.StringUtilities.replaceLast(this.colorMixText, this.secondColorText, text);
    }
    this.secondColorText = text;
    this.dispatchEvent(new ColorMixChangedEvent(this.colorMixText));
    this.#render();
  }
  setColorMixText(text) {
    this.colorMixText = text;
    this.dispatchEvent(new ColorMixChangedEvent(this.colorMixText));
    this.#render();
  }
  getText() {
    return this.colorMixText;
  }
  #render() {
    if (!this.colorMixText || !this.firstColorText || !this.secondColorText) {
      render(this.colorMixText, this.shadow, { host: this });
      return;
    }
    render(html`<style>${colorMixSwatch_css_default}</style><div class="swatch-icon"
      ${ref((e) => {
      this.#icon = e;
    })}
      jslog=${VisualLogging4.cssColorMix()}
      style="--color: ${this.colorMixText}">
        <span class="swatch swatch-left" id="swatch-1" style="--color: ${this.firstColorText}"></span>
        <span class="swatch swatch-right" id="swatch-2" style="--color: ${this.secondColorText}"></span>
        <span class="swatch swatch-mix" id="mix-result" style="--color: ${this.colorMixText}"></span></div>`, this.shadow, { host: this });
  }
};
customElements.define("devtools-color-mix-swatch", ColorMixSwatch);

// gen/front_end/ui/legacy/components/inline_editor/ColorSwatch.js
var ColorSwatch_exports = {};
__export(ColorSwatch_exports, {
  ClickEvent: () => ClickEvent,
  ColorChangedEvent: () => ColorChangedEvent,
  ColorFormatChangedEvent: () => ColorFormatChangedEvent,
  ColorSwatch: () => ColorSwatch
});
import * as i18n from "./../../../../core/i18n/i18n.js";
import * as ColorPicker from "./../color_picker/color_picker.js";
import * as Lit2 from "./../../../lit/lit.js";
import * as VisualLogging5 from "./../../../visual_logging/visual_logging.js";

// gen/front_end/ui/legacy/components/inline_editor/colorSwatch.css.js
var colorSwatch_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  white-space: nowrap;
}

.color-swatch {
  position: relative;
  margin-left: 1px;
  margin-right: 2px;
  width: 12px;
  height: 12px;
  transform: scale(0.8);
  vertical-align: -2px;
  display: inline-block;
  user-select: none;
  background-image: var(--image-file-checker);
  line-height: 10px;
}

.color-swatch-inner {
  width: 100%;
  height: 100%;
  display: inline-block;
  border: 1px solid var(--sys-color-neutral-outline);
  box-sizing: border-box;
  cursor: pointer;
}

.color-swatch.readonly .color-swatch-inner {
  cursor: unset;
}

.color-swatch:not(.readonly) .color-swatch-inner:hover {
  border: 1px solid var(--sys-color-outline);
}

@media (forced-colors: active) {
  .color-swatch {
    forced-color-adjust: none;
  }
}

/*# sourceURL=${import.meta.resolve("./colorSwatch.css")} */`;

// gen/front_end/ui/legacy/components/inline_editor/ColorSwatch.js
var { html: html2 } = Lit2;
var UIStrings = {
  /**
   * @description Icon element title in Color Swatch of the inline editor in the Styles tab
   */
  shiftclickToChangeColorFormat: "Shift-click to change color format"
};
var str_ = i18n.i18n.registerUIStrings("ui/legacy/components/inline_editor/ColorSwatch.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var ColorFormatChangedEvent = class _ColorFormatChangedEvent extends Event {
  static eventName = "colorformatchanged";
  data;
  constructor(color) {
    super(_ColorFormatChangedEvent.eventName, {});
    this.data = { color };
  }
};
var ColorChangedEvent = class _ColorChangedEvent extends Event {
  static eventName = "colorchanged";
  data;
  constructor(color) {
    super(_ColorChangedEvent.eventName, {});
    this.data = { color };
  }
};
var ClickEvent = class _ClickEvent extends Event {
  static eventName = "swatchclick";
  constructor() {
    super(_ClickEvent.eventName, {});
  }
};
var ColorSwatch = class extends HTMLElement {
  shadow = this.attachShadow({ mode: "open" });
  tooltip = i18nString(UIStrings.shiftclickToChangeColorFormat);
  color = null;
  readonly = false;
  constructor(tooltip) {
    super();
    if (tooltip) {
      this.tooltip = tooltip;
    }
    this.tabIndex = -1;
    this.addEventListener("keydown", (e) => this.onActivate(e));
  }
  static isColorSwatch(element) {
    return element.localName === "devtools-color-swatch";
  }
  setReadonly(readonly) {
    if (this.readonly === readonly) {
      return;
    }
    this.readonly = readonly;
    if (this.color) {
      this.renderColor(this.color);
    }
  }
  getColor() {
    return this.color;
  }
  get anchorBox() {
    const swatch = this.shadow.querySelector(".color-swatch");
    return swatch ? swatch.boxInWindow() : null;
  }
  getText() {
    return this.color?.getAuthoredText() ?? this.color?.asString();
  }
  /**
   * Render this swatch given a color object or text to be parsed as a color.
   * @param color The color object or string to use for this swatch.
   */
  renderColor(color) {
    this.color = color;
    const colorSwatchClasses = Lit2.Directives.classMap({
      "color-swatch": true,
      readonly: this.readonly
    });
    Lit2.render(html2`<style>${colorSwatch_css_default}</style><span
          class=${colorSwatchClasses}
          title=${this.tooltip}><span
            class="color-swatch-inner"
            style="background-color: ${color.asString()};"
            jslog=${VisualLogging5.showStyleEditor("color").track({ click: true })}
            @click=${this.onActivate}
            @mousedown=${this.consume}
            @dblclick=${this.consume}></span></span>`, this.shadow, { host: this });
  }
  onActivate(e) {
    if (this.readonly) {
      return;
    }
    if (e instanceof KeyboardEvent && e.key !== "Enter" && e.key !== " " || e instanceof MouseEvent && e.button > 1) {
      return;
    }
    if (e.shiftKey) {
      e.stopPropagation();
      this.showFormatPicker(e);
      return;
    }
    this.dispatchEvent(new ClickEvent());
    this.consume(e);
  }
  consume(e) {
    e.stopPropagation();
  }
  setColor(color) {
    this.renderColor(color);
    this.dispatchEvent(new ColorChangedEvent(color));
  }
  showFormatPicker(e) {
    if (!this.color) {
      return;
    }
    const contextMenu = new ColorPicker.FormatPickerContextMenu.FormatPickerContextMenu(this.color);
    void contextMenu.show(e, (color) => {
      this.dispatchEvent(new ColorFormatChangedEvent(color));
    });
  }
};
customElements.define("devtools-color-swatch", ColorSwatch);

// gen/front_end/ui/legacy/components/inline_editor/CSSAngle.js
var CSSAngle_exports = {};
__export(CSSAngle_exports, {
  CSSAngle: () => CSSAngle,
  PopoverToggledEvent: () => PopoverToggledEvent,
  UnitChangedEvent: () => UnitChangedEvent
});

// gen/front_end/ui/legacy/components/inline_editor/CSSAngleEditor.js
import * as Common3 from "./../../../../core/common/common.js";
import * as Lit3 from "./../../../lit/lit.js";
import * as VisualLogging6 from "./../../../visual_logging/visual_logging.js";

// gen/front_end/ui/legacy/components/inline_editor/cssAngleEditor.css.js
var cssAngleEditor_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.editor.interacting::before {
  content: '';
  position: fixed;
  inset: 0;
}

.clock,
.pointer,
.center,
.hand,
.dial {
  position: absolute;
}

.clock {
  top: 6px;
  width: 6em;
  height: 6em;
  background-color: var(--sys-color-cdt-base-container);
  border: 0.5em solid var(--sys-color-neutral-outline);
  border-radius: 9em;
  box-shadow: var(--drop-shadow), inset 0 0 15px var(--box-shadow-outline-color);
  transform: translateX(-3em);
}

.center,
.hand {
  box-shadow: 0 0 2px var(--box-shadow-outline-color);
}

.pointer {
  margin: auto;
  top: 0;
  left: -0.4em;
  right: 0;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 0 0.9em 0.9em;
  border-color: transparent transparent var(--sys-color-neutral-outline)
    transparent;
}

.center,
.hand,
.dial {
  margin: auto;
  inset: 0;
}

.center {
  width: 0.7em;
  height: 0.7em;
  border-radius: 10px;
}

.dial {
  width: 2px;
  height: var(--clock-dial-length);
  background-color: var(--override-dial-color);
  border-radius: 1px;
}

.hand {
  height: 50%;
  width: 0.3em;
  background: var(--sys-color-tonal-container);
}

.hand::before {
  content: '';
  display: inline-block;
  position: absolute;
  top: -0.6em;
  left: -0.35em;
  width: 1em;
  height: 1em;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0 5px var(--box-shadow-outline-color);
}

.hand::before,
.center {
  background-color: var(--sys-color-tonal-container);
}

:host-context(.theme-with-dark-background) .hand::before {
  /* stylelint-disable-next-line plugin/use_theme_colors */
  box-shadow: 0 0 5px hsl(0deg 0% 0% / 80%);
}

:host-context(.theme-with-dark-background) .center,
:host-context(.theme-with-dark-background) .hand {
  /* stylelint-disable-next-line plugin/use_theme_colors */
  box-shadow: 0 0 2px hsl(0deg 0% 0% / 60%);
}

:host-context(.theme-with-dark-background) .clock {
  /* stylelint-disable-next-line plugin/use_theme_colors */
  background-color: hsl(225deg 5% 27%);
}

/*# sourceURL=${import.meta.resolve("./cssAngleEditor.css")} */`;

// gen/front_end/ui/legacy/components/inline_editor/CSSAngleUtils.js
var CSSAngleUtils_exports = {};
__export(CSSAngleUtils_exports, {
  CSSAngleRegex: () => CSSAngleRegex,
  convertAngleUnit: () => convertAngleUnit,
  get2DTranslationsForAngle: () => get2DTranslationsForAngle,
  getAngleFromRadians: () => getAngleFromRadians,
  getNewAngleFromEvent: () => getNewAngleFromEvent,
  getNextUnit: () => getNextUnit,
  getRadiansFromAngle: () => getRadiansFromAngle,
  parseText: () => parseText,
  roundAngleByUnit: () => roundAngleByUnit
});
import * as Platform3 from "./../../../../core/platform/platform.js";
import * as Geometry4 from "./../../../../models/geometry/geometry.js";
import * as UI4 from "./../../legacy.js";
var CSSAngleRegex = /(?<value>[+-]?\d*\.?\d+)(?<unit>deg|grad|rad|turn)/;
var parseText = (text) => {
  const result = text.match(CSSAngleRegex);
  if (!result?.groups) {
    return null;
  }
  return {
    value: Number(result.groups.value),
    unit: result.groups.unit
  };
};
var getAngleFromRadians = (rad, targetUnit) => {
  let value2 = rad;
  switch (targetUnit) {
    case "grad":
      value2 = Geometry4.radiansToGradians(rad);
      break;
    case "deg":
      value2 = Geometry4.radiansToDegrees(rad);
      break;
    case "turn":
      value2 = Geometry4.radiansToTurns(rad);
      break;
  }
  return {
    value: value2,
    unit: targetUnit
  };
};
var getRadiansFromAngle = (angle) => {
  switch (angle.unit) {
    case "deg":
      return Geometry4.degreesToRadians(angle.value);
    case "grad":
      return Geometry4.gradiansToRadians(angle.value);
    case "turn":
      return Geometry4.turnsToRadians(angle.value);
  }
  return angle.value;
};
var get2DTranslationsForAngle = (angle, radius) => {
  const radian = getRadiansFromAngle(angle);
  return {
    translateX: Math.sin(radian) * radius,
    translateY: -Math.cos(radian) * radius
  };
};
var roundAngleByUnit = (angle) => {
  let roundedValue = angle.value;
  switch (angle.unit) {
    case "deg":
    case "grad":
      roundedValue = Math.round(angle.value);
      break;
    case "rad":
      roundedValue = Math.round(angle.value * 1e4) / 1e4;
      break;
    case "turn":
      roundedValue = Math.round(angle.value * 100) / 100;
      break;
    default:
      Platform3.assertNever(angle.unit, `Unknown angle unit: ${angle.unit}`);
  }
  return {
    value: roundedValue,
    unit: angle.unit
  };
};
var getNextUnit = (currentUnit) => {
  switch (currentUnit) {
    case "deg":
      return "grad";
    case "grad":
      return "rad";
    case "rad":
      return "turn";
    default:
      return "deg";
  }
};
var convertAngleUnit = (angle, newUnit) => {
  if (angle.unit === newUnit) {
    return angle;
  }
  const radian = getRadiansFromAngle(angle);
  return getAngleFromRadians(radian, newUnit);
};
var getNewAngleFromEvent = (angle, event) => {
  const direction = UI4.UIUtils.getValueModificationDirection(event);
  if (direction === null) {
    return;
  }
  let diff = direction === "Up" ? Math.PI / 180 : -Math.PI / 180;
  if (event.shiftKey) {
    diff *= 10;
  }
  const radian = getRadiansFromAngle(angle);
  return getAngleFromRadians(radian + diff, angle.unit);
};

// gen/front_end/ui/legacy/components/inline_editor/CSSAngleEditor.js
var { render: render3, html: html3 } = Lit3;
var styleMap = Lit3.Directives.styleMap;
var CLOCK_DIAL_LENGTH = 6;
var CSSAngleEditor = class extends HTMLElement {
  shadow = this.attachShadow({ mode: "open" });
  angle = {
    value: 0,
    unit: "rad"
  };
  onAngleUpdate;
  background = "";
  clockRadius = 77 / 2;
  // By default the clock is 77 * 77.
  dialTemplates;
  mousemoveThrottler = new Common3.Throttler.Throttler(
    16.67
    /* 60fps */
  );
  mousemoveListener = this.onMousemove.bind(this);
  connectedCallback() {
    this.style.setProperty("--clock-dial-length", `${CLOCK_DIAL_LENGTH}px`);
  }
  set data(data) {
    this.angle = data.angle;
    this.onAngleUpdate = data.onAngleUpdate;
    this.background = data.background;
    this.render();
  }
  updateAngleFromMousePosition(mouseX, mouseY, shouldSnapToMultipleOf15Degrees) {
    const clock = this.shadow.querySelector(".clock");
    if (!clock || !this.onAngleUpdate) {
      return;
    }
    const { top, right, bottom, left } = clock.getBoundingClientRect();
    this.clockRadius = (right - left) / 2;
    const clockCenterX = (left + right) / 2;
    const clockCenterY = (bottom + top) / 2;
    const radian = -Math.atan2(mouseX - clockCenterX, mouseY - clockCenterY) + Math.PI;
    if (shouldSnapToMultipleOf15Degrees) {
      const multipleInRadian = getRadiansFromAngle({
        value: 15,
        unit: "deg"
      });
      const closestMultipleOf15Degrees = Math.round(radian / multipleInRadian) * multipleInRadian;
      this.onAngleUpdate(getAngleFromRadians(closestMultipleOf15Degrees, this.angle.unit));
    } else {
      this.onAngleUpdate(getAngleFromRadians(radian, this.angle.unit));
    }
  }
  onEditorMousedown(event) {
    event.stopPropagation();
    this.updateAngleFromMousePosition(event.pageX, event.pageY, event.shiftKey);
    const targetDocument = event.target instanceof Node && event.target.ownerDocument;
    const editor = this.shadow.querySelector(".editor");
    if (targetDocument && editor) {
      targetDocument.addEventListener("mousemove", this.mousemoveListener, { capture: true });
      editor.classList.add("interacting");
      targetDocument.addEventListener("mouseup", () => {
        targetDocument.removeEventListener("mousemove", this.mousemoveListener, { capture: true });
        editor.classList.remove("interacting");
      }, { once: true });
    }
  }
  onMousemove(event) {
    const isPressed = event.buttons === 1;
    if (!isPressed) {
      return;
    }
    event.preventDefault();
    void this.mousemoveThrottler.schedule(() => {
      this.updateAngleFromMousePosition(event.pageX, event.pageY, event.shiftKey);
      return Promise.resolve();
    });
  }
  onEditorWheel(event) {
    if (!this.onAngleUpdate) {
      return;
    }
    const newAngle = getNewAngleFromEvent(this.angle, event);
    if (newAngle) {
      this.onAngleUpdate(newAngle);
    }
    event.preventDefault();
  }
  render() {
    const clockStyles = {
      background: this.background
    };
    const { translateX, translateY } = get2DTranslationsForAngle(this.angle, this.clockRadius / 2);
    const handStyles = {
      transform: `translate(${translateX}px, ${translateY}px) rotate(${this.angle.value}${this.angle.unit})`
    };
    render3(html3`
      <style>${cssAngleEditor_css_default}</style>
      <div class="editor" jslog=${VisualLogging6.dialog("cssAngleEditor").track({ click: true, drag: true, resize: true, keydown: "Enter|Escape" })}>
        <span class="pointer"></span>
        <div
          class="clock"
          style=${styleMap(clockStyles)}
          @mousedown=${this.onEditorMousedown}
          @wheel=${this.onEditorWheel}>
          ${this.renderDials()}
          <div class="hand" style=${styleMap(handStyles)}></div>
          <span class="center"></span>
        </div>
      </div>
    `, this.shadow, {
      host: this
    });
  }
  renderDials() {
    if (!this.dialTemplates) {
      this.dialTemplates = [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const radius = this.clockRadius - CLOCK_DIAL_LENGTH - 3;
        const { translateX, translateY } = get2DTranslationsForAngle({
          value: deg,
          unit: "deg"
        }, radius);
        const dialStyles = {
          transform: `translate(${translateX}px, ${translateY}px) rotate(${deg}deg)`
        };
        return html3`<span class="dial" style=${styleMap(dialStyles)}></span>`;
      });
    }
    return this.dialTemplates;
  }
};
customElements.define("devtools-css-angle-editor", CSSAngleEditor);

// gen/front_end/ui/legacy/components/inline_editor/CSSAngleSwatch.js
import * as Lit4 from "./../../../lit/lit.js";

// gen/front_end/ui/legacy/components/inline_editor/cssAngleSwatch.css.js
var cssAngleSwatch_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.swatch {
  position: relative;
  display: inline-block;
  margin-bottom: -2px;
  width: 1em;
  height: 1em;
  border: 1px solid var(--sys-color-neutral-outline);
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  background-color: var(--sys-color-neutral-container);
}

.mini-hand {
  position: absolute;
  margin: auto;
  inset: 0;
  height: 55%;
  width: 2px;
  background-color: var(--sys-color-tonal-container);
  border-radius: 5px;
}

/*# sourceURL=${import.meta.resolve("./cssAngleSwatch.css")} */`;

// gen/front_end/ui/legacy/components/inline_editor/CSSAngleSwatch.js
var { render: render4, html: html4 } = Lit4;
var styleMap2 = Lit4.Directives.styleMap;
var swatchWidth = 11;
var CSSAngleSwatch = class extends HTMLElement {
  shadow = this.attachShadow({ mode: "open" });
  angle = {
    value: 0,
    unit: "rad"
  };
  set data(data) {
    this.angle = data.angle;
    this.render();
  }
  render() {
    const { translateX, translateY } = get2DTranslationsForAngle(this.angle, swatchWidth / 4);
    const miniHandStyle = {
      transform: `translate(${translateX}px, ${translateY}px) rotate(${this.angle.value}${this.angle.unit})`
    };
    render4(html4`
      <style>${cssAngleSwatch_css_default}</style>
      <div class="swatch">
        <span class="mini-hand" style=${styleMap2(miniHandStyle)}></span>
      </div>
    `, this.shadow, {
      host: this
    });
  }
};
customElements.define("devtools-css-angle-swatch", CSSAngleSwatch);

// gen/front_end/ui/legacy/components/inline_editor/CSSAngle.js
import * as Platform4 from "./../../../../core/platform/platform.js";
import * as Lit5 from "./../../../lit/lit.js";

// gen/front_end/ui/legacy/components/inline_editor/cssAngle.css.js
var cssAngle_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.css-angle {
  display: inline-block;
  position: relative;
  outline: none;

  .preview {
    display: inline-block;
  }
}

devtools-css-angle-swatch {
  display: inline-block;
  user-select: none;
}

devtools-css-angle-editor {
  --override-dial-color: var(--sys-color-neutral-outline);

  position: fixed;
  z-index: 2;
}

/*# sourceURL=${import.meta.resolve("./cssAngle.css")} */`;

// gen/front_end/ui/legacy/components/inline_editor/InlineEditorUtils.js
var InlineEditorUtils_exports = {};
__export(InlineEditorUtils_exports, {
  ValueChangedEvent: () => ValueChangedEvent
});
var ValueChangedEvent = class _ValueChangedEvent extends Event {
  static eventName = "valuechanged";
  data;
  constructor(value2) {
    super(_ValueChangedEvent.eventName, {});
    this.data = { value: value2 };
  }
};

// gen/front_end/ui/legacy/components/inline_editor/CSSAngle.js
var { render: render5, html: html5 } = Lit5;
var styleMap3 = Lit5.Directives.styleMap;
var PopoverToggledEvent = class _PopoverToggledEvent extends Event {
  static eventName = "popovertoggled";
  data;
  constructor(open) {
    super(_PopoverToggledEvent.eventName, {});
    this.data = { open };
  }
};
var UnitChangedEvent = class _UnitChangedEvent extends Event {
  static eventName = "unitchanged";
  data;
  constructor(value2) {
    super(_UnitChangedEvent.eventName, {});
    this.data = { value: value2 };
  }
};
var DefaultAngle = {
  value: 0,
  unit: "rad"
};
var CSSAngle = class extends HTMLElement {
  angle = DefaultAngle;
  displayedAngle = DefaultAngle;
  propertyValue = "";
  containingPane;
  angleElement = null;
  swatchElement = null;
  popoverOpen = false;
  popoverStyleTop = "";
  popoverStyleLeft = "";
  onMinifyingAction = this.minify.bind(this);
  set data(data) {
    const parsedResult = parseText(data.angleText);
    if (!parsedResult) {
      return;
    }
    this.angle = parsedResult;
    this.displayedAngle = { ...parsedResult };
    this.containingPane = data.containingPane;
    this.render();
  }
  disconnectedCallback() {
    this.unbindMinifyingAction();
  }
  // We bind and unbind mouse event listeners upon popping over and minifying,
  // because we anticipate most of the time this widget is minified even when
  // it's attached to the DOM tree.
  popOver() {
    if (!this.containingPane) {
      return;
    }
    if (!this.angleElement) {
      this.angleElement = this.querySelector(".css-angle");
    }
    if (!this.swatchElement) {
      this.swatchElement = this.querySelector("devtools-css-angle-swatch");
    }
    if (!this.angleElement || !this.swatchElement) {
      return;
    }
    this.dispatchEvent(new PopoverToggledEvent(true));
    this.bindMinifyingAction();
    const miniIconBottom = this.swatchElement.getBoundingClientRect().bottom;
    const miniIconLeft = this.swatchElement.getBoundingClientRect().left;
    if (miniIconBottom && miniIconLeft) {
      const offsetTop = this.containingPane.getBoundingClientRect().top;
      const offsetLeft = this.containingPane.getBoundingClientRect().left;
      this.popoverStyleTop = `${miniIconBottom - offsetTop}px`;
      this.popoverStyleLeft = `${miniIconLeft - offsetLeft}px`;
    }
    this.popoverOpen = true;
    this.render();
    this.angleElement.focus();
  }
  addEventListener(type, listener, options) {
    super.addEventListener(type, listener, options);
  }
  minify() {
    if (this.popoverOpen === false) {
      return;
    }
    this.popoverOpen = false;
    this.dispatchEvent(new PopoverToggledEvent(false));
    this.unbindMinifyingAction();
    this.render();
  }
  updateProperty(value2) {
    this.propertyValue = value2;
    this.render();
  }
  updateAngle(angle) {
    this.displayedAngle = roundAngleByUnit(convertAngleUnit(angle, this.displayedAngle.unit));
    this.angle = this.displayedAngle;
    this.dispatchEvent(new ValueChangedEvent(`${this.angle.value}${this.angle.unit}`));
    this.render();
  }
  displayNextUnit() {
    const nextUnit = getNextUnit(this.displayedAngle.unit);
    this.displayedAngle = roundAngleByUnit(convertAngleUnit(this.angle, nextUnit));
    this.dispatchEvent(new UnitChangedEvent(`${this.displayedAngle.value}${this.displayedAngle.unit}`));
  }
  bindMinifyingAction() {
    document.addEventListener("mousedown", this.onMinifyingAction);
    if (this.containingPane) {
      this.containingPane.addEventListener("scroll", this.onMinifyingAction);
    }
  }
  unbindMinifyingAction() {
    document.removeEventListener("mousedown", this.onMinifyingAction);
    if (this.containingPane) {
      this.containingPane.removeEventListener("scroll", this.onMinifyingAction);
    }
  }
  onMiniIconClick(event) {
    event.stopPropagation();
    if (event.shiftKey && !this.popoverOpen) {
      this.displayNextUnit();
      return;
    }
    this.popoverOpen ? this.minify() : this.popOver();
  }
  // Fix that the previous text will be selected when double-clicking the angle icon
  consume(event) {
    event.stopPropagation();
  }
  onKeydown(event) {
    if (!this.popoverOpen) {
      if (Platform4.KeyboardUtilities.isEnterOrSpaceKey(event)) {
        this.onMiniIconClick(event);
        event.preventDefault();
      }
      return;
    }
    switch (event.key) {
      case "Escape":
        event.stopPropagation();
        this.minify();
        this.blur();
        break;
      case "ArrowUp":
      case "ArrowDown": {
        const newAngle = getNewAngleFromEvent(this.angle, event);
        if (newAngle) {
          this.updateAngle(newAngle);
        }
        event.preventDefault();
        break;
      }
    }
  }
  render() {
    render5(html5`
      <style>${cssAngle_css_default}</style>
      <div class="css-angle" @focusout=${this.minify} @keydown=${this.onKeydown} tabindex="-1">
        <div class="preview">
          <devtools-css-angle-swatch
            @click=${this.onMiniIconClick}
            @mousedown=${this.consume}
            @dblclick=${this.consume}
            .data=${{
      angle: this.angle
    }}>
          </devtools-css-angle-swatch>
          <slot></slot>
        </div>
        ${this.popoverOpen ? this.renderPopover() : null}
      </div>
    `, this, {
      host: this
    });
  }
  renderPopover() {
    let contextualBackground = "";
    if (this.propertyValue && !this.propertyValue.match(/url\(.*\)/i)) {
      contextualBackground = this.propertyValue;
    }
    return html5`
      <devtools-css-angle-editor
        class="popover popover-css-angle"
        style=${styleMap3({ top: this.popoverStyleTop, left: this.popoverStyleLeft })}
        .data=${{
      angle: this.angle,
      onAngleUpdate: (angle) => {
        this.updateAngle(angle);
      },
      background: contextualBackground
    }}>
      </devtools-css-angle-editor>`;
  }
};
customElements.define("devtools-css-angle", CSSAngle);

// gen/front_end/ui/legacy/components/inline_editor/CSSShadowEditor.js
var CSSShadowEditor_exports = {};
__export(CSSShadowEditor_exports, {
  CSSLength: () => CSSLength,
  CSSShadowEditor: () => CSSShadowEditor
});
import * as Common4 from "./../../../../core/common/common.js";
import * as i18n3 from "./../../../../core/i18n/i18n.js";
import * as Platform5 from "./../../../../core/platform/platform.js";
import * as Geometry5 from "./../../../../models/geometry/geometry.js";
import * as VisualLogging7 from "./../../../visual_logging/visual_logging.js";
import * as UI5 from "./../../legacy.js";

// gen/front_end/ui/legacy/components/inline_editor/cssShadowEditor.css.js
var cssShadowEditor_css_default = `/*
 * Copyright 2016 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  user-select: none;
  border: 1px solid transparent;
}

.shadow-editor-field {
  height: 24px;
  margin-top: 8px;
  font-size: 12px;
  flex-shrink: 0;
}

.shadow-editor-field:last-of-type {
  margin-bottom: 8px;
}

.shadow-editor-flex-field {
  display: flex;
  align-items: center;
  flex-direction: row;
}

.shadow-editor-field.shadow-editor-blur-field {
  margin-top: 40px;
}

.shadow-editor-2D-slider {
  position: absolute;
  height: 88px;
  width: 88px;
  border: 1px solid var(--divider-line);
  border-radius: 2px;
}

.shadow-editor-label {
  display: inline-block;
  width: 52px;
  height: 24px;
  line-height: 24px;
  margin-right: 8px;
  text-align: right;
}

.shadow-editor-button-left,
.shadow-editor-button-right {
  width: 74px;
  height: 24px;
  padding: 3px 7px;
  line-height: 16px;
  border: 1px solid var(--divider-line);
  color: var(--sys-color-on-surface);
  background-color: var(--sys-color-cdt-base-container);
  text-align: center;
  font-weight: 500;
}

.shadow-editor-button-left {
  border-radius: 2px 0 0 2px;
}

.shadow-editor-button-right {
  border-radius: 0 2px 2px 0;
  border-left-width: 0;
}

.shadow-editor-button-left:hover,
.shadow-editor-button-right:hover {
  box-shadow: 0 1px 1px var(--color-background-elevation-1);
}

.shadow-editor-button-left:focus,
.shadow-editor-button-right:focus {
  background-color: var(--color-background-elevation-1);
}

.shadow-editor-button-left.enabled,
.shadow-editor-button-right.enabled {
  --override-button-text-color: #fff;

  background-color: var(--color-primary-old);
  color: var(--override-button-text-color);
}

.shadow-editor-button-left.enabled:focus,
.shadow-editor-button-right.enabled:focus {
  background-color: var(--color-primary-variant);
}

.shadow-editor-text-input {
  width: 52px;
  margin-right: 8px;
  text-align: right;
  box-shadow: var(--legacy-focus-ring-inactive-shadow);
}

@media (forced-colors: active) {
  .shadow-editor-button-left:hover,
  .shadow-editor-button-left.enabled:focus,
  .shadow-editor-button-right:hover .shadow-editor-button-left.enabled,
  .shadow-editor-button-right.enabled,
  .shadow-editor-button-right.enabled:focus {
    forced-color-adjust: none;
    background-color: Highlight;
    color: HighlightText;
  }
}

/*# sourceURL=${import.meta.resolve("./cssShadowEditor.css")} */`;

// gen/front_end/ui/legacy/components/inline_editor/CSSShadowEditor.js
var UIStrings2 = {
  /**
   * @description Text that refers to some types
   */
  type: "Type",
  /**
   * @description Text in CSSShadow Editor of the inline editor in the Styles tab
   */
  xOffset: "X offset",
  /**
   * @description Text in CSSShadow Editor of the inline editor in the Styles tab
   */
  yOffset: "Y offset",
  /**
   * @description Text in CSSShadow Editor of the inline editor in the Styles tab. Noun which is a
   * label for an input that allows the user to specify how blurred the box-shadow should be.
   */
  blur: "Blur",
  /**
   * @description Text in CSSShadow Editor of the inline editor in the Styles tab
   */
  spread: "Spread"
};
var str_2 = i18n3.i18n.registerUIStrings("ui/legacy/components/inline_editor/CSSShadowEditor.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var maxRange = 20;
var defaultUnit = "px";
var sliderThumbRadius = 6;
var canvasSize = 88;
var CSS_LENGTH_REGEX = function() {
  const number = "([+-]?(?:[0-9]*[.])?[0-9]+(?:[eE][+-]?[0-9]+)?)";
  const unit = "(ch|cm|em|ex|in|mm|pc|pt|px|rem|vh|vmax|vmin|vw)";
  const zero = "[+-]?(?:0*[.])?0+(?:[eE][+-]?[0-9]+)?";
  return new RegExp(number + unit + "|" + zero, "gi").source;
}();
var CSSLength = class _CSSLength {
  amount;
  unit;
  constructor(amount, unit) {
    this.amount = amount;
    this.unit = unit;
  }
  static parse(text) {
    const lengthRegex = new RegExp("^(?:" + CSS_LENGTH_REGEX + ")$", "i");
    const match = text.match(lengthRegex);
    if (!match) {
      return null;
    }
    if (match.length > 2 && match[2]) {
      return new _CSSLength(parseFloat(match[1]), match[2]);
    }
    return _CSSLength.zero();
  }
  static zero() {
    return new _CSSLength(0, "");
  }
  asCSSText() {
    return this.amount + this.unit;
  }
};
var CSSShadowEditor = class extends Common4.ObjectWrapper.eventMixin(UI5.Widget.VBox) {
  typeField;
  outsetButton;
  insetButton;
  xInput;
  yInput;
  xySlider;
  halfCanvasSize;
  innerCanvasSize;
  blurInput;
  blurSlider;
  spreadField;
  spreadInput;
  spreadSlider;
  model;
  canvasOrigin;
  changedElement;
  constructor() {
    super({ useShadowDom: true });
    this.registerRequiredCSS(cssShadowEditor_css_default);
    this.contentElement.tabIndex = 0;
    this.contentElement.setAttribute("jslog", `${VisualLogging7.dialog("cssShadowEditor").parent("mapped").track({ keydown: "Enter|Escape" })}`);
    this.setDefaultFocusedElement(this.contentElement);
    this.typeField = this.contentElement.createChild("div", "shadow-editor-field shadow-editor-flex-field");
    this.typeField.createChild("label", "shadow-editor-label").textContent = i18nString2(UIStrings2.type);
    this.outsetButton = this.typeField.createChild("button", "shadow-editor-button-left");
    this.outsetButton.textContent = i18n3.i18n.lockedString("Outset");
    this.outsetButton.addEventListener("click", this.onButtonClick.bind(this), false);
    this.insetButton = this.typeField.createChild("button", "shadow-editor-button-right");
    this.insetButton.textContent = i18n3.i18n.lockedString("Inset");
    this.insetButton.addEventListener("click", this.onButtonClick.bind(this), false);
    const xField = this.contentElement.createChild("div", "shadow-editor-field");
    this.xInput = this.createTextInput(xField, i18nString2(UIStrings2.xOffset), "x-offset");
    const yField = this.contentElement.createChild("div", "shadow-editor-field");
    this.yInput = this.createTextInput(yField, i18nString2(UIStrings2.yOffset), "y-offset");
    this.xySlider = xField.createChild("canvas", "shadow-editor-2D-slider");
    this.xySlider.setAttribute("jslog", `${VisualLogging7.slider("xy").track({
      click: true,
      drag: true,
      keydown: "ArrowUp|ArrowDown|ArrowLeft|ArrowRight"
    })}`);
    this.xySlider.width = canvasSize;
    this.xySlider.height = canvasSize;
    this.xySlider.tabIndex = -1;
    this.halfCanvasSize = canvasSize / 2;
    this.innerCanvasSize = this.halfCanvasSize - sliderThumbRadius;
    UI5.UIUtils.installDragHandle(this.xySlider, this.dragStart.bind(this), this.dragMove.bind(this), null, "default");
    this.xySlider.addEventListener("keydown", this.onCanvasArrowKey.bind(this), false);
    this.xySlider.addEventListener("blur", this.onCanvasBlur.bind(this), false);
    const blurField = this.contentElement.createChild("div", "shadow-editor-field shadow-editor-flex-field shadow-editor-blur-field");
    this.blurInput = this.createTextInput(blurField, i18nString2(UIStrings2.blur), "blur");
    this.blurSlider = this.createSlider(blurField, "blur");
    this.spreadField = this.contentElement.createChild("div", "shadow-editor-field shadow-editor-flex-field");
    this.spreadInput = this.createTextInput(this.spreadField, i18nString2(UIStrings2.spread), "spread");
    this.spreadSlider = this.createSlider(this.spreadField, "spread");
  }
  createTextInput(field, propertyName, jslogContext) {
    const label = field.createChild("label", "shadow-editor-label");
    label.textContent = propertyName;
    label.setAttribute("for", propertyName);
    const textInput = UI5.UIUtils.createInput("shadow-editor-text-input", "text");
    field.appendChild(textInput);
    textInput.id = propertyName;
    textInput.addEventListener("keydown", this.handleValueModification.bind(this), false);
    textInput.addEventListener("wheel", this.handleValueModification.bind(this), false);
    textInput.addEventListener("input", this.onTextInput.bind(this), false);
    textInput.addEventListener("blur", this.onTextBlur.bind(this), false);
    textInput.setAttribute("jslog", `${VisualLogging7.value().track({ change: true, keydown: "ArrowUp|ArrowDown" }).context(jslogContext)}`);
    return textInput;
  }
  createSlider(field, jslogContext) {
    const slider3 = UI5.UIUtils.createSlider(0, maxRange, -1);
    slider3.addEventListener("input", this.onSliderInput.bind(this), false);
    slider3.setAttribute("jslog", `${VisualLogging7.slider().track({ click: true, drag: true }).context(jslogContext)}`);
    field.appendChild(slider3);
    return slider3;
  }
  wasShown() {
    super.wasShown();
    this.updateUI();
  }
  setModel(model) {
    this.model = model;
    this.typeField.classList.toggle("hidden", !model.isBoxShadow());
    this.spreadField.classList.toggle("hidden", !model.isBoxShadow());
    this.updateUI();
  }
  updateUI() {
    this.updateButtons();
    this.xInput.value = this.model.offsetX().asCSSText();
    this.yInput.value = this.model.offsetY().asCSSText();
    this.blurInput.value = this.model.blurRadius().asCSSText();
    this.spreadInput.value = this.model.spreadRadius().asCSSText();
    this.blurSlider.value = this.model.blurRadius().amount.toString();
    this.spreadSlider.value = this.model.spreadRadius().amount.toString();
    this.updateCanvas(false);
  }
  updateButtons() {
    this.insetButton.classList.toggle("enabled", this.model.inset());
    this.outsetButton.classList.toggle("enabled", !this.model.inset());
  }
  updateCanvas(drawFocus) {
    const context = this.xySlider.getContext("2d");
    if (!context) {
      throw new Error("Unable to obtain canvas context");
    }
    context.clearRect(0, 0, this.xySlider.width, this.xySlider.height);
    context.save();
    context.setLineDash([1, 1]);
    context.strokeStyle = "rgba(210, 210, 210, 0.8)";
    context.beginPath();
    context.moveTo(this.halfCanvasSize, 0);
    context.lineTo(this.halfCanvasSize, canvasSize);
    context.moveTo(0, this.halfCanvasSize);
    context.lineTo(canvasSize, this.halfCanvasSize);
    context.stroke();
    context.restore();
    const thumbPoint = this.sliderThumbPosition();
    context.save();
    context.translate(this.halfCanvasSize, this.halfCanvasSize);
    context.lineWidth = 2;
    context.strokeStyle = "rgba(130, 130, 130, 0.75)";
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(thumbPoint.x, thumbPoint.y);
    context.stroke();
    if (drawFocus) {
      context.beginPath();
      context.fillStyle = "rgba(66, 133, 244, 0.4)";
      context.arc(thumbPoint.x, thumbPoint.y, sliderThumbRadius + 2, 0, 2 * Math.PI);
      context.fill();
    }
    context.beginPath();
    context.fillStyle = "#4285F4";
    context.arc(thumbPoint.x, thumbPoint.y, sliderThumbRadius, 0, 2 * Math.PI);
    context.fill();
    context.restore();
  }
  onButtonClick(event) {
    const insetClicked = event.currentTarget === this.insetButton;
    if (insetClicked && this.model.inset() || !insetClicked && !this.model.inset()) {
      return;
    }
    this.model.setInset(insetClicked);
    this.updateButtons();
    this.dispatchEventToListeners("ShadowChanged", this.model);
  }
  handleValueModification(event) {
    const target = event.currentTarget;
    const modifiedValue = UI5.UIUtils.createReplacementString(target.value, event, customNumberHandler);
    if (!modifiedValue) {
      return;
    }
    const length = CSSLength.parse(modifiedValue);
    if (!length) {
      return;
    }
    if (event.currentTarget === this.blurInput && length.amount < 0) {
      length.amount = 0;
    }
    target.value = length.asCSSText();
    target.selectionStart = 0;
    target.selectionEnd = target.value.length;
    this.onTextInput(event);
    event.consume(true);
    function customNumberHandler(prefix, number, suffix) {
      if (!suffix.length) {
        suffix = defaultUnit;
      }
      return prefix + number + suffix;
    }
  }
  onTextInput(event) {
    const currentTarget = event.currentTarget;
    this.changedElement = currentTarget;
    this.changedElement.classList.remove("invalid");
    const length = CSSLength.parse(currentTarget.value);
    if (!length || currentTarget === this.blurInput && length.amount < 0) {
      return;
    }
    if (currentTarget === this.xInput) {
      this.model.setOffsetX(length);
      this.updateCanvas(false);
    } else if (currentTarget === this.yInput) {
      this.model.setOffsetY(length);
      this.updateCanvas(false);
    } else if (currentTarget === this.blurInput) {
      this.model.setBlurRadius(length);
      this.blurSlider.value = length.amount.toString();
    } else if (currentTarget === this.spreadInput) {
      this.model.setSpreadRadius(length);
      this.spreadSlider.value = length.amount.toString();
    }
    this.dispatchEventToListeners("ShadowChanged", this.model);
  }
  onTextBlur() {
    if (!this.changedElement) {
      return;
    }
    let length = !this.changedElement.value.trim() ? CSSLength.zero() : CSSLength.parse(this.changedElement.value);
    if (!length) {
      length = CSSLength.parse(this.changedElement.value + defaultUnit);
    }
    if (!length) {
      this.changedElement.classList.add("invalid");
      this.changedElement = null;
      return;
    }
    if (this.changedElement === this.xInput) {
      this.model.setOffsetX(length);
      this.xInput.value = length.asCSSText();
      this.updateCanvas(false);
    } else if (this.changedElement === this.yInput) {
      this.model.setOffsetY(length);
      this.yInput.value = length.asCSSText();
      this.updateCanvas(false);
    } else if (this.changedElement === this.blurInput) {
      if (length.amount < 0) {
        length = CSSLength.zero();
      }
      this.model.setBlurRadius(length);
      this.blurInput.value = length.asCSSText();
      this.blurSlider.value = length.amount.toString();
    } else if (this.changedElement === this.spreadInput) {
      this.model.setSpreadRadius(length);
      this.spreadInput.value = length.asCSSText();
      this.spreadSlider.value = length.amount.toString();
    }
    this.changedElement = null;
    this.dispatchEventToListeners("ShadowChanged", this.model);
  }
  onSliderInput(event) {
    if (event.currentTarget === this.blurSlider) {
      this.model.setBlurRadius(new CSSLength(Number(this.blurSlider.value), this.model.blurRadius().unit || defaultUnit));
      this.blurInput.value = this.model.blurRadius().asCSSText();
      this.blurInput.classList.remove("invalid");
    } else if (event.currentTarget === this.spreadSlider) {
      this.model.setSpreadRadius(new CSSLength(Number(this.spreadSlider.value), this.model.spreadRadius().unit || defaultUnit));
      this.spreadInput.value = this.model.spreadRadius().asCSSText();
      this.spreadInput.classList.remove("invalid");
    }
    this.dispatchEventToListeners("ShadowChanged", this.model);
  }
  dragStart(event) {
    this.xySlider.focus();
    this.updateCanvas(true);
    this.canvasOrigin = new Geometry5.Point(this.xySlider.getBoundingClientRect().left + this.halfCanvasSize, this.xySlider.getBoundingClientRect().top + this.halfCanvasSize);
    const clickedPoint = new Geometry5.Point(event.x - this.canvasOrigin.x, event.y - this.canvasOrigin.y);
    const thumbPoint = this.sliderThumbPosition();
    if (clickedPoint.distanceTo(thumbPoint) >= sliderThumbRadius) {
      this.dragMove(event);
    }
    return true;
  }
  dragMove(event) {
    let point = new Geometry5.Point(event.x - this.canvasOrigin.x, event.y - this.canvasOrigin.y);
    if (event.shiftKey) {
      point = this.snapToClosestDirection(point);
    }
    const constrainedPoint = this.constrainPoint(point, this.innerCanvasSize);
    const newX = Math.round(constrainedPoint.x / this.innerCanvasSize * maxRange);
    const newY = Math.round(constrainedPoint.y / this.innerCanvasSize * maxRange);
    if (event.shiftKey) {
      this.model.setOffsetX(new CSSLength(newX, this.model.offsetX().unit || defaultUnit));
      this.model.setOffsetY(new CSSLength(newY, this.model.offsetY().unit || defaultUnit));
    } else {
      if (!event.altKey) {
        this.model.setOffsetX(new CSSLength(newX, this.model.offsetX().unit || defaultUnit));
      }
      if (!UI5.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(event)) {
        this.model.setOffsetY(new CSSLength(newY, this.model.offsetY().unit || defaultUnit));
      }
    }
    this.xInput.value = this.model.offsetX().asCSSText();
    this.yInput.value = this.model.offsetY().asCSSText();
    this.xInput.classList.remove("invalid");
    this.yInput.classList.remove("invalid");
    this.updateCanvas(true);
    this.dispatchEventToListeners("ShadowChanged", this.model);
  }
  onCanvasBlur() {
    this.updateCanvas(false);
  }
  onCanvasArrowKey(event) {
    const keyboardEvent = event;
    let shiftX = 0;
    let shiftY = 0;
    if (keyboardEvent.key === "ArrowRight") {
      shiftX = 1;
    } else if (keyboardEvent.key === "ArrowLeft") {
      shiftX = -1;
    } else if (keyboardEvent.key === "ArrowUp") {
      shiftY = -1;
    } else if (keyboardEvent.key === "ArrowDown") {
      shiftY = 1;
    }
    if (!shiftX && !shiftY) {
      return;
    }
    event.consume(true);
    if (shiftX) {
      const offsetX = this.model.offsetX();
      const newAmount = Platform5.NumberUtilities.clamp(offsetX.amount + shiftX, -maxRange, maxRange);
      if (newAmount === offsetX.amount) {
        return;
      }
      this.model.setOffsetX(new CSSLength(newAmount, offsetX.unit || defaultUnit));
      this.xInput.value = this.model.offsetX().asCSSText();
      this.xInput.classList.remove("invalid");
    }
    if (shiftY) {
      const offsetY = this.model.offsetY();
      const newAmount = Platform5.NumberUtilities.clamp(offsetY.amount + shiftY, -maxRange, maxRange);
      if (newAmount === offsetY.amount) {
        return;
      }
      this.model.setOffsetY(new CSSLength(newAmount, offsetY.unit || defaultUnit));
      this.yInput.value = this.model.offsetY().asCSSText();
      this.yInput.classList.remove("invalid");
    }
    this.updateCanvas(true);
    this.dispatchEventToListeners("ShadowChanged", this.model);
  }
  constrainPoint(point, max) {
    if (Math.abs(point.x) <= max && Math.abs(point.y) <= max) {
      return new Geometry5.Point(point.x, point.y);
    }
    return point.scale(max / Math.max(Math.abs(point.x), Math.abs(point.y)));
  }
  snapToClosestDirection(point) {
    let minDistance = Number.MAX_VALUE;
    let closestPoint = point;
    const directions = [
      new Geometry5.Point(0, -1),
      new Geometry5.Point(1, -1),
      new Geometry5.Point(1, 0),
      new Geometry5.Point(1, 1)
      // Southeast
    ];
    for (const direction of directions) {
      const projection = point.projectOn(direction);
      const distance = point.distanceTo(projection);
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = projection;
      }
    }
    return closestPoint;
  }
  sliderThumbPosition() {
    const x = this.model.offsetX().amount / maxRange * this.innerCanvasSize;
    const y = this.model.offsetY().amount / maxRange * this.innerCanvasSize;
    return this.constrainPoint(new Geometry5.Point(x, y), this.innerCanvasSize);
  }
};

// gen/front_end/ui/legacy/components/inline_editor/FontEditor.js
var FontEditor_exports = {};
__export(FontEditor_exports, {
  FontEditor: () => FontEditor
});
import "./../../legacy.js";
import * as Common5 from "./../../../../core/common/common.js";
import * as i18n5 from "./../../../../core/i18n/i18n.js";
import * as Platform6 from "./../../../../core/platform/platform.js";
import * as IconButton from "./../../../components/icon_button/icon_button.js";
import * as VisualLogging8 from "./../../../visual_logging/visual_logging.js";
import * as UI7 from "./../../legacy.js";

// gen/front_end/ui/legacy/components/inline_editor/fontEditor.css.js
var fontEditor_css_default = `/*
 * Copyright 2020 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  user-select: none;
  padding: 4px 12px 12px;
}

.error-input {
  box-shadow: 0 0 0 1px var(--sys-color-error);
}

.error-text {
  color: var(--sys-color-error);
  padding: 6px 0;
}

.warning-input {
  --override-warning-input-color: #ffdd9e;

  box-shadow: 0 0 0 1px var(--override-warning-input-color);
}

.theme-with-dark-background .warning-input,
:host-context(.theme-with-dark-background) .warning-input {
  --override-warning-input-color: rgb(97 63 0);
}

.hide-warning {
  display: none;
}

.font-section-header {
  font-weight: normal;
  font-size: 17px;
  text-align: left;
}

.font-section-subheader {
  font-size: 12px;
  text-align: left;
  font-weight: bold;
}

.font-selector-section {
  overflow-y: auto;
  padding-bottom: 10px;
}

.font-selector-input {
  width: 204px;
  text-align-last: center;
}

.font-reset-button {
  width: 100%;
  margin-top: 10px;
}

.font-section {
  border-top: 1px solid var(--sys-color-divider);
}

select.font-editor-select {
  min-width: 50px;
  min-height: 27px;
}

input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  display: none;
  margin: 0;
}

.preview-text {
  max-width: 300px;
  word-break: normal;
  overflow-wrap: anywhere;
  display: block;
}

.rendered-font-list-label {
  font-weight: bold;
  font-size: 12px;
}

.rendered-font-list {
  padding: 5px 0;
}

.shadow-editor-field {
  height: 24px;
  margin-top: 8px;
  font-size: 12px;
  flex-shrink: 0;
}

.shadow-editor-field:last-of-type {
  margin-bottom: 8px;
}

.shadow-editor-flex-field {
  display: flex;
  align-items: center;
  flex-direction: row;
}

.shadow-editor-field.shadow-editor-blur-field {
  margin-top: 40px;
}

.shadow-editor-2D-slider {
  position: absolute;
  height: 88px;
  width: 88px;
  border: 1px solid var(--divider-line);
  border-radius: 2px;
}

.shadow-editor-label {
  display: inline-block;
  width: 70px;
  height: 24px;
  line-height: 24px;
  margin-right: 8px;
  text-align: left;
}

.shadow-editor-button-left,
.shadow-editor-button-right {
  width: 74px;
  height: 24px;
  padding: 3px 7px;
  line-height: 16px;
  border: 1px solid var(--divider-line);
  color: var(--sys-color-on-surface);
  background-color: var(--sys-color-cdt-base-container);
  text-align: center;
  font-weight: 500;
}

.shadow-editor-button-left {
  border-radius: 2px 0 0 2px;
}

.shadow-editor-button-right {
  border-radius: 0 2px 2px 0;
  border-left-width: 0;
}

.shadow-editor-button-left:hover,
.shadow-editor-button-right:hover {
  box-shadow: 0 1px 1px var(--divider-line);
}

.shadow-editor-button-left:focus,
.shadow-editor-button-right:focus {
  background-color: var(--sys-color-state-focus-highlight);
}

.shadow-editor-text-input {
  width: 50px;
  margin: 8px;
  text-align: center;
  box-shadow: var(--legacy-focus-ring-inactive-shadow);
}

.spectrum-switcher {
  border-radius: 2px;
  height: 20px;
  width: 20px;
  padding: 2px;
  margin-left: 5px;
}

.spectrum-switcher:hover {
  background-color: var(--sys-color-state-hover-on-subtle);
}

.spectrum-switcher:focus-visible {
  background-color: var(--sys-color-state-focus-highlight);
}

/*# sourceURL=${import.meta.resolve("./fontEditor.css")} */`;

// gen/front_end/ui/legacy/components/inline_editor/FontEditorUnitConverter.js
var FontEditorUnitConverter_exports = {};
__export(FontEditorUnitConverter_exports, {
  getUnitConversionMultiplier: () => getUnitConversionMultiplier
});
import * as SDK from "./../../../../core/sdk/sdk.js";
import * as CssOverviewModule from "./../../../../panels/css_overview/css_overview.js";
import * as UI6 from "./../../legacy.js";
var computedArrayFontSizeIndex = 6;
function getPxMultiplier() {
  return 1;
}
async function getEmMultiplier(isFontSizeProperty) {
  const selectedNode = UI6.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);
  let currentFontSize;
  if (selectedNode?.parentNode && selectedNode.nodeName() !== "HTML") {
    const [model] = SDK.TargetManager.TargetManager.instance().models(CssOverviewModule.CSSOverviewModel.CSSOverviewModel);
    const fontSizeNodeId = isFontSizeProperty ? selectedNode.parentNode.id : selectedNode.id;
    const computedFontSize = await model.getComputedStyleForNode(fontSizeNodeId).then(findFontSizeValue);
    const computedFontSizeValue = computedFontSize.replace(/[a-z]/g, "");
    currentFontSize = parseFloat(computedFontSizeValue);
  } else {
    currentFontSize = 16;
  }
  return currentFontSize;
}
async function getRemMultiplier() {
  const selectedNode = UI6.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);
  const htmlNode = findHtmlNode(selectedNode);
  if (!htmlNode?.id) {
    return 16;
  }
  const [model] = SDK.TargetManager.TargetManager.instance().models(CssOverviewModule.CSSOverviewModel.CSSOverviewModel);
  const computedRootFontSize = await model.getComputedStyleForNode(htmlNode.id).then(findFontSizeValue);
  const rootFontSizeValue = computedRootFontSize.replace(/[a-z]/g, "");
  const rootFontSize = parseFloat(rootFontSizeValue);
  return rootFontSize;
}
async function getPercentMultiplier(isFontSizeProperty) {
  const emMultiplier = await getEmMultiplier(isFontSizeProperty);
  const percMultiplier = emMultiplier / 100;
  return percMultiplier;
}
async function getVhMultiplier() {
  const viewportObject = await getViewportObject();
  if (!viewportObject) {
    return 1;
  }
  const viewportHeight = viewportObject.height;
  const vhMultiplier = viewportHeight / 100;
  return vhMultiplier;
}
async function getVwMultiplier() {
  const viewportObject = await getViewportObject();
  if (!viewportObject) {
    return 1;
  }
  const viewportWidth = viewportObject.width;
  const vwMultiplier = viewportWidth / 100;
  return vwMultiplier;
}
async function getVminMultiplier() {
  const viewportObject = await getViewportObject();
  if (!viewportObject) {
    return 1;
  }
  const viewportWidth = viewportObject.width;
  const viewportHeight = viewportObject.height;
  const minViewportSize = Math.min(viewportWidth, viewportHeight);
  const vminMultiplier = minViewportSize / 100;
  return vminMultiplier;
}
async function getVmaxMultiplier() {
  const viewportObject = await getViewportObject();
  if (!viewportObject) {
    return 1;
  }
  const viewportWidth = viewportObject.width;
  const viewportHeight = viewportObject.height;
  const maxViewportSize = Math.max(viewportWidth, viewportHeight);
  const vmaxMultiplier = maxViewportSize / 100;
  return vmaxMultiplier;
}
function getCmMultiplier() {
  return 37.795;
}
function getMmMultiplier() {
  return 3.7795;
}
function getInMultiplier() {
  return 96;
}
function getPtMultiplier() {
  return 4 / 3;
}
function getPcMultiplier() {
  return 16;
}
function findFontSizeValue(computedObject) {
  const computedArray = computedObject.computedStyle;
  let index = computedArrayFontSizeIndex;
  if (computedArray[index].name && computedArray[index].name !== "font-size") {
    for (let i = 0; i < computedArray.length; i++) {
      if (computedArray[i].name === "font-size") {
        index = i;
        break;
      }
    }
  }
  return computedArray[index].value;
}
function findHtmlNode(selectedNode) {
  let node = selectedNode;
  while (node && node.nodeName() !== "HTML") {
    if (node.parentNode) {
      node = node.parentNode;
    } else {
      break;
    }
  }
  return node;
}
var widthEvaluateParams = {
  expression: "window.innerWidth",
  includeCommandLineAPI: false,
  silent: true,
  returnByValue: false,
  generatePreview: false,
  userGesture: false,
  awaitPromise: true,
  throwOnSideEffect: false,
  disableBreaks: true,
  replMode: false,
  allowUnsafeEvalBlockedByCSP: false
};
var heightEvaluateParams = {
  expression: "window.innerHeight",
  includeCommandLineAPI: false,
  silent: true,
  returnByValue: false,
  generatePreview: false,
  userGesture: false,
  awaitPromise: true,
  throwOnSideEffect: false,
  disableBreaks: true,
  replMode: false,
  allowUnsafeEvalBlockedByCSP: false
};
async function getViewportObject() {
  const currentExecutionContext = UI6.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext);
  let width, height;
  if (currentExecutionContext) {
    const widthObject = await currentExecutionContext.evaluate(widthEvaluateParams, false, false);
    const heightObject = await currentExecutionContext.evaluate(heightEvaluateParams, false, false);
    if ("error" in widthObject || "error" in heightObject) {
      return null;
    }
    if (widthObject.object) {
      width = widthObject.object.value;
    }
    if (heightObject.object) {
      height = heightObject.object.value;
    }
  }
  if (width === void 0 || height === void 0) {
    const selectedNode = UI6.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);
    if (!selectedNode) {
      return null;
    }
    const pageLayout = await selectedNode.domModel().target().pageAgent().invoke_getLayoutMetrics();
    const zoom = pageLayout.visualViewport.zoom ? pageLayout.visualViewport.zoom : 1;
    height = pageLayout.visualViewport.clientHeight / zoom;
    width = pageLayout.visualViewport.clientWidth / zoom;
  }
  return { width, height };
}
var unitConversionMap = /* @__PURE__ */ new Map();
unitConversionMap.set("px", getPxMultiplier);
unitConversionMap.set("em", getEmMultiplier);
unitConversionMap.set("rem", getRemMultiplier);
unitConversionMap.set("%", getPercentMultiplier);
unitConversionMap.set("vh", getVhMultiplier);
unitConversionMap.set("vw", getVwMultiplier);
unitConversionMap.set("vmin", getVminMultiplier);
unitConversionMap.set("vmax", getVmaxMultiplier);
unitConversionMap.set("cm", getCmMultiplier);
unitConversionMap.set("mm", getMmMultiplier);
unitConversionMap.set("in", getInMultiplier);
unitConversionMap.set("pt", getPtMultiplier);
unitConversionMap.set("pc", getPcMultiplier);
async function getUnitConversionMultiplier(prevUnit, newUnit, isFontSize) {
  if (prevUnit === "") {
    prevUnit = "em";
  }
  if (newUnit === "") {
    newUnit = "em";
  }
  let prevUnitMultiplier, newUnitMultiplier;
  const prevUnitFunction = unitConversionMap.get(prevUnit);
  const newUnitFunction = unitConversionMap.get(newUnit);
  if (prevUnitFunction && newUnitFunction) {
    if (prevUnit === "em" || prevUnit === "%") {
      prevUnitMultiplier = await prevUnitFunction(isFontSize);
    } else {
      prevUnitMultiplier = await prevUnitFunction();
    }
    if (newUnit === "em" || newUnit === "%") {
      newUnitMultiplier = await newUnitFunction(isFontSize);
    } else {
      newUnitMultiplier = await newUnitFunction();
    }
  } else {
    return 1;
  }
  return prevUnitMultiplier / newUnitMultiplier;
}

// gen/front_end/ui/legacy/components/inline_editor/FontEditorUtils.js
var FontEditorUtils_exports = {};
__export(FontEditorUtils_exports, {
  FontSizeStaticParams: () => FontSizeStaticParams,
  FontWeightStaticParams: () => FontWeightStaticParams,
  GenericFonts: () => GenericFonts,
  GlobalValues: () => GlobalValues,
  LetterSpacingStaticParams: () => LetterSpacingStaticParams,
  LineHeightStaticParams: () => LineHeightStaticParams,
  SystemFonts: () => SystemFonts,
  generateComputedFontArray: () => generateComputedFontArray,
  getRoundingPrecision: () => getRoundingPrecision
});
import * as SDK2 from "./../../../../core/sdk/sdk.js";
import * as CssOverviewModule2 from "./../../../../panels/css_overview/css_overview.js";
var fontSizeRegex = /(^[\+\d\.]+)([a-zA-Z%]+)/;
var lineHeightRegex = /(^[\+\d\.]+)([a-zA-Z%]*)/;
var fontWeightRegex = /(^[\+\d\.]+)/;
var letterSpacingRegex = /([\+-0-9\.]+)([a-zA-Z%]+)/;
var fontSizeUnits = /* @__PURE__ */ new Set(["px", "em", "rem", "%", "vh", "vw"]);
var lineHeightUnits = /* @__PURE__ */ new Set(["", "px", "em", "%"]);
var letterSpacingUnits = /* @__PURE__ */ new Set(["em", "rem", "px"]);
var fontSizeKeyValuesArray = [
  "",
  "xx-small",
  "x-small",
  "smaller",
  "small",
  "medium",
  "large",
  "larger",
  "x-large",
  "xx-large"
];
var lineHeightKeyValuesArray = ["", "normal"];
var fontWeightKeyValuesArray = ["", "lighter", "normal", "bold", "bolder"];
var letterSpacingKeyValuesArray = ["", "normal"];
var GlobalValues = ["inherit", "initial", "unset"];
fontSizeKeyValuesArray.push(...GlobalValues);
lineHeightKeyValuesArray.push(...GlobalValues);
fontWeightKeyValuesArray.push(...GlobalValues);
letterSpacingKeyValuesArray.push(...GlobalValues);
var fontSizeKeyValues = new Set(fontSizeKeyValuesArray);
var lineHeightKeyValues = new Set(lineHeightKeyValuesArray);
var fontWeightKeyValues = new Set(fontWeightKeyValuesArray);
var letterSpacingKeyValues = new Set(letterSpacingKeyValuesArray);
var fontSizeRangeMap = /* @__PURE__ */ new Map([
  // Common Units
  ["px", { min: 0, max: 72, step: 1 }],
  ["em", { min: 0, max: 4.5, step: 0.1 }],
  ["rem", { min: 0, max: 4.5, step: 0.1 }],
  ["%", { min: 0, max: 450, step: 1 }],
  ["vh", { min: 0, max: 10, step: 0.1 }],
  ["vw", { min: 0, max: 10, step: 0.1 }],
  // Extra Units
  ["vmin", { min: 0, max: 10, step: 0.1 }],
  ["vmax", { min: 0, max: 10, step: 0.1 }],
  ["cm", { min: 0, max: 2, step: 0.1 }],
  ["mm", { min: 0, max: 20, step: 0.1 }],
  ["in", { min: 0, max: 1, step: 0.01 }],
  ["pt", { min: 0, max: 54, step: 1 }],
  ["pc", { min: 0, max: 4.5, step: 0.1 }]
]);
var lineHeightRangeMap = /* @__PURE__ */ new Map([
  // Common Units
  ["", { min: 0, max: 2, step: 0.1 }],
  ["em", { min: 0, max: 2, step: 0.1 }],
  ["%", { min: 0, max: 200, step: 1 }],
  ["px", { min: 0, max: 32, step: 1 }],
  // Extra Units
  ["rem", { min: 0, max: 2, step: 0.1 }],
  ["vh", { min: 0, max: 4.5, step: 0.1 }],
  ["vw", { min: 0, max: 4.5, step: 0.1 }],
  ["vmin", { min: 0, max: 4.5, step: 0.1 }],
  ["vmax", { min: 0, max: 4.5, step: 0.1 }],
  ["cm", { min: 0, max: 1, step: 0.1 }],
  ["mm", { min: 0, max: 8.5, step: 0.1 }],
  ["in", { min: 0, max: 0.5, step: 0.1 }],
  ["pt", { min: 0, max: 24, step: 1 }],
  ["pc", { min: 0, max: 2, step: 0.1 }]
]);
var fontWeightRangeMap = /* @__PURE__ */ new Map([
  ["", { min: 100, max: 700, step: 100 }]
]);
var letterSpacingRangeMap = /* @__PURE__ */ new Map([
  // Common Units
  ["px", { min: -10, max: 10, step: 0.01 }],
  ["em", { min: -0.625, max: 0.625, step: 1e-3 }],
  ["rem", { min: -0.625, max: 0.625, step: 1e-3 }],
  // Extra Units
  ["%", { min: -62.5, max: 62.5, step: 0.1 }],
  ["vh", { min: -1.5, max: 1.5, step: 0.01 }],
  ["vw", { min: -1.5, max: 1.5, step: 0.01 }],
  ["vmin", { min: -1.5, max: 1.5, step: 0.01 }],
  ["vmax", { min: -1.5, max: 1.5, step: 0.01 }],
  ["cm", { min: -0.25, max: 0.025, step: 1e-3 }],
  ["mm", { min: -2.5, max: 2.5, step: 0.01 }],
  ["in", { min: -0.1, max: 0.1, step: 1e-3 }],
  ["pt", { min: -7.5, max: 7.5, step: 0.01 }],
  ["pc", { min: -0.625, max: 0.625, step: 1e-3 }]
]);
var FontSizeStaticParams = {
  regex: fontSizeRegex,
  units: fontSizeUnits,
  keyValues: fontSizeKeyValues,
  rangeMap: fontSizeRangeMap,
  defaultUnit: "px"
};
var LineHeightStaticParams = {
  regex: lineHeightRegex,
  units: lineHeightUnits,
  keyValues: lineHeightKeyValues,
  rangeMap: lineHeightRangeMap,
  defaultUnit: ""
};
var FontWeightStaticParams = {
  regex: fontWeightRegex,
  units: null,
  keyValues: fontWeightKeyValues,
  rangeMap: fontWeightRangeMap,
  defaultUnit: null
};
var LetterSpacingStaticParams = {
  regex: letterSpacingRegex,
  units: letterSpacingUnits,
  keyValues: letterSpacingKeyValues,
  rangeMap: letterSpacingRangeMap,
  defaultUnit: "em"
};
var SystemFonts = [
  "Arial",
  "Bookman",
  "Candara",
  "Comic Sans MS",
  "Courier New",
  "Garamond",
  "Georgia",
  "Helvetica",
  "Impact",
  "Palatino",
  "Roboto",
  "Times New Roman",
  "Verdana"
];
var GenericFonts = [
  "serif",
  "sans-serif",
  "monspace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "emoji",
  "math",
  "fangsong"
];
async function generateComputedFontArray() {
  const modelArray = SDK2.TargetManager.TargetManager.instance().models(CssOverviewModule2.CSSOverviewModel.CSSOverviewModel);
  if (modelArray) {
    const cssOverviewModel = modelArray[0];
    if (cssOverviewModel) {
      const { fontInfo } = await cssOverviewModel.getNodeStyleStats();
      const computedFontArray = Array.from(fontInfo.keys());
      return computedFontArray;
    }
  }
  return [];
}
function getRoundingPrecision(step) {
  switch (step) {
    case 1:
      return 0;
    case 0.1:
      return 1;
    case 0.01:
      return 2;
    case 1e-3:
      return 3;
    default:
      return 0;
  }
}

// gen/front_end/ui/legacy/components/inline_editor/FontEditor.js
var UIStrings3 = {
  /**
   * @description Font editor label for font family selector
   */
  fontFamily: "Font Family",
  /**
   * @description Section header for CSS property inputs
   */
  cssProperties: "CSS Properties",
  /**
   * @description Font size slider label for Font Editor
   */
  fontSize: "Font Size",
  /**
   * @description Line height slider label for Font Editor
   */
  lineHeight: "Line Height",
  /**
   * @description Font weight slider label for Font Editor
   */
  fontWeight: "Font Weight",
  /**
   * @description Label for letter-spacing labels
   */
  spacing: "Spacing",
  /**
   * @description Label for numbered fallback selectors
   * @example {2} PH1
   */
  fallbackS: "Fallback {PH1}",
  /**
   * @description Announcement for deleting an empty font family selector in the Font Editor
   * @example {2} PH1
   */
  thereIsNoValueToDeleteAtIndexS: "There is no value to delete at index: {PH1}",
  /**
   * @description Announcement when deleting a font selector in the Font Editor
   * @example {2} PH1
   */
  fontSelectorDeletedAtIndexS: "Font Selector deleted at index: {PH1}",
  /**
   * @description Label for Font Editor button to delete font family/fallback selectors
   * @example {Fallback 1} PH1
   */
  deleteS: "Delete {PH1}",
  /**
   * @description Warning message for Font Editor invalid text input. The placeholder is the name of
   * the CSS attribute that is incorrect.
   * @example {font-size} PH1
   */
  PleaseEnterAValidValueForSText: "* Please enter a valid value for {PH1} text input",
  /**
   * @description Error text in Font Editor
   * @example {font-size} PH1
   */
  thisPropertyIsSetToContainUnits: "This property is set to contain units but does not have a defined corresponding unitsArray: {PH1}",
  /**
   * @description Label for slider input in the Font Editor.
   * @example {font-size} PH1
   */
  sSliderInput: "{PH1} Slider Input",
  /**
   * @description Accessible label for a text input for a property in the Font Editor.
   * @example {font-size} PH1
   */
  sTextInput: "{PH1} Text Input",
  /**
   * @description Font Editor units text box label
   */
  units: "Units",
  /**
   * @description Accessible name for Font Editor unit input. The placeholder is the name of the font
   * property that this UI input controls. e.g. font-size, line-height, line-weight.
   * @example {font-size} PH1
   */
  sUnitInput: "{PH1} Unit Input",
  /**
   * @description Text used in the Font Editor for the key values selector
   * @example {font-size} PH1
   */
  sKeyValueSelector: "{PH1} Key Value Selector",
  /**
   * @description Label for Font Editor toggle input type button. The placeholder is the name of the
   * font property that this UI input controls. e.g. font-size, line-height, line-weight. Tooltip for
   * a button next to the text input which allows the user to change the input type. When they click
   * this button, the UI changes to allow the user to choose from a list of pre-selected font
   * categories.
   * @example {font-size} PH1
   */
  sToggleInputType: "{PH1} toggle input type",
  /**
   * @description Label for Font Editor alert in CSS Properties section when toggling inputs
   */
  selectorInputMode: "Selector Input Mode",
  /**
   * @description Label for Font Editor alert in CSS Properties section when toggling inputs
   */
  sliderInputMode: "Slider Input Mode"
};
var str_3 = i18n5.i18n.registerUIStrings("ui/legacy/components/inline_editor/FontEditor.ts", UIStrings3);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
var FontEditor = class extends Common5.ObjectWrapper.eventMixin(UI7.Widget.VBox) {
  propertyMap;
  fontSelectorSection;
  fontSelectors;
  fontsList;
  constructor(propertyMap) {
    super({ useShadowDom: true });
    this.registerRequiredCSS(fontEditor_css_default);
    this.propertyMap = propertyMap;
    this.contentElement.tabIndex = 0;
    this.contentElement.setAttribute("jslog", `${VisualLogging8.dialog("font-editor").parent("mapped").track({ keydown: "Enter|Escape" })}`);
    this.setDefaultFocusedElement(this.contentElement);
    this.fontSelectorSection = this.contentElement.createChild("div", "font-selector-section");
    this.fontSelectorSection.createChild("h2", "font-section-header").textContent = i18nString3(UIStrings3.fontFamily);
    this.fontSelectors = [];
    this.fontsList = null;
    const propertyValue = this.propertyMap.get("font-family");
    void this.createFontSelectorSection(propertyValue);
    const cssPropertySection = this.contentElement.createChild("div", "font-section");
    cssPropertySection.createChild("h2", "font-section-header").textContent = i18nString3(UIStrings3.cssProperties);
    const fontSizePropertyInfo = this.getPropertyInfo("font-size", FontSizeStaticParams.regex);
    const lineHeightPropertyInfo = this.getPropertyInfo("line-height", LineHeightStaticParams.regex);
    const fontWeightPropertyInfo = this.getPropertyInfo("font-weight", FontWeightStaticParams.regex);
    const letterSpacingPropertyInfo = this.getPropertyInfo("letter-spacing", LetterSpacingStaticParams.regex);
    new FontPropertyInputs(
      "font-size",
      i18nString3(UIStrings3.fontSize),
      cssPropertySection,
      fontSizePropertyInfo,
      FontSizeStaticParams,
      this.updatePropertyValue.bind(this),
      this.resizePopout.bind(this),
      /** hasUnits= */
      true
    );
    new FontPropertyInputs(
      "line-height",
      i18nString3(UIStrings3.lineHeight),
      cssPropertySection,
      lineHeightPropertyInfo,
      LineHeightStaticParams,
      this.updatePropertyValue.bind(this),
      this.resizePopout.bind(this),
      /** hasUnits= */
      true
    );
    new FontPropertyInputs(
      "font-weight",
      i18nString3(UIStrings3.fontWeight),
      cssPropertySection,
      fontWeightPropertyInfo,
      FontWeightStaticParams,
      this.updatePropertyValue.bind(this),
      this.resizePopout.bind(this),
      /** hasUnits= */
      false
    );
    new FontPropertyInputs(
      "letter-spacing",
      i18nString3(UIStrings3.spacing),
      cssPropertySection,
      letterSpacingPropertyInfo,
      LetterSpacingStaticParams,
      this.updatePropertyValue.bind(this),
      this.resizePopout.bind(this),
      /** hasUnits= */
      true
    );
  }
  async createFontSelectorSection(propertyValue) {
    if (propertyValue) {
      const splitValue = propertyValue.split(",");
      await this.createFontSelector(
        splitValue[0],
        /* isPrimary= */
        true
      );
      if (!GlobalValues.includes(splitValue[0])) {
        for (let i = 1; i < splitValue.length + 1; i++) {
          void this.createFontSelector(splitValue[i]);
        }
      }
    } else {
      void this.createFontSelector("", true);
    }
    this.resizePopout();
  }
  async createFontsList() {
    const computedFontArray = await generateComputedFontArray();
    const computedMap = /* @__PURE__ */ new Map();
    const splicedArray = this.splitComputedFontArray(computedFontArray);
    computedMap.set("Computed Fonts", splicedArray);
    const systemMap = /* @__PURE__ */ new Map();
    systemMap.set("System Fonts", SystemFonts);
    systemMap.set("Generic Families", GenericFonts);
    const fontList = [];
    fontList.push(computedMap);
    fontList.push(systemMap);
    return fontList;
  }
  splitComputedFontArray(computedFontArray) {
    const array = [];
    for (const fontFamilyValue of computedFontArray) {
      if (fontFamilyValue.includes(",")) {
        const fonts = fontFamilyValue.split(",");
        fonts.forEach((element) => {
          if (array.findIndex((item) => item.toLowerCase() === element.trim().toLowerCase().replace(/"/g, "'")) === -1) {
            array.push(element.trim().replace(/"/g, ""));
          }
        });
      } else if (array.findIndex((item) => item.toLowerCase() === fontFamilyValue.toLowerCase().replace('"', "'")) === -1) {
        array.push(fontFamilyValue.replace(/"/g, ""));
      }
    }
    return array;
  }
  async createFontSelector(value2, isPrimary) {
    value2 = value2 ? value2.trim() : "";
    if (value2) {
      const firstChar = value2.charAt(0);
      if (firstChar === "'") {
        value2 = value2.replace(/'/g, "");
      } else if (firstChar === '"') {
        value2 = value2.replace(/"/g, "");
      }
    }
    const selectorField = this.fontSelectorSection.createChild("div", "shadow-editor-field shadow-editor-flex-field");
    if (!this.fontsList) {
      this.fontsList = await this.createFontsList();
    }
    let label;
    if (isPrimary) {
      label = i18nString3(UIStrings3.fontFamily);
      const globalValuesMap = /* @__PURE__ */ new Map([["Global Values", GlobalValues]]);
      const primaryFontList = [...this.fontsList];
      primaryFontList.push(globalValuesMap);
      this.createSelector(selectorField, label, primaryFontList, value2.trim(), "primary-font-family");
    } else {
      label = i18nString3(UIStrings3.fallbackS, { PH1: this.fontSelectors.length });
      this.createSelector(selectorField, label, this.fontsList, value2.trim(), "fallback-font-family");
    }
  }
  deleteFontSelector(index, isGlobalValue) {
    let fontSelectorObject = this.fontSelectors[index];
    const isPrimary = index === 0;
    if (fontSelectorObject.input.value === "" && !isGlobalValue) {
      UI7.ARIAUtils.LiveAnnouncer.alert(i18nString3(UIStrings3.thereIsNoValueToDeleteAtIndexS, { PH1: index }));
      return;
    }
    if (isPrimary) {
      const secondarySelector = this.fontSelectors[1];
      let newPrimarySelectorValue = "";
      if (secondarySelector) {
        newPrimarySelectorValue = secondarySelector.input.value;
        fontSelectorObject = secondarySelector;
      }
      const primarySelector = this.fontSelectors[0].input;
      primarySelector.value = newPrimarySelectorValue;
      index = 1;
    }
    if (fontSelectorObject.input.parentNode) {
      const hasSecondarySelector = this.fontSelectors.length > 1;
      if (!isPrimary || hasSecondarySelector) {
        const selectorElement = fontSelectorObject.input.parentElement;
        if (selectorElement) {
          selectorElement.remove();
          this.fontSelectors.splice(index, 1);
          this.updateFontSelectorList();
        }
      }
      UI7.ARIAUtils.LiveAnnouncer.alert(i18nString3(UIStrings3.fontSelectorDeletedAtIndexS, { PH1: index }));
    }
    this.onFontSelectorChanged();
    this.resizePopout();
    const focusIndex = isPrimary ? 0 : index - 1;
    this.fontSelectors[focusIndex].input.focus();
  }
  updateFontSelectorList() {
    for (let i = 0; i < this.fontSelectors.length; i++) {
      const fontSelectorObject = this.fontSelectors[i];
      let label;
      if (i === 0) {
        label = i18nString3(UIStrings3.fontFamily);
      } else {
        label = i18nString3(UIStrings3.fallbackS, { PH1: i });
      }
      fontSelectorObject.label.textContent = label;
      UI7.ARIAUtils.setLabel(fontSelectorObject.input, label);
      fontSelectorObject.deleteButton.setTitle(i18nString3(UIStrings3.deleteS, { PH1: label }));
      fontSelectorObject.index = i;
    }
  }
  getPropertyInfo(name, regex) {
    const value2 = this.propertyMap.get(name);
    if (value2) {
      const valueString = value2;
      const match = valueString.match(regex);
      if (match) {
        const retValue = match[1].charAt(0) === "+" ? match[1].substr(1) : match[1];
        const retUnits = match[2] ? match[2] : "";
        return { value: retValue, units: retUnits };
      }
      return { value: valueString, units: null };
    }
    return { value: null, units: null };
  }
  createSelector(field, label, options, currentValue, jslogContext) {
    const index = this.fontSelectors.length;
    const selectInput = UI7.UIUtils.createSelect(label, options);
    selectInput.value = currentValue;
    selectInput.setAttribute("jslog", `${VisualLogging8.dropDown(jslogContext).track({ click: true, change: true })}`);
    const selectLabel = UI7.UIUtils.createLabel(label, "shadow-editor-label", selectInput);
    selectInput.addEventListener("input", this.onFontSelectorChanged.bind(this), false);
    selectInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.consume();
      }
    }, false);
    field.appendChild(selectLabel);
    field.appendChild(selectInput);
    const deleteToolbar = field.createChild("devtools-toolbar");
    const deleteButton = new UI7.Toolbar.ToolbarButton(i18nString3(UIStrings3.deleteS, { PH1: label }), "bin", void 0, "delete");
    deleteToolbar.appendToolbarItem(deleteButton);
    const fontSelectorObject = { label: selectLabel, input: selectInput, deleteButton, index };
    deleteButton.addEventListener("Click", () => {
      this.deleteFontSelector(fontSelectorObject.index);
    });
    deleteButton.element.addEventListener("keydown", (event) => {
      if (Platform6.KeyboardUtilities.isEnterOrSpaceKey(event)) {
        this.deleteFontSelector(fontSelectorObject.index);
        event.consume();
      }
    }, false);
    this.fontSelectors.push(fontSelectorObject);
  }
  onFontSelectorChanged() {
    let value2 = "";
    const isGlobalValue = GlobalValues.includes(this.fontSelectors[0].input.value);
    if (isGlobalValue) {
      for (let i = 1; i < this.fontSelectors.length; i++) {
        this.deleteFontSelector(
          i,
          /** isGlobalValue= */
          true
        );
      }
    }
    for (const fontSelector of this.fontSelectors) {
      const fontSelectorInput = fontSelector.input;
      if (fontSelectorInput.value !== "") {
        if (value2 === "") {
          value2 = this.fontSelectors[0].input.value;
        } else {
          value2 += ", " + fontSelectorInput.value;
        }
      }
    }
    if (this.fontSelectors[this.fontSelectors.length - 1].input.value !== "" && !isGlobalValue && this.fontSelectors.length < 10) {
      void this.createFontSelector(
        /** value= */
        ""
      );
      this.resizePopout();
    }
    this.updatePropertyValue("font-family", value2);
  }
  updatePropertyValue(propertyName, value2) {
    this.dispatchEventToListeners("FontChanged", { propertyName, value: value2 });
  }
  resizePopout() {
    this.dispatchEventToListeners(
      "FontEditorResized"
      /* Events.FONT_EDITOR_RESIZED */
    );
  }
};
var FontPropertyInputs = class {
  showSliderMode;
  errorText;
  propertyInfo;
  propertyName;
  staticParams;
  hasUnits;
  units;
  addedUnit;
  initialRange;
  boundUpdateCallback;
  boundResizeCallback;
  sliderInput;
  textBoxInput;
  unitInput;
  selectorInput;
  applyNextInput;
  constructor(propertyName, label, field, propertyInfo, staticParams, updateCallback, resizeCallback, hasUnits) {
    this.showSliderMode = true;
    const propertyField = field.createChild("div", "shadow-editor-field shadow-editor-flex-field");
    this.errorText = field.createChild("div", "error-text");
    this.errorText.textContent = i18nString3(UIStrings3.PleaseEnterAValidValueForSText, { PH1: propertyName });
    this.errorText.hidden = true;
    UI7.ARIAUtils.markAsAlert(this.errorText);
    this.propertyInfo = propertyInfo;
    this.propertyName = propertyName;
    this.staticParams = staticParams;
    this.hasUnits = hasUnits;
    if (this.hasUnits && this.staticParams.units && this.staticParams.defaultUnit !== null) {
      const defaultUnits = this.staticParams.defaultUnit;
      this.units = propertyInfo.units !== null ? propertyInfo.units : defaultUnits;
      this.addedUnit = !this.staticParams.units.has(this.units);
    } else if (this.hasUnits) {
      throw new Error(i18nString3(UIStrings3.thisPropertyIsSetToContainUnits, { PH1: propertyName }));
    } else {
      this.units = "";
    }
    this.initialRange = this.getUnitRange();
    this.boundUpdateCallback = updateCallback;
    this.boundResizeCallback = resizeCallback;
    const propertyLabel = UI7.UIUtils.createLabel(label, "shadow-editor-label");
    propertyField.append(propertyLabel);
    this.sliderInput = this.createSliderInput(propertyField, propertyName);
    this.textBoxInput = this.createTextBoxInput(propertyField, propertyName);
    UI7.ARIAUtils.bindLabelToControl(propertyLabel, this.textBoxInput);
    this.unitInput = this.createUnitInput(propertyField, `${propertyName}-unit`);
    this.selectorInput = this.createSelectorInput(propertyField, propertyName);
    this.createTypeToggle(propertyField, `${propertyName}-value-type`);
    this.checkSelectorValueAndToggle();
    this.applyNextInput = false;
  }
  setInvalidTextBoxInput(invalid) {
    if (invalid) {
      if (this.errorText.hidden) {
        this.errorText.hidden = false;
        this.textBoxInput.classList.add("error-input");
        this.boundResizeCallback();
      }
    } else if (!this.errorText.hidden) {
      this.errorText.hidden = true;
      this.textBoxInput.classList.remove("error-input");
      this.boundResizeCallback();
    }
  }
  checkSelectorValueAndToggle() {
    if (this.staticParams.keyValues && this.propertyInfo.value !== null && this.staticParams.keyValues.has(this.propertyInfo.value)) {
      this.toggleInputType();
      return true;
    }
    return false;
  }
  getUnitRange() {
    let min = 0;
    let max = 100;
    let step = 1;
    if (this.propertyInfo.value !== null && /\d/.test(this.propertyInfo.value)) {
      if (this.staticParams.rangeMap.get(this.units)) {
        const unitRangeMap = this.staticParams.rangeMap.get(this.units);
        if (unitRangeMap) {
          min = Math.min(unitRangeMap.min, parseFloat(this.propertyInfo.value));
          max = Math.max(unitRangeMap.max, parseFloat(this.propertyInfo.value));
          step = unitRangeMap.step;
        }
      } else {
        const unitRangeMap = this.staticParams.rangeMap.get("px");
        if (unitRangeMap) {
          min = Math.min(unitRangeMap.min, parseFloat(this.propertyInfo.value));
          max = Math.max(unitRangeMap.max, parseFloat(this.propertyInfo.value));
          step = unitRangeMap.step;
        }
      }
    } else {
      const unitRangeMap = this.staticParams.rangeMap.get(this.units);
      if (unitRangeMap) {
        min = unitRangeMap.min;
        max = unitRangeMap.max;
        step = unitRangeMap.step;
      }
    }
    return { min, max, step };
  }
  createSliderInput(field, jslogContext) {
    const min = this.initialRange.min;
    const max = this.initialRange.max;
    const step = this.initialRange.step;
    const slider3 = UI7.UIUtils.createSlider(min, max, -1);
    slider3.step = step.toString();
    slider3.tabIndex = 0;
    if (this.propertyInfo.value) {
      slider3.value = this.propertyInfo.value;
    } else {
      const newValue = (min + max) / 2;
      slider3.value = newValue.toString();
    }
    slider3.addEventListener("input", (event) => {
      this.onSliderInput(
        event,
        /** apply= */
        false
      );
    });
    slider3.addEventListener("mouseup", (event) => {
      this.onSliderInput(
        event,
        /** apply= */
        true
      );
    });
    slider3.addEventListener("keydown", (event) => {
      if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "ArrowLeft" || event.key === "ArrowRight") {
        this.applyNextInput = true;
      }
    });
    field.appendChild(slider3);
    UI7.ARIAUtils.setLabel(slider3, i18nString3(UIStrings3.sSliderInput, { PH1: this.propertyName }));
    slider3.setAttribute("jslog", `${VisualLogging8.slider(jslogContext).track({ change: true })}`);
    return slider3;
  }
  createTextBoxInput(field, jslogContext) {
    const textBoxInput = UI7.UIUtils.createInput("shadow-editor-text-input", "number", jslogContext);
    textBoxInput.step = this.initialRange.step.toString();
    textBoxInput.classList.add("font-editor-text-input");
    if (this.propertyInfo.value !== null) {
      if (this.propertyInfo.value.charAt(0) === "+") {
        this.propertyInfo.value = this.propertyInfo.value.substr(1);
      }
      textBoxInput.value = this.propertyInfo.value;
    }
    textBoxInput.step = "any";
    textBoxInput.addEventListener("input", this.onTextBoxInput.bind(this), false);
    field.appendChild(textBoxInput);
    UI7.ARIAUtils.setLabel(textBoxInput, i18nString3(UIStrings3.sTextInput, { PH1: this.propertyName }));
    return textBoxInput;
  }
  createUnitInput(field, jslogContext) {
    let unitInput;
    if (this.hasUnits && this.staticParams.units) {
      const currentValue = this.propertyInfo.units;
      const options = this.staticParams.units;
      unitInput = UI7.UIUtils.createSelect(i18nString3(UIStrings3.units), options);
      unitInput.classList.add("font-editor-select");
      if (this.addedUnit && currentValue) {
        unitInput.add(new Option(currentValue, currentValue));
      }
      if (currentValue) {
        unitInput.value = currentValue;
      }
      unitInput.addEventListener("change", this.onUnitInput.bind(this), false);
    } else {
      unitInput = UI7.UIUtils.createSelect(i18nString3(UIStrings3.units), []);
      unitInput.classList.add("font-editor-select");
      unitInput.disabled = true;
    }
    unitInput.setAttribute("jslog", `${VisualLogging8.dropDown(jslogContext).track({ click: true, change: true })}`);
    unitInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.consume();
      }
    }, false);
    field.appendChild(unitInput);
    UI7.ARIAUtils.setLabel(unitInput, i18nString3(UIStrings3.sUnitInput, { PH1: this.propertyName }));
    return unitInput;
  }
  createSelectorInput(field, jslogContext) {
    const selectInput = UI7.UIUtils.createSelect(i18nString3(UIStrings3.sKeyValueSelector, { PH1: this.propertyName }), this.staticParams.keyValues);
    selectInput.classList.add("font-selector-input");
    if (this.propertyInfo.value) {
      selectInput.value = this.propertyInfo.value;
    }
    selectInput.addEventListener("input", this.onSelectorInput.bind(this), false);
    selectInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.consume();
      }
    }, false);
    field.appendChild(selectInput);
    selectInput.hidden = true;
    selectInput.setAttribute("jslog", `${VisualLogging8.dropDown(jslogContext).track({ click: true, change: true })}`);
    return selectInput;
  }
  onSelectorInput(event) {
    if (event.currentTarget) {
      const value2 = event.currentTarget.value;
      this.textBoxInput.value = "";
      const newValue = (parseFloat(this.sliderInput.min) + parseFloat(this.sliderInput.max)) / 2;
      this.sliderInput.value = newValue.toString();
      this.setInvalidTextBoxInput(false);
      this.boundUpdateCallback(this.propertyName, value2);
    }
  }
  onSliderInput(event, apply) {
    const target = event.currentTarget;
    if (target) {
      const value2 = target.value;
      this.textBoxInput.value = value2;
      this.selectorInput.value = "";
      const valueString = this.hasUnits ? value2 + this.unitInput.value : value2.toString();
      this.setInvalidTextBoxInput(false);
      if (apply || this.applyNextInput) {
        this.boundUpdateCallback(this.propertyName, valueString);
        this.applyNextInput = false;
      }
    }
  }
  onTextBoxInput(event) {
    const target = event.currentTarget;
    if (target) {
      const value2 = target.value;
      const units = value2 === "" ? "" : this.unitInput.value;
      const valueString = value2 + units;
      if (this.staticParams.regex.test(valueString) || value2 === "" && !target.validationMessage.length) {
        if (parseFloat(value2) > parseFloat(this.sliderInput.max)) {
          this.sliderInput.max = value2;
        } else if (parseFloat(value2) < parseFloat(this.sliderInput.min)) {
          this.sliderInput.min = value2;
        }
        this.sliderInput.value = value2;
        this.selectorInput.value = "";
        this.setInvalidTextBoxInput(false);
        this.boundUpdateCallback(this.propertyName, valueString);
      } else {
        this.setInvalidTextBoxInput(true);
      }
    }
  }
  async onUnitInput(event) {
    const unitInput = event.currentTarget;
    const hasFocus = unitInput.hasFocus();
    const newUnit = unitInput.value;
    unitInput.disabled = true;
    const prevUnit = this.units;
    const conversionMultiplier = await getUnitConversionMultiplier(prevUnit, newUnit, this.propertyName === "font-size");
    this.setInputUnits(conversionMultiplier, newUnit);
    if (this.textBoxInput.value) {
      this.boundUpdateCallback(this.propertyName, this.textBoxInput.value + newUnit);
    }
    this.units = newUnit;
    unitInput.disabled = false;
    if (hasFocus) {
      unitInput.focus();
    }
  }
  createTypeToggle(field, jslogContext) {
    const displaySwitcher = field.createChild("div", "spectrum-switcher");
    const icon = new IconButton.Icon.Icon();
    icon.name = "fold-more";
    icon.classList.add("medium");
    displaySwitcher.appendChild(icon);
    UI7.UIUtils.setTitle(displaySwitcher, i18nString3(UIStrings3.sToggleInputType, { PH1: this.propertyName }));
    displaySwitcher.tabIndex = 0;
    self.onInvokeElement(displaySwitcher, this.toggleInputType.bind(this));
    UI7.ARIAUtils.markAsButton(displaySwitcher);
    displaySwitcher.setAttribute("jslog", `${VisualLogging8.toggle(jslogContext).track({ click: true })}`);
  }
  toggleInputType(event) {
    if (event && event.key === "Enter") {
      event.consume();
    }
    if (this.showSliderMode) {
      this.sliderInput.hidden = true;
      this.textBoxInput.hidden = true;
      this.unitInput.hidden = true;
      this.selectorInput.hidden = false;
      this.showSliderMode = false;
      UI7.ARIAUtils.LiveAnnouncer.alert(i18nString3(UIStrings3.selectorInputMode));
    } else {
      this.sliderInput.hidden = false;
      this.textBoxInput.hidden = false;
      this.unitInput.hidden = false;
      this.selectorInput.hidden = true;
      this.showSliderMode = true;
      UI7.ARIAUtils.LiveAnnouncer.alert(i18nString3(UIStrings3.sliderInputMode));
    }
  }
  setInputUnits(multiplier, newUnit) {
    const newRangeMap = this.staticParams.rangeMap.get(newUnit);
    let newMin, newMax, newStep;
    if (newRangeMap) {
      newMin = newRangeMap.min;
      newMax = newRangeMap.max;
      newStep = newRangeMap.step;
    } else {
      newMin = 0;
      newMax = 100;
      newStep = 1;
    }
    let hasValue = false;
    const roundingPrecision = getRoundingPrecision(newStep);
    let newValue = (newMin + newMax) / 2;
    if (this.textBoxInput.value) {
      hasValue = true;
      newValue = parseFloat((parseFloat(this.textBoxInput.value) * multiplier).toFixed(roundingPrecision));
    }
    this.sliderInput.min = Math.min(newValue, newMin).toString();
    this.sliderInput.max = Math.max(newValue, newMax).toString();
    this.sliderInput.step = newStep.toString();
    this.textBoxInput.step = newStep.toString();
    if (hasValue) {
      this.textBoxInput.value = newValue.toString();
    }
    this.sliderInput.value = newValue.toString();
  }
};

// gen/front_end/ui/legacy/components/inline_editor/LinkSwatch.js
var LinkSwatch_exports = {};
__export(LinkSwatch_exports, {
  LinkSwatch: () => LinkSwatch
});
import * as Platform7 from "./../../../../core/platform/platform.js";
import * as Buttons from "./../../../components/buttons/buttons.js";
import * as Lit6 from "./../../../lit/lit.js";
import * as VisualLogging9 from "./../../../visual_logging/visual_logging.js";

// gen/front_end/ui/legacy/components/inline_editor/linkSwatch.css.js
var linkSwatch_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.link-swatch-link {
  display: inline;
}

.link-swatch-link:not(.undefined) {
  cursor: pointer;
  text-underline-offset: 2px;
  color: var(--text-link);
}

.link-swatch-link:hover:not(.undefined) {
  text-decoration: underline;
}

.link-swatch-link:focus:not(:focus-visible) {
  outline: none;
}

.link-swatch-link.undefined {
  opacity: 100%;
  color: var(--text-disabled);
}

/*# sourceURL=${import.meta.resolve("./linkSwatch.css")} */`;

// gen/front_end/ui/legacy/components/inline_editor/LinkSwatch.js
var { render: render6, html: html6, nothing, Directives: { ref: ref2, ifDefined, classMap } } = Lit6;
var LinkSwatch = class extends HTMLElement {
  onLinkActivate = () => void 0;
  #linkElement;
  connectedCallback() {
  }
  set data(data) {
    this.onLinkActivate = (linkText, event) => {
      if (event instanceof MouseEvent && event.button !== 0) {
        return;
      }
      if (event instanceof KeyboardEvent && event.key !== Platform7.KeyboardUtilities.ENTER_KEY && event.key !== " ") {
        return;
      }
      data.onLinkActivate(linkText);
      event.consume(true);
    };
    this.render(data);
  }
  get linkElement() {
    return this.#linkElement;
  }
  render(data) {
    const { isDefined, text, jslogContext, tooltip } = data;
    const classes = classMap({
      "link-style": true,
      "text-button": true,
      "link-swatch-link": true,
      undefined: !isDefined
    });
    const onActivate = isDefined ? this.onLinkActivate.bind(this, text.trim()) : null;
    const title = tooltip && "title" in tooltip && tooltip.title || void 0;
    const tooltipId = tooltip && "tooltipId" in tooltip && tooltip.tooltipId || void 0;
    render6(html6`
        <style>${Buttons.textButtonStyles}</style>
        <style>${linkSwatch_css_default}</style>
        <button .disabled=${!isDefined} class=${classes} type="button" title=${ifDefined(title)}
                aria-details=${ifDefined(tooltipId)} @click=${onActivate} @keydown=${onActivate}
                role="link"
                jslog=${jslogContext ? VisualLogging9.link().track({ click: true }).context(jslogContext) : nothing}
                tabindex=${ifDefined(isDefined ? -1 : void 0)}
                ${ref2((e) => {
      this.#linkElement = e;
    })}>
           ${text}
        </button>`, this);
  }
};
customElements.define("devtools-link-swatch", LinkSwatch);

// gen/front_end/ui/legacy/components/inline_editor/Swatches.js
var Swatches_exports = {};
__export(Swatches_exports, {
  CSSShadowSwatch: () => CSSShadowSwatch
});
import "./../../../components/icon_button/icon_button.js";
import { html as html7, render as render7 } from "./../../../lit/lit.js";

// gen/front_end/ui/legacy/components/inline_editor/cssShadowSwatch.css.js
var cssShadowSwatch_css_default = `/*
 * Copyright 2016 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

devtools-icon.shadow-swatch-icon {
  color: var(--icon-css);
  transform: scale(0.7);
  position: relative;
  margin: -5px -2px -5px -4px;
  user-select: none;
  vertical-align: baseline;
  cursor: pointer;

  &:hover {
    color: var(--icon-css-hover);
  }
}

/*# sourceURL=${import.meta.resolve("./cssShadowSwatch.css")} */`;

// gen/front_end/ui/legacy/components/inline_editor/Swatches.js
var CSSShadowSwatch = class extends HTMLElement {
  #icon;
  #model;
  constructor(model) {
    super();
    this.#model = model;
    render7(html7`
        <style>${cssShadowSwatch_css_default}</style>
        <devtools-icon tabindex=-1 name="shadow" class="shadow-swatch-icon"></devtools-icon>`, this, { host: this });
    this.#icon = this.querySelector("devtools-icon");
  }
  model() {
    return this.#model;
  }
  iconElement() {
    return this.#icon;
  }
};
customElements.define("css-shadow-swatch", CSSShadowSwatch);

// gen/front_end/ui/legacy/components/inline_editor/SwatchPopoverHelper.js
var SwatchPopoverHelper_exports = {};
__export(SwatchPopoverHelper_exports, {
  SwatchPopoverHelper: () => SwatchPopoverHelper
});
import * as Common6 from "./../../../../core/common/common.js";
import * as Platform8 from "./../../../../core/platform/platform.js";
import * as VisualLogging10 from "./../../../visual_logging/visual_logging.js";
import * as UI8 from "./../../legacy.js";

// gen/front_end/ui/legacy/components/inline_editor/swatchPopover.css.js
var swatchPopover_css_default = `/*
 * Copyright 2017 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.widget {
  display: flex;
  overflow: auto;
  user-select: text;
  font: var(--sys-typescale-body4-regular);
  line-height: 11px;
  box-shadow: var(--sys-elevation-level2);
  background-color: var(--sys-color-base-container-elevated);
  border-radius: var(--sys-shape-corner-extra-small);
}

.with-padding {
  padding: var(--sys-size-4);
  border-radius: var(--sys-shape-corner-small);
}

/*# sourceURL=${import.meta.resolve("./swatchPopover.css")} */`;

// gen/front_end/ui/legacy/components/inline_editor/SwatchPopoverHelper.js
var SwatchPopoverHelper = class extends Common6.ObjectWrapper.ObjectWrapper {
  popover;
  hideProxy;
  boundOnKeyDown;
  boundFocusOut;
  isHidden;
  anchorElement;
  view;
  hiddenCallback;
  focusRestorer;
  constructor() {
    super();
    this.popover = new UI8.GlassPane.GlassPane();
    this.popover.setSizeBehavior(
      "MeasureContent"
      /* UI.GlassPane.SizeBehavior.MEASURE_CONTENT */
    );
    this.popover.setMarginBehavior(
      "DefaultMargin"
      /* UI.GlassPane.MarginBehavior.DEFAULT_MARGIN */
    );
    this.popover.element.addEventListener("mousedown", (e) => e.consume(), false);
    this.hideProxy = this.hide.bind(this, true);
    this.boundOnKeyDown = this.onKeyDown.bind(this);
    this.boundFocusOut = this.onFocusOut.bind(this);
    this.isHidden = true;
    this.anchorElement = null;
  }
  onFocusOut(event) {
    const relatedTarget = event.relatedTarget;
    if (this.isHidden || !relatedTarget || !this.view || relatedTarget.isSelfOrDescendant(this.view.contentElement)) {
      return;
    }
    this.hideProxy();
  }
  setAnchorElement(anchorElement) {
    this.anchorElement = anchorElement;
  }
  isShowing(view) {
    return this.popover.isShowing() && (view && this.view === view || !view);
  }
  show(view, anchorElement, hiddenCallback) {
    if (this.popover.isShowing()) {
      if (this.anchorElement === anchorElement) {
        return;
      }
      this.hide(true);
    }
    VisualLogging10.setMappedParent(view.contentElement, anchorElement);
    this.popover.registerRequiredCSS(swatchPopover_css_default);
    this.dispatchEventToListeners(
      "WillShowPopover"
      /* Events.WILL_SHOW_POPOVER */
    );
    this.isHidden = false;
    this.anchorElement = anchorElement;
    this.view = view;
    this.hiddenCallback = hiddenCallback;
    this.reposition();
    view.focus();
    const document2 = this.popover.element.ownerDocument;
    document2.addEventListener("mousedown", this.hideProxy, false);
    if (document2.defaultView) {
      document2.defaultView.addEventListener("resize", this.hideProxy, false);
    }
    this.view.contentElement.addEventListener("keydown", this.boundOnKeyDown, false);
  }
  reposition() {
    if (this.isHidden || !this.view) {
      return;
    }
    this.view.contentElement.removeEventListener("focusout", this.boundFocusOut, false);
    this.view.show(this.popover.contentElement);
    if (this.anchorElement) {
      let anchorBox = this.anchorElement.boxInWindow();
      if (ColorSwatch.isColorSwatch(this.anchorElement)) {
        const swatch = this.anchorElement;
        if (!swatch.anchorBox) {
          return;
        }
        anchorBox = swatch.anchorBox;
      }
      this.popover.setContentAnchorBox(anchorBox);
      this.popover.show(this.anchorElement.ownerDocument);
    }
    this.view.contentElement.addEventListener("focusout", this.boundFocusOut, false);
    if (!this.focusRestorer) {
      this.focusRestorer = new UI8.Widget.WidgetFocusRestorer(this.view);
    }
  }
  hide(commitEdit) {
    if (this.isHidden) {
      return;
    }
    const document2 = this.popover.element.ownerDocument;
    this.isHidden = true;
    this.popover.hide();
    document2.removeEventListener("mousedown", this.hideProxy, false);
    if (document2.defaultView) {
      document2.defaultView.removeEventListener("resize", this.hideProxy, false);
    }
    if (this.hiddenCallback) {
      this.hiddenCallback.call(null, Boolean(commitEdit));
    }
    if (this.focusRestorer) {
      this.focusRestorer.restore();
    }
    this.anchorElement = null;
    if (this.view) {
      this.view.detach();
      this.view.contentElement.removeEventListener("keydown", this.boundOnKeyDown, false);
      this.view.contentElement.removeEventListener("focusout", this.boundFocusOut, false);
      delete this.view;
    }
  }
  onKeyDown(event) {
    if (event.key === "Enter") {
      this.hide(true);
      event.consume(true);
      return;
    }
    if (event.key === Platform8.KeyboardUtilities.ESCAPE_KEY) {
      this.hide(false);
      event.consume(true);
    }
  }
};
export {
  AnimationTimingModel_exports as AnimationTimingModel,
  AnimationTimingUI_exports as AnimationTimingUI,
  BezierEditor_exports as BezierEditor,
  BezierUI_exports as BezierUI,
  CSSAngle_exports as CSSAngle,
  CSSAngleUtils_exports as CSSAngleUtils,
  CSSLinearEasingModel_exports as CSSLinearEasingModel,
  CSSShadowEditor_exports as CSSShadowEditor,
  ColorMixSwatch_exports as ColorMixSwatch,
  ColorSwatch_exports as ColorSwatch,
  FontEditor_exports as FontEditor,
  FontEditorUnitConverter_exports as FontEditorUnitConverter,
  FontEditorUtils_exports as FontEditorUtils,
  InlineEditorUtils_exports as InlineEditorUtils,
  LinkSwatch_exports as LinkSwatch,
  SwatchPopoverHelper_exports as SwatchPopoverHelper,
  Swatches_exports as Swatches
};
//# sourceMappingURL=inline_editor.js.map
