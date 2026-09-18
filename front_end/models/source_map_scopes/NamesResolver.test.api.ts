// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Formatter from '../../models/formatter/formatter.js';
import {encodeSourceMap} from '../../testing/SourceMapEncoder.js';
import * as ScopesCodec from '../../third_party/source-map-scopes-codec/source-map-scopes-codec.js';

import * as SourceMapScopes from './source_map_scopes.js';

function createSourceMapUrl(builder: ScopesCodec.ScopeInfoBuilder, textMap: string[] = []): string {
  const baseMap = textMap.length > 0 ? encodeSourceMap(textMap) : {
    version: 3,
    sources: ['index.ts'],
    mappings: '',
  };
  const map = ScopesCodec.encode(builder.build(), baseMap as ScopesCodec.SourceMapJson);
  const json = JSON.stringify(map);
  return `data:application/json;charset=utf-8;base64,${Platform.StringUtilities.toBase64(json)}`;
}

async function setupScriptAndPause(
    inspectedPage: API.InspectedPage,
    debuggerModel: SDK.DebuggerModel.DebuggerModel,
    code: string,
    builder: ScopesCodec.ScopeInfoBuilder,
    textMap: string[] = [],
    ): Promise<{callFrame: SDK.DebuggerModel.CallFrame, sourceMap: SDK.SourceMap.SourceMap}> {
  const sourceMapUrl = createSourceMapUrl(builder, textMap);
  const scriptContent = `${code}\n//# sourceURL=test.js\n//# sourceMappingURL=${sourceMapUrl}`;
  const pausedPromise = debuggerModel.once(SDK.DebuggerModel.Events.DebuggerPaused);

  await inspectedPage.evaluate((src: string) => {
    // eslint-disable-next-line @devtools/no-imperative-dom-api
    const script = document.createElement('script');
    script.textContent = src;
    document.body.appendChild(script);
  }, scriptContent);

  void inspectedPage.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setTimeout((window as any).runTest, 0);
  });
  await pausedPromise;

  const callFrames = debuggerModel.debuggerPausedDetails()?.callFrames;
  assert.isDefined(callFrames, 'Expected callFrames to exist');
  assert.isNotEmpty(callFrames, 'Expected callFrames not to be empty');
  const callFrame = callFrames[0];
  const sourceMap = await debuggerModel.sourceMapManager().sourceMapForClientPromise(callFrame.script);
  assert.isDefined(sourceMap, 'Expected source map to attach');
  return {callFrame, sourceMap};
}

function formatRemoteObject(value?: SDK.RemoteObject.RemoteObject): string {
  if (!value) {
    return '<unavailable>';
  }
  if (value.type === 'undefined') {
    return 'undefined';
  }
  if (value.type === 'object' && value.subtype !== 'null') {
    return `<${value.className ?? value.description ?? 'object'}>`;
  }
  return JSON.stringify(value.value);
}

async function stringifyScopeChain(scopeChain: SDK.DebuggerModel.ScopeChainEntry[]): Promise<string> {
  const lines: string[] = [];
  for (const scope of scopeChain) {
    const title = scope.name() ? `${scope.typeName()} (${scope.name()})` : scope.typeName();
    if (scope.type() === 'global' && !(scope instanceof SDK.SourceMapScopeChainEntry.SourceMapScopeChainEntry)) {
      lines.push(`${title} (<global>)`);
      continue;
    }
    lines.push(title);
    for (const extra of scope.extraProperties()) {
      lines.push(`  [${extra.name}]: ${formatRemoteObject(extra.value)}`);
    }
    const {properties} = await scope.object().getAllProperties(false, false);
    for (const prop of properties ?? []) {
      lines.push(`  ${prop.name}: ${formatRemoteObject(prop.value)}`);
    }
  }
  return lines.join('\n');
}

describe('NamesResolver API Test', () => {
  setup({
    creationOptions: {
      hostConfig: {
        devToolsSourceMapScopesInSourcesPanel: {
          enabled: true,
        },
      },
    },
  });

  it('builds function, block, and global scopes with mapped variable values', async ({inspectedPage, universe}) => {
    const primaryTarget = universe.targetManager.primaryPageTarget();
    assert.isNotNull(primaryTarget);

    const debuggerModel = primaryTarget.model(SDK.DebuggerModel.DebuggerModel);
    assert.isNotNull(debuggerModel);

    await inspectedPage.goToHtml('<!DOCTYPE html><html><body></body></html>');

    const builder = new ScopesCodec.ScopeInfoBuilder();
    builder.startScope(0, 0, {kind: 'global', variables: ['authoredGlobalVar'], key: 'global'});
    builder.startScope(
        0, 0, {kind: 'function', name: 'testLocalAndBlock', isStackFrame: true, variables: ['outerVar'], key: 'fn'});
    builder.startScope(2, 2, {kind: 'block', variables: ['innerVar'], key: 'block'});
    builder.endScope(5, 3);
    builder.endScope(6, 1);
    builder.endScope(8, 0);

    builder.startRange(0, 0, {scopeKey: 'global', values: ['"fromAuthoredGlobal"']});
    builder.startRange(0, 0, {scopeKey: 'fn', isStackFrame: true, values: ['outerVar']});
    builder.startRange(2, 2, {scopeKey: 'block', values: ['innerVar']});
    builder.endRange(5, 3);
    builder.endRange(6, 1);
    builder.endRange(8, 0);

    const code = [
      'function testLocalAndBlock() {',
      '  const outerVar = 10;',
      '  {',
      '    const innerVar = 20;',
      '    debugger;',
      '  }',
      '}',
      'window.runTest = testLocalAndBlock;',
    ].join('\n');

    const {callFrame} = await setupScriptAndPause(inspectedPage, debuggerModel, code, builder);
    try {
      const scopeChain =
          await SourceMapScopes.NamesResolver.resolveScopeChain(callFrame, universe.debuggerWorkspaceBinding);

      assert.strictEqual(await stringifyScopeChain(scopeChain), [
        'Block',
        '  innerVar: 20',
        'Local (testLocalAndBlock)',
        '  outerVar: 10',
        'Global',
        '  authoredGlobalVar: "fromAuthoredGlobal"',
        'Global (<global>)',
      ].join('\n'));
    } finally {
      if (debuggerModel.isPaused()) {
        await debuggerModel.resume();
      }
    }
  });

  it('evaluates shadowed variables in parent closure scope using V8 scopeNumber', async ({inspectedPage, universe}) => {
    const primaryTarget = universe.targetManager.primaryPageTarget();
    assert.isNotNull(primaryTarget);

    const debuggerModel = primaryTarget.model(SDK.DebuggerModel.DebuggerModel);
    assert.isNotNull(debuggerModel);

    await inspectedPage.goToHtml('<!DOCTYPE html><html><body></body></html>');

    const builder = new ScopesCodec.ScopeInfoBuilder();
    builder.startScope(0, 0, {kind: 'global', key: 'global'});
    builder.startScope(0, 0,
                       {kind: 'function', name: 'testShadowing', isStackFrame: true, variables: ['x'], key: 'outerFn'});
    builder.startScope(3, 2, {kind: 'function', name: 'innerFn', isStackFrame: true, variables: ['x'], key: 'innerFn'});
    builder.endScope(6, 3);
    builder.endScope(8, 1);
    builder.endScope(10, 0);

    builder.startRange(0, 0, {scopeKey: 'global'});
    builder.startRange(0, 0, {scopeKey: 'outerFn', isStackFrame: true, values: ['x']});
    builder.startRange(3, 2, {scopeKey: 'innerFn', isStackFrame: true, values: ['x']});
    builder.endRange(6, 3);
    builder.endRange(8, 1);
    builder.endRange(10, 0);

    const code = [
      'function testShadowing() {',
      '  const x = "outer";',
      '  eval("");',
      '  function innerFn() {',
      '    const x = "inner";',
      '    debugger;',
      '  }',
      '  innerFn();',
      '}',
      'window.runTest = testShadowing;',
    ].join('\n');

    const {callFrame} = await setupScriptAndPause(inspectedPage, debuggerModel, code, builder);
    try {
      const scopeChain =
          await SourceMapScopes.NamesResolver.resolveScopeChain(callFrame, universe.debuggerWorkspaceBinding);

      assert.strictEqual(await stringifyScopeChain(scopeChain), [
        'Local (innerFn)',
        '  x: "inner"',
        'Closure (testShadowing)',
        '  x: "outer"',
        'Global',
        'Global (<global>)',
      ].join('\n'));
    } finally {
      if (debuggerModel.isPaused()) {
        await debuggerModel.resume();
      }
    }
  });

  it('evaluates multiple nested block scopes with variable shadowing', async ({inspectedPage, universe}) => {
    const primaryTarget = universe.targetManager.primaryPageTarget();
    assert.isNotNull(primaryTarget);

    const debuggerModel = primaryTarget.model(SDK.DebuggerModel.DebuggerModel);
    assert.isNotNull(debuggerModel);

    await inspectedPage.goToHtml('<!DOCTYPE html><html><body></body></html>');

    const builder = new ScopesCodec.ScopeInfoBuilder();
    builder.startScope(0, 0, {kind: 'global', key: 'global'});
    builder.startScope(0, 0,
                       {kind: 'function', name: 'testNestedBlocks', isStackFrame: true, variables: ['x'], key: 'fn'});
    builder.startScope(2, 2, {kind: 'block', variables: ['x'], key: 'outerBlock'});
    builder.startScope(4, 4, {kind: 'block', variables: ['x'], key: 'innerBlock'});
    builder.endScope(7, 5);
    builder.endScope(8, 3);
    builder.endScope(9, 1);
    builder.endScope(11, 0);

    builder.startRange(0, 0, {scopeKey: 'global'});
    builder.startRange(0, 0, {scopeKey: 'fn', isStackFrame: true, values: ['x']});
    builder.startRange(2, 2, {scopeKey: 'outerBlock', values: ['x']});
    builder.startRange(4, 4, {scopeKey: 'innerBlock', values: ['x']});
    builder.endRange(7, 5);
    builder.endRange(8, 3);
    builder.endRange(9, 1);
    builder.endRange(11, 0);

    const code = [
      'function testNestedBlocks() {',
      '  const x = "fn";',
      '  {',
      '    const x = "outerBlock";',
      '    {',
      '      const x = "innerBlock";',
      '      debugger;',
      '    }',
      '  }',
      '}',
      'window.runTest = testNestedBlocks;',
    ].join('\n');

    const {callFrame} = await setupScriptAndPause(inspectedPage, debuggerModel, code, builder);
    try {
      const scopeChain =
          await SourceMapScopes.NamesResolver.resolveScopeChain(callFrame, universe.debuggerWorkspaceBinding);

      assert.strictEqual(await stringifyScopeChain(scopeChain), [
        'Block',
        '  x: "innerBlock"',
        'Block',
        '  x: "outerBlock"',
        'Local (testNestedBlocks)',
        '  x: "fn"',
        'Global',
        'Global (<global>)',
      ].join('\n'));
    } finally {
      if (debuggerModel.isPaused()) {
        await debuggerModel.resume();
      }
    }
  });

  it('matches multiple nested empty scopes reported by V8 CDP', async ({inspectedPage, universe}) => {
    const primaryTarget = universe.targetManager.primaryPageTarget();
    assert.isNotNull(primaryTarget);

    const debuggerModel = primaryTarget.model(SDK.DebuggerModel.DebuggerModel);
    assert.isNotNull(debuggerModel);

    await inspectedPage.goToHtml('<!DOCTYPE html><html><body></body></html>');

    const builder = new ScopesCodec.ScopeInfoBuilder();
    builder.startScope(0, 0, {kind: 'global', key: 'global'});
    builder.startScope(0, 0,
                       {kind: 'function', name: 'testNestedEmpty', isStackFrame: true, variables: ['val'], key: 'fn'});
    builder.startScope(2, 2, {kind: 'block', variables: [], key: 'empty1'});
    builder.startScope(3, 4, {kind: 'block', variables: [], key: 'empty2'});
    builder.endScope(5, 5);
    builder.endScope(6, 3);
    builder.endScope(7, 1);
    builder.endScope(9, 0);

    builder.startRange(0, 0, {scopeKey: 'global'});
    builder.startRange(0, 0, {scopeKey: 'fn', isStackFrame: true, values: ['val']});
    builder.startRange(2, 2, {scopeKey: 'empty1', values: []});
    builder.startRange(3, 4, {scopeKey: 'empty2', values: []});
    builder.endRange(5, 5);
    builder.endRange(6, 3);
    builder.endRange(7, 1);
    builder.endRange(9, 0);

    const code = [
      'function testNestedEmpty() {',
      '  const val = 42;',
      '  {',
      '    {',
      '      debugger;',
      '    }',
      '  }',
      '}',
      'window.runTest = testNestedEmpty;',
    ].join('\n');

    const {callFrame} = await setupScriptAndPause(inspectedPage, debuggerModel, code, builder);
    try {
      const scopeChain =
          await SourceMapScopes.NamesResolver.resolveScopeChain(callFrame, universe.debuggerWorkspaceBinding);

      assert.strictEqual(await stringifyScopeChain(scopeChain), [
        'Block',
        'Block',
        'Local (testNestedEmpty)',
        '  val: 42',
        'Global',
        'Global (<global>)',
      ].join('\n'));
    } finally {
      if (debuggerModel.isPaused()) {
        await debuggerModel.resume();
      }
    }
  });

  it('resolves multi-level inlined functions and caller virtual call frames', async ({inspectedPage, universe}) => {
    const primaryTarget = universe.targetManager.primaryPageTarget();
    assert.isNotNull(primaryTarget);

    const debuggerModel = primaryTarget.model(SDK.DebuggerModel.DebuggerModel);
    assert.isNotNull(debuggerModel);

    await inspectedPage.goToHtml('<!DOCTYPE html><html><body></body></html>');

    const builder = new ScopesCodec.ScopeInfoBuilder();
    builder.startScope(0, 0, {kind: 'global', key: 'global'});
    builder.startScope(0, 0,
                       {kind: 'function', name: 'rootCaller', isStackFrame: true, variables: ['rootVar'], key: 'root'});
    builder.startScope(1, 2,
                       {kind: 'function', name: 'inlinedMid', isStackFrame: true, variables: ['midVar'], key: 'mid'});
    builder.startScope(
        2, 2, {kind: 'function', name: 'inlinedLeaf', isStackFrame: true, variables: ['leafVar'], key: 'leaf'});
    builder.endScope(3, 3);
    builder.endScope(4, 3);
    builder.endScope(5, 1);
    builder.endScope(7, 0);

    builder.startRange(0, 0, {scopeKey: 'global'});
    builder.startRange(0, 0, {scopeKey: 'root', isStackFrame: true, values: ['rootVar']});
    builder.startRange(2, 2, {
      scopeKey: 'mid',
      isStackFrame: false,
      callSite: {sourceIndex: 0, line: 1, column: 2},
      values: ['midVar'],
    });
    builder.startRange(3, 2, {
      scopeKey: 'leaf',
      isStackFrame: false,
      callSite: {sourceIndex: 0, line: 2, column: 2},
      values: ['leafVar'],
    });
    builder.endRange(4, 12);
    builder.endRange(4, 12);
    builder.endRange(5, 1);
    builder.endRange(7, 0);

    const code = [
      'function rootCaller() {',
      '  const rootVar = 1;',
      '  const midVar = 2;',
      '  const leafVar = 3;',
      '  debugger;',
      '}',
      'window.runTest = rootCaller;',
    ].join('\n');

    const {callFrame} = await setupScriptAndPause(inspectedPage, debuggerModel, code, builder);
    try {
      const scopeChain =
          await SourceMapScopes.NamesResolver.resolveScopeChain(callFrame, universe.debuggerWorkspaceBinding);

      assert.strictEqual(await stringifyScopeChain(scopeChain), [
        'Local (inlinedLeaf)',
        '  leafVar: 3',
        'Closure (inlinedMid)',
        '  midVar: 2',
        'Closure (rootCaller)',
        '  rootVar: 1',
        'Global',
        'Global (<global>)',
      ].join('\n'));

      const midFrame = callFrame.createVirtualCallFrame(1, 'inlinedMid');
      const midScopeChain =
          await SourceMapScopes.NamesResolver.resolveScopeChain(midFrame, universe.debuggerWorkspaceBinding);
      assert.strictEqual(await stringifyScopeChain(midScopeChain), [
        'Local (inlinedMid)',
        '  midVar: 2',
        'Closure (rootCaller)',
        '  rootVar: 1',
        'Global',
        'Global (<global>)',
      ].join('\n'));

      const rootFrame = callFrame.createVirtualCallFrame(2, 'rootCaller');
      const rootScopeChain =
          await SourceMapScopes.NamesResolver.resolveScopeChain(rootFrame, universe.debuggerWorkspaceBinding);
      assert.strictEqual(await stringifyScopeChain(rootScopeChain), [
        'Local (rootCaller)',
        '  rootVar: 1',
        'Global',
        'Global (<global>)',
      ].join('\n'));
    } finally {
      if (debuggerModel.isPaused()) {
        await debuggerModel.resume();
      }
    }
  });

  it('distinguishes between variables with actual undefined value and throwing ReferenceError in V8',
     async ({inspectedPage, universe}) => {
       const primaryTarget = universe.targetManager.primaryPageTarget();
       assert.isNotNull(primaryTarget);

       const debuggerModel = primaryTarget.model(SDK.DebuggerModel.DebuggerModel);
       assert.isNotNull(debuggerModel);

       await inspectedPage.goToHtml('<!DOCTYPE html><html><body></body></html>');

       const builder = new ScopesCodec.ScopeInfoBuilder();
       builder.startScope(0, 0, {kind: 'global', key: 'global'});
       builder.startScope(0, 0, {
         kind: 'function',
         name: 'testUndefinedAndThrowing',
         isStackFrame: true,
         variables: ['legitUndefined', 'nonExistentVar'],
         key: 'fn',
       });
       builder.endScope(4, 1);
       builder.endScope(6, 0);

       builder.startRange(0, 0, {scopeKey: 'global'});
       builder.startRange(0, 0, {scopeKey: 'fn', isStackFrame: true, values: ['legitUndefined', 'nonExistentVar']});
       builder.endRange(4, 1);
       builder.endRange(6, 0);

       const code = [
         'function testUndefinedAndThrowing() {',
         '  const legitUndefined = undefined;',
         '  debugger;',
         '}',
         'window.runTest = testUndefinedAndThrowing;',
       ].join('\n');

       const {callFrame} = await setupScriptAndPause(inspectedPage, debuggerModel, code, builder);
       try {
         const scopeChain =
             await SourceMapScopes.NamesResolver.resolveScopeChain(callFrame, universe.debuggerWorkspaceBinding);

         assert.strictEqual(await stringifyScopeChain(scopeChain), [
           'Local (testUndefinedAndThrowing)',
           '  legitUndefined: undefined',
           '  nonExistentVar: <unavailable>',
           'Global',
           'Global (<global>)',
         ].join('\n'));
       } finally {
         if (debuggerModel.isPaused()) {
           await debuggerModel.resume();
         }
       }
     });

  it('evaluates binding expressions without variable shadowing when runtime code defines __res',
     async ({inspectedPage, universe}) => {
       const primaryTarget = universe.targetManager.primaryPageTarget();
       assert.isNotNull(primaryTarget);

       const debuggerModel = primaryTarget.model(SDK.DebuggerModel.DebuggerModel);
       assert.isNotNull(debuggerModel);

       await inspectedPage.goToHtml('<!DOCTYPE html><html><body></body></html>');

       const builder = new ScopesCodec.ScopeInfoBuilder();
       builder.startScope(0, 0, {kind: 'global', key: 'global'});
       builder.startScope(0, 0, {
         kind: 'function',
         name: 'testNoShadowing',
         isStackFrame: true,
         variables: ['__res', 'computed'],
         key: 'fn',
       });
       builder.endScope(4, 1);
       builder.endScope(6, 0);

       builder.startRange(0, 0, {scopeKey: 'global'});
       builder.startRange(0, 0, {scopeKey: 'fn', isStackFrame: true, values: ['__res', 'other']});
       builder.endRange(4, 1);
       builder.endRange(6, 0);

       const code = [
         'function testNoShadowing() {',
         '  const __res = "user_res";',
         '  const other = __res + "_ok";',
         '  debugger;',
         '}',
         'window.runTest = testNoShadowing;',
       ].join('\n');

       const {callFrame} = await setupScriptAndPause(inspectedPage, debuggerModel, code, builder);
       try {
         const scopeChain =
             await SourceMapScopes.NamesResolver.resolveScopeChain(callFrame, universe.debuggerWorkspaceBinding);

         assert.strictEqual(await stringifyScopeChain(scopeChain), [
           'Local (testNoShadowing)',
           '  __res: "user_res"',
           '  computed: "user_res_ok"',
           'Global',
           'Global (<global>)',
         ].join('\n'));
       } finally {
         if (debuggerModel.isPaused()) {
           await debuggerModel.resume();
         }
       }
     });

  it('drops inner block scopes and populates returnValue extraProperties when paused at V8 return point',
     async ({inspectedPage, universe}) => {
       const primaryTarget = universe.targetManager.primaryPageTarget();
       assert.isNotNull(primaryTarget);

       const debuggerModel = primaryTarget.model(SDK.DebuggerModel.DebuggerModel);
       assert.isNotNull(debuggerModel);

       await inspectedPage.goToHtml('<!DOCTYPE html><html><body></body></html>');

       const builder = new ScopesCodec.ScopeInfoBuilder();
       builder.startScope(0, 0, {kind: 'global', key: 'global'});
       builder.startScope(0, 0,
                          {kind: 'function', name: 'testReturn', isStackFrame: true, variables: ['fnVar'], key: 'fn'});
       builder.startScope(2, 2, {kind: 'block', variables: ['blockVar'], key: 'block'});
       builder.endScope(7, 1);
       builder.endScope(7, 1);
       builder.endScope(9, 0);

       builder.startRange(0, 0, {scopeKey: 'global'});
       builder.startRange(0, 0, {scopeKey: 'fn', isStackFrame: true, values: ['fnVar']});
       builder.startRange(2, 2, {scopeKey: 'block', values: ['blockVar']});
       builder.endRange(7, 1);
       builder.endRange(7, 1);
       builder.endRange(9, 0);

       const code = [
         'function testReturn() {',
         '  const fnVar = 10;',
         '  {',
         '    const blockVar = 20;',
         '    debugger;',
         '    return fnVar + blockVar;',
         '  }',
         '}',
         'window.runTest = testReturn;',
       ].join('\n');

       const {callFrame} = await setupScriptAndPause(inspectedPage, debuggerModel, code, builder);
       try {
         const initialScopeChain =
             await SourceMapScopes.NamesResolver.resolveScopeChain(callFrame, universe.debuggerWorkspaceBinding);
         assert.strictEqual(await stringifyScopeChain(initialScopeChain), [
           'Block',
           '  blockVar: 20',
           'Local (testReturn)',
           '  fnVar: 10',
           'Global',
           'Global (<global>)',
         ].join('\n'));

         // Step until paused at return point (where returnValue is non-null)
         let currentFrame: SDK.DebuggerModel.CallFrame = callFrame;
         while (currentFrame.returnValue() === null) {
           const stepPaused = debuggerModel.once(SDK.DebuggerModel.Events.DebuggerPaused);
           void debuggerModel.stepOver();
           await stepPaused;
           const frames: SDK.DebuggerModel.CallFrame[]|undefined = debuggerModel.debuggerPausedDetails()?.callFrames;
           assert.isDefined(frames);
           assert.isNotEmpty(frames);
           currentFrame = frames[0];
         }

         const returnScopeChain =
             await SourceMapScopes.NamesResolver.resolveScopeChain(currentFrame, universe.debuggerWorkspaceBinding);
         assert.strictEqual(await stringifyScopeChain(returnScopeChain), [
           'Local (testReturn)',
           '  [Return value]: 30',
           '  fnVar: 10',
           'Global',
           'Global (<global>)',
         ].join('\n'));
         assert.isDefined(returnScopeChain[0].extraProperties()[0].syntheticSetter);
       } finally {
         if (debuggerModel.isPaused()) {
           await debuggerModel.resume();
         }
       }
     });

  it('does not evaluate binding expressions in target page when source map has USER provenance',
     async ({inspectedPage, universe}) => {
       const primaryTarget = universe.targetManager.primaryPageTarget();
       assert.isNotNull(primaryTarget);

       const debuggerModel = primaryTarget.model(SDK.DebuggerModel.DebuggerModel);
       assert.isNotNull(debuggerModel);

       await inspectedPage.goToHtml('<!DOCTYPE html><html><body></body></html>');

       const builder = new ScopesCodec.ScopeInfoBuilder();
       builder.startScope(0, 0, {kind: 'global', key: 'global'});
       builder.startScope(
           0, 0, {kind: 'function', name: 'authoredFn', isStackFrame: true, variables: ['evilVar'], key: 'fn'});
       builder.endScope(3, 1);
       builder.endScope(5, 0);

       builder.startRange(0, 0, {scopeKey: 'global'});
       builder.startRange(0, 0, {scopeKey: 'fn', isStackFrame: true, values: ['(window.evilExecuted = true, 999)']});
       builder.endRange(3, 1);
       builder.endRange(5, 0);

       const code = [
         'function compiledFn() {',
         '  const a = 456;',
         '  debugger;',
         '}',
         'window.runTest = compiledFn;',
       ].join('\n');

       const {callFrame, sourceMap} =
           await setupScriptAndPause(inspectedPage, debuggerModel, code, builder,
                                     ['0:9 => index.ts:0:9@authoredFn', '1:8 => index.ts:1:8@safeMappedVar']);
       try {
         debuggerModel.setSourceMapURL(callFrame.script, sourceMap.url(), SDK.SourceMap.SourceMapProvenance.USER);
         const userSourceMap = await debuggerModel.sourceMapManager().sourceMapForClientPromise(callFrame.script);
         assert.strictEqual(userSourceMap?.provenance(), SDK.SourceMap.SourceMapProvenance.USER);

         const scopeChain =
             await SourceMapScopes.NamesResolver.resolveScopeChain(callFrame, universe.debuggerWorkspaceBinding);

         assert.strictEqual(await stringifyScopeChain(scopeChain), [
           'Local (compiledFn)',
           '  [this]: <Window>',
           '  safeMappedVar: 456',
           'Global (<global>)',
         ].join('\n'));

         await debuggerModel.resume();
         const evilExecuted =
             await inspectedPage.evaluate(() => Boolean((window as unknown as {evilExecuted?: boolean}).evilExecuted));
         assert.isFalse(evilExecuted, 'Binding expression from USER source map must NOT be evaluated');
       } finally {
         if (debuggerModel.isPaused()) {
           await debuggerModel.resume();
         }
         Formatter.FormatterWorkerPool.FormatterWorkerPool.removeInstance();
       }
     });
});
