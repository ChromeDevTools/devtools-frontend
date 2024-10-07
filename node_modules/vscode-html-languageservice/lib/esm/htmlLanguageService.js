/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createScanner } from './parser/htmlScanner';
import { parse } from './parser/htmlParser';
import { HTMLCompletion } from './services/htmlCompletion';
import { HTMLHover } from './services/htmlHover';
import { format } from './services/htmlFormatter';
import { findDocumentLinks } from './services/htmlLinks';
import { findDocumentHighlights } from './services/htmlHighlighting';
import { findDocumentSymbols } from './services/htmlSymbolsProvider';
import { doRename } from './services/htmlRename';
import { findMatchingTagPosition } from './services/htmlMatchingTagPosition';
import { findOnTypeRenameRanges } from './services/htmlSyncedRegions';
import { getFoldingRanges } from './services/htmlFolding';
import { getSelectionRanges } from './services/htmlSelectionRange';
import { HTMLDataProvider } from './languageFacts/dataProvider';
import { HTMLDataManager } from './languageFacts/dataManager';
import { htmlData } from './languageFacts/data/webCustomData';
export * from './htmlLanguageTypes';
var defaultLanguageServiceOptions = {};
export function getLanguageService(options) {
    if (options === void 0) { options = defaultLanguageServiceOptions; }
    var dataManager = new HTMLDataManager(options);
    var htmlHover = new HTMLHover(options, dataManager);
    var htmlCompletion = new HTMLCompletion(options, dataManager);
    return {
        setDataProviders: dataManager.setDataProviders.bind(dataManager),
        createScanner: createScanner,
        parseHTMLDocument: function (document) { return parse(document.getText()); },
        doComplete: htmlCompletion.doComplete.bind(htmlCompletion),
        doComplete2: htmlCompletion.doComplete2.bind(htmlCompletion),
        setCompletionParticipants: htmlCompletion.setCompletionParticipants.bind(htmlCompletion),
        doHover: htmlHover.doHover.bind(htmlHover),
        format: format,
        findDocumentHighlights: findDocumentHighlights,
        findDocumentLinks: findDocumentLinks,
        findDocumentSymbols: findDocumentSymbols,
        getFoldingRanges: getFoldingRanges,
        getSelectionRanges: getSelectionRanges,
        doTagComplete: htmlCompletion.doTagComplete.bind(htmlCompletion),
        doRename: doRename,
        findMatchingTagPosition: findMatchingTagPosition,
        findOnTypeRenameRanges: findOnTypeRenameRanges
    };
}
export function newHTMLDataProvider(id, customData) {
    return new HTMLDataProvider(id, customData);
}
export function getDefaultHTMLDataProvider() {
    return newHTMLDataProvider('default', htmlData);
}
