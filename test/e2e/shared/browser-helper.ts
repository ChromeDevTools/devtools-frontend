// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as url from 'node:url';
import * as puppeteer from 'puppeteer-core';

import {setupBrowserProcessIO} from '../../conductor/events.js';
import {GEN_DIR} from '../../conductor/paths.js';
import {TestConfig} from '../../conductor/test_config.js';

import {chromeLogin, configureDevToolsPreferences} from './auth-helper.js';

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
      const target = path.join(TestConfig.artifactsDir, file);
      if (fs.existsSync(target)) {
        continue;
      }
      console.error('Collecting crash dump:', file);
      fs.copyFileSync(
          path.join(crashesPath, file),
          path.join(TestConfig.artifactsDir, file),
      );
    }
  }

  #getCrashpadDir() {
    // TODO (liviurau): generate a tmp dir and pass when launching puppeteer
    // instead of parsing it out of args
    const userDataArg = this.browser.process()?.spawnargs.find(arg => arg.startsWith('--user-data-dir='));
    if (userDataArg) {
      const configuredPath = path.join(
          userDataArg.split('=')[1],
          'Crashpad',
          'pending',
      );
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
            homeDir,
            'Library',
            'Application Support',
            'Google',
            'Chrome for Testing',
            'Crashpad',
            'pending',
        );
      case 'win32': {
        const localAppData = path.join(
            process.env.LOCALAPPDATA ?? '',
            'Google',
            'Chrome for Testing',
            'User Data',
            'Crashpad',
            'pending',
        );
        if (fs.existsSync(localAppData)) {
          return localAppData;
        }
        return path.join(
            homeDir,
            'AppData',
            'Local',
            'Google',
            'Chrome for Testing',
            'User Data',
            'Crashpad',
            'pending',
        );
      }
      case 'linux':
        return path.join(
            homeDir,
            '.config',
            'google-chrome-for-testing',
            'Crashpad',
            'pending',
        );
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }
}

export interface BrowserSettings {
  chromeUsername?: string;
  enabledFeatures: string[];
  disabledFeatures: string[];
  extensions?: string[];
  useCFT?: boolean;
}

export class Launcher {
  static async browserSetup(settings: BrowserSettings, serverPort: number) {
    const browser = await Launcher.launchChrome(settings, serverPort);
    setupBrowserProcessIO(browser);
    const wrapper = new BrowserWrapper(browser);
    if (settings.extensions && settings.extensions.length > 0) {
      for (const extPath of settings.extensions) {
        await wrapper.browser.installExtension(extPath, {
          enabledInIncognito: true,
        });
      }
    }
    if (settings.chromeUsername) {
      const loginPage = await wrapper.browser.newPage();
      await chromeLogin(loginPage, settings.chromeUsername);
      await configureDevToolsPreferences(loginPage);
    }
    return wrapper;
  }

  static async launchChrome(settings: BrowserSettings, serverPort: number) {
    const frontEndDirectory = url.pathToFileURL(
        path.join(GEN_DIR, 'front_end'),
    );
    const disabledFeatures = settings.disabledFeatures ?? DEFAULT_BROWSER_SETTINGS.disabledFeatures;
    const launchArgs = [
      '--enable-experimental-web-platform-features',
      // This fingerprint may be generated from the certificate using
      // openssl x509 -noout -pubkey -in scripts/hosted_mode/cert.pem | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64
      `--host-resolver-rules=MAP *.test 127.0.0.1, MAP chromeuxreport.googleapis.com 127.0.0.1:${serverPort}`,
      '--enable-crash-reporter',
      // This has no effect (see https://crbug.com/435638630)
      `--crash-dumps-dir=${TestConfig.artifactsDir}`,
      `--privacy-sandbox-enrollment-overrides=https://localhost:${serverPort}`,
      '--remote-allow-origins=*',
      '--ignore-certificate-errors-spki-list=KLy6vv6synForXwI6lDIl+D3ZrMV6Y1EMTY6YpOcAos=',
      `--custom-devtools-frontend=${frontEndDirectory}`,
      '--site-per-process',  // Default on Desktop anyway, but ensure that we always use out-of-process frames when we intend to.
      '--disable-gpu',
      '--enable-crash-reporter',
      `--disable-features=${disabledFeatures.join(',')}`,
      `--remote-debugging-port=0`,
    ];

    const ignoreDefaultArgs = [
      '--disable-crash-reporter',
      '--disable-breakpad',
    ];

    if (settings.chromeUsername) {
      ignoreDefaultArgs.push('--disable-sync');
      launchArgs.push('--auto-accept-browser-signin-for-tests');
      launchArgs.push('--allow-browser-signin=true');
    }

    // CDP commands in e2e and interaction should not generally take
    // more than 20 seconds, but performance tests might require more time.
    const protocolTimeout = TestConfig.debug ? 0 : TestConfig.isPerfTest ? 120_000 : 20_000;
    const executablePath = TestConfig.chromeBinary;
    const headless = TestConfig.headless;

    const opts: puppeteer.LaunchOptions = {
      headless,
      executablePath,
      dumpio: !headless || TestConfig.isLuci,
      protocolTimeout,
      networkEnabled: false,
      enableExtensions: true,
      pipe: true,
      ignoreDefaultArgs,
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
    if (!opts.headless) {
      launchArgs.push(`--window-size=${windowWidth},${windowHeight}`);
    }
    const enabledFeatures = settings.enabledFeatures ?? DEFAULT_BROWSER_SETTINGS.enabledFeatures;
    // TODO: remove
    const envChromeFeatures = process.env['CHROME_FEATURES'];
    if (envChromeFeatures) {
      enabledFeatures.push(envChromeFeatures);
    }
    launchArgs.push(`--enable-features=${enabledFeatures.join(',')}`);

    opts.args = launchArgs;
    return await puppeteer.launch(opts);
  }
}

export const DEFAULT_BROWSER_SETTINGS: BrowserSettings = {
  enabledFeatures: [
    'PartitionedCookies',
    'FencedFrames',
    'PrivacySandboxAdsAPIsOverride',
    'AutofillEnableDevtoolsIssues',
    'DevToolsVeLogging:testing/true',
    'CADisplayLink',
  ],
  disabledFeatures: [
    'PMProcessPriorityPolicy',                     // crbug.com/361252079
    'MojoChannelAssociatedSendUsesRunOrPostTask',  // crbug.com/376228320
    'RasterInducingScroll',                        // crbug.com/381055647
    'CompositeBackgroundColorAnimation',           // crbug.com/381055647
    'ScriptSrcHashesV1',                           // crbug.com/443216445
    'RenderDocument',                              // crbug.com/444369637
  ],
  useCFT: true,
};
