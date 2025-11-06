var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/event_listeners/EventListenersUtils.js
var EventListenersUtils_exports = {};
__export(EventListenersUtils_exports, {
  frameworkEventListeners: () => frameworkEventListeners
});
import * as Common from "./../../core/common/common.js";
import * as SDK from "./../../core/sdk/sdk.js";
async function frameworkEventListeners(object) {
  const domDebuggerModel = object.runtimeModel().target().model(SDK.DOMDebuggerModel.DOMDebuggerModel);
  if (!domDebuggerModel) {
    return { eventListeners: [], internalHandlers: null };
  }
  const listenersResult = { internalHandlers: null, eventListeners: [] };
  return await object.callFunction(frameworkEventListenersImpl, void 0).then(assertCallFunctionResult).then(getOwnProperties).then(createEventListeners).then(returnResult).catch((error) => {
    console.error(error);
    return listenersResult;
  });
  function getOwnProperties(object2) {
    return object2.getOwnProperties(
      false
      /* generatePreview */
    );
  }
  async function createEventListeners(result) {
    if (!result.properties) {
      throw new Error("Object properties is empty");
    }
    const promises = [];
    for (const property of result.properties) {
      if (property.name === "eventListeners" && property.value) {
        promises.push(convertToEventListeners(property.value).then(storeEventListeners));
      }
      if (property.name === "internalHandlers" && property.value) {
        promises.push(convertToInternalHandlers(property.value).then(storeInternalHandlers));
      }
      if (property.name === "errorString" && property.value) {
        printErrorString(property.value);
      }
    }
    await Promise.all(promises);
  }
  function convertToEventListeners(pageEventListenersObject) {
    return SDK.RemoteObject.RemoteArray.objectAsArray(pageEventListenersObject).map(toEventListener).then(filterOutEmptyObjects);
    function toEventListener(listenerObject) {
      let type;
      let useCapture;
      let passive;
      let once;
      let handler = null;
      let originalHandler = null;
      let location = null;
      let removeFunctionObject = null;
      const promises = [];
      promises.push(listenerObject.callFunctionJSON(truncatePageEventListener, void 0).then(storeTruncatedListener));
      function truncatePageEventListener() {
        return { type: this.type, useCapture: this.useCapture, passive: this.passive, once: this.once };
      }
      function storeTruncatedListener(truncatedListener) {
        if (!truncatedListener) {
          return;
        }
        if (truncatedListener.type !== void 0) {
          type = truncatedListener.type;
        }
        if (truncatedListener.useCapture !== void 0) {
          useCapture = truncatedListener.useCapture;
        }
        if (truncatedListener.passive !== void 0) {
          passive = truncatedListener.passive;
        }
        if (truncatedListener.once !== void 0) {
          once = truncatedListener.once;
        }
      }
      promises.push(listenerObject.callFunction(handlerFunction).then(assertCallFunctionResult).then(storeOriginalHandler).then(toTargetFunction).then(storeFunctionWithDetails));
      function handlerFunction() {
        return this.handler || null;
      }
      function storeOriginalHandler(functionObject) {
        originalHandler = functionObject;
        return originalHandler;
      }
      function storeFunctionWithDetails(functionObject) {
        handler = functionObject;
        return functionObject.debuggerModel().functionDetailsPromise(functionObject).then(storeFunctionDetails);
      }
      function storeFunctionDetails(functionDetails) {
        location = functionDetails ? functionDetails.location : null;
      }
      promises.push(listenerObject.callFunction(getRemoveFunction).then(assertCallFunctionResult).then(storeRemoveFunction));
      function getRemoveFunction() {
        return this.remove || null;
      }
      function storeRemoveFunction(functionObject) {
        if (functionObject.type !== "function") {
          return;
        }
        removeFunctionObject = functionObject;
      }
      return Promise.all(promises).then(createEventListener).catch((error) => {
        console.error(error);
        return null;
      });
      function createEventListener() {
        if (!location) {
          throw new Error("Empty event listener's location");
        }
        return new SDK.DOMDebuggerModel.EventListener(
          domDebuggerModel,
          object,
          type,
          useCapture,
          passive,
          once,
          handler,
          originalHandler,
          location,
          removeFunctionObject,
          "FrameworkUser"
          /* SDK.DOMDebuggerModel.EventListener.Origin.FRAMEWORK_USER */
        );
      }
    }
  }
  function convertToInternalHandlers(pageInternalHandlersObject) {
    return SDK.RemoteObject.RemoteArray.objectAsArray(pageInternalHandlersObject).map(toTargetFunction).then(SDK.RemoteObject.RemoteArray.createFromRemoteObjects.bind(null));
  }
  function toTargetFunction(functionObject) {
    return SDK.RemoteObject.RemoteFunction.objectAsFunction(functionObject).targetFunction();
  }
  function storeEventListeners(eventListeners) {
    listenersResult.eventListeners = eventListeners;
  }
  function storeInternalHandlers(internalHandlers) {
    listenersResult.internalHandlers = internalHandlers;
  }
  function printErrorString(errorString) {
    Common.Console.Console.instance().error(String(errorString.value));
  }
  function returnResult() {
    return listenersResult;
  }
  function assertCallFunctionResult(result) {
    if (result.wasThrown || !result.object) {
      throw new Error("Exception in callFunction or empty result");
    }
    return result.object;
  }
  function filterOutEmptyObjects(objects) {
    return objects.filter(filterOutEmpty);
    function filterOutEmpty(object2) {
      return Boolean(object2);
    }
  }
  function frameworkEventListenersImpl() {
    const errorLines = [];
    let eventListeners = [];
    let internalHandlers = [];
    let fetchers = [jQueryFetcher];
    try {
      if (self.devtoolsFrameworkEventListeners && isArrayLike(self.devtoolsFrameworkEventListeners)) {
        fetchers = fetchers.concat(self.devtoolsFrameworkEventListeners);
      }
    } catch (e) {
      errorLines.push("devtoolsFrameworkEventListeners call produced error: " + toString(e));
    }
    for (let i = 0; i < fetchers.length; ++i) {
      try {
        const fetcherResult = fetchers[i](this);
        if (fetcherResult.eventListeners && isArrayLike(fetcherResult.eventListeners)) {
          const fetcherResultEventListeners = fetcherResult.eventListeners;
          const nonEmptyEventListeners = fetcherResultEventListeners.map((eventListener) => {
            return checkEventListener(eventListener);
          }).filter(nonEmptyObject);
          eventListeners = eventListeners.concat(nonEmptyEventListeners);
        }
        if (fetcherResult.internalHandlers && isArrayLike(fetcherResult.internalHandlers)) {
          const fetcherResultInternalHandlers = fetcherResult.internalHandlers;
          const nonEmptyInternalHandlers = fetcherResultInternalHandlers.map((handler) => {
            return checkInternalHandler(handler);
          }).filter(nonEmptyObject);
          internalHandlers = internalHandlers.concat(nonEmptyInternalHandlers);
        }
      } catch (e) {
        errorLines.push("fetcher call produced error: " + toString(e));
      }
    }
    const result = {
      eventListeners,
      internalHandlers: internalHandlers.length ? internalHandlers : void 0,
      errorString: void 0
    };
    if (!result.internalHandlers) {
      delete result.internalHandlers;
    }
    if (errorLines.length) {
      let errorString = "Framework Event Listeners API Errors:\n	" + errorLines.join("\n	");
      errorString = errorString.substr(0, errorString.length - 1);
      result.errorString = errorString;
    }
    if (result.errorString === "" || result.errorString === void 0) {
      delete result.errorString;
    }
    return result;
    function isArrayLike(obj) {
      if (!obj || typeof obj !== "object") {
        return false;
      }
      try {
        if (typeof obj.splice === "function") {
          const len = obj.length;
          return typeof len === "number" && (len >>> 0 === len && (len > 0 || 1 / len > 0));
        }
      } catch {
      }
      return false;
    }
    function checkEventListener(eventListener) {
      try {
        let errorString = "";
        if (!eventListener) {
          errorString += "empty event listener, ";
        } else {
          const type = eventListener.type;
          if (!type || typeof type !== "string") {
            errorString += "event listener's type isn't string or empty, ";
          }
          const useCapture = eventListener.useCapture;
          if (typeof useCapture !== "boolean") {
            errorString += "event listener's useCapture isn't boolean or undefined, ";
          }
          const passive = eventListener.passive;
          if (typeof passive !== "boolean") {
            errorString += "event listener's passive isn't boolean or undefined, ";
          }
          const once = eventListener.once;
          if (typeof once !== "boolean") {
            errorString += "event listener's once isn't boolean or undefined, ";
          }
          const handler = eventListener.handler;
          if (!handler || typeof handler !== "function") {
            errorString += "event listener's handler isn't a function or empty, ";
          }
          const remove = eventListener.remove;
          if (remove && typeof remove !== "function") {
            errorString += "event listener's remove isn't a function, ";
          }
          if (!errorString) {
            return {
              type,
              useCapture,
              passive,
              once,
              handler,
              remove
            };
          }
        }
        errorLines.push(errorString.substr(0, errorString.length - 2));
        return null;
      } catch (error) {
        errorLines.push(toString(error));
        return null;
      }
    }
    function checkInternalHandler(handler) {
      if (handler && typeof handler === "function") {
        return handler;
      }
      errorLines.push("internal handler isn't a function or empty");
      return null;
    }
    function toString(obj) {
      try {
        return String(obj);
      } catch {
        return "<error>";
      }
    }
    function nonEmptyObject(obj) {
      return Boolean(obj);
    }
    function jQueryFetcher(node) {
      if (!node || !(node instanceof Node)) {
        return { eventListeners: [] };
      }
      const jQuery = window["jQuery"];
      if (!jQuery?.fn) {
        return { eventListeners: [] };
      }
      const jQueryFunction = jQuery;
      const data = jQuery._data || jQuery.data;
      const eventListeners2 = [];
      const internalHandlers2 = [];
      if (typeof data === "function") {
        const events = data(node, "events");
        for (const type in events) {
          for (const key in events[type]) {
            const frameworkListener = events[type][key];
            if (typeof frameworkListener === "object" || typeof frameworkListener === "function") {
              const listener = {
                handler: frameworkListener.handler || frameworkListener,
                useCapture: true,
                passive: false,
                once: false,
                type,
                remove: jQueryRemove.bind(node, frameworkListener.selector)
              };
              eventListeners2.push(listener);
            }
          }
        }
        const nodeData = data(node);
        if (nodeData && typeof nodeData.handle === "function") {
          internalHandlers2.push(nodeData.handle);
        }
      }
      const entry = jQueryFunction(node)[0];
      if (entry) {
        const entryEvents = entry["$events"];
        for (const type in entryEvents) {
          const events = entryEvents[type];
          for (const key in events) {
            if (typeof events[key] === "function") {
              const listener = { handler: events[key], useCapture: true, passive: false, once: false, type };
              eventListeners2.push(listener);
            }
          }
        }
        if (entry?.["$handle"]) {
          internalHandlers2.push(entry["$handle"]);
        }
      }
      return { eventListeners: eventListeners2, internalHandlers: internalHandlers2 };
    }
    function jQueryRemove(selector, type, handler) {
      if (!this || !(this instanceof Node)) {
        return;
      }
      const node = this;
      const jQuery = window["jQuery"];
      if (!jQuery?.fn) {
        return;
      }
      const jQueryFunction = jQuery;
      jQueryFunction(node).off(type, selector, handler);
    }
  }
}

// gen/front_end/panels/event_listeners/EventListenersView.js
var EventListenersView_exports = {};
__export(EventListenersView_exports, {
  EventListenersTreeElement: () => EventListenersTreeElement,
  EventListenersView: () => EventListenersView,
  ObjectEventListenerBar: () => ObjectEventListenerBar
});
import * as Common2 from "./../../core/common/common.js";
import * as i18n from "./../../core/i18n/i18n.js";
import * as SDK2 from "./../../core/sdk/sdk.js";
import * as Buttons from "./../../ui/components/buttons/buttons.js";
import * as ObjectUI from "./../../ui/legacy/components/object_ui/object_ui.js";

// gen/front_end/ui/legacy/components/object_ui/objectValue.css.js
var objectValue_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.value.object-value-node:hover {
  background-color: var(--sys-color-state-hover-on-subtle);
}

.object-value-function-prefix,
.object-value-boolean {
  color: var(--sys-color-token-attribute-value);
}

.object-value-function {
  font-style: italic;
}

.object-value-function.linkified:hover {
  --override-linkified-hover-background: rgb(0 0 0 / 10%);

  background-color: var(--override-linkified-hover-background);
  cursor: pointer;
}

.theme-with-dark-background .object-value-function.linkified:hover,
:host-context(.theme-with-dark-background) .object-value-function.linkified:hover {
  --override-linkified-hover-background: rgb(230 230 230 / 10%);
}

.object-value-number {
  color: var(--sys-color-token-attribute-value);
}

.object-value-bigint {
  color: var(--sys-color-token-comment);
}

.object-value-string,
.object-value-regexp,
.object-value-symbol {
  white-space: pre;
  unicode-bidi: -webkit-isolate;
  color: var(--sys-color-token-property-special);
}

.object-value-node {
  position: relative;
  vertical-align: baseline;
  color: var(--sys-color-token-variable);
  white-space: nowrap;
}

.object-value-null,
.object-value-undefined {
  color: var(--sys-color-state-disabled);
}

.object-value-unavailable {
  color: var(--sys-color-token-tag);
}

.object-value-calculate-value-button:hover {
  text-decoration: underline;
}

.object-properties-section-custom-section {
  display: inline-flex;
  flex-direction: column;
}

.theme-with-dark-background .object-value-number,
:host-context(.theme-with-dark-background) .object-value-number,
.theme-with-dark-background .object-value-boolean,
:host-context(.theme-with-dark-background) .object-value-boolean {
  --override-primitive-dark-mode-color: hsl(252deg 100% 75%);

  color: var(--override-primitive-dark-mode-color);
}

.object-properties-section .object-description {
  color: var(--sys-color-token-subtle);
}

.value .object-properties-preview {
  white-space: nowrap;
}

.name {
  color: var(--sys-color-token-tag);
  flex-shrink: 0;
}

.object-properties-preview .name {
  color: var(--sys-color-token-subtle);
}

@media (forced-colors: active) {
  .object-value-calculate-value-button:hover {
    forced-color-adjust: none;
    color: Highlight;
  }
}

/*# sourceURL=${import.meta.resolve("./objectValue.css")} */`;

// gen/front_end/panels/event_listeners/EventListenersView.js
import * as Components from "./../../ui/legacy/components/utils/utils.js";
import * as UI from "./../../ui/legacy/legacy.js";
import * as VisualLogging from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/event_listeners/eventListenersView.css.js
var eventListenersView_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.tree-outline-disclosure li {
  padding: 0 0 0 5px;
  overflow: hidden;
  display: flex;
  min-height: var(--sys-size-8);
  align-items: center;
}

.tree-outline-disclosure {
  padding-left: 0 !important; /* stylelint-disable-line declaration-no-important */
  padding-right: 3px;
}

.tree-outline-disclosure li.parent::before {
  top: 0 !important; /* stylelint-disable-line declaration-no-important */
}

.tree-outline-disclosure .name {
  color: var(--sys-color-token-tag);
}

.tree-outline-disclosure .object-value-node,
.tree-outline-disclosure .object-value-object {
  overflow: hidden;
  text-overflow: ellipsis;
}

.event-listener-details {
  display: flex;
  min-height: var(--sys-size-8);
  align-items: center;
  gap: var(--sys-size-2);

  devtools-button {
    height: var(--sys-size-8);
  }
}

.event-listener-tree-subtitle {
  float: right;
  margin-left: 5px;
  flex-shrink: 0;
}

.event-listener-button {
  padding: 0 5px;
  color: var(--sys-color-primary);
  background-color: var(--sys-color-cdt-base-container);
  border-radius: 7px;
  border: 1px solid var(--sys-color-tonal-outline);
  margin-left: 5px;
  display: block;
  flex-shrink: 0;

  &:hover {
    background-color: var(--sys-color-state-hover-on-subtle);
  }

  &:active {
    background-color: var(--sys-color-state-ripple-neutral-on-subtle);
  }
}

.placeholder:not(.hidden) + .event-listener-tree {
  display: none;
}

.placeholder {
  display: flex;
  margin: auto;
  align-items: center;
  justify-content: center;
}

.sources.panel .empty-view-scroller {
  display: none;
}

.elements.panel .placeholder {
  display: block;

  .gray-info-message {
    display: none;
  }
}

.tree-outline-disclosure li:hover .event-listener-button {
  display: inline;
}

@media (forced-colors: active) {
  .event-listener-details .event-listener-button {
    forced-color-adjust: none;
    opacity: 100%;
    background: ButtonFace;
    color: ButtonText;
    border-color: ButtonText;
  }

  .event-listener-button:hover {
    background-color: Highlight !important; /* stylelint-disable-line declaration-no-important */
    color: HighlightText;
    border-color: ButtonText;
  }

  .tree-outline.hide-selection-when-blurred .selected:focus-visible .event-listener-button,
  .tree-outline-disclosure li:focus-visible .gray-info-message {
    background-color: Highlight;
    color: HighlightText;
    border-color: HighlightText;
  }
}

/*# sourceURL=${import.meta.resolve("./eventListenersView.css")} */`;

// gen/front_end/panels/event_listeners/EventListenersView.js
var UIStrings = {
  /**
   * @description Empty holder text content in Event Listeners View of the Event Listener Debugging pane in the Sources panel
   */
  noEventListeners: "No event listeners",
  /**
   * @description Empty holder text content in Event Listeners View of the Event Listener Debugging pane in the Elements panel
   */
  eventListenersExplanation: "On this page you will find registered event listeners",
  /**
   * @description Delete button title in Event Listeners View of the Event Listener Debugging pane in the Sources panel
   */
  deleteEventListener: "Delete event listener",
  /**
   * @description Passive button text content in Event Listeners View of the Event Listener Debugging pane in the Sources panel
   */
  togglePassive: "Toggle Passive",
  /**
   * @description Passive button title in Event Listeners View of the Event Listener Debugging pane in the Sources panel
   */
  toggleWhetherEventListenerIs: "Toggle whether event listener is passive or blocking",
  /**
   * @description A context menu item to reveal a node in the DOM tree of the Elements Panel
   */
  openInElementsPanel: "Open in Elements panel",
  /**
   * @description Text in Event Listeners Widget of the Elements panel
   */
  passive: "Passive"
};
var str_ = i18n.i18n.registerUIStrings("panels/event_listeners/EventListenersView.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var EventListenersView = class extends UI.Widget.VBox {
  changeCallback = () => {
  };
  enableDefaultTreeFocus = false;
  treeOutline;
  emptyHolder;
  objects = [];
  filter;
  #linkifier = new Components.Linkifier.Linkifier();
  #treeItemMap = /* @__PURE__ */ new Map();
  constructor(element) {
    super(element);
    this.registerRequiredCSS(eventListenersView_css_default);
    this.emptyHolder = this.element.createChild("div", "placeholder hidden");
    this.emptyHolder.createChild("span", "gray-info-message").textContent = i18nString(UIStrings.noEventListeners);
    const emptyWidget = new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.noEventListeners), i18nString(UIStrings.eventListenersExplanation));
    emptyWidget.show(this.emptyHolder);
    this.treeOutline = new UI.TreeOutline.TreeOutlineInShadow();
    this.treeOutline.setComparator(EventListenersTreeElement.comparator);
    this.treeOutline.element.classList.add("event-listener-tree", "monospace");
    this.treeOutline.setShowSelectionOnKeyboardFocus(true);
    this.treeOutline.setFocusable(true);
    this.treeOutline.registerRequiredCSS(eventListenersView_css_default, objectValue_css_default);
    this.element.appendChild(this.treeOutline.element);
  }
  focus() {
    if (!this.enableDefaultTreeFocus) {
      return;
    }
    if (!this.emptyHolder.classList.contains("hidden")) {
      this.treeOutline.forceSelect();
    } else {
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
    const eventTypes = this.treeOutline.rootElement().children();
    for (const eventType of eventTypes) {
      eventType.removeChildren();
    }
    this.#linkifier.reset();
    await Promise.all(objects.map((obj) => obj ? this.addObject(obj) : Promise.resolve()));
    this.addEmptyHolderIfNeeded();
    this.eventListenersArrivedForTest();
  }
  addObject(object) {
    let eventListeners;
    let frameworkEventListenersObject = null;
    const promises = [];
    const domDebuggerModel = object.runtimeModel().target().model(SDK2.DOMDebuggerModel.DOMDebuggerModel);
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
      return await frameworkEventListenersObject.internalHandlers.object().callFunctionJSON(isInternalEventListener, eventListeners.map(handlerArgument)).then(setIsInternal);
      function handlerArgument(listener) {
        return SDK2.RemoteObject.RemoteObject.toCallArgument(listener.handler());
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
        if (listenerOrigin === "FrameworkUser" && !showFramework) {
          hidden = true;
        }
        if (listenerOrigin === "Framework" && showFramework) {
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
    this.emptyHolder.classList.add("hidden");
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
    if (allHidden && this.emptyHolder.classList.contains("hidden")) {
      this.emptyHolder.classList.remove("hidden");
    }
    if (firstVisibleChild) {
      firstVisibleChild.select(
        true
        /* omitFocus */
      );
    }
    this.treeOutline.setFocusable(Boolean(firstVisibleChild));
  }
  eventListenersArrivedForTest() {
  }
};
var EventListenersTreeElement = class extends UI.TreeOutline.TreeElement {
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
};
var ObjectEventListenerBar = class extends UI.TreeOutline.TreeElement {
  #eventListener;
  editable;
  changeCallback;
  valueTitle;
  constructor(eventListener, object, linkifier, changeCallback) {
    super("", true);
    this.#eventListener = eventListener;
    this.editable = false;
    this.setTitle(object, linkifier);
    this.changeCallback = changeCallback;
  }
  async onpopulate() {
    const properties = [];
    const eventListener = this.#eventListener;
    const runtimeModel = eventListener.domDebuggerModel().runtimeModel();
    properties.push(new ObjectUI.ObjectPropertiesSection.ObjectTreeNode(runtimeModel.createRemotePropertyFromPrimitiveValue("useCapture", eventListener.useCapture())));
    properties.push(new ObjectUI.ObjectPropertiesSection.ObjectTreeNode(runtimeModel.createRemotePropertyFromPrimitiveValue("passive", eventListener.passive())));
    properties.push(new ObjectUI.ObjectPropertiesSection.ObjectTreeNode(runtimeModel.createRemotePropertyFromPrimitiveValue("once", eventListener.once())));
    if (typeof eventListener.handler() !== "undefined") {
      properties.push(new ObjectUI.ObjectPropertiesSection.ObjectTreeNode(new SDK2.RemoteObject.RemoteObjectProperty("handler", eventListener.handler())));
    }
    ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement.populateWithProperties(this, { properties }, true, true, void 0);
  }
  setTitle(object, linkifier) {
    const title = this.listItemElement.createChild("span", "event-listener-details");
    const propertyValue = ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection.createPropertyValue(
      object,
      /* wasThrown */
      false,
      /* showPreview */
      false
    );
    this.valueTitle = propertyValue.element;
    title.appendChild(this.valueTitle);
    if (this.#eventListener.canRemove()) {
      const deleteButton = new Buttons.Button.Button();
      deleteButton.data = {
        variant: "icon",
        size: "MICRO",
        iconName: "bin",
        jslogContext: "delete-event-listener"
      };
      UI.Tooltip.Tooltip.install(deleteButton, i18nString(UIStrings.deleteEventListener));
      deleteButton.addEventListener("click", (event) => {
        this.removeListener();
        event.consume();
      }, false);
      title.appendChild(deleteButton);
    }
    if (this.#eventListener.isScrollBlockingType() && this.#eventListener.canTogglePassive()) {
      const passiveButton = title.createChild("button", "event-listener-button");
      passiveButton.textContent = i18nString(UIStrings.togglePassive);
      passiveButton.setAttribute("jslog", `${VisualLogging.action("passive").track({ click: true })}`);
      UI.Tooltip.Tooltip.install(passiveButton, i18nString(UIStrings.toggleWhetherEventListenerIs));
      passiveButton.addEventListener("click", (event) => {
        this.togglePassiveListener();
        event.consume();
      }, false);
      title.appendChild(passiveButton);
    }
    const subtitle = title.createChild("span", "event-listener-tree-subtitle");
    const linkElement = linkifier.linkifyRawLocation(this.#eventListener.location(), this.#eventListener.sourceURL());
    subtitle.appendChild(linkElement);
    this.listItemElement.addEventListener("contextmenu", (event) => {
      const menu = new UI.ContextMenu.ContextMenu(event);
      if (event.target !== linkElement) {
        menu.appendApplicableItems(linkElement);
      }
      if (object.subtype === "node") {
        menu.defaultSection().appendItem(i18nString(UIStrings.openInElementsPanel), () => Common2.Revealer.reveal(object), { jslogContext: "reveal-in-elements" });
      }
      menu.defaultSection().appendItem(i18nString(UIStrings.deleteEventListener), this.removeListener.bind(this), { disabled: !this.#eventListener.canRemove(), jslogContext: "delete-event-listener" });
      menu.defaultSection().appendCheckboxItem(i18nString(UIStrings.passive), this.togglePassiveListener.bind(this), {
        checked: this.#eventListener.passive(),
        disabled: !this.#eventListener.canTogglePassive(),
        jslogContext: "passive"
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
};
export {
  EventListenersUtils_exports as EventListenersUtils,
  EventListenersView_exports as EventListenersView
};
//# sourceMappingURL=event_listeners.js.map
