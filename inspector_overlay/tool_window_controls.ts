// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  createElement,
  Overlay,
} from './common.js';
import {generateLegibleTextColor} from './css_grid_label_helpers.js';

interface WindowControlsOverlayConfig {
  selectedPlatform: string;
  themeColor: string;
}

export class WindowControlsOverlay extends Overlay {
  private windowsToolBar!: HTMLElement;
  private linuxToolBar!: HTMLElement;
  private macToolbarRight!: HTMLElement;
  private macToolbarLeft!: HTMLElement;

  constructor(window: Window, style: CSSStyleSheet[] = []) {
    super(window, style);
  }

  override install() {
    const windowLinuxToolbarIcons = ['chevron', 'ellipsis', 'minimize', 'maximize', 'close'];
    const macLeftToolbarIcons = ['mac-close', 'mac-minimize', 'mac-maximize'];
    const macRightToolbarIcons = ['mac-chevron', 'mac-ellipsis'];

    this.windowsToolBar = createHiddenToolBarRow('windows', 'right', windowLinuxToolbarIcons);
    this.linuxToolBar = createHiddenToolBarRow('linux', 'right', windowLinuxToolbarIcons);
    this.macToolbarRight = createHiddenToolBarRow('mac', 'right', macRightToolbarIcons);
    this.macToolbarLeft = createHiddenToolBarRow('mac', 'left', macLeftToolbarIcons);

    this.document.body.append(this.windowsToolBar, this.linuxToolBar, this.macToolbarLeft, this.macToolbarRight);
    super.install();
  }

  override uninstall() {
    this.document.body.innerHTML = '';
    super.uninstall();
  }

  drawWindowControlsOverlay(config: WindowControlsOverlayConfig) {
    // Clear all overlays
    this.clearOverlays();

    // Display the Window Controls Overlay
    if (config.selectedPlatform === 'Windows') {
      revealElement(this.windowsToolBar);
    } else if (config.selectedPlatform === 'Linux') {
      revealElement(this.linuxToolBar);
    } else if (config.selectedPlatform === 'Mac') {
      revealElement(this.macToolbarLeft);
      revealElement(this.macToolbarRight);
    }

    // Set the theme Color
    this.document.documentElement.style.setProperty('--wco-theme-color', config.themeColor);
    this.document.documentElement.style.setProperty('--wco-icon-color', generateLegibleTextColor(config.themeColor));
  }

  clearOverlays() {
    hideElement(this.linuxToolBar);
    hideElement(this.windowsToolBar);
    hideElement(this.macToolbarLeft);
    hideElement(this.macToolbarRight);
  }
}

function hideElement(element: HTMLElement): void {
  element.classList.add('hidden');
}

function revealElement(element: HTMLElement): void {
  element.classList.remove('hidden');
}

function createDivOfIcons(icons: string[]): HTMLElement {
  const toolbar = createElement('div');

  for (const iconName of icons) {
    const icon = createElement('div');
    icon.id = iconName;
    icon.classList.add('image');
    toolbar.append(icon);
  }

  return toolbar;
}

function createHiddenToolBarRow(osType: string, location: string, icons: string[]): HTMLElement {
  const toolbar = createDivOfIcons(icons);

  toolbar.classList.add('image-group');
  toolbar.classList.add(`image-group-${location}`);
  toolbar.classList.add(`${osType}-${location}-image-group`);
  toolbar.classList.add('hidden');

  return toolbar;
}
