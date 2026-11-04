// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Core from '../core/core.js';
import { FirstContentfulPaint } from './FirstContentfulPaint.js';
import { Metric, } from './Metric.js';
function stripUrlHash(urlStr) {
    if (!urlStr.includes('#')) {
        return urlStr;
    }
    try {
        const url = new URL(urlStr);
        url.hash = '';
        return url.href;
    }
    catch {
        return urlStr;
    }
}
class LargestContentfulPaint extends Metric {
    static get coefficients() {
        return {
            intercept: 0,
            optimistic: 0.5,
            pessimistic: 0.5,
        };
    }
    /**
     * Low priority image nodes are usually offscreen and very unlikely to be the
     * resource that is required for LCP. Our LCP graphs include everything except for these images.
     */
    static isNotLowPriorityImageNode(node) {
        if (node.type !== 'network') {
            return true;
        }
        const isImage = node.request.resourceType === 'Image';
        const isLowPriority = node.request.priority === 'Low' || node.request.priority === 'VeryLow';
        return !isImage || !isLowPriority;
    }
    /**
     * Finds the NetworkNode corresponding to the LCP image in the dependency graph, if LCP was an image.
     */
    static findLcpNode(dependencyGraph, processedNavigation) {
        const lcp = processedNavigation.timestamps.largestContentfulPaint;
        if (!lcp) {
            return null;
        }
        const lcpEvent = processedNavigation.largestContentfulPaintEvt;
        if (lcpEvent?.args?.data?.type && lcpEvent.args.data.type !== 'image') {
            return null;
        }
        const { lcpRequestId, lcpImageUrl } = processedNavigation;
        if (!lcpRequestId && !lcpImageUrl) {
            return null;
        }
        if (lcpRequestId) {
            const idMatches = [];
            dependencyGraph.traverse(node => {
                if (node.type !== 'network' || node.request.redirectDestination) {
                    return;
                }
                if (node.request.finished === false || node.endTime < 0 || node.startTime > lcp) {
                    return;
                }
                const baseRequestId = node.request.requestId.replace(/(:redirect|:duplicate)+$/, '');
                if (baseRequestId === lcpRequestId) {
                    idMatches.push(node);
                }
            });
            if (idMatches.length) {
                idMatches.sort((a, b) => a.endTime - b.endTime);
                return idMatches[0];
            }
        }
        if (!lcpImageUrl) {
            return null;
        }
        const normalizedLcpUrl = stripUrlHash(lcpImageUrl);
        const lcpFrameId = lcpEvent?.args?.frame;
        const urlMatches = [];
        dependencyGraph.traverse(node => {
            if (node.type !== 'network' || node.request.redirectDestination) {
                return;
            }
            if (node.request.finished === false || node.endTime < 0 || node.startTime > lcp) {
                return;
            }
            if (lcpFrameId && node.request.frameId && node.request.frameId !== lcpFrameId) {
                return;
            }
            if (node.request.resourceType && node.request.resourceType !== 'Image' && node.request.resourceType !== 'Media') {
                return;
            }
            const matchesUrl = node.request.url === lcpImageUrl || stripUrlHash(node.request.url) === normalizedLcpUrl ||
                Boolean(node.request.redirects?.some(r => r.url === lcpImageUrl || stripUrlHash(r.url) === normalizedLcpUrl));
            if (matchesUrl) {
                urlMatches.push(node);
            }
        });
        if (!urlMatches.length) {
            return null;
        }
        urlMatches.sort((a, b) => a.endTime - b.endTime);
        return urlMatches[0];
    }
    static getOptimisticGraph(dependencyGraph, processedNavigation) {
        const { firstContentfulPaint: fcp, largestContentfulPaint: lcp } = processedNavigation.timestamps;
        if (!lcp) {
            throw new Core.LanternError('NO_LCP');
        }
        if (fcp === lcp && processedNavigation.largestContentfulPaintEvt?.args?.data?.type === 'text') {
            return FirstContentfulPaint.getOptimisticGraph(dependencyGraph, processedNavigation);
        }
        const lcpNode = LargestContentfulPaint.findLcpNode(dependencyGraph, processedNavigation);
        if (lcpNode) {
            const fcpOptimisticGraph = FirstContentfulPaint.getOptimisticGraph(dependencyGraph, processedNavigation);
            const criticalNodeIds = new Set();
            fcpOptimisticGraph.traverse(node => criticalNodeIds.add(node.id));
            criticalNodeIds.add(lcpNode.id);
            // PageDependencyGraph.linkCPUNodes does not add CPUNode -> Image edges, so if the LCP image
            // has any Script dependencies (e.g. JS-injected hero image or JS-injected stylesheet),
            // include the CPU tasks that evaluated those scripts prior to the LCP request.
            const initiatorScriptUrls = new Set();
            lcpNode.traverse(node => {
                if (node.type === 'network' && node.request.resourceType === 'Script') {
                    initiatorScriptUrls.add(node.request.url);
                }
            }, node => node.getDependencies());
            if (initiatorScriptUrls.size) {
                dependencyGraph.traverse(node => {
                    if (node.type !== 'cpu' || node.startTime > lcpNode.startTime) {
                        return;
                    }
                    for (const url of node.getEvaluateScriptURLs()) {
                        if (initiatorScriptUrls.has(url)) {
                            criticalNodeIds.add(node.id);
                            break;
                        }
                    }
                });
            }
            return dependencyGraph.cloneWithRelationships(node => criticalNodeIds.has(node.id));
        }
        return FirstContentfulPaint.getFirstPaintBasedGraph(dependencyGraph, {
            cutoffTimestamp: lcp,
            treatNodeAsRenderBlocking: LargestContentfulPaint.isNotLowPriorityImageNode,
        });
    }
    static getPessimisticGraph(dependencyGraph, processedNavigation) {
        const { firstContentfulPaint: fcp, largestContentfulPaint: lcp } = processedNavigation.timestamps;
        if (!lcp) {
            throw new Core.LanternError('NO_LCP');
        }
        if (fcp === lcp && processedNavigation.largestContentfulPaintEvt?.args?.data?.type === 'text') {
            return FirstContentfulPaint.getPessimisticGraph(dependencyGraph, processedNavigation);
        }
        return FirstContentfulPaint.getFirstPaintBasedGraph(dependencyGraph, {
            cutoffTimestamp: lcp,
            treatNodeAsRenderBlocking: _ => true,
            // For pessimistic LCP we'll include *all* layout nodes
            additionalCpuNodesToTreatAsRenderBlocking: node => node.didPerformLayout(),
        });
    }
    static getEstimateFromSimulation(simulationResult, extras) {
        if (extras?.optimistic) {
            return simulationResult;
        }
        const nodeTimesNotOffscreenImages = Array.from(simulationResult.nodeTimings.entries())
            .filter(entry => LargestContentfulPaint.isNotLowPriorityImageNode(entry[0]))
            .map(entry => entry[1].endTime);
        return {
            timeInMs: Math.max(...nodeTimesNotOffscreenImages),
            nodeTimings: simulationResult.nodeTimings,
        };
    }
    static compute(data, extras) {
        const fcpResult = extras?.fcpResult;
        if (!fcpResult) {
            throw new Core.LanternError('FCP is required to calculate the LCP metric');
        }
        const metricResult = super.compute(data, extras);
        metricResult.timing = Math.max(metricResult.timing, fcpResult.timing);
        return metricResult;
    }
}
export { LargestContentfulPaint };
//# sourceMappingURL=LargestContentfulPaint.js.map