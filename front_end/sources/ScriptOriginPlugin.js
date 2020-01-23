// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {Plugin} from './Plugin.js';

export class ScriptOriginPlugin extends Plugin {
  /**
   * @param {!SourceFrame.SourcesTextEditor} textEditor
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  constructor(textEditor, uiSourceCode) {
    super();
    this._textEditor = textEditor;
    this._uiSourceCode = uiSourceCode;
  }

  /**
   * @override
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {boolean}
   */
  static accepts(uiSourceCode) {
    return uiSourceCode.contentType().hasScripts() || !!ScriptOriginPlugin._script(uiSourceCode);
  }

  /**
   * @override
   * @return {!Promise<!Array<!UI.ToolbarItem>>}
   */
  async rightToolbarItems() {
    const originURL = Bindings.CompilerScriptMapping.uiSourceCodeOrigin(this._uiSourceCode);
    if (originURL) {
      const item = UI.formatLocalized('(source mapped from %s)', [Components.Linkifier.linkifyURL(originURL)]);
      return [new UI.ToolbarItem(item)];
    }

    // Handle anonymous scripts with an originStackTrace.
    const script = await ScriptOriginPlugin._script(this._uiSourceCode);
    if (!script || !script.originStackTrace) {
      return [];
    }
    const link = linkifier.linkifyStackTraceTopFrame(script.debuggerModel.target(), script.originStackTrace);
    return [new UI.ToolbarItem(link)];
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {!Promise<?SDK.Script>}
   */
  static async _script(uiSourceCode) {
    const locations = await self.Bindings.debuggerWorkspaceBinding.uiLocationToRawLocations(uiSourceCode, 0, 0);
    for (const location of locations) {
      const script = location.script();
      if (script && script.originStackTrace) {
        return script;
      }
    }
    return null;
  }
}

export const linkifier = new Components.Linkifier();
