// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import * as puppeteer from 'puppeteer';

import {click, getBrowserAndPages, platform, resetPages, waitFor} from '../../shared/helper.js';
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
    __actionTaken: (evt: Event) => void;
    __keyboardShortcutFired: (evt: Event) => void;
    Host: {
      UserMetrics: UserMetrics;
      userMetrics:
          {actionTaken(name: number): void;}
    };
    UI: {inspectorView: {_showDrawer(show: boolean): void; showView(name: string): void;}};
  }
}

async function beginCatchEvents(frontend: puppeteer.Page) {
  await frontend.evaluate(() => {
    window.__panelShown = (evt: Event) => {
      const customEvt = evt as CustomEvent;
      window.__caughtEvents.push({name: 'DevTools.PanelShown', value: customEvt.detail.value});
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

    window.__caughtEvents = [];
    window.__beginCatchEvents = () => {
      window.addEventListener('DevTools.PanelShown', window.__panelShown);
      window.addEventListener('DevTools.PanelLoaded', window.__panelLoaded);
      window.addEventListener('DevTools.ActionTaken', window.__actionTaken);
      window.addEventListener('DevTools.KeyboardShortcutFired', window.__keyboardShortcutFired);
    };

    window.__endCatchEvents = () => {
      window.removeEventListener('DevTools.PanelShown', window.__panelShown);
      window.removeEventListener('DevTools.PanelLoaded', window.__panelLoaded);
      window.removeEventListener('DevTools.ActionTaken', window.__actionTaken);
      window.removeEventListener('DevTools.KeyboardShortcutFired', window.__keyboardShortcutFired);
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
    await resetPages();
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

    await assertCapturedEvents([{
      name: 'DevTools.PanelShown',
      value: 10,  // drawer-console-view.
    },
    {
      name: 'DevTools.KeyboardShortcutFired',
      value: 17,  // main.toggle-drawer
    }]);
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
        value: 10,  // 'drawer-console-view'.
      },
      {
        name: 'DevTools.PanelShown',
        value: 11,  // 'drawer-animations'.
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
        value: 0,  // OtherShortcut
      },
    ]);
  });

  it('tracks panel loading', async () => {
    // We specify the selected panel here because the default behavior is to go to the
    // elements panel, but this means we won't get the PanelLoaded event. Instead we
    // request that the resetPages helper sets the timeline as the target panel, and
    // we wait for the timeline in the test. This means, in turn, we get the PanelLoaded
    // event.
    await resetPages({selectedPanel: {name: 'timeline'}});
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
