// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SourcesComponents from '../../../../../../front_end/panels/sources/components/components.js';
import * as Coordinator from '../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';

import type * as Platform from '../../../../../../front_end/core/platform/platform.js';
import {
  assertElement,
  assertElements,
  assertShadowRoot,
  renderElementIntoDOM,
  getEventPromise,
} from '../../../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';

const EXPANDED_GROUPS_SELECTOR = '[data-group].expanded';
const COLLAPSED_GROUPS_SELECTOR = '[data-group]:not(.expanded)';
const CODE_SNIPPET_SELECTOR = '.code-snippet';
const GROUP_NAME_SELECTOR = '.group-header-title';
const BREAKPOINT_ITEM_SELECTOR = '.breakpoint-item';
const HIT_BREAKPOINT_SELECTOR = BREAKPOINT_ITEM_SELECTOR + '.hit';
const BREAKPOINT_LOCATION_SELECTOR = '.location';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

async function renderSingleBreakpoint() {
  const component = new SourcesComponents.BreakpointsView.BreakpointsView();
  renderElementIntoDOM(component);

  const data = {
    groups: [
      {
        name: 'test1.js',
        url: 'https://google.com/test1.js' as Platform.DevToolsPath.UrlString,
        expanded: true,
        breakpointItems: [
          {
            location: '1',
            codeSnippet: 'const a = 0;',
            isHit: true,
            status: SourcesComponents.BreakpointsView.BreakpointStatus.ENABLED,
          },
        ],
      },
    ],
  } as SourcesComponents.BreakpointsView.BreakpointsViewData;

  component.data = data;
  await coordinator.done();
  return {component, data};
}

async function renderMultipleBreakpoints() {
  const component = new SourcesComponents.BreakpointsView.BreakpointsView();
  renderElementIntoDOM(component);

  const data = {
    groups: [
      {
        name: 'test1.js',
        url: 'https://google.com/test1.js' as Platform.DevToolsPath.UrlString,
        expanded: true,
        breakpointItems: [
          {
            location: '234',
            codeSnippet: 'const a = x;',
            isHit: false,
            status: SourcesComponents.BreakpointsView.BreakpointStatus.ENABLED,
          },
          {
            location: '3:3',
            codeSnippet: 'if (x > a) {',
            isHit: true,
            status: SourcesComponents.BreakpointsView.BreakpointStatus.DISABLED,
          },
        ],
      },
      {
        name: 'test2.js',
        url: 'https://google.com/test2.js' as Platform.DevToolsPath.UrlString,
        expanded: true,
        breakpointItems: [
          {
            location: '11',
            codeSnippet: 'const y;',
            isHit: false,
            status: SourcesComponents.BreakpointsView.BreakpointStatus.ENABLED,
          },
        ],
      },
      {
        name: 'main.js',
        url: 'https://test.com/main.js' as Platform.DevToolsPath.UrlString,
        expanded: false,
        breakpointItems: [
          {
            location: '3',
            codeSnippet: 'if (a == 0) {',
            isHit: false,
            status: SourcesComponents.BreakpointsView.BreakpointStatus.ENABLED,
          },
        ],
      },
    ],
  } as SourcesComponents.BreakpointsView.BreakpointsViewData;
  component.data = data;
  await coordinator.done();
  return {component, data};
}

function extractVisibleBreakpointItems(data: SourcesComponents.BreakpointsView.BreakpointsViewData) {
  const visibleGroups = data.groups.filter(group => group.expanded);
  const breakpointItems = visibleGroups.flatMap(group => group.breakpointItems);
  assert.isAbove(breakpointItems.length, 0);
  return breakpointItems;
}

function checkCodeSnippet(
    renderedBreakpointItem: HTMLDivElement, breakpointItem: SourcesComponents.BreakpointsView.BreakpointItem) {
  const snippetElement = renderedBreakpointItem.querySelector(CODE_SNIPPET_SELECTOR);
  assertElement(snippetElement, HTMLSpanElement);
  assert.strictEqual(snippetElement.textContent, breakpointItem.codeSnippet);
}

function checkCheckboxState(
    checkbox: HTMLInputElement, breakpointItem: SourcesComponents.BreakpointsView.BreakpointItem) {
  const checked = checkbox.checked;
  const indeterminate = checkbox.indeterminate;
  if (breakpointItem.status === SourcesComponents.BreakpointsView.BreakpointStatus.INDETERMINATE) {
    assert.isTrue(indeterminate);
  } else {
    assert.isFalse(indeterminate);
    assert.strictEqual((breakpointItem.status === SourcesComponents.BreakpointsView.BreakpointStatus.ENABLED), checked);
  }
}

describeWithEnvironment('BreakpointsView', () => {
  it('renders breakpoint entries of groups that are expanded', async () => {
    const {component, data} = await renderMultipleBreakpoints();
    assertShadowRoot(component.shadowRoot);

    const expandedGroups = data.groups.filter(group => group.expanded);
    assert.isAbove(expandedGroups.length, 0);

    const renderedExpandedGroups = Array.from(component.shadowRoot.querySelectorAll(EXPANDED_GROUPS_SELECTOR));
    assert.lengthOf(renderedExpandedGroups, expandedGroups.length);

    for (let i = 0; i < renderedExpandedGroups.length; ++i) {
      const renderedGroup = renderedExpandedGroups[i];
      assertElement(renderedGroup, HTMLDivElement);

      const expectedLength = expandedGroups[i].breakpointItems.length;
      const actualLength = renderedGroup.querySelectorAll(BREAKPOINT_ITEM_SELECTOR).length;
      assert.strictEqual(actualLength, expectedLength);
    }
  });

  it('does not show breakpoint entries if group is not expanded', async () => {
    const {component, data} = await renderMultipleBreakpoints();
    assertShadowRoot(component.shadowRoot);

    const collapsedGroups = data.groups.filter(group => !group.expanded);
    assert.isAbove(collapsedGroups.length, 0);

    const renderedCollapsedGroups = component.shadowRoot.querySelectorAll(COLLAPSED_GROUPS_SELECTOR);
    assertElements(renderedCollapsedGroups, HTMLDivElement);
    assert.lengthOf(renderedCollapsedGroups, collapsedGroups.length);

    for (const element of renderedCollapsedGroups.values()) {
      const renderedBreakpointItems = element.querySelectorAll(BREAKPOINT_ITEM_SELECTOR);
      assert.lengthOf(renderedBreakpointItems, 0);
    }
  });

  it('renders the group names', async () => {
    const {component, data} = await renderMultipleBreakpoints();
    assertShadowRoot(component.shadowRoot);

    const renderedGroupNames = component.shadowRoot.querySelectorAll(GROUP_NAME_SELECTOR);
    assertElements(renderedGroupNames, HTMLSpanElement);

    const expectedNames = data.groups.flatMap(group => group.name);
    const actualNames = [];
    for (const renderedGroupName of renderedGroupNames.values()) {
      actualNames.push(renderedGroupName.textContent);
    }
    assert.deepEqual(actualNames, expectedNames);
  });

  it('renders the breakpoints with their checkboxes', async () => {
    const {component, data} = await renderMultipleBreakpoints();
    assertShadowRoot(component.shadowRoot);

    const renderedBreakpointItems = Array.from(component.shadowRoot.querySelectorAll(BREAKPOINT_ITEM_SELECTOR));

    const breakpointItems = extractVisibleBreakpointItems(data);
    assert.lengthOf(renderedBreakpointItems, breakpointItems.length);

    for (let i = 0; i < renderedBreakpointItems.length; ++i) {
      const renderedItem = renderedBreakpointItems[i];
      assertElement(renderedItem, HTMLDivElement);

      const inputElement = renderedItem.querySelector('input');
      assertElement(inputElement, HTMLInputElement);
      checkCheckboxState(inputElement, breakpointItems[i]);
    }
  });

  it('renders breakpoints with their code snippet', async () => {
    const {component, data} = await renderMultipleBreakpoints();
    assertShadowRoot(component.shadowRoot);

    const renderedBreakpointItems = Array.from(component.shadowRoot.querySelectorAll(BREAKPOINT_ITEM_SELECTOR));

    const breakpointItems = extractVisibleBreakpointItems(data);
    assert.lengthOf(renderedBreakpointItems, breakpointItems.length);

    for (let i = 0; i < renderedBreakpointItems.length; ++i) {
      const renderedBreakpointItem = renderedBreakpointItems[i];
      assertElement(renderedBreakpointItem, HTMLDivElement);
      checkCodeSnippet(renderedBreakpointItem, breakpointItems[i]);
    }
  });

  it('renders breakpoints with their location', async () => {
    const {component, data} = await renderMultipleBreakpoints();
    assertShadowRoot(component.shadowRoot);

    const renderedBreakpointItems = Array.from(component.shadowRoot.querySelectorAll(BREAKPOINT_ITEM_SELECTOR));

    const breakpointItems = extractVisibleBreakpointItems(data);
    assert.lengthOf(renderedBreakpointItems, breakpointItems.length);

    for (let i = 0; i < renderedBreakpointItems.length; ++i) {
      const renderedBreakpointItem = renderedBreakpointItems[i];
      assertElement(renderedBreakpointItem, HTMLDivElement);

      const locationElement = renderedBreakpointItem.querySelector(BREAKPOINT_LOCATION_SELECTOR);
      assertElement(locationElement, HTMLSpanElement);

      const actualLocation = locationElement.textContent;
      const expectedLocation = breakpointItems[i].location;

      assert.strictEqual(actualLocation, expectedLocation);
    }
  });

  it('triggers an event on clicking the checkbox of a breakpoint', async () => {
    const {component, data} = await renderSingleBreakpoint();
    assertShadowRoot(component.shadowRoot);

    const checkbox = component.shadowRoot.querySelector('input');
    assertElement(checkbox, HTMLInputElement);
    const checked = checkbox.checked;

    const eventPromise = getEventPromise<SourcesComponents.BreakpointsView.CheckboxToggledEvent>(
        component, SourcesComponents.BreakpointsView.CheckboxToggledEvent.eventName);
    checkbox.click();
    const event = await eventPromise;

    assert.strictEqual(event.data.checked, !checked);
    assert.deepEqual(event.data.breakpointItem, data.groups[0].breakpointItems[0]);
  });

  it('triggers an event on clicking on the snippet text', async () => {
    const {component, data} = await renderSingleBreakpoint();
    assertShadowRoot(component.shadowRoot);

    const snippet = component.shadowRoot.querySelector(CODE_SNIPPET_SELECTOR);
    assertElement(snippet, HTMLSpanElement);

    const eventPromise = getEventPromise<SourcesComponents.BreakpointsView.BreakpointSelectedEvent>(
        component, SourcesComponents.BreakpointsView.BreakpointSelectedEvent.eventName);
    snippet.click();
    const event = await eventPromise;
    assert.deepEqual(event.data.breakpointItem, data.groups[0].breakpointItems[0]);
  });

  it('triggers an event on expanding/unexpanding', async () => {
    const {component, data} = await renderSingleBreakpoint();
    assertShadowRoot(component.shadowRoot);

    const renderedGroupName = component.shadowRoot.querySelector(GROUP_NAME_SELECTOR);
    assertElement(renderedGroupName, HTMLSpanElement);

    const expandedInitialValue = data.groups[0].expanded;

    const eventPromise = getEventPromise<SourcesComponents.BreakpointsView.ExpandedStateChangedEvent>(
        component, SourcesComponents.BreakpointsView.ExpandedStateChangedEvent.eventName);
    renderedGroupName.click();
    const event = await eventPromise;

    const group = data.groups[0];
    assert.deepEqual(event.data.url, group.url);
    assert.strictEqual(event.data.expanded, group.expanded);
    assert.notStrictEqual(event.data.expanded, expandedInitialValue);
  });

  it('highlights breakpoint if it is set to be hit', async () => {
    const {component} = await renderSingleBreakpoint();
    assertShadowRoot(component.shadowRoot);

    const renderedBreakpointItem = component.shadowRoot.querySelector(HIT_BREAKPOINT_SELECTOR);
    assertElement(renderedBreakpointItem, HTMLDivElement);
  });
});
