// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/components/lists/lists.js';
import '../../ui/kit/kit.js';

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import type * as Lists from '../../ui/components/lists/lists.js';
import * as UIHelpers from '../../ui/helpers/helpers.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, type LitTemplate, nothing, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import frameworkIgnoreListSettingsTabStyles from './frameworkIgnoreListSettingsTab.css.js';
import settingsScreenStyles from './settingsScreen.css.js';

const {bindToSetting} = UI.UIUtils;

const UIStrings = {
  /**
   * @description Header text content in Framework Ignore List settings tab of the Settings for enabling or disabling ignore listing.
   */
  frameworkIgnoreList: 'Ignore listing',
  /**
   * @description Checkbox label in Framework Ignore List settings tab of the Settings.
   */
  ignoreListingDescription:
      'When enabled, the debugger will skip over ignore-listed scripts and will ignore exceptions that only affect them and the Performance panel will collapse matching flamechart items',
  /**
   * @description Text in Framework Ignore List settings tab of the Settings.
   */
  ignoreListContentScripts: 'Content scripts injected by extensions',
  /**
   * @description Text in Framework Ignore List settings tab of the Settings.
   */
  ignoreListAnonymousScripts: 'Anonymous scripts from eval or console',
  /**
   * @description Text in Framework Ignore List settings tab of the Settings.
   */
  automaticallyIgnoreListKnownThirdPartyScripts: 'Known third-party scripts from source maps',
  /**
   * @description Text in Framework Ignore List settings tab of the Settings.
   */
  ignoreListing: 'Ignore listing',
  /**
   * @description Text in Framework Ignore List settings tab of the Settings.
   */
  enableIgnoreListingTooltip: 'Uncheck to disable all ignore listing',
  /**
   * @description Text in Framework Ignore List settings tab of the Settings.
   */
  generalExclusionRules: 'General exclusion rules',
  /**
   * @description Text in Framework Ignore List settings tab of the Settings.
   */
  customExclusionRules: 'Custom exclusion rules',
  /**
   * @description Text of the add pattern button in Framework Ignore List settings tab of the Settings.
   */
  addPattern: 'Add regex rule',
  /**
   * @description ARIA accessible name in Framework Ignore List settings tab of the Settings.
   */
  addFilenamePattern: 'Add a regular expression rule for the script’s URL',
  /**
   * @description Pattern title in Framework Ignore List settings tab of the Settings.
   * @example {ad.*?} PH1
   */
  ignoreScriptsWhoseNamesMatchS: 'Ignore scripts whose names match \'\'{PH1}\'\'',
  /**
   * @description ARIA accessible name in Framework Ignore List settings tab of the Settings. It labels the input
   * field used to add new or edit existing regular expressions that match file names to ignore in the debugger.
   */
  pattern: 'Add a regular expression rule for the script’s URL',
  /**
   * @description Error message in Framework Ignore List settings tab that declares the pattern must not be empty.
   */
  patternCannotBeEmpty: 'Rule can’t be empty',
  /**
   * @description Error message in Framework Ignore List settings tab that declares the pattern already exists.
   */
  patternAlreadyExists: 'Rule already exists',
  /**
   * @description Error message in Framework Ignore List settings tab that declares the pattern must be a valid regular expression.
   */
  patternMustBeAValidRegular: 'Rule must be a valid regular expression',
  /**
   * @description Text that is usually a hyperlink to more documentation.
   */
  learnMore: 'Learn more',
  /**
   * @description Button text to save changes when editing an item in Framework Ignore List settings tab.
   */
  save: 'Save',
  /**
   * @description Button text to add a new item in Framework Ignore List settings tab.
   */
  add: 'Add',
  /**
   * @description Button text to cancel editing an item in Framework Ignore List settings tab.
   */
  cancel: 'Cancel',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/settings/FrameworkIgnoreListSettingsTab.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface ViewInput {
  enabledSetting: Common.Settings.Setting<boolean>;
  skipContentScriptsSetting: Common.Settings.Setting<boolean>;
  automaticallyIgnoreListSetting: Common.Settings.Setting<boolean>;
  skipAnonymousScriptsSetting: Common.Settings.Setting<boolean>;
  enabled: boolean;
  patterns: Common.Settings.RegExpSettingItem[];
  editingIndex: number|null;
  editingValue: string;
  validationError: Common.UIString.LocalizedString|null;
  showValidationError: boolean;
  onLearnMoreClick: () => void;
  onAddPatternClick: () => void;
  onTogglePattern: (index: number, checked: boolean) => void;
  onBeginEdit: (index: number) => void;
  onRemovePattern: (index: number) => void;
  onEditorInput: (value: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

function renderRuleItem(item: Common.Settings.RegExpSettingItem, index: number, enabled: boolean,
                        onTogglePattern: (index: number, checked: boolean) => void): LitTemplate {
  const helpText = i18nString(UIStrings.ignoreScriptsWhoseNamesMatchS, {PH1: item.pattern});
  // clang-format off
  return html`
    <div class="ignore-list-item">
      <devtools-checkbox
          .checked=${!item.disabled}
          .disabled=${!enabled}
          title=${helpText}
          aria-label=${helpText}
          jslogcontext="settings.ignore-list-pattern"
          @change=${(e: Event) => onTogglePattern(index, (e.target as UI.UIUtils.CheckboxLabel).checked)}>
        ${item.pattern}
      </devtools-checkbox>
    </div>
  `;
  // clang-format on
}

function renderEditor(input: ViewInput): LitTemplate {
  const isNew = input.editingIndex === input.patterns.length;
  const isInvalid = input.showValidationError && input.validationError !== null;
  // clang-format off
  return html`
    <div
        class="editor-container"
        jslog=${VisualLogging.pane('editor').track({resize: true})}
        @keydown=${(e: KeyboardEvent) => {
          if (Platform.KeyboardUtilities.isEscKey(e)) {
            e.consume(true);
            input.onCancelEdit();
          }
        }}>
      <div
          class="editor-content"
          @keydown=${(e: KeyboardEvent) => {
            if (e.key === 'Enter' && !e.isComposing) {
              e.consume(true);
              input.onCommitEdit();
            }
          }}>
        <div class="ignore-list-edit-row">
          <div class="ignore-list-pattern">${i18nString(UIStrings.pattern)}</div>
        </div>
        <div class="ignore-list-edit-row">
          <div class="ignore-list-pattern">
            <input
                class=${Directives.classMap({
                  'harmony-input': true,
                  'error-input': isInvalid,
                })}
                type="text"
                autofocus
                placeholder="/framework\\.js$"
                aria-label=${i18nString(UIStrings.pattern)}
                aria-invalid=${isInvalid ? 'true' : 'false'}
                .value=${Directives.live(input.editingValue)}
                jslog=${VisualLogging.textField().track({change: true, keydown: 'Enter'}).context('pattern')}
                @input=${(e: Event) => input.onEditorInput((e.target as HTMLInputElement).value)}>
          </div>
        </div>
      </div>
      <div class="editor-buttons">
        <devtools-button
            .variant=${Buttons.Button.Variant.OUTLINED}
            .jslogContext=${'cancel'}
            jslog=${VisualLogging.action('cancel').track({click: true})}
            @click=${input.onCancelEdit}>
          ${i18nString(UIStrings.cancel)}
        </devtools-button>
        <devtools-button
            .variant=${Buttons.Button.Variant.PRIMARY}
            .jslogContext=${'commit'}
            .disabled=${input.validationError !== null}
            @click=${input.onCommitEdit}>
          ${isNew ? i18nString(UIStrings.add) : i18nString(UIStrings.save)}
        </devtools-button>
      </div>
      <div class="list-widget-input-validation-error" role="alert" aria-live="polite">
        ${isInvalid && input.validationError ? input.validationError : nothing}
      </div>
    </div>
  `;
  // clang-format on
}

export const DEFAULT_VIEW: View = (input, _output, target) => {
  const editingIndex = input.editingIndex;
  const patternsBefore = editingIndex !== null ? input.patterns.slice(0, editingIndex) : input.patterns;
  const patternsAfter = editingIndex !== null ? input.patterns.slice(editingIndex + 1) : [];

  // clang-format off
  render(html`
    <div class="settings-card-container-wrapper">
      <div class="settings-card-container ignore-list-settings">
        <devtools-card .heading=${i18nString(UIStrings.frameworkIgnoreList)}>
          <span>${i18nString(UIStrings.ignoreListingDescription)}</span>
          <div class="enable-ignore-listing" title=${i18nString(UIStrings.enableIgnoreListingTooltip)}>
            <devtools-checkbox
                name=${i18nString(UIStrings.ignoreListing)}
                title=${i18nString(UIStrings.ignoreListing)}
                ${bindToSetting(input.enabledSetting)}>
              ${i18nString(UIStrings.ignoreListing)}
            </devtools-checkbox>
          </div>
        </devtools-card>
        <devtools-card class="ignore-list-options" .heading=${i18nString(UIStrings.generalExclusionRules)}>
          <div class="ignore-list-option-group general-exclusion-group" role="group">
            <div class="ignore-list-option">
              <devtools-checkbox
                  name=${i18nString(UIStrings.ignoreListContentScripts)}
                  title=${i18nString(UIStrings.ignoreListContentScripts)}
                  ?disabled=${!input.enabled}
                  ${bindToSetting(input.skipContentScriptsSetting)}>
                ${i18nString(UIStrings.ignoreListContentScripts)}
              </devtools-checkbox>
            </div>
            <div class="ignore-list-option">
              <devtools-checkbox
                  name=${i18nString(UIStrings.automaticallyIgnoreListKnownThirdPartyScripts)}
                  title=${i18nString(UIStrings.automaticallyIgnoreListKnownThirdPartyScripts)}
                  ?disabled=${!input.enabled}
                  ${bindToSetting(input.automaticallyIgnoreListSetting)}>
                ${i18nString(UIStrings.automaticallyIgnoreListKnownThirdPartyScripts)}
              </devtools-checkbox>
              <devtools-button
                  .iconName=${'help'}
                  .variant=${Buttons.Button.Variant.ICON}
                  .size=${Buttons.Button.Size.SMALL}
                  .jslogContext=${'learn-more'}
                  .title=${i18nString(UIStrings.learnMore)}
                  .disabled=${!input.enabled}
                  @click=${input.onLearnMoreClick}>
              </devtools-button>
            </div>
            <div class="ignore-list-option">
              <devtools-checkbox
                  name=${i18nString(UIStrings.ignoreListAnonymousScripts)}
                  title=${i18nString(UIStrings.ignoreListAnonymousScripts)}
                  ?disabled=${!input.enabled}
                  ${bindToSetting(input.skipAnonymousScriptsSetting)}>
                ${i18nString(UIStrings.ignoreListAnonymousScripts)}
              </devtools-checkbox>
            </div>
          </div>
        </devtools-card>
        <devtools-card class="ignore-list-options" .heading=${i18nString(UIStrings.customExclusionRules)}>
          <div class="ignore-list-option-group custom-exclusion-group" role="group">
            ${patternsBefore.length > 0 ? html`
              <devtools-list
                  class="ignore-list"
                  .editable=${input.enabled}
                  .deletable=${input.enabled}
                  @edit=${(e: Lists.List.ItemEditEvent) => input.onBeginEdit(e.detail.index)}
                  @delete=${(e: Lists.List.ItemRemoveEvent) => input.onRemovePattern(e.detail.index)}>
                ${Directives.repeat(
                    patternsBefore,
                    item => item.pattern,
                    (item, index) => renderRuleItem(item, index, input.enabled, input.onTogglePattern))}
              </devtools-list>
            ` : nothing}
            ${editingIndex !== null ? renderEditor(input) : nothing}
            ${editingIndex !== null && patternsAfter.length > 0 ? html`
              <devtools-list
                  class="ignore-list"
                  .editable=${input.enabled}
                  .deletable=${input.enabled}
                  @edit=${(e: Lists.List.ItemEditEvent) => input.onBeginEdit(editingIndex + 1 + e.detail.index)}
                  @delete=${(e: Lists.List.ItemRemoveEvent) => input.onRemovePattern(editingIndex + 1 + e.detail.index)}>
                ${Directives.repeat(
                    patternsAfter,
                    item => item.pattern,
                    (item, index) => renderRuleItem(item, editingIndex + 1 + index, input.enabled, input.onTogglePattern))}
              </devtools-list>
            ` : nothing}
            <devtools-button
                class="add-button"
                .variant=${Buttons.Button.Variant.OUTLINED}
                .jslogContext=${'settings.add-ignore-list-pattern'}
                aria-label=${i18nString(UIStrings.addFilenamePattern)}
                .disabled=${!input.enabled}
                @click=${input.onAddPatternClick}>
              ${i18nString(UIStrings.addPattern)}
            </devtools-button>
          </div>
        </devtools-card>
      </div>
    </div>
  `, target, {container: {attributes: {jslog: `${VisualLogging.pane('blackbox')}`}}});
  // clang-format on
};

export class FrameworkIgnoreListSettingsTab extends UI.Widget.VBox {
  private readonly setting: Common.Settings.RegExpSetting;
  private readonly enabledSetting: Common.Settings.Setting<boolean>;
  private readonly skipContentScriptsSetting: Common.Settings.Setting<boolean>;
  private readonly automaticallyIgnoreListSetting: Common.Settings.Setting<boolean>;
  private readonly skipAnonymousScriptsSetting: Common.Settings.Setting<boolean>;
  readonly #view: View;
  #editingIndex: number|null = null;
  #editingValue = '';
  #showValidationError = false;

  constructor(view: View = DEFAULT_VIEW) {
    super({
      useShadowDom: true,
    });
    this.#view = view;
    this.registerRequiredCSS(frameworkIgnoreListSettingsTabStyles, settingsScreenStyles);

    const settings = Common.Settings.Settings.instance();
    this.enabledSetting = settings.resolve(Workspace.IgnoreListManager.enableIgnoreListingSettingDescriptor);
    this.skipContentScriptsSetting = settings.resolve(Workspace.IgnoreListManager.skipContentScriptsSettingDescriptor);
    this.automaticallyIgnoreListSetting =
        settings.resolve(Workspace.IgnoreListManager.automaticallyIgnoreListKnownThirdPartyScriptsSettingDescriptor);
    this.skipAnonymousScriptsSetting =
        settings.resolve(Workspace.IgnoreListManager.skipAnonymousScriptsSettingDescriptor);

    this.setting = settings.resolve(Workspace.IgnoreListManager.skipStackFramesPatternSettingDescriptor) as
        Common.Settings.RegExpSetting;
    this.setting.addChangeListener(this.#settingUpdated, this);

    this.enabledSetting.addChangeListener(this.#settingUpdated, this);
    this.performUpdate();
  }

  override performUpdate(): void {
    const patterns = this.setting.getAsArray();
    const validationError =
        this.#editingIndex !== null ? this.#validatePattern(this.#editingValue, this.#editingIndex) : null;

    this.#view(
        {
          enabledSetting: this.enabledSetting,
          skipContentScriptsSetting: this.skipContentScriptsSetting,
          automaticallyIgnoreListSetting: this.automaticallyIgnoreListSetting,
          skipAnonymousScriptsSetting: this.skipAnonymousScriptsSetting,
          enabled: this.enabledSetting.get(),
          patterns,
          editingIndex: this.#editingIndex,
          editingValue: this.#editingValue,
          validationError,
          showValidationError: this.#showValidationError,
          onLearnMoreClick: () => {
            UIHelpers.openInNewTab('https://developer.chrome.com/docs/devtools/settings/ignore-list/#skip-third-party');
          },
          onAddPatternClick: this.#addButtonClicked.bind(this),
          onTogglePattern: this.#togglePattern.bind(this),
          onBeginEdit: this.#beginEdit.bind(this),
          onRemovePattern: this.#removePattern.bind(this),
          onEditorInput: this.#onEditorInput.bind(this),
          onCommitEdit: this.#commitEdit.bind(this),
          onCancelEdit: this.#cancelEdit.bind(this),
        },
        undefined,
        this.contentElement,
    );
  }

  override wasShown(): void {
    super.wasShown();
    this.#cancelEdit();
  }

  #settingUpdated(): void {
    this.#editingIndex = null;
    this.#editingValue = '';
    this.#showValidationError = false;
    this.performUpdate();
  }

  #addButtonClicked(): void {
    this.#editingIndex = this.setting.getAsArray().length;
    this.#editingValue = '';
    this.#showValidationError = false;
    this.performUpdate();
  }

  #beginEdit(index: number): void {
    const patterns = this.setting.getAsArray();
    if (index < 0 || index >= patterns.length) {
      return;
    }
    this.#editingIndex = index;
    this.#editingValue = patterns[index].pattern;
    this.#showValidationError = false;
    this.performUpdate();
  }

  #onEditorInput(value: string): void {
    this.#editingValue = value;
    this.#showValidationError = true;
    this.performUpdate();
  }

  #cancelEdit(): void {
    this.#editingIndex = null;
    this.#editingValue = '';
    this.#showValidationError = false;
    this.performUpdate();
  }

  #commitEdit(): void {
    if (this.#editingIndex === null) {
      return;
    }
    const validationError = this.#validatePattern(this.#editingValue, this.#editingIndex);
    if (validationError !== null) {
      this.#showValidationError = true;
      this.performUpdate();
      return;
    }

    const pattern = this.#editingValue.trim();
    const list = this.setting.getAsArray();
    if (this.#editingIndex === list.length) {
      list.push({pattern, disabled: false});
    } else if (list[this.#editingIndex]) {
      list[this.#editingIndex].pattern = pattern;
    }
    this.#editingIndex = null;
    this.#editingValue = '';
    this.#showValidationError = false;
    this.setting.setAsArray(list);
  }

  #togglePattern(index: number, checked: boolean): void {
    const patterns = this.setting.getAsArray();
    const item = patterns[index];
    if (!item) {
      return;
    }
    const disabled = !checked;
    if (item.disabled !== disabled) {
      item.disabled = disabled;
      item.disabledForUrl = undefined;
      this.setting.setAsArray(patterns);
    }
  }

  #removePattern(index: number): void {
    const patterns = this.setting.getAsArray();
    patterns.splice(index, 1);
    this.setting.setAsArray(patterns);
  }

  #validatePattern(value: string, index: number): Common.UIString.LocalizedString|null {
    const pattern = value.trim();
    const patterns = this.setting.getAsArray();

    if (!pattern.length) {
      return i18nString(UIStrings.patternCannotBeEmpty);
    }

    for (let i = 0; i < patterns.length; ++i) {
      if (i !== index && patterns[i].pattern === pattern) {
        return i18nString(UIStrings.patternAlreadyExists);
      }
    }

    let regex;
    try {
      regex = new RegExp(pattern);
    } catch {
    }
    if (!regex) {
      return i18nString(UIStrings.patternMustBeAValidRegular);
    }
    return null;
  }
}
