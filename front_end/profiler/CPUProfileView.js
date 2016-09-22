/*
 * Copyright (C) 2008 Apple Inc. All Rights Reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @implements {WebInspector.Searchable}
 * @extends {WebInspector.ProfileView}
 * @param {!WebInspector.CPUProfileHeader} profileHeader
 */
WebInspector.CPUProfileView = function(profileHeader)
{
    this._profileHeader = profileHeader;
    this.profile = new WebInspector.CPUProfileDataModel(profileHeader._profile || profileHeader.protocolProfile());
    this.adjustedTotal = this.profile.profileHead.total;
    this.adjustedTotal -= this.profile.idleNode ? this.profile.idleNode.total : 0;
    WebInspector.ProfileView.call(this, new WebInspector.CPUProfileView.NodeFormatter(this));
}

WebInspector.CPUProfileView.prototype = {
    /**
     * @override
     */
    wasShown: function()
    {
        WebInspector.ProfileView.prototype.wasShown.call(this);
        var lineLevelProfile = WebInspector.LineLevelProfile.instance();
        lineLevelProfile.reset();
        lineLevelProfile.appendCPUProfile(this.profile);
    },

    /**
     * @override
     * @param {string} columnId
     * @return {string}
     */
    columnHeader: function(columnId)
    {
        switch (columnId) {
        case "self": return WebInspector.UIString("Self Time");
        case "total": return WebInspector.UIString("Total Time");
        }
        return "";
    },

    /**
     * @override
     * @return {!WebInspector.FlameChartDataProvider}
     */
    createFlameChartDataProvider: function()
    {
        return new WebInspector.CPUFlameChartDataProvider(this.profile, this._profileHeader.target());
    },

    __proto__: WebInspector.ProfileView.prototype
}

/**
 * @constructor
 * @extends {WebInspector.ProfileType}
 */
WebInspector.CPUProfileType = function()
{
    WebInspector.ProfileType.call(this, WebInspector.CPUProfileType.TypeId, WebInspector.UIString("Record JavaScript CPU Profile"));
    this._recording = false;

    this._nextAnonymousConsoleProfileNumber = 1;
    this._anonymousConsoleProfileIdToTitle = {};

    WebInspector.CPUProfileType.instance = this;
    WebInspector.targetManager.addModelListener(WebInspector.CPUProfilerModel, WebInspector.CPUProfilerModel.Events.ConsoleProfileStarted, this._consoleProfileStarted, this);
    WebInspector.targetManager.addModelListener(WebInspector.CPUProfilerModel, WebInspector.CPUProfilerModel.Events.ConsoleProfileFinished, this._consoleProfileFinished, this);
}

WebInspector.CPUProfileType.TypeId = "CPU";

WebInspector.CPUProfileType.prototype = {
    /**
     * @override
     * @return {string}
     */
    typeName: function()
    {
        return "CPU";
    },

    /**
     * @override
     * @return {string}
     */
    fileExtension: function()
    {
        return ".cpuprofile";
    },

    get buttonTooltip()
    {
        return this._recording ? WebInspector.UIString("Stop CPU profiling") : WebInspector.UIString("Start CPU profiling");
    },

    /**
     * @override
     * @return {boolean}
     */
    buttonClicked: function()
    {
        if (this._recording) {
            this.stopRecordingProfile();
            return false;
        } else {
            this.startRecordingProfile();
            return true;
        }
    },

    get treeItemTitle()
    {
        return WebInspector.UIString("CPU PROFILES");
    },

    get description()
    {
        return WebInspector.UIString("CPU profiles show where the execution time is spent in your page's JavaScript functions.");
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _consoleProfileStarted: function(event)
    {
        var data = /** @type {!WebInspector.CPUProfilerModel.EventData} */ (event.data);
        var resolvedTitle = data.title;
        if (!resolvedTitle) {
            resolvedTitle = WebInspector.UIString("Profile %s", this._nextAnonymousConsoleProfileNumber++);
            this._anonymousConsoleProfileIdToTitle[data.id] = resolvedTitle;
        }
        this._addMessageToConsole(WebInspector.ConsoleMessage.MessageType.Profile, data.scriptLocation, WebInspector.UIString("Profile '%s' started.", resolvedTitle));
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _consoleProfileFinished: function(event)
    {
        var data = /** @type {!WebInspector.CPUProfilerModel.EventData} */ (event.data);
        var cpuProfile = /** @type {!ProfilerAgent.Profile} */ (data.cpuProfile);
        var resolvedTitle = data.title;
        if (typeof resolvedTitle === "undefined") {
            resolvedTitle = this._anonymousConsoleProfileIdToTitle[data.id];
            delete this._anonymousConsoleProfileIdToTitle[data.id];
        }
        var profile = new WebInspector.CPUProfileHeader(data.scriptLocation.target(), this, resolvedTitle);
        profile.setProtocolProfile(cpuProfile);
        this.addProfile(profile);
        this._addMessageToConsole(WebInspector.ConsoleMessage.MessageType.ProfileEnd, data.scriptLocation, WebInspector.UIString("Profile '%s' finished.", resolvedTitle));
    },

    /**
     * @param {string} type
     * @param {!WebInspector.DebuggerModel.Location} scriptLocation
     * @param {string} messageText
     */
    _addMessageToConsole: function(type, scriptLocation, messageText)
    {
        var script = scriptLocation.script();
        var target = scriptLocation.target();
        var message = new WebInspector.ConsoleMessage(
            target,
            WebInspector.ConsoleMessage.MessageSource.ConsoleAPI,
            WebInspector.ConsoleMessage.MessageLevel.Debug,
            messageText,
            type,
            undefined,
            undefined,
            undefined,
            undefined,
            [{
                functionName: "",
                scriptId: scriptLocation.scriptId,
                url: script ? script.contentURL() : "",
                lineNumber: scriptLocation.lineNumber,
                columnNumber: scriptLocation.columnNumber || 0
            }]);

        target.consoleModel.addMessage(message);
    },

    startRecordingProfile: function()
    {
        var target = WebInspector.context.flavor(WebInspector.Target);
        if (this._profileBeingRecorded || !target)
            return;
        var profile = new WebInspector.CPUProfileHeader(target, this);
        this.setProfileBeingRecorded(profile);
        WebInspector.targetManager.suspendAllTargets();
        this.addProfile(profile);
        profile.updateStatus(WebInspector.UIString("Recording\u2026"));
        this._recording = true;
        target.cpuProfilerModel.startRecording();
    },

    stopRecordingProfile: function()
    {
        this._recording = false;
        if (!this._profileBeingRecorded || !this._profileBeingRecorded.target())
            return;

        var recordedProfile;

        /**
         * @param {?ProfilerAgent.Profile} profile
         * @this {WebInspector.CPUProfileType}
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
         * @this {WebInspector.CPUProfileType}
         */
        function fireEvent()
        {
            this.dispatchEventToListeners(WebInspector.ProfileType.Events.ProfileComplete, recordedProfile);
        }

        this._profileBeingRecorded.target().cpuProfilerModel.stopRecording()
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
        return new WebInspector.CPUProfileHeader(null, this, title);
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
 * @param {!WebInspector.CPUProfileType} type
 * @param {string=} title
 */
WebInspector.CPUProfileHeader = function(target, type, title)
{
    WebInspector.WritableProfileHeader.call(this, target, type, title);
}

WebInspector.CPUProfileHeader.prototype = {
    /**
     * @override
     * @return {!WebInspector.ProfileView}
     */
    createView: function()
    {
        return new WebInspector.CPUProfileView(this);
    },

    /**
     * @return {!ProfilerAgent.Profile}
     */
    protocolProfile: function()
    {
        return this._protocolProfile;
    },

    __proto__: WebInspector.WritableProfileHeader.prototype
}

/**
 * @implements {WebInspector.ProfileDataGridNode.Formatter}
 * @constructor
 */
WebInspector.CPUProfileView.NodeFormatter = function(profileView)
{
    this._profileView = profileView;
}

WebInspector.CPUProfileView.NodeFormatter.prototype = {
    /**
     * @override
     * @param {number} value
     * @return {string}
     */
    formatValue: function(value)
    {
        return WebInspector.UIString("%.1f\u2009ms", value);
    },

    /**
     * @override
     * @param {number} value
     * @param {!WebInspector.ProfileDataGridNode} node
     * @return {string}
     */
    formatPercent: function(value, node)
    {
        return node.profileNode === this._profileView.profile.idleNode ? "" : WebInspector.UIString("%.2f\u2009%%", value);
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
 * @param {!WebInspector.CPUProfileDataModel} cpuProfile
 * @param {?WebInspector.Target} target
 */
WebInspector.CPUFlameChartDataProvider = function(cpuProfile, target)
{
    WebInspector.ProfileFlameChartDataProvider.call(this, target);
    this._cpuProfile = cpuProfile;
}

WebInspector.CPUFlameChartDataProvider.prototype = {
    /**
     * @override
     * @return {!WebInspector.FlameChart.TimelineData}
     */
    _calculateTimelineData: function()
    {
        /**
         * @constructor
         * @param {number} depth
         * @param {number} duration
         * @param {number} startTime
         * @param {number} selfTime
         * @param {!WebInspector.CPUProfileNode} node
         */
        function ChartEntry(depth, duration, startTime, selfTime, node)
        {
            this.depth = depth;
            this.duration = duration;
            this.startTime = startTime;
            this.selfTime = selfTime;
            this.node = node;
        }

        /** @type {!Array.<?ChartEntry>} */
        var entries = [];
        /** @type {!Array.<number>} */
        var stack = [];
        var maxDepth = 5;

        function onOpenFrame()
        {
            stack.push(entries.length);
            // Reserve space for the entry, as they have to be ordered by startTime.
            // The entry itself will be put there in onCloseFrame.
            entries.push(null);
        }
        /**
         * @param {number} depth
         * @param {!WebInspector.CPUProfileNode} node
         * @param {number} startTime
         * @param {number} totalTime
         * @param {number} selfTime
         */
        function onCloseFrame(depth, node, startTime, totalTime, selfTime)
        {
            var index = stack.pop();
            entries[index] = new ChartEntry(depth, totalTime, startTime, selfTime, node);
            maxDepth = Math.max(maxDepth, depth);
        }
        this._cpuProfile.forEachFrame(onOpenFrame, onCloseFrame);

        /** @type {!Array<!WebInspector.CPUProfileNode>} */
        var entryNodes = new Array(entries.length);
        var entryLevels = new Uint16Array(entries.length);
        var entryTotalTimes = new Float32Array(entries.length);
        var entrySelfTimes = new Float32Array(entries.length);
        var entryStartTimes = new Float64Array(entries.length);
        var minimumBoundary = this.minimumBoundary();

        for (var i = 0; i < entries.length; ++i) {
            var entry = entries[i];
            entryNodes[i] = entry.node;
            entryLevels[i] = entry.depth;
            entryTotalTimes[i] = entry.duration;
            entryStartTimes[i] = entry.startTime;
            entrySelfTimes[i] = entry.selfTime;
        }

        this._maxStackDepth = maxDepth;

        this._timelineData = new WebInspector.FlameChart.TimelineData(entryLevels, entryTotalTimes, entryStartTimes, null);

        /** @type {!Array<!WebInspector.CPUProfileNode>} */
        this._entryNodes = entryNodes;
        this._entrySelfTimes = entrySelfTimes;

        return this._timelineData;
    },

    /**
     * @override
     * @param {number} entryIndex
     * @return {?Element}
     */
    prepareHighlightedEntryInfo: function(entryIndex)
    {
        var timelineData = this._timelineData;
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
        /**
         * @param {number} ms
         * @return {string}
         */
        function millisecondsToString(ms)
        {
            if (ms === 0)
                return "0";
            if (ms < 1000)
                return WebInspector.UIString("%.1f\u2009ms", ms);
            return Number.secondsToString(ms / 1000, true);
        }
        var name = WebInspector.beautifyFunctionName(node.functionName);
        pushEntryInfoRow(WebInspector.UIString("Name"), name);
        var selfTime = millisecondsToString(this._entrySelfTimes[entryIndex]);
        var totalTime = millisecondsToString(timelineData.entryTotalTimes[entryIndex]);
        pushEntryInfoRow(WebInspector.UIString("Self time"), selfTime);
        pushEntryInfoRow(WebInspector.UIString("Total time"), totalTime);
        var linkifier = new WebInspector.Linkifier();
        var link = linkifier.maybeLinkifyConsoleCallFrame(this._target, node.callFrame);
        if (link)
            pushEntryInfoRow(WebInspector.UIString("URL"), link.textContent);
        linkifier.dispose();
        pushEntryInfoRow(WebInspector.UIString("Aggregated self time"), Number.secondsToString(node.self / 1000, true));
        pushEntryInfoRow(WebInspector.UIString("Aggregated total time"), Number.secondsToString(node.total / 1000, true));
        if (node.deoptReason)
            pushEntryInfoRow(WebInspector.UIString("Not optimized"), node.deoptReason);

        return WebInspector.ProfileView.buildPopoverTable(entryInfo);
    },

    __proto__: WebInspector.ProfileFlameChartDataProvider.prototype
}
