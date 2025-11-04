// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as i18n from '../../../../core/i18n/i18n.js';
import * as UI from '../../legacy.js';
import { DataGridNode } from './DataGrid.js';
const UIStrings = {
    /**
     * @description Shown in a table when there are too many results to show directly. The user can
     * click this button to show more results. This will result in the UI showing X more results before
     * the current position.
     * @example {5} PH1
     */
    showDBefore: 'Show {PH1} before',
    /**
     * @description Shown in a table when there are too many results to show directly. The user can
     * click this button to show more results. This will result in the UI showing X more results after
     * the current position.
     * @example {5} PH1
     */
    showDAfter: 'Show {PH1} after',
    /**
     * @description In a data grid, for a list of items with omitted items, display all omitted items
     * @example {50} PH1
     */
    showAllD: 'Show all {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/data_grid/ShowMoreDataGridNode.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ShowMoreDataGridNode extends DataGridNode {
    callback;
    startPosition;
    endPosition;
    chunkSize;
    showNext;
    showAll;
    showLast;
    selectable;
    hasCells;
    constructor(callback, startPosition, endPosition, chunkSize) {
        super({ summaryRow: true }, false);
        this.callback = callback;
        this.startPosition = startPosition;
        this.endPosition = endPosition;
        this.chunkSize = chunkSize;
        this.showNext = UI.UIUtils.createTextButton(i18nString(UIStrings.showDBefore, { PH1: this.chunkSize }));
        this.showNext.addEventListener('click', this.showNextChunk.bind(this), false);
        this.showAll = UI.UIUtils.createTextButton('');
        this.showAll.addEventListener('click', this.#showAll.bind(this), false);
        this.showLast = UI.UIUtils.createTextButton(i18nString(UIStrings.showDAfter, { PH1: this.chunkSize }));
        this.showLast.addEventListener('click', this.showLastChunk.bind(this), false);
        this.updateLabels();
        this.selectable = false;
    }
    showNextChunk() {
        void this.callback(this.startPosition, this.startPosition + this.chunkSize);
    }
    #showAll() {
        void this.callback(this.startPosition, this.endPosition);
    }
    showLastChunk() {
        void this.callback(this.endPosition - this.chunkSize, this.endPosition);
    }
    updateLabels() {
        const totalSize = this.endPosition - this.startPosition;
        if (totalSize > this.chunkSize) {
            this.showNext.classList.remove('hidden');
            this.showLast.classList.remove('hidden');
        }
        else {
            this.showNext.classList.add('hidden');
            this.showLast.classList.add('hidden');
        }
        this.showAll.textContent = i18nString(UIStrings.showAllD, { PH1: totalSize });
    }
    createCells(element) {
        this.hasCells = false;
        super.createCells(element);
    }
    createCell(columnIdentifier) {
        const cell = this.createTD(columnIdentifier);
        cell.classList.add('show-more');
        if (!this.hasCells) {
            this.hasCells = true;
            if (this.depth && this.dataGrid) {
                cell.style.setProperty('padding-left', (this.depth * this.dataGrid.indentWidth) + 'px');
            }
            cell.appendChild(this.showNext);
            cell.appendChild(this.showAll);
            cell.appendChild(this.showLast);
        }
        return cell;
    }
    setStartPosition(from) {
        this.startPosition = from;
        this.updateLabels();
    }
    setEndPosition(to) {
        this.endPosition = to;
        this.updateLabels();
    }
    nodeSelfHeight() {
        return 40;
    }
    dispose() {
    }
}
//# sourceMappingURL=ShowMoreDataGridNode.js.map