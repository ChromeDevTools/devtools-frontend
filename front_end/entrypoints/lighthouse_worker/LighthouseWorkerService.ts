// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../../core/root/root.js';
import * as PuppeteerService from '../../services/puppeteer/puppeteer.js';
import type * as SDK from '../../core/sdk/sdk.js';

function disableLoggingForTest(): void {
  console.log = (): void => undefined;  // eslint-disable-line no-console
}

/**
 * LegacyPort is provided to Lighthouse as the CDP connection in legacyNavigation mode.
 * Its complement is https://github.com/GoogleChrome/lighthouse/blob/v9.3.1/lighthouse-core/gather/connections/raw.js
 * It speaks pure CDP via notifyFrontendViaWorkerMessage
 *
 * Any message that comes back from Lighthouse has to go via a so-called "port".
 * This class holds the relevant callbacks that Lighthouse provides and that
 * can be called in the onmessage callback of the worker, so that the frontend
 * can communicate to Lighthouse. Lighthouse itself communicates to the frontend
 * via status updates defined below.
 */
class LegacyPort {
  onMessage?: (message: string) => void;
  onClose?: () => void;
  on(eventName: string, callback: (arg?: string) => void): void {
    if (eventName === 'message') {
      this.onMessage = callback;
    } else if (eventName === 'close') {
      this.onClose = callback;
    }
  }

  send(message: string): void {
    notifyFrontendViaWorkerMessage('sendProtocolMessage', {message});
  }
  close(): void {
  }
}

/**
 * ConnectionProxy is a SDK interface, but the implementation has no knowledge it's a parallelConnection.
 * The CDP traffic is smuggled back and forth by the system described in LighthouseProtocolService
 */
class ConnectionProxy implements SDK.Connections.ParallelConnectionInterface {
  sessionId: string;
  onMessage: ((arg0: Object) => void)|null;
  onDisconnect: ((arg0: string) => void)|null;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.onMessage = null;
    this.onDisconnect = null;
  }

  setOnMessage(onMessage: (arg0: (Object|string)) => void): void {
    this.onMessage = onMessage;
  }

  setOnDisconnect(onDisconnect: (arg0: string) => void): void {
    this.onDisconnect = onDisconnect;
  }

  getOnDisconnect(): (((arg0: string) => void)|null) {
    return this.onDisconnect;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  sendRawMessage(message: string): void {
    notifyFrontendViaWorkerMessage('sendProtocolMessage', {message});
  }

  async disconnect(): Promise<void> {
    this.onDisconnect?.('force disconnect');
    this.onDisconnect = null;
    this.onMessage = null;
  }
}

const legacyPort = new LegacyPort();
let cdpConnection: ConnectionProxy|undefined;
let endTimespan: (() => unknown)|undefined;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function invokeLH(action: string, args: any): Promise<unknown> {
  if (Root.Runtime.Runtime.queryParam('isUnderTest')) {
    disableLoggingForTest();
    args.flags.maxWaitForLoad = 2 * 1000;
  }

  // @ts-expect-error https://github.com/GoogleChrome/lighthouse/issues/11628
  self.listenForStatus(message => {
    notifyFrontendViaWorkerMessage('statusUpdate', {message: message[1]});
  });

  let puppeteerHandle: Awaited<ReturnType<
      typeof PuppeteerService.PuppeteerConnection.PuppeteerConnectionHelper['connectPuppeteerToConnection']>>|undefined;

  try {
    // For timespan we only need to perform setup on startTimespan.
    // Config, flags, locale, etc. should be stored in the closure of endTimespan.
    if (action === 'endTimespan') {
      if (!endTimespan) {
        throw new Error('Cannot end a timespan before starting one');
      }
      const result = await endTimespan();
      endTimespan = undefined;
      return result;
    }

    const locale = await fetchLocaleData(args.locales);
    const flags = args.flags;
    flags.logLevel = flags.logLevel || 'info';
    flags.channel = 'devtools';
    flags.locale = locale;

    // TODO: Remove this filter once pubads is mode restricted
    // https://github.com/googleads/publisher-ads-lighthouse-plugin/pull/339
    if (action === 'startTimespan' || action === 'snapshot') {
      args.categoryIDs = args.categoryIDs.filter((c: string) => c !== 'lighthouse-plugin-publisher-ads');
    }

    // @ts-expect-error https://github.com/GoogleChrome/lighthouse/issues/11628
    const config = args.config || self.createConfig(args.categoryIDs, flags.formFactor);
    const url = args.url;

    // Handle legacy Lighthouse runner path.
    if (action === 'navigation' && flags.legacyNavigation) {
      // @ts-expect-error https://github.com/GoogleChrome/lighthouse/issues/11628
      const connection = self.setUpWorkerConnection(legacyPort);
      // @ts-expect-error https://github.com/GoogleChrome/lighthouse/issues/11628
      return await self.runLighthouse(url, flags, config, connection);
    }

    const {mainFrameId, mainSessionId, targetInfos} = args;
    cdpConnection = new ConnectionProxy(mainSessionId);
    puppeteerHandle = await PuppeteerService.PuppeteerConnection.PuppeteerConnectionHelper.connectPuppeteerToConnection({
      connection: cdpConnection,
      mainFrameId,
      targetInfos,
      // For the most part, defer to Lighthouse for which targets are important.
      // Excluding devtools targets is required for e2e tests to work, and LH doesn't support auditing DT targets anyway.
      targetFilterCallback: targetInfo => !targetInfo.url.match(/^https:\/\/i0.devtools-frontend/),
      // Lighthouse can only audit normal pages.
      isPageTargetCallback: targetInfo => targetInfo.type === 'page',
    });
    const {page} = puppeteerHandle;
    const configContext = {
      logLevel: flags.logLevel,
      settingsOverrides: flags,
    };

    if (action === 'snapshot') {
      // TODO: Remove `configContext` once Lighthouse roll removes it
      // @ts-expect-error https://github.com/GoogleChrome/lighthouse/issues/11628
      return await self.runLighthouseSnapshot({config, page, configContext, flags});
    }

    if (action === 'startTimespan') {
      // TODO: Remove `configContext` once Lighthouse roll removes it
      // @ts-expect-error https://github.com/GoogleChrome/lighthouse/issues/11628
      const timespan = await self.startLighthouseTimespan({config, page, configContext, flags});
      endTimespan = timespan.endTimespan;
      return;
    }

    // TODO: Remove `configContext` once Lighthouse roll removes it
    // @ts-expect-error https://github.com/GoogleChrome/lighthouse/issues/11628
    return await self.runLighthouseNavigation(url, {config, page, configContext, flags});
  } catch (err) {
    return ({
      fatal: true,
      message: err.message,
      stack: err.stack,
    });
  } finally {
    // endTimespan will need to use the same connection as startTimespan.
    if (action !== 'startTimespan') {
      puppeteerHandle?.browser.disconnect();
    }
  }
}

/**
 * Finds a locale supported by Lighthouse from the user's system locales.
 * If no matching locale is found, or if fetching locale data fails, this function returns nothing
 * and Lighthouse will use `en-US` by default.
 */
async function fetchLocaleData(locales: string[]): Promise<string|void> {
  // @ts-expect-error https://github.com/GoogleChrome/lighthouse/issues/11628
  const locale = self.lookupLocale(locales);

  // If the locale is en-US, no need to fetch locale data.
  if (locale === 'en-US' || locale === 'en') {
    return;
  }

  // Try to load the locale data.
  try {
    const remoteBase = Root.Runtime.getRemoteBase();
    let localeUrl: string;
    if (remoteBase && remoteBase.base) {
      localeUrl = `${remoteBase.base}third_party/lighthouse/locales/${locale}.json`;
    } else {
      localeUrl = new URL(`../../third_party/lighthouse/locales/${locale}.json`, import.meta.url).toString();
    }

    const timeoutPromise = new Promise<string>(
        (resolve, reject) => setTimeout(() => reject(new Error('timed out fetching locale')), 5000));
    const localeData = await Promise.race([timeoutPromise, fetch(localeUrl).then(result => result.json())]);
    // @ts-expect-error https://github.com/GoogleChrome/lighthouse/issues/11628
    self.registerLocaleData(locale, localeData);
    return locale;
  } catch (err) {
    console.error(err);
  }

  return;
}

/**
 * `notifyFrontendViaWorkerMessage` and `onFrontendMessage` work with the FE's ProtocolService.
 *
 * onFrontendMessage takes action-wrapped messages and either invoking lighthouse or delivering it CDP traffic.
 * notifyFrontendViaWorkerMessage posts action-wrapped messages to the FE.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function notifyFrontendViaWorkerMessage(action: string, args: any): void {
  self.postMessage({action, args});
}

async function onFrontendMessage(event: MessageEvent): Promise<void> {
  const messageFromFrontend = event.data;
  switch (messageFromFrontend.action) {
    case 'startTimespan':
    case 'endTimespan':
    case 'snapshot':
    case 'navigation': {
      const result = await invokeLH(messageFromFrontend.action, messageFromFrontend.args);
      if (result && typeof result === 'object') {
        // Report isn't used upstream.
        if ('report' in result) {
          delete result.report;
        }

        // Logger PerformanceTiming objects cannot be cloned by this worker's `postMessage` function.
        if ('artifacts' in result) {
          // @ts-expect-error
          result.artifacts.Timing = JSON.parse(JSON.stringify(result.artifacts.Timing));
        }
      }
      self.postMessage({id: messageFromFrontend.id, result});
      break;
    }
    case 'dispatchProtocolMessage': {
      cdpConnection?.onMessage?.(messageFromFrontend.args.message);
      legacyPort.onMessage?.(JSON.stringify(messageFromFrontend.args.message));
      break;
    }
    default: {
      throw new Error(`Unknown event: ${event.data}`);
    }
  }
}

self.onmessage = onFrontendMessage;

// Make lighthouse and traceviewer happy.
// @ts-ignore https://github.com/GoogleChrome/lighthouse/issues/11628
globalThis.global = self;
// @ts-expect-error https://github.com/GoogleChrome/lighthouse/issues/11628
globalThis.global.isVinn = true;
// @ts-expect-error https://github.com/GoogleChrome/lighthouse/issues/11628
globalThis.global.document = {};
// @ts-expect-error https://github.com/GoogleChrome/lighthouse/issues/11628
globalThis.global.document.documentElement = {};
// @ts-expect-error https://github.com/GoogleChrome/lighthouse/issues/11628
globalThis.global.document.documentElement.style = {
  WebkitAppearance: 'WebkitAppearance',
};
