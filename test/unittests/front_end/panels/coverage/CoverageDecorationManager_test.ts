// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../front_end/core/common/common.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Bindings from '../../../../../front_end/models/bindings/bindings.js';
import * as TextUtils from '../../../../../front_end/models/text_utils/text_utils.js';
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';
import * as Coverage from '../../../../../front_end/panels/coverage/coverage.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';
import {MockProtocolBackend} from '../../helpers/MockScopeChain.js';
import {createContentProviderUISourceCode} from '../../helpers/UISourceCodeHelpers.js';

const {CoverageDecorationManager} = Coverage.CoverageDecorationManager;

/** Test helper that returns the "identity" line ranges for any given string */
function lineRangesForContent(content: string): TextUtils.TextRange.TextRange[] {
  const ranges: TextUtils.TextRange.TextRange[] = [];
  const text = new TextUtils.Text.Text(content);
  for (let i = 0; i < text.lineCount(); ++i) {
    const line = text.lineAt(i);
    ranges.push(new TextUtils.TextRange.TextRange(i, 0, i, line.length));
  }
  return ranges;
}

describeWithMockConnection('CoverageDeocrationManager', () => {
  let target: SDK.Target.Target;
  let backend: MockProtocolBackend;
  let debuggerBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding;
  let workspace: Workspace.Workspace.WorkspaceImpl;
  let cssBinding: Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding;
  let coverageModel: sinon.SinonStubbedInstance<Coverage.CoverageModel.CoverageModel>;

  beforeEach(async () => {
    backend = new MockProtocolBackend();
    target = createTarget();
    workspace = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    debuggerBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
    });
    Bindings.IgnoreListManager.IgnoreListManager.instance({forceNew: true, debuggerWorkspaceBinding: debuggerBinding});
    cssBinding =
        Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance({forceNew: true, resourceMapping, targetManager});
    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);

    // Since we wanna mock 'usageForRange' we stub the whole instance. Otherwise we'd use half
    // a stub and half the real thing.
    coverageModel = sinon.createStubInstance(Coverage.CoverageModel.CoverageModel);

    // Wait for the resource tree model to load; otherwise, our uiSourceCodes could be asynchronously
    // invalidated during the test.
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assertNotNullOrUndefined(resourceTreeModel);
    await new Promise<void>(resolver => {
      if (resourceTreeModel.cachedResourcesLoaded()) {
        resolver();
      } else {
        const eventListener =
            resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.CachedResourcesLoaded, () => {
              Common.EventTarget.removeEventListeners([eventListener]);
              resolver();
            });
      }
    });
  });

  const URL = 'http://example.com/index.js' as Platform.DevToolsPath.UrlString;

  describe('usageByLine (raw)', () => {
    it('marks lines as "unknown" coverge status if no coverage info is available', async () => {
      await backend.addScript(target, {url: URL, content: 'function foo(a,b){return a+b;}'}, null);
      const uiSourceCode = workspace.uiSourceCodeForURL(URL);
      assertNotNullOrUndefined(uiSourceCode);
      await uiSourceCode.requestContent();
      const manager = new CoverageDecorationManager(coverageModel, workspace, debuggerBinding, cssBinding);

      const usage = await manager.usageByLine(uiSourceCode, lineRangesForContent(uiSourceCode.content()));

      assert.deepEqual(usage, [undefined]);
    });

    it('marks lines as covered if coverage info says so', async () => {
      await backend.addScript(target, {url: URL, content: 'function foo(a,b){return a+b;}'}, null);
      const uiSourceCode = workspace.uiSourceCodeForURL(URL);
      assertNotNullOrUndefined(uiSourceCode);
      await uiSourceCode.requestContent();
      coverageModel.usageForRange.returns(true);
      const manager = new CoverageDecorationManager(coverageModel, workspace, debuggerBinding, cssBinding);

      const usage = await manager.usageByLine(uiSourceCode, lineRangesForContent(uiSourceCode.content()));
      assert.deepEqual(usage, [true]);
    });
  });

  describe('usageByLine (formatted)', () => {
    it('marks lines as covered if coverage info says so', async () => {
      const scriptContent =
          'function mulWithOffset(n,t,e){const f=n*t;const u=f;if(e!==undefined){const n=u+e;return n}return u}';
      const script = await backend.addScript(target, {url: URL, content: scriptContent}, null);
      const uiSourceCode = workspace.uiSourceCodeForURL(URL);
      assertNotNullOrUndefined(uiSourceCode);
      await uiSourceCode.requestContent();
      coverageModel.usageForRange.callsFake((contentProvider, startOffset, endOffset) => {
        assert.strictEqual(contentProvider, script);
        // Everything is covered except the body of the `if`.
        return endOffset <= 70 || startOffset > 90;
      });
      const manager = new CoverageDecorationManager(coverageModel, workspace, debuggerBinding, cssBinding);

      // clang-format off
      // Simulate editor pretty-printing `script`.
      const lineRanges = [
        new TextUtils.TextRange.TextRange(0, 0, 0, 30),    // function mulWithOffset(n,t,e){
        new TextUtils.TextRange.TextRange(0, 30, 0, 42),   //   const f=n*t;
        new TextUtils.TextRange.TextRange(0, 42, 0, 52),   //   const u=f;
        new TextUtils.TextRange.TextRange(0, 52, 0, 70),   //   if(e!==undefined){
        new TextUtils.TextRange.TextRange(0, 70, 0, 82),   //     const n=u+e;
        new TextUtils.TextRange.TextRange(0, 82, 0, 90),   //     return n
        new TextUtils.TextRange.TextRange(0, 90, 0, 91),   //   }
        new TextUtils.TextRange.TextRange(0, 91, 0, 99),   //   return u
        new TextUtils.TextRange.TextRange(0, 99, 0, 100),  // }
      ];
      // clang-format on
      const usage = await manager.usageByLine(uiSourceCode, lineRanges);

      assert.deepEqual(usage, [true, true, true, true, false, false, false, true, true]);
    });
  });

  describe('usageByLine (sourcemap)', () => {
    let script: SDK.Script.Script;

    beforeEach(async () => {
      const originalContent = `
function mulWithOffset(param1, param2, offset) {
  const intermediate = param1 * param2;
  const result = intermediate;
  if (offset !== undefined) {
    const intermediate = result + offset;
    return intermediate;
  }
  return result;
}
`;
      const sourceMapUrl = 'file:///tmp/example.js.min.map';
      // This was minified with 'terser -m -o example.min.js --source-map "includeSources;url=example.min.js.map"' v5.7.0.
      const sourceMapContent = JSON.stringify({
        version: 3,
        names: ['mulWithOffset', 'param1', 'param2', 'offset', 'intermediate', 'result', 'undefined'],
        sources: ['example.js'],
        sourcesContent: [originalContent],
        mappings:
            'AACA,SAASA,cAAcC,EAAQC,EAAQC,GACrC,MAAMC,EAAeH,EAASC,EAC9B,MAAMG,EAASD,EACf,GAAID,IAAWG,UAAW,CACxB,MAAMF,EAAeC,EAASF,EAC9B,OAAOC,CACT,CACA,OAAOC,CACT',
      });

      const scriptContent =
          'function mulWithOffset(n,t,e){const f=n*t;const u=f;if(e!==undefined){const n=u+e;return n}return u}';
      script = await backend.addScript(
          target, {url: 'file:///tmp/bundle.js', content: scriptContent},
          {url: sourceMapUrl, content: sourceMapContent});
    });

    it('marks lines as covered if coverage info says so', async () => {
      const uiSourceCode = workspace.uiSourceCodeForURL('file:///tmp/example.js' as Platform.DevToolsPath.UrlString);
      assertNotNullOrUndefined(uiSourceCode);
      await uiSourceCode.requestContent();
      coverageModel.usageForRange.callsFake((contentProvider, startOffset, endOffset) => {
        assert.strictEqual(contentProvider, script);
        // Everything is covered except the body of the `if`.
        return endOffset < 70 || startOffset > 90;
      });
      const manager = new CoverageDecorationManager(coverageModel, workspace, debuggerBinding, cssBinding);

      const usage = await manager.usageByLine(uiSourceCode, lineRangesForContent(uiSourceCode.content()));
      assert.deepEqual(usage, [undefined, true, true, true, true, false, false, undefined, true, undefined, undefined]);
    });
  });

  it('sets the "decorationData" on all existing UISourceCodes', () => {
    const {uiSourceCode} = createContentProviderUISourceCode({url: URL, mimeType: 'text/javascript'});
    const manager = new CoverageDecorationManager(coverageModel, workspace, debuggerBinding, cssBinding);

    assert.strictEqual(uiSourceCode.getDecorationData(Coverage.CoverageDecorationManager.decoratorType), manager);
  });

  it('sets the "decorationData" on newly added UISourceCodes (after the manager already exists)', () => {
    const manager = new CoverageDecorationManager(coverageModel, workspace, debuggerBinding, cssBinding);
    const {uiSourceCode} = createContentProviderUISourceCode({url: URL, mimeType: 'text/javascript'});

    assert.strictEqual(uiSourceCode.getDecorationData(Coverage.CoverageDecorationManager.decoratorType), manager);
  });

  it('does not update the "decorationData" on newly added UISourceCodes after being disposed', () => {
    const manager = new CoverageDecorationManager(coverageModel, workspace, debuggerBinding, cssBinding);
    manager.dispose();

    const {uiSourceCode} = createContentProviderUISourceCode({url: URL, mimeType: 'text/javascript'});

    assert.isUndefined(uiSourceCode.getDecorationData(Coverage.CoverageDecorationManager.decoratorType));
  });

  describe('reset', () => {
    it('resets the "decorationData" on all existing UISourceCodes to "undefined"', () => {
      const {uiSourceCode} = createContentProviderUISourceCode({url: URL, mimeType: 'text/javascript'});
      const manager = new CoverageDecorationManager(coverageModel, workspace, debuggerBinding, cssBinding);

      manager.reset();

      assert.isUndefined(uiSourceCode.getDecorationData(Coverage.CoverageDecorationManager.decoratorType));
    });
  });
});
