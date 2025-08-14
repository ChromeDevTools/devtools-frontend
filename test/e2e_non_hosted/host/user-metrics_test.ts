// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {CONSOLE_MESSAGES_SELECTOR, navigateToConsoleTab} from '../../e2e/helpers/console-helpers.js';
import {navigateToCssOverviewTab, startCaptureCSSOverview} from '../../e2e/helpers/css-overview-helpers.js';
import {
  editCSSProperty,
  focusElementsTree,
  navigateToSidePane,
  waitForContentOfSelectedElementsNode,
  waitForElementsStyleSection,
} from '../../e2e/helpers/elements-helpers.js';
import {navigateToNetworkTab, openNetworkTab} from '../../e2e/helpers/network-helpers.js';
import {navigateToPerformanceTab} from '../../e2e/helpers/performance-helpers.js';
import {openCommandMenu} from '../../e2e/helpers/quick_open-helpers.js';
import {openPanelViaMoreTools, openSettingsTab} from '../../e2e/helpers/settings-helpers.js';
import {waitForSourcesPanel} from '../../e2e/helpers/sources-helpers.js';
import {
  platform,
  scrollElementIntoView,
} from '../../shared/helper.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

interface UserMetrics {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Action: Record<string, number>;
}

interface EnumHistogramEvent {
  actionName: string;
  actionCode: number;
}

interface EnumHistogramEventWithOptionalCode {
  actionName: string;
  actionCode?: number;
}

interface PerformanceHistogramEvent {
  histogramName: string;
  duration: number;
}

declare global {
  interface Window {
    /* eslint-disable @typescript-eslint/naming-convention */
    Host: {
      UserMetrics: UserMetrics,
      userMetrics: {
        actionTaken(name: number): void,
      },
    };
  }
  /* eslint-enable @typescript-eslint/naming-convention */
}

async function setupInspectorFrontendHostStub(devToolsPage: DevToolsPage) {
  const evaluate = async () => {
    // @ts-expect-error
    const InspectorFrontendHost = await import('./core/host/InspectorFrontendHost.js');
    const stub = new InspectorFrontendHost.InspectorFrontendHostStub();
    // globalThis.InspectorFrontendHost = stub;
    for (const prop of ['recordedCountHistograms', 'recordedEnumeratedHistograms', 'recordedPerformanceHistograms']) {
      // @ts-expect-error
      globalThis.InspectorFrontendHost[prop] = stub[prop];
    }
    for (const method of ['recordCountHistogram', 'recordEnumeratedHistogram', 'recordPerformanceHistogram']) {
      // @ts-expect-error
      globalThis.InspectorFrontendHost[method] = stub[method];
    }
  };

  await devToolsPage.evaluate(evaluate);
  await devToolsPage.evaluateOnNewDocument(evaluate);
  await devToolsPage.reload();
}

function retrieveRecordedHistogramEvents(page: puppeteer.Page): Promise<EnumHistogramEvent[]> {
  // @ts-expect-error
  return page.evaluate(() => window.InspectorFrontendHost.recordedEnumeratedHistograms);
}

function retrieveRecordedPerformanceHistogramEvents(page: puppeteer.Page): Promise<PerformanceHistogramEvent[]> {
  // @ts-expect-error
  return page.evaluate(() => window.InspectorFrontendHost.recordedPerformanceHistograms);
}

async function assertHistogramEventsInclude(expected: EnumHistogramEvent[], devToolsPage: DevToolsPage) {
  await devToolsPage.waitForFunction(async () => {
    const events = await retrieveRecordedHistogramEvents(devToolsPage.page);
    try {
      assert.includeDeepMembers(events, expected);
      return true;
    } catch {
      return false;
    }
  });
}

async function waitForHistogramEvent(
    expected: EnumHistogramEventWithOptionalCode, expectedCount = 1, devToolsPage: DevToolsPage) {
  await devToolsPage.waitForFunction(async () => {
    const events = await retrieveRecordedHistogramEvents(devToolsPage.page);
    const matchedEvents = events.filter(
        e => e.actionName === expected.actionName &&
            (!('actionCode' in expected) || e.actionCode === expected.actionCode));
    return matchedEvents.length >= expectedCount;
  });
}

describe('User Metrics', () => {
  it('dispatches dock and undock events', async ({devToolsPage}) => {
    await setupInspectorFrontendHostStub(devToolsPage);
    await devToolsPage.evaluate(() => {
      self.Host.userMetrics.actionTaken(self.Host.UserMetrics.Action.WindowDocked);
      self.Host.userMetrics.actionTaken(self.Host.UserMetrics.Action.WindowUndocked);
    });
    await assertHistogramEventsInclude(
        [
          {
            actionName: 'DevTools.ActionTaken',
            actionCode: 1,  // WindowDocked.
          },
          {
            actionName: 'DevTools.ActionTaken',
            actionCode: 2,  // WindowUndocked.
          },
        ],
        devToolsPage);
  });

  it('dispatches a metric event the console drawer', async ({devToolsPage}) => {
    await setupInspectorFrontendHostStub(devToolsPage);
    await devToolsPage.page.bringToFront();
    await devToolsPage.page.keyboard.press('Escape');
    await devToolsPage.page.waitForSelector('.console-view');

    await assertHistogramEventsInclude(
        [
          {
            actionName: 'DevTools.PanelShown',
            actionCode: 10,  // drawer-console-view.
          },
          {
            actionName: 'DevTools.KeyboardShortcutFired',
            actionCode: 17,  // main.toggle-drawer
          },
        ],
        devToolsPage,
    );
  });

  it('dispatches events for views', async ({devToolsPage, inspectedPage}) => {
    await setupInspectorFrontendHostStub(devToolsPage);
    await navigateToPerformanceTab(undefined, devToolsPage, inspectedPage);

    await assertHistogramEventsInclude(
        [
          {
            actionName: 'DevTools.PanelShown',
            actionCode: 1,  // Elements (at launch).
          },
          {
            actionName: 'DevTools.PanelShown',
            actionCode: 5,  // Timeline.
          },
        ],
        devToolsPage,
    );
  });

  it('dispatches events for triple dot items', async ({devToolsPage}) => {
    await setupInspectorFrontendHostStub(devToolsPage);
    await openPanelViaMoreTools('Animations', devToolsPage);

    await assertHistogramEventsInclude(
        [
          {
            actionName: 'DevTools.PanelShown',
            actionCode: 11,  // 'animations'.
          },
        ],
        devToolsPage,
    );
  });

  it('dispatches events for opening issues drawer via hamburger menu', async ({devToolsPage}) => {
    await setupInspectorFrontendHostStub(devToolsPage);
    await openPanelViaMoreTools('Issues', devToolsPage);

    await assertHistogramEventsInclude(
        [
          {
            actionName: 'DevTools.IssuesPanelOpenedFrom',
            actionCode: 3,  // 'HamburgerMenu'.
          },
          {
            actionName: 'DevTools.PanelShown',
            actionCode: 37,  // 'issues-pane'.
          },
        ],
        devToolsPage,
    );
  });

  it('dispatches event when opening issues drawer via command menu', async ({devToolsPage}) => {
    await setupInspectorFrontendHostStub(devToolsPage);
    await openCommandMenu(devToolsPage);
    await devToolsPage.typeText('issues');
    await devToolsPage.waitFor('.filtered-list-widget-title');
    await devToolsPage.pressKey('Enter');
    await devToolsPage.waitFor('[aria-label="Issues panel"]');

    await assertHistogramEventsInclude(
        [
          {
            actionName: 'DevTools.IssuesPanelOpenedFrom',
            actionCode: 5,  // CommandMenu
          },
        ],
        devToolsPage,
    );
  });

  it('dispatches an event when F1 is used to open settings', async ({devToolsPage}) => {
    await setupInspectorFrontendHostStub(devToolsPage);
    await devToolsPage.page.keyboard.press('F1');
    await devToolsPage.waitFor('.settings-window-main');

    await assertHistogramEventsInclude(
        [
          {
            actionName: 'DevTools.PanelShown',
            actionCode: 29,
          },
          {
            actionName: 'DevTools.KeyboardShortcutFired',
            actionCode: 22,  // settings.show
          },
        ],
        devToolsPage,
    );
  });

  it('dispatches an event when Ctrl/Meta+F8 is used to deactivate breakpoints', async ({devToolsPage}) => {
    await setupInspectorFrontendHostStub(devToolsPage);
    await devToolsPage.click('#tab-sources');
    await devToolsPage.waitFor('#sources-panel-sources-view');

    switch (platform) {
      case 'mac':
        await devToolsPage.page.keyboard.down('Meta');
        break;

      case 'linux':
      case 'win32':
        await devToolsPage.page.keyboard.down('Control');
        break;
    }

    await devToolsPage.page.keyboard.press('F8');

    switch (platform) {
      case 'mac':
        await devToolsPage.page.keyboard.up('Meta');
        break;

      case 'linux':
      case 'win32':
        await devToolsPage.page.keyboard.up('Control');
        break;
    }

    await devToolsPage.waitFor('[aria-label="Activate breakpoints"]');

    await assertHistogramEventsInclude(
        [
          {
            actionName: 'DevTools.PanelShown',
            actionCode: 4,  // sources
          },
          {
            actionName: 'DevTools.KeyboardShortcutFired',
            actionCode: 35,  // debugger.toggle-breakpoints-active
          },
        ],
        devToolsPage,
    );
  });

  it('dispatches an event when the keybindSet setting is changed', async ({devToolsPage}) => {
    await setupInspectorFrontendHostStub(devToolsPage);
    await devToolsPage.page.keyboard.press('F1');
    await devToolsPage.waitFor('.settings-window-main');
    await devToolsPage.click('[aria-label="Shortcuts"]');
    await devToolsPage.waitFor('.keybinds-set-select');

    const keybindSetSelect = await devToolsPage.$('.keybinds-set-select select');
    await keybindSetSelect.select('vsCode');

    await assertHistogramEventsInclude(
        [
          {
            actionName: 'DevTools.PanelShown',
            actionCode: 29,  // settings-preferences
          },
          {
            actionName: 'DevTools.KeyboardShortcutFired',
            actionCode: 22,  // settings.show
          },
          {
            actionName: 'DevTools.PanelShown',
            actionCode: 38,  // settings-keybinds
          },
          {
            actionName: 'DevTools.KeybindSetSettingChanged',
            actionCode: 1,  // vsCode
          },
        ],
        devToolsPage,
    );
  });

  it('dispatches an event when experiments are enabled and disabled', async ({devToolsPage}) => {
    await setupInspectorFrontendHostStub(devToolsPage);
    await openSettingsTab('Experiments', devToolsPage);
    const customThemeCheckbox = await devToolsPage.waitFor('[title="Protocol Monitor"]');
    // Enable the experiment
    await customThemeCheckbox.click();
    // Disable the experiment
    await customThemeCheckbox.click();

    await assertHistogramEventsInclude(
        [
          {
            actionName: 'DevTools.PanelShown',
            actionCode: 29,  // settings-preferences
          },
          {
            actionName: 'DevTools.PanelShown',
            actionCode: 31,  // Experiments
          },
          {
            actionName: 'DevTools.ExperimentEnabled',
            actionCode: 13,  // Protocol Monitor
          },
          {
            actionName: 'DevTools.ExperimentDisabled',
            actionCode: 13,  // Protocol Monitor
          },
        ],
        devToolsPage,
    );
  });

  it('dispatches an event when experiments are initialized at launch', async ({devToolsPage}) => {
    await setupInspectorFrontendHostStub(devToolsPage);
    await assertHistogramEventsInclude(
        [
          {
            actionName: 'DevTools.ExperimentEnabledAtLaunch',
            actionCode: 42,  // Enabled by default: Full accessibility tree
          },
          {
            actionName: 'DevTools.ExperimentDisabledAtLaunch',
            actionCode: 41,  // Disabled by default: FontEditor
          },
        ],
        devToolsPage,
    );
  });

  it('records the selected language', async ({devToolsPage}) => {
    await setupInspectorFrontendHostStub(devToolsPage);
    await assertHistogramEventsInclude(
        [
          {
            actionName: 'DevTools.Language',
            actionCode: 17,  // en-US
          },
        ],
        devToolsPage,
    );
  });

  it('records the sync setting', async ({devToolsPage}) => {
    await setupInspectorFrontendHostStub(devToolsPage);
    await assertHistogramEventsInclude(
        [{
          actionName: 'DevTools.SyncSetting',
          actionCode: 1,  // Chrome Sync is disabled
        }],
        devToolsPage,
    );
  });
});

describe('User Metric with deferent initial panel', () => {
  setup({
    devToolsSettings: {
      'panel-selected-tab': 'network',
    },
  });

  it('dispatches events for view shown at launch', async ({devToolsPage}) => {
    await setupInspectorFrontendHostStub(devToolsPage);

    await assertHistogramEventsInclude(
        [{
          actionName: 'DevTools.PanelShown',
          actionCode: 3,  // Network.
        }],
        devToolsPage,
    );
  });
  it('tracks panel loading', async ({devToolsPage}) => {
    await setupInspectorFrontendHostStub(devToolsPage);
    // We specify the selected panel here because the default behavior is to go to the
    // elements panel, but this means we won't get the PanelLoaded event. Instead we
    // request that the resetPages helper sets the network as the target panel, and
    // we wait for the network in the test. This means, in turn, we get the PanelLoaded
    // event.
    await devToolsPage.waitFor('.network');

    const events = await retrieveRecordedPerformanceHistogramEvents(devToolsPage.page);

    assert.include(events.map(e => e.histogramName), 'DevTools.Launch.Network');
  });
});

describe('User Metric with setting', () => {
  setup({
    devToolsSettings: {
      'inspector.drawer-split-view-state': {horizontal: {showMode: 'Both'}},
    },
  });

  it('dispatches events for drawer shown at launch', async ({devToolsPage}) => {
    await setupInspectorFrontendHostStub(devToolsPage);

    await assertHistogramEventsInclude(
        [{
          actionName: 'DevTools.PanelShown',
          actionCode: 10,  // drawer-console-view.
        }],
        devToolsPage,
    );
  });
});

describe('User Metric with experiment', () => {
  setup({
    enabledDevToolsExperiments: ['vertical-drawer'],
  });

  it('dispatches a metric event during drawer orientation toggle', async ({devToolsPage}) => {
    await setupInspectorFrontendHostStub(devToolsPage);
    await devToolsPage.page.keyboard.down('Shift');
    await devToolsPage.page.keyboard.press('Escape');

    await assertHistogramEventsInclude(
        [{
          actionName: 'DevTools.KeyboardShortcutFired',
          actionCode: 119,  // main.toggle-drawer-orientation
        }],
        devToolsPage);

    await devToolsPage.page.keyboard.up('Shift');
  });
});

describe('User metrics for CSS overview', () => {
  it('dispatch events when capture overview button hit', async ({devToolsPage, inspectedPage}) => {
    await setupInspectorFrontendHostStub(devToolsPage);
    await inspectedPage.goToResource('css_overview/default.html');
    await navigateToCssOverviewTab(devToolsPage);

    await startCaptureCSSOverview(devToolsPage);

    await assertHistogramEventsInclude(
        [
          {
            actionName: 'DevTools.PanelShown',
            actionCode: 39,  // cssoverview
          },
          {
            actionName: 'DevTools.ActionTaken',
            actionCode: 41,  // CaptureCssOverviewClicked
          },
        ],
        devToolsPage,
    );
  });
});

describe('User Metrics for Issue Panel', () => {
  setup({enabledDevToolsExperiments: ['contrast-issues']});

  it('dispatches an event when a LowTextContrastIssue is created', async ({devToolsPage, inspectedPage}) => {
    await setupInspectorFrontendHostStub(devToolsPage);
    await openPanelViaMoreTools('Issues', devToolsPage);
    await inspectedPage.goToResource('elements/low-contrast.html');
    await devToolsPage.waitFor('.issue');

    await assertHistogramEventsInclude(
        [
          {
            actionName: 'DevTools.IssueCreated',
            actionCode: 41,  // LowTextContrastIssue
          },
          {
            actionName: 'DevTools.IssueCreated',
            actionCode: 41,  // LowTextContrastIssue
          },
          {
            actionName: 'DevTools.IssueCreated',
            actionCode: 41,  // LowTextContrastIssue
          },
          {
            actionName: 'DevTools.IssueCreated',
            actionCode: 41,  // LowTextContrastIssue
          },
        ],
        devToolsPage,
    );
  });

  it('dispatches an event when a SharedArrayBufferIssue is created', async ({devToolsPage, inspectedPage}) => {
    await setupInspectorFrontendHostStub(devToolsPage);
    await openPanelViaMoreTools('Issues', devToolsPage);
    await inspectedPage.goToResource('issues/sab-issue.rawresponse');
    await devToolsPage.waitFor('.issue');

    await assertHistogramEventsInclude(
        [
          {
            actionName: 'DevTools.IssueCreated',
            actionCode: 37,  // SharedArrayBufferIssue::CreationIssue
          },
          {
            actionName: 'DevTools.IssueCreated',
            actionCode: 60,  // DeprecationIssue
          },
          {
            actionName: 'DevTools.IssueCreated',
            actionCode: 36,  // SharedArrayBufferIssue::TransferIssue
          },
        ],
        devToolsPage,
    );
  });

  it('dispatch events when a link to an element is clicked', async ({devToolsPage, inspectedPage}) => {
    await setupInspectorFrontendHostStub(devToolsPage);
    await openPanelViaMoreTools('Issues', devToolsPage);
    await inspectedPage.goToResource('elements/element-reveal-inline-issue.html');
    await devToolsPage.click('.issue');

    await devToolsPage.waitFor('.element-reveal-icon');
    await scrollElementIntoView('.element-reveal-icon', undefined, devToolsPage);
    await devToolsPage.click('.element-reveal-icon');

    await assertHistogramEventsInclude(
        [
          {
            actionName: 'DevTools.IssueCreated',
            actionCode: 1,  // ContentSecurityPolicyIssue
          },
          {
            actionName: 'DevTools.IssueCreated',
            actionCode: 1,  // ContentSecurityPolicyIssue
          },
          {
            actionName: 'DevTools.IssuesPanelIssueExpanded',
            actionCode: 4,  // ContentSecurityPolicy
          },
          {
            actionName: 'DevTools.IssuesPanelResourceOpened',
            actionCode: 7,  // ContentSecurityPolicyElement
          },
        ],
        devToolsPage,
    );
  });

  it('dispatches events when Quirks Mode issues are created', async ({devToolsPage, inspectedPage}) => {
    await setupInspectorFrontendHostStub(devToolsPage);
    await openPanelViaMoreTools('Issues', devToolsPage);
    await inspectedPage.goToResource('elements/quirks-mode-iframes.html');
    await devToolsPage.waitFor('.issue');

    await assertHistogramEventsInclude(
        [
          {
            actionName: 'DevTools.IssueCreated',
            actionCode: 58,  // QuirksModeIssue::QuirksMode
          },
          {
            actionName: 'DevTools.IssueCreated',
            actionCode: 59,  // QuirksModeIssue::LimitedQuirksMode
          },
        ],
        devToolsPage,
    );
  });

  it('dispatches an event when a Client Hints are used with invalid origin for DelegateCH',
     async ({devToolsPage, inspectedPage}) => {
       await setupInspectorFrontendHostStub(devToolsPage);
       await openPanelViaMoreTools('Issues', devToolsPage);
       await inspectedPage.goToResource('issues/client-hint-issue-DelegateCH-MetaTagAllowListInvalidOrigin.html');
       await devToolsPage.waitFor('.issue');

       await assertHistogramEventsInclude(
           [
             {
               actionName: 'DevTools.IssueCreated',
               actionCode: 61,  // ClientHintIssue::MetaTagAllowListInvalidOrigin
             },
           ],
           devToolsPage,
       );
     });

  it('dispatches an event when a Client Hints are modified by javascript for DelegateCH',
     async ({devToolsPage, inspectedPage}) => {
       await setupInspectorFrontendHostStub(devToolsPage);
       await openPanelViaMoreTools('Issues', devToolsPage);
       await inspectedPage.goToResource('issues/client-hint-issue-DelegateCH-MetaTagModifiedHTML.html');
       await devToolsPage.waitFor('.issue');

       await assertHistogramEventsInclude(
           [
             {
               actionName: 'DevTools.IssueCreated',
               actionCode: 62,  // ClientHintIssue::MetaTagModifiedHTML
             },
           ],
           devToolsPage,
       );
     });

  it('dispatches an event when a ElementAccessibility DisallowedSelectChild issue is created',
     async ({devToolsPage, inspectedPage}) => {
       await setupInspectorFrontendHostStub(devToolsPage);
       await openPanelViaMoreTools('Issues', devToolsPage);
       await inspectedPage.goToResource('issues/select-element-accessibility-issue-DisallowedSelectChild.html');
       await devToolsPage.waitFor('.issue');

       await assertHistogramEventsInclude(
           [
             {
               actionName: 'DevTools.IssueCreated',
               actionCode: 86,  // ElementAccessibilityIssue::DisallowedSelectChild
             },
           ],
           devToolsPage,
       );
     });

  it('dispatches an event when a ElementAccessibility DisallowedOptGroupChild issue is created',
     async ({devToolsPage, inspectedPage}) => {
       await setupInspectorFrontendHostStub(devToolsPage);
       await openPanelViaMoreTools('Issues', devToolsPage);
       await inspectedPage.goToResource('issues/select-element-accessibility-issue-DisallowedOptGroupChild.html');
       await devToolsPage.waitFor('.issue');

       await assertHistogramEventsInclude(
           [
             {
               actionName: 'DevTools.IssueCreated',
               actionCode: 87,  // ElementAccessibilityIssue::DisallowedOptGroupChild
             },
           ],
           devToolsPage,
       );
     });

  it('dispatches an event when a ElementAccessibility NonPhrasingContentOptionChild issue is created',
     async ({devToolsPage, inspectedPage}) => {
       await setupInspectorFrontendHostStub(devToolsPage);
       await openPanelViaMoreTools('Issues', devToolsPage);
       await inspectedPage.goToResource('issues/select-element-accessibility-issue-NonPhrasingContentOptionChild.html');
       await devToolsPage.waitFor('.issue');

       await assertHistogramEventsInclude(
           [
             {
               actionName: 'DevTools.IssueCreated',
               actionCode: 88,  // ElementAccessibilityIssue::NonPhrasingContentOptionChild
             },
           ],
           devToolsPage,
       );
     });

  it('dispatches an event when a ElementAccessibility InteractiveContentOptionChild issue is created',
     async ({devToolsPage, inspectedPage}) => {
       await setupInspectorFrontendHostStub(devToolsPage);
       await openPanelViaMoreTools('Issues', devToolsPage);
       await inspectedPage.goToResource('issues/select-element-accessibility-issue-InteractiveContentOptionChild.html');
       await devToolsPage.waitFor('.issue');

       await assertHistogramEventsInclude(
           [
             {
               actionName: 'DevTools.IssueCreated',
               actionCode: 89,  // ElementAccessibilityIssue::InteractiveContentOptionChild
             },
           ],
           devToolsPage,
       );
     });

  it('dispatches an event when a ElementAccessibility InteractiveContentLegendChild issue is created',
     async ({devToolsPage, inspectedPage}) => {
       await setupInspectorFrontendHostStub(devToolsPage);
       await openPanelViaMoreTools('Issues', devToolsPage);
       await inspectedPage.goToResource('issues/select-element-accessibility-issue-InteractiveContentLegendChild.html');
       await devToolsPage.waitFor('.issue');

       await assertHistogramEventsInclude(
           [
             {
               actionName: 'DevTools.IssueCreated',
               actionCode: 90,  // ElementAccessibilityIssue::InteractiveContentLegendChild
             },
           ],
           devToolsPage,
       );
     });

  it('dispatches an event when a ElementAccessibility InteractiveContentSummaryDescendant issue is created',
     async ({devToolsPage, inspectedPage}) => {
       await setupInspectorFrontendHostStub(devToolsPage);
       await openPanelViaMoreTools('Issues', devToolsPage);
       await inspectedPage.goToResource(
           'issues/summary-element-accessibility-issue-InteractiveContentSummaryDescendant.html');
       await devToolsPage.waitFor('.issue');

       await assertHistogramEventsInclude(
           [
             {
               actionName: 'DevTools.IssueCreated',
               actionCode: 113,  // ElementAccessibilityIssue::InteractiveContentSummaryDescendant
             },
           ],
           devToolsPage,
       );
     });
});

describe('User Metrics for CSS custom properties in the Styles pane', () => {
  async function setupTest(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    await setupInspectorFrontendHostStub(devToolsPage);
    await inspectedPage.goToResource('elements/css-variables.html');
    await navigateToSidePane('Styles', devToolsPage);
    await waitForElementsStyleSection(undefined, devToolsPage);
    await focusElementsTree(devToolsPage);
  }

  it('dispatch events when capture overview button hit', async ({devToolsPage, inspectedPage}) => {
    await setupTest(devToolsPage, inspectedPage);
    await devToolsPage.page.keyboard.press('ArrowRight');
    await waitForContentOfSelectedElementsNode(
        '<div id=\u200B"properties-to-inspect">\u200B</div>\u200B', devToolsPage);

    await devToolsPage.click('.link-swatch-link');
    await assertHistogramEventsInclude(
        [
          {
            actionName: 'DevTools.ActionTaken',
            actionCode: 47,  // CustomPropertyLinkClicked
          },
        ],
        devToolsPage,
    );
  });

  it('dispatch events when a custom property value is edited', async ({devToolsPage, inspectedPage}) => {
    await setupTest(devToolsPage, inspectedPage);
    await editCSSProperty('body, body', '--color', '#f06', devToolsPage);
    await assertHistogramEventsInclude(
        [
          {
            actionName: 'DevTools.ActionTaken',
            actionCode: 14,  // StyleRuleEdited
          },
          {
            actionName: 'DevTools.ActionTaken',
            actionCode: 48,  // CustomPropertyEdited
          },
        ],
        devToolsPage,
    );
  });
});

describe('User Metrics for the Page Resource Loader', () => {
  it('dispatches an event when a source map is loaded', async ({devToolsPage, inspectedPage}) => {
    await setupInspectorFrontendHostStub(devToolsPage);
    await inspectedPage.goToResource('sources/script-with-sourcemap-without-mappings.html');
    await waitForHistogramEvent(
        {
          actionName: 'DevTools.DeveloperResourceLoaded',
          actionCode: 0,  // LoadThroughPageViaTarget
        },
        undefined,
        devToolsPage,
    );
    await waitForHistogramEvent(
        {
          actionName: 'DevTools.DeveloperResourceScheme',
        },
        undefined,
        devToolsPage,
    );
  });
});

describe('User Metrics for clicking stylesheet request initiators', () => {
  const expectedAction = {
    actionName: 'DevTools.ActionTaken',
    actionCode: 80,  // StyleSheetInitiatorLinkClicked
  };
  it('dispatches an event when clicked in the console', async ({devToolsPage, inspectedPage}) => {
    await setupInspectorFrontendHostStub(devToolsPage);
    async function clickOnLinkWithText(text: string, root?: puppeteer.ElementHandle) {
      const element = await devToolsPage.click(`text/${text}`, {root});
      assert.isTrue(
          await element.evaluate(e => e.classList.contains('devtools-link')),
          'Clicked element was not a devtools link');
    }

    await navigateToConsoleTab(devToolsPage);
    await inspectedPage.goToResource('network/stylesheet-resources.html');
    const consoleMessages = await devToolsPage.waitFor(CONSOLE_MESSAGES_SELECTOR);

    await clickOnLinkWithText('stylesheet-resources.html:2', consoleMessages);
    await waitForHistogramEvent(
        expectedAction,
        1,
        devToolsPage,
    );
    await waitForSourcesPanel(devToolsPage);
    await navigateToConsoleTab(devToolsPage);
    await clickOnLinkWithText('stylesheet-resources.html:8', consoleMessages);
    await waitForHistogramEvent(
        expectedAction,
        2,
        devToolsPage,
    );
    await waitForSourcesPanel(devToolsPage);
    await navigateToConsoleTab(devToolsPage);
    await clickOnLinkWithText('stylesheet-resources.css:8', consoleMessages);
    await waitForHistogramEvent(
        expectedAction,
        3,
        devToolsPage,
    );
  });
  it('dispatches an event when clicked in the Network panel', async ({devToolsPage, inspectedPage}) => {
    await setupInspectorFrontendHostStub(devToolsPage);
    async function clickOnInitiatorLink(resource: string) {
      const resourceURL = `${inspectedPage.getResourcesPath()}/network/${resource}`;
      const element = await devToolsPage.click(`[title="${resourceURL}"] ~ .initiator-column .devtools-link`);
      assert.isTrue(
          await element.evaluate(e => e.classList.contains('devtools-link')),
          'Clicked element was not a devtools link');
    }
    await navigateToNetworkTab('stylesheet-resources.html', devToolsPage, inspectedPage);

    await clickOnInitiatorLink('missing.css');
    await waitForHistogramEvent(
        expectedAction,
        1,
        devToolsPage,
    );
    await waitForSourcesPanel(devToolsPage);
    await openNetworkTab(devToolsPage);
    await clickOnInitiatorLink('missing2.css');
    await waitForHistogramEvent(
        expectedAction,
        2,
        devToolsPage,
    );
    await waitForSourcesPanel(devToolsPage);
    await openNetworkTab(devToolsPage);
    await clickOnInitiatorLink('missing3.css');
    await waitForHistogramEvent(
        expectedAction,
        3,
        devToolsPage,
    );
  });
});
