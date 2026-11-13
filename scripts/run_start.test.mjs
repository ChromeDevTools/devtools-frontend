// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Run these tests with:
//
//   vpython3 third_party/node/node.py --output node_modules/mocha/bin/mocha.js scripts/run_start.test.mjs

import { assert } from 'chai';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

import { downloadedChromeBinaryPath } from './devtools_paths.js';
import { launchWithOtaSignIn, splitRestArgs } from './run_ota_chrome.mjs';
import { resolveBrowser, validateStartOptions } from './run_start.mjs';

describe('run_start', () => {
  describe('resolveBrowser', () => {
    it('defaults browser to cft in standalone checkouts without --ota-username', () => {
      assert.strictEqual(resolveBrowser({ inChromium: false }), 'cft');
    });

    it('defaults browser to canary in Chromium checkouts', () => {
      assert.strictEqual(resolveBrowser({ inChromium: true }), 'canary');
    });

    it('defaults browser to stable when --ota-username is provided without --browser', () => {
      assert.strictEqual(
        resolveBrowser({
          otaUsername: 'test_ota@example.com',
          inChromium: false,
        }),
        'stable',
      );
      assert.strictEqual(
        resolveBrowser({
          otaUsername: 'test_ota@example.com',
          inChromium: true,
        }),
        'stable',
      );
    });

    it('preserves explicit --browser channel when --ota-username is provided', () => {
      assert.strictEqual(
        resolveBrowser({
          browser: 'canary',
          otaUsername: 'test_ota@example.com',
          inChromium: false,
        }),
        'canary',
      );
    });
  });

  describe('validateStartOptions', () => {
    it('rejects --ota-password without --ota-username', () => {
      assert.throws(
        () =>
          validateStartOptions({
            browser: 'cft',
            otaPassword: 'secret',
          }),
        /requires `--ota-username`/,
      );
    });

    it('rejects explicit --browser=cft with --ota-username', () => {
      assert.throws(
        () =>
          validateStartOptions({
            browser: 'cft',
            otaUsername: 'test_ota@example.com',
            userDataDir: '/tmp/profile',
          }),
        /cannot be used with Chrome for Testing/,
      );
    });

    it('rejects --ota-username without --user-data-dir', () => {
      assert.throws(
        () =>
          validateStartOptions({
            browser: 'canary',
            otaUsername: 'test_ota@example.com',
          }),
        /The `--ota-username` command line switch must be accompanied by the `--user-data-dir` switch/,
      );
    });

    it('allows --ota-username when --user-data-dir is provided', () => {
      assert.doesNotThrow(() =>
        validateStartOptions({
          browser: 'canary',
          otaUsername: 'test_ota@example.com',
          userDataDir: '/tmp/profile',
        }),
      );
    });

    it('rejects --remote-debugging-port on branded Chrome without --user-data-dir', () => {
      assert.throws(
        () =>
          validateStartOptions({
            browser: 'canary',
            remoteDebuggingPort: 9222,
          }),
        /must be accompanied by the `--user-data-dir` switch/,
      );
      assert.throws(
        () =>
          validateStartOptions({
            browser: 'canary',
            remoteDebuggingPort: 0,
          }),
        /must be accompanied by the `--user-data-dir` switch/,
      );
    });

    it('rejects invalid --remote-debugging-port values', () => {
      assert.throws(
        () =>
          validateStartOptions({
            browser: 'cft',
            remoteDebuggingPort: Number.NaN,
          }),
        /Invalid `--remote-debugging-port`/,
      );
      assert.throws(
        () =>
          validateStartOptions({
            browser: 'cft',
            remoteDebuggingPort: 70000,
          }),
        /Invalid `--remote-debugging-port`/,
      );
    });
  });

  describe('splitRestArgs', () => {
    it('separates extra Chrome flags from target URLs', () => {
      const result = splitRestArgs([
        '--disable-gpu',
        'https://example.com',
        '--lang=en-US',
        'http://localhost:3000',
      ]);

      assert.deepEqual(result, {
        extraChromeFlags: ['--disable-gpu', '--lang=en-US'],
        targetUrls: ['https://example.com', 'http://localhost:3000'],
      });
    });
  });

  describe('launchWithOtaSignIn', function () {
    this.timeout(15_000);

    const cftBinary = downloadedChromeBinaryPath();
    const runIntegrationIt = fs.existsSync(cftBinary) ? it : it.skip;

    runIntegrationIt(
      'uses default pipe transport when remoteDebuggingPort is omitted and keeps Chrome alive after disconnect',
      async () => {
        const customProfileDir = fs.mkdtempSync(
          path.join(os.tmpdir(), 'dt-start-pipe-'),
        );
        const loginCalls = [];

        try {
          await launchWithOtaSignIn({
            binary: cftBinary,
            baseArgs: [
              '--headless=new',
              '--no-sandbox',
              '--no-first-run',
              '--disable-gpu',
            ],
            otaUsername: 'test_ota@example.com',
            otaPassword: 'test_password',
            userDataDir: customProfileDir,
            targetUrls: ['data:text/html,<title>Ready</title>'],
            loginFn: async (page, username, password) => {
              loginCalls.push({ url: page.url(), username, password });
            },
            onSignedIn: async ({ browserProcess, profileDir }) => {
              try {
                assert.strictEqual(profileDir, customProfileDir);
                assert.isNotNull(browserProcess);
                assert.isNull(browserProcess.exitCode);
                assert.include(
                  browserProcess.spawnargs,
                  '--remote-debugging-pipe',
                );
              } finally {
                browserProcess?.kill();
              }
            },
          });

          assert.deepEqual(loginCalls, [
            {
              url: 'about:blank',
              username: 'test_ota@example.com',
              password: 'test_password',
            },
          ]);
        } finally {
          fs.rmSync(customProfileDir, { recursive: true, force: true });
        }
      },
    );

    runIntegrationIt(
      'signs in, opens target URLs, and keeps Chrome alive after CDP disconnect with remoteDebuggingPort',
      async () => {
        const customProfileDir = fs.mkdtempSync(
          path.join(os.tmpdir(), 'dt-start-signin-'),
        );
        const loginCalls = [];

        try {
          await launchWithOtaSignIn({
            binary: cftBinary,
            baseArgs: [
              '--headless=new',
              '--no-sandbox',
              '--no-first-run',
              '--disable-gpu',
              '--remote-debugging-port=0',
            ],
            remoteDebuggingPort: 0,
            otaUsername: 'test_ota@example.com',
            otaPassword: 'test_password',
            userDataDir: customProfileDir,
            targetUrls: ['data:text/html,<title>Ready</title>'],
            loginFn: async (page, username, password) => {
              loginCalls.push({ url: page.url(), username, password });
            },
            onSignedIn: async ({ browserProcess, profileDir }) => {
              assert.strictEqual(profileDir, customProfileDir);
              assert.isTrue(fs.existsSync(profileDir));
              assert.isNotNull(browserProcess);
              assert.isNull(browserProcess.exitCode);
              assert.include(
                browserProcess.spawnargs,
                '--auto-accept-browser-signin-for-tests',
              );
              assert.include(
                browserProcess.spawnargs,
                '--allow-browser-signin=true',
              );

              // Reconnect via DevToolsActivePort to confirm loginPage was closed,
              // the target URL tab is open, and Chrome remained running after disconnect.
              const activePortLines = fs
                .readFileSync(
                  path.join(profileDir, 'DevToolsActivePort'),
                  'utf8',
                )
                .trim()
                .split('\n');
              const wsEndpoint = `ws://127.0.0.1:${activePortLines[0]}${activePortLines[1]}`;
              const reconnected = await puppeteer.connect({
                browserWSEndpoint: wsEndpoint,
              });
              try {
                const openUrls = (await reconnected.pages()).map(p => p.url());
                assert.deepEqual(openUrls, [
                  'data:text/html,<title>Ready</title>',
                ]);
              } finally {
                await reconnected.close();
              }
            },
          });

          assert.deepEqual(loginCalls, [
            {
              url: 'about:blank',
              username: 'test_ota@example.com',
              password: 'test_password',
            },
          ]);
          assert.isTrue(
            fs.existsSync(customProfileDir),
            'Expected caller-provided --user-data-dir to be preserved after Chrome exits',
          );
        } finally {
          fs.rmSync(customProfileDir, { recursive: true, force: true });
        }
      },
    );

    runIntegrationIt(
      'preserves caller-provided --user-data-dir and cleans up browser on login failure',
      async () => {
        const customProfileDir = fs.mkdtempSync(
          path.join(os.tmpdir(), 'dt-start-custom-'),
        );
        try {
          let rejectedError = null;
          try {
            await launchWithOtaSignIn({
              binary: cftBinary,
              baseArgs: [
                '--headless=new',
                '--no-sandbox',
                '--no-first-run',
                '--disable-gpu',
              ],
              otaUsername: 'test_ota@example.com',
              userDataDir: customProfileDir,
              loginFn: async () => {
                throw new Error('simulated login failure');
              },
            });
          } catch (error) {
            rejectedError = error;
          }

          assert.instanceOf(rejectedError, Error);
          assert.match(rejectedError.message, /simulated login failure/);
          assert.isTrue(
            fs.existsSync(customProfileDir),
            'Expected explicit --user-data-dir to be preserved',
          );
        } finally {
          fs.rmSync(customProfileDir, { recursive: true, force: true });
        }
      },
    );
  });
});
