// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import * as Models from '../models/models.js';
import * as Util from '../util/util.js';

import selectorPickerStyles from './selectorPicker.css.js';

const {html} = Lit;

const BINDING_NAME = 'captureSelectors';

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

const UIStrings = {
  /**
   * @description The title of a button that allows you to select an element on the page and update CSS/ARIA selectors.
   */
  selectorPicker: 'Select an element in the page to update selectors',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/recorder/components/SelectorPicker.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface ViewInput {
  active: boolean;
  disabled: boolean;
  onClick: (event: MouseEvent) => void;
}

export type ViewOutput = object;

export const DEFAULT_VIEW = (input: ViewInput, _output: ViewOutput, target: HTMLElement): void => {
  const {active, disabled, onClick} = input;
  Lit.render(
      html`
      <style>${selectorPickerStyles}</style>
      <devtools-button
        @click=${onClick}
        .title=${i18nString(UIStrings.selectorPicker)}
        class="selector-picker"
        .size=${Buttons.Button.Size.SMALL}
        .iconName=${'select-element'}
        .active=${active}
        .disabled=${disabled}
        .variant=${Buttons.Button.Variant.ICON}
        jslog=${VisualLogging.toggle('selector-picker').track({
        click: true,
      })}
      ></devtools-button>
    `,
      target,
  );
};

export class SelectorPicker extends UI.Widget.Widget implements SDK.TargetManager.Observer {
  #view: typeof DEFAULT_VIEW;
  #disabled = false;
  #active = false;
  #selectorAttribute?: string;
  readonly #activeMutex = new Common.Mutex.Mutex();
  readonly #targetMutexes = new Map<SDK.Target.Target, Common.Mutex.Mutex>();
  readonly #scriptIdentifier = new Map<SDK.Target.Target, Protocol.Page.ScriptIdentifier>();

  onSelectorPicked?: (data: Models.Schema.StepWithSelectors&
                      Pick<Models.Schema.ClickAttributes, 'offsetX'|'offsetY'>) => void;
  onAttributeRequested?: (send: (attribute?: string) => void) => void;

  constructor(element?: HTMLElement, view?: typeof DEFAULT_VIEW) {
    super(element, {useShadowDom: true});
    this.#view = view || DEFAULT_VIEW;
  }

  static get #targetManager(): SDK.TargetManager.TargetManager {
    return SDK.TargetManager.TargetManager.instance();
  }

  set disabled(disabled: boolean) {
    this.#disabled = disabled;
    this.requestUpdate();
  }

  override performUpdate(): void {
    this.#view(
        {
          active: this.#active,
          disabled: this.#disabled,
          onClick: this.#handleClickEvent.bind(this),
        },
        {},
        this.contentElement,
    );
  }

  #handleClickEvent(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    void this.#toggle();
  }

  async #toggle(): Promise<void> {
    if (!this.#active) {
      return await this.#start();
    }
    return await this.#stop();
  }

  #start = (): Promise<void> => {
    return this.#activeMutex.run(async () => {
      if (this.#active) {
        return;
      }
      this.#active = true;

      this.#selectorAttribute = await new Promise<string|undefined>(
          (resolve, reject) => {
            const timeout = setTimeout(reject, 1000);
            if (this.onAttributeRequested) {
              this.onAttributeRequested(attribute => {
                clearTimeout(timeout);
                resolve(attribute);
              });
            } else {
              clearTimeout(timeout);
              resolve(undefined);
            }
          },
      );

      SelectorPicker.#targetManager.observeTargets(this);
      this.requestUpdate();
    });
  };

  #stop = (): Promise<void> => {
    return this.#activeMutex.run(async () => {
      if (!this.#active) {
        return;
      }
      this.#active = false;

      SelectorPicker.#targetManager.unobserveTargets(this);
      SelectorPicker.#targetManager.targets().map(this.targetRemoved.bind(this));

      this.#selectorAttribute = undefined;
      this.requestUpdate();
    });
  };

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
    if (this.onSelectorPicked) {
      this.onSelectorPicked({
        ...JSON.parse(event.data.payload),
        ...Models.SDKUtils.getTargetFrameContext(contextTarget, frame),
      });
    }
    void this.#stop();
  };

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

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  override wasHidden(): void {
    super.wasHidden();
    void this.#stop();
  }
}
