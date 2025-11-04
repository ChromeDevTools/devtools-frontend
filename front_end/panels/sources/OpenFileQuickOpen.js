// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import { PanelUtils } from '../../panels/utils/utils.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import { FilteredUISourceCodeListProvider } from './FilteredUISourceCodeListProvider.js';
import { SourcesView } from './SourcesView.js';
export class OpenFileQuickOpen extends FilteredUISourceCodeListProvider {
    constructor() {
        super('source-file');
    }
    attach() {
        this.setDefaultScores(SourcesView.defaultUISourceCodeScores());
        super.attach();
    }
    uiSourceCodeSelected(uiSourceCode, lineNumber, columnNumber) {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.SelectFileFromFilePicker);
        if (!uiSourceCode) {
            return;
        }
        if (typeof lineNumber === 'number') {
            void Common.Revealer.reveal(uiSourceCode.uiLocation(lineNumber, columnNumber));
        }
        else {
            void Common.Revealer.reveal(uiSourceCode);
        }
    }
    filterProject(project) {
        return !project.isServiceProject();
    }
    renderItem(itemIndex, query, titleElement, subtitleElement) {
        super.renderItem(itemIndex, query, titleElement, subtitleElement);
        const iconElement = new IconButton.Icon.Icon();
        const { iconName, color } = PanelUtils.iconDataForResourceType(this.itemContentTypeAt(itemIndex));
        iconElement.name = iconName;
        if (color) {
            iconElement.style.color = color;
        }
        iconElement.classList.add('large');
        titleElement.parentElement?.parentElement?.insertBefore(iconElement, titleElement.parentElement);
    }
    renderAsTwoRows() {
        return true;
    }
}
//# sourceMappingURL=OpenFileQuickOpen.js.map