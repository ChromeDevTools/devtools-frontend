// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Diff from '../diff/diff.js';
import * as Host from '../host/host.js';
import * as UI from '../ui/ui.js';

import {FilteredListWidget, Provider} from './FilteredListWidget.js';
import {QuickOpenImpl} from './QuickOpen.js';

/**
 * @unrestricted
 */
export class CommandMenu {
  constructor() {
    this._commands = [];
    this._loadCommands();
  }

  /**
   * @param {!CreateCommandOptions} options
   * @return {!Command}
   */
  static createCommand(options) {
    const {category, keys, title, shortcut, executeHandler, availableHandler, userActionCode} = options;

    // Get localized keys and separate by null character to prevent fuzzy matching from matching across them.
    const keyList = keys.split(',');
    let key = '';
    keyList.forEach(k => {
      key += (ls(k.trim()) + '\0');
    });

    let handler = executeHandler;
    if (userActionCode) {
      const actionCode = userActionCode;
      handler = () => {
        Host.userMetrics.actionTaken(actionCode);
        executeHandler();
      };
    }

    return new Command(category, title, key, shortcut, handler, availableHandler);
  }

  /**
   * @param {!Root.Runtime.Extension} extension
   * @param {string} title
   * @param {V} value
   * @return {!Command}
   * @template V
   */
  static createSettingCommand(extension, title, value) {
    const category = extension.descriptor()['category'] || '';
    const tags = extension.descriptor()['tags'] || '';
    const setting = Common.Settings.Settings.instance().moduleSetting(extension.descriptor()['settingName']);
    return CommandMenu.createCommand({
      category: ls(category),
      keys: tags,
      title,
      shortcut: '',
      executeHandler: setting.set.bind(setting, value),
      availableHandler,
    });

    /**
     * @return {boolean}
     */
    function availableHandler() {
      return setting.get() !== value;
    }
  }

  /**
   * @param {!ActionCommandOptions} options
   * @return {!Command}
   */
  static createActionCommand(options) {
    const {action, userActionCode} = options;
    const shortcut = self.UI.shortcutRegistry.shortcutTitleForAction(action.id()) || '';

    return CommandMenu.createCommand({
      category: action.category(),
      keys: action.tags(),
      title: action.title(),
      shortcut,
      executeHandler: action.execute.bind(action),
      userActionCode,
    });
  }

  /**
   * @param {!RevealViewCommandOptions} options
   * @return {!Command}
   */
  static createRevealViewCommand(options) {
    const {extension, category, userActionCode} = options;
    const viewId = extension.descriptor()['id'];

    return CommandMenu.createCommand({
      category,
      keys: extension.descriptor()['tags'] || '',
      title: Common.UIString.UIString('Show %s', extension.title()),
      shortcut: '',
      executeHandler: UI.ViewManager.ViewManager.instance().showView.bind(
          UI.ViewManager.ViewManager.instance(), viewId, /* userGesture */ true),
      userActionCode,
    });
  }

  _loadCommands() {
    const locations = new Map();
    self.runtime.extensions(UI.View.ViewLocationResolver).forEach(extension => {
      const category = extension.descriptor()['category'];
      const name = extension.descriptor()['name'];
      if (category && name) {
        locations.set(name, category);
      }
    });
    const viewExtensions = self.runtime.extensions('view');
    for (const extension of viewExtensions) {
      const category = locations.get(extension.descriptor()['location']);
      if (!category) {
        continue;
      }

      /** @type {!RevealViewCommandOptions} */
      const options = {extension, category: ls(category), userActionCode: undefined};

      if (category === 'Settings') {
        options.userActionCode = Host.UserMetrics.Action.SettingsOpenedFromCommandMenu;
      }

      this._commands.push(CommandMenu.createRevealViewCommand(options));
    }

    // Populate whitelisted settings.
    const settingExtensions = self.runtime.extensions('setting');
    for (const extension of settingExtensions) {
      const options = extension.descriptor()['options'];
      if (!options || !extension.descriptor()['category']) {
        continue;
      }
      for (const pair of options) {
        this._commands.push(CommandMenu.createSettingCommand(extension, ls(pair['title']), pair['value']));
      }
    }
  }

  /**
   * @return {!Array.<!Command>}
   */
  commands() {
    return this._commands;
  }
}

/**
 * @typedef {{
 *   action: !UI.Action.Action,
 *   userActionCode: (!Host.UserMetrics.Action|undefined),
 * }}
 */
export let ActionCommandOptions;

/**
 * @typedef {{
 *   extension: !Root.Runtime.Extension,
 *   category: string,
 *   userActionCode: (!Host.UserMetrics.Action|undefined)
 * }}
 */
export let RevealViewCommandOptions;

/**
 * @typedef {{
 *   category: string,
 *   keys: string,
 *   title: string,
 *   shortcut: string,
 *   executeHandler: !function(),
 *   availableHandler: (!function()|undefined),
 *   userActionCode: (!Host.UserMetrics.Action|undefined)
 * }}
 */
export let CreateCommandOptions;

export class CommandMenuProvider extends Provider {
  constructor() {
    super();
    this._commands = [];
  }

  /**
   * @override
   */
  attach() {
    const allCommands = commandMenu.commands();

    // Populate whitelisted actions.
    const actions = self.UI.actionRegistry.availableActions();
    for (const action of actions) {
      const category = action.category();
      if (!category) {
        continue;
      }

      /** @type {!ActionCommandOptions} */
      const options = {action};
      if (category === 'Settings') {
        options.userActionCode = Host.UserMetrics.Action.SettingsOpenedFromCommandMenu;
      }

      this._commands.push(CommandMenu.createActionCommand(options));
    }

    for (const command of allCommands) {
      if (command.available()) {
        this._commands.push(command);
      }
    }

    this._commands = this._commands.sort(commandComparator);

    /**
     * @param {!Command} left
     * @param {!QuickOpen.CommandMenu.Command} right
     * @return {number}
     */
    function commandComparator(left, right) {
      const cats = left.category().compareTo(right.category());
      return cats ? cats : left.title().compareTo(right.title());
    }
  }

  /**
   * @override
   */
  detach() {
    this._commands = [];
  }

  /**
   * @override
   * @return {number}
   */
  itemCount() {
    return this._commands.length;
  }

  /**
   * @override
   * @param {number} itemIndex
   * @return {string}
   */
  itemKeyAt(itemIndex) {
    return this._commands[itemIndex].key();
  }

  /**
   * @override
   * @param {number} itemIndex
   * @param {string} query
   * @return {number}
   */
  itemScoreAt(itemIndex, query) {
    const command = this._commands[itemIndex];
    const opcodes = Diff.Diff.DiffWrapper.charDiff(query.toLowerCase(), command.title().toLowerCase());
    let score = 0;
    // Score longer sequences higher.
    for (let i = 0; i < opcodes.length; ++i) {
      if (opcodes[i][0] === Diff.Diff.Operation.Equal) {
        score += opcodes[i][1].length * opcodes[i][1].length;
      }
    }

    // Score panel/drawer reveals above regular actions.
    if (command.category().startsWith('Panel')) {
      score += 2;
    } else if (command.category().startsWith('Drawer')) {
      score += 1;
    }

    return score;
  }

  /**
   * @override
   * @param {number} itemIndex
   * @param {string} query
   * @param {!Element} titleElement
   * @param {!Element} subtitleElement
   */
  renderItem(itemIndex, query, titleElement, subtitleElement) {
    const command = this._commands[itemIndex];
    titleElement.removeChildren();
    const tagElement = titleElement.createChild('span', 'tag');
    const index = String.hashCode(command.category()) % MaterialPaletteColors.length;
    tagElement.style.backgroundColor = MaterialPaletteColors[index];
    tagElement.textContent = command.category();
    titleElement.createTextChild(command.title());
    FilteredListWidget.highlightRanges(titleElement, query, true);
    subtitleElement.textContent = command.shortcut();
  }

  /**
   * @override
   * @param {?number} itemIndex
   * @param {string} promptValue
   */
  selectItem(itemIndex, promptValue) {
    if (itemIndex === null) {
      return;
    }
    this._commands[itemIndex].execute();
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.SelectCommandFromCommandMenu);
  }

  /**
   * @override
   * @return {string}
   */
  notFoundText() {
    return ls`No commands found`;
  }
}

export const MaterialPaletteColors = [
  '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#03A9F4', '#00BCD4', '#009688', '#4CAF50', '#8BC34A',
  '#CDDC39', '#FFC107', '#FF9800', '#FF5722', '#795548', '#9E9E9E', '#607D8B'
];

/**
 * @unrestricted
 */
export class Command {
  /**
   * @param {string} category
   * @param {string} title
   * @param {string} key
   * @param {string} shortcut
   * @param {function()} executeHandler
   * @param {function()=} availableHandler
   */
  constructor(category, title, key, shortcut, executeHandler, availableHandler) {
    this._category = category;
    this._title = title;
    this._key = category + '\0' + title + '\0' + key;
    this._shortcut = shortcut;
    this._executeHandler = executeHandler;
    this._availableHandler = availableHandler;
  }

  /**
   * @return {string}
   */
  category() {
    return this._category;
  }

  /**
   * @return {string}
   */
  title() {
    return this._title;
  }

  /**
   * @return {string}
   */
  key() {
    return this._key;
  }

  /**
   * @return {string}
   */
  shortcut() {
    return this._shortcut;
  }

  /**
   * @return {boolean}
   */
  available() {
    return this._availableHandler ? this._availableHandler() : true;
  }

  execute() {
    this._executeHandler();
  }
}

/**
 * @implements {UI.ActionDelegate.ActionDelegate}
 * @unrestricted
 */
export class ShowActionDelegate {
  /**
   * @override
   * @param {!UI.Context.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.bringToFront();
    QuickOpenImpl.show('>');
    return true;
  }
}

/** @type {!CommandMenu} */
export const commandMenu = new CommandMenu();
