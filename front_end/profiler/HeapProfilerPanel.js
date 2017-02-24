// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {UI.ContextMenu.Provider}
 * @implements {UI.ActionDelegate}
 */
Profiler.HeapProfilerPanel = class extends Profiler.ProfilesPanel {
  constructor() {
    var registry = Profiler.ProfileTypeRegistry.instance;
    super(
        'heap_profiler',
        [registry.heapSnapshotProfileType, registry.samplingHeapProfileType, registry.trackingHeapSnapshotProfileType],
        'profiler.heap-toggle-recording');
  }

  /**
   * @override
   * @param {!Event} event
   * @param {!UI.ContextMenu} contextMenu
   * @param {!Object} target
   */
  appendApplicableItems(event, contextMenu, target) {
    if (!(target instanceof SDK.RemoteObject))
      return;

    if (!this.isShowing())
      return;

    var object = /** @type {!SDK.RemoteObject} */ (target);
    var objectId = object.objectId;
    if (!objectId)
      return;

    var heapProfiles = Profiler.ProfileTypeRegistry.instance.heapSnapshotProfileType.getProfiles();
    if (!heapProfiles.length)
      return;

    var heapProfilerModel = object.target().model(SDK.HeapProfilerModel);
    if (!heapProfilerModel)
      return;

    /**
     * @param {string} viewName
     * @this {Profiler.ProfilesPanel}
     */
    function revealInView(viewName) {
      heapProfilerModel.snapshotObjectIdForObjectId(objectId).then(result => {
        if (this.isShowing() && result)
          this.showObject(result, viewName);
      });
    }

    contextMenu.appendItem(Common.UIString.capitalize('Reveal in Summary ^view'), revealInView.bind(this, 'Summary'));
  }

  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    var panel = UI.context.flavor(Profiler.HeapProfilerPanel);
    console.assert(panel && panel instanceof Profiler.HeapProfilerPanel);
    panel.toggleRecord();
    return true;
  }

  /**
   * @override
   */
  wasShown() {
    UI.context.setFlavor(Profiler.HeapProfilerPanel, this);
  }

  /**
   * @override
   */
  willHide() {
    UI.context.setFlavor(Profiler.HeapProfilerPanel, null);
  }

  /**
   * @override
   * @param {!Protocol.HeapProfiler.HeapSnapshotObjectId} snapshotObjectId
   * @param {string} perspectiveName
   */
  showObject(snapshotObjectId, perspectiveName) {
    var registry = Profiler.ProfileTypeRegistry.instance;
    var heapProfiles = registry.heapSnapshotProfileType.getProfiles();
    for (var i = 0; i < heapProfiles.length; i++) {
      var profile = heapProfiles[i];
      // FIXME: allow to choose snapshot if there are several options.
      if (profile.maxJSObjectId >= snapshotObjectId) {
        this.showProfile(profile);
        var view = this.viewForProfile(profile);
        view.selectLiveObject(perspectiveName, snapshotObjectId);
        break;
      }
    }
  }
};
