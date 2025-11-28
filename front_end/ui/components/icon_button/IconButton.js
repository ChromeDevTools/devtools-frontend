// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view, @devtools/enforce-custom-element-definitions-location */
import '../../kit/kit.js';
import * as Lit from '../../lit/lit.js';
import iconButtonStyles from './iconButton.css.js';
const { html } = Lit;
export class IconButton extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #clickHandler = undefined;
    #groups = [];
    #compact = false;
    #leadingText = '';
    #trailingText = '';
    #accessibleName;
    set data(data) {
        this.#groups = data.groups.map(group => ({ ...group })); // Ensure we make a deep copy.
        this.#clickHandler = data.clickHandler;
        this.#trailingText = data.trailingText ?? '';
        this.#leadingText = data.leadingText ?? '';
        this.#accessibleName = data.accessibleName;
        this.#compact = Boolean(data.compact);
        this.#render();
    }
    get data() {
        return {
            groups: this.#groups.map(group => ({ ...group })), // Ensure we make a deep copy.
            accessibleName: this.#accessibleName,
            clickHandler: this.#clickHandler,
            leadingText: this.#leadingText,
            trailingText: this.#trailingText,
            compact: this.#compact,
        };
    }
    #onClickHandler(event) {
        if (this.#clickHandler) {
            event.preventDefault();
            this.#clickHandler();
        }
    }
    #render() {
        const buttonClasses = Lit.Directives.classMap({
            'icon-button': true,
            'with-click-handler': Boolean(this.#clickHandler),
            compact: this.#compact,
        });
        const filteredGroups = this.#groups.filter(counter => counter.text !== undefined)
            .filter((_, index) => this.#compact ? index === 0 : true);
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        Lit.render(html `
      <style>${iconButtonStyles}</style>
      <button class=${buttonClasses} @click=${this.#onClickHandler} aria-label=${Lit.Directives.ifDefined(this.#accessibleName)}>
      ${(!this.#compact && this.#leadingText) ? html `<span class="icon-button-title">${this.#leadingText}</span>` : Lit.nothing}
      ${filteredGroups.map(counter => html `
      <devtools-icon class="status-icon" name=${counter.iconName} style="color: ${counter.iconColor}; width: ${counter.iconWidth || 'var(--sys-size-7)'}; height: ${counter.iconHeight || 'var(--sys-size-7)'}">
      </devtools-icon>
      ${this.#compact ? html `<!-- Force line-height for this element --><span>&#8203;</span>` : Lit.nothing}
      <span class="icon-button-title">${counter.text}</span>`)}
      </button>
      ${(!this.#compact && this.#trailingText) ? html `<span class="icon-button-title">${this.#trailingText}</span>` : Lit.nothing}
    `, this.#shadow, { host: this });
        // clang-format on
    }
}
// eslint-disable-next-line @devtools/enforce-custom-element-prefix
customElements.define('icon-button', IconButton);
//# sourceMappingURL=IconButton.js.map