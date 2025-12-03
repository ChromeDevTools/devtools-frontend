// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Trace from '../../../../models/trace/trace.js';
import * as UI from '../../../../ui/legacy/legacy.js';
import * as Lit from '../../../../ui/lit/lit.js';
import * as Utils from '../../utils/utils.js';
import baseInsightComponentStyles from './baseInsightComponent.css.js';
const { html, Directives: { ifDefined } } = Lit;
const { widgetConfig } = UI.Widget;
export class EventReferenceClick extends Event {
    event;
    static eventName = 'eventreferenceclick';
    constructor(event) {
        super(EventReferenceClick.eventName, { bubbles: true, composed: true });
        this.event = event;
    }
}
export const DEFAULT_VIEW = (input, output, target) => {
    const { text, event, } = input;
    // clang-format off
    Lit.render(html `
    <style>${baseInsightComponentStyles}</style>
    <button type="button" class="timeline-link" @click=${(e) => {
        e.stopPropagation();
        if (event) {
            target.dispatchEvent(new EventReferenceClick(event));
        }
    }}>${text}</button>
  `, target);
    // clang-format on
};
class EventRef extends UI.Widget.Widget {
    #view;
    #text = null;
    #event = null;
    constructor(element, view = DEFAULT_VIEW) {
        super(element, { useShadowDom: true });
        this.#view = view;
    }
    set text(text) {
        this.#text = text;
        this.requestUpdate();
    }
    set event(event) {
        this.#event = event;
        this.requestUpdate();
    }
    performUpdate() {
        if (!this.#text || !this.#event) {
            return;
        }
        const input = {
            text: this.#text,
            event: this.#event,
        };
        this.#view(input, undefined, this.contentElement);
    }
}
export function eventRef(event, options) {
    let title = options?.title;
    let text = options?.text;
    if (Trace.Types.Events.isSyntheticNetworkRequest(event)) {
        text = text ?? Utils.Helpers.shortenUrl(new URL(event.args.data.url));
        title = title ?? event.args.data.url;
    }
    else if (!text) {
        console.warn('No text given for eventRef');
        text = event.name;
    }
    return html `<devtools-widget title=${ifDefined(title)} .widgetConfig=${widgetConfig(EventRef, {
        event,
        text,
    })}></devtools-widget>`;
}
//# sourceMappingURL=EventRef.js.map