// Copyright 2021 The Chromium Authors
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
import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as SourceMapScopes from '../../models/source_map_scopes/source_map_scopes.js';
import * as StackTrace from '../../models/stack_trace/stack_trace.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, nothing, render, type TemplateResult} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import scopeChainSidebarPaneStyles from './scopeChainSidebarPane.css.js';

const UIStrings = {
  /**
   * @description Loading indicator in the scope sidebar of the Sources panel.
   */
  loading: 'Loading…',
  /**
   * @description Not paused message element text content in the call stack sidebar of the Sources panel.
   */
  notPaused: 'Not paused',
  /**
   * @description Empty placeholder in the scope chain sidebar of the Sources panel.
   */
  noVariables: 'No variables',
  /**
   * @description Text in the scope sidebar of the Sources panel describing a closure scope.
   * @example {func} PH1
   */
  closureS: 'Closure ({PH1})',
  /**
   * @description Text that refers to closure as a programming term.
   */
  closure: 'Closure',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/sources/ScopeChainSidebarPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let scopeChainSidebarPaneInstance: ScopeChainSidebarPane;

interface ViewInput {
  linkifier: Components.Linkifier.Linkifier;
  isPaused: boolean;
  scopeChain: Array<{
    scope: SDK.DebuggerModel.ScopeChainEntry,
    objectTree: ObjectUI.ObjectPropertiesSection.ObjectTree,
  }>|null;
  onToggle: (objectTree: ObjectUI.ObjectPropertiesSection.ObjectTree, expanded: boolean) => void;
  onContextMenu: (
      objectTree: ObjectUI.ObjectPropertiesSection.ObjectTree,
      contextMenu: UI.ContextMenu.ContextMenu,
      ) => void;
}
type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export const DEFAULT_VIEW: View = (input, output, target) => {
  const createScopeSection = ({scope, objectTree}: {
    scope: SDK.DebuggerModel.ScopeChainEntry,
    objectTree: ObjectUI.ObjectPropertiesSection.ObjectTree,
  }): TemplateResult => {
    let emptyPlaceholder: Common.UIString.LocalizedString|null = null;
    if (scope.type() === Protocol.Debugger.ScopeType.Local || scope.type() === Protocol.Debugger.ScopeType.Closure) {
      emptyPlaceholder = i18nString(UIStrings.noVariables);
    }
    const icon = scope.icon();
    const {title, subtitle} = scopeTitle(scope);

    // clang-format off
    return html`
          <li role="treeitem"
              class="scope-chain-sidebar-pane-section"
              aria-label=${title}
              ?open=${objectTree.expanded}
              @expand=${(e: Event) => {
                const customEvent = e as UI.TreeOutline.TreeViewElement.ExpandEvent;
                input.onToggle(objectTree, customEvent.detail.expanded);
              }}
              @contextmenu=${(e: Event) => {
                const contextMenu = new UI.ContextMenu.ContextMenu(e);
                input.onContextMenu(objectTree, contextMenu);
                void contextMenu.show();
              }}>
            <div class="scope-chain-sidebar-pane-section-header"
                 @click=${() => {
                   input.onToggle(objectTree, !objectTree.expanded);
                 }}>
              ${icon ? html`<img class="scope-chain-sidebar-pane-section-icon" src=${icon}>` : nothing}
              <div class="scope-chain-sidebar-pane-section-title">${title}</div>
              <div class="scope-chain-sidebar-pane-section-subtitle">${subtitle}</div>
            </div>

            ${objectTree.expanded
              ?  ObjectUI.ObjectPropertiesSection.renderObjectTree(objectTree, input.linkifier, emptyPlaceholder)
              : html`<ul role="group"></ul>`}
          </li>`;
    // clang-format on
  };

  render(
      // clang-format off
      html`
    <style>${scopeChainSidebarPaneStyles}</style>
    ${input.scopeChain ? html`
      <devtools-tree autofocus hide-overflow show-selection-on-keyboard-focus .template=${
            html`<ul role=tree class="source-code object-properties-section">
          <style>${ObjectUI.ObjectPropertiesSection.objectValueStyles}</style>
          <style>${ObjectUI.ObjectPropertiesSection.objectPropertiesSectionStyles}</style>
          <style>${scopeChainSidebarPaneStyles}</style>
          ${input.scopeChain?.map(item => createScopeSection(item)) ?? nothing}
        </ul>`}>
      </devtools-tree>` : html`
      <div class=gray-info-message tabindex=-1>${
          input.isPaused ? i18nString(UIStrings.loading) : i18nString(UIStrings.notPaused)}</div>`}
    `,
      // clang-format on
      target);
};

function scopeTitle(scope: SDK.DebuggerModel.ScopeChainEntry): {title: string, subtitle: string|null} {
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
  return {title, subtitle};
}

function scopeKey(scope: SDK.DebuggerModel.ScopeChainEntry): string {
  let title = scope.typeName();
  if (scope.type() === Protocol.Debugger.ScopeType.Closure) {
    const scopeName = scope.name();
    if (scopeName) {
      title = `Closure: ${UI.UIUtils.beautifyFunctionName(scopeName)}`;
    } else {
      title = 'Closure';
    }
  }
  let subtitle: string|null = scope.description();
  if (!title || title === subtitle) {
    subtitle = null;
  }
  return title + (subtitle ? ':' + subtitle : '');
}
export class ScopeChainSidebarPane extends UI.Widget.VBox implements UI.ContextFlavorListener.ContextFlavorListener {
  readonly #linkifier: Components.Linkifier.Linkifier;
  #expansionTrackers = new Map<string, ObjectUI.ObjectPropertiesSection.ObjectTreeExpansionTracker>();
  #scopeChainModel: SourceMapScopes.ScopeChainModel.ScopeChainModel|null = null;
  #scopeChain:
      Array<{scope: SDK.DebuggerModel.ScopeChainEntry, objectTree: ObjectUI.ObjectPropertiesSection.ObjectTree}>|null =
          null;
  #view: View;

  constructor(target?: HTMLElement, view = DEFAULT_VIEW) {
    super(target, {
      jslog: `${VisualLogging.section('sources.scope-chain')}`,
      useShadowDom: true,
    });

    this.#linkifier = new Components.Linkifier.Linkifier();
    this.flavorChanged(UI.Context.Context.instance().flavor(StackTrace.StackTrace.DebuggableFrameFlavor));
    this.#view = view;
  }

  static instance(): ScopeChainSidebarPane {
    if (!scopeChainSidebarPaneInstance) {
      scopeChainSidebarPaneInstance = new ScopeChainSidebarPane();
    }
    return scopeChainSidebarPaneInstance;
  }

  flavorChanged(callFrame: StackTrace.StackTrace.DebuggableFrameFlavor|null): void {
    this.#scopeChainModel?.dispose();
    this.#scopeChainModel = null;
    this.#scopeChain = null;

    this.#linkifier.reset();

    if (callFrame) {
      const scopeChainModel = new SourceMapScopes.ScopeChainModel.ScopeChainModel(
          callFrame.sdkFrame, Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance());
      this.#scopeChainModel = scopeChainModel;
      this.#scopeChainModel.addEventListener(SourceMapScopes.ScopeChainModel.Events.SCOPE_CHAIN_UPDATED, event => {
        if (this.#scopeChainModel === scopeChainModel) {
          this.#buildScopeChain(event.data);
        }
      });
    }

    this.requestUpdate();
  }

  override performUpdate(): void {
    this.#view({
      linkifier: this.#linkifier,
      isPaused: Boolean(this.#scopeChainModel),
      scopeChain: this.#scopeChain,
      onToggle: (objectTree: ObjectUI.ObjectPropertiesSection.ObjectTree, expanded: boolean) => {
        objectTree.expanded = expanded;
        this.requestUpdate();
      },
      onContextMenu: (
          objectTree: ObjectUI.ObjectPropertiesSection.ObjectTree,
          contextMenu: UI.ContextMenu.ContextMenu,
          ) => {
        ObjectUI.ObjectPropertiesSection.populateObjectTreeContextMenu(
            contextMenu,
            objectTree,
            async () => {
              await objectTree.expandRecursively(ObjectUI.ObjectPropertiesSection.EXPANDABLE_MAX_DEPTH);
              this.requestUpdate();
            },
            () => {
              objectTree.collapseRecursively();
              this.requestUpdate();
            },
            () => {
              objectTree.sortPropertiesAlphabetically = !objectTree.sortPropertiesAlphabetically;
              this.requestUpdate();
            },
            () => {
              objectTree.includeNullOrUndefinedValues = !objectTree.includeNullOrUndefinedValues;
              this.requestUpdate();
            },
        );
      },
    },
               {}, this.contentElement);
  }

  #buildScopeChain({scopeChain}: SourceMapScopes.ScopeChainModel.ScopeChain): void {
    const oldExpansionTrackers = this.#expansionTrackers;
    this.#expansionTrackers = new Map();
    this.#scopeChain = [];

    for (const scope of scopeChain) {
      const key = scopeKey(scope);
      let expansionTracker = this.#expansionTrackers.get(key);
      if (!expansionTracker) {
        expansionTracker =
            oldExpansionTrackers.get(key) ?? new ObjectUI.ObjectPropertiesSection.ObjectTreeExpansionTracker();
        this.#expansionTrackers.set(key, expansionTracker);
      }

      const objectTree = new ObjectUI.ObjectPropertiesSection.ObjectTree(scope.object(), {
        propertiesMode: ObjectUI.ObjectPropertiesSection.ObjectPropertiesMode.ALL,
        readOnly: false,
        expansionTracker,
      });
      objectTree.addEventListener(ObjectUI.ObjectPropertiesSection.ObjectTreeNodeBase.Events.CHILDREN_CHANGED, () => {
        this.requestUpdate();
      });
      void expansionTracker.apply(objectTree);
      objectTree.addExtraProperties(...scope.extraProperties());
      if (scope.type() === Protocol.Debugger.ScopeType.Global) {
        objectTree.expanded = false;
      }

      this.#scopeChain.push({scope, objectTree});
    }

    for (const {scope, objectTree} of this.#scopeChain) {
      if (scope.type() !== Protocol.Debugger.ScopeType.Global) {
        objectTree.expanded = true;
      }
      if (scope.type() === Protocol.Debugger.ScopeType.Local) {
        break;
      }
    }

    this.requestUpdate();
    void this.updateComplete.then(() => this.sidebarPaneUpdatedForTest());
  }

  /**
   * @deprecated Hook for legacy web tests
   */
  sidebarPaneUpdatedForTest(): void {
  }
}
