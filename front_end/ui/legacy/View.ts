// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../core/platform/platform.js';

import {type TabbedPane} from './TabbedPane.js';
import {type ToolbarItem, type ToolbarMenuButton} from './Toolbar.js';
import {ViewManager} from './ViewManager.js';

import {VBox, type Widget} from './Widget.js';

export interface View {
  viewId(): string;

  title(): Platform.UIString.LocalizedString;

  isCloseable(): boolean;

  isPreviewFeature(): boolean;

  isTransient(): boolean;

  toolbarItems(): Promise<ToolbarItem[]>;

  widget(): Promise<Widget>;

  disposeView(): void|Promise<void>;
}

export class SimpleView extends VBox implements View {
  readonly #title: Platform.UIString.LocalizedString;
  readonly #viewId: string;

  constructor(title: Platform.UIString.LocalizedString, isWebComponent?: boolean, viewId?: string) {
    super(isWebComponent);
    this.#title = title;
    this.#viewId = viewId ?? title;
  }

  viewId(): string {
    return this.#viewId;
  }

  title(): Platform.UIString.LocalizedString {
    return this.#title;
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
    return Promise.resolve(this);
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
