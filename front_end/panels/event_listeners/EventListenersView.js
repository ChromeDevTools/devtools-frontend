// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
/* eslint-disable @devtools/es-modules-import */
import objectValueStyles from '../../ui/legacy/components/object_ui/objectValue.css.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { frameworkEventListeners } from './EventListenersUtils.js';
import eventListenersViewStyles from './eventListenersView.css.js';
const UIStrings = {
    /**
     * @description Empty holder text content in Event Listeners View of the Event Listener Debugging pane in the Sources panel
     */
    noEventListeners: 'No event listeners',
    /**
     * @description Empty holder text content in Event Listeners View of the Event Listener Debugging pane in the Elements panel
     */
    eventListenersExplanation: 'On this page you will find registered event listeners',
    /**
     * @description Delete button title in Event Listeners View of the Event Listener Debugging pane in the Sources panel
     */
    deleteEventListener: 'Delete event listener',
    /**
     * @description Passive button text content in Event Listeners View of the Event Listener Debugging pane in the Sources panel
     */
    togglePassive: 'Toggle Passive',
    /**
     * @description Passive button title in Event Listeners View of the Event Listener Debugging pane in the Sources panel
     */
    toggleWhetherEventListenerIs: 'Toggle whether event listener is passive or blocking',
    /**
     * @description A context menu item to reveal a node in the DOM tree of the Elements Panel
     */
    openInElementsPanel: 'Open in Elements panel',
    /**
     * @description Text in Event Listeners Widget of the Elements panel
     */
    passive: 'Passive',
};
const str_ = i18n.i18n.registerUIStrings('panels/event_listeners/EventListenersView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class EventListenersView extends UI.Widget.VBox {
    changeCallback = () => { };
    enableDefaultTreeFocus = false;
    treeOutline;
    emptyHolder;
    objects = [];
    filter;
    #linkifier = new Components.Linkifier.Linkifier();
    #treeItemMap = new Map();
    constructor(element) {
        super(element);
        this.registerRequiredCSS(eventListenersViewStyles);
        this.emptyHolder = this.element.createChild('div', 'placeholder hidden');
        this.emptyHolder.createChild('span', 'gray-info-message').textContent = i18nString(UIStrings.noEventListeners);
        const emptyWidget = new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.noEventListeners), i18nString(UIStrings.eventListenersExplanation));
        emptyWidget.show(this.emptyHolder);
        this.treeOutline = new UI.TreeOutline.TreeOutlineInShadow();
        this.treeOutline.setComparator(EventListenersTreeElement.comparator);
        this.treeOutline.element.classList.add('event-listener-tree', 'monospace');
        this.treeOutline.setShowSelectionOnKeyboardFocus(true);
        this.treeOutline.setFocusable(true);
        this.treeOutline.registerRequiredCSS(eventListenersViewStyles, objectValueStyles);
        this.element.appendChild(this.treeOutline.element);
    }
    focus() {
        if (!this.enableDefaultTreeFocus) {
            return;
        }
        if (!this.emptyHolder.classList.contains('hidden')) {
            this.treeOutline.forceSelect();
        }
        else {
            this.emptyHolder.focus();
        }
    }
    async performUpdate() {
        await this.addObjects(this.objects);
        if (this.filter) {
            this.showFrameworkListeners(this.filter.showFramework, this.filter.showPassive, this.filter.showBlocking);
        }
    }
    async addObjects(objects) {
        // Remove existing event listeners and reset linkifier first.
        const eventTypes = this.treeOutline.rootElement().children();
        for (const eventType of eventTypes) {
            eventType.removeChildren();
        }
        this.#linkifier.reset();
        await Promise.all(objects.map(obj => obj ? this.addObject(obj) : Promise.resolve()));
        this.addEmptyHolderIfNeeded();
        this.eventListenersArrivedForTest();
    }
    addObject(object) {
        let eventListeners;
        let frameworkEventListenersObject = null;
        const promises = [];
        const domDebuggerModel = object.runtimeModel().target().model(SDK.DOMDebuggerModel.DOMDebuggerModel);
        // TODO(kozyatinskiy): figure out how this should work for |window| when there is no DOMDebugger.
        if (domDebuggerModel) {
            promises.push(domDebuggerModel.eventListeners(object).then(storeEventListeners));
        }
        promises.push(frameworkEventListeners(object).then(storeFrameworkEventListenersObject));
        return Promise.all(promises).then(markInternalEventListeners).then(addEventListeners.bind(this));
        function storeEventListeners(result) {
            eventListeners = result;
        }
        function storeFrameworkEventListenersObject(result) {
            frameworkEventListenersObject = result;
        }
        async function markInternalEventListeners() {
            if (!frameworkEventListenersObject) {
                return;
            }
            if (!frameworkEventListenersObject.internalHandlers) {
                return;
            }
            return await frameworkEventListenersObject.internalHandlers.object()
                .callFunctionJSON(isInternalEventListener, eventListeners.map(handlerArgument))
                .then(setIsInternal);
            function handlerArgument(listener) {
                return SDK.RemoteObject.RemoteObject.toCallArgument(listener.handler());
            }
            function isInternalEventListener() {
                const isInternal = [];
                const internalHandlersSet = new Set(this);
                for (const handler of arguments) {
                    isInternal.push(internalHandlersSet.has(handler));
                }
                return isInternal;
            }
            function setIsInternal(isInternal) {
                if (!isInternal) {
                    return;
                }
                for (let i = 0; i < eventListeners.length; ++i) {
                    if (isInternal[i]) {
                        eventListeners[i].markAsFramework();
                    }
                }
            }
        }
        function addEventListeners() {
            this.addObjectEventListeners(object, eventListeners);
            if (frameworkEventListenersObject) {
                this.addObjectEventListeners(object, frameworkEventListenersObject.eventListeners);
            }
        }
    }
    addObjectEventListeners(object, eventListeners) {
        if (!eventListeners) {
            return;
        }
        for (const eventListener of eventListeners) {
            const treeItem = this.getOrCreateTreeElementForType(eventListener.type());
            treeItem.addObjectEventListener(eventListener, object);
        }
    }
    showFrameworkListeners(showFramework, showPassive, showBlocking) {
        const eventTypes = this.treeOutline.rootElement().children();
        for (const eventType of eventTypes) {
            let hiddenEventType = true;
            for (const listenerElement of eventType.children()) {
                const objectListenerElement = listenerElement;
                const listenerOrigin = objectListenerElement.eventListener().origin();
                let hidden = false;
                if (listenerOrigin === "FrameworkUser" /* SDK.DOMDebuggerModel.EventListener.Origin.FRAMEWORK_USER */ && !showFramework) {
                    hidden = true;
                }
                if (listenerOrigin === "Framework" /* SDK.DOMDebuggerModel.EventListener.Origin.FRAMEWORK */ && showFramework) {
                    hidden = true;
                }
                if (!showPassive && objectListenerElement.eventListener().passive()) {
                    hidden = true;
                }
                if (!showBlocking && !objectListenerElement.eventListener().passive()) {
                    hidden = true;
                }
                objectListenerElement.hidden = hidden;
                hiddenEventType = hiddenEventType && hidden;
            }
            eventType.hidden = hiddenEventType;
        }
    }
    getOrCreateTreeElementForType(type) {
        let treeItem = this.#treeItemMap.get(type);
        if (!treeItem) {
            treeItem = new EventListenersTreeElement(type, this.#linkifier, this.changeCallback);
            this.#treeItemMap.set(type, treeItem);
            treeItem.hidden = true;
            this.treeOutline.appendChild(treeItem);
        }
        this.emptyHolder.classList.add('hidden');
        return treeItem;
    }
    addEmptyHolderIfNeeded() {
        let allHidden = true;
        let firstVisibleChild = null;
        for (const eventType of this.treeOutline.rootElement().children()) {
            eventType.hidden = !eventType.firstChild();
            allHidden = allHidden && eventType.hidden;
            if (!firstVisibleChild && !eventType.hidden) {
                firstVisibleChild = eventType;
            }
        }
        if (allHidden && this.emptyHolder.classList.contains('hidden')) {
            this.emptyHolder.classList.remove('hidden');
        }
        if (firstVisibleChild) {
            firstVisibleChild.select(true /* omitFocus */);
        }
        this.treeOutline.setFocusable(Boolean(firstVisibleChild));
    }
    eventListenersArrivedForTest() {
    }
}
export class EventListenersTreeElement extends UI.TreeOutline.TreeElement {
    toggleOnClick;
    linkifier;
    changeCallback;
    constructor(type, linkifier, changeCallback) {
        super(type);
        this.toggleOnClick = true;
        this.linkifier = linkifier;
        this.changeCallback = changeCallback;
        UI.ARIAUtils.setLabel(this.listItemElement, `${type}, event listener`);
    }
    static comparator(element1, element2) {
        if (element1.title === element2.title) {
            return 0;
        }
        return element1.title > element2.title ? 1 : -1;
    }
    addObjectEventListener(eventListener, object) {
        const treeElement = new ObjectEventListenerBar(eventListener, object, this.linkifier, this.changeCallback);
        this.appendChild(treeElement);
    }
}
export class ObjectEventListenerBar extends UI.TreeOutline.TreeElement {
    #eventListener;
    editable;
    changeCallback;
    valueTitle;
    constructor(eventListener, object, linkifier, changeCallback) {
        super('', true);
        this.#eventListener = eventListener;
        this.editable = false;
        this.setTitle(object, linkifier);
        this.changeCallback = changeCallback;
    }
    async onpopulate() {
        const properties = [];
        const eventListener = this.#eventListener;
        const runtimeModel = eventListener.domDebuggerModel().runtimeModel();
        properties.push(new ObjectUI.ObjectPropertiesSection.ObjectTreeNode(runtimeModel.createRemotePropertyFromPrimitiveValue('useCapture', eventListener.useCapture())));
        properties.push(new ObjectUI.ObjectPropertiesSection.ObjectTreeNode(runtimeModel.createRemotePropertyFromPrimitiveValue('passive', eventListener.passive())));
        properties.push(new ObjectUI.ObjectPropertiesSection.ObjectTreeNode(runtimeModel.createRemotePropertyFromPrimitiveValue('once', eventListener.once())));
        if (typeof eventListener.handler() !== 'undefined') {
            properties.push(new ObjectUI.ObjectPropertiesSection.ObjectTreeNode(new SDK.RemoteObject.RemoteObjectProperty('handler', eventListener.handler())));
        }
        ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement.populateWithProperties(this, { properties }, true, true, undefined);
    }
    setTitle(object, linkifier) {
        const title = this.listItemElement.createChild('span', 'event-listener-details');
        const propertyValue = ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection.createPropertyValue(object, /* wasThrown */ false, /* showPreview */ false);
        this.valueTitle = propertyValue;
        title.appendChild(this.valueTitle);
        if (this.#eventListener.canRemove()) {
            const deleteButton = new Buttons.Button.Button();
            deleteButton.data = {
                variant: "icon" /* Buttons.Button.Variant.ICON */,
                size: "MICRO" /* Buttons.Button.Size.MICRO */,
                iconName: 'bin',
                jslogContext: 'delete-event-listener',
            };
            UI.Tooltip.Tooltip.install(deleteButton, i18nString(UIStrings.deleteEventListener));
            deleteButton.addEventListener('click', event => {
                this.removeListener();
                event.consume();
            }, false);
            title.appendChild(deleteButton);
        }
        if (this.#eventListener.isScrollBlockingType() && this.#eventListener.canTogglePassive()) {
            const passiveButton = title.createChild('button', 'event-listener-button');
            passiveButton.textContent = i18nString(UIStrings.togglePassive);
            passiveButton.setAttribute('jslog', `${VisualLogging.action('passive').track({ click: true })}`);
            UI.Tooltip.Tooltip.install(passiveButton, i18nString(UIStrings.toggleWhetherEventListenerIs));
            passiveButton.addEventListener('click', event => {
                this.togglePassiveListener();
                event.consume();
            }, false);
            title.appendChild(passiveButton);
        }
        const subtitle = title.createChild('span', 'event-listener-tree-subtitle');
        const linkElement = linkifier.linkifyRawLocation(this.#eventListener.location(), this.#eventListener.sourceURL());
        subtitle.appendChild(linkElement);
        this.listItemElement.addEventListener('contextmenu', event => {
            const menu = new UI.ContextMenu.ContextMenu(event);
            if (event.target !== linkElement) {
                menu.appendApplicableItems(linkElement);
            }
            if (object.subtype === 'node') {
                menu.defaultSection().appendItem(i18nString(UIStrings.openInElementsPanel), () => Common.Revealer.reveal(object), { jslogContext: 'reveal-in-elements' });
            }
            menu.defaultSection().appendItem(i18nString(UIStrings.deleteEventListener), this.removeListener.bind(this), { disabled: !this.#eventListener.canRemove(), jslogContext: 'delete-event-listener' });
            menu.defaultSection().appendCheckboxItem(i18nString(UIStrings.passive), this.togglePassiveListener.bind(this), {
                checked: this.#eventListener.passive(),
                disabled: !this.#eventListener.canTogglePassive(),
                jslogContext: 'passive',
            });
            void menu.show();
        });
    }
    removeListener() {
        this.removeListenerBar();
        void this.#eventListener.remove();
    }
    togglePassiveListener() {
        void this.#eventListener.togglePassive().then(() => this.changeCallback());
    }
    removeListenerBar() {
        const parent = this.parent;
        if (!parent) {
            return;
        }
        parent.removeChild(this);
        if (!parent.childCount()) {
            parent.collapse();
        }
        let allHidden = true;
        for (const child of parent.children()) {
            if (!child.hidden) {
                allHidden = false;
            }
        }
        parent.hidden = allHidden;
    }
    eventListener() {
        return this.#eventListener;
    }
    onenter() {
        if (this.valueTitle) {
            this.valueTitle.click();
            return true;
        }
        return false;
    }
    ondelete() {
        if (this.#eventListener.canRemove()) {
            this.removeListener();
            return true;
        }
        return false;
    }
}
//# sourceMappingURL=EventListenersView.js.map