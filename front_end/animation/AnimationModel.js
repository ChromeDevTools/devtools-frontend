// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @unrestricted
 */
WebInspector.AnimationModel = class extends WebInspector.SDKModel {
  /**
   * @param {!WebInspector.Target} target
   */
  constructor(target) {
    super(WebInspector.AnimationModel, target);
    this._agent = target.animationAgent();
    target.registerAnimationDispatcher(new WebInspector.AnimationDispatcher(this));
    /** @type {!Map.<string, !WebInspector.AnimationModel.Animation>} */
    this._animationsById = new Map();
    /** @type {!Map.<string, !WebInspector.AnimationModel.AnimationGroup>} */
    this._animationGroups = new Map();
    /** @type {!Array.<string>} */
    this._pendingAnimations = [];
    this._playbackRate = 1;
    var resourceTreeModel =
        /** @type {!WebInspector.ResourceTreeModel} */ (WebInspector.ResourceTreeModel.fromTarget(target));
    resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.Events.MainFrameNavigated, this._reset, this);
    this._screenshotCapture = new WebInspector.AnimationModel.ScreenshotCapture(target, this, resourceTreeModel);
  }

  /**
   * @param {!WebInspector.Target} target
   * @return {?WebInspector.AnimationModel}
   */
  static fromTarget(target) {
    if (!target.hasDOMCapability())
      return null;
    if (!target[WebInspector.AnimationModel._symbol])
      target[WebInspector.AnimationModel._symbol] = new WebInspector.AnimationModel(target);

    return target[WebInspector.AnimationModel._symbol];
  }

  _reset() {
    this._animationsById.clear();
    this._animationGroups.clear();
    this._pendingAnimations = [];
    this.dispatchEventToListeners(WebInspector.AnimationModel.Events.ModelReset);
  }

  /**
   * @param {string} id
   */
  animationCreated(id) {
    this._pendingAnimations.push(id);
  }

  /**
   * @param {string} id
   */
  _animationCanceled(id) {
    this._pendingAnimations.remove(id);
    this._flushPendingAnimationsIfNeeded();
  }

  /**
   * @param {!AnimationAgent.Animation} payload
   */
  animationStarted(payload) {
    var animation = WebInspector.AnimationModel.Animation.parsePayload(this.target(), payload);

    // Ignore Web Animations custom effects & groups.
    if (animation.type() === 'WebAnimation' && animation.source().keyframesRule().keyframes().length === 0) {
      this._pendingAnimations.remove(animation.id());
    } else {
      this._animationsById.set(animation.id(), animation);
      if (this._pendingAnimations.indexOf(animation.id()) === -1)
        this._pendingAnimations.push(animation.id());
    }

    this._flushPendingAnimationsIfNeeded();
  }

  _flushPendingAnimationsIfNeeded() {
    for (var id of this._pendingAnimations) {
      if (!this._animationsById.get(id))
        return;
    }

    while (this._pendingAnimations.length)
      this._matchExistingGroups(this._createGroupFromPendingAnimations());
  }

  /**
   * @param {!WebInspector.AnimationModel.AnimationGroup} incomingGroup
   * @return {boolean}
   */
  _matchExistingGroups(incomingGroup) {
    var matchedGroup = null;
    for (var group of this._animationGroups.values()) {
      if (group._matches(incomingGroup)) {
        matchedGroup = group;
        group._update(incomingGroup);
        break;
      }
    }

    if (!matchedGroup) {
      this._animationGroups.set(incomingGroup.id(), incomingGroup);
      this._screenshotCapture.captureScreenshots(incomingGroup.finiteDuration(), incomingGroup._screenshots);
    }
    this.dispatchEventToListeners(
        WebInspector.AnimationModel.Events.AnimationGroupStarted, matchedGroup || incomingGroup);
    return !!matchedGroup;
  }

  /**
   * @return {!WebInspector.AnimationModel.AnimationGroup}
   */
  _createGroupFromPendingAnimations() {
    console.assert(this._pendingAnimations.length);
    var groupedAnimations = [this._animationsById.get(this._pendingAnimations.shift())];
    var remainingAnimations = [];
    for (var id of this._pendingAnimations) {
      var anim = this._animationsById.get(id);
      if (anim.startTime() === groupedAnimations[0].startTime())
        groupedAnimations.push(anim);
      else
        remainingAnimations.push(id);
    }
    this._pendingAnimations = remainingAnimations;
    return new WebInspector.AnimationModel.AnimationGroup(this, groupedAnimations[0].id(), groupedAnimations);
  }

  /**
   * @return {!Promise.<number>}
   */
  playbackRatePromise() {
    /**
     * @param {?Protocol.Error} error
     * @param {number} playbackRate
     * @return {number}
     * @this {!WebInspector.AnimationModel}
     */
    function callback(error, playbackRate) {
      if (error)
        return 1;
      this._playbackRate = playbackRate;
      return playbackRate;
    }

    return this._agent.getPlaybackRate(callback.bind(this)).catchException(1);
  }

  /**
   * @param {number} playbackRate
   */
  setPlaybackRate(playbackRate) {
    this._playbackRate = playbackRate;
    this._agent.setPlaybackRate(playbackRate);
  }

  /**
   * @param {!Array.<string>} animations
   */
  _releaseAnimations(animations) {
    this.target().animationAgent().releaseAnimations(animations);
  }

  /**
   * @override
   * @return {!Promise}
   */
  suspendModel() {
    this._reset();
    return this._agent.disable();
  }

  /**
   * @override
   * @return {!Promise}
   */
  resumeModel() {
    if (!this._enabled)
      return Promise.resolve();
    return this._agent.enable();
  }

  ensureEnabled() {
    if (this._enabled)
      return;
    this._agent.enable();
    this._enabled = true;
  }
};

/** @enum {symbol} */
WebInspector.AnimationModel.Events = {
  AnimationGroupStarted: Symbol('AnimationGroupStarted'),
  ModelReset: Symbol('ModelReset')
};

WebInspector.AnimationModel._symbol = Symbol('AnimationModel');


/**
 * @unrestricted
 */
WebInspector.AnimationModel.Animation = class extends WebInspector.SDKObject {
  /**
   * @param {!WebInspector.Target} target
   * @param {!AnimationAgent.Animation} payload
   */
  constructor(target, payload) {
    super(target);
    this._payload = payload;
    this._source = new WebInspector.AnimationModel.AnimationEffect(this.target(), this._payload.source);
  }

  /**
   * @param {!WebInspector.Target} target
   * @param {!AnimationAgent.Animation} payload
   * @return {!WebInspector.AnimationModel.Animation}
   */
  static parsePayload(target, payload) {
    return new WebInspector.AnimationModel.Animation(target, payload);
  }

  /**
   * @return {!AnimationAgent.Animation}
   */
  payload() {
    return this._payload;
  }

  /**
   * @return {string}
   */
  id() {
    return this._payload.id;
  }

  /**
   * @return {string}
   */
  name() {
    return this._payload.name;
  }

  /**
   * @return {boolean}
   */
  paused() {
    return this._payload.pausedState;
  }

  /**
   * @return {string}
   */
  playState() {
    return this._playState || this._payload.playState;
  }

  /**
   * @param {string} playState
   */
  setPlayState(playState) {
    this._playState = playState;
  }

  /**
   * @return {number}
   */
  playbackRate() {
    return this._payload.playbackRate;
  }

  /**
   * @return {number}
   */
  startTime() {
    return this._payload.startTime;
  }

  /**
   * @return {number}
   */
  endTime() {
    if (!this.source().iterations)
      return Infinity;
    return this.startTime() + this.source().delay() + this.source().duration() * this.source().iterations() +
        this.source().endDelay();
  }

  /**
   * @return {number}
   */
  _finiteDuration() {
    var iterations = Math.min(this.source().iterations(), 3);
    return this.source().delay() + this.source().duration() * iterations;
  }

  /**
   * @return {number}
   */
  currentTime() {
    return this._payload.currentTime;
  }

  /**
   * @return {!WebInspector.AnimationModel.AnimationEffect}
   */
  source() {
    return this._source;
  }

  /**
   * @return {!WebInspector.AnimationModel.Animation.Type}
   */
  type() {
    return /** @type {!WebInspector.AnimationModel.Animation.Type} */ (this._payload.type);
  }

  /**
   * @param {!WebInspector.AnimationModel.Animation} animation
   * @return {boolean}
   */
  overlaps(animation) {
    // Infinite animations
    if (!this.source().iterations() || !animation.source().iterations())
      return true;

    var firstAnimation = this.startTime() < animation.startTime() ? this : animation;
    var secondAnimation = firstAnimation === this ? animation : this;
    return firstAnimation.endTime() >= secondAnimation.startTime();
  }

  /**
   * @param {number} duration
   * @param {number} delay
   */
  setTiming(duration, delay) {
    this._source.node().then(this._updateNodeStyle.bind(this, duration, delay));
    this._source._duration = duration;
    this._source._delay = delay;
    this.target().animationAgent().setTiming(this.id(), duration, delay);
  }

  /**
   * @param {number} duration
   * @param {number} delay
   * @param {!WebInspector.DOMNode} node
   */
  _updateNodeStyle(duration, delay, node) {
    var animationPrefix;
    if (this.type() === WebInspector.AnimationModel.Animation.Type.CSSTransition)
      animationPrefix = 'transition-';
    else if (this.type() === WebInspector.AnimationModel.Animation.Type.CSSAnimation)
      animationPrefix = 'animation-';
    else
      return;

    var cssModel = WebInspector.CSSModel.fromTarget(node.target());
    if (!cssModel)
      return;
    cssModel.setEffectivePropertyValueForNode(node.id, animationPrefix + 'duration', duration + 'ms');
    cssModel.setEffectivePropertyValueForNode(node.id, animationPrefix + 'delay', delay + 'ms');
  }

  /**
   * @return {!Promise.<?WebInspector.RemoteObject>}
   */
  remoteObjectPromise() {
    /**
     * @param {?Protocol.Error} error
     * @param {!RuntimeAgent.RemoteObject} payload
     * @return {?WebInspector.RemoteObject}
     * @this {!WebInspector.AnimationModel.Animation}
     */
    function callback(error, payload) {
      return !error ? this.target().runtimeModel.createRemoteObject(payload) : null;
    }

    return this.target().animationAgent().resolveAnimation(this.id(), callback.bind(this));
  }

  /**
   * @return {string}
   */
  _cssId() {
    return this._payload.cssId || '';
  }
};


/** @enum {string} */
WebInspector.AnimationModel.Animation.Type = {
  CSSTransition: 'CSSTransition',
  CSSAnimation: 'CSSAnimation',
  WebAnimation: 'WebAnimation'
};

/**
 * @unrestricted
 */
WebInspector.AnimationModel.AnimationEffect = class extends WebInspector.SDKObject {
  /**
   * @param {!WebInspector.Target} target
   * @param {!AnimationAgent.AnimationEffect} payload
   */
  constructor(target, payload) {
    super(target);
    this._payload = payload;
    if (payload.keyframesRule)
      this._keyframesRule = new WebInspector.AnimationModel.KeyframesRule(target, payload.keyframesRule);
    this._delay = this._payload.delay;
    this._duration = this._payload.duration;
  }

  /**
   * @return {number}
   */
  delay() {
    return this._delay;
  }

  /**
   * @return {number}
   */
  endDelay() {
    return this._payload.endDelay;
  }

  /**
   * @return {number}
   */
  iterationStart() {
    return this._payload.iterationStart;
  }

  /**
   * @return {number}
   */
  iterations() {
    // Animations with zero duration, zero delays and infinite iterations can't be shown.
    if (!this.delay() && !this.endDelay() && !this.duration())
      return 0;
    return this._payload.iterations || Infinity;
  }

  /**
   * @return {number}
   */
  duration() {
    return this._duration;
  }

  /**
   * @return {string}
   */
  direction() {
    return this._payload.direction;
  }

  /**
   * @return {string}
   */
  fill() {
    return this._payload.fill;
  }

  /**
   * @return {!Promise.<!WebInspector.DOMNode>}
   */
  node() {
    if (!this._deferredNode)
      this._deferredNode = new WebInspector.DeferredDOMNode(this.target(), this.backendNodeId());
    return this._deferredNode.resolvePromise();
  }

  /**
   * @return {!WebInspector.DeferredDOMNode}
   */
  deferredNode() {
    return new WebInspector.DeferredDOMNode(this.target(), this.backendNodeId());
  }

  /**
   * @return {number}
   */
  backendNodeId() {
    return this._payload.backendNodeId;
  }

  /**
   * @return {?WebInspector.AnimationModel.KeyframesRule}
   */
  keyframesRule() {
    return this._keyframesRule;
  }

  /**
   * @return {string}
   */
  easing() {
    return this._payload.easing;
  }
};

/**
 * @unrestricted
 */
WebInspector.AnimationModel.KeyframesRule = class extends WebInspector.SDKObject {
  /**
   * @param {!WebInspector.Target} target
   * @param {!AnimationAgent.KeyframesRule} payload
   */
  constructor(target, payload) {
    super(target);
    this._payload = payload;
    this._keyframes = this._payload.keyframes.map(function(keyframeStyle) {
      return new WebInspector.AnimationModel.KeyframeStyle(target, keyframeStyle);
    });
  }

  /**
   * @param {!Array.<!AnimationAgent.KeyframeStyle>} payload
   */
  _setKeyframesPayload(payload) {
    this._keyframes = payload.map(function(keyframeStyle) {
      return new WebInspector.AnimationModel.KeyframeStyle(this._target, keyframeStyle);
    });
  }

  /**
   * @return {string|undefined}
   */
  name() {
    return this._payload.name;
  }

  /**
   * @return {!Array.<!WebInspector.AnimationModel.KeyframeStyle>}
   */
  keyframes() {
    return this._keyframes;
  }
};

/**
 * @unrestricted
 */
WebInspector.AnimationModel.KeyframeStyle = class extends WebInspector.SDKObject {
  /**
   * @param {!WebInspector.Target} target
   * @param {!AnimationAgent.KeyframeStyle} payload
   */
  constructor(target, payload) {
    super(target);
    this._payload = payload;
    this._offset = this._payload.offset;
  }

  /**
   * @return {string}
   */
  offset() {
    return this._offset;
  }

  /**
   * @param {number} offset
   */
  setOffset(offset) {
    this._offset = offset * 100 + '%';
  }

  /**
   * @return {number}
   */
  offsetAsNumber() {
    return parseFloat(this._offset) / 100;
  }

  /**
   * @return {string}
   */
  easing() {
    return this._payload.easing;
  }
};

/**
 * @unrestricted
 */
WebInspector.AnimationModel.AnimationGroup = class extends WebInspector.SDKObject {
  /**
   * @param {!WebInspector.AnimationModel} model
   * @param {string} id
   * @param {!Array.<!WebInspector.AnimationModel.Animation>} animations
   */
  constructor(model, id, animations) {
    super(model.target());
    this._model = model;
    this._id = id;
    this._animations = animations;
    this._paused = false;
    this._screenshots = [];
    this._screenshotImages = [];
  }

  /**
   * @return {string}
   */
  id() {
    return this._id;
  }

  /**
   * @return {!Array.<!WebInspector.AnimationModel.Animation>}
   */
  animations() {
    return this._animations;
  }

  release() {
    this._model._animationGroups.remove(this.id());
    this._model._releaseAnimations(this._animationIds());
  }

  /**
   * @return {!Array.<string>}
   */
  _animationIds() {
    /**
     * @param {!WebInspector.AnimationModel.Animation} animation
     * @return {string}
     */
    function extractId(animation) {
      return animation.id();
    }

    return this._animations.map(extractId);
  }

  /**
   * @return {number}
   */
  startTime() {
    return this._animations[0].startTime();
  }

  /**
   * @return {number}
   */
  finiteDuration() {
    var maxDuration = 0;
    for (var i = 0; i < this._animations.length; ++i)
      maxDuration = Math.max(maxDuration, this._animations[i]._finiteDuration());
    return maxDuration;
  }

  /**
   * @param {number} currentTime
   */
  seekTo(currentTime) {
    this.target().animationAgent().seekAnimations(this._animationIds(), currentTime);
  }

  /**
   * @return {boolean}
   */
  paused() {
    return this._paused;
  }

  /**
   * @param {boolean} paused
   */
  togglePause(paused) {
    if (paused === this._paused)
      return;
    this._paused = paused;
    this.target().animationAgent().setPaused(this._animationIds(), paused);
  }

  /**
   * @return {!Promise.<number>}
   */
  currentTimePromise() {
    /**
     * @param {?Protocol.Error} error
     * @param {number} currentTime
     * @return {number}
     */
    function callback(error, currentTime) {
      return !error ? currentTime : 0;
    }

    var longestAnim = null;
    for (var anim of this._animations) {
      if (!longestAnim || anim.endTime() > longestAnim.endTime())
        longestAnim = anim;
    }
    return this.target().animationAgent().getCurrentTime(longestAnim.id(), callback).catchException(0);
  }

  /**
   * @param {!WebInspector.AnimationModel.AnimationGroup} group
   * @return {boolean}
   */
  _matches(group) {
    /**
     * @param {!WebInspector.AnimationModel.Animation} anim
     * @return {string}
     */
    function extractId(anim) {
      if (anim.type() === WebInspector.AnimationModel.Animation.Type.WebAnimation)
        return anim.type() + anim.id();
      else
        return anim._cssId();
    }

    if (this._animations.length !== group._animations.length)
      return false;
    var left = this._animations.map(extractId).sort();
    var right = group._animations.map(extractId).sort();
    for (var i = 0; i < left.length; i++) {
      if (left[i] !== right[i])
        return false;
    }
    return true;
  }

  /**
   * @param {!WebInspector.AnimationModel.AnimationGroup} group
   */
  _update(group) {
    this._model._releaseAnimations(this._animationIds());
    this._animations = group._animations;
  }

  /**
   * @return {!Array.<!Image>}
   */
  screenshots() {
    for (var i = 0; i < this._screenshots.length; ++i) {
      var image = new Image();
      image.src = 'data:image/jpeg;base64,' + this._screenshots[i];
      this._screenshotImages.push(image);
    }
    this._screenshots = [];
    return this._screenshotImages;
  }
};

/**
 * @implements {AnimationAgent.Dispatcher}
 * @unrestricted
 */
WebInspector.AnimationDispatcher = class {
  constructor(animationModel) {
    this._animationModel = animationModel;
  }

  /**
   * @override
   * @param {string} id
   */
  animationCreated(id) {
    this._animationModel.animationCreated(id);
  }

  /**
   * @override
   * @param {string} id
   */
  animationCanceled(id) {
    this._animationModel._animationCanceled(id);
  }

  /**
   * @override
   * @param {!AnimationAgent.Animation} payload
   */
  animationStarted(payload) {
    this._animationModel.animationStarted(payload);
  }
};

/**
 * @unrestricted
 */
WebInspector.AnimationModel.ScreenshotCapture = class {
  /**
   * @param {!WebInspector.Target} target
   * @param {!WebInspector.AnimationModel} model
   * @param {!WebInspector.ResourceTreeModel} resourceTreeModel
   */
  constructor(target, model, resourceTreeModel) {
    this._target = target;
    /** @type {!Array<!WebInspector.AnimationModel.ScreenshotCapture.Request>} */
    this._requests = [];
    resourceTreeModel.addEventListener(
        WebInspector.ResourceTreeModel.Events.ScreencastFrame, this._screencastFrame, this);
    this._model = model;
    this._model.addEventListener(WebInspector.AnimationModel.Events.ModelReset, this._stopScreencast, this);
  }

  /**
   * @param {number} duration
   * @param {!Array<string>} screenshots
   */
  captureScreenshots(duration, screenshots) {
    var screencastDuration = Math.min(duration / this._model._playbackRate, 3000);
    var endTime = screencastDuration + window.performance.now();
    this._requests.push({endTime: endTime, screenshots: screenshots});

    if (!this._endTime || endTime > this._endTime) {
      clearTimeout(this._stopTimer);
      this._stopTimer = setTimeout(this._stopScreencast.bind(this), screencastDuration);
      this._endTime = endTime;
    }

    if (this._capturing)
      return;
    this._capturing = true;
    this._target.pageAgent().startScreencast('jpeg', 80, undefined, 300, 2);
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _screencastFrame(event) {
    /**
     * @param {!WebInspector.AnimationModel.ScreenshotCapture.Request} request
     * @return {boolean}
     */
    function isAnimating(request) {
      return request.endTime >= now;
    }

    if (!this._capturing)
      return;

    var base64Data = /** type {string} */ (event.data['data']);
    var now = window.performance.now();
    this._requests = this._requests.filter(isAnimating);
    for (var request of this._requests)
      request.screenshots.push(base64Data);
  }

  _stopScreencast() {
    if (!this._capturing)
      return;

    delete this._stopTimer;
    delete this._endTime;
    this._requests = [];
    this._capturing = false;
    this._target.pageAgent().stopScreencast();
  }
};

/** @typedef {{ endTime: number, screenshots: !Array.<string>}} */
WebInspector.AnimationModel.ScreenshotCapture.Request;
