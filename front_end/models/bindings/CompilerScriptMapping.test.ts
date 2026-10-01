// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import type * as Protocol from '../../generated/protocol.js';
import {MockDebuggerBackend} from '../../testing/MockScopeChain.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {encodeSourceMap, waitForAllSourceMapsProcessed} from '../../testing/SourceMapEncoder.js';
import {protocolCallFrame, stringifyFrame} from '../../testing/StackTraceHelpers.js';
import * as ScopesCodec from '../../third_party/source-map-scopes-codec/source-map-scopes-codec.js';
import * as Formatter from '../formatter/formatter.js';
import type * as StackTrace from '../stack_trace/stack_trace.js';
// eslint-disable-next-line @devtools/es-modules-import
import * as StackTraceImpl from '../stack_trace/stack_trace_impl.js';
import * as Workspace from '../workspace/workspace.js';

import * as Bindings from './bindings.js';

const {urlString} = Platform.DevToolsPath;

describe('CompilerScriptMapping', () => {
  setupRuntimeHooks();
  setupSettingsHooks();

  let backend: MockDebuggerBackend;
  let debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding;
  let workspace: Workspace.Workspace.WorkspaceImpl;

  beforeEach(() => {
    backend = new MockDebuggerBackend();
    ({debuggerWorkspaceBinding, workspace} = backend.universe);
  });

  afterEach(async () => {
    await waitForAllSourceMapsProcessed();
    Formatter.FormatterWorkerPool.FormatterWorkerPool.removeInstance();
  });

  const waitForUISourceCodeAdded =
      (url: string, target: SDK.Target.Target): Promise<Workspace.UISourceCode.UISourceCode> =>
          debuggerWorkspaceBinding.waitForUISourceCodeAdded(urlString`${url}`, target);
  const waitForUISourceCodeRemoved = (uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> =>
      new Promise(resolve => {
        const {eventType, listener} =
            workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRemoved, event => {
              if (event.data === uiSourceCode) {
                workspace.removeEventListener(eventType, listener);
                resolve();
              }
            });
      });

  it('creates UISourceCodes with the correct content type', async () => {
    const target = backend.createTarget();

    const sourceRoot = 'http://example.com';
    const sources = ['foo.js', 'bar.ts', 'baz.jsx'];
    const scriptInfo = {url: `${sourceRoot}/bundle.js`, content: '1;\n'};
    const sourceMapInfo = {url: `${scriptInfo.url}.map`, content: {version: 3, mappings: '', sourceRoot, sources}};

    await Promise.all([
      ...sources.map(name => waitForUISourceCodeAdded(`${sourceRoot}/${name}`, target).then(uiSourceCode => {
        assert.isTrue(uiSourceCode.contentType().isFromSourceMap());
        assert.isTrue(uiSourceCode.contentType().isScript());
      })),
      backend.addScript(target, scriptInfo, sourceMapInfo),
    ]);
  });

  it('assigns the script network origin to the compiled source project and id', async () => {
    const target = backend.createTarget();

    const sourceRoot = 'http://example.com';
    const sources = ['foo.ts'];
    const scriptInfo = {
      url: 'http://attacker.com/bundle.js',
      embedderName: 'http://attacker.com/bundle.js',
      content: '1;\n',
    };
    const sourceMapInfo = {url: `${scriptInfo.url}.map`, content: {version: 3, mappings: '', sourceRoot, sources}};

    const [uiSourceCode] = await Promise.all([
      waitForUISourceCodeAdded(`${sourceRoot}/foo.ts`, target),
      backend.addScript(target, scriptInfo, sourceMapInfo),
    ]);

    const project = uiSourceCode.project();
    assert.strictEqual(project.securityOrigin()?.siteId(), 'http://attacker.com');
    assert.isTrue(project.id().includes('http://attacker.com'));
  });

  it('assigns an opaque security origin to the compiled source project for data URL scripts', async () => {
    const target = backend.createTarget();

    const sourceRoot = 'http://example.com';
    const sources = ['foo.ts'];
    const scriptInfo = {
      url: 'data:text/javascript,console.log(1)',
      embedderName: 'data:text/javascript,console.log(1)',
      content: 'console.log(1);\n',
    };
    const sourceMapInfo = {
      url: 'http://attacker.com/bundle.js.map',
      content: {version: 3, mappings: '', sourceRoot, sources},
    };

    const [uiSourceCode] = await Promise.all([
      waitForUISourceCodeAdded(`${sourceRoot}/foo.ts`, target),
      backend.addScript(target, scriptInfo, sourceMapInfo),
    ]);

    const project = uiSourceCode.project();
    assert.strictEqual(project.id(), `jsSourceMaps::${target.id()}`);
    assert.isNotNull(project.securityOrigin());
    assert.isTrue(project.securityOrigin()?.isOpaque());
  });

  it('ignores spoofed sourceURL when embedderName is empty or eval', async () => {
    const target = backend.createTarget();

    const sourceRoot = 'http://example.com';
    const sources = ['foo.ts'];
    const scriptInfo = {
      url: 'http://example.com/spoofed.js',
      hasSourceURL: true,
      embedderName: '',
      content: 'console.log(1);\n//# sourceURL=http://example.com/spoofed.js\n',
    };
    const sourceMapInfo = {
      url: 'http://attacker.com/bundle.js.map',
      content: {version: 3, mappings: '', sourceRoot, sources},
    };

    const [uiSourceCode] = await Promise.all([
      waitForUISourceCodeAdded(`${sourceRoot}/foo.ts`, target),
      backend.addScript(target, scriptInfo, sourceMapInfo),
    ]);

    const project = uiSourceCode.project();
    assert.strictEqual(project.id(), `jsSourceMaps::${target.id()}`);
    assert.isNotNull(project.securityOrigin());
    assert.isTrue(project.securityOrigin()?.isOpaque());
  });

  it('removes webpack hashes from display names', async () => {
    const target = backend.createTarget();

    const sourceRoot = 'http://example.com';
    const sources = ['foo.js?a1b2', 'two%20words.ts?c3d4', '?e5f6'];
    const scriptInfo = {url: `${sourceRoot}/bundle.js`, content: '1;\n'};
    const sourceMapInfo = {url: `${scriptInfo.url}.map`, content: {version: 3, mappings: '', sourceRoot, sources}};

    const namesPromise = Promise.all(
        sources.map(
            name =>
                waitForUISourceCodeAdded(`${sourceRoot}/${name}`, target).then(uiSourceCode => uiSourceCode.name())),
    );
    await backend.addScript(target, scriptInfo, sourceMapInfo);

    assert.deepEqual(await namesPromise, ['foo.js', 'two words.ts', '?e5f6']);
  });

  it('creates UISourceCodes with the correct media type', async () => {
    const target = backend.createTarget();

    const sourceRoot = 'http://example.com';
    const scriptInfo = {
      url: `${sourceRoot}/bundle.js`,
      content: 'foo();\nbar();\nbaz();\n',
    };
    const sourceMapInfo = {
      url: `${scriptInfo.url}.map`,
      content: encodeSourceMap(['0:0 => foo.js:0:0', '1:0 => bar.ts:0:0', '2:0 => baz.jsx:0:0'], sourceRoot),
    };

    const [fooUISourceCode, barUISourceCode, bazUISourceCode] = await Promise.all([
      waitForUISourceCodeAdded(`${sourceRoot}/foo.js`, target),
      waitForUISourceCodeAdded(`${sourceRoot}/bar.ts`, target),
      waitForUISourceCodeAdded(`${sourceRoot}/baz.jsx`, target),
      backend.addScript(target, scriptInfo, sourceMapInfo),
    ]);

    assert.strictEqual(fooUISourceCode.mimeType(), 'text/javascript');
    assert.strictEqual(barUISourceCode.mimeType(), 'text/typescript');
    assert.strictEqual(bazUISourceCode.mimeType(), 'text/jsx');
  });

  it('creates UISourceCodes with the correct content and metadata', async () => {
    const target = backend.createTarget();

    const sourceRoot = 'http://example.com';
    const sourceContent = 'const x = 1; console.log(x)';
    const scriptInfo = {
      url: `${sourceRoot}/script.min.js`,
      content: 'console.log(1);',
    };
    const sourceMapInfo = {
      url: `${scriptInfo.url}.map`,
      content: {version: 1, mappings: '', sources: ['script.js'], sourcesContent: [sourceContent], sourceRoot},
    };
    const [uiSourceCode] = await Promise.all([
      waitForUISourceCodeAdded(`${sourceRoot}/script.js`, target),
      backend.addScript(target, scriptInfo, sourceMapInfo),
    ]);

    const metadata = await uiSourceCode.requestMetadata();
    assert.strictEqual(metadata?.contentSize, sourceContent.length);

    const content = await uiSourceCode.requestContentData();
    assert.instanceOf(content, TextUtils.ContentData.ContentData);
    assert.strictEqual(content.text, sourceContent);
  });

  it('creates separate UISourceCodes for separate targets', async () => {
    // Create a main target and a worker child target.
    const mainTarget = backend.createTarget({
      id: 'main' as Protocol.Target.TargetID,
      type: SDK.Target.Type.FRAME,
    });
    const workerTarget = backend.createTarget({
      id: 'worker' as Protocol.Target.TargetID,
      type: SDK.Target.Type.ServiceWorker,
      parentTarget: mainTarget,
    });

    const sourceRoot = 'http://example.com';
    const scriptInfo = {
      url: `${sourceRoot}/script.min.js`,
      content: 'console.log(1);',
    };
    const sourceMapInfo = {
      url: `${scriptInfo.url}.map`,
      content: encodeSourceMap(['0:0 => script.js:0:0'], sourceRoot),
    };

    // Register the same script for both targets, and wait until the `CompilerScriptMapping`
    // adds a UISourceCode for the `script.js` that is listed in the source map for each of
    // the two targets.
    const [mainUISourceCode, mainScript, workerUISourceCode, workerScript] = await Promise.all([
      waitForUISourceCodeAdded(`${sourceRoot}/script.js`, mainTarget),
      backend.addScript(mainTarget, scriptInfo, sourceMapInfo),
      waitForUISourceCodeAdded(`${sourceRoot}/script.js`, workerTarget),
      backend.addScript(workerTarget, scriptInfo, sourceMapInfo),
    ]);

    assert.notStrictEqual(mainUISourceCode, workerUISourceCode);
    for (const {script, uiSourceCode} of
             [{script: mainScript, uiSourceCode: mainUISourceCode},
              {script: workerScript, uiSourceCode: workerUISourceCode}]) {
      const rawLocations = await debuggerWorkspaceBinding.uiLocationToRawLocations(uiSourceCode, 0, 0);
      assert.lengthOf(rawLocations, 1);
      const [rawLocation] = rawLocations;
      assert.strictEqual(rawLocation.script(), script);
      const uiLocation = await debuggerWorkspaceBinding.rawLocationToUILocation(rawLocation);
      assert.strictEqual(uiLocation!.uiSourceCode, uiSourceCode);
    }

    await Promise.all([
      mainTarget.model(SDK.DebuggerModel.DebuggerModel)!.sourceMapManager().waitForSourceMapsProcessedForTest(),
      workerTarget.model(SDK.DebuggerModel.DebuggerModel)!.sourceMapManager().waitForSourceMapsProcessedForTest(),
    ]);
  });

  it('creates separate UISourceCodes for content scripts', async () => {
    // By default content scripts are ignore listed, which will prevent processing the
    // source map. We need to disable that option.
    backend.universe.ignoreListManager.unIgnoreListContentScripts();

    const target = backend.createTarget();

    const sourceRoot = 'http://example.com';
    const scriptInfo = {
      url: `${sourceRoot}/script.min.js`,
      content: 'console.log(1);',
    };
    const sourceMapInfo = {
      url: `${scriptInfo.url}.map`,
      content: encodeSourceMap(['0:0 => script.js:0:0'], sourceRoot),
    };

    // Register `script.min.js` as regular script first.
    const regularScriptInfo = {...scriptInfo, isContentScript: false};
    const [regularUISourceCode, regularScript] = await Promise.all([
      waitForUISourceCodeAdded(`${sourceRoot}/script.js`, target),
      backend.addScript(target, regularScriptInfo, sourceMapInfo),
    ]);

    // Now register the same `script.min.js` as content script.
    const contentScriptInfo = {...scriptInfo, isContentScript: true};
    const [contentUISourceCode, contentScript] = await Promise.all([
      waitForUISourceCodeAdded(`${sourceRoot}/script.js`, target),
      backend.addScript(target, contentScriptInfo, sourceMapInfo),
    ]);

    assert.notStrictEqual(regularUISourceCode, contentUISourceCode);
    for (const {script, uiSourceCode} of
             [{script: regularScript, uiSourceCode: regularUISourceCode},
              {script: contentScript, uiSourceCode: contentUISourceCode}]) {
      const rawLocations = await debuggerWorkspaceBinding.uiLocationToRawLocations(uiSourceCode, 0, 0);
      assert.lengthOf(rawLocations, 1);
      const [rawLocation] = rawLocations;
      assert.strictEqual(rawLocation.script(), script);
      const uiLocation = await debuggerWorkspaceBinding.rawLocationToUILocation(rawLocation);
      assert.strictEqual(uiLocation!.uiSourceCode, uiSourceCode);
    }
  });

  it('correctly marks known 3rdparty UISourceCodes', async () => {
    const target = backend.createTarget();

    const sourceRoot = 'http://example.com';
    const scriptInfo = {
      url: `${sourceRoot}/bundle.js`,
      content: '1;\n',
    };
    const sourceMapInfo = {
      url: `${scriptInfo.url}.map`,
      content: {
        version: 3,
        mappings: '',
        sourceRoot,
        sources: ['app.ts', 'lib.ts'],
        ignoreList: [1],
      },
    };

    await Promise.all([
      waitForUISourceCodeAdded(`${sourceRoot}/app.ts`, target).then(uiSourceCode => {
        assert.isFalse(uiSourceCode.isKnownThirdParty(), '`app.ts` is not a known 3rdparty script');
      }),
      waitForUISourceCodeAdded(`${sourceRoot}/lib.ts`, target).then(uiSourceCode => {
        assert.isTrue(uiSourceCode.isKnownThirdParty(), '`lib.ts` is a known 3rdparty script');
      }),
      backend.addScript(target, scriptInfo, sourceMapInfo),
    ]);
  });

  it('correctly maps to inline <script>s with `//# sourceURL` annotations', async () => {
    const target = backend.createTarget();

    const sourceRoot = 'http://example.com';
    const scriptInfo = {
      url: `${sourceRoot}/test.out.js`,
      content: 'function f(x) {\n  console.log(x);\n}\n',
      startLine: 4,
      startOffset: 12,
      hasSourceURL: true,
    };
    const sourceMapInfo = {
      url: `${scriptInfo.url}.map`,
      content: encodeSourceMap(
          [
            '0:0 => test.ts:0:0',
            '1:0 => test.ts:1:0',
            '1:2 => test.ts:1:2',
            '2:0 => test.ts:2:0',
          ],
          sourceRoot),
    };

    const [uiSourceCode, script] = await Promise.all([
      waitForUISourceCodeAdded(`${sourceRoot}/test.ts`, target),
      backend.addScript(target, scriptInfo, sourceMapInfo),
    ]);

    const rawLocations = await debuggerWorkspaceBinding.uiLocationToRawLocations(uiSourceCode, 1, 2);
    assert.lengthOf(rawLocations, 1);
    const [rawLocation] = rawLocations;
    assert.strictEqual(rawLocation.script(), script);
    assert.strictEqual(rawLocation.lineNumber, 1);
    assert.strictEqual(rawLocation.columnNumber, 2);
    const uiLocation = await debuggerWorkspaceBinding.rawLocationToUILocation(rawLocation);
    assert.strictEqual(uiLocation!.uiSourceCode, uiSourceCode);
    assert.strictEqual(uiLocation!.lineNumber, 1);
    assert.strictEqual(uiLocation!.columnNumber, 2);
  });

  it('correctly removes UISourceCodes when detaching a sourcemap', async () => {
    const target = backend.createTarget();

    const sourceRoot = 'http://example.com';
    const scriptInfo = {
      url: `${sourceRoot}/test.out.js`,
      content: '1\n2\n',
    };
    const sourceMapInfo = {
      url: `${scriptInfo.url}.map`,
      content: encodeSourceMap(
          [
            '0:0 => a.ts:0:0',
            '1:0 => b.ts:1:0',
          ],
          sourceRoot),
    };

    const [, , script] = await Promise.all([
      waitForUISourceCodeAdded(`${sourceRoot}/a.ts`, target),
      waitForUISourceCodeAdded(`${sourceRoot}/b.ts`, target),
      backend.addScript(target, scriptInfo, sourceMapInfo),
    ]);

    script.debuggerModel.sourceMapManager().detachSourceMap(script);

    assert.isNull(
        workspace.uiSourceCodeForURL(urlString`${`${sourceRoot}/a.ts`}`), '`a.ts` should not be around anymore');
    assert.isNull(
        workspace.uiSourceCodeForURL(urlString`${`${sourceRoot}/b.ts`}`), '`b.ts` should not be around anymore');
  });

  it('correctly reports source-mapped lines', async () => {
    const target = backend.createTarget();

    const sourceRoot = 'http://example.com';
    const scriptInfo = {
      url: `${sourceRoot}/test.out.js`,
      content: 'function f(x) {\n  console.log(x);\n}\n',
    };
    const sourceMapInfo = {
      url: `${scriptInfo.url}.map`,
      content: encodeSourceMap(
          [
            '0:9 => test.ts:0:1',
            '1:0 => test.ts:4:0',
            '1:2 => test.ts:4:2',
            '2:0 => test.ts:2:0',
          ],
          sourceRoot),
    };

    const [uiSourceCode] = await Promise.all([
      waitForUISourceCodeAdded(`${sourceRoot}/test.ts`, target),
      backend.addScript(target, scriptInfo, sourceMapInfo),
    ]);

    const mappedLines = await debuggerWorkspaceBinding.getMappedLines(uiSourceCode);
    assert.deepEqual(mappedLines, new Set([0, 2, 4]));
  });

  it('correctly maps to multiple raw locations if the source map has multiple entries for a single source line/column',
     async () => {
       const target = backend.createTarget();

       const sourceRoot = 'http://example.com';
       const scriptInfo = {
         url: `${sourceRoot}/test.out.js`,
         content: 'const f = x => x;\n',
       };
       const sourceMapInfo = {
         url: `${scriptInfo.url}.map`,
         content: encodeSourceMap(
             [
               '0:0 => test.ts:0:0',
               '0:2 => test.ts:0:1',
               '0:5 => test.ts:0:0',
               '1:0 => test.ts:0:2',
               '1:2 => test.ts:0:0',
             ],
             sourceRoot),
       };

       const [uiSourceCode, script] = await Promise.all([
         waitForUISourceCodeAdded(`${sourceRoot}/test.ts`, target),
         backend.addScript(target, scriptInfo, sourceMapInfo),
       ]);

       const rawLocations = await debuggerWorkspaceBinding.uiLocationToRawLocations(uiSourceCode, 0, 0);
       assert.lengthOf(rawLocations, 3);
       assert.deepEqual(rawLocations, [
         script.debuggerModel.createRawLocation(script, 0, 0),
         script.debuggerModel.createRawLocation(script, 0, 5),
         script.debuggerModel.createRawLocation(script, 1, 2),
       ]);
     });

  describe('supports modern Web development workflows', () => {
    it('supports webpack code splitting', async () => {
      // This is basically the "Shared code with webpack entry point code-splitting" scenario
      // outlined in http://go/devtools-source-identities, where two routes (`route1.ts` and
      // `route2.ts`) share some common code (`shared.ts`), and webpack is configured to spit
      // out a dedicated bundle for each route (`route1.js` and `route2.js`). The demo can be
      // found at https://devtools-source-identities.glitch.me/webpack-code-split/ for further
      // reference.
      const target = backend.createTarget();
      const sourceRoot = 'webpack:///src';

      // Load the script and source map for the first route.
      const route1ScriptInfo = {
        url: 'http://example.com/route1.js',
        content: 'function f(x){}\nf(1)',
      };
      const route1SourceMapInfo = {
        url: `${route1ScriptInfo.url}.map`,
        content: encodeSourceMap(['0:0 => shared.ts:0:0', '1:0 => route1.ts:0:0'], sourceRoot),
      };
      const [route1UISourceCode, firstSharedUISourceCode, route1Script] = await Promise.all([
        waitForUISourceCodeAdded(`${sourceRoot}/route1.ts`, target),
        waitForUISourceCodeAdded(`${sourceRoot}/shared.ts`, target),
        backend.addScript(target, route1ScriptInfo, route1SourceMapInfo),
      ]);

      // Both `route1.ts` and `shared.ts` are referred to only by `route1.js` at this point.
      assert.deepEqual(await debuggerWorkspaceBinding.uiLocationToRawLocations(route1UISourceCode, 0), [
        route1Script.debuggerModel.createRawLocation(route1Script, 1, 0),
      ]);
      assert.deepEqual(await debuggerWorkspaceBinding.uiLocationToRawLocations(firstSharedUISourceCode, 0), [
        route1Script.debuggerModel.createRawLocation(route1Script, 0, 0),
      ]);

      // Load the script and source map for the second route. At this point a new `shared.ts` should
      // appear, replacing the original `shared.ts` UISourceCode.
      const route2ScriptInfo = {
        url: 'http://example.com/route2.js',
        content: 'function f(x){}\nf(2)',
      };
      const route2SourceMapInfo = {
        url: `${route2ScriptInfo.url}.map`,
        content: encodeSourceMap(['0:0 => shared.ts:0:0', '1:0 => route2.ts:0:0'], sourceRoot),
      };
      const [route2UISourceCode, secondSharedUISourceCode, route2Script] = await Promise.all([
        waitForUISourceCodeAdded(`${sourceRoot}/route2.ts`, target),
        waitForUISourceCodeAdded(`${sourceRoot}/shared.ts`, target),
        backend.addScript(target, route2ScriptInfo, route2SourceMapInfo),
        waitForUISourceCodeRemoved(firstSharedUISourceCode),
      ]);

      // Now `route1.ts` is provided exclusively by `route1.js`...
      const route1UILocation = route1UISourceCode.uiLocation(0, 0);
      const route1Locations = await debuggerWorkspaceBinding.uiLocationToRawLocations(
          route1UILocation.uiSourceCode, route1UILocation.lineNumber, route1UILocation.columnNumber);
      assert.lengthOf(route1Locations, 1);
      const [route1Location] = route1Locations;
      assert.strictEqual(route1Location.script(), route1Script);
      assert.deepEqual(await debuggerWorkspaceBinding.rawLocationToUILocation(route1Location), route1UILocation);

      // ...and `route2.ts` is provided exclusively by `route2.js`...
      const route2UILocation = route2UISourceCode.uiLocation(0, 0);
      const route2Locations = await debuggerWorkspaceBinding.uiLocationToRawLocations(
          route2UILocation.uiSourceCode, route2UILocation.lineNumber, route2UILocation.columnNumber);
      assert.lengthOf(route2Locations, 1);
      const [route2Location] = route2Locations;
      assert.strictEqual(route2Location.script(), route2Script);
      assert.deepEqual(await debuggerWorkspaceBinding.rawLocationToUILocation(route2Location), route2UILocation);

      // ...but `shared.ts` is provided by both `route1.js` and `route2.js`.
      const sharedUILocation = secondSharedUISourceCode.uiLocation(0, 0);
      const sharedLocations = await debuggerWorkspaceBinding.uiLocationToRawLocations(
          sharedUILocation.uiSourceCode, sharedUILocation.lineNumber, sharedUILocation.columnNumber);
      assert.sameMembers(sharedLocations.map(location => location.script()), [route1Script, route2Script]);
      for (const location of sharedLocations) {
        assert.deepEqual(await debuggerWorkspaceBinding.rawLocationToUILocation(location), sharedUILocation);
      }
    });

    it('supports webpack hot module replacement', async () => {
      // This simulates the webpack HMR machinery, where originally a `bundle.js` is served,
      // which includes embedded authored code for `lib.js` and `app.js`, both of which map
      // to `bundle.js`. Later an update script is sent that replaces `app.js` with a newer
      // version, while sending the same authored code for `lib.js` (presumably because the
      // devserver figured the file might have changed). Now the initial `app.js` should be
      // removed and `bundle.js` will have un-mapped locations for the `app.js` part. The
      // new `app.js` will point to the update script. `lib.js` remains unchanged.
      //
      // This is a generalization of https://crbug.com/1403362 and http://crbug.com/1403432,
      // which both present special cases of the general stale mapping problem.
      const target = backend.createTarget();
      const sourceRoot = 'webpack:///src';

      // Load the original bundle.
      const originalScriptInfo = {
        url: 'http://example.com/bundle.js',
        content: 'const f = console.log;\nf("Hello from the original bundle");',
      };
      const originalSourceMapInfo = {
        url: `${originalScriptInfo.url}.map`,
        content: encodeSourceMap(
            [
              '0:0 => lib.js:0:0',
              'lib.js: const f = console.log;',
              '1:0 => app.js:0:0',
              'app.js: f("Hello from the original bundle")',
            ],
            sourceRoot),
      };
      const [originalLibUISourceCode, originalAppUISourceCode, originalScript] = await Promise.all([
        waitForUISourceCodeAdded(`${sourceRoot}/lib.js`, target),
        waitForUISourceCodeAdded(`${sourceRoot}/app.js`, target),
        backend.addScript(target, originalScriptInfo, originalSourceMapInfo),
      ]);

      // Initially the original `bundle.js` maps to the original `app.js` and `lib.js`.
      assert.deepEqual(
          await debuggerWorkspaceBinding.rawLocationToUILocation(
              originalScript.debuggerModel.createRawLocation(originalScript, 0, 0)),
          originalLibUISourceCode.uiLocation(0, 0));
      assert.deepEqual(
          await debuggerWorkspaceBinding.rawLocationToUILocation(
              originalScript.debuggerModel.createRawLocation(originalScript, 1, 0)),
          originalAppUISourceCode.uiLocation(0, 0));

      // Inject the HMR update script.
      const updateScriptInfo = {
        url: 'http://example.com/hot.update.1234.js',
        content: 'f("Hello from the update");',
      };
      const updateSourceMapInfo = {
        url: `${updateScriptInfo.url}.map`,
        content: encodeSourceMap(
            [
              '0:0 => app.js:0:0',
              'lib.js: const f = console.log;',
              'app.js: f("Hello from the update")',
            ],
            sourceRoot),
      };
      const [updateAppUISourceCode, , updateScript] = await Promise.all([
        waitForUISourceCodeAdded(`${sourceRoot}/app.js`, target),
        // The original `app.js` should disappear as part of the HMR update.
        waitForUISourceCodeRemoved(originalAppUISourceCode),
        backend.addScript(target, updateScriptInfo, updateSourceMapInfo),
      ]);

      // Now we have a new `app.js`...
      assert.notStrictEqual(updateAppUISourceCode, originalAppUISourceCode);
      assert.isEmpty(await debuggerWorkspaceBinding.uiLocationToRawLocations(originalAppUISourceCode, 0, 0));
      assert.deepEqual(await debuggerWorkspaceBinding.uiLocationToRawLocations(updateAppUISourceCode, 0, 0), [
        updateScript.debuggerModel.createRawLocation(updateScript, 0, 0),
      ]);

      // ...and the `app.js` mapping of the `bundle.js` is now gone...
      const {uiSourceCode} = (await debuggerWorkspaceBinding.rawLocationToUILocation(
          originalScript.debuggerModel.createRawLocation(originalScript, 1, 0)))!;
      assert.notStrictEqual(uiSourceCode, originalAppUISourceCode);
      assert.notStrictEqual(uiSourceCode, updateAppUISourceCode);

      // ...while the `lib.js` mapping of `bundle.js` is still intact (because it
      // was the same content).
      assert.deepEqual(
          await debuggerWorkspaceBinding.rawLocationToUILocation(
              originalScript.debuggerModel.createRawLocation(originalScript, 0, 0)),
          originalLibUISourceCode.uiLocation(0, 0));
    });
  });

  it('assumes UTF-8 encoding for source files embedded in source maps', async () => {
    const target = backend.createTarget();

    const sourceRoot = 'http://example.com';
    const sourceContent = 'console.log("Ahoj světe!");';
    const scriptInfo = {
      url: `${sourceRoot}/script.min.js`,
      content: sourceContent,
    };
    const sourceMapInfo = {
      url: `${scriptInfo.url}.map`,
      content: {version: 3, mappings: '', sources: ['script.js'], sourcesContent: [sourceContent], sourceRoot},
    };
    const [uiSourceCode] = await Promise.all([
      waitForUISourceCodeAdded(`${sourceRoot}/script.js`, target),
      backend.addScript(target, scriptInfo, sourceMapInfo),
    ]);

    const metadata = await uiSourceCode.requestMetadata();
    assert.notStrictEqual(metadata?.contentSize, sourceContent.length);
    const sourceUTF8 = new TextEncoder().encode(sourceContent);
    assert.strictEqual(metadata?.contentSize, sourceUTF8.length);
  });

  describe('translateRawFrame', () => {
    it('returns null for builtin frames', async () => {
      const target = backend.createTarget();
      const compilerScriptMapping = new Bindings.CompilerScriptMapping.CompilerScriptMapping(
          target.model(SDK.DebuggerModel.DebuggerModel)!, workspace, debuggerWorkspaceBinding);

      assert.isNull(
          await compilerScriptMapping.translateRawFrame({lineNumber: -1, columnNumber: -1, functionName: 'Array.map'}));
    });

    it('translates a single frame using "proposal scopes" information', async () => {
      const target = backend.createTarget();
      const compilerScriptMapping = new Bindings.CompilerScriptMapping.CompilerScriptMapping(
          target.model(SDK.DebuggerModel.DebuggerModel)!, workspace, debuggerWorkspaceBinding);
      const sourceMap = encodeSourceMap([
        '0:0 => index.ts:0:0',
        '0:21 => index.ts:2:11',
      ]);
      ScopesCodec.encode(new ScopesCodec.ScopeInfoBuilder()
                             .startSource()
                             .startScope(1, 0, {isStackFrame: true, name: 'foo', key: 'fn'})
                             .endScope(3, 1)
                             .endSource()
                             .startRange(0, 10, {isStackFrame: true, scopeKey: 'fn'})
                             .endRange(0, 23)
                             .build(),
                         sourceMap as ScopesCodec.SourceMapJson);

      const uiSourceCodePromise = waitForUISourceCodeAdded('http://example.com/index.ts', target);
      const script =
          await backend.addScript(target, {url: 'http://example.com/index.js', content: 'function f(){debugger;}'}, {
            url: 'http://example.com/index.js.map',
            content: sourceMap,
          });

      const translatedFrame = await compilerScriptMapping.translateRawFrame({
        scriptId: script.scriptId,
        url: script.sourceURL,
        lineNumber: 0,
        columnNumber: 21,
        functionName: 'f',
      });
      assert.deepEqual(translatedFrame, {
        kind: StackTraceImpl.Trie.FrameKind.VISIBLE,
        frames: [{
          line: 2,
          column: 11,
          name: 'foo',
          uiSourceCode: await uiSourceCodePromise,
          url: undefined,
        }],
        functionKeys: {
          top: 'http://example.com/index.ts\nfoo\n1:0',
          bottom: 'http://example.com/index.ts\nfoo\n1:0',
        },
      });
    });

    it('translates a single frame using "fallback" scope information (created from AST and mappigns)', async () => {
      const target = backend.createTarget();
      const compilerScriptMapping = new Bindings.CompilerScriptMapping.CompilerScriptMapping(
          target.model(SDK.DebuggerModel.DebuggerModel)!, workspace, debuggerWorkspaceBinding);
      const sourceMap = encodeSourceMap([
        '0:0 => index.ts:0:0',
        '0:10 => index.ts:1:10@foo',
        '0:21 => index.ts:2:11',
      ]);

      const uiSourceCodePromise = waitForUISourceCodeAdded('http://example.com/index.ts', target);
      const script =
          await backend.addScript(target, {url: 'http://example.com/index.js', content: 'function f(){debugger;}'}, {
            url: 'http://example.com/index.js.map',
            content: sourceMap,
          });

      const translatedFrame = await compilerScriptMapping.translateRawFrame({
        scriptId: script.scriptId,
        url: script.sourceURL,
        lineNumber: 0,
        columnNumber: 21,
        functionName: 'f',
      });
      assert.deepEqual(translatedFrame, {
        kind: StackTraceImpl.Trie.FrameKind.VISIBLE,
        frames: [{
          line: 2,
          column: 11,
          name: 'foo',
          uiSourceCode: await uiSourceCodePromise,
          url: undefined,
        }],
        functionKeys: {
          top: 'http://example.com/index.ts\nfoo\n1:10',
          bottom: 'http://example.com/index.ts\nfoo\n1:10',
        },
      });
    });

    it('expands inlined frames and populates UISourceCode', async () => {
      const target = backend.createTarget();
      const compilerScriptMapping = new Bindings.CompilerScriptMapping.CompilerScriptMapping(
          target.model(SDK.DebuggerModel.DebuggerModel)!, workspace, debuggerWorkspaceBinding);
      //
      //    orig. code                         gen. code
      //             10        20                       10        20
      //    012345678901234567890              012345678901234567890
      //
      // 0: function inner() {                 print('hello')
      // 1:   print('hello');
      // 2: }
      // 3:
      // 4: function outer() {
      // 5:   if (true) {
      // 6:     inner();
      // 7:   }
      // 8: }
      // 9:
      // 10: outer();

      const builder = new ScopesCodec.ScopeInfoBuilder();
      builder.startSource()
          .startScope(0, 0, {kind: 'global', key: 'global'})
          .startScope(0, 14, {kind: 'function', name: 'inner', key: 'inner', isStackFrame: true})
          .endScope(2, 1)
          .startScope(4, 14, {kind: 'function', name: 'outer', key: 'outer', isStackFrame: true})
          .startScope(5, 12, {kind: 'block', key: 'block'})
          .endScope(7, 3)
          .endScope(8, 1)
          .endScope(11, 0)
          .endSource();

      builder.startRange(0, 0, {scopeKey: 'global'})
          .startRange(0, 0, {scopeKey: 'outer', callSite: {sourceIndex: 0, line: 10, column: 5}})
          .startRange(0, 0, {scopeKey: 'block'})
          .startRange(0, 0, {scopeKey: 'inner', callSite: {sourceIndex: 0, line: 6, column: 9}})
          .endRange(0, 14)
          .endRange(0, 14)
          .endRange(0, 14)
          .endRange(1, 0);

      const sourceMap =
          ScopesCodec.encode(builder.build(), encodeSourceMap(['0:5 => index.ts:1:7']) as ScopesCodec.SourceMapJson);
      const script =
          await backend.addScript(target, {url: 'http://example.com/index.js', content: 'print(\'hello\')'}, {
            url: 'http://example.com/index.js.map',
            content: sourceMap as SDK.SourceMap.SourceMapV3,
          });

      const translatedFrame = await compilerScriptMapping.translateRawFrame(
          protocolCallFrame(`${script.sourceURL}:${script.scriptId}::0:5`));

      assert.exists(translatedFrame);
      assert.deepEqual(translatedFrame.frames.map(stringifyFrame), [
        'at inner (index.ts:1:7)',
        'at outer (index.ts:6:9)',
        'at <anonymous> (index.ts:10:5)',
      ]);

      const uiSourceCode = compilerScriptMapping.uiSourceCodeForURL(urlString`http://example.com/index.ts`, false);
      assert.exists(uiSourceCode);
      assert.strictEqual(translatedFrame.frames[0].uiSourceCode, uiSourceCode);
      assert.strictEqual(translatedFrame.frames[1].uiSourceCode, uiSourceCode);
      assert.strictEqual(translatedFrame.frames[2].uiSourceCode, uiSourceCode);
    });

    it('expands inlined frames for inline scripts with line and column offsets', async () => {
      const target = backend.createTarget();
      const compilerScriptMapping = new Bindings.CompilerScriptMapping.CompilerScriptMapping(
          target.model(SDK.DebuggerModel.DebuggerModel)!, workspace, debuggerWorkspaceBinding);

      // Same as above, but the generated code is an inline <script> at line 4, column 10 of the document.
      // Raw V8 positions are relative to the document, while the source map is relative to the script.
      const builder = new ScopesCodec.ScopeInfoBuilder();
      builder.startSource()
          .startScope(0, 0, {kind: 'global', key: 'global'})
          .startScope(0, 14, {kind: 'function', name: 'inner', key: 'inner', isStackFrame: true})
          .endScope(2, 1)
          .startScope(4, 14, {kind: 'function', name: 'outer', key: 'outer', isStackFrame: true})
          .endScope(8, 1)
          .endScope(11, 0)
          .endSource();

      builder.startRange(0, 0, {scopeKey: 'global'})
          .startRange(0, 0, {scopeKey: 'outer', callSite: {sourceIndex: 0, line: 10, column: 5}})
          .startRange(0, 0, {scopeKey: 'inner', callSite: {sourceIndex: 0, line: 6, column: 9}})
          .endRange(0, 14)
          .endRange(0, 14)
          .endRange(1, 0);

      const sourceMap =
          ScopesCodec.encode(builder.build(), encodeSourceMap(['0:5 => index.ts:1:7']) as ScopesCodec.SourceMapJson);
      const script = await backend.addScript(
          target, {url: 'http://example.com/index.html', content: 'print(\'hello\')', startLine: 4, startColumn: 10}, {
            url: 'http://example.com/index.js.map',
            content: sourceMap as SDK.SourceMap.SourceMapV3,
          });

      const translatedFrame = await compilerScriptMapping.translateRawFrame(
          protocolCallFrame(`${script.sourceURL}:${script.scriptId}::4:15`));

      assert.deepEqual(translatedFrame?.frames.map(stringifyFrame), [
        'at inner (index.ts:1:7)',
        'at outer (index.ts:6:9)',
        'at <anonymous> (index.ts:10:5)',
      ]);
    });

    describe('outlining', () => {
      let target: SDK.Target.Target;
      let compilerScriptMapping: Bindings.CompilerScriptMapping.CompilerScriptMapping;

      beforeEach(() => {
        target = backend.createTarget();
        compilerScriptMapping = new Bindings.CompilerScriptMapping.CompilerScriptMapping(
            target.model(SDK.DebuggerModel.DebuggerModel)!, workspace, debuggerWorkspaceBinding);
      });

      async function addScriptWithScopes(url: string, content: string, builder: ScopesCodec.ScopeInfoBuilder,
                                         mappings: string[]): Promise<SDK.Script.Script> {
        const sourceMap = ScopesCodec.encode(builder.build(), encodeSourceMap(mappings) as ScopesCodec.SourceMapJson);
        return await backend.addScript(target, {url, content},
                                       {url: `${url}.map`, content: sourceMap as SDK.SourceMap.SourceMapV3});
      }

      function rawFrame(script: SDK.Script.Script, name: string, line: number,
                        column: number): Protocol.Runtime.CallFrame {
        return protocolCallFrame(`${script.sourceURL}:${script.scriptId}:${name}:${line}:${column}`);
      }

      const builtinFrame = (name: string): Protocol.Runtime.CallFrame => protocolCallFrame(`::${name}::`);

      /** The function key of an authored function in `index.ts`, starting at `start`. */
      const key = (name: string, start: string): string => `http://example.com/index.ts\n${name}\n${start}`;

      interface Translation {
        kind: StackTraceImpl.Trie.FrameKind;
        frames: string[];
        functionKeys?: StackTraceImpl.Trie.FunctionKeys;
        unmapped?: boolean;
      }

      /** Translates a single raw frame with the `compilerScriptMapping` under test, with stringified frames. */
      async function translateFrame(rawFrame: Protocol.Runtime.CallFrame): Promise<Translation|null> {
        const translation = await compilerScriptMapping.translateRawFrame(rawFrame);
        return translation && {...translation, frames: translation.frames.map(stringifyFrame)};
      }

      /** Translates the whole stack trace end-to-end via the {@link Bindings.DebuggerWorkspaceBinding}. */
      async function translateStackTrace(rawFrames: Protocol.Runtime.CallFrame[]): Promise<string[]> {
        const stackTrace =
            await debuggerWorkspaceBinding.createStackTraceFromProtocolRuntime({callFrames: rawFrames}, target);
        return stackTrace.syncFragment.frames.map(stringifyFrame);
      }

      /**
       * Like {@link translateStackTrace}, but via an `Error.stack` string. The exception details provide the
       * script IDs, which `Error.stack` lacks.
       */
      async function translateErrorStack(rawFrames: Protocol.Runtime.CallFrame[]):
          Promise<StackTrace.StackTrace.ParsedErrorStackTrace> {
        const lines =
            rawFrames.map(f => f.url ? `    at ${f.functionName} (${f.url}:${f.lineNumber + 1}:${f.columnNumber + 1})` :
                                       `    at ${f.functionName} (<anonymous>)`);
        const stackTrace = await debuggerWorkspaceBinding.createStackTraceFromErrorStackLikeString(
            target, ['Error', ...lines].join('\n'),
            {exceptionId: 1, text: 'Error', lineNumber: 0, columnNumber: 0, stackTrace: {callFrames: rawFrames}});
        assert.exists(stackTrace);
        return stackTrace;
      }

      describe('with a block scope outlined into a function', () => {
        //
        //    orig. code                         gen. code
        //             10        20                       10        20        30
        //    012345678901234567890              0123456789012345678901234567890123456789
        //
        // 0: function outer() {                 function outer(){_loop();_call(_loop)}
        // 1:   {                                function _loop(){log(x)}
        // 2:     log(x);                        function main(){outer()}
        // 3:   }                                function _call(f){f()}
        // 4: }                                  function other(){_loop()}
        // 5: function main() {
        // 6:   outer();
        // 7: }
        // 8: function other() {
        // 9:   log(y);
        // 10: }
        //
        // The block in `outer` is outlined into `_loop` (hidden, with definition). `_call` is a compiler helper
        // (no definition). `other` calling `_loop` is inconsistent: The block belongs to `outer`.
        const content = [
          'function outer(){_loop();_call(_loop)}',
          'function _loop(){log(x)}',
          'function main(){outer()}',
          'function _call(f){f()}',
          'function other(){_loop()}',
        ].join('\n');

        let script: SDK.Script.Script;

        function buildScopes(): ScopesCodec.ScopeInfoBuilder {
          const builder = new ScopesCodec.ScopeInfoBuilder();
          builder.startSource()
              .startScope(0, 0, {kind: 'global', key: 'global'})
              .startScope(0, 14, {kind: 'function', name: 'outer', key: 'outer', isStackFrame: true})
              .startScope(1, 2, {kind: 'block', key: 'block'})
              .endScope(3, 3)
              .endScope(4, 1)
              .startScope(5, 13, {kind: 'function', name: 'main', key: 'main', isStackFrame: true})
              .endScope(7, 1)
              .startScope(8, 14, {kind: 'function', name: 'other', key: 'other', isStackFrame: true})
              .endScope(10, 1)
              .endScope(11, 0)
              .endSource();

          builder.startRange(0, 0, {scopeKey: 'global'})
              .startRange(0, 14, {scopeKey: 'outer', isStackFrame: true})
              .endRange(0, 38)
              .startRange(1, 14, {scopeKey: 'block', isStackFrame: true, isHidden: true})
              .endRange(1, 24)
              .startRange(2, 13, {scopeKey: 'main', isStackFrame: true})
              .endRange(2, 24)
              .startRange(3, 14, {isStackFrame: true})
              .endRange(3, 22)
              .startRange(4, 14, {scopeKey: 'other', isStackFrame: true})
              .endRange(4, 25)
              .endRange(5, 0);
          return builder;
        }

        const mappings = [
          '0:17 => index.ts:1:2',  // _loop()
          '0:24',                  // ; is unmapped
          '0:25 => index.ts:1:2',  // _call(_loop)
          '1:17 => index.ts:2:4',  // log(x)
          '1:20',                  // (x) is unmapped
          '2:16 => index.ts:6:2',  // outer()
          '3:18 => index.ts:0:0',  // f() in the helper. Mapped, but must not be used.
          '4:17 => index.ts:9:2',  // _loop() in other
        ];

        beforeEach(async () => {
          script = await addScriptWithScopes('http://example.com/index.js', content, buildScopes(), mappings);
        });

        it('translates a raw frame with its kind and function keys', async () => {
          const outerKeys = {top: key('outer', '0:14'), bottom: key('outer', '0:14')};

          assert.deepEqual(await translateFrame(rawFrame(script, '_loop', 1, 17)), {
            kind: StackTraceImpl.Trie.FrameKind.OUTLINED,
            frames: ['at outer (index.ts:2:4)'],
            functionKeys: outerKeys,
          });
          assert.deepEqual(await translateFrame(rawFrame(script, 'outer', 0, 17)), {
            kind: StackTraceImpl.Trie.FrameKind.VISIBLE,
            frames: ['at outer (index.ts:1:2)'],
            functionKeys: outerKeys,
          });
          assert.deepEqual(await translateFrame(rawFrame(script, 'f', 3, 18)),
                           {kind: StackTraceImpl.Trie.FrameKind.HIDDEN, frames: []});
          assert.deepEqual(await translateFrame(rawFrame(script, 'other', 4, 17)), {
            kind: StackTraceImpl.Trie.FrameKind.VISIBLE,
            frames: ['at other (index.ts:9:2)'],
            functionKeys: {top: key('other', '8:14'), bottom: key('other', '8:14')},
          });
        });

        it('drops frames of compiler helpers', async () => {
          const rawFrames = [
            rawFrame(script, '_call', 3, 18),
            rawFrame(script, 'outer', 0, 25),
            rawFrame(script, 'main', 2, 16),
          ];

          assert.deepEqual(await translateFrame(rawFrames[0]),
                           {kind: StackTraceImpl.Trie.FrameKind.HIDDEN, frames: []});
          assert.deepEqual(await translateStackTrace(rawFrames), [
            'at outer (index.ts:1:2)',
            'at main (index.ts:6:2)',
          ]);
        });

        it('consolidates an outlined frame with its caller', async () => {
          const rawFrames = [
            rawFrame(script, '_loop', 1, 17),
            rawFrame(script, 'outer', 0, 17),
            rawFrame(script, 'main', 2, 16),
          ];

          assert.deepEqual(await translateStackTrace(rawFrames), [
            'at outer (index.ts:2:4)',
            'at main (index.ts:6:2)',
          ]);
        });

        it('merges away frames of scripts without source map when the chain continues', async () => {
          const plainScript = await backend.addScript(
              target, {url: 'http://example.com/plain.js', content: 'function plain(cb){cb()}'}, null);
          const rawFrames = [
            rawFrame(script, '_loop', 1, 17),
            rawFrame(plainScript, 'plain', 0, 19),
            rawFrame(script, 'outer', 0, 17),
          ];

          assert.deepEqual(await translateStackTrace(rawFrames), ['at outer (index.ts:2:4)']);
        });

        it('does not consolidate across frames of scripts with a plain source map', async () => {
          // The scope information of `plain.js` is derived from the AST, so its function keys never match.
          const plainScript = await backend.addScript(
              target, {url: 'http://example.com/plain.js', content: 'function f(){debugger;}'}, {
                url: 'http://example.com/plain.js.map',
                content: encodeSourceMap(['0:0 => plain.ts:0:0', '0:10 => plain.ts:1:10@foo', '0:21 => plain.ts:2:11']),
              });
          const rawFrames = [
            rawFrame(script, '_loop', 1, 17),
            rawFrame(plainScript, 'f', 0, 21),
            rawFrame(script, 'outer', 0, 17),
          ];

          assert.deepEqual(await translateStackTrace(rawFrames), [
            'at outer (index.ts:2:4)',
            'at foo (plain.ts:2:11)',
            'at outer (index.ts:1:2)',
          ]);
        });

        it('consolidates across compiler helpers from a different script', async () => {
          // vendor.js: function _run(f){f()}
          const builder = new ScopesCodec.ScopeInfoBuilder();
          builder.startSource()
              .startScope(0, 0, {kind: 'global', key: 'global'})
              .endScope(1, 0)
              .endSource()
              .startRange(0, 0, {scopeKey: 'global'})
              .startRange(0, 13, {isStackFrame: true, isHidden: true})
              .endRange(0, 21)
              .endRange(1, 0);
          const vendorScript = await addScriptWithScopes('http://example.com/vendor.js', 'function _run(f){f()}',
                                                         builder, ['0:17 => runtime.ts:0:0']);

          const rawFrames = [
            rawFrame(script, '_loop', 1, 17),
            rawFrame(vendorScript, '_run', 0, 17),
            rawFrame(script, 'outer', 0, 25),
            rawFrame(script, 'main', 2, 16),
          ];

          assert.deepEqual(await translateStackTrace(rawFrames), [
            'at outer (index.ts:2:4)',
            'at main (index.ts:6:2)',
          ]);
        });

        it('consolidates an outlined frame with its caller in a different script', async () => {
          // A second bundle (e.g. a chunk) of the same authored code.
          const chunkScript =
              await addScriptWithScopes('http://example.com/chunk.js', content, buildScopes(), mappings);
          const rawFrames = [
            rawFrame(chunkScript, '_loop', 1, 17),
            rawFrame(script, 'outer', 0, 17),
            rawFrame(script, 'main', 2, 16),
          ];

          assert.deepEqual(await translateStackTrace(rawFrames), [
            'at outer (index.ts:2:4)',
            'at main (index.ts:6:2)',
          ]);
        });

        describe('at an unmapped position', () => {
          const outerKeys = {top: key('outer', '0:14'), bottom: key('outer', '0:14')};

          it('shows the generated location, named after the authored function', async () => {
            assert.deepEqual(await translateFrame(rawFrame(script, 'outer', 0, 24)), {
              kind: StackTraceImpl.Trie.FrameKind.VISIBLE,
              frames: ['at outer (index.js:0:24)'],
              functionKeys: outerKeys,
            });
          });

          it('attributes outlined frames to the authored function', async () => {
            assert.deepEqual(await translateFrame(rawFrame(script, '_loop', 1, 21)), {
              kind: StackTraceImpl.Trie.FrameKind.OUTLINED,
              frames: ['at outer (index.js:1:21)'],
              functionKeys: outerKeys,
            });
          });

          it('consolidates an outlined frame with its unmapped caller', async () => {
            assert.deepEqual(await translateStackTrace([
                               rawFrame(script, '_loop', 1, 17),
                               rawFrame(script, 'outer', 0, 24),
                               rawFrame(script, 'main', 2, 16),
                             ]),
                             [
                               'at outer (index.ts:2:4)',
                               'at main (index.ts:6:2)',
                             ]);
          });

          it('does not merge away a recursive unmapped caller', async () => {
            // Without the function keys, the unmapped `outer` frame would count as "not authored" and be merged
            // into the chain ending at the second `outer` frame, dropping a frame from the recursion.
            assert.deepEqual(await translateStackTrace([
                               rawFrame(script, '_loop', 1, 17),
                               rawFrame(script, 'outer', 0, 24),
                               rawFrame(script, 'outer', 0, 17),
                             ]),
                             [
                               'at outer (index.ts:2:4)',
                               'at outer (index.ts:1:2)',
                             ]);
          });
        });

        it('populates the UISourceCode of outlined frames', async () => {
          const uiSourceCode = compilerScriptMapping.uiSourceCodeForURL(urlString`http://example.com/index.ts`, false);
          assert.exists(uiSourceCode);

          const translatedFrame = await compilerScriptMapping.translateRawFrame(rawFrame(script, '_loop', 1, 17));

          assert.exists(translatedFrame);
          assert.lengthOf(translatedFrame.frames, 1);
          assert.strictEqual(translatedFrame.frames[0].uiSourceCode, uiSourceCode);
          assert.isUndefined(translatedFrame.frames[0].url);
        });

        it('consolidates outlined frames once the source map is loaded', async () => {
          const {promise: sourceMapRequested, resolve: loadSourceMap} = Promise.withResolvers<void>();
          const loadResource =
              sinon.stub(backend.universe.pageResourceLoader, 'loadResource').callsFake(async (...args) => {
                await sourceMapRequested;
                return await loadResource.wrappedMethod.apply(backend.universe.pageResourceLoader, args);
              });
          const lateScriptPromise = addScriptWithScopes('http://example.com/late.js', content, buildScopes(), mappings);
          const lateScript = target.model(SDK.DebuggerModel.DebuggerModel)!.scripts().find(
              s => s.sourceURL === 'http://example.com/late.js');
          assert.exists(lateScript);

          const stackTrace = await debuggerWorkspaceBinding.createStackTraceFromProtocolRuntime(
              {callFrames: [rawFrame(lateScript, '_loop', 1, 17), rawFrame(lateScript, 'outer', 0, 17)]}, target);
          // While the source map loads, the frames point to the stub `UISourceCode` of the script.
          assert.deepEqual(stackTrace.syncFragment.frames.map(stringifyFrame), [
            'at _loop (late.js:sourcemap:1:17)',
            'at outer (late.js:sourcemap:0:17)',
          ]);

          loadSourceMap();
          await lateScriptPromise;
          await debuggerWorkspaceBinding.pendingLiveLocationChangesPromise();

          assert.deepEqual(stackTrace.syncFragment.frames.map(stringifyFrame), ['at outer (index.ts:2:4)']);
        });

        it('consolidates the frames of Error.stack traces', async () => {
          const stackTrace = await translateErrorStack([
            rawFrame(script, '_loop', 1, 17),
            rawFrame(script, 'outer', 0, 17),
            rawFrame(script, 'main', 2, 16),
          ]);

          assert.deepEqual(stackTrace.syncFragment.frames.map(stringifyFrame), [
            'at outer (index.ts:2:4)',
            'at main (index.ts:6:2)',
          ]);
          // The raw name of a merged frame is the one of the caller, that the outlined code was merged into.
          assert.strictEqual(stackTrace.syncFragment.frames[0].rawName, 'outer');
        });

        it('merges away builtin frames of Error.stack traces only when the chain continues', async () => {
          const merged = await translateErrorStack([
            rawFrame(script, '_loop', 1, 17),
            builtinFrame('Array.forEach'),
            rawFrame(script, 'outer', 0, 17),
          ]);
          const notMerged = await translateErrorStack([
            rawFrame(script, '_loop', 1, 17),
            builtinFrame('Array.forEach'),
            rawFrame(script, 'other', 4, 17),
          ]);

          assert.deepEqual(merged.syncFragment.frames.map(stringifyFrame), ['at outer (index.ts:2:4)']);
          assert.deepEqual(notMerged.syncFragment.frames.map(stringifyFrame), [
            'at outer (index.ts:2:4)',
            'at Array.forEach',
            'at other (index.ts:9:2)',
          ]);
        });
      });

      it('does not consolidate an outlined frame with a caller in a different function of the same name', async () => {
        //
        //    orig. code                         gen. code
        //             10        20                       10        20
        //    012345678901234567890              012345678901234567890123456
        //
        // 0: function outer() {                 function outer(){_loop()}
        // 1:   {                                function _loop(){log(x)}
        // 2:     log(x);                        function outer2(){_loop()}
        // 3:   }
        // 4: }
        // 5: function outer() {
        // 6:   f();
        // 7: }
        //
        // The block of the first `outer` is outlined into `_loop`. The second `outer` calling `_loop` is
        // inconsistent, but it must not be mistaken for the first `outer`.
        const builder = new ScopesCodec.ScopeInfoBuilder();
        builder.startSource()
            .startScope(0, 0, {kind: 'global', key: 'global'})
            .startScope(0, 14, {kind: 'function', name: 'outer', key: 'outer1', isStackFrame: true})
            .startScope(1, 2, {kind: 'block', key: 'block'})
            .endScope(3, 3)
            .endScope(4, 1)
            .startScope(5, 14, {kind: 'function', name: 'outer', key: 'outer2', isStackFrame: true})
            .endScope(7, 1)
            .endScope(8, 0)
            .endSource();

        builder.startRange(0, 0, {scopeKey: 'global'})
            .startRange(0, 14, {scopeKey: 'outer1', isStackFrame: true})
            .endRange(0, 25)
            .startRange(1, 14, {scopeKey: 'block', isStackFrame: true, isHidden: true})
            .endRange(1, 24)
            .startRange(2, 15, {scopeKey: 'outer2', isStackFrame: true})
            .endRange(2, 26)
            .endRange(3, 0);

        const script = await addScriptWithScopes(
            'http://example.com/index.js',
            ['function outer(){_loop()}', 'function _loop(){log(x)}', 'function outer2(){_loop()}'].join('\n'), builder,
            [
              '1:17 => index.ts:2:4',  // log(x)
              '2:18 => index.ts:6:2',  // _loop() in the second `outer`
            ]);

        const rawFrames = [
          rawFrame(script, '_loop', 1, 17),
          rawFrame(script, 'outer2', 2, 18),
        ];

        assert.deepEqual((await translateFrame(rawFrames[0]))?.functionKeys,
                         {top: key('outer', '0:14'), bottom: key('outer', '0:14')});
        assert.deepEqual((await translateFrame(rawFrames[1]))?.functionKeys,
                         {top: key('outer', '5:14'), bottom: key('outer', '5:14')});
        assert.deepEqual(await translateStackTrace(rawFrames), [
          'at outer (index.ts:2:4)',
          'at outer (index.ts:6:2)',
        ]);
      });

      it('consolidates nested outlined frames and expands inlined frames on both ends', async () => {
        //
        //    orig. code                         gen. code
        //             10        20                       10        20
        //    012345678901234567890              012345678901234567890123456
        //
        // 0: function inner() {                 function entry(){_loop1()}
        // 1:   log();                           function _loop1(){_loop2()}
        // 2: }                                  function _loop2(){log()}
        // 3: function outer() {
        // 4:   {
        // 5:     {
        // 6:       inner();
        // 7:     }
        // 8:   }
        // 9: }
        // 10: function main() {
        // 11:   outer();
        // 12: }
        // 13: function entry() {
        // 14:   main();
        // 15: }
        //
        // `main` and `outer` are inlined into `entry`. The outer block of `outer` is outlined
        // into `_loop1`, the inner block of `outer` is outlined into `_loop2`. `inner` is
        // inlined into `_loop2`.
        const builder = new ScopesCodec.ScopeInfoBuilder();
        builder.startSource()
            .startScope(0, 0, {kind: 'global', key: 'global'})
            .startScope(0, 14, {kind: 'function', name: 'inner', key: 'inner', isStackFrame: true})
            .endScope(2, 1)
            .startScope(3, 14, {kind: 'function', name: 'outer', key: 'outer', isStackFrame: true})
            .startScope(4, 2, {kind: 'block', key: 'block1'})
            .startScope(5, 4, {kind: 'block', key: 'block2'})
            .endScope(7, 5)
            .endScope(8, 3)
            .endScope(9, 1)
            .startScope(10, 13, {kind: 'function', name: 'main', key: 'main', isStackFrame: true})
            .endScope(12, 1)
            .startScope(13, 14, {kind: 'function', name: 'entry', key: 'entry', isStackFrame: true})
            .endScope(15, 1)
            .endScope(16, 0)
            .endSource();

        builder.startRange(0, 0, {scopeKey: 'global'})
            .startRange(0, 14, {scopeKey: 'entry', isStackFrame: true})
            .startRange(0, 17, {scopeKey: 'main', callSite: {sourceIndex: 0, line: 14, column: 2}})
            .startRange(0, 17, {scopeKey: 'outer', callSite: {sourceIndex: 0, line: 11, column: 2}})
            .endRange(0, 25)
            .endRange(0, 25)
            .endRange(0, 26)
            .startRange(1, 15, {scopeKey: 'block1', isStackFrame: true, isHidden: true})
            .endRange(1, 27)
            .startRange(2, 15, {scopeKey: 'block2', isStackFrame: true, isHidden: true})
            .startRange(2, 18, {scopeKey: 'inner', callSite: {sourceIndex: 0, line: 6, column: 6}})
            .endRange(2, 23)
            .endRange(2, 24)
            .endRange(3, 0);

        const script = await addScriptWithScopes(
            'http://example.com/index.js',
            ['function entry(){_loop1()}', 'function _loop1(){_loop2()}', 'function _loop2(){log()}'].join('\n'),
            builder, [
              '0:17 => index.ts:4:2',  // _loop1()
              '1:18 => index.ts:5:4',  // _loop2()
              '2:18 => index.ts:1:2',  // log()
            ]);

        const rawFrames = [
          rawFrame(script, '_loop2', 2, 18),
          rawFrame(script, '_loop1', 1, 18),
          rawFrame(script, 'entry', 0, 17),
        ];

        assert.deepEqual(await translateFrame(rawFrames[0]), {
          kind: StackTraceImpl.Trie.FrameKind.OUTLINED,
          frames: ['at inner (index.ts:1:2)', 'at outer (index.ts:6:6)'],
          functionKeys: {top: key('inner', '0:14'), bottom: key('outer', '3:14')},
        });
        assert.deepEqual(await translateStackTrace(rawFrames), [
          'at inner (index.ts:1:2)',
          'at outer (index.ts:6:6)',
          'at main (index.ts:11:2)',
          'at entry (index.ts:14:2)',
        ]);
      });

      it('includes inlined frames of outlined callers', async () => {
        //
        //    orig. code                         gen. code
        //             10        20                       10        20
        //    012345678901234567890              012345678901234567890123456
        //
        // 0: function inl() {                   function main(){outer()}
        // 1:   {                                function outer(){_loop1()}
        // 2:     log();                         function _loop1(){_loop2()}
        // 3:   }                                function _loop2(){log()}
        // 4: }
        // 5: function outer() {
        // 6:   {
        // 7:     inl();
        // 8:   }
        // 9: }
        // 10: function main() {
        // 11:   outer();
        // 12: }
        //
        // The block of `outer` is outlined into `_loop1`, `inl` is inlined into `_loop1`, and
        // the block of the inlined `inl` is outlined into `_loop2`.
        const builder = new ScopesCodec.ScopeInfoBuilder();
        builder.startSource()
            .startScope(0, 0, {kind: 'global', key: 'global'})
            .startScope(0, 12, {kind: 'function', name: 'inl', key: 'inl', isStackFrame: true})
            .startScope(1, 2, {kind: 'block', key: 'inlBlock'})
            .endScope(3, 3)
            .endScope(4, 1)
            .startScope(5, 14, {kind: 'function', name: 'outer', key: 'outer', isStackFrame: true})
            .startScope(6, 2, {kind: 'block', key: 'outerBlock'})
            .endScope(8, 3)
            .endScope(9, 1)
            .startScope(10, 13, {kind: 'function', name: 'main', key: 'main', isStackFrame: true})
            .endScope(12, 1)
            .endScope(13, 0)
            .endSource();

        builder.startRange(0, 0, {scopeKey: 'global'})
            .startRange(0, 13, {scopeKey: 'main', isStackFrame: true})
            .endRange(0, 24)
            .startRange(1, 14, {scopeKey: 'outer', isStackFrame: true})
            .endRange(1, 26)
            .startRange(2, 15, {scopeKey: 'outerBlock', isStackFrame: true, isHidden: true})
            .startRange(2, 18, {scopeKey: 'inl', callSite: {sourceIndex: 0, line: 7, column: 4}})
            .endRange(2, 26)
            .endRange(2, 27)
            .startRange(3, 15, {scopeKey: 'inlBlock', isStackFrame: true, isHidden: true})
            .endRange(3, 24)
            .endRange(4, 0);

        const script = await addScriptWithScopes('http://example.com/index.js',
                                                 [
                                                   'function main(){outer()}',
                                                   'function outer(){_loop1()}',
                                                   'function _loop1(){_loop2()}',
                                                   'function _loop2(){log()}',
                                                 ].join('\n'),
                                                 builder, [
                                                   '0:16 => index.ts:11:2',  // outer()
                                                   '1:17 => index.ts:6:2',   // _loop1()
                                                   '2:18 => index.ts:1:2',   // _loop2()
                                                   '3:18 => index.ts:2:4',   // log()
                                                 ]);

        const rawFrames = [
          rawFrame(script, '_loop2', 3, 18),
          rawFrame(script, '_loop1', 2, 18),
          rawFrame(script, 'outer', 1, 17),
          rawFrame(script, 'main', 0, 16),
        ];

        assert.deepEqual(await translateFrame(rawFrames[1]), {
          kind: StackTraceImpl.Trie.FrameKind.OUTLINED,
          frames: ['at inl (index.ts:1:2)', 'at outer (index.ts:7:4)'],
          functionKeys: {top: key('inl', '0:12'), bottom: key('outer', '5:14')},
        });
        assert.deepEqual(await translateStackTrace(rawFrames), [
          'at inl (index.ts:2:4)',
          'at outer (index.ts:7:4)',
          'at main (index.ts:11:2)',
        ]);
      });

      it('consolidates an outlined top-level block with the top-level code calling it', async () => {
        //
        //    orig. code                         gen. code
        //             10                                 10        20
        //    0123456789                         0123456789012345678901
        //
        // 0: {                                  (function(){log()})();
        // 1:   log();
        // 2: }
        const builder = new ScopesCodec.ScopeInfoBuilder();
        builder.startSource()
            .startScope(0, 0, {kind: 'global', key: 'global'})
            .startScope(0, 0, {kind: 'block', key: 'block'})
            .endScope(2, 1)
            .endScope(3, 0)
            .endSource();

        builder.startRange(0, 0, {scopeKey: 'global'})
            .startRange(0, 9, {scopeKey: 'block', isStackFrame: true, isHidden: true})
            .endRange(0, 18)
            .endRange(1, 0);

        const script = await addScriptWithScopes('http://example.com/index.js', '(function(){log()})();', builder, [
          '0:0 => index.ts:0:0',
          '0:12 => index.ts:1:2',  // log()
          '0:18 => index.ts:0:0',  // Call of the IIFE
        ]);

        const rawFrames = [
          rawFrame(script, '', 0, 12),
          rawFrame(script, '', 0, 19),
        ];

        assert.deepEqual(await translateStackTrace(rawFrames), ['at <anonymous> (index.ts:1:2)']);
      });
    });
  });
});
