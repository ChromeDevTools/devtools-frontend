// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as BrowserSDK from '../../../../front_end/browser_sdk/browser_sdk.js';
import {assertNotNull} from '../../../../front_end/core/platform/platform.js';
import * as ConsoleCounters from '../../../../front_end/panels/console_counters/console_counters.js';
import * as WebComponents from '../../../../front_end/ui/components/components.js';
import {MockIssuesManager} from '../browser_sdk/MockIssuesManager.js';
import {assertElement, assertElements, assertShadowRoot, renderElementIntoDOM} from '../helpers/DOMHelpers.js';

const {assert} = chai;

const renderIssueCounter = (data: ConsoleCounters.IssueCounter.IssueCounterData):
    {component: ConsoleCounters.IssueCounter.IssueCounter, shadowRoot: ShadowRoot} => {
      const component = new ConsoleCounters.IssueCounter.IssueCounter();
      component.data = data;
      renderElementIntoDOM(component);
      assertShadowRoot(component.shadowRoot);
      return {component, shadowRoot: component.shadowRoot};
    };

export const extractIconGroups =
    (shadowRoot: ShadowRoot): {iconData: WebComponents.Icon.IconData, label: string|null}[] => {
      const iconButton = shadowRoot.querySelector('icon-button');
      assertElement(iconButton, WebComponents.IconButton.IconButton);
      const iconButtonShadowRoot = iconButton.shadowRoot;
      assertNotNull(iconButtonShadowRoot);
      const icons = iconButtonShadowRoot.querySelectorAll('.status-icon');
      assertElements(icons, WebComponents.Icon.Icon);
      const labels = iconButtonShadowRoot.querySelectorAll('.icon-button-title');
      assertElements(labels, HTMLSpanElement);
      assert(icons.length === labels.length, 'Expected icons and labels to appear in pairs');
      const iconGroups = [];
      for (let i = 0; i < icons.length; ++i) {
        iconGroups.push({iconData: icons[i].data, label: labels[i].textContent});
      }
      return iconGroups;
    };

describe('IssueCounter', () => {
  describe('with omitting zero-count issue kinds', () => {
    it('renders correctly', () => {
      const issuesManager = new MockIssuesManager([]);
      const {shadowRoot} = renderIssueCounter({
        issuesManager: issuesManager as unknown as BrowserSDK.IssuesManager.IssuesManager,
        throttlerTimeout: 0,
      });

      const icons = extractIconGroups(shadowRoot);
      assert.strictEqual(icons.length, 2);
      assert.deepEqual(icons.map(c => c.label), ['2', '1']);
      const iconNames = icons.map(c => 'iconName' in c.iconData ? c.iconData.iconName : undefined);
      assert.deepEqual(iconNames, ['issue-cross-icon', 'issue-exclamation-icon']);
    });

    it('updates correctly', () => {
      const issuesManager = new MockIssuesManager([]);
      const {shadowRoot} = renderIssueCounter({
        issuesManager: issuesManager as unknown as BrowserSDK.IssuesManager.IssuesManager,
        throttlerTimeout: 0,
      });

      {
        const icons = extractIconGroups(shadowRoot);
        assert.strictEqual(icons.length, 2);
        assert.deepEqual(icons.map(c => c.label), ['2', '1']);
        const iconNames = icons.map(c => 'iconName' in c.iconData ? c.iconData.iconName : undefined);
        assert.deepEqual(iconNames, ['issue-cross-icon', 'issue-exclamation-icon']);
      }

      issuesManager.incrementIssueCountsOfAllKinds();

      {
        const icons = extractIconGroups(shadowRoot);
        assert.strictEqual(icons.length, 3);
        assert.deepEqual(icons.map(c => c.label), ['3', '2', '1']);
        const iconNames = icons.map(c => 'iconName' in c.iconData ? c.iconData.iconName : undefined);
        assert.deepEqual(iconNames, ['issue-cross-icon', 'issue-exclamation-icon', 'issue-text-icon']);
      }
    });
  });

  describe('without omitting zero count issue kinds', () => {
    it('renders correctly', () => {
      const issuesManager = new MockIssuesManager([]);
      const {shadowRoot} = renderIssueCounter({
        issuesManager: issuesManager as unknown as BrowserSDK.IssuesManager.IssuesManager,
        displayMode: ConsoleCounters.IssueCounter.DisplayMode.ShowAlways,
        throttlerTimeout: 0,
      });

      const icons = extractIconGroups(shadowRoot);
      assert.strictEqual(icons.length, 3);
      assert.deepEqual(icons.map(c => c.label), ['2', '1', '0']);
      const iconNames = icons.map(c => 'iconName' in c.iconData ? c.iconData.iconName : undefined);
      assert.deepEqual(iconNames, ['issue-cross-icon', 'issue-exclamation-icon', 'issue-text-icon']);
    });

    it('updates correctly', () => {
      const issuesManager = new MockIssuesManager([]);
      const {shadowRoot} = renderIssueCounter({
        issuesManager: issuesManager as unknown as BrowserSDK.IssuesManager.IssuesManager,
        displayMode: ConsoleCounters.IssueCounter.DisplayMode.ShowAlways,
        throttlerTimeout: 0,
      });

      {
        const icons = extractIconGroups(shadowRoot);
        assert.strictEqual(icons.length, 3);
        assert.deepEqual(icons.map(c => c.label), ['2', '1', '0']);
        const iconNames = icons.map(c => 'iconName' in c.iconData ? c.iconData.iconName : undefined);
        assert.deepEqual(iconNames, ['issue-cross-icon', 'issue-exclamation-icon', 'issue-text-icon']);
      }

      issuesManager.incrementIssueCountsOfAllKinds();

      {
        const icons = extractIconGroups(shadowRoot);
        assert.strictEqual(icons.length, 3);
        assert.deepEqual(icons.map(c => c.label), ['3', '2', '1']);
        const iconNames = icons.map(c => 'iconName' in c.iconData ? c.iconData.iconName : undefined);
        assert.deepEqual(iconNames, ['issue-cross-icon', 'issue-exclamation-icon', 'issue-text-icon']);
      }
    });
  });
});

describe('getIssueCountsEnumeration', () => {
  it('formats issue counts correctly', () => {
    const issuesManager = new MockIssuesManager([]);
    const string = ConsoleCounters.IssueCounter.getIssueCountsEnumeration(
        issuesManager as unknown as BrowserSDK.IssuesManager.IssuesManager);
    assert.strictEqual(string, '2 page errors, 1 breaking change');
  });
  it('formats issue counts correctly when displaying zero entries', () => {
    const issuesManager = new MockIssuesManager([]);
    const string = ConsoleCounters.IssueCounter.getIssueCountsEnumeration(
        issuesManager as unknown as BrowserSDK.IssuesManager.IssuesManager, false);
    assert.strictEqual(string, '2 page errors, 1 breaking change, 0 possible improvements');
  });
});
