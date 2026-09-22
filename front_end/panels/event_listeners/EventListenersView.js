// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import objectPropertiesSectionStyles from '../../ui/legacy/components/object_ui/objectPropertiesSection.css.js';
import objectValueStyles from '../../ui/legacy/components/object_ui/objectValue.css.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { frameworkEventListeners } from './EventListenersUtils.js';
import eventListenersViewStyles from './eventListenersView.css.js';
const { widget, widgetRef } = UI.Widget;
const { html, render } = Lit;
const { repeat } = Lit.Directives;
const UIStrings = {
    /**
     * @description Empty holder text content in Event Listeners view of the Event Listeners sidebar in the Sources panel.
     */
    noEventListeners: 'No event listeners',
    /**
     * @description Empty holder text content in Event Listeners view of the Event Listeners sidebar in the Elements panel.
     */
    eventListenersExplanation: 'On this page you will find registered event listeners',
    /**
     * @description Delete button title in Event Listeners view of the Event Listeners sidebar in the Sources panel.
     */
    deleteEventListener: 'Delete event listener',
    /**
     * @description Passive button text content in Event Listeners view of the Event Listeners sidebar in the Sources panel.
     */
    togglePassive: 'Toggle passive',
    /**
     * @description Passive button title in Event Listeners view of the Event Listeners sidebar in the Sources panel.
     */
    toggleWhetherEventListenerIs: 'Toggle whether event listener is passive or blocking',
    /**
     * @description A context menu item to reveal a node in the DOM tree of the Elements panel.
     */
    openInElementsPanel: 'Open in Elements panel',
    /**
     * @description Text in Event Listeners widget of the Elements panel.
     */
    passive: 'Passive',
};
const str_ = i18n.i18n.registerUIStrings('panels/event_listeners/EventListenersView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const DEFAULT_VIEW = (input, output, target) => {
    const types = input.listeners.keys().toArray().sort();
    const onContextMenu = (event, listener, object) => {
        const menu = new UI.ContextMenu.ContextMenu(event);
        if (event.target instanceof HTMLElement && !event.target.closest('.event-listener-tree-subtitle') &&
            event.currentTarget instanceof HTMLElement) {
            const link = event.currentTarget.querySelector('.event-listener-tree-subtitle .devtools-link');
            if (link) {
                menu.appendApplicableItems(link);
            }
        }
        if (object.subtype === 'node') {
            menu.defaultSection().appendItem(i18nString(UIStrings.openInElementsPanel), () => input.reveal(object), { jslogContext: 'reveal-in-elements' });
        }
        menu.defaultSection().appendItem(i18nString(UIStrings.deleteEventListener), () => input.removeListener(listener), { disabled: !listener.canRemove(), jslogContext: 'delete-event-listener' });
        menu.defaultSection().appendCheckboxItem(i18nString(UIStrings.passive), () => input.togglePassiveListener(listener), {
            checked: listener.passive(),
            disabled: !listener.canTogglePassive(),
            jslogContext: 'passive',
        });
        void menu.show();
    };
    const shouldHide = (listenerOrType) => {
        if (!input.filter) {
            return false;
        }
        if (typeof listenerOrType === 'string') {
            return input.listeners.get(listenerOrType)?.every(({ listener }) => shouldHide(listener)) ?? true;
        }
        const listenerOrigin = listenerOrType.origin();
        if (listenerOrigin === "FrameworkUser" /* SDK.DOMDebuggerModel.EventListener.Origin.FRAMEWORK_USER */ && !input.filter.showFramework) {
            return true;
        }
        if (listenerOrigin === "Framework" /* SDK.DOMDebuggerModel.EventListener.Origin.FRAMEWORK */ && input.filter.showFramework) {
            return true;
        }
        if (!input.filter.showPassive && listenerOrType.passive()) {
            return true;
        }
        if (!input.filter.showBlocking && !listenerOrType.passive()) {
            return true;
        }
        return false;
    };
    const onKeyDown = (event, listener, object) => {
        if (event.target !== event.currentTarget) {
            return;
        }
        if (event.key === 'Delete' || event.key === 'Backspace') {
            if (input.removeListener(listener)) {
                event.consume();
            }
        }
        else if (event.key === 'Enter') {
            input.reveal(object);
            event.consume();
        }
    };
    const hasVisibleListeners = types.some(type => !shouldHide(type));
    // clang-format off
    render(html `
    <style>${eventListenersViewStyles}</style>
    ${!hasVisibleListeners ? html `
    <div autofocus class=placeholder><!--emptyHolder-->
      <span class=gray-info-message>${i18nString(UIStrings.noEventListeners)}</span>
      ${widget(UI.EmptyWidget.EmptyWidget, {
        header: i18nString(UIStrings.noEventListeners),
        text: i18nString(UIStrings.eventListenersExplanation),
    })}
    </div>` : html `
    <devtools-tree autofocus class="event-listener-tree monospace" show-selection-on-keyboard-focus .template=${html `
      <ul role=tree>
        <style>${eventListenersViewStyles}</style>
        <style>${objectValueStyles}</style>
        <style>${objectPropertiesSectionStyles}</style>
        ${repeat(types, type => type, type => html `
          <li role=treeitem toggle-on-click aria-label="${type}, event listener" ?hidden=${shouldHide(type)}>
           ${type}
           <ul role=group>
             ${repeat(input.listeners.get(type) ?? [], ({ listener }) => listener, ({ listener, object, objectTree }) => html `
               <li role=treeitem
                   data-origin=${listener.origin()}
                   @contextmenu=${(e) => onContextMenu(e, listener, object)}
                   @keydown=${(e) => onKeyDown(e, listener, object)}
                   ?hidden=${shouldHide(listener)}>
                 <span class=event-listener-details>
                   ${ObjectUI.ObjectPropertiesSection.renderPropertyValue(object, /* wasThrown */ false, /* showPreview */ false, input.linkifier)}
                   <devtools-button
                     .iconName=${'bin'}
                     .variant=${"icon" /* Buttons.Button.Variant.ICON */}
                     .size=${"MICRO" /* Buttons.Button.Size.MICRO */}
                     .jslogContext=${'delete-event-listener'}
                     title=${i18nString(UIStrings.deleteEventListener)}
                     @click=${(event) => { input.removeListener(listener); event.consume(); }}
                     ?hidden=${!listener.canRemove()}></devtools-button>
                   ${listener.isScrollBlockingType() && listener.canTogglePassive() ? html `
                     <button class=event-listener-button
                       jslog=${VisualLogging.action('passive').track({ click: true })}
                       title=${i18nString(UIStrings.toggleWhetherEventListenerIs)}
                       @click=${(e) => { input.togglePassiveListener(listener); e.consume(); }}>
                         ${i18nString(UIStrings.togglePassive)}
                     </button>` : Lit.nothing}
                   <span class=event-listener-tree-subtitle>
                     ${input.linkifier.linkifyRawLocation(listener.location(), listener.sourceURL(), /* FIXME template version */ undefined, { tabStop: true })}
                   </span>
                 </span>
                 <ul role=group ${widget(ObjectUI.ObjectPropertiesSection.ObjectTreeWidget, { objectTree })} ${widgetRef(ObjectUI.ObjectPropertiesSection.ObjectTreeWidget, () => { })}></ul>
               </li>`)}
             </ul>
          </li>`)}
      </ul>
    `}></devtools-tree>`}`, 
    // clang-format on
    target);
};
export class EventListenersView extends UI.Widget.VBox {
    #objects = [];
    #filter;
    #view;
    #listeners;
    #linkifier = new Components.Linkifier.Linkifier();
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.#view = view;
    }
    get objects() {
        return this.#objects;
    }
    set objects(val) {
        if (this.#objects === val) {
            return;
        }
        this.#listeners = undefined;
        this.#objects = val;
        this.requestUpdate();
    }
    get filter() {
        return this.#filter;
    }
    set filter(val) {
        if (this.#filter === val) {
            return;
        }
        this.#filter = val;
        this.requestUpdate();
    }
    async performUpdate() {
        let listeners = this.#listeners;
        if (!listeners && this.#objects) {
            const objects = this.#objects;
            listeners = await EventListenersView.#loadListeners(objects.filter((o) => !!o));
            if (this.#objects === objects) {
                this.#listeners = listeners;
            }
        }
        const input = {
            listeners: listeners ?? new Map(),
            filter: this.#filter,
            togglePassiveListener: (listener) => {
                void listener.togglePassive().then(() => {
                    this.#listeners = undefined;
                    this.requestUpdate();
                });
            },
            removeListener: (listener) => {
                if (!listener.canRemove()) {
                    return false;
                }
                void listener.remove();
                if (this.#listeners) {
                    const list = this.#listeners.get(listener.type());
                    if (list) {
                        const index = list.findIndex(item => item.listener === listener);
                        if (index !== -1) {
                            list.splice(index, 1);
                            if (list.length === 0) {
                                this.#listeners.delete(listener.type());
                            }
                        }
                    }
                }
                this.requestUpdate();
                return true;
            },
            reveal: (object) => {
                if (object.subtype === 'node') {
                    void Common.Revealer.reveal(object);
                }
            },
            linkifier: this.#linkifier,
        };
        this.#linkifier.reset();
        this.#view(input, {}, this.contentElement);
        this.eventListenersArrivedForTest();
    }
    static #createObjectTree(listener) {
        const object = SDK.RemoteObject.RemoteObject.fromLocalObject({
            useCapture: listener.useCapture(),
            passive: listener.passive(),
            once: listener.once(),
            ...(typeof listener.handler() !== 'undefined' ? { handler: listener.handler() } : {}),
        });
        const objectTree = new ObjectUI.ObjectPropertiesSection.ObjectTree(object, {
            readOnly: false,
            propertiesMode: 1 /* ObjectUI.ObjectPropertiesSection.ObjectPropertiesMode.OWN_AND_INTERNAL_AND_INHERITED */,
        });
        objectTree.expanded = true;
        return objectTree;
    }
    static async #loadListeners(objects) {
        return Map.groupBy((await Promise.all(objects.map(this.#loadListenersForObject))).flat(), ({ listener }) => listener.type());
    }
    static async #loadListenersForObject(object) {
        const domDebuggerModel = object.runtimeModel().target().model(SDK.DOMDebuggerModel.DOMDebuggerModel);
        const [eventListeners, frameworkEventListenersObject] = await Promise.all([domDebuggerModel?.eventListeners(object), frameworkEventListeners(object)]);
        // TODO(kozyatinskiy): figure out how this should work for |window| when there is no DOMDebugger.
        if (!eventListeners) {
            return [];
        }
        const isInternal = await frameworkEventListenersObject.internalHandlers?.object().callFunctionJSON(isInternalEventListener, eventListeners.map(listener => SDK.RemoteObject.RemoteObject.toCallArgument(listener.handler())));
        if (isInternal) {
            for (let i = 0; i < eventListeners.length; ++i) {
                if (isInternal[i]) {
                    eventListeners[i].markAsFramework();
                }
            }
        }
        return [eventListeners, frameworkEventListenersObject.eventListeners].flatMap(listeners => listeners.map(listener => ({ object, listener, objectTree: EventListenersView.#createObjectTree(listener) })));
        function isInternalEventListener() {
            const isInternal = [];
            const internalHandlersSet = new Set(this);
            for (const handler of arguments) {
                isInternal.push(internalHandlersSet.has(handler));
            }
            return isInternal;
        }
    }
    eventListenersArrivedForTest() {
    }
}
//# sourceMappingURL=EventListenersView.js.map