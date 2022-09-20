// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../front_end/core/common/common.js';
import * as Bindings from '../../../../../front_end/models/bindings/bindings.js';
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';
import * as SourcesComponents from '../../../../../front_end/panels/sources/components/components.js';
import * as Sources from '../../../../../front_end/panels/sources/sources.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';
import {setupMockedUISourceCode} from '../../helpers/UISourceCodeHelpers.js';

import type * as Platform from '../../../../../front_end/core/platform/platform.js';

const HELLO_JS_FILE = 'hello.js';
const TEST_JS_FILE = 'test.js';
interface LocationTestData {
  url: Platform.DevToolsPath.UrlString;
  lineNumber: number;
  columnNumber: number;
  enabled: boolean;
  content: string;
}

function initializeBreakpointManagerWithMockdata(testData: LocationTestData[]): void {
  const breakpointManagerStub = sinon.createStubInstance(Bindings.BreakpointManager.BreakpointManager);
  sinon.stub(Bindings.BreakpointManager.BreakpointManager, 'instance').returns(breakpointManagerStub);
  const breakpointLocations = createBreakpointLocations(testData);
  breakpointManagerStub.allBreakpointLocations.returns(breakpointLocations);
}

function createLocationTestData(
    url: string, lineNumber: number, columnNumber: number, enabled: boolean = true,
    content: string = ''): LocationTestData {
  return {url: url as Platform.DevToolsPath.UrlString, lineNumber, columnNumber, enabled, content};
}

function createBreakpointLocations(testData: LocationTestData[]): Bindings.BreakpointManager.BreakpointLocation[] {
  const breakpointLocations = testData.map(data => {
    const mocked = setupMockedUISourceCode(data.url);
    const mockedContent = Promise.resolve({content: data.content, isEncoded: true});
    sinon.stub(mocked.sut, 'requestContent').returns(mockedContent);
    const uiLocation = new Workspace.UISourceCode.UILocation(mocked.sut, data.lineNumber, data.columnNumber);
    const breakpoint = sinon.createStubInstance(Bindings.BreakpointManager.Breakpoint);
    breakpoint.enabled.returns(data.enabled);
    return {uiLocation, breakpoint} as Bindings.BreakpointManager.BreakpointLocation;
  });
  return breakpointLocations;
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
  initializeBreakpointManagerWithMockdata(testData);

  const controller = Sources.BreakpointsSidebarPane.BreakpointsSidebarController.instance({forceNew: true});
  const data = await controller.getUpdatedBreakpointViewData();

  assert.lengthOf(data.groups, 1);
  assert.lengthOf(data.groups[0].breakpointItems, 1);
  const locations = Bindings.BreakpointManager.BreakpointManager.instance().allBreakpointLocations();
  assert.lengthOf(locations, 1);
  return {groups: data.groups, location: locations[0]};
}

describeWithEnvironment('BreakpointsSidebarController', () => {
  it('can remove a breakpoint', async () => {
    const {groups, location} = await setUpTestWithOneBreakpointLocation();
    const breakpoint = location.breakpoint as sinon.SinonStubbedInstance<Bindings.BreakpointManager.Breakpoint>;
    const breakpointItem = groups[0].breakpointItems[0];

    Sources.BreakpointsSidebarPane.BreakpointsSidebarController.instance().breakpointsRemoved([breakpointItem]);
    assert.isTrue(breakpoint.remove.calledOnceWith(false));
  });

  it('changes breakpoint state', async () => {
    const {groups, location} = await setUpTestWithOneBreakpointLocation();
    const breakpointItem = groups[0].breakpointItems[0];
    assert.strictEqual(breakpointItem.status, SourcesComponents.BreakpointsView.BreakpointStatus.ENABLED);

    const breakpoint = location.breakpoint as sinon.SinonStubbedInstance<Bindings.BreakpointManager.Breakpoint>;
    Sources.BreakpointsSidebarPane.BreakpointsSidebarController.instance().breakpointStateChanged(
        breakpointItem, false);
    assert.isTrue(breakpoint.setEnabled.calledWith(false));
  });

  it('triggers a jump to source', async () => {
    const {groups} = await setUpTestWithOneBreakpointLocation();
    const breakpointItem = groups[0].breakpointItems[0];

    Common.Revealer.registerRevealer({
      contextTypes() {
        return [
          Workspace.UISourceCode.UILocation,
        ];
      },
      destination: Common.Revealer.RevealerDestination.SOURCES_PANEL,
      async loadRevealer() {
        return Sources.SourcesPanel.UILocationRevealer.instance();
      },
    });

    const revealStub = sinon.stub(Sources.SourcesPanel.UILocationRevealer.instance(), 'reveal');
    await Sources.BreakpointsSidebarPane.BreakpointsSidebarController.instance().jumpToSource(breakpointItem);
    assert.isTrue(revealStub.called);
  });

  describe('getUpdatedBreakpointViewData', () => {
    it('extracts breakpoint data', async () => {
      const testData = [
        createLocationTestData(HELLO_JS_FILE, 3, 10),
        createLocationTestData(TEST_JS_FILE, 1, 1),
      ];
      initializeBreakpointManagerWithMockdata(testData);

      const controller = Sources.BreakpointsSidebarPane.BreakpointsSidebarController.instance({forceNew: true});
      const actual = await controller.getUpdatedBreakpointViewData();
      const createExpectedBreakpointGroups = (testData: LocationTestData) => {
        const status = testData.enabled ? SourcesComponents.BreakpointsView.BreakpointStatus.ENABLED :
                                          SourcesComponents.BreakpointsView.BreakpointStatus.DISABLED;

        return {
          name: testData.url as string,
          url: testData.url,
          expanded: true,
          breakpointItems: [
            {
              location: `${testData.lineNumber + 1}`,
              codeSnippet: '',
              isHit: false,
              status,
            },
          ],
        };
      };
      const expected = {groups: testData.map(createExpectedBreakpointGroups)};
      assert.deepEqual(actual, expected);
    });

    it('groups breakpoints that are in the same file', async () => {
      const testData = [
        createLocationTestData(HELLO_JS_FILE, 3, 10),
        createLocationTestData(TEST_JS_FILE, 1, 1),
      ];
      initializeBreakpointManagerWithMockdata(testData);

      const controller = Sources.BreakpointsSidebarPane.BreakpointsSidebarController.instance({forceNew: true});
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
         initializeBreakpointManagerWithMockdata(testData);

         const controller = Sources.BreakpointsSidebarPane.BreakpointsSidebarController.instance({forceNew: true});
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
      initializeBreakpointManagerWithMockdata(testData);

      const controller = Sources.BreakpointsSidebarPane.BreakpointsSidebarController.instance({forceNew: true});
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

      initializeBreakpointManagerWithMockdata(testData);
      const controller = Sources.BreakpointsSidebarPane.BreakpointsSidebarController.instance({forceNew: true});
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
      initializeBreakpointManagerWithMockdata(testData);

      const controller = Sources.BreakpointsSidebarPane.BreakpointsSidebarController.instance({forceNew: true});
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
      initializeBreakpointManagerWithMockdata(testData);

      const controller = Sources.BreakpointsSidebarPane.BreakpointsSidebarController.instance({forceNew: true});
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
      initializeBreakpointManagerWithMockdata(testData);

      const controller = Sources.BreakpointsSidebarPane.BreakpointsSidebarController.instance({forceNew: true});
      const actualViewData = await controller.getUpdatedBreakpointViewData();
      assert.lengthOf(actualViewData.groups, 1);
      assert.lengthOf(actualViewData.groups[0].breakpointItems, 1);
      assert.strictEqual(
          actualViewData.groups[0].breakpointItems[0].status,
          SourcesComponents.BreakpointsView.BreakpointStatus.INDETERMINATE);
    });
  });
});
