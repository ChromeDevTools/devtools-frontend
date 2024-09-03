// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * Copyright (C) 2008 Apple Inc. All Rights Reserved.
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as SourceMapScopes from '../../models/source_map_scopes/source_map_scopes.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import scopeChainSidebarPaneStyles from './scopeChainSidebarPane.css.js';

const UIStrings = {
  /**
   *@description Loading indicator in Scope Sidebar Pane of the Sources panel
   */
  loading: 'Loading...',
  /**
   *@description Not paused message element text content in Call Stack Sidebar Pane of the Sources panel
   */
  notPaused: 'Not paused',
  /**
   *@description Empty placeholder in Scope Chain Sidebar Pane of the Sources panel
   */
  noVariables: 'No variables',
  /**
   *@description Text in the Sources panel Scope pane describing a closure scope.
   *@example {func} PH1
   */
  closureS: 'Closure ({PH1})',
  /**
   *@description Text that refers to closure as a programming term
   */
  closure: 'Closure',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/ScopeChainSidebarPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let scopeChainSidebarPaneInstance: ScopeChainSidebarPane;

export class ScopeChainSidebarPane extends UI.Widget.VBox implements UI.ContextFlavorListener.ContextFlavorListener {
  private readonly treeOutline: ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionsTreeOutline;
  private readonly expandController: ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionsTreeExpandController;
  private readonly linkifier: Components.Linkifier.Linkifier;
  private infoElement: HTMLDivElement;
  #scopeChainModel: SourceMapScopes.ScopeChainModel.ScopeChainModel|null = null;

  private constructor() {
    super(true);

    this.contentElement.setAttribute('jslog', `${VisualLogging.section('sources.scope-chain')}`);
    this.treeOutline = new ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionsTreeOutline();
    this.treeOutline.hideOverflow();

    this.treeOutline.setShowSelectionOnKeyboardFocus(/* show */ true);
    this.expandController =
        new ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionsTreeExpandController(this.treeOutline);
    this.linkifier = new Components.Linkifier.Linkifier();
    this.infoElement = document.createElement('div');
    this.infoElement.className = 'gray-info-message';
    this.infoElement.tabIndex = -1;
    this.flavorChanged(UI.Context.Context.instance().flavor(SDK.DebuggerModel.CallFrame));
  }

  static instance(): ScopeChainSidebarPane {
    if (!scopeChainSidebarPaneInstance) {
      scopeChainSidebarPaneInstance = new ScopeChainSidebarPane();
    }
    return scopeChainSidebarPaneInstance;
  }

  flavorChanged(callFrame: SDK.DebuggerModel.CallFrame|null): void {
    this.#scopeChainModel?.dispose();
    this.#scopeChainModel = null;

    this.linkifier.reset();
    this.contentElement.removeChildren();
    this.contentElement.appendChild(this.infoElement);

    if (callFrame) {
      // Resolving the scope may take a while to complete, so indicate to the user that something
      // is happening (see https://crbug.com/1162416).
      this.infoElement.textContent = i18nString(UIStrings.loading);

      this.#scopeChainModel = new SourceMapScopes.ScopeChainModel.ScopeChainModel(callFrame);
      this.#scopeChainModel.addEventListener(
          SourceMapScopes.ScopeChainModel.Events.SCOPE_CHAIN_UPDATED, event => this.buildScopeTreeOutline(event.data),
          this);
    } else {
      this.infoElement.textContent = i18nString(UIStrings.notPaused);
    }
  }

  override focus(): void {
    if (this.hasFocus()) {
      return;
    }

    if (UI.Context.Context.instance().flavor(SDK.DebuggerModel.DebuggerPausedDetails)) {
      this.treeOutline.forceSelect();
    }
  }

  private buildScopeTreeOutline(eventScopeChain: SourceMapScopes.ScopeChainModel.ScopeChain): void {
    const {scopeChain} = eventScopeChain;

    this.treeOutline.removeChildren();

    this.contentElement.removeChildren();
    this.contentElement.appendChild(this.treeOutline.element);
    let foundLocalScope = false;
    for (const [i, scope] of scopeChain.entries()) {
      if (scope.type() === Protocol.Debugger.ScopeType.Local) {
        foundLocalScope = true;
      }

      const section = this.createScopeSectionTreeElement(scope);
      if (scope.type() === Protocol.Debugger.ScopeType.Global) {
        section.collapse();
      } else if (!foundLocalScope || scope.type() === Protocol.Debugger.ScopeType.Local) {
        section.expand();
      }

      this.treeOutline.appendChild(section);
      if (i === 0) {
        section.select(/* omitFocus */ true);
      }
    }
    this.sidebarPaneUpdatedForTest();
  }

  private createScopeSectionTreeElement(scope: SDK.DebuggerModel.ScopeChainEntry):
      ObjectUI.ObjectPropertiesSection.RootElement {
    let emptyPlaceholder: Common.UIString.LocalizedString|null = null;
    if (scope.type() === Protocol.Debugger.ScopeType.Local || scope.type() === Protocol.Debugger.ScopeType.Closure) {
      emptyPlaceholder = i18nString(UIStrings.noVariables);
    }

    let title = scope.typeName();
    if (scope.type() === Protocol.Debugger.ScopeType.Closure) {
      const scopeName = scope.name();
      if (scopeName) {
        title = i18nString(UIStrings.closureS, {PH1: UI.UIUtils.beautifyFunctionName(scopeName)});
      } else {
        title = i18nString(UIStrings.closure);
      }
    }
    let subtitle: string|null = scope.description();
    if (!title || title === subtitle) {
      subtitle = null;
    }
    const icon = scope.icon();

    const titleElement = document.createElement('div');
    titleElement.classList.add('scope-chain-sidebar-pane-section-header');
    titleElement.classList.add('tree-element-title');
    if (icon) {
      const iconElement = document.createElement('img');
      iconElement.classList.add('scope-chain-sidebar-pane-section-icon');
      iconElement.src = icon;
      titleElement.appendChild(iconElement);
    }
    titleElement.createChild('div', 'scope-chain-sidebar-pane-section-subtitle').textContent = subtitle;
    titleElement.createChild('div', 'scope-chain-sidebar-pane-section-title').textContent = title;

    const section = new ObjectUI.ObjectPropertiesSection.RootElement(
        scope.object(), this.linkifier, emptyPlaceholder, ObjectUI.ObjectPropertiesSection.ObjectPropertiesMode.ALL,
        scope.extraProperties());
    section.title = titleElement;
    section.listItemElement.classList.add('scope-chain-sidebar-pane-section');
    section.listItemElement.setAttribute('aria-label', title);
    this.expandController.watchSection(title + (subtitle ? ':' + subtitle : ''), section);

    return section;
  }

  private sidebarPaneUpdatedForTest(): void {
  }
  override wasShown(): void {
    super.wasShown();
    this.treeOutline.registerCSSFiles([scopeChainSidebarPaneStyles]);
    this.registerCSSFiles([scopeChainSidebarPaneStyles]);
  }
}
