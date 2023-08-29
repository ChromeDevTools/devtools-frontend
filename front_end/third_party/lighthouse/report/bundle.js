var D="\u2026",de="\xA0";var pe={PASS:{label:"pass",minScore:.9},AVERAGE:{label:"average",minScore:.5},FAIL:{label:"fail"},ERROR:{label:"error"}},he=["com","co","gov","edu","ac","org","go","gob","or","net","in","ne","nic","gouv","web","spb","blog","jus","kiev","mil","wi","qc","ca","bel","on"],k=class o{static get RATINGS(){return pe}static get PASS_THRESHOLD(){return .9}static get MS_DISPLAY_VALUE(){return`%10d${de}ms`}static getFinalDisplayedUrl(e){if(e.finalDisplayedUrl)return e.finalDisplayedUrl;if(e.finalUrl)return e.finalUrl;throw new Error("Could not determine final displayed URL")}static getMainDocumentUrl(e){return e.mainDocumentUrl||e.finalUrl}static getFullPageScreenshot(e){return e.fullPageScreenshot?e.fullPageScreenshot:e.audits["full-page-screenshot"]?.details}static splitMarkdownCodeSpans(e){let t=[],n=e.split(/`(.*?)`/g);for(let r=0;r<n.length;r++){let i=n[r];if(!i)continue;let a=r%2!==0;t.push({isCode:a,text:i})}return t}static splitMarkdownLink(e){let t=[],n=e.split(/\[([^\]]+?)\]\((https?:\/\/.*?)\)/g);for(;n.length;){let[r,i,a]=n.splice(0,3);r&&t.push({isLink:!1,text:r}),i&&a&&t.push({isLink:!0,text:i,linkHref:a})}return t}static truncate(e,t,n="\u2026"){if(e.length<=t)return e;let i=new Intl.Segmenter(void 0,{granularity:"grapheme"}).segment(e)[Symbol.iterator](),a=0;for(let l=0;l<=t-n.length;l++){let s=i.next();if(s.done)return e;a=s.value.index}for(let l=0;l<n.length;l++)if(i.next().done)return e;return e.slice(0,a)+n}static getURLDisplayName(e,t){t=t||{numPathParts:void 0,preserveQuery:void 0,preserveHost:void 0};let n=t.numPathParts!==void 0?t.numPathParts:2,r=t.preserveQuery!==void 0?t.preserveQuery:!0,i=t.preserveHost||!1,a;if(e.protocol==="about:"||e.protocol==="data:")a=e.href;else{a=e.pathname;let s=a.split("/").filter(c=>c.length);n&&s.length>n&&(a=D+s.slice(-1*n).join("/")),i&&(a=`${e.host}/${a.replace(/^\//,"")}`),r&&(a=`${a}${e.search}`)}let l=64;if(e.protocol!=="data:"&&(a=a.slice(0,200),a=a.replace(/([a-f0-9]{7})[a-f0-9]{13}[a-f0-9]*/g,`$1${D}`),a=a.replace(/([a-zA-Z0-9-_]{9})(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])[a-zA-Z0-9-_]{10,}/g,`$1${D}`),a=a.replace(/(\d{3})\d{6,}/g,`$1${D}`),a=a.replace(/\u2026+/g,D),a.length>l&&a.includes("?")&&(a=a.replace(/\?([^=]*)(=)?.*/,`?$1$2${D}`),a.length>l&&(a=a.replace(/\?.*/,`?${D}`)))),a.length>l){let s=a.lastIndexOf(".");s>=0?a=a.slice(0,l-1-(a.length-s))+`${D}${a.slice(s)}`:a=a.slice(0,l-1)+D}return a}static getChromeExtensionOrigin(e){let t=new URL(e);return t.protocol+"//"+t.host}static parseURL(e){let t=new URL(e);return{file:o.getURLDisplayName(t),hostname:t.hostname,origin:t.protocol==="chrome-extension:"?o.getChromeExtensionOrigin(e):t.origin}}static createOrReturnURL(e){return e instanceof URL?e:new URL(e)}static getTld(e){let t=e.split(".").slice(-2);return he.includes(t[0])?`.${t.join(".")}`:`.${t[t.length-1]}`}static getRootDomain(e){let t=o.createOrReturnURL(e).hostname,r=o.getTld(t).split(".");return t.split(".").slice(-r.length).join(".")}static filterRelevantLines(e,t,n){if(t.length===0)return e.slice(0,n*2+1);let r=3,i=new Set;return t=t.sort((a,l)=>(a.lineNumber||0)-(l.lineNumber||0)),t.forEach(({lineNumber:a})=>{let l=a-n,s=a+n;for(;l<1;)l++,s++;i.has(l-r-1)&&(l-=r);for(let c=l;c<=s;c++){let d=c;i.add(d)}}),e.filter(a=>i.has(a.lineNumber))}};function ue(o){let e=o.createFragment(),t=o.createElement("style");t.append(`
    .lh-3p-filter {
      color: var(--color-gray-600);
      float: right;
      padding: 6px var(--stackpack-padding-horizontal);
    }
    .lh-3p-filter-label, .lh-3p-filter-input {
      vertical-align: middle;
      user-select: none;
    }
    .lh-3p-filter-input:disabled + .lh-3p-ui-string {
      text-decoration: line-through;
    }
  `),e.append(t);let n=o.createElement("div","lh-3p-filter"),r=o.createElement("label","lh-3p-filter-label"),i=o.createElement("input","lh-3p-filter-input");i.setAttribute("type","checkbox"),i.setAttribute("checked","");let a=o.createElement("span","lh-3p-ui-string");a.append("Show 3rd party resources");let l=o.createElement("span","lh-3p-filter-count");return r.append(" ",i," ",a," (",l,") "),n.append(" ",r," "),e.append(n),e}function ge(o){let e=o.createFragment(),t=o.createElement("div","lh-audit"),n=o.createElement("details","lh-expandable-details"),r=o.createElement("summary"),i=o.createElement("div","lh-audit__header lh-expandable-details__summary"),a=o.createElement("span","lh-audit__score-icon"),l=o.createElement("span","lh-audit__title-and-text"),s=o.createElement("span","lh-audit__title"),c=o.createElement("span","lh-audit__display-text");l.append(" ",s," ",c," ");let d=o.createElement("div","lh-chevron-container");i.append(" ",a," ",l," ",d," "),r.append(" ",i," ");let p=o.createElement("div","lh-audit__description"),h=o.createElement("div","lh-audit__stackpacks");return n.append(" ",r," ",p," ",h," "),t.append(" ",n," "),e.append(t),e}function me(o){let e=o.createFragment(),t=o.createElement("div","lh-category-header"),n=o.createElement("div","lh-score__gauge");n.setAttribute("role","heading"),n.setAttribute("aria-level","2");let r=o.createElement("div","lh-category-header__description");return t.append(" ",n," ",r," "),e.append(t),e}function fe(o){let e=o.createFragment(),t=o.createElementNS("http://www.w3.org/2000/svg","svg","lh-chevron");t.setAttribute("viewBox","0 0 100 100");let n=o.createElementNS("http://www.w3.org/2000/svg","g","lh-chevron__lines"),r=o.createElementNS("http://www.w3.org/2000/svg","path","lh-chevron__line lh-chevron__line-left");r.setAttribute("d","M10 50h40");let i=o.createElementNS("http://www.w3.org/2000/svg","path","lh-chevron__line lh-chevron__line-right");return i.setAttribute("d","M90 50H50"),n.append(" ",r," ",i," "),t.append(" ",n," "),e.append(t),e}function be(o){let e=o.createFragment(),t=o.createElement("div","lh-audit-group"),n=o.createElement("details","lh-clump"),r=o.createElement("summary"),i=o.createElement("div","lh-audit-group__summary"),a=o.createElement("div","lh-audit-group__header"),l=o.createElement("span","lh-audit-group__title"),s=o.createElement("span","lh-audit-group__itemcount");a.append(" ",l," ",s," "," "," ");let c=o.createElement("div","lh-clump-toggle"),d=o.createElement("span","lh-clump-toggletext--show"),p=o.createElement("span","lh-clump-toggletext--hide");return c.append(" ",d," ",p," "),i.append(" ",a," ",c," "),r.append(" ",i," "),n.append(" ",r," "),t.append(" "," ",n," "),e.append(t),e}function ve(o){let e=o.createFragment(),t=o.createElement("div","lh-crc-container"),n=o.createElement("style");n.append(`
      .lh-crc .lh-tree-marker {
        width: 12px;
        height: 26px;
        display: block;
        float: left;
        background-position: top left;
      }
      .lh-crc .lh-horiz-down {
        background: url('data:image/svg+xml;utf8,<svg width="16" height="26" viewBox="0 0 16 26" xmlns="http://www.w3.org/2000/svg"><g fill="%23D8D8D8" fill-rule="evenodd"><path d="M16 12v2H-2v-2z"/><path d="M9 12v14H7V12z"/></g></svg>');
      }
      .lh-crc .lh-right {
        background: url('data:image/svg+xml;utf8,<svg width="16" height="26" viewBox="0 0 16 26" xmlns="http://www.w3.org/2000/svg"><path d="M16 12v2H0v-2z" fill="%23D8D8D8" fill-rule="evenodd"/></svg>');
      }
      .lh-crc .lh-up-right {
        background: url('data:image/svg+xml;utf8,<svg width="16" height="26" viewBox="0 0 16 26" xmlns="http://www.w3.org/2000/svg"><path d="M7 0h2v14H7zm2 12h7v2H9z" fill="%23D8D8D8" fill-rule="evenodd"/></svg>');
      }
      .lh-crc .lh-vert-right {
        background: url('data:image/svg+xml;utf8,<svg width="16" height="26" viewBox="0 0 16 26" xmlns="http://www.w3.org/2000/svg"><path d="M7 0h2v27H7zm2 12h7v2H9z" fill="%23D8D8D8" fill-rule="evenodd"/></svg>');
      }
      .lh-crc .lh-vert {
        background: url('data:image/svg+xml;utf8,<svg width="16" height="26" viewBox="0 0 16 26" xmlns="http://www.w3.org/2000/svg"><path d="M7 0h2v26H7z" fill="%23D8D8D8" fill-rule="evenodd"/></svg>');
      }
      .lh-crc .lh-crc-tree {
        font-size: 14px;
        width: 100%;
        overflow-x: auto;
      }
      .lh-crc .lh-crc-node {
        height: 26px;
        line-height: 26px;
        white-space: nowrap;
      }
      .lh-crc .lh-crc-node__tree-value {
        margin-left: 10px;
      }
      .lh-crc .lh-crc-node__tree-value div {
        display: inline;
      }
      .lh-crc .lh-crc-node__chain-duration {
        font-weight: 700;
      }
      .lh-crc .lh-crc-initial-nav {
        color: #595959;
        font-style: italic;
      }
      .lh-crc__summary-value {
        margin-bottom: 10px;
      }
    `);let r=o.createElement("div"),i=o.createElement("div","lh-crc__summary-value"),a=o.createElement("span","lh-crc__longest_duration_label"),l=o.createElement("b","lh-crc__longest_duration");i.append(" ",a," ",l," "),r.append(" ",i," ");let s=o.createElement("div","lh-crc"),c=o.createElement("div","lh-crc-initial-nav");return s.append(" ",c," "," "),t.append(" ",n," ",r," ",s," "),e.append(t),e}function _e(o){let e=o.createFragment(),t=o.createElement("div","lh-crc-node"),n=o.createElement("span","lh-crc-node__tree-marker"),r=o.createElement("span","lh-crc-node__tree-value");return t.append(" ",n," ",r," "),e.append(t),e}function we(o){let e=o.createFragment(),t=o.createElement("div","lh-element-screenshot"),n=o.createElement("div","lh-element-screenshot__content"),r=o.createElement("div","lh-element-screenshot__image"),i=o.createElement("div","lh-element-screenshot__mask"),a=o.createElementNS("http://www.w3.org/2000/svg","svg");a.setAttribute("height","0"),a.setAttribute("width","0");let l=o.createElementNS("http://www.w3.org/2000/svg","defs"),s=o.createElementNS("http://www.w3.org/2000/svg","clipPath");s.setAttribute("clipPathUnits","objectBoundingBox"),l.append(" ",s," "," "),a.append(" ",l," "),i.append(" ",a," ");let c=o.createElement("div","lh-element-screenshot__element-marker");return r.append(" ",i," ",c," "),n.append(" ",r," "),t.append(" ",n," "),e.append(t),e}function ye(o){let e=o.createFragment(),t=o.createElement("style");t.append(`
    .lh-footer {
      padding: var(--footer-padding-vertical) calc(var(--default-padding) * 2);
      max-width: var(--report-content-max-width);
      margin: 0 auto;
    }
    .lh-footer .lh-generated {
      text-align: center;
    }
  `),e.append(t);let n=o.createElement("footer","lh-footer"),r=o.createElement("ul","lh-meta__items");r.append(" ");let i=o.createElement("div","lh-generated"),a=o.createElement("b");a.append("Lighthouse");let l=o.createElement("span","lh-footer__version"),s=o.createElement("a","lh-footer__version_issue");return s.setAttribute("href","https://github.com/GoogleChrome/Lighthouse/issues"),s.setAttribute("target","_blank"),s.setAttribute("rel","noopener"),s.append("File an issue"),i.append(" "," Generated by ",a," ",l," | ",s," "),n.append(" ",r," ",i," "),e.append(n),e}function xe(o){let e=o.createFragment(),t=o.createElement("a","lh-fraction__wrapper"),n=o.createElement("div","lh-fraction__content-wrapper"),r=o.createElement("div","lh-fraction__content"),i=o.createElement("div","lh-fraction__background");r.append(" ",i," "),n.append(" ",r," ");let a=o.createElement("div","lh-fraction__label");return t.append(" ",n," ",a," "),e.append(t),e}function Ee(o){let e=o.createFragment(),t=o.createElement("a","lh-gauge__wrapper"),n=o.createElement("div","lh-gauge__svg-wrapper"),r=o.createElementNS("http://www.w3.org/2000/svg","svg","lh-gauge");r.setAttribute("viewBox","0 0 120 120");let i=o.createElementNS("http://www.w3.org/2000/svg","circle","lh-gauge-base");i.setAttribute("r","56"),i.setAttribute("cx","60"),i.setAttribute("cy","60"),i.setAttribute("stroke-width","8");let a=o.createElementNS("http://www.w3.org/2000/svg","circle","lh-gauge-arc");a.setAttribute("r","56"),a.setAttribute("cx","60"),a.setAttribute("cy","60"),a.setAttribute("stroke-width","8"),r.append(" ",i," ",a," "),n.append(" ",r," ");let l=o.createElement("div","lh-gauge__percentage"),s=o.createElement("div","lh-gauge__label");return t.append(" "," ",n," ",l," "," ",s," "),e.append(t),e}function ke(o){let e=o.createFragment(),t=o.createElement("style");t.append(`
    .lh-gauge--pwa .lh-gauge--pwa__component {
      display: none;
    }
    .lh-gauge--pwa__wrapper:not(.lh-badged--all) .lh-gauge--pwa__logo > path {
      /* Gray logo unless everything is passing. */
      fill: #B0B0B0;
    }

    .lh-gauge--pwa__disc {
      fill: var(--color-gray-200);
    }

    .lh-gauge--pwa__logo--primary-color {
      fill: #304FFE;
    }

    .lh-gauge--pwa__logo--secondary-color {
      fill: #3D3D3D;
    }
    .lh-dark .lh-gauge--pwa__logo--secondary-color {
      fill: #D8B6B6;
    }

    /* No passing groups. */
    .lh-gauge--pwa__wrapper:not([class*='lh-badged--']) .lh-gauge--pwa__na-line {
      display: inline;
    }
    /* Just optimized. Same n/a line as no passing groups. */
    .lh-gauge--pwa__wrapper.lh-badged--pwa-optimized:not(.lh-badged--pwa-installable) .lh-gauge--pwa__na-line {
      display: inline;
    }

    /* Just installable. */
    .lh-gauge--pwa__wrapper.lh-badged--pwa-installable .lh-gauge--pwa__installable-badge {
      display: inline;
    }

    /* All passing groups. */
    .lh-gauge--pwa__wrapper.lh-badged--all .lh-gauge--pwa__check-circle {
      display: inline;
    }
  `),e.append(t);let n=o.createElement("a","lh-gauge__wrapper lh-gauge--pwa__wrapper"),r=o.createElementNS("http://www.w3.org/2000/svg","svg","lh-gauge lh-gauge--pwa");r.setAttribute("viewBox","0 0 60 60");let i=o.createElementNS("http://www.w3.org/2000/svg","defs"),a=o.createElementNS("http://www.w3.org/2000/svg","linearGradient");a.setAttribute("id","lh-gauge--pwa__check-circle__gradient"),a.setAttribute("x1","50%"),a.setAttribute("y1","0%"),a.setAttribute("x2","50%"),a.setAttribute("y2","100%");let l=o.createElementNS("http://www.w3.org/2000/svg","stop");l.setAttribute("stop-color","#00C852"),l.setAttribute("offset","0%");let s=o.createElementNS("http://www.w3.org/2000/svg","stop");s.setAttribute("stop-color","#009688"),s.setAttribute("offset","100%"),a.append(" ",l," ",s," ");let c=o.createElementNS("http://www.w3.org/2000/svg","linearGradient");c.setAttribute("id","lh-gauge--pwa__installable__shadow-gradient"),c.setAttribute("x1","76.056%"),c.setAttribute("x2","24.111%"),c.setAttribute("y1","82.995%"),c.setAttribute("y2","24.735%");let d=o.createElementNS("http://www.w3.org/2000/svg","stop");d.setAttribute("stop-color","#A5D6A7"),d.setAttribute("offset","0%");let p=o.createElementNS("http://www.w3.org/2000/svg","stop");p.setAttribute("stop-color","#80CBC4"),p.setAttribute("offset","100%"),c.append(" ",d," ",p," ");let h=o.createElementNS("http://www.w3.org/2000/svg","g");h.setAttribute("id","lh-gauge--pwa__installable-badge");let u=o.createElementNS("http://www.w3.org/2000/svg","circle");u.setAttribute("fill","#FFFFFF"),u.setAttribute("cx","10"),u.setAttribute("cy","10"),u.setAttribute("r","10");let f=o.createElementNS("http://www.w3.org/2000/svg","path");f.setAttribute("fill","#009688"),f.setAttribute("d","M10 4.167A5.835 5.835 0 0 0 4.167 10 5.835 5.835 0 0 0 10 15.833 5.835 5.835 0 0 0 15.833 10 5.835 5.835 0 0 0 10 4.167zm2.917 6.416h-2.334v2.334H9.417v-2.334H7.083V9.417h2.334V7.083h1.166v2.334h2.334v1.166z"),h.append(" ",u," ",f," "),i.append(" ",a," ",c," ",h," ");let b=o.createElementNS("http://www.w3.org/2000/svg","g");b.setAttribute("stroke","none"),b.setAttribute("fill-rule","nonzero");let _=o.createElementNS("http://www.w3.org/2000/svg","circle","lh-gauge--pwa__disc");_.setAttribute("cx","30"),_.setAttribute("cy","30"),_.setAttribute("r","30");let m=o.createElementNS("http://www.w3.org/2000/svg","g","lh-gauge--pwa__logo"),w=o.createElementNS("http://www.w3.org/2000/svg","path","lh-gauge--pwa__logo--secondary-color");w.setAttribute("d","M35.66 19.39l.7-1.75h2L37.4 15 38.6 12l3.4 9h-2.51l-.58-1.61z");let v=o.createElementNS("http://www.w3.org/2000/svg","path","lh-gauge--pwa__logo--primary-color");v.setAttribute("d","M33.52 21l3.65-9h-2.42l-2.5 5.82L30.5 12h-1.86l-1.9 5.82-1.35-2.65-1.21 3.72L25.4 21h2.38l1.72-5.2 1.64 5.2z");let x=o.createElementNS("http://www.w3.org/2000/svg","path","lh-gauge--pwa__logo--secondary-color");x.setAttribute("fill-rule","nonzero"),x.setAttribute("d","M20.3 17.91h1.48c.45 0 .85-.05 1.2-.15l.39-1.18 1.07-3.3a2.64 2.64 0 0 0-.28-.37c-.55-.6-1.36-.91-2.42-.91H18v9h2.3V17.9zm1.96-3.84c.22.22.33.5.33.87 0 .36-.1.65-.29.87-.2.23-.59.35-1.15.35h-.86v-2.41h.87c.52 0 .89.1 1.1.32z"),m.append(" ",w," ",v," ",x," ");let E=o.createElementNS("http://www.w3.org/2000/svg","rect","lh-gauge--pwa__component lh-gauge--pwa__na-line");E.setAttribute("fill","#FFFFFF"),E.setAttribute("x","20"),E.setAttribute("y","32"),E.setAttribute("width","20"),E.setAttribute("height","4"),E.setAttribute("rx","2");let A=o.createElementNS("http://www.w3.org/2000/svg","g","lh-gauge--pwa__component lh-gauge--pwa__installable-badge");A.setAttribute("transform","translate(20, 29)");let C=o.createElementNS("http://www.w3.org/2000/svg","path");C.setAttribute("fill","url(#lh-gauge--pwa__installable__shadow-gradient)"),C.setAttribute("d","M33.629 19.487c-4.272 5.453-10.391 9.39-17.415 10.869L3 17.142 17.142 3 33.63 19.487z");let L=o.createElementNS("http://www.w3.org/2000/svg","use");L.setAttribute("href","#lh-gauge--pwa__installable-badge"),A.append(" ",C," ",L," ");let S=o.createElementNS("http://www.w3.org/2000/svg","g","lh-gauge--pwa__component lh-gauge--pwa__check-circle");S.setAttribute("transform","translate(18, 28)");let z=o.createElementNS("http://www.w3.org/2000/svg","circle");z.setAttribute("fill","#FFFFFF"),z.setAttribute("cx","12"),z.setAttribute("cy","12"),z.setAttribute("r","12");let M=o.createElementNS("http://www.w3.org/2000/svg","path");M.setAttribute("fill","url(#lh-gauge--pwa__check-circle__gradient)"),M.setAttribute("d","M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"),S.append(" ",z," ",M," "),b.append(" "," ",_," ",m," "," ",E," "," ",A," "," ",S," "),r.append(" ",i," ",b," ");let T=o.createElement("div","lh-gauge__label");return n.append(" ",r," ",T," "),e.append(n),e}function Ae(o){let e=o.createFragment(),t=o.createElement("style");t.append(`
    /* CSS Fireworks. Originally by Eddie Lin
       https://codepen.io/paulirish/pen/yEVMbP
    */
    .lh-pyro {
      display: none;
      z-index: 1;
      pointer-events: none;
    }
    .lh-score100 .lh-pyro {
      display: block;
    }
    .lh-score100 .lh-lighthouse stop:first-child {
      stop-color: hsla(200, 12%, 95%, 0);
    }
    .lh-score100 .lh-lighthouse stop:last-child {
      stop-color: hsla(65, 81%, 76%, 1);
    }

    .lh-pyro > .lh-pyro-before, .lh-pyro > .lh-pyro-after {
      position: absolute;
      width: 5px;
      height: 5px;
      border-radius: 2.5px;
      box-shadow: 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff;
      animation: 1s bang ease-out infinite backwards,  1s gravity ease-in infinite backwards,  5s position linear infinite backwards;
      animation-delay: 1s, 1s, 1s;
    }

    .lh-pyro > .lh-pyro-after {
      animation-delay: 2.25s, 2.25s, 2.25s;
      animation-duration: 1.25s, 1.25s, 6.25s;
    }

    @keyframes bang {
      to {
        opacity: 1;
        box-shadow: -70px -115.67px #47ebbc, -28px -99.67px #eb47a4, 58px -31.67px #7eeb47, 13px -141.67px #eb47c5, -19px 6.33px #7347eb, -2px -74.67px #ebd247, 24px -151.67px #eb47e0, 57px -138.67px #b4eb47, -51px -104.67px #479eeb, 62px 8.33px #ebcf47, -93px 0.33px #d547eb, -16px -118.67px #47bfeb, 53px -84.67px #47eb83, 66px -57.67px #eb47bf, -93px -65.67px #91eb47, 30px -13.67px #86eb47, -2px -59.67px #83eb47, -44px 1.33px #eb47eb, 61px -58.67px #47eb73, 5px -22.67px #47e8eb, -66px -28.67px #ebe247, 42px -123.67px #eb5547, -75px 26.33px #7beb47, 15px -52.67px #a147eb, 36px -51.67px #eb8347, -38px -12.67px #eb5547, -46px -59.67px #47eb81, 78px -114.67px #eb47ba, 15px -156.67px #eb47bf, -36px 1.33px #eb4783, -72px -86.67px #eba147, 31px -46.67px #ebe247, -68px 29.33px #47e2eb, -55px 19.33px #ebe047, -56px 27.33px #4776eb, -13px -91.67px #eb5547, -47px -138.67px #47ebc7, -18px -96.67px #eb47ac, 11px -88.67px #4783eb, -67px -28.67px #47baeb, 53px 10.33px #ba47eb, 11px 19.33px #5247eb, -5px -11.67px #eb4791, -68px -4.67px #47eba7, 95px -37.67px #eb478b, -67px -162.67px #eb5d47, -54px -120.67px #eb6847, 49px -12.67px #ebe047, 88px 8.33px #47ebda, 97px 33.33px #eb8147, 6px -71.67px #ebbc47;
      }
    }
    @keyframes gravity {
      from {
        opacity: 1;
      }
      to {
        transform: translateY(80px);
        opacity: 0;
      }
    }
    @keyframes position {
      0%, 19.9% {
        margin-top: 4%;
        margin-left: 47%;
      }
      20%, 39.9% {
        margin-top: 7%;
        margin-left: 30%;
      }
      40%, 59.9% {
        margin-top: 6%;
        margin-left: 70%;
      }
      60%, 79.9% {
        margin-top: 3%;
        margin-left: 20%;
      }
      80%, 99.9% {
        margin-top: 3%;
        margin-left: 80%;
      }
    }
  `),e.append(t);let n=o.createElement("div","lh-header-container"),r=o.createElement("div","lh-scores-wrapper-placeholder");return n.append(" ",r," "),e.append(n),e}function Se(o){let e=o.createFragment(),t=o.createElement("div","lh-metric"),n=o.createElement("div","lh-metric__innerwrap"),r=o.createElement("div","lh-metric__icon"),i=o.createElement("span","lh-metric__title"),a=o.createElement("div","lh-metric__value"),l=o.createElement("div","lh-metric__description");return n.append(" ",r," ",i," ",a," ",l," "),t.append(" ",n," "),e.append(t),e}function Ce(o){let e=o.createFragment(),t=o.createElement("div","lh-audit lh-audit--load-opportunity"),n=o.createElement("details","lh-expandable-details"),r=o.createElement("summary"),i=o.createElement("div","lh-audit__header"),a=o.createElement("div","lh-load-opportunity__cols"),l=o.createElement("div","lh-load-opportunity__col lh-load-opportunity__col--one"),s=o.createElement("span","lh-audit__score-icon"),c=o.createElement("div","lh-audit__title");l.append(" ",s," ",c," ");let d=o.createElement("div","lh-load-opportunity__col lh-load-opportunity__col--two"),p=o.createElement("div","lh-load-opportunity__sparkline"),h=o.createElement("div","lh-sparkline"),u=o.createElement("div","lh-sparkline__bar");h.append(u),p.append(" ",h," ");let f=o.createElement("div","lh-audit__display-text"),b=o.createElement("div","lh-chevron-container");d.append(" ",p," ",f," ",b," "),a.append(" ",l," ",d," "),i.append(" ",a," "),r.append(" ",i," ");let _=o.createElement("div","lh-audit__description"),m=o.createElement("div","lh-audit__stackpacks");return n.append(" ",r," ",_," ",m," "),t.append(" ",n," "),e.append(t),e}function ze(o){let e=o.createFragment(),t=o.createElement("div","lh-load-opportunity__header lh-load-opportunity__cols"),n=o.createElement("div","lh-load-opportunity__col lh-load-opportunity__col--one"),r=o.createElement("div","lh-load-opportunity__col lh-load-opportunity__col--two");return t.append(" ",n," ",r," "),e.append(t),e}function Le(o){let e=o.createFragment(),t=o.createElement("div","lh-scorescale"),n=o.createElement("span","lh-scorescale-range lh-scorescale-range--fail");n.append("0\u201349");let r=o.createElement("span","lh-scorescale-range lh-scorescale-range--average");r.append("50\u201389");let i=o.createElement("span","lh-scorescale-range lh-scorescale-range--pass");return i.append("90\u2013100"),t.append(" ",n," ",r," ",i," "),e.append(t),e}function Me(o){let e=o.createFragment(),t=o.createElement("style");t.append(`
    .lh-scores-container {
      display: flex;
      flex-direction: column;
      padding: var(--default-padding) 0;
      position: relative;
      width: 100%;
    }

    .lh-sticky-header {
      --gauge-circle-size: var(--gauge-circle-size-sm);
      --plugin-badge-size: 16px;
      --plugin-icon-size: 75%;
      --gauge-wrapper-width: 60px;
      --gauge-percentage-font-size: 13px;
      position: fixed;
      left: 0;
      right: 0;
      top: var(--topbar-height);
      font-weight: 500;
      display: none;
      justify-content: center;
      background-color: var(--sticky-header-background-color);
      border-bottom: 1px solid var(--color-gray-200);
      padding-top: var(--score-container-padding);
      padding-bottom: 4px;
      z-index: 1;
      pointer-events: none;
    }

    .lh-devtools .lh-sticky-header {
      /* The report within DevTools is placed in a container with overflow, which changes the placement of this header unless we change \`position\` to \`sticky.\` */
      position: sticky;
    }

    .lh-sticky-header--visible {
      display: grid;
      grid-auto-flow: column;
      pointer-events: auto;
    }

    /* Disable the gauge arc animation for the sticky header, so toggling display: none
       does not play the animation. */
    .lh-sticky-header .lh-gauge-arc {
      animation: none;
    }

    .lh-sticky-header .lh-gauge__label,
    .lh-sticky-header .lh-fraction__label {
      display: none;
    }

    .lh-highlighter {
      width: var(--gauge-wrapper-width);
      height: 1px;
      background-color: var(--highlighter-background-color);
      /* Position at bottom of first gauge in sticky header. */
      position: absolute;
      grid-column: 1;
      bottom: -1px;
      left: 0px;
      right: 0px;
    }

    .lh-gauge__wrapper:first-of-type {
      contain: none;
    }
  `),e.append(t);let n=o.createElement("div","lh-scores-wrapper"),r=o.createElement("div","lh-scores-container"),i=o.createElement("div","lh-pyro"),a=o.createElement("div","lh-pyro-before"),l=o.createElement("div","lh-pyro-after");return i.append(" ",a," ",l," "),r.append(" ",i," "),n.append(" ",r," "),e.append(n),e}function Te(o){let e=o.createFragment(),t=o.createElement("div","lh-snippet"),n=o.createElement("style");return n.append(`
          :root {
            --snippet-highlight-light: #fbf1f2;
            --snippet-highlight-dark: #ffd6d8;
          }

         .lh-snippet__header {
          position: relative;
          overflow: hidden;
          padding: 10px;
          border-bottom: none;
          color: var(--snippet-color);
          background-color: var(--snippet-background-color);
          border: 1px solid var(--report-border-color-secondary);
        }
        .lh-snippet__title {
          font-weight: bold;
          float: left;
        }
        .lh-snippet__node {
          float: left;
          margin-left: 4px;
        }
        .lh-snippet__toggle-expand {
          padding: 1px 7px;
          margin-top: -1px;
          margin-right: -7px;
          float: right;
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 14px;
          color: #0c50c7;
        }

        .lh-snippet__snippet {
          overflow: auto;
          border: 1px solid var(--report-border-color-secondary);
        }
        /* Container needed so that all children grow to the width of the scroll container */
        .lh-snippet__snippet-inner {
          display: inline-block;
          min-width: 100%;
        }

        .lh-snippet:not(.lh-snippet--expanded) .lh-snippet__show-if-expanded {
          display: none;
        }
        .lh-snippet.lh-snippet--expanded .lh-snippet__show-if-collapsed {
          display: none;
        }

        .lh-snippet__line {
          background: white;
          white-space: pre;
          display: flex;
        }
        .lh-snippet__line:not(.lh-snippet__line--message):first-child {
          padding-top: 4px;
        }
        .lh-snippet__line:not(.lh-snippet__line--message):last-child {
          padding-bottom: 4px;
        }
        .lh-snippet__line--content-highlighted {
          background: var(--snippet-highlight-dark);
        }
        .lh-snippet__line--message {
          background: var(--snippet-highlight-light);
        }
        .lh-snippet__line--message .lh-snippet__line-number {
          padding-top: 10px;
          padding-bottom: 10px;
        }
        .lh-snippet__line--message code {
          padding: 10px;
          padding-left: 5px;
          color: var(--color-fail);
          font-family: var(--report-font-family);
        }
        .lh-snippet__line--message code {
          white-space: normal;
        }
        .lh-snippet__line-icon {
          padding-top: 10px;
          display: none;
        }
        .lh-snippet__line--message .lh-snippet__line-icon {
          display: block;
        }
        .lh-snippet__line-icon:before {
          content: "";
          display: inline-block;
          vertical-align: middle;
          margin-right: 4px;
          width: var(--score-icon-size);
          height: var(--score-icon-size);
          background-image: var(--fail-icon-url);
        }
        .lh-snippet__line-number {
          flex-shrink: 0;
          width: 40px;
          text-align: right;
          font-family: monospace;
          padding-right: 5px;
          margin-right: 5px;
          color: var(--color-gray-600);
          user-select: none;
        }
    `),t.append(" ",n," "),e.append(t),e}function Fe(o){let e=o.createFragment(),t=o.createElement("div","lh-snippet__snippet"),n=o.createElement("div","lh-snippet__snippet-inner");return t.append(" ",n," "),e.append(t),e}function De(o){let e=o.createFragment(),t=o.createElement("div","lh-snippet__header"),n=o.createElement("div","lh-snippet__title"),r=o.createElement("div","lh-snippet__node"),i=o.createElement("button","lh-snippet__toggle-expand"),a=o.createElement("span","lh-snippet__btn-label-collapse lh-snippet__show-if-expanded"),l=o.createElement("span","lh-snippet__btn-label-expand lh-snippet__show-if-collapsed");return i.append(" ",a," ",l," "),t.append(" ",n," ",r," ",i," "),e.append(t),e}function Re(o){let e=o.createFragment(),t=o.createElement("div","lh-snippet__line"),n=o.createElement("div","lh-snippet__line-number"),r=o.createElement("div","lh-snippet__line-icon"),i=o.createElement("code");return t.append(" ",n," ",r," ",i," "),e.append(t),e}function Ne(o){let e=o.createFragment(),t=o.createElement("style");return t.append(`/**
 * @license
 * Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*
  Naming convention:

  If a variable is used for a specific component: --{component}-{property name}-{modifier}

  Both {component} and {property name} should be kebab-case. If the target is the entire page,
  use 'report' for the component. The property name should not be abbreviated. Use the
  property name the variable is intended for - if it's used for multiple, a common descriptor
  is fine (ex: 'size' for a variable applied to 'width' and 'height'). If a variable is shared
  across multiple components, either create more variables or just drop the "{component}-"
  part of the name. Append any modifiers at the end (ex: 'big', 'dark').

  For colors: --color-{hue}-{intensity}

  {intensity} is the Material Design tag - 700, A700, etc.
*/
.lh-vars {
  /* Palette using Material Design Colors
   * https://www.materialui.co/colors */
  --color-amber-50: #FFF8E1;
  --color-blue-200: #90CAF9;
  --color-blue-900: #0D47A1;
  --color-blue-A700: #2962FF;
  --color-blue-primary: #06f;
  --color-cyan-500: #00BCD4;
  --color-gray-100: #F5F5F5;
  --color-gray-300: #CFCFCF;
  --color-gray-200: #E0E0E0;
  --color-gray-400: #BDBDBD;
  --color-gray-50: #FAFAFA;
  --color-gray-500: #9E9E9E;
  --color-gray-600: #757575;
  --color-gray-700: #616161;
  --color-gray-800: #424242;
  --color-gray-900: #212121;
  --color-gray: #000000;
  --color-green-700: #080;
  --color-green: #0c6;
  --color-lime-400: #D3E156;
  --color-orange-50: #FFF3E0;
  --color-orange-700: #C33300;
  --color-orange: #fa3;
  --color-red-700: #c00;
  --color-red: #f33;
  --color-teal-600: #00897B;
  --color-white: #FFFFFF;

  /* Context-specific colors */
  --color-average-secondary: var(--color-orange-700);
  --color-average: var(--color-orange);
  --color-fail-secondary: var(--color-red-700);
  --color-fail: var(--color-red);
  --color-hover: var(--color-gray-50);
  --color-informative: var(--color-blue-900);
  --color-pass-secondary: var(--color-green-700);
  --color-pass: var(--color-green);
  --color-not-applicable: var(--color-gray-600);

  /* Component variables */
  --audit-description-padding-left: calc(var(--score-icon-size) + var(--score-icon-margin-left) + var(--score-icon-margin-right));
  --audit-explanation-line-height: 16px;
  --audit-group-margin-bottom: calc(var(--default-padding) * 6);
  --audit-group-padding-vertical: 8px;
  --audit-margin-horizontal: 5px;
  --audit-padding-vertical: 8px;
  --category-padding: calc(var(--default-padding) * 6) var(--edge-gap-padding) calc(var(--default-padding) * 4);
  --chevron-line-stroke: var(--color-gray-600);
  --chevron-size: 12px;
  --default-padding: 8px;
  --edge-gap-padding: calc(var(--default-padding) * 4);
  --env-item-background-color: var(--color-gray-100);
  --env-item-font-size: 28px;
  --env-item-line-height: 36px;
  --env-item-padding: 10px 0px;
  --env-name-min-width: 220px;
  --footer-padding-vertical: 16px;
  --gauge-circle-size-big: 96px;
  --gauge-circle-size: 48px;
  --gauge-circle-size-sm: 32px;
  --gauge-label-font-size-big: 18px;
  --gauge-label-font-size: var(--report-font-size-secondary);
  --gauge-label-line-height-big: 24px;
  --gauge-label-line-height: var(--report-line-height-secondary);
  --gauge-percentage-font-size-big: 38px;
  --gauge-percentage-font-size: var(--report-font-size-secondary);
  --gauge-wrapper-width: 120px;
  --header-line-height: 24px;
  --highlighter-background-color: var(--report-text-color);
  --icon-square-size: calc(var(--score-icon-size) * 0.88);
  --image-preview-size: 48px;
  --link-color: var(--color-blue-primary);
  --locale-selector-background-color: var(--color-white);
  --metric-toggle-lines-fill: #7F7F7F;
  --metric-value-font-size: calc(var(--report-font-size) * 1.8);
  --metrics-toggle-background-color: var(--color-gray-200);
  --plugin-badge-background-color: var(--color-white);
  --plugin-badge-size-big: calc(var(--gauge-circle-size-big) / 2.7);
  --plugin-badge-size: calc(var(--gauge-circle-size) / 2.7);
  --plugin-icon-size: 65%;
  --pwa-icon-margin: 0 var(--default-padding);
  --pwa-icon-size: var(--topbar-logo-size);
  --report-background-color: #fff;
  --report-border-color-secondary: #ebebeb;
  --report-font-family-monospace: 'Roboto Mono', 'Menlo', 'dejavu sans mono', 'Consolas', 'Lucida Console', monospace;
  --report-font-family: Roboto, Helvetica, Arial, sans-serif;
  --report-font-size: 14px;
  --report-font-size-secondary: 12px;
  --report-icon-size: var(--score-icon-background-size);
  --report-line-height: 24px;
  --report-line-height-secondary: 20px;
  --report-monospace-font-size: calc(var(--report-font-size) * 0.85);
  --report-text-color-secondary: var(--color-gray-800);
  --report-text-color: var(--color-gray-900);
  --report-content-max-width: calc(60 * var(--report-font-size)); /* defaults to 840px */
  --report-content-min-width: 360px;
  --report-content-max-width-minus-edge-gap: calc(var(--report-content-max-width) - var(--edge-gap-padding) * 2);
  --score-container-padding: 8px;
  --score-icon-background-size: 24px;
  --score-icon-margin-left: 6px;
  --score-icon-margin-right: 14px;
  --score-icon-margin: 0 var(--score-icon-margin-right) 0 var(--score-icon-margin-left);
  --score-icon-size: 12px;
  --score-icon-size-big: 16px;
  --screenshot-overlay-background: rgba(0, 0, 0, 0.3);
  --section-padding-vertical: calc(var(--default-padding) * 6);
  --snippet-background-color: var(--color-gray-50);
  --snippet-color: #0938C2;
  --sparkline-height: 5px;
  --stackpack-padding-horizontal: 10px;
  --sticky-header-background-color: var(--report-background-color);
  --sticky-header-buffer: calc(var(--topbar-height) + var(--sticky-header-height));
  --sticky-header-height: calc(var(--gauge-circle-size-sm) + var(--score-container-padding) * 2);
  --table-group-header-background-color: #EEF1F4;
  --table-group-header-text-color: var(--color-gray-700);
  --table-higlight-background-color: #F5F7FA;
  --tools-icon-color: var(--color-gray-600);
  --topbar-background-color: var(--color-white);
  --topbar-height: 32px;
  --topbar-logo-size: 24px;
  --topbar-padding: 0 8px;
  --toplevel-warning-background-color: hsla(30, 100%, 75%, 10%);
  --toplevel-warning-message-text-color: var(--color-average-secondary);
  --toplevel-warning-padding: 18px;
  --toplevel-warning-text-color: var(--report-text-color);

  /* SVGs */
  --plugin-icon-url-dark: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="%23FFFFFF"><path d="M0 0h24v24H0z" fill="none"/><path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z"/></svg>');
  --plugin-icon-url: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="%23757575"><path d="M0 0h24v24H0z" fill="none"/><path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z"/></svg>');

  --pass-icon-url: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><title>check</title><path fill="%23178239" d="M24 4C12.95 4 4 12.95 4 24c0 11.04 8.95 20 20 20 11.04 0 20-8.96 20-20 0-11.05-8.96-20-20-20zm-4 30L10 24l2.83-2.83L20 28.34l15.17-15.17L38 16 20 34z"/></svg>');
  --average-icon-url: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><title>info</title><path fill="%23E67700" d="M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4zm2 30h-4V22h4v12zm0-16h-4v-4h4v4z"/></svg>');
  --fail-icon-url: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><title>warn</title><path fill="%23C7221F" d="M2 42h44L24 4 2 42zm24-6h-4v-4h4v4zm0-8h-4v-8h4v8z"/></svg>');
  --error-icon-url: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 15"><title>error</title><path d="M0 15H 3V 12H 0V" fill="%23FF4E42"/><path d="M0 9H 3V 0H 0V" fill="%23FF4E42"/></svg>');

  --pwa-installable-gray-url: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="nonzero"><circle fill="%23DAE0E3" cx="12" cy="12" r="12"/><path d="M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm3.5 7.7h-2.8v2.8h-1.4v-2.8H8.5v-1.4h2.8V8.5h1.4v2.8h2.8v1.4z" fill="%23FFF"/></g></svg>');
  --pwa-optimized-gray-url: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><rect fill="%23DAE0E3" width="24" height="24" rx="12"/><path fill="%23FFF" d="M12 15.07l3.6 2.18-.95-4.1 3.18-2.76-4.2-.36L12 6.17l-1.64 3.86-4.2.36 3.2 2.76-.96 4.1z"/><path d="M5 5h14v14H5z"/></g></svg>');

  --pwa-installable-gray-url-dark: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="nonzero"><circle fill="%23424242" cx="12" cy="12" r="12"/><path d="M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm3.5 7.7h-2.8v2.8h-1.4v-2.8H8.5v-1.4h2.8V8.5h1.4v2.8h2.8v1.4z" fill="%23FFF"/></g></svg>');
  --pwa-optimized-gray-url-dark: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><rect fill="%23424242" width="24" height="24" rx="12"/><path fill="%23FFF" d="M12 15.07l3.6 2.18-.95-4.1 3.18-2.76-4.2-.36L12 6.17l-1.64 3.86-4.2.36 3.2 2.76-.96 4.1z"/><path d="M5 5h14v14H5z"/></g></svg>');

  --pwa-installable-color-url: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"><g fill-rule="nonzero" fill="none"><circle fill="%230CCE6B" cx="12" cy="12" r="12"/><path d="M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm3.5 7.7h-2.8v2.8h-1.4v-2.8H8.5v-1.4h2.8V8.5h1.4v2.8h2.8v1.4z" fill="%23FFF"/></g></svg>');
  --pwa-optimized-color-url: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><rect fill="%230CCE6B" width="24" height="24" rx="12"/><path d="M5 5h14v14H5z"/><path fill="%23FFF" d="M12 15.07l3.6 2.18-.95-4.1 3.18-2.76-4.2-.36L12 6.17l-1.64 3.86-4.2.36 3.2 2.76-.96 4.1z"/></g></svg>');

  --swap-locale-icon-url: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg>');
}

@media not print {
  .lh-dark {
    /* Pallete */
    --color-gray-200: var(--color-gray-800);
    --color-gray-300: #616161;
    --color-gray-400: var(--color-gray-600);
    --color-gray-700: var(--color-gray-400);
    --color-gray-50: #757575;
    --color-gray-600: var(--color-gray-500);
    --color-green-700: var(--color-green);
    --color-orange-700: var(--color-orange);
    --color-red-700: var(--color-red);
    --color-teal-600: var(--color-cyan-500);

    /* Context-specific colors */
    --color-hover: rgba(0, 0, 0, 0.2);
    --color-informative: var(--color-blue-200);

    /* Component variables */
    --env-item-background-color: #393535;
    --link-color: var(--color-blue-200);
    --locale-selector-background-color: var(--color-gray-200);
    --plugin-badge-background-color: var(--color-gray-800);
    --report-background-color: var(--color-gray-900);
    --report-border-color-secondary: var(--color-gray-200);
    --report-text-color-secondary: var(--color-gray-400);
    --report-text-color: var(--color-gray-100);
    --snippet-color: var(--color-cyan-500);
    --topbar-background-color: var(--color-gray);
    --toplevel-warning-background-color: hsl(33deg 14% 18%);
    --toplevel-warning-message-text-color: var(--color-orange-700);
    --toplevel-warning-text-color: var(--color-gray-100);
    --table-group-header-background-color: rgba(186, 196, 206, 0.15);
    --table-group-header-text-color: var(--color-gray-100);
    --table-higlight-background-color: rgba(186, 196, 206, 0.09);

    /* SVGs */
    --plugin-icon-url: var(--plugin-icon-url-dark);
    --pwa-installable-gray-url: var(--pwa-installable-gray-url-dark);
    --pwa-optimized-gray-url: var(--pwa-optimized-gray-url-dark);
  }
}

@media only screen and (max-width: 480px) {
  .lh-vars {
    --audit-group-margin-bottom: 20px;
    --edge-gap-padding: var(--default-padding);
    --env-name-min-width: 120px;
    --gauge-circle-size-big: 96px;
    --gauge-circle-size: 72px;
    --gauge-label-font-size-big: 22px;
    --gauge-label-font-size: 14px;
    --gauge-label-line-height-big: 26px;
    --gauge-label-line-height: 20px;
    --gauge-percentage-font-size-big: 34px;
    --gauge-percentage-font-size: 26px;
    --gauge-wrapper-width: 112px;
    --header-padding: 16px 0 16px 0;
    --image-preview-size: 24px;
    --plugin-icon-size: 75%;
    --pwa-icon-margin: 0 7px 0 -3px;
    --report-font-size: 14px;
    --report-line-height: 20px;
    --score-icon-margin-left: 2px;
    --score-icon-size: 10px;
    --topbar-height: 28px;
    --topbar-logo-size: 20px;
  }

  /* Not enough space to adequately show the relative savings bars. */
  .lh-sparkline {
    display: none;
  }
}

.lh-vars.lh-devtools {
  --audit-explanation-line-height: 14px;
  --audit-group-margin-bottom: 20px;
  --audit-group-padding-vertical: 12px;
  --audit-padding-vertical: 4px;
  --category-padding: 12px;
  --default-padding: 12px;
  --env-name-min-width: 120px;
  --footer-padding-vertical: 8px;
  --gauge-circle-size-big: 72px;
  --gauge-circle-size: 64px;
  --gauge-label-font-size-big: 22px;
  --gauge-label-font-size: 14px;
  --gauge-label-line-height-big: 26px;
  --gauge-label-line-height: 20px;
  --gauge-percentage-font-size-big: 34px;
  --gauge-percentage-font-size: 26px;
  --gauge-wrapper-width: 97px;
  --header-line-height: 20px;
  --header-padding: 16px 0 16px 0;
  --screenshot-overlay-background: transparent;
  --plugin-icon-size: 75%;
  --pwa-icon-margin: 0 7px 0 -3px;
  --report-font-family-monospace: 'Menlo', 'dejavu sans mono', 'Consolas', 'Lucida Console', monospace;
  --report-font-family: '.SFNSDisplay-Regular', 'Helvetica Neue', 'Lucida Grande', sans-serif;
  --report-font-size: 12px;
  --report-line-height: 20px;
  --score-icon-margin-left: 2px;
  --score-icon-size: 10px;
  --section-padding-vertical: 8px;
}

.lh-container:not(.lh-topbar + .lh-container) {
  --topbar-height: 0;
  --sticky-header-height: 0;
  --sticky-header-buffer: 0;
}

.lh-devtools.lh-root {
  height: 100%;
}
.lh-devtools.lh-root img {
  /* Override devtools default 'min-width: 0' so svg without size in a flexbox isn't collapsed. */
  min-width: auto;
}
.lh-devtools .lh-container {
  overflow-y: scroll;
  height: calc(100% - var(--topbar-height));
  /** The .lh-container is the scroll parent in DevTools so we exclude the topbar from the sticky header buffer. */
  --sticky-header-buffer: calc(var(--sticky-header-height));
}
@media print {
  .lh-devtools .lh-container {
    overflow: unset;
  }
}
.lh-devtools .lh-sticky-header {
  /* This is normally the height of the topbar, but we want it to stick to the top of our scroll container .lh-container\` */
  top: 0;
}
.lh-devtools .lh-element-screenshot__overlay {
  position: absolute;
}

@keyframes fadeIn {
  0% { opacity: 0;}
  100% { opacity: 0.6;}
}

.lh-root *, .lh-root *::before, .lh-root *::after {
  box-sizing: border-box;
}

.lh-root {
  font-family: var(--report-font-family);
  font-size: var(--report-font-size);
  margin: 0;
  line-height: var(--report-line-height);
  background: var(--report-background-color);
  color: var(--report-text-color);
}

.lh-root :focus-visible {
    outline: -webkit-focus-ring-color auto 3px;
}
.lh-root summary:focus {
    outline: none;
    box-shadow: 0 0 0 1px hsl(217, 89%, 61%);
}

.lh-root [hidden] {
  display: none !important;
}

.lh-root pre {
  margin: 0;
}

.lh-root pre,
.lh-root code {
  font-family: var(--report-font-family-monospace);
}

.lh-root details > summary {
  cursor: pointer;
}

.lh-hidden {
  display: none !important;
}

.lh-container {
  /*
  Text wrapping in the report is so much FUN!
  We have a \`word-break: break-word;\` globally here to prevent a few common scenarios, namely
  long non-breakable text (usually URLs) found in:
    1. The footer
    2. .lh-node (outerHTML)
    3. .lh-code

  With that sorted, the next challenge is appropriate column sizing and text wrapping inside our
  .lh-details tables. Even more fun.
    * We don't want table headers ("Potential Savings (ms)") to wrap or their column values, but
    we'd be happy for the URL column to wrap if the URLs are particularly long.
    * We want the narrow columns to remain narrow, providing the most column width for URL
    * We don't want the table to extend past 100% width.
    * Long URLs in the URL column can wrap. Util.getURLDisplayName maxes them out at 64 characters,
      but they do not get any overflow:ellipsis treatment.
  */
  word-break: break-word;
}

.lh-audit-group a,
.lh-category-header__description a,
.lh-audit__description a,
.lh-warnings a,
.lh-footer a,
.lh-table-column--link a {
  color: var(--link-color);
}

.lh-audit__description, .lh-audit__stackpack {
  --inner-audit-padding-right: var(--stackpack-padding-horizontal);
  padding-left: var(--audit-description-padding-left);
  padding-right: var(--inner-audit-padding-right);
  padding-top: 8px;
  padding-bottom: 8px;
}

.lh-details {
  margin-top: var(--default-padding);
  margin-bottom: var(--default-padding);
  margin-left: var(--audit-description-padding-left);
  /* whatever the .lh-details side margins are */
  width: 100%;
}

.lh-audit__stackpack {
  display: flex;
  align-items: center;
}

.lh-audit__stackpack__img {
  max-width: 30px;
  margin-right: var(--default-padding)
}

/* Report header */

.lh-report-icon {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  cursor: pointer;
}
.lh-report-icon[disabled] {
  opacity: 0.3;
  pointer-events: none;
}

.lh-report-icon::before {
  content: "";
  margin: 4px;
  background-repeat: no-repeat;
  width: var(--report-icon-size);
  height: var(--report-icon-size);
  opacity: 0.7;
  display: inline-block;
  vertical-align: middle;
}
.lh-report-icon:hover::before {
  opacity: 1;
}
.lh-dark .lh-report-icon::before {
  filter: invert(1);
}
.lh-report-icon--print::before {
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/><path fill="none" d="M0 0h24v24H0z"/></svg>');
}
.lh-report-icon--copy::before {
  background-image: url('data:image/svg+xml;utf8,<svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24H0z" fill="none"/><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>');
}
.lh-report-icon--open::before {
  background-image: url('data:image/svg+xml;utf8,<svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24H0z" fill="none"/><path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h4v-2H5V8h14v10h-4v2h4c1.1 0 2-.9 2-2V6c0-1.1-.89-2-2-2zm-7 6l-4 4h3v6h2v-6h3l-4-4z"/></svg>');
}
.lh-report-icon--download::before {
  background-image: url('data:image/svg+xml;utf8,<svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/><path d="M0 0h24v24H0z" fill="none"/></svg>');
}
.lh-report-icon--dark::before {
  background-image:url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 100 125"><path d="M50 23.587c-16.27 0-22.799 12.574-22.799 21.417 0 12.917 10.117 22.451 12.436 32.471h20.726c2.32-10.02 12.436-19.554 12.436-32.471 0-8.843-6.528-21.417-22.799-21.417zM39.637 87.161c0 3.001 1.18 4.181 4.181 4.181h.426l.41 1.231C45.278 94.449 46.042 95 48.019 95h3.963c1.978 0 2.74-.551 3.365-2.427l.409-1.231h.427c3.002 0 4.18-1.18 4.18-4.181V80.91H39.637v6.251zM50 18.265c1.26 0 2.072-.814 2.072-2.073v-9.12C52.072 5.813 51.26 5 50 5c-1.259 0-2.072.813-2.072 2.073v9.12c0 1.259.813 2.072 2.072 2.072zM68.313 23.727c.994.774 2.135.634 2.91-.357l5.614-7.187c.776-.992.636-2.135-.356-2.909-.992-.776-2.135-.636-2.91.357l-5.613 7.186c-.778.993-.636 2.135.355 2.91zM91.157 36.373c-.306-1.222-1.291-1.815-2.513-1.51l-8.85 2.207c-1.222.305-1.814 1.29-1.51 2.512.305 1.223 1.291 1.814 2.513 1.51l8.849-2.206c1.223-.305 1.816-1.291 1.511-2.513zM86.757 60.48l-8.331-3.709c-1.15-.512-2.225-.099-2.736 1.052-.512 1.151-.1 2.224 1.051 2.737l8.33 3.707c1.15.514 2.225.101 2.736-1.05.513-1.149.1-2.223-1.05-2.737zM28.779 23.37c.775.992 1.917 1.131 2.909.357.992-.776 1.132-1.917.357-2.91l-5.615-7.186c-.775-.992-1.917-1.132-2.909-.357s-1.131 1.917-.356 2.909l5.614 7.187zM21.715 39.583c.305-1.223-.288-2.208-1.51-2.513l-8.849-2.207c-1.222-.303-2.208.289-2.513 1.511-.303 1.222.288 2.207 1.511 2.512l8.848 2.206c1.222.304 2.208-.287 2.513-1.509zM21.575 56.771l-8.331 3.711c-1.151.511-1.563 1.586-1.05 2.735.511 1.151 1.586 1.563 2.736 1.052l8.331-3.711c1.151-.511 1.563-1.586 1.05-2.735-.512-1.15-1.585-1.562-2.736-1.052z"/></svg>');
}
.lh-report-icon--treemap::before {
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="black"><path d="M3 5v14h19V5H3zm2 2h15v4H5V7zm0 10v-4h4v4H5zm6 0v-4h9v4h-9z"/></svg>');
}
.lh-report-icon--date::before {
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M7 11h2v2H7v-2zm14-5v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6c0-1.1.9-2 2-2h1V2h2v2h8V2h2v2h1a2 2 0 012 2zM5 8h14V6H5v2zm14 12V10H5v10h14zm-4-7h2v-2h-2v2zm-4 0h2v-2h-2v2z"/></svg>');
}
.lh-report-icon--devices::before {
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 6h18V4H4a2 2 0 00-2 2v11H0v3h14v-3H4V6zm19 2h-6a1 1 0 00-1 1v10c0 .6.5 1 1 1h6c.6 0 1-.5 1-1V9c0-.6-.5-1-1-1zm-1 9h-4v-7h4v7z"/></svg>');
}
.lh-report-icon--world::before {
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm7 6h-3c-.3-1.3-.8-2.5-1.4-3.6A8 8 0 0 1 18.9 8zm-7-4a14 14 0 0 1 2 4h-4a14 14 0 0 1 2-4zM4.3 14a8.2 8.2 0 0 1 0-4h3.3a16.5 16.5 0 0 0 0 4H4.3zm.8 2h3a14 14 0 0 0 1.3 3.6A8 8 0 0 1 5.1 16zm3-8H5a8 8 0 0 1 4.3-3.6L8 8zM12 20a14 14 0 0 1-2-4h4a14 14 0 0 1-2 4zm2.3-6H9.7a14.7 14.7 0 0 1 0-4h4.6a14.6 14.6 0 0 1 0 4zm.3 5.6c.6-1.2 1-2.4 1.4-3.6h3a8 8 0 0 1-4.4 3.6zm1.8-5.6a16.5 16.5 0 0 0 0-4h3.3a8.2 8.2 0 0 1 0 4h-3.3z"/></svg>');
}
.lh-report-icon--stopwatch::before {
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.1-6.6L20.5 6l-1.4-1.4L17.7 6A9 9 0 0 0 3 13a9 9 0 1 0 16-5.6zm-7 12.6a7 7 0 1 1 0-14 7 7 0 0 1 0 14z"/></svg>');
}
.lh-report-icon--networkspeed::before {
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M15.9 5c-.2 0-.3 0-.4.2v.2L10.1 17a2 2 0 0 0-.2 1 2 2 0 0 0 4 .4l2.4-12.9c0-.3-.2-.5-.5-.5zM1 9l2 2c2.9-2.9 6.8-4 10.5-3.6l1.2-2.7C10 3.8 4.7 5.3 1 9zm20 2 2-2a15.4 15.4 0 0 0-5.6-3.6L17 8.2c1.5.7 2.9 1.6 4.1 2.8zm-4 4 2-2a9.9 9.9 0 0 0-2.7-1.9l-.5 3 1.2.9zM5 13l2 2a7.1 7.1 0 0 1 4-2l1.3-2.9C9.7 10.1 7 11 5 13z"/></svg>');
}
.lh-report-icon--samples-one::before {
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="7" cy="14" r="3"/><path d="M7 18a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm4-2a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm5.6 17.6a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>');
}
.lh-report-icon--samples-many::before {
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M7 18a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm4-2a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm5.6 17.6a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/><circle cx="7" cy="14" r="3"/><circle cx="11" cy="6" r="3"/></svg>');
}
.lh-report-icon--chrome::before {
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 562 562"><path d="M256 25.6v25.6a204 204 0 0 1 144.8 60 204 204 0 0 1 60 144.8 204 204 0 0 1-60 144.8 204 204 0 0 1-144.8 60 204 204 0 0 1-144.8-60 204 204 0 0 1-60-144.8 204 204 0 0 1 60-144.8 204 204 0 0 1 144.8-60V0a256 256 0 1 0 0 512 256 256 0 0 0 0-512v25.6z"/><path d="M256 179.2v25.6a51.3 51.3 0 0 1 0 102.4 51.3 51.3 0 0 1 0-102.4v-51.2a102.3 102.3 0 1 0-.1 204.7 102.3 102.3 0 0 0 .1-204.7v25.6z"/><path d="M256 204.8h217.6a25.6 25.6 0 0 0 0-51.2H256a25.6 25.6 0 0 0 0 51.2m44.3 76.8L191.5 470.1a25.6 25.6 0 1 0 44.4 25.6l108.8-188.5a25.6 25.6 0 1 0-44.4-25.6m-88.6 0L102.9 93.2a25.7 25.7 0 0 0-35-9.4 25.7 25.7 0 0 0-9.4 35l108.8 188.5a25.7 25.7 0 0 0 35 9.4 25.9 25.9 0 0 0 9.4-35.1"/></svg>');
}
.lh-report-icon--external::before {
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"><path d="M3.15 11.9a1.01 1.01 0 0 1-.743-.307 1.01 1.01 0 0 1-.306-.743v-7.7c0-.292.102-.54.306-.744a1.01 1.01 0 0 1 .744-.306H7v1.05H3.15v7.7h7.7V7h1.05v3.85c0 .291-.103.54-.307.743a1.01 1.01 0 0 1-.743.307h-7.7Zm2.494-2.8-.743-.744 5.206-5.206H8.401V2.1h3.5v3.5h-1.05V3.893L5.644 9.1Z"/></svg>');
}

.lh-buttons {
  display: flex;
  flex-wrap: wrap;
  margin: var(--default-padding) 0;
}
.lh-button {
  height: 32px;
  border: 1px solid var(--report-border-color-secondary);
  border-radius: 3px;
  color: var(--link-color);
  background-color: var(--report-background-color);
  margin: 5px;
}

.lh-button:first-of-type {
  margin-left: 0;
}

/* Node */
.lh-node__snippet {
  font-family: var(--report-font-family-monospace);
  color: var(--snippet-color);
  font-size: var(--report-monospace-font-size);
  line-height: 20px;
}

/* Score */

.lh-audit__score-icon {
  width: var(--score-icon-size);
  height: var(--score-icon-size);
  margin: var(--score-icon-margin);
}

.lh-audit--pass .lh-audit__display-text {
  color: var(--color-pass-secondary);
}
.lh-audit--pass .lh-audit__score-icon,
.lh-scorescale-range--pass::before {
  border-radius: 100%;
  background: var(--color-pass);
}

.lh-audit--average .lh-audit__display-text {
  color: var(--color-average-secondary);
}
.lh-audit--average .lh-audit__score-icon,
.lh-scorescale-range--average::before {
  background: var(--color-average);
  width: var(--icon-square-size);
  height: var(--icon-square-size);
}

.lh-audit--fail .lh-audit__display-text {
  color: var(--color-fail-secondary);
}
.lh-audit--fail .lh-audit__score-icon,
.lh-audit--error .lh-audit__score-icon,
.lh-scorescale-range--fail::before {
  border-left: calc(var(--score-icon-size) / 2) solid transparent;
  border-right: calc(var(--score-icon-size) / 2) solid transparent;
  border-bottom: var(--score-icon-size) solid var(--color-fail);
}

.lh-audit--error .lh-audit__score-icon,
.lh-metric--error .lh-metric__icon {
  background-image: var(--error-icon-url);
  background-repeat: no-repeat;
  background-position: center;
  border: none;
}

.lh-gauge__wrapper--fail .lh-gauge--error {
  background-image: var(--error-icon-url);
  background-repeat: no-repeat;
  background-position: center;
  transform: scale(0.5);
  top: var(--score-container-padding);
}

.lh-audit--manual .lh-audit__display-text,
.lh-audit--notapplicable .lh-audit__display-text {
  color: var(--color-gray-600);
}
.lh-audit--manual .lh-audit__score-icon,
.lh-audit--notapplicable .lh-audit__score-icon {
  border: calc(0.2 * var(--score-icon-size)) solid var(--color-gray-400);
  border-radius: 100%;
  background: none;
}

.lh-audit--informative .lh-audit__display-text {
  color: var(--color-gray-600);
}

.lh-audit--informative .lh-audit__score-icon {
  border: calc(0.2 * var(--score-icon-size)) solid var(--color-gray-400);
  border-radius: 100%;
}

.lh-audit__description,
.lh-audit__stackpack {
  color: var(--report-text-color-secondary);
}
.lh-audit__adorn {
  border: 1px solid var(--color-gray-500);
  border-radius: 3px;
  margin: 0 3px;
  padding: 0 2px;
  line-height: 1.1;
  display: inline-block;
  font-size: 90%;
  color: var(--report-text-color-secondary);
}

.lh-category-header__description  {
  text-align: center;
  color: var(--color-gray-700);
  margin: 0px auto;
  max-width: 400px;
}


.lh-audit__display-text,
.lh-load-opportunity__sparkline,
.lh-chevron-container {
  margin: 0 var(--audit-margin-horizontal);
}
.lh-chevron-container {
  margin-right: 0;
}

.lh-audit__title-and-text {
  flex: 1;
}

.lh-audit__title-and-text code {
  color: var(--snippet-color);
  font-size: var(--report-monospace-font-size);
}

/* Prepend display text with em dash separator. But not in Opportunities. */
.lh-audit__display-text:not(:empty):before {
  content: '\u2014';
  margin-right: var(--audit-margin-horizontal);
}
.lh-audit-group.lh-audit-group--load-opportunities .lh-audit__display-text:not(:empty):before {
  display: none;
}

/* Expandable Details (Audit Groups, Audits) */
.lh-audit__header {
  display: flex;
  align-items: center;
  padding: var(--default-padding);
}

.lh-audit--load-opportunity .lh-audit__header {
  display: block;
}


.lh-metricfilter {
  display: grid;
  justify-content: end;
  align-items: center;
  grid-auto-flow: column;
  gap: 4px;
  color: var(--color-gray-700);
}

.lh-metricfilter__radio {
  /*
   * Instead of hiding, position offscreen so it's still accessible to screen readers
   * https://bugs.chromium.org/p/chromium/issues/detail?id=1439785
   */
  position: fixed;
  left: -9999px;
}
.lh-metricfilter input[type='radio']:focus-visible + label {
  outline: -webkit-focus-ring-color auto 1px;
}

.lh-metricfilter__label {
  display: inline-flex;
  padding: 0 4px;
  height: 16px;
  text-decoration: underline;
  align-items: center;
  cursor: pointer;
  font-size: 90%;
}

.lh-metricfilter__label--active {
  background: var(--color-blue-primary);
  color: var(--color-white);
  border-radius: 3px;
  text-decoration: none;
}
/* Give the 'All' choice a more muted display */
.lh-metricfilter__label--active[for="metric-All"] {
  background-color: var(--color-blue-200) !important;
  color: black !important;
}

.lh-metricfilter__text {
  margin-right: 8px;
}

/* If audits are filtered, hide the itemcount for Passed Audits\u2026 */
.lh-category--filtered .lh-audit-group .lh-audit-group__itemcount {
  display: none;
}


.lh-audit__header:hover {
  background-color: var(--color-hover);
}

/* We want to hide the browser's default arrow marker on summary elements. Admittedly, it's complicated. */
.lh-root details > summary {
  /* Blink 89+ and Firefox will hide the arrow when display is changed from (new) default of \`list-item\` to block.  https://chromestatus.com/feature/6730096436051968*/
  display: block;
}
/* Safari and Blink <=88 require using the -webkit-details-marker selector */
.lh-root details > summary::-webkit-details-marker {
  display: none;
}

/* Perf Metric */

.lh-metrics-container {
  display: grid;
  grid-auto-rows: 1fr;
  grid-template-columns: 1fr 1fr;
  grid-column-gap: var(--report-line-height);
  margin-bottom: var(--default-padding);
}

.lh-metric {
  border-top: 1px solid var(--report-border-color-secondary);
}

.lh-category:not(.lh--hoisted-meta) .lh-metric:nth-last-child(-n+2) {
  border-bottom: 1px solid var(--report-border-color-secondary);
}

.lh-metric__innerwrap {
  display: grid;
  /**
   * Icon -- Metric Name
   *      -- Metric Value
   */
  grid-template-columns: calc(var(--score-icon-size) + var(--score-icon-margin-left) + var(--score-icon-margin-right)) 1fr;
  align-items: center;
  padding: var(--default-padding);
}

.lh-metric__details {
  order: -1;
}

.lh-metric__title {
  flex: 1;
}

.lh-calclink {
  padding-left: calc(1ex / 3);
}

.lh-metric__description {
  display: none;
  grid-column-start: 2;
  grid-column-end: 4;
  color: var(--report-text-color-secondary);
}

.lh-metric__value {
  font-size: var(--metric-value-font-size);
  margin: calc(var(--default-padding) / 2) 0;
  white-space: nowrap; /* No wrapping between metric value and the icon */
  grid-column-start: 2;
}


@media screen and (max-width: 535px) {
  .lh-metrics-container {
    display: block;
  }

  .lh-metric {
    border-bottom: none !important;
  }
  .lh-category:not(.lh--hoisted-meta) .lh-metric:nth-last-child(1) {
    border-bottom: 1px solid var(--report-border-color-secondary) !important;
  }

  /* Change the grid to 3 columns for narrow viewport. */
  .lh-metric__innerwrap {
  /**
   * Icon -- Metric Name -- Metric Value
   */
    grid-template-columns: calc(var(--score-icon-size) + var(--score-icon-margin-left) + var(--score-icon-margin-right)) 2fr 1fr;
  }
  .lh-metric__value {
    justify-self: end;
    grid-column-start: unset;
  }
}

/* No-JS toggle switch */
/* Keep this selector sync'd w/ \`magicSelector\` in report-ui-features-test.js */
 .lh-metrics-toggle__input:checked ~ .lh-metrics-container .lh-metric__description {
  display: block;
}

/* TODO get rid of the SVGS and clean up these some more */
.lh-metrics-toggle__input {
  opacity: 0;
  position: absolute;
  right: 0;
  top: 0px;
}

.lh-metrics-toggle__input + div > label > .lh-metrics-toggle__labeltext--hide,
.lh-metrics-toggle__input:checked + div > label > .lh-metrics-toggle__labeltext--show {
  display: none;
}
.lh-metrics-toggle__input:checked + div > label > .lh-metrics-toggle__labeltext--hide {
  display: inline;
}
.lh-metrics-toggle__input:focus + div > label {
  outline: -webkit-focus-ring-color auto 3px;
}

.lh-metrics-toggle__label {
  cursor: pointer;
  font-size: var(--report-font-size-secondary);
  line-height: var(--report-line-height-secondary);
  color: var(--color-gray-700);
}

/* Pushes the metric description toggle button to the right. */
.lh-audit-group--metrics .lh-audit-group__header {
  display: flex;
  justify-content: space-between;
}

.lh-metric__icon,
.lh-scorescale-range::before {
  content: '';
  width: var(--score-icon-size);
  height: var(--score-icon-size);
  display: inline-block;
  margin: var(--score-icon-margin);
}

.lh-metric--pass .lh-metric__value {
  color: var(--color-pass-secondary);
}
.lh-metric--pass .lh-metric__icon {
  border-radius: 100%;
  background: var(--color-pass);
}

.lh-metric--average .lh-metric__value {
  color: var(--color-average-secondary);
}
.lh-metric--average .lh-metric__icon {
  background: var(--color-average);
  width: var(--icon-square-size);
  height: var(--icon-square-size);
}

.lh-metric--fail .lh-metric__value {
  color: var(--color-fail-secondary);
}
.lh-metric--fail .lh-metric__icon {
  border-left: calc(var(--score-icon-size) / 2) solid transparent;
  border-right: calc(var(--score-icon-size) / 2) solid transparent;
  border-bottom: var(--score-icon-size) solid var(--color-fail);
}

.lh-metric--error .lh-metric__value,
.lh-metric--error .lh-metric__description {
  color: var(--color-fail-secondary);
}

/* Perf load opportunity */

.lh-load-opportunity__cols {
  display: flex;
  align-items: flex-start;
}

.lh-load-opportunity__header .lh-load-opportunity__col {
  color: var(--color-gray-600);
  display: unset;
  line-height: calc(2.3 * var(--report-font-size));
}

.lh-load-opportunity__col {
  display: flex;
}

.lh-load-opportunity__col--one {
  flex: 5;
  align-items: center;
  margin-right: 2px;
}
.lh-load-opportunity__col--two {
  flex: 4;
  text-align: right;
}

.lh-audit--load-opportunity .lh-audit__display-text {
  text-align: right;
  flex: 0 0 7.5ch;
}


/* Sparkline */

.lh-load-opportunity__sparkline {
  flex: 1;
  margin-top: calc((var(--report-line-height) - var(--sparkline-height)) / 2);
}

.lh-sparkline {
  height: var(--sparkline-height);
  width: 100%;
}

.lh-sparkline__bar {
  height: 100%;
  float: right;
}

.lh-audit--pass .lh-sparkline__bar {
  background: var(--color-pass);
}

.lh-audit--average .lh-sparkline__bar {
  background: var(--color-average);
}

.lh-audit--fail .lh-sparkline__bar {
  background: var(--color-fail);
}

/* Filmstrip */

.lh-filmstrip-container {
  /* smaller gap between metrics and filmstrip */
  margin: -8px auto 0 auto;
}

.lh-filmstrip {
  display: grid;
  justify-content: space-between;
  padding-bottom: var(--default-padding);
  width: 100%;
  grid-template-columns: repeat(auto-fit, 90px);
}

.lh-filmstrip__frame {
  text-align: right;
  position: relative;
}

.lh-filmstrip__thumbnail {
  border: 1px solid var(--report-border-color-secondary);
  max-height: 150px;
  max-width: 120px;
}

/* Audit */

.lh-audit {
  border-bottom: 1px solid var(--report-border-color-secondary);
}

/* Apply border-top to just the first audit. */
.lh-audit {
  border-top: 1px solid var(--report-border-color-secondary);
}
.lh-audit ~ .lh-audit {
  border-top: none;
}


.lh-audit--error .lh-audit__display-text {
  color: var(--color-fail-secondary);
}

/* Audit Group */

.lh-audit-group {
  margin-bottom: var(--audit-group-margin-bottom);
  position: relative;
}
.lh-audit-group--metrics {
  margin-bottom: calc(var(--audit-group-margin-bottom) / 2);
}

.lh-audit-group__header::before {
  /* By default, groups don't get an icon */
  content: none;
  width: var(--pwa-icon-size);
  height: var(--pwa-icon-size);
  margin: var(--pwa-icon-margin);
  display: inline-block;
  vertical-align: middle;
}

/* Style the "over budget" columns red. */
.lh-audit-group--budgets #performance-budget tbody tr td:nth-child(4),
.lh-audit-group--budgets #performance-budget tbody tr td:nth-child(5),
.lh-audit-group--budgets #timing-budget tbody tr td:nth-child(3) {
  color: var(--color-red-700);
}

/* Align the "over budget request count" text to be close to the "over budget bytes" column. */
.lh-audit-group--budgets .lh-table tbody tr td:nth-child(4){
  text-align: right;
}

.lh-audit-group--budgets .lh-details--budget {
  width: 100%;
  margin: 0 0 var(--default-padding);
}

.lh-audit-group--pwa-installable .lh-audit-group__header::before {
  content: '';
  background-image: var(--pwa-installable-gray-url);
}
.lh-audit-group--pwa-optimized .lh-audit-group__header::before {
  content: '';
  background-image: var(--pwa-optimized-gray-url);
}
.lh-audit-group--pwa-installable.lh-badged .lh-audit-group__header::before {
  background-image: var(--pwa-installable-color-url);
}
.lh-audit-group--pwa-optimized.lh-badged .lh-audit-group__header::before {
  background-image: var(--pwa-optimized-color-url);
}

.lh-audit-group--metrics .lh-audit-group__summary {
  margin-top: 0;
  margin-bottom: 0;
}

.lh-audit-group__summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.lh-audit-group__header .lh-chevron {
  margin-top: calc((var(--report-line-height) - 5px) / 2);
}

.lh-audit-group__header {
  letter-spacing: 0.8px;
  padding: var(--default-padding);
  padding-left: 0;
}

.lh-audit-group__header, .lh-audit-group__summary {
  font-size: var(--report-font-size-secondary);
  line-height: var(--report-line-height-secondary);
  color: var(--color-gray-700);
}

.lh-audit-group__title {
  text-transform: uppercase;
  font-weight: 500;
}

.lh-audit-group__itemcount {
  color: var(--color-gray-600);
}

.lh-audit-group__footer {
  color: var(--color-gray-600);
  display: block;
  margin-top: var(--default-padding);
}

.lh-details,
.lh-category-header__description,
.lh-load-opportunity__header,
.lh-audit-group__footer {
  font-size: var(--report-font-size-secondary);
  line-height: var(--report-line-height-secondary);
}

.lh-audit-explanation {
  margin: var(--audit-padding-vertical) 0 calc(var(--audit-padding-vertical) / 2) var(--audit-margin-horizontal);
  line-height: var(--audit-explanation-line-height);
  display: inline-block;
}

.lh-audit--fail .lh-audit-explanation {
  color: var(--color-fail-secondary);
}

/* Report */
.lh-list > :not(:last-child) {
  margin-bottom: calc(var(--default-padding) * 2);
}

.lh-header-container {
  display: block;
  margin: 0 auto;
  position: relative;
  word-wrap: break-word;
}

.lh-header-container .lh-scores-wrapper {
  border-bottom: 1px solid var(--color-gray-200);
}


.lh-report {
  min-width: var(--report-content-min-width);
}

.lh-exception {
  font-size: large;
}

.lh-code {
  white-space: normal;
  margin-top: 0;
  font-size: var(--report-monospace-font-size);
}

.lh-warnings {
  --item-margin: calc(var(--report-line-height) / 6);
  color: var(--color-average-secondary);
  margin: var(--audit-padding-vertical) 0;
  padding: var(--default-padding)
    var(--default-padding)
    var(--default-padding)
    calc(var(--audit-description-padding-left));
  background-color: var(--toplevel-warning-background-color);
}
.lh-warnings span {
  font-weight: bold;
}

.lh-warnings--toplevel {
  --item-margin: calc(var(--header-line-height) / 4);
  color: var(--toplevel-warning-text-color);
  margin-left: auto;
  margin-right: auto;
  max-width: var(--report-content-max-width-minus-edge-gap);
  padding: var(--toplevel-warning-padding);
  border-radius: 8px;
}

.lh-warnings__msg {
  color: var(--toplevel-warning-message-text-color);
  margin: 0;
}

.lh-warnings ul {
  margin: 0;
}
.lh-warnings li {
  margin: var(--item-margin) 0;
}
.lh-warnings li:last-of-type {
  margin-bottom: 0;
}

.lh-scores-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}
.lh-scores-header__solo {
  padding: 0;
  border: 0;
}

/* Gauge */

.lh-gauge__wrapper--pass {
  color: var(--color-pass-secondary);
  fill: var(--color-pass);
  stroke: var(--color-pass);
}

.lh-gauge__wrapper--average {
  color: var(--color-average-secondary);
  fill: var(--color-average);
  stroke: var(--color-average);
}

.lh-gauge__wrapper--fail {
  color: var(--color-fail-secondary);
  fill: var(--color-fail);
  stroke: var(--color-fail);
}

.lh-gauge__wrapper--not-applicable {
  color: var(--color-not-applicable);
  fill: var(--color-not-applicable);
  stroke: var(--color-not-applicable);
}

.lh-fraction__wrapper .lh-fraction__content::before {
  content: '';
  height: var(--score-icon-size);
  width: var(--score-icon-size);
  margin: var(--score-icon-margin);
  display: inline-block;
}
.lh-fraction__wrapper--pass .lh-fraction__content {
  color: var(--color-pass-secondary);
}
.lh-fraction__wrapper--pass .lh-fraction__background {
  background-color: var(--color-pass);
}
.lh-fraction__wrapper--pass .lh-fraction__content::before {
  background-color: var(--color-pass);
  border-radius: 50%;
}
.lh-fraction__wrapper--average .lh-fraction__content {
  color: var(--color-average-secondary);
}
.lh-fraction__wrapper--average .lh-fraction__background,
.lh-fraction__wrapper--average .lh-fraction__content::before {
  background-color: var(--color-average);
}
.lh-fraction__wrapper--fail .lh-fraction__content {
  color: var(--color-fail);
}
.lh-fraction__wrapper--fail .lh-fraction__background {
  background-color: var(--color-fail);
}
.lh-fraction__wrapper--fail .lh-fraction__content::before {
  border-left: calc(var(--score-icon-size) / 2) solid transparent;
  border-right: calc(var(--score-icon-size) / 2) solid transparent;
  border-bottom: var(--score-icon-size) solid var(--color-fail);
}
.lh-fraction__wrapper--null .lh-fraction__content {
  color: var(--color-gray-700);
}
.lh-fraction__wrapper--null .lh-fraction__background {
  background-color: var(--color-gray-700);
}
.lh-fraction__wrapper--null .lh-fraction__content::before {
  border-radius: 50%;
  border: calc(0.2 * var(--score-icon-size)) solid var(--color-gray-700);
}

.lh-fraction__background {
  position: absolute;
  height: 100%;
  width: 100%;
  border-radius: calc(var(--gauge-circle-size) / 2);
  opacity: 0.1;
  z-index: -1;
}

.lh-fraction__content-wrapper {
  height: var(--gauge-circle-size);
  display: flex;
  align-items: center;
}

.lh-fraction__content {
  display: flex;
  position: relative;
  align-items: center;
  justify-content: center;
  font-size: calc(0.3 * var(--gauge-circle-size));
  line-height: calc(0.4 * var(--gauge-circle-size));
  width: max-content;
  min-width: calc(1.5 * var(--gauge-circle-size));
  padding: calc(0.1 * var(--gauge-circle-size)) calc(0.2 * var(--gauge-circle-size));
  --score-icon-size: calc(0.21 * var(--gauge-circle-size));
  --score-icon-margin: 0 calc(0.15 * var(--gauge-circle-size)) 0 0;
}

.lh-gauge {
  stroke-linecap: round;
  width: var(--gauge-circle-size);
  height: var(--gauge-circle-size);
}

.lh-category .lh-gauge {
  --gauge-circle-size: var(--gauge-circle-size-big);
}

.lh-gauge-base {
  opacity: 0.1;
}

.lh-gauge-arc {
  fill: none;
  transform-origin: 50% 50%;
  animation: load-gauge var(--transition-length) ease both;
  animation-delay: 250ms;
}

.lh-gauge__svg-wrapper {
  position: relative;
  height: var(--gauge-circle-size);
}
.lh-category .lh-gauge__svg-wrapper,
.lh-category .lh-fraction__wrapper {
  --gauge-circle-size: var(--gauge-circle-size-big);
}

/* The plugin badge overlay */
.lh-gauge__wrapper--plugin .lh-gauge__svg-wrapper::before {
  width: var(--plugin-badge-size);
  height: var(--plugin-badge-size);
  background-color: var(--plugin-badge-background-color);
  background-image: var(--plugin-icon-url);
  background-repeat: no-repeat;
  background-size: var(--plugin-icon-size);
  background-position: 58% 50%;
  content: "";
  position: absolute;
  right: -6px;
  bottom: 0px;
  display: block;
  z-index: 100;
  box-shadow: 0 0 4px rgba(0,0,0,.2);
  border-radius: 25%;
}
.lh-category .lh-gauge__wrapper--plugin .lh-gauge__svg-wrapper::before {
  width: var(--plugin-badge-size-big);
  height: var(--plugin-badge-size-big);
}

@keyframes load-gauge {
  from { stroke-dasharray: 0 352; }
}

.lh-gauge__percentage {
  width: 100%;
  height: var(--gauge-circle-size);
  position: absolute;
  font-family: var(--report-font-family-monospace);
  font-size: calc(var(--gauge-circle-size) * 0.34 + 1.3px);
  line-height: 0;
  text-align: center;
  top: calc(var(--score-container-padding) + var(--gauge-circle-size) / 2);
}

.lh-category .lh-gauge__percentage {
  --gauge-circle-size: var(--gauge-circle-size-big);
  --gauge-percentage-font-size: var(--gauge-percentage-font-size-big);
}

.lh-gauge__wrapper,
.lh-fraction__wrapper {
  position: relative;
  display: flex;
  align-items: center;
  flex-direction: column;
  text-decoration: none;
  padding: var(--score-container-padding);

  --transition-length: 1s;

  /* Contain the layout style paint & layers during animation*/
  contain: content;
  will-change: opacity; /* Only using for layer promotion */
}

.lh-gauge__label,
.lh-fraction__label {
  font-size: var(--gauge-label-font-size);
  font-weight: 500;
  line-height: var(--gauge-label-line-height);
  margin-top: 10px;
  text-align: center;
  color: var(--report-text-color);
  word-break: keep-all;
}

/* TODO(#8185) use more BEM (.lh-gauge__label--big) instead of relying on descendant selector */
.lh-category .lh-gauge__label,
.lh-category .lh-fraction__label {
  --gauge-label-font-size: var(--gauge-label-font-size-big);
  --gauge-label-line-height: var(--gauge-label-line-height-big);
  margin-top: 14px;
}

.lh-scores-header .lh-gauge__wrapper,
.lh-scores-header .lh-fraction__wrapper,
.lh-scores-header .lh-gauge--pwa__wrapper,
.lh-sticky-header .lh-gauge__wrapper,
.lh-sticky-header .lh-fraction__wrapper,
.lh-sticky-header .lh-gauge--pwa__wrapper {
  width: var(--gauge-wrapper-width);
}

.lh-scorescale {
  display: inline-flex;

  gap: calc(var(--default-padding) * 4);
  margin: 16px auto 0 auto;
  font-size: var(--report-font-size-secondary);
  color: var(--color-gray-700);

}

.lh-scorescale-range {
  display: flex;
  align-items: center;
  font-family: var(--report-font-family-monospace);
  white-space: nowrap;
}

.lh-category-header__finalscreenshot .lh-scorescale {
  border: 0;
  display: flex;
  justify-content: center;
}

.lh-category-header__finalscreenshot .lh-scorescale-range {
  font-family: unset;
  font-size: 12px;
}

.lh-scorescale-wrap {
  display: contents;
}

/* Hide category score gauages if it's a single category report */
.lh-header--solo-category .lh-scores-wrapper {
  display: none;
}


.lh-categories {
  width: 100%;
}

.lh-category {
  padding: var(--category-padding);
  max-width: var(--report-content-max-width);
  margin: 0 auto;

  scroll-margin-top: var(--sticky-header-buffer);
}

.lh-category-wrapper {
  border-bottom: 1px solid var(--color-gray-200);
}
.lh-category-wrapper:last-of-type {
  border-bottom: 0;
}

.lh-category-header {
  margin-bottom: var(--section-padding-vertical);
}

.lh-category-header .lh-score__gauge {
  max-width: 400px;
  width: auto;
  margin: 0px auto;
}

.lh-category-header__finalscreenshot {
  display: grid;
  grid-template: none / 1fr 1px 1fr;
  justify-items: center;
  align-items: center;
  gap: var(--report-line-height);
  min-height: 288px;
  margin-bottom: var(--default-padding);
}

.lh-final-ss-image {
  /* constrain the size of the image to not be too large */
  max-height: calc(var(--gauge-circle-size-big) * 2.8);
  max-width: calc(var(--gauge-circle-size-big) * 3.5);
  border: 1px solid var(--color-gray-200);
  padding: 4px;
  border-radius: 3px;
  display: block;
}

.lh-category-headercol--separator {
  background: var(--color-gray-200);
  width: 1px;
  height: var(--gauge-circle-size-big);
}

@media screen and (max-width: 780px) {
  .lh-category-header__finalscreenshot {
    grid-template: 1fr 1fr / none
  }
  .lh-category-headercol--separator {
    display: none;
  }
}


/* 964 fits the min-width of the filmstrip */
@media screen and (max-width: 964px) {
  .lh-report {
    margin-left: 0;
    width: 100%;
  }
}

@media print {
  body {
    -webkit-print-color-adjust: exact; /* print background colors */
  }
  .lh-container {
    display: block;
  }
  .lh-report {
    margin-left: 0;
    padding-top: 0;
  }
  .lh-categories {
    margin-top: 0;
  }
}

.lh-table {
  position: relative;
  border-collapse: separate;
  border-spacing: 0;
  /* Can't assign padding to table, so shorten the width instead. */
  width: calc(100% - var(--audit-description-padding-left) - var(--stackpack-padding-horizontal));
  border: 1px solid var(--report-border-color-secondary);
}

.lh-table thead th {
  position: sticky;
  top: calc(var(--sticky-header-buffer) + 1em);
  z-index: 1;
  background-color: var(--report-background-color);
  border-bottom: 1px solid var(--report-border-color-secondary);
  font-weight: normal;
  color: var(--color-gray-600);
  /* See text-wrapping comment on .lh-container. */
  word-break: normal;
}

.lh-row--group {
  background-color: var(--table-group-header-background-color);
}

.lh-row--group td {
  font-weight: bold;
  font-size: 1.05em;
  color: var(--table-group-header-text-color);
}

.lh-row--group td:first-child {
  font-weight: normal;
}

.lh-row--group .lh-text {
  color: inherit;
  text-decoration: none;
  display: inline-block;
}

.lh-row--group a.lh-link:hover {
  text-decoration: underline;
}

.lh-row--group .lh-audit__adorn {
  text-transform: capitalize;
  font-weight: normal;
  padding: 2px 3px 1px 3px;
}

.lh-row--group .lh-audit__adorn1p {
  color: var(--link-color);
  border-color: var(--link-color);
}

.lh-row--group .lh-report-icon--external::before {
  content: "";
  background-repeat: no-repeat;
  width: 14px;
  height: 16px;
  opacity: 0.7;
  display: inline-block;
  vertical-align: middle;
}

.lh-row--group .lh-report-icon--external {
  display: none;
}

.lh-row--group:hover .lh-report-icon--external {
  display: inline-block;
}

.lh-dark .lh-report-icon--external::before {
  filter: invert(1);
}

/** Manages indentation of two-level and three-level nested adjacent rows */

.lh-row--group ~ [data-entity]:not(.lh-row--group) td:first-child {
  padding-left: 20px;
}

.lh-row--group ~ [data-entity]:not(.lh-row--group) ~ .lh-sub-item-row td:first-child {
  padding-left: 40px;
}

.lh-row--even {
  background-color: var(--table-group-header-background-color);
}
.lh-row--hidden {
  display: none;
}

.lh-table th,
.lh-table td {
  padding: var(--default-padding);
}

.lh-table tr {
  vertical-align: middle;
}

.lh-table tr:hover {
  background-color: var(--table-higlight-background-color);
}

/* Looks unnecessary, but mostly for keeping the <th>s left-aligned */
.lh-table-column--text,
.lh-table-column--source-location,
.lh-table-column--url,
/* .lh-table-column--thumbnail, */
/* .lh-table-column--empty,*/
.lh-table-column--code,
.lh-table-column--node {
  text-align: left;
}

.lh-table-column--code {
  min-width: 100px;
}

.lh-table-column--bytes,
.lh-table-column--timespanMs,
.lh-table-column--ms,
.lh-table-column--numeric {
  text-align: right;
  word-break: normal;
}



.lh-table .lh-table-column--thumbnail {
  width: var(--image-preview-size);
}

.lh-table-column--url {
  min-width: 250px;
}

.lh-table-column--text {
  min-width: 80px;
}

/* Keep columns narrow if they follow the URL column */
/* 12% was determined to be a decent narrow width, but wide enough for column headings */
.lh-table-column--url + th.lh-table-column--bytes,
.lh-table-column--url + .lh-table-column--bytes + th.lh-table-column--bytes,
.lh-table-column--url + .lh-table-column--ms,
.lh-table-column--url + .lh-table-column--ms + th.lh-table-column--bytes,
.lh-table-column--url + .lh-table-column--bytes + th.lh-table-column--timespanMs {
  width: 12%;
}

.lh-text__url-host {
  display: inline;
}

.lh-text__url-host {
  margin-left: calc(var(--report-font-size) / 2);
  opacity: 0.6;
  font-size: 90%
}

.lh-thumbnail {
  object-fit: cover;
  width: var(--image-preview-size);
  height: var(--image-preview-size);
  display: block;
}

.lh-unknown pre {
  overflow: scroll;
  border: solid 1px var(--color-gray-200);
}

.lh-text__url > a {
  color: inherit;
  text-decoration: none;
}

.lh-text__url > a:hover {
  text-decoration: underline dotted #999;
}

.lh-sub-item-row {
  margin-left: 20px;
  margin-bottom: 0;
  color: var(--color-gray-700);
}

.lh-sub-item-row td {
  padding-top: 4px;
  padding-bottom: 4px;
  padding-left: 20px;
}

/* Chevron
   https://codepen.io/paulirish/pen/LmzEmK
 */
.lh-chevron {
  --chevron-angle: 42deg;
  /* Edge doesn't support transform: rotate(calc(...)), so we define it here */
  --chevron-angle-right: -42deg;
  width: var(--chevron-size);
  height: var(--chevron-size);
  margin-top: calc((var(--report-line-height) - 12px) / 2);
}

.lh-chevron__lines {
  transition: transform 0.4s;
  transform: translateY(var(--report-line-height));
}
.lh-chevron__line {
 stroke: var(--chevron-line-stroke);
 stroke-width: var(--chevron-size);
 stroke-linecap: square;
 transform-origin: 50%;
 transform: rotate(var(--chevron-angle));
 transition: transform 300ms, stroke 300ms;
}

.lh-expandable-details .lh-chevron__line-right,
.lh-expandable-details[open] .lh-chevron__line-left {
 transform: rotate(var(--chevron-angle-right));
}

.lh-expandable-details[open] .lh-chevron__line-right {
  transform: rotate(var(--chevron-angle));
}


.lh-expandable-details[open]  .lh-chevron__lines {
 transform: translateY(calc(var(--chevron-size) * -1));
}

.lh-expandable-details[open] {
  animation: 300ms openDetails forwards;
  padding-bottom: var(--default-padding);
}

@keyframes openDetails {
  from {
    outline: 1px solid var(--report-background-color);
  }
  to {
   outline: 1px solid;
   box-shadow: 0 2px 4px rgba(0, 0, 0, .24);
  }
}

@media screen and (max-width: 780px) {
  /* no black outline if we're not confident the entire table can be displayed within bounds */
  .lh-expandable-details[open] {
    animation: none;
  }
}

.lh-expandable-details[open] summary, details.lh-clump > summary {
  border-bottom: 1px solid var(--report-border-color-secondary);
}
details.lh-clump[open] > summary {
  border-bottom-width: 0;
}



details .lh-clump-toggletext--hide,
details[open] .lh-clump-toggletext--show { display: none; }
details[open] .lh-clump-toggletext--hide { display: block;}


/* Tooltip */
.lh-tooltip-boundary {
  position: relative;
}

.lh-tooltip {
  position: absolute;
  display: none; /* Don't retain these layers when not needed */
  opacity: 0;
  background: #ffffff;
  white-space: pre-line; /* Render newlines in the text */
  min-width: 246px;
  max-width: 275px;
  padding: 15px;
  border-radius: 5px;
  text-align: initial;
  line-height: 1.4;
}
/* shrink tooltips to not be cutoff on left edge of narrow viewports
   45vw is chosen to be ~= width of the left column of metrics
*/
@media screen and (max-width: 535px) {
  .lh-tooltip {
    min-width: 45vw;
    padding: 3vw;
  }
}

.lh-tooltip-boundary:hover .lh-tooltip {
  display: block;
  animation: fadeInTooltip 250ms;
  animation-fill-mode: forwards;
  animation-delay: 850ms;
  bottom: 100%;
  z-index: 1;
  will-change: opacity;
  right: 0;
  pointer-events: none;
}

.lh-tooltip::before {
  content: "";
  border: solid transparent;
  border-bottom-color: #fff;
  border-width: 10px;
  position: absolute;
  bottom: -20px;
  right: 6px;
  transform: rotate(180deg);
  pointer-events: none;
}

@keyframes fadeInTooltip {
  0% { opacity: 0; }
  75% { opacity: 1; }
  100% { opacity: 1;  filter: drop-shadow(1px 0px 1px #aaa) drop-shadow(0px 2px 4px hsla(206, 6%, 25%, 0.15)); pointer-events: auto; }
}

/* Element screenshot */
.lh-element-screenshot {
  float: left;
  margin-right: 20px;
}
.lh-element-screenshot__content {
  overflow: hidden;
  min-width: 110px;
  display: flex;
  justify-content: center;
  background-color: var(--report-background-color);
}
.lh-element-screenshot__image {
  position: relative;
  /* Set by ElementScreenshotRenderer.installFullPageScreenshotCssVariable */
  background-image: var(--element-screenshot-url);
  outline: 2px solid #777;
  background-color: white;
  background-repeat: no-repeat;
}
.lh-element-screenshot__mask {
  position: absolute;
  background: #555;
  opacity: 0.8;
}
.lh-element-screenshot__element-marker {
  position: absolute;
  outline: 2px solid var(--color-lime-400);
}
.lh-element-screenshot__overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2000; /* .lh-topbar is 1000 */
  background: var(--screenshot-overlay-background);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-out;
}

.lh-element-screenshot__overlay .lh-element-screenshot {
  margin-right: 0; /* clearing margin used in thumbnail case */
  outline: 1px solid var(--color-gray-700);
}

.lh-screenshot-overlay--enabled .lh-element-screenshot {
  cursor: zoom-out;
}
.lh-screenshot-overlay--enabled .lh-node .lh-element-screenshot {
  cursor: zoom-in;
}


.lh-meta__items {
  --meta-icon-size: calc(var(--report-icon-size) * 0.667);
  padding: var(--default-padding);
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  background-color: var(--env-item-background-color);
  border-radius: 3px;
  margin: 0 0 var(--default-padding) 0;
  font-size: 12px;
  column-gap: var(--default-padding);
  color: var(--color-gray-700);
}

.lh-meta__item {
  display: block;
  list-style-type: none;
  position: relative;
  padding: 0 0 0 calc(var(--meta-icon-size) + var(--default-padding) * 2);
  cursor: unset; /* disable pointer cursor from report-icon */
}

.lh-meta__item.lh-tooltip-boundary {
  text-decoration: dotted underline var(--color-gray-500);
  cursor: help;
}

.lh-meta__item.lh-report-icon::before {
  position: absolute;
  left: var(--default-padding);
  width: var(--meta-icon-size);
  height: var(--meta-icon-size);
}

.lh-meta__item.lh-report-icon:hover::before {
  opacity: 0.7;
}

.lh-meta__item .lh-tooltip {
  color: var(--color-gray-800);
}

.lh-meta__item .lh-tooltip::before {
  right: auto; /* Set the tooltip arrow to the leftside */
  left: 6px;
}

/* Change the grid for narrow viewport. */
@media screen and (max-width: 640px) {
  .lh-meta__items {
    grid-template-columns: 1fr 1fr;
  }
}
@media screen and (max-width: 535px) {
  .lh-meta__items {
    display: block;
  }
}


/*# sourceURL=report-styles.css */
`),e.append(t),e}function Pe(o){let e=o.createFragment(),t=o.createElement("style");t.append(`
    .lh-topbar {
      position: sticky;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      height: var(--topbar-height);
      padding: var(--topbar-padding);
      font-size: var(--report-font-size-secondary);
      background-color: var(--topbar-background-color);
      border-bottom: 1px solid var(--color-gray-200);
    }

    .lh-topbar__logo {
      width: var(--topbar-logo-size);
      height: var(--topbar-logo-size);
      user-select: none;
      flex: none;
    }

    .lh-topbar__url {
      margin: var(--topbar-padding);
      text-decoration: none;
      color: var(--report-text-color);
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
    }

    .lh-tools {
      display: flex;
      align-items: center;
      margin-left: auto;
      will-change: transform;
      min-width: var(--report-icon-size);
    }
    .lh-tools__button {
      width: var(--report-icon-size);
      min-width: 24px;
      height: var(--report-icon-size);
      cursor: pointer;
      margin-right: 5px;
      /* This is actually a button element, but we want to style it like a transparent div. */
      display: flex;
      background: none;
      color: inherit;
      border: none;
      padding: 0;
      font: inherit;
      outline: inherit;
    }
    .lh-tools__button svg {
      fill: var(--tools-icon-color);
    }
    .lh-dark .lh-tools__button svg {
      filter: invert(1);
    }
    .lh-tools__button.lh-active + .lh-tools__dropdown {
      opacity: 1;
      clip: rect(-1px, 194px, 270px, -3px);
      visibility: visible;
    }
    .lh-tools__dropdown {
      position: absolute;
      background-color: var(--report-background-color);
      border: 1px solid var(--report-border-color);
      border-radius: 3px;
      padding: calc(var(--default-padding) / 2) 0;
      cursor: pointer;
      top: 36px;
      right: 0;
      box-shadow: 1px 1px 3px #ccc;
      min-width: 125px;
      clip: rect(0, 164px, 0, 0);
      visibility: hidden;
      opacity: 0;
      transition: all 200ms cubic-bezier(0,0,0.2,1);
    }
    .lh-tools__dropdown a {
      color: currentColor;
      text-decoration: none;
      white-space: nowrap;
      padding: 0 6px;
      line-height: 2;
    }
    .lh-tools__dropdown a:hover,
    .lh-tools__dropdown a:focus {
      background-color: var(--color-gray-200);
      outline: none;
    }
    /* save-gist option hidden in report. */
    .lh-tools__dropdown a[data-action='save-gist'] {
      display: none;
    }

    .lh-locale-selector {
      width: 100%;
      color: var(--report-text-color);
      background-color: var(--locale-selector-background-color);
      padding: 2px;
    }
    .lh-tools-locale {
      display: flex;
      align-items: center;
      flex-direction: row-reverse;
    }
    .lh-tools-locale__selector-wrapper {
      transition: opacity 0.15s;
      opacity: 0;
      max-width: 200px;
    }
    .lh-button.lh-tool-locale__button {
      height: var(--topbar-height);
      color: var(--tools-icon-color);
      padding: calc(var(--default-padding) / 2);
    }
    .lh-tool-locale__button.lh-active + .lh-tools-locale__selector-wrapper {
      opacity: 1;
      clip: rect(-1px, 194px, 242px, -3px);
      visibility: visible;
      margin: 0 4px;
    }

    @media screen and (max-width: 964px) {
      .lh-tools__dropdown {
        right: 0;
        left: initial;
      }
    }
    @media print {
      .lh-topbar {
        position: static;
        margin-left: 0;
      }

      .lh-tools__dropdown {
        display: none;
      }
    }
  `),e.append(t);let n=o.createElement("div","lh-topbar"),r=o.createElementNS("http://www.w3.org/2000/svg","svg","lh-topbar__logo");r.setAttribute("role","img"),r.setAttribute("title","Lighthouse logo"),r.setAttribute("fill","none"),r.setAttribute("xmlns","http://www.w3.org/2000/svg"),r.setAttribute("viewBox","0 0 48 48");let i=o.createElementNS("http://www.w3.org/2000/svg","path");i.setAttribute("d","m14 7 10-7 10 7v10h5v7h-5l5 24H9l5-24H9v-7h5V7Z"),i.setAttribute("fill","#F63");let a=o.createElementNS("http://www.w3.org/2000/svg","path");a.setAttribute("d","M31.561 24H14l-1.689 8.105L31.561 24ZM18.983 48H9l1.022-4.907L35.723 32.27l1.663 7.98L18.983 48Z"),a.setAttribute("fill","#FFA385");let l=o.createElementNS("http://www.w3.org/2000/svg","path");l.setAttribute("fill","#FF3"),l.setAttribute("d","M20.5 10h7v7h-7z"),r.append(" ",i," ",a," ",l," ");let s=o.createElement("a","lh-topbar__url");s.setAttribute("href",""),s.setAttribute("target","_blank"),s.setAttribute("rel","noopener");let c=o.createElement("div","lh-tools"),d=o.createElement("div","lh-tools-locale lh-hidden"),p=o.createElement("button","lh-button lh-tool-locale__button");p.setAttribute("id","lh-button__swap-locales"),p.setAttribute("title","Show Language Picker"),p.setAttribute("aria-label","Toggle language picker"),p.setAttribute("aria-haspopup","menu"),p.setAttribute("aria-expanded","false"),p.setAttribute("aria-controls","lh-tools-locale__selector-wrapper");let h=o.createElementNS("http://www.w3.org/2000/svg","svg");h.setAttribute("width","20px"),h.setAttribute("height","20px"),h.setAttribute("viewBox","0 0 24 24"),h.setAttribute("fill","currentColor");let u=o.createElementNS("http://www.w3.org/2000/svg","path");u.setAttribute("d","M0 0h24v24H0V0z"),u.setAttribute("fill","none");let f=o.createElementNS("http://www.w3.org/2000/svg","path");f.setAttribute("d","M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"),h.append(u,f),p.append(" ",h," ");let b=o.createElement("div","lh-tools-locale__selector-wrapper");b.setAttribute("id","lh-tools-locale__selector-wrapper"),b.setAttribute("role","menu"),b.setAttribute("aria-labelledby","lh-button__swap-locales"),b.setAttribute("aria-hidden","true"),b.append(" "," "),d.append(" ",p," ",b," ");let _=o.createElement("button","lh-tools__button");_.setAttribute("id","lh-tools-button"),_.setAttribute("title","Tools menu"),_.setAttribute("aria-label","Toggle report tools menu"),_.setAttribute("aria-haspopup","menu"),_.setAttribute("aria-expanded","false"),_.setAttribute("aria-controls","lh-tools-dropdown");let m=o.createElementNS("http://www.w3.org/2000/svg","svg");m.setAttribute("width","100%"),m.setAttribute("height","100%"),m.setAttribute("viewBox","0 0 24 24");let w=o.createElementNS("http://www.w3.org/2000/svg","path");w.setAttribute("d","M0 0h24v24H0z"),w.setAttribute("fill","none");let v=o.createElementNS("http://www.w3.org/2000/svg","path");v.setAttribute("d","M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"),m.append(" ",w," ",v," "),_.append(" ",m," ");let x=o.createElement("div","lh-tools__dropdown");x.setAttribute("id","lh-tools-dropdown"),x.setAttribute("role","menu"),x.setAttribute("aria-labelledby","lh-tools-button");let E=o.createElement("a","lh-report-icon lh-report-icon--print");E.setAttribute("role","menuitem"),E.setAttribute("tabindex","-1"),E.setAttribute("href","#"),E.setAttribute("data-i18n","dropdownPrintSummary"),E.setAttribute("data-action","print-summary");let A=o.createElement("a","lh-report-icon lh-report-icon--print");A.setAttribute("role","menuitem"),A.setAttribute("tabindex","-1"),A.setAttribute("href","#"),A.setAttribute("data-i18n","dropdownPrintExpanded"),A.setAttribute("data-action","print-expanded");let C=o.createElement("a","lh-report-icon lh-report-icon--copy");C.setAttribute("role","menuitem"),C.setAttribute("tabindex","-1"),C.setAttribute("href","#"),C.setAttribute("data-i18n","dropdownCopyJSON"),C.setAttribute("data-action","copy");let L=o.createElement("a","lh-report-icon lh-report-icon--download lh-hidden");L.setAttribute("role","menuitem"),L.setAttribute("tabindex","-1"),L.setAttribute("href","#"),L.setAttribute("data-i18n","dropdownSaveHTML"),L.setAttribute("data-action","save-html");let S=o.createElement("a","lh-report-icon lh-report-icon--download");S.setAttribute("role","menuitem"),S.setAttribute("tabindex","-1"),S.setAttribute("href","#"),S.setAttribute("data-i18n","dropdownSaveJSON"),S.setAttribute("data-action","save-json");let z=o.createElement("a","lh-report-icon lh-report-icon--open");z.setAttribute("role","menuitem"),z.setAttribute("tabindex","-1"),z.setAttribute("href","#"),z.setAttribute("data-i18n","dropdownViewer"),z.setAttribute("data-action","open-viewer");let M=o.createElement("a","lh-report-icon lh-report-icon--open");M.setAttribute("role","menuitem"),M.setAttribute("tabindex","-1"),M.setAttribute("href","#"),M.setAttribute("data-i18n","dropdownSaveGist"),M.setAttribute("data-action","save-gist");let T=o.createElement("a","lh-report-icon lh-report-icon--open lh-hidden");T.setAttribute("role","menuitem"),T.setAttribute("tabindex","-1"),T.setAttribute("href","#"),T.setAttribute("data-i18n","dropdownViewUnthrottledTrace"),T.setAttribute("data-action","view-unthrottled-trace");let F=o.createElement("a","lh-report-icon lh-report-icon--dark");return F.setAttribute("role","menuitem"),F.setAttribute("tabindex","-1"),F.setAttribute("href","#"),F.setAttribute("data-i18n","dropdownDarkTheme"),F.setAttribute("data-action","toggle-dark"),x.append(" ",E," ",A," ",C," "," ",L," ",S," ",z," ",M," "," ",T," ",F," "),c.append(" ",d," ",_," ",x," "),n.append(" "," ",r," ",s," ",c," "),e.append(n),e}function He(o){let e=o.createFragment(),t=o.createElement("div","lh-warnings lh-warnings--toplevel"),n=o.createElement("p","lh-warnings__msg"),r=o.createElement("ul");return t.append(" ",n," ",r," "),e.append(t),e}function Y(o,e){switch(e){case"3pFilter":return ue(o);case"audit":return ge(o);case"categoryHeader":return me(o);case"chevron":return fe(o);case"clump":return be(o);case"crc":return ve(o);case"crcChain":return _e(o);case"elementScreenshot":return we(o);case"footer":return ye(o);case"fraction":return xe(o);case"gauge":return Ee(o);case"gaugePwa":return ke(o);case"heading":return Ae(o);case"metric":return Se(o);case"opportunity":return Ce(o);case"opportunityHeader":return ze(o);case"scorescale":return Le(o);case"scoresWrapper":return Me(o);case"snippet":return Te(o);case"snippetContent":return Fe(o);case"snippetHeader":return De(o);case"snippetLine":return Re(o);case"styles":return Ne(o);case"topbar":return Pe(o);case"warningsToplevel":return He(o)}throw new Error("unexpected component: "+e)}var I=class{constructor(e,t){this._document=e,this._lighthouseChannel="unknown",this._componentCache=new Map,this.rootEl=t}createElement(e,t){let n=this._document.createElement(e);if(t)for(let r of t.split(/\s+/))r&&n.classList.add(r);return n}createElementNS(e,t,n){let r=this._document.createElementNS(e,t);if(n)for(let i of n.split(/\s+/))i&&r.classList.add(i);return r}createFragment(){return this._document.createDocumentFragment()}createTextNode(e){return this._document.createTextNode(e)}createChildOf(e,t,n){let r=this.createElement(t,n);return e.append(r),r}createComponent(e){let t=this._componentCache.get(e);if(t){let r=t.cloneNode(!0);return this.findAll("style",r).forEach(i=>i.remove()),r}return t=Y(this,e),this._componentCache.set(e,t),t.cloneNode(!0)}clearComponentCache(){this._componentCache.clear()}convertMarkdownLinkSnippets(e,t={}){let n=this.createElement("span");for(let r of k.splitMarkdownLink(e)){let i=r.text.includes("`")?this.convertMarkdownCodeSnippets(r.text):r.text;if(!r.isLink){n.append(i);continue}let a=new URL(r.linkHref);(["https://developers.google.com","https://web.dev","https://developer.chrome.com"].includes(a.origin)||t.alwaysAppendUtmSource)&&(a.searchParams.set("utm_source","lighthouse"),a.searchParams.set("utm_medium",this._lighthouseChannel));let s=this.createElement("a");s.rel="noopener",s.target="_blank",s.append(i),this.safelySetHref(s,a.href),n.append(s)}return n}safelySetHref(e,t){if(t=t||"",t.startsWith("#")){e.href=t;return}let n=["https:","http:"],r;try{r=new URL(t)}catch{}r&&n.includes(r.protocol)&&(e.href=r.href)}safelySetBlobHref(e,t){if(t.type!=="text/html"&&t.type!=="application/json")throw new Error("Unsupported blob type");let n=URL.createObjectURL(t);e.href=n}convertMarkdownCodeSnippets(e){let t=this.createElement("span");for(let n of k.splitMarkdownCodeSpans(e))if(n.isCode){let r=this.createElement("code");r.textContent=n.text,t.append(r)}else t.append(this._document.createTextNode(n.text));return t}setLighthouseChannel(e){this._lighthouseChannel=e}document(){return this._document}isDevTools(){return!!this._document.querySelector(".lh-devtools")}find(e,t){let n=t.querySelector(e);if(n===null)throw new Error(`query ${e} not found`);return n}findAll(e,t){return Array.from(t.querySelectorAll(e))}fireEventOn(e,t=this._document,n){let r=new CustomEvent(e,n?{detail:n}:void 0);t.dispatchEvent(r)}saveFile(e,t){let n=this.createElement("a");n.download=t,this.safelySetBlobHref(n,e),this._document.body.append(n),n.click(),this._document.body.removeChild(n),setTimeout(()=>URL.revokeObjectURL(n.href),500)}};var X=0,g=class o{static i18n=null;static strings={};static reportJson=null;static apply(e){o.strings={...ee,...e.providedStrings},o.i18n=e.i18n,o.reportJson=e.reportJson}static getUniqueSuffix(){return X++}static resetUniqueSuffix(){X=0}};var te="data:image/jpeg;base64,";function ne(o){o.configSettings.locale||(o.configSettings.locale="en"),o.configSettings.formFactor||(o.configSettings.formFactor=o.configSettings.emulatedFormFactor),o.finalDisplayedUrl=k.getFinalDisplayedUrl(o),o.mainDocumentUrl=k.getMainDocumentUrl(o);for(let n of Object.values(o.audits))if((n.scoreDisplayMode==="not_applicable"||n.scoreDisplayMode==="not-applicable")&&(n.scoreDisplayMode="notApplicable"),n.details){if((n.details.type===void 0||n.details.type==="diagnostic")&&(n.details.type="debugdata"),n.details.type==="filmstrip")for(let r of n.details.items)r.data.startsWith(te)||(r.data=te+r.data);if(n.details.type==="table")for(let r of n.details.headings){let{itemType:i,text:a}=r;i!==void 0&&(r.valueType=i,delete r.itemType),a!==void 0&&(r.label=a,delete r.text);let l=r.subItemsHeading?.itemType;r.subItemsHeading&&l!==void 0&&(r.subItemsHeading.valueType=l,delete r.subItemsHeading.itemType)}if(n.id==="third-party-summary"&&(n.details.type==="opportunity"||n.details.type==="table")){let{headings:r,items:i}=n.details;if(r[0].valueType==="link"){r[0].valueType="text";for(let a of i)typeof a.entity=="object"&&a.entity.type==="link"&&(a.entity=a.entity.text);n.details.isEntityGrouped=!0}}}let[e]=o.lighthouseVersion.split(".").map(Number),t=o.categories.performance;if(e<9&&t){o.categoryGroups||(o.categoryGroups={}),o.categoryGroups.hidden={title:""};for(let n of t.auditRefs)n.group?["load-opportunities","diagnostics"].includes(n.group)&&delete n.group:n.group="hidden"}if(o.environment||(o.environment={benchmarkIndex:0,networkUserAgent:o.userAgent,hostUserAgent:o.userAgent}),o.configSettings.screenEmulation||(o.configSettings.screenEmulation={width:-1,height:-1,deviceScaleFactor:-1,mobile:/mobile/i.test(o.environment.hostUserAgent),disabled:!1}),o.i18n||(o.i18n={}),o.audits["full-page-screenshot"]){let n=o.audits["full-page-screenshot"].details;n?o.fullPageScreenshot={screenshot:n.screenshot,nodes:n.nodes}:o.fullPageScreenshot=null,delete o.audits["full-page-screenshot"]}}var R=k.RATINGS,y=class o{static prepareReportResult(e){let t=JSON.parse(JSON.stringify(e));ne(t);for(let r of Object.values(t.audits))r.details&&(r.details.type==="opportunity"||r.details.type==="table")&&!r.details.isEntityGrouped&&t.entities&&o.classifyEntities(t.entities,r.details);if(typeof t.categories!="object")throw new Error("No categories provided.");let n=new Map;for(let r of Object.values(t.categories))r.auditRefs.forEach(i=>{i.relevantAudits&&i.relevantAudits.forEach(a=>{let l=n.get(a)||[];l.push(i),n.set(a,l)})}),r.auditRefs.forEach(i=>{let a=t.audits[i.id];i.result=a,n.has(i.id)&&(i.relevantMetrics=n.get(i.id)),t.stackPacks&&t.stackPacks.forEach(l=>{l.descriptions[i.id]&&(i.stackPacks=i.stackPacks||[],i.stackPacks.push({title:l.title,iconDataURL:l.iconDataURL,description:l.descriptions[i.id]}))})});return t}static getUrlLocatorFn(e){let t=e.find(r=>r.valueType==="url")?.key;if(t&&typeof t=="string")return r=>{let i=r[t];if(typeof i=="string")return i};let n=e.find(r=>r.valueType==="source-location")?.key;if(n)return r=>{let i=r[n];if(typeof i=="object"&&i.type==="source-location")return i.url}}static classifyEntities(e,t){let{items:n,headings:r}=t;if(!n.length||n.some(a=>a.entity))return;let i=o.getUrlLocatorFn(r);if(i)for(let a of n){let l=i(a);if(!l)continue;let s="";try{s=k.parseURL(l).origin}catch{}if(!s)continue;let c=e.find(d=>d.origins.includes(s));c&&(a.entity=c.name)}}static getTableItemSortComparator(e){return(t,n)=>{for(let r of e){let i=t[r],a=n[r];if((typeof i!=typeof a||!["number","string"].includes(typeof i))&&console.warn(`Warning: Attempting to sort unsupported value type: ${r}.`),typeof i=="number"&&typeof a=="number"&&i!==a)return a-i;if(typeof i=="string"&&typeof a=="string"&&i!==a)return i.localeCompare(a)}return 0}}static getEmulationDescriptions(e){let t,n,r,i=e.throttling,a=g.i18n,l=g.strings;switch(e.throttlingMethod){case"provided":r=n=t=l.throttlingProvided;break;case"devtools":{let{cpuSlowdownMultiplier:h,requestLatencyMs:u}=i;t=`${a.formatNumber(h)}x slowdown (DevTools)`,n=`${a.formatMilliseconds(u)} HTTP RTT, ${a.formatKbps(i.downloadThroughputKbps)} down, ${a.formatKbps(i.uploadThroughputKbps)} up (DevTools)`,r=(()=>u===150*3.75&&i.downloadThroughputKbps===1.6*1024*.9&&i.uploadThroughputKbps===750*.9)()?l.runtimeSlow4g:l.runtimeCustom;break}case"simulate":{let{cpuSlowdownMultiplier:h,rttMs:u,throughputKbps:f}=i;t=`${a.formatNumber(h)}x slowdown (Simulated)`,n=`${a.formatMilliseconds(u)} TCP RTT, ${a.formatKbps(f)} throughput (Simulated)`,r=(()=>u===150&&f===1.6*1024)()?l.runtimeSlow4g:l.runtimeCustom;break}default:r=t=n=l.runtimeUnknown}let s=e.channel==="devtools"?!1:e.screenEmulation.disabled,c=e.channel==="devtools"?e.formFactor==="mobile":e.screenEmulation.mobile,d=l.runtimeMobileEmulation;s?d=l.runtimeNoEmulation:c||(d=l.runtimeDesktopEmulation);let p=s?void 0:`${e.screenEmulation.width}x${e.screenEmulation.height}, DPR ${e.screenEmulation.deviceScaleFactor}`;return{deviceEmulation:d,screenEmulation:p,cpuThrottling:t,networkThrottling:n,summary:r}}static showAsPassed(e){switch(e.scoreDisplayMode){case"manual":case"notApplicable":return!0;case"error":case"informative":return!1;case"numeric":case"binary":default:return Number(e.score)>=R.PASS.minScore}}static calculateRating(e,t){if(t==="manual"||t==="notApplicable")return R.PASS.label;if(t==="error")return R.ERROR.label;if(e===null)return R.FAIL.label;let n=R.FAIL.label;return e>=R.PASS.minScore?n=R.PASS.label:e>=R.AVERAGE.minScore&&(n=R.AVERAGE.label),n}static calculateCategoryFraction(e){let t=0,n=0,r=0,i=0;for(let a of e.auditRefs){let l=o.showAsPassed(a.result);if(!(a.group==="hidden"||a.result.scoreDisplayMode==="manual"||a.result.scoreDisplayMode==="notApplicable")){if(a.result.scoreDisplayMode==="informative"){l||++r;continue}++t,i+=a.weight,l&&n++}}return{numPassed:n,numPassableAudits:t,numInformative:r,totalWeight:i}}static isPluginCategory(e){return e.startsWith("lighthouse-plugin-")}static shouldDisplayAsFraction(e){return e==="timespan"||e==="snapshot"}},ee={varianceDisclaimer:"Values are estimated and may vary. The [performance score is calculated](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring/) directly from these metrics.",calculatorLink:"See calculator.",showRelevantAudits:"Show audits relevant to:",opportunityResourceColumnLabel:"Opportunity",opportunitySavingsColumnLabel:"Estimated Savings",errorMissingAuditInfo:"Report error: no audit information",errorLabel:"Error!",warningHeader:"Warnings: ",warningAuditsGroupTitle:"Passed audits but with warnings",passedAuditsGroupTitle:"Passed audits",notApplicableAuditsGroupTitle:"Not applicable",manualAuditsGroupTitle:"Additional items to manually check",toplevelWarningsMessage:"There were issues affecting this run of Lighthouse:",crcInitialNavigation:"Initial Navigation",crcLongestDurationLabel:"Maximum critical path latency:",snippetExpandButtonLabel:"Expand snippet",snippetCollapseButtonLabel:"Collapse snippet",lsPerformanceCategoryDescription:"[Lighthouse](https://developers.google.com/web/tools/lighthouse/) analysis of the current page on an emulated mobile network. Values are estimated and may vary.",labDataTitle:"Lab Data",thirdPartyResourcesLabel:"Show 3rd-party resources",viewTreemapLabel:"View Treemap",viewTraceLabel:"View Trace",dropdownPrintSummary:"Print Summary",dropdownPrintExpanded:"Print Expanded",dropdownCopyJSON:"Copy JSON",dropdownSaveHTML:"Save as HTML",dropdownSaveJSON:"Save as JSON",dropdownViewer:"Open in Viewer",dropdownSaveGist:"Save as Gist",dropdownDarkTheme:"Toggle Dark Theme",dropdownViewUnthrottledTrace:"View Unthrottled Trace",runtimeSettingsDevice:"Device",runtimeSettingsNetworkThrottling:"Network throttling",runtimeSettingsCPUThrottling:"CPU throttling",runtimeSettingsUANetwork:"User agent (network)",runtimeSettingsBenchmark:"Unthrottled CPU/Memory Power",runtimeSettingsAxeVersion:"Axe version",runtimeSettingsScreenEmulation:"Screen emulation",footerIssue:"File an issue",runtimeNoEmulation:"No emulation",runtimeMobileEmulation:"Emulated Moto G Power",runtimeDesktopEmulation:"Emulated Desktop",runtimeUnknown:"Unknown",runtimeSingleLoad:"Single page load",runtimeAnalysisWindow:"Initial page load",runtimeSingleLoadTooltip:"This data is taken from a single page load, as opposed to field data summarizing many sessions.",throttlingProvided:"Provided by environment",show:"Show",hide:"Hide",expandView:"Expand view",collapseView:"Collapse view",runtimeSlow4g:"Slow 4G throttling",runtimeCustom:"Custom throttling",firstPartyChipLabel:"1st party",openInANewTabTooltip:"Open in a new tab",unattributable:"Unattributable"};var N=class{constructor(e,t){this.dom=e,this.detailsRenderer=t}get _clumpTitles(){return{warning:g.strings.warningAuditsGroupTitle,manual:g.strings.manualAuditsGroupTitle,passed:g.strings.passedAuditsGroupTitle,notApplicable:g.strings.notApplicableAuditsGroupTitle}}renderAudit(e){let t=this.dom.createComponent("audit");return this.populateAuditValues(e,t)}populateAuditValues(e,t){let n=g.strings,r=this.dom.find(".lh-audit",t);r.id=e.result.id;let i=e.result.scoreDisplayMode;e.result.displayValue&&(this.dom.find(".lh-audit__display-text",r).textContent=e.result.displayValue);let a=this.dom.find(".lh-audit__title",r);a.append(this.dom.convertMarkdownCodeSnippets(e.result.title));let l=this.dom.find(".lh-audit__description",r);l.append(this.dom.convertMarkdownLinkSnippets(e.result.description));for(let h of e.relevantMetrics||[]){let u=this.dom.createChildOf(l,"span","lh-audit__adorn");u.title=`Relevant to ${h.result.title}`,u.textContent=h.acronym||h.id}e.stackPacks&&e.stackPacks.forEach(h=>{let u=this.dom.createElement("img","lh-audit__stackpack__img");u.src=h.iconDataURL,u.alt=h.title;let f=this.dom.convertMarkdownLinkSnippets(h.description,{alwaysAppendUtmSource:!0}),b=this.dom.createElement("div","lh-audit__stackpack");b.append(u,f),this.dom.find(".lh-audit__stackpacks",r).append(b)});let s=this.dom.find("details",r);if(e.result.details){let h=this.detailsRenderer.render(e.result.details);h&&(h.classList.add("lh-details"),s.append(h))}if(this.dom.find(".lh-chevron-container",r).append(this._createChevron()),this._setRatingClass(r,e.result.score,i),e.result.scoreDisplayMode==="error"){r.classList.add("lh-audit--error");let h=this.dom.find(".lh-audit__display-text",r);h.textContent=n.errorLabel,h.classList.add("lh-tooltip-boundary");let u=this.dom.createChildOf(h,"div","lh-tooltip lh-tooltip--error");u.textContent=e.result.errorMessage||n.errorMissingAuditInfo}else if(e.result.explanation){let h=this.dom.createChildOf(a,"div","lh-audit-explanation");h.textContent=e.result.explanation}let c=e.result.warnings;if(!c||c.length===0)return r;let d=this.dom.find("summary",s),p=this.dom.createChildOf(d,"div","lh-warnings");if(this.dom.createChildOf(p,"span").textContent=n.warningHeader,c.length===1)p.append(this.dom.createTextNode(c.join("")));else{let h=this.dom.createChildOf(p,"ul");for(let u of c){let f=this.dom.createChildOf(h,"li");f.textContent=u}}return r}injectFinalScreenshot(e,t,n){let r=t["final-screenshot"];if(!r||r.scoreDisplayMode==="error"||!r.details||r.details.type!=="screenshot")return null;let i=this.dom.createElement("img","lh-final-ss-image"),a=r.details.data;i.src=a,i.alt=r.title;let l=this.dom.find(".lh-category .lh-category-header",e),s=this.dom.createElement("div","lh-category-headercol"),c=this.dom.createElement("div","lh-category-headercol lh-category-headercol--separator"),d=this.dom.createElement("div","lh-category-headercol");s.append(...l.childNodes),s.append(n),d.append(i),l.append(s,c,d),l.classList.add("lh-category-header__finalscreenshot")}_createChevron(){let e=this.dom.createComponent("chevron");return this.dom.find("svg.lh-chevron",e)}_setRatingClass(e,t,n){let r=y.calculateRating(t,n);return e.classList.add(`lh-audit--${n.toLowerCase()}`),n!=="informative"&&e.classList.add(`lh-audit--${r}`),e}renderCategoryHeader(e,t,n){let r=this.dom.createComponent("categoryHeader"),i=this.dom.find(".lh-score__gauge",r),a=this.renderCategoryScore(e,t,n);if(i.append(a),e.description){let l=this.dom.convertMarkdownLinkSnippets(e.description);this.dom.find(".lh-category-header__description",r).append(l)}return r}renderAuditGroup(e){let t=this.dom.createElement("div","lh-audit-group"),n=this.dom.createElement("div","lh-audit-group__header");this.dom.createChildOf(n,"span","lh-audit-group__title").textContent=e.title,t.append(n);let r=null;return e.description&&(r=this.dom.convertMarkdownLinkSnippets(e.description),r.classList.add("lh-audit-group__description","lh-audit-group__footer"),t.append(r)),[t,r]}_renderGroupedAudits(e,t){let n=new Map,r="NotAGroup";n.set(r,[]);for(let a of e){let l=a.group||r;if(l==="hidden")continue;let s=n.get(l)||[];s.push(a),n.set(l,s)}let i=[];for(let[a,l]of n){if(a===r){for(let p of l)i.push(this.renderAudit(p));continue}let s=t[a],[c,d]=this.renderAuditGroup(s);for(let p of l)c.insertBefore(this.renderAudit(p),d);c.classList.add(`lh-audit-group--${a}`),i.push(c)}return i}renderUnexpandableClump(e,t){let n=this.dom.createElement("div");return this._renderGroupedAudits(e,t).forEach(i=>n.append(i)),n}renderClump(e,{auditRefs:t,description:n,openByDefault:r}){let i=this.dom.createComponent("clump"),a=this.dom.find(".lh-clump",i);r&&a.setAttribute("open","");let l=this.dom.find(".lh-audit-group__header",a),s=this._clumpTitles[e];this.dom.find(".lh-audit-group__title",l).textContent=s;let c=this.dom.find(".lh-audit-group__itemcount",a);c.textContent=`(${t.length})`;let d=t.map(this.renderAudit.bind(this));a.append(...d);let p=this.dom.find(".lh-audit-group",i);if(n){let h=this.dom.convertMarkdownLinkSnippets(n);h.classList.add("lh-audit-group__description","lh-audit-group__footer"),p.append(h)}return this.dom.find(".lh-clump-toggletext--show",p).textContent=g.strings.show,this.dom.find(".lh-clump-toggletext--hide",p).textContent=g.strings.hide,a.classList.add(`lh-clump--${e.toLowerCase()}`),p}renderCategoryScore(e,t,n){let r;if(n&&y.shouldDisplayAsFraction(n.gatherMode)?r=this.renderCategoryFraction(e):r=this.renderScoreGauge(e,t),n?.omitLabel&&this.dom.find(".lh-gauge__label,.lh-fraction__label",r).remove(),n?.onPageAnchorRendered){let i=this.dom.find("a",r);n.onPageAnchorRendered(i)}return r}renderScoreGauge(e,t){let n=this.dom.createComponent("gauge"),r=this.dom.find("a.lh-gauge__wrapper",n);y.isPluginCategory(e.id)&&r.classList.add("lh-gauge__wrapper--plugin");let i=Number(e.score),a=this.dom.find(".lh-gauge",n),l=this.dom.find("circle.lh-gauge-arc",a);l&&this._setGaugeArc(l,i);let s=Math.round(i*100),c=this.dom.find("div.lh-gauge__percentage",n);return c.textContent=s.toString(),e.score===null&&(c.classList.add("lh-gauge--error"),c.textContent="",c.title=g.strings.errorLabel),e.auditRefs.length===0||this.hasApplicableAudits(e)?r.classList.add(`lh-gauge__wrapper--${y.calculateRating(e.score)}`):(r.classList.add("lh-gauge__wrapper--not-applicable"),c.textContent="-",c.title=g.strings.notApplicableAuditsGroupTitle),this.dom.find(".lh-gauge__label",n).textContent=e.title,n}renderCategoryFraction(e){let t=this.dom.createComponent("fraction"),n=this.dom.find("a.lh-fraction__wrapper",t),{numPassed:r,numPassableAudits:i,totalWeight:a}=y.calculateCategoryFraction(e),l=r/i,s=this.dom.find(".lh-fraction__content",t),c=this.dom.createElement("span");c.textContent=`${r}/${i}`,s.append(c);let d=y.calculateRating(l);return a===0&&(d="null"),n.classList.add(`lh-fraction__wrapper--${d}`),this.dom.find(".lh-fraction__label",t).textContent=e.title,t}hasApplicableAudits(e){return e.auditRefs.some(t=>t.result.scoreDisplayMode!=="notApplicable")}_setGaugeArc(e,t){let n=2*Math.PI*Number(e.getAttribute("r")),r=Number(e.getAttribute("stroke-width")),i=.25*r/n;e.style.transform=`rotate(${-90+i*360}deg)`;let a=t*n-r/2;t===0&&(e.style.opacity="0"),t===1&&(a=n),e.style.strokeDasharray=`${Math.max(a,0)} ${n}`}_auditHasWarning(e){return!!e.result.warnings?.length}_getClumpIdForAuditRef(e){let t=e.result.scoreDisplayMode;return t==="manual"||t==="notApplicable"?t:y.showAsPassed(e.result)?this._auditHasWarning(e)?"warning":"passed":"failed"}render(e,t={},n){let r=this.dom.createElement("div","lh-category");r.id=e.id,r.append(this.renderCategoryHeader(e,t,n));let i=new Map;i.set("failed",[]),i.set("warning",[]),i.set("manual",[]),i.set("passed",[]),i.set("notApplicable",[]);for(let l of e.auditRefs){let s=this._getClumpIdForAuditRef(l),c=i.get(s);c.push(l),i.set(s,c)}for(let l of i.values())l.sort((s,c)=>c.weight-s.weight);let a=i.get("failed")?.length;for(let[l,s]of i){if(s.length===0)continue;if(l==="failed"){let h=this.renderUnexpandableClump(s,t);h.classList.add("lh-clump--failed"),r.append(h);continue}let c=l==="manual"?e.manualDescription:void 0,d=l==="warning"||l==="manual"&&a===0,p=this.renderClump(l,{auditRefs:s,description:c,openByDefault:d});r.append(p)}return r}};var O=class{static initTree(e){let t=0,n=Object.keys(e);return n.length>0&&(t=e[n[0]].request.startTime),{tree:e,startTime:t,transferSize:0}}static createSegment(e,t,n,r,i,a){let l=e[t],s=Object.keys(e),c=s.indexOf(t)===s.length-1,d=!!l.children&&Object.keys(l.children).length>0,p=Array.isArray(i)?i.slice(0):[];return typeof a<"u"&&p.push(!a),{node:l,isLastChild:c,hasChildren:d,startTime:n,transferSize:r+l.request.transferSize,treeMarkers:p}}static createChainNode(e,t,n){let r=e.createComponent("crcChain");e.find(".lh-crc-node",r).setAttribute("title",t.node.request.url);let i=e.find(".lh-crc-node__tree-marker",r);t.treeMarkers.forEach(p=>{let h=p?"lh-tree-marker lh-vert":"lh-tree-marker";i.append(e.createElement("span",h),e.createElement("span","lh-tree-marker"))});let a=t.isLastChild?"lh-tree-marker lh-up-right":"lh-tree-marker lh-vert-right",l=t.hasChildren?"lh-tree-marker lh-horiz-down":"lh-tree-marker lh-right";i.append(e.createElement("span",a),e.createElement("span","lh-tree-marker lh-right"),e.createElement("span",l));let s=t.node.request.url,c=n.renderTextURL(s),d=e.find(".lh-crc-node__tree-value",r);if(d.append(c),!t.hasChildren){let{startTime:p,endTime:h,transferSize:u}=t.node.request,f=e.createElement("span","lh-crc-node__chain-duration");f.textContent=" - "+g.i18n.formatMilliseconds((h-p)*1e3)+", ";let b=e.createElement("span","lh-crc-node__chain-duration");b.textContent=g.i18n.formatBytesToKiB(u,.01),d.append(f,b)}return r}static buildTree(e,t,n,r,i,a){if(r.append(H.createChainNode(e,n,a)),n.node.children)for(let l of Object.keys(n.node.children)){let s=H.createSegment(n.node.children,l,n.startTime,n.transferSize,n.treeMarkers,n.isLastChild);H.buildTree(e,t,s,r,i,a)}}static render(e,t,n){let r=e.createComponent("crc"),i=e.find(".lh-crc",r);e.find(".lh-crc-initial-nav",r).textContent=g.strings.crcInitialNavigation,e.find(".lh-crc__longest_duration_label",r).textContent=g.strings.crcLongestDurationLabel,e.find(".lh-crc__longest_duration",r).textContent=g.i18n.formatMilliseconds(t.longestChain.duration);let a=H.initTree(t.chains);for(let l of Object.keys(a.tree)){let s=H.createSegment(a.tree,l,a.startTime,a.transferSize);H.buildTree(e,r,s,i,t,n)}return e.find(".lh-crc-container",r)}},H=O;function Ue(o,e){return e.left<=o.width&&0<=e.right&&e.top<=o.height&&0<=e.bottom}function re(o,e,t){return o<e?e:o>t?t:o}function Ie(o){return{x:o.left+o.width/2,y:o.top+o.height/2}}var P=class o{static getScreenshotPositions(e,t,n){let r=Ie(e),i=re(r.x-t.width/2,0,n.width-t.width),a=re(r.y-t.height/2,0,n.height-t.height);return{screenshot:{left:i,top:a},clip:{left:e.left-i,top:e.top-a}}}static renderClipPathInScreenshot(e,t,n,r,i){let a=e.find("clipPath",t),l=`clip-${g.getUniqueSuffix()}`;a.id=l,t.style.clipPath=`url(#${l})`;let s=n.top/i.height,c=s+r.height/i.height,d=n.left/i.width,p=d+r.width/i.width,h=[`0,0             1,0            1,${s}          0,${s}`,`0,${c}     1,${c}    1,1               0,1`,`0,${s}        ${d},${s} ${d},${c} 0,${c}`,`${p},${s} 1,${s}       1,${c}       ${p},${c}`];for(let u of h){let f=e.createElementNS("http://www.w3.org/2000/svg","polygon");f.setAttribute("points",u),a.append(f)}}static installFullPageScreenshot(e,t){e.style.setProperty("--element-screenshot-url",`url('${t.data}')`)}static installOverlayFeature(e){let{dom:t,rootEl:n,overlayContainerEl:r,fullPageScreenshot:i}=e,a="lh-screenshot-overlay--enabled";n.classList.contains(a)||(n.classList.add(a),n.addEventListener("click",l=>{let s=l.target;if(!s)return;let c=s.closest(".lh-node > .lh-element-screenshot");if(!c)return;let d=t.createElement("div","lh-element-screenshot__overlay");r.append(d);let p={width:d.clientWidth*.95,height:d.clientHeight*.8},h={width:Number(c.dataset.rectWidth),height:Number(c.dataset.rectHeight),left:Number(c.dataset.rectLeft),right:Number(c.dataset.rectLeft)+Number(c.dataset.rectWidth),top:Number(c.dataset.rectTop),bottom:Number(c.dataset.rectTop)+Number(c.dataset.rectHeight)},u=o.render(t,i.screenshot,h,p);if(!u){d.remove();return}d.append(u),d.addEventListener("click",()=>d.remove())}))}static _computeZoomFactor(e,t){let r={x:t.width/e.width,y:t.height/e.height},i=.75*Math.min(r.x,r.y);return Math.min(1,i)}static render(e,t,n,r){if(!Ue(t,n))return null;let i=e.createComponent("elementScreenshot"),a=e.find("div.lh-element-screenshot",i);a.dataset.rectWidth=n.width.toString(),a.dataset.rectHeight=n.height.toString(),a.dataset.rectLeft=n.left.toString(),a.dataset.rectTop=n.top.toString();let l=this._computeZoomFactor(n,r),s={width:r.width/l,height:r.height/l};s.width=Math.min(t.width,s.width),s.height=Math.min(t.height,s.height);let c={width:s.width*l,height:s.height*l},d=o.getScreenshotPositions(n,s,{width:t.width,height:t.height}),p=e.find("div.lh-element-screenshot__image",a);p.style.width=c.width+"px",p.style.height=c.height+"px",p.style.backgroundPositionY=-(d.screenshot.top*l)+"px",p.style.backgroundPositionX=-(d.screenshot.left*l)+"px",p.style.backgroundSize=`${t.width*l}px ${t.height*l}px`;let h=e.find("div.lh-element-screenshot__element-marker",a);h.style.width=n.width*l+"px",h.style.height=n.height*l+"px",h.style.left=d.clip.left*l+"px",h.style.top=d.clip.top*l+"px";let u=e.find("div.lh-element-screenshot__mask",a);return u.style.width=c.width+"px",u.style.height=c.height+"px",o.renderClipPathInScreenshot(e,u,d.clip,n,s),a}};var Oe=["http://","https://","data:"],Ve=["bytes","numeric","ms","timespanMs"],V=class{constructor(e,t={}){this._dom=e,this._fullPageScreenshot=t.fullPageScreenshot,this._entities=t.entities}render(e){switch(e.type){case"filmstrip":return this._renderFilmstrip(e);case"list":return this._renderList(e);case"table":case"opportunity":return this._renderTable(e);case"criticalrequestchain":return O.render(this._dom,e,this);case"screenshot":case"debugdata":case"treemap-data":return null;default:return this._renderUnknown(e.type,e)}}_renderBytes(e){let t=g.i18n.formatBytesToKiB(e.value,e.granularity||.1),n=this._renderText(t);return n.title=g.i18n.formatBytes(e.value),n}_renderMilliseconds(e){let t;return e.displayUnit==="duration"?t=g.i18n.formatDuration(e.value):t=g.i18n.formatMilliseconds(e.value,e.granularity||10),this._renderText(t)}renderTextURL(e){let t=e,n,r,i;try{let l=k.parseURL(t);n=l.file==="/"?l.origin:l.file,r=l.file==="/"||l.hostname===""?"":`(${l.hostname})`,i=t}catch{n=t}let a=this._dom.createElement("div","lh-text__url");if(a.append(this._renderLink({text:n,url:t})),r){let l=this._renderText(r);l.classList.add("lh-text__url-host"),a.append(l)}return i&&(a.title=t,a.dataset.url=t),a}_renderLink(e){let t=this._dom.createElement("a");if(this._dom.safelySetHref(t,e.url),!t.href){let n=this._renderText(e.text);return n.classList.add("lh-link"),n}return t.rel="noopener",t.target="_blank",t.textContent=e.text,t.classList.add("lh-link"),t}_renderText(e){let t=this._dom.createElement("div","lh-text");return t.textContent=e,t}_renderNumeric(e){let t=g.i18n.formatNumber(e.value,e.granularity||.1),n=this._dom.createElement("div","lh-numeric");return n.textContent=t,n}_renderThumbnail(e){let t=this._dom.createElement("img","lh-thumbnail"),n=e;return t.src=n,t.title=n,t.alt="",t}_renderUnknown(e,t){console.error(`Unknown details type: ${e}`,t);let n=this._dom.createElement("details","lh-unknown");return this._dom.createChildOf(n,"summary").textContent=`We don't know how to render audit details of type \`${e}\`. The Lighthouse version that collected this data is likely newer than the Lighthouse version of the report renderer. Expand for the raw JSON.`,this._dom.createChildOf(n,"pre").textContent=JSON.stringify(t,null,2),n}_renderTableValue(e,t){if(e==null)return null;if(typeof e=="object")switch(e.type){case"code":return this._renderCode(e.value);case"link":return this._renderLink(e);case"node":return this.renderNode(e);case"numeric":return this._renderNumeric(e);case"source-location":return this.renderSourceLocation(e);case"url":return this.renderTextURL(e.value);default:return this._renderUnknown(e.type,e)}switch(t.valueType){case"bytes":{let n=Number(e);return this._renderBytes({value:n,granularity:t.granularity})}case"code":{let n=String(e);return this._renderCode(n)}case"ms":{let n={value:Number(e),granularity:t.granularity,displayUnit:t.displayUnit};return this._renderMilliseconds(n)}case"numeric":{let n=Number(e);return this._renderNumeric({value:n,granularity:t.granularity})}case"text":{let n=String(e);return this._renderText(n)}case"thumbnail":{let n=String(e);return this._renderThumbnail(n)}case"timespanMs":{let n=Number(e);return this._renderMilliseconds({value:n})}case"url":{let n=String(e);return Oe.some(r=>n.startsWith(r))?this.renderTextURL(n):this._renderCode(n)}default:return this._renderUnknown(t.valueType,e)}}_getDerivedSubItemsHeading(e){return e.subItemsHeading?{key:e.subItemsHeading.key||"",valueType:e.subItemsHeading.valueType||e.valueType,granularity:e.subItemsHeading.granularity||e.granularity,displayUnit:e.subItemsHeading.displayUnit||e.displayUnit,label:""}:null}_renderTableRow(e,t){let n=this._dom.createElement("tr");for(let r of t){if(!r||!r.key){this._dom.createChildOf(n,"td","lh-table-column--empty");continue}let i=e[r.key],a;if(i!=null&&(a=this._renderTableValue(i,r)),a){let l=`lh-table-column--${r.valueType}`;this._dom.createChildOf(n,"td",l).append(a)}else this._dom.createChildOf(n,"td","lh-table-column--empty")}return n}_renderTableRowsFromItem(e,t){let n=this._dom.createFragment();if(n.append(this._renderTableRow(e,t)),!e.subItems)return n;let r=t.map(this._getDerivedSubItemsHeading);if(!r.some(Boolean))return n;for(let i of e.subItems.items){let a=this._renderTableRow(i,r);a.classList.add("lh-sub-item-row"),n.append(a)}return n}_adornEntityGroupRow(e){let t=e.dataset.entity;if(!t)return;let n=this._entities?.find(i=>i.name===t);if(!n)return;let r=this._dom.find("td",e);if(n.category){let i=this._dom.createElement("span");i.classList.add("lh-audit__adorn"),i.textContent=n.category,r.append(" ",i)}if(n.isFirstParty){let i=this._dom.createElement("span");i.classList.add("lh-audit__adorn","lh-audit__adorn1p"),i.textContent=g.strings.firstPartyChipLabel,r.append(" ",i)}if(n.homepage){let i=this._dom.createElement("a");i.href=n.homepage,i.target="_blank",i.title=g.strings.openInANewTabTooltip,i.classList.add("lh-report-icon--external"),r.append(" ",i)}}_renderEntityGroupRow(e,t){let n={...t[0]};n.valueType="text";let r=[n,...t.slice(1)],i=this._dom.createFragment();return i.append(this._renderTableRow(e,r)),this._dom.find("tr",i).classList.add("lh-row--group"),i}_getEntityGroupItems(e){let{items:t,headings:n,sortedBy:r}=e;if(!t.length||e.isEntityGrouped||!t.some(d=>d.entity))return[];let i=new Set(e.skipSumming||[]),a=[];for(let d of n)!d.key||i.has(d.key)||Ve.includes(d.valueType)&&a.push(d.key);let l=n[0].key;if(!l)return[];let s=new Map;for(let d of t){let p=typeof d.entity=="string"?d.entity:void 0,h=s.get(p)||{[l]:p||g.strings.unattributable,entity:p};for(let u of a)h[u]=Number(h[u]||0)+Number(d[u]||0);s.set(p,h)}let c=[...s.values()];return r&&c.sort(y.getTableItemSortComparator(r)),c}_renderTable(e){if(!e.items.length)return this._dom.createElement("span");let t=this._dom.createElement("table","lh-table"),n=this._dom.createChildOf(t,"thead"),r=this._dom.createChildOf(n,"tr");for(let l of e.headings){let c=`lh-table-column--${l.valueType||"text"}`,d=this._dom.createElement("div","lh-text");d.textContent=l.label,this._dom.createChildOf(r,"th",c).append(d)}let i=this._getEntityGroupItems(e),a=this._dom.createChildOf(t,"tbody");if(i.length)for(let l of i){let s=typeof l.entity=="string"?l.entity:void 0,c=this._renderEntityGroupRow(l,e.headings);for(let p of e.items.filter(h=>h.entity===s))c.append(this._renderTableRowsFromItem(p,e.headings));let d=this._dom.findAll("tr",c);s&&d.length&&(d.forEach(p=>p.dataset.entity=s),this._adornEntityGroupRow(d[0])),a.append(c)}else{let l=!0;for(let s of e.items){let c=this._renderTableRowsFromItem(s,e.headings),d=this._dom.findAll("tr",c),p=d[0];if(typeof s.entity=="string"&&(p.dataset.entity=s.entity),e.isEntityGrouped&&s.entity)p.classList.add("lh-row--group"),this._adornEntityGroupRow(p);else for(let h of d)h.classList.add(l?"lh-row--even":"lh-row--odd");l=!l,a.append(c)}}return t}_renderList(e){let t=this._dom.createElement("div","lh-list");return e.items.forEach(n=>{let r=this.render(n);r&&t.append(r)}),t}renderNode(e){let t=this._dom.createElement("span","lh-node");if(e.nodeLabel){let a=this._dom.createElement("div");a.textContent=e.nodeLabel,t.append(a)}if(e.snippet){let a=this._dom.createElement("div");a.classList.add("lh-node__snippet"),a.textContent=e.snippet,t.append(a)}if(e.selector&&(t.title=e.selector),e.path&&t.setAttribute("data-path",e.path),e.selector&&t.setAttribute("data-selector",e.selector),e.snippet&&t.setAttribute("data-snippet",e.snippet),!this._fullPageScreenshot)return t;let n=e.lhId&&this._fullPageScreenshot.nodes[e.lhId];if(!n||n.width===0||n.height===0)return t;let r={width:147,height:100},i=P.render(this._dom,this._fullPageScreenshot.screenshot,n,r);return i&&t.prepend(i),t}renderSourceLocation(e){if(!e.url)return null;let t=`${e.url}:${e.line+1}:${e.column}`,n;e.original&&(n=`${e.original.file||"<unmapped>"}:${e.original.line+1}:${e.original.column}`);let r;if(e.urlProvider==="network"&&n)r=this._renderLink({url:e.url,text:n}),r.title=`maps to generated location ${t}`;else if(e.urlProvider==="network"&&!n)r=this.renderTextURL(e.url),this._dom.find(".lh-link",r).textContent+=`:${e.line+1}:${e.column}`;else if(e.urlProvider==="comment"&&n)r=this._renderText(`${n} (from source map)`),r.title=`${t} (from sourceURL)`;else if(e.urlProvider==="comment"&&!n)r=this._renderText(`${t} (from sourceURL)`);else return null;return r.classList.add("lh-source-location"),r.setAttribute("data-source-url",e.url),r.setAttribute("data-source-line",String(e.line)),r.setAttribute("data-source-column",String(e.column)),r}_renderFilmstrip(e){let t=this._dom.createElement("div","lh-filmstrip");for(let n of e.items){let r=this._dom.createChildOf(t,"div","lh-filmstrip__frame"),i=this._dom.createChildOf(r,"img","lh-filmstrip__thumbnail");i.src=n.data,i.alt="Screenshot"}return t}_renderCode(e){let t=this._dom.createElement("pre","lh-code");return t.textContent=e,t}};var J="\xA0";var G=class{constructor(e){e==="en-XA"&&(e="de"),this._locale=e,this._cachedNumberFormatters=new Map}_formatNumberWithGranularity(e,t,n={}){if(t!==void 0){let a=-Math.log10(t);Number.isInteger(a)||(console.warn(`granularity of ${t} is invalid. Using 1 instead`),t=1),t<1&&(n={...n},n.minimumFractionDigits=n.maximumFractionDigits=Math.ceil(a)),e=Math.round(e/t)*t,Object.is(e,-0)&&(e=0)}else Math.abs(e)<5e-4&&(e=0);let r,i=[n.minimumFractionDigits,n.maximumFractionDigits,n.style,n.unit,n.unitDisplay,this._locale].join("");return r=this._cachedNumberFormatters.get(i),r||(r=new Intl.NumberFormat(this._locale,n),this._cachedNumberFormatters.set(i,r)),r.format(e).replace(" ",J)}formatNumber(e,t){return this._formatNumberWithGranularity(e,t)}formatInteger(e){return this._formatNumberWithGranularity(e,1)}formatPercent(e){return new Intl.NumberFormat(this._locale,{style:"percent"}).format(e)}formatBytesToKiB(e,t=void 0){return this._formatNumberWithGranularity(e/1024,t)+`${J}KiB`}formatBytesToMiB(e,t=void 0){return this._formatNumberWithGranularity(e/1048576,t)+`${J}MiB`}formatBytes(e,t=1){return this._formatNumberWithGranularity(e,t,{style:"unit",unit:"byte",unitDisplay:"long"})}formatBytesWithBestUnit(e,t=.1){return e>=1048576?this.formatBytesToMiB(e,t):e>=1024?this.formatBytesToKiB(e,t):this._formatNumberWithGranularity(e,t,{style:"unit",unit:"byte",unitDisplay:"narrow"})}formatKbps(e,t=void 0){return this._formatNumberWithGranularity(e,t,{style:"unit",unit:"kilobit-per-second",unitDisplay:"short"})}formatMilliseconds(e,t=void 0){return this._formatNumberWithGranularity(e,t,{style:"unit",unit:"millisecond",unitDisplay:"short"})}formatSeconds(e,t=void 0){return this._formatNumberWithGranularity(e/1e3,t,{style:"unit",unit:"second",unitDisplay:"narrow"})}formatDateTime(e){let t={month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"numeric",timeZoneName:"short"},n;try{n=new Intl.DateTimeFormat(this._locale,t)}catch{t.timeZone="UTC",n=new Intl.DateTimeFormat(this._locale,t)}return n.format(new Date(e))}formatDuration(e){let t=e/1e3;if(Math.round(t)===0)return"None";let n=[],r={day:60*60*24,hour:60*60,minute:60,second:1};return Object.keys(r).forEach(i=>{let a=r[i],l=Math.floor(t/a);if(l>0){t-=l*a;let s=this._formatNumberWithGranularity(l,1,{style:"unit",unit:i,unitDisplay:"narrow"});n.push(s)}}),n.join(" ")}};var W=class extends N{_renderMetric(e){let t=this.dom.createComponent("metric"),n=this.dom.find(".lh-metric",t);n.id=e.result.id;let r=y.calculateRating(e.result.score,e.result.scoreDisplayMode);n.classList.add(`lh-metric--${r}`);let i=this.dom.find(".lh-metric__title",t);i.textContent=e.result.title;let a=this.dom.find(".lh-metric__value",t);a.textContent=e.result.displayValue||"";let l=this.dom.find(".lh-metric__description",t);if(l.append(this.dom.convertMarkdownLinkSnippets(e.result.description)),e.result.scoreDisplayMode==="error"){l.textContent="",a.textContent="Error!";let s=this.dom.createChildOf(l,"span");s.textContent=e.result.errorMessage||"Report error: no metric information"}else e.result.scoreDisplayMode==="notApplicable"&&(a.textContent="--");return n}_renderOpportunity(e,t){let n=this.dom.createComponent("opportunity"),r=this.populateAuditValues(e,n);if(r.id=e.result.id,!e.result.details||e.result.scoreDisplayMode==="error")return r;let i=e.result.details;if(i.overallSavingsMs===void 0)return r;let a=this.dom.find("span.lh-audit__display-text, div.lh-audit__display-text",r),l=`${i.overallSavingsMs/t*100}%`;if(this.dom.find("div.lh-sparkline__bar",r).style.width=l,a.textContent=g.i18n.formatSeconds(i.overallSavingsMs,.01),e.result.displayValue){let s=e.result.displayValue;this.dom.find("div.lh-load-opportunity__sparkline",r).title=s,a.title=s}return r}_getWastedMs(e){if(e.result.details){let t=e.result.details;if(typeof t.overallSavingsMs!="number")throw new Error("non-opportunity details passed to _getWastedMs");return t.overallSavingsMs}else return Number.MIN_VALUE}_getScoringCalculatorHref(e){let t=e.filter(p=>p.group==="metrics"),n=e.find(p=>p.id==="interactive"),r=e.find(p=>p.id==="first-cpu-idle"),i=e.find(p=>p.id==="first-meaningful-paint");n&&t.push(n),r&&t.push(r),i&&t.push(i);let a=p=>Math.round(p*100)/100,s=[...t.map(p=>{let h;return typeof p.result.numericValue=="number"?(h=p.id==="cumulative-layout-shift"?a(p.result.numericValue):Math.round(p.result.numericValue),h=h.toString()):h="null",[p.acronym||p.id,h]})];g.reportJson&&(s.push(["device",g.reportJson.configSettings.formFactor]),s.push(["version",g.reportJson.lighthouseVersion]));let c=new URLSearchParams(s),d=new URL("https://googlechrome.github.io/lighthouse/scorecalc/");return d.hash=c.toString(),d.href}_classifyPerformanceAudit(e){return e.group?null:e.result.details?.overallSavingsMs!==void 0?"load-opportunity":"diagnostic"}render(e,t,n){let r=g.strings,i=this.dom.createElement("div","lh-category");i.id=e.id,i.append(this.renderCategoryHeader(e,t,n));let a=e.auditRefs.filter(m=>m.group==="metrics");if(a.length){let[m,w]=this.renderAuditGroup(t.metrics),v=this.dom.createElement("input","lh-metrics-toggle__input"),x=`lh-metrics-toggle${g.getUniqueSuffix()}`;v.setAttribute("aria-label","Toggle the display of metric descriptions"),v.type="checkbox",v.id=x,m.prepend(v);let E=this.dom.find(".lh-audit-group__header",m),A=this.dom.createChildOf(E,"label","lh-metrics-toggle__label");A.htmlFor=x;let C=this.dom.createChildOf(A,"span","lh-metrics-toggle__labeltext--show"),L=this.dom.createChildOf(A,"span","lh-metrics-toggle__labeltext--hide");C.textContent=g.strings.expandView,L.textContent=g.strings.collapseView;let S=this.dom.createElement("div","lh-metrics-container");if(m.insertBefore(S,w),a.forEach(z=>{S.append(this._renderMetric(z))}),i.querySelector(".lh-gauge__wrapper")){let z=this.dom.find(".lh-category-header__description",i),M=this.dom.createChildOf(z,"div","lh-metrics__disclaimer"),T=this.dom.convertMarkdownLinkSnippets(r.varianceDisclaimer);M.append(T);let F=this.dom.createChildOf(M,"a","lh-calclink");F.target="_blank",F.textContent=r.calculatorLink,this.dom.safelySetHref(F,this._getScoringCalculatorHref(e.auditRefs))}m.classList.add("lh-audit-group--metrics"),i.append(m)}let l=this.dom.createChildOf(i,"div","lh-filmstrip-container"),c=e.auditRefs.find(m=>m.id==="screenshot-thumbnails")?.result;if(c?.details){l.id=c.id;let m=this.detailsRenderer.render(c.details);m&&l.append(m)}let d=e.auditRefs.filter(m=>this._classifyPerformanceAudit(m)==="load-opportunity").filter(m=>!y.showAsPassed(m.result)).sort((m,w)=>this._getWastedMs(w)-this._getWastedMs(m)),p=a.filter(m=>!!m.relevantAudits);if(p.length&&this.renderMetricAuditFilter(p,i),d.length){let w=d.map(S=>this._getWastedMs(S)),v=Math.max(...w),x=Math.max(Math.ceil(v/1e3)*1e3,2e3),[E,A]=this.renderAuditGroup(t["load-opportunities"]),C=this.dom.createComponent("opportunityHeader");this.dom.find(".lh-load-opportunity__col--one",C).textContent=r.opportunityResourceColumnLabel,this.dom.find(".lh-load-opportunity__col--two",C).textContent=r.opportunitySavingsColumnLabel;let L=this.dom.find(".lh-load-opportunity__header",C);E.insertBefore(L,A),d.forEach(S=>E.insertBefore(this._renderOpportunity(S,x),A)),E.classList.add("lh-audit-group--load-opportunities"),i.append(E)}let h=e.auditRefs.filter(m=>this._classifyPerformanceAudit(m)==="diagnostic").filter(m=>!y.showAsPassed(m.result)).sort((m,w)=>{let v=m.result.scoreDisplayMode==="informative"?100:Number(m.result.score),x=w.result.scoreDisplayMode==="informative"?100:Number(w.result.score);return v-x});if(h.length){let[m,w]=this.renderAuditGroup(t.diagnostics);h.forEach(v=>m.insertBefore(this.renderAudit(v),w)),m.classList.add("lh-audit-group--diagnostics"),i.append(m)}let u=e.auditRefs.filter(m=>this._classifyPerformanceAudit(m)&&y.showAsPassed(m.result));if(!u.length)return i;let f={auditRefs:u,groupDefinitions:t},b=this.renderClump("passed",f);i.append(b);let _=[];if(["performance-budget","timing-budget"].forEach(m=>{let w=e.auditRefs.find(v=>v.id===m);if(w?.result.details){let v=this.detailsRenderer.render(w.result.details);v&&(v.id=m,v.classList.add("lh-details","lh-details--budget","lh-audit"),_.push(v))}}),_.length>0){let[m,w]=this.renderAuditGroup(t.budgets);_.forEach(v=>m.insertBefore(v,w)),m.classList.add("lh-audit-group--budgets"),i.append(m)}return i}renderMetricAuditFilter(e,t){let n=this.dom.createElement("div","lh-metricfilter"),r=this.dom.createChildOf(n,"span","lh-metricfilter__text");r.textContent=g.strings.showRelevantAudits;let i=[{acronym:"All"},...e],a=g.getUniqueSuffix();for(let l of i){let s=`metric-${l.acronym}-${a}`,c=this.dom.createChildOf(n,"input","lh-metricfilter__radio");c.type="radio",c.name=`metricsfilter-${a}`,c.id=s;let d=this.dom.createChildOf(n,"label","lh-metricfilter__label");d.htmlFor=s,d.title=l.result?.title,d.textContent=l.acronym||l.id,l.acronym==="All"&&(c.checked=!0,d.classList.add("lh-metricfilter__label--active")),t.append(n),c.addEventListener("input",p=>{for(let u of t.querySelectorAll("label.lh-metricfilter__label"))u.classList.toggle("lh-metricfilter__label--active",u.htmlFor===s);t.classList.toggle("lh-category--filtered",l.acronym!=="All");for(let u of t.querySelectorAll("div.lh-audit")){if(l.acronym==="All"){u.hidden=!1;continue}u.hidden=!0,l.relevantAudits&&l.relevantAudits.includes(u.id)&&(u.hidden=!1)}let h=t.querySelectorAll("div.lh-audit-group, details.lh-audit-group");for(let u of h){u.hidden=!1;let f=Array.from(u.querySelectorAll("div.lh-audit")),b=!!f.length&&f.every(_=>_.hidden);u.hidden=b}})}}};var j=class o extends N{render(e,t={}){let n=this.dom.createElement("div","lh-category");n.id=e.id,n.append(this.renderCategoryHeader(e,t));let r=e.auditRefs,i=r.filter(c=>c.result.scoreDisplayMode!=="manual"),a=this._renderAudits(i,t);n.append(a);let l=r.filter(c=>c.result.scoreDisplayMode==="manual"),s=this.renderClump("manual",{auditRefs:l,description:e.manualDescription,openByDefault:!0});return n.append(s),n}renderCategoryScore(e,t){if(e.score===null)return super.renderScoreGauge(e,t);let n=this.dom.createComponent("gaugePwa"),r=this.dom.find("a.lh-gauge--pwa__wrapper",n),i=n.querySelector("svg");if(!i)throw new Error("no SVG element found in PWA score gauge template");o._makeSvgReferencesUnique(i);let a=this._getGroupIds(e.auditRefs),l=this._getPassingGroupIds(e.auditRefs);if(l.size===a.size)r.classList.add("lh-badged--all");else for(let s of l)r.classList.add(`lh-badged--${s}`);return this.dom.find(".lh-gauge__label",n).textContent=e.title,r.title=this._getGaugeTooltip(e.auditRefs,t),n}_getGroupIds(e){let t=e.map(n=>n.group).filter(n=>!!n);return new Set(t)}_getPassingGroupIds(e){let t=this._getGroupIds(e);for(let n of e)!y.showAsPassed(n.result)&&n.group&&t.delete(n.group);return t}_getGaugeTooltip(e,t){let n=this._getGroupIds(e),r=[];for(let i of n){let a=e.filter(d=>d.group===i),l=a.length,s=a.filter(d=>y.showAsPassed(d.result)).length,c=t[i].title;r.push(`${c}: ${s}/${l}`)}return r.join(", ")}_renderAudits(e,t){let n=this.renderUnexpandableClump(e,t),r=this._getPassingGroupIds(e);for(let i of r)this.dom.find(`.lh-audit-group--${i}`,n).classList.add("lh-badged");return n}static _makeSvgReferencesUnique(e){let t=e.querySelector("defs");if(!t)return;let n=g.getUniqueSuffix(),r=t.querySelectorAll("[id]");for(let i of r){let a=i.id,l=`${a}-${n}`;i.id=l;let s=e.querySelectorAll(`use[href="#${a}"]`);for(let d of s)d.setAttribute("href",`#${l}`);let c=e.querySelectorAll(`[fill="url(#${a})"]`);for(let d of c)d.setAttribute("fill",`url(#${l})`)}}};var $=class{constructor(e){this._dom=e,this._opts={}}renderReport(e,t,n){if(!this._dom.rootEl&&t){console.warn("Please adopt the new report API in renderer/api.js.");let i=t.closest(".lh-root");i?this._dom.rootEl=i:(t.classList.add("lh-root","lh-vars"),this._dom.rootEl=t)}else this._dom.rootEl&&t&&(this._dom.rootEl=t);n&&(this._opts=n),this._dom.setLighthouseChannel(e.configSettings.channel||"unknown");let r=y.prepareReportResult(e);return this._dom.rootEl.textContent="",this._dom.rootEl.append(this._renderReport(r)),this._dom.rootEl}_renderReportTopbar(e){let t=this._dom.createComponent("topbar"),n=this._dom.find("a.lh-topbar__url",t);return n.textContent=e.finalDisplayedUrl,n.title=e.finalDisplayedUrl,this._dom.safelySetHref(n,e.finalDisplayedUrl),t}_renderReportHeader(){let e=this._dom.createComponent("heading"),t=this._dom.createComponent("scoresWrapper");return this._dom.find(".lh-scores-wrapper-placeholder",e).replaceWith(t),e}_renderReportFooter(e){let t=this._dom.createComponent("footer");return this._renderMetaBlock(e,t),this._dom.find(".lh-footer__version_issue",t).textContent=g.strings.footerIssue,this._dom.find(".lh-footer__version",t).textContent=e.lighthouseVersion,t}_renderMetaBlock(e,t){let n=y.getEmulationDescriptions(e.configSettings||{}),r=e.userAgent.match(/(\w*Chrome\/[\d.]+)/),i=Array.isArray(r)?r[1].replace("/"," ").replace("Chrome","Chromium"):"Chromium",a=e.configSettings.channel,l=e.environment.benchmarkIndex.toFixed(0),s=e.environment.credits?.["axe-core"],c=[`${g.strings.runtimeSettingsBenchmark}: ${l}`,`${g.strings.runtimeSettingsCPUThrottling}: ${n.cpuThrottling}`];n.screenEmulation&&c.push(`${g.strings.runtimeSettingsScreenEmulation}: ${n.screenEmulation}`),s&&c.push(`${g.strings.runtimeSettingsAxeVersion}: ${s}`);let d=[["date",`Captured at ${g.i18n.formatDateTime(e.fetchTime)}`],["devices",`${n.deviceEmulation} with Lighthouse ${e.lighthouseVersion}`,c.join(`
`)],["samples-one",g.strings.runtimeSingleLoad,g.strings.runtimeSingleLoadTooltip],["stopwatch",g.strings.runtimeAnalysisWindow],["networkspeed",`${n.summary}`,`${g.strings.runtimeSettingsNetworkThrottling}: ${n.networkThrottling}`],["chrome",`Using ${i}`+(a?` with ${a}`:""),`${g.strings.runtimeSettingsUANetwork}: "${e.environment.networkUserAgent}"`]],p=this._dom.find(".lh-meta__items",t);for(let[h,u,f]of d){let b=this._dom.createChildOf(p,"li","lh-meta__item");if(b.textContent=u,f){b.classList.add("lh-tooltip-boundary");let _=this._dom.createChildOf(b,"div","lh-tooltip");_.textContent=f}b.classList.add("lh-report-icon",`lh-report-icon--${h}`)}}_renderReportWarnings(e){if(!e.runWarnings||e.runWarnings.length===0)return this._dom.createElement("div");let t=this._dom.createComponent("warningsToplevel"),n=this._dom.find(".lh-warnings__msg",t);n.textContent=g.strings.toplevelWarningsMessage;let r=[];for(let i of e.runWarnings){let a=this._dom.createElement("li");a.append(this._dom.convertMarkdownLinkSnippets(i)),r.push(a)}return this._dom.find("ul",t).append(...r),t}_renderScoreGauges(e,t,n){let r=[],i=[],a=[];for(let l of Object.values(e.categories)){let s=n[l.id]||t,c=s.renderCategoryScore(l,e.categoryGroups||{},{gatherMode:e.gatherMode}),d=this._dom.find("a.lh-gauge__wrapper, a.lh-fraction__wrapper",c);d&&(this._dom.safelySetHref(d,`#${l.id}`),d.addEventListener("click",p=>{if(!d.matches('[href^="#"]'))return;let h=d.getAttribute("href"),u=this._dom.rootEl;if(!h||!u)return;let f=this._dom.find(h,u);p.preventDefault(),f.scrollIntoView()}),this._opts.onPageAnchorRendered?.(d)),y.isPluginCategory(l.id)?a.push(c):s.renderCategoryScore===t.renderCategoryScore?r.push(c):i.push(c)}return[...r,...i,...a]}_renderReport(e){g.apply({providedStrings:e.i18n.rendererFormattedStrings,i18n:new G(e.configSettings.locale),reportJson:e});let t=new V(this._dom,{fullPageScreenshot:e.fullPageScreenshot??void 0,entities:e.entities}),n=new N(this._dom,t),r={performance:new W(this._dom,t),pwa:new j(this._dom,t)},i=this._dom.createElement("div");i.append(this._renderReportHeader());let a=this._dom.createElement("div","lh-container"),l=this._dom.createElement("div","lh-report");l.append(this._renderReportWarnings(e));let s;Object.keys(e.categories).length===1?i.classList.add("lh-header--solo-category"):s=this._dom.createElement("div","lh-scores-header");let d=this._dom.createElement("div");if(d.classList.add("lh-scorescale-wrap"),d.append(this._dom.createComponent("scorescale")),s){let f=this._dom.find(".lh-scores-container",i);s.append(...this._renderScoreGauges(e,n,r)),f.append(s,d);let b=this._dom.createElement("div","lh-sticky-header");b.append(...this._renderScoreGauges(e,n,r)),a.append(b)}let p=this._dom.createElement("div","lh-categories");l.append(p);let h={gatherMode:e.gatherMode};for(let f of Object.values(e.categories)){let b=r[f.id]||n;b.dom.createChildOf(p,"div","lh-category-wrapper").append(b.render(f,e.categoryGroups,h))}n.injectFinalScreenshot(p,e.audits,d);let u=this._dom.createFragment();return this._opts.omitGlobalStyles||u.append(this._dom.createComponent("styles")),this._opts.omitTopbar||u.append(this._renderReportTopbar(e)),u.append(a),l.append(this._renderReportFooter(e)),a.append(i,l),e.fullPageScreenshot&&P.installFullPageScreenshot(this._dom.rootEl,e.fullPageScreenshot.screenshot),u}};function U(o,e){let t=o.rootEl;typeof e>"u"?t.classList.toggle("lh-dark"):t.classList.toggle("lh-dark",e)}var $e=typeof btoa<"u"?btoa:o=>Buffer.from(o).toString("base64"),Be=typeof atob<"u"?atob:o=>Buffer.from(o,"base64").toString();async function Ge(o,e){let t=new TextEncoder().encode(o);if(e.gzip)if(typeof CompressionStream<"u"){let i=new CompressionStream("gzip"),a=i.writable.getWriter();a.write(t),a.close();let l=await new Response(i.readable).arrayBuffer();t=new Uint8Array(l)}else t=window.pako.gzip(o);let n="",r=5e3;for(let i=0;i<t.length;i+=r)n+=String.fromCharCode(...t.subarray(i,i+r));return $e(n)}function We(o,e){let t=Be(o),n=Uint8Array.from(t,r=>r.charCodeAt(0));return e.gzip?window.pako.ungzip(n,{to:"string"}):new TextDecoder().decode(n)}var oe={toBase64:Ge,fromBase64:We};function Z(){let o=window.location.host.endsWith(".vercel.app"),e=new URLSearchParams(window.location.search).has("dev");return o?`https://${window.location.host}/gh-pages`:e?"http://localhost:7333":"https://googlechrome.github.io/lighthouse"}function Q(o){let e=o.generatedTime,t=o.fetchTime||e;return`${o.lighthouseVersion}-${o.finalDisplayedUrl}-${t}`}function je(o,e,t){let n=new URL(e).origin;window.addEventListener("message",function i(a){a.origin===n&&r&&a.data.opened&&(r.postMessage(o,n),window.removeEventListener("message",i))});let r=window.open(e,t)}async function ie(o,e,t){let n=new URL(e),r=!!window.CompressionStream;n.hash=await oe.toBase64(JSON.stringify(o),{gzip:r}),r&&n.searchParams.set("gzip","1"),window.open(n.toString(),t)}async function ae(o){let e="viewer-"+Q(o),t=Z()+"/viewer/";await ie({lhr:o},t,e)}async function le(o){let e="viewer-"+Q(o),t=Z()+"/viewer/";je({lhr:o},t,e)}function se(o){if(!o.audits["script-treemap-data"].details)throw new Error("no script treemap data found");let t={lhr:{mainDocumentUrl:o.mainDocumentUrl,finalUrl:o.finalUrl,finalDisplayedUrl:o.finalDisplayedUrl,audits:{"script-treemap-data":o.audits["script-treemap-data"]},configSettings:{locale:o.configSettings.locale}}},n=Z()+"/treemap/",r="treemap-"+Q(o);ie(t,n,r)}var q=class{constructor(e){this._dom=e,this._toggleEl,this._menuEl,this.onDocumentKeyDown=this.onDocumentKeyDown.bind(this),this.onToggleClick=this.onToggleClick.bind(this),this.onToggleKeydown=this.onToggleKeydown.bind(this),this.onMenuFocusOut=this.onMenuFocusOut.bind(this),this.onMenuKeydown=this.onMenuKeydown.bind(this),this._getNextMenuItem=this._getNextMenuItem.bind(this),this._getNextSelectableNode=this._getNextSelectableNode.bind(this),this._getPreviousMenuItem=this._getPreviousMenuItem.bind(this)}setup(e){this._toggleEl=this._dom.find(".lh-topbar button.lh-tools__button",this._dom.rootEl),this._toggleEl.addEventListener("click",this.onToggleClick),this._toggleEl.addEventListener("keydown",this.onToggleKeydown),this._menuEl=this._dom.find(".lh-topbar div.lh-tools__dropdown",this._dom.rootEl),this._menuEl.addEventListener("keydown",this.onMenuKeydown),this._menuEl.addEventListener("click",e)}close(){this._toggleEl.classList.remove("lh-active"),this._toggleEl.setAttribute("aria-expanded","false"),this._menuEl.contains(this._dom.document().activeElement)&&this._toggleEl.focus(),this._menuEl.removeEventListener("focusout",this.onMenuFocusOut),this._dom.document().removeEventListener("keydown",this.onDocumentKeyDown)}open(e){this._toggleEl.classList.contains("lh-active")?e.focus():this._menuEl.addEventListener("transitionend",()=>{e.focus()},{once:!0}),this._toggleEl.classList.add("lh-active"),this._toggleEl.setAttribute("aria-expanded","true"),this._menuEl.addEventListener("focusout",this.onMenuFocusOut),this._dom.document().addEventListener("keydown",this.onDocumentKeyDown)}onToggleClick(e){e.preventDefault(),e.stopImmediatePropagation(),this._toggleEl.classList.contains("lh-active")?this.close():this.open(this._getNextMenuItem())}onToggleKeydown(e){switch(e.code){case"ArrowUp":e.preventDefault(),this.open(this._getPreviousMenuItem());break;case"ArrowDown":case"Enter":case" ":e.preventDefault(),this.open(this._getNextMenuItem());break;default:}}onMenuKeydown(e){let t=e.target;switch(e.code){case"ArrowUp":e.preventDefault(),this._getPreviousMenuItem(t).focus();break;case"ArrowDown":e.preventDefault(),this._getNextMenuItem(t).focus();break;case"Home":e.preventDefault(),this._getNextMenuItem().focus();break;case"End":e.preventDefault(),this._getPreviousMenuItem().focus();break;default:}}onDocumentKeyDown(e){e.keyCode===27&&this.close()}onMenuFocusOut(e){let t=e.relatedTarget;this._menuEl.contains(t)||this.close()}_getNextSelectableNode(e,t){let n=e.filter(i=>!(!(i instanceof HTMLElement)||i.hasAttribute("disabled")||window.getComputedStyle(i).display==="none")),r=t?n.indexOf(t)+1:0;return r>=n.length&&(r=0),n[r]}_getNextMenuItem(e){let t=Array.from(this._menuEl.childNodes);return this._getNextSelectableNode(t,e)}_getPreviousMenuItem(e){let t=Array.from(this._menuEl.childNodes).reverse();return this._getNextSelectableNode(t,e)}};var K=class{constructor(e,t){this.lhr,this._reportUIFeatures=e,this._dom=t,this._dropDownMenu=new q(this._dom),this._copyAttempt=!1,this.topbarEl,this.categoriesEl,this.stickyHeaderEl,this.highlightEl,this.onDropDownMenuClick=this.onDropDownMenuClick.bind(this),this.onKeyUp=this.onKeyUp.bind(this),this.onCopy=this.onCopy.bind(this),this.collapseAllDetails=this.collapseAllDetails.bind(this)}enable(e){this.lhr=e,this._dom.rootEl.addEventListener("keyup",this.onKeyUp),this._dom.document().addEventListener("copy",this.onCopy),this._dropDownMenu.setup(this.onDropDownMenuClick),this._setUpCollapseDetailsAfterPrinting(),this._dom.find(".lh-topbar__logo",this._dom.rootEl).addEventListener("click",()=>U(this._dom)),this._setupStickyHeader()}onDropDownMenuClick(e){e.preventDefault();let t=e.target;if(!(!t||!t.hasAttribute("data-action"))){switch(t.getAttribute("data-action")){case"copy":this.onCopyButtonClick();break;case"print-summary":this.collapseAllDetails(),this._print();break;case"print-expanded":this.expandAllDetails(),this._print();break;case"save-json":{let n=JSON.stringify(this.lhr,null,2);this._reportUIFeatures._saveFile(new Blob([n],{type:"application/json"}));break}case"save-html":{let n=this._reportUIFeatures.getReportHtml();try{this._reportUIFeatures._saveFile(new Blob([n],{type:"text/html"}))}catch(r){this._dom.fireEventOn("lh-log",this._dom.document(),{cmd:"error",msg:"Could not export as HTML. "+r.message})}break}case"open-viewer":{this._dom.isDevTools()?ae(this.lhr):le(this.lhr);break}case"save-gist":{this._reportUIFeatures.saveAsGist();break}case"toggle-dark":{U(this._dom);break}case"view-unthrottled-trace":this._reportUIFeatures._opts.onViewTrace?.()}this._dropDownMenu.close()}}onCopy(e){this._copyAttempt&&e.clipboardData&&(e.preventDefault(),e.clipboardData.setData("text/plain",JSON.stringify(this.lhr,null,2)),this._dom.fireEventOn("lh-log",this._dom.document(),{cmd:"log",msg:"Report JSON copied to clipboard"})),this._copyAttempt=!1}onCopyButtonClick(){this._dom.fireEventOn("lh-analytics",this._dom.document(),{cmd:"send",fields:{hitType:"event",eventCategory:"report",eventAction:"copy"}});try{this._dom.document().queryCommandSupported("copy")&&(this._copyAttempt=!0,this._dom.document().execCommand("copy")||(this._copyAttempt=!1,this._dom.fireEventOn("lh-log",this._dom.document(),{cmd:"warn",msg:"Your browser does not support copy to clipboard."})))}catch(e){this._copyAttempt=!1,this._dom.fireEventOn("lh-log",this._dom.document(),{cmd:"log",msg:e.message})}}onKeyUp(e){(e.ctrlKey||e.metaKey)&&e.keyCode===80&&this._dropDownMenu.close()}expandAllDetails(){this._dom.findAll(".lh-categories details",this._dom.rootEl).map(t=>t.open=!0)}collapseAllDetails(){this._dom.findAll(".lh-categories details",this._dom.rootEl).map(t=>t.open=!1)}_print(){this._reportUIFeatures._opts.onPrintOverride?this._reportUIFeatures._opts.onPrintOverride(this._dom.rootEl):self.print()}resetUIState(){this._dropDownMenu.close()}_getScrollParent(e){let{overflowY:t}=window.getComputedStyle(e);return t!=="visible"&&t!=="hidden"?e:e.parentElement?this._getScrollParent(e.parentElement):document}_setUpCollapseDetailsAfterPrinting(){"onbeforeprint"in self?self.addEventListener("afterprint",this.collapseAllDetails):self.matchMedia("print").addListener(t=>{t.matches?this.expandAllDetails():this.collapseAllDetails()})}_setupStickyHeader(){this.topbarEl=this._dom.find("div.lh-topbar",this._dom.rootEl),this.categoriesEl=this._dom.find("div.lh-categories",this._dom.rootEl),window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>{try{this.stickyHeaderEl=this._dom.find("div.lh-sticky-header",this._dom.rootEl)}catch{return}this.highlightEl=this._dom.createChildOf(this.stickyHeaderEl,"div","lh-highlighter");let e=this._getScrollParent(this._dom.find(".lh-container",this._dom.rootEl));e.addEventListener("scroll",()=>this._updateStickyHeader());let t=e instanceof window.Document?document.documentElement:e;new window.ResizeObserver(()=>this._updateStickyHeader()).observe(t)}))}_updateStickyHeader(){if(!this.stickyHeaderEl)return;let e=this.topbarEl.getBoundingClientRect().bottom,t=this.categoriesEl.getBoundingClientRect().top,n=e>=t,i=Array.from(this._dom.rootEl.querySelectorAll(".lh-category")).filter(p=>p.getBoundingClientRect().top-window.innerHeight/2<0),a=i.length>0?i.length-1:0,l=this.stickyHeaderEl.querySelectorAll(".lh-gauge__wrapper, .lh-fraction__wrapper"),s=l[a],c=l[0].getBoundingClientRect().left,d=s.getBoundingClientRect().left-c;this.highlightEl.style.transform=`translate(${d}px)`,this.stickyHeaderEl.classList.toggle("lh-sticky-header--visible",n)}};function qe(o,e){let t=e?new Date(e):new Date,n=t.toLocaleTimeString("en-US",{hour12:!1}),r=t.toLocaleDateString("en-US",{year:"numeric",month:"2-digit",day:"2-digit"}).split("/");r.unshift(r.pop());let i=r.join("-");return`${o}_${i}_${n}`.replace(/[/?<>\\:*|"]/g,"-")}function ce(o){let e=new URL(o.finalDisplayedUrl).hostname;return qe(e,o.fetchTime)}function Ke(o){return Array.from(o.tBodies[0].rows)}var B=class{constructor(e,t={}){this.json,this._dom=e,this._opts=t,this._topbar=t.omitTopbar?null:new K(this,e),this.onMediaQueryChange=this.onMediaQueryChange.bind(this)}initFeatures(e){this.json=e,this._fullPageScreenshot=k.getFullPageScreenshot(e),this._topbar&&(this._topbar.enable(e),this._topbar.resetUIState()),this._setupMediaQueryListeners(),this._setupThirdPartyFilter(),this._setupElementScreenshotOverlay(this._dom.rootEl);let t=this._dom.isDevTools()||this._opts.disableDarkMode||this._opts.disableAutoDarkModeAndFireworks;!t&&window.matchMedia("(prefers-color-scheme: dark)").matches&&U(this._dom,!0);let r=["performance","accessibility","best-practices","seo"].every(s=>{let c=e.categories[s];return c&&c.score===1}),i=this._opts.disableFireworks||this._opts.disableAutoDarkModeAndFireworks;if(r&&!i&&(this._enableFireworks(),t||U(this._dom,!0)),e.categories.performance&&e.categories.performance.auditRefs.some(s=>!!(s.group==="metrics"&&e.audits[s.id].errorMessage))){let s=this._dom.find("input.lh-metrics-toggle__input",this._dom.rootEl);s.checked=!0}this.json.audits["script-treemap-data"]&&this.json.audits["script-treemap-data"].details&&this.addButton({text:g.strings.viewTreemapLabel,icon:"treemap",onClick:()=>se(this.json)}),this._opts.onViewTrace&&(e.configSettings.throttlingMethod==="simulate"?this._dom.find('a[data-action="view-unthrottled-trace"]',this._dom.rootEl).classList.remove("lh-hidden"):this.addButton({text:g.strings.viewTraceLabel,onClick:()=>this._opts.onViewTrace?.()})),this._opts.getStandaloneReportHTML&&this._dom.find('a[data-action="save-html"]',this._dom.rootEl).classList.remove("lh-hidden");for(let s of this._dom.findAll("[data-i18n]",this._dom.rootEl)){let d=s.getAttribute("data-i18n");s.textContent=g.strings[d]}}addButton(e){let t=this._dom.rootEl.querySelector(".lh-audit-group--metrics");if(!t)return;let n=t.querySelector(".lh-buttons");n||(n=this._dom.createChildOf(t,"div","lh-buttons"));let r=["lh-button"];e.icon&&(r.push("lh-report-icon"),r.push(`lh-report-icon--${e.icon}`));let i=this._dom.createChildOf(n,"button",r.join(" "));return i.textContent=e.text,i.addEventListener("click",e.onClick),i}resetUIState(){this._topbar&&this._topbar.resetUIState()}getReportHtml(){if(!this._opts.getStandaloneReportHTML)throw new Error("`getStandaloneReportHTML` is not set");return this.resetUIState(),this._opts.getStandaloneReportHTML()}saveAsGist(){throw new Error("Cannot save as gist from base report")}_enableFireworks(){this._dom.find(".lh-scores-container",this._dom.rootEl).classList.add("lh-score100")}_setupMediaQueryListeners(){let e=self.matchMedia("(max-width: 500px)");e.addListener(this.onMediaQueryChange),this.onMediaQueryChange(e)}_resetUIState(){this._topbar&&this._topbar.resetUIState()}onMediaQueryChange(e){this._dom.rootEl.classList.toggle("lh-narrow",e.matches)}_setupThirdPartyFilter(){let e=["uses-rel-preconnect","third-party-facades"],t=["legacy-javascript"];Array.from(this._dom.rootEl.querySelectorAll("table.lh-table")).filter(i=>i.querySelector("td.lh-table-column--url, td.lh-table-column--source-location")).filter(i=>{let a=i.closest(".lh-audit");if(!a)throw new Error(".lh-table not within audit");return!e.includes(a.id)}).forEach(i=>{let a=Ke(i),l=a.filter(_=>!_.classList.contains("lh-sub-item-row")),s=this._getThirdPartyRows(l,k.getFinalDisplayedUrl(this.json)),c=a.some(_=>_.classList.contains("lh-row--even")),d=this._dom.createComponent("3pFilter"),p=this._dom.find("input",d);p.addEventListener("change",_=>{let m=_.target instanceof HTMLInputElement&&!_.target.checked,w=!0,v=l[0];for(;v;){let x=m&&s.includes(v);do v.classList.toggle("lh-row--hidden",x),c&&(v.classList.toggle("lh-row--even",!x&&w),v.classList.toggle("lh-row--odd",!x&&!w)),v=v.nextElementSibling;while(v&&v.classList.contains("lh-sub-item-row"));x||(w=!w)}});let h=s.filter(_=>!_.classList.contains("lh-row--group")).length;this._dom.find(".lh-3p-filter-count",d).textContent=`${h}`,this._dom.find(".lh-3p-ui-string",d).textContent=g.strings.thirdPartyResourcesLabel;let u=s.length===l.length,f=!s.length;if((u||f)&&(this._dom.find("div.lh-3p-filter",d).hidden=!0),!i.parentNode)return;i.parentNode.insertBefore(d,i);let b=i.closest(".lh-audit");if(!b)throw new Error(".lh-table not within audit");t.includes(b.id)&&!u&&p.click()})}_setupElementScreenshotOverlay(e){this._fullPageScreenshot&&P.installOverlayFeature({dom:this._dom,rootEl:e,overlayContainerEl:e,fullPageScreenshot:this._fullPageScreenshot})}_getThirdPartyRows(e,t){let n=k.getRootDomain(t),r=this.json.entities?.find(a=>a.isFirstParty===!0)?.name,i=[];for(let a of e){if(r){if(!a.dataset.entity||a.dataset.entity===r)continue}else{let l=a.querySelector("div.lh-text__url");if(!l)continue;let s=l.dataset.url;if(!s||!(k.getRootDomain(s)!==n))continue}i.push(a)}return i}_saveFile(e){let t=e.type.match("json")?".json":".html",n=ce({finalDisplayedUrl:k.getFinalDisplayedUrl(this.json),fetchTime:this.json.fetchTime})+t;this._opts.onSaveFileOverride?this._opts.onSaveFileOverride(e,n):this._dom.saveFile(e,n)}};function Je(o,e={}){let t=document.createElement("article");t.classList.add("lh-root","lh-vars");let n=new I(t.ownerDocument,t);return new $(n).renderReport(o,t,e),new B(n,e).initFeatures(o),t}function Ze(o,e){return{lhr:o,missingIcuMessageIds:[]}}function Qe(o,e){}function Ye(o){return!1}var Xe={registerLocaleData:Qe,hasLocale:Ye};export{I as DOM,$ as ReportRenderer,B as ReportUIFeatures,Xe as format,Je as renderReport,Ze as swapLocale};
/**
 * @license
 * Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license Copyright 2023 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
/**
 * @license
 * Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Dummy text for ensuring report robustness: <\/script> pre$`post %%LIGHTHOUSE_JSON%%
 * (this is handled by terser)
 */
/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
/**
 * @license
 * Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
