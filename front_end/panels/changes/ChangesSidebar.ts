// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as WorkspaceDiff from '../../models/workspace_diff/workspace_diff.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as Snippets from '../snippets/snippets.js';

import changesSidebarStyles from './changesSidebar.css.js';

const UIStrings = {
  /**
   * @description Name of an item from source map
   * @example {compile.html} PH1
   */
  sFromSourceMap: '{PH1} (from source map)',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/changes/ChangesSidebar.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const {render, html, Directives: {ref}} = Lit;
interface ViewInput {
  selectedSourceCode: Workspace.UISourceCode.UISourceCode|null;
  onSelect: (uiSourceCode: Workspace.UISourceCode.UISourceCode|null) => void;
  sourceCodes: Set<Workspace.UISourceCode.UISourceCode>;
}
type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export const DEFAULT_VIEW: View = (input, output, target) => {
  const tooltip = (uiSourceCode: Workspace.UISourceCode.UISourceCode): string =>
      uiSourceCode.contentType().isFromSourceMap() ?
      i18nString(UIStrings.sFromSourceMap, {PH1: uiSourceCode.displayName()}) :
      uiSourceCode.url();
  const icon = (uiSourceCode: Workspace.UISourceCode.UISourceCode): string =>
      Snippets.ScriptSnippetFileSystem.isSnippetsUISourceCode(uiSourceCode) ? 'snippet' : 'document';
  const configElements = new WeakMap<HTMLLIElement, Workspace.UISourceCode.UISourceCode>();
  const onSelect = (e: UI.TreeOutline.TreeViewElement.SelectEvent): void =>
      input.onSelect(configElements.get(e.detail) ?? null);
  render(
      // clang-format off
      html`<devtools-tree
             @selected=${onSelect}
             navigation-variant
             hide-overflow .template=${html`
               <ul role="tree">
                 ${input.sourceCodes.values().map(uiSourceCode => html`
                   <li
                     role="treeitem"
                     ${ref(e => e instanceof HTMLLIElement && configElements.set(e, uiSourceCode))}
                     ?selected=${uiSourceCode === input.selectedSourceCode}>
                       <style>${changesSidebarStyles}</style>
                       <div class=${'navigator-' + uiSourceCode.contentType().name() + '-tree-item'}>
                         <devtools-icon name=${icon(uiSourceCode)}></devtools-icon>
                         <span title=${tooltip(uiSourceCode)}>
                           <span ?hidden=${!uiSourceCode.isDirty()}>*</span>
                           ${uiSourceCode.displayName()}
                         </span>
                       </div>
                   </li>`)}
               </ul>`}></devtools-tree>`,
      // clang-format on
      target);
};

export class ChangesSidebar extends Common.ObjectWrapper.eventMixin<EventTypes, typeof UI.Widget.Widget>(
    UI.Widget.Widget) {
  #workspaceDiff: WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl|null = null;
  readonly #view: View;
  readonly #sourceCodes = new Set<Workspace.UISourceCode.UISourceCode>();
  #selectedUISourceCode: Workspace.UISourceCode.UISourceCode|null = null;
  constructor(target?: HTMLElement, view = DEFAULT_VIEW) {
    super(target, {jslog: `${VisualLogging.pane('sidebar').track({resize: true})}`});
    this.#view = view;
  }

  set workspaceDiff(workspaceDiff: WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl) {
    if (this.#workspaceDiff) {
      this.#workspaceDiff.modifiedUISourceCodes().forEach(this.#removeUISourceCode.bind(this));
      this.#workspaceDiff.removeEventListener(
          WorkspaceDiff.WorkspaceDiff.Events.MODIFIED_STATUS_CHANGED, this.uiSourceCodeModifiedStatusChanged, this);
    }
    this.#workspaceDiff = workspaceDiff;
    this.#workspaceDiff.modifiedUISourceCodes().forEach(this.#addUISourceCode.bind(this));
    this.#workspaceDiff.addEventListener(
        WorkspaceDiff.WorkspaceDiff.Events.MODIFIED_STATUS_CHANGED, this.uiSourceCodeModifiedStatusChanged, this);
    this.requestUpdate();
  }

  selectedUISourceCode(): Workspace.UISourceCode.UISourceCode|null {
    return this.#selectedUISourceCode;
  }

  override performUpdate(): void {
    const input: ViewInput = {
      onSelect: uiSourceCode => this.#selectionChanged(uiSourceCode),
      sourceCodes: this.#sourceCodes,
      selectedSourceCode: this.#selectedUISourceCode
    };
    this.#view(input, {}, this.contentElement);
  }

  #selectionChanged(selectedUISourceCode: Workspace.UISourceCode.UISourceCode|null): void {
    this.#selectedUISourceCode = selectedUISourceCode;
    this.dispatchEventToListeners(Events.SELECTED_UI_SOURCE_CODE_CHANGED);
    this.requestUpdate();
  }

  #addUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    this.#sourceCodes.add(uiSourceCode);
    uiSourceCode.addEventListener(Workspace.UISourceCode.Events.TitleChanged, this.requestUpdate, this);
    uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged, this.requestUpdate, this);
    uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted, this.requestUpdate, this);
    this.requestUpdate();
  }

  #removeUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    uiSourceCode.removeEventListener(Workspace.UISourceCode.Events.TitleChanged, this.requestUpdate, this);
    uiSourceCode.removeEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged, this.requestUpdate, this);
    uiSourceCode.removeEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted, this.requestUpdate, this);
    if (uiSourceCode === this.#selectedUISourceCode) {
      let newSelection;
      for (const sourceCode of this.#sourceCodes.values()) {
        if (sourceCode === uiSourceCode) {
          break;
        }
        newSelection = sourceCode;
      }
      this.#sourceCodes.delete(uiSourceCode);
      this.#selectionChanged(newSelection ?? this.#sourceCodes.values().next().value ?? null);
    } else {
      this.#sourceCodes.delete(uiSourceCode);
    }
    this.requestUpdate();
  }

  private uiSourceCodeModifiedStatusChanged(
      event: Common.EventTarget.EventTargetEvent<WorkspaceDiff.WorkspaceDiff.ModifiedStatusChangedEvent>): void {
    const {isModified, uiSourceCode} = event.data;
    if (isModified) {
      this.#addUISourceCode(uiSourceCode);
    } else {
      this.#removeUISourceCode(uiSourceCode);
    }
    this.requestUpdate();
  }
}

export const enum Events {
  SELECTED_UI_SOURCE_CODE_CHANGED = 'SelectedUISourceCodeChanged',
}

export interface EventTypes {
  [Events.SELECTED_UI_SOURCE_CODE_CHANGED]: void;
}
