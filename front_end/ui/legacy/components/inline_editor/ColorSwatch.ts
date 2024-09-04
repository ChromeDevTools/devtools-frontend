// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as ColorPicker from '../../../legacy/components/color_picker/color_picker.js';
import * as LitHtml from '../../../lit-html/lit-html.js';
import * as VisualLogging from '../../../visual_logging/visual_logging.js';

import colorSwatchStyles from './colorSwatch.css.js';

const UIStrings = {
  /**
   *@description Icon element title in Color Swatch of the inline editor in the Styles tab
   */
  shiftclickToChangeColorFormat: 'Shift-click to change color format',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/inline_editor/ColorSwatch.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class ColorChangedEvent extends Event {
  static readonly eventName = 'colorchanged';

  data: {color: Common.Color.Color};

  constructor(color: Common.Color.Color) {
    super(ColorChangedEvent.eventName, {});
    this.data = {color};
  }
}

export class ClickEvent extends Event {
  static readonly eventName = 'swatchclick';

  constructor() {
    super(ClickEvent.eventName, {});
  }
}

export class ColorSwatch extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-color-swatch`;
  private readonly shadow = this.attachShadow({mode: 'open'});
  private tooltip: string = i18nString(UIStrings.shiftclickToChangeColorFormat);
  private color: Common.Color.Color|null = null;
  private readonly: boolean = false;

  constructor(tooltip?: string) {
    super();
    this.shadow.adoptedStyleSheets = [
      colorSwatchStyles,
    ];
    if (tooltip) {
      this.tooltip = tooltip;
    }
  }

  static isColorSwatch(element: Element): element is ColorSwatch {
    return element.localName === 'devtools-color-swatch';
  }

  getReadonly(): boolean {
    return this.readonly;
  }

  setReadonly(readonly: boolean): void {
    if (this.readonly === readonly) {
      return;
    }

    this.readonly = readonly;
    if (this.color) {
      this.renderColor(this.color);
    }
  }

  getColor(): Common.Color.Color|null {
    return this.color;
  }

  get anchorBox(): AnchorBox|null {
    const swatch = this.shadow.querySelector('.color-swatch');
    return swatch ? swatch.boxInWindow() : null;
  }

  getText(): string|undefined {
    return this.color?.getAuthoredText() ?? this.color?.asString();
  }

  /**
   * Render this swatch given a color object or text to be parsed as a color.
   * @param color The color object or string to use for this swatch.
   */
  renderColor(color: Common.Color.Color): void {
    this.color = color;

    const colorSwatchClasses = LitHtml.Directives.classMap({
      'color-swatch': true,
      readonly: this.readonly,
    });

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    // Note that we use a <slot> with a default value here to display the color text. Consumers of this component are
    // free to append any content to replace what is being shown here.
    // Note also that whitespace between nodes is removed on purpose to avoid pushing these elements apart. Do not
    // re-format the HTML code.
    LitHtml.render(
      LitHtml.html`<span class=${colorSwatchClasses} title=${this.tooltip}><span class="color-swatch-inner"
        style="background-color: ${this.getText()};"
        jslog=${VisualLogging.showStyleEditor('color').track({click: true})}
        @click=${this.onClick}
        @mousedown=${this.consume}
        @dblclick=${this.consume}></span></span><slot><span>${this.getText()}</span></slot>`,
      this.shadow, {host: this});
    // clang-format on
  }

  private onClick(e: KeyboardEvent): void {
    if (this.readonly) {
      return;
    }

    if (e.shiftKey) {
      e.stopPropagation();
      this.showFormatPicker(e);
      return;
    }

    this.dispatchEvent(new ClickEvent());
  }

  private consume(e: Event): void {
    e.stopPropagation();
  }

  setColor(color: Common.Color.Color): void {
    this.renderColor(color);
    this.dispatchEvent(new ColorChangedEvent(color));
  }

  setColorText(color: Common.Color.Color): void {
    this.firstElementChild?.remove();
    this.renderColor(color);
    const span = this.appendChild(document.createElement('span'));
    span.appendChild(document.createTextNode(color.getAuthoredText() ?? color.asString()));
    this.dispatchEvent(new ColorChangedEvent(color));
  }

  private showFormatPicker(e: Event): void {
    if (!this.color) {
      return;
    }

    const contextMenu = new ColorPicker.FormatPickerContextMenu.FormatPickerContextMenu(this.color);
    void contextMenu.show(e, color => {
      this.setColorText(color);
    });
  }
}

customElements.define('devtools-color-swatch', ColorSwatch);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-color-swatch': ColorSwatch;
  }

  interface HTMLElementEventMap {
    [ColorChangedEvent.eventName]: ColorChangedEvent;
    [ClickEvent.eventName]: Event;
  }
}
