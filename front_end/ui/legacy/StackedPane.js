// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { createIcon } from '../kit/kit.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';
import * as ARIAUtils from './ARIAUtils.js';
import { createTextChild } from './UIUtils.js';
import viewContainersStyles from './viewContainers.css.js';
import { VBox } from './Widget.js';
export class ExpandableContainerWidget extends VBox {
    createToolbar;
    setWidgetForView;
    onVisibilityChanged;
    titleElement;
    titleExpandIcon;
    view;
    widget;
    materializePromise;
    constructor(view, createToolbar, setWidgetForView, onVisibilityChanged) {
        super({ useShadowDom: true });
        this.createToolbar = createToolbar;
        this.setWidgetForView = setWidgetForView;
        this.onVisibilityChanged = onVisibilityChanged;
        this.element.classList.add('flex-none');
        this.registerRequiredCSS(viewContainersStyles);
        this.onVisibilityChanged = onVisibilityChanged;
        this.createToolbar = createToolbar;
        this.titleElement = document.createElement('div');
        this.titleElement.classList.add('expandable-view-title');
        this.titleElement.setAttribute('jslog', `${VisualLogging.sectionHeader().context(view.viewId()).track({
            click: true,
            keydown: 'Enter|Space|ArrowLeft|ArrowRight',
        })}`);
        ARIAUtils.markAsTreeitem(this.titleElement);
        this.titleExpandIcon = createIcon('triangle-right', 'title-expand-icon');
        this.titleElement.appendChild(this.titleExpandIcon);
        const titleText = view.title();
        createTextChild(this.titleElement, titleText);
        ARIAUtils.setLabel(this.titleElement, titleText);
        ARIAUtils.setExpanded(this.titleElement, false);
        this.titleElement.tabIndex = 0;
        self.onInvokeElement(this.titleElement, this.toggleExpanded.bind(this));
        this.titleElement.addEventListener('keydown', this.onTitleKeyDown.bind(this), false);
        this.contentElement.insertBefore(this.titleElement, this.contentElement.firstChild);
        ARIAUtils.setControls(this.titleElement, this.contentElement.createChild('slot'));
        this.view = view;
        expandableContainerForView.set(view, this);
    }
    isExpanded() {
        return this.titleElement.classList.contains('expanded');
    }
    wasShown() {
        super.wasShown();
        if (this.widget && this.materializePromise) {
            void this.materializePromise.then(() => {
                if (this.isExpanded() && this.widget) {
                    this.widget.show(this.element);
                }
            });
        }
    }
    materialize() {
        if (this.materializePromise) {
            return this.materializePromise;
        }
        // TODO(crbug.com/1006759): Transform to async-await
        const promises = [];
        promises.push(this.view.toolbarItems().then(toolbarItems => {
            const toolbarElement = this.createToolbar(toolbarItems);
            if (toolbarElement) {
                this.titleElement.appendChild(toolbarElement);
            }
        }));
        promises.push(this.view.widget().then(widget => {
            this.widget = widget;
            this.setWidgetForView(this.view, widget);
        }));
        this.materializePromise = Promise.all(promises).then(() => { });
        return this.materializePromise;
    }
    expand() {
        if (this.isExpanded()) {
            return this.materialize();
        }
        this.titleElement.classList.add('expanded');
        ARIAUtils.setExpanded(this.titleElement, true);
        this.titleExpandIcon.name = 'triangle-down';
        this.onVisibilityChanged?.(true);
        return this.materialize().then(() => {
            if (this.isExpanded() && this.widget) {
                this.widget.show(this.element);
            }
        });
    }
    collapse() {
        if (!this.isExpanded()) {
            return;
        }
        this.titleElement.classList.remove('expanded');
        ARIAUtils.setExpanded(this.titleElement, false);
        this.titleExpandIcon.name = 'triangle-right';
        this.onVisibilityChanged?.(false);
        void this.materialize().then(() => {
            if (this.widget) {
                this.widget.detach();
            }
        });
    }
    toggleExpanded(event) {
        if (event.type === 'keydown' && event.target !== this.titleElement) {
            return;
        }
        if (this.isExpanded()) {
            this.collapse();
        }
        else {
            void this.expand();
        }
    }
    onTitleKeyDown(event) {
        if (event.target !== this.titleElement) {
            return;
        }
        const keyEvent = event;
        if (keyEvent.key === 'ArrowLeft') {
            this.collapse();
        }
        else if (keyEvent.key === 'ArrowRight') {
            if (!this.isExpanded()) {
                void this.expand();
            }
            else if (this.widget) {
                this.widget.focus();
            }
        }
    }
}
const expandableContainerForView = new WeakMap();
export class StackedPane extends VBox {
    createToolbar;
    setWidgetForView;
    onViewVisibilityChanged;
    expandableContainers = new Map();
    constructor(createToolbar, setWidgetForView, onViewVisibilityChanged) {
        super();
        this.createToolbar = createToolbar;
        this.setWidgetForView = setWidgetForView;
        this.onViewVisibilityChanged = onViewVisibilityChanged;
        this.createToolbar = createToolbar;
        this.onViewVisibilityChanged = onViewVisibilityChanged;
        ARIAUtils.markAsTree(this.element);
    }
    appendView(view, insertBefore) {
        let container = this.expandableContainers.get(view.viewId());
        if (!container) {
            container =
                new ExpandableContainerWidget(view, this.createToolbar, this.setWidgetForView, isExpanded => this.onViewVisibilityChanged?.(view.viewId(), isExpanded));
            let beforeElement = null;
            if (insertBefore) {
                const beforeContainer = expandableContainerForView.get(insertBefore);
                beforeElement = beforeContainer ? beforeContainer.element : null;
            }
            container.show(this.contentElement, beforeElement);
            this.expandableContainers.set(view.viewId(), container);
        }
    }
    wasShown() {
        super.wasShown();
        for (const [viewId, container] of this.expandableContainers) {
            if (container.isExpanded()) {
                this.onViewVisibilityChanged?.(viewId, true);
            }
        }
    }
    willHide() {
        super.willHide();
        for (const [viewId, container] of this.expandableContainers) {
            if (container.isExpanded()) {
                this.onViewVisibilityChanged?.(viewId, false);
            }
        }
    }
    removeView(view) {
        const container = this.expandableContainers.get(view.viewId());
        if (container) {
            container.detach();
            this.expandableContainers.delete(view.viewId());
        }
    }
    async expandView(view) {
        const container = this.expandableContainers.get(view.viewId());
        if (container) {
            await container.expand();
        }
    }
    isViewExpanded(viewId) {
        const container = this.expandableContainers.get(viewId);
        return container ? container.isExpanded() : false;
    }
    getContainerForView(view) {
        return this.expandableContainers.get(view.viewId());
    }
}
//# sourceMappingURL=StackedPane.js.map