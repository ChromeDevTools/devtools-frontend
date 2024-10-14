// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as puppeteer from 'puppeteer-core';

// Needed to make use of the global declaration in ExtensionAPI.js of window.chrome.
// But if we make this a side-effect import, it will persist at compile type.
// So we import a type that we don't use to make TS realise it's just an import
// to declare some type, and it gets stripped at runtime.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type {Chrome} from '../../../extension-api/ExtensionAPI.js';
import type {CdpPage} from '../../../node_modules/puppeteer-core/lib/esm/puppeteer/cdp/Page.js';
import {getBrowserAndPages, getDevToolsFrontendHostname, getResourcesPath, waitFor} from '../../shared/helper.js';

// TODO: Remove once Chromium updates its version of Node.js to 12+.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalThis: any = global;

let loadExtensionPromise: Promise<unknown> = Promise.resolve();

// FIXME(chromium:1248945): Replace with crypto.randomUUID() once Chromium updates its version of node.js
function guid() {
  const digits = '0123456789abcdef';
  const rnd = () => digits[Math.floor(Math.random() * (digits.length - 1))];
  const eight = new Array(8).fill('0').map(rnd).join('');
  const four = new Array(4).fill('0').map(rnd).join('');
  const version = new Array(3).fill('0').map(rnd).join('');
  const variant = new Array(3).fill('0').map(rnd).join('');
  const twelve = new Array(12).fill('0').map(rnd).join('');
  return `${eight}-${four}-4${version}-8${variant}-${twelve}`;
}

export function getResourcesPathWithDevToolsHostname() {
  return getResourcesPath(getDevToolsFrontendHostname());
}

export async function loadExtension(name: string, startPage?: string) {
  startPage = startPage || `${getResourcesPathWithDevToolsHostname()}/extensions/empty_extension.html`;
  const {frontend} = getBrowserAndPages();
  const extensionInfo = {startPage, name};

  // Because the injected script is shared across calls for the target, we cannot run multiple instances concurrently.
  const load = loadExtensionPromise.then(() => doLoad(frontend, extensionInfo));
  loadExtensionPromise = load.catch(() => {});
  return load;

  async function doLoad(frontend: puppeteer.Page, extensionInfo: {startPage: string, name: string}) {
    const session = (frontend as unknown as CdpPage)._client();
    // TODO(chromium:1246836) remove once real extension tests are available
    const injectedAPI = await frontend.evaluate(
        extensionInfo => globalThis.buildExtensionAPIInjectedScript(extensionInfo, undefined, 'default', []),
        extensionInfo);

    function declareChrome() {
      window.chrome = window.chrome || {};
    }

    const extensionScriptId = guid();
    const injectedScriptId = await session.send(
        'Page.addScriptToEvaluateOnNewDocument',
        {source: `(${declareChrome})();${injectedAPI}('${extensionScriptId}')`});

    try {
      await frontend.evaluate(extensionInfo => {
        globalThis.Extensions.extensionServer.addExtension(extensionInfo);
        const extensionIFrames = document.body.querySelectorAll(`[data-devtools-extension="${extensionInfo.name}"]`);
        if (extensionIFrames.length > 1) {
          throw new Error(`Duplicate extension ${extensionInfo.name}`);
        }
        if (extensionIFrames.length === 0) {
          throw new Error('Installing the extension failed.');
        }
        return new Promise<void>(resolve => {
          (extensionIFrames[0] as HTMLIFrameElement).onload = () => resolve();
        });
      }, extensionInfo);

      const iframe = await waitFor(`[data-devtools-extension="${name}"]`);
      const frame = await iframe.contentFrame();
      if (!frame) {
        throw new Error('Installing the extension failed.');
      }
      return frame;
    } finally {
      await session.send('Page.removeScriptToEvaluateOnNewDocument', injectedScriptId);
    }
  }
}
