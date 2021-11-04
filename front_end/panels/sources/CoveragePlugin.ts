// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Formatter from '../../models/formatter/formatter.js';
import type * as Workspace from '../../models/workspace/workspace.js';
import type * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Coverage from '../coverage/coverage.js';

import {Plugin} from './Plugin.js';

const UIStrings = {
  /**
  *@description Text for Coverage Status Bar Item in Sources Panel
  */
  clickToShowCoveragePanel: 'Click to show Coverage Panel',
  /**
  *@description Text for Coverage Status Bar Item in Sources Panel
  */
  showDetails: 'Show Details',
  /**
  *@description Text to show in the status bar if coverage data is available
  *@example {12.3} PH1
  */
  coverageS: 'Coverage: {PH1}',
  /**
  *@description Text to be shown in the status bar if no coverage data is available
  */
  coverageNa: 'Coverage: n/a',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/CoveragePlugin.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class CoveragePlugin extends Plugin {
  private uiSourceCode: Workspace.UISourceCode.UISourceCode;
  private originalSourceCode: Workspace.UISourceCode.UISourceCode;
  private infoInToolbar: UI.Toolbar.ToolbarButton;
  private model: Coverage.CoverageModel.CoverageModel|null|undefined;
  private coverage: Coverage.CoverageModel.URLCoverageInfo|null|undefined;

  constructor(
      _textEditor: SourceFrame.SourcesTextEditor.SourcesTextEditor, uiSourceCode: Workspace.UISourceCode.UISourceCode) {
    super();
    this.uiSourceCode = uiSourceCode;
    this.originalSourceCode =
        Formatter.SourceFormatter.SourceFormatter.instance().getOriginalUISourceCode(this.uiSourceCode);
    this.infoInToolbar = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.clickToShowCoveragePanel));
    this.infoInToolbar.setSecondary();
    this.infoInToolbar.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, () => {
      UI.ViewManager.ViewManager.instance().showView('coverage');
    });

    const mainTarget = SDK.TargetManager.TargetManager.instance().mainTarget();
    if (mainTarget) {
      this.model = mainTarget.model(Coverage.CoverageModel.CoverageModel);
      if (this.model) {
        this.model.addEventListener(Coverage.CoverageModel.Events.CoverageReset, this.handleReset, this);

        this.coverage = this.model.getCoverageForUrl(this.originalSourceCode.url());
        if (this.coverage) {
          this.coverage.addEventListener(
              Coverage.CoverageModel.URLCoverageInfo.Events.SizesChanged, this.handleCoverageSizesChanged, this);
        }
      }
    }

    this.updateStats();
  }

  dispose(): void {
    if (this.coverage) {
      this.coverage.removeEventListener(
          Coverage.CoverageModel.URLCoverageInfo.Events.SizesChanged, this.handleCoverageSizesChanged, this);
    }
    if (this.model) {
      this.model.removeEventListener(Coverage.CoverageModel.Events.CoverageReset, this.handleReset, this);
    }
  }

  static accepts(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean {
    return uiSourceCode.contentType().isDocumentOrScriptOrStyleSheet();
  }

  private handleReset(): void {
    this.coverage = null;
    this.updateStats();
  }

  private handleCoverageSizesChanged(): void {
    this.updateStats();
  }

  private updateStats(): void {
    if (this.coverage) {
      this.infoInToolbar.setTitle(i18nString(UIStrings.showDetails));
      const formatter = new Intl.NumberFormat(i18n.DevToolsLocale.DevToolsLocale.instance().locale, {
        style: 'percent',
        maximumFractionDigits: 1,
      });
      this.infoInToolbar.setText(
          i18nString(UIStrings.coverageS, {PH1: formatter.format(this.coverage.usedPercentage())}));
    } else {
      this.infoInToolbar.setTitle(i18nString(UIStrings.clickToShowCoveragePanel));
      this.infoInToolbar.setText(i18nString(UIStrings.coverageNa));
    }
  }

  async rightToolbarItems(): Promise<UI.Toolbar.ToolbarItem[]> {
    return [this.infoInToolbar];
  }
}
