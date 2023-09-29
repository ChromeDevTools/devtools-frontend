// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Bindings from '../../../../../front_end/models/bindings/bindings.js';
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';
import * as Coverage from '../../../../../front_end/panels/coverage/coverage.js';
import * as Sources from '../../../../../front_end/panels/sources/sources.js';
import type * as SourceFrame from '../../../../../front_end/ui/legacy/components/source_frame/source_frame.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';
import {createContentProviderUISourceCode} from '../../helpers/UISourceCodeHelpers.js';

describeWithMockConnection('CoveragePlugin', () => {
  const tests = (targetFactory: () => SDK.Target.Target) => {
    let target: SDK.Target.Target;
    let uiSourceCode: Workspace.UISourceCode.UISourceCode;
    let model: Coverage.CoverageModel.CoverageModel;
    let coverageInfo: Coverage.CoverageModel.URLCoverageInfo;
    const URL = 'test.js' as Platform.DevToolsPath.UrlString;

    beforeEach(() => {
      target = targetFactory();
      const workspace = Workspace.Workspace.WorkspaceImpl.instance();
      const targetManager = SDK.TargetManager.TargetManager.instance();
      const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
      Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
        forceNew: true,
        resourceMapping,
        targetManager,
      });
      Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance({
        forceNew: true,
        resourceMapping,
        targetManager,
      });

      model = target.model(Coverage.CoverageModel.CoverageModel) as Coverage.CoverageModel.CoverageModel;
      coverageInfo = new Coverage.CoverageModel.URLCoverageInfo(URL);
      coverageInfo.addToSizes(9, 28);
      sinon.stub(model, 'getCoverageForUrl').withArgs(URL).returns(coverageInfo);
      ({uiSourceCode} = createContentProviderUISourceCode({url: URL, mimeType: 'text/javascript'}));
    });

    it('shows stats', async () => {
      const coveragePlugin =
          new Sources.CoveragePlugin.CoveragePlugin(uiSourceCode, <SourceFrame.SourceFrame.Transformer>{});
      const [toolbarItem] = coveragePlugin.rightToolbarItems();
      assert.strictEqual('Show Details', toolbarItem.element.title);
      assert.strictEqual(
          'Coverage: 32.1%', toolbarItem.element.querySelector('.toolbar-text:not(.hidden)')?.textContent);
    });

    it('updates stats', async () => {
      const coveragePlugin =
          new Sources.CoveragePlugin.CoveragePlugin(uiSourceCode, <SourceFrame.SourceFrame.Transformer>{});
      const [toolbarItem] = coveragePlugin.rightToolbarItems();
      assert.strictEqual(
          'Coverage: 32.1%', toolbarItem.element.querySelector('.toolbar-text:not(.hidden)')?.textContent);

      coverageInfo.addToSizes(10, 2);
      assert.strictEqual(
          'Coverage: 63.3%', toolbarItem.element.querySelector('.toolbar-text:not(.hidden)')?.textContent);
    });

    it('resets stats', async () => {
      const coveragePlugin =
          new Sources.CoveragePlugin.CoveragePlugin(uiSourceCode, <SourceFrame.SourceFrame.Transformer>{});
      const [toolbarItem] = coveragePlugin.rightToolbarItems();
      assert.strictEqual(
          'Coverage: 32.1%', toolbarItem.element.querySelector('.toolbar-text:not(.hidden)')?.textContent);

      model.dispatchEventToListeners(Coverage.CoverageModel.Events.CoverageReset);
      assert.strictEqual('Click to show Coverage Panel', toolbarItem.element.title);
      assert.strictEqual('Coverage: n/a', toolbarItem.element.querySelector('.toolbar-text:not(.hidden)')?.textContent);
    });
  };
  describe('without tab taget', () => tests(() => createTarget()));
  describe('with tab taget', () => tests(() => {
                               const tabTarget = createTarget({type: SDK.Target.Type.Tab});
                               createTarget({parentTarget: tabTarget, subtype: 'prerender'});
                               return createTarget({parentTarget: tabTarget});
                             }));
});
