// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import threadsSidebarPaneStyles from './threadsSidebarPane.css.js';

const {html, render, nothing} = Lit;

const UIStrings = {
  /**
   * @description Text in Threads Sidebar Pane of the Sources panel
   */
  paused: 'paused',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/sources/ThreadsSidebarPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface Thread {
  name: string;
  paused: boolean;
  selected: boolean;
  onSelect: () => void;
}

interface ViewInput {
  threads: Thread[];
}

// clang-format off
const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  render(html`
    <style>${threadsSidebarPaneStyles}</style>
    <div role="listbox">
    ${input.threads.map(thread => html`
      <button
        class="thread-item"
        @click=${thread.onSelect}
        tabindex="0"
        aria-selected=${thread.selected}
        role="option"
      >
        <div class="thread-item-title">${thread.name}</div>
        <div class="thread-item-paused-state">${thread.paused ? i18nString(UIStrings.paused) : ''}</div>
        ${thread.selected ? html`<devtools-icon name="large-arrow-right-filled" class="selected-thread-icon"></devtools-icon>` : nothing}
      </button>
    `)}
    </div>
  `, target);
};
// clang-format on

type View = typeof DEFAULT_VIEW;

export class ThreadsSidebarPane extends UI.Widget.VBox implements
    SDK.TargetManager.SDKModelObserver<SDK.DebuggerModel.DebuggerModel> {
  #debuggerModels = new Set<SDK.DebuggerModel.DebuggerModel>();
  #selectedModel: SDK.DebuggerModel.DebuggerModel|null;
  #view: View;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element, {
      jslog: `${VisualLogging.section('sources.threads')}`,
    });
    this.#view = view;

    const currentTarget = UI.Context.Context.instance().flavor(SDK.Target.Target);
    this.#selectedModel = currentTarget?.model(SDK.DebuggerModel.DebuggerModel) ?? null;

    UI.Context.Context.instance().addFlavorChangeListener(SDK.Target.Target, this.targetFlavorChanged, this);
    SDK.TargetManager.TargetManager.instance().observeModels(SDK.DebuggerModel.DebuggerModel, this);
  }

  static shouldBeShown(): boolean {
    return SDK.TargetManager.TargetManager.instance().models(SDK.DebuggerModel.DebuggerModel).length >= 2;
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  #getThreadName(debuggerModel: SDK.DebuggerModel.DebuggerModel): string {
    const executionContext = debuggerModel.runtimeModel().defaultExecutionContext();
    return executionContext?.label() || debuggerModel.target().name();
  }

  #handleThreadSelect(debuggerModel: SDK.DebuggerModel.DebuggerModel): void {
    UI.Context.Context.instance().setFlavor(SDK.Target.Target, debuggerModel.target());
  }

  #updatePausedState = (): void => {
    this.requestUpdate();
  };

  #targetNameChanged = (event: Common.EventTarget.EventTargetEvent<SDK.Target.Target>): void => {
    const target = event.data;
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    if (debuggerModel && this.#debuggerModels.has(debuggerModel)) {
      this.requestUpdate();
    }
  };

  override performUpdate(): void {
    const threads: Thread[] =
        Array.from(this.#debuggerModels).map(debuggerModel => ({
                                               name: this.#getThreadName(debuggerModel),
                                               paused: debuggerModel.isPaused(),
                                               selected: this.#selectedModel === debuggerModel,
                                               onSelect: () => this.#handleThreadSelect(debuggerModel),
                                             }));
    this.#view({threads}, undefined, this.contentElement);
  }

  modelAdded(debuggerModel: SDK.DebuggerModel.DebuggerModel): void {
    this.#debuggerModels.add(debuggerModel);
    debuggerModel.addEventListener(SDK.DebuggerModel.Events.DebuggerPaused, this.#updatePausedState);
    debuggerModel.addEventListener(SDK.DebuggerModel.Events.DebuggerResumed, this.#updatePausedState);
    debuggerModel.runtimeModel().addEventListener(
        SDK.RuntimeModel.Events.ExecutionContextChanged, this.requestUpdate, this);
    SDK.TargetManager.TargetManager.instance().addEventListener(
        SDK.TargetManager.Events.NAME_CHANGED, this.#targetNameChanged);

    this.requestUpdate();
  }

  modelRemoved(debuggerModel: SDK.DebuggerModel.DebuggerModel): void {
    this.#debuggerModels.delete(debuggerModel);
    debuggerModel.removeEventListener(SDK.DebuggerModel.Events.DebuggerPaused, this.#updatePausedState);
    debuggerModel.removeEventListener(SDK.DebuggerModel.Events.DebuggerResumed, this.#updatePausedState);
    debuggerModel.runtimeModel().removeEventListener(
        SDK.RuntimeModel.Events.ExecutionContextChanged, this.requestUpdate, this);
    SDK.TargetManager.TargetManager.instance().removeEventListener(
        SDK.TargetManager.Events.NAME_CHANGED, this.#targetNameChanged);

    this.requestUpdate();
  }

  private targetFlavorChanged({data: target}: Common.EventTarget.EventTargetEvent<SDK.Target.Target>): void {
    this.#selectedModel = target.model(SDK.DebuggerModel.DebuggerModel);
    this.requestUpdate();
  }
}
