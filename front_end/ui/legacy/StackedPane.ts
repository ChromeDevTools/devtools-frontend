// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable @devtools/no-imperative-dom-api */

import type * as Lit from '../../ui/lit/lit.js';
import {createIcon, type Icon} from '../kit/kit.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';

import * as ARIAUtils from './ARIAUtils.js';
import type * as Toolbar from './Toolbar.js';
import {createTextChild} from './UIUtils.js';
import type {View} from './View.js';
import viewContainersStyles from './viewContainers.css.js';
import {type AnyWidget, VBox} from './Widget.js';

type CreateToolbarFn = (toolbarItems: Toolbar.ToolbarItem[]|Lit.TemplateResult) => Element|null;
type SetWidgetForViewFn = (view: View, widget: AnyWidget) => void;

export class ExpandableContainerWidget extends VBox {
  private titleElement: HTMLDivElement;
  private readonly titleExpandIcon: Icon;
  private readonly view: View;
  private widget?: AnyWidget;
  private materializePromise?: Promise<void>;

  constructor(
      view: View,
      private readonly createToolbar: CreateToolbarFn,
      private readonly setWidgetForView: SetWidgetForViewFn,
  ) {
    super({useShadowDom: true});
    this.element.classList.add('flex-none');
    this.registerRequiredCSS(viewContainersStyles);

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

  isExpanded(): boolean {
    return this.titleElement.classList.contains('expanded');
  }

  override wasShown(): void {
    super.wasShown();
    if (this.widget && this.materializePromise) {
      void this.materializePromise.then(() => {
        if (this.isExpanded() && this.widget) {
          this.widget.show(this.element);
        }
      });
    }
  }

  private materialize(): Promise<void> {
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
    this.materializePromise = Promise.all(promises).then(() => {});
    return this.materializePromise;
  }

  expand(): Promise<void> {
    if (this.isExpanded()) {
      return this.materialize();
    }
    this.titleElement.classList.add('expanded');
    ARIAUtils.setExpanded(this.titleElement, true);
    this.titleExpandIcon.name = 'triangle-down';
    return this.materialize().then(() => {
      if (this.isExpanded() && this.widget) {
        this.widget.show(this.element);
      }
    });
  }

  private collapse(): void {
    if (!this.isExpanded()) {
      return;
    }
    this.titleElement.classList.remove('expanded');
    ARIAUtils.setExpanded(this.titleElement, false);
    this.titleExpandIcon.name = 'triangle-right';
    void this.materialize().then(() => {
      if (this.widget) {
        this.widget.detach();
      }
    });
  }

  private toggleExpanded(event: Event): void {
    if (event.type === 'keydown' && event.target !== this.titleElement) {
      return;
    }
    if (this.isExpanded()) {
      this.collapse();
    } else {
      void this.expand();
    }
  }

  private onTitleKeyDown(event: Event): void {
    if (event.target !== this.titleElement) {
      return;
    }
    const keyEvent = (event as KeyboardEvent);
    if (keyEvent.key === 'ArrowLeft') {
      this.collapse();
    } else if (keyEvent.key === 'ArrowRight') {
      if (!this.isExpanded()) {
        void this.expand();
      } else if (this.widget) {
        this.widget.focus();
      }
    }
  }
}

const expandableContainerForView = new WeakMap<View, ExpandableContainerWidget>();

export class StackedPane extends VBox {
  readonly expandableContainers = new Map<string, ExpandableContainerWidget>();
  constructor(
      private readonly createToolbar: CreateToolbarFn,
      private readonly setWidgetForView: SetWidgetForViewFn,
  ) {
    super();
    this.createToolbar = createToolbar;
    ARIAUtils.markAsTree(this.element);
  }

  appendView(view: View, insertBefore?: View|null): void {
    let container = this.expandableContainers.get(view.viewId());
    if (!container) {
      container = new ExpandableContainerWidget(view, this.createToolbar, this.setWidgetForView);
      let beforeElement: Node|null = null;
      if (insertBefore) {
        const beforeContainer = expandableContainerForView.get(insertBefore);
        beforeElement = beforeContainer ? beforeContainer.element : null;
      }
      container.show(this.contentElement, beforeElement);
      this.expandableContainers.set(view.viewId(), container);
    }
  }

  removeView(view: View): void {
    const container = this.expandableContainers.get(view.viewId());
    if (container) {
      container.detach();
      this.expandableContainers.delete(view.viewId());
    }
  }

  async expandView(view: View): Promise<void> {
    const container = this.expandableContainers.get(view.viewId());
    if (container) {
      await container.expand();
    }
  }

  isViewExpanded(viewId: string): boolean {
    const container = this.expandableContainers.get(viewId);
    return container ? container.isExpanded() : false;
  }

  getContainerForView(view: View): ExpandableContainerWidget|undefined {
    return this.expandableContainers.get(view.viewId());
  }
}
