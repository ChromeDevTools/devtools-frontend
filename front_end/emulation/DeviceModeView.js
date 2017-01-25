// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
Emulation.DeviceModeView = class extends UI.VBox {
  constructor() {
    super(true);
    this.setMinimumSize(150, 150);
    this.element.classList.add('device-mode-view');
    this.registerRequiredCSS('emulation/deviceModeView.css');
    UI.Tooltip.addNativeOverrideContainer(this.contentElement);

    this._model = new Emulation.DeviceModeModel(this._updateUI.bind(this));
    this._mediaInspector = new Emulation.MediaQueryInspector(
        () => this._model.appliedDeviceSize().width, this._model.setWidth.bind(this._model));
    this._showMediaInspectorSetting = Common.settings.moduleSetting('showMediaQueryInspector');
    this._showMediaInspectorSetting.addChangeListener(this._updateUI, this);
    this._showRulersSetting = Common.settings.moduleSetting('emulation.showRulers');
    this._showRulersSetting.addChangeListener(this._updateUI, this);

    this._topRuler = new Emulation.DeviceModeView.Ruler(true, this._model.setWidthAndScaleToFit.bind(this._model));
    this._topRuler.element.classList.add('device-mode-ruler-top');
    this._leftRuler = new Emulation.DeviceModeView.Ruler(false, this._model.setHeightAndScaleToFit.bind(this._model));
    this._leftRuler.element.classList.add('device-mode-ruler-left');
    this._createUI();
    UI.zoomManager.addEventListener(UI.ZoomManager.Events.ZoomChanged, this._zoomChanged, this);
  }

  _createUI() {
    this._toolbar =
        new Emulation.DeviceModeToolbar(this._model, this._showMediaInspectorSetting, this._showRulersSetting);
    this.contentElement.appendChild(this._toolbar.element());

    this._contentClip = this.contentElement.createChild('div', 'device-mode-content-clip vbox');
    this._responsivePresetsContainer = this._contentClip.createChild('div', 'device-mode-presets-container');
    this._populatePresetsContainer();
    this._mediaInspectorContainer = this._contentClip.createChild('div', 'device-mode-media-container');
    this._contentArea = this._contentClip.createChild('div', 'device-mode-content-area');

    this._outlineImage = this._contentArea.createChild('img', 'device-mode-outline-image hidden fill');
    this._outlineImage.addEventListener('load', this._onImageLoaded.bind(this, this._outlineImage, true), false);
    this._outlineImage.addEventListener('error', this._onImageLoaded.bind(this, this._outlineImage, false), false);

    this._screenArea = this._contentArea.createChild('div', 'device-mode-screen-area');
    this._screenImage = this._screenArea.createChild('img', 'device-mode-screen-image hidden');
    this._screenImage.addEventListener('load', this._onImageLoaded.bind(this, this._screenImage, true), false);
    this._screenImage.addEventListener('error', this._onImageLoaded.bind(this, this._screenImage, false), false);

    this._bottomRightResizerElement =
        this._screenArea.createChild('div', 'device-mode-resizer device-mode-bottom-right-resizer');
    this._bottomRightResizerElement.createChild('div', '');
    this._createResizer(this._bottomRightResizerElement, 2, 1);

    this._bottomLeftResizerElement =
        this._screenArea.createChild('div', 'device-mode-resizer device-mode-bottom-left-resizer');
    this._bottomLeftResizerElement.createChild('div', '');
    this._createResizer(this._bottomLeftResizerElement, -2, 1);

    this._rightResizerElement = this._screenArea.createChild('div', 'device-mode-resizer device-mode-right-resizer');
    this._rightResizerElement.createChild('div', '');
    this._createResizer(this._rightResizerElement, 2, 0);

    this._leftResizerElement = this._screenArea.createChild('div', 'device-mode-resizer device-mode-left-resizer');
    this._leftResizerElement.createChild('div', '');
    this._createResizer(this._leftResizerElement, -2, 0);

    this._bottomResizerElement = this._screenArea.createChild('div', 'device-mode-resizer device-mode-bottom-resizer');
    this._bottomResizerElement.createChild('div', '');
    this._createResizer(this._bottomResizerElement, 0, 1);
    this._bottomResizerElement.addEventListener('dblclick', this._model.setHeight.bind(this._model, 0), false);
    this._bottomResizerElement.title = Common.UIString('Double-click for full height');

    this._pageArea = this._screenArea.createChild('div', 'device-mode-page-area');
    this._pageArea.createChild('content');
  }

  _populatePresetsContainer() {
    var sizes = [320, 375, 425, 768, 1024, 1440, 2560];
    var titles = [
      Common.UIString('Mobile S'), Common.UIString('Mobile M'), Common.UIString('Mobile L'), Common.UIString('Tablet'),
      Common.UIString('Laptop'), Common.UIString('Laptop L'), Common.UIString('4K')
    ];
    this._presetBlocks = [];
    var inner = this._responsivePresetsContainer.createChild('div', 'device-mode-presets-container-inner');
    for (var i = sizes.length - 1; i >= 0; --i) {
      var outer = inner.createChild('div', 'fill device-mode-preset-bar-outer');
      var block = outer.createChild('div', 'device-mode-preset-bar');
      block.createChild('span').textContent = titles[i] + ' \u2013 ' + sizes[i] + 'px';
      block.addEventListener('click', applySize.bind(this, sizes[i]), false);
      block.__width = sizes[i];
      this._presetBlocks.push(block);
    }

    /**
     * @param {number} width
     * @param {!Event} e
     * @this {Emulation.DeviceModeView}
     */
    function applySize(width, e) {
      this._model.emulate(Emulation.DeviceModeModel.Type.Responsive, null, null);
      this._model.setSizeAndScaleToFit(width, 0);
      e.consume();
    }
  }

  /**
   * @param {!Element} element
   * @param {number} widthFactor
   * @param {number} heightFactor
   * @return {!UI.ResizerWidget}
   */
  _createResizer(element, widthFactor, heightFactor) {
    var resizer = new UI.ResizerWidget();
    resizer.addElement(element);
    var cursor = widthFactor ? 'ew-resize' : 'ns-resize';
    if (widthFactor * heightFactor > 0)
      cursor = 'nwse-resize';
    if (widthFactor * heightFactor < 0)
      cursor = 'nesw-resize';
    resizer.setCursor(cursor);
    resizer.addEventListener(UI.ResizerWidget.Events.ResizeStart, this._onResizeStart, this);
    resizer.addEventListener(
        UI.ResizerWidget.Events.ResizeUpdate, this._onResizeUpdate.bind(this, widthFactor, heightFactor));
    resizer.addEventListener(UI.ResizerWidget.Events.ResizeEnd, this._onResizeEnd, this);
    return resizer;
  }

  /**
   * @param {!Common.Event} event
   */
  _onResizeStart(event) {
    this._slowPositionStart = null;
    /** @type {!UI.Size} */
    this._resizeStart = this._model.screenRect().size();
  }

  /**
   * @param {number} widthFactor
   * @param {number} heightFactor
   * @param {!Common.Event} event
   */
  _onResizeUpdate(widthFactor, heightFactor, event) {
    if (event.data.shiftKey !== !!this._slowPositionStart)
      this._slowPositionStart = event.data.shiftKey ? {x: event.data.currentX, y: event.data.currentY} : null;

    var cssOffsetX = event.data.currentX - event.data.startX;
    var cssOffsetY = event.data.currentY - event.data.startY;
    if (this._slowPositionStart) {
      cssOffsetX =
          (event.data.currentX - this._slowPositionStart.x) / 10 + this._slowPositionStart.x - event.data.startX;
      cssOffsetY =
          (event.data.currentY - this._slowPositionStart.y) / 10 + this._slowPositionStart.y - event.data.startY;
    }

    if (widthFactor) {
      var dipOffsetX = cssOffsetX * UI.zoomManager.zoomFactor();
      var newWidth = this._resizeStart.width + dipOffsetX * widthFactor;
      newWidth = Math.round(newWidth / this._model.scale());
      if (newWidth >= Emulation.DeviceModeModel.MinDeviceSize && newWidth <= Emulation.DeviceModeModel.MaxDeviceSize)
        this._model.setWidth(newWidth);
    }

    if (heightFactor) {
      var dipOffsetY = cssOffsetY * UI.zoomManager.zoomFactor();
      var newHeight = this._resizeStart.height + dipOffsetY * heightFactor;
      newHeight = Math.round(newHeight / this._model.scale());
      if (newHeight >= Emulation.DeviceModeModel.MinDeviceSize && newHeight <= Emulation.DeviceModeModel.MaxDeviceSize)
        this._model.setHeight(newHeight);
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _onResizeEnd(event) {
    delete this._resizeStart;
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.ResizedViewInResponsiveMode);
  }

  _updateUI() {
    /**
     * @param {!Element} element
     * @param {!UI.Rect} rect
     */
    function applyRect(element, rect) {
      element.style.left = rect.left + 'px';
      element.style.top = rect.top + 'px';
      element.style.width = rect.width + 'px';
      element.style.height = rect.height + 'px';
    }

    if (!this.isShowing())
      return;

    var zoomFactor = UI.zoomManager.zoomFactor();
    var callDoResize = false;
    var showRulers = this._showRulersSetting.get() && this._model.type() !== Emulation.DeviceModeModel.Type.None;
    var contentAreaResized = false;
    var updateRulers = false;

    var cssScreenRect = this._model.screenRect().scale(1 / zoomFactor);
    if (!cssScreenRect.isEqual(this._cachedCssScreenRect)) {
      applyRect(this._screenArea, cssScreenRect);
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
    this._contentClip.classList.toggle('device-mode-outline-visible', !!this._model.outlineImage());

    var resizable = this._model.type() === Emulation.DeviceModeModel.Type.Responsive;
    if (resizable !== this._cachedResizable) {
      this._rightResizerElement.classList.toggle('hidden', !resizable);
      this._leftResizerElement.classList.toggle('hidden', !resizable);
      this._bottomResizerElement.classList.toggle('hidden', !resizable);
      this._bottomRightResizerElement.classList.toggle('hidden', !resizable);
      this._bottomLeftResizerElement.classList.toggle('hidden', !resizable);
      this._cachedResizable = resizable;
    }

    var mediaInspectorVisible =
        this._showMediaInspectorSetting.get() && this._model.type() !== Emulation.DeviceModeModel.Type.None;
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
      this._contentClip.classList.toggle('device-mode-rulers-visible', showRulers);
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
        block.style.width = block.__width * this._model.scale() + 'px';
      this._cachedScale = this._model.scale();
    }

    this._toolbar.update();
    this._loadImage(this._screenImage, this._model.screenImage());
    this._loadImage(this._outlineImage, this._model.outlineImage());
    this._mediaInspector.setAxisTransform(this._model.scale());
    if (callDoResize)
      this.doResize();
    if (updateRulers) {
      this._topRuler.render(this._model.scale());
      this._leftRuler.render(this._model.scale());
      this._topRuler.element.positionAt(
          this._cachedCssScreenRect ? this._cachedCssScreenRect.left : 0,
          this._cachedCssScreenRect ? this._cachedCssScreenRect.top : 0);
      this._leftRuler.element.positionAt(
          this._cachedCssScreenRect ? this._cachedCssScreenRect.left : 0,
          this._cachedCssScreenRect ? this._cachedCssScreenRect.top : 0);
    }
    if (contentAreaResized)
      this._contentAreaResized();
  }

  /**
   * @param {!Element} element
   * @param {string} srcset
   */
  _loadImage(element, srcset) {
    if (element.getAttribute('srcset') === srcset)
      return;
    element.setAttribute('srcset', srcset);
    if (!srcset)
      element.classList.toggle('hidden', true);
  }

  /**
   * @param {!Element} element
   * @param {boolean} success
   */
  _onImageLoaded(element, success) {
    element.classList.toggle('hidden', !success);
  }

  _contentAreaResized() {
    var zoomFactor = UI.zoomManager.zoomFactor();
    var rect = this._contentArea.getBoundingClientRect();
    var availableSize = new UI.Size(Math.max(rect.width * zoomFactor, 1), Math.max(rect.height * zoomFactor, 1));
    var preferredSize = new UI.Size(
        Math.max((rect.width - 2 * this._handleWidth) * zoomFactor, 1),
        Math.max((rect.height - this._handleHeight) * zoomFactor, 1));
    this._model.setAvailableSize(availableSize, preferredSize);
  }

  _measureHandles() {
    var hidden = this._rightResizerElement.classList.contains('hidden');
    this._rightResizerElement.classList.toggle('hidden', false);
    this._bottomResizerElement.classList.toggle('hidden', false);
    this._handleWidth = this._rightResizerElement.offsetWidth;
    this._handleHeight = this._bottomResizerElement.offsetHeight;
    this._rightResizerElement.classList.toggle('hidden', hidden);
    this._bottomResizerElement.classList.toggle('hidden', hidden);
  }

  _zoomChanged() {
    delete this._handleWidth;
    delete this._handleHeight;
    if (this.isShowing()) {
      this._measureHandles();
      this._contentAreaResized();
    }
  }

  /**
   * @override
   */
  onResize() {
    if (this.isShowing())
      this._contentAreaResized();
  }

  /**
   * @override
   */
  wasShown() {
    this._measureHandles();
    this._toolbar.restore();
  }

  /**
   * @override
   */
  willHide() {
    this._model.emulate(Emulation.DeviceModeModel.Type.None, null, null);
  }

  captureScreenshot() {
    var mainTarget = SDK.targetManager.mainTarget();
    if (!mainTarget)
      return;
    SDK.DOMModel.muteHighlight();

    var zoomFactor = UI.zoomManager.zoomFactor();
    var rect = this._contentArea.getBoundingClientRect();
    var availableSize = new UI.Size(Math.max(rect.width * zoomFactor, 1), Math.max(rect.height * zoomFactor, 1));
    var outlineVisible = this._model.deviceOutlineSetting().get();

    if (availableSize.width < this._model.screenRect().width ||
        availableSize.height < this._model.screenRect().height) {
      UI.inspectorView.minimize();
      this._model.deviceOutlineSetting().set(false);
    }

    mainTarget.pageAgent().captureScreenshot(screenshotCaptured.bind(this));

    /**
     * @param {?Protocol.Error} error
     * @param {string} content
     * @this {Emulation.DeviceModeView}
     */
    function screenshotCaptured(error, content) {
      this._model.deviceOutlineSetting().set(outlineVisible);
      var dpr = window.devicePixelRatio;
      var outlineRect = this._model.outlineRect().scale(dpr);
      var screenRect = this._model.screenRect().scale(dpr);
      screenRect.left -= outlineRect.left;
      screenRect.top -= outlineRect.top;
      var visiblePageRect = this._model.visiblePageRect().scale(dpr);
      visiblePageRect.left += screenRect.left;
      visiblePageRect.top += screenRect.top;
      outlineRect.left = 0;
      outlineRect.top = 0;

      SDK.DOMModel.unmuteHighlight();
      UI.inspectorView.restore();

      if (error) {
        console.error(error);
        return;
      }

      // Create a canvas to splice the images together.
      var canvas = createElement('canvas');
      var ctx = canvas.getContext('2d');
      canvas.width = outlineRect.width;
      canvas.height = outlineRect.height;
      ctx.imageSmoothingEnabled = false;

      var promise = Promise.resolve();
      if (this._model.outlineImage())
        promise = promise.then(paintImage.bind(null, this._model.outlineImage(), outlineRect));
      promise = promise.then(drawBorder);
      if (this._model.screenImage())
        promise = promise.then(paintImage.bind(null, this._model.screenImage(), screenRect));
      promise.then(paintScreenshot.bind(this));

      /**
       * @param {string} src
       * @param {!UI.Rect} rect
       * @return {!Promise<undefined>}
       */
      function paintImage(src, rect) {
        var callback;
        var promise = new Promise(fulfill => callback = fulfill);
        var image = new Image();
        image.crossOrigin = 'Anonymous';
        image.srcset = src;
        image.onload = onImageLoad;
        image.onerror = callback;
        return promise;

        function onImageLoad() {
          ctx.drawImage(image, rect.left, rect.top, rect.width, rect.height);
          callback();
        }
      }

      function drawBorder() {
        ctx.strokeStyle = 'hsla(0, 0%, 98%, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([10, 10]);
        ctx.strokeRect(screenRect.left + 1, screenRect.top + 1, screenRect.width - 2, screenRect.height - 2);
      }

      /**
       * @this {Emulation.DeviceModeView}
       */
      function paintScreenshot() {
        var pageImage = new Image();
        pageImage.src = 'data:image/png;base64,' + content;
        pageImage.onload = () => {
          ctx.drawImage(
              pageImage, visiblePageRect.left, visiblePageRect.top, Math.min(pageImage.naturalWidth, screenRect.width),
              Math.min(pageImage.naturalHeight, screenRect.height));
          var url = mainTarget && mainTarget.inspectedURL();
          var fileName = url ? url.trimURL().removeURLFragment() : '';
          if (this._model.type() === Emulation.DeviceModeModel.Type.Device)
            fileName += Common.UIString('(%s)', this._model.device().title);
          // Trigger download.
          var link = createElement('a');
          link.download = fileName + '.png';
          link.href = canvas.toDataURL('image/png');
          link.click();
        };
      }
    }
  }
};

/**
 * @unrestricted
 */
Emulation.DeviceModeView.Ruler = class extends UI.VBox {
  /**
   * @param {boolean} horizontal
   * @param {function(number)} applyCallback
   */
  constructor(horizontal, applyCallback) {
    super();
    this.element.classList.add('device-mode-ruler');
    this._contentElement =
        this.element.createChild('div', 'device-mode-ruler-content').createChild('div', 'device-mode-ruler-inner');
    this._horizontal = horizontal;
    this._scale = 1;
    this._count = 0;
    this._throttler = new Common.Throttler(0);
    this._applyCallback = applyCallback;
  }

  /**
   * @param {number} scale
   */
  render(scale) {
    this._scale = scale;
    this._throttler.schedule(this._update.bind(this));
  }

  /**
   * @override
   */
  onResize() {
    this._throttler.schedule(this._update.bind(this));
  }

  /**
   * @return {!Promise.<?>}
   */
  _update() {
    var zoomFactor = UI.zoomManager.zoomFactor();
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
    if (this._scale < 0.2)
      step = 16;
    if (this._scale < 0.1)
      step = 32;

    for (var i = count; i < this._count; i++) {
      if (!(i % step))
        this._contentElement.lastChild.remove();
    }

    for (var i = this._count; i < count; i++) {
      if (i % step)
        continue;
      var marker = this._contentElement.createChild('div', 'device-mode-ruler-marker');
      if (i) {
        if (this._horizontal)
          marker.style.left = (5 * i) * this._scale / zoomFactor + 'px';
        else
          marker.style.top = (5 * i) * this._scale / zoomFactor + 'px';
        if (!(i % 20)) {
          var text = marker.createChild('div', 'device-mode-ruler-text');
          text.textContent = i * 5;
          text.addEventListener('click', this._onMarkerClick.bind(this, i * 5), false);
        }
      }
      if (!(i % 10))
        marker.classList.add('device-mode-ruler-marker-large');
      else if (!(i % 5))
        marker.classList.add('device-mode-ruler-marker-medium');
    }

    this._count = count;
    return Promise.resolve();
  }

  /**
   * @param {number} size
   */
  _onMarkerClick(size) {
    this._applyCallback.call(null, size);
  }
};
