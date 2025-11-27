// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/components/icon_button/icon_button.js';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import type * as Workspace from '../../models/workspace/workspace.js';
import {PanelUtils} from '../../panels/utils/utils.js';
import {Directives, html, type TemplateResult} from '../../ui/lit/lit.js';

import {FilteredUISourceCodeListProvider} from './FilteredUISourceCodeListProvider.js';
import {SourcesView} from './SourcesView.js';

const {styleMap} = Directives;

export class OpenFileQuickOpen extends FilteredUISourceCodeListProvider {
  constructor() {
    super('source-file');
  }

  override attach(): void {
    this.setDefaultScores(SourcesView.defaultUISourceCodeScores());
    super.attach();
  }

  override uiSourceCodeSelected(
      uiSourceCode: Workspace.UISourceCode.UISourceCode|null, lineNumber?: number, columnNumber?: number): void {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.SelectFileFromFilePicker);

    if (!uiSourceCode) {
      return;
    }
    if (typeof lineNumber === 'number') {
      void Common.Revealer.reveal(uiSourceCode.uiLocation(lineNumber, columnNumber));
    } else {
      void Common.Revealer.reveal(uiSourceCode);
    }
  }

  override filterProject(project: Workspace.Workspace.Project): boolean {
    return !project.isServiceProject();
  }

  override renderItem(itemIndex: number, query: string): TemplateResult {
    const {iconName, color} = PanelUtils.iconDataForResourceType(this.itemContentTypeAt(itemIndex));
    // clang-format off
    return html`
      <devtools-icon class="large" name=${iconName} style=${styleMap({color})}></devtools-icon>
      ${super.renderItem(itemIndex, query)}`;
    // clang-format on
  }
}
