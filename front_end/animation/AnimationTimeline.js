// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @implements {WebInspector.TargetManager.Observer}
 */
WebInspector.AnimationTimeline = function()
{
    WebInspector.VBox.call(this, true);
    this.registerRequiredCSS("animation/animationTimeline.css");
    this.element.classList.add("animations-timeline");

    this._grid = this.contentElement.createSVGChild("svg", "animation-timeline-grid");

    this._underlyingPlaybackRate = 1;
    this._createHeader();
    this._animationsContainer = this.contentElement.createChild("div", "animation-timeline-rows");
    var timelineHint = this.contentElement.createChild("div", "animation-timeline-rows-hint");
    timelineHint.textContent = WebInspector.UIString("Select an effect above to inspect and modify.");

    this._duration = this._defaultDuration();
    this._timelineControlsWidth = 150;
    /** @type {!Map.<!DOMAgent.BackendNodeId, !WebInspector.AnimationTimeline.NodeUI>} */
    this._nodesMap = new Map();
    this._groupBuffer = [];
    this._groupBufferSize = 8;
    /** @type {!Map.<!WebInspector.AnimationModel.AnimationGroup, !WebInspector.AnimationGroupPreviewUI>} */
    this._previewMap = new Map();
    this._symbol = Symbol("animationTimeline");
    /** @type {!Map.<string, !WebInspector.AnimationModel.Animation>} */
    this._animationsMap = new Map();
    WebInspector.targetManager.addModelListener(WebInspector.DOMModel, WebInspector.DOMModel.Events.NodeRemoved, this._nodeRemoved, this);
    WebInspector.targetManager.observeTargets(this, WebInspector.Target.Type.Page);
}

WebInspector.AnimationTimeline.GlobalPlaybackRates = [1, 0.25, 0.1];

WebInspector.AnimationTimeline.prototype = {
    wasShown: function()
    {
        for (var target of WebInspector.targetManager.targets(WebInspector.Target.Type.Page))
            this._addEventListeners(target);
    },

    willHide: function()
    {
        for (var target of WebInspector.targetManager.targets(WebInspector.Target.Type.Page))
            this._removeEventListeners(target);
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        if (this.isShowing())
            this._addEventListeners(target);
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
        this._removeEventListeners(target);
    },

    /**
     * @param {!WebInspector.Target} target
     */
    _addEventListeners: function(target)
    {
        var animationModel = WebInspector.AnimationModel.fromTarget(target);
        animationModel.ensureEnabled();
        animationModel.addEventListener(WebInspector.AnimationModel.Events.AnimationGroupStarted, this._animationGroupStarted, this);
        animationModel.addEventListener(WebInspector.AnimationModel.Events.ModelReset, this._reset, this);
    },

    /**
     * @param {!WebInspector.Target} target
     */
    _removeEventListeners: function(target)
    {
        var animationModel = WebInspector.AnimationModel.fromTarget(target);
        animationModel.removeEventListener(WebInspector.AnimationModel.Events.AnimationGroupStarted, this._animationGroupStarted, this);
        animationModel.removeEventListener(WebInspector.AnimationModel.Events.ModelReset, this._reset, this);
    },

    _nodeChanged: function()
    {
        for (var nodeUI of this._nodesMap.values())
            nodeUI._nodeChanged();
    },

    /**
     * @return {!Element} element
     */
    _createScrubber: function() {
        this._timelineScrubber = createElementWithClass("div", "animation-scrubber hidden");
        this._timelineScrubberLine = this._timelineScrubber.createChild("div", "animation-scrubber-line");
        this._timelineScrubberLine.createChild("div", "animation-scrubber-head");
        this._timelineScrubber.createChild("div", "animation-time-overlay");
        return this._timelineScrubber;
    },

    _createHeader: function()
    {
        var toolbarContainer = this.contentElement.createChild("div", "animation-timeline-toolbar-container");
        var topToolbar = new WebInspector.Toolbar("animation-timeline-toolbar", toolbarContainer);
        var clearButton = new WebInspector.ToolbarButton(WebInspector.UIString("Clear all"), "clear-toolbar-item");
        clearButton.addEventListener("click", this._reset.bind(this));
        topToolbar.appendToolbarItem(clearButton);
        topToolbar.appendSeparator();

        var playbackRateControl = toolbarContainer.createChild("div", "animation-playback-rate-control");
        this._playbackRateButtons = [];
        for (var playbackRate of WebInspector.AnimationTimeline.GlobalPlaybackRates) {
            var button = playbackRateControl.createChild("div", "animation-playback-rate-button");
            button.textContent = WebInspector.UIString(playbackRate * 100 + "%");
            button.playbackRate = playbackRate;
            button.addEventListener("click", this._setPlaybackRate.bind(this, playbackRate));
            button.title = WebInspector.UIString("Set speed to ") + button.textContent;
            this._playbackRateButtons.push(button);
        }
        this._updatePlaybackControls();

        this._previewContainer = this.contentElement.createChild("div", "animation-timeline-buffer");
        var emptyBufferHint = this.contentElement.createChild("div", "animation-timeline-buffer-hint");
        emptyBufferHint.textContent = WebInspector.UIString("Listening for animations...");
        var container = this.contentElement.createChild("div", "animation-timeline-header");
        var controls = container.createChild("div", "animation-controls");
        this._currentTime = controls.createChild("div", "animation-timeline-current-time monospace");

        var toolbar = new WebInspector.Toolbar("animation-controls-toolbar", controls);
        this._controlButton = new WebInspector.ToolbarButton(WebInspector.UIString("Replay timeline"), "replay-outline-toolbar-item");
        this._controlButton.addEventListener("click", this._controlButtonToggle.bind(this));
        toolbar.appendToolbarItem(this._controlButton);

        var gridHeader = container.createChild("div", "animation-grid-header");
        WebInspector.installDragHandle(gridHeader, this._repositionScrubber.bind(this), this._scrubberDragMove.bind(this), this._scrubberDragEnd.bind(this), "text");
        container.appendChild(this._createScrubber());
        WebInspector.installDragHandle(this._timelineScrubberLine, this._scrubberDragStart.bind(this), this._scrubberDragMove.bind(this), this._scrubberDragEnd.bind(this), "col-resize");
        this._currentTime.textContent = "";

        return container;
    },

    /**
     * @param {number} playbackRate
     */
    _setPlaybackRate: function(playbackRate)
    {
        this._underlyingPlaybackRate = playbackRate;
        var target = WebInspector.targetManager.mainTarget();
        if (target)
            WebInspector.AnimationModel.fromTarget(target).setPlaybackRate(this._underlyingPlaybackRate);
        WebInspector.userMetrics.actionTaken(WebInspector.UserMetrics.Action.AnimationsPlaybackRateChanged);
        if (this._scrubberPlayer)
            this._scrubberPlayer.playbackRate = this._effectivePlaybackRate();

        this._updatePlaybackControls();
    },

    _updatePlaybackControls: function()
    {
        for (var button of this._playbackRateButtons) {
            var selected = this._underlyingPlaybackRate === button.playbackRate;
            button.classList.toggle("selected", selected);
        }
    },

    _controlButtonToggle: function()
    {
        if (this._controlButton.element.classList.contains("play-outline-toolbar-item"))
            this._togglePause(false);
        else if (this._controlButton.element.classList.contains("replay-outline-toolbar-item"))
            this._replay();
        else
            this._togglePause(true);
    },

    _updateControlButton: function()
    {
        this._controlButton.setEnabled(!!this._selectedGroup);
        this._controlButton.element.classList.remove("play-outline-toolbar-item");
        this._controlButton.element.classList.remove("replay-outline-toolbar-item");
        this._controlButton.element.classList.remove("pause-outline-toolbar-item");
        if (this._selectedGroup && this._selectedGroup.paused()) {
            this._controlButton.element.classList.add("play-outline-toolbar-item");
            this._controlButton.setTitle(WebInspector.UIString("Play timeline"));
            this._controlButton.setToggled(true);
        } else if (!this._scrubberPlayer || this._scrubberPlayer.currentTime >= this.duration()) {
            this._controlButton.element.classList.add("replay-outline-toolbar-item");
            this._controlButton.setTitle(WebInspector.UIString("Replay timeline"));
            this._controlButton.setToggled(true);
        } else {
            this._controlButton.element.classList.add("pause-outline-toolbar-item");
            this._controlButton.setTitle(WebInspector.UIString("Pause timeline"));
            this._controlButton.setToggled(false);
        }
    },

    _updateAnimationsPlaybackRate: function()
    {
        /**
         * @param {number} playbackRate
         * @this {WebInspector.AnimationTimeline}
         */
        function syncPlaybackRate(playbackRate)
        {
            this._underlyingPlaybackRate = playbackRate || 1;
            this._updatePlaybackControls();
        }

        for (var target of WebInspector.targetManager.targets(WebInspector.Target.Type.Page))
            WebInspector.AnimationModel.fromTarget(target).playbackRatePromise().then(syncPlaybackRate.bind(this));
    },

    /**
     * @return {number}
     */
    _effectivePlaybackRate: function()
    {
        return this._selectedGroup && this._selectedGroup.paused() ? 0 : this._underlyingPlaybackRate;
    },

    /**
     * @param {boolean} pause
     */
    _togglePause: function(pause)
    {
        this._selectedGroup.togglePause(pause);
        if (this._scrubberPlayer)
            this._scrubberPlayer.playbackRate = this._effectivePlaybackRate();
        this._previewMap.get(this._selectedGroup).element.classList.toggle("paused", pause);
        this._updateControlButton();
    },

    _replay: function()
    {
        if (!this._selectedGroup)
            return;
        this._selectedGroup.seekTo(0);
        this._animateTime(0);
        this._updateControlButton();
    },

    /**
     * @return {number}
     */
    _defaultDuration: function ()
    {
        return 100;
    },

    /**
     * @return {number}
     */
    duration: function()
    {
        return this._duration;
    },

    /**
     * @param {number} duration
     */
    setDuration: function(duration)
    {
        this._duration = duration;
        this.scheduleRedraw();
    },

    /**
     * @return {number|undefined}
     */
    startTime: function()
    {
        return this._startTime;
    },

    _clearTimeline: function()
    {
        this._nodesMap.clear();
        this._animationsMap.clear();
        this._animationsContainer.removeChildren();
        this._duration = this._defaultDuration();
        delete this._startTime;
        this._timelineScrubber.classList.add("hidden");

    },

    _reset: function()
    {
        this._clearTimeline();
        this._updateAnimationsPlaybackRate();
        if (this._scrubberPlayer)
            this._scrubberPlayer.cancel();
        delete this._scrubberPlayer;
        this._currentTime.textContent = "";
        this._updateControlButton();
        this._groupBuffer = [];
        this._previewMap.clear();
        this._previewContainer.removeChildren();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _animationGroupStarted: function(event)
    {
        this._addAnimationGroup(/** @type {!WebInspector.AnimationModel.AnimationGroup} */(event.data));
    },

    /**
     * @param {!WebInspector.AnimationModel.AnimationGroup} group
     */
    _addAnimationGroup: function(group)
    {
        /**
         * @param {!WebInspector.AnimationModel.AnimationGroup} left
         * @param {!WebInspector.AnimationModel.AnimationGroup} right
         */
        function startTimeComparator(left, right)
        {
            return left.startTime() > right.startTime();
        }

        if (this._previewMap.get(group)) {
            if (this._selectedGroup === group)
                this._syncScrubber();
            else
                this._previewMap.get(group).replay();
            return;
        }
        this._groupBuffer.push(group);
        this._groupBuffer.sort(startTimeComparator);
        // Discard oldest groups from buffer if necessary
        var groupsToDiscard = [];
        while (this._groupBuffer.length > this._groupBufferSize) {
            var toDiscard = this._groupBuffer.splice(this._groupBuffer[0] === this._selectedGroup ? 1 : 0, 1);
            groupsToDiscard.push(toDiscard[0]);
        }
        for (var g of groupsToDiscard) {
            this._previewMap.get(g).element.remove();
            this._previewMap.delete(g);
            // TODO(samli): needs to discard model too
        }
        // Generate preview
        var preview = new WebInspector.AnimationGroupPreviewUI(group);
        this._previewMap.set(group, preview);
        this._previewContainer.appendChild(preview.element);
        preview.removeButton().addEventListener("click", this._removeAnimationGroup.bind(this, group));
        preview.element.addEventListener("click", this._selectAnimationGroup.bind(this, group));
    },

    /**
     * @param {!WebInspector.AnimationModel.AnimationGroup} group
     * @param {!Event} event
     */
    _removeAnimationGroup: function(group, event)
    {
        this._previewMap.get(group).element.remove();
        this._previewMap.delete(group);
        event.consume(true);

        if (this._selectedGroup === group) {
            this._clearTimeline();
            delete this._selectedGroup;
        }
    },

    /**
     * @param {!WebInspector.AnimationModel.AnimationGroup} group
     */
    _selectAnimationGroup: function(group)
    {
        /**
         * @param {!WebInspector.AnimationGroupPreviewUI} ui
         * @param {!WebInspector.AnimationModel.AnimationGroup} group
         * @this {!WebInspector.AnimationTimeline}
         */
        function applySelectionClass(ui, group)
        {
            ui.element.classList.toggle("selected", this._selectedGroup === group);
        }

        if (this._selectedGroup === group) {
            this._togglePause(false);
            this._replay();
            return;
        }
        this._selectedGroup = group;
        this._previewMap.forEach(applySelectionClass, this);
        this._clearTimeline();
        for (var anim of group.animations())
            this._addAnimation(anim);
        this.scheduleRedraw();
        this._timelineScrubber.classList.remove("hidden");
        this._togglePause(false);
        this._replay();
    },

    /**
     * @param {!WebInspector.AnimationModel.Animation} animation
     */
    _addAnimation: function(animation)
    {
        /**
         * @param {?WebInspector.DOMNode} node
         * @this {WebInspector.AnimationTimeline}
         */
        function nodeResolved(node)
        {
            if (!node)
                return;
            uiAnimation.setNode(node);
            node[this._symbol] = nodeUI;
        }

        this._resizeWindow(animation);

        var nodeUI = this._nodesMap.get(animation.source().backendNodeId());
        if (!nodeUI) {
            nodeUI = new WebInspector.AnimationTimeline.NodeUI(animation.source());
            this._animationsContainer.appendChild(nodeUI.element);
            this._nodesMap.set(animation.source().backendNodeId(), nodeUI);
        }
        var nodeRow = nodeUI.findRow(animation);
        var uiAnimation = new WebInspector.AnimationUI(animation, this, nodeRow.element);
        animation.source().deferredNode().resolve(nodeResolved.bind(this));
        nodeRow.animations.push(uiAnimation);
        this._animationsMap.set(animation.id(), animation);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _nodeRemoved: function(event)
    {
        var node = event.data.node;
        if (node[this._symbol])
            node[this._symbol].nodeRemoved();
    },

    _renderGrid: function()
    {
        const gridSize = 250;
        this._grid.setAttribute("width", this.width() + 10);
        this._grid.setAttribute("height", this._animationsContainer.offsetHeight + 30);
        this._grid.setAttribute("shape-rendering", "crispEdges");
        this._grid.removeChildren();
        var lastDraw = undefined;
        for (var time = 0; time < this.duration(); time += gridSize) {
            var line = this._grid.createSVGChild("rect", "animation-timeline-grid-line");
            line.setAttribute("x", time * this.pixelMsRatio() + 10);
            line.setAttribute("y", 23);
            line.setAttribute("height", "100%");
            line.setAttribute("width", 1);
        }
        for (var time = 0; time < this.duration(); time += gridSize) {
            var gridWidth = time * this.pixelMsRatio();
            if (lastDraw === undefined || gridWidth - lastDraw > 50) {
                lastDraw = gridWidth;
                var label = this._grid.createSVGChild("text", "animation-timeline-grid-label");
                label.textContent = WebInspector.UIString(Number.millisToString(time));
                label.setAttribute("x", gridWidth + 10 + 1 - label.offsetWidth / 2);
                label.setAttribute("y", 16);
            }
        }
    },

    scheduleRedraw: function() {
        if (this._redrawing)
            return;
        this._redrawing = true;
        this._animationsContainer.window().requestAnimationFrame(this._redraw.bind(this));
    },

    /**
     * @param {number=} timestamp
     */
    _redraw: function(timestamp)
    {
        delete this._redrawing;
        for (var nodeUI of this._nodesMap.values())
            nodeUI.redraw();
        this._renderGrid();
    },

    onResize: function()
    {
        this._cachedTimelineWidth = Math.max(0, this._animationsContainer.offsetWidth - this._timelineControlsWidth) || 0;
        this.scheduleRedraw();
        if (this._scrubberPlayer)
            this._syncScrubber();
    },

    /**
     * @return {number}
     */
    width: function()
    {
        return this._cachedTimelineWidth || 0;
    },

    /**
     * @param {!WebInspector.AnimationModel.Animation} animation
     * @return {boolean}
     */
    _resizeWindow: function(animation)
    {
        var resized = false;
        if (!this._startTime)
            this._startTime = animation.startTime();

        // This shows at most 3 iterations
        var duration = animation.source().duration() * Math.min(3, animation.source().iterations());
        var requiredDuration = animation.startTime() + animation.source().delay() + duration + animation.source().endDelay() - this.startTime();
        if (requiredDuration > this._duration * 0.8) {
            resized = true;
            this._duration = requiredDuration * 1.5;
        }
        return resized;
    },

    _syncScrubber: function()
    {
        if (!this._selectedGroup)
            return;
        this._selectedGroup.currentTimePromise()
            .then(this._animateTime.bind(this))
            .then(this._updateControlButton.bind(this));
    },

    /**
      * @param {number} currentTime
      */
    _animateTime: function(currentTime)
    {
        if (this._scrubberPlayer)
            this._scrubberPlayer.cancel();

        this._scrubberPlayer = this._timelineScrubber.animate([
            { transform: "translateX(0px)" },
            { transform: "translateX(" +  this.width() + "px)" }
        ], { duration: this.duration(), fill: "forwards" });
        this._scrubberPlayer.playbackRate = this._effectivePlaybackRate();
        this._scrubberPlayer.onfinish = this._updateControlButton.bind(this);
        this._scrubberPlayer.currentTime = currentTime;
        this.element.window().requestAnimationFrame(this._updateScrubber.bind(this));
    },

    /**
     * @return {number}
     */
    pixelMsRatio: function()
    {
        return this.width() / this.duration() || 0;
    },

    /**
     * @param {number} timestamp
     */
    _updateScrubber: function(timestamp)
    {
        if (!this._scrubberPlayer)
            return;
        this._currentTime.textContent = WebInspector.UIString(Number.millisToString(this._scrubberPlayer.currentTime));
        if (this._scrubberPlayer.playState === "pending" || this._scrubberPlayer.playState === "running") {
            this.element.window().requestAnimationFrame(this._updateScrubber.bind(this));
        } else if (this._scrubberPlayer.playState === "finished") {
            this._currentTime.textContent = "";
        }
    },

    /**
     * @param {!Event} event
     * @return {boolean}
     */
    _repositionScrubber: function(event)
    {
        if (!this._selectedGroup)
            return false;

        // Seek to current mouse position.
        if (!this._gridOffsetLeft)
            this._gridOffsetLeft = this._grid.totalOffsetLeft() + 10;
        var seekTime = Math.max(0, event.x - this._gridOffsetLeft) / this.pixelMsRatio();
        this._selectedGroup.seekTo(seekTime);
        this._togglePause(true);
        this._animateTime(seekTime);

        // Interface with scrubber drag.
        this._originalScrubberTime = seekTime;
        this._originalMousePosition = event.x;
        return true;
    },

    /**
     * @param {!Event} event
     * @return {boolean}
     */
    _scrubberDragStart: function(event)
    {
        if (!this._scrubberPlayer || !this._selectedGroup)
            return false;

        this._originalScrubberTime = this._scrubberPlayer.currentTime;
        this._timelineScrubber.classList.remove("animation-timeline-end");
        this._scrubberPlayer.pause();
        this._originalMousePosition = event.x;

        this._togglePause(true);
        return true;
    },

    /**
     * @param {!Event} event
     */
    _scrubberDragMove: function(event)
    {
        var delta = event.x - this._originalMousePosition;
        var currentTime = Math.max(0, Math.min(this._originalScrubberTime + delta / this.pixelMsRatio(), this.duration()));
        this._scrubberPlayer.currentTime = currentTime;
        this._currentTime.textContent = WebInspector.UIString(Number.millisToString(Math.round(currentTime)));
        this._selectedGroup.seekTo(currentTime);
    },

    /**
     * @param {!Event} event
     */
    _scrubberDragEnd: function(event)
    {
        var currentTime = Math.max(0, this._scrubberPlayer.currentTime);
        this._scrubberPlayer.play();
        this._scrubberPlayer.currentTime = currentTime;
        this._currentTime.window().requestAnimationFrame(this._updateScrubber.bind(this));
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 * @param {!WebInspector.AnimationModel.AnimationEffect} animationEffect
 */
WebInspector.AnimationTimeline.NodeUI = function(animationEffect)
{
    /**
     * @param {?WebInspector.DOMNode} node
     * @this {WebInspector.AnimationTimeline.NodeUI}
     */
    function nodeResolved(node)
    {
        if (!node)
            return;
        this._node = node;
        this._nodeChanged();
        this._description.appendChild(WebInspector.DOMPresentationUtils.linkifyNodeReference(node));
    }

    this._rows = [];
    this.element = createElementWithClass("div", "animation-node-row");
    this._description = this.element.createChild("div", "animation-node-description");
    animationEffect.deferredNode().resolve(nodeResolved.bind(this));
    this._timelineElement = this.element.createChild("div", "animation-node-timeline");
}

/** @typedef {{element: !Element, animations: !Array<!WebInspector.AnimationUI>}} */
WebInspector.AnimationTimeline.NodeRow;

WebInspector.AnimationTimeline.NodeUI.prototype = {
    /**
     * @param {!WebInspector.AnimationModel.Animation} animation
     * @return {!WebInspector.AnimationTimeline.NodeRow}
     */
    findRow: function(animation)
    {
        // Check if it can fit into an existing row
        var existingRow = this._collapsibleIntoRow(animation);
        if (existingRow)
            return existingRow;

        // Create new row
        var container = this._timelineElement.createChild("div", "animation-timeline-row");
        var nodeRow = {element: container, animations: []};
        this._rows.push(nodeRow);
        return nodeRow;
    },

    redraw: function()
    {
        for (var nodeRow of this._rows) {
            for (var ui of nodeRow.animations)
                ui.redraw();
        }
    },

    /**
     * @param {!WebInspector.AnimationModel.Animation} animation
     * @return {?WebInspector.AnimationTimeline.NodeRow}
     */
    _collapsibleIntoRow: function(animation)
    {
        if (animation.endTime() === Infinity)
            return null;
        for (var nodeRow of this._rows) {
            var overlap = false;
            for (var ui of nodeRow.animations)
                overlap |= animation.overlaps(ui.animation());
            if (!overlap)
                return nodeRow;
        }
        return null;
    },

    nodeRemoved: function()
    {
        this.element.classList.add("animation-node-removed");
    },

    _nodeChanged: function()
    {
        this.element.classList.toggle("animation-node-selected", this._node && this._node === WebInspector.context.flavor(WebInspector.DOMNode));
    }
}

/**
 * @constructor
 * @param {number} steps
 * @param {string} stepAtPosition
 */
WebInspector.AnimationTimeline.StepTimingFunction = function(steps, stepAtPosition)
{
    this.steps = steps;
    this.stepAtPosition = stepAtPosition;
}

/**
 * @param {string} text
 * @return {?WebInspector.AnimationTimeline.StepTimingFunction}
 */
WebInspector.AnimationTimeline.StepTimingFunction.parse = function(text) {
    var match = text.match(/^step-(start|middle|end)$/);
    if (match)
        return new WebInspector.AnimationTimeline.StepTimingFunction(1, match[1]);
    match = text.match(/^steps\((\d+), (start|middle|end)\)$/);
    if (match)
        return new WebInspector.AnimationTimeline.StepTimingFunction(parseInt(match[1], 10), match[2]);
    return null;
}
