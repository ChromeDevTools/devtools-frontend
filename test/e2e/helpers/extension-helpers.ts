// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {Chrome} from '../../../extension-api/ExtensionAPI.js'; // eslint-disable-line @typescript-eslint/no-unused-vars
import type * as pptr from 'puppeteer';
import {getBrowserAndPages, getResourcesPath, waitFor} from '../../shared/helper.js';

// TODO: Remove once Chromium updates its version of Node.js to 12+.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalThis: any = global;

let loadExtensionPromise: Promise<unknown> = Promise.resolve();

// FIXME: Replace with crypt.randomUUID() once Chromium updates its version of node.js
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

export async function loadExtension(name: string, startPage?: string) {
  startPage = startPage || `${getResourcesPath()}/extensions/empty_extension.html`;
  const {frontend} = getBrowserAndPages();
  const extensionInfo = {startPage, name};

  // Because the injected script is shared across calls for the target, we cannot run multiple instances concurrently.
  const load = loadExtensionPromise.then(() => doLoad(frontend, extensionInfo));
  loadExtensionPromise = load.catch(() => {});
  return load;

  async function doLoad(frontend: pptr.Page, extensionInfo: {startPage: string, name: string}) {
    // @ts-ignore The pptr API doesn't allow us to remove the API injection after we're done.
    const session = await frontend._client;
    const injectedAPI = await frontend.evaluate(
        extensionInfo => globalThis.buildExtensionAPIInjectedScript(
            extensionInfo, undefined, 'default', globalThis.UI.shortcutRegistry.globalShortcutKeys()),
        extensionInfo);

    function declareChrome() {
      if (!window.chrome) {
        (window.chrome as unknown) = {};
      }
    }

    const extensionScriptId = guid();
    const injectedScriptId = await session.send(
        'Page.addScriptToEvaluateOnNewDocument',
        {source: `(${declareChrome})();${injectedAPI}('${extensionScriptId}')`});

    try {
      await frontend.evaluate(
          extensionInfo => globalThis.Extensions.ExtensionServer.instance().addExtension(extensionInfo), extensionInfo);

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
