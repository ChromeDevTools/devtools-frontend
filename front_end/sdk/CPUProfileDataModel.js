// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.ProfileNode}
 * @param {!ProfilerAgent.CPUProfileNode} sourceNode
 * @param {number} sampleTime
 */
WebInspector.CPUProfileNode = function(sourceNode, sampleTime)
{
    WebInspector.ProfileNode.call(this, sourceNode.functionName, sourceNode.scriptId, sourceNode.url, sourceNode.lineNumber, sourceNode.columnNumber);
    this.id = sourceNode.id;
    this.self = sourceNode.hitCount * sampleTime;
    this.callUID = sourceNode.callUID;
    this.positionTicks = sourceNode.positionTicks;
    this.deoptReason = sourceNode.deoptReason;
}

WebInspector.CPUProfileNode.prototype = {
    __proto__: WebInspector.ProfileNode.prototype
}

/**
 * @constructor
 * @extends {WebInspector.ProfileTreeModel}
 * @param {!ProfilerAgent.CPUProfile} profile
 */
WebInspector.CPUProfileDataModel = function(profile)
{
    this.samples = profile.samples;
    this.timestamps = profile.timestamps;
    // Convert times from sec to msec.
    this.profileStartTime = profile.startTime * 1000;
    this.profileEndTime = profile.endTime * 1000;
    this.totalHitCount = 0;
    this.profileHead = this._translateProfileTree(profile.head);
    WebInspector.ProfileTreeModel.call(this, this.profileHead);
    this._extractMetaNodes();
    if (this.samples) {
        this._buildIdToNodeMap();
        this._sortSamples();
        this._normalizeTimestamps();
    }
}

WebInspector.CPUProfileDataModel.prototype = {
    /**
     * @param {!ProfilerAgent.CPUProfileNode} root
     * @return {!WebInspector.CPUProfileNode}
     */
    _translateProfileTree: function(root)
    {
        /**
         * @param  {!ProfilerAgent.CPUProfileNode} node
         * @return {number}
         */
        function computeHitCountForSubtree(node)
        {
            return node.children.reduce((acc, node) => acc + computeHitCountForSubtree(node), node.hitCount);
        }
        /**
         * @param {!ProfilerAgent.CPUProfileNode} node
         * @return {boolean}
         */
        function isNativeNode(node)
        {
            return !!node.url && node.url.startsWith("native ");
        }
        this.totalHitCount = computeHitCountForSubtree(root);
        var sampleTime = (this.profileEndTime - this.profileStartTime) / this.totalHitCount;
        var keepNatives = !!WebInspector.moduleSetting("showNativeFunctionsInJSProfile").get();
        /** @type {!Map<number, number>} */
        var idMap = new Map([[root.id, root.id]]);
        var resultRoot = new WebInspector.CPUProfileNode(root, sampleTime);
        var parentNodeStack = root.children.map(() => resultRoot);
        var sourceNodeStack = root.children;
        while (sourceNodeStack.length) {
            var parentNode = parentNodeStack.pop();
            var sourceNode = sourceNodeStack.pop();
            var targetNode = new WebInspector.CPUProfileNode(sourceNode, sampleTime);
            if (keepNatives || !isNativeNode(sourceNode)) {
                parentNode.children.push(targetNode);
                parentNode = targetNode;
            } else {
                parentNode.self += targetNode.self;
            }
            idMap.set(sourceNode.id, parentNode.id);
            parentNodeStack.push.apply(parentNodeStack, sourceNode.children.map(() => parentNode));
            sourceNodeStack.push.apply(sourceNodeStack, sourceNode.children);
        }
        if (this.samples)
            this.samples = this.samples.map(id => idMap.get(id));
        return resultRoot;
    },

    _sortSamples: function()
    {
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
    },

    _normalizeTimestamps: function()
    {
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
    },

    _buildIdToNodeMap: function()
    {
        /** @type {!Map<number, !WebInspector.CPUProfileNode>} */
        this._idToNode = new Map();
        var idToNode = this._idToNode;
        var stack = [this.profileHead];
        while (stack.length) {
            var node = stack.pop();
            idToNode.set(node.id, node);
            stack.push.apply(stack, node.children);
        }
    },

    _extractMetaNodes: function()
    {
        var topLevelNodes = this.profileHead.children;
        for (var i = 0; i < topLevelNodes.length && !(this.gcNode && this.programNode && this.idleNode); i++) {
            var node = topLevelNodes[i];
            if (node.functionName === "(garbage collector)")
                this.gcNode = node;
            else if (node.functionName === "(program)")
                this.programNode = node;
            else if (node.functionName === "(idle)")
                this.idleNode = node;
        }
    },

    /**
     * @param {function(number, !WebInspector.CPUProfileNode, number)} openFrameCallback
     * @param {function(number, !WebInspector.CPUProfileNode, number, number, number)} closeFrameCallback
     * @param {number=} startTime
     * @param {number=} stopTime
     */
    forEachFrame: function(openFrameCallback, closeFrameCallback, startTime, stopTime)
    {
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
                closeFrameCallback(prevNode.depth, /** @type {!WebInspector.CPUProfileNode} */(prevNode), start, duration, duration - stackChildrenDuration[stackTop]);
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
            closeFrameCallback(node.depth, /** @type {!WebInspector.CPUProfileNode} */(node), start, duration, duration - stackChildrenDuration[stackTop]);
            --stackTop;
        }
    },

    /**
     * @param {number} index
     * @return {?WebInspector.CPUProfileNode}
     */
    nodeByIndex: function(index)
    {
        return this._idToNode.get(this.samples[index]) || null;
    },

    __proto__: WebInspector.ProfileTreeModel.prototype
}
