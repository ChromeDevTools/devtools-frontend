// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */

import '../../ui/components/menus/menus.js';
import '../../ui/kit/kit.js';

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import type * as Menus from '../../ui/components/menus/menus.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import outermostTargetSelectorStyles from './outermostTargetSelector.css.js';

const UIStrings = {
  /**
   * @description Title of toolbar item in outermost target selector in the main toolbar.
   */
  targetNotSelected: 'Page: Not selected',
  /**
   * @description Title of toolbar item in outermost target selector in the main toolbar.
   * @example {top} PH1
   */
  targetS: 'Page: {PH1}',
} as const;
const str_ = i18n.i18n.registerUIStrings('entrypoints/inspector_main/OutermostTargetSelector.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class OutermostTargetSelector implements SDK.TargetManager.Observer, UI.Toolbar.Provider {
  readonly #targets: SDK.Target.Target[] = [];
  readonly #container = document.createElement('div');
  readonly #toolbarItem: UI.Toolbar.ToolbarItem;
  #selectedTarget: SDK.Target.Target|null = null;
  #open = false;

  constructor() {
    this.#toolbarItem = new UI.Toolbar.ToolbarItem(this.#container);
    this.#toolbarItem.setEnabled(false);

    const targetManager = SDK.TargetManager.TargetManager.instance();
    targetManager.addModelListener(
        SDK.ChildTargetManager.ChildTargetManager, SDK.ChildTargetManager.Events.TARGET_INFO_CHANGED,
        this.#onTargetInfoChanged, this);
    targetManager.addEventListener(SDK.TargetManager.Events.NAME_CHANGED, this.#onInspectedURLChanged, this);
    targetManager.observeTargets(this);

    UI.Context.Context.instance().addFlavorChangeListener(SDK.Target.Target, this.#targetChanged, this);
    this.#render();
  }

  #render(): void {
    const buttonTitle = this.#selectedTarget ? i18nString(UIStrings.targetS, {PH1: this.#selectedTarget.name()}) :
                                               i18nString(UIStrings.targetNotSelected);
    // clang-format off
    render(html`
      <style>${outermostTargetSelectorStyles}</style>
      <button
        id="outermost-target-selector-button"
        class="soft-dropdown toolbar-has-dropdown"
        type="button"
        jslog=${VisualLogging.dropDown('outermost-target-selector').track({click: true})}
        title=${buttonTitle}
        aria-label=${buttonTitle}
        aria-haspopup="true"
        aria-expanded=${this.#open}
        ?disabled=${this.#targets.length === 0}
        @click=${() => {
          if (this.#targets.length > 0) {
            this.#open = !this.#open;
            this.#render();
          }
        }}
        @keydown=${(event: KeyboardEvent) => {
          if (!this.#open && this.#targets.length > 0 && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.consume(true);
            this.#open = true;
            this.#render();
          }
        }}
      >
        <span class="title">${this.#selectedTarget?.name() ?? ''}</span>
        <devtools-icon name="triangle-down"></devtools-icon>
      </button>
      <devtools-menu
        origin="outermost-target-selector-button"
        .showDivider=${false}
        .showSelectedItem=${true}
        .open=${this.#open}
        @menucloserequest=${() => {
          if (this.#open) {
            this.#open = false;
            this.#render();
          }
        }}
        @menuitemselected=${(event: Menus.Menu.MenuItemSelectedEvent) => {
          this.#open = false;
          this.#selectTarget(this.#targets[Number(event.itemValue)] ?? null);
        }}
      >
        ${this.#targets.map((target, index) => html`
          <devtools-menu-item
            .value=${index}
            .selected=${target === this.#selectedTarget}
            jslog=${VisualLogging.item().track({click: true, resize: true})}
          >
            <div class="outermost-target-selector-item">
              <div class="title">${Platform.StringUtilities.trimEndWithMaxLength(target.name(), 100)}</div>
              <div class="subtitle">${this.#subtitleFor(target)}</div>
            </div>
          </devtools-menu-item>
        `)}
      </devtools-menu>`,
      this.#container);
    // clang-format on
  }

  item(): UI.Toolbar.ToolbarItem {
    return this.#toolbarItem;
  }

  targetAdded(target: SDK.Target.Target): void {
    if (target.outermostTarget() !== target) {
      return;
    }
    const insertIndex =
        Platform.ArrayUtilities.upperBound(this.#targets, target, this.#targetComparator(), 0, this.#targets.length);
    this.#targets.splice(insertIndex, 0, target);
    this.#toolbarItem.setEnabled(this.#targets.length > 0);
    this.#toolbarItem.setVisible(this.#targets.length > 1);

    const primaryTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (target === primaryTarget || target === UI.Context.Context.instance().flavor(SDK.Target.Target)) {
      this.#selectTarget(target);
    } else {
      this.#render();
    }
  }

  targetRemoved(target: SDK.Target.Target): void {
    const index = this.#targets.indexOf(target);
    if (index === -1) {
      return;
    }
    this.#targets.splice(index, 1);
    this.#toolbarItem.setEnabled(this.#targets.length > 0);
    this.#toolbarItem.setVisible(this.#targets.length > 1);
    if (this.#targets.length <= 1) {
      this.#open = false;
    }
    if (this.#selectedTarget === target) {
      this.#selectTarget(null);
    } else {
      this.#render();
    }
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
    this.#selectTarget(target?.outermostTarget() || null);
  }

  #subtitleFor(target: SDK.Target.Target): string {
    const targetInfo = target.targetInfo();
    if (target === SDK.TargetManager.TargetManager.instance().primaryPageTarget() && targetInfo) {
      return Bindings.ResourceUtils.displayNameForURL(targetInfo.url as Platform.DevToolsPath.UrlString);
    }
    return target.targetInfo()?.subtype || '';
  }

  #selectTarget(item: SDK.Target.Target|null): void {
    this.#selectedTarget = item;
    if (item && item !== UI.Context.Context.instance().flavor(SDK.Target.Target)?.outermostTarget()) {
      UI.Context.Context.instance().setFlavor(SDK.Target.Target, item);
    }
    this.#render();
  }
}
