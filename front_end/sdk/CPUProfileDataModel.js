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
    if (!WebInspector.moduleSetting("showNativeFunctionsInJSProfile").get())
        this._filterNativeFrames(profile.head);
    this.profileHead = this._translateProfileTree(profile.head);
    WebInspector.ProfileTreeModel.call(this, this.profileHead);
    this._extractMetaNodes();
    if (this.samples) {
        this._buildIdToNodeMap();
        this._sortSamples();
        this._normalizeTimestamps();
        this._fixMissingSamples();
    }
}

WebInspector.CPUProfileDataModel.prototype = {
    /**
     * @param {!ProfilerAgent.CPUProfileNode} root
     */
    _filterNativeFrames: function(root)
    {
        // TODO: get rid of this function and do the filtering while _translateProfileTree
        if (this.samples) {
            /** @type {!Map<number, !ProfilerAgent.CPUProfileNode>} */
            var idToNode = new Map();
            var stack = [root];
            while (stack.length) {
                var node = stack.pop();
                idToNode.set(node.id, node);
                for (var i = 0; i < node.children.length; i++) {
                    node.children[i].parent = node;
                    stack.push(node.children[i]);
                }
            }
            for (var i = 0; i < this.samples.length; ++i) {
                var node = idToNode.get(this.samples[i]);
                while (isNativeNode(node))
                    node = node.parent;
                this.samples[i] = node.id;
            }
        }
        processSubtree(root);

        /**
         * @param {!ProfilerAgent.CPUProfileNode} node
         * @return {boolean}
         */
        function isNativeNode(node)
        {
            return !!node.url && node.url.startsWith("native ");
        }

        /**
         * @param {!ProfilerAgent.CPUProfileNode} node
         */
        function processSubtree(node)
        {
            var nativeChildren = [];
            var children = node.children;
            for (var i = 0, j = 0; i < children.length; ++i) {
                var child = children[i];
                if (isNativeNode(child)) {
                    nativeChildren.push(child);
                } else {
                    children[j++] = child;
                    processSubtree(child);
                }
            }
            children.length = j;
            nativeChildren.forEach(mergeChildren.bind(null, node));
        }

        /**
         * @param {!ProfilerAgent.CPUProfileNode} node
         * @param {!ProfilerAgent.CPUProfileNode} nativeNode
         */
        function mergeChildren(node, nativeNode)
        {
            node.hitCount += nativeNode.hitCount;
            for (var i = 0; i < nativeNode.children.length; ++i) {
                var child = nativeNode.children[i];
                if (isNativeNode(child)) {
                    mergeChildren(node, child);
                } else {
                    node.children.push(child);
                    child.parent = node;
                    processSubtree(child);
                }
            }
        }
    },

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
        this.totalHitCount = computeHitCountForSubtree(root);
        var sampleTime = (this.profileEndTime - this.profileStartTime) / this.totalHitCount;
        var resultRoot = new WebInspector.CPUProfileNode(root, sampleTime);
        var targetNodeStack = [resultRoot];
        var sourceNodeStack = [root];
        while (sourceNodeStack.length) {
            var sourceNode = sourceNodeStack.pop();
            var parentNode = targetNodeStack.pop();
            parentNode.children = sourceNode.children.map(child => new WebInspector.CPUProfileNode(child, sampleTime));
            sourceNodeStack.push.apply(sourceNodeStack, sourceNode.children);
            targetNodeStack.push.apply(targetNodeStack, parentNode.children);
        }
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
        /** @type {!Object<number, !WebInspector.CPUProfileNode>} */
        this._idToNode = {};
        var idToNode = this._idToNode;
        var stack = [this.profileHead];
        while (stack.length) {
            var node = stack.pop();
            idToNode[node.id] = node;
            for (var i = 0; i < node.children.length; i++)
                stack.push(node.children[i]);
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

    _fixMissingSamples: function()
    {
        // Sometimes sampler is not able to parse the JS stack and returns
        // a (program) sample instead. The issue leads to call frames belong
        // to the same function invocation being split apart.
        // Here's a workaround for that. When there's a single (program) sample
        // between two call stacks sharing the same bottom node, it is replaced
        // with the preceeding sample.
        var samples = this.samples;
        var samplesCount = samples.length;
        if (!this.programNode || samplesCount < 3)
            return;
        var idToNode = this._idToNode;
        var programNodeId = this.programNode.id;
        var gcNodeId = this.gcNode ? this.gcNode.id : -1;
        var idleNodeId = this.idleNode ? this.idleNode.id : -1;
        var prevNodeId = samples[0];
        var nodeId = samples[1];
        for (var sampleIndex = 1; sampleIndex < samplesCount - 1; sampleIndex++) {
            var nextNodeId = samples[sampleIndex + 1];
            if (nodeId === programNodeId && !isSystemNode(prevNodeId) && !isSystemNode(nextNodeId)
                && bottomNode(idToNode[prevNodeId]) === bottomNode(idToNode[nextNodeId])) {
                samples[sampleIndex] = prevNodeId;
            }
            prevNodeId = nodeId;
            nodeId = nextNodeId;
        }

        /**
         * @param {!WebInspector.ProfileNode} node
         * @return {!WebInspector.ProfileNode}
         */
        function bottomNode(node)
        {
            while (node.parent && node.parent.parent)
                node = node.parent;
            return node;
        }

        /**
         * @param {number} nodeId
         * @return {boolean}
         */
        function isSystemNode(nodeId)
        {
            return nodeId === programNodeId || nodeId === gcNodeId || nodeId === idleNodeId;
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
            var node = idToNode[id];
            var prevNode = idToNode[prevId];

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

        if (idToNode[prevId] === gcNode) {
            var start = stackStartTimes[stackTop];
            var duration = sampleTime - start;
            stackChildrenDuration[stackTop - 1] += duration;
            closeFrameCallback(gcParentNode.depth + 1, node, start, duration, duration - stackChildrenDuration[stackTop]);
            --stackTop;
        }

        for (var node = idToNode[prevId]; node.parent; node = node.parent) {
            var start = stackStartTimes[stackTop];
            var duration = sampleTime - start;
            stackChildrenDuration[stackTop - 1] += duration;
            closeFrameCallback(node.depth, /** @type {!WebInspector.CPUProfileNode} */(node), start, duration, duration - stackChildrenDuration[stackTop]);
            --stackTop;
        }
    },

    /**
     * @param {number} index
     * @return {!WebInspector.CPUProfileNode}
     */
    nodeByIndex: function(index)
    {
        return this._idToNode[this.samples[index]];
    },

    __proto__: WebInspector.ProfileTreeModel.prototype
}
