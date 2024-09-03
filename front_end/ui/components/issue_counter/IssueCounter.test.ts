// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as IssuesManager from '../../../models/issues_manager/issues_manager.js';
import {
  assertElements,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../../testing/EnvironmentHelpers.js';
import {MockIssuesManager} from '../../../testing/MockIssuesManager.js';
import * as IconButton from '../icon_button/icon_button.js';

import * as IssueCounter from './issue_counter.js';

const renderIssueCounter = (data: IssueCounter.IssueCounter.IssueCounterData):
    {component: IssueCounter.IssueCounter.IssueCounter, shadowRoot: ShadowRoot} => {
      const component = new IssueCounter.IssueCounter.IssueCounter();
      component.data = data;
      renderElementIntoDOM(component);
      assert.isNotNull(component.shadowRoot);
      return {component, shadowRoot: component.shadowRoot};
    };

export const extractIconGroups = (shadowRoot: ShadowRoot) => {
  const iconButton = shadowRoot.querySelector('icon-button');
  assert.instanceOf(iconButton, IconButton.IconButton.IconButton);
  const iconButtonShadowRoot = iconButton.shadowRoot;
  assert.exists(iconButtonShadowRoot);
  const icons = iconButtonShadowRoot.querySelectorAll('.status-icon');
  assertElements(icons, IconButton.Icon.Icon);
  const labels = iconButtonShadowRoot.querySelectorAll('.icon-button-title');
  assertElements(labels, HTMLSpanElement);
  assert(icons.length === labels.length, 'Expected icons and labels to appear in pairs');
  const iconGroups = [];
  for (let i = 0; i < icons.length; ++i) {
    const labelElement = labels[i];
    const label: string|null =
        window.getComputedStyle(labelElement).display === 'none' ? null : labelElement.textContent;
    iconGroups.push({iconData: icons[i].data, label});
  }
  return iconGroups;
};

export const extractButton = (shadowRoot: ShadowRoot) => {
  const iconButton = shadowRoot.querySelector('icon-button');
  assert.instanceOf(iconButton, IconButton.IconButton.IconButton);
  const iconButtonShadowRoot = iconButton.shadowRoot;
  assert.exists(iconButtonShadowRoot);
  const button = iconButtonShadowRoot.querySelector('button');
  assert.instanceOf(button, HTMLButtonElement);
  return button;
};

describeWithLocale('IssueCounter', () => {
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
      assert.deepEqual(iconNames, ['issue-cross-filled', 'issue-exclamation-filled']);
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
        assert.deepEqual(iconNames, ['issue-cross-filled', 'issue-exclamation-filled']);
      }

      issuesManager.incrementIssueCountsOfAllKinds();

      {
        const icons = extractIconGroups(shadowRoot);
        assert.strictEqual(icons.length, 3);
        assert.deepEqual(icons.map(c => c.label), ['3', '2', '1']);
        const iconNames = icons.map(c => 'iconName' in c.iconData ? c.iconData.iconName : undefined);
        assert.deepEqual(iconNames, ['issue-cross-filled', 'issue-exclamation-filled', 'issue-text-filled']);
      }
    });

    it('updates correctly through setter', () => {
      const issuesManager = new MockIssuesManager([]);
      const {component, shadowRoot} = renderIssueCounter({
        issuesManager: issuesManager as unknown as IssuesManager.IssuesManager.IssuesManager,
        throttlerTimeout: 0,
      });

      {
        const icons = extractIconGroups(shadowRoot);
        assert.strictEqual(icons.length, 2);
        assert.deepEqual(icons.map(c => c.label), ['2', '1']);
        const iconNames = icons.map(c => 'iconName' in c.iconData ? c.iconData.iconName : undefined);
        assert.deepEqual(iconNames, ['issue-cross-filled', 'issue-exclamation-filled']);
      }

      component.data = {...component.data, displayMode: IssueCounter.IssueCounter.DisplayMode.ONLY_MOST_IMPORTANT};

      {
        const icons = extractIconGroups(shadowRoot);
        assert.strictEqual(icons.length, 1);
        assert.deepEqual(icons.map(c => c.label), ['2']);
        const iconNames = icons.map(c => 'iconName' in c.iconData ? c.iconData.iconName : undefined);
        assert.deepEqual(iconNames, ['issue-cross-filled']);
      }
    });

    it('Aria label is added correctly', () => {
      const expectedAccessibleName = 'Accessible Name';
      const issuesManager = new MockIssuesManager([]);
      const {shadowRoot} = renderIssueCounter({
        issuesManager: issuesManager as unknown as IssuesManager.IssuesManager.IssuesManager,
        throttlerTimeout: 0,
        accessibleName: expectedAccessibleName,
      });

      const button = extractButton(shadowRoot);
      const accessibleName = button.getAttribute('aria-label');

      assert.strictEqual(accessibleName, expectedAccessibleName);
    });
  });

  describe('without omitting zero count issue kinds', () => {
    it('renders correctly', () => {
      const issuesManager = new MockIssuesManager([]);
      const {shadowRoot} = renderIssueCounter({
        issuesManager: issuesManager as unknown as IssuesManager.IssuesManager.IssuesManager,
        displayMode: IssueCounter.IssueCounter.DisplayMode.SHOW_ALWAYS,
        throttlerTimeout: 0,
      });

      const icons = extractIconGroups(shadowRoot);
      assert.strictEqual(icons.length, 3);
      assert.deepEqual(icons.map(c => c.label), ['2', '1', '0']);
      const iconNames = icons.map(c => 'iconName' in c.iconData ? c.iconData.iconName : undefined);
      assert.deepEqual(iconNames, ['issue-cross-filled', 'issue-exclamation-filled', 'issue-text-filled']);
    });

    it('updates correctly', () => {
      const issuesManager = new MockIssuesManager([]);
      const {shadowRoot} = renderIssueCounter({
        issuesManager: issuesManager as unknown as IssuesManager.IssuesManager.IssuesManager,
        displayMode: IssueCounter.IssueCounter.DisplayMode.SHOW_ALWAYS,
        throttlerTimeout: 0,
      });

      {
        const icons = extractIconGroups(shadowRoot);
        assert.strictEqual(icons.length, 3);
        assert.deepEqual(icons.map(c => c.label), ['2', '1', '0']);
        const iconNames = icons.map(c => 'iconName' in c.iconData ? c.iconData.iconName : undefined);
        assert.deepEqual(iconNames, ['issue-cross-filled', 'issue-exclamation-filled', 'issue-text-filled']);
      }

      issuesManager.incrementIssueCountsOfAllKinds();

      {
        const icons = extractIconGroups(shadowRoot);
        assert.strictEqual(icons.length, 3);
        assert.deepEqual(icons.map(c => c.label), ['3', '2', '1']);
        const iconNames = icons.map(c => 'iconName' in c.iconData ? c.iconData.iconName : undefined);
        assert.deepEqual(iconNames, ['issue-cross-filled', 'issue-exclamation-filled', 'issue-text-filled']);
      }
    });
  });

  describe('in compact mode', () => {
    it('renders correctly', () => {
      const issuesManager = new MockIssuesManager([]);
      const {shadowRoot} = renderIssueCounter({
        issuesManager: issuesManager as unknown as IssuesManager.IssuesManager.IssuesManager,
        throttlerTimeout: 0,
        compact: true,
      });

      const icons = extractIconGroups(shadowRoot);
      assert.strictEqual(icons.length, 1);
      assert.deepEqual(icons.map(c => c.label), [null]);
      const iconNames = icons.map(c => 'iconName' in c.iconData ? c.iconData.iconName : undefined);
      assert.deepEqual(iconNames, ['issue-cross-filled']);
    });

    it('renders correctly with only improvement issues', () => {
      const issuesManager = new MockIssuesManager([]);
      issuesManager.setNumberOfIssues(new Map([
        [IssuesManager.Issue.IssueKind.IMPROVEMENT, 3],
        [IssuesManager.Issue.IssueKind.BREAKING_CHANGE, 0],
        [IssuesManager.Issue.IssueKind.PAGE_ERROR, 0],
      ]));
      const {shadowRoot} = renderIssueCounter({
        issuesManager: issuesManager as unknown as IssuesManager.IssuesManager.IssuesManager,
        throttlerTimeout: 0,
        compact: true,
      });

      const icons = extractIconGroups(shadowRoot);
      assert.strictEqual(icons.length, 1);
      assert.deepEqual(icons.map(c => c.label), [null]);
      const iconNames = icons.map(c => 'iconName' in c.iconData ? c.iconData.iconName : undefined);
      assert.deepEqual(iconNames, ['issue-text-filled']);
    });
  });
});

describeWithLocale('getIssueCountsEnumeration', () => {
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
