// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
SDK.CPUProfileNode = class extends SDK.ProfileNode {
  /**
   * @param {!Protocol.Profiler.ProfileNode} node
   * @param {number} sampleTime
   */
  constructor(node, sampleTime) {
    var callFrame = node.callFrame || /** @type {!Protocol.Runtime.CallFrame} */ ({
                      // Backward compatibility for old SamplingHeapProfileNode format.
                      functionName: node['functionName'],
                      scriptId: node['scriptId'],
                      url: node['url'],
                      lineNumber: node['lineNumber'] - 1,
                      columnNumber: node['columnNumber'] - 1
                    });
    super(callFrame);
    this.id = node.id;
    this.self = node.hitCount * sampleTime;
    this.positionTicks = node.positionTicks;
    // Compatibility: legacy backends could provide "no reason" for optimized functions.
    this.deoptReason = node.deoptReason && node.deoptReason !== 'no reason' ? node.deoptReason : null;
  }
};

/**
 * @unrestricted
 */
SDK.CPUProfileDataModel = class extends SDK.ProfileTreeModel {
  /**
   * @param {!Protocol.Profiler.Profile} profile
   */
  constructor(profile) {
    super();
    var isLegacyFormat = !!profile['head'];
    if (isLegacyFormat) {
      // Legacy format contains raw timestamps and start/stop times are in seconds.
      this.profileStartTime = profile.startTime * 1000;
      this.profileEndTime = profile.endTime * 1000;
      this.timestamps = profile.timestamps;
      this._compatibilityConversionHeadToNodes(profile);
    } else {
      // Current format encodes timestamps as deltas. Start/stop times are in microseconds.
      this.profileStartTime = profile.startTime / 1000;
      this.profileEndTime = profile.endTime / 1000;
      this.timestamps = this._convertTimeDeltas(profile);
    }
    this.samples = profile.samples;
    this.totalHitCount = 0;
    this.profileHead = this._translateProfileTree(profile.nodes);
    this.initialize(this.profileHead);
    this._extractMetaNodes();
    if (this.samples) {
      this._buildIdToNodeMap();
      this._sortSamples();
      this._normalizeTimestamps();
    }
  }

  /**
   * @param {!Protocol.Profiler.Profile} profile
   */
  _compatibilityConversionHeadToNodes(profile) {
    if (!profile.head || profile.nodes)
      return;
    /** @type {!Array<!Protocol.Profiler.ProfileNode>} */
    var nodes = [];
    convertNodesTree(profile.head);
    profile.nodes = nodes;
    delete profile.head;
    /**
     * @param {!Protocol.Profiler.ProfileNode} node
     * @return {number}
     */
    function convertNodesTree(node) {
      nodes.push(node);
      node.children = (/** @type {!Array<!Protocol.Profiler.ProfileNode>} */ (node.children)).map(convertNodesTree);
      return node.id;
    }
  }

  /**
   * @param {!Protocol.Profiler.Profile} profile
   * @return {?Array<number>}
   */
  _convertTimeDeltas(profile) {
    if (!profile.timeDeltas)
      return null;
    var lastTimeUsec = profile.startTime;
    var timestamps = new Array(profile.timeDeltas.length);
    for (var i = 0; i < timestamps.length; ++i) {
      lastTimeUsec += profile.timeDeltas[i];
      timestamps[i] = lastTimeUsec;
    }
    return timestamps;
  }

  /**
   * @param {!Array<!Protocol.Profiler.ProfileNode>} nodes
   * @return {!SDK.CPUProfileNode}
   */
  _translateProfileTree(nodes) {
    /**
     * @param {!Protocol.Profiler.ProfileNode} node
     * @return {boolean}
     */
    function isNativeNode(node) {
      if (node.callFrame)
        return !!node.callFrame.url && node.callFrame.url.startsWith('native ');
      return !!node['url'] && node['url'].startsWith('native ');
    }
    /**
     * @param {!Array<!Protocol.Profiler.ProfileNode>} nodes
     */
    function buildChildrenFromParents(nodes) {
      if (nodes[0].children)
        return;
      nodes[0].children = [];
      for (var i = 1; i < nodes.length; ++i) {
        var node = nodes[i];
        var parentNode = nodeByIdMap.get(node.parent);
        if (parentNode.children)
          parentNode.children.push(node.id);
        else
          parentNode.children = [node.id];
      }
    }
    /** @type {!Map<number, !Protocol.Profiler.ProfileNode>} */
    var nodeByIdMap = new Map();
    for (var i = 0; i < nodes.length; ++i) {
      var node = nodes[i];
      nodeByIdMap.set(node.id, node);
    }
    buildChildrenFromParents(nodes);
    this.totalHitCount = nodes.reduce((acc, node) => acc + node.hitCount, 0);
    var sampleTime = (this.profileEndTime - this.profileStartTime) / this.totalHitCount;
    var keepNatives = !!Common.moduleSetting('showNativeFunctionsInJSProfile').get();
    var root = nodes[0];
    /** @type {!Map<number, number>} */
    var idMap = new Map([[root.id, root.id]]);
    var resultRoot = new SDK.CPUProfileNode(root, sampleTime);
    var parentNodeStack = root.children.map(() => resultRoot);
    var sourceNodeStack = root.children.map(id => nodeByIdMap.get(id));
    while (sourceNodeStack.length) {
      var parentNode = parentNodeStack.pop();
      var sourceNode = sourceNodeStack.pop();
      if (!sourceNode.children)
        sourceNode.children = [];
      var targetNode = new SDK.CPUProfileNode(sourceNode, sampleTime);
      if (keepNatives || !isNativeNode(sourceNode)) {
        parentNode.children.push(targetNode);
        parentNode = targetNode;
      } else {
        parentNode.self += targetNode.self;
      }
      idMap.set(sourceNode.id, parentNode.id);
      parentNodeStack.push.apply(parentNodeStack, sourceNode.children.map(() => parentNode));
      sourceNodeStack.push.apply(sourceNodeStack, sourceNode.children.map(id => nodeByIdMap.get(id)));
    }
    if (this.samples)
      this.samples = this.samples.map(id => idMap.get(id));
    return resultRoot;
  }

  _sortSamples() {
    var timestamps = this.timestamps;
    if (!timestamps)
      return;
    var samples = this.samples;
    var indices = timestamps.map((x, index) => index);
    indices.sort((a, b) => timestamps[a] - timestamps[b]);
    for (var i = 0; i < timestamps.length; ++i) {
      var index = indices[i];
      if (index === i)
        continue;
      // Move items in a cycle.
      var savedTimestamp = timestamps[i];
      var savedSample = samples[i];
      var currentIndex = i;
      while (index !== i) {
        samples[currentIndex] = samples[index];
        timestamps[currentIndex] = timestamps[index];
        currentIndex = index;
        index = indices[index];
        indices[currentIndex] = currentIndex;
      }
      samples[currentIndex] = savedSample;
      timestamps[currentIndex] = savedTimestamp;
    }
  }

  _normalizeTimestamps() {
    var timestamps = this.timestamps;
    if (!timestamps) {
      // Support loading old CPU profiles that are missing timestamps.
      // Derive timestamps from profile start and stop times.
      var profileStartTime = this.profileStartTime;
      var interval = (this.profileEndTime - profileStartTime) / this.samples.length;
      timestamps = new Float64Array(this.samples.length + 1);
      for (var i = 0; i < timestamps.length; ++i)
        timestamps[i] = profileStartTime + i * interval;
      this.timestamps = timestamps;
      return;
    }

    // Convert samples from usec to msec
    for (var i = 0; i < timestamps.length; ++i)
      timestamps[i] /= 1000;
    var averageSample = (timestamps.peekLast() - timestamps[0]) / (timestamps.length - 1);
    // Add an extra timestamp used to calculate the last sample duration.
    this.timestamps.push(timestamps.peekLast() + averageSample);
    this.profileStartTime = timestamps[0];
    this.profileEndTime = timestamps.peekLast();
  }

  _buildIdToNodeMap() {
    /** @type {!Map<number, !SDK.CPUProfileNode>} */
    this._idToNode = new Map();
    var idToNode = this._idToNode;
    var stack = [this.profileHead];
    while (stack.length) {
      var node = stack.pop();
      idToNode.set(node.id, node);
      stack.push.apply(stack, node.children);
    }
  }

  _extractMetaNodes() {
    var topLevelNodes = this.profileHead.children;
    for (var i = 0; i < topLevelNodes.length && !(this.gcNode && this.programNode && this.idleNode); i++) {
      var node = topLevelNodes[i];
      if (node.functionName === '(garbage collector)')
        this.gcNode = node;
      else if (node.functionName === '(program)')
        this.programNode = node;
      else if (node.functionName === '(idle)')
        this.idleNode = node;
    }
  }

  /**
   * @param {function(number, !SDK.CPUProfileNode, number)} openFrameCallback
   * @param {function(number, !SDK.CPUProfileNode, number, number, number)} closeFrameCallback
   * @param {number=} startTime
   * @param {number=} stopTime
   */
  forEachFrame(openFrameCallback, closeFrameCallback, startTime, stopTime) {
    if (!this.profileHead || !this.samples)
      return;

    startTime = startTime || 0;
    stopTime = stopTime || Infinity;
    var samples = this.samples;
    var timestamps = this.timestamps;
    var idToNode = this._idToNode;
    var gcNode = this.gcNode;
    var samplesCount = samples.length;
    var startIndex = timestamps.lowerBound(startTime);
    var stackTop = 0;
    var stackNodes = [];
    var prevId = this.profileHead.id;
    var sampleTime = timestamps[samplesCount];
    var gcParentNode = null;

    if (!this._stackStartTimes)
      this._stackStartTimes = new Float64Array(this.maxDepth + 2);
    var stackStartTimes = this._stackStartTimes;
    if (!this._stackChildrenDuration)
      this._stackChildrenDuration = new Float64Array(this.maxDepth + 2);
    var stackChildrenDuration = this._stackChildrenDuration;

    for (var sampleIndex = startIndex; sampleIndex < samplesCount; sampleIndex++) {
      sampleTime = timestamps[sampleIndex];
      if (sampleTime >= stopTime)
        break;
      var id = samples[sampleIndex];
      if (id === prevId)
        continue;
      var node = idToNode.get(id);
      var prevNode = idToNode.get(prevId);

      if (node === gcNode) {
        // GC samples have no stack, so we just put GC node on top of the last recorded sample.
        gcParentNode = prevNode;
        openFrameCallback(gcParentNode.depth + 1, gcNode, sampleTime);
        stackStartTimes[++stackTop] = sampleTime;
        stackChildrenDuration[stackTop] = 0;
        prevId = id;
        continue;
      }
      if (prevNode === gcNode) {
        // end of GC frame
        var start = stackStartTimes[stackTop];
        var duration = sampleTime - start;
        stackChildrenDuration[stackTop - 1] += duration;
        closeFrameCallback(gcParentNode.depth + 1, gcNode, start, duration, duration - stackChildrenDuration[stackTop]);
        --stackTop;
        prevNode = gcParentNode;
        prevId = prevNode.id;
        gcParentNode = null;
      }

      while (node.depth > prevNode.depth) {
        stackNodes.push(node);
        node = node.parent;
      }

      // Go down to the LCA and close current intervals.
      while (prevNode !== node) {
        var start = stackStartTimes[stackTop];
        var duration = sampleTime - start;
        stackChildrenDuration[stackTop - 1] += duration;
        closeFrameCallback(
            prevNode.depth, /** @type {!SDK.CPUProfileNode} */ (prevNode), start, duration,
            duration - stackChildrenDuration[stackTop]);
        --stackTop;
        if (node.depth === prevNode.depth) {
          stackNodes.push(node);
          node = node.parent;
        }
        prevNode = prevNode.parent;
      }

      // Go up the nodes stack and open new intervals.
      while (stackNodes.length) {
        node = stackNodes.pop();
        openFrameCallback(node.depth, node, sampleTime);
        stackStartTimes[++stackTop] = sampleTime;
        stackChildrenDuration[stackTop] = 0;
      }

      prevId = id;
    }

    if (idToNode.get(prevId) === gcNode) {
      var start = stackStartTimes[stackTop];
      var duration = sampleTime - start;
      stackChildrenDuration[stackTop - 1] += duration;
      closeFrameCallback(gcParentNode.depth + 1, node, start, duration, duration - stackChildrenDuration[stackTop]);
      --stackTop;
    }

    for (var node = idToNode.get(prevId); node.parent; node = node.parent) {
      var start = stackStartTimes[stackTop];
      var duration = sampleTime - start;
      stackChildrenDuration[stackTop - 1] += duration;
      closeFrameCallback(
          node.depth, /** @type {!SDK.CPUProfileNode} */ (node), start, duration,
          duration - stackChildrenDuration[stackTop]);
      --stackTop;
    }
  }

  /**
   * @param {number} index
   * @return {?SDK.CPUProfileNode}
   */
  nodeByIndex(index) {
    return this._idToNode.get(this.samples[index]) || null;
  }
};
