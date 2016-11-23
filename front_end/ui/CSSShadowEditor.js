// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
UI.CSSShadowEditor = class extends UI.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('ui/cssShadowEditor.css');
    this.contentElement.tabIndex = 0;

    this._typeField = this.contentElement.createChild('div', 'shadow-editor-field');
    this._typeField.createChild('label', 'shadow-editor-label').textContent = Common.UIString('Type');
    this._outsetButton = this._typeField.createChild('button', 'shadow-editor-button-left');
    this._outsetButton.textContent = Common.UIString('Outset');
    this._outsetButton.addEventListener('click', this._onButtonClick.bind(this), false);
    this._insetButton = this._typeField.createChild('button', 'shadow-editor-button-right');
    this._insetButton.textContent = Common.UIString('Inset');
    this._insetButton.addEventListener('click', this._onButtonClick.bind(this), false);

    var xField = this.contentElement.createChild('div', 'shadow-editor-field');
    this._xInput = this._createTextInput(xField, Common.UIString('X offset'));
    var yField = this.contentElement.createChild('div', 'shadow-editor-field');
    this._yInput = this._createTextInput(yField, Common.UIString('Y offset'));
    this._xySlider = xField.createChild('canvas', 'shadow-editor-2D-slider');
    this._xySlider.width = UI.CSSShadowEditor.canvasSize;
    this._xySlider.height = UI.CSSShadowEditor.canvasSize;
    this._xySlider.tabIndex = -1;
    this._halfCanvasSize = UI.CSSShadowEditor.canvasSize / 2;
    this._innerCanvasSize = this._halfCanvasSize - UI.CSSShadowEditor.sliderThumbRadius;
    UI.installDragHandle(this._xySlider, this._dragStart.bind(this), this._dragMove.bind(this), null, 'default');
    this._xySlider.addEventListener('keydown', this._onCanvasArrowKey.bind(this), false);
    this._xySlider.addEventListener('blur', this._onCanvasBlur.bind(this), false);

    var blurField = this.contentElement.createChild('div', 'shadow-editor-blur-field');
    this._blurInput = this._createTextInput(blurField, Common.UIString('Blur'));
    this._blurSlider = this._createSlider(blurField);

    this._spreadField = this.contentElement.createChild('div', 'shadow-editor-field');
    this._spreadInput = this._createTextInput(this._spreadField, Common.UIString('Spread'));
    this._spreadSlider = this._createSlider(this._spreadField);
  }

  /**
   * @param {!Element} field
   * @param {string} propertyName
   * @return {!Element}
   */
  _createTextInput(field, propertyName) {
    var label = field.createChild('label', 'shadow-editor-label');
    label.textContent = propertyName;
    label.setAttribute('for', propertyName);
    var textInput = field.createChild('input', 'shadow-editor-text-input');
    textInput.type = 'text';
    textInput.id = propertyName;
    textInput.addEventListener('keydown', this._handleValueModification.bind(this), false);
    textInput.addEventListener('mousewheel', this._handleValueModification.bind(this), false);
    textInput.addEventListener('input', this._onTextInput.bind(this), false);
    textInput.addEventListener('blur', this._onTextBlur.bind(this), false);
    return textInput;
  }

  /**
   * @param {!Element} field
   * @return {!Element}
   */
  _createSlider(field) {
    var slider = createSliderLabel(0, UI.CSSShadowEditor.maxRange, -1);
    slider.addEventListener('input', this._onSliderInput.bind(this), false);
    field.appendChild(slider);
    return slider;
  }

  /**
   * @override
   */
  wasShown() {
    this._updateUI();
  }

  /**
   * @param {!Common.CSSShadowModel} model
   */
  setModel(model) {
    this._model = model;
    this._typeField.hidden = !model.isBoxShadow();
    this._spreadField.hidden = !model.isBoxShadow();
    this._updateUI();
  }

  _updateUI() {
    this._updateButtons();
    this._xInput.value = this._model.offsetX().asCSSText();
    this._yInput.value = this._model.offsetY().asCSSText();
    this._blurInput.value = this._model.blurRadius().asCSSText();
    this._spreadInput.value = this._model.spreadRadius().asCSSText();
    this._blurSlider.value = this._model.blurRadius().amount;
    this._spreadSlider.value = this._model.spreadRadius().amount;
    this._updateCanvas(false);
  }

  _updateButtons() {
    this._insetButton.classList.toggle('enabled', this._model.inset());
    this._outsetButton.classList.toggle('enabled', !this._model.inset());
  }

  /**
   * @param {boolean} drawFocus
   */
  _updateCanvas(drawFocus) {
    var context = this._xySlider.getContext('2d');
    context.clearRect(0, 0, this._xySlider.width, this._xySlider.height);

    // Draw dashed axes.
    context.save();
    context.setLineDash([1, 1]);
    context.strokeStyle = 'rgba(210, 210, 210, 0.8)';
    context.beginPath();
    context.moveTo(this._halfCanvasSize, 0);
    context.lineTo(this._halfCanvasSize, UI.CSSShadowEditor.canvasSize);
    context.moveTo(0, this._halfCanvasSize);
    context.lineTo(UI.CSSShadowEditor.canvasSize, this._halfCanvasSize);
    context.stroke();
    context.restore();

    var thumbPoint = this._sliderThumbPosition();
    // Draw 2D slider line.
    context.save();
    context.translate(this._halfCanvasSize, this._halfCanvasSize);
    context.lineWidth = 2;
    context.strokeStyle = 'rgba(130, 130, 130, 0.75)';
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(thumbPoint.x, thumbPoint.y);
    context.stroke();
    // Draw 2D slider thumb.
    if (drawFocus) {
      context.beginPath();
      context.fillStyle = 'rgba(66, 133, 244, 0.4)';
      context.arc(thumbPoint.x, thumbPoint.y, UI.CSSShadowEditor.sliderThumbRadius + 2, 0, 2 * Math.PI);
      context.fill();
    }
    context.beginPath();
    context.fillStyle = '#4285F4';
    context.arc(thumbPoint.x, thumbPoint.y, UI.CSSShadowEditor.sliderThumbRadius, 0, 2 * Math.PI);
    context.fill();
    context.restore();
  }

  /**
   * @param {!Event} event
   */
  _onButtonClick(event) {
    var insetClicked = (event.currentTarget === this._insetButton);
    if (insetClicked && this._model.inset() || !insetClicked && !this._model.inset())
      return;
    this._model.setInset(insetClicked);
    this._updateButtons();
    this.dispatchEventToListeners(UI.CSSShadowEditor.Events.ShadowChanged, this._model);
  }

  /**
   * @param {!Event} event
   */
  _handleValueModification(event) {
    var modifiedValue = UI.createReplacementString(event.currentTarget.value, event, customNumberHandler);
    if (!modifiedValue)
      return;
    var length = Common.CSSLength.parse(modifiedValue);
    if (!length)
      return;
    if (event.currentTarget === this._blurInput && length.amount < 0)
      length.amount = 0;
    event.currentTarget.value = length.asCSSText();
    event.currentTarget.selectionStart = 0;
    event.currentTarget.selectionEnd = event.currentTarget.value.length;
    this._onTextInput(event);
    event.consume(true);

    /**
     * @param {string} prefix
     * @param {number} number
     * @param {string} suffix
     * @return {string}
     */
    function customNumberHandler(prefix, number, suffix) {
      if (!suffix.length)
        suffix = UI.CSSShadowEditor.defaultUnit;
      return prefix + number + suffix;
    }
  }

  /**
   * @param {!Event} event
   */
  _onTextInput(event) {
    this._changedElement = event.currentTarget;
    this._changedElement.classList.remove('invalid');
    var length = Common.CSSLength.parse(event.currentTarget.value);
    if (!length || event.currentTarget === this._blurInput && length.amount < 0)
      return;
    if (event.currentTarget === this._xInput) {
      this._model.setOffsetX(length);
      this._updateCanvas(false);
    } else if (event.currentTarget === this._yInput) {
      this._model.setOffsetY(length);
      this._updateCanvas(false);
    } else if (event.currentTarget === this._blurInput) {
      this._model.setBlurRadius(length);
      this._blurSlider.value = length.amount;
    } else if (event.currentTarget === this._spreadInput) {
      this._model.setSpreadRadius(length);
      this._spreadSlider.value = length.amount;
    }
    this.dispatchEventToListeners(UI.CSSShadowEditor.Events.ShadowChanged, this._model);
  }

  _onTextBlur() {
    if (!this._changedElement)
      return;
    var length = !this._changedElement.value.trim() ? Common.CSSLength.zero() :
                                                      Common.CSSLength.parse(this._changedElement.value);
    if (!length)
      length = Common.CSSLength.parse(this._changedElement.value + UI.CSSShadowEditor.defaultUnit);
    if (!length) {
      this._changedElement.classList.add('invalid');
      this._changedElement = null;
      return;
    }
    if (this._changedElement === this._xInput) {
      this._model.setOffsetX(length);
      this._xInput.value = length.asCSSText();
      this._updateCanvas(false);
    } else if (this._changedElement === this._yInput) {
      this._model.setOffsetY(length);
      this._yInput.value = length.asCSSText();
      this._updateCanvas(false);
    } else if (this._changedElement === this._blurInput) {
      if (length.amount < 0)
        length = Common.CSSLength.zero();
      this._model.setBlurRadius(length);
      this._blurInput.value = length.asCSSText();
      this._blurSlider.value = length.amount;
    } else if (this._changedElement === this._spreadInput) {
      this._model.setSpreadRadius(length);
      this._spreadInput.value = length.asCSSText();
      this._spreadSlider.value = length.amount;
    }
    this._changedElement = null;
    this.dispatchEventToListeners(UI.CSSShadowEditor.Events.ShadowChanged, this._model);
  }

  /**
   * @param {!Event} event
   */
  _onSliderInput(event) {
    if (event.currentTarget === this._blurSlider) {
      this._model.setBlurRadius(new Common.CSSLength(
          this._blurSlider.value, this._model.blurRadius().unit || UI.CSSShadowEditor.defaultUnit));
      this._blurInput.value = this._model.blurRadius().asCSSText();
      this._blurInput.classList.remove('invalid');
    } else if (event.currentTarget === this._spreadSlider) {
      this._model.setSpreadRadius(new Common.CSSLength(
          this._spreadSlider.value, this._model.spreadRadius().unit || UI.CSSShadowEditor.defaultUnit));
      this._spreadInput.value = this._model.spreadRadius().asCSSText();
      this._spreadInput.classList.remove('invalid');
    }
    this.dispatchEventToListeners(UI.CSSShadowEditor.Events.ShadowChanged, this._model);
  }

  /**
   * @param {!MouseEvent} event
   * @return {boolean}
   */
  _dragStart(event) {
    this._xySlider.focus();
    this._updateCanvas(true);
    this._canvasOrigin = new Common.Geometry.Point(
        this._xySlider.totalOffsetLeft() + this._halfCanvasSize,
        this._xySlider.totalOffsetTop() + this._halfCanvasSize);
    var clickedPoint = new Common.Geometry.Point(event.x - this._canvasOrigin.x, event.y - this._canvasOrigin.y);
    var thumbPoint = this._sliderThumbPosition();
    if (clickedPoint.distanceTo(thumbPoint) >= UI.CSSShadowEditor.sliderThumbRadius)
      this._dragMove(event);
    return true;
  }

  /**
   * @param {!MouseEvent} event
   */
  _dragMove(event) {
    var point = new Common.Geometry.Point(event.x - this._canvasOrigin.x, event.y - this._canvasOrigin.y);
    if (event.shiftKey)
      point = this._snapToClosestDirection(point);
    var constrainedPoint = this._constrainPoint(point, this._innerCanvasSize);
    var newX = Math.round((constrainedPoint.x / this._innerCanvasSize) * UI.CSSShadowEditor.maxRange);
    var newY = Math.round((constrainedPoint.y / this._innerCanvasSize) * UI.CSSShadowEditor.maxRange);

    if (event.shiftKey) {
      this._model.setOffsetX(new Common.CSSLength(newX, this._model.offsetX().unit || UI.CSSShadowEditor.defaultUnit));
      this._model.setOffsetY(new Common.CSSLength(newY, this._model.offsetY().unit || UI.CSSShadowEditor.defaultUnit));
    } else {
      if (!event.altKey) {
        this._model.setOffsetX(
            new Common.CSSLength(newX, this._model.offsetX().unit || UI.CSSShadowEditor.defaultUnit));
      }
      if (!UI.KeyboardShortcut.eventHasCtrlOrMeta(event)) {
        this._model.setOffsetY(
            new Common.CSSLength(newY, this._model.offsetY().unit || UI.CSSShadowEditor.defaultUnit));
      }
    }
    this._xInput.value = this._model.offsetX().asCSSText();
    this._yInput.value = this._model.offsetY().asCSSText();
    this._xInput.classList.remove('invalid');
    this._yInput.classList.remove('invalid');
    this._updateCanvas(true);
    this.dispatchEventToListeners(UI.CSSShadowEditor.Events.ShadowChanged, this._model);
  }

  _onCanvasBlur() {
    this._updateCanvas(false);
  }

  /**
   * @param {!Event} event
   */
  _onCanvasArrowKey(event) {
    var shiftX = 0;
    var shiftY = 0;
    if (event.key === 'ArrowRight')
      shiftX = 1;
    else if (event.key === 'ArrowLeft')
      shiftX = -1;
    else if (event.key === 'ArrowUp')
      shiftY = -1;
    else if (event.key === 'ArrowDown')
      shiftY = 1;

    if (!shiftX && !shiftY)
      return;
    event.consume(true);

    if (shiftX) {
      var offsetX = this._model.offsetX();
      var newAmount =
          Number.constrain(offsetX.amount + shiftX, -UI.CSSShadowEditor.maxRange, UI.CSSShadowEditor.maxRange);
      if (newAmount === offsetX.amount)
        return;
      this._model.setOffsetX(new Common.CSSLength(newAmount, offsetX.unit || UI.CSSShadowEditor.defaultUnit));
      this._xInput.value = this._model.offsetX().asCSSText();
      this._xInput.classList.remove('invalid');
    }
    if (shiftY) {
      var offsetY = this._model.offsetY();
      var newAmount =
          Number.constrain(offsetY.amount + shiftY, -UI.CSSShadowEditor.maxRange, UI.CSSShadowEditor.maxRange);
      if (newAmount === offsetY.amount)
        return;
      this._model.setOffsetY(new Common.CSSLength(newAmount, offsetY.unit || UI.CSSShadowEditor.defaultUnit));
      this._yInput.value = this._model.offsetY().asCSSText();
      this._yInput.classList.remove('invalid');
    }
    this._updateCanvas(true);
    this.dispatchEventToListeners(UI.CSSShadowEditor.Events.ShadowChanged, this._model);
  }

  /**
   * @param {!Common.Geometry.Point} point
   * @param {number} max
   * @return {!Common.Geometry.Point}
   */
  _constrainPoint(point, max) {
    if (Math.abs(point.x) <= max && Math.abs(point.y) <= max)
      return new Common.Geometry.Point(point.x, point.y);
    return point.scale(max / Math.max(Math.abs(point.x), Math.abs(point.y)));
  }

  /**
   * @param {!Common.Geometry.Point} point
   * @return {!Common.Geometry.Point}
   */
  _snapToClosestDirection(point) {
    var minDistance = Number.MAX_VALUE;
    var closestPoint = point;

    var directions = [
      new Common.Geometry.Point(0, -1),  // North
      new Common.Geometry.Point(1, -1),  // Northeast
      new Common.Geometry.Point(1, 0),   // East
      new Common.Geometry.Point(1, 1)    // Southeast
    ];

    for (var direction of directions) {
      var projection = point.projectOn(direction);
      var distance = point.distanceTo(projection);
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = projection;
      }
    }

    return closestPoint;
  }

  /**
   * @return {!Common.Geometry.Point}
   */
  _sliderThumbPosition() {
    var x = (this._model.offsetX().amount / UI.CSSShadowEditor.maxRange) * this._innerCanvasSize;
    var y = (this._model.offsetY().amount / UI.CSSShadowEditor.maxRange) * this._innerCanvasSize;
    return this._constrainPoint(new Common.Geometry.Point(x, y), this._innerCanvasSize);
  }
};

/** @enum {symbol} */
UI.CSSShadowEditor.Events = {
  ShadowChanged: Symbol('ShadowChanged')
};

/** @type {number} */
UI.CSSShadowEditor.maxRange = 20;
/** @type {string} */
UI.CSSShadowEditor.defaultUnit = 'px';
/** @type {number} */
UI.CSSShadowEditor.sliderThumbRadius = 6;
/** @type {number} */
UI.CSSShadowEditor.canvasSize = 88;
