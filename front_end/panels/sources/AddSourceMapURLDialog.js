// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import { html, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import dialogStyles from './dialog.css.js';
const UIStrings = {
    /**
     * @description Text in Add Source Map URLDialog of the Sources panel
     */
    sourceMapUrl: 'Source map URL: ',
    /**
     * @description Text in Add Debug Info URL Dialog of the Sources panel
     */
    debugInfoUrl: 'DWARF symbols URL: ',
    /**
     * @description Text to add something
     */
    add: 'Add',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/AddSourceMapURLDialog.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
    <style>${dialogStyles}</style>
    <label>${input.label}</label>
    <input class="harmony-input add-source-map" spellcheck="false" type="text"
        jslog=${VisualLogging.textField('url').track({ keydown: 'Enter', change: true })}
        @keydown=${(e) => {
        if (e.key === 'Enter') {
            e.consume(true);
            input.onEnter(e.target.value);
        }
    }}
        @change=${(e) => input.onInputChange(e.target.value)}
        autofocus>
    <devtools-button @click=${input.apply} .jslogContext=${'add'}
        .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}>${i18nString(UIStrings.add)}</devtools-button>`, target);
    // clang-format on
};
export class AddDebugInfoURLDialog extends UI.Widget.HBox {
    url = '';
    dialog;
    callback;
    constructor(label, jslogContext, callback, view = DEFAULT_VIEW) {
        super({ useShadowDom: true });
        const viewInput = {
            label,
            onEnter: this.onEnter.bind(this),
            onInputChange: this.onInputChange.bind(this),
            apply: this.apply.bind(this),
        };
        view(viewInput, undefined, this.contentElement);
        this.dialog = new UI.Dialog.Dialog(jslogContext);
        this.dialog.setSizeBehavior("MeasureContent" /* UI.GlassPane.SizeBehavior.MEASURE_CONTENT */);
        this.callback = callback;
    }
    static createAddSourceMapURLDialog(callback) {
        return new AddDebugInfoURLDialog(i18nString(UIStrings.sourceMapUrl), 'add-source-map-url', callback);
    }
    static createAddDWARFSymbolsURLDialog(callback) {
        return new AddDebugInfoURLDialog(i18nString(UIStrings.debugInfoUrl), 'add-debug-info-url', callback);
    }
    show() {
        super.show(this.dialog.contentElement);
        this.dialog.show();
    }
    done(value) {
        this.dialog.hide();
        this.callback(value);
    }
    onInputChange(value) {
        this.url = value;
    }
    apply() {
        this.done(this.url);
    }
    onEnter(value) {
        this.url = value;
        this.apply();
    }
}
//# sourceMappingURL=AddSourceMapURLDialog.js.map