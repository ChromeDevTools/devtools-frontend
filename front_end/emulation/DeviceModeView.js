// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.VBox}
 */
WebInspector.DeviceModeView = function()
{
    WebInspector.VBox.call(this, true);
    this.setMinimumSize(150, 150);
    this.element.classList.add("device-mode-view");
    this.registerRequiredCSS("emulation/deviceModeView.css");
    WebInspector.Tooltip.addNativeOverrideContainer(this.contentElement);

    this._model = new WebInspector.DeviceModeModel(this._updateUI.bind(this));
    this._mediaInspector = new WebInspector.MediaQueryInspector(() => this._model.appliedDeviceSize().width, this._model.setWidth.bind(this._model));
    this._showMediaInspectorSetting = WebInspector.settings.moduleSetting("showMediaQueryInspector");
    this._showMediaInspectorSetting.addChangeListener(this._updateUI, this);
    this._showRulersSetting = WebInspector.settings.moduleSetting("emulation.showRulers");
    this._showRulersSetting.addChangeListener(this._updateUI, this);

    this._topRuler = new WebInspector.DeviceModeView.Ruler(true, this._model.setWidthAndScaleToFit.bind(this._model));
    this._topRuler.element.classList.add("device-mode-ruler-top");
    this._leftRuler = new WebInspector.DeviceModeView.Ruler(false, this._model.setHeightAndScaleToFit.bind(this._model));
    this._leftRuler.element.classList.add("device-mode-ruler-left");
    this._createUI();
    WebInspector.zoomManager.addEventListener(WebInspector.ZoomManager.Events.ZoomChanged, this._zoomChanged, this);
};

WebInspector.DeviceModeView.prototype = {
    _createUI: function()
    {
        this._toolbar = new WebInspector.DeviceModeToolbar(this._model, this._showMediaInspectorSetting, this._showRulersSetting);
        this.contentElement.appendChild(this._toolbar.element());

        this._contentClip = this.contentElement.createChild("div", "device-mode-content-clip vbox");
        this._responsivePresetsContainer = this._contentClip.createChild("div", "device-mode-presets-container");
        this._populatePresetsContainer();
        this._mediaInspectorContainer = this._contentClip.createChild("div", "device-mode-media-container");
        this._contentArea = this._contentClip.createChild("div", "device-mode-content-area");

        this._outlineImage = this._contentArea.createChild("img", "device-mode-outline-image hidden fill");
        this._outlineImage.addEventListener("load", this._onImageLoaded.bind(this, this._outlineImage, true), false);
        this._outlineImage.addEventListener("error", this._onImageLoaded.bind(this, this._outlineImage, false), false);
        this._outlineImage.classList.toggle("device-frame-visible", this._model.deviceOutlineSetting().get());

        this._screenArea = this._contentArea.createChild("div", "device-mode-screen-area");
        this._screenImage = this._screenArea.createChild("img", "device-mode-screen-image hidden");
        this._screenImage.addEventListener("load", this._onImageLoaded.bind(this, this._screenImage, true), false);
        this._screenImage.addEventListener("error", this._onImageLoaded.bind(this, this._screenImage, false), false);

        this._bottomRightResizerElement = this._screenArea.createChild("div", "device-mode-resizer device-mode-bottom-right-resizer");
        this._bottomRightResizerElement.createChild("div", "");
        this._createResizer(this._bottomRightResizerElement, 2, 1);

        this._bottomLeftResizerElement = this._screenArea.createChild("div", "device-mode-resizer device-mode-bottom-left-resizer");
        this._bottomLeftResizerElement.createChild("div", "");
        this._createResizer(this._bottomLeftResizerElement, -2, 1);

        this._rightResizerElement = this._screenArea.createChild("div", "device-mode-resizer device-mode-right-resizer");
        this._rightResizerElement.createChild("div", "");
        this._createResizer(this._rightResizerElement, 2, 0);

        this._leftResizerElement = this._screenArea.createChild("div", "device-mode-resizer device-mode-left-resizer");
        this._leftResizerElement.createChild("div", "");
        this._createResizer(this._leftResizerElement, -2, 0);

        this._bottomResizerElement = this._screenArea.createChild("div", "device-mode-resizer device-mode-bottom-resizer");
        this._bottomResizerElement.createChild("div", "");
        this._createResizer(this._bottomResizerElement, 0, 1);
        this._bottomResizerElement.addEventListener("dblclick", this._model.setHeight.bind(this._model, 0), false);
        this._bottomResizerElement.title = WebInspector.UIString("Double-click for full height");

        this._pageArea = this._screenArea.createChild("div", "device-mode-page-area");
        this._pageArea.createChild("content");
    },

    _populatePresetsContainer: function()
    {
        var sizes = [320, 375, 425, 768, 1024, 1440, 2560];
        var titles = [WebInspector.UIString("Mobile S"),
                      WebInspector.UIString("Mobile M"),
                      WebInspector.UIString("Mobile L"),
                      WebInspector.UIString("Tablet"),
                      WebInspector.UIString("Laptop"),
                      WebInspector.UIString("Laptop L"),
                      WebInspector.UIString("4K")]
        this._presetBlocks = [];
        var inner = this._responsivePresetsContainer.createChild("div", "device-mode-presets-container-inner")
        for (var i = sizes.length - 1; i >= 0; --i) {
            var outer = inner.createChild("div", "fill device-mode-preset-bar-outer");
            var block = outer.createChild("div", "device-mode-preset-bar");
            block.createChild("span").textContent = titles[i] + " \u2013 " + sizes[i] + "px";
            block.addEventListener("click", applySize.bind(this, sizes[i]), false);
            block.__width = sizes[i];
            this._presetBlocks.push(block);
        }

        /**
         * @param {number} width
         * @param {!Event} e
         * @this {WebInspector.DeviceModeView}
         */
        function applySize(width, e)
        {
            this._model.emulate(WebInspector.DeviceModeModel.Type.Responsive, null, null);
            this._model.setSizeAndScaleToFit(width, 0);
            e.consume();
        }
    },

    toggleDeviceMode: function()
    {
        this._toolbar.toggleDeviceMode();
    },

    /**
     * @param {!Element} element
     * @param {number} widthFactor
     * @param {number} heightFactor
     * @return {!WebInspector.ResizerWidget}
     */
    _createResizer: function(element, widthFactor, heightFactor)
    {
        var resizer = new WebInspector.ResizerWidget();
        resizer.addElement(element);
        var cursor = widthFactor ? "ew-resize" : "ns-resize";
        if (widthFactor * heightFactor > 0)
            cursor = "nwse-resize";
        if (widthFactor * heightFactor < 0)
            cursor = "nesw-resize";
        resizer.setCursor(cursor);
        resizer.addEventListener(WebInspector.ResizerWidget.Events.ResizeStart, this._onResizeStart, this);
        resizer.addEventListener(WebInspector.ResizerWidget.Events.ResizeUpdate, this._onResizeUpdate.bind(this, widthFactor, heightFactor));
        resizer.addEventListener(WebInspector.ResizerWidget.Events.ResizeEnd, this._onResizeEnd, this);
        return resizer;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onResizeStart: function(event)
    {
        this._slowPositionStart = null;
        /** @type {!Size} */
        this._resizeStart = this._model.screenRect().size();
    },

    /**
     * @param {number} widthFactor
     * @param {number} heightFactor
     * @param {!WebInspector.Event} event
     */
    _onResizeUpdate: function(widthFactor, heightFactor, event)
    {
        if (event.data.shiftKey !== !!this._slowPositionStart)
            this._slowPositionStart = event.data.shiftKey ? {x: event.data.currentX, y: event.data.currentY} : null;

        var cssOffsetX = event.data.currentX - event.data.startX;
        var cssOffsetY = event.data.currentY - event.data.startY;
        if (this._slowPositionStart) {
            cssOffsetX = (event.data.currentX - this._slowPositionStart.x) / 10 + this._slowPositionStart.x - event.data.startX;
            cssOffsetY = (event.data.currentY - this._slowPositionStart.y) / 10 + this._slowPositionStart.y - event.data.startY;
        }

        if (widthFactor) {
            var dipOffsetX = cssOffsetX * WebInspector.zoomManager.zoomFactor();
            var newWidth = this._resizeStart.width + dipOffsetX * widthFactor;
            newWidth = Math.round(newWidth / this._model.scale());
            if (newWidth >= WebInspector.DeviceModeModel.MinDeviceSize && newWidth <= WebInspector.DeviceModeModel.MaxDeviceSize)
                this._model.setWidth(newWidth);
        }

        if (heightFactor) {
            var dipOffsetY = cssOffsetY * WebInspector.zoomManager.zoomFactor();
            var newHeight = this._resizeStart.height + dipOffsetY * heightFactor;
            newHeight = Math.round(newHeight / this._model.scale());
            if (newHeight >= WebInspector.DeviceModeModel.MinDeviceSize && newHeight <= WebInspector.DeviceModeModel.MaxDeviceSize)
                this._model.setHeight(newHeight);
        }
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onResizeEnd: function(event)
    {
        delete this._resizeStart;
        WebInspector.userMetrics.actionTaken(WebInspector.UserMetrics.Action.ResizedViewInResponsiveMode);
    },

    _updateUI: function()
    {
        /**
         * @param {!Element} element
         * @param {!WebInspector.Rect} rect
         */
        function applyRect(element, rect)
        {
            element.style.left = rect.left + "px";
            element.style.top = rect.top + "px";
            element.style.width = rect.width + "px";
            element.style.height = rect.height + "px";
        }

        if (!this.isShowing())
            return;

        var zoomFactor = WebInspector.zoomManager.zoomFactor();
        var callDoResize = false;
        var showRulers = this._showRulersSetting.get() && !this._model.deviceOutlineSetting().get() && this._model.type() !== WebInspector.DeviceModeModel.Type.None;
        var contentAreaResized = false;
        var updateRulers = false;

        var cssScreenRect = this._model.screenRect().scale(1 / zoomFactor);
        if (!cssScreenRect.isEqual(this._cachedCssScreenRect)) {
            applyRect(this._screenArea, cssScreenRect);
            this._leftRuler.element.style.left = cssScreenRect.left + "px";
            updateRulers = true;
            callDoResize = true;
            this._cachedCssScreenRect = cssScreenRect;
        }

        var cssVisiblePageRect = this._model.visiblePageRect().scale(1 / zoomFactor);
        if (!cssVisiblePageRect.isEqual(this._cachedCssVisiblePageRect)) {
            applyRect(this._pageArea, cssVisiblePageRect);
            callDoResize = true;
            this._cachedCssVisiblePageRect = cssVisiblePageRect;
        }

        var outlineRect = this._model.outlineRect().scale(1 / zoomFactor);
        if (!outlineRect.isEqual(this._cachedOutlineRect)) {
            applyRect(this._outlineImage, outlineRect);
            callDoResize = true;
            this._cachedOutlineRect = outlineRect;
        }
        this._outlineImage.classList.toggle("device-frame-visible", (this._model.deviceOutlineSetting().get() && this._model.outlineImage()));

        var resizable = this._model.type() === WebInspector.DeviceModeModel.Type.Responsive;
        if (resizable !== this._cachedResizable) {
            this._rightResizerElement.classList.toggle("hidden", !resizable);
            this._leftResizerElement.classList.toggle("hidden", !resizable);
            this._bottomResizerElement.classList.toggle("hidden", !resizable);
            this._bottomRightResizerElement.classList.toggle("hidden", !resizable);
            this._bottomLeftResizerElement.classList.toggle("hidden", !resizable);
            this._cachedResizable = resizable;
        }

        var mediaInspectorVisible = this._showMediaInspectorSetting.get() && this._model.type() !== WebInspector.DeviceModeModel.Type.None;
        if (mediaInspectorVisible !== this._cachedMediaInspectorVisible) {
            if (mediaInspectorVisible)
                this._mediaInspector.show(this._mediaInspectorContainer);
            else
                this._mediaInspector.detach();
            contentAreaResized = true;
            callDoResize = true;
            this._cachedMediaInspectorVisible = mediaInspectorVisible;
        }

        if (showRulers !== this._cachedShowRulers) {
            this._contentClip.classList.toggle("device-mode-rulers-visible", showRulers);
            if (showRulers) {
                this._topRuler.show(this._contentArea);
                this._leftRuler.show(this._contentArea);
            } else {
                this._topRuler.detach();
                this._leftRuler.detach();
            }
            contentAreaResized = true;
            callDoResize = true;
            this._cachedShowRulers = showRulers;
        }

        if (this._model.scale() !== this._cachedScale) {
            updateRulers = true;
            callDoResize = true;
            for (var block of this._presetBlocks)
                block.style.width = block.__width * this._model.scale() + "px";
            this._cachedScale = this._model.scale();
        }

        this._toolbar.update();
        this._loadImage(this._screenImage, this._model.screenImage());
        this._loadImage(this._outlineImage, this._model.outlineImage());
        this._mediaInspector.setAxisTransform(this._model.scale());
        if (callDoResize)
            this.doResize();
        if (updateRulers) {
            this._topRuler.render(this._cachedCssScreenRect ? this._cachedCssScreenRect.left : 0, this._model.scale());
            this._leftRuler.render(0, this._model.scale());
            this._topRuler.element.style.top = this._cachedCssScreenRect ? this._cachedCssScreenRect.top + "px" : "0";
            this._leftRuler.element.style.top = this._cachedCssScreenRect ? this._cachedCssScreenRect.top + "px" : "0";
        }
        if (contentAreaResized)
            this._contentAreaResized();
    },

    /**
     * @param {!Element} element
     * @param {string} srcset
     */
    _loadImage: function(element, srcset)
    {
        if (element.getAttribute("srcset") === srcset)
            return;
        element.setAttribute("srcset", srcset);
        if (!srcset)
            element.classList.toggle("hidden", true);
    },

    /**
     * @param {!Element} element
     * @param {boolean} success
     */
    _onImageLoaded: function(element, success)
    {
        element.classList.toggle("hidden", !success);
    },

    _contentAreaResized: function()
    {
        var zoomFactor = WebInspector.zoomManager.zoomFactor();
        var rect = this._contentArea.getBoundingClientRect();
        var availableSize = new Size(Math.max(rect.width * zoomFactor, 1), Math.max(rect.height * zoomFactor, 1));
        var preferredSize = new Size(Math.max((rect.width - 2 * this._handleWidth) * zoomFactor, 1), Math.max((rect.height - this._handleHeight) * zoomFactor, 1));
        this._model.setAvailableSize(availableSize, preferredSize);
    },

    _measureHandles: function()
    {
        var hidden = this._rightResizerElement.classList.contains("hidden");
        this._rightResizerElement.classList.toggle("hidden", false);
        this._bottomResizerElement.classList.toggle("hidden", false);
        this._handleWidth = this._rightResizerElement.offsetWidth;
        this._handleHeight = this._bottomResizerElement.offsetHeight;
        this._rightResizerElement.classList.toggle("hidden", hidden);
        this._bottomResizerElement.classList.toggle("hidden", hidden);
    },

    _zoomChanged: function()
    {
        delete this._handleWidth;
        delete this._handleHeight;
        if (this.isShowing()) {
            this._measureHandles();
            this._contentAreaResized();
        }
    },

    /**
     * @override
     */
    onResize: function()
    {
        if (this.isShowing())
            this._contentAreaResized();
    },

    /**
     * @override
     */
    wasShown: function()
    {
        this._measureHandles();
        this._toolbar.restore();
    },

    /**
     * @override
     */
    willHide: function()
    {
        this._model.emulate(WebInspector.DeviceModeModel.Type.None, null, null);
    },

    captureScreenshot: function()
    {
        var mainTarget = WebInspector.targetManager.mainTarget();
        if (!mainTarget)
            return;
        WebInspector.DOMModel.muteHighlight();

        var zoomFactor = WebInspector.zoomManager.zoomFactor();
        var rect = this._contentArea.getBoundingClientRect();
        var availableSize = new Size(Math.max(rect.width * zoomFactor, 1), Math.max(rect.height * zoomFactor, 1));

        if (availableSize.width < this._model.screenRect().width ||
            availableSize.height < this._model.screenRect().height) {
            WebInspector.inspectorView.minimize();
        }

        mainTarget.pageAgent().captureScreenshot(screenshotCaptured.bind(this));

        /**
         * @param {?Protocol.Error} error
         * @param {string} content
         * @this {WebInspector.DeviceModeView}
         */
        function screenshotCaptured(error, content)
        {
            if (error) {
                WebInspector.DOMModel.unmuteHighlight();
                WebInspector.inspectorView.restore();
                return;
            }

            // Create a canvas to splice the images together.
            var canvas = createElement("canvas");
            var ctx = canvas.getContext("2d");
            var screenRect = this._model.screenRect();
            var dpr = window.devicePixelRatio;
            canvas.width = screenRect.width * dpr;
            canvas.height = screenRect.height * dpr;
            // Add any available screen images.
            if (this._model.screenImage()) {
                var screenImage = new Image();
                screenImage.crossOrigin = "Anonymous";
                screenImage.srcset = this._model.screenImage();
                screenImage.onload = onImageLoad.bind(this);
                screenImage.onerror = paintScreenshot.bind(this);
            } else {
                paintScreenshot.call(this);
            }

            /**
             * @this {WebInspector.DeviceModeView}
             */
            function onImageLoad()
            {
                ctx.drawImage(screenImage, 0, 0, screenRect.width * dpr, screenRect.height * dpr);
                paintScreenshot.call(this);
            }

            /**
             * @this {WebInspector.DeviceModeView}
             */
            function paintScreenshot()
            {
                var pageImage = new Image();
                pageImage.src = "data:image/png;base64," + content;
                var visiblePageRect = this._model.visiblePageRect().scale(dpr);
                ctx.drawImage(pageImage,
                              visiblePageRect.left,
                              visiblePageRect.top,
                              visiblePageRect.width,
                              visiblePageRect.height);
                var mainFrame = mainTarget.resourceTreeModel.mainFrame;
                var fileName = mainFrame ? mainFrame.url.trimURL().removeURLFragment() : "";
                if (this._model.type() === WebInspector.DeviceModeModel.Type.Device)
                    fileName += WebInspector.UIString("(%s)", this._model.device().title);
                // Trigger download.
                var link = createElement("a");
                link.download = fileName + ".png";
                link.href = canvas.toDataURL("image/png");
                link.click();
                WebInspector.DOMModel.unmuteHighlight();
                WebInspector.inspectorView.restore();
            }
        }
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @param {boolean} horizontal
 * @param {function(number)} applyCallback
 */
WebInspector.DeviceModeView.Ruler = function(horizontal, applyCallback)
{
    WebInspector.VBox.call(this);
    this._contentElement = this.element.createChild("div", "device-mode-ruler flex-auto");
    this._horizontal = horizontal;
    this._scale = 1;
    this._offset = 0;
    this._count = 0;
    this._throttler = new WebInspector.Throttler(0);
    this._applyCallback = applyCallback;
}

WebInspector.DeviceModeView.Ruler.prototype = {
    /**
     * @param {number} offset
     * @param {number} scale
     */
    render: function(offset, scale)
    {
        this._scale = scale;
        this._offset = offset;
        if (this._horizontal)
            this.element.style.paddingLeft = this._offset + "px";
        else
            this.element.style.paddingTop = this._offset + "px";
        this._throttler.schedule(this._update.bind(this));
    },

    /**
     * @override
     */
    onResize: function()
    {
        this._throttler.schedule(this._update.bind(this));
    },

    /**
     * @return {!Promise.<?>}
     */
    _update: function()
    {
        var zoomFactor = WebInspector.zoomManager.zoomFactor();
        var size = this._horizontal ? this._contentElement.offsetWidth : this._contentElement.offsetHeight;

        if (this._scale !== this._renderedScale || zoomFactor !== this._renderedZoomFactor) {
            this._contentElement.removeChildren();
            this._count = 0;
            this._renderedScale = this._scale;
            this._renderedZoomFactor = zoomFactor;
        }

        var dipSize = size * zoomFactor / this._scale;
        var count = Math.ceil(dipSize / 5);
        var step = 1;
        if (this._scale < 0.8)
            step = 2;
        if (this._scale < 0.6)
            step = 4;
        if (this._scale < 0.4)
            step = 8;

        for (var i = count; i < this._count; i++) {
            if (!(i % step))
                this._contentElement.lastChild.remove();
        }

        for (var i = this._count; i < count; i++) {
            if (i % step)
                continue;
            var marker = this._contentElement.createChild("div", "device-mode-ruler-marker");
            if (i) {
                if (this._horizontal)
                    marker.style.left = (5 * i) * this._scale / zoomFactor + "px";
                else
                    marker.style.top = (5 * i) * this._scale / zoomFactor + "px";
                if (!(i % 20)) {
                    var text = marker.createChild("div", "device-mode-ruler-text");
                    text.textContent = i * 5;
                    text.addEventListener("click", this._onMarkerClick.bind(this, i * 5), false);
                }
            }
            if (!(i % 10))
                marker.classList.add("device-mode-ruler-marker-large");
            else if (!(i % 5))
                marker.classList.add("device-mode-ruler-marker-medium");
        }

        this._count = count;
        return Promise.resolve();
    },

    /**
     * @param {number} size
     */
    _onMarkerClick: function(size)
    {
        this._applyCallback.call(null, size);
    },

    __proto__: WebInspector.VBox.prototype
}
