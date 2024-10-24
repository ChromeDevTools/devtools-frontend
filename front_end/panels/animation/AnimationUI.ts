// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as InlineEditor from '../../ui/legacy/components/inline_editor/inline_editor.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {type AnimationTimeline, StepTimingFunction} from './AnimationTimeline.js';

const UIStrings = {
  /**
   *@description Title of the first and last points of an animation
   */
  animationEndpointSlider: 'Animation Endpoint slider',
  /**
   *@description Title of an Animation Keyframe point
   */
  animationKeyframeSlider: 'Animation Keyframe slider',
  /**
   *@description Title of an animation keyframe group
   *@example {anilogo} PH1
   */
  sSlider: '{PH1} slider',
};
const str_ = i18n.i18n.registerUIStrings('panels/animation/AnimationUI.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

type CachedElement = {
  group: HTMLElement|null,
  animationLine: HTMLElement|null,
  keyframePoints: {[x: number]: HTMLElement},
  keyframeRender: {[x: number]: HTMLElement},
};

export class AnimationUI {
  #animationInternal: SDK.AnimationModel.AnimationImpl;
  #timeline: AnimationTimeline;
  #keyframes?: SDK.AnimationModel.KeyframeStyle[];
  #nameElement: HTMLElement;
  readonly #svg: Element;
  #activeIntervalGroup: Element;
  #cachedElements: CachedElement[];
  #movementInMs: number;
  #keyboardMovementRateMs: number;
  #color: string;
  #node?: SDK.DOMModel.DOMNode|null;
  #delayLine?: Element;
  #endDelayLine?: Element;
  #tailGroup?: Element;
  #mouseEventType?: Events;
  #keyframeMoved?: number|null;
  #downMouseX?: number;

  constructor(animation: SDK.AnimationModel.AnimationImpl, timeline: AnimationTimeline, parentElement: Element) {
    this.#animationInternal = animation;
    this.#timeline = timeline;

    const keyframesRule = this.#animationInternal.source().keyframesRule();
    if (keyframesRule) {
      this.#keyframes = keyframesRule.keyframes();
      if (animation.viewOrScrollTimeline() && animation.playbackRate() < 0) {
        this.#keyframes.reverse();
      }
    }
    this.#nameElement = (parentElement.createChild('div', 'animation-name') as HTMLElement);
    this.#nameElement.textContent = this.#animationInternal.name();

    this.#svg = UI.UIUtils.createSVGChild(parentElement, 'svg', 'animation-ui');
    this.#svg.setAttribute('height', Options.AnimationSVGHeight.toString());
    (this.#svg as HTMLElement).style.marginLeft = '-' + Options.AnimationMargin + 'px';
    this.#svg.addEventListener('contextmenu', this.onContextMenu.bind(this));
    this.#activeIntervalGroup = UI.UIUtils.createSVGChild(this.#svg, 'g');
    this.#activeIntervalGroup.setAttribute('jslog', `${VisualLogging.animationClip().track({drag: true})}`);

    if (!this.#animationInternal.viewOrScrollTimeline()) {
      UI.UIUtils.installDragHandle(
          this.#activeIntervalGroup, this.mouseDown.bind(this, Events.ANIMATION_DRAG, null), this.mouseMove.bind(this),
          this.mouseUp.bind(this), '-webkit-grabbing', '-webkit-grab');
      AnimationUI.installDragHandleKeyboard(
          this.#activeIntervalGroup, this.keydownMove.bind(this, Events.ANIMATION_DRAG, null));
    }

    this.#cachedElements = [];

    this.#movementInMs = 0;
    this.#keyboardMovementRateMs = 50;
    this.#color = AnimationUI.colorForAnimation(this.#animationInternal);
  }

  static colorForAnimation(animation: SDK.AnimationModel.AnimationImpl): string {
    const names = Array.from(Colors.keys());
    const hashCode = Platform.StringUtilities.hashCode(animation.name() || animation.id());
    const cappedHashCode = hashCode % names.length;
    const colorName = names[cappedHashCode];
    const color = Colors.get(colorName);
    if (!color) {
      throw new Error('Unable to locate color');
    }
    return color.asString(Common.Color.Format.RGB) || '';
  }

  static installDragHandleKeyboard(element: Element, elementDrag: (arg0: Event) => void): void {
    element.addEventListener('keydown', elementDrag, false);
  }

  animation(): SDK.AnimationModel.AnimationImpl {
    return this.#animationInternal;
  }

  get nameElement(): HTMLElement {
    return this.#nameElement;
  }

  get svg(): Element {
    return this.#svg;
  }

  setNode(node: SDK.DOMModel.DOMNode|null): void {
    this.#node = node;
  }

  private createLine(parentElement: HTMLElement, className: string): Element {
    const line = UI.UIUtils.createSVGChild(parentElement, 'line', className);
    line.setAttribute('x1', Options.AnimationMargin.toString());
    line.setAttribute('y1', Options.AnimationHeight.toString());
    line.setAttribute('y2', Options.AnimationHeight.toString());
    (line as HTMLElement).style.stroke = this.#color;
    return line;
  }

  private drawAnimationLine(iteration: number, parentElement: HTMLElement): void {
    const cache = this.#cachedElements[iteration];
    if (!cache.animationLine) {
      cache.animationLine = (this.createLine(parentElement, 'animation-line') as HTMLElement);
    }
    if (!cache.animationLine) {
      return;
    }

    cache.animationLine.setAttribute(
        'x2', (this.duration() * this.#timeline.pixelTimeRatio() + Options.AnimationMargin).toFixed(2));
  }

  private drawDelayLine(parentElement: HTMLElement): void {
    if (!this.#delayLine || !this.#endDelayLine) {
      this.#delayLine = this.createLine(parentElement, 'animation-delay-line');
      this.#endDelayLine = this.createLine(parentElement, 'animation-delay-line');
    }
    const fill = this.#animationInternal.source().fill();
    this.#delayLine.classList.toggle('animation-fill', fill === 'backwards' || fill === 'both');
    const margin = Options.AnimationMargin;
    this.#delayLine.setAttribute('x1', margin.toString());
    this.#delayLine.setAttribute('x2', (this.delayOrStartTime() * this.#timeline.pixelTimeRatio() + margin).toFixed(2));

    const forwardsFill = fill === 'forwards' || fill === 'both';
    this.#endDelayLine.classList.toggle('animation-fill', forwardsFill);
    const leftMargin = Math.min(
        this.#timeline.width(),
        (this.delayOrStartTime() + this.duration() * this.#animationInternal.source().iterations()) *
            this.#timeline.pixelTimeRatio());
    (this.#endDelayLine as HTMLElement).style.transform = 'translateX(' + leftMargin.toFixed(2) + 'px)';
    this.#endDelayLine.setAttribute('x1', margin.toString());
    this.#endDelayLine.setAttribute(
        'x2',
        forwardsFill ?
            (this.#timeline.width() - leftMargin + margin).toFixed(2) :
            (this.#animationInternal.source().endDelay() * this.#timeline.pixelTimeRatio() + margin).toFixed(2));
  }

  private drawPoint(iteration: number, parentElement: Element, x: number, keyframeIndex: number, attachEvents: boolean):
      void {
    if (this.#cachedElements[iteration].keyframePoints[keyframeIndex]) {
      this.#cachedElements[iteration].keyframePoints[keyframeIndex].setAttribute('cx', x.toFixed(2));
      return;
    }

    const circle =
        (UI.UIUtils.createSVGChild(
             parentElement, 'circle', keyframeIndex <= 0 ? 'animation-endpoint' : 'animation-keyframe-point') as
         HTMLElement);
    circle.setAttribute('cx', x.toFixed(2));
    circle.setAttribute('cy', Options.AnimationHeight.toString());
    circle.style.stroke = this.#color;
    circle.setAttribute('r', (Options.AnimationMargin / 2).toString());
    circle.setAttribute('jslog', `${VisualLogging.controlPoint('animations.keyframe').track({drag: true})}`);
    circle.tabIndex = 0;
    UI.ARIAUtils.setLabel(
        circle,
        keyframeIndex <= 0 ? i18nString(UIStrings.animationEndpointSlider) :
                             i18nString(UIStrings.animationKeyframeSlider));

    if (keyframeIndex <= 0) {
      circle.style.fill = this.#color;
    }
    this.#cachedElements[iteration].keyframePoints[keyframeIndex] = (circle as HTMLElement);

    if (!attachEvents) {
      return;
    }

    let eventType: Events;
    if (keyframeIndex === 0) {
      eventType = Events.START_ENDPOINT_MOVE;
    } else if (keyframeIndex === -1) {
      eventType = Events.FINISH_ENDPOINT_MOVE;
    } else {
      eventType = Events.KEYFRAME_MOVE;
    }

    if (!this.animation().viewOrScrollTimeline()) {
      UI.UIUtils.installDragHandle(
          circle, this.mouseDown.bind(this, eventType, keyframeIndex), this.mouseMove.bind(this),
          this.mouseUp.bind(this), 'ew-resize');
      AnimationUI.installDragHandleKeyboard(circle, this.keydownMove.bind(this, eventType, keyframeIndex));
    }
  }

  private renderKeyframe(
      iteration: number, keyframeIndex: number, parentElement: HTMLElement, leftDistance: number, width: number,
      easing: string): void {
    function createStepLine(parentElement: HTMLElement, x: number, strokeColor: string): void {
      const line = (UI.UIUtils.createSVGChild(parentElement, 'line') as HTMLElement);
      line.setAttribute('x1', x.toString());
      line.setAttribute('x2', x.toString());
      line.setAttribute('y1', Options.AnimationMargin.toString());
      line.setAttribute('y2', Options.AnimationHeight.toString());
      line.style.stroke = strokeColor;
    }

    const bezier = UI.Geometry.CubicBezier.parse(easing);
    const cache = this.#cachedElements[iteration].keyframeRender;
    if (!cache[keyframeIndex]) {
      const svg = bezier ? UI.UIUtils.createSVGChild(parentElement, 'path', 'animation-keyframe') :
                           UI.UIUtils.createSVGChild(parentElement, 'g', 'animation-keyframe-step');
      cache[keyframeIndex] = (svg as HTMLElement);
    }
    const group = cache[keyframeIndex];
    group.tabIndex = 0;
    UI.ARIAUtils.setLabel(group, i18nString(UIStrings.sSlider, {PH1: this.#animationInternal.name()}));
    group.style.transform = 'translateX(' + leftDistance.toFixed(2) + 'px)';

    if (easing === 'linear') {
      group.style.fill = this.#color;
      const height = InlineEditor.BezierUI.Height;
      group.setAttribute(
          'd', ['M', 0, height, 'L', 0, 5, 'L', width.toFixed(2), 5, 'L', width.toFixed(2), height, 'Z'].join(' '));
    } else if (bezier) {
      group.style.fill = this.#color;
      InlineEditor.BezierUI.BezierUI.drawVelocityChart(bezier, group, width);
    } else {
      const stepFunction = StepTimingFunction.parse(easing);
      group.removeChildren();
      const offsetMap: {[x: string]: number} = {start: 0, middle: 0.5, end: 1};
      if (stepFunction) {
        const offsetWeight = offsetMap[stepFunction.stepAtPosition];
        for (let i = 0; i < stepFunction.steps; i++) {
          createStepLine(group, (i + offsetWeight) * width / stepFunction.steps, this.#color);
        }
      }
    }
  }

  redraw(): void {
    const maxWidth = this.#timeline.width() - Options.AnimationMargin;

    this.#svg.setAttribute('width', (maxWidth + 2 * Options.AnimationMargin).toFixed(2));
    (this.#activeIntervalGroup as HTMLElement).style.transform =
        'translateX(' + (this.delayOrStartTime() * this.#timeline.pixelTimeRatio()).toFixed(2) + 'px)';

    this.#nameElement.style.transform = 'translateX(' +
        (Math.max(this.delayOrStartTime(), 0) * this.#timeline.pixelTimeRatio() + Options.AnimationMargin).toFixed(2) +
        'px)';
    this.#nameElement.style.width = (this.duration() * this.#timeline.pixelTimeRatio()).toFixed(2) + 'px';
    this.drawDelayLine((this.#svg as HTMLElement));

    if (this.#animationInternal.type() === 'CSSTransition') {
      this.renderTransition();
      return;
    }

    this.renderIteration(this.#activeIntervalGroup, 0);
    if (!this.#tailGroup) {
      this.#tailGroup = UI.UIUtils.createSVGChild(this.#activeIntervalGroup, 'g', 'animation-tail-iterations');
    }
    const iterationWidth = this.duration() * this.#timeline.pixelTimeRatio();
    let iteration;
    // Some iterations are getting rendered in an invisible area if the delay is negative.
    const invisibleAreaWidth =
        this.delayOrStartTime() < 0 ? -this.delayOrStartTime() * this.#timeline.pixelTimeRatio() : 0;
    for (iteration = 1; iteration < this.#animationInternal.source().iterations() &&
         iterationWidth * (iteration - 1) < invisibleAreaWidth + this.#timeline.width() &&
         (iterationWidth > 0 || this.#animationInternal.source().iterations() !== Infinity);
         iteration++) {
      this.renderIteration(this.#tailGroup, iteration);
    }
    while (iteration < this.#cachedElements.length) {
      const poppedElement = this.#cachedElements.pop();
      if (poppedElement && poppedElement.group) {
        poppedElement.group.remove();
      }
    }
  }

  private renderTransition(): void {
    const activeIntervalGroup = (this.#activeIntervalGroup as HTMLElement);
    if (!this.#cachedElements[0]) {
      this.#cachedElements[0] = {animationLine: null, keyframePoints: {}, keyframeRender: {}, group: null};
    }
    this.drawAnimationLine(0, activeIntervalGroup);
    this.renderKeyframe(
        0, 0, activeIntervalGroup, Options.AnimationMargin, this.duration() * this.#timeline.pixelTimeRatio(),
        this.#animationInternal.source().easing());
    this.drawPoint(0, activeIntervalGroup, Options.AnimationMargin, 0, true);
    this.drawPoint(
        0, activeIntervalGroup, this.duration() * this.#timeline.pixelTimeRatio() + Options.AnimationMargin, -1, true);
  }

  private renderIteration(parentElement: Element, iteration: number): void {
    if (!this.#cachedElements[iteration]) {
      this.#cachedElements[iteration] = {
        animationLine: null,
        keyframePoints: {},
        keyframeRender: {},
        group: (UI.UIUtils.createSVGChild(parentElement, 'g') as HTMLElement),
      };
    }
    const group = this.#cachedElements[iteration].group;
    if (!group) {
      return;
    }

    group.style.transform =
        'translateX(' + (iteration * this.duration() * this.#timeline.pixelTimeRatio()).toFixed(2) + 'px)';
    this.drawAnimationLine(iteration, group);
    if (this.#keyframes && this.#keyframes.length > 1) {
      for (let i = 0; i < this.#keyframes.length - 1; i++) {
        const leftDistance =
            this.offset(i) * this.duration() * this.#timeline.pixelTimeRatio() + Options.AnimationMargin;
        const width = this.duration() * (this.offset(i + 1) - this.offset(i)) * this.#timeline.pixelTimeRatio();
        this.renderKeyframe(iteration, i, group, leftDistance, width, this.#keyframes[i].easing());
        if (i || (!i && iteration === 0)) {
          this.drawPoint(iteration, group, leftDistance, i, iteration === 0);
        }
      }
    }
    this.drawPoint(
        iteration, group, this.duration() * this.#timeline.pixelTimeRatio() + Options.AnimationMargin, -1,
        iteration === 0);
  }

  private delayOrStartTime(): number {
    let delay = this.#animationInternal.delayOrStartTime();
    if (this.#mouseEventType === Events.ANIMATION_DRAG || this.#mouseEventType === Events.START_ENDPOINT_MOVE) {
      delay += this.#movementInMs;
    }
    return delay;
  }

  private duration(): number {
    let duration = this.#animationInternal.iterationDuration();
    if (this.#mouseEventType === Events.FINISH_ENDPOINT_MOVE) {
      duration += this.#movementInMs;
    } else if (this.#mouseEventType === Events.START_ENDPOINT_MOVE) {
      duration -= this.#movementInMs;
    }
    return Math.max(0, duration);
  }

  private offset(i: number): number {
    if (!this.#keyframes) {
      throw new Error('Unable to calculate offset; keyframes do not exist');
    }

    let offset = this.#keyframes[i].offsetAsNumber();
    if (this.#mouseEventType === Events.KEYFRAME_MOVE && i === this.#keyframeMoved) {
      console.assert(i > 0 && i < this.#keyframes.length - 1, 'First and last keyframe cannot be moved');
      offset += this.#movementInMs / this.#animationInternal.iterationDuration();
      offset = Math.max(offset, this.#keyframes[i - 1].offsetAsNumber());
      offset = Math.min(offset, this.#keyframes[i + 1].offsetAsNumber());
    }
    return offset;
  }

  private mouseDown(mouseEventType: Events, keyframeIndex: number|null, event: Event): boolean {
    const mouseEvent = (event as MouseEvent);
    if (mouseEvent.buttons === 2) {
      return false;
    }
    if (this.#svg.enclosingNodeOrSelfWithClass('animation-node-removed')) {
      return false;
    }
    this.#mouseEventType = mouseEventType;
    this.#keyframeMoved = keyframeIndex;
    this.#downMouseX = mouseEvent.clientX;
    event.consume(true);

    const viewManagerInstance = UI.ViewManager.ViewManager.instance();

    const animationLocation = viewManagerInstance.locationNameForViewId('animations');
    const elementsLocation = viewManagerInstance.locationNameForViewId('elements');

    // Prevents revealing the node if the animations and elements view share the same view location.
    // If they share the same view location, the animations view will change to the elements view when editing an animation
    if (this.#node && animationLocation !== elementsLocation) {
      void Common.Revealer.reveal(this.#node);
    }
    return true;
  }

  private mouseMove(event: Event): void {
    const mouseEvent = (event as MouseEvent);
    this.setMovementAndRedraw((mouseEvent.clientX - (this.#downMouseX || 0)) / this.#timeline.pixelTimeRatio());
  }

  private setMovementAndRedraw(movement: number): void {
    this.#movementInMs = movement;
    if (this.delayOrStartTime() + this.duration() > this.#timeline.duration() * 0.8) {
      this.#timeline.setDuration(this.#timeline.duration() * 1.2);
    }
    this.redraw();
  }

  private mouseUp(event: Event): void {
    const mouseEvent = (event as MouseEvent);
    this.#movementInMs = (mouseEvent.clientX - (this.#downMouseX || 0)) / this.#timeline.pixelTimeRatio();

    // Commit changes
    if (this.#mouseEventType === Events.KEYFRAME_MOVE) {
      if (this.#keyframes && this.#keyframeMoved !== null && typeof this.#keyframeMoved !== 'undefined') {
        this.#keyframes[this.#keyframeMoved].setOffset(this.offset(this.#keyframeMoved));
      }
    } else {
      this.#animationInternal.setTiming(this.duration(), this.delayOrStartTime());
    }

    Host.userMetrics.animationPointDragged(
        this.#mouseEventType === Events.ANIMATION_DRAG ? Host.UserMetrics.AnimationPointDragType.ANIMATION_DRAG :
            this.#mouseEventType === Events.KEYFRAME_MOVE ?
                                                         Host.UserMetrics.AnimationPointDragType.KEYFRAME_MOVE :
            this.#mouseEventType === Events.START_ENDPOINT_MOVE ?
                                                         Host.UserMetrics.AnimationPointDragType.START_ENDPOINT_MOVE :
            this.#mouseEventType === Events.FINISH_ENDPOINT_MOVE ?
                                                         Host.UserMetrics.AnimationPointDragType.FINISH_ENDPOINT_MOVE :
                                                         Host.UserMetrics.AnimationPointDragType.OTHER);

    this.#movementInMs = 0;
    this.redraw();

    this.#mouseEventType = undefined;
    this.#downMouseX = undefined;
    this.#keyframeMoved = undefined;
  }

  private keydownMove(mouseEventType: Events, keyframeIndex: number|null, event: Event): void {
    const keyboardEvent = (event as KeyboardEvent);
    this.#mouseEventType = mouseEventType;
    this.#keyframeMoved = keyframeIndex;
    switch (keyboardEvent.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        this.#movementInMs = -this.#keyboardMovementRateMs;
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        this.#movementInMs = this.#keyboardMovementRateMs;
        break;
      default:
        return;
    }
    if (this.#mouseEventType === Events.KEYFRAME_MOVE) {
      if (this.#keyframes && this.#keyframeMoved !== null) {
        this.#keyframes[this.#keyframeMoved].setOffset(this.offset(this.#keyframeMoved));
      }
    } else {
      this.#animationInternal.setTiming(this.duration(), this.delayOrStartTime());
    }
    this.setMovementAndRedraw(0);

    this.#mouseEventType = undefined;
    this.#keyframeMoved = undefined;

    event.consume(true);
  }

  private onContextMenu(event: Event): void {
    function showContextMenu(remoteObject: SDK.RemoteObject.RemoteObject|null): void {
      if (!remoteObject) {
        return;
      }
      const contextMenu = new UI.ContextMenu.ContextMenu(event);
      contextMenu.appendApplicableItems(remoteObject);
      void contextMenu.show();
    }

    void this.#animationInternal.remoteObjectPromise().then(showContextMenu);
    event.consume(true);
  }
}

export const enum Events {
  ANIMATION_DRAG = 'AnimationDrag',
  KEYFRAME_MOVE = 'KeyframeMove',
  START_ENDPOINT_MOVE = 'StartEndpointMove',
  FINISH_ENDPOINT_MOVE = 'FinishEndpointMove',
}

export const Options = {
  AnimationHeight: 26,
  AnimationSVGHeight: 50,
  AnimationMargin: 7,
  EndpointsClickRegionSize: 10,
  GridCanvasHeight: 40,
};

export const Colors = new Map<string, Common.Color.Color|null>([
  ['Purple', Common.Color.parse('#9C27B0')],
  ['Light Blue', Common.Color.parse('#03A9F4')],
  ['Deep Orange', Common.Color.parse('#FF5722')],
  ['Blue', Common.Color.parse('#5677FC')],
  ['Lime', Common.Color.parse('#CDDC39')],
  ['Blue Grey', Common.Color.parse('#607D8B')],
  ['Pink', Common.Color.parse('#E91E63')],
  ['Green', Common.Color.parse('#0F9D58')],
  ['Brown', Common.Color.parse('#795548')],
  ['Cyan', Common.Color.parse('#00BCD4')],
]);
