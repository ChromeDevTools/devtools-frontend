// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, nothing, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {IsolateSelector} from './IsolateSelector.js';
import type {ProfileType} from './ProfileHeader.js';
import profileLauncherViewStyles from './profileLauncherView.css.js';
import type {ProfilesPanel} from './ProfilesPanel.js';

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
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/profiler/ProfileLauncherView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const {widget, widgetRef} = UI.Widget;

interface ProfileTypeEntry {
  profileType: ProfileType;
  selected: boolean;
  customContent: Element|null;
}

export interface ViewInput {
  headerText: string;
  profileTypes: ProfileTypeEntry[];
  controlButtonText: string;
  controlButtonDisabled: boolean;
  controlButtonTooltip: string;
  isProfiling: boolean;
  isolateSelector: IsolateSelector|null;
  onControlClick: () => void;
  onLoadClick: () => void;
  onProfileTypeChange: (profileType: ProfileType) => void;
}

export interface ViewOutput {
  isolateSelector: IsolateSelector;
}

export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

// clang-format off
export const DEFAULT_VIEW: View = (input, output, target) => {
  render(html`
    <style>${profileLauncherViewStyles}</style>
    <div class="profile-launcher-view-content vbox">
      <div class="vbox">
        <h1>${input.headerText}</h1>
        <form role="radiogroup" aria-label=${input.headerText}>
          ${input.profileTypes.map(entry => {
            const radioId = `profile-type-${entry.profileType.id}`;
            const customContent = entry.customContent;
            return html`
              <input id=${radioId} type="radio" name="profile-type"
                  .checked=${entry.selected}
                  ?disabled=${input.isProfiling}
                  @change=${() => input.onProfileTypeChange(entry.profileType)}
                  jslog=${VisualLogging.toggle().track({change: true}).context('profiler.profile-type')}
                />
              <label for=${radioId}>${entry.profileType.name}</label>
              <p>${entry.profileType.description}</p>
              ${customContent ? html`
                <p>
                  <span role="group" aria-labelledby=${radioId}>
                    ${customContent}
                  </span>
                </p>
              ` : nothing}
            `;
          })}
        </form>
      </div>
      <div class="vbox profile-isolate-selector-block">
        <h1>${i18nString(UIStrings.selectJavascriptVmInstance)}</h1>
        <div class="vbox profile-launcher-target-list profile-launcher-target-list-container">
          <devtools-widget
            ${widget(IsolateSelector)}
            ${widgetRef(IsolateSelector, e => {output.isolateSelector = e;})}
          ></devtools-widget>
        </div>
        ${input.isolateSelector?.totalMemoryElement() ?? nothing}
      </div>
      <div class="hbox profile-launcher-buttons">
        <devtools-button
          .variant=${Buttons.Button.Variant.OUTLINED}
          .iconName=${'import'}
          @click=${input.onLoadClick}
          .jslogContext=${'profiler.load-from-file'}
        >${i18nString(UIStrings.load)}</devtools-button>
        <devtools-button
          .variant=${Buttons.Button.Variant.PRIMARY}
          ?disabled=${input.controlButtonDisabled}
          title=${input.controlButtonTooltip}
          @click=${input.onControlClick}
          .jslogContext=${'profiler.heap-toggle-recording'}
        >${input.controlButtonText}</devtools-button>
      </div>
    </div>
  `, target);
};
// clang-format on

export class ProfileLauncherView extends Common.ObjectWrapper.eventMixin<EventTypes, typeof UI.Widget.VBox>(
    UI.Widget.VBox) {
  readonly panel: ProfilesPanel;
  readonly selectedProfileTypeSetting: Common.Settings.Setting<string>;
  readonly #view: View;
  #isolateSelector: IsolateSelector|null = null;
  #profileTypes = new Map<string, ProfileType>();
  #isProfiling = false;
  #isInstantProfile = false;
  #isEnabled = false;
  #recordButtonEnabled = true;
  #selectedTypeId = '';

  constructor(profilesPanel: ProfilesPanel, view: View = DEFAULT_VIEW) {
    super({classes: ['profile-launcher-view']});

    this.#view = view;
    this.panel = profilesPanel;
    this.selectedProfileTypeSetting = Common.Settings.Settings.instance().createSetting('selected-profile-type', 'CPU');
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  #getHeaderText(): string {
    return this.#profileTypes.size > 1 ? i18nString(UIStrings.selectProfilingType) :
                                         (this.#profileTypes.values().next().value?.name ?? '');
  }

  profileStarted(): void {
    this.#isProfiling = true;
    this.requestUpdate();
  }

  profileFinished(): void {
    this.#isProfiling = false;
    this.requestUpdate();
  }

  updateProfileType(profileType: ProfileType, recordButtonEnabled: boolean): void {
    this.#isInstantProfile = profileType.isInstantProfile();
    this.#recordButtonEnabled = recordButtonEnabled;
    this.#isEnabled = profileType.isEnabled();
    this.requestUpdate();
  }

  addProfileType(profileType: ProfileType): void {
    this.#profileTypes.set(profileType.id, profileType);
    profileType.setCustomContentEnabled(false);
    this.requestUpdate();
  }

  restoreSelectedProfileType(): void {
    let typeId = this.selectedProfileTypeSetting.get();
    if (!this.#profileTypes.has(typeId)) {
      typeId = this.#profileTypes.keys().next().value as string;
      this.selectedProfileTypeSetting.set(typeId);
    }

    this.#selectedTypeId = typeId;
    const selectedType = this.#profileTypes.get(typeId);
    if (!selectedType) {
      return;
    }
    for (const [id, profileType] of this.#profileTypes) {
      profileType.setCustomContentEnabled(id === typeId);
    }
    this.dispatchEventToListeners(Events.PROFILE_TYPE_SELECTED, selectedType);
    this.requestUpdate();
  }

  #profileTypeChanged(profileType: ProfileType): void {
    const previousTypeId = this.#selectedTypeId;
    const previousType = this.#profileTypes.get(previousTypeId);
    if (previousType) {
      previousType.setCustomContentEnabled(false);
    }
    profileType.setCustomContentEnabled(true);
    this.#selectedTypeId = profileType.id;
    this.selectedProfileTypeSetting.set(profileType.id);
    this.#isInstantProfile = profileType.isInstantProfile();
    this.#isEnabled = profileType.isEnabled();
    this.dispatchEventToListeners(Events.PROFILE_TYPE_SELECTED, profileType);
    this.requestUpdate();
  }

  override performUpdate(): void {
    const profileTypeEntries: ProfileTypeEntry[] = [];
    for (const [id, profileType] of this.#profileTypes) {
      const selected = id === this.#selectedTypeId;
      const customContent = profileType.customContent();
      profileType.setCustomContentEnabled(selected);
      profileTypeEntries.push({
        profileType,
        selected,
        customContent,
      });
    }

    const controlButtonText = this.#isInstantProfile ?
        i18nString(UIStrings.takeSnapshot) :
        (this.#isProfiling ? i18nString(UIStrings.stop) : i18nString(UIStrings.start));
    const controlButtonDisabled = !(this.#isEnabled && this.#recordButtonEnabled);
    const controlButtonTooltip = this.#recordButtonEnabled ? '' : UI.UIUtils.anotherProfilerActiveLabel();
    const that = this;

    this.#view(
        {
          headerText: this.#getHeaderText(),
          profileTypes: profileTypeEntries,
          controlButtonText,
          controlButtonDisabled,
          controlButtonTooltip,
          isProfiling: this.#isProfiling,
          isolateSelector: this.#isolateSelector,
          onControlClick: () => {
            this.panel.toggleRecord();
          },
          onLoadClick: () => {
            const loadFromFileAction = UI.ActionRegistry.ActionRegistry.instance().getAction('profiler.load-from-file');
            void loadFromFileAction.execute();
          },
          onProfileTypeChange: (profileType: ProfileType) => {
            this.#profileTypeChanged(profileType);
          },
        },
        {
          set isolateSelector(isolateSelector: IsolateSelector) {
            if (that.#isolateSelector === isolateSelector) {
              return;
            }
            that.#isolateSelector = isolateSelector;
            that.requestUpdate();
          },
        },
        this.contentElement,
    );
  }
}

export const enum Events {
  PROFILE_TYPE_SELECTED = 'ProfileTypeSelected',
}

export interface EventTypes {
  [Events.PROFILE_TYPE_SELECTED]: ProfileType;
}
