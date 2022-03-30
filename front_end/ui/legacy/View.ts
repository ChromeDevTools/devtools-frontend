// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TabbedPane} from './TabbedPane.js';
import type {ToolbarItem, ToolbarMenuButton} from './Toolbar.js';
import {ViewManager} from './ViewManager.js';
import type {Widget} from './Widget.js';
import {VBox} from './Widget.js';
export interface View {
  viewId(): string;

  title(): string;

  isCloseable(): boolean;

  isPreviewFeature(): boolean;

  isTransient(): boolean;

  toolbarItems(): Promise<ToolbarItem[]>;

  widget(): Promise<Widget>;

  disposeView(): void|Promise<void>;
}

export class SimpleView extends VBox implements View {
  private readonly titleInternal: string;
  readonly #viewId: string;

  constructor(title: string, isWebComponent?: boolean, viewId?: string) {
    super(isWebComponent);
    this.titleInternal = title;
    this.#viewId = viewId ?? title;
  }

  viewId(): string {
    return this.#viewId;
  }

  title(): string {
    return this.titleInternal;
  }

  isCloseable(): boolean {
    return false;
  }

  isTransient(): boolean {
    return false;
  }

  toolbarItems(): Promise<ToolbarItem[]> {
    return Promise.resolve([]);
  }

  widget(): Promise<Widget> {
    return (Promise.resolve(this) as Promise<Widget>);
  }

  revealView(): Promise<void> {
    return ViewManager.instance().revealView(this);
  }

  disposeView(): void {
  }

  isPreviewFeature(): boolean {
    return false;
  }
}

export interface ViewLocation {
  appendApplicableItems(locationName: string): void;
  appendView(view: View, insertBefore?: View|null): void;
  showView(view: View, insertBefore?: View|null, userGesture?: boolean): Promise<void>;
  removeView(view: View): void;
  widget(): Widget;
}

export interface TabbedViewLocation extends ViewLocation {
  tabbedPane(): TabbedPane;
  enableMoreTabsButton(): ToolbarMenuButton;
}

export interface ViewLocationResolver {
  resolveLocation(location: string): ViewLocation|null;
}
