// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as VisualLogging from '../../../visual_logging/visual_logging.js';
import * as UI from '../../legacy.js';

import cssShadowEditorStyles from './cssShadowEditor.css.js';

const UIStrings = {
  /**
   *@description Text that refers to some types
   */
  type: 'Type',
  /**
   *@description Text in CSSShadow Editor of the inline editor in the Styles tab
   */
  xOffset: 'X offset',
  /**
   *@description Text in CSSShadow Editor of the inline editor in the Styles tab
   */
  yOffset: 'Y offset',
  /**
   * @description Text in CSSShadow Editor of the inline editor in the Styles tab. Noun which is a
   * label for an input that allows the user to specify how blurred the box-shadow should be.
   */
  blur: 'Blur',
  /**
   *@description Text in CSSShadow Editor of the inline editor in the Styles tab
   */
  spread: 'Spread',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/inline_editor/CSSShadowEditor.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const maxRange: number = 20;
const defaultUnit: string = 'px';
const sliderThumbRadius: number = 6;
const canvasSize: number = 88;

export interface CSSShadowModel {
  setInset(inset: boolean): void;
  setOffsetX(offsetX: CSSLength): void;
  setOffsetY(offsetY: CSSLength): void;
  setBlurRadius(blurRadius: CSSLength): void;
  setSpreadRadius(spreadRadius: CSSLength): void;
  isBoxShadow(): boolean;
  inset(): boolean;
  offsetX(): CSSLength;
  offsetY(): CSSLength;
  blurRadius(): CSSLength;
  spreadRadius(): CSSLength;
}

const CSS_LENGTH_REGEX = (function(): string {
  const number = '([+-]?(?:[0-9]*[.])?[0-9]+(?:[eE][+-]?[0-9]+)?)';
  const unit = '(ch|cm|em|ex|in|mm|pc|pt|px|rem|vh|vmax|vmin|vw)';
  const zero = '[+-]?(?:0*[.])?0+(?:[eE][+-]?[0-9]+)?';
  return new RegExp(number + unit + '|' + zero, 'gi').source;
})();

export class CSSLength {
  amount: number;
  unit: string;
  constructor(amount: number, unit: string) {
    this.amount = amount;
    this.unit = unit;
  }

  static parse(text: string): CSSLength|null {
    const lengthRegex = new RegExp('^(?:' + CSS_LENGTH_REGEX + ')$', 'i');
    const match = text.match(lengthRegex);
    if (!match) {
      return null;
    }
    if (match.length > 2 && match[2]) {
      return new CSSLength(parseFloat(match[1]), match[2]);
    }
    return CSSLength.zero();
  }

  static zero(): CSSLength {
    return new CSSLength(0, '');
  }

  asCSSText(): string {
    return this.amount + this.unit;
  }
}

export class CSSShadowEditor extends Common.ObjectWrapper.eventMixin<EventTypes, typeof UI.Widget.VBox>(
    UI.Widget.VBox) {
  private readonly typeField: HTMLElement;
  private readonly outsetButton: HTMLElement;
  private readonly insetButton: HTMLElement;
  private xInput: HTMLInputElement;
  private yInput: HTMLInputElement;
  private xySlider: HTMLCanvasElement;
  private halfCanvasSize: number;
  private readonly innerCanvasSize: number;
  private blurInput: HTMLInputElement;
  private blurSlider: HTMLInputElement;
  private readonly spreadField: HTMLElement;
  private spreadInput: HTMLInputElement;
  private spreadSlider: HTMLInputElement;
  private model!: CSSShadowModel;
  private canvasOrigin!: UI.Geometry.Point;
  private changedElement?: HTMLInputElement|null;
  constructor() {
    super(true);
    this.contentElement.tabIndex = 0;
    this.contentElement.setAttribute(
        'jslog', `${VisualLogging.dialog('cssShadowEditor').parent('mapped').track({keydown: 'Enter|Escape'})}`);
    this.setDefaultFocusedElement(this.contentElement);

    this.typeField = this.contentElement.createChild('div', 'shadow-editor-field shadow-editor-flex-field');
    this.typeField.createChild('label', 'shadow-editor-label').textContent = i18nString(UIStrings.type);
    this.outsetButton = this.typeField.createChild('button', 'shadow-editor-button-left');
    this.outsetButton.textContent = i18n.i18n.lockedString('Outset');
    this.outsetButton.addEventListener('click', this.onButtonClick.bind(this), false);
    this.insetButton = this.typeField.createChild('button', 'shadow-editor-button-right');
    this.insetButton.textContent = i18n.i18n.lockedString('Inset');
    this.insetButton.addEventListener('click', this.onButtonClick.bind(this), false);

    const xField = this.contentElement.createChild('div', 'shadow-editor-field');
    this.xInput = this.createTextInput(xField, i18nString(UIStrings.xOffset), 'x-offset');
    const yField = this.contentElement.createChild('div', 'shadow-editor-field');
    this.yInput = this.createTextInput(yField, i18nString(UIStrings.yOffset), 'y-offset');
    this.xySlider = (xField.createChild('canvas', 'shadow-editor-2D-slider') as HTMLCanvasElement);
    this.xySlider.setAttribute('jslog', `${VisualLogging.slider('xy').track({
                                 click: true,
                                 drag: true,
                                 keydown: 'ArrowUp|ArrowDown|ArrowLeft|ArrowRight',
                               })}`);
    this.xySlider.width = canvasSize;
    this.xySlider.height = canvasSize;
    this.xySlider.tabIndex = -1;
    this.halfCanvasSize = canvasSize / 2;
    this.innerCanvasSize = this.halfCanvasSize - sliderThumbRadius;
    UI.UIUtils.installDragHandle(this.xySlider, this.dragStart.bind(this), this.dragMove.bind(this), null, 'default');
    this.xySlider.addEventListener('keydown', this.onCanvasArrowKey.bind(this), false);
    this.xySlider.addEventListener('blur', this.onCanvasBlur.bind(this), false);

    const blurField =
        this.contentElement.createChild('div', 'shadow-editor-field shadow-editor-flex-field shadow-editor-blur-field');
    this.blurInput = this.createTextInput(blurField, i18nString(UIStrings.blur), 'blur');
    this.blurSlider = this.createSlider(blurField, 'blur');

    this.spreadField = this.contentElement.createChild('div', 'shadow-editor-field shadow-editor-flex-field');
    this.spreadInput = this.createTextInput(this.spreadField, i18nString(UIStrings.spread), 'spread');
    this.spreadSlider = this.createSlider(this.spreadField, 'spread');
  }

  private createTextInput(field: Element, propertyName: string, jslogContext: string): HTMLInputElement {
    const label = field.createChild('label', 'shadow-editor-label');
    label.textContent = propertyName;
    label.setAttribute('for', propertyName);
    const textInput = UI.UIUtils.createInput('shadow-editor-text-input', 'text');
    field.appendChild(textInput);
    textInput.id = propertyName;
    textInput.addEventListener('keydown', this.handleValueModification.bind(this), false);
    textInput.addEventListener('wheel', this.handleValueModification.bind(this), false);
    textInput.addEventListener('input', this.onTextInput.bind(this), false);
    textInput.addEventListener('blur', this.onTextBlur.bind(this), false);
    textInput.setAttribute(
        'jslog', `${VisualLogging.value().track({change: true, keydown: 'ArrowUp|ArrowDown'}).context(jslogContext)}`);
    return textInput;
  }

  private createSlider(field: Element, jslogContext: string): HTMLInputElement {
    const slider = UI.UIUtils.createSlider(0, maxRange, -1);
    slider.addEventListener('input', this.onSliderInput.bind(this), false);
    slider.setAttribute('jslog', `${VisualLogging.slider().track({click: true, drag: true}).context(jslogContext)}`);
    field.appendChild(slider);
    return slider as HTMLInputElement;
  }

  override wasShown(): void {
    this.registerCSSFiles([cssShadowEditorStyles]);
    this.updateUI();
  }

  setModel(model: CSSShadowModel): void {
    this.model = model;
    this.typeField.classList.toggle('hidden', !model.isBoxShadow());
    this.spreadField.classList.toggle('hidden', !model.isBoxShadow());
    this.updateUI();
  }

  private updateUI(): void {
    this.updateButtons();
    this.xInput.value = this.model.offsetX().asCSSText();
    this.yInput.value = this.model.offsetY().asCSSText();
    this.blurInput.value = this.model.blurRadius().asCSSText();
    this.spreadInput.value = this.model.spreadRadius().asCSSText();
    this.blurSlider.value = this.model.blurRadius().amount.toString();
    this.spreadSlider.value = this.model.spreadRadius().amount.toString();
    this.updateCanvas(false);
  }

  private updateButtons(): void {
    this.insetButton.classList.toggle('enabled', this.model.inset());
    this.outsetButton.classList.toggle('enabled', !this.model.inset());
  }

  private updateCanvas(drawFocus: boolean): void {
    const context = this.xySlider.getContext('2d');
    if (!context) {
      throw new Error('Unable to obtain canvas context');
    }
    context.clearRect(0, 0, this.xySlider.width, this.xySlider.height);

    // Draw dashed axes.
    context.save();
    context.setLineDash([1, 1]);
    context.strokeStyle = 'rgba(210, 210, 210, 0.8)';
    context.beginPath();
    context.moveTo(this.halfCanvasSize, 0);
    context.lineTo(this.halfCanvasSize, canvasSize);
    context.moveTo(0, this.halfCanvasSize);
    context.lineTo(canvasSize, this.halfCanvasSize);
    context.stroke();
    context.restore();

    const thumbPoint = this.sliderThumbPosition();
    // Draw 2D slider line.
    context.save();
    context.translate(this.halfCanvasSize, this.halfCanvasSize);
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
      context.arc(thumbPoint.x, thumbPoint.y, sliderThumbRadius + 2, 0, 2 * Math.PI);
      context.fill();
    }
    context.beginPath();
    context.fillStyle = '#4285F4';
    context.arc(thumbPoint.x, thumbPoint.y, sliderThumbRadius, 0, 2 * Math.PI);
    context.fill();
    context.restore();
  }

  private onButtonClick(event: Event): void {
    const insetClicked = (event.currentTarget === this.insetButton);
    if (insetClicked && this.model.inset() || !insetClicked && !this.model.inset()) {
      return;
    }
    this.model.setInset(insetClicked);
    this.updateButtons();
    this.dispatchEventToListeners(Events.SHADOW_CHANGED, this.model);
  }

  private handleValueModification(event: Event): void {
    const target = (event.currentTarget as HTMLInputElement);
    const modifiedValue = UI.UIUtils.createReplacementString(target.value, event, customNumberHandler);
    if (!modifiedValue) {
      return;
    }
    const length = CSSLength.parse(modifiedValue);
    if (!length) {
      return;
    }
    if (event.currentTarget === this.blurInput && length.amount < 0) {
      length.amount = 0;
    }
    target.value = length.asCSSText();
    target.selectionStart = 0;
    target.selectionEnd = target.value.length;
    this.onTextInput(event);
    event.consume(true);

    function customNumberHandler(prefix: string, number: number, suffix: string): string {
      if (!suffix.length) {
        suffix = defaultUnit;
      }
      return prefix + number + suffix;
    }
  }

  private onTextInput(event: Event): void {
    const currentTarget = (event.currentTarget as HTMLInputElement);
    this.changedElement = currentTarget;
    this.changedElement.classList.remove('invalid');
    const length = CSSLength.parse(currentTarget.value);
    if (!length || currentTarget === this.blurInput && length.amount < 0) {
      return;
    }
    if (currentTarget === this.xInput) {
      this.model.setOffsetX(length);
      this.updateCanvas(false);
    } else if (currentTarget === this.yInput) {
      this.model.setOffsetY(length);
      this.updateCanvas(false);
    } else if (currentTarget === this.blurInput) {
      this.model.setBlurRadius(length);
      this.blurSlider.value = length.amount.toString();
    } else if (currentTarget === this.spreadInput) {
      this.model.setSpreadRadius(length);
      this.spreadSlider.value = length.amount.toString();
    }
    this.dispatchEventToListeners(Events.SHADOW_CHANGED, this.model);
  }

  private onTextBlur(): void {
    if (!this.changedElement) {
      return;
    }
    let length: (CSSLength|null)|CSSLength =
        !this.changedElement.value.trim() ? CSSLength.zero() : CSSLength.parse(this.changedElement.value);
    if (!length) {
      length = CSSLength.parse(this.changedElement.value + defaultUnit);
    }
    if (!length) {
      this.changedElement.classList.add('invalid');
      this.changedElement = null;
      return;
    }
    if (this.changedElement === this.xInput) {
      this.model.setOffsetX(length);
      this.xInput.value = length.asCSSText();
      this.updateCanvas(false);
    } else if (this.changedElement === this.yInput) {
      this.model.setOffsetY(length);
      this.yInput.value = length.asCSSText();
      this.updateCanvas(false);
    } else if (this.changedElement === this.blurInput) {
      if (length.amount < 0) {
        length = CSSLength.zero();
      }
      this.model.setBlurRadius(length);
      this.blurInput.value = length.asCSSText();
      this.blurSlider.value = length.amount.toString();
    } else if (this.changedElement === this.spreadInput) {
      this.model.setSpreadRadius(length);
      this.spreadInput.value = length.asCSSText();
      this.spreadSlider.value = length.amount.toString();
    }
    this.changedElement = null;
    this.dispatchEventToListeners(Events.SHADOW_CHANGED, this.model);
  }

  private onSliderInput(event: Event): void {
    if (event.currentTarget === this.blurSlider) {
      this.model.setBlurRadius(
          new CSSLength(Number(this.blurSlider.value), this.model.blurRadius().unit || defaultUnit));
      this.blurInput.value = this.model.blurRadius().asCSSText();
      this.blurInput.classList.remove('invalid');
    } else if (event.currentTarget === this.spreadSlider) {
      this.model.setSpreadRadius(
          new CSSLength(Number(this.spreadSlider.value), this.model.spreadRadius().unit || defaultUnit));
      this.spreadInput.value = this.model.spreadRadius().asCSSText();
      this.spreadInput.classList.remove('invalid');
    }
    this.dispatchEventToListeners(Events.SHADOW_CHANGED, this.model);
  }

  private dragStart(event: MouseEvent): boolean {
    this.xySlider.focus();
    this.updateCanvas(true);
    this.canvasOrigin = new UI.Geometry.Point(
        this.xySlider.getBoundingClientRect().left + this.halfCanvasSize,
        this.xySlider.getBoundingClientRect().top + this.halfCanvasSize);
    const clickedPoint = new UI.Geometry.Point(event.x - this.canvasOrigin.x, event.y - this.canvasOrigin.y);
    const thumbPoint = this.sliderThumbPosition();
    if (clickedPoint.distanceTo(thumbPoint) >= sliderThumbRadius) {
      this.dragMove(event);
    }
    return true;
  }

  private dragMove(event: MouseEvent): void {
    let point: UI.Geometry.Point = new UI.Geometry.Point(event.x - this.canvasOrigin.x, event.y - this.canvasOrigin.y);
    if (event.shiftKey) {
      point = this.snapToClosestDirection(point);
    }
    const constrainedPoint = this.constrainPoint(point, this.innerCanvasSize);
    const newX = Math.round((constrainedPoint.x / this.innerCanvasSize) * maxRange);
    const newY = Math.round((constrainedPoint.y / this.innerCanvasSize) * maxRange);

    if (event.shiftKey) {
      this.model.setOffsetX(new CSSLength(newX, this.model.offsetX().unit || defaultUnit));
      this.model.setOffsetY(new CSSLength(newY, this.model.offsetY().unit || defaultUnit));
    } else {
      if (!event.altKey) {
        this.model.setOffsetX(new CSSLength(newX, this.model.offsetX().unit || defaultUnit));
      }
      if (!UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(event)) {
        this.model.setOffsetY(new CSSLength(newY, this.model.offsetY().unit || defaultUnit));
      }
    }
    this.xInput.value = this.model.offsetX().asCSSText();
    this.yInput.value = this.model.offsetY().asCSSText();
    this.xInput.classList.remove('invalid');
    this.yInput.classList.remove('invalid');
    this.updateCanvas(true);
    this.dispatchEventToListeners(Events.SHADOW_CHANGED, this.model);
  }

  private onCanvasBlur(): void {
    this.updateCanvas(false);
  }

  private onCanvasArrowKey(event: Event): void {
    const keyboardEvent = (event as KeyboardEvent);
    let shiftX = 0;
    let shiftY = 0;
    if (keyboardEvent.key === 'ArrowRight') {
      shiftX = 1;
    } else if (keyboardEvent.key === 'ArrowLeft') {
      shiftX = -1;
    } else if (keyboardEvent.key === 'ArrowUp') {
      shiftY = -1;
    } else if (keyboardEvent.key === 'ArrowDown') {
      shiftY = 1;
    }

    if (!shiftX && !shiftY) {
      return;
    }
    event.consume(true);

    if (shiftX) {
      const offsetX = this.model.offsetX();
      const newAmount = Platform.NumberUtilities.clamp(offsetX.amount + shiftX, -maxRange, maxRange);
      if (newAmount === offsetX.amount) {
        return;
      }
      this.model.setOffsetX(new CSSLength(newAmount, offsetX.unit || defaultUnit));
      this.xInput.value = this.model.offsetX().asCSSText();
      this.xInput.classList.remove('invalid');
    }
    if (shiftY) {
      const offsetY = this.model.offsetY();
      const newAmount = Platform.NumberUtilities.clamp(offsetY.amount + shiftY, -maxRange, maxRange);
      if (newAmount === offsetY.amount) {
        return;
      }
      this.model.setOffsetY(new CSSLength(newAmount, offsetY.unit || defaultUnit));
      this.yInput.value = this.model.offsetY().asCSSText();
      this.yInput.classList.remove('invalid');
    }
    this.updateCanvas(true);
    this.dispatchEventToListeners(Events.SHADOW_CHANGED, this.model);
  }

  private constrainPoint(point: UI.Geometry.Point, max: number): UI.Geometry.Point {
    if (Math.abs(point.x) <= max && Math.abs(point.y) <= max) {
      return new UI.Geometry.Point(point.x, point.y);
    }
    return point.scale(max / Math.max(Math.abs(point.x), Math.abs(point.y)));
  }

  private snapToClosestDirection(point: UI.Geometry.Point): UI.Geometry.Point {
    let minDistance: number = Number.MAX_VALUE;
    let closestPoint: UI.Geometry.Point = point;

    const directions = [
      new UI.Geometry.Point(0, -1), new UI.Geometry.Point(1, -1), new UI.Geometry.Point(1, 0),
      new UI.Geometry.Point(1, 1),  // Southeast
    ];

    for (const direction of directions) {
      const projection = point.projectOn(direction);
      const distance = point.distanceTo(projection);
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = projection;
      }
    }

    return closestPoint;
  }

  private sliderThumbPosition(): UI.Geometry.Point {
    const x = (this.model.offsetX().amount / maxRange) * this.innerCanvasSize;
    const y = (this.model.offsetY().amount / maxRange) * this.innerCanvasSize;
    return this.constrainPoint(new UI.Geometry.Point(x, y), this.innerCanvasSize);
  }
}

export const enum Events {
  SHADOW_CHANGED = 'ShadowChanged',
}

export type EventTypes = {
  [Events.SHADOW_CHANGED]: CSSShadowModel,
};
