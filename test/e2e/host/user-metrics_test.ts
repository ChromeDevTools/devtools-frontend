// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import * as puppeteer from 'puppeteer';

import {$, click, enableExperiment, getBrowserAndPages, platform, reloadDevTools, waitFor} from '../../shared/helper.js';
import {navigateToCssOverviewTab} from '../helpers/css-overview-helpers.js';
import {clickToggleButton, selectDualScreen, startEmulationWithDualScreenFlag} from '../helpers/emulation-helpers.js';
import {closeSecurityTab, navigateToSecurityTab} from '../helpers/security-helpers.js';
import {openPanelViaMoreTools} from '../helpers/settings-helpers.js';

interface UserMetric {
  name: string;
  value: string|number|LoadMetric;
}

interface LoadMetric {
  histogramName: string;
  panelName: string;
}

interface UserMetrics {
  Action: {[name: string]: number};
}

declare global {
  interface Window {
    __caughtEvents: UserMetric[];
    __beginCatchEvents: () => void;
    __endCatchEvents: () => void;
    __panelLoaded: (evt: Event) => void;
    __panelShown: (evt: Event) => void;
    __panelClosed: (evt: Event) => void;
    __actionTaken: (evt: Event) => void;
    __keyboardShortcutFired: (evt: Event) => void;
    __issuesPanelOpenedFrom: (evt: Event) => void;
    __keybindSetSettingChanged: (evt: Event) => void;
    __dualScreenDeviceEmulated: (evt: Event) => void;
    Host: {UserMetrics: UserMetrics; userMetrics: {actionTaken(name: number): void;}};
    UI: {inspectorView: {_showDrawer(show: boolean): void; showView(name: string): void;}};
  }
}

async function beginCatchEvents(frontend: puppeteer.Page) {
  await frontend.evaluate(() => {
    window.__panelShown = (evt: Event) => {
      const customEvt = evt as CustomEvent;
      window.__caughtEvents.push({name: 'DevTools.PanelShown', value: customEvt.detail.value});
    };

    window.__panelClosed = (evt: Event) => {
      const customEvt = evt as CustomEvent;
      window.__caughtEvents.push({name: 'DevTools.PanelClosed', value: customEvt.detail.value});
    };

    window.__panelLoaded = (evt: Event) => {
      const customEvt = evt as CustomEvent;
      window.__caughtEvents.push({name: 'DevTools.PanelLoaded', value: customEvt.detail.value});
    };

    window.__actionTaken = (evt: Event) => {
      const customEvt = evt as CustomEvent;
      window.__caughtEvents.push({name: 'DevTools.ActionTaken', value: customEvt.detail.value});
    };

    window.__keyboardShortcutFired = (evt: Event) => {
      const customEvt = evt as CustomEvent;
      window.__caughtEvents.push({name: 'DevTools.KeyboardShortcutFired', value: customEvt.detail.value});
    };

    window.__issuesPanelOpenedFrom = (evt: Event) => {
      const customEvt = evt as CustomEvent;
      window.__caughtEvents.push({name: 'DevTools.IssuesPanelOpenedFrom', value: customEvt.detail.value});
    };

    window.__keybindSetSettingChanged = (evt: Event) => {
      const customEvt = evt as CustomEvent;
      window.__caughtEvents.push({name: 'DevTools.KeybindSetSettingChanged', value: customEvt.detail.value});
    };

    window.__dualScreenDeviceEmulated = (evt: Event) => {
      const customEvt = evt as CustomEvent;
      window.__caughtEvents.push({name: 'DevTools.DualScreenDeviceEmulated', value: customEvt.detail.value});
    };

    window.__caughtEvents = [];
    window.__beginCatchEvents = () => {
      window.addEventListener('DevTools.PanelShown', window.__panelShown);
      window.addEventListener('DevTools.PanelClosed', window.__panelClosed);
      window.addEventListener('DevTools.PanelLoaded', window.__panelLoaded);
      window.addEventListener('DevTools.ActionTaken', window.__actionTaken);
      window.addEventListener('DevTools.KeyboardShortcutFired', window.__keyboardShortcutFired);
      window.addEventListener('DevTools.IssuesPanelOpenedFrom', window.__issuesPanelOpenedFrom);
      window.addEventListener('DevTools.KeybindSetSettingChanged', window.__keybindSetSettingChanged);
      window.addEventListener('DevTools.DualScreenDeviceEmulated', window.__dualScreenDeviceEmulated);
    };

    window.__endCatchEvents = () => {
      window.removeEventListener('DevTools.PanelShown', window.__panelShown);
      window.removeEventListener('DevTools.PanelClosed', window.__panelClosed);
      window.removeEventListener('DevTools.PanelLoaded', window.__panelLoaded);
      window.removeEventListener('DevTools.ActionTaken', window.__actionTaken);
      window.removeEventListener('DevTools.KeyboardShortcutFired', window.__keyboardShortcutFired);
      window.removeEventListener('DevTools.IssuesPanelOpenedFrom', window.__issuesPanelOpenedFrom);
      window.removeEventListener('DevTools.KeybindSetSettingChanged', window.__keybindSetSettingChanged);
      window.removeEventListener('DevTools.DualScreenDeviceEmulated', window.__dualScreenDeviceEmulated);
    };

    window.__beginCatchEvents();
  });
}

async function endCatchEvents(frontend: puppeteer.Page) {
  await frontend.evaluate(() => {
    window.__endCatchEvents();
  });
}

function retrieveCapturedEvents(frontend: puppeteer.Page) {
  return frontend.evaluate(() => window.__caughtEvents);
}

async function assertCapturedEvents(expected: UserMetric[]) {
  const {frontend} = getBrowserAndPages();
  const events = await retrieveCapturedEvents(frontend);

  assert.deepEqual(events, expected);
}

describe('User Metrics', () => {
  beforeEach(async () => {
    const {frontend} = getBrowserAndPages();
    await beginCatchEvents(frontend);
  });

  afterEach(async () => {
    const {frontend} = getBrowserAndPages();
    await endCatchEvents(frontend);
  });

  it('dispatches dock and undock events', async () => {
    const {frontend} = getBrowserAndPages();
    await frontend.evaluate(() => {
      self.Host.userMetrics.actionTaken(self.Host.UserMetrics.Action.WindowDocked);
      self.Host.userMetrics.actionTaken(self.Host.UserMetrics.Action.WindowUndocked);
    });
    await assertCapturedEvents([
      {
        name: 'DevTools.ActionTaken',
        value: 1,  // WindowDocked.
      },
      {
        name: 'DevTools.ActionTaken',
        value: 2,  // WindowUndocked.
      },
    ]);
  });

  it('dispatches a metric event the console drawer', async () => {
    const {frontend} = getBrowserAndPages();

    await frontend.keyboard.press('Escape');
    await frontend.waitForSelector('.console-view');

    await assertCapturedEvents([
      {
        name: 'DevTools.PanelShown',
        value: 10,  // drawer-console-view.
      },
      {
        name: 'DevTools.KeyboardShortcutFired',
        value: 17,  // main.toggle-drawer
      },
    ]);
  });

  it('dispatches events for views', async () => {
    const {frontend} = getBrowserAndPages();

    // Head to the Timeline tab.
    await click('#tab-timeline');
    await frontend.waitForSelector('.timeline');

    await assertCapturedEvents([{
      name: 'DevTools.PanelShown',
      value: 5,  // Timeline.
    }]);
  });

  it('dispatches events for triple dot items', async () => {
    await openPanelViaMoreTools('Animations');

    await assertCapturedEvents([
      {
        name: 'DevTools.PanelShown',
        value: 10,  // 'console-view'.
      },
      {
        name: 'DevTools.PanelShown',
        value: 11,  // 'animations'.
      },
    ]);
  });

  it('dispatches events for opening issues drawer via hamburger menu', async () => {
    await openPanelViaMoreTools('Issues');

    await assertCapturedEvents([
      {
        name: 'DevTools.IssuesPanelOpenedFrom',
        value: 3,  // 'HamburgerMenu'.
      },
      {
        name: 'DevTools.PanelShown',
        value: 10,  // 'console-view'.
      },
      {
        name: 'DevTools.PanelShown',
        value: 37,  // 'issues-pane'.
      },
    ]);
  });

  it('dispatches an event when F1 is used to open settings', async () => {
    const {frontend} = getBrowserAndPages();

    await frontend.keyboard.press('F1');
    await waitFor('.settings-window-main');

    await assertCapturedEvents([
      {
        name: 'DevTools.PanelShown',
        value: 29,
      },
      {
        name: 'DevTools.KeyboardShortcutFired',
        value: 22,  // settings.show
      },
    ]);
  });

  it('dispatches an event when Ctrl/Meta+F8 is used to deactivate breakpoints', async () => {
    const {frontend} = getBrowserAndPages();

    await click('#tab-sources');
    await waitFor('#sources-panel-sources-view');

    switch (platform) {
      case 'mac':
        await frontend.keyboard.down('Meta');
        break;

      case 'linux':
      case 'win32':
        await frontend.keyboard.down('Control');
        break;
    }

    await frontend.keyboard.press('F8');

    switch (platform) {
      case 'mac':
        await frontend.keyboard.up('Meta');
        break;

      case 'linux':
      case 'win32':
        await frontend.keyboard.up('Control');
        break;
    }

    await waitFor('[aria-label="Activate breakpoints"]');

    await assertCapturedEvents([
      {
        name: 'DevTools.PanelShown',
        value: 4,  // sources
      },
      {
        name: 'DevTools.KeyboardShortcutFired',
        value: 35,  // debugger.toggle-breakpoints-active
      },
    ]);
  });

  it('dispatches an event when the keybindSet setting is changed', async () => {
    const {frontend} = getBrowserAndPages();
    await enableExperiment('customKeyboardShortcuts');
    // enableExperiment reloads the DevTools and removes our listeners
    await beginCatchEvents(frontend);

    await frontend.keyboard.press('F1');
    await waitFor('.settings-window-main');
    await click('[aria-label="Shortcuts"]');
    await waitFor('.keybinds-set-select');

    const keybindSetSelect = await $('.keybinds-set-select select') as puppeteer.ElementHandle<HTMLSelectElement>;
    keybindSetSelect.select('vsCode');

    await assertCapturedEvents([
      {
        name: 'DevTools.PanelShown',
        value: 29,  // settings-preferences
      },
      {
        name: 'DevTools.KeyboardShortcutFired',
        value: 22,  // settings.show
      },
      {
        name: 'DevTools.PanelShown',
        value: 38,  // settings-keybinds
      },
      {
        name: 'DevTools.KeybindSetSettingChanged',
        value: 1,  // vsCode
      },
    ]);
  });

  it('dispatches closed panel events for views', async () => {
    // Focus and close a tab
    await navigateToSecurityTab();
    await closeSecurityTab();

    await assertCapturedEvents([
      {
        name: 'DevTools.PanelShown',
        value: 16,  // Security
      },
      {
        name: 'DevTools.PanelShown',
        value: 1,
      },
      {
        name: 'DevTools.PanelClosed',
        value: 16,  // Security
      },
    ]);
  });

  // Flaky test
  it.skip('[crbug.com/1071850]: tracks panel loading', async () => {
    // We specify the selected panel here because the default behavior is to go to the
    // elements panel, but this means we won't get the PanelLoaded event. Instead we
    // request that the resetPages helper sets the timeline as the target panel, and
    // we wait for the timeline in the test. This means, in turn, we get the PanelLoaded
    // event.
    await reloadDevTools({selectedPanel: {name: 'timeline'}});
    const {frontend} = getBrowserAndPages();

    await beginCatchEvents(frontend);

    await waitFor('.timeline');

    await assertCapturedEvents([
      {
        name: 'DevTools.PanelLoaded',
        value: {
          histogramName: 'DevTools.Launch.Timeline',
          panelName: 'timeline',
        },
      },
    ]);
  });
});

describe('User Metrics for dual screen emulation', () => {
  beforeEach(async () => {
    await startEmulationWithDualScreenFlag();
    const {frontend} = getBrowserAndPages();
    await beginCatchEvents(frontend);
  });

  it('dispatch events when dual screen emulation started and span button hit', async () => {
    await selectDualScreen();
    await clickToggleButton();

    await assertCapturedEvents([
      {
        name: 'DevTools.DualScreenDeviceEmulated',
        value: 0,  // Dual screen/fold device selected
      },
      {
        name: 'DevTools.ActionTaken',
        value: 10,  // Device mode enabled
      },
      {
        name: 'DevTools.DualScreenDeviceEmulated',
        value: 1,  // Toggle single/dual screen mode (span button)
      },
      {
        name: 'DevTools.ActionTaken',
        value: 10,  // Device mode enabled.
      },
    ]);
  });

  afterEach(async () => {
    const {frontend} = getBrowserAndPages();
    await endCatchEvents(frontend);
  });
});

describe('User Metrics for CSS Overview', () => {
  beforeEach(async () => {
    await enableExperiment('cssOverview');
    // enableExperiment reloads the DevTools and removes our listeners
    const {frontend} = getBrowserAndPages();
    await beginCatchEvents(frontend);
  });

  it('dispatch events when capture overview button hit', async () => {
    await navigateToCssOverviewTab('default');

    await click('.primary-button');  // Capture overview

    await assertCapturedEvents([
      {
        name: 'DevTools.PanelShown',
        value: 39,  // cssoverview
      },
      {
        name: 'DevTools.ActionTaken',
        value: 41,  // CaptureCssOverviewClicked
      },
    ]);
  });

  afterEach(async () => {
    const {frontend} = getBrowserAndPages();
    await endCatchEvents(frontend);
  });
});
