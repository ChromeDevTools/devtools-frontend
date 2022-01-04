// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';

let contrastCheckTriggerInstance: ContrastCheckTrigger|null = null;

export class ContrastCheckTrigger {
  #pageLoadListeners: WeakMap<SDK.ResourceTreeModel.ResourceTreeModel, Common.EventTarget.EventDescriptor> =
      new WeakMap();
  #frameAddedListeners: WeakMap<SDK.ResourceTreeModel.ResourceTreeModel, Common.EventTarget.EventDescriptor> =
      new WeakMap();

  constructor() {
    SDK.TargetManager.TargetManager.instance().observeModels(SDK.ResourceTreeModel.ResourceTreeModel, this);
  }

  static instance({forceNew}: {forceNew: boolean} = {forceNew: false}): ContrastCheckTrigger {
    if (!contrastCheckTriggerInstance || forceNew) {
      contrastCheckTriggerInstance = new ContrastCheckTrigger();
    }

    return contrastCheckTriggerInstance;
  }

  async modelAdded(resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel): Promise<void> {
    this.#pageLoadListeners.set(
        resourceTreeModel,
        resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.Load, this.#pageLoaded, this));
    this.#frameAddedListeners.set(
        resourceTreeModel,
        resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameAdded, this.#frameAdded, this));
  }

  modelRemoved(resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel): void {
    const pageLoadListener = this.#pageLoadListeners.get(resourceTreeModel);
    if (pageLoadListener) {
      Common.EventTarget.removeEventListeners([pageLoadListener]);
    }
    const frameAddedListeners = this.#frameAddedListeners.get(resourceTreeModel);
    if (frameAddedListeners) {
      Common.EventTarget.removeEventListeners([frameAddedListeners]);
    }
  }

  #checkContrast(resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel): void {
    if (!Root.Runtime.experiments.isEnabled('contrastIssues')) {
      return;
    }
    void resourceTreeModel.target().auditsAgent().invoke_checkContrast({});
  }

  #pageLoaded(event: Common.EventTarget
                  .EventTargetEvent<{resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel, loadTime: number}>):
      void {
    const {resourceTreeModel} = event.data;
    this.#checkContrast(resourceTreeModel);
  }

  async #frameAdded(event: Common.EventTarget.EventTargetEvent<SDK.ResourceTreeModel.ResourceTreeFrame>):
      Promise<void> {
    if (!Root.Runtime.experiments.isEnabled('contrastIssues')) {
      return;
    }
    const frame = event.data;
    if (!frame.isMainFrame()) {
      return;
    }
    // If the target document finished loading, check the contrast immediately.
    // Otherwise, it should be triggered when the page load event fires.
    const response = await frame.resourceTreeModel().target().runtimeAgent().invoke_evaluate(
        {expression: 'document.readyState', returnByValue: true});
    if (response.result && response.result.value === 'complete') {
      this.#checkContrast(frame.resourceTreeModel());
    }
  }
}
