// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';

const UIStrings = {
  /**
   * @description Placeholder text shown when a JavaScript VM isolate has no label in the Performance panel.
   */
  empty: '(empty)',
  /**
   * @description Title for the dropdown to select a JavaScript VM instance in the Performance panel.
   */
  selectJavascriptVmInstance: 'Select JavaScript VM instance',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/timeline/IsolateSelector.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class IsolateSelector extends UI.Toolbar.ToolbarComboBox implements SDK.IsolateManager.Observer {
  readonly itemByIsolate: Map<SDK.IsolateManager.Isolate, HTMLOptionElement> = new Map();
  readonly #targetManager: SDK.TargetManager.TargetManager;
  readonly #isolateManager: SDK.IsolateManager.IsolateManager;
  readonly #emptyOption: HTMLOptionElement;

  constructor(targetManager: SDK.TargetManager.TargetManager, isolateManager: SDK.IsolateManager.IsolateManager) {
    super(() => this.#onOptionSelected(), i18nString(UIStrings.selectJavascriptVmInstance));
    this.#targetManager = targetManager;
    this.#isolateManager = isolateManager;

    this.#emptyOption = this.createOption(i18nString(UIStrings.selectJavascriptVmInstance), '');
    this.#emptyOption.disabled = true;
    this.#emptyOption.hidden = true;
    this.#emptyOption.selected = true;
    this.addOption(this.#emptyOption);

    this.#isolateManager.observeIsolates(this);
    this.#targetManager.addEventListener(SDK.TargetManager.Events.NAME_CHANGED, this.targetChanged, this);
    this.#targetManager.addEventListener(SDK.TargetManager.Events.INSPECTED_URL_CHANGED, this.targetChanged, this);
  }

  #updateIsolateItem(isolate: SDK.IsolateManager.Isolate, itemForIsolate: HTMLOptionElement): void {
    const modelCountByName = new Map<string, number>();
    for (const model of isolate.models()) {
      const target = model.target();
      const name = this.#targetManager.rootTarget() !== target ? target.name() : '';
      const parsedURL = new Common.ParsedURL.ParsedURL(target.inspectedURL());
      const domain = parsedURL.isValid ? parsedURL.domain() : '';
      const title =
          target.decorateLabel(domain && name ? `${domain}: ${name}` : name || domain || i18nString(UIStrings.empty));
      modelCountByName.set(title, (modelCountByName.get(title) || 0) + 1);
    }
    const modelTitles: string[] = [];
    for (const [name, count] of modelCountByName) {
      const modelTitle = count > 1 ? `${name} (${count})` : name;
      modelTitles.push(modelTitle);
    }
    itemForIsolate.text = modelTitles.join(', ') || i18nString(UIStrings.empty);
  }

  #onOptionSelected(): void {
    const selectedOption = this.selectedOption();
    for (const [isolate, option] of this.itemByIsolate) {
      if (option === selectedOption) {
        const model = isolate.runtimeModel();
        UI.Context.Context.instance().setFlavor(
            SDK.CPUProfilerModel.CPUProfilerModel,
            model?.target().model(SDK.CPUProfilerModel.CPUProfilerModel) ?? null,
        );
        break;
      }
    }
  }

  isolateAdded(isolate: SDK.IsolateManager.Isolate): void {
    const isolateItem = this.createOption('', isolate.id());
    this.addOption(isolateItem);
    this.itemByIsolate.set(isolate, isolateItem);
    this.#updateIsolateItem(isolate, isolateItem);
  }

  isolateRemoved(isolate: SDK.IsolateManager.Isolate): void {
    const isolateItem = this.itemByIsolate.get(isolate);
    if (isolateItem) {
      if (isolateItem === this.selectedOption()) {
        this.select(this.#emptyOption);
        UI.Context.Context.instance().setFlavor(SDK.CPUProfilerModel.CPUProfilerModel, null);
      }
      this.removeOption(isolateItem);
      this.itemByIsolate.delete(isolate);
    }
  }

  isolateChanged(isolate: SDK.IsolateManager.Isolate): void {
    const isolateItem = this.itemByIsolate.get(isolate);
    if (isolateItem) {
      this.#updateIsolateItem(isolate, isolateItem);
    }
  }

  targetChanged(event: Common.EventTarget.EventTargetEvent<SDK.Target.Target>): void {
    const target = event.data;
    const model = target.model(SDK.RuntimeModel.RuntimeModel);
    if (!model) {
      return;
    }
    const isolate = this.#isolateManager.isolateByModel(model);
    if (isolate) {
      this.isolateChanged(isolate);
    }
  }
}
