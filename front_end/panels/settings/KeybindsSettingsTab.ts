// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/kit/kit.js';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as SettingsUI from '../../ui/legacy/components/settings_ui/settings_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as Settings from '../../ui/settings/settings.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import keybindsSettingsTabStyles from './keybindsSettingsTab.css.js';
import settingsScreenStyles from './settingsScreen.css.js';

const {html, nothing, render, Directives: {classMap, repeat}} = Lit;

const UIStrings = {
  /**
   * @description Text for keyboard shortcuts.
   */
  shortcuts: 'Shortcuts',
  /**
   * @description Text appearing before a select control offering users their choice of keyboard shortcut presets.
   */
  matchShortcutsFromPreset: 'Shortcut preset',
  /**
   * @description Screen reader label for list of keyboard shortcuts in Settings.
   */
  keyboardShortcutsList: 'Keyboard shortcuts list',
  /**
   * @description Screen reader label for an icon denoting a shortcut that has been changed from its default.
   */
  shortcutModified: 'Shortcut modified',
  /**
   * @description Screen reader label for an empty shortcut cell in custom shortcuts settings tab.
   */
  noShortcutForAction: 'No shortcut for action',
  /**
   * @description Link text in the settings tab to add another shortcut for an action.
   */
  addAShortcut: 'Add a shortcut',
  /**
   * @description Placeholder text in the settings tab when adding a new shortcut, explaining that keystrokes are going to be recorded.
   */
  recordingKeys: 'Recording keys',
  /**
   * @description Label for a button in the settings tab that confirms changes to a keyboard shortcut.
   */
  confirmChanges: 'Confirm changes',
  /**
   * @description Label for a button in the settings tab that discards changes to the shortcut being edited.
   */
  discardChanges: 'Discard changes',
  /**
   * @description Label for a button in the settings tab that removes a keyboard shortcut.
   */
  removeShortcut: 'Remove shortcut',
  /**
   * @description Label for a button in the settings tab that edits a keyboard shortcut.
   */
  editShortcut: 'Edit shortcut',
  /**
   * @description Message shown in Settings when the user inputs a modifier-only shortcut such as Ctrl+Shift.
   */
  shortcutsCannotContainOnly: 'Shortcuts can’t contain only modifier keys',
  /**
   * @description Message shown in shortcuts settings when the user inputs a shortcut that is already in use.
   * @example {Performance} PH1
   * @example {Start/stop recording} PH2
   */
  thisShortcutIsInUseByS: 'This shortcut is in use by {PH1}: {PH2}',
  /**
   * @description Message shown in Settings when restoring default shortcuts.
   */
  RestoreDefaultShortcuts: 'Restore default shortcuts',
  /**
   * @description Message shown in Settings to show the full list of keyboard shortcuts.
   */
  FullListOfDevtoolsKeyboard: 'Full list of DevTools keyboard shortcuts and gestures',
  /**
   * @description Label for a button in the shortcut editor that resets all shortcuts for the current action.
   */
  ResetShortcutsForAction: 'Reset shortcuts for action',
  /**
   * @description Screen reader announcement for shortcut removed.
   * @example {Start/stop recording} PH1
   */
  shortcutRemoved: '{PH1} Shortcut removed',
  /**
   * @description Screen reader announcement for shortcut restored to default.
   */
  shortcutChangesRestored: 'Changes to shortcut restored to default',
  /**
   * @description Screen reader announcement for applied shortcut changes.
   */
  shortcutChangesApplied: 'Changes to shortcut applied',
  /**
   * @description Screen reader announcement for discarded shortcut changes.
   */
  shortcutChangesDiscarded: 'Changes to shortcut discarded',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/settings/KeybindsSettingsTab.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface ShortcutRowViewData {
  shortcut: UI.KeyboardShortcut.KeyboardShortcut;
  isModified: boolean;
  value: string;
  keys: string[];
  isInvalid: boolean;
  isAutofocus: boolean;
}

export interface ActionRowViewData {
  action: UI.ActionRegistration.Action;
  actionId: string;
  actionTitle: string;
  isEditing: boolean;
  isAutofocus: boolean;
  tabIndex: number;
  hasEmptyInfo: boolean;
  hasDefaultShortcutWhenEmpty: boolean;
  rows: ShortcutRowViewData[];
  errorMessage: string|null;
  isConfirmDisabled: boolean;
}

export type KeybindsViewItem = UI.ActionRegistration.ActionCategory|ActionRowViewData;

export interface ViewInput {
  keybindsSetSetting: Common.Settings.Setting<string>;
  items: KeybindsViewItem[];
  onRestoreDefaultShortcuts: () => void;
  onListKeyDown: (event: KeyboardEvent) => void;
  onActionFocused: (action: UI.ActionRegistration.Action) => void;
  onStartEditing: (action: UI.ActionRegistration.Action) => void;
  onAddShortcut: () => void;
  onResetShortcutsToDefaults: () => void;
  onConfirmChanges: () => void;
  onDiscardChanges: () => void;
  onEditingRowKeyDown: (event: KeyboardEvent) => void;
  onShortcutInputKeyDown: (shortcut: UI.KeyboardShortcut.KeyboardShortcut, event: KeyboardEvent) => void;
  onShortcutInputFocus: (shortcut: UI.KeyboardShortcut.KeyboardShortcut) => void;
  onShortcutInputBlur: () => void;
  onDeleteShortcut: (shortcut: UI.KeyboardShortcut.KeyboardShortcut) => void;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement|DocumentFragment) => void;

function renderActionRow(item: ActionRowViewData, input: ViewInput): Lit.LitTemplate {
  const renderEditButton = (): Lit.LitTemplate => html`
    <devtools-button
      class="keybinds-edit-button"
      title=${i18nString(UIStrings.editShortcut)}
      aria-label=${i18nString(UIStrings.editShortcut)}
      .iconName=${'edit'}
      .variant=${Buttons.Button.Variant.ICON}
      .jslogContext=${'edit'}
      @click=${() => input.onStartEditing(item.action)}>
    </devtools-button>
  `;

  // clang-format off
  return html`
    <div
      class="keybinds-list-item-wrapper"
      @focusin=${() => input.onActionFocused(item.action)}>
      <div
        class=${classMap({
          'keybinds-list-item': true,
          'keybinds-editing': item.isEditing,
        })}
        role="listitem"
        aria-level="2"
        tabindex=${item.tabIndex}
        ?autofocus=${item.isAutofocus}
        jslog=${VisualLogging.item().context(item.actionId).track({keydown: 'Escape', resize: true})}
        @keydown=${item.isEditing ? input.onEditingRowKeyDown : nothing}>
        <div class="keybinds-action-name keybinds-list-text">${item.actionTitle}</div>
        ${repeat(item.rows, row => row.shortcut, (row, index) => html`
          ${row.isModified ? html`
            <devtools-icon
              class="keybinds-modified"
              name="keyboard-pen"
              aria-label=${i18nString(UIStrings.shortcutModified)}>
            </devtools-icon>
          ` : nothing}
          <div class="keybinds-shortcut keybinds-list-text">
            ${item.isEditing ? html`
              <input
                class=${classMap({
                  'harmony-input': true,
                  'error-input': row.isInvalid,
                })}
                jslog=${VisualLogging.textField().track({change: true})}
                placeholder=${i18nString(UIStrings.recordingKeys)}
                .spellcheck=${false}
                maxlength="0"
                ?autofocus=${row.isAutofocus}
                aria-invalid=${row.isInvalid ? 'true' : 'false'}
                .value=${row.value}
                @keydown=${(event: KeyboardEvent) => input.onShortcutInputKeyDown(row.shortcut, event)}
                @focus=${() => input.onShortcutInputFocus(row.shortcut)}
                @blur=${input.onShortcutInputBlur}
              />
              <devtools-button
                class="keybinds-delete-button"
                title=${i18nString(UIStrings.removeShortcut)}
                aria-label=${i18nString(UIStrings.removeShortcut)}
                .iconName=${'bin'}
                .variant=${Buttons.Button.Variant.ICON}
                .jslogContext=${'delete'}
                @click=${() => input.onDeleteShortcut(row.shortcut)}>
              </devtools-button>
            ` : html`
              ${row.keys.map(key => html`
                <div class="keybinds-key"><span>${key}</span></div>
              `)}
            `}
          </div>
          ${!item.isEditing && index === 0 ? renderEditButton() : nothing}
        `)}
        ${item.hasEmptyInfo ? html`
          ${item.hasDefaultShortcutWhenEmpty ? html`
            <devtools-icon
              class="keybinds-modified"
              name="keyboard-pen"
              aria-label=${i18nString(UIStrings.shortcutModified)}>
            </devtools-icon>
          ` : nothing}
          ${!item.isEditing ? html`
            <div
              class="keybinds-shortcut keybinds-list-text"
              aria-label=${i18nString(UIStrings.noShortcutForAction)}>
            </div>
            ${renderEditButton()}
          ` : nothing}
        ` : nothing}
        ${item.isEditing ? html`
          <div class="keybinds-shortcut">
            <devtools-button
              .variant=${Buttons.Button.Variant.OUTLINED}
              .jslogContext=${'add-shortcut'}
              ?autofocus=${item.rows.length === 0}
              @click=${input.onAddShortcut}>
              ${i18nString(UIStrings.addAShortcut)}
            </devtools-button>
          </div>
          <div
            class=${classMap({
              'keybinds-info': true,
              'keybinds-error': true,
              hidden: !item.errorMessage,
            })}
            role="alert"
            aria-live="polite">
            ${item.errorMessage ?? ''}
          </div>
          <devtools-button
            title=${i18nString(UIStrings.ResetShortcutsForAction)}
            aria-label=${i18nString(UIStrings.ResetShortcutsForAction)}
            .iconName=${'undo'}
            .variant=${Buttons.Button.Variant.ICON}
            .jslogContext=${'undo'}
            @click=${input.onResetShortcutsToDefaults}>
          </devtools-button>
          <devtools-button
            class="keybinds-confirm-button"
            title=${i18nString(UIStrings.confirmChanges)}
            aria-label=${i18nString(UIStrings.confirmChanges)}
            .iconName=${'checkmark'}
            .variant=${Buttons.Button.Variant.ICON}
            .jslogContext=${'confirm'}
            .disabled=${item.isConfirmDisabled}
            @click=${input.onConfirmChanges}>
          </devtools-button>
          <devtools-button
            class="keybinds-cancel-button"
            title=${i18nString(UIStrings.discardChanges)}
            aria-label=${i18nString(UIStrings.discardChanges)}
            .iconName=${'cross'}
            .variant=${Buttons.Button.Variant.ICON}
            .jslogContext=${'cancel'}
            @click=${input.onDiscardChanges}>
          </devtools-button>
        ` : nothing}
      </div>
    </div>
  `;
  // clang-format on
}

export const DEFAULT_VIEW: View = (input, _output, target) => {
  // clang-format off
  render(
      html`
        <style>${keybindsSettingsTabStyles}</style>
        <style>${settingsScreenStyles}</style>
        <div class="settings-card-container-wrapper">
          <div class="settings-card-container">
            <devtools-card heading=${i18nString(UIStrings.shortcuts)}>
              <div class="keybinds-set-select">
                ${SettingsUI.SettingsUI.renderControlForSetting(
                    input.keybindsSetSetting, i18nString(UIStrings.matchShortcutsFromPreset))}
              </div>
              <div
                class="shortcut-list"
                role="list"
                aria-label=${i18nString(UIStrings.keyboardShortcutsList)}
                @keydown=${input.onListKeyDown}>
                ${repeat(
                    input.items,
                    item => typeof item === 'string' ? item : item.actionId,
                    item => {
                      if (typeof item === 'string') {
                        return html`
                          <div
                            class="keybinds-category-header"
                            role="listitem"
                            aria-level="1"
                            tabindex="-1">
                            ${UI.ActionRegistration.getLocalizedActionCategory(item)}
                          </div>
                        `;
                      }
                      return renderActionRow(item, input);
                    })}
              </div>
              <div class="keybinds-footer">
                <devtools-link
                  class="docs-link"
                  href="https://developer.chrome.com/docs/devtools/shortcuts/"
                  jslogcontext="learn-more">
                  ${i18nString(UIStrings.FullListOfDevtoolsKeyboard)}
                </devtools-link>
                <devtools-button
                  .variant=${Buttons.Button.Variant.OUTLINED}
                  .jslogContext=${'restore-default-shortcuts'}
                  @click=${input.onRestoreDefaultShortcuts}>
                  ${i18nString(UIStrings.RestoreDefaultShortcuts)}
                </devtools-button>
              </div>
            </devtools-card>
          </div>
        </div>
      `,
      target,
      {
        container: {
          classes: ['flex-auto'],
          attributes: {
            jslog: `${VisualLogging.pane('keybinds')}`,
          },
        },
      });
  // clang-format on
};

export class KeybindsSettingsTab extends UI.Widget.VBox<ShadowRoot> {
  readonly #items: KeybindsItem[];
  readonly #actions: UI.ActionRegistration.Action[];
  #selectedItem: UI.ActionRegistration.Action|null = null;
  #editingItem: UI.ActionRegistration.Action|null = null;
  #editingShortcuts: UI.KeyboardShortcut.KeyboardShortcut[] = [];
  readonly #editedShortcuts = new Map<UI.KeyboardShortcut.KeyboardShortcut, UI.KeyboardShortcut.Descriptor[]|null>();
  #focusedShortcut: UI.KeyboardShortcut.KeyboardShortcut|null = null;
  #validated = false;
  #secondKeyTimeout: number|null = null;
  readonly #keybindsSetSetting: Common.Settings.Setting<string>;
  readonly #userShortcutsSetting: Common.Settings.Setting<unknown>;
  readonly #view: View;

  constructor(view: View = DEFAULT_VIEW) {
    super({useShadowDom: 'pure'});
    this.#view = view;

    this.#keybindsSetSetting =
        Common.Settings.Settings.instance().resolve(Settings.MainSettings.activeKeybindSetSettingDescriptor);
    this.#userShortcutsSetting =
        Common.Settings.Settings.instance().resolve(Settings.MainSettings.userShortcutsSettingDescriptor);
    this.#keybindsSetSetting.addChangeListener(this.update, this);

    this.#items = this.#createListItems();
    this.#actions = this.#items.filter((item): item is UI.ActionRegistration.Action =>
                                           item instanceof UI.ActionRegistration.Action);
    this.#selectedItem = this.#actions[0] ?? null;

    this.requestUpdate();
  }

  override wasShown(): void {
    super.wasShown();
    this.performUpdate();
  }

  #onRestoreDefaultShortcuts(): void {
    this.#userShortcutsSetting.set([]);
    this.#keybindsSetSetting.set(UI.ShortcutRegistry.DefaultShortcutSetting);
  }

  #buildActionRowViewData(item: UI.ActionRegistration.Action): ActionRowViewData {
    const isEditing = item === this.#editingItem;
    const isSelected = item === this.#selectedItem;
    const isAutofocus = isSelected && !this.#editingItem;
    const tabIndex = isSelected && !isEditing ? 0 : -1;
    const shortcuts = isEditing ? this.#editingShortcuts :
                                  UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutsForAction(item.id());

    const separator = Host.Platform.isMac() ? '\u2004' : ' + ';
    let errorMessage: string|null = null;
    let isConfirmDisabled = false;
    const rows: ShortcutRowViewData[] = [];

    for (const shortcut of shortcuts) {
      if (isEditing && this.#editedShortcuts.has(shortcut) && !this.#editedShortcuts.get(shortcut)) {
        continue;
      }
      const isModified = shortcut.type !== UI.KeyboardShortcut.Type.UNSET_SHORTCUT && !shortcut.isDefault();
      const userDescriptors = isEditing ? this.#editedShortcuts.get(shortcut) : undefined;
      const value = userDescriptors ? this.#shortcutInputTextForDescriptors(userDescriptors) : shortcut.title();
      const keys = shortcut.descriptors.flatMap(descriptor => descriptor.name.split(separator));

      let isInvalid = false;
      if (isEditing && this.#validated && userDescriptors) {
        if (userDescriptors.some(descriptor => UI.KeyboardShortcut.KeyboardShortcut.isModifier(descriptor.key))) {
          isConfirmDisabled = true;
          isInvalid = true;
          errorMessage = i18nString(UIStrings.shortcutsCannotContainOnly);
        } else {
          const conflicts = UI.ShortcutRegistry.ShortcutRegistry.instance()
                                .actionsForDescriptors(userDescriptors)
                                .filter(actionId => actionId !== item.id());
          if (conflicts.length) {
            isConfirmDisabled = true;
            isInvalid = true;
            if (UI.ActionRegistry.ActionRegistry.instance().hasAction(conflicts[0])) {
              const action = UI.ActionRegistry.ActionRegistry.instance().getAction(conflicts[0]);
              errorMessage =
                  i18nString(UIStrings.thisShortcutIsInUseByS, {PH1: action.category(), PH2: action.title()});
            }
          }
        }
      }

      rows.push({
        shortcut,
        isModified,
        value,
        keys,
        isInvalid,
        isAutofocus: false,
      });
    }

    if (isEditing && rows.length > 0) {
      const autofocusRow = rows.find(row => row.shortcut === this.#focusedShortcut) ?? rows[0];
      autofocusRow.isAutofocus = true;
    }

    return {
      action: item,
      actionId: item.id(),
      actionTitle: item.title(),
      isEditing,
      isAutofocus,
      tabIndex,
      hasEmptyInfo: shortcuts.length === 0,
      hasDefaultShortcutWhenEmpty:
          shortcuts.length === 0 && UI.ShortcutRegistry.ShortcutRegistry.instance().actionHasDefaultShortcut(item.id()),
      rows,
      errorMessage,
      isConfirmDisabled,
    };
  }

  override performUpdate(): void {
    const viewItems: KeybindsViewItem[] =
        this.#items.map(item => typeof item === 'string' ? item : this.#buildActionRowViewData(item));
    this.#view(
        {
          keybindsSetSetting: this.#keybindsSetSetting,
          items: viewItems,
          onRestoreDefaultShortcuts: this.#onRestoreDefaultShortcuts.bind(this),
          onListKeyDown: this.#onListKeyDown.bind(this),
          onActionFocused: this.#onActionFocused.bind(this),
          onStartEditing: this.startEditing.bind(this),
          onAddShortcut: this.#addShortcut.bind(this),
          onResetShortcutsToDefaults: this.#resetShortcutsToDefaults.bind(this),
          onConfirmChanges: this.#onConfirmChanges.bind(this),
          onDiscardChanges: this.#onDiscardChanges.bind(this),
          onEditingRowKeyDown: this.#onEditingRowKeyDown.bind(this),
          onShortcutInputKeyDown: this.#onShortcutInputKeyDown.bind(this),
          onShortcutInputFocus: this.#onShortcutInputFocus.bind(this),
          onShortcutInputBlur: this.#onShortcutInputBlur.bind(this),
          onDeleteShortcut: this.#onDeleteShortcut.bind(this),
        },
        undefined,
        this.contentElement,
    );
  }

  #onActionFocused(action: UI.ActionRegistration.Action): void {
    if (this.#selectedItem === action) {
      return;
    }
    this.#selectedItem = action;
    this.performUpdate();
  }

  #onListKeyDown(event: KeyboardEvent): void {
    if (this.#editingItem || this.#actions.length === 0) {
      return;
    }
    const currentIndex = this.#selectedItem ? this.#actions.indexOf(this.#selectedItem) : -1;
    let nextIndex = -1;
    switch (event.key) {
      case 'ArrowDown':
      case 'PageDown':
        nextIndex = currentIndex < this.#actions.length - 1 ? currentIndex + 1 : this.#actions.length - 1;
        break;
      case 'ArrowUp':
      case 'PageUp':
        nextIndex = currentIndex > 0 ? currentIndex - 1 : 0;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = this.#actions.length - 1;
        break;
      default:
        return;
    }
    event.consume(true);
    const nextAction = this.#actions[nextIndex];
    if (nextAction) {
      this.#selectedItem = nextAction;
      this.performUpdate();
      this.focus();
    }
  }

  commitChanges(
      item: UI.ActionRegistration.Action,
      editedShortcuts: Map<UI.KeyboardShortcut.KeyboardShortcut, UI.KeyboardShortcut.Descriptor[]|null>): void {
    for (const [originalShortcut, newDescriptors] of editedShortcuts) {
      if (originalShortcut.type !== UI.KeyboardShortcut.Type.UNSET_SHORTCUT) {
        UI.ShortcutRegistry.ShortcutRegistry.instance().removeShortcut(originalShortcut);
        if (!newDescriptors) {
          Host.userMetrics.actionTaken(Host.UserMetrics.Action.ShortcutRemoved);
        }
      }
      if (newDescriptors) {
        UI.ShortcutRegistry.ShortcutRegistry.instance().registerUserShortcut(
            originalShortcut.changeKeys(newDescriptors).changeType(UI.KeyboardShortcut.Type.USER_SHORTCUT));
        if (originalShortcut.type === UI.KeyboardShortcut.Type.UNSET_SHORTCUT) {
          Host.userMetrics.actionTaken(Host.UserMetrics.Action.UserShortcutAdded);
        } else {
          Host.userMetrics.actionTaken(Host.UserMetrics.Action.ShortcutModified);
        }
      }
    }
    this.stopEditing(item);
  }

  startEditing(action: UI.ActionRegistration.Action): void {
    this.#selectedItem = action;
    if (this.#editingItem) {
      this.stopEditing(this.#editingItem);
    }
    UI.UIUtils.markBeingEdited(this.element, true);
    this.#editingItem = action;
    this.#editedShortcuts.clear();
    this.#focusedShortcut = null;
    this.#validated = false;
    this.#editingShortcuts = UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutsForAction(action.id());
    this.performUpdate();
    this.focus();
  }

  stopEditing(_action: UI.ActionRegistration.Action): void {
    if (this.#secondKeyTimeout !== null) {
      clearTimeout(this.#secondKeyTimeout);
      this.#secondKeyTimeout = null;
    }
    UI.UIUtils.markBeingEdited(this.element, false);
    this.#editingItem = null;
    this.#editingShortcuts = [];
    this.#editedShortcuts.clear();
    this.#focusedShortcut = null;
    this.#validated = false;
    this.performUpdate();
    this.focus();
  }

  #onConfirmChanges(): void {
    if (!this.#editingItem) {
      return;
    }
    const item = this.#editingItem;
    this.commitChanges(item, this.#editedShortcuts);
    UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.shortcutChangesApplied, {PH1: item.title()}));
  }

  #onDiscardChanges(): void {
    if (!this.#editingItem) {
      return;
    }
    this.stopEditing(this.#editingItem);
    UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.shortcutChangesDiscarded));
  }

  #onEditingRowKeyDown(event: KeyboardEvent): void {
    if (this.#editingItem && Platform.KeyboardUtilities.isEscKey(event)) {
      this.stopEditing(this.#editingItem);
      event.consume(true);
    }
  }

  #onShortcutInputFocus(shortcut: UI.KeyboardShortcut.KeyboardShortcut): void {
    this.#focusedShortcut = shortcut;
  }

  #onShortcutInputBlur(): void {
    this.#focusedShortcut = null;
    if (this.#secondKeyTimeout !== null) {
      clearTimeout(this.#secondKeyTimeout);
      this.#secondKeyTimeout = null;
    }
  }

  #onDeleteShortcut(shortcut: UI.KeyboardShortcut.KeyboardShortcut): void {
    if (!this.#editingItem) {
      return;
    }
    const index = this.#editingShortcuts.indexOf(shortcut);
    if (!shortcut.isDefault() && index !== -1) {
      this.#editingShortcuts.splice(index, 1);
    }
    this.#editedShortcuts.set(shortcut, null);
    this.#focusedShortcut = null;
    this.#validated = true;
    this.performUpdate();
    this.focus();
    UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.shortcutRemoved, {PH1: this.#editingItem.title()}));
  }

  #addShortcut(): void {
    if (!this.#editingItem) {
      return;
    }
    const shortcut =
        new UI.KeyboardShortcut.KeyboardShortcut([], this.#editingItem.id(), UI.KeyboardShortcut.Type.UNSET_SHORTCUT);
    this.#editingShortcuts.push(shortcut);
    this.#focusedShortcut = shortcut;
    this.performUpdate();
    this.focus();
  }

  #onShortcutInputKeyDown(shortcut: UI.KeyboardShortcut.KeyboardShortcut, event: Event): void {
    if ((event as KeyboardEvent).key !== 'Tab') {
      const eventDescriptor = this.#descriptorForEvent(event as KeyboardEvent);
      const userDescriptors = this.#editedShortcuts.get(shortcut) || [];
      this.#editedShortcuts.set(shortcut, userDescriptors);
      const isLastKeyOfShortcut =
          userDescriptors.length === 2 && UI.KeyboardShortcut.KeyboardShortcut.isModifier(userDescriptors[1].key);
      const shouldClearOldShortcut = userDescriptors.length === 2 && !isLastKeyOfShortcut;
      if (shouldClearOldShortcut) {
        userDescriptors.splice(0, 2);
      }
      if (this.#secondKeyTimeout) {
        clearTimeout(this.#secondKeyTimeout);
        this.#secondKeyTimeout = null;
        userDescriptors.push(eventDescriptor);
      } else if (isLastKeyOfShortcut) {
        userDescriptors[1] = eventDescriptor;
      } else if (!UI.KeyboardShortcut.KeyboardShortcut.isModifier(eventDescriptor.key)) {
        userDescriptors[0] = eventDescriptor;
        this.#secondKeyTimeout = window.setTimeout(() => {
          this.#secondKeyTimeout = null;
        }, UI.ShortcutRegistry.KeyTimeout);
      } else {
        userDescriptors[0] = eventDescriptor;
      }
      this.#validated = true;
      this.performUpdate();
      event.consume(true);
    }
  }

  #descriptorForEvent(event: KeyboardEvent): UI.KeyboardShortcut.Descriptor {
    const userKey = UI.KeyboardShortcut.KeyboardShortcut.makeKeyFromEvent(event);
    const codeAndModifiers = UI.KeyboardShortcut.KeyboardShortcut.keyCodeAndModifiersFromKey(userKey);
    let key: UI.KeyboardShortcut.Key|string =
        UI.KeyboardShortcut.Keys[event.key] || UI.KeyboardShortcut.KeyBindings[event.key];

    if (!key && !/^[a-z]$/i.test(event.key)) {
      const keyCode = event.code;
      // if we still don't have a key name, let's try the code before falling back to the raw key
      key = UI.KeyboardShortcut.Keys[keyCode] || UI.KeyboardShortcut.KeyBindings[keyCode];
      if (keyCode.startsWith('Digit')) {
        key = keyCode.slice(5);
      } else if (keyCode.startsWith('Key')) {
        key = keyCode.slice(3);
      }
    }

    return UI.KeyboardShortcut.KeyboardShortcut.makeDescriptor(key || event.key, codeAndModifiers.modifiers);
  }

  #shortcutInputTextForDescriptors(descriptors: UI.KeyboardShortcut.Descriptor[]): string {
    return descriptors.map(descriptor => descriptor.name).join(' ');
  }

  #resetShortcutsToDefaults(): void {
    if (!this.#editingItem) {
      return;
    }
    this.#editedShortcuts.clear();
    for (const shortcut of this.#editingShortcuts) {
      if (shortcut.type === UI.KeyboardShortcut.Type.UNSET_SHORTCUT) {
        const index = this.#editingShortcuts.indexOf(shortcut);
        this.#editingShortcuts.splice(index, 1);
      } else if (shortcut.type === UI.KeyboardShortcut.Type.USER_SHORTCUT) {
        this.#editedShortcuts.set(shortcut, null);
      }
    }
    const disabledDefaults =
        UI.ShortcutRegistry.ShortcutRegistry.instance().disabledDefaultsForAction(this.#editingItem.id());
    disabledDefaults.forEach(shortcut => {
      if (this.#editingShortcuts.includes(shortcut)) {
        return;
      }

      this.#editingShortcuts.push(shortcut);
      this.#editedShortcuts.set(shortcut, shortcut.descriptors);
    });
    this.#focusedShortcut = null;
    this.#validated = false;
    this.performUpdate();
    this.focus();
    UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.shortcutChangesRestored, {PH1: this.#editingItem.title()}));
  }

  #createListItems(): KeybindsItem[] {
    const actions = UI.ActionRegistry.ActionRegistry.instance()
                        .actions()
                        .filter(action => action.configurableBindings())
                        .sort((actionA, actionB) => {
                          if (actionA.category() < actionB.category()) {
                            return -1;
                          }
                          if (actionA.category() > actionB.category()) {
                            return 1;
                          }
                          if (actionA.id() < actionB.id()) {
                            return -1;
                          }
                          if (actionA.id() > actionB.id()) {
                            return 1;
                          }
                          return 0;
                        });

    const items: KeybindsItem[] = [];

    let currentCategory: UI.ActionRegistration.ActionCategory;
    actions.forEach(action => {
      if (currentCategory !== action.category()) {
        items.push(action.category());
      }
      items.push(action);
      currentCategory = action.category();
    });
    return items;
  }

  onEscapeKeyPressed(event: Event): void {
    if (this.#editingItem && this.#focusedShortcut &&
        UI.DOMUtilities.deepActiveElement(document)?.nodeName === 'INPUT') {
      this.#onShortcutInputKeyDown(this.#focusedShortcut, event);
    }
  }

  update(): void {
    if (this.#editingItem) {
      this.stopEditing(this.#editingItem);
    }
    if (!this.#selectedItem && this.#actions.length > 0) {
      this.#selectedItem = this.#actions[0];
    }
    this.performUpdate();
  }

  override willHide(): void {
    super.willHide();
    if (this.#editingItem) {
      this.stopEditing(this.#editingItem);
    }
  }
}

export type KeybindsItem = UI.ActionRegistration.ActionCategory|UI.ActionRegistration.Action;
