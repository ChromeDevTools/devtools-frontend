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
  // Maps a ScopeInfo to the script it belongs to. Only contains the ScopeInfos
  // directly referenced by a SharedFunctionInfo, the remaining ones are resolved
  // and memoized on demand by `resolveScopeInfoScriptNodeIndex`.
  //
  // A stored `undefined` is a memoized failed lookup, i.e. walking the
  // `outer_scope_info` chain of that ScopeInfo did not reach a script. It is
  // therefore not the same as an absent entry, which merely means "not resolved
  // yet", so lookups have to distinguish the two through `has()`.
  scopeInfoScriptNodeIndexes: Map<ScopeInfoNodeIndex, ScriptNodeIndex|undefined>;
}

export function analyzeContexts(snapshot: HeapSnapshot): HeapSnapshotModel.HeapSnapshotModel.ContextAnalysisResult {
  // (1) Parse embedded scope metadata from the snapshot.
  const scopesByScript = parseEmbeddedScopes(snapshot);

  // (2) Scan the heap to collect scripts, contexts, live closures, and associate function ScopeInfos
  // with scripts.
  const scan = scanHeap(snapshot);

  // (3) Group live closures by function scope and record the context chains they can reach.
  const liveFunctionsByScript = buildLiveFunctions(snapshot, scan.liveClosures);

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
    } else if (snapshot.isContextObject(node)) {
      processContext(contextNodes, node);
    } else if (node.rawType() === nodeClosureType) {
      processClosure(liveClosures, node);
    } else if (rawName.startsWith('system / SharedFunctionInfo')) {
      processSharedFunctionInfo(scopeInfoScriptNodeIndexes, node);
    }
  }

  return {scripts, contextNodes, liveClosures, scopeInfoScriptNodeIndexes};
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
  const script = sharedFunctionInfo.findInternalEdgeTarget('script');
  if (!script) {
    return;
  }
  const scopeId = sharedFunctionInfo.findInternalEdgeTarget('scope_id')?.nodeValueAsInt() as ScopeId | undefined;
  if (scopeId !== undefined) {
    liveClosures.push({
      contextNodeIndex: closureContext.nodeIndex as ContextNodeIndex,
      scriptNodeIndex: script.nodeIndex as ScriptNodeIndex,
      scopeId,
    });
  }
}

function processSharedFunctionInfo(scopeInfoScriptNodeIndexes: Map<ScopeInfoNodeIndex, ScriptNodeIndex|undefined>,
                                   node: HeapSnapshotNode): void {
  const scopeInfo = node.findInternalEdgeTarget('name_or_scope_info');
  const script = node.findInternalEdgeTarget('script');
  if (scopeInfo?.rawName() !== 'system / ScopeInfo' || !script?.rawName().startsWith('system / Script')) {
    return;
  }
  scopeInfoScriptNodeIndexes.set(scopeInfo.nodeIndex as ScopeInfoNodeIndex, script.nodeIndex as ScriptNodeIndex);
}

function buildLiveFunctions(snapshot: HeapSnapshot, liveClosures: LiveClosure[]): ByScope<LiveFunction> {
  const liveFunctionsByScript: ByScope<LiveFunction> = new Map();
  const node = snapshot.createNode();

  for (const closure of liveClosures) {
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
