// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import * as Protocol from '../../generated/protocol.js';

import {AnimationDOMNode} from './AnimationDOMNode.js';

export class AnimationModel extends SDK.SDKModel.SDKModel<EventTypes> {
  readonly runtimeModel: SDK.RuntimeModel.RuntimeModel;
  readonly agent: ProtocolProxyApi.AnimationApi;
  #animationsById: Map<string, AnimationImpl>;
  readonly animationGroups: Map<string, AnimationGroup>;
  #pendingAnimations: Set<string>;
  playbackRate: number;
  readonly #screenshotCapture?: ScreenshotCapture;
  #enabled?: boolean;

  constructor(target: SDK.Target.Target) {
    super(target);
    this.runtimeModel = (target.model(SDK.RuntimeModel.RuntimeModel) as SDK.RuntimeModel.RuntimeModel);
    this.agent = target.animationAgent();
    target.registerAnimationDispatcher(new AnimationDispatcher(this));
    this.#animationsById = new Map();
    this.animationGroups = new Map();
    this.#pendingAnimations = new Set();
    this.playbackRate = 1;
    const resourceTreeModel =
        (target.model(SDK.ResourceTreeModel.ResourceTreeModel) as SDK.ResourceTreeModel.ResourceTreeModel);
    resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.PrimaryPageChanged, this.reset, this);
    const screenCaptureModel = target.model(SDK.ScreenCaptureModel.ScreenCaptureModel);
    if (screenCaptureModel) {
      this.#screenshotCapture = new ScreenshotCapture(this, screenCaptureModel);
    }
  }

  private reset(): void {
    this.#animationsById.clear();
    this.animationGroups.clear();
    this.#pendingAnimations.clear();
    this.dispatchEventToListeners(Events.ModelReset);
  }

  private async devicePixelRatio(): Promise<number> {
    const evaluateResult = await this.target().runtimeAgent().invoke_evaluate({expression: 'window.devicePixelRatio'});
    if (evaluateResult?.result.type === 'number') {
      return evaluateResult?.result.value as number ?? 1;
    }

    return 1;
  }

  animationCreated(id: string): void {
    this.#pendingAnimations.add(id);
  }

  animationCanceled(id: string): void {
    this.#pendingAnimations.delete(id);
    this.flushPendingAnimationsIfNeeded();
  }

  async animationStarted(payload: Protocol.Animation.Animation): Promise<void> {
    // We are not interested in animations without effect or target.
    if (!payload.source || !payload.source.backendNodeId) {
      return;
    }

    // TODO(b/40929569): Remove normalizing by devicePixelRatio after the attached bug is resolved.
    if (payload.viewOrScrollTimeline) {
      const devicePixelRatio = await this.devicePixelRatio();
      if (payload.viewOrScrollTimeline.startOffset) {
        payload.viewOrScrollTimeline.startOffset /= devicePixelRatio;
      }

      if (payload.viewOrScrollTimeline.endOffset) {
        payload.viewOrScrollTimeline.endOffset /= devicePixelRatio;
      }
    }

    const animation = AnimationImpl.parsePayload(this, payload);
    if (!animation) {
      return;
    }

    // Ignore Web Animations custom effects & groups.
    const keyframesRule = animation.source().keyframesRule();
    if (animation.type() === 'WebAnimation' && keyframesRule && keyframesRule.keyframes().length === 0) {
      this.#pendingAnimations.delete(animation.id());
    } else {
      this.#animationsById.set(animation.id(), animation);
      this.#pendingAnimations.add(animation.id());
    }

    this.flushPendingAnimationsIfNeeded();
  }

  private flushPendingAnimationsIfNeeded(): void {
    for (const id of this.#pendingAnimations) {
      if (!this.#animationsById.get(id)) {
        return;
      }
    }

    while (this.#pendingAnimations.size) {
      this.matchExistingGroups(this.createGroupFromPendingAnimations());
    }
  }

  private matchExistingGroups(incomingGroup: AnimationGroup): boolean {
    let matchedGroup: AnimationGroup|null = null;
    for (const group of this.animationGroups.values()) {
      if (group.matches(incomingGroup)) {
        matchedGroup = group;
        group.update(incomingGroup);
        break;
      }
    }

    if (!matchedGroup) {
      this.animationGroups.set(incomingGroup.id(), incomingGroup);
      if (this.#screenshotCapture) {
        this.#screenshotCapture.captureScreenshots(incomingGroup.finiteDuration(), incomingGroup.screenshotsInternal);
      }
    }
    this.dispatchEventToListeners(Events.AnimationGroupStarted, matchedGroup || incomingGroup);
    return Boolean(matchedGroup);
  }

  private createGroupFromPendingAnimations(): AnimationGroup {
    console.assert(this.#pendingAnimations.size > 0);
    const firstAnimationId = this.#pendingAnimations.values().next().value;
    this.#pendingAnimations.delete(firstAnimationId);

    const firstAnimation = this.#animationsById.get(firstAnimationId);
    if (!firstAnimation) {
      throw new Error('Unable to locate first animation');
    }

    const shouldGroupAnimation = (anim: AnimationImpl): boolean => {
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
    };

    const groupedAnimations = [firstAnimation];
    const remainingAnimations = new Set<string>();

    for (const id of this.#pendingAnimations) {
      const anim = this.#animationsById.get(id) as AnimationImpl;
      if (shouldGroupAnimation(anim)) {
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
    this.reset();
    await this.agent.invoke_disable();
  }

  override async resumeModel(): Promise<void> {
    if (!this.#enabled) {
      return;
    }
    await this.agent.invoke_enable();
  }

  async ensureEnabled(): Promise<void> {
    if (this.#enabled) {
      return;
    }
    await this.agent.invoke_enable();
    this.#enabled = true;
  }
}

export enum Events {
  AnimationGroupStarted = 'AnimationGroupStarted',
  ModelReset = 'ModelReset',
}

export type EventTypes = {
  [Events.AnimationGroupStarted]: AnimationGroup,
  [Events.ModelReset]: void,
};

export class AnimationImpl {
  readonly #animationModel: AnimationModel;
  readonly #payloadInternal: Protocol.Animation.Animation;
  #sourceInternal: AnimationEffect;
  #playStateInternal?: string;
  constructor(animationModel: AnimationModel, payload: Protocol.Animation.Animation) {
    this.#animationModel = animationModel;
    this.#payloadInternal = payload;
    this.#sourceInternal =
        new AnimationEffect(animationModel, (this.#payloadInternal.source as Protocol.Animation.AnimationEffect));
  }

  static parsePayload(animationModel: AnimationModel, payload: Protocol.Animation.Animation): AnimationImpl {
    return new AnimationImpl(animationModel, payload);
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

  payload(): Protocol.Animation.Animation {
    return this.#payloadInternal;
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

  private updateNodeStyle(duration: number, delay: number, node: SDK.DOMModel.DOMNode): void {
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

  async remoteObjectPromise(): Promise<SDK.RemoteObject.RemoteObject|null> {
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
  readonly #payload: Protocol.Animation.AnimationEffect;
  readonly #keyframesRuleInternal: KeyframesRule|undefined;
  delayInternal: number;
  durationInternal: number;
  #deferredNodeInternal?: SDK.DOMModel.DeferredDOMNode;
  constructor(animationModel: AnimationModel, payload: Protocol.Animation.AnimationEffect) {
    this.#animationModel = animationModel;
    this.#payload = payload;
    if (payload.keyframesRule) {
      this.#keyframesRuleInternal = new KeyframesRule(payload.keyframesRule);
    }
    this.delayInternal = this.#payload.delay;
    this.durationInternal = this.#payload.duration;
  }

  delay(): number {
    return this.delayInternal;
  }

  endDelay(): number {
    return this.#payload.endDelay;
  }

  iterationStart(): number {
    return this.#payload.iterationStart;
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

  node(): Promise<SDK.DOMModel.DOMNode|null> {
    if (!this.#deferredNodeInternal) {
      this.#deferredNodeInternal =
          new SDK.DOMModel.DeferredDOMNode(this.#animationModel.target(), this.backendNodeId());
    }
    return this.#deferredNodeInternal.resolvePromise();
  }

  deferredNode(): SDK.DOMModel.DeferredDOMNode {
    return new SDK.DOMModel.DeferredDOMNode(this.#animationModel.target(), this.backendNodeId());
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
  readonly #payload: Protocol.Animation.KeyframesRule;
  #keyframesInternal: KeyframeStyle[];
  constructor(payload: Protocol.Animation.KeyframesRule) {
    this.#payload = payload;
    this.#keyframesInternal = this.#payload.keyframes.map(function(keyframeStyle) {
      return new KeyframeStyle(keyframeStyle);
    });
  }

  private setKeyframesPayload(payload: Protocol.Animation.KeyframeStyle[]): void {
    this.#keyframesInternal = payload.map(function(keyframeStyle) {
      return new KeyframeStyle(keyframeStyle);
    });
  }

  name(): string|undefined {
    return this.#payload.name;
  }

  keyframes(): KeyframeStyle[] {
    return this.#keyframesInternal;
  }
}

export class KeyframeStyle {
  readonly #payload: Protocol.Animation.KeyframeStyle;
  #offsetInternal: string;
  constructor(payload: Protocol.Animation.KeyframeStyle) {
    this.#payload = payload;
    this.#offsetInternal = this.#payload.offset;
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

    const deferredScrollNode = new SDK.DOMModel.DeferredDOMNode(this.#animationModel.target(), sourceNodeId);
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

  update(group: AnimationGroup): void {
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

  animationCreated({id}: Protocol.Animation.AnimationCreatedEvent): void {
    this.#animationModel.animationCreated(id);
  }

  animationCanceled({id}: Protocol.Animation.AnimationCanceledEvent): void {
    this.#animationModel.animationCanceled(id);
  }

  animationStarted({animation}: Protocol.Animation.AnimationStartedEvent): void {
    void this.#animationModel.animationStarted(animation);
  }
}

export class ScreenshotCapture {
  #requests: Request[];
  readonly #screenCaptureModel: SDK.ScreenCaptureModel.ScreenCaptureModel;
  readonly #animationModel: AnimationModel;
  #stopTimer?: number;
  #endTime?: number;
  #capturing?: boolean;
  constructor(animationModel: AnimationModel, screenCaptureModel: SDK.ScreenCaptureModel.ScreenCaptureModel) {
    this.#requests = [];
    this.#screenCaptureModel = screenCaptureModel;
    this.#animationModel = animationModel;
    this.#animationModel.addEventListener(Events.ModelReset, this.stopScreencast, this);
  }

  captureScreenshots(duration: number, screenshots: string[]): void {
    const screencastDuration = Math.min(duration / this.#animationModel.playbackRate, 3000);
    const endTime = screencastDuration + window.performance.now();
    this.#requests.push({endTime: endTime, screenshots: screenshots});

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

SDK.SDKModel.SDKModel.register(AnimationModel, {capabilities: SDK.Target.Capability.DOM, autostart: false});
export interface Request {
  endTime: number;
  screenshots: string[];
}
