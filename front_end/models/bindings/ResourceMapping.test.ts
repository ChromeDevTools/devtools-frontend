// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as Protocol from '../../generated/protocol.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {MockDebuggerBackend} from '../../testing/MockScopeChain.js';
import {
  createResource,
  getInitializedResourceTreeModel,
  getMainFrame,
  mockResourceTree,
} from '../../testing/ResourceTreeHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import * as Formatter from '../formatter/formatter.js';
import * as Workspace from '../workspace/workspace.js';

import * as Bindings from './bindings.js';

const {urlString} = Platform.DevToolsPath;

describe('ResourceMapping', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  afterEach(() => {
    Formatter.FormatterWorkerPool.FormatterWorkerPool.removeInstance();
  });
  let debuggerModel: SDK.DebuggerModel.DebuggerModel;
  let resourceMapping: Bindings.ResourceMapping.ResourceMapping;
  let uiSourceCode: Workspace.UISourceCode.UISourceCode;
  let workspace: Workspace.Workspace.WorkspaceImpl;
  let target: SDK.Target.Target;
  let universe: TestUniverse;
  let connection: MockCDPConnection;

  // This test simulates the behavior of the ResourceMapping with the
  // following document, which contains two inline <script>s, one with
  // a `//# sourceURL` annotation and one without.
  //
  //  <!DOCTYPE html>
  //  <html>
  //  <head>
  //  <meta charset=utf-8>
  //  <script>
  //  function foo() { console.log("foo"); }
  //  foo();
  //  //# sourceURL=webpack:///src/foo.js
  //  </script>
  //  </head>
  //  <body>
  //  <script>console.log("bar");</script>
  //  </body>
  //  </html>
  //
  const url = urlString`http://example.com/index.html`;
  const SCRIPTS = [
    {
      scriptId: '1' as Protocol.Runtime.ScriptId,
      startLine: 4,
      startColumn: 8,
      endLine: 8,
      endColumn: 0,
      sourceURL: urlString`webpack:///src/foo.js`,
      hasSourceURLComment: true,
      source: `\nfunction foo() { console.log("foo"); }
  foo();
  //# sourceURL=webpack:///src/foo.js`,
    },
    {
      scriptId: '2' as Protocol.Runtime.ScriptId,
      startLine: 11,
      startColumn: 8,
      endLine: 11,
      endColumn: 27,
      sourceURL: url,
      hasSourceURLComment: false,
      source: 'console.log("bar");',
    },
  ];
  const OTHER_SCRIPT_ID = '3' as Protocol.Runtime.ScriptId;

  beforeEach(async () => {
    universe = new TestUniverse();
    connection = new MockCDPConnection();
    mockResourceTree(connection);
    target = universe.createTarget({connection});
    const targetManager = target.targetManager();
    targetManager.setScopeTarget(target);
    workspace = universe.workspace;
    resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);

    // Inject the HTML document resource.
    createResource(getMainFrame(target), url, 'text/html', '');
    uiSourceCode = workspace.uiSourceCodeForURL(url) as Workspace.UISourceCode.UISourceCode;
    assert.isNotNull(uiSourceCode);

    // Register the inline <script>s.
    const hash = '';
    const length = 0;
    const embedderName = url;
    const executionContextId = 1;
    debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel) as SDK.DebuggerModel.DebuggerModel;
    SCRIPTS.forEach(({scriptId, startLine, startColumn, endLine, endColumn, sourceURL, hasSourceURLComment}) => {
      debuggerModel.parsedScriptSource(scriptId, sourceURL, startLine, startColumn, endLine, endColumn,
                                       executionContextId, hash, undefined, undefined, hasSourceURLComment, false,
                                       length, false, null, null, null, null, embedderName, null);
    });
    assert.lengthOf(debuggerModel.scripts(), SCRIPTS.length);

    connection.setSuccessHandler('Debugger.getScriptSource', param => {
      return {
        scriptSource: SCRIPTS.find(s => s.scriptId === param.scriptId)?.source ?? '',
      };
    });
  });

  it('creates UISourceCode for added target', () => {
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel)!;
    resourceMapping.modelRemoved(resourceTreeModel);
    assert.isNull(workspace.uiSourceCodeForURL(url));
    resourceMapping.modelAdded(resourceTreeModel);
    assert.isNotNull(workspace.uiSourceCodeForURL(url));
  });

  it('creates UISourceCode for added out of scope target', () => {
    target.targetManager().setScopeTarget(null);

    const otherUrl = urlString`http://example.com/other.html`;
    createResource(getMainFrame(target), otherUrl, 'text/html', '');
    uiSourceCode = workspace.uiSourceCodeForURL(otherUrl) as Workspace.UISourceCode.UISourceCode;
    assert.isNotNull(uiSourceCode);
  });

  describe('inline stylesheet changes', () => {
    const originalCSS = 'body { color: red; }';
    const originalContent = `<style>${originalCSS}</style>`;
    const styleSheetId = 'inline-style' as Protocol.DOM.StyleSheetId;
    let cssModel: SDK.CSSModel.CSSModel;

    beforeEach(() => {
      uiSourceCode.setContent(originalContent, false);
      cssModel = target.model(SDK.CSSModel.CSSModel)!;
      cssModel.styleSheetAdded({
        styleSheetId,
        frameId: getMainFrame(target).id,
        sourceURL: url,
        origin: Protocol.CSS.StyleSheetOrigin.Regular,
        title: '',
        disabled: false,
        isInline: true,
        isMutable: false,
        isConstructed: false,
        startLine: 0,
        startColumn: '<style>'.length,
        endLine: 0,
        endColumn: '<style>'.length + originalCSS.length,
        length: originalCSS.length,
      });
    });

    for (const {
           name,
           newText,
           expectedContent,
         } of [{name: 'does not commit CSSOM notifications without an edit', newText: undefined, expectedContent: null},
               {name: 'does not commit edits with unchanged text', newText: originalCSS, expectedContent: null},
               {
                 name: 'commits inline stylesheet edits that change the document',
                 newText: 'body { color: blue; }',
                 expectedContent: '<style>body { color: blue; }</style>',
               },
    ]) {
      it(name, async () => {
        const committed = sinon.spy();
        workspace.addEventListener(Workspace.Workspace.Events.WorkingCopyCommitted, committed);
        const edit = newText === undefined ?
            undefined :
            new SDK.CSSModel.Edit(styleSheetId, new TextUtils.TextRange.TextRange(0, 0, 0, originalCSS.length), newText,
                                  null);

        cssModel.fireStyleSheetChanged(styleSheetId, edit);
        await new Promise<void>(resolve => setTimeout(resolve, 0));

        if (expectedContent === null) {
          sinon.assert.notCalled(committed);
        } else {
          sinon.assert.calledOnce(committed);
          assert.strictEqual(committed.firstCall.args[0].data.uiSourceCode, uiSourceCode);
          assert.strictEqual(committed.firstCall.args[0].data.content, expectedContent);
        }
      });
    }
  });

  describe('uiLocationToJSLocations', () => {
    it('does not map locations outside of <script> tags', () => {
      assert.isEmpty(resourceMapping.uiLocationToJSLocations(uiSourceCode, 0, 0));
      SCRIPTS.forEach(({startLine, startColumn, endLine, endColumn}) => {
        assert.isEmpty(resourceMapping.uiLocationToJSLocations(uiSourceCode, startLine, startColumn - 1));
        assert.isEmpty(resourceMapping.uiLocationToJSLocations(uiSourceCode, endLine, endColumn));
      });
      assert.isEmpty(resourceMapping.uiLocationToJSLocations(uiSourceCode, 12, 1));
    });

    it('correctly maps inline <script> with a //# sourceURL annotation', () => {
      const {scriptId, startLine, startColumn, endLine, endColumn} = SCRIPTS[0];

      // Debugger locations in scripts with sourceURL annotations are relative to the beginning
      // of the script, rather than relative to the start of the surrounding document.
      assert.deepEqual(resourceMapping.uiLocationToJSLocations(uiSourceCode, startLine, startColumn), [
        debuggerModel.createRawLocationByScriptId(scriptId, 0, 0),
      ]);
      assert.deepEqual(resourceMapping.uiLocationToJSLocations(uiSourceCode, startLine, startColumn + 3), [
        // This location does not actually exist in the simulated document, but
        // the ResourceMapping doesn't know (and shouldn't care) about that.
        debuggerModel.createRawLocationByScriptId(scriptId, 0, 3),
      ]);
      assert.deepEqual(resourceMapping.uiLocationToJSLocations(uiSourceCode, startLine + 1, 5), [
        debuggerModel.createRawLocationByScriptId(scriptId, 1, 5),
      ]);
      assert.deepEqual(resourceMapping.uiLocationToJSLocations(uiSourceCode, endLine - 1, endColumn), [
        debuggerModel.createRawLocationByScriptId(scriptId, endLine - startLine - 1, endColumn),
      ]);
    });

    it('correctly maps inline <script> without //# sourceURL annotation', () => {
      const {scriptId, startLine, startColumn, endLine, endColumn} = SCRIPTS[1];

      // Debugger locations in scripts without sourceURL annotations are relative to the
      // beginning of the surrounding document, so this is basically a 1-1 mapping.
      assert.strictEqual(endLine, startLine);
      for (let column = startColumn; column < endColumn; ++column) {
        assert.deepEqual(resourceMapping.uiLocationToJSLocations(uiSourceCode, startLine, column), [
          debuggerModel.createRawLocationByScriptId(scriptId, startLine, column),
        ]);
      }
    });
  });

  describe('uiLocationRangeToRSLocationRanges', () => {
    it('correctly reports all inline <script>s when querying the whole document', () => {
      const rawLocationRanges = resourceMapping.uiLocationRangeToJSLocationRanges(
          uiSourceCode, new TextUtils.TextRange.TextRange(0, 0, 14, 0));
      assert.exists(rawLocationRanges);
      assert.lengthOf(rawLocationRanges, SCRIPTS.length);
      for (let i = 0; i < SCRIPTS.length; ++i) {
        let {startLine, startColumn, endLine, endColumn} = SCRIPTS[i];
        const {scriptId, hasSourceURLComment} = SCRIPTS[i];
        const {start, end} = rawLocationRanges[i];
        assert.strictEqual(start.scriptId, scriptId);
        assert.strictEqual(end.scriptId, scriptId);
        if (hasSourceURLComment) {
          if (endLine === startLine) {
            endColumn -= startColumn;
          }
          endLine -= startLine;
          startLine = 0;
          startColumn = 0;
        }
        assert.strictEqual(start.lineNumber, startLine);
        assert.strictEqual(start.columnNumber, startColumn);
        assert.strictEqual(end.lineNumber, endLine);
        assert.strictEqual(end.columnNumber, endColumn);
      }
    });
  });

  describe('jsLocationToUILocation', () => {
    it('does not map locations of unrelated scripts', () => {
      assert.isNull(
          resourceMapping.jsLocationToUILocation(debuggerModel.createRawLocationByScriptId(OTHER_SCRIPT_ID, 1, 1)));
      SCRIPTS.forEach(({startLine, startColumn, endLine, endColumn}) => {
        // Check that we also don't reverse map locations that overlap with the existing script locations.
        assert.isNull(resourceMapping.jsLocationToUILocation(
            debuggerModel.createRawLocationByScriptId(OTHER_SCRIPT_ID, startLine, startColumn)));
        assert.isNull(resourceMapping.jsLocationToUILocation(
            debuggerModel.createRawLocationByScriptId(OTHER_SCRIPT_ID, endLine, endColumn)));
      });
    });

    it('correctly maps inline <script> with //# sourceURL annotation', () => {
      const {scriptId, startLine, startColumn, endLine, endColumn} = SCRIPTS[0];

      // Debugger locations in scripts with sourceURL annotations are relative to the beginning
      // of the script, rather than relative to the start of the surrounding document.
      assert.deepEqual(
          resourceMapping.jsLocationToUILocation(debuggerModel.createRawLocationByScriptId(scriptId, 0, 0)),
          new Workspace.UISourceCode.UILocation(uiSourceCode, startLine, startColumn));
      assert.deepEqual(
          resourceMapping.jsLocationToUILocation(debuggerModel.createRawLocationByScriptId(scriptId, 0, 55)),
          // This location does not actually exist in the simulated document, but
          // the ResourceMapping doesn't know (and shouldn't care) about that.
          new Workspace.UISourceCode.UILocation(uiSourceCode, startLine, startColumn + 55));
      assert.deepEqual(
          resourceMapping.jsLocationToUILocation(debuggerModel.createRawLocationByScriptId(scriptId, 2, 0)),
          new Workspace.UISourceCode.UILocation(uiSourceCode, startLine + 2, 0));
      assert.deepEqual(
          resourceMapping.jsLocationToUILocation(
              debuggerModel.createRawLocationByScriptId(scriptId, endLine - startLine, endColumn)),
          new Workspace.UISourceCode.UILocation(uiSourceCode, endLine, endColumn));
    });

    it('correctly maps inline <script> without //# sourceURL annotation', () => {
      const {scriptId, startLine, startColumn, endLine, endColumn} = SCRIPTS[1];

      // Debugger locations in scripts without sourceURL annotations are relative to the
      // beginning of the surrounding document, so this is basically a 1-1 mapping.
      assert.strictEqual(endLine, startLine);
      for (let column = startColumn; column < endColumn; ++column) {
        assert.deepEqual(
            resourceMapping.jsLocationToUILocation(
                debuggerModel.createRawLocationByScriptId(scriptId, startLine, column)),
            new Workspace.UISourceCode.UILocation(uiSourceCode, startLine, column));
      }
    });
  });

  describe('getMappedLines', () => {
    it('reports line numbers for all inline scripts', () => {
      const expectedLines = new Set();
      SCRIPTS.forEach(({startLine, endLine}) => {
        for (let line = startLine; line <= endLine; ++line) {
          expectedLines.add(line);
        }
      });
      const mappedLines = resourceMapping.getMappedLines(uiSourceCode);
      assert.deepEqual(mappedLines, expectedLines);
    });
  });

  describe('functionBoundsAtRawLocation', () => {
    function makeLocation(script: typeof SCRIPTS[number], line: number, column: number): SDK.DebuggerModel.Location {
      return new SDK.DebuggerModel.Location(debuggerModel, script.scriptId, line, column);
    }

    it('finds the function bounds for an inline script', async () => {
      const functionBounds = await resourceMapping.functionBoundsAtRawLocation(makeLocation(SCRIPTS[0], 5, 16));
      assert.isOk(functionBounds);
      assert.strictEqual(functionBounds.name, 'foo');
      assert.strictEqual(functionBounds.range.startLine, 5);
      assert.strictEqual(functionBounds.range.startColumn, 12);
      assert.strictEqual(functionBounds.range.endLine, 5);
      assert.strictEqual(functionBounds.range.endColumn, 38);
    });

    it('finds no function bounds for an inline script with no functions', async () => {
      const functionBounds = await resourceMapping.functionBoundsAtRawLocation(makeLocation(SCRIPTS[1], 11, 9));
      assert.isNotOk(functionBounds);
    });
  });
});

describe('ResourceMapping frame navigation', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let backend: MockDebuggerBackend|null = null;

  afterEach(() => {
    backend?.universe.dispose();
    backend = null;
    Formatter.FormatterWorkerPool.FormatterWorkerPool.removeInstance();
  });

  it('removes old frame UISourceCodes and adds navigated frame UISourceCodes on frame navigation', async () => {
    const inspectedPageUrl = urlString`http://127.0.0.1:8000/devtools/resources/inspected-page.html`;
    const magicFrameUrl = urlString`http://127.0.0.1:8000/devtools/bindings/resources/magic-frame.html`;
    const magicScriptUrl = urlString`http://127.0.0.1:8000/devtools/bindings/resources/magic-script.js`;
    const magicStyleUrl = urlString`http://127.0.0.1:8000/devtools/bindings/resources/magic-style.css`;
    const emptyFrameUrl = urlString`http://127.0.0.1:8000/devtools/bindings/resources/empty-frame.html`;
    const mainFrameId = 'main-frame' as Protocol.Page.FrameId;
    const childFrameId = 'child-frame' as Protocol.Page.FrameId;
    const childLoaderId = 'child-loader' as Protocol.Network.LoaderId;
    const navigatedChildLoaderId = 'navigated-child-loader' as Protocol.Network.LoaderId;
    const mainContextId = 1 as Protocol.Runtime.ExecutionContextId;
    const childContextId = 2 as Protocol.Runtime.ExecutionContextId;
    const navigatedChildContextId = 3 as Protocol.Runtime.ExecutionContextId;
    const styleSheetId = 'magic-style-id' as Protocol.DOM.StyleSheetId;

    backend = new MockDebuggerBackend();
    // Instantiate bindings before creating the target so all model observers attach in startup order.
    void backend.universe.cssWorkspaceBinding;
    void backend.universe.debuggerWorkspaceBinding;
    const {workspace} = backend.universe;

    backend.cdpConnection.setSuccessHandler('Network.enable', () => ({}));
    backend.cdpConnection.setSuccessHandler('Network.setAttachDebugStack', () => ({}));
    backend.cdpConnection.setSuccessHandler('Page.enable', () => ({}));
    backend.cdpConnection.setSuccessHandler('DOM.enable', () => ({}));
    backend.cdpConnection.setSuccessHandler('CSS.enable', () => ({}));
    backend.cdpConnection.setSuccessHandler(
        'Page.getResourceTree',
        () => ({
          frameTree: {
            frame: {
              id: mainFrameId,
              loaderId: 'main-loader' as Protocol.Network.LoaderId,
              url: inspectedPageUrl,
              domainAndRegistry: '127.0.0.1',
              securityOrigin: 'http://127.0.0.1:8000',
              mimeType: 'text/html',
              secureContextType: Protocol.Page.SecureContextType.SecureLocalhost,
              crossOriginIsolatedContextType: Protocol.Page.CrossOriginIsolatedContextType.NotIsolated,
              gatedAPIFeatures: [],
            },
            resources: [
              {
                url: inspectedPageUrl,
                type: Protocol.Network.ResourceType.Document,
                mimeType: 'text/html',
                contentSize: 42,
              },
            ],
          },
        }));

    const target =
        backend.createTarget({id: 'main' as Protocol.Target.TargetID, name: 'main', type: SDK.Target.Type.FRAME});
    backend.universe.targetManager.setScopeTarget(target);
    await getInitializedResourceTreeModel(target);

    backend.cdpConnection.dispatchEvent(
        'Runtime.executionContextCreated',
        {
          context: {
            id: mainContextId,
            origin: 'http://127.0.0.1:8000',
            name: '',
            uniqueId: 'main-ctx',
            auxData: {isDefault: true, frameId: mainFrameId, type: 'default'},
          },
        },
        target.sessionId,
    );

    const snapshotWorkspaceURLs = (): string[] =>
        workspace.uiSourceCodes().map(c => c.url()).sort(Platform.StringUtilities.caseInsensetiveComparator);

    assert.deepEqual(snapshotWorkspaceURLs(), [inspectedPageUrl]);

    backend.cdpConnection.dispatchEvent(
        'Page.frameAttached',
        {frameId: childFrameId, parentFrameId: mainFrameId},
        target.sessionId,
    );
    backend.cdpConnection.dispatchEvent(
        'Page.frameNavigated',
        {
          frame: {
            id: childFrameId,
            parentId: mainFrameId,
            loaderId: childLoaderId,
            url: magicFrameUrl,
            domainAndRegistry: '127.0.0.1',
            securityOrigin: 'http://127.0.0.1:8000',
            mimeType: 'text/html',
            secureContextType: Protocol.Page.SecureContextType.SecureLocalhost,
            crossOriginIsolatedContextType: Protocol.Page.CrossOriginIsolatedContextType.NotIsolated,
            gatedAPIFeatures: [],
          },
          type: Protocol.Page.NavigationType.Navigation,
        },
        target.sessionId,
    );
    backend.cdpConnection.dispatchEvent(
        'Runtime.executionContextCreated',
        {
          context: {
            id: childContextId,
            origin: 'http://127.0.0.1:8000',
            name: '',
            uniqueId: 'child-ctx',
            auxData: {isDefault: true, frameId: childFrameId, type: 'default'},
          },
        },
        target.sessionId,
    );
    backend.cdpConnection.dispatchEvent(
        'CSS.styleSheetAdded',
        {
          header: {
            styleSheetId,
            frameId: childFrameId,
            sourceURL: magicStyleUrl,
            origin: Protocol.CSS.StyleSheetOrigin.Regular,
            title: '',
            disabled: false,
            isInline: false,
            isMutable: false,
            isConstructed: false,
            loadingFailed: false,
            startLine: 0,
            startColumn: 0,
            length: 0,
            endLine: 0,
            endColumn: 0,
          },
        },
        target.sessionId,
    );
    const magicScript = await backend.addScript(
        target,
        {
          url: magicScriptUrl,
          content: 'console.log("magic");',
          executionContextId: childContextId,
          hasSourceURL: false,
        },
        null,
    );
    const magicVmUrl = `debugger:///VM${magicScript.scriptId} magic-script.js`;

    assert.deepEqual(
        snapshotWorkspaceURLs(),
        [
          magicVmUrl,
          magicFrameUrl,
          magicScriptUrl,
          magicStyleUrl,
          inspectedPageUrl,
        ].sort(Platform.StringUtilities.caseInsensetiveComparator),
    );

    backend.cdpConnection.dispatchEvent(
        'CSS.styleSheetRemoved',
        {styleSheetId},
        target.sessionId,
    );
    backend.cdpConnection.dispatchEvent(
        'Runtime.executionContextDestroyed',
        {executionContextId: childContextId, executionContextUniqueId: 'child-ctx'},
        target.sessionId,
    );
    backend.cdpConnection.dispatchEvent(
        'Page.frameNavigated',
        {
          frame: {
            id: childFrameId,
            parentId: mainFrameId,
            loaderId: navigatedChildLoaderId,
            url: emptyFrameUrl,
            domainAndRegistry: '127.0.0.1',
            securityOrigin: 'http://127.0.0.1:8000',
            mimeType: 'text/html',
            secureContextType: Protocol.Page.SecureContextType.SecureLocalhost,
            crossOriginIsolatedContextType: Protocol.Page.CrossOriginIsolatedContextType.NotIsolated,
            gatedAPIFeatures: [],
          },
          type: Protocol.Page.NavigationType.Navigation,
        },
        target.sessionId,
    );
    backend.cdpConnection.dispatchEvent(
        'Runtime.executionContextCreated',
        {
          context: {
            id: navigatedChildContextId,
            origin: 'http://127.0.0.1:8000',
            name: '',
            uniqueId: 'navigated-child-ctx',
            auxData: {isDefault: true, frameId: childFrameId, type: 'default'},
          },
        },
        target.sessionId,
    );

    assert.isNull(workspace.uiSourceCodeForURL(magicFrameUrl));
    assert.isNull(workspace.uiSourceCodeForURL(magicScriptUrl));
    assert.isNull(workspace.uiSourceCodeForURL(magicStyleUrl));
    assert.deepEqual(
        snapshotWorkspaceURLs(),
        [
          magicVmUrl,
          emptyFrameUrl,
          inspectedPageUrl,
        ].sort(Platform.StringUtilities.caseInsensetiveComparator),
    );
  });
});
