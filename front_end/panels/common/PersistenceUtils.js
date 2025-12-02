// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/kit/kit.js';
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import { html } from '../../ui/lit/lit.js';
const UIStrings = {
    /**
     * @description Text in Persistence Utils of the Workspace settings in Settings
     * @example {example.url} PH1
     */
    linkedToSourceMapS: 'Linked to source map: {PH1}',
    /**
     * @description Text to show something is linked to another
     * @example {example.url} PH1
     */
    linkedToS: 'Linked to {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('panels/common/PersistenceUtils.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class PersistenceUtils {
    static tooltipForUISourceCode(uiSourceCode) {
        const binding = Persistence.Persistence.PersistenceImpl.instance().binding(uiSourceCode);
        if (!binding) {
            return '';
        }
        if (uiSourceCode === binding.network) {
            return Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.tooltipForUISourceCode(binding.fileSystem);
        }
        if (binding.network.contentType().isFromSourceMap()) {
            return i18nString(UIStrings.linkedToSourceMapS, { PH1: Platform.StringUtilities.trimMiddle(binding.network.url(), 150) });
        }
        return i18nString(UIStrings.linkedToS, { PH1: Platform.StringUtilities.trimMiddle(binding.network.url(), 150) });
    }
    static iconForUISourceCode(uiSourceCode) {
        const binding = Persistence.Persistence.PersistenceImpl.instance().binding(uiSourceCode);
        if (binding) {
            if (!Common.ParsedURL.schemeIs(binding.fileSystem.url(), 'file:')) {
                return null;
            }
            const dotClass = Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().project() ===
                binding.fileSystem.project() ?
                'purple' :
                'green';
            // clang-format off
            return html `<devtools-icon class="small dot ${dotClass}" name="document"
                                 title=${PersistenceUtils.tooltipForUISourceCode(binding.network)}>
                  </devtools-icon>`;
            // clang-format on
        }
        if (uiSourceCode.project().type() !== Workspace.Workspace.projectTypes.FileSystem ||
            !Common.ParsedURL.schemeIs(uiSourceCode.url(), 'file:')) {
            return null;
        }
        if (Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().isActiveHeaderOverrides(uiSourceCode)) {
            // clang-format off
            return html `<devtools-icon class="small dot purple" name="document"></devtools-icon>`;
            // clang-format on
        }
        // clang-format off
        return html `<devtools-icon class="small" name="document"
                               title=${PersistenceUtils.tooltipForUISourceCode(uiSourceCode)}>
                </devtools-icon>`;
        // clang-format on
    }
}
export class LinkDecorator extends Common.ObjectWrapper.ObjectWrapper {
    constructor(persistence) {
        super();
        persistence.addEventListener(Persistence.Persistence.Events.BindingCreated, this.bindingChanged, this);
        persistence.addEventListener(Persistence.Persistence.Events.BindingRemoved, this.bindingChanged, this);
    }
    bindingChanged(event) {
        const binding = event.data;
        this.dispatchEventToListeners("LinkIconChanged" /* Components.Linkifier.LinkDecorator.Events.LINK_ICON_CHANGED */, binding.network);
    }
    linkIcon(uiSourceCode) {
        return PersistenceUtils.iconForUISourceCode(uiSourceCode);
    }
}
//# sourceMappingURL=PersistenceUtils.js.map