// Copyright (c) Meta Platforms, Inc. and affiliates.
// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {type ParsedURL} from '../common/ParsedURL';

import {type DeveloperResourceLoaded} from './UserMetrics';

export type RNReliabilityEventListener = (event: DecoratedReactNativeChromeDevToolsEvent) => void;

let instance: RNPerfMetrics|null = null;

export function getInstance(): RNPerfMetrics {
  if (instance === null) {
    instance = new RNPerfMetrics();
  }
  return instance;
}

type UnsubscribeFn = () => void;
class RNPerfMetrics {
  #listeners: Set<RNReliabilityEventListener> = new Set();
  #launchId: string|null = null;

  addEventListener(listener: RNReliabilityEventListener): UnsubscribeFn {
    this.#listeners.add(listener);

    const unsubscribe = (): void => {
      this.#listeners.delete(listener);
    };

    return unsubscribe;
  }

  removeAllEventListeners(): void {
    this.#listeners.clear();
  }

  sendEvent(event: ReactNativeChromeDevToolsEvent): void {
    if (globalThis.enableReactNativePerfMetrics !== true) {
      return;
    }

    const decoratedEvent = this.#decorateEvent(event);
    const errors = [];
    for (const listener of this.#listeners) {
      try {
        listener(decoratedEvent);
      } catch (e) {
        errors.push(e);
      }
    }

    if (errors.length > 0) {
      const error = new AggregateError(errors);
      console.error('Error occurred when calling event listeners', error);
    }
  }

  registerPerfMetricsGlobalPostMessageHandler(): void {
    if (globalThis.enableReactNativePerfMetrics !== true ||
        globalThis.enableReactNativePerfMetricsGlobalPostMessage !== true) {
      return;
    }

    this.addEventListener(event => {
      window.postMessage({event, tag: 'react-native-chrome-devtools-perf-metrics'}, window.location.origin);
    });
  }

  registerGlobalErrorReporting(): void {
    window.addEventListener('error', event => {
      this.sendEvent({
        eventName: 'Browser.UnhandledError',
        params: {
          type: 'error',
          message: event.message,
        }
      });
    }, {passive: true});

    window.addEventListener('unhandledrejection', event => {
      let message: string;
      try {
        message = String(event.reason);
      } catch {
        message = '[Promise was rejected without a serialisable reason]';
      }
      this.sendEvent({
        eventName: 'Browser.UnhandledError',
        params: {
          type: 'rejectedPromise',
          message,
        }
      });
    }, {passive: true});
  }

  setLaunchId(launchId: string|null): void {
    this.#launchId = launchId;
  }

  entryPointLoadingStarted(entryPoint: EntryPoint): void {
    this.sendEvent({
      eventName: 'Entrypoint.LoadingStarted',
      entryPoint,
    });
  }

  entryPointLoadingFinished(entryPoint: EntryPoint): void {
    this.sendEvent({
      eventName: 'Entrypoint.LoadingFinished',
      entryPoint,
    });
  }

  browserVisibilityChanged(visibilityState: BrowserVisibilityChangeEvent['params']['visibilityState']): void {
    this.sendEvent({
      eventName: 'Browser.VisibilityChange',
      params: {
        visibilityState,
      }
    });
  }

  remoteDebuggingTerminated(reason: string): void {
    this.sendEvent({eventName: 'Connection.DebuggingTerminated', params: {reason}});
  }

  developerResourceLoadingStarted(parsedURL: ParsedURL, loadingMethod: DeveloperResourceLoaded): void {
    const url = maybeTruncateDeveloperResourceUrl(parsedURL);
    this.sendEvent({eventName: 'DeveloperResource.LoadingStarted', params: {url, loadingMethod}});
  }

  developerResourceLoadingFinished(parsedURL: ParsedURL, loadingMethod: DeveloperResourceLoaded, result: {
    success: boolean,
    errorDescription?: {
      message?: string|null|undefined,
    },
  }): void {
    const url = maybeTruncateDeveloperResourceUrl(parsedURL);
    this.sendEvent({
      eventName: 'DeveloperResource.LoadingFinished',
      params: {
        url,
        loadingMethod,
        success: result.success,
        errorMessage: result.errorDescription?.message,
      },
    });
  }

  #decorateEvent(event: ReactNativeChromeDevToolsEvent): Readonly<DecoratedReactNativeChromeDevToolsEvent> {
    const commonFields: CommonEventFields = {
      timestamp: getPerfTimestamp(),
      launchId: this.#launchId,
    };

    return {
      ...event,
      ...commonFields,
    };
  }
}

function getPerfTimestamp(): DOMHighResTimeStamp {
  return performance.timeOrigin + performance.now();
}

function maybeTruncateDeveloperResourceUrl(parsedURL: ParsedURL): string {
  const {url} = parsedURL;
  return parsedURL.isHttpOrHttps() ? url : `${url.slice(0, 100)} …(omitted ${url.length - 100} characters)`;
}

type CommonEventFields = Readonly<{
  timestamp: DOMHighResTimeStamp,
  launchId: string | void | null,
}>;

type EntryPoint = 'rn_fusebox'|'rn_inspector';

export type EntrypointLoadingStartedEvent = Readonly<{
  eventName: 'Entrypoint.LoadingStarted',
  entryPoint: EntryPoint,
}>;

export type EntrypointLoadingFinishedEvent = Readonly<{
  eventName: 'Entrypoint.LoadingFinished',
  entryPoint: EntryPoint,
}>;

export type DebuggerReadyEvent = Readonly<{
  eventName: 'Debugger.IsReadyToPause',
}>;

export type BrowserVisibilityChangeEvent = Readonly<{
  eventName: 'Browser.VisibilityChange',
  params: Readonly<{
    visibilityState: 'hidden' | 'visible',
  }>,
}>;

export type UnhandledErrorEvent = Readonly<{
  eventName: 'Browser.UnhandledError',
  params: Readonly<{
    type: 'error' | 'rejectedPromise',
    message: string,
  }>,
}>;

export type RemoteDebuggingTerminatedEvent = Readonly<{
  eventName: 'Connection.DebuggingTerminated',
  params: Readonly<{
    reason: string,
  }>,
}>;

export type DeveloperResourceLoadingStartedEvent = Readonly<{
  eventName: 'DeveloperResource.LoadingStarted',
  params: Readonly<{
    url: string,
    loadingMethod: DeveloperResourceLoaded,
  }>,
}>;

export type DeveloperResourceLoadingFinishedEvent = Readonly<{
  eventName: 'DeveloperResource.LoadingFinished',
  params: Readonly<{
    url: string,
    loadingMethod: DeveloperResourceLoaded,
    success: boolean,
    errorMessage: string | null | undefined,
  }>,
}>;

export type ReactNativeChromeDevToolsEvent = EntrypointLoadingStartedEvent|EntrypointLoadingFinishedEvent|
    DebuggerReadyEvent|BrowserVisibilityChangeEvent|UnhandledErrorEvent|RemoteDebuggingTerminatedEvent|
    DeveloperResourceLoadingStartedEvent|DeveloperResourceLoadingFinishedEvent;

export type DecoratedReactNativeChromeDevToolsEvent = CommonEventFields&ReactNativeChromeDevToolsEvent;
