// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import * as i18n from '../../../../core/i18n/i18n.js';
import * as ColorPicker from '../../../legacy/components/color_picker/color_picker.js';
import * as Lit from '../../../lit/lit.js';
import * as VisualLogging from '../../../visual_logging/visual_logging.js';
import colorSwatchStyles from './colorSwatch.css.js';
const { html } = Lit;
const UIStrings = {
    /**
     * @description Icon element title in Color Swatch of the inline editor in the Styles tab
     */
    shiftclickToChangeColorFormat: 'Shift-click to change color format',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/inline_editor/ColorSwatch.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ColorFormatChangedEvent extends Event {
    static eventName = 'colorformatchanged';
    data;
    constructor(color) {
        super(ColorFormatChangedEvent.eventName, {});
        this.data = { color };
    }
}
export class ColorChangedEvent extends Event {
    static eventName = 'colorchanged';
    data;
    constructor(color) {
        super(ColorChangedEvent.eventName, {});
        this.data = { color };
    }
}
export class ClickEvent extends Event {
    static eventName = 'swatchclick';
    constructor() {
        super(ClickEvent.eventName, {});
    }
}
export class ColorSwatch extends HTMLElement {
    shadow = this.attachShadow({ mode: 'open' });
    tooltip = i18nString(UIStrings.shiftclickToChangeColorFormat);
    color = null;
    readonly = false;
    constructor(tooltip) {
        super();
        if (tooltip) {
            this.tooltip = tooltip;
        }
        this.tabIndex = -1;
        this.addEventListener('keydown', e => this.onActivate(e));
    }
    static isColorSwatch(element) {
        return element.localName === 'devtools-color-swatch';
    }
    setReadonly(readonly) {
        if (this.readonly === readonly) {
            return;
        }
        this.readonly = readonly;
        if (this.color) {
            this.renderColor(this.color);
        }
    }
    getColor() {
        return this.color;
    }
    get anchorBox() {
        const swatch = this.shadow.querySelector('.color-swatch');
        return swatch ? swatch.boxInWindow() : null;
    }
    getText() {
        return this.color?.getAuthoredText() ?? this.color?.asString();
    }
    /**
     * Render this swatch given a color object or text to be parsed as a color.
     * @param color The color object or string to use for this swatch.
     */
    renderColor(color) {
        this.color = color;
        const colorSwatchClasses = Lit.Directives.classMap({
            'color-swatch': true,
            readonly: this.readonly,
        });
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        // Note that we use a <slot> with a default value here to display the color text. Consumers of this component are
        // free to append any content to replace what is being shown here.
        // Note also that whitespace between nodes is removed on purpose to avoid pushing these elements apart. Do not
        // re-format the HTML code.
        Lit.render(html `<style>${colorSwatchStyles}</style><span
          class=${colorSwatchClasses}
          title=${this.tooltip}><span
            class="color-swatch-inner"
            style="background-color: ${color.asString()};"
            jslog=${VisualLogging.showStyleEditor('color').track({ click: true })}
            @click=${this.onActivate}
            @mousedown=${this.consume}
            @dblclick=${this.consume}></span></span>`, this.shadow, { host: this });
        // clang-format on
    }
    onActivate(e) {
        if (this.readonly) {
            return;
        }
        if ((e instanceof KeyboardEvent && e.key !== 'Enter' && e.key !== ' ') ||
            (e instanceof MouseEvent && e.button > 1)) {
            return;
        }
        if (e.shiftKey) {
            e.stopPropagation();
            this.showFormatPicker(e);
            return;
        }
        this.dispatchEvent(new ClickEvent());
        this.consume(e);
    }
    consume(e) {
        e.stopPropagation();
    }
    setColor(color) {
        this.renderColor(color);
        this.dispatchEvent(new ColorChangedEvent(color));
    }
    showFormatPicker(e) {
        if (!this.color) {
            return;
        }
        const contextMenu = new ColorPicker.FormatPickerContextMenu.FormatPickerContextMenu(this.color);
        void contextMenu.show(e, color => {
            this.dispatchEvent(new ColorFormatChangedEvent(color));
        });
    }
}
customElements.define('devtools-color-swatch', ColorSwatch);
//# sourceMappingURL=ColorSwatch.js.map