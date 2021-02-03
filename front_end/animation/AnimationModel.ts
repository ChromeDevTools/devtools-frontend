// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as SDK from '../sdk/sdk.js';

export class AnimationModel extends SDK.SDKModel.SDKModel {
  _runtimeModel: SDK.RuntimeModel.RuntimeModel;
  _agent: ProtocolProxyApi.AnimationApi;
  _animationsById: Map<string, AnimationImpl>;
  _animationGroups: Map<string, AnimationGroup>;
  _pendingAnimations: Set<string>;
  _playbackRate: number;
  _screenshotCapture?: ScreenshotCapture;
  _enabled?: boolean;

  constructor(target: SDK.SDKModel.Target) {
    super(target);
    this._runtimeModel = (target.model(SDK.RuntimeModel.RuntimeModel) as SDK.RuntimeModel.RuntimeModel);
    this._agent = target.animationAgent();
    target.registerAnimationDispatcher(new AnimationDispatcher(this));
    this._animationsById = new Map();
    this._animationGroups = new Map();
    this._pendingAnimations = new Set();
    this._playbackRate = 1;
    const resourceTreeModel =
        (target.model(SDK.ResourceTreeModel.ResourceTreeModel) as SDK.ResourceTreeModel.ResourceTreeModel);
    resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.MainFrameNavigated, this._reset, this);
    const screenCaptureModel = target.model(SDK.ScreenCaptureModel.ScreenCaptureModel);
    if (screenCaptureModel) {
      this._screenshotCapture = new ScreenshotCapture(this, screenCaptureModel);
    }
  }

  _reset(): void {
    this._animationsById.clear();
    this._animationGroups.clear();
    this._pendingAnimations.clear();
    this.dispatchEventToListeners(Events.ModelReset);
  }

  animationCreated(id: string): void {
    this._pendingAnimations.add(id);
  }

  _animationCanceled(id: string): void {
    this._pendingAnimations.delete(id);
    this._flushPendingAnimationsIfNeeded();
  }

  animationStarted(payload: Protocol.Animation.Animation): void {
    // We are not interested in animations without effect or target.
    if (!payload.source || !payload.source.backendNodeId) {
      return;
    }

    const animation = AnimationImpl.parsePayload(this, payload);
    if (!animation) {
      return;
    }

    // Ignore Web Animations custom effects & groups.
    const keyframesRule = animation.source().keyframesRule();
    if (animation.type() === 'WebAnimation' && keyframesRule && keyframesRule.keyframes().length === 0) {
      this._pendingAnimations.delete(animation.id());
    } else {
      this._animationsById.set(animation.id(), animation);
      this._pendingAnimations.add(animation.id());
    }

    this._flushPendingAnimationsIfNeeded();
  }

  _flushPendingAnimationsIfNeeded(): void {
    for (const id of this._pendingAnimations) {
      if (!this._animationsById.get(id)) {
        return;
      }
    }

    while (this._pendingAnimations.size) {
      this._matchExistingGroups(this._createGroupFromPendingAnimations());
    }
  }

  _matchExistingGroups(incomingGroup: AnimationGroup): boolean {
    let matchedGroup: AnimationGroup|null = null;
    for (const group of this._animationGroups.values()) {
      if (group._matches(incomingGroup)) {
        matchedGroup = group;
        group._update(incomingGroup);
        break;
      }
    }

    if (!matchedGroup) {
      this._animationGroups.set(incomingGroup.id(), incomingGroup);
      if (this._screenshotCapture) {
        this._screenshotCapture.captureScreenshots(incomingGroup.finiteDuration(), incomingGroup._screenshots);
      }
    }
    this.dispatchEventToListeners(Events.AnimationGroupStarted, matchedGroup || incomingGroup);
    return Boolean(matchedGroup);
  }

  _createGroupFromPendingAnimations(): AnimationGroup {
    console.assert(this._pendingAnimations.size > 0);
    const firstAnimationId = this._pendingAnimations.values().next().value;
    this._pendingAnimations.delete(firstAnimationId);

    const firstAnimation = this._animationsById.get(firstAnimationId);
    if (!firstAnimation) {
      throw new Error('Unable to locate first animation');
    }

    const groupedAnimations = [firstAnimation];
    const groupStartTime = firstAnimation.startTime();
    const remainingAnimations = new Set<string>();
    for (const id of this._pendingAnimations) {
      const anim = (this._animationsById.get(id) as AnimationImpl);
      if (anim.startTime() === groupStartTime) {
        groupedAnimations.push(anim);
      } else {
        remainingAnimations.add(id);
      }
    }
    this._pendingAnimations = remainingAnimations;
    return new AnimationGroup(this, firstAnimationId, groupedAnimations);
  }

  setPlaybackRate(playbackRate: number): void {
    this._playbackRate = playbackRate;
    this._agent.invoke_setPlaybackRate({playbackRate});
  }

  _releaseAnimations(animations: string[]): void {
    this._agent.invoke_releaseAnimations({animations});
  }

  async suspendModel(): Promise<void> {
    this._reset();
    await this._agent.invoke_disable();
  }

  async resumeModel(): Promise<void> {
    if (!this._enabled) {
      return;
    }
    await this._agent.invoke_enable();
  }

  async ensureEnabled(): Promise<void> {
    if (this._enabled) {
      return;
    }
    await this._agent.invoke_enable();
    this._enabled = true;
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  AnimationGroupStarted = 'AnimationGroupStarted',
  ModelReset = 'ModelReset',
}

export class AnimationImpl {
  _animationModel: AnimationModel;
  _payload: Protocol.Animation.Animation;
  _source: AnimationEffect;
  _playState?: string;
  constructor(animationModel: AnimationModel, payload: Protocol.Animation.Animation) {
    this._animationModel = animationModel;
    this._payload = payload;
    this._source = new AnimationEffect(animationModel, (this._payload.source as Protocol.Animation.AnimationEffect));
  }

  static parsePayload(animationModel: AnimationModel, payload: Protocol.Animation.Animation): AnimationImpl {
    return new AnimationImpl(animationModel, payload);
  }

  payload(): Protocol.Animation.Animation {
    return this._payload;
  }

  id(): string {
    return this._payload.id;
  }

  name(): string {
    return this._payload.name;
  }

  paused(): boolean {
    return this._payload.pausedState;
  }

  playState(): string {
    return this._playState || this._payload.playState;
  }

  setPlayState(playState: string): void {
    this._playState = playState;
  }

  playbackRate(): number {
    return this._payload.playbackRate;
  }

  startTime(): number {
    return this._payload.startTime;
  }

  endTime(): number {
    if (!this.source().iterations) {
      return Infinity;
    }
    return this.startTime() + this.source().delay() + this.source().duration() * this.source().iterations() +
        this.source().endDelay();
  }

  _finiteDuration(): number {
    const iterations = Math.min(this.source().iterations(), 3);
    return this.source().delay() + this.source().duration() * iterations;
  }

  currentTime(): number {
    return this._payload.currentTime;
  }

  source(): AnimationEffect {
    return this._source;
  }

  type(): Protocol.Animation.AnimationType {
    return this._payload.type;
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

  setTiming(duration: number, delay: number): void {
    this._source.node().then(node => {
      if (!node) {
        throw new Error('Unable to find node');
      }
      this._updateNodeStyle(duration, delay, node);
    });
    this._source._duration = duration;
    this._source._delay = delay;
    this._animationModel._agent.invoke_setTiming({animationId: this.id(), duration, delay});
  }

  _updateNodeStyle(duration: number, delay: number, node: SDK.DOMModel.DOMNode): void {
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
    const payload = await this._animationModel._agent.invoke_resolveAnimation({animationId: this.id()});
    if (!payload) {
      return null;
    }

    return this._animationModel._runtimeModel.createRemoteObject(payload.remoteObject);
  }

  _cssId(): string {
    return this._payload.cssId || '';
  }
}

export class AnimationEffect {
  _animationModel: AnimationModel;
  _payload: Protocol.Animation.AnimationEffect;
  _keyframesRule: KeyframesRule|undefined;
  _delay: number;
  _duration: number;
  _deferredNode?: SDK.DOMModel.DeferredDOMNode;
  constructor(animationModel: AnimationModel, payload: Protocol.Animation.AnimationEffect) {
    this._animationModel = animationModel;
    this._payload = payload;
    if (payload.keyframesRule) {
      this._keyframesRule = new KeyframesRule(payload.keyframesRule);
    }
    this._delay = this._payload.delay;
    this._duration = this._payload.duration;
  }

  delay(): number {
    return this._delay;
  }

  endDelay(): number {
    return this._payload.endDelay;
  }

  iterationStart(): number {
    return this._payload.iterationStart;
  }

  iterations(): number {
    // Animations with zero duration, zero delays and infinite iterations can't be shown.
    if (!this.delay() && !this.endDelay() && !this.duration()) {
      return 0;
    }
    return this._payload.iterations || Infinity;
  }

  duration(): number {
    return this._duration;
  }

  direction(): string {
    return this._payload.direction;
  }

  fill(): string {
    return this._payload.fill;
  }

  node(): Promise<SDK.DOMModel.DOMNode|null> {
    if (!this._deferredNode) {
      this._deferredNode = new SDK.DOMModel.DeferredDOMNode(this._animationModel.target(), this.backendNodeId());
    }
    return this._deferredNode.resolvePromise();
  }

  deferredNode(): SDK.DOMModel.DeferredDOMNode {
    return new SDK.DOMModel.DeferredDOMNode(this._animationModel.target(), this.backendNodeId());
  }

  backendNodeId(): number {
    return this._payload.backendNodeId as number;
  }

  keyframesRule(): KeyframesRule|null {
    return this._keyframesRule || null;
  }

  easing(): string {
    return this._payload.easing;
  }
}

export class KeyframesRule {
  _payload: Protocol.Animation.KeyframesRule;
  _keyframes: KeyframeStyle[];
  constructor(payload: Protocol.Animation.KeyframesRule) {
    this._payload = payload;
    this._keyframes = this._payload.keyframes.map(function(keyframeStyle) {
      return new KeyframeStyle(keyframeStyle);
    });
  }

  _setKeyframesPayload(payload: Protocol.Animation.KeyframeStyle[]): void {
    this._keyframes = payload.map(function(keyframeStyle) {
      return new KeyframeStyle(keyframeStyle);
    });
  }

  name(): string|undefined {
    return this._payload.name;
  }

  keyframes(): KeyframeStyle[] {
    return this._keyframes;
  }
}

export class KeyframeStyle {
  _payload: Protocol.Animation.KeyframeStyle;
  _offset: string;
  constructor(payload: Protocol.Animation.KeyframeStyle) {
    this._payload = payload;
    this._offset = this._payload.offset;
  }

  offset(): string {
    return this._offset;
  }

  setOffset(offset: number): void {
    this._offset = offset * 100 + '%';
  }

  offsetAsNumber(): number {
    return parseFloat(this._offset) / 100;
  }

  easing(): string {
    return this._payload.easing;
  }
}

export class AnimationGroup {
  _animationModel: AnimationModel;
  _id: string;
  _animations: AnimationImpl[];
  _paused: boolean;
  _screenshots: string[];
  _screenshotImages: HTMLImageElement[];
  constructor(animationModel: AnimationModel, id: string, animations: AnimationImpl[]) {
    this._animationModel = animationModel;
    this._id = id;
    this._animations = animations;
    this._paused = false;
    this._screenshots = [];

    this._screenshotImages = [];
  }

  id(): string {
    return this._id;
  }

  animations(): AnimationImpl[] {
    return this._animations;
  }

  release(): void {
    this._animationModel._animationGroups.delete(this.id());
    this._animationModel._releaseAnimations(this._animationIds());
  }

  _animationIds(): string[] {
    function extractId(animation: AnimationImpl): string {
      return animation.id();
    }

    return this._animations.map(extractId);
  }

  startTime(): number {
    return this._animations[0].startTime();
  }

  finiteDuration(): number {
    let maxDuration = 0;
    for (let i = 0; i < this._animations.length; ++i) {
      maxDuration = Math.max(maxDuration, this._animations[i]._finiteDuration());
    }
    return maxDuration;
  }

  seekTo(currentTime: number): void {
    this._animationModel._agent.invoke_seekAnimations({animations: this._animationIds(), currentTime});
  }

  paused(): boolean {
    return this._paused;
  }

  togglePause(paused: boolean): void {
    if (paused === this._paused) {
      return;
    }
    this._paused = paused;
    this._animationModel._agent.invoke_setPaused({animations: this._animationIds(), paused});
  }

  currentTimePromise(): Promise<number> {
    let longestAnim: AnimationImpl|null = null;
    for (const anim of this._animations) {
      if (!longestAnim || anim.endTime() > longestAnim.endTime()) {
        longestAnim = anim;
      }
    }
    if (!longestAnim) {
      throw new Error('No longest animation found');
    }

    return this._animationModel._agent.invoke_getCurrentTime({id: longestAnim.id()})
        .then(({currentTime}) => currentTime || 0);
  }

  _matches(group: AnimationGroup): boolean {
    function extractId(anim: AnimationImpl): string {
      if (anim.type() === Protocol.Animation.AnimationType.WebAnimation) {
        return anim.type() + anim.id();
      }
      return anim._cssId();
    }

    if (this._animations.length !== group._animations.length) {
      return false;
    }
    const left = this._animations.map(extractId).sort();
    const right = group._animations.map(extractId).sort();
    for (let i = 0; i < left.length; i++) {
      if (left[i] !== right[i]) {
        return false;
      }
    }
    return true;
  }

  _update(group: AnimationGroup): void {
    this._animationModel._releaseAnimations(this._animationIds());
    this._animations = group._animations;
  }

  screenshots(): HTMLImageElement[] {
    for (let i = 0; i < this._screenshots.length; ++i) {
      const image = new Image();
      image.src = 'data:image/jpeg;base64,' + this._screenshots[i];
      this._screenshotImages.push(image);
    }
    this._screenshots = [];
    return this._screenshotImages;
  }
}

export class AnimationDispatcher implements ProtocolProxyApi.AnimationDispatcher {
  _animationModel: AnimationModel;
  constructor(animationModel: AnimationModel) {
    this._animationModel = animationModel;
  }

  animationCreated({id}: Protocol.Animation.AnimationCreatedEvent): void {
    this._animationModel.animationCreated(id);
  }

  animationCanceled({id}: Protocol.Animation.AnimationCanceledEvent): void {
    this._animationModel._animationCanceled(id);
  }

  animationStarted({animation}: Protocol.Animation.AnimationStartedEvent): void {
    this._animationModel.animationStarted(animation);
  }
}

export class ScreenshotCapture {
  _requests: Request[];
  _screenCaptureModel: SDK.ScreenCaptureModel.ScreenCaptureModel;
  _animationModel: AnimationModel;
  _stopTimer?: number;
  _endTime?: number;
  _capturing?: boolean;
  constructor(animationModel: AnimationModel, screenCaptureModel: SDK.ScreenCaptureModel.ScreenCaptureModel) {
    this._requests = [];
    this._screenCaptureModel = screenCaptureModel;
    this._animationModel = animationModel;
    this._animationModel.addEventListener(Events.ModelReset, this._stopScreencast, this);
  }

  captureScreenshots(duration: number, screenshots: string[]): void {
    const screencastDuration = Math.min(duration / this._animationModel._playbackRate, 3000);
    const endTime = screencastDuration + window.performance.now();
    this._requests.push({endTime: endTime, screenshots: screenshots});

    if (!this._endTime || endTime > this._endTime) {
      clearTimeout(this._stopTimer);
      this._stopTimer = window.setTimeout(this._stopScreencast.bind(this), screencastDuration);
      this._endTime = endTime;
    }

    if (this._capturing) {
      return;
    }
    this._capturing = true;
    this._screenCaptureModel.startScreencast(
        Protocol.Page.StartScreencastRequestFormat.Jpeg, 80, undefined, 300, 2, this._screencastFrame.bind(this),
        _visible => {});
  }

  _screencastFrame(base64Data: string, _metadata: Protocol.Page.ScreencastFrameMetadata): void {
    function isAnimating(request: Request): boolean {
      return request.endTime >= now;
    }

    if (!this._capturing) {
      return;
    }

    const now = window.performance.now();
    this._requests = this._requests.filter(isAnimating);
    for (const request of this._requests) {
      request.screenshots.push(base64Data);
    }
  }

  _stopScreencast(): void {
    if (!this._capturing) {
      return;
    }

    delete this._stopTimer;
    delete this._endTime;
    this._requests = [];
    this._capturing = false;
    this._screenCaptureModel.stopScreencast();
  }
}

SDK.SDKModel.SDKModel.register(AnimationModel, SDK.SDKModel.Capability.DOM, false);
export interface Request {
  endTime: number;
  screenshots: string[];
}
