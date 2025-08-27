// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-imperative-dom-api */

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as WorkspaceDiff from '../../models/workspace_diff/workspace_diff.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as UI from '../../ui/legacy/legacy.js';
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

export class ChangesSidebar extends Common.ObjectWrapper.eventMixin<EventTypes, typeof UI.Widget.Widget>(
    UI.Widget.Widget) {
  private treeoutline: UI.TreeOutline.TreeOutlineInShadow;
  private readonly treeElements: Map<Workspace.UISourceCode.UISourceCode, UISourceCodeTreeElement>;
  private readonly workspaceDiff: WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl;
  constructor(workspaceDiff: WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl) {
    super({jslog: `${VisualLogging.pane('sidebar').track({resize: true})}`});

    this.treeoutline = new UI.TreeOutline.TreeOutlineInShadow(UI.TreeOutline.TreeVariant.NAVIGATION_TREE);
    this.treeoutline.registerRequiredCSS(changesSidebarStyles);
    this.treeoutline.setFocusable(false);
    this.treeoutline.setHideOverflow(true);
    this.treeoutline.addEventListener(UI.TreeOutline.Events.ElementSelected, this.selectionChanged, this);
    UI.ARIAUtils.markAsTablist(this.treeoutline.contentElement);

    this.element.appendChild(this.treeoutline.element);

    this.treeElements = new Map();
    this.workspaceDiff = workspaceDiff;
    this.workspaceDiff.modifiedUISourceCodes().forEach(this.addUISourceCode.bind(this));
    this.workspaceDiff.addEventListener(
        WorkspaceDiff.WorkspaceDiff.Events.MODIFIED_STATUS_CHANGED, this.uiSourceCodeModifiedStatusChanged, this);
  }

  selectedUISourceCode(): Workspace.UISourceCode.UISourceCode|null {
    // @ts-expect-error uiSourceCode seems to be dynamically attached.
    return this.treeoutline.selectedTreeElement ? this.treeoutline.selectedTreeElement.uiSourceCode : null;
  }

  private selectionChanged(): void {
    this.dispatchEventToListeners(Events.SELECTED_UI_SOURCE_CODE_CHANGED);
  }

  private uiSourceCodeModifiedStatusChanged(
      event: Common.EventTarget.EventTargetEvent<WorkspaceDiff.WorkspaceDiff.ModifiedStatusChangedEvent>): void {
    if (event.data.isModified) {
      this.addUISourceCode(event.data.uiSourceCode);
    } else {
      this.removeUISourceCode(event.data.uiSourceCode);
    }
  }

  private removeUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    const treeElement = this.treeElements.get(uiSourceCode);
    this.treeElements.delete(uiSourceCode);
    if (this.treeoutline.selectedTreeElement === treeElement) {
      const nextElementToSelect = treeElement.previousSibling || treeElement.nextSibling;
      if (nextElementToSelect) {
        nextElementToSelect.select(true);
      } else {
        treeElement.deselect();
        this.selectionChanged();
      }
    }
    if (treeElement) {
      this.treeoutline.removeChild(treeElement);
      treeElement.dispose();
    }
    if (this.treeoutline.rootElement().childCount() === 0) {
      this.treeoutline.setFocusable(false);
    }
  }

  private addUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    const treeElement = new UISourceCodeTreeElement(uiSourceCode);
    this.treeElements.set(uiSourceCode, treeElement);
    this.treeoutline.setFocusable(true);
    this.treeoutline.appendChild(treeElement);
  }
}

export const enum Events {
  SELECTED_UI_SOURCE_CODE_CHANGED = 'SelectedUISourceCodeChanged',
}

export interface EventTypes {
  [Events.SELECTED_UI_SOURCE_CODE_CHANGED]: void;
}

export class UISourceCodeTreeElement extends UI.TreeOutline.TreeElement {
  uiSourceCode: Workspace.UISourceCode.UISourceCode;
  private readonly eventListeners: Common.EventTarget.EventDescriptor[];
  constructor(uiSourceCode: Workspace.UISourceCode.UISourceCode) {
    super();
    this.uiSourceCode = uiSourceCode;
    this.listItemElement.classList.add('navigator-' + uiSourceCode.contentType().name() + '-tree-item');
    UI.ARIAUtils.markAsTab(this.listItemElement);

    let iconName: 'document'|'snippet' = 'document';
    if (Snippets.ScriptSnippetFileSystem.isSnippetsUISourceCode(this.uiSourceCode)) {
      iconName = 'snippet';
    }
    const defaultIcon = IconButton.Icon.create(iconName);
    this.setLeadingIcons([defaultIcon]);

    this.eventListeners = [
      uiSourceCode.addEventListener(Workspace.UISourceCode.Events.TitleChanged, this.updateTitle, this),
      uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged, this.updateTitle, this),
      uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted, this.updateTitle, this),
    ];

    this.updateTitle();
  }

  private updateTitle(): void {
    let titleText: string = this.uiSourceCode.displayName();
    if (this.uiSourceCode.isDirty()) {
      titleText = '*' + titleText;
    }
    this.title = titleText;

    let tooltip: Common.UIString.LocalizedString|string = this.uiSourceCode.url();
    if (this.uiSourceCode.contentType().isFromSourceMap()) {
      tooltip = i18nString(UIStrings.sFromSourceMap, {PH1: this.uiSourceCode.displayName()});
    }
    this.tooltip = tooltip;
  }

  dispose(): void {
    Common.EventTarget.removeEventListeners(this.eventListeners);
  }
}
