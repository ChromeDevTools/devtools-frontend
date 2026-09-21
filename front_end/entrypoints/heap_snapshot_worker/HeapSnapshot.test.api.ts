// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as SDK from '../../core/sdk/sdk.js';
import type * as HeapSnapshotModel from '../../models/heap_snapshot/heap_snapshot.js';

import * as HeapSnapshotWorker from './heap_snapshot_worker.js';

/**
 * Takes a heap snapshot of the inspected page over CDP and parses it into a
 * `JSHeapSnapshot`, just like the heap snapshot worker does in production.
 */
async function takeHeapSnapshot(universe: API.State['universe']):
    Promise<HeapSnapshotWorker.HeapSnapshot.JSHeapSnapshot> {
  const primaryTarget = universe.targetManager.primaryPageTarget();
  assert.isNotNull(primaryTarget);

  const heapProfilerModel = primaryTarget.model(SDK.HeapProfilerModel.HeapProfilerModel);
  assert.isNotNull(heapProfilerModel);

  const dispatcher = new HeapSnapshotWorker.HeapSnapshotWorkerDispatcher.HeapSnapshotWorkerDispatcher(() => {});
  const loader = new HeapSnapshotWorker.HeapSnapshotLoader.HeapSnapshotLoader(dispatcher);
  const onChunk = ({data}: {data: string}): void => loader.write(data);
  heapProfilerModel.addEventListener(SDK.HeapProfilerModel.Events.ADD_HEAP_SNAPSHOT_CHUNK, onChunk);
  try {
    await heapProfilerModel.takeHeapSnapshot({reportProgress: false});
  } finally {
    heapProfilerModel.removeEventListener(SDK.HeapProfilerModel.Events.ADD_HEAP_SNAPSHOT_CHUNK, onChunk);
  }
  loader.close();
  await loader.parsingComplete;

  const channel = new MessageChannel();
  new HeapSnapshotWorker.HeapSnapshot.SecondaryInitManager(channel.port2);
  try {
    return await loader.buildSnapshot(channel.port1);
  } finally {
    channel.port1.close();
    channel.port2.close();
  }
}

interface ContextFixture {
  snapshot: HeapSnapshotWorker.HeapSnapshot.JSHeapSnapshot;
  analysis: HeapSnapshotModel.HeapSnapshotModel.ContextAnalysisResult;
}

async function loadContextFixture({inspectedPage, universe}: API.State): Promise<ContextFixture> {
  // The page loads every fixture as its own external script. The analysis keys
  // scopes by the script's resource URL, so inline scripts would all collapse
  // into the page URL and become indistinguishable.
  await inspectedPage.goToResource('memory/context-analysis/index.html');
  const snapshot = await takeHeapSnapshot(universe);
  return {snapshot, analysis: snapshot.analyzeContexts()};
}

function matchesScriptName(scope: HeapSnapshotModel.HeapSnapshotModel.ScopeAnalysis, scriptName: string): boolean {
  return scope.scriptName === scriptName || scope.scriptName.endsWith('/' + scriptName);
}

function scopesForScript(analysis: HeapSnapshotModel.HeapSnapshotModel.ContextAnalysisResult,
                         scriptName: string): HeapSnapshotModel.HeapSnapshotModel.ScopeAnalysis[] {
  const scopes = analysis.scopes.filter(scope => matchesScriptName(scope, scriptName));
  assert.isNotEmpty(scopes, `No scopes found for ${scriptName}`);
  return scopes;
}

function assertNoScopes(analysis: HeapSnapshotModel.HeapSnapshotModel.ContextAnalysisResult, scriptName: string): void {
  const scopes = analysis.scopes.filter(scope => matchesScriptName(scope, scriptName));
  assert.isEmpty(scopes, `Expected no scopes for ${scriptName}`);
}

function deadFieldNames(scope: HeapSnapshotModel.HeapSnapshotModel.ScopeAnalysis): string[][] {
  return scope.contexts.map(context => context.deadFields.map(field => field.name).sort());
}

function allContextFields(snapshot: HeapSnapshotWorker.HeapSnapshot.JSHeapSnapshot,
                          scope: HeapSnapshotModel.HeapSnapshotModel.ScopeAnalysis): string[] {
  assert.isNotEmpty(scope.contexts);
  const node = snapshot.createNode(scope.contexts[0].contextNodeIndex);
  const fieldNames: string[] = [];
  for (const edges = node.edges(); edges.hasNext(); edges.next()) {
    const edge = edges.item();
    if (edge.type() === 'context') {
      fieldNames.push(edge.name());
    }
  }
  return fieldNames.sort();
}

function scopeWithDeadField(scopes: HeapSnapshotModel.HeapSnapshotModel.ScopeAnalysis[],
                            fieldName: string): HeapSnapshotModel.HeapSnapshotModel.ScopeAnalysis {
  const matchingScopes = scopes.filter(
      scope => scope.contexts.some(context => context.deadFields.some(field => field.name === fieldName)));
  assert.lengthOf(matchingScopes, 1, `Expected exactly one scope with dead field '${fieldName}'`);
  return matchingScopes[0];
}

function singleScopeForScript(analysis: HeapSnapshotModel.HeapSnapshotModel.ContextAnalysisResult,
                              scriptName: string): HeapSnapshotModel.HeapSnapshotModel.ScopeAnalysis {
  const scopes = scopesForScript(analysis, scriptName);
  assert.lengthOf(scopes, 1, `Expected exactly one scope for ${scriptName}`);
  return scopes[0];
}

// Populates node IDs and indices for scopes, contexts, and dead fields.
function checkNodeIdsAndIndices({snapshot, analysis}: ContextFixture): void {
  assert.isNotEmpty(analysis.scopes);
  for (const scope of analysis.scopes) {
    assert.isNotEmpty(scope.scriptName);
    assert.strictEqual(snapshot.nodeIndexForId(scope.scopeInfoNodeId), scope.scopeInfoNodeIndex);
    assert.strictEqual(snapshot.nodeIndexForId(scope.scriptNodeId), scope.scriptNodeIndex);
    assert.isNotEmpty(scope.contexts);
    for (const context of scope.contexts) {
      assert.isNotEmpty(context.deadFields);
      assert.strictEqual(snapshot.nodeIndexForId(context.contextNodeId), context.contextNodeIndex);
      for (const deadField of context.deadFields) {
        assert.strictEqual(snapshot.nodeIndexForId(deadField.valueNodeId), deadField.valueNodeIndex);
      }
    }
  }
  for (let index = 1; index < analysis.scopes.length; ++index) {
    assert.isAtLeast(analysis.scopes[index - 1].contexts[0].deadFieldsRetainedSizeSum,
                     analysis.scopes[index].contexts[0].deadFieldsRetainedSizeSum);
  }
}

// Analyzes multiple contexts sharing a ScopeInfo.
function checkSharedScopeInfo({snapshot, analysis}: ContextFixture): void {
  const scope = singleScopeForScript(analysis, 'context.js');

  assert.deepEqual(allContextFields(snapshot, scope), ['captured', 'dead']);
  assert.deepEqual(deadFieldNames(scope), [['dead'], ['dead']]);
}

// Reports dead fields across nested context chains.
function checkNestedContexts({snapshot, analysis}: ContextFixture): void {
  const scopes = scopesForScript(analysis, 'nested.js');
  assert.lengthOf(scopes, 2);
  const outerScope = scopeWithDeadField(scopes, 'outerDead');
  const innerScope = scopeWithDeadField(scopes, 'innerDead');

  assert.deepEqual(allContextFields(snapshot, outerScope), ['outerCaptured', 'outerDead']);
  assert.deepEqual(allContextFields(snapshot, innerScope), ['innerCaptured', 'innerDead']);
  assert.deepEqual(deadFieldNames(outerScope), [['outerDead']]);
  assert.deepEqual(deadFieldNames(innerScope), [['innerDead']]);
  assert.notStrictEqual(outerScope.scopeInfoNodeIndex, innerScope.scopeInfoNodeIndex);
}

// Analyzes block-scoped fields in a block scope.
function checkBlockScopes({snapshot, analysis}: ContextFixture): void {
  const scopes = scopesForScript(analysis, 'block.js');
  assert.lengthOf(scopes, 2);
  const functionScope = scopeWithDeadField(scopes, 'functionDead');
  const blockScope = scopeWithDeadField(scopes, 'blockDead');

  assert.deepEqual(allContextFields(snapshot, functionScope), ['functionCaptured', 'functionDead']);
  assert.deepEqual(allContextFields(snapshot, blockScope), ['blockCaptured', 'blockDead']);
  assert.deepEqual(deadFieldNames(functionScope), [['functionDead']]);
  assert.deepEqual(deadFieldNames(blockScope), [['blockDead']]);
}

// Analyzes variables used across block and inner scopes.
function checkBlockVariables({snapshot, analysis}: ContextFixture): void {
  const scope = singleScopeForScript(analysis, 'block-variable.js');

  assert.deepEqual(allContextFields(snapshot, scope), ['dead', 'paramCaptured']);
  assert.deepEqual(deadFieldNames(scope), [['dead']]);
}

// Does not report variables used in local blocks inside an inner closure as
// dead.
function checkBlockVariablesInInnerClosure({analysis}: ContextFixture): void {
  assertNoScopes(analysis, 'block-variable-inner.js');
}

// Analyzes contexts created for for-of block scopes.
function checkForOfScopes({snapshot, analysis}: ContextFixture): void {
  const scopes = scopesForScript(analysis, 'for-of.js');
  assert.lengthOf(scopes, 2);
  const iterationScope = scopeWithDeadField(scopes, 'item');
  const bodyScope = scopeWithDeadField(scopes, 'dead');

  assert.deepEqual(allContextFields(snapshot, iterationScope), ['item']);
  assert.deepEqual(allContextFields(snapshot, bodyScope), ['captured', 'dead']);
  assert.deepEqual(deadFieldNames(iterationScope), [['item'], ['item']]);
  assert.deepEqual(deadFieldNames(bodyScope), [['dead'], ['dead']]);
}

// Classifies a field per context based on whether its reader closure is live.
function checkDeadClosure({snapshot, analysis}: ContextFixture): void {
  const scope = singleScopeForScript(analysis, 'dead-closure.js');

  assert.deepEqual(allContextFields(snapshot, scope), ['alwaysDead', 'usedOnlyByReader']);
  assert.deepEqual(deadFieldNames(scope), [
    ['alwaysDead', 'usedOnlyByReader'],
    ['alwaysDead'],
  ]);
}

// Accounts for an inner closure that a live closure can still instantiate.
function checkUninstantiatedInnerClosure({snapshot, analysis}: ContextFixture): void {
  const scope = singleScopeForScript(analysis, 'uninstantiated-inner.js');

  assert.deepEqual(allContextFields(snapshot, scope), ['dead', 'usedByUninstantiatedInner']);
  assert.deepEqual(deadFieldNames(scope), [['dead']]);
}

// Distinguishes shadowed fields belonging to different source scopes.
function checkShadowedFields({snapshot, analysis}: ContextFixture): void {
  const scopes = scopesForScript(analysis, 'shadowed.js');
  assert.lengthOf(scopes, 2);
  const outerScope = scopeWithDeadField(scopes, 'outerDead');
  const innerScope = scopeWithDeadField(scopes, 'innerDead');

  assert.deepEqual(allContextFields(snapshot, outerScope), ['outerDead', 'shadowed']);
  assert.deepEqual(allContextFields(snapshot, innerScope), ['innerDead', 'shadowed']);
  assert.deepEqual(deadFieldNames(outerScope), [['outerDead']]);
  assert.deepEqual(deadFieldNames(innerScope), [['innerDead']]);
}

// Analyzes parameter and function-body contexts.
function checkParameterAndBodyContexts({snapshot, analysis}: ContextFixture): void {
  const scopes = scopesForScript(analysis, 'parameter.js');
  assert.lengthOf(scopes, 2);
  const parameterScope = scopeWithDeadField(scopes, 'parameterDead');
  const bodyScope = scopeWithDeadField(scopes, 'bodyDead');

  assert.deepEqual(allContextFields(snapshot, parameterScope), ['parameterCaptured', 'parameterDead']);
  assert.deepEqual(allContextFields(snapshot, bodyScope), ['bodyCaptured', 'bodyDead']);
  assert.deepEqual(deadFieldNames(parameterScope), [['parameterDead']]);
  assert.deepEqual(deadFieldNames(bodyScope), [['bodyDead']]);
  assert.notStrictEqual(parameterScope.scopeInfoNodeIndex, bodyScope.scopeInfoNodeIndex);
}

// Analyzes closures created in class instance and static field initializers.
function checkClassFieldInitializers({snapshot, analysis}: ContextFixture): void {
  const scopes = scopesForScript(analysis, 'class.js');
  assert.lengthOf(scopes, 2);
  const instanceScope = scopeWithDeadField(scopes, 'instanceDead');
  const staticScope = scopeWithDeadField(scopes, 'staticDead');

  assert.deepEqual(allContextFields(snapshot, instanceScope), ['instanceCaptured', 'instanceDead']);
  assert.deepEqual(deadFieldNames(instanceScope), [['instanceDead']]);

  assert.deepEqual(allContextFields(snapshot, staticScope), ['staticCaptured', 'staticDead']);
  assert.deepEqual(deadFieldNames(staticScope), [['staticDead']]);
  assert.notStrictEqual(instanceScope.scopeInfoNodeIndex, staticScope.scopeInfoNodeIndex);
}

// Analyzes class instance and static field initializers capturing outer
// context variables.
function checkClassDirectFieldInitializers({snapshot, analysis}: ContextFixture): void {
  const scopes = scopesForScript(analysis, 'class-direct.js');
  assert.lengthOf(scopes, 2);
  const instanceInitScope = scopeWithDeadField(scopes, 'instanceInitDead');
  const staticInitScope = scopeWithDeadField(scopes, 'staticInitDead');

  assert.deepEqual(allContextFields(snapshot, instanceInitScope), ['instanceInitCaptured', 'instanceInitDead']);
  assert.deepEqual(deadFieldNames(instanceInitScope), [['instanceInitDead']]);

  assert.deepEqual(allContextFields(snapshot, staticInitScope), ['staticInitDead', 'staticInitRegularDead']);
  assert.deepEqual(deadFieldNames(staticInitScope), [['staticInitDead', 'staticInitRegularDead']]);
  assert.notStrictEqual(instanceInitScope.scopeInfoNodeIndex, staticInitScope.scopeInfoNodeIndex);
}

// Analyzes closures created in class instance and static methods.
function checkClassMethods({snapshot, analysis}: ContextFixture): void {
  const scopes = scopesForScript(analysis, 'class-methods.js');
  assert.lengthOf(scopes, 2);
  const instanceScope = scopeWithDeadField(scopes, 'instanceMethodDead');
  const staticScope = scopeWithDeadField(scopes, 'staticMethodDead');

  assert.deepEqual(allContextFields(snapshot, instanceScope), ['instanceMethodCaptured', 'instanceMethodDead']);
  assert.deepEqual(deadFieldNames(instanceScope), [['instanceMethodDead']]);

  assert.deepEqual(allContextFields(snapshot, staticScope), ['staticMethodCaptured', 'staticMethodDead']);
  assert.deepEqual(deadFieldNames(staticScope), [['staticMethodDead']]);
  assert.notStrictEqual(instanceScope.scopeInfoNodeIndex, staticScope.scopeInfoNodeIndex);
}

// Analyzes contexts created inside class instance and static field
// initializer expressions.
function checkClassInitializerContexts({snapshot, analysis}: ContextFixture): void {
  const scopes = scopesForScript(analysis, 'class-initializer-context.js');
  assert.lengthOf(scopes, 2);
  const instanceScope = scopeWithDeadField(scopes, 'instanceInitLocalDead');
  const staticScope = scopeWithDeadField(scopes, 'staticInitLocalDead');

  assert.deepEqual(allContextFields(snapshot, instanceScope), ['instanceInitLocalCaptured', 'instanceInitLocalDead']);
  assert.deepEqual(deadFieldNames(instanceScope), [['instanceInitLocalDead']]);

  assert.deepEqual(allContextFields(snapshot, staticScope), ['staticInitLocalCaptured', 'staticInitLocalDead']);
  assert.deepEqual(deadFieldNames(staticScope), [['staticInitLocalDead']]);
  assert.notStrictEqual(instanceScope.scopeInfoNodeIndex, staticScope.scopeInfoNodeIndex);
}

// Analyzes block-scoped fields in a catch body.
function checkCatchBody({snapshot, analysis}: ContextFixture): void {
  const bodyScope = singleScopeForScript(analysis, 'catch.js');

  assert.deepEqual(allContextFields(snapshot, bodyScope), ['catchDead']);
  assert.deepEqual(deadFieldNames(bodyScope), [['catchDead']]);
}

// Analyzes dead exception variables in catch scopes.
function checkCatchParameter({snapshot, analysis}: ContextFixture): void {
  const scope = singleScopeForScript(analysis, 'catch-parameter.js');

  assert.deepEqual(allContextFields(snapshot, scope), ['caught']);
  assert.deepEqual(deadFieldNames(scope), [['caught']]);
}

// Analyzes contexts of closures created inside a with statement.
//
// TODO(crbug.com/557403144): Call this from the test below once the pinned
// Chrome for Testing ships V8 15.6.5 or later, which includes
// https://crrev.com/c/8379162 ("[profiler] Emit uses for potential accesses
// inside with"). Without it, V8 does not report that `withReader` reads
// `outerCaptured` through the `with` scope and the analysis reports
// `outerCaptured` as dead as well.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function checkWithStatement({snapshot, analysis}: ContextFixture): void {
  const scope = singleScopeForScript(analysis, 'with.js');

  assert.deepEqual(allContextFields(snapshot, scope), ['outerCaptured', 'outerDead']);
  assert.deepEqual(deadFieldNames(scope), [['outerDead']]);
}

// Classifies a context-allocated receiver based on whether the arrow reading
// it is live.
function checkCapturedThis({snapshot, analysis}: ContextFixture): void {
  const scope = singleScopeForScript(analysis, 'captured-this.js');

  assert.deepEqual(allContextFields(snapshot, scope), ['alwaysDead', 'this']);
  assert.deepEqual(deadFieldNames(scope), [
    ['alwaysDead', 'this'],
    ['alwaysDead'],
  ]);
}

// Analyzes context fields with eval.
function checkDirectEval({snapshot, analysis}: ContextFixture): void {
  const scope = singleScopeForScript(analysis, 'direct-eval.js');

  assert.deepEqual(allContextFields(snapshot, scope), ['siblingCaptured', 'siblingDead']);
  assert.deepEqual(deadFieldNames(scope), [['siblingDead']]);
}

// Analyzes context fields inside direct eval.
function checkInsideDirectEval({snapshot, analysis}: ContextFixture): void {
  const scope = singleScopeForScript(analysis, 'inside-direct-eval.js');

  assert.deepEqual(allContextFields(snapshot, scope), ['insideEvalCaptured', 'insideEvalDead']);
  assert.deepEqual(deadFieldNames(scope), [['insideEvalDead']]);
}

// Loads contexts retained by suspended generators.
function checkGenerator({snapshot, analysis}: ContextFixture): void {
  const scope = singleScopeForScript(analysis, 'generator.js');

  assert.deepEqual(allContextFields(snapshot, scope), ['generatorDead', 'neededAfterYield']);
  assert.deepEqual(deadFieldNames(scope), [['generatorDead']]);
}

// Loads contexts retained by suspended async functions.
function checkAsyncFunction({snapshot, analysis}: ContextFixture): void {
  const scope = singleScopeForScript(analysis, 'async.js');

  assert.deepEqual(allContextFields(snapshot, scope), ['asyncDead', 'neededAfterAwait']);
  assert.deepEqual(deadFieldNames(scope), [['asyncDead']]);
}

// Parses module scopes and reports their script metadata.
function checkModuleScopes({snapshot, analysis}: ContextFixture): void {
  const scope = singleScopeForScript(analysis, 'module.js');

  assert.isTrue(scope.scriptName === 'module.js' || scope.scriptName.endsWith('/module.js'));
  assert.deepEqual(allContextFields(snapshot, scope), ['moduleCaptured', 'moduleDead']);
  assert.deepEqual(deadFieldNames(scope), [['moduleDead']]);
}

// Does not report script scopes holding top-level let and const yet.
//
// Top-level `let`/`const` of a classic script live in a script context, whose
// ScopeInfo cannot be attributed to a script at the moment: no live
// SharedFunctionInfo references a SCRIPT_SCOPE ScopeInfo through
// `name_or_scope_info` (the top-level SharedFunctionInfo is gone once the
// script finished running), and being outermost it has no `outer_scope_info`
// to walk up either. Module scopes do not have that problem because the module
// keeps its top-level SharedFunctionInfo alive.
//
// TODO: Once script contexts can be attributed to their script, this should
// report a single scope for script.js with the context fields
// ['scriptCaptured', 'scriptDead'], of which 'scriptDead' is dead.
function checkScriptScopes({analysis}: ContextFixture): void {
  assertNoScopes(analysis, 'script.js');
}

describe('HeapSnapshot analyze context fields API Test', () => {
  // Recording and analyzing a heap snapshot costs about half a second, which
  // dwarfs the checks themselves. They therefore all share a single snapshot
  // of a page that loads every fixture script at once.
  it('analyzes context fields', async state => {
    const fixture = await loadContextFixture(state);

    checkNodeIdsAndIndices(fixture);
    checkSharedScopeInfo(fixture);
    checkNestedContexts(fixture);
    checkBlockScopes(fixture);
    checkBlockVariables(fixture);
    checkBlockVariablesInInnerClosure(fixture);
    checkForOfScopes(fixture);
    checkDeadClosure(fixture);
    checkUninstantiatedInnerClosure(fixture);
    checkShadowedFields(fixture);
    checkParameterAndBodyContexts(fixture);
    checkClassFieldInitializers(fixture);
    checkClassDirectFieldInitializers(fixture);
    checkClassMethods(fixture);
    checkClassInitializerContexts(fixture);
    checkCatchBody(fixture);
    checkCatchParameter(fixture);
    // Disabled until the pinned Chrome for Testing ships V8 15.6.5, see the
    // TODO on `checkWithStatement`.
    // checkWithStatement(fixture);
    checkCapturedThis(fixture);
    checkDirectEval(fixture);
    checkInsideDirectEval(fixture);
    checkGenerator(fixture);
    checkAsyncFunction(fixture);
    checkModuleScopes(fixture);
    checkScriptScopes(fixture);
  });
});
