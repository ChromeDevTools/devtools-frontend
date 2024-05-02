// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LitHtml from '../../../lit-html/lit-html.js';
import * as VisualLogging from '../../../visual_logging/visual_logging.js';

import pieChartStyles from './pieChart.css.js';

const {render, html, svg} = LitHtml;

import * as i18n from '../../../../core/i18n/i18n.js';
const UIStrings = {
  /**
   *@description Text for sum
   */
  total: 'Total',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/perf_ui/PieChart.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface Slice {
  value: number;
  color: string;
  title: string;
}

export interface PieChartData {
  chartName: string;
  size: number;
  formatter: (value: number) => string;
  showLegend: boolean;
  total: number;
  slices: Slice[];
}
// If the slices are not available when constructing the pie chart, set .data
// immediately, with total=0 and slices=[], so that the chart is rendered with
// the correct initial size. This avoids a layout shift when the slices are
// later populated.
export class PieChart extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-perf-piechart`;
  private readonly shadow = this.attachShadow({mode: 'open'});
  private chartName = '';
  private size = 0;
  private formatter = (val: number): string => String(val);
  private showLegend = false;
  private total = 0;
  private slices: readonly Slice[] = [];

  private totalSelected = true;
  private sliceSelected = -1;

  private readonly innerR = 0.618;
  private lastAngle = -Math.PI / 2;

  connectedCallback(): void {
    this.shadow.adoptedStyleSheets = [pieChartStyles];
  }

  set data(data: PieChartData) {
    this.chartName = data.chartName;
    this.size = data.size;
    this.formatter = data.formatter;
    this.showLegend = data.showLegend;
    this.total = data.total;
    this.slices = data.slices;

    this.render();
  }

  private render(): void {
    this.lastAngle = -Math.PI / 2;
    // clang-format off
    const output = html`
      <div class="root" role="group" @keydown=${this.onKeyDown} aria-label=${this.chartName}
          jslog=${VisualLogging.pieChart().track({keydown: 'ArrowUp|ArrowDown'})}>
        <div class="chart-root" style="width: ${this.size}px; height: ${this.size}px;">
          ${svg`
          <svg>
          <g transform="scale(${this.size / 2}) translate(1, 1) scale(0.99, 0.99)">
            <circle r="1" stroke="hsl(0, 0%, 80%)" fill="transparent" stroke-width=${1 / this.size}></circle>
            <circle r=${this.innerR} stroke="hsl(0, 0%, 80%)" fill="transparent" stroke-width=${1 / this.size}></circle>
            ${this.slices.map((slice, index) => {
              const selected = this.sliceSelected === index;
              const tabIndex = selected && !this.showLegend ? '0' : '-1';
              return svg`<path class="slice ${selected ? 'selected' : ''}"
                  jslog=${VisualLogging.pieChartSlice().track({click: true})}
                  @click=${this.onSliceClicked(index)} tabIndex=${tabIndex}
                  fill=${slice.color} d=${this.getPathStringForSlice(slice)}
                  aria-label=${slice.title} id=${selected ? 'selectedSlice' : ''}></path>`;
            })}
            <!-- This is so that the selected slice is re-drawn on top, to avoid re-ordering slices
            just to render them properly. -->
            <use href="#selectedSlice" />
            </g>
          </svg>
          `}
          <div class="pie-chart-foreground">
            <div class="pie-chart-total ${this.totalSelected ? 'selected' : ''}" @click=${this.selectTotal}
                jslog=${VisualLogging.pieChartTotal('select-total').track({click: true})}
                tabIndex=${this.totalSelected && !this.showLegend ? '1' : '-1'}>
              ${this.total ? this.formatter(this.total) : ''}
            </div>
          </div>
        </div>
        ${this.showLegend ? html`
        <div class="pie-chart-legend" jslog=${VisualLogging.section('legend')}>
          ${this.slices.map((slice, index) => {
            const selected = this.sliceSelected === index;
            return html`
              <div class="pie-chart-legend-row ${selected ? 'selected' : ''}"
                  jslog=${VisualLogging.pieChartSlice().track({click: true})}
                  @click=${this.onSliceClicked(index)} tabIndex=${selected ? '0' : '-1'}>
                <div class="pie-chart-size">${this.formatter(slice.value)}</div>
                <div class="pie-chart-swatch" style="background-color: ${slice.color};"></div>
                <div class="pie-chart-name">${slice.title}</div>
              </div>`;
          })}
          <div class="pie-chart-legend-row ${this.totalSelected ? 'selected' : ''}"
              jslog=${VisualLogging.pieChartTotal('select-total').track({click: true})}
              @click=${this.selectTotal} tabIndex=${this.totalSelected ? '0' : '-1'}>
            <div class="pie-chart-size">${this.formatter(this.total)}</div>
            <div class="pie-chart-swatch"></div>
            <div class="pie-chart-name">${i18nString(UIStrings.total)}</div>
          </div>
        </div>
        ` : ''}
    `;
    // clang-format on
    render(output, this.shadow, {host: this});
  }

  private onSliceClicked(index: number): () => void {
    return (): void => {
      this.selectSlice(index);
    };
  }

  private selectSlice(index: number): void {
    this.totalSelected = false;
    this.sliceSelected = index;
    this.render();
  }

  private selectTotal(): void {
    this.totalSelected = true;
    this.sliceSelected = -1;
    this.render();
  }

  private selectAndFocusTotal(): void {
    this.selectTotal();
    // In order for the :focus-visible styles to work, we need to focus the
    // newly selected item. This is so that the outline is only shown for focus
    // caused by keyboard events and not all focus e.g. showing a focus ring
    // when we click on something is not necessary. The same goes for focusing
    // slices below.
    const totalLegendRow = this.shadow.querySelector<HTMLDivElement>('.pie-chart-legend > :last-child');
    if (!totalLegendRow) {
      return;
    }
    totalLegendRow.focus();
  }

  private selectAndFocusSlice(index: number): void {
    this.selectSlice(index);
    const sliceLegendRow = this.shadow.querySelector<HTMLDivElement>(`.pie-chart-legend > :nth-child(${index + 1})`);
    if (!sliceLegendRow) {
      return;
    }
    sliceLegendRow.focus();
  }

  private focusNextElement(): void {
    if (this.totalSelected) {
      this.selectAndFocusSlice(0);
    } else if (this.sliceSelected === this.slices.length - 1) {
      this.selectAndFocusTotal();
    } else {
      this.selectAndFocusSlice(this.sliceSelected + 1);
    }
  }

  private focusPreviousElement(): void {
    if (this.totalSelected) {
      this.selectAndFocusSlice(this.slices.length - 1);
    } else if (this.sliceSelected === 0) {
      this.selectAndFocusTotal();
    } else {
      this.selectAndFocusSlice(this.sliceSelected - 1);
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    let handled = false;
    if (event.key === 'ArrowDown') {
      this.focusNextElement();
      handled = true;
    } else if (event.key === 'ArrowUp') {
      this.focusPreviousElement();
      handled = true;
    }

    if (handled) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }

  private getPathStringForSlice(slice: Slice): string|undefined {
    const value = slice.value;
    let sliceAngle = value / this.total * 2 * Math.PI;
    if (!isFinite(sliceAngle)) {
      return;
    }
    sliceAngle = Math.min(sliceAngle, 2 * Math.PI * 0.9999);
    const x1 = Math.cos(this.lastAngle);
    const y1 = Math.sin(this.lastAngle);
    this.lastAngle += sliceAngle;
    const x2 = Math.cos(this.lastAngle);
    const y2 = Math.sin(this.lastAngle);
    const r2 = this.innerR;
    const x3 = x2 * r2;
    const y3 = y2 * r2;
    const x4 = x1 * r2;
    const y4 = y1 * r2;
    const largeArc = sliceAngle > Math.PI ? 1 : 0;

    const pathString =
        `M${x1},${y1} A1,1,0,${largeArc},1,${x2},${y2} L${x3},${y3} A${r2},${r2},0,${largeArc},0,${x4},${y4} Z`;
    return pathString;
  }
}

customElements.define('devtools-perf-piechart', PieChart);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-perf-piechart': PieChart;
  }
}
