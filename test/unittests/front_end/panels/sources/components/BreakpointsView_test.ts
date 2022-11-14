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
  dispatchKeyDownEvent,
  dispatchClickEvent,
} from '../../../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';
import {assertNotNullOrUndefined} from '../../../../../../front_end/core/platform/platform.js';

const DETAILS_SELECTOR = 'details';
const EXPANDED_GROUPS_SELECTOR = 'details[open]';
const COLLAPSED_GROUPS_SELECTOR = 'details:not([open])';
const CODE_SNIPPET_SELECTOR = '.code-snippet';
const GROUP_NAME_SELECTOR = '.group-header-title';
const BREAKPOINT_ITEM_SELECTOR = '.breakpoint-item';
const HIT_BREAKPOINT_SELECTOR = BREAKPOINT_ITEM_SELECTOR + '.hit';
const BREAKPOINT_LOCATION_SELECTOR = '.location';
const REMOVE_FILE_BREAKPOINTS_SELECTOR = '.group-hover-actions > button[data-remove-breakpoint]';
const REMOVE_SINGLE_BREAKPOINT_SELECTOR = '.breakpoint-item-location-or-actions > button[data-remove-breakpoint]';
const EDIT_SINGLE_BREAKPOINT_SELECTOR = 'button[data-edit-breakpoint]';
const PAUSE_ON_UNCAUGHT_EXCEPTIONS_SELECTOR = '.pause-on-uncaught-exceptions';
const PAUSE_ON_CAUGHT_EXCEPTIONS_SELECTOR = '.pause-on-caught-exceptions';
const TABBABLE_SELECTOR = '[tabindex="0"]';
const SUMMARY_SELECTOR = 'summary';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

async function renderNoBreakpoints(
    {pauseOnUncaughtExceptions, pauseOnCaughtExceptions, independentPauseToggles}:
        {pauseOnUncaughtExceptions: boolean, pauseOnCaughtExceptions: boolean, independentPauseToggles: boolean}):
    Promise<SourcesComponents.BreakpointsView.BreakpointsView> {
  const component = new SourcesComponents.BreakpointsView.BreakpointsView();
  renderElementIntoDOM(component);

  component.data = {
    breakpointsActive: true,
    pauseOnUncaughtExceptions,
    pauseOnCaughtExceptions,
    independentPauseToggles,
    groups: [],
  };
  await coordinator.done();
  return component;
}

async function renderSingleBreakpoint(
    type: SourcesComponents.BreakpointsView.BreakpointType =
        SourcesComponents.BreakpointsView.BreakpointType.REGULAR_BREAKPOINT,
    hoverText?: string): Promise<{
  component: SourcesComponents.BreakpointsView.BreakpointsView,
  data: SourcesComponents.BreakpointsView.BreakpointsViewData,
}> {
  // Only provide a hover text if it's not a regular breakpoint.
  assert.isTrue(!hoverText || type !== SourcesComponents.BreakpointsView.BreakpointType.REGULAR_BREAKPOINT);
  const component = new SourcesComponents.BreakpointsView.BreakpointsView();
  renderElementIntoDOM(component);

  const data: SourcesComponents.BreakpointsView.BreakpointsViewData = {
    breakpointsActive: true,
    pauseOnUncaughtExceptions: false,
    pauseOnCaughtExceptions: false,
    independentPauseToggles: true,
    groups: [
      {
        name: 'test1.js',
        url: 'https://google.com/test1.js' as Platform.DevToolsPath.UrlString,
        editable: true,
        expanded: true,
        breakpointItems: [
          {
            id: '1',
            location: '1',
            codeSnippet: 'const a = 0;',
            isHit: true,
            status: SourcesComponents.BreakpointsView.BreakpointStatus.ENABLED,
            type,
            hoverText,
          },
        ],
      },
    ],
  };

  component.data = data;
  await coordinator.done();
  return {component, data};
}

async function renderMultipleBreakpoints(): Promise<{
  component: SourcesComponents.BreakpointsView.BreakpointsView,
  data: SourcesComponents.BreakpointsView.BreakpointsViewData,
}> {
  const component = new SourcesComponents.BreakpointsView.BreakpointsView();
  renderElementIntoDOM(component);

  const data: SourcesComponents.BreakpointsView.BreakpointsViewData = {
    breakpointsActive: true,
    pauseOnUncaughtExceptions: false,
    pauseOnCaughtExceptions: false,
    independentPauseToggles: true,
    groups: [
      {
        name: 'test1.js',
        url: 'https://google.com/test1.js' as Platform.DevToolsPath.UrlString,
        editable: true,
        expanded: true,
        breakpointItems: [
          {
            id: '1',
            type: SourcesComponents.BreakpointsView.BreakpointType.REGULAR_BREAKPOINT,
            location: '234',
            codeSnippet: 'const a = x;',
            isHit: false,
            status: SourcesComponents.BreakpointsView.BreakpointStatus.ENABLED,
          },
          {
            id: '2',
            type: SourcesComponents.BreakpointsView.BreakpointType.REGULAR_BREAKPOINT,
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
        editable: false,
        expanded: true,
        breakpointItems: [
          {
            id: '3',
            type: SourcesComponents.BreakpointsView.BreakpointType.REGULAR_BREAKPOINT,
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
        editable: true,
        expanded: false,
        breakpointItems: [
          {
            id: '4',
            type: SourcesComponents.BreakpointsView.BreakpointType.REGULAR_BREAKPOINT,
            location: '3',
            codeSnippet: 'if (a == 0) {',
            isHit: false,
            status: SourcesComponents.BreakpointsView.BreakpointStatus.ENABLED,
          },
        ],
      },
    ],
  };
  component.data = data;
  await coordinator.done();
  return {component, data};
}

function extractBreakpointItems(data: SourcesComponents.BreakpointsView.BreakpointsViewData):
    SourcesComponents.BreakpointsView.BreakpointItem[] {
  const breakpointItems = data.groups.flatMap(group => group.breakpointItems);
  assert.isAbove(breakpointItems.length, 0);
  return breakpointItems;
}

function checkCodeSnippet(
    renderedBreakpointItem: HTMLDivElement, breakpointItem: SourcesComponents.BreakpointsView.BreakpointItem): void {
  const snippetElement = renderedBreakpointItem.querySelector(CODE_SNIPPET_SELECTOR);
  assertElement(snippetElement, HTMLSpanElement);
  assert.strictEqual(snippetElement.textContent, breakpointItem.codeSnippet);
}

function checkCheckboxState(
    checkbox: HTMLInputElement, breakpointItem: SourcesComponents.BreakpointsView.BreakpointItem): void {
  const checked = checkbox.checked;
  const indeterminate = checkbox.indeterminate;
  if (breakpointItem.status === SourcesComponents.BreakpointsView.BreakpointStatus.INDETERMINATE) {
    assert.isTrue(indeterminate);
  } else {
    assert.isFalse(indeterminate);
    assert.strictEqual((breakpointItem.status === SourcesComponents.BreakpointsView.BreakpointStatus.ENABLED), checked);
  }
}

function checkGroupNames(
    renderedGroupElements: Element[], breakpointGroups: SourcesComponents.BreakpointsView.BreakpointGroup[]): void {
  assert.lengthOf(renderedGroupElements, breakpointGroups.length);
  for (let i = 0; i < renderedGroupElements.length; ++i) {
    const renderedGroup = renderedGroupElements[i];
    assertElement(renderedGroup, HTMLDetailsElement);
    const titleElement = renderedGroup.querySelector(GROUP_NAME_SELECTOR);
    assertElement(titleElement, HTMLSpanElement);
    assert.strictEqual(titleElement.textContent, breakpointGroups[i].name);
  }
}

function hover(component: SourcesComponents.BreakpointsView.BreakpointsView, selector: string): Promise<void> {
  assertShadowRoot(component.shadowRoot);
  // Dispatch a mouse over.
  component.shadowRoot.querySelector(selector)?.dispatchEvent(new Event('mouseover'));
  // Wait until the re-rendering has happened.
  return coordinator.done();
}

describeWithEnvironment('BreakpointsView', () => {
  it('correctly expands breakpoint groups', async () => {
    const {component, data} = await renderMultipleBreakpoints();
    assertShadowRoot(component.shadowRoot);

    const expandedGroups = data.groups.filter(group => group.expanded);
    assert.isAbove(expandedGroups.length, 0);

    const renderedExpandedGroups = Array.from(component.shadowRoot.querySelectorAll(EXPANDED_GROUPS_SELECTOR));
    assert.lengthOf(renderedExpandedGroups, expandedGroups.length);

    checkGroupNames(renderedExpandedGroups, expandedGroups);
  });

  it('correctly collapses breakpoint groups', async () => {
    const {component, data} = await renderMultipleBreakpoints();
    assertShadowRoot(component.shadowRoot);

    const collapsedGroups = data.groups.filter(group => !group.expanded);
    assert.isAbove(collapsedGroups.length, 0);

    const renderedCollapsedGroups = Array.from(component.shadowRoot.querySelectorAll(COLLAPSED_GROUPS_SELECTOR));

    checkGroupNames(renderedCollapsedGroups, collapsedGroups);
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

    const breakpointItems = extractBreakpointItems(data);
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

    const breakpointItems = extractBreakpointItems(data);
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

    const breakpointItems = extractBreakpointItems(data);
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

    const renderedItem = component.shadowRoot.querySelector(BREAKPOINT_ITEM_SELECTOR);
    assertElement(renderedItem, HTMLDivElement);

    const checkbox = renderedItem.querySelector('input');
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

  it('triggers an event on removing file breakpoints', async () => {
    const {component, data} = await renderMultipleBreakpoints();
    assertShadowRoot(component.shadowRoot);

    await hover(component, SUMMARY_SELECTOR);

    const removeFileBreakpointsButton = component.shadowRoot.querySelector(REMOVE_FILE_BREAKPOINTS_SELECTOR);
    assertElement(removeFileBreakpointsButton, HTMLButtonElement);

    const eventPromise = getEventPromise<SourcesComponents.BreakpointsView.BreakpointsRemovedEvent>(
        component, SourcesComponents.BreakpointsView.BreakpointsRemovedEvent.eventName);
    removeFileBreakpointsButton.click();
    const event = await eventPromise;
    assert.deepStrictEqual(event.data.breakpointItems, data.groups[0].breakpointItems);
  });

  it('triggers an event on removing one breakpoint', async () => {
    const {component, data} = await renderMultipleBreakpoints();
    assertShadowRoot(component.shadowRoot);

    await hover(component, BREAKPOINT_ITEM_SELECTOR);

    const removeFileBreakpointsButton = component.shadowRoot.querySelector(REMOVE_SINGLE_BREAKPOINT_SELECTOR);
    assertElement(removeFileBreakpointsButton, HTMLButtonElement);

    const eventPromise = getEventPromise<SourcesComponents.BreakpointsView.BreakpointsRemovedEvent>(
        component, SourcesComponents.BreakpointsView.BreakpointsRemovedEvent.eventName);
    removeFileBreakpointsButton.click();
    const event = await eventPromise;
    assert.strictEqual(event.data.breakpointItems[0], data.groups[0].breakpointItems[0]);
  });

  it('triggers an event on editing one breakpoint', async () => {
    const {component, data} = await renderMultipleBreakpoints();
    assertShadowRoot(component.shadowRoot);

    await hover(component, BREAKPOINT_ITEM_SELECTOR);

    const editBreakpointButton = component.shadowRoot.querySelector(EDIT_SINGLE_BREAKPOINT_SELECTOR);
    assertElement(editBreakpointButton, HTMLButtonElement);

    const eventPromise = getEventPromise<SourcesComponents.BreakpointsView.BreakpointEditedEvent>(
        component, SourcesComponents.BreakpointsView.BreakpointEditedEvent.eventName);
    editBreakpointButton.click();
    const event = await eventPromise;
    assert.strictEqual(event.data.breakpointItem, data.groups[0].breakpointItems[0]);
  });

  it('shows a tooltip with edit condition on regular breakpoints', async () => {
    const {component} =
        await renderSingleBreakpoint(SourcesComponents.BreakpointsView.BreakpointType.REGULAR_BREAKPOINT);
    assertShadowRoot(component.shadowRoot);

    await hover(component, BREAKPOINT_ITEM_SELECTOR);

    const editBreakpointButton = component.shadowRoot.querySelector(EDIT_SINGLE_BREAKPOINT_SELECTOR);
    assertElement(editBreakpointButton, HTMLButtonElement);

    assert.strictEqual(editBreakpointButton.title, 'Edit condition');
  });

  it('only renders edit button for breakpoints in editable groups', async () => {
    const component = new SourcesComponents.BreakpointsView.BreakpointsView();
    renderElementIntoDOM(component);

    const data: SourcesComponents.BreakpointsView.BreakpointsViewData = {
      breakpointsActive: true,
      pauseOnUncaughtExceptions: false,
      pauseOnCaughtExceptions: false,
      independentPauseToggles: true,
      groups: [
        {
          name: 'test1.js',
          url: 'https://google.com/test1.js' as Platform.DevToolsPath.UrlString,
          editable: false,
          expanded: true,
          breakpointItems: [
            {
              id: '1',
              location: '1',
              codeSnippet: 'const a = 0;',
              isHit: true,
              status: SourcesComponents.BreakpointsView.BreakpointStatus.ENABLED,
              type: SourcesComponents.BreakpointsView.BreakpointType.REGULAR_BREAKPOINT,
            },
          ],
        },
      ],
    };

    component.data = data;
    await coordinator.done();
    assertShadowRoot(component.shadowRoot);

    await hover(component, BREAKPOINT_ITEM_SELECTOR);

    const editBreakpointButton = component.shadowRoot.querySelector(EDIT_SINGLE_BREAKPOINT_SELECTOR);
    assert.isNull(editBreakpointButton);
  });

  describe('conditional breakpoints', () => {
    const breakpointDetails = 'x < a';

    it('are rendered', async () => {
      const {component} = await renderSingleBreakpoint(
          SourcesComponents.BreakpointsView.BreakpointType.CONDITIONAL_BREAKPOINT, breakpointDetails);
      const breakpointItem = component.shadowRoot?.querySelector(BREAKPOINT_ITEM_SELECTOR);
      assertNotNullOrUndefined(breakpointItem);
      assertElement(breakpointItem, HTMLDivElement);
      assert.isTrue(breakpointItem.classList.contains('conditional-breakpoint'));
    });

    it('show a tooltip', async () => {
      const {component} = await renderSingleBreakpoint(
          SourcesComponents.BreakpointsView.BreakpointType.CONDITIONAL_BREAKPOINT, breakpointDetails);
      const codeSnippet = component.shadowRoot?.querySelector(CODE_SNIPPET_SELECTOR);
      assertNotNullOrUndefined(codeSnippet);
      assertElement(codeSnippet, HTMLSpanElement);
      assert.strictEqual(codeSnippet.title, `Condition: ${breakpointDetails}`);
    });

    it('show a tooltip on editing the condition', async () => {
      const {component} = await renderSingleBreakpoint(
          SourcesComponents.BreakpointsView.BreakpointType.CONDITIONAL_BREAKPOINT, breakpointDetails);
      assertShadowRoot(component.shadowRoot);

      await hover(component, BREAKPOINT_ITEM_SELECTOR);

      const editBreakpointButton = component.shadowRoot.querySelector(EDIT_SINGLE_BREAKPOINT_SELECTOR);
      assertElement(editBreakpointButton, HTMLButtonElement);

      assert.strictEqual(editBreakpointButton.title, 'Edit condition');
    });
  });

  describe('logpoints', () => {
    const breakpointDetails = 'x, a';

    it('are rendered', async () => {
      const {component} =
          await renderSingleBreakpoint(SourcesComponents.BreakpointsView.BreakpointType.LOGPOINT, breakpointDetails);
      const breakpointItem = component.shadowRoot?.querySelector(BREAKPOINT_ITEM_SELECTOR);
      assertNotNullOrUndefined(breakpointItem);
      assertElement(breakpointItem, HTMLDivElement);
      assert.isTrue(breakpointItem.classList.contains('logpoint'));
    });

    it('show a tooltip', async () => {
      const {component} =
          await renderSingleBreakpoint(SourcesComponents.BreakpointsView.BreakpointType.LOGPOINT, breakpointDetails);
      const codeSnippet = component.shadowRoot?.querySelector(CODE_SNIPPET_SELECTOR);
      assertNotNullOrUndefined(codeSnippet);
      assertElement(codeSnippet, HTMLSpanElement);
      assert.strictEqual(codeSnippet.title, `Logpoint: ${breakpointDetails}`);
    });

    it('show a tooltip on editing the logpoint', async () => {
      const {component} =
          await renderSingleBreakpoint(SourcesComponents.BreakpointsView.BreakpointType.LOGPOINT, breakpointDetails);
      assertShadowRoot(component.shadowRoot);

      await hover(component, BREAKPOINT_ITEM_SELECTOR);

      const editBreakpointButton = component.shadowRoot.querySelector(EDIT_SINGLE_BREAKPOINT_SELECTOR);
      assertElement(editBreakpointButton, HTMLButtonElement);

      assert.strictEqual(editBreakpointButton.title, 'Edit logpoint');
    });
  });

  describe('pause on exceptions', () => {
    it('state is rendered correctly when disabled', async () => {
      const component = await renderNoBreakpoints(
          {pauseOnUncaughtExceptions: false, pauseOnCaughtExceptions: false, independentPauseToggles: true});
      assertShadowRoot(component.shadowRoot);

      const pauseOnUncaughtExceptionsItem = component.shadowRoot.querySelector(PAUSE_ON_UNCAUGHT_EXCEPTIONS_SELECTOR);
      assertNotNullOrUndefined(pauseOnUncaughtExceptionsItem);

      const pauseOnUncaughtExceptionsCheckbox = pauseOnUncaughtExceptionsItem.querySelector('input');
      assertElement(pauseOnUncaughtExceptionsCheckbox, HTMLInputElement);
      assert.isFalse(pauseOnUncaughtExceptionsCheckbox.checked);

      const pauseOnCaughtExceptionsItem = component.shadowRoot?.querySelector(PAUSE_ON_CAUGHT_EXCEPTIONS_SELECTOR);
      assertNotNullOrUndefined(pauseOnCaughtExceptionsItem);

      const pauseOnCaughtExceptionsCheckbox = pauseOnUncaughtExceptionsItem.querySelector('input');
      assertElement(pauseOnCaughtExceptionsCheckbox, HTMLInputElement);
      assert.isFalse(pauseOnCaughtExceptionsCheckbox.checked);
    });

    it('state is rendered correctly when pausing on uncaught exceptions', async () => {
      const component = await renderNoBreakpoints(
          {pauseOnUncaughtExceptions: true, pauseOnCaughtExceptions: false, independentPauseToggles: true});
      assertShadowRoot(component.shadowRoot);

      const pauseOnUncaughtExceptionsItem = component.shadowRoot.querySelector(PAUSE_ON_UNCAUGHT_EXCEPTIONS_SELECTOR);
      assertNotNullOrUndefined(pauseOnUncaughtExceptionsItem);

      const pauseOnUncaughtExceptionsCheckbox = pauseOnUncaughtExceptionsItem.querySelector('input');
      assertNotNullOrUndefined(pauseOnUncaughtExceptionsCheckbox);
      assertElement(pauseOnUncaughtExceptionsCheckbox, HTMLInputElement);
      assert.isTrue(pauseOnUncaughtExceptionsCheckbox.checked);

      const pauseOnCaughtExceptionsItem = component.shadowRoot?.querySelector(PAUSE_ON_CAUGHT_EXCEPTIONS_SELECTOR);
      assertNotNullOrUndefined(pauseOnCaughtExceptionsItem);

      const pauseOnCaughtExceptionsCheckbox = pauseOnCaughtExceptionsItem.querySelector('input');
      assertNotNullOrUndefined(pauseOnCaughtExceptionsCheckbox);
      assertElement(pauseOnCaughtExceptionsCheckbox, HTMLInputElement);
      assert.isFalse(pauseOnCaughtExceptionsCheckbox.checked);
    });

    it('state is rendered correctly when pausing on all exceptions', async () => {
      const component = await renderNoBreakpoints(
          {pauseOnUncaughtExceptions: true, pauseOnCaughtExceptions: true, independentPauseToggles: true});
      assertShadowRoot(component.shadowRoot);

      const pauseOnUncaughtExceptionsItem = component.shadowRoot.querySelector(PAUSE_ON_UNCAUGHT_EXCEPTIONS_SELECTOR);
      assertNotNullOrUndefined(pauseOnUncaughtExceptionsItem);

      const pauseOnUncaughtExceptionsCheckbox = pauseOnUncaughtExceptionsItem.querySelector('input');
      assertNotNullOrUndefined(pauseOnUncaughtExceptionsCheckbox);
      assertElement(pauseOnUncaughtExceptionsCheckbox, HTMLInputElement);
      assert.isTrue(pauseOnUncaughtExceptionsCheckbox.checked);

      const pauseOnCaughtExceptionsItem = component.shadowRoot?.querySelector(PAUSE_ON_CAUGHT_EXCEPTIONS_SELECTOR);
      assertNotNullOrUndefined(pauseOnCaughtExceptionsItem);

      const pauseOnCaughtExceptionsCheckbox = pauseOnCaughtExceptionsItem.querySelector('input');
      assertNotNullOrUndefined(pauseOnCaughtExceptionsCheckbox);
      assertElement(pauseOnCaughtExceptionsCheckbox, HTMLInputElement);
      assert.isTrue(pauseOnCaughtExceptionsCheckbox.checked);
    });

    it('state is rendered correctly when toggles are dependent and only pausing on uncaught exceptions', async () => {
      const component = await renderNoBreakpoints(
          {pauseOnUncaughtExceptions: true, pauseOnCaughtExceptions: false, independentPauseToggles: false});
      assertShadowRoot(component.shadowRoot);

      const pauseOnUncaughtExceptionsItem = component.shadowRoot.querySelector(PAUSE_ON_UNCAUGHT_EXCEPTIONS_SELECTOR);
      assertNotNullOrUndefined(pauseOnUncaughtExceptionsItem);

      const pauseOnUncaughtExceptionsCheckbox = pauseOnUncaughtExceptionsItem.querySelector('input');
      assertNotNullOrUndefined(pauseOnUncaughtExceptionsCheckbox);
      assertElement(pauseOnUncaughtExceptionsCheckbox, HTMLInputElement);
      assert.isTrue(pauseOnUncaughtExceptionsCheckbox.checked);

      const pauseOnCaughtExceptionsItem = component.shadowRoot?.querySelector(PAUSE_ON_CAUGHT_EXCEPTIONS_SELECTOR);
      assertNotNullOrUndefined(pauseOnCaughtExceptionsItem);

      const pauseOnCaughtExceptionsCheckbox = pauseOnCaughtExceptionsItem.querySelector('input');
      assertElement(pauseOnCaughtExceptionsCheckbox, HTMLInputElement);
      assert.isFalse(pauseOnCaughtExceptionsCheckbox.disabled);
    });

    it('state is rendered correctly when toggles are dependent and not pausing on uncaught exceptions', async () => {
      const component = await renderNoBreakpoints(
          {pauseOnUncaughtExceptions: false, pauseOnCaughtExceptions: false, independentPauseToggles: false});
      assertShadowRoot(component.shadowRoot);

      const pauseOnUncaughtExceptionsItem = component.shadowRoot.querySelector(PAUSE_ON_UNCAUGHT_EXCEPTIONS_SELECTOR);
      assertNotNullOrUndefined(pauseOnUncaughtExceptionsItem);

      const pauseOnUncaughtExceptionsCheckbox = pauseOnUncaughtExceptionsItem.querySelector('input');
      assertNotNullOrUndefined(pauseOnUncaughtExceptionsCheckbox);
      assertElement(pauseOnUncaughtExceptionsCheckbox, HTMLInputElement);
      assert.isFalse(pauseOnUncaughtExceptionsCheckbox.checked);

      const pauseOnCaughtExceptionsItem = component.shadowRoot?.querySelector(PAUSE_ON_CAUGHT_EXCEPTIONS_SELECTOR);
      assertNotNullOrUndefined(pauseOnCaughtExceptionsItem);

      const pauseOnCaughtExceptionsCheckbox = pauseOnCaughtExceptionsItem.querySelector('input');
      assertElement(pauseOnCaughtExceptionsCheckbox, HTMLInputElement);
      assert.isTrue(pauseOnCaughtExceptionsCheckbox.disabled);
    });

    it('state is rendered correctly when toggles are dependent and pausing on uncaught exceptions is unchecked',
       async () => {
         const component = await renderNoBreakpoints(
             {pauseOnUncaughtExceptions: true, pauseOnCaughtExceptions: true, independentPauseToggles: false});
         assertShadowRoot(component.shadowRoot);

         const pauseOnUncaughtExceptionsItem =
             component.shadowRoot.querySelector(PAUSE_ON_UNCAUGHT_EXCEPTIONS_SELECTOR);
         assertElement(pauseOnUncaughtExceptionsItem, HTMLDivElement);

         {
           // Click on the pause on exceptions checkbox to uncheck.
           const pauseOnUncaughtExceptionsCheckbox = pauseOnUncaughtExceptionsItem.querySelector('input');
           assertElement(pauseOnUncaughtExceptionsCheckbox, HTMLInputElement);
           dispatchClickEvent(pauseOnUncaughtExceptionsCheckbox);
           await coordinator.done();
         }
         {
           // Check that clicking on it actually unchecked.
           const pauseOnUncaughtExceptionsCheckbox = pauseOnUncaughtExceptionsItem.querySelector('input');
           assertElement(pauseOnUncaughtExceptionsCheckbox, HTMLInputElement);
           assert.isFalse(pauseOnUncaughtExceptionsCheckbox.checked);
         }

         // Check if the pause on caught exception checkbox is unchecked and disabled as a result.
         const pauseOnCaughtExceptionsItem = component.shadowRoot?.querySelector(PAUSE_ON_CAUGHT_EXCEPTIONS_SELECTOR);
         assertNotNullOrUndefined(pauseOnCaughtExceptionsItem);

         const pauseOnCaughtExceptionsCheckbox = pauseOnCaughtExceptionsItem.querySelector('input');
         assertElement(pauseOnCaughtExceptionsCheckbox, HTMLInputElement);
         assert.isTrue(pauseOnCaughtExceptionsCheckbox.disabled);
         assert.isFalse(pauseOnCaughtExceptionsCheckbox.checked);
       });

    it('triggers an event when disabling pausing on all exceptions', async () => {
      const component = await renderNoBreakpoints(
          {pauseOnUncaughtExceptions: true, pauseOnCaughtExceptions: false, independentPauseToggles: true});
      assertShadowRoot(component.shadowRoot);

      const item = component.shadowRoot.querySelector(PAUSE_ON_UNCAUGHT_EXCEPTIONS_SELECTOR);
      assertNotNullOrUndefined(item);

      const checkbox = item.querySelector('input');
      assertElement(checkbox, HTMLInputElement);
      const {checked} = checkbox;

      const eventPromise =
          getEventPromise<SourcesComponents.BreakpointsView.PauseOnUncaughtExceptionsStateChangedEvent>(
              component, SourcesComponents.BreakpointsView.PauseOnUncaughtExceptionsStateChangedEvent.eventName);
      checkbox.click();
      const {data} = await eventPromise;

      assert.strictEqual(data.checked, !checked);
    });

    it('triggers an event when enabling pausing on caught exceptions', async () => {
      const component = await renderNoBreakpoints(
          {pauseOnUncaughtExceptions: true, pauseOnCaughtExceptions: false, independentPauseToggles: true});
      assertShadowRoot(component.shadowRoot);

      const item = component.shadowRoot.querySelector(PAUSE_ON_CAUGHT_EXCEPTIONS_SELECTOR);
      assertNotNullOrUndefined(item);

      const checkbox = item.querySelector('input');
      assertElement(checkbox, HTMLInputElement);
      const {checked} = checkbox;

      const eventPromise = getEventPromise<SourcesComponents.BreakpointsView.PauseOnCaughtExceptionsStateChangedEvent>(
          component, SourcesComponents.BreakpointsView.PauseOnCaughtExceptionsStateChangedEvent.eventName);
      checkbox.click();
      const {data} = await eventPromise;

      assert.strictEqual(data.checked, !checked);
    });

    it('triggers an event when enabling pausing on uncaught exceptions', async () => {
      const component = await renderNoBreakpoints(
          {pauseOnUncaughtExceptions: false, pauseOnCaughtExceptions: true, independentPauseToggles: true});
      assertShadowRoot(component.shadowRoot);

      const item = component.shadowRoot.querySelector(PAUSE_ON_UNCAUGHT_EXCEPTIONS_SELECTOR);
      assertNotNullOrUndefined(item);

      const checkbox = item.querySelector('input');
      assertElement(checkbox, HTMLInputElement);
      const {checked} = checkbox;

      const eventPromise =
          getEventPromise<SourcesComponents.BreakpointsView.PauseOnUncaughtExceptionsStateChangedEvent>(
              component, SourcesComponents.BreakpointsView.PauseOnUncaughtExceptionsStateChangedEvent.eventName);
      checkbox.click();
      const {data} = await eventPromise;

      assert.strictEqual(data.checked, !checked);
    });
  });

  describe('navigating with keyboard', () => {
    // One expanded group with 2 breakpoints, and one collapsed with 2 breakpoints.
    async function renderBreakpointsForKeyboardNavigation(): Promise<{
      component: SourcesComponents.BreakpointsView.BreakpointsView,
      data: SourcesComponents.BreakpointsView.BreakpointsViewData,
    }> {
      const component = new SourcesComponents.BreakpointsView.BreakpointsView();
      renderElementIntoDOM(component);

      const data: SourcesComponents.BreakpointsView.BreakpointsViewData = {
        breakpointsActive: true,
        pauseOnUncaughtExceptions: false,
        pauseOnCaughtExceptions: false,
        independentPauseToggles: true,
        groups: [
          {
            name: 'test1.js',
            url: 'https://google.com/test1.js' as Platform.DevToolsPath.UrlString,
            editable: false,
            expanded: true,
            breakpointItems: [
              {
                id: '1',
                type: SourcesComponents.BreakpointsView.BreakpointType.REGULAR_BREAKPOINT,
                location: '234',
                codeSnippet: 'const a = x;',
                isHit: false,
                status: SourcesComponents.BreakpointsView.BreakpointStatus.ENABLED,
              },
              {
                id: '2',
                type: SourcesComponents.BreakpointsView.BreakpointType.REGULAR_BREAKPOINT,
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
            editable: false,
            expanded: false,
            breakpointItems: [
              {
                id: '3',
                type: SourcesComponents.BreakpointsView.BreakpointType.REGULAR_BREAKPOINT,
                location: '11',
                codeSnippet: 'const y;',
                isHit: false,
                status: SourcesComponents.BreakpointsView.BreakpointStatus.ENABLED,
              },
              {
                id: '4',
                type: SourcesComponents.BreakpointsView.BreakpointType.REGULAR_BREAKPOINT,
                location: '12',
                codeSnippet: 'const y;',
                isHit: false,
                status: SourcesComponents.BreakpointsView.BreakpointStatus.ENABLED,
              },
            ],
          },
        ],
      };
      component.data = data;
      await coordinator.done();
      return {component, data};
    }

    it('pause on exceptions is tabbable', async () => {
      const component = await renderNoBreakpoints(
          {pauseOnUncaughtExceptions: true, pauseOnCaughtExceptions: false, independentPauseToggles: true});
      assertShadowRoot(component.shadowRoot);

      const focusableElements = component.shadowRoot.querySelectorAll(TABBABLE_SELECTOR);
      assertElements(focusableElements, HTMLElement);
      assert.lengthOf(focusableElements, 1);

      const pauseOnUncaughtExceptions = component.shadowRoot.querySelector(PAUSE_ON_UNCAUGHT_EXCEPTIONS_SELECTOR);

      assert.deepEqual(focusableElements.item(0), pauseOnUncaughtExceptions);
    });

    describe('pressing the HOME key', () => {
      it('takes the user to the pause-on-exceptions line', async () => {
        const {component} = await renderBreakpointsForKeyboardNavigation();
        assertShadowRoot(component.shadowRoot);
        const secondGroupsSummary =
            component.shadowRoot.querySelector(`${DETAILS_SELECTOR}:nth-of-type(2) > ${SUMMARY_SELECTOR}`);
        assertElement(secondGroupsSummary, HTMLElement);

        // Focus on second group by clicking on it, then press Home button.
        dispatchClickEvent(secondGroupsSummary);
        dispatchKeyDownEvent(secondGroupsSummary, {key: 'Home', bubbles: true});
        await coordinator.done();

        const selected = component.shadowRoot.querySelector(TABBABLE_SELECTOR);
        assertElement(selected, HTMLElement);
        const pauseOnUncaughtExceptions = component.shadowRoot.querySelector(PAUSE_ON_UNCAUGHT_EXCEPTIONS_SELECTOR);
        assertElement(pauseOnUncaughtExceptions, HTMLElement);
        assert.strictEqual(selected, pauseOnUncaughtExceptions);
      });
    });

    describe('pressing the END key', () => {
      it('takes the user to the summary node of the last group (if last group is collapsed)', async () => {
        const {component} = await renderBreakpointsForKeyboardNavigation();
        assertShadowRoot(component.shadowRoot);
        const pauseOnUncaughtExceptions = component.shadowRoot.querySelector(PAUSE_ON_UNCAUGHT_EXCEPTIONS_SELECTOR);
        assertElement(pauseOnUncaughtExceptions, HTMLElement);

        // Focus on the pause-on-exceptions line by clicking on it, then press End key.
        dispatchClickEvent(pauseOnUncaughtExceptions);
        dispatchKeyDownEvent(pauseOnUncaughtExceptions, {key: 'End', bubbles: true});
        await coordinator.done();

        const selected = component.shadowRoot.querySelector(TABBABLE_SELECTOR);
        assertElement(selected, HTMLElement);

        const lastGroupSummary =
            component.shadowRoot.querySelector(`${DETAILS_SELECTOR}:nth-of-type(2) > ${SUMMARY_SELECTOR}`);
        assertElement(lastGroupSummary, HTMLElement);
        assert.strictEqual(selected, lastGroupSummary);
      });

      it('takes the user to the last breakpoint item (if last group is expanded))', async () => {
        const {component, data} = await renderBreakpointsForKeyboardNavigation();
        // Expand the last group.
        data.groups[1].expanded = true;
        component.data = data;
        await coordinator.done();

        assertShadowRoot(component.shadowRoot);
        const firstGroupSummary = component.shadowRoot.querySelector(SUMMARY_SELECTOR);
        assertElement(firstGroupSummary, HTMLElement);

        // First focus on the first group by clicking on it, then press the End button.
        dispatchClickEvent(firstGroupSummary);
        dispatchKeyDownEvent(firstGroupSummary, {key: 'End', bubbles: true});
        await coordinator.done();

        const selected = component.shadowRoot.querySelector(TABBABLE_SELECTOR);
        assertElement(selected, HTMLElement);

        const breakpointItems = component.shadowRoot.querySelectorAll(BREAKPOINT_ITEM_SELECTOR);
        assertElements(breakpointItems, HTMLDivElement);

        const lastBreakpointItem = breakpointItems.item(breakpointItems.length - 1);
        assert.strictEqual(selected, lastBreakpointItem);
      });
    });

    describe('pressing the ArrowDown key', () => {
      it('on the pause-on-uncaught-exception takes the user to the summary node of the top most details element',
         async () => {
           const {component} = await renderBreakpointsForKeyboardNavigation();
           assertShadowRoot(component.shadowRoot);

           const pauseOnCaughtException = component.shadowRoot.querySelector(PAUSE_ON_CAUGHT_EXCEPTIONS_SELECTOR);
           assertElement(pauseOnCaughtException, HTMLElement);

           // Focus on the pause on exception, and navigate one down.
           dispatchClickEvent(pauseOnCaughtException);
           dispatchKeyDownEvent(pauseOnCaughtException, {key: 'ArrowDown', bubbles: true});
           await coordinator.done();

           const selected = component.shadowRoot.querySelector(TABBABLE_SELECTOR);
           const firstSummary = component.shadowRoot.querySelector(`${DETAILS_SELECTOR} > ${SUMMARY_SELECTOR}`);
           assertElement(firstSummary, HTMLElement);
           assert.strictEqual(selected, firstSummary);
         });

      it('on the summary node of an expanded group takes the user to the top most breakpoint item of that group',
         async () => {
           const {component} = await renderBreakpointsForKeyboardNavigation();
           assertShadowRoot(component.shadowRoot);
           const collapsedDetailsElement = component.shadowRoot.querySelector(COLLAPSED_GROUPS_SELECTOR);
           assertElement(collapsedDetailsElement, HTMLDetailsElement);

           const collapsedGroupSummary = collapsedDetailsElement.querySelector(SUMMARY_SELECTOR);
           assertElement(collapsedGroupSummary, HTMLElement);

           // Focus on the collapsed group and collapse it by clicking on it. Then navigate down.
           dispatchClickEvent(collapsedGroupSummary);
           dispatchKeyDownEvent(collapsedGroupSummary, {key: 'ArrowDown', bubbles: true});
           await coordinator.done();

           const selected = component.shadowRoot.querySelector(TABBABLE_SELECTOR);
           assertElement(selected, HTMLElement);

           const firstBreakpointItem = collapsedDetailsElement.querySelector(BREAKPOINT_ITEM_SELECTOR);
           assertElement(firstBreakpointItem, HTMLDivElement);

           assert.strictEqual(selected, firstBreakpointItem);
         });

      it('on the summary node of a collapsed group takes the user to the summary node of the next group', async () => {
        const {component} = await renderBreakpointsForKeyboardNavigation();
        assertShadowRoot(component.shadowRoot);

        const firstGroupSummary =
            component.shadowRoot.querySelector(`${DETAILS_SELECTOR}:nth-of-type(1) > ${SUMMARY_SELECTOR}`);
        assertElement(firstGroupSummary, HTMLElement);

        // Focus on the expanded group and collapse it by clicking on it. Then navigate down.
        dispatchClickEvent(firstGroupSummary);
        dispatchKeyDownEvent(firstGroupSummary, {key: 'ArrowDown', bubbles: true});
        await coordinator.done();

        const selected = component.shadowRoot.querySelector(TABBABLE_SELECTOR);
        assertElement(selected, HTMLElement);

        const secondGroupSummary =
            component.shadowRoot.querySelector(`${DETAILS_SELECTOR}:nth-of-type(2) > ${SUMMARY_SELECTOR}`);
        assertElement(secondGroupSummary, HTMLElement);
        assert.strictEqual(selected, secondGroupSummary);
      });

      it('on a breakpoint item takes the user to the next breakpoint item', async () => {
        const {component} = await renderBreakpointsForKeyboardNavigation();
        assertShadowRoot(component.shadowRoot);

        const firstDetailsElement = component.shadowRoot.querySelector('details');
        assertElement(firstDetailsElement, HTMLDetailsElement);
        const firstBreakpointItem = firstDetailsElement.querySelector(BREAKPOINT_ITEM_SELECTOR);
        assertElement(firstBreakpointItem, HTMLDivElement);

        // Focus on the first breakpoint item. Then navigate up.
        dispatchClickEvent(firstBreakpointItem);
        dispatchKeyDownEvent(firstBreakpointItem, {key: 'ArrowDown', bubbles: true});
        await coordinator.done();

        const selected = component.shadowRoot.querySelector(TABBABLE_SELECTOR);
        assertElement(selected, HTMLElement);

        const secondBreakpointItem = firstDetailsElement.querySelector(`${BREAKPOINT_ITEM_SELECTOR}:nth-of-type(2)`);
        assertElement(secondBreakpointItem, HTMLDivElement);

        assert.strictEqual(selected, secondBreakpointItem);
      });
    });

    describe('pressing the ArrowUp key', () => {
      it('on the first summary takes a user to the pause on exceptions', async () => {
        const {component} = await renderBreakpointsForKeyboardNavigation();
        assertShadowRoot(component.shadowRoot);
        const firstSummary = component.shadowRoot.querySelector(`${DETAILS_SELECTOR} > ${SUMMARY_SELECTOR}`);
        assertElement(firstSummary, HTMLElement);

        // Focus on the summary element.
        dispatchClickEvent(firstSummary);
        dispatchKeyDownEvent(firstSummary, {key: 'ArrowUp', bubbles: true});
        await coordinator.done();

        const selected = component.shadowRoot.querySelector(TABBABLE_SELECTOR);
        const pauseOnUncaughtExceptions = component.shadowRoot.querySelector(PAUSE_ON_CAUGHT_EXCEPTIONS_SELECTOR);
        assertElement(pauseOnUncaughtExceptions, HTMLDivElement);

        assert.strictEqual(selected, pauseOnUncaughtExceptions);
      });

      it('on the first breakpoint item in an expanded group takes the user to the summary node', async () => {
        const {component} = await renderBreakpointsForKeyboardNavigation();
        assertShadowRoot(component.shadowRoot);
        const expandedDetails = component.shadowRoot.querySelector(EXPANDED_GROUPS_SELECTOR);
        assertElement(expandedDetails, HTMLDetailsElement);

        const firstBreakpointItem = expandedDetails.querySelector(BREAKPOINT_ITEM_SELECTOR);
        assertElement(firstBreakpointItem, HTMLDivElement);

        // Focus on first breakpoint item. Then navigate up.
        dispatchClickEvent(firstBreakpointItem);
        dispatchKeyDownEvent(firstBreakpointItem, {key: 'ArrowUp', bubbles: true});
        await coordinator.done();

        const selected = component.shadowRoot.querySelector(TABBABLE_SELECTOR);
        assertElement(selected, HTMLElement);

        const summary = expandedDetails.querySelector(SUMMARY_SELECTOR);
        assertElement(summary, HTMLElement);

        assert.strictEqual(selected, summary);
      });

      it('on a breakpoint item in an expanded group takes the user to the previous breakpoint item', async () => {
        const {component} = await renderBreakpointsForKeyboardNavigation();
        assertShadowRoot(component.shadowRoot);
        const expandedDetails = component.shadowRoot.querySelector(EXPANDED_GROUPS_SELECTOR);
        assertElement(expandedDetails, HTMLDetailsElement);

        const breakpointItems = expandedDetails.querySelectorAll(BREAKPOINT_ITEM_SELECTOR);
        assert.isAbove(breakpointItems.length, 1);

        const lastBreakpointItem = breakpointItems.item(breakpointItems.length - 1);
        // Focus on last breakpoint item. Then navigate up.
        dispatchClickEvent(lastBreakpointItem);
        dispatchKeyDownEvent(lastBreakpointItem, {key: 'ArrowUp', bubbles: true});
        await coordinator.done();

        const selected = component.shadowRoot.querySelector(TABBABLE_SELECTOR);
        assertElement(selected, HTMLElement);

        const nextToLastBreakpointItem = breakpointItems.item(breakpointItems.length - 2);
        assertElement(nextToLastBreakpointItem, HTMLDivElement);
        assert.strictEqual(selected, nextToLastBreakpointItem);
      });

      it('on a summary node takes the user to the last breakpoint item of the previous group', async () => {
        const {component} = await renderBreakpointsForKeyboardNavigation();
        assertShadowRoot(component.shadowRoot);
        const secondGroupSummary =
            component.shadowRoot.querySelector(`${DETAILS_SELECTOR}:nth-of-type(2) > ${SUMMARY_SELECTOR}`);
        assertElement(secondGroupSummary, HTMLElement);

        // Focus on the group. Then navigate up.
        dispatchClickEvent(secondGroupSummary);
        dispatchKeyDownEvent(secondGroupSummary, {key: 'ArrowUp', bubbles: true});
        await coordinator.done();

        const selected = component.shadowRoot.querySelector(TABBABLE_SELECTOR);
        assertElement(selected, HTMLElement);

        const firstDetailsElement = component.shadowRoot.querySelector(DETAILS_SELECTOR);
        assertNotNullOrUndefined(firstDetailsElement);
        const lastBreakpointItem = firstDetailsElement.querySelector(`${BREAKPOINT_ITEM_SELECTOR}:last-child`);
        assertElement(lastBreakpointItem, HTMLDivElement);

        assert.strictEqual(selected, lastBreakpointItem);
      });
    });
  });
});
