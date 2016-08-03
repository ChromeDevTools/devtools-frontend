// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 */
WebInspector.CommandMenu = function()
{
    this._commands = [];
    this._loadCommands();
}

WebInspector.CommandMenu.prototype = {
    _loadCommands: function()
    {
        // Populate panels.
        var panelExtensions = self.runtime.extensions(WebInspector.Panel);
        for (var extension of panelExtensions)
            this._commands.push(WebInspector.CommandMenu.createRevealPanelCommand(extension));

        // Populate drawers.
        var drawerExtensions = self.runtime.extensions("view");
        for (var extension of drawerExtensions) {
            if (extension.descriptor()["location"] !== "drawer-view")
                continue;
            this._commands.push(WebInspector.CommandMenu.createRevealDrawerCommand(extension));
        }

        // Populate whitelisted settings.
        var settingExtensions = self.runtime.extensions("setting");
        for (var extension of settingExtensions) {
            var options = extension.descriptor()["options"];
            if (!options || !extension.descriptor()["category"])
                continue;
            for (var pair of options)
                this._commands.push(WebInspector.CommandMenu.createSettingCommand(extension, pair["title"], pair["value"]));
        }
    },

    /**
     * @return {!Array.<!WebInspector.CommandMenu.Command>}
     */
    commands: function()
    {
        return this._commands;
    }
}

/**
 * @constructor
 * @extends {WebInspector.FilteredListWidget.Delegate}
 */
WebInspector.CommandMenuDelegate = function()
{
    WebInspector.FilteredListWidget.Delegate.call(this, []);
    this._commands = [];
    this._appendAvailableCommands();
}

WebInspector.CommandMenuDelegate.MaterialPaletteColors = ["#F44336", "#E91E63", "#9C27B0", "#673AB7", "#3F51B5", "#03A9F4", "#00BCD4", "#009688", "#4CAF50", "#8BC34A", "#CDDC39", "#FFC107", "#FF9800", "#FF5722", "#795548", "#9E9E9E", "#607D8B"];

WebInspector.CommandMenuDelegate.prototype = {
    _appendAvailableCommands: function()
    {
        var allCommands = WebInspector.commandMenu.commands();

        // Populate whitelisted actions.
        var actions = WebInspector.actionRegistry.availableActions();
        for (var action of actions) {
            if (action.category())
                this._commands.push(WebInspector.CommandMenu.createActionCommand(action));
        }

        for (var command of allCommands) {
            if (command.available())
                this._commands.push(command);
        }

        this._commands = this._commands.sort(commandComparator);

        /**
         * @param {!WebInspector.CommandMenu.Command} left
         * @param {!WebInspector.CommandMenu.Command} right
         * @return {number}
         */
        function commandComparator(left, right)
        {
            var cats = left.category().compareTo(right.category());
            return cats ? cats : left.title().compareTo(right.title());
        }
    },

    /**
     * @override
     * @return {number}
     */
    itemCount: function()
    {
        return this._commands.length;
    },

    /**
     * @override
     * @param {number} itemIndex
     * @return {string}
     */
    itemKeyAt: function(itemIndex)
    {
        return this._commands[itemIndex].key();
    },

    /**
     * @override
     * @param {number} itemIndex
     * @param {string} query
     * @return {number}
     */
    itemScoreAt: function(itemIndex, query)
    {
        var command = this._commands[itemIndex];
        var opcodes = WebInspector.Diff.charDiff(query.toLowerCase(), command.title().toLowerCase());
        var score = 0;
        // Score longer sequences higher.
        for (var i = 0; i < opcodes.length; ++i) {
            if (opcodes[i][0] === WebInspector.Diff.Operation.Equal)
                score += opcodes[i][1].length * opcodes[i][1].length;
        }

        // Score panel/drawer reveals above regular actions.
        if (command.category().startsWith("Panel"))
            score += 2;
        else if (command.category().startsWith("Drawer"))
            score += 1;

        return score;
    },

    /**
     * @override
     * @param {number} itemIndex
     * @param {string} query
     * @param {!Element} titleElement
     * @param {!Element} subtitleElement
     */
    renderItem: function(itemIndex, query, titleElement, subtitleElement)
    {
        var command = this._commands[itemIndex];
        titleElement.removeChildren();
        var tagElement = titleElement.createChild("span", "tag");
        var index = String.hashCode(command.category()) % WebInspector.CommandMenuDelegate.MaterialPaletteColors.length;
        tagElement.style.backgroundColor = WebInspector.CommandMenuDelegate.MaterialPaletteColors[index];
        tagElement.textContent = command.category();
        titleElement.createTextChild(command.title());
        this.highlightRanges(titleElement, query);
        subtitleElement.textContent = command.shortcut();
    },

    /**
     * @override
     * @param {?number} itemIndex
     * @param {string} promptValue
     */
    selectItem: function(itemIndex, promptValue)
    {
        this._commands[itemIndex].execute();
    },

    /**
     * @override
     * @return {boolean}
     */
    caseSensitive: function()
    {
        return false;
    },

    /**
     * @override
     * @return {boolean}
     */
    renderMonospace: function()
    {
        return false;
    },

    __proto__: WebInspector.FilteredListWidget.Delegate.prototype
}

/**
 * @constructor
 * @param {string} category
 * @param {string} title
 * @param {string} key
 * @param {string} shortcut
 * @param {function()} executeHandler
 * @param {function()=} availableHandler
 */
WebInspector.CommandMenu.Command = function(category, title, key, shortcut, executeHandler, availableHandler)
{
    this._category = category;
    this._title = title;
    this._key = category + "\0" + title + "\0" + key;
    this._shortcut = shortcut;
    this._executeHandler = executeHandler;
    this._availableHandler = availableHandler;
}

WebInspector.CommandMenu.Command.prototype = {
    /**
     * @return {string}
     */
    category: function()
    {
        return this._category;
    },

    /**
     * @return {string}
     */
    title: function()
    {
        return this._title;
    },

    /**
     * @return {string}
     */
    key: function()
    {
        return this._key;
    },

    /**
     * @return {string}
     */
    shortcut: function()
    {
        return this._shortcut;
    },

    /**
     * @return {boolean}
     */
    available: function()
    {
        return this._availableHandler ? this._availableHandler() : true;
    },

    execute: function()
    {
        this._executeHandler();
    }
}

/**
 * @param {string} category
 * @param {string} keys
 * @param {string} title
 * @param {string} shortcut
 * @param {function()} executeHandler
 * @param {function()=} availableHandler
 * @return {!WebInspector.CommandMenu.Command}
 */
WebInspector.CommandMenu.createCommand = function(category, keys, title, shortcut, executeHandler, availableHandler)
{
    // Separate keys by null character, to prevent fuzzy matching from matching across them.
    var key = keys.replace(/,/g, "\0");
    return new WebInspector.CommandMenu.Command(category, title, key, shortcut, executeHandler, availableHandler);
}

/**
 * @param {!Runtime.Extension} extension
 * @param {string} title
 * @param {V} value
 * @return {!WebInspector.CommandMenu.Command}
 * @template V
 */
WebInspector.CommandMenu.createSettingCommand = function(extension, title, value)
{
    var category = extension.descriptor()["category"] || "";
    var tags = extension.descriptor()["tags"] || "";
    var setting = WebInspector.settings.moduleSetting(extension.descriptor()["settingName"]);
    return WebInspector.CommandMenu.createCommand(category, tags, title, "", setting.set.bind(setting, value), availableHandler);

    /**
     * @return {boolean}
     */
    function availableHandler()
    {
        return setting.get() !== value;
    }
}

/**
 * @param {!WebInspector.Action} action
 * @return {!WebInspector.CommandMenu.Command}
 */
WebInspector.CommandMenu.createActionCommand = function(action)
{
    var shortcut = WebInspector.shortcutRegistry.shortcutTitleForAction(action.id()) || "";
    return WebInspector.CommandMenu.createCommand(action.category(), action.tags(), action.title(), shortcut, action.execute.bind(action));
}

/**
 * @param {!Runtime.Extension} extension
 * @return {!WebInspector.CommandMenu.Command}
 */
WebInspector.CommandMenu.createRevealPanelCommand = function(extension)
{
    var panelName = extension.descriptor()["name"];
    var tags = extension.descriptor()["tags"] || "";
    return WebInspector.CommandMenu.createCommand(WebInspector.UIString("Panel"), tags, WebInspector.UIString("Show %s", extension.title()), "", executeHandler, availableHandler);

    /**
     * @return {boolean}
     */
    function availableHandler()
    {
        return WebInspector.inspectorView.currentPanel().name !== panelName;
    }

    function executeHandler()
    {
        WebInspector.inspectorView.panel(panelName).then(WebInspector.inspectorView.setCurrentPanel.bind(WebInspector.inspectorView));
    }
}

/**
 * @param {!Runtime.Extension} extension
 * @return {!WebInspector.CommandMenu.Command}
 */
WebInspector.CommandMenu.createRevealDrawerCommand = function(extension)
{
    var drawerId = extension.descriptor()["id"];
    var executeHandler = WebInspector.viewManager.showView.bind(WebInspector.viewManager, drawerId);
    var tags = extension.descriptor()["tags"] || "";
    return WebInspector.CommandMenu.createCommand(WebInspector.UIString("Drawer"), tags, WebInspector.UIString("Show %s", extension.title()), "", executeHandler);
}

/** @type {!WebInspector.CommandMenu} */
WebInspector.commandMenu = new WebInspector.CommandMenu();

/**
 * @constructor
 * @implements {WebInspector.ActionDelegate}
 */
WebInspector.CommandMenu.ShowActionDelegate = function()
{
}

WebInspector.CommandMenu.ShowActionDelegate.prototype = {
    /**
     * @override
     * @param {!WebInspector.Context} context
     * @param {string} actionId
     * @return {boolean}
     */
    handleAction: function(context, actionId)
    {
        new WebInspector.FilteredListWidget(new WebInspector.CommandMenuDelegate()).showAsDialog();
        InspectorFrontendHost.bringToFront();
        return true;
    }
}

