// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import type * as Protocol from '../../../../generated/protocol.js';
import * as Bindings from '../../../../models/bindings/bindings.js';
import * as Workspace from '../../../../models/workspace/workspace.js';
import {createTarget, deinitializeGlobalVars, initializeGlobalVars} from '../../../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../../../testing/MockConnection.js';
import {setupMockedUISourceCode} from '../../../../testing/UISourceCodeHelpers.js';

import * as PerfUI from './perf_ui.js';

const {urlString} = Platform.DevToolsPath;

describeWithMockConnection('LineLevelProfile', () => {
  before(async () => {
    await initializeGlobalVars();
  });
  after(async () => {
    await deinitializeGlobalVars();
  });

  describe('Helper', () => {
    it('should collect and apply performance decorations', async () => {
      const helper = new PerfUI.LineLevelProfile.Helper(Workspace.UISourceCode.DecoratorType.PERFORMANCE);
      const {sut: uiSourceCode} = setupMockedUISourceCode(urlString`file:///script.js`);

      const target = createTarget();
      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      if (!debuggerModel) {
        assert.fail('DebuggerModel not found');
        return;
      }

      const debuggerWorkspaceBinding =
          sinon.createStubInstance(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding);
      sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
          .returns(debuggerWorkspaceBinding);

      sinon.stub(debuggerModel, 'createRawLocationByURL')
          .returns(new SDK.DebuggerModel.Location(debuggerModel, 'scriptId' as Protocol.Runtime.ScriptId, 4, 9));

      const uiLocation = new Workspace.UISourceCode.UILocation(uiSourceCode, 4, 9);
      debuggerWorkspaceBinding.rawLocationToUILocation.resolves(uiLocation);

      helper.addLocationData(target, urlString`file:///script.js`, {line: 5, column: 10}, 100);

      // scheduleUpdate uses a setTimeout which we need to wait for.
      await new Promise(resolve => setTimeout(resolve, 0));

      const decorations = uiSourceCode.getDecorationData(Workspace.UISourceCode.DecoratorType.PERFORMANCE);
      assert.isDefined(decorations, 'Decorations should be defined');
      const lineData = decorations.get(5);
      assert.isDefined(lineData, 'Line data should be defined');
      const columnData = lineData.get(10);
      assert.strictEqual(columnData, 100);
    });
  });
});
