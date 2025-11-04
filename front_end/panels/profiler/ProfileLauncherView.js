// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import { IsolateSelector } from './IsolateSelector.js';
import profileLauncherViewStyles from './profileLauncherView.css.js';
const UIStrings = {
    /**
     * @description Text in Profile Launcher View of a profiler tool
     */
    selectJavascriptVmInstance: 'Select JavaScript VM instance',
    /**
     * @description Text to load something
     */
    load: 'Load profile',
    /**
     * @description Control button text content in Profile Launcher View of a profiler tool
     */
    takeSnapshot: 'Take snapshot',
    /**
     * @description Text of an item that stops the running task
     */
    stop: 'Stop',
    /**
     * @description Control button text content in Profile Launcher View of a profiler tool
     */
    start: 'Start',
    /**
     * @description Profile type header element text content in Profile Launcher View of a profiler tool
     */
    selectProfilingType: 'Select profiling type',
};
const str_ = i18n.i18n.registerUIStrings('panels/profiler/ProfileLauncherView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ProfileLauncherView extends Common.ObjectWrapper.eventMixin(UI.Widget.VBox) {
    panel;
    #contentElement;
    selectedProfileTypeSetting;
    profileTypeHeaderElement;
    profileTypeSelectorForm;
    controlButton;
    loadButton;
    recordButtonEnabled;
    typeIdToOptionElementAndProfileType;
    isProfiling;
    isInstantProfile;
    isEnabled;
    constructor(profilesPanel) {
        super();
        this.registerRequiredCSS(profileLauncherViewStyles);
        this.panel = profilesPanel;
        this.element.classList.add('profile-launcher-view');
        this.#contentElement = this.element.createChild('div', 'profile-launcher-view-content vbox');
        const profileTypeSelectorElement = this.#contentElement.createChild('div', 'vbox');
        this.selectedProfileTypeSetting = Common.Settings.Settings.instance().createSetting('selected-profile-type', 'CPU');
        this.profileTypeHeaderElement = profileTypeSelectorElement.createChild('h1');
        this.profileTypeSelectorForm = profileTypeSelectorElement.createChild('form');
        UI.ARIAUtils.markAsRadioGroup(this.profileTypeSelectorForm);
        const isolateSelectorElement = this.#contentElement.createChild('div', 'vbox profile-isolate-selector-block');
        isolateSelectorElement.createChild('h1').textContent = i18nString(UIStrings.selectJavascriptVmInstance);
        const isolateSelector = new IsolateSelector();
        const isolateSelectorElementChild = isolateSelectorElement.createChild('div', 'vbox profile-launcher-target-list');
        isolateSelectorElementChild.classList.add('profile-launcher-target-list-container');
        isolateSelector.show(isolateSelectorElementChild);
        isolateSelectorElement.appendChild(isolateSelector.totalMemoryElement());
        const buttonsDiv = this.#contentElement.createChild('div', 'hbox profile-launcher-buttons');
        this.controlButton = UI.UIUtils.createTextButton('', this.controlButtonClicked.bind(this), {
            jslogContext: 'profiler.heap-toggle-recording',
            variant: "primary" /* Buttons.Button.Variant.PRIMARY */,
        });
        this.loadButton = new Buttons.Button.Button();
        this.loadButton
            .data = { iconName: 'import', variant: "outlined" /* Buttons.Button.Variant.OUTLINED */, jslogContext: 'profiler.load-from-file' };
        this.loadButton.textContent = i18nString(UIStrings.load);
        this.loadButton.addEventListener('click', this.loadButtonClicked.bind(this));
        buttonsDiv.appendChild(this.loadButton);
        buttonsDiv.appendChild(this.controlButton);
        this.recordButtonEnabled = true;
        this.typeIdToOptionElementAndProfileType = new Map();
    }
    loadButtonClicked() {
        const loadFromFileAction = UI.ActionRegistry.ActionRegistry.instance().getAction('profiler.load-from-file');
        void loadFromFileAction.execute();
    }
    updateControls() {
        if (this.isEnabled && this.recordButtonEnabled) {
            this.controlButton.removeAttribute('disabled');
        }
        else {
            this.controlButton.setAttribute('disabled', '');
        }
        UI.Tooltip.Tooltip.install(this.controlButton, this.recordButtonEnabled ? '' : UI.UIUtils.anotherProfilerActiveLabel());
        if (this.isInstantProfile) {
            this.controlButton.classList.remove('running');
            this.controlButton.textContent = i18nString(UIStrings.takeSnapshot);
        }
        else if (this.isProfiling) {
            this.controlButton.classList.add('running');
            this.controlButton.textContent = i18nString(UIStrings.stop);
        }
        else {
            this.controlButton.classList.remove('running');
            this.controlButton.textContent = i18nString(UIStrings.start);
        }
        for (const { optionElement } of this.typeIdToOptionElementAndProfileType.values()) {
            optionElement.disabled = Boolean(this.isProfiling);
        }
    }
    profileStarted() {
        this.isProfiling = true;
        this.updateControls();
    }
    profileFinished() {
        this.isProfiling = false;
        this.updateControls();
    }
    updateProfileType(profileType, recordButtonEnabled) {
        this.isInstantProfile = profileType.isInstantProfile();
        this.recordButtonEnabled = recordButtonEnabled;
        this.isEnabled = profileType.isEnabled();
        this.updateControls();
    }
    addProfileType(profileType) {
        const { radio, label } = UI.UIUtils.createRadioButton('profile-type', profileType.name, 'profiler.profile-type');
        this.profileTypeSelectorForm.appendChild(label);
        this.typeIdToOptionElementAndProfileType.set(profileType.id, { optionElement: radio, profileType });
        radio.addEventListener('change', this.profileTypeChanged.bind(this, profileType), false);
        const descriptionElement = this.profileTypeSelectorForm.createChild('p');
        descriptionElement.textContent = profileType.description;
        UI.ARIAUtils.setDescription(radio, profileType.description);
        const customContent = profileType.customContent();
        if (customContent) {
            customContent.setAttribute('role', 'group');
            customContent.setAttribute('aria-labelledby', `${radio.id}`);
            this.profileTypeSelectorForm.createChild('p').appendChild(customContent);
            profileType.setCustomContentEnabled(false);
        }
        const headerText = this.typeIdToOptionElementAndProfileType.size > 1 ? i18nString(UIStrings.selectProfilingType) :
            profileType.name;
        this.profileTypeHeaderElement.textContent = headerText;
        UI.ARIAUtils.setLabel(this.profileTypeSelectorForm, headerText);
    }
    restoreSelectedProfileType() {
        let typeId = this.selectedProfileTypeSetting.get();
        if (!this.typeIdToOptionElementAndProfileType.has(typeId)) {
            typeId = this.typeIdToOptionElementAndProfileType.keys().next().value;
            this.selectedProfileTypeSetting.set(typeId);
        }
        const optionElementAndProfileType = this.typeIdToOptionElementAndProfileType.get(typeId);
        optionElementAndProfileType.optionElement.checked = true;
        const type = optionElementAndProfileType.profileType;
        for (const [id, { profileType }] of this.typeIdToOptionElementAndProfileType) {
            const enabled = (id === typeId);
            profileType.setCustomContentEnabled(enabled);
        }
        this.dispatchEventToListeners("ProfileTypeSelected" /* Events.PROFILE_TYPE_SELECTED */, type);
    }
    controlButtonClicked() {
        this.panel.toggleRecord();
    }
    profileTypeChanged(profileType) {
        const typeId = this.selectedProfileTypeSetting.get();
        const type = this.typeIdToOptionElementAndProfileType.get(typeId).profileType;
        type.setCustomContentEnabled(false);
        profileType.setCustomContentEnabled(true);
        this.dispatchEventToListeners("ProfileTypeSelected" /* Events.PROFILE_TYPE_SELECTED */, profileType);
        this.isInstantProfile = profileType.isInstantProfile();
        this.isEnabled = profileType.isEnabled();
        this.updateControls();
        this.selectedProfileTypeSetting.set(profileType.id);
    }
}
//# sourceMappingURL=ProfileLauncherView.js.map