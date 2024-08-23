// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import type * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as Models from '../models/models.js';

import * as Util from '../util/util.js';

const BINDING_NAME = 'captureSelectors';

export class SelectorPickedEvent extends Event {
  static readonly eventName = 'selectorpicked';
  data: Models.Schema.StepWithSelectors&Pick<Models.Schema.ClickAttributes, 'offsetX'|'offsetY'>;

  constructor(
      data: Models.Schema.StepWithSelectors&Pick<Models.Schema.ClickAttributes, 'offsetX'|'offsetY'>,
  ) {
    super(SelectorPickedEvent.eventName, {bubbles: true, composed: true});
    this.data = data;
  }
}

export class RequestSelectorAttributeEvent extends Event {
  static readonly eventName = 'requestselectorattribute';
  send: (attribute?: string) => void;

  constructor(send: (attribute?: string) => void) {
    super(RequestSelectorAttributeEvent.eventName, {
      bubbles: true,
      composed: true,
    });
    this.send = send;
  }
}

export class SelectorPicker implements SDK.TargetManager.Observer {
  static get #targetManager(): SDK.TargetManager.TargetManager {
    return SDK.TargetManager.TargetManager.instance();
  }

  readonly #element: LitHtml.LitElement;

  #selectorAttribute?: string;

  readonly #activeMutex = new Common.Mutex.Mutex();
  active = false;

  constructor(element: LitHtml.LitElement) {
    this.#element = element;
  }

  start = (): Promise<void> => {
    return this.#activeMutex.run(async () => {
      if (this.active) {
        return;
      }
      this.active = true;

      this.#selectorAttribute = await new Promise<string|undefined>(
          (resolve, reject) => {
            const timeout = setTimeout(reject, 1000);
            this.#element.dispatchEvent(
                new RequestSelectorAttributeEvent(attribute => {
                  clearTimeout(timeout);
                  resolve(attribute);
                }),
            );
          },
      );

      SelectorPicker.#targetManager.observeTargets(this);

      this.#element.requestUpdate();
    });
  };

  stop = (): Promise<void> => {
    return this.#activeMutex.run(async () => {
      if (!this.active) {
        return;
      }
      this.active = false;

      SelectorPicker.#targetManager.unobserveTargets(this);
      SelectorPicker.#targetManager.targets().map(this.targetRemoved.bind(this));

      this.#selectorAttribute = undefined;

      this.#element.requestUpdate();
    });
  };

  toggle = (): Promise<void> => {
    if (!this.active) {
      return this.start();
    }
    return this.stop();
  };

  readonly #targetMutexes = new Map<SDK.Target.Target, Common.Mutex.Mutex>();
  targetAdded(target: SDK.Target.Target): void {
    if (target.type() !== SDK.Target.Type.FRAME) {
      return;
    }
    let mutex = this.#targetMutexes.get(target);
    if (!mutex) {
      mutex = new Common.Mutex.Mutex();
      this.#targetMutexes.set(target, mutex);
    }
    void mutex.run(async () => {
      await this.#addBindings(target);
      await this.#injectApplicationScript(target);
    });
  }
  targetRemoved(target: SDK.Target.Target): void {
    const mutex = this.#targetMutexes.get(target);
    if (!mutex) {
      return;
    }
    void mutex.run(async () => {
      try {
        await this.#injectCleanupScript(target);
        await this.#removeBindings(target);
      } catch {
      }
    });
  }

  #handleBindingCalledEvent = (
      event: Common.EventTarget.EventTargetEvent<Protocol.Runtime.BindingCalledEvent>,
      ): void => {
    if (event.data.name !== BINDING_NAME) {
      return;
    }
    const contextId = event.data.executionContextId;
    const frames = SDK.TargetManager.TargetManager.instance().targets();
    const contextTarget = Models.SDKUtils.findTargetByExecutionContext(
        frames,
        contextId,
    );
    const frameId = Models.SDKUtils.findFrameIdByExecutionContext(
        frames,
        contextId,
    );
    if (!contextTarget || !frameId) {
      throw new Error(
          `No execution context found for the binding call + ${
              JSON.stringify(
                  event.data,
                  )}`,
      );
    }
    const model = contextTarget.model(SDK.ResourceTreeModel.ResourceTreeModel);
    if (!model) {
      throw new Error(
          `ResourceTreeModel instance is missing for the target: ${contextTarget.id()}`,
      );
    }
    const frame = model.frameForId(frameId);
    if (!frame) {
      throw new Error('Frame is not found');
    }
    this.#element.dispatchEvent(
        new SelectorPickedEvent({
          ...JSON.parse(event.data.payload),
          ...Models.SDKUtils.getTargetFrameContext(contextTarget, frame),
        }),
    );
    void this.stop();
  };

  readonly #scriptIdentifier = new Map<SDK.Target.Target, Protocol.Page.ScriptIdentifier>();
  async #injectApplicationScript(target: SDK.Target.Target): Promise<void> {
    const injectedScript = await Util.InjectedScript.get();
    const script = `${injectedScript};DevToolsRecorder.startSelectorPicker({getAccessibleName, getAccessibleRole}, ${
        JSON.stringify(this.#selectorAttribute ? this.#selectorAttribute : undefined)}, ${Util.isDebugBuild})`;
    const [{identifier}] = await Promise.all([
      target.pageAgent().invoke_addScriptToEvaluateOnNewDocument({
        source: script,
        worldName: Util.DEVTOOLS_RECORDER_WORLD_NAME,
        includeCommandLineAPI: true,
      }),
      Models.SDKUtils.evaluateInAllFrames(Util.DEVTOOLS_RECORDER_WORLD_NAME, target, script),
    ]);
    this.#scriptIdentifier.set(target, identifier);
  }
  async #injectCleanupScript(target: SDK.Target.Target): Promise<void> {
    const identifier = this.#scriptIdentifier.get(target);
    Platform.assertNotNullOrUndefined(identifier);
    this.#scriptIdentifier.delete(target);
    await target.pageAgent().invoke_removeScriptToEvaluateOnNewDocument({identifier});
    const script = 'DevToolsRecorder.stopSelectorPicker()';
    await Models.SDKUtils.evaluateInAllFrames(Util.DEVTOOLS_RECORDER_WORLD_NAME, target, script);
  }

  async #addBindings(target: SDK.Target.Target): Promise<void> {
    const model = target.model(SDK.RuntimeModel.RuntimeModel);
    Platform.assertNotNullOrUndefined(model);
    model.addEventListener(SDK.RuntimeModel.Events.BindingCalled, this.#handleBindingCalledEvent);
    await model.addBinding({
      name: BINDING_NAME,
      executionContextName: Util.DEVTOOLS_RECORDER_WORLD_NAME,
    });
  }
  async #removeBindings(target: SDK.Target.Target): Promise<void> {
    await target.runtimeAgent().invoke_removeBinding({name: BINDING_NAME});
    const model = target.model(SDK.RuntimeModel.RuntimeModel);
    Platform.assertNotNullOrUndefined(model);
    model.removeEventListener(SDK.RuntimeModel.Events.BindingCalled, this.#handleBindingCalledEvent);
  }
}
