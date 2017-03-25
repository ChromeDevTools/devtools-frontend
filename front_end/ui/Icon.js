// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {HTMLSpanElement}
 */
UI.Icon = class extends HTMLSpanElement {
  constructor() {
    super();
    throw new Error('icon must be created via factory method.');
  }

  /**
   * @param {string=} iconType
   * @param {string=} className
   * @return {!UI.Icon}
   */
  static create(iconType, className) {
    if (!UI.Icon._constructor)
      UI.Icon._constructor = UI.registerCustomElement('span', 'ui-icon', UI.Icon.prototype);

    var icon = /** @type {!UI.Icon} */ (new UI.Icon._constructor());
    if (className)
      icon.className = className;
    if (iconType)
      icon.setIconType(iconType);
    return icon;
  }

  /**
   * @override
   */
  createdCallback() {
    /** @type {?UI.Icon.Descriptor} */
    this._descriptor = null;
    /** @type {string} */
    this._iconType = '';
  }

  /**
   * @param {string} iconType
   */
  setIconType(iconType) {
    if (this._descriptor) {
      this.style.removeProperty('--spritesheet-position');
      this.style.removeProperty('width');
      this.style.removeProperty('height');
      this._toggleClasses(false);
      this._iconType = '';
      this._descriptor = null;
    }
    var descriptor = UI.Icon.Descriptors[iconType] || null;
    if (descriptor) {
      this._iconType = iconType;
      this._descriptor = descriptor;
      this.style.setProperty('--spritesheet-position', this._propertyValue());
      this.style.setProperty('width', this._descriptor.width + 'px');
      this.style.setProperty('height', this._descriptor.height + 'px');
      this._toggleClasses(true);
    } else if (iconType) {
      throw new Error(`ERROR: failed to find icon descriptor for type: ${iconType}`);
    }
  }

  /**
   * @param {boolean} value
   */
  _toggleClasses(value) {
    this.classList.toggle('spritesheet-' + this._descriptor.spritesheet, value);
    this.classList.toggle(this._iconType, value);
    this.classList.toggle('icon-mask', value && !!this._descriptor.isMask);
  }

  /**
   * @return {string}
   */
  _propertyValue() {
    return `${this._descriptor.x}px ${this._descriptor.y}px`;
  }
};

/** @typedef {{x: number, y: number, width: number, height: number, spritesheet: string, isMask: (boolean|undefined)}} */
UI.Icon.Descriptor;

/** @enum {!UI.Icon.Descriptor} */
UI.Icon.Descriptors = {
  // small icons
  'smallicon-bezier': {x: 0, y: 0, width: 10, height: 10, spritesheet: 'smallicons', isMask: true},
  'smallicon-checkmark': {x: -20, y: 0, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-command-result': {x: 0, y: -20, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-cross': {x: -20, y: -20, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-device': {x: -40, y: 0, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-error': {x: -40, y: -20, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-green-arrow': {x: 0, y: -40, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-green-ball': {x: -20, y: -40, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-info': {x: -40, y: -40, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-inline-breakpoint-conditional': {x: -60, y: 0, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-inline-breakpoint': {x: -60, y: -20, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-orange-ball': {x: -60, y: -40, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-red-ball': {x: 0, y: -60, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-shadow': {x: -20, y: -60, width: 10, height: 10, spritesheet: 'smallicons', isMask: true},
  'smallicon-step-in': {x: -40, y: -60, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-step-out': {x: -60, y: -60, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-text-prompt': {x: -80, y: 0, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-thick-left-arrow': {x: -80, y: -20, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-thick-right-arrow': {x: -80, y: -40, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-triangle-down': {x: -80, y: -60, width: 10, height: 10, spritesheet: 'smallicons', isMask: true},
  'smallicon-triangle-right': {x: 0, y: -80, width: 10, height: 10, spritesheet: 'smallicons', isMask: true},
  'smallicon-triangle-up': {x: -20, y: -80, width: 10, height: 10, spritesheet: 'smallicons', isMask: true},
  'smallicon-user-command': {x: -40, y: -80, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-warning': {x: -60, y: -80, width: 10, height: 10, spritesheet: 'smallicons'},

  // medium icons
  'mediumicon-clear-storage': {x: 0, y: 0, width: 16, height: 16, spritesheet: 'mediumicons', isMask: true},
  'mediumicon-cookie': {x: -16, y: 0, width: 16, height: 16, spritesheet: 'mediumicons', isMask: true},
  'mediumicon-database': {x: -32, y: 0, width: 16, height: 16, spritesheet: 'mediumicons', isMask: true},
  'mediumicon-manifest': {x: -48, y: 0, width: 16, height: 16, spritesheet: 'mediumicons', isMask: true},
  'mediumicon-service-worker': {x: 0, y: -16, width: 16, height: 16, spritesheet: 'mediumicons', isMask: true},
  'mediumicon-table': {x: -16, y: -16, width: 16, height: 16, spritesheet: 'mediumicons', isMask: true},
  'smallicon-arrow-in-circle': {x: -34, y: -18, width: 11, height: 11, spritesheet: 'mediumicons', isMask: true},
  'smallicon-file-sync': {x: -50, y: -17, width: 12, height: 14, spritesheet: 'mediumicons'},
  'smallicon-file': {x: -2, y: -33, width: 12, height: 14, spritesheet: 'mediumicons'},
  'smallicon-gray-cross-active': {x: -17, y: -33, width: 13, height: 13, spritesheet: 'mediumicons'},
  'smallicon-gray-cross-hover': {x: -33, y: -33, width: 13, height: 13, spritesheet: 'mediumicons'},
  'smallicon-red-cross-active': {x: -49, y: -33, width: 14, height: 14, spritesheet: 'mediumicons'},
  'smallicon-red-cross-hover': {x: -1, y: -49, width: 14, height: 14, spritesheet: 'mediumicons'},
  'smallicon-search': {x: -18, y: -50, width: 12, height: 12, spritesheet: 'mediumicons'},

  // large icons
  'badge-navigator-file-sync': {x: 0, y: 0, width: 28, height: 24, spritesheet: 'largeicons'},
  'largeicon-activate-breakpoints': {x: -28, y: 0, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-add': {x: 0, y: -24, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-background-color': {x: -28, y: -24, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-box-shadow': {x: 0, y: -48, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-camera': {x: -28, y: -48, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-center': {x: -56, y: 0, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-checkmark': {x: -56, y: -24, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-chevron': {x: -56, y: -48, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-clear': {x: 0, y: -72, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-copy': {x: -28, y: -72, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-deactivate-breakpoints': {x: -56, y: -72, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-delete': {x: -84, y: 0, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-dock-to-bottom': {x: -84, y: -24, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-dock-to-left': {x: -84, y: -48, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-dock-to-right': {x: -84, y: -72, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-edit': {x: 0, y: -96, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-eyedropper': {x: -28, y: -96, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-filter': {x: -56, y: -96, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-foreground-color': {x: -84, y: -96, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-hide-bottom-sidebar': {x: -112, y: 0, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-hide-left-sidebar': {x: -112, y: -24, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-hide-right-sidebar': {x: -112, y: -48, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-hide-top-sidebar': {x: -112, y: -72, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-large-list': {x: -112, y: -96, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-layout-editor': {x: 0, y: -120, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-longclick-triangle': {x: -28, y: -120, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-menu': {x: -56, y: -120, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-navigator-domain': {x: -84, y: -120, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-navigator-file': {x: -112, y: -120, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-navigator-file-sync': {x: -140, y: 0, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-navigator-folder': {x: -140, y: -24, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-navigator-frame': {x: -140, y: -48, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-navigator-snippet': {x: -140, y: -72, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-navigator-worker': {x: -140, y: -96, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-node-search': {x: -140, y: -120, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-pan': {x: 0, y: -144, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-pause-animation': {x: -28, y: -144, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-pause': {x: -56, y: -144, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-pause-on-exceptions': {x: -84, y: -144, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-phone': {x: -112, y: -144, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-play-animation': {x: -140, y: -144, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-play-back': {x: 0, y: -168, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-play': {x: -28, y: -168, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-pretty-print': {x: -56, y: -168, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-refresh': {x: -84, y: -168, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-replay-animation': {x: -112, y: -168, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-resume': {x: -140, y: -168, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-rotate': {x: -168, y: 0, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-rotate-screen': {x: -168, y: -24, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-settings-gear': {x: -168, y: -48, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-show-bottom-sidebar': {x: -168, y: -72, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-show-left-sidebar': {x: -168, y: -96, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-show-right-sidebar': {x: -168, y: -120, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-show-top-sidebar': {x: -168, y: -144, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-start-recording': {x: -168, y: -168, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-step-in': {x: 0, y: -192, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-step-out': {x: -28, y: -192, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-step-over': {x: -56, y: -192, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-stop-recording': {x: -84, y: -192, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-text-shadow': {x: -112, y: -192, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-trash-bin': {x: -140, y: -192, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-undock': {x: -168, y: -192, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-visibility': {x: -196, y: 0, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-waterfall': {x: -196, y: -24, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},

  'mediumicon-arrow-top': {x: 0, y: 0, width: 19, height: 19, spritesheet: 'arrowicons'},
  'mediumicon-arrow-bottom': {x: 0, y: -19, width: 19, height: 19, spritesheet: 'arrowicons'},
  'mediumicon-arrow-left': {x: 0, y: -38, width: 19, height: 19, spritesheet: 'arrowicons'},
  'mediumicon-arrow-right': {x: 0, y: -57, width: 19, height: 19, spritesheet: 'arrowicons'},
};
