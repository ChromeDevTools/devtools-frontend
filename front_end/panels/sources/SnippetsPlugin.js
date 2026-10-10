// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/kit/kit.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import * as UI from '../../ui/legacy/legacy.js';
import { html } from '../../ui/lit/lit.js';
import * as Snippets from '../snippets/snippets.js';
import { Plugin } from './Plugin.js';
const { bindToAction } = UI.UIUtils;
const UIStrings = {
    /**
     * @description Text in Snippets plugin of the Sources panel.
     */
    enter: '⌘+Enter',
    /**
     * @description Text in Snippets plugin of the Sources panel.
     */
    ctrlenter: 'Ctrl+Enter',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/SnippetsPlugin.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class SnippetsPlugin extends Plugin {
    static accepts(uiSourceCode) {
        return Snippets.ScriptSnippetFileSystem.isSnippetsUISourceCode(uiSourceCode);
    }
    rightToolbarItems() {
        const action = UI.ActionRegistry.ActionRegistry.instance().getAction('debugger.run-snippet');
        const text = Host.Platform.isMac() ? i18nString(UIStrings.enter) : i18nString(UIStrings.ctrlenter);
        // clang-format off
        return [html `<devtools-button
      class="toolbar-button"
      title=${action.title()}
      aria-label=${action.title()}
      .iconName=${'play'}
      .variant=${"text" /* Buttons.Button.Variant.TEXT */}
      .reducedFocusRing=${true}
      ${bindToAction('debugger.run-snippet')}
    >${text}</devtools-button>`];
        // clang-format on
    }
    editorExtension() {
        return TextEditor.JavaScript.completion();
    }
}
//# sourceMappingURL=SnippetsPlugin.js.map