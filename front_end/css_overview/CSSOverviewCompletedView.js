// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @unrestricted
 */
CssOverview.CSSOverviewCompletedView = class extends UI.PanelWithSidebar {
  constructor(controller, target) {
    super('css_overview_completed_view');
    this.registerRequiredCSS('css_overview/cssOverviewCompletedView.css');

    this._controller = controller;
    this._formatter = new Intl.NumberFormat('en-US');

    this._mainContainer = new UI.SplitWidget(true, true);
    this._resultsContainer = new UI.VBox();
    this._elementContainer = new UI.VBox();

    // Dupe the styles into the main container because of the shadow root will prevent outer styles.
    this._mainContainer.registerRequiredCSS('css_overview/cssOverviewCompletedView.css');

    this._mainContainer.setMainWidget(this._resultsContainer);
    this._mainContainer.setSidebarWidget(this._elementContainer);
    this._mainContainer.setVertical(false);
    this._mainContainer.setSecondIsSidebar(true);
    this._mainContainer.setSidebarMinimized(true);

    this._sideBar = new CssOverview.CSSOverviewSidebarPanel();
    this.splitWidget().setSidebarWidget(this._sideBar);
    this.splitWidget().setMainWidget(this._mainContainer);

    this._cssModel = target.model(SDK.CSSModel);
    this._domModel = target.model(SDK.DOMModel);
    this._domAgent = target.domAgent();
    this._linkifier = new Components.Linkifier(/* maxLinkLength */ 20, /* useLinkDecorator */ true);
    this._relatedNodesMap = new Map();

    this._mediaQueryColumns = [
      {id: 'text', title: ls`Text`, visible: true, sortable: true, weight: 60},
      {id: 'sourceURL', title: ls`Source`, visible: true, sortable: true, weight: 40}
    ];

    this._mediaQueryGrid = new DataGrid.SortableDataGrid(this._mediaQueryColumns);
    this._mediaQueryGrid.element.classList.add('media-query-grid');
    this._mediaQueryGrid.setStriped(true);
    this._mediaQueryGrid.addEventListener(
        DataGrid.DataGrid.Events.SortingChanged, this._sortMediaQueryDataGrid.bind(this));

    this._sideBar.addItem(ls`Overview summary`, 'summary');
    this._sideBar.addItem(ls`Colors`, 'colors');
    this._sideBar.addItem(ls`Media queries`, 'media-queries');
    this._sideBar.select('summary');

    this._elementGridColumns = [{id: 'nodeId', title: ls`Element`, visible: true, sortable: true, weight: 100}];

    this._elementGrid = new DataGrid.SortableDataGrid(this._elementGridColumns);
    this._elementGrid.element.classList.add('element-grid');
    this._elementGrid.element.addEventListener('mouseover', this._onMouseOver.bind(this));
    this._elementGrid.setStriped(true);

    this._sideBar.addEventListener(CssOverview.SidebarEvents.ItemSelected, this._sideBarItemSelected, this);
    this._sideBar.addEventListener(CssOverview.SidebarEvents.Reset, this._sideBarReset, this);
    this._controller.addEventListener(CssOverview.Events.Reset, this._reset, this);
    this._controller.addEventListener(CssOverview.Events.PopulateNodes, this._populateNodes, this);
    this._resultsContainer.element.addEventListener('click', this._onClick.bind(this));

    this._data = null;
  }

  _sortMediaQueryDataGrid() {
    const sortColumnId = this._mediaQueryGrid.sortColumnId();
    if (!sortColumnId) {
      return;
    }

    const comparator = DataGrid.SortableDataGrid.StringComparator.bind(null, sortColumnId);
    this._mediaQueryGrid.sortNodes(comparator, !this._mediaQueryGrid.isSortOrderAscending());
  }

  _sideBarItemSelected(event) {
    const section = this._fragment.$(event.data);
    if (!section) {
      return;
    }

    section.scrollIntoView();
  }

  _sideBarReset() {
    this._controller.dispatchEventToListeners(CssOverview.Events.Reset);
  }

  _reset() {
    this._resultsContainer.element.removeChildren();
    this._mediaQueryGrid.rootNode().removeChildren();
    this._elementGrid.rootNode().removeChildren();
    this._relatedNodesMap = new Map();
    this._mainContainer.setSidebarMinimized(true);
  }

  _onClick(evt) {
    const color = evt.target.dataset.color;
    const section = evt.target.dataset.section;
    if (!color) {
      return;
    }

    let colorNodes;
    switch (section) {
      case 'text':
        colorNodes = this._data.textColors.get(color);
        break;

      case 'background':
        colorNodes = this._data.backgroundColors.get(color);
        break;

      case 'fill':
        colorNodes = this._data.fillColors.get(color);
        break;

      case 'border':
        colorNodes = this._data.borderColors.get(color);
        break;
    }

    if (!colorNodes) {
      return;
    }

    evt.consume();
    this._controller.dispatchEventToListeners(CssOverview.Events.PopulateNodes, {color, colorNodes});
  }

  _onMouseOver(evt) {
    // Traverse the event path on the grid to find the nearest element with a backend node ID attached. Use
    // that for the highlighting.
    const node = evt.path.find(el => el.dataset && el.dataset.backendNodeId);
    if (!node) {
      return;
    }

    const backendNodeId = Number(node.dataset.backendNodeId);
    this._controller.dispatchEventToListeners(CssOverview.Events.RequestNodeHighlight, backendNodeId);
  }

  _render(data) {
    if (!data || !('backgroundColors' in data) || !('textColors' in data)) {
      return;
    }

    this._data = data;
    const {elementCount, backgroundColors, textColors, fillColors, borderColors, globalStyleStats, mediaQueries} =
        this._data;

    // Convert rgb values from the computed styles to either undefined or HEX(A) strings.
    const sortedBackgroundColors = this._sortColorsByLuminance(backgroundColors);
    const sortedTextColors = this._sortColorsByLuminance(textColors);
    const sortedFillColors = this._sortColorsByLuminance(fillColors);
    const sortedBorderColors = this._sortColorsByLuminance(borderColors);

    this._fragment = UI.Fragment.build`
    <div class="vbox overview-completed-view">
      <div $="summary" class="results-section summary">
        <h1>${ls`Overview summary`}</h1>

        <ul>
          <li>
            <div class="label">${ls`Elements processed`}</div>
            <div class="value">${this._formatter.format(elementCount)}</div>
          </li>
          <li>
            <div class="label">${ls`External stylesheets`}</div>
            <div class="value">${this._formatter.format(globalStyleStats.externalSheets)}</div>
          </li>
          <li>
            <div class="label">${ls`Inline style elements`}</div>
            <div class="value">${this._formatter.format(globalStyleStats.inlineStyles)}</div>
          </li>
          <li>
            <div class="label">${ls`Style rules`}</div>
            <div class="value">${this._formatter.format(globalStyleStats.styleRules)}</div>
          </li>
          <li>
            <div class="label">${ls`Media queries`}</div>
            <div class="value">${this._formatter.format(mediaQueries.length)}</div>
          </li>
          <li>
            <div class="label">${ls`Type selectors`}</div>
            <div class="value">${this._formatter.format(globalStyleStats.stats.type)}</div>
          </li>
          <li>
            <div class="label">${ls`ID selectors`}</div>
            <div class="value">${this._formatter.format(globalStyleStats.stats.id)}</div>
          </li>
          <li>
            <div class="label">${ls`Class selectors`}</div>
            <div class="value">${this._formatter.format(globalStyleStats.stats.class)}</div>
          </li>
          <li>
            <div class="label">${ls`Universal selectors`}</div>
            <div class="value">${this._formatter.format(globalStyleStats.stats.universal)}</div>
          </li>
          <li>
            <div class="label">${ls`Attribute selectors`}</div>
            <div class="value">${this._formatter.format(globalStyleStats.stats.attribute)}</div>
          </li>
          <li>
            <div class="label">${ls`Non-simple selectors`}</div>
            <div class="value">${this._formatter.format(globalStyleStats.stats.nonSimple)}</div>
          </li>
        </ul>
      </div>

      <div $="colors" class="results-section colors">
        <h1>${ls`Colors`}</h1>
        <h2>${ls`Unique background colors: ${sortedBackgroundColors.length}`}</h2>
        <ul>
          ${sortedBackgroundColors.map(this._colorsToFragment.bind(this, 'background'))}
        </ul>

        <h2>${ls`Unique text colors: ${sortedTextColors.length}`}</h2>
        <ul>
          ${sortedTextColors.map(this._colorsToFragment.bind(this, 'text'))}
        </ul>

        <h2>${ls`Unique fill colors: ${sortedFillColors.length}`}</h2>
        <ul>
          ${sortedFillColors.map(this._colorsToFragment.bind(this, 'fill'))}
        </ul>

        <h2>${ls`Unique border colors: ${sortedBorderColors.length}`}</h2>
        <ul>
          ${sortedBorderColors.map(this._colorsToFragment.bind(this, 'border'))}
        </ul>
      </div>

      <!-- TODO: Fonts -->

      <div $="media-queries" class="results-section media-queries">
        <h1>${ls`Media queries`}</h1>
        ${mediaQueries.length > 0 ? this._mediaQueryGrid.element : `There are no media queries.`}
      </div>
    </div>`;

    // Media Queries.
    for (const mediaQuery of mediaQueries) {
      const mediaQueryNode = new CssOverview.CSSOverviewCompletedView.MediaQueryNode(
          this._mediaQueryGrid, mediaQuery, this._cssModel, this._linkifier);
      mediaQueryNode.selectable = false;
      this._mediaQueryGrid.insertChild(mediaQueryNode);
    }

    this._resultsContainer.element.appendChild(this._fragment.element());
    this._elementContainer.element.appendChild(this._elementGrid.element);

    this._mediaQueryGrid.renderInline();
    this._mediaQueryGrid.wasShown();
  }

  async _populateNodes(evt) {
    this._elementGrid.rootNode().removeChildren();

    const {color, colorNodes} = evt.data;
    let relatedNodesMap = this._relatedNodesMap.get(color);
    if (!relatedNodesMap) {
      // This process can't be repeated so we need to now capture the Nodes and hold them in case we need to revisit
      // the same set again.
      relatedNodesMap = await this._domModel.pushNodesByBackendIdsToFrontend(colorNodes);
      this._relatedNodesMap.set(color, relatedNodesMap);
    }

    for (const domNode of relatedNodesMap.values()) {
      const colorNode = new CssOverview.CSSOverviewCompletedView.ColorNode(this._elementGrid, domNode, this._linkifier);
      colorNode.selectable = false;
      this._elementGrid.insertChild(colorNode);
    }

    this._mainContainer.setSidebarMinimized(false);
    this._elementGrid.renderInline();
    this._elementGrid.wasShown();
  }

  _colorsToFragment(section, color) {
    const blockFragment = UI.Fragment.build`<li>
      <button data-color="${color}" data-section="${section}" class="block" $="color"></button>
      <div class="block-title">${color}</div>
    </li>`;

    const block = blockFragment.$('color');
    block.style.backgroundColor = color;

    const borderColor = Common.Color.parse(color);
    let [h, s, l] = borderColor.hsla();
    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);

    // Reduce the lightness of the border to make sure that there's always a visible outline.
    l = Math.max(0, l - 15);

    const borderString = `1px solid hsl(${h}, ${s}%, ${l}%)`;
    block.style.border = borderString;

    return blockFragment;
  }

  _sortColorsByLuminance(srcColors) {
    return Array.from(srcColors.keys()).sort((colA, colB) => {
      const colorA = Common.Color.parse(colA);
      const colorB = Common.Color.parse(colB);
      return Common.Color.luminance(colorB.rgba()) - Common.Color.luminance(colorA.rgba());
    });
  }

  setOverviewData(data) {
    this._render(data);
  }
};

CssOverview.CSSOverviewCompletedView.MediaQueryNode = class extends DataGrid.SortableDataGridNode {
  /**
   * @param {!DataGrid.SortableDataGrid} dataGrid
   * @param {!Object<string,*>} mediaQueryData
   * @param {!SDK.CSSModel} cssModel
   * @param {!Components.Linkifier} linkifier
   */
  constructor(dataGrid, mediaQueryData, cssModel, linkifier) {
    super(dataGrid, mediaQueryData.hasChildren);

    this.data = mediaQueryData;
    this._cssModel = cssModel;
    this._linkifier = linkifier;
  }

  /**
   * @override
   * @param {string} columnId
   * @return {!Element}
   */
  createCell(columnId) {
    if (this.data.range && columnId === 'sourceURL') {
      const cell = this.createTD(columnId);
      const link = this._linkifyRuleLocation(
          this._cssModel, this._linkifier, this.data.styleSheetId, TextUtils.TextRange.fromObject(this.data.range));

      if (link.textContent !== '') {
        cell.appendChild(link);
      } else {
        cell.textContent = `(unable to link)`;
      }
      return cell;
    }

    return super.createCell(columnId);
  }

  _linkifyRuleLocation(cssModel, linkifier, styleSheetId, ruleLocation) {
    const styleSheetHeader = cssModel.styleSheetHeaderForId(styleSheetId);
    const lineNumber = styleSheetHeader.lineNumberInSource(ruleLocation.startLine);
    const columnNumber = styleSheetHeader.columnNumberInSource(ruleLocation.startLine, ruleLocation.startColumn);
    const matchingSelectorLocation = new SDK.CSSLocation(styleSheetHeader, lineNumber, columnNumber);
    return linkifier.linkifyCSSLocation(matchingSelectorLocation);
  }
};

CssOverview.CSSOverviewCompletedView.ColorNode = class extends DataGrid.SortableDataGridNode {
  /**
   * @param {!DataGrid.SortableDataGrid} dataGrid
   * @param {!Object<string,*>} colorData
   * @param {!Components.Linkifier} linkifier
   */
  constructor(dataGrid, colorData, linkifier) {
    super(dataGrid, colorData.hasChildren);

    this.data = colorData;
    this._linkifier = linkifier;
  }

  /**
   * @override
   * @param {string} columnId
   * @return {!Element}
   */
  createCell(columnId) {
    if (columnId === 'nodeId') {
      const cell = this.createTD(columnId);
      cell.textContent = '...';
      Common.Linkifier.linkify(this.data).then(link => {
        cell.textContent = '';
        link.dataset.backendNodeId = this.data.backendNodeId();
        cell.appendChild(link);
      });
      return cell;
    }

    return super.createCell(columnId);
  }
};
