/*
 * Copyright (C) 2010 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @unrestricted
 */
Audits.AuditCategories.PagePerformance = class extends Audits.AuditCategoryImpl {
  constructor() {
    super(Audits.AuditCategories.PagePerformance.AuditCategoryName);
  }

  initialize() {
    this.addRule(new Audits.AuditRules.UnusedCssRule(), Audits.AuditRule.Severity.Warning);
    this.addRule(new Audits.AuditRules.CssInHeadRule(), Audits.AuditRule.Severity.Severe);
    this.addRule(new Audits.AuditRules.StylesScriptsOrderRule(), Audits.AuditRule.Severity.Severe);
  }
};

Audits.AuditCategories.PagePerformance.AuditCategoryName = Common.UIString('Web Page Performance');

/**
 * @unrestricted
 */
Audits.AuditCategories.NetworkUtilization = class extends Audits.AuditCategoryImpl {
  constructor() {
    super(Audits.AuditCategories.NetworkUtilization.AuditCategoryName);
  }

  initialize() {
    this.addRule(new Audits.AuditRules.GzipRule(), Audits.AuditRule.Severity.Severe);
    this.addRule(new Audits.AuditRules.ImageDimensionsRule(), Audits.AuditRule.Severity.Warning);
    this.addRule(new Audits.AuditRules.CookieSizeRule(400), Audits.AuditRule.Severity.Warning);
    this.addRule(new Audits.AuditRules.StaticCookielessRule(5), Audits.AuditRule.Severity.Warning);
    this.addRule(new Audits.AuditRules.CombineJsResourcesRule(2), Audits.AuditRule.Severity.Severe);
    this.addRule(new Audits.AuditRules.CombineCssResourcesRule(2), Audits.AuditRule.Severity.Severe);
    this.addRule(new Audits.AuditRules.MinimizeDnsLookupsRule(4), Audits.AuditRule.Severity.Warning);
    this.addRule(new Audits.AuditRules.ParallelizeDownloadRule(4, 10, 0.5), Audits.AuditRule.Severity.Warning);
    this.addRule(new Audits.AuditRules.BrowserCacheControlRule(), Audits.AuditRule.Severity.Severe);
  }
};

Audits.AuditCategories.NetworkUtilization.AuditCategoryName = Common.UIString('Network Utilization');
