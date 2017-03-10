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
  'smallicon-error': {x: -20, y: 0, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-warning': {x: -60, y: 0, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-info': {x: -80, y: 0, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-device': {x: -100, y: 0, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-red-ball': {x: -120, y: 0, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-green-ball': {x: -140, y: 0, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-orange-ball': {x: -160, y: 0, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-green-arrow': {x: -120, y: -20, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-step-in': {x: -100, y: -20, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-step-out': {x: 0, y: 0, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-thick-right-arrow': {x: -180, y: 0, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-thick-left-arrow': {x: -180, y: -20, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-user-command': {x: 0, y: -19, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-text-prompt': {x: -20, y: -20, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-command-result': {x: -40, y: -19, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-shadow': {x: -60, y: -20, width: 10, height: 10, spritesheet: 'smallicons', isMask: true},
  'smallicon-bezier': {x: -80, y: -20, width: 10, height: 10, spritesheet: 'smallicons', isMask: true},
  'smallicon-dropdown-arrow': {x: -18, y: -96, width: 12, height: 12, spritesheet: 'largeicons', isMask: true},
  'smallicon-triangle-right': {x: -4, y: -98, width: 10, height: 8, spritesheet: 'largeicons', isMask: true},
  'smallicon-triangle-down': {x: -20, y: -98, width: 10, height: 8, spritesheet: 'largeicons', isMask: true},
  'smallicon-triangle-up': {x: -4, y: -111, width: 10, height: 8, spritesheet: 'largeicons', isMask: true},
  'smallicon-arrow-in-circle': {x: -10, y: -127, width: 11, height: 11, spritesheet: 'largeicons', isMask: true},
  'smallicon-cross': {x: -177, y: -98, width: 9, height: 9, spritesheet: 'largeicons'},
  'smallicon-red-cross-hover': {x: -96, y: -96, width: 14, height: 14, spritesheet: 'largeicons'},
  'smallicon-red-cross-active': {x: -111, y: -96, width: 14, height: 14, spritesheet: 'largeicons'},
  'smallicon-gray-cross-hover': {x: -143, y: -96, width: 13, height: 13, spritesheet: 'largeicons'},
  'smallicon-gray-cross-active': {x: -160, y: -96, width: 13, height: 13, spritesheet: 'largeicons'},

  'smallicon-inline-breakpoint': {x: -140, y: -20, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-inline-breakpoint-conditional': {x: -160, y: -20, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-file': {x: -64, y: -24, width: 12, height: 14, spritesheet: 'largeicons'},
  'smallicon-file-sync': {x: -76, y: -24, width: 12, height: 14, spritesheet: 'largeicons'},
  'smallicon-search': {x: -234, y: -30, width: 12, height: 12, spritesheet: 'largeicons'},
  'smallicon-clear-input': {x: -143, y: -96, width: 13, height: 13, spritesheet: 'largeicons'},
  'smallicon-checkmark': {x: -128, y: -109, width: 10, height: 10, spritesheet: 'largeicons'},

  'largeicon-longclick-triangle': {x: -290, y: -46, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-menu': {x: -192, y: -24, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-delete': {x: -128, y: -0, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-node-search': {x: -320, y: -120, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-add': {x: -224, y: -120, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-clear': {x: -64, y: 0, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-rotate-screen': {x: -192, y: -144, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-phone': {x: -320, y: -96, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-block': {x: -32, y: -144, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-layout-editor': {x: 0, y: -144, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-foreground-color': {x: -128, y: -144, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-background-color': {x: -96, y: -144, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-text-shadow': {x: -192, y: -48, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-box-shadow': {x: -160, y: -48, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-pause-animation': {x: -320, y: 0, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-replay-animation': {x: -320, y: -24, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-play-animation': {x: -320, y: -48, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-eyedropper': {x: -288, y: -120, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-copy': {x: -291, y: -143, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-checkmark': {x: -260, y: -71, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-rotate': {x: -160, y: -120, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-center': {x: -128, y: -120, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-pan': {x: -98, y: -120, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-waterfall': {x: -128, y: -48, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-filter': {x: -32, y: -48, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-trash-bin': {x: -128, y: -24, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-pretty-print': {x: -256, y: -24, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-deactivate-breakpoints': {x: 0, y: -24, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-activate-breakpoints': {x: -32, y: 0, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-resume': {x: 0, y: -72, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-pause': {x: -32, y: -72, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-pause-on-exceptions': {x: -256, y: 0, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-play-back': {x: -96, y: -48, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-play': {x: -64, y: -48, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-step-over': {x: -128, y: -72, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-step-out': {x: -96, y: -72, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-step-in': {x: -64, y: -72, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-camera': {x: -96, y: -24, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-stop-recording': {x: -288, y: -24, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-start-recording': {x: -288, y: 0, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-large-list': {x: -224, y: 0, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-visibility': {x: -96, y: 0, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-refresh': {x: 0, y: 0, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-dock-to-right': {x: -256, y: -48, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-dock-to-left': {x: -224, y: -48, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-dock-to-bottom': {x: -32, y: -24, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-undock': {x: 0, y: -48, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-settings-gear': {x: -288, y: -72, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},

  'largeicon-show-left-sidebar': {x: -160, y: -72, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-hide-left-sidebar': {x: -192, y: -72, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-show-right-sidebar': {x: -192, y: -96, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-hide-right-sidebar': {x: -192, y: -120, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-show-top-sidebar': {
    x: -288,
    y: -96,
    width: 28,
    height: 24,
    spritesheet: 'largeicons',
    isMask: true,
  },
  'largeicon-hide-top-sidebar': {
    x: -256,
    y: -96,
    width: 28,
    height: 24,
    spritesheet: 'largeicons',
    isMask: true,
  },
  'largeicon-show-bottom-sidebar': {
    x: -224,
    y: -144,
    width: 28,
    height: 24,
    spritesheet: 'largeicons',
    isMask: true,
  },
  'largeicon-hide-bottom-sidebar': {
    x: -256,
    y: -120,
    width: 28,
    height: 24,
    spritesheet: 'largeicons',
    isMask: true,
  },
  'largeicon-navigator-file': {x: -224, y: -72, width: 32, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-navigator-file-sync': {x: -160, y: -24, width: 32, height: 24, spritesheet: 'largeicons', isMask: true},
  'badge-navigator-file-sync': {x: -320, y: -72, width: 32, height: 24, spritesheet: 'largeicons'},
  'largeicon-navigator-folder': {x: -64, y: -120, width: 32, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-navigator-domain': {x: -160, y: -144, width: 32, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-navigator-frame': {x: -256, y: -144, width: 32, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-navigator-worker': {x: -320, y: -144, width: 32, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-navigator-snippet': {x: -224, y: -96, width: 32, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-edit': {x: -160, y: -0, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-chevron': {x: -68, y: -143, width: 24, height: 26, spritesheet: 'largeicons', isMask: true},

  'mediumicon-manifest': {x: 0, y: -0, width: 16, height: 16, spritesheet: 'resourceicons', isMask: true},
  'mediumicon-service-worker': {x: -20, y: -0, width: 16, height: 16, spritesheet: 'resourceicons', isMask: true},
  'mediumicon-clear-storage': {x: -40, y: -0, width: 16, height: 16, spritesheet: 'resourceicons', isMask: true},
  'mediumicon-database': {x: -60, y: -0, width: 16, height: 16, spritesheet: 'resourceicons', isMask: true},
  'mediumicon-table': {x: -80, y: -0, width: 16, height: 16, spritesheet: 'resourceicons', isMask: true},
  'mediumicon-cookie': {x: -120, y: -0, width: 16, height: 16, spritesheet: 'resourceicons', isMask: true},

  'mediumicon-arrow-top': {x: 0, y: 0, width: 19, height: 19, spritesheet: 'arrowicons'},
  'mediumicon-arrow-bottom': {x: 0, y: -19, width: 19, height: 19, spritesheet: 'arrowicons'},
  'mediumicon-arrow-left': {x: 0, y: -38, width: 19, height: 19, spritesheet: 'arrowicons'},
  'mediumicon-arrow-right': {x: 0, y: -57, width: 19, height: 19, spritesheet: 'arrowicons'},
};
