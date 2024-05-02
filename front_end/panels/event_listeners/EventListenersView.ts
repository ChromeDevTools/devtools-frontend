// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
/* eslint-disable rulesdir/es_modules_import */
import objectValueStyles from '../../ui/legacy/components/object_ui/objectValue.css.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';

import eventListenersViewStyles from './eventListenersView.css.js';

import type * as Protocol from '../../generated/protocol.js';

import {frameworkEventListeners, type FrameworkEventListenersObject} from './EventListenersUtils.js';

const UIStrings = {
  /**
   *@description Empty holder text content in Event Listeners View of the Event Listener Debugging pane in the Sources panel
   */
  noEventListeners: 'No event listeners',
  /**
   *@description Label for an item to remove something
   */
  remove: 'Remove',
  /**
   *@description Delete button title in Event Listeners View of the Event Listener Debugging pane in the Sources panel
   */
  deleteEventListener: 'Delete event listener',
  /**
   *@description Passive button text content in Event Listeners View of the Event Listener Debugging pane in the Sources panel
   */
  togglePassive: 'Toggle Passive',
  /**
   *@description Passive button title in Event Listeners View of the Event Listener Debugging pane in the Sources panel
   */
  toggleWhetherEventListenerIs: 'Toggle whether event listener is passive or blocking',
  /**
   *@description A context menu item to reveal a node in the DOM tree of the Elements Panel
   */
  revealInElementsPanel: 'Reveal in Elements panel',
  /**
   *@description Text in Event Listeners Widget of the Elements panel
   */
  passive: 'Passive',
};
const str_ = i18n.i18n.registerUIStrings('panels/event_listeners/EventListenersView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class EventListenersView extends UI.Widget.VBox {
  private changeCallback: () => void;
  private enableDefaultTreeFocus: boolean;
  treeOutline: UI.TreeOutline.TreeOutlineInShadow;
  private emptyHolder: HTMLDivElement;
  private linkifier: Components.Linkifier.Linkifier;
  private readonly treeItemMap: Map<string, EventListenersTreeElement>;
  constructor(changeCallback: () => void, enableDefaultTreeFocus: boolean|undefined = false) {
    super();
    this.changeCallback = changeCallback;
    this.enableDefaultTreeFocus = enableDefaultTreeFocus;
    this.treeOutline = new UI.TreeOutline.TreeOutlineInShadow();
    this.treeOutline.setComparator(EventListenersTreeElement.comparator);
    this.treeOutline.element.classList.add('monospace');
    this.treeOutline.setShowSelectionOnKeyboardFocus(true);
    this.treeOutline.setFocusable(true);
    this.element.appendChild(this.treeOutline.element);
    this.emptyHolder = document.createElement('div');
    this.emptyHolder.classList.add('gray-info-message');
    this.emptyHolder.textContent = i18nString(UIStrings.noEventListeners);
    this.emptyHolder.tabIndex = -1;
    this.linkifier = new Components.Linkifier.Linkifier();
    this.treeItemMap = new Map();
  }

  override focus(): void {
    if (!this.enableDefaultTreeFocus) {
      return;
    }
    if (!this.emptyHolder.parentNode) {
      this.treeOutline.forceSelect();
    } else {
      this.emptyHolder.focus();
    }
  }

  async addObjects(objects: (SDK.RemoteObject.RemoteObject|null)[]): Promise<void> {
    this.reset();
    await Promise.all(objects.map(obj => obj ? this.addObject(obj) : Promise.resolve()));
    this.addEmptyHolderIfNeeded();
    this.eventListenersArrivedForTest();
  }

  private addObject(object: SDK.RemoteObject.RemoteObject): Promise<void> {
    let eventListeners: SDK.DOMDebuggerModel.EventListener[];
    let frameworkEventListenersObject: (FrameworkEventListenersObject|null)|null = null;

    const promises = [];
    const domDebuggerModel = object.runtimeModel().target().model(SDK.DOMDebuggerModel.DOMDebuggerModel);
    // TODO(kozyatinskiy): figure out how this should work for |window| when there is no DOMDebugger.
    if (domDebuggerModel) {
      promises.push(domDebuggerModel.eventListeners(object).then(storeEventListeners));
    }
    promises.push(frameworkEventListeners(object).then(storeFrameworkEventListenersObject));
    return Promise.all(promises).then(markInternalEventListeners).then(addEventListeners.bind(this));

    function storeEventListeners(result: SDK.DOMDebuggerModel.EventListener[]): void {
      eventListeners = result;
    }

    function storeFrameworkEventListenersObject(result: FrameworkEventListenersObject|null): void {
      frameworkEventListenersObject = result;
    }

    async function markInternalEventListeners(): Promise<void> {
      if (!frameworkEventListenersObject) {
        return;
      }

      if (!frameworkEventListenersObject.internalHandlers) {
        return;
      }
      return frameworkEventListenersObject.internalHandlers.object()
          .callFunctionJSON(isInternalEventListener as (this: Object) => boolean[], eventListeners.map(handlerArgument))
          .then(setIsInternal);

      function handlerArgument(listener: SDK.DOMDebuggerModel.EventListener): Protocol.Runtime.CallArgument {
        return SDK.RemoteObject.RemoteObject.toCallArgument(listener.handler());
      }

      function isInternalEventListener(this: Function[]): boolean[] {
        const isInternal = [];
        const internalHandlersSet = new Set<Function>(this);
        for (const handler of arguments) {
          isInternal.push(internalHandlersSet.has(handler));
        }
        return isInternal;
      }

      function setIsInternal(isInternal: boolean[]): void {
        for (let i = 0; i < eventListeners.length; ++i) {
          if (isInternal[i]) {
            eventListeners[i].markAsFramework();
          }
        }
      }
    }

    function addEventListeners(this: EventListenersView): void {
      this.addObjectEventListeners(object, eventListeners);
      if (frameworkEventListenersObject) {
        this.addObjectEventListeners(object, frameworkEventListenersObject.eventListeners);
      }
    }
  }

  private addObjectEventListeners(
      object: SDK.RemoteObject.RemoteObject, eventListeners: SDK.DOMDebuggerModel.EventListener[]|null): void {
    if (!eventListeners) {
      return;
    }
    for (const eventListener of eventListeners) {
      const treeItem = this.getOrCreateTreeElementForType(eventListener.type());
      treeItem.addObjectEventListener(eventListener, object);
    }
  }

  showFrameworkListeners(showFramework: boolean, showPassive: boolean, showBlocking: boolean): void {
    const eventTypes = this.treeOutline.rootElement().children();
    for (const eventType of eventTypes) {
      let hiddenEventType = true;
      for (const listenerElement of eventType.children()) {
        const objectListenerElement = listenerElement as ObjectEventListenerBar;
        const listenerOrigin = objectListenerElement.eventListener().origin();
        let hidden = false;
        if (listenerOrigin === SDK.DOMDebuggerModel.EventListener.Origin.FrameworkUser && !showFramework) {
          hidden = true;
        }
        if (listenerOrigin === SDK.DOMDebuggerModel.EventListener.Origin.Framework && showFramework) {
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

  private getOrCreateTreeElementForType(type: string): EventListenersTreeElement {
    let treeItem = this.treeItemMap.get(type);
    if (!treeItem) {
      treeItem = new EventListenersTreeElement(type, this.linkifier, this.changeCallback);
      this.treeItemMap.set(type, treeItem);
      treeItem.hidden = true;
      this.treeOutline.appendChild(treeItem);
    }
    this.emptyHolder.remove();
    return treeItem;
  }

  addEmptyHolderIfNeeded(): void {
    let allHidden = true;
    let firstVisibleChild: UI.TreeOutline.TreeElement|null = null;
    for (const eventType of this.treeOutline.rootElement().children()) {
      eventType.hidden = !eventType.firstChild();
      allHidden = allHidden && eventType.hidden;
      if (!firstVisibleChild && !eventType.hidden) {
        firstVisibleChild = eventType;
      }
    }
    if (allHidden && !this.emptyHolder.parentNode) {
      this.element.appendChild(this.emptyHolder);
    }
    if (firstVisibleChild) {
      firstVisibleChild.select(true /* omitFocus */);
    }

    this.treeOutline.setFocusable(Boolean(firstVisibleChild));
  }

  reset(): void {
    const eventTypes = this.treeOutline.rootElement().children();
    for (const eventType of eventTypes) {
      eventType.removeChildren();
    }
    this.linkifier.reset();
  }

  private eventListenersArrivedForTest(): void {
  }
  override wasShown(): void {
    super.wasShown();
    this.treeOutline.registerCSSFiles([eventListenersViewStyles, objectValueStyles]);
  }
}

export class EventListenersTreeElement extends UI.TreeOutline.TreeElement {
  override toggleOnClick: boolean;
  private readonly linkifier: Components.Linkifier.Linkifier;
  private readonly changeCallback: () => void;
  constructor(type: string, linkifier: Components.Linkifier.Linkifier, changeCallback: () => void) {
    super(type);
    this.toggleOnClick = true;
    this.linkifier = linkifier;
    this.changeCallback = changeCallback;
    UI.ARIAUtils.setLabel(this.listItemElement, `${type}, event listener`);
  }

  static comparator(element1: UI.TreeOutline.TreeElement, element2: UI.TreeOutline.TreeElement): number {
    if (element1.title === element2.title) {
      return 0;
    }
    return element1.title > element2.title ? 1 : -1;
  }

  addObjectEventListener(eventListener: SDK.DOMDebuggerModel.EventListener, object: SDK.RemoteObject.RemoteObject):
      void {
    const treeElement = new ObjectEventListenerBar(eventListener, object, this.linkifier, this.changeCallback);
    this.appendChild(treeElement as UI.TreeOutline.TreeElement);
  }
}

export class ObjectEventListenerBar extends UI.TreeOutline.TreeElement {
  private eventListenerInternal: SDK.DOMDebuggerModel.EventListener;
  editable: boolean;
  private readonly changeCallback: () => void;
  private valueTitle?: Element;
  constructor(
      eventListener: SDK.DOMDebuggerModel.EventListener, object: SDK.RemoteObject.RemoteObject,
      linkifier: Components.Linkifier.Linkifier, changeCallback: () => void) {
    super('', true);
    this.eventListenerInternal = eventListener;
    this.editable = false;
    this.setTitle(object, linkifier);
    this.changeCallback = changeCallback;
  }

  override async onpopulate(): Promise<void> {
    const properties = [];
    const eventListener = this.eventListenerInternal;
    const runtimeModel = eventListener.domDebuggerModel().runtimeModel();
    properties.push(runtimeModel.createRemotePropertyFromPrimitiveValue('useCapture', eventListener.useCapture()));
    properties.push(runtimeModel.createRemotePropertyFromPrimitiveValue('passive', eventListener.passive()));
    properties.push(runtimeModel.createRemotePropertyFromPrimitiveValue('once', eventListener.once()));
    if (typeof eventListener.handler() !== 'undefined') {
      properties.push(new SDK.RemoteObject.RemoteObjectProperty('handler', eventListener.handler()));
    }
    ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement.populateWithProperties(
        this, properties, [], true, true, null);
  }

  private setTitle(object: SDK.RemoteObject.RemoteObject, linkifier: Components.Linkifier.Linkifier): void {
    const title = this.listItemElement.createChild('span', 'event-listener-details');

    const propertyValue = ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection.createPropertyValue(
        object, /* wasThrown */ false, /* showPreview */ false);
    this.valueTitle = propertyValue.element;
    title.appendChild(this.valueTitle);

    if (this.eventListenerInternal.canRemove()) {
      const deleteButton = title.createChild('span', 'event-listener-button');
      deleteButton.textContent = i18nString(UIStrings.remove);
      UI.Tooltip.Tooltip.install(deleteButton, i18nString(UIStrings.deleteEventListener));
      deleteButton.addEventListener('click', event => {
        this.removeListener();
        event.consume();
      }, false);
      title.appendChild(deleteButton);
    }

    if (this.eventListenerInternal.isScrollBlockingType() && this.eventListenerInternal.canTogglePassive()) {
      const passiveButton = title.createChild('span', 'event-listener-button');
      passiveButton.textContent = i18nString(UIStrings.togglePassive);
      UI.Tooltip.Tooltip.install(passiveButton, i18nString(UIStrings.toggleWhetherEventListenerIs));
      passiveButton.addEventListener('click', event => {
        this.togglePassiveListener();
        event.consume();
      }, false);
      title.appendChild(passiveButton);
    }

    const subtitle = title.createChild('span', 'event-listener-tree-subtitle');
    const linkElement =
        linkifier.linkifyRawLocation(this.eventListenerInternal.location(), this.eventListenerInternal.sourceURL());
    subtitle.appendChild(linkElement);

    this.listItemElement.addEventListener('contextmenu', event => {
      const menu = new UI.ContextMenu.ContextMenu(event);
      if (event.target !== linkElement) {
        menu.appendApplicableItems(linkElement);
      }
      if (object.subtype === 'node') {
        menu.defaultSection().appendItem(
            i18nString(UIStrings.revealInElementsPanel), () => Common.Revealer.reveal(object),
            {jslogContext: 'reveal-in-elements'});
      }
      menu.defaultSection().appendItem(
          i18nString(UIStrings.deleteEventListener), this.removeListener.bind(this),
          {disabled: !this.eventListenerInternal.canRemove(), jslogContext: 'delete-event-listener'});
      menu.defaultSection().appendCheckboxItem(i18nString(UIStrings.passive), this.togglePassiveListener.bind(this), {
        checked: this.eventListenerInternal.passive(),
        disabled: !this.eventListenerInternal.canTogglePassive(),
        jslogContext: 'passive',
      });
      void menu.show();
    });
  }

  private removeListener(): void {
    this.removeListenerBar();
    void this.eventListenerInternal.remove();
  }

  private togglePassiveListener(): void {
    void this.eventListenerInternal.togglePassive().then(() => this.changeCallback());
  }

  private removeListenerBar(): void {
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

  eventListener(): SDK.DOMDebuggerModel.EventListener {
    return this.eventListenerInternal;
  }

  override onenter(): boolean {
    if (this.valueTitle) {
      (this.valueTitle as HTMLElement).click();
      return true;
    }

    return false;
  }

  override ondelete(): boolean {
    if (this.eventListenerInternal.canRemove()) {
      this.removeListener();
      return true;
    }

    return false;
  }
}
