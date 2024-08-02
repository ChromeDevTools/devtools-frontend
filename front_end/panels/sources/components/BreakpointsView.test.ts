// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as Bindings from '../../../models/bindings/bindings.js';
import * as Breakpoints from '../../../models/breakpoints/breakpoints.js';
import * as TextUtils from '../../../models/text_utils/text_utils.js';
import * as Workspace from '../../../models/workspace/workspace.js';
import {
  assertElements,
  dispatchClickEvent,
  dispatchKeyDownEvent,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {
  createTarget,
  describeWithEnvironment,
} from '../../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../../testing/MockConnection.js';
import {
  createContentProviderUISourceCode,
  createFakeScriptMapping,
  setupMockedUISourceCode,
} from '../../../testing/UISourceCodeHelpers.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../../ui/legacy/legacy.js';

import * as SourcesComponents from './components.js';

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
const GROUP_DIFFERENTIATOR_SELECTOR = '.group-header-differentiator';

const HELLO_JS_FILE = 'hello.js';
const TEST_JS_FILE = 'test.js';
const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

interface LocationTestData {
  url: Platform.DevToolsPath.UrlString;
  lineNumber: number;
  columnNumber: number;
  enabled: boolean;
  content: string;
  condition: Breakpoints.BreakpointManager.UserCondition;
  isLogpoint: boolean;
  hoverText?: string;
}

function createBreakpointLocations(testData: LocationTestData[]): Breakpoints.BreakpointManager.BreakpointLocation[] {
  const breakpointLocations = testData.map(data => {
    const mocked = setupMockedUISourceCode(data.url);
    const mockedContent =
        Promise.resolve(new TextUtils.ContentData.ContentData(data.content, /* isBase64 */ false, 'text/plain'));
    sinon.stub(mocked.sut, 'requestContentData').returns(mockedContent);
    const uiLocation = new Workspace.UISourceCode.UILocation(mocked.sut, data.lineNumber, data.columnNumber);
    const breakpoint = sinon.createStubInstance(Breakpoints.BreakpointManager.Breakpoint);
    breakpoint.enabled.returns(data.enabled);
    breakpoint.condition.returns(data.condition);
    breakpoint.isLogpoint.returns(data.isLogpoint);
    breakpoint.breakpointStorageId.returns(`${data.url}:${data.lineNumber}:${data.columnNumber}`);
    return new Breakpoints.BreakpointManager.BreakpointLocation(breakpoint, uiLocation);
  });
  return breakpointLocations;
}

function createStubBreakpointManagerAndSettings() {
  const breakpointManager = sinon.createStubInstance(Breakpoints.BreakpointManager.BreakpointManager);
  breakpointManager.supportsConditionalBreakpoints.returns(true);
  const dummyStorage = new Common.Settings.SettingsStorage({});
  const settings = Common.Settings.Settings.instance({
    forceNew: true,
    syncedStorage: dummyStorage,
    globalStorage: dummyStorage,
    localStorage: dummyStorage,
  });
  return {breakpointManager, settings};
}

function createStubBreakpointManagerAndSettingsWithMockdata(testData: LocationTestData[]): {
  breakpointManager: sinon.SinonStubbedInstance<Breakpoints.BreakpointManager.BreakpointManager>,
  settings: Common.Settings.Settings,
} {
  const {breakpointManager, settings} = createStubBreakpointManagerAndSettings();
  sinon.stub(Breakpoints.BreakpointManager.BreakpointManager, 'instance').returns(breakpointManager);
  const breakpointLocations = createBreakpointLocations(testData);
  breakpointManager.allBreakpointLocations.returns(breakpointLocations);
  return {breakpointManager, settings};
}

function createLocationTestData(
    url: string, lineNumber: number, columnNumber: number, enabled: boolean = true, content: string = '',
    condition: Breakpoints.BreakpointManager.UserCondition = Breakpoints.BreakpointManager.EMPTY_BREAKPOINT_CONDITION,
    isLogpoint: boolean = false, hoverText?: string): LocationTestData {
  return {
    url: url as Platform.DevToolsPath.UrlString,
    lineNumber,
    columnNumber,
    enabled,
    content,
    condition,
    isLogpoint,
    hoverText,
  };
}

async function setUpTestWithOneBreakpointLocation(
    params: {file: string, lineNumber: number, columnNumber: number, enabled?: boolean, snippet?: string} = {
      file: HELLO_JS_FILE,
      lineNumber: 10,
      columnNumber: 3,
      enabled: true,
      snippet: 'const a;',
    }) {
  const testData = [
    createLocationTestData(params.file, params.lineNumber, params.columnNumber, params.enabled, params.snippet),
  ];
  const {breakpointManager, settings} = createStubBreakpointManagerAndSettingsWithMockdata(testData);

  const controller = SourcesComponents.BreakpointsView.BreakpointsSidebarController.instance(
      {forceNew: true, breakpointManager, settings});
  const data = await controller.getUpdatedBreakpointViewData();

  assert.lengthOf(data.groups, 1);
  assert.lengthOf(data.groups[0].breakpointItems, 1);
  const locations = Breakpoints.BreakpointManager.BreakpointManager.instance().allBreakpointLocations();
  assert.lengthOf(locations, 1);
  return {controller, groups: data.groups, location: locations[0]};
}

class MockRevealer<T> implements Common.Revealer.Revealer<T> {
  async reveal(_revealable: T, _omitFocus?: boolean): Promise<void> {
  }
}

async function createAndInitializeBreakpointsView(): Promise<SourcesComponents.BreakpointsView.BreakpointsView> {
  // Force creation of a new BreakpointsView singleton so that it gets correctly re-wired with
  // the current controller singleton (to pick up the latest breakpoint state).
  const component = SourcesComponents.BreakpointsView.BreakpointsView.instance({forceNew: true});
  await coordinator.done();  // Wait until the initial rendering finishes.
  renderElementIntoDOM(component);
  return component;
}

async function renderNoBreakpoints(
    {pauseOnUncaughtExceptions, pauseOnCaughtExceptions, independentPauseToggles}:
        {pauseOnUncaughtExceptions: boolean, pauseOnCaughtExceptions: boolean, independentPauseToggles: boolean}):
    Promise<SourcesComponents.BreakpointsView.BreakpointsView> {
  const component = await createAndInitializeBreakpointsView();

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
    type: SDK.DebuggerModel.BreakpointType = SDK.DebuggerModel.BreakpointType.REGULAR_BREAKPOINT,
    hoverText?: string): Promise<{
  component: SourcesComponents.BreakpointsView.BreakpointsView,
  data: SourcesComponents.BreakpointsView.BreakpointsViewData,
}> {
  // Only provide a hover text if it's not a regular breakpoint.
  assert.isTrue(!hoverText || type !== SDK.DebuggerModel.BreakpointType.REGULAR_BREAKPOINT);
  const component = await createAndInitializeBreakpointsView();

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
  const component = await createAndInitializeBreakpointsView();

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
            type: SDK.DebuggerModel.BreakpointType.REGULAR_BREAKPOINT,
            location: '234',
            codeSnippet: 'const a = x;',
            isHit: false,
            status: SourcesComponents.BreakpointsView.BreakpointStatus.ENABLED,
          },
          {
            id: '2',
            type: SDK.DebuggerModel.BreakpointType.REGULAR_BREAKPOINT,
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
            type: SDK.DebuggerModel.BreakpointType.REGULAR_BREAKPOINT,
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
            type: SDK.DebuggerModel.BreakpointType.REGULAR_BREAKPOINT,
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
  assert.instanceOf(snippetElement, HTMLSpanElement);
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
    assert.instanceOf(renderedGroup, HTMLDetailsElement);
    const titleElement = renderedGroup.querySelector(GROUP_NAME_SELECTOR);
    assert.instanceOf(titleElement, HTMLSpanElement);
    assert.strictEqual(titleElement.textContent, breakpointGroups[i].name);
  }
}

function hover(component: SourcesComponents.BreakpointsView.BreakpointsView, selector: string): Promise<void> {
  assert.isNotNull(component.shadowRoot);
  // Dispatch a mouse over.
  component.shadowRoot.querySelector(selector)?.dispatchEvent(new Event('mouseover'));
  // Wait until the re-rendering has happened.
  return coordinator.done();
}

describeWithMockConnection('targetSupportsIndependentPauseOnExceptionToggles', () => {
  it('can correctly identify node targets as targets that are not supporting independent pause on exception toggles',
     async () => {
       const target = createTarget();
       target.markAsNodeJSForTest();
       const supportsIndependentPauses = SourcesComponents.BreakpointsView.BreakpointsSidebarController
                                             .targetSupportsIndependentPauseOnExceptionToggles();
       assert.isFalse(supportsIndependentPauses);
     });

  it('can correctly identify non-node targets as targets that are supporting independent pause on exception toggles',
     async () => {
       createTarget();
       const supportsIndependentPauses = SourcesComponents.BreakpointsView.BreakpointsSidebarController
                                             .targetSupportsIndependentPauseOnExceptionToggles();
       assert.isTrue(supportsIndependentPauses);
     });
});

describeWithEnvironment('BreakpointsSidebarController', () => {
  after(() => {
    SourcesComponents.BreakpointsView.BreakpointsSidebarController.removeInstance();
  });

  it('can remove a breakpoint', async () => {
    const {groups, location} = await setUpTestWithOneBreakpointLocation();
    const breakpoint = location.breakpoint as sinon.SinonStubbedInstance<Breakpoints.BreakpointManager.Breakpoint>;
    const breakpointItem = groups[0].breakpointItems[0];

    SourcesComponents.BreakpointsView.BreakpointsSidebarController.instance().breakpointsRemoved([breakpointItem]);
    assert.isTrue(breakpoint.remove.calledOnceWith(false));
  });

  it('changes breakpoint state', async () => {
    const {groups, location} = await setUpTestWithOneBreakpointLocation();
    const breakpointItem = groups[0].breakpointItems[0];
    assert.strictEqual(breakpointItem.status, SourcesComponents.BreakpointsView.BreakpointStatus.ENABLED);

    const breakpoint = location.breakpoint as sinon.SinonStubbedInstance<Breakpoints.BreakpointManager.Breakpoint>;
    SourcesComponents.BreakpointsView.BreakpointsSidebarController.instance().breakpointStateChanged(
        breakpointItem, false);
    assert.isTrue(breakpoint.setEnabled.calledWith(false));
  });

  it('correctly reveals source location', async () => {
    const {groups, location: {uiLocation}} = await setUpTestWithOneBreakpointLocation();
    const breakpointItem = groups[0].breakpointItems[0];
    const revealer = sinon.createStubInstance(MockRevealer<Workspace.UISourceCode.UILocation>);

    Common.Revealer.registerRevealer({
      contextTypes() {
        return [Workspace.UISourceCode.UILocation];
      },
      destination: Common.Revealer.RevealerDestination.SOURCES_PANEL,
      async loadRevealer() {
        return revealer;
      },
    });

    await SourcesComponents.BreakpointsView.BreakpointsSidebarController.instance().jumpToSource(breakpointItem);
    assert.isTrue(revealer.reveal.calledOnceWith(uiLocation));
  });

  it('correctly reveals breakpoint editor', async () => {
    const {groups, location} = await setUpTestWithOneBreakpointLocation();
    const breakpointItem = groups[0].breakpointItems[0];
    const revealer = sinon.createStubInstance(MockRevealer<Breakpoints.BreakpointManager.BreakpointLocation>);

    Common.Revealer.registerRevealer({
      contextTypes() {
        return [Breakpoints.BreakpointManager.BreakpointLocation];
      },
      destination: Common.Revealer.RevealerDestination.SOURCES_PANEL,
      async loadRevealer() {
        return revealer;
      },
    });

    await SourcesComponents.BreakpointsView.BreakpointsSidebarController.instance().breakpointEdited(
        breakpointItem, false /* editButtonClicked */);
    assert.isTrue(revealer.reveal.calledOnceWith(location));
  });

  describe('getUpdatedBreakpointViewData', () => {
    it('extracts breakpoint data', async () => {
      const testData = [
        createLocationTestData(HELLO_JS_FILE, 3, 10),
        createLocationTestData(TEST_JS_FILE, 1, 1),
      ];

      const {breakpointManager, settings} = createStubBreakpointManagerAndSettingsWithMockdata(testData);
      const controller = SourcesComponents.BreakpointsView.BreakpointsSidebarController.instance(
          {forceNew: true, breakpointManager, settings});
      const actual = await controller.getUpdatedBreakpointViewData();
      const createExpectedBreakpointGroups = (testData: LocationTestData) => {
        const status = testData.enabled ? SourcesComponents.BreakpointsView.BreakpointStatus.ENABLED :
                                          SourcesComponents.BreakpointsView.BreakpointStatus.DISABLED;
        let type = SDK.DebuggerModel.BreakpointType.REGULAR_BREAKPOINT;

        if (testData.condition) {
          if (testData.isLogpoint) {
            type = SDK.DebuggerModel.BreakpointType.LOGPOINT;
          } else {
            type = SDK.DebuggerModel.BreakpointType.CONDITIONAL_BREAKPOINT;
          }
        }

        return {
          name: testData.url as string,
          url: testData.url,
          editable: true,
          expanded: true,
          breakpointItems: [
            {
              id: `${testData.url}:${testData.lineNumber}:${testData.columnNumber}`,
              location: `${testData.lineNumber + 1}`,
              codeSnippet: '',
              isHit: false,
              status,
              type,
              hoverText: testData.hoverText,
            },
          ],
        };
      };
      const expected: SourcesComponents.BreakpointsView.BreakpointsViewData = {
        breakpointsActive: true,
        pauseOnUncaughtExceptions: false,
        pauseOnCaughtExceptions: false,
        independentPauseToggles: true,
        groups: testData.map(createExpectedBreakpointGroups),
      };
      assert.deepEqual(actual, expected);
    });

    it('respects the breakpointsActive setting', async () => {
      const {breakpointManager, settings} = createStubBreakpointManagerAndSettingsWithMockdata([]);
      const controller = SourcesComponents.BreakpointsView.BreakpointsSidebarController.instance(
          {forceNew: true, breakpointManager, settings});
      settings.moduleSetting('breakpoints-active').set(true);
      let data = await controller.getUpdatedBreakpointViewData();
      assert.strictEqual(data.breakpointsActive, true);
      settings.moduleSetting('breakpoints-active').set(false);
      data = await controller.getUpdatedBreakpointViewData();
      assert.strictEqual(data.breakpointsActive, false);
    });

    it('marks groups as editable based on conditional breakpoint support', async () => {
      const testData = [
        createLocationTestData(HELLO_JS_FILE, 3, 10),
        createLocationTestData(TEST_JS_FILE, 1, 1),
      ];

      const {breakpointManager, settings} = createStubBreakpointManagerAndSettingsWithMockdata(testData);
      const controller = SourcesComponents.BreakpointsView.BreakpointsSidebarController.instance(
          {forceNew: true, breakpointManager, settings});
      breakpointManager.supportsConditionalBreakpoints.returns(false);
      for (const group of (await controller.getUpdatedBreakpointViewData()).groups) {
        assert.isFalse(group.editable);
      }
      breakpointManager.supportsConditionalBreakpoints.returns(true);
      for (const group of (await controller.getUpdatedBreakpointViewData()).groups) {
        assert.isTrue(group.editable);
      }
    });

    it('groups breakpoints that are in the same file', async () => {
      const testData = [
        createLocationTestData(HELLO_JS_FILE, 3, 10),
        createLocationTestData(TEST_JS_FILE, 1, 1),
      ];

      const {breakpointManager, settings} = createStubBreakpointManagerAndSettingsWithMockdata(testData);
      const controller = SourcesComponents.BreakpointsView.BreakpointsSidebarController.instance(
          {forceNew: true, breakpointManager, settings});
      const actualViewData = await controller.getUpdatedBreakpointViewData();
      assert.lengthOf(actualViewData.groups, 2);
      assert.lengthOf(actualViewData.groups[0].breakpointItems, 1);
      assert.lengthOf(actualViewData.groups[1].breakpointItems, 1);
    });

    it('correctly sets the name of the group', async () => {
      const {groups} = await setUpTestWithOneBreakpointLocation(
          {file: HELLO_JS_FILE, lineNumber: 0, columnNumber: 0, enabled: false});
      assert.strictEqual(groups[0].name, HELLO_JS_FILE);
    });

    it('only extracts the line number as location if one breakpoint is on that line', async () => {
      const {groups} = await setUpTestWithOneBreakpointLocation(
          {file: HELLO_JS_FILE, lineNumber: 4, columnNumber: 0, enabled: false});
      assert.strictEqual(groups[0].breakpointItems[0].location, '5');
    });

    it('extracts the line number and column number as location if more than one breakpoint is on that line',
       async () => {
         const testData = [
           createLocationTestData(HELLO_JS_FILE, 3, 10),
           createLocationTestData(HELLO_JS_FILE, 3, 15),
         ];

         const {breakpointManager, settings} = createStubBreakpointManagerAndSettingsWithMockdata(testData);
         const controller = SourcesComponents.BreakpointsView.BreakpointsSidebarController.instance(
             {forceNew: true, breakpointManager, settings});
         const actualViewData = await controller.getUpdatedBreakpointViewData();
         assert.lengthOf(actualViewData.groups, 1);
         assert.lengthOf(actualViewData.groups[0].breakpointItems, 2);
         assert.strictEqual(actualViewData.groups[0].breakpointItems[0].location, '4:11');
         assert.strictEqual(actualViewData.groups[0].breakpointItems[1].location, '4:16');
       });

    it('orders breakpoints within a file by location', async () => {
      const testData = [
        createLocationTestData(HELLO_JS_FILE, 3, 15),
        createLocationTestData(HELLO_JS_FILE, 3, 10),
      ];

      const {breakpointManager, settings} = createStubBreakpointManagerAndSettingsWithMockdata(testData);
      const controller = SourcesComponents.BreakpointsView.BreakpointsSidebarController.instance(
          {forceNew: true, breakpointManager, settings});
      const actualViewData = await controller.getUpdatedBreakpointViewData();
      assert.lengthOf(actualViewData.groups, 1);
      assert.lengthOf(actualViewData.groups[0].breakpointItems, 2);
      assert.strictEqual(actualViewData.groups[0].breakpointItems[0].location, '4:11');
      assert.strictEqual(actualViewData.groups[0].breakpointItems[1].location, '4:16');
    });

    it('orders breakpoints within groups by location', async () => {
      const testData = [
        createLocationTestData(TEST_JS_FILE, 3, 15),
        createLocationTestData(HELLO_JS_FILE, 3, 10),
      ];

      const {breakpointManager, settings} = createStubBreakpointManagerAndSettingsWithMockdata(testData);
      const controller = SourcesComponents.BreakpointsView.BreakpointsSidebarController.instance(
          {forceNew: true, breakpointManager, settings});
      const actualViewData = await controller.getUpdatedBreakpointViewData();
      assert.lengthOf(actualViewData.groups, 2);
      const names = actualViewData.groups.map(group => group.name);
      assert.deepEqual(names, [HELLO_JS_FILE, TEST_JS_FILE]);
    });

    it('merges breakpoints mapping to the same location into one', async () => {
      const testData = [
        createLocationTestData(TEST_JS_FILE, 3, 15),
        createLocationTestData(TEST_JS_FILE, 3, 15),
      ];

      const {breakpointManager, settings} = createStubBreakpointManagerAndSettingsWithMockdata(testData);
      const controller = SourcesComponents.BreakpointsView.BreakpointsSidebarController.instance(
          {forceNew: true, breakpointManager, settings});
      const actualViewData = await controller.getUpdatedBreakpointViewData();
      assert.lengthOf(actualViewData.groups, 1);
      assert.lengthOf(actualViewData.groups[0].breakpointItems, 1);
    });

    it('correctly extracts the enabled state', async () => {
      const {groups} =
          await setUpTestWithOneBreakpointLocation({file: '', lineNumber: 0, columnNumber: 0, enabled: true});
      const breakpointItem = groups[0].breakpointItems[0];
      assert.strictEqual(breakpointItem.status, SourcesComponents.BreakpointsView.BreakpointStatus.ENABLED);
    });

    it('correctly extracts the enabled state', async () => {
      const {groups} =
          await setUpTestWithOneBreakpointLocation({file: '', lineNumber: 0, columnNumber: 0, enabled: false});
      const breakpointItem = groups[0].breakpointItems[0];
      assert.strictEqual(breakpointItem.status, SourcesComponents.BreakpointsView.BreakpointStatus.DISABLED);
    });

    it('correctly extracts the enabled state', async () => {
      const testData = [
        createLocationTestData(TEST_JS_FILE, 3, 15, true /* enabled */),
        createLocationTestData(TEST_JS_FILE, 3, 15, false /* enabled */),
      ];

      const {breakpointManager, settings} = createStubBreakpointManagerAndSettingsWithMockdata(testData);
      const controller = SourcesComponents.BreakpointsView.BreakpointsSidebarController.instance(
          {forceNew: true, breakpointManager, settings});
      const actualViewData = await controller.getUpdatedBreakpointViewData();
      assert.lengthOf(actualViewData.groups, 1);
      assert.lengthOf(actualViewData.groups[0].breakpointItems, 1);
      assert.strictEqual(
          actualViewData.groups[0].breakpointItems[0].status,
          SourcesComponents.BreakpointsView.BreakpointStatus.INDETERMINATE);
    });

    it('correctly extracts the disabled state', async () => {
      const snippet = 'const a = x;';
      const {groups} =
          await setUpTestWithOneBreakpointLocation({file: '', lineNumber: 0, columnNumber: 0, enabled: false, snippet});
      assert.strictEqual(groups[0].breakpointItems[0].codeSnippet, snippet);
    });

    it('correctly extracts the indeterminate state', async () => {
      const testData = [
        createLocationTestData(TEST_JS_FILE, 3, 15, true /* enabled */),
        createLocationTestData(TEST_JS_FILE, 3, 15, false /* enabled */),
      ];

      const {breakpointManager, settings} = createStubBreakpointManagerAndSettingsWithMockdata(testData);
      const controller = SourcesComponents.BreakpointsView.BreakpointsSidebarController.instance(
          {forceNew: true, breakpointManager, settings});
      const actualViewData = await controller.getUpdatedBreakpointViewData();
      assert.lengthOf(actualViewData.groups, 1);
      assert.lengthOf(actualViewData.groups[0].breakpointItems, 1);
      assert.strictEqual(
          actualViewData.groups[0].breakpointItems[0].status,
          SourcesComponents.BreakpointsView.BreakpointStatus.INDETERMINATE);
    });

    it('correctly extracts conditional breakpoints', async () => {
      const condition = 'x < a' as Breakpoints.BreakpointManager.UserCondition;
      const testData = [
        createLocationTestData(
            TEST_JS_FILE, 3, 15, true /* enabled */, '', condition, false /* isLogpoint */, condition),
      ];

      const {breakpointManager, settings} = createStubBreakpointManagerAndSettingsWithMockdata(testData);
      const controller = SourcesComponents.BreakpointsView.BreakpointsSidebarController.instance(
          {forceNew: true, breakpointManager, settings});
      const actualViewData = await controller.getUpdatedBreakpointViewData();
      assert.lengthOf(actualViewData.groups, 1);
      assert.lengthOf(actualViewData.groups[0].breakpointItems, 1);
      const breakpointItem = actualViewData.groups[0].breakpointItems[0];
      assert.strictEqual(breakpointItem.type, SDK.DebuggerModel.BreakpointType.CONDITIONAL_BREAKPOINT);
      assert.strictEqual(breakpointItem.hoverText, condition);
    });

    it('correctly extracts logpoints', async () => {
      const logExpression = 'x' as Breakpoints.BreakpointManager.UserCondition;
      const testData = [
        createLocationTestData(
            TEST_JS_FILE, 3, 15, true /* enabled */, '', logExpression, true /* isLogpoint */, logExpression),
      ];

      const {breakpointManager, settings} = createStubBreakpointManagerAndSettingsWithMockdata(testData);
      const controller = SourcesComponents.BreakpointsView.BreakpointsSidebarController.instance(
          {forceNew: true, breakpointManager, settings});
      const actualViewData = await controller.getUpdatedBreakpointViewData();
      assert.lengthOf(actualViewData.groups, 1);
      assert.lengthOf(actualViewData.groups[0].breakpointItems, 1);
      const breakpointItem = actualViewData.groups[0].breakpointItems[0];
      assert.strictEqual(breakpointItem.type, SDK.DebuggerModel.BreakpointType.LOGPOINT);
      assert.strictEqual(breakpointItem.hoverText, logExpression);
    });

    describe('breakpoint groups', () => {
      it('are expanded by default', async () => {
        const {controller} = await setUpTestWithOneBreakpointLocation();
        const actualViewData = await controller.getUpdatedBreakpointViewData();
        assert.isTrue(actualViewData.groups[0].expanded);
      });

      it('are collapsed if user collapses it', async () => {
        const {controller, groups} = await setUpTestWithOneBreakpointLocation();
        controller.expandedStateChanged(groups[0].url, false /* expanded */);
        const actualViewData = await controller.getUpdatedBreakpointViewData();
        assert.isFalse(actualViewData.groups[0].expanded);
      });

      it('are expanded if user expands it', async () => {
        const {controller, groups} = await setUpTestWithOneBreakpointLocation();
        controller.expandedStateChanged(groups[0].url, true /* expanded */);
        const actualViewData = await controller.getUpdatedBreakpointViewData();
        assert.isTrue(actualViewData.groups[0].expanded);
      });

      it('remember the collapsed state', async () => {
        {
          const {controller, groups} = await setUpTestWithOneBreakpointLocation();
          controller.expandedStateChanged(groups[0].url, false /* expanded */);
          const actualViewData = await controller.getUpdatedBreakpointViewData();
          assert.isFalse(actualViewData.groups[0].expanded);
        }

        // A new controller is created and initialized with the expanded settings.
        {const breakpointManager = Breakpoints.BreakpointManager.BreakpointManager.instance();
         const settings = Common.Settings.Settings.instance();
         const controller = SourcesComponents.BreakpointsView.BreakpointsSidebarController.instance({
           forceNew: true,
           breakpointManager,
           settings,
         });
         const actualViewData = await controller.getUpdatedBreakpointViewData();
         assert.isFalse(actualViewData.groups[0].expanded);}
      });

      it('remember the expanded state', async () => {
        {
          const {controller, groups} = await setUpTestWithOneBreakpointLocation();
          controller.expandedStateChanged(groups[0].url, true /* expanded */);
          const actualViewData = await controller.getUpdatedBreakpointViewData();
          assert.isTrue(actualViewData.groups[0].expanded);
        }
        // A new controller is created and initialized with the expanded settings.
        {

            const controller = SourcesComponents.BreakpointsView.BreakpointsSidebarController.instance({
              forceNew: true,
              breakpointManager: Breakpoints.BreakpointManager.BreakpointManager.instance(),
              settings: Common.Settings.Settings.instance(),
            });
            const actualViewData = await controller.getUpdatedBreakpointViewData();
            assert.isTrue(actualViewData.groups[0].expanded);

        }
      });
    });
  });
});

describeWithMockConnection('BreakpointsSidebarController', () => {
  beforeEach(() => {
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
    });
    Breakpoints.BreakpointManager.BreakpointManager.instance(
        {forceNew: true, targetManager, workspace, debuggerWorkspaceBinding});
  });

  const DEFAULT_BREAKPOINT:
      [Breakpoints.BreakpointManager.UserCondition, boolean, boolean, Breakpoints.BreakpointManager.BreakpointOrigin] =
          [
            Breakpoints.BreakpointManager.EMPTY_BREAKPOINT_CONDITION,
            true,   // enabled
            false,  // isLogpoint
            Breakpoints.BreakpointManager.BreakpointOrigin.USER_ACTION,
          ];

  // Flaky
  it.skip('[crbug.com/345456307] auto-expands if a user adds a new  breakpoint', async () => {
    const breakpointManager = Breakpoints.BreakpointManager.BreakpointManager.instance();
    const settings = Common.Settings.Settings.instance();
    const {uiSourceCode, project} = createContentProviderUISourceCode(
        {url: 'test.js' as Platform.DevToolsPath.UrlString, mimeType: 'text/javascript'});
    const controller = SourcesComponents.BreakpointsView.BreakpointsSidebarController.instance(
        {forceNew: true, breakpointManager, settings});

    // Add one breakpoint and collapse the tree.
    const b1 = await breakpointManager.setBreakpoint(uiSourceCode, 0, 0, ...DEFAULT_BREAKPOINT);
    assert.exists(b1);
    {
      controller.expandedStateChanged(uiSourceCode.url(), false /* expanded */);
      const data = await controller.getUpdatedBreakpointViewData();
      assert.lengthOf(data.groups, 1);
      assert.lengthOf(data.groups[0].breakpointItems, 1);
      assert.isFalse(data.groups[0].expanded);
    }

    // Add a new breakpoint and check if it's expanded as expected.
    const b2 = await breakpointManager.setBreakpoint(uiSourceCode, 0, 3, ...DEFAULT_BREAKPOINT);
    assert.exists(b2);
    {
      const data = await controller.getUpdatedBreakpointViewData();
      assert.lengthOf(data.groups, 1);
      assert.lengthOf(data.groups[0].breakpointItems, 2);
      assert.isTrue(data.groups[0].expanded);
    }

    // Clean up.
    await b1.remove(false /* keepInStorage */);
    await b2.remove(false /* keepInStorage */);
    Workspace.Workspace.WorkspaceImpl.instance().removeProject(project);
  });

  it('does not auto-expand if a breakpoint was not triggered by user action', async () => {
    const breakpointManager = Breakpoints.BreakpointManager.BreakpointManager.instance();
    const settings = Common.Settings.Settings.instance();
    const {uiSourceCode, project} = createContentProviderUISourceCode(
        {url: 'test.js' as Platform.DevToolsPath.UrlString, mimeType: 'text/javascript'});
    const controller = SourcesComponents.BreakpointsView.BreakpointsSidebarController.instance(
        {forceNew: true, breakpointManager, settings});

    // Add one breakpoint and collapse the tree.
    const b1 = await breakpointManager.setBreakpoint(uiSourceCode, 0, 0, ...DEFAULT_BREAKPOINT);
    assert.exists(b1);
    {
      controller.expandedStateChanged(uiSourceCode.url(), false /* expanded */);
      const data = await controller.getUpdatedBreakpointViewData();
      assert.lengthOf(data.groups, 1);
      assert.lengthOf(data.groups[0].breakpointItems, 1);
      assert.isFalse(data.groups[0].expanded);
    }

    // Add a new non-user triggered breakpoint and check if it's still collapsed.
    const b2 = await breakpointManager.setBreakpoint(
        uiSourceCode, 0, 3, Breakpoints.BreakpointManager.EMPTY_BREAKPOINT_CONDITION, true, false,
        Breakpoints.BreakpointManager.BreakpointOrigin.OTHER);
    assert.exists(b2);
    {
      const data = await controller.getUpdatedBreakpointViewData();
      assert.lengthOf(data.groups, 1);
      assert.lengthOf(data.groups[0].breakpointItems, 2);
      assert.isFalse(data.groups[0].expanded);
    }

    // Clean up.
    await b1.remove(false /* keepInStorage */);
    await b2.remove(false /* keepInStorage */);
    Workspace.Workspace.WorkspaceImpl.instance().removeProject(project);
  });

  it('auto-expands if a breakpoint was hit', async () => {
    sinon.stub(
        Common.Revealer.RevealerRegistry.instance(),
        'reveal');  // Prevent pending reveal promises after tests are done.

    const breakpointManager = Breakpoints.BreakpointManager.BreakpointManager.instance();

    // Set up sdk and ui location, and a mapping between them, such that we can identify that
    // the hit breakpoint is the one we are adding.
    const scriptId = '0' as Protocol.Runtime.ScriptId;

    const {uiSourceCode, project} = createContentProviderUISourceCode(
        {url: 'test.js' as Platform.DevToolsPath.UrlString, mimeType: 'text/javascript'});
    const uiLocation = new Workspace.UISourceCode.UILocation(uiSourceCode, 0, 0);

    const debuggerModel = sinon.createStubInstance(SDK.DebuggerModel.DebuggerModel);
    const sdkLocation = new SDK.DebuggerModel.Location(debuggerModel, scriptId, 0);

    const mapping = createFakeScriptMapping(debuggerModel, uiSourceCode, 0, scriptId);
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().addSourceMapping(mapping);

    // Add one breakpoint and collapse its group.
    const b1 = await breakpointManager.setBreakpoint(
        uiSourceCode, uiLocation.lineNumber, uiLocation.columnNumber, ...DEFAULT_BREAKPOINT);
    const controller = SourcesComponents.BreakpointsView.BreakpointsSidebarController.instance(
        {forceNew: true, breakpointManager, settings: Common.Settings.Settings.instance()});
    assert.exists(b1);
    controller.expandedStateChanged(uiSourceCode.url(), false /* expanded */);

    // Double check that the group is collapsed.
    {
      const data = await controller.getUpdatedBreakpointViewData();
      assert.isFalse(data.groups[0].expanded);
    }

    // Simulating a breakpoint hit. Update the DebuggerPausedDetails to contain the info on the hit breakpoint.
    const callFrame = sinon.createStubInstance(SDK.DebuggerModel.CallFrame);
    callFrame.location.returns(new SDK.DebuggerModel.Location(debuggerModel, scriptId, sdkLocation.lineNumber));
    const pausedDetails = sinon.createStubInstance(SDK.DebuggerModel.DebuggerPausedDetails);
    pausedDetails.callFrames = [callFrame];

    // Instead of setting the flavor, directly call `flavorChanged` on the controller and mock what it's set to.
    // Setting the flavor would have other listeners listening to it, and would cause undesirable side effects.
    sinon.stub(UI.Context.Context.instance(), 'flavor')
        .callsFake(flavorType => flavorType === SDK.DebuggerModel.DebuggerPausedDetails ? pausedDetails : null);
    controller.flavorChanged(pausedDetails);
    {
      const data = await controller.getUpdatedBreakpointViewData();
      // Assert that the breakpoint is hit and the group is expanded.
      assert.isTrue(data.groups[0].breakpointItems[0].isHit);
      assert.isTrue(data.groups[0].expanded);
    }

    // Clean up.
    await b1.remove(false /* keepInStorage */);
    Workspace.Workspace.WorkspaceImpl.instance().removeProject(project);
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().removeSourceMapping(mapping);
  });

  it('changes pause on exception state', async () => {
    const {breakpointManager, settings} = createStubBreakpointManagerAndSettings();
    breakpointManager.allBreakpointLocations.returns([]);
    const controller = SourcesComponents.BreakpointsView.BreakpointsSidebarController.instance(
        {forceNew: true, breakpointManager, settings});
    for (const pauseOnUncaughtExceptions of [true, false]) {
      for (const pauseOnCaughtExceptions of [true, false]) {
        controller.setPauseOnUncaughtExceptions(pauseOnUncaughtExceptions);
        controller.setPauseOnCaughtExceptions(pauseOnCaughtExceptions);

        const data = await controller.getUpdatedBreakpointViewData();
        assert.strictEqual(data.pauseOnUncaughtExceptions, pauseOnUncaughtExceptions);
        assert.strictEqual(data.pauseOnCaughtExceptions, pauseOnCaughtExceptions);
        assert.strictEqual(settings.moduleSetting('pause-on-uncaught-exception').get(), pauseOnUncaughtExceptions);
        assert.strictEqual(settings.moduleSetting('pause-on-caught-exception').get(), pauseOnCaughtExceptions);
      }
    }
  });
});

describeWithMockConnection('BreakpointsView', () => {
  beforeEach(() => {
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
    });
    Breakpoints.BreakpointManager.BreakpointManager.instance(
        {forceNew: true, targetManager, workspace, debuggerWorkspaceBinding});
  });

  it('correctly expands breakpoint groups', async () => {
    const {component, data} = await renderMultipleBreakpoints();
    assert.isNotNull(component.shadowRoot);

    const expandedGroups = data.groups.filter(group => group.expanded);
    assert.isAbove(expandedGroups.length, 0);

    const renderedExpandedGroups = Array.from(component.shadowRoot.querySelectorAll(EXPANDED_GROUPS_SELECTOR));
    assert.lengthOf(renderedExpandedGroups, expandedGroups.length);

    checkGroupNames(renderedExpandedGroups, expandedGroups);
  });

  it('correctly collapses breakpoint groups', async () => {
    const {component, data} = await renderMultipleBreakpoints();
    assert.isNotNull(component.shadowRoot);

    const collapsedGroups = data.groups.filter(group => !group.expanded);
    assert.isAbove(collapsedGroups.length, 0);

    const renderedCollapsedGroups = Array.from(component.shadowRoot.querySelectorAll(COLLAPSED_GROUPS_SELECTOR));

    checkGroupNames(renderedCollapsedGroups, collapsedGroups);
  });

  it('renders the group names', async () => {
    const {component, data} = await renderMultipleBreakpoints();
    assert.isNotNull(component.shadowRoot);

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
    assert.isNotNull(component.shadowRoot);

    const renderedBreakpointItems = Array.from(component.shadowRoot.querySelectorAll(BREAKPOINT_ITEM_SELECTOR));

    const breakpointItems = extractBreakpointItems(data);
    assert.lengthOf(renderedBreakpointItems, breakpointItems.length);

    for (let i = 0; i < renderedBreakpointItems.length; ++i) {
      const renderedItem = renderedBreakpointItems[i];
      assert.instanceOf(renderedItem, HTMLDivElement);

      const inputElement = renderedItem.querySelector('input');
      assert.instanceOf(inputElement, HTMLInputElement);
      checkCheckboxState(inputElement, breakpointItems[i]);
    }
  });

  it('renders breakpoints with their code snippet', async () => {
    const {component, data} = await renderMultipleBreakpoints();
    assert.isNotNull(component.shadowRoot);

    const renderedBreakpointItems = Array.from(component.shadowRoot.querySelectorAll(BREAKPOINT_ITEM_SELECTOR));

    const breakpointItems = extractBreakpointItems(data);
    assert.lengthOf(renderedBreakpointItems, breakpointItems.length);

    for (let i = 0; i < renderedBreakpointItems.length; ++i) {
      const renderedBreakpointItem = renderedBreakpointItems[i];
      assert.instanceOf(renderedBreakpointItem, HTMLDivElement);
      checkCodeSnippet(renderedBreakpointItem, breakpointItems[i]);
    }
  });

  it('renders breakpoint groups with a differentiator if the file names are not unique', async () => {
    const component = await createAndInitializeBreakpointsView();

    const groupTemplate = {
      name: 'index.js',
      url: '' as Platform.DevToolsPath.UrlString,
      editable: true,
      expanded: true,
      breakpointItems: [
        {
          id: '1',
          type: SDK.DebuggerModel.BreakpointType.REGULAR_BREAKPOINT,
          location: '234',
          codeSnippet: 'const a = x;',
          isHit: false,
          status: SourcesComponents.BreakpointsView.BreakpointStatus.ENABLED,
        },
      ],
    };

    // Create two groups with the same file name, but different url.
    const group1 = {...groupTemplate};
    group1.url = 'https://google.com/lib/index.js' as Platform.DevToolsPath.UrlString;

    const group2 = {...groupTemplate};
    group2.url = 'https://google.com/src/index.js' as Platform.DevToolsPath.UrlString;

    const data: SourcesComponents.BreakpointsView.BreakpointsViewData = {
      breakpointsActive: true,
      pauseOnUncaughtExceptions: false,
      pauseOnCaughtExceptions: false,
      independentPauseToggles: true,
      groups: [
        group1,
        group2,
      ],
    };
    component.data = data;
    await coordinator.done();

    assert.isNotNull(component.shadowRoot);
    const groupSummaries = Array.from(component.shadowRoot.querySelectorAll(SUMMARY_SELECTOR));
    const differentiatingPath = groupSummaries.map(group => {
      const differentiatorElement = group.querySelector(GROUP_DIFFERENTIATOR_SELECTOR);
      assert.instanceOf(differentiatorElement, HTMLSpanElement);
      return differentiatorElement.textContent;
    });
    assert.deepEqual(differentiatingPath, ['lib/', 'src/']);
  });

  it('renders breakpoints with a differentiating path', async () => {
    const {component, data} = await renderMultipleBreakpoints();
    assert.isNotNull(component.shadowRoot);

    const renderedBreakpointItems = Array.from(component.shadowRoot.querySelectorAll(BREAKPOINT_ITEM_SELECTOR));

    const breakpointItems = extractBreakpointItems(data);
    assert.lengthOf(renderedBreakpointItems, breakpointItems.length);

    for (let i = 0; i < renderedBreakpointItems.length; ++i) {
      const renderedBreakpointItem = renderedBreakpointItems[i];
      assert.instanceOf(renderedBreakpointItem, HTMLDivElement);

      const locationElement = renderedBreakpointItem.querySelector(BREAKPOINT_LOCATION_SELECTOR);
      assert.instanceOf(locationElement, HTMLSpanElement);

      const actualLocation = locationElement.textContent;
      const expectedLocation = breakpointItems[i].location;

      assert.strictEqual(actualLocation, expectedLocation);
    }
  });

  it('triggers an event on clicking the checkbox of a breakpoint', async () => {
    const {component, data} = await renderSingleBreakpoint();
    assert.isNotNull(component.shadowRoot);

    const renderedItem = component.shadowRoot.querySelector(BREAKPOINT_ITEM_SELECTOR);
    assert.instanceOf(renderedItem, HTMLDivElement);

    const checkbox = renderedItem.querySelector('input');
    assert.instanceOf(checkbox, HTMLInputElement);
    const checked = checkbox.checked;

    const controller = SourcesComponents.BreakpointsView.BreakpointsSidebarController.instance();
    const breakpointStateChanged = sinon.stub(controller, 'breakpointStateChanged');
    checkbox.click();

    assert.isTrue(breakpointStateChanged.calledOnceWith(data.groups[0].breakpointItems[0], !checked));
  });

  it('triggers an event on clicking on the snippet text', async () => {
    const {component, data} = await renderSingleBreakpoint();
    assert.isNotNull(component.shadowRoot);

    const snippet = component.shadowRoot.querySelector(CODE_SNIPPET_SELECTOR);
    assert.instanceOf(snippet, HTMLSpanElement);

    const controller = SourcesComponents.BreakpointsView.BreakpointsSidebarController.instance();
    const jumpToSource = sinon.stub(controller, 'jumpToSource');
    snippet.click();

    assert.isTrue(jumpToSource.calledOnceWith(data.groups[0].breakpointItems[0]));
  });

  it('triggers an event on expanding/unexpanding', async () => {
    const {component, data} = await renderSingleBreakpoint();
    assert.isNotNull(component.shadowRoot);

    const renderedGroupName = component.shadowRoot.querySelector(GROUP_NAME_SELECTOR);
    assert.instanceOf(renderedGroupName, HTMLSpanElement);

    const expandedInitialValue = data.groups[0].expanded;

    const controller = SourcesComponents.BreakpointsView.BreakpointsSidebarController.instance();
    const expandedStateChanged = sinon.stub(controller, 'expandedStateChanged');
    renderedGroupName.click();

    await new Promise(resolve => setTimeout(resolve, 0));
    const group = data.groups[0];
    assert.isTrue(expandedStateChanged.calledOnceWith(group.url, group.expanded));
    assert.notStrictEqual(group.expanded, expandedInitialValue);
  });

  it('highlights breakpoint if it is set to be hit', async () => {
    const {component} = await renderSingleBreakpoint();
    assert.isNotNull(component.shadowRoot);

    const renderedBreakpointItem = component.shadowRoot.querySelector(HIT_BREAKPOINT_SELECTOR);
    assert.instanceOf(renderedBreakpointItem, HTMLDivElement);
  });

  it('triggers an event on removing file breakpoints', async () => {
    const {component, data} = await renderMultipleBreakpoints();
    assert.isNotNull(component.shadowRoot);

    await hover(component, SUMMARY_SELECTOR);

    const removeFileBreakpointsButton = component.shadowRoot.querySelector(REMOVE_FILE_BREAKPOINTS_SELECTOR);
    assert.instanceOf(removeFileBreakpointsButton, HTMLButtonElement);

    const controller = SourcesComponents.BreakpointsView.BreakpointsSidebarController.instance();
    const breakpointsRemoved = sinon.stub(controller, 'breakpointsRemoved');
    removeFileBreakpointsButton.click();
    // await new Promise(resolve => setTimeout(resolve, 0));
    assert.isTrue(breakpointsRemoved.calledOnceWith(data.groups[0].breakpointItems));
  });

  it('triggers an event on removing one breakpoint', async () => {
    const {component, data} = await renderMultipleBreakpoints();
    assert.isNotNull(component.shadowRoot);

    await hover(component, BREAKPOINT_ITEM_SELECTOR);

    const removeFileBreakpointsButton = component.shadowRoot.querySelector(REMOVE_SINGLE_BREAKPOINT_SELECTOR);
    assert.instanceOf(removeFileBreakpointsButton, HTMLButtonElement);

    const controller = SourcesComponents.BreakpointsView.BreakpointsSidebarController.instance();
    const breakpointsRemoved = sinon.stub(controller, 'breakpointsRemoved');
    removeFileBreakpointsButton.click();
    // await new Promise(resolve => setTimeout(resolve, 0));
    assert.isTrue(breakpointsRemoved.calledOnce);
    assert.deepEqual(breakpointsRemoved.firstCall.firstArg, [data.groups[0].breakpointItems[0]]);
  });

  it('triggers an event on editing one breakpoint', async () => {
    const {component, data} = await renderMultipleBreakpoints();
    assert.isNotNull(component.shadowRoot);

    await hover(component, BREAKPOINT_ITEM_SELECTOR);

    const editBreakpointButton = component.shadowRoot.querySelector(EDIT_SINGLE_BREAKPOINT_SELECTOR);
    assert.instanceOf(editBreakpointButton, HTMLButtonElement);

    const controller = SourcesComponents.BreakpointsView.BreakpointsSidebarController.instance();
    const breakpointEdited = sinon.stub(controller, 'breakpointEdited');
    editBreakpointButton.click();
    // await new Promise(resolve => setTimeout(resolve, 0));
    assert.isTrue(breakpointEdited.calledOnceWith(data.groups[0].breakpointItems[0], true));
  });

  it('shows a tooltip with edit condition on regular breakpoints', async () => {
    const {component} = await renderSingleBreakpoint(SDK.DebuggerModel.BreakpointType.REGULAR_BREAKPOINT);
    assert.isNotNull(component.shadowRoot);

    await hover(component, BREAKPOINT_ITEM_SELECTOR);

    const editBreakpointButton = component.shadowRoot.querySelector(EDIT_SINGLE_BREAKPOINT_SELECTOR);
    assert.instanceOf(editBreakpointButton, HTMLButtonElement);

    assert.strictEqual(editBreakpointButton.title, 'Edit condition');
  });

  describe('group checkboxes', () => {
    async function waitForCheckboxToggledEventsWithCheckedUpdate(
        component: SourcesComponents.BreakpointsView.BreakpointsView, numBreakpointItems: number, checked: boolean) {
      return new Promise<void>(resolve => {
        let numCheckboxToggledEvents = 0;
        const controller = SourcesComponents.BreakpointsView.BreakpointsSidebarController.instance();
        sinon.stub(controller, 'breakpointStateChanged').callsFake((_, checkedArg) => {
          assert.strictEqual(checkedArg, checked);
          ++numCheckboxToggledEvents;
          if (numCheckboxToggledEvents === numBreakpointItems) {
            resolve();
          }
        });
      });
    }
    it('show a checked group checkbox if at least one breakpoint in that group is enabled', async () => {
      const {component, data} = await renderMultipleBreakpoints();

      // Make sure that at least one breakpoint is enabled.
      data.groups[0].breakpointItems[0].status = SourcesComponents.BreakpointsView.BreakpointStatus.ENABLED;
      component.data = data;
      await coordinator.done();

      await hover(component, SUMMARY_SELECTOR);

      assert.isNotNull(component.shadowRoot);
      const firstGroupSummary = component.shadowRoot.querySelector(SUMMARY_SELECTOR);
      assert.exists(firstGroupSummary);
      const groupCheckbox = firstGroupSummary.querySelector('input');
      assert.instanceOf(groupCheckbox, HTMLInputElement);

      assert.isTrue(groupCheckbox.checked);
    });

    it('show an unchecked group checkbox if no breakpoint in that group is enabled', async () => {
      const {component, data} = await renderMultipleBreakpoints();

      // Make sure that all breakpoints are disabled.
      const breakpointItems = data.groups[0].breakpointItems;
      for (let i = 0; i < breakpointItems.length; ++i) {
        breakpointItems[i].status = SourcesComponents.BreakpointsView.BreakpointStatus.DISABLED;
      }

      component.data = data;
      await coordinator.done();

      await hover(component, SUMMARY_SELECTOR);

      assert.isNotNull(component.shadowRoot);
      const firstGroupSummary = component.shadowRoot.querySelector(SUMMARY_SELECTOR);
      assert.exists(firstGroupSummary);
      const groupCheckbox = firstGroupSummary.querySelector('input');
      assert.instanceOf(groupCheckbox, HTMLInputElement);

      assert.isFalse(groupCheckbox.checked);
    });

    it('disable all breakpoints on unchecking', async () => {
      const {component, data} = await renderMultipleBreakpoints();

      const numBreakpointItems = data.groups[0].breakpointItems.length;
      assert.isTrue(numBreakpointItems > 1);

      // Make sure that all breakpoints are enabled.
      for (let i = 0; i < numBreakpointItems; ++i) {
        data.groups[0].breakpointItems[i].status = SourcesComponents.BreakpointsView.BreakpointStatus.ENABLED;
      }
      component.data = data;
      await coordinator.done();

      await hover(component, SUMMARY_SELECTOR);

      // Uncheck the group checkbox.
      assert.isNotNull(component.shadowRoot);
      const firstGroupSummary = component.shadowRoot.querySelector(SUMMARY_SELECTOR);
      assert.exists(firstGroupSummary);
      const groupCheckbox = firstGroupSummary.querySelector('input');
      assert.instanceOf(groupCheckbox, HTMLInputElement);

      // Wait until we receive all events fired that notify us of disabled breakpoints.
      const waitForEventPromise = waitForCheckboxToggledEventsWithCheckedUpdate(component, numBreakpointItems, false);

      groupCheckbox.click();
      await waitForEventPromise;
    });

    it('enable all breakpoints on unchecking', async () => {
      const {component, data} = await renderMultipleBreakpoints();

      const numBreakpointItems = data.groups[0].breakpointItems.length;
      assert.isTrue(numBreakpointItems > 1);

      // Make sure that all breakpoints are disabled.
      for (let i = 0; i < numBreakpointItems; ++i) {
        data.groups[0].breakpointItems[i].status = SourcesComponents.BreakpointsView.BreakpointStatus.DISABLED;
      }
      component.data = data;
      await coordinator.done();

      await hover(component, SUMMARY_SELECTOR);

      // Uncheck the group checkbox.
      assert.isNotNull(component.shadowRoot);
      const firstGroupSummary = component.shadowRoot.querySelector(SUMMARY_SELECTOR);
      assert.exists(firstGroupSummary);
      const groupCheckbox = firstGroupSummary.querySelector('input');
      assert.instanceOf(groupCheckbox, HTMLInputElement);

      // Wait until we receive all events fired that notify us of enabled breakpoints.
      const waitForEventPromise = waitForCheckboxToggledEventsWithCheckedUpdate(component, numBreakpointItems, true);

      groupCheckbox.click();
      await waitForEventPromise;
    });
  });

  it('only renders edit button for breakpoints in editable groups', async () => {
    const component = await createAndInitializeBreakpointsView();

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
              type: SDK.DebuggerModel.BreakpointType.REGULAR_BREAKPOINT,
            },
          ],
        },
      ],
    };

    component.data = data;
    await coordinator.done();
    assert.isNotNull(component.shadowRoot);

    await hover(component, BREAKPOINT_ITEM_SELECTOR);

    const editBreakpointButton = component.shadowRoot.querySelector(EDIT_SINGLE_BREAKPOINT_SELECTOR);
    assert.isNull(editBreakpointButton);
  });

  it('initializes data from the controller on construction', async () => {
    await setUpTestWithOneBreakpointLocation();
    const component = await createAndInitializeBreakpointsView();
    const renderedGroupName = component.shadowRoot?.querySelector(GROUP_NAME_SELECTOR);
    assert.strictEqual(renderedGroupName?.textContent, HELLO_JS_FILE);
  });

  describe('conditional breakpoints', () => {
    const breakpointDetails = 'x < a';

    it('are rendered', async () => {
      const {component} =
          await renderSingleBreakpoint(SDK.DebuggerModel.BreakpointType.CONDITIONAL_BREAKPOINT, breakpointDetails);
      const breakpointItem = component.shadowRoot?.querySelector(BREAKPOINT_ITEM_SELECTOR);
      assert.exists(breakpointItem);
      assert.instanceOf(breakpointItem, HTMLDivElement);
      assert.isTrue(breakpointItem.classList.contains('conditional-breakpoint'));
    });

    it('show a tooltip', async () => {
      const {component} =
          await renderSingleBreakpoint(SDK.DebuggerModel.BreakpointType.CONDITIONAL_BREAKPOINT, breakpointDetails);
      const codeSnippet = component.shadowRoot?.querySelector(CODE_SNIPPET_SELECTOR);
      assert.exists(codeSnippet);
      assert.instanceOf(codeSnippet, HTMLSpanElement);
      assert.strictEqual(codeSnippet.title, `Condition: ${breakpointDetails}`);
    });

    it('show a tooltip on editing the condition', async () => {
      const {component} =
          await renderSingleBreakpoint(SDK.DebuggerModel.BreakpointType.CONDITIONAL_BREAKPOINT, breakpointDetails);
      assert.isNotNull(component.shadowRoot);

      await hover(component, BREAKPOINT_ITEM_SELECTOR);

      const editBreakpointButton = component.shadowRoot.querySelector(EDIT_SINGLE_BREAKPOINT_SELECTOR);
      assert.instanceOf(editBreakpointButton, HTMLButtonElement);

      assert.strictEqual(editBreakpointButton.title, 'Edit condition');
    });
  });

  describe('logpoints', () => {
    const breakpointDetails = 'x, a';

    it('are rendered', async () => {
      const {component} = await renderSingleBreakpoint(SDK.DebuggerModel.BreakpointType.LOGPOINT, breakpointDetails);
      const breakpointItem = component.shadowRoot?.querySelector(BREAKPOINT_ITEM_SELECTOR);
      assert.exists(breakpointItem);
      assert.instanceOf(breakpointItem, HTMLDivElement);
      assert.isTrue(breakpointItem.classList.contains('logpoint'));
    });

    it('show a tooltip', async () => {
      const {component} = await renderSingleBreakpoint(SDK.DebuggerModel.BreakpointType.LOGPOINT, breakpointDetails);
      const codeSnippet = component.shadowRoot?.querySelector(CODE_SNIPPET_SELECTOR);
      assert.exists(codeSnippet);
      assert.instanceOf(codeSnippet, HTMLSpanElement);
      assert.strictEqual(codeSnippet.title, `Logpoint: ${breakpointDetails}`);
    });

    it('show a tooltip on editing the logpoint', async () => {
      const {component} = await renderSingleBreakpoint(SDK.DebuggerModel.BreakpointType.LOGPOINT, breakpointDetails);
      assert.isNotNull(component.shadowRoot);

      await hover(component, BREAKPOINT_ITEM_SELECTOR);

      const editBreakpointButton = component.shadowRoot.querySelector(EDIT_SINGLE_BREAKPOINT_SELECTOR);
      assert.instanceOf(editBreakpointButton, HTMLButtonElement);

      assert.strictEqual(editBreakpointButton.title, 'Edit logpoint');
    });
  });

  describe('pause on exceptions', () => {
    it('state is rendered correctly when disabled', async () => {
      const component = await renderNoBreakpoints(
          {pauseOnUncaughtExceptions: false, pauseOnCaughtExceptions: false, independentPauseToggles: true});
      assert.isNotNull(component.shadowRoot);

      const pauseOnUncaughtExceptionsItem = component.shadowRoot.querySelector(PAUSE_ON_UNCAUGHT_EXCEPTIONS_SELECTOR);
      assert.exists(pauseOnUncaughtExceptionsItem);

      const pauseOnUncaughtExceptionsCheckbox = pauseOnUncaughtExceptionsItem.querySelector('input');
      assert.instanceOf(pauseOnUncaughtExceptionsCheckbox, HTMLInputElement);
      assert.isFalse(pauseOnUncaughtExceptionsCheckbox.checked);

      const pauseOnCaughtExceptionsItem = component.shadowRoot?.querySelector(PAUSE_ON_CAUGHT_EXCEPTIONS_SELECTOR);
      assert.exists(pauseOnCaughtExceptionsItem);

      const pauseOnCaughtExceptionsCheckbox = pauseOnUncaughtExceptionsItem.querySelector('input');
      assert.instanceOf(pauseOnCaughtExceptionsCheckbox, HTMLInputElement);
      assert.isFalse(pauseOnCaughtExceptionsCheckbox.checked);
    });

    it('state is rendered correctly when pausing on uncaught exceptions', async () => {
      const component = await renderNoBreakpoints(
          {pauseOnUncaughtExceptions: true, pauseOnCaughtExceptions: false, independentPauseToggles: true});
      assert.isNotNull(component.shadowRoot);

      const pauseOnUncaughtExceptionsItem = component.shadowRoot.querySelector(PAUSE_ON_UNCAUGHT_EXCEPTIONS_SELECTOR);
      assert.exists(pauseOnUncaughtExceptionsItem);

      const pauseOnUncaughtExceptionsCheckbox = pauseOnUncaughtExceptionsItem.querySelector('input');
      assert.exists(pauseOnUncaughtExceptionsCheckbox);
      assert.instanceOf(pauseOnUncaughtExceptionsCheckbox, HTMLInputElement);
      assert.isTrue(pauseOnUncaughtExceptionsCheckbox.checked);

      const pauseOnCaughtExceptionsItem = component.shadowRoot?.querySelector(PAUSE_ON_CAUGHT_EXCEPTIONS_SELECTOR);
      assert.exists(pauseOnCaughtExceptionsItem);

      const pauseOnCaughtExceptionsCheckbox = pauseOnCaughtExceptionsItem.querySelector('input');
      assert.exists(pauseOnCaughtExceptionsCheckbox);
      assert.instanceOf(pauseOnCaughtExceptionsCheckbox, HTMLInputElement);
      assert.isFalse(pauseOnCaughtExceptionsCheckbox.checked);
    });

    it('state is rendered correctly when pausing on all exceptions', async () => {
      const component = await renderNoBreakpoints(
          {pauseOnUncaughtExceptions: true, pauseOnCaughtExceptions: true, independentPauseToggles: true});
      assert.isNotNull(component.shadowRoot);

      const pauseOnUncaughtExceptionsItem = component.shadowRoot.querySelector(PAUSE_ON_UNCAUGHT_EXCEPTIONS_SELECTOR);
      assert.exists(pauseOnUncaughtExceptionsItem);

      const pauseOnUncaughtExceptionsCheckbox = pauseOnUncaughtExceptionsItem.querySelector('input');
      assert.exists(pauseOnUncaughtExceptionsCheckbox);
      assert.instanceOf(pauseOnUncaughtExceptionsCheckbox, HTMLInputElement);
      assert.isTrue(pauseOnUncaughtExceptionsCheckbox.checked);

      const pauseOnCaughtExceptionsItem = component.shadowRoot?.querySelector(PAUSE_ON_CAUGHT_EXCEPTIONS_SELECTOR);
      assert.exists(pauseOnCaughtExceptionsItem);

      const pauseOnCaughtExceptionsCheckbox = pauseOnCaughtExceptionsItem.querySelector('input');
      assert.exists(pauseOnCaughtExceptionsCheckbox);
      assert.instanceOf(pauseOnCaughtExceptionsCheckbox, HTMLInputElement);
      assert.isTrue(pauseOnCaughtExceptionsCheckbox.checked);
    });

    it('state is rendered correctly when toggles are dependent and only pausing on uncaught exceptions', async () => {
      const component = await renderNoBreakpoints(
          {pauseOnUncaughtExceptions: true, pauseOnCaughtExceptions: false, independentPauseToggles: false});
      assert.isNotNull(component.shadowRoot);

      const pauseOnUncaughtExceptionsItem = component.shadowRoot.querySelector(PAUSE_ON_UNCAUGHT_EXCEPTIONS_SELECTOR);
      assert.exists(pauseOnUncaughtExceptionsItem);

      const pauseOnUncaughtExceptionsCheckbox = pauseOnUncaughtExceptionsItem.querySelector('input');
      assert.exists(pauseOnUncaughtExceptionsCheckbox);
      assert.instanceOf(pauseOnUncaughtExceptionsCheckbox, HTMLInputElement);
      assert.isTrue(pauseOnUncaughtExceptionsCheckbox.checked);

      const pauseOnCaughtExceptionsItem = component.shadowRoot?.querySelector(PAUSE_ON_CAUGHT_EXCEPTIONS_SELECTOR);
      assert.exists(pauseOnCaughtExceptionsItem);

      const pauseOnCaughtExceptionsCheckbox = pauseOnCaughtExceptionsItem.querySelector('input');
      assert.instanceOf(pauseOnCaughtExceptionsCheckbox, HTMLInputElement);
      assert.isFalse(pauseOnCaughtExceptionsCheckbox.disabled);
    });

    it('state is rendered correctly when toggles are dependent and not pausing on uncaught exceptions', async () => {
      const component = await renderNoBreakpoints(
          {pauseOnUncaughtExceptions: false, pauseOnCaughtExceptions: false, independentPauseToggles: false});
      assert.isNotNull(component.shadowRoot);

      const pauseOnUncaughtExceptionsItem = component.shadowRoot.querySelector(PAUSE_ON_UNCAUGHT_EXCEPTIONS_SELECTOR);
      assert.exists(pauseOnUncaughtExceptionsItem);

      const pauseOnUncaughtExceptionsCheckbox = pauseOnUncaughtExceptionsItem.querySelector('input');
      assert.exists(pauseOnUncaughtExceptionsCheckbox);
      assert.instanceOf(pauseOnUncaughtExceptionsCheckbox, HTMLInputElement);
      assert.isFalse(pauseOnUncaughtExceptionsCheckbox.checked);

      const pauseOnCaughtExceptionsItem = component.shadowRoot?.querySelector(PAUSE_ON_CAUGHT_EXCEPTIONS_SELECTOR);
      assert.exists(pauseOnCaughtExceptionsItem);

      const pauseOnCaughtExceptionsCheckbox = pauseOnCaughtExceptionsItem.querySelector('input');
      assert.instanceOf(pauseOnCaughtExceptionsCheckbox, HTMLInputElement);
      assert.isTrue(pauseOnCaughtExceptionsCheckbox.disabled);
    });

    it('state is rendered correctly when toggles are dependent and pausing on uncaught exceptions is unchecked',
       async () => {
         const component = await renderNoBreakpoints(
             {pauseOnUncaughtExceptions: true, pauseOnCaughtExceptions: true, independentPauseToggles: false});
         assert.isNotNull(component.shadowRoot);

         const pauseOnUncaughtExceptionsItem =
             component.shadowRoot.querySelector(PAUSE_ON_UNCAUGHT_EXCEPTIONS_SELECTOR);
         assert.instanceOf(pauseOnUncaughtExceptionsItem, HTMLDivElement);

         {
           // Click on the pause on exceptions checkbox to uncheck.
           const pauseOnUncaughtExceptionsCheckbox = pauseOnUncaughtExceptionsItem.querySelector('input');
           assert.instanceOf(pauseOnUncaughtExceptionsCheckbox, HTMLInputElement);
           dispatchClickEvent(pauseOnUncaughtExceptionsCheckbox);
           await coordinator.done();
         }
         {
           // Check that clicking on it actually unchecked.
           const pauseOnUncaughtExceptionsCheckbox = pauseOnUncaughtExceptionsItem.querySelector('input');
           assert.instanceOf(pauseOnUncaughtExceptionsCheckbox, HTMLInputElement);
           assert.isFalse(pauseOnUncaughtExceptionsCheckbox.checked);
         }

         // Check if the pause on caught exception checkbox is unchecked and disabled as a result.
         const pauseOnCaughtExceptionsItem = component.shadowRoot?.querySelector(PAUSE_ON_CAUGHT_EXCEPTIONS_SELECTOR);
         assert.exists(pauseOnCaughtExceptionsItem);

         const pauseOnCaughtExceptionsCheckbox = pauseOnCaughtExceptionsItem.querySelector('input');
         assert.instanceOf(pauseOnCaughtExceptionsCheckbox, HTMLInputElement);
         assert.isTrue(pauseOnCaughtExceptionsCheckbox.disabled);
         assert.isFalse(pauseOnCaughtExceptionsCheckbox.checked);
       });

    it('triggers an event when disabling pausing on all exceptions', async () => {
      const component = await renderNoBreakpoints(
          {pauseOnUncaughtExceptions: true, pauseOnCaughtExceptions: false, independentPauseToggles: true});
      assert.isNotNull(component.shadowRoot);

      const item = component.shadowRoot.querySelector(PAUSE_ON_UNCAUGHT_EXCEPTIONS_SELECTOR);
      assert.exists(item);

      const checkbox = item.querySelector('input');
      assert.instanceOf(checkbox, HTMLInputElement);
      const {checked} = checkbox;

      const controller = SourcesComponents.BreakpointsView.BreakpointsSidebarController.instance();
      const setPauseOnUncaughtExceptions = sinon.stub(controller, 'setPauseOnUncaughtExceptions');

      checkbox.click();

      assert.isTrue(setPauseOnUncaughtExceptions.calledOnceWith(!checked));
    });

    it('triggers an event when enabling pausing on caught exceptions', async () => {
      const component = await renderNoBreakpoints(
          {pauseOnUncaughtExceptions: true, pauseOnCaughtExceptions: false, independentPauseToggles: true});
      assert.isNotNull(component.shadowRoot);

      const item = component.shadowRoot.querySelector(PAUSE_ON_CAUGHT_EXCEPTIONS_SELECTOR);
      assert.exists(item);

      const checkbox = item.querySelector('input');
      assert.instanceOf(checkbox, HTMLInputElement);
      const {checked} = checkbox;

      const controller = SourcesComponents.BreakpointsView.BreakpointsSidebarController.instance();
      const setPauseOnCaughtExceptions = sinon.stub(controller, 'setPauseOnCaughtExceptions');

      checkbox.click();

      assert.isTrue(setPauseOnCaughtExceptions.calledOnceWith(!checked));
    });

    it('triggers an event when enabling pausing on uncaught exceptions', async () => {
      const component = await renderNoBreakpoints(
          {pauseOnUncaughtExceptions: false, pauseOnCaughtExceptions: true, independentPauseToggles: true});
      assert.isNotNull(component.shadowRoot);

      const item = component.shadowRoot.querySelector(PAUSE_ON_UNCAUGHT_EXCEPTIONS_SELECTOR);
      assert.exists(item);

      const checkbox = item.querySelector('input');
      assert.instanceOf(checkbox, HTMLInputElement);
      const {checked} = checkbox;

      const controller = SourcesComponents.BreakpointsView.BreakpointsSidebarController.instance();
      const setPauseOnUncaughtExceptions = sinon.stub(controller, 'setPauseOnUncaughtExceptions');

      checkbox.click();

      assert.isTrue(setPauseOnUncaughtExceptions.calledOnceWith(!checked));
    });
  });

  describe('navigating with keyboard', () => {
    // One expanded group with 2 breakpoints, and one collapsed with 2 breakpoints.
    async function renderBreakpointsForKeyboardNavigation(): Promise<{
      component: SourcesComponents.BreakpointsView.BreakpointsView,
      data: SourcesComponents.BreakpointsView.BreakpointsViewData,
    }> {
      const component = await createAndInitializeBreakpointsView();

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
                type: SDK.DebuggerModel.BreakpointType.REGULAR_BREAKPOINT,
                location: '234',
                codeSnippet: 'const a = x;',
                isHit: false,
                status: SourcesComponents.BreakpointsView.BreakpointStatus.ENABLED,
              },
              {
                id: '2',
                type: SDK.DebuggerModel.BreakpointType.REGULAR_BREAKPOINT,
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
                type: SDK.DebuggerModel.BreakpointType.REGULAR_BREAKPOINT,
                location: '11',
                codeSnippet: 'const y;',
                isHit: false,
                status: SourcesComponents.BreakpointsView.BreakpointStatus.ENABLED,
              },
              {
                id: '4',
                type: SDK.DebuggerModel.BreakpointType.REGULAR_BREAKPOINT,
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
      assert.isNotNull(component.shadowRoot);

      const focusableElements = component.shadowRoot.querySelectorAll(TABBABLE_SELECTOR);
      assert.lengthOf(focusableElements, 1);

      const pauseOnUncaughtExceptions = component.shadowRoot.querySelector(PAUSE_ON_UNCAUGHT_EXCEPTIONS_SELECTOR);
      assert.deepEqual(focusableElements[0], pauseOnUncaughtExceptions);
    });

    describe('pressing the HOME key', () => {
      it('takes the user to the pause-on-exceptions line', async () => {
        const {component} = await renderBreakpointsForKeyboardNavigation();
        assert.isNotNull(component.shadowRoot);
        const secondGroupsSummary =
            component.shadowRoot.querySelector(`${DETAILS_SELECTOR}:nth-of-type(2) > ${SUMMARY_SELECTOR}`);
        assert.instanceOf(secondGroupsSummary, HTMLElement);

        // Focus on second group by clicking on it, then press Home button.
        dispatchClickEvent(secondGroupsSummary);
        dispatchKeyDownEvent(secondGroupsSummary, {key: 'Home', bubbles: true});
        await coordinator.done();

        const selected = component.shadowRoot.querySelector(TABBABLE_SELECTOR);
        assert.instanceOf(selected, HTMLElement);
        const pauseOnUncaughtExceptions = component.shadowRoot.querySelector(PAUSE_ON_UNCAUGHT_EXCEPTIONS_SELECTOR);
        assert.instanceOf(pauseOnUncaughtExceptions, HTMLElement);
        assert.strictEqual(selected, pauseOnUncaughtExceptions);
      });
    });

    describe('pressing the END key', () => {
      it('takes the user to the summary node of the last group (if last group is collapsed)', async () => {
        const {component} = await renderBreakpointsForKeyboardNavigation();
        assert.isNotNull(component.shadowRoot);
        const pauseOnUncaughtExceptions = component.shadowRoot.querySelector(PAUSE_ON_UNCAUGHT_EXCEPTIONS_SELECTOR);
        assert.instanceOf(pauseOnUncaughtExceptions, HTMLElement);

        // Focus on the pause-on-exceptions line by clicking on it, then press End key.
        dispatchClickEvent(pauseOnUncaughtExceptions);
        dispatchKeyDownEvent(pauseOnUncaughtExceptions, {key: 'End', bubbles: true});
        await coordinator.done();

        const selected = component.shadowRoot.querySelector(TABBABLE_SELECTOR);
        assert.instanceOf(selected, HTMLElement);

        const lastGroupSummary =
            component.shadowRoot.querySelector(`${DETAILS_SELECTOR}:nth-of-type(2) > ${SUMMARY_SELECTOR}`);
        assert.instanceOf(lastGroupSummary, HTMLElement);
        assert.strictEqual(selected, lastGroupSummary);
      });

      it('takes the user to the last breakpoint item (if last group is expanded))', async () => {
        const {component, data} = await renderBreakpointsForKeyboardNavigation();
        // Expand the last group.
        data.groups[1].expanded = true;
        component.data = data;
        await coordinator.done();

        assert.isNotNull(component.shadowRoot);
        const firstGroupSummary = component.shadowRoot.querySelector(SUMMARY_SELECTOR);
        assert.instanceOf(firstGroupSummary, HTMLElement);

        // First focus on the first group by clicking on it, then press the End button.
        dispatchClickEvent(firstGroupSummary);
        dispatchKeyDownEvent(firstGroupSummary, {key: 'End', bubbles: true});
        await coordinator.done();

        const selected = component.shadowRoot.querySelector(TABBABLE_SELECTOR);
        assert.instanceOf(selected, HTMLElement);

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
           assert.isNotNull(component.shadowRoot);

           const pauseOnCaughtException = component.shadowRoot.querySelector(PAUSE_ON_CAUGHT_EXCEPTIONS_SELECTOR);
           assert.instanceOf(pauseOnCaughtException, HTMLElement);

           // Focus on the pause on exception, and navigate one down.
           dispatchClickEvent(pauseOnCaughtException);
           dispatchKeyDownEvent(pauseOnCaughtException, {key: 'ArrowDown', bubbles: true});
           await coordinator.done();

           const selected = component.shadowRoot.querySelector(TABBABLE_SELECTOR);
           const firstSummary = component.shadowRoot.querySelector(`${DETAILS_SELECTOR} > ${SUMMARY_SELECTOR}`);
           assert.instanceOf(firstSummary, HTMLElement);
           assert.strictEqual(selected, firstSummary);
         });

      it('on the summary node of an expanded group takes the user to the top most breakpoint item of that group',
         async () => {
           const {component} = await renderBreakpointsForKeyboardNavigation();
           assert.isNotNull(component.shadowRoot);
           const collapsedDetailsElement = component.shadowRoot.querySelector(COLLAPSED_GROUPS_SELECTOR);
           assert.instanceOf(collapsedDetailsElement, HTMLDetailsElement);

           const collapsedGroupSummary = collapsedDetailsElement.querySelector(SUMMARY_SELECTOR);
           assert.instanceOf(collapsedGroupSummary, HTMLElement);

           // Focus on the collapsed group and collapse it by clicking on it. Then navigate down.
           dispatchClickEvent(collapsedGroupSummary);
           dispatchKeyDownEvent(collapsedGroupSummary, {key: 'ArrowDown', bubbles: true});
           await coordinator.done();

           const selected = component.shadowRoot.querySelector(TABBABLE_SELECTOR);
           assert.instanceOf(selected, HTMLElement);

           const firstBreakpointItem = collapsedDetailsElement.querySelector(BREAKPOINT_ITEM_SELECTOR);
           assert.instanceOf(firstBreakpointItem, HTMLDivElement);

           assert.strictEqual(selected, firstBreakpointItem);
         });

      it('on the summary node of a collapsed group takes the user to the summary node of the next group', async () => {
        const {component} = await renderBreakpointsForKeyboardNavigation();
        assert.isNotNull(component.shadowRoot);

        const firstGroupSummary =
            component.shadowRoot.querySelector(`${DETAILS_SELECTOR}:nth-of-type(1) > ${SUMMARY_SELECTOR}`);
        assert.instanceOf(firstGroupSummary, HTMLElement);

        // Focus on the expanded group and collapse it by clicking on it. Then navigate down.
        dispatchClickEvent(firstGroupSummary);
        dispatchKeyDownEvent(firstGroupSummary, {key: 'ArrowDown', bubbles: true});
        await coordinator.done();

        const selected = component.shadowRoot.querySelector(TABBABLE_SELECTOR);
        assert.instanceOf(selected, HTMLElement);

        const secondGroupSummary =
            component.shadowRoot.querySelector(`${DETAILS_SELECTOR}:nth-of-type(2) > ${SUMMARY_SELECTOR}`);
        assert.instanceOf(secondGroupSummary, HTMLElement);
        assert.strictEqual(selected, secondGroupSummary);
      });

      it('on a breakpoint item takes the user to the next breakpoint item', async () => {
        const {component} = await renderBreakpointsForKeyboardNavigation();
        assert.isNotNull(component.shadowRoot);

        const firstDetailsElement = component.shadowRoot.querySelector('details');
        assert.instanceOf(firstDetailsElement, HTMLDetailsElement);
        const firstBreakpointItem = firstDetailsElement.querySelector(BREAKPOINT_ITEM_SELECTOR);
        assert.instanceOf(firstBreakpointItem, HTMLDivElement);

        // Focus on the first breakpoint item. Then navigate up.
        dispatchClickEvent(firstBreakpointItem);
        dispatchKeyDownEvent(firstBreakpointItem, {key: 'ArrowDown', bubbles: true});
        await coordinator.done();

        const selected = component.shadowRoot.querySelector(TABBABLE_SELECTOR);
        assert.instanceOf(selected, HTMLElement);

        const secondBreakpointItem = firstDetailsElement.querySelector(`${BREAKPOINT_ITEM_SELECTOR}:nth-of-type(2)`);
        assert.instanceOf(secondBreakpointItem, HTMLDivElement);

        assert.strictEqual(selected, secondBreakpointItem);
      });
    });

    describe('pressing the ArrowUp key', () => {
      it('on the first summary takes a user to the pause on exceptions', async () => {
        const {component} = await renderBreakpointsForKeyboardNavigation();
        assert.isNotNull(component.shadowRoot);
        const firstSummary = component.shadowRoot.querySelector(`${DETAILS_SELECTOR} > ${SUMMARY_SELECTOR}`);
        assert.instanceOf(firstSummary, HTMLElement);

        // Focus on the summary element.
        dispatchClickEvent(firstSummary);
        dispatchKeyDownEvent(firstSummary, {key: 'ArrowUp', bubbles: true});
        await coordinator.done();

        const selected = component.shadowRoot.querySelector(TABBABLE_SELECTOR);
        const pauseOnUncaughtExceptions = component.shadowRoot.querySelector(PAUSE_ON_CAUGHT_EXCEPTIONS_SELECTOR);
        assert.instanceOf(pauseOnUncaughtExceptions, HTMLDivElement);

        assert.strictEqual(selected, pauseOnUncaughtExceptions);
      });

      it('on the first breakpoint item in an expanded group takes the user to the summary node', async () => {
        const {component} = await renderBreakpointsForKeyboardNavigation();
        assert.isNotNull(component.shadowRoot);
        const expandedDetails = component.shadowRoot.querySelector(EXPANDED_GROUPS_SELECTOR);
        assert.instanceOf(expandedDetails, HTMLDetailsElement);

        const firstBreakpointItem = expandedDetails.querySelector(BREAKPOINT_ITEM_SELECTOR);
        assert.instanceOf(firstBreakpointItem, HTMLDivElement);

        // Focus on first breakpoint item. Then navigate up.
        dispatchClickEvent(firstBreakpointItem);
        dispatchKeyDownEvent(firstBreakpointItem, {key: 'ArrowUp', bubbles: true});
        await coordinator.done();

        const selected = component.shadowRoot.querySelector(TABBABLE_SELECTOR);
        assert.instanceOf(selected, HTMLElement);

        const summary = expandedDetails.querySelector(SUMMARY_SELECTOR);
        assert.instanceOf(summary, HTMLElement);

        assert.strictEqual(selected, summary);
      });

      it('on a breakpoint item in an expanded group takes the user to the previous breakpoint item', async () => {
        const {component} = await renderBreakpointsForKeyboardNavigation();
        assert.isNotNull(component.shadowRoot);
        const expandedDetails = component.shadowRoot.querySelector(EXPANDED_GROUPS_SELECTOR);
        assert.instanceOf(expandedDetails, HTMLDetailsElement);

        const breakpointItems = expandedDetails.querySelectorAll(BREAKPOINT_ITEM_SELECTOR);
        assert.isAbove(breakpointItems.length, 1);

        const lastBreakpointItem = breakpointItems.item(breakpointItems.length - 1);
        // Focus on last breakpoint item. Then navigate up.
        dispatchClickEvent(lastBreakpointItem);
        dispatchKeyDownEvent(lastBreakpointItem, {key: 'ArrowUp', bubbles: true});
        await coordinator.done();

        const selected = component.shadowRoot.querySelector(TABBABLE_SELECTOR);
        assert.instanceOf(selected, HTMLElement);

        const nextToLastBreakpointItem = breakpointItems.item(breakpointItems.length - 2);
        assert.instanceOf(nextToLastBreakpointItem, HTMLDivElement);
        assert.strictEqual(selected, nextToLastBreakpointItem);
      });

      it('on a summary node takes the user to the last breakpoint item of the previous group', async () => {
        const {component} = await renderBreakpointsForKeyboardNavigation();
        assert.isNotNull(component.shadowRoot);
        const secondGroupSummary =
            component.shadowRoot.querySelector(`${DETAILS_SELECTOR}:nth-of-type(2) > ${SUMMARY_SELECTOR}`);
        assert.instanceOf(secondGroupSummary, HTMLElement);

        // Focus on the group. Then navigate up.
        dispatchClickEvent(secondGroupSummary);
        dispatchKeyDownEvent(secondGroupSummary, {key: 'ArrowUp', bubbles: true});
        await coordinator.done();

        const selected = component.shadowRoot.querySelector(TABBABLE_SELECTOR);
        assert.instanceOf(selected, HTMLElement);

        const firstDetailsElement = component.shadowRoot.querySelector(DETAILS_SELECTOR);
        assert.exists(firstDetailsElement);
        const lastBreakpointItem = firstDetailsElement.querySelector(`${BREAKPOINT_ITEM_SELECTOR}:last-child`);
        assert.instanceOf(lastBreakpointItem, HTMLDivElement);

        assert.strictEqual(selected, lastBreakpointItem);
      });
    });
  });
});
