// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../kit/kit.js';
import '../../../components/highlighting/highlighting.js';

import * as Common from '../../../../core/common/common.js';
import * as Host from '../../../../core/host/host.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as Diff from '../../../../third_party/diff/diff.js';
import {html, nothing, type TemplateResult} from '../../../lit/lit.js';
import * as SettingsUI from '../../../settings/settings.js';
import * as UI from '../../legacy.js';

import {FilteredListWidget, Provider, registerProvider} from './FilteredListWidget.js';
import {QuickOpenImpl} from './QuickOpen.js';

const UIStrings = {
  /**
   * @description Warning message displayed when a setting change requires reloading DevTools.
   */
  settingsChangedReloadDevTools: 'Settings changed. To apply, reload DevTools.',
  /**
   * @description Message shown when no commands match the query in the command menu.
   */
  noCommandsFound: 'No commands found',
  /**
   * @description Prefix text for the prompt in the command menu.
   */
  run: 'Run',
  /**
   * @description Suggestion placeholder text for the prompt in the command menu.
   */
  command: 'Command',
  /**
   * @description Title for the command menu entry in the help menu.
   */
  runCommand: 'Run command',
} as const;
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/quick_open/CommandMenu.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let commandMenuInstance: CommandMenu;

export class CommandMenu {
  readonly #commands: Command[];
  private constructor() {
    this.#commands = [];
    this.loadCommands();
  }

  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): CommandMenu {
    const {forceNew} = opts;
    if (!commandMenuInstance || forceNew) {
      commandMenuInstance = new CommandMenu();
    }
    return commandMenuInstance;
  }

  static createCommand(options: CreateCommandOptions): Command {
    const {
      category,
      keys,
      title,
      shortcut,
      jslogContext,
      executeHandler,
      availableHandler,
      userActionCode,
      isPanelOrDrawer,
      featurePromotionId,
    } = options;

    let handler = executeHandler;
    if (userActionCode) {
      const actionCode = userActionCode;
      handler = () => {
        Host.userMetrics.actionTaken(actionCode);
        executeHandler();
        // not here
      };
    }
    return new Command(category, title, keys, shortcut, jslogContext, handler, availableHandler, isPanelOrDrawer,
                       featurePromotionId);
  }

  static createSettingCommand<V>(setting: Common.Settings.Setting<V>, title: Common.UIString.LocalizedString, value: V,
                                 settingUI?: SettingsUI.SettingUIRegistration.SettingUI): Command {
    const ui = settingUI ?? SettingsUI.SettingUIRegistration.maybeResolve(setting.descriptor());
    const category = ui?.category;
    if (!category || !ui) {
      throw new Error(`Creating '${title}' setting command failed. Setting has no category.`);
    }
    const tags = ui.tags;
    const reloadRequired = ui.reloadRequired;

    return CommandMenu.createCommand({
      category: Common.Settings.getLocalizedSettingsCategory(category),
      keys: tags,
      title,
      shortcut: '',
      jslogContext: Platform.StringUtilities.toKebabCase(`${setting.name}-${value}`),
      executeHandler: () => {
        setting.set(value);

        if (setting.name === 'emulate-page-focus') {
          Host.userMetrics.actionTaken(Host.UserMetrics.Action.ToggleEmulateFocusedPageFromCommandMenu);
        }

        if (reloadRequired) {
          UI.InspectorView.InspectorView.instance().displayReloadRequiredWarning(
              i18nString(UIStrings.settingsChangedReloadDevTools));
        }
      },
      availableHandler: () => setting.get() !== value,
    });
  }

  static createActionCommand(options: ActionCommandOptions): Command {
    const {action, userActionCode} = options;
    const category = action.category();
    if (!category) {
      throw new Error(`Creating '${action.title()}' action command failed. Action has no category.`);
    }

    let panelOrDrawer = undefined;
    if (category === UI.ActionRegistration.ActionCategory.DRAWER) {
      panelOrDrawer = PanelOrDrawer.DRAWER;
    }

    const shortcut = UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutTitleForAction(action.id()) || '';

    return CommandMenu.createCommand({
      category: UI.ActionRegistration.getLocalizedActionCategory(category),
      keys: action.tags() || '',
      title: action.title(),
      shortcut,
      jslogContext: action.id(),
      executeHandler: action.execute.bind(action),
      userActionCode,
      isPanelOrDrawer: panelOrDrawer,
    });
  }

  static createRevealViewCommand(options: RevealViewCommandOptions): Command {
    const {title, tags, category, userActionCode, id, featurePromotionId} = options;
    if (!category) {
      throw new Error(`Creating '${title}' reveal view command failed. Reveal view has no category.`);
    }
    let panelOrDrawer = undefined;
    if (category === UI.ViewManager.ViewLocationCategory.PANEL) {
      panelOrDrawer = PanelOrDrawer.PANEL;
    } else if (category === UI.ViewManager.ViewLocationCategory.DRAWER) {
      panelOrDrawer = PanelOrDrawer.DRAWER;
    }

    const executeHandler = (): Promise<void> => {
      if (id === 'issues-pane') {
        Host.userMetrics.issuesPanelOpenedFrom(Host.UserMetrics.IssueOpener.COMMAND_MENU);
      }
      if (featurePromotionId) {
        UI.UIUtils.PromotionManager.instance().recordFeatureInteraction(featurePromotionId);
      }
      return UI.ViewManager.ViewManager.instance().showView(id, /* userGesture */ true);
    };

    return CommandMenu.createCommand({
      category: UI.ViewManager.getLocalizedViewLocationCategory(category),
      keys: tags,
      title,
      shortcut: '',
      jslogContext: id,
      executeHandler,
      userActionCode,
      isPanelOrDrawer: panelOrDrawer,
      featurePromotionId,
    });
  }

  private loadCommands(): void {
    const locations = new Map<UI.ViewManager.ViewLocationValues, UI.ViewManager.ViewLocationCategory>();
    for (const {category, name} of UI.ViewManager.getRegisteredLocationResolvers()) {
      if (category && name) {
        locations.set(name, category);
      }
    }
    const views = UI.ViewManager.ViewManager.instance().getRegisteredViewExtensions();
    for (const view of views) {
      const viewLocation = view.location();
      const category = viewLocation && locations.get(viewLocation);
      if (!category) {
        continue;
      }

      const options: RevealViewCommandOptions = {
        title: view.commandPrompt(),
        tags: view.tags() || '',
        category,
        id: view.viewId(),
        featurePromotionId: view.featurePromotionId(),
      };
      this.#commands.push(CommandMenu.createRevealViewCommand(options));
    }
    // Populate allowlisted settings.
    const settingsRegistrations = SettingsUI.SettingUIRegistration.getRegisteredSettings();
    for (const registeredSettingUI of settingsRegistrations) {
      const settingUI = SettingsUI.SettingUIRegistration.resolve(registeredSettingUI.descriptor);
      if (!settingUI.options.length || !settingUI.category) {
        continue;
      }
      let setting: Common.Settings.Setting<unknown>;
      if ('isAvailable' in registeredSettingUI.descriptor) {
        const settingResult = Common.Settings.Settings.instance().maybeResolve(
            registeredSettingUI.descriptor as Common.Settings.ConditionalSettingDescriptor<unknown, unknown>);
        if (!('setting' in settingResult)) {
          continue;
        }
        setting = settingResult.setting;
      } else {
        setting = Common.Settings.Settings.instance().resolve(registeredSettingUI.descriptor);
      }
      for (const option of settingUI.options) {
        this.#commands.push(CommandMenu.createSettingCommand(setting, option.title, option.value, settingUI));
      }
    }
  }

  commands(): Command[] {
    return this.#commands;
  }
}
export interface ActionCommandOptions {
  action: UI.ActionRegistration.Action;
  userActionCode?: number;
}

export interface RevealViewCommandOptions {
  id: string;
  title: Common.UIString.LocalizedString;
  tags: string;
  category: UI.ViewManager.ViewLocationCategory;
  userActionCode?: number;
  featurePromotionId?: string;
}

export interface CreateCommandOptions {
  category: Platform.UIString.LocalizedString;
  keys: string;
  title: Common.UIString.LocalizedString;
  shortcut: string;
  jslogContext: string;
  executeHandler: () => void;
  availableHandler?: () => boolean;
  userActionCode?: number;
  isPanelOrDrawer?: PanelOrDrawer;
  featurePromotionId?: string;
}

export const enum PanelOrDrawer {
  PANEL = 'PANEL',
  DRAWER = 'DRAWER',
}

export class CommandMenuProvider extends Provider {
  private commands: Command[];

  constructor(commandsForTest: Command[] = []) {
    super();
    this.commands = commandsForTest;
  }

  override attach(): void {
    const allCommands = CommandMenu.instance().commands();

    // Populate allowlisted actions.
    const actions = UI.ActionRegistry.ActionRegistry.instance().availableActions();
    for (const action of actions) {
      const category = action.category();
      if (!category) {
        continue;
      }
      this.commands.push(CommandMenu.createActionCommand({action}));
    }

    for (const command of allCommands) {
      if (!command.available()) {
        continue;
      }
      if (this.commands.find(({title, category}) => title === command.title && category === command.category)) {
        continue;
      }
      this.commands.push(command);
    }

    this.commands = this.commands.sort(commandComparator);

    function commandComparator(left: Command, right: Command): number {
      const cats = Platform.StringUtilities.compare(left.category, right.category);
      return cats ? cats : Platform.StringUtilities.compare(left.title, right.title);
    }
  }

  override detach(): void {
    this.commands = [];
  }

  override itemCount(): number {
    return this.commands.length;
  }

  override itemKeyAt(itemIndex: number): string {
    return this.commands[itemIndex].key;
  }

  override itemScoreAt(itemIndex: number, query: string): number {
    const command = this.commands[itemIndex];
    let score = Diff.Diff.DiffWrapper.characterScore(query.toLowerCase(), command.title.toLowerCase());
    // Increase score of promoted items so that these appear on top of the list
    const promotionId = command.featurePromotionId;
    if (promotionId && UI.UIUtils.PromotionManager.instance().canShowPromotion(promotionId)) {
      score = Number.MAX_VALUE;
      return score;
    }

    // Score panel/drawer reveals above regular actions.
    if (command.isPanelOrDrawer === PanelOrDrawer.PANEL) {
      score += 2;
    } else if (command.isPanelOrDrawer === PanelOrDrawer.DRAWER) {
      score += 1;
    }

    return score;
  }

  override renderItem(itemIndex: number, query: string): TemplateResult {
    const command = this.commands[itemIndex];
    const badge = command.featurePromotionId ? UI.UIUtils.maybeCreateNewBadge(command.featurePromotionId) : undefined;
    // clang-format off
    return html`
      <devtools-icon name=${categoryIcons[command.category]}></devtools-icon>
      <div>
        <devtools-highlight type="markup" ranges=${FilteredListWidget.getHighlightRanges(command.title, query, true)}>
          ${command.title}
        </devtools-highlight>
        ${badge ?? nothing}
        <div>${command.shortcut}</div>
      </div>
      <span class="tag">${command.category}</span>`;
    // clang-format on
  }

  override jslogContextAt(itemIndex: number): string {
    return this.commands[itemIndex].jslogContext;
  }

  override selectItem(itemIndex: number|null, _promptValue: string): void {
    if (itemIndex === null) {
      return;
    }
    this.commands[itemIndex].execute();
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.SelectCommandFromCommandMenu);
  }

  override notFoundText(): string {
    return i18nString(UIStrings.noCommandsFound);
  }
}

const categoryIcons: Record<string, string> = {
  Appearance: 'palette',
  Console: 'terminal',
  Debugger: 'bug',
  Drawer: 'keyboard-full',
  Elements: 'code',
  Global: 'global',
  Grid: 'grid-on',
  Help: 'help',
  Mobile: 'devices',
  Navigation: 'refresh',
  Network: 'arrow-up-down',
  Panel: 'frame',
  Performance: 'performance',
  Persistence: 'override',
  Recorder: 'record-start',
  Rendering: 'tonality',
  Resources: 'bin',
  Screenshot: 'photo-camera',
  Settings: 'gear',
  Sources: 'label',
};

export class Command {
  readonly category: Common.UIString.LocalizedString;
  readonly title: Common.UIString.LocalizedString;
  readonly key: string;
  readonly shortcut: string;
  readonly jslogContext: string;
  readonly isPanelOrDrawer?: PanelOrDrawer;
  readonly featurePromotionId?: string;

  readonly #executeHandler: () => unknown;
  readonly #availableHandler?: () => boolean;

  constructor(category: Common.UIString.LocalizedString, title: Common.UIString.LocalizedString, key: string,
              shortcut: string, jslogContext: string, executeHandler: () => unknown, availableHandler?: () => boolean,
              isPanelOrDrawer?: PanelOrDrawer, featurePromotionId?: string) {
    this.category = category;
    this.title = title;
    this.key = category + '\0' + title + '\0' + key;
    this.shortcut = shortcut;
    this.jslogContext = jslogContext;
    this.#executeHandler = executeHandler;
    this.#availableHandler = availableHandler;
    this.isPanelOrDrawer = isPanelOrDrawer;
    this.featurePromotionId = featurePromotionId;
  }

  available(): boolean {
    return this.#availableHandler ? this.#availableHandler() : true;
  }

  execute(): unknown {
    return this.#executeHandler();  // Tests might want to await the action in case it's async.
  }
}

export class ShowActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(_context: UI.Context.Context, _actionId: string): boolean {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.bringToFront();
    QuickOpenImpl.show('>');
    return true;
  }
}

registerProvider({
  prefix: '>',
  iconName: 'chevron-right',
  provider: () => Promise.resolve(new CommandMenuProvider()),
  helpTitle: () => i18nString(UIStrings.runCommand),
  titlePrefix: () => i18nString(UIStrings.run),
  titleSuggestion: () => i18nString(UIStrings.command),
  jslogContext: 'command',
});
