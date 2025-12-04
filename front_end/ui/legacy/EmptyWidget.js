// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import { Directives, html, render } from '../lit/lit.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';
import emptyWidgetStyles from './emptyWidget.css.js';
import inspectorCommonStyles from './inspectorCommon.css.js';
import { VBox } from './Widget.js';
import { XLink } from './XLink.js';
const UIStrings = {
    /**
     * @description Text that is usually a hyperlink to more documentation
     */
    learnMore: 'Learn more',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/EmptyWidget.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const { ref } = Directives;
const DEFAULT_VIEW = (input, output, target) => {
    // clang-format off
    render(html `
    <style>${inspectorCommonStyles}</style>
    <style>${emptyWidgetStyles}</style>
    <div class="empty-state" jslog=${VisualLogging.section('empty-view')}
         ${ref(e => { output.contentElement = e; })}>
      <div class="empty-state-header">${input.header}</div>
      <div class="empty-state-description">
        <span>${input.text}</span>
        ${input.link ? XLink.create(input.link, i18nString(UIStrings.learnMore), undefined, undefined, 'learn-more') : ''}
      </div>
      ${input.extraElements}
    </div>`, target);
    // clang-format on
};
export class EmptyWidget extends VBox {
    #header;
    #text;
    #link;
    #view;
    #firstUpdate = true;
    #extraElements = [];
    constructor(headerOrElement, text = '', element, view = DEFAULT_VIEW) {
        const header = typeof headerOrElement === 'string' ? headerOrElement : '';
        if (!element && headerOrElement instanceof HTMLElement) {
            element = headerOrElement;
        }
        super(element, { classes: ['empty-view-scroller'] });
        this.#header = header;
        this.#text = text;
        this.#link = undefined;
        this.#view = view;
        this.performUpdate();
    }
    set link(link) {
        this.#link = link;
        this.performUpdate();
    }
    set text(text) {
        this.#text = text;
        this.performUpdate();
    }
    set header(header) {
        this.#header = header;
        this.performUpdate();
    }
    set extraElements(elements) {
        this.#extraElements = elements;
        this.#firstUpdate = false;
        this.requestUpdate();
    }
    performUpdate() {
        if (this.#firstUpdate) {
            this.#extraElements = [...this.element.children];
            this.#firstUpdate = false;
        }
        const output = { contentElement: undefined };
        this.#view({ header: this.#header, text: this.#text, link: this.#link, extraElements: this.#extraElements }, output, this.element);
        if (output.contentElement) {
            this.contentElement = output.contentElement;
        }
    }
}
//# sourceMappingURL=EmptyWidget.js.map