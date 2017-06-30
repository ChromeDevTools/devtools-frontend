// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Resources.ResourcesSection = class {
  /**
   * @param {!Resources.ResourcesPanel} storagePanel
   * @param {!UI.TreeElement} treeElement
   */
  constructor(storagePanel, treeElement) {
    this._panel = storagePanel;
    this._treeElement = treeElement;
    /** @type {!Map<string, !Resources.FrameTreeElement>} */
    this._treeElementForFrameId = new Map();

    function addListener(eventType, handler, target) {
      SDK.targetManager.addModelListener(SDK.ResourceTreeModel, eventType, event => handler.call(target, event.data));
    }
    addListener(SDK.ResourceTreeModel.Events.FrameAdded, this._frameAdded, this);
    addListener(SDK.ResourceTreeModel.Events.FrameNavigated, this._frameNavigated, this);
    addListener(SDK.ResourceTreeModel.Events.FrameDetached, this._frameDetached, this);
    addListener(SDK.ResourceTreeModel.Events.ResourceAdded, this._resourceAdded, this);

    var mainTarget = SDK.targetManager.mainTarget();
    var resourceTreeModel = mainTarget && mainTarget.model(SDK.ResourceTreeModel);
    var mainFrame = resourceTreeModel && resourceTreeModel.mainFrame;
    if (mainFrame)
      this._populateFrame(mainFrame);
  }

  /**
   * @param {!SDK.ResourceTreeFrame} frame
   * @returns {?SDK.ResourceTreeFrame}
   */
  static _getParentFrame(frame) {
    var parentFrame = frame.parentFrame;
    if (parentFrame)
      return parentFrame;
    var parentTarget = frame.resourceTreeModel().target().parentTarget();
    if (!parentTarget)
      return null;
    return parentTarget.model(SDK.ResourceTreeModel).mainFrame;
  }

  /**
   * @param {!SDK.ResourceTreeFrame} frame
   */
  _frameAdded(frame) {
    var parentFrame = Resources.ResourcesSection._getParentFrame(frame);
    var parentTreeElement = parentFrame ? this._treeElementForFrameId.get(parentFrame.id) : this._treeElement;
    if (!parentTreeElement) {
      console.warn(`No frame to route ${frame.url} to.`);
      return;
    }

    var frameTreeElement = new Resources.FrameTreeElement(this._panel, frame);
    this._treeElementForFrameId.set(frame.id, frameTreeElement);
    parentTreeElement.appendChild(frameTreeElement);
  }

  /**
   * @param {!SDK.ResourceTreeFrame} frame
   */
  _frameDetached(frame) {
    var frameTreeElement = this._treeElementForFrameId.get(frame.id);
    if (!frameTreeElement)
      return;

    this._treeElementForFrameId.remove(frame.id);
    if (frameTreeElement.parent)
      frameTreeElement.parent.removeChild(frameTreeElement);
  }

  /**
   * @param {!SDK.ResourceTreeFrame} frame
   */
  _frameNavigated(frame) {
    var frameTreeElement = this._treeElementForFrameId.get(frame.id);
    if (frameTreeElement)
      frameTreeElement.frameNavigated(frame);
  }

  /**
   * @param {!SDK.Resource} resource
   */
  _resourceAdded(resource) {
    var statusCode = resource['statusCode'];
    if (statusCode >= 301 && statusCode <= 303)
      return;

    var frameTreeElement = this._treeElementForFrameId.get(resource.frameId);
    if (!frameTreeElement) {
      // This is a frame's main resource, it will be retained
      // and re-added by the resource manager;
      return;
    }

    frameTreeElement.appendResource(resource);
  }

  reset() {
    this._treeElement.removeChildren();
    this._treeElementForFrameId.clear();
  }

  /**
   * @param {!SDK.ResourceTreeFrame} frame
   */
  _populateFrame(frame) {
    this._frameAdded(frame);
    for (var child of frame.childFrames)
      this._populateFrame(child);
    for (var resource of frame.resources())
      this._resourceAdded(resource);
  }
};

Resources.FrameTreeElement = class extends Resources.BaseStorageTreeElement {
  /**
   * @param {!Resources.ResourcesPanel} storagePanel
   * @param {!SDK.ResourceTreeFrame} frame
   */
  constructor(storagePanel, frame) {
    super(storagePanel, '', false);
    this._panel = storagePanel;
    this._frame = frame;
    this._frameId = frame.id;
    this._categoryElements = {};
    this._treeElementForResource = {};
    this.frameNavigated(frame);

    var icon = UI.Icon.create('largeicon-navigator-frame', 'navigator-tree-item');
    icon.classList.add('navigator-frame-tree-item');
    this.setLeadingIcons([icon]);
  }

  frameNavigated(frame) {
    this.removeChildren();
    this._frameId = frame.id;
    this.title = frame.displayName();
    this._categoryElements = {};
    this._treeElementForResource = {};
  }

  get itemURL() {
    return 'frame://' + encodeURI(this.titleAsText());
  }

  /**
   * @override
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    this._panel.showCategoryView(this.titleAsText());

    this.listItemElement.classList.remove('hovered');
    SDK.OverlayModel.hideDOMNodeHighlight();
    return false;
  }

  set hovered(hovered) {
    if (hovered) {
      this.listItemElement.classList.add('hovered');
      this._frame.resourceTreeModel().domModel().overlayModel().highlightFrame(this._frameId);
    } else {
      this.listItemElement.classList.remove('hovered');
      SDK.OverlayModel.hideDOMNodeHighlight();
    }
  }

  /**
   * @param {!SDK.Resource} resource
   */
  appendResource(resource) {
    var resourceType = resource.resourceType();
    var categoryName = resourceType.name();
    var categoryElement = resourceType === Common.resourceTypes.Document ? this : this._categoryElements[categoryName];
    if (!categoryElement) {
      categoryElement =
          new Resources.StorageCategoryTreeElement(this._panel, resource.resourceType().category().title, categoryName);
      this._categoryElements[resourceType.name()] = categoryElement;
      this._insertInPresentationOrder(this, categoryElement);
    }
    var resourceTreeElement = new Resources.FrameResourceTreeElement(this._panel, resource);
    this._insertInPresentationOrder(categoryElement, resourceTreeElement);
    this._treeElementForResource[resource.url] = resourceTreeElement;
  }

  /**
   * @param {string} url
   * @return {?SDK.Resource}
   */
  resourceByURL(url) {
    var treeElement = this._treeElementForResource[url];
    return treeElement ? treeElement._resource : null;
  }

  /**
   * @override
   */
  appendChild(treeElement) {
    this._insertInPresentationOrder(this, treeElement);
  }

  _insertInPresentationOrder(parentTreeElement, childTreeElement) {
    // Insert in the alphabetical order, first frames, then resources. Document resource goes last.
    function typeWeight(treeElement) {
      if (treeElement instanceof Resources.StorageCategoryTreeElement)
        return 2;
      if (treeElement instanceof Resources.FrameTreeElement)
        return 1;
      return 3;
    }

    function compare(treeElement1, treeElement2) {
      var typeWeight1 = typeWeight(treeElement1);
      var typeWeight2 = typeWeight(treeElement2);

      var result;
      if (typeWeight1 > typeWeight2)
        result = 1;
      else if (typeWeight1 < typeWeight2)
        result = -1;
      else
        result = treeElement1.titleAsText().localeCompare(treeElement2.titleAsText());
      return result;
    }

    var childCount = parentTreeElement.childCount();
    var i;
    for (i = 0; i < childCount; ++i) {
      if (compare(childTreeElement, parentTreeElement.childAt(i)) < 0)
        break;
    }
    parentTreeElement.insertChild(childTreeElement, i);
  }
};

Resources.FrameResourceTreeElement = class extends Resources.BaseStorageTreeElement {
  /**
   * @param {!Resources.ResourcesPanel} storagePanel
   * @param {!SDK.Resource} resource
   */
  constructor(storagePanel, resource) {
    super(storagePanel, resource.displayName, false);
    this._panel = storagePanel;
    /** @type {!SDK.Resource} */
    this._resource = resource;
    /** @type {?Promise<!UI.Widget>} */
    this._previewPromise = null;
    this.tooltip = resource.url;
    this._resource[Resources.FrameResourceTreeElement._symbol] = this;

    var icon = UI.Icon.create('largeicon-navigator-file', 'navigator-tree-item');
    icon.classList.add('navigator-file-tree-item');
    icon.classList.add('navigator-' + resource.resourceType().name() + '-tree-item');
    this.setLeadingIcons([icon]);
  }

  /**
   * @param {!SDK.Resource} resource
   */
  static forResource(resource) {
    return resource[Resources.FrameResourceTreeElement._symbol];
  }

  get itemURL() {
    return this._resource.url;
  }

  /**
   * @return {!Promise<!UI.Widget>}
   */
  _preparePreview() {
    if (this._previewPromise)
      return this._previewPromise;
    var viewPromise = SourceFrame.PreviewFactory.createPreview(this._resource, this._resource.mimeType);
    this._previewPromise = viewPromise.then(view => {
      if (view)
        return view;
      return new UI.EmptyWidget(this._resource.url);
    });
    return this._previewPromise;
  }

  /**
   * @override
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    this._panel.scheduleShowView(this._preparePreview());
    return false;
  }

  /**
   * @override
   * @return {boolean}
   */
  ondblclick(event) {
    InspectorFrontendHost.openInNewTab(this._resource.url);
    return false;
  }

  /**
   * @override
   */
  onattach() {
    super.onattach();
    this.listItemElement.draggable = true;
    this.listItemElement.addEventListener('dragstart', this._ondragstart.bind(this), false);
    this.listItemElement.addEventListener('contextmenu', this._handleContextMenuEvent.bind(this), true);
  }

  /**
   * @param {!MouseEvent} event
   * @return {boolean}
   */
  _ondragstart(event) {
    event.dataTransfer.setData('text/plain', this._resource.content || '');
    event.dataTransfer.effectAllowed = 'copy';
    return true;
  }

  _handleContextMenuEvent(event) {
    var contextMenu = new UI.ContextMenu(event);
    contextMenu.appendApplicableItems(this._resource);
    contextMenu.show();
  }

  /**
   * @param {number=} line
   * @param {number=} column
   */
  async revealResource(line, column) {
    this.revealAndSelect(true);
    var view = await this._panel.scheduleShowView(this._preparePreview());
    if (!(view instanceof SourceFrame.ResourceSourceFrame) || typeof line !== 'number')
      return;
    view.revealPosition(line, column, true);
  }
};

Resources.FrameResourceTreeElement._symbol = Symbol('treeElement');
