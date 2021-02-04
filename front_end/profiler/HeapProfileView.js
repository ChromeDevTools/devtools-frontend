// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as Components from '../components/components.js';
import * as i18n from '../i18n/i18n.js';
import * as PerfUI from '../perf_ui/perf_ui.js';
import * as Platform from '../platform/platform.js';
import * as Root from '../root/root.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {ProfileFlameChartDataProvider} from './CPUProfileFlameChart.js';
import {HeapTimelineOverview, IdsRangeChanged, Samples} from './HeapTimelineOverview.js';  // eslint-disable-line no-unused-vars
import {Formatter, ProfileDataGridNode} from './ProfileDataGrid.js';           // eslint-disable-line no-unused-vars
import {ProfileEvents, ProfileHeader, ProfileType} from './ProfileHeader.js';  // eslint-disable-line no-unused-vars
import {ProfileView, WritableProfileHeader} from './ProfileView.js';

export const UIStrings = {
  /**
  *@description Text in Heap Profile View of a profiler tool
  *@example {3 MB} PH1
  */
  selectedSizeS: 'Selected size: {PH1}',
  /**
  *@description Text in Heap Profile View of a profiler tool
  */
  selfSizeBytes: 'Self Size (bytes)',
  /**
  *@description Text in Heap Profile View of a profiler tool
  */
  totalSizeBytes: 'Total Size (bytes)',
  /**
  *@description Text in Heap Profile View of a profiler tool
  */
  stopHeapProfiling: 'Stop heap profiling',
  /**
  *@description Text in Heap Profile View of a profiler tool
  */
  startHeapProfiling: 'Start heap profiling',
  /**
  *@description Text in CPUProfile View of a profiler tool
  */
  recording: 'Recording…',
  /**
  *@description Icon title in Heap Profile View of a profiler tool
  */
  heapProfilerIsRecording: 'Heap profiler is recording',
  /**
  *@description Text in Heap Profile View of a profiler tool
  */
  stopping: 'Stopping…',
  /**
  *@description Text in Heap Profile View of a profiler tool
  */
  allocationSampling: 'Allocation sampling',
  /**
  *@description Text in Heap Profile View of a profiler tool
  */
  samplingProfiles: 'SAMPLING PROFILES',
  /**
  *@description Description (part 1) in Heap Profile View of a profiler tool
  */
  recordMemoryAllocations: 'Record memory allocations using sampling method.',
  /**
  *@description Description (part 2) in Heap Profile View of a profiler tool
  */
  thisProfileTypeHasMinimal:
      'This profile type has minimal performance overhead and can be used for long running operations.',
  /**
  *@description Description (part 3) in Heap Profile View of a profiler tool
  */
  itProvidesGoodApproximation:
      'It provides good approximation of allocations broken down by JavaScript execution stack.',
  /**
  *@description Name of a profile
  *@example {2} PH1
  */
  profileD: 'Profile {PH1}',
  /**
  *@description Accessible text for the value in bytes in memory allocation or coverage view.
  *@example {12345} PH1
  */
  sBytes: '{PH1} bytes',
  /**
  *@description Text in CPUProfile View of a profiler tool
  *@example {21.33} PH1
  */
  formatPercent: '{PH1} %',
  /**
  *@description Text in Heap Profile View of a profiler tool
  *@example {1,021} PH1
  */
  skb: '{PH1} kB',
  /**
  *@description Text for the name of something
  */
  name: 'Name',
  /**
  *@description Text in Heap Profile View of a profiler tool
  */
  selfSize: 'Self size',
  /**
  *@description Text in Heap Profile View of a profiler tool
  */
  totalSize: 'Total size',
  /**
  *@description Text for web URLs
  */
  url: 'URL',
};
const str_ = i18n.i18n.registerUIStrings('profiler/HeapProfileView.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/**
 * @param {!SamplingHeapProfileHeader} profileHeader
 * @return {!Protocol.HeapProfiler.SamplingHeapProfile}
 */
function convertToSamplingHeapProfile(profileHeader) {
  return /** @type {!Protocol.HeapProfiler.SamplingHeapProfile} */ (
      profileHeader._profile || profileHeader.protocolProfile());
}

/**
 * @implements {UI.SearchableView.Searchable}
 */
export class HeapProfileView extends ProfileView {
  /**
   * @param {!SamplingHeapProfileHeader} profileHeader
   */
  constructor(profileHeader) {
    super();

    this.profileHeader = profileHeader;
    this._profileType = profileHeader.profileType();
    this.initialize(new NodeFormatter(this));
    const profile = new SamplingHeapProfileModel(convertToSamplingHeapProfile(profileHeader));
    this.adjustedTotal = profile.total;
    this.setProfile(profile);

    this._selectedSizeText = new UI.Toolbar.ToolbarText();

    /** @type {!Array<number>} */
    this._timestamps = [];
    /** @type {!Array<number>} */
    this._sizes = [];
    /** @type {!Array<number>} */
    this._max = [];
    /** @type {!Array<number>} */
    this._ordinals = [];
    /** @type {number} */
    this._totalTime = 0;
    /** @type {number} */
    this._lastOrdinal = 0;

    this._timelineOverview = new HeapTimelineOverview();

    if (Root.Runtime.experiments.isEnabled('samplingHeapProfilerTimeline')) {
      this._timelineOverview.addEventListener(IdsRangeChanged, this._onIdsRangeChanged.bind(this));
      this._timelineOverview.show(this.element, this.element.firstChild);
      this._timelineOverview.start();

      this._profileType.addEventListener(SamplingHeapProfileType.Events.StatsUpdate, this._onStatsUpdate, this);
      this._profileType.once(ProfileEvents.ProfileComplete).then(() => {
        this._profileType.removeEventListener(SamplingHeapProfileType.Events.StatsUpdate, this._onStatsUpdate, this);
        this._timelineOverview.stop();
        this._timelineOverview.updateGrid();
      });
    }
  }

  /**
   * @override
   * @return {!Promise<!Array<!UI.Toolbar.ToolbarItem>>}
   */
  async toolbarItems() {
    return [...await super.toolbarItems(), this._selectedSizeText];
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onIdsRangeChanged(event) {
    const minId = /** @type {number} */ (event.data.minId);
    const maxId = /** @type {number} */ (event.data.maxId);
    this._selectedSizeText.setText(
        i18nString(UIStrings.selectedSizeS, {PH1: Platform.NumberUtilities.bytesToString(event.data.size)}));
    this._setSelectionRange(minId, maxId);
  }

  /**
   * @param {number} minId
   * @param {number} maxId
   */
  _setSelectionRange(minId, maxId) {
    const profileData = convertToSamplingHeapProfile(/** @type {!SamplingHeapProfileHeader} */ (this.profileHeader));
    const profile = new SamplingHeapProfileModel(profileData, minId, maxId);
    this.adjustedTotal = profile.total;
    this.setProfile(profile);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onStatsUpdate(event) {
    const profile = event.data;

    if (!this._totalTime) {
      this._timestamps = [];
      this._sizes = [];
      this._max = [];
      this._ordinals = [];
      this._totalTime = 30000;
      this._lastOrdinal = 0;
    }

    this._sizes.fill(0);
    this._sizes.push(0);
    this._timestamps.push(Date.now());
    this._ordinals.push(this._lastOrdinal + 1);
    for (const sample of profile.samples) {
      this._lastOrdinal = Math.max(this._lastOrdinal, sample.ordinal);
      const bucket = Platform.ArrayUtilities.upperBound(
                         this._ordinals, sample.ordinal, Platform.ArrayUtilities.DEFAULT_COMPARATOR) -
          1;
      this._sizes[bucket] += sample.size;
    }
    this._max.push(this._sizes[this._sizes.length - 1]);

    const lastTimestamp = this._timestamps[this._timestamps.length - 1];
    if (lastTimestamp - this._timestamps[0] > this._totalTime) {
      this._totalTime *= 2;
    }

    const samples = /** @type {!Samples} */ ({
      sizes: this._sizes,
      max: this._max,
      ids: this._ordinals,
      timestamps: this._timestamps,
      totalTime: this._totalTime,
    });

    this._timelineOverview.setSamples(samples);
  }

  /**
   * @override
   * @param {string} columnId
   * @return {!Platform.UIString.LocalizedString}
   */
  columnHeader(columnId) {
    switch (columnId) {
      case 'self':
        return i18nString(UIStrings.selfSizeBytes);
      case 'total':
        return i18nString(UIStrings.totalSizeBytes);
    }
    return Common.UIString.LocalizedEmptyString;
  }

  /**
   * @override
   * @return {!ProfileFlameChartDataProvider}
   */
  createFlameChartDataProvider() {
    return new HeapFlameChartDataProvider(
        /** @type {!SamplingHeapProfileModel} */ (this.profile()), this.profileHeader.heapProfilerModel());
  }

}

export class SamplingHeapProfileTypeBase extends ProfileType {
  /**
   * @param {string} typeId
   * @param {string} description
   */
  constructor(typeId, description) {
    super(typeId, description);
    this._recording = false;
  }

  /**
   * @override
   * @return {?SamplingHeapProfileHeader}
   */
  profileBeingRecorded() {
    return /** @type {?SamplingHeapProfileHeader} */ (super.profileBeingRecorded());
  }

  /**
   * @override
   * @return {string}
   */
  typeName() {
    return 'Heap';
  }

  /**
   * @override
   * @return {string}
   */
  fileExtension() {
    return '.heapprofile';
  }

  /**
   * @override
   */
  get buttonTooltip() {
    return this._recording ? i18nString(UIStrings.stopHeapProfiling) : i18nString(UIStrings.startHeapProfiling);
  }

  /**
   * @override
   * @return {boolean}
   */
  buttonClicked() {
    if (this._recording) {
      this._stopRecordingProfile();
    } else {
      this._startRecordingProfile();
    }
    return this._recording;
  }

  _startRecordingProfile() {
    const heapProfilerModel = UI.Context.Context.instance().flavor(SDK.HeapProfilerModel.HeapProfilerModel);
    if (this.profileBeingRecorded() || !heapProfilerModel) {
      return;
    }
    const profileHeader = new SamplingHeapProfileHeader(heapProfilerModel, this);
    this.setProfileBeingRecorded(profileHeader);
    this.addProfile(profileHeader);
    profileHeader.updateStatus(i18nString(UIStrings.recording));

    const icon = UI.Icon.Icon.create('smallicon-warning');
    UI.Tooltip.Tooltip.install(icon, i18nString(UIStrings.heapProfilerIsRecording));
    UI.InspectorView.InspectorView.instance().setPanelIcon('heap_profiler', icon);

    this._recording = true;
    this._startSampling();
  }

  async _stopRecordingProfile() {
    this._recording = false;
    const recordedProfile = this.profileBeingRecorded();
    if (!recordedProfile || !recordedProfile.heapProfilerModel()) {
      return;
    }

    recordedProfile.updateStatus(i18nString(UIStrings.stopping));
    const profile = await this._stopSampling();
    if (recordedProfile) {
      console.assert(profile !== undefined);
      recordedProfile.setProtocolProfile(/** @type {?} */ (profile));
      recordedProfile.updateStatus('');
      this.setProfileBeingRecorded(null);
    }
    UI.InspectorView.InspectorView.instance().setPanelIcon('heap_profiler', null);
    this.dispatchEventToListeners(ProfileEvents.ProfileComplete, recordedProfile);
  }

  /**
   * @override
   * @param {string} title
   * @return {!ProfileHeader}
   */
  createProfileLoadedFromFile(title) {
    return new SamplingHeapProfileHeader(null, this, title);
  }

  /**
   * @override
   */
  profileBeingRecordedRemoved() {
    this._stopRecordingProfile();
  }

  _startSampling() {
    throw 'Not implemented';
  }

  /**
   * @return {!Promise<!Protocol.HeapProfiler.SamplingHeapProfile>}
   */
  _stopSampling() {
    throw 'Not implemented';
  }
}

/** @type {!SamplingHeapProfileType} */
let samplingHeapProfileTypeInstance;

export class SamplingHeapProfileType extends SamplingHeapProfileTypeBase {
  constructor() {
    super(SamplingHeapProfileType.TypeId, i18nString(UIStrings.allocationSampling));
    if (!samplingHeapProfileTypeInstance) {
      samplingHeapProfileTypeInstance = this;
    }

    /** @type {number} */
    this._updateTimer = 0;
    this._updateIntervalMs = 200;
  }

  static get instance() {
    return samplingHeapProfileTypeInstance;
  }

  /**
   * @override
   */
  get treeItemTitle() {
    return i18nString(UIStrings.samplingProfiles);
  }

  /**
   * @override
   */
  get description() {
    const formattedDescription = [
      i18nString(UIStrings.recordMemoryAllocations), i18nString(UIStrings.thisProfileTypeHasMinimal),
      i18nString(UIStrings.itProvidesGoodApproximation)
    ];
    return formattedDescription.join('\n');
  }

  /**
   * @override
   * @return {boolean}
   */
  hasTemporaryView() {
    return Root.Runtime.experiments.isEnabled('samplingHeapProfilerTimeline');
  }

  /**
   * @override
   */
  _startSampling() {
    const heapProfilerModel = this._obtainRecordingProfile();
    if (!heapProfilerModel) {
      return;
    }

    heapProfilerModel.startSampling();
    if (Root.Runtime.experiments.isEnabled('samplingHeapProfilerTimeline')) {
      this._updateTimer = window.setTimeout(() => {
        this._updateStats();
      }, this._updateIntervalMs);
    }
  }

  /**
   * @return {?SDK.HeapProfilerModel.HeapProfilerModel}
   */
  _obtainRecordingProfile() {
    const recordingProfile = this.profileBeingRecorded();
    if (recordingProfile) {
      const heapProfilerModel = recordingProfile.heapProfilerModel();
      return heapProfilerModel;
    }
    return null;
  }

  /**
   * @override
   * @return {!Promise<!Protocol.HeapProfiler.SamplingHeapProfile>}
   */
  async _stopSampling() {
    window.clearTimeout(this._updateTimer);
    this._updateTimer = 0;
    this.dispatchEventToListeners(SamplingHeapProfileType.Events.RecordingStopped);
    const heapProfilerModel = this._obtainRecordingProfile();
    if (!heapProfilerModel) {
      throw new Error('No heap profiler model');
    }

    const samplingProfile = await heapProfilerModel.stopSampling();
    if (!samplingProfile) {
      throw new Error('No sampling profile found');
    }
    return samplingProfile;
  }

  async _updateStats() {
    const heapProfilerModel = this._obtainRecordingProfile();
    if (!heapProfilerModel) {
      return;
    }

    const profile = await heapProfilerModel.getSamplingProfile();
    if (!this._updateTimer) {
      return;
    }
    this.dispatchEventToListeners(SamplingHeapProfileType.Events.StatsUpdate, profile);
    this._updateTimer = window.setTimeout(() => {
      this._updateStats();
    }, this._updateIntervalMs);
  }
}

SamplingHeapProfileType.TypeId = 'SamplingHeap';

/** @override @enum {symbol} */
SamplingHeapProfileType.Events = {
  RecordingStopped: Symbol('RecordingStopped'),
  StatsUpdate: Symbol('StatsUpdate')
};

export class SamplingHeapProfileHeader extends WritableProfileHeader {
  /**
   * @param {?SDK.HeapProfilerModel.HeapProfilerModel} heapProfilerModel
   * @param {!SamplingHeapProfileTypeBase} type
   * @param {string=} title
   */
  constructor(heapProfilerModel, type, title) {
    super(
        heapProfilerModel && heapProfilerModel.debuggerModel(), type,
        title || i18nString(UIStrings.profileD, {PH1: type.nextProfileUid()}));
    this._heapProfilerModel = heapProfilerModel;
    this._protocolProfile = {
      head: {
        callFrame: {
          functionName: '',
          scriptId: '',
          url: '',
          lineNumber: 0,
          columnNumber: 0,
        },
        children: [],
        selfSize: 0,
        id: 0,
      },
      samples: [],
      startTime: 0,
      endTime: 0,
      nodes: [],
    };
  }

  /**
   * @override
   * @return {!HeapProfileView}
   */
  createView() {
    return new HeapProfileView(this);
  }

  /**
   * @return {!Protocol.HeapProfiler.SamplingHeapProfile}
   */
  protocolProfile() {
    return this._protocolProfile;
  }

  /**
   * @return {?SDK.HeapProfilerModel.HeapProfilerModel}
   */
  heapProfilerModel() {
    return this._heapProfilerModel;
  }
}

export class SamplingHeapProfileNode extends SDK.ProfileTreeModel.ProfileNode {
  /**
   * @param {!Protocol.HeapProfiler.SamplingHeapProfileNode} node
   */
  constructor(node) {
    const callFrame = node.callFrame || /** @type {!Protocol.Runtime.CallFrame} */ ({
                        // Backward compatibility for old CpuProfileNode format.
                        // @ts-ignore https://crbug.com/1150777
                        functionName: node['functionName'],
                        // @ts-ignore https://crbug.com/1150777
                        scriptId: node['scriptId'],
                        // @ts-ignore https://crbug.com/1150777
                        url: node['url'],
                        // @ts-ignore https://crbug.com/1150777
                        lineNumber: node['lineNumber'] - 1,
                        // @ts-ignore https://crbug.com/1150777
                        columnNumber: node['columnNumber'] - 1,
                      });
    super(callFrame);
    this.self = node.selfSize;
  }
}

export class SamplingHeapProfileModel extends SDK.ProfileTreeModel.ProfileTreeModel {
  /**
   * @param {!Protocol.HeapProfiler.SamplingHeapProfile} profile
   * @param {number=} minOrdinal
   * @param {number=} maxOrdinal
   */
  constructor(profile, minOrdinal, maxOrdinal) {
    super();
    this.modules = /** @type {?} */ (profile).modules || [];

    /** @type {?Map<number, number>} */
    let nodeIdToSizeMap = null;
    if (minOrdinal || maxOrdinal) {
      nodeIdToSizeMap = new Map();
      minOrdinal = minOrdinal || 0;
      maxOrdinal = maxOrdinal || Infinity;
      for (const sample of profile.samples) {
        if (sample.ordinal < minOrdinal || sample.ordinal > maxOrdinal) {
          continue;
        }
        const size = nodeIdToSizeMap.get(sample.nodeId) || 0;
        nodeIdToSizeMap.set(sample.nodeId, size + sample.size);
      }
    }

    this.initialize(translateProfileTree(profile.head));

    /**
     * @param {!Protocol.HeapProfiler.SamplingHeapProfileNode} root
     * @return {!SamplingHeapProfileNode}
     */
    function translateProfileTree(root) {
      const resultRoot = new SamplingHeapProfileNode(root);
      const sourceNodeStack = [root];
      const targetNodeStack = [resultRoot];
      while (sourceNodeStack.length) {
        const sourceNode = /** @type {!Protocol.HeapProfiler.SamplingHeapProfileNode} */ (sourceNodeStack.pop());
        const targetNode = /** @type {!SamplingHeapProfileNode} */ (targetNodeStack.pop());
        targetNode.children = sourceNode.children.map(child => {
          const targetChild = new SamplingHeapProfileNode(child);
          if (nodeIdToSizeMap) {
            targetChild.self = nodeIdToSizeMap.get(child.id) || 0;
          }
          return targetChild;
        });
        sourceNodeStack.push(...sourceNode.children);
        targetNodeStack.push(...targetNode.children);
      }
      pruneEmptyBranches(resultRoot);
      return resultRoot;
    }

    /**
     * @param {!SDK.ProfileTreeModel.ProfileNode} node
     * @return {boolean}
     */
    function pruneEmptyBranches(node) {
      node.children = node.children.filter(pruneEmptyBranches);
      return Boolean(node.children.length || node.self);
    }
  }
}

/**
 * @implements {Formatter}
 */
export class NodeFormatter {
  /**
   * @param {!HeapProfileView} profileView
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
    return Number.withThousandsSeparator(value);
  }

  /**
   * @override
   * @param {number} value
   * @return {string}
   */
  formatValueAccessibleText(value) {
    return i18nString(UIStrings.sBytes, {PH1: value});
  }

  /**
   * @override
   * @param {number} value
   * @param {!ProfileDataGridNode} node
   * @return {string}
   */
  formatPercent(value, node) {
    return i18nString(UIStrings.formatPercent, {PH1: value.toFixed(2)});
  }

  /**
   * @override
   * @param  {!ProfileDataGridNode} node
   * @return {?Element}
   */
  linkifyNode(node) {
    const heapProfilerModel = this._profileView.profileHeader.heapProfilerModel();
    const target = heapProfilerModel ? heapProfilerModel.target() : null;
    const options = {
      className: 'profile-node-file',
      columnNumber: undefined,
      tabStop: undefined,
    };
    return this._profileView.linkifier().maybeLinkifyConsoleCallFrame(target, node.profileNode.callFrame, options);
  }
}

export class HeapFlameChartDataProvider extends ProfileFlameChartDataProvider {
  /**
   * @param {!SDK.ProfileTreeModel.ProfileTreeModel} profile
   * @param {?SDK.HeapProfilerModel.HeapProfilerModel} heapProfilerModel
   */
  constructor(profile, heapProfilerModel) {
    super();
    this._profile = profile;
    this._heapProfilerModel = heapProfilerModel;
    /** @type {!Array<!SDK.ProfileTreeModel.ProfileNode>} */
    this._entryNodes = [];
  }

  /**
   * @override
   * @return {number}
   */
  minimumBoundary() {
    return 0;
  }

  /**
   * @override
   * @return {number}
   */
  totalTime() {
    return this._profile.root.total;
  }

  /**
   * @override
   * @param {number} entryIndex
   * @return {boolean}
   */
  entryHasDeoptReason(entryIndex) {
    return false;
  }

  /**
   * @override
   * @param {number} value
   * @param {number=} precision
   * @return {string}
   */
  formatValue(value, precision) {
    return i18nString(UIStrings.skb, {PH1: Number.withThousandsSeparator(value / 1e3)});
  }

  /**
   * @override
   * @return {!PerfUI.FlameChart.TimelineData}
   */
  _calculateTimelineData() {
    /**
     * @param  {!SDK.ProfileTreeModel.ProfileNode} node
     * @return {number}
     */
    function nodesCount(node) {
      return node.children.reduce((count, node) => count + nodesCount(node), 1);
    }
    const count = nodesCount(this._profile.root);
    /** @type {!Array<!SDK.ProfileTreeModel.ProfileNode>} */
    const entryNodes = new Array(count);
    const entryLevels = new Uint16Array(count);
    const entryTotalTimes = new Float32Array(count);
    const entryStartTimes = new Float64Array(count);
    let depth = 0;
    let maxDepth = 0;
    let position = 0;
    let index = 0;

    /**
     * @param {!SDK.ProfileTreeModel.ProfileNode} node
     */
    function addNode(node) {
      const start = position;
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
    this._timelineData = new PerfUI.FlameChart.TimelineData(entryLevels, entryTotalTimes, entryStartTimes, null);

    return this._timelineData;
  }

  /**
   * @override
   * @param {number} entryIndex
   * @return {?Element}
   */
  prepareHighlightedEntryInfo(entryIndex) {
    const node = this._entryNodes[entryIndex];
    if (!node) {
      return null;
    }
    /** @type {!Array<{ title: string, value: string }>} */
    const entryInfo = [];
    /**
     * @param {string} title
     * @param {string} value
     */
    function pushEntryInfoRow(title, value) {
      entryInfo.push({title: title, value: value});
    }
    pushEntryInfoRow(i18nString(UIStrings.name), UI.UIUtils.beautifyFunctionName(node.functionName));
    pushEntryInfoRow(i18nString(UIStrings.selfSize), Platform.NumberUtilities.bytesToString(node.self));
    pushEntryInfoRow(i18nString(UIStrings.totalSize), Platform.NumberUtilities.bytesToString(node.total));
    const linkifier = new Components.Linkifier.Linkifier();
    const link = linkifier.maybeLinkifyConsoleCallFrame(
        this._heapProfilerModel ? this._heapProfilerModel.target() : null, node.callFrame);
    if (link) {
      pushEntryInfoRow(i18nString(UIStrings.url), /** @type {string} */ (link.textContent));
    }
    linkifier.dispose();
    return ProfileView.buildPopoverTable(entryInfo);
  }
}
