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
    this._mainContainer = new UI.VBox();

    this._sideBar = new CssOverview.CSSOverviewSidebarPanel();
    this.splitWidget().setSidebarWidget(this._sideBar);
    this.splitWidget().setMainWidget(this._mainContainer);

    this._cssModel = target.model(SDK.CSSModel);
    this._linkifier = new Components.Linkifier(/* maxLinkLength */ 20, /* useLinkDecorator */ true);

    this._columns = [
      {id: 'text', title: ls`Text`, visible: true, sortable: true, weight: 60},
      {id: 'sourceURL', title: ls`Source`, visible: true, sortable: true, weight: 40}
    ];

    this._mediaQueryGrid = new DataGrid.SortableDataGrid(this._columns);
    this._mediaQueryGrid.element.classList.add('media-query-grid');
    this._mediaQueryGrid.setStriped(true);
    this._mediaQueryGrid.addEventListener(
        DataGrid.DataGrid.Events.SortingChanged, this._sortMediaQueryDataGrid.bind(this));

    this._sideBar.addItem(ls`Overview summary`, 'summary');
    this._sideBar.addItem(ls`Colors`, 'colors');
    this._sideBar.addItem(ls`Media queries`, 'media-queries');
    this._sideBar.select('summary');

    this._sideBar.addEventListener(CssOverview.SidebarEvents.ItemSelected, this._sideBarItemSelected, this);
    this._sideBar.addEventListener(CssOverview.SidebarEvents.Reset, this._sideBarReset, this);
    this._controller.addEventListener(CssOverview.Events.Reset, this._reset, this);
    this._render({});
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
    this._mainContainer.element.removeChildren();
    this._mediaQueryGrid.rootNode().removeChildren();
  }

  _render(data) {
    if (!(data && ('textColors' in data) && ('backgroundColors' in data))) {
      return;
    }

    const {elementStyleStats, elementCount, backgroundColors, textColors, globalStyleStats, mediaQueries} = data;

    // Convert rgb values from the computed styles to either undefined or HEX(A) strings.
    const nonTransparentBackgroundColors = this._getNonTransparentColorStrings(backgroundColors);
    const nonTransparentTextColors = this._getNonTransparentColorStrings(textColors);

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
            <div class="value">${this._formatter.format(elementStyleStats.type.size)}</div>
          </li>
          <li>
            <div class="label">${ls`ID selectors`}</div>
            <div class="value">${this._formatter.format(elementStyleStats.id.size)}</div>
          </li>
          <li>
            <div class="label">${ls`Class selectors`}</div>
            <div class="value">${this._formatter.format(elementStyleStats.class.size)}</div>
          </li>
          <li>
            <div class="label">${ls`Universal selectors`}</div>
            <div class="value">${this._formatter.format(elementStyleStats.universal.size)}</div>
          </li>
          <li>
            <div class="label">${ls`Attribute selectors`}</div>
            <div class="value">${this._formatter.format(elementStyleStats.attribute.size)}</div>
          </li>
          <li>
            <div class="label">${ls`Non-simple selectors`}</div>
            <div class="value">${this._formatter.format(elementStyleStats.nonSimple.size)}</div>
          </li>
        </ul>
      </div>

      <div $="colors" class="results-section colors">
        <h1>${ls`Colors`}</h1>
        <h2>${ls`Unique background colors: ${nonTransparentBackgroundColors.length}`}</h2>
        <ul>
          ${nonTransparentBackgroundColors.map(this._colorsToFragment)}
        </ul>

        <h2>${ls`Unique text colors: ${nonTransparentTextColors.length}`}</h2>
        <ul>
          ${nonTransparentTextColors.map(this._colorsToFragment)}
        </ul>
      </div>

      <div $="media-queries" class="results-section media-queries">
        <h1>${ls`Media queries`}</h1>
        ${this._mediaQueryGrid.element}
      </div>
    </div>`;

    // Media Queries.
    for (const mediaQuery of mediaQueries) {
      const mediaQueryNode = new CssOverview.CSSOverviewCompletedView.MediaQueryNode(
          this._mediaQueryGrid, mediaQuery, this._cssModel, this._linkifier);
      mediaQueryNode.selectable = false;
      this._mediaQueryGrid.insertChild(mediaQueryNode);
    }

    this._mainContainer.element.appendChild(this._fragment.element());
    this._mediaQueryGrid.renderInline();
    this._mediaQueryGrid.wasShown();
  }

  _colorsToFragment(color) {
    const colorFormatted =
        color.hasAlpha() ? color.asString(Common.Color.Format.HEXA) : color.asString(Common.Color.Format.HEX);
    const blockFragment = UI.Fragment.build`<li>
      <div class="block" $="color"></div>
      <div class="block-title">${colorFormatted}</div>
    </li>`;

    const block = blockFragment.$('color');
    block.style.backgroundColor = colorFormatted;

    let [h, s, l] = color.hsla();
    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);

    // Reduce the lightness of the border to make sure that there's always a visible outline.
    l = Math.max(0, l - 15);

    const borderString = `1px solid hsl(${h}, ${s}%, ${l}%)`;
    block.style.border = borderString;

    return blockFragment;
  }

  _getNonTransparentColorStrings(colors) {
    return Array.from(colors)
        .map(colorText => {
          const color = Common.Color.parse(colorText);
          if (color.rgba()[3] === 0) {
            return;
          }

          return color;
        })
        .filter(color => !!color);
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
        cell.textContent = `${this.data.sourceURL} (not available)`;
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
