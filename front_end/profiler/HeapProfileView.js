// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {UI.Searchable}
 * @unrestricted
 */
Profiler.HeapProfileView = class extends Profiler.ProfileView {
  /**
   * @param {!Profiler.SamplingHeapProfileHeader} profileHeader
   */
  constructor(profileHeader) {
    super();
    this._profileHeader = profileHeader;
    this.profile = new Profiler.SamplingHeapProfileModel(profileHeader._profile || profileHeader.protocolProfile());
    this.adjustedTotal = this.profile.total;
    var views = [
      Profiler.ProfileView.ViewTypes.Flame, Profiler.ProfileView.ViewTypes.Heavy, Profiler.ProfileView.ViewTypes.Tree
    ];
    this.initialize(new Profiler.HeapProfileView.NodeFormatter(this), views);
  }

  /**
   * @override
   * @param {string} columnId
   * @return {string}
   */
  columnHeader(columnId) {
    switch (columnId) {
      case 'self':
        return Common.UIString('Self Size (bytes)');
      case 'total':
        return Common.UIString('Total Size (bytes)');
    }
    return '';
  }

  /**
   * @override
   * @return {!PerfUI.FlameChartDataProvider}
   */
  createFlameChartDataProvider() {
    return new Profiler.HeapFlameChartDataProvider(this.profile, this._profileHeader.target());
  }
};

/**
 * @unrestricted
 */
Profiler.SamplingHeapProfileType = class extends Profiler.ProfileType {
  constructor() {
    super(Profiler.SamplingHeapProfileType.TypeId, Common.UIString('Record Allocation Profile'));
    this._recording = false;
    Profiler.SamplingHeapProfileType.instance = this;
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

  get buttonTooltip() {
    return this._recording ? Common.UIString('Stop heap profiling') : Common.UIString('Start heap profiling');
  }

  /**
   * @override
   * @return {boolean}
   */
  buttonClicked() {
    var wasRecording = this._recording;
    if (wasRecording)
      this.stopRecordingProfile();
    else
      this.startRecordingProfile();
    return !wasRecording;
  }

  get treeItemTitle() {
    return Common.UIString('ALLOCATION PROFILES');
  }

  get description() {
    return Common.UIString('Allocation profiles show memory allocations from your JavaScript functions.');
  }

  startRecordingProfile() {
    var heapProfilerModel = UI.context.flavor(SDK.HeapProfilerModel);
    if (this.profileBeingRecorded() || !heapProfilerModel)
      return;
    var profile = new Profiler.SamplingHeapProfileHeader(heapProfilerModel.target(), this);
    this.setProfileBeingRecorded(profile);
    SDK.targetManager.suspendAllTargets();
    this.addProfile(profile);
    profile.updateStatus(Common.UIString('Recording\u2026'));
    this._recording = true;
    heapProfilerModel.startSampling();
  }

  stopRecordingProfile() {
    this._recording = false;
    if (!this.profileBeingRecorded() || !this.profileBeingRecorded().target())
      return;

    var recordedProfile;

    /**
     * @param {?Protocol.HeapProfiler.SamplingHeapProfile} profile
     * @this {Profiler.SamplingHeapProfileType}
     */
    function didStopProfiling(profile) {
      if (!this.profileBeingRecorded())
        return;
      console.assert(profile);
      this.profileBeingRecorded().setProtocolProfile(profile);
      this.profileBeingRecorded().updateStatus('');
      recordedProfile = this.profileBeingRecorded();
      this.setProfileBeingRecorded(null);
    }

    /**
     * @this {Profiler.SamplingHeapProfileType}
     */
    function fireEvent() {
      this.dispatchEventToListeners(Profiler.ProfileType.Events.ProfileComplete, recordedProfile);
    }

    var heapProfilerModel =
        /** @type {!SDK.HeapProfilerModel} */ (this.profileBeingRecorded().target().model(SDK.HeapProfilerModel));
    heapProfilerModel.stopSampling()
        .then(didStopProfiling.bind(this))
        .then(SDK.targetManager.resumeAllTargets.bind(SDK.targetManager))
        .then(fireEvent.bind(this));
  }

  /**
   * @override
   * @param {string} title
   * @return {!Profiler.ProfileHeader}
   */
  createProfileLoadedFromFile(title) {
    return new Profiler.SamplingHeapProfileHeader(null, this, title);
  }

  /**
   * @override
   */
  profileBeingRecordedRemoved() {
    this.stopRecordingProfile();
  }
};

Profiler.SamplingHeapProfileType.TypeId = 'SamplingHeap';

/**
 * @unrestricted
 */
Profiler.SamplingHeapProfileHeader = class extends Profiler.WritableProfileHeader {
  /**
   * @param {?SDK.Target} target
   * @param {!Profiler.SamplingHeapProfileType} type
   * @param {string=} title
   */
  constructor(target, type, title) {
    super(target, type, title || Common.UIString('Profile %d', type.nextProfileUid()));
  }

  /**
   * @override
   * @return {!Profiler.ProfileView}
   */
  createView() {
    return new Profiler.HeapProfileView(this);
  }

  /**
   * @return {!Protocol.HeapProfiler.SamplingHeapProfile}
   */
  protocolProfile() {
    return this._protocolProfile;
  }
};

/**
 * @unrestricted
 */
Profiler.SamplingHeapProfileNode = class extends SDK.ProfileNode {
  /**
   * @param {!Protocol.HeapProfiler.SamplingHeapProfileNode} node
   */
  constructor(node) {
    var callFrame = node.callFrame || /** @type {!Protocol.Runtime.CallFrame} */ ({
                      // Backward compatibility for old CpuProfileNode format.
                      functionName: node['functionName'],
                      scriptId: node['scriptId'],
                      url: node['url'],
                      lineNumber: node['lineNumber'] - 1,
                      columnNumber: node['columnNumber'] - 1
                    });
    super(callFrame);
    this.self = node.selfSize;
  }
};

/**
 * @unrestricted
 */
Profiler.SamplingHeapProfileModel = class extends SDK.ProfileTreeModel {
  /**
   * @param {!Protocol.HeapProfiler.SamplingHeapProfile} profile
   */
  constructor(profile) {
    super();
    this.initialize(translateProfileTree(profile.head));

    /**
     * @param {!Protocol.HeapProfiler.SamplingHeapProfileNode} root
     * @return {!Profiler.SamplingHeapProfileNode}
     */
    function translateProfileTree(root) {
      var resultRoot = new Profiler.SamplingHeapProfileNode(root);
      var targetNodeStack = [resultRoot];
      var sourceNodeStack = [root];
      while (sourceNodeStack.length) {
        var sourceNode = sourceNodeStack.pop();
        var parentNode = targetNodeStack.pop();
        parentNode.children = sourceNode.children.map(child => new Profiler.SamplingHeapProfileNode(child));
        sourceNodeStack.push.apply(sourceNodeStack, sourceNode.children);
        targetNodeStack.push.apply(targetNodeStack, parentNode.children);
      }
      return resultRoot;
    }
  }
};

/**
 * @implements {Profiler.ProfileDataGridNode.Formatter}
 * @unrestricted
 */
Profiler.HeapProfileView.NodeFormatter = class {
  /**
   * @param {!Profiler.ProfileView} profileView
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
   * @param {!Profiler.ProfileDataGridNode} node
   * @return {string}
   */
  formatPercent(value, node) {
    return Common.UIString('%.2f\u2009%%', value);
  }

  /**
   * @override
   * @param  {!Profiler.ProfileDataGridNode} node
   * @return {?Element}
   */
  linkifyNode(node) {
    return this._profileView.linkifier().maybeLinkifyConsoleCallFrame(
        this._profileView.target(), node.profileNode.callFrame, 'profile-node-file');
  }
};

/**
 * @unrestricted
 */
Profiler.HeapFlameChartDataProvider = class extends Profiler.ProfileFlameChartDataProvider {
  /**
   * @param {!SDK.ProfileTreeModel} profile
   * @param {?SDK.Target} target
   */
  constructor(profile, target) {
    super();
    this._profile = profile;
    this._target = target;
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
   * @param {number} value
   * @param {number=} precision
   * @return {string}
   */
  formatValue(value, precision) {
    return Common.UIString('%s\u2009KB', Number.withThousandsSeparator(value / 1e3));
  }

  /**
   * @override
   * @return {!PerfUI.FlameChart.TimelineData}
   */
  _calculateTimelineData() {
    /**
     * @param  {!SDK.ProfileNode} node
     * @return {number}
     */
    function nodesCount(node) {
      return node.children.reduce((count, node) => count + nodesCount(node), 1);
    }
    var count = nodesCount(this._profile.root);
    /** @type {!Array<!SDK.ProfileNode>} */
    var entryNodes = new Array(count);
    var entryLevels = new Uint16Array(count);
    var entryTotalTimes = new Float32Array(count);
    var entryStartTimes = new Float64Array(count);
    var depth = 0;
    var maxDepth = 0;
    var position = 0;
    var index = 0;

    /**
     * @param {!SDK.ProfileNode} node
     */
    function addNode(node) {
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
    this._timelineData = new PerfUI.FlameChart.TimelineData(entryLevels, entryTotalTimes, entryStartTimes, null);

    return this._timelineData;
  }

  /**
   * @override
   * @param {number} entryIndex
   * @return {?Element}
   */
  prepareHighlightedEntryInfo(entryIndex) {
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
    pushEntryInfoRow(Common.UIString('Name'), UI.beautifyFunctionName(node.functionName));
    pushEntryInfoRow(Common.UIString('Self size'), Number.bytesToString(node.self));
    pushEntryInfoRow(Common.UIString('Total size'), Number.bytesToString(node.total));
    var linkifier = new Components.Linkifier();
    var link = linkifier.maybeLinkifyConsoleCallFrame(this._target, node.callFrame);
    if (link)
      pushEntryInfoRow(Common.UIString('URL'), link.textContent);
    linkifier.dispose();
    return Profiler.ProfileView.buildPopoverTable(entryInfo);
  }
};
