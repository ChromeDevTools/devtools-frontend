// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {!WebInspector.AnimationModel.AnimationGroup} model
 */
WebInspector.AnimationGroupPreviewUI = function(model)
{
    this._model = model;
    this.element = createElementWithClass("div", "animation-buffer-preview");
    this.element.createChild("div", "animation-paused fill");
    this._removeButton = this.element.createChild("div", "animation-remove-button");
    this._removeButton.textContent = "\u2715";
    this._replayOverlayElement = this.element.createChild("div", "animation-buffer-preview-animation");
    this._svg = this.element.createSVGChild("svg");
    this._svg.setAttribute("width", "100%");
    this._svg.setAttribute("preserveAspectRatio", "none");
    this._svg.setAttribute("height", "100%");
    this._viewBoxHeight = 32;
    this._svg.setAttribute("viewBox", "0 0 100 " + this._viewBoxHeight);
    this._svg.setAttribute("shape-rendering", "crispEdges");
    this._render();
}

WebInspector.AnimationGroupPreviewUI.prototype = {
    /**
     * @return {number}
     */
    _groupDuration: function()
    {
        var duration = 0;
        for (var anim of this._model.animations()) {
            var animDuration = anim.source().delay() + anim.source().duration();
            if (animDuration > duration)
                duration = animDuration;
        }
        return duration;
    },

    /**
     * @return {!Element}
     */
    removeButton: function()
    {
        return this._removeButton;
    },

    replay: function()
    {
        this._replayOverlayElement.animate([
                { offset: 0, width: "0%", opacity: 1 },
                { offset: 0.9, width: "100%", opacity: 1 },
                { offset: 1, width: "100%", opacity: 0 }
            ], { duration : 200, easing: "cubic-bezier(0, 0, 0.2, 1)" });
    },

    _render: function()
    {
        this._svg.removeChildren();
        var maxToShow = 10;
        var numberOfAnimations = Math.min(this._model.animations().length, maxToShow);
        var timeToPixelRatio = 100 / Math.max(this._groupDuration(), 750);
        for (var i = 0; i < numberOfAnimations; i++) {
            var effect = this._model.animations()[i].source();
            var line = this._svg.createSVGChild("line");
            line.setAttribute("x1", effect.delay() * timeToPixelRatio);
            line.setAttribute("x2", (effect.delay() + effect.duration()) * timeToPixelRatio);
            var y = Math.floor(this._viewBoxHeight / Math.max(6, numberOfAnimations) * i + 1);
            line.setAttribute("y1", y);
            line.setAttribute("y2", y);
            line.style.stroke = WebInspector.AnimationUI.Color(this._model.animations()[i]);
        }
    }
}