// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import * as Protocol from '../../generated/protocol.js';

import {DeferredDOMNode, type DOMNode} from './DOMModel.js';
import {RemoteObject} from './RemoteObject.js';
import {Events as ResourceTreeModelEvents, ResourceTreeModel} from './ResourceTreeModel.js';
import {Events as RuntimeModelEvents, type EventTypes as RuntimeModelEventTypes, RuntimeModel} from './RuntimeModel.js';
import {ScreenCaptureModel} from './ScreenCaptureModel.js';
import {SDKModel} from './SDKModel.js';
import {Capability, type Target} from './Target.js';

const DEVTOOLS_ANIMATIONS_WORLD_NAME = 'devtools_animations';
const REPORT_SCROLL_POSITION_BINDING_NAME = '__devtools_report_scroll_position__';

const getScrollListenerNameInPage = (id: number): string => `__devtools_scroll_listener_${id}__`;

type ScrollListener = (param: {scrollLeft: number, scrollTop: number}) => void;
type BindingListener =
    (ev: Common.EventTarget.EventTargetEvent<Protocol.Runtime.BindingCalledEvent, RuntimeModelEventTypes>) => void;

async function resolveToObjectInWorld(domNode: DOMNode, worldName: string): Promise<RemoteObject|null> {
  const resourceTreeModel = domNode.domModel().target().model(ResourceTreeModel) as ResourceTreeModel;
  const pageAgent = domNode.domModel().target().pageAgent();
  for (const frame of resourceTreeModel.frames()) {
    // This returns previously created world if it exists for the frame.
    const {executionContextId} = await pageAgent.invoke_createIsolatedWorld({frameId: frame.id, worldName});
    const object = await domNode.resolveToObject(undefined, executionContextId);
    if (object) {
      return object;
    }
  }
  return null;
}

/**
 * Provides an extension over `DOMNode` that gives it additional
 * capabilities for animation debugging, mainly:
 * - getting a node's scroll information (scroll offsets and scroll range).
 * - updating a node's scroll offset.
 * - tracking the node's scroll offsets with event listeners.
 *
 * It works by running functions on the target page, see `DOMNode`s `callFunction` method
 * for more details on how a function is called on the target page.
 *
 * For listening to events on the target page and getting notified on the devtools frontend
 * side, we're adding a binding to the page `__devtools_report_scroll_position__` in a world `devtools_animation`
 * we've created. Then, we're setting scroll listeners of the `node` in the same world which calls the binding
 * itself with the scroll offsets.
 */
export class AnimationDOMNode {
  #domNode: DOMNode;
  #scrollListenersById: Map<number, ScrollListener>;
  #scrollBindingListener?: BindingListener;

  static lastAddedListenerId: number = 0;

  constructor(domNode: DOMNode) {
    this.#domNode = domNode;
    this.#scrollListenersById = new Map();
  }

  async #addReportScrollPositionBinding(): Promise<void> {
    // The binding is already added so we don't need to add it again.
    if (this.#scrollBindingListener) {
      return;
    }

    this.#scrollBindingListener = ev => {
      const {name, payload} = ev.data;
      if (name !== REPORT_SCROLL_POSITION_BINDING_NAME) {
        return;
      }

      const {scrollTop, scrollLeft, id} = JSON.parse(payload) as {scrollTop: number, scrollLeft: number, id: number};
      const scrollListener = this.#scrollListenersById.get(id);
      if (!scrollListener) {
        return;
      }

      scrollListener({scrollTop, scrollLeft});
    };

    const runtimeModel = this.#domNode.domModel().target().model(RuntimeModel) as RuntimeModel;
    await runtimeModel.addBinding({
      name: REPORT_SCROLL_POSITION_BINDING_NAME,
      executionContextName: DEVTOOLS_ANIMATIONS_WORLD_NAME,
    });
    runtimeModel.addEventListener(RuntimeModelEvents.BindingCalled, this.#scrollBindingListener);
  }

  async #removeReportScrollPositionBinding(): Promise<void> {
    // There isn't any binding added yet.
    if (!this.#scrollBindingListener) {
      return;
    }

    const runtimeModel = this.#domNode.domModel().target().model(RuntimeModel) as RuntimeModel;
    await runtimeModel.removeBinding({
      name: REPORT_SCROLL_POSITION_BINDING_NAME,
    });
    runtimeModel.removeEventListener(RuntimeModelEvents.BindingCalled, this.#scrollBindingListener);
    this.#scrollBindingListener = undefined;
  }

  async addScrollEventListener(onScroll: ({scrollLeft, scrollTop}: {scrollLeft: number, scrollTop: number}) => void):
      Promise<number|null> {
    AnimationDOMNode.lastAddedListenerId++;
    const id = AnimationDOMNode.lastAddedListenerId;
    this.#scrollListenersById.set(id, onScroll);
    // Add the binding for reporting scroll events from the page if it doesn't exist.
    if (!this.#scrollBindingListener) {
      await this.#addReportScrollPositionBinding();
    }

    const object = await resolveToObjectInWorld(this.#domNode, DEVTOOLS_ANIMATIONS_WORLD_NAME);
    if (!object) {
      return null;
    }

    await object.callFunction(scrollListenerInPage, [
      id,
      REPORT_SCROLL_POSITION_BINDING_NAME,
      getScrollListenerNameInPage(id),
    ].map(arg => RemoteObject.toCallArgument(arg)));
    object.release();
    return id;

    function scrollListenerInPage(
        this: HTMLElement|Document, id: number, reportScrollPositionBindingName: string,
        scrollListenerNameInPage: string): void {
      if ('scrollingElement' in this && !this.scrollingElement) {
        return;
      }

      const scrollingElement = ('scrollingElement' in this ? this.scrollingElement : this) as HTMLElement;
      // @ts-ignore We're setting a custom field on `Element` or `Document` for retaining the function on the page.
      this[scrollListenerNameInPage] = () => {
        // @ts-ignore `reportScrollPosition` binding is injected to the page before calling the function.
        globalThis[reportScrollPositionBindingName](
            JSON.stringify({scrollTop: scrollingElement.scrollTop, scrollLeft: scrollingElement.scrollLeft, id}));
      };

      // @ts-ignore We've already defined the function used below.
      this.addEventListener('scroll', this[scrollListenerNameInPage], true);
    }
  }

  async removeScrollEventListener(id: number): Promise<void> {
    const object = await resolveToObjectInWorld(this.#domNode, DEVTOOLS_ANIMATIONS_WORLD_NAME);
    if (!object) {
      return;
    }

    await object.callFunction(
        removeScrollListenerInPage, [getScrollListenerNameInPage(id)].map(arg => RemoteObject.toCallArgument(arg)));
    object.release();

    this.#scrollListenersById.delete(id);
    // There aren't any scroll listeners remained on the page
    // so we remove the binding.
    if (this.#scrollListenersById.size === 0) {
      await this.#removeReportScrollPositionBinding();
    }

    function removeScrollListenerInPage(this: HTMLElement|Document, scrollListenerNameInPage: string): void {
      // @ts-ignore We've already set this custom field while adding scroll listener.
      this.removeEventListener('scroll', this[scrollListenerNameInPage]);
      // @ts-ignore We've already set this custom field while adding scroll listener.
      delete this[scrollListenerNameInPage];
    }
  }

  async scrollTop(): Promise<number|null> {
    return this.#domNode.callFunction(scrollTopInPage).then(res => res?.value ?? null);

    function scrollTopInPage(this: Element|Document): number {
      if ('scrollingElement' in this) {
        if (!this.scrollingElement) {
          return 0;
        }

        return this.scrollingElement.scrollTop;
      }
      return this.scrollTop;
    }
  }

  async scrollLeft(): Promise<number|null> {
    return this.#domNode.callFunction(scrollLeftInPage).then(res => res?.value ?? null);

    function scrollLeftInPage(this: Element|Document): number {
      if ('scrollingElement' in this) {
        if (!this.scrollingElement) {
          return 0;
        }

        return this.scrollingElement.scrollLeft;
      }
      return this.scrollLeft;
    }
  }

  async setScrollTop(offset: number): Promise<void> {
    await this.#domNode.callFunction(setScrollTopInPage, [offset]);

    function setScrollTopInPage(this: Element|Document, offsetInPage: number): void {
      if ('scrollingElement' in this) {
        if (!this.scrollingElement) {
          return;
        }

        this.scrollingElement.scrollTop = offsetInPage;
      } else {
        this.scrollTop = offsetInPage;
      }
    }
  }

  async setScrollLeft(offset: number): Promise<void> {
    await this.#domNode.callFunction(setScrollLeftInPage, [offset]);

    function setScrollLeftInPage(this: Element|Document, offsetInPage: number): void {
      if ('scrollingElement' in this) {
        if (!this.scrollingElement) {
          return;
        }

        this.scrollingElement.scrollLeft = offsetInPage;
      } else {
        this.scrollLeft = offsetInPage;
      }
    }
  }

  async verticalScrollRange(): Promise<number|null> {
    return this.#domNode.callFunction(verticalScrollRangeInPage).then(res => res?.value ?? null);

    function verticalScrollRangeInPage(this: Element|Document): number {
      if ('scrollingElement' in this) {
        if (!this.scrollingElement) {
          return 0;
        }

        return this.scrollingElement.scrollHeight - this.scrollingElement.clientHeight;
      }

      return this.scrollHeight - this.clientHeight;
    }
  }

  async horizontalScrollRange(): Promise<number|null> {
    return this.#domNode.callFunction(horizontalScrollRangeInPage).then(res => res?.value ?? null);

    function horizontalScrollRangeInPage(this: Element|Document): number {
      if ('scrollingElement' in this) {
        if (!this.scrollingElement) {
          return 0;
        }

        return this.scrollingElement.scrollWidth - this.scrollingElement.clientWidth;
      }

      return this.scrollWidth - this.clientWidth;
    }
  }
}

function shouldGroupAnimations(firstAnimation: AnimationImpl, anim: AnimationImpl): boolean {
  const firstAnimationTimeline = firstAnimation.viewOrScrollTimeline();
  const animationTimeline = anim.viewOrScrollTimeline();
  if (firstAnimationTimeline) {
    // This is a SDA group so check whether the animation's
    // scroll container and scroll axis is the same with the first animation.
    return Boolean(
        animationTimeline && firstAnimationTimeline.sourceNodeId === animationTimeline.sourceNodeId &&
        firstAnimationTimeline.axis === animationTimeline.axis);
  }
  // This is a non-SDA group so check whether the coming animation
  // is a time based one too and if so, compare their start times.
  return !animationTimeline && firstAnimation.startTime() === anim.startTime();
}

export class AnimationModel extends SDKModel<EventTypes> {
  readonly runtimeModel: RuntimeModel;
  readonly agent: ProtocolProxyApi.AnimationApi;
  #animationsById: Map<string, AnimationImpl>;
  readonly animationGroups: Map<string, AnimationGroup>;
  #pendingAnimations: Set<string>;
  playbackRate: number;
  readonly #screenshotCapture?: ScreenshotCapture;
  #flushPendingAnimations: () => void;

  constructor(target: Target) {
    super(target);
    this.runtimeModel = (target.model(RuntimeModel) as RuntimeModel);
    this.agent = target.animationAgent();
    target.registerAnimationDispatcher(new AnimationDispatcher(this));
    this.#animationsById = new Map();
    this.animationGroups = new Map();
    this.#pendingAnimations = new Set();
    this.playbackRate = 1;

    if (!target.suspended()) {
      void this.agent.invoke_enable();
    }

    const resourceTreeModel = (target.model(ResourceTreeModel) as ResourceTreeModel);
    resourceTreeModel.addEventListener(ResourceTreeModelEvents.PrimaryPageChanged, this.reset, this);
    const screenCaptureModel = target.model(ScreenCaptureModel);
    if (screenCaptureModel) {
      this.#screenshotCapture = new ScreenshotCapture(this, screenCaptureModel);
    }

    this.#flushPendingAnimations = Common.Debouncer.debounce(() => {
      while (this.#pendingAnimations.size) {
        this.matchExistingGroups(this.createGroupFromPendingAnimations());
      }
    }, 100);
  }

  private reset(): void {
    this.#animationsById.clear();
    this.animationGroups.clear();
    this.#pendingAnimations.clear();
    this.dispatchEventToListeners(Events.ModelReset);
  }

  async devicePixelRatio(): Promise<number> {
    const evaluateResult = await this.target().runtimeAgent().invoke_evaluate({expression: 'window.devicePixelRatio'});
    if (evaluateResult?.result.type === 'number') {
      return evaluateResult?.result.value as number ?? 1;
    }

    return 1;
  }

  async getAnimationGroupForAnimation(name: string, nodeId: Protocol.DOM.NodeId): Promise<AnimationGroup|null> {
    for (const animationGroup of this.animationGroups.values()) {
      for (const animation of animationGroup.animations()) {
        if (animation.name() === name) {
          const animationNode = await animation.source().node();
          if (animationNode?.id === nodeId) {
            return animationGroup;
          }
        }
      }
    }

    return null;
  }

  animationCanceled(id: string): void {
    this.#pendingAnimations.delete(id);
  }

  async animationUpdated(payload: Protocol.Animation.Animation): Promise<void> {
    let foundAnimationGroup: AnimationGroup|undefined;
    let foundAnimation: AnimationImpl|undefined;
    for (const animationGroup of this.animationGroups.values()) {
      foundAnimation = animationGroup.animations().find(animation => animation.id() === payload.id);
      if (foundAnimation) {
        foundAnimationGroup = animationGroup;
        break;
      }
    }

    if (!foundAnimation || !foundAnimationGroup) {
      return;
    }

    await foundAnimation.setPayload(payload);
    this.dispatchEventToListeners(Events.AnimationGroupUpdated, foundAnimationGroup);
  }

  async animationStarted(payload: Protocol.Animation.Animation): Promise<void> {
    // We are not interested in animations without effect or target.
    if (!payload.source || !payload.source.backendNodeId) {
      return;
    }

    const animation = await AnimationImpl.parsePayload(this, payload);
    // Ignore Web Animations custom effects & groups.
    const keyframesRule = animation.source().keyframesRule();
    if (animation.type() === 'WebAnimation' && keyframesRule && keyframesRule.keyframes().length === 0) {
      this.#pendingAnimations.delete(animation.id());
    } else {
      this.#animationsById.set(animation.id(), animation);
      this.#pendingAnimations.add(animation.id());
    }

    this.#flushPendingAnimations();
  }

  private matchExistingGroups(incomingGroup: AnimationGroup): boolean {
    let matchedGroup: AnimationGroup|null = null;
    for (const group of this.animationGroups.values()) {
      if (group.matches(incomingGroup)) {
        matchedGroup = group;
        group.rebaseTo(incomingGroup);
        break;
      }

      if (group.shouldInclude(incomingGroup)) {
        matchedGroup = group;
        group.appendAnimations(incomingGroup.animations());
        break;
      }
    }

    if (!matchedGroup) {
      this.animationGroups.set(incomingGroup.id(), incomingGroup);
      if (this.#screenshotCapture) {
        this.#screenshotCapture.captureScreenshots(incomingGroup.finiteDuration(), incomingGroup.screenshotsInternal);
      }
      this.dispatchEventToListeners(Events.AnimationGroupStarted, incomingGroup);
    } else {
      this.dispatchEventToListeners(Events.AnimationGroupUpdated, matchedGroup);
    }
    return Boolean(matchedGroup);
  }

  private createGroupFromPendingAnimations(): AnimationGroup {
    console.assert(this.#pendingAnimations.size > 0);
    const firstAnimationId = this.#pendingAnimations.values().next().value as string;
    this.#pendingAnimations.delete(firstAnimationId);

    const firstAnimation = this.#animationsById.get(firstAnimationId);
    if (!firstAnimation) {
      throw new Error('Unable to locate first animation');
    }

    const groupedAnimations = [firstAnimation];
    const remainingAnimations = new Set<string>();

    for (const id of this.#pendingAnimations) {
      const anim = this.#animationsById.get(id) as AnimationImpl;
      if (shouldGroupAnimations(firstAnimation, anim)) {
        groupedAnimations.push(anim);
      } else {
        remainingAnimations.add(id);
      }
    }

    this.#pendingAnimations = remainingAnimations;
    // Show the first starting animation at the top of the animations of the animation group.
    groupedAnimations.sort((anim1, anim2) => anim1.startTime() - anim2.startTime());
    return new AnimationGroup(this, firstAnimationId, groupedAnimations);
  }

  setPlaybackRate(playbackRate: number): void {
    this.playbackRate = playbackRate;
    void this.agent.invoke_setPlaybackRate({playbackRate});
  }

  releaseAnimations(animations: string[]): void {
    void this.agent.invoke_releaseAnimations({animations});
  }

  override async suspendModel(): Promise<void> {
    await this.agent.invoke_disable().then(() => this.reset());
  }

  override async resumeModel(): Promise<void> {
    await this.agent.invoke_enable();
  }
}

export enum Events {
  /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
  AnimationGroupStarted = 'AnimationGroupStarted',
  AnimationGroupUpdated = 'AnimationGroupUpdated',
  ModelReset = 'ModelReset',
  /* eslint-enable @typescript-eslint/naming-convention */
}

export type EventTypes = {
  [Events.AnimationGroupStarted]: AnimationGroup,
  [Events.AnimationGroupUpdated]: AnimationGroup,
  [Events.ModelReset]: void,
};

export class AnimationImpl {
  readonly #animationModel: AnimationModel;
  #payloadInternal!: Protocol.Animation
      .Animation;  // Assertion is safe because only way to create `AnimationImpl` is to use `parsePayload` which calls `setPayload` and sets the value.
  #sourceInternal!:
      AnimationEffect;  // Assertion is safe because only way to create `AnimationImpl` is to use `parsePayload` which calls `setPayload` and sets the value.
  #playStateInternal?: string;

  private constructor(animationModel: AnimationModel) {
    this.#animationModel = animationModel;
  }

  static async parsePayload(animationModel: AnimationModel, payload: Protocol.Animation.Animation):
      Promise<AnimationImpl> {
    const animation = new AnimationImpl(animationModel);
    await animation.setPayload(payload);
    return animation;
  }

  async setPayload(payload: Protocol.Animation.Animation): Promise<void> {
    // TODO(b/40929569): Remove normalizing by devicePixelRatio after the attached bug is resolved.
    if (payload.viewOrScrollTimeline) {
      const devicePixelRatio = await this.#animationModel.devicePixelRatio();
      if (payload.viewOrScrollTimeline.startOffset) {
        payload.viewOrScrollTimeline.startOffset /= devicePixelRatio;
      }

      if (payload.viewOrScrollTimeline.endOffset) {
        payload.viewOrScrollTimeline.endOffset /= devicePixelRatio;
      }
    }

    this.#payloadInternal = payload;
    if (this.#sourceInternal && payload.source) {
      this.#sourceInternal.setPayload(payload.source);
    } else if (!this.#sourceInternal && payload.source) {
      this.#sourceInternal = new AnimationEffect(this.#animationModel, payload.source);
    }
  }

  // `startTime` and `duration` is represented as the
  // percentage of the view timeline range that starts at `startOffset`px
  // from the scroll container and ends at `endOffset`px of the scroll container.
  // This takes a percentage of the timeline range and returns the absolute
  // pixels values as a scroll offset of the scroll container.
  private percentageToPixels(percentage: number, viewOrScrollTimeline: Protocol.Animation.ViewOrScrollTimeline):
      number {
    const {startOffset, endOffset} = viewOrScrollTimeline;
    if (startOffset === undefined || endOffset === undefined) {
      // We don't expect this situation to occur since after an animation is started
      // we expect the scroll offsets to be resolved and provided correctly. If `startOffset`
      // or `endOffset` is not provided in a viewOrScrollTimeline; we can assume that there is a bug here
      // so it's fine to throw an error.
      throw new Error('startOffset or endOffset does not exist in viewOrScrollTimeline');
    }

    return (endOffset - startOffset) * (percentage / 100);
  }

  viewOrScrollTimeline(): Protocol.Animation.ViewOrScrollTimeline|undefined {
    return this.#payloadInternal.viewOrScrollTimeline;
  }

  id(): string {
    return this.#payloadInternal.id;
  }

  name(): string {
    return this.#payloadInternal.name;
  }

  paused(): boolean {
    return this.#payloadInternal.pausedState;
  }

  playState(): string {
    return this.#playStateInternal || this.#payloadInternal.playState;
  }

  setPlayState(playState: string): void {
    this.#playStateInternal = playState;
  }

  playbackRate(): number {
    return this.#payloadInternal.playbackRate;
  }

  // For scroll driven animations, it returns the pixel offset in the scroll container
  // For time animations, it returns milliseconds.
  startTime(): number {
    const viewOrScrollTimeline = this.viewOrScrollTimeline();
    if (viewOrScrollTimeline) {
      return this.percentageToPixels(
                 this.playbackRate() > 0 ? this.#payloadInternal.startTime : 100 - this.#payloadInternal.startTime,
                 viewOrScrollTimeline) +
          (this.viewOrScrollTimeline()?.startOffset ?? 0);
    }

    return this.#payloadInternal.startTime;
  }

  // For scroll driven animations, it returns the duration in pixels (i.e. after how many pixels of scroll the animation is going to end)
  // For time animations, it returns milliseconds.
  iterationDuration(): number {
    const viewOrScrollTimeline = this.viewOrScrollTimeline();
    if (viewOrScrollTimeline) {
      return this.percentageToPixels(this.source().duration(), viewOrScrollTimeline);
    }

    return this.source().duration();
  }

  // For scroll driven animations, it returns the duration in pixels (i.e. after how many pixels of scroll the animation is going to end)
  // For time animations, it returns milliseconds.
  endTime(): number {
    if (!this.source().iterations) {
      return Infinity;
    }

    if (this.viewOrScrollTimeline()) {
      return this.startTime() + this.iterationDuration() * this.source().iterations();
    }

    return this.startTime() + this.source().delay() + this.source().duration() * this.source().iterations() +
        this.source().endDelay();
  }

  // For scroll driven animations, it returns the duration in pixels (i.e. after how many pixels of scroll the animation is going to end)
  // For time animations, it returns milliseconds.
  finiteDuration(): number {
    const iterations = Math.min(this.source().iterations(), 3);
    if (this.viewOrScrollTimeline()) {
      return this.iterationDuration() * iterations;
    }

    return this.source().delay() + this.source().duration() * iterations;
  }

  // For scroll driven animations, it returns the duration in pixels (i.e. after how many pixels of scroll the animation is going to end)
  // For time animations, it returns milliseconds.
  currentTime(): number {
    const viewOrScrollTimeline = this.viewOrScrollTimeline();
    if (viewOrScrollTimeline) {
      return this.percentageToPixels(this.#payloadInternal.currentTime, viewOrScrollTimeline);
    }

    return this.#payloadInternal.currentTime;
  }

  source(): AnimationEffect {
    return this.#sourceInternal;
  }

  type(): Protocol.Animation.AnimationType {
    return this.#payloadInternal.type;
  }

  overlaps(animation: AnimationImpl): boolean {
    // Infinite animations
    if (!this.source().iterations() || !animation.source().iterations()) {
      return true;
    }

    const firstAnimation = this.startTime() < animation.startTime() ? this : animation;
    const secondAnimation = firstAnimation === this ? animation : this;
    return firstAnimation.endTime() >= secondAnimation.startTime();
  }

  // Utility method for returning `delay` for time based animations
  // and `startTime` in pixels for scroll driven animations. It is used to
  // find the exact starting time of the first keyframe for both cases.
  delayOrStartTime(): number {
    if (this.viewOrScrollTimeline()) {
      return this.startTime();
    }

    return this.source().delay();
  }

  setTiming(duration: number, delay: number): void {
    void this.#sourceInternal.node().then(node => {
      if (!node) {
        throw new Error('Unable to find node');
      }
      this.updateNodeStyle(duration, delay, node);
    });
    this.#sourceInternal.durationInternal = duration;
    this.#sourceInternal.delayInternal = delay;
    void this.#animationModel.agent.invoke_setTiming({animationId: this.id(), duration, delay});
  }

  private updateNodeStyle(duration: number, delay: number, node: DOMNode): void {
    let animationPrefix;
    if (this.type() === Protocol.Animation.AnimationType.CSSTransition) {
      animationPrefix = 'transition-';
    } else if (this.type() === Protocol.Animation.AnimationType.CSSAnimation) {
      animationPrefix = 'animation-';
    } else {
      return;
    }

    if (!node.id) {
      throw new Error('Node has no id');
    }

    const cssModel = node.domModel().cssModel();
    cssModel.setEffectivePropertyValueForNode(node.id, animationPrefix + 'duration', duration + 'ms');
    cssModel.setEffectivePropertyValueForNode(node.id, animationPrefix + 'delay', delay + 'ms');
  }

  async remoteObjectPromise(): Promise<RemoteObject|null> {
    const payload = await this.#animationModel.agent.invoke_resolveAnimation({animationId: this.id()});
    if (!payload) {
      return null;
    }

    return this.#animationModel.runtimeModel.createRemoteObject(payload.remoteObject);
  }

  cssId(): string {
    return this.#payloadInternal.cssId || '';
  }
}

export class AnimationEffect {
  #animationModel: AnimationModel;
  #payload!: Protocol.Animation
      .AnimationEffect;       // Assertion is safe because `setPayload` call in `constructor` sets the value.
  delayInternal!: number;     // Assertion is safe because `setPayload` call in `constructor` sets the value.
  durationInternal!: number;  // Assertion is safe because `setPayload` call in `constructor` sets the value.
  #keyframesRuleInternal: KeyframesRule|undefined;
  #deferredNodeInternal?: DeferredDOMNode;
  constructor(animationModel: AnimationModel, payload: Protocol.Animation.AnimationEffect) {
    this.#animationModel = animationModel;
    this.setPayload(payload);
  }

  setPayload(payload: Protocol.Animation.AnimationEffect): void {
    this.#payload = payload;
    if (!this.#keyframesRuleInternal && payload.keyframesRule) {
      this.#keyframesRuleInternal = new KeyframesRule(payload.keyframesRule);
    } else if (this.#keyframesRuleInternal && payload.keyframesRule) {
      this.#keyframesRuleInternal.setPayload(payload.keyframesRule);
    }

    this.delayInternal = payload.delay;
    this.durationInternal = payload.duration;
  }

  delay(): number {
    return this.delayInternal;
  }

  endDelay(): number {
    return this.#payload.endDelay;
  }

  iterations(): number {
    // Animations with zero duration, zero delays and infinite iterations can't be shown.
    if (!this.delay() && !this.endDelay() && !this.duration()) {
      return 0;
    }
    return this.#payload.iterations || Infinity;
  }

  duration(): number {
    return this.durationInternal;
  }

  direction(): string {
    return this.#payload.direction;
  }

  fill(): string {
    return this.#payload.fill;
  }

  node(): Promise<DOMNode|null> {
    if (!this.#deferredNodeInternal) {
      this.#deferredNodeInternal = new DeferredDOMNode(this.#animationModel.target(), this.backendNodeId());
    }
    return this.#deferredNodeInternal.resolvePromise();
  }

  deferredNode(): DeferredDOMNode {
    return new DeferredDOMNode(this.#animationModel.target(), this.backendNodeId());
  }

  backendNodeId(): Protocol.DOM.BackendNodeId {
    return this.#payload.backendNodeId as Protocol.DOM.BackendNodeId;
  }

  keyframesRule(): KeyframesRule|null {
    return this.#keyframesRuleInternal || null;
  }

  easing(): string {
    return this.#payload.easing;
  }
}

export class KeyframesRule {
  #payload!: Protocol.Animation
      .KeyframesRule;  // Assertion is safe because `setPayload` call in `constructor` sets the value.;
  #keyframesInternal!:
      KeyframeStyle[];  // Assertion is safe because `setPayload` call in `constructor` sets the value.;
  constructor(payload: Protocol.Animation.KeyframesRule) {
    this.setPayload(payload);
  }

  setPayload(payload: Protocol.Animation.KeyframesRule): void {
    this.#payload = payload;
    if (!this.#keyframesInternal) {
      this.#keyframesInternal = this.#payload.keyframes.map(keyframeStyle => new KeyframeStyle(keyframeStyle));
    } else {
      this.#payload.keyframes.forEach((keyframeStyle, index) => {
        this.#keyframesInternal[index]?.setPayload(keyframeStyle);
      });
    }
  }

  name(): string|undefined {
    return this.#payload.name;
  }

  keyframes(): KeyframeStyle[] {
    return this.#keyframesInternal;
  }
}

export class KeyframeStyle {
  #payload!:
      Protocol.Animation.KeyframeStyle;  // Assertion is safe because `setPayload` call in `constructor` sets the value.
  #offsetInternal!: string;              // Assertion is safe because `setPayload` call in `constructor` sets the value.
  constructor(payload: Protocol.Animation.KeyframeStyle) {
    this.setPayload(payload);
  }

  setPayload(payload: Protocol.Animation.KeyframeStyle): void {
    this.#payload = payload;
    this.#offsetInternal = payload.offset;
  }

  offset(): string {
    return this.#offsetInternal;
  }

  setOffset(offset: number): void {
    this.#offsetInternal = offset * 100 + '%';
  }

  offsetAsNumber(): number {
    return parseFloat(this.#offsetInternal) / 100;
  }

  easing(): string {
    return this.#payload.easing;
  }
}

export class AnimationGroup {
  readonly #animationModel: AnimationModel;
  readonly #idInternal: string;
  #scrollNodeInternal: AnimationDOMNode|undefined;
  #animationsInternal: AnimationImpl[];
  #pausedInternal: boolean;
  screenshotsInternal: string[];
  readonly #screenshotImages: HTMLImageElement[];
  constructor(animationModel: AnimationModel, id: string, animations: AnimationImpl[]) {
    this.#animationModel = animationModel;
    this.#idInternal = id;
    this.#animationsInternal = animations;
    this.#pausedInternal = false;
    this.screenshotsInternal = [];

    this.#screenshotImages = [];
  }

  isScrollDriven(): boolean {
    return Boolean(this.#animationsInternal[0]?.viewOrScrollTimeline());
  }

  id(): string {
    return this.#idInternal;
  }

  animations(): AnimationImpl[] {
    return this.#animationsInternal;
  }

  release(): void {
    this.#animationModel.animationGroups.delete(this.id());
    this.#animationModel.releaseAnimations(this.animationIds());
  }

  private animationIds(): string[] {
    function extractId(animation: AnimationImpl): string {
      return animation.id();
    }

    return this.#animationsInternal.map(extractId);
  }

  startTime(): number {
    return this.#animationsInternal[0].startTime();
  }

  // For scroll driven animations, it returns the duration in pixels (i.e. after how many pixels of scroll the animation is going to end)
  // For time animations, it returns milliseconds.
  groupDuration(): number {
    let duration = 0;
    for (const anim of this.#animationsInternal) {
      duration = Math.max(duration, anim.delayOrStartTime() + anim.iterationDuration());
    }
    return duration;
  }

  // For scroll driven animations, it returns the duration in pixels (i.e. after how many pixels of scroll the animation is going to end)
  // For time animations, it returns milliseconds.
  finiteDuration(): number {
    let maxDuration = 0;
    for (let i = 0; i < this.#animationsInternal.length; ++i) {
      maxDuration = Math.max(maxDuration, this.#animationsInternal[i].finiteDuration());
    }
    return maxDuration;
  }

  scrollOrientation(): Protocol.DOM.ScrollOrientation|null {
    const timeline = this.#animationsInternal[0]?.viewOrScrollTimeline();
    if (!timeline) {
      return null;
    }

    return timeline.axis;
  }

  async scrollNode(): Promise<AnimationDOMNode|null> {
    if (this.#scrollNodeInternal) {
      return this.#scrollNodeInternal;
    }

    if (!this.isScrollDriven()) {
      return null;
    }

    const sourceNodeId = this.#animationsInternal[0]?.viewOrScrollTimeline()?.sourceNodeId;
    if (!sourceNodeId) {
      return null;
    }

    const deferredScrollNode = new DeferredDOMNode(this.#animationModel.target(), sourceNodeId);
    const scrollNode = await deferredScrollNode.resolvePromise();
    if (!scrollNode) {
      return null;
    }

    this.#scrollNodeInternal = new AnimationDOMNode(scrollNode);
    return this.#scrollNodeInternal;
  }

  seekTo(currentTime: number): void {
    void this.#animationModel.agent.invoke_seekAnimations({animations: this.animationIds(), currentTime});
  }

  paused(): boolean {
    return this.#pausedInternal;
  }

  togglePause(paused: boolean): void {
    if (paused === this.#pausedInternal) {
      return;
    }
    this.#pausedInternal = paused;
    void this.#animationModel.agent.invoke_setPaused({animations: this.animationIds(), paused});
  }

  currentTimePromise(): Promise<number> {
    let longestAnim: AnimationImpl|null = null;
    for (const anim of this.#animationsInternal) {
      if (!longestAnim || anim.endTime() > longestAnim.endTime()) {
        longestAnim = anim;
      }
    }
    if (!longestAnim) {
      throw new Error('No longest animation found');
    }

    return this.#animationModel.agent.invoke_getCurrentTime({id: longestAnim.id()})
        .then(({currentTime}) => currentTime || 0);
  }

  matches(group: AnimationGroup): boolean {
    function extractId(anim: AnimationImpl): string {
      const timelineId = (anim.viewOrScrollTimeline()?.sourceNodeId ?? '') + (anim.viewOrScrollTimeline()?.axis ?? '');
      const regularId =
          anim.type() === Protocol.Animation.AnimationType.WebAnimation ? anim.type() + anim.id() : anim.cssId();

      return regularId + timelineId;
    }

    if (this.#animationsInternal.length !== group.#animationsInternal.length) {
      return false;
    }
    const left = this.#animationsInternal.map(extractId).sort();
    const right = group.#animationsInternal.map(extractId).sort();
    for (let i = 0; i < left.length; i++) {
      if (left[i] !== right[i]) {
        return false;
      }
    }
    return true;
  }

  shouldInclude(group: AnimationGroup): boolean {
    // We want to include the animations coming from the incoming group
    // inside this group if they were to be grouped if the events came at the same time.
    const [firstIncomingAnimation] = group.#animationsInternal;
    const [firstAnimation] = this.#animationsInternal;
    return shouldGroupAnimations(firstAnimation, firstIncomingAnimation);
  }

  appendAnimations(animations: AnimationImpl[]): void {
    this.#animationsInternal.push(...animations);
  }

  rebaseTo(group: AnimationGroup): void {
    this.#animationModel.releaseAnimations(this.animationIds());
    this.#animationsInternal = group.#animationsInternal;
    this.#scrollNodeInternal = undefined;
  }

  screenshots(): HTMLImageElement[] {
    for (let i = 0; i < this.screenshotsInternal.length; ++i) {
      const image = new Image();
      image.src = 'data:image/jpeg;base64,' + this.screenshotsInternal[i];
      this.#screenshotImages.push(image);
    }
    this.screenshotsInternal = [];
    return this.#screenshotImages;
  }
}

export class AnimationDispatcher implements ProtocolProxyApi.AnimationDispatcher {
  readonly #animationModel: AnimationModel;
  constructor(animationModel: AnimationModel) {
    this.#animationModel = animationModel;
  }

  animationCreated(_event: Protocol.Animation.AnimationCreatedEvent): void {
    // Previously this event was used to batch the animations into groups
    // and we were waiting for animationStarted events to be sent for
    // all the created animations and until then we weren't creating any
    // groups. This was allowing us to not miss any animations that were
    // going to be in the same group. However, now we're not using this event
    // to do batching and instead:
    // * We debounce the flush calls so that if the animationStarted events
    // for the same animation group come in different times; we create one
    // group for them.
    // * Even though an animation group is created and rendered for some animations
    // that have the same startTime (or same timeline & scroll axis for SDAs), now
    // whenever an `animationStarted` event comes we check whether there is a group
    // we can add the related animation. If so, we add it and emit `animationGroupUpdated`
    // event. So that, all the animations that were supposed to be in the same group
    // will be in the same group.
  }

  animationCanceled({id}: Protocol.Animation.AnimationCanceledEvent): void {
    this.#animationModel.animationCanceled(id);
  }

  animationStarted({animation}: Protocol.Animation.AnimationStartedEvent): void {
    void this.#animationModel.animationStarted(animation);
  }

  animationUpdated({animation}: Protocol.Animation.AnimationUpdatedEvent): void {
    void this.#animationModel.animationUpdated(animation);
  }
}

export class ScreenshotCapture {
  #requests: Request[];
  readonly #screenCaptureModel: ScreenCaptureModel;
  readonly #animationModel: AnimationModel;
  #stopTimer?: number;
  #endTime?: number;
  #capturing?: boolean;
  constructor(animationModel: AnimationModel, screenCaptureModel: ScreenCaptureModel) {
    this.#requests = [];
    this.#screenCaptureModel = screenCaptureModel;
    this.#animationModel = animationModel;
    this.#animationModel.addEventListener(Events.ModelReset, this.stopScreencast, this);
  }

  captureScreenshots(duration: number, screenshots: string[]): void {
    const screencastDuration = Math.min(duration / this.#animationModel.playbackRate, 3000);
    const endTime = screencastDuration + window.performance.now();
    this.#requests.push({endTime, screenshots});

    if (!this.#endTime || endTime > this.#endTime) {
      clearTimeout(this.#stopTimer);
      this.#stopTimer = window.setTimeout(this.stopScreencast.bind(this), screencastDuration);
      this.#endTime = endTime;
    }

    if (this.#capturing) {
      return;
    }
    this.#capturing = true;
    this.#screenCaptureModel.startScreencast(
        Protocol.Page.StartScreencastRequestFormat.Jpeg, 80, undefined, 300, 2, this.screencastFrame.bind(this),
        _visible => {});
  }

  private screencastFrame(base64Data: string, _metadata: Protocol.Page.ScreencastFrameMetadata): void {
    function isAnimating(request: Request): boolean {
      return request.endTime >= now;
    }

    if (!this.#capturing) {
      return;
    }

    const now = window.performance.now();
    this.#requests = this.#requests.filter(isAnimating);
    for (const request of this.#requests) {
      request.screenshots.push(base64Data);
    }
  }

  private stopScreencast(): void {
    if (!this.#capturing) {
      return;
    }

    this.#stopTimer = undefined;
    this.#endTime = undefined;
    this.#requests = [];
    this.#capturing = false;
    this.#screenCaptureModel.stopScreencast();
  }
}

SDKModel.register(AnimationModel, {capabilities: Capability.DOM, autostart: true});
export interface Request {
  endTime: number;
  screenshots: string[];
}
