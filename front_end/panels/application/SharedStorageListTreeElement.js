// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import { ApplicationPanelTreeElement } from './ApplicationPanelTreeElement.js';
import { SharedStorageEventsView } from './SharedStorageEventsView.js';
const UIStrings = {
    /**
     * @description Text in SharedStorage Category View of the Application panel
     */
    sharedStorage: 'Shared storage',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/SharedStorageListTreeElement.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class SharedStorageListTreeElement extends ApplicationPanelTreeElement {
    #expandedSetting;
    view;
    constructor(resourcesPanel, expandedSettingsDefault = false) {
        super(resourcesPanel, i18nString(UIStrings.sharedStorage), false, 'shared-storage');
        this.#expandedSetting =
            Common.Settings.Settings.instance().createSetting('resources-shared-storage-expanded', expandedSettingsDefault);
        const sharedStorageIcon = IconButton.Icon.create('database');
        this.setLeadingIcons([sharedStorageIcon]);
        this.view = new SharedStorageEventsView();
    }
    get itemURL() {
        return 'shared-storage://';
    }
    onselect(selectedByUser) {
        super.onselect(selectedByUser);
        this.resourcesPanel.showView(this.view);
        return false;
    }
    onattach() {
        super.onattach();
        if (this.#expandedSetting.get()) {
            this.expand();
        }
    }
    onexpand() {
        this.#expandedSetting.set(true);
    }
    oncollapse() {
        this.#expandedSetting.set(false);
    }
    addEvent(event) {
        this.view.addEvent(event);
    }
}
//# sourceMappingURL=SharedStorageListTreeElement.js.map