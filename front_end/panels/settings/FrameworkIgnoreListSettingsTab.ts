// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as Cards from '../../ui/components/cards/cards.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import frameworkIgnoreListSettingsTabStyles from './frameworkIgnoreListSettingsTab.css.js';
import settingsScreenStyles from './settingsScreen.css.js';

const UIStrings = {
  /**
   *@description Header text content in Framework Ignore List Settings Tab of the Settings for enabling or disabling ignore listing
   */
  frameworkIgnoreList: 'Ignore listing',
  /**
   *@description Checkbox label in Framework Ignore List Settings Tab of the Settings
   */
  ignoreListingDescription:
      'When enabled, the debugger will skip over ignore-listed scripts and will ignore exceptions that only affect them and the Performance panel will collapse matching flamechart items.',
  /**
   *@description Text in Framework Ignore List Settings Tab of the Settings
   */
  ignoreListContentScripts: 'Content scripts injected by extensions',
  /**
   *@description Text in Framework Ignore List Settings Tab of the Settings
   */
  ignoreListAnonymousScripts: 'Anonymous scripts from eval or console',
  /**
   *@description Text in Framework Ignore List Settings Tab of the Settings
   */
  automaticallyIgnoreListKnownThirdPartyScripts: 'Known third-party scripts from source maps',
  /**
   *@description Text in Framework Ignore List Settings Tab of the Settings
   */
  enableIgnoreListing: 'Enable ignore listing',
  /**
   *@description Text in Framework Ignore List Settings Tab of the Settings
   */
  enableIgnoreListingTooltip: 'Uncheck to disable all ignore listing',
  /**
   *@description Text in Framework Ignore List Settings Tab of the Settings
   */
  generalExclusionRules: 'General exclusion rules',
  /**
   *@description Text in Framework Ignore List Settings Tab of the Settings
   */
  customExclusionRules: 'Custom exclusion rules',
  /**
   *@description Text of the add pattern button in Framework Ignore List Settings Tab of the Settings
   */
  addPattern: 'Add regex rule...',
  /**
   *@description Aria accessible name in Framework Ignore List Settings Tab of the Settings
   */
  addFilenamePattern: 'Add a regular expression rule for the script\'s URL',
  /**
   *@description Pattern title in Framework Ignore List Settings Tab of the Settings
   *@example {ad.*?} PH1
   */
  ignoreScriptsWhoseNamesMatchS: 'Ignore scripts whose names match \'\'{PH1}\'\'',
  /**
   *@description Aria accessible name in Framework Ignore List Settings Tab of the Settings. It labels the input
   * field used to add new or edit existing regular expressions that match file names to ignore in the debugger.
   */
  pattern: 'Add a regular expression rule for the script\'s URL',
  /**
   *@description Error message in Framework Ignore List settings pane that declares pattern must not be empty
   */
  patternCannotBeEmpty: 'Rule can\'t be empty',
  /**
   *@description Error message in Framework Ignore List settings pane that declares pattern already exits
   */
  patternAlreadyExists: 'Rule already exists',
  /**
   *@description Error message in Framework Ignore List settings pane that declares pattern must be a valid regular expression
   */
  patternMustBeAValidRegular: 'Rule must be a valid regular expression',
  /**
   *@description Text that is usually a hyperlink to more documentation
   */
  learnMore: 'Learn more',
};
const str_ = i18n.i18n.registerUIStrings('panels/settings/FrameworkIgnoreListSettingsTab.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class FrameworkIgnoreListSettingsTab extends UI.Widget.VBox implements
    UI.ListWidget.Delegate<Common.Settings.RegExpSettingItem> {
  private readonly list: UI.ListWidget.ListWidget<Common.Settings.RegExpSettingItem>;
  private readonly setting: Common.Settings.RegExpSetting;
  private editor?: UI.ListWidget.Editor<Common.Settings.RegExpSettingItem>;

  constructor() {
    super(true);
    this.element.setAttribute('jslog', `${VisualLogging.pane('blackbox')}`);

    const settingsContent =
        this.contentElement.createChild('div', 'settings-card-container-wrapper').createChild('div');
    settingsContent.classList.add('settings-card-container', 'ignore-list-settings');

    const ignoreListingDescription = document.createElement('span');
    ignoreListingDescription.textContent = i18nString(UIStrings.ignoreListingDescription);
    const enabledSetting =
        Common.Settings.Settings.instance().moduleSetting('enable-ignore-listing') as Common.Settings.Setting<boolean>;
    const enableIgnoreListing = this.contentElement.createChild('div', 'enable-ignore-listing');
    enableIgnoreListing.appendChild(
        UI.SettingsUI.createSettingCheckbox(i18nString(UIStrings.enableIgnoreListing), enabledSetting, true));
    UI.Tooltip.Tooltip.install(enableIgnoreListing, i18nString(UIStrings.enableIgnoreListingTooltip));

    const enableIgnoreListingCard = new Cards.Card.Card();
    enableIgnoreListingCard.data = {
      heading: i18nString(UIStrings.frameworkIgnoreList),
      content: [ignoreListingDescription, enableIgnoreListing],
    };
    settingsContent.appendChild(enableIgnoreListingCard);

    const generalExclusionGroup = this.createSettingGroup();
    generalExclusionGroup.classList.add('general-exclusion-group');
    const ignoreListContentScripts = generalExclusionGroup.createChild('div', 'ignore-list-option');
    ignoreListContentScripts.appendChild(UI.SettingsUI.createSettingCheckbox(
        i18nString(UIStrings.ignoreListContentScripts),
        Common.Settings.Settings.instance().moduleSetting('skip-content-scripts'), true));

    const automaticallyIgnoreList = generalExclusionGroup.createChild('div', 'ignore-list-option');
    automaticallyIgnoreList.appendChild(UI.SettingsUI.createSettingCheckbox(
        i18nString(UIStrings.automaticallyIgnoreListKnownThirdPartyScripts),
        Common.Settings.Settings.instance().moduleSetting('automatically-ignore-list-known-third-party-scripts'),
        true));

    const automaticallyIgnoreLinkButton = new Buttons.Button.Button();
    automaticallyIgnoreLinkButton.data = {
      iconName: 'help',
      variant: Buttons.Button.Variant.ICON,
      size: Buttons.Button.Size.SMALL,
      jslogContext: 'learn-more',
      title: i18nString(UIStrings.learnMore),
    };
    automaticallyIgnoreLinkButton.addEventListener(
        'click',
        () => Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(
            'http://goo.gle/skip-third-party' as Platform.DevToolsPath.UrlString));
    automaticallyIgnoreList.appendChild(automaticallyIgnoreLinkButton);

    const ignoreListAnonymousScripts = generalExclusionGroup.createChild('div', 'ignore-list-option');
    ignoreListAnonymousScripts.appendChild(UI.SettingsUI.createSettingCheckbox(
        i18nString(UIStrings.ignoreListAnonymousScripts),
        Common.Settings.Settings.instance().moduleSetting('skip-anonymous-scripts'), true));

    const generalExclusionGroupCard = new Cards.Card.Card();
    generalExclusionGroupCard.data = {
      heading: i18nString(UIStrings.generalExclusionRules),
      content: [generalExclusionGroup],
    };
    generalExclusionGroupCard.classList.add('ignore-list-options');
    settingsContent.appendChild(generalExclusionGroupCard);

    const customExclusionGroup = this.createSettingGroup();
    customExclusionGroup.classList.add('custom-exclusion-group');
    const customExclusionGroupCard = new Cards.Card.Card();
    customExclusionGroupCard.classList.add('ignore-list-options');
    customExclusionGroupCard.data = {
      heading: i18nString(UIStrings.customExclusionRules),
      content: [customExclusionGroup],
    };
    settingsContent.appendChild(customExclusionGroupCard);

    this.list = new UI.ListWidget.ListWidget(this);
    this.list.element.classList.add('ignore-list');

    const placeholder = document.createElement('div');
    placeholder.classList.add('ignore-list-empty');
    this.list.setEmptyPlaceholder(placeholder);
    this.list.show(customExclusionGroup);
    const addPatternButton = UI.UIUtils.createTextButton(
        i18nString(UIStrings.addPattern), this.addButtonClicked.bind(this),
        {className: 'add-button', jslogContext: 'settings.add-ignore-list-pattern'});
    UI.ARIAUtils.setLabel(addPatternButton, i18nString(UIStrings.addFilenamePattern));
    customExclusionGroup.appendChild(addPatternButton);
    this.setting =
        Common.Settings.Settings.instance().moduleSetting('skip-stack-frames-pattern') as Common.Settings.RegExpSetting;
    this.setting.addChangeListener(this.settingUpdated, this);

    enabledSetting.addChangeListener(enabledChanged);
    enabledChanged();

    function enabledChanged(): void {
      const enabled = enabledSetting.get();
      if (enabled) {
        settingsContent.classList.remove('ignore-listing-disabled');
      } else {
        settingsContent.classList.add('ignore-listing-disabled');
      }
    }
  }

  override wasShown(): void {
    super.wasShown();
    this.list.registerCSSFiles([frameworkIgnoreListSettingsTabStyles]);
    this.registerCSSFiles([frameworkIgnoreListSettingsTabStyles, settingsScreenStyles]);
    this.settingUpdated();
  }

  private settingUpdated(): void {
    this.list.clear();
    const patterns = this.setting.getAsArray();
    for (let i = 0; i < patterns.length; ++i) {
      this.list.appendItem(patterns[i], true);
    }
  }

  private addButtonClicked(): void {
    this.list.addNewItem(this.setting.getAsArray().length, {pattern: '', disabled: false});
  }

  private createSettingGroup(): HTMLElement {
    const group = document.createElement('div');
    group.classList.add('ignore-list-option-group');
    UI.ARIAUtils.markAsGroup(group);
    return group;
  }

  renderItem(item: Common.Settings.RegExpSettingItem, _editable: boolean): Element {
    const element = document.createElement('div');

    const listSetting = this.setting;

    const checkbox =
        UI.UIUtils.CheckboxLabel.create(item.pattern, !item.disabled, undefined, 'settings.ignore-list-pattern');
    const helpText = i18nString(UIStrings.ignoreScriptsWhoseNamesMatchS, {PH1: item.pattern});
    UI.Tooltip.Tooltip.install(checkbox, helpText);
    checkbox.checkboxElement.ariaLabel = helpText;
    checkbox.checkboxElement.addEventListener('change', inputChanged, false);
    element.appendChild(checkbox);
    element.classList.add('ignore-list-item');

    return element;

    function inputChanged(): void {
      const disabled = !checkbox.checkboxElement.checked;
      if (item.disabled !== disabled) {
        item.disabled = disabled;
        item.disabledForUrl = undefined;
        // Send changed event
        listSetting.setAsArray(listSetting.getAsArray());
      }
    }
  }

  removeItemRequested(item: Common.Settings.RegExpSettingItem, index: number): void {
    const patterns = this.setting.getAsArray();
    patterns.splice(index, 1);
    this.setting.setAsArray(patterns);
  }

  commitEdit(
      item: Common.Settings.RegExpSettingItem, editor: UI.ListWidget.Editor<Common.Settings.RegExpSettingItem>,
      isNew: boolean): void {
    item.pattern = editor.control('pattern').value.trim();

    const list = this.setting.getAsArray();
    if (isNew) {
      list.push(item);
    }
    this.setting.setAsArray(list);
  }

  beginEdit(item: Common.Settings.RegExpSettingItem): UI.ListWidget.Editor<Common.Settings.RegExpSettingItem> {
    const editor = this.createEditor();
    editor.control('pattern').value = item.pattern;
    return editor;
  }

  private createEditor(): UI.ListWidget.Editor<Common.Settings.RegExpSettingItem> {
    if (this.editor) {
      return this.editor;
    }

    const editor = new UI.ListWidget.Editor<Common.Settings.RegExpSettingItem>();
    this.editor = editor;
    const content = editor.contentElement();

    const titles = content.createChild('div', 'ignore-list-edit-row');
    titles.createChild('div', 'ignore-list-pattern').textContent = i18nString(UIStrings.pattern);

    const fields = content.createChild('div', 'ignore-list-edit-row');
    const pattern = editor.createInput('pattern', 'text', '/framework\\.js$', patternValidator.bind(this));
    UI.ARIAUtils.setLabel(pattern, i18nString(UIStrings.pattern));
    fields.createChild('div', 'ignore-list-pattern').appendChild(pattern);

    return editor;

    function patternValidator(
        this: FrameworkIgnoreListSettingsTab, item: Common.Settings.RegExpSettingItem, index: number,
        input: UI.ListWidget.EditorControl): UI.ListWidget.ValidatorResult {
      const pattern = input.value.trim();
      const patterns = this.setting.getAsArray();

      if (!pattern.length) {
        return {valid: false, errorMessage: i18nString(UIStrings.patternCannotBeEmpty)};
      }

      for (let i = 0; i < patterns.length; ++i) {
        if (i !== index && patterns[i].pattern === pattern) {
          return {valid: false, errorMessage: i18nString(UIStrings.patternAlreadyExists)};
        }
      }

      let regex;
      try {
        regex = new RegExp(pattern);
      } catch (e) {
      }
      if (!regex) {
        return {valid: false, errorMessage: i18nString(UIStrings.patternMustBeAValidRegular)};
      }
      return {valid: true, errorMessage: undefined};
    }
  }
}
