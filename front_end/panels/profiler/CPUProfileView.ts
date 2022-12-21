// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import type * as Protocol from '../../generated/protocol.js';

import {ProfileFlameChartDataProvider} from './CPUProfileFlameChart.js';

import {type Formatter, type ProfileDataGridNode} from './ProfileDataGrid.js';

import {ProfileEvents, ProfileType, type ProfileHeader} from './ProfileHeader.js';
import {ProfileView, WritableProfileHeader} from './ProfileView.js';

const UIStrings = {
  /**
   *@description Time of a single activity, as opposed to the total time
   */
  selfTime: 'Self Time',
  /**
   *@description Text for the total time of something
   */
  totalTime: 'Total Time',
  /**
   *@description Text in CPUProfile View of a profiler tool
   */
  recordJavascriptCpuProfile: 'Record JavaScript CPU Profile',
  /**
   *@description Text in CPUProfile View of a profiler tool
   */
  stopCpuProfiling: 'Stop CPU profiling',
  /**
   *@description Text in CPUProfile View of a profiler tool
   */
  startCpuProfiling: 'Start CPU profiling',
  /**
   *@description Text in CPUProfile View of a profiler tool
   */
  cpuProfiles: 'CPU PROFILES',
  /**
   *@description Text in CPUProfile View of a profiler tool, that show how much time a script spend executing a function.
   */
  cpuProfilesShow: 'CPU profiles show where the execution time is spent in your page\'s JavaScript functions.',
  /**
   *@description Text in CPUProfile View of a profiler tool
   */
  recording: 'Recording…',
  /**
   *@description Time in miliseconds
   *@example {30.1} PH1
   */
  fms: '{PH1} ms',
  /**
   *@description Text in CPUProfile View of a profiler tool
   *@example {21.33} PH1
   */
  formatPercent: '{PH1} %',
  /**
   *@description Text for the name of something
   */
  name: 'Name',
  /**
   *@description Text for web URLs
   */
  url: 'URL',
  /**
   *@description Text in CPUProfile View of a profiler tool
   */
  aggregatedSelfTime: 'Aggregated self time',
  /**
   *@description Text in CPUProfile View of a profiler tool
   */
  aggregatedTotalTime: 'Aggregated total time',
  /**
   *@description Text that indicates a JavaScript function in a CPU profile is not optimized.
   */
  notOptimized: 'Not optimized',
};
const str_ = i18n.i18n.registerUIStrings('panels/profiler/CPUProfileView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class CPUProfileView extends ProfileView implements UI.SearchableView.Searchable {
  profileHeader: CPUProfileHeader;
  adjustedTotal: number;
  constructor(profileHeader: CPUProfileHeader) {
    super();
    this.profileHeader = profileHeader;
    this.initialize(new NodeFormatter(this));
    const profile = profileHeader.profileModel();
    this.adjustedTotal = profile.profileHead.total;
    this.adjustedTotal -= profile.idleNode ? profile.idleNode.total : 0;
    this.setProfile(profile);
  }

  wasShown(): void {
    super.wasShown();
    PerfUI.LineLevelProfile.Performance.instance().reset();
    PerfUI.LineLevelProfile.Performance.instance().appendCPUProfile(this.profileHeader.profileModel());
  }

  columnHeader(columnId: string): Common.UIString.LocalizedString {
    switch (columnId) {
      case 'self':
        return i18nString(UIStrings.selfTime);
      case 'total':
        return i18nString(UIStrings.totalTime);
    }
    return Common.UIString.LocalizedEmptyString;
  }

  createFlameChartDataProvider(): ProfileFlameChartDataProvider {
    return new CPUFlameChartDataProvider(this.profileHeader.profileModel(), this.profileHeader.cpuProfilerModel);
  }
}

export class CPUProfileType extends ProfileType {
  recording: boolean;
  constructor() {
    super(CPUProfileType.TypeId, i18nString(UIStrings.recordJavascriptCpuProfile));
    this.recording = false;

    const targetManager = SDK.TargetManager.TargetManager.instance();
    const profilerModels = targetManager.models(SDK.CPUProfilerModel.CPUProfilerModel);
    for (const model of profilerModels) {
      for (const message of model.registeredConsoleProfileMessages) {
        this.consoleProfileFinished(message);
      }
    }

    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.CPUProfilerModel.CPUProfilerModel, SDK.CPUProfilerModel.Events.ConsoleProfileFinished,
        event => this.consoleProfileFinished(event.data), this);
  }

  profileBeingRecorded(): ProfileHeader|null {
    return super.profileBeingRecorded() as ProfileHeader | null;
  }

  typeName(): string {
    return 'CPU';
  }

  fileExtension(): string {
    return '.cpuprofile';
  }

  get buttonTooltip(): Common.UIString.LocalizedString {
    return this.recording ? i18nString(UIStrings.stopCpuProfiling) : i18nString(UIStrings.startCpuProfiling);
  }

  buttonClicked(): boolean {
    if (this.recording) {
      void this.stopRecordingProfile();
      return false;
    }
    this.startRecordingProfile();
    return true;
  }

  get treeItemTitle(): Common.UIString.LocalizedString {
    return i18nString(UIStrings.cpuProfiles);
  }

  get description(): Common.UIString.LocalizedString {
    return i18nString(UIStrings.cpuProfilesShow);
  }

  consoleProfileFinished(data: SDK.CPUProfilerModel.ProfileFinishedData): void {
    const profile = new CPUProfileHeader(data.cpuProfilerModel, this, data.title);
    profile.setProtocolProfile(data.cpuProfile);
    this.addProfile(profile);
  }

  startRecordingProfile(): void {
    const cpuProfilerModel = UI.Context.Context.instance().flavor(SDK.CPUProfilerModel.CPUProfilerModel);
    if (this.profileBeingRecorded() || !cpuProfilerModel) {
      return;
    }
    const profile = new CPUProfileHeader(cpuProfilerModel, this);
    this.setProfileBeingRecorded(profile as ProfileHeader);
    void SDK.TargetManager.TargetManager.instance().suspendAllTargets();
    this.addProfile(profile as ProfileHeader);
    profile.updateStatus(i18nString(UIStrings.recording));
    this.recording = true;
    void cpuProfilerModel.startRecording();
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.ProfilesCPUProfileTaken);
  }

  async stopRecordingProfile(): Promise<void> {
    this.recording = false;
    const profileBeingRecorded = this.profileBeingRecorded() as CPUProfileHeader;
    if (!profileBeingRecorded || !profileBeingRecorded.cpuProfilerModel) {
      return;
    }

    const profile = await profileBeingRecorded.cpuProfilerModel.stopRecording();
    const recordedProfile = this.profileBeingRecorded() as CPUProfileHeader;
    if (recordedProfile) {
      if (!profile) {
        throw new Error('Expected profile to be non-null');
      }
      recordedProfile.setProtocolProfile(profile);
      recordedProfile.updateStatus('');
      this.setProfileBeingRecorded(null);
    }

    await SDK.TargetManager.TargetManager.instance().resumeAllTargets();
    this.dispatchEventToListeners(ProfileEvents.ProfileComplete, recordedProfile);
  }

  createProfileLoadedFromFile(title: string): ProfileHeader {
    return new CPUProfileHeader(null, this, title);
  }

  profileBeingRecordedRemoved(): void {
    void this.stopRecordingProfile();
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  static readonly TypeId = 'CPU';
}

export class CPUProfileHeader extends WritableProfileHeader {
  cpuProfilerModel: SDK.CPUProfilerModel.CPUProfilerModel|null;
  profileModelInternal?: SDK.CPUProfileDataModel.CPUProfileDataModel;

  constructor(cpuProfilerModel: SDK.CPUProfilerModel.CPUProfilerModel|null, type: CPUProfileType, title?: string) {
    super(cpuProfilerModel && cpuProfilerModel.debuggerModel(), type, title);
    this.cpuProfilerModel = cpuProfilerModel;
  }

  createView(): ProfileView {
    return new CPUProfileView(this);
  }

  protocolProfile(): Protocol.Profiler.Profile {
    if (!this.protocolProfile()) {
      throw new Error('Expected _protocolProfile to be available');
    }
    return this.protocolProfile();
  }

  profileModel(): SDK.CPUProfileDataModel.CPUProfileDataModel {
    if (!this.profileModelInternal) {
      throw new Error('Expected _profileModel to be available');
    }
    return this.profileModelInternal;
  }

  setProfile(profile: Protocol.Profiler.Profile): void {
    const target = this.cpuProfilerModel && this.cpuProfilerModel.target() || null;
    this.profileModelInternal = new SDK.CPUProfileDataModel.CPUProfileDataModel(profile, target);
  }
}

export class NodeFormatter implements Formatter {
  readonly profileView: CPUProfileView;
  constructor(profileView: CPUProfileView) {
    this.profileView = profileView;
  }

  formatValue(value: number): string {
    return i18nString(UIStrings.fms, {PH1: value.toFixed(1)});
  }

  formatValueAccessibleText(value: number): string {
    return this.formatValue(value);
  }

  formatPercent(value: number, node: ProfileDataGridNode): string {
    if (this.profileView) {
      const profile = this.profileView.profile();
      if (profile && node.profileNode !== (profile as SDK.CPUProfileDataModel.CPUProfileDataModel).idleNode) {
        return i18nString(UIStrings.formatPercent, {PH1: value.toFixed(2)});
      }
    }
    return '';
  }

  linkifyNode(node: ProfileDataGridNode): Element|null {
    const cpuProfilerModel = this.profileView.profileHeader.cpuProfilerModel;
    const target = cpuProfilerModel ? cpuProfilerModel.target() : null;
    const options = {className: 'profile-node-file', inlineFrameIndex: 0};
    return this.profileView.linkifier().maybeLinkifyConsoleCallFrame(target, node.profileNode.callFrame, options);
  }
}

export class CPUFlameChartDataProvider extends ProfileFlameChartDataProvider {
  readonly cpuProfile: SDK.CPUProfileDataModel.CPUProfileDataModel;
  readonly cpuProfilerModel: SDK.CPUProfilerModel.CPUProfilerModel|null;
  entrySelfTimes?: Float32Array;

  constructor(
      cpuProfile: SDK.CPUProfileDataModel.CPUProfileDataModel,
      cpuProfilerModel: SDK.CPUProfilerModel.CPUProfilerModel|null) {
    super();
    this.cpuProfile = cpuProfile;
    this.cpuProfilerModel = cpuProfilerModel;
  }

  minimumBoundary(): number {
    return this.cpuProfile.profileStartTime;
  }

  totalTime(): number {
    return this.cpuProfile.profileHead.total;
  }

  entryHasDeoptReason(entryIndex: number): boolean {
    const node = (this.entryNodes[entryIndex] as SDK.CPUProfileDataModel.CPUProfileNode);
    return Boolean(node.deoptReason);
  }

  calculateTimelineData(): PerfUI.FlameChart.TimelineData {
    const entries: (CPUFlameChartDataProvider.ChartEntry|null)[] = [];
    const stack: number[] = [];
    let maxDepth = 5;

    function onOpenFrame(): void {
      stack.push(entries.length);
      // Reserve space for the entry, as they have to be ordered by startTime.
      // The entry itself will be put there in onCloseFrame.
      entries.push(null);
    }
    function onCloseFrame(
        depth: number, node: SDK.CPUProfileDataModel.CPUProfileNode, startTime: number, totalTime: number,
        selfTime: number): void {
      const index = (stack.pop() as number);
      entries[index] = new CPUFlameChartDataProvider.ChartEntry(depth, totalTime, startTime, selfTime, node);
      maxDepth = Math.max(maxDepth, depth);
    }
    this.cpuProfile.forEachFrame(onOpenFrame, onCloseFrame);

    const entryNodes: SDK.CPUProfileDataModel.CPUProfileNode[] = new Array(entries.length);
    const entryLevels = new Uint16Array(entries.length);
    const entryTotalTimes = new Float32Array(entries.length);
    const entrySelfTimes = new Float32Array(entries.length);
    const entryStartTimes = new Float64Array(entries.length);

    for (let i = 0; i < entries.length; ++i) {
      const entry = entries[i];
      if (!entry) {
        continue;
      }
      entryNodes[i] = entry.node;
      entryLevels[i] = entry.depth;
      entryTotalTimes[i] = entry.duration;
      entryStartTimes[i] = entry.startTime;
      entrySelfTimes[i] = entry.selfTime;
    }

    this.maxStackDepthInternal = maxDepth + 1;
    this.entryNodes = entryNodes;
    this.timelineData_ = new PerfUI.FlameChart.TimelineData(entryLevels, entryTotalTimes, entryStartTimes, null);

    this.entrySelfTimes = entrySelfTimes;

    return this.timelineData_;
  }

  prepareHighlightedEntryInfo(entryIndex: number): Element|null {
    const timelineData = this.timelineData_;
    const node = this.entryNodes[entryIndex];
    if (!node) {
      return null;
    }

    const entryInfo: {
      title: string,
      value: string,
    }[] = [];
    function pushEntryInfoRow(title: string, value: string): void {
      entryInfo.push({title: title, value: value});
    }
    function millisecondsToString(ms: number): string {
      if (ms === 0) {
        return '0';
      }
      if (ms < 1000) {
        return i18nString(UIStrings.fms, {PH1: ms.toFixed(1)});
      }
      return i18n.TimeUtilities.secondsToString(ms / 1000, true);
    }
    const name = UI.UIUtils.beautifyFunctionName(node.functionName);
    pushEntryInfoRow(i18nString(UIStrings.name), name);
    const selfTime = millisecondsToString((this.entrySelfTimes as Float32Array)[entryIndex]);
    const totalTime =
        millisecondsToString((timelineData as PerfUI.FlameChart.TimelineData).entryTotalTimes[entryIndex]);
    pushEntryInfoRow(i18nString(UIStrings.selfTime), selfTime);
    pushEntryInfoRow(i18nString(UIStrings.totalTime), totalTime);
    const linkifier = new Components.Linkifier.Linkifier();
    const link =
        linkifier.maybeLinkifyConsoleCallFrame(this.cpuProfilerModel && this.cpuProfilerModel.target(), node.callFrame);
    if (link) {
      pushEntryInfoRow(i18nString(UIStrings.url), link.textContent || '');
    }
    linkifier.dispose();
    pushEntryInfoRow(
        i18nString(UIStrings.aggregatedSelfTime), i18n.TimeUtilities.secondsToString(node.self / 1000, true));
    pushEntryInfoRow(
        i18nString(UIStrings.aggregatedTotalTime), i18n.TimeUtilities.secondsToString(node.total / 1000, true));
    const deoptReason = (node as SDK.CPUProfileDataModel.CPUProfileNode).deoptReason;
    if (deoptReason) {
      pushEntryInfoRow(i18nString(UIStrings.notOptimized), deoptReason);
    }

    return ProfileView.buildPopoverTable(entryInfo);
  }
}

export namespace CPUFlameChartDataProvider {
  export class ChartEntry {
    depth: number;
    duration: number;
    startTime: number;
    selfTime: number;
    node: SDK.CPUProfileDataModel.CPUProfileNode;

    constructor(
        depth: number, duration: number, startTime: number, selfTime: number,
        node: SDK.CPUProfileDataModel.CPUProfileNode) {
      this.depth = depth;
      this.duration = duration;
      this.startTime = startTime;
      this.selfTime = selfTime;
      this.node = node;
    }
  }
}
