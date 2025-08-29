// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as puppeteer from 'puppeteer-core';
import type {CdpPage} from 'puppeteer-core/internal/cdp/Page.js';

import {getDevToolsFrontendHostname} from '../../shared/helper.js';
import {getBrowserAndPagesWrappers} from '../../shared/non_hosted_wrappers.js';

// TODO: Remove once Chromium updates its version of Node.js to 12+.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalThis: any = global;

let loadExtensionPromise: Promise<unknown> = Promise.resolve();

export function getResourcesPathWithDevToolsHostname(inspectedPage = getBrowserAndPagesWrappers().inspectedPage) {
  return inspectedPage.getResourcesPath(getDevToolsFrontendHostname());
}

export async function loadExtension(
    name: string, startPage?: string, allowFileAccess?: boolean,
    devToolsPage = getBrowserAndPagesWrappers().devToolsPage,
    inspectedPage = getBrowserAndPagesWrappers().inspectedPage): Promise<puppeteer.Frame> {
  startPage = startPage || `${getResourcesPathWithDevToolsHostname(inspectedPage)}/extensions/empty_extension.html`;
  const extensionInfo = {startPage, name, allowFileAccess};

  // Because the injected script is shared across calls for the target, we cannot run multiple instances concurrently.
  const load = loadExtensionPromise.then(() => doLoad(devToolsPage, extensionInfo));
  loadExtensionPromise = load.catch(() => {});
  return await load;

  async function doLoad(
      devToolsPage = getBrowserAndPagesWrappers().devToolsPage,
      extensionInfo: {startPage: string, name: string}): Promise<puppeteer.Frame> {
    const session = (devToolsPage.page as unknown as CdpPage)._client();
    // TODO(chromium:1246836) remove once real extension tests are available
    const injectedAPI = await devToolsPage.evaluate(
        extensionInfo => globalThis.buildExtensionAPIInjectedScript(extensionInfo, undefined, 'default', []),
        extensionInfo);

    function declareChrome() {
      window.chrome = window.chrome || {};
    }

    const extensionScriptId = crypto.randomUUID();
    const injectedScriptId = await session.send(
        'Page.addScriptToEvaluateOnNewDocument',
        {source: `(${declareChrome})();${injectedAPI}('${extensionScriptId}')`});

    try {
      await devToolsPage.evaluate(extensionInfo => {
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

      const iframe = await devToolsPage.waitFor(`[data-devtools-extension="${name}"]`);
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
