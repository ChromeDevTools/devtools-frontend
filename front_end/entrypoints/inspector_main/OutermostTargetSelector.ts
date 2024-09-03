// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as UI from '../../ui/legacy/legacy.js';

import outermostTargetSelectorStyles from './outermostTargetSelector.css.js';

const UIStrings = {
  /**
   *@description Title of toolbar item in outermost target selector in the main toolbar
   */
  targetNotSelected: 'Page: Not selected',
  /**
   *@description Title of toolbar item in outermost target selector in the main toolbar
   *@example {top} PH1
   */
  targetS: 'Page: {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('entrypoints/inspector_main/OutermostTargetSelector.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let outermostTargetSelectorInstance: OutermostTargetSelector;

export class OutermostTargetSelector implements SDK.TargetManager.Observer, UI.SoftDropDown.Delegate<SDK.Target.Target>,
                                                UI.Toolbar.Provider {
  readonly listItems: UI.ListModel.ListModel<SDK.Target.Target>;
  readonly #dropDown: UI.SoftDropDown.SoftDropDown<SDK.Target.Target>;
  readonly #toolbarItem: UI.Toolbar.ToolbarItem;

  constructor() {
    this.listItems = new UI.ListModel.ListModel();
    this.#dropDown = new UI.SoftDropDown.SoftDropDown(this.listItems, this);
    this.#dropDown.setRowHeight(36);
    this.#toolbarItem = new UI.Toolbar.ToolbarItem(this.#dropDown.element);
    this.#toolbarItem.setTitle(i18nString(UIStrings.targetNotSelected));
    this.listItems.addEventListener(
        UI.ListModel.Events.ITEMS_REPLACED, () => this.#toolbarItem.setEnabled(Boolean(this.listItems.length)));

    this.#toolbarItem.element.classList.add('toolbar-has-dropdown');
    const targetManager = SDK.TargetManager.TargetManager.instance();
    targetManager.addModelListener(
        SDK.ChildTargetManager.ChildTargetManager, SDK.ChildTargetManager.Events.TARGET_INFO_CHANGED,
        this.#onTargetInfoChanged, this);
    targetManager.addEventListener(SDK.TargetManager.Events.NAME_CHANGED, this.#onInspectedURLChanged, this);
    targetManager.observeTargets(this);

    UI.Context.Context.instance().addFlavorChangeListener(SDK.Target.Target, this.#targetChanged, this);
  }

  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): OutermostTargetSelector {
    const {forceNew} = opts;
    if (!outermostTargetSelectorInstance || forceNew) {
      outermostTargetSelectorInstance = new OutermostTargetSelector();
    }

    return outermostTargetSelectorInstance;
  }

  item(): UI.Toolbar.ToolbarItem {
    return this.#toolbarItem;
  }

  highlightedItemChanged(
      _from: SDK.Target.Target|null, _to: SDK.Target.Target|null, fromElement: Element|null,
      toElement: Element|null): void {
    if (fromElement) {
      fromElement.classList.remove('highlighted');
    }
    if (toElement) {
      toElement.classList.add('highlighted');
    }
  }

  titleFor(target: SDK.Target.Target): string {
    return target.name();
  }

  targetAdded(target: SDK.Target.Target): void {
    if (target.outermostTarget() !== target) {
      return;
    }
    this.listItems.insertWithComparator(target, this.#targetComparator());
    this.#toolbarItem.setVisible(this.listItems.length > 1);

    if (target === UI.Context.Context.instance().flavor(SDK.Target.Target)) {
      this.#dropDown.selectItem(target);
    }
  }

  targetRemoved(target: SDK.Target.Target): void {
    const index = this.listItems.indexOf(target);
    if (index === -1) {
      return;
    }
    this.listItems.remove(index);
    this.#toolbarItem.setVisible(this.listItems.length > 1);
  }

  #targetComparator() {
    return (a: SDK.Target.Target, b: SDK.Target.Target) => {
      const aTargetInfo = a.targetInfo();
      const bTargetInfo = b.targetInfo();
      if (!aTargetInfo || !bTargetInfo) {
        return 0;
      }

      if (!aTargetInfo.subtype?.length && bTargetInfo.subtype?.length) {
        return -1;
      }
      if (aTargetInfo.subtype?.length && !bTargetInfo.subtype?.length) {
        return 1;
      }
      return aTargetInfo.url.localeCompare(bTargetInfo.url);
    };
  }

  #onTargetInfoChanged(event: Common.EventTarget.EventTargetEvent<Protocol.Target.TargetInfo>): void {
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const target = targetManager.targetById(event.data.targetId);
    if (!target || target.outermostTarget() !== target) {
      return;
    }
    this.targetRemoved(target);
    this.targetAdded(target);
  }

  #onInspectedURLChanged(event: Common.EventTarget.EventTargetEvent<SDK.Target.Target>): void {
    const target = event.data;
    if (!target || target.outermostTarget() !== target) {
      return;
    }
    this.targetRemoved(target);
    this.targetAdded(target);
  }

  #targetChanged({
    data: target,
  }: Common.EventTarget.EventTargetEvent<SDK.Target.Target|null>): void {
    this.#dropDown.selectItem(target?.outermostTarget() || null);
  }

  createElementForItem(item: SDK.Target.Target): Element {
    const element = document.createElement('div');
    element.classList.add('target');
    const shadowRoot = UI.UIUtils.createShadowRootWithCoreStyles(
        element, {cssFile: [outermostTargetSelectorStyles], delegatesFocus: undefined});
    const title = shadowRoot.createChild('div', 'title');
    UI.UIUtils.createTextChild(title, Platform.StringUtilities.trimEndWithMaxLength(this.titleFor(item), 100));
    const subTitle = shadowRoot.createChild('div', 'subtitle');
    UI.UIUtils.createTextChild(subTitle, this.#subtitleFor(item));
    return element;
  }

  #subtitleFor(target: SDK.Target.Target): string {
    const targetInfo = target.targetInfo();
    if (target === SDK.TargetManager.TargetManager.instance().primaryPageTarget() && targetInfo) {
      return Bindings.ResourceUtils.displayNameForURL(targetInfo.url as Platform.DevToolsPath.UrlString);
    }
    return target.targetInfo()?.subtype || '';
  }

  isItemSelectable(_item: SDK.Target.Target): boolean {
    return true;
  }

  itemSelected(item: SDK.Target.Target|null): void {
    const title =
        item ? i18nString(UIStrings.targetS, {PH1: this.titleFor(item)}) : i18nString(UIStrings.targetNotSelected);
    this.#toolbarItem.setTitle(title);
    if (item && item !== UI.Context.Context.instance().flavor(SDK.Target.Target)?.outermostTarget()) {
      UI.Context.Context.instance().setFlavor(SDK.Target.Target, item);
    }
  }
}
