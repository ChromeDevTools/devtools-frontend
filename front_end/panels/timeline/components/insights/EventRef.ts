// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../../../models/trace/trace.js';
import * as UI from '../../../../ui/legacy/legacy.js';
import * as Lit from '../../../../ui/lit/lit.js';
import * as Utils from '../../utils/utils.js';

import baseInsightComponentStyles from './baseInsightComponent.css.js';

const {html, Directives: {ifDefined}} = Lit;
const {widgetConfig} = UI.Widget;

export class EventReferenceClick extends Event {
  static readonly eventName = 'eventreferenceclick';

  constructor(public event: Trace.Types.Events.Event) {
    super(EventReferenceClick.eventName, {bubbles: true, composed: true});
  }
}

interface ViewInput {
  text: string;
  event: Trace.Types.Events.Event;
}

type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, output, target) => {
  const {
    text,
    event,
  } = input;

  // clang-format off
  Lit.render(html`
    <style>${baseInsightComponentStyles}</style>
    <button type="button" class="timeline-link" @click=${(e: Event) => {
      e.stopPropagation();
      if (event) {
        target.dispatchEvent(new EventReferenceClick(event));
      }
    }}>${text}</button>
  `, target);
  // clang-format on
};

class EventRef extends UI.Widget.Widget {
  #view: View;
  #text: string|null = null;
  #event: Trace.Types.Events.Event|null = null;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element, {useShadowDom: true});
    this.#view = view;
  }

  set text(text: string) {
    this.#text = text;
    this.requestUpdate();
  }

  set event(event: Trace.Types.Events.Event) {
    this.#event = event;
    this.requestUpdate();
  }

  override performUpdate(): void {
    if (!this.#text || !this.#event) {
      return;
    }

    const input: ViewInput = {
      text: this.#text,
      event: this.#event,
    };
    this.#view(input, undefined, this.contentElement);
  }
}

export function eventRef(
    event: Trace.Types.Events.Event, options?: {text?: string, title?: string}): Lit.TemplateResult {
  let title = options?.title;
  let text = options?.text;
  if (Trace.Types.Events.isSyntheticNetworkRequest(event)) {
    text = text ?? Utils.Helpers.shortenUrl(new URL(event.args.data.url));
    title = title ?? event.args.data.url;
  } else if (!text) {
    console.warn('No text given for eventRef');
    text = event.name;
  }

  return html`<devtools-widget title=${ifDefined(title)} .widgetConfig=${widgetConfig(EventRef, {
    event,
    text,
  })}></devtools-widget>`;
}

declare global {
  interface GlobalEventHandlersEventMap {
    [EventReferenceClick.eventName]: EventReferenceClick;
  }
}
