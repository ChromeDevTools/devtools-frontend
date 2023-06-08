// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as UI from '../../ui/legacy/legacy.js';

import frameworkIgnoreListSettingsTabStyles from './frameworkIgnoreListSettingsTab.css.js';

const UIStrings = {
  /**
   *@description Header text content in Framework Ignore List Settings Tab of the Settings
   */
  frameworkIgnoreList: 'Framework Ignore List',
  /**
   *@description Text in Framework Ignore List Settings Tab of the Settings
   */
  debuggerWillSkipThroughThe: 'Debugger will skip through the scripts and will not stop on exceptions thrown by them.',
  /**
   *@description Text in Framework Ignore List Settings Tab of the Settings
   */
  ignoreListContentScripts: 'Content scripts injected by extensions',
  /**
   *@description Text in Framework Ignore List Settings Tab of the Settings
   */
  automaticallyIgnoreListKnownThirdPartyScripts: 'Known third-party scripts from source maps',
  /**
   *@description Text in Framework Ignore List Settings Tab of the Settings
   */
  enableIgnoreListing: 'Enable Ignore Listing',
  /**
   *@description Text in Framework Ignore List Settings Tab of the Settings
   */
  enableIgnoreListingTooltip: 'Uncheck to disable all ignore listing',
  /**
   *@description Text in Framework Ignore List Settings Tab of the Settings
   */
  generalExclusionRules: 'General exclusion rules:',
  /**
   *@description Text in Framework Ignore List Settings Tab of the Settings
   */
  customExclusionRules: 'Custom exclusion rules:',
  /**
   *@description Text of the add pattern button in Framework Ignore List Settings Tab of the Settings
   */
  addPattern: 'Add pattern...',
  /**
   *@description Aria accessible name in Framework Ignore List Settings Tab of the Settings
   */
  addFilenamePattern: 'Add filename pattern',
  /**
   *@description Pattern title in Framework Ignore List Settings Tab of the Settings
   *@example {ad.*?} PH1
   */
  ignoreScriptsWhoseNamesMatchS: 'Ignore scripts whose names match \'\'{PH1}\'\'',
  /**
   *@description Aria accessible name in Framework Ignore List Settings Tab of the Settings. It labels the input
   * field used to add new or edit existing regular expressions that match file names to ignore in the debugger.
   */
  pattern: 'Add Pattern',
  /**
   *@description Error message in Framework Ignore List settings pane that declares pattern must not be empty
   */
  patternCannotBeEmpty: 'Pattern cannot be empty',
  /**
   *@description Error message in Framework Ignore List settings pane that declares pattern already exits
   */
  patternAlreadyExists: 'Pattern already exists',
  /**
   *@description Error message in Framework Ignore List settings pane that declares pattern must be a valid regular expression
   */
  patternMustBeAValidRegular: 'Pattern must be a valid regular expression',
  /**
   *@description Text that is usually a hyperlink to more documentation
   */
  learnMore: 'Learn more',
};
const str_ = i18n.i18n.registerUIStrings('panels/settings/FrameworkIgnoreListSettingsTab.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let frameworkIgnoreListSettingsTabInstance: FrameworkIgnoreListSettingsTab;
export class FrameworkIgnoreListSettingsTab extends UI.Widget.VBox implements
    UI.ListWidget.Delegate<Common.Settings.RegExpSettingItem> {
  private readonly list: UI.ListWidget.ListWidget<Common.Settings.RegExpSettingItem>;
  private readonly setting: Common.Settings.RegExpSetting;
  private editor?: UI.ListWidget.Editor<Common.Settings.RegExpSettingItem>;

  constructor() {
    super(true);

    const header = this.contentElement.createChild('div', 'header');
    header.textContent = i18nString(UIStrings.frameworkIgnoreList);
    UI.ARIAUtils.markAsHeading(header, 1);

    this.contentElement.createChild('div', 'intro').textContent = i18nString(UIStrings.debuggerWillSkipThroughThe);

    const enabledSetting =
        Common.Settings.Settings.instance().moduleSetting('enableIgnoreListing') as Common.Settings.Setting<boolean>;
    const enableIgnoreListing = this.contentElement.createChild('div', 'ignore-list-global-enable');
    enableIgnoreListing.appendChild(
        UI.SettingsUI.createSettingCheckbox(i18nString(UIStrings.enableIgnoreListing), enabledSetting, true));
    UI.Tooltip.Tooltip.install(enableIgnoreListing, i18nString(UIStrings.enableIgnoreListingTooltip));

    const ignoreListOptions = this.contentElement.createChild('div', 'ignore-list-options');

    ignoreListOptions.createChild('div', 'ignore-list-option-group').textContent =
        i18nString(UIStrings.generalExclusionRules);

    const ignoreListContentScripts = ignoreListOptions.createChild('div', 'ignore-list-option');
    ignoreListContentScripts.appendChild(UI.SettingsUI.createSettingCheckbox(
        i18nString(UIStrings.ignoreListContentScripts),
        Common.Settings.Settings.instance().moduleSetting('skipContentScripts'), true));

    const automaticallyIgnoreList = ignoreListOptions.createChild('div', 'ignore-list-option');
    automaticallyIgnoreList.appendChild(UI.SettingsUI.createSettingCheckbox(
        i18nString(UIStrings.automaticallyIgnoreListKnownThirdPartyScripts),
        Common.Settings.Settings.instance().moduleSetting('automaticallyIgnoreListKnownThirdPartyScripts'), true));

    const automaticallyIgnoreLink = UI.XLink.XLink.create('http://goo.gle/skip-third-party');
    automaticallyIgnoreLink.textContent = '';
    automaticallyIgnoreLink.setAttribute('aria-label', i18nString(UIStrings.learnMore));

    const automaticallyIgnoreLinkIcon = new IconButton.Icon.Icon();
    automaticallyIgnoreLinkIcon.data = {iconName: 'help', color: 'var(--icon-default)', width: '16px', height: '16px'};
    automaticallyIgnoreLink.prepend(automaticallyIgnoreLinkIcon);
    automaticallyIgnoreList.appendChild(automaticallyIgnoreLink);

    ignoreListOptions.createChild('div', 'ignore-list-option-group').textContent =
        i18nString(UIStrings.customExclusionRules);

    this.list = new UI.ListWidget.ListWidget(this);
    this.list.element.classList.add('ignore-list');

    const placeholder = document.createElement('div');
    placeholder.classList.add('ignore-list-empty');
    this.list.setEmptyPlaceholder(placeholder);
    this.list.show(ignoreListOptions);
    const addPatternButton =
        UI.UIUtils.createTextButton(i18nString(UIStrings.addPattern), this.addButtonClicked.bind(this), 'add-button');
    UI.ARIAUtils.setLabel(addPatternButton, i18nString(UIStrings.addFilenamePattern));
    ignoreListOptions.appendChild(addPatternButton);
    this.setting =
        Common.Settings.Settings.instance().moduleSetting('skipStackFramesPattern') as Common.Settings.RegExpSetting;
    this.setting.addChangeListener(this.settingUpdated, this);

    this.setDefaultFocusedElement(addPatternButton);

    enabledSetting.addChangeListener(enabledChanged);
    enabledChanged();

    function enabledChanged(): void {
      const enabled = enabledSetting.get();
      if (enabled) {
        ignoreListOptions.classList.remove('ignore-listing-disabled');
      } else {
        ignoreListOptions.classList.add('ignore-listing-disabled');
      }
    }
  }

  static instance(opts = {forceNew: null}): FrameworkIgnoreListSettingsTab {
    const {forceNew} = opts;
    if (!frameworkIgnoreListSettingsTabInstance || forceNew) {
      frameworkIgnoreListSettingsTabInstance = new FrameworkIgnoreListSettingsTab();
    }

    return frameworkIgnoreListSettingsTabInstance;
  }

  override wasShown(): void {
    super.wasShown();
    this.list.registerCSSFiles([frameworkIgnoreListSettingsTabStyles]);
    this.registerCSSFiles([frameworkIgnoreListSettingsTabStyles]);
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

  renderItem(item: Common.Settings.RegExpSettingItem, _editable: boolean): Element {
    const element = document.createElement('div');

    const listSetting = this.setting;

    const checkbox = UI.UIUtils.CheckboxLabel.create(item.pattern, !item.disabled);
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
