// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../../ui/kit/kit.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as Lit from '../../../ui/lit/lit.js';
import sharedStorageMetadataViewStyles from './sharedStorageMetadataView.css.js';
import { StorageMetadataView } from './StorageMetadataView.js';
const { html } = Lit;
const UIStrings = {
    /**
     * @description Text in SharedStorage Metadata View of the Application panel
     */
    sharedStorage: 'Shared storage',
    /**
     * @description The time when the origin most recently created its shared storage database
     */
    creation: 'Creation Time',
    /**
     * @description The placeholder text if there is no creation time because the origin is not yet using shared storage.
     */
    notYetCreated: 'Not yet created',
    /**
     * @description The number of entries currently in the origin's database
     */
    numEntries: 'Number of Entries',
    /**
     * @description The number of bits remaining in the origin's shared storage privacy budget
     */
    entropyBudget: 'Entropy Budget for Fenced Frames',
    /**
     * @description Hover text for `entropyBudget` giving a more detailed explanation
     */
    budgetExplanation: 'Remaining data leakage allowed within a 24-hour period for this origin in bits of entropy',
    /**
     * @description Label for a button which when clicked causes the budget to be reset to the max.
     */
    resetBudget: 'Reset Budget',
    /**
     * @description The number of bytes used by entries currently in the origin's database
     */
    numBytesUsed: 'Number of Bytes Used',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/components/SharedStorageMetadataView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class SharedStorageMetadataView extends StorageMetadataView {
    #sharedStorageMetadataGetter;
    #creationTime = null;
    #length = 0;
    #bytesUsed = 0;
    #remainingBudget = 0;
    constructor(sharedStorageMetadataGetter, owner) {
        super();
        this.#sharedStorageMetadataGetter = sharedStorageMetadataGetter;
        this.classList.add('overflow-auto');
        this.setStorageKey(owner);
    }
    async #resetBudget() {
        await this.#sharedStorageMetadataGetter.resetBudget();
        await this.render();
    }
    getTitle() {
        return i18nString(UIStrings.sharedStorage);
    }
    async renderReportContent() {
        const metadata = await this.#sharedStorageMetadataGetter.getMetadata();
        this.#creationTime = metadata?.creationTime ?? null;
        this.#length = metadata?.length ?? 0;
        this.#bytesUsed = metadata?.bytesUsed ?? 0;
        this.#remainingBudget = metadata?.remainingBudget ?? 0;
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        return html `
      <style>${sharedStorageMetadataViewStyles}</style>
      ${await super.renderReportContent()}
      ${this.key(i18nString(UIStrings.creation))}
      ${this.value(this.#renderDateForCreationTime())}
      ${this.key(i18nString(UIStrings.numEntries))}
      ${this.value(String(this.#length))}
      ${this.key(i18nString(UIStrings.numBytesUsed))}
      ${this.value(String(this.#bytesUsed))}
      ${this.key(html `<span class="entropy-budget">${i18nString(UIStrings.entropyBudget)}<devtools-icon name="info" title=${i18nString(UIStrings.budgetExplanation)}></devtools-icon></span>`)}
      ${this.value(html `<span class="entropy-budget">${this.#remainingBudget}${this.#renderResetBudgetButton()}</span>`)}`;
        // clang-format on
    }
    #renderDateForCreationTime() {
        if (!this.#creationTime) {
            return html `${i18nString(UIStrings.notYetCreated)}`;
        }
        const date = new Date(1e3 * (this.#creationTime));
        return html `${date.toLocaleString()}`;
    }
    #renderResetBudgetButton() {
        // clang-format off
        return html `
      <devtools-button .iconName=${'undo'}
                       .jslogContext=${'reset-entropy-budget'}
                       .size=${"SMALL" /* Buttons.Button.Size.SMALL */}
                       .title=${i18nString(UIStrings.resetBudget)}
                       .variant=${"icon" /* Buttons.Button.Variant.ICON */}
                       @click=${this.#resetBudget.bind(this)}></devtools-button>
    `;
        // clang-format on
    }
}
customElements.define('devtools-shared-storage-metadata-view', SharedStorageMetadataView);
//# sourceMappingURL=SharedStorageMetadataView.js.map