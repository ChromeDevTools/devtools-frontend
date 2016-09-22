// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @implements {WebInspector.Searchable}
 * @extends {WebInspector.ProfileView}
 * @param {!WebInspector.SamplingHeapProfileHeader} profileHeader
 */
WebInspector.HeapProfileView = function(profileHeader)
{
    this._profileHeader = profileHeader;
    this.profile = new WebInspector.SamplingHeapProfileModel(profileHeader._profile || profileHeader.protocolProfile());
    this.adjustedTotal = this.profile.total;
    var views = [
        WebInspector.ProfileView.ViewTypes.Flame,
        WebInspector.ProfileView.ViewTypes.Heavy,
        WebInspector.ProfileView.ViewTypes.Tree
    ];
    WebInspector.ProfileView.call(this, new WebInspector.HeapProfileView.NodeFormatter(this), views);
}

WebInspector.HeapProfileView.prototype = {
    /**
     * @override
     * @param {string} columnId
     * @return {string}
     */
    columnHeader: function(columnId)
    {
        switch (columnId) {
        case "self": return WebInspector.UIString("Self Size (bytes)");
        case "total": return WebInspector.UIString("Total Size (bytes)");
        }
        return "";
    },

    /**
     * @override
     * @return {!WebInspector.FlameChartDataProvider}
     */
    createFlameChartDataProvider: function()
    {
        return new WebInspector.HeapFlameChartDataProvider(this.profile, this._profileHeader.target());
    },

    __proto__: WebInspector.ProfileView.prototype
}

/**
 * @constructor
 * @extends {WebInspector.ProfileType}
 */
WebInspector.SamplingHeapProfileType = function()
{
    WebInspector.ProfileType.call(this, WebInspector.SamplingHeapProfileType.TypeId, WebInspector.UIString("Record Allocation Profile"));
    this._recording = false;
    WebInspector.SamplingHeapProfileType.instance = this;
}

WebInspector.SamplingHeapProfileType.TypeId = "SamplingHeap";

WebInspector.SamplingHeapProfileType.prototype = {
    /**
     * @override
     * @return {string}
     */
    typeName: function()
    {
        return "Heap";
    },

    /**
     * @override
     * @return {string}
     */
    fileExtension: function()
    {
        return ".heapprofile";
    },

    get buttonTooltip()
    {
        return this._recording ? WebInspector.UIString("Stop heap profiling") : WebInspector.UIString("Start heap profiling");
    },

    /**
     * @override
     * @return {boolean}
     */
    buttonClicked: function()
    {
        var wasRecording = this._recording;
        if (wasRecording)
            this.stopRecordingProfile();
        else
            this.startRecordingProfile();
        return !wasRecording;
    },

    get treeItemTitle()
    {
        return WebInspector.UIString("ALLOCATION PROFILES");
    },

    get description()
    {
        return WebInspector.UIString("Allocation profiles show memory allocations from your JavaScript functions.");
    },

    startRecordingProfile: function()
    {
        var target = WebInspector.context.flavor(WebInspector.Target);
        if (this._profileBeingRecorded || !target)
            return;
        var profile = new WebInspector.SamplingHeapProfileHeader(target, this);
        this.setProfileBeingRecorded(profile);
        WebInspector.targetManager.suspendAllTargets();
        this.addProfile(profile);
        profile.updateStatus(WebInspector.UIString("Recording\u2026"));
        this._recording = true;
        target.heapProfilerModel.startSampling();
    },

    stopRecordingProfile: function()
    {
        this._recording = false;
        if (!this._profileBeingRecorded || !this._profileBeingRecorded.target())
            return;

        var recordedProfile;

        /**
         * @param {?HeapProfilerAgent.SamplingHeapProfile} profile
         * @this {WebInspector.SamplingHeapProfileType}
         */
        function didStopProfiling(profile)
        {
            if (!this._profileBeingRecorded)
                return;
            console.assert(profile);
            this._profileBeingRecorded.setProtocolProfile(profile);
            this._profileBeingRecorded.updateStatus("");
            recordedProfile = this._profileBeingRecorded;
            this.setProfileBeingRecorded(null);
        }

        /**
         * @this {WebInspector.SamplingHeapProfileType}
         */
        function fireEvent()
        {
            this.dispatchEventToListeners(WebInspector.ProfileType.Events.ProfileComplete, recordedProfile);
        }

        this._profileBeingRecorded.target().heapProfilerModel.stopSampling()
            .then(didStopProfiling.bind(this))
            .then(WebInspector.targetManager.resumeAllTargets.bind(WebInspector.targetManager))
            .then(fireEvent.bind(this));
    },

    /**
     * @override
     * @param {string} title
     * @return {!WebInspector.ProfileHeader}
     */
    createProfileLoadedFromFile: function(title)
    {
        return new WebInspector.SamplingHeapProfileHeader(null, this, title);
    },

    /**
     * @override
     */
    profileBeingRecordedRemoved: function()
    {
        this.stopRecordingProfile();
    },

    __proto__: WebInspector.ProfileType.prototype
}

/**
 * @constructor
 * @extends {WebInspector.WritableProfileHeader}
 * @param {?WebInspector.Target} target
 * @param {!WebInspector.SamplingHeapProfileType} type
 * @param {string=} title
 */
WebInspector.SamplingHeapProfileHeader = function(target, type, title)
{
    WebInspector.WritableProfileHeader.call(this, target, type, title || WebInspector.UIString("Profile %d", type.nextProfileUid()));
}

WebInspector.SamplingHeapProfileHeader.prototype = {
    /**
     * @override
     * @return {!WebInspector.ProfileView}
     */
    createView: function()
    {
        return new WebInspector.HeapProfileView(this);
    },

    /**
     * @return {!HeapProfilerAgent.SamplingHeapProfile}
     */
    protocolProfile: function()
    {
        return this._protocolProfile;
    },

    __proto__: WebInspector.WritableProfileHeader.prototype
}

/**
 * @constructor
 * @extends {WebInspector.ProfileNode}
 * @param {!HeapProfilerAgent.SamplingHeapProfileNode} node
 */
WebInspector.SamplingHeapProfileNode = function(node)
{
    var callFrame = node.callFrame || /** @type {!RuntimeAgent.CallFrame} */ ({
        // Backward compatibility for old CpuProfileNode format.
        functionName: node["functionName"],
        scriptId: node["scriptId"],
        url: node["url"],
        lineNumber: node["lineNumber"] - 1,
        columnNumber: node["columnNumber"] - 1
    });
    WebInspector.ProfileNode.call(this, callFrame);
    this.self = node.selfSize;
}

WebInspector.SamplingHeapProfileNode.prototype = {
    __proto__: WebInspector.ProfileNode.prototype
}

/**
 * @constructor
 * @extends {WebInspector.ProfileTreeModel}
 * @param {!HeapProfilerAgent.SamplingHeapProfile} profile
 */
WebInspector.SamplingHeapProfileModel = function(profile)
{
    WebInspector.ProfileTreeModel.call(this, this._translateProfileTree(profile.head));
}

WebInspector.SamplingHeapProfileModel.prototype = {
    /**
     * @param {!HeapProfilerAgent.SamplingHeapProfileNode} root
     * @return {!WebInspector.SamplingHeapProfileNode}
     */
    _translateProfileTree: function(root)
    {
        var resultRoot = new WebInspector.SamplingHeapProfileNode(root);
        var targetNodeStack = [resultRoot];
        var sourceNodeStack = [root];
        while (sourceNodeStack.length) {
            var sourceNode = sourceNodeStack.pop();
            var parentNode = targetNodeStack.pop();
            parentNode.children = sourceNode.children.map(child => new WebInspector.SamplingHeapProfileNode(child));
            sourceNodeStack.push.apply(sourceNodeStack, sourceNode.children);
            targetNodeStack.push.apply(targetNodeStack, parentNode.children);
        }
        return resultRoot;
    },

    __proto__: WebInspector.ProfileTreeModel.prototype
}

/**
 * @constructor
 * @implements {WebInspector.ProfileDataGridNode.Formatter}
 * @param {!WebInspector.ProfileView} profileView
 */
WebInspector.HeapProfileView.NodeFormatter = function(profileView)
{
    this._profileView = profileView;
}

WebInspector.HeapProfileView.NodeFormatter.prototype = {
    /**
     * @override
     * @param {number} value
     * @return {string}
     */
    formatValue: function(value)
    {
        return Number.withThousandsSeparator(value);
    },

    /**
     * @override
     * @param {number} value
     * @param {!WebInspector.ProfileDataGridNode} node
     * @return {string}
     */
    formatPercent: function(value, node)
    {
        return WebInspector.UIString("%.2f\u2009%%", value);
    },

    /**
     * @override
     * @param  {!WebInspector.ProfileDataGridNode} node
     * @return {?Element}
     */
    linkifyNode: function(node)
    {
        return this._profileView.linkifier().maybeLinkifyConsoleCallFrame(this._profileView.target(), node.profileNode.callFrame, "profile-node-file");
    }
}

/**
 * @constructor
 * @extends {WebInspector.ProfileFlameChartDataProvider}
 * @param {!WebInspector.ProfileTreeModel} profile
 * @param {?WebInspector.Target} target
 */
WebInspector.HeapFlameChartDataProvider = function(profile, target)
{
    WebInspector.ProfileFlameChartDataProvider.call(this, target);
    this._profile = profile;
}

WebInspector.HeapFlameChartDataProvider.prototype = {
    /**
     * @override
     * @return {number}
     */
    minimumBoundary: function()
    {
        return 0;
    },

    /**
     * @override
     * @return {number}
     */
    totalTime: function()
    {
        return this._profile.root.total;
    },

    /**
     * @override
     * @param {number} value
     * @param {number=} precision
     * @return {string}
     */
    formatValue: function(value, precision)
    {
        return WebInspector.UIString("%s\u2009KB", Number.withThousandsSeparator(value / 1e3));
    },

    /**
     * @override
     * @return {!WebInspector.FlameChart.TimelineData}
     */
    _calculateTimelineData: function()
    {
        /**
         * @param  {!WebInspector.ProfileNode} node
         * @return {number}
         */
        function nodesCount(node)
        {
            return node.children.reduce((count, node) => count + nodesCount(node), 1);
        }
        var count = nodesCount(this._profile.root);
        /** @type {!Array<!WebInspector.ProfileNode>} */
        var entryNodes = new Array(count);
        var entryLevels = new Uint16Array(count);
        var entryTotalTimes = new Float32Array(count);
        var entryStartTimes = new Float64Array(count);
        var depth = 0;
        var maxDepth = 0;
        var position = 0;
        var index = 0;

        /**
         * @param {!WebInspector.ProfileNode} node
         */
        function addNode(node)
        {
            var start = position;
            entryNodes[index] = node;
            entryLevels[index] = depth;
            entryTotalTimes[index] = node.total;
            entryStartTimes[index] = position;
            ++index;
            ++depth;
            node.children.forEach(addNode);
            --depth;
            maxDepth = Math.max(maxDepth, depth);
            position = start + node.total;
        }
        addNode(this._profile.root);

        this._maxStackDepth = maxDepth + 1;
        this._entryNodes = entryNodes;
        this._timelineData = new WebInspector.FlameChart.TimelineData(entryLevels, entryTotalTimes, entryStartTimes, null);

        return this._timelineData;
    },

    /**
     * @override
     * @param {number} entryIndex
     * @return {?Element}
     */
    prepareHighlightedEntryInfo: function(entryIndex)
    {
        var node = this._entryNodes[entryIndex];
        if (!node)
            return null;
        var entryInfo = [];
        /**
         * @param {string} title
         * @param {string} value
         */
        function pushEntryInfoRow(title, value)
        {
            entryInfo.push({ title: title, value: value });
        }
        pushEntryInfoRow(WebInspector.UIString("Name"), WebInspector.beautifyFunctionName(node.functionName));
        pushEntryInfoRow(WebInspector.UIString("Self size"), Number.bytesToString(node.self));
        pushEntryInfoRow(WebInspector.UIString("Total size"), Number.bytesToString(node.total));
        var linkifier = new WebInspector.Linkifier();
        var link = linkifier.maybeLinkifyConsoleCallFrame(this._target, node.callFrame);
        if (link)
            pushEntryInfoRow(WebInspector.UIString("URL"), link.textContent);
        linkifier.dispose();
        return WebInspector.ProfileView.buildPopoverTable(entryInfo);
    },

    __proto__: WebInspector.ProfileFlameChartDataProvider.prototype
}
