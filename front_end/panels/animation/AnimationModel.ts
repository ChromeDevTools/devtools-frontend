// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import * as Protocol from '../../generated/protocol.js';

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

  animationCreated(id: string): void {
    this.#pendingAnimations.add(id);
  }

  animationCanceled(id: string): void {
    this.#pendingAnimations.delete(id);
    this.flushPendingAnimationsIfNeeded();
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

    const groupedAnimations = [firstAnimation];
    const groupStartTime = firstAnimation.startTime();
    const remainingAnimations = new Set<string>();
    for (const id of this.#pendingAnimations) {
      const anim = (this.#animationsById.get(id) as AnimationImpl);
      if (anim.startTime() === groupStartTime) {
        groupedAnimations.push(anim);
      } else {
        remainingAnimations.add(id);
      }
    }
    this.#pendingAnimations = remainingAnimations;
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

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
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

  startTime(): number {
    return this.#payloadInternal.startTime;
  }

  endTime(): number {
    if (!this.source().iterations) {
      return Infinity;
    }
    return this.startTime() + this.source().delay() + this.source().duration() * this.source().iterations() +
        this.source().endDelay();
  }

  finiteDuration(): number {
    const iterations = Math.min(this.source().iterations(), 3);
    return this.source().delay() + this.source().duration() * iterations;
  }

  currentTime(): number {
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

  finiteDuration(): number {
    let maxDuration = 0;
    for (let i = 0; i < this.#animationsInternal.length; ++i) {
      maxDuration = Math.max(maxDuration, this.#animationsInternal[i].finiteDuration());
    }
    return maxDuration;
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
      if (anim.type() === Protocol.Animation.AnimationType.WebAnimation) {
        return anim.type() + anim.id();
      }
      return anim.cssId();
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
    this.#animationModel.animationStarted(animation);
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
