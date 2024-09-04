// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';

export async function frameworkEventListeners(object: SDK.RemoteObject.RemoteObject):
    Promise<FrameworkEventListenersObject> {
  const domDebuggerModel = object.runtimeModel().target().model(SDK.DOMDebuggerModel.DOMDebuggerModel);
  if (!domDebuggerModel) {
    return {eventListeners: [], internalHandlers: null} as FrameworkEventListenersObject;
  }

  const listenersResult = {internalHandlers: null, eventListeners: []} as FrameworkEventListenersObject;
  return object.callFunction(frameworkEventListenersImpl, undefined)
      .then(assertCallFunctionResult)
      .then(getOwnProperties)
      .then(createEventListeners)
      .then(returnResult)
      .catch(error => {
        console.error(error);
        return listenersResult;
      });

  function getOwnProperties(object: SDK.RemoteObject.RemoteObject): Promise<SDK.RemoteObject.GetPropertiesResult> {
    return object.getOwnProperties(false /* generatePreview */);
  }

  async function createEventListeners(result: SDK.RemoteObject.GetPropertiesResult): Promise<void> {
    if (!result.properties) {
      throw new Error('Object properties is empty');
    }
    const promises = [];
    for (const property of result.properties) {
      if (property.name === 'eventListeners' && property.value) {
        promises.push(convertToEventListeners(property.value).then(storeEventListeners));
      }
      if (property.name === 'internalHandlers' && property.value) {
        promises.push(convertToInternalHandlers(property.value).then(storeInternalHandlers));
      }
      if (property.name === 'errorString' && property.value) {
        printErrorString(property.value);
      }
    }
    await Promise.all(promises);
  }

  function convertToEventListeners(pageEventListenersObject: SDK.RemoteObject.RemoteObject):
      Promise<SDK.DOMDebuggerModel.EventListener[]> {
    return SDK.RemoteObject.RemoteArray.objectAsArray(pageEventListenersObject)
        .map(toEventListener)
        .then(filterOutEmptyObjects);

    function toEventListener(listenerObject: SDK.RemoteObject.RemoteObject):
        Promise<SDK.DOMDebuggerModel.EventListener|null> {
      let type: string;
      let useCapture: boolean;
      let passive: boolean;
      let once: boolean;
      let handler: SDK.RemoteObject.RemoteObject|null = null;
      let originalHandler: SDK.RemoteObject.RemoteObject|null = null;
      let location: (SDK.DebuggerModel.Location|null)|null = null;
      let removeFunctionObject: SDK.RemoteObject.RemoteObject|null = null;

      const promises = [];
      promises.push(
          listenerObject
              .callFunctionJSON(
                  truncatePageEventListener as (this: Object) => TruncatedEventListenerObjectInInspectedPage, undefined)
              .then(storeTruncatedListener));

      function truncatePageEventListener(this: EventListenerObjectInInspectedPage):
          TruncatedEventListenerObjectInInspectedPage {
        return {type: this.type, useCapture: this.useCapture, passive: this.passive, once: this.once};
      }

      function storeTruncatedListener(truncatedListener: TruncatedEventListenerObjectInInspectedPage): void {
        if (truncatedListener.type !== undefined) {
          type = truncatedListener.type;
        }
        if (truncatedListener.useCapture !== undefined) {
          useCapture = truncatedListener.useCapture;
        }
        if (truncatedListener.passive !== undefined) {
          passive = truncatedListener.passive;
        }
        if (truncatedListener.once !== undefined) {
          once = truncatedListener.once;
        }
      }

      promises.push(
          listenerObject.callFunction(handlerFunction as (this: Object) => SDK.RemoteObject.RemoteObject | null)
              .then(assertCallFunctionResult)
              .then(storeOriginalHandler)
              .then(toTargetFunction)
              .then(storeFunctionWithDetails));

      function handlerFunction(this: EventListenerObjectInInspectedPage): SDK.RemoteObject.RemoteObject|null {
        return this.handler || null;
      }

      function storeOriginalHandler(functionObject: SDK.RemoteObject.RemoteObject): SDK.RemoteObject.RemoteObject {
        originalHandler = functionObject;
        return originalHandler;
      }

      function storeFunctionWithDetails(functionObject: SDK.RemoteObject.RemoteObject): Promise<void> {
        handler = functionObject;
        return functionObject.debuggerModel().functionDetailsPromise(functionObject).then(storeFunctionDetails);
      }

      function storeFunctionDetails(functionDetails: SDK.DebuggerModel.FunctionDetails|null): void {
        location = functionDetails ? functionDetails.location : null;
      }

      promises.push(
          listenerObject.callFunction(getRemoveFunction as (this: Object) => SDK.RemoteObject.RemoteObject | null)
              .then(assertCallFunctionResult)
              .then(storeRemoveFunction));

      function getRemoveFunction(this: EventListenerObjectInInspectedPage): SDK.RemoteObject.RemoteObject|null {
        return this.remove || null;
      }

      function storeRemoveFunction(functionObject: SDK.RemoteObject.RemoteObject): void {
        if (functionObject.type !== 'function') {
          return;
        }
        removeFunctionObject = functionObject;
      }

      return Promise.all(promises).then(createEventListener).catch(error => {
        console.error(error);
        return null;
      });

      function createEventListener(): SDK.DOMDebuggerModel.EventListener {
        if (!location) {
          throw new Error('Empty event listener\'s location');
        }
        return new SDK.DOMDebuggerModel.EventListener(
            domDebuggerModel as SDK.DOMDebuggerModel.DOMDebuggerModel, object, type, useCapture, passive, once, handler,
            originalHandler, location, removeFunctionObject, SDK.DOMDebuggerModel.EventListener.Origin.FRAMEWORK_USER);
      }
    }
  }

  function convertToInternalHandlers(pageInternalHandlersObject: SDK.RemoteObject.RemoteObject):
      Promise<SDK.RemoteObject.RemoteArray> {
    return SDK.RemoteObject.RemoteArray.objectAsArray(pageInternalHandlersObject)
        .map(toTargetFunction)
        .then(SDK.RemoteObject.RemoteArray.createFromRemoteObjects.bind(null));
  }

  function toTargetFunction(functionObject: SDK.RemoteObject.RemoteObject): Promise<SDK.RemoteObject.RemoteObject> {
    return SDK.RemoteObject.RemoteFunction.objectAsFunction(functionObject).targetFunction();
  }

  function storeEventListeners(eventListeners: SDK.DOMDebuggerModel.EventListener[]): void {
    listenersResult.eventListeners = eventListeners;
  }

  function storeInternalHandlers(internalHandlers: SDK.RemoteObject.RemoteArray): void {
    listenersResult.internalHandlers = internalHandlers;
  }

  function printErrorString(errorString: SDK.RemoteObject.RemoteObject): void {
    Common.Console.Console.instance().error(String(errorString.value));
  }

  function returnResult(): FrameworkEventListenersObject {
    return listenersResult;
  }

  function assertCallFunctionResult(result: SDK.RemoteObject.CallFunctionResult): SDK.RemoteObject.RemoteObject {
    if (result.wasThrown || !result.object) {
      throw new Error('Exception in callFunction or empty result');
    }
    return result.object;
  }

  function filterOutEmptyObjects<T>(objects: (T|null)[]): T[] {
    return objects.filter(filterOutEmpty) as T[];

    function filterOutEmpty(object: T|null): boolean {
      return Boolean(object);
    }
  }

  /*
    frameworkEventListeners fetcher functions should produce following output:
        {
          // framework event listeners
          "eventListeners": [
            {
              "handler": function(),
              "useCapture": true,
              "passive": false,
              "once": false,
              "type": "change",
              "remove": function(type, handler, useCapture, passive)
            },
            ...
          ],
          // internal framework event handlers
          "internalHandlers": [
            function(),
            function(),
            ...
          ]
        }
    */
  function frameworkEventListenersImpl(this: Object): {eventListeners: Array<EventListenerObjectInInspectedPage>} {
    const errorLines = [];
    let eventListeners: EventListenerObjectInInspectedPage[] = [];
    let internalHandlers: (() => void)[] = [];
    let fetchers = [jQueryFetcher];
    try {
      // @ts-ignore Here because of layout tests.
      if (self.devtoolsFrameworkEventListeners && isArrayLike(self.devtoolsFrameworkEventListeners)) {
        // @ts-ignore Here because of layout tests.
        fetchers = fetchers.concat(self.devtoolsFrameworkEventListeners);
      }
    } catch (e) {
      errorLines.push('devtoolsFrameworkEventListeners call produced error: ' + toString(e));
    }

    for (let i = 0; i < fetchers.length; ++i) {
      try {
        const fetcherResult = fetchers[i](this);
        if (fetcherResult.eventListeners && isArrayLike(fetcherResult.eventListeners)) {
          const fetcherResultEventListeners = fetcherResult.eventListeners;
          const nonEmptyEventListeners = fetcherResultEventListeners
                                             .map(eventListener => {
                                               return checkEventListener(eventListener);
                                             })
                                             .filter(nonEmptyObject);
          eventListeners = eventListeners.concat(nonEmptyEventListeners as EventListenerObjectInInspectedPage[]);
        }
        if (fetcherResult.internalHandlers && isArrayLike(fetcherResult.internalHandlers)) {
          const fetcherResultInternalHandlers = fetcherResult.internalHandlers as (() => void)[];
          const nonEmptyInternalHandlers = fetcherResultInternalHandlers
                                               .map(handler => {
                                                 return checkInternalHandler(handler);
                                               })
                                               .filter(nonEmptyObject);
          internalHandlers = internalHandlers.concat(nonEmptyInternalHandlers as (() => void)[]);
        }
      } catch (e) {
        errorLines.push('fetcher call produced error: ' + toString(e));
      }
    }
    const result: {
      eventListeners: EventListenerObjectInInspectedPage[],
      internalHandlers?: (() => void)[],
      errorString?: string,
    } = {
      eventListeners,
      internalHandlers: internalHandlers.length ? internalHandlers : undefined,
      errorString: undefined,
    };

    // The logic further up seems to expect that if the internalHandlers is set,
    // that it should have a non-empty Array, but TS / Closure also expect the
    // property to exist, so we always add it above, but then remove it again
    // here if there's no value set.
    if (!result.internalHandlers) {
      delete result.internalHandlers;
    }

    if (errorLines.length) {
      let errorString: string = 'Framework Event Listeners API Errors:\n\t' + errorLines.join('\n\t');
      errorString = errorString.substr(0, errorString.length - 1);
      result.errorString = errorString;
    }

    // Remove the errorString if it's not set.
    if (result.errorString === '' || result.errorString === undefined) {
      delete result.errorString;
    }

    return result;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function isArrayLike(obj: any): boolean {
      if (!obj || typeof obj !== 'object') {
        return false;
      }
      try {
        if (typeof obj.splice === 'function') {
          const len = obj.length;
          return typeof len === 'number' && (len >>> 0 === len && (len > 0 || 1 / len > 0));
        }
      } catch (e) {
      }
      return false;
    }

    function checkEventListener(eventListener: PossibleEventListenerObjectInInspectedPage|
                                null): EventListenerObjectInInspectedPage|null {
      try {
        let errorString = '';
        if (!eventListener) {
          errorString += 'empty event listener, ';
        } else {
          const type = eventListener.type;
          if (!type || (typeof type !== 'string')) {
            errorString += 'event listener\'s type isn\'t string or empty, ';
          }
          const useCapture = eventListener.useCapture;
          if (typeof useCapture !== 'boolean') {
            errorString += 'event listener\'s useCapture isn\'t boolean or undefined, ';
          }
          const passive = eventListener.passive;
          if (typeof passive !== 'boolean') {
            errorString += 'event listener\'s passive isn\'t boolean or undefined, ';
          }
          const once = eventListener.once;
          if (typeof once !== 'boolean') {
            errorString += 'event listener\'s once isn\'t boolean or undefined, ';
          }
          const handler = eventListener.handler;
          if (!handler || (typeof handler !== 'function')) {
            errorString += 'event listener\'s handler isn\'t a function or empty, ';
          }
          const remove = eventListener.remove;
          if (remove && (typeof remove !== 'function')) {
            errorString += 'event listener\'s remove isn\'t a function, ';
          }
          if (!errorString) {
            return {
              type,
              useCapture,
              passive,
              once,
              handler,
              remove,
            } as EventListenerObjectInInspectedPage;
          }
        }
        errorLines.push(errorString.substr(0, errorString.length - 2));
        return null;
      } catch (error) {
        errorLines.push(toString(error));
        return null;
      }
    }

    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function checkInternalHandler(handler: any): (() => void)|null {
      if (handler && (typeof handler === 'function')) {
        return handler;
      }
      errorLines.push('internal handler isn\'t a function or empty');
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function toString(obj: any): string {
      try {
        return String(obj);
      } catch (e) {
        return '<error>';
      }
    }

    function nonEmptyObject<T>(obj: T|null): boolean {
      return Boolean(obj);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function jQueryFetcher(node: any): {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      eventListeners: {handler: any, useCapture: boolean, passive: boolean, once: boolean, type: string}[],
      internalHandlers?: (() => void)[],
    } {
      if (!node || !(node instanceof Node)) {
        return {eventListeners: []};
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jQuery = (window as any)['jQuery'];
      if (!jQuery || !jQuery.fn) {
        return {eventListeners: []};
      }
      const jQueryFunction = jQuery;
      const data = jQuery._data || jQuery.data;

      const eventListeners = [];
      const internalHandlers = [];

      if (typeof data === 'function') {
        const events = data(node, 'events');
        for (const type in events) {
          for (const key in events[type]) {
            const frameworkListener = events[type][key];
            if (typeof frameworkListener === 'object' || typeof frameworkListener === 'function') {
              const listener = {
                handler: frameworkListener.handler || frameworkListener,
                useCapture: true,
                passive: false,
                once: false,
                type,
                remove: jQueryRemove.bind(node, frameworkListener.selector),
              };
              eventListeners.push(listener);
            }
          }
        }
        const nodeData = data(node);
        if (nodeData && typeof nodeData.handle === 'function') {
          internalHandlers.push(nodeData.handle);
        }
      }
      const entry = jQueryFunction(node)[0];
      if (entry) {
        const entryEvents = entry['$events'];
        for (const type in entryEvents) {
          const events = entryEvents[type];
          for (const key in events) {
            if (typeof events[key] === 'function') {
              const listener = {handler: events[key], useCapture: true, passive: false, once: false, type};
              // We don't support removing for old version < 1.4 of jQuery because it doesn't provide API for getting "selector".
              eventListeners.push(listener);
            }
          }
        }
        if (entry && entry['$handle']) {
          internalHandlers.push(entry['$handle']);
        }
      }
      return {eventListeners, internalHandlers};
    }

    function jQueryRemove(this: Object|null, selector: string, type: string, handler: () => void): void {
      if (!this || !(this instanceof Node)) {
        return;
      }
      const node = this as Node;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jQuery = (window as any)['jQuery'];
      if (!jQuery || !jQuery.fn) {
        return;
      }
      const jQueryFunction = jQuery as (arg0: Node) => {
        off: Function,
      };
      jQueryFunction(node).off(type, selector, handler);
    }
  }
}
export interface FrameworkEventListenersObject {
  eventListeners: SDK.DOMDebuggerModel.EventListener[];
  internalHandlers: SDK.RemoteObject.RemoteArray|null;
}
export interface PossibleEventListenerObjectInInspectedPage {
  type?: string;
  useCapture?: boolean;
  passive?: boolean;
  once?: boolean;
  handler?: SDK.RemoteObject.RemoteObject|null;
  remove?: SDK.RemoteObject.RemoteObject|null;
}
export interface EventListenerObjectInInspectedPage {
  type: string;
  useCapture: boolean;
  passive: boolean;
  once: boolean;
  handler: SDK.RemoteObject.RemoteObject|null;
  remove: SDK.RemoteObject.RemoteObject|null;
}
export interface TruncatedEventListenerObjectInInspectedPage {
  type?: string;
  useCapture?: boolean;
  passive?: boolean;
  once?: boolean;
}
