/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @implements {WebInspector.TargetManager.Observer}
 */
WebInspector.RenderingOptionsView = function()
{
    WebInspector.VBox.call(this, true);
    this.registerRequiredCSS("main/renderingOptions.css");

    /** @type {!Map.<string, !Element>} */
    this._settings = new Map();

    var options = [
        {
            label: WebInspector.UIString("Paint Flashing"),
            subtitle: WebInspector.UIString("Highlights areas of the page that need to be repainted"),
            setterName: "setShowPaintRects"
        },
        {
            label: WebInspector.UIString("Layer Borders"),
            subtitle: WebInspector.UIString("Shows layer borders (orange/olive) and tiles (cyan)"),
            setterName: "setShowDebugBorders"
        },
        {
            label: WebInspector.UIString("FPS Meter"),
            subtitle: WebInspector.UIString("Plots frames per second, frame rate distribution, and GPU memory"),
            setterName: "setShowFPSCounter"
        },
        {
            label: WebInspector.UIString("Scrolling Performance Issues"),
            subtitle: WebInspector.UIString("Shows areas of the page that slow down scrolling"),
            setterName: "setShowScrollBottleneckRects",
            tooltip: "Touch and mousewheel event listeners can delay scrolling.\nSome areas need to repaint their content when scrolled."
        }
    ];
    for (var i = 0; i < options.length; i++)
        this._appendCheckbox(options[i].label, options[i].setterName, options[i].subtitle, options[i].tooltip);

    this.contentElement.createChild("div").classList.add("panel-section-separator");

    var cssMediaSubtitle = WebInspector.UIString("Forces media type for testing print and screen styles");
    var checkboxLabel = createCheckboxLabel(WebInspector.UIString("Emulate CSS Media"), false, cssMediaSubtitle);
    this._mediaCheckbox = checkboxLabel.checkboxElement;
    this._mediaCheckbox.addEventListener("click", this._mediaToggled.bind(this), false);
    this.contentElement.appendChild(checkboxLabel);

    var mediaRow = this.contentElement.createChild("div", "media-row");
    this._mediaSelect = mediaRow.createChild("select", "chrome-select");
    this._mediaSelect.appendChild(new Option(WebInspector.UIString("print"), "print"));
    this._mediaSelect.appendChild(new Option(WebInspector.UIString("screen"), "screen"));
    this._mediaSelect.addEventListener("change", this._mediaToggled.bind(this), false);
    this._mediaSelect.disabled = true;

    WebInspector.targetManager.observeTargets(this, WebInspector.Target.Capability.Browser);
};

WebInspector.RenderingOptionsView.prototype = {
    /**
     * @param {string} label
     * @param {string} setterName
     * @param {string=} subtitle
     * @param {string=} tooltip
     */
    _appendCheckbox: function(label, setterName, subtitle, tooltip)
    {
        var checkboxLabel = createCheckboxLabel(label, false, subtitle);
        this._settings.set(setterName, checkboxLabel.checkboxElement);
        checkboxLabel.checkboxElement.addEventListener("click", this._settingToggled.bind(this, setterName));
        if (tooltip)
            checkboxLabel.title = tooltip;
        this.contentElement.appendChild(checkboxLabel);
    },

    /**
     * @param {string} setterName
     */
    _settingToggled: function(setterName)
    {
        var enabled = this._settings.get(setterName).checked;
        for (var target of WebInspector.targetManager.targets(WebInspector.Target.Capability.Browser))
            target.renderingAgent()[setterName](enabled);
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        for (var setterName of this._settings.keysArray()) {
            if (this._settings.get(setterName).checked)
                target.renderingAgent()[setterName](true);
        }
        if (this._mediaCheckbox.checked)
            this._applyPrintMediaOverride(target);
    },

    _mediaToggled: function()
    {
        this._mediaSelect.disabled = !this._mediaCheckbox.checked;
        var targets = WebInspector.targetManager.targets(WebInspector.Target.Capability.Browser);
        for (var target of targets)
            this._applyPrintMediaOverride(target);
    },

    /**
     * @param {!WebInspector.Target} target
     */
    _applyPrintMediaOverride: function(target)
    {
        target.emulationAgent().setEmulatedMedia(this._mediaCheckbox.checked ? this._mediaSelect.value : "");
        var cssModel = WebInspector.CSSModel.fromTarget(target);
        if (cssModel)
            cssModel.mediaQueryResultChanged();
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
    },

    __proto__: WebInspector.VBox.prototype
};

/**
 * @return {!WebInspector.RenderingOptionsView}
 */
WebInspector.RenderingOptionsView.instance = function()
{
    if (!WebInspector.RenderingOptionsView._instanceObject)
        WebInspector.RenderingOptionsView._instanceObject = new WebInspector.RenderingOptionsView();
    return WebInspector.RenderingOptionsView._instanceObject;
};
