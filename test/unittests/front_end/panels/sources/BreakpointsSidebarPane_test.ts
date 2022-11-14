// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as Common from '../../../../../front_end/core/common/common.js';
import * as Bindings from '../../../../../front_end/models/bindings/bindings.js';
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';
import * as SourcesComponents from '../../../../../front_end/panels/sources/components/components.js';
import * as Sources from '../../../../../front_end/panels/sources/sources.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import {createTarget, describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';
import {createContentProviderUISourceCode, setupMockedUISourceCode} from '../../helpers/UISourceCodeHelpers.js';

import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import {describeWithRealConnection} from '../../helpers/RealConnection.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import {
  describeWithMockConnection,
} from '../../helpers/MockConnection.js';

const HELLO_JS_FILE = 'hello.js';
const TEST_JS_FILE = 'test.js';
interface LocationTestData {
  url: Platform.DevToolsPath.UrlString;
  lineNumber: number;
  columnNumber: number;
  enabled: boolean;
  content: string;
  condition: string;
  hoverText?: string;
}

function createBreakpointLocations(testData: LocationTestData[]): Bindings.BreakpointManager.BreakpointLocation[] {
  const breakpointLocations = testData.map(data => {
    const mocked = setupMockedUISourceCode(data.url);
    const mockedContent = Promise.resolve({content: data.content, isEncoded: true});
    sinon.stub(mocked.sut, 'requestContent').returns(mockedContent);
    const uiLocation = new Workspace.UISourceCode.UILocation(mocked.sut, data.lineNumber, data.columnNumber);
    const breakpoint = sinon.createStubInstance(Bindings.BreakpointManager.Breakpoint);
    breakpoint.enabled.returns(data.enabled);
    breakpoint.condition.returns(data.condition);
    breakpoint.breakpointStorageId.returns(
        Bindings.BreakpointManager.BreakpointManager.breakpointStorageId(data.url, data.lineNumber, data.columnNumber));
    return new Bindings.BreakpointManager.BreakpointLocation(breakpoint, uiLocation);
  });
  return breakpointLocations;
}

function createStubBreakpointManagerAndSettings() {
  const breakpointManager = sinon.createStubInstance(Bindings.BreakpointManager.BreakpointManager);
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
  breakpointManager: sinon.SinonStubbedInstance<Bindings.BreakpointManager.BreakpointManager>,
  settings: Common.Settings.Settings,
} {
  const {breakpointManager, settings} = createStubBreakpointManagerAndSettings();
  sinon.stub(Bindings.BreakpointManager.BreakpointManager, 'instance').returns(breakpointManager);
  const breakpointLocations = createBreakpointLocations(testData);
  breakpointManager.allBreakpointLocations.returns(breakpointLocations);
  return {breakpointManager, settings};
}

function createLocationTestData(
    url: string, lineNumber: number, columnNumber: number, enabled: boolean = true, content: string = '',
    condition: string = '', hoverText?: string): LocationTestData {
  return {
    url: url as Platform.DevToolsPath.UrlString,
    lineNumber,
    columnNumber,
    enabled,
    content,
    condition,
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

  const controller = Sources.BreakpointsSidebarPane.BreakpointsSidebarController.instance(
      {forceNew: true, breakpointManager, settings});
  const data = await controller.getUpdatedBreakpointViewData();

  assert.lengthOf(data.groups, 1);
  assert.lengthOf(data.groups[0].breakpointItems, 1);
  const locations = Bindings.BreakpointManager.BreakpointManager.instance().allBreakpointLocations();
  assert.lengthOf(locations, 1);
  return {controller, groups: data.groups, location: locations[0]};
}

class MockRevealer extends Common.Revealer.Revealer {
  async reveal(_object: Object, _omitFocus?: boolean|undefined): Promise<void> {
  }
}

describeWithMockConnection('targetSupportsIndependentPauseOnExceptionToggles', () => {
  it('can correctly identify node targets as targets that are not supporting independent pause on exception toggles',
     async () => {
       const target = createTarget();
       target.markAsNodeJSForTest();
       const supportsIndependentPauses = Sources.BreakpointsSidebarPane.BreakpointsSidebarController
                                             .targetSupportsIndependentPauseOnExceptionToggles();
       assert.isFalse(supportsIndependentPauses);
     });

  it('can correctly identify non-node targets as targets that are supporting independent pause on exception toggles',
     async () => {
       createTarget();
       const supportsIndependentPauses = Sources.BreakpointsSidebarPane.BreakpointsSidebarController
                                             .targetSupportsIndependentPauseOnExceptionToggles();
       assert.isTrue(supportsIndependentPauses);
     });
});

describeWithEnvironment('BreakpointsSidebarController', () => {
  after(() => {
    Sources.BreakpointsSidebarPane.BreakpointsSidebarController.removeInstance();
  });

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

  it('correctly reveals source location', async () => {
    const {groups, location: {uiLocation}} = await setUpTestWithOneBreakpointLocation();
    const breakpointItem = groups[0].breakpointItems[0];
    const revealer = sinon.createStubInstance(MockRevealer);

    Common.Revealer.registerRevealer({
      contextTypes() {
        return [Workspace.UISourceCode.UILocation];
      },
      destination: Common.Revealer.RevealerDestination.SOURCES_PANEL,
      async loadRevealer() {
        return revealer;
      },
    });

    await Sources.BreakpointsSidebarPane.BreakpointsSidebarController.instance().jumpToSource(breakpointItem);
    assert.isTrue(revealer.reveal.calledOnceWith(uiLocation));
  });

  it('correctly reveals breakpoint editor', async () => {
    const {groups, location} = await setUpTestWithOneBreakpointLocation();
    const breakpointItem = groups[0].breakpointItems[0];
    const revealer = sinon.createStubInstance(MockRevealer);

    Common.Revealer.registerRevealer({
      contextTypes() {
        return [Bindings.BreakpointManager.BreakpointLocation];
      },
      destination: Common.Revealer.RevealerDestination.SOURCES_PANEL,
      async loadRevealer() {
        return revealer;
      },
    });

    await Sources.BreakpointsSidebarPane.BreakpointsSidebarController.instance().breakpointEdited(breakpointItem);
    assert.isTrue(revealer.reveal.calledOnceWith(location));
  });

  describe('getUpdatedBreakpointViewData', () => {
    it('extracts breakpoint data', async () => {
      const testData = [
        createLocationTestData(HELLO_JS_FILE, 3, 10),
        createLocationTestData(TEST_JS_FILE, 1, 1),
      ];

      const {breakpointManager, settings} = createStubBreakpointManagerAndSettingsWithMockdata(testData);
      const controller = Sources.BreakpointsSidebarPane.BreakpointsSidebarController.instance(
          {forceNew: true, breakpointManager, settings});
      const actual = await controller.getUpdatedBreakpointViewData();
      const createExpectedBreakpointGroups = (testData: LocationTestData) => {
        const status = testData.enabled ? SourcesComponents.BreakpointsView.BreakpointStatus.ENABLED :
                                          SourcesComponents.BreakpointsView.BreakpointStatus.DISABLED;
        let type = SourcesComponents.BreakpointsView.BreakpointType.REGULAR_BREAKPOINT;

        if (testData.condition) {
          if (testData.condition.startsWith(Sources.BreakpointEditDialog.LogpointPrefix)) {
            type = SourcesComponents.BreakpointsView.BreakpointType.LOGPOINT;
          } else {
            type = SourcesComponents.BreakpointsView.BreakpointType.CONDITIONAL_BREAKPOINT;
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
      const controller = Sources.BreakpointsSidebarPane.BreakpointsSidebarController.instance(
          {forceNew: true, breakpointManager, settings});
      settings.moduleSetting('breakpointsActive').set(true);
      let data = await controller.getUpdatedBreakpointViewData();
      assert.strictEqual(data.breakpointsActive, true);
      settings.moduleSetting('breakpointsActive').set(false);
      data = await controller.getUpdatedBreakpointViewData();
      assert.strictEqual(data.breakpointsActive, false);
    });

    it('marks groups as editable based on conditional breakpoint support', async () => {
      const testData = [
        createLocationTestData(HELLO_JS_FILE, 3, 10),
        createLocationTestData(TEST_JS_FILE, 1, 1),
      ];

      const {breakpointManager, settings} = createStubBreakpointManagerAndSettingsWithMockdata(testData);
      const controller = Sources.BreakpointsSidebarPane.BreakpointsSidebarController.instance(
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
      const controller = Sources.BreakpointsSidebarPane.BreakpointsSidebarController.instance(
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
         const controller = Sources.BreakpointsSidebarPane.BreakpointsSidebarController.instance(
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
      const controller = Sources.BreakpointsSidebarPane.BreakpointsSidebarController.instance(
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
      const controller = Sources.BreakpointsSidebarPane.BreakpointsSidebarController.instance(
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
      const controller = Sources.BreakpointsSidebarPane.BreakpointsSidebarController.instance(
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
      const controller = Sources.BreakpointsSidebarPane.BreakpointsSidebarController.instance(
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
      const controller = Sources.BreakpointsSidebarPane.BreakpointsSidebarController.instance(
          {forceNew: true, breakpointManager, settings});
      const actualViewData = await controller.getUpdatedBreakpointViewData();
      assert.lengthOf(actualViewData.groups, 1);
      assert.lengthOf(actualViewData.groups[0].breakpointItems, 1);
      assert.strictEqual(
          actualViewData.groups[0].breakpointItems[0].status,
          SourcesComponents.BreakpointsView.BreakpointStatus.INDETERMINATE);
    });

    it('correctly extracts conditional breakpoints', async () => {
      const condition = 'x < a';
      const testData = [
        createLocationTestData(TEST_JS_FILE, 3, 15, true /* enabled */, '', condition, condition),
      ];

      const {breakpointManager, settings} = createStubBreakpointManagerAndSettingsWithMockdata(testData);
      const controller = Sources.BreakpointsSidebarPane.BreakpointsSidebarController.instance(
          {forceNew: true, breakpointManager, settings});
      const actualViewData = await controller.getUpdatedBreakpointViewData();
      assert.lengthOf(actualViewData.groups, 1);
      assert.lengthOf(actualViewData.groups[0].breakpointItems, 1);
      const breakpointItem = actualViewData.groups[0].breakpointItems[0];
      assert.strictEqual(breakpointItem.type, SourcesComponents.BreakpointsView.BreakpointType.CONDITIONAL_BREAKPOINT);
      assert.strictEqual(breakpointItem.hoverText, condition);
    });

    it('correctly extracts logpoints', async () => {
      const logDetail = 'x';
      const condition =
          `${Sources.BreakpointEditDialog.LogpointPrefix}${logDetail}${Sources.BreakpointEditDialog.LogpointSuffix}`;
      const testData = [
        createLocationTestData(TEST_JS_FILE, 3, 15, true /* enabled */, '', condition, logDetail),
      ];

      const {breakpointManager, settings} = createStubBreakpointManagerAndSettingsWithMockdata(testData);
      const controller = Sources.BreakpointsSidebarPane.BreakpointsSidebarController.instance(
          {forceNew: true, breakpointManager, settings});
      const actualViewData = await controller.getUpdatedBreakpointViewData();
      assert.lengthOf(actualViewData.groups, 1);
      assert.lengthOf(actualViewData.groups[0].breakpointItems, 1);
      const breakpointItem = actualViewData.groups[0].breakpointItems[0];
      assert.strictEqual(breakpointItem.type, SourcesComponents.BreakpointsView.BreakpointType.LOGPOINT);
      assert.strictEqual(breakpointItem.hoverText, logDetail);
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
        {const breakpointManager = Bindings.BreakpointManager.BreakpointManager.instance();
         const settings = Common.Settings.Settings.instance();
         const controller = Sources.BreakpointsSidebarPane.BreakpointsSidebarController.instance({
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

            const controller = Sources.BreakpointsSidebarPane.BreakpointsSidebarController.instance({
              forceNew: true,
              breakpointManager: Bindings.BreakpointManager.BreakpointManager.instance(),
              settings: Common.Settings.Settings.instance(),
            });
            const actualViewData = await controller.getUpdatedBreakpointViewData();
            assert.isTrue(actualViewData.groups[0].expanded);

        }
      });
    });
  });
});

describeWithRealConnection('BreakpointsSidebarController', () => {
  it('auto-expands if a user adds a new  breakpoint', async () => {
    const breakpointManager = Bindings.BreakpointManager.BreakpointManager.instance();
    const settings = Common.Settings.Settings.instance();
    const {uiSourceCode, project} = createContentProviderUISourceCode(
        {url: 'test.js' as Platform.DevToolsPath.UrlString, mimeType: 'text/javascript'});
    const controller = Sources.BreakpointsSidebarPane.BreakpointsSidebarController.instance(
        {forceNew: false, breakpointManager, settings});

    // Add one breakpoint and collapse the tree.
    const b1 = await breakpointManager.setBreakpoint(
        uiSourceCode, 0, 0, '', true, Bindings.BreakpointManager.BreakpointOrigin.USER_ACTION);
    {
      controller.expandedStateChanged(uiSourceCode.url(), false /* expanded */);
      const data = await controller.getUpdatedBreakpointViewData();
      assert.lengthOf(data.groups, 1);
      assert.lengthOf(data.groups[0].breakpointItems, 1);
      assert.isFalse(data.groups[0].expanded);
    }

    // Add a new breakpoint and check if it's expanded as expected.
    const b2 = await breakpointManager.setBreakpoint(
        uiSourceCode, 0, 3, '', true, Bindings.BreakpointManager.BreakpointOrigin.USER_ACTION);
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
    const breakpointManager = Bindings.BreakpointManager.BreakpointManager.instance();
    const settings = Common.Settings.Settings.instance();
    const {uiSourceCode, project} = createContentProviderUISourceCode(
        {url: 'test.js' as Platform.DevToolsPath.UrlString, mimeType: 'text/javascript'});
    const controller = Sources.BreakpointsSidebarPane.BreakpointsSidebarController.instance(
        {forceNew: false, breakpointManager, settings});

    // Add one breakpoint and collapse the tree.
    const b1 = await breakpointManager.setBreakpoint(
        uiSourceCode, 0, 0, '', true, Bindings.BreakpointManager.BreakpointOrigin.USER_ACTION);
    {
      controller.expandedStateChanged(uiSourceCode.url(), false /* expanded */);
      const data = await controller.getUpdatedBreakpointViewData();
      assert.lengthOf(data.groups, 1);
      assert.lengthOf(data.groups[0].breakpointItems, 1);
      assert.isFalse(data.groups[0].expanded);
    }

    // Add a new non-user triggered breakpoint and check if it's still collapsed.
    const b2 = await breakpointManager.setBreakpoint(
        uiSourceCode, 0, 3, '', true, Bindings.BreakpointManager.BreakpointOrigin.OTHER);
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
    const breakpointManager = Bindings.BreakpointManager.BreakpointManager.instance();

    // Set up sdk and ui location, and a mapping between them, such that we can identify that
    // the hit breakpoint is the one we are adding.
    const scriptId = '0' as Protocol.Runtime.ScriptId;

    const {uiSourceCode, project} = createContentProviderUISourceCode(
        {url: 'test.js' as Platform.DevToolsPath.UrlString, mimeType: 'text/javascript'});
    const uiLocation = new Workspace.UISourceCode.UILocation(uiSourceCode, 0, 0);

    const debuggerModel = sinon.createStubInstance(SDK.DebuggerModel.DebuggerModel);
    const sdkLocation = new SDK.DebuggerModel.Location(debuggerModel, scriptId, 0);

    const mapping: Bindings.DebuggerWorkspaceBinding.DebuggerSourceMapping = {
      rawLocationToUILocation: (_: SDK.DebuggerModel.Location) => uiLocation,
      uiLocationToRawLocations:
          (_uiSourceCode: Workspace.UISourceCode.UISourceCode, _lineNumber: number,
           _columnNumber?: number) => [sdkLocation],
    };
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().addSourceMapping(mapping);

    // Add one breakpoint and collapse its group.
    const b1 = await breakpointManager.setBreakpoint(
        uiSourceCode, uiLocation.lineNumber, uiLocation.columnNumber, '', true,
        Bindings.BreakpointManager.BreakpointOrigin.USER_ACTION);
    const controller = Sources.BreakpointsSidebarPane.BreakpointsSidebarController.instance(
        {forceNew: false, breakpointManager, settings: Common.Settings.Settings.instance()});
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
    const controller = Sources.BreakpointsSidebarPane.BreakpointsSidebarController.instance(
        {forceNew: true, breakpointManager, settings});
    for (const pauseOnUncaughtExceptions of [true, false]) {
      for (const pauseOnCaughtExceptions of [true, false]) {
        controller.setPauseOnUncaughtExceptions(pauseOnUncaughtExceptions);
        controller.setPauseOnCaughtExceptions(pauseOnCaughtExceptions);

        const data = await controller.getUpdatedBreakpointViewData();
        assert.strictEqual(data.pauseOnUncaughtExceptions, pauseOnUncaughtExceptions);
        assert.strictEqual(data.pauseOnCaughtExceptions, pauseOnCaughtExceptions);
        assert.strictEqual(settings.moduleSetting('pauseOnUncaughtException').get(), pauseOnUncaughtExceptions);
        assert.strictEqual(settings.moduleSetting('pauseOnCaughtException').get(), pauseOnCaughtExceptions);
      }
    }
  });
});
