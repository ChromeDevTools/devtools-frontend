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
   * @description Text in the bottom toolbar of the Sources panel that lists the source mapped origin scripts.
   * @example {bundle.min.js} PH1
   */
  fromS: '(From {PH1})',
  /**
   * @description Tooltip text for links in the bottom toolbar of the Sources panel that point to source mapped scripts.
   * @example {bundle.min.js} PH1
   */
  sourceMappedFromS: '(Source mapped from {PH1})',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/ResourceOriginPlugin.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class ResourceOriginPlugin extends Plugin {
  static override accepts(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean {
    const contentType = uiSourceCode.contentType();
    return contentType.hasScripts() || contentType.isFromSourceMap();
  }

  override rightToolbarItems(): UI.Toolbar.ToolbarItem[] {
    const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();

    // Handle source mapped scripts and stylesheets.
    if (this.uiSourceCode.contentType().isFromSourceMap()) {
      const links = [];
      for (const script of debuggerWorkspaceBinding.scriptsForUISourceCode(this.uiSourceCode)) {
        const uiSourceCode = debuggerWorkspaceBinding.uiSourceCodeForScript(script);
        if (!uiSourceCode) {
          continue;
        }
        const url = uiSourceCode.url();
        const text = Bindings.ResourceUtils.displayNameForURL(url);
        const title = i18nString(UIStrings.sourceMappedFromS, {PH1: text});
        links.push(Components.Linkifier.Linkifier.linkifyRevealable(uiSourceCode, text, url, title));
      }
      for (const originURL of Bindings.SASSSourceMapping.SASSSourceMapping.uiSourceOrigin(this.uiSourceCode)) {
        links.push(Components.Linkifier.Linkifier.linkifyURL(originURL));
      }
      if (links.length === 0) {
        return [];
      }
      const element = document.createElement('span');
      links.forEach((link, index) => {
        if (index > 0) {
          element.append(', ');
        }
        element.append(link);
      });
      return [new UI.Toolbar.ToolbarItem(i18n.i18n.getFormatLocalizedString(str_, UIStrings.fromS, {PH1: element}))];
    }

    // Handle anonymous scripts with an originStackTrace.
    for (const script of debuggerWorkspaceBinding.scriptsForUISourceCode(this.uiSourceCode)) {
      if (script.originStackTrace) {
        const link = linkifier.linkifyStackTraceTopFrame(script.debuggerModel.target(), script.originStackTrace);
        return [new UI.Toolbar.ToolbarItem(i18n.i18n.getFormatLocalizedString(str_, UIStrings.fromS, {PH1: link}))];
      }
    }

    return [];
  }
}

export const linkifier = new Components.Linkifier.Linkifier();
