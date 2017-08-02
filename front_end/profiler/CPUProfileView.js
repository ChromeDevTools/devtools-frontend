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
 * @implements {UI.Searchable}
 * @unrestricted
 */
Profiler.CPUProfileView = class extends Profiler.ProfileView {
  /**
   * @param {!Profiler.CPUProfileHeader} profileHeader
   */
  constructor(profileHeader) {
    super();
    this._profileHeader = profileHeader;
    this.profile = profileHeader.profileModel();
    this.adjustedTotal = this.profile.profileHead.total;
    this.adjustedTotal -= this.profile.idleNode ? this.profile.idleNode.total : 0;
    this.initialize(new Profiler.CPUProfileView.NodeFormatter(this));
  }

  /**
   * @override
   */
  wasShown() {
    super.wasShown();
    var lineLevelProfile = PerfUI.LineLevelProfile.instance();
    lineLevelProfile.reset();
    lineLevelProfile.appendCPUProfile(this.profile);
  }

  /**
   * @override
   * @param {string} columnId
   * @return {string}
   */
  columnHeader(columnId) {
    switch (columnId) {
      case 'self':
        return Common.UIString('Self Time');
      case 'total':
        return Common.UIString('Total Time');
    }
    return '';
  }

  /**
   * @override
   * @return {!PerfUI.FlameChartDataProvider}
   */
  createFlameChartDataProvider() {
    return new Profiler.CPUFlameChartDataProvider(this.profile, this._profileHeader._cpuProfilerModel);
  }
};

/**
 * @unrestricted
 */
Profiler.CPUProfileType = class extends Profiler.ProfileType {
  constructor() {
    super(Profiler.CPUProfileType.TypeId, Common.UIString('Record JavaScript CPU Profile'));
    this._recording = false;

    Profiler.CPUProfileType.instance = this;
    SDK.targetManager.addModelListener(
        SDK.CPUProfilerModel, SDK.CPUProfilerModel.Events.ConsoleProfileFinished, this._consoleProfileFinished, this);
  }

  /**
   * @override
   * @return {?Profiler.CPUProfileHeader}
   */
  profileBeingRecorded() {
    return /** @type {?Profiler.CPUProfileHeader} */ (super.profileBeingRecorded());
  }

  /**
   * @override
   * @return {string}
   */
  typeName() {
    return 'CPU';
  }

  /**
   * @override
   * @return {string}
   */
  fileExtension() {
    return '.cpuprofile';
  }

  get buttonTooltip() {
    return this._recording ? Common.UIString('Stop CPU profiling') : Common.UIString('Start CPU profiling');
  }

  /**
   * @override
   * @return {boolean}
   */
  buttonClicked() {
    if (this._recording) {
      this.stopRecordingProfile();
      return false;
    } else {
      this.startRecordingProfile();
      return true;
    }
  }

  get treeItemTitle() {
    return Common.UIString('CPU PROFILES');
  }

  get description() {
    return Common.UIString('CPU profiles show where the execution time is spent in your page\'s JavaScript functions.');
  }

  /**
   * @param {!Common.Event} event
   */
  _consoleProfileFinished(event) {
    var data = /** @type {!SDK.CPUProfilerModel.EventData} */ (event.data);
    var cpuProfile = /** @type {!Protocol.Profiler.Profile} */ (data.cpuProfile);
    var profile = new Profiler.CPUProfileHeader(data.cpuProfilerModel, this, data.title);
    profile.setProtocolProfile(cpuProfile);
    this.addProfile(profile);
  }

  startRecordingProfile() {
    var cpuProfilerModel = UI.context.flavor(SDK.CPUProfilerModel);
    if (this.profileBeingRecorded() || !cpuProfilerModel)
      return;
    var profile = new Profiler.CPUProfileHeader(cpuProfilerModel, this);
    this.setProfileBeingRecorded(profile);
    SDK.targetManager.suspendAllTargets();
    this.addProfile(profile);
    profile.updateStatus(Common.UIString('Recording\u2026'));
    this._recording = true;
    cpuProfilerModel.startRecording();
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.ProfilesCPUProfileTaken);
  }

  async stopRecordingProfile() {
    this._recording = false;
    if (!this.profileBeingRecorded() || !this.profileBeingRecorded()._cpuProfilerModel)
      return;

    var profile = await this.profileBeingRecorded()._cpuProfilerModel.stopRecording();
    var recordedProfile = this.profileBeingRecorded();
    if (recordedProfile) {
      console.assert(profile);
      recordedProfile.setProtocolProfile(profile);
      recordedProfile.updateStatus('');
      this.setProfileBeingRecorded(null);
    }

    await SDK.targetManager.resumeAllTargets();
    this.dispatchEventToListeners(Profiler.ProfileType.Events.ProfileComplete, recordedProfile);
  }

  /**
   * @override
   * @param {string} title
   * @return {!Profiler.ProfileHeader}
   */
  createProfileLoadedFromFile(title) {
    return new Profiler.CPUProfileHeader(null, this, title);
  }

  /**
   * @override
   */
  profileBeingRecordedRemoved() {
    this.stopRecordingProfile();
  }
};

Profiler.CPUProfileType.TypeId = 'CPU';

/**
 * @unrestricted
 */
Profiler.CPUProfileHeader = class extends Profiler.WritableProfileHeader {
  /**
   * @param {?SDK.CPUProfilerModel} cpuProfilerModel
   * @param {!Profiler.CPUProfileType} type
   * @param {string=} title
   */
  constructor(cpuProfilerModel, type, title) {
    super(cpuProfilerModel && cpuProfilerModel.debuggerModel(), type, title);
    this._cpuProfilerModel = cpuProfilerModel;
  }

  /**
   * @override
   * @return {!Profiler.ProfileView}
   */
  createView() {
    return new Profiler.CPUProfileView(this);
  }

  /**
   * @return {!Protocol.Profiler.Profile}
   */
  protocolProfile() {
    return this._protocolProfile;
  }

  /**
   * @return {!SDK.CPUProfileDataModel}
   */
  profileModel() {
    return this._profileModel;
  }

  /**
   * @override
   * @param {!Protocol.Profiler.Profile} profile
   */
  setProfile(profile) {
    this._profileModel = new SDK.CPUProfileDataModel(profile);
  }
};

/**
 * @implements {Profiler.ProfileDataGridNode.Formatter}
 * @unrestricted
 */
Profiler.CPUProfileView.NodeFormatter = class {
  /**
   * @param {!Profiler.CPUProfileView} profileView
   */
  constructor(profileView) {
    this._profileView = profileView;
  }

  /**
   * @override
   * @param {number} value
   * @return {string}
   */
  formatValue(value) {
    return Common.UIString('%.1f\xa0ms', value);
  }

  /**
   * @override
   * @param {number} value
   * @param {!Profiler.ProfileDataGridNode} node
   * @return {string}
   */
  formatPercent(value, node) {
    return node.profileNode === this._profileView.profile.idleNode ? '' : Common.UIString('%.2f\xa0%%', value);
  }

  /**
   * @override
   * @param  {!Profiler.ProfileDataGridNode} node
   * @return {?Element}
   */
  linkifyNode(node) {
    var cpuProfilerModel = this._profileView._profileHeader._cpuProfilerModel;
    return this._profileView.linkifier().maybeLinkifyConsoleCallFrame(
        cpuProfilerModel ? cpuProfilerModel.target() : null, node.profileNode.callFrame, 'profile-node-file');
  }
};

/**
 * @unrestricted
 */
Profiler.CPUFlameChartDataProvider = class extends Profiler.ProfileFlameChartDataProvider {
  /**
   * @param {!SDK.CPUProfileDataModel} cpuProfile
   * @param {?SDK.CPUProfilerModel} cpuProfilerModel
   */
  constructor(cpuProfile, cpuProfilerModel) {
    super();
    this._cpuProfile = cpuProfile;
    this._cpuProfilerModel = cpuProfilerModel;
  }

  /**
   * @override
   * @return {!PerfUI.FlameChart.TimelineData}
   */
  _calculateTimelineData() {
    /** @type {!Array.<?Profiler.CPUFlameChartDataProvider.ChartEntry>} */
    var entries = [];
    /** @type {!Array.<number>} */
    var stack = [];
    var maxDepth = 5;

    function onOpenFrame() {
      stack.push(entries.length);
      // Reserve space for the entry, as they have to be ordered by startTime.
      // The entry itself will be put there in onCloseFrame.
      entries.push(null);
    }
    /**
     * @param {number} depth
     * @param {!SDK.CPUProfileNode} node
     * @param {number} startTime
     * @param {number} totalTime
     * @param {number} selfTime
     */
    function onCloseFrame(depth, node, startTime, totalTime, selfTime) {
      var index = stack.pop();
      entries[index] = new Profiler.CPUFlameChartDataProvider.ChartEntry(depth, totalTime, startTime, selfTime, node);
      maxDepth = Math.max(maxDepth, depth);
    }
    this._cpuProfile.forEachFrame(onOpenFrame, onCloseFrame);

    /** @type {!Array<!SDK.CPUProfileNode>} */
    var entryNodes = new Array(entries.length);
    var entryLevels = new Uint16Array(entries.length);
    var entryTotalTimes = new Float32Array(entries.length);
    var entrySelfTimes = new Float32Array(entries.length);
    var entryStartTimes = new Float64Array(entries.length);

    for (var i = 0; i < entries.length; ++i) {
      var entry = entries[i];
      entryNodes[i] = entry.node;
      entryLevels[i] = entry.depth;
      entryTotalTimes[i] = entry.duration;
      entryStartTimes[i] = entry.startTime;
      entrySelfTimes[i] = entry.selfTime;
    }

    this._maxStackDepth = maxDepth + 1;

    this._timelineData = new PerfUI.FlameChart.TimelineData(entryLevels, entryTotalTimes, entryStartTimes, null);

    /** @type {!Array<!SDK.CPUProfileNode>} */
    this._entryNodes = entryNodes;
    this._entrySelfTimes = entrySelfTimes;

    return this._timelineData;
  }

  /**
   * @override
   * @param {number} entryIndex
   * @return {?Element}
   */
  prepareHighlightedEntryInfo(entryIndex) {
    var timelineData = this._timelineData;
    var node = this._entryNodes[entryIndex];
    if (!node)
      return null;

    var entryInfo = [];
    /**
     * @param {string} title
     * @param {string} value
     */
    function pushEntryInfoRow(title, value) {
      entryInfo.push({title: title, value: value});
    }
    /**
     * @param {number} ms
     * @return {string}
     */
    function millisecondsToString(ms) {
      if (ms === 0)
        return '0';
      if (ms < 1000)
        return Common.UIString('%.1f\xa0ms', ms);
      return Number.secondsToString(ms / 1000, true);
    }
    var name = UI.beautifyFunctionName(node.functionName);
    pushEntryInfoRow(Common.UIString('Name'), name);
    var selfTime = millisecondsToString(this._entrySelfTimes[entryIndex]);
    var totalTime = millisecondsToString(timelineData.entryTotalTimes[entryIndex]);
    pushEntryInfoRow(Common.UIString('Self time'), selfTime);
    pushEntryInfoRow(Common.UIString('Total time'), totalTime);
    var linkifier = new Components.Linkifier();
    var link = linkifier.maybeLinkifyConsoleCallFrame(
        this._cpuProfilerModel && this._cpuProfilerModel.target(), node.callFrame);
    if (link)
      pushEntryInfoRow(Common.UIString('URL'), link.textContent);
    linkifier.dispose();
    pushEntryInfoRow(Common.UIString('Aggregated self time'), Number.secondsToString(node.self / 1000, true));
    pushEntryInfoRow(Common.UIString('Aggregated total time'), Number.secondsToString(node.total / 1000, true));
    if (node.deoptReason)
      pushEntryInfoRow(Common.UIString('Not optimized'), node.deoptReason);

    return Profiler.ProfileView.buildPopoverTable(entryInfo);
  }
};

/**
 * @unrestricted
 */
Profiler.CPUFlameChartDataProvider.ChartEntry = class {
  /**
   * @param {number} depth
   * @param {number} duration
   * @param {number} startTime
   * @param {number} selfTime
   * @param {!SDK.CPUProfileNode} node
   */
  constructor(depth, duration, startTime, selfTime, node) {
    this.depth = depth;
    this.duration = duration;
    this.startTime = startTime;
    this.selfTime = selfTime;
    this.node = node;
  }
};
