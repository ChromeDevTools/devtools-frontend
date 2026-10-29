// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as UI from '../../../ui/legacy/legacy.js';
import { html, nothing, render } from '../../../ui/lit/lit.js';
import accessibilityTreeNodeStyles from './accessibilityTreeNode.css.js';
const UIStrings = {
    /**
     * @description Ignored node element text content in the accessibility tree view of the Elements panel.
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
export const DEFAULT_VIEW = (input, _output, target) => {
    const role = html `<span class='role-value'>${truncateTextIfNeeded(input.role)}</span>`;
    const name = html `"<span class='attribute-value'>${input.name}</span>"`;
    const properties = input.properties.map(({ name, value }) => SDK.AccessibilityModel.isPrintableType(value.type) ?
        html ` <span class='attribute-name'>${name}</span>:&nbsp;<span class='attribute-value'>${value.value}</span>` :
        nothing);
    const content = input.ignored ? html `<span>${i18nString(UIStrings.ignored)}</span>` : html `${role}&nbsp;${name}${properties}`;
    // clang-format off
    render(html `
      <style>${accessibilityTreeNodeStyles}</style>
      <div class='container'>${content}</div>
    `, target);
    // clang-format on
};
export class AccessibilityTreeNode extends UI.Widget.Widget {
    #ignored = true;
    #name = '';
    #role = '';
    #properties = [];
    #view;
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.#view = view;
    }
    set ignored(ignored) {
        if (this.#ignored === ignored) {
            return;
        }
        this.#ignored = ignored;
        this.requestUpdate();
    }
    set name(name) {
        if (this.#name === name) {
            return;
        }
        this.#name = name;
        this.requestUpdate();
    }
    set role(role) {
        if (this.#role === role) {
            return;
        }
        this.#role = role;
        this.requestUpdate();
    }
    set properties(properties) {
        if (this.#properties === properties) {
            return;
        }
        this.#properties = properties;
        this.requestUpdate();
    }
    performUpdate() {
        this.#view({
            ignored: this.#ignored,
            name: this.#name,
            role: this.#role,
            properties: this.#properties,
        }, undefined, this.contentElement);
    }
}
//# sourceMappingURL=AccessibilityTreeNode.js.map