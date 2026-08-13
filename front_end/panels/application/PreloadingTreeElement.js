// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import { createIcon } from '../../ui/kit/kit.js';
import { ApplicationPanelTreeElement, ExpandableApplicationPanelTreeElement } from './ApplicationPanelTreeElement.js';
import * as PreloadingHelper from './preloading/helper/helper.js';
import { PreloadingAttemptView, PreloadingRuleSetView, PreloadingSummaryView } from './preloading/PreloadingView.js';
const UIStrings = {
    /**
     * @description Text in Application Panel Sidebar of the Application panel
     */
    speculativeLoads: 'Speculative loads',
    /**
     * @description Text in Application Panel Sidebar of the Application panel
     */
    rules: 'Rules',
    /**
     * @description Text in Application Panel Sidebar of the Application panel
     */
    speculations: 'Speculations',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/PreloadingTreeElement.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
class PreloadingTreeElementBase extends ApplicationPanelTreeElement {
    #model;
    #viewConstructor;
    view;
    #path;
    #selected;
    constructor(panel, viewConstructor, path, title) {
        super(panel, title, false, 'speculative-loads');
        this.#viewConstructor = viewConstructor;
        this.#path = path;
        const icon = createIcon('speculative-loads');
        this.setLeadingIcons([icon]);
        this.#selected = false;
        // TODO(https://crbug.com/1384419): Set link
    }
    get itemURL() {
        return this.#path;
    }
    initialize(model) {
        this.#model = model;
        // Show the view if the model was initialized after selection.
        if (this.#selected && !this.view) {
            this.onselect(false);
        }
    }
    onselect(selectedByUser) {
        super.onselect(selectedByUser);
        this.#selected = true;
        if (!this.#model) {
            return false;
        }
        if (!this.view) {
            this.view = new this.#viewConstructor(this.#model);
        }
        this.showView(this.view);
        return false;
    }
}
export class PreloadingSummaryTreeElement extends ExpandableApplicationPanelTreeElement {
    #model;
    #view;
    #selected;
    #ruleSet = null;
    #attempt = null;
    constructor(panel) {
        super(panel, i18nString(UIStrings.speculativeLoads), '', '', 'preloading');
        const icon = createIcon('speculative-loads');
        this.setLeadingIcons([icon]);
        this.#selected = false;
        // TODO(https://crbug.com/1384419): Set link
    }
    // Note that
    //
    // - TreeElement.ensureSelection assumes TreeElement.treeOutline initialized.
    // - TreeElement.treeOutline is propagated in TreeElement.appendChild.
    //
    // So, `this.constructChildren` should be called just after `parent.appendChild(this)`
    // to enrich children with TreeElement.selectionElementInternal correctly.
    constructChildren(panel) {
        this.#ruleSet = new PreloadingRuleSetTreeElement(panel);
        this.#attempt = new PreloadingAttemptTreeElement(panel);
        this.appendChild(this.#ruleSet);
        this.appendChild(this.#attempt);
    }
    initialize(model) {
        if (this.#ruleSet === null || this.#attempt === null) {
            throw new Error('unreachable');
        }
        this.#model = model;
        this.#ruleSet.initialize(model);
        this.#attempt.initialize(model);
        // Show the view if the model was initialized after selection.
        // However, if the user last viewed this page and clicked into Rules or
        // Speculations, we ensure that we instead show those pages.
        if (this.#attempt.selected) {
            const filter = new PreloadingHelper.PreloadingForward.AttemptViewWithFilter(null);
            this.expandAndRevealAttempts(filter);
        }
        else if (this.#ruleSet.selected) {
            const filter = new PreloadingHelper.PreloadingForward.RuleSetView(null);
            this.expandAndRevealRuleSet(filter);
        }
        else if (this.#selected && !this.#view) {
            this.onselect(false);
        }
    }
    onselect(selectedByUser) {
        super.onselect(selectedByUser);
        this.#selected = true;
        if (!this.#model) {
            return false;
        }
        if (!this.#view) {
            this.#view = new PreloadingSummaryView(this.#model);
        }
        this.showView(this.#view);
        return false;
    }
    expandAndRevealRuleSet(revealInfo) {
        if (this.#ruleSet === null) {
            throw new Error('unreachable');
        }
        this.expand();
        this.#ruleSet.revealRuleSet(revealInfo);
    }
    expandAndRevealAttempts(filter) {
        if (this.#attempt === null) {
            throw new Error('unreachable');
        }
        this.expand();
        this.#attempt.revealAttempts(filter);
    }
}
export class PreloadingRuleSetTreeElement extends PreloadingTreeElementBase {
    constructor(panel) {
        super(panel, PreloadingRuleSetView, 'preloading://rule-set', i18nString(UIStrings.rules));
    }
    revealRuleSet(revealInfo) {
        this.select();
        if (this.view === undefined) {
            return;
        }
        this.view?.revealRuleSet(revealInfo);
    }
}
class PreloadingAttemptTreeElement extends PreloadingTreeElementBase {
    constructor(panel) {
        super(panel, PreloadingAttemptView, 'preloading://attempt', i18nString(UIStrings.speculations));
    }
    revealAttempts(filter) {
        this.select();
        this.view?.setFilter(filter);
    }
}
//# sourceMappingURL=PreloadingTreeElement.js.map