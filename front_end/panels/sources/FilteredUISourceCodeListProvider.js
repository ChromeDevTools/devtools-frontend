// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/components/highlighting/highlighting.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as QuickOpen from '../../ui/legacy/components/quick_open/quick_open.js';
import { Directives, html } from '../../ui/lit/lit.js';
import { FilePathScoreFunction } from './FilePathScoreFunction.js';
import filteredUISourceCodeListProviderStyles from './filteredUISourceCodeListProvider.css.js';
const UIStrings = {
    /**
     * @description Text in Filtered UISource Code List Provider of the Sources panel
     */
    noFilesFound: 'No files found',
    /**
     * @description Name of an item that is on the ignore list
     * @example {compile.html} PH1
     */
    sIgnoreListed: '{PH1} (ignore listed)',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/FilteredUISourceCodeListProvider.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const { classMap } = Directives;
export class FilteredUISourceCodeListProvider extends QuickOpen.FilteredListWidget.Provider {
    queryLineNumberAndColumnNumber;
    defaultScores;
    scorer;
    uiSourceCodes;
    uiSourceCodeIds;
    query;
    constructor(jslogContext) {
        super(jslogContext);
        this.queryLineNumberAndColumnNumber = '';
        this.defaultScores = null;
        this.scorer = new FilePathScoreFunction('');
        this.uiSourceCodes = [];
        this.uiSourceCodeIds = new Set();
    }
    projectRemoved(event) {
        const project = event.data;
        this.populate(project);
        this.refresh();
    }
    populate(skipProject) {
        this.uiSourceCodes = [];
        this.uiSourceCodeIds.clear();
        for (const project of Workspace.Workspace.WorkspaceImpl.instance().projects()) {
            if (project !== skipProject && this.filterProject(project)) {
                for (const uiSourceCode of project.uiSourceCodes()) {
                    if (this.filterUISourceCode(uiSourceCode)) {
                        this.uiSourceCodes.push(uiSourceCode);
                        this.uiSourceCodeIds.add(uiSourceCode.canonicalScriptId());
                    }
                }
            }
        }
    }
    filterUISourceCode(uiSourceCode) {
        if (this.uiSourceCodeIds.has(uiSourceCode.canonicalScriptId())) {
            return false;
        }
        if (Root.Runtime.experiments.isEnabled("just-my-code" /* Root.Runtime.ExperimentName.JUST_MY_CODE */) &&
            Workspace.IgnoreListManager.IgnoreListManager.instance().isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode)) {
            return false;
        }
        if (uiSourceCode.isFetchXHR()) {
            return false;
        }
        const binding = Persistence.Persistence.PersistenceImpl.instance().binding(uiSourceCode);
        return !binding || binding.fileSystem === uiSourceCode;
    }
    uiSourceCodeSelected(_uiSourceCode, _lineNumber, _columnNumber) {
        // Overridden by subclasses
    }
    filterProject(_project) {
        return true;
        // Overridden by subclasses
    }
    itemCount() {
        return this.uiSourceCodes.length;
    }
    itemContentTypeAt(itemIndex) {
        return this.uiSourceCodes[itemIndex].contentType();
    }
    itemKeyAt(itemIndex) {
        return this.uiSourceCodes[itemIndex].url();
    }
    setDefaultScores(defaultScores) {
        this.defaultScores = defaultScores;
    }
    itemScoreAt(itemIndex, query) {
        const uiSourceCode = this.uiSourceCodes[itemIndex];
        const score = this.defaultScores ? (this.defaultScores.get(uiSourceCode) || 0) : 0;
        if (!query || query.length < 2) {
            return score;
        }
        if (this.query !== query) {
            this.query = query;
            this.scorer = new FilePathScoreFunction(query);
        }
        let multiplier = 10;
        if (uiSourceCode.project().type() === Workspace.Workspace.projectTypes.FileSystem &&
            !Persistence.Persistence.PersistenceImpl.instance().binding(uiSourceCode)) {
            multiplier = 5;
        }
        let contentTypeBonus = 0;
        if (uiSourceCode.contentType().isFromSourceMap() && !uiSourceCode.isKnownThirdParty()) {
            contentTypeBonus = 100;
        }
        if (uiSourceCode.contentType().isScript()) {
            // Bonus points for being a script if it is not ignore-listed. Note
            // that ignore listing logic does not apply to non-scripts.
            if (!Workspace.IgnoreListManager.IgnoreListManager.instance().isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode)) {
                contentTypeBonus += 50;
            }
        }
        const fullDisplayName = uiSourceCode.fullDisplayName();
        return score + multiplier * (contentTypeBonus + this.scorer.calculateScore(fullDisplayName, null));
    }
    renderItem(itemIndex, query) {
        query = this.rewriteQuery(query);
        const uiSourceCode = this.uiSourceCodes[itemIndex];
        const fullDisplayName = uiSourceCode.fullDisplayName();
        const indexes = [];
        new FilePathScoreFunction(query).calculateScore(fullDisplayName, indexes);
        const fileNameIndex = fullDisplayName.lastIndexOf('/');
        const isIgnoreListed = Workspace.IgnoreListManager.IgnoreListManager.instance().isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode);
        let tooltipText = fullDisplayName;
        if (isIgnoreListed) {
            tooltipText = i18nString(UIStrings.sIgnoreListed, { PH1: tooltipText });
        }
        const titleRanges = [];
        const subtitleRanges = [];
        if (indexes[0] > fileNameIndex) {
            for (let i = 0; i < indexes.length; ++i) {
                titleRanges.push({ offset: indexes[i] - (fileNameIndex + 1), length: 1 });
            }
        }
        else {
            for (let i = 0; i < indexes.length; ++i) {
                subtitleRanges.push({ offset: indexes[i], length: 1 });
            }
        }
        // clang-format off
        return html `
      <style>${filteredUISourceCodeListProviderStyles}</style>
      <div class="filtered-ui-source-code-list-item
                  ${classMap({ 'is-ignore-listed': isIgnoreListed })}">
        <devtools-highlight
            type="markup"
            ranges=${titleRanges.map(r => `${r.offset},${r.length}`).join(' ')}
            class="filtered-ui-source-code-title ${classMap({ 'search-mode': Boolean(query) })}">
          ${uiSourceCode.displayName() + (this.queryLineNumberAndColumnNumber || '')}
        </devtools-highlight>
        <devtools-highlight
            type="markup"
            ranges=${subtitleRanges.map(r => `${r.offset},${r.length}`).join(' ')}
            class="filtered-ui-source-code-subtitle" title=${tooltipText}>
          ${this.renderSubtitleElement(fullDisplayName.substring(0, fileNameIndex + 1))}
        </devtools-highlight>
      </div>`;
        // clang-format on
    }
    renderSubtitleElement(text) {
        let splitPosition = text.lastIndexOf('/');
        const maxTextLength = 43;
        if (text.length > maxTextLength) {
            splitPosition = text.length - maxTextLength;
        }
        // clang-format off
        return html `
      <div class="first-part">${text.substring(0, splitPosition)}</div>
      <div class="second-part">${text.substring(splitPosition)}</div>`;
        // clang-format on
    }
    selectItem(itemIndex, promptValue) {
        const parsedExpression = promptValue.trim().match(/^([^:]*)(:\d+)?(:\d+)?$/);
        if (!parsedExpression) {
            return;
        }
        let lineNumber;
        let columnNumber;
        if (parsedExpression[2]) {
            lineNumber = parseInt(parsedExpression[2].substr(1), 10) - 1;
        }
        if (parsedExpression[3]) {
            columnNumber = parseInt(parsedExpression[3].substr(1), 10) - 1;
        }
        const uiSourceCode = itemIndex !== null ? this.uiSourceCodes[itemIndex] : null;
        this.uiSourceCodeSelected(uiSourceCode, lineNumber, columnNumber);
    }
    rewriteQuery(query) {
        query = query ? query.trim() : '';
        if (!query || query === ':') {
            return '';
        }
        const lineNumberMatch = query.match(/^([^:]+)((?::[^:]*){0,2})$/);
        this.queryLineNumberAndColumnNumber = lineNumberMatch ? lineNumberMatch[2] : '';
        return lineNumberMatch ? lineNumberMatch[1] : query;
    }
    uiSourceCodeAdded(event) {
        const uiSourceCode = event.data;
        if (!this.filterUISourceCode(uiSourceCode) || !this.filterProject(uiSourceCode.project())) {
            return;
        }
        this.uiSourceCodes.push(uiSourceCode);
        this.uiSourceCodeIds.add(uiSourceCode.canonicalScriptId());
        this.refresh();
    }
    notFoundText() {
        return i18nString(UIStrings.noFilesFound);
    }
    attach() {
        Workspace.Workspace.WorkspaceImpl.instance().addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this.uiSourceCodeAdded, this);
        Workspace.Workspace.WorkspaceImpl.instance().addEventListener(Workspace.Workspace.Events.ProjectRemoved, this.projectRemoved, this);
        this.populate();
    }
    detach() {
        Workspace.Workspace.WorkspaceImpl.instance().removeEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this.uiSourceCodeAdded, this);
        Workspace.Workspace.WorkspaceImpl.instance().removeEventListener(Workspace.Workspace.Events.ProjectRemoved, this.projectRemoved, this);
        this.queryLineNumberAndColumnNumber = '';
        this.defaultScores = null;
    }
}
//# sourceMappingURL=FilteredUISourceCodeListProvider.js.map