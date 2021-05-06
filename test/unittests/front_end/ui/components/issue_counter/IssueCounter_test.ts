// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNull} from '../../../../../../front_end/core/platform/platform.js';
import * as IssuesManager from '../../../../../../front_end/models/issues_manager/issues_manager.js';
import * as IconButton from '../../../../../../front_end/ui/components/icon_button/icon_button.js';
import * as IssueCounter from '../../../../../../front_end/ui/components/issue_counter/issue_counter.js';
import {assertElement, assertElements, assertShadowRoot, renderElementIntoDOM} from '../../../helpers/DOMHelpers.js';
import {MockIssuesManager} from '../../../models/issues_manager/MockIssuesManager.js';

const {assert} = chai;

const renderIssueCounter = (data: IssueCounter.IssueCounter.IssueCounterData):
    {component: IssueCounter.IssueCounter.IssueCounter, shadowRoot: ShadowRoot} => {
      const component = new IssueCounter.IssueCounter.IssueCounter();
      component.data = data;
      renderElementIntoDOM(component);
      assertShadowRoot(component.shadowRoot);
      return {component, shadowRoot: component.shadowRoot};
    };

export const extractIconGroups =
    (shadowRoot: ShadowRoot): {iconData: IconButton.Icon.IconData, label: string|null}[] => {
      const iconButton = shadowRoot.querySelector('icon-button');
      assertElement(iconButton, IconButton.IconButton.IconButton);
      const iconButtonShadowRoot = iconButton.shadowRoot;
      assertNotNull(iconButtonShadowRoot);
      const icons = iconButtonShadowRoot.querySelectorAll('.status-icon');
      assertElements(icons, IconButton.Icon.Icon);
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
        issuesManager: issuesManager as unknown as IssuesManager.IssuesManager.IssuesManager,
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
        issuesManager: issuesManager as unknown as IssuesManager.IssuesManager.IssuesManager,
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
        issuesManager: issuesManager as unknown as IssuesManager.IssuesManager.IssuesManager,
        displayMode: IssueCounter.IssueCounter.DisplayMode.ShowAlways,
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
        issuesManager: issuesManager as unknown as IssuesManager.IssuesManager.IssuesManager,
        displayMode: IssueCounter.IssueCounter.DisplayMode.ShowAlways,
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
    const string = IssueCounter.IssueCounter.getIssueCountsEnumeration(
        issuesManager as unknown as IssuesManager.IssuesManager.IssuesManager);
    assert.strictEqual(string, '2 page errors, 1 breaking change');
  });
  it('formats issue counts correctly when displaying zero entries', () => {
    const issuesManager = new MockIssuesManager([]);
    const string = IssueCounter.IssueCounter.getIssueCountsEnumeration(
        issuesManager as unknown as IssuesManager.IssuesManager.IssuesManager, false);
    assert.strictEqual(string, '2 page errors, 1 breaking change, 0 possible improvements');
  });
});
