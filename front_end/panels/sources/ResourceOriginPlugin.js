// Copyright 2018 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as i18n from '../../core/i18n/i18n.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as uiI18n from '../../ui/i18n/i18n.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Plugin } from './Plugin.js';
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
    #linkifier = new Components.Linkifier.Linkifier();
    static accepts(uiSourceCode) {
        const contentType = uiSourceCode.contentType();
        return contentType.hasScripts() || contentType.isFromSourceMap();
    }
    rightToolbarItems() {
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
                const title = i18nString(UIStrings.sourceMappedFromS, { PH1: text });
                links.push(Components.Linkifier.Linkifier.linkifyRevealable(uiSourceCode, text, url, title, undefined, 'original-script-location'));
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
            return [new UI.Toolbar.ToolbarItem(uiI18n.getFormatLocalizedString(str_, UIStrings.fromS, { PH1: element }))];
        }
        // Handle anonymous scripts with an originStackTrace.
        for (const script of debuggerWorkspaceBinding.scriptsForUISourceCode(this.uiSourceCode)) {
            if (script.originStackTrace?.callFrames.length) {
                const link = this.#linkifier.linkifyStackTraceTopFrame(script.debuggerModel.target(), script.originStackTrace);
                return [new UI.Toolbar.ToolbarItem(uiI18n.getFormatLocalizedString(str_, UIStrings.fromS, { PH1: link }))];
            }
        }
        return [];
    }
    dispose() {
        this.#linkifier.dispose();
    }
}
//# sourceMappingURL=ResourceOriginPlugin.js.map