// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'fs';
import * as os from 'os';
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

  get connected() {
    return this.browser.connected;
  }

  async createBrowserContext() {
    return await this.browser.createBrowserContext();
  }

  copyCrashDumps() {
    const crashesPath = this.#getCrashpadDir();
    if (!fs.existsSync(crashesPath)) {
      // TODO (liviurau): Determine where exactly does Crashpad store the dumps on
      // Linux and Windows.
      console.error('No crash dumps found at location ', crashesPath);
      return;
    }
    for (const file of fs.readdirSync(crashesPath)) {
      console.error('Collecting crash dump:', file);
      fs.copyFileSync(path.join(crashesPath, file), path.join(TestConfig.artifactsDir, file));
    }
  }

  #getCrashpadDir() {
    // TODO (liviurau): generate a tmp dir and pass when launching puppeteer
    // instead of parsing it out of args
    const userDataArg = this.browser.process()?.spawnargs.find(arg => arg.startsWith('--user-data-dir='));
    if (userDataArg) {
      const configuredPath = path.join(userDataArg.split('=')[1], 'Crashpad', 'pending');
      // `--user-data-dir` generally does not contain Craspad files on any
      // platform. In the future this might get properly aligned so we search
      // here first.
      if (fs.existsSync(configuredPath)) {
        return configuredPath;
      }
    }
    const homeDir = os.homedir();
    const platform = os.platform();
    switch (platform) {
      case 'darwin':
        return path.join(
            homeDir, 'Library', 'Application Support', 'Google', 'Chrome for Testing', 'Crashpad', 'pending');
      case 'win32': {
        const localAppData = path.join(
            process.env.LOCALAPPDATA ?? '', 'Google', 'Chrome for Testing', 'User Data', 'Crashpad', 'pending');
        if (fs.existsSync(localAppData)) {
          return localAppData;
        }
        return path.join(
            homeDir, 'AppData', 'Local', 'Google', 'Chrome for Testing', 'User Data', 'Crashpad', 'pending');
      }
      case 'linux':
        return path.join(homeDir, '.config', 'google-chrome-for-testing', 'Crashpad', 'pending');
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }
}
export class Launcher {
  static async browserSetup(settings: BrowserSettings) {
    const browser = await Launcher.launchChrome(settings);
    setupBrowserProcessIO(browser);
    return new BrowserWrapper(browser);
  }

  private static launchChrome(settings: BrowserSettings) {
    const frontEndDirectory = url.pathToFileURL(path.join(GEN_DIR, 'front_end'));
    const disabledFeatures = settings.disabledFeatures?.slice() ?? [];
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
      `--custom-devtools-frontend=${frontEndDirectory}`,
      '--enable-crash-reporter',
      // This has no effect (see https://crbug.com/435638630)
      `--crash-dumps-dir=${TestConfig.artifactsDir}`,
    ];
    const headless = TestConfig.headless;
    // CDP commands in e2e and interaction should not generally take
    // more than 20 seconds.
    const protocolTimeout = TestConfig.debug ? 0 : 20_000;
    const executablePath = TestConfig.chromeBinary;

    const opts: puppeteer.LaunchOptions = {
      headless,
      executablePath,
      dumpio: !headless || Boolean(process.env['LUCI_CONTEXT']),
      protocolTimeout,
      networkEnabled: false,
      pipe: true,
      ignoreDefaultArgs: [
        '--disable-crash-reporter',
        '--disable-breakpad',
      ],
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
    const enabledFeatures = settings.enabledFeatures?.slice() ?? [];
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
  enabledFeatures: string[];
  disabledFeatures: string[];
}

export const DEFAULT_BROWSER_SETTINGS: BrowserSettings = {
  // LINT.IfChange(features)
  enabledFeatures: [
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
