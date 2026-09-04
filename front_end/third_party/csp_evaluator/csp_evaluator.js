var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../front_end/third_party/csp_evaluator/package/evaluator.ts
var evaluator_exports = {};
__export(evaluator_exports, {
  CspEvaluator: () => CspEvaluator,
  DEFAULT_CHECKS: () => DEFAULT_CHECKS,
  STRICTCSP_CHECKS: () => STRICTCSP_CHECKS
});

// ../../front_end/third_party/csp_evaluator/package/finding.ts
var Finding = class _Finding {
  /**
   * @param type Type of the finding.
   * @param description Description of the finding.
   * @param severity Severity of the finding.
   * @param directive The CSP directive in which the finding occurred.
   * @param value The directive value, if exists.
   */
  constructor(type, description, severity, directive, value) {
    this.type = type;
    this.description = description;
    this.severity = severity;
    this.directive = directive;
    this.value = value;
  }
  type;
  description;
  severity;
  directive;
  value;
  /**
   * Returns the highest severity of a list of findings.
   * @param findings List of findings.
   * @return highest severity of a list of findings.
   */
  static getHighestSeverity(findings) {
    if (findings.length === 0) {
      return 100 /* NONE */;
    }
    const severities = findings.map((finding) => finding.severity);
    const min = (prev, cur) => prev < cur ? prev : cur;
    return severities.reduce(min, 100 /* NONE */);
  }
  equals(obj) {
    if (!(obj instanceof _Finding)) {
      return false;
    }
    return obj.type === this.type && obj.description === this.description && obj.severity === this.severity && obj.directive === this.directive && obj.value === this.value;
  }
};

// ../../front_end/third_party/csp_evaluator/package/csp.ts
var Csp = class _Csp {
  directives = {};
  /**
   * Clones a CSP object.
   * @return clone of parsedCsp.
   */
  clone() {
    const clone = new _Csp();
    for (const [directive, directiveValues] of Object.entries(
      this.directives
    )) {
      if (directiveValues) {
        clone.directives[directive] = [...directiveValues];
      }
    }
    return clone;
  }
  /**
   * Converts this CSP back into a string.
   * @return CSP string.
   */
  convertToString() {
    let cspString = "";
    for (const [directive, directiveValues] of Object.entries(
      this.directives
    )) {
      cspString += directive;
      if (directiveValues !== void 0) {
        for (let value, i = 0; value = directiveValues[i]; i++) {
          cspString += " ";
          cspString += value;
        }
      }
      cspString += "; ";
    }
    return cspString;
  }
  /**
   * Returns CSP as it would be seen by a UA supporting a specific CSP version.
   * @param cspVersion CSP.
   * @param optFindings findings about ignored directive values will be added
   *     to this array, if passed. (e.g. CSP2 ignores 'unsafe-inline' in
   *     presence of a nonce or a hash)
   * @return The effective CSP.
   */
  getEffectiveCsp(cspVersion, optFindings) {
    const findings = optFindings || [];
    const effectiveCsp = this.clone();
    const directive = effectiveCsp.getEffectiveDirective("script-src" /* SCRIPT_SRC */);
    const values = this.directives[directive] || [];
    const effectiveCspValues = effectiveCsp.directives[directive];
    if (effectiveCspValues && (effectiveCsp.policyHasScriptNonces() || effectiveCsp.policyHasScriptHashes())) {
      if (cspVersion >= 2 /* CSP2 */) {
        if (values.includes("'unsafe-inline'" /* UNSAFE_INLINE */)) {
          arrayRemove(effectiveCspValues, "'unsafe-inline'" /* UNSAFE_INLINE */);
          findings.push(new Finding(
            405 /* IGNORED */,
            "unsafe-inline is ignored if a nonce or a hash is present. (CSP2 and above)",
            100 /* NONE */,
            directive,
            "'unsafe-inline'" /* UNSAFE_INLINE */
          ));
        }
      } else {
        for (const value of values) {
          if (value.startsWith("'nonce-") || value.startsWith("'sha")) {
            arrayRemove(effectiveCspValues, value);
          }
        }
      }
    }
    if (effectiveCspValues && this.policyHasStrictDynamic()) {
      if (cspVersion >= 3 /* CSP3 */) {
        for (const value of values) {
          if (!value.startsWith("'") || value === "'self'" /* SELF */ || value === "'unsafe-inline'" /* UNSAFE_INLINE */) {
            arrayRemove(effectiveCspValues, value);
            findings.push(new Finding(
              405 /* IGNORED */,
              "Because of strict-dynamic this entry is ignored in CSP3 and above",
              100 /* NONE */,
              directive,
              value
            ));
          }
        }
      } else {
        arrayRemove(effectiveCspValues, "'strict-dynamic'" /* STRICT_DYNAMIC */);
      }
    }
    if (cspVersion < 3 /* CSP3 */) {
      delete effectiveCsp.directives["report-to" /* REPORT_TO */];
      delete effectiveCsp.directives["worker-src" /* WORKER_SRC */];
      delete effectiveCsp.directives["manifest-src" /* MANIFEST_SRC */];
      delete effectiveCsp.directives["trusted-types" /* TRUSTED_TYPES */];
      delete effectiveCsp.directives["require-trusted-types-for" /* REQUIRE_TRUSTED_TYPES_FOR */];
    }
    return effectiveCsp;
  }
  /**
   * Returns default-src if directive is a fetch directive and is not present in
   * this CSP. Otherwise the provided directive is returned.
   * @param directive CSP.
   * @return The effective directive.
   */
  getEffectiveDirective(directive) {
    if (!(directive in this.directives) && FETCH_DIRECTIVES.includes(directive)) {
      return "default-src" /* DEFAULT_SRC */;
    }
    return directive;
  }
  /**
   * Returns the passed directives if present in this CSP or default-src
   * otherwise.
   * @param directives CSP.
   * @return The effective directives.
   */
  getEffectiveDirectives(directives) {
    const effectiveDirectives = new Set(directives.map((val) => this.getEffectiveDirective(val)));
    return [...effectiveDirectives];
  }
  /**
   * Checks if this CSP is using nonces for scripts.
   * @return true, if this CSP is using script nonces.
   */
  policyHasScriptNonces() {
    const directiveName = this.getEffectiveDirective("script-src" /* SCRIPT_SRC */);
    const values = this.directives[directiveName] || [];
    return values.some((val) => isNonce(val));
  }
  /**
   * Checks if this CSP is using hashes for scripts.
   * @return true, if this CSP is using script hashes.
   */
  policyHasScriptHashes() {
    const directiveName = this.getEffectiveDirective("script-src" /* SCRIPT_SRC */);
    const values = this.directives[directiveName] || [];
    return values.some((val) => isHash(val));
  }
  /**
   * Checks if this CSP is using strict-dynamic.
   * @return true, if this CSP is using CSP nonces.
   */
  policyHasStrictDynamic() {
    const directiveName = this.getEffectiveDirective("script-src" /* SCRIPT_SRC */);
    const values = this.directives[directiveName] || [];
    return values.includes("'strict-dynamic'" /* STRICT_DYNAMIC */);
  }
};
var Keyword = /* @__PURE__ */ ((Keyword2) => {
  Keyword2["SELF"] = "'self'";
  Keyword2["NONE"] = "'none'";
  Keyword2["UNSAFE_INLINE"] = "'unsafe-inline'";
  Keyword2["UNSAFE_EVAL"] = "'unsafe-eval'";
  Keyword2["WASM_EVAL"] = "'wasm-eval'";
  Keyword2["WASM_UNSAFE_EVAL"] = "'wasm-unsafe-eval'";
  Keyword2["STRICT_DYNAMIC"] = "'strict-dynamic'";
  Keyword2["UNSAFE_HASHED_ATTRIBUTES"] = "'unsafe-hashed-attributes'";
  Keyword2["UNSAFE_HASHES"] = "'unsafe-hashes'";
  Keyword2["REPORT_SAMPLE"] = "'report-sample'";
  Keyword2["BLOCK"] = "'block'";
  Keyword2["ALLOW"] = "'allow'";
  return Keyword2;
})(Keyword || {});
var Directive = /* @__PURE__ */ ((Directive2) => {
  Directive2["CHILD_SRC"] = "child-src";
  Directive2["CONNECT_SRC"] = "connect-src";
  Directive2["DEFAULT_SRC"] = "default-src";
  Directive2["FONT_SRC"] = "font-src";
  Directive2["FRAME_SRC"] = "frame-src";
  Directive2["IMG_SRC"] = "img-src";
  Directive2["MEDIA_SRC"] = "media-src";
  Directive2["OBJECT_SRC"] = "object-src";
  Directive2["SCRIPT_SRC"] = "script-src";
  Directive2["SCRIPT_SRC_ATTR"] = "script-src-attr";
  Directive2["SCRIPT_SRC_ELEM"] = "script-src-elem";
  Directive2["STYLE_SRC"] = "style-src";
  Directive2["STYLE_SRC_ATTR"] = "style-src-attr";
  Directive2["STYLE_SRC_ELEM"] = "style-src-elem";
  Directive2["PREFETCH_SRC"] = "prefetch-src";
  Directive2["MANIFEST_SRC"] = "manifest-src";
  Directive2["WORKER_SRC"] = "worker-src";
  Directive2["BASE_URI"] = "base-uri";
  Directive2["PLUGIN_TYPES"] = "plugin-types";
  Directive2["SANDBOX"] = "sandbox";
  Directive2["DISOWN_OPENER"] = "disown-opener";
  Directive2["FORM_ACTION"] = "form-action";
  Directive2["FRAME_ANCESTORS"] = "frame-ancestors";
  Directive2["NAVIGATE_TO"] = "navigate-to";
  Directive2["REPORT_TO"] = "report-to";
  Directive2["REPORT_URI"] = "report-uri";
  Directive2["BLOCK_ALL_MIXED_CONTENT"] = "block-all-mixed-content";
  Directive2["UPGRADE_INSECURE_REQUESTS"] = "upgrade-insecure-requests";
  Directive2["REFLECTED_XSS"] = "reflected-xss";
  Directive2["REFERRER"] = "referrer";
  Directive2["REQUIRE_SRI_FOR"] = "require-sri-for";
  Directive2["TRUSTED_TYPES"] = "trusted-types";
  Directive2["REQUIRE_TRUSTED_TYPES_FOR"] = "require-trusted-types-for";
  Directive2["WEBRTC"] = "webrtc";
  return Directive2;
})(Directive || {});
var FETCH_DIRECTIVES = [
  "child-src" /* CHILD_SRC */,
  "connect-src" /* CONNECT_SRC */,
  "default-src" /* DEFAULT_SRC */,
  "font-src" /* FONT_SRC */,
  "frame-src" /* FRAME_SRC */,
  "img-src" /* IMG_SRC */,
  "manifest-src" /* MANIFEST_SRC */,
  "media-src" /* MEDIA_SRC */,
  "object-src" /* OBJECT_SRC */,
  "script-src" /* SCRIPT_SRC */,
  "script-src-attr" /* SCRIPT_SRC_ATTR */,
  "script-src-elem" /* SCRIPT_SRC_ELEM */,
  "style-src" /* STYLE_SRC */,
  "style-src-attr" /* STYLE_SRC_ATTR */,
  "style-src-elem" /* STYLE_SRC_ELEM */,
  "worker-src" /* WORKER_SRC */
];
function isDirective(directive) {
  return Object.values(Directive).includes(directive);
}
function isKeyword(keyword) {
  return Object.values(Keyword).includes(keyword);
}
function isUrlScheme(urlScheme) {
  const pattern = new RegExp("^[a-zA-Z][+a-zA-Z0-9.-]*:$");
  return pattern.test(urlScheme);
}
var STRICT_NONCE_PATTERN = new RegExp("^'nonce-[a-zA-Z0-9+/_-]+[=]{0,2}'$");
var NONCE_PATTERN = new RegExp("^'nonce-(.+)'$");
function isNonce(nonce, strictCheck) {
  const pattern = strictCheck ? STRICT_NONCE_PATTERN : NONCE_PATTERN;
  return pattern.test(nonce);
}
var STRICT_HASH_PATTERN = new RegExp("^'(sha256|sha384|sha512)-[a-zA-Z0-9+/]+[=]{0,2}'$");
var HASH_PATTERN = new RegExp("^'(sha256|sha384|sha512)-(.+)'$");
function isHash(hash, strictCheck) {
  const pattern = strictCheck ? STRICT_HASH_PATTERN : HASH_PATTERN;
  return pattern.test(hash);
}
function arrayRemove(arr, item) {
  if (arr.includes(item)) {
    const idx = arr.findIndex((elem) => item === elem);
    arr.splice(idx, 1);
  }
}

// ../../front_end/third_party/csp_evaluator/package/checks/parser_checks.ts
function checkUnknownDirective(parsedCsp) {
  const findings = [];
  for (const directive of Object.keys(parsedCsp.directives)) {
    if (isDirective(directive)) {
      continue;
    }
    if (directive.endsWith(":")) {
      findings.push(new Finding(
        101 /* UNKNOWN_DIRECTIVE */,
        "CSP directives don't end with a colon.",
        20 /* SYNTAX */,
        directive
      ));
    } else {
      findings.push(new Finding(
        101 /* UNKNOWN_DIRECTIVE */,
        'Directive "' + directive + '" is not a known CSP directive.',
        20 /* SYNTAX */,
        directive
      ));
    }
  }
  return findings;
}
function checkMissingSemicolon(parsedCsp) {
  const findings = [];
  for (const [directive, directiveValues] of Object.entries(
    parsedCsp.directives
  )) {
    if (directiveValues === void 0) {
      continue;
    }
    for (const value of directiveValues) {
      if (isDirective(value)) {
        findings.push(new Finding(
          100 /* MISSING_SEMICOLON */,
          'Did you forget the semicolon? "' + value + '" seems to be a directive, not a value.',
          20 /* SYNTAX */,
          directive,
          value
        ));
      }
    }
  }
  return findings;
}
function checkInvalidKeyword(parsedCsp) {
  const findings = [];
  const keywordsNoTicks = Object.values(Keyword).map((k) => k.replace(/'/g, ""));
  for (const [directive, directiveValues] of Object.entries(
    parsedCsp.directives
  )) {
    if (directiveValues === void 0) {
      continue;
    }
    for (const value of directiveValues) {
      if (keywordsNoTicks.some((k) => k === value) || value.startsWith("nonce-") || value.match(/^(sha256|sha384|sha512)-/)) {
        findings.push(new Finding(
          102 /* INVALID_KEYWORD */,
          'Did you forget to surround "' + value + '" with single-ticks?',
          20 /* SYNTAX */,
          directive,
          value
        ));
        continue;
      }
      if (!value.startsWith("'")) {
        continue;
      }
      if (directive === "require-trusted-types-for" /* REQUIRE_TRUSTED_TYPES_FOR */) {
        if (value === "'script'" /* SCRIPT */) {
          continue;
        }
      } else if (directive === "trusted-types" /* TRUSTED_TYPES */) {
        if (value === "'allow-duplicates'" || value === "'none'") {
          continue;
        }
      } else {
        if (isKeyword(value) || isHash(value) || isNonce(value)) {
          continue;
        }
      }
      findings.push(new Finding(
        102 /* INVALID_KEYWORD */,
        value + " seems to be an invalid CSP keyword.",
        20 /* SYNTAX */,
        directive,
        value
      ));
    }
  }
  return findings;
}

// ../../front_end/third_party/csp_evaluator/package/allowlist_bypasses/angular.ts
var URLS = [
  "//gstatic.com/fsn/angular_js-bundle1.js",
  "//www.gstatic.com/fsn/angular_js-bundle1.js",
  "//www.googleadservices.com/pageadimg/imgad",
  "//yandex.st/angularjs/1.2.16/angular-cookies.min.js",
  "//yastatic.net/angularjs/1.2.23/angular.min.js",
  "//yuedust.yuedu.126.net/js/components/angular/angular.js",
  "//art.jobs.netease.com/script/angular.js",
  "//csu-c45.kxcdn.com/angular/angular.js",
  "//elysiumwebsite.s3.amazonaws.com/uploads/blog-media/rockstar/angular.min.js",
  "//inno.blob.core.windows.net/new/libs/AngularJS/1.2.1/angular.min.js",
  "//gift-talk.kakao.com/public/javascripts/angular.min.js",
  "//ajax.googleapis.com/ajax/libs/angularjs/1.2.0rc1/angular-route.min.js",
  "//master-sumok.ru/vendors/angular/angular-cookies.js",
  "//ayicommon-a.akamaihd.net/static/vendor/angular-1.4.2.min.js",
  "//pangxiehaitao.com/framework/angular-1.3.9/angular-animate.min.js",
  "//cdnjs.cloudflare.com/ajax/libs/angular.js/1.2.16/angular.min.js",
  "//96fe3ee995e96e922b6b-d10c35bd0a0de2c718b252bc575fdb73.ssl.cf1.rackcdn.com/angular.js",
  "//oss.maxcdn.com/angularjs/1.2.20/angular.min.js",
  "//reports.zemanta.com/smedia/common/angularjs/1.2.11/angular.js",
  "//cdn.shopify.com/s/files/1/0225/6463/t/1/assets/angular-animate.min.js",
  "//parademanagement.com.s3-website-ap-southeast-1.amazonaws.com/js/angular.min.js",
  "//cdn.jsdelivr.net/angularjs/1.1.2/angular.min.js",
  "//eb2883ede55c53e09fd5-9c145fb03d93709ea57875d307e2d82e.ssl.cf3.rackcdn.com/components/angular-resource.min.js",
  "//andors-trail.googlecode.com/git/AndorsTrailEdit/lib/angular.min.js",
  "//cdn.walkme.com/General/EnvironmentTests/angular/angular.min.js",
  "//laundrymail.com/angular/angular.js",
  "//s3-eu-west-1.amazonaws.com/staticancpa/js/angular-cookies.min.js",
  "//collade.demo.stswp.com/js/vendor/angular.min.js",
  "//mrfishie.github.io/sailor/bower_components/angular/angular.min.js",
  "//askgithub.com/static/js/angular.min.js",
  "//services.amazon.com/solution-providers/assets/vendor/angular-cookies.min.js",
  "//raw.githubusercontent.com/angular/code.angularjs.org/master/1.0.7/angular-resource.js",
  "//prb-resume.appspot.com/bower_components/angular-animate/angular-animate.js",
  "//dl.dropboxusercontent.com/u/30877786/angular.min.js",
  "//static.tumblr.com/x5qdx0r/nPOnngtff/angular-resource.min_1_.js",
  "//storage.googleapis.com/assets-prod.urbansitter.net/us-sym/assets/vendor/angular-sanitize/angular-sanitize.min.js",
  "//twitter.github.io/labella.js/bower_components/angular/angular.min.js",
  "//cdn2-casinoroom.global.ssl.fastly.net/js/lib/angular-animate.min.js",
  "//www.adobe.com/devnet-apps/flashshowcase/lib/angular/angular.1.1.5.min.js",
  "//eternal-sunset.herokuapp.com/bower_components/angular/angular.js",
  "//cdn.bootcss.com/angular.js/1.2.0/angular.min.js"
];

// ../../front_end/third_party/csp_evaluator/package/allowlist_bypasses/flash.ts
var URLS2 = [
  "//vk.com/swf/video.swf",
  "//ajax.googleapis.com/ajax/libs/yui/2.8.0r4/build/charts/assets/charts.swf"
];

// ../../front_end/third_party/csp_evaluator/package/allowlist_bypasses/jsonp.ts
var NEEDS_EVAL = [
  "googletagmanager.com",
  "www.googletagmanager.com",
  "www.googleadservices.com",
  "google-analytics.com",
  "ssl.google-analytics.com",
  "www.google-analytics.com"
];
var URLS3 = [
  "//bebezoo.1688.com/fragment/index.htm",
  "//www.google-analytics.com/gtm/js",
  "//googleads.g.doubleclick.net/pagead/conversion/1036918760/wcm",
  "//www.googleadservices.com/pagead/conversion/1070110417/wcm",
  "//www.google.com/tools/feedback/escalation-options",
  "//pin.aliyun.com/check_audio",
  "//offer.alibaba.com/market/CID100002954/5/fetchKeyword.do",
  "//ccrprod.alipay.com/ccr/arriveTime.json",
  "//group.aliexpress.com/ajaxAcquireGroupbuyProduct.do",
  "//detector.alicdn.com/2.7.3/index.php",
  "//suggest.taobao.com/sug",
  "//translate.google.com/translate_a/l",
  "//count.tbcdn.cn//counter3",
  "//wb.amap.com/channel.php",
  "//translate.googleapis.com/translate_a/l",
  "//afpeng.alimama.com/ex",
  "//accounts.google.com/o/oauth2/revoke",
  "//pagead2.googlesyndication.com/relatedsearch",
  "//yandex.ru/soft/browsers/check",
  "//api.facebook.com/restserver.php",
  "//mts0.googleapis.com/maps/vt",
  "//syndication.twitter.com/widgets/timelines/765840589183213568",
  "//www.youtube.com/profile_style",
  "//googletagmanager.com/gtm/js",
  "//mc.yandex.ru/watch/24306916/1",
  "//share.yandex.net/counter/gpp/",
  "//ok.go.mail.ru/lady_on_lady_recipes_r.json",
  "//d1f69o4buvlrj5.cloudfront.net/__efa_15_1_ornpba.xekq.arg/optout_check",
  "//www.googletagmanager.com/gtm/js",
  "//api.vk.com/method/wall.get",
  "//www.sharethis.com/get-publisher-info.php",
  "//google.ru/maps/vt",
  "//pro.netrox.sc/oapi/h_checksite.ashx",
  "//vimeo.com/api/oembed.json/",
  "//de.blog.newrelic.com/wp-admin/admin-ajax.php",
  "//ajax.googleapis.com/ajax/services/search/news",
  "//ssl.google-analytics.com/gtm/js",
  "//pubsub.pubnub.com/subscribe/demo/hello_world/",
  "//pass.yandex.ua/services",
  "//id.rambler.ru/script/topline_info.js",
  "//m.addthis.com/live/red_lojson/100eng.json",
  "//passport.ngs.ru/ajax/check",
  "//catalog.api.2gis.ru/ads/search",
  "//gum.criteo.com/sync",
  "//maps.google.com/maps/vt",
  "//ynuf.alipay.com/service/um.json",
  "//securepubads.g.doubleclick.net/gampad/ads",
  "//c.tiles.mapbox.com/v3/texastribune.tx-congress-cvap/6/15/26.grid.json",
  "//rexchange.begun.ru/banners",
  "//an.yandex.ru/page/147484",
  "//links.services.disqus.com/api/ping",
  "//api.map.baidu.com/",
  "//tj.gongchang.com/api/keywordrecomm/",
  "//data.gongchang.com/livegrail/",
  "//ulogin.ru/token.php",
  "//beta.gismeteo.ru/api/informer/layout.js/120x240-3/ru/",
  "//maps.googleapis.com/maps/api/js/GeoPhotoService.GetMetadata",
  "//a.config.skype.com/config/v1/Skype/908_1.33.0.111/SkypePersonalization",
  "//maps.beeline.ru/w",
  "//target.ukr.net/",
  "//www.meteoprog.ua/data/weather/informer/Poltava.js",
  "//cdn.syndication.twimg.com/widgets/timelines/599200054310604802",
  "//wslocker.ru/client/user.chk.php",
  "//community.adobe.com/CommunityPod/getJSON",
  "//maps.google.lv/maps/vt",
  "//dev.virtualearth.net/REST/V1/Imagery/Metadata/AerialWithLabels/26.318581",
  "//awaps.yandex.ru/10/8938/02400400.",
  "//a248.e.akamai.net/h5.hulu.com/h5.mp4",
  "//nominatim.openstreetmap.org/",
  "//plugins.mozilla.org/en-us/plugins_list.json",
  "//h.cackle.me/widget/32153/bootstrap",
  "//graph.facebook.com/1/",
  "//fellowes.ugc.bazaarvoice.com/data/reviews.json",
  "//widgets.pinterest.com/v3/pidgets/boards/ciciwin/hedgehog-squirrel-crafts/pins/",
  "//www.linkedin.com/countserv/count/share",
  "//se.wikipedia.org/w/api.php",
  "//cse.google.com/api/007627024705277327428/cse/r3vs7b0fcli/queries/js",
  "//relap.io/api/v2/similar_pages_jsonp.js",
  "//c1n3.hypercomments.com/stream/subscribe",
  "//maps.google.de/maps/vt",
  "//books.google.com/books",
  "//connect.mail.ru/share_count",
  "//tr.indeed.com/m/newjobs",
  "//www-onepick-opensocial.googleusercontent.com/gadgets/proxy",
  "//www.panoramio.com/map/get_panoramas.php",
  "//client.siteheart.com/streamcli/client",
  "//www.facebook.com/restserver.php",
  "//autocomplete.travelpayouts.com/avia",
  "//www.googleapis.com/freebase/v1/topic/m/0344_",
  "//mts1.googleapis.com/mapslt/ft",
  "//api.twitter.com/1/statuses/oembed.json",
  "//fast.wistia.com/embed/medias/o75jtw7654.json",
  "//partner.googleadservices.com/gampad/ads",
  "//pass.yandex.ru/services",
  "//gupiao.baidu.com/stocks/stockbets",
  "//widget.admitad.com/widget/init",
  "//api.instagram.com/v1/tags/partykungen23328/media/recent",
  "//video.media.yql.yahoo.com/v1/video/sapi/streams/063fb76c-6c70-38c5-9bbc-04b7c384de2b",
  "//ib.adnxs.com/jpt",
  "//pass.yandex.com/services",
  "//www.google.de/maps/vt",
  "//clients1.google.com/complete/search",
  "//api.userlike.com/api/chat/slot/proactive/",
  "//www.youku.com/index_cookielist/s/jsonp",
  "//mt1.googleapis.com/mapslt/ft",
  "//api.mixpanel.com/track/",
  "//wpd.b.qq.com/cgi/get_sign.php",
  "//pipes.yahooapis.com/pipes/pipe.run",
  "//gdata.youtube.com/feeds/api/videos/WsJIHN1kNWc",
  "//9.chart.apis.google.com/chart",
  "//cdn.syndication.twitter.com/moments/709229296800440320",
  "//api.flickr.com/services/feeds/photos_friends.gne",
  "//cbks0.googleapis.com/cbk",
  "//www.blogger.com/feeds/5578653387562324002/posts/summary/4427562025302749269",
  "//query.yahooapis.com/v1/public/yql",
  "//kecngantang.blogspot.com/feeds/posts/default/-/Komik",
  "//www.travelpayouts.com/widgets/50f53ce9ada1b54bcc000031.json",
  "//i.cackle.me/widget/32586/bootstrap",
  "//translate.yandex.net/api/v1.5/tr.json/detect",
  "//a.tiles.mapbox.com/v3/zentralmedia.map-n2raeauc.jsonp",
  "//maps.google.ru/maps/vt",
  "//c1n2.hypercomments.com/stream/subscribe",
  "//rec.ydf.yandex.ru/cookie",
  "//cdn.jsdelivr.net"
];

// ../../front_end/third_party/csp_evaluator/package/utils.ts
function getSchemeFreeUrl(url) {
  url = url.replace(/^\w[+\w.-]*:\/\//i, "");
  url = url.replace(/^\/\//, "");
  return url;
}
function getHostname(url) {
  const hostname = new URL(
    "https://" + getSchemeFreeUrl(url).replace(":*", "").replace("*", "wildcard_placeholder")
  ).hostname.replace("wildcard_placeholder", "*");
  const ipv6Regex = /^\[[\d:]+\]/;
  if (getSchemeFreeUrl(url).match(ipv6Regex) && !hostname.match(ipv6Regex)) {
    return "[" + hostname + "]";
  }
  return hostname;
}
function setScheme(u) {
  if (u.startsWith("//")) {
    return u.replace("//", "https://");
  }
  return u;
}
function matchWildcardUrls(cspUrlString, listOfUrlStrings) {
  const cspUrl = new URL(setScheme(cspUrlString.replace(":*", "").replace("*", "wildcard_placeholder")));
  const listOfUrls = listOfUrlStrings.map((u) => new URL(setScheme(u)));
  const host = cspUrl.hostname.toLowerCase();
  const hostHasWildcard = host.startsWith("wildcard_placeholder.");
  const wildcardFreeHost = host.replace(/^\wildcard_placeholder/i, "");
  const path = cspUrl.pathname;
  const hasPath = path !== "/";
  for (const url of listOfUrls) {
    const domain = url.hostname;
    if (!domain.endsWith(wildcardFreeHost)) {
      continue;
    }
    if (!hostHasWildcard && host !== domain) {
      continue;
    }
    if (hasPath) {
      if (path.endsWith("/")) {
        if (!url.pathname.startsWith(path)) {
          continue;
        }
      } else {
        if (url.pathname !== path) {
          continue;
        }
      }
    }
    return url;
  }
  return null;
}
function applyCheckFunktionToDirectives(parsedCsp, check) {
  const directiveNames = Object.keys(parsedCsp.directives);
  for (const directive of directiveNames) {
    const directiveValues = parsedCsp.directives[directive];
    if (directiveValues) {
      check(directive, directiveValues);
    }
  }
}

// ../../front_end/third_party/csp_evaluator/package/checks/security_checks.ts
var DIRECTIVES_CAUSING_XSS = ["script-src" /* SCRIPT_SRC */, "object-src" /* OBJECT_SRC */, "base-uri" /* BASE_URI */];
var URL_SCHEMES_CAUSING_XSS = ["data:", "http:", "https:"];
function checkScriptUnsafeInline(effectiveCsp) {
  const directiveName = effectiveCsp.getEffectiveDirective("script-src" /* SCRIPT_SRC */);
  const values = effectiveCsp.directives[directiveName] || [];
  if (values.includes("'unsafe-inline'" /* UNSAFE_INLINE */)) {
    return [new Finding(
      301 /* SCRIPT_UNSAFE_INLINE */,
      `'unsafe-inline' allows the execution of unsafe in-page scripts and event handlers.`,
      10 /* HIGH */,
      directiveName,
      "'unsafe-inline'" /* UNSAFE_INLINE */
    )];
  }
  return [];
}
function checkScriptUnsafeEval(parsedCsp) {
  const directiveName = parsedCsp.getEffectiveDirective("script-src" /* SCRIPT_SRC */);
  const values = parsedCsp.directives[directiveName] || [];
  if (values.includes("'unsafe-eval'" /* UNSAFE_EVAL */)) {
    return [new Finding(
      302 /* SCRIPT_UNSAFE_EVAL */,
      `'unsafe-eval' allows the execution of code injected into DOM APIs such as eval().`,
      50 /* MEDIUM_MAYBE */,
      directiveName,
      "'unsafe-eval'" /* UNSAFE_EVAL */
    )];
  }
  return [];
}
function checkPlainUrlSchemes(parsedCsp) {
  const violations = [];
  const directivesToCheck = parsedCsp.getEffectiveDirectives(DIRECTIVES_CAUSING_XSS);
  for (const directive of directivesToCheck) {
    const values = parsedCsp.directives[directive] || [];
    for (const value of values) {
      if (URL_SCHEMES_CAUSING_XSS.includes(value)) {
        violations.push(new Finding(
          303 /* PLAIN_URL_SCHEMES */,
          value + " URI in " + directive + " allows the execution of unsafe scripts.",
          10 /* HIGH */,
          directive,
          value
        ));
      }
    }
  }
  return violations;
}
function checkWildcards(parsedCsp) {
  const violations = [];
  const directivesToCheck = parsedCsp.getEffectiveDirectives(DIRECTIVES_CAUSING_XSS);
  for (const directive of directivesToCheck) {
    const values = parsedCsp.directives[directive] || [];
    for (const value of values) {
      const url = getSchemeFreeUrl(value);
      if (url === "*") {
        violations.push(new Finding(
          304 /* PLAIN_WILDCARD */,
          directive + ` should not allow '*' as source`,
          10 /* HIGH */,
          directive,
          value
        ));
        continue;
      }
    }
  }
  return violations;
}
function checkMissingObjectSrcDirective(parsedCsp) {
  let objectRestrictions = [];
  if ("object-src" /* OBJECT_SRC */ in parsedCsp.directives) {
    objectRestrictions = parsedCsp.directives["object-src" /* OBJECT_SRC */];
  } else if ("default-src" /* DEFAULT_SRC */ in parsedCsp.directives) {
    objectRestrictions = parsedCsp.directives["default-src" /* DEFAULT_SRC */];
  }
  if (objectRestrictions !== void 0 && objectRestrictions.length >= 1) {
    return [];
  }
  return [new Finding(
    300 /* MISSING_DIRECTIVES */,
    `Missing object-src allows the injection of plugins which can execute JavaScript. Can you set it to 'none'?`,
    10 /* HIGH */,
    "object-src" /* OBJECT_SRC */
  )];
}
function checkMissingScriptSrcDirective(parsedCsp) {
  if ("script-src" /* SCRIPT_SRC */ in parsedCsp.directives || "default-src" /* DEFAULT_SRC */ in parsedCsp.directives) {
    return [];
  }
  return [new Finding(
    300 /* MISSING_DIRECTIVES */,
    "script-src directive is missing.",
    10 /* HIGH */,
    "script-src" /* SCRIPT_SRC */
  )];
}
function checkMissingBaseUriDirective(parsedCsp) {
  return checkMultipleMissingBaseUriDirective([parsedCsp]);
}
function checkMultipleMissingBaseUriDirective(parsedCsps) {
  const needsBaseUri = (csp) => csp.policyHasScriptNonces() || csp.policyHasScriptHashes() && csp.policyHasStrictDynamic();
  const hasBaseUri = (csp) => "base-uri" /* BASE_URI */ in csp.directives;
  if (parsedCsps.some(needsBaseUri) && !parsedCsps.some(hasBaseUri)) {
    const description = `Missing base-uri allows the injection of base tags. They can be used to set the base URL for all relative (script) URLs to an attacker controlled domain. Can you set it to 'none' or 'self'?`;
    return [new Finding(
      300 /* MISSING_DIRECTIVES */,
      description,
      10 /* HIGH */,
      "base-uri" /* BASE_URI */
    )];
  }
  return [];
}
function checkMissingDirectives(parsedCsp) {
  return [
    ...checkMissingObjectSrcDirective(parsedCsp),
    ...checkMissingScriptSrcDirective(parsedCsp),
    ...checkMissingBaseUriDirective(parsedCsp)
  ];
}
function checkScriptAllowlistBypass(parsedCsp) {
  const violations = [];
  const effectiveScriptSrcDirective = parsedCsp.getEffectiveDirective("script-src" /* SCRIPT_SRC */);
  const scriptSrcValues = parsedCsp.directives[effectiveScriptSrcDirective] || [];
  if (scriptSrcValues.includes("'none'" /* NONE */)) {
    return violations;
  }
  for (const value of scriptSrcValues) {
    if (value === "'self'" /* SELF */) {
      violations.push(new Finding(
        305 /* SCRIPT_ALLOWLIST_BYPASS */,
        `'self' can be problematic if you host JSONP, AngularJS or user uploaded files.`,
        50 /* MEDIUM_MAYBE */,
        effectiveScriptSrcDirective,
        value
      ));
      continue;
    }
    if (value.startsWith("'")) {
      continue;
    }
    if (isUrlScheme(value) || value.indexOf(".") === -1) {
      continue;
    }
    const url = "//" + getSchemeFreeUrl(value);
    const angularBypass = matchWildcardUrls(url, URLS);
    let jsonpBypass = matchWildcardUrls(url, URLS3);
    if (jsonpBypass) {
      const evalRequired = NEEDS_EVAL.includes(jsonpBypass.hostname);
      const evalPresent = scriptSrcValues.includes("'unsafe-eval'" /* UNSAFE_EVAL */);
      if (evalRequired && !evalPresent) {
        jsonpBypass = null;
      }
    }
    if (jsonpBypass || angularBypass) {
      let bypassDomain = "";
      let bypassTxt = "";
      if (jsonpBypass) {
        bypassDomain = jsonpBypass.hostname;
        bypassTxt = " JSONP endpoints";
      }
      if (angularBypass) {
        bypassDomain = angularBypass.hostname;
        bypassTxt += bypassTxt.trim() === "" ? "" : " and";
        bypassTxt += " Angular libraries";
      }
      violations.push(new Finding(
        305 /* SCRIPT_ALLOWLIST_BYPASS */,
        bypassDomain + " is known to host" + bypassTxt + " which allow to bypass this CSP.",
        10 /* HIGH */,
        effectiveScriptSrcDirective,
        value
      ));
    } else {
      violations.push(new Finding(
        305 /* SCRIPT_ALLOWLIST_BYPASS */,
        `No bypass found; make sure that this URL doesn't serve JSONP replies or Angular libraries.`,
        50 /* MEDIUM_MAYBE */,
        effectiveScriptSrcDirective,
        value
      ));
    }
  }
  return violations;
}
function checkFlashObjectAllowlistBypass(parsedCsp) {
  const violations = [];
  const effectiveObjectSrcDirective = parsedCsp.getEffectiveDirective("object-src" /* OBJECT_SRC */);
  const objectSrcValues = parsedCsp.directives[effectiveObjectSrcDirective] || [];
  const pluginTypes = parsedCsp.directives["plugin-types" /* PLUGIN_TYPES */];
  if (pluginTypes && !pluginTypes.includes("application/x-shockwave-flash")) {
    return [];
  }
  for (const value of objectSrcValues) {
    if (value === "'none'" /* NONE */) {
      return [];
    }
    const url = "//" + getSchemeFreeUrl(value);
    const flashBypass = matchWildcardUrls(url, URLS2);
    if (flashBypass) {
      violations.push(new Finding(
        306 /* OBJECT_ALLOWLIST_BYPASS */,
        flashBypass.hostname + " is known to host Flash files which allow to bypass this CSP.",
        10 /* HIGH */,
        effectiveObjectSrcDirective,
        value
      ));
    } else if (effectiveObjectSrcDirective === "object-src" /* OBJECT_SRC */) {
      violations.push(new Finding(
        306 /* OBJECT_ALLOWLIST_BYPASS */,
        `Can you restrict object-src to 'none' only?`,
        50 /* MEDIUM_MAYBE */,
        effectiveObjectSrcDirective,
        value
      ));
    }
  }
  return violations;
}
function looksLikeIpAddress(maybeIp) {
  if (maybeIp.startsWith("[") && maybeIp.endsWith("]")) {
    return true;
  }
  if (/^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/.test(maybeIp)) {
    return true;
  }
  return false;
}
function checkIpSource(parsedCsp) {
  const violations = [];
  const checkIp = (directive, directiveValues) => {
    for (const value of directiveValues) {
      const host = getHostname(value);
      if (looksLikeIpAddress(host)) {
        if (host === "127.0.0.1") {
          violations.push(new Finding(
            308 /* IP_SOURCE */,
            directive + " directive allows localhost as source. Please make sure to remove this in production environments.",
            60 /* INFO */,
            directive,
            value
          ));
        } else {
          violations.push(new Finding(
            308 /* IP_SOURCE */,
            directive + " directive has an IP-Address as source: " + host + " (will be ignored by browsers!). ",
            60 /* INFO */,
            directive,
            value
          ));
        }
      }
    }
  };
  applyCheckFunktionToDirectives(parsedCsp, checkIp);
  return violations;
}
function checkDeprecatedDirective(parsedCsp) {
  const violations = [];
  if ("reflected-xss" /* REFLECTED_XSS */ in parsedCsp.directives) {
    violations.push(new Finding(
      309 /* DEPRECATED_DIRECTIVE */,
      "reflected-xss is deprecated since CSP2. Please, use the X-XSS-Protection header instead.",
      60 /* INFO */,
      "reflected-xss" /* REFLECTED_XSS */
    ));
  }
  if ("referrer" /* REFERRER */ in parsedCsp.directives) {
    violations.push(new Finding(
      309 /* DEPRECATED_DIRECTIVE */,
      "referrer is deprecated since CSP2. Please, use the Referrer-Policy header instead.",
      60 /* INFO */,
      "referrer" /* REFERRER */
    ));
  }
  if ("disown-opener" /* DISOWN_OPENER */ in parsedCsp.directives) {
    violations.push(new Finding(
      309 /* DEPRECATED_DIRECTIVE */,
      "disown-opener is deprecated since CSP3. Please, use the Cross Origin Opener Policy header instead.",
      60 /* INFO */,
      "disown-opener" /* DISOWN_OPENER */
    ));
  }
  return violations;
}
function checkNonceLength(parsedCsp) {
  const noncePattern = new RegExp("^'nonce-(.+)'$");
  const violations = [];
  applyCheckFunktionToDirectives(
    parsedCsp,
    (directive, directiveValues) => {
      for (const value of directiveValues) {
        const match = value.match(noncePattern);
        if (!match) {
          continue;
        }
        const nonceValue = match[1];
        if (nonceValue.length < 8) {
          violations.push(new Finding(
            307 /* NONCE_LENGTH */,
            "Nonces should be at least 8 characters long.",
            30 /* MEDIUM */,
            directive,
            value
          ));
        }
        if (!isNonce(value, true)) {
          violations.push(new Finding(
            106 /* NONCE_CHARSET */,
            "Nonces should only use the base64 charset.",
            60 /* INFO */,
            directive,
            value
          ));
        }
      }
    }
  );
  return violations;
}
function checkSrcHttp(parsedCsp) {
  const violations = [];
  applyCheckFunktionToDirectives(
    parsedCsp,
    (directive, directiveValues) => {
      for (const value of directiveValues) {
        const description = directive === "report-uri" /* REPORT_URI */ ? "Use HTTPS to send violation reports securely." : "Allow only resources downloaded over HTTPS.";
        if (value.startsWith("http://")) {
          violations.push(new Finding(
            310 /* SRC_HTTP */,
            description,
            30 /* MEDIUM */,
            directive,
            value
          ));
        }
      }
    }
  );
  return violations;
}

// ../../front_end/third_party/csp_evaluator/package/checks/strictcsp_checks.ts
function checkStrictDynamic(parsedCsp) {
  const directiveName = parsedCsp.getEffectiveDirective("script-src" /* SCRIPT_SRC */);
  const values = parsedCsp.directives[directiveName] || [];
  const schemeOrHostPresent = values.some((v) => !v.startsWith("'"));
  if (schemeOrHostPresent && !values.includes("'strict-dynamic'" /* STRICT_DYNAMIC */)) {
    return [new Finding(
      400 /* STRICT_DYNAMIC */,
      "Host allowlists can frequently be bypassed. Consider using 'strict-dynamic' in combination with CSP nonces or hashes.",
      45 /* STRICT_CSP */,
      directiveName
    )];
  }
  return [];
}
function checkStrictDynamicNotStandalone(parsedCsp) {
  const directiveName = parsedCsp.getEffectiveDirective("script-src" /* SCRIPT_SRC */);
  const values = parsedCsp.directives[directiveName] || [];
  if (values.includes("'strict-dynamic'" /* STRICT_DYNAMIC */) && (!parsedCsp.policyHasScriptNonces() && !parsedCsp.policyHasScriptHashes())) {
    return [new Finding(
      401 /* STRICT_DYNAMIC_NOT_STANDALONE */,
      "'strict-dynamic' without a CSP nonce/hash will block all scripts.",
      60 /* INFO */,
      directiveName
    )];
  }
  return [];
}
function checkUnsafeInlineFallback(parsedCsp) {
  if (!parsedCsp.policyHasScriptNonces() && !parsedCsp.policyHasScriptHashes()) {
    return [];
  }
  const directiveName = parsedCsp.getEffectiveDirective("script-src" /* SCRIPT_SRC */);
  const values = parsedCsp.directives[directiveName] || [];
  if (!values.includes("'unsafe-inline'" /* UNSAFE_INLINE */)) {
    return [new Finding(
      403 /* UNSAFE_INLINE_FALLBACK */,
      "Consider adding 'unsafe-inline' (ignored by browsers supporting nonces/hashes) to be backward compatible with older browsers.",
      45 /* STRICT_CSP */,
      directiveName
    )];
  }
  return [];
}
function checkAllowlistFallback(parsedCsp) {
  const directiveName = parsedCsp.getEffectiveDirective("script-src" /* SCRIPT_SRC */);
  const values = parsedCsp.directives[directiveName] || [];
  if (!values.includes("'strict-dynamic'" /* STRICT_DYNAMIC */)) {
    return [];
  }
  if (!values.some(
    (v) => ["http:", "https:", "*"].includes(v) || v.includes(".")
  )) {
    return [new Finding(
      404 /* ALLOWLIST_FALLBACK */,
      "Consider adding https: and http: url schemes (ignored by browsers supporting 'strict-dynamic') to be backward compatible with older browsers.",
      45 /* STRICT_CSP */,
      directiveName
    )];
  }
  return [];
}
function checkRequiresTrustedTypesForScripts(parsedCsp) {
  const directiveName = parsedCsp.getEffectiveDirective("require-trusted-types-for" /* REQUIRE_TRUSTED_TYPES_FOR */);
  const values = parsedCsp.directives[directiveName] || [];
  if (!values.includes("'script'" /* SCRIPT */)) {
    return [new Finding(
      500 /* REQUIRE_TRUSTED_TYPES_FOR_SCRIPTS */,
      `Consider requiring Trusted Types for scripts to lock down DOM XSS injection sinks. You can do this by adding "require-trusted-types-for 'script'" to your policy.`,
      60 /* INFO */,
      "require-trusted-types-for" /* REQUIRE_TRUSTED_TYPES_FOR */
    )];
  }
  return [];
}

// ../../front_end/third_party/csp_evaluator/package/evaluator.ts
var CspEvaluator = class {
  version;
  csp;
  /**
   * List of findings reported by checks.
   *
   */
  findings = [];
  /**
   * @param parsedCsp A parsed Content Security Policy.
   * @param cspVersion CSP version to apply checks for.
   */
  constructor(parsedCsp, cspVersion) {
    this.version = cspVersion || 3 /* CSP3 */;
    this.csp = parsedCsp;
  }
  /**
   * Evaluates a parsed CSP against a set of checks
   * @param parsedCspChecks list of checks to run on the parsed CSP (i.e.
   *     checks like backward compatibility checks, which are independent of the
   *     actual CSP version).
   * @param effectiveCspChecks list of checks to run on the effective CSP.
   * @return List of Findings.
   * @export
   */
  evaluate(parsedCspChecks, effectiveCspChecks) {
    this.findings = [];
    const checks = effectiveCspChecks || DEFAULT_CHECKS;
    const effectiveCsp = this.csp.getEffectiveCsp(this.version, this.findings);
    if (parsedCspChecks) {
      for (const check of parsedCspChecks) {
        this.findings = this.findings.concat(check(this.csp));
      }
    }
    for (const check of checks) {
      this.findings = this.findings.concat(check(effectiveCsp));
    }
    return this.findings;
  }
};
var DEFAULT_CHECKS = [
  checkScriptUnsafeInline,
  checkScriptUnsafeEval,
  checkPlainUrlSchemes,
  checkWildcards,
  checkMissingDirectives,
  checkScriptAllowlistBypass,
  checkFlashObjectAllowlistBypass,
  checkIpSource,
  checkNonceLength,
  checkSrcHttp,
  checkDeprecatedDirective,
  checkUnknownDirective,
  checkMissingSemicolon,
  checkInvalidKeyword
];
var STRICTCSP_CHECKS = [
  checkStrictDynamic,
  checkStrictDynamicNotStandalone,
  checkUnsafeInlineFallback,
  checkAllowlistFallback,
  checkRequiresTrustedTypesForScripts
];

// ../../front_end/third_party/csp_evaluator/package/parser.ts
var parser_exports = {};
__export(parser_exports, {
  CspParser: () => CspParser,
  TEST_ONLY: () => TEST_ONLY
});
var CspParser = class {
  csp;
  /**
   * @param unparsedCsp A Content Security Policy as string.
   */
  constructor(unparsedCsp) {
    this.csp = new Csp();
    this.parse(unparsedCsp);
  }
  /**
   * Parses a CSP from a string.
   * @param unparsedCsp CSP as string.
   */
  parse(unparsedCsp) {
    this.csp = new Csp();
    const directiveTokens = unparsedCsp.split(";");
    for (let i = 0; i < directiveTokens.length; i++) {
      const directiveToken = directiveTokens[i].trim();
      const directiveParts = directiveToken.match(/\S+/g);
      if (Array.isArray(directiveParts)) {
        const directiveName = directiveParts[0].toLowerCase();
        if (directiveName in this.csp.directives) {
          continue;
        }
        if (!isDirective(directiveName)) {
        }
        const directiveValues = [];
        for (let directiveValue, j = 1; directiveValue = directiveParts[j]; j++) {
          directiveValue = normalizeDirectiveValue(directiveValue);
          if (!directiveValues.includes(directiveValue)) {
            directiveValues.push(directiveValue);
          }
        }
        this.csp.directives[directiveName] = directiveValues;
      }
    }
    return this.csp;
  }
};
function normalizeDirectiveValue(directiveValue) {
  directiveValue = directiveValue.trim();
  const directiveValueLower = directiveValue.toLowerCase();
  if (isKeyword(directiveValueLower) || isUrlScheme(directiveValue)) {
    return directiveValueLower;
  }
  return directiveValue;
}
var TEST_ONLY = { normalizeDirectiveValue };
export {
  evaluator_exports as CspEvaluator,
  parser_exports as CspParser
};
/**
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @author lwe@google.com (Lukas Weichselbaum)
 */
/**
 * @fileoverview CSP definitions and helper functions.
 * @author lwe@google.com (Lukas Weichselbaum)
 *
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @fileoverview Collection of CSP parser checks which can be used to find
 * common syntax mistakes like missing semicolons, invalid directives or
 * invalid keywords.
 * @author lwe@google.com (Lukas Weichselbaum)
 *
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @fileoverview Collection of popular sites/CDNs hosting Angular.
 * @author lwe@google.com (Lukas Weichselbaum)
 *
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @fileoverview Collection of popular sites/CDNs hosting flash with user
 * provided JS.
 * @author lwe@google.com (Lukas Weichselbaum)
 *
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @fileoverview Collection of popular sites/CDNs hosting JSONP-like endpoints.
 * Endpoints don't contain necessary parameters to trigger JSONP response
 * because parameters are ignored in CSP allowlists.
 * Usually per domain only one (popular) file path is listed to allow bypasses
 * of the most common path based allowlists. It's not practical to ship a list
 * for all possible paths/domains. Therefore the jsonp bypass check usually only
 * works efficient for domain based allowlists.
 * @author lwe@google.com (Lukas Weichselbaum)
 *
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @fileoverview Utils for CSP evaluator.
 * @author lwe@google.com (Lukas Weichselbaum)
 *
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @fileoverview Collection of CSP evaluation checks.
 * @author lwe@google.com (Lukas Weichselbaum)
 *
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @fileoverview Collection of "strict" CSP and backward compatibility checks.
 * A "strict" CSP is based on nonces or hashes and drops the allowlist.
 * These checks ensure that 'strict-dynamic' and a CSP nonce/hash are present.
 * Due to 'strict-dynamic' any allowlist will get dropped in CSP3.
 * The backward compatibility checks ensure that the strict nonce/hash based CSP
 * will be a no-op in older browsers by checking for presence of 'unsafe-inline'
 * (will be dropped in newer browsers if a nonce or hash is present) and for
 * prsensence of http: and https: url schemes (will be droped in the presence of
 * 'strict-dynamic' in newer browsers).
 *
 * @author lwe@google.com (Lukas Weichselbaum)
 *
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @author lwe@google.com (Lukas Weichselbaum)
 *
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
//# sourceMappingURL=csp_evaluator.js.map
