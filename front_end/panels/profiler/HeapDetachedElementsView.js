// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import { HeapDetachedElementsDataGrid, HeapDetachedElementsDataGridNode } from './HeapDetachedElementsDataGrid.js';
import { ProfileType, } from './ProfileHeader.js';
import { WritableProfileHeader } from './ProfileView.js';
const UIStrings = {
    /**
     * @description Button text to obtain the detached elements retained by JS
     */
    startDetachedElements: 'Obtain detached elements',
    /**
     * @description The title for the collection of profiles that are gathered from various snapshots of the heap, using a sampling (e.g. every 1/100) technique.
     */
    detachedElementsTitle: 'Detached elements',
    /**
     * @description Description in Heap Profile View of a profiler tool
     */
    detachedElementsDescription: 'Detached elements shows objects that are retained by a JS reference.',
    /**
     * @description Name of a profile
     * @example {2} PH1
     */
    detachedElementProfile: 'Detached elements {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('panels/profiler/HeapDetachedElementsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class DetachedElementsProfileView extends UI.View.SimpleView {
    selectedSizeText;
    dataGrid;
    profile;
    parentDataDisplayDelegate;
    constructor(dataDisplayDelegate, profile) {
        super({
            title: i18nString(UIStrings.detachedElementsTitle),
            viewId: 'detached-elements',
        });
        this.element.classList.add('detached-elements-view');
        this.profile = profile;
        this.parentDataDisplayDelegate = dataDisplayDelegate;
        this.selectedSizeText = new UI.Toolbar.ToolbarText();
        this.dataGrid = new HeapDetachedElementsDataGrid();
        this.populateElementsGrid(profile.detachedElements);
        this.dataGrid.asWidget().show(this.element);
    }
    showProfile(profile) {
        return this.parentDataDisplayDelegate.showProfile(profile);
    }
    showObject(objectId, perspectiveName) {
        this.parentDataDisplayDelegate.showObject(objectId, perspectiveName);
    }
    async linkifyObject() {
        return null;
    }
    populateElementsGrid(detachedElements) {
        if (!detachedElements) {
            return;
        }
        const heapProfilerModel = this.profile.heapProfilerModel();
        const domModel = heapProfilerModel?.target().model(SDK.DOMModel.DOMModel);
        if (!domModel) {
            return;
        }
        for (const detachedElement of detachedElements) {
            this.dataGrid.rootNode().appendChild(new HeapDetachedElementsDataGridNode(detachedElement, domModel));
        }
    }
    async toolbarItems() {
        return [...await super.toolbarItems(), this.selectedSizeText];
    }
}
export class DetachedElementsProfileType extends Common.ObjectWrapper.eventMixin(ProfileType) {
    constructor(typeId, description) {
        super(typeId || i18nString(UIStrings.detachedElementsTitle), description || i18nString(UIStrings.detachedElementsTitle));
    }
    profileBeingRecorded() {
        return super.profileBeingRecorded();
    }
    get buttonTooltip() {
        return i18nString(UIStrings.startDetachedElements);
    }
    buttonClicked() {
        void this.getDetachedElements();
        return false;
    }
    async getDetachedElements() {
        if (this.profileBeingRecorded()) {
            return;
        }
        const heapProfilerModel = UI.Context.Context.instance().flavor(SDK.HeapProfilerModel.HeapProfilerModel);
        const target = heapProfilerModel?.target();
        const domModel = target?.model(SDK.DOMModel.DOMModel);
        if (!heapProfilerModel || !target || !domModel) {
            return;
        }
        const animationModel = target?.model(SDK.AnimationModel.AnimationModel);
        if (animationModel) {
            // TODO(b/406904348): Remove this once we correctly release animations on the backend.
            await animationModel.releaseAllAnimations();
        }
        const data = await domModel.getDetachedDOMNodes();
        const profile = new DetachedElementsProfileHeader(heapProfilerModel, this, data);
        this.addProfile(profile);
        this.dispatchEventToListeners("profile-complete" /* ProfileTypeEvents.PROFILE_COMPLETE */, profile);
    }
    get treeItemTitle() {
        return i18nString(UIStrings.detachedElementsTitle);
    }
    get description() {
        return i18nString(UIStrings.detachedElementsDescription);
    }
    isInstantProfile() {
        return true;
    }
    // eslint-disable-next-line @typescript-eslint/naming-convention
    static TypeId = 'DetachedElements';
}
export class DetachedElementsProfileHeader extends WritableProfileHeader {
    #heapProfilerModel;
    detachedElements;
    constructor(heapProfilerModel, type, detachedElements, title) {
        super(heapProfilerModel?.debuggerModel() ?? null, type, title || i18nString(UIStrings.detachedElementProfile, { PH1: type.nextProfileUid() }));
        this.detachedElements = detachedElements;
        this.#heapProfilerModel = heapProfilerModel;
    }
    createView(dataDisplayDelegate) {
        return new DetachedElementsProfileView(dataDisplayDelegate, this);
    }
    heapProfilerModel() {
        return this.#heapProfilerModel;
    }
    profileType() {
        return super.profileType();
    }
}
//# sourceMappingURL=HeapDetachedElementsView.js.map