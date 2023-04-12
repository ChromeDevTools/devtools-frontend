// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Utils from './utils/utils.js';

let iconConstructor: (() => Element)|null = null;

export class Icon extends HTMLSpanElement {
  private descriptor: Descriptor|null;
  private spriteSheet: SpriteSheet|null;
  private iconType: string;
  constructor() {
    super();
    this.descriptor = null;
    this.spriteSheet = null;
    this.iconType = '';
  }

  static create(iconType?: string, className?: string): Icon {
    if (!iconConstructor) {
      iconConstructor = Utils.registerCustomElement('span', 'ui-icon', Icon);
    }

    const icon = (iconConstructor() as Icon);
    if (className) {
      icon.className = className;
    }
    if (iconType) {
      icon.setIconType(iconType);
    }
    return icon;
  }

  setIconType(iconType: string): void {
    if (this.descriptor) {
      this.style.removeProperty('--spritesheet-position');
      this.style.removeProperty('width');
      this.style.removeProperty('height');
      this.toggleClasses(false);
      this.iconType = '';
      this.descriptor = null;
      this.spriteSheet = null;
    }
    const descriptor = descriptors.get(iconType) || null;
    if (descriptor) {
      this.iconType = iconType;
      this.descriptor = descriptor;
      this.spriteSheet = spriteSheets.get(this.descriptor.spritesheet) || null;
      if (!this.spriteSheet) {
        throw new Error(`ERROR: icon ${this.iconType} has unknown spritesheet: ${this.descriptor.spritesheet}`);
      }
      this.style.setProperty('--spritesheet-position', this.propertyValue());
      this.style.setProperty('width', this.spriteSheet.cellWidth + 'px');
      this.style.setProperty('height', this.spriteSheet.cellHeight + 'px');
      this.toggleClasses(true);
    } else if (iconType) {
      throw new Error(`ERROR: failed to find icon descriptor for type: ${iconType}`);
    }
  }

  setIconColor(color: string): void {
    this.style.setProperty('background-color', color);
  }

  private toggleClasses(value: boolean): void {
    if (this.descriptor) {
      this.classList.toggle('spritesheet-' + this.descriptor.spritesheet, value);
      this.classList.toggle(this.iconType, value);
      this.classList.toggle('icon-mask', value && Boolean(this.descriptor.isMask));
      this.classList.toggle('icon-invert', value && Boolean(this.descriptor.invert));
    }
  }

  private propertyValue(): string {
    if (!this.descriptor || !this.spriteSheet) {
      throw new Error('Descriptor and spriteSheet expected to be present');
    }
    if (!this.descriptor.coordinates) {
      if (!this.descriptor.position || !_positionRegex.test(this.descriptor.position)) {
        throw new Error(`ERROR: icon '${this.iconType}' has malformed position: '${this.descriptor.position}'`);
      }
      const column = this.descriptor.position[0].toLowerCase().charCodeAt(0) - 97;
      const row = parseInt(this.descriptor.position.substring(1), 10) - 1;
      this.descriptor.coordinates = {
        x: -(this.spriteSheet.cellWidth + this.spriteSheet.padding) * column,
        y: (this.spriteSheet.cellHeight + this.spriteSheet.padding) * (row + 1) - this.spriteSheet.padding,
      };
    }
    return `${this.descriptor.coordinates.x}px ${this.descriptor.coordinates.y}px`;
  }
}

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/naming-convention
const _positionRegex = /^[a-z][1-9][0-9]*$/;

const spriteSheets = new Map<string, SpriteSheet>([
  ['smallicons', {cellWidth: 10, cellHeight: 10, padding: 10}],
  ['mediumicons', {cellWidth: 16, cellHeight: 16, padding: 0}],
  ['largeicons', {cellWidth: 28, cellHeight: 24, padding: 0}],
  ['arrowicons', {cellWidth: 19, cellHeight: 19, padding: 0}],

  ['3d-center', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['3d-pan', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['3d-rotate', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['arrow-up-down', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['bell', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['bin', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['bottom-panel-close', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['bottom-panel-open', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['brackets', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['breakpoint-crossed-filled', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['breakpoint-crossed', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['bug', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['checkmark', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['chevron-double-right', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['clear-list', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['clear', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['cloud', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['color-picker-filled', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['color-picker', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['cookie', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['copy', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['credit-card', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['cross-circle', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['cross', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['database', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['devices', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['dock-bottom', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['dock-left', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['dock-right', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['dock-window', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['document', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['dots-vertical', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['download', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['edit', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['eye', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['filter-clear', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['filter-filled', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['filter', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['frame-crossed', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['frame', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['gear-filled', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['gear', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['gears', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['heap-snapshot', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['heap-snapshots', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['iframe-crossed', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['iframe', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['import', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['info', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['keyboard-pen', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['left-panel-close', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['left-panel-open', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['list', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['pause', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['play', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['plus', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['popup', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['profile', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['record-start', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['record-stop', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['refresh', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['resume', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['right-panel-close', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['right-panel-open', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['search', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['select-element', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['step-into', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['step-out', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['step-over', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['step', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['sync', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['table', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['top-panel-close', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['top-panel-open', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['triangle-down', {cellWidth: 14, cellHeight: 14, padding: 0}],
  ['triangle-left', {cellWidth: 14, cellHeight: 14, padding: 0}],
  ['triangle-right', {cellWidth: 14, cellHeight: 14, padding: 0}],
  ['triangle-up', {cellWidth: 14, cellHeight: 14, padding: 0}],
  ['undo', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['warning', {cellWidth: 20, cellHeight: 20, padding: 0}],
  ['watch', {cellWidth: 20, cellHeight: 20, padding: 0}],
]);

const initialDescriptors = new Map<string, Descriptor>([
  ['smallicon-bezier', {position: 'a5', spritesheet: 'smallicons', isMask: true}],
  ['smallicon-checkmark', {position: 'b5', spritesheet: 'smallicons'}],
  ['smallicon-checkmark-square', {position: 'b6', spritesheet: 'smallicons', isMask: true}],
  ['smallicon-checkmark-behind', {position: 'd6', spritesheet: 'smallicons', isMask: true}],
  ['smallicon-command-result', {position: 'a4', spritesheet: 'smallicons'}],
  ['smallicon-cross', {position: 'b4', spritesheet: 'smallicons', isMask: true}],
  ['smallicon-error', {position: 'c4', spritesheet: 'smallicons'}],
  ['smallicon-expand-less', {position: 'f5', spritesheet: 'smallicons', isMask: true}],
  ['smallicon-expand-more', {position: 'e6', spritesheet: 'smallicons', isMask: true}],
  ['smallicon-green-ball', {position: 'b3', spritesheet: 'smallicons'}],
  ['smallicon-info', {position: 'c3', spritesheet: 'smallicons'}],
  ['smallicon-no', {position: 'c6', spritesheet: 'smallicons', isMask: true}],
  ['smallicon-orange-ball', {position: 'd3', spritesheet: 'smallicons'}],
  ['smallicon-red-ball', {position: 'a2', spritesheet: 'smallicons'}],
  ['smallicon-shadow', {position: 'b2', spritesheet: 'smallicons', isMask: true}],
  ['smallicon-text-prompt', {position: 'e5', spritesheet: 'smallicons'}],
  ['smallicon-triangle-down', {position: 'e2', spritesheet: 'smallicons', isMask: true}],
  ['smallicon-triangle-right', {position: 'a1', spritesheet: 'smallicons', isMask: true}],
  ['smallicon-user-command', {position: 'c1', spritesheet: 'smallicons'}],
  ['smallicon-warning', {position: 'd1', spritesheet: 'smallicons'}],
  ['smallicon-clear-info', {position: 'f2', spritesheet: 'smallicons', isMask: true}],
  ['smallicon-clear-error', {position: 'f3', spritesheet: 'smallicons', isMask: true}],

  ['mediumicon-file-sync', {position: 'd3', spritesheet: 'mediumicons', invert: true}],
  ['mediumicon-file', {position: 'a2', spritesheet: 'mediumicons', invert: true}],
  ['mediumicon-gray-cross-active', {position: 'b2', spritesheet: 'mediumicons'}],
  ['mediumicon-gray-cross-hover', {position: 'c2', spritesheet: 'mediumicons'}],
  ['mediumicon-red-cross-active', {position: 'd2', spritesheet: 'mediumicons'}],
  ['mediumicon-red-cross-hover', {position: 'a1', spritesheet: 'mediumicons'}],
  ['mediumicon-replace', {position: 'c5', spritesheet: 'mediumicons', isMask: true}],
  ['mediumicon-fetch', {position: 'b5', spritesheet: 'mediumicons', isMask: true}],
  ['mediumicon-elements-panel', {position: 'f3', spritesheet: 'mediumicons', isMask: true}],
  ['mediumicon-network-panel', {position: 'f2', spritesheet: 'mediumicons', isMask: true}],

  ['largeicon-font-editor', {position: 'i7', spritesheet: 'largeicons', isMask: true}],
  ['largeicon-longclick-triangle', {position: 'b4', spritesheet: 'largeicons', isMask: true}],
  ['largeicon-navigator-file', {position: 'e4', spritesheet: 'largeicons', isMask: true}],
  ['largeicon-navigator-folder', {position: 'f8', spritesheet: 'largeicons', isMask: true}],
  ['largeicon-navigator-frame', {position: 'f7', spritesheet: 'largeicons', isMask: true}],
  ['largeicon-navigator-snippet', {position: 'f6', spritesheet: 'largeicons', isMask: true}],
  ['largeicon-pause-animation', {position: 'b3', spritesheet: 'largeicons', isMask: true}],
  ['largeicon-phone', {position: 'e3', spritesheet: 'largeicons', isMask: true}],
  ['largeicon-play-animation', {position: 'f3', spritesheet: 'largeicons', isMask: true}],
  ['largeicon-play', {position: 'b2', spritesheet: 'largeicons', isMask: true}],
  ['largeicon-replay-animation', {position: 'e2', spritesheet: 'largeicons', isMask: true}],
  ['largeicon-rotate-screen', {position: 'g8', spritesheet: 'largeicons', isMask: true}],
  ['largeicon-terminate-execution', {position: 'h2', spritesheet: 'largeicons', isMask: true}],
  ['largeicon-visibility', {position: 'h9', spritesheet: 'largeicons', isMask: true}],
  ['largeicon-breaking-change', {position: 'h3', spritesheet: 'largeicons'}],
  ['largeicon-link', {position: 'i1', spritesheet: 'largeicons', isMask: true}],
  ['largeicon-dual-screen', {position: 'i2', spritesheet: 'largeicons', isMask: true}],
  ['largeicon-experimental-api', {position: 'i3', spritesheet: 'largeicons', isMask: true}],

  ['mediumicon-arrow-top', {position: 'a4', spritesheet: 'arrowicons'}],
  ['mediumicon-arrow-bottom', {position: 'a3', spritesheet: 'arrowicons'}],
  ['mediumicon-arrow-left', {position: 'a2', spritesheet: 'arrowicons'}],
  ['mediumicon-arrow-right', {position: 'a1', spritesheet: 'arrowicons'}],

  ['3d-center', {position: 'a1', spritesheet: '3d-center', isMask: true}],
  ['3d-pan', {position: 'a1', spritesheet: '3d-pan', isMask: true}],
  ['3d-rotate', {position: 'a1', spritesheet: '3d-rotate', isMask: true}],
  ['arrow-up-down', {position: 'a1', spritesheet: 'arrow-up-down', isMask: true}],
  ['bell', {position: 'a1', spritesheet: 'bell', isMask: true}],
  ['bin', {position: 'a1', spritesheet: 'bin', isMask: true}],
  ['bottom-panel-close', {position: 'a1', spritesheet: 'bottom-panel-close', isMask: true}],
  ['bottom-panel-open', {position: 'a1', spritesheet: 'bottom-panel-open', isMask: true}],
  ['brackets', {position: 'a1', spritesheet: 'brackets', isMask: true}],
  ['breakpoint-crossed-filled', {position: 'a1', spritesheet: 'breakpoint-crossed-filled', isMask: true}],
  ['breakpoint-crossed', {position: 'a1', spritesheet: 'breakpoint-crossed', isMask: true}],
  ['bug', {position: 'a1', spritesheet: 'bug', isMask: true}],
  ['checkmark', {position: 'a1', spritesheet: 'checkmark', isMask: true}],
  ['chevron-double-right', {position: 'a1', spritesheet: 'chevron-double-right', isMask: true}],
  ['clear-list', {position: 'a1', spritesheet: 'clear-list', isMask: true}],
  ['clear', {position: 'a1', spritesheet: 'clear', isMask: true}],
  ['cloud', {position: 'a1', spritesheet: 'cloud', isMask: true}],
  ['color-picker-filled', {position: 'a1', spritesheet: 'color-picker-filled', isMask: true}],
  ['color-picker', {position: 'a1', spritesheet: 'color-picker', isMask: true}],
  ['cookie', {position: 'a1', spritesheet: 'cookie', isMask: true}],
  ['copy', {position: 'a1', spritesheet: 'copy', isMask: true}],
  ['credit-card', {position: 'a1', spritesheet: 'credit-card', isMask: true}],
  ['cross-circle', {position: 'a1', spritesheet: 'cross-circle', isMask: true}],
  ['cross', {position: 'a1', spritesheet: 'cross', isMask: true}],
  ['database', {position: 'a1', spritesheet: 'database', isMask: true}],
  ['devices', {position: 'a1', spritesheet: 'devices', isMask: true}],
  ['dock-bottom', {position: 'a1', spritesheet: 'dock-bottom', isMask: true}],
  ['dock-left', {position: 'a1', spritesheet: 'dock-left', isMask: true}],
  ['dock-right', {position: 'a1', spritesheet: 'dock-right', isMask: true}],
  ['dock-window', {position: 'a1', spritesheet: 'dock-window', isMask: true}],
  ['document', {position: 'a1', spritesheet: 'document', isMask: true}],
  ['dots-vertical', {position: 'a1', spritesheet: 'dots-vertical', isMask: true}],
  ['download', {position: 'a1', spritesheet: 'download', isMask: true}],
  ['edit', {position: 'a1', spritesheet: 'edit', isMask: true}],
  ['eye', {position: 'a1', spritesheet: 'eye', isMask: true}],
  ['filter-clear', {position: 'a1', spritesheet: 'filter-clear', isMask: true}],
  ['filter-filled', {position: 'a1', spritesheet: 'filter-filled', isMask: true}],
  ['filter', {position: 'a1', spritesheet: 'filter', isMask: true}],
  ['frame-crossed', {position: 'a1', spritesheet: 'frame-crossed', isMask: true}],
  ['frame', {position: 'a1', spritesheet: 'frame', isMask: true}],
  ['gear-filled', {position: 'a1', spritesheet: 'gear-filled', isMask: true}],
  ['gear', {position: 'a1', spritesheet: 'gear', isMask: true}],
  ['gears', {position: 'a1', spritesheet: 'gears', isMask: true}],
  ['heap-snapshot', {position: 'a1', spritesheet: 'heap-snapshot', isMask: true}],
  ['heap-snapshots', {position: 'a1', spritesheet: 'heap-snapshots', isMask: true}],
  ['iframe-crossed', {position: 'a1', spritesheet: 'iframe-crossed', isMask: true}],
  ['iframe', {position: 'a1', spritesheet: 'iframe', isMask: true}],
  ['import', {position: 'a1', spritesheet: 'import', isMask: true}],
  ['info', {position: 'a1', spritesheet: 'info', isMask: true}],
  ['keyboard-pen', {position: 'a1', spritesheet: 'keyboard-pen', isMask: true}],
  ['left-panel-close', {position: 'a1', spritesheet: 'left-panel-close', isMask: true}],
  ['left-panel-open', {position: 'a1', spritesheet: 'left-panel-open', isMask: true}],
  ['list', {position: 'a1', spritesheet: 'list', isMask: true}],
  ['pause', {position: 'a1', spritesheet: 'pause', isMask: true}],
  ['play', {position: 'a1', spritesheet: 'play', isMask: true}],
  ['plus', {position: 'a1', spritesheet: 'plus', isMask: true}],
  ['popup', {position: 'a1', spritesheet: 'popup', isMask: true}],
  ['profile', {position: 'a1', spritesheet: 'profile', isMask: true}],
  ['record-start', {position: 'a1', spritesheet: 'record-start', isMask: true}],
  ['record-stop', {position: 'a1', spritesheet: 'record-stop', isMask: true}],
  ['refresh', {position: 'a1', spritesheet: 'refresh', isMask: true}],
  ['resume', {position: 'a1', spritesheet: 'resume', isMask: true}],
  ['right-panel-close', {position: 'a1', spritesheet: 'right-panel-close', isMask: true}],
  ['right-panel-open', {position: 'a1', spritesheet: 'right-panel-open', isMask: true}],
  ['search', {position: 'a1', spritesheet: 'search', isMask: true}],
  ['select-element', {position: 'a1', spritesheet: 'select-element', isMask: true}],
  ['step-into', {position: 'a1', spritesheet: 'step-into', isMask: true}],
  ['step-out', {position: 'a1', spritesheet: 'step-out', isMask: true}],
  ['step-over', {position: 'a1', spritesheet: 'step-over', isMask: true}],
  ['step', {position: 'a1', spritesheet: 'step', isMask: true}],
  ['sync', {position: 'a1', spritesheet: 'sync', isMask: true}],
  ['table', {position: 'a1', spritesheet: 'table', isMask: true}],
  ['top-panel-close', {position: 'a1', spritesheet: 'top-panel-close', isMask: true}],
  ['top-panel-open', {position: 'a1', spritesheet: 'top-panel-open', isMask: true}],
  ['triangle-down', {position: 'a1', spritesheet: 'triangle-down', isMask: true}],
  ['triangle-left', {position: 'a1', spritesheet: 'triangle-left', isMask: true}],
  ['triangle-right', {position: 'a1', spritesheet: 'triangle-right', isMask: true}],
  ['triangle-up', {position: 'a1', spritesheet: 'triangle-up', isMask: true}],
  ['undo', {position: 'a1', spritesheet: 'undo', isMask: true}],
  ['warning', {position: 'a1', spritesheet: 'warning', isMask: true}],
  ['watch', {position: 'a1', spritesheet: 'watch', isMask: true}],
]);

const descriptors = (initialDescriptors as Map<string, Descriptor>);
export interface Descriptor {
  position: string;
  spritesheet: string;
  isMask?: boolean;
  coordinates?: {
    x: number,
    y: number,
  };
  invert?: boolean;
}
export interface SpriteSheet {
  cellWidth: number;
  cellHeight: number;
  padding: number;
}
