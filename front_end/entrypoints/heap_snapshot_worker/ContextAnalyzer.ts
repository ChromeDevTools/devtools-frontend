// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../core/platform/platform.js';
import type * as HeapSnapshotModel from '../../models/heap_snapshot/heap_snapshot.js';

import type {HeapSnapshot, HeapSnapshotNode} from './HeapSnapshot.js';

/**
 * Index of a `system / Script` node within the heap snapshot's node array.
 */
type ScriptNodeIndex = Platform.Brand.Brand<number, 'ScriptNodeIndex'>;

/**
 * Identifier of a scope, as emitted by V8 in the snapshot's scope table. Only
 * unique within a single script.
 */
type ScopeId = Platform.Brand.Brand<number, 'ScopeId'>;

/**
 * Index of a `system / ScopeInfo` node within the heap snapshot's node array.
 */
type ScopeInfoNodeIndex = Platform.Brand.Brand<number, 'ScopeInfoNodeIndex'>;

/**
 * Index of a V8 `Context` node within the heap snapshot's node array.
 */
type ContextNodeIndex = Platform.Brand.Brand<number, 'ContextNodeIndex'>;

/**
 * Index of a `system / Map` node within the heap snapshot's node array.
 */
type MapNodeIndex = Platform.Brand.Brand<number, 'MapNodeIndex'>;

/**
 * Values addressed by scope. Since a `ScopeId` is only unique within its
 * script, scopes are keyed by script first.
 */
type ByScope<T> = Map<ScriptNodeIndex, Map<ScopeId, T>>;

interface EmbeddedScope {
  scriptNodeIndex: ScriptNodeIndex;
  scopeId: ScopeId;
  parent?: EmbeddedScope;
  children: EmbeddedScope[];
  variables: VariableDefinition[];
}

interface VariableDefinition {
  name: string;
  slotIndex: number;
  uses: EmbeddedScope[];
}

interface ScriptInfo {
  name: string;
  nodeId: number;
}

interface MatchedContext {
  contextNodeIndex: ContextNodeIndex;
  contextNodeId: number;
  fieldValueNodeIndexes: number[];
}

interface ScopeAccumulator {
  scopeInfoNodeIndex: ScopeInfoNodeIndex;
  scopeInfoNodeId: number;
  scriptNodeIndex: ScriptNodeIndex;
  scriptNodeId: number;
  scriptName: string;
  scopeName?: string;
  scopeStart: number;
  scopeEnd: number;
  scope: EmbeddedScope;
  fieldNames: string[];
  contexts: MatchedContext[];
}

interface LiveClosure {
  // The JSFunction or generator object this entry was created for.
  ownerNodeIndex: number;
  contextNodeIndex: ContextNodeIndex;
  scriptNodeIndex: ScriptNodeIndex;
  scopeId: ScopeId;
}

interface LiveFunction {
  // All context objects reachable through live closures/JSFunctions of this function
  // definition. This includes all context objects reachable through their 'previous'
  // predecessors.
  contextNodeIndexes: Set<ContextNodeIndex>;
}

interface ContextNodeInfo {
  contextNodeIndex: ContextNodeIndex;
  contextNodeId: number;
  scopeInfoNodeIndex: ScopeInfoNodeIndex;
}

/**
 * Everything collected while walking over all nodes of the snapshot once.
 */
interface HeapScan {
  scripts: Map<ScriptNodeIndex, ScriptInfo>;
  contextNodes: ContextNodeInfo[];
  liveClosures: LiveClosure[];
  // Top-level functions of modules that finished evaluating.
  finishedModuleFunctionNodeIndexes: Set<number>;
  // Maps a ScopeInfo to the script it belongs to. A stored `undefined` is a memoized
  // failed lookup. It is therefore not the same as an absent entry, which merely means
  // "not resolved yet".
  scopeInfoScriptNodeIndexes: Map<ScopeInfoNodeIndex, ScriptNodeIndex|undefined>;
}

export function analyzeContexts(snapshot: HeapSnapshot): HeapSnapshotModel.HeapSnapshotModel.ContextAnalysisResult {
  // (1) Parse embedded scope metadata from the snapshot.
  const scopesByScript = parseEmbeddedScopes(snapshot);

  // (2) Scan the heap to collect scripts, contexts, live closures, and associate function ScopeInfos
  // with scripts.
  const scan = scanHeap(snapshot);

  // (3) Group live closures by function scope and record the context chains they can reach.
  const liveFunctionsByScript = buildLiveFunctions(snapshot, scan.liveClosures, scan.finishedModuleFunctionNodeIndexes);

  // (4) Correlate contexts and their field values with embedded scopes.
  const {scopes, scriptsWithoutScopes} = correlateContextsWithScopes(snapshot, scan, scopesByScript);

  // (5) Classify fields per context and build the result objects.
  const scopeAnalyses = classifyFields(snapshot, scopes, liveFunctionsByScript);

  // (6) Sort dead fields, contexts, and scopes, then return the analysis.
  return sortAndBuildResult(scopeAnalyses, scriptsWithoutScopes);
}

function parseEmbeddedScopes(snapshot: HeapSnapshot): ByScope<EmbeddedScope> {
  const scopesByScript: ByScope<EmbeddedScope> = new Map();
  const profile = snapshot.profile;
  const rawScopes = profile.scopes ?? [];
  const rawVars = profile.scope_context_vars ?? [];
  const rawUses = profile.scope_uses ?? [];
  const meta = profile.snapshot.meta;

  const scopeFields = meta.scope_fields ?? [];
  const varFields = meta.scope_context_var_fields ?? [];
  const useFields = meta.scope_use_fields ?? [];

  const scopeStride = scopeFields.length;
  const varStride = varFields.length;
  const useStride = useFields.length;

  if (scopeStride === 0) {
    return scopesByScript;
  }

  const scriptNodeIndexOffset = scopeFields.indexOf('script_node_index');
  const scopeIdOffset = scopeFields.indexOf('scope_id');
  const depthOffset = scopeFields.indexOf('depth');
  const varsCountOffset = scopeFields.indexOf('scope_context_vars_count');
  const usesCountOffset = scopeFields.indexOf('scope_uses_count');

  const varNameOffset = varFields.indexOf('name');
  const useDeclaringScopeIdOffset = useFields.indexOf('declaring_scope_id');
  const useSlotIndexOffset = useFields.indexOf('slot_index');

  const strings = snapshot.strings;

  // Pass 1: Create all scopes and variable definitions, and link parents via depth.
  let varOffset = 0;
  let currentScriptNodeIndex: ScriptNodeIndex|undefined;
  const scopeStack: EmbeddedScope[] = [];

  for (let i = 0; i < rawScopes.length; i += scopeStride) {
    const scriptNodeIndex = rawScopes[i + scriptNodeIndexOffset] as ScriptNodeIndex;
    const scopeId = rawScopes[i + scopeIdOffset] as ScopeId;
    const depth = rawScopes[i + depthOffset];
    const varsCount = rawScopes[i + varsCountOffset];

    const variables: VariableDefinition[] = [];
    for (let j = 0; j < varsCount; ++j) {
      const nameIndex = rawVars[varOffset + j * varStride + varNameOffset];
      variables.push({
        name: strings[nameIndex],
        slotIndex: j,
        uses: [],
      });
    }
    varOffset += varsCount * varStride;

    const scope: EmbeddedScope = {
      scriptNodeIndex,
      scopeId,
      children: [],
      variables,
    };

    if (currentScriptNodeIndex !== scriptNodeIndex) {
      currentScriptNodeIndex = scriptNodeIndex;
      scopeStack.length = 0;
    }

    if (depth > 0) {
      const parent = scopeStack[depth - 1];
      scope.parent = parent;
      parent.children.push(scope);
    }

    // The tree hierarchy is encoded through a depth field in the heap snapshot. Here we
    // set the scope as the innermost scope by trimming the stack.
    scopeStack[depth] = scope;
    scopeStack.length = depth + 1;  // Trim the stack.

    let scriptScopes = scopesByScript.get(scriptNodeIndex);
    if (!scriptScopes) {
      scriptScopes = new Map<ScopeId, EmbeddedScope>();
      scopesByScript.set(scriptNodeIndex, scriptScopes);
    }
    scriptScopes.set(scopeId, scope);
  }

  // Pass 2: Resolve variable uses directly from rawUses.
  let useOffset = 0;
  for (let i = 0; i < rawScopes.length; i += scopeStride) {
    const scriptNodeIndex = rawScopes[i + scriptNodeIndexOffset] as ScriptNodeIndex;
    const scopeId = rawScopes[i + scopeIdOffset] as ScopeId;
    const usesCount = rawScopes[i + usesCountOffset];

    const scope = scopesByScript.get(scriptNodeIndex)?.get(scopeId);
    if (scope) {
      for (let j = 0; j < usesCount; ++j) {
        const declaringScopeId = rawUses[useOffset + j * useStride + useDeclaringScopeIdOffset] as ScopeId;
        const slotIndex = rawUses[useOffset + j * useStride + useSlotIndexOffset];
        const declaringScope = scopesByScript.get(scriptNodeIndex)?.get(declaringScopeId);
        const variable = declaringScope?.variables[slotIndex];
        if (variable && !variable.uses.includes(scope)) {
          variable.uses.push(scope);
        }
      }
    }
    useOffset += usesCount * useStride;
  }

  return scopesByScript;
}

function scanHeap(snapshot: HeapSnapshot): HeapScan {
  const scripts = new Map<ScriptNodeIndex, ScriptInfo>();
  const contextNodes: ContextNodeInfo[] = [];
  const liveClosures: LiveClosure[] = [];
  const finishedModuleFunctionNodeIndexes = new Set<number>();
  // Caches for each map whether it belongs to a generator object. See `isGeneratorObject`.
  const generatorMapNodeIndexes = new Map<MapNodeIndex, boolean>();
  const scopeInfoScriptNodeIndexes = new Map<ScopeInfoNodeIndex, ScriptNodeIndex|undefined>();
  const node = snapshot.createNode();
  const nodes = snapshot.nodes;
  const nodeFieldCount = snapshot.nodeFieldCount;
  const nodeClosureType = snapshot.nodeClosureType;

  for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += nodeFieldCount) {
    node.nodeIndex = nodeIndex;
    const rawName = node.rawName();

    if (rawName.startsWith('system / Script')) {
      processScript(scripts, node);
      processScriptScopeInfos(scopeInfoScriptNodeIndexes, node);
    } else if (snapshot.isContextObject(node)) {
      processContext(contextNodes, node);
    } else if (node.rawType() === nodeClosureType) {
      processClosure(liveClosures, node);
    } else if (isGeneratorObject(generatorMapNodeIndexes, node)) {
      processGeneratorObject(liveClosures, finishedModuleFunctionNodeIndexes, node);
    }
  }

  return {scripts, contextNodes, liveClosures, finishedModuleFunctionNodeIndexes, scopeInfoScriptNodeIndexes};
}

function processScript(scripts: Map<ScriptNodeIndex, ScriptInfo>, node: HeapSnapshotNode): void {
  const rawName = node.rawName();
  const scriptNodeIndex = node.nodeIndex as ScriptNodeIndex;
  const scriptNamePrefix = 'system / Script / ';
  let name = rawName.startsWith(scriptNamePrefix) ? rawName.substring(scriptNamePrefix.length) : '';
  if (!name) {
    name = node.findInternalEdgeTarget('source_url')?.name() ?? '';
  }
  scripts.set(scriptNodeIndex, {
    name,
    nodeId: node.id(),
  });
}

function processScriptScopeInfos(
    scopeInfoScriptNodeIndexes: Map<ScopeInfoNodeIndex, ScriptNodeIndex|undefined>,
    scriptNode: HeapSnapshotNode,
    ): void {
  const infos = scriptNode.findInternalEdgeTarget('infos');
  if (!infos) {
    return;
  }

  const scriptNodeIndex = scriptNode.nodeIndex as ScriptNodeIndex;
  const scopeInfoNode = scriptNode.snapshot.createNode();

  // A script created by a direct `eval` records the scope its `eval` call appeared in. That scope
  // and the ones enclosing it belong to the calling script, so walks from this script's ScopeInfos
  // have to stop there. This is like V8's `Scope::DeserializeScopeChain` detecting eval boundaries.
  //
  // Stopping at the root scope (see `attributeScopeInfoChain`) is not enough here: the eval scope
  // only gets a ScopeInfo if it needs a context. Without one, the ScopeInfo chains of this script's
  // functions skip it and lead straight to the call-site scope, without passing a root scope.
  //
  // The call-site scope itself is assigned by the calling script, which lists it in its `infos`.
  const evalFromScopeInfo = scriptNode.findInternalEdgeTarget('eval_from_scope_info');
  const stopAtNodeIndex = evalFromScopeInfo?.rawName() === 'system / ScopeInfo' ?
      evalFromScopeInfo.nodeIndex as ScopeInfoNodeIndex :
      undefined;

  for (let iter = infos.edges(); iter.hasNext(); iter.next()) {
    const info = iter.edge.node();
    const infoName = info.rawName();

    // Besides SharedFunctionInfos, V8 lists the ScopeInfo of the innermost scope with a context
    // around each direct `eval` call of this script. It belongs to this script, as do the scopes
    // enclosing it up to the root scope of this script.
    if (infoName === 'system / ScopeInfo') {
      attributeScopeInfoChain(scopeInfoScriptNodeIndexes, info.nodeIndex as ScopeInfoNodeIndex, stopAtNodeIndex,
                              scriptNodeIndex, scopeInfoNode);
      continue;
    }

    if (!infoName.startsWith('system / SharedFunctionInfo')) {
      continue;
    }
    const sharedFunctionInfo = info;

    // A compiled function has a ScopeInfo of its own in `name_or_scope_info`. It belongs to this
    // script, as do the scopes enclosing it up to the root scope of this script.
    const scopeInfo = sharedFunctionInfo.findInternalEdgeTarget('name_or_scope_info');
    if (scopeInfo?.rawName() === 'system / ScopeInfo') {
      attributeScopeInfoChain(scopeInfoScriptNodeIndexes, scopeInfo.nodeIndex as ScopeInfoNodeIndex, stopAtNodeIndex,
                              scriptNodeIndex, scopeInfoNode);
      continue;
    }

    // While a function is uncompiled it has no ScopeInfo of its own, so use the ScopeInfo of its
    // enclosing scope instead. A script's root function is always compiled, but if it weren't, its
    // enclosing scope would lie outside of this script, so skip it.
    const scopeId = sharedFunctionInfo.findInternalEdgeTarget('scope_id')?.nodeValueAsInt();
    if (scopeId === undefined || isScriptRootScopeId(scopeId)) {
      continue;
    }

    // Except for the root function, the enclosing ScopeInfo belongs to this script. The exception
    // is a function in eval'd code whose eval scope has no context: its enclosing ScopeInfo is then
    // the scope around the `eval` call in the calling script (`eval_from_scope_info`), where
    // `attributeScopeInfoChain` stops.
    const outerScopeInfo = sharedFunctionInfo.findInternalEdgeTarget('raw_outer_scope_info_or_feedback_metadata');
    if (outerScopeInfo?.rawName() === 'system / ScopeInfo') {
      attributeScopeInfoChain(scopeInfoScriptNodeIndexes, outerScopeInfo.nodeIndex as ScopeInfoNodeIndex,
                              stopAtNodeIndex, scriptNodeIndex, scopeInfoNode);
    }
  }
}

/**
 * Assigns the ScopeInfo at `scopeInfoNodeIndex` and the ones enclosing it to the script at
 * `scriptNodeIndex`. Stops at the root scope of the script, or at `stopAtNodeIndex`, the
 * `eval_from_scope_info` of the script, which belongs to the calling script.
 *
 * Only this function assigns ScopeInfos while scanning the heap, and it always continues up to
 * such a boundary. An already assigned ScopeInfo therefore means that its enclosing ScopeInfos
 * are assigned as well, so the walk can stop there too.
 */
function attributeScopeInfoChain(
    scopeInfoScriptNodeIndexes: Map<ScopeInfoNodeIndex, ScriptNodeIndex|undefined>,
    scopeInfoNodeIndex: ScopeInfoNodeIndex,
    stopAtNodeIndex: ScopeInfoNodeIndex|undefined,
    scriptNodeIndex: ScriptNodeIndex,
    scopeInfoNode: HeapSnapshotNode,
    ): void {
  let currentNodeIndex = scopeInfoNodeIndex;
  for (;;) {
    if (currentNodeIndex === stopAtNodeIndex) {
      // This is the call site of the `eval` that created this script. It belongs to the calling
      // script.
      return;
    }
    if (scopeInfoScriptNodeIndexes.has(currentNodeIndex)) {
      // This scope info was already assigned to a script.
      return;
    }
    scopeInfoScriptNodeIndexes.set(currentNodeIndex, scriptNodeIndex);

    scopeInfoNode.nodeIndex = currentNodeIndex;
    // A root scope's `outer_scope_info` leads into another script (e.g. the one calling `eval`), so
    // stop here. This only catches root scopes that have a context. The call site of a context-less
    // eval scope is caught through `stopAtNodeIndex` above.
    if (isScriptRootScopeInfo(scopeInfoNode)) {
      return;
    }
    // The outer scope of a non-root scope can be assigned to the same script.
    const outerScopeInfo = scopeInfoNode.findInternalEdgeTarget('outer_scope_info');
    if (!outerScopeInfo) {
      return;
    }
    currentNodeIndex = outerScopeInfo.nodeIndex as ScopeInfoNodeIndex;
  }
}

function isScriptRootScopeInfo(node: HeapSnapshotNode): boolean {
  const scopeId = node.findInternalEdgeTarget('scope_id')?.nodeValueAsInt();
  return scopeId !== undefined && isScriptRootScopeId(scopeId);
}

function isScriptRootScopeId(scopeId: number): boolean {
  // -2 is the scope id V8 gives the outermost scope of a script: its script, eval or module scope.
  // V8 derives scope ids from source positions and uses negative ids for scopes that would otherwise
  // start at position 0. The other one is -1 for a wrapped function (`ScriptCompiler::CompileFunction`),
  // which is still enclosed by an eval scope of the same script.
  return scopeId === -2;
}

function processContext(contextNodes: ContextNodeInfo[], node: HeapSnapshotNode): void {
  const scopeInfoNodeIndex = node.findInternalEdgeTarget('scope_info')?.nodeIndex as ScopeInfoNodeIndex | undefined;
  if (scopeInfoNodeIndex === undefined) {
    return;
  }
  contextNodes.push({
    contextNodeIndex: node.nodeIndex as ContextNodeIndex,
    contextNodeId: node.id(),
    scopeInfoNodeIndex,
  });
}

function processClosure(liveClosures: LiveClosure[], node: HeapSnapshotNode): void {
  const sharedFunctionInfo = node.findInternalEdgeTarget('shared');
  const closureContext = node.findInternalEdgeTarget('context');
  if (!sharedFunctionInfo || !closureContext) {
    return;
  }
  addLiveClosure(liveClosures, node, sharedFunctionInfo, closureContext);
}

function addLiveClosure(liveClosures: LiveClosure[], ownerNode: HeapSnapshotNode, sharedFunctionInfo: HeapSnapshotNode,
                        contextNode: HeapSnapshotNode): void {
  const script = sharedFunctionInfo.findInternalEdgeTarget('script');
  if (!script) {
    return;
  }
  const scopeId = sharedFunctionInfo.findInternalEdgeTarget('scope_id')?.nodeValueAsInt() as ScopeId | undefined;
  if (scopeId !== undefined) {
    liveClosures.push({
      ownerNodeIndex: ownerNode.nodeIndex,
      contextNodeIndex: contextNode.nodeIndex as ContextNodeIndex,
      scriptNodeIndex: script.nodeIndex as ScriptNodeIndex,
      scopeId,
    });
  }
}

// V8's `JSGeneratorObject::kGeneratorClosed`: the generator has finished and can't be resumed.
const GENERATOR_CLOSED = -1;

/**
 * Handles generator objects, which V8 uses for generators, async functions, async generators and
 * the top-level code of modules.
 */
function processGeneratorObject(liveClosures: LiveClosure[], finishedModuleFunctionNodeIndexes: Set<number>,
                                node: HeapSnapshotNode): void {
  const continuation = node.findInternalEdgeTarget('continuation')?.nodeValueAsInt();
  const generatorFunction = node.findInternalEdgeTarget('function');
  if (continuation === undefined || generatorFunction?.rawType() !== node.snapshot.nodeClosureType) {
    return;
  }
  const sharedFunctionInfo = generatorFunction.findInternalEdgeTarget('shared');
  if (!sharedFunctionInfo) {
    return;
  }
  if (continuation === GENERATOR_CLOSED) {
    const scopeId = sharedFunctionInfo.findInternalEdgeTarget('scope_id')?.nodeValueAsInt();

    // Only the top-level code of a module is both a generator and a root scope.
    if (scopeId !== undefined && isScriptRootScopeId(scopeId)) {
      // A module stores a reference to its generator object. The generator object then
      // references the top-level JSFunction. Once the generator object is finished its
      // JSFunction can't run anymore and user code can't call it. Here we record such closures
      // in order to skip them later in buildLiveFunctions().
      finishedModuleFunctionNodeIndexes.add(generatorFunction.nodeIndex);
    }

    // A finished generator can't run again, so it doesn't get a LiveClosure. That way the fields
    // of its context can be reported as dead.
    return;
  }
  const generatorContext = node.findInternalEdgeTarget('context');
  if (generatorContext) {
    // The context of the generator's function is the one the function was created in. The body
    // of the generator, however, runs in a context of its own, which only the generator object
    // refers to. A generator therefore counts as a closure of its function with the context
    // it resumes in.
    addLiveClosure(liveClosures, node, sharedFunctionInfo, generatorContext);
  }
}

// V8's instance types of `JSGeneratorObject` and its subclasses.
const GENERATOR_INSTANCE_TYPE_NAMES = new Set([
  'JS_GENERATOR_OBJECT_TYPE',
  'JS_ASYNC_FUNCTION_OBJECT_TYPE',
  'JS_ASYNC_GENERATOR_OBJECT_TYPE',
]);

/**
 * Checks the instance type of the object's map, so that other objects with fields of the same name
 * aren't mistaken for generator objects. The result is cached for each map.
 */
function isGeneratorObject(generatorMapNodeIndexes: Map<MapNodeIndex, boolean>, node: HeapSnapshotNode): boolean {
  if (node.rawType() !== node.snapshot.nodeObjectType) {
    return false;
  }
  const map = node.findInternalEdgeTarget('map');
  if (!map) {
    return false;
  }
  const mapNodeIndex = map.nodeIndex as MapNodeIndex;
  let isGenerator = generatorMapNodeIndexes.get(mapNodeIndex);
  if (isGenerator === undefined) {
    const instanceTypeName = map.findInternalEdgeTarget('instance_type_name')?.rawName();
    isGenerator = instanceTypeName !== undefined && GENERATOR_INSTANCE_TYPE_NAMES.has(instanceTypeName);
    generatorMapNodeIndexes.set(mapNodeIndex, isGenerator);
  }
  return isGenerator;
}

function buildLiveFunctions(snapshot: HeapSnapshot, liveClosures: LiveClosure[],
                            finishedModuleFunctionNodeIndexes: Set<number>): ByScope<LiveFunction> {
  const liveFunctionsByScript: ByScope<LiveFunction> = new Map();
  const node = snapshot.createNode();

  for (const closure of liveClosures) {
    if (finishedModuleFunctionNodeIndexes.has(closure.ownerNodeIndex)) {
      // The top-level code of this module has finished and can't run anymore.
      continue;
    }
    let scriptFunctions = liveFunctionsByScript.get(closure.scriptNodeIndex);
    if (!scriptFunctions) {
      scriptFunctions = new Map<ScopeId, LiveFunction>();
      liveFunctionsByScript.set(closure.scriptNodeIndex, scriptFunctions);
    }
    let liveFunction = scriptFunctions.get(closure.scopeId);
    if (!liveFunction) {
      liveFunction = {
        contextNodeIndexes: new Set(),
      };
      scriptFunctions.set(closure.scopeId, liveFunction);
    }
    let contextNodeIndex: ContextNodeIndex|undefined = closure.contextNodeIndex;
    while (contextNodeIndex !== undefined && !liveFunction.contextNodeIndexes.has(contextNodeIndex)) {
      node.nodeIndex = contextNodeIndex;
      if (!snapshot.isContextObject(node)) {
        break;
      }
      liveFunction.contextNodeIndexes.add(contextNodeIndex);
      contextNodeIndex = node.findInternalEdgeTarget('previous')?.nodeIndex as ContextNodeIndex | undefined;
    }
  }

  return liveFunctionsByScript;
}

function correlateContextsWithScopes(snapshot: HeapSnapshot, scan: HeapScan, scopesByScript: ByScope<EmbeddedScope>): {
  scopes: Map<ScopeInfoNodeIndex, ScopeAccumulator>,
  scriptsWithoutScopes: HeapSnapshotModel.HeapSnapshotModel.ScriptWithoutScopes[],
} {
  const scriptsWithoutScopesByScript =
      new Map<ScriptNodeIndex, HeapSnapshotModel.HeapSnapshotModel.ScriptWithoutScopes>();
  const scopes = new Map<ScopeInfoNodeIndex, ScopeAccumulator>();
  const node = snapshot.createNode();

  for (const context of scan.contextNodes) {
    const scopeInfoNodeIndex = context.scopeInfoNodeIndex;
    const existingScope = scopes.get(scopeInfoNodeIndex);
    if (existingScope) {
      const fieldValueNodeIndexes: number[] = [];
      node.nodeIndex = context.contextNodeIndex;
      for (const edges = node.edges(); edges.hasNext(); edges.next()) {
        const edge = edges.item();
        if (edge.type() === 'context') {
          fieldValueNodeIndexes.push(edge.nodeIndex());
        }
      }
      existingScope.contexts.push({
        contextNodeIndex: context.contextNodeIndex,
        contextNodeId: context.contextNodeId,
        fieldValueNodeIndexes,
      });
      continue;
    }

    node.nodeIndex = scopeInfoNodeIndex;
    const scopeId = node.findInternalEdgeTarget('scope_id')?.nodeValueAsInt() as ScopeId | undefined;
    if (scopeId === undefined) {
      continue;
    }

    const scopeInfoNodeId = node.id();
    const scopeStart = node.findInternalEdgeTarget('start_position')?.nodeValueAsInt() ?? 0;
    const scopeEnd = node.findInternalEdgeTarget('end_position')?.nodeValueAsInt() ?? 0;
    const scopeName = node.findInternalEdgeTarget('function_name')?.name();

    const scriptNodeIndex =
        resolveScopeInfoScriptNodeIndex(snapshot, scan.scopeInfoScriptNodeIndexes, scopeInfoNodeIndex);
    const script = scriptNodeIndex !== undefined ? scan.scripts.get(scriptNodeIndex) : undefined;
    if (scriptNodeIndex === undefined || !script) {
      continue;
    }

    const existingScriptWithoutScopes = scriptsWithoutScopesByScript.get(scriptNodeIndex);
    if (existingScriptWithoutScopes) {
      existingScriptWithoutScopes.contextCount++;
      continue;
    }

    const embeddedScopes = scopesByScript.get(scriptNodeIndex);
    if (!embeddedScopes) {
      scriptsWithoutScopesByScript.set(scriptNodeIndex, {
        scriptNodeIndex,
        scriptNodeId: script.nodeId,
        scriptName: script.name,
        contextCount: 1,
      });
      continue;
    }

    const embeddedScope = embeddedScopes.get(scopeId);
    if (!embeddedScope) {
      continue;
    }

    const fieldNames: string[] = [];
    const fieldValueNodeIndexes: number[] = [];
    node.nodeIndex = context.contextNodeIndex;
    for (const edges = node.edges(); edges.hasNext(); edges.next()) {
      const edge = edges.item();
      if (edge.type() === 'context') {
        fieldNames.push(edge.name());
        fieldValueNodeIndexes.push(edge.nodeIndex());
      }
    }

    scopes.set(scopeInfoNodeIndex, {
      scopeInfoNodeIndex,
      scopeInfoNodeId,
      scriptNodeIndex,
      scriptNodeId: script.nodeId,
      scriptName: script.name,
      scopeName,
      scopeStart,
      scopeEnd,
      scope: embeddedScope,
      fieldNames,
      contexts: [{
        contextNodeIndex: context.contextNodeIndex,
        contextNodeId: context.contextNodeId,
        fieldValueNodeIndexes,
      }],
    });
  }

  return {
    scopes,
    scriptsWithoutScopes: [...scriptsWithoutScopesByScript.values()],
  };
}

function resolveScopeInfoScriptNodeIndex(
    snapshot: HeapSnapshot,
    scopeInfoScriptNodeIndexes: Map<ScopeInfoNodeIndex, ScriptNodeIndex|undefined>,
    scopeInfoNodeIndex: ScopeInfoNodeIndex,
    ): ScriptNodeIndex|undefined {
  if (scopeInfoScriptNodeIndexes.has(scopeInfoNodeIndex)) {
    return scopeInfoScriptNodeIndexes.get(scopeInfoNodeIndex);
  }
  const visited: ScopeInfoNodeIndex[] = [];
  const seen = new Set<ScopeInfoNodeIndex>();
  const node = snapshot.createNode();
  let currentNodeIndex = scopeInfoNodeIndex;
  let scriptNodeIndex: ScriptNodeIndex|undefined;
  while (!seen.has(currentNodeIndex)) {
    if (scopeInfoScriptNodeIndexes.has(currentNodeIndex)) {
      scriptNodeIndex = scopeInfoScriptNodeIndexes.get(currentNodeIndex);
      break;
    }
    seen.add(currentNodeIndex);
    visited.push(currentNodeIndex);
    node.nodeIndex = currentNodeIndex;
    if (isScriptRootScopeInfo(node)) {
      // This scope belongs to a script of its own, so leaving it through
      // `outer_scope_info` would attribute it to the wrong script.
      break;
    }
    const outerScopeInfo = node.findInternalEdgeTarget('outer_scope_info');
    if (!outerScopeInfo) {
      break;
    }
    currentNodeIndex = outerScopeInfo.nodeIndex as ScopeInfoNodeIndex;
  }
  for (const visitedNodeIndex of visited) {
    scopeInfoScriptNodeIndexes.set(visitedNodeIndex, scriptNodeIndex);
  }
  return scriptNodeIndex;
}

function classifyFields(
    snapshot: HeapSnapshot,
    scopes: Map<ScopeInfoNodeIndex, ScopeAccumulator>,
    liveFunctionsByScript: ByScope<LiveFunction>,
    ): HeapSnapshotModel.HeapSnapshotModel.ScopeAnalysis[] {
  const scopeAnalyses: HeapSnapshotModel.HeapSnapshotModel.ScopeAnalysis[] = [];
  const node = snapshot.createNode();

  for (const scope of scopes.values()) {
    const scopeContexts: HeapSnapshotModel.HeapSnapshotModel.ContextAnalysis[] = [];
    for (const context of scope.contexts) {
      let contextDeadFieldsRetainedSizeSum = 0;
      const deadFields: HeapSnapshotModel.HeapSnapshotModel.ContextField[] = [];
      for (let fieldIndex = 0; fieldIndex < context.fieldValueNodeIndexes.length; ++fieldIndex) {
        const fieldName = scope.fieldNames[fieldIndex];
        const variable = scope.scope.variables.find(v => v.name === fieldName);
        if (!variable) {
          // Missing variable definition. Nothing to check in this case.
          continue;
        }
        if (isVariableUsedInContext(liveFunctionsByScript, scope.scriptNodeIndex, context.contextNodeIndex, variable)) {
          // Only report dead fields.
          continue;
        }
        const fieldValueNodeIndex = context.fieldValueNodeIndexes[fieldIndex];
        node.nodeIndex = fieldValueNodeIndex;
        const retainedSize = node.retainedSize();
        deadFields.push({
          name: fieldName,
          valueNodeIndex: fieldValueNodeIndex,
          valueNodeId: node.id(),
          valueName: node.name(),
          valueType: node.type(),
          selfSize: node.selfSize(),
          retainedSize,
        });
        contextDeadFieldsRetainedSizeSum += retainedSize;
      }
      if (deadFields.length === 0) {
        continue;
      }
      node.nodeIndex = context.contextNodeIndex;
      scopeContexts.push({
        contextNodeIndex: context.contextNodeIndex,
        contextNodeId: node.id(),
        retainedSize: node.retainedSize(),
        deadFieldsRetainedSizeSum: contextDeadFieldsRetainedSizeSum,
        deadFields,
      });
    }
    if (scopeContexts.length === 0) {
      continue;
    }
    scopeAnalyses.push({
      scopeInfoNodeIndex: scope.scopeInfoNodeIndex,
      scopeInfoNodeId: scope.scopeInfoNodeId,
      scriptNodeIndex: scope.scriptNodeIndex,
      scriptNodeId: scope.scriptNodeId,
      scriptName: scope.scriptName,
      scopeName: scope.scopeName,
      scopeStart: scope.scopeStart,
      scopeEnd: scope.scopeEnd,
      contextFieldCount: scope.fieldNames.length,
      contexts: scopeContexts,
    });
  }

  return scopeAnalyses;
}

// Determines whether a specific allocated Context instance (`contextNodeIndex`)
// is reachable by any live closure (or inner function instantiable by a live closure)
// that accesses this variable.
function isVariableUsedInContext(
    liveFunctionsByScript: ByScope<LiveFunction>,
    scriptNodeIndex: ScriptNodeIndex,
    contextNodeIndex: ContextNodeIndex,
    variable: VariableDefinition,
    ): boolean {
  const liveFunctionsByScopeId = liveFunctionsByScript.get(scriptNodeIndex);
  if (!liveFunctionsByScopeId) {
    return false;
  }
  for (const usingScope of variable.uses) {
    // Walk up the lexical scope chain from the variable's use site.
    // This checks if the use site is inside a live closure itself (or one
    // of its nested block scopes) OR inside an uninstantiated function
    // enclosed by a live closure.
    //
    // Executing a live outer closure can instantiate any function nested
    // inside it, so those inner functions can access the outer closure's
    // context chain even when no closure exists for them yet on the heap.
    //
    // Example:
    //   function outer() {
    //     const x = 1;
    //     return function middle() {       // <- liveFunction (on heap)
    //       return function inner() {
    //         return x;                    // <- use site
    //       };
    //     };
    //   }
    // No closure object exists on the heap for `inner` yet (so `inner` is
    // not in `liveFunctionsByScript`). However, walking up from `inner`'s
    // scope reaches `middle`. Since `middle` is a live closure on the heap
    // whose context chain includes `outer`'s Context containing `x`,
    // executing `middle()` in the future will instantiate `inner`, giving it
    // access to `outer`'s Context containing `x`.
    for (let curr: EmbeddedScope|undefined = usingScope; curr; curr = curr.parent) {
      const liveFunction = liveFunctionsByScopeId.get(curr.scopeId);
      if (liveFunction?.contextNodeIndexes.has(contextNodeIndex)) {
        return true;
      }
    }
  }
  return false;
}

function sortAndBuildResult(
    scopeAnalyses: HeapSnapshotModel.HeapSnapshotModel.ScopeAnalysis[],
    scriptsWithoutScopes: HeapSnapshotModel.HeapSnapshotModel.ScriptWithoutScopes[],
    ): HeapSnapshotModel.HeapSnapshotModel.ContextAnalysisResult {
  const compareContexts = (
      left: HeapSnapshotModel.HeapSnapshotModel.ContextAnalysis,
      right: HeapSnapshotModel.HeapSnapshotModel.ContextAnalysis,
      ): number => {
    return right.deadFieldsRetainedSizeSum - left.deadFieldsRetainedSizeSum || right.retainedSize - left.retainedSize ||
        left.contextNodeIndex - right.contextNodeIndex;
  };
  for (const scope of scopeAnalyses) {
    for (const context of scope.contexts) {
      context.deadFields.sort((left, right) => right.retainedSize - left.retainedSize);
    }
    scope.contexts.sort(compareContexts);
  }
  scopeAnalyses.sort((left, right) => compareContexts(left.contexts[0], right.contexts[0]));
  scriptsWithoutScopes.sort((left, right) => left.scriptNodeIndex - right.scriptNodeIndex);
  return {scopes: scopeAnalyses, scriptsWithoutScopes};
}
