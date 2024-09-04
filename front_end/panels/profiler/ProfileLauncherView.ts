/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';

import {IsolateSelector} from './IsolateSelector.js';
import {type ProfileType} from './ProfileHeader.js';
import profileLauncherViewStyles from './profileLauncherView.css.js';
import {type ProfilesPanel} from './ProfilesPanel.js';

const UIStrings = {
  /**
   *@description Text in Profile Launcher View of a profiler tool
   */
  selectJavascriptVmInstance: 'Select JavaScript VM instance',
  /**
   *@description Text to load something
   */
  load: 'Load profile',
  /**
   *@description Control button text content in Profile Launcher View of a profiler tool
   */
  takeSnapshot: 'Take snapshot',
  /**
   *@description Text of an item that stops the running task
   */
  stop: 'Stop',
  /**
   *@description Control button text content in Profile Launcher View of a profiler tool
   */
  start: 'Start',
  /**
   *@description Profile type header element text content in Profile Launcher View of a profiler tool
   */
  selectProfilingType: 'Select profiling type',
};
const str_ = i18n.i18n.registerUIStrings('panels/profiler/ProfileLauncherView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ProfileLauncherView extends Common.ObjectWrapper.eventMixin<EventTypes, typeof UI.Widget.VBox>(
    UI.Widget.VBox) {
  readonly panel: ProfilesPanel;
  private contentElementInternal: HTMLElement;
  readonly selectedProfileTypeSetting: Common.Settings.Setting<string>;
  profileTypeHeaderElement: HTMLElement;
  readonly profileTypeSelectorForm: HTMLElement;
  controlButton: Buttons.Button.Button;
  readonly loadButton: Buttons.Button.Button;
  recordButtonEnabled: boolean;
  typeIdToOptionElementAndProfileType: Map<string, {
    optionElement: HTMLInputElement,
    profileType: ProfileType,
  }>;
  isProfiling?: boolean;
  isInstantProfile?: boolean;
  isEnabled?: boolean;

  constructor(profilesPanel: ProfilesPanel) {
    super();

    this.panel = profilesPanel;
    this.element.classList.add('profile-launcher-view');
    this.contentElementInternal =
        this.element.createChild('div', 'profile-launcher-view-content vbox') as HTMLDivElement;

    const profileTypeSelectorElement = this.contentElementInternal.createChild('div', 'vbox');
    this.selectedProfileTypeSetting = Common.Settings.Settings.instance().createSetting('selected-profile-type', 'CPU');
    this.profileTypeHeaderElement = profileTypeSelectorElement.createChild('h1');
    this.profileTypeSelectorForm = profileTypeSelectorElement.createChild('form');
    UI.ARIAUtils.markAsRadioGroup(this.profileTypeSelectorForm);

    const isolateSelectorElement =
        this.contentElementInternal.createChild('div', 'vbox profile-isolate-selector-block');
    isolateSelectorElement.createChild('h1').textContent = i18nString(UIStrings.selectJavascriptVmInstance);
    const isolateSelector = new IsolateSelector();
    const isolateSelectorElementChild = isolateSelectorElement.createChild('div', 'vbox profile-launcher-target-list');
    isolateSelectorElementChild.classList.add('profile-launcher-target-list-container');
    isolateSelector.show(isolateSelectorElementChild);
    isolateSelectorElement.appendChild(isolateSelector.totalMemoryElement());

    const buttonsDiv = this.contentElementInternal.createChild('div', 'hbox profile-launcher-buttons');
    this.controlButton = UI.UIUtils.createTextButton('', this.controlButtonClicked.bind(this), {
      jslogContext: 'profiler.heap-toggle-recording',
      variant: Buttons.Button.Variant.PRIMARY,
    });
    this.loadButton = new Buttons.Button.Button();
    this.loadButton
        .data = {iconName: 'import', variant: Buttons.Button.Variant.OUTLINED, jslogContext: 'profiler.load-from-file'};
    this.loadButton.textContent = i18nString(UIStrings.load);
    this.loadButton.addEventListener('click', this.loadButtonClicked.bind(this));
    buttonsDiv.appendChild(this.loadButton);
    buttonsDiv.appendChild(this.controlButton);
    this.recordButtonEnabled = true;

    this.typeIdToOptionElementAndProfileType = new Map();
  }

  loadButtonClicked(): void {
    const loadFromFileAction = UI.ActionRegistry.ActionRegistry.instance().getAction('profiler.load-from-file');
    void loadFromFileAction.execute();
  }

  updateControls(): void {
    if (this.isEnabled && this.recordButtonEnabled) {
      this.controlButton.removeAttribute('disabled');
    } else {
      this.controlButton.setAttribute('disabled', '');
    }
    UI.Tooltip.Tooltip.install(
        this.controlButton, this.recordButtonEnabled ? '' : UI.UIUtils.anotherProfilerActiveLabel());
    if (this.isInstantProfile) {
      this.controlButton.classList.remove('running');
      this.controlButton.textContent = i18nString(UIStrings.takeSnapshot);
    } else if (this.isProfiling) {
      this.controlButton.classList.add('running');
      this.controlButton.textContent = i18nString(UIStrings.stop);
    } else {
      this.controlButton.classList.remove('running');
      this.controlButton.textContent = i18nString(UIStrings.start);
    }
    for (const {optionElement} of this.typeIdToOptionElementAndProfileType.values()) {
      optionElement.disabled = Boolean(this.isProfiling);
    }
  }

  profileStarted(): void {
    this.isProfiling = true;
    this.updateControls();
  }

  profileFinished(): void {
    this.isProfiling = false;
    this.updateControls();
  }

  updateProfileType(profileType: ProfileType, recordButtonEnabled: boolean): void {
    this.isInstantProfile = profileType.isInstantProfile();
    this.recordButtonEnabled = recordButtonEnabled;
    this.isEnabled = profileType.isEnabled();
    this.updateControls();
  }

  addProfileType(profileType: ProfileType): void {
    const labelElement =
        UI.UIUtils.createRadioLabel('profile-type', profileType.name, undefined, 'profiler.profile-type');
    this.profileTypeSelectorForm.appendChild(labelElement);
    const optionElement = labelElement.radioElement;
    this.typeIdToOptionElementAndProfileType.set(profileType.id, {optionElement, profileType});
    optionElement.addEventListener('change', this.profileTypeChanged.bind(this, profileType), false);
    const descriptionElement = this.profileTypeSelectorForm.createChild('p');
    descriptionElement.textContent = profileType.description;
    UI.ARIAUtils.setDescription(optionElement, profileType.description);
    const customContent = profileType.customContent();
    if (customContent) {
      customContent.setAttribute('role', 'group');
      customContent.setAttribute('aria-labelledby', `${optionElement.id}`);
      this.profileTypeSelectorForm.createChild('p').appendChild(customContent);
      profileType.setCustomContentEnabled(false);
    }
    const headerText = this.typeIdToOptionElementAndProfileType.size > 1 ? i18nString(UIStrings.selectProfilingType) :
                                                                           profileType.name;
    this.profileTypeHeaderElement.textContent = headerText;
    UI.ARIAUtils.setLabel(this.profileTypeSelectorForm, headerText);
  }

  restoreSelectedProfileType(): void {
    let typeId = this.selectedProfileTypeSetting.get();
    if (!this.typeIdToOptionElementAndProfileType.has(typeId)) {
      typeId = this.typeIdToOptionElementAndProfileType.keys().next().value;
      this.selectedProfileTypeSetting.set(typeId);
    }

    const optionElementAndProfileType = (this.typeIdToOptionElementAndProfileType.get(typeId) as {
      optionElement: HTMLInputElement,
      profileType: ProfileType,
    });
    optionElementAndProfileType.optionElement.checked = true;
    const type = optionElementAndProfileType.profileType;
    for (const [id, {profileType}] of this.typeIdToOptionElementAndProfileType) {
      const enabled = (id === typeId);
      profileType.setCustomContentEnabled(enabled);
    }
    this.dispatchEventToListeners(Events.PROFILE_TYPE_SELECTED, type);
  }

  controlButtonClicked(): void {
    this.panel.toggleRecord();
  }

  profileTypeChanged(profileType: ProfileType): void {
    const typeId = this.selectedProfileTypeSetting.get();
    const type = (this.typeIdToOptionElementAndProfileType.get(typeId) as {
                   optionElement: HTMLInputElement,
                   profileType: ProfileType,
                 }).profileType;
    type.setCustomContentEnabled(false);
    profileType.setCustomContentEnabled(true);
    this.dispatchEventToListeners(Events.PROFILE_TYPE_SELECTED, profileType);
    this.isInstantProfile = profileType.isInstantProfile();
    this.isEnabled = profileType.isEnabled();
    this.updateControls();
    this.selectedProfileTypeSetting.set(profileType.id);
  }
  override wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([profileLauncherViewStyles]);
  }
}

export const enum Events {
  PROFILE_TYPE_SELECTED = 'ProfileTypeSelected',
}

export type EventTypes = {
  [Events.PROFILE_TYPE_SELECTED]: ProfileType,
};
