// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Bindings from '../../models/bindings/bindings.js';
import type * as Workspace from '../../models/workspace/workspace.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';

import {Plugin} from './Plugin.js';

const UIStrings = {
  /**
   *@description Text in Resource Origin Plugin of the Sources panel
   *@example {example.com} PH1
   */
  sourceMappedFromS: '(source mapped from {PH1})',
  /**
   *@description Text in Resource Origin Plugin of the Sources panel
   *@example {http://localhost/file.wasm} PH1
   */
  providedViaDebugInfoByS: '(provided via debug info by {PH1})',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/ResourceOriginPlugin.ts', UIStrings);

export class ResourceOriginPlugin extends Plugin {
  static accepts(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean {
    const contentType = uiSourceCode.contentType();
    return contentType.hasScripts() || contentType.isFromSourceMap();
  }

  rightToolbarItems(): UI.Toolbar.ToolbarItem[] {
    const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();

    // Handle source mapped scripts and stylesheets.
    if (this.uiSourceCode.contentType().isFromSourceMap()) {
      if (debuggerWorkspaceBinding.pluginManager) {
        for (const originScript of debuggerWorkspaceBinding.pluginManager.scriptsForUISourceCode(this.uiSourceCode)) {
          if (originScript.sourceURL) {
            const item = i18n.i18n.getFormatLocalizedString(
                str_, UIStrings.providedViaDebugInfoByS,
                {PH1: Components.Linkifier.Linkifier.linkifyURL(originScript.sourceURL)});
            return [new UI.Toolbar.ToolbarItem(item)];
          }
        }
      }

      const items = [];
      for (const script of debuggerWorkspaceBinding.scriptsForUISourceCode(this.uiSourceCode)) {
        const uiSourceCode = debuggerWorkspaceBinding.uiSourceCodeForScript(script);
        if (!uiSourceCode) {
          continue;
        }
        const url = uiSourceCode.url();
        const text = Bindings.ResourceUtils.displayNameForURL(url);
        const title = text !== url ? url : undefined;
        const item = i18n.i18n.getFormatLocalizedString(
            str_, UIStrings.sourceMappedFromS,
            {PH1: Components.Linkifier.Linkifier.linkifyRevealable(uiSourceCode, text, url, title)});
        items.push(new UI.Toolbar.ToolbarItem(item));
      }
      for (const originURL of Bindings.SASSSourceMapping.SASSSourceMapping.uiSourceOrigin(this.uiSourceCode)) {
        const item = i18n.i18n.getFormatLocalizedString(
            str_, UIStrings.sourceMappedFromS, {PH1: Components.Linkifier.Linkifier.linkifyURL(originURL)});
        items.push(new UI.Toolbar.ToolbarItem(item));
      }
      return items;
    }

    // Handle anonymous scripts with an originStackTrace.
    for (const script of debuggerWorkspaceBinding.scriptsForUISourceCode(this.uiSourceCode)) {
      if (script.originStackTrace) {
        const link = linkifier.linkifyStackTraceTopFrame(script.debuggerModel.target(), script.originStackTrace);
        return [new UI.Toolbar.ToolbarItem(link)];
      }
    }

    return [];
  }
}

export const linkifier = new Components.Linkifier.Linkifier();
