// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as puppeteer from 'puppeteer-core';

import {installPageErrorHandlers} from '../../conductor/events.js';

import {PageWrapper} from './page-wrapper.js';

const envThrottleRate = process.env['STRESS'] ? 3 : 1;
const envLatePromises = process.env['LATE_PROMISES'] !== undefined ?
    ['true', ''].includes(process.env['LATE_PROMISES'].toLowerCase()) ? 10 : Number(process.env['LATE_PROMISES']) :
    0;

export class DevToolsFronendPage extends PageWrapper {
  async setExperimentEnabled(experiment: string, enabled: boolean) {
    await this.evaluate(`(async () => {
      const Root = await import('./core/root/root.js');
      Root.Runtime.experiments.setEnabled('${experiment}', ${enabled});
    })()`);
  }

  async enableExperiment(experiment: string) {
    await this.setExperimentEnabled(experiment, true);
  }

  async delayPromisesIfRequired(): Promise<void> {
    if (envLatePromises === 0) {
      return;
    }
    /* eslint-disable-next-line no-console */
    console.log(`Delaying promises by ${envLatePromises}ms`);
    await this.evaluate(delay => {
      global.Promise = class<T> extends Promise<T>{
        constructor(
            executor: (resolve: (value: T|PromiseLike<T>) => void, reject: (reason?: unknown) => void) => void) {
          super((resolve, reject) => {
            executor(
                value => setTimeout(() => resolve(value), delay), reason => setTimeout(() => reject(reason), delay));
          });
        }
      };
    }, envLatePromises);
  }

  async throttleCPUIfRequired(): Promise<void> {
    if (envThrottleRate === 1) {
      return;
    }
    /* eslint-disable-next-line no-console */
    console.log(`Throttling CPU: ${envThrottleRate}x slowdown`);
    const client = await this.page.target().createCDPSession();
    await client.send('Emulation.setCPUThrottlingRate', {
      rate: envThrottleRate,
    });
  }

  async setDevToolsSetting(settingName: string, value: string|boolean) {
    const rawValue = (typeof value === 'boolean') ? value.toString() : `'${value}'`;
    await this.evaluate(`(async () => {
      const Common = await import('./core/common/common.js');
      Common.Settings.Settings.instance().createSetting('${settingName}', ${rawValue});
    })()`);
  }

  async reload() {
    await this.page.reload();
  }

  async setDockingSide(side: string) {
    await this.evaluate(`
      (async function() {
        const UI = await import('./ui/legacy/legacy.js');
        UI.DockController.DockController.instance().setDockSide('${side}');
      })();
    `);
  }

  async ensureReadyForTesting() {
    await this.waitForFunction(`
      (async function() {
        const Main = await import('./entrypoints/main/main.js');
        return Main.MainImpl.MainImpl.instanceForTest !== null;
        })()
        `);
    await this.evaluate(`
      (async function() {
        const Main = await import('./entrypoints/main/main.js');
        await Main.MainImpl.MainImpl.instanceForTest.readyForTest();
      })();
    `);
  }
}

export interface DevtoolsSettings {
  enabledDevToolsExperiments: string[];
  devToolsSettings: {[key: string]: string|boolean};
  dockingMode: string;
}

export const DEFAULT_DEVTOOLS_SETTINGS = {
  enabledDevToolsExperiments: [],
  devToolsSettings: {
    isUnderTest: true,
  },
  dockingMode: 'UNDOCKED',
};

export async function setupDevToolsPage(context: puppeteer.BrowserContext, settings: DevtoolsSettings) {
  const devToolsTarget = await context.waitForTarget(target => target.url().startsWith('devtools://'));
  const frontend = await devToolsTarget?.page();
  if (!frontend) {
    throw new Error('Unable to find frontend target!');
  }
  installPageErrorHandlers(frontend);
  const devToolsPage = new DevToolsFronendPage(frontend);
  await devToolsPage.ensureReadyForTesting();
  for (const key in settings.devToolsSettings) {
    await devToolsPage.setDevToolsSetting(key, settings.devToolsSettings[key]);
  }
  for (const experiment of settings.enabledDevToolsExperiments) {
    await devToolsPage.enableExperiment(experiment);
  }
  await devToolsPage.setDockingSide(settings.dockingMode);
  await devToolsPage.reload();
  await devToolsPage.ensureReadyForTesting();
  await devToolsPage.throttleCPUIfRequired();
  await devToolsPage.delayPromisesIfRequired();
  return devToolsPage;
}
