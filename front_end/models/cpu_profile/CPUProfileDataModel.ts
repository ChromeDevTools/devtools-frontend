// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import type * as Protocol from '../../generated/protocol.js';

import {ProfileNode, ProfileTreeModel} from './ProfileTreeModel.js';

export class CPUProfileNode extends ProfileNode {
  override id: number;
  override self: number;
  // Position ticks are available in profile nodes coming from CDP
  // profiles and not in those coming from tracing. They are used to
  // calculate the line level execution time shown in the Sources panel
  // after recording a profile. For trace CPU profiles we use the
  // `lines` array instead.
  positionTicks: Protocol.Profiler.PositionTickInfo[]|undefined;
  override deoptReason: string|null;

  constructor(node: Protocol.Profiler.ProfileNode, samplingInterval: number /* milliseconds */) {
    const callFrame = node.callFrame || ({
                        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
                        // @ts-expect-error
                        functionName: node['functionName'],
                        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
                        // @ts-expect-error
                        scriptId: node['scriptId'],
                        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
                        // @ts-expect-error
                        url: node['url'],
                        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
                        // @ts-expect-error
                        lineNumber: node['lineNumber'] - 1,
                        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
                        // @ts-expect-error
                        columnNumber: node['columnNumber'] - 1,
                      } as Protocol.Runtime.CallFrame);
    super(callFrame);
    this.id = node.id;
    this.self = (node.hitCount || 0) * samplingInterval;
    this.positionTicks = node.positionTicks;
    // Compatibility: legacy backends could provide "no reason" for optimized functions.
    this.deoptReason = node.deoptReason && node.deoptReason !== 'no reason' ? node.deoptReason : null;
  }
}

export class CPUProfileDataModel extends ProfileTreeModel {
  profileStartTime: number /* milliseconds */;
  profileEndTime: number /* milliseconds */;
  timestamps: number[];
  samples: number[]|undefined;
  lines?: number[];
  totalHitCount: number;
  profileHead: CPUProfileNode;
  /**
   * A cache for the nodes we have parsed.
   * Note: "Parsed" nodes are different from the "Protocol" nodes, the
   * latter being the raw data we receive from the backend.
   */
  #idToParsedNode!: Map<number, ProfileNode>;
  gcNode?: ProfileNode;
  programNode?: ProfileNode;
  idleNode?: ProfileNode;
  #stackStartTimes?: number[];
  #stackChildrenDuration?: number[];
  constructor(profile: ExtendedProfile) {
    super();
    // @ts-ignore Legacy types
    const isLegacyFormat = Boolean(profile['head']);
    if (isLegacyFormat) {
      // Legacy format contains raw timestamps and start/stop times are in seconds.
      this.profileStartTime = profile.startTime * 1000;
      this.profileEndTime = profile.endTime * 1000;
      // @ts-ignore Legacy types
      this.timestamps = profile.timestamps;
      this.compatibilityConversionHeadToNodes(profile);
    } else {
      // Current format encodes timestamps as deltas. Start/stop times are in microseconds.
      this.profileStartTime = profile.startTime / 1000;
      this.profileEndTime = profile.endTime / 1000;
      this.timestamps = this.convertTimeDeltas(profile);
    }
    this.samples = profile.samples;

    // Lines are available only in profiles coming from tracing.
    // Elements in the lines array have a 1 to 1 correspondance with
    // samples, by array position. They can be 1 or 0 and indicate if
    // there is line data for a given sample, i.e. if a given sample
    // needs to be included to calculate the line level execution time
    // data, which we show in the sources panel after recording a
    // profile.
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

  private compatibilityConversionHeadToNodes(profile: Protocol.Profiler.Profile): void {
    // @ts-ignore Legacy types
    if (!profile.head || profile.nodes) {
      return;
    }
    const nodes: Protocol.Profiler.ProfileNode[] = [];
    // @ts-ignore Legacy types
    convertNodesTree(profile.head);
    profile.nodes = nodes;
    // @ts-ignore Legacy types
    delete profile.head;
    function convertNodesTree(node: Protocol.Profiler.ProfileNode): number {
      nodes.push(node);
      // @ts-ignore Legacy types
      node.children = (node.children as Protocol.Profiler.ProfileNode[]).map(convertNodesTree);
      return node.id;
    }
  }

  /**
   * Calculate timestamps using timeDeltas. Some CPU profile formats,
   * like the ones contained in traces have timeDeltas instead of
   * timestamps.
   */
  private convertTimeDeltas(profile: Protocol.Profiler.Profile): number[] {
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
  private translateProfileTree(nodes: Protocol.Profiler.ProfileNode[]): CPUProfileNode {
    function buildChildrenFromParents(nodes: Protocol.Profiler.ProfileNode[]): void {
      if (nodes[0].children) {
        return;
      }
      nodes[0].children = [];
      for (let i = 1; i < nodes.length; ++i) {
        const node = nodes[i];
        // @ts-ignore Legacy types
        const parentNode = protocolNodeById.get(node.parent);
        // @ts-ignore Legacy types
        if (parentNode.children) {
          // @ts-ignore Legacy types
          parentNode.children.push(node.id);
        } else {
          // @ts-ignore Legacy types
          parentNode.children = [node.id];
        }
      }
    }

    /**
     * Calculate how many times each node was sampled in the profile, if
     * not available in the profile data.
     */
    function buildHitCountFromSamples(nodes: Protocol.Profiler.ProfileNode[], samples: number[]|undefined): void {
      // If hit count is available, this profile has the new format, so
      // no need to continue.`
      if (typeof (nodes[0].hitCount) === 'number') {
        return;
      }
      if (!samples) {
        throw new Error('Error: Neither hitCount nor samples are present in profile.');
      }
      for (let i = 0; i < nodes.length; ++i) {
        nodes[i].hitCount = 0;
      }
      for (let i = 0; i < samples.length; ++i) {
        const node = protocolNodeById.get(samples[i]);
        if (!node || node.hitCount === undefined) {
          continue;
        }
        node.hitCount++;
      }
    }

    // A cache for the raw nodes received from the traces / CDP.
    const protocolNodeById = new Map<number, Protocol.Profiler.ProfileNode>();
    for (let i = 0; i < nodes.length; ++i) {
      const node = nodes[i];
      protocolNodeById.set(node.id, node);
    }

    buildHitCountFromSamples(nodes, this.samples);
    buildChildrenFromParents(nodes);
    this.totalHitCount = nodes.reduce((acc, node) => acc + (node.hitCount || 0), 0);
    const sampleTime = (this.profileEndTime - this.profileStartTime) / this.totalHitCount;
    const root = nodes[0];
    // If a node is filtered out, its samples are replaced with its parent,
    // so we keep track of the which id to use in the samples data.
    const idToUseForRemovedNode = new Map<number, number>([[root.id, root.id]]);
    this.#idToParsedNode = new Map();

    const resultRoot = new CPUProfileNode(root, sampleTime);
    this.#idToParsedNode.set(root.id, resultRoot);
    if (!root.children) {
      throw new Error('Missing children for root');
    }
    const parentNodeStack = root.children.map(() => resultRoot);
    const sourceNodeStack = root.children.map(id => protocolNodeById.get(id));
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
      parentNodeStack.push.apply(parentNodeStack, sourceNode.children.map(() => parentNode as CPUProfileNode));
      sourceNodeStack.push.apply(sourceNodeStack, sourceNode.children.map(id => protocolNodeById.get(id)));
      this.#idToParsedNode.set(sourceNode.id, targetNode);
    }
    if (this.samples) {
      this.samples = this.samples.map(id => idToUseForRemovedNode.get(id) as number);
    }
    return resultRoot;
  }

  /**
   * Sorts the samples array using the timestamps array (there is a one
   * to one matching by index between the two).
   */
  private sortSamples(): void {
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
  private normalizeTimestamps(): void {
    if (!this.samples) {
      return;
    }
    let timestamps: number[] = this.timestamps;
    if (!timestamps) {
      // Support loading CPU profiles that are missing timestamps and
      // timedeltas
      const profileStartTime = this.profileStartTime;
      const interval = (this.profileEndTime - profileStartTime) / this.samples.length;
      // Add an extra timestamp used to calculate the last sample duration.
      timestamps = new Array(this.samples.length + 1);
      for (let i = 0; i < timestamps.length; ++i) {
        timestamps[i] = profileStartTime + i * interval;
      }
      this.timestamps = timestamps;
      return;
    }

    // Convert samples from micro to milliseconds
    for (let i = 0; i < timestamps.length; ++i) {
      timestamps[i] /= 1000;
    }
    if (this.samples.length === timestamps.length) {
      // Add an extra timestamp used to calculate the last sample duration.
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
  private extractMetaNodes(): void {
    const topLevelNodes = this.profileHead.children;
    for (let i = 0; i < topLevelNodes.length && !(this.gcNode && this.programNode && this.idleNode); i++) {
      const node = topLevelNodes[i];
      if (node.functionName === '(garbage collector)') {
        this.gcNode = node;
      } else if (node.functionName === '(program)') {
        this.programNode = node;
      } else if (node.functionName === '(idle)') {
        this.idleNode = node;
      }
    }
  }

  private fixMissingSamples(): void {
    // Sometimes the V8 sampler is not able to parse the JS stack and returns
    // a (program) sample instead. The issue leads to call frames being split
    // apart when they shouldn't.
    // Here's a workaround for that. When there's a single (program) sample
    // between two call stacks sharing the same bottom node, it is replaced
    // with the preceeding sample.
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
    let prevNodeId: number = samples[0];
    let nodeId: number = samples[1];
    for (let sampleIndex = 1; sampleIndex < samplesCount - 1; sampleIndex++) {
      const nextNodeId = samples[sampleIndex + 1];
      const prevNode = idToNode.get(prevNodeId);
      const nextNode = idToNode.get(nextNodeId);
      if (prevNodeId === undefined || nextNodeId === undefined || !prevNode || !nextNode) {
        console.error(`Unexpectedly found undefined nodes: ${prevNodeId} ${nextNodeId}`);
        continue;
      }
      if (nodeId === programNodeId && !isSystemNode(prevNodeId) && !isSystemNode(nextNodeId) &&
          bottomNode(prevNode) === bottomNode(nextNode)) {
        samples[sampleIndex] = prevNodeId;
      }
      prevNodeId = nodeId;
      nodeId = nextNodeId;
    }
    function bottomNode(node: ProfileNode): ProfileNode {
      while (node.parent && node.parent.parent) {
        node = node.parent;
      }
      return node;
    }
    function isSystemNode(nodeId: number): boolean {
      return nodeId === programNodeId || nodeId === gcNodeId || nodeId === idleNodeId;
    }
  }

  /**
   * Traverses the call tree derived from the samples calling back when a call is opened
   * and when it's closed
   */
  forEachFrame(
      openFrameCallback: (depth: number, node: ProfileNode, timestamp: number) => void,
      closeFrameCallback: (depth: number, node: ProfileNode, timestamp: number, dur: number, selfTime: number) => void,
      startTime?: number, stopTime?: number): void {
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
    const startIndex =
        Platform.ArrayUtilities.lowerBound(timestamps, startTime, Platform.ArrayUtilities.DEFAULT_COMPARATOR);
    let stackTop = 0;
    const stackNodes: ProfileNode[] = [];
    let prevId: number = this.profileHead.id;
    let sampleTime;
    let gcParentNode: ProfileNode|null = null;

    // Extra slots for gc being put on top,
    // and one at the bottom to allow safe stackTop-1 access.
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
      let prevNode: ProfileNode|null = idToNode.get(prevId) || null;
      if (!prevNode) {
        continue;
      }

      if (gcNode && node === gcNode) {
        // GC samples have no stack, so we just put GC node on top of the last recorded sample.
        gcParentNode = prevNode;
        openFrameCallback(gcParentNode.depth + 1, gcNode, sampleTime);
        stackStartTimes[++stackTop] = sampleTime;
        stackChildrenDuration[stackTop] = 0;
        prevId = id;
        continue;
      }
      if (gcNode && prevNode === gcNode && gcParentNode) {
        // end of GC frame
        const start = stackStartTimes[stackTop];
        const duration = sampleTime - start;
        stackChildrenDuration[stackTop - 1] += duration;
        closeFrameCallback(gcParentNode.depth + 1, gcNode, start, duration, duration - stackChildrenDuration[stackTop]);
        --stackTop;
        prevNode = gcParentNode;
        prevId = prevNode.id;
        gcParentNode = null;
      }

      // If the depth of this node is greater than the depth of the
      // previous one, new calls happened in between and we need to open
      // them, so track all of them in stackNodes.
      while (node && node.depth > prevNode.depth) {
        stackNodes.push(node);
        node = node.parent;
      }

      // If `prevNode` differs from `node`, the current sample was taken
      // after a change in the call stack, meaning that frames in the
      // path of `prevNode` that differ from those in the path of `node`
      // can be closed. So go down to the lowest common ancestor and
      // close current intervals.
      //
      // For example:
      //
      // prevNode  node
      //    |       |
      //    v       v
      // [---D--]
      // [---C--][--E--]
      // [------B------] <- LCA
      // [------A------]
      //
      // Because a sample was taken with A, B and E in the stack, it
      // means C and D finished and we can close them.
      while (prevNode && prevNode !== node) {
        const start = stackStartTimes[stackTop];
        const duration = sampleTime - start;
        stackChildrenDuration[stackTop - 1] += duration;
        closeFrameCallback(prevNode.depth, prevNode, start, duration, duration - stackChildrenDuration[stackTop]);
        --stackTop;
        // Track calls to open after previous calls were closed
        // In the example above, this would add E to the tracking stack.
        if (node && node.depth === prevNode.depth) {
          stackNodes.push(node);
          node = node.parent;
        }
        prevNode = prevNode.parent;
      }

      // Go up the nodes stack and open new intervals.
      while (stackNodes.length) {
        const currentNode = stackNodes.pop();
        if (!currentNode) {
          break;
        }
        node = currentNode;
        openFrameCallback(currentNode.depth, currentNode, sampleTime);
        stackStartTimes[++stackTop] = sampleTime;
        stackChildrenDuration[stackTop] = 0;
      }

      prevId = id;
    }

    // Close remaining intervals.
    sampleTime = timestamps[sampleIndex] || this.profileEndTime;
    if (node && gcParentNode && idToNode.get(prevId) === gcNode) {
      const start = stackStartTimes[stackTop];
      const duration = sampleTime - start;
      stackChildrenDuration[stackTop - 1] += duration;
      closeFrameCallback(gcParentNode.depth + 1, node, start, duration, duration - stackChildrenDuration[stackTop]);
      --stackTop;
      prevId = gcParentNode.id;
    }
    for (let node = idToNode.get(prevId); node && node.parent; node = node.parent) {
      const start = stackStartTimes[stackTop];
      const duration = sampleTime - start;
      stackChildrenDuration[stackTop - 1] += duration;
      closeFrameCallback(node.depth, node, start, duration, duration - stackChildrenDuration[stackTop]);
      --stackTop;
    }
  }
  /**
   * Returns the node that corresponds to a given index of a sample.
   */
  nodeByIndex(index: number): ProfileNode|null {
    return this.samples && this.#idToParsedNode.get(this.samples[index]) || null;
  }
  /**
   * Returns the node that corresponds to a given node id.
   */
  nodeById(nodeId: number): ProfileNode|null {
    return this.#idToParsedNode.get(nodeId) || null;
  }

  nodes(): ProfileNode[]|null {
    if (!this.#idToParsedNode) {
      return null;
    }
    return [...this.#idToParsedNode.values()];
  }
}

// Format used by profiles coming from traces.
export type ExtendedProfileNode = Protocol.Profiler.ProfileNode&{parent?: number};
export type ExtendedProfile =
    Protocol.Profiler.Profile&{nodes: Protocol.Profiler.ProfileNode[] | ExtendedProfileNode[], lines?: number[]};
