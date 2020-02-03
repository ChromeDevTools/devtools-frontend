// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';  // eslint-disable-line no-unused-vars

import {ProfilesPanel} from './ProfilesPanel.js';
import {instance} from './ProfileTypeRegistry.js';

/**
 * @implements {UI.ContextMenu.Provider}
 * @implements {UI.ActionDelegate.ActionDelegate}
 */
export class HeapProfilerPanel extends ProfilesPanel {
  constructor() {
    const registry = instance;
    const profileTypes =
        [registry.heapSnapshotProfileType, registry.trackingHeapSnapshotProfileType, registry.samplingHeapProfileType];
    if (Root.Runtime.experiments.isEnabled('nativeHeapProfiler')) {
      profileTypes.push(registry.samplingNativeHeapProfileType);
      profileTypes.push(registry.samplingNativeHeapSnapshotRendererType);
      profileTypes.push(registry.samplingNativeHeapSnapshotBrowserType);
    }
    super('heap_profiler', profileTypes, 'profiler.heap-toggle-recording');
  }

  /**
   * @override
   * @param {!Event} event
   * @param {!UI.ContextMenu.ContextMenu} contextMenu
   * @param {!Object} target
   */
  appendApplicableItems(event, contextMenu, target) {
    if (!(target instanceof SDK.RemoteObject.RemoteObject)) {
      return;
    }

    if (!this.isShowing()) {
      return;
    }

    const object = /** @type {!SDK.RemoteObject.RemoteObject} */ (target);
    if (!object.objectId) {
      return;
    }
    const objectId = /** @type {string} */ (object.objectId);

    const heapProfiles = instance.heapSnapshotProfileType.getProfiles();
    if (!heapProfiles.length) {
      return;
    }

    const heapProfilerModel = object.runtimeModel().heapProfilerModel();
    if (!heapProfilerModel) {
      return;
    }

    /**
     * @param {string} viewName
     * @this {ProfilesPanel}
     */
    function revealInView(viewName) {
      heapProfilerModel.snapshotObjectIdForObjectId(objectId).then(result => {
        if (this.isShowing() && result) {
          this.showObject(result, viewName);
        }
      });
    }

    contextMenu.revealSection().appendItem(
        Common.UIString.UIString('Reveal in Summary view'), revealInView.bind(this, 'Summary'));
  }

  /**
   * @override
   * @param {!UI.Context.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    const panel = self.UI.context.flavor(HeapProfilerPanel);
    console.assert(panel && panel instanceof HeapProfilerPanel);
    panel.toggleRecord();
    return true;
  }

  /**
   * @override
   */
  wasShown() {
    self.UI.context.setFlavor(HeapProfilerPanel, this);
    // Record the memory tool load time.
    Host.userMetrics.panelLoaded('heap_profiler', 'DevTools.Launch.HeapProfiler');
  }

  /**
   * @override
   */
  willHide() {
    self.UI.context.setFlavor(HeapProfilerPanel, null);
  }

  /**
   * @override
   * @param {!Protocol.HeapProfiler.HeapSnapshotObjectId} snapshotObjectId
   * @param {string} perspectiveName
   */
  showObject(snapshotObjectId, perspectiveName) {
    const registry = instance;
    const heapProfiles = registry.heapSnapshotProfileType.getProfiles();
    for (let i = 0; i < heapProfiles.length; i++) {
      const profile = heapProfiles[i];
      // FIXME: allow to choose snapshot if there are several options.
      if (profile.maxJSObjectId >= snapshotObjectId) {
        this.showProfile(profile);
        const view = this.viewForProfile(profile);
        view.selectLiveObject(perspectiveName, snapshotObjectId);
        break;
      }
    }
  }
}
