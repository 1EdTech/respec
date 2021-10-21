window.respecVersion = "26.16.1";

(function () {
  'use strict';

  // @ts-check
  const inAmd = !!window.require;
  if (!inAmd) {
    /**
     * @type {any}
     * @param {string[]} deps
     * @param {(...modules: any[]) => void} callback
     */
    const require = function (deps, callback) {
      const modules = deps.map(dep => {
        if (!(dep in window.require.modules)) {
          throw new Error(`Unsupported dependency name: ${dep}`);
        }
        return window.require.modules[dep];
      });
      Promise.all(modules).then(results => callback(...results));
    };
    require.modules = {};
    window.require = require;
  }

  /**
   * @param {string} name
   * @param {object | Promise<object>} object
   */
  function expose(name, object) {
    if (!inAmd) {
      window.require.modules[name] = object;
    }
  }

  // @ts-check
  /**
   * Module core/l10n
   *
   * Looks at the lang attribute on the root element and uses it
   * to manage the config.l10n object so that other parts of the system can
   * localize their text.
   */

  const name$19 = "core/l10n";

  const html$1 = document.documentElement;
  if (html$1 && !html$1.hasAttribute("lang")) {
    html$1.lang = "en";
    if (!html$1.hasAttribute("dir")) {
      html$1.dir = "ltr";
    }
  }

  const l10n$o = {};

  const lang$2 = html$1.lang;

  function run$15(config) {
    config.l10n = l10n$o[lang$2] || l10n$o.en;
  }

  var l10n$p = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$19,
    l10n: l10n$o,
    lang: lang$2,
    run: run$15
  });

  const instanceOfAny = (object, constructors) => constructors.some((c) => object instanceof c);

  let idbProxyableTypes;
  let cursorAdvanceMethods;
  // This is a function to prevent it throwing up in node environments.
  function getIdbProxyableTypes() {
      return (idbProxyableTypes ||
          (idbProxyableTypes = [
              IDBDatabase,
              IDBObjectStore,
              IDBIndex,
              IDBCursor,
              IDBTransaction,
          ]));
  }
  // This is a function to prevent it throwing up in node environments.
  function getCursorAdvanceMethods() {
      return (cursorAdvanceMethods ||
          (cursorAdvanceMethods = [
              IDBCursor.prototype.advance,
              IDBCursor.prototype.continue,
              IDBCursor.prototype.continuePrimaryKey,
          ]));
  }
  const cursorRequestMap = new WeakMap();
  const transactionDoneMap = new WeakMap();
  const transactionStoreNamesMap = new WeakMap();
  const transformCache = new WeakMap();
  const reverseTransformCache = new WeakMap();
  function promisifyRequest(request) {
      const promise = new Promise((resolve, reject) => {
          const unlisten = () => {
              request.removeEventListener('success', success);
              request.removeEventListener('error', error);
          };
          const success = () => {
              resolve(wrap(request.result));
              unlisten();
          };
          const error = () => {
              reject(request.error);
              unlisten();
          };
          request.addEventListener('success', success);
          request.addEventListener('error', error);
      });
      promise
          .then((value) => {
          // Since cursoring reuses the IDBRequest (*sigh*), we cache it for later retrieval
          // (see wrapFunction).
          if (value instanceof IDBCursor) {
              cursorRequestMap.set(value, request);
          }
          // Catching to avoid "Uncaught Promise exceptions"
      })
          .catch(() => { });
      // This mapping exists in reverseTransformCache but doesn't doesn't exist in transformCache. This
      // is because we create many promises from a single IDBRequest.
      reverseTransformCache.set(promise, request);
      return promise;
  }
  function cacheDonePromiseForTransaction(tx) {
      // Early bail if we've already created a done promise for this transaction.
      if (transactionDoneMap.has(tx))
          return;
      const done = new Promise((resolve, reject) => {
          const unlisten = () => {
              tx.removeEventListener('complete', complete);
              tx.removeEventListener('error', error);
              tx.removeEventListener('abort', error);
          };
          const complete = () => {
              resolve();
              unlisten();
          };
          const error = () => {
              reject(tx.error || new DOMException('AbortError', 'AbortError'));
              unlisten();
          };
          tx.addEventListener('complete', complete);
          tx.addEventListener('error', error);
          tx.addEventListener('abort', error);
      });
      // Cache it for later retrieval.
      transactionDoneMap.set(tx, done);
  }
  let idbProxyTraps = {
      get(target, prop, receiver) {
          if (target instanceof IDBTransaction) {
              // Special handling for transaction.done.
              if (prop === 'done')
                  return transactionDoneMap.get(target);
              // Polyfill for objectStoreNames because of Edge.
              if (prop === 'objectStoreNames') {
                  return target.objectStoreNames || transactionStoreNamesMap.get(target);
              }
              // Make tx.store return the only store in the transaction, or undefined if there are many.
              if (prop === 'store') {
                  return receiver.objectStoreNames[1]
                      ? undefined
                      : receiver.objectStore(receiver.objectStoreNames[0]);
              }
          }
          // Else transform whatever we get back.
          return wrap(target[prop]);
      },
      set(target, prop, value) {
          target[prop] = value;
          return true;
      },
      has(target, prop) {
          if (target instanceof IDBTransaction &&
              (prop === 'done' || prop === 'store')) {
              return true;
          }
          return prop in target;
      },
  };
  function replaceTraps(callback) {
      idbProxyTraps = callback(idbProxyTraps);
  }
  function wrapFunction(func) {
      // Due to expected object equality (which is enforced by the caching in `wrap`), we
      // only create one new func per func.
      // Edge doesn't support objectStoreNames (booo), so we polyfill it here.
      if (func === IDBDatabase.prototype.transaction &&
          !('objectStoreNames' in IDBTransaction.prototype)) {
          return function (storeNames, ...args) {
              const tx = func.call(unwrap(this), storeNames, ...args);
              transactionStoreNamesMap.set(tx, storeNames.sort ? storeNames.sort() : [storeNames]);
              return wrap(tx);
          };
      }
      // Cursor methods are special, as the behaviour is a little more different to standard IDB. In
      // IDB, you advance the cursor and wait for a new 'success' on the IDBRequest that gave you the
      // cursor. It's kinda like a promise that can resolve with many values. That doesn't make sense
      // with real promises, so each advance methods returns a new promise for the cursor object, or
      // undefined if the end of the cursor has been reached.
      if (getCursorAdvanceMethods().includes(func)) {
          return function (...args) {
              // Calling the original function with the proxy as 'this' causes ILLEGAL INVOCATION, so we use
              // the original object.
              func.apply(unwrap(this), args);
              return wrap(cursorRequestMap.get(this));
          };
      }
      return function (...args) {
          // Calling the original function with the proxy as 'this' causes ILLEGAL INVOCATION, so we use
          // the original object.
          return wrap(func.apply(unwrap(this), args));
      };
  }
  function transformCachableValue(value) {
      if (typeof value === 'function')
          return wrapFunction(value);
      // This doesn't return, it just creates a 'done' promise for the transaction,
      // which is later returned for transaction.done (see idbObjectHandler).
      if (value instanceof IDBTransaction)
          cacheDonePromiseForTransaction(value);
      if (instanceOfAny(value, getIdbProxyableTypes()))
          return new Proxy(value, idbProxyTraps);
      // Return the same value back if we're not going to transform it.
      return value;
  }
  function wrap(value) {
      // We sometimes generate multiple promises from a single IDBRequest (eg when cursoring), because
      // IDB is weird and a single IDBRequest can yield many responses, so these can't be cached.
      if (value instanceof IDBRequest)
          return promisifyRequest(value);
      // If we've already transformed this value before, reuse the transformed value.
      // This is faster, but it also provides object equality.
      if (transformCache.has(value))
          return transformCache.get(value);
      const newValue = transformCachableValue(value);
      // Not all types are transformed.
      // These may be primitive types, so they can't be WeakMap keys.
      if (newValue !== value) {
          transformCache.set(value, newValue);
          reverseTransformCache.set(newValue, value);
      }
      return newValue;
  }
  const unwrap = (value) => reverseTransformCache.get(value);

  /**
   * Open a database.
   *
   * @param name Name of the database.
   * @param version Schema version.
   * @param callbacks Additional callbacks.
   */
  function openDB(name, version, { blocked, upgrade, blocking, terminated } = {}) {
      const request = indexedDB.open(name, version);
      const openPromise = wrap(request);
      if (upgrade) {
          request.addEventListener('upgradeneeded', (event) => {
              upgrade(wrap(request.result), event.oldVersion, event.newVersion, wrap(request.transaction));
          });
      }
      if (blocked)
          request.addEventListener('blocked', () => blocked());
      openPromise
          .then((db) => {
          if (terminated)
              db.addEventListener('close', () => terminated());
          if (blocking)
              db.addEventListener('versionchange', () => blocking());
      })
          .catch(() => { });
      return openPromise;
  }
  /**
   * Delete a database.
   *
   * @param name Name of the database.
   */
  function deleteDB(name, { blocked } = {}) {
      const request = indexedDB.deleteDatabase(name);
      if (blocked)
          request.addEventListener('blocked', () => blocked());
      return wrap(request).then(() => undefined);
  }

  const readMethods = ['get', 'getKey', 'getAll', 'getAllKeys', 'count'];
  const writeMethods = ['put', 'add', 'delete', 'clear'];
  const cachedMethods = new Map();
  function getMethod(target, prop) {
      if (!(target instanceof IDBDatabase &&
          !(prop in target) &&
          typeof prop === 'string')) {
          return;
      }
      if (cachedMethods.get(prop))
          return cachedMethods.get(prop);
      const targetFuncName = prop.replace(/FromIndex$/, '');
      const useIndex = prop !== targetFuncName;
      const isWrite = writeMethods.includes(targetFuncName);
      if (
      // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
      !(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) ||
          !(isWrite || readMethods.includes(targetFuncName))) {
          return;
      }
      const method = async function (storeName, ...args) {
          // isWrite ? 'readwrite' : undefined gzipps better, but fails in Edge :(
          const tx = this.transaction(storeName, isWrite ? 'readwrite' : 'readonly');
          let target = tx.store;
          if (useIndex)
              target = target.index(args.shift());
          // Must reject if op rejects.
          // If it's a write operation, must reject if tx.done rejects.
          // Must reject with op rejection first.
          // Must resolve with op value.
          // Must handle both promises (no unhandled rejections)
          return (await Promise.all([
              target[targetFuncName](...args),
              isWrite && tx.done,
          ]))[0];
      };
      cachedMethods.set(prop, method);
      return method;
  }
  replaceTraps((oldTraps) => ({
      ...oldTraps,
      get: (target, prop, receiver) => getMethod(target, prop) || oldTraps.get(target, prop, receiver),
      has: (target, prop) => !!getMethod(target, prop) || oldTraps.has(target, prop),
  }));

  var _idb = /*#__PURE__*/Object.freeze({
    __proto__: null,
    deleteDB: deleteDB,
    openDB: openDB,
    unwrap: unwrap,
    wrap: wrap
  });

  /**
   * Implementation of MIMEType and MIME Type parser from
   * https://mimesniff.spec.whatwg.org/
   */

  const HTTPTokenCodePoints = /^[!#$%&'*+-.^`|~\w]+$/;

  // "HTTP whitespace is U+000A LF, U+000D CR, U+0009 TAB or U+0020 SPACE."
  // eslint-disable-next-line no-control-regex
  const HTTPWhiteSpace = /[\u000A\u000D\u0009\u0020]/u;

  // An HTTP quoted-string token code point is
  // U+0009 TAB,
  // a code point in the range U+0020 SPACE to U+007E (~), inclusive,
  // or a code point in the range U+0080 through U+00FF (ÿ), inclusive.
  // eslint-disable-next-line no-control-regex
  const HTTPQuotedString = /^[\u0009\u{0020}-\{u0073}\u{0080}-\u{00FF}]+$/u;

  class MIMEType$1 {
    constructor(input) {
      const { type, subtype, params } = parseMimeType(input);
      this.type = type.trim().toLowerCase();
      this.subtype = subtype.trimEnd().toLowerCase();
      this.parameters = new Map(Object.entries(params));
    }

    /**
     * @see https://mimesniff.spec.whatwg.org/#mime-type-essence
     */
    get essence() {
      return `${this.type}/${this.subtype}`;
    }

    toString() {
      return serialize$2(this);
    }
  }
  /**
   * https://mimesniff.spec.whatwg.org/#serialize-a-mime-type
   */
  function serialize$2(mimeType) {
    const { parameters, essence } = mimeType;
    if (!parameters.size) {
      return essence;
    }
    let paramStr = ";";
    for (const [key, value] of parameters.entries()) {
      paramStr += key;
      if (value !== null) {
        if (HTTPTokenCodePoints.test(value)) {
          paramStr += `=${value}`;
        } else {
          paramStr += `="${value}"`;
        }
      } else {
        // null or empty string
        paramStr += '=""';
      }
      paramStr += ";";
    }
    // remove final ";"
    return mimeType.essence + paramStr.slice(0, -1);
  }

  /**
   * Implementation of https://mimesniff.spec.whatwg.org/#parse-a-mime-type
   * parser state machines if as follows, params and param values are optional and can be null:
   *
   * "type"
   *    -> "subtype"
   *      -> "param-start" (ignores white space)
   *         -> "param-name"
   *            -> "param-value"
   *              -> "collect-quoted-string"
   *                -> "ignore-input-until-next-param"
   *
   *
   *
   * @param {String} input
   */
  function parseMimeType(input) {
    input = input.trim();
    if (!input) {
      throw new TypeError("Invalid input.");
    }

    let type = "";
    let subtype = "";
    let paramName = "";
    let paramValue = null;
    let params = new Map();
    let parserMode = "type";
    let inputArray = Array.from(input); // retain unicode chars
    for (let position = 0; position < inputArray.length; position++) {
      const char = inputArray[position];
      switch (parserMode) {
        case "type":
          if (char === "/") {
            parserMode = "subtype";
            continue;
          }
          type += char;
          break;
        case "subtype":
          if (char === ";") {
            parserMode = "param-start";
            continue;
          }
          subtype += char;
          break;
        case "param-start":
          // Skip HTTP white space
          if (HTTPWhiteSpace.test(char) || char === ";") {
            continue;
          }
          paramName += char;
          parserMode = "param-name";
          break;
        case "param-name":
          if (char === "=" || char === ";") {
            if (char === "=") {
              parserMode = "param-value";
              paramValue = null;
              continue;
            }
            params.set(paramName.toLowerCase(), null);
            paramName = "";
            continue;
          }
          paramName += char;
          break;
        case "param-value":
          if (char == '"') {
            parserMode = "collect-quoted-string";
            continue;
          }
          if (char === ";") {
            paramValue = paramValue.trimEnd();
            parserMode = "param-start";
            storeParam(params, paramName, paramValue);
            paramName = "";
            continue;
          }
          paramValue = typeof paramValue === "string" ? paramValue + char : char;
          break;
        case "collect-quoted-string":
          if (char === '"') {
            storeParam(params, paramName, paramValue);
            parserMode = "ignore-input-until-next-param";
            paramName = "";
            paramValue = null;
            continue;
          }
          if (char === "\\") {
            continue;
          }
          paramValue = typeof paramValue === "string" ? paramValue + char : char;
          break;
        case "ignore-input-until-next-param":
          if (char !== ";") {
            continue;
          }
          parserMode = "param-start";
          break;
        default:
          throw new Error(
            `State machine error - unknown parser mode: ${parserMode} `
          );
      }
    }
    if (paramName) {
      storeParam(params, paramName, paramValue);
    }
    if (type.trim() === "" || !HTTPTokenCodePoints.test(type)) {
      throw new TypeError("Invalid type");
    }
    if (subtype.trim() === "" || !HTTPTokenCodePoints.test(subtype)) {
      throw new TypeError("Invalid subtype");
    }
    return {
      type,
      subtype,
      params: Object.fromEntries(params.entries()),
    };
  }

  function storeParam(params, paramName, paramValue) {
    if (
      (paramName &&
        paramName !== "" &&
        !params.has(paramName) &&
        HTTPQuotedString.test(paramValue)) ||
      paramValue === null
    ) {
      params.set(paramName.toLowerCase(), paramValue);
    }
  }

  /**
   * marked - a markdown parser
   * Copyright (c) 2011-2021, Christopher Jeffrey. (MIT Licensed)
   * https://github.com/markedjs/marked
   */

  /**
   * DO NOT EDIT THIS FILE
   * The code in this file is generated from files in ./src/
   */

  var esmEntry$1 = {exports: {}};

  var defaults$5 = {exports: {}};

  function getDefaults$1() {
    return {
      baseUrl: null,
      breaks: false,
      extensions: null,
      gfm: true,
      headerIds: true,
      headerPrefix: '',
      highlight: null,
      langPrefix: 'language-',
      mangle: true,
      pedantic: false,
      renderer: null,
      sanitize: false,
      sanitizer: null,
      silent: false,
      smartLists: false,
      smartypants: false,
      tokenizer: null,
      walkTokens: null,
      xhtml: false
    };
  }

  function changeDefaults$1(newDefaults) {
    defaults$5.exports.defaults = newDefaults;
  }

  defaults$5.exports = {
    defaults: getDefaults$1(),
    getDefaults: getDefaults$1,
    changeDefaults: changeDefaults$1
  };

  /**
   * Helpers
   */

  const escapeTest = /[&<>"']/;
  const escapeReplace = /[&<>"']/g;
  const escapeTestNoEncode = /[<>"']|&(?!#?\w+;)/;
  const escapeReplaceNoEncode = /[<>"']|&(?!#?\w+;)/g;
  const escapeReplacements = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  const getEscapeReplacement = (ch) => escapeReplacements[ch];
  function escape$3(html, encode) {
    if (encode) {
      if (escapeTest.test(html)) {
        return html.replace(escapeReplace, getEscapeReplacement);
      }
    } else {
      if (escapeTestNoEncode.test(html)) {
        return html.replace(escapeReplaceNoEncode, getEscapeReplacement);
      }
    }

    return html;
  }

  const unescapeTest = /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig;

  function unescape$1(html) {
    // explicitly match decimal, hex, and named HTML entities
    return html.replace(unescapeTest, (_, n) => {
      n = n.toLowerCase();
      if (n === 'colon') return ':';
      if (n.charAt(0) === '#') {
        return n.charAt(1) === 'x'
          ? String.fromCharCode(parseInt(n.substring(2), 16))
          : String.fromCharCode(+n.substring(1));
      }
      return '';
    });
  }

  const caret = /(^|[^\[])\^/g;
  function edit$1(regex, opt) {
    regex = regex.source || regex;
    opt = opt || '';
    const obj = {
      replace: (name, val) => {
        val = val.source || val;
        val = val.replace(caret, '$1');
        regex = regex.replace(name, val);
        return obj;
      },
      getRegex: () => {
        return new RegExp(regex, opt);
      }
    };
    return obj;
  }

  const nonWordAndColonTest = /[^\w:]/g;
  const originIndependentUrl = /^$|^[a-z][a-z0-9+.-]*:|^[?#]/i;
  function cleanUrl$1(sanitize, base, href) {
    if (sanitize) {
      let prot;
      try {
        prot = decodeURIComponent(unescape$1(href))
          .replace(nonWordAndColonTest, '')
          .toLowerCase();
      } catch (e) {
        return null;
      }
      if (prot.indexOf('javascript:') === 0 || prot.indexOf('vbscript:') === 0 || prot.indexOf('data:') === 0) {
        return null;
      }
    }
    if (base && !originIndependentUrl.test(href)) {
      href = resolveUrl(base, href);
    }
    try {
      href = encodeURI(href).replace(/%25/g, '%');
    } catch (e) {
      return null;
    }
    return href;
  }

  const baseUrls = {};
  const justDomain = /^[^:]+:\/*[^/]*$/;
  const protocol = /^([^:]+:)[\s\S]*$/;
  const domain = /^([^:]+:\/*[^/]*)[\s\S]*$/;

  function resolveUrl(base, href) {
    if (!baseUrls[' ' + base]) {
      // we can ignore everything in base after the last slash of its path component,
      // but we might need to add _that_
      // https://tools.ietf.org/html/rfc3986#section-3
      if (justDomain.test(base)) {
        baseUrls[' ' + base] = base + '/';
      } else {
        baseUrls[' ' + base] = rtrim$1(base, '/', true);
      }
    }
    base = baseUrls[' ' + base];
    const relativeBase = base.indexOf(':') === -1;

    if (href.substring(0, 2) === '//') {
      if (relativeBase) {
        return href;
      }
      return base.replace(protocol, '$1') + href;
    } else if (href.charAt(0) === '/') {
      if (relativeBase) {
        return href;
      }
      return base.replace(domain, '$1') + href;
    } else {
      return base + href;
    }
  }

  const noopTest$1 = { exec: function noopTest() {} };

  function merge$2(obj) {
    let i = 1,
      target,
      key;

    for (; i < arguments.length; i++) {
      target = arguments[i];
      for (key in target) {
        if (Object.prototype.hasOwnProperty.call(target, key)) {
          obj[key] = target[key];
        }
      }
    }

    return obj;
  }

  function splitCells$1(tableRow, count) {
    // ensure that every cell-delimiting pipe has a space
    // before it to distinguish it from an escaped pipe
    const row = tableRow.replace(/\|/g, (match, offset, str) => {
        let escaped = false,
          curr = offset;
        while (--curr >= 0 && str[curr] === '\\') escaped = !escaped;
        if (escaped) {
          // odd number of slashes means | is escaped
          // so we leave it alone
          return '|';
        } else {
          // add space before unescaped |
          return ' |';
        }
      }),
      cells = row.split(/ \|/);
    let i = 0;

    // First/last cell in a row cannot be empty if it has no leading/trailing pipe
    if (!cells[0].trim()) { cells.shift(); }
    if (!cells[cells.length - 1].trim()) { cells.pop(); }

    if (cells.length > count) {
      cells.splice(count);
    } else {
      while (cells.length < count) cells.push('');
    }

    for (; i < cells.length; i++) {
      // leading or trailing whitespace is ignored per the gfm spec
      cells[i] = cells[i].trim().replace(/\\\|/g, '|');
    }
    return cells;
  }

  // Remove trailing 'c's. Equivalent to str.replace(/c*$/, '').
  // /c*$/ is vulnerable to REDOS.
  // invert: Remove suffix of non-c chars instead. Default falsey.
  function rtrim$1(str, c, invert) {
    const l = str.length;
    if (l === 0) {
      return '';
    }

    // Length of suffix matching the invert condition.
    let suffLen = 0;

    // Step left until we fail to match the invert condition.
    while (suffLen < l) {
      const currChar = str.charAt(l - suffLen - 1);
      if (currChar === c && !invert) {
        suffLen++;
      } else if (currChar !== c && invert) {
        suffLen++;
      } else {
        break;
      }
    }

    return str.substr(0, l - suffLen);
  }

  function findClosingBracket$1(str, b) {
    if (str.indexOf(b[1]) === -1) {
      return -1;
    }
    const l = str.length;
    let level = 0,
      i = 0;
    for (; i < l; i++) {
      if (str[i] === '\\') {
        i++;
      } else if (str[i] === b[0]) {
        level++;
      } else if (str[i] === b[1]) {
        level--;
        if (level < 0) {
          return i;
        }
      }
    }
    return -1;
  }

  function checkSanitizeDeprecation$1(opt) {
    if (opt && opt.sanitize && !opt.silent) {
      console.warn('marked(): sanitize and sanitizer parameters are deprecated since version 0.7.0, should not be used and will be removed in the future. Read more here: https://marked.js.org/#/USING_ADVANCED.md#options');
    }
  }

  // copied from https://stackoverflow.com/a/5450113/806777
  function repeatString$1(pattern, count) {
    if (count < 1) {
      return '';
    }
    let result = '';
    while (count > 1) {
      if (count & 1) {
        result += pattern;
      }
      count >>= 1;
      pattern += pattern;
    }
    return result + pattern;
  }

  var helpers = {
    escape: escape$3,
    unescape: unescape$1,
    edit: edit$1,
    cleanUrl: cleanUrl$1,
    resolveUrl,
    noopTest: noopTest$1,
    merge: merge$2,
    splitCells: splitCells$1,
    rtrim: rtrim$1,
    findClosingBracket: findClosingBracket$1,
    checkSanitizeDeprecation: checkSanitizeDeprecation$1,
    repeatString: repeatString$1
  };

  const { defaults: defaults$4 } = defaults$5.exports;
  const {
    rtrim,
    splitCells,
    escape: escape$2,
    findClosingBracket
  } = helpers;

  function outputLink(cap, link, raw, lexer) {
    const href = link.href;
    const title = link.title ? escape$2(link.title) : null;
    const text = cap[1].replace(/\\([\[\]])/g, '$1');

    if (cap[0].charAt(0) !== '!') {
      lexer.state.inLink = true;
      const token = {
        type: 'link',
        raw,
        href,
        title,
        text,
        tokens: lexer.inlineTokens(text, [])
      };
      lexer.state.inLink = false;
      return token;
    } else {
      return {
        type: 'image',
        raw,
        href,
        title,
        text: escape$2(text)
      };
    }
  }

  function indentCodeCompensation(raw, text) {
    const matchIndentToCode = raw.match(/^(\s+)(?:```)/);

    if (matchIndentToCode === null) {
      return text;
    }

    const indentToCode = matchIndentToCode[1];

    return text
      .split('\n')
      .map(node => {
        const matchIndentInNode = node.match(/^\s+/);
        if (matchIndentInNode === null) {
          return node;
        }

        const [indentInNode] = matchIndentInNode;

        if (indentInNode.length >= indentToCode.length) {
          return node.slice(indentToCode.length);
        }

        return node;
      })
      .join('\n');
  }

  /**
   * Tokenizer
   */
  var Tokenizer_1$1 = class Tokenizer {
    constructor(options) {
      this.options = options || defaults$4;
    }

    space(src) {
      const cap = this.rules.block.newline.exec(src);
      if (cap) {
        if (cap[0].length > 1) {
          return {
            type: 'space',
            raw: cap[0]
          };
        }
        return { raw: '\n' };
      }
    }

    code(src) {
      const cap = this.rules.block.code.exec(src);
      if (cap) {
        const text = cap[0].replace(/^ {1,4}/gm, '');
        return {
          type: 'code',
          raw: cap[0],
          codeBlockStyle: 'indented',
          text: !this.options.pedantic
            ? rtrim(text, '\n')
            : text
        };
      }
    }

    fences(src) {
      const cap = this.rules.block.fences.exec(src);
      if (cap) {
        const raw = cap[0];
        const text = indentCodeCompensation(raw, cap[3] || '');

        return {
          type: 'code',
          raw,
          lang: cap[2] ? cap[2].trim() : cap[2],
          text
        };
      }
    }

    heading(src) {
      const cap = this.rules.block.heading.exec(src);
      if (cap) {
        let text = cap[2].trim();

        // remove trailing #s
        if (/#$/.test(text)) {
          const trimmed = rtrim(text, '#');
          if (this.options.pedantic) {
            text = trimmed.trim();
          } else if (!trimmed || / $/.test(trimmed)) {
            // CommonMark requires space before trailing #s
            text = trimmed.trim();
          }
        }

        const token = {
          type: 'heading',
          raw: cap[0],
          depth: cap[1].length,
          text: text,
          tokens: []
        };
        this.lexer.inline(token.text, token.tokens);
        return token;
      }
    }

    hr(src) {
      const cap = this.rules.block.hr.exec(src);
      if (cap) {
        return {
          type: 'hr',
          raw: cap[0]
        };
      }
    }

    blockquote(src) {
      const cap = this.rules.block.blockquote.exec(src);
      if (cap) {
        const text = cap[0].replace(/^ *> ?/gm, '');

        return {
          type: 'blockquote',
          raw: cap[0],
          tokens: this.lexer.blockTokens(text, []),
          text
        };
      }
    }

    list(src) {
      let cap = this.rules.block.list.exec(src);
      if (cap) {
        let raw, istask, ischecked, indent, i, blankLine, endsWithBlankLine,
          line, lines, itemContents;

        let bull = cap[1].trim();
        const isordered = bull.length > 1;

        const list = {
          type: 'list',
          raw: '',
          ordered: isordered,
          start: isordered ? +bull.slice(0, -1) : '',
          loose: false,
          items: []
        };

        bull = isordered ? `\\d{1,9}\\${bull.slice(-1)}` : `\\${bull}`;

        if (this.options.pedantic) {
          bull = isordered ? bull : '[*+-]';
        }

        // Get next list item
        const itemRegex = new RegExp(`^( {0,3}${bull})((?: [^\\n]*| *)(?:\\n[^\\n]*)*(?:\\n|$))`);

        // Get each top-level item
        while (src) {
          if (this.rules.block.hr.test(src)) { // End list if we encounter an HR (possibly move into itemRegex?)
            break;
          }

          if (!(cap = itemRegex.exec(src))) {
            break;
          }

          lines = cap[2].split('\n');

          if (this.options.pedantic) {
            indent = 2;
            itemContents = lines[0].trimLeft();
          } else {
            indent = cap[2].search(/[^ ]/); // Find first non-space char
            indent = cap[1].length + (indent > 4 ? 1 : indent); // intented code blocks after 4 spaces; indent is always 1
            itemContents = lines[0].slice(indent - cap[1].length);
          }

          blankLine = false;
          raw = cap[0];

          if (!lines[0] && /^ *$/.test(lines[1])) { // items begin with at most one blank line
            raw = cap[1] + lines.slice(0, 2).join('\n') + '\n';
            list.loose = true;
            lines = [];
          }

          const nextBulletRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}(?:[*+-]|\\d{1,9}[.)])`);

          for (i = 1; i < lines.length; i++) {
            line = lines[i];

            if (this.options.pedantic) { // Re-align to follow commonmark nesting rules
              line = line.replace(/^ {1,4}(?=( {4})*[^ ])/g, '  ');
            }

            // End list item if found start of new bullet
            if (nextBulletRegex.test(line)) {
              raw = cap[1] + lines.slice(0, i).join('\n') + '\n';
              break;
            }

            // Until we encounter a blank line, item contents do not need indentation
            if (!blankLine) {
              if (!line.trim()) { // Check if current line is empty
                blankLine = true;
              }

              // Dedent if possible
              if (line.search(/[^ ]/) >= indent) {
                itemContents += '\n' + line.slice(indent);
              } else {
                itemContents += '\n' + line;
              }
              continue;
            }

            // Dedent this line
            if (line.search(/[^ ]/) >= indent || !line.trim()) {
              itemContents += '\n' + line.slice(indent);
              continue;
            } else { // Line was not properly indented; end of this item
              raw = cap[1] + lines.slice(0, i).join('\n') + '\n';
              break;
            }
          }

          if (!list.loose) {
            // If the previous item ended with a blank line, the list is loose
            if (endsWithBlankLine) {
              list.loose = true;
            } else if (/\n *\n *$/.test(raw)) {
              endsWithBlankLine = true;
            }
          }

          // Check for task list items
          if (this.options.gfm) {
            istask = /^\[[ xX]\] /.exec(itemContents);
            if (istask) {
              ischecked = istask[0] !== '[ ] ';
              itemContents = itemContents.replace(/^\[[ xX]\] +/, '');
            }
          }

          list.items.push({
            type: 'list_item',
            raw: raw,
            task: !!istask,
            checked: ischecked,
            loose: false,
            text: itemContents
          });

          list.raw += raw;
          src = src.slice(raw.length);
        }

        // Do not consume newlines at end of final item. Alternatively, make itemRegex *start* with any newlines to simplify/speed up endsWithBlankLine logic
        list.items[list.items.length - 1].raw = raw.trimRight();
        list.items[list.items.length - 1].text = itemContents.trimRight();
        list.raw = list.raw.trimRight();

        const l = list.items.length;

        // Item child tokens handled here at end because we needed to have the final item to trim it first
        for (i = 0; i < l; i++) {
          this.lexer.state.top = false;
          list.items[i].tokens = this.lexer.blockTokens(list.items[i].text, []);
          if (list.items[i].tokens.some(t => t.type === 'space')) {
            list.loose = true;
            list.items[i].loose = true;
          }
        }

        return list;
      }
    }

    html(src) {
      const cap = this.rules.block.html.exec(src);
      if (cap) {
        const token = {
          type: 'html',
          raw: cap[0],
          pre: !this.options.sanitizer
            && (cap[1] === 'pre' || cap[1] === 'script' || cap[1] === 'style'),
          text: cap[0]
        };
        if (this.options.sanitize) {
          token.type = 'paragraph';
          token.text = this.options.sanitizer ? this.options.sanitizer(cap[0]) : escape$2(cap[0]);
          token.tokens = [];
          this.lexer.inline(token.text, token.tokens);
        }
        return token;
      }
    }

    def(src) {
      const cap = this.rules.block.def.exec(src);
      if (cap) {
        if (cap[3]) cap[3] = cap[3].substring(1, cap[3].length - 1);
        const tag = cap[1].toLowerCase().replace(/\s+/g, ' ');
        return {
          type: 'def',
          tag,
          raw: cap[0],
          href: cap[2],
          title: cap[3]
        };
      }
    }

    table(src) {
      const cap = this.rules.block.table.exec(src);
      if (cap) {
        const item = {
          type: 'table',
          header: splitCells(cap[1]).map(c => { return { text: c }; }),
          align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
          rows: cap[3] ? cap[3].replace(/\n$/, '').split('\n') : []
        };

        if (item.header.length === item.align.length) {
          item.raw = cap[0];

          let l = item.align.length;
          let i, j, k, row;
          for (i = 0; i < l; i++) {
            if (/^ *-+: *$/.test(item.align[i])) {
              item.align[i] = 'right';
            } else if (/^ *:-+: *$/.test(item.align[i])) {
              item.align[i] = 'center';
            } else if (/^ *:-+ *$/.test(item.align[i])) {
              item.align[i] = 'left';
            } else {
              item.align[i] = null;
            }
          }

          l = item.rows.length;
          for (i = 0; i < l; i++) {
            item.rows[i] = splitCells(item.rows[i], item.header.length).map(c => { return { text: c }; });
          }

          // parse child tokens inside headers and cells

          // header child tokens
          l = item.header.length;
          for (j = 0; j < l; j++) {
            item.header[j].tokens = [];
            this.lexer.inlineTokens(item.header[j].text, item.header[j].tokens);
          }

          // cell child tokens
          l = item.rows.length;
          for (j = 0; j < l; j++) {
            row = item.rows[j];
            for (k = 0; k < row.length; k++) {
              row[k].tokens = [];
              this.lexer.inlineTokens(row[k].text, row[k].tokens);
            }
          }

          return item;
        }
      }
    }

    lheading(src) {
      const cap = this.rules.block.lheading.exec(src);
      if (cap) {
        const token = {
          type: 'heading',
          raw: cap[0],
          depth: cap[2].charAt(0) === '=' ? 1 : 2,
          text: cap[1],
          tokens: []
        };
        this.lexer.inline(token.text, token.tokens);
        return token;
      }
    }

    paragraph(src) {
      const cap = this.rules.block.paragraph.exec(src);
      if (cap) {
        const token = {
          type: 'paragraph',
          raw: cap[0],
          text: cap[1].charAt(cap[1].length - 1) === '\n'
            ? cap[1].slice(0, -1)
            : cap[1],
          tokens: []
        };
        this.lexer.inline(token.text, token.tokens);
        return token;
      }
    }

    text(src) {
      const cap = this.rules.block.text.exec(src);
      if (cap) {
        const token = {
          type: 'text',
          raw: cap[0],
          text: cap[0],
          tokens: []
        };
        this.lexer.inline(token.text, token.tokens);
        return token;
      }
    }

    escape(src) {
      const cap = this.rules.inline.escape.exec(src);
      if (cap) {
        return {
          type: 'escape',
          raw: cap[0],
          text: escape$2(cap[1])
        };
      }
    }

    tag(src) {
      const cap = this.rules.inline.tag.exec(src);
      if (cap) {
        if (!this.lexer.state.inLink && /^<a /i.test(cap[0])) {
          this.lexer.state.inLink = true;
        } else if (this.lexer.state.inLink && /^<\/a>/i.test(cap[0])) {
          this.lexer.state.inLink = false;
        }
        if (!this.lexer.state.inRawBlock && /^<(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
          this.lexer.state.inRawBlock = true;
        } else if (this.lexer.state.inRawBlock && /^<\/(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
          this.lexer.state.inRawBlock = false;
        }

        return {
          type: this.options.sanitize
            ? 'text'
            : 'html',
          raw: cap[0],
          inLink: this.lexer.state.inLink,
          inRawBlock: this.lexer.state.inRawBlock,
          text: this.options.sanitize
            ? (this.options.sanitizer
              ? this.options.sanitizer(cap[0])
              : escape$2(cap[0]))
            : cap[0]
        };
      }
    }

    link(src) {
      const cap = this.rules.inline.link.exec(src);
      if (cap) {
        const trimmedUrl = cap[2].trim();
        if (!this.options.pedantic && /^</.test(trimmedUrl)) {
          // commonmark requires matching angle brackets
          if (!(/>$/.test(trimmedUrl))) {
            return;
          }

          // ending angle bracket cannot be escaped
          const rtrimSlash = rtrim(trimmedUrl.slice(0, -1), '\\');
          if ((trimmedUrl.length - rtrimSlash.length) % 2 === 0) {
            return;
          }
        } else {
          // find closing parenthesis
          const lastParenIndex = findClosingBracket(cap[2], '()');
          if (lastParenIndex > -1) {
            const start = cap[0].indexOf('!') === 0 ? 5 : 4;
            const linkLen = start + cap[1].length + lastParenIndex;
            cap[2] = cap[2].substring(0, lastParenIndex);
            cap[0] = cap[0].substring(0, linkLen).trim();
            cap[3] = '';
          }
        }
        let href = cap[2];
        let title = '';
        if (this.options.pedantic) {
          // split pedantic href and title
          const link = /^([^'"]*[^\s])\s+(['"])(.*)\2/.exec(href);

          if (link) {
            href = link[1];
            title = link[3];
          }
        } else {
          title = cap[3] ? cap[3].slice(1, -1) : '';
        }

        href = href.trim();
        if (/^</.test(href)) {
          if (this.options.pedantic && !(/>$/.test(trimmedUrl))) {
            // pedantic allows starting angle bracket without ending angle bracket
            href = href.slice(1);
          } else {
            href = href.slice(1, -1);
          }
        }
        return outputLink(cap, {
          href: href ? href.replace(this.rules.inline._escapes, '$1') : href,
          title: title ? title.replace(this.rules.inline._escapes, '$1') : title
        }, cap[0], this.lexer);
      }
    }

    reflink(src, links) {
      let cap;
      if ((cap = this.rules.inline.reflink.exec(src))
          || (cap = this.rules.inline.nolink.exec(src))) {
        let link = (cap[2] || cap[1]).replace(/\s+/g, ' ');
        link = links[link.toLowerCase()];
        if (!link || !link.href) {
          const text = cap[0].charAt(0);
          return {
            type: 'text',
            raw: text,
            text
          };
        }
        return outputLink(cap, link, cap[0], this.lexer);
      }
    }

    emStrong(src, maskedSrc, prevChar = '') {
      let match = this.rules.inline.emStrong.lDelim.exec(src);
      if (!match) return;

      // _ can't be between two alphanumerics. \p{L}\p{N} includes non-english alphabet/numbers as well
      if (match[3] && prevChar.match(/[\p{L}\p{N}]/u)) return;

      const nextChar = match[1] || match[2] || '';

      if (!nextChar || (nextChar && (prevChar === '' || this.rules.inline.punctuation.exec(prevChar)))) {
        const lLength = match[0].length - 1;
        let rDelim, rLength, delimTotal = lLength, midDelimTotal = 0;

        const endReg = match[0][0] === '*' ? this.rules.inline.emStrong.rDelimAst : this.rules.inline.emStrong.rDelimUnd;
        endReg.lastIndex = 0;

        // Clip maskedSrc to same section of string as src (move to lexer?)
        maskedSrc = maskedSrc.slice(-1 * src.length + lLength);

        while ((match = endReg.exec(maskedSrc)) != null) {
          rDelim = match[1] || match[2] || match[3] || match[4] || match[5] || match[6];

          if (!rDelim) continue; // skip single * in __abc*abc__

          rLength = rDelim.length;

          if (match[3] || match[4]) { // found another Left Delim
            delimTotal += rLength;
            continue;
          } else if (match[5] || match[6]) { // either Left or Right Delim
            if (lLength % 3 && !((lLength + rLength) % 3)) {
              midDelimTotal += rLength;
              continue; // CommonMark Emphasis Rules 9-10
            }
          }

          delimTotal -= rLength;

          if (delimTotal > 0) continue; // Haven't found enough closing delimiters

          // Remove extra characters. *a*** -> *a*
          rLength = Math.min(rLength, rLength + delimTotal + midDelimTotal);

          // Create `em` if smallest delimiter has odd char count. *a***
          if (Math.min(lLength, rLength) % 2) {
            const text = src.slice(1, lLength + match.index + rLength);
            return {
              type: 'em',
              raw: src.slice(0, lLength + match.index + rLength + 1),
              text,
              tokens: this.lexer.inlineTokens(text, [])
            };
          }

          // Create 'strong' if smallest delimiter has even char count. **a***
          const text = src.slice(2, lLength + match.index + rLength - 1);
          return {
            type: 'strong',
            raw: src.slice(0, lLength + match.index + rLength + 1),
            text,
            tokens: this.lexer.inlineTokens(text, [])
          };
        }
      }
    }

    codespan(src) {
      const cap = this.rules.inline.code.exec(src);
      if (cap) {
        let text = cap[2].replace(/\n/g, ' ');
        const hasNonSpaceChars = /[^ ]/.test(text);
        const hasSpaceCharsOnBothEnds = /^ /.test(text) && / $/.test(text);
        if (hasNonSpaceChars && hasSpaceCharsOnBothEnds) {
          text = text.substring(1, text.length - 1);
        }
        text = escape$2(text, true);
        return {
          type: 'codespan',
          raw: cap[0],
          text
        };
      }
    }

    br(src) {
      const cap = this.rules.inline.br.exec(src);
      if (cap) {
        return {
          type: 'br',
          raw: cap[0]
        };
      }
    }

    del(src) {
      const cap = this.rules.inline.del.exec(src);
      if (cap) {
        return {
          type: 'del',
          raw: cap[0],
          text: cap[2],
          tokens: this.lexer.inlineTokens(cap[2], [])
        };
      }
    }

    autolink(src, mangle) {
      const cap = this.rules.inline.autolink.exec(src);
      if (cap) {
        let text, href;
        if (cap[2] === '@') {
          text = escape$2(this.options.mangle ? mangle(cap[1]) : cap[1]);
          href = 'mailto:' + text;
        } else {
          text = escape$2(cap[1]);
          href = text;
        }

        return {
          type: 'link',
          raw: cap[0],
          text,
          href,
          tokens: [
            {
              type: 'text',
              raw: text,
              text
            }
          ]
        };
      }
    }

    url(src, mangle) {
      let cap;
      if (cap = this.rules.inline.url.exec(src)) {
        let text, href;
        if (cap[2] === '@') {
          text = escape$2(this.options.mangle ? mangle(cap[0]) : cap[0]);
          href = 'mailto:' + text;
        } else {
          // do extended autolink path validation
          let prevCapZero;
          do {
            prevCapZero = cap[0];
            cap[0] = this.rules.inline._backpedal.exec(cap[0])[0];
          } while (prevCapZero !== cap[0]);
          text = escape$2(cap[0]);
          if (cap[1] === 'www.') {
            href = 'http://' + text;
          } else {
            href = text;
          }
        }
        return {
          type: 'link',
          raw: cap[0],
          text,
          href,
          tokens: [
            {
              type: 'text',
              raw: text,
              text
            }
          ]
        };
      }
    }

    inlineText(src, smartypants) {
      const cap = this.rules.inline.text.exec(src);
      if (cap) {
        let text;
        if (this.lexer.state.inRawBlock) {
          text = this.options.sanitize ? (this.options.sanitizer ? this.options.sanitizer(cap[0]) : escape$2(cap[0])) : cap[0];
        } else {
          text = escape$2(this.options.smartypants ? smartypants(cap[0]) : cap[0]);
        }
        return {
          type: 'text',
          raw: cap[0],
          text
        };
      }
    }
  };

  const {
    noopTest,
    edit,
    merge: merge$1
  } = helpers;

  /**
   * Block-Level Grammar
   */
  const block$1 = {
    newline: /^(?: *(?:\n|$))+/,
    code: /^( {4}[^\n]+(?:\n(?: *(?:\n|$))*)?)+/,
    fences: /^ {0,3}(`{3,}(?=[^`\n]*\n)|~{3,})([^\n]*)\n(?:|([\s\S]*?)\n)(?: {0,3}\1[~`]* *(?=\n|$)|$)/,
    hr: /^ {0,3}((?:- *){3,}|(?:_ *){3,}|(?:\* *){3,})(?:\n+|$)/,
    heading: /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/,
    blockquote: /^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/,
    list: /^( {0,3}bull)( [^\n]+?)?(?:\n|$)/,
    html: '^ {0,3}(?:' // optional indentation
      + '<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)' // (1)
      + '|comment[^\\n]*(\\n+|$)' // (2)
      + '|<\\?[\\s\\S]*?(?:\\?>\\n*|$)' // (3)
      + '|<![A-Z][\\s\\S]*?(?:>\\n*|$)' // (4)
      + '|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)' // (5)
      + '|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n *)+\\n|$)' // (6)
      + '|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n *)+\\n|$)' // (7) open tag
      + '|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n *)+\\n|$)' // (7) closing tag
      + ')',
    def: /^ {0,3}\[(label)\]: *\n? *<?([^\s>]+)>?(?:(?: +\n? *| *\n *)(title))? *(?:\n+|$)/,
    table: noopTest,
    lheading: /^([^\n]+)\n {0,3}(=+|-+) *(?:\n+|$)/,
    // regex template, placeholders will be replaced according to different paragraph
    // interruption rules of commonmark and the original markdown spec:
    _paragraph: /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html| +\n)[^\n]+)*)/,
    text: /^[^\n]+/
  };

  block$1._label = /(?!\s*\])(?:\\[\[\]]|[^\[\]])+/;
  block$1._title = /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/;
  block$1.def = edit(block$1.def)
    .replace('label', block$1._label)
    .replace('title', block$1._title)
    .getRegex();

  block$1.bullet = /(?:[*+-]|\d{1,9}[.)])/;
  block$1.listItemStart = edit(/^( *)(bull) */)
    .replace('bull', block$1.bullet)
    .getRegex();

  block$1.list = edit(block$1.list)
    .replace(/bull/g, block$1.bullet)
    .replace('hr', '\\n+(?=\\1?(?:(?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$))')
    .replace('def', '\\n+(?=' + block$1.def.source + ')')
    .getRegex();

  block$1._tag = 'address|article|aside|base|basefont|blockquote|body|caption'
    + '|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption'
    + '|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe'
    + '|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option'
    + '|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr'
    + '|track|ul';
  block$1._comment = /<!--(?!-?>)[\s\S]*?(?:-->|$)/;
  block$1.html = edit(block$1.html, 'i')
    .replace('comment', block$1._comment)
    .replace('tag', block$1._tag)
    .replace('attribute', / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/)
    .getRegex();

  block$1.paragraph = edit(block$1._paragraph)
    .replace('hr', block$1.hr)
    .replace('heading', ' {0,3}#{1,6} ')
    .replace('|lheading', '') // setex headings don't interrupt commonmark paragraphs
    .replace('blockquote', ' {0,3}>')
    .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n')
    .replace('list', ' {0,3}(?:[*+-]|1[.)]) ') // only lists starting from 1 can interrupt
    .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)')
    .replace('tag', block$1._tag) // pars can be interrupted by type (6) html blocks
    .getRegex();

  block$1.blockquote = edit(block$1.blockquote)
    .replace('paragraph', block$1.paragraph)
    .getRegex();

  /**
   * Normal Block Grammar
   */

  block$1.normal = merge$1({}, block$1);

  /**
   * GFM Block Grammar
   */

  block$1.gfm = merge$1({}, block$1.normal, {
    table: '^ *([^\\n ].*\\|.*)\\n' // Header
      + ' {0,3}(?:\\| *)?(:?-+:? *(?:\\| *:?-+:? *)*)(?:\\| *)?' // Align
      + '(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)' // Cells
  });

  block$1.gfm.table = edit(block$1.gfm.table)
    .replace('hr', block$1.hr)
    .replace('heading', ' {0,3}#{1,6} ')
    .replace('blockquote', ' {0,3}>')
    .replace('code', ' {4}[^\\n]')
    .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n')
    .replace('list', ' {0,3}(?:[*+-]|1[.)]) ') // only lists starting from 1 can interrupt
    .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)')
    .replace('tag', block$1._tag) // tables can be interrupted by type (6) html blocks
    .getRegex();

  /**
   * Pedantic grammar (original John Gruber's loose markdown specification)
   */

  block$1.pedantic = merge$1({}, block$1.normal, {
    html: edit(
      '^ *(?:comment *(?:\\n|\\s*$)'
      + '|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)' // closed tag
      + '|<tag(?:"[^"]*"|\'[^\']*\'|\\s[^\'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))')
      .replace('comment', block$1._comment)
      .replace(/tag/g, '(?!(?:'
        + 'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub'
        + '|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)'
        + '\\b)\\w+(?!:|[^\\w\\s@]*@)\\b')
      .getRegex(),
    def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,
    heading: /^(#{1,6})(.*)(?:\n+|$)/,
    fences: noopTest, // fences not supported
    paragraph: edit(block$1.normal._paragraph)
      .replace('hr', block$1.hr)
      .replace('heading', ' *#{1,6} *[^\n]')
      .replace('lheading', block$1.lheading)
      .replace('blockquote', ' {0,3}>')
      .replace('|fences', '')
      .replace('|list', '')
      .replace('|html', '')
      .getRegex()
  });

  /**
   * Inline-Level Grammar
   */
  const inline$1 = {
    escape: /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,
    autolink: /^<(scheme:[^\s\x00-\x1f<>]*|email)>/,
    url: noopTest,
    tag: '^comment'
      + '|^</[a-zA-Z][\\w:-]*\\s*>' // self-closing tag
      + '|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>' // open tag
      + '|^<\\?[\\s\\S]*?\\?>' // processing instruction, e.g. <?php ?>
      + '|^<![a-zA-Z]+\\s[\\s\\S]*?>' // declaration, e.g. <!DOCTYPE html>
      + '|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>', // CDATA section
    link: /^!?\[(label)\]\(\s*(href)(?:\s+(title))?\s*\)/,
    reflink: /^!?\[(label)\]\[(?!\s*\])((?:\\[\[\]]?|[^\[\]\\])+)\]/,
    nolink: /^!?\[(?!\s*\])((?:\[[^\[\]]*\]|\\[\[\]]|[^\[\]])*)\](?:\[\])?/,
    reflinkSearch: 'reflink|nolink(?!\\()',
    emStrong: {
      lDelim: /^(?:\*+(?:([punct_])|[^\s*]))|^_+(?:([punct*])|([^\s_]))/,
      //        (1) and (2) can only be a Right Delimiter. (3) and (4) can only be Left.  (5) and (6) can be either Left or Right.
      //        () Skip orphan delim inside strong    (1) #***                (2) a***#, a***                   (3) #***a, ***a                 (4) ***#              (5) #***#                 (6) a***a
      rDelimAst: /^[^_*]*?\_\_[^_*]*?\*[^_*]*?(?=\_\_)|[punct_](\*+)(?=[\s]|$)|[^punct*_\s](\*+)(?=[punct_\s]|$)|[punct_\s](\*+)(?=[^punct*_\s])|[\s](\*+)(?=[punct_])|[punct_](\*+)(?=[punct_])|[^punct*_\s](\*+)(?=[^punct*_\s])/,
      rDelimUnd: /^[^_*]*?\*\*[^_*]*?\_[^_*]*?(?=\*\*)|[punct*](\_+)(?=[\s]|$)|[^punct*_\s](\_+)(?=[punct*\s]|$)|[punct*\s](\_+)(?=[^punct*_\s])|[\s](\_+)(?=[punct*])|[punct*](\_+)(?=[punct*])/ // ^- Not allowed for _
    },
    code: /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,
    br: /^( {2,}|\\)\n(?!\s*$)/,
    del: noopTest,
    text: /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/,
    punctuation: /^([\spunctuation])/
  };

  // list of punctuation marks from CommonMark spec
  // without * and _ to handle the different emphasis markers * and _
  inline$1._punctuation = '!"#$%&\'()+\\-.,/:;<=>?@\\[\\]`^{|}~';
  inline$1.punctuation = edit(inline$1.punctuation).replace(/punctuation/g, inline$1._punctuation).getRegex();

  // sequences em should skip over [title](link), `code`, <html>
  inline$1.blockSkip = /\[[^\]]*?\]\([^\)]*?\)|`[^`]*?`|<[^>]*?>/g;
  inline$1.escapedEmSt = /\\\*|\\_/g;

  inline$1._comment = edit(block$1._comment).replace('(?:-->|$)', '-->').getRegex();

  inline$1.emStrong.lDelim = edit(inline$1.emStrong.lDelim)
    .replace(/punct/g, inline$1._punctuation)
    .getRegex();

  inline$1.emStrong.rDelimAst = edit(inline$1.emStrong.rDelimAst, 'g')
    .replace(/punct/g, inline$1._punctuation)
    .getRegex();

  inline$1.emStrong.rDelimUnd = edit(inline$1.emStrong.rDelimUnd, 'g')
    .replace(/punct/g, inline$1._punctuation)
    .getRegex();

  inline$1._escapes = /\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/g;

  inline$1._scheme = /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/;
  inline$1._email = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/;
  inline$1.autolink = edit(inline$1.autolink)
    .replace('scheme', inline$1._scheme)
    .replace('email', inline$1._email)
    .getRegex();

  inline$1._attribute = /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/;

  inline$1.tag = edit(inline$1.tag)
    .replace('comment', inline$1._comment)
    .replace('attribute', inline$1._attribute)
    .getRegex();

  inline$1._label = /(?:\[(?:\\.|[^\[\]\\])*\]|\\.|`[^`]*`|[^\[\]\\`])*?/;
  inline$1._href = /<(?:\\.|[^\n<>\\])+>|[^\s\x00-\x1f]*/;
  inline$1._title = /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/;

  inline$1.link = edit(inline$1.link)
    .replace('label', inline$1._label)
    .replace('href', inline$1._href)
    .replace('title', inline$1._title)
    .getRegex();

  inline$1.reflink = edit(inline$1.reflink)
    .replace('label', inline$1._label)
    .getRegex();

  inline$1.reflinkSearch = edit(inline$1.reflinkSearch, 'g')
    .replace('reflink', inline$1.reflink)
    .replace('nolink', inline$1.nolink)
    .getRegex();

  /**
   * Normal Inline Grammar
   */

  inline$1.normal = merge$1({}, inline$1);

  /**
   * Pedantic Inline Grammar
   */

  inline$1.pedantic = merge$1({}, inline$1.normal, {
    strong: {
      start: /^__|\*\*/,
      middle: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
      endAst: /\*\*(?!\*)/g,
      endUnd: /__(?!_)/g
    },
    em: {
      start: /^_|\*/,
      middle: /^()\*(?=\S)([\s\S]*?\S)\*(?!\*)|^_(?=\S)([\s\S]*?\S)_(?!_)/,
      endAst: /\*(?!\*)/g,
      endUnd: /_(?!_)/g
    },
    link: edit(/^!?\[(label)\]\((.*?)\)/)
      .replace('label', inline$1._label)
      .getRegex(),
    reflink: edit(/^!?\[(label)\]\s*\[([^\]]*)\]/)
      .replace('label', inline$1._label)
      .getRegex()
  });

  /**
   * GFM Inline Grammar
   */

  inline$1.gfm = merge$1({}, inline$1.normal, {
    escape: edit(inline$1.escape).replace('])', '~|])').getRegex(),
    _extended_email: /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/,
    url: /^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/,
    _backpedal: /(?:[^?!.,:;*_~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_~)]+(?!$))+/,
    del: /^(~~?)(?=[^\s~])([\s\S]*?[^\s~])\1(?=[^~]|$)/,
    text: /^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|https?:\/\/|ftp:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/
  });

  inline$1.gfm.url = edit(inline$1.gfm.url, 'i')
    .replace('email', inline$1.gfm._extended_email)
    .getRegex();
  /**
   * GFM + Line Breaks Inline Grammar
   */

  inline$1.breaks = merge$1({}, inline$1.gfm, {
    br: edit(inline$1.br).replace('{2,}', '*').getRegex(),
    text: edit(inline$1.gfm.text)
      .replace('\\b_', '\\b_| {2,}\\n')
      .replace(/\{2,\}/g, '*')
      .getRegex()
  });

  var rules = {
    block: block$1,
    inline: inline$1
  };

  const Tokenizer$2 = Tokenizer_1$1;
  const { defaults: defaults$3 } = defaults$5.exports;
  const { block, inline } = rules;
  const { repeatString } = helpers;

  /**
   * smartypants text replacement
   */
  function smartypants(text) {
    return text
      // em-dashes
      .replace(/---/g, '\u2014')
      // en-dashes
      .replace(/--/g, '\u2013')
      // opening singles
      .replace(/(^|[-\u2014/(\[{"\s])'/g, '$1\u2018')
      // closing singles & apostrophes
      .replace(/'/g, '\u2019')
      // opening doubles
      .replace(/(^|[-\u2014/(\[{\u2018\s])"/g, '$1\u201c')
      // closing doubles
      .replace(/"/g, '\u201d')
      // ellipses
      .replace(/\.{3}/g, '\u2026');
  }

  /**
   * mangle email addresses
   */
  function mangle(text) {
    let out = '',
      i,
      ch;

    const l = text.length;
    for (i = 0; i < l; i++) {
      ch = text.charCodeAt(i);
      if (Math.random() > 0.5) {
        ch = 'x' + ch.toString(16);
      }
      out += '&#' + ch + ';';
    }

    return out;
  }

  /**
   * Block Lexer
   */
  var Lexer_1$1 = class Lexer {
    constructor(options) {
      this.tokens = [];
      this.tokens.links = Object.create(null);
      this.options = options || defaults$3;
      this.options.tokenizer = this.options.tokenizer || new Tokenizer$2();
      this.tokenizer = this.options.tokenizer;
      this.tokenizer.options = this.options;
      this.tokenizer.lexer = this;
      this.inlineQueue = [];
      this.state = {
        inLink: false,
        inRawBlock: false,
        top: true
      };

      const rules = {
        block: block.normal,
        inline: inline.normal
      };

      if (this.options.pedantic) {
        rules.block = block.pedantic;
        rules.inline = inline.pedantic;
      } else if (this.options.gfm) {
        rules.block = block.gfm;
        if (this.options.breaks) {
          rules.inline = inline.breaks;
        } else {
          rules.inline = inline.gfm;
        }
      }
      this.tokenizer.rules = rules;
    }

    /**
     * Expose Rules
     */
    static get rules() {
      return {
        block,
        inline
      };
    }

    /**
     * Static Lex Method
     */
    static lex(src, options) {
      const lexer = new Lexer(options);
      return lexer.lex(src);
    }

    /**
     * Static Lex Inline Method
     */
    static lexInline(src, options) {
      const lexer = new Lexer(options);
      return lexer.inlineTokens(src);
    }

    /**
     * Preprocessing
     */
    lex(src) {
      src = src
        .replace(/\r\n|\r/g, '\n')
        .replace(/\t/g, '    ');

      this.blockTokens(src, this.tokens);

      let next;
      while (next = this.inlineQueue.shift()) {
        this.inlineTokens(next.src, next.tokens);
      }

      return this.tokens;
    }

    /**
     * Lexing
     */
    blockTokens(src, tokens = []) {
      if (this.options.pedantic) {
        src = src.replace(/^ +$/gm, '');
      }
      let token, lastToken, cutSrc, lastParagraphClipped;

      while (src) {
        if (this.options.extensions
          && this.options.extensions.block
          && this.options.extensions.block.some((extTokenizer) => {
            if (token = extTokenizer.call({ lexer: this }, src, tokens)) {
              src = src.substring(token.raw.length);
              tokens.push(token);
              return true;
            }
            return false;
          })) {
          continue;
        }

        // newline
        if (token = this.tokenizer.space(src)) {
          src = src.substring(token.raw.length);
          if (token.type) {
            tokens.push(token);
          }
          continue;
        }

        // code
        if (token = this.tokenizer.code(src)) {
          src = src.substring(token.raw.length);
          lastToken = tokens[tokens.length - 1];
          // An indented code block cannot interrupt a paragraph.
          if (lastToken && (lastToken.type === 'paragraph' || lastToken.type === 'text')) {
            lastToken.raw += '\n' + token.raw;
            lastToken.text += '\n' + token.text;
            this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
          } else {
            tokens.push(token);
          }
          continue;
        }

        // fences
        if (token = this.tokenizer.fences(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }

        // heading
        if (token = this.tokenizer.heading(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }

        // hr
        if (token = this.tokenizer.hr(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }

        // blockquote
        if (token = this.tokenizer.blockquote(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }

        // list
        if (token = this.tokenizer.list(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }

        // html
        if (token = this.tokenizer.html(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }

        // def
        if (token = this.tokenizer.def(src)) {
          src = src.substring(token.raw.length);
          lastToken = tokens[tokens.length - 1];
          if (lastToken && (lastToken.type === 'paragraph' || lastToken.type === 'text')) {
            lastToken.raw += '\n' + token.raw;
            lastToken.text += '\n' + token.raw;
            this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
          } else if (!this.tokens.links[token.tag]) {
            this.tokens.links[token.tag] = {
              href: token.href,
              title: token.title
            };
          }
          continue;
        }

        // table (gfm)
        if (token = this.tokenizer.table(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }

        // lheading
        if (token = this.tokenizer.lheading(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }

        // top-level paragraph
        // prevent paragraph consuming extensions by clipping 'src' to extension start
        cutSrc = src;
        if (this.options.extensions && this.options.extensions.startBlock) {
          let startIndex = Infinity;
          const tempSrc = src.slice(1);
          let tempStart;
          this.options.extensions.startBlock.forEach(function(getStartIndex) {
            tempStart = getStartIndex.call({ lexer: this }, tempSrc);
            if (typeof tempStart === 'number' && tempStart >= 0) { startIndex = Math.min(startIndex, tempStart); }
          });
          if (startIndex < Infinity && startIndex >= 0) {
            cutSrc = src.substring(0, startIndex + 1);
          }
        }
        if (this.state.top && (token = this.tokenizer.paragraph(cutSrc))) {
          lastToken = tokens[tokens.length - 1];
          if (lastParagraphClipped && lastToken.type === 'paragraph') {
            lastToken.raw += '\n' + token.raw;
            lastToken.text += '\n' + token.text;
            this.inlineQueue.pop();
            this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
          } else {
            tokens.push(token);
          }
          lastParagraphClipped = (cutSrc.length !== src.length);
          src = src.substring(token.raw.length);
          continue;
        }

        // text
        if (token = this.tokenizer.text(src)) {
          src = src.substring(token.raw.length);
          lastToken = tokens[tokens.length - 1];
          if (lastToken && lastToken.type === 'text') {
            lastToken.raw += '\n' + token.raw;
            lastToken.text += '\n' + token.text;
            this.inlineQueue.pop();
            this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
          } else {
            tokens.push(token);
          }
          continue;
        }

        if (src) {
          const errMsg = 'Infinite loop on byte: ' + src.charCodeAt(0);
          if (this.options.silent) {
            console.error(errMsg);
            break;
          } else {
            throw new Error(errMsg);
          }
        }
      }

      this.state.top = true;
      return tokens;
    }

    inline(src, tokens) {
      this.inlineQueue.push({ src, tokens });
    }

    /**
     * Lexing/Compiling
     */
    inlineTokens(src, tokens = []) {
      let token, lastToken, cutSrc;

      // String with links masked to avoid interference with em and strong
      let maskedSrc = src;
      let match;
      let keepPrevChar, prevChar;

      // Mask out reflinks
      if (this.tokens.links) {
        const links = Object.keys(this.tokens.links);
        if (links.length > 0) {
          while ((match = this.tokenizer.rules.inline.reflinkSearch.exec(maskedSrc)) != null) {
            if (links.includes(match[0].slice(match[0].lastIndexOf('[') + 1, -1))) {
              maskedSrc = maskedSrc.slice(0, match.index) + '[' + repeatString('a', match[0].length - 2) + ']' + maskedSrc.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex);
            }
          }
        }
      }
      // Mask out other blocks
      while ((match = this.tokenizer.rules.inline.blockSkip.exec(maskedSrc)) != null) {
        maskedSrc = maskedSrc.slice(0, match.index) + '[' + repeatString('a', match[0].length - 2) + ']' + maskedSrc.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
      }

      // Mask out escaped em & strong delimiters
      while ((match = this.tokenizer.rules.inline.escapedEmSt.exec(maskedSrc)) != null) {
        maskedSrc = maskedSrc.slice(0, match.index) + '++' + maskedSrc.slice(this.tokenizer.rules.inline.escapedEmSt.lastIndex);
      }

      while (src) {
        if (!keepPrevChar) {
          prevChar = '';
        }
        keepPrevChar = false;

        // extensions
        if (this.options.extensions
          && this.options.extensions.inline
          && this.options.extensions.inline.some((extTokenizer) => {
            if (token = extTokenizer.call({ lexer: this }, src, tokens)) {
              src = src.substring(token.raw.length);
              tokens.push(token);
              return true;
            }
            return false;
          })) {
          continue;
        }

        // escape
        if (token = this.tokenizer.escape(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }

        // tag
        if (token = this.tokenizer.tag(src)) {
          src = src.substring(token.raw.length);
          lastToken = tokens[tokens.length - 1];
          if (lastToken && token.type === 'text' && lastToken.type === 'text') {
            lastToken.raw += token.raw;
            lastToken.text += token.text;
          } else {
            tokens.push(token);
          }
          continue;
        }

        // link
        if (token = this.tokenizer.link(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }

        // reflink, nolink
        if (token = this.tokenizer.reflink(src, this.tokens.links)) {
          src = src.substring(token.raw.length);
          lastToken = tokens[tokens.length - 1];
          if (lastToken && token.type === 'text' && lastToken.type === 'text') {
            lastToken.raw += token.raw;
            lastToken.text += token.text;
          } else {
            tokens.push(token);
          }
          continue;
        }

        // em & strong
        if (token = this.tokenizer.emStrong(src, maskedSrc, prevChar)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }

        // code
        if (token = this.tokenizer.codespan(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }

        // br
        if (token = this.tokenizer.br(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }

        // del (gfm)
        if (token = this.tokenizer.del(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }

        // autolink
        if (token = this.tokenizer.autolink(src, mangle)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }

        // url (gfm)
        if (!this.state.inLink && (token = this.tokenizer.url(src, mangle))) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }

        // text
        // prevent inlineText consuming extensions by clipping 'src' to extension start
        cutSrc = src;
        if (this.options.extensions && this.options.extensions.startInline) {
          let startIndex = Infinity;
          const tempSrc = src.slice(1);
          let tempStart;
          this.options.extensions.startInline.forEach(function(getStartIndex) {
            tempStart = getStartIndex.call({ lexer: this }, tempSrc);
            if (typeof tempStart === 'number' && tempStart >= 0) { startIndex = Math.min(startIndex, tempStart); }
          });
          if (startIndex < Infinity && startIndex >= 0) {
            cutSrc = src.substring(0, startIndex + 1);
          }
        }
        if (token = this.tokenizer.inlineText(cutSrc, smartypants)) {
          src = src.substring(token.raw.length);
          if (token.raw.slice(-1) !== '_') { // Track prevChar before string of ____ started
            prevChar = token.raw.slice(-1);
          }
          keepPrevChar = true;
          lastToken = tokens[tokens.length - 1];
          if (lastToken && lastToken.type === 'text') {
            lastToken.raw += token.raw;
            lastToken.text += token.text;
          } else {
            tokens.push(token);
          }
          continue;
        }

        if (src) {
          const errMsg = 'Infinite loop on byte: ' + src.charCodeAt(0);
          if (this.options.silent) {
            console.error(errMsg);
            break;
          } else {
            throw new Error(errMsg);
          }
        }
      }

      return tokens;
    }
  };

  const { defaults: defaults$2 } = defaults$5.exports;
  const {
    cleanUrl,
    escape: escape$1
  } = helpers;

  /**
   * Renderer
   */
  var Renderer_1$1 = class Renderer {
    constructor(options) {
      this.options = options || defaults$2;
    }

    code(code, infostring, escaped) {
      const lang = (infostring || '').match(/\S*/)[0];
      if (this.options.highlight) {
        const out = this.options.highlight(code, lang);
        if (out != null && out !== code) {
          escaped = true;
          code = out;
        }
      }

      code = code.replace(/\n$/, '') + '\n';

      if (!lang) {
        return '<pre><code>'
          + (escaped ? code : escape$1(code, true))
          + '</code></pre>\n';
      }

      return '<pre><code class="'
        + this.options.langPrefix
        + escape$1(lang, true)
        + '">'
        + (escaped ? code : escape$1(code, true))
        + '</code></pre>\n';
    }

    blockquote(quote) {
      return '<blockquote>\n' + quote + '</blockquote>\n';
    }

    html(html) {
      return html;
    }

    heading(text, level, raw, slugger) {
      if (this.options.headerIds) {
        return '<h'
          + level
          + ' id="'
          + this.options.headerPrefix
          + slugger.slug(raw)
          + '">'
          + text
          + '</h'
          + level
          + '>\n';
      }
      // ignore IDs
      return '<h' + level + '>' + text + '</h' + level + '>\n';
    }

    hr() {
      return this.options.xhtml ? '<hr/>\n' : '<hr>\n';
    }

    list(body, ordered, start) {
      const type = ordered ? 'ol' : 'ul',
        startatt = (ordered && start !== 1) ? (' start="' + start + '"') : '';
      return '<' + type + startatt + '>\n' + body + '</' + type + '>\n';
    }

    listitem(text) {
      return '<li>' + text + '</li>\n';
    }

    checkbox(checked) {
      return '<input '
        + (checked ? 'checked="" ' : '')
        + 'disabled="" type="checkbox"'
        + (this.options.xhtml ? ' /' : '')
        + '> ';
    }

    paragraph(text) {
      return '<p>' + text + '</p>\n';
    }

    table(header, body) {
      if (body) body = '<tbody>' + body + '</tbody>';

      return '<table>\n'
        + '<thead>\n'
        + header
        + '</thead>\n'
        + body
        + '</table>\n';
    }

    tablerow(content) {
      return '<tr>\n' + content + '</tr>\n';
    }

    tablecell(content, flags) {
      const type = flags.header ? 'th' : 'td';
      const tag = flags.align
        ? '<' + type + ' align="' + flags.align + '">'
        : '<' + type + '>';
      return tag + content + '</' + type + '>\n';
    }

    // span level renderer
    strong(text) {
      return '<strong>' + text + '</strong>';
    }

    em(text) {
      return '<em>' + text + '</em>';
    }

    codespan(text) {
      return '<code>' + text + '</code>';
    }

    br() {
      return this.options.xhtml ? '<br/>' : '<br>';
    }

    del(text) {
      return '<del>' + text + '</del>';
    }

    link(href, title, text) {
      href = cleanUrl(this.options.sanitize, this.options.baseUrl, href);
      if (href === null) {
        return text;
      }
      let out = '<a href="' + escape$1(href) + '"';
      if (title) {
        out += ' title="' + title + '"';
      }
      out += '>' + text + '</a>';
      return out;
    }

    image(href, title, text) {
      href = cleanUrl(this.options.sanitize, this.options.baseUrl, href);
      if (href === null) {
        return text;
      }

      let out = '<img src="' + href + '" alt="' + text + '"';
      if (title) {
        out += ' title="' + title + '"';
      }
      out += this.options.xhtml ? '/>' : '>';
      return out;
    }

    text(text) {
      return text;
    }
  };

  /**
   * TextRenderer
   * returns only the textual part of the token
   */

  var TextRenderer_1$1 = class TextRenderer {
    // no need for block level renderers
    strong(text) {
      return text;
    }

    em(text) {
      return text;
    }

    codespan(text) {
      return text;
    }

    del(text) {
      return text;
    }

    html(text) {
      return text;
    }

    text(text) {
      return text;
    }

    link(href, title, text) {
      return '' + text;
    }

    image(href, title, text) {
      return '' + text;
    }

    br() {
      return '';
    }
  };

  /**
   * Slugger generates header id
   */

  var Slugger_1$1 = class Slugger {
    constructor() {
      this.seen = {};
    }

    serialize(value) {
      return value
        .toLowerCase()
        .trim()
        // remove html tags
        .replace(/<[!\/a-z].*?>/ig, '')
        // remove unwanted chars
        .replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, '')
        .replace(/\s/g, '-');
    }

    /**
     * Finds the next safe (unique) slug to use
     */
    getNextSafeSlug(originalSlug, isDryRun) {
      let slug = originalSlug;
      let occurenceAccumulator = 0;
      if (this.seen.hasOwnProperty(slug)) {
        occurenceAccumulator = this.seen[originalSlug];
        do {
          occurenceAccumulator++;
          slug = originalSlug + '-' + occurenceAccumulator;
        } while (this.seen.hasOwnProperty(slug));
      }
      if (!isDryRun) {
        this.seen[originalSlug] = occurenceAccumulator;
        this.seen[slug] = 0;
      }
      return slug;
    }

    /**
     * Convert string to unique id
     * @param {object} options
     * @param {boolean} options.dryrun Generates the next unique slug without updating the internal accumulator.
     */
    slug(value, options = {}) {
      const slug = this.serialize(value);
      return this.getNextSafeSlug(slug, options.dryrun);
    }
  };

  const Renderer$2 = Renderer_1$1;
  const TextRenderer$2 = TextRenderer_1$1;
  const Slugger$2 = Slugger_1$1;
  const { defaults: defaults$1 } = defaults$5.exports;
  const {
    unescape
  } = helpers;

  /**
   * Parsing & Compiling
   */
  var Parser_1$1 = class Parser {
    constructor(options) {
      this.options = options || defaults$1;
      this.options.renderer = this.options.renderer || new Renderer$2();
      this.renderer = this.options.renderer;
      this.renderer.options = this.options;
      this.textRenderer = new TextRenderer$2();
      this.slugger = new Slugger$2();
    }

    /**
     * Static Parse Method
     */
    static parse(tokens, options) {
      const parser = new Parser(options);
      return parser.parse(tokens);
    }

    /**
     * Static Parse Inline Method
     */
    static parseInline(tokens, options) {
      const parser = new Parser(options);
      return parser.parseInline(tokens);
    }

    /**
     * Parse Loop
     */
    parse(tokens, top = true) {
      let out = '',
        i,
        j,
        k,
        l2,
        l3,
        row,
        cell,
        header,
        body,
        token,
        ordered,
        start,
        loose,
        itemBody,
        item,
        checked,
        task,
        checkbox,
        ret;

      const l = tokens.length;
      for (i = 0; i < l; i++) {
        token = tokens[i];

        // Run any renderer extensions
        if (this.options.extensions && this.options.extensions.renderers && this.options.extensions.renderers[token.type]) {
          ret = this.options.extensions.renderers[token.type].call({ parser: this }, token);
          if (ret !== false || !['space', 'hr', 'heading', 'code', 'table', 'blockquote', 'list', 'html', 'paragraph', 'text'].includes(token.type)) {
            out += ret || '';
            continue;
          }
        }

        switch (token.type) {
          case 'space': {
            continue;
          }
          case 'hr': {
            out += this.renderer.hr();
            continue;
          }
          case 'heading': {
            out += this.renderer.heading(
              this.parseInline(token.tokens),
              token.depth,
              unescape(this.parseInline(token.tokens, this.textRenderer)),
              this.slugger);
            continue;
          }
          case 'code': {
            out += this.renderer.code(token.text,
              token.lang,
              token.escaped);
            continue;
          }
          case 'table': {
            header = '';

            // header
            cell = '';
            l2 = token.header.length;
            for (j = 0; j < l2; j++) {
              cell += this.renderer.tablecell(
                this.parseInline(token.header[j].tokens),
                { header: true, align: token.align[j] }
              );
            }
            header += this.renderer.tablerow(cell);

            body = '';
            l2 = token.rows.length;
            for (j = 0; j < l2; j++) {
              row = token.rows[j];

              cell = '';
              l3 = row.length;
              for (k = 0; k < l3; k++) {
                cell += this.renderer.tablecell(
                  this.parseInline(row[k].tokens),
                  { header: false, align: token.align[k] }
                );
              }

              body += this.renderer.tablerow(cell);
            }
            out += this.renderer.table(header, body);
            continue;
          }
          case 'blockquote': {
            body = this.parse(token.tokens);
            out += this.renderer.blockquote(body);
            continue;
          }
          case 'list': {
            ordered = token.ordered;
            start = token.start;
            loose = token.loose;
            l2 = token.items.length;

            body = '';
            for (j = 0; j < l2; j++) {
              item = token.items[j];
              checked = item.checked;
              task = item.task;

              itemBody = '';
              if (item.task) {
                checkbox = this.renderer.checkbox(checked);
                if (loose) {
                  if (item.tokens.length > 0 && item.tokens[0].type === 'paragraph') {
                    item.tokens[0].text = checkbox + ' ' + item.tokens[0].text;
                    if (item.tokens[0].tokens && item.tokens[0].tokens.length > 0 && item.tokens[0].tokens[0].type === 'text') {
                      item.tokens[0].tokens[0].text = checkbox + ' ' + item.tokens[0].tokens[0].text;
                    }
                  } else {
                    item.tokens.unshift({
                      type: 'text',
                      text: checkbox
                    });
                  }
                } else {
                  itemBody += checkbox;
                }
              }

              itemBody += this.parse(item.tokens, loose);
              body += this.renderer.listitem(itemBody, task, checked);
            }

            out += this.renderer.list(body, ordered, start);
            continue;
          }
          case 'html': {
            // TODO parse inline content if parameter markdown=1
            out += this.renderer.html(token.text);
            continue;
          }
          case 'paragraph': {
            out += this.renderer.paragraph(this.parseInline(token.tokens));
            continue;
          }
          case 'text': {
            body = token.tokens ? this.parseInline(token.tokens) : token.text;
            while (i + 1 < l && tokens[i + 1].type === 'text') {
              token = tokens[++i];
              body += '\n' + (token.tokens ? this.parseInline(token.tokens) : token.text);
            }
            out += top ? this.renderer.paragraph(body) : body;
            continue;
          }

          default: {
            const errMsg = 'Token with "' + token.type + '" type was not found.';
            if (this.options.silent) {
              console.error(errMsg);
              return;
            } else {
              throw new Error(errMsg);
            }
          }
        }
      }

      return out;
    }

    /**
     * Parse Inline Tokens
     */
    parseInline(tokens, renderer) {
      renderer = renderer || this.renderer;
      let out = '',
        i,
        token,
        ret;

      const l = tokens.length;
      for (i = 0; i < l; i++) {
        token = tokens[i];

        // Run any renderer extensions
        if (this.options.extensions && this.options.extensions.renderers && this.options.extensions.renderers[token.type]) {
          ret = this.options.extensions.renderers[token.type].call({ parser: this }, token);
          if (ret !== false || !['escape', 'html', 'link', 'image', 'strong', 'em', 'codespan', 'br', 'del', 'text'].includes(token.type)) {
            out += ret || '';
            continue;
          }
        }

        switch (token.type) {
          case 'escape': {
            out += renderer.text(token.text);
            break;
          }
          case 'html': {
            out += renderer.html(token.text);
            break;
          }
          case 'link': {
            out += renderer.link(token.href, token.title, this.parseInline(token.tokens, renderer));
            break;
          }
          case 'image': {
            out += renderer.image(token.href, token.title, token.text);
            break;
          }
          case 'strong': {
            out += renderer.strong(this.parseInline(token.tokens, renderer));
            break;
          }
          case 'em': {
            out += renderer.em(this.parseInline(token.tokens, renderer));
            break;
          }
          case 'codespan': {
            out += renderer.codespan(token.text);
            break;
          }
          case 'br': {
            out += renderer.br();
            break;
          }
          case 'del': {
            out += renderer.del(this.parseInline(token.tokens, renderer));
            break;
          }
          case 'text': {
            out += renderer.text(token.text);
            break;
          }
          default: {
            const errMsg = 'Token with "' + token.type + '" type was not found.';
            if (this.options.silent) {
              console.error(errMsg);
              return;
            } else {
              throw new Error(errMsg);
            }
          }
        }
      }
      return out;
    }
  };

  const Lexer$1 = Lexer_1$1;
  const Parser$1 = Parser_1$1;
  const Tokenizer$1 = Tokenizer_1$1;
  const Renderer$1 = Renderer_1$1;
  const TextRenderer$1 = TextRenderer_1$1;
  const Slugger$1 = Slugger_1$1;
  const {
    merge,
    checkSanitizeDeprecation,
    escape
  } = helpers;
  const {
    getDefaults,
    changeDefaults,
    defaults: defaults$6
  } = defaults$5.exports;

  /**
   * Marked
   */
  function marked$1(src, opt, callback) {
    // throw error in case of non string input
    if (typeof src === 'undefined' || src === null) {
      throw new Error('marked(): input parameter is undefined or null');
    }
    if (typeof src !== 'string') {
      throw new Error('marked(): input parameter is of type '
        + Object.prototype.toString.call(src) + ', string expected');
    }

    if (typeof opt === 'function') {
      callback = opt;
      opt = null;
    }

    opt = merge({}, marked$1.defaults, opt || {});
    checkSanitizeDeprecation(opt);

    if (callback) {
      const highlight = opt.highlight;
      let tokens;

      try {
        tokens = Lexer$1.lex(src, opt);
      } catch (e) {
        return callback(e);
      }

      const done = function(err) {
        let out;

        if (!err) {
          try {
            if (opt.walkTokens) {
              marked$1.walkTokens(tokens, opt.walkTokens);
            }
            out = Parser$1.parse(tokens, opt);
          } catch (e) {
            err = e;
          }
        }

        opt.highlight = highlight;

        return err
          ? callback(err)
          : callback(null, out);
      };

      if (!highlight || highlight.length < 3) {
        return done();
      }

      delete opt.highlight;

      if (!tokens.length) return done();

      let pending = 0;
      marked$1.walkTokens(tokens, function(token) {
        if (token.type === 'code') {
          pending++;
          setTimeout(() => {
            highlight(token.text, token.lang, function(err, code) {
              if (err) {
                return done(err);
              }
              if (code != null && code !== token.text) {
                token.text = code;
                token.escaped = true;
              }

              pending--;
              if (pending === 0) {
                done();
              }
            });
          }, 0);
        }
      });

      if (pending === 0) {
        done();
      }

      return;
    }

    try {
      const tokens = Lexer$1.lex(src, opt);
      if (opt.walkTokens) {
        marked$1.walkTokens(tokens, opt.walkTokens);
      }
      return Parser$1.parse(tokens, opt);
    } catch (e) {
      e.message += '\nPlease report this to https://github.com/markedjs/marked.';
      if (opt.silent) {
        return '<p>An error occurred:</p><pre>'
          + escape(e.message + '', true)
          + '</pre>';
      }
      throw e;
    }
  }

  /**
   * Options
   */

  marked$1.options =
  marked$1.setOptions = function(opt) {
    merge(marked$1.defaults, opt);
    changeDefaults(marked$1.defaults);
    return marked$1;
  };

  marked$1.getDefaults = getDefaults;

  marked$1.defaults = defaults$6;

  /**
   * Use Extension
   */

  marked$1.use = function(...args) {
    const opts = merge({}, ...args);
    const extensions = marked$1.defaults.extensions || { renderers: {}, childTokens: {} };
    let hasExtensions;

    args.forEach((pack) => {
      // ==-- Parse "addon" extensions --== //
      if (pack.extensions) {
        hasExtensions = true;
        pack.extensions.forEach((ext) => {
          if (!ext.name) {
            throw new Error('extension name required');
          }
          if (ext.renderer) { // Renderer extensions
            const prevRenderer = extensions.renderers ? extensions.renderers[ext.name] : null;
            if (prevRenderer) {
              // Replace extension with func to run new extension but fall back if false
              extensions.renderers[ext.name] = function(...args) {
                let ret = ext.renderer.apply(this, args);
                if (ret === false) {
                  ret = prevRenderer.apply(this, args);
                }
                return ret;
              };
            } else {
              extensions.renderers[ext.name] = ext.renderer;
            }
          }
          if (ext.tokenizer) { // Tokenizer Extensions
            if (!ext.level || (ext.level !== 'block' && ext.level !== 'inline')) {
              throw new Error("extension level must be 'block' or 'inline'");
            }
            if (extensions[ext.level]) {
              extensions[ext.level].unshift(ext.tokenizer);
            } else {
              extensions[ext.level] = [ext.tokenizer];
            }
            if (ext.start) { // Function to check for start of token
              if (ext.level === 'block') {
                if (extensions.startBlock) {
                  extensions.startBlock.push(ext.start);
                } else {
                  extensions.startBlock = [ext.start];
                }
              } else if (ext.level === 'inline') {
                if (extensions.startInline) {
                  extensions.startInline.push(ext.start);
                } else {
                  extensions.startInline = [ext.start];
                }
              }
            }
          }
          if (ext.childTokens) { // Child tokens to be visited by walkTokens
            extensions.childTokens[ext.name] = ext.childTokens;
          }
        });
      }

      // ==-- Parse "overwrite" extensions --== //
      if (pack.renderer) {
        const renderer = marked$1.defaults.renderer || new Renderer$1();
        for (const prop in pack.renderer) {
          const prevRenderer = renderer[prop];
          // Replace renderer with func to run extension, but fall back if false
          renderer[prop] = (...args) => {
            let ret = pack.renderer[prop].apply(renderer, args);
            if (ret === false) {
              ret = prevRenderer.apply(renderer, args);
            }
            return ret;
          };
        }
        opts.renderer = renderer;
      }
      if (pack.tokenizer) {
        const tokenizer = marked$1.defaults.tokenizer || new Tokenizer$1();
        for (const prop in pack.tokenizer) {
          const prevTokenizer = tokenizer[prop];
          // Replace tokenizer with func to run extension, but fall back if false
          tokenizer[prop] = (...args) => {
            let ret = pack.tokenizer[prop].apply(tokenizer, args);
            if (ret === false) {
              ret = prevTokenizer.apply(tokenizer, args);
            }
            return ret;
          };
        }
        opts.tokenizer = tokenizer;
      }

      // ==-- Parse WalkTokens extensions --== //
      if (pack.walkTokens) {
        const walkTokens = marked$1.defaults.walkTokens;
        opts.walkTokens = (token) => {
          pack.walkTokens.call(this, token);
          if (walkTokens) {
            walkTokens(token);
          }
        };
      }

      if (hasExtensions) {
        opts.extensions = extensions;
      }

      marked$1.setOptions(opts);
    });
  };

  /**
   * Run callback for every token
   */

  marked$1.walkTokens = function(tokens, callback) {
    for (const token of tokens) {
      callback(token);
      switch (token.type) {
        case 'table': {
          for (const cell of token.header) {
            marked$1.walkTokens(cell.tokens, callback);
          }
          for (const row of token.rows) {
            for (const cell of row) {
              marked$1.walkTokens(cell.tokens, callback);
            }
          }
          break;
        }
        case 'list': {
          marked$1.walkTokens(token.items, callback);
          break;
        }
        default: {
          if (marked$1.defaults.extensions && marked$1.defaults.extensions.childTokens && marked$1.defaults.extensions.childTokens[token.type]) { // Walk any extensions
            marked$1.defaults.extensions.childTokens[token.type].forEach(function(childTokens) {
              marked$1.walkTokens(token[childTokens], callback);
            });
          } else if (token.tokens) {
            marked$1.walkTokens(token.tokens, callback);
          }
        }
      }
    }
  };

  /**
   * Parse Inline
   */
  marked$1.parseInline = function(src, opt) {
    // throw error in case of non string input
    if (typeof src === 'undefined' || src === null) {
      throw new Error('marked.parseInline(): input parameter is undefined or null');
    }
    if (typeof src !== 'string') {
      throw new Error('marked.parseInline(): input parameter is of type '
        + Object.prototype.toString.call(src) + ', string expected');
    }

    opt = merge({}, marked$1.defaults, opt || {});
    checkSanitizeDeprecation(opt);

    try {
      const tokens = Lexer$1.lexInline(src, opt);
      if (opt.walkTokens) {
        marked$1.walkTokens(tokens, opt.walkTokens);
      }
      return Parser$1.parseInline(tokens, opt);
    } catch (e) {
      e.message += '\nPlease report this to https://github.com/markedjs/marked.';
      if (opt.silent) {
        return '<p>An error occurred:</p><pre>'
          + escape(e.message + '', true)
          + '</pre>';
      }
      throw e;
    }
  };

  /**
   * Expose
   */
  marked$1.Parser = Parser$1;
  marked$1.parser = Parser$1.parse;
  marked$1.Renderer = Renderer$1;
  marked$1.TextRenderer = TextRenderer$1;
  marked$1.Lexer = Lexer$1;
  marked$1.lexer = Lexer$1.lex;
  marked$1.Tokenizer = Tokenizer$1;
  marked$1.Slugger = Slugger$1;
  marked$1.parse = marked$1;

  var marked_1 = marked$1;

  const marked$2 = marked_1;
  const Lexer = Lexer_1$1;
  const Parser = Parser_1$1;
  const Tokenizer = Tokenizer_1$1;
  const Renderer$3 = Renderer_1$1;
  const TextRenderer = TextRenderer_1$1;
  const Slugger = Slugger_1$1;

  esmEntry$1.exports = marked$2;
  esmEntry$1.exports.parse = marked$2;
  esmEntry$1.exports.Parser = Parser;
  esmEntry$1.exports.parser = Parser.parse;
  esmEntry$1.exports.Renderer = Renderer$3;
  esmEntry$1.exports.TextRenderer = TextRenderer;
  esmEntry$1.exports.Lexer = Lexer;
  esmEntry$1.exports.lexer = Lexer.lex;
  esmEntry$1.exports.Tokenizer = Tokenizer;
  esmEntry$1.exports.Slugger = Slugger;

  var esmEntry = esmEntry$1.exports;

  var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  function commonjsRequire (path) {
  	throw new Error('Could not dynamically require "' + path + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
  }

  var pluralize$1$1 = {exports: {}};

  /* global define */

  (function (module, exports) {
  (function (root, pluralize) {
    /* istanbul ignore else */
    if (typeof commonjsRequire === 'function' && 'object' === 'object' && 'object' === 'object') {
      // Node.
      module.exports = pluralize();
    } else {
      // Browser global.
      root.pluralize = pluralize();
    }
  })(commonjsGlobal, function () {
    // Rule storage - pluralize and singularize need to be run sequentially,
    // while other rules can be optimized using an object for instant lookups.
    var pluralRules = [];
    var singularRules = [];
    var uncountables = {};
    var irregularPlurals = {};
    var irregularSingles = {};

    /**
     * Sanitize a pluralization rule to a usable regular expression.
     *
     * @param  {(RegExp|string)} rule
     * @return {RegExp}
     */
    function sanitizeRule (rule) {
      if (typeof rule === 'string') {
        return new RegExp('^' + rule + '$', 'i');
      }

      return rule;
    }

    /**
     * Pass in a word token to produce a function that can replicate the case on
     * another word.
     *
     * @param  {string}   word
     * @param  {string}   token
     * @return {Function}
     */
    function restoreCase (word, token) {
      // Tokens are an exact match.
      if (word === token) return token;

      // Lower cased words. E.g. "hello".
      if (word === word.toLowerCase()) return token.toLowerCase();

      // Upper cased words. E.g. "WHISKY".
      if (word === word.toUpperCase()) return token.toUpperCase();

      // Title cased words. E.g. "Title".
      if (word[0] === word[0].toUpperCase()) {
        return token.charAt(0).toUpperCase() + token.substr(1).toLowerCase();
      }

      // Lower cased words. E.g. "test".
      return token.toLowerCase();
    }

    /**
     * Interpolate a regexp string.
     *
     * @param  {string} str
     * @param  {Array}  args
     * @return {string}
     */
    function interpolate (str, args) {
      return str.replace(/\$(\d{1,2})/g, function (match, index) {
        return args[index] || '';
      });
    }

    /**
     * Replace a word using a rule.
     *
     * @param  {string} word
     * @param  {Array}  rule
     * @return {string}
     */
    function replace (word, rule) {
      return word.replace(rule[0], function (match, index) {
        var result = interpolate(rule[1], arguments);

        if (match === '') {
          return restoreCase(word[index - 1], result);
        }

        return restoreCase(match, result);
      });
    }

    /**
     * Sanitize a word by passing in the word and sanitization rules.
     *
     * @param  {string}   token
     * @param  {string}   word
     * @param  {Array}    rules
     * @return {string}
     */
    function sanitizeWord (token, word, rules) {
      // Empty string or doesn't need fixing.
      if (!token.length || uncountables.hasOwnProperty(token)) {
        return word;
      }

      var len = rules.length;

      // Iterate over the sanitization rules and use the first one to match.
      while (len--) {
        var rule = rules[len];

        if (rule[0].test(word)) return replace(word, rule);
      }

      return word;
    }

    /**
     * Replace a word with the updated word.
     *
     * @param  {Object}   replaceMap
     * @param  {Object}   keepMap
     * @param  {Array}    rules
     * @return {Function}
     */
    function replaceWord (replaceMap, keepMap, rules) {
      return function (word) {
        // Get the correct token and case restoration functions.
        var token = word.toLowerCase();

        // Check against the keep object map.
        if (keepMap.hasOwnProperty(token)) {
          return restoreCase(word, token);
        }

        // Check against the replacement map for a direct word replacement.
        if (replaceMap.hasOwnProperty(token)) {
          return restoreCase(word, replaceMap[token]);
        }

        // Run all the rules against the word.
        return sanitizeWord(token, word, rules);
      };
    }

    /**
     * Check if a word is part of the map.
     */
    function checkWord (replaceMap, keepMap, rules, bool) {
      return function (word) {
        var token = word.toLowerCase();

        if (keepMap.hasOwnProperty(token)) return true;
        if (replaceMap.hasOwnProperty(token)) return false;

        return sanitizeWord(token, token, rules) === token;
      };
    }

    /**
     * Pluralize or singularize a word based on the passed in count.
     *
     * @param  {string}  word      The word to pluralize
     * @param  {number}  count     How many of the word exist
     * @param  {boolean} inclusive Whether to prefix with the number (e.g. 3 ducks)
     * @return {string}
     */
    function pluralize (word, count, inclusive) {
      var pluralized = count === 1
        ? pluralize.singular(word) : pluralize.plural(word);

      return (inclusive ? count + ' ' : '') + pluralized;
    }

    /**
     * Pluralize a word.
     *
     * @type {Function}
     */
    pluralize.plural = replaceWord(
      irregularSingles, irregularPlurals, pluralRules
    );

    /**
     * Check if a word is plural.
     *
     * @type {Function}
     */
    pluralize.isPlural = checkWord(
      irregularSingles, irregularPlurals, pluralRules
    );

    /**
     * Singularize a word.
     *
     * @type {Function}
     */
    pluralize.singular = replaceWord(
      irregularPlurals, irregularSingles, singularRules
    );

    /**
     * Check if a word is singular.
     *
     * @type {Function}
     */
    pluralize.isSingular = checkWord(
      irregularPlurals, irregularSingles, singularRules
    );

    /**
     * Add a pluralization rule to the collection.
     *
     * @param {(string|RegExp)} rule
     * @param {string}          replacement
     */
    pluralize.addPluralRule = function (rule, replacement) {
      pluralRules.push([sanitizeRule(rule), replacement]);
    };

    /**
     * Add a singularization rule to the collection.
     *
     * @param {(string|RegExp)} rule
     * @param {string}          replacement
     */
    pluralize.addSingularRule = function (rule, replacement) {
      singularRules.push([sanitizeRule(rule), replacement]);
    };

    /**
     * Add an uncountable word rule.
     *
     * @param {(string|RegExp)} word
     */
    pluralize.addUncountableRule = function (word) {
      if (typeof word === 'string') {
        uncountables[word.toLowerCase()] = true;
        return;
      }

      // Set singular and plural references for the word.
      pluralize.addPluralRule(word, '$0');
      pluralize.addSingularRule(word, '$0');
    };

    /**
     * Add an irregular word definition.
     *
     * @param {string} single
     * @param {string} plural
     */
    pluralize.addIrregularRule = function (single, plural) {
      plural = plural.toLowerCase();
      single = single.toLowerCase();

      irregularSingles[single] = plural;
      irregularPlurals[plural] = single;
    };

    /**
     * Irregular rules.
     */
    [
      // Pronouns.
      ['I', 'we'],
      ['me', 'us'],
      ['he', 'they'],
      ['she', 'they'],
      ['them', 'them'],
      ['myself', 'ourselves'],
      ['yourself', 'yourselves'],
      ['itself', 'themselves'],
      ['herself', 'themselves'],
      ['himself', 'themselves'],
      ['themself', 'themselves'],
      ['is', 'are'],
      ['was', 'were'],
      ['has', 'have'],
      ['this', 'these'],
      ['that', 'those'],
      // Words ending in with a consonant and `o`.
      ['echo', 'echoes'],
      ['dingo', 'dingoes'],
      ['volcano', 'volcanoes'],
      ['tornado', 'tornadoes'],
      ['torpedo', 'torpedoes'],
      // Ends with `us`.
      ['genus', 'genera'],
      ['viscus', 'viscera'],
      // Ends with `ma`.
      ['stigma', 'stigmata'],
      ['stoma', 'stomata'],
      ['dogma', 'dogmata'],
      ['lemma', 'lemmata'],
      ['schema', 'schemata'],
      ['anathema', 'anathemata'],
      // Other irregular rules.
      ['ox', 'oxen'],
      ['axe', 'axes'],
      ['die', 'dice'],
      ['yes', 'yeses'],
      ['foot', 'feet'],
      ['eave', 'eaves'],
      ['goose', 'geese'],
      ['tooth', 'teeth'],
      ['quiz', 'quizzes'],
      ['human', 'humans'],
      ['proof', 'proofs'],
      ['carve', 'carves'],
      ['valve', 'valves'],
      ['looey', 'looies'],
      ['thief', 'thieves'],
      ['groove', 'grooves'],
      ['pickaxe', 'pickaxes'],
      ['passerby', 'passersby']
    ].forEach(function (rule) {
      return pluralize.addIrregularRule(rule[0], rule[1]);
    });

    /**
     * Pluralization rules.
     */
    [
      [/s?$/i, 's'],
      [/[^\u0000-\u007F]$/i, '$0'],
      [/([^aeiou]ese)$/i, '$1'],
      [/(ax|test)is$/i, '$1es'],
      [/(alias|[^aou]us|t[lm]as|gas|ris)$/i, '$1es'],
      [/(e[mn]u)s?$/i, '$1s'],
      [/([^l]ias|[aeiou]las|[ejzr]as|[iu]am)$/i, '$1'],
      [/(alumn|syllab|vir|radi|nucle|fung|cact|stimul|termin|bacill|foc|uter|loc|strat)(?:us|i)$/i, '$1i'],
      [/(alumn|alg|vertebr)(?:a|ae)$/i, '$1ae'],
      [/(seraph|cherub)(?:im)?$/i, '$1im'],
      [/(her|at|gr)o$/i, '$1oes'],
      [/(agend|addend|millenni|dat|extrem|bacteri|desiderat|strat|candelabr|errat|ov|symposi|curricul|automat|quor)(?:a|um)$/i, '$1a'],
      [/(apheli|hyperbat|periheli|asyndet|noumen|phenomen|criteri|organ|prolegomen|hedr|automat)(?:a|on)$/i, '$1a'],
      [/sis$/i, 'ses'],
      [/(?:(kni|wi|li)fe|(ar|l|ea|eo|oa|hoo)f)$/i, '$1$2ves'],
      [/([^aeiouy]|qu)y$/i, '$1ies'],
      [/([^ch][ieo][ln])ey$/i, '$1ies'],
      [/(x|ch|ss|sh|zz)$/i, '$1es'],
      [/(matr|cod|mur|sil|vert|ind|append)(?:ix|ex)$/i, '$1ices'],
      [/\b((?:tit)?m|l)(?:ice|ouse)$/i, '$1ice'],
      [/(pe)(?:rson|ople)$/i, '$1ople'],
      [/(child)(?:ren)?$/i, '$1ren'],
      [/eaux$/i, '$0'],
      [/m[ae]n$/i, 'men'],
      ['thou', 'you']
    ].forEach(function (rule) {
      return pluralize.addPluralRule(rule[0], rule[1]);
    });

    /**
     * Singularization rules.
     */
    [
      [/s$/i, ''],
      [/(ss)$/i, '$1'],
      [/(wi|kni|(?:after|half|high|low|mid|non|night|[^\w]|^)li)ves$/i, '$1fe'],
      [/(ar|(?:wo|[ae])l|[eo][ao])ves$/i, '$1f'],
      [/ies$/i, 'y'],
      [/\b([pl]|zomb|(?:neck|cross)?t|coll|faer|food|gen|goon|group|lass|talk|goal|cut)ies$/i, '$1ie'],
      [/\b(mon|smil)ies$/i, '$1ey'],
      [/\b((?:tit)?m|l)ice$/i, '$1ouse'],
      [/(seraph|cherub)im$/i, '$1'],
      [/(x|ch|ss|sh|zz|tto|go|cho|alias|[^aou]us|t[lm]as|gas|(?:her|at|gr)o|[aeiou]ris)(?:es)?$/i, '$1'],
      [/(analy|diagno|parenthe|progno|synop|the|empha|cri|ne)(?:sis|ses)$/i, '$1sis'],
      [/(movie|twelve|abuse|e[mn]u)s$/i, '$1'],
      [/(test)(?:is|es)$/i, '$1is'],
      [/(alumn|syllab|vir|radi|nucle|fung|cact|stimul|termin|bacill|foc|uter|loc|strat)(?:us|i)$/i, '$1us'],
      [/(agend|addend|millenni|dat|extrem|bacteri|desiderat|strat|candelabr|errat|ov|symposi|curricul|quor)a$/i, '$1um'],
      [/(apheli|hyperbat|periheli|asyndet|noumen|phenomen|criteri|organ|prolegomen|hedr|automat)a$/i, '$1on'],
      [/(alumn|alg|vertebr)ae$/i, '$1a'],
      [/(cod|mur|sil|vert|ind)ices$/i, '$1ex'],
      [/(matr|append)ices$/i, '$1ix'],
      [/(pe)(rson|ople)$/i, '$1rson'],
      [/(child)ren$/i, '$1'],
      [/(eau)x?$/i, '$1'],
      [/men$/i, 'man']
    ].forEach(function (rule) {
      return pluralize.addSingularRule(rule[0], rule[1]);
    });

    /**
     * Uncountable rules.
     */
    [
      // Singular words with no plurals.
      'adulthood',
      'advice',
      'agenda',
      'aid',
      'aircraft',
      'alcohol',
      'ammo',
      'analytics',
      'anime',
      'athletics',
      'audio',
      'bison',
      'blood',
      'bream',
      'buffalo',
      'butter',
      'carp',
      'cash',
      'chassis',
      'chess',
      'clothing',
      'cod',
      'commerce',
      'cooperation',
      'corps',
      'debris',
      'diabetes',
      'digestion',
      'elk',
      'energy',
      'equipment',
      'excretion',
      'expertise',
      'firmware',
      'flounder',
      'fun',
      'gallows',
      'garbage',
      'graffiti',
      'hardware',
      'headquarters',
      'health',
      'herpes',
      'highjinks',
      'homework',
      'housework',
      'information',
      'jeans',
      'justice',
      'kudos',
      'labour',
      'literature',
      'machinery',
      'mackerel',
      'mail',
      'media',
      'mews',
      'moose',
      'music',
      'mud',
      'manga',
      'news',
      'only',
      'personnel',
      'pike',
      'plankton',
      'pliers',
      'police',
      'pollution',
      'premises',
      'rain',
      'research',
      'rice',
      'salmon',
      'scissors',
      'series',
      'sewage',
      'shambles',
      'shrimp',
      'software',
      'species',
      'staff',
      'swine',
      'tennis',
      'traffic',
      'transportation',
      'trout',
      'tuna',
      'wealth',
      'welfare',
      'whiting',
      'wildebeest',
      'wildlife',
      'you',
      /pok[eé]mon$/i,
      // Regexes.
      /[^aeiou]ese$/i, // "chinese", "japanese"
      /deer$/i, // "deer", "reindeer"
      /fish$/i, // "fish", "blowfish", "angelfish"
      /measles$/i,
      /o[iu]s$/i, // "carnivorous"
      /pox$/i, // "chickpox", "smallpox"
      /sheep$/i
    ].forEach(pluralize.addUncountableRule);

    return pluralize;
  });
  }(pluralize$1$1));

  var pluralize$2 = pluralize$1$1.exports;

  /*! (c) Andrea Giammarchi (ISC) */var hyperHTML=function(N){var t={};try{t.WeakMap=WeakMap;}catch(e){t.WeakMap=function(t,e){var n=e.defineProperty,r=e.hasOwnProperty,i=a.prototype;return i.delete=function(e){return this.has(e)&&delete e[this._]},i.get=function(e){return this.has(e)?e[this._]:void 0},i.has=function(e){return r.call(e,this._)},i.set=function(e,t){return n(e,this._,{configurable:!0,value:t}),this},a;function a(e){n(this,"_",{value:"_@ungap/weakmap"+t++}),e&&e.forEach(o,this);}function o(e){this.set(e[0],e[1]);}}(Math.random(),Object);}var s=t.WeakMap,i={};try{i.WeakSet=WeakSet;}catch(e){!function(e,t){var n=r.prototype;function r(){t(this,"_",{value:"_@ungap/weakmap"+e++});}n.add=function(e){return this.has(e)||t(e,this._,{value:!0,configurable:!0}),this},n.has=function(e){return this.hasOwnProperty.call(e,this._)},n.delete=function(e){return this.has(e)&&delete e[this._]},i.WeakSet=r;}(Math.random(),Object.defineProperty);}function m(e,t,n,r,i,a){for(var o=("selectedIndex"in t),u=o;r<i;){var c,l=e(n[r],1);t.insertBefore(l,a),o&&u&&l.selected&&(u=!u,c=t.selectedIndex,t.selectedIndex=c<0?r:f.call(t.querySelectorAll("option"),l)),r++;}}function y(e,t){return e==t}function b(e){return e}function w(e,t,n,r,i,a,o){var u=a-i;if(u<1)return -1;for(;u<=n-t;){for(var c=t,l=i;c<n&&l<a&&o(e[c],r[l]);)c++,l++;if(l===a)return t;t=c+1;}return -1}function x(e,t,n,r,i){return n<r?e(t[n],0):0<n?e(t[n-1],-0).nextSibling:i}function E(e,t,n,r){for(;n<r;)a(e(t[n++],-1));}function C(e,t,n,r,i,a,o,u,c,l,s,f,h){!function(e,t,n,r,i,a,o,u,c){for(var l=[],s=e.length,f=o,h=0;h<s;)switch(e[h++]){case 0:i++,f++;break;case 1:l.push(r[i]),m(t,n,r,i++,i,f<u?t(a[f],0):c);break;case-1:f++;}for(h=0;h<s;)switch(e[h++]){case 0:o++;break;case-1:-1<l.indexOf(a[o])?o++:E(t,a,o++,o);}}(function(e,t,n,r,i,a,o){var u,c,l,s,f,h,d=n+a,v=[];e:for(m=0;m<=d;m++){if(50<m)return null;for(h=m-1,s=m?v[m-1]:[0,0],f=v[m]=[],u=-m;u<=m;u+=2){for(c=(l=u===-m||u!==m&&s[h+u-1]<s[h+u+1]?s[h+u+1]:s[h+u-1]+1)-u;l<a&&c<n&&o(r[i+l],e[t+c]);)l++,c++;if(l===a&&c===n)break e;f[m+u]=l;}}for(var p=Array(m/2+d/2),g=p.length-1,m=v.length-1;0<=m;m--){for(;0<l&&0<c&&o(r[i+l-1],e[t+c-1]);)p[g--]=0,l--,c--;if(!m)break;h=m-1,s=m?v[m-1]:[0,0],(u=l-c)===-m||u!==m&&s[h+u-1]<s[h+u+1]?(c--,p[g--]=1):(l--,p[g--]=-1);}return p}(n,r,a,o,u,l,f)||function(e,t,n,r,i,a,o,u){var c=0,l=r<u?r:u,s=Array(l++),f=Array(l);f[0]=-1;for(var h=1;h<l;h++)f[h]=o;for(var d=i.slice(a,o),v=t;v<n;v++){var p,g=d.indexOf(e[v]);-1<g&&(-1<(c=k(f,l,p=g+a))&&(f[c]=p,s[c]={newi:v,oldi:p,prev:s[c-1]}));}for(c=--l,--o;f[c]>o;)--c;l=u+r-c;var m=Array(l),y=s[c];for(--n;y;){for(var b=y.newi,w=y.oldi;b<n;)m[--l]=1,--n;for(;w<o;)m[--l]=-1,--o;m[--l]=0,--n,--o,y=y.prev;}for(;t<=n;)m[--l]=1,--n;for(;a<=o;)m[--l]=-1,--o;return m}(n,r,i,a,o,u,c,l),e,t,n,r,o,u,s,h);}var e=i.WeakSet,f=[].indexOf,k=function(e,t,n){for(var r=1,i=t;r<i;){var a=(r+i)/2>>>0;n<e[a]?i=a:r=1+a;}return r},a=function(e){return (e.remove||function(){var e=this.parentNode;e&&e.removeChild(this);}).call(e)};function l(e,t,n,r){for(var i=(r=r||{}).compare||y,a=r.node||b,o=null==r.before?null:a(r.before,0),u=t.length,c=u,l=0,s=n.length,f=0;l<c&&f<s&&i(t[l],n[f]);)l++,f++;for(;l<c&&f<s&&i(t[c-1],n[s-1]);)c--,s--;var h=l===c,d=f===s;if(h&&d)return n;if(h&&f<s)return m(a,e,n,f,s,x(a,t,l,u,o)),n;if(d&&l<c)return E(a,t,l,c),n;var v=c-l,p=s-f,g=-1;if(v<p){if(-1<(g=w(n,f,s,t,l,c,i)))return m(a,e,n,f,g,a(t[l],0)),m(a,e,n,g+v,s,x(a,t,c,u,o)),n}else if(p<v&&-1<(g=w(t,l,c,n,f,s,i)))return E(a,t,l,g),E(a,t,g+p,c),n;return v<2||p<2?(m(a,e,n,f,s,a(t[l],0)),E(a,t,l,c)):v==p&&function(e,t,n,r,i,a){for(;r<i&&a(n[r],e[t-1]);)r++,t--;return 0===t}(n,s,t,l,c,i)?m(a,e,n,f,s,x(a,t,c,u,o)):C(a,e,n,f,s,p,t,l,c,v,u,i,o),n}var n,r={};function o(e,t){t=t||{};var n=N.createEvent("CustomEvent");return n.initCustomEvent(e,!!t.bubbles,!!t.cancelable,t.detail),n}r.CustomEvent="function"==typeof CustomEvent?CustomEvent:(o[n="prototype"]=new o("").constructor[n],o);var u=r.CustomEvent,c={};try{c.Map=Map;}catch(e){c.Map=function(){var n=0,i=[],a=[];return {delete:function(e){var t=r(e);return t&&(i.splice(n,1),a.splice(n,1)),t},forEach:function(n,r){i.forEach(function(e,t){n.call(r,a[t],e,this);},this);},get:function(e){return r(e)?a[n]:void 0},has:r,set:function(e,t){return a[r(e)?n:i.push(e)-1]=t,this}};function r(e){return -1<(n=i.indexOf(e))}};}var h=c.Map;function d(){return this}function v(e,t){var n="_"+e+"$";return {get:function(){return this[n]||p(this,n,t.call(this,e))},set:function(e){p(this,n,e);}}}var p=function(e,t,n){return Object.defineProperty(e,t,{configurable:!0,value:"function"==typeof n?function(){return e._wire$=n.apply(this,arguments)}:n})[t]};Object.defineProperties(d.prototype,{ELEMENT_NODE:{value:1},nodeType:{value:-1}});var g,A,S,O,T,M,_={},j={},L=[],P=j.hasOwnProperty,D=0,W={attributes:_,define:function(e,t){e.indexOf("-")<0?(e in j||(D=L.push(e)),j[e]=t):_[e]=t;},invoke:function(e,t){for(var n=0;n<D;n++){var r=L[n];if(P.call(e,r))return j[r](e[r],t)}}},$=Array.isArray||(A=(g={}.toString).call([]),function(e){return g.call(e)===A}),R=(S=N,O="fragment",M="content"in H(T="template")?function(e){var t=H(T);return t.innerHTML=e,t.content}:function(e){var t,n=H(O),r=H(T);return F(n,/^[^\S]*?<(col(?:group)?|t(?:head|body|foot|r|d|h))/i.test(e)?(t=RegExp.$1,r.innerHTML="<table>"+e+"</table>",r.querySelectorAll(t)):(r.innerHTML=e,r.childNodes)),n},function(e,t){return ("svg"===t?function(e){var t=H(O),n=H("div");return n.innerHTML='<svg xmlns="http://www.w3.org/2000/svg">'+e+"</svg>",F(t,n.firstChild.childNodes),t}:M)(e)});function F(e,t){for(var n=t.length;n--;)e.appendChild(t[0]);}function H(e){return e===O?S.createDocumentFragment():S.createElementNS("http://www.w3.org/1999/xhtml",e)}var I,z,V,Z,G,q,B,J,K,Q,U=(z="appendChild",V="cloneNode",Z="createTextNode",q=(G="importNode")in(I=N),(B=I.createDocumentFragment())[z](I[Z]("g")),B[z](I[Z]("")),(q?I[G](B,!0):B[V](!0)).childNodes.length<2?function e(t,n){for(var r=t[V](),i=t.childNodes||[],a=i.length,o=0;n&&o<a;o++)r[z](e(i[o],n));return r}:q?I[G]:function(e,t){return e[V](!!t)}),X="".trim||function(){return String(this).replace(/^\s+|\s+/g,"")},Y="-"+Math.random().toFixed(6)+"%",ee=!1;try{J=N.createElement("template"),Q="tabindex",(K="content")in J&&(J.innerHTML="<p "+Q+'="'+Y+'"></p>',J[K].childNodes[0].getAttribute(Q)==Y)||(Y="_dt: "+Y.slice(1,-1)+";",ee=!0);}catch(e){}var te="\x3c!--"+Y+"--\x3e",ne=8,re=1,ie=3,ae=/^(?:style|textarea)$/i,oe=/^(?:area|base|br|col|embed|hr|img|input|keygen|link|menuitem|meta|param|source|track|wbr)$/i;var ue=" \\f\\n\\r\\t",ce="[^"+ue+"\\/>\"'=]+",le="["+ue+"]+"+ce,se="<([A-Za-z]+[A-Za-z0-9:._-]*)((?:",fe="(?:\\s*=\\s*(?:'[^']*?'|\"[^\"]*?\"|<[^>]*?>|"+ce.replace("\\/","")+"))?)",he=new RegExp(se+le+fe+"+)(["+ue+"]*/?>)","g"),de=new RegExp(se+le+fe+"*)(["+ue+"]*/>)","g"),ve=new RegExp("("+le+"\\s*=\\s*)(['\"]?)"+te+"\\2","gi");function pe(e,t,n,r){return "<"+t+n.replace(ve,ge)+r}function ge(e,t,n){return t+(n||'"')+Y+(n||'"')}function me(e,t,n){return oe.test(t)?e:"<"+t+n+"></"+t+">"}var ye=ee?function(e,t){var n=t.join(" ");return t.slice.call(e,0).sort(function(e,t){return n.indexOf(e.name)<=n.indexOf(t.name)?-1:1})}:function(e,t){return t.slice.call(e,0)};function be(e,t,n,r){for(var i=e.childNodes,a=i.length,o=0;o<a;){var u=i[o];switch(u.nodeType){case re:var c=r.concat(o);!function(e,t,n,r){var i,a=e.attributes,o=[],u=[],c=ye(a,n),l=c.length,s=0;for(;s<l;){var f=c[s++],h=f.value===Y;if(h||1<(i=f.value.split(te)).length){var d=f.name;if(o.indexOf(d)<0){o.push(d);var v=n.shift().replace(h?/^(?:|[\S\s]*?\s)(\S+?)\s*=\s*('|")?$/:new RegExp("^(?:|[\\S\\s]*?\\s)("+d+")\\s*=\\s*('|\")[\\S\\s]*","i"),"$1"),p=a[v]||a[v.toLowerCase()];if(h)t.push(we(p,r,v,null));else {for(var g=i.length-2;g--;)n.shift();t.push(we(p,r,v,i));}}u.push(f);}}l=u.length;var m=(s=0)<l&&ee&&!("ownerSVGElement"in e);for(;s<l;){var y=u[s++];m&&(y.value=""),e.removeAttribute(y.name);}var b=e.nodeName;if(/^script$/i.test(b)){var w=N.createElement(b);for(l=a.length,s=0;s<l;)w.setAttributeNode(a[s++].cloneNode(!0));w.textContent=e.textContent,e.parentNode.replaceChild(w,e);}}(u,t,n,c),be(u,t,n,c);break;case ne:var l=u.textContent;if(l===Y)n.shift(),t.push(ae.test(e.nodeName)?Ne(e,r):{type:"any",node:u,path:r.concat(o)});else switch(l.slice(0,2)){case"/*":if("*/"!==l.slice(-2))break;case"👻":e.removeChild(u),o--,a--;}break;case ie:ae.test(e.nodeName)&&X.call(u.textContent)===te&&(n.shift(),t.push(Ne(e,r)));}o++;}}function we(e,t,n,r){return {type:"attr",node:e,path:t,name:n,sparse:r}}function Ne(e,t){return {type:"text",node:e,path:t}}var xe,Ee=(xe=new s,{get:function(e){return xe.get(e)},set:function(e,t){return xe.set(e,t),t}});function Ce(o,f){var e=(o.convert||function(e){return e.join(te).replace(de,me).replace(he,pe)})(f),t=o.transform;t&&(e=t(e));var n=R(e,o.type);Se(n);var u=[];return be(n,u,f.slice(0),[]),{content:n,updates:function(c){for(var l=[],s=u.length,e=0,t=0;e<s;){var n=u[e++],r=function(e,t){for(var n=t.length,r=0;r<n;)e=e.childNodes[t[r++]];return e}(c,n.path);switch(n.type){case"any":l.push({fn:o.any(r,[]),sparse:!1});break;case"attr":var i=n.sparse,a=o.attribute(r,n.name,n.node);null===i?l.push({fn:a,sparse:!1}):(t+=i.length-2,l.push({fn:a,sparse:!0,values:i}));break;case"text":l.push({fn:o.text(r),sparse:!1}),r.textContent="";}}return s+=t,function(){var e=arguments.length;if(s!==e-1)throw new Error(e-1+" values instead of "+s+"\n"+f.join("${value}"));for(var t=1,n=1;t<e;){var r=l[t-n];if(r.sparse){var i=r.values,a=i[0],o=1,u=i.length;for(n+=u-2;o<u;)a+=arguments[t++]+i[o++];r.fn(a);}else r.fn(arguments[t++]);}return c}}}}var ke=[];function Ae(i){var a=ke,o=Se;return function(e){var t,n,r;return a!==e&&(t=i,n=a=e,r=Ee.get(n)||Ee.set(n,Ce(t,n)),o=r.updates(U.call(N,r.content,!0))),o.apply(null,arguments)}}function Se(e){for(var t=e.childNodes,n=t.length;n--;){var r=t[n];1!==r.nodeType&&0===X.call(r.textContent).length&&e.removeChild(r);}}var Oe,Te,Me=(Oe=/acit|ex(?:s|g|n|p|$)|rph|ows|mnc|ntw|ine[ch]|zoo|^ord/i,Te=/([^A-Z])([A-Z]+)/g,function(e,t){return "ownerSVGElement"in e?function(e,t){var n;return (n=t?t.cloneNode(!0):(e.setAttribute("style","--hyper:style;"),e.getAttributeNode("style"))).value="",e.setAttributeNode(n),je(n,!0)}(e,t):je(e.style,!1)});function _e(e,t,n){return t+"-"+n.toLowerCase()}function je(a,o){var u,c;return function(e){var t,n,r,i;switch(typeof e){case"object":if(e){if("object"===u){if(!o&&c!==e)for(n in c)n in e||(a[n]="");}else o?a.value="":a.cssText="";for(n in t=o?{}:a,e)r="number"!=typeof(i=e[n])||Oe.test(n)?i:i+"px",!o&&/^--/.test(n)?t.setProperty(n,r):t[n]=r;u="object",o?a.value=function(e){var t,n=[];for(t in e)n.push(t.replace(Te,_e),":",e[t],";");return n.join("")}(c=t):c=e;break}default:c!=e&&(u="string",c=e,o?a.value=e||"":a.cssText=e||"");}}}var Le,Pe,De=(Le=[].slice,(Pe=We.prototype).ELEMENT_NODE=1,Pe.nodeType=111,Pe.remove=function(e){var t,n=this.childNodes,r=this.firstChild,i=this.lastChild;return this._=null,e&&2===n.length?i.parentNode.removeChild(i):((t=this.ownerDocument.createRange()).setStartBefore(e?n[1]:r),t.setEndAfter(i),t.deleteContents()),r},Pe.valueOf=function(e){var t=this._,n=null==t;if(n&&(t=this._=this.ownerDocument.createDocumentFragment()),n||e)for(var r=this.childNodes,i=0,a=r.length;i<a;i++)t.appendChild(r[i]);return t},We);function We(e){var t=this.childNodes=Le.call(e,0);this.firstChild=t[0],this.lastChild=t[t.length-1],this.ownerDocument=t[0].ownerDocument,this._=null;}function $e(e){return {html:e}}function Re(e,t){switch(e.nodeType){case Ke:return 1/t<0?t?e.remove(!0):e.lastChild:t?e.valueOf(!0):e.firstChild;case Je:return Re(e.render(),t);default:return e}}function Fe(e,t){t(e.placeholder),"text"in e?Promise.resolve(e.text).then(String).then(t):"any"in e?Promise.resolve(e.any).then(t):"html"in e?Promise.resolve(e.html).then($e).then(t):Promise.resolve(W.invoke(e,t)).then(t);}function He(e){return null!=e&&"then"in e}var Ie,ze,Ve,Ze,Ge,qe="ownerSVGElement",Be="connected",Je=d.prototype.nodeType,Ke=De.prototype.nodeType,Qe=(ze=(Ie={Event:u,WeakSet:e}).Event,Ve=Ie.WeakSet,Ze=!0,Ge=null,function(e){return Ze&&(Ze=!Ze,Ge=new Ve,function(t){var i=new Ve,a=new Ve;try{new MutationObserver(u).observe(t,{subtree:!0,childList:!0});}catch(e){var n=0,r=[],o=function(e){r.push(e),clearTimeout(n),n=setTimeout(function(){u(r.splice(n=0,r.length));},0);};t.addEventListener("DOMNodeRemoved",function(e){o({addedNodes:[],removedNodes:[e.target]});},!0),t.addEventListener("DOMNodeInserted",function(e){o({addedNodes:[e.target],removedNodes:[]});},!0);}function u(e){for(var t,n=e.length,r=0;r<n;r++)c((t=e[r]).removedNodes,"disconnected",a,i),c(t.addedNodes,"connected",i,a);}function c(e,t,n,r){for(var i,a=new ze(t),o=e.length,u=0;u<o;1===(i=e[u++]).nodeType&&function e(t,n,r,i,a){Ge.has(t)&&!i.has(t)&&(a.delete(t),i.add(t),t.dispatchEvent(n));for(var o=t.children||[],u=o.length,c=0;c<u;e(o[c++],n,r,i,a));}(i,a,t,n,r));}}(e.ownerDocument)),Ge.add(e),e}),Ue=/^(?:form|list)$/i,Xe=[].slice;function Ye(e){return this.type=e,Ae(this)}var et=!(Ye.prototype={attribute:function(n,r,e){var i,t=qe in n;if("style"===r)return Me(n,e,t);if("."===r.slice(0,1))return l=n,s=r.slice(1),t?function(t){try{l[s]=t;}catch(e){l.setAttribute(s,t);}}:function(e){l[s]=e;};if("?"===r.slice(0,1))return o=n,u=r.slice(1),function(e){c!==!!e&&((c=!!e)?o.setAttribute(u,""):o.removeAttribute(u));};if(/^on/.test(r)){var a=r.slice(2);return a===Be||"disconnected"===a?Qe(n):r.toLowerCase()in n&&(a=a.toLowerCase()),function(e){i!==e&&(i&&n.removeEventListener(a,i,!1),(i=e)&&n.addEventListener(a,e,!1));}}if("data"===r||!t&&r in n&&!Ue.test(r))return function(e){i!==e&&(i=e,n[r]!==e&&null==e?(n[r]="",n.removeAttribute(r)):n[r]=e);};if(r in W.attributes)return function(e){var t=W.attributes[r](n,e);i!==t&&(null==(i=t)?n.removeAttribute(r):n.setAttribute(r,t));};var o,u,c,l,s,f=!1,h=e.cloneNode(!0);return function(e){i!==e&&(i=e,h.value!==e&&(null==e?(f&&(f=!1,n.removeAttributeNode(h)),h.value=e):(h.value=e,f||(f=!0,n.setAttributeNode(h)))));}},any:function(r,i){var a,o={node:Re,before:r},u=qe in r?"svg":"html",c=!1;return function e(t){switch(typeof t){case"string":case"number":case"boolean":c?a!==t&&(a=t,i[0].textContent=t):(c=!0,a=t,i=l(r.parentNode,i,[(n=t,r.ownerDocument.createTextNode(n))],o));break;case"function":e(t(r));break;case"object":case"undefined":if(null==t){c=!1,i=l(r.parentNode,i,[],o);break}default:if(c=!1,$(a=t))if(0===t.length)i.length&&(i=l(r.parentNode,i,[],o));else switch(typeof t[0]){case"string":case"number":case"boolean":e({html:t});break;case"object":if($(t[0])&&(t=t.concat.apply([],t)),He(t[0])){Promise.all(t).then(e);break}default:i=l(r.parentNode,i,t,o);}else "ELEMENT_NODE"in t?i=l(r.parentNode,i,11===t.nodeType?Xe.call(t.childNodes):[t],o):He(t)?t.then(e):"placeholder"in t?Fe(t,e):"text"in t?e(String(t.text)):"any"in t?e(t.any):"html"in t?i=l(r.parentNode,i,Xe.call(R([].concat(t.html).join(""),u).childNodes),o):"length"in t?e(Xe.call(t)):e(W.invoke(t,e));}var n;}},text:function(r){var i;return function e(t){var n;i!==t&&("object"==(n=typeof(i=t))&&t?He(t)?t.then(e):"placeholder"in t?Fe(t,e):"text"in t?e(String(t.text)):"any"in t?e(t.any):"html"in t?e([].concat(t.html).join("")):"length"in t?e(Xe.call(t).join("")):e(W.invoke(t,e)):"function"==n?e(t(r)):r.textContent=null==t?"":t);}}}),tt=function(e){var t,r,i,a,n=(t=(N.defaultView.navigator||{}).userAgent,/(Firefox|Safari)\/(\d+)/.test(t)&&!/(Chrom[eium]+|Android)\/(\d+)/.test(t)),o=!("raw"in e)||e.propertyIsEnumerable("raw")||!Object.isFrozen(e.raw);return n||o?(r={},i=function(e){for(var t=".",n=0;n<e.length;n++)t+=e[n].length+"."+e[n];return r[t]||(r[t]=e)},tt=o?i:(a=new s,function(e){return a.get(e)||(n=i(t=e),a.set(t,n),n);var t,n;})):et=!0,nt(e)};function nt(e){return et?e:tt(e)}function rt(e){for(var t=arguments.length,n=[nt(e)],r=1;r<t;)n.push(arguments[r++]);return n}var it=new s,at=function(t){var n,r,i;return function(){var e=rt.apply(null,arguments);return i!==e[0]?(i=e[0],r=new Ye(t),n=ut(r.apply(r,e))):r.apply(r,e),n}},ot=function(e,t){var n=t.indexOf(":"),r=it.get(e),i=t;return -1<n&&(i=t.slice(n+1),t=t.slice(0,n)||"html"),r||it.set(e,r={}),r[i]||(r[i]=at(t))},ut=function(e){var t=e.childNodes,n=t.length;return 1===n?t[0]:n?new De(t):e},ct=new s;function lt(){var e=ct.get(this),t=rt.apply(null,arguments);return e&&e.template===t[0]?e.tagger.apply(null,t):function(e){var t=new Ye(qe in this?"svg":"html");ct.set(this,{tagger:t,template:e}),this.textContent="",this.appendChild(t.apply(null,arguments));}.apply(this,t),this}var st,ft,ht,dt,vt=W.define,pt=Ye.prototype;function gt(e){return arguments.length<2?null==e?at("html"):"string"==typeof e?gt.wire(null,e):"raw"in e?at("html")(e):"nodeType"in e?gt.bind(e):ot(e,"html"):("raw"in e?at("html"):gt.wire).apply(null,arguments)}return gt.Component=d,gt.bind=function(e){return lt.bind(e)},gt.define=vt,gt.diff=l,(gt.hyper=gt).observe=Qe,gt.tagger=pt,gt.wire=function(e,t){return null==e?at(t||"html"):ot(e,t||"html")},gt._={WeakMap:s,WeakSet:e},st=at,ft=new s,ht=Object.create,dt=function(e,t){var n={w:null,p:null};return t.set(e,n),n},Object.defineProperties(d,{for:{configurable:!0,value:function(e,t){return function(e,t,n,r){var i,a,o,u=t.get(e)||dt(e,t);switch(typeof r){case"object":case"function":var c=u.w||(u.w=new s);return c.get(r)||(i=c,a=r,o=new e(n),i.set(a,o),o);default:var l=u.p||(u.p=ht(null));return l[r]||(l[r]=new e(n))}}(this,ft.get(e)||(n=e,r=new h,ft.set(n,r),r),e,null==t?"default":t);var n,r;}}}),Object.defineProperties(d.prototype,{handleEvent:{value:function(e){var t=e.currentTarget;this["getAttribute"in t&&t.getAttribute("data-call")||"on"+e.type](e);}},html:v("html",st),svg:v("svg",st),state:v("state",function(){return this.defaultState}),defaultState:{get:function(){return {}}},dispatch:{value:function(e,t){var n=this._wire$;if(n){var r=new u(e,{bubbles:!0,cancelable:!0,detail:t});return r.component=this,(n.dispatchEvent?n:n.firstChild).dispatchEvent(r)}return !1}},setState:{value:function(e,t){var n=this.state,r="function"==typeof e?e.call(this,n):e;for(var i in r)n[i]=r[i];return !1!==t&&this.render(),this}}}),gt}(document);

  // @ts-check

  /** @type {import("idb")} */
  // @ts-ignore
  const idb = _idb;
  /** @type {import("hyperhtml").default} */
  // @ts-ignore
  const html = hyperHTML;
  /** @type {import("marked")} */
  // @ts-ignore
  const marked = esmEntry;
  /** @type {import("pluralize")} */
  // @ts-ignore
  const pluralize$1 = pluralize$2;

  /** @type {import("sniffy-mimetype")} */
  // @ts-ignore
  const MIMEType = MIMEType$1;

  // @ts-check

  const dashes = /-/g;

  const ISODate = new Intl.DateTimeFormat(["en-ca-iso8601"], {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  /** CSS selector for matching elements that are non-normative */
  const nonNormativeSelector =
    ".informative, .note, .issue, .example, .ednote, .practice, .introductory";

  /**
   * Creates a link element that represents a resource hint.
   *
   * @param {ResourceHintOption} opts Configure the resource hint.
   * @return {HTMLLinkElement} A link element ready to use.
   */
  function createResourceHint(opts) {
    const url = new URL(opts.href, document.baseURI);
    const linkElem = document.createElement("link");
    let { href } = url;
    linkElem.rel = opts.hint;
    switch (linkElem.rel) {
      case "dns-prefetch":
      case "preconnect":
        href = url.origin;
        if (opts.corsMode || url.origin !== document.location.origin) {
          linkElem.crossOrigin = opts.corsMode || "anonymous";
        }
        break;
      case "preload":
        if ("as" in opts) {
          linkElem.setAttribute("as", opts.as);
        }
        break;
    }
    linkElem.href = href;
    if (!opts.dontRemove) {
      linkElem.classList.add("removeOnSave");
    }
    return linkElem;
  }

  // RESPEC STUFF
  /**
   * @param {Document} doc
   */
  function removeReSpec(doc) {
    doc.querySelectorAll(".remove, script[data-requiremodule]").forEach(elem => {
      elem.remove();
    });
  }

  /**
   * Adds error class to each element while emitting a warning
   * @param {HTMLElement} elem
   * @param {String} msg message to show in warning
   * @param {String=} title error message to add on each element
   */
  function markAsOffending(elem, msg, title) {
    elem.classList.add("respec-offending-element");
    if (!elem.hasAttribute("title")) {
      elem.setAttribute("title", title || msg);
    }
    if (!elem.id) {
      addId(elem, "respec-offender");
    }
  }

  // STRING HELPERS
  /**
   * @param {"conjunction"|"disjunction"} type
   * @param {"long"|"narrow"} style
   */
  function joinFactory(type, style = "long") {
    const formatter = new Intl.ListFormat(lang$2, { style, type });
    /**
     * @template T
     * @param {string[]} items
     * @param {(value: string, index: number, array: string[]) => any} [mapper]
     */
    return (items, mapper) => {
      let elemCount = 0;
      return formatter.formatToParts(items).map(({ type, value }) => {
        if (type === "element" && mapper) {
          return mapper(value, elemCount++, items);
        }
        return value;
      });
    };
  }

  /**
   * Takes an array and returns a string that separates each of its items with the
   * proper commas and "and". The second argument is a mapping function that can
   * convert the items before they are joined.
   */
  const conjunction = joinFactory("conjunction");
  const disjunction = joinFactory("disjunction");

  /**
   *
   * @param {string[]} items
   * @param {(value: undefined, index: number, array: undefined[]) => string} [mapper]
   */
  function joinAnd(items, mapper) {
    return conjunction(items, mapper).join("");
  }

  /**
   *
   * @param {string[]} items
   * @param {(value: undefined, index: number, array: undefined[]) => string} [mapper]
   */
  function joinOr(items, mapper) {
    return disjunction(items, mapper).join("");
  }

  /**
   * Trims string at both ends and replaces all other white space with a single
   * space.
   * @param {string} str
   */
  function norm(str) {
    return str.trim().replace(/\s+/g, " ");
  }

  /**
   * @param {string} lang
   */
  function resolveLanguageAlias(lang) {
    const aliases = {
      "zh-hans": "zh",
      "zh-cn": "zh",
    };
    return aliases[lang] || lang;
  }

  /**
   * @template {Record<string, Record<string, string|Function>>} T
   * @param {T} localizationStrings
   * @returns {T[keyof T]}
   */
  function getIntlData(localizationStrings, lang = lang$2) {
    lang = resolveLanguageAlias(lang.toLowerCase());
    // Proxy return type is a known bug:
    // https://github.com/Microsoft/TypeScript/issues/20846
    // @ts-ignore
    return new Proxy(localizationStrings, {
      /** @param {string} key */
      get(data, key) {
        const result = (data[lang] && data[lang][key]) || data.en[key];
        if (!result) {
          throw new Error(`No l10n data for key: "${key}"`);
        }
        return result;
      },
    });
  }

  // --- DATE HELPERS -------------------------------------------------------------------------------
  /**
   * Takes a Date object and an optional separator and returns the year,month,day
   * representation with the custom separator (defaulting to none) and proper
   * 0-padding.
   * @param {Date} date
   */
  function concatDate(date, sep = "") {
    return ISODate.format(date).replace(dashes, sep);
  }

  /**
   * Formats a date to "yyyy-mm-dd".
   * @param {Date} date
   */
  function toShortIsoDate(date) {
    return ISODate.format(date);
  }

  /**
   * Given an object, it converts it to a key value pair separated by ("=", configurable) and a delimiter (" ," configurable).
   * @example {"foo": "bar", "baz": 1} becomes "foo=bar, baz=1"
   * @param {Record<string, any>} obj
   */
  function toKeyValuePairs(obj, delimiter = ", ", separator = "=") {
    return Array.from(Object.entries(obj))
      .map(([key, value]) => `${key}${separator}${JSON.stringify(value)}`)
      .join(delimiter);
  }

  // STYLE HELPERS
  /**
   * Take a document and either a link or an array of links to CSS and appends a
   * `<link rel="stylesheet">` element to the head pointing to each.
   * @param {Document} doc
   * @param {string | string[]} urls
   */
  function linkCSS(doc, urls) {
    const stylesArray = [].concat(urls);
    const frag = stylesArray
      .map(url => {
        const link = doc.createElement("link");
        link.rel = "stylesheet";
        link.href = url;
        return link;
      })
      .reduce((elem, nextLink) => {
        elem.appendChild(nextLink);
        return elem;
      }, doc.createDocumentFragment());
    doc.head.appendChild(frag);
  }

  // TRANSFORMATIONS

  /**
   * Run list of transforms over content and return result.
   *
   * Please note that this is a legacy method that is only kept in order to
   * maintain compatibility with RSv1. It is therefore not tested and not actively
   * supported.
   * @this {any}
   * @param {string} content
   * @param {string} [flist] List of global function names.
   * @param {unknown[]} [funcArgs] Arguments to pass to each function.
   */
  function runTransforms(content, flist, ...funcArgs) {
    const args = [this, content, ...funcArgs];
    if (flist) {
      const methods = flist.split(/\s+/);
      for (const meth of methods) {
        /** @type {any} */
        const method = window[meth];
        if (method) {
          // the initial call passed |this| directly, so we keep it that way
          try {
            content = method.apply(this, args);
          } catch (e) {
            const msg = `call to \`${meth}()\` failed with: ${e}.`;
            const hint = "See developer console for stack trace.";
            showWarning(msg, "utils/runTransforms", { hint });
            console.error(e);
          }
        }
      }
    }
    return content;
  }

  /**
   * Cached request handler
   * @param {RequestInfo} input
   * @param {number} maxAge cache expiration duration in ms. defaults to 24 hours
   * @return {Promise<Response>}
   *  if a cached response is available and it's not stale, return it
   *  else: request from network, cache and return fresh response.
   *    If network fails, return a stale cached version if exists (else throw)
   */
  async function fetchAndCache(input, maxAge = 24 * 60 * 60 * 1000) {
    const request = new Request(input);
    const url = new URL(request.url);

    // use data from cache data if valid and render
    let cache;
    let cachedResponse;
    if ("caches" in window) {
      try {
        cache = await caches.open(url.origin);
        cachedResponse = await cache.match(request);
        if (
          cachedResponse &&
          new Date(cachedResponse.headers.get("Expires")) > new Date()
        ) {
          return cachedResponse;
        }
      } catch (err) {
        console.error("Failed to use Cache API.", err);
      }
    }

    // otherwise fetch new data and cache
    const response = await fetch(request);
    if (!response.ok) {
      if (cachedResponse) {
        // return stale version
        console.warn(`Returning a stale cached response for ${url}`);
        return cachedResponse;
      }
    }

    // cache response
    if (cache && response.ok) {
      const clonedResponse = response.clone();
      const customHeaders = new Headers(response.headers);
      const expiryDate = new Date(Date.now() + maxAge);
      customHeaders.set("Expires", expiryDate.toISOString());
      const cacheResponse = new Response(await clonedResponse.blob(), {
        headers: customHeaders,
      });
      // put in cache, and forget it (there is no recovery if it throws, but that's ok).
      await cache.put(request, cacheResponse).catch(console.error);
    }
    return response;
  }

  // --- DOM HELPERS -------------------------------

  /**
   * Separates each item with proper commas.
   * @template T
   * @param {T[]} array
   * @param {(item: T) => any} [mapper]
   */
  function htmlJoinComma(array, mapper = item => item) {
    const items = array.map(mapper);
    const joined = items.slice(0, -1).map(item => html`${item}, `);
    return html`${joined}${items[items.length - 1]}`;
  }
  /**
   *
   * @param {string[]} array
   * @param {(item: any) => any[]} [mapper]
   */
  function htmlJoinAnd(array, mapper) {
    const result = [].concat(conjunction(array, mapper));
    return result.map(item => (typeof item === "string" ? html`${item}` : item));
  }

  /**
   * Creates and sets an ID to an element (elem) using a specific prefix if
   * provided, and a specific text if given.
   * @param {HTMLElement} elem element
   * @param {String} pfx prefix
   * @param {String} txt text
   * @param {Boolean} noLC do not convert to lowercase
   * @returns {String} generated (or existing) id for element
   */
  function addId(elem, pfx = "", txt = "", noLC = false) {
    if (elem.id) {
      return elem.id;
    }
    if (!txt) {
      txt = (elem.title ? elem.title : elem.textContent).trim();
    }
    let id = noLC ? txt : txt.toLowerCase();
    id = id
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\W+/gim, "-")
      .replace(/^-+/, "")
      .replace(/-+$/, "");

    if (!id) {
      id = "generatedID";
    } else if (/\.$/.test(id) || !/^[a-z]/i.test(pfx || id)) {
      id = `x${id}`; // trailing . doesn't play well with jQuery
    }
    if (pfx) {
      id = `${pfx}-${id}`;
    }
    if (elem.ownerDocument.getElementById(id)) {
      let i = 0;
      let nextId = `${id}-${i}`;
      while (elem.ownerDocument.getElementById(nextId)) {
        i += 1;
        nextId = `${id}-${i}`;
      }
      id = nextId;
    }
    elem.id = id;
    return id;
  }

  /**
   * Returns all the descendant text nodes of an element.
   * @param {Node} el
   * @param {string[]} exclusions node localName to exclude
   * @param {object} options
   * @param {boolean} options.wsNodes return only whitespace-only nodes.
   * @returns {Text[]}
   */
  function getTextNodes(el, exclusions = [], options = { wsNodes: true }) {
    const exclusionQuery = exclusions.join(", ");
    const acceptNode = (/** @type {Text} */ node) => {
      if (!options.wsNodes && !node.data.trim()) {
        return NodeFilter.FILTER_REJECT;
      }
      if (exclusionQuery && node.parentElement.closest(exclusionQuery)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    };
    const nodeIterator = document.createNodeIterator(
      el,
      NodeFilter.SHOW_TEXT,
      acceptNode
    );
    /** @type {Text[]} */
    const textNodes = [];
    let node;
    while ((node = nodeIterator.nextNode())) {
      textNodes.push(/** @type {Text} */ (node));
    }
    return textNodes;
  }

  /**
   * For any element, returns an array of title strings that applies the algorithm
   * used for determining the actual title of a `<dfn>` element (but can apply to
   * other as well).
   *
   * This method now *prefers* the `data-lt` attribute for the list of titles.
   * That attribute is added by this method to `<dfn>` elements, so subsequent
   * calls to this method will return the `data-lt` based list.
   * @param {HTMLElement} elem
   * @returns {String[]} array of title strings
   */
  function getDfnTitles(elem) {
    const titleSet = new Set();
    // data-lt-noDefault avoid using the text content of a definition
    // in the definition list.
    // ltNodefault is === "data-lt-noDefault"... someone screwed up 😖
    const normText = "ltNodefault" in elem.dataset ? "" : norm(elem.textContent);
    const child = /** @type {HTMLElement | undefined} */ (elem.children[0]);
    if (elem.dataset.lt) {
      // prefer @data-lt for the list of title aliases
      elem.dataset.lt
        .split("|")
        .map(item => norm(item))
        .forEach(item => titleSet.add(item));
    } else if (
      elem.childNodes.length === 1 &&
      elem.getElementsByTagName("abbr").length === 1 &&
      child.title
    ) {
      titleSet.add(child.title);
    } else if (elem.textContent === '""') {
      titleSet.add("the-empty-string");
    }

    titleSet.add(normText);
    titleSet.delete("");

    // We could have done this with @data-lt (as the logic is same), but if
    // @data-lt was not present, we would end up using @data-local-lt as element's
    // id (in other words, we prefer textContent over @data-local-lt for dfn id)
    if (elem.dataset.localLt) {
      const localLt = elem.dataset.localLt.split("|");
      localLt.forEach(item => titleSet.add(norm(item)));
    }

    const titles = [...titleSet];
    return titles;
  }

  /**
   * For an element (usually <a>), returns an array of targets that element might
   * refer to, in the object structure:
   * @typedef {object} LinkTarget
   * @property {string} for
   * @property {string} title
   *
   * For an element like:
   *  <p data-link-for="Int1"><a data-link-for="Int2">Int3.member</a></p>
   * we'll return:
   *  * {for: "int2", title: "int3.member"}
   *  * {for: "int3", title: "member"}
   *  * {for: "", title: "int3.member"}
   * @param {HTMLElement} elem
   * @returns {LinkTarget[]}
   */
  function getLinkTargets(elem) {
    /** @type {HTMLElement} */
    const linkForElem = elem.closest("[data-link-for]");
    const linkFor = linkForElem ? linkForElem.dataset.linkFor : "";
    const titles = getDfnTitles(elem);
    const results = titles.reduce((result, title) => {
      // supports legacy <dfn>Foo.Bar()</dfn> definitions
      const split = title.split(".");
      if (split.length === 2) {
        // If there are multiple '.'s, this won't match an
        // Interface/member pair anyway.
        result.push({ for: split[0], title: split[1] });
      }
      result.push({ for: linkFor, title });
      if (!linkForElem) result.push({ for: title, title });

      // Finally, we can try to match without link for
      if (linkFor !== "") result.push({ for: "", title });
      return result;
    }, []);
    return results;
  }

  /**
   * Changes name of a DOM Element
   * @param {Element} elem element to rename
   * @param {String} newName new element name
   * @param {Object} options
   * @param {boolean} options.copyAttributes
   *
   * @returns {Element} new renamed element
   */
  function renameElement(
    elem,
    newName,
    options = { copyAttributes: true }
  ) {
    if (elem.localName === newName) return elem;
    const newElement = elem.ownerDocument.createElement(newName);
    // copy attributes
    if (options.copyAttributes) {
      for (const { name, value } of elem.attributes) {
        newElement.setAttribute(name, value);
      }
    }
    // copy child nodes
    newElement.append(...elem.childNodes);
    elem.replaceWith(newElement);
    return newElement;
  }

  /**
   * @param {string} ref
   * @param {HTMLElement} element
   */
  function refTypeFromContext(ref, element) {
    const closestInformative = element.closest(nonNormativeSelector);
    let isInformative = false;
    if (closestInformative) {
      // check if parent is not normative
      isInformative =
        !element.closest(".normative") ||
        !closestInformative.querySelector(".normative");
    }
    // prefixes `!` and `?` override section behavior
    if (ref.startsWith("!")) {
      if (isInformative) {
        // A (forced) normative reference in informative section is illegal
        return { type: "informative", illegal: true };
      }
      isInformative = false;
    } else if (ref.startsWith("?")) {
      isInformative = true;
    }
    const type = isInformative ? "informative" : "normative";
    return { type, illegal: false };
  }

  /**
   * Wraps inner contents with the wrapper node
   * @param {Node} outer outer node to be modified
   * @param {Element} wrapper wrapper node to be appended
   */
  function wrapInner(outer, wrapper) {
    wrapper.append(...outer.childNodes);
    outer.appendChild(wrapper);
    return outer;
  }

  /**
   * Applies the selector for all its ancestors.
   * @param {Element} element
   * @param {string} selector
   */
  function parents(element, selector) {
    /** @type {Element[]} */
    const list = [];
    let parent = element.parentElement;
    while (parent) {
      const closest = parent.closest(selector);
      if (!closest) {
        break;
      }
      list.push(closest);
      parent = closest.parentElement;
    }
    return list;
  }

  /**
   * Calculates indentation when the element starts after a newline. The value
   * will be empty if no newline or any non-whitespace exists after one.
   * @param {Element} element
   *
   * @example `    <div></div>` returns "    " (4 spaces).
   */
  function getElementIndentation(element) {
    const { previousSibling } = element;
    if (!previousSibling || previousSibling.nodeType !== Node.TEXT_NODE) {
      return "";
    }
    const index = previousSibling.textContent.lastIndexOf("\n");
    if (index === -1) {
      return "";
    }
    const slice = previousSibling.textContent.slice(index + 1);
    if (/\S/.test(slice)) {
      return "";
    }
    return slice;
  }

  /**
   * Generates simple ids. The id's increment after it yields.
   *
   * @param {String} namespace A string like "highlight".
   * @param {number} counter A number, which can start at a given value.
   */
  function msgIdGenerator(namespace, counter = 0) {
    /** @returns {Generator<string, never, never>}  */
    function* idGenerator(namespace, counter) {
      while (true) {
        yield `${namespace}:${counter}`;
        counter++;
      }
    }
    const gen = idGenerator(namespace, counter);
    return () => {
      return gen.next().value;
    };
  }

  /** @extends {Set<string>} */
  class InsensitiveStringSet extends Set {
    /**
     * @param {Array<String>} [keys] Optional, initial keys
     */
    constructor(keys = []) {
      super();
      for (const key of keys) {
        this.add(key);
      }
    }
    /**
     * @param {string} key
     */
    add(key) {
      if (!this.has(key) && !this.getCanonicalKey(key)) {
        return super.add(key);
      }
      return this;
    }
    /**
     * @param {string} key
     */
    has(key) {
      return (
        super.has(key) ||
        [...this.keys()].some(
          existingKey => existingKey.toLowerCase() === key.toLowerCase()
        )
      );
    }
    /**
     * @param {string} key
     */
    delete(key) {
      return super.has(key)
        ? super.delete(key)
        : super.delete(this.getCanonicalKey(key));
    }
    /**
     * @param {string} key
     */
    getCanonicalKey(key) {
      return super.has(key)
        ? key
        : [...this.keys()].find(
            existingKey => existingKey.toLowerCase() === key.toLowerCase()
          );
    }
  }

  /**
   * @param {HTMLElement} node
   */
  function makeSafeCopy(node) {
    const clone = node.cloneNode(true);
    clone.querySelectorAll("[id]").forEach(elem => elem.removeAttribute("id"));
    clone.querySelectorAll("dfn").forEach(dfn => {
      renameElement(dfn, "span", { copyAttributes: false });
    });
    if (clone.hasAttribute("id")) clone.removeAttribute("id");
    removeCommentNodes(clone);
    return clone;
  }

  /**
   * @param {Node} node
   */
  function removeCommentNodes(node) {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_COMMENT);
    for (const comment of [...walkTree(walker)]) {
      comment.remove();
    }
  }

  /**
   * @template {Node} T
   * @param {TreeWalker<T>} walker
   * @return {IterableIterator<T>}
   */
  function* walkTree(walker) {
    while (walker.nextNode()) {
      yield /** @type {T} */ (walker.currentNode);
    }
  }

  /**
   * @template ValueType
   * @extends {Map<string, ValueType>}
   */
  class CaseInsensitiveMap extends Map {
    /**
     * @param {Array<[string, ValueType]>} [entries]
     */
    constructor(entries = []) {
      super();
      entries.forEach(([key, elem]) => {
        this.set(key, elem);
      });
      return this;
    }
    /**
     * @param {String} key
     * @param {ValueType} value
     */
    set(key, value) {
      super.set(key.toLowerCase(), value);
      return this;
    }
    /**
     * @param {String} key
     */
    get(key) {
      return super.get(key.toLowerCase());
    }
    /**
     * @param {String} key
     */
    has(key) {
      return super.has(key.toLowerCase());
    }
    /**
     * @param {String} key
     */
    delete(key) {
      return super.delete(key.toLowerCase());
    }
  }

  class RespecError extends Error {
    /**
     * @param {Parameters<typeof showError>[0]} message
     * @param {Parameters<typeof showError>[1]} plugin
     * @param {Parameters<typeof showError>[2] & { isWarning: boolean }} options
     */
    constructor(message, plugin, options) {
      super(message);
      const name = options.isWarning ? "ReSpecWarning" : "ReSpecError";
      Object.assign(this, { message, plugin, name, ...options });
      if (options.elements) {
        options.elements.forEach(elem =>
          markAsOffending(elem, message, options.title)
        );
      }
    }

    toJSON() {
      const { message, name, stack } = this;
      // @ts-expect-error https://github.com/microsoft/TypeScript/issues/26792
      const { plugin, hint, elements, title, details } = this;
      return { message, name, plugin, hint, elements, title, details, stack };
    }
  }

  /**
   * @param {string} message
   * @param {string} pluginName Name of plugin that caused the error.
   * @param {object} [options]
   * @param {string} [options.hint] How to solve the error?
   * @param {HTMLElement[]} [options.elements] Offending elements.
   * @param {string} [options.title] Title attribute for offending elements. Can be a shorter form of the message.
   * @param {string} [options.details] Any further details/context.
   */
  function showError(message, pluginName, options = {}) {
    const opts = { ...options, isWarning: false };
    pub("error", new RespecError(message, pluginName, opts));
  }

  /**
   * @param {string} message
   * @param {string} pluginName Name of plugin that caused the error.
   * @param {object} [options]
   * @param {string} [options.hint] How to solve the error?
   * @param {HTMLElement[]} [options.elements] Offending elements.
   * @param {string} [options.title] Title attribute for offending elements. Can be a shorter form of the message.
   * @param {string} [options.details] Any further details/context.
   */
  function showWarning(message, pluginName, options = {}) {
    const opts = { ...options, isWarning: true };
    pub("warn", new RespecError(message, pluginName, opts));
  }

  /**
   * Makes a string `coded`.
   *
   * @param {string} item
   * @returns {string}
   */
  function toMDCode(item) {
    return item ? `\`${item}\`` : "";
  }

  /**
   * Joins an array of strings, wrapping each string in back-ticks (`) for inline markdown code.
   *
   * @param {string[]} array
   * @param {object} options
   * @param {boolean} options.quotes Surround each item in quotes
   */
  function codedJoinOr(array, { quotes } = { quotes: false }) {
    return joinOr(array, quotes ? s => toMDCode(addQuotes(s)) : toMDCode);
  }

  /**
   * Wraps in back-ticks ` for code.
   *
   * @param {string[]} array
   * @param {object} options
   * @param {boolean} options.quotes Surround each item in quotes
   */
  function codedJoinAnd(array, { quotes } = { quotes: false }) {
    return joinAnd(array, quotes ? s => toMDCode(addQuotes(s)) : toMDCode);
  }

  function addQuotes(item) {
    return String(item) ? `"${item}"` : "";
  }

  /**
   * Tagged template string, helps with linking to documentation.
   * Things inside [squareBrackets] are considered direct links to the documentation.
   * To alias something, one can use a "|", like [respecConfig|#respec-configuration].
   * @param {TemplateStringsArray} strings
   * @param {string[]} keys
   */
  function docLink(strings, ...keys) {
    return strings
      .map((s, i) => {
        const key = keys[i];
        if (!key) {
          return s;
        }
        // Linkables are wrapped in square brackets
        if (!key.startsWith("[") && !key.endsWith("]")) {
          return s + key;
        }

        const [linkingText, href] = key.slice(1, -1).split("|");
        if (href) {
          const url = new URL(href, "https://respec.org/docs/");
          return `${s}[${linkingText}](${url})`;
        }
        return `${s}[\`${linkingText}\`](https://respec.org/docs/#${linkingText})`;
      })
      .join("");
  }

  // @ts-check

  /**
   * Module core/pubsubhub
   *
   * Returns a singleton that can be used for message broadcasting
   * and message receiving. Replaces legacy "msg" code in ReSpec.
   */
  const name$18 = "core/pubsubhub";

  const subscriptions = new Map();

  function pub(topic, ...data) {
    if (!subscriptions.has(topic)) {
      return; // Nothing to do...
    }
    Array.from(subscriptions.get(topic)).forEach(cb => {
      try {
        cb(...data);
      } catch (err) {
        const msg = `Error when calling function ${cb.name}.`;
        const hint = "See developer console.";
        showError(msg, name$18, { hint });
        console.error(err);
      }
    });
    if (window.parent === window.self) {
      return;
    }
    // If this is an iframe, postMessage parent (used in testing).
    const args = data
      // to structured clonable
      .map(arg => String(JSON.stringify(arg.stack || arg)));
    window.parent.postMessage({ topic, args }, window.parent.location.origin);
  }
  /**
   * Subscribes to a message type.
   *
   * @param  {string} topic        The topic to subscribe to (e.g., "start-all")
   * @param  {Function} cb         Callback function
   * @param  {Object} [opts]
   * @param  {Boolean} [opts.once] Add prop "once" for single notification.
   * @return {Object}              An object that should be considered opaque,
   *                               used for unsubscribing from messages.
   */
  function sub(topic, cb, opts = { once: false }) {
    if (opts.once) {
      return sub(topic, function wrapper(...args) {
        unsub({ topic, cb: wrapper });
        cb(...args);
      });
    }
    if (subscriptions.has(topic)) {
      subscriptions.get(topic).add(cb);
    } else {
      subscriptions.set(topic, new Set([cb]));
    }
    return { topic, cb };
  }
  /**
   * Unsubscribe from messages.
   *
   * @param {Object} opaque The object that was returned from calling sub()
   */
  function unsub({ topic, cb }) {
    // opaque is whatever is returned by sub()
    const callbacks = subscriptions.get(topic);
    if (!callbacks || !callbacks.has(cb)) {
      console.warn("Already unsubscribed:", topic, cb);
      return false;
    }
    return callbacks.delete(cb);
  }

  expose(name$18, { sub });

  // @ts-check

  const removeList = ["githubToken", "githubUser"];

  function run$14(config) {
    const userConfig = {};
    const amendConfig = newValues => Object.assign(userConfig, newValues);

    amendConfig(config);
    sub("amend-user-config", amendConfig);

    sub("end-all", () => {
      const script = document.createElement("script");
      script.id = "initialUserConfig";
      script.type = "application/json";
      for (const prop of removeList) {
        if (prop in userConfig) delete userConfig[prop];
      }
      script.innerHTML = JSON.stringify(userConfig, null, 2);
      document.head.appendChild(script);
    });
  }

  // @ts-check

  const mimeTypes$1 = new Map([
    ["text/html", "html"],
    ["application/xml", "xml"],
  ]);

  /**
   * Creates a dataURI from a ReSpec document. It also cleans up the document
   * removing various things.
   *
   * @param {String} mimeType mimetype. one of `mimeTypes` above
   * @param {Document} doc document to export. useful for testing purposes
   * @returns a stringified data-uri of document that can be saved.
   */
  function rsDocToDataURL(mimeType, doc = document) {
    const format = mimeTypes$1.get(mimeType);
    if (!format) {
      const validTypes = [...mimeTypes$1.values()].join(", ");
      const msg = `Invalid format: ${mimeType}. Expected one of: ${validTypes}.`;
      throw new TypeError(msg);
    }
    const data = serialize$1(format, doc);
    const encodedString = encodeURIComponent(data);
    return `data:${mimeType};charset=utf-8,${encodedString}`;
  }

  function serialize$1(format, doc) {
    const cloneDoc = doc.cloneNode(true);
    cleanup$4(cloneDoc);
    let result = "";
    switch (format) {
      case "xml":
        result = new XMLSerializer().serializeToString(cloneDoc);
        break;
      default: {
        prettify(cloneDoc);
        if (cloneDoc.doctype) {
          result += new XMLSerializer().serializeToString(cloneDoc.doctype);
        }
        result += cloneDoc.documentElement.outerHTML;
      }
    }
    return result;
  }

  function cleanup$4(cloneDoc) {
    const { head, body, documentElement } = cloneDoc;
    removeCommentNodes(cloneDoc);

    cloneDoc
      .querySelectorAll(".removeOnSave, #toc-nav")
      .forEach(elem => elem.remove());
    body.classList.remove("toc-sidebar");
    removeReSpec(documentElement);

    const insertions = cloneDoc.createDocumentFragment();

    // Move meta viewport, as it controls the rendering on mobile.
    const metaViewport = cloneDoc.querySelector("meta[name='viewport']");
    if (metaViewport && head.firstChild !== metaViewport) {
      insertions.appendChild(metaViewport);
    }

    // Move charset to near top, as it needs to be in the first 512 bytes.
    let metaCharset = cloneDoc.querySelector(
      "meta[charset], meta[content*='charset=']"
    );
    if (!metaCharset) {
      metaCharset = html`<meta charset="utf-8" />`;
    }
    insertions.appendChild(metaCharset);

    // Add meta generator
    const respecVersion = `ReSpec ${window.respecVersion || "Developer Channel"}`;
    const metaGenerator = html`
    <meta name="generator" content="${respecVersion}" />
  `;

    insertions.appendChild(metaGenerator);
    head.prepend(insertions);
    pub("beforesave", documentElement);
  }

  /** @param {Document} cloneDoc */
  function prettify(cloneDoc) {
    cloneDoc.querySelectorAll("style").forEach(el => {
      el.innerHTML = `\n${el.innerHTML}\n`;
    });
    cloneDoc.querySelectorAll("head > *").forEach(el => {
      el.outerHTML = `\n${el.outerHTML}`;
    });
  }

  expose("core/exporter", { rsDocToDataURL });

  // @ts-check

  const name$17 = "core/respec-global";

  class ReSpec {
    constructor() {
      /** @type {Promise<void>} */
      this._respecDonePromise = new Promise(resolve => {
        sub("end-all", resolve, { once: true });
      });

      this.errors = [];
      this.warnings = [];

      sub("error", rsError => {
        console.error(rsError, rsError.toJSON());
        this.errors.push(rsError);
      });
      sub("warn", rsError => {
        console.warn(rsError, rsError.toJSON());
        this.warnings.push(rsError);
      });
    }

    get version() {
      return window.respecVersion;
    }

    get ready() {
      return this._respecDonePromise;
    }

    async toHTML() {
      return serialize$1("html", document);
    }
  }

  function init() {
    const respec = new ReSpec();
    Object.defineProperty(document, "respec", { value: respec });

    let respecIsReadyWarningShown = false;
    Object.defineProperty(document, "respecIsReady", {
      get() {
        if (!respecIsReadyWarningShown) {
          const msg =
            "`document.respecIsReady` is deprecated and will be removed in a future release.";
          const hint = "Use `document.respec.ready` instead.";
          showWarning(msg, name$17, { hint });
          respecIsReadyWarningShown = true;
        }
        return document.respec.ready;
      },
    });
  }

  // @ts-check

  function run$13(config) {
    const params = new URLSearchParams(document.location.search);
    const overrideEntries = Array.from(params)
      .filter(([key, value]) => !!key && !!value)
      .map(([codedKey, codedValue]) => {
        const key = decodeURIComponent(codedKey);
        const decodedValue = decodeURIComponent(codedValue.replace(/%3D/g, "="));
        let value;
        try {
          value = JSON.parse(decodedValue);
        } catch {
          value = decodedValue;
        }
        return [key, value];
      });
    const overrideProps = Object.fromEntries(overrideEntries);
    Object.assign(config, overrideProps);
    pub("amend-user-config", overrideProps);
  }

  // @ts-check

  const name$16 = "core/post-process";

  async function run$12(config) {
    if (Array.isArray(config.postProcess)) {
      const promises = config.postProcess
        .filter(f => {
          const isFunction = typeof f === "function";
          if (!isFunction) {
            const msg = "Every item in `postProcess` must be a JS function.";
            showError(msg, name$16);
          }
          return isFunction;
        })
        .map(async f => {
          try {
            return await f(config, document);
          } catch (err) {
            const msg = `Function ${f.name} threw an error during \`postProcess\`.`;
            const hint = "See developer console.";
            showError(msg, name$16, { hint });
            console.error(err);
          }
        });
      await Promise.all(promises);
    }
    if (typeof config.afterEnd === "function") {
      await config.afterEnd(config, document);
    }
  }

  // @ts-check

  const name$15 = "core/pre-process";

  async function run$11(config) {
    if (Array.isArray(config.preProcess)) {
      const promises = config.preProcess
        .filter(f => {
          const isFunction = typeof f === "function";
          if (!isFunction) {
            const msg = "Every item in `preProcess` must be a JS function.";
            showError(msg, name$15);
          }
          return isFunction;
        })
        .map(async f => {
          try {
            return await f(config, document);
          } catch (err) {
            const msg = `Function ${f.name} threw an error during \`preProcess\`.`;
            const hint = "See developer console.";
            showError(msg, name$15, { hint });
            console.error(err);
          }
        });
      await Promise.all(promises);
    }
  }

  // @ts-check

  const name$14 = "core/base-runner";

  async function runAll(plugs) {
    init();

    pub("start-all", respecConfig);
    run$14(respecConfig);
    run$13(respecConfig);
    performance.mark(`${name$14}-start`);
    await run$11(respecConfig);

    const runnables = plugs.filter(p => isRunnableModule(p));
    runnables.forEach(
      plug => !plug.name && console.warn("Plugin lacks name:", plug)
    );
    respecConfig.state = {};
    await executePreparePass(runnables, respecConfig);
    await executeRunPass(runnables, respecConfig);
    respecConfig.state = {};
    pub("plugins-done", respecConfig);

    await run$12(respecConfig);
    pub("end-all");
    removeReSpec(document);
    performance.mark(`${name$14}-end`);
    performance.measure(name$14, `${name$14}-start`, `${name$14}-end`);
  }

  function isRunnableModule(plug) {
    return plug && (plug.run || plug.Plugin);
  }

  async function executePreparePass(runnables, config) {
    for (const plug of runnables.filter(p => p.prepare)) {
      try {
        await plug.prepare(config);
      } catch (err) {
        console.error(err);
      }
    }
  }

  async function executeRunPass(runnables, config) {
    for (const plug of runnables) {
      const name = plug.name || "";

      try {
        // eslint-disable-next-line no-async-promise-executor
        await new Promise(async (resolve, reject) => {
          const timerId = setTimeout(() => {
            const msg = `Plugin ${name} took too long.`;
            console.error(msg, plug);
            reject(new Error(msg));
          }, 15000);

          performance.mark(`${name}-start`);
          try {
            if (plug.Plugin) {
              await new plug.Plugin(config).run();
              resolve();
            } else if (plug.run) {
              await plug.run(config);
              resolve();
            }
          } catch (err) {
            reject(err);
          } finally {
            clearTimeout(timerId);
            performance.mark(`${name}-end`);
            performance.measure(name, `${name}-start`, `${name}-end`);
          }
        });
      } catch (error) {
        console.error(error);
      }
    }
  }

  const css$k = String.raw;

  // Prettier ignore only to keep code indented from level 0.
  // prettier-ignore
  var css$l = css$k`
.respec-modal .close-button {
  position: absolute;
  z-index: inherit;
  padding: 0.2em;
  font-weight: bold;
  cursor: pointer;
  margin-left: 5px;
  border: none;
  background: transparent;
}

#respec-ui {
  position: fixed;
  display: flex;
  flex-direction: row-reverse;
  top: 20px;
  right: 20px;
  width: 202px;
  text-align: right;
  z-index: 9000;
}

#respec-pill,
.respec-info-button {
  background: #fff;
  height: 2.5em;
  color: rgb(120, 120, 120);
  border: 1px solid #ccc;
  box-shadow: 1px 1px 8px 0 rgba(100, 100, 100, 0.5);
}

.respec-info-button {
  border: none;
  opacity: 0.75;
  border-radius: 2em;
  margin-right: 1em;
  min-width: 3.5em;
}

.respec-info-button:focus,
.respec-info-button:hover {
  opacity: 1;
  transition: opacity 0.2s;
}

#respec-pill:disabled {
  font-size: 2.8px;
  text-indent: -9999em;
  border-top: 1.1em solid rgba(40, 40, 40, 0.2);
  border-right: 1.1em solid rgba(40, 40, 40, 0.2);
  border-bottom: 1.1em solid rgba(40, 40, 40, 0.2);
  border-left: 1.1em solid #ffffff;
  transform: translateZ(0);
  animation: respec-spin 0.5s infinite linear;
  box-shadow: none;
}

#respec-pill:disabled,
#respec-pill:disabled:after {
  border-radius: 50%;
  width: 10em;
  height: 10em;
}

@keyframes respec-spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.respec-hidden {
  visibility: hidden;
  opacity: 0;
  transition: visibility 0s 0.2s, opacity 0.2s linear;
}

.respec-visible {
  visibility: visible;
  opacity: 1;
  transition: opacity 0.2s linear;
}

#respec-pill:hover,
#respec-pill:focus {
  color: rgb(0, 0, 0);
  background-color: rgb(245, 245, 245);
  transition: color 0.2s;
}

#respec-menu {
  position: absolute;
  margin: 0;
  padding: 0;
  font-family: sans-serif;
  background: #fff;
  box-shadow: 1px 1px 8px 0 rgba(100, 100, 100, 0.5);
  width: 200px;
  display: none;
  text-align: left;
  margin-top: 32px;
  font-size: 0.8em;
}

#respec-menu:not([hidden]) {
  display: block;
}

#respec-menu li {
  list-style-type: none;
  margin: 0;
  padding: 0;
}

.respec-save-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(47%, 2fr));
  grid-gap: 0.5cm;
  padding: 0.5cm;
}

.respec-save-button:link {
  padding-top: 16px;
  color: rgb(240, 240, 240);
  background: rgb(42, 90, 168);
  justify-self: stretch;
  height: 1cm;
  text-decoration: none;
  text-align: center;
  font-size: inherit;
  border: none;
  border-radius: 0.2cm;
}

.respec-save-button:link:hover {
  color: white;
  background: rgb(42, 90, 168);
  padding: 0;
  margin: 0;
  border: 0;
  padding-top: 16px;
}

.respec-save-button:link:focus {
  background: #193766;
}

#respec-ui button:focus,
#respec-pill:focus,
.respec-option:focus {
  outline: 0;
  outline-style: none;
}

#respec-pill-error {
  background-color: red;
  color: white;
}

#respec-pill-warning {
  background-color: orange;
  color: white;
}

.respec-warning-list,
.respec-error-list {
  margin: 0;
  padding: 0;
  list-style: none;
  font-family: sans-serif;
  background-color: rgb(255, 251, 230);
  font-size: 0.85em;
}

.respec-warning-list > li,
.respec-error-list > li {
  padding: 0.4em 0.7em;
}

.respec-warning-list > li::before {
  content: "⚠️";
  padding-right: 0.5em;
}
.respec-warning-list p,
.respec-error-list p {
  padding: 0;
  margin: 0;
}

.respec-warning-list li {
  color: rgb(92, 59, 0);
  border-bottom: thin solid rgb(255, 245, 194);
}

.respec-error-list,
.respec-error-list li {
  background-color: rgb(255, 240, 240);
}

.respec-error-list li::before {
  content: "💥";
  padding-right: 0.5em;
}

.respec-error-list li {
  padding: 0.4em 0.7em;
  color: rgb(92, 59, 0);
  border-bottom: thin solid rgb(255, 215, 215);
}

.respec-error-list li > p {
  margin: 0;
  padding: 0;
  display: inline-block;
}

.respec-error-list li > p:first-child,
.respec-warning-list li > p:first-child {
  display: inline;
}

.respec-warning-list > li li,
.respec-error-list > li li {
  margin: 0;
  list-style: disc;
}

#respec-overlay {
  display: block;
  position: fixed;
  z-index: 10000;
  top: 0px;
  left: 0px;
  height: 100%;
  width: 100%;
  background: #000;
}

.respec-show-overlay {
  transition: opacity 0.2s linear;
  opacity: 0.5;
}

.respec-hide-overlay {
  transition: opacity 0.2s linear;
  opacity: 0;
}

.respec-modal {
  display: block;
  position: fixed;
  z-index: 11000;
  margin: auto;
  top: 10%;
  background: #fff;
  border: 5px solid #666;
  min-width: 20%;
  width: 79%;
  padding: 0;
  max-height: 80%;
  overflow-y: auto;
  margin: 0 -0.5cm;
}

@media screen and (min-width: 78em) {
  .respec-modal {
    width: 62%;
  }
}

.respec-modal h3 {
  margin: 0;
  padding: 0.2em;
  text-align: center;
  color: black;
  background: linear-gradient(
    to bottom,
    rgba(238, 238, 238, 1) 0%,
    rgba(238, 238, 238, 1) 50%,
    rgba(204, 204, 204, 1) 100%
  );
  font-size: 1em;
}

.respec-modal .inside div p {
  padding-left: 1cm;
}

#respec-menu button.respec-option {
  background: white;
  padding: 0 0.2cm;
  border: none;
  width: 100%;
  text-align: left;
  font-size: inherit;
  padding: 1.2em 1.2em;
}

#respec-menu button.respec-option:hover,
#respec-menu button:focus {
  background-color: #eeeeee;
}

.respec-cmd-icon {
  padding-right: 0.5em;
}

#respec-ui button.respec-option:last-child {
  border: none;
  border-radius: inherit;
}

.respec-button-copy-paste {
  position: absolute;
  height: 28px;
  width: 40px;
  cursor: pointer;
  background-image: linear-gradient(#fcfcfc, #eee);
  border: 1px solid rgb(144, 184, 222);
  border-left: 0;
  border-radius: 0px 0px 3px 0;
  -webkit-user-select: none;
  user-select: none;
  -webkit-appearance: none;
  top: 0;
  left: 127px;
}

@media print {
  #respec-ui {
    display: none;
  }
}

.respec-iframe {
  width: 100%;
  min-height: 550px;
  height: 100%;
  overflow: hidden;
  padding: 0;
  margin: 0;
  border: 0;
}

.respec-iframe:not(.ready) {
  background: url("https://respec.org/xref/loader.gif") no-repeat center;
}

.respec-iframe + a[href] {
  font-size: 0.9rem;
  float: right;
  margin: 0 0.5em 0.5em;
  border-bottom-width: 1px;
}
`;

  // @ts-check
  /**
   * Module core/reindent
   *
   * Removes common indents across the IDL texts,
   * so that indentation inside <pre> won't affect the rendered result.
   */

  const name$13 = "core/reindent";

  /**
   * @param {string} text
   */
  function reindent(text) {
    if (!text) {
      return text;
    }
    const lines = text.trimEnd().split("\n");
    while (lines.length && !lines[0].trim()) {
      lines.shift();
    }
    const indents = lines.filter(s => s.trim()).map(s => s.search(/[^\s]/));
    const leastIndent = Math.min(...indents);
    return lines.map(s => s.slice(leastIndent)).join("\n");
  }

  function run$10() {
    for (const pre of document.getElementsByTagName("pre")) {
      pre.innerHTML = reindent(pre.innerHTML);
    }
  }

  var reindent$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$13,
    reindent: reindent,
    run: run$10
  });

  // @ts-check
  const name$12 = "core/markdown";

  const gtEntity = /&gt;/gm;
  const ampEntity = /&amp;/gm;

  class Renderer extends marked.Renderer {
    code(code, infoString, isEscaped) {
      const { language, ...metaData } = Renderer.parseInfoString(infoString);

      // regex to check whether the language is webidl
      if (/(^webidl$)/i.test(language)) {
        return `<pre class="idl">${code}</pre>`;
      }

      // @ts-expect-error
      const html = super.code(code, language, isEscaped);

      const { example, illegalExample } = metaData;
      if (!example && !illegalExample) return html;

      const title = example || illegalExample;
      const className = `${language} ${example ? "example" : "illegal-example"}`;
      return html.replace("<pre>", `<pre title="${title}" class="${className}">`);
    }

    /**
     * @param {string} infoString
     */
    static parseInfoString(infoString) {
      const firstSpace = infoString.search(/\s/);
      if (firstSpace === -1) {
        return { language: infoString };
      }

      const language = infoString.slice(0, firstSpace);
      const metaDataStr = infoString.slice(firstSpace + 1);
      let metaData;
      if (metaDataStr) {
        try {
          metaData = JSON.parse(`{ ${metaDataStr} }`);
        } catch (error) {
          console.error(error);
        }
      }

      return { language, ...metaData };
    }

    heading(text, level, raw, slugger) {
      const headingWithIdRegex = /(.+)\s+{#([\w-]+)}$/;
      if (headingWithIdRegex.test(text)) {
        const [, textContent, id] = text.match(headingWithIdRegex);
        return `<h${level} id="${id}">${textContent}</h${level}>`;
      }
      // @ts-expect-error
      return super.heading(text, level, raw, slugger);
    }
  }

  /**
   * @param {string} text
   */
  function markdownToHtml(text) {
    const normalizedLeftPad = reindent(text);
    // As markdown is pulled from HTML, > and & are already escaped and
    // so blockquotes aren't picked up by the parser. This fixes it.
    const potentialMarkdown = normalizedLeftPad
      .replace(gtEntity, ">")
      .replace(ampEntity, "&");
    // @ts-ignore
    const result = marked(potentialMarkdown, {
      sanitize: false,
      gfm: true,
      headerIds: false,
      langPrefix: "",
      renderer: new Renderer(),
    });
    return result;
  }

  /**
   * @param {string} selector
   * @return {(el: Element) => Element[]}
   */
  function convertElements(selector) {
    return element => {
      const elements = element.querySelectorAll(selector);
      elements.forEach(convertElement);
      return Array.from(elements);
    };
  }

  /**
   * @param {Element} element
   */
  function convertElement(element) {
    for (const pre of element.getElementsByTagName("pre")) {
      // HTML parser implicitly removes a newline after <pre>
      // which breaks reindentation algorithm
      pre.prepend("\n");
    }
    element.innerHTML = markdownToHtml(element.innerHTML);
  }

  /**
   * CommonMark requires additional empty newlines between markdown and HTML lines.
   * This function adds them as a backward compatibility workaround.
   * @param {HTMLElement} element
   * @param {string} selector
   */
  function workaroundBlockLevelMarkdown(element, selector) {
    /** @type {NodeListOf<HTMLElement>} */
    const elements = element.querySelectorAll(selector);
    for (const element of elements) {
      const { innerHTML } = element;
      if (/^<\w/.test(innerHTML.trimStart())) {
        // if the block content starts with HTML-like format
        // then assume it doesn't need a workaround
        continue;
      }
      // Double newlines are needed to be parsed as Markdown
      const lines = innerHTML.split("\n");
      const firstTwo = lines.slice(0, 2).join("\n");
      const lastTwo = lines.slice(-2).join("\n");
      if (firstTwo.trim()) {
        element.prepend("\n\n");
      }
      if (lastTwo.trim()) {
        // keep the indentation of the end tag
        const indentation = getElementIndentation(element);
        element.append(`\n\n${indentation}`);
      }
    }
  }

  class Builder {
    constructor(doc) {
      this.doc = doc;
      this.root = doc.createDocumentFragment();
      this.stack = [this.root];
      this.current = this.root;
    }
    findPosition(header) {
      return parseInt(header.tagName.charAt(1), 10);
    }
    findParent(position) {
      let parent;
      while (position > 0) {
        position--;
        parent = this.stack[position];
        if (parent) return parent;
      }
    }
    findHeader({ firstChild: node }) {
      while (node) {
        if (/H[1-6]/.test(node.tagName)) {
          return node;
        }
        node = node.nextSibling;
      }
      return null;
    }

    addHeader(header) {
      const section = this.doc.createElement("section");
      const position = this.findPosition(header);

      section.appendChild(header);
      this.findParent(position).appendChild(section);
      this.stack[position] = section;
      this.stack.length = position + 1;
      this.current = section;
    }

    addSection(node, process) {
      const header = this.findHeader(node);
      const position = header ? this.findPosition(header) : 1;
      const parent = this.findParent(position);

      if (header) {
        node.removeChild(header);
      }

      node.appendChild(process(node));

      if (header) {
        node.prepend(header);
      }

      parent.appendChild(node);
      this.current = parent;
    }

    addElement(node) {
      this.current.appendChild(node);
    }
  }

  function structure$1(fragment, doc) {
    function process(root) {
      const stack = new Builder(doc);
      while (root.firstChild) {
        const node = root.firstChild;
        if (node.nodeType !== Node.ELEMENT_NODE) {
          root.removeChild(node);
          continue;
        }
        switch (node.localName) {
          case "h1":
          case "h2":
          case "h3":
          case "h4":
          case "h5":
          case "h6":
            stack.addHeader(node);
            break;
          case "section":
            stack.addSection(node, process);
            break;
          default:
            stack.addElement(node);
        }
      }
      return stack.root;
    }
    return process(fragment);
  }

  /**
   * Re-structure DOM around elem whose markdown has been processed.
   * @param {Element} elem
   */
  function restructure(elem) {
    const structuredInternals = structure$1(elem, elem.ownerDocument);
    if (
      structuredInternals.firstElementChild.localName === "section" &&
      elem.localName === "section"
    ) {
      const section = structuredInternals.firstElementChild;
      section.remove();
      elem.append(...section.childNodes);
    } else {
      elem.textContent = "";
    }
    elem.appendChild(structuredInternals);
  }

  /**
   * @param {Iterable<Element>} elements
   */
  function substituteWithTextNodes(elements) {
    Array.from(elements).forEach(element => {
      element.replaceWith(element.textContent);
    });
  }

  const processMDSections = convertElements("[data-format='markdown']:not(body)");
  const blockLevelElements =
    "[data-format=markdown], section, div, address, article, aside, figure, header, main";

  function run$$(conf) {
    const hasMDSections = !!document.querySelector(
      "[data-format=markdown]:not(body)"
    );
    const isMDFormat = conf.format === "markdown";
    if (!isMDFormat && !hasMDSections) {
      return; // Nothing to be done
    }
    // Only has markdown-format sections
    if (!isMDFormat) {
      for (const processedElem of processMDSections(document.body)) {
        restructure(processedElem);
      }
      return;
    }
    // We transplant the UI to do the markdown processing
    const rsUI = document.getElementById("respec-ui");
    rsUI.remove();
    // The new body will replace the old body
    const newBody = document.body.cloneNode(true);
    // Marked expects markdown be flush against the left margin
    // so we need to normalize the inner text of some block
    // elements.
    workaroundBlockLevelMarkdown(newBody, blockLevelElements);
    convertElement(newBody);
    // Remove links where class .nolinks
    substituteWithTextNodes(newBody.querySelectorAll(".nolinks a[href]"));
    // Restructure the document properly
    const fragment = structure$1(newBody, document);
    // Frankenstein the whole thing back together
    newBody.append(rsUI, fragment);
    document.body.replaceWith(newBody);
  }

  var markdown = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$12,
    markdownToHtml: markdownToHtml,
    restructure: restructure,
    run: run$$
  });

  // @ts-check

  // Opportunistically inserts the style, with the chance to reduce some FOUC
  insertStyle$1();

  function insertStyle$1() {
    const styleElement = document.createElement("style");
    styleElement.id = "respec-ui-styles";
    styleElement.textContent = css$l;
    styleElement.classList.add("removeOnSave");
    document.head.appendChild(styleElement);
    return styleElement;
  }

  function ariaDecorate(elem, ariaMap) {
    if (!elem) {
      return;
    }
    Array.from(ariaMap).forEach(([name, value]) => {
      elem.setAttribute(`aria-${name}`, value);
    });
  }

  const respecUI = html`<div id="respec-ui" class="removeOnSave" hidden></div>`;
  const menu = html`<ul
  id="respec-menu"
  role="menu"
  aria-labelledby="respec-pill"
  hidden
></ul>`;
  const closeButton = html`<button
  class="close-button"
  onclick=${() => ui.closeModal()}
  title="Close"
>
  ❌
</button>`;
  window.addEventListener("load", () => trapFocus(menu));
  let modal;
  let overlay;
  const errors = [];
  const warnings = [];
  const buttons = {};

  sub("start-all", () => document.body.prepend(respecUI), { once: true });
  sub("end-all", () => document.body.prepend(respecUI), { once: true });

  const respecPill = html`<button id="respec-pill" disabled>ReSpec</button>`;
  respecUI.appendChild(respecPill);
  respecPill.addEventListener("click", e => {
    e.stopPropagation();
    respecPill.setAttribute("aria-expanded", String(menu.hidden));
    toggleMenu();
    menu.querySelector("li:first-child button").focus();
  });

  document.documentElement.addEventListener("click", () => {
    if (!menu.hidden) {
      toggleMenu();
    }
  });
  respecUI.appendChild(menu);

  menu.addEventListener("keydown", e => {
    if (e.key === "Escape" && !menu.hidden) {
      respecPill.setAttribute("aria-expanded", String(menu.hidden));
      toggleMenu();
      respecPill.focus();
    }
  });

  function toggleMenu() {
    menu.classList.toggle("respec-hidden");
    menu.classList.toggle("respec-visible");
    menu.hidden = !menu.hidden;
  }

  // Code adapted from https://hiddedevries.nl/en/blog/2017-01-29-using-javascript-to-trap-focus-in-an-element
  function trapFocus(element) {
    const focusableEls = element.querySelectorAll(
      "a[href]:not([disabled]), button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled])"
    );
    const firstFocusableEl = focusableEls[0];
    const lastFocusableEl = focusableEls[focusableEls.length - 1];
    if (firstFocusableEl) {
      firstFocusableEl.focus();
    }
    element.addEventListener("keydown", e => {
      if (e.key !== "Tab") {
        return;
      }
      // shift + tab
      if (e.shiftKey) {
        if (document.activeElement === firstFocusableEl) {
          lastFocusableEl.focus();
          e.preventDefault();
        }
      }
      // tab
      else if (document.activeElement === lastFocusableEl) {
        firstFocusableEl.focus();
        e.preventDefault();
      }
    });
  }

  const ariaMap = new Map([
    ["controls", "respec-menu"],
    ["expanded", "false"],
    ["haspopup", "true"],
    ["label", "ReSpec Menu"],
  ]);
  ariaDecorate(respecPill, ariaMap);

  function errWarn(err, arr, butName, title) {
    arr.push(err);
    if (!buttons.hasOwnProperty(butName)) {
      buttons[butName] = createWarnButton(butName, arr, title);
      respecUI.appendChild(buttons[butName]);
    }
    const button = buttons[butName];
    button.textContent = arr.length;
    const label = arr.length === 1 ? pluralize$1.singular(title) : title;
    const ariaMap = new Map([["label", `${arr.length} ${label}`]]);
    ariaDecorate(button, ariaMap);
  }

  function createWarnButton(butName, arr, title) {
    const buttonId = `respec-pill-${butName}`;
    const button = html`<button
    id="${buttonId}"
    class="respec-info-button"
  ></button>`;
    button.addEventListener("click", () => {
      button.setAttribute("aria-expanded", "true");
      const ol = html`<ol class="${`respec-${butName}-list`}"></ol>`;
      for (const err of arr) {
        const fragment = document
          .createRange()
          .createContextualFragment(rsErrorToHTML(err));
        const li = document.createElement("li");
        // if it's only a single element, just copy the contents into li
        if (fragment.firstElementChild === fragment.lastElementChild) {
          li.append(...fragment.firstElementChild.childNodes);
          // Otherwise, take everything.
        } else {
          li.appendChild(fragment);
        }
        ol.appendChild(li);
      }
      ui.freshModal(title, ol, button);
    });
    const ariaMap = new Map([
      ["expanded", "false"],
      ["haspopup", "true"],
      ["controls", `respec-pill-${butName}-modal`],
    ]);
    ariaDecorate(button, ariaMap);
    return button;
  }

  const ui = {
    show() {
      try {
        respecUI.hidden = false;
      } catch (err) {
        console.error(err);
      }
    },
    hide() {
      respecUI.hidden = true;
    },
    enable() {
      respecPill.removeAttribute("disabled");
    },
    /**
     * @param {string} _keyShort shortcut key. unused - kept for backward compatibility.
     */
    addCommand(label, handler, _keyShort, icon) {
      icon = icon || "";
      const id = `respec-button-${label.toLowerCase().replace(/\s+/, "-")}`;
      const button = html`<button id="${id}" class="respec-option">
      <span class="respec-cmd-icon" aria-hidden="true">${icon}</span> ${label}…
    </button>`;
      const menuItem = html`<li role="menuitem">${button}</li>`;
      menuItem.addEventListener("click", handler);
      menu.appendChild(menuItem);
      return button;
    },
    error(rsError) {
      errWarn(rsError, errors, "error", "ReSpec Errors");
    },
    warning(rsError) {
      errWarn(rsError, warnings, "warning", "ReSpec Warnings");
    },
    closeModal(owner) {
      if (overlay) {
        overlay.classList.remove("respec-show-overlay");
        overlay.classList.add("respec-hide-overlay");
        overlay.addEventListener("transitionend", () => {
          overlay.remove();
          overlay = null;
        });
      }
      if (owner) {
        owner.setAttribute("aria-expanded", "false");
      }
      if (!modal) return;
      modal.remove();
      modal = null;
      respecPill.focus();
    },
    freshModal(title, content, currentOwner) {
      if (modal) modal.remove();
      if (overlay) overlay.remove();
      overlay = html`<div id="respec-overlay" class="removeOnSave"></div>`;
      const id = `${currentOwner.id}-modal`;
      const headingId = `${id}-heading`;
      modal = html`<div
      id="${id}"
      class="respec-modal removeOnSave"
      role="dialog"
      aria-labelledby="${headingId}"
    >
      ${closeButton}
      <h3 id="${headingId}">${title}</h3>
      <div class="inside">${content}</div>
    </div>`;
      const ariaMap = new Map([["labelledby", headingId]]);
      ariaDecorate(modal, ariaMap);
      document.body.append(overlay, modal);
      overlay.addEventListener("click", () => this.closeModal(currentOwner));
      overlay.classList.toggle("respec-show-overlay");
      modal.hidden = false;
      trapFocus(modal);
    },
  };
  document.addEventListener("keydown", ev => {
    if (ev.key === "Escape") {
      ui.closeModal();
    }
  });
  window.respecUI = ui;
  sub("error", details => ui.error(details));
  sub("warn", details => ui.warning(details));

  function rsErrorToHTML(err) {
    if (typeof err === "string") {
      return err;
    }

    const plugin = err.plugin ? ` <small>(Plugin: "${err.plugin}")</small>.` : "";
    const hint = err.hint ? ` ${err.hint}` : "";
    const elements = Array.isArray(err.elements)
      ? ` Occurred at: ${joinAnd(err.elements.map(generateMarkdownLink))}.`
      : "";
    const details = err.details
      ? `\n\n<details>\n${err.details}\n</details>\n`
      : "";

    const text = `${err.message}${hint}${elements}${plugin}${details}`;
    return markdownToHtml(text);
  }

  /**
   * @param {Element} element
   * @param {number} i
   */
  function generateMarkdownLink(element, i) {
    return `[${i + 1}](#${element.id})`;
  }

  // In case everything else fails, we want the error
  window.addEventListener("error", ev => {
    console.error(ev.error, ev.message, ev);
  });

  async function run$_(plugins) {
    try {
      ui.show();
      await domReady();
      await runAll(plugins);
    } finally {
      ui.enable();
    }
  }

  async function domReady() {
    if (document.readyState === "loading") {
      await new Promise(resolve =>
        document.addEventListener("DOMContentLoaded", resolve)
      );
    }
  }

  const modules = [
    // order is significant
    Promise.resolve().then(function () { return locationHash; }),
    Promise.resolve().then(function () { return l10n$p; }),
    Promise.resolve().then(function () { return defaults; }),
    Promise.resolve().then(function () { return style$1; }),
    Promise.resolve().then(function () { return style; }),
    // Check configuration
    Promise.resolve().then(function () { return config; }),
    // Compute common values
    Promise.resolve().then(function () { return compute; }),
    // Process transcludes
    Promise.resolve().then(function () { return transclude; }),
    // Don't use github
    // import("../src/core/github.js"),
    Promise.resolve().then(function () { return dataInclude; }),
    Promise.resolve().then(function () { return markdown; }),
    Promise.resolve().then(function () { return postMarkdown; }),
    Promise.resolve().then(function () { return reindent$1; }),
    // import("../src/core/title.js"),
    Promise.resolve().then(function () { return headers; }),
    Promise.resolve().then(function () { return idHeaders; }),
    Promise.resolve().then(function () { return abstract; }),
    Promise.resolve().then(function () { return dataTransform; }),
    Promise.resolve().then(function () { return dataAbbr; }),
    // Make sure markdown conformance section has an id
    Promise.resolve().then(function () { return inlines$1; }),
    Promise.resolve().then(function () { return inlines; }),
    Promise.resolve().then(function () { return conformance; }),
    Promise.resolve().then(function () { return dfn; }),
    Promise.resolve().then(function () { return pluralize; }),
    Promise.resolve().then(function () { return examples; }),
    Promise.resolve().then(function () { return issuesNotes; }),
    Promise.resolve().then(function () { return bestPractices; }),
    Promise.resolve().then(function () { return figures; }),
    // Import IMS biblio
    Promise.resolve().then(function () { return biblio; }),
    Promise.resolve().then(function () { return biblio$2; }),
    Promise.resolve().then(function () { return linkToDfn; }),
    Promise.resolve().then(function () { return xref; }),
    Promise.resolve().then(function () { return dataCite; }),
    Promise.resolve().then(function () { return renderBiblio; }),
    Promise.resolve().then(function () { return dfnIndex; }),
    Promise.resolve().then(function () { return contrib; }),
    Promise.resolve().then(function () { return fixHeaders; }),
    Promise.resolve().then(function () { return structure; }),
    Promise.resolve().then(function () { return informative; }),
    Promise.resolve().then(function () { return idHeaders; }),
    Promise.resolve().then(function () { return caniuse; }),
    Promise.resolve().then(function () { return mdnAnnotation; }),
    Promise.resolve().then(function () { return saveHtml; }),
    Promise.resolve().then(function () { return searchSpecref; }),
    Promise.resolve().then(function () { return searchXref; }),
    Promise.resolve().then(function () { return aboutRespec; }),
    Promise.resolve().then(function () { return seo$1; }),
    Promise.resolve().then(function () { return seo; }),
    Promise.resolve().then(function () { return highlight; }),
    Promise.resolve().then(function () { return dataTests; }),
    Promise.resolve().then(function () { return listSorter; }),
    Promise.resolve().then(function () { return highlightVars$1; }),
    Promise.resolve().then(function () { return dfnPanel; }),
    Promise.resolve().then(function () { return dataType; }),
    Promise.resolve().then(function () { return algorithms; }),
    Promise.resolve().then(function () { return anchorExpander; }),
    Promise.resolve().then(function () { return index; }),
    // Clean up the document
    Promise.resolve().then(function () { return cleanBody; }),
    // Add title attributes to internal definition references
    Promise.resolve().then(function () { return titleAttrs; }),
    // Insert IMS stylesheet
    Promise.resolve().then(function () { return scripts; }),
    // Remove all comment nodes
    Promise.resolve().then(function () { return comments; }),
    // Add the IMS footer
    Promise.resolve().then(function () { return footers; }),
    /* Linters must be the last thing to run */
    Promise.resolve().then(function () { return checkCharset; }),
    Promise.resolve().then(function () { return checkPunctuation; }),
    Promise.resolve().then(function () { return checkInternalSlots; }),
    Promise.resolve().then(function () { return localRefsExist; }),
    Promise.resolve().then(function () { return noHeadinglessSections; }),
    Promise.resolve().then(function () { return noUnusedVars; }),
    Promise.resolve().then(function () { return privsecSection; }),
    Promise.resolve().then(function () { return wptTestsExist; }),
    Promise.resolve().then(function () { return noHttpProps; }),
    Promise.resolve().then(function () { return a11y; }),
  ];

  Promise.all(modules)
    .then(plugins => run$_(plugins))
    .catch(err => console.error(err));

  // @ts-check
  // Module core/location-hash
  // Resets window.location.hash to jump to the right point in the document

  const name$11 = "core/location-hash";

  function run$Z() {
    if (!location.hash) {
      return;
    }
    document.respec.ready.then(() => {
      let hash = decodeURIComponent(location.hash).substr(1);
      const hasLink = document.getElementById(hash);
      const isLegacyFrag = /\W/.test(hash);
      // Allow some degree of recovery for legacy fragments format.
      // See https://github.com/w3c/respec/issues/1353
      if (!hasLink && isLegacyFrag) {
        const id = hash
          .replace(/[\W]+/gim, "-")
          .replace(/^-+/, "")
          .replace(/-+$/, "");
        if (document.getElementById(id)) {
          hash = id;
        }
      }
      location.hash = `#${hash}`;
    });
  }

  var locationHash = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$11,
    run: run$Z
  });

  // @ts-check

  const coreDefaults = {
    lint: {
      "no-headingless-sections": true,
      "no-http-props": true,
      "no-unused-vars": false,
      "check-punctuation": false,
      "local-refs-exist": true,
      "check-internal-slots": false,
      "check-charset": false,
      "privsec-section": false,
    },
    pluralize: true,
    specStatus: "base",
    highlightVars: true,
    addSectionLinks: true,
  };

  // @ts-check
  /**
   * Sets the defaults for IMS specs
   */
  const name$10 = "ims/defaults";

  const imsDefaults = {};

  function run$Y(conf) {
    // assign the defaults
    const lint =
      conf.lint === false
        ? false
        : {
            ...coreDefaults.lint,
            ...imsDefaults.lint,
            ...conf.lint,
          };
    Object.assign(conf, {
      ...coreDefaults,
      ...imsDefaults,
      ...conf,
      lint,
    });
  }

  var defaults = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$10,
    run: run$Y
  });

  /* ReSpec specific CSS */
  const css$i = String.raw;

  // Prettier ignore only to keep code indented from level 0.
  // prettier-ignore
  var css$j = css$i`
@keyframes pop {
  0% {
    transform: scale(1, 1);
  }
  25% {
    transform: scale(1.25, 1.25);
    opacity: 0.75;
  }
  100% {
    transform: scale(1, 1);
  }
}

/* Override code highlighter background */
.hljs {
  background: transparent !important;
}

/* --- INLINES --- */
:is(h1, h2, h3, h4, h5, h6, a) abbr {
  border: none;
}

dfn {
  font-weight: bold;
}

a.internalDFN {
  color: inherit;
  border-bottom: 1px solid #99c;
  text-decoration: none;
}

a.externalDFN {
  color: inherit;
  border-bottom: 1px dotted #ccc;
  text-decoration: none;
}

a.bibref {
  text-decoration: none;
}

.respec-offending-element:target {
  animation: pop 0.25s ease-in-out 0s 1;
}

.respec-offending-element,
a[href].respec-offending-element {
  text-decoration: red wavy underline;
}
@supports not (text-decoration: red wavy underline) {
  .respec-offending-element:not(pre) {
    display: inline-block;
  }
  .respec-offending-element {
    /* Red squiggly line */
    background: url(data:image/gif;base64,R0lGODdhBAADAPEAANv///8AAP///wAAACwAAAAABAADAEACBZQjmIAFADs=)
      bottom repeat-x;
  }
}

#references :target {
  background: #eaf3ff;
  animation: pop 0.4s ease-in-out 0s 1;
}

cite .bibref {
  font-style: normal;
}

code {
  color: #c63501;
}

th code {
  color: inherit;
}

a[href].orcid {
  padding-left: 4px;
  padding-right: 4px;
}

a[href].orcid > svg {
  margin-bottom: -2px;
}

/* --- TOC --- */

.toc a,
.tof a {
  text-decoration: none;
}

a .secno,
a .figno {
  color: #000;
}

ul.tof,
ol.tof {
  list-style: none outside none;
}

.caption {
  margin-top: 0.5em;
  font-style: italic;
}

/* --- TABLE --- */

table.simple {
  border-spacing: 0;
  border-collapse: collapse;
  border-bottom: 3px solid #005a9c;
}

.simple th {
  background: #005a9c;
  color: #fff;
  padding: 3px 5px;
  text-align: left;
}

.simple th a {
  color: #fff;
  padding: 3px 5px;
  text-align: left;
}

.simple th[scope="row"] {
  background: inherit;
  color: inherit;
  border-top: 1px solid #ddd;
}

.simple td {
  padding: 3px 10px;
  border-top: 1px solid #ddd;
}

.simple tr:nth-child(even) {
  background: #f0f6ff;
}

/* --- DL --- */

.section dd > p:first-child {
  margin-top: 0;
}

.section dd > p:last-child {
  margin-bottom: 0;
}

.section dd {
  margin-bottom: 1em;
}

.section dl.attrs dd,
.section dl.eldef dd {
  margin-bottom: 0;
}

#issue-summary > ul {
  column-count: 2;
}

#issue-summary li {
  list-style: none;
  display: inline-block;
}

details.respec-tests-details {
  margin-left: 1em;
  display: inline-block;
  vertical-align: top;
}

details.respec-tests-details > * {
  padding-right: 2em;
}

details.respec-tests-details[open] {
  z-index: 999999;
  position: absolute;
  border: thin solid #cad3e2;
  border-radius: 0.3em;
  background-color: white;
  padding-bottom: 0.5em;
}

details.respec-tests-details[open] > summary {
  border-bottom: thin solid #cad3e2;
  padding-left: 1em;
  margin-bottom: 1em;
  line-height: 2em;
}

details.respec-tests-details > ul {
  width: 100%;
  margin-top: -0.3em;
}

details.respec-tests-details > li {
  padding-left: 1em;
}

a[href].self-link:hover {
  opacity: 1;
  text-decoration: none;
  background-color: transparent;
}

h2,
h3,
h4,
h5,
h6 {
  position: relative;
}

aside.example .marker > a.self-link {
  color: inherit;
}

:is(h2, h3, h4, h5, h6) > a.self-link {
  border: none;
  color: inherit;
  font-size: 83%;
  height: 2em;
  left: -1.6em;
  opacity: 0.5;
  position: absolute;
  text-align: center;
  text-decoration: none;
  top: 0;
  transition: opacity 0.2s;
  width: 2em;
}

:is(h2, h3, h4, h5, h6) > a.self-link::before{
  content: "§";
  display: block;
}

@media (max-width: 767px) {
  dd {
    margin-left: 0;
  }

  /* Don't position self-link in headings off-screen */
  :is(h2, h3, h4, h5, h6) > a.self-link {
    left: auto;
    top: auto;
  }
}

@media print {
  .removeOnSave {
    display: none;
  }
}
`;

  // @ts-check

  const name$$ = "core/style";

  // Opportunistically inserts the style, with the chance to reduce some FOUC
  const styleElement = insertStyle();

  function insertStyle() {
    const styleElement = document.createElement("style");
    styleElement.id = "respec-mainstyle";
    styleElement.textContent = css$j;
    document.head.appendChild(styleElement);
    return styleElement;
  }

  function run$X(conf) {
    if (conf.noReSpecCSS) {
      styleElement.remove();
    }
  }

  var style$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$$,
    run: run$X
  });

  // @ts-check

  const name$_ = "ims/style";

  /**
   * From w3c/style
   *
   * Make a best effort to attach meta viewport at the top of the head.
   * Other plugins might subsequently push it down, but at least we start
   * at the right place. When ReSpec exports the HTML, it again moves the
   * meta viewport to the top of the head - so to make sure it's the first
   * thing the browser sees. See js/ui/save-html.js.
   */
  function attachMetaViewport() {
    const meta = document.createElement("meta");
    meta.name = "viewport";
    const contentProps = {
      width: "device-width",
      "initial-scale": "1",
      "shrink-to-fit": "no",
    };
    meta.content = toKeyValuePairs(contentProps).replace(/"/g, "");
    document.head.insertBefore(meta, document.head.firstChild);
  }

  /**
   * From w3c/style
   *
   * Ignores specStatus and always loads base.css.
   */
  function linkW3cCSS() {
    linkCSS(document, "https://www.w3.org/StyleSheets/TR/2016/base.css");
  }

  /**
   * @param {*} conf respecConfig
   */
  async function run$W(conf) {
    // From w3c/style
    attachMetaViewport();
    linkW3cCSS();

    // Link to IMS stylesheet
    let cssURL = "https://purl.imsglobal.org/spec/ims-base.css";
    if (conf.overrideCSSLocation) {
      cssURL = conf.overrideCSSLocation;
    }
    linkCSS(document, cssURL);
  }

  var style = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$_,
    run: run$W
  });

  // @ts-check

  const name$Z = "ims/config";

  /**
   * Returns true if value is not null or empty.
   *
   * @param { string } value
   */
  function check(value) {
    return value != undefined && value.trim().length > 0;
  }

  /**
   * @param {*} conf
   */
  async function run$V(conf) {
    if (!check(conf.specTitle)) {
      showError(
        "head config must have the <code>specTitle</code> property set: " +
          "title of the document, excluding version",
        name$Z
      );
      conf.specTitle = "@@@FIXME (conf.specTitle)";
    }

    if (!check(conf.docVersion)) {
      showError(
        "head config must have the <code>docVersion</code> property set, e.g. 'June 28, 2019'",
        name$Z
      );
      conf.docVersion = "@@@FIXME (conf.docVersion)";
    }

    if (!check(conf.specDate)) {
      if (conf.specStatus === "IMS Base Document") {
        conf.specDate = toShortIsoDate(new Date());
      } else {
        showError(
          "head config must have the <code>specDate</code> property set, e.g. 'June 28, 2019'",
          name$Z
        );
        conf.specDate = "@@@FIXME(conf.specDate)";
      }
    }

    if (!check(conf.specNature)) {
      showError(
        "head config must have the <code>specNature</code> property set: one of 'normative' or 'informative'",
        name$Z
      );
      conf.specNature = "informative";
    }

    if (!check(conf.specType)) {
      showError(
        "head config must have the <code>specType</code> property set: One of 'spec', 'cert', 'impl', 'errata', 'doc' ",
        name$Z
      );
      conf.specType = "spec";
    }

    if (conf.specType === "doc" || conf.specType === "proposal") {
      return;
    }

    if (!check(conf.shortName)) {
      showError(
        "head config must have the <code>shortName</code> property set: " +
          "list at urls-names.md#shortnames",
        name$Z
      );
      conf.shortName = "FIXME";
    }

    if (!check(conf.specStatus)) {
      showError(
        "head config must have the <code>specStatus</code> property set to " +
          "one of 'IMS Base Document', 'IMS Candidate Final', IMS Candidate Final Public', " +
          "or 'IMS Final Release'",
        name$Z
      );
      conf.specStatus = "@@@FIXME(conf.specStatus)";
    }

    const statusValues = [
      "IMS Base Document",
      "IMS Candidate Final",
      "IMS Candidate Final Public",
      "IMS Final Release",
      "Proposal",
    ];
    if (statusValues.indexOf(conf.specStatus) == -1) {
      showError(
        "head config must have the <code>specStatus</code> property set to " +
          "one of 'IMS Base Document', 'IMS Candidate Final', 'IMS Candidate Final Public', " +
          "'IMS Final Release', or 'Proposal'",
        name$Z
      );
    }

    if (!check(conf.specVersion)) {
      showError(
        "head config must have the <code>specVersion</code> property set, e.g. '1.1'",
        name$Z
      );
      conf.specVersion = "@@@FIXME(conf.specVersion)";
    }
  }

  var config = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$Z,
    run: run$V
  });

  // @ts-check

  const name$Y = "ims/compute";

  /**
   * Compute misc variables used by multiple other modules and store them back in conf.
   *
   * @param {*} conf
   */
  async function run$U(conf) {
    const base = `https://www.imsglobal.org/spec/${conf.shortName}/`;

    // v1p2-style reformat for use in path segments
    conf.versionURL = `v${conf.specVersion}`.replace(".", "p");

    conf.thisURL = `${base}${conf.versionURL}/`;

    conf.errataURL = `${conf.thisURL}errata/`;

    if (conf.specType !== "spec") {
      conf.thisURL = `${conf.thisURL}${conf.specType}/`;
    }

    conf.latestURI = `${base}latest/`;
    if (conf.specType !== "spec") {
      conf.latestURI = `${conf.latestURI}${conf.specType}/`;
    }

    // needed for aux docs that need to point back to main spec
    conf.mainSpecURL = `${base}${conf.versionURL}/`;
  }

  var compute = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$Y,
    run: run$U
  });

  // @ts-check

  /**
   * Returns the first Element in the string.
   *
   * @param { string } string the HTML string to convert
   * @returns { Element } the first element in the string
   */
  function toHTMLElement(string) {
    const node = toHTMLNode(string);
    return node.parentElement.firstElementChild;
  }

  function toHTMLNodes(string) {
    const element = document.createElement("div");
    element.innerHTML = string;
    return element.childNodes;
  }

  function toHTMLNode(string) {
    const element = document.createElement("div");
    element.innerHTML = string;
    return element.childNodes[0];
  }

  // @ts-check

  const name$X = "ims/transclude";

  async function run$T() {
    /*
    Filesystem transclusion is done using script elements with a class 
    of 'transclude'. If the script element has a data-id attribute equal to the 
    name of a string variable in global scope, then the script element is 
    replaced with HTML nodes corresponding to the given variable. 
    
    Each script element can declare zero, one or several string variables. In
    other words, it is possible to have one script which 
    declares all transclude variables, and then src-less script elements which
    then only declares where the content should be inserted. It is equally ok
    to have each occurence of the script element in the body to bring in its own 
    content via its own src. 
    
    Note the use of template literals to allow easy authoring and maintenance
    of multi-line strings in the js files referenced. 
    */

    let transclude = document.querySelector("script.transclude");

    while (transclude !== null) {
      if (!transclude.hasAttribute("data-id")) {
        pub("error", "transclude script element without data-id attribute");
        break;
      }

      const str = window[transclude.getAttribute("data-id")];

      if (str === undefined || typeof str !== "string") {
        pub(
          "error",
          `no transclude variable named '${str}' found in global scope`
        );
        break;
      }

      const newNodes = toHTMLNodes(str);

      for (let k = 0; k < newNodes.length; k++) {
        const clone = newNodes[k].cloneNode(true);
        transclude.parentNode.insertBefore(clone, transclude);
      }

      transclude.parentNode.removeChild(transclude);

      // Get the next transclude

      transclude = document.querySelector("script.transclude");
    }
  }

  var transclude = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$X,
    run: run$T
  });

  // @ts-check

  const name$W = "core/data-include";

  /**
   * @param {HTMLElement} el
   * @param {string} data
   * @param {object} options
   * @param {boolean} options.replace
   */
  function fillWithText(el, data, { replace }) {
    const { includeFormat } = el.dataset;
    let fill = data;
    if (includeFormat === "markdown") {
      fill = markdownToHtml(fill);
    }

    if (includeFormat === "text") {
      el.textContent = fill;
    } else {
      el.innerHTML = fill;
    }

    if (includeFormat === "markdown") {
      restructure(el);
    }

    if (replace) {
      el.replaceWith(...el.childNodes);
    }
  }

  /**
   * @param {string} rawData
   * @param {string} id
   * @param {string} url
   */
  function processResponse(rawData, id, url) {
    /** @type {HTMLElement} */
    const el = document.querySelector(`[data-include-id=${id}]`);
    const data = runTransforms(rawData, el.dataset.oninclude, url);
    const replace = typeof el.dataset.includeReplace === "string";
    fillWithText(el, data, { replace });
    // If still in the dom tree, clean up
    if (!replace) {
      removeIncludeAttributes(el);
    }
  }
  /**
   * Removes attributes after they are used for inclusion, if present.
   *
   * @param {Element} el The element to clean up.
   */
  function removeIncludeAttributes(el) {
    [
      "data-include",
      "data-include-format",
      "data-include-replace",
      "data-include-id",
      "oninclude",
    ].forEach(attr => el.removeAttribute(attr));
  }

  async function run$S() {
    /** @type {NodeListOf<HTMLElement>} */
    const includables = document.querySelectorAll("[data-include]");

    const promisesToInclude = Array.from(includables).map(async el => {
      const url = el.dataset.include;
      if (!url) {
        return; // just skip it
      }
      const id = `include-${String(Math.random()).substr(2)}`;
      el.dataset.includeId = id;
      try {
        const response = await fetch(url);
        const text = await response.text();
        processResponse(text, id, url);
      } catch (err) {
        const msg = `\`data-include\` failed: \`${url}\` (${err.message}).`;
        console.error(msg, el, err);
        showError(msg, name$W, { elements: [el] });
      }
    });
    await Promise.all(promisesToInclude);
  }

  var dataInclude = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$W,
    run: run$S
  });

  // @ts-check
  const name$V = "ims/post-markdown";

  /**
   * Post processing of markdown transcludes. Run after markdown.
   *
   * @param {*} conf respecConfig
   */
  async function run$R(conf) {
    if (conf.format !== "markdown") return;

    // remove <md-only> elements
    const mdOnlies = document.body.querySelectorAll("md-only");
    for (let i = 0; i < mdOnlies.length; i++) {
      mdOnlies[i].parentNode.removeChild(mdOnlies[i]);
    }
  }

  var postMarkdown = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$V,
    run: run$R
  });

  /* eslint-disable prettier/prettier */

  const name$U = "ims/templates/headers";

  /**
   * @param {*} conf
   */
  function getStatusString(conf) {
    // specStatusString: an override of the default descriptions
    if (conf.specStatusString) {
      return conf.specStatusString;
    }
    // for generic docs, have a generic desc
    if (conf.specType === "doc") {
      return "This is an informative IMS Global document that may be revised at any time.";
    }
    if (conf.specType === "proposal") {
      return "This is a proposal that may be revised at any time.";
    }
    // specStatus: See ims/config.js for known values
    switch (conf.specStatus) {
      case "Proposal":
        return "This document is for review and comment by IMS Contributing Members.";
      case "IMS Base Document":
        return "This document is for review and comment by IMS Contributing Members.";
      case "IMS Candidate Final":
        return "This document is for review and adoption by the IMS membership.";
      case "IMS Candidate Final Public":
        return "This document is for review and adoption by the IMS membership.";
      case "IMS Final Release":
        return "This document is made available for adoption by the public community at large.";
      default:
        // ims/config.js will issue error for unknown values
        return `Unknown <code>specStatus: "${conf.specStatus}"</code>`;
    }
  }

  function showLink(link) {
    if (!link.key) {
      const msg =
        "Found a link without `key` attribute in the configuration. See dev console.";
      showWarning(msg, name$U);
      return;
    }
    return html`
    <tr class="${link.class ? link.class : null}">
      <td>${link.key}:</td>
      ${link.data ? link.data.map(showLinkData) : showLinkData(link)}
    </tr>
  `;
  }

  function showLinkData(data) {
    return html` <td class="${data.class ? data.class : null}">
    ${data.href
      ? html`<a href="${data.href}">${data.value || data.href}</a>`
      : data.value}
  </td>`;
  }

  function renderSpecVersion(conf) {
    if (conf.specType !== "doc" && conf.specType !== "proposal") {
      return html`<div class="subtitle">
        ${conf.specStatus}<br />Spec Version ${conf.specVersion}
      </div>`;
    }
  }

  function renderSpecStatus(conf) {
    if (conf.specType !== "doc" && conf.specType !== "proposal") {
      return html`<span
      class="statusPD${conf.specStatus === "IMS Final Release" ? " final" : ""}"
      data-content="${conf.specStatus}"
      >${conf.specStatus}</span
    >`;
    }
  }

  function renderVersionTable(conf) {
    if (conf.specType !== "doc" && conf.specType !== "proposal") {
      return html`<table
  id="version-table"
  title="Version/Release Details"
  summary="Details about the version and release.">
    <tbody>
      <tr>
        <td>Document Version:</td>
        <td>${conf.docVersion}</td>
      </tr>
      <tr>
        <td>Date Issued:</td>
        <td>${conf.specDate}</td>
      </tr>
      <tr>
        <td>Status:</td>
        <td>${getStatusString(conf)}</td>
      </tr>
      <tr>
        <td>This version:</td>
        <td><a href='${conf.thisURL}'>${conf.thisURL}</a></td>
      </tr>
      ${conf.specNature === "normative"
        ? html`<tr>
                <td>Latest version:</td>
                <td><a href="${conf.latestURI}">${conf.latestURI}</a></td>
              </tr>
              <tr>
                <td>Errata:</td>
                <td><a href="${conf.errataURL}">${conf.errataURL}</a></td>
              </tr>`
        : null
      }
      ${conf.otherLinks ? conf.otherLinks.map(showLink) : ""}
    </tbody>
  </table>`;
    } else {
      return html`<table
      id="version-table"
      title="Version/Release Details"
      summary="Details about the version and release.">
      <tbody>
        <tr>
          <td>Date Issued:</td>
          <td>${conf.specDate}</td>
        </tr>
        <tr>
          <td>Status:</td>
          <td>${getStatusString(conf)}</td>
        </tr>
      </tbody>
    </table>`;
    }
  }

  function renderCopyright() {
    return html`<div id="cpr">
    <p>
      © ${new Date().getFullYear()} IMS Global Learning Consortium, Inc. All
      Rights Reserved.
    </p>
    <p>
      Trademark information:
      <a href="http://www.imsglobal.org/copyright.html"
        >http://www.imsglobal.org/copyright.html
      </a>
    </p>
  </div>`;
  }

  function renderDisclosure(conf) {
    if (conf.specType === "proposal") {
      return html`<div id="disclosure">
      <h2>Proposals</h2>
      <p>
        Proposals are made available for the purposes of Project Group / Task
        Force only and should not be distributed outside of the IMS Contributing
        Membership without the express written consent of IMS GLC. Provision of
        any work documents outside of the project group/ task force will revoke
        all privileges as an Invited Guest. Any documents provided
        non-participants will be done by IMS GLC only on the IMS GLC public
        website when the documents become publicly available.
      </p>
    </div>`;
    } else {
      return html`<div id="disclosure">
      <p>
        Use of this specification to develop products or services is governed by
        the license with IMS found on the IMS website:
        <a href="http://www.imsglobal.org/speclicense.html">
          http://www.imsglobal.org/speclicense.html</a
        >.
      </p>
      <p>
        Permission is granted to all parties to use excerpts from this document
        as needed in producing requests for proposals.
      </p>
      <p>
        The limited permissions granted above are perpetual and will not be
        revoked by IMS or its successors or assigns.
      </p>
      <p>
        THIS SPECIFICATION IS BEING OFFERED WITHOUT ANY WARRANTY WHATSOEVER, AND
        IN PARTICULAR, ANY WARRANTY OF NONINFRINGEMENT IS EXPRESSLY DISCLAIMED.
        ANY USE OF THIS SPECIFICATION SHALL BE MADE ENTIRELY AT THE
        IMPLEMENTER'S OWN RISK, AND NEITHER THE CONSORTIUM, NOR ANY OF ITS
        MEMBERS OR SUBMITTERS, SHALL HAVE ANY LIABILITY WHATSOEVER TO ANY
        IMPLEMENTER OR THIRD PARTY FOR ANY DAMAGES OF ANY NATURE WHATSOEVER,
        DIRECTLY OR INDIRECTLY, ARISING FROM THE USE OF THIS SPECIFICATION.
      </p>
      <p>
        Public contributions, comments and questions can be posted here:
        <a href="http://www.imsglobal.org/forums/ims-glc-public-forums-and-resources">
          http://www.imsglobal.org/forums/ims-glc-public-forums-and-resources
        </a>.
      </p>
    </div>`;
    }
  }

  function renderIpr(conf) {
    return html`<div id="ipr">
      <h2>IPR and Distribution Notice</h2>
      <p>
        Recipients of this document are requested to submit, with their
        comments, notification of any relevant patent claims or other
        intellectual property rights of which they may be aware that might be
        infringed by any implementation of the specification set forth in this
        document, and to provide supporting documentation.
      </p>
      <p>
        IMS takes no position regarding the validity or scope of any
        intellectual property or other rights that might be claimed to pertain
        implementation or use of the technology described in this document or
        the extent to which any license under such rights might or might not be
        available; neither does it represent that it has made any effort to
        identify any such rights. Information on IMS's procedures with respect
        to rights in IMS specifications can be found at the IMS Intellectual
        Property Rights webpage:
        <a href="http://www.imsglobal.org/ipr/imsipr_policyFinal.pdf">
          http://www.imsglobal.org/ipr/imsipr_policyFinal.pdf </a
        >.
      </p>
    </div>
    ${renderIprTable(conf)}`;
  }

  function renderIprTable(conf) {
    if (conf.iprs) {
      return html`<p>
        The following participating organizations have made explicit license
        commitments to this specification:
      </p>
      <table>
      <thead>
        <tr>
          <th>Org name</th>
          <th>Date election made</th>
          <th>Necessary claims</th>
          <th>Type</th>
        </th>
      </thead>
      <tbody>
      ${conf.iprs.map(renderIprRow)}
      </tbody>
      </table>`;
    }
  }

  function renderIprRow(element) {
    return html`<tr>
    <td>${element.company}</td>
    <td>${element.electionDate}</td>
    <td>${element.necessaryClaims}</td>
    <td>${element.type}</td>
  </tr>`;
  }

  var headersTmpl = conf => {
    return html`<header>
    <div class="header-top">
      <h1 class="title" id="title">${conf.specTitle}</h1>
      <a href="https://www.imsglobal.org" id="ims-logo">
        <img
          src="https://www.imsglobal.org/sites/default/files/IMSglobalreg2_2.png"
          alt="IMS logo"
        />
      </a>
    </div>
    ${renderSpecVersion(conf)} ${renderSpecStatus(conf)}
    ${renderVersionTable(conf)} ${renderIpr(conf)} ${renderDisclosure(conf)}
    ${renderCopyright()}
  </header>`;
  };

  // @ts-check

  const name$T = "ims/headers";

  /**
   * @param {*} conf
   */
  async function run$Q(conf) {
    document.title = `${conf.specTitle} ${conf.specVersion ?? ""} 
    ${conf.specStatus ?? ""}`;

    const body = document.body;
    const header = headersTmpl(conf);

    if (body.firstChild) {
      body.insertBefore(header, body.firstChild);
    } else {
      body.appendChild(header);
    }
  }

  var headers = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$T,
    run: run$Q
  });

  // @ts-check
  // Module core/id-headers
  // All headings are expected to have an ID, unless their immediate container has one.
  // This is currently in core though it comes from a W3C rule. It may move in the future.

  const name$S = "core/id-headers";

  function run$P(conf) {
    /** @type {NodeListOf<HTMLElement>} */
    const headings = document.querySelectorAll(
      `section:not(.head):not(.introductory) h2, h3, h4, h5, h6`
    );
    for (const h of headings) {
      // prefer for ID: heading.id > parentElement.id > newly generated heading.id
      let id = h.id;
      if (!id) {
        addId(h);
        id = h.parentElement.id || h.id;
      }
      if (!conf.addSectionLinks) continue;
      h.appendChild(html`
      <a href="${`#${id}`}" class="self-link" aria-label="§"></a>
    `);
    }
  }

  var idHeaders = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$S,
    run: run$P
  });

  // @ts-check
  const name$R = "ims/abstract";

  /**
   * Handles checking for the abstract, and inserts a temp one if not present.
   */
  async function run$O() {
    let abstract = document.getElementById("abstract");
    if (!abstract) {
      const msg = `Document must have one element with \`id="abstract"`;
      showError(msg, name$R);
      return;
    }

    if (abstract.tagName.startsWith("H")) {
      abstract.removeAttribute("id");
      abstract = abstract.parentElement;
      abstract.id = "abstract";
    }
    if (abstract.tagName === "SECTION") {
      if (!abstract.classList.contains("introductory")) {
        abstract.classList.add("introductory");
      }
    }

    let abstractHeading = document.querySelector("#abstract>h2");
    if (abstractHeading) {
      return;
    }
    abstractHeading = document.createElement("h2");
    abstractHeading.textContent = "Abstract";
    abstract.prepend(abstractHeading);
  }

  var abstract = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$R,
    run: run$O
  });

  // @ts-check

  const name$Q = "core/data-transform";

  function run$N() {
    /** @type {NodeListOf<HTMLElement>} */
    const transformables = document.querySelectorAll("[data-transform]");
    transformables.forEach(el => {
      el.innerHTML = runTransforms(el.innerHTML, el.dataset.transform);
      el.removeAttribute("data-transform");
    });
  }

  var dataTransform = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$Q,
    run: run$N
  });

  // @ts-check
  const name$P = "core/dfn-abbr";

  function run$M() {
    /** @type {NodeListOf<HTMLElement>} */
    const elements = document.querySelectorAll("[data-abbr]");
    for (const elem of elements) {
      const { localName } = elem;
      switch (localName) {
        case "dfn":
          processDfnElement(elem);
          break;
        default: {
          const msg = `\`data-abbr\` attribute not supported on \`${localName}\` elements.`;
          showError(msg, name$P, {
            elements: [elem],
            title: "Error: unsupported.",
          });
        }
      }
    }
  }
  /**
   * @param {HTMLElement} dfn
   */
  function processDfnElement(dfn) {
    const abbr = generateAbbreviation(dfn);
    // get normalized <dfn> textContent to remove spaces, tabs, new lines.
    const fullForm = dfn.textContent.replace(/\s\s+/g, " ").trim();
    dfn.insertAdjacentHTML(
      "afterend",
      ` (<abbr title="${fullForm}">${abbr}</abbr>)`
    );
    const lt = dfn.dataset.lt || "";
    dfn.dataset.lt = lt
      .split("|")
      .filter(i => i.trim())
      .concat(abbr)
      .join("|");
  }

  function generateAbbreviation(elem) {
    if (elem.dataset.abbr) return elem.dataset.abbr;
    // Generates abbreviation from textContent
    // e.g., "Permanent Account Number" -> "PAN"
    return elem.textContent
      .match(/\b([a-z])/gi)
      .join("")
      .toUpperCase();
  }

  var dataAbbr = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$P,
    run: run$M
  });

  // @ts-check

  const name$O = "ims/inlines";

  /**
   * Find the Conformance section in parent and assign an id.
   *
   * @param {Element | HTMLElement} parent
   */
  function findConformanceSection(parent) {
    /** @type {NodeListOf<HTMLElement>} */
    const sectionElements = parent.querySelectorAll(":scope > section");
    for (const section of sectionElements) {
      if (!section.children.length) {
        continue;
      }

      if (!section.id) {
        const header = section.children[0];
        const title = header.textContent;
        if (
          title.toLowerCase() == "conformance" ||
          title.toLowerCase() == "conformance statements"
        ) {
          addId(section, null, "conformance");
          return section;
        }
      }

      const foundSection = findConformanceSection(section);
      if (foundSection) {
        return foundSection;
      }
    }

    return null;
  }

  /**
   * @param {*} conf
   */
  async function run$L(conf) {
    // No conformance section in IMS Errata documents
    if (conf.specType == "errata") {
      return;
    }

    let conformance = document.querySelector("section#conformance");
    if (!conformance) {
      conformance = findConformanceSection(document.body);
    }
  }

  var inlines$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$O,
    run: run$L
  });

  // @ts-check
  const idlPrimitiveRegex = /^[a-z]+(\s+[a-z]+)+\??$/; // {{unrestricted double?}} {{ double }}
  const exceptionRegex = /\B"([^"]*)"\B/; // {{ "SomeException" }}
  const methodRegex = /(\w+)\((.*)\)$/;

  const slotRegex = /\[\[(\w+(?: +\w+)*)\]\](\([^)]*\))?$/;
  // matches: `value` or `[[value]]`
  // NOTE: [[value]] is actually a slot, but database has this as type="attribute"
  const attributeRegex = /^((?:\[\[)?(?:\w+(?: +\w+)*)(?:\]\])?)$/;
  const baseRegex = /^(?:\w+)\??$/;
  const enumRegex = /^(\w+)\["([\w- ]*)"\]$/;
  // TODO: const splitRegex = /(?<=\]\]|\b)\./
  // https://github.com/w3c/respec/pull/1848/files#r225087385
  const methodSplitRegex = /\.?(\w+\(.*\)$)/;
  const slotSplitRegex = /\/(.+)/;
  const isProbablySlotRegex = /\[\[.+\]\]/;
  /**
   * @typedef {object} IdlBase
   * @property {"base"} type
   * @property {string} identifier
   * @property {boolean} renderParent
   * @property {boolean} nullable
   * @property {InlineIdl | null} [parent]
   *
   * @typedef {object} IdlAttribute
   * @property {"attribute"} type
   * @property {string} identifier
   * @property {boolean} renderParent
   * @property {InlineIdl | null} [parent]
   *
   * @typedef {object} IdlInternalSlot
   * @property {"internal-slot"} type
   * @property {string} identifier
   * @property {string[]} [args]
   * @property {boolean} renderParent
   * @property {InlineIdl | null} [parent]
   * @property {"attribute"|"method"} slotType
   *
   * @typedef {object} IdlMethod
   * @property {"method"} type
   * @property {string} identifier
   * @property {string[]} args
   * @property {boolean} renderParent
   * @property {InlineIdl | null} [parent]
   *
   * @typedef {object} IdlEnum
   * @property {"enum"} type
   * @property {string} [identifier]
   * @property {string} enumValue
   * @property {boolean} renderParent
   * @property {InlineIdl | null} [parent]
   *
   * @typedef {object} IdlException
   * @property {"exception"} type
   * @property {string} identifier
   * @property {InlineIdl | null} [parent]
   *
   * @typedef {object} IdlPrimitive
   * @property {"idl-primitive"} type
   * @property {boolean} nullable
   * @property {string} identifier
   * @property {boolean} renderParent
   * @property {InlineIdl | null} [parent]
   *
   * @typedef {IdlBase | IdlAttribute | IdlInternalSlot | IdlMethod | IdlEnum | IdlException | IdlPrimitive} InlineIdl
   */

  /**
   * @param {string} str
   * @returns {InlineIdl[]}
   */
  function parseInlineIDL(str) {
    // If it's got [[ string ]], then split as an internal slot
    const isSlot = isProbablySlotRegex.test(str);
    const splitter = isSlot ? slotSplitRegex : methodSplitRegex;
    const [forPart, childString] = str.split(splitter);
    if (isSlot && forPart && !childString) {
      throw new SyntaxError(
        `Internal slot missing "for" part. Expected \`{{ InterfaceName/${forPart}}}\` }.`
      );
    }
    const tokens = forPart
      .split(/[./]/)
      .concat(childString)
      .filter(s => s && s.trim())
      .map(s => s.trim());
    const renderParent = !str.includes("/");
    /** @type {InlineIdl[]} */
    const results = [];
    while (tokens.length) {
      const value = tokens.pop();
      // Method
      if (methodRegex.test(value)) {
        const [, identifier, allArgs] = value.match(methodRegex);
        const args = allArgs.split(/,\s*/).filter(arg => arg);
        results.push({ type: "method", identifier, args, renderParent });
        continue;
      }
      // Enum["enum value"]
      if (enumRegex.test(value)) {
        const [, identifier, enumValue] = value.match(enumRegex);
        results.push({ type: "enum", identifier, enumValue, renderParent });
        continue;
      }
      // Exception - "NotAllowedError"
      // Or alternate enum syntax: {{ EnumContainer / "some enum value" }}
      if (exceptionRegex.test(value)) {
        const [, identifier] = value.match(exceptionRegex);
        if (renderParent) {
          results.push({ type: "exception", identifier });
        } else {
          results.push({ type: "enum", enumValue: identifier, renderParent });
        }
        continue;
      }
      // internal slot
      if (slotRegex.test(value)) {
        const [, identifier, allArgs] = value.match(slotRegex);
        const slotType = allArgs ? "method" : "attribute";
        const args = allArgs
          ?.slice(1, -1)
          .split(/,\s*/)
          .filter(arg => arg);
        results.push({
          type: "internal-slot",
          slotType,
          identifier,
          args,
          renderParent,
        });
        continue;
      }
      // attribute
      if (attributeRegex.test(value) && tokens.length) {
        const [, identifier] = value.match(attributeRegex);
        results.push({ type: "attribute", identifier, renderParent });
        continue;
      }
      if (idlPrimitiveRegex.test(value)) {
        const nullable = value.endsWith("?");
        const identifier = nullable ? value.slice(0, -1) : value;
        results.push({
          type: "idl-primitive",
          identifier,
          renderParent,
          nullable,
        });
        continue;
      }
      // base, always final token
      if (baseRegex.test(value) && tokens.length === 0) {
        const nullable = value.endsWith("?");
        const identifier = nullable ? value.slice(0, -1) : value;
        results.push({ type: "base", identifier, renderParent, nullable });
        continue;
      }
      throw new SyntaxError(`IDL micro-syntax parsing error in \`{{ ${str} }}\``);
    }
    // link the list
    results.forEach((item, i, list) => {
      item.parent = list[i + 1] || null;
    });
    // return them in the order we found them...
    return results.reverse();
  }

  /**
   * @param {IdlBase} details
   */
  function renderBase(details) {
    // Check if base is a local variable in a section
    const { identifier, renderParent, nullable } = details;
    if (renderParent) {
      return html`<a
      data-xref-type="_IDL_"
      data-link-type="idl"
      data-lt="${identifier}"
      ><code>${identifier + (nullable ? "?" : "")}</code></a
    >`;
    }
  }

  /**
   * Internal slot: .[[identifier]] or [[identifier]]
   * @param {IdlInternalSlot} details
   */
  function renderInternalSlot(details) {
    const { identifier, parent, slotType, renderParent, args } = details;
    const { identifier: linkFor } = parent || {};
    const isMethod = slotType === "method";
    const argsHtml = isMethod
      ? html`(${htmlJoinComma(args, htmlArgMapper)})`
      : null;
    const textArgs = isMethod ? `(${args.join(", ")})` : "";
    const lt = `[[${identifier}]]${textArgs}`;
    const element = html`${parent && renderParent ? "." : ""}<a
      data-xref-type="${slotType}"
      data-link-for="${linkFor}"
      data-xref-for="${linkFor}"
      data-lt="${lt}"
      ><code>[[${identifier}]]${argsHtml}</code></a
    >`;
    return element;
  }

  function htmlArgMapper(str, i, array) {
    if (i < array.length - 1) return html`<var>${str}</var>`;
    // only the last argument can be variadic
    const parts = str.split(/(^\.{3})(.+)/);
    const isVariadic = parts.length > 1;
    const arg = isVariadic ? parts[2] : parts[0];
    return html`${isVariadic ? "..." : null}<var>${arg}</var>`;
  }
  /**
   * Attribute: .identifier
   * @param {IdlAttribute} details
   */
  function renderAttribute(details) {
    const { parent, identifier, renderParent } = details;
    const { identifier: linkFor } = parent || {};
    const element = html`${renderParent ? "." : ""}<a
      data-link-type="idl"
      data-xref-type="attribute|dict-member|const"
      data-link-for="${linkFor}"
      data-xref-for="${linkFor}"
      ><code>${identifier}</code></a
    >`;
    return element;
  }

  /**
   * Method: .identifier(arg1, arg2, ...), identifier(arg1, arg2, ...)
   * @param {IdlMethod} details
   */
  function renderMethod(details) {
    const { args, identifier, type, parent, renderParent } = details;
    const { identifier: linkFor } = parent || {};
    const argsText = htmlJoinComma(args, htmlArgMapper);
    const searchText = `${identifier}(${args.join(", ")})`;
    const element = html`${parent && renderParent ? "." : ""}<a
      data-link-type="idl"
      data-xref-type="${type}"
      data-link-for="${linkFor}"
      data-xref-for="${linkFor}"
      data-lt="${searchText}"
      ><code>${identifier}</code></a
    ><code>(${argsText})</code>`;
    return element;
  }

  /**
   * Enum:
   * Identifier["enum value"]
   * Identifer / "enum value"
   * @param {IdlEnum} details
   */
  function renderEnum(details) {
    const { identifier, enumValue, parent } = details;
    const forContext = parent ? parent.identifier : identifier;
    const element = html`"<a
      data-link-type="idl"
      data-xref-type="enum-value"
      data-link-for="${forContext}"
      data-xref-for="${forContext}"
      data-lt="${!enumValue ? "the-empty-string" : null}"
      ><code>${enumValue}</code></a
    >"`;
    return element;
  }

  /**
   * Exception value: "NotAllowedError"
   * Only the WebIDL spec can define exceptions
   * @param {IdlException} details
   */
  function renderException(details) {
    const { identifier } = details;
    const element = html`"<a
      data-link-type="idl"
      data-cite="WebIDL"
      data-xref-type="exception"
      ><code>${identifier}</code></a
    >"`;
    return element;
  }

  /**
   * Interface types: {{ unrestricted double }} {{long long}}
   * Only the WebIDL spec defines these types.
   * @param {IdlPrimitive} details
   */
  function renderIdlPrimitiveType(details) {
    const { identifier, nullable } = details;
    const element = html`<a
    data-link-type="idl"
    data-cite="WebIDL"
    data-xref-type="interface"
    data-lt="${identifier}"
    ><code>${identifier + (nullable ? "?" : "")}</code></a
  >`;
    return element;
  }

  /**
   * Generates HTML by parsing an IDL string
   * @param {String} str IDL string
   * @return {Node} html output
   */
  function idlStringToHtml(str) {
    let results;
    try {
      results = parseInlineIDL(str);
    } catch (error) {
      const el = html`<span>{{ ${str} }}</span>`;
      const title = "Error: Invalid inline IDL string.";
      showError(error.message, "core/inlines", { title, elements: [el] });
      return el;
    }
    const render = html(document.createDocumentFragment());
    const output = [];
    for (const details of results) {
      switch (details.type) {
        case "base": {
          const base = renderBase(details);
          if (base) output.push(base);
          break;
        }
        case "attribute":
          output.push(renderAttribute(details));
          break;
        case "internal-slot":
          output.push(renderInternalSlot(details));
          break;
        case "method":
          output.push(renderMethod(details));
          break;
        case "enum":
          output.push(renderEnum(details));
          break;
        case "exception":
          output.push(renderException(details));
          break;
        case "idl-primitive":
          output.push(renderIdlPrimitiveType(details));
          break;
        default:
          throw new Error("Unknown type.");
      }
    }
    const result = render`${output}`;
    return result;
  }

  // @ts-check

  /**
   * @typedef {keyof BiblioDb} AllowedType
   * @type {Set<AllowedType>}
   */
  const ALLOWED_TYPES = new Set(["alias", "reference"]);
  /* Database initialization tracker */
  const readyPromise = openIdb();

  /**
   * @typedef {object} BiblioDb
   *
   * @property {object} alias Object store for alias objects
   * @property {string} alias.key
   * @property {object} alias.value
   * @property {object} alias.indexes
   * @property {string} alias.aliasOf
   *
   * @property {object} reference Object store for reference objects
   * @property {string} reference.key
   * @property {object} reference.value
   *
   * @returns {Promise<import("idb").IDBPDatabase<BiblioDb>>}
   */
  async function openIdb() {
    /** @type {import("idb").IDBPDatabase<BiblioDb>} */
    const db = await idb.openDB("respec-biblio2", 12, {
      upgrade(db) {
        Array.from(db.objectStoreNames).map(storeName =>
          db.deleteObjectStore(storeName)
        );
        const store = db.createObjectStore("alias", { keyPath: "id" });
        store.createIndex("aliasOf", "aliasOf", { unique: false });
        db.createObjectStore("reference", { keyPath: "id" });
      },
    });
    // Clean the database of expired biblio entries.
    const now = Date.now();
    for (const storeName of [...ALLOWED_TYPES]) {
      const store = db.transaction(storeName, "readwrite").store;
      const range = IDBKeyRange.lowerBound(now);
      let result = await store.openCursor(range);
      while (result?.value) {
        /** @type {BiblioData} */
        const entry = result.value;
        if (entry.expires === undefined || entry.expires < now) {
          await store.delete(entry.id);
        }
        result = await result.continue();
      }
    }

    return db;
  }

  const biblioDB = {
    get ready() {
      return readyPromise;
    },
    /**
     * Finds either a reference or an alias.
     * If it's an alias, it resolves it.
     *
     * @param {String} id The reference or alias to look for.
     * @return {Promise<BiblioData?>} The reference or null.
     */
    async find(id) {
      if (await this.isAlias(id)) {
        id = await this.resolveAlias(id);
      }
      return await this.get("reference", id);
    },
    /**
     * Checks if the database has an id for a given type.
     *
     * @param {AllowedType} type One of the ALLOWED_TYPES.
     * @param {String} id The reference to find.
     * @return {Promise<Boolean>} True if it has it, false otherwise.
     */
    async has(type, id) {
      if (!ALLOWED_TYPES.has(type)) {
        throw new TypeError(`Invalid type: ${type}`);
      }
      if (!id) {
        throw new TypeError("id is required");
      }
      const db = await this.ready;
      const objectStore = db.transaction(type, "readonly").store;
      const range = IDBKeyRange.only(id);
      const result = await objectStore.openCursor(range);
      return !!result;
    },
    /**
     * Checks if a given id is an alias.
     *
     * @param {String} id The reference to check.
     * @return {Promise<Boolean>} Resolves with true if found.
     */
    async isAlias(id) {
      return await this.has("alias", id);
    },
    /**
     * Resolves an alias to its corresponding reference id.
     *
     * @param {String} id The id of the alias to look up.
     * @return {Promise<String>} The id of the resolved reference.
     */
    async resolveAlias(id) {
      if (!id) {
        throw new TypeError("id is required");
      }
      const db = await this.ready;

      const objectStore = db.transaction("alias", "readonly").store;
      const range = IDBKeyRange.only(id);
      const result = await objectStore.openCursor(range);
      return result ? result.value.aliasOf : result;
    },
    /**
     * Get a reference or alias out of the database.
     *
     * @param {AllowedType} type The type as per ALLOWED_TYPES.
     * @param {string} id The id for what to look up.
     * @return {Promise<BiblioData?>} Resolves with the retrieved object, or null.
     */
    async get(type, id) {
      if (!ALLOWED_TYPES.has(type)) {
        throw new TypeError(`Invalid type: ${type}`);
      }
      if (!id) {
        throw new TypeError("id is required");
      }
      const db = await this.ready;
      const objectStore = db.transaction(type, "readonly").store;
      const range = IDBKeyRange.only(id);
      const result = await objectStore.openCursor(range);
      return result ? result.value : result;
    },
    /**
     * Adds references and aliases to database. This is usually the data from
     * Specref's output (parsed JSON).
     *
     * @param {BibliographyMap} data An object that contains references and aliases.
     * @param {number} expires The date/time when the data expires.
     */
    async addAll(data, expires) {
      if (!data) {
        return;
      }
      const aliasesAndRefs = { alias: [], reference: [] };
      for (const id of Object.keys(data)) {
        /** @type {BiblioData} */
        const obj = { id, ...data[id], expires };
        if (obj.aliasOf) {
          aliasesAndRefs.alias.push(obj);
        } else {
          aliasesAndRefs.reference.push(obj);
        }
      }
      const promisesToAdd = [...ALLOWED_TYPES].flatMap(type => {
        return aliasesAndRefs[type].map(details => this.add(type, details));
      });
      await Promise.all(promisesToAdd);
    },
    /**
     * Adds a reference or alias to the database.
     *
     * @param {AllowedType} type The type as per ALLOWED_TYPES.
     * @param {BiblioData} details The object to store.
     */
    async add(type, details) {
      if (!ALLOWED_TYPES.has(type)) {
        throw new TypeError(`Invalid type: ${type}`);
      }
      if (typeof details !== "object") {
        throw new TypeError("details should be an object");
      }
      if (type === "alias" && !details.hasOwnProperty("aliasOf")) {
        throw new TypeError("Invalid alias object.");
      }
      const db = await this.ready;
      let isInDB = await this.has(type, details.id);
      // update or add, depending of already having it in db
      // or if it's expired
      if (isInDB) {
        const entry = await this.get(type, details.id);
        if (entry?.expires < Date.now()) {
          const { store } = db.transaction(type, "readwrite");
          await store.delete(details.id);
          isInDB = false;
        }
      }
      const { store } = db.transaction(type, "readwrite");
      return isInDB ? await store.put(details) : await store.add(details);
    },
    /**
     * Closes the underlying database.
     *
     * @return {Promise<void>} Resolves after database closes.
     */
    async close() {
      const db = await this.ready;
      db.close();
    },

    /**
     * Clears the underlying database
     */
    async clear() {
      const db = await this.ready;
      const storeNames = [...ALLOWED_TYPES];
      const stores = db.transaction(storeNames, "readwrite");
      const clearStorePromises = storeNames.map(name => {
        return stores.objectStore(name).clear();
      });
      await Promise.all(clearStorePromises);
    },
  };

  // @ts-check

  /** @type {Conf['biblio']} */
  const biblio$1 = {};

  const name$N = "core/biblio";

  const bibrefsURL = new URL("https://api.specref.org/bibrefs?refs=");

  // Opportunistically dns-prefetch to bibref server, as we don't know yet
  // if we will actually need to download references yet.
  const link$1 = createResourceHint({
    hint: "dns-prefetch",
    href: bibrefsURL.origin,
  });
  document.head.appendChild(link$1);
  let doneResolver;

  /** @type {Promise<Conf['biblio']>} */
  const done = new Promise(resolve => {
    doneResolver = resolve;
  });

  async function updateFromNetwork(
    refs,
    options = { forceUpdate: false }
  ) {
    const refsToFetch = [...new Set(refs)].filter(ref => ref.trim());
    // Update database if needed, if we are online
    if (!refsToFetch.length || navigator.onLine === false) {
      return null;
    }
    let response;
    try {
      response = await fetch(bibrefsURL.href + refsToFetch.join(","));
    } catch (err) {
      console.error(err);
      return null;
    }
    if ((!options.forceUpdate && !response.ok) || response.status !== 200) {
      return null;
    }
    /** @type {Conf['biblio']} */
    const data = await response.json();
    // SpecRef updates every hour, so we should follow suit
    // https://github.com/tobie/specref#hourly-auto-updating
    const oneHourFromNow = Date.now() + 1000 * 60 * 60 * 1;
    try {
      const expires = response.headers.has("Expires")
        ? Math.min(Date.parse(response.headers.get("Expires")), oneHourFromNow)
        : oneHourFromNow;
      await biblioDB.addAll(data, expires);
    } catch (err) {
      console.error(err);
    }
    return data;
  }

  /**
   * @param {string} key
   * @returns {Promise<BiblioData>}
   */
  async function resolveRef(key) {
    const biblio = await done;
    if (!biblio.hasOwnProperty(key)) {
      return null;
    }
    const entry = biblio[key];
    if (entry.aliasOf) {
      return await resolveRef(entry.aliasOf);
    }
    return entry;
  }

  /**
   * @param {string[]} neededRefs
   */
  async function getReferencesFromIdb(neededRefs) {
    const idbRefs = [];
    // See if we have them in IDB
    try {
      await biblioDB.ready; // can throw
      const promisesToFind = neededRefs.map(async id => ({
        id,
        data: await biblioDB.find(id),
      }));
      idbRefs.push(...(await Promise.all(promisesToFind)));
    } catch (err) {
      // IndexedDB died, so we need to go to the network for all
      // references
      idbRefs.push(...neededRefs.map(id => ({ id, data: null })));
      console.warn(err);
    }

    return idbRefs;
  }

  class Plugin {
    /** @param {Conf} conf */
    constructor(conf) {
      this.conf = conf;
    }

    /**
     * Normative references take precedence over informative ones,
     * so any duplicates ones are removed from the informative set.
     */
    normalizeReferences() {
      const normalizedNormativeRefs = new Set(
        [...this.conf.normativeReferences].map(key => key.toLowerCase())
      );
      Array.from(this.conf.informativeReferences)
        .filter(key => normalizedNormativeRefs.has(key.toLowerCase()))
        .forEach(redundantKey =>
          this.conf.informativeReferences.delete(redundantKey)
        );
    }

    getRefKeys() {
      return {
        informativeReferences: Array.from(this.conf.informativeReferences),
        normativeReferences: Array.from(this.conf.normativeReferences),
      };
    }

    async run() {
      const finish = () => {
        doneResolver(this.conf.biblio);
      };
      if (!this.conf.localBiblio) {
        this.conf.localBiblio = {};
      }
      this.conf.biblio = biblio$1;
      const localAliases = Object.keys(this.conf.localBiblio)
        .filter(key => this.conf.localBiblio[key].hasOwnProperty("aliasOf"))
        .map(key => this.conf.localBiblio[key].aliasOf)
        .filter(key => !this.conf.localBiblio.hasOwnProperty(key));
      this.normalizeReferences();
      const allRefs = this.getRefKeys();
      const neededRefs = Array.from(
        new Set(
          allRefs.normativeReferences
            .concat(allRefs.informativeReferences)
            // Filter, as to not go to network for local refs
            .filter(key => !this.conf.localBiblio.hasOwnProperty(key))
            // but include local aliases which refer to external specs
            .concat(localAliases)
            .sort()
        )
      );

      const idbRefs = neededRefs.length
        ? await getReferencesFromIdb(neededRefs)
        : [];
      const split = { hasData: [], noData: [] };
      idbRefs.forEach(ref => {
        (ref.data ? split.hasData : split.noData).push(ref);
      });
      split.hasData.forEach(ref => {
        biblio$1[ref.id] = ref.data;
      });
      const externalRefs = split.noData.map(item => item.id);
      if (externalRefs.length) {
        // Going to the network for refs we don't have
        const data = await updateFromNetwork(externalRefs, { forceUpdate: true });
        Object.assign(biblio$1, data);
      }
      Object.assign(biblio$1, this.conf.localBiblio);
      finish();
    }
  }

  var biblio$2 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    biblio: biblio$1,
    name: name$N,
    updateFromNetwork: updateFromNetwork,
    resolveRef: resolveRef,
    Plugin: Plugin
  });

  // @ts-check

  const name$M = "core/render-biblio";

  const localizationStrings$o = {
    en: {
      info_references: "Informative references",
      norm_references: "Normative references",
      references: "References",
    },
    ko: {
      references: "참조",
    },
    nl: {
      info_references: "Informatieve referenties",
      norm_references: "Normatieve referenties",
      references: "Referenties",
    },
    es: {
      info_references: "Referencias informativas",
      norm_references: "Referencias normativas",
      references: "Referencias",
    },
    ja: {
      info_references: "参照用参考文献",
      norm_references: "規範的参考文献",
      references: "参考文献",
    },
    de: {
      info_references: "Weiterführende Informationen",
      norm_references: "Normen und Spezifikationen",
      references: "Referenzen",
    },
    zh: {
      info_references: "非规范性引用",
      norm_references: "规范性引用",
      references: "参考文献",
    },
  };

  const l10n$n = getIntlData(localizationStrings$o);

  const REF_STATUSES = new Map([
    ["CR", "W3C Candidate Recommendation"],
    ["ED", "W3C Editor's Draft"],
    ["FPWD", "W3C First Public Working Draft"],
    ["LCWD", "W3C Last Call Working Draft"],
    ["NOTE", "W3C Note"],
    ["PER", "W3C Proposed Edited Recommendation"],
    ["PR", "W3C Proposed Recommendation"],
    ["REC", "W3C Recommendation"],
    ["WD", "W3C Working Draft"],
    ["WG-NOTE", "W3C Working Group Note"],
  ]);

  const endWithDot = endNormalizer(".");

  /** @param {Conf} conf */
  function run$K(conf) {
    const informs = Array.from(conf.informativeReferences);
    const norms = Array.from(conf.normativeReferences);

    if (!informs.length && !norms.length) return;

    /** @type {HTMLElement} */
    const refSection =
      document.querySelector("section#references") ||
      html`<section id="references"></section>`;

    if (!document.querySelector("section#references > h2")) {
      refSection.prepend(html`<h2>${l10n$n.references}</h2>`);
    }

    refSection.classList.add("appendix");

    if (norms.length) {
      const sec = createReferencesSection(norms, l10n$n.norm_references);
      refSection.appendChild(sec);
    }
    if (informs.length) {
      const sec = createReferencesSection(informs, l10n$n.info_references);
      refSection.appendChild(sec);
    }

    document.body.appendChild(refSection);
  }

  /**
   * @param {string[]} refs
   * @param {string} title
   * @returns {HTMLElement}
   */
  function createReferencesSection(refs, title) {
    const { goodRefs, badRefs } = groupRefs(refs.map(toRefContent));
    const uniqueRefs = getUniqueRefs(goodRefs);

    const refsToShow = uniqueRefs
      .concat(badRefs)
      .sort((a, b) =>
        a.ref.toLocaleLowerCase().localeCompare(b.ref.toLocaleLowerCase())
      );

    const sec = html`<section>
    <h3>${title}</h3>
    <dl class="bibliography">${refsToShow.map(showRef)}</dl>
  </section>`;
    addId(sec, "", title);

    const aliases = getAliases(goodRefs);
    decorateInlineReference(uniqueRefs, aliases);
    warnBadRefs(badRefs);

    return sec;
  }

  /**
   * returns refcontent and unique key for a reference among its aliases
   * and warns about circular references
   * @param {String} ref
   * @typedef {ReturnType<typeof toRefContent>} Ref
   */
  function toRefContent(ref) {
    let refcontent = biblio$1[ref];
    let key = ref;
    const circular = new Set([key]);
    while (refcontent && refcontent.aliasOf) {
      if (circular.has(refcontent.aliasOf)) {
        refcontent = null;
        const msg = `Circular reference in biblio DB between [\`${ref}\`] and [\`${key}\`].`;
        showError(msg, name$M);
      } else {
        key = refcontent.aliasOf;
        refcontent = biblio$1[key];
        circular.add(key);
      }
    }
    if (refcontent && !refcontent.id) {
      refcontent.id = ref.toLowerCase();
    }
    return { ref, refcontent };
  }

  /** @param {Ref[]} refs */
  function groupRefs(refs) {
    const goodRefs = [];
    const badRefs = [];
    for (const ref of refs) {
      if (ref.refcontent) {
        goodRefs.push(ref);
      } else {
        badRefs.push(ref);
      }
    }
    return { goodRefs, badRefs };
  }

  /** @param {Ref[]} refs */
  function getUniqueRefs(refs) {
    /** @type {Map<string, Ref>} */
    const uniqueRefs = new Map();
    for (const ref of refs) {
      if (!uniqueRefs.has(ref.refcontent.id)) {
        // the condition ensures that only the first used [[TERM]]
        // shows up in #references section
        uniqueRefs.set(ref.refcontent.id, ref);
      }
    }
    return [...uniqueRefs.values()];
  }

  /**
   * Render an inline citation
   *
   * @param {String} ref the inline reference.
   * @param {String} [linkText] custom link text
   * @returns HTMLElement
   */
  function renderInlineCitation(ref, linkText) {
    const key = ref.replace(/^(!|\?)/, "");
    const href = `#bib-${key.toLowerCase()}`;
    const text = linkText || key;
    const elem = html`<cite
    ><a class="bibref" href="${href}" data-link-type="biblio">${text}</a></cite
  >`;
    return linkText ? elem : html`[${elem}]`;
  }

  /**
   * renders a reference
   * @param {Ref} ref
   */
  function showRef({ ref, refcontent }) {
    const refId = `bib-${ref.toLowerCase()}`;
    if (refcontent) {
      return html`
      <dt id="${refId}">[${ref}]</dt>
      <dd>${{ html: stringifyReference(refcontent) }}</dd>
    `;
    } else {
      return html`
      <dt id="${refId}">[${ref}]</dt>
      <dd><em class="respec-offending-element">Reference not found.</em></dd>
    `;
    }
  }

  function endNormalizer(endStr) {
    return str => {
      const trimmed = str.trim();
      const result =
        !trimmed || trimmed.endsWith(endStr) ? trimmed : trimmed + endStr;
      return result;
    };
  }

  /** @param {BiblioData|string} ref */
  function stringifyReference(ref) {
    if (typeof ref === "string") return ref;
    let output = `<cite>${ref.title}</cite>`;

    output = ref.href ? `<a href="${ref.href}">${output}</a>. ` : `${output}. `;

    if (ref.authors && ref.authors.length) {
      output += ref.authors.join("; ");
      if (ref.etAl) output += " et al";
      output += ". ";
    }
    if (ref.publisher) {
      output = `${output} ${endWithDot(ref.publisher)} `;
    }
    if (ref.date) output += `${ref.date}. `;
    if (ref.status) output += `${REF_STATUSES.get(ref.status) || ref.status}. `;
    if (ref.href) output += `URL: <a href="${ref.href}">${ref.href}</a>`;
    return output;
  }

  /**
   * get aliases for a reference "key"
   */
  function getAliases(refs) {
    return refs.reduce((aliases, ref) => {
      const key = ref.refcontent.id;
      const keys = !aliases.has(key)
        ? aliases.set(key, []).get(key)
        : aliases.get(key);
      keys.push(ref.ref);
      return aliases;
    }, new Map());
  }

  /**
   * fix biblio reference URLs
   * Add title attribute to references
   */
  function decorateInlineReference(refs, aliases) {
    refs
      .map(({ ref, refcontent }) => {
        const refUrl = `#bib-${ref.toLowerCase()}`;
        const selectors = aliases
          .get(refcontent.id)
          .map(alias => `a.bibref[href="#bib-${alias.toLowerCase()}"]`)
          .join(",");
        const elems = document.querySelectorAll(selectors);
        return { refUrl, elems, refcontent };
      })
      .forEach(({ refUrl, elems, refcontent }) => {
        elems.forEach(a => {
          a.setAttribute("href", refUrl);
          a.setAttribute("title", refcontent.title);
          a.dataset.linkType = "biblio";
        });
      });
  }

  /**
   * warn about bad references
   */
  function warnBadRefs(badRefs) {
    badRefs.forEach(({ ref }) => {
      const badrefs = [
        ...document.querySelectorAll(
          `a.bibref[href="#bib-${ref.toLowerCase()}"]`
        ),
      ].filter(({ textContent: t }) => t.toLowerCase() === ref.toLowerCase());
      const msg = `Bad reference: [\`${ref}\`] (appears ${badrefs.length} times)`;
      showError(msg, name$M);
      console.warn("Bad references: ", badrefs);
    });
  }

  var renderBiblio = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$M,
    run: run$K,
    renderInlineCitation: renderInlineCitation
  });

  // @ts-check

  const name$L = "core/inlines";
  const rfc2119Usage = {};

  /** @param {RegExp[]} regexes */
  const joinRegex = regexes => new RegExp(regexes.map(re => re.source).join("|"));

  const localizationStrings$n = {
    en: {
      rfc2119Keywords() {
        return joinRegex([
          /\bMUST(?:\s+NOT)?\b/,
          /\bSHOULD(?:\s+NOT)?\b/,
          /\bSHALL(?:\s+NOT)?\b/,
          /\bMAY?\b/,
          /\b(?:NOT\s+)?REQUIRED\b/,
          /\b(?:NOT\s+)?RECOMMENDED\b/,
          /\bOPTIONAL\b/,
        ]);
      },
    },
    de: {
      rfc2119Keywords() {
        return joinRegex([
          /\bMUSS\b/,
          /\bERFORDERLICH\b/,
          /\b(?:NICHT\s+)?NÖTIG\b/,
          /\bDARF(?:\s+NICHT)?\b/,
          /\bVERBOTEN\b/,
          /\bSOLL(?:\s+NICHT)?\b/,
          /\b(?:NICHT\s+)?EMPFOHLEN\b/,
          /\bKANN\b/,
          /\bOPTIONAL\b/,
        ]);
      },
    },
  };
  const l10n$m = getIntlData(localizationStrings$n);

  // Inline `code`
  // TODO: Replace (?!`) at the end with (?:<!`) at the start when Firefox + Safari
  // add support.
  const inlineCodeRegExp = /(?:`[^`]+`)(?!`)/; // `code`
  const inlineIdlReference = /(?:{{[^}]+\?*}})/; // {{ WebIDLThing }}, {{ WebIDLThing? }}
  const inlineVariable = /\B\|\w[\w\s]*(?:\s*:[\w\s&;<>]+\??)?\|\B/; // |var : Type?|
  const inlineCitation = /(?:\[\[(?:!|\\|\?)?[\w.-]+(?:|[^\]]+)?\]\])/; // [[citation]]
  const inlineExpansion = /(?:\[\[\[(?:!|\\|\?)?#?[\w-.]+\]\]\])/; // [[[expand]]]
  const inlineAnchor = /(?:\[=[^=]+=\])/; // Inline [= For/link =]
  const inlineElement = /(?:\[\^[^^]+\^\])/; // Inline [^element^]

  /**
   * @example [^iframe^] // [^element^]
   * @example [^iframe/allow^] // [^element/element-attr^]
   * @param {string} matched
   * @return {HTMLElement}
   */
  function inlineElementMatches(matched) {
    const value = matched.slice(2, -2).trim();
    const [forPart, attribute, attrValue] = value
      .split("/", 3)
      .map(s => s && s.trim())
      .filter(s => !!s);

    const [xrefType, xrefFor, textContent] = (() => {
      // [^ /role ^], for example
      const isGlobalAttr = value.startsWith("/");
      if (isGlobalAttr) {
        return ["element-attr", null, forPart];
      } else if (attrValue) {
        return ["attr-value", `${forPart}/${attribute}`, attrValue];
      } else if (attribute) {
        return ["element-attr", forPart, attribute];
      } else {
        return ["element", null, forPart];
      }
    })();
    return html`<code
    ><a data-xref-type="${xrefType}" data-xref-for="${xrefFor}"
      >${textContent}</a
    ></code
  >`;
  }

  /**
   * @param {string} matched
   * @return {HTMLElement}
   */
  function inlineRFC2119Matches(matched) {
    const value = norm(matched);
    const nodeElement = html`<em class="rfc2119">${value}</em>`;
    // remember which ones were used
    rfc2119Usage[value] = true;
    return nodeElement;
  }

  /**
   * @param {string} matched
   * @return {HTMLElement}
   */
  function inlineRefMatches(matched) {
    // slices "[[[" at the beginning and "]]]" at the end
    const ref = matched.slice(3, -3).trim();
    if (!ref.startsWith("#")) {
      return html`<a data-cite="${ref}"></a>`;
    }
    return html`<a href="${ref}"></a>`;
  }

  /**
   * @param {string} matched
   * @param {Text} text
   */
  function inlineXrefMatches(matched, text) {
    // slices "{{" at the beginning and "}}" at the end
    const ref = norm(matched.slice(2, -2));
    if (ref.startsWith("\\")) {
      return matched.replace("\\", "");
    }

    const node = idlStringToHtml(ref);
    // If it's inside a dfn, it should just be coded, not linked.
    // This is because dfn elements are treated as links by ReSpec via role=link.
    const renderAsCode = !!text.parentElement.closest("dfn");
    return renderAsCode ? inlineCodeMatches(`\`${node.textContent}\``) : node;
  }

  /**
   * @param {string} matched
   * @param {Text} txt
   * @param {Object} conf
   * @return {Iterable<string | Node>}
   */
  function inlineBibrefMatches(matched, txt, conf) {
    // slices "[[" at the start and "]]" at the end
    const ref = matched.slice(2, -2);
    if (ref.startsWith("\\")) {
      return [`[[${ref.slice(1)}]]`];
    }

    const [spec, linkText] = ref.split("|").map(norm);
    const { type, illegal } = refTypeFromContext(spec, txt.parentElement);
    const cite = renderInlineCitation(spec, linkText);
    const cleanRef = spec.replace(/^(!|\?)/, "");
    if (illegal && !conf.normativeReferences.has(cleanRef)) {
      const citeElem = cite.childNodes[1] || cite;
      const msg = `Normative references in informative sections are not allowed. `;
      const hint = `Remove '!' from the start of the reference \`[[${ref}]]\``;
      showWarning(msg, name$L, { elements: [citeElem], hint });
    }

    if (type === "informative" && !illegal) {
      conf.informativeReferences.add(cleanRef);
    } else {
      conf.normativeReferences.add(cleanRef);
    }
    return cite.childNodes[1] ? cite.childNodes : [cite];
  }

  /**
   * @param {string} matched
   * @param {Text} txt
   * @param {Map<string, string>} abbrMap
   */
  function inlineAbbrMatches(matched, txt, abbrMap) {
    return txt.parentElement.tagName === "ABBR"
      ? matched
      : html`<abbr title="${abbrMap.get(matched)}">${matched}</abbr>`;
  }

  /**
   * @example |varName: type| => <var data-type="type">varName</var>
   * @example |varName| => <var>varName</var>
   * @param {string} matched
   */
  function inlineVariableMatches(matched) {
    // remove "|" at the beginning and at the end, then split at an optional `:`
    const matches = matched.slice(1, -1).split(":", 2);
    const [varName, type] = matches.map(s => s.trim());
    return html`<var data-type="${type}">${varName}</var>`;
  }

  /**
   * @example [= foo =] => <a>foo</a>
   * @example [= bar/foo =] => <a data-link-for="bar" data-xref-for="bar">foo</a>
   * @example [= `foo` =] => <a><code>foo</code></a>
   * @example [= foo|bar =] => <a data-lt="foo">bar</a>
   * @param {string} matched
   */
  function inlineAnchorMatches(matched) {
    matched = matched.slice(2, -2); // Chop [= =]
    const parts = splitByFor(matched);
    const [isFor, content] = parts.length === 2 ? parts : [null, parts[0]];
    const [linkingText, text] = content.includes("|")
      ? content.split("|", 2).map(s => s.trim())
      : [null, content];
    const processedContent = processInlineContent(text);
    const forContext = isFor ? norm(isFor) : null;
    return html`<a
    data-link-type="dfn"
    data-link-for="${forContext}"
    data-xref-for="${forContext}"
    data-lt="${linkingText}"
    >${processedContent}</a
  >`;
  }

  function inlineCodeMatches(matched) {
    const clean = matched.slice(1, -1); // Chop ` and `
    return html`<code>${clean}</code>`;
  }

  function processInlineContent(text) {
    if (inlineCodeRegExp.test(text)) {
      // We use a capture group to split, so we can process all the parts.
      return text.split(/(`[^`]+`)(?!`)/).map(part => {
        return part.startsWith("`")
          ? inlineCodeMatches(part)
          : processInlineContent(part);
      });
    }
    return document.createTextNode(text);
  }

  function run$J(conf) {
    const abbrMap = new Map();
    document.normalize();
    if (!document.querySelector("section#conformance")) {
      // make the document informative
      document.body.classList.add("informative");
    }
    conf.normativeReferences = new InsensitiveStringSet();
    conf.informativeReferences = new InsensitiveStringSet();

    if (!conf.respecRFC2119) conf.respecRFC2119 = rfc2119Usage;

    // PRE-PROCESSING
    /** @type {NodeListOf<HTMLElement>} */
    const abbrElements = document.querySelectorAll("abbr[title]:not(.exclude)");
    for (const { textContent, title } of abbrElements) {
      const key = norm(textContent);
      const value = norm(title);
      abbrMap.set(key, value);
    }
    const abbrRx = abbrMap.size
      ? new RegExp(`(?:\\b${[...abbrMap.keys()].join("\\b)|(?:\\b")}\\b)`)
      : null;

    // PROCESSING
    // Don't gather text nodes for these:
    const exclusions = ["#respec-ui", ".head", "pre"];
    const txts = getTextNodes(document.body, exclusions, {
      wsNodes: false, // we don't want nodes with just whitespace
    });
    const keywords = l10n$m.rfc2119Keywords();

    const inlinesRegex = new RegExp(
      `(${
      joinRegex([
        keywords,
        inlineIdlReference,
        inlineVariable,
        inlineCitation,
        inlineExpansion,
        inlineAnchor,
        inlineCodeRegExp,
        inlineElement,
        ...(abbrRx ? [abbrRx] : []),
      ]).source
    })`
    );
    for (const txt of txts) {
      const subtxt = txt.data.split(inlinesRegex);
      if (subtxt.length === 1) continue;
      const df = document.createDocumentFragment();
      let matched = true;
      for (const t of subtxt) {
        matched = !matched;
        if (!matched) {
          df.append(t);
          continue;
        }
        switch (true) {
          case t.startsWith("{{"):
            df.append(inlineXrefMatches(t, txt));
            break;
          case t.startsWith("[[["):
            df.append(inlineRefMatches(t));
            break;
          case t.startsWith("[["):
            df.append(...inlineBibrefMatches(t, txt, conf));
            break;
          case t.startsWith("|"):
            df.append(inlineVariableMatches(t));
            break;
          case t.startsWith("[="):
            df.append(inlineAnchorMatches(t));
            break;
          case t.startsWith("`"):
            df.append(inlineCodeMatches(t));
            break;
          case t.startsWith("[^"):
            df.append(inlineElementMatches(t));
            break;
          case abbrMap.has(t):
            df.append(inlineAbbrMatches(t, txt, abbrMap));
            break;
          case keywords.test(t):
            df.append(inlineRFC2119Matches(t));
            break;
        }
      }
      txt.replaceWith(df);
    }
  }

  /**
   * Linking strings are always composed of:
   *
   *   (for-part /)+ linking-text
   *
   * E.g., " ReadableStream / set up / pullAlgorithm ".
   * Where "ReadableStream/set up/" is for-part, and "pullAlgorithm" is
   * the linking-text.
   *
   * The for part is optional, but when present can be two or three levels deep.
   *
   * @param {string} str
   *
   */
  function splitByFor(str) {
    const cleanUp = str => str.replace("%%", "/").split("/").map(norm).join("/");
    const safeStr = str.replace("\\/", "%%");
    const lastSlashIdx = safeStr.lastIndexOf("/");
    if (lastSlashIdx === -1) {
      return [cleanUp(safeStr)];
    }
    const forPart = safeStr.substring(0, lastSlashIdx);
    const linkingText = safeStr.substring(lastSlashIdx + 1, safeStr.length);
    return [cleanUp(forPart), cleanUp(linkingText)];
  }

  var inlines = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$L,
    rfc2119Usage: rfc2119Usage,
    run: run$J
  });

  // @ts-check

  const name$K = "ims/conformance";

  /**
   * core/inlines will count the actual occurances of each term and
   * both w3c/conformance and ims/conformance will only list the terms
   * that are in rfc2119Usage. But the current version of the normative
   * text refers to all the keywords, so this stuffs the list with all
   * the keywords.
   */
  function stuffRfc299Usage() {
    rfc2119Usage.MUST = true;
    rfc2119Usage["MUST NOT"] = true;
    rfc2119Usage.REQUIRED = true;
    rfc2119Usage.SHALL = true;
    rfc2119Usage["SHALL NOT"] = true;
    rfc2119Usage.SHOULD = true;
    rfc2119Usage["SHOULD NOT"] = true;
    rfc2119Usage.RECOMMENDED = true;
    rfc2119Usage.MAY = true;
    rfc2119Usage.OPTIONAL = true;
  }

  /**
   * @param {*} conf
   */
  function getNormativeText(conf) {
    // Make sure all the terms referenced in the text below are included.
    // Remove this step if you only want to list the terms that are actually
    // used in this document.
    stuffRfc299Usage();

    // Build the HTML
    const terms = [...Object.keys(rfc2119Usage)];
    const keywords = htmlJoinAnd(
      terms.sort(),
      item => html`<em class="rfc2119">${item}</em>`
    );
    const plural = terms.length > 1;

    const content = html`<p>
      As well as sections marked as non-normative, all authoring guidelines,
      diagrams, examples, and notes in this specification are non-normative.
      Everything else in this specification is normative.
    </p>
    ${terms.length
      ? html`
          <p>
            The key word${plural ? "s" : ""} ${[keywords]} in this document
            ${plural ? "are" : "is"} to be interpreted as described in
            ${renderInlineCitation("RFC2119")}.
          </p>
        `
      : null}
    <p>
      An implementation of this specification that fails to implement a
      MUST/REQUIRED/SHALL requirement or fails to abide by a MUST NOT/SHALL NOT
      prohibition is considered nonconformant. SHOULD/SHOULD NOT/RECOMMENDED
      statements constitute a best practice. Ignoring a best practice does not
      violate conformance but a decision to disregard such guidance should be
      carefully considered. MAY/OPTIONAL statements indicate that implementers
      are entirely free to choose whether or not to implement the option.
    </p>`;

    if (conf.skipCertGuideConformanceRef || conf.specType == "cert") {
      return content;
    }

    return html`${content}
    <p>
      The <a href="#document-set">Conformance and Certification Guide</a>
      for this specification may introduce greater normative constraints than
      those defined here for specific service or implementation categories.
    </p>`;
  }

  /**
   * @param {*} conf
   */
  function getInformativeText(conf) {
    if (!conf.mainSpecTitle) {
      showWarning("warn", "No mainSpecTitle property found in config')");
    }

    if (!conf.mainSpecBiblioKey) {
      showWarning("warn", "No mainSpecBiblioKey property found in config')");
    }

    return html` <p>
    This document is an informative resource in the Document Set of the
    ${conf.mainSpecTitle ? conf.mainSpecTitle : ""} specification
    ${conf.mainSpecBiblioKey
      ? renderInlineCitation(conf.mainSpecBiblioKey)
      : ""}.
    As such, it does not include any normative requirements. Occurrences in this
    document of terms such as MAY, MUST, MUST NOT, SHOULD or RECOMMENDED have no
    impact on the conformance criteria for implementors of this specification.
  </p>`;
  }

  /**
   * @param {Element} conformance
   * @param {*} conf
   */
  function processConformance(conformance, conf) {
    // Add RFC2119 to the bibliography
    conf.normativeReferences.add("RFC2119");

    // Get the appropriate text
    let content;

    if (conf.specNature === "normative") {
      content = getNormativeText(conf);
    } else if (conf.specNature === "informative") {
      content = getInformativeText(conf);
    }

    if (conformance.tagName === "SECTION") {
      conformance.prepend(...content.childNodes);
    } else {
      conformance.parentNode.append(...content.childNodes);
    }
  }

  /**
   * @param {*} conf
   */
  function run$I(conf) {
    // No conformance section in IMS Errata documents
    if (conf.specType === "errata") {
      return;
    }

    // It is an IMS error if there is no conformance section found
    let conformance = document.querySelector("section#conformance");
    if (!conformance)
      conformance = document.querySelector("section#conformance-0");
    if (!conformance) {
      showError("error", "No section found with id 'conformance'");
      return;
    }

    // Use IMS specNature to determine conformance text
    if (!conf.specNature) {
      showError("error", "Document must have config.specNature set");
    }

    // IMS standard is to have a Conformance heading
    if (conformance.tagName === "SECTION") {
      const conformanceHeading = conformance.querySelector(
        "h1, h2, h3, h4, h5, h6"
      );
      if (!conformanceHeading) {
        showWarning("warn", "No heading found in the conformance section");
      } else {
        // Insert conformation text after heading
        conformance = conformanceHeading;
      }
    }

    // Insert the conformance text
    processConformance(conformance, conf);
  }

  var conformance = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$K,
    run: run$I
  });

  /**
   * Validates MIME types strings.
   *
   * @type {DefinitionValidator} */
  function validateMimeType(text, type, elem, pluginName) {
    try {
      // Constructor can throw.
      const type = new MIMEType(text);
      if (type.toString() !== text) {
        throw new Error(`Input doesn't match its canonical form: "${type}".`);
      }
    } catch (error) {
      const msg = `Invalid ${type} "${text}": ${error.message}.`;
      const hint =
        "Check that the MIME type has both a type and a sub-type, and that it's in a canonical form (e.g., `text/plain`).";
      showError(msg, pluginName, { hint, elements: [elem] });
      return false;
    }
    return true;
  }

  /**
   * Validates the names of DOM attribute and elements.
   * @param {"attribute" | "element"} type
   * @type {DefinitionValidator} */
  function validateDOMName(text, type, elem, pluginName) {
    try {
      switch (type) {
        case "attribute":
          document.createAttribute(text);
          return true;
        case "element":
          document.createElement(text);
          return true;
      }
    } catch (err) {
      const msg = `Invalid ${type} name "${text}": ${err.message}`;
      const hint = `Check that the ${type} name is allowed per the XML's Name production for ${type}.`;
      showError(msg, pluginName, { hint, elements: [elem] });
    }
    return false;
  }

  /**
   * Validates common variable or other named thing in a spec, like event names.
   *
   * @type {DefinitionValidator}
   */
  function validateCommonName(text, type, elem, pluginName) {
    // Check a-z, maybe a dash and letters, case insensitive.
    // Also, no spaces.
    if (/^[a-z]+(-[a-z]+)*$/i.test(text)) {
      return true; // all good
    }
    const msg = `Invalid ${type} name "${text}".`;
    const hint = `Check that the ${type} name is allowed per the naming rules for this type.`;
    showError(msg, pluginName, { hint, elements: [elem] });
    return false;
  }

  /**
   * @type {DefinitionValidator} */
  function validateQuotedString(text, type, elem, pluginName) {
    if (text.startsWith(`"`) && text.endsWith(`"`)) {
      return validateCommonName(text.slice(1, -1), type, elem, pluginName);
    }
    const msg = `Invalid ${type} "${text}".`;
    const hint = `Check that the ${type} is quoted with double quotes.`;
    showError(msg, pluginName, { hint, elements: [elem] });
    return false;
  }

  // @ts-check

  /** @type {CaseInsensitiveMap<Set<HTMLElement>>} */
  const definitionMap = new CaseInsensitiveMap();

  /**
   * @param {HTMLElement} dfn A definition element to register
   * @param {string[]} names Names to register the element by
   */
  function registerDefinition(dfn, names) {
    for (const name of names) {
      if (!definitionMap.has(name)) {
        definitionMap.set(name, new Set());
      }
      definitionMap.get(name).add(dfn);
    }
  }

  // @ts-check

  const name$J = "core/dfn";

  /** @type {Map<string, { requiresFor: boolean, validator?: DefinitionValidator, associateWith?: string}>}  */
  const knownTypesMap = new Map([
    ["abstract-op", { requiresFor: false }],
    ["attribute", { requiresFor: false, validator: validateDOMName }],
    [
      "attr-value",
      {
        requiresFor: true,
        associateWith: "an HTML attribute",
        validator: validateCommonName,
      },
    ],
    ["element", { requiresFor: false, validator: validateDOMName }],
    [
      "element-state",
      {
        requiresFor: true,
        associateWith: "an HTML attribute",
        validator: validateCommonName,
      },
    ],
    ["event", { requiresFor: false, validator: validateCommonName }],
    ["http-header", { requiresFor: false }],
    ["media-type", { requiresFor: false, validator: validateMimeType }],
    ["scheme", { requiresFor: false, validator: validateCommonName }],
    ["permission", { requiresFor: false, validator: validateQuotedString }],
  ]);

  const knownTypes = [...knownTypesMap.keys()];

  function run$H() {
    for (const dfn of document.querySelectorAll("dfn")) {
      const titles = getDfnTitles(dfn);
      registerDefinition(dfn, titles);

      // It's a legacy cite or redefining a something it doesn't own, so it gets no benefit.
      if (dfn.dataset.cite && /\b#\b/.test(dfn.dataset.cite)) {
        continue;
      }

      const [linkingText] = titles;
      computeType(dfn, linkingText);
      computeExport(dfn);

      // Only add `lt`s that are different from the text content
      if (titles.length === 1 && linkingText === norm(dfn.textContent)) {
        continue;
      }
      dfn.dataset.lt = titles.join("|");
    }
    sub("plugins-done", addContractDefaults);
  }

  /**
   * @param {HTMLElement} dfn
   * @param {string} linkingText
   * */
  function computeType(dfn, linkingText) {
    let type = "";

    switch (true) {
      // class defined type (e.g., "<dfn class="element">)
      case knownTypes.some(name => dfn.classList.contains(name)):
        // First one wins
        type = [...dfn.classList].find(className => knownTypesMap.has(className));
        validateDefinition(linkingText, type, dfn);
        break;

      // Internal slots: attributes+ methods (e.g., [[some words]](with, optional, arguments))
      case slotRegex.test(linkingText):
        type = processAsInternalSlot(linkingText, dfn);
        break;
    }

    // Derive closest type
    if (!type && !dfn.matches("[data-dfn-type]")) {
      /** @type {HTMLElement} */
      const closestType = dfn.closest("[data-dfn-type]");
      type = closestType?.dataset.dfnType;
    }
    // only if we have type and one wasn't explicitly given.
    if (type && !dfn.dataset.dfnType) {
      dfn.dataset.dfnType = type;
    }
    // Finally, addContractDefaults() will add the type to the dfn if it's not there.
    // But other modules may end up adding a type (e.g., the WebIDL module)
  }

  // Deal with export/no export
  function computeExport(dfn) {
    switch (true) {
      // Error if we have both exports and no exports.
      case dfn.matches(".export.no-export"): {
        const msg = docLink`Declares both "${"[no-export]"}" and "${"[export]"}" CSS class.`;
        const hint = "Please use only one.";
        showError(msg, name$J, { elements: [dfn], hint });
        break;
      }

      // No export wins
      case dfn.matches(".no-export, [data-noexport]"):
        if (dfn.matches("[data-export]")) {
          const msg = docLink`Declares ${"[no-export]"} CSS class, but also has a "${"[data-export]"}" attribute.`;
          const hint = "Please chose only one.";
          showError(msg, name$J, { elements: [dfn], hint });
          delete dfn.dataset.export;
        }
        dfn.dataset.noexport = "";
        break;

      // If the author explicitly asked for it to be exported, so let's export it.
      case dfn.matches(":is(.export):not([data-noexport], .no-export)"):
        dfn.dataset.export = "";
        break;
    }
  }

  /**
   * @param {string} text
   * @param {string} type
   * @param {HTMLElement} dfn
   */
  function validateDefinition(text, type, dfn) {
    const entry = knownTypesMap.get(type);
    if (entry.requiresFor && !dfn.dataset.dfnFor) {
      const msg = docLink`Definition of type "\`${type}\`" requires a ${"[data-dfn-for]"} attribute.`;
      const { associateWith } = entry;
      const hint = docLink`Use a ${"[data-dfn-for]"} attribute to associate this with ${associateWith}.`;
      showError(msg, name$J, { hint, elements: [dfn] });
    }

    if (entry.validator) {
      entry.validator(text, type, dfn, name$J);
    }
  }

  /**
   *
   * @param {string} title
   * @param {HTMLElement} dfn
   */
  function processAsInternalSlot(title, dfn) {
    if (!dfn.dataset.hasOwnProperty("idl")) {
      dfn.dataset.idl = "";
    }

    // Automatically use the closest data-dfn-for as the parent.
    /** @type HTMLElement */
    const parent = dfn.closest("[data-dfn-for]");
    if (dfn !== parent && parent?.dataset.dfnFor) {
      dfn.dataset.dfnFor = parent.dataset.dfnFor;
    }

    // Assure that it's data-dfn-for= something.
    if (!dfn.dataset.dfnFor) {
      const msg = `Internal slot "${title}" must be associated with a WebIDL interface.`;
      const hint = docLink`Use a ${"[data-dfn-for]"} attribute to associate this dfn with a WebIDL interface.`;
      showError(msg, name$J, { hint, elements: [dfn] });
    }

    // Don't export internal slots by default, as they are not supposed to be public.
    if (!dfn.matches(".export, [data-export]")) {
      dfn.dataset.noexport = "";
    }

    // If it ends with a ), then it's method. Attribute otherwise.
    const derivedType = title.endsWith(")") ? "method" : "attribute";
    if (!dfn.dataset.dfnType) {
      return derivedType;
    }

    // Perform validation on the dfn's type.
    const allowedSlotTypes = ["attribute", "method"];
    const { dfnType } = dfn.dataset;
    if (!allowedSlotTypes.includes(dfnType) || derivedType !== dfnType) {
      const msg = docLink`Invalid ${"[data-dfn-type]"} attribute on internal slot.`;
      const prettyTypes = codedJoinOr(allowedSlotTypes, {
        quotes: true,
      });
      const hint = `The only allowed types are: ${prettyTypes}. The slot "${title}" seems to be a "${toMDCode(
      derivedType
    )}"?`;
      showError(msg, name$J, { hint, elements: [dfn] });
      return "dfn";
    }
    return dfnType;
  }

  function addContractDefaults() {
    // Find all dfns that don't have a type and default them to "dfn".
    /** @type NodeListOf<HTMLElement> */
    const dfnsWithNoType = document.querySelectorAll(
      "dfn:is([data-dfn-type=''],:not([data-dfn-type]))"
    );
    for (const dfn of dfnsWithNoType) {
      dfn.dataset.dfnType = "dfn";
    }

    // Per "the contract", export all definitions, except where:
    //  - Explicitly marked with data-noexport.
    //  - The type is "dfn" and not explicitly marked for export (i.e., just a regular definition).
    //  - definitions was included via (legacy) data-cite="foo#bar".
    /** @type NodeListOf<HTMLElement> */
    const exportableDfns = document.querySelectorAll(
      "dfn:not([data-noexport], [data-export], [data-dfn-type='dfn'], [data-cite])"
    );
    for (const dfn of exportableDfns) {
      dfn.dataset.export = "";
    }
  }

  var dfn = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$J,
    run: run$H
  });

  // @ts-check

  const name$I = "core/pluralize";

  function run$G(conf) {
    if (!conf.pluralize) return;

    const pluralizeDfn = getPluralizer();

    /** @type {NodeListOf<HTMLElement>} */
    const dfns = document.querySelectorAll(
      "dfn:not([data-lt-no-plural]):not([data-lt-noDefault])"
    );
    dfns.forEach(dfn => {
      const terms = [dfn.textContent];
      if (dfn.dataset.lt) terms.push(...dfn.dataset.lt.split("|"));
      if (dfn.dataset.localLt) {
        terms.push(...dfn.dataset.localLt.split("|"));
      }

      const plurals = new Set(terms.map(pluralizeDfn).filter(plural => plural));

      if (plurals.size) {
        const userDefinedPlurals = dfn.dataset.plurals
          ? dfn.dataset.plurals.split("|")
          : [];
        const uniquePlurals = [...new Set([...userDefinedPlurals, ...plurals])];
        dfn.dataset.plurals = uniquePlurals.join("|");
        registerDefinition(dfn, uniquePlurals);
      }
    });
  }

  function getPluralizer() {
    /** @type {Set<string>} */
    const links = new Set();
    /** @type {NodeListOf<HTMLAnchorElement>} */
    const reflessAnchors = document.querySelectorAll("a:not([href])");
    reflessAnchors.forEach(el => {
      const normText = norm(el.textContent).toLowerCase();
      links.add(normText);
      if (el.dataset.lt) {
        links.add(el.dataset.lt);
      }
    });

    /** @type {Set<string>} */
    const dfnTexts = new Set();
    /** @type {NodeListOf<HTMLElement>} */
    const dfns = document.querySelectorAll("dfn:not([data-lt-noDefault])");
    dfns.forEach(dfn => {
      const normText = norm(dfn.textContent).toLowerCase();
      dfnTexts.add(normText);
      if (dfn.dataset.lt) {
        dfn.dataset.lt.split("|").forEach(lt => dfnTexts.add(lt));
      }
      if (dfn.dataset.localLt) {
        dfn.dataset.localLt.split("|").forEach(lt => dfnTexts.add(lt));
      }
    });

    // returns pluralized/singularized term if `text` needs pluralization/singularization, "" otherwise
    return function pluralizeDfn(/** @type {string} */ text) {
      const normText = norm(text).toLowerCase();
      const plural = pluralize$1.isSingular(normText)
        ? pluralize$1.plural(normText)
        : pluralize$1.singular(normText);
      return links.has(plural) && !dfnTexts.has(plural) ? plural : "";
    };
  }

  var pluralize = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$I,
    run: run$G
  });

  /* --- EXAMPLES --- */
  const css$g = String.raw;

  // Prettier ignore only to keep code indented from level 0.
  // prettier-ignore
  var css$h = css$g`
span.example-title {
  text-transform: none;
}

:is(aside,div).example,
div.illegal-example {
  padding: 0.5em;
  margin: 1em 0;
  position: relative;
  clear: both;
}

div.illegal-example {
  color: red;
}

div.illegal-example p {
  color: black;
}

:is(aside,div).example {
  border-left-width: 0.5em;
  border-left-style: solid;
  border-color: #e0cb52;
  background: #fcfaee;
}

aside.example div.example {
  border-left-width: 0.1em;
  border-color: #999;
  background: #fff;
}


.example pre {
  background-color: rgba(0, 0, 0, 0.03);
}
`;

  // @ts-check

  const name$H = "core/examples";

  const localizationStrings$m = {
    en: {
      example: "Example",
    },
    nl: {
      example: "Voorbeeld",
    },
    es: {
      example: "Ejemplo",
    },
    ko: {
      example: "예시",
    },
    ja: {
      example: "例",
    },
    de: {
      example: "Beispiel",
    },
    zh: {
      example: "例",
    },
  };

  const l10n$l = getIntlData(localizationStrings$m);

  /**
   * @typedef {object} Report
   * @property {number} number
   * @property {boolean} illegal
   * @property {string} [title]
   * @property {string} [content]
   *
   * @param {HTMLElement} elem
   * @param {number} num
   * @param {Report} report
   */
  function makeTitle(elem, num, report) {
    report.title = elem.title;
    if (report.title) elem.removeAttribute("title");
    const number = num > 0 ? ` ${num}` : "";
    const title = report.title
      ? html`<span class="example-title">: ${report.title}</span>`
      : "";
    return html`<div class="marker">
    <a class="self-link">${l10n$l.example}<bdi>${number}</bdi></a
    >${title}
  </div>`;
  }

  function run$F() {
    /** @type {NodeListOf<HTMLElement>} */
    const examples = document.querySelectorAll(
      "pre.example, pre.illegal-example, aside.example"
    );
    if (!examples.length) return;

    document.head.insertBefore(
      html`<style>
      ${css$h}
    </style>`,
      document.querySelector("link")
    );

    let number = 0;
    examples.forEach(example => {
      const illegal = example.classList.contains("illegal-example");
      /** @type {Report} */
      const report = {
        number,
        illegal,
      };
      const { title } = example;
      if (example.localName === "aside") {
        ++number;
        const div = makeTitle(example, number, report);
        example.prepend(div);
        const id = addId(example, "example", title || String(number));
        const selfLink = div.querySelector("a.self-link");
        selfLink.href = `#${id}`;
        pub("example", report);
      } else {
        const inAside = !!example.closest("aside");
        if (!inAside) ++number;

        report.content = example.innerHTML;

        // wrap
        example.classList.remove("example", "illegal-example");
        // relocate the id to the div
        const id = example.id ? example.id : null;
        if (id) example.removeAttribute("id");
        const exampleTitle = makeTitle(example, inAside ? 0 : number, report);
        const div = html`<div class="example" id="${id}">
        ${exampleTitle} ${example.cloneNode(true)}
      </div>`;
        addId(div, "example", title || String(number));
        const selfLink = div.querySelector("a.self-link");
        selfLink.href = `#${div.id}`;
        example.replaceWith(div);
        if (!inAside) pub("example", report);
      }
    });
  }

  var examples = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$H,
    run: run$F
  });

  // @ts-check

  const name$G = "ims/issues-notes";

  /**
   * Handles admonitions, adding a top bar and a11y attrs
   * Types currently supported:
   * aside.note
   * aside.ednote
   * aside.warning
   * aside.issue (will yield error if status is final, warning if CF)
   *
   * Alternate syntax is div.aside.note|warning|issue
   *
   * This replaces core/issues-notes.js, which has github features we can't utilize
   * because of our non-open repos.
   *
   * @param {*} conf respecConfig
   */
  async function run$E(conf) {
    // check and warn for issue admons in late process stages
    const issues = document.body.querySelectorAll("aside.issue, div.aside.issue");
    if (issues.length > 0) {
      if (conf.specStatus == "IMS Final Release") {
        pub(
          "error",
          "Issue asides must not be present when the status is 'IMS Final Release'"
        );
      } else if (conf.specStatus == "IMS Candidate Final") {
        pub(
          "warn",
          "Issue asides should not be present when the status is 'IMS Candidate Final'"
        );
      }
    }

    // prep the output element
    /** @type {NodeListOf<HTMLElement>} */
    const admons = document.body.querySelectorAll(
      "aside.note, aside.ednote, aside.warning, aside.issue, " +
        " div.aside.note, div.aside.ednote div.aside.warning, div.aside.issue"
    );

    admons.forEach(aside => {
      const type = getAdmonType(aside);
      aside.setAttribute("role", "note");
      aside.classList.add("admonition");
      if (!aside.hasAttribute("id")) {
        addId(aside);
      }
      const topBar = toHTMLElement(`<div class='admon-top'>${type}</div>`);
      topBar.classList.add(`${type}-title`);
      aside.insertAdjacentElement("afterbegin", topBar);
    });
  }

  /**
   * Returns the admonition type as a string based on the classList.
   * The three known types are "note", "warning", and "issue". If none
   * of those are present, returns "info".
   *
   * @param { * } aside the element to inspect
   * @returns { string } the admonition type as a string
   */
  function getAdmonType(aside) {
    if (aside.classList.contains("note")) {
      return "note";
    } else if (aside.classList.contains("warning")) {
      return "warning";
    } else if (aside.classList.contains("issue")) {
      return "issue";
    }
    return "info";
  }

  var issuesNotes = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$G,
    run: run$E
  });

  // @ts-check

  const name$F = "core/best-practices";

  const localizationStrings$l = {
    en: {
      best_practice: "Best Practice ",
    },
    ja: {
      best_practice: "最良実施例 ",
    },
    de: {
      best_practice: "Musterbeispiel ",
    },
    zh: {
      best_practice: "最佳实践 ",
    },
  };
  const l10n$k = getIntlData(localizationStrings$l);
  const lang$1 = lang$2 in localizationStrings$l ? lang$2 : "en";

  function run$D() {
    /** @type {NodeListOf<HTMLElement>} */
    const bps = document.querySelectorAll(".practicelab");
    const bpSummary = document.getElementById("bp-summary");
    const summaryItems = bpSummary ? document.createElement("ul") : null;
    [...bps].forEach((bp, num) => {
      const id = addId(bp, "bp");
      const localizedBpName = html`<a class="marker self-link" href="${`#${id}`}"
      ><bdi lang="${lang$1}">${l10n$k.best_practice}${num + 1}</bdi></a
    >`;

      // Make the summary items, if we have a summary
      if (summaryItems) {
        const li = html`<li>${localizedBpName}: ${makeSafeCopy(bp)}</li>`;
        summaryItems.appendChild(li);
      }

      const container = bp.closest("div");
      if (!container) {
        // This is just an inline best practice...
        bp.classList.add("advisement");
        return;
      }

      // Make the advisement box
      container.classList.add("advisement");
      const title = html`${localizedBpName.cloneNode(true)}: ${bp}`;
      container.prepend(...title.childNodes);
    });
    if (bps.length) {
      if (bpSummary) {
        bpSummary.appendChild(html`<h2>Best Practices Summary</h2>`);
        bpSummary.appendChild(summaryItems);
      }
    } else if (bpSummary) {
      const msg = `Using best practices summary (#bp-summary) but no best practices found.`;
      showWarning(msg, name$F);
      bpSummary.remove();
    }
  }

  var bestPractices = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$F,
    run: run$D
  });

  // @ts-check

  const name$E = "core/figures";

  const localizationStrings$k = {
    en: {
      list_of_figures: "List of Figures",
      fig: "Figure ",
    },
    ja: {
      fig: "図 ",
      list_of_figures: "図のリスト",
    },
    ko: {
      fig: "그림 ",
      list_of_figures: "그림 목록",
    },
    nl: {
      fig: "Figuur ",
      list_of_figures: "Lijst met figuren",
    },
    es: {
      fig: "Figura ",
      list_of_figures: "Lista de Figuras",
    },
    zh: {
      fig: "图 ",
      list_of_figures: "规范中包含的图",
    },
    de: {
      fig: "Abbildung",
      list_of_figures: "Abbildungsverzeichnis",
    },
  };

  const l10n$j = getIntlData(localizationStrings$k);

  function run$C() {
    normalizeImages(document);

    const tof = collectFigures();

    // Create a Table of Figures if a section with id 'tof' exists.
    const tofElement = document.getElementById("tof");
    if (tof.length && tofElement) {
      decorateTableOfFigures(tofElement);
      tofElement.append(
        html`<h2>${l10n$j.list_of_figures}</h2>`,
        html`<ul class="tof">
        ${tof}
      </ul>`
      );
    }
  }

  /**
   * process all figures
   */
  function collectFigures() {
    /** @type {HTMLElement[]} */
    const tof = [];
    document.querySelectorAll("figure").forEach((fig, i) => {
      const caption = fig.querySelector("figcaption");

      if (caption) {
        decorateFigure(fig, caption, i);
        tof.push(getTableOfFiguresListItem(fig.id, caption));
      } else {
        const msg = "Found a `<figure>` without a `<figcaption>`.";
        showWarning(msg, name$E, { elements: [fig] });
      }
    });
    return tof;
  }

  /**
   * @param {HTMLElement} figure
   * @param {HTMLElement} caption
   * @param {number} i
   */
  function decorateFigure(figure, caption, i) {
    const title = caption.textContent;
    addId(figure, "fig", title);
    // set proper caption title
    wrapInner(caption, html`<span class="fig-title"></span>`);
    caption.prepend(l10n$j.fig, html`<bdi class="figno">${i + 1}</bdi>`, " ");
  }

  /**
   * @param {string} figureId
   * @param {HTMLElement} caption
   * @return {HTMLElement}
   */
  function getTableOfFiguresListItem(figureId, caption) {
    const tofCaption = caption.cloneNode(true);
    tofCaption.querySelectorAll("a").forEach(anchor => {
      renameElement(anchor, "span").removeAttribute("href");
    });
    return html`<li class="tofline">
    <a class="tocxref" href="${`#${figureId}`}">${tofCaption.childNodes}</a>
  </li>`;
  }

  function normalizeImages(doc) {
    doc
      .querySelectorAll(
        ":not(picture)>img:not([width]):not([height]):not([srcset])"
      )
      .forEach(img => {
        if (img.naturalHeight === 0 || img.naturalWidth === 0) return;
        img.height = img.naturalHeight;
        img.width = img.naturalWidth;
      });
  }

  /**
   * if it has a parent section, don't touch it
   * if it has a class of appendix or introductory, don't touch it
   * if all the preceding section siblings are introductory, make it introductory
   * if there is a preceding section sibling which is an appendix, make it appendix
   * @param {Element} tofElement
   */
  function decorateTableOfFigures(tofElement) {
    if (
      tofElement.classList.contains("appendix") ||
      tofElement.classList.contains("introductory") ||
      tofElement.closest("section")
    ) {
      return;
    }

    const previousSections = getPreviousSections(tofElement);
    if (previousSections.every(sec => sec.classList.contains("introductory"))) {
      tofElement.classList.add("introductory");
    } else if (previousSections.some(sec => sec.classList.contains("appendix"))) {
      tofElement.classList.add("appendix");
    }
  }

  /**
   * @param {Element} element
   */
  function getPreviousSections(element) {
    /** @type {Element[]} */
    const sections = [];
    for (const previous of iteratePreviousElements(element)) {
      if (previous.localName === "section") {
        sections.push(previous);
      }
    }
    return sections;
  }

  /**
   * @param {Element} element
   */
  function* iteratePreviousElements(element) {
    let previous = element;
    while (previous.previousElementSibling) {
      previous = previous.previousElementSibling;
      yield previous;
    }
  }

  var figures = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$E,
    run: run$C
  });

  // @ts-check

  const name$D = "ims/biblio";

  /**
   * @param {*} conf
   */
  async function run$B(conf) {
    let imsBiblioURL = "https://purl.imsglobal.org/spec/ims-biblio.json";
    if (conf.overrideIMSbiblioLocation) {
      imsBiblioURL = conf.overrideIMSbiblioLocation;
    }

    if (!conf.disableFetchIMSbiblio) {
      // console.log("fetching ims biblio...");
      fetch(imsBiblioURL, { mode: "cors" })
        .then(response => {
          if (response.ok) {
            return response.json();
          }
          throw new Error(response.statusText);
        })
        .then(json => {
          // TODO invalid json should be caught here
          // JSON.stringify(conf.localBiblio) --> throws error?
          // TODO we might want to worry about dupes and precedence
          conf.localBiblio = Object.assign(conf.localBiblio, json);
        })
        .catch(error => {
          pub("warn", error.toString());
        });
    }
  }

  var biblio = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$D,
    run: run$B
  });

  // @ts-check
  const name$C = "core/data-cite";

  /**
   * An arbitrary constant value used as an alias to current spec's shortname. It
   * exists to simplify code as passing `conf.shortName` everywhere gets clumsy.
   */
  const THIS_SPEC = "__SPEC__";

  /**
   * @param {CiteDetails} citeDetails
   */
  async function getLinkProps(citeDetails) {
    const { key, frag, path, href: canonicalHref } = citeDetails;
    let href = "";
    let title = "";
    // This is just referring to this document
    if (key === THIS_SPEC) {
      href = document.location.href;
    } else {
      // Let's go look it up in spec ref...
      const entry = await resolveRef(key);
      if (!entry) {
        return null;
      }
      href = entry.href;
      title = entry.title;
    }
    if (canonicalHref) {
      // Xref gave us a canonical link, so let's use that.
      href = canonicalHref;
    } else {
      if (path) {
        // See: https://github.com/w3c/respec/issues/1856#issuecomment-429579475
        const relPath = path.startsWith("/") ? `.${path}` : path;
        href = new URL(relPath, href).href;
      }
      if (frag) {
        href = new URL(frag, href).href;
      }
    }
    return { href, title };
  }

  /**
   * @param {HTMLElement} elem
   * @param {object} linkProps
   * @param {string} linkProps.href
   * @param {string} linkProps.title
   * @param {CiteDetails} citeDetails
   */
  function linkElem(elem, linkProps, citeDetails) {
    const { href, title } = linkProps;
    const wrapInCiteEl = !citeDetails.path && !citeDetails.frag;

    switch (elem.localName) {
      case "a": {
        const el = /** @type {HTMLAnchorElement} */ (elem);
        if (el.textContent === "" && el.dataset.lt !== "the-empty-string") {
          el.textContent = title;
        }
        el.href = href;
        if (wrapInCiteEl) {
          const cite = document.createElement("cite");
          el.replaceWith(cite);
          cite.append(el);
        }
        break;
      }
      case "dfn": {
        const anchor = document.createElement("a");
        anchor.href = href;
        if (!elem.textContent) {
          anchor.textContent = title;
          elem.append(anchor);
        } else {
          wrapInner(elem, anchor);
        }
        if (wrapInCiteEl) {
          const cite = document.createElement("cite");
          cite.append(anchor);
          elem.append(cite);
        }
        if ("export" in elem.dataset) {
          const msg = "Exporting an linked external definition is not allowed.";
          const hint = "Please remove the `data-export` attribute.";
          showError(msg, name$C, { hint, elements: [elem] });
          delete elem.dataset.export;
        }
        elem.classList.add("externalDFN");
        elem.dataset.noExport = "";
        break;
      }
    }
  }

  /**
   * @param {string} component
   * @return {(key: string) => string}
   */
  function makeComponentFinder(component) {
    return key => {
      const position = key.search(component);
      return position !== -1 ? key.substring(position) : "";
    };
  }

  const findFrag = makeComponentFinder("#");
  const findPath = makeComponentFinder("/");

  /**
   * @typedef {object} CiteDetails
   * @property {string} key
   * @property {boolean} isNormative
   * @property {string} frag
   * @property {string} path
   * @property {string} [href] - canonical href coming from xref
   * @param {HTMLElement} elem
   * @return {CiteDetails};
   */
  function toCiteDetails(elem) {
    const { dataset } = elem;
    const { cite: rawKey, citeFrag, citePath, citeHref } = dataset;

    // The key is a fragment, resolve using the shortName as key
    if (rawKey.startsWith("#") && !citeFrag) {
      // Closes data-cite not starting with "#"
      /** @type {HTMLElement} */
      const closest = elem.parentElement.closest(
        `[data-cite]:not([data-cite^="#"])`
      );
      const { key: parentKey, isNormative: closestIsNormative } = closest
        ? toCiteDetails(closest)
        : { key: THIS_SPEC, isNormative: false };
      dataset.cite = closestIsNormative ? parentKey : `?${parentKey}`;
      dataset.citeFrag = rawKey.replace("#", ""); // the key is acting as fragment
      return toCiteDetails(elem);
    }
    const frag = citeFrag ? `#${citeFrag}` : findFrag(rawKey);
    const path = citePath || findPath(rawKey).split("#")[0]; // path is always before "#"
    const { type } = refTypeFromContext(rawKey, elem);
    const isNormative = type === "normative";
    // key is before "/" and "#" but after "!" or "?" (e.g., ?key/path#frag)
    const hasPrecedingMark = /^[?|!]/.test(rawKey);
    const key = rawKey.split(/[/|#]/)[0].substring(Number(hasPrecedingMark));
    const details = { key, isNormative, frag, path, href: citeHref };
    return details;
  }

  async function run$A() {
    /** @type {NodeListOf<HTMLElement>} */
    const elems = document.querySelectorAll(
      "dfn[data-cite]:not([data-cite='']), a[data-cite]:not([data-cite=''])"
    );

    await updateBiblio([...elems]);

    for (const elem of elems) {
      const originalKey = elem.dataset.cite;
      const citeDetails = toCiteDetails(elem);
      const linkProps = await getLinkProps(citeDetails);
      if (linkProps) {
        linkElem(elem, linkProps, citeDetails);
      } else {
        const msg = `Couldn't find a match for "${originalKey}"`;
        showWarning(msg, name$C, { elements: [elem] });
      }
    }

    sub("beforesave", cleanup$3);
  }

  /**
   * Fetch and update `biblio` with entries corresponding to given elements
   * @param {HTMLElement[]} elems
   */
  async function updateBiblio(elems) {
    const promisesForBibEntries = elems.map(toCiteDetails).map(async entry => {
      const result = await resolveRef(entry.key);
      return { entry, result };
    });
    const bibEntries = await Promise.all(promisesForBibEntries);

    const missingBibEntries = bibEntries
      .filter(({ result }) => result === null)
      .map(({ entry: { key } }) => key);

    const newEntries = await updateFromNetwork(missingBibEntries);
    if (newEntries) {
      Object.assign(biblio$1, newEntries);
    }
  }

  /** @param {Document} doc */
  function cleanup$3(doc) {
    const attrToRemove = ["data-cite", "data-cite-frag", "data-cite-path"];
    const elems = doc.querySelectorAll("a[data-cite], dfn[data-cite]");
    elems.forEach(elem =>
      attrToRemove.forEach(attr => elem.removeAttribute(attr))
    );
  }

  var dataCite = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$C,
    THIS_SPEC: THIS_SPEC,
    toCiteDetails: toCiteDetails,
    run: run$A
  });

  // @ts-check

  const name$B = "core/link-to-dfn";

  /** @type {HTMLElement[]} */
  const possibleExternalLinks = [];

  const localizationStrings$j = {
    en: {
      /**
       * @param {string} title
       */
      duplicateMsg(title) {
        return `Duplicate definition(s) of '${title}'`;
      },
      duplicateTitle: "This is defined more than once in the document.",
    },
    ja: {
      /**
       * @param {string} title
       */
      duplicateMsg(title) {
        return `'${title}' の重複定義`;
      },
      duplicateTitle: "この文書内で複数回定義されています．",
    },
    de: {
      /**
       * @param {string} title
       */
      duplicateMsg(title) {
        return `Mehrfache Definition von '${title}'`;
      },
      duplicateTitle:
        "Das Dokument enthält mehrere Definitionen dieses Eintrags.",
    },
    zh: {
      /**
       * @param {string} title
       */
      duplicateMsg(title) {
        return `'${title}' 的重复定义`;
      },
      duplicateTitle: "在文档中有重复的定义。",
    },
  };
  const l10n$i = getIntlData(localizationStrings$j);

  async function run$z(conf) {
    const titleToDfns = mapTitleToDfns();
    /** @type {HTMLAnchorElement[]} */
    const badLinks = [];

    /** @type {NodeListOf<HTMLAnchorElement>} */
    const localAnchors = document.querySelectorAll(
      "a[data-cite=''], a:not([href]):not([data-cite]):not(.logo):not(.externalDFN)"
    );
    for (const anchor of localAnchors) {
      const dfn = findMatchingDfn(anchor, titleToDfns);
      if (dfn) {
        const foundLocalMatch = processAnchor(anchor, dfn, titleToDfns);
        if (!foundLocalMatch) {
          possibleExternalLinks.push(anchor);
        }
      } else {
        if (anchor.dataset.cite === "") {
          badLinks.push(anchor);
        } else {
          possibleExternalLinks.push(anchor);
        }
      }
    }

    showLinkingError(badLinks);

    // This needs to run before core/xref adds its data-cite and updates
    // conf.normativeReferences and conf.informativeReferences.
    updateReferences(conf);

    if (!conf.xref) {
      showLinkingError(possibleExternalLinks);
    }
  }

  function mapTitleToDfns() {
    /** @type {CaseInsensitiveMap<Map<string, Map<string, HTMLElement>>>} */
    const titleToDfns = new CaseInsensitiveMap();
    for (const key of definitionMap.keys()) {
      const { result, duplicates } = collectDfns(key);
      titleToDfns.set(key, result);
      if (duplicates.length > 0) {
        showError(l10n$i.duplicateMsg(key), name$B, {
          title: l10n$i.duplicateTitle,
          elements: duplicates,
        });
      }
    }
    return titleToDfns;
  }

  /**
   * @param {string} title
   */
  function collectDfns(title) {
    /** @type {Map<string, Map<string, HTMLElement>>} */
    const result = new Map();
    const duplicates = [];
    for (const dfn of definitionMap.get(title)) {
      const { dfnFor = "", dfnType = "dfn" } = dfn.dataset;
      // check for potential duplicate definition
      if (result.has(dfnFor) && result.get(dfnFor).has(dfnType)) {
        const oldDfn = result.get(dfnFor).get(dfnType);
        // We want <dfn> definitions to take precedence over
        // definitions from WebIDL. WebIDL definitions wind
        // up as <span>s instead of <dfn>.
        const oldIsDfn = oldDfn.localName === "dfn";
        const newIsDfn = dfn.localName === "dfn";
        const isSameDfnType = dfnType === (oldDfn.dataset.dfnType || "dfn");
        const isSameDfnFor = dfnFor === (oldDfn.dataset.dfnFor || "");
        if (oldIsDfn && newIsDfn && isSameDfnType && isSameDfnFor) {
          duplicates.push(dfn);
          continue;
        }
      }
      const type = "idl" in dfn.dataset || dfnType !== "dfn" ? "idl" : "dfn";
      if (!result.has(dfnFor)) {
        result.set(dfnFor, new Map());
      }
      result.get(dfnFor).set(type, dfn);
      addId(dfn, "dfn", title);
    }

    return { result, duplicates };
  }

  /**
   * Find a potentially matching <dfn> for given anchor.
   * @param {HTMLAnchorElement} anchor
   * @param {ReturnType<typeof mapTitleToDfns>} titleToDfns
   */
  function findMatchingDfn(anchor, titleToDfns) {
    const linkTargets = getLinkTargets(anchor);
    const target = linkTargets.find(
      target =>
        titleToDfns.has(target.title) &&
        titleToDfns.get(target.title).has(target.for)
    );
    if (!target) return;

    const dfnsByType = titleToDfns.get(target.title).get(target.for);
    const { linkType } = anchor.dataset;
    if (linkType) {
      const type = linkType === "dfn" ? "dfn" : "idl";
      return dfnsByType.get(type) || dfnsByType.get("dfn");
    } else {
      // Assumption: if it's for something, it's more likely IDL.
      const type = target.for ? "idl" : "dfn";
      return dfnsByType.get(type) || dfnsByType.get("idl");
    }
  }

  /**
   * @param {HTMLAnchorElement} anchor
   * @param {HTMLElement} dfn
   * @param {ReturnType<typeof mapTitleToDfns>} titleToDfns
   */
  function processAnchor(anchor, dfn, titleToDfns) {
    let noLocalMatch = false;
    const { linkFor } = anchor.dataset;
    const { dfnFor } = dfn.dataset;
    if (dfn.dataset.cite) {
      anchor.dataset.cite = dfn.dataset.cite;
    } else if (linkFor && !titleToDfns.get(linkFor) && linkFor !== dfnFor) {
      noLocalMatch = true;
    } else if (dfn.classList.contains("externalDFN")) {
      // data-lt[0] serves as unique id for the dfn which this element references
      const lt = dfn.dataset.lt ? dfn.dataset.lt.split("|") : [];
      anchor.dataset.lt = lt[0] || dfn.textContent;
      noLocalMatch = true;
    } else if (anchor.dataset.idl !== "partial") {
      anchor.href = `#${dfn.id}`;
      anchor.classList.add("internalDFN");
    } else {
      noLocalMatch = true;
    }
    if (!anchor.hasAttribute("data-link-type")) {
      anchor.dataset.linkType = "idl" in dfn.dataset ? "idl" : "dfn";
    }
    if (isCode(dfn)) {
      wrapAsCode(anchor, dfn);
    }
    return !noLocalMatch;
  }

  /**
   * Check if a definition is a code
   * @param {HTMLElement} dfn a definition
   */
  function isCode(dfn) {
    if (dfn.closest("code,pre")) {
      return true;
    }
    // Note that childNodes.length === 1 excludes
    // definitions that have either other text, or other
    // whitespace, inside the <dfn>.
    if (dfn.childNodes.length !== 1) {
      return false;
    }
    const [first] = /** @type {NodeListOf<HTMLElement>} */ (dfn.childNodes);
    return first.localName === "code";
  }

  /**
   * Wrap links by <code>.
   * @param {HTMLAnchorElement} anchor a link
   * @param {HTMLElement} dfn a definition
   */
  function wrapAsCode(anchor, dfn) {
    // only add code to IDL when the definition matches
    const term = anchor.textContent.trim();
    const isIDL = dfn.dataset.hasOwnProperty("idl");
    const needsCode = shouldWrapByCode(anchor) && shouldWrapByCode(dfn, term);
    if (!isIDL || needsCode) {
      wrapInner(anchor, document.createElement("code"));
    }
  }

  /**
   * @param {HTMLElement} elem
   * @param {string} term
   */
  function shouldWrapByCode(elem, term = "") {
    switch (elem.localName) {
      case "a":
        if (!elem.querySelector("code")) {
          return true;
        }
        break;
      default: {
        const { dataset } = elem;
        if (elem.textContent.trim() === term) {
          return true;
        } else if (dataset.title === term) {
          return true;
        } else if (dataset.lt || dataset.localLt) {
          const terms = [];
          if (dataset.lt) {
            terms.push(...dataset.lt.split("|"));
          }
          if (dataset.localLt) {
            terms.push(...dataset.localLt.split("|"));
          }
          return terms.includes(term);
        }
      }
    }
    return false;
  }

  function showLinkingError(elems) {
    elems.forEach(elem => {
      const msg = `Found linkless \`<a>\` element with text "${elem.textContent}" but no matching \`<dfn>\``;
      const title = "Linking error: not matching `<dfn>`";
      showWarning(msg, name$B, { title, elements: [elem] });
    });
  }

  /**
   * Update references due to `data-cite` attributes.
   *
   * Also, make sure self-citing doesn't cause current document getting added to
   * bibliographic references section.
   * @param {Conf} conf
   */
  function updateReferences(conf) {
    const { shortName = "" } = conf;
    // Match shortName in a data-cite (with optional leading ?!), while skipping shortName as prefix.
    // https://regex101.com/r/rsZyIJ/5
    const regex = new RegExp(String.raw`^([?!])?${shortName}\b([^-])`, "i");

    /** @type {NodeListOf<HTMLElement>} */
    const elems = document.querySelectorAll(
      "dfn[data-cite]:not([data-cite='']), a[data-cite]:not([data-cite=''])"
    );
    for (const elem of elems) {
      elem.dataset.cite = elem.dataset.cite.replace(regex, `$1${THIS_SPEC}$2`);
      const { key, isNormative } = toCiteDetails(elem);
      if (key === THIS_SPEC) continue;

      if (!isNormative && !conf.normativeReferences.has(key)) {
        conf.informativeReferences.add(key);
      } else {
        conf.normativeReferences.add(key);
        conf.informativeReferences.delete(key);
      }
    }
  }

  var linkToDfn = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$B,
    possibleExternalLinks: possibleExternalLinks,
    run: run$z
  });

  // @ts-check

  /**
   * @typedef {import('core/xref').RequestEntry} RequestEntry
   * @typedef {import('core/xref').Response} Response
   * @typedef {import('core/xref').SearchResultEntry} SearchResultEntry
   * @typedef {import('core/xref').XrefDatabase} XrefDatabase
   */

  const STORE_NAME = "xrefs";
  const VERSION_CHECK_WAIT = 5 * 60 * 1000; // 5 min

  async function getIdbCache() {
    /** @type {XrefDatabase} */
    const db = await idb.openDB("xref", 2, {
      upgrade(db) {
        [...db.objectStoreNames].forEach(s => db.deleteObjectStore(s));
        const store = db.createObjectStore(STORE_NAME, { keyPath: "query.id" });
        store.createIndex("byTerm", "query.term", { unique: false });
      },
    });
    return db;
  }

  /** @param {RequestEntry[]} queries */
  async function resolveXrefCache(queries) {
    /** @type {Map<string, SearchResultEntry[]>} */
    const cachedData = new Map();

    const bustCache = await shouldBustCache();
    if (bustCache) {
      await clearXrefData();
      return cachedData;
    }

    const requiredKeySet = new Set(queries.map(query => query.id));
    try {
      const cache = await getIdbCache();
      let cursor = await cache.transaction(STORE_NAME).store.openCursor();
      while (cursor) {
        if (requiredKeySet.has(cursor.key)) {
          cachedData.set(cursor.key, cursor.value.result);
        }
        cursor = await cursor.continue();
      }
    } catch (err) {
      console.error(err);
    }
    return cachedData;
  }

  /**
   * Get last updated timestamp from server and bust cache based on that. This
   * way, we prevent dirty/erroneous/stale data being kept on a client (which is
   * possible if we use a `MAX_AGE` based caching strategy).
   */
  async function shouldBustCache() {
    const key = "XREF:LAST_VERSION_CHECK";
    const lastChecked = parseInt(localStorage.getItem(key), 10);
    const now = Date.now();

    if (!lastChecked) {
      localStorage.setItem(key, now.toString());
      return false;
    }
    if (now - lastChecked < VERSION_CHECK_WAIT) {
      // avoid checking network for any data update if old cache "fresh"
      return false;
    }

    const url = new URL("meta/version", API_URL$1).href;
    const res = await fetch(url);
    if (!res.ok) return false;
    const lastUpdated = await res.text();
    localStorage.setItem(key, now.toString());
    return parseInt(lastUpdated, 10) > lastChecked;
  }

  /**
   * @param {RequestEntry[]} queries
   * @param {Map<string, SearchResultEntry[]>} results
   */
  async function cacheXrefData(queries, results) {
    try {
      const cache = await getIdbCache();
      const tx = cache.transaction(STORE_NAME, "readwrite");
      for (const query of queries) {
        const result = results.get(query.id);
        tx.objectStore(STORE_NAME).add({ query, result });
      }
      await tx.done;
    } catch (e) {
      console.error(e);
    }
  }

  async function clearXrefData() {
    try {
      await getIdbCache().then(db => db.clear(STORE_NAME));
    } catch (e) {
      console.error(e);
    }
  }

  // @ts-check

  const name$A = "core/xref";

  const profiles = {
    "web-platform": ["HTML", "INFRA", "URL", "WEBIDL", "DOM", "FETCH"],
  };

  const API_URL$1 = "https://respec.org/xref/";

  if (
    !document.querySelector("link[rel='preconnect'][href='https://respec.org']")
  ) {
    const link = createResourceHint({
      hint: "preconnect",
      href: "https://respec.org",
    });
    document.head.appendChild(link);
  }

  /**
   * @param {Object} conf respecConfig
   */
  async function run$y(conf) {
    if (!conf.xref) {
      return;
    }

    const xref = normalizeConfig(conf.xref);
    if (xref.specs) {
      const bodyCite = document.body.dataset.cite
        ? document.body.dataset.cite.split(/\s+/)
        : [];
      document.body.dataset.cite = bodyCite.concat(xref.specs).join(" ");
    }

    const elems = possibleExternalLinks.concat(findExplicitExternalLinks());
    if (!elems.length) return;

    /** @type {RequestEntry[]} */
    const queryKeys = [];
    for (const elem of elems) {
      const entry = getRequestEntry(elem);
      entry.id = await objectHash(entry);
      queryKeys.push(entry);
    }

    const data = await getData(queryKeys, xref.url);
    addDataCiteToTerms(elems, queryKeys, data, conf);

    sub("beforesave", cleanup$2);
  }

  /**
   * Find additional references that need to be looked up externally.
   * Examples: a[data-cite="spec"], dfn[data-cite="spec"], dfn.externalDFN
   */
  function findExplicitExternalLinks() {
    /** @type {NodeListOf<HTMLElement>} */
    const links = document.querySelectorAll(
      ":is(a,dfn)[data-cite]:not([data-cite=''],[data-cite*='#'])"
    );
    /** @type {NodeListOf<HTMLElement>} */
    const externalDFNs = document.querySelectorAll("dfn.externalDFN");
    return [...links]
      .filter(el => {
        // ignore empties
        if (el.textContent.trim() === "") return false;
        /** @type {HTMLElement} */
        const closest = el.closest("[data-cite]");
        return !closest || closest.dataset.cite !== "";
      })
      .concat(...externalDFNs);
  }

  /**
   * converts conf.xref to object with url and spec properties
   */
  function normalizeConfig(xref) {
    const defaults = {
      url: API_URL$1,
      specs: null,
    };

    const config = Object.assign({}, defaults);

    const type = Array.isArray(xref) ? "array" : typeof xref;
    switch (type) {
      case "boolean":
        // using defaults already, as above
        break;
      case "string":
        if (xref.toLowerCase() in profiles) {
          Object.assign(config, { specs: profiles[xref.toLowerCase()] });
        } else {
          invalidProfileError(xref);
        }
        break;
      case "array":
        Object.assign(config, { specs: xref });
        break;
      case "object":
        Object.assign(config, xref);
        if (xref.profile) {
          const profile = xref.profile.toLowerCase();
          if (profile in profiles) {
            const specs = (xref.specs ?? []).concat(profiles[profile]);
            Object.assign(config, { specs });
          } else {
            invalidProfileError(xref.profile);
          }
        }
        break;
      default: {
        const msg = `Invalid value for \`xref\` configuration option. Received: "${xref}".`;
        showError(msg, name$A);
      }
    }
    return config;

    function invalidProfileError(profile) {
      const supportedProfiles = joinOr(Object.keys(profiles), s => `"${s}"`);
      const msg =
        `Invalid profile "${profile}" in \`respecConfig.xref\`. ` +
        `Please use one of the supported profiles: ${supportedProfiles}.`;
      showError(msg, name$A);
    }
  }

  /**
   * get xref API request entry (term and context) for given xref element
   * @param {HTMLElement} elem
   */
  function getRequestEntry(elem) {
    const isIDL = "xrefType" in elem.dataset;

    let term = getTermFromElement(elem);
    if (!isIDL) term = term.toLowerCase();

    const specs = getSpecContext(elem);
    const types = getTypeContext(elem, isIDL);
    const forContext = getForContext(elem, isIDL);

    return {
      // Add an empty `id` to ensure the shape of object returned stays same when
      // actual `id` is added later (minor perf optimization, also makes
      // TypeScript happy).
      id: "",
      term,
      types,
      ...(specs.length && { specs }),
      ...(typeof forContext === "string" && { for: forContext }),
    };
  }

  /** @param {HTMLElement} elem */
  function getTermFromElement(elem) {
    const { lt: linkingText } = elem.dataset;
    let term = linkingText ? linkingText.split("|", 1)[0] : elem.textContent;
    term = norm(term);
    return term === "the-empty-string" ? "" : term;
  }

  /**
   * Get spec context as a fallback chain, where each level (sub-array) represents
   * decreasing priority.
   * @param {HTMLElement} elem
   */
  function getSpecContext(elem) {
    /** @type {string[][]} */
    const specs = [];

    /** @type {HTMLElement} */
    let dataciteElem = elem.closest("[data-cite]");

    // Traverse up towards the root element, adding levels of lower priority specs
    while (dataciteElem) {
      const cite = dataciteElem.dataset.cite.toLowerCase().replace(/[!?]/g, "");
      const cites = cite.split(/\s+/).filter(s => s);
      if (cites.length) {
        specs.push(cites);
      }
      if (dataciteElem === elem) break;
      dataciteElem = dataciteElem.parentElement.closest("[data-cite]");
    }

    // If element itself contains data-cite, we don't take inline context into
    // account. The inline bibref context has lowest priority, if available.
    if (dataciteElem !== elem) {
      const closestSection = elem.closest("section");
      /** @type {Iterable<HTMLElement>} */
      const bibrefs = closestSection
        ? closestSection.querySelectorAll("a.bibref")
        : [];
      const inlineRefs = [...bibrefs].map(el => el.textContent.toLowerCase());
      if (inlineRefs.length) {
        specs.push(inlineRefs);
      }
    }

    const uniqueSpecContext = dedupeSpecContext(specs);
    return uniqueSpecContext;
  }

  /**
   * If we already have a spec in a higher priority level (closer to element) of
   * fallback chain, skip it from low priority levels, to prevent duplication.
   * @param {string[][]} specs
   * */
  function dedupeSpecContext(specs) {
    /** @type {string[][]} */
    const unique = [];
    for (const level of specs) {
      const higherPriority = unique[unique.length - 1] || [];
      const uniqueSpecs = [...new Set(level)].filter(
        spec => !higherPriority.includes(spec)
      );
      unique.push(uniqueSpecs.sort());
    }
    return unique;
  }

  /**
   * @param {HTMLElement} elem
   * @param {boolean} isIDL
   */
  function getForContext(elem, isIDL) {
    if (elem.dataset.xrefFor) {
      return norm(elem.dataset.xrefFor);
    }

    if (isIDL) {
      /** @type {HTMLElement} */
      const dataXrefForElem = elem.closest("[data-xref-for]");
      if (dataXrefForElem) {
        return norm(dataXrefForElem.dataset.xrefFor);
      }
    }

    return null;
  }

  /**
   * @param {HTMLElement} elem
   * @param {boolean} isIDL
   */
  function getTypeContext(elem, isIDL) {
    if (isIDL) {
      if (elem.dataset.xrefType) {
        return elem.dataset.xrefType.split("|");
      }
      return ["_IDL_"];
    }

    return ["_CONCEPT_"];
  }

  /**
   * @param {RequestEntry[]} queryKeys
   * @param {string} apiUrl
   * @returns {Promise<Map<string, SearchResultEntry[]>>}
   */
  async function getData(queryKeys, apiUrl) {
    const uniqueIds = new Set();
    const uniqueQueryKeys = queryKeys.filter(key => {
      return uniqueIds.has(key.id) ? false : uniqueIds.add(key.id) && true;
    });

    const resultsFromCache = await resolveXrefCache(uniqueQueryKeys);

    const termsToLook = uniqueQueryKeys.filter(
      key => !resultsFromCache.get(key.id)
    );
    const fetchedResults = await fetchFromNetwork(termsToLook, apiUrl);
    if (fetchedResults.size) {
      // add data to cache
      await cacheXrefData(uniqueQueryKeys, fetchedResults);
    }

    return new Map([...resultsFromCache, ...fetchedResults]);
  }

  /**
   * @param {RequestEntry[]} keys
   * @param {string} url
   * @returns {Promise<Map<string, SearchResultEntry[]>>}
   */
  async function fetchFromNetwork(keys, url) {
    if (!keys.length) return new Map();

    const query = { keys };
    const options = {
      method: "POST",
      body: JSON.stringify(query),
      headers: {
        "Content-Type": "application/json",
      },
    };
    const response = await fetch(url, options);
    const json = await response.json();
    return new Map(json.result);
  }

  /**
   * Figures out from the tree structure if the reference is
   * normative (true) or informative (false).
   * @param {HTMLElement} elem
   */
  function isNormative(elem) {
    const closestNormative = elem.closest(".normative");
    const closestInform = elem.closest(nonNormativeSelector);
    if (!closestInform || elem === closestNormative) {
      return true;
    }
    return (
      closestNormative &&
      closestInform &&
      closestInform.contains(closestNormative)
    );
  }

  /**
   * adds data-cite attributes to elems for each term for which results are found.
   * adds citations to references section.
   * collects and shows linking errors if any.
   * @param {HTMLElement[]} elems
   * @param {RequestEntry[]} queryKeys
   * @param {Map<string, SearchResultEntry[]>} data
   * @param {any} conf
   */
  function addDataCiteToTerms(elems, queryKeys, data, conf) {
    /** @type {Errors} */
    const errors = { ambiguous: new Map(), notFound: new Map() };

    for (let i = 0, l = elems.length; i < l; i++) {
      if (elems[i].closest("[data-no-xref]")) continue;

      const elem = elems[i];
      const query = queryKeys[i];

      const { id } = query;
      const results = data.get(id);
      if (results.length === 1) {
        addDataCite(elem, query, results[0], conf);
      } else {
        const collector = errors[results.length === 0 ? "notFound" : "ambiguous"];
        if (!collector.has(id)) {
          collector.set(id, { elems: [], results, query });
        }
        collector.get(id).elems.push(elem);
      }
    }

    showErrors(errors);
  }

  /**
   * @param {HTMLElement} elem
   * @param {RequestEntry} query
   * @param {SearchResultEntry} result
   * @param {any} conf
   */
  function addDataCite(elem, query, result, conf) {
    const { term, specs = [] } = query;
    const { uri, shortname, spec, normative, type, for: forContext } = result;
    // if authored spec context had `result.spec`, use it instead of shortname
    const cite = specs.flat().includes(spec) ? spec : shortname;
    // we use this "partial" URL to resolve parts of urls...
    // but sometimes we get lucky and we get an absolute URL from xref
    // which we can then use in other places (e.g., data-cite.js)
    const url = new URL(uri, "https://partial");
    const { pathname: citePath } = url;
    const citeFrag = url.hash.slice(1);
    const dataset = { cite, citePath, citeFrag, type };
    if (forContext) dataset.linkFor = forContext[0];
    if (url.origin && url.origin !== "https://partial") {
      dataset.citeHref = url.href;
    }
    Object.assign(elem.dataset, dataset);

    addToReferences(elem, cite, normative, term, conf);
  }

  /**
   * add specs for citation (references section)
   * @param {HTMLElement} elem
   * @param {string} cite
   * @param {boolean} normative
   * @param {string} term
   * @param {any} conf
   */
  function addToReferences(elem, cite, normative, term, conf) {
    const isNormRef = isNormative(elem);
    if (!isNormRef) {
      // Only add it if not already normative...
      if (!conf.normativeReferences.has(cite)) {
        conf.informativeReferences.add(cite);
      }
      return;
    }
    if (normative) {
      // If it was originally informative, we move the existing
      // key to be normative.
      const existingKey = conf.informativeReferences.has(cite)
        ? conf.informativeReferences.getCanonicalKey(cite)
        : cite;
      conf.normativeReferences.add(existingKey);
      conf.informativeReferences.delete(existingKey);
      return;
    }

    const msg = `Normative reference to "${term}" found but term is defined "informatively" in "${cite}".`;
    const title = "Normative reference to non-normative term.";
    showWarning(msg, name$A, { title, elements: [elem] });
  }

  /** @param {Errors} errors */
  function showErrors({ ambiguous, notFound }) {
    const getPrefilledFormURL = (term, query, specs = []) => {
      const url = new URL(API_URL$1);
      url.searchParams.set("term", term);
      if (query.for) url.searchParams.set("for", query.for);
      url.searchParams.set("types", query.types.join(","));
      if (specs.length) url.searchParams.set("specs", specs.join(","));
      return url.href;
    };

    const howToFix = (howToCiteURL, originalTerm) => {
      return docLink`
    [See search matches for "${originalTerm}"](${howToCiteURL}) or
    ${"[Learn about this error|#error-term-not-found]"}.`;
    };

    for (const { query, elems } of notFound.values()) {
      const specs = query.specs ? [...new Set(query.specs.flat())].sort() : [];
      const originalTerm = getTermFromElement(elems[0]);
      const formUrl = getPrefilledFormURL(originalTerm, query);
      const specsString = joinAnd(specs, s => `**[${s}]**`);
      const hint = howToFix(formUrl, originalTerm);
      const forParent = query.for ? `, for **"${query.for}"**, ` : "";
      const msg = `Couldn't find "**${originalTerm}**"${forParent} in this document or other cited documents: ${specsString}.`;
      const title = "No matching definition found.";
      showError(msg, name$A, { title, elements: elems, hint });
    }

    for (const { query, elems, results } of ambiguous.values()) {
      const specs = [...new Set(results.map(entry => entry.shortname))].sort();
      const specsString = joinAnd(specs, s => `**[${s}]**`);
      const originalTerm = getTermFromElement(elems[0]);
      const formUrl = getPrefilledFormURL(originalTerm, query, specs);
      const forParent = query.for ? `, for **"${query.for}"**, ` : "";
      const moreInfo = howToFix(formUrl, originalTerm);
      const hint = docLink`To fix, use the ${"[data-cite]"} attribute to pick the one you mean from the appropriate specification. ${moreInfo}.`;
      const msg = `The term "**${originalTerm}**"${forParent} is ambiguous because it's defined in ${specsString}.`;
      const title = "Definition is ambiguous.";
      showError(msg, name$A, { title, elements: elems, hint });
    }
  }

  function objectHash(obj) {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    const buffer = new TextEncoder().encode(str);
    return crypto.subtle.digest("SHA-1", buffer).then(bufferToHexString);
  }

  /** @param {ArrayBuffer} buffer */
  function bufferToHexString(buffer) {
    const byteArray = new Uint8Array(buffer);
    return [...byteArray].map(v => v.toString(16).padStart(2, "0")).join("");
  }

  function cleanup$2(doc) {
    const elems = doc.querySelectorAll(
      "a[data-xref-for], a[data-xref-type], a[data-link-for]"
    );
    const attrToRemove = ["data-xref-for", "data-xref-type", "data-link-for"];
    elems.forEach(el => {
      attrToRemove.forEach(attr => el.removeAttribute(attr));
    });
  }

  var xref = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$A,
    API_URL: API_URL$1,
    run: run$y,
    getTermFromElement: getTermFromElement
  });

  /*
  @module "core/dfn-index"
  Extends and overrides some styles from `base.css`.
  */
  const css$e = String.raw;

  // Prettier ignore only to keep code indented from level 0.
  // prettier-ignore
  var css$f = css$e`
ul.index {
  columns: 30ch;
  column-gap: 1.5em;
}

ul.index li {
  list-style: inherit;
}

ul.index li span {
  color: inherit;
  cursor: pointer;
  white-space: normal;
}

#index-defined-here ul.index li {
  font-size: 0.9rem;
}

ul.index code {
  color: inherit;
}

#index-defined-here .print-only {
  display: none;
}

@media print {
  #index-defined-here .print-only {
    display: initial;
  }
}
`;

  // @ts-check

  const name$z = "core/dfn-index";

  const localizationStrings$i = {
    en: {
      heading: "Index",
      headingExternal: "Terms defined by reference",
      headlingLocal: "Terms defined by this specification",
      dfnOf: "definition of",
    },
  };
  const l10n$h = getIntlData(localizationStrings$i);

  // Terms of these _types_ are wrapped in `<code>`.
  const CODE_TYPES = new Set([
    "attribute",
    "callback",
    "dict-member",
    "dictionary",
    "element-attr",
    "element",
    "enum-value",
    "enum",
    "exception",
    "extended-attribute",
    "interface",
    "method",
    "typedef",
  ]);

  /**
   * @typedef {{ term: string, type: string, linkFor: string, elem: HTMLAnchorElement }} Entry
   */

  function run$x() {
    const index = document.querySelector("section#index");
    if (!index) {
      return;
    }

    const styleEl = document.createElement("style");
    styleEl.textContent = css$f;
    document.head.appendChild(styleEl);

    index.classList.add("appendix");
    if (!index.querySelector("h2")) {
      index.prepend(html`<h2>${l10n$h.heading}</h2>`);
    }

    const localTermIndex = html`<section id="index-defined-here">
    <h3>${l10n$h.headlingLocal}</h3>
    ${createLocalTermIndex()}
  </section>`;
    index.append(localTermIndex);

    const externalTermIndex = html`<section id="index-defined-elsewhere">
    <h3>${l10n$h.headingExternal}</h3>
    ${createExternalTermIndex()}
  </section>`;
    index.append(externalTermIndex);
    for (const el of externalTermIndex.querySelectorAll(".index-term")) {
      addId(el, "index-term");
    }

    // XXX: This event is used to overcome an edge case with core/structure,
    // related to a circular dependency in plugin run order. We want
    // core/structure to run after dfn-index so the #index can be listed in the
    // TOC, but we also want section numbers in dfn-index. So, we "split"
    // core/dfn-index in two parts, one that runs before core/structure (using
    // plugin order in profile) and the other (following) after section numbers
    // are generated in core/structure (this event).
    sub("toc", appendSectionNumbers, { once: true });

    sub("beforesave", cleanup$1);
  }

  function createLocalTermIndex() {
    const dataSortedByTerm = collectLocalTerms();
    return html`<ul class="index">
    ${dataSortedByTerm.map(([term, dfns]) => renderLocalTerm(term, dfns))}
  </ul>`;
  }

  function collectLocalTerms() {
    /** @type {Map<string, HTMLElement[]>} */
    const data = new Map();
    /** @type {NodeListOf<HTMLElement>} */
    const elems = document.querySelectorAll("dfn:not([data-cite])");
    for (const elem of elems) {
      if (!elem.id) continue;
      const text = norm(elem.textContent);
      const elemsByTerm = data.get(text) || data.set(text, []).get(text);
      elemsByTerm.push(elem);
    }

    const dataSortedByTerm = [...data].sort(([a], [b]) =>
      a.slice(a.search(/\w/)).localeCompare(b.slice(b.search(/\w/)))
    );

    return dataSortedByTerm;
  }

  /**
   * @param {string} term
   * @param {HTMLElement[]} dfns
   * @returns {HTMLLIElement}
   */
  function renderLocalTerm(term, dfns) {
    const renderItem = (dfn, text, suffix) => {
      const href = `#${dfn.id}`;
      return html`<li data-id=${dfn.id}>
      <a class="index-term" href="${href}">${{ html: text }}</a> ${suffix
        ? { html: suffix }
        : ""}
    </li>`;
    };

    if (dfns.length === 1) {
      const dfn = dfns[0];
      const type = getLocalTermType(dfn);
      const text = getLocalTermText(dfn, type, term);
      const suffix = getLocalTermSuffix(dfn, type, term);
      return renderItem(dfn, text, suffix);
    }
    return html`<li>
    ${term}
    <ul>
      ${dfns.map(dfn => {
        const type = getLocalTermType(dfn);
        const text = getLocalTermSuffix(dfn, type, term) || l10n$h.dfnOf;
        return renderItem(dfn, text);
      })}
    </ul>
  </li>`;
  }

  /** @param {HTMLElement} dfn */
  function getLocalTermType(dfn) {
    const ds = dfn.dataset;
    const type = ds.dfnType || ds.idl || ds.linkType || "";
    switch (type) {
      case "":
      case "dfn":
        return "";
      default:
        return type;
    }
  }

  /** @param {HTMLElement} dfn */
  function getLocalTermParentContext(dfn) {
    /** @type {HTMLElement} */
    const dfnFor = dfn.closest("[data-dfn-for]:not([data-dfn-for=''])");
    return dfnFor ? dfnFor.dataset.dfnFor : "";
  }

  /**
   * @param {HTMLElement} dfn
   * @param {string} type
   * @param {string} term
   */
  function getLocalTermText(dfn, type, term) {
    let text = term;
    if (type === "enum-value") {
      text = `"${text}"`;
    }
    if (CODE_TYPES.has(type) || dfn.dataset.idl || dfn.closest("code")) {
      text = `<code>${text}</code>`;
    }
    return text;
  }

  /**
   * @param {HTMLElement} dfn
   * @param {string} type
   * @param {string} [term=""]
   */
  function getLocalTermSuffix(dfn, type, term = "") {
    if (term.startsWith("[[")) {
      const parent = getLocalTermParentContext(dfn);
      return `internal slot for <code>${parent}</code>`;
    }

    switch (type) {
      case "dict-member":
      case "method":
      case "attribute":
      case "enum-value": {
        const typeText =
          type === "dict-member" ? "member" : type.replace("-", " ");
        const parent = getLocalTermParentContext(dfn);
        return `${typeText} for <code>${parent}</code>`;
      }
      case "interface":
      case "dictionary":
      case "enum": {
        return type;
      }
      case "constructor": {
        const parent = getLocalTermParentContext(dfn);
        return `for <code>${parent}</code>`;
      }
      default:
        return "";
    }
  }

  function appendSectionNumbers() {
    const getSectionNumber = id => {
      const dfn = document.getElementById(id);
      const sectionNumberEl = dfn.closest("section").querySelector(".secno");
      const secNum = `§${sectionNumberEl.textContent.trim()}`;
      return html`<span class="print-only">${secNum}</span>`;
    };

    /** @type {NodeListOf<HTMLElement>} */
    const elems = document.querySelectorAll("#index-defined-here li[data-id]");
    elems.forEach(el => el.append(getSectionNumber(el.dataset.id)));
  }

  function createExternalTermIndex() {
    const data = collectExternalTerms();
    const dataSortedBySpec = [...data.entries()].sort(([specA], [specB]) =>
      specA.localeCompare(specB)
    );
    return html`<ul class="index">
    ${dataSortedBySpec.map(
      ([spec, entries]) => html`<li data-spec="${spec}">
        ${renderInlineCitation(spec)} defines the following:
        <ul>
          ${entries
            .sort((a, b) => a.term.localeCompare(b.term))
            .map(renderExternalTermEntry)}
        </ul>
      </li>`
    )}
  </ul>`;
  }

  function collectExternalTerms() {
    /** @type {Set<string>} */
    const uniqueReferences = new Set();
    /** @type {Map<string, Entry[]>} spec => entry[] */
    const data = new Map();

    /** @type {NodeListOf<HTMLAnchorElement>} */
    const elements = document.querySelectorAll(`a[data-cite]`);
    for (const elem of elements) {
      if (!elem.dataset.cite) {
        continue;
      }
      const uniqueID = elem.href;
      if (uniqueReferences.has(uniqueID)) {
        continue;
      }

      const { type, linkFor } = elem.dataset;
      const term = getTermFromElement(elem);
      if (!term) {
        continue; // <a data-cite="SPEC"></a>
      }
      const spec = toCiteDetails(elem).key.toUpperCase();

      const entriesBySpec = data.get(spec) || data.set(spec, []).get(spec);
      entriesBySpec.push({ term, type, linkFor, elem });
      uniqueReferences.add(uniqueID);
    }

    return data;
  }

  /**
   * @param {Entry} entry
   * @returns {HTMLLIElement}
   */
  function renderExternalTermEntry(entry) {
    const { elem } = entry;
    const text = getTermText(entry);
    const el = html`<li>
    <span class="index-term" data-href="${elem.href}">${{ html: text }}</span>
  </li>`;
    return el;
  }

  // Terms of these _types_ are suffixed with their type info.
  const TYPED_TYPES = new Map([
    ["attribute", "attribute"],
    ["element-attr", "attribute"],
    ["element", "element"],
    ["enum", "enum"],
    ["exception", "exception"],
    ["extended-attribute", "extended attribute"],
    ["interface", "interface"],
  ]);

  // These _terms_ have type suffix "type".
  const TYPE_TERMS = new Set([
    // Following are primitive types as per WebIDL spec:
    "boolean",
    "byte",
    "octet",
    "short",
    "unsigned short",
    "long",
    "unsigned long",
    "long long",
    "unsigned long long",
    "float",
    "unrestricted float",
    "double",
    "unrestricted double",
    // Following are not primitive types, but aren't interfaces either.
    "undefined",
    "any",
    "object",
    "symbol",
  ]);

  /** @param {Entry} entry */
  function getTermText(entry) {
    const { term, type, linkFor } = entry;
    let text = term;

    if (CODE_TYPES.has(type)) {
      if (type === "extended-attribute") {
        text = `[${text}]`;
      }
      text = `<code>${text}</code>`;
    }

    const typeSuffix = TYPE_TERMS.has(term) ? "type" : TYPED_TYPES.get(type);
    if (typeSuffix) {
      text += ` ${typeSuffix}`;
    }

    if (linkFor) {
      let linkForText = linkFor;
      if (!/\s/.test(linkFor)) {
        // If linkFor is a single word, highlight it.
        linkForText = `<code>${linkForText}</code>`;
      }
      if (type === "element-attr") {
        linkForText += " element";
      }
      text += ` (for ${linkForText})`;
    }

    return text;
  }

  /** @param {Document} doc */
  function cleanup$1(doc) {
    doc
      .querySelectorAll("#index-defined-elsewhere li[data-spec]")
      .forEach(el => el.removeAttribute("data-spec"));

    doc
      .querySelectorAll("#index-defined-here li[data-id]")
      .forEach(el => el.removeAttribute("data-id"));
  }

  var dfnIndex = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$z,
    run: run$x
  });

  // @ts-check

  const name$y = "ims/contrib";

  async function run$w(conf) {
    if (!conf.contributors) return;

    if (conf.specType !== "errata") {
      const useRoles = hasRoles(conf.contributors);
      const contrib = toHTMLNode(`<section id='contributors' class="appendix">
    <h2>List of Contributors</h2>
    <p>The following individuals contributed to the development of this document:</p>
    <table class="contributors" title="List of Contributors"
      summary="The list of contributors to this work.">
      <thead>
        <th>Name</th>
        <th>Organization</th>
        ${useRoles ? `<th>Role</th>` : ``}
      </thead>
      <tbody>
          ${personsToTableRows(conf.contributors, useRoles)}
      </tbody>
    </table>
    </section>`);
      document.body.appendChild(contrib);
    }
  }

  function personsToTableRows(arr, useRoles) {
    // use incoming sort
    let ret = "";
    arr.forEach(entry => {
      ret += `<tr><td class='name'>${entry.name}</td>`;
      ret += "<td class='co'>";
      if (entry.company) ret += entry.company;
      ret += "</td>";
      if (useRoles) {
        ret += "<td class='role'>";
        if (entry.role) ret += entry.role;
        ret += "</td>";
      }
      ret += "</tr>";
    });
    return ret;
  }

  function hasRoles(arr) {
    let hasRoles = false;
    arr.forEach(entry => {
      if (entry.role && entry.role.trim().length > 0) {
        hasRoles = true;
      }
    });
    return hasRoles;
  }

  var contrib = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$y,
    run: run$w
  });

  // @ts-check

  const name$x = "core/fix-headers";

  function run$v() {
    [...document.querySelectorAll("section:not(.introductory)")]
      .map(sec => sec.querySelector("h1, h2, h3, h4, h5, h6"))
      .filter(h => h)
      .forEach(heading => {
        const depth = Math.min(getParents(heading, "section").length + 1, 6);
        renameElement(heading, `h${depth}`);
      });
  }

  function getParents(el, selector) {
    const parents = [];
    while (el != el.ownerDocument.body) {
      if (el.matches(selector)) parents.push(el);
      el = el.parentElement;
    }
    return parents;
  }

  var fixHeaders = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$x,
    run: run$v
  });

  // @ts-check

  const lowerHeaderTags = ["h2", "h3", "h4", "h5", "h6"];

  const name$w = "core/structure";

  const localizationStrings$h = {
    en: {
      toc: "Table of Contents",
    },
    zh: {
      toc: "内容大纲",
    },
    ko: {
      toc: "목차",
    },
    ja: {
      toc: "目次",
    },
    nl: {
      toc: "Inhoudsopgave",
    },
    es: {
      toc: "Tabla de Contenidos",
    },
    de: {
      toc: "Inhaltsverzeichnis",
    },
  };

  const l10n$g = getIntlData(localizationStrings$h);

  /**
   * @typedef {object} SectionInfo
   * @property {string} secno
   * @property {string} title
   *
   * Scans sections and generate ordered list element + ID-to-anchor-content dictionary.
   * @param {Section[]} sections the target element to find child sections
   * @param {number} maxTocLevel
   */
  function scanSections(sections, maxTocLevel, { prefix = "" } = {}) {
    let appendixMode = false;
    let lastNonAppendix = 0;
    let index = 1;
    if (prefix.length && !prefix.endsWith(".")) {
      prefix += ".";
    }
    if (sections.length === 0) {
      return null;
    }
    /** @type {HTMLElement} */
    const ol = html`<ol class="toc"></ol>`;
    for (const section of sections) {
      if (section.isAppendix && !prefix && !appendixMode) {
        lastNonAppendix = index;
        appendixMode = true;
      }
      let secno = section.isIntro
        ? ""
        : appendixMode
        ? appendixNumber(index - lastNonAppendix + 1)
        : prefix + index;
      const level = secno.split(".").length;
      if (level === 1) {
        secno += ".";
        // if this is a top level item, insert
        // an OddPage comment so html2ps will correctly
        // paginate the output
        section.header.before(document.createComment("OddPage"));
      }

      if (!section.isIntro) {
        index += 1;
        section.header.prepend(html`<bdi class="secno">${secno} </bdi>`);
      }

      if (level <= maxTocLevel) {
        const id = section.header.id || section.element.id;
        const item = createTocListItem(section.header, id);
        const sub = scanSections(section.subsections, maxTocLevel, {
          prefix: secno,
        });
        if (sub) {
          item.append(sub);
        }
        ol.append(item);
      }
    }
    return ol;
  }

  /**
   * Convert a number to spreadsheet like column name.
   * For example, 1=A, 26=Z, 27=AA, 28=AB and so on..
   * @param {number} num
   */
  function appendixNumber(num) {
    let s = "";
    while (num > 0) {
      num -= 1;
      s = String.fromCharCode(65 + (num % 26)) + s;
      num = Math.floor(num / 26);
    }
    return s;
  }

  /**
   * @typedef {object} Section
   * @property {Element} element
   * @property {Element} header
   * @property {string} title
   * @property {boolean} isIntro
   * @property {boolean} isAppendix
   * @property {Section[]} subsections
   *
   * @param {Element} parent
   */
  function getSectionTree(parent) {
    /** @type {NodeListOf<HTMLElement>} */
    const sectionElements = parent.querySelectorAll(":scope > section");
    /** @type {Section[]} */
    const sections = [];

    for (const section of sectionElements) {
      const noToc = section.classList.contains("notoc");
      if (!section.children.length || noToc) {
        continue;
      }
      const header = section.children[0];
      if (!lowerHeaderTags.includes(header.localName)) {
        continue;
      }
      const title = header.textContent;
      addId(section, null, title);
      sections.push({
        element: section,
        header,
        title,
        isIntro: Boolean(section.closest(".introductory")),
        isAppendix: section.classList.contains("appendix"),
        subsections: getSectionTree(section),
      });
    }
    return sections;
  }

  /**
   * @param {Element} header
   * @param {string} id
   */
  function createTocListItem(header, id) {
    const anchor = html`<a href="${`#${id}`}" class="tocxref" />`;
    anchor.append(...header.cloneNode(true).childNodes);
    filterHeader(anchor);
    return html`<li class="tocline">${anchor}</li>`;
  }

  /**
   * Replaces any child <a> and <dfn> with <span>.
   * @param {HTMLElement} h
   */
  function filterHeader(h) {
    h.querySelectorAll("a").forEach(anchor => {
      const span = renameElement(anchor, "span");
      span.className = "formerLink";
      span.removeAttribute("href");
    });
    h.querySelectorAll("dfn").forEach(dfn => {
      const span = renameElement(dfn, "span");
      span.removeAttribute("id");
    });
  }

  function run$u(conf) {
    if ("maxTocLevel" in conf === false) {
      conf.maxTocLevel = Infinity;
    }

    renameSectionHeaders();

    // makeTOC
    if (!conf.noTOC) {
      skipFromToC();
      const sectionTree = getSectionTree(document.body);
      const result = scanSections(sectionTree, conf.maxTocLevel);
      if (result) {
        createTableOfContents(result);
      }
    }

    // See core/dfn-index
    pub("toc");
  }

  function renameSectionHeaders() {
    const headers = getNonintroductorySectionHeaders();
    if (!headers.length) {
      return;
    }
    headers.forEach(header => {
      const depth = Math.min(parents(header, "section").length + 1, 6);
      const h = `h${depth}`;
      if (header.localName !== h) {
        renameElement(header, h);
      }
    });
  }

  function getNonintroductorySectionHeaders() {
    return [
      ...document.querySelectorAll(
        "section:not(.introductory) :is(h1,h2,h3,h4,h5,h6):first-child"
      ),
    ].filter(elem => !elem.closest("section.introductory"));
  }

  /**
   * Skip descendent sections from appearing in ToC using data-max-toc.
   */
  function skipFromToC() {
    /** @type {NodeListOf<HTMLElement>} */
    const sections = document.querySelectorAll("section[data-max-toc]");
    for (const section of sections) {
      const maxToc = parseInt(section.dataset.maxToc, 10);
      if (maxToc < 0 || maxToc > 6 || Number.isNaN(maxToc)) {
        const msg = "`data-max-toc` must have a value between 0-6 (inclusive).";
        showError(msg, name$w, { elements: [section] });
        continue;
      }

      // `data-max-toc=0` is equivalent to adding a ".notoc" to current section.
      if (maxToc === 0) {
        section.classList.add("notoc");
        continue;
      }

      // When `data-max-toc=2`, we skip all ":scope > section > section" from ToC
      // i.e., at §1, we will keep §1.1 but not §1.1.1
      // Similarly, `data-max-toc=1` will keep §1, but not §1.1
      const sectionToSkipFromToC = section.querySelectorAll(
        `:scope > ${Array.from({ length: maxToc }, () => "section").join(" > ")}`
      );
      for (const el of sectionToSkipFromToC) {
        el.classList.add("notoc");
      }
    }
  }

  /**
   * @param {HTMLElement} ol
   */
  function createTableOfContents(ol) {
    if (!ol) {
      return;
    }
    const nav = html`<nav id="toc"></nav>`;
    const h2 = html`<h2 class="introductory">${l10n$g.toc}</h2>`;
    addId(h2);
    nav.append(h2, ol);
    const ref =
      document.getElementById("toc") ||
      document.getElementById("sotd") ||
      document.getElementById("abstract");
    if (ref) {
      if (ref.id === "toc") {
        ref.replaceWith(nav);
      } else {
        ref.after(nav);
      }
    }

    const link = html`<p role="navigation" id="back-to-top">
    <a href="#title"><abbr title="Back to Top">&uarr;</abbr></a>
  </p>`;
    document.body.append(link);
  }

  var structure = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$w,
    run: run$u
  });

  // @ts-check

  const name$v = "core/informative";

  const localizationStrings$g = {
    en: {
      informative: "This section is non-normative.",
    },
    nl: {
      informative: "Dit onderdeel is niet normatief.",
    },
    ko: {
      informative: "이 부분은 비규범적입니다.",
    },
    ja: {
      informative: "この節は仕様には含まれません．",
    },
    de: {
      informative: "Dieser Abschnitt ist nicht normativ.",
    },
    zh: {
      informative: "本章节不包含规范性内容。",
    },
  };

  const l10n$f = getIntlData(localizationStrings$g);

  function run$t() {
    Array.from(document.querySelectorAll("section.informative"))
      .map(informative => informative.querySelector("h2, h3, h4, h5, h6"))
      .filter(heading => heading)
      .forEach(heading => {
        heading.after(html`<p><em>${l10n$f.informative}</em></p>`);
      });
  }

  var informative = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$v,
    run: run$t
  });

  /* container for stats */
  const css$c = String.raw;

  // Prettier ignore only to keep code indented from level 0.
  // prettier-ignore
  var css$d = css$c`
.caniuse-stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: baseline;
}

button.caniuse-cell {
  margin: 1px 1px 0 0;
  border: none;
}

.caniuse-browser {
  position: relative;
}

/* handle case when printing */
@media print {
  .caniuse-cell.y::before {
    content: "✔️";
    padding: 0.5em;
  }

  .caniuse-cell.n::before {
    content: "❌";
    padding: 0.5em;
  }

  .caniuse-cell:is(.a,.d,.p,.x)::before {
    content: "⚠️";
    padding: 0.5em;
  }
}

/* reset styles, hide old versions by default */
.caniuse-browser ul {
  display: none;
  margin: 0;
  padding: 0;
  list-style: none;
  position: absolute;
  left: 0;
  z-index: 2;
  background: #fff;
  margin-top: 1px;
}

.caniuse-stats a[href] {
  white-space: nowrap;
  align-self: center;
  margin-left: 0.5em;
}

/* a browser version */
.caniuse-cell {
  display: flex;
  font-size: 90%;
  height: 0.8cm;
  margin-right: 1px;
  margin-top: 0;
  min-width: 3cm;
  overflow: visible;
  justify-content: center;
  align-items: center;

  --supported: #2a8436;
  --no-support: #c44230;
  --no-support-alt: #b43b2b;
  --partial: #807301;
  --partial-alt: #746c00;

  color: #fff;
  background: repeating-linear-gradient(
    var(--caniuse-angle, 45deg),
    var(--caniuse-bg) 0,
    var(--caniuse-bg-alt) 1px,
    var(--caniuse-bg-alt) 0.4em,
    var(--caniuse-bg) calc(0.25em + 1px),
    var(--caniuse-bg) 0.75em
  );
}

li.caniuse-cell {
  margin-bottom: 1px;
}

.caniuse-cell:focus {
  outline: none;
}

/* supports */
.caniuse-cell.y {
  background: var(--supported);
}

/* no support, disabled by default */
.caniuse-cell:is(.n,.d) {
  --caniuse-angle: 45deg;
  --caniuse-bg: var(--no-support);
  --caniuse-bg-alt: var(--no-support-alt);
}

.caniuse-cell.d {
  --caniuse-angle: 180deg;
}

/* not supported by default / partial support etc
see https://github.com/Fyrd/caniuse/blob/master/CONTRIBUTING.md for stats */
.caniuse-cell:is(.a,.x,.p) {
  --caniuse-angle: 90deg;
  --caniuse-bg: var(--partial);
  --caniuse-bg-alt: var(--partial-alt);
}

/* show rest of the browser versions */
.caniuse-stats button:focus + ul,
.caniuse-stats .caniuse-browser:hover > ul {
  display: block;
}
`;

  // @ts-check

  const name$u = "core/caniuse";

  const API_URL = "https://respec.org/caniuse/";

  const BROWSERS = new Set([
    "and_chr",
    "and_ff",
    "and_uc",
    "android",
    "bb",
    "chrome",
    "edge",
    "firefox",
    "ie",
    "ios_saf",
    "op_mini",
    "op_mob",
    "opera",
    "safari",
    "samsung",
  ]);

  function prepare(conf) {
    if (!conf.caniuse) {
      return; // nothing to do.
    }
    const options = getNormalizedConf(conf);
    conf.caniuse = options; // for tests
    if (!options.feature) {
      return; // no feature to show
    }

    document.head.appendChild(html`<style
    id="caniuse-stylesheet"
    class="${options.removeOnSave ? "removeOnSave" : ""}"
  >
    ${css$d}
  </style>`);

    const apiUrl = options.apiURL || API_URL;
    // Initiate a fetch, but do not wait. Try to fill the cache early instead.
    conf.state[name$u] = {
      fetchPromise: fetchStats(apiUrl, options),
    };
  }

  async function run$s(conf) {
    const options = conf.caniuse;
    if (!options?.feature) return;

    const featureURL = new URL(options.feature, "https://caniuse.com/").href;

    const headDlElem = document.querySelector(".head dl");
    const contentPromise = (async () => {
      try {
        const stats = await conf.state[name$u].fetchPromise;
        return html`${{ html: stats }}`;
      } catch (err) {
        const msg = `Couldn't find feature "${options.feature}" on caniuse.com.`;
        const hint = docLink`Please check the feature key on [caniuse.com](https://caniuse.com) and update ${"[caniuse]"}`;
        showError(msg, name$u, { hint });
        console.error(err);
        return html`<a href="${featureURL}">caniuse.com</a>`;
      }
    })();
    const definitionPair = html`<dt class="caniuse-title">
      Browser support (caniuse.com):
    </dt>
    <dd class="caniuse-stats">
      ${{
        any: contentPromise,
        placeholder: "Fetching data from caniuse.com...",
      }}
    </dd>`;
    headDlElem.append(...definitionPair.childNodes);
    await contentPromise;
    pub("amend-user-config", { caniuse: options.feature });
    if (options.removeOnSave) {
      // Will remove the browser support cells.
      headDlElem
        .querySelectorAll(".caniuse-browser")
        .forEach(elem => elem.classList.add("removeOnSave"));
      sub("beforesave", outputDoc => {
        html.bind(outputDoc.querySelector(".caniuse-stats"))`
        <a href="${featureURL}">caniuse.com</a>`;
      });
    }
  }

  /**
   * returns normalized `conf.caniuse` configuration
   * @param {Object} conf   configuration settings
   */
  function getNormalizedConf(conf) {
    const DEFAULTS = { versions: 4, removeOnSave: false };
    if (typeof conf.caniuse === "string") {
      return { feature: conf.caniuse, ...DEFAULTS };
    }
    const caniuseConf = { ...DEFAULTS, ...conf.caniuse };
    const { browsers } = caniuseConf;
    if (Array.isArray(browsers)) {
      const invalidBrowsers = browsers.filter(browser => !BROWSERS.has(browser));
      if (invalidBrowsers.length) {
        const names = codedJoinAnd(invalidBrowsers, { quotes: true });
        const msg = docLink`Invalid browser(s): (${names}) in the \`browser\` property of ${"[caniuse]"}.`;
        showWarning(msg, name$u);
      }
    }
    return caniuseConf;
  }

  /**
   * @param {string} apiURL
   * @typedef {Record<string, [string, string[]][]>} ApiResponse
   * @throws {Error} on failure
   */
  async function fetchStats(apiURL, options) {
    const { feature, versions, browsers } = options;
    const searchParams = new URLSearchParams();
    searchParams.set("feature", feature);
    searchParams.set("versions", versions);
    if (Array.isArray(browsers)) {
      searchParams.set("browsers", browsers.join(","));
    }
    searchParams.set("format", "html");
    const url = `${apiURL}?${searchParams.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
      const { status, statusText } = response;
      throw new Error(`Failed to get caniuse data: (${status}) ${statusText}`);
    }
    const stats = await response.text();
    return stats;
  }

  var caniuse = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$u,
    prepare: prepare,
    run: run$s
  });

  const css$a = String.raw;

  // Prettier ignore only to keep code indented from level 0.
  // prettier-ignore
  var css$b = css$a`
.mdn {
  font-size: 0.75em;
  position: absolute;
  right: 0.3em;
  min-width: 0;
  margin-top: 3em;
}

.mdn details {
  width: 100%;
  margin: 1px 0;
  position: relative;
  z-index: 10;
  box-sizing: border-box;
  padding: 0.4em;
  padding-top: 0;
}

.mdn details[open] {
  min-width: 25ch;
  max-width: 32ch;
  background: #fff;
  box-shadow: 0 1em 3em -0.4em rgba(0, 0, 0, 0.3),
    0 0 1px 1px rgba(0, 0, 0, 0.05);
  border-radius: 2px;
  z-index: 11;
  margin-bottom: 0.4em;
}

.mdn summary {
  text-align: right;
  cursor: default;
  margin-right: -0.4em;
}

.mdn summary span {
  font-family: zillaslab, Palatino, "Palatino Linotype", serif;
  color: #fff;
  background-color: #000;
  display: inline-block;
  padding: 3px;
}

.mdn a {
  display: inline-block;
  word-break: break-all;
}

.mdn p {
  margin: 0;
}

.mdn .engines-all {
  color: #058b00;
}
.mdn .engines-some {
  color: #b00;
}

.mdn table {
  width: 100%;
  font-size: 0.9em;
}

.mdn td {
  border: none;
}

.mdn td:nth-child(2) {
  text-align: right;
}

.mdn .nosupportdata {
  font-style: italic;
  margin: 0;
}

.mdn tr::before {
  content: "";
  display: table-cell;
  width: 1.5em;
  height: 1.5em;
  background: no-repeat center center / contain;
  font-size: 0.75em;
}

.mdn .no,
.mdn .unknown {
  color: #cccccc;
  filter: grayscale(100%);
}

.mdn .no::before,
.mdn .unknown::before {
  opacity: 0.5;
}

.mdn .chrome::before,
.mdn .chrome_android::before {
  background-image: url(https://resources.whatwg.org/browser-logos/chrome.svg);
}

.mdn .edge::before,
.mdn .edge_mobile::before {
  background-image: url(https://resources.whatwg.org/browser-logos/edge.svg);
}

.mdn .firefox::before,
.mdn .firefox_android::before {
  background-image: url(https://resources.whatwg.org/browser-logos/firefox.png);
}

.mdn .ie::before {
  background-image: url(https://resources.whatwg.org/browser-logos/ie.png);
}

.mdn .opera::before,
.mdn .opera_android::before {
  background-image: url(https://resources.whatwg.org/browser-logos/opera.svg);
}

.mdn .safari::before {
  background-image: url(https://resources.whatwg.org/browser-logos/safari.png);
}

.mdn .safari_ios::before {
  background-image: url(https://resources.whatwg.org/browser-logos/safari-ios.svg);
}

.mdn .samsunginternet_android::before {
  background-image: url(https://resources.whatwg.org/browser-logos/samsung.svg);
}

.mdn .webview_android::before {
  background-image: url(https://resources.whatwg.org/browser-logos/android-webview.png);
}
`;

  // @ts-check

  const name$t = "core/mdn-annotation";

  const BASE_JSON_PATH = "https://w3c.github.io/mdn-spec-links/";
  const MDN_URL_BASE = "https://developer.mozilla.org/en-US/docs/Web/";
  const MDN_BROWSERS = {
    // The browser IDs here must match the ones in the imported JSON data.
    // See the list of browser IDs at:
    // https://github.com/mdn/browser-compat-data/blob/master/schemas/compat-data-schema.md#browser-identifiers.
    chrome: "Chrome",
    chrome_android: "Chrome Android",
    edge: "Edge",
    edge_mobile: "Edge Mobile",
    firefox: "Firefox",
    firefox_android: "Firefox Android",
    ie: "Internet Explorer",
    // nodejs: "Node.js", // no data for features in HTML
    opera: "Opera",
    opera_android: "Opera Android",
    // qq_android: "QQ Browser", // not enough data for features in HTML
    safari: "Safari",
    safari_ios: "Safari iOS",
    samsunginternet_android: "Samsung Internet",
    // uc_android: "UC browser", // not enough data for features in HTML
    // uc_chinese_android: "Chinese UC Browser", // not enough data for features in HTML
    webview_android: "WebView Android",
  };

  const localizationStrings$f = {
    en: {
      inAllEngines: "This feature is in all major engines.",
      inSomeEngines: "This feature has limited support.",
    },
    zh: {
      inAllEngines: "所有主要引擎均支持此特性。",
      inSomeEngines: "此功能支持有限。",
    },
  };
  const l10n$e = getIntlData(localizationStrings$f);

  /**
   * @param {HTMLElement} node
   */
  function insertMDNBox(node) {
    const targetAncestor = node.closest("section");
    if (!targetAncestor) return;
    const { previousElementSibling: targetSibling } = targetAncestor;
    if (targetSibling && targetSibling.classList.contains("mdn")) {
      // If the target ancestor already has a mdnBox inserted, we just use it
      return targetSibling;
    }
    const mdnBox = html`<aside class="mdn"></aside>`;
    targetAncestor.before(mdnBox);
    return mdnBox;
  }

  /**
   * @param {MdnEntry} mdnSpec
   * @returns {HTMLDetailsElement}
   */
  function attachMDNDetail(mdnSpec) {
    const { name, slug, summary, support, engines } = mdnSpec;
    const mdnSubPath = slug.slice(slug.indexOf("/") + 1);
    const href = `${MDN_URL_BASE}${slug}`;
    const label = `Expand MDN details for ${name}`;
    const engineSupport = getEngineSupportIcons(engines);
    return html`<details>
    <summary aria-label="${label}"><span>MDN</span>${engineSupport}</summary>
    <a title="${summary}" href="${href}">${mdnSubPath}</a>
    ${getEngineSupport(engines)}
    ${support
      ? buildBrowserSupportTable(support)
      : html`<p class="nosupportdata">No support data.</p>`}
  </details>`;
  }

  /**
   * @param {MdnEntry['support']} support
   * @returns {HTMLTableElement}
   */
  function buildBrowserSupportTable(support) {
    /**
     * @param {string | keyof MDN_BROWSERS} browserId
     * @param {"Yes" | "No" | "Unknown"} yesNoUnknown
     * @param {string} version
     * @returns {HTMLTableRowElement}
     */
    function createRow(browserId, yesNoUnknown, version) {
      const displayStatus = yesNoUnknown === "Unknown" ? "?" : yesNoUnknown;
      const classList = `${browserId} ${yesNoUnknown.toLowerCase()}`;
      return html`<tr class="${classList}">
      <td>${MDN_BROWSERS[browserId]}</td>
      <td>${version ? version : displayStatus}</td>
    </tr>`;
    }

    /**
     * @param {string | keyof MDN_BROWSERS} browserId
     * @param {VersionDetails} versionData
     */
    function createRowFromBrowserData(browserId, versionData) {
      if (versionData.version_removed) {
        return createRow(browserId, "No", "");
      }
      const versionAdded = versionData.version_added;
      if (typeof versionAdded === "boolean") {
        return createRow(browserId, versionAdded ? "Yes" : "No", "");
      } else if (!versionAdded) {
        return createRow(browserId, "Unknown", "");
      } else {
        return createRow(browserId, "Yes", `${versionAdded}+`);
      }
    }

    return html`<table>
    ${Object.keys(MDN_BROWSERS).map(browserId => {
      return support[browserId]
        ? createRowFromBrowserData(browserId, support[browserId])
        : createRow(browserId, "Unknown", "");
    })}
  </table>`;
  }

  async function run$r(conf) {
    const mdnKey = getMdnKey(conf);
    if (!mdnKey) return;

    const mdnSpecJson = await getMdnData(mdnKey, conf.mdn);
    if (!mdnSpecJson) return;

    const style = document.createElement("style");
    style.textContent = css$b;
    document.head.append(style);

    for (const elem of findElements(mdnSpecJson)) {
      const mdnSpecArray = mdnSpecJson[elem.id];
      const mdnBox = insertMDNBox(elem);
      if (!mdnBox) continue;
      for (const spec of mdnSpecArray) {
        mdnBox.append(attachMDNDetail(spec));
      }
    }
  }

  /** @returns {string} */
  function getMdnKey(conf) {
    const { shortName, mdn } = conf;
    if (!mdn) return;
    if (typeof mdn === "string") return mdn;
    return mdn.key || shortName;
  }

  /**
   * @param {string} key MDN key
   * @param {object} mdnConf
   * @param {string} [mdnConf.specMapUrl]
   * @param {string} [mdnConf.baseJsonPath]
   * @param {number} [mdnConf.maxAge]
   *
   * @typedef {{ version_added: string|boolean|null, version_removed?: string }} VersionDetails
   * @typedef {Record<string | keyof MDN_BROWSERS, VersionDetails>} MdnSupportEntry
   * @typedef {{ name: string, title: string, slug: string, summary: string, support: MdnSupportEntry, engines: string[] }} MdnEntry
   * @typedef {Record<string, MdnEntry[]>} MdnData
   * @returns {Promise<MdnData|undefined>}
   */
  async function getMdnData(key, mdnConf) {
    const { baseJsonPath = BASE_JSON_PATH, maxAge = 60 * 60 * 24 * 1000 } =
      mdnConf;
    const url = new URL(`${key}.json`, baseJsonPath).href;
    const res = await fetchAndCache(url, maxAge);
    if (res.status === 404) {
      const msg = `Could not find MDN data associated with key "${key}".`;
      const hint = "Please add a valid key to `respecConfig.mdn`";
      showError(msg, name$t, { hint });
      return;
    }
    return await res.json();
  }

  /**
   * Find elements that can have an annotation box attached.
   * @param {MdnData} data
   */
  function findElements(data) {
    /** @type {NodeListOf<HTMLElement>} */
    const elemsWithId = document.body.querySelectorAll("[id]:not(script)");
    return [...elemsWithId].filter(({ id }) => Array.isArray(data[id]));
  }

  /**
   * @param {MdnEntry['engines']} engines
   * @returns {HTMLSpanElement}
   */
  function getEngineSupportIcons(engines) {
    if (engines.length === 3) {
      return html`<span title="${l10n$e.inAllEngines}">✅</span>`;
    }
    if (engines.length < 2) {
      return html`<span title="${l10n$e.inSomeEngines}">🚫</span>`;
    }
    return html`<span>&emsp;</span>`;
  }

  /**
   * @param {MdnEntry['engines']} engines
   * @returns {HTMLParagraphElement|undefined}
   */
  function getEngineSupport(engines) {
    if (engines.length === 3) {
      return html`<p class="engines-all">${l10n$e.inAllEngines}</p>`;
    }
    if (engines.length < 2) {
      return html`<p class="engines-some">${l10n$e.inSomeEngines}</p>`;
    }
  }

  var mdnAnnotation = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$t,
    run: run$r
  });

  // @ts-check

  const mimeTypes = new Map([
    ["text/html", "html"],
    ["application/xml", "xml"],
    ["application/cms", "cms"],
  ]);

  /**
   * Creates a dataURI from a ReSpec document. It also cleans up the document
   * removing various things.
   *
   * @param {String} mimeType mimetype. one of `mimeTypes` above
   * @param {Document} doc document to export. useful for testing purposes
   * @returns a stringified data-uri of document that can be saved.
   */
  function rsDocToCmsDataURL(mimeType, doc = document) {
    const format = mimeTypes.get(mimeType);
    if (!format) {
      const validTypes = [...mimeTypes.values()].join(", ");
      const msg = `Invalid format: ${mimeType}. Expected one of: ${validTypes}.`;
      throw new TypeError(msg);
    }
    const data = serialize(format, doc);
    const encodedString = encodeURIComponent(data);
    return `data:${mimeType};charset=utf-8,${encodedString}`;
  }

  function serialize(format, doc) {
    const cloneDoc = doc.cloneNode(true);
    cleanup(cloneDoc);
    let result = "";
    switch (format) {
      case "xml":
        result = new XMLSerializer().serializeToString(cloneDoc);
        break;
      case "cms":
        createCmsExtract(cloneDoc.body);
        result += cloneDoc.body.innerHTML;
        break;
      default: {
        if (cloneDoc.doctype) {
          result += new XMLSerializer().serializeToString(cloneDoc.doctype);
        }
        result += cloneDoc.documentElement.outerHTML;
      }
    }
    return result;
  }

  function cleanup(cloneDoc) {
    const { head, body, documentElement } = cloneDoc;
    removeCommentNodes(cloneDoc);

    cloneDoc
      .querySelectorAll(".removeOnSave, #toc-nav")
      .forEach(elem => elem.remove());
    body.classList.remove("toc-sidebar");
    removeReSpec(documentElement);

    const insertions = cloneDoc.createDocumentFragment();

    // Move meta viewport, as it controls the rendering on mobile.
    const metaViewport = cloneDoc.querySelector("meta[name='viewport']");
    if (metaViewport && head.firstChild !== metaViewport) {
      insertions.appendChild(metaViewport);
    }

    // Move charset to near top, as it needs to be in the first 512 bytes.
    let metaCharset = cloneDoc.querySelector(
      "meta[charset], meta[content*='charset=']"
    );
    if (!metaCharset) {
      metaCharset = html`<meta charset="utf-8" />`;
    }
    insertions.appendChild(metaCharset);

    // Add meta generator
    const respecVersion = `ReSpec ${window.respecVersion || "Developer Channel"}`;
    const metaGenerator = html`
    <meta name="generator" content="${respecVersion}" />
  `;

    insertions.appendChild(metaGenerator);
    head.prepend(insertions);
    pub("beforesave", documentElement);
  }

  /**
   * Strip content that is not allowed in Drupal or other CMS.
   *
   * @param {HTMLElement} docBody The document body element
   */
  function createCmsExtract(docBody) {
    let started = false;
    let finished = false;
    docBody.childNodes.forEach(node => {
      if (!started) {
        if (node.nodeName !== "HEADER") {
          node.remove();
        } else {
          started = true;
        }
      } else if (!finished) {
        if (node.nodeName == "FOOTER") {
          finished = true;
        } else if (node.nodeName == "SCRIPT") {
          node.remove();
        } else if (node.nodeName == "STYLE") {
          node.remove();
        }
      } else {
        node.remove();
      }
    });
  }

  expose("ims/exporter", { rsDocToCmsDataURL });

  // @ts-check

  const name$s = "ui/save-html";

  const localizationStrings$e = {
    en: {
      save_snapshot: "Export",
    },
    nl: {
      save_snapshot: "Bewaar Snapshot",
    },
    ja: {
      save_snapshot: "保存する",
    },
    de: {
      save_snapshot: "Exportieren",
    },
    zh: {
      save_snapshot: "导出",
    },
  };
  const l10n$d = getIntlData(localizationStrings$e);

  const downloadLinks = [
    {
      id: "respec-save-as-html",
      ext: "html",
      title: "HTML",
      type: "text/html",
      get href() {
        return rsDocToDataURL(this.type);
      },
    },
    {
      id: "respec-save-as-xml",
      ext: "xhtml",
      title: "XML",
      type: "application/xml",
      get href() {
        return rsDocToDataURL(this.type);
      },
    },
    {
      id: "respec-save-as-epub",
      ext: "epub",
      title: "EPUB 3",
      type: "application/epub+zip",
      get href() {
        // Create and download an EPUB 3.2 version of the content
        // Using the EPUB 3.2 conversion service set up at labs.w3.org/r2epub
        // For more details on that service, see https://github.com/iherman/respec2epub
        const epubURL = new URL("https://labs.w3.org/r2epub/");
        epubURL.searchParams.append("respec", "true");
        epubURL.searchParams.append("url", document.location.href);
        return epubURL.href;
      },
    },
    {
      id: "respec-save-as-cms-extract",
      ext: "txt",
      title: "CMS EXTRACT",
      type: "application/cms",
      get href() {
        return rsDocToCmsDataURL(this.type);
      },
    },
  ];

  /**
   * @param {typeof downloadLinks[0]} details
   */
  function toDownloadLink(details, conf) {
    const { id, href, ext, title, type } = details;
    const date = concatDate(conf.publishDate || new Date());
    const filename = [conf.specStatus, conf.shortName || "spec", date].join("-");
    return html`<a
    href="${href}"
    id="${id}"
    download="${filename}.${ext}"
    type="${type}"
    class="respec-save-button"
    onclick=${() => ui.closeModal()}
    >${title}</a
  >`;
  }

  function run$q(conf) {
    const saveDialog = {
      async show(button) {
        await document.respec.ready;
        const div = html`<div class="respec-save-buttons">
        ${downloadLinks.map(details => toDownloadLink(details, conf))}
      </div>`;
        ui.freshModal(l10n$d.save_snapshot, div, button);
      },
    };

    const supportsDownload = "download" in HTMLAnchorElement.prototype;
    let button;
    if (supportsDownload) {
      button = ui.addCommand(l10n$d.save_snapshot, show, "Ctrl+Shift+Alt+S", "💾");
    }

    function show() {
      if (!supportsDownload) return;
      saveDialog.show(button);
    }
  }

  /**
   * @param {*} _
   * @param {string} mimeType
   */
  function exportDocument(_, mimeType) {
    const msg =
      "Exporting via ui/save-html module's `exportDocument()` is deprecated and will be removed.";
    const hint = "Use core/exporter `rsDocToDataURL()` instead.";
    showWarning(msg, name$s, { hint });
    return rsDocToDataURL(mimeType);
  }

  var saveHtml = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$s,
    run: run$q,
    exportDocument: exportDocument
  });

  // @ts-check

  const URL$2 = "https://respec.org/specref/";

  const localizationStrings$d = {
    en: {
      search_specref: "Search Specref",
    },
    nl: {
      search_specref: "Doorzoek Specref",
    },
    ja: {
      search_specref: "仕様検索",
    },
    de: {
      search_specref: "Spezifikationen durchsuchen",
    },
    zh: {
      search_specref: "搜索 Specref",
    },
  };
  const l10n$c = getIntlData(localizationStrings$d);

  const button$2 = ui.addCommand(
    l10n$c.search_specref,
    show$2,
    "Ctrl+Shift+Alt+space",
    "🔎"
  );

  function show$2() {
    const onLoad = e => e.target.classList.add("ready");
    /** @type {HTMLElement} */
    const specrefSearchUI = html`
    <iframe class="respec-iframe" src="${URL$2}" onload=${onLoad}></iframe>
    <a href="${URL$2}" target="_blank">Open Search UI in a new tab</a>
  `;
    ui.freshModal(l10n$c.search_specref, specrefSearchUI, button$2);
  }

  var searchSpecref = /*#__PURE__*/Object.freeze({
    __proto__: null
  });

  // @ts-check

  const URL$1 = "https://respec.org/xref/";

  const localizationStrings$c = {
    en: {
      title: "Search definitions",
    },
    ja: {
      title: "定義検索",
    },
    de: {
      title: "Definitionen durchsuchen",
    },
    zh: {
      title: "搜索定义",
    },
  };
  const lang = lang$2 in localizationStrings$c ? lang$2 : "en";
  const l10n$b = localizationStrings$c[lang];

  const button$1 = ui.addCommand(l10n$b.title, show$1, "Ctrl+Shift+Alt+x", "📚");

  function show$1() {
    const onLoad = e => e.target.classList.add("ready");
    const xrefSearchUI = html`
    <iframe class="respec-iframe" src="${URL$1}" onload="${onLoad}"></iframe>
    <a href="${URL$1}" target="_blank">Open Search UI in a new tab</a>
  `;
    ui.freshModal(l10n$b.title, xrefSearchUI, button$1);
  }

  var searchXref = /*#__PURE__*/Object.freeze({
    __proto__: null
  });

  // @ts-check

  const localizationStrings$b = {
    en: {
      about_respec: "About",
    },
    zh: {
      about_respec: "关于",
    },
    nl: {
      about_respec: "Over",
    },
    ja: {
      about_respec: "これについて",
    },
    de: {
      about_respec: "Über",
    },
  };
  const l10n$a = getIntlData(localizationStrings$b);

  // window.respecVersion is added at build time (see tools/builder.js)
  window.respecVersion = window.respecVersion || "Developer Edition";
  const div = document.createElement("div");
  const render = html.bind(div);
  const button = ui.addCommand(
    `${l10n$a.about_respec} ${window.respecVersion}`,
    show,
    "Ctrl+Shift+Alt+A",
    "ℹ️"
  );

  function show() {
    const entries = [];
    if ("getEntriesByType" in performance) {
      performance
        .getEntriesByType("measure")
        .sort((a, b) => b.duration - a.duration)
        .map(({ name, duration }) => {
          const humanDuration =
            duration > 1000
              ? `${Math.round(duration / 1000.0)} second(s)`
              : `${duration.toFixed(2)} milliseconds`;
          return { name, duration: humanDuration };
        })
        .map(perfEntryToTR)
        .forEach(entry => {
          entries.push(entry);
        });
    }
    render`
  <p>
    ReSpec is a document production toolchain, with a notable focus on W3C specifications.
  </p>
  <p>
    <a href='https://respec.org/docs'>Documentation</a>,
    <a href='https://github.com/w3c/respec/issues'>Bugs</a>.
  </p>
  <table border="1" width="100%" hidden="${entries.length ? false : true}">
    <caption>
      Loaded plugins
    </caption>
    <thead>
      <tr>
        <th>
          Plugin Name
        </th>
        <th>
          Processing time
        </th>
      </tr>
    </thead>
    <tbody>${entries}</tbody>
  </table>
`;
    ui.freshModal(`${l10n$a.about_respec} - ${window.respecVersion}`, div, button);
  }

  function perfEntryToTR({ name, duration }) {
    const moduleURL = `https://github.com/w3c/respec/blob/develop/src/${name}.js`;
    return html`
    <tr>
      <td><a href="${moduleURL}">${name}</a></td>
      <td>${duration}</td>
    </tr>
  `;
  }

  var aboutRespec = /*#__PURE__*/Object.freeze({
    __proto__: null
  });

  // @ts-check
  /**
   * This Module adds a metatag description to the document, based on the
   * first paragraph of the abstract.
   */

  const name$r = "core/seo";

  function run$p() {
    const firstParagraph = document.querySelector("#abstract p:first-of-type");
    if (!firstParagraph) {
      return; // no abstract, so nothing to do
    }
    // Normalize whitespace: trim, remove new lines, tabs, etc.
    const content = firstParagraph.textContent.replace(/\s+/, " ").trim();
    const metaElem = document.createElement("meta");
    metaElem.name = "description";
    metaElem.content = content;
    document.head.appendChild(metaElem);
  }

  var seo$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$r,
    run: run$p
  });

  // @ts-check
  const name$q = "ims/seo";

  /**
   * Add a canonical href
   *
   * @param {*} conf respecConfig
   *
   * Can be run before or after core/seo
   */
  async function run$o(conf) {
    const linkElem = document.createElement("link");
    linkElem.setAttribute("rel", "canonical");
    linkElem.setAttribute("href", conf.thisURL);
    document.head.appendChild(linkElem);
  }

  var seo = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$q,
    run: run$o
  });

  /*
  Adapted from Atom One Light by Daniel Gamage for ReSpec, with better color contrast
  Original One Light Syntax theme from https://github.com/atom/one-light-syntax
  base:    #fafafa
  mono-1:  #383a42
  mono-2:  #686b77
  mono-3:  #a0a1a7
  hue-1:   #0184bb
  hue-2:   #4078f2
  hue-3:   #a626a4
  hue-4:   #50a14f
  hue-5:   #e45649
  hue-5-2: #c91243
  hue-6:   #986801
  hue-6-2: #c18401
  */

  const css$8 = String.raw;

  // Prettier ignore only to keep code indented from level 0.
  // prettier-ignore
  var css$9 = css$8`
.hljs {
  display: block;
  overflow-x: auto;
  padding: 0.5em;
  color: #383a42;
  background: #fafafa;
}

.hljs-comment,
.hljs-quote {
  color: #717277;
  font-style: italic;
}

.hljs-doctag,
.hljs-keyword,
.hljs-formula {
  color: #a626a4;
}

.hljs-section,
.hljs-name,
.hljs-selector-tag,
.hljs-deletion,
.hljs-subst {
  color: #ca4706;
  font-weight: bold;
}

.hljs-literal {
  color: #0b76c5;
}

.hljs-string,
.hljs-regexp,
.hljs-addition,
.hljs-attribute,
.hljs-meta-string {
  color: #42803c;
}

.hljs-built_in,
.hljs-class .hljs-title {
  color: #9a6a01;
}

.hljs-attr,
.hljs-variable,
.hljs-template-variable,
.hljs-type,
.hljs-selector-class,
.hljs-selector-attr,
.hljs-selector-pseudo,
.hljs-number {
  color: #986801;
}

.hljs-symbol,
.hljs-bullet,
.hljs-link,
.hljs-meta,
.hljs-selector-id,
.hljs-title {
  color: #336ae3;
}

.hljs-emphasis {
  font-style: italic;
}

.hljs-strong {
  font-weight: bold;
}

.hljs-link {
  text-decoration: underline;
}
`;

  /**
   * @param {string} path
   */
  async function fetchBase(path) {
    const response = await fetch(new URL(`../../${path}`, (document.currentScript && document.currentScript.src || new URL('respec-ims-default.js', document.baseURI).href)));
    return await response.text();
  }

  // @ts-check
  /**
   * Module core/worker
   *
   * Exports a Web Worker for ReSpec, allowing for
   * multi-threaded processing of things.
   */
  const name$p = "core/worker";
  // Opportunistically preload syntax highlighter
  /** @type ResourceHintOption */
  const hint = {
    hint: "preload",
    href: "https://www.w3.org/Tools/respec/respec-highlight",
    as: "script",
  };
  const link = createResourceHint(hint);
  document.head.appendChild(link);

  async function loadWorkerScript() {
    try {
      return (await Promise.resolve().then(function () { return respecWorker$1; })).default;
    } catch {
      return fetchBase("worker/respec-worker.js");
    }
  }

  async function createWorker() {
    const workerScript = await loadWorkerScript();
    const workerURL = URL.createObjectURL(
      new Blob([workerScript], { type: "application/javascript" })
    );
    return new Worker(workerURL);
  }

  const workerPromise = createWorker();

  expose(
    name$p,
    workerPromise.then(worker => ({ worker }))
  );

  // @ts-check
  const name$o = "core/highlight";

  const nextMsgId = msgIdGenerator("highlight");

  function getLanguageHint(classList) {
    return Array.from(classList)
      .filter(item => item !== "highlight" && item !== "nolinks")
      .map(item => item.toLowerCase());
  }

  async function highlightElement(elem) {
    elem.setAttribute("aria-busy", "true");
    const languages = getLanguageHint(elem.classList);
    let response;
    try {
      response = await sendHighlightRequest(elem.innerText, languages);
    } catch (err) {
      console.error(err);
      return;
    }
    const { language, value } = response;
    switch (elem.localName) {
      case "pre":
        elem.classList.remove(language);
        elem.innerHTML = `<code class="hljs${
        language ? ` ${language}` : ""
      }">${value}</code>`;
        if (!elem.classList.length) elem.removeAttribute("class");
        break;
      case "code":
        elem.innerHTML = value;
        elem.classList.add("hljs");
        if (language) elem.classList.add(language);
        break;
    }
    elem.setAttribute("aria-busy", "false");
  }

  async function sendHighlightRequest(code, languages) {
    const msg = {
      action: "highlight",
      code,
      id: nextMsgId(),
      languages,
    };
    const worker = await workerPromise;
    worker.postMessage(msg);
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Timed out waiting for highlight."));
      }, 4000);
      worker.addEventListener("message", function listener(ev) {
        const {
          data: { id, language, value },
        } = ev;
        if (id !== msg.id) return; // not for us!
        worker.removeEventListener("message", listener);
        clearTimeout(timeoutId);
        resolve({ language, value });
      });
    });
  }

  async function run$n(conf) {
    // Nothing to highlight
    if (conf.noHighlightCSS) return;
    const highlightables = [
      ...document.querySelectorAll(`
    pre:not(.idl):not(.nohighlight) > code:not(.nohighlight),
    pre:not(.idl):not(.nohighlight),
    code.highlight
  `),
    ].filter(
      // Filter pre's that contain code
      elem => elem.localName !== "pre" || !elem.querySelector("code")
    );
    // Nothing to highlight
    if (!highlightables.length) {
      return;
    }
    const promisesToHighlight = highlightables
      .filter(elem => elem.textContent.trim())
      .map(highlightElement);
    document.head.appendChild(
      html`<style>
      ${css$9}
    </style>`
    );
    await Promise.all(promisesToHighlight);
  }

  var highlight = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$o,
    run: run$n
  });

  // @ts-check
  const localizationStrings$a = {
    en: {
      missing_test_suite_uri: docLink`Found tests in your spec, but missing ${"[testSuiteURI]"} in your ReSpec config.`,
      tests: "tests",
      test: "test",
    },
    ja: {
      missing_test_suite_uri: docLink`この仕様内にテストの項目を検出しましたが，ReSpec の設定に ${"[testSuiteURI]"} が見つかりません．`,
      tests: "テスト",
      test: "テスト",
    },
    de: {
      missing_test_suite_uri: docLink`Die Spezifikation enthält Tests, aber in der ReSpec-Konfiguration ist keine ${"[testSuiteURI]"} angegeben.`,
      tests: "Tests",
      test: "Test",
    },
    zh: {
      missing_test_suite_uri: docLink`本规范中包含测试，但在 ReSpec 配置中缺少 ${"[testSuiteURI]"}。`,
      tests: "测试",
      test: "测试",
    },
  };

  const l10n$9 = getIntlData(localizationStrings$a);

  const name$n = "core/data-tests";

  function toListItem(href) {
    const emojiList = [];
    const [testFile] = new URL(href).pathname.split("/").reverse();
    const testParts = testFile.split(".");
    let [testFileName] = testParts;

    const isSecureTest = testParts.find(part => part === "https");
    if (isSecureTest) {
      const requiresConnectionEmoji = document.createElement("span");
      requiresConnectionEmoji.textContent = "🔒";
      requiresConnectionEmoji.setAttribute(
        "aria-label",
        "requires a secure connection"
      );
      requiresConnectionEmoji.setAttribute("title", "Test requires HTTPS");
      testFileName = testFileName.replace(".https", "");
      emojiList.push(requiresConnectionEmoji);
    }

    const isManualTest = testFileName
      .split(".")
      .join("-")
      .split("-")
      .find(part => part === "manual");
    if (isManualTest) {
      const manualPerformEmoji = document.createElement("span");
      manualPerformEmoji.textContent = "💪";
      manualPerformEmoji.setAttribute(
        "aria-label",
        "the test must be run manually"
      );
      manualPerformEmoji.setAttribute("title", "Manual test");
      testFileName = testFileName.replace("-manual", "");
      emojiList.push(manualPerformEmoji);
    }

    const testList = html`
    <li>
      <a href="${href}">${testFileName}</a>
      ${emojiList}
    </li>
  `;
    return testList;
  }

  function run$m(conf) {
    /** @type {NodeListOf<HTMLElement>} */
    const elems = document.querySelectorAll("[data-tests]");
    const testables = [...elems].filter(elem => elem.dataset.tests);

    if (!testables.length) {
      return;
    }
    if (!conf.testSuiteURI) {
      showError(l10n$9.missing_test_suite_uri, name$n);
      return;
    }

    for (const elem of testables) {
      const tests = elem.dataset.tests.split(/,/gm).map(url => url.trim());
      const testURLs = toTestURLs(tests, conf.testSuiteURI, elem);
      handleDuplicates(testURLs, elem);
      const details = toHTML$1(testURLs);
      elem.append(details);
    }
  }

  /**
   * @param {string[]} tests
   * @param {string} testSuiteURI
   * @param {HTMLElement} elem
   */
  function toTestURLs(tests, testSuiteURI, elem) {
    return tests
      .map(test => {
        try {
          return new URL(test, testSuiteURI).href;
        } catch {
          const msg = docLink`Invalid URL in ${"[data-tests]"} attribute: ${test}.`;
          showWarning(msg, name$n, { elements: [elem] });
        }
      })
      .filter(href => href);
  }

  /**
   * @param {string[]} testURLs
   * @param {HTMLElement} elem
   */
  function handleDuplicates(testURLs, elem) {
    const duplicates = testURLs.filter(
      (link, i, self) => self.indexOf(link) !== i
    );
    if (duplicates.length) {
      const msg = docLink`Duplicate tests found in the ${"[data-tests]"} attribute.`;
      const tests = codedJoinAnd(duplicates, { quotes: true });
      const hint = docLink`To fix, remove duplicates from ${"[data-tests]"}: ${tests}.`;
      showWarning(msg, name$n, { hint, elements: [elem] });
    }
  }

  /**
   * @param {string[]} testURLs
   */
  function toHTML$1(testURLs) {
    const uniqueList = [...new Set(testURLs)];
    const details = html`
    <details class="respec-tests-details removeOnSave">
      <summary>tests: ${uniqueList.length}</summary>
      <ul>
        ${uniqueList.map(toListItem)}
      </ul>
    </details>
  `;
    return details;
  }

  var dataTests = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$n,
    run: run$m
  });

  // @ts-check
  const name$m = "core/list-sorter";

  function makeSorter(direction) {
    const order = direction === "ascending" ? 1 : -1;
    return ({ textContent: a }, { textContent: b }) => {
      return order * a.trim().localeCompare(b.trim());
    };
  }
  /**
   * Shallow sort list items in OL, and UL elements.
   *
   * @param {HTMLUListElement} elem
   * @returns {DocumentFragment}
   */
  function sortListItems(elem, dir) {
    const elements = [...elem.querySelectorAll(":scope > li")];
    const sortedElements = elements.sort(makeSorter(dir)).reduce((frag, elem) => {
      frag.appendChild(elem);
      return frag;
    }, document.createDocumentFragment());
    return sortedElements;
  }

  /**
   * Shallow sort a definition list based on its definition terms (dt) elements.
   *
   * @param {HTMLDListElement} dl
   * @returns {DocumentFragment}
   */
  function sortDefinitionTerms(dl, dir) {
    const elements = [...dl.querySelectorAll(":scope > dt")];
    const sortedElements = elements.sort(makeSorter(dir)).reduce((frag, elem) => {
      const { nodeType, nodeName } = elem;
      const children = document.createDocumentFragment();
      let { nextSibling: next } = elem;
      while (next) {
        if (!next.nextSibling) {
          break;
        }
        children.appendChild(next.cloneNode(true));
        const { nodeType: nextType, nodeName: nextName } = next.nextSibling;
        const isSameType = nextType === nodeType && nextName === nodeName;
        if (isSameType) {
          break;
        }
        next = next.nextSibling;
      }
      children.prepend(elem.cloneNode(true));
      frag.appendChild(children);
      return frag;
    }, document.createDocumentFragment());
    return sortedElements;
  }

  function run$l() {
    /** @type {NodeListOf<HTMLElement>} */
    const sortables = document.querySelectorAll("[data-sort]");
    for (const elem of sortables) {
      let sortedElems;
      const dir = elem.dataset.sort || "ascending";
      switch (elem.localName) {
        case "dl": {
          const definition = /** @type {HTMLDListElement} */ (elem);
          sortedElems = sortDefinitionTerms(definition, dir);
          break;
        }
        case "ol":
        case "ul": {
          const list = /** @type {HTMLUListElement} */ (elem);
          sortedElems = sortListItems(list, dir);
          break;
        }
        default: {
          const msg = `ReSpec can't sort ${elem.localName} elements.`;
          showWarning(msg, name$m, { elements: [elem] });
        }
      }
      if (sortedElems) {
        const range = document.createRange();
        range.selectNodeContents(elem);
        range.deleteContents();
        elem.appendChild(sortedElems);
      }
    }
  }

  var listSorter = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$m,
    sortListItems: sortListItems,
    sortDefinitionTerms: sortDefinitionTerms,
    run: run$l
  });

  const css$6 = String.raw;

  // Prettier ignore only to keep code indented from level 0.
  // prettier-ignore
  var css$7 = css$6`
var:hover {
  text-decoration: underline;
  cursor: pointer;
}

var.respec-hl {
  color: var(--color, #000);
  background-color: var(--bg-color);
  box-shadow: 0 0 0px 2px var(--bg-color);
}

/* highlight colors
  https://github.com/w3c/tr-design/issues/152
*/
var.respec-hl-c1 {
  --bg-color: #f4d200;
}

var.respec-hl-c2 {
  --bg-color: #ff87a2;
}

var.respec-hl-c3 {
  --bg-color: #96e885;
}

var.respec-hl-c4 {
  --bg-color: #3eeed2;
}

var.respec-hl-c5 {
  --bg-color: #eacfb6;
}

var.respec-hl-c6 {
  --bg-color: #82ddff;
}

var.respec-hl-c7 {
  --bg-color: #ffbcf2;
}

@media print {
  var.respec-hl {
    background: none;
    color: #000;
    box-shadow: unset;
  }
}
`;

  // @ts-check

  const name$l = "core/highlight-vars";

  function run$k(conf) {
    if (!conf.highlightVars) {
      return;
    }
    const styleElement = document.createElement("style");
    styleElement.textContent = css$7;
    styleElement.classList.add("removeOnSave");
    document.head.appendChild(styleElement);

    document
      .querySelectorAll("var")
      .forEach(varElem => varElem.addEventListener("click", highlightListener));

    // remove highlights, cleanup empty class/style attributes
    sub("beforesave", outputDoc => {
      outputDoc.querySelectorAll("var.respec-hl").forEach(removeHighlight);
    });
  }

  function highlightListener(ev) {
    ev.stopPropagation();
    const { target: varElem } = ev;
    const hightligtedElems = highlightVars(varElem);
    const resetListener = () => {
      const hlColor = getHighlightColor(varElem);
      hightligtedElems.forEach(el => removeHighlight(el, hlColor));
      [...HL_COLORS.keys()].forEach(key => HL_COLORS.set(key, true));
    };
    if (hightligtedElems.length) {
      document.body.addEventListener("click", resetListener, { once: true });
    }
  }

  // availability of highlight colors. colors from var.css
  const HL_COLORS = new Map([
    ["respec-hl-c1", true],
    ["respec-hl-c2", true],
    ["respec-hl-c3", true],
    ["respec-hl-c4", true],
    ["respec-hl-c5", true],
    ["respec-hl-c6", true],
    ["respec-hl-c7", true],
  ]);

  function getHighlightColor(target) {
    // return current colors if applicable
    const { value } = target.classList;
    const re = /respec-hl-\w+/;
    const activeClass = re.test(value) && value.match(re);
    if (activeClass) return activeClass[0];

    // first color preference
    if (HL_COLORS.get("respec-hl-c1") === true) return "respec-hl-c1";

    // otherwise get some other available color
    return [...HL_COLORS.keys()].find(c => HL_COLORS.get(c)) || "respec-hl-c1";
  }

  function highlightVars(varElem) {
    const textContent = norm(varElem.textContent);
    const parent = varElem.closest("section");
    const highlightColor = getHighlightColor(varElem);

    const varsToHighlight = [...parent.querySelectorAll("var")].filter(
      el =>
        norm(el.textContent) === textContent && el.closest("section") === parent
    );

    // update availability of highlight color
    const colorStatus = varsToHighlight[0].classList.contains("respec-hl");
    HL_COLORS.set(highlightColor, colorStatus);

    // highlight vars
    if (colorStatus) {
      varsToHighlight.forEach(el => removeHighlight(el, highlightColor));
      return [];
    } else {
      varsToHighlight.forEach(el => addHighlight(el, highlightColor));
    }
    return varsToHighlight;
  }

  function removeHighlight(el, highlightColor) {
    el.classList.remove("respec-hl", highlightColor);
    // clean up empty class attributes so they don't come in export
    if (!el.classList.length) el.removeAttribute("class");
  }

  function addHighlight(elem, highlightColor) {
    elem.classList.add("respec-hl", highlightColor);
  }

  var highlightVars$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$l,
    run: run$k
  });

  /* dfn popup panel that list all local references to a dfn */
  /**
   * TODO: Revert changes due to https://github.com/w3c/respec/pull/2888 when
   * https://github.com/w3c/css-validator/pull/111 is fixed.
   */
  const css$4 = String.raw;

  // Prettier ignore only to keep code indented from level 0.
  // prettier-ignore
  var css$5 = css$4`
dfn {
  cursor: pointer;
}

.dfn-panel {
  position: absolute;
  z-index: 35;
  min-width: 300px;
  max-width: 500px;
  padding: 0.5em 0.75em;
  margin-top: 0.6em;
  font: small Helvetica Neue, sans-serif, Droid Sans Fallback;
  background: #fff;
  color: black;
  box-shadow: 0 1em 3em -0.4em rgba(0, 0, 0, 0.3),
    0 0 1px 1px rgba(0, 0, 0, 0.05);
  border-radius: 2px;
}
/* Triangle/caret */
.dfn-panel:not(.docked) > .caret {
  position: absolute;
  top: -9px;
}
.dfn-panel:not(.docked) > .caret::before,
.dfn-panel:not(.docked) > .caret::after {
  content: "";
  position: absolute;
  border: 10px solid transparent;
  border-top: 0;
  border-bottom: 10px solid #fff;
  top: 0;
}
.dfn-panel:not(.docked) > .caret::before {
  border-bottom: 9px solid #a2a9b1;
}

.dfn-panel * {
  margin: 0;
}

.dfn-panel b {
  display: block;
  color: #000;
  margin-top: 0.25em;
}

.dfn-panel ul a[href] {
  color: #333;
}

.dfn-panel > div {
  display: flex;
}

.dfn-panel a.self-link {
  font-weight: bold;
  margin-right: auto;
}

.dfn-panel .marker {
  padding: 0.1em;
  margin-left: 0.5em;
  border-radius: 0.2em;
  text-align: center;
  white-space: nowrap;
  font-size: 90%;
  color: #040b1c;
}

.dfn-panel .marker.dfn-exported {
  background: #d1edfd;
  box-shadow: 0 0 0 0.125em #1ca5f940;
}
.dfn-panel .marker.idl-block {
  background: #8ccbf2;
  box-shadow: 0 0 0 0.125em #0670b161;
}

.dfn-panel a:not(:hover) {
  text-decoration: none !important;
  border-bottom: none !important;
}

.dfn-panel a[href]:hover {
  border-bottom-width: 1px;
}

.dfn-panel ul {
  padding: 0;
}

.dfn-panel li {
  margin-left: 1em;
}

.dfn-panel.docked {
  position: fixed;
  left: 0.5em;
  top: unset;
  bottom: 2em;
  margin: 0 auto;
  /* 0.75em from padding (x2), 0.5em from left position, 0.2em border (x2) */
  max-width: calc(100vw - 0.75em * 2 - 0.5em - 0.2em * 2);
  max-height: 30vh;
  overflow: auto;
}
`;

  // @ts-check

  const name$k = "core/dfn-panel";

  async function run$j() {
    document.head.insertBefore(
      html`<style>
      ${css$5}
    </style>`,
      document.querySelector("link")
    );

    /** @type {NodeListOf<HTMLElement>} */
    const elems = document.querySelectorAll(
      "dfn[id]:not([data-cite]), #index-defined-elsewhere .index-term"
    );
    const panels = document.createDocumentFragment();
    for (const el of elems) {
      panels.append(createPanel(el));
      // Make it possible to reach el by tabbing,
      // allowing keyboard action as needed.
      el.tabIndex = 0;
      el.setAttribute("aria-haspopup", "dialog");
    }
    document.body.append(panels);

    const script = document.createElement("script");
    script.id = "respec-dfn-panel";
    script.textContent = await loadScript();
    document.body.append(script);
  }

  /** @param {HTMLElement} dfn */
  function createPanel(dfn) {
    const { id } = dfn;
    const href = dfn.dataset.href || `#${id}`;
    /** @type {NodeListOf<HTMLAnchorElement>} */
    const links = document.querySelectorAll(`a[href="${href}"]:not(.index-term)`);

    const panelId = `dfn-panel-for-${dfn.id}`;
    const definition = dfn.getAttribute("aria-label") || norm(dfn.textContent);
    /** @type {HTMLElement} */
    const panel = html`
    <div
      class="dfn-panel"
      id="${panelId}"
      hidden
      role="dialog"
      aria-modal="true"
      aria-label="Links in this document to definition: ${definition}"
    >
      <span class="caret"></span>
      <div>
        <a
          class="self-link"
          href="${href}"
          aria-label="Permalink for definition: ${definition}. Activate to close this dialog."
          >Permalink</a
        >
        ${dfnExportedMarker(dfn)} ${idlMarker(dfn, links)}
      </div>
      <p><b>Referenced in:</b></p>
      ${referencesToHTML(id, links)}
    </div>
  `;
    return panel;
  }

  /** @param {HTMLElement} dfn */
  function dfnExportedMarker(dfn) {
    if (!dfn.matches("dfn[data-export]")) return null;
    return html`<span
    class="marker dfn-exported"
    title="Definition can be referenced by other specifications"
    >exported</span
  >`;
  }

  /**
   * @param {HTMLElement} dfn
   * @param {NodeListOf<HTMLAnchorElement>} links
   */
  function idlMarker(dfn, links) {
    if (!dfn.hasAttribute("data-idl")) return null;

    for (const anchor of links) {
      if (anchor.dataset.linkType !== dfn.dataset.dfnType) continue;
      const parentIdlBlock = anchor.closest("pre.idl");
      if (parentIdlBlock && parentIdlBlock.id) {
        const href = `#${parentIdlBlock.id}`;
        return html`<a
        href="${href}"
        class="marker idl-block"
        title="Jump to IDL declaration"
        >IDL</a
      >`;
      }
    }
    return null;
  }

  /**
   * @param {string} id dfn id
   * @param {NodeListOf<HTMLAnchorElement>} links
   * @returns {HTMLUListElement}
   */
  function referencesToHTML(id, links) {
    if (!links.length) {
      return html`<ul>
      <li>Not referenced in this document.</li>
    </ul>`;
    }

    /** @type {Map<string, string[]>} */
    const titleToIDs = new Map();
    links.forEach((link, i) => {
      const linkID = link.id || `ref-for-${id}-${i + 1}`;
      if (!link.id) link.id = linkID;
      const title = getReferenceTitle(link);
      const ids = titleToIDs.get(title) || titleToIDs.set(title, []).get(title);
      ids.push(linkID);
    });

    /**
     * Returns a list that is easier to render in `listItemToHTML`.
     * @param {[string, string[]]} entry an entry from `titleToIDs`
     * @returns {{ title: string, text: string, id: string, }[]} The first list item contains
     * title from `getReferenceTitle`, rest of items contain strings like `(2)`,
     * `(3)` as title.
     */
    const toLinkProps = ([title, ids]) => {
      return [{ title, id: ids[0], text: title }].concat(
        ids.slice(1).map((id, i) => ({
          title: `Reference ${i + 2}`,
          text: `(${i + 2})`,
          id,
        }))
      );
    };

    /**
     * @param {[string, string[]]} entry
     * @returns {HTMLLIElement}
     */
    const listItemToHTML = entry => html`<li>
    ${toLinkProps(entry).map(
      link =>
        html`<a href="#${link.id}" title="${link.title}">${link.text}</a>${" "}`
    )}
  </li>`;

    return html`<ul>
    ${[...titleToIDs].map(listItemToHTML)}
  </ul>`;
  }

  /** @param {HTMLAnchorElement} link */
  function getReferenceTitle(link) {
    const section = link.closest("section");
    if (!section) return null;
    const heading = section.querySelector("h1, h2, h3, h4, h5, h6");
    if (!heading) return null;
    return `§ ${norm(heading.textContent)}`;
  }

  async function loadScript() {
    try {
      return (await Promise.resolve().then(function () { return dfnPanel_runtime$1; })).default;
    } catch {
      return fetchBase("./src/core/dfn-panel.runtime.js");
    }
  }

  var dfnPanel = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$k,
    run: run$j
  });

  const css$2 = String.raw;

  // Prettier ignore only to keep code indented from level 0.
  // prettier-ignore
  var css$3 = css$2`
var {
  position: relative;
  cursor: pointer;
}

var[data-type]::before,
var[data-type]::after {
  position: absolute;
  left: 50%;
  top: -6px;
  opacity: 0;
  transition: opacity 0.4s;
  pointer-events: none;
}

/* the triangle or arrow or caret or whatever */
var[data-type]::before {
  content: "";
  transform: translateX(-50%);
  border-width: 4px 6px 0 6px;
  border-style: solid;
  border-color: transparent;
  border-top-color: #000;
}

/* actual text */
var[data-type]::after {
  content: attr(data-type);
  transform: translateX(-50%) translateY(-100%);
  background: #000;
  text-align: center;
  /* additional styling */
  font-family: "Dank Mono", "Fira Code", monospace;
  font-style: normal;
  padding: 6px;
  border-radius: 3px;
  color: #daca88;
  text-indent: 0;
  font-weight: normal;
}

var[data-type]:hover::after,
var[data-type]:hover::before {
  opacity: 1;
}
`;

  // @ts-check

  const name$j = "core/data-type";

  function run$i(conf) {
    if (!conf.highlightVars) {
      return;
    }

    const style = document.createElement("style");
    style.textContent = css$3;
    document.head.appendChild(style);

    let section = null;
    const varMap = new Map();
    /** @type {NodeListOf<HTMLElement>} */
    const variables = document.querySelectorAll("section var");
    for (const varElem of variables) {
      const currentSection = varElem.closest("section");
      if (section !== currentSection) {
        section = currentSection;
        varMap.clear();
      }
      if (varElem.dataset.type) {
        varMap.set(varElem.textContent.trim(), varElem.dataset.type);
        continue;
      }
      const type = varMap.get(varElem.textContent.trim());
      if (type) varElem.dataset.type = type;
    }
  }

  var dataType = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$j,
    run: run$i
  });

  /* For assertions in lists containing algorithms */
  const css = String.raw;

  // Prettier ignore only to keep code indented from level 0.
  // prettier-ignore
  var css$1 = css`
.assert {
  background: #eee;
  border-left: 0.5em solid #aaa;
  padding: 0.3em;
}
`;

  // @ts-check

  const name$i = "core/algorithms";

  function run$h() {
    const elements = Array.from(document.querySelectorAll("ol.algorithm li"));
    elements
      .filter(li => li.textContent.trim().startsWith("Assert: "))
      .forEach(li => li.classList.add("assert"));
    if (document.querySelector(".assert")) {
      const style = document.createElement("style");
      style.textContent = css$1;
      document.head.appendChild(style);
    }
  }

  var algorithms = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$i,
    run: run$h
  });

  // @ts-check

  const name$h = "core/anchor-expander";

  function run$g() {
    /** @type {NodeListOf<HTMLElement>} */
    const anchorElements = document.querySelectorAll(
      "a[href^='#']:not(.self-link):not([href$='the-empty-string'])"
    );
    const anchors = [...anchorElements].filter(a => a.textContent.trim() === "");
    for (const a of anchors) {
      const id = a.getAttribute("href").slice(1);
      const matchingElement = document.getElementById(id);
      if (!matchingElement) {
        a.textContent = a.getAttribute("href");
        const msg = `Couldn't expand inline reference. The id "${id}" is not in the document.`;
        const title = `No matching id in document: ${id}.`;
        showError(msg, name$h, { title, elements: [a] });
        continue;
      }
      switch (matchingElement.localName) {
        case "h6":
        case "h5":
        case "h4":
        case "h3":
        case "h2": {
          processHeading(matchingElement, a);
          break;
        }
        case "section": {
          // find first heading in the section
          processSection(matchingElement, id, a);
          break;
        }
        case "figure": {
          processFigure(matchingElement, id, a);
          break;
        }
        case "aside":
        case "div": {
          processBox(matchingElement, id, a);
          break;
        }
        default: {
          a.textContent = a.getAttribute("href");
          const msg = "ReSpec doesn't support expanding this kind of reference.";
          const title = `Can't expand "#${id}".`;
          showError(msg, name$h, { title, elements: [a] });
        }
      }
      localize(matchingElement, a);
      a.normalize();
    }
  }

  function processBox(matchingElement, id, a) {
    const selfLink = matchingElement.querySelector(".marker .self-link");
    if (!selfLink) {
      a.textContent = a.getAttribute("href");
      const msg = `Found matching element "${id}", but it has no title or marker.`;
      const title = "Missing title.";
      showError(msg, name$h, { title, elements: [a] });
      return;
    }
    const copy = makeSafeCopy(selfLink);
    a.append(...copy.childNodes);
    a.classList.add("box-ref");
  }

  function processFigure(matchingElement, id, a) {
    const figcaption = matchingElement.querySelector("figcaption");
    if (!figcaption) {
      a.textContent = a.getAttribute("href");
      const msg = `Found matching figure "${id}", but figure is lacking a \`<figcaption>\`.`;
      const title = "Missing figcaption in referenced figure.";
      showError(msg, name$h, { title, elements: [a] });
      return;
    }
    // remove the figure's title
    const children = [...makeSafeCopy(figcaption).childNodes].filter(
      // @ts-ignore
      node => !node.classList || !node.classList.contains("fig-title")
    );
    // drop an empty space at the end.
    children.pop();
    a.append(...children);
    a.classList.add("fig-ref");
    const figTitle = figcaption.querySelector(".fig-title");
    if (!a.hasAttribute("title") && figTitle) {
      a.title = norm(figTitle.textContent);
    }
  }

  function processSection(matchingElement, id, a) {
    const heading = matchingElement.querySelector("h6, h5, h4, h3, h2");
    if (!heading) {
      a.textContent = a.getAttribute("href");
      const msg =
        "Found matching section, but the section was lacking a heading element.";
      const title = `No matching id in document: "${id}".`;
      showError(msg, name$h, { title, elements: [a] });
      return;
    }
    processHeading(heading, a);
    localize(heading, a);
  }

  function processHeading(heading, a) {
    const hadSelfLink = heading.querySelector(".self-link");
    const children = [...makeSafeCopy(heading).childNodes].filter(
      // @ts-ignore
      node => !node.classList || !node.classList.contains("self-link")
    );
    a.append(...children);
    if (hadSelfLink) a.prepend("§\u00A0");
    a.classList.add("sec-ref");
    // Trim stray whitespace of the last text node (see bug #3265).
    if (a.lastChild.nodeType === Node.TEXT_NODE) {
      a.lastChild.textContent = a.lastChild.textContent.trimEnd();
    }
    // Replace all inner anchors for span elements (see bug #3136)
    a.querySelectorAll("a").forEach(a => {
      const span = renameElement(a, "span");
      // Remove the old attributes
      for (const attr of [...span.attributes]) {
        span.removeAttributeNode(attr);
      }
    });
  }

  function localize(matchingElement, newElement) {
    for (const attrName of ["dir", "lang"]) {
      // Already set on element, don't override.
      if (newElement.hasAttribute(attrName)) continue;

      // Closest in tree setting the attribute
      const matchingClosest = matchingElement.closest(`[${attrName}]`);
      if (!matchingClosest) continue;

      // Closest to reference setting the attribute
      const newClosest = newElement.closest(`[${attrName}]`);

      // It's the same, so already inherited from closest (probably HTML element or body).
      if (
        newClosest &&
        newClosest.getAttribute(attrName) ===
          matchingClosest.getAttribute(attrName)
      )
        continue;
      // Otherwise, set it.
      newElement.setAttribute(attrName, matchingClosest.getAttribute(attrName));
    }
  }

  var anchorExpander = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$h,
    run: run$g
  });

  // @ts-check
  /** @type {Promise<{ apiBase: string, fullName: string, branch: string, repoURL: string } | null>} */
  const github = new Promise((resolve, reject) => {
  });

  const localizationStrings$9 = {
    en: {
      file_a_bug: "File an issue",
      participate: "Participate:",
      commit_history: "Commit history",
    },
    ko: {
      participate: "참여",
    },
    zh: {
      file_a_bug: "反馈错误",
      participate: "参与：",
    },
    ja: {
      commit_history: "変更履歴",
      file_a_bug: "問題報告",
      participate: "参加方法：",
    },
    nl: {
      commit_history: "Revisiehistorie",
      file_a_bug: "Dien een melding in",
      participate: "Doe mee:",
    },
    es: {
      commit_history: "Historia de cambios",
      file_a_bug: "Nota un bug",
      participate: "Participe:",
    },
    de: {
      commit_history: "Revisionen",
      file_a_bug: "Fehler melden",
      participate: "Mitmachen:",
    },
  };
  getIntlData(localizationStrings$9);

  // @ts-check

  const name$g = "rs-changelog";

  const element = class ChangelogElement extends HTMLElement {
    constructor() {
      super();
      this.props = {
        from: this.getAttribute("from"),
        to: this.getAttribute("to") || "HEAD",
        /** @type {(commit: Commit) => boolean} */
        filter:
          typeof window[this.getAttribute("filter")] === "function"
            ? window[this.getAttribute("filter")]
            : () => true,
      };
    }

    connectedCallback() {
      const { from, to, filter } = this.props;
      html.bind(this)`
      <ul>
      ${{
        any: fetchCommits(from, to, filter)
          .then(commits => toHTML(commits))
          .catch(error => showError(error.message, name$g, { elements: [this] }))
          .finally(() => {
            this.dispatchEvent(new CustomEvent("done"));
          }),
        placeholder: "Loading list of commits...",
      }}
      </ul>
    `;
    }
  };

  async function fetchCommits(from, to, filter) {
    /** @type {Commit[]} */
    let commits;
    try {
      const gh = await github;
      if (!gh) {
        throw new Error("`respecConfig.github` is not set");
      }
      const url = new URL("commits", `${gh.apiBase}/${gh.fullName}/`);
      url.searchParams.set("from", from);
      url.searchParams.set("to", to);

      const res = await fetch(url.href);
      if (!res.ok) {
        throw new Error(
          `Request to ${url} failed with status code ${res.status}`
        );
      }
      commits = await res.json();
      if (!commits.length) {
        throw new Error(`No commits between ${from}..${to}.`);
      }
      commits = commits.filter(filter);
    } catch (error) {
      const msg = `Error loading commits from GitHub. ${error.message}`;
      console.error(error);
      throw new Error(msg);
    }
    return commits;
  }

  async function toHTML(commits) {
    const { repoURL } = await github;
    return commits.map(commit => {
      const [message, prNumber = null] = commit.message.split(/\(#(\d+)\)/, 2);
      const commitURL = `${repoURL}commit/${commit.hash}`;
      const prURL = prNumber ? `${repoURL}pull/${prNumber}` : null;
      const pr = prNumber && html` (<a href="${prURL}">#${prNumber}</a>)`;
      return html`<li><a href="${commitURL}">${message.trim()}</a>${pr}</li>`;
    });
  }

  var changelog = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$g,
    element: element
  });

  // @ts-check
  /** @type {CustomElementDfn[]} */
  const CUSTOM_ELEMENTS = [changelog];

  const name$f = "core/custom-elements/index";

  async function run$f() {
    // prepare and register elements
    CUSTOM_ELEMENTS.forEach(el => {
      customElements.define(el.name, el.element);
    });

    // wait for each element to be ready
    const selectors = CUSTOM_ELEMENTS.map(el => el.name).join(", ");
    const elems = document.querySelectorAll(selectors);
    const readyPromises = [...elems].map(
      el => new Promise(res => el.addEventListener("done", res, { once: true }))
    );
    await Promise.all(readyPromises);
  }

  var index = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$f,
    run: run$f
  });

  // @ts-check
  const name$e = "ims/cleanBody";

  /**
   * A snapshot-time body merciless script and inline css remover. Intended to
   * be used only by admins. The activators are conf.cleanBodyScripts,
   * conf.cleanBodyCSS, alternatively conf.cleanBodyAll
   *
   * @param {*} conf respecConfig
   */
  async function run$e(conf) {
    if (conf.cleanBodyAll || conf.cleanBodyScripts) {
      const scripts = document.body.querySelectorAll("script");
      scripts.forEach(script => {
        script.parentNode.removeChild(script);
      });
    }

    if (conf.cleanBodyAll || conf.cleanBodyCSS) {
      const styleElems = document.querySelectorAll("*[style]");
      styleElems.forEach(styleElem => {
        styleElem.removeAttribute("style");
      });
    }
  }

  var cleanBody = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$e,
    run: run$e
  });

  // @ts-check

  const name$d = "ims/title-attrs";

  /**
   * Adds title attributes to internal definition references. When the
   * reader hovers over the defined term, they will see the definition.
   *
   * If the term is defined in a definition list, the definiton is pulled
   * from the definition description element. For example,
   *
   * <dl>
   *   <dt><dfn>Term</dfn></dt>
   *   <dd>This is my term.</dd>
   * </dl>
   *
   * If the term is defined outside of a defintion list, the definition is
   * pulled from the nearest ancestor p, td, li, div, or aside. For example,
   *
   * <p>
   *   This is my <dfn>Term</dfn>.
   * <p>
   *
   * @param {*} conf respecConfig
   */
  async function run$d(conf) {
    if (conf.noTitleAttrs) {
      return;
    }

    // for now we deal only with a.internalDFN, whose title attr value is
    // fetched from the destination link

    const anchors = document.body.querySelectorAll("a[href].internalDFN");
    anchors.forEach(anchor => {
      const selector = anchor.getAttribute("href");
      const dfn = document.body.querySelector(selector);
      if (dfn && dfn.tagName === "DFN") {
        let text = "";
        if (hasAncestor(dfn, "dt")) {
          // get the text content of the dd
          const dt = dfn.closest("dt");
          const dd = dt.nextElementSibling;
          if (dd && dd.tagName === "DD") {
            text = dd.textContent;
          }
        } else {
          // get the text content of the neareset dfn block(?) parent
          const blockishParent = dfn.closest("p, td, li, div, aside");
          if (blockishParent) {
            text = blockishParent.textContent;
          }
        }

        if (text.length > 0) {
          // console.log(text);
          text = text.replace(/^(\s*)|(\s*)$/g, "").replace(/\s+/g, " ");
          const ttl = document.createAttribute("title");
          ttl.value = text;
          anchor.setAttributeNode(ttl);
        }
      }
    });
  }

  function hasAncestor(element, ancestorName) {
    const anc = element.closest(ancestorName);
    return anc != null;
  }

  var titleAttrs = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$d,
    run: run$d
  });

  // @ts-check
  const name$c = "ims/scripts";

  /**
   * Attach fixup script.
   *
   * @param {*} conf respecConfig
   */
  async function run$c(conf) {
    if (!conf.noSideBarTOC) {
      // IMS canonical location
      let fixupURL = "https://purl.imsglobal.org/spec/fixup.js";
      if (conf.overrideFixupLocation) {
        fixupURL = conf.overrideFixupLocation;
      }
      attachScript(fixupURL);
    } else {
      document.body.className += " toc-inline";
    }
  }

  /**
   * Append the script to the document.
   *
   * @param {string} url the URL of the script to attach
   */
  function attachScript(url) {
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.addEventListener(
      "load",
      () => {
        if (window.location.hash) {
          // eslint-disable-next-line
          window.location = window.location;
        }
      },
      { once: true }
    );
    script.src = url;
    document.body.appendChild(script);
  }

  var scripts = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$c,
    run: run$c
  });

  // @ts-check

  const name$b = "ims/comments";

  /**
   * Remove all comment nodes.
   */
  async function run$b() {
    const nodeIterator = document.createNodeIterator(
      document.documentElement,
      NodeFilter.SHOW_COMMENT
    );
    const comments = [];
    let currentNode;

    while ((currentNode = nodeIterator.nextNode())) {
      comments.push(currentNode);
    }

    comments.forEach(comment => {
      comment.parentElement.removeChild(comment);
    });
  }

  var comments = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$b,
    run: run$b
  });

  // @ts-check

  var footersTmpl = conf => {
    return html`<footer>
    <div id="endWarranty">
      <p>
        IMS Global Learning Consortium, Inc. ("IMS Global") is publishing the
        information contained in this document ("Specification") for purposes of
        scientific, experimental, and scholarly collaboration only.
      </p>
      <p>
        IMS Global makes no warranty or representation regarding the accuracy or
        completeness of the Specification.
      </p>
      <p>This material is provided on an "As Is" and "As Available" basis.</p>
      <p>
        The Specification is at all times subject to change and revision without
        notice.
      </p>
      <p>
        It is your sole responsibility to evaluate the usefulness, accuracy, and
        completeness of the Specification as it relates to you.
      </p>
      <p>
        IMS Global would appreciate receiving your comments and suggestions.
      </p>
      <p>
        Please contact IMS Global through our website at
        http://www.imsglobal.org.
      </p>
      <p>
        Please refer to Document Name: ${conf.specTitle.replace("<br/>", " ")}
        ${conf.specVersion}
      </p>
      <p>Date: ${conf.specDate}</p>
      <div></div>
    </div>
  </footer>`;
  };

  /* eslint-disable prettier/prettier */

  const name$a = "ims/footers";

  /**
   * @param {*} conf
   */
  async function run$a(conf) {

    const footer = footersTmpl(conf);
    document.body.appendChild(footer);
  }

  var footers = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$a,
    run: run$a
  });

  // @ts-check

  const ruleName$8 = "check-charset";
  const name$9 = "core/linter-rules/check-charset";

  const localizationStrings$8 = {
    en: {
      msg: `Document must only contain one \`<meta>\` tag with charset set to 'utf-8'`,
      hint: `Add this line in your document \`<head>\` section - \`<meta charset="utf-8">\` or set charset to "utf-8" if not set already.`,
    },
    zh: {
      msg: `文档只能包含一个 charset 属性为 utf-8 的 \`<meta>\` 标签`,
      hint: `将此行添加到文档的 \`<head>\` 部分—— \`<meta charset="utf-8">\` 或将 charset 设置为 utf-8（如果尚未设置）。`,
    },
  };
  const l10n$8 = getIntlData(localizationStrings$8);

  function run$9(conf) {
    if (!conf.lint?.[ruleName$8]) {
      return;
    }

    /** @type {NodeListOf<HTMLMetaElement>} */
    const metas = document.querySelectorAll("meta[charset]");
    const val = [];
    for (const meta of metas) {
      val.push(meta.getAttribute("charset").trim().toLowerCase());
    }
    const utfExists = val.includes("utf-8");

    // only a single meta[charset] and is set to utf-8, correct case
    if (utfExists && metas.length === 1) {
      return;
    }
    // if more than one meta[charset] tag defined along with utf-8
    // or
    // no meta[charset] present in the document
    showWarning(l10n$8.msg, name$9, { hint: l10n$8.hint, elements: [...metas] });
  }

  var checkCharset = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$9,
    run: run$9
  });

  // @ts-check

  const ruleName$7 = "check-punctuation";
  const name$8 = "core/linter-rules/check-punctuation";

  const punctuationMarks = [".", ":", "!", "?"];
  const humanMarks = punctuationMarks.map(mark => `"${mark}"`).join(", ");

  const localizationStrings$7 = {
    en: {
      msg: "`p` elements should end with a punctuation mark.",
      hint: `Please make sure \`p\` elements end with one of: ${humanMarks}.`,
    },
  };
  const l10n$7 = getIntlData(localizationStrings$7);

  function run$8(conf) {
    if (!conf.lint?.[ruleName$7]) {
      return;
    }

    // Check string ends with one of ., !, ?, :, ], or is empty.
    const punctuatingRegExp = new RegExp(
      `[${punctuationMarks.join("")}\\]]$|^ *$`,
      "m"
    );

    /** @type {NodeListOf<HTMLParagraphElement>} */
    const elems = document.querySelectorAll("p:not(#back-to-top)");
    const offendingElements = [...elems].filter(
      elem => !punctuatingRegExp.test(elem.textContent.trim())
    );

    if (!offendingElements.length) {
      return;
    }
    showWarning(l10n$7.msg, name$8, { hint: l10n$7.hint, elements: offendingElements });
  }

  var checkPunctuation = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$8,
    run: run$8
  });

  // @ts-check

  const ruleName$6 = "check-internal-slots";
  const name$7 = "core/linter-rules/check-internal-slots";

  const localizationStrings$6 = {
    en: {
      msg: "Internal slots should be preceded by a '.'",
      hint: "Add a '.' between the elements mentioned.",
    },
  };
  const l10n$6 = getIntlData(localizationStrings$6);

  function run$7(conf) {
    if (!conf.lint?.[ruleName$6]) {
      return;
    }

    /** @type {NodeListOf<HTMLAnchorElement>} */
    const elems = document.querySelectorAll("var+a");
    const offendingElements = [...elems].filter(
      ({ previousSibling: { nodeName } }) => {
        const isPrevVar = nodeName && nodeName === "VAR";
        return isPrevVar;
      }
    );

    if (!offendingElements.length) {
      return;
    }

    showWarning(l10n$6.msg, name$7, { hint: l10n$6.hint, elements: offendingElements });
  }

  var checkInternalSlots = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$7,
    run: run$7
  });

  // @ts-check

  const ruleName$5 = "local-refs-exist";
  const name$6 = "core/linter-rules/local-refs-exist";

  const localizationStrings$5 = {
    en: {
      msg: "Broken local reference found in document.",
      hint: "Please fix the links mentioned.",
    },
  };
  const l10n$5 = getIntlData(localizationStrings$5);

  function run$6(conf) {
    if (!conf.lint?.[ruleName$5]) {
      return;
    }

    /** @type {NodeListOf<HTMLAnchorElement>} */
    const elems = document.querySelectorAll("a[href^='#']");
    const offendingElements = [...elems].filter(isBrokenHyperlink);
    if (offendingElements.length) {
      showWarning(l10n$5.msg, name$6, {
        hint: l10n$5.hint,
        elements: offendingElements,
      });
    }
  }

  function isBrokenHyperlink(elem) {
    const id = elem.getAttribute("href").substring(1);
    const doc = elem.ownerDocument;
    return !doc.getElementById(id) && !doc.getElementsByName(id).length;
  }

  var localRefsExist = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$6,
    run: run$6
  });

  // @ts-check

  const ruleName$4 = "no-headingless-sections";
  const name$5 = "core/linter-rules/no-headingless-sections";

  const localizationStrings$4 = {
    en: {
      msg: "All sections must start with a `h2-6` element.",
      hint: "Add a `h2-6` to the offending section or use a `<div>`.",
    },
    nl: {
      msg: "Alle secties moeten beginnen met een `h2-6` element.",
      hint: "Voeg een `h2-6` toe aan de conflicterende sectie of gebruik een `<div>`.",
    },
    zh: {
      msg: "所有章节（section）都必须以 `h2-6` 元素开头。",
      hint: "将 `h2-6` 添加到有问题的章节或使用 `<div>`。",
    },
  };
  const l10n$4 = getIntlData(localizationStrings$4);

  const hasNoHeading = ({ firstElementChild: elem }) => {
    return elem === null || /^h[1-6]$/.test(elem.localName) === false;
  };

  function run$5(conf) {
    if (!conf.lint?.[ruleName$4]) {
      return;
    }

    const offendingElements = [...document.querySelectorAll("section")].filter(
      hasNoHeading
    );
    if (offendingElements.length) {
      showWarning(l10n$4.msg, name$5, {
        hint: l10n$4.hint,
        elements: offendingElements,
      });
    }
  }

  var noHeadinglessSections = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$5,
    run: run$5
  });

  // @ts-check

  const ruleName$3 = "no-unused-vars";
  const name$4 = "core/linter-rules/no-unused-vars";

  const localizationStrings$3 = {
    en: {
      msg: "Variable was defined, but never used.",
      hint: "Add a `data-ignore-unused` attribute to the `<var>`.",
    },
  };
  const l10n$3 = getIntlData(localizationStrings$3);

  function run$4(conf) {
    if (!conf.lint?.[ruleName$3]) {
      return;
    }

    const offendingElements = [];

    /**
     * Check if a <section> contains a `".algorithm"`
     *
     * The selector matches:
     * ``` html
     * <section><ul class="algorithm"></ul></section>
     * <section><div><ul class="algorithm"></ul></div></section>
     * ```
     * The selector does not match:
     * ``` html
     * <section><section><ul class="algorithm"></ul></section></section>
     * ```
     * @param {HTMLElement} section
     */
    const sectionContainsAlgorithm = section =>
      !!section.querySelector(
        ":scope > :not(section) ~ .algorithm, :scope > :not(section) .algorithm"
      );

    for (const section of document.querySelectorAll("section")) {
      if (!sectionContainsAlgorithm(section)) continue;

      /**
       * `<var>` in this section, but excluding those in child sections.
       * @type {NodeListOf<HTMLElement>}
       */
      const varElems = section.querySelectorAll(":scope > :not(section) var");
      if (!varElems.length) continue;

      /** @type {Map<string, HTMLElement[]>} */
      const varUsage = new Map();
      for (const varElem of varElems) {
        const key = norm(varElem.textContent);
        const elems = varUsage.get(key) || varUsage.set(key, []).get(key);
        elems.push(varElem);
      }

      for (const vars of varUsage.values()) {
        if (vars.length === 1 && !vars[0].hasAttribute("data-ignore-unused")) {
          offendingElements.push(vars[0]);
        }
      }
    }

    if (offendingElements.length) {
      showWarning(l10n$3.msg, name$4, {
        hint: l10n$3.hint,
        elements: offendingElements,
      });
    }
  }

  var noUnusedVars = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$4,
    run: run$4
  });

  // @ts-check

  const ruleName$2 = "privsec-section";
  const name$3 = "core/linter-rules/privsec-section";

  const localizationStrings$2 = {
    en: {
      msg: "Document must have a 'Privacy and/or Security' Considerations section.",
      hint:
        "Add a privacy and/or security considerations section. " +
        "See the [Self-Review Questionnaire](https://w3ctag.github.io/security-questionnaire/).",
    },
  };
  const l10n$2 = getIntlData(localizationStrings$2);

  function hasPriSecConsiderations(doc) {
    return Array.from(doc.querySelectorAll("h2, h3, h4, h5, h6")).some(
      ({ textContent: text }) => {
        const saysPrivOrSec = /(privacy|security)/im.test(text);
        const saysConsiderations = /(considerations)/im.test(text);
        return (saysPrivOrSec && saysConsiderations) || saysPrivOrSec;
      }
    );
  }

  function run$3(conf) {
    if (!conf.lint?.[ruleName$2]) {
      return;
    }

    if (conf.isRecTrack && !hasPriSecConsiderations(document)) {
      showWarning(l10n$2.msg, name$3, { hint: l10n$2.hint });
    }
  }

  var privsecSection = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$3,
    run: run$3
  });

  // @ts-check

  const ruleName$1 = "wpt-tests-exist";
  const name$2 = "core/linter-rules/wpt-tests-exist";

  const localizationStrings$1 = {
    en: {
      msg: "The following test could not be found in Web Platform Tests:",
      hint: "Check [wpt.live](https://wpt.live) to see if it was deleted or renamed.",
    },
  };
  const l10n$1 = getIntlData(localizationStrings$1);

  async function run$2(conf) {
    if (!conf.lint?.[ruleName$1]) {
      return;
    }

    const filesInWPT = await getFilesInWPT(conf.testSuiteURI, conf.githubAPI);
    if (!filesInWPT) {
      return;
    }

    /** @type {NodeListOf<HTMLElement>} */
    const elems = document.querySelectorAll("[data-tests]");
    const testables = [...elems].filter(elem => elem.dataset.tests);

    for (const elem of testables) {
      elem.dataset.tests
        .split(/,/gm)
        .map(test => test.trim().split("#")[0])
        .filter(test => test && !filesInWPT.has(test))
        .map(missingTest => {
          showWarning(`${l10n$1.msg} \`${missingTest}\`.`, name$2, {
            hint: l10n$1.hint,
            elements: [elem],
          });
        });
    }
  }

  /**
   * @param {string} testSuiteURI
   * @param {string} githubAPIBase
   */
  async function getFilesInWPT(testSuiteURI, githubAPIBase) {
    let wptDirectory;
    try {
      const testSuiteURL = new URL(testSuiteURI);
      if (
        testSuiteURL.pathname.startsWith("/web-platform-tests/wpt/tree/master/")
      ) {
        const re = /web-platform-tests\/wpt\/tree\/master\/(.+)/;
        wptDirectory = testSuiteURL.pathname.match(re)[1].replace(/\//g, "");
      } else {
        wptDirectory = testSuiteURL.pathname.replace(/\//g, "");
      }
    } catch (error) {
      const msg = "Failed to parse WPT directory from testSuiteURI";
      showWarning(msg, `linter/${name$2}`);
      console.error(error);
      return null;
    }

    const url = new URL("web-platform-tests/wpt/files", `${githubAPIBase}/`);
    url.searchParams.set("path", wptDirectory);

    const response = await fetch(url);
    if (!response.ok) {
      const error = await response.text();
      const msg =
        "Failed to fetch files from WPT repository. " +
        `Request failed with error: ${error} (${response.status})`;
      showWarning(msg, `linter/${name$2}`);
      return null;
    }
    /** @type {{ entries: string[] }} */
    const { entries } = await response.json();
    const files = entries.filter(entry => !entry.endsWith("/"));
    return new Set(files);
  }

  var wptTestsExist = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$2,
    run: run$2
  });

  // @ts-check

  const ruleName = "no-http-props";
  const name$1 = "core/linter-rules/no-http-props";

  const localizationStrings = {
    en: {
      msg: docLink`Insecure URLs are not allowed in ${"[respecConfig]"}.`,
      hint: "Please change the following properties to 'https://': ",
    },
    zh: {
      msg: docLink`${"[respecConfig]"} 中不允许使用不安全的URL.`,
      hint: "请将以下属性更改为 https://：",
    },
  };
  const l10n = getIntlData(localizationStrings);

  function run$1(conf) {
    if (!conf.lint?.[ruleName]) {
      return;
    }

    // We can only really perform this check over http/https
    // Using parent's location as tests are loaded in iframe as a srcdoc.
    if (!parent.location.href.startsWith("http")) {
      return;
    }

    const offendingMembers = Object.getOwnPropertyNames(conf)
      // this check is cheap, "prevED" is w3c exception.
      .filter(key => (key.endsWith("URI") && conf[key]) || key === "prevED")
      // this check is expensive, so separate step
      .filter(key =>
        new URL(conf[key], parent.location.href).href.startsWith("http://")
      );

    if (offendingMembers.length) {
      const keys = joinAnd(offendingMembers, key => docLink`${`[${key}]`}`);
      showWarning(l10n.msg, name$1, { hint: l10n.hint + keys });
    }
  }

  var noHttpProps = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$1,
    run: run$1
  });

  // @ts-check

  const name = "core/linter-rules/a11y";

  const DISABLED_RULES = [
    "color-contrast", // too slow 🐢
    "landmark-one-main", // need to add a <main>, else it marks entire page as errored
    "landmark-unique",
    "region",
  ];

  async function run(conf) {
    if (!conf.lint?.a11y && /** legacy */ !conf.a11y) {
      return;
    }
    const config = conf.lint?.a11y || /** legacy */ conf.a11y;

    const options = config === true ? {} : config;
    const violations = await getViolations(options);
    for (const violation of violations) {
      /**
       * We're grouping by failureSummary as it contains hints to fix the issue.
       * For example, with color-constrast rule, it tells about the present color
       * contrast and how to fix it. If we don't group, errors will be repetitive.
       * @type {Map<string, HTMLElement[]>}
       */
      const groupedBySummary = new Map();
      for (const node of violation.nodes) {
        const { failureSummary, element } = node;
        const elements =
          groupedBySummary.get(failureSummary) ||
          groupedBySummary.set(failureSummary, []).get(failureSummary);
        elements.push(element);
      }

      const { id, help, description, helpUrl } = violation;
      const title = `a11y/${id}: ${help}`;
      for (const [failureSummary, elements] of groupedBySummary) {
        const hints = formatHintsAsMarkdown(failureSummary);
        const details = `\n\n${description}.\n\n${hints}. ([Learn more](${helpUrl}))`;
        showWarning(title, name, { details, elements });
      }
    }
  }

  /**
   * @param {object} opts Options as described at https://github.com/dequelabs/axe-core/blob/develop/doc/API.md#options-parameter
   */
  async function getViolations(opts) {
    const { rules, ...otherOptions } = opts;
    const options = {
      rules: {
        ...Object.fromEntries(DISABLED_RULES.map(id => [id, { enabled: false }])),
        ...rules,
      },
      ...otherOptions,
      elementRef: true,
      resultTypes: ["violations"],
      reporter: "v1", // v1 includes a `failureSummary`
    };

    let axe;
    try {
      axe = await importAxe();
    } catch (error) {
      const msg = "Failed to load a11y linter.";
      showError(msg, name);
      console.error(error);
      return [];
    }

    try {
      const result = await axe.run(document, options);
      return result.violations;
    } catch (error) {
      const msg = "Error while looking for a11y issues.";
      showError(msg, name);
      console.error(error);
      return [];
    }
  }

  /** @returns {Promise<typeof window.axe>} */
  function importAxe() {
    const script = document.createElement("script");
    script.classList.add("remove");
    script.src = "https://unpkg.com/axe-core@3/axe.min.js";
    document.head.appendChild(script);
    return new Promise((resolve, reject) => {
      script.onload = () => resolve(window.axe);
      script.onerror = reject;
    });
  }

  /** @param {string} text */
  function formatHintsAsMarkdown(text) {
    const results = [];
    for (const group of text.split("\n\n")) {
      const [msg, ...opts] = group.split(/^\s{2}/m);
      const options = opts.map(opt => `- ${opt.trimEnd()}`).join("\n");
      results.push(`${msg}${options}`);
    }
    return results.join("\n\n");
  }

  var a11y = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name,
    run: run
  });

  var respecWorker = "// ReSpec Worker v1.0.0\r\n\"use strict\";\r\ntry {\r\n  importScripts(\"https://www.w3.org/Tools/respec/respec-highlight\");\r\n} catch (err) {\r\n  console.error(\"Network error loading highlighter\", err);\r\n}\r\n\r\nself.addEventListener(\"message\", ({ data: originalData }) => {\r\n  const data = Object.assign({}, originalData);\r\n  switch (data.action) {\r\n    case \"highlight-load-lang\": {\r\n      const { langURL, propName, lang } = data;\r\n      importScripts(langURL);\r\n      self.hljs.registerLanguage(lang, self[propName]);\r\n      break;\r\n    }\r\n    case \"highlight\": {\r\n      const { code } = data;\r\n      const langs = data.languages.length ? data.languages : undefined;\r\n      try {\r\n        const { value, language } = self.hljs.highlightAuto(code, langs);\r\n        Object.assign(data, { value, language });\r\n      } catch (err) {\r\n        console.error(\"Could not transform some code?\", err);\r\n        // Post back the original code\r\n        Object.assign(data, { value: code, language: \"\" });\r\n      }\r\n      break;\r\n    }\r\n  }\r\n  self.postMessage(data);\r\n});\r\n";

  var respecWorker$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    'default': respecWorker
  });

  var dfnPanel_runtime = "(() => {\n// @ts-check\r\nif (document.respec) {\r\n  document.respec.ready.then(setupPanel);\r\n} else {\r\n  setupPanel();\r\n}\r\n\r\nfunction setupPanel() {\r\n  const listener = panelListener();\r\n  document.body.addEventListener(\"keydown\", listener);\r\n  document.body.addEventListener(\"click\", listener);\r\n}\r\n\r\nfunction panelListener() {\r\n  /** @type {HTMLElement} */\r\n  let panel = null;\r\n  return event => {\r\n    const { target, type } = event;\r\n\r\n    if (!(target instanceof HTMLElement)) return;\r\n\r\n    // For keys, we only care about Enter key to activate the panel\r\n    // otherwise it's activated via a click.\r\n    if (type === \"keydown\" && event.key !== \"Enter\") return;\r\n\r\n    const action = deriveAction(event);\r\n\r\n    switch (action) {\r\n      case \"show\": {\r\n        hidePanel(panel);\r\n        /** @type {HTMLElement} */\r\n        const dfn = target.closest(\"dfn, .index-term\");\r\n        panel = document.getElementById(`dfn-panel-for-${dfn.id}`);\r\n        const coords = deriveCoordinates(event);\r\n        displayPanel(dfn, panel, coords);\r\n        break;\r\n      }\r\n      case \"dock\": {\r\n        panel.style.left = null;\r\n        panel.style.top = null;\r\n        panel.classList.add(\"docked\");\r\n        break;\r\n      }\r\n      case \"hide\": {\r\n        hidePanel(panel);\r\n        panel = null;\r\n        break;\r\n      }\r\n    }\r\n  };\r\n}\r\n\r\n/**\r\n * @param {MouseEvent|KeyboardEvent} event\r\n */\r\nfunction deriveCoordinates(event) {\r\n  const target = /** @type HTMLElement */ (event.target);\r\n\r\n  // We prevent synthetic AT clicks from putting\r\n  // the dialog in a weird place. The AT events sometimes\r\n  // lack coordinates, so they have clientX/Y = 0\r\n  const rect = target.getBoundingClientRect();\r\n  if (\r\n    event instanceof MouseEvent &&\r\n    event.clientX >= rect.left &&\r\n    event.clientY >= rect.top\r\n  ) {\r\n    // The event probably happened inside the bounding rect...\r\n    return { x: event.clientX, y: event.clientY };\r\n  }\r\n\r\n  // Offset to the middle of the element\r\n  const x = rect.x + rect.width / 2;\r\n  // Placed at the bottom of the element\r\n  const y = rect.y + rect.height;\r\n  return { x, y };\r\n}\r\n\r\n/**\r\n * @param {Event} event\r\n */\r\nfunction deriveAction(event) {\r\n  const target = /** @type {HTMLElement} */ (event.target);\r\n  const hitALink = !!target.closest(\"a\");\r\n  if (target.closest(\"dfn:not([data-cite]), .index-term\")) {\r\n    return hitALink ? \"none\" : \"show\";\r\n  }\r\n  if (target.closest(\".dfn-panel\")) {\r\n    if (hitALink) {\r\n      return target.classList.contains(\"self-link\") ? \"hide\" : \"dock\";\r\n    }\r\n    const panel = target.closest(\".dfn-panel\");\r\n    return panel.classList.contains(\"docked\") ? \"hide\" : \"none\";\r\n  }\r\n  if (document.querySelector(\".dfn-panel:not([hidden])\")) {\r\n    return \"hide\";\r\n  }\r\n  return \"none\";\r\n}\r\n\r\n/**\r\n * @param {HTMLElement} dfn\r\n * @param {HTMLElement} panel\r\n * @param {{ x: number, y: number }} clickPosition\r\n */\r\nfunction displayPanel(dfn, panel, { x, y }) {\r\n  panel.hidden = false;\r\n  // distance (px) between edge of panel and the pointing triangle (caret)\r\n  const MARGIN = 20;\r\n\r\n  const dfnRects = dfn.getClientRects();\r\n  // Find the `top` offset when the `dfn` can be spread across multiple lines\r\n  let closestTop = 0;\r\n  let minDiff = Infinity;\r\n  for (const rect of dfnRects) {\r\n    const { top, bottom } = rect;\r\n    const diffFromClickY = Math.abs((top + bottom) / 2 - y);\r\n    if (diffFromClickY < minDiff) {\r\n      minDiff = diffFromClickY;\r\n      closestTop = top;\r\n    }\r\n  }\r\n\r\n  const top = window.scrollY + closestTop + dfnRects[0].height;\r\n  const left = x - MARGIN;\r\n  panel.style.left = `${left}px`;\r\n  panel.style.top = `${top}px`;\r\n\r\n  // Find if the panel is flowing out of the window\r\n  const panelRect = panel.getBoundingClientRect();\r\n  const SCREEN_WIDTH = Math.min(window.innerWidth, window.screen.width);\r\n  if (panelRect.right > SCREEN_WIDTH) {\r\n    const newLeft = Math.max(MARGIN, x + MARGIN - panelRect.width);\r\n    const newCaretOffset = left - newLeft;\r\n    panel.style.left = `${newLeft}px`;\r\n    /** @type {HTMLElement} */\r\n    const caret = panel.querySelector(\".caret\");\r\n    caret.style.left = `${newCaretOffset}px`;\r\n  }\r\n\r\n  // As it's a dialog, we trap focus.\r\n  // TODO: when <dialog> becomes a implemented, we should really\r\n  // use that.\r\n  trapFocus(panel, dfn);\r\n}\r\n\r\n/**\r\n * @param {HTMLElement} panel\r\n * @param {HTMLElement} dfn\r\n * @returns\r\n */\r\nfunction trapFocus(panel, dfn) {\r\n  /** @type NodeListOf<HTMLAnchorElement> elements */\r\n  const anchors = panel.querySelectorAll(\"a[href]\");\r\n  // No need to trap focus\r\n  if (!anchors.length) return;\r\n\r\n  // Move focus to first anchor element\r\n  const first = anchors.item(0);\r\n  first.focus();\r\n\r\n  const trapListener = createTrapListener(anchors, panel, dfn);\r\n  panel.addEventListener(\"keydown\", trapListener);\r\n\r\n  // Hiding the panel releases the trap\r\n  const mo = new MutationObserver(records => {\r\n    const [record] = records;\r\n    const target = /** @type HTMLElement */ (record.target);\r\n    if (target.hidden) {\r\n      panel.removeEventListener(\"keydown\", trapListener);\r\n      mo.disconnect();\r\n    }\r\n  });\r\n  mo.observe(panel, { attributes: true, attributeFilter: [\"hidden\"] });\r\n}\r\n\r\n/**\r\n *\r\n * @param {NodeListOf<HTMLAnchorElement>} anchors\r\n * @param {HTMLElement} panel\r\n * @param {HTMLElement} dfn\r\n * @returns\r\n */\r\nfunction createTrapListener(anchors, panel, dfn) {\r\n  const lastIndex = anchors.length - 1;\r\n  let currentIndex = 0;\r\n  return event => {\r\n    switch (event.key) {\r\n      // Hitting \"Tab\" traps us in a nice loop around elements.\r\n      case \"Tab\": {\r\n        event.preventDefault();\r\n        currentIndex += event.shiftKey ? -1 : +1;\r\n        if (currentIndex < 0) {\r\n          currentIndex = lastIndex;\r\n        } else if (currentIndex > lastIndex) {\r\n          currentIndex = 0;\r\n        }\r\n        anchors.item(currentIndex).focus();\r\n        break;\r\n      }\r\n\r\n      // Hitting \"Enter\" on an anchor releases the trap.\r\n      case \"Enter\":\r\n        hidePanel(panel);\r\n        break;\r\n\r\n      // Hitting \"Escape\" returns focus to dfn.\r\n      case \"Escape\":\r\n        hidePanel(panel);\r\n        dfn.focus();\r\n        return;\r\n    }\r\n  };\r\n}\r\n\r\n/** @param {HTMLElement} panel */\r\nfunction hidePanel(panel) {\r\n  if (!panel) return;\r\n  panel.hidden = true;\r\n  panel.classList.remove(\"docked\");\r\n}\r\n})()";

  var dfnPanel_runtime$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    'default': dfnPanel_runtime
  });

})();
//# sourceMappingURL=respec-ims-default.js.map
