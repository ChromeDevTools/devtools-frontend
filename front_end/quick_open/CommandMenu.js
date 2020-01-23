// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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
   * @param {string} category
   * @param {string} keys
   * @param {string} title
   * @param {string} shortcut
   * @param {function()} executeHandler
   * @param {function()=} availableHandler
   * @return {!Command}
   */
  static createCommand(category, keys, title, shortcut, executeHandler, availableHandler) {
    // Get localized keys and separate by null character to prevent fuzzy matching from matching across them.
    const keyList = keys.split(',');
    let key = '';
    keyList.forEach(k => {
      key += (ls(k.trim()) + '\0');
    });

    return new Command(category, title, key, shortcut, executeHandler, availableHandler);
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
    const setting = self.Common.settings.moduleSetting(extension.descriptor()['settingName']);
    return CommandMenu.createCommand(ls(category), tags, title, '', setting.set.bind(setting, value), availableHandler);

    /**
     * @return {boolean}
     */
    function availableHandler() {
      return setting.get() !== value;
    }
  }

  /**
   * @param {!UI.Action} action
   * @return {!Command}
   */
  static createActionCommand(action) {
    const shortcut = UI.shortcutRegistry.shortcutTitleForAction(action.id()) || '';
    return CommandMenu.createCommand(
        action.category(), action.tags(), action.title(), shortcut, action.execute.bind(action));
  }

  /**
   * @param {!Root.Runtime.Extension} extension
   * @param {string} category
   * @return {!Command}
   */
  static createRevealViewCommand(extension, category) {
    const viewId = extension.descriptor()['id'];
    const executeHandler = self.UI.viewManager.showView.bind(self.UI.viewManager, viewId);
    const tags = extension.descriptor()['tags'] || '';
    return CommandMenu.createCommand(category, tags, Common.UIString('Show %s', extension.title()), '', executeHandler);
  }

  _loadCommands() {
    const locations = new Map();
    self.runtime.extensions(UI.ViewLocationResolver).forEach(extension => {
      const category = extension.descriptor()['category'];
      const name = extension.descriptor()['name'];
      if (category && name) {
        locations.set(name, category);
      }
    });
    const viewExtensions = self.runtime.extensions('view');
    for (const extension of viewExtensions) {
      const category = locations.get(extension.descriptor()['location']);
      if (category) {
        this._commands.push(CommandMenu.createRevealViewCommand(extension, ls(category)));
      }
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
    const actions = UI.actionRegistry.availableActions();
    for (const action of actions) {
      if (action.category()) {
        this._commands.push(CommandMenu.createActionCommand(action));
      }
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
    const opcodes = Diff.Diff.charDiff(query.toLowerCase(), command.title().toLowerCase());
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
 * @implements {UI.ActionDelegate}
 * @unrestricted
 */
export class ShowActionDelegate {
  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    Host.InspectorFrontendHost.bringToFront();
    QuickOpenImpl.show('>');
    return true;
  }
}

/** @type {!CommandMenu} */
export const commandMenu = new CommandMenu();
