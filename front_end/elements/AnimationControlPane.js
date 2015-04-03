// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 */
WebInspector.AnimationControlPane = function()
{
    this._animationsPaused = false;
    this._animationsPlaybackRate = 1;

    this.element = createElementWithClass("div", "styles-animations-controls-pane");
    this.element.createChild("div").createTextChild("Animations");
    var container = this.element.createChild("div", "animations-controls");

    var statusBar = new WebInspector.StatusBar();
    this._animationsPauseButton = new WebInspector.StatusBarButton("", "pause-status-bar-item");
    statusBar.appendStatusBarItem(this._animationsPauseButton);
    this._animationsPauseButton.addEventListener("click", this._pauseButtonHandler.bind(this));
    container.appendChild(statusBar.element);

    this._animationsPlaybackSlider = container.createChild("input");
    this._animationsPlaybackSlider.type = "range";
    this._animationsPlaybackSlider.min = 0;
    this._animationsPlaybackSlider.max = WebInspector.AnimationsSidebarPane.GlobalPlaybackRates.length - 1;
    this._animationsPlaybackSlider.value = this._animationsPlaybackSlider.max;
    this._animationsPlaybackSlider.addEventListener("input", this._playbackSliderInputHandler.bind(this));

    this._animationsPlaybackLabel = container.createChild("div", "playback-label");
    this._animationsPlaybackLabel.createTextChild("1x");
}

WebInspector.AnimationControlPane.prototype = {

    /**
     * @param {!Event} event
     */
    _playbackSliderInputHandler: function (event)
    {
        this._animationsPlaybackRate = WebInspector.AnimationsSidebarPane.GlobalPlaybackRates[event.target.value];
        this._target.animationAgent().setPlaybackRate(this._animationsPaused ? 0 : this._animationsPlaybackRate);
        this._animationsPlaybackLabel.textContent = this._animationsPlaybackRate + "x";
        WebInspector.userMetrics.actionTaken(WebInspector.UserMetrics.Actions.AnimationsPlaybackRateChanged);
    },

    _pauseButtonHandler: function ()
    {
        this._animationsPaused = !this._animationsPaused;
        this._target.animationAgent().setPlaybackRate(this._animationsPaused ? 0 : this._animationsPlaybackRate);
        WebInspector.userMetrics.actionTaken(WebInspector.UserMetrics.Actions.AnimationsPlaybackRateChanged);
        this._animationsPauseButton.element.classList.toggle("pause-status-bar-item");
        this._animationsPauseButton.element.classList.toggle("play-status-bar-item");
    },

    /**
     * @param {!WebInspector.Event=} event
     */
    _updateAnimationsPlaybackRate: function(event)
    {
        /**
         * @param {?Protocol.Error} error
         * @param {number} playbackRate
         * @this {WebInspector.AnimationControlPane}
         */
        function setPlaybackRate(error, playbackRate)
        {
            this._animationsPlaybackSlider.value = WebInspector.AnimationsSidebarPane.GlobalPlaybackRates.indexOf(playbackRate);
            this._animationsPlaybackLabel.textContent = playbackRate + "x";
        }

        if (this._target)
            this._target.animationAgent().getPlaybackRate(setPlaybackRate.bind(this));
    },

    /**
     * @param {?WebInspector.DOMNode} node
     */
    setNode: function(node)
    {
        if (!node)
            return;

        if (this._target)
            this._target.resourceTreeModel.removeEventListener(WebInspector.ResourceTreeModel.EventTypes.MainFrameNavigated, this._updateAnimationsPlaybackRate, this);

        this._target = node.target();
        this._target.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.MainFrameNavigated, this._updateAnimationsPlaybackRate, this);
        this._updateAnimationsPlaybackRate();
    }

}