// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../../ui/legacy/legacy.js';
import { html, nothing, render } from '../../../ui/lit/lit.js';
import accessibilityTreeNodeStyles from './accessibilityTreeNode.css.js';
const UIStrings = {
    /**
     * @description Ignored node element text content in Accessibility Tree View of the Elements panel
     */
    ignored: 'Ignored',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/components/AccessibilityTreeNode.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/**
 * TODO(jobay) move this to Platform.StringUtilities if still needed.
 * This function is a variant of setTextContentTruncatedIfNeeded found in DOMExtension.
 **/
function truncateTextIfNeeded(text) {
    const maxTextContentLength = 10000;
    if (text.length > maxTextContentLength) {
        return Platform.StringUtilities.trimMiddle(text, maxTextContentLength);
    }
    return text;
}
function isPrintable(valueType) {
    switch (valueType) {
        case "boolean" /* Protocol.Accessibility.AXValueType.Boolean */:
        case "booleanOrUndefined" /* Protocol.Accessibility.AXValueType.BooleanOrUndefined */:
        case "string" /* Protocol.Accessibility.AXValueType.String */:
        case "number" /* Protocol.Accessibility.AXValueType.Number */:
            return true;
        default:
            return false;
    }
}
export class AccessibilityTreeNode extends HTMLElement {
    #shadow = UI.UIUtils.createShadowRootWithCoreStyles(this, { cssFile: accessibilityTreeNodeStyles });
    #ignored = true;
    #name = '';
    #role = '';
    #properties = [];
    #id = '';
    set data(data) {
        this.#ignored = data.ignored;
        this.#name = data.name;
        this.#role = data.role;
        this.#properties = data.properties;
        this.#id = data.id;
        void this.#render();
    }
    async #render() {
        const role = html `<span class='role-value'>${truncateTextIfNeeded(this.#role)}</span>`;
        const name = html `"<span class='attribute-value'>${this.#name}</span>"`;
        const properties = this.#properties.map(({ name, value }) => isPrintable(value.type) ?
            html ` <span class='attribute-name'>${name}</span>:&nbsp;<span class='attribute-value'>${value.value}</span>` :
            nothing);
        const content = this.#ignored ? html `<span>${i18nString(UIStrings.ignored)}</span>` : html `${role}&nbsp;${name}${properties}`;
        await RenderCoordinator.write(`Accessibility node ${this.#id} render`, () => {
            // clang-format off
            render(html `<div class='container'>${content}</div>`, this.#shadow, { host: this });
            // clang-format on
        });
    }
}
customElements.define('devtools-accessibility-tree-node', AccessibilityTreeNode);
//# sourceMappingURL=AccessibilityTreeNode.js.map