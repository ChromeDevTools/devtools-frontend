// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import * as Platform from '../../../../core/platform/platform.js';
import * as Buttons from '../../../components/buttons/buttons.js';
import * as Lit from '../../../lit/lit.js';
import * as VisualLogging from '../../../visual_logging/visual_logging.js';
import linkSwatchStyles from './linkSwatch.css.js';
const { render, html, nothing, Directives: { ref, ifDefined, classMap } } = Lit;
export class LinkSwatch extends HTMLElement {
    onLinkActivate = () => undefined;
    #linkElement;
    connectedCallback() {
    }
    set data(data) {
        this.onLinkActivate = (linkText, event) => {
            if (event instanceof MouseEvent && event.button !== 0) {
                return;
            }
            if (event instanceof KeyboardEvent && event.key !== Platform.KeyboardUtilities.ENTER_KEY && event.key !== ' ') {
                return;
            }
            data.onLinkActivate(linkText);
            event.consume(true);
        };
        this.render(data);
    }
    get linkElement() {
        return this.#linkElement;
    }
    render(data) {
        const { isDefined, text, jslogContext, tooltip } = data;
        const classes = classMap({
            'link-style': true,
            'text-button': true,
            'link-swatch-link': true,
            undefined: !isDefined,
        });
        // The linkText's space must be removed, otherwise it cannot be triggered when clicked.
        const onActivate = isDefined ? this.onLinkActivate.bind(this, text.trim()) : null;
        const title = tooltip && 'title' in tooltip && tooltip.title || undefined;
        const tooltipId = tooltip && 'tooltipId' in tooltip && tooltip.tooltipId || undefined;
        // clang-format off
        render(html `
        <style>${Buttons.textButtonStyles}</style>
        <style>${linkSwatchStyles}</style>
        <button .disabled=${!isDefined} class=${classes} type="button" title=${ifDefined(title)}
                aria-details=${ifDefined(tooltipId)} @click=${onActivate} @keydown=${onActivate}
                role="link"
                jslog=${jslogContext ? VisualLogging.link().track({ click: true }).context(jslogContext) : nothing}
                tabindex=${ifDefined(isDefined ? -1 : undefined)}
                ${ref(e => { this.#linkElement = e; })}>
           ${text}
        </button>`, this);
        // clang-format on
    }
}
customElements.define('devtools-link-swatch', LinkSwatch);
//# sourceMappingURL=LinkSwatch.js.map