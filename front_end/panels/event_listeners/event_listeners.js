var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../front_end/panels/event_listeners/EventListenersUtils.ts
var EventListenersUtils_exports = {};
__export(EventListenersUtils_exports, {
  frameworkEventListeners: () => frameworkEventListeners
});
import * as Common from "../../core/common/common.js";
import * as SDK from "../../core/sdk/sdk.js";
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
      promises.push(
        listenerObject.callFunctionJSON(
          truncatePageEventListener,
          void 0
        ).then(storeTruncatedListener)
      );
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
      promises.push(
        listenerObject.callFunction(handlerFunction).then(assertCallFunctionResult).then(storeOriginalHandler).then(toTargetFunction).then(storeFunctionWithDetails)
      );
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
      promises.push(
        listenerObject.callFunction(getRemoveFunction).then(assertCallFunctionResult).then(storeRemoveFunction)
      );
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
          SDK.DOMDebuggerModel.EventListener.Origin.FRAMEWORK_USER
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
      internalHandlers: internalHandlers.length ? internalHandlers : void 0
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

// ../../front_end/panels/event_listeners/EventListenersView.ts
var EventListenersView_exports = {};
__export(EventListenersView_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW,
  EventListenersView: () => EventListenersView
});
import * as Common2 from "../../core/common/common.js";
import * as i18n from "../../core/i18n/i18n.js";
import * as SDK2 from "../../core/sdk/sdk.js";
import * as Buttons from "../../ui/components/buttons/buttons.js";
import * as ObjectUI from "../../ui/legacy/components/object_ui/object_ui.js";

// gen/front_end/ui/legacy/components/object_ui/objectPropertiesSection.css.js
var objectPropertiesSection_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.object-properties-section-dimmed {
  opacity: 60%;
}

:host {
  display: block;
}

.object-properties-section {
  padding: 0;
  margin: 0;
  color: var(--sys-color-on-surface);
  display: flex;
  flex-direction: column;
  overflow: auto hidden;
}

.object-properties-section li,
li.object-properties-section  {
  user-select: text;

  &::before {
    flex-shrink: 0;
    margin-right: var(--sys-size-2);
    align-self: flex-start;
  }
}

.object-properties-section li.editing-sub-part {
  padding: 3px var(--sys-size-6) var(--sys-size-5) var(--sys-size-4);
  margin: calc(-1 * var(--sys-size-1)) calc(-1 * var(--sys-size-4)) calc(-1 * var(--sys-size-5));
  text-overflow: clip;
}

.object-properties-section li.editing {
  margin-left: 10px;
  text-overflow: clip;
}

.tree-outline ol.title-less-mode {
  padding-left: 0;
}

.object-properties-section .own-property {
  font-weight: bold;
}

.object-properties-section .synthetic-property {
  color: var(--sys-color-token-subtle);
}

.object-properties-section .private-property-hash {
  color: var(--sys-color-on-surface);
}

.object-properties-section-root-element {
  display: flex;
  flex-direction: row;
}

.object-properties-section .editable-div {
  overflow: hidden;
}

.name-and-value {
  line-height: var(--sys-size-8);
  display: flex;
  white-space: nowrap;
}

.name-and-value .separator {
  white-space: pre;
  flex-shrink: 0;
}

.editing-sub-part .name-and-value {
  overflow: visible;
  display: inline-flex;
}

.property-prompt {
  margin-left: var(--sys-size-3);
}

.tree-outline.hide-selection-when-blurred .selected:focus-visible {
  background: none;
  outline: var(--sys-size-2) solid var(--sys-color-state-focus-ring);
  outline-offset: calc(-1 * var(--sys-size-2));
}

.tree-outline.hide-selection-when-blurred .selected:focus-visible ::slotted(*),
.tree-outline.hide-selection-when-blurred .selected:focus-visible .tree-element-title,
.tree-outline.hide-selection-when-blurred .selected:focus-visible .name-and-value,
.tree-outline.hide-selection-when-blurred .selected:focus-visible .gray-info-message {
  background: var(--sys-color-state-focus-highlight);
  border-radius: var(--sys-size-2);
}

@media (forced-colors: active) {
  .object-properties-section-dimmed {
    opacity: 100%;
  }

  .tree-outline.hide-selection-when-blurred .selected:focus-visible {
    background: Highlight;
  }

  .tree-outline li:hover .tree-element-title,
  .tree-outline li.selected .tree-element-title {
    color: ButtonText;
  }

  .tree-outline.hide-selection-when-blurred .selected:focus-visible .tree-element-title,
  .tree-outline.hide-selection-when-blurred .selected:focus-visible .name-and-value {
    background: transparent;
    box-shadow: none;
  }

  .tree-outline.hide-selection-when-blurred .selected:focus-visible span,
  .tree-outline.hide-selection-when-blurred .selected:focus-visible .gray-info-message {
    color: HighlightText;
  }

  .tree-outline-disclosure:hover li.parent::before {
    background-color: ButtonText;
  }
}

/*# sourceURL=${import.meta.resolve("./objectPropertiesSection.css")} */`;

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
  unicode-bidi: isolate;
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
  unicode-bidi: isolate;
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

// ../../front_end/panels/event_listeners/EventListenersView.ts
import * as Components from "../../ui/legacy/components/utils/utils.js";
import * as UI from "../../ui/legacy/legacy.js";
import * as Lit from "../../ui/lit/lit.js";
import * as VisualLogging from "../../ui/visual_logging/visual_logging.js";

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
  border: var(--sys-size-1) solid var(--sys-color-tonal-outline);
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

.sources.panel .placeholder > .empty-widget-container {
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

// ../../front_end/panels/event_listeners/EventListenersView.ts
var { widget, widgetRef } = UI.Widget;
var { html, render } = Lit;
var { repeat } = Lit.Directives;
var UIStrings = {
  /**
   * @description Empty holder text content in Event Listeners view of the Event Listeners sidebar in the Sources panel.
   */
  noEventListeners: "No event listeners",
  /**
   * @description Empty holder text content in Event Listeners view of the Event Listeners sidebar in the Elements panel.
   */
  eventListenersExplanation: "On this page you will find registered event listeners",
  /**
   * @description Delete button title in Event Listeners view of the Event Listeners sidebar in the Sources panel.
   */
  deleteEventListener: "Delete event listener",
  /**
   * @description Passive button text content in Event Listeners view of the Event Listeners sidebar in the Sources panel.
   */
  togglePassive: "Toggle passive",
  /**
   * @description Passive button title in Event Listeners view of the Event Listeners sidebar in the Sources panel.
   */
  toggleWhetherEventListenerIs: "Toggle whether event listener is passive or blocking",
  /**
   * @description A context menu item to reveal a node in the DOM tree of the Elements panel.
   */
  openInElementsPanel: "Open in Elements panel",
  /**
   * @description Text in Event Listeners widget of the Elements panel.
   */
  passive: "Passive"
};
var str_ = i18n.i18n.registerUIStrings("panels/event_listeners/EventListenersView.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var DEFAULT_VIEW = (input, output, target) => {
  const types = input.listeners.keys().toArray().sort();
  const onContextMenu = (event, listener, object) => {
    const menu = new UI.ContextMenu.ContextMenu(event);
    if (event.target instanceof HTMLElement && !event.target.closest(".event-listener-tree-subtitle") && event.currentTarget instanceof HTMLElement) {
      const link = event.currentTarget.querySelector(".event-listener-tree-subtitle .devtools-link");
      if (link) {
        menu.appendApplicableItems(link);
      }
    }
    if (object.subtype === "node") {
      menu.defaultSection().appendItem(
        i18nString(UIStrings.openInElementsPanel),
        () => input.reveal(object),
        { jslogContext: "reveal-in-elements" }
      );
    }
    menu.defaultSection().appendItem(
      i18nString(UIStrings.deleteEventListener),
      () => input.removeListener(listener),
      { disabled: !listener.canRemove(), jslogContext: "delete-event-listener" }
    );
    menu.defaultSection().appendCheckboxItem(
      i18nString(UIStrings.passive),
      () => input.togglePassiveListener(listener),
      {
        checked: listener.passive(),
        disabled: !listener.canTogglePassive(),
        jslogContext: "passive"
      }
    );
    void menu.show();
  };
  const shouldHide = (listenerOrType) => {
    if (!input.filter) {
      return false;
    }
    if (typeof listenerOrType === "string") {
      return input.listeners.get(listenerOrType)?.every(({ listener }) => shouldHide(listener)) ?? true;
    }
    const listenerOrigin = listenerOrType.origin();
    if (listenerOrigin === SDK2.DOMDebuggerModel.EventListener.Origin.FRAMEWORK_USER && !input.filter.showFramework) {
      return true;
    }
    if (listenerOrigin === SDK2.DOMDebuggerModel.EventListener.Origin.FRAMEWORK && input.filter.showFramework) {
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
    if (event.key === "Delete" || event.key === "Backspace") {
      if (input.removeListener(listener)) {
        event.consume();
      }
    } else if (event.key === "Enter") {
      input.reveal(object);
      event.consume();
    }
  };
  const hasVisibleListeners = types.some((type) => !shouldHide(type));
  render(
    html`
    <style>${eventListenersView_css_default}</style>
    ${!hasVisibleListeners ? html`
    <div autofocus class=placeholder><!--emptyHolder-->
      <span class=gray-info-message>${i18nString(UIStrings.noEventListeners)}</span>
      ${widget(UI.EmptyWidget.EmptyWidget, {
      header: i18nString(UIStrings.noEventListeners),
      text: i18nString(UIStrings.eventListenersExplanation)
    })}
    </div>` : html`
    <devtools-tree autofocus class="event-listener-tree monospace" show-selection-on-keyboard-focus .template=${html`
      <ul role=tree>
        <style>${eventListenersView_css_default}</style>
        <style>${objectValue_css_default}</style>
        <style>${objectPropertiesSection_css_default}</style>
        ${repeat(types, (type) => type, (type) => html`
          <li role=treeitem toggle-on-click aria-label="${type}, event listener" ?hidden=${shouldHide(type)}>
           ${type}
           <ul role=group>
             ${repeat(input.listeners.get(type) ?? [], ({ listener }) => listener, ({ listener, object, objectTree }) => html`
               <li role=treeitem
                   data-origin=${listener.origin()}
                   @contextmenu=${(e) => onContextMenu(e, listener, object)}
                   @keydown=${(e) => onKeyDown(e, listener, object)}
                   ?hidden=${shouldHide(listener)}>
                 <span class=event-listener-details>
                   ${ObjectUI.ObjectPropertiesSection.renderPropertyValue(
      object,
      /* wasThrown */
      false,
      /* showPreview */
      false,
      input.linkifier
    )}
                   <devtools-button
                     .iconName=${"bin"}
                     .variant=${Buttons.Button.Variant.ICON}
                     .size=${Buttons.Button.Size.MICRO}
                     .jslogContext=${"delete-event-listener"}
                     title=${i18nString(UIStrings.deleteEventListener)}
                     @click=${(event) => {
      input.removeListener(listener);
      event.consume();
    }}
                     ?hidden=${!listener.canRemove()}></devtools-button>
                   ${listener.isScrollBlockingType() && listener.canTogglePassive() ? html`
                     <button class=event-listener-button
                       jslog=${VisualLogging.action("passive").track({ click: true })}
                       title=${i18nString(UIStrings.toggleWhetherEventListenerIs)}
                       @click=${(e) => {
      input.togglePassiveListener(listener);
      e.consume();
    }}>
                         ${i18nString(UIStrings.togglePassive)}
                     </button>` : Lit.nothing}
                   <span class=event-listener-tree-subtitle>
                     ${input.linkifier.linkifyRawLocation(
      listener.location(),
      listener.sourceURL(),
      /* FIXME template version */
      void 0,
      { tabStop: true }
    )}
                   </span>
                 </span>
                 <ul role=group ${widget(ObjectUI.ObjectPropertiesSection.ObjectTreeWidget, { objectTree })} ${widgetRef(ObjectUI.ObjectPropertiesSection.ObjectTreeWidget, () => {
    })}></ul>
               </li>`)}
             </ul>
          </li>`)}
      </ul>
    `}></devtools-tree>`}`,
    // clang-format on
    target
  );
};
var EventListenersView = class _EventListenersView extends UI.Widget.VBox {
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
    this.#listeners = void 0;
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
      listeners = await _EventListenersView.#loadListeners(objects.filter((o) => !!o));
      if (this.#objects === objects) {
        this.#listeners = listeners;
      }
    }
    const input = {
      listeners: listeners ?? /* @__PURE__ */ new Map(),
      filter: this.#filter,
      togglePassiveListener: (listener) => {
        void listener.togglePassive().then(() => {
          this.#listeners = void 0;
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
            const index = list.findIndex((item) => item.listener === listener);
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
        if (object.subtype === "node") {
          void Common2.Revealer.reveal(object);
        }
      },
      linkifier: this.#linkifier
    };
    this.#linkifier.reset();
    this.#view(input, {}, this.contentElement);
    this.eventListenersArrivedForTest();
  }
  static #createObjectTree(listener) {
    const object = SDK2.RemoteObject.RemoteObject.fromLocalObject({
      useCapture: listener.useCapture(),
      passive: listener.passive(),
      once: listener.once(),
      ...typeof listener.handler() !== "undefined" ? { handler: listener.handler() } : {}
    });
    const objectTree = new ObjectUI.ObjectPropertiesSection.ObjectTree(object, {
      readOnly: false,
      propertiesMode: ObjectUI.ObjectPropertiesSection.ObjectPropertiesMode.OWN_AND_INTERNAL_AND_INHERITED
    });
    objectTree.expanded = true;
    return objectTree;
  }
  static async #loadListeners(objects) {
    return Map.groupBy(
      (await Promise.all(objects.map(this.#loadListenersForObject))).flat(),
      ({ listener }) => listener.type()
    );
  }
  static async #loadListenersForObject(object) {
    const domDebuggerModel = object.runtimeModel().target().model(SDK2.DOMDebuggerModel.DOMDebuggerModel);
    const [eventListeners, frameworkEventListenersObject] = await Promise.all([domDebuggerModel?.eventListeners(object), frameworkEventListeners(object)]);
    if (!eventListeners) {
      return [];
    }
    const isInternal = await frameworkEventListenersObject.internalHandlers?.object().callFunctionJSON(
      isInternalEventListener,
      eventListeners.map((listener) => SDK2.RemoteObject.RemoteObject.toCallArgument(listener.handler()))
    );
    if (isInternal) {
      for (let i = 0; i < eventListeners.length; ++i) {
        if (isInternal[i]) {
          eventListeners[i].markAsFramework();
        }
      }
    }
    return [eventListeners, frameworkEventListenersObject.eventListeners].flatMap(
      (listeners) => listeners.map(
        (listener) => ({ object, listener, objectTree: _EventListenersView.#createObjectTree(listener) })
      )
    );
    function isInternalEventListener() {
      const isInternal2 = [];
      const internalHandlersSet = new Set(this);
      for (const handler of arguments) {
        isInternal2.push(internalHandlersSet.has(handler));
      }
      return isInternal2;
    }
  }
  eventListenersArrivedForTest() {
  }
};
export {
  EventListenersUtils_exports as EventListenersUtils,
  EventListenersView_exports as EventListenersView
};
//# sourceMappingURL=event_listeners.js.map
