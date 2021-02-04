// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as puppeteer from 'puppeteer';

import {$, click, enableExperiment, getBrowserAndPages, goToResource, platform, pressKey, reloadDevTools, scrollElementIntoView, typeText, waitFor, waitForFunction} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {navigateToCssOverviewTab} from '../helpers/css-overview-helpers.js';
import {editCSSProperty, focusElementsTree, navigateToSidePane, waitForContentOfSelectedElementsNode, waitForElementsStyleSection} from '../helpers/elements-helpers.js';
import {clickToggleButton, selectDualScreen, startEmulationWithDualScreenFlag} from '../helpers/emulation-helpers.js';
import {openCommandMenu} from '../helpers/quick_open-helpers.js';
import {closeSecurityTab, navigateToSecurityTab} from '../helpers/security-helpers.js';
import {openPanelViaMoreTools, openSettingsTab} from '../helpers/settings-helpers.js';

interface UserMetric {
  name: string;
  value: string|number|LoadMetric;
}
interface UserMetricWithOptionalValue {
  name: string;
  value?: string|number|LoadMetric;
}

interface LoadMetric {
  histogramName: string;
  panelName: string;
}

interface UserMetrics {
  Action: {[name: string]: number};
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Window {
    __caughtEvents: UserMetric[];
    __beginCatchEvents: () => void;
    __endCatchEvents: () => void;
    __panelLoaded: (evt: Event) => void;
    __panelShown: (evt: Event) => void;
    __panelClosed: (evt: Event) => void;
    __sidebarPaneShown: (evt: Event) => void;
    __actionTaken: (evt: Event) => void;
    __keyboardShortcutFired: (evt: Event) => void;
    __issuesPanelOpenedFrom: (evt: Event) => void;
    __keybindSetSettingChanged: (evt: Event) => void;
    __dualScreenDeviceEmulated: (evt: Event) => void;
    __cssEditorOpened: (evt: Event) => void;
    __experimentDisabled: (evt: Event) => void;
    __experimentEnabled: (evt: Event) => void;
    __colorFixed: (evt: Event) => void;
    __issuesPanelIssueExpanded: (evt: Event) => void;
    __issuesPanelResourceOpened: (evt: Event) => void;
    __issuesPanelIssueCreated: (evt: Event) => void;
    __developerResourceLoaded: (evt: Event) => void;
    __developerResourceScheme: (evt: Event) => void;
    Host: {
      UserMetrics: UserMetrics,
      userMetrics: {
        actionTaken(name: number): void,
        colorFixed(threshold: string): void,
        cssEditorOpened(editorName: string): void,
      },
    };
  }
}

async function beginCatchEvents(frontend: puppeteer.Page) {
  await frontend.evaluate(() => {
    const makeHandler = (eventName: string) => (evt: Event) => {
      const customEvt = evt as CustomEvent;
      window.__caughtEvents.push({name: eventName, value: customEvt.detail.value});
    };
    window.__panelShown = makeHandler('DevTools.PanelShown');
    window.__panelClosed = makeHandler('DevTools.PanelClosed');
    window.__panelLoaded = makeHandler('DevTools.PanelLoaded');
    window.__sidebarPaneShown = makeHandler('DevTools.SidebarPaneShown');
    window.__actionTaken = makeHandler('DevTools.ActionTaken');
    window.__keyboardShortcutFired = makeHandler('DevTools.KeyboardShortcutFired');
    window.__issuesPanelOpenedFrom = makeHandler('DevTools.IssuesPanelOpenedFrom');
    window.__keybindSetSettingChanged = makeHandler('DevTools.KeybindSetSettingChanged');
    window.__dualScreenDeviceEmulated = makeHandler('DevTools.DualScreenDeviceEmulated');
    window.__cssEditorOpened = makeHandler('DevTools.CssEditorOpened');
    window.__experimentDisabled = makeHandler('DevTools.ExperimentDisabled');
    window.__experimentEnabled = makeHandler('DevTools.ExperimentEnabled');
    window.__colorFixed = makeHandler('DevTools.ColorPicker.FixedColor');
    window.__issuesPanelIssueExpanded = makeHandler('DevTools.IssuesPanelIssueExpanded');
    window.__issuesPanelResourceOpened = makeHandler('DevTools.IssuesPanelResourceOpened');
    window.__issuesPanelIssueCreated = makeHandler('DevTools.IssueCreated');
    window.__developerResourceLoaded = makeHandler('DevTools.DeveloperResourceLoaded');
    window.__developerResourceScheme = makeHandler('DevTools.DeveloperResourceScheme');
    window.__caughtEvents = [];
    window.__beginCatchEvents = () => {
      window.addEventListener('DevTools.PanelShown', window.__panelShown);
      window.addEventListener('DevTools.PanelClosed', window.__panelClosed);
      window.addEventListener('DevTools.PanelLoaded', window.__panelLoaded);
      window.addEventListener('DevTools.SidebarPaneShown', window.__sidebarPaneShown);
      window.addEventListener('DevTools.ActionTaken', window.__actionTaken);
      window.addEventListener('DevTools.KeyboardShortcutFired', window.__keyboardShortcutFired);
      window.addEventListener('DevTools.IssuesPanelOpenedFrom', window.__issuesPanelOpenedFrom);
      window.addEventListener('DevTools.KeybindSetSettingChanged', window.__keybindSetSettingChanged);
      window.addEventListener('DevTools.DualScreenDeviceEmulated', window.__dualScreenDeviceEmulated);
      window.addEventListener('DevTools.CssEditorOpened', window.__cssEditorOpened);
      window.addEventListener('DevTools.ExperimentDisabled', window.__experimentDisabled);
      window.addEventListener('DevTools.ExperimentEnabled', window.__experimentEnabled);
      window.addEventListener('DevTools.ColorPicker.FixedColor', window.__colorFixed);
      window.addEventListener('DevTools.IssuesPanelIssueExpanded', window.__issuesPanelIssueExpanded);
      window.addEventListener('DevTools.IssuesPanelResourceOpened', window.__issuesPanelResourceOpened);
      window.addEventListener('DevTools.IssueCreated', window.__issuesPanelIssueCreated);
      window.addEventListener('DevTools.DeveloperResourceLoaded', window.__developerResourceLoaded);
      window.addEventListener('DevTools.DeveloperResourceScheme', window.__developerResourceScheme);
    };

    window.__endCatchEvents = () => {
      window.removeEventListener('DevTools.PanelShown', window.__panelShown);
      window.removeEventListener('DevTools.PanelClosed', window.__panelClosed);
      window.removeEventListener('DevTools.PanelLoaded', window.__panelLoaded);
      window.removeEventListener('DevTools.SidebarPaneShown', window.__sidebarPaneShown);
      window.removeEventListener('DevTools.ActionTaken', window.__actionTaken);
      window.removeEventListener('DevTools.KeyboardShortcutFired', window.__keyboardShortcutFired);
      window.removeEventListener('DevTools.IssuesPanelOpenedFrom', window.__issuesPanelOpenedFrom);
      window.removeEventListener('DevTools.KeybindSetSettingChanged', window.__keybindSetSettingChanged);
      window.removeEventListener('DevTools.DualScreenDeviceEmulated', window.__dualScreenDeviceEmulated);
      window.removeEventListener('DevTools.CssEditorOpened', window.__cssEditorOpened);
      window.removeEventListener('DevTools.ExperimentDisabled', window.__experimentDisabled);
      window.removeEventListener('DevTools.ExperimentEnabled', window.__experimentEnabled);
      window.removeEventListener('DevTools.ColorPicker.FixedColor', window.__colorFixed);
      window.removeEventListener('DevTools.IssuesPanelIssueExpanded', window.__issuesPanelIssueExpanded);
      window.removeEventListener('DevTools.IssuesPanelResourceOpened', window.__issuesPanelResourceOpened);
      window.removeEventListener('DevTools.DeveloperResourceLoaded', window.__developerResourceLoaded);
      window.removeEventListener('DevTools.DeveloperResourceScheme', window.__developerResourceScheme);
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

async function awaitCapturedEvent(expected: UserMetricWithOptionalValue) {
  const {frontend} = getBrowserAndPages();
  await waitForFunction(async () => {
    const events = await retrieveCapturedEvents(frontend);
    return events.find(e => e.name === expected.name && (!('value' in expected) || e.value === expected.value));
  });
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

  it('dispatches event when opening issues drawer via command menu', async () => {
    const {frontend} = getBrowserAndPages();

    await openCommandMenu();
    await typeText('issues');
    await waitFor('.filtered-list-widget-title');
    await pressKey('Enter');
    await waitFor('[aria-label="Issues panel"]');

    const events = await retrieveCapturedEvents(frontend);
    assert.deepInclude(events, {
      name: 'DevTools.IssuesPanelOpenedFrom',
      value: 5,  // CommandMenu
    });
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

  it('dispatches an event when experiments are enabled and disabled', async () => {
    await openSettingsTab('Experiments');
    const customThemeCheckbox = await waitFor('[aria-label="Allow custom UI themes"]');
    // Enable the experiment
    await customThemeCheckbox.click();
    // Disable the experiment
    await customThemeCheckbox.click();

    await assertCapturedEvents([
      {
        name: 'DevTools.PanelShown',
        value: 29,  // settings-preferences
      },
      {
        name: 'DevTools.PanelShown',
        value: 31,  // Experiments
      },
      {
        name: 'DevTools.ExperimentEnabled',
        value: 0,  // Allow Custom UI Themes
      },
      {
        name: 'DevTools.ExperimentDisabled',
        value: 0,  // Allow Custom UI Themes
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


describe('User Metrics for CSS Editors in Styles Pane', () => {
  it('dispatch CssEditorOpened events', async () => {
    const {frontend} = getBrowserAndPages();
    await beginCatchEvents(frontend);

    await frontend.evaluate(() => {
      self.Host.userMetrics.cssEditorOpened('colorPicker');
      self.Host.userMetrics.cssEditorOpened('shadowEditor');
      self.Host.userMetrics.cssEditorOpened('bezierEditor');
      self.Host.userMetrics.cssEditorOpened('fontEditor');
    });

    await assertCapturedEvents([
      {
        name: 'DevTools.CssEditorOpened',
        value: 0,  // colorPicker
      },
      {
        name: 'DevTools.CssEditorOpened',
        value: 1,  // shadowEditor
      },
      {
        name: 'DevTools.CssEditorOpened',
        value: 2,  // bezierEditor
      },
      {
        name: 'DevTools.CssEditorOpened',
        value: 3,  // fontEditor
      },
    ]);
  });

  it('click swatches and listen for events', async () => {
    await enableExperiment('fontEditor');
    const {frontend} = getBrowserAndPages();
    await beginCatchEvents(frontend);
    await goToResource('host/css-editor.html');
    await waitForElementsStyleSection();
    await waitFor('.color-swatch-inner');
    await click('.color-swatch-inner');
    await frontend.keyboard.press('Escape');
    await waitFor('.shadow-swatch-icon');
    await click('.shadow-swatch-icon');
    await frontend.keyboard.press('Escape');
    await waitFor('.bezier-swatch-icon');
    await click('.bezier-swatch-icon');
    await frontend.keyboard.press('Escape');
    await waitFor('.largeicon-font-editor');
    await click('.largeicon-font-editor');
    await frontend.keyboard.press('Escape');

    await assertCapturedEvents([
      {
        name: 'DevTools.CssEditorOpened',
        value: 0,  // colorPicker
      },
      {
        name: 'DevTools.ActionTaken',
        value: 14,  // StyleRuleEdited
      },
      {
        name: 'DevTools.CssEditorOpened',
        value: 1,  // shadowEditor
      },
      {
        name: 'DevTools.ActionTaken',
        value: 14,  // StyleRuleEdited
      },
      {
        name: 'DevTools.CssEditorOpened',
        value: 2,  // bezierEditor
      },
      {
        name: 'DevTools.ActionTaken',
        value: 14,  // StyleRuleEdited
      },
      {
        name: 'DevTools.CssEditorOpened',
        value: 3,  // fontEditor
      },
    ]);
  });

  afterEach(async () => {
    const {frontend} = getBrowserAndPages();
    await endCatchEvents(frontend);
  });
});

describe('User Metrics for Color Picker', () => {
  beforeEach(async () => {
    const {frontend} = getBrowserAndPages();
    await beginCatchEvents(frontend);
  });

  it('dispatch ColorPickerFixedColor events', async () => {
    const {frontend} = getBrowserAndPages();

    await frontend.evaluate(() => {
      self.Host.userMetrics.colorFixed('aa');
      self.Host.userMetrics.colorFixed('aaa');
      self.Host.userMetrics.colorFixed('wrong');
    });

    await assertCapturedEvents([
      {
        name: 'DevTools.ColorPicker.FixedColor',
        value: 0,  // AA
      },
      {
        name: 'DevTools.ColorPicker.FixedColor',
        value: 1,  // AAA
      },
    ]);
  });

  afterEach(async () => {
    const {frontend} = getBrowserAndPages();
    await endCatchEvents(frontend);
  });
});

describe('User Metrics for sidebar panes', () => {
  beforeEach(async () => {
    const {frontend} = getBrowserAndPages();
    await beginCatchEvents(frontend);
  });

  afterEach(async () => {
    const {frontend} = getBrowserAndPages();
    await endCatchEvents(frontend);
  });

  it('dispatches sidebar panes events for navigating Elements Panel sidebar panes', async () => {
    await navigateToSidePane('Computed');
    await assertCapturedEvents([
      {
        name: 'DevTools.SidebarPaneShown',
        value: 2,  // Computed
      },
    ]);
  });

  it('should not dispatch sidebar panes events for navigating to the same pane', async () => {
    await navigateToSidePane('Styles');
    await assertCapturedEvents([]);
  });
});

describe('User Metrics for Issue Panel', () => {
  beforeEach(async () => {
    await openPanelViaMoreTools('Issues');
    const {frontend} = getBrowserAndPages();
    await beginCatchEvents(frontend);
  });

  it('dispatch events when expand an issue', async () => {
    await goToResource('host/cookie-issue.html');
    await waitFor('.issue');

    await click('.issue');

    await assertCapturedEvents([
      {
        name: 'DevTools.IssueCreated',
        value: 15,  // SameSiteCookieIssue
      },
      {
        name: 'DevTools.IssueCreated',
        value: 15,  // SameSiteCookieIssue
      },
      {
        name: 'DevTools.IssuesPanelIssueExpanded',
        value: 2,  // SameSiteCookie
      },
    ]);
  });

  it('dispatch events when a link to an element is clicked', async () => {
    await goToResource('elements/element-reveal-inline-issue.html');
    await waitFor('.issue');
    await click('.issue');

    await waitFor('.element-reveal-icon');
    await scrollElementIntoView('.element-reveal-icon');
    await click('.element-reveal-icon');

    await assertCapturedEvents([
      {
        name: 'DevTools.IssueCreated',
        value: 1,  // ContentSecurityPolicyIssue
      },
      {
        name: 'DevTools.IssueCreated',
        value: 1,  // ContentSecurityPolicyIssue
      },
      {
        name: 'DevTools.IssuesPanelIssueExpanded',
        value: 4,  // ContentSecurityPolicy
      },
      {
        name: 'DevTools.IssuesPanelResourceOpened',
        value: 7,  // ContentSecurityPolicyElement
      },
    ]);
  });

  it('dispatch events when a "Learn More" link is clicked', async () => {
    await goToResource('elements/element-reveal-inline-issue.html');
    await waitFor('.issue');
    await click('.issue');

    await waitFor('.link-list a');
    await scrollElementIntoView('.link-list a');
    await click('.link-list a');

    await assertCapturedEvents([
      {
        name: 'DevTools.IssueCreated',
        value: 1,  // ContentSecurityPolicyIssue
      },
      {
        name: 'DevTools.IssueCreated',
        value: 1,  // ContentSecurityPolicyIssue
      },
      {
        name: 'DevTools.IssuesPanelIssueExpanded',
        value: 4,  // ContentSecurityPolicy
      },
      {
        name: 'DevTools.IssuesPanelResourceOpened',
        value: 12,  // ContentSecurityPolicyLearnMore
      },
    ]);
  });

  afterEach(async () => {
    const {frontend} = getBrowserAndPages();
    await endCatchEvents(frontend);
  });
});

describe('User Metrics for CSS custom properties in the Styles pane', () => {
  beforeEach(async () => {
    await goToResource('elements/css-variables.html');
    await navigateToSidePane('Styles');
    await waitForElementsStyleSection();
    await waitForContentOfSelectedElementsNode('<body>\u200B');
    await focusElementsTree();
  });

  it('dispatch events when capture overview button hit', async () => {
    const {frontend} = getBrowserAndPages();
    await frontend.keyboard.press('ArrowRight');
    await waitForContentOfSelectedElementsNode('<div id=\u200B"properties-to-inspect">\u200B</div>\u200B');

    await beginCatchEvents(frontend);

    await click('.css-var-link');
    await assertCapturedEvents([
      {
        name: 'DevTools.ActionTaken',
        value: 47,  // CustomPropertyLinkClicked
      },
    ]);

    await endCatchEvents(frontend);
  });

  it('dispatch events when a custom property value is edited', async () => {
    const {frontend} = getBrowserAndPages();
    await beginCatchEvents(frontend);

    await editCSSProperty('body, body', '--color', '#f06');
    await assertCapturedEvents([
      {
        name: 'DevTools.ActionTaken',
        value: 14,  // StyleRuleEdited
      },
      {
        name: 'DevTools.ActionTaken',
        value: 48,  // CustomPropertyEdited
      },
    ]);

    await endCatchEvents(frontend);
  });
});

describe('User Metrics for the Page Resource Loader', () => {
  it('dispatches an event when a source map is loaded', async () => {
    const {frontend} = getBrowserAndPages();
    await beginCatchEvents(frontend);
    await goToResource('sources/script-with-sourcemap-without-mappings.html');
    await awaitCapturedEvent(
        {
          name: 'DevTools.DeveloperResourceLoaded',
          value: 0,  // LoadThroughPageViaTarget
        },
    );
    await awaitCapturedEvent(
        {
          name: 'DevTools.DeveloperResourceScheme',
        },
    );
    await endCatchEvents(frontend);
  });
});
