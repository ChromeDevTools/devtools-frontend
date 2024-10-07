/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./parser/htmlScanner", "./parser/htmlParser", "./services/htmlCompletion", "./services/htmlHover", "./services/htmlFormatter", "./services/htmlLinks", "./services/htmlHighlighting", "./services/htmlSymbolsProvider", "./services/htmlRename", "./services/htmlMatchingTagPosition", "./services/htmlSyncedRegions", "./services/htmlFolding", "./services/htmlSelectionRange", "./languageFacts/dataProvider", "./languageFacts/dataManager", "./languageFacts/data/webCustomData", "./htmlLanguageTypes"], factory);
    }
})(function (require, exports) {
    "use strict";
    function __export(m) {
        for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
    }
    Object.defineProperty(exports, "__esModule", { value: true });
    var htmlScanner_1 = require("./parser/htmlScanner");
    var htmlParser_1 = require("./parser/htmlParser");
    var htmlCompletion_1 = require("./services/htmlCompletion");
    var htmlHover_1 = require("./services/htmlHover");
    var htmlFormatter_1 = require("./services/htmlFormatter");
    var htmlLinks_1 = require("./services/htmlLinks");
    var htmlHighlighting_1 = require("./services/htmlHighlighting");
    var htmlSymbolsProvider_1 = require("./services/htmlSymbolsProvider");
    var htmlRename_1 = require("./services/htmlRename");
    var htmlMatchingTagPosition_1 = require("./services/htmlMatchingTagPosition");
    var htmlSyncedRegions_1 = require("./services/htmlSyncedRegions");
    var htmlFolding_1 = require("./services/htmlFolding");
    var htmlSelectionRange_1 = require("./services/htmlSelectionRange");
    var dataProvider_1 = require("./languageFacts/dataProvider");
    var dataManager_1 = require("./languageFacts/dataManager");
    var webCustomData_1 = require("./languageFacts/data/webCustomData");
    __export(require("./htmlLanguageTypes"));
    var defaultLanguageServiceOptions = {};
    function getLanguageService(options) {
        if (options === void 0) { options = defaultLanguageServiceOptions; }
        var dataManager = new dataManager_1.HTMLDataManager(options);
        var htmlHover = new htmlHover_1.HTMLHover(options, dataManager);
        var htmlCompletion = new htmlCompletion_1.HTMLCompletion(options, dataManager);
        return {
            setDataProviders: dataManager.setDataProviders.bind(dataManager),
            createScanner: htmlScanner_1.createScanner,
            parseHTMLDocument: function (document) { return htmlParser_1.parse(document.getText()); },
            doComplete: htmlCompletion.doComplete.bind(htmlCompletion),
            doComplete2: htmlCompletion.doComplete2.bind(htmlCompletion),
            setCompletionParticipants: htmlCompletion.setCompletionParticipants.bind(htmlCompletion),
            doHover: htmlHover.doHover.bind(htmlHover),
            format: htmlFormatter_1.format,
            findDocumentHighlights: htmlHighlighting_1.findDocumentHighlights,
            findDocumentLinks: htmlLinks_1.findDocumentLinks,
            findDocumentSymbols: htmlSymbolsProvider_1.findDocumentSymbols,
            getFoldingRanges: htmlFolding_1.getFoldingRanges,
            getSelectionRanges: htmlSelectionRange_1.getSelectionRanges,
            doTagComplete: htmlCompletion.doTagComplete.bind(htmlCompletion),
            doRename: htmlRename_1.doRename,
            findMatchingTagPosition: htmlMatchingTagPosition_1.findMatchingTagPosition,
            findOnTypeRenameRanges: htmlSyncedRegions_1.findOnTypeRenameRanges
        };
    }
    exports.getLanguageService = getLanguageService;
    function newHTMLDataProvider(id, customData) {
        return new dataProvider_1.HTMLDataProvider(id, customData);
    }
    exports.newHTMLDataProvider = newHTMLDataProvider;
    function getDefaultHTMLDataProvider() {
        return newHTMLDataProvider('default', webCustomData_1.htmlData);
    }
    exports.getDefaultHTMLDataProvider = getDefaultHTMLDataProvider;
});
