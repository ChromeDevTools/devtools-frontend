// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import * as NetworkTimeCalculator from '../../models/network_time_calculator/network_time_calculator.js';
import * as RenderCoordinator from '../../ui/components/render_coordinator/render_coordinator.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';
import { RequestTimeRangeNameToColor } from './NetworkOverview.js';
import networkWaterfallColumnStyles from './networkWaterfallColumn.css.js';
import { RequestTimingView } from './RequestTimingView.js';
const BAR_SPACING = 1;
export class NetworkWaterfallColumn extends UI.Widget.VBox {
    canvas;
    canvasPosition;
    leftPadding;
    fontSize;
    rightPadding;
    scrollTop;
    headerHeight;
    calculator;
    rowHeight;
    offsetWidth;
    offsetHeight;
    startTime;
    endTime;
    popoverHelper;
    nodes;
    hoveredNode;
    eventDividers;
    styleForTimeRangeName;
    styleForWaitingResourceType;
    styleForDownloadingResourceType;
    wiskerStyle;
    hoverDetailsStyle;
    pathForStyle;
    textLayers;
    constructor(calculator) {
        // TODO(allada) Make this a shadowDOM when the NetworkWaterfallColumn gets moved into NetworkLogViewColumns.
        super();
        this.registerRequiredCSS(networkWaterfallColumnStyles);
        this.canvas = this.contentElement.createChild('canvas');
        this.canvas.tabIndex = -1;
        this.setDefaultFocusedElement(this.canvas);
        this.canvasPosition = this.canvas.getBoundingClientRect();
        this.leftPadding = 5;
        this.fontSize = 10;
        this.rightPadding = 0;
        this.scrollTop = 0;
        this.headerHeight = 0;
        this.calculator = calculator;
        this.rowHeight = 0;
        this.offsetWidth = 0;
        this.offsetHeight = 0;
        this.startTime = this.calculator.minimumBoundary();
        this.endTime = this.calculator.maximumBoundary();
        this.popoverHelper =
            new UI.PopoverHelper.PopoverHelper(this.element, this.getPopoverRequest.bind(this), 'network.timing');
        this.popoverHelper.setTimeout(300, 300);
        this.nodes = [];
        this.hoveredNode = null;
        this.eventDividers = new Map();
        this.element.addEventListener('mousemove', this.onMouseMove.bind(this), true);
        this.element.addEventListener('mouseleave', _event => this.setHoveredNode(null, false), true);
        this.element.addEventListener('click', this.onClick.bind(this), true);
        this.styleForTimeRangeName = NetworkWaterfallColumn.buildRequestTimeRangeStyle();
        const resourceStyleTuple = NetworkWaterfallColumn.buildResourceTypeStyle();
        this.styleForWaitingResourceType = resourceStyleTuple[0];
        this.styleForDownloadingResourceType = resourceStyleTuple[1];
        const baseLineColor = ThemeSupport.ThemeSupport.instance().getComputedValue('--sys-color-state-disabled');
        this.wiskerStyle = { borderColor: baseLineColor, lineWidth: 1, fillStyle: undefined };
        this.hoverDetailsStyle = { fillStyle: baseLineColor, lineWidth: 1, borderColor: baseLineColor };
        this.pathForStyle = new Map();
        this.textLayers = [];
    }
    static buildRequestTimeRangeStyle() {
        const styleMap = new Map();
        styleMap.set("connecting" /* NetworkTimeCalculator.RequestTimeRangeNames.CONNECTING */, { fillStyle: RequestTimeRangeNameToColor["connecting" /* NetworkTimeCalculator.RequestTimeRangeNames.CONNECTING */] });
        styleMap.set("ssl" /* NetworkTimeCalculator.RequestTimeRangeNames.SSL */, { fillStyle: RequestTimeRangeNameToColor["ssl" /* NetworkTimeCalculator.RequestTimeRangeNames.SSL */] });
        styleMap.set("dns" /* NetworkTimeCalculator.RequestTimeRangeNames.DNS */, { fillStyle: RequestTimeRangeNameToColor["dns" /* NetworkTimeCalculator.RequestTimeRangeNames.DNS */] });
        styleMap.set("proxy" /* NetworkTimeCalculator.RequestTimeRangeNames.PROXY */, { fillStyle: RequestTimeRangeNameToColor["proxy" /* NetworkTimeCalculator.RequestTimeRangeNames.PROXY */] });
        styleMap.set("blocking" /* NetworkTimeCalculator.RequestTimeRangeNames.BLOCKING */, { fillStyle: RequestTimeRangeNameToColor["blocking" /* NetworkTimeCalculator.RequestTimeRangeNames.BLOCKING */] });
        styleMap.set("push" /* NetworkTimeCalculator.RequestTimeRangeNames.PUSH */, { fillStyle: RequestTimeRangeNameToColor["push" /* NetworkTimeCalculator.RequestTimeRangeNames.PUSH */] });
        styleMap.set("queueing" /* NetworkTimeCalculator.RequestTimeRangeNames.QUEUEING */, {
            fillStyle: RequestTimeRangeNameToColor["queueing" /* NetworkTimeCalculator.RequestTimeRangeNames.QUEUEING */],
            lineWidth: 2,
            borderColor: 'lightgrey',
        });
        // This ensures we always show at least 2 px for a request.
        styleMap.set("receiving" /* NetworkTimeCalculator.RequestTimeRangeNames.RECEIVING */, {
            fillStyle: RequestTimeRangeNameToColor["receiving" /* NetworkTimeCalculator.RequestTimeRangeNames.RECEIVING */],
            lineWidth: 2,
            borderColor: '#03A9F4',
        });
        styleMap.set("waiting" /* NetworkTimeCalculator.RequestTimeRangeNames.WAITING */, { fillStyle: RequestTimeRangeNameToColor["waiting" /* NetworkTimeCalculator.RequestTimeRangeNames.WAITING */] });
        styleMap.set("receiving-push" /* NetworkTimeCalculator.RequestTimeRangeNames.RECEIVING_PUSH */, { fillStyle: RequestTimeRangeNameToColor["receiving-push" /* NetworkTimeCalculator.RequestTimeRangeNames.RECEIVING_PUSH */] });
        styleMap.set("serviceworker" /* NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER */, { fillStyle: RequestTimeRangeNameToColor["serviceworker" /* NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER */] });
        styleMap.set("serviceworker-preparation" /* NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER_PREPARATION */, {
            fillStyle: RequestTimeRangeNameToColor["serviceworker-preparation" /* NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER_PREPARATION */]
        });
        styleMap.set("serviceworker-respondwith" /* NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER_RESPOND_WITH */, {
            fillStyle: RequestTimeRangeNameToColor["serviceworker-respondwith" /* NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER_RESPOND_WITH */],
        });
        return styleMap;
    }
    static buildResourceTypeStyle() {
        const baseResourceTypeColors = new Map([
            ['document', 'hsl(215, 100%, 80%)'],
            ['font', 'hsl(8, 100%, 80%)'],
            ['media', 'hsl(90, 50%, 80%)'],
            ['image', 'hsl(90, 50%, 80%)'],
            ['script', 'hsl(31, 100%, 80%)'],
            ['stylesheet', 'hsl(272, 64%, 80%)'],
            ['texttrack', 'hsl(8, 100%, 80%)'],
            ['websocket', 'hsl(0, 0%, 95%)'],
            ['xhr', 'hsl(53, 100%, 80%)'],
            ['fetch', 'hsl(53, 100%, 80%)'],
            ['other', 'hsl(0, 0%, 95%)'],
        ]);
        const waitingStyleMap = new Map();
        const downloadingStyleMap = new Map();
        for (const resourceType of Object.values(Common.ResourceType.resourceTypes)) {
            let color = baseResourceTypeColors.get(resourceType.name());
            if (!color) {
                color = baseResourceTypeColors.get('other');
            }
            const borderColor = toBorderColor(color);
            waitingStyleMap.set(
            // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
            // @ts-expect-error
            resourceType, { fillStyle: toWaitingColor(color), lineWidth: 1, borderColor });
            // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
            // @ts-expect-error
            downloadingStyleMap.set(resourceType, { fillStyle: color, lineWidth: 1, borderColor });
        }
        return [waitingStyleMap, downloadingStyleMap];
        function toBorderColor(color) {
            const parsedColor = Common.Color.parse(color)?.as("hsl" /* Common.Color.Format.HSL */);
            if (!parsedColor) {
                return '';
            }
            let { s, l } = parsedColor;
            s /= 2;
            l -= Math.min(l, 0.2);
            return new Common.Color.HSL(parsedColor.h, s, l, parsedColor.alpha).asString();
        }
        function toWaitingColor(color) {
            const parsedColor = Common.Color.parse(color)?.as("hsl" /* Common.Color.Format.HSL */);
            if (!parsedColor) {
                return '';
            }
            let { l } = parsedColor;
            l *= 1.1;
            return new Common.Color.HSL(parsedColor.h, parsedColor.s, l, parsedColor.alpha).asString();
        }
    }
    resetPaths() {
        this.pathForStyle.clear();
        this.pathForStyle.set(this.wiskerStyle, new Path2D());
        this.styleForTimeRangeName.forEach(style => this.pathForStyle.set(style, new Path2D()));
        this.styleForWaitingResourceType.forEach(style => this.pathForStyle.set(style, new Path2D()));
        this.styleForDownloadingResourceType.forEach(style => this.pathForStyle.set(style, new Path2D()));
        this.pathForStyle.set(this.hoverDetailsStyle, new Path2D());
    }
    willHide() {
        this.popoverHelper.hidePopover();
        super.willHide();
    }
    wasShown() {
        super.wasShown();
        this.update();
    }
    onMouseMove(event) {
        this.setHoveredNode(this.getNodeFromPoint(event.offsetY), event.shiftKey);
    }
    onClick(event) {
        const handled = this.setSelectedNode(this.getNodeFromPoint(event.offsetY));
        if (handled) {
            event.consume(true);
        }
    }
    getPopoverRequest(event) {
        if (event instanceof KeyboardEvent) {
            return null;
        }
        if (!this.hoveredNode) {
            return null;
        }
        const request = this.hoveredNode.request();
        if (!request) {
            return null;
        }
        const useTimingBars = !Common.Settings.Settings.instance().moduleSetting('network-color-code-resource-types').get() &&
            !this.calculator.startAtZero;
        let range;
        let start;
        let end;
        if (useTimingBars) {
            range = NetworkTimeCalculator.calculateRequestTimeRanges(request, 0)
                .find(data => data.name === "total" /* NetworkTimeCalculator.RequestTimeRangeNames.TOTAL */);
            start = this.timeToPosition(range.start);
            end = this.timeToPosition(range.end);
        }
        else {
            range = this.getSimplifiedBarRange(request, 0);
            start = range.start;
            end = range.end;
        }
        if (end - start < 50) {
            const halfWidth = (end - start) / 2;
            start = start + halfWidth - 25;
            end = end - halfWidth + 25;
        }
        if (event.clientX < this.canvasPosition.left + start || event.clientX > this.canvasPosition.left + end) {
            return null;
        }
        const rowIndex = this.nodes.findIndex(node => node.hovered());
        const barHeight = this.getBarHeight(range.name);
        const y = this.headerHeight + (this.rowHeight * rowIndex - this.scrollTop) + ((this.rowHeight - barHeight) / 2);
        if (event.clientY < this.canvasPosition.top + y || event.clientY > this.canvasPosition.top + y + barHeight) {
            return null;
        }
        const anchorBox = this.element.boxInWindow();
        anchorBox.x += start;
        anchorBox.y += y;
        anchorBox.width = end - start;
        anchorBox.height = barHeight;
        return {
            box: anchorBox,
            show: async (popover) => {
                const content = RequestTimingView.create(request, this.calculator);
                await content.updateComplete;
                content.show(popover.contentElement);
                return true;
            },
            hide: undefined,
        };
    }
    setHoveredNode(node, highlightInitiatorChain) {
        if (this.hoveredNode) {
            this.hoveredNode.setHovered(false, false);
        }
        this.hoveredNode = node;
        if (this.hoveredNode) {
            this.hoveredNode.setHovered(true, highlightInitiatorChain);
        }
    }
    setSelectedNode(node) {
        if (node?.dataGrid) {
            node.select();
            node.dataGrid.element.focus();
            return true;
        }
        return false;
    }
    setRowHeight(height) {
        this.rowHeight = height;
    }
    setHeaderHeight(height) {
        this.headerHeight = height;
    }
    setRightPadding(padding) {
        this.rightPadding = padding;
        this.calculateCanvasSize();
    }
    setCalculator(calculator) {
        this.calculator = calculator;
    }
    getNodeFromPoint(y) {
        if (y <= this.headerHeight) {
            return null;
        }
        return this.nodes[Math.floor((this.scrollTop + y - this.headerHeight) / this.rowHeight)];
    }
    scheduleDraw() {
        void RenderCoordinator.write('NetworkWaterfallColumn.render', () => this.update());
    }
    update(scrollTop, eventDividers, nodes) {
        if (scrollTop !== undefined && this.scrollTop !== scrollTop) {
            this.popoverHelper.hidePopover();
            this.scrollTop = scrollTop;
        }
        if (nodes) {
            this.nodes = nodes;
            this.calculateCanvasSize();
        }
        if (eventDividers !== undefined) {
            this.eventDividers = eventDividers;
        }
        this.startTime = this.calculator.minimumBoundary();
        this.endTime = this.calculator.maximumBoundary();
        this.resetCanvas();
        this.resetPaths();
        this.textLayers = [];
        this.draw();
    }
    resetCanvas() {
        const ratio = window.devicePixelRatio;
        this.canvas.width = this.offsetWidth * ratio;
        this.canvas.height = this.offsetHeight * ratio;
        this.canvas.style.width = this.offsetWidth + 'px';
        this.canvas.style.height = this.offsetHeight + 'px';
    }
    onResize() {
        super.onResize();
        this.calculateCanvasSize();
        this.scheduleDraw();
    }
    calculateCanvasSize() {
        this.offsetWidth = this.contentElement.offsetWidth - this.rightPadding;
        this.offsetHeight = this.contentElement.offsetHeight;
        this.calculator.setDisplayWidth(this.offsetWidth);
        this.canvasPosition = this.canvas.getBoundingClientRect();
    }
    timeToPosition(time) {
        const availableWidth = this.offsetWidth - this.leftPadding;
        const timeToPixel = availableWidth / (this.endTime - this.startTime);
        return Math.floor(this.leftPadding + (time - this.startTime) * timeToPixel);
    }
    didDrawForTest() {
    }
    draw() {
        const useTimingBars = !Common.Settings.Settings.instance().moduleSetting('network-color-code-resource-types').get() &&
            !this.calculator.startAtZero;
        const nodes = this.nodes;
        const context = (this.canvas.getContext('2d'));
        if (!context) {
            return;
        }
        context.save();
        context.scale(window.devicePixelRatio, window.devicePixelRatio);
        context.translate(0, this.headerHeight);
        context.rect(0, 0, this.offsetWidth, this.offsetHeight);
        context.clip();
        const firstRequestIndex = Math.floor(this.scrollTop / this.rowHeight);
        const lastRequestIndex = Math.min(nodes.length, firstRequestIndex + Math.ceil(this.offsetHeight / this.rowHeight));
        for (let i = firstRequestIndex; i < lastRequestIndex; i++) {
            const rowOffset = this.rowHeight * i;
            const node = nodes[i];
            this.decorateRow(context, node, rowOffset - this.scrollTop);
            let drawNodes = [];
            if (node.hasChildren() && !node.expanded) {
                drawNodes = node.flatChildren();
            }
            drawNodes.push(node);
            for (const drawNode of drawNodes) {
                if (useTimingBars) {
                    this.buildTimingBarLayers(drawNode, rowOffset - this.scrollTop);
                }
                else {
                    this.buildSimplifiedBarLayers(context, drawNode, rowOffset - this.scrollTop);
                }
            }
        }
        this.drawLayers(context, useTimingBars);
        context.save();
        context.fillStyle = ThemeSupport.ThemeSupport.instance().getComputedValue('--sys-color-state-disabled');
        for (const textData of this.textLayers) {
            context.fillText(textData.text, textData.x, textData.y);
        }
        context.restore();
        this.drawEventDividers(context);
        context.restore();
        const freeZoneAtLeft = 75;
        const freeZoneAtRight = 18;
        const dividersData = PerfUI.TimelineGrid.TimelineGrid.calculateGridOffsets(this.calculator);
        PerfUI.TimelineGrid.TimelineGrid.drawCanvasGrid(context, dividersData);
        PerfUI.TimelineGrid.TimelineGrid.drawCanvasHeaders(context, dividersData, time => this.calculator.formatValue(time, dividersData.precision), this.fontSize, this.headerHeight, freeZoneAtLeft);
        context.save();
        context.scale(window.devicePixelRatio, window.devicePixelRatio);
        context.clearRect(this.offsetWidth - freeZoneAtRight, 0, freeZoneAtRight, this.headerHeight);
        context.restore();
        this.didDrawForTest();
    }
    drawLayers(context, useTimingBars) {
        for (const entry of this.pathForStyle) {
            const style = (entry[0]);
            const path = (entry[1]);
            context.save();
            context.beginPath();
            if (style.lineWidth) {
                context.lineWidth = style.lineWidth;
                if (style.borderColor) {
                    context.strokeStyle = style.borderColor;
                }
                context.stroke(path);
            }
            if (style.fillStyle) {
                context.fillStyle =
                    useTimingBars ? ThemeSupport.ThemeSupport.instance().getComputedValue(style.fillStyle) : style.fillStyle;
                context.fill(path);
            }
            context.restore();
        }
    }
    drawEventDividers(context) {
        context.save();
        context.lineWidth = 1;
        for (const color of this.eventDividers.keys()) {
            context.strokeStyle = color;
            for (const time of this.eventDividers.get(color) || []) {
                context.beginPath();
                const x = this.timeToPosition(time);
                context.moveTo(x, 0);
                context.lineTo(x, this.offsetHeight);
            }
            context.stroke();
        }
        context.restore();
    }
    getBarHeight(type) {
        switch (type) {
            case "connecting" /* NetworkTimeCalculator.RequestTimeRangeNames.CONNECTING */:
            case "ssl" /* NetworkTimeCalculator.RequestTimeRangeNames.SSL */:
            case "dns" /* NetworkTimeCalculator.RequestTimeRangeNames.DNS */:
            case "proxy" /* NetworkTimeCalculator.RequestTimeRangeNames.PROXY */:
            case "blocking" /* NetworkTimeCalculator.RequestTimeRangeNames.BLOCKING */:
            case "push" /* NetworkTimeCalculator.RequestTimeRangeNames.PUSH */:
            case "queueing" /* NetworkTimeCalculator.RequestTimeRangeNames.QUEUEING */:
                return 7;
            default:
                return 13;
        }
    }
    // Used when `network-color-code-resource-types` is true
    getSimplifiedBarRange(request, borderOffset) {
        const drawWidth = this.offsetWidth - this.leftPadding;
        const percentages = this.calculator.computeBarGraphPercentages(request);
        return {
            start: this.leftPadding + Math.floor((percentages.start / 100) * drawWidth) + borderOffset,
            mid: this.leftPadding + Math.floor((percentages.middle / 100) * drawWidth) + borderOffset,
            end: this.leftPadding + Math.floor((percentages.end / 100) * drawWidth) + borderOffset,
        };
    }
    // Used when `network-color-code-resource-types` is true
    buildSimplifiedBarLayers(context, node, y) {
        const request = node.request();
        if (!request) {
            return;
        }
        const borderWidth = 1;
        const borderOffset = borderWidth % 2 === 0 ? 0 : 0.5;
        const ranges = this.getSimplifiedBarRange(request, borderOffset);
        const height = this.getBarHeight();
        y += Math.floor(this.rowHeight / 2 - height / 2 + borderWidth) - borderWidth / 2;
        const waitingStyle = this.styleForWaitingResourceType.get(request.resourceType());
        const waitingPath = this.pathForStyle.get(waitingStyle);
        waitingPath.rect(ranges.start, y, ranges.mid - ranges.start, height - borderWidth);
        const barWidth = Math.max(2, ranges.end - ranges.mid);
        const downloadingStyle = this.styleForDownloadingResourceType.get(request.resourceType());
        const downloadingPath = this.pathForStyle.get(downloadingStyle);
        downloadingPath.rect(ranges.mid, y, barWidth, height - borderWidth);
        let labels = null;
        if (node.hovered()) {
            labels = this.calculator.computeBarGraphLabels(request);
            const barDotLineLength = 10;
            const leftLabelWidth = context.measureText(labels.left).width;
            const rightLabelWidth = context.measureText(labels.right).width;
            const hoverLinePath = this.pathForStyle.get(this.hoverDetailsStyle);
            if (leftLabelWidth < ranges.mid - ranges.start) {
                const midBarX = ranges.start + (ranges.mid - ranges.start - leftLabelWidth) / 2;
                this.textLayers.push({ text: labels.left, x: midBarX, y: y + this.fontSize });
            }
            else if (barDotLineLength + leftLabelWidth + this.leftPadding < ranges.start) {
                this.textLayers.push({ text: labels.left, x: ranges.start - leftLabelWidth - barDotLineLength - 1, y: y + this.fontSize });
                hoverLinePath.moveTo(ranges.start - barDotLineLength, y + Math.floor(height / 2));
                hoverLinePath.arc(ranges.start, y + Math.floor(height / 2), 2, 0, 2 * Math.PI);
                hoverLinePath.moveTo(ranges.start - barDotLineLength, y + Math.floor(height / 2));
                hoverLinePath.lineTo(ranges.start, y + Math.floor(height / 2));
            }
            const endX = ranges.mid + barWidth + borderOffset;
            if (rightLabelWidth < endX - ranges.mid) {
                const midBarX = ranges.mid + (endX - ranges.mid - rightLabelWidth) / 2;
                this.textLayers.push({ text: labels.right, x: midBarX, y: y + this.fontSize });
            }
            else if (endX + barDotLineLength + rightLabelWidth < this.offsetWidth - this.leftPadding) {
                this.textLayers.push({ text: labels.right, x: endX + barDotLineLength + 1, y: y + this.fontSize });
                hoverLinePath.moveTo(endX, y + Math.floor(height / 2));
                hoverLinePath.arc(endX, y + Math.floor(height / 2), 2, 0, 2 * Math.PI);
                hoverLinePath.moveTo(endX, y + Math.floor(height / 2));
                hoverLinePath.lineTo(endX + barDotLineLength, y + Math.floor(height / 2));
            }
        }
        if (!this.calculator.startAtZero) {
            const queueingRange = NetworkTimeCalculator.calculateRequestTimeRanges(request, 0)
                .find(data => data.name === "total" /* NetworkTimeCalculator.RequestTimeRangeNames.TOTAL */);
            const leftLabelWidth = labels ? context.measureText(labels.left).width : 0;
            const leftTextPlacedInBar = leftLabelWidth < ranges.mid - ranges.start;
            const wiskerTextPadding = 13;
            const textOffset = (labels && !leftTextPlacedInBar) ? leftLabelWidth + wiskerTextPadding : 0;
            const queueingStart = this.timeToPosition(queueingRange.start);
            if (ranges.start - textOffset > queueingStart) {
                const wiskerPath = this.pathForStyle.get(this.wiskerStyle);
                wiskerPath.moveTo(queueingStart, y + Math.floor(height / 2));
                wiskerPath.lineTo(ranges.start - textOffset, y + Math.floor(height / 2));
                // TODO(allada) This needs to be floored.
                const wiskerHeight = height / 2;
                wiskerPath.moveTo(queueingStart + borderOffset, y + wiskerHeight / 2);
                wiskerPath.lineTo(queueingStart + borderOffset, y + height - wiskerHeight / 2 - 1);
            }
        }
    }
    buildTimingBarLayers(node, y) {
        const request = node.request();
        if (!request) {
            return;
        }
        const ranges = NetworkTimeCalculator.calculateRequestTimeRanges(request, 0);
        let index = 0;
        for (const range of ranges) {
            if (range.name === "total" /* NetworkTimeCalculator.RequestTimeRangeNames.TOTAL */ ||
                range.name === "sending" /* NetworkTimeCalculator.RequestTimeRangeNames.SENDING */ || range.end - range.start === 0) {
                continue;
            }
            const style = this.styleForTimeRangeName.get(range.name);
            const path = this.pathForStyle.get(style);
            const lineWidth = style.lineWidth || 0;
            const height = this.getBarHeight(range.name);
            const middleBarY = y + Math.floor(this.rowHeight / 2 - height / 2) + lineWidth / 2;
            const start = this.timeToPosition(range.start);
            const end = this.timeToPosition(range.end);
            path.rect(start + (index * BAR_SPACING), middleBarY, end - start, height - lineWidth);
            index++;
        }
    }
    decorateRow(context, node, y) {
        const nodeBgColorId = node.backgroundColor();
        context.save();
        context.beginPath();
        context.fillStyle = ThemeSupport.ThemeSupport.instance().getComputedValue(nodeBgColorId);
        context.rect(0, y, this.offsetWidth, this.rowHeight);
        context.fill();
        context.restore();
    }
}
//# sourceMappingURL=NetworkWaterfallColumn.js.map