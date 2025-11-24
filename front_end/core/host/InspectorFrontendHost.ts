// Copyright 2009 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Root from '../root/root.js';

import {
  EventDescriptors,
  type Events,
  type InspectorFrontendHostAPI,
} from './InspectorFrontendHostAPI.js';
import {InspectorFrontendHostStub} from './InspectorFrontendHostStub.js';
import {streamWrite as resourceLoaderStreamWrite} from './ResourceLoader.js';

// @ts-expect-error Global injected by devtools_compatibility.js
// eslint-disable-next-line @typescript-eslint/naming-convention
export let InspectorFrontendHostInstance: InspectorFrontendHostStub = globalThis.InspectorFrontendHost;

class InspectorFrontendAPIImpl {
  constructor() {
    for (const descriptor of EventDescriptors) {
      // @ts-expect-error Dispatcher magic
      this[descriptor[0]] = this.dispatch.bind(this, descriptor[0], descriptor[1], descriptor[2]);
    }
  }

  private dispatch(name: Events, signature: string[], _runOnceLoaded: boolean, ...params: string[]): void {
    // Single argument methods get dispatched with the param.
    if (signature.length < 2) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        InspectorFrontendHostInstance.events.dispatchEventToListeners<any>(name, params[0]);
      } catch (error) {
        console.error(error + ' ' + error.stack);
      }
      return;
    }
    const data: Record<string, string> = {};
    for (let i = 0; i < signature.length; ++i) {
      data[signature[i]] = params[i];
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      InspectorFrontendHostInstance.events.dispatchEventToListeners<any>(name, data);
    } catch (error) {
      console.error(error + ' ' + error.stack);
    }
  }

  streamWrite(id: number, chunk: string): void {
    resourceLoaderStreamWrite(id, chunk);
  }
}

/**
 * Used in `front_end/devtools_compatibility.js` to verify that calls from there
 * are valid.
 */
export type InspectorFrontendAPIImplMethods = keyof InspectorFrontendAPIImpl;

(function(): void {

function initializeInspectorFrontendHost(): void {
  if (!InspectorFrontendHostInstance) {
    // Instantiate stub for web-hosted mode if necessary.
    // @ts-expect-error Global injected by devtools_compatibility.js
    globalThis.InspectorFrontendHost = InspectorFrontendHostInstance = new InspectorFrontendHostStub();
  } else {
    // Otherwise add stubs for missing methods that are declared in the interface.
    const proto = InspectorFrontendHostStub.prototype;
    for (const name of (Object.getOwnPropertyNames(proto) as Array<keyof InspectorFrontendHostAPI>)) {
      const stub = proto[name];
      if (typeof stub !== 'function' || InspectorFrontendHostInstance[name]) {
        continue;
      }

      console.error(`Incompatible embedder: method Host.InspectorFrontendHost.${name} is missing. Using stub instead.`);
      // @ts-expect-error Global injected by devtools_compatibility.js
      InspectorFrontendHostInstance[name] = stub;
    }
  }

  // Attach the events object.
  InspectorFrontendHostInstance.events = new Common.ObjectWrapper.ObjectWrapper();
}

// FIXME: This file is included into both apps, since the devtools_app needs the InspectorFrontendHostAPI only,
// so the host instance should not be initialized there.
initializeInspectorFrontendHost();
// @ts-expect-error Global injected by devtools_compatibility.js
globalThis.InspectorFrontendAPI = new InspectorFrontendAPIImpl();
})();

export function isUnderTest(prefs?: Record<string, string>): boolean {
  // Integration tests rely on test queryParam.
  if (Root.Runtime.Runtime.queryParam('test')) {
    return true;
  }
  // Browser tests rely on prefs.
  if (prefs) {
    return prefs['isUnderTest'] === 'true';
  }
  return Common.Settings.Settings.hasInstance() &&
      Common.Settings.Settings.instance().createSetting('isUnderTest', false).get();
}

// The stub class used to be declared here so for backwards compatibility we re-export it from here.
export {InspectorFrontendHostStub};
