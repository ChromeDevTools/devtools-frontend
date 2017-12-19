// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

ProductRegistry.BadgePool = class {
  /**
   * @param {boolean=} forceShow
   */
  constructor(forceShow) {
    this._showTitles = false;
    /** @type {!Map<!Element, function():!Promise<!Common.ParsedURL>>} */
    this._badgeElements = new Map();
    if (!forceShow) {
      this._setting = Common.settings.moduleSetting('product_registry.badges-visible');
      this._setting.addChangeListener(this._settingUpdated.bind(this));
      if (this._setting.get())
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.ShowedThirdPartyBadges);
    }
  }

  /**
   * @param {boolean} value
   */
  setShowTitles(value) {
    this._showTitles = value;
  }

  /**
   * @param {!SDK.ResourceTreeFrame} frame
   * @return {!Element}
   */
  badgeForFrame(frame) {
    return this._badgeForFrameOrUrl(this._resolveUrl.bind(this, frame));
  }

  /**
   * @param {!Common.ParsedURL} parsedUrl
   * @return {!Element}
   */
  badgeForURL(parsedUrl) {
    return this._badgeForFrameOrUrl(() => Promise.resolve(parsedUrl));
  }

  reset() {
    this._badgeElements.clear();
  }

  /**
   * @param {function():!Promise<!Common.ParsedURL>} urlResolver
   * @return {!Element}
   */
  _badgeForFrameOrUrl(urlResolver) {
    var element = createElementWithClass('span', 'hidden');
    var root = UI.createShadowRootWithCoreStyles(element, 'product_registry/badge.css');
    var badgeElement = root.createChild('span');
    badgeElement.classList.toggle('hide-badge-title', !this._showTitles);
    badgeElement.addEventListener('mousedown', event => event.consume());
    badgeElement.addEventListener('click', event => {
      this._showPopup(badgeElement);
      event.consume();
    }, false);
    this._badgeElements.set(badgeElement, urlResolver);
    this._renderBadge(badgeElement);
    return element;
  }

  /**
   * @param {?SDK.ResourceTreeFrame} frame
   * @return {!Promise<!Common.ParsedURL>}
   */
  async _resolveUrl(frame) {
    var registry = await ProductRegistry.instance();
    var parsedUrl = new Common.ParsedURL(frame.url);
    var entry = registry.entryForUrl(parsedUrl);
    if (!entry) {
      frame.findCreationCallFrame(callFrame => {
        if (!callFrame.url)
          return false;
        parsedUrl = new Common.ParsedURL(callFrame.url);
        return !!registry.entryForUrl(parsedUrl);
      });
    }
    return parsedUrl;
  }

  /**
   * @param {!Element} badgeElement
   */
  async _renderBadge(badgeElement) {
    if (badgeElement.children.length || !this._isVisible(badgeElement)) {
      this._updateBadgeElementVisibility(badgeElement);
      return;
    }

    var parsedUrl = await this._badgeElements.get(badgeElement)();
    var registry = await ProductRegistry.instance();
    var entryName = parsedUrl && registry.nameForUrl(parsedUrl);
    if (!entryName)
      return;

    var tokens = entryName.replace(/[a-z]*/g, '').split(' ');
    var label;
    if (tokens.length > 1)
      label = tokens[0][0] + tokens[1][0];
    else
      label = entryName;

    var iconElement = badgeElement.createChild('span', 'product-registry-badge monospace');
    iconElement.setAttribute('data-initial', label.substring(0, 2).toUpperCase());
    iconElement.title = entryName;
    iconElement.style.backgroundColor = ProductRegistry.BadgePool.colorForEntryName(entryName);

    badgeElement.createChild('span', 'product-registry-badge-title').textContent = entryName;
    this._updateBadgeElementVisibility(badgeElement);
  }

  _settingUpdated() {
    for (var badgeElement of this._badgeElements.keys())
      this._renderBadge(badgeElement);
  }

  /**
   * @param {!Element} badgeElement
   * @return {boolean}
   */
  _isVisible(badgeElement) {
    return !this._setting || this._setting.get();
  }

  /**
   * @param {!Element} badgeElement
   */
  _updateBadgeElementVisibility(badgeElement) {
    badgeElement.parentNodeOrShadowHost().parentNodeOrShadowHost().classList.toggle(
        'hidden', !this._isVisible(badgeElement));
  }

  /**
   * @param {!Element} badgeElement
   */
  async _showPopup(badgeElement) {
    if (!this._badgeElements.has(badgeElement))
      return;

    var registry = await ProductRegistry.instance();
    var parsedUrl = await this._badgeElements.get(badgeElement)();
    var entryName = registry.nameForUrl(parsedUrl);

    var element = createElement('div');
    var root = UI.createShadowRootWithCoreStyles(element, 'product_registry/popup.css');
    var popupElement = root.createChild('div', 'product-registry-popup');
    var domainElement = popupElement.createChild('div', 'product-registry-domain');
    domainElement.textContent = parsedUrl.domain();
    var entryNameElement = popupElement.createChild('div', 'product-registry-name');
    entryNameElement.textContent = entryName;
    var reportLink =
        'https://docs.google.com/forms/d/e/1FAIpQLSchz2FdcQ-rRllzl8BbhWaTRRY-12BpPjW6Hr9e1-BpCA083w/viewform' +
        '?entry_1425918171=' + encodeURIComponent((parsedUrl.domain() + parsedUrl.path).substr(0, 100));
    popupElement.appendChild(UI.XLink.create(reportLink, 'Report mismatch', 'product-registry-link'));

    var dialog = new UI.Dialog();
    dialog.setContentAnchorBox(badgeElement.boxInWindow());
    dialog.contentElement.appendChild(element);
    dialog.setSizeBehavior(UI.GlassPane.SizeBehavior.MeasureContent);
    dialog.setAnchorBehavior(UI.GlassPane.AnchorBehavior.PreferTop);
    dialog.addCloseButton();
    dialog.show(/** @type {!Document} */ (badgeElement.ownerDocument));
  }

  /**
   * @param {string} entryName
   * @return {string}
   */
  static colorForEntryName(entryName) {
    if (!ProductRegistry.BadgePool._colorGenerator) {
      ProductRegistry.BadgePool._colorGenerator =
          new Common.Color.Generator({min: 30, max: 330}, {min: 50, max: 80, count: 3}, 80);
    }
    return ProductRegistry.BadgePool._colorGenerator.colorForID(entryName);
  }
};
