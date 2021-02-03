// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */
import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';
import * as Snippets from '../snippets/snippets.js';
import * as UI from '../ui/ui.js';
import * as Workspace from '../workspace/workspace.js';
import * as WorkspaceDiff from '../workspace_diff/workspace_diff.js';

export const UIStrings = {
  /**
  *@description Name of an item from source map
  *@example {compile.html} PH1
  */
  sFromSourceMap: '{PH1} (from source map)',
};
const str_ = i18n.i18n.registerUIStrings('changes/ChangesSidebar.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class ChangesSidebar extends UI.Widget.Widget {
  _treeoutline: UI.TreeOutline.TreeOutlineInShadow;
  _treeElements: Map<Workspace.UISourceCode.UISourceCode, UISourceCodeTreeElement>;
  _workspaceDiff: WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl;
  constructor(workspaceDiff: WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl) {
    super();
    this._treeoutline = new UI.TreeOutline.TreeOutlineInShadow();
    this._treeoutline.setFocusable(false);
    this._treeoutline.registerRequiredCSS('changes/changesSidebar.css', {enableLegacyPatching: true});
    this._treeoutline.setComparator((a, b) => Platform.StringUtilities.compare(a.titleAsText(), b.titleAsText()));
    this._treeoutline.addEventListener(UI.TreeOutline.Events.ElementSelected, this._selectionChanged, this);
    UI.ARIAUtils.markAsTablist(this._treeoutline.contentElement);

    this.element.appendChild(this._treeoutline.element);

    this._treeElements = new Map();
    this._workspaceDiff = workspaceDiff;
    this._workspaceDiff.modifiedUISourceCodes().forEach(this._addUISourceCode.bind(this));
    this._workspaceDiff.addEventListener(
        WorkspaceDiff.WorkspaceDiff.Events.ModifiedStatusChanged, this._uiSourceCodeMofiedStatusChanged, this);
  }

  selectUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode, omitFocus?: boolean|undefined): void {
    const treeElement = this._treeElements.get(uiSourceCode);
    if (!treeElement) {
      return;
    }
    treeElement.select(omitFocus);
  }

  selectedUISourceCode(): Workspace.UISourceCode.UISourceCode|null {
    // @ts-ignore uiSourceCode seems to be dynamically attached.
    return this._treeoutline.selectedTreeElement ? this._treeoutline.selectedTreeElement.uiSourceCode : null;
  }

  _selectionChanged(): void {
    this.dispatchEventToListeners(Events.SelectedUISourceCodeChanged);
  }

  _uiSourceCodeMofiedStatusChanged(event: Common.EventTarget.EventTargetEvent): void {
    if (event.data.isModified) {
      this._addUISourceCode(event.data.uiSourceCode);
    } else {
      this._removeUISourceCode(event.data.uiSourceCode);
    }
  }

  _removeUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    const treeElement = this._treeElements.get(uiSourceCode);
    this._treeElements.delete(uiSourceCode);
    if (this._treeoutline.selectedTreeElement === treeElement) {
      const nextElementToSelect = treeElement.previousSibling || treeElement.nextSibling;
      if (nextElementToSelect) {
        nextElementToSelect.select(true);
      } else {
        treeElement.deselect();
        this._selectionChanged();
      }
    }
    if (treeElement) {
      this._treeoutline.removeChild(treeElement);
      treeElement.dispose();
    }
    if (this._treeoutline.rootElement().childCount() === 0) {
      this._treeoutline.setFocusable(false);
    }
  }

  _addUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    const treeElement = new UISourceCodeTreeElement(uiSourceCode);
    this._treeElements.set(uiSourceCode, treeElement);
    this._treeoutline.setFocusable(true);
    this._treeoutline.appendChild(treeElement);
    if (!this._treeoutline.selectedTreeElement) {
      treeElement.select(true);
    }
  }
}

export const enum Events {
  SelectedUISourceCodeChanged = 'SelectedUISourceCodeChanged',
}

export class UISourceCodeTreeElement extends UI.TreeOutline.TreeElement {
  uiSourceCode: Workspace.UISourceCode.UISourceCode;
  _eventListeners: Common.EventTarget.EventDescriptor[];
  constructor(uiSourceCode: Workspace.UISourceCode.UISourceCode) {
    super();
    this.uiSourceCode = uiSourceCode;
    this.listItemElement.classList.add('navigator-' + uiSourceCode.contentType().name() + '-tree-item');
    UI.ARIAUtils.markAsTab(this.listItemElement);

    let iconType: 'largeicon-navigator-snippet'|'largeicon-navigator-file' = 'largeicon-navigator-file';
    if (Snippets.ScriptSnippetFileSystem.isSnippetsUISourceCode(this.uiSourceCode)) {
      iconType = 'largeicon-navigator-snippet';
    }
    const defaultIcon = UI.Icon.Icon.create(iconType, 'icon');
    this.setLeadingIcons([defaultIcon]);

    this._eventListeners = [
      uiSourceCode.addEventListener(Workspace.UISourceCode.Events.TitleChanged, this._updateTitle, this),
      uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged, this._updateTitle, this),
      uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted, this._updateTitle, this),
    ];

    this._updateTitle();
  }

  _updateTitle(): void {
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
    Common.EventTarget.EventTarget.removeEventListeners(this._eventListeners);
  }
}
