// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as path from 'path';
import * as puppeteer from 'puppeteer-core';
import * as url from 'url';

import {setupBrowserProcessIO} from '../../conductor/events.js';
import {GEN_DIR} from '../../conductor/paths.js';
import {TestConfig} from '../../conductor/test_config.js';

export class BrowserWrapper {
  browser: puppeteer.Browser;

  constructor(b: puppeteer.Browser) {
    this.browser = b;
  }

  async createBrowserContext() {
    return await this.browser.createBrowserContext();
  }
}
export class Launcher {
  static async browserSetup(settings: BrowserSettings) {
    const browser = await Launcher.launchChrome(settings);
    setupBrowserProcessIO(browser);
    // Close default devtools.
    const devToolsTarget = await browser.waitForTarget(target => target.url().startsWith('devtools://'));
    const page = await devToolsTarget.page();
    await page?.close();
    return new BrowserWrapper(browser);
  }

  private static launchChrome(settings: BrowserSettings) {
    const frontEndDirectory = url.pathToFileURL(path.join(GEN_DIR, 'front_end'));
    const disabledFeatures = settings.enabledBlinkFeatures?.slice() ?? [];
    const launchArgs = [
      '--remote-allow-origins=*',
      '--remote-debugging-port=0',
      '--enable-experimental-web-platform-features',
      // This fingerprint may be generated from the certificate using
      // openssl x509 -noout -pubkey -in scripts/hosted_mode/cert.pem | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64
      '--ignore-certificate-errors-spki-list=KLy6vv6synForXwI6lDIl+D3ZrMV6Y1EMTY6YpOcAos=',
      '--site-per-process',  // Default on Desktop anyway, but ensure that we always use out-of-process frames when we intend to.
      '--host-resolver-rules=MAP *.test 127.0.0.1',
      '--disable-gpu',
      `--disable-features=${disabledFeatures.join(',')}`,
      '--auto-open-devtools-for-tabs',
      `--custom-devtools-frontend=${frontEndDirectory}`,
    ];
    const headless = !TestConfig.debug || TestConfig.headless;
    // CDP commands in e2e and interaction should not generally take
    // more than 20 seconds.
    const protocolTimeout = TestConfig.debug ? 0 : 20_000;
    const envSlowMo = process.env['STRESS'] ? 50 : undefined;
    const executablePath = TestConfig.chromeBinary;

    const opts: puppeteer.LaunchOptions = {
      headless,
      executablePath,
      dumpio: !headless || Boolean(process.env['LUCI_CONTEXT']),
      slowMo: envSlowMo,
      protocolTimeout,
    };

    TestConfig.configureChrome(executablePath);

    const viewportWidth = 1280;
    const viewportHeight = 720;
    // Adding some offset to the window size used in the headful mode
    // so to account for the size of the browser UI.
    // Values are chosen by trial and error to make sure that the window
    // size is not much bigger than the viewport but so that the entire
    // viewport is visible.
    const windowWidth = viewportWidth + 50;
    const windowHeight = viewportHeight + 200;
    // Always set the default viewport because setting only the window size for
    // headful mode would result in much smaller actual viewport.
    opts.defaultViewport = {width: viewportWidth, height: viewportHeight};
    // Toggle either viewport or window size depending on headless vs not.
    if (!headless) {
      launchArgs.push(`--window-size=${windowWidth},${windowHeight}`);
    }
    const enabledFeatures = settings.enabledBlinkFeatures?.slice() ?? [];
    // TODO: remove
    const envChromeFeatures = process.env['CHROME_FEATURES'];
    if (envChromeFeatures) {
      enabledFeatures.push(envChromeFeatures);
    }
    launchArgs.push(`--enable-features=${enabledFeatures.join(',')}`);

    opts.args = launchArgs;
    return puppeteer.launch(opts);
  }
}

export interface BrowserSettings {
  enabledBlinkFeatures: string[];
  disabledFeatures: string[];
}

export const DEFAULT_BROWSER_SETTINGS: BrowserSettings = {
  // LINT.IfChange(features)
  enabledBlinkFeatures: [
    'PartitionedCookies',
    'SharedStorageAPI',
    'FencedFrames',
    'PrivacySandboxAdsAPIsOverride',
    'AutofillEnableDevtoolsIssues',
    'DevToolsVeLogging:testing/true',
  ],
  disabledFeatures: [
    'PMProcessPriorityPolicy',                     // crbug.com/361252079
    'MojoChannelAssociatedSendUsesRunOrPostTask',  // crbug.com/376228320
    'RasterInducingScroll',                        // crbug.com/381055647
    'CompositeBackgroundColorAnimation',           // crbug.com/381055647
  ]
  // LINT.ThenChange(/test/conductor/hooks.ts:features)
};
