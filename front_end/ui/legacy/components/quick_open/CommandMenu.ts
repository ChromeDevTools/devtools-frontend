// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as Host from '../../../../core/host/host.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as Diff from '../../../../third_party/diff/diff.js';
import * as IconButton from '../../../components/icon_button/icon_button.js';
import * as UI from '../../legacy.js';

import {FilteredListWidget, Provider, registerProvider} from './FilteredListWidget.js';
import {QuickOpenImpl} from './QuickOpen.js';

const UIStrings = {
  /**
   * @description Message to display if a setting change requires a reload of DevTools
   */
  oneOrMoreSettingsHaveChanged: 'One or more settings have changed which requires a reload to take effect',
  /**
   * @description Text in Command Menu of the Command Menu
   */
  noCommandsFound: 'No commands found',
  /**
   * @description Text for command prefix of run a command
   */
  run: 'Run',
  /**
   * @description Text for command suggestion of run a command
   */
  command: 'Command',
  /**
   * @description Text for help title of run command menu
   */
  runCommand: 'Run command',
  /**
   * @description Hint text to indicate that a selected command is deprecated
   */
  deprecated: '— deprecated',
} as const;
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/quick_open/CommandMenu.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let commandMenuInstance: CommandMenu;

export class CommandMenu {
  private readonly commandsInternal: Command[];
  private constructor() {
    this.commandsInternal = [];
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
      deprecationWarning,
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
    return new Command(
        category, title, keys, shortcut, jslogContext, handler, availableHandler, deprecationWarning, isPanelOrDrawer,
        featurePromotionId);
  }

  static createSettingCommand<V>(setting: Common.Settings.Setting<V>, title: Common.UIString.LocalizedString, value: V):
      Command {
    const category = setting.category();
    if (!category) {
      throw new Error(`Creating '${title}' setting command failed. Setting has no category.`);
    }
    const tags = setting.tags() || '';
    const reloadRequired = Boolean(setting.reloadRequired());

    return CommandMenu.createCommand({
      category: Common.Settings.getLocalizedSettingsCategory(category),
      keys: tags,
      title,
      shortcut: '',
      jslogContext: Platform.StringUtilities.toKebabCase(`${setting.name}-${value}`),
      executeHandler: () => {
        if (setting.deprecation?.disabled &&
            (!setting.deprecation?.experiment || setting.deprecation.experiment.isEnabled())) {
          void Common.Revealer.reveal(setting);
          return;
        }
        setting.set(value);

        if (setting.name === 'emulate-page-focus') {
          Host.userMetrics.actionTaken(Host.UserMetrics.Action.ToggleEmulateFocusedPageFromCommandMenu);
        }

        if (reloadRequired) {
          UI.InspectorView.InspectorView.instance().displayReloadRequiredWarning(
              i18nString(UIStrings.oneOrMoreSettingsHaveChanged));
        }
      },
      availableHandler,
      deprecationWarning: setting.deprecation?.warning,
    });

    function availableHandler(): boolean {
      return setting.get() !== value;
    }
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
      availableHandler: undefined,
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
      availableHandler: undefined,
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
    const views = UI.ViewManager.getRegisteredViewExtensions();
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
      this.commandsInternal.push(CommandMenu.createRevealViewCommand(options));
    }
    // Populate allowlisted settings.
    const settingsRegistrations = Common.Settings.Settings.instance().getRegisteredSettings();
    for (const settingRegistration of settingsRegistrations) {
      const options = settingRegistration.options;
      if (!options || !settingRegistration.category) {
        continue;
      }
      for (const pair of options) {
        const setting = Common.Settings.Settings.instance().moduleSetting(settingRegistration.settingName);
        this.commandsInternal.push(CommandMenu.createSettingCommand(setting, pair.title(), pair.value));
      }
    }
  }

  commands(): Command[] {
    return this.commandsInternal;
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
  deprecationWarning?: Platform.UIString.LocalizedString;
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
    super('command');
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

  override renderItem(itemIndex: number, query: string, titleElement: Element, subtitleElement: Element): void {
    const command = this.commands[itemIndex];

    titleElement.removeChildren();
    const icon = IconButton.Icon.create(categoryIcons[command.category]);
    titleElement.parentElement?.parentElement?.insertBefore(icon, titleElement.parentElement);
    UI.UIUtils.createTextChild(titleElement, command.title);
    FilteredListWidget.highlightRanges(titleElement, query, true);

    if (command.featurePromotionId) {
      const badge = UI.UIUtils.maybeCreateNewBadge(command.featurePromotionId);
      if (badge) {
        titleElement.parentElement?.insertBefore(badge, subtitleElement);
      }
    }

    subtitleElement.textContent = command.shortcut;

    const deprecationWarning = command.deprecationWarning;
    if (deprecationWarning) {
      const deprecatedTagElement = titleElement.parentElement?.createChild('span', 'deprecated-tag');
      if (deprecatedTagElement) {
        deprecatedTagElement.textContent = i18nString(UIStrings.deprecated);
        deprecatedTagElement.title = deprecationWarning;
      }
    }
    const tagElement = titleElement.parentElement?.parentElement?.createChild('span', 'tag');
    if (!tagElement) {
      return;
    }
    tagElement.textContent = command.category;
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
  readonly deprecationWarning?: Platform.UIString.LocalizedString;
  readonly isPanelOrDrawer?: PanelOrDrawer;
  readonly featurePromotionId?: string;

  readonly #executeHandler: () => unknown;
  readonly #availableHandler?: () => boolean;

  constructor(
      category: Common.UIString.LocalizedString, title: Common.UIString.LocalizedString, key: string, shortcut: string,
      jslogContext: string, executeHandler: () => unknown, availableHandler?: () => boolean,
      deprecationWarning?: Platform.UIString.LocalizedString, isPanelOrDrawer?: PanelOrDrawer,
      featurePromotionId?: string) {
    this.category = category;
    this.title = title;
    this.key = category + '\0' + title + '\0' + key;
    this.shortcut = shortcut;
    this.jslogContext = jslogContext;
    this.#executeHandler = executeHandler;
    this.#availableHandler = availableHandler;
    this.deprecationWarning = deprecationWarning;
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
});
