var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/models/cpu_profile/CPUProfileDataModel.js
var CPUProfileDataModel_exports = {};
__export(CPUProfileDataModel_exports, {
  CPUProfileDataModel: () => CPUProfileDataModel,
  CPUProfileNode: () => CPUProfileNode
});
import * as Platform from "./../../core/platform/platform.js";

// gen/front_end/models/cpu_profile/ProfileTreeModel.js
var ProfileTreeModel_exports = {};
__export(ProfileTreeModel_exports, {
  ProfileNode: () => ProfileNode,
  ProfileTreeModel: () => ProfileTreeModel
});
var ProfileNode = class {
  callFrame;
  callUID;
  self;
  total;
  id;
  parent;
  children;
  originalFunctionName = null;
  depth;
  deoptReason;
  constructor(callFrame) {
    this.callFrame = callFrame;
    this.callUID = `${callFrame.functionName}@${callFrame.scriptId}:${callFrame.lineNumber}:${callFrame.columnNumber}`;
    this.self = 0;
    this.total = 0;
    this.id = 0;
    this.parent = null;
    this.children = [];
  }
  get scriptId() {
    return String(this.callFrame.scriptId);
  }
  get url() {
    return this.callFrame.url;
  }
  get lineNumber() {
    return this.callFrame.lineNumber;
  }
  get columnNumber() {
    return this.callFrame.columnNumber;
  }
  get functionName() {
    return this.originalFunctionName ?? this.callFrame.functionName;
  }
  setOriginalFunctionName(name) {
    this.originalFunctionName = name;
  }
};
var ProfileTreeModel = class {
  root;
  total;
  maxDepth;
  initialize(root) {
    this.root = root;
    this.assignDepthsAndParents();
    this.total = this.calculateTotals(this.root);
  }
  assignDepthsAndParents() {
    const root = this.root;
    root.depth = -1;
    root.parent = null;
    this.maxDepth = 0;
    const nodesToTraverse = [root];
    while (nodesToTraverse.length) {
      const parent = nodesToTraverse.pop();
      const depth = parent.depth + 1;
      if (depth > this.maxDepth) {
        this.maxDepth = depth;
      }
      const children = parent.children;
      for (const child of children) {
        child.depth = depth;
        child.parent = parent;
        nodesToTraverse.push(child);
      }
    }
  }
  calculateTotals(root) {
    const nodesToTraverse = [root];
    const dfsList = [];
    while (nodesToTraverse.length) {
      const node = nodesToTraverse.pop();
      node.total = node.self;
      dfsList.push(node);
      nodesToTraverse.push(...node.children);
    }
    while (dfsList.length > 1) {
      const node = dfsList.pop();
      if (node.parent) {
        node.parent.total += node.total;
      }
    }
    return root.total;
  }
};

// gen/front_end/models/cpu_profile/CPUProfileDataModel.js
var CPUProfileNode = class extends ProfileNode {
  id;
  self;
  // Position ticks are available in profile nodes coming from CDP
  // profiles and not in those coming from tracing. They are used to
  // calculate the line level execution time shown in the Sources panel
  // after recording a profile. For trace CPU profiles we use the
  // `lines` array instead.
  positionTicks;
  deoptReason;
  constructor(node, samplingInterval) {
    const callFrame = node.callFrame || {
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // @ts-expect-error
      functionName: node["functionName"],
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // @ts-expect-error
      scriptId: node["scriptId"],
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // @ts-expect-error
      url: node["url"],
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // @ts-expect-error
      lineNumber: node["lineNumber"] - 1,
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // @ts-expect-error
      columnNumber: node["columnNumber"] - 1
    };
    super(callFrame);
    this.id = node.id;
    this.self = (node.hitCount || 0) * samplingInterval;
    this.positionTicks = node.positionTicks;
    this.deoptReason = node.deoptReason && node.deoptReason !== "no reason" ? node.deoptReason : null;
  }
};
var CPUProfileDataModel = class extends ProfileTreeModel {
  profileStartTime;
  profileEndTime;
  timestamps;
  samples;
  /**
   * Contains trace ids assigned to samples, if any. Trace ids are
   * keyed by the sample index in the profile. These are only created
   * for CPU profiles coming from traces.
   */
  traceIds;
  lines;
  totalHitCount;
  profileHead;
  /**
   * A cache for the nodes we have parsed.
   * Note: "Parsed" nodes are different from the "Protocol" nodes, the
   * latter being the raw data we receive from the backend.
   */
  #idToParsedNode;
  gcNode;
  programNode;
  idleNode;
  #stackStartTimes;
  #stackChildrenDuration;
  constructor(profile) {
    super();
    const isLegacyFormat = Boolean(profile["head"]);
    if (isLegacyFormat) {
      this.profileStartTime = profile.startTime * 1e3;
      this.profileEndTime = profile.endTime * 1e3;
      this.timestamps = profile.timestamps;
      this.compatibilityConversionHeadToNodes(profile);
    } else {
      this.profileStartTime = profile.startTime / 1e3;
      this.profileEndTime = profile.endTime / 1e3;
      this.timestamps = this.convertTimeDeltas(profile);
    }
    this.traceIds = profile.traceIds;
    this.samples = profile.samples;
    this.lines = profile.lines;
    this.totalHitCount = 0;
    this.profileHead = this.translateProfileTree(profile.nodes);
    this.initialize(this.profileHead);
    this.extractMetaNodes();
    if (this.samples?.length) {
      this.sortSamples();
      this.normalizeTimestamps();
      this.fixMissingSamples();
    }
  }
  compatibilityConversionHeadToNodes(profile) {
    if (!profile.head || profile.nodes) {
      return;
    }
    const nodes = [];
    convertNodesTree(profile.head);
    profile.nodes = nodes;
    delete profile.head;
    function convertNodesTree(node) {
      nodes.push(node);
      node.children = node.children.map(convertNodesTree);
      return node.id;
    }
  }
  /**
   * Calculate timestamps using timeDeltas. Some CPU profile formats,
   * like the ones contained in traces have timeDeltas instead of
   * timestamps.
   */
  convertTimeDeltas(profile) {
    if (!profile.timeDeltas) {
      return [];
    }
    let lastTimeMicroSec = profile.startTime;
    const timestamps = new Array(profile.timeDeltas.length);
    for (let i = 0; i < profile.timeDeltas.length; ++i) {
      lastTimeMicroSec += profile.timeDeltas[i];
      timestamps[i] = lastTimeMicroSec;
    }
    return timestamps;
  }
  /**
   * Creates a Tree of CPUProfileNodes using the Protocol.Profiler.ProfileNodes.
   * As the tree is built, samples of native code (prefixed with "native ") are
   * filtered out. Samples of filtered nodes are replaced with the parent of the
   * node being filtered.
   *
   * This function supports legacy and new definitions of the CDP Profiler.Profile
   * type.
   */
  translateProfileTree(nodes) {
    function buildChildrenFromParents(nodes2) {
      if (nodes2[0].children) {
        return;
      }
      nodes2[0].children = [];
      for (let i = 1; i < nodes2.length; ++i) {
        const node = nodes2[i];
        const parentNode = protocolNodeById.get(node.parent);
        if (!parentNode) {
          continue;
        }
        if (parentNode.children) {
          parentNode.children.push(node.id);
        } else {
          parentNode.children = [node.id];
        }
      }
    }
    function buildHitCountFromSamples(nodes2, samples) {
      if (typeof nodes2[0].hitCount === "number") {
        return;
      }
      if (!samples) {
        throw new Error("Error: Neither hitCount nor samples are present in profile.");
      }
      for (let i = 0; i < nodes2.length; ++i) {
        nodes2[i].hitCount = 0;
      }
      for (let i = 0; i < samples.length; ++i) {
        const node = protocolNodeById.get(samples[i]);
        if (node?.hitCount === void 0) {
          continue;
        }
        node.hitCount++;
      }
    }
    const protocolNodeById = /* @__PURE__ */ new Map();
    for (let i = 0; i < nodes.length; ++i) {
      const node = nodes[i];
      protocolNodeById.set(node.id, node);
    }
    buildHitCountFromSamples(nodes, this.samples);
    buildChildrenFromParents(nodes);
    this.totalHitCount = nodes.reduce((acc, node) => acc + (node.hitCount || 0), 0);
    const sampleTime = (this.profileEndTime - this.profileStartTime) / this.totalHitCount;
    const root = nodes[0];
    const idToUseForRemovedNode = /* @__PURE__ */ new Map([[root.id, root.id]]);
    this.#idToParsedNode = /* @__PURE__ */ new Map();
    const resultRoot = new CPUProfileNode(root, sampleTime);
    this.#idToParsedNode.set(root.id, resultRoot);
    if (!root.children) {
      throw new Error("Missing children for root");
    }
    const parentNodeStack = root.children.map(() => resultRoot);
    const sourceNodeStack = root.children.map((id) => protocolNodeById.get(id));
    while (sourceNodeStack.length) {
      let parentNode = parentNodeStack.pop();
      const sourceNode = sourceNodeStack.pop();
      if (!sourceNode || !parentNode) {
        continue;
      }
      if (!sourceNode.children) {
        sourceNode.children = [];
      }
      const targetNode = new CPUProfileNode(sourceNode, sampleTime);
      parentNode.children.push(targetNode);
      parentNode = targetNode;
      idToUseForRemovedNode.set(sourceNode.id, parentNode.id);
      parentNodeStack.push.apply(parentNodeStack, sourceNode.children.map(() => parentNode));
      sourceNodeStack.push.apply(sourceNodeStack, sourceNode.children.map((id) => protocolNodeById.get(id)));
      this.#idToParsedNode.set(sourceNode.id, targetNode);
    }
    if (this.samples) {
      this.samples = this.samples.map((id) => idToUseForRemovedNode.get(id));
    }
    return resultRoot;
  }
  /**
   * Sorts the samples array using the timestamps array (there is a one
   * to one matching by index between the two).
   */
  sortSamples() {
    if (!this.timestamps || !this.samples) {
      return;
    }
    const timestamps = this.timestamps;
    const samples = this.samples;
    const orderedIndices = timestamps.map((_x, index) => index);
    orderedIndices.sort((a, b) => timestamps[a] - timestamps[b]);
    this.timestamps = [];
    this.samples = [];
    for (let i = 0; i < orderedIndices.length; i++) {
      const orderedIndex = orderedIndices[i];
      this.timestamps.push(timestamps[orderedIndex]);
      this.samples.push(samples[orderedIndex]);
    }
  }
  /**
   * Fills in timestamps and/or time deltas from legacy profiles where
   * they could be missing.
   */
  normalizeTimestamps() {
    if (!this.samples) {
      return;
    }
    let timestamps = this.timestamps;
    if (!timestamps) {
      const profileStartTime = this.profileStartTime;
      const interval = (this.profileEndTime - profileStartTime) / this.samples.length;
      timestamps = new Array(this.samples.length + 1);
      for (let i = 0; i < timestamps.length; ++i) {
        timestamps[i] = profileStartTime + i * interval;
      }
      this.timestamps = timestamps;
      return;
    }
    for (let i = 0; i < timestamps.length; ++i) {
      timestamps[i] /= 1e3;
    }
    if (this.samples.length === timestamps.length) {
      const lastTimestamp = timestamps.at(-1) || 0;
      const averageIntervalTime = (lastTimestamp - timestamps[0]) / (timestamps.length - 1);
      this.timestamps.push(lastTimestamp + averageIntervalTime);
    }
    this.profileStartTime = timestamps.at(0) || this.profileStartTime;
    this.profileEndTime = timestamps.at(-1) || this.profileEndTime;
  }
  /**
   * Some nodes do not refer to JS samples but to V8 system tasks, AKA
   * "meta" nodes. This function extracts those nodes from the profile.
   */
  extractMetaNodes() {
    const topLevelNodes = this.profileHead.children;
    for (let i = 0; i < topLevelNodes.length && !(this.gcNode && this.programNode && this.idleNode); i++) {
      const node = topLevelNodes[i];
      if (node.functionName === "(garbage collector)") {
        this.gcNode = node;
      } else if (node.functionName === "(program)") {
        this.programNode = node;
      } else if (node.functionName === "(idle)") {
        this.idleNode = node;
      }
    }
  }
  fixMissingSamples() {
    const samples = this.samples;
    if (!samples) {
      return;
    }
    const samplesCount = samples.length;
    if (!this.programNode || samplesCount < 3) {
      return;
    }
    const idToNode = this.#idToParsedNode;
    const programNodeId = this.programNode.id;
    const gcNodeId = this.gcNode ? this.gcNode.id : -1;
    const idleNodeId = this.idleNode ? this.idleNode.id : -1;
    let prevNodeId = samples[0];
    let nodeId = samples[1];
    for (let sampleIndex = 1; sampleIndex < samplesCount - 1; sampleIndex++) {
      const nextNodeId = samples[sampleIndex + 1];
      const prevNode = idToNode.get(prevNodeId);
      const nextNode = idToNode.get(nextNodeId);
      if (prevNodeId === void 0 || nextNodeId === void 0 || !prevNode || !nextNode) {
        console.error(`Unexpectedly found undefined nodes: ${prevNodeId} ${nextNodeId}`);
        continue;
      }
      if (nodeId === programNodeId && !isSystemNode(prevNodeId) && !isSystemNode(nextNodeId) && bottomNode(prevNode) === bottomNode(nextNode)) {
        samples[sampleIndex] = prevNodeId;
      }
      prevNodeId = nodeId;
      nodeId = nextNodeId;
    }
    function bottomNode(node) {
      while (node.parent?.parent) {
        node = node.parent;
      }
      return node;
    }
    function isSystemNode(nodeId2) {
      return nodeId2 === programNodeId || nodeId2 === gcNodeId || nodeId2 === idleNodeId;
    }
  }
  /**
   * Traverses the call tree derived from the samples calling back when a call is opened
   * and when it's closed
   */
  forEachFrame(openFrameCallback, closeFrameCallback, startTime, stopTime) {
    if (!this.profileHead || !this.samples) {
      return;
    }
    startTime = startTime || 0;
    stopTime = stopTime || Infinity;
    const samples = this.samples;
    const timestamps = this.timestamps;
    const idToNode = this.#idToParsedNode;
    const gcNode = this.gcNode;
    const samplesCount = samples.length;
    const startIndex = Platform.ArrayUtilities.lowerBound(timestamps, startTime, Platform.ArrayUtilities.DEFAULT_COMPARATOR);
    let stackTop = 0;
    const stackNodes = [];
    let prevId = this.profileHead.id;
    let sampleTime;
    let gcParentNode = null;
    const stackDepth = this.maxDepth + 3;
    if (!this.#stackStartTimes) {
      this.#stackStartTimes = new Array(stackDepth);
    }
    const stackStartTimes = this.#stackStartTimes;
    if (!this.#stackChildrenDuration) {
      this.#stackChildrenDuration = new Array(stackDepth);
    }
    const stackChildrenDuration = this.#stackChildrenDuration;
    let node;
    let sampleIndex;
    for (sampleIndex = startIndex; sampleIndex < samplesCount; sampleIndex++) {
      sampleTime = timestamps[sampleIndex];
      if (sampleTime >= stopTime) {
        break;
      }
      const id = samples[sampleIndex];
      if (id === prevId) {
        continue;
      }
      node = idToNode.get(id);
      let prevNode = idToNode.get(prevId) || null;
      if (!prevNode) {
        continue;
      }
      if (gcNode && node === gcNode) {
        gcParentNode = prevNode;
        openFrameCallback(gcParentNode.depth + 1, gcNode, sampleIndex, sampleTime);
        stackStartTimes[++stackTop] = sampleTime;
        stackChildrenDuration[stackTop] = 0;
        prevId = id;
        continue;
      }
      if (gcNode && prevNode === gcNode && gcParentNode) {
        const start = stackStartTimes[stackTop];
        const duration = sampleTime - start;
        stackChildrenDuration[stackTop - 1] += duration;
        closeFrameCallback(gcParentNode.depth + 1, gcNode, sampleIndex, start, duration, duration - stackChildrenDuration[stackTop]);
        --stackTop;
        prevNode = gcParentNode;
        prevId = prevNode.id;
        gcParentNode = null;
      }
      while (node && node.depth > prevNode.depth) {
        stackNodes.push(node);
        node = node.parent;
      }
      while (prevNode && prevNode !== node) {
        const start = stackStartTimes[stackTop];
        const duration = sampleTime - start;
        stackChildrenDuration[stackTop - 1] += duration;
        closeFrameCallback(prevNode.depth, prevNode, sampleIndex, start, duration, duration - stackChildrenDuration[stackTop]);
        --stackTop;
        if (node && node.depth === prevNode.depth) {
          stackNodes.push(node);
          node = node.parent;
        }
        prevNode = prevNode.parent;
      }
      while (stackNodes.length) {
        const currentNode = stackNodes.pop();
        if (!currentNode) {
          break;
        }
        node = currentNode;
        openFrameCallback(currentNode.depth, currentNode, sampleIndex, sampleTime);
        stackStartTimes[++stackTop] = sampleTime;
        stackChildrenDuration[stackTop] = 0;
      }
      prevId = id;
    }
    sampleTime = timestamps[sampleIndex] || this.profileEndTime;
    if (node && gcParentNode && idToNode.get(prevId) === gcNode) {
      const start = stackStartTimes[stackTop];
      const duration = sampleTime - start;
      stackChildrenDuration[stackTop - 1] += duration;
      closeFrameCallback(gcParentNode.depth + 1, node, sampleIndex, start, duration, duration - stackChildrenDuration[stackTop]);
      --stackTop;
      prevId = gcParentNode.id;
    }
    for (let node2 = idToNode.get(prevId); node2?.parent; node2 = node2.parent) {
      const start = stackStartTimes[stackTop];
      const duration = sampleTime - start;
      stackChildrenDuration[stackTop - 1] += duration;
      closeFrameCallback(node2.depth, node2, sampleIndex, start, duration, duration - stackChildrenDuration[stackTop]);
      --stackTop;
    }
  }
  /**
   * Returns the node that corresponds to a given index of a sample.
   */
  nodeByIndex(index) {
    return this.samples && this.#idToParsedNode.get(this.samples[index]) || null;
  }
  /**
   * Returns the node that corresponds to a given node id.
   */
  nodeById(nodeId) {
    return this.#idToParsedNode.get(nodeId) || null;
  }
  nodes() {
    if (!this.#idToParsedNode) {
      return null;
    }
    return [...this.#idToParsedNode.values()];
  }
};
export {
  CPUProfileDataModel_exports as CPUProfileDataModel,
  ProfileTreeModel_exports as ProfileTreeModel
};
//# sourceMappingURL=cpu_profile.js.map
