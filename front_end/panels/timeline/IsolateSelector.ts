// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Menus from '../../ui/components/menus/menus.js';
import * as UI from '../../ui/legacy/legacy.js';

const UIStrings = {
  /**
   *@description Text to show an item is empty
   */
  empty: '(empty)',
  /**
   *@description Text in isolate selector in Performance panel
   */
  selectJavascriptVmInstance: 'Select JavaScript VM instance',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/IsolateSelector.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class IsolateSelector extends UI.Toolbar.ToolbarItem implements SDK.IsolateManager.Observer {
  menu: Menus.SelectMenu.SelectMenu;
  options?: {index: number, isolate: SDK.IsolateManager.Isolate}[];
  items?: Menus.Menu.MenuItem[];
  readonly itemByIsolate: Map<SDK.IsolateManager.Isolate, Menus.Menu.MenuItem> = new Map();

  constructor() {
    const menu = new Menus.SelectMenu.SelectMenu();
    super(menu);

    this.menu = menu;
    menu.buttonTitle = i18nString(UIStrings.selectJavascriptVmInstance);
    menu.showArrow = true;
    menu.style.whiteSpace = 'normal';

    menu.addEventListener('selectmenuselected', this.#onSelectMenuSelected.bind(this));

    SDK.IsolateManager.IsolateManager.instance().observeIsolates(this);
    SDK.TargetManager.TargetManager.instance().addEventListener(
        SDK.TargetManager.Events.NAME_CHANGED, this.targetChanged, this);
    SDK.TargetManager.TargetManager.instance().addEventListener(
        SDK.TargetManager.Events.INSPECTED_URL_CHANGED, this.targetChanged, this);
  }

  #updateIsolateItem(isolate: SDK.IsolateManager.Isolate, itemForIsolate: Menus.Menu.MenuItem): void {
    const modelCountByName = new Map<string, number>();
    for (const model of isolate.models()) {
      const target = model.target();
      const name = SDK.TargetManager.TargetManager.instance().rootTarget() !== target ? target.name() : '';
      const parsedURL = new Common.ParsedURL.ParsedURL(target.inspectedURL());
      const domain = parsedURL.isValid ? parsedURL.domain() : '';
      const title =
          target.decorateLabel(domain && name ? `${domain}: ${name}` : name || domain || i18nString(UIStrings.empty));
      modelCountByName.set(title, (modelCountByName.get(title) || 0) + 1);
    }
    itemForIsolate.removeChildren();
    for (const [name, count] of modelCountByName) {
      const modelTitle = count > 1 ? `${name} (${count})` : name;

      const modelItem = itemForIsolate.createChild('div');
      modelItem.textContent = modelTitle;
    }
  }

  #onSelectMenuSelected(event: Menus.SelectMenu.SelectMenuItemSelectedEvent): void {
    this.itemByIsolate.forEach((item, isolate) => {
      item.selected = item.value === event.itemValue;

      if (item.selected) {
        // Get the first 29 characters to show in the menu, because the full title is too long and the menu's space is
        // limited.
        // Chose 29 because it is the length of the placeholder string "Select JavaScript VM instance".
        const selectedIsolateTitle = item.textContent?.slice(0, 29);
        this.menu.buttonTitle = selectedIsolateTitle || i18nString(UIStrings.empty);

        const model = isolate.runtimeModel();
        UI.Context.Context.instance().setFlavor(
            SDK.CPUProfilerModel.CPUProfilerModel,
            model && model.target().model(SDK.CPUProfilerModel.CPUProfilerModel));
      }
    });
  }

  isolateAdded(isolate: SDK.IsolateManager.Isolate): void {
    const isolateItem = new Menus.Menu.MenuItem();
    this.menu.appendChild(isolateItem);
    isolateItem.value = isolate.id();
    this.itemByIsolate.set(isolate, isolateItem);
    this.#updateIsolateItem(isolate, isolateItem);
  }

  isolateRemoved(isolate: SDK.IsolateManager.Isolate): void {
    const isolateItem = this.itemByIsolate.get(isolate);
    if (isolateItem) {
      if (isolateItem.selected) {
        this.menu.buttonTitle = i18nString(UIStrings.selectJavascriptVmInstance);
        UI.Context.Context.instance().setFlavor(SDK.CPUProfilerModel.CPUProfilerModel, null);
      }
      this.menu.removeChild(isolateItem);
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
    const isolate = SDK.IsolateManager.IsolateManager.instance().isolateByModel(model);
    if (isolate) {
      this.isolateChanged(isolate);
    }
  }
}
