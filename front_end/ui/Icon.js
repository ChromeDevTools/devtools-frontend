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
      UI.Icon._constructor = registerCustomElement('span', 'ui-icon', UI.Icon.prototype);

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
      this.style.removeProperty('-webkit-mask-position');
      this.style.removeProperty('background-position');
      this.style.removeProperty('width');
      this.style.removeProperty('height');
      this.style.removeProperty('transform');
      this._toggleClasses(false);
      this._iconType = '';
      this._descriptor = null;
    }
    var descriptor = UI.Icon.Descriptors[iconType] || null;
    if (descriptor) {
      this._iconType = iconType;
      this._descriptor = descriptor;
      this.style.setProperty('-webkit-mask-position', this._propertyValue());
      this.style.setProperty('background-position', this._propertyValue());
      this.style.setProperty('width', this._descriptor.width + 'px');
      this.style.setProperty('height', this._descriptor.height + 'px');
      if (this._descriptor.transform)
        this.style.setProperty('transform', this._descriptor.transform);
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
  'smallicon-revoked-error': {x: -40, y: 0, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-warning': {x: -60, y: 0, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-info': {x: -80, y: 0, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-device': {x: -100, y: 0, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-red-ball': {x: -120, y: 0, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-green-ball': {x: -140, y: 0, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-orange-ball': {x: -160, y: 0, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-thick-right-arrow': {x: -180, y: 0, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-user-command': {x: 0, y: -20, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-text-prompt': {x: -20, y: -20, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-command-result': {x: -40, y: -20, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-shadow': {x: -60, y: -20, width: 10, height: 10, spritesheet: 'smallicons', isMask: true},
  'smallicon-bezier': {x: -80, y: -20, width: 10, height: 10, spritesheet: 'smallicons', isMask: true},
  'smallicon-dropdown-arrow': {x: -18, y: -96, width: 12, height: 12, spritesheet: 'largeicons', isMask: true},
  'smallicon-checkmark': {x: -100, y: -20, width: 10, height: 10, spritesheet: 'smallicons', isMask: true},
  'smallicon-green-checkmark': {x: -120, y: -20, width: 10, height: 10, spritesheet: 'smallicons'},
  'smallicon-triangle-right': {x: -4, y: -98, width: 10, height: 8, spritesheet: 'largeicons', isMask: true},
  'smallicon-triangle-bottom': {x: -20, y: -98, width: 10, height: 8, spritesheet: 'largeicons', isMask: true},
  'smallicon-arrow-in-circle': {x: -10, y: -127, width: 11, height: 11, spritesheet: 'largeicons', isMask: true},

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
  'largeicon-play-back':
      {x: -64, y: -48, width: 28, height: 24, spritesheet: 'largeicons', isMask: true, transform: 'scaleX(-1)'},
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
  'largeicon-dock-to-bottom': {x: -32, y: -24, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-undock': {x: 0, y: -48, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},

  'largeicon-show-left-sidebar': {x: -160, y: -72, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-hide-left-sidebar': {x: -192, y: -72, width: 28, height: 24, spritesheet: 'largeicons', isMask: true},
  'largeicon-show-right-sidebar':
      {x: -160, y: -72, width: 28, height: 24, spritesheet: 'largeicons', isMask: true, transform: 'rotate(180deg)'},
  'largeicon-hide-right-sidebar':
      {x: -192, y: -72, width: 28, height: 24, spritesheet: 'largeicons', isMask: true, transform: 'rotate(180deg)'},
  'largeicon-show-top-sidebar': {
    x: -160,
    y: -72,
    width: 28,
    height: 24,
    spritesheet: 'largeicons',
    isMask: true,
    transform: 'translate(4px, 0) rotate(90deg)'
  },
  'largeicon-hide-top-sidebar': {
    x: -192,
    y: -72,
    width: 28,
    height: 24,
    spritesheet: 'largeicons',
    isMask: true,
    transform: 'translate(4px, 1px) rotate(90deg)'
  },
  'largeicon-show-bottom-sidebar': {
    x: -160,
    y: -72,
    width: 28,
    height: 24,
    spritesheet: 'largeicons',
    isMask: true,
    transform: 'translate(4px, 0) rotate(-90deg)'
  },
  'largeicon-hide-bottom-sidebar': {
    x: -192,
    y: -72,
    width: 28,
    height: 24,
    spritesheet: 'largeicons',
    isMask: true,
    transform: 'translate(4px, 1px) rotate(-90deg)'
  },
};
