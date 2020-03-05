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

import * as Common from '../common/common.js';
import * as Components from '../components/components.js';
import * as Host from '../host/host.js';
import * as PerfUI from '../perf_ui/perf_ui.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {ProfileFlameChartDataProvider} from './CPUProfileFlameChart.js';
import {Formatter, ProfileDataGridNode} from './ProfileDataGrid.js';           // eslint-disable-line no-unused-vars
import {ProfileEvents, ProfileHeader, ProfileType} from './ProfileHeader.js';  // eslint-disable-line no-unused-vars
import {ProfileView, WritableProfileHeader} from './ProfileView.js';

/**
 * @implements {UI.SearchableView.Searchable}
 * @unrestricted
 */
export class CPUProfileView extends ProfileView {
  /**
   * @param {!CPUProfileHeader} profileHeader
   */
  constructor(profileHeader) {
    super();
    this._profileHeader = profileHeader;
    this.initialize(new NodeFormatter(this));
    const profile = profileHeader.profileModel();
    this.adjustedTotal = profile.profileHead.total;
    this.adjustedTotal -= profile.idleNode ? profile.idleNode.total : 0;
    this.setProfile(profile);
  }

  /**
   * @override
   */
  wasShown() {
    super.wasShown();
    const lineLevelProfile = self.runtime.sharedInstance(PerfUI.LineLevelProfile.Performance);
    lineLevelProfile.reset();
    lineLevelProfile.appendCPUProfile(this._profileHeader.profileModel());
  }

  /**
   * @override
   * @param {string} columnId
   * @return {string}
   */
  columnHeader(columnId) {
    switch (columnId) {
      case 'self':
        return Common.UIString.UIString('Self Time');
      case 'total':
        return Common.UIString.UIString('Total Time');
    }
    return '';
  }

  /**
   * @override
   * @return {!ProfileFlameChartDataProvider}
   */
  createFlameChartDataProvider() {
    return new CPUFlameChartDataProvider(this._profileHeader.profileModel(), this._profileHeader._cpuProfilerModel);
  }
}

/**
 * @unrestricted
 */
export class CPUProfileType extends ProfileType {
  constructor() {
    super(CPUProfileType.TypeId, Common.UIString.UIString('Record JavaScript CPU Profile'));
    this._recording = false;

    CPUProfileType.instance = this;
    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.CPUProfilerModel.CPUProfilerModel, SDK.CPUProfilerModel.Events.ConsoleProfileFinished,
        this._consoleProfileFinished, this);
  }

  /**
   * @override
   * @return {?CPUProfileHeader}
   */
  profileBeingRecorded() {
    return /** @type {?CPUProfileHeader} */ (super.profileBeingRecorded());
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

  /**
   * @override
   */
  get buttonTooltip() {
    return this._recording ? Common.UIString.UIString('Stop CPU profiling') :
                             Common.UIString.UIString('Start CPU profiling');
  }

  /**
   * @override
   * @return {boolean}
   */
  buttonClicked() {
    if (this._recording) {
      this._stopRecordingProfile();
      return false;
    }
    this._startRecordingProfile();
    return true;
  }

  /**
   * @override
   */
  get treeItemTitle() {
    return Common.UIString.UIString('CPU PROFILES');
  }

  /**
   * @override
   */
  get description() {
    return Common.UIString.UIString(
        'CPU profiles show where the execution time is spent in your page\'s JavaScript functions.');
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _consoleProfileFinished(event) {
    const data = /** @type {!SDK.CPUProfilerModel.EventData} */ (event.data);
    const cpuProfile = /** @type {!Protocol.Profiler.Profile} */ (data.cpuProfile);
    const profile = new CPUProfileHeader(data.cpuProfilerModel, this, data.title);
    profile.setProtocolProfile(cpuProfile);
    this.addProfile(profile);
  }

  _startRecordingProfile() {
    const cpuProfilerModel = self.UI.context.flavor(SDK.CPUProfilerModel.CPUProfilerModel);
    if (this.profileBeingRecorded() || !cpuProfilerModel) {
      return;
    }
    const profile = new CPUProfileHeader(cpuProfilerModel, this);
    this.setProfileBeingRecorded(profile);
    SDK.SDKModel.TargetManager.instance().suspendAllTargets();
    this.addProfile(profile);
    profile.updateStatus(Common.UIString.UIString('Recording…'));
    this._recording = true;
    cpuProfilerModel.startRecording();
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.ProfilesCPUProfileTaken);
  }

  async _stopRecordingProfile() {
    this._recording = false;
    if (!this.profileBeingRecorded() || !this.profileBeingRecorded()._cpuProfilerModel) {
      return;
    }

    const profile = await this.profileBeingRecorded()._cpuProfilerModel.stopRecording();
    const recordedProfile = this.profileBeingRecorded();
    if (recordedProfile) {
      console.assert(profile);
      recordedProfile.setProtocolProfile(profile);
      recordedProfile.updateStatus('');
      this.setProfileBeingRecorded(null);
    }

    await SDK.SDKModel.TargetManager.instance().resumeAllTargets();
    this.dispatchEventToListeners(ProfileEvents.ProfileComplete, recordedProfile);
  }

  /**
   * @override
   * @param {string} title
   * @return {!ProfileHeader}
   */
  createProfileLoadedFromFile(title) {
    return new CPUProfileHeader(null, this, title);
  }

  /**
   * @override
   */
  profileBeingRecordedRemoved() {
    this._stopRecordingProfile();
  }
}

CPUProfileType.TypeId = 'CPU';

/**
 * @unrestricted
 */
export class CPUProfileHeader extends WritableProfileHeader {
  /**
   * @param {?SDK.CPUProfilerModel.CPUProfilerModel} cpuProfilerModel
   * @param {!CPUProfileType} type
   * @param {string=} title
   */
  constructor(cpuProfilerModel, type, title) {
    super(cpuProfilerModel && cpuProfilerModel.debuggerModel(), type, title);
    this._cpuProfilerModel = cpuProfilerModel;
  }

  /**
   * @override
   * @return {!ProfileView}
   */
  createView() {
    return new CPUProfileView(this);
  }

  /**
   * @return {!Protocol.Profiler.Profile}
   */
  protocolProfile() {
    return this._protocolProfile;
  }

  /**
   * @return {!SDK.CPUProfileDataModel.CPUProfileDataModel}
   */
  profileModel() {
    return this._profileModel;
  }

  /**
   * @override
   * @param {!Protocol.Profiler.Profile} profile
   */
  setProfile(profile) {
    const target = this._cpuProfilerModel && this._cpuProfilerModel.target() || null;
    this._profileModel = new SDK.CPUProfileDataModel.CPUProfileDataModel(profile, target);
  }
}

/**
 * @implements {Formatter}
 * @unrestricted
 */
export class NodeFormatter {
  /**
   * @param {!CPUProfileView} profileView
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
    return Common.UIString.UIString('%.1f\xa0ms', value);
  }

  /**
   * @override
   * @param {number} value
   * @return {string}
   */
  formatValueAccessibleText(value) {
    return this.formatValue(value);
  }

  /**
   * @override
   * @param {number} value
   * @param {!ProfileDataGridNode} node
   * @return {string}
   */
  formatPercent(value, node) {
    return node.profileNode === this._profileView.profile().idleNode ? '' :
                                                                       Common.UIString.UIString('%.2f\xa0%%', value);
  }

  /**
   * @override
   * @param  {!ProfileDataGridNode} node
   * @return {?Element}
   */
  linkifyNode(node) {
    const cpuProfilerModel = this._profileView._profileHeader._cpuProfilerModel;
    const target = cpuProfilerModel ? cpuProfilerModel.target() : null;
    const options = {className: 'profile-node-file'};
    return this._profileView.linkifier().maybeLinkifyConsoleCallFrame(target, node.profileNode.callFrame, options);
  }
}

/**
 * @unrestricted
 */
export class CPUFlameChartDataProvider extends ProfileFlameChartDataProvider {
  /**
   * @param {!SDK.CPUProfileDataModel.CPUProfileDataModel} cpuProfile
   * @param {?SDK.CPUProfilerModel.CPUProfilerModel} cpuProfilerModel
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
    /** @type {!Array.<?CPUFlameChartDataProvider.ChartEntry>} */
    const entries = [];
    /** @type {!Array.<number>} */
    const stack = [];
    let maxDepth = 5;

    function onOpenFrame() {
      stack.push(entries.length);
      // Reserve space for the entry, as they have to be ordered by startTime.
      // The entry itself will be put there in onCloseFrame.
      entries.push(null);
    }
    /**
     * @param {number} depth
     * @param {!SDK.CPUProfileDataModel.CPUProfileNode} node
     * @param {number} startTime
     * @param {number} totalTime
     * @param {number} selfTime
     */
    function onCloseFrame(depth, node, startTime, totalTime, selfTime) {
      const index = stack.pop();
      entries[index] = new CPUFlameChartDataProvider.ChartEntry(depth, totalTime, startTime, selfTime, node);
      maxDepth = Math.max(maxDepth, depth);
    }
    this._cpuProfile.forEachFrame(onOpenFrame, onCloseFrame);

    /** @type {!Array<!SDK.CPUProfileDataModel.CPUProfileNode>} */
    const entryNodes = new Array(entries.length);
    const entryLevels = new Uint16Array(entries.length);
    const entryTotalTimes = new Float32Array(entries.length);
    const entrySelfTimes = new Float32Array(entries.length);
    const entryStartTimes = new Float64Array(entries.length);

    for (let i = 0; i < entries.length; ++i) {
      const entry = entries[i];
      entryNodes[i] = entry.node;
      entryLevels[i] = entry.depth;
      entryTotalTimes[i] = entry.duration;
      entryStartTimes[i] = entry.startTime;
      entrySelfTimes[i] = entry.selfTime;
    }

    this._maxStackDepth = maxDepth + 1;

    this._timelineData = new PerfUI.FlameChart.TimelineData(entryLevels, entryTotalTimes, entryStartTimes, null);

    /** @type {!Array<!SDK.CPUProfileDataModel.CPUProfileNode>} */
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
    const timelineData = this._timelineData;
    const node = this._entryNodes[entryIndex];
    if (!node) {
      return null;
    }

    const entryInfo = [];
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
      if (ms === 0) {
        return '0';
      }
      if (ms < 1000) {
        return Common.UIString.UIString('%.1f\xa0ms', ms);
      }
      return Number.secondsToString(ms / 1000, true);
    }
    const name = UI.UIUtils.beautifyFunctionName(node.functionName);
    pushEntryInfoRow(ls`Name`, name);
    const selfTime = millisecondsToString(this._entrySelfTimes[entryIndex]);
    const totalTime = millisecondsToString(timelineData.entryTotalTimes[entryIndex]);
    pushEntryInfoRow(ls`Self time`, selfTime);
    pushEntryInfoRow(ls`Total time`, totalTime);
    const linkifier = new Components.Linkifier.Linkifier();
    const link = linkifier.maybeLinkifyConsoleCallFrame(
        this._cpuProfilerModel && this._cpuProfilerModel.target(), node.callFrame);
    if (link) {
      pushEntryInfoRow(ls`URL`, link.textContent);
    }
    linkifier.dispose();
    pushEntryInfoRow(ls`Aggregated self time`, Number.secondsToString(node.self / 1000, true));
    pushEntryInfoRow(ls`Aggregated total time`, Number.secondsToString(node.total / 1000, true));
    if (node.deoptReason) {
      pushEntryInfoRow(ls`Not optimized`, node.deoptReason);
    }

    return ProfileView.buildPopoverTable(entryInfo);
  }
}

/**
 * @unrestricted
 */
CPUFlameChartDataProvider.ChartEntry = class {
  /**
   * @param {number} depth
   * @param {number} duration
   * @param {number} startTime
   * @param {number} selfTime
   * @param {!SDK.CPUProfileDataModel.CPUProfileNode} node
   */
  constructor(depth, duration, startTime, selfTime, node) {
    this.depth = depth;
    this.duration = duration;
    this.startTime = startTime;
    this.selfTime = selfTime;
    this.node = node;
  }
};
