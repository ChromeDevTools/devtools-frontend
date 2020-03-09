// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as Platform from '../platform/platform.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {AnimationGroupPreviewUI} from './AnimationGroupPreviewUI.js';
import {AnimationEffect, AnimationGroup, AnimationImpl, AnimationModel, Events} from './AnimationModel.js';  // eslint-disable-line no-unused-vars
import {AnimationScreenshotPopover} from './AnimationScreenshotPopover.js';
import {AnimationUI} from './AnimationUI.js';

/**
 * @implements {SDK.SDKModel.SDKModelObserver<!AnimationModel>}
 * @unrestricted
 */
export class AnimationTimeline extends UI.Widget.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('animation/animationTimeline.css');
    this.element.classList.add('animations-timeline');

    this._grid = this.contentElement.createSVGChild('svg', 'animation-timeline-grid');

    this._playbackRate = 1;
    this._allPaused = false;
    this._createHeader();
    this._animationsContainer = this.contentElement.createChild('div', 'animation-timeline-rows');
    const timelineHint = this.contentElement.createChild('div', 'animation-timeline-rows-hint');
    timelineHint.textContent = ls`Select an effect above to inspect and modify.`;

    /** @const */ this._defaultDuration = 100;
    this._duration = this._defaultDuration;
    /** @const */ this._timelineControlsWidth = 150;
    /** @type {!Map.<!Protocol.DOM.BackendNodeId, !NodeUI>} */
    this._nodesMap = new Map();
    this._uiAnimations = [];
    this._groupBuffer = [];
    /** @type {!Map.<!AnimationGroup, !AnimationGroupPreviewUI>} */
    this._previewMap = new Map();
    this._symbol = Symbol('animationTimeline');
    /** @type {!Map.<string, !AnimationImpl>} */
    this._animationsMap = new Map();
    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.NodeRemoved, this._nodeRemoved, this);
    SDK.SDKModel.TargetManager.instance().observeModels(AnimationModel, this);
    self.UI.context.addFlavorChangeListener(SDK.DOMModel.DOMNode, this._nodeChanged, this);
  }

  /**
   * @override
   */
  wasShown() {
    for (const animationModel of SDK.SDKModel.TargetManager.instance().models(AnimationModel)) {
      this._addEventListeners(animationModel);
    }
  }

  /**
   * @override
   */
  willHide() {
    for (const animationModel of SDK.SDKModel.TargetManager.instance().models(AnimationModel)) {
      this._removeEventListeners(animationModel);
    }
    this._popoverHelper.hidePopover();
  }

  /**
   * @override
   * @param {!AnimationModel} animationModel
   */
  modelAdded(animationModel) {
    if (this.isShowing()) {
      this._addEventListeners(animationModel);
    }
  }

  /**
   * @override
   * @param {!AnimationModel} animationModel
   */
  modelRemoved(animationModel) {
    this._removeEventListeners(animationModel);
  }

  /**
   * @param {!AnimationModel} animationModel
   */
  _addEventListeners(animationModel) {
    animationModel.ensureEnabled();
    animationModel.addEventListener(Events.AnimationGroupStarted, this._animationGroupStarted, this);
    animationModel.addEventListener(Events.ModelReset, this._reset, this);
  }

  /**
   * @param {!AnimationModel} animationModel
   */
  _removeEventListeners(animationModel) {
    animationModel.removeEventListener(Events.AnimationGroupStarted, this._animationGroupStarted, this);
    animationModel.removeEventListener(Events.ModelReset, this._reset, this);
  }

  _nodeChanged() {
    for (const nodeUI of this._nodesMap.values()) {
      nodeUI._nodeChanged();
    }
  }

  /**
   * @return {!Element} element
   */
  _createScrubber() {
    this._timelineScrubber = createElementWithClass('div', 'animation-scrubber hidden');
    this._timelineScrubberLine = this._timelineScrubber.createChild('div', 'animation-scrubber-line');
    this._timelineScrubberLine.createChild('div', 'animation-scrubber-head');
    this._timelineScrubber.createChild('div', 'animation-time-overlay');
    return this._timelineScrubber;
  }

  _createHeader() {
    const toolbarContainer = this.contentElement.createChild('div', 'animation-timeline-toolbar-container');
    const topToolbar = new UI.Toolbar.Toolbar('animation-timeline-toolbar', toolbarContainer);
    this._clearButton = new UI.Toolbar.ToolbarButton(ls`Clear all`, 'largeicon-clear');
    this._clearButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._reset.bind(this));
    topToolbar.appendToolbarItem(this._clearButton);
    topToolbar.appendSeparator();

    this._pauseButton = new UI.Toolbar.ToolbarToggle(ls`Pause all`, 'largeicon-pause', 'largeicon-resume');
    this._pauseButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._togglePauseAll.bind(this));
    topToolbar.appendToolbarItem(this._pauseButton);

    const playbackRateControl = toolbarContainer.createChild('div', 'animation-playback-rate-control');
    playbackRateControl.addEventListener('keydown', this._handlePlaybackRateControlKeyDown.bind(this));
    UI.ARIAUtils.markAsListBox(playbackRateControl);
    UI.ARIAUtils.setAccessibleName(playbackRateControl, ls`Playback rates`);

    this._playbackRateButtons = [];
    for (const playbackRate of GlobalPlaybackRates) {
      const button = playbackRateControl.createChild('button', 'animation-playback-rate-button');
      button.textContent = playbackRate ? ls`${playbackRate * 100}%` : ls`Pause`;
      button.playbackRate = playbackRate;
      button.addEventListener('click', this._setPlaybackRate.bind(this, playbackRate));
      UI.ARIAUtils.markAsOption(button);
      button.title = ls`Set speed to ${button.textContent}`;
      button.tabIndex = -1;
      this._playbackRateButtons.push(button);
    }
    this._updatePlaybackControls();

    this._previewContainer = this.contentElement.createChild('div', 'animation-timeline-buffer');
    UI.ARIAUtils.markAsListBox(this._previewContainer);
    UI.ARIAUtils.setAccessibleName(this._previewContainer, ls`Animation previews`);
    this._popoverHelper =
        new UI.PopoverHelper.PopoverHelper(this._previewContainer, this._getPopoverRequest.bind(this));
    this._popoverHelper.setDisableOnClick(true);
    this._popoverHelper.setTimeout(0);
    const emptyBufferHint = this.contentElement.createChild('div', 'animation-timeline-buffer-hint');
    emptyBufferHint.textContent = ls`Listening for animations...`;
    const container = this.contentElement.createChild('div', 'animation-timeline-header');
    const controls = container.createChild('div', 'animation-controls');
    this._currentTime = controls.createChild('div', 'animation-timeline-current-time monospace');

    const toolbar = new UI.Toolbar.Toolbar('animation-controls-toolbar', controls);
    this._controlButton = new UI.Toolbar.ToolbarToggle(ls`Replay timeline`, 'largeicon-replay-animation');
    this._controlState = _ControlState.Replay;
    this._controlButton.setToggled(true);
    this._controlButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._controlButtonToggle.bind(this));
    toolbar.appendToolbarItem(this._controlButton);

    const gridHeader = container.createChild('div', 'animation-grid-header');
    UI.UIUtils.installDragHandle(
        gridHeader, this._repositionScrubber.bind(this), this._scrubberDragMove.bind(this),
        this._scrubberDragEnd.bind(this), 'text');
    container.appendChild(this._createScrubber());
    UI.UIUtils.installDragHandle(
        this._timelineScrubberLine, this._scrubberDragStart.bind(this), this._scrubberDragMove.bind(this),
        this._scrubberDragEnd.bind(this), 'col-resize');
    this._currentTime.textContent = '';

    return container;
  }

  /**
   * @param {!Event} event
   */
  _handlePlaybackRateControlKeyDown(event) {
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        this._focusNextPlaybackRateButton(event.target, /* focusPrevious */ true);
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        this._focusNextPlaybackRateButton(event.target);
        break;
    }
  }

  /**
   * @param {!EventTarget|null} target
   * @param {boolean=} focusPrevious
   */
  _focusNextPlaybackRateButton(target, focusPrevious) {
    const currentIndex = this._playbackRateButtons.indexOf(target);
    const nextIndex = focusPrevious ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= this._playbackRateButtons.length) {
      return;
    }
    const nextButton = this._playbackRateButtons[nextIndex];
    nextButton.tabIndex = 0;
    nextButton.focus();
    target.tabIndex = -1;
  }

  /**
   * @param {!Event} event
   * @return {?UI.PopoverRequest}
   */
  _getPopoverRequest(event) {
    const element = event.target;
    if (!element.isDescendant(this._previewContainer)) {
      return null;
    }

    return {
      box: event.target.boxInWindow(),
      show: popover => {
        let animGroup;
        for (const [group, previewUI] of this._previewMap) {
          if (previewUI.element === element.parentElement) {
            animGroup = group;
          }
        }
        console.assert(animGroup);
        const screenshots = animGroup.screenshots();
        if (!screenshots.length) {
          return Promise.resolve(false);
        }

        let fulfill;
        const promise = new Promise(x => fulfill = x);
        if (!screenshots[0].complete) {
          screenshots[0].onload = onFirstScreenshotLoaded.bind(null, screenshots);
        } else {
          onFirstScreenshotLoaded(screenshots);
        }
        return promise;

        /**
         * @param  {!Array.<!Image>} screenshots
         */
        function onFirstScreenshotLoaded(screenshots) {
          new AnimationScreenshotPopover(screenshots).show(popover.contentElement);
          fulfill(true);
        }
      }
    };
  }

  _togglePauseAll() {
    this._allPaused = !this._allPaused;
    this._pauseButton.setToggled(this._allPaused);
    this._setPlaybackRate(this._playbackRate);
    this._pauseButton.setTitle(this._allPaused ? ls`Resume all` : ls`Pause all`);
  }

  /**
   * @param {number} playbackRate
   */
  _setPlaybackRate(playbackRate) {
    this._playbackRate = playbackRate;
    for (const animationModel of SDK.SDKModel.TargetManager.instance().models(AnimationModel)) {
      animationModel.setPlaybackRate(this._allPaused ? 0 : this._playbackRate);
    }
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.AnimationsPlaybackRateChanged);
    if (this._scrubberPlayer) {
      this._scrubberPlayer.playbackRate = this._effectivePlaybackRate();
    }

    this._updatePlaybackControls();
  }

  _updatePlaybackControls() {
    for (const button of this._playbackRateButtons) {
      const selected = this._playbackRate === button.playbackRate;
      button.classList.toggle('selected', selected);
      button.tabIndex = selected ? 0 : -1;
    }
  }

  _controlButtonToggle() {
    if (this._controlState === _ControlState.Play) {
      this._togglePause(false);
    } else if (this._controlState === _ControlState.Replay) {
      this._replay();
    } else {
      this._togglePause(true);
    }
  }

  _updateControlButton() {
    this._controlButton.setEnabled(!!this._selectedGroup);
    if (this._selectedGroup && this._selectedGroup.paused()) {
      this._controlState = _ControlState.Play;
      this._controlButton.setToggled(true);
      this._controlButton.setTitle(ls`Play timeline`);
      this._controlButton.setGlyph('largeicon-play-animation');
    } else if (!this._scrubberPlayer || this._scrubberPlayer.currentTime >= this.duration()) {
      this._controlState = _ControlState.Replay;
      this._controlButton.setToggled(true);
      this._controlButton.setTitle(ls`Replay timeline`);
      this._controlButton.setGlyph('largeicon-replay-animation');
    } else {
      this._controlState = _ControlState.Pause;
      this._controlButton.setToggled(false);
      this._controlButton.setTitle(ls`Pause timeline`);
      this._controlButton.setGlyph('largeicon-pause-animation');
    }
  }

  /**
   * @return {number}
   */
  _effectivePlaybackRate() {
    return (this._allPaused || (this._selectedGroup && this._selectedGroup.paused())) ? 0 : this._playbackRate;
  }

  /**
   * @param {boolean} pause
   */
  _togglePause(pause) {
    this._selectedGroup.togglePause(pause);
    if (this._scrubberPlayer) {
      this._scrubberPlayer.playbackRate = this._effectivePlaybackRate();
    }
    this._previewMap.get(this._selectedGroup).element.classList.toggle('paused', pause);
    this._updateControlButton();
  }

  _replay() {
    if (!this._selectedGroup) {
      return;
    }
    this._selectedGroup.seekTo(0);
    this._animateTime(0);
    this._updateControlButton();
  }

  /**
   * @return {number}
   */
  duration() {
    return this._duration;
  }

  /**
   * @param {number} duration
   */
  setDuration(duration) {
    this._duration = duration;
    this.scheduleRedraw();
  }

  _clearTimeline() {
    this._uiAnimations = [];
    this._nodesMap.clear();
    this._animationsMap.clear();
    this._animationsContainer.removeChildren();
    this._duration = this._defaultDuration;
    this._timelineScrubber.classList.add('hidden');
    delete this._selectedGroup;
    if (this._scrubberPlayer) {
      this._scrubberPlayer.cancel();
    }
    delete this._scrubberPlayer;
    this._currentTime.textContent = '';
    this._updateControlButton();
  }

  _reset() {
    this._clearTimeline();
    if (this._allPaused) {
      this._togglePauseAll();
    } else {
      this._setPlaybackRate(this._playbackRate);
    }

    for (const group of this._groupBuffer) {
      group.release();
    }
    this._groupBuffer = [];
    this._previewMap.clear();
    this._previewContainer.removeChildren();
    this._popoverHelper.hidePopover();
    this._renderGrid();
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _animationGroupStarted(event) {
    this._addAnimationGroup(/** @type {!AnimationGroup} */ (event.data));
  }

  /**
   * @param {!AnimationGroup} group
   */
  _addAnimationGroup(group) {
    /**
     * @param {!AnimationGroup} left
     * @param {!Animation.AnimationModel.AnimationGroup} right
     */
    function startTimeComparator(left, right) {
      return left.startTime() > right.startTime();
    }

    if (this._previewMap.get(group)) {
      if (this._selectedGroup === group) {
        this._syncScrubber();
      } else {
        this._previewMap.get(group).replay();
      }
      return;
    }
    this._groupBuffer.sort(startTimeComparator);
    // Discard oldest groups from buffer if necessary
    const groupsToDiscard = [];
    const bufferSize = this.width() / 50;
    while (this._groupBuffer.length > bufferSize) {
      const toDiscard = this._groupBuffer.splice(this._groupBuffer[0] === this._selectedGroup ? 1 : 0, 1);
      groupsToDiscard.push(toDiscard[0]);
    }
    for (const g of groupsToDiscard) {
      this._previewMap.get(g).element.remove();
      this._previewMap.delete(g);
      g.release();
    }
    // Generate preview
    const preview = new AnimationGroupPreviewUI(group);
    this._groupBuffer.push(group);
    this._previewMap.set(group, preview);
    this._previewContainer.appendChild(preview.element);
    preview.removeButton().addEventListener('click', this._removeAnimationGroup.bind(this, group));
    preview.element.addEventListener('click', this._selectAnimationGroup.bind(this, group));
    preview.element.addEventListener('keydown', this._handleAnimationGroupKeyDown.bind(this, group));
    UI.ARIAUtils.setAccessibleName(preview.element, ls`Animation Preview ${this._groupBuffer.indexOf(group) + 1}`);
    UI.ARIAUtils.markAsOption(preview.element);

    if (this._previewMap.size === 1) {
      this._previewMap.get(this._groupBuffer[0]).element.tabIndex = 0;
    }
  }

  /**
   * @param {!AnimationGroup} group
   * @param {!Event} event
   */
  _handleAnimationGroupKeyDown(group, event) {
    switch (event.key) {
      case ' ':
      case 'Enter':
        this._selectAnimationGroup(group);
        break;
      case 'Backspace':
      case 'Delete':
        this._removeAnimationGroup(group, event);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        this._focusNextGroup(group, /* target */ event.target, /* focusPrevious */ true);
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        this._focusNextGroup(group, /* target */ event.target);
    }
  }

  /**
   * @param {!AnimationGroup} group
   * @param {!EventTarget|null} target
   * @param {boolean=} focusPrevious
   */
  _focusNextGroup(group, target, focusPrevious) {
    const currentGroupIndex = this._groupBuffer.indexOf(group);
    const nextIndex = focusPrevious ? currentGroupIndex - 1 : currentGroupIndex + 1;
    if (nextIndex < 0 || nextIndex >= this._groupBuffer.length) {
      return;
    }
    const preview = this._previewMap.get(this._groupBuffer[nextIndex]);
    preview.element.tabIndex = 0;
    preview.element.focus();
    target.tabIndex = -1;
  }

  /**
   * @param {!AnimationGroup} group
   * @param {!Event} event
   */
  _removeAnimationGroup(group, event) {
    const currentGroupIndex = this._groupBuffer.indexOf(group);

    Platform.ArrayUtilities.removeElement(this._groupBuffer, group);
    this._previewMap.get(group).element.remove();
    this._previewMap.delete(group);
    group.release();
    event.consume(true);

    if (this._selectedGroup === group) {
      this._clearTimeline();
      this._renderGrid();
    }

    const groupLength = this._groupBuffer.length;
    if (groupLength === 0) {
      this._clearButton.element.focus();
      return;
    }
    const nextGroup = currentGroupIndex >= this._groupBuffer.length ?
        this._previewMap.get(this._groupBuffer[this._groupBuffer.length - 1]) :
        this._previewMap.get(this._groupBuffer[currentGroupIndex]);
    nextGroup.element.tabIndex = 0;
    nextGroup.element.focus();
  }

  /**
   * @param {!AnimationGroup} group
   */
  _selectAnimationGroup(group) {
    /**
     * @param {!AnimationGroupPreviewUI} ui
     * @param {!AnimationGroup} group
     * @this {!AnimationTimeline}
     */
    function applySelectionClass(ui, group) {
      ui.element.classList.toggle('selected', this._selectedGroup === group);
    }

    if (this._selectedGroup === group) {
      this._togglePause(false);
      this._replay();
      return;
    }
    this._clearTimeline();
    this._selectedGroup = group;
    this._previewMap.forEach(applySelectionClass, this);
    this.setDuration(Math.max(500, group.finiteDuration() + 100));
    for (const anim of group.animations()) {
      this._addAnimation(anim);
    }
    this.scheduleRedraw();
    this._timelineScrubber.classList.remove('hidden');
    this._togglePause(false);
    this._replay();
  }

  /**
   * @param {!AnimationImpl} animation
   */
  _addAnimation(animation) {
    /**
     * @param {?SDK.DOMModel.DOMNode} node
     * @this {AnimationTimeline}
     */
    function nodeResolved(node) {
      nodeUI.nodeResolved(node);
      uiAnimation.setNode(node);
      if (node) {
        node[this._symbol] = nodeUI;
      }
    }

    let nodeUI = this._nodesMap.get(animation.source().backendNodeId());
    if (!nodeUI) {
      nodeUI = new NodeUI(animation.source());
      this._animationsContainer.appendChild(nodeUI.element);
      this._nodesMap.set(animation.source().backendNodeId(), nodeUI);
    }
    const nodeRow = nodeUI.createNewRow();
    const uiAnimation = new AnimationUI(animation, this, nodeRow);
    animation.source().deferredNode().resolve(nodeResolved.bind(this));
    this._uiAnimations.push(uiAnimation);
    this._animationsMap.set(animation.id(), animation);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _nodeRemoved(event) {
    const node = event.data.node;
    if (node[this._symbol]) {
      node[this._symbol].nodeRemoved();
    }
  }

  _renderGrid() {
    /** @const */ const gridSize = 250;
    this._grid.setAttribute('width', this.width() + 10);
    this._grid.setAttribute('height', this._cachedTimelineHeight + 30);
    this._grid.setAttribute('shape-rendering', 'crispEdges');
    this._grid.removeChildren();
    let lastDraw = undefined;
    for (let time = 0; time < this.duration(); time += gridSize) {
      const line = this._grid.createSVGChild('rect', 'animation-timeline-grid-line');
      line.setAttribute('x', time * this.pixelMsRatio() + 10);
      line.setAttribute('y', 23);
      line.setAttribute('height', '100%');
      line.setAttribute('width', 1);
    }
    for (let time = 0; time < this.duration(); time += gridSize) {
      const gridWidth = time * this.pixelMsRatio();
      if (lastDraw === undefined || gridWidth - lastDraw > 50) {
        lastDraw = gridWidth;
        const label = this._grid.createSVGChild('text', 'animation-timeline-grid-label');
        label.textContent = Number.millisToString(time);
        label.setAttribute('x', gridWidth + 10);
        label.setAttribute('y', 16);
      }
    }
  }

  scheduleRedraw() {
    this._renderQueue = [];
    for (const ui of this._uiAnimations) {
      this._renderQueue.push(ui);
    }
    if (this._redrawing) {
      return;
    }
    this._redrawing = true;
    this._renderGrid();
    this._animationsContainer.window().requestAnimationFrame(this._render.bind(this));
  }

  /**
   * @param {number=} timestamp
   */
  _render(timestamp) {
    while (this._renderQueue.length && (!timestamp || window.performance.now() - timestamp < 50)) {
      this._renderQueue.shift().redraw();
    }
    if (this._renderQueue.length) {
      this._animationsContainer.window().requestAnimationFrame(this._render.bind(this));
    } else {
      delete this._redrawing;
    }
  }

  /**
   * @override
   */
  onResize() {
    this._cachedTimelineWidth = Math.max(0, this._animationsContainer.offsetWidth - this._timelineControlsWidth) || 0;
    this._cachedTimelineHeight = this._animationsContainer.offsetHeight;
    this.scheduleRedraw();
    if (this._scrubberPlayer) {
      this._syncScrubber();
    }
    delete this._gridOffsetLeft;
  }

  /**
   * @return {number}
   */
  width() {
    return this._cachedTimelineWidth || 0;
  }

  /**
   * @param {!AnimationImpl} animation
   * @return {boolean}
   */
  _resizeWindow(animation) {
    let resized = false;

    // This shows at most 3 iterations
    const duration = animation.source().duration() * Math.min(2, animation.source().iterations());
    const requiredDuration = animation.source().delay() + duration + animation.source().endDelay();
    if (requiredDuration > this._duration) {
      resized = true;
      this._duration = requiredDuration + 200;
    }
    return resized;
  }

  _syncScrubber() {
    if (!this._selectedGroup) {
      return;
    }
    this._selectedGroup.currentTimePromise()
        .then(this._animateTime.bind(this))
        .then(this._updateControlButton.bind(this));
  }

  /**
   * @param {number} currentTime
   */
  _animateTime(currentTime) {
    if (this._scrubberPlayer) {
      this._scrubberPlayer.cancel();
    }

    this._scrubberPlayer = this._timelineScrubber.animate(
        [{transform: 'translateX(0px)'}, {transform: 'translateX(' + this.width() + 'px)'}],
        {duration: this.duration(), fill: 'forwards'});
    this._scrubberPlayer.playbackRate = this._effectivePlaybackRate();
    this._scrubberPlayer.onfinish = this._updateControlButton.bind(this);
    this._scrubberPlayer.currentTime = currentTime;
    this.element.window().requestAnimationFrame(this._updateScrubber.bind(this));
  }

  /**
   * @return {number}
   */
  pixelMsRatio() {
    return this.width() / this.duration() || 0;
  }

  /**
   * @param {number} timestamp
   */
  _updateScrubber(timestamp) {
    if (!this._scrubberPlayer) {
      return;
    }
    this._currentTime.textContent = Number.millisToString(this._scrubberPlayer.currentTime);
    if (this._scrubberPlayer.playState === 'pending' || this._scrubberPlayer.playState === 'running') {
      this.element.window().requestAnimationFrame(this._updateScrubber.bind(this));
    } else if (this._scrubberPlayer.playState === 'finished') {
      this._currentTime.textContent = '';
    }
  }

  /**
   * @param {!Event} event
   * @return {boolean}
   */
  _repositionScrubber(event) {
    if (!this._selectedGroup) {
      return false;
    }

    // Seek to current mouse position.
    if (!this._gridOffsetLeft) {
      this._gridOffsetLeft = this._grid.totalOffsetLeft() + 10;
    }
    const seekTime = Math.max(0, event.x - this._gridOffsetLeft) / this.pixelMsRatio();
    this._selectedGroup.seekTo(seekTime);
    this._togglePause(true);
    this._animateTime(seekTime);

    // Interface with scrubber drag.
    this._originalScrubberTime = seekTime;
    this._originalMousePosition = event.x;
    return true;
  }

  /**
   * @param {!Event} event
   * @return {boolean}
   */
  _scrubberDragStart(event) {
    if (!this._scrubberPlayer || !this._selectedGroup) {
      return false;
    }

    this._originalScrubberTime = this._scrubberPlayer.currentTime;
    this._timelineScrubber.classList.remove('animation-timeline-end');
    this._scrubberPlayer.pause();
    this._originalMousePosition = event.x;

    this._togglePause(true);
    return true;
  }

  /**
   * @param {!Event} event
   */
  _scrubberDragMove(event) {
    const delta = event.x - this._originalMousePosition;
    const currentTime =
        Math.max(0, Math.min(this._originalScrubberTime + delta / this.pixelMsRatio(), this.duration()));
    this._scrubberPlayer.currentTime = currentTime;
    this._currentTime.textContent = Number.millisToString(Math.round(currentTime));
    this._selectedGroup.seekTo(currentTime);
  }

  /**
   * @param {!Event} event
   */
  _scrubberDragEnd(event) {
    const currentTime = Math.max(0, this._scrubberPlayer.currentTime);
    this._scrubberPlayer.play();
    this._scrubberPlayer.currentTime = currentTime;
    this._currentTime.window().requestAnimationFrame(this._updateScrubber.bind(this));
  }
}

export const GlobalPlaybackRates = [1, 0.25, 0.1];

/** @enum {string} */
export const _ControlState = {
  Play: 'play-outline',
  Replay: 'replay-outline',
  Pause: 'pause-outline'
};

/**
 * @unrestricted
 */
export class NodeUI {
  /**
   * @param {!AnimationEffect} animationEffect
   */
  constructor(animationEffect) {
    this.element = createElementWithClass('div', 'animation-node-row');
    this._description = this.element.createChild('div', 'animation-node-description');
    this._description.tabIndex = 0;
    this._timelineElement = this.element.createChild('div', 'animation-node-timeline');
    UI.ARIAUtils.markAsApplication(this._timelineElement);
  }

  /**
   * @param {?SDK.DOMModel.DOMNode} node
   */
  nodeResolved(node) {
    if (!node) {
      this._description.createTextChild('<node>');
      return;
    }
    this._node = node;
    this._nodeChanged();
    Common.Linkifier.Linkifier.linkify(node, {preventKeyboardFocus: true}).then(link => {
      this._description.appendChild(link);
      this._description.addEventListener('keydown', event => {
        if (isEnterOrSpaceKey(event) && this._node) {
          Common.Revealer.reveal(node, false);
          event.consume(true);
        }
      });
    });
    if (!node.ownerDocument) {
      this.nodeRemoved();
    }
  }

  /**
   * @return {!Element}
   */
  createNewRow() {
    return this._timelineElement.createChild('div', 'animation-timeline-row');
  }

  nodeRemoved() {
    this.element.classList.add('animation-node-removed');
    this._node = null;
  }

  _nodeChanged() {
    this.element.classList.toggle(
        'animation-node-selected', this._node && this._node === self.UI.context.flavor(SDK.DOMModel.DOMNode));
  }
}

/**
 * @unrestricted
 */
export class StepTimingFunction {
  /**
   * @param {number} steps
   * @param {string} stepAtPosition
   */
  constructor(steps, stepAtPosition) {
    this.steps = steps;
    this.stepAtPosition = stepAtPosition;
  }

  /**
   * @param {string} text
   * @return {?StepTimingFunction}
   */
  static parse(text) {
    let match = text.match(/^steps\((\d+), (start|middle)\)$/);
    if (match) {
      return new StepTimingFunction(parseInt(match[1], 10), match[2]);
    }
    match = text.match(/^steps\((\d+)\)$/);
    if (match) {
      return new StepTimingFunction(parseInt(match[1], 10), 'end');
    }
    return null;
  }
}
