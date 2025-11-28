// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Logs from '../../models/logs/logs.js';
import * as Trace from '../../models/trace/trace.js';
import * as Buttons from '../components/buttons/buttons.js';
import {html, render, type TemplateResult} from '../lit/lit.js';

import {Context} from './Context.js';
import floatyStyles from './floaty.css.js';
import {Widget} from './Widget.js';

let instance: Floaty|null = null;

export const enum FloatyContextTypes {
  ELEMENT_NODE_ID = 'ELEMENT_NODE_ID',
  NETWORK_REQUEST = 'NETWORK_REQUEST',
  PERFORMANCE_EVENT = 'PERFORMANCE_EVENT',
  PERFORMANCE_INSIGHT = 'PERFORMANCE_INSIGHT'
}

export type FloatyContextSelection = SDK.DOMModel.DOMNode|SDK.NetworkRequest.NetworkRequest|
                                     {event: Trace.Types.Events.Event, traceStartTime: Trace.Types.Timing.Micro}|
                                     {insight: Trace.Insights.Types.InsightModel, trace: Trace.TraceModel.ParsedTrace};

const enum State {
  READONLY = 'readonly',
  INSPECT_MODE = 'inspect',
}

export class FloatyFlavor {
  selectedContexts: FloatyContextSelection[] = [];

  constructor(contexts: Set<FloatyContextSelection>) {
    this.selectedContexts = Array.from(contexts);
  }
}

export class Floaty {
  static defaultVisibility = false;

  #container: HTMLElement;
  #floaty: FloatyUI;

  #boundKeyDown = this.#onKeyShortcut.bind(this);

  static exists(): boolean {
    return instance !== null;
  }

  static instance(opts: {
    forceNew: boolean|null,
    document: Document|null,
  } = {forceNew: null, document: null}): Floaty {
    if (instance) {
      return instance;
    }
    if (!opts.document) {
      throw new Error('document required');
    }
    instance = new Floaty(opts.document);
    return instance;
  }

  private constructor(document: Document) {
    // eslint-disable-next-line @devtools/no-imperative-dom-api
    this.#container = document.createElement('div');
    this.#container.classList.add('floaty-container');
    this.#floaty = new FloatyUI();
    this.#floaty.markAsRoot();
    this.#insertIntoDOM();
  }

  #onKeyShortcut(e: KeyboardEvent): void {
    if (e.key === 'f') {
      this.open();
    }
  }

  #insertIntoDOM(): void {
    if (Root.Runtime.hostConfig.devToolsGreenDevUi?.enabled) {
      this.#floaty.show(this.#container);
      document.body.appendChild(this.#container);
      document.body.addEventListener('keydown', this.#boundKeyDown);
    }
  }

  setDevToolsRect(rect: DOMRect): void {
    this.#floaty.devtoolsRect = rect;
  }

  open(): void {
    this.#floaty.open = true;
  }

  registerClick(input: Readonly<FloatyClickInput>): void {
    if (this.#floaty.state !== State.INSPECT_MODE) {
      return;
    }

    const type = input.type;  // Switching on type, rather than input.type, means TS narrows it properly.
    switch (type) {
      case FloatyContextTypes.ELEMENT_NODE_ID: {
        const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        if (!mainTarget) {
          return;
        }
        const domModel = mainTarget.model(SDK.DOMModel.DOMModel);
        const node = domModel?.nodeForId(input.data.nodeId);
        if (node) {
          this.#floaty.addSelectedContext(node);
        }
        break;
      }
      case FloatyContextTypes.NETWORK_REQUEST: {
        const networkRequests = Logs.NetworkLog.NetworkLog.instance().requestsForId(input.data.requestId);
        for (const req of networkRequests) {
          this.#floaty.addSelectedContext(req);
        }
        break;
      }
      case FloatyContextTypes.PERFORMANCE_EVENT: {
        this.#floaty.addSelectedContext(input.data);
        break;
      }
      case FloatyContextTypes.PERFORMANCE_INSIGHT: {
        this.#floaty.addSelectedContext(input.data);
        break;
      }
      default:
        Platform.assertNever(type, 'Unsupported Floaty Context type');
    }
  }

  inInspectMode(): boolean {
    return this.#floaty.state === State.INSPECT_MODE;
  }

  deleteContext(context: FloatyContextSelection): void {
    this.#floaty.removeSelectedContext(context);
  }
}

type FloatyClickInput = {
  type: FloatyContextTypes.ELEMENT_NODE_ID,
  data: {nodeId: Protocol.DOM.NodeId},
}|{
  type: FloatyContextTypes.NETWORK_REQUEST,
  data: {requestId: string},
}|{
  type: FloatyContextTypes.PERFORMANCE_EVENT,
  data: {event: Trace.Types.Events.Event, traceStartTime: Trace.Types.Timing.Micro},
}|{
  type: FloatyContextTypes.PERFORMANCE_INSIGHT,
  data: {
    insight: Trace.Insights.Types.InsightModel,
    trace: Trace.TraceModel.ParsedTrace,
  },
};

export function enabled(): boolean {
  return Root.Runtime.hostConfig.devToolsGreenDevUi?.enabled === true;
}

export function onFloatyOpen(): void {
  if (!enabled()) {
    return;
  }
  Floaty.instance().open();
}

export function onFloatyContextDelete(context: FloatyContextSelection): void {
  if (!enabled()) {
    return;
  }
  Floaty.instance().deleteContext(context);
}

/**
 * Registers a click to the Floaty.
 * @returns true if the element was added to the floaty context, and false
 * otherwise. This lets callers determine if this should override the default
 * click behaviour.
 */
export function onFloatyClick(input: FloatyClickInput): boolean {
  if (!enabled()) {
    return false;
  }
  const floaty = Floaty.instance();
  if (floaty.inInspectMode()) {
    floaty.registerClick(input);
    return true;
  }
  return false;
}

export class FloatyUI extends Widget {
  #view: (input: ViewInput, output: null, target: HTMLElement) => void;
  #dialog: HTMLDialogElement|null = null;
  #initialMouseX = 0;
  #initialMouseY = 0;
  #initialDialogLeft = 0;
  #initialDialogTop = 0;
  #devtoolsRect: DOMRect|null = null;
  #selectedContexts = new Set<FloatyContextSelection>();
  #open = Floaty.defaultVisibility;
  #state = State.READONLY;

  constructor(element?: HTMLElement, view = VIEW) {
    super(element);
    this.#view = view;
  }

  get devtoolsRect(): DOMRect|null {
    return this.#devtoolsRect;
  }

  get state(): State {
    return this.#state;
  }

  set state(x: State) {
    this.#state = x;
    this.requestUpdate();
  }

  set devtoolsRect(rect: DOMRect) {
    this.#devtoolsRect = rect;
    this.#repositionWithNewRect(rect);
    this.requestUpdate();
  }

  addSelectedContext(context: FloatyContextSelection): void {
    if (this.#selectedContexts.has(context)) {
      return;
    }

    this.#selectedContexts.add(context);
    Context.instance().setFlavor(FloatyFlavor, new FloatyFlavor(this.#selectedContexts));
    this.requestUpdate();
  }

  removeSelectedContext(context: FloatyContextSelection): void {
    this.#selectedContexts.delete(context);
    this.#state = State.READONLY;
    Context.instance().setFlavor(FloatyFlavor, new FloatyFlavor(this.#selectedContexts));
    this.requestUpdate();
  }

  get open(): boolean {
    return this.#open;
  }

  set open(open: boolean) {
    this.#open = open;
    this.requestUpdate();
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  #repositionWithNewRect(rect: DOMRect): void {
    if (!this.#dialog) {
      return;
    }
    const computedStyle = window.getComputedStyle(this.#dialog);
    const currentLeft = parseInt(computedStyle.left, 10);
    const currentTop = parseInt(computedStyle.top, 10);
    this.#dialog.style.left = `${Math.max(currentLeft, rect.left)}px`;
    this.#dialog.style.top = `${Math.max(currentTop, rect.top)}px`;
  }

  #onInspectClick(): void {
    if (this.#state === State.INSPECT_MODE) {
      this.#state = State.READONLY;
    } else {
      this.#state = State.INSPECT_MODE;
    }
    this.requestUpdate();
  }

  #onDialogClose(e: PointerEvent): void {
    e.preventDefault();
    this.#open = false;
    this.requestUpdate();
  }

  #onContextDelete(context: FloatyContextSelection): (e: MouseEvent) => void {
    return e => {
      e.preventDefault();
      this.removeSelectedContext(context);
    };
  }

  override performUpdate(): void {
    this.#view(
        {
          open: this.open,
          onDragStart: this.#onDragStart,
          selectedContexts: this.#selectedContexts,
          state: this.#state,
          onInspectClick: this.#onInspectClick.bind(this),
          onDialogClose: this.#onDialogClose.bind(this),
          onContextDelete: this.#onContextDelete.bind(this)
        },
        null, this.contentElement);
    this.#dialog = this.contentElement.querySelector('dialog');
  }

  #onDragStart = (event: MouseEvent): void => {
    if (!this.#dialog) {
      return;
    }
    this.#initialMouseX = event.clientX;
    this.#initialMouseY = event.clientY;
    const computedStyle = window.getComputedStyle(this.#dialog);
    this.#initialDialogLeft = parseInt(computedStyle.left, 10);
    this.#initialDialogTop = parseInt(computedStyle.top, 10);

    document.addEventListener('mousemove', this.#onDrag);
    document.addEventListener('mouseup', this.#onDragEnd);
  };

  #onDrag = (event: MouseEvent): void => {
    if (!this.#dialog) {
      return;
    }
    const deltaX = event.clientX - this.#initialMouseX;
    const deltaY = event.clientY - this.#initialMouseY;

    const minLeft = this.#devtoolsRect?.left ?? 0;
    const minTop = this.#devtoolsRect?.top ?? 0;
    const newLeft = Math.max(minLeft, this.#initialDialogLeft + deltaX);
    const newTop = Math.max(minTop, this.#initialDialogTop + deltaY);
    this.#dialog.style.left = `${newLeft}px`;
    this.#dialog.style.top = `${newTop}px`;
  };

  #onDragEnd = (): void => {
    document.removeEventListener('mousemove', this.#onDrag);
    document.removeEventListener('mouseup', this.#onDragEnd);
  };
}

interface ViewInput {
  onDragStart: (event: MouseEvent) => void;
  selectedContexts: ReadonlySet<FloatyContextSelection>;
  open: boolean;
  state: State;
  onInspectClick: () => void;
  onDialogClose: (e: PointerEvent) => void;
  onContextDelete: (item: FloatyContextSelection) => (e: MouseEvent) => void;
}

const VIEW = (input: ViewInput, _output: null, target: HTMLElement): void => {
  const contexts = Array.from(input.selectedContexts);
  // clang-format off
  render(html`
   <style>${floatyStyles}</style>
   <dialog ?open=${input.open} @mousedown=${input.onDragStart}>
    <header>
      <span>DevTools context picker</span>
      <devtools-button
        class="close-button"
        @click=${input.onDialogClose}
        .data=${{
          variant: Buttons.Button.Variant.TOOLBAR,
          iconName: 'cross',
          title: 'Close',
          size: Buttons.Button.Size.SMALL,
        } as Buttons.Button.ButtonData}
      ></devtools-button>
    </header>
    <section class="body">
      <section class="contexts">
      ${contexts.length === 0 ? html`
        <span class="no-context">Select items to add them to the AI agent's context.</span>
        ` : html`
        <ul class="floaty-contexts">
          ${contexts.map(context => {
            return html`<li>
            <span class="context-item">
              ${floatyContextToUI(context)}
            </span>
            <devtools-button
              class="close-button"
              @click=${input.onContextDelete(context)}
              .data=${{
                variant: Buttons.Button.Variant.TOOLBAR,
                iconName: 'cross',
                title: 'Delete',
                size: Buttons.Button.Size.SMALL,
              } as Buttons.Button.ButtonData}
            ></devtools-button>
            </li>`;
          })}
        </ul>
      `}
      </section>
      <section class="actions">
          <devtools-button title="Select" @click=${input.onInspectClick}
            .active=${input.state === State.INSPECT_MODE}
            .variant=${Buttons.Button.Variant.TONAL} .iconName=${'select-element'}
          >Select</devtools-button>
        </devtools-toolbar>
      </section>
    </section>
   </dialog>`,
  target);
  // clang-format on
};

function floatyContextToUI(context: FloatyContextSelection): TemplateResult {
  if (context instanceof SDK.NetworkRequest.NetworkRequest) {
    return html`${context.url()}`;
  }
  if (context instanceof SDK.DOMModel.DOMNode) {
    return html`${context.simpleSelector()}`;
  }
  if ('insight' in context) {
    return html`Insight: ${context.insight.title}`;
  }
  if ('event' in context && 'traceStartTime' in context) {
    const time = Trace.Types.Timing.Micro(context.event.ts - context.traceStartTime);
    return html`${context.event.name} @ ${i18n.TimeUtilities.formatMicroSecondsAsMillisFixed(time)}`;
  }

  Platform.assertNever(context, '');
}
