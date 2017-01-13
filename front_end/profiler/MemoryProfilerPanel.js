// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {UI.ContextMenu.Provider}
 * @implements {UI.ActionDelegate}
 */
Profiler.MemoryProfilerPanel = class extends Profiler.ProfilesPanel {
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

    /**
     * @this {Profiler.ProfilesPanel}
     */
    function revealInView(viewName) {
      object.target().heapProfilerAgent().getHeapObjectId(objectId, didReceiveHeapObjectId.bind(this, viewName));
    }

    /**
     * @this {Profiler.ProfilesPanel}
     */
    function didReceiveHeapObjectId(viewName, error, result) {
      if (!this.isShowing())
        return;
      if (!error)
        this.showObject(result, viewName);
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
    var panel = UI.context.flavor(Profiler.MemoryProfilerPanel);
    console.assert(panel && panel instanceof Profiler.MemoryProfilerPanel);
    panel.toggleRecord();
    return true;
  }

  /**
   * @override
   */
  wasShown() {
    UI.context.setFlavor(Profiler.MemoryProfilerPanel, this);
  }

  /**
   * @override
   */
  willHide() {
    UI.context.setFlavor(Profiler.MemoryProfilerPanel, null);
  }
};
