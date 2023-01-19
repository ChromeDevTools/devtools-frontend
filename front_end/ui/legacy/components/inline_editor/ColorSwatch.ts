// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as ComponentHelpers from '../../../components/helpers/helpers.js';
import * as IconButton from '../../../components/icon_button/icon_button.js';
import * as LitHtml from '../../../lit-html/lit-html.js';
import * as UI from '../../legacy.js';

import colorSwatchStyles from './colorSwatch.css.js';

const UIStrings = {
  /**
   *@description Icon element title in Color Swatch of the inline editor in the Styles tab
   */
  shiftclickToChangeColorFormat: 'Shift-click to change color format',
  /**
   *@description Tooltip text describing that a color was clipped after conversion to match the target gamut
   *@example {rgb(255 255 255)} PH1
   */
  colorClippedTooltipText: 'This color was clipped to match the format\'s gamut. The actual result was {PH1}',
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

    this.text = this.color.asString(this.format ?? undefined);

    if (tooltip) {
      this.tooltip = tooltip;
    }

    if (!(this.color instanceof Common.Color.Legacy)) {
      this.renderCircularColorSwatch();
    } else {
      this.render();
    }
  }

  private renderTextOnly(): void {
    // Non-color values can be passed to the component (like 'none' from border style).
    LitHtml.render(this.text, this.shadow, {host: this});
  }

  private renderCircularColorSwatch(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    // Note that we use a <slot> with a default value here to display the color text. Consumers of this component are
    // free to append any content to replace what is being shown here.
    // Note also that whitespace between nodes is removed on purpose to avoid pushing these elements apart. Do not
    // re-format the HTML code.
    LitHtml.render(
      LitHtml.html`<span class="color-swatch circular read-only">
          <span class="color-swatch-inner circular"
          style="background-color: ${this.text};"
          @click=${this.onClick}
          @mousedown=${this.consume}
          @dblclick=${this.consume}></span>
        </span><slot><span>${this.text}</span></slot>`,
      this.shadow, {host: this});
    // clang-format on
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
    if (this.color instanceof Common.Color.Legacy) {
      e.stopPropagation();
      this.dispatchEvent(new ClickEvent());
    }
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
    if (!(this.color instanceof Common.Color.Legacy)) {
      this.renderCircularColorSwatch();
    } else {
      this.render();
    }
    this.dispatchEvent(new ColorChangedEvent(this.text));
  }

  private showFormatPicker(e: Event): void {
    if (!this.color || !this.format) {
      return;
    }
    const formats = [
      Common.Color.Format.Nickname, Common.Color.Format.HEX,          Common.Color.Format.ShortHEX,
      Common.Color.Format.HEXA,     Common.Color.Format.ShortHEXA,    Common.Color.Format.RGB,
      Common.Color.Format.RGBA,     Common.Color.Format.HSL,          Common.Color.Format.HSLA,
      Common.Color.Format.HWB,      Common.Color.Format.HWBA,         Common.Color.Format.LCH,
      Common.Color.Format.OKLCH,    Common.Color.Format.LAB,          Common.Color.Format.OKLAB,
      Common.Color.Format.SRGB,     Common.Color.Format.SRGB_LINEAR,  Common.Color.Format.DISPLAY_P3,
      Common.Color.Format.A98_RGB,  Common.Color.Format.PROPHOTO_RGB, Common.Color.Format.REC_2020,
      Common.Color.Format.XYZ,      Common.Color.Format.XYZ_D50,      Common.Color.Format.XYZ_D65,
    ];
    const menu = new UI.ContextMenu.ContextMenu(e, {useSoftMenu: true});
    const legacySection = menu.section('legacy');
    const wideSection = menu.section('wide');
    const colorFunctionSection = menu.section('color-function').appendSubMenuItem('color()').section();
    for (const format of formats) {
      if (format === this.format) {
        continue;
      }
      const newColor = this.color.as(format);
      if (newColor instanceof Common.Color.Legacy) {
        // The legacy alpha formats (HEXA, ShortHEXA, RGBA, HSLA, HWBA) will only be stringified differently when alpha
        // isn't opaque (i.e., 100%).
        const isAlphaFormat = newColor.alpha !== null;
        const alphaIsOpaque = !newColor.hasAlpha();

        // Print either the alpha or non-alpha format, but not both:
        if (isAlphaFormat === alphaIsOpaque) {
          continue;
        }
      }
      const label = newColor.asString();
      if (!label) {
        continue;
      }

      const unclippedColor = newColor.getUnclippedColor();
      const icon = unclippedColor.isInGamut() ? undefined : new IconButton.Icon.Icon();
      if (icon) {
        icon.data = {iconName: 'ic_warning_black_18dp', color: 'black', width: '14px', height: '14px'};
      }
      const tooltip =
          icon ? i18nString(UIStrings.colorClippedTooltipText, {PH1: unclippedColor.asString() ?? 'none'}) : undefined;

      const handler = (): void => this.setFormat(format);

      const section = newColor instanceof Common.Color.Legacy ? legacySection :
          newColor instanceof Common.Color.ColorFunction      ? colorFunctionSection :
                                                                wideSection;
      section.appendItem(label, handler, false, icon, tooltip);
      void menu.show();
    }
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
