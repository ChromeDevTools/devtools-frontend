// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as Host from '../../../../core/host/host.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as ComponentHelpers from '../../../components/helpers/helpers.js';
import * as ColorPicker from '../../../legacy/components/color_picker/color_picker.js';
import * as LitHtml from '../../../lit-html/lit-html.js';

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

  data: {text: string};

  constructor(text: string) {
    super(ColorChangedEvent.eventName, {});
    this.data = {text};
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
  private text: string|null = null;
  private color: Common.Color.Color|null = null;
  private format: Common.Color.Format|null = null;

  constructor() {
    super();
    this.shadow.adoptedStyleSheets = [
      colorSwatchStyles,
    ];
  }

  static isColorSwatch(element: Element): element is ColorSwatch {
    return element.localName === 'devtools-color-swatch';
  }

  getColor(): Common.Color.Color|null {
    return this.color;
  }

  getFormat(): Common.Color.Format|null {
    return this.format;
  }

  getText(): string|null {
    return this.text;
  }

  get anchorBox(): AnchorBox|null {
    const swatch = this.shadow.querySelector('.color-swatch');
    return swatch ? swatch.boxInWindow() : null;
  }

  /**
   * Render this swatch given a color object or text to be parsed as a color.
   * @param color The color object or string to use for this swatch.
   * @param formatOrUseUserSetting Either the format to be used as a string, or true to auto-detect the user-set format.
   * @param tooltip The tooltip to use on the swatch.
   */
  renderColor(color: Common.Color.Color|string, formatOrUseUserSetting?: string|boolean, tooltip?: string): void {
    if (typeof color === 'string') {
      this.color = Common.Color.parse(color);
      this.text = color;
      if (!this.color) {
        this.renderTextOnly();
        return;
      }
    } else {
      this.color = color;
    }

    if (typeof formatOrUseUserSetting === 'boolean' && formatOrUseUserSetting) {
      this.format = Common.Settings.detectColorFormat(this.color);
    } else if (typeof formatOrUseUserSetting === 'string') {
      this.format = Common.Color.getFormat(formatOrUseUserSetting);
    } else {
      this.format = this.color.format();
    }

    this.text = this.color.getAuthoredText() ?? this.color.asString(this.format ?? undefined);

    if (tooltip) {
      this.tooltip = tooltip;
    }

    this.render();
  }

  private renderTextOnly(): void {
    // Non-color values can be passed to the component (like 'none' from border style).
    LitHtml.render(this.text, this.shadow, {host: this});
  }

  private render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off

    // Note that we use a <slot> with a default value here to display the color text. Consumers of this component are
    // free to append any content to replace what is being shown here.
    // Note also that whitespace between nodes is removed on purpose to avoid pushing these elements apart. Do not
    // re-format the HTML code.
    LitHtml.render(
      LitHtml.html`<span class="color-swatch" title=${this.tooltip}><span class="color-swatch-inner"
        style="background-color: ${this.text};"
        @click=${this.onClick}
        @mousedown=${this.consume}
        @dblclick=${this.consume}></span></span><slot><span>${this.text}</span></slot>`,
      this.shadow, {host: this});
    // clang-format on
  }

  private onClick(e: KeyboardEvent): void {
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

  setFormat(format: Common.Color.Format): void {
    const newColor = this.color?.as(format);
    const text = newColor?.asString();
    if (!newColor || !text) {
      return;
    }
    this.color = newColor;
    this.format = this.color.format();
    this.text = text;
    this.render();
    this.dispatchEvent(new ColorChangedEvent(this.text));
  }

  private showFormatPicker(e: Event): void {
    if (!this.color || !this.format) {
      return;
    }

    const contextMenu = new ColorPicker.FormatPickerContextMenu.FormatPickerContextMenu(this.color, this.format);
    void contextMenu.show(e, format => {
      this.setFormat(format);
      Host.userMetrics.colorConvertedFrom(Host.UserMetrics.ColorConvertedFrom.ColorSwatch);
    });
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-color-swatch', ColorSwatch);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-color-swatch': ColorSwatch;
  }

  interface HTMLElementEventMap {
    [ColorChangedEvent.eventName]: ColorChangedEvent;
    [ClickEvent.eventName]: Event;
  }
}
