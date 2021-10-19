var hljs=function(){"use strict";var e={exports:{}};function n(e){return e instanceof Map?e.clear=e.delete=e.set=function(){throw new Error("map is read-only")}:e instanceof Set&&(e.add=e.clear=e.delete=function(){throw new Error("set is read-only")}),Object.freeze(e),Object.getOwnPropertyNames(e).forEach((function(t){var i=e[t];"object"!=typeof i||Object.isFrozen(i)||n(i)})),e}e.exports=n,e.exports.default=n;var t=e.exports;class i{constructor(e){void 0===e.data&&(e.data={}),this.data=e.data,this.isMatchIgnored=!1}ignoreMatch(){this.isMatchIgnored=!0}}function a(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#x27;")}function r(e,...n){const t=Object.create(null);for(const n in e)t[n]=e[n];return n.forEach((function(e){for(const n in e)t[n]=e[n]})),t}const o=e=>!!e.kind;class s{constructor(e,n){this.buffer="",this.classPrefix=n.classPrefix,e.walk(this)}addText(e){this.buffer+=a(e)}openNode(e){if(!o(e))return;let n=e.kind;n=e.sublanguage?"language-"+n:((e,{prefix:n})=>{if(e.includes(".")){const t=e.split(".");return[`${n}${t.shift()}`,...t.map((e,n)=>`${e}${"_".repeat(n+1)}`)].join(" ")}return`${n}${e}`})(n,{prefix:this.classPrefix}),this.span(n)}closeNode(e){o(e)&&(this.buffer+="</span>")}value(){return this.buffer}span(e){this.buffer+=`<span class="${e}">`}}class c{constructor(){this.rootNode={children:[]},this.stack=[this.rootNode]}get top(){return this.stack[this.stack.length-1]}get root(){return this.rootNode}add(e){this.top.children.push(e)}openNode(e){const n={kind:e,children:[]};this.add(n),this.stack.push(n)}closeNode(){if(this.stack.length>1)return this.stack.pop()}closeAllNodes(){for(;this.closeNode(););}toJSON(){return JSON.stringify(this.rootNode,null,4)}walk(e){return this.constructor._walk(e,this.rootNode)}static _walk(e,n){return"string"==typeof n?e.addText(n):n.children&&(e.openNode(n),n.children.forEach(n=>this._walk(e,n)),e.closeNode(n)),e}static _collapse(e){"string"!=typeof e&&e.children&&(e.children.every(e=>"string"==typeof e)?e.children=[e.children.join("")]:e.children.forEach(e=>{c._collapse(e)}))}}class l extends c{constructor(e){super(),this.options=e}addKeyword(e,n){""!==e&&(this.openNode(n),this.addText(e),this.closeNode())}addText(e){""!==e&&this.add(e)}addSublanguage(e,n){const t=e.root;t.kind=n,t.sublanguage=!0,this.add(t)}toHTML(){return new s(this,this.options).value()}finalize(){return!0}}function d(e){return e?"string"==typeof e?e:e.source:null}function g(e){return b("(?=",e,")")}function u(e){return b("(?:",e,")*")}function h(e){return b("(?:",e,")?")}function b(...e){return e.map(e=>d(e)).join("")}function f(...e){return"("+(function(e){const n=e[e.length-1];return"object"==typeof n&&n.constructor===Object?(e.splice(e.length-1,1),n):{}}(e).capture?"":"?:")+e.map(e=>d(e)).join("|")+")"}function m(e){return new RegExp(e.toString()+"|").exec("").length-1}const p=/\[(?:[^\\\]]|\\.)*\]|\(\??|\\([1-9][0-9]*)|\\./;function E(e,{joinWith:n}){let t=0;return e.map(e=>{t+=1;const n=t;let i=d(e),a="";for(;i.length>0;){const e=p.exec(i);if(!e){a+=i;break}a+=i.substring(0,e.index),i=i.substring(e.index+e[0].length),"\\"===e[0][0]&&e[1]?a+="\\"+String(Number(e[1])+n):(a+=e[0],"("===e[0]&&t++)}return a}).map(e=>`(${e})`).join(n)}const y="[a-zA-Z]\\w*",w="[a-zA-Z_]\\w*",x="\\b\\d+(\\.\\d+)?",_="(-?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)",v="\\b(0b[01]+)",N={begin:"\\\\[\\s\\S]",relevance:0},k={scope:"string",begin:"'",end:"'",illegal:"\\n",contains:[N]},A={scope:"string",begin:'"',end:'"',illegal:"\\n",contains:[N]},O=function(e,n,t={}){const i=r({scope:"comment",begin:e,end:n,contains:[]},t);i.contains.push({scope:"doctag",begin:"[ ]*(?=(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):)",end:/(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):/,excludeBegin:!0,relevance:0});const a=f("I","a","is","so","us","to","at","if","in","it","on",/[A-Za-z]+['](d|ve|re|ll|t|s|n)/,/[A-Za-z]+[-][a-z]+/,/[A-Za-z][a-z]{2,}/);return i.contains.push({begin:b(/[ ]+/,"(",a,/[.]?[:]?([.][ ]|[ ])/,"){3}")}),i},S=O("//","$"),M=O("/\\*","\\*/"),R=O("#","$"),T={scope:"number",begin:x,relevance:0},I={scope:"number",begin:_,relevance:0},C={scope:"number",begin:v,relevance:0},B={begin:/(?=\/[^/\n]*\/)/,contains:[{scope:"regexp",begin:/\//,end:/\/[gimuy]*/,illegal:/\n/,contains:[N,{begin:/\[/,end:/\]/,relevance:0,contains:[N]}]}]},L={scope:"title",begin:y,relevance:0},j={scope:"title",begin:w,relevance:0},D={begin:"\\.\\s*[a-zA-Z_]\\w*",relevance:0};var P=Object.freeze({__proto__:null,MATCH_NOTHING_RE:/\b\B/,IDENT_RE:y,UNDERSCORE_IDENT_RE:w,NUMBER_RE:x,C_NUMBER_RE:_,BINARY_NUMBER_RE:v,RE_STARTERS_RE:"!|!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|-|-=|/=|/|:|;|<<|<<=|<=|<|===|==|=|>>>=|>>=|>=|>>>|>>|>|\\?|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~",SHEBANG:(e={})=>{const n=/^#![ ]*\//;return e.binary&&(e.begin=b(n,/.*\b/,e.binary,/\b.*/)),r({scope:"meta",begin:n,end:/$/,relevance:0,"on:begin":(e,n)=>{0!==e.index&&n.ignoreMatch()}},e)},BACKSLASH_ESCAPE:N,APOS_STRING_MODE:k,QUOTE_STRING_MODE:A,PHRASAL_WORDS_MODE:{begin:/\b(a|an|the|are|I'm|isn't|don't|doesn't|won't|but|just|should|pretty|simply|enough|gonna|going|wtf|so|such|will|you|your|they|like|more)\b/},COMMENT:O,C_LINE_COMMENT_MODE:S,C_BLOCK_COMMENT_MODE:M,HASH_COMMENT_MODE:R,NUMBER_MODE:T,C_NUMBER_MODE:I,BINARY_NUMBER_MODE:C,REGEXP_MODE:B,TITLE_MODE:L,UNDERSCORE_TITLE_MODE:j,METHOD_GUARD:D,END_SAME_AS_BEGIN:function(e){return Object.assign(e,{"on:begin":(e,n)=>{n.data._beginMatch=e[1]},"on:end":(e,n)=>{n.data._beginMatch!==e[1]&&n.ignoreMatch()}})}});function z(e,n){"."===e.input[e.index-1]&&n.ignoreMatch()}function U(e,n){void 0!==e.className&&(e.scope=e.className,delete e.className)}function H(e,n){n&&e.beginKeywords&&(e.begin="\\b("+e.beginKeywords.split(" ").join("|")+")(?!\\.)(?=\\b|\\s)",e.__beforeBegin=z,e.keywords=e.keywords||e.beginKeywords,delete e.beginKeywords,void 0===e.relevance&&(e.relevance=0))}function $(e,n){Array.isArray(e.illegal)&&(e.illegal=f(...e.illegal))}function Z(e,n){if(e.match){if(e.begin||e.end)throw new Error("begin & end are not supported with match");e.begin=e.match,delete e.match}}function F(e,n){void 0===e.relevance&&(e.relevance=1)}const G=(e,n)=>{if(!e.beforeMatch)return;if(e.starts)throw new Error("beforeMatch cannot be used with starts");const t=Object.assign({},e);Object.keys(e).forEach(n=>{delete e[n]}),e.keywords=t.keywords,e.begin=b(t.beforeMatch,g(t.begin)),e.starts={relevance:0,contains:[Object.assign(t,{endsParent:!0})]},e.relevance=0,delete t.beforeMatch},K=["of","and","for","in","not","or","if","then","parent","list","value"];function W(e,n,t="keyword"){const i=Object.create(null);return"string"==typeof e?a(t,e.split(" ")):Array.isArray(e)?a(t,e):Object.keys(e).forEach((function(t){Object.assign(i,W(e[t],n,t))})),i;function a(e,t){n&&(t=t.map(e=>e.toLowerCase())),t.forEach((function(n){const t=n.split("|");i[t[0]]=[e,X(t[0],t[1])]}))}}function X(e,n){return n?Number(n):function(e){return K.includes(e.toLowerCase())}(e)?0:1}const Q={},q=e=>{console.error(e)},V=(e,...n)=>{console.log("WARN: "+e,...n)},J=(e,n)=>{Q[`${e}/${n}`]||(console.log(`Deprecated as of ${e}. ${n}`),Q[`${e}/${n}`]=!0)},Y=new Error;function ee(e,n,{key:t}){let i=0;const a=e[t],r={},o={};for(let e=1;e<=n.length;e++)o[e+i]=a[e],r[e+i]=!0,i+=m(n[e-1]);e[t]=o,e[t]._emit=r,e[t]._multi=!0}function ne(e){!function(e){e.scope&&"object"==typeof e.scope&&null!==e.scope&&(e.beginScope=e.scope,delete e.scope)}(e),"string"==typeof e.beginScope&&(e.beginScope={_wrap:e.beginScope}),"string"==typeof e.endScope&&(e.endScope={_wrap:e.endScope}),function(e){if(Array.isArray(e.begin)){if(e.skip||e.excludeBegin||e.returnBegin)throw q("skip, excludeBegin, returnBegin not compatible with beginScope: {}"),Y;if("object"!=typeof e.beginScope||null===e.beginScope)throw q("beginScope must be object"),Y;ee(e,e.begin,{key:"beginScope"}),e.begin=E(e.begin,{joinWith:""})}}(e),function(e){if(Array.isArray(e.end)){if(e.skip||e.excludeEnd||e.returnEnd)throw q("skip, excludeEnd, returnEnd not compatible with endScope: {}"),Y;if("object"!=typeof e.endScope||null===e.endScope)throw q("endScope must be object"),Y;ee(e,e.end,{key:"endScope"}),e.end=E(e.end,{joinWith:""})}}(e)}function te(e){function n(n,t){return new RegExp(d(n),"m"+(e.case_insensitive?"i":"")+(e.unicodeRegex?"u":"")+(t?"g":""))}class t{constructor(){this.matchIndexes={},this.regexes=[],this.matchAt=1,this.position=0}addRule(e,n){n.position=this.position++,this.matchIndexes[this.matchAt]=n,this.regexes.push([n,e]),this.matchAt+=m(e)+1}compile(){0===this.regexes.length&&(this.exec=()=>null);const e=this.regexes.map(e=>e[1]);this.matcherRe=n(E(e,{joinWith:"|"}),!0),this.lastIndex=0}exec(e){this.matcherRe.lastIndex=this.lastIndex;const n=this.matcherRe.exec(e);if(!n)return null;const t=n.findIndex((e,n)=>n>0&&void 0!==e),i=this.matchIndexes[t];return n.splice(0,t),Object.assign(n,i)}}class i{constructor(){this.rules=[],this.multiRegexes=[],this.count=0,this.lastIndex=0,this.regexIndex=0}getMatcher(e){if(this.multiRegexes[e])return this.multiRegexes[e];const n=new t;return this.rules.slice(e).forEach(([e,t])=>n.addRule(e,t)),n.compile(),this.multiRegexes[e]=n,n}resumingScanAtSamePosition(){return 0!==this.regexIndex}considerAll(){this.regexIndex=0}addRule(e,n){this.rules.push([e,n]),"begin"===n.type&&this.count++}exec(e){const n=this.getMatcher(this.regexIndex);n.lastIndex=this.lastIndex;let t=n.exec(e);if(this.resumingScanAtSamePosition())if(t&&t.index===this.lastIndex);else{const n=this.getMatcher(0);n.lastIndex=this.lastIndex+1,t=n.exec(e)}return t&&(this.regexIndex+=t.position+1,this.regexIndex===this.count&&this.considerAll()),t}}if(e.compilerExtensions||(e.compilerExtensions=[]),e.contains&&e.contains.includes("self"))throw new Error("ERR: contains `self` is not supported at the top-level of a language.  See documentation.");return e.classNameAliases=r(e.classNameAliases||{}),function t(a,o){const s=a;if(a.isCompiled)return s;[U,Z,ne,G].forEach(e=>e(a,o)),e.compilerExtensions.forEach(e=>e(a,o)),a.__beforeBegin=null,[H,$,F].forEach(e=>e(a,o)),a.isCompiled=!0;let c=null;return"object"==typeof a.keywords&&a.keywords.$pattern&&(a.keywords=Object.assign({},a.keywords),c=a.keywords.$pattern,delete a.keywords.$pattern),c=c||/\w+/,a.keywords&&(a.keywords=W(a.keywords,e.case_insensitive)),s.keywordPatternRe=n(c,!0),o&&(a.begin||(a.begin=/\B|\b/),s.beginRe=n(s.begin),a.end||a.endsWithParent||(a.end=/\B|\b/),a.end&&(s.endRe=n(s.end)),s.terminatorEnd=d(s.end)||"",a.endsWithParent&&o.terminatorEnd&&(s.terminatorEnd+=(a.end?"|":"")+o.terminatorEnd)),a.illegal&&(s.illegalRe=n(a.illegal)),a.contains||(a.contains=[]),a.contains=[].concat(...a.contains.map((function(e){return function(e){e.variants&&!e.cachedVariants&&(e.cachedVariants=e.variants.map((function(n){return r(e,{variants:null},n)})));if(e.cachedVariants)return e.cachedVariants;if(ie(e))return r(e,{starts:e.starts?r(e.starts):null});if(Object.isFrozen(e))return r(e);return e}("self"===e?a:e)}))),a.contains.forEach((function(e){t(e,s)})),a.starts&&t(a.starts,o),s.matcher=function(e){const n=new i;return e.contains.forEach(e=>n.addRule(e.begin,{rule:e,type:"begin"})),e.terminatorEnd&&n.addRule(e.terminatorEnd,{type:"end"}),e.illegal&&n.addRule(e.illegal,{type:"illegal"}),n}(s),s}(e)}function ie(e){return!!e&&(e.endsWithParent||ie(e.starts))}class ae extends Error{constructor(e,n){super(e),this.name="HTMLInjectionError",this.html=n}}const re=a,oe=r,se=Symbol("nomatch");var ce=function(e){const n=Object.create(null),a=Object.create(null),r=[];let o=!0;const s="Could not find the language '{}', did you forget to load/include a language module?",c={disableAutodetect:!0,name:"Plain text",contains:[]};let d={ignoreUnescapedHTML:!1,throwUnescapedHTML:!1,noHighlightRe:/^(no-?highlight)$/i,languageDetectRe:/\blang(?:uage)?-([\w-]+)\b/i,classPrefix:"hljs-",cssSelector:"pre code",languages:null,__emitter:l};function m(e){return d.noHighlightRe.test(e)}function p(e,n,t){let i="",a="";"object"==typeof n?(i=e,t=n.ignoreIllegals,a=n.language):(J("10.7.0","highlight(lang, code, ...args) has been deprecated."),J("10.7.0","Please use highlight(code, options) instead.\nhttps://github.com/highlightjs/highlight.js/issues/2277"),a=e,i=n),void 0===t&&(t=!0);const r={code:i,language:a};A("before:highlight",r);const o=r.result?r.result:E(r.language,r.code,t);return o.code=r.code,A("after:highlight",o),o}function E(e,t,a,r){const c=Object.create(null);function l(){if(!k.keywords)return void O.addText(S);let e=0;k.keywordPatternRe.lastIndex=0;let n=k.keywordPatternRe.exec(S),t="";for(;n;){t+=S.substring(e,n.index);const a=x.case_insensitive?n[0].toLowerCase():n[0],r=(i=a,k.keywords[i]);if(r){const[e,i]=r;if(O.addText(t),t="",c[a]=(c[a]||0)+1,c[a]<=7&&(M+=i),e.startsWith("_"))t+=n[0];else{const t=x.classNameAliases[e]||e;O.addKeyword(n[0],t)}}else t+=n[0];e=k.keywordPatternRe.lastIndex,n=k.keywordPatternRe.exec(S)}var i;t+=S.substr(e),O.addText(t)}function g(){null!=k.subLanguage?function(){if(""===S)return;let e=null;if("string"==typeof k.subLanguage){if(!n[k.subLanguage])return void O.addText(S);e=E(k.subLanguage,S,!0,A[k.subLanguage]),A[k.subLanguage]=e._top}else e=y(S,k.subLanguage.length?k.subLanguage:null);k.relevance>0&&(M+=e.relevance),O.addSublanguage(e._emitter,e.language)}():l(),S=""}function u(e,n){let t=1;for(;void 0!==n[t];){if(!e._emit[t]){t++;continue}const i=x.classNameAliases[e[t]]||e[t],a=n[t];i?O.addKeyword(a,i):(S=a,l(),S=""),t++}}function h(e,n){return e.scope&&"string"==typeof e.scope&&O.openNode(x.classNameAliases[e.scope]||e.scope),e.beginScope&&(e.beginScope._wrap?(O.addKeyword(S,x.classNameAliases[e.beginScope._wrap]||e.beginScope._wrap),S=""):e.beginScope._multi&&(u(e.beginScope,n),S="")),k=Object.create(e,{parent:{value:k}}),k}function b(e,n,t){let a=function(e,n){const t=e&&e.exec(n);return t&&0===t.index}(e.endRe,t);if(a){if(e["on:end"]){const t=new i(e);e["on:end"](n,t),t.isMatchIgnored&&(a=!1)}if(a){for(;e.endsParent&&e.parent;)e=e.parent;return e}}if(e.endsWithParent)return b(e.parent,n,t)}function f(e){return 0===k.matcher.regexIndex?(S+=e[0],1):(I=!0,0)}function m(e){const n=e[0],i=t.substr(e.index),a=b(k,e,i);if(!a)return se;const r=k;k.endScope&&k.endScope._wrap?(g(),O.addKeyword(n,k.endScope._wrap)):k.endScope&&k.endScope._multi?(g(),u(k.endScope,e)):r.skip?S+=n:(r.returnEnd||r.excludeEnd||(S+=n),g(),r.excludeEnd&&(S=n));do{k.scope&&O.closeNode(),k.skip||k.subLanguage||(M+=k.relevance),k=k.parent}while(k!==a.parent);return a.starts&&h(a.starts,e),r.returnEnd?0:n.length}let p={};function w(n,r){const s=r&&r[0];if(S+=n,null==s)return g(),0;if("begin"===p.type&&"end"===r.type&&p.index===r.index&&""===s){if(S+=t.slice(r.index,r.index+1),!o){const n=new Error(`0 width match regex (${e})`);throw n.languageName=e,n.badRule=p.rule,n}return 1}if(p=r,"begin"===r.type)return function(e){const n=e[0],t=e.rule,a=new i(t),r=[t.__beforeBegin,t["on:begin"]];for(const t of r)if(t&&(t(e,a),a.isMatchIgnored))return f(n);return t.skip?S+=n:(t.excludeBegin&&(S+=n),g(),t.returnBegin||t.excludeBegin||(S=n)),h(t,e),t.returnBegin?0:n.length}(r);if("illegal"===r.type&&!a){const e=new Error('Illegal lexeme "'+s+'" for mode "'+(k.scope||"<unnamed>")+'"');throw e.mode=k,e}if("end"===r.type){const e=m(r);if(e!==se)return e}if("illegal"===r.type&&""===s)return 1;if(T>1e5&&T>3*r.index){throw new Error("potential infinite loop, way more iterations than matches")}return S+=s,s.length}const x=v(e);if(!x)throw q(s.replace("{}",e)),new Error('Unknown language: "'+e+'"');const _=te(x);let N="",k=r||_;const A={},O=new d.__emitter(d);!function(){const e=[];for(let n=k;n!==x;n=n.parent)n.scope&&e.unshift(n.scope);e.forEach(e=>O.openNode(e))}();let S="",M=0,R=0,T=0,I=!1;try{for(k.matcher.considerAll();;){T++,I?I=!1:k.matcher.considerAll(),k.matcher.lastIndex=R;const e=k.matcher.exec(t);if(!e)break;const n=w(t.substring(R,e.index),e);R=e.index+n}return w(t.substr(R)),O.closeAllNodes(),O.finalize(),N=O.toHTML(),{language:e,value:N,relevance:M,illegal:!1,_emitter:O,_top:k}}catch(n){if(n.message&&n.message.includes("Illegal"))return{language:e,value:re(t),illegal:!0,relevance:0,_illegalBy:{message:n.message,index:R,context:t.slice(R-100,R+100),mode:n.mode,resultSoFar:N},_emitter:O};if(o)return{language:e,value:re(t),illegal:!1,relevance:0,errorRaised:n,_emitter:O,_top:k};throw n}}function y(e,t){t=t||d.languages||Object.keys(n);const i=function(e){const n={value:re(e),illegal:!1,relevance:0,_top:c,_emitter:new d.__emitter(d)};return n._emitter.addText(e),n}(e),a=t.filter(v).filter(k).map(n=>E(n,e,!1));a.unshift(i);const r=a.sort((e,n)=>{if(e.relevance!==n.relevance)return n.relevance-e.relevance;if(e.language&&n.language){if(v(e.language).supersetOf===n.language)return 1;if(v(n.language).supersetOf===e.language)return-1}return 0}),[o,s]=r,l=o;return l.secondBest=s,l}function w(e){let n=null;const t=function(e){let n=e.className+" ";n+=e.parentNode?e.parentNode.className:"";const t=d.languageDetectRe.exec(n);if(t){const n=v(t[1]);return n||(V(s.replace("{}",t[1])),V("Falling back to no-highlight mode for this block.",e)),n?t[1]:"no-highlight"}return n.split(/\s+/).find(e=>m(e)||v(e))}(e);if(m(t))return;if(A("before:highlightElement",{el:e,language:t}),e.children.length>0&&(d.ignoreUnescapedHTML||(console.warn("One of your code blocks includes unescaped HTML. This is a potentially serious security risk."),console.warn("https://github.com/highlightjs/highlight.js/issues/2886"),console.warn(e)),d.throwUnescapedHTML)){throw new ae("One of your code blocks includes unescaped HTML.",e.innerHTML)}n=e;const i=n.textContent,r=t?p(i,{language:t,ignoreIllegals:!0}):y(i);e.innerHTML=r.value,function(e,n,t){const i=n&&a[n]||t;e.classList.add("hljs"),e.classList.add("language-"+i)}(e,t,r.language),e.result={language:r.language,re:r.relevance,relevance:r.relevance},r.secondBest&&(e.secondBest={language:r.secondBest.language,relevance:r.secondBest.relevance}),A("after:highlightElement",{el:e,result:r,text:i})}let x=!1;function _(){if("loading"===document.readyState)return void(x=!0);document.querySelectorAll(d.cssSelector).forEach(w)}function v(e){return e=(e||"").toLowerCase(),n[e]||n[a[e]]}function N(e,{languageName:n}){"string"==typeof e&&(e=[e]),e.forEach(e=>{a[e.toLowerCase()]=n})}function k(e){const n=v(e);return n&&!n.disableAutodetect}function A(e,n){const t=e;r.forEach((function(e){e[t]&&e[t](n)}))}"undefined"!=typeof window&&window.addEventListener&&window.addEventListener("DOMContentLoaded",(function(){x&&_()}),!1),Object.assign(e,{highlight:p,highlightAuto:y,highlightAll:_,highlightElement:w,highlightBlock:function(e){return J("10.7.0","highlightBlock will be removed entirely in v12.0"),J("10.7.0","Please use highlightElement now."),w(e)},configure:function(e){d=oe(d,e)},initHighlighting:()=>{_(),J("10.6.0","initHighlighting() deprecated.  Use highlightAll() now.")},initHighlightingOnLoad:function(){_(),J("10.6.0","initHighlightingOnLoad() deprecated.  Use highlightAll() now.")},registerLanguage:function(t,i){let a=null;try{a=i(e)}catch(e){if(q("Language definition for '{}' could not be registered.".replace("{}",t)),!o)throw e;q(e),a=c}a.name||(a.name=t),n[t]=a,a.rawDefinition=i.bind(null,e),a.aliases&&N(a.aliases,{languageName:t})},unregisterLanguage:function(e){delete n[e];for(const n of Object.keys(a))a[n]===e&&delete a[n]},listLanguages:function(){return Object.keys(n)},getLanguage:v,registerAliases:N,autoDetection:k,inherit:oe,addPlugin:function(e){!function(e){e["before:highlightBlock"]&&!e["before:highlightElement"]&&(e["before:highlightElement"]=n=>{e["before:highlightBlock"](Object.assign({block:n.el},n))}),e["after:highlightBlock"]&&!e["after:highlightElement"]&&(e["after:highlightElement"]=n=>{e["after:highlightBlock"](Object.assign({block:n.el},n))})}(e),r.push(e)}}),e.debugMode=function(){o=!1},e.safeMode=function(){o=!0},e.versionString="11.3.1",e.regex={concat:b,lookahead:g,either:f,optional:h,anyNumberOfTimes:u};for(const e in P)"object"==typeof P[e]&&t(P[e]);return Object.assign(e,P),e}({}),le=ce;ce.HighlightJS=ce,ce.default=ce;const de=["a","abbr","address","article","aside","audio","b","blockquote","body","button","canvas","caption","cite","code","dd","del","details","dfn","div","dl","dt","em","fieldset","figcaption","figure","footer","form","h1","h2","h3","h4","h5","h6","header","hgroup","html","i","iframe","img","input","ins","kbd","label","legend","li","main","mark","menu","nav","object","ol","p","q","quote","samp","section","span","strong","summary","sup","table","tbody","td","textarea","tfoot","th","thead","time","tr","ul","var","video"],ge=["any-hover","any-pointer","aspect-ratio","color","color-gamut","color-index","device-aspect-ratio","device-height","device-width","display-mode","forced-colors","grid","height","hover","inverted-colors","monochrome","orientation","overflow-block","overflow-inline","pointer","prefers-color-scheme","prefers-contrast","prefers-reduced-motion","prefers-reduced-transparency","resolution","scan","scripting","update","width","min-width","max-width","min-height","max-height"],ue=["active","any-link","blank","checked","current","default","defined","dir","disabled","drop","empty","enabled","first","first-child","first-of-type","fullscreen","future","focus","focus-visible","focus-within","has","host","host-context","hover","indeterminate","in-range","invalid","is","lang","last-child","last-of-type","left","link","local-link","not","nth-child","nth-col","nth-last-child","nth-last-col","nth-last-of-type","nth-of-type","only-child","only-of-type","optional","out-of-range","past","placeholder-shown","read-only","read-write","required","right","root","scope","target","target-within","user-invalid","valid","visited","where"],he=["after","backdrop","before","cue","cue-region","first-letter","first-line","grammar-error","marker","part","placeholder","selection","slotted","spelling-error"],be=["align-content","align-items","align-self","all","animation","animation-delay","animation-direction","animation-duration","animation-fill-mode","animation-iteration-count","animation-name","animation-play-state","animation-timing-function","backface-visibility","background","background-attachment","background-clip","background-color","background-image","background-origin","background-position","background-repeat","background-size","border","border-bottom","border-bottom-color","border-bottom-left-radius","border-bottom-right-radius","border-bottom-style","border-bottom-width","border-collapse","border-color","border-image","border-image-outset","border-image-repeat","border-image-slice","border-image-source","border-image-width","border-left","border-left-color","border-left-style","border-left-width","border-radius","border-right","border-right-color","border-right-style","border-right-width","border-spacing","border-style","border-top","border-top-color","border-top-left-radius","border-top-right-radius","border-top-style","border-top-width","border-width","bottom","box-decoration-break","box-shadow","box-sizing","break-after","break-before","break-inside","caption-side","caret-color","clear","clip","clip-path","clip-rule","color","column-count","column-fill","column-gap","column-rule","column-rule-color","column-rule-style","column-rule-width","column-span","column-width","columns","contain","content","content-visibility","counter-increment","counter-reset","cue","cue-after","cue-before","cursor","direction","display","empty-cells","filter","flex","flex-basis","flex-direction","flex-flow","flex-grow","flex-shrink","flex-wrap","float","flow","font","font-display","font-family","font-feature-settings","font-kerning","font-language-override","font-size","font-size-adjust","font-smoothing","font-stretch","font-style","font-synthesis","font-variant","font-variant-caps","font-variant-east-asian","font-variant-ligatures","font-variant-numeric","font-variant-position","font-variation-settings","font-weight","gap","glyph-orientation-vertical","grid","grid-area","grid-auto-columns","grid-auto-flow","grid-auto-rows","grid-column","grid-column-end","grid-column-start","grid-gap","grid-row","grid-row-end","grid-row-start","grid-template","grid-template-areas","grid-template-columns","grid-template-rows","hanging-punctuation","height","hyphens","icon","image-orientation","image-rendering","image-resolution","ime-mode","isolation","justify-content","left","letter-spacing","line-break","line-height","list-style","list-style-image","list-style-position","list-style-type","margin","margin-bottom","margin-left","margin-right","margin-top","marks","mask","mask-border","mask-border-mode","mask-border-outset","mask-border-repeat","mask-border-slice","mask-border-source","mask-border-width","mask-clip","mask-composite","mask-image","mask-mode","mask-origin","mask-position","mask-repeat","mask-size","mask-type","max-height","max-width","min-height","min-width","mix-blend-mode","nav-down","nav-index","nav-left","nav-right","nav-up","none","normal","object-fit","object-position","opacity","order","orphans","outline","outline-color","outline-offset","outline-style","outline-width","overflow","overflow-wrap","overflow-x","overflow-y","padding","padding-bottom","padding-left","padding-right","padding-top","page-break-after","page-break-before","page-break-inside","pause","pause-after","pause-before","perspective","perspective-origin","pointer-events","position","quotes","resize","rest","rest-after","rest-before","right","row-gap","scroll-margin","scroll-margin-block","scroll-margin-block-end","scroll-margin-block-start","scroll-margin-bottom","scroll-margin-inline","scroll-margin-inline-end","scroll-margin-inline-start","scroll-margin-left","scroll-margin-right","scroll-margin-top","scroll-padding","scroll-padding-block","scroll-padding-block-end","scroll-padding-block-start","scroll-padding-bottom","scroll-padding-inline","scroll-padding-inline-end","scroll-padding-inline-start","scroll-padding-left","scroll-padding-right","scroll-padding-top","scroll-snap-align","scroll-snap-stop","scroll-snap-type","shape-image-threshold","shape-margin","shape-outside","speak","speak-as","src","tab-size","table-layout","text-align","text-align-all","text-align-last","text-combine-upright","text-decoration","text-decoration-color","text-decoration-line","text-decoration-style","text-emphasis","text-emphasis-color","text-emphasis-position","text-emphasis-style","text-indent","text-justify","text-orientation","text-overflow","text-rendering","text-shadow","text-transform","text-underline-position","top","transform","transform-box","transform-origin","transform-style","transition","transition-delay","transition-duration","transition-property","transition-timing-function","unicode-bidi","vertical-align","visibility","voice-balance","voice-duration","voice-family","voice-pitch","voice-range","voice-rate","voice-stress","voice-volume","white-space","widows","width","will-change","word-break","word-spacing","word-wrap","writing-mode","z-index"].reverse();const fe="[A-Za-z$_][0-9A-Za-z$_]*",me=["as","in","of","if","for","while","finally","var","new","function","do","return","void","else","break","catch","instanceof","with","throw","case","default","try","switch","continue","typeof","delete","let","yield","const","class","debugger","async","await","static","import","from","export","extends"],pe=["true","false","null","undefined","NaN","Infinity"],Ee=["Object","Function","Boolean","Symbol","Math","Date","Number","BigInt","String","RegExp","Array","Float32Array","Float64Array","Int8Array","Uint8Array","Uint8ClampedArray","Int16Array","Int32Array","Uint16Array","Uint32Array","BigInt64Array","BigUint64Array","Set","Map","WeakSet","WeakMap","ArrayBuffer","SharedArrayBuffer","Atomics","DataView","JSON","Promise","Generator","GeneratorFunction","AsyncFunction","Reflect","Proxy","Intl","WebAssembly"],ye=["Error","EvalError","InternalError","RangeError","ReferenceError","SyntaxError","TypeError","URIError"],we=["setInterval","setTimeout","clearInterval","clearTimeout","require","exports","eval","isFinite","isNaN","parseFloat","parseInt","decodeURI","decodeURIComponent","encodeURI","encodeURIComponent","escape","unescape"],xe=["arguments","this","super","console","window","document","localStorage","module","global"],_e=[].concat(we,Ee,ye);return le.configure({tabReplace:"  ",languages:["abnf","css","http","javascript","json","xml"]}),le.registerLanguage("abnf",(function(e){const n=e.regex,t=e.COMMENT(/;/,/$/);return{name:"Augmented Backus-Naur Form",illegal:/[!@#$^&',?+~`|:]/,keywords:["ALPHA","BIT","CHAR","CR","CRLF","CTL","DIGIT","DQUOTE","HEXDIG","HTAB","LF","LWSP","OCTET","SP","VCHAR","WSP"],contains:[{scope:"operator",match:/=\/?/},{scope:"attribute",match:n.concat(/^[a-zA-Z][a-zA-Z0-9-]*/,/(?=\s*=)/)},t,{scope:"symbol",match:/%b[0-1]+(-[0-1]+|(\.[0-1]+)+)?/},{scope:"symbol",match:/%d[0-9]+(-[0-9]+|(\.[0-9]+)+)?/},{scope:"symbol",match:/%x[0-9A-F]+(-[0-9A-F]+|(\.[0-9A-F]+)+)?/},{scope:"symbol",match:/%[si](?=".*")/},e.QUOTE_STRING_MODE,e.NUMBER_MODE]}})),le.registerLanguage("css",(function(e){const n=e.regex,t=(e=>({IMPORTANT:{scope:"meta",begin:"!important"},BLOCK_COMMENT:e.C_BLOCK_COMMENT_MODE,HEXCOLOR:{scope:"number",begin:/#(([0-9a-fA-F]{3,4})|(([0-9a-fA-F]{2}){3,4}))\b/},FUNCTION_DISPATCH:{className:"built_in",begin:/[\w-]+(?=\()/},ATTRIBUTE_SELECTOR_MODE:{scope:"selector-attr",begin:/\[/,end:/\]/,illegal:"$",contains:[e.APOS_STRING_MODE,e.QUOTE_STRING_MODE]},CSS_NUMBER_MODE:{scope:"number",begin:e.NUMBER_RE+"(%|em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|pt|pc|px|deg|grad|rad|turn|s|ms|Hz|kHz|dpi|dpcm|dppx)?",relevance:0},CSS_VARIABLE:{className:"attr",begin:/--[A-Za-z][A-Za-z0-9_-]*/}}))(e),i=[e.APOS_STRING_MODE,e.QUOTE_STRING_MODE];return{name:"CSS",case_insensitive:!0,illegal:/[=|'\$]/,keywords:{keyframePosition:"from to"},classNameAliases:{keyframePosition:"selector-tag"},contains:[t.BLOCK_COMMENT,{begin:/-(webkit|moz|ms|o)-(?=[a-z])/},t.CSS_NUMBER_MODE,{className:"selector-id",begin:/#[A-Za-z0-9_-]+/,relevance:0},{className:"selector-class",begin:"\\.[a-zA-Z-][a-zA-Z0-9_-]*",relevance:0},t.ATTRIBUTE_SELECTOR_MODE,{className:"selector-pseudo",variants:[{begin:":("+ue.join("|")+")"},{begin:":(:)?("+he.join("|")+")"}]},t.CSS_VARIABLE,{className:"attribute",begin:"\\b("+be.join("|")+")\\b"},{begin:/:/,end:/[;}{]/,contains:[t.BLOCK_COMMENT,t.HEXCOLOR,t.IMPORTANT,t.CSS_NUMBER_MODE,...i,{begin:/(url|data-uri)\(/,end:/\)/,relevance:0,keywords:{built_in:"url data-uri"},contains:[{className:"string",begin:/[^)]/,endsWithParent:!0,excludeEnd:!0}]},t.FUNCTION_DISPATCH]},{begin:n.lookahead(/@/),end:"[{;]",relevance:0,illegal:/:/,contains:[{className:"keyword",begin:/@-?\w[\w]*(-\w+)*/},{begin:/\s/,endsWithParent:!0,excludeEnd:!0,relevance:0,keywords:{$pattern:/[a-z-]+/,keyword:"and or not only",attribute:ge.join(" ")},contains:[{begin:/[a-z-]+(?=:)/,className:"attribute"},...i,t.CSS_NUMBER_MODE]}]},{className:"selector-tag",begin:"\\b("+de.join("|")+")\\b"}]}})),le.registerLanguage("http",(function(e){const n="HTTP/(2|1\\.[01])",t={className:"attribute",begin:e.regex.concat("^",/[A-Za-z][A-Za-z0-9-]*/,"(?=\\:\\s)"),starts:{contains:[{className:"punctuation",begin:/: /,relevance:0,starts:{end:"$",relevance:0}}]}},i=[t,{begin:"\\n\\n",starts:{subLanguage:[],endsWithParent:!0}}];return{name:"HTTP",aliases:["https"],illegal:/\S/,contains:[{begin:"^(?="+n+" \\d{3})",end:/$/,contains:[{className:"meta",begin:n},{className:"number",begin:"\\b\\d{3}\\b"}],starts:{end:/\b\B/,illegal:/\S/,contains:i}},{begin:"(?=^[A-Z]+ (.*?) "+n+"$)",end:/$/,contains:[{className:"string",begin:" ",end:" ",excludeBegin:!0,excludeEnd:!0},{className:"meta",begin:n},{className:"keyword",begin:"[A-Z]+"}],starts:{end:/\b\B/,illegal:/\S/,contains:i}},e.inherit(t,{relevance:0})]}})),le.registerLanguage("javascript",(function(e){const n=e.regex,t=fe,i="<>",a="</>",r={begin:/<[A-Za-z0-9\\._:-]+/,end:/\/[A-Za-z0-9\\._:-]+>|\/>/,isTrulyOpeningTag:(e,n)=>{const t=e[0].length+e.index,i=e.input[t];if("<"===i||","===i)return void n.ignoreMatch();let a;">"===i&&(((e,{after:n})=>{const t="</"+e[0].slice(1);return-1!==e.input.indexOf(t,n)})(e,{after:t})||n.ignoreMatch());(a=e.input.substr(t).match(/^\s+extends\s+/))&&0===a.index&&n.ignoreMatch()}},o={$pattern:fe,keyword:me,literal:pe,built_in:_e,"variable.language":xe},s="\\.([0-9](_?[0-9])*)",c="0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*",l={className:"number",variants:[{begin:`(\\b(${c})((${s})|\\.)?|(${s}))[eE][+-]?([0-9](_?[0-9])*)\\b`},{begin:`\\b(${c})\\b((${s})\\b|\\.)?|(${s})\\b`},{begin:"\\b(0|[1-9](_?[0-9])*)n\\b"},{begin:"\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*n?\\b"},{begin:"\\b0[bB][0-1](_?[0-1])*n?\\b"},{begin:"\\b0[oO][0-7](_?[0-7])*n?\\b"},{begin:"\\b0[0-7]+n?\\b"}],relevance:0},d={className:"subst",begin:"\\$\\{",end:"\\}",keywords:o,contains:[]},g={begin:"html`",end:"",starts:{end:"`",returnEnd:!1,contains:[e.BACKSLASH_ESCAPE,d],subLanguage:"xml"}},u={begin:"css`",end:"",starts:{end:"`",returnEnd:!1,contains:[e.BACKSLASH_ESCAPE,d],subLanguage:"css"}},h={className:"string",begin:"`",end:"`",contains:[e.BACKSLASH_ESCAPE,d]},b={className:"comment",variants:[e.COMMENT(/\/\*\*(?!\/)/,"\\*/",{relevance:0,contains:[{begin:"(?=@[A-Za-z]+)",relevance:0,contains:[{className:"doctag",begin:"@[A-Za-z]+"},{className:"type",begin:"\\{",end:"\\}",excludeEnd:!0,excludeBegin:!0,relevance:0},{className:"variable",begin:t+"(?=\\s*(-)|$)",endsParent:!0,relevance:0},{begin:/(?=[^\n])\s/,relevance:0}]}]}),e.C_BLOCK_COMMENT_MODE,e.C_LINE_COMMENT_MODE]},f=[e.APOS_STRING_MODE,e.QUOTE_STRING_MODE,g,u,h,l];d.contains=f.concat({begin:/\{/,end:/\}/,keywords:o,contains:["self"].concat(f)});const m=[].concat(b,d.contains),p=m.concat([{begin:/\(/,end:/\)/,keywords:o,contains:["self"].concat(m)}]),E={className:"params",begin:/\(/,end:/\)/,excludeBegin:!0,excludeEnd:!0,keywords:o,contains:p},y={variants:[{match:[/class/,/\s+/,t,/\s+/,/extends/,/\s+/,n.concat(t,"(",n.concat(/\./,t),")*")],scope:{1:"keyword",3:"title.class",5:"keyword",7:"title.class.inherited"}},{match:[/class/,/\s+/,t],scope:{1:"keyword",3:"title.class"}}]},w={relevance:0,match:n.either(/\bJSON/,/\b[A-Z][a-z]+([A-Z][a-z]+|\d)*/,/\b[A-Z]{2,}([A-Z][a-z]+|\d)+/),className:"title.class",keywords:{_:[...Ee,...ye]}},x={variants:[{match:[/function/,/\s+/,t,/(?=\s*\()/]},{match:[/function/,/\s*(?=\()/]}],className:{1:"keyword",3:"title.function"},label:"func.def",contains:[E],illegal:/%/},_={match:n.concat(/\b/,(v=[...we,"super"],n.concat("(?!",v.join("|"),")")),t,n.lookahead(/\(/)),className:"title.function",relevance:0};var v;const N={begin:n.concat(/\./,n.lookahead(n.concat(t,/(?![0-9A-Za-z$_(])/))),end:t,excludeBegin:!0,keywords:"prototype",className:"property",relevance:0},k={match:[/get|set/,/\s+/,t,/(?=\()/],className:{1:"keyword",3:"title.function"},contains:[{begin:/\(\)/},E]},A="(\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)|"+e.UNDERSCORE_IDENT_RE+")\\s*=>",O={match:[/const|var|let/,/\s+/,t,/\s*/,/=\s*/,n.lookahead(A)],className:{1:"keyword",3:"title.function"},contains:[E]};return{name:"Javascript",aliases:["js","jsx","mjs","cjs"],keywords:o,exports:{PARAMS_CONTAINS:p,CLASS_REFERENCE:w},illegal:/#(?![$_A-z])/,contains:[e.SHEBANG({label:"shebang",binary:"node",relevance:5}),{label:"use_strict",className:"meta",relevance:10,begin:/^\s*['"]use (strict|asm)['"]/},e.APOS_STRING_MODE,e.QUOTE_STRING_MODE,g,u,h,b,l,w,{className:"attr",begin:t+n.lookahead(":"),relevance:0},O,{begin:"("+e.RE_STARTERS_RE+"|\\b(case|return|throw)\\b)\\s*",keywords:"return throw case",relevance:0,contains:[b,e.REGEXP_MODE,{className:"function",begin:A,returnBegin:!0,end:"\\s*=>",contains:[{className:"params",variants:[{begin:e.UNDERSCORE_IDENT_RE,relevance:0},{className:null,begin:/\(\s*\)/,skip:!0},{begin:/\(/,end:/\)/,excludeBegin:!0,excludeEnd:!0,keywords:o,contains:p}]}]},{begin:/,/,relevance:0},{match:/\s+/,relevance:0},{variants:[{begin:i,end:a},{match:/<[A-Za-z0-9\\._:-]+\s*\/>/},{begin:r.begin,"on:begin":r.isTrulyOpeningTag,end:r.end}],subLanguage:"xml",contains:[{begin:r.begin,end:r.end,skip:!0,contains:["self"]}]}]},x,{beginKeywords:"while if switch catch for"},{begin:"\\b(?!function)"+e.UNDERSCORE_IDENT_RE+"\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)\\s*\\{",returnBegin:!0,label:"func.def",contains:[E,e.inherit(e.TITLE_MODE,{begin:t,className:"title.function"})]},{match:/\.\.\./,relevance:0},N,{match:"\\$"+t,relevance:0},{match:[/\bconstructor(?=\s*\()/],className:{1:"title.function"},contains:[E]},_,{relevance:0,match:/\b[A-Z][A-Z_0-9]+\b/,className:"variable.constant"},y,k,{match:/\$[(.]/}]}})),le.registerLanguage("json",(function(e){const n={beginKeywords:["true","false","null"].join(" ")};return{name:"JSON",contains:[{className:"attr",begin:/"(\\.|[^\\"\r\n])*"(?=\s*:)/,relevance:1.01},{match:/[{}[\],:]/,className:"punctuation",relevance:0},e.QUOTE_STRING_MODE,n,e.C_NUMBER_MODE,e.C_LINE_COMMENT_MODE,e.C_BLOCK_COMMENT_MODE],illegal:"\\S"}})),le.registerLanguage("xml",(function(e){const n=e.regex,t=n.concat(/[A-Z_]/,n.optional(/[A-Z0-9_.-]*:/),/[A-Z0-9_.-]*/),i={className:"symbol",begin:/&[a-z]+;|&#[0-9]+;|&#x[a-f0-9]+;/},a={begin:/\s/,contains:[{className:"keyword",begin:/#?[a-z_][a-z1-9_-]+/,illegal:/\n/}]},r=e.inherit(a,{begin:/\(/,end:/\)/}),o=e.inherit(e.APOS_STRING_MODE,{className:"string"}),s=e.inherit(e.QUOTE_STRING_MODE,{className:"string"}),c={endsWithParent:!0,illegal:/</,relevance:0,contains:[{className:"attr",begin:/[A-Za-z0-9._:-]+/,relevance:0},{begin:/=\s*/,relevance:0,contains:[{className:"string",endsParent:!0,variants:[{begin:/"/,end:/"/,contains:[i]},{begin:/'/,end:/'/,contains:[i]},{begin:/[^\s"'=<>`]+/}]}]}]};return{name:"HTML, XML",aliases:["html","xhtml","rss","atom","xjb","xsd","xsl","plist","wsf","svg"],case_insensitive:!0,contains:[{className:"meta",begin:/<![a-z]/,end:/>/,relevance:10,contains:[a,s,o,r,{begin:/\[/,end:/\]/,contains:[{className:"meta",begin:/<![a-z]/,end:/>/,contains:[a,r,s,o]}]}]},e.COMMENT(/<!--/,/-->/,{relevance:10}),{begin:/<!\[CDATA\[/,end:/\]\]>/,relevance:10},i,{className:"meta",begin:/<\?xml/,end:/\?>/,relevance:10},{className:"tag",begin:/<style(?=\s|>)/,end:/>/,keywords:{name:"style"},contains:[c],starts:{end:/<\/style>/,returnEnd:!0,subLanguage:["css","xml"]}},{className:"tag",begin:/<script(?=\s|>)/,end:/>/,keywords:{name:"script"},contains:[c],starts:{end:/<\/script>/,returnEnd:!0,subLanguage:["javascript","handlebars","xml"]}},{className:"tag",begin:/<>|<\/>/},{className:"tag",begin:n.concat(/</,n.lookahead(n.concat(t,n.either(/\/>/,/>/,/\s/)))),end:/\/?>/,contains:[{className:"name",begin:t,relevance:0,starts:c}]},{className:"tag",begin:n.concat(/<\//,n.lookahead(n.concat(t,/>/))),contains:[{className:"name",begin:t,relevance:0},{begin:/>/,relevance:0,endsParent:!0}]}]}})),le}();
