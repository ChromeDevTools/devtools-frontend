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
        WebInspector.ProfileView.ViewTypes.Heavy,
        WebInspector.ProfileView.ViewTypes.Tree
    ];
    WebInspector.ProfileView.call(this, new WebInspector.HeapProfileView.NodeFormatter(this), views);
}

WebInspector.HeapProfileView.prototype = {
    __proto__: WebInspector.ProfileView.prototype
}

/**
 * @constructor
 * @extends {WebInspector.ProfileType}
 */
WebInspector.SamplingHeapProfileType = function()
{
    WebInspector.ProfileType.call(this, WebInspector.SamplingHeapProfileType.TypeId, WebInspector.UIString("Collect JavaScript Heap Profile"));
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
        return WebInspector.UIString("HEAP PROFILES");
    },

    get description()
    {
        return WebInspector.UIString("Heap profiles show where the most memory allocations took place in JavaScript functions.");
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
    WebInspector.ProfileNode.call(this, node.functionName, node.scriptId, node.url, node.lineNumber, node.columnNumber);
    this.self = node.selfSize;
    this.callUID = `${this.frame.functionName}@${this.frame.scriptId}:${this.frame.lineNumber}`;
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
     * @return {!Element}
     */
    linkifyNode: function(node)
    {
        var callFrame = node.profileNode.frame;
        return this._profileView.linkifier().linkifyConsoleCallFrame(this._profileView.target(), callFrame, "profile-node-file");
    }
}
