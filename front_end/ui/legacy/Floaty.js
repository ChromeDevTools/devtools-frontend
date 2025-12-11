// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as GreenDev from '../../models/greendev/greendev.js';
import * as Logs from '../../models/logs/logs.js';
import * as Trace from '../../models/trace/trace.js';
import * as Buttons from '../components/buttons/buttons.js';
import { html, render } from '../lit/lit.js';
import { Context } from './Context.js';
import floatyStyles from './floaty.css.js';
import { Widget } from './Widget.js';
let instance = null;
export class FloatyFlavor {
    selectedContexts = [];
    constructor(contexts) {
        this.selectedContexts = Array.from(contexts);
    }
}
export class Floaty {
    static defaultVisibility = false;
    #container;
    #floaty;
    #boundKeyDown = this.#onKeyShortcut.bind(this);
    static exists() {
        return instance !== null;
    }
    static instance(opts = { forceNew: null, document: null }) {
        if (instance) {
            return instance;
        }
        if (!opts.document) {
            throw new Error('document required');
        }
        instance = new Floaty(opts.document);
        return instance;
    }
    constructor(document) {
        // eslint-disable-next-line @devtools/no-imperative-dom-api
        this.#container = document.createElement('div');
        this.#container.classList.add('floaty-container');
        this.#floaty = new FloatyUI();
        this.#floaty.markAsRoot();
        this.#insertIntoDOM();
    }
    #onKeyShortcut(e) {
        const origin = e.composedPath().at(0);
        // If the user was typing into an input field, don't make it trigger the Floaty.
        if (origin && (origin instanceof HTMLTextAreaElement || origin instanceof HTMLInputElement)) {
            return;
        }
        if (e.key === 'f') {
            this.open();
        }
    }
    #insertIntoDOM() {
        if (GreenDev.Prototypes.instance().isEnabled('inDevToolsFloaty')) {
            this.#floaty.show(this.#container);
            document.body.appendChild(this.#container);
            document.body.addEventListener('keydown', this.#boundKeyDown);
        }
    }
    setDevToolsRect(rect) {
        this.#floaty.devtoolsRect = rect;
    }
    open() {
        this.#floaty.open = true;
    }
    registerClick(input) {
        if (this.#floaty.state !== "inspect" /* State.INSPECT_MODE */) {
            return;
        }
        const type = input.type; // Switching on type, rather than input.type, means TS narrows it properly.
        switch (type) {
            case "ELEMENT_NODE_ID" /* FloatyContextTypes.ELEMENT_NODE_ID */: {
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
            case "NETWORK_REQUEST" /* FloatyContextTypes.NETWORK_REQUEST */: {
                const networkRequests = Logs.NetworkLog.NetworkLog.instance().requestsForId(input.data.requestId);
                for (const req of networkRequests) {
                    this.#floaty.addSelectedContext(req);
                }
                break;
            }
            case "PERFORMANCE_EVENT" /* FloatyContextTypes.PERFORMANCE_EVENT */: {
                this.#floaty.addSelectedContext(input.data);
                break;
            }
            case "PERFORMANCE_INSIGHT" /* FloatyContextTypes.PERFORMANCE_INSIGHT */: {
                this.#floaty.addSelectedContext(input.data);
                break;
            }
            default:
                Platform.assertNever(type, 'Unsupported Floaty Context type');
        }
    }
    inInspectMode() {
        return this.#floaty.state === "inspect" /* State.INSPECT_MODE */;
    }
    deleteContext(context) {
        this.#floaty.removeSelectedContext(context);
    }
}
export function onFloatyOpen() {
    if (!GreenDev.Prototypes.instance().isEnabled('inDevToolsFloaty')) {
        return;
    }
    Floaty.instance().open();
}
export function onFloatyContextDelete(context) {
    if (!GreenDev.Prototypes.instance().isEnabled('inDevToolsFloaty')) {
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
export function onFloatyClick(input) {
    if (!GreenDev.Prototypes.instance().isEnabled('inDevToolsFloaty')) {
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
    #view;
    #dialog = null;
    #initialMouseX = 0;
    #initialMouseY = 0;
    #initialDialogLeft = 0;
    #initialDialogTop = 0;
    #devtoolsRect = null;
    #selectedContexts = new Set();
    #open = Floaty.defaultVisibility;
    #state = "readonly" /* State.READONLY */;
    constructor(element, view = VIEW) {
        super(element);
        this.#view = view;
    }
    get devtoolsRect() {
        return this.#devtoolsRect;
    }
    get state() {
        return this.#state;
    }
    set state(x) {
        this.#state = x;
        this.requestUpdate();
    }
    set devtoolsRect(rect) {
        this.#devtoolsRect = rect;
        this.#repositionWithNewRect(rect);
        this.requestUpdate();
    }
    addSelectedContext(context) {
        if (this.#selectedContexts.has(context)) {
            return;
        }
        this.#selectedContexts.add(context);
        Context.instance().setFlavor(FloatyFlavor, new FloatyFlavor(this.#selectedContexts));
        this.requestUpdate();
    }
    removeSelectedContext(context) {
        this.#selectedContexts.delete(context);
        this.#state = "readonly" /* State.READONLY */;
        Context.instance().setFlavor(FloatyFlavor, new FloatyFlavor(this.#selectedContexts));
        this.requestUpdate();
    }
    get open() {
        return this.#open;
    }
    set open(open) {
        this.#open = open;
        this.requestUpdate();
    }
    wasShown() {
        super.wasShown();
        this.requestUpdate();
    }
    #repositionWithNewRect(rect) {
        if (!this.#dialog) {
            return;
        }
        const computedStyle = window.getComputedStyle(this.#dialog);
        const currentLeft = parseInt(computedStyle.left, 10);
        const currentTop = parseInt(computedStyle.top, 10);
        this.#dialog.style.left = `${Math.max(currentLeft, rect.left)}px`;
        this.#dialog.style.top = `${Math.max(currentTop, rect.top)}px`;
    }
    #onInspectClick() {
        if (this.#state === "inspect" /* State.INSPECT_MODE */) {
            this.#state = "readonly" /* State.READONLY */;
        }
        else {
            this.#state = "inspect" /* State.INSPECT_MODE */;
        }
        this.requestUpdate();
    }
    #onDialogClose(e) {
        e.preventDefault();
        this.#open = false;
        this.requestUpdate();
    }
    #onContextDelete(context) {
        return e => {
            e.preventDefault();
            this.removeSelectedContext(context);
        };
    }
    performUpdate() {
        this.#view({
            open: this.open,
            onDragStart: this.#onDragStart,
            selectedContexts: this.#selectedContexts,
            state: this.#state,
            onInspectClick: this.#onInspectClick.bind(this),
            onDialogClose: this.#onDialogClose.bind(this),
            onContextDelete: this.#onContextDelete.bind(this)
        }, null, this.contentElement);
        this.#dialog = this.contentElement.querySelector('dialog');
    }
    #onDragStart = (event) => {
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
    #onDrag = (event) => {
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
    #onDragEnd = () => {
        document.removeEventListener('mousemove', this.#onDrag);
        document.removeEventListener('mouseup', this.#onDragEnd);
    };
}
const VIEW = (input, _output, target) => {
    const contexts = Array.from(input.selectedContexts);
    // clang-format off
    render(html `
   <style>${floatyStyles}</style>
   <dialog ?open=${input.open} @mousedown=${input.onDragStart}>
    <header>
      <span>DevTools context picker</span>
      <devtools-button
        class="close-button"
        @click=${input.onDialogClose}
        .data=${{
        variant: "toolbar" /* Buttons.Button.Variant.TOOLBAR */,
        iconName: 'cross',
        title: 'Close',
        size: "SMALL" /* Buttons.Button.Size.SMALL */,
    }}
      ></devtools-button>
    </header>
    <section class="body">
      <section class="contexts">
      ${contexts.length === 0 ? html `
        <span class="no-context">Select items to add them to the AI agent's context.</span>
        ` : html `
        <ul class="floaty-contexts">
          ${contexts.map(context => {
        return html `<li>
            <span class="context-item">
              ${floatyContextToUI(context)}
            </span>
            <devtools-button
              class="close-button"
              @click=${input.onContextDelete(context)}
              .data=${{
            variant: "toolbar" /* Buttons.Button.Variant.TOOLBAR */,
            iconName: 'cross',
            title: 'Delete',
            size: "SMALL" /* Buttons.Button.Size.SMALL */,
        }}
            ></devtools-button>
            </li>`;
    })}
        </ul>
      `}
      </section>
      <section class="actions">
          <devtools-button title="Select" @click=${input.onInspectClick}
            .active=${input.state === "inspect" /* State.INSPECT_MODE */}
            .variant=${"tonal" /* Buttons.Button.Variant.TONAL */} .iconName=${'select-element'}
          >Select</devtools-button>
        </devtools-toolbar>
      </section>
    </section>
   </dialog>`, target);
    // clang-format on
};
function floatyContextToUI(context) {
    if (context instanceof SDK.NetworkRequest.NetworkRequest) {
        return html `${context.url()}`;
    }
    if (context instanceof SDK.DOMModel.DOMNode) {
        return html `${context.simpleSelector()}`;
    }
    if ('insight' in context) {
        return html `Insight: ${context.insight.title}`;
    }
    if ('event' in context && 'traceStartTime' in context) {
        const time = Trace.Types.Timing.Micro(context.event.ts - context.traceStartTime);
        return html `${context.event.name} @ ${i18n.TimeUtilities.formatMicroSecondsAsMillisFixed(time)}`;
    }
    Platform.assertNever(context, '');
}
//# sourceMappingURL=Floaty.js.map