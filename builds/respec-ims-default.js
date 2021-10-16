window.respecVersion = "25.13.0";

(function () {
  'use strict';

  // In case everything else fails, we want the error
  window.addEventListener("error", ev => {
    console.error(ev.error, ev.message, ev);
  });

  // Based on w3c-common profile
  const modules = [
    // order is significant
    Promise.resolve().then(function () { return baseRunner; }),
    Promise.resolve().then(function () { return ui$1; }),
    Promise.resolve().then(function () { return locationHash; }),
    Promise.resolve().then(function () { return l10n$1; }),
    Promise.resolve().then(function () { return style; }),
    Promise.resolve().then(function () { return style$1; }),
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
    Promise.resolve().then(function () { return reindent$1; }),
    // Make sure markdown abstract has an id
    Promise.resolve().then(function () { return idHeaders; }),
    // Check for abstract
    Promise.resolve().then(function () { return abstract; }),
    // Add introductory class to abstract
    Promise.resolve().then(function () { return postMarkdown; }),
    Promise.resolve().then(function () { return dataTransform; }),
    Promise.resolve().then(function () { return dataAbbr; }),
    // Make sure markdown conformance section has an id
    Promise.resolve().then(function () { return inlines; }),
    Promise.resolve().then(function () { return inlines$1; }),
    Promise.resolve().then(function () { return conformance; }),
    Promise.resolve().then(function () { return dfn; }),
    Promise.resolve().then(function () { return pluralize$2; }),
    Promise.resolve().then(function () { return examples; }),
    Promise.resolve().then(function () { return issuesNotes; }),
    Promise.resolve().then(function () { return bestPractices; }),
    Promise.resolve().then(function () { return figures; }),
    Promise.resolve().then(function () { return webidl; }),
    // Import IMS biblio
    Promise.resolve().then(function () { return biblio$2; }),
    Promise.resolve().then(function () { return biblio$1; }),
    Promise.resolve().then(function () { return linkToDfn; }),
    Promise.resolve().then(function () { return xref; }),
    Promise.resolve().then(function () { return dataCite; }),
    Promise.resolve().then(function () { return webidlIndex; }),
    Promise.resolve().then(function () { return renderBiblio; }),
    Promise.resolve().then(function () { return dfnIndex; }),
    Promise.resolve().then(function () { return contrib; }),
    Promise.resolve().then(function () { return fixHeaders; }),
    Promise.resolve().then(function () { return structure$1; }),
    Promise.resolve().then(function () { return informative; }),
    Promise.resolve().then(function () { return idHeaders; }),
    Promise.resolve().then(function () { return caniuse; }),
    Promise.resolve().then(function () { return mdnAnnotation; }),
    Promise.resolve().then(function () { return saveHtml; }),
    Promise.resolve().then(function () { return searchSpecref; }),
    Promise.resolve().then(function () { return searchXref; }),
    Promise.resolve().then(function () { return dfnList; }),
    Promise.resolve().then(function () { return aboutRespec; }),
    Promise.resolve().then(function () { return seo; }),
    Promise.resolve().then(function () { return seo$1; }),
    Promise.resolve().then(function () { return highlight; }),
    Promise.resolve().then(function () { return webidlClipboard; }),
    Promise.resolve().then(function () { return dataTests; }),
    Promise.resolve().then(function () { return listSorter; }),
    Promise.resolve().then(function () { return highlightVars$1; }),
    Promise.resolve().then(function () { return dfnPanel; }),
    Promise.resolve().then(function () { return dataType; }),
    Promise.resolve().then(function () { return algorithms; }),
    Promise.resolve().then(function () { return anchorExpander; }),
    Promise.resolve().then(function () { return index; }),
    // Add IMS boilerplate content
    Promise.resolve().then(function () { return boilerplate; }),
    // Clean up the document
    Promise.resolve().then(function () { return cleanBody; }),
    // Add title attributes to internal definition references
    Promise.resolve().then(function () { return titleAttrs; }),
    // Insert IMS stylesheet
    Promise.resolve().then(function () { return scripts; }),
    // Not working...disable until fixed
    // import("../src/ims/tooltips.js"),
    // Remove all comment nodes
    Promise.resolve().then(function () { return comments; }),
    /* Linters must be the last thing to run */
    Promise.resolve().then(function () { return linter$1; }),
    Promise.resolve().then(function () { return a11y; }),
  ];

  async function domReady() {
    if (document.readyState === "loading") {
      await new Promise(resolve =>
        document.addEventListener("DOMContentLoaded", resolve)
      );
    }
  }

  (async () => {
    const [runner, { ui }, ...plugins] = await Promise.all(modules);
    try {
      ui.show();
      await domReady();
      await runner.runAll(plugins);
    } finally {
      ui.enable();
    }
  })().catch(err => {
    console.error(err);
  });

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
   * Module core/pubsubhub
   *
   * Returns a singleton that can be used for message broadcasting
   * and message receiving. Replaces legacy "msg" code in ReSpec.
   */
  const name = "core/pubsubhub";

  const subscriptions = new Map();

  function pub(topic, ...data) {
    if (!subscriptions.has(topic)) {
      return; // Nothing to do...
    }
    Array.from(subscriptions.get(topic)).forEach(cb => {
      try {
        cb(...data);
      } catch (err) {
        pub(
          "error",
          `Error when calling function ${cb.name}. See developer console.`
        );
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

  sub("error", err => {
    console.error(err, err.stack);
  });

  sub("warn", str => {
    console.warn(str);
  });

  expose(name, { sub });

  // @ts-check

  const userConfig = {};
  const amendConfig = newValues => Object.assign(userConfig, newValues);
  const removeList = ["githubToken", "githubUser"];

  sub("start-all", amendConfig);
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

  // @ts-check

  function overrideConfig(config) {
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
  sub("start-all", overrideConfig, { once: true });

  // @ts-check

  /** @type {Promise<void>} */
  const respecDonePromise = new Promise(resolve => {
    sub("end-all", resolve, { once: true });
  });

  Object.defineProperty(document, "respecIsReady", {
    get() {
      return respecDonePromise;
    },
  });

  // @ts-check

  let doneResolver;
  const done = new Promise(resolve => {
    doneResolver = resolve;
  });

  sub(
    "plugins-done",
    async config => {
      const result = [];
      if (Array.isArray(config.postProcess)) {
        const promises = config.postProcess
          .filter(f => {
            const isFunction = typeof f === "function";
            if (!isFunction) {
              pub("error", "Every item in `postProcess` must be a JS function.");
            }
            return isFunction;
          })
          .map(async f => {
            try {
              return await f(config, document);
            } catch (err) {
              pub(
                "error",
                `Function ${f.name} threw an error during \`postProcess\`. See developer console.`
              );
              console.error(err);
            }
          });
        const values = await Promise.all(promises);
        result.push(...values);
      }
      if (typeof config.afterEnd === "function") {
        result.push(await config.afterEnd(config, document));
      }
      doneResolver(result);
    },
    { once: true }
  );

  // @ts-check

  let doneResolver$1;
  const done$1 = new Promise(resolve => {
    doneResolver$1 = resolve;
  });

  sub(
    "start-all",
    async config => {
      const result = [];
      if (Array.isArray(config.preProcess)) {
        const promises = config.preProcess
          .filter(f => {
            const isFunction = typeof f === "function";
            if (!isFunction) {
              pub("error", "Every item in `preProcess` must be a JS function.");
            }
            return isFunction;
          })
          .map(async f => {
            try {
              return await f(config, document);
            } catch (err) {
              pub(
                "error",
                `Function ${f.name} threw an error during \`preProcess\`. See developer console.`
              );
              console.error(err);
            }
          });
        const values = await Promise.all(promises);
        result.push(...values);
      }
      doneResolver$1(result);
    },
    { once: true }
  );

  // @ts-check
  /**
   * Module core/l10n
   *
   * Looks at the lang attribute on the root element and uses it
   * to manage the config.l10n object so that other parts of the system can
   * localize their text.
   */

  const name$1 = "core/l10n";

  const html = document.documentElement;
  if (html && !html.hasAttribute("lang")) {
    html.lang = "en";
    if (!html.hasAttribute("dir")) {
      html.dir = "ltr";
    }
  }

  const l10n = {};

  const lang = html.lang;

  function run(config) {
    config.l10n = l10n[lang] || l10n.en;
  }

  var l10n$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$1,
    l10n: l10n,
    lang: lang,
    run: run
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
          const returnVal = await target[targetFuncName](...args);
          if (isWrite)
              await tx.done;
          return returnVal;
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
   * @param {string} text
   */
  function lastLine(text) {
    const splitted = text.split("\n");
    return splitted[splitted.length - 1];
  }

  /**
   * @typedef {object} WebIDL2ErrorOptions
   * @property {"error" | "warning"} [level]
   * @property {Function} [autofix]
   *
   * @param {string} message error message
   * @param {"Syntax" | "Validation"} kind error type
   * @param {WebIDL2ErrorOptions} [options]
   */
  function error(source, position, current, message, kind, { level = "error", autofix, ruleName } = {}) {
    /**
     * @param {number} count
     */
    function sliceTokens(count) {
      return count > 0 ?
        source.slice(position, position + count) :
        source.slice(Math.max(position + count, 0), position);
    }

    function tokensToText(inputs, { precedes } = {}) {
      const text = inputs.map(t => t.trivia + t.value).join("");
      const nextToken = source[position];
      if (nextToken.type === "eof") {
        return text;
      }
      if (precedes) {
        return text + nextToken.trivia;
      }
      return text.slice(nextToken.trivia.length);
    }

    const maxTokens = 5; // arbitrary but works well enough
    const line =
      source[position].type !== "eof" ? source[position].line :
      source.length > 1 ? source[position - 1].line :
      1;

    const precedingLastLine = lastLine(
      tokensToText(sliceTokens(-maxTokens), { precedes: true })
    );

    const subsequentTokens = sliceTokens(maxTokens);
    const subsequentText = tokensToText(subsequentTokens);
    const subsequentFirstLine = subsequentText.split("\n")[0];

    const spaced = " ".repeat(precedingLastLine.length) + "^";
    const sourceContext = precedingLastLine + subsequentFirstLine + "\n" + spaced;

    const contextType = kind === "Syntax" ? "since" : "inside";
    const inSourceName = source.name ? ` in ${source.name}` : "";
    const grammaticalContext = (current && current.name) ? `, ${contextType} \`${current.partial ? "partial " : ""}${current.type} ${current.name}\`` : "";
    const context = `${kind} error at line ${line}${inSourceName}${grammaticalContext}:\n${sourceContext}`;
    return {
      message: `${context} ${message}`,
      bareMessage: message,
      context,
      line,
      sourceName: source.name,
      level,
      ruleName,
      autofix,
      input: subsequentText,
      tokens: subsequentTokens
    };
  }

  /**
   * @param {string} message error message
   */
  function syntaxError(source, position, current, message) {
    return error(source, position, current, message, "Syntax");
  }

  /**
   * @param {string} message error message
   * @param {WebIDL2ErrorOptions} [options]
   */
  function validationError(token, current, ruleName, message, options = {}) {
    options.ruleName = ruleName;
    return error(current.source, token.index, current, message, "Validation", options);
  }

  // @ts-check

  class Base {
    /**
     * @param {object} initializer
     * @param {Base["source"]} initializer.source
     * @param {Base["tokens"]} initializer.tokens
     */
    constructor({ source, tokens }) {
      Object.defineProperties(this, {
        source: { value: source },
        tokens: { value: tokens, writable: true },
        parent: { value: null, writable: true },
        this: { value: this } // useful when escaping from proxy
      });
    }

    toJSON() {
      const json = { type: undefined, name: undefined, inheritance: undefined };
      let proto = this;
      while (proto !== Object.prototype) {
        const descMap = Object.getOwnPropertyDescriptors(proto);
        for (const [key, value] of Object.entries(descMap)) {
          if (value.enumerable || value.get) {
            // @ts-ignore - allow indexing here
            json[key] = this[key];
          }
        }
        proto = Object.getPrototypeOf(proto);
      }
      return json;
    }
  }

  // @ts-check

  /**
   * @typedef {import("../productions/dictionary.js").Dictionary} Dictionary
   *
   * @param {*} idlType
   * @param {import("../validator.js").Definitions} defs
   * @param {object} [options]
   * @param {boolean} [options.useNullableInner] use when the input idlType is nullable and you want to use its inner type
   * @return {{ reference: *, dictionary: Dictionary }} the type reference that ultimately includes dictionary.
   */
  function idlTypeIncludesDictionary(idlType, defs, { useNullableInner } = {}) {
    if (!idlType.union) {
      const def = defs.unique.get(idlType.idlType);
      if (!def) {
        return;
      }
      if (def.type === "typedef") {
        const { typedefIncludesDictionary } = defs.cache;
        if (typedefIncludesDictionary.has(def)) {
          // Note that this also halts when it met indeterminate state
          // to prevent infinite recursion
          return typedefIncludesDictionary.get(def);
        }
        defs.cache.typedefIncludesDictionary.set(def, undefined); // indeterminate state
        const result = idlTypeIncludesDictionary(def.idlType, defs);
        defs.cache.typedefIncludesDictionary.set(def, result);
        if (result) {
          return {
            reference: idlType,
            dictionary: result.dictionary
          };
        }
      }
      if (def.type === "dictionary" && (useNullableInner || !idlType.nullable)) {
        return {
          reference: idlType,
          dictionary: def
        };
      }
    }
    for (const subtype of idlType.subtype) {
      const result = idlTypeIncludesDictionary(subtype, defs);
      if (result) {
        if (subtype.union) {
          return result;
        }
        return {
          reference: subtype,
          dictionary: result.dictionary
        };
      }
    }
  }

  /**
   * @param {*} dict dictionary type
   * @param {import("../validator.js").Definitions} defs
   * @return {boolean}
   */
  function dictionaryIncludesRequiredField(dict, defs) {
    if (defs.cache.dictionaryIncludesRequiredField.has(dict)) {
      return defs.cache.dictionaryIncludesRequiredField.get(dict);
    }
    defs.cache.dictionaryIncludesRequiredField.set(dict, undefined); // indeterminate
    if (dict.inheritance) {
      const superdict = defs.unique.get(dict.inheritance);
      if (!superdict) {
        return true;
      }
      if (dictionaryIncludesRequiredField(superdict, defs)) {
        return true;
      }
    }
    const result = dict.members.some(field => field.required);
    defs.cache.dictionaryIncludesRequiredField.set(dict, result);
    return result;
  }

  // @ts-check

  class ArrayBase extends Array {
    constructor({ source, tokens }) {
      super();
      Object.defineProperties(this, {
        source: { value: source },
        tokens: { value: tokens },
        parent: { value: null, writable: true }
      });
    }
  }

  // @ts-check

  class Token extends Base {
    /**
     * @param {import("../tokeniser").Tokeniser} tokeniser
     * @param {string} type
     */
    static parser(tokeniser, type) {
      return () => {
        const value = tokeniser.consume(type);
        if (value) {
          return new Token({ source: tokeniser.source, tokens: { value } });
        }
      };
    }

    get value() {
      return unescape(this.tokens.value.value);
    }
  }

  /**
   * @param {import("../tokeniser").Tokeniser} tokeniser
   * @param {string} tokenName
   */
  function tokens(tokeniser, tokenName) {
    return list(tokeniser, {
      parser: Token.parser(tokeniser, tokenName),
      listName: tokenName + " list"
    });
  }

  const extAttrValueSyntax = ["identifier", "decimal", "integer", "string"];

  const shouldBeLegacyPrefixed = [
    "NoInterfaceObject",
    "LenientSetter",
    "LenientThis",
    "TreatNonObjectAsNull",
    "Unforgeable",
  ];

  const renamedLegacies = new Map([
    ...shouldBeLegacyPrefixed.map(name => [name, `Legacy${name}`]),
    ["NamedConstructor", "LegacyFactoryFunction"],
    ["OverrideBuiltins", "LegacyOverrideBuiltIns"],
    ["TreatNullAs", "LegacyNullToEmptyString"],
  ]);

  /**
   * This will allow a set of extended attribute values to be parsed.
   * @param {import("../tokeniser").Tokeniser} tokeniser
   */
  function extAttrListItems(tokeniser) {
    for (const syntax of extAttrValueSyntax) {
      const toks = tokens(tokeniser, syntax);
      if (toks.length) {
        return toks;
      }
    }
    tokeniser.error(`Expected identifiers, strings, decimals, or integers but none found`);
  }


  class ExtendedAttributeParameters extends Base {
    /**
     * @param {import("../tokeniser").Tokeniser} tokeniser
     */
    static parse(tokeniser) {
      const tokens = { assign: tokeniser.consume("=") };
      const ret = autoParenter(new ExtendedAttributeParameters({ source: tokeniser.source, tokens }));
      if (tokens.assign) {
        tokens.secondaryName = tokeniser.consume(...extAttrValueSyntax);
      }
      tokens.open = tokeniser.consume("(");
      if (tokens.open) {
        ret.list = ret.rhsIsList ?
          // [Exposed=(Window,Worker)]
          extAttrListItems(tokeniser) :
          // [LegacyFactoryFunction=Audio(DOMString src)] or [Constructor(DOMString str)]
          argument_list(tokeniser);
        tokens.close = tokeniser.consume(")") || tokeniser.error("Unexpected token in extended attribute argument list");
      } else if (ret.hasRhs && !tokens.secondaryName) {
        tokeniser.error("No right hand side to extended attribute assignment");
      }
      return ret.this;
    }

    get rhsIsList() {
      return this.tokens.assign && !this.tokens.secondaryName;
    }

    get rhsType() {
      if (this.rhsIsList) {
        return this.list[0].tokens.value.type + "-list";
      }
      if (this.tokens.secondaryName) {
        return this.tokens.secondaryName.type;
      }
      return null;
    }
  }

  class SimpleExtendedAttribute extends Base {
    /**
     * @param {import("../tokeniser").Tokeniser} tokeniser
     */
    static parse(tokeniser) {
      const name = tokeniser.consume("identifier");
      if (name) {
        return new SimpleExtendedAttribute({
          source: tokeniser.source,
          tokens: { name },
          params: ExtendedAttributeParameters.parse(tokeniser)
        });
      }
    }

    constructor({ source, tokens, params }) {
      super({ source, tokens });
      params.parent = this;
      Object.defineProperty(this, "params", { value: params });
    }

    get type() {
      return "extended-attribute";
    }
    get name() {
      return this.tokens.name.value;
    }
    get rhs() {
      const { rhsType: type, tokens, list } = this.params;
      if (!type) {
        return null;
      }
      const value = this.params.rhsIsList ? list : unescape(tokens.secondaryName.value);
      return { type, value };
    }
    get arguments() {
      const { rhsIsList, list } = this.params;
      if (!list || rhsIsList) {
        return [];
      }
      return list;
    }

    *validate(defs) {
      const { name } = this;
      if (name === "LegacyNoInterfaceObject") {
        const message = `\`[LegacyNoInterfaceObject]\` extended attribute is an \
undesirable feature that may be removed from Web IDL in the future. Refer to the \
[relevant upstream PR](https://github.com/heycam/webidl/pull/609) for more \
information.`;
        yield validationError(this.tokens.name, this, "no-nointerfaceobject", message, { level: "warning" });
      } else if (renamedLegacies.has(name)) {
        const message = `\`[${name}]\` extended attribute is a legacy feature \
that is now renamed to \`[${renamedLegacies.get(name)}]\`. Refer to the \
[relevant upstream PR](https://github.com/heycam/webidl/pull/870) for more \
information.`;
        yield validationError(this.tokens.name, this, "renamed-legacy", message, {
          level: "warning",
          autofix: renameLegacyExtendedAttribute(this)
        });
      }
      for (const arg of this.arguments) {
        yield* arg.validate(defs);
      }
    }
  }

  /**
   * @param {SimpleExtendedAttribute} extAttr
   */
  function renameLegacyExtendedAttribute(extAttr) {
    return () => {
      const { name } = extAttr;
      extAttr.tokens.name.value = renamedLegacies.get(name);
      if (name === "TreatNullAs") {
        extAttr.params.tokens = {};
      }
    };
  }

  // Note: we parse something simpler than the official syntax. It's all that ever
  // seems to be used
  class ExtendedAttributes extends ArrayBase {
    /**
     * @param {import("../tokeniser").Tokeniser} tokeniser
     */
    static parse(tokeniser) {
      const tokens = {};
      tokens.open = tokeniser.consume("[");
      if (!tokens.open) return new ExtendedAttributes({});
      const ret = new ExtendedAttributes({ source: tokeniser.source, tokens });
      ret.push(...list(tokeniser, {
        parser: SimpleExtendedAttribute.parse,
        listName: "extended attribute"
      }));
      tokens.close = tokeniser.consume("]") || tokeniser.error("Unexpected closing token of extended attribute");
      if (!ret.length) {
        tokeniser.error("Found an empty extended attribute");
      }
      if (tokeniser.probe("[")) {
        tokeniser.error("Illegal double extended attribute lists, consider merging them");
      }
      return ret;
    }

    *validate(defs) {
      for (const extAttr of this) {
        yield* extAttr.validate(defs);
      }
    }
  }

  /**
   * @param {import("../tokeniser").Tokeniser} tokeniser
   * @param {string} typeName
   */
  function generic_type(tokeniser, typeName) {
    const base = tokeniser.consume("FrozenArray", "Promise", "sequence", "record");
    if (!base) {
      return;
    }
    const ret = autoParenter(new Type({ source: tokeniser.source, tokens: { base } }));
    ret.tokens.open = tokeniser.consume("<") || tokeniser.error(`No opening bracket after ${base.type}`);
    switch (base.type) {
      case "Promise": {
        if (tokeniser.probe("[")) tokeniser.error("Promise type cannot have extended attribute");
        const subtype = return_type(tokeniser, typeName) || tokeniser.error("Missing Promise subtype");
        ret.subtype.push(subtype);
        break;
      }
      case "sequence":
      case "FrozenArray": {
        const subtype = type_with_extended_attributes(tokeniser, typeName) || tokeniser.error(`Missing ${base.type} subtype`);
        ret.subtype.push(subtype);
        break;
      }
      case "record": {
        if (tokeniser.probe("[")) tokeniser.error("Record key cannot have extended attribute");
        const keyType = tokeniser.consume(...stringTypes) || tokeniser.error(`Record key must be one of: ${stringTypes.join(", ")}`);
        const keyIdlType = new Type({ source: tokeniser.source, tokens: { base: keyType }});
        keyIdlType.tokens.separator = tokeniser.consume(",") || tokeniser.error("Missing comma after record key type");
        keyIdlType.type = typeName;
        const valueType = type_with_extended_attributes(tokeniser, typeName) || tokeniser.error("Error parsing generic type record");
        ret.subtype.push(keyIdlType, valueType);
        break;
      }
    }
    if (!ret.idlType) tokeniser.error(`Error parsing generic type ${base.type}`);
    ret.tokens.close = tokeniser.consume(">") || tokeniser.error(`Missing closing bracket after ${base.type}`);
    return ret.this;
  }

  /**
   * @param {import("../tokeniser").Tokeniser} tokeniser
   */
  function type_suffix(tokeniser, obj) {
    const nullable = tokeniser.consume("?");
    if (nullable) {
      obj.tokens.nullable = nullable;
    }
    if (tokeniser.probe("?")) tokeniser.error("Can't nullable more than once");
  }

  /**
   * @param {import("../tokeniser").Tokeniser} tokeniser
   * @param {string} typeName
   */
  function single_type(tokeniser, typeName) {
    let ret = generic_type(tokeniser, typeName) || primitive_type(tokeniser);
    if (!ret) {
      const base = tokeniser.consume("identifier", ...stringTypes, ...typeNameKeywords);
      if (!base) {
        return;
      }
      ret = new Type({ source: tokeniser.source, tokens: { base } });
      if (tokeniser.probe("<")) tokeniser.error(`Unsupported generic type ${base.value}`);
    }
    if (ret.generic === "Promise" && tokeniser.probe("?")) {
      tokeniser.error("Promise type cannot be nullable");
    }
    ret.type = typeName || null;
    type_suffix(tokeniser, ret);
    if (ret.nullable && ret.idlType === "any") tokeniser.error("Type `any` cannot be made nullable");
    return ret;
  }

  /**
   * @param {import("../tokeniser").Tokeniser} tokeniser
   * @param {string} type
   */
  function union_type(tokeniser, type) {
    const tokens = {};
    tokens.open = tokeniser.consume("(");
    if (!tokens.open) return;
    const ret = autoParenter(new Type({ source: tokeniser.source, tokens }));
    ret.type = type || null;
    while (true) {
      const typ = type_with_extended_attributes(tokeniser) || tokeniser.error("No type after open parenthesis or 'or' in union type");
      if (typ.idlType === "any") tokeniser.error("Type `any` cannot be included in a union type");
      if (typ.generic === "Promise") tokeniser.error("Type `Promise` cannot be included in a union type");
      ret.subtype.push(typ);
      const or = tokeniser.consume("or");
      if (or) {
        typ.tokens.separator = or;
      }
      else break;
    }
    if (ret.idlType.length < 2) {
      tokeniser.error("At least two types are expected in a union type but found less");
    }
    tokens.close = tokeniser.consume(")") || tokeniser.error("Unterminated union type");
    type_suffix(tokeniser, ret);
    return ret.this;
  }

  class Type extends Base {
    /**
     * @param {import("../tokeniser").Tokeniser} tokeniser
     * @param {string} typeName
     */
    static parse(tokeniser, typeName) {
      return single_type(tokeniser, typeName) || union_type(tokeniser, typeName);
    }

    constructor({ source, tokens }) {
      super({ source, tokens });
      Object.defineProperty(this, "subtype", { value: [], writable: true });
      this.extAttrs = new ExtendedAttributes({});
    }

    get generic() {
      if (this.subtype.length && this.tokens.base) {
        return this.tokens.base.value;
      }
      return "";
    }
    get nullable() {
      return Boolean(this.tokens.nullable);
    }
    get union() {
      return Boolean(this.subtype.length) && !this.tokens.base;
    }
    get idlType() {
      if (this.subtype.length) {
        return this.subtype;
      }
      // Adding prefixes/postfixes for "unrestricted float", etc.
      const name = [
        this.tokens.prefix,
        this.tokens.base,
        this.tokens.postfix
      ].filter(t => t).map(t => t.value).join(" ");
      return unescape(name);
    }

    *validate(defs) {
      yield* this.extAttrs.validate(defs);
      /*
       * If a union is nullable, its subunions cannot include a dictionary
       * If not, subunions may include dictionaries if each union is not nullable
       */
      const typedef = !this.union && defs.unique.get(this.idlType);
      const target =
        this.union ? this :
        (typedef && typedef.type === "typedef") ? typedef.idlType :
        undefined;
      if (target && this.nullable) {
        // do not allow any dictionary
        const { reference } = idlTypeIncludesDictionary(target, defs) || {};
        if (reference) {
          const targetToken = (this.union ? reference : this).tokens.base;
          const message = `Nullable union cannot include a dictionary type`;
          yield validationError(targetToken, this, "no-nullable-union-dict", message);
        }
      } else {
        // allow some dictionary
        for (const subtype of this.subtype) {
          yield* subtype.validate(defs);
        }
      }
    }
  }

  class Default extends Base {
    /**
     * @param {import("../tokeniser").Tokeniser} tokeniser
     */
    static parse(tokeniser) {
      const assign = tokeniser.consume("=");
      if (!assign) {
        return null;
      }
      const def = const_value(tokeniser) || tokeniser.consume("string", "null", "[", "{") || tokeniser.error("No value for default");
      const expression = [def];
      if (def.type === "[") {
        const close = tokeniser.consume("]") || tokeniser.error("Default sequence value must be empty");
        expression.push(close);
      } else if (def.type === "{") {
        const close = tokeniser.consume("}") || tokeniser.error("Default dictionary value must be empty");
        expression.push(close);
      }
      return new Default({ source: tokeniser.source, tokens: { assign }, expression });
    }

    constructor({ source, tokens, expression }) {
      super({ source, tokens });
      expression.parent = this;
      Object.defineProperty(this, "expression", { value: expression });
    }

    get type() {
      return const_data(this.expression[0]).type;
    }
    get value() {
      return const_data(this.expression[0]).value;
    }
    get negative() {
      return const_data(this.expression[0]).negative;
    }
  }

  // @ts-check

  class Argument extends Base {
    /**
     * @param {import("../tokeniser").Tokeniser} tokeniser
     */
    static parse(tokeniser) {
      const start_position = tokeniser.position;
      /** @type {Base["tokens"]} */
      const tokens = {};
      const ret = autoParenter(new Argument({ source: tokeniser.source, tokens }));
      ret.extAttrs = ExtendedAttributes.parse(tokeniser);
      tokens.optional = tokeniser.consume("optional");
      ret.idlType = type_with_extended_attributes(tokeniser, "argument-type");
      if (!ret.idlType) {
        return tokeniser.unconsume(start_position);
      }
      if (!tokens.optional) {
        tokens.variadic = tokeniser.consume("...");
      }
      tokens.name = tokeniser.consume("identifier", ...argumentNameKeywords);
      if (!tokens.name) {
        return tokeniser.unconsume(start_position);
      }
      ret.default = tokens.optional ? Default.parse(tokeniser) : null;
      return ret.this;
    }

    get type() {
      return "argument";
    }
    get optional() {
      return !!this.tokens.optional;
    }
    get variadic() {
      return !!this.tokens.variadic;
    }
    get name() {
      return unescape(this.tokens.name.value);
    }

    /**
     * @param {import("../validator.js").Definitions} defs
     */
    *validate(defs) {
      yield* this.idlType.validate(defs);
      const result = idlTypeIncludesDictionary(this.idlType, defs, { useNullableInner: true });
      if (result) {
        if (this.idlType.nullable) {
          const message = `Dictionary arguments cannot be nullable.`;
          yield validationError(this.tokens.name, this, "no-nullable-dict-arg", message);
        } else if (!this.optional) {
          if (this.parent && !dictionaryIncludesRequiredField(result.dictionary, defs) && isLastRequiredArgument(this)) {
            const message = `Dictionary argument must be optional if it has no required fields`;
            yield validationError(this.tokens.name, this, "dict-arg-optional", message, {
              autofix: autofixDictionaryArgumentOptionality(this)
            });
          }
        } else if (!this.default) {
          const message = `Optional dictionary arguments must have a default value of \`{}\`.`;
          yield validationError(this.tokens.name, this, "dict-arg-default", message, {
            autofix: autofixOptionalDictionaryDefaultValue(this)
          });
        }
      }
    }
  }

  /**
   * @param {Argument} arg
   */
  function isLastRequiredArgument(arg) {
    const list = arg.parent.arguments || arg.parent.list;
    const index = list.indexOf(arg);
    const requiredExists = list.slice(index + 1).some(a => !a.optional);
    return !requiredExists;
  }

  /**
   * @param {Argument} arg
   */
  function autofixDictionaryArgumentOptionality(arg) {
    return () => {
      const firstToken = getFirstToken(arg.idlType);
      arg.tokens.optional = { type: "optional", value: "optional", trivia: firstToken.trivia };
      firstToken.trivia = " ";
      autofixOptionalDictionaryDefaultValue(arg)();
    };
  }

  /**
   * @param {Argument} arg
   */
  function autofixOptionalDictionaryDefaultValue(arg) {
    return () => {
      arg.default = Default.parse(new Tokeniser(" = {}"));
    };
  }

  class Operation extends Base {
    /**
     * @typedef {import("../tokeniser.js").Token} Token
     *
     * @param {import("../tokeniser.js").Tokeniser} tokeniser
     * @param {object} [options]
     * @param {Token} [options.special]
     * @param {Token} [options.regular]
     */
    static parse(tokeniser, { special, regular } = {}) {
      const tokens = { special };
      const ret = autoParenter(new Operation({ source: tokeniser.source, tokens }));
      if (special && special.value === "stringifier") {
        tokens.termination = tokeniser.consume(";");
        if (tokens.termination) {
          ret.arguments = [];
          return ret;
        }
      }
      if (!special && !regular) {
        tokens.special = tokeniser.consume("getter", "setter", "deleter");
      }
      ret.idlType = return_type(tokeniser) || tokeniser.error("Missing return type");
      tokens.name = tokeniser.consume("identifier", "includes");
      tokens.open = tokeniser.consume("(") || tokeniser.error("Invalid operation");
      ret.arguments = argument_list(tokeniser);
      tokens.close = tokeniser.consume(")") || tokeniser.error("Unterminated operation");
      tokens.termination = tokeniser.consume(";") || tokeniser.error("Unterminated operation, expected `;`");
      return ret.this;
    }

    get type() {
      return "operation";
    }
    get name() {
      const { name } = this.tokens;
      if (!name) {
        return "";
      }
      return unescape(name.value);
    }
    get special() {
      if (!this.tokens.special) {
        return "";
      }
      return this.tokens.special.value;
    }

    *validate(defs) {
      if (!this.name && ["", "static"].includes(this.special)) {
        const message = `Regular or static operations must have both a return type and an identifier.`;
        yield validationError(this.tokens.open, this, "incomplete-op", message);
      }
      if (this.idlType) {
        yield* this.idlType.validate(defs);
      }
      for (const argument of this.arguments) {
        yield* argument.validate(defs);
      }
    }
  }

  class Attribute extends Base {
    /**
     * @param {import("../tokeniser.js").Tokeniser} tokeniser
     */
    static parse(tokeniser, { special, noInherit = false, readonly = false } = {}) {
      const start_position = tokeniser.position;
      const tokens = { special };
      const ret = autoParenter(new Attribute({ source: tokeniser.source, tokens }));
      if (!special && !noInherit) {
        tokens.special = tokeniser.consume("inherit");
      }
      if (ret.special === "inherit" && tokeniser.probe("readonly")) {
        tokeniser.error("Inherited attributes cannot be read-only");
      }
      tokens.readonly = tokeniser.consume("readonly");
      if (readonly && !tokens.readonly && tokeniser.probe("attribute")) {
        tokeniser.error("Attributes must be readonly in this context");
      }
      tokens.base = tokeniser.consume("attribute");
      if (!tokens.base) {
        tokeniser.unconsume(start_position);
        return;
      }
      ret.idlType = type_with_extended_attributes(tokeniser, "attribute-type") || tokeniser.error("Attribute lacks a type");
      switch (ret.idlType.generic) {
        case "sequence":
        case "record": tokeniser.error(`Attributes cannot accept ${ret.idlType.generic} types`);
      }
      tokens.name = tokeniser.consume("identifier", "async", "required") || tokeniser.error("Attribute lacks a name");
      tokens.termination = tokeniser.consume(";") || tokeniser.error("Unterminated attribute, expected `;`");
      return ret.this;
    }

    get type() {
      return "attribute";
    }
    get special() {
      if (!this.tokens.special) {
        return "";
      }
      return this.tokens.special.value;
    }
    get readonly() {
      return !!this.tokens.readonly;
    }
    get name() {
      return unescape(this.tokens.name.value);
    }

    *validate(defs) {
      yield* this.extAttrs.validate(defs);
      yield* this.idlType.validate(defs);
    }
  }

  /**
   * @param {string} identifier
   */
  function unescape(identifier) {
    return identifier.startsWith('_') ? identifier.slice(1) : identifier;
  }

  /**
   * Parses comma-separated list
   * @param {import("../tokeniser").Tokeniser} tokeniser
   * @param {object} args
   * @param {Function} args.parser parser function for each item
   * @param {boolean} [args.allowDangler] whether to allow dangling comma
   * @param {string} [args.listName] the name to be shown on error messages
   */
  function list(tokeniser, { parser, allowDangler, listName = "list" }) {
    const first = parser(tokeniser);
    if (!first) {
      return [];
    }
    first.tokens.separator = tokeniser.consume(",");
    const items = [first];
    while (first.tokens.separator) {
      const item = parser(tokeniser);
      if (!item) {
        if (!allowDangler) {
          tokeniser.error(`Trailing comma in ${listName}`);
        }
        break;
      }
      item.tokens.separator = tokeniser.consume(",");
      items.push(item);
      if (!item.tokens.separator) break;
    }
    return items;
  }

  /**
   * @param {import("../tokeniser").Tokeniser} tokeniser
   */
  function const_value(tokeniser) {
    return tokeniser.consume("true", "false", "Infinity", "-Infinity", "NaN", "decimal", "integer");
  }

  /**
   * @param {object} token
   * @param {string} token.type
   * @param {string} token.value
   */
  function const_data({ type, value }) {
    switch (type) {
      case "true":
      case "false":
        return { type: "boolean", value: type === "true" };
      case "Infinity":
      case "-Infinity":
        return { type: "Infinity", negative: type.startsWith("-") };
      case "[":
        return { type: "sequence", value: [] };
      case "{":
        return { type: "dictionary" };
      case "decimal":
      case "integer":
        return { type: "number", value };
      case "string":
        return { type: "string", value: value.slice(1, -1) };
      default:
        return { type };
    }
  }

  /**
   * @param {import("../tokeniser").Tokeniser} tokeniser
   */
  function primitive_type(tokeniser) {
    function integer_type() {
      const prefix = tokeniser.consume("unsigned");
      const base = tokeniser.consume("short", "long");
      if (base) {
        const postfix = tokeniser.consume("long");
        return new Type({ source, tokens: { prefix, base, postfix } });
      }
      if (prefix) tokeniser.error("Failed to parse integer type");
    }

    function decimal_type() {
      const prefix = tokeniser.consume("unrestricted");
      const base = tokeniser.consume("float", "double");
      if (base) {
        return new Type({ source, tokens: { prefix, base } });
      }
      if (prefix) tokeniser.error("Failed to parse float type");
    }

    const { source } = tokeniser;
    const num_type = integer_type() || decimal_type();
    if (num_type) return num_type;
    const base = tokeniser.consume("boolean", "byte", "octet");
    if (base) {
      return new Type({ source, tokens: { base } });
    }
  }

  /**
   * @param {import("../tokeniser").Tokeniser} tokeniser
   */
  function argument_list(tokeniser) {
    return list(tokeniser, { parser: Argument.parse, listName: "arguments list" });
  }

  /**
   * @param {import("../tokeniser").Tokeniser} tokeniser
   * @param {string} typeName
   */
  function type_with_extended_attributes(tokeniser, typeName) {
    const extAttrs = ExtendedAttributes.parse(tokeniser);
    const ret = Type.parse(tokeniser, typeName);
    if (ret) autoParenter(ret).extAttrs = extAttrs;
    return ret;
  }

  /**
   * @param {import("../tokeniser").Tokeniser} tokeniser
   * @param {string} typeName
   */
  function return_type(tokeniser, typeName) {
    const typ = Type.parse(tokeniser, typeName || "return-type");
    if (typ) {
      return typ;
    }
    const voidToken = tokeniser.consume("void");
    if (voidToken) {
      const ret = new Type({ source: tokeniser.source, tokens: { base: voidToken } });
      ret.type = "return-type";
      return ret;
    }
  }

  /**
   * @param {import("../tokeniser").Tokeniser} tokeniser
   */
  function stringifier(tokeniser) {
    const special = tokeniser.consume("stringifier");
    if (!special) return;
    const member = Attribute.parse(tokeniser, { special }) ||
      Operation.parse(tokeniser, { special }) ||
      tokeniser.error("Unterminated stringifier");
    return member;
  }

  /**
   * @param {string} str
   */
  function getLastIndentation(str) {
    const lines = str.split("\n");
    // the first line visually binds to the preceding token
    if (lines.length) {
      const match = lines[lines.length - 1].match(/^\s+/);
      if (match) {
        return match[0];
      }
    }
    return "";
  }

  /**
   * @param {string} parentTrivia
   */
  function getMemberIndentation(parentTrivia) {
    const indentation = getLastIndentation(parentTrivia);
    const indentCh = indentation.includes("\t") ? "\t" : "  ";
    return indentation + indentCh;
  }

  /**
   * @param {object} def
   * @param {import("./extended-attributes.js").ExtendedAttributes} def.extAttrs
   */
  function autofixAddExposedWindow(def) {
    return () => {
      if (def.extAttrs.length){
        const tokeniser = new Tokeniser("Exposed=Window,");
        const exposed = SimpleExtendedAttribute.parse(tokeniser);
        exposed.tokens.separator = tokeniser.consume(",");
        const existing = def.extAttrs[0];
        if (!/^\s/.test(existing.tokens.name.trivia)) {
          existing.tokens.name.trivia = ` ${existing.tokens.name.trivia}`;
        }
        def.extAttrs.unshift(exposed);
      } else {
        autoParenter(def).extAttrs = ExtendedAttributes.parse(new Tokeniser("[Exposed=Window]"));
        const trivia = def.tokens.base.trivia;
        def.extAttrs.tokens.open.trivia = trivia;
        def.tokens.base.trivia = `\n${getLastIndentation(trivia)}`;
      }
    };
  }

  /**
   * Get the first syntax token for the given IDL object.
   * @param {*} data
   */
  function getFirstToken(data) {
    if (data.extAttrs.length) {
      return data.extAttrs.tokens.open;
    }
    if (data.type === "operation" && !data.special) {
      return getFirstToken(data.idlType);
    }
    const tokens = Object.values(data.tokens).sort((x, y) => x.index - y.index);
    return tokens[0];
  }

  /**
   * @template T
   * @param {T[]} array
   * @param {(item: T) => boolean} predicate
   */
  function findLastIndex(array, predicate) {
    const index = array.slice().reverse().findIndex(predicate);
    if (index === -1) {
      return index;
    }
    return array.length - index - 1;
  }

  /**
   * Returns a proxy that auto-assign `parent` field.
   * @template T
   * @param {T} data
   * @param {*} [parent] The object that will be assigned to `parent`.
   *                     If absent, it will be `data` by default.
   * @return {T}
   */
  function autoParenter(data, parent) {
    if (!parent) {
      // Defaults to `data` unless specified otherwise.
      parent = data;
    }
    if (!data) {
      // This allows `autoParenter(undefined)` which again allows
      // `autoParenter(parse())` where the function may return nothing.
      return data;
    }
    return new Proxy(data, {
      get(target, p) {
        const value = target[p];
        if (Array.isArray(value)) {
          // Wraps the array so that any added items will also automatically
          // get their `parent` values.
          return autoParenter(value, target);
        }
        return value;
      },
      set(target, p, value) {
        target[p] = value;
        if (!value) {
          return true;
        } else if (Array.isArray(value)) {
          // Assigning an array will add `parent` to its items.
          for (const item of value) {
            if (typeof item.parent !== "undefined") {
              item.parent = parent;
            }
          }
        } else if (typeof value.parent !== "undefined") {
          value.parent = parent;
        }
        return true;
      }
    });
  }

  // These regular expressions use the sticky flag so they will only match at
  // the current location (ie. the offset of lastIndex).
  const tokenRe = {
    // This expression uses a lookahead assertion to catch false matches
    // against integers early.
    "decimal": /-?(?=[0-9]*\.|[0-9]+[eE])(([0-9]+\.[0-9]*|[0-9]*\.[0-9]+)([Ee][-+]?[0-9]+)?|[0-9]+[Ee][-+]?[0-9]+)/y,
    "integer": /-?(0([Xx][0-9A-Fa-f]+|[0-7]*)|[1-9][0-9]*)/y,
    "identifier": /[_-]?[A-Za-z][0-9A-Z_a-z-]*/y,
    "string": /"[^"]*"/y,
    "whitespace": /[\t\n\r ]+/y,
    "comment": /((\/(\/.*|\*([^*]|\*[^/])*\*\/)[\t\n\r ]*)+)/y,
    "other": /[^\t\n\r 0-9A-Za-z]/y
  };

  const typeNameKeywords = [
    "ArrayBuffer",
    "DataView",
    "Int8Array",
    "Int16Array",
    "Int32Array",
    "Uint8Array",
    "Uint16Array",
    "Uint32Array",
    "Uint8ClampedArray",
    "Float32Array",
    "Float64Array",
    "any",
    "object",
    "symbol"
  ];

  const stringTypes = [
    "ByteString",
    "DOMString",
    "USVString"
  ];

  const argumentNameKeywords = [
    "async",
    "attribute",
    "callback",
    "const",
    "constructor",
    "deleter",
    "dictionary",
    "enum",
    "getter",
    "includes",
    "inherit",
    "interface",
    "iterable",
    "maplike",
    "namespace",
    "partial",
    "required",
    "setlike",
    "setter",
    "static",
    "stringifier",
    "typedef",
    "unrestricted"
  ];

  const nonRegexTerminals = [
    "-Infinity",
    "FrozenArray",
    "Infinity",
    "NaN",
    "Promise",
    "boolean",
    "byte",
    "double",
    "false",
    "float",
    "long",
    "mixin",
    "null",
    "octet",
    "optional",
    "or",
    "readonly",
    "record",
    "sequence",
    "short",
    "true",
    "unsigned",
    "void"
  ].concat(argumentNameKeywords, stringTypes, typeNameKeywords);

  const punctuations = [
    "(",
    ")",
    ",",
    "...",
    ":",
    ";",
    "<",
    "=",
    ">",
    "?",
    "[",
    "]",
    "{",
    "}"
  ];

  const reserved = [
    // "constructor" is now a keyword
    "_constructor",
    "toString",
    "_toString",
  ];

  /**
   * @typedef {ArrayItemType<ReturnType<typeof tokenise>>} Token
   * @param {string} str
   */
  function tokenise(str) {
    const tokens = [];
    let lastCharIndex = 0;
    let trivia = "";
    let line = 1;
    let index = 0;
    while (lastCharIndex < str.length) {
      const nextChar = str.charAt(lastCharIndex);
      let result = -1;

      if (/[\t\n\r ]/.test(nextChar)) {
        result = attemptTokenMatch("whitespace", { noFlushTrivia: true });
      } else if (nextChar === '/') {
        result = attemptTokenMatch("comment", { noFlushTrivia: true });
      }

      if (result !== -1) {
        const currentTrivia = tokens.pop().value;
        line += (currentTrivia.match(/\n/g) || []).length;
        trivia += currentTrivia;
        index -= 1;
      } else if (/[-0-9.A-Z_a-z]/.test(nextChar)) {
        result = attemptTokenMatch("decimal");
        if (result === -1) {
          result = attemptTokenMatch("integer");
        }
        if (result === -1) {
          result = attemptTokenMatch("identifier");
          const lastIndex = tokens.length - 1;
          const token = tokens[lastIndex];
          if (result !== -1) {
            if (reserved.includes(token.value)) {
              const message = `${unescape(token.value)} is a reserved identifier and must not be used.`;
              throw new WebIDLParseError(syntaxError(tokens, lastIndex, null, message));
            } else if (nonRegexTerminals.includes(token.value)) {
              token.type = token.value;
            }
          }
        }
      } else if (nextChar === '"') {
        result = attemptTokenMatch("string");
      }

      for (const punctuation of punctuations) {
        if (str.startsWith(punctuation, lastCharIndex)) {
          tokens.push({ type: punctuation, value: punctuation, trivia, line, index });
          trivia = "";
          lastCharIndex += punctuation.length;
          result = lastCharIndex;
          break;
        }
      }

      // other as the last try
      if (result === -1) {
        result = attemptTokenMatch("other");
      }
      if (result === -1) {
        throw new Error("Token stream not progressing");
      }
      lastCharIndex = result;
      index += 1;
    }

    // remaining trivia as eof
    tokens.push({
      type: "eof",
      value: "",
      trivia
    });

    return tokens;

    /**
     * @param {keyof typeof tokenRe} type
     * @param {object} options
     * @param {boolean} [options.noFlushTrivia]
     */
    function attemptTokenMatch(type, { noFlushTrivia } = {}) {
      const re = tokenRe[type];
      re.lastIndex = lastCharIndex;
      const result = re.exec(str);
      if (result) {
        tokens.push({ type, value: result[0], trivia, line, index });
        if (!noFlushTrivia) {
          trivia = "";
        }
        return re.lastIndex;
      }
      return -1;
    }
  }

  class Tokeniser {
    /**
     * @param {string} idl
     */
    constructor(idl) {
      this.source = tokenise(idl);
      this.position = 0;
    }

    /**
     * @param {string} message
     * @return {never}
     */
    error(message) {
      throw new WebIDLParseError(syntaxError(this.source, this.position, this.current, message));
    }

    /**
     * @param {string} type
     */
    probe(type) {
      return this.source.length > this.position && this.source[this.position].type === type;
    }

    /**
     * @param  {...string} candidates
     */
    consume(...candidates) {
      for (const type of candidates) {
        if (!this.probe(type)) continue;
        const token = this.source[this.position];
        this.position++;
        return token;
      }
    }

    /**
     * @param {number} position
     */
    unconsume(position) {
      this.position = position;
    }
  }

  class WebIDLParseError extends Error {
    /**
     * @param {object} options
     * @param {string} options.message
     * @param {string} options.bareMessage
     * @param {string} options.context
     * @param {number} options.line
     * @param {*} options.sourceName
     * @param {string} options.input
     * @param {*[]} options.tokens
     */
    constructor({ message, bareMessage, context, line, sourceName, input, tokens }) {
      super(message);

      this.name = "WebIDLParseError"; // not to be mangled
      this.bareMessage = bareMessage;
      this.context = context;
      this.line = line;
      this.sourceName = sourceName;
      this.input = input;
      this.tokens = tokens;
    }
  }

  class EnumValue extends Token {
    /**
     * @param {import("../tokeniser").Tokeniser} tokeniser
     */
    static parse(tokeniser) {
      const value = tokeniser.consume("string");
      if (value) {
        return new EnumValue({ source: tokeniser.source, tokens: { value } });
      }
    }

    get type() {
      return "enum-value";
    }
    get value() {
      return super.value.slice(1, -1);
    }
  }

  class Enum extends Base {
    /**
     * @param {import("../tokeniser").Tokeniser} tokeniser
     */
    static parse(tokeniser) {
      /** @type {Base["tokens"]} */
      const tokens = {};
      tokens.base = tokeniser.consume("enum");
      if (!tokens.base) {
        return;
      }
      tokens.name = tokeniser.consume("identifier") || tokeniser.error("No name for enum");
      const ret = autoParenter(new Enum({ source: tokeniser.source, tokens }));
      tokeniser.current = ret.this;
      tokens.open = tokeniser.consume("{") || tokeniser.error("Bodyless enum");
      ret.values = list(tokeniser, {
        parser: EnumValue.parse,
        allowDangler: true,
        listName: "enumeration"
      });
      if (tokeniser.probe("string")) {
        tokeniser.error("No comma between enum values");
      }
      tokens.close = tokeniser.consume("}") || tokeniser.error("Unexpected value in enum");
      if (!ret.values.length) {
        tokeniser.error("No value in enum");
      }
      tokens.termination = tokeniser.consume(";") || tokeniser.error("No semicolon after enum");
      return ret.this;
    }

    get type() {
      return "enum";
    }
    get name() {
      return unescape(this.tokens.name.value);
    }
  }

  // @ts-check

  class Includes extends Base {
    /**
     * @param {import("../tokeniser").Tokeniser} tokeniser
     */
    static parse(tokeniser) {
      const target = tokeniser.consume("identifier");
      if (!target) {
        return;
      }
      const tokens = { target };
      tokens.includes = tokeniser.consume("includes");
      if (!tokens.includes) {
        tokeniser.unconsume(target.index);
        return;
      }
      tokens.mixin = tokeniser.consume("identifier") || tokeniser.error("Incomplete includes statement");
      tokens.termination = tokeniser.consume(";") || tokeniser.error("No terminating ; for includes statement");
      return new Includes({ source: tokeniser.source, tokens });
    }

    get type() {
      return "includes";
    }
    get target() {
      return unescape(this.tokens.target.value);
    }
    get includes() {
      return unescape(this.tokens.mixin.value);
    }
  }

  class Typedef extends Base {
    /**
     * @param {import("../tokeniser").Tokeniser} tokeniser
     */
    static parse(tokeniser) {
      /** @type {Base["tokens"]} */
      const tokens = {};
      const ret = autoParenter(new Typedef({ source: tokeniser.source, tokens }));
      tokens.base = tokeniser.consume("typedef");
      if (!tokens.base) {
        return;
      }
      ret.idlType = type_with_extended_attributes(tokeniser, "typedef-type") || tokeniser.error("Typedef lacks a type");
      tokens.name = tokeniser.consume("identifier") || tokeniser.error("Typedef lacks a name");
      tokeniser.current = ret.this;
      tokens.termination = tokeniser.consume(";") || tokeniser.error("Unterminated typedef, expected `;`");
      return ret.this;
    }

    get type() {
      return "typedef";
    }
    get name() {
      return unescape(this.tokens.name.value);
    }

    *validate(defs) {
      yield* this.idlType.validate(defs);
    }
  }

  class CallbackFunction extends Base {
    /**
     * @param {import("../tokeniser.js").Tokeniser} tokeniser
     */
    static parse(tokeniser, base) {
      const tokens = { base };
      const ret = autoParenter(new CallbackFunction({ source: tokeniser.source, tokens }));
      tokens.name = tokeniser.consume("identifier") || tokeniser.error("Callback lacks a name");
      tokeniser.current = ret.this;
      tokens.assign = tokeniser.consume("=") || tokeniser.error("Callback lacks an assignment");
      ret.idlType = return_type(tokeniser) || tokeniser.error("Callback lacks a return type");
      tokens.open = tokeniser.consume("(") || tokeniser.error("Callback lacks parentheses for arguments");
      ret.arguments = argument_list(tokeniser);
      tokens.close = tokeniser.consume(")") || tokeniser.error("Unterminated callback");
      tokens.termination = tokeniser.consume(";") || tokeniser.error("Unterminated callback, expected `;`");
      return ret.this;
    }

    get type() {
      return "callback";
    }
    get name() {
      return unescape(this.tokens.name.value);
    }

    *validate(defs) {
      yield* this.extAttrs.validate(defs);
      yield* this.idlType.validate(defs);
    }
  }

  /**
   * @param {import("../tokeniser.js").Tokeniser} tokeniser
   */
  function inheritance(tokeniser) {
    const colon = tokeniser.consume(":");
    if (!colon) {
      return {};
    }
    const inheritance = tokeniser.consume("identifier") || tokeniser.error("Inheritance lacks a type");
    return { colon, inheritance };
  }

  class Container extends Base {
      /**
       * @template T
       * @param {import("../tokeniser.js").Tokeniser} tokeniser
       * @param {T} instance
       * @param {*} args
       */
      static parse(tokeniser, instance, { type, inheritable, allowedMembers }) {
        const { tokens } = instance;
        tokens.name = tokeniser.consume("identifier") || tokeniser.error(`Missing name in ${instance.type}`);
        tokeniser.current = instance;
        instance = autoParenter(instance);
        if (inheritable) {
          Object.assign(tokens, inheritance(tokeniser));
        }
        tokens.open = tokeniser.consume("{") || tokeniser.error(`Bodyless ${type}`);
        instance.members = [];
        while (true) {
          tokens.close = tokeniser.consume("}");
          if (tokens.close) {
            tokens.termination = tokeniser.consume(";") || tokeniser.error(`Missing semicolon after ${type}`);
            return instance.this;
          }
          const ea = ExtendedAttributes.parse(tokeniser);
          let mem;
          for (const [parser, ...args] of allowedMembers) {
            mem = autoParenter(parser(tokeniser, ...args));
            if (mem) {
              break;
            }
          }
          if (!mem) {
            tokeniser.error("Unknown member");
          }
          mem.extAttrs = ea;
          instance.members.push(mem.this);
        }
      }

      get partial() {
        return !!this.tokens.partial;
      }
      get name() {
        return unescape(this.tokens.name.value);
      }
      get inheritance() {
        if (!this.tokens.inheritance) {
          return null;
        }
        return unescape(this.tokens.inheritance.value);
      }

      *validate(defs) {
        for (const member of this.members) {
          if (member.validate) {
            yield* member.validate(defs);
          }
        }
      }
    }

  class Constant extends Base {
    /**
     * @param {import("../tokeniser.js").Tokeniser} tokeniser
     */
    static parse(tokeniser) {
      /** @type {Base["tokens"]} */
      const tokens = {};
      tokens.base = tokeniser.consume("const");
      if (!tokens.base) {
        return;
      }
      let idlType = primitive_type(tokeniser);
      if (!idlType) {
        const base = tokeniser.consume("identifier") || tokeniser.error("Const lacks a type");
        idlType = new Type({ source: tokeniser.source, tokens: { base } });
      }
      if (tokeniser.probe("?")) {
        tokeniser.error("Unexpected nullable constant type");
      }
      idlType.type = "const-type";
      tokens.name = tokeniser.consume("identifier") || tokeniser.error("Const lacks a name");
      tokens.assign = tokeniser.consume("=") || tokeniser.error("Const lacks value assignment");
      tokens.value = const_value(tokeniser) || tokeniser.error("Const lacks a value");
      tokens.termination = tokeniser.consume(";") || tokeniser.error("Unterminated const, expected `;`");
      const ret = new Constant({ source: tokeniser.source, tokens });
      autoParenter(ret).idlType = idlType;
      return ret;
    }

    get type() {
      return "const";
    }
    get name() {
      return unescape(this.tokens.name.value);
    }
    get value() {
      return const_data(this.tokens.value);
    }
  }

  class IterableLike extends Base {
    /**
     * @param {import("../tokeniser.js").Tokeniser} tokeniser
     */
    static parse(tokeniser) {
      const start_position = tokeniser.position;
      const tokens = {};
      const ret = autoParenter(new IterableLike({ source: tokeniser.source, tokens }));
      tokens.readonly = tokeniser.consume("readonly");
      if (!tokens.readonly) {
        tokens.async = tokeniser.consume("async");
      }
      tokens.base =
        tokens.readonly ? tokeniser.consume("maplike", "setlike") :
        tokens.async ? tokeniser.consume("iterable") :
        tokeniser.consume("iterable", "maplike", "setlike");
      if (!tokens.base) {
        tokeniser.unconsume(start_position);
        return;
      }

      const { type } = ret;
      const secondTypeRequired = type === "maplike";
      const secondTypeAllowed = secondTypeRequired || type === "iterable";
      const argumentAllowed = ret.async && type === "iterable";

      tokens.open = tokeniser.consume("<") || tokeniser.error(`Missing less-than sign \`<\` in ${type} declaration`);
      const first = type_with_extended_attributes(tokeniser) || tokeniser.error(`Missing a type argument in ${type} declaration`);
      ret.idlType = [first];
      ret.arguments = [];

      if (secondTypeAllowed) {
        first.tokens.separator = tokeniser.consume(",");
        if (first.tokens.separator) {
          ret.idlType.push(type_with_extended_attributes(tokeniser));
        }
        else if (secondTypeRequired) {
          tokeniser.error(`Missing second type argument in ${type} declaration`);
        }
      }

      tokens.close = tokeniser.consume(">") || tokeniser.error(`Missing greater-than sign \`>\` in ${type} declaration`);

      if (tokeniser.probe("(")) {
        if (argumentAllowed) {
          tokens.argsOpen = tokeniser.consume("(");
          ret.arguments.push(...argument_list(tokeniser));
          tokens.argsClose = tokeniser.consume(")") || tokeniser.error("Unterminated async iterable argument list");
        } else {
          tokeniser.error(`Arguments are only allowed for \`async iterable\``);
        }
      }

      tokens.termination = tokeniser.consume(";") || tokeniser.error(`Missing semicolon after ${type} declaration`);

      return ret.this;
    }

    get type() {
      return this.tokens.base.value;
    }
    get readonly() {
      return !!this.tokens.readonly;
    }
    get async() {
      return !!this.tokens.async;
    }

    *validate(defs) {
      for (const type of this.idlType) {
        yield* type.validate(defs);
      }
      for (const argument of this.arguments) {
        yield* argument.validate(defs);
      }
    }
  }

  // @ts-check

  function* checkInterfaceMemberDuplication(defs, i) {
    const opNames = new Set(getOperations(i).map(op => op.name));
    const partials = defs.partials.get(i.name) || [];
    const mixins = defs.mixinMap.get(i.name) || [];
    for (const ext of [...partials, ...mixins]) {
      const additions = getOperations(ext);
      yield* forEachExtension(additions, opNames, ext, i);
      for (const addition of additions) {
        opNames.add(addition.name);
      }
    }

    function* forEachExtension(additions, existings, ext, base) {
      for (const addition of additions) {
        const { name } = addition;
        if (name && existings.has(name)) {
          const message = `The operation "${name}" has already been defined for the base interface "${base.name}" either in itself or in a mixin`;
          yield validationError(addition.tokens.name, ext, "no-cross-overload", message);
        }
      }
    }

    function getOperations(i) {
      return i.members
        .filter(({type}) => type === "operation");
    }
  }

  class Constructor extends Base {
    /**
     * @param {import("../tokeniser").Tokeniser} tokeniser
     */
    static parse(tokeniser) {
      const base = tokeniser.consume("constructor");
      if (!base) {
        return;
      }
      /** @type {Base["tokens"]} */
      const tokens = { base };
      tokens.open = tokeniser.consume("(") || tokeniser.error("No argument list in constructor");
      const args = argument_list(tokeniser);
      tokens.close = tokeniser.consume(")") || tokeniser.error("Unterminated constructor");
      tokens.termination = tokeniser.consume(";") || tokeniser.error("No semicolon after constructor");
      const ret = new Constructor({ source: tokeniser.source, tokens });
      autoParenter(ret).arguments = args;
      return ret;
    }

    get type() {
      return "constructor";
    }

    *validate(defs) {
      if (this.idlType) {
        yield* this.idlType.validate(defs);
      }
      for (const argument of this.arguments) {
        yield* argument.validate(defs);
      }
    }
  }

  /**
   * @param {import("../tokeniser").Tokeniser} tokeniser
   */
  function static_member(tokeniser) {
    const special = tokeniser.consume("static");
    if (!special) return;
    const member = Attribute.parse(tokeniser, { special }) ||
      Operation.parse(tokeniser, { special }) ||
      tokeniser.error("No body in static member");
    return member;
  }

  class Interface extends Container {
    /**
     * @param {import("../tokeniser").Tokeniser} tokeniser
     */
    static parse(tokeniser, base, { partial = null } = {}) {
      const tokens = { partial, base };
      return Container.parse(tokeniser, new Interface({ source: tokeniser.source, tokens }), {
        type: "interface",
        inheritable: !partial,
        allowedMembers: [
          [Constant.parse],
          [Constructor.parse],
          [static_member],
          [stringifier],
          [IterableLike.parse],
          [Attribute.parse],
          [Operation.parse]
        ]
      });
    }

    get type() {
      return "interface";
    }

    *validate(defs) {
      yield* this.extAttrs.validate(defs);
      if (
        !this.partial &&
        this.extAttrs.every(extAttr => extAttr.name !== "Exposed") &&
        this.extAttrs.every(extAttr => extAttr.name !== "LegacyNoInterfaceObject")
      ) {
        const message = `Interfaces must have \`[Exposed]\` extended attribute. \
To fix, add, for example, \`[Exposed=Window]\`. Please also consider carefully \
if your interface should also be exposed in a Worker scope. Refer to the \
[WebIDL spec section on Exposed](https://heycam.github.io/webidl/#Exposed) \
for more information.`;
        yield validationError(this.tokens.name, this, "require-exposed", message, {
          autofix: autofixAddExposedWindow(this)
        });
      }
      const oldConstructors = this.extAttrs.filter(extAttr => extAttr.name === "Constructor");
      for (const constructor of oldConstructors) {
        const message = `Constructors should now be represented as a \`constructor()\` operation on the interface \
instead of \`[Constructor]\` extended attribute. Refer to the \
[WebIDL spec section on constructor operations](https://heycam.github.io/webidl/#idl-constructors) \
for more information.`;
        yield validationError(constructor.tokens.name, this, "constructor-member", message, {
          autofix: autofixConstructor(this, constructor)
        });
      }

      const isGlobal = this.extAttrs.some(extAttr => extAttr.name === "Global");
      if (isGlobal) {
        const factoryFunctions = this.extAttrs.filter(extAttr => extAttr.name === "LegacyFactoryFunction");
        for (const named of factoryFunctions) {
          const message = `Interfaces marked as \`[Global]\` cannot have factory functions.`;
          yield validationError(named.tokens.name, this, "no-constructible-global", message);
        }

        const constructors = this.members.filter(member => member.type === "constructor");
        for (const named of constructors) {
          const message = `Interfaces marked as \`[Global]\` cannot have constructors.`;
          yield validationError(named.tokens.base, this, "no-constructible-global", message);
        }
      }

      yield* super.validate(defs);
      if (!this.partial) {
        yield* checkInterfaceMemberDuplication(defs, this);
      }
    }
  }

  function autofixConstructor(interfaceDef, constructorExtAttr) {
    interfaceDef = autoParenter(interfaceDef);
    return () => {
      const indentation = getLastIndentation(interfaceDef.extAttrs.tokens.open.trivia);
      const memberIndent = interfaceDef.members.length ?
        getLastIndentation(getFirstToken(interfaceDef.members[0]).trivia) :
        getMemberIndentation(indentation);
      const constructorOp = Constructor.parse(new Tokeniser(`\n${memberIndent}constructor();`));
      constructorOp.extAttrs = new ExtendedAttributes({});
      autoParenter(constructorOp).arguments = constructorExtAttr.arguments;

      const existingIndex = findLastIndex(interfaceDef.members, m => m.type === "constructor");
      interfaceDef.members.splice(existingIndex + 1, 0, constructorOp);

      const { close }  = interfaceDef.tokens;
      if (!close.trivia.includes("\n")) {
        close.trivia += `\n${indentation}`;
      }

      const { extAttrs } = interfaceDef;
      const index = extAttrs.indexOf(constructorExtAttr);
      const removed = extAttrs.splice(index, 1);
      if (!extAttrs.length) {
        extAttrs.tokens.open = extAttrs.tokens.close = undefined;
      } else if (extAttrs.length === index) {
        extAttrs[index - 1].tokens.separator = undefined;
      } else if (!extAttrs[index].tokens.name.trivia.trim()) {
        extAttrs[index].tokens.name.trivia = removed[0].tokens.name.trivia;
      }
    };
  }

  class Mixin extends Container {
    /**
     * @typedef {import("../tokeniser.js").Token} Token
     *
     * @param {import("../tokeniser.js").Tokeniser} tokeniser
     * @param {Token} base
     * @param {object} [options]
     * @param {Token} [options.partial]
     */
    static parse(tokeniser, base, { partial } = {}) {
      const tokens = { partial, base };
      tokens.mixin = tokeniser.consume("mixin");
      if (!tokens.mixin) {
        return;
      }
      return Container.parse(tokeniser, new Mixin({ source: tokeniser.source, tokens }), {
        type: "interface mixin",
        allowedMembers: [
          [Constant.parse],
          [stringifier],
          [Attribute.parse, { noInherit: true }],
          [Operation.parse, { regular: true }]
        ]
      });
    }

    get type() {
      return "interface mixin";
    }
  }

  class Field extends Base {
    /**
     * @param {import("../tokeniser").Tokeniser} tokeniser
     */
    static parse(tokeniser) {
      /** @type {Base["tokens"]} */
      const tokens = {};
      const ret = autoParenter(new Field({ source: tokeniser.source, tokens }));
      ret.extAttrs = ExtendedAttributes.parse(tokeniser);
      tokens.required = tokeniser.consume("required");
      ret.idlType = type_with_extended_attributes(tokeniser, "dictionary-type") || tokeniser.error("Dictionary member lacks a type");
      tokens.name = tokeniser.consume("identifier") || tokeniser.error("Dictionary member lacks a name");
      ret.default = Default.parse(tokeniser);
      if (tokens.required && ret.default) tokeniser.error("Required member must not have a default");
      tokens.termination = tokeniser.consume(";") || tokeniser.error("Unterminated dictionary member, expected `;`");
      return ret.this;
    }

    get type() {
      return "field";
    }
    get name() {
      return unescape(this.tokens.name.value);
    }
    get required() {
      return !!this.tokens.required;
    }

    *validate(defs) {
      yield* this.idlType.validate(defs);
    }
  }

  // @ts-check

  class Dictionary extends Container {
    /**
     * @param {import("../tokeniser").Tokeniser} tokeniser
     * @param {object} [options]
     * @param {import("../tokeniser.js").Token} [options.partial]
     */
    static parse(tokeniser, { partial } = {}) {
      const tokens = { partial };
      tokens.base = tokeniser.consume("dictionary");
      if (!tokens.base) {
        return;
      }
      return Container.parse(tokeniser, new Dictionary({ source: tokeniser.source, tokens }), {
        type: "dictionary",
        inheritable: !partial,
        allowedMembers: [
          [Field.parse],
        ]
      });
    }

    get type() {
      return "dictionary";
    }
  }

  class Namespace extends Container {
    /**
     * @param {import("../tokeniser").Tokeniser} tokeniser
     * @param {object} [options]
     * @param {import("../tokeniser.js").Token} [options.partial]
     */
    static parse(tokeniser, { partial } = {}) {
      const tokens = { partial };
      tokens.base = tokeniser.consume("namespace");
      if (!tokens.base) {
        return;
      }
      return Container.parse(tokeniser, new Namespace({ source: tokeniser.source, tokens }), {
        type: "namespace",
        allowedMembers: [
          [Attribute.parse, { noInherit: true, readonly: true }],
          [Operation.parse, { regular: true }]
        ]
      });
    }

    get type() {
      return "namespace";
    }

    *validate(defs) {
      if (!this.partial && this.extAttrs.every(extAttr => extAttr.name !== "Exposed")) {
        const message = `Namespaces must have [Exposed] extended attribute. \
To fix, add, for example, [Exposed=Window]. Please also consider carefully \
if your namespace should also be exposed in a Worker scope. Refer to the \
[WebIDL spec section on Exposed](https://heycam.github.io/webidl/#Exposed) \
for more information.`;
        yield validationError(this.tokens.name, this, "require-exposed", message, {
          autofix: autofixAddExposedWindow(this)
        });
      }
      yield* super.validate(defs);
    }
  }

  // @ts-check

  class CallbackInterface extends Container {
    /**
     * @param {import("../tokeniser").Tokeniser} tokeniser
     */
    static parse(tokeniser, callback, { partial = null } = {}) {
      const tokens = { callback };
      tokens.base = tokeniser.consume("interface");
      if (!tokens.base) {
        return;
      }
      return Container.parse(tokeniser, new CallbackInterface({ source: tokeniser.source, tokens }), {
        type: "callback interface",
        inheritable: !partial,
        allowedMembers: [
          [Constant.parse],
          [Operation.parse, { regular: true }]
        ]
      });
    }

    get type() {
      return "callback interface";
    }
  }

  /**
   * @param {Tokeniser} tokeniser
   * @param {object} options
   * @param {boolean} [options.concrete]
   */
  function parseByTokens(tokeniser, options) {
    const source = tokeniser.source;

    function error(str) {
      tokeniser.error(str);
    }

    function consume(...candidates) {
      return tokeniser.consume(...candidates);
    }

    function callback() {
      const callback = consume("callback");
      if (!callback) return;
      if (tokeniser.probe("interface")) {
        return CallbackInterface.parse(tokeniser, callback);
      }
      return CallbackFunction.parse(tokeniser, callback);
    }

    function interface_(opts) {
      const base = consume("interface");
      if (!base) return;
      const ret = Mixin.parse(tokeniser, base, opts) ||
        Interface.parse(tokeniser, base, opts) ||
        error("Interface has no proper body");
      return ret;
    }

    function partial() {
      const partial = consume("partial");
      if (!partial) return;
      return Dictionary.parse(tokeniser, { partial }) ||
        interface_({ partial }) ||
        Namespace.parse(tokeniser, { partial }) ||
        error("Partial doesn't apply to anything");
    }

    function definition() {
      return callback() ||
        interface_() ||
        partial() ||
        Dictionary.parse(tokeniser) ||
        Enum.parse(tokeniser) ||
        Typedef.parse(tokeniser) ||
        Includes.parse(tokeniser) ||
        Namespace.parse(tokeniser);
    }

    function definitions() {
      if (!source.length) return [];
      const defs = [];
      while (true) {
        const ea = ExtendedAttributes.parse(tokeniser);
        const def = definition();
        if (!def) {
          if (ea.length) error("Stray extended attributes");
          break;
        }
        autoParenter(def).extAttrs = ea;
        defs.push(def);
      }
      const eof = consume("eof");
      if (options.concrete) {
        defs.push(eof);
      }
      return defs;
    }
    const res = definitions();
    if (tokeniser.position < source.length) error("Unrecognised tokens");
    return res;
  }

  /**
   * @param {string} str
   * @param {object} [options]
   * @param {*} [options.sourceName]
   * @param {boolean} [options.concrete]
   */
  function parse(str, options = {}) {
    const tokeniser = new Tokeniser(str);
    if (typeof options.sourceName !== "undefined") {
      tokeniser.source.name = options.sourceName;
    }
    return parseByTokens(tokeniser, options);
  }

  function noop(arg) {
    return arg;
  }

  const templates = {
    wrap: items => items.join(""),
    trivia: noop,
    name: noop,
    reference: noop,
    type: noop,
    generic: noop,
    nameless: noop,
    inheritance: noop,
    definition: noop,
    extendedAttribute: noop,
    extendedAttributeReference: noop
  };

  function write(ast, { templates: ts = templates } = {}) {
    ts = Object.assign({}, templates, ts);

    function reference(raw, { unescaped, context }) {
      if (!unescaped) {
        unescaped = raw.startsWith("_") ? raw.slice(1) : raw;
      }
      return ts.reference(raw, unescaped, context);
    }

    function token(t, wrapper = noop, ...args) {
      if (!t) {
        return "";
      }
      const value = wrapper(t.value, ...args);
      return ts.wrap([ts.trivia(t.trivia), value]);
    }

    function reference_token(t, context) {
      return token(t, reference, { context });
    }

    function name_token(t, arg) {
      return token(t, ts.name, arg);
    }

    function type_body(it) {
      if (it.union || it.generic) {
        return ts.wrap([
          token(it.tokens.base, ts.generic),
          token(it.tokens.open),
          ...it.subtype.map(type),
          token(it.tokens.close)
        ]);
      }
      const firstToken = it.tokens.prefix || it.tokens.base;
      const prefix = it.tokens.prefix ? [
        it.tokens.prefix.value,
        ts.trivia(it.tokens.base.trivia)
      ] : [];
      const ref = reference(ts.wrap([
        ...prefix,
        it.tokens.base.value,
        token(it.tokens.postfix)
      ]), { unescaped: it.idlType, context: it });
      return ts.wrap([ts.trivia(firstToken.trivia), ref]);
    }
    function type(it) {
      return ts.wrap([
        extended_attributes(it.extAttrs),
        type_body(it),
        token(it.tokens.nullable),
        token(it.tokens.separator)
      ]);
    }
    function default_(def) {
      if (!def) {
        return "";
      }
      return ts.wrap([
        token(def.tokens.assign),
        ...def.expression.map(t => token(t))
      ]);
    }
    function argument(arg) {
      return ts.wrap([
        extended_attributes(arg.extAttrs),
        token(arg.tokens.optional),
        ts.type(type(arg.idlType)),
        token(arg.tokens.variadic),
        name_token(arg.tokens.name, { data: arg }),
        default_(arg.default),
        token(arg.tokens.separator)
      ]);
    }
    function extended_attribute_listitem(str) {
      return ts.wrap([
        token(str.tokens.value),
        token(str.tokens.separator)
      ]);
    }
    function identifier(id, context) {
      return ts.wrap([
        reference_token(id.tokens.value, context),
        token(id.tokens.separator)
      ]);
    }
    function make_ext_at(it) {
      const { rhsType } = it.params;
      return ts.wrap([
        ts.trivia(it.tokens.name.trivia),
        ts.extendedAttribute(ts.wrap([
          ts.extendedAttributeReference(it.name),
          token(it.params.tokens.assign),
          reference_token(it.params.tokens.secondaryName, it),
          token(it.params.tokens.open),
          ...!it.params.list ? [] :
            it.params.list.map(
              rhsType === "identifier-list" ? id => identifier(id, it) :
              rhsType && rhsType.endsWith("-list") ? extended_attribute_listitem :
              argument
            ),
          token(it.params.tokens.close)
        ])),
        token(it.tokens.separator)
      ]);
    }
    function extended_attributes(eats) {
      if (!eats.length) return "";
      return ts.wrap([
        token(eats.tokens.open),
        ...eats.map(make_ext_at),
        token(eats.tokens.close)
      ]);
    }

    function operation(it, parent) {
      const body = it.idlType ? [
        ts.type(type(it.idlType)),
        name_token(it.tokens.name, { data: it, parent }),
        token(it.tokens.open),
        ts.wrap(it.arguments.map(argument)),
        token(it.tokens.close),
      ] : [];
      return ts.definition(ts.wrap([
        extended_attributes(it.extAttrs),
        it.tokens.name ? token(it.tokens.special) : token(it.tokens.special, ts.nameless, { data: it, parent }),
        ...body,
        token(it.tokens.termination)
      ]), { data: it, parent });
    }

    function attribute(it, parent) {
      return ts.definition(ts.wrap([
        extended_attributes(it.extAttrs),
        token(it.tokens.special),
        token(it.tokens.readonly),
        token(it.tokens.base),
        ts.type(type(it.idlType)),
        name_token(it.tokens.name, { data: it, parent }),
        token(it.tokens.termination)
      ]), { data: it, parent });
    }

    function constructor(it, parent) {
      return ts.definition(ts.wrap([
        extended_attributes(it.extAttrs),
        token(it.tokens.base, ts.nameless, { data: it, parent }),
        token(it.tokens.open),
        ts.wrap(it.arguments.map(argument)),
        token(it.tokens.close),
        token(it.tokens.termination)
      ]), { data: it, parent });
    }

    function inheritance(inh) {
      if (!inh.tokens.inheritance) {
        return "";
      }
      return ts.wrap([
        token(inh.tokens.colon),
        ts.trivia(inh.tokens.inheritance.trivia),
        ts.inheritance(reference(inh.tokens.inheritance.value, { context: inh }))
      ]);
    }

    function container(it) {
      return ts.definition(ts.wrap([
        extended_attributes(it.extAttrs),
        token(it.tokens.callback),
        token(it.tokens.partial),
        token(it.tokens.base),
        token(it.tokens.mixin),
        name_token(it.tokens.name, { data: it }),
        inheritance(it),
        token(it.tokens.open),
        iterate(it.members, it),
        token(it.tokens.close),
        token(it.tokens.termination)
      ]), { data: it });
    }

    function field(it, parent) {
      return ts.definition(ts.wrap([
        extended_attributes(it.extAttrs),
        token(it.tokens.required),
        ts.type(type(it.idlType)),
        name_token(it.tokens.name, { data: it, parent }),
        default_(it.default),
        token(it.tokens.termination)
      ]), { data: it, parent });
    }
    function const_(it, parent) {
      return ts.definition(ts.wrap([
        extended_attributes(it.extAttrs),
        token(it.tokens.base),
        ts.type(type(it.idlType)),
        name_token(it.tokens.name, { data: it, parent }),
        token(it.tokens.assign),
        token(it.tokens.value),
        token(it.tokens.termination)
      ]), { data: it, parent });
    }
    function typedef(it) {
      return ts.definition(ts.wrap([
        extended_attributes(it.extAttrs),
        token(it.tokens.base),
        ts.type(type(it.idlType)),
        name_token(it.tokens.name, { data: it }),
        token(it.tokens.termination)
      ]), { data: it });
    }
    function includes(it) {
      return ts.definition(ts.wrap([
        extended_attributes(it.extAttrs),
        reference_token(it.tokens.target, it),
        token(it.tokens.includes),
        reference_token(it.tokens.mixin, it),
        token(it.tokens.termination)
      ]), { data: it });
    }
    function callback(it) {
      return ts.definition(ts.wrap([
        extended_attributes(it.extAttrs),
        token(it.tokens.base),
        name_token(it.tokens.name, { data: it }),
        token(it.tokens.assign),
        ts.type(type(it.idlType)),
        token(it.tokens.open),
        ...it.arguments.map(argument),
        token(it.tokens.close),
        token(it.tokens.termination),
      ]), { data: it });
    }
    function enum_(it) {
      return ts.definition(ts.wrap([
        extended_attributes(it.extAttrs),
        token(it.tokens.base),
        name_token(it.tokens.name, { data: it }),
        token(it.tokens.open),
        iterate(it.values, it),
        token(it.tokens.close),
        token(it.tokens.termination)
      ]), { data: it });
    }
    function enum_value(v, parent) {
      return ts.wrap([
        ts.trivia(v.tokens.value.trivia),
        ts.definition(
          ts.wrap(['"', ts.name(v.value, { data: v, parent }), '"']),
          { data: v, parent }
        ),
        token(v.tokens.separator)
      ]);
    }
    function iterable_like(it, parent) {
      return ts.definition(ts.wrap([
        extended_attributes(it.extAttrs),
        token(it.tokens.readonly),
        token(it.tokens.async),
        token(it.tokens.base, ts.generic),
        token(it.tokens.open),
        ts.wrap(it.idlType.map(type)),
        token(it.tokens.close),
        token(it.tokens.argsOpen),
        ts.wrap(it.arguments.map(argument)),
        token(it.tokens.argsClose),
        token(it.tokens.termination)
      ]), { data: it, parent });
    }
    function eof(it) {
      return ts.trivia(it.trivia);
    }

    const table = {
      interface: container,
      "interface mixin": container,
      namespace: container,
      operation,
      attribute,
      constructor,
      dictionary: container,
      field,
      const: const_,
      typedef,
      includes,
      callback,
      enum: enum_,
      "enum-value": enum_value,
      iterable: iterable_like,
      maplike: iterable_like,
      setlike: iterable_like,
      "callback interface": container,
      eof
    };
    function dispatch(it, parent) {
      const dispatcher = table[it.type];
      if (!dispatcher) {
        throw new Error(`Type "${it.type}" is unsupported`);
      }
      return table[it.type](it, parent);
    }
    function iterate(things, parent) {
      if (!things) return;
      const results = things.map(thing => dispatch(thing, parent));
      return ts.wrap(results);
    }
    return iterate(ast);
  }

  function getMixinMap(all, unique) {
    const map = new Map();
    const includes = all.filter(def => def.type === "includes");
    for (const include of includes) {
      const mixin = unique.get(include.includes);
      if (!mixin) {
        continue;
      }
      const array = map.get(include.target);
      if (array) {
        array.push(mixin);
      } else {
        map.set(include.target, [mixin]);
      }
    }
    return map;
  }

  /**
   * @typedef {ReturnType<typeof groupDefinitions>} Definitions
   */
  function groupDefinitions(all) {
    const unique = new Map();
    const duplicates = new Set();
    const partials = new Map();
    for (const def of all) {
      if (def.partial) {
        const array = partials.get(def.name);
        if (array) {
          array.push(def);
        } else {
          partials.set(def.name, [def]);
        }
        continue;
      }
      if (!def.name) {
        continue;
      }
      if (!unique.has(def.name)) {
        unique.set(def.name, def);
      } else {
        duplicates.add(def);
      }
    }
    return {
      all,
      unique,
      partials,
      duplicates,
      mixinMap: getMixinMap(all, unique),
      cache: {
        typedefIncludesDictionary: new WeakMap(),
        dictionaryIncludesRequiredField: new WeakMap()
      },
    };
  }

  function* checkDuplicatedNames({ unique, duplicates }) {
    for (const dup of duplicates) {
      const { name } = dup;
      const message = `The name "${name}" of type "${unique.get(name).type}" was already seen`;
      yield validationError(dup.tokens.name, dup, "no-duplicate", message);
    }
  }

  function* validateIterable(ast) {
    const defs = groupDefinitions(ast);
    for (const def of defs.all) {
      if (def.validate) {
        yield* def.validate(defs);
      }
    }
    yield* checkDuplicatedNames(defs);
  }

  // Remove this once all of our support targets expose `.flat()` by default
  function flatten(array) {
    if (array.flat) {
      return array.flat();
    }
    return [].concat(...array);
  }

  /**
   * @param {*} ast AST or array of ASTs
   */
  function validate(ast) {
    return [...validateIterable(flatten(ast))];
  }

  var _webidl2 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    parse: parse,
    write: write,
    validate: validate,
    WebIDLParseError: WebIDLParseError
  });

  /**
   * marked - a markdown parser
   * Copyright (c) 2011-2020, Christopher Jeffrey. (MIT Licensed)
   * https://github.com/markedjs/marked
   */

  /**
   * DO NOT EDIT THIS FILE
   * The code in this file is generated from files in ./src/
   */

  function createCommonjsModule(fn, module) {
  	return module = { exports: {} }, fn(module, module.exports), module.exports;
  }

  var defaults = createCommonjsModule(function (module) {
  function getDefaults() {
    return {
      baseUrl: null,
      breaks: false,
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

  function changeDefaults(newDefaults) {
    module.exports.defaults = newDefaults;
  }

  module.exports = {
    defaults: getDefaults(),
    getDefaults,
    changeDefaults
  };
  });
  var defaults_1 = defaults.defaults;
  var defaults_2 = defaults.getDefaults;
  var defaults_3 = defaults.changeDefaults;

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
  function escape(html, encode) {
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
  function edit(regex, opt) {
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
  function cleanUrl(sanitize, base, href) {
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
        baseUrls[' ' + base] = rtrim(base, '/', true);
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

  const noopTest = { exec: function noopTest() {} };

  function merge(obj) {
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

  function splitCells(tableRow, count) {
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
  function rtrim(str, c, invert) {
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

  function findClosingBracket(str, b) {
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

  function checkSanitizeDeprecation(opt) {
    if (opt && opt.sanitize && !opt.silent) {
      console.warn('marked(): sanitize and sanitizer parameters are deprecated since version 0.7.0, should not be used and will be removed in the future. Read more here: https://marked.js.org/#/USING_ADVANCED.md#options');
    }
  }

  var helpers = {
    escape,
    unescape: unescape$1,
    edit,
    cleanUrl,
    resolveUrl,
    noopTest,
    merge,
    splitCells,
    rtrim,
    findClosingBracket,
    checkSanitizeDeprecation
  };

  const { defaults: defaults$1 } = defaults;
  const {
    rtrim: rtrim$1,
    splitCells: splitCells$1,
    escape: escape$1,
    findClosingBracket: findClosingBracket$1
  } = helpers;

  function outputLink(cap, link, raw) {
    const href = link.href;
    const title = link.title ? escape$1(link.title) : null;
    const text = cap[1].replace(/\\([\[\]])/g, '$1');

    if (cap[0].charAt(0) !== '!') {
      return {
        type: 'link',
        raw,
        href,
        title,
        text
      };
    } else {
      return {
        type: 'image',
        raw,
        href,
        title,
        text: escape$1(text)
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
  var Tokenizer_1 = class Tokenizer {
    constructor(options) {
      this.options = options || defaults$1;
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

    code(src, tokens) {
      const cap = this.rules.block.code.exec(src);
      if (cap) {
        const lastToken = tokens[tokens.length - 1];
        // An indented code block cannot interrupt a paragraph.
        if (lastToken && lastToken.type === 'paragraph') {
          return {
            raw: cap[0],
            text: cap[0].trimRight()
          };
        }

        const text = cap[0].replace(/^ {4}/gm, '');
        return {
          type: 'code',
          raw: cap[0],
          codeBlockStyle: 'indented',
          text: !this.options.pedantic
            ? rtrim$1(text, '\n')
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
        return {
          type: 'heading',
          raw: cap[0],
          depth: cap[1].length,
          text: cap[2]
        };
      }
    }

    nptable(src) {
      const cap = this.rules.block.nptable.exec(src);
      if (cap) {
        const item = {
          type: 'table',
          header: splitCells$1(cap[1].replace(/^ *| *\| *$/g, '')),
          align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
          cells: cap[3] ? cap[3].replace(/\n$/, '').split('\n') : [],
          raw: cap[0]
        };

        if (item.header.length === item.align.length) {
          let l = item.align.length;
          let i;
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

          l = item.cells.length;
          for (i = 0; i < l; i++) {
            item.cells[i] = splitCells$1(item.cells[i], item.header.length);
          }

          return item;
        }
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
          text
        };
      }
    }

    list(src) {
      const cap = this.rules.block.list.exec(src);
      if (cap) {
        let raw = cap[0];
        const bull = cap[2];
        const isordered = bull.length > 1;
        const isparen = bull[bull.length - 1] === ')';

        const list = {
          type: 'list',
          raw,
          ordered: isordered,
          start: isordered ? +bull.slice(0, -1) : '',
          loose: false,
          items: []
        };

        // Get each top-level item.
        const itemMatch = cap[0].match(this.rules.block.item);

        let next = false,
          item,
          space,
          b,
          addBack,
          loose,
          istask,
          ischecked;

        const l = itemMatch.length;
        for (let i = 0; i < l; i++) {
          item = itemMatch[i];
          raw = item;

          // Remove the list item's bullet
          // so it is seen as the next token.
          space = item.length;
          item = item.replace(/^ *([*+-]|\d+[.)]) */, '');

          // Outdent whatever the
          // list item contains. Hacky.
          if (~item.indexOf('\n ')) {
            space -= item.length;
            item = !this.options.pedantic
              ? item.replace(new RegExp('^ {1,' + space + '}', 'gm'), '')
              : item.replace(/^ {1,4}/gm, '');
          }

          // Determine whether the next list item belongs here.
          // Backpedal if it does not belong in this list.
          if (i !== l - 1) {
            b = this.rules.block.bullet.exec(itemMatch[i + 1])[0];
            if (isordered ? b.length === 1 || (!isparen && b[b.length - 1] === ')')
              : (b.length > 1 || (this.options.smartLists && b !== bull))) {
              addBack = itemMatch.slice(i + 1).join('\n');
              list.raw = list.raw.substring(0, list.raw.length - addBack.length);
              i = l - 1;
            }
          }

          // Determine whether item is loose or not.
          // Use: /(^|\n)(?! )[^\n]+\n\n(?!\s*$)/
          // for discount behavior.
          loose = next || /\n\n(?!\s*$)/.test(item);
          if (i !== l - 1) {
            next = item.charAt(item.length - 1) === '\n';
            if (!loose) loose = next;
          }

          if (loose) {
            list.loose = true;
          }

          // Check for task list items
          istask = /^\[[ xX]\] /.test(item);
          ischecked = undefined;
          if (istask) {
            ischecked = item[1] !== ' ';
            item = item.replace(/^\[[ xX]\] +/, '');
          }

          list.items.push({
            type: 'list_item',
            raw,
            task: istask,
            checked: ischecked,
            loose: loose,
            text: item
          });
        }

        return list;
      }
    }

    html(src) {
      const cap = this.rules.block.html.exec(src);
      if (cap) {
        return {
          type: this.options.sanitize
            ? 'paragraph'
            : 'html',
          raw: cap[0],
          pre: !this.options.sanitizer
            && (cap[1] === 'pre' || cap[1] === 'script' || cap[1] === 'style'),
          text: this.options.sanitize ? (this.options.sanitizer ? this.options.sanitizer(cap[0]) : escape$1(cap[0])) : cap[0]
        };
      }
    }

    def(src) {
      const cap = this.rules.block.def.exec(src);
      if (cap) {
        if (cap[3]) cap[3] = cap[3].substring(1, cap[3].length - 1);
        const tag = cap[1].toLowerCase().replace(/\s+/g, ' ');
        return {
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
          header: splitCells$1(cap[1].replace(/^ *| *\| *$/g, '')),
          align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
          cells: cap[3] ? cap[3].replace(/\n$/, '').split('\n') : []
        };

        if (item.header.length === item.align.length) {
          item.raw = cap[0];

          let l = item.align.length;
          let i;
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

          l = item.cells.length;
          for (i = 0; i < l; i++) {
            item.cells[i] = splitCells$1(
              item.cells[i].replace(/^ *\| *| *\| *$/g, ''),
              item.header.length);
          }

          return item;
        }
      }
    }

    lheading(src) {
      const cap = this.rules.block.lheading.exec(src);
      if (cap) {
        return {
          type: 'heading',
          raw: cap[0],
          depth: cap[2].charAt(0) === '=' ? 1 : 2,
          text: cap[1]
        };
      }
    }

    paragraph(src) {
      const cap = this.rules.block.paragraph.exec(src);
      if (cap) {
        return {
          type: 'paragraph',
          raw: cap[0],
          text: cap[1].charAt(cap[1].length - 1) === '\n'
            ? cap[1].slice(0, -1)
            : cap[1]
        };
      }
    }

    text(src, tokens) {
      const cap = this.rules.block.text.exec(src);
      if (cap) {
        const lastToken = tokens[tokens.length - 1];
        if (lastToken && lastToken.type === 'text') {
          return {
            raw: cap[0],
            text: cap[0]
          };
        }

        return {
          type: 'text',
          raw: cap[0],
          text: cap[0]
        };
      }
    }

    escape(src) {
      const cap = this.rules.inline.escape.exec(src);
      if (cap) {
        return {
          type: 'escape',
          raw: cap[0],
          text: escape$1(cap[1])
        };
      }
    }

    tag(src, inLink, inRawBlock) {
      const cap = this.rules.inline.tag.exec(src);
      if (cap) {
        if (!inLink && /^<a /i.test(cap[0])) {
          inLink = true;
        } else if (inLink && /^<\/a>/i.test(cap[0])) {
          inLink = false;
        }
        if (!inRawBlock && /^<(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
          inRawBlock = true;
        } else if (inRawBlock && /^<\/(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
          inRawBlock = false;
        }

        return {
          type: this.options.sanitize
            ? 'text'
            : 'html',
          raw: cap[0],
          inLink,
          inRawBlock,
          text: this.options.sanitize
            ? (this.options.sanitizer
              ? this.options.sanitizer(cap[0])
              : escape$1(cap[0]))
            : cap[0]
        };
      }
    }

    link(src) {
      const cap = this.rules.inline.link.exec(src);
      if (cap) {
        const lastParenIndex = findClosingBracket$1(cap[2], '()');
        if (lastParenIndex > -1) {
          const start = cap[0].indexOf('!') === 0 ? 5 : 4;
          const linkLen = start + cap[1].length + lastParenIndex;
          cap[2] = cap[2].substring(0, lastParenIndex);
          cap[0] = cap[0].substring(0, linkLen).trim();
          cap[3] = '';
        }
        let href = cap[2];
        let title = '';
        if (this.options.pedantic) {
          const link = /^([^'"]*[^\s])\s+(['"])(.*)\2/.exec(href);

          if (link) {
            href = link[1];
            title = link[3];
          } else {
            title = '';
          }
        } else {
          title = cap[3] ? cap[3].slice(1, -1) : '';
        }
        href = href.trim().replace(/^<([\s\S]*)>$/, '$1');
        const token = outputLink(cap, {
          href: href ? href.replace(this.rules.inline._escapes, '$1') : href,
          title: title ? title.replace(this.rules.inline._escapes, '$1') : title
        }, cap[0]);
        return token;
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
        const token = outputLink(cap, link, cap[0]);
        return token;
      }
    }

    strong(src, maskedSrc, prevChar = '') {
      let match = this.rules.inline.strong.start.exec(src);

      if (match && (!match[1] || (match[1] && (prevChar === '' || this.rules.inline.punctuation.exec(prevChar))))) {
        maskedSrc = maskedSrc.slice(-1 * src.length);
        const endReg = match[0] === '**' ? this.rules.inline.strong.endAst : this.rules.inline.strong.endUnd;

        endReg.lastIndex = 0;

        let cap;
        while ((match = endReg.exec(maskedSrc)) != null) {
          cap = this.rules.inline.strong.middle.exec(maskedSrc.slice(0, match.index + 3));
          if (cap) {
            return {
              type: 'strong',
              raw: src.slice(0, cap[0].length),
              text: src.slice(2, cap[0].length - 2)
            };
          }
        }
      }
    }

    em(src, maskedSrc, prevChar = '') {
      let match = this.rules.inline.em.start.exec(src);

      if (match && (!match[1] || (match[1] && (prevChar === '' || this.rules.inline.punctuation.exec(prevChar))))) {
        maskedSrc = maskedSrc.slice(-1 * src.length);
        const endReg = match[0] === '*' ? this.rules.inline.em.endAst : this.rules.inline.em.endUnd;

        endReg.lastIndex = 0;

        let cap;
        while ((match = endReg.exec(maskedSrc)) != null) {
          cap = this.rules.inline.em.middle.exec(maskedSrc.slice(0, match.index + 2));
          if (cap) {
            return {
              type: 'em',
              raw: src.slice(0, cap[0].length),
              text: src.slice(1, cap[0].length - 1)
            };
          }
        }
      }
    }

    codespan(src) {
      const cap = this.rules.inline.code.exec(src);
      if (cap) {
        let text = cap[2].replace(/\n/g, ' ');
        const hasNonSpaceChars = /[^ ]/.test(text);
        const hasSpaceCharsOnBothEnds = text.startsWith(' ') && text.endsWith(' ');
        if (hasNonSpaceChars && hasSpaceCharsOnBothEnds) {
          text = text.substring(1, text.length - 1);
        }
        text = escape$1(text, true);
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
          text: cap[1]
        };
      }
    }

    autolink(src, mangle) {
      const cap = this.rules.inline.autolink.exec(src);
      if (cap) {
        let text, href;
        if (cap[2] === '@') {
          text = escape$1(this.options.mangle ? mangle(cap[1]) : cap[1]);
          href = 'mailto:' + text;
        } else {
          text = escape$1(cap[1]);
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
          text = escape$1(this.options.mangle ? mangle(cap[0]) : cap[0]);
          href = 'mailto:' + text;
        } else {
          // do extended autolink path validation
          let prevCapZero;
          do {
            prevCapZero = cap[0];
            cap[0] = this.rules.inline._backpedal.exec(cap[0])[0];
          } while (prevCapZero !== cap[0]);
          text = escape$1(cap[0]);
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

    inlineText(src, inRawBlock, smartypants) {
      const cap = this.rules.inline.text.exec(src);
      if (cap) {
        let text;
        if (inRawBlock) {
          text = this.options.sanitize ? (this.options.sanitizer ? this.options.sanitizer(cap[0]) : escape$1(cap[0])) : cap[0];
        } else {
          text = escape$1(this.options.smartypants ? smartypants(cap[0]) : cap[0]);
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
    noopTest: noopTest$1,
    edit: edit$1,
    merge: merge$1
  } = helpers;

  /**
   * Block-Level Grammar
   */
  const block = {
    newline: /^\n+/,
    code: /^( {4}[^\n]+\n*)+/,
    fences: /^ {0,3}(`{3,}(?=[^`\n]*\n)|~{3,})([^\n]*)\n(?:|([\s\S]*?)\n)(?: {0,3}\1[~`]* *(?:\n+|$)|$)/,
    hr: /^ {0,3}((?:- *){3,}|(?:_ *){3,}|(?:\* *){3,})(?:\n+|$)/,
    heading: /^ {0,3}(#{1,6}) +([^\n]*?)(?: +#+)? *(?:\n+|$)/,
    blockquote: /^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/,
    list: /^( {0,3})(bull) [\s\S]+?(?:hr|def|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,
    html: '^ {0,3}(?:' // optional indentation
      + '<(script|pre|style)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)' // (1)
      + '|comment[^\\n]*(\\n+|$)' // (2)
      + '|<\\?[\\s\\S]*?\\?>\\n*' // (3)
      + '|<![A-Z][\\s\\S]*?>\\n*' // (4)
      + '|<!\\[CDATA\\[[\\s\\S]*?\\]\\]>\\n*' // (5)
      + '|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:\\n{2,}|$)' // (6)
      + '|<(?!script|pre|style)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:\\n{2,}|$)' // (7) open tag
      + '|</(?!script|pre|style)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:\\n{2,}|$)' // (7) closing tag
      + ')',
    def: /^ {0,3}\[(label)\]: *\n? *<?([^\s>]+)>?(?:(?: +\n? *| *\n *)(title))? *(?:\n+|$)/,
    nptable: noopTest$1,
    table: noopTest$1,
    lheading: /^([^\n]+)\n {0,3}(=+|-+) *(?:\n+|$)/,
    // regex template, placeholders will be replaced according to different paragraph
    // interruption rules of commonmark and the original markdown spec:
    _paragraph: /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html)[^\n]+)*)/,
    text: /^[^\n]+/
  };

  block._label = /(?!\s*\])(?:\\[\[\]]|[^\[\]])+/;
  block._title = /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/;
  block.def = edit$1(block.def)
    .replace('label', block._label)
    .replace('title', block._title)
    .getRegex();

  block.bullet = /(?:[*+-]|\d{1,9}[.)])/;
  block.item = /^( *)(bull) ?[^\n]*(?:\n(?!\1bull ?)[^\n]*)*/;
  block.item = edit$1(block.item, 'gm')
    .replace(/bull/g, block.bullet)
    .getRegex();

  block.list = edit$1(block.list)
    .replace(/bull/g, block.bullet)
    .replace('hr', '\\n+(?=\\1?(?:(?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$))')
    .replace('def', '\\n+(?=' + block.def.source + ')')
    .getRegex();

  block._tag = 'address|article|aside|base|basefont|blockquote|body|caption'
    + '|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption'
    + '|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe'
    + '|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option'
    + '|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr'
    + '|track|ul';
  block._comment = /<!--(?!-?>)[\s\S]*?-->/;
  block.html = edit$1(block.html, 'i')
    .replace('comment', block._comment)
    .replace('tag', block._tag)
    .replace('attribute', / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/)
    .getRegex();

  block.paragraph = edit$1(block._paragraph)
    .replace('hr', block.hr)
    .replace('heading', ' {0,3}#{1,6} ')
    .replace('|lheading', '') // setex headings don't interrupt commonmark paragraphs
    .replace('blockquote', ' {0,3}>')
    .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n')
    .replace('list', ' {0,3}(?:[*+-]|1[.)]) ') // only lists starting from 1 can interrupt
    .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|!--)')
    .replace('tag', block._tag) // pars can be interrupted by type (6) html blocks
    .getRegex();

  block.blockquote = edit$1(block.blockquote)
    .replace('paragraph', block.paragraph)
    .getRegex();

  /**
   * Normal Block Grammar
   */

  block.normal = merge$1({}, block);

  /**
   * GFM Block Grammar
   */

  block.gfm = merge$1({}, block.normal, {
    nptable: '^ *([^|\\n ].*\\|.*)\\n' // Header
      + ' *([-:]+ *\\|[-| :]*)' // Align
      + '(?:\\n((?:(?!\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)', // Cells
    table: '^ *\\|(.+)\\n' // Header
      + ' *\\|?( *[-:]+[-| :]*)' // Align
      + '(?:\\n *((?:(?!\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)' // Cells
  });

  block.gfm.nptable = edit$1(block.gfm.nptable)
    .replace('hr', block.hr)
    .replace('heading', ' {0,3}#{1,6} ')
    .replace('blockquote', ' {0,3}>')
    .replace('code', ' {4}[^\\n]')
    .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n')
    .replace('list', ' {0,3}(?:[*+-]|1[.)]) ') // only lists starting from 1 can interrupt
    .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|!--)')
    .replace('tag', block._tag) // tables can be interrupted by type (6) html blocks
    .getRegex();

  block.gfm.table = edit$1(block.gfm.table)
    .replace('hr', block.hr)
    .replace('heading', ' {0,3}#{1,6} ')
    .replace('blockquote', ' {0,3}>')
    .replace('code', ' {4}[^\\n]')
    .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n')
    .replace('list', ' {0,3}(?:[*+-]|1[.)]) ') // only lists starting from 1 can interrupt
    .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|!--)')
    .replace('tag', block._tag) // tables can be interrupted by type (6) html blocks
    .getRegex();

  /**
   * Pedantic grammar (original John Gruber's loose markdown specification)
   */

  block.pedantic = merge$1({}, block.normal, {
    html: edit$1(
      '^ *(?:comment *(?:\\n|\\s*$)'
      + '|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)' // closed tag
      + '|<tag(?:"[^"]*"|\'[^\']*\'|\\s[^\'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))')
      .replace('comment', block._comment)
      .replace(/tag/g, '(?!(?:'
        + 'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub'
        + '|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)'
        + '\\b)\\w+(?!:|[^\\w\\s@]*@)\\b')
      .getRegex(),
    def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,
    heading: /^ *(#{1,6}) *([^\n]+?) *(?:#+ *)?(?:\n+|$)/,
    fences: noopTest$1, // fences not supported
    paragraph: edit$1(block.normal._paragraph)
      .replace('hr', block.hr)
      .replace('heading', ' *#{1,6} *[^\n]')
      .replace('lheading', block.lheading)
      .replace('blockquote', ' {0,3}>')
      .replace('|fences', '')
      .replace('|list', '')
      .replace('|html', '')
      .getRegex()
  });

  /**
   * Inline-Level Grammar
   */
  const inline = {
    escape: /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,
    autolink: /^<(scheme:[^\s\x00-\x1f<>]*|email)>/,
    url: noopTest$1,
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
    strong: {
      start: /^(?:(\*\*(?=[*punctuation]))|\*\*)(?![\s])|__/, // (1) returns if starts w/ punctuation
      middle: /^\*\*(?:(?:(?!overlapSkip)(?:[^*]|\\\*)|overlapSkip)|\*(?:(?!overlapSkip)(?:[^*]|\\\*)|overlapSkip)*?\*)+?\*\*$|^__(?![\s])((?:(?:(?!overlapSkip)(?:[^_]|\\_)|overlapSkip)|_(?:(?!overlapSkip)(?:[^_]|\\_)|overlapSkip)*?_)+?)__$/,
      endAst: /[^punctuation\s]\*\*(?!\*)|[punctuation]\*\*(?!\*)(?:(?=[punctuation\s]|$))/, // last char can't be punct, or final * must also be followed by punct (or endline)
      endUnd: /[^\s]__(?!_)(?:(?=[punctuation\s])|$)/ // last char can't be a space, and final _ must preceed punct or \s (or endline)
    },
    em: {
      start: /^(?:(\*(?=[punctuation]))|\*)(?![*\s])|_/, // (1) returns if starts w/ punctuation
      middle: /^\*(?:(?:(?!overlapSkip)(?:[^*]|\\\*)|overlapSkip)|\*(?:(?!overlapSkip)(?:[^*]|\\\*)|overlapSkip)*?\*)+?\*$|^_(?![_\s])(?:(?:(?!overlapSkip)(?:[^_]|\\_)|overlapSkip)|_(?:(?!overlapSkip)(?:[^_]|\\_)|overlapSkip)*?_)+?_$/,
      endAst: /[^punctuation\s]\*(?!\*)|[punctuation]\*(?!\*)(?:(?=[punctuation\s]|$))/, // last char can't be punct, or final * must also be followed by punct (or endline)
      endUnd: /[^\s]_(?!_)(?:(?=[punctuation\s])|$)/ // last char can't be a space, and final _ must preceed punct or \s (or endline)
    },
    code: /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,
    br: /^( {2,}|\\)\n(?!\s*$)/,
    del: noopTest$1,
    text: /^(`+|[^`])(?:[\s\S]*?(?:(?=[\\<!\[`*]|\b_|$)|[^ ](?= {2,}\n))|(?= {2,}\n))/,
    punctuation: /^([\s*punctuation])/
  };

  // list of punctuation marks from common mark spec
  // without * and _ to workaround cases with double emphasis
  inline._punctuation = '!"#$%&\'()+\\-.,/:;<=>?@\\[\\]`^{|}~';
  inline.punctuation = edit$1(inline.punctuation).replace(/punctuation/g, inline._punctuation).getRegex();

  // sequences em should skip over [title](link), `code`, <html>
  inline._blockSkip = '\\[[^\\]]*?\\]\\([^\\)]*?\\)|`[^`]*?`|<[^>]*?>';
  inline._overlapSkip = '__[^_]*?__|\\*\\*\\[^\\*\\]*?\\*\\*';

  inline.em.start = edit$1(inline.em.start)
    .replace(/punctuation/g, inline._punctuation)
    .getRegex();

  inline.em.middle = edit$1(inline.em.middle)
    .replace(/punctuation/g, inline._punctuation)
    .replace(/overlapSkip/g, inline._overlapSkip)
    .getRegex();

  inline.em.endAst = edit$1(inline.em.endAst, 'g')
    .replace(/punctuation/g, inline._punctuation)
    .getRegex();

  inline.em.endUnd = edit$1(inline.em.endUnd, 'g')
    .replace(/punctuation/g, inline._punctuation)
    .getRegex();

  inline.strong.start = edit$1(inline.strong.start)
    .replace(/punctuation/g, inline._punctuation)
    .getRegex();

  inline.strong.middle = edit$1(inline.strong.middle)
    .replace(/punctuation/g, inline._punctuation)
    .replace(/blockSkip/g, inline._blockSkip)
    .getRegex();

  inline.strong.endAst = edit$1(inline.strong.endAst, 'g')
    .replace(/punctuation/g, inline._punctuation)
    .getRegex();

  inline.strong.endUnd = edit$1(inline.strong.endUnd, 'g')
    .replace(/punctuation/g, inline._punctuation)
    .getRegex();

  inline.blockSkip = edit$1(inline._blockSkip, 'g')
    .getRegex();

  inline.overlapSkip = edit$1(inline._overlapSkip, 'g')
    .getRegex();

  inline._escapes = /\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/g;

  inline._scheme = /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/;
  inline._email = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/;
  inline.autolink = edit$1(inline.autolink)
    .replace('scheme', inline._scheme)
    .replace('email', inline._email)
    .getRegex();

  inline._attribute = /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/;

  inline.tag = edit$1(inline.tag)
    .replace('comment', block._comment)
    .replace('attribute', inline._attribute)
    .getRegex();

  inline._label = /(?:\[(?:\\.|[^\[\]\\])*\]|\\.|`[^`]*`|[^\[\]\\`])*?/;
  inline._href = /<(?:\\[<>]?|[^\s<>\\])*>|[^\s\x00-\x1f]*/;
  inline._title = /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/;

  inline.link = edit$1(inline.link)
    .replace('label', inline._label)
    .replace('href', inline._href)
    .replace('title', inline._title)
    .getRegex();

  inline.reflink = edit$1(inline.reflink)
    .replace('label', inline._label)
    .getRegex();

  inline.reflinkSearch = edit$1(inline.reflinkSearch, 'g')
    .replace('reflink', inline.reflink)
    .replace('nolink', inline.nolink)
    .getRegex();

  /**
   * Normal Inline Grammar
   */

  inline.normal = merge$1({}, inline);

  /**
   * Pedantic Inline Grammar
   */

  inline.pedantic = merge$1({}, inline.normal, {
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
    link: edit$1(/^!?\[(label)\]\((.*?)\)/)
      .replace('label', inline._label)
      .getRegex(),
    reflink: edit$1(/^!?\[(label)\]\s*\[([^\]]*)\]/)
      .replace('label', inline._label)
      .getRegex()
  });

  /**
   * GFM Inline Grammar
   */

  inline.gfm = merge$1({}, inline.normal, {
    escape: edit$1(inline.escape).replace('])', '~|])').getRegex(),
    _extended_email: /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/,
    url: /^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/,
    _backpedal: /(?:[^?!.,:;*_~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_~)]+(?!$))+/,
    del: /^~+(?=\S)([\s\S]*?\S)~+/,
    text: /^(`+|[^`])(?:[\s\S]*?(?:(?=[\\<!\[`*~]|\b_|https?:\/\/|ftp:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@))|(?= {2,}\n|[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@))/
  });

  inline.gfm.url = edit$1(inline.gfm.url, 'i')
    .replace('email', inline.gfm._extended_email)
    .getRegex();
  /**
   * GFM + Line Breaks Inline Grammar
   */

  inline.breaks = merge$1({}, inline.gfm, {
    br: edit$1(inline.br).replace('{2,}', '*').getRegex(),
    text: edit$1(inline.gfm.text)
      .replace('\\b_', '\\b_| {2,}\\n')
      .replace(/\{2,\}/g, '*')
      .getRegex()
  });

  var rules = {
    block,
    inline
  };

  const { defaults: defaults$2 } = defaults;
  const { block: block$1, inline: inline$1 } = rules;

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
  var Lexer_1 = class Lexer {
    constructor(options) {
      this.tokens = [];
      this.tokens.links = Object.create(null);
      this.options = options || defaults$2;
      this.options.tokenizer = this.options.tokenizer || new Tokenizer_1();
      this.tokenizer = this.options.tokenizer;
      this.tokenizer.options = this.options;

      const rules = {
        block: block$1.normal,
        inline: inline$1.normal
      };

      if (this.options.pedantic) {
        rules.block = block$1.pedantic;
        rules.inline = inline$1.pedantic;
      } else if (this.options.gfm) {
        rules.block = block$1.gfm;
        if (this.options.breaks) {
          rules.inline = inline$1.breaks;
        } else {
          rules.inline = inline$1.gfm;
        }
      }
      this.tokenizer.rules = rules;
    }

    /**
     * Expose Rules
     */
    static get rules() {
      return {
        block: block$1,
        inline: inline$1
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
     * Preprocessing
     */
    lex(src) {
      src = src
        .replace(/\r\n|\r/g, '\n')
        .replace(/\t/g, '    ');

      this.blockTokens(src, this.tokens, true);

      this.inline(this.tokens);

      return this.tokens;
    }

    /**
     * Lexing
     */
    blockTokens(src, tokens = [], top = true) {
      src = src.replace(/^ +$/gm, '');
      let token, i, l, lastToken;

      while (src) {
        // newline
        if (token = this.tokenizer.space(src)) {
          src = src.substring(token.raw.length);
          if (token.type) {
            tokens.push(token);
          }
          continue;
        }

        // code
        if (token = this.tokenizer.code(src, tokens)) {
          src = src.substring(token.raw.length);
          if (token.type) {
            tokens.push(token);
          } else {
            lastToken = tokens[tokens.length - 1];
            lastToken.raw += '\n' + token.raw;
            lastToken.text += '\n' + token.text;
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

        // table no leading pipe (gfm)
        if (token = this.tokenizer.nptable(src)) {
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
          token.tokens = this.blockTokens(token.text, [], top);
          tokens.push(token);
          continue;
        }

        // list
        if (token = this.tokenizer.list(src)) {
          src = src.substring(token.raw.length);
          l = token.items.length;
          for (i = 0; i < l; i++) {
            token.items[i].tokens = this.blockTokens(token.items[i].text, [], false);
          }
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
        if (top && (token = this.tokenizer.def(src))) {
          src = src.substring(token.raw.length);
          if (!this.tokens.links[token.tag]) {
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
        if (top && (token = this.tokenizer.paragraph(src))) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }

        // text
        if (token = this.tokenizer.text(src, tokens)) {
          src = src.substring(token.raw.length);
          if (token.type) {
            tokens.push(token);
          } else {
            lastToken = tokens[tokens.length - 1];
            lastToken.raw += '\n' + token.raw;
            lastToken.text += '\n' + token.text;
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

    inline(tokens) {
      let i,
        j,
        k,
        l2,
        row,
        token;

      const l = tokens.length;
      for (i = 0; i < l; i++) {
        token = tokens[i];
        switch (token.type) {
          case 'paragraph':
          case 'text':
          case 'heading': {
            token.tokens = [];
            this.inlineTokens(token.text, token.tokens);
            break;
          }
          case 'table': {
            token.tokens = {
              header: [],
              cells: []
            };

            // header
            l2 = token.header.length;
            for (j = 0; j < l2; j++) {
              token.tokens.header[j] = [];
              this.inlineTokens(token.header[j], token.tokens.header[j]);
            }

            // cells
            l2 = token.cells.length;
            for (j = 0; j < l2; j++) {
              row = token.cells[j];
              token.tokens.cells[j] = [];
              for (k = 0; k < row.length; k++) {
                token.tokens.cells[j][k] = [];
                this.inlineTokens(row[k], token.tokens.cells[j][k]);
              }
            }

            break;
          }
          case 'blockquote': {
            this.inline(token.tokens);
            break;
          }
          case 'list': {
            l2 = token.items.length;
            for (j = 0; j < l2; j++) {
              this.inline(token.items[j].tokens);
            }
            break;
          }
        }
      }

      return tokens;
    }

    /**
     * Lexing/Compiling
     */
    inlineTokens(src, tokens = [], inLink = false, inRawBlock = false, prevChar = '') {
      let token;

      // String with links masked to avoid interference with em and strong
      let maskedSrc = src;
      let match;

      // Mask out reflinks
      if (this.tokens.links) {
        const links = Object.keys(this.tokens.links);
        if (links.length > 0) {
          while ((match = this.tokenizer.rules.inline.reflinkSearch.exec(maskedSrc)) != null) {
            if (links.includes(match[0].slice(match[0].lastIndexOf('[') + 1, -1))) {
              maskedSrc = maskedSrc.slice(0, match.index) + '[' + 'a'.repeat(match[0].length - 2) + ']' + maskedSrc.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex);
            }
          }
        }
      }
      // Mask out other blocks
      while ((match = this.tokenizer.rules.inline.blockSkip.exec(maskedSrc)) != null) {
        maskedSrc = maskedSrc.slice(0, match.index) + '[' + 'a'.repeat(match[0].length - 2) + ']' + maskedSrc.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
      }

      while (src) {
        // escape
        if (token = this.tokenizer.escape(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }

        // tag
        if (token = this.tokenizer.tag(src, inLink, inRawBlock)) {
          src = src.substring(token.raw.length);
          inLink = token.inLink;
          inRawBlock = token.inRawBlock;
          tokens.push(token);
          continue;
        }

        // link
        if (token = this.tokenizer.link(src)) {
          src = src.substring(token.raw.length);
          if (token.type === 'link') {
            token.tokens = this.inlineTokens(token.text, [], true, inRawBlock);
          }
          tokens.push(token);
          continue;
        }

        // reflink, nolink
        if (token = this.tokenizer.reflink(src, this.tokens.links)) {
          src = src.substring(token.raw.length);
          if (token.type === 'link') {
            token.tokens = this.inlineTokens(token.text, [], true, inRawBlock);
          }
          tokens.push(token);
          continue;
        }

        // strong
        if (token = this.tokenizer.strong(src, maskedSrc, prevChar)) {
          src = src.substring(token.raw.length);
          token.tokens = this.inlineTokens(token.text, [], inLink, inRawBlock);
          tokens.push(token);
          continue;
        }

        // em
        if (token = this.tokenizer.em(src, maskedSrc, prevChar)) {
          src = src.substring(token.raw.length);
          token.tokens = this.inlineTokens(token.text, [], inLink, inRawBlock);
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
          token.tokens = this.inlineTokens(token.text, [], inLink, inRawBlock);
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
        if (!inLink && (token = this.tokenizer.url(src, mangle))) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }

        // text
        if (token = this.tokenizer.inlineText(src, inRawBlock, smartypants)) {
          src = src.substring(token.raw.length);
          prevChar = token.raw.slice(-1);
          tokens.push(token);
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

  const { defaults: defaults$3 } = defaults;
  const {
    cleanUrl: cleanUrl$1,
    escape: escape$2
  } = helpers;

  /**
   * Renderer
   */
  var Renderer_1 = class Renderer {
    constructor(options) {
      this.options = options || defaults$3;
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

      if (!lang) {
        return '<pre><code>'
          + (escaped ? code : escape$2(code, true))
          + '</code></pre>\n';
      }

      return '<pre><code class="'
        + this.options.langPrefix
        + escape$2(lang, true)
        + '">'
        + (escaped ? code : escape$2(code, true))
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
      href = cleanUrl$1(this.options.sanitize, this.options.baseUrl, href);
      if (href === null) {
        return text;
      }
      let out = '<a href="' + escape$2(href) + '"';
      if (title) {
        out += ' title="' + title + '"';
      }
      out += '>' + text + '</a>';
      return out;
    }

    image(href, title, text) {
      href = cleanUrl$1(this.options.sanitize, this.options.baseUrl, href);
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
  var TextRenderer_1 = class TextRenderer {
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
  var Slugger_1 = class Slugger {
    constructor() {
      this.seen = {};
    }

    /**
     * Convert string to unique id
     */
    slug(value) {
      let slug = value
        .toLowerCase()
        .trim()
        // remove html tags
        .replace(/<[!\/a-z].*?>/ig, '')
        // remove unwanted chars
        .replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, '')
        .replace(/\s/g, '-');

      if (this.seen.hasOwnProperty(slug)) {
        const originalSlug = slug;
        do {
          this.seen[originalSlug]++;
          slug = originalSlug + '-' + this.seen[originalSlug];
        } while (this.seen.hasOwnProperty(slug));
      }
      this.seen[slug] = 0;

      return slug;
    }
  };

  const { defaults: defaults$4 } = defaults;
  const {
    unescape: unescape$1$1
  } = helpers;

  /**
   * Parsing & Compiling
   */
  var Parser_1 = class Parser {
    constructor(options) {
      this.options = options || defaults$4;
      this.options.renderer = this.options.renderer || new Renderer_1();
      this.renderer = this.options.renderer;
      this.renderer.options = this.options;
      this.textRenderer = new TextRenderer_1();
      this.slugger = new Slugger_1();
    }

    /**
     * Static Parse Method
     */
    static parse(tokens, options) {
      const parser = new Parser(options);
      return parser.parse(tokens);
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
        checkbox;

      const l = tokens.length;
      for (i = 0; i < l; i++) {
        token = tokens[i];
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
              unescape$1$1(this.parseInline(token.tokens, this.textRenderer)),
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
                this.parseInline(token.tokens.header[j]),
                { header: true, align: token.align[j] }
              );
            }
            header += this.renderer.tablerow(cell);

            body = '';
            l2 = token.cells.length;
            for (j = 0; j < l2; j++) {
              row = token.tokens.cells[j];

              cell = '';
              l3 = row.length;
              for (k = 0; k < l3; k++) {
                cell += this.renderer.tablecell(
                  this.parseInline(row[k]),
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
                  if (item.tokens.length > 0 && item.tokens[0].type === 'text') {
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
        token;

      const l = tokens.length;
      for (i = 0; i < l; i++) {
        token = tokens[i];
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

  const {
    merge: merge$2,
    checkSanitizeDeprecation: checkSanitizeDeprecation$1,
    escape: escape$3
  } = helpers;
  const {
    getDefaults,
    changeDefaults,
    defaults: defaults$5
  } = defaults;

  /**
   * Marked
   */
  function marked(src, opt, callback) {
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

    opt = merge$2({}, marked.defaults, opt || {});
    checkSanitizeDeprecation$1(opt);

    if (callback) {
      const highlight = opt.highlight;
      let tokens;

      try {
        tokens = Lexer_1.lex(src, opt);
      } catch (e) {
        return callback(e);
      }

      const done = function(err) {
        let out;

        if (!err) {
          try {
            out = Parser_1.parse(tokens, opt);
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
      marked.walkTokens(tokens, function(token) {
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
      const tokens = Lexer_1.lex(src, opt);
      if (opt.walkTokens) {
        marked.walkTokens(tokens, opt.walkTokens);
      }
      return Parser_1.parse(tokens, opt);
    } catch (e) {
      e.message += '\nPlease report this to https://github.com/markedjs/marked.';
      if (opt.silent) {
        return '<p>An error occurred:</p><pre>'
          + escape$3(e.message + '', true)
          + '</pre>';
      }
      throw e;
    }
  }

  /**
   * Options
   */

  marked.options =
  marked.setOptions = function(opt) {
    merge$2(marked.defaults, opt);
    changeDefaults(marked.defaults);
    return marked;
  };

  marked.getDefaults = getDefaults;

  marked.defaults = defaults$5;

  /**
   * Use Extension
   */

  marked.use = function(extension) {
    const opts = merge$2({}, extension);
    if (extension.renderer) {
      const renderer = marked.defaults.renderer || new Renderer_1();
      for (const prop in extension.renderer) {
        const prevRenderer = renderer[prop];
        renderer[prop] = (...args) => {
          let ret = extension.renderer[prop].apply(renderer, args);
          if (ret === false) {
            ret = prevRenderer.apply(renderer, args);
          }
          return ret;
        };
      }
      opts.renderer = renderer;
    }
    if (extension.tokenizer) {
      const tokenizer = marked.defaults.tokenizer || new Tokenizer_1();
      for (const prop in extension.tokenizer) {
        const prevTokenizer = tokenizer[prop];
        tokenizer[prop] = (...args) => {
          let ret = extension.tokenizer[prop].apply(tokenizer, args);
          if (ret === false) {
            ret = prevTokenizer.apply(tokenizer, args);
          }
          return ret;
        };
      }
      opts.tokenizer = tokenizer;
    }
    if (extension.walkTokens) {
      const walkTokens = marked.defaults.walkTokens;
      opts.walkTokens = (token) => {
        extension.walkTokens(token);
        if (walkTokens) {
          walkTokens(token);
        }
      };
    }
    marked.setOptions(opts);
  };

  /**
   * Run callback for every token
   */

  marked.walkTokens = function(tokens, callback) {
    for (const token of tokens) {
      callback(token);
      switch (token.type) {
        case 'table': {
          for (const cell of token.tokens.header) {
            marked.walkTokens(cell, callback);
          }
          for (const row of token.tokens.cells) {
            for (const cell of row) {
              marked.walkTokens(cell, callback);
            }
          }
          break;
        }
        case 'list': {
          marked.walkTokens(token.items, callback);
          break;
        }
        default: {
          if (token.tokens) {
            marked.walkTokens(token.tokens, callback);
          }
        }
      }
    }
  };

  /**
   * Expose
   */

  marked.Parser = Parser_1;
  marked.parser = Parser_1.parse;

  marked.Renderer = Renderer_1;
  marked.TextRenderer = TextRenderer_1;

  marked.Lexer = Lexer_1;
  marked.lexer = Lexer_1.lex;

  marked.Tokenizer = Tokenizer_1;

  marked.Slugger = Slugger_1;

  marked.parse = marked;

  var marked_1 = marked;

  var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  function commonjsRequire () {
  	throw new Error('Dynamic requires are not currently supported by rollup-plugin-commonjs');
  }

  function createCommonjsModule$1(fn, module) {
  	return module = { exports: {} }, fn(module, module.exports), module.exports;
  }

  var pluralize = createCommonjsModule$1(function (module, exports) {
  /* global define */

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
  });

  /*! (c) Andrea Giammarchi (ISC) */var hyperHTML=function(N){var t={};try{t.WeakMap=WeakMap;}catch(e){t.WeakMap=function(t,e){var n=e.defineProperty,r=e.hasOwnProperty,i=a.prototype;return i.delete=function(e){return this.has(e)&&delete e[this._]},i.get=function(e){return this.has(e)?e[this._]:void 0},i.has=function(e){return r.call(e,this._)},i.set=function(e,t){return n(e,this._,{configurable:!0,value:t}),this},a;function a(e){n(this,"_",{value:"_@ungap/weakmap"+t++}),e&&e.forEach(o,this);}function o(e){this.set(e[0],e[1]);}}(Math.random(),Object);}var s=t.WeakMap,i={};try{i.WeakSet=WeakSet;}catch(e){!function(e,t){var n=r.prototype;function r(){t(this,"_",{value:"_@ungap/weakmap"+e++});}n.add=function(e){return this.has(e)||t(e,this._,{value:!0,configurable:!0}),this},n.has=function(e){return this.hasOwnProperty.call(e,this._)},n.delete=function(e){return this.has(e)&&delete e[this._]},i.WeakSet=r;}(Math.random(),Object.defineProperty);}function m(e,t,n,r,i,a){for(var o=("selectedIndex"in t),u=o;r<i;){var c,l=e(n[r],1);t.insertBefore(l,a),o&&u&&l.selected&&(u=!u,c=t.selectedIndex,t.selectedIndex=c<0?r:f.call(t.querySelectorAll("option"),l)),r++;}}function y(e,t){return e==t}function b(e){return e}function w(e,t,n,r,i,a,o){var u=a-i;if(u<1)return -1;for(;u<=n-t;){for(var c=t,l=i;c<n&&l<a&&o(e[c],r[l]);)c++,l++;if(l===a)return t;t=c+1;}return -1}function x(e,t,n,r,i){return n<r?e(t[n],0):0<n?e(t[n-1],-0).nextSibling:i}function E(e,t,n,r){for(;n<r;)a(e(t[n++],-1));}function C(e,t,n,r,i,a,o,u,c,l,s,f,h){!function(e,t,n,r,i,a,o,u,c){for(var l=[],s=e.length,f=o,h=0;h<s;)switch(e[h++]){case 0:i++,f++;break;case 1:l.push(r[i]),m(t,n,r,i++,i,f<u?t(a[f],0):c);break;case-1:f++;}for(h=0;h<s;)switch(e[h++]){case 0:o++;break;case-1:-1<l.indexOf(a[o])?o++:E(t,a,o++,o);}}(function(e,t,n,r,i,a,o){var u,c,l,s,f,h,d=n+a,v=[];e:for(m=0;m<=d;m++){if(50<m)return null;for(h=m-1,s=m?v[m-1]:[0,0],f=v[m]=[],u=-m;u<=m;u+=2){for(c=(l=u===-m||u!==m&&s[h+u-1]<s[h+u+1]?s[h+u+1]:s[h+u-1]+1)-u;l<a&&c<n&&o(r[i+l],e[t+c]);)l++,c++;if(l===a&&c===n)break e;f[m+u]=l;}}for(var p=Array(m/2+d/2),g=p.length-1,m=v.length-1;0<=m;m--){for(;0<l&&0<c&&o(r[i+l-1],e[t+c-1]);)p[g--]=0,l--,c--;if(!m)break;h=m-1,s=m?v[m-1]:[0,0],(u=l-c)===-m||u!==m&&s[h+u-1]<s[h+u+1]?(c--,p[g--]=1):(l--,p[g--]=-1);}return p}(n,r,a,o,u,l,f)||function(e,t,n,r,i,a,o,u){var c=0,l=r<u?r:u,s=Array(l++),f=Array(l);f[0]=-1;for(var h=1;h<l;h++)f[h]=o;for(var d=i.slice(a,o),v=t;v<n;v++){var p,g=d.indexOf(e[v]);-1<g&&(-1<(c=k(f,l,p=g+a))&&(f[c]=p,s[c]={newi:v,oldi:p,prev:s[c-1]}));}for(c=--l,--o;f[c]>o;)--c;l=u+r-c;var m=Array(l),y=s[c];for(--n;y;){for(var b=y.newi,w=y.oldi;b<n;)m[--l]=1,--n;for(;w<o;)m[--l]=-1,--o;m[--l]=0,--n,--o,y=y.prev;}for(;t<=n;)m[--l]=1,--n;for(;a<=o;)m[--l]=-1,--o;return m}(n,r,i,a,o,u,c,l),e,t,n,r,o,u,s,h);}var e=i.WeakSet,f=[].indexOf,k=function(e,t,n){for(var r=1,i=t;r<i;){var a=(r+i)/2>>>0;n<e[a]?i=a:r=1+a;}return r},a=function(e){return (e.remove||function(){var e=this.parentNode;e&&e.removeChild(this);}).call(e)};function l(e,t,n,r){for(var i=(r=r||{}).compare||y,a=r.node||b,o=null==r.before?null:a(r.before,0),u=t.length,c=u,l=0,s=n.length,f=0;l<c&&f<s&&i(t[l],n[f]);)l++,f++;for(;l<c&&f<s&&i(t[c-1],n[s-1]);)c--,s--;var h=l===c,d=f===s;if(h&&d)return n;if(h&&f<s)return m(a,e,n,f,s,x(a,t,l,u,o)),n;if(d&&l<c)return E(a,t,l,c),n;var v=c-l,p=s-f,g=-1;if(v<p){if(-1<(g=w(n,f,s,t,l,c,i)))return m(a,e,n,f,g,a(t[l],0)),m(a,e,n,g+v,s,x(a,t,c,u,o)),n}else if(p<v&&-1<(g=w(t,l,c,n,f,s,i)))return E(a,t,l,g),E(a,t,g+p,c),n;return v<2||p<2?(m(a,e,n,f,s,a(t[l],0)),E(a,t,l,c)):v==p&&function(e,t,n,r,i,a){for(;r<i&&a(n[r],e[t-1]);)r++,t--;return 0===t}(n,s,t,l,c,i)?m(a,e,n,f,s,x(a,t,c,u,o)):C(a,e,n,f,s,p,t,l,c,v,u,i,o),n}var n,r={};function o(e,t){t=t||{};var n=N.createEvent("CustomEvent");return n.initCustomEvent(e,!!t.bubbles,!!t.cancelable,t.detail),n}r.CustomEvent="function"==typeof CustomEvent?CustomEvent:(o[n="prototype"]=new o("").constructor[n],o);var u=r.CustomEvent,c={};try{c.Map=Map;}catch(e){c.Map=function(){var n=0,i=[],a=[];return {delete:function(e){var t=r(e);return t&&(i.splice(n,1),a.splice(n,1)),t},forEach:function(n,r){i.forEach(function(e,t){n.call(r,a[t],e,this);},this);},get:function(e){return r(e)?a[n]:void 0},has:r,set:function(e,t){return a[r(e)?n:i.push(e)-1]=t,this}};function r(e){return -1<(n=i.indexOf(e))}};}var h=c.Map;function d(){return this}function v(e,t){var n="_"+e+"$";return {get:function(){return this[n]||p(this,n,t.call(this,e))},set:function(e){p(this,n,e);}}}var p=function(e,t,n){return Object.defineProperty(e,t,{configurable:!0,value:"function"==typeof n?function(){return e._wire$=n.apply(this,arguments)}:n})[t]};Object.defineProperties(d.prototype,{ELEMENT_NODE:{value:1},nodeType:{value:-1}});var g,A,S,O,T,M,_={},j={},L=[],P=j.hasOwnProperty,D=0,W={attributes:_,define:function(e,t){e.indexOf("-")<0?(e in j||(D=L.push(e)),j[e]=t):_[e]=t;},invoke:function(e,t){for(var n=0;n<D;n++){var r=L[n];if(P.call(e,r))return j[r](e[r],t)}}},$=Array.isArray||(A=(g={}.toString).call([]),function(e){return g.call(e)===A}),R=(S=N,O="fragment",M="content"in H(T="template")?function(e){var t=H(T);return t.innerHTML=e,t.content}:function(e){var t,n=H(O),r=H(T);return F(n,/^[^\S]*?<(col(?:group)?|t(?:head|body|foot|r|d|h))/i.test(e)?(t=RegExp.$1,r.innerHTML="<table>"+e+"</table>",r.querySelectorAll(t)):(r.innerHTML=e,r.childNodes)),n},function(e,t){return ("svg"===t?function(e){var t=H(O),n=H("div");return n.innerHTML='<svg xmlns="http://www.w3.org/2000/svg">'+e+"</svg>",F(t,n.firstChild.childNodes),t}:M)(e)});function F(e,t){for(var n=t.length;n--;)e.appendChild(t[0]);}function H(e){return e===O?S.createDocumentFragment():S.createElementNS("http://www.w3.org/1999/xhtml",e)}var I,z,V,Z,G,q,B,J,K,Q,U=(z="appendChild",V="cloneNode",Z="createTextNode",q=(G="importNode")in(I=N),(B=I.createDocumentFragment())[z](I[Z]("g")),B[z](I[Z]("")),(q?I[G](B,!0):B[V](!0)).childNodes.length<2?function e(t,n){for(var r=t[V](),i=t.childNodes||[],a=i.length,o=0;n&&o<a;o++)r[z](e(i[o],n));return r}:q?I[G]:function(e,t){return e[V](!!t)}),X="".trim||function(){return String(this).replace(/^\s+|\s+/g,"")},Y="-"+Math.random().toFixed(6)+"%",ee=!1;try{J=N.createElement("template"),Q="tabindex",(K="content")in J&&(J.innerHTML="<p "+Q+'="'+Y+'"></p>',J[K].childNodes[0].getAttribute(Q)==Y)||(Y="_dt: "+Y.slice(1,-1)+";",ee=!0);}catch(e){}var te="\x3c!--"+Y+"--\x3e",ne=8,re=1,ie=3,ae=/^(?:style|textarea)$/i,oe=/^(?:area|base|br|col|embed|hr|img|input|keygen|link|menuitem|meta|param|source|track|wbr)$/i;var ue=" \\f\\n\\r\\t",ce="[^"+ue+"\\/>\"'=]+",le="["+ue+"]+"+ce,se="<([A-Za-z]+[A-Za-z0-9:._-]*)((?:",fe="(?:\\s*=\\s*(?:'[^']*?'|\"[^\"]*?\"|<[^>]*?>|"+ce.replace("\\/","")+"))?)",he=new RegExp(se+le+fe+"+)(["+ue+"]*/?>)","g"),de=new RegExp(se+le+fe+"*)(["+ue+"]*/>)","g"),ve=new RegExp("("+le+"\\s*=\\s*)(['\"]?)"+te+"\\2","gi");function pe(e,t,n,r){return "<"+t+n.replace(ve,ge)+r}function ge(e,t,n){return t+(n||'"')+Y+(n||'"')}function me(e,t,n){return oe.test(t)?e:"<"+t+n+"></"+t+">"}var ye=ee?function(e,t){var n=t.join(" ");return t.slice.call(e,0).sort(function(e,t){return n.indexOf(e.name)<=n.indexOf(t.name)?-1:1})}:function(e,t){return t.slice.call(e,0)};function be(e,t,n,r){for(var i=e.childNodes,a=i.length,o=0;o<a;){var u=i[o];switch(u.nodeType){case re:var c=r.concat(o);!function(e,t,n,r){var i,a=e.attributes,o=[],u=[],c=ye(a,n),l=c.length,s=0;for(;s<l;){var f=c[s++],h=f.value===Y;if(h||1<(i=f.value.split(te)).length){var d=f.name;if(o.indexOf(d)<0){o.push(d);var v=n.shift().replace(h?/^(?:|[\S\s]*?\s)(\S+?)\s*=\s*('|")?$/:new RegExp("^(?:|[\\S\\s]*?\\s)("+d+")\\s*=\\s*('|\")[\\S\\s]*","i"),"$1"),p=a[v]||a[v.toLowerCase()];if(h)t.push(we(p,r,v,null));else {for(var g=i.length-2;g--;)n.shift();t.push(we(p,r,v,i));}}u.push(f);}}l=u.length;var m=(s=0)<l&&ee&&!("ownerSVGElement"in e);for(;s<l;){var y=u[s++];m&&(y.value=""),e.removeAttribute(y.name);}var b=e.nodeName;if(/^script$/i.test(b)){var w=N.createElement(b);for(l=a.length,s=0;s<l;)w.setAttributeNode(a[s++].cloneNode(!0));w.textContent=e.textContent,e.parentNode.replaceChild(w,e);}}(u,t,n,c),be(u,t,n,c);break;case ne:var l=u.textContent;if(l===Y)n.shift(),t.push(ae.test(e.nodeName)?Ne(e,r):{type:"any",node:u,path:r.concat(o)});else switch(l.slice(0,2)){case"/*":if("*/"!==l.slice(-2))break;case"👻":e.removeChild(u),o--,a--;}break;case ie:ae.test(e.nodeName)&&X.call(u.textContent)===te&&(n.shift(),t.push(Ne(e,r)));}o++;}}function we(e,t,n,r){return {type:"attr",node:e,path:t,name:n,sparse:r}}function Ne(e,t){return {type:"text",node:e,path:t}}var xe,Ee=(xe=new s,{get:function(e){return xe.get(e)},set:function(e,t){return xe.set(e,t),t}});function Ce(o,f){var e=(o.convert||function(e){return e.join(te).replace(de,me).replace(he,pe)})(f),t=o.transform;t&&(e=t(e));var n=R(e,o.type);Se(n);var u=[];return be(n,u,f.slice(0),[]),{content:n,updates:function(c){for(var l=[],s=u.length,e=0,t=0;e<s;){var n=u[e++],r=function(e,t){for(var n=t.length,r=0;r<n;)e=e.childNodes[t[r++]];return e}(c,n.path);switch(n.type){case"any":l.push({fn:o.any(r,[]),sparse:!1});break;case"attr":var i=n.sparse,a=o.attribute(r,n.name,n.node);null===i?l.push({fn:a,sparse:!1}):(t+=i.length-2,l.push({fn:a,sparse:!0,values:i}));break;case"text":l.push({fn:o.text(r),sparse:!1}),r.textContent="";}}return s+=t,function(){var e=arguments.length;if(s!==e-1)throw new Error(e-1+" values instead of "+s+"\n"+f.join("${value}"));for(var t=1,n=1;t<e;){var r=l[t-n];if(r.sparse){var i=r.values,a=i[0],o=1,u=i.length;for(n+=u-2;o<u;)a+=arguments[t++]+i[o++];r.fn(a);}else r.fn(arguments[t++]);}return c}}}}var ke=[];function Ae(i){var a=ke,o=Se;return function(e){var t,n,r;return a!==e&&(t=i,n=a=e,r=Ee.get(n)||Ee.set(n,Ce(t,n)),o=r.updates(U.call(N,r.content,!0))),o.apply(null,arguments)}}function Se(e){for(var t=e.childNodes,n=t.length;n--;){var r=t[n];1!==r.nodeType&&0===X.call(r.textContent).length&&e.removeChild(r);}}var Oe,Te,Me=(Oe=/acit|ex(?:s|g|n|p|$)|rph|ows|mnc|ntw|ine[ch]|zoo|^ord/i,Te=/([^A-Z])([A-Z]+)/g,function(e,t){return "ownerSVGElement"in e?function(e,t){var n;return (n=t?t.cloneNode(!0):(e.setAttribute("style","--hyper:style;"),e.getAttributeNode("style"))).value="",e.setAttributeNode(n),je(n,!0)}(e,t):je(e.style,!1)});function _e(e,t,n){return t+"-"+n.toLowerCase()}function je(a,o){var u,c;return function(e){var t,n,r,i;switch(typeof e){case"object":if(e){if("object"===u){if(!o&&c!==e)for(n in c)n in e||(a[n]="");}else o?a.value="":a.cssText="";for(n in t=o?{}:a,e)r="number"!=typeof(i=e[n])||Oe.test(n)?i:i+"px",!o&&/^--/.test(n)?t.setProperty(n,r):t[n]=r;u="object",o?a.value=function(e){var t,n=[];for(t in e)n.push(t.replace(Te,_e),":",e[t],";");return n.join("")}(c=t):c=e;break}default:c!=e&&(u="string",c=e,o?a.value=e||"":a.cssText=e||"");}}}var Le,Pe,De=(Le=[].slice,(Pe=We.prototype).ELEMENT_NODE=1,Pe.nodeType=111,Pe.remove=function(e){var t,n=this.childNodes,r=this.firstChild,i=this.lastChild;return this._=null,e&&2===n.length?i.parentNode.removeChild(i):((t=this.ownerDocument.createRange()).setStartBefore(e?n[1]:r),t.setEndAfter(i),t.deleteContents()),r},Pe.valueOf=function(e){var t=this._,n=null==t;if(n&&(t=this._=this.ownerDocument.createDocumentFragment()),n||e)for(var r=this.childNodes,i=0,a=r.length;i<a;i++)t.appendChild(r[i]);return t},We);function We(e){var t=this.childNodes=Le.call(e,0);this.firstChild=t[0],this.lastChild=t[t.length-1],this.ownerDocument=t[0].ownerDocument,this._=null;}function $e(e){return {html:e}}function Re(e,t){switch(e.nodeType){case Ke:return 1/t<0?t?e.remove(!0):e.lastChild:t?e.valueOf(!0):e.firstChild;case Je:return Re(e.render(),t);default:return e}}function Fe(e,t){t(e.placeholder),"text"in e?Promise.resolve(e.text).then(String).then(t):"any"in e?Promise.resolve(e.any).then(t):"html"in e?Promise.resolve(e.html).then($e).then(t):Promise.resolve(W.invoke(e,t)).then(t);}function He(e){return null!=e&&"then"in e}var Ie,ze,Ve,Ze,Ge,qe="ownerSVGElement",Be="connected",Je=d.prototype.nodeType,Ke=De.prototype.nodeType,Qe=(ze=(Ie={Event:u,WeakSet:e}).Event,Ve=Ie.WeakSet,Ze=!0,Ge=null,function(e){return Ze&&(Ze=!Ze,Ge=new Ve,function(t){var i=new Ve,a=new Ve;try{new MutationObserver(u).observe(t,{subtree:!0,childList:!0});}catch(e){var n=0,r=[],o=function(e){r.push(e),clearTimeout(n),n=setTimeout(function(){u(r.splice(n=0,r.length));},0);};t.addEventListener("DOMNodeRemoved",function(e){o({addedNodes:[],removedNodes:[e.target]});},!0),t.addEventListener("DOMNodeInserted",function(e){o({addedNodes:[e.target],removedNodes:[]});},!0);}function u(e){for(var t,n=e.length,r=0;r<n;r++)c((t=e[r]).removedNodes,"disconnected",a,i),c(t.addedNodes,"connected",i,a);}function c(e,t,n,r){for(var i,a=new ze(t),o=e.length,u=0;u<o;1===(i=e[u++]).nodeType&&function e(t,n,r,i,a){Ge.has(t)&&!i.has(t)&&(a.delete(t),i.add(t),t.dispatchEvent(n));for(var o=t.children||[],u=o.length,c=0;c<u;e(o[c++],n,r,i,a));}(i,a,t,n,r));}}(e.ownerDocument)),Ge.add(e),e}),Ue=/^(?:form|list)$/i,Xe=[].slice;function Ye(e){return this.type=e,Ae(this)}var et=!(Ye.prototype={attribute:function(n,r,e){var i,t=qe in n;if("style"===r)return Me(n,e,t);if("."===r.slice(0,1))return o=n,u=r.slice(1),t?function(t){try{o[u]=t;}catch(e){o.setAttribute(u,t);}}:function(e){o[u]=e;};if(/^on/.test(r)){var a=r.slice(2);return a===Be||"disconnected"===a?Qe(n):r.toLowerCase()in n&&(a=a.toLowerCase()),function(e){i!==e&&(i&&n.removeEventListener(a,i,!1),(i=e)&&n.addEventListener(a,e,!1));}}if("data"===r||!t&&r in n&&!Ue.test(r))return function(e){i!==e&&(i=e,n[r]!==e&&null==e?(n[r]="",n.removeAttribute(r)):n[r]=e);};if(r in W.attributes)return function(e){var t=W.attributes[r](n,e);i!==t&&(null==(i=t)?n.removeAttribute(r):n.setAttribute(r,t));};var o,u,c=!1,l=e.cloneNode(!0);return function(e){i!==e&&(i=e,l.value!==e&&(null==e?(c&&(c=!1,n.removeAttributeNode(l)),l.value=e):(l.value=e,c||(c=!0,n.setAttributeNode(l)))));}},any:function(r,i){var a,o={node:Re,before:r},u=qe in r?"svg":"html",c=!1;return function e(t){switch(typeof t){case"string":case"number":case"boolean":c?a!==t&&(a=t,i[0].textContent=t):(c=!0,a=t,i=l(r.parentNode,i,[(n=t,r.ownerDocument.createTextNode(n))],o));break;case"function":e(t(r));break;case"object":case"undefined":if(null==t){c=!1,i=l(r.parentNode,i,[],o);break}default:if(c=!1,$(a=t))if(0===t.length)i.length&&(i=l(r.parentNode,i,[],o));else switch(typeof t[0]){case"string":case"number":case"boolean":e({html:t});break;case"object":if($(t[0])&&(t=t.concat.apply([],t)),He(t[0])){Promise.all(t).then(e);break}default:i=l(r.parentNode,i,t,o);}else "ELEMENT_NODE"in t?i=l(r.parentNode,i,11===t.nodeType?Xe.call(t.childNodes):[t],o):He(t)?t.then(e):"placeholder"in t?Fe(t,e):"text"in t?e(String(t.text)):"any"in t?e(t.any):"html"in t?i=l(r.parentNode,i,Xe.call(R([].concat(t.html).join(""),u).childNodes),o):"length"in t?e(Xe.call(t)):e(W.invoke(t,e));}var n;}},text:function(r){var i;return function e(t){var n;i!==t&&("object"==(n=typeof(i=t))&&t?He(t)?t.then(e):"placeholder"in t?Fe(t,e):"text"in t?e(String(t.text)):"any"in t?e(t.any):"html"in t?e([].concat(t.html).join("")):"length"in t?e(Xe.call(t).join("")):e(W.invoke(t,e)):"function"==n?e(t(r)):r.textContent=null==t?"":t);}}}),tt=function(e){var t,r,i,a,n=(t=(N.defaultView.navigator||{}).userAgent,/(Firefox|Safari)\/(\d+)/.test(t)&&!/(Chrom[eium]+|Android)\/(\d+)/.test(t)),o=!("raw"in e)||e.propertyIsEnumerable("raw")||!Object.isFrozen(e.raw);return n||o?(r={},i=function(e){for(var t=".",n=0;n<e.length;n++)t+=e[n].length+"."+e[n];return r[t]||(r[t]=e)},tt=o?i:(a=new s,function(e){return a.get(e)||(n=i(t=e),a.set(t,n),n);var t,n;})):et=!0,nt(e)};function nt(e){return et?e:tt(e)}function rt(e){for(var t=arguments.length,n=[nt(e)],r=1;r<t;)n.push(arguments[r++]);return n}var it=new s,at=function(t){var n,r,i;return function(){var e=rt.apply(null,arguments);return i!==e[0]?(i=e[0],r=new Ye(t),n=ut(r.apply(r,e))):r.apply(r,e),n}},ot=function(e,t){var n=t.indexOf(":"),r=it.get(e),i=t;return -1<n&&(i=t.slice(n+1),t=t.slice(0,n)||"html"),r||it.set(e,r={}),r[i]||(r[i]=at(t))},ut=function(e){var t=e.childNodes,n=t.length;return 1===n?t[0]:n?new De(t):e},ct=new s;function lt(){var e=ct.get(this),t=rt.apply(null,arguments);return e&&e.template===t[0]?e.tagger.apply(null,t):function(e){var t=new Ye(qe in this?"svg":"html");ct.set(this,{tagger:t,template:e}),this.textContent="",this.appendChild(t.apply(null,arguments));}.apply(this,t),this}var st,ft,ht,dt,vt=W.define,pt=Ye.prototype;function gt(e){return arguments.length<2?null==e?at("html"):"string"==typeof e?gt.wire(null,e):"raw"in e?at("html")(e):"nodeType"in e?gt.bind(e):ot(e,"html"):("raw"in e?at("html"):gt.wire).apply(null,arguments)}return gt.Component=d,gt.bind=function(e){return lt.bind(e)},gt.define=vt,gt.diff=l,(gt.hyper=gt).observe=Qe,gt.tagger=pt,gt.wire=function(e,t){return null==e?at(t||"html"):ot(e,t||"html")},gt._={WeakMap:s,WeakSet:e},st=at,ft=new s,ht=Object.create,dt=function(e,t){var n={w:null,p:null};return t.set(e,n),n},Object.defineProperties(d,{for:{configurable:!0,value:function(e,t){return function(e,t,n,r){var i,a,o,u=t.get(e)||dt(e,t);switch(typeof r){case"object":case"function":var c=u.w||(u.w=new s);return c.get(r)||(i=c,a=r,o=new e(n),i.set(a,o),o);default:var l=u.p||(u.p=ht(null));return l[r]||(l[r]=new e(n))}}(this,ft.get(e)||(n=e,r=new h,ft.set(n,r),r),e,null==t?"default":t);var n,r;}}}),Object.defineProperties(d.prototype,{handleEvent:{value:function(e){var t=e.currentTarget;this["getAttribute"in t&&t.getAttribute("data-call")||"on"+e.type](e);}},html:v("html",st),svg:v("svg",st),state:v("state",function(){return this.defaultState}),defaultState:{get:function(){return {}}},dispatch:{value:function(e,t){var n=this._wire$;if(n){var r=new u(e,{bubbles:!0,cancelable:!0,detail:t});return r.component=this,(n.dispatchEvent?n:n.firstChild).dispatchEvent(r)}return !1}},setState:{value:function(e,t){var n=this.state,r="function"==typeof e?e.call(this,n):e;for(var i in r)n[i]=r[i];return !1!==t&&this.render(),this}}}),gt}(document);

  // @ts-check

  /** @type {import("idb")} */
  // @ts-ignore
  const idb = _idb;
  const webidl2 = _webidl2;
  /** @type {import("hyperhtml").default} */
  // @ts-ignore
  const html$1 = hyperHTML;
  /** @type {import("marked")} */
  // @ts-ignore
  const marked$1 = marked_1;
  /** @type {import("pluralize")} */
  // @ts-ignore
  const pluralize$1 = pluralize;

  // @ts-check
  /**
   * Hashes a string from char code. Can return a negative number.
   * Based on https://gist.github.com/hyamamoto/fd435505d29ebfa3d9716fd2be8d42f0
   *
   * @param {String} text
   */
  function hashString(text) {
    let hash = 0;
    for (const char of text) {
      hash = (Math.imul(31, hash) + char.charCodeAt(0)) | 0;
    }
    return String(hash);
  }

  const localizationStrings = {
    en: {
      x_and_y: " and ",
      x_y_and_z: ", and ",
    },
    de: {
      x_and_y: " und ",
      x_y_and_z: " und ",
    },
  };
  const l10n$2 = getIntlData(localizationStrings);

  const resourceHints = new Set([
    "dns-prefetch",
    "preconnect",
    "preload",
    "prerender",
  ]);

  const fetchDestinations = new Set([
    "document",
    "embed",
    "font",
    "image",
    "manifest",
    "media",
    "object",
    "report",
    "script",
    "serviceworker",
    "sharedworker",
    "style",
    "worker",
    "xslt",
    "",
  ]);

  // CSS selector for matching elements that are non-normative
  const nonNormativeSelector =
    ".informative, .note, .issue, .example, .ednote, .practice, .introductory";

  /**
   * Creates a link element that represents a resource hint.
   *
   * @param {Object} opts Configure the resource hint.
   * @param {String} opts.hint The type of hint (see resourceHints).
   * @param {String} opts.href The URL for the resource or origin.
   * @param {String} [opts.corsMode] Optional, the CORS mode to use (see HTML spec).
   * @param {String} [opts.as] Optional, fetch destination type (see fetchDestinations).
   * @param {boolean} [opts.dontRemove] If the hint should remain in the spec after processing.
   * @return {HTMLLinkElement} A link element ready to use.
   */
  function createResourceHint(opts) {
    if (!opts || typeof opts !== "object") {
      throw new TypeError("Missing options");
    }
    if (!resourceHints.has(opts.hint)) {
      throw new TypeError("Invalid resources hint");
    }
    const url = new URL(opts.href, location.href);
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
        if ("as" in opts && typeof opts.as === "string") {
          if (!fetchDestinations.has(opts.as)) {
            console.warn(`Unknown request destination: ${opts.as}`);
          }
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
  function removeReSpec(doc) {
    doc.querySelectorAll(".remove, script[data-requiremodule]").forEach(elem => {
      elem.remove();
    });
  }

  /**
   * Adds error class to each element while emitting a warning
   * @param {HTMLElement|HTMLElement[]} elems
   * @param {String} msg message to show in warning
   * @param {String=} title error message to add on each element
   * @param {object} [options]
   * @param {string} [options.details]
   */
  function showInlineWarning(elems, msg, title, options = {}) {
    if (!Array.isArray(elems)) elems = [elems];
    const message = getErrorMessage(elems, msg, title, options);
    pub("warn", message);
    console.warn(msg, elems);
  }

  /**
   * Adds error class to each element while emitting a warning
   * @param {HTMLElement|HTMLElement[]} elems
   * @param {String} msg message to show in warning
   * @param {String} title error message to add on each element
   * @param {object} [options]
   * @param {string} [options.details]
   */
  function showInlineError(elems, msg, title, options = {}) {
    if (!Array.isArray(elems)) elems = [elems];
    const message = getErrorMessage(elems, msg, title, options);
    pub("error", message);
    console.error(msg, elems);
  }

  /**
   * @param {HTMLElement[]} elems
   * @param {String} msg
   * @param {String} title
   * @param {object} [options]
   * @param {string} [options.details]
   */
  function getErrorMessage(elems, msg, title, { details }) {
    const links = elems
      .map((element, i) => {
        markAsOffending(element, msg, title);
        return generateMarkdownLink(element, i);
      })
      .join(", ");
    let message = `${msg} at: ${links}.`;
    if (details) {
      message += `\n\n<details>${details}</details>`;
    }
    return message;
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

  /**
   * @param {Element} element
   * @param {number} i
   */
  function generateMarkdownLink(element, i) {
    return `[${i + 1}](#${element.id})`;
  }

  class IDBKeyVal {
    /**
     * @param {import("idb").IDBPDatabase} idb
     * @param {string} storeName
     */
    constructor(idb, storeName) {
      this.idb = idb;
      this.storeName = storeName;
    }

    /** @param {string} key */
    async get(key) {
      return await this.idb
        .transaction(this.storeName)
        .objectStore(this.storeName)
        .get(key);
    }

    /**
     * @param {string[]} keys
     */
    async getMany(keys) {
      const keySet = new Set(keys);
      /** @type {Map<string, any>} */
      const results = new Map();
      let cursor = await this.idb.transaction(this.storeName).store.openCursor();
      while (cursor) {
        if (keySet.has(cursor.key)) {
          results.set(cursor.key, cursor.value);
        }
        cursor = await cursor.continue();
      }
      return results;
    }

    /**
     * @param {string} key
     * @param {any} value
     */
    async set(key, value) {
      const tx = this.idb.transaction(this.storeName, "readwrite");
      tx.objectStore(this.storeName).put(value, key);
      return await tx.done;
    }

    async addMany(entries) {
      const tx = this.idb.transaction(this.storeName, "readwrite");
      for (const [key, value] of entries) {
        tx.objectStore(this.storeName).put(value, key);
      }
      return await tx.done;
    }

    async clear() {
      const tx = this.idb.transaction(this.storeName, "readwrite");
      tx.objectStore(this.storeName).clear();
      return await tx.done;
    }

    async keys() {
      const tx = this.idb.transaction(this.storeName);
      /** @type {Promise<string[]>} */
      const keys = tx.objectStore(this.storeName).getAllKeys();
      await tx.done;
      return keys;
    }
  }

  // STRING HELPERS
  // Takes an array and returns a string that separates each of its items with the proper commas and
  // "and". The second argument is a mapping function that can convert the items before they are
  // joined
  function joinAnd(array = [], mapper = item => item, lang$1 = lang) {
    const items = array.map(mapper);
    if (Intl.ListFormat && typeof Intl.ListFormat === "function") {
      const formatter = new Intl.ListFormat(lang$1, {
        style: "long",
        type: "conjunction",
      });
      return formatter.format(items);
    }
    switch (items.length) {
      case 0:
      case 1: // "x"
        return items.toString();
      case 2: // x and y
        return items.join(l10n$2.x_and_y);
      default: {
        // x, y, and z
        const str = items.join(", ");
        const lastComma = str.lastIndexOf(",");
        const and = l10n$2.x_y_and_z;
        return `${str.substr(0, lastComma)}${and}${str.slice(lastComma + 2)}`;
      }
    }
  }

  // Takes a string, applies some XML escapes, and returns the escaped string.
  // Note that overall using either Handlebars' escaped output or jQuery is much
  // preferred to operating on strings directly.
  function xmlEscape(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  /**
   * Trims string at both ends and replaces all other white space with a single space
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
  function getIntlData(localizationStrings, lang$1 = lang) {
    lang$1 = resolveLanguageAlias(lang$1.toLowerCase());
    // Proxy return type is a known bug:
    // https://github.com/Microsoft/TypeScript/issues/20846
    // @ts-ignore
    return new Proxy(localizationStrings, {
      /** @param {string} key */
      get(data, key) {
        const result = (data[lang$1] && data[lang$1][key]) || data.en[key];
        if (!result) {
          throw new Error(`No l10n data for key: "${key}"`);
        }
        return result;
      },
    });
  }

  // Given an object, it converts it to a key value pair separated by
  // ("=", configurable) and a delimiter (" ," configurable).
  // for example, {"foo": "bar", "baz": 1} becomes "foo=bar, baz=1"
  function toKeyValuePairs(obj, delimiter = ", ", separator = "=") {
    return Array.from(Object.entries(obj))
      .map(([key, value]) => `${key}${separator}${JSON.stringify(value)}`)
      .join(delimiter);
  }

  // STYLE HELPERS
  // take a document and either a link or an array of links to CSS and appends
  // a <link/> element to the head pointing to each
  function linkCSS(doc, styles) {
    const stylesArray = [].concat(styles);
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
  // Run list of transforms over content and return result.
  // Please note that this is a legacy method that is only kept in order
  // to maintain compatibility
  // with RSv1. It is therefore not tested and not actively supported.
  /**
   * @this {any}
   * @param {string} content
   * @param {string} [flist]
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
            pub(
              "warn",
              `call to \`${meth}()\` failed with: ${e}. See error console for stack trace.`
            );
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
   * @param {number} maxAge cache expiration duration in ms. defaults to 24 hours (86400000 ms)
   * @return {Promise<Response>}
   *  if a cached response is available and it's not stale, return it
   *  else: request from network, cache and return fresh response.
   *    If network fails, return a stale cached version if exists (else throw)
   */
  async function fetchAndCache(input, maxAge = 86400000) {
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

  function htmlJoinComma(array, mapper = item => item) {
    const items = array.map(mapper);
    const joined = items.slice(0, -1).map(item => html$1`${item}, `);
    return html$1`${joined}${items[items.length - 1]}`;
  }

  /**
   * Creates and sets an ID to an element (elem) by hashing the text content.
   *
   * @param {HTMLElement} elem element to hash from
   * @param {String} prefix prefix to prepend to the generated id
   */
  function addHashId(elem, prefix = "") {
    const text = norm(elem.textContent);
    const hash = hashString(text);
    return addId(elem, prefix, hash);
  }

  /**
   * Creates and sets an ID to an element (elem)
   * using a specific prefix if provided, and a specific text if given.
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
   * @param {boolean} options.wsNodes if nodes that only have whitespace are returned.
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
   * For any element, returns an array of title strings that applies
   *   the algorithm used for determining the actual title of a
   *   <dfn> element (but can apply to other as well).
   * if args.isDefinition is true, then the element is a definition, not a
   *   reference to a definition. Any @title will be replaced with
   *   @data-lt to be consistent with Bikeshed / Shepherd.
   * This method now *prefers* the data-lt attribute for the list of
   *   titles. That attribute is added by this method to dfn elements, so
   *   subsequent calls to this method will return the data-lt based list.
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
   * For an element (usually <a>), returns an array of targets that
   * element might refer to, of the form
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
   * @returns {Element} new renamed element
   */
  function renameElement(elem, newName) {
    if (elem.localName === newName) return elem;
    const newElement = elem.ownerDocument.createElement(newName);
    // copy attributes
    for (const { name, value } of elem.attributes) {
      newElement.setAttribute(name, value);
    }
    // copy child nodes
    newElement.append(...elem.childNodes);
    elem.replaceWith(newElement);
    return newElement;
  }

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
   * Calculates indentation when the element starts after a newline.
   * The value will be empty if no newline or any non-whitespace exists after one.
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

  function makeSafeCopy(node) {
    const clone = node.cloneNode(true);
    clone.querySelectorAll("[id]").forEach(elem => elem.removeAttribute("id"));
    clone.querySelectorAll("dfn").forEach(dfn => renameElement(dfn, "span"));
    if (clone.hasAttribute("id")) clone.removeAttribute("id");
    removeCommentNodes(clone);
    return clone;
  }

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

  // @ts-check

  const name$2 = "core/base-runner";

  function toRunnable(plug) {
    const name = plug.name || "";
    if (!name) {
      console.warn("Plugin lacks name:", plug);
    }
    return config => {
      // eslint-disable-next-line no-async-promise-executor
      return new Promise(async (resolve, reject) => {
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
        }
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
      });
    };
  }

  function isRunnableModule(plug) {
    return plug && (plug.run || plug.Plugin);
  }

  async function runAll(plugs) {
    pub("start-all", respecConfig);
    performance.mark(`${name$2}-start`);
    await done$1;
    const runnables = plugs.filter(isRunnableModule).map(toRunnable);
    for (const task of runnables) {
      try {
        await task(respecConfig);
      } catch (err) {
        console.error(err);
      }
    }
    pub("plugins-done", respecConfig);
    await done;
    pub("end-all", respecConfig);
    removeReSpec(document);
    performance.mark(`${name$2}-end`);
    performance.measure(name$2, `${name$2}-start`, `${name$2}-end`);
  }

  var baseRunner = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$2,
    runAll: runAll
  });

  /**
   * @param {string} path
   */
  async function fetchBase(path) {
    const response = await fetch(new URL(`../../${path}`, (document.currentScript && document.currentScript.src || new URL('respec-ims-default.js', document.baseURI).href)));
    return await response.text();
  }

  /**
   * @param {string} fileName
   */
  async function fetchAsset(fileName) {
    return fetchBase(`assets/${fileName}`);
  }

  // @ts-check
  /**
   * Module core/reindent
   *
   * Removes common indents across the IDL texts,
   * so that indentation inside <pre> won't affect the rendered result.
   */

  const name$3 = "core/reindent";

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

  function run$1() {
    for (const pre of document.getElementsByTagName("pre")) {
      pre.innerHTML = reindent(pre.innerHTML);
    }
  }

  var reindent$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$3,
    reindent: reindent,
    run: run$1
  });

  // @ts-check
  const name$4 = "core/markdown";

  const gtEntity = /&gt;/gm;
  const ampEntity = /&amp;/gm;

  class Renderer extends marked$1.Renderer {
    code(code, infoString, isEscaped) {
      const { language, ...metaData } = Renderer.parseInfoString(infoString);

      // regex to check whether the language is webidl
      if (/(^webidl$)/i.test(language)) {
        return `<pre class="idl">${code}</pre>`;
      }

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
    const result = marked$1(potentialMarkdown, {
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

  function structure(fragment, doc) {
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
    const structuredInternals = structure(elem, elem.ownerDocument);
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

  function run$2(conf) {
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
    const fragment = structure(newBody, document);
    // Frankenstein the whole thing back together
    newBody.append(rsUI, fragment);
    document.body.replaceWith(newBody);
  }

  var markdown = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$4,
    markdownToHtml: markdownToHtml,
    restructure: restructure,
    run: run$2
  });

  /**
   * www.openjs.com/scripts/events/keyboard_shortcuts/
   * Version : 2.01.B
   * By Binny V A
   * License : BSD
   */
  var shortcut = {
    all_shortcuts: {}, //All the shortcuts are stored in this array
    add: function(shortcut_combination, callback, opt) {
      //Provide a set of default options
      var default_options = {
        type: "keydown",
        propagate: false,
        disable_in_input: false,
        target: document,
        keycode: false,
      };
      if (!opt) {
        opt = default_options;
      } else {
        for (var dfo in default_options) {
          if (typeof opt[dfo] == "undefined") opt[dfo] = default_options[dfo];
        }
      }

      var ele = opt.target;
      if (typeof opt.target == "string")
        ele = document.getElementById(opt.target);
      shortcut_combination = shortcut_combination.toLowerCase();

      //The function to be called at keypress
      var func = function(e) {
        var code;
        e = e || window.event;

        if (opt["disable_in_input"]) {
          //Don't enable shortcut keys in Input, Textarea fields
          var element;
          if (e.target) element = e.target;
          else if (e.srcElement) element = e.srcElement;
          if (element.nodeType == 3) element = element.parentNode;

          if (element.tagName == "INPUT" || element.tagName == "TEXTAREA") return;
        }

        //Find Which key is pressed
        if (e.keyCode) code = e.keyCode;
        else if (e.which) code = e.which;
        var character = String.fromCharCode(code).toLowerCase();

        if (code == 188) character = ","; //If the user presses , when the type is onkeydown
        if (code == 190) character = "."; //If the user presses , when the type is onkeydown

        var keys = shortcut_combination.split("+");
        //Key Pressed - counts the number of valid keypresses - if it is same as the number of keys, the shortcut function is invoked
        var kp = 0;

        //Work around for stupid Shift key bug created by using lowercase - as a result the shift+num combination was broken
        var shift_nums = {
          "`": "~",
          "1": "!",
          "2": "@",
          "3": "#",
          "4": "$",
          "5": "%",
          "6": "^",
          "7": "&",
          "8": "*",
          "9": "(",
          "0": ")",
          "-": "_",
          "=": "+",
          ";": ":",
          "'": '"',
          ",": "<",
          ".": ">",
          "/": "?",
          "\\": "|",
        };
        //Special Keys - and their codes
        var special_keys = {
          esc: 27,
          escape: 27,
          tab: 9,
          space: 32,
          return: 13,
          enter: 13,
          backspace: 8,

          scrolllock: 145,
          scroll_lock: 145,
          scroll: 145,
          capslock: 20,
          caps_lock: 20,
          caps: 20,
          numlock: 144,
          num_lock: 144,
          num: 144,

          pause: 19,
          break: 19,

          insert: 45,
          home: 36,
          delete: 46,
          end: 35,

          pageup: 33,
          page_up: 33,
          pu: 33,

          pagedown: 34,
          page_down: 34,
          pd: 34,

          left: 37,
          up: 38,
          right: 39,
          down: 40,

          f1: 112,
          f2: 113,
          f3: 114,
          f4: 115,
          f5: 116,
          f6: 117,
          f7: 118,
          f8: 119,
          f9: 120,
          f10: 121,
          f11: 122,
          f12: 123,
        };

        var modifiers = {
          shift: { wanted: false, pressed: false },
          ctrl: { wanted: false, pressed: false },
          alt: { wanted: false, pressed: false },
          meta: { wanted: false, pressed: false }, //Meta is Mac specific
        };

        if (e.ctrlKey) modifiers.ctrl.pressed = true;
        if (e.shiftKey) modifiers.shift.pressed = true;
        if (e.altKey) modifiers.alt.pressed = true;
        if (e.metaKey) modifiers.meta.pressed = true;

        for (var i = 0, k; (k = keys[i]), i < keys.length; i++) {
          //Modifiers
          if (k == "ctrl" || k == "control") {
            kp++;
            modifiers.ctrl.wanted = true;
          } else if (k == "shift") {
            kp++;
            modifiers.shift.wanted = true;
          } else if (k == "alt") {
            kp++;
            modifiers.alt.wanted = true;
          } else if (k == "meta") {
            kp++;
            modifiers.meta.wanted = true;
          } else if (k.length > 1) {
            //If it is a special key
            if (special_keys[k] == code) kp++;
          } else if (opt["keycode"]) {
            if (opt["keycode"] == code) kp++;
          } else {
            //The special keys did not match
            if (character == k) kp++;
            else {
              if (shift_nums[character] && e.shiftKey) {
                //Stupid Shift key bug created by using lowercase
                character = shift_nums[character];
                if (character == k) kp++;
              }
            }
          }
        }

        if (
          kp == keys.length &&
          modifiers.ctrl.pressed == modifiers.ctrl.wanted &&
          modifiers.shift.pressed == modifiers.shift.wanted &&
          modifiers.alt.pressed == modifiers.alt.wanted &&
          modifiers.meta.pressed == modifiers.meta.wanted
        ) {
          callback(e);

          if (!opt["propagate"]) {
            //Stop the event
            //e.cancelBubble is supported by IE - this will kill the bubbling process.
            e.cancelBubble = true;
            e.returnValue = false;

            //e.stopPropagation works in Firefox.
            if (e.stopPropagation) {
              e.stopPropagation();
              e.preventDefault();
            }
            return false;
          }
        }
      };
      this.all_shortcuts[shortcut_combination] = {
        callback: func,
        target: ele,
        event: opt["type"],
      };
      //Attach the function with the event
      if (ele.addEventListener) ele.addEventListener(opt["type"], func, false);
      else if (ele.attachEvent) ele.attachEvent("on" + opt["type"], func);
      else ele["on" + opt["type"]] = func;
    },

    //Remove the shortcut - just specify the shortcut and I will remove the binding
    // 'remove':function(shortcut_combination) {
    //  shortcut_combination = shortcut_combination.toLowerCase();
    //  var binding = this.all_shortcuts[shortcut_combination];
    //  delete(this.all_shortcuts[shortcut_combination])
    //  if(!binding) return;
    //  var type = binding['event'];
    //  var ele = binding['target'];
    //  var callback = binding['callback'];
    //
    //  if(ele.detachEvent) ele.detachEvent('on'+type, callback);
    //  else if(ele.removeEventListener) ele.removeEventListener(type, callback, false);
    //  else ele['on'+type] = false;
    // }
  };

  // @ts-check
  const name$5 = "ims/ui";

  // Opportunistically inserts the style, with the chance to reduce some FOUC
  insertStyle();

  async function loadStyle() {
    try {
      return (await Promise.resolve().then(function () { return ui$3; })).default;
    } catch {
      return fetchAsset("ui.css");
    }
  }

  async function insertStyle() {
    const styleElement = document.createElement("style");
    styleElement.id = "respec-ui-styles";
    styleElement.textContent = await loadStyle();
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

  const respecUI = html$1`<div id="respec-ui" class="removeOnSave" hidden></div>`;
  const menu = html$1`<ul
  id="respec-menu"
  role="menu"
  aria-labelledby="respec-pill"
  hidden
></ul>`;
  const closeButton = html$1`<button
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

  const respecPill = html$1`<button id="respec-pill" disabled>ReSpec</button>`;
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

  function errWarn(msg, arr, butName, title) {
    arr.push(msg);
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
    const button = html$1`<button
    id="${buttonId}"
    class="respec-info-button"
  ></button>`;
    button.addEventListener("click", () => {
      button.setAttribute("aria-expanded", "true");
      const ol = html$1`<ol class="${`respec-${butName}-list`}"></ol>`;
      for (const err of arr) {
        const fragment = document
          .createRange()
          .createContextualFragment(markdownToHtml(err));
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
    addCommand(label, handler, keyShort, icon) {
      icon = icon || "";
      const id = `respec-button-${label.toLowerCase().replace(/\s+/, "-")}`;
      const button = html$1`<button
      id="${id}"
      class="respec-option"
      title="${keyShort}"
    >
      <span class="respec-cmd-icon" aria-hidden="true">${icon}</span> ${label}…
    </button>`;
      const menuItem = html$1`<li role="menuitem">${button}</li>`;
      menuItem.addEventListener("click", handler);
      menu.appendChild(menuItem);
      if (keyShort) shortcut.add(keyShort, handler);
      return button;
    },
    error(msg) {
      errWarn(msg, errors, "error", "ReSpec Errors");
    },
    warning(msg) {
      errWarn(msg, warnings, "warning", "ReSpec Warnings");
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
      overlay = html$1`<div id="respec-overlay" class="removeOnSave"></div>`;
      const id = `${currentOwner.id}-modal`;
      const headingId = `${id}-heading`;
      modal = html$1`<div
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
  shortcut.add("Esc", () => ui.closeModal());
  shortcut.add("Ctrl+Alt+Shift+E", () => {
    if (buttons.error) buttons.error.click();
  });
  shortcut.add("Ctrl+Alt+Shift+W", () => {
    if (buttons.warning) buttons.warning.click();
  });
  window.respecUI = ui;
  sub("error", details => ui.error(details));
  sub("warn", details => ui.warning(details));

  var ui$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$5,
    ui: ui
  });

  // @ts-check
  // Module core/location-hash
  // Resets window.location.hash to jump to the right point in the document

  const name$6 = "core/location-hash";

  function run$3() {
    if (!location.hash) {
      return;
    }
    document.respecIsReady.then(() => {
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
    name: name$6,
    run: run$3
  });

  // @ts-check
  const name$7 = "core/style";

  // Opportunistically inserts the style, with the chance to reduce some FOUC
  const styleElement = insertStyle$1();

  async function loadStyle$1() {
    try {
      return (await Promise.resolve().then(function () { return respec$1; })).default;
    } catch {
      return fetchAsset("respec.css");
    }
  }

  async function insertStyle$1() {
    const styleElement = document.createElement("style");
    styleElement.id = "respec-mainstyle";
    styleElement.textContent = await loadStyle$1();
    document.head.appendChild(styleElement);
    return styleElement;
  }

  async function run$4(conf) {
    if (conf.noReSpecCSS) {
      (await styleElement).remove();
    }
  }

  var style = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$7,
    run: run$4
  });

  // @ts-check

  const name$8 = "ims/style";

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
  async function run$5(conf) {
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

  var style$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$8,
    run: run$5
  });

  // @ts-check

  const name$9 = "ims/config";

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
  async function run$6(conf) {
    if (!check(conf.specTitle)) {
      pub(
        "error",
        "head config must have the <code>specTitle</code> property set: " +
          "title of the document, excluding version"
      );
      conf.specTitle = "@@@FIXME (conf.specTitle)";
    }

    if (!check(conf.specDate)) {
      pub(
        "error",
        "head config must have the <code>specDate</code> property set, e.g. 'June 28, 2019'"
      );
      conf.specDate = "@@@FIXME(conf.specDate)";
    }

    if (!check(conf.specNature)) {
      pub(
        "error",
        "head config must have the <code>specNature</code> property set: one of 'normative' or 'informative'"
      );
      conf.specNature = "informative";
    }

    if (!check(conf.specType)) {
      pub(
        "error",
        "head config must have the <code>specType</code> property set: One of 'spec', 'cert', 'impl', 'errata', 'doc' "
      );
      conf.specType = "spec";
    }

    if (conf.specType === "doc" || conf.specType === "proposal") {
      return;
    }

    if (!check(conf.shortName)) {
      pub(
        "error",
        "head config must have the <code>shortName</code> property set: " +
          "list at urls-names.md#shortnames"
      );
      conf.shortName = "FIXME";
    }

    if (!check(conf.specStatus)) {
      pub(
        "error",
        "head config must have the <code>specStatus</code> property set to " +
          "one of 'IMS Base Document', 'IMS Candidate Final', IMS Candidate Final Public', " +
          "or 'IMS Final Release'"
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
      pub(
        "error",
        "head config must have the <code>specStatus</code> property set to " +
          "one of 'IMS Base Document', 'IMS Candidate Final', 'IMS Candidate Final Public', " +
          "or 'IMS Final Release'"
      );
    }

    if (!check(conf.specVersion)) {
      pub(
        "error",
        "head config must have the <code>specVersion</code> property set, e.g. '1.1'"
      );
      conf.specVersion = "@@@FIXME(conf.specVersion)";
    }
  }

  var config = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$9,
    run: run$6
  });

  // @ts-check

  const name$a = "ims/compute";

  /**
   * Compute misc variables used by multiple other modules and store them back in conf.
   *
   * @param {*} conf
   */
  async function run$7(conf) {
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
    name: name$a,
    run: run$7
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

  const name$b = "ims/transclude";

  async function run$8() {
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
    name: name$b,
    run: run$8
  });

  // @ts-check

  const name$c = "core/data-include";

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

  async function run$9() {
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
        const msg = `\`data-include\` failed: \`${url}\` (${err.message}). See console for details.`;
        console.error("data-include failed for element: ", el, err);
        pub("error", msg);
      }
    });
    await Promise.all(promisesToInclude);
  }

  var dataInclude = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$c,
    run: run$9
  });

  // @ts-check
  // Module core/id-headers
  // All headings are expected to have an ID, unless their immediate container has one.
  // This is currently in core though it comes from a W3C rule. It may move in the future.

  const name$d = "core/id-headers";

  function run$a(conf) {
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
      h.appendChild(html$1`
      <a href="${`#${id}`}" class="self-link" aria-label="§"></a>
    `);
    }
  }

  var idHeaders = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$d,
    run: run$a
  });

  // @ts-check

  const name$e = "ims/abstract";

  /**
   * Handles checking for the abstract, and inserts a temp one if not present.
   */
  async function run$b() {
    const abstract = document.querySelector("#abstract");
    if (abstract === null) {
      pub(
        "warn",
        "No abstract found. Consider adding a section element with an " +
          "id of 'abstract'"
      );
      // insert a temp abstract
      const tempAbstract = toHTMLNode(
        "<section id='abstract' class='introductory remove'><h2>Abstract</h2></section>"
      );
      document.body.prepend(tempAbstract);
    }
  }

  var abstract = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$e,
    run: run$b
  });

  // @ts-check
  const name$f = "ims/post-markdown";

  /**
   * Post processing of markdown transcludes. Run after markdown.
   *
   * @param {*} conf respecConfig
   */
  async function run$c(conf) {
    if (conf.format !== "markdown") return;

    // remove <md-only> elements
    const mdOnlies = document.body.querySelectorAll("md-only");
    for (let i = 0; i < mdOnlies.length; i++) {
      mdOnlies[i].parentNode.removeChild(mdOnlies[i]);
    }

    // find abstract and add introductory class
    let abstract = document.body.querySelector("#abstract");
    if (abstract) {
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
    }
  }

  var postMarkdown = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$f,
    run: run$c
  });

  // @ts-check

  const name$g = "core/data-transform";

  function run$d() {
    /** @type {NodeListOf<HTMLElement>} */
    const transformables = document.querySelectorAll("[data-transform]");
    transformables.forEach(el => {
      el.innerHTML = runTransforms(el.innerHTML, el.dataset.transform);
      el.removeAttribute("data-transform");
    });
  }

  var dataTransform = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$g,
    run: run$d
  });

  // @ts-check
  const name$h = "core/dfn-abbr";

  function run$e() {
    /** @type {NodeListOf<HTMLElement>} */
    const elements = document.querySelectorAll("[data-abbr]");
    for (const elem of elements) {
      const { localName } = elem;
      switch (localName) {
        case "dfn":
          processDfnElement(elem);
          break;
        default: {
          const msg =
            `[\`data-abbr\`](https://github.com/w3c/respec/wiki/data-abbr)` +
            ` attribute not supported on \`${localName}\` elements.`;
          showInlineWarning(elem, msg, "Error: unsupported.");
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
    name: name$h,
    run: run$e
  });

  // @ts-check

  const name$i = "ims/inlines";

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
  async function run$f(conf) {
    // No conformance section in IMS Errata documents
    if (conf.specType == "errata") {
      return;
    }

    let conformance = document.querySelector("section#conformance");
    if (!conformance) {
      conformance = findConformanceSection(document.body);
    }
  }

  var inlines = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$i,
    run: run$f
  });

  // @ts-check
  const idlPrimitiveRegex = /^[a-z]+(\s+[a-z]+)+$/; // {{unrestricted double}} {{ double }}
  const exceptionRegex = /\B"([^"]*)"\B/; // {{ "SomeException" }}
  const methodRegex = /(\w+)\((.*)\)$/;
  const slotRegex = /^\[\[(\w+)\]\]$/;
  // matches: `value` or `[[value]]`
  // NOTE: [[value]] is actually a slot, but database has this as type="attribute"
  const attributeRegex = /^((?:\[\[)?(?:\w+)(?:\]\])?)$/;
  const enumRegex = /^(\w+)\["([\w- ]*)"\]$/;
  // TODO: const splitRegex = /(?<=\]\]|\b)\./
  // https://github.com/w3c/respec/pull/1848/files#r225087385
  const methodSplitRegex = /\.?(\w+\(.*\)$)/;

  /**
   * @typedef {object} IdlBase
   * @property {"base"} type
   * @property {string} identifier
   * @property {boolean} renderParent
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
   * @property {boolean} renderParent
   * @property {InlineIdl | null} [parent]
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
    const [nonMethodPart, methodPart] = str.split(methodSplitRegex);
    const tokens = nonMethodPart
      .split(/[./]/)
      .concat(methodPart)
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
        const [, identifier] = value.match(slotRegex);
        results.push({ type: "internal-slot", identifier, renderParent });
        continue;
      }
      // attribute
      if (attributeRegex.test(value) && tokens.length) {
        const [, identifier] = value.match(attributeRegex);
        results.push({ type: "attribute", identifier, renderParent });
        continue;
      }
      if (idlPrimitiveRegex.test(value)) {
        results.push({ type: "idl-primitive", identifier: value, renderParent });
        continue;
      }
      // base, always final token
      if (attributeRegex.test(value) && tokens.length === 0) {
        results.push({ type: "base", identifier: value, renderParent });
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
    const { identifier, renderParent } = details;
    if (renderParent) {
      return html$1`<a data-xref-type="_IDL_" data-link-type="idl"
      ><code>${identifier}</code></a
    >`;
    }
  }

  /**
   * Internal slot: .[[identifier]] or [[identifier]]
   * @param {IdlInternalSlot} details
   */
  function renderInternalSlot(details) {
    const { identifier, parent, renderParent } = details;
    const { identifier: linkFor } = parent || {};
    const lt = `[[${identifier}]]`;
    const element = html$1`${parent && renderParent ? "." : ""}<a
      data-xref-type="attribute"
      data-link-for=${linkFor}
      data-xref-for=${linkFor}
      data-lt="${lt}"
      ><code>[[${identifier}]]</code></a
    >`;
    return element;
  }

  /**
   * Attribute: .identifier
   * @param {IdlAttribute} details
   */
  function renderAttribute(details) {
    const { parent, identifier, renderParent } = details;
    const { identifier: linkFor } = parent || {};
    const element = html$1`${renderParent ? "." : ""}<a
      data-link-type="idl"
      data-xref-type="attribute|dict-member"
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
    const argsText = htmlJoinComma(args, arg => html$1`<var>${arg}</var>`);
    const searchText = `${identifier}(${args.join(", ")})`;
    const element = html$1`${parent && renderParent ? "." : ""}<a
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
    const element = html$1`"<a
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
    const element = html$1`"<a
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
    const { identifier } = details;
    const element = html$1`<a
    data-link-type="idl"
    data-cite="WebIDL"
    data-xref-type="interface"
    ><code>${identifier}</code></a
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
      const el = html$1`<span>{{ ${str} }}</span>`;
      showInlineError(el, error.message, "Error: Invalid inline IDL string");
      return el;
    }
    const render = html$1(document.createDocumentFragment());
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
    return await idb.openDB("respec-biblio2", 12, {
      upgrade(db) {
        Array.from(db.objectStoreNames).map(storeName =>
          db.deleteObjectStore(storeName)
        );
        const store = db.createObjectStore("alias", { keyPath: "id" });
        store.createIndex("aliasOf", "aliasOf", { unique: false });
        db.createObjectStore("reference", { keyPath: "id" });
      },
    });
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
     * @return {Promise<Object?>} The reference or null.
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
     * @return {Promise<Object?>} Resolves with the retrieved object, or null.
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
     * @param {Object} data An object that contains references and aliases.
     */
    async addAll(data) {
      if (!data) {
        return;
      }
      const aliasesAndRefs = { alias: [], reference: [] };
      for (const id of Object.keys(data)) {
        const obj = { id, ...data[id] };
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
     * @param {Object} details The object to store.
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
      const isInDB = await this.has(type, details.id);
      const store = db.transaction(type, "readwrite").store;
      // update or add, depending of already having it in db
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
  const biblio = {};

  const name$j = "core/biblio";

  const bibrefsURL = new URL("https://specref.herokuapp.com/bibrefs?refs=");

  // Opportunistically dns-prefetch to bibref server, as we don't know yet
  // if we will actually need to download references yet.
  const link = createResourceHint({
    hint: "dns-prefetch",
    href: bibrefsURL.origin,
  });
  document.head.appendChild(link);
  let doneResolver$2;

  /** @type {Promise<Conf['biblio']>} */
  const done$2 = new Promise(resolve => {
    doneResolver$2 = resolve;
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
    try {
      await biblioDB.addAll(data);
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
    const biblio = await done$2;
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
        doneResolver$2(this.conf.biblio);
      };
      if (!this.conf.localBiblio) {
        this.conf.localBiblio = {};
      }
      this.conf.biblio = biblio;
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
      const idbRefs = await getReferencesFromIdb(neededRefs);
      const split = { hasData: [], noData: [] };
      idbRefs.forEach(ref => {
        (ref.data ? split.hasData : split.noData).push(ref);
      });
      split.hasData.forEach(ref => {
        biblio[ref.id] = ref.data;
      });
      const externalRefs = split.noData.map(item => item.id);
      if (externalRefs.length) {
        // Going to the network for refs we don't have
        const data = await updateFromNetwork(externalRefs, { forceUpdate: true });
        Object.assign(biblio, data);
      }
      Object.assign(biblio, this.conf.localBiblio);
      finish();
    }
  }

  var biblio$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    biblio: biblio,
    name: name$j,
    updateFromNetwork: updateFromNetwork,
    resolveRef: resolveRef,
    Plugin: Plugin,
    wireReference: wireReference,
    stringifyReference: stringifyReference
  });

  // @ts-check

  const name$k = "core/render-biblio";

  const localizationStrings$1 = {
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

  const l10n$3 = getIntlData(localizationStrings$1);

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

  const defaultsReference = Object.freeze({
    authors: [],
    date: "",
    href: "",
    publisher: "",
    status: "",
    title: "",
    etAl: false,
  });

  const endWithDot = endNormalizer(".");

  /** @param {Conf} conf */
  function run$g(conf) {
    const informs = Array.from(conf.informativeReferences);
    const norms = Array.from(conf.normativeReferences);

    if (!informs.length && !norms.length) return;

    /** @type {HTMLElement} */
    const refSection =
      document.querySelector("section#references") ||
      html$1`<section id="references"></section>`;

    if (!document.querySelector("section#references > h2")) {
      refSection.prepend(html$1`<h2>${l10n$3.references}</h2>`);
    }

    refSection.classList.add("appendix");

    if (norms.length) {
      const sec = createReferencesSection(norms, l10n$3.norm_references);
      refSection.appendChild(sec);
    }
    if (informs.length) {
      const sec = createReferencesSection(informs, l10n$3.info_references);
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

    const sec = html$1`<section>
    <h3>${title}</h3>
    <dl class="bibliography">
      ${refsToShow.map(showRef)}
    </dl>
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
    let refcontent = biblio[ref];
    let key = ref;
    const circular = new Set([key]);
    while (refcontent && refcontent.aliasOf) {
      if (circular.has(refcontent.aliasOf)) {
        refcontent = null;
        const msg = `Circular reference in biblio DB between [\`${ref}\`] and [\`${key}\`].`;
        pub("error", msg);
      } else {
        key = refcontent.aliasOf;
        refcontent = biblio[key];
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
    const elem = html$1`<cite
    ><a class="bibref" href="${href}" data-link-type="biblio">${text}</a></cite
  >`;
    return linkText ? elem : html$1`[${elem}]`;
  }

  /**
   * renders a reference
   * @param {Ref} ref
   */
  function showRef({ ref, refcontent }) {
    const refId = `bib-${ref.toLowerCase()}`;
    if (refcontent) {
      return html$1`
      <dt id="${refId}">[${ref}]</dt>
      <dd>${{ html: stringifyReference(refcontent) }}</dd>
    `;
    } else {
      return html$1`
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

  function wireReference(rawRef, target = "_blank") {
    if (typeof rawRef !== "object") {
      throw new TypeError("Only modern object references are allowed");
    }
    const ref = Object.assign({}, defaultsReference, rawRef);
    const authors = ref.authors.join("; ") + (ref.etAl ? " et al" : "");
    const status = REF_STATUSES.get(ref.status) || ref.status;
    return html$1.wire(ref)`
    <cite>
      <a
        href="${ref.href}"
        target="${target}"
        rel="noopener noreferrer">
        ${ref.title.trim()}</a>.
    </cite>
    <span class="authors">
      ${endWithDot(authors)}
    </span>
    <span class="publisher">
      ${endWithDot(ref.publisher)}
    </span>
    <span class="pubDate">
      ${endWithDot(ref.date)}
    </span>
    <span class="pubStatus">
      ${endWithDot(status)}
    </span>
  `;
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
      pub("error", msg);
      console.warn("Bad references: ", badrefs);
    });
  }

  var renderBiblio = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$k,
    run: run$g,
    renderInlineCitation: renderInlineCitation,
    wireReference: wireReference,
    stringifyReference: stringifyReference
  });

  // @ts-check

  const name$l = "core/inlines";
  const rfc2119Usage = {};

  const localizationStrings$2 = {
    en: {
      rfc2119Keywords() {
        return new RegExp(
          [
            "\\bMUST(?:\\s+NOT)?\\b",
            "\\bSHOULD(?:\\s+NOT)?\\b",
            "\\bSHALL(?:\\s+NOT)?\\b",
            "\\bMAY\\b",
            "\\b(?:NOT\\s+)?REQUIRED\\b",
            "\\b(?:NOT\\s+)?RECOMMENDED\\b",
            "\\bOPTIONAL\\b",
          ].join("|")
        );
      },
    },
    de: {
      rfc2119Keywords() {
        return new RegExp(
          [
            "\\bMUSS\\b",
            "\\bERFORDERLICH\\b",
            "\\b(?:NICHT\\s+)?NÖTIG\\b",
            "\\bDARF(?:\\s+NICHT)?\\b",
            "\\bVERBOTEN\\b",
            "\\bSOLL(?:\\s+NICHT)?\\b",
            "\\b(?:NICHT\\s+)?EMPFOHLEN\\b",
            "\\bKANN\\b",
            "\\bOPTIONAL\\b",
          ].join("|")
        );
      },
    },
  };
  const l10n$4 = getIntlData(localizationStrings$2);

  // Inline `code`
  // TODO: Replace (?!`) at the end with (?:<!`) at the start when Firefox + Safari
  // add support.
  const inlineCodeRegExp = /(?:`[^`]+`)(?!`)/; // `code`
  const inlineIdlReference = /(?:{{[^}]+}})/; // {{ WebIDLThing }}
  const inlineVariable = /\B\|\w[\w\s]*(?:\s*:[\w\s&;<>]+)?\|\B/; // |var : Type|
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
    const [element, attribute] = value.split("/", 2).map(s => s && s.trim());
    const [xrefType, xrefFor, textContent] = attribute
      ? ["element-attr", element, attribute]
      : ["element", null, element];
    const code = html$1`<code
    ><a data-xref-type="${xrefType}" data-xref-for="${xrefFor}"
      >${textContent}</a
    ></code
  >`;
    return code;
  }

  /**
   * @param {string} matched
   * @return {HTMLElement}
   */
  function inlineRFC2119Matches(matched) {
    const value = norm(matched);
    const nodeElement = html$1`<em class="rfc2119">${value}</em>`;
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
      return html$1`<a data-cite="${ref}"></a>`;
    }
    if (document.querySelector(ref)) {
      return html$1`<a href="${ref}"></a>`;
    }
    const badReference = html$1`<span>${matched}</span>`;
    showInlineError(
      badReference, // cite element
      `Wasn't able to expand ${matched} as it didn't match any id in the document.`,
      `Please make sure there is element with id ${ref} in the document.`
    );
    return badReference;
  }

  /**
   * @param {string} matched
   */
  function inlineXrefMatches(matched) {
    // slices "{{" at the beginning and "}}" at the end
    const ref = matched.slice(2, -2).trim();
    return ref.startsWith("\\")
      ? matched.replace("\\", "")
      : idlStringToHtml(norm(ref));
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
    const { type, illegal } = refTypeFromContext(spec, txt.parentNode);
    const cite = renderInlineCitation(spec, linkText);
    const cleanRef = spec.replace(/^(!|\?)/, "");
    if (illegal && !conf.normativeReferences.has(cleanRef)) {
      const citeElem = cite.childNodes[1] || cite;
      showInlineWarning(
        citeElem,
        "Normative references in informative sections are not allowed. " +
          `Remove '!' from the start of the reference \`[[${ref}]]\``
      );
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
      : html$1`<abbr title="${abbrMap.get(matched)}">${matched}</abbr>`;
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
    return html$1`<var data-type="${type}">${varName}</var>`;
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
    const parts = splitBySlash(matched, 2);
    const [isFor, content] = parts.length === 2 ? parts : [null, parts[0]];
    const [linkingText, text] = content.includes("|")
      ? content.split("|", 2).map(s => s.trim())
      : [null, content];
    const processedContent = processInlineContent(text);
    const forContext = isFor ? norm(isFor) : null;
    return html$1`<a
    data-link-type="dfn"
    data-link-for="${forContext}"
    data-xref-for="${forContext}"
    data-lt="${linkingText}"
    >${processedContent}</a
  >`;
  }

  function inlineCodeMatches(matched) {
    const clean = matched.slice(1, -1); // Chop ` and `
    return html$1`<code>${clean}</code>`;
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

  function run$h(conf) {
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
    const abbrs = document.querySelectorAll("abbr[title]");
    for (const abbr of abbrs) {
      abbrMap.set(abbr.textContent, abbr.title);
    }
    const aKeys = [...abbrMap.keys()];
    const abbrRx = aKeys.length ? `(?:\\b${aKeys.join("\\b)|(?:\\b")}\\b)` : null;

    // PROCESSING
    // Don't gather text nodes for these:
    const exclusions = ["#respec-ui", ".head", "pre"];
    const txts = getTextNodes(document.body, exclusions, {
      wsNodes: false, // we don't want nodes with just whitespace
    });
    const keywords = l10n$4.rfc2119Keywords();
    const rx = new RegExp(
      `(${[
      keywords.source,
      inlineIdlReference.source,
      inlineVariable.source,
      inlineCitation.source,
      inlineExpansion.source,
      inlineAnchor.source,
      inlineCodeRegExp.source,
      inlineElement.source,
      ...(abbrRx ? [abbrRx] : []),
    ].join("|")})`
    );
    for (const txt of txts) {
      const subtxt = txt.data.split(rx);
      if (subtxt.length === 1) continue;
      const df = document.createDocumentFragment();
      let matched = true;
      for (const t of subtxt) {
        matched = !matched;
        if (!matched) {
          df.append(t);
        } else if (t.startsWith("{{")) {
          const node = inlineXrefMatches(t);
          df.append(node);
        } else if (t.startsWith("[[[")) {
          const node = inlineRefMatches(t);
          df.append(node);
        } else if (t.startsWith("[[")) {
          const nodes = inlineBibrefMatches(t, txt, conf);
          df.append(...nodes);
        } else if (t.startsWith("|")) {
          const node = inlineVariableMatches(t);
          df.append(node);
        } else if (t.startsWith("[=")) {
          const node = inlineAnchorMatches(t);
          df.append(node);
        } else if (t.startsWith("`")) {
          const node = inlineCodeMatches(t);
          df.append(node);
        } else if (t.startsWith("[^")) {
          const node = inlineElementMatches(t);
          df.append(node);
        } else if (abbrMap.has(t)) {
          const node = inlineAbbrMatches(t, txt, abbrMap);
          df.append(node);
        } else if (keywords.test(t)) {
          const node = inlineRFC2119Matches(t);
          df.append(node);
        } else {
          // FAIL -- not sure that this can really happen
          throw new Error(
            `Found token '${t}' but it does not correspond to anything`
          );
        }
      }
      txt.replaceWith(df);
    }
  }

  /**
   * Split a string by slash (`/`) unless it's escaped by a backslash (`\`)
   * @param {string} str
   *
   * TODO: Use negative lookbehind (`str.split(/(?<!\\)\//)`) when supported.
   * https://github.com/w3c/respec/issues/2869
   */
  function splitBySlash(str, limit = Infinity) {
    return str
      .replace("\\/", "%%")
      .split("/", limit)
      .map(s => s && s.trim().replace("%%", "/"));
  }

  var inlines$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$l,
    rfc2119Usage: rfc2119Usage,
    run: run$h
  });

  // @ts-check

  const name$m = "ims/conformance";

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
    const keywords = joinAnd(
      terms.sort(),
      item => `"<em class="rfc2119">${item}</em>"`
    );
    const plural = terms.length > 1;

    const content = html$1`<p>
      As well as sections marked as non-normative, all authoring guidelines,
      diagrams, examples, and notes in this specification are non-normative.
      Everything else in this specification is normative.
    </p>
    ${terms.length
      ? html$1`
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

    return html$1`${content}
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
      pub("warn", "No mainSpecTitle property found in config')");
    }

    if (!conf.mainSpecBiblioKey) {
      pub("warn", "No mainSpecBiblioKey property found in config')");
    }

    return html$1` <p>
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
  async function run$i(conf) {
    // No conformance section in IMS Errata documents
    if (conf.specType === "errata") {
      return;
    }

    // It is an IMS error if there is no conformance section found
    let conformance = document.querySelector("section#conformance");
    if (!conformance)
      conformance = document.querySelector("section#conformance-0");
    if (!conformance) {
      pub("error", "No section found with id 'conformance'");
      return;
    }

    // Use IMS specNature to determine conformance text
    if (!conf.specNature) {
      pub("error", "Document must have config.specNature set");
    }

    // IMS standard is to have a Conformance heading
    if (conformance.tagName === "SECTION") {
      const conformanceHeading = conformance.querySelector(
        "h1, h2, h3, h4, h5, h6"
      );
      if (!conformanceHeading) {
        pub("warn", "No heading found in the conformance section");
      } else {
        // Insert conformation text after heading
        conformance = conformanceHeading;
      }
    }

    // Insert the conformance text
    processConformance(conformance, conf);

    // Added message for legacy compat with Aria specs
    // See https://github.com/w3c/respec/issues/793
    pub("end", name$m);
  }

  var conformance = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$m,
    run: run$i
  });

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

  const name$n = "core/dfn";

  function run$j() {
    document.querySelectorAll("dfn").forEach(dfn => {
      const titles = getDfnTitles(dfn);
      registerDefinition(dfn, titles);

      // Treat Internal Slots as IDL.
      if (!dfn.dataset.dfnType && /^\[\[\w+\]\]$/.test(titles[0])) {
        dfn.dataset.dfnType = "idl";
      }

      // Only add `lt`s that are different from the text content
      if (titles.length === 1 && titles[0] === norm(dfn.textContent)) {
        return;
      }
      dfn.dataset.lt = titles.join("|");
    });
  }

  var dfn = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$n,
    run: run$j
  });

  // @ts-check

  const name$o = "core/pluralize";

  function run$k(conf) {
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

  var pluralize$2 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$o,
    run: run$k
  });

  // @ts-check

  const name$p = "core/examples";

  const localizationStrings$3 = {
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

  const l10n$5 = getIntlData(localizationStrings$3);

  const cssPromise = loadStyle$2();

  async function loadStyle$2() {
    try {
      return (await Promise.resolve().then(function () { return examples$2; })).default;
    } catch {
      return fetchAsset("examples.css");
    }
  }

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
      ? html$1`<span class="example-title">: ${report.title}</span>`
      : "";
    return html$1`<div class="marker">
    <a class="self-link">${l10n$5.example}<bdi>${number}</bdi></a
    >${title}
  </div>`;
  }

  async function run$l() {
    /** @type {NodeListOf<HTMLElement>} */
    const examples = document.querySelectorAll(
      "pre.example, pre.illegal-example, aside.example"
    );
    if (!examples.length) return;

    const css = await cssPromise;
    document.head.insertBefore(
      html$1`<style>
      ${css}
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
        if (title) {
          addId(example, `example-${number}`, title); // title gets used
        } else {
          // use the number as the title... so, e.g., "example-5"
          addId(example, "example", String(number));
        }
        const { id } = example;
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
        const div = html$1`<div class="example" id="${id}">
        ${exampleTitle} ${example.cloneNode(true)}
      </div>`;
        if (title) {
          addId(div, `example-${number}`, title);
        }
        addId(div, `example`, String(number));
        const selfLink = div.querySelector("a.self-link");
        selfLink.href = `#${div.id}`;
        example.replaceWith(div);
        if (!inAside) pub("example", report);
      }
    });
  }

  var examples = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$p,
    run: run$l
  });

  // @ts-check

  const name$q = "ims/issues-notes";

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
  async function run$m(conf) {
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
    name: name$q,
    run: run$m
  });

  // @ts-check

  const name$r = "core/best-practices";

  const localizationStrings$4 = {
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
  const l10n$6 = getIntlData(localizationStrings$4);
  const lang$1 = lang in localizationStrings$4 ? lang : "en";

  function run$n() {
    /** @type {NodeListOf<HTMLElement>} */
    const bps = document.querySelectorAll(".practicelab");
    const bpSummary = document.getElementById("bp-summary");
    const summaryItems = bpSummary ? document.createElement("ul") : null;
    [...bps].forEach((bp, num) => {
      const id = addId(bp, "bp");
      const localizedBpName = html$1`<a class="marker self-link" href="${`#${id}`}"
      ><bdi lang="${lang$1}">${l10n$6.best_practice}${num + 1}</bdi></a
    >`;

      // Make the summary items, if we have a summary
      if (summaryItems) {
        const li = html$1`
        <li>
          ${localizedBpName}: ${makeSafeCopy(bp)}
        </li>
      `;
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
      const title = html$1`${localizedBpName.cloneNode(true)}: ${bp}`;
      container.prepend(...title.childNodes);
    });
    if (bps.length) {
      if (bpSummary) {
        bpSummary.appendChild(html$1`<h2>Best Practices Summary</h2>`);
        bpSummary.appendChild(summaryItems);
      }
    } else if (bpSummary) {
      pub(
        "warn",
        "Using best practices summary (#bp-summary) but no best practices found."
      );
      bpSummary.remove();
    }
  }

  var bestPractices = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$r,
    run: run$n
  });

  // @ts-check

  const name$s = "core/figures";

  const localizationStrings$5 = {
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

  const l10n$7 = getIntlData(localizationStrings$5);

  function run$o() {
    normalizeImages(document);

    const tof = collectFigures();

    // Create a Table of Figures if a section with id 'tof' exists.
    const tofElement = document.getElementById("tof");
    if (tof.length && tofElement) {
      decorateTableOfFigures(tofElement);
      tofElement.append(
        html$1`<h2>${l10n$7.list_of_figures}</h2>`,
        html$1`<ul class="tof">
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
        showInlineWarning(fig, "Found a `<figure>` without a `<figcaption>`");
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
    wrapInner(caption, html$1`<span class="fig-title"></span>`);
    caption.prepend(l10n$7.fig, html$1`<bdi class="figno">${i + 1}</bdi>`, " ");
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
    return html$1`<li class="tofline">
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
    name: name$s,
    run: run$o
  });

  // @ts-check

  const topLevelEntities = new Set([
    "callback interface",
    "callback",
    "dictionary",
    "enum",
    "interface mixin",
    "interface",
    "typedef",
  ]);

  /**
   * This function looks for a <dfn> element whose title is 'name' and
   * that is "for" 'parent', which is the empty string when 'name'
   * refers to a top-level entity. For top-level entities, <dfn>
   * elements that inherit a non-empty [dfn-for] attribute are also
   * counted as matching.
   *
   * When a matching <dfn> is found, it's given <code> formatting,
   * marked as an IDL definition, and returned. If no <dfn> is found,
   * the function returns 'undefined'.
   * @param {*} defn
   * @param {string} name
   */
  function findDfn(defn, name, { parent = "" } = {}) {
    switch (defn.type) {
      case "constructor":
      case "operation":
        return findOperationDfn(defn, parent, name);
      default:
        return findNormalDfn(defn, parent, name);
    }
  }

  /**
   * @param {string} type
   * @param {string} parent
   * @param {string} name
   */
  function getAlternativeNames(idlAst, parent, name) {
    const { type } = idlAst;
    const asQualifiedName = `${parent}.${name}`;
    switch (type) {
      case "constructor":
      case "operation": {
        // Allow linking to "method()", method(arg) and "method" name.
        const asMethodName = `${name}()`;
        const asFullyQualifiedName = `${asQualifiedName}()`;
        const asMethodWithArgs = generateMethodNamesWithArgs(
          name,
          idlAst.arguments
        );
        return {
          local: [asQualifiedName, asFullyQualifiedName, name],
          exportable: [asMethodName, ...asMethodWithArgs],
        };
      }
      case "attribute":
        return {
          local: [asQualifiedName],
          exportable: [name],
        };
    }
  }

  /**
   * Generates all possible permutations of a method name based
   * on what arguments they method accepts.

   * Required arguments are always present, and optional ones
   * are stacked one by one.
   *
   * For examples: foo(req1, req2), foo(req1, req2, opt1) and so on.
   *
   * @param {String} operationName
   * @param {*} argsAst
   */
  function generateMethodNamesWithArgs(operationName, argsAst) {
    const operationNames = [];
    if (argsAst.length === 0) {
      return operationNames;
    }
    const required = []; // required arguments
    const optional = []; // optional arguments, including variadic ones
    for (const { name, optional: isOptional, variadic } of argsAst) {
      if (isOptional || variadic) {
        optional.push(name);
      } else {
        required.push(name);
      }
    }
    const requiredArgs = required.join(", ");
    const requiredOperation = `${operationName}(${requiredArgs})`;
    operationNames.push(requiredOperation);
    const optionalOps = optional.map((_, index) => {
      const optionalArgs = optional.slice(0, index + 1).join(", ");
      const result = `${operationName}(${requiredArgs}${
      optionalArgs ? `, ${optionalArgs}` : ""
    })`;
      return result;
    });
    operationNames.push(...optionalOps);
    return operationNames;
  }

  /**
   * @param {*} defn
   * @param {string} parent
   * @param {string} name
   */
  function findOperationDfn(defn, parent, name) {
    // Overloads all have unique names
    if (name.includes("!overload")) {
      return findNormalDfn(defn, parent, name);
    }
    const asMethodName = `${name}()`;
    return findNormalDfn(defn, parent, asMethodName, name);
  }

  /**
   * @param {HTMLElement} dfn
   * @param {Record<"local" | "exportable", string[]>} names
   */
  function addAlternativeNames(dfn, names) {
    const { local, exportable } = names;
    const lt = dfn.dataset.lt ? new Set(dfn.dataset.lt.split("|")) : new Set();
    for (const item of exportable) {
      lt.add(item);
    }
    // Fix any ill-placed ones - local ones don't belong here
    local.filter(item => lt.has(item)).forEach(item => lt.delete(item));
    dfn.dataset.lt = [...lt].join("|");
    dfn.dataset.localLt = local.join("|");
    registerDefinition(dfn, [...local, ...exportable]);
  }

  /**
   * @param {*} defn
   * @param {string} parent
   * @param {...string} names
   */
  function findNormalDfn(defn, parent, ...names) {
    const { type } = defn;
    for (const name of names) {
      let resolvedName =
        type === "enum-value" && name === "" ? "the-empty-string" : name;
      let dfns = getDfns(resolvedName, parent, name, type);
      // If we haven't found any definitions with explicit [for]
      // and [title], look for a dotted definition, "parent.name".
      if (dfns.length === 0 && parent !== "") {
        resolvedName = `${parent}.${resolvedName}`;
        const alternativeDfns = definitionMap.get(resolvedName);
        if (alternativeDfns && alternativeDfns.size === 1) {
          dfns = [...alternativeDfns];
          registerDefinition(dfns[0], [resolvedName]);
        }
      } else {
        resolvedName = name;
      }
      if (dfns.length > 1) {
        const msg = `WebIDL identifier \`${name}\` ${
        parent ? `for \`${parent}\`` : ""
      } is defined multiple times`;
        showInlineError(dfns, msg, "Duplicate definition.");
      }
      if (dfns.length) {
        return dfns[0];
      }
    }
  }

  /**
   * @param {HTMLElement} dfnElem
   * @param {*} idlAst
   * @param {string} parent
   * @param {string} name
   */
  function decorateDfn(dfnElem, idlAst, parent, name) {
    if (!dfnElem.id) {
      const lCaseParent = parent.toLowerCase();
      const middle = lCaseParent ? `${lCaseParent}-` : "";
      let last = name.toLowerCase().replace(/[()]/g, "").replace(/\s/g, "-");
      if (last === "") last = "the-empty-string";
      dfnElem.id = `dom-${middle}${last}`;
    }
    dfnElem.dataset.idl = idlAst.type;
    dfnElem.dataset.title = dfnElem.textContent;
    dfnElem.dataset.dfnFor = parent;
    // Derive the data-type for dictionary members, interface attributes,
    // and methods
    switch (idlAst.type) {
      case "operation":
      case "attribute":
      case "field":
        dfnElem.dataset.type = getDataType(idlAst);
        break;
    }

    // Mark the definition as code.
    if (
      !dfnElem.querySelector("code") &&
      !dfnElem.closest("code") &&
      dfnElem.children
    ) {
      wrapInner(dfnElem, dfnElem.ownerDocument.createElement("code"));
    }

    // Add data-lt and data-local-lt values and register them
    switch (idlAst.type) {
      case "attribute":
      case "constructor":
      case "operation":
        addAlternativeNames(dfnElem, getAlternativeNames(idlAst, parent, name));
        break;
    }

    return dfnElem;
  }

  /**
   * @param {string} name
   * @param {string} parent data-dfn-for
   * @param {string} originalName
   * @param {string} type
   */
  function getDfns(name, parent, originalName, type) {
    const foundDfns = definitionMap.get(name);
    if (!foundDfns || foundDfns.size === 0) {
      return [];
    }
    const dfnForArray = [...foundDfns];
    // Definitions that have a name and [data-dfn-for] that exactly match the
    // IDL entity:
    const dfns = dfnForArray.filter(dfn => {
      // This is explicitly marked as a concept, so we can't use it
      if (dfn.dataset.dfnType === "dfn") return false;

      /** @type {HTMLElement} */
      const closestDfnFor = dfn.closest(`[data-dfn-for]`);
      return closestDfnFor && closestDfnFor.dataset.dfnFor === parent;
    });

    if (dfns.length === 0 && parent === "" && dfnForArray.length === 1) {
      // Make sure the name exactly matches
      return dfnForArray[0].textContent === originalName ? dfnForArray : [];
    } else if (topLevelEntities.has(type) && dfnForArray.length) {
      const dfn = dfnForArray.find(
        dfn => dfn.textContent.trim() === originalName
      );
      if (dfn) return [dfn];
    }
    return dfns;
  }

  /**
   * @return {string}
   */
  function getDataType(idlStruct) {
    const { idlType, generic, union } = idlStruct;
    if (typeof idlType === "string") return idlType;
    if (generic) return generic;
    // join on "|" handles for "unsigned short" etc.
    if (union) return idlType.map(getDataType).join("|");
    return getDataType(idlType);
  }

  // @ts-check
  /**
   * Module core/webidl-clipboard
   *
   * This module adds a button to each IDL pre making it possible to copy
   * well-formatted IDL to the clipboard.
   *
   */
  const name$t = "core/webidl-clipboard";

  function createButton() {
    const copyButton = document.createElement("button");
    copyButton.innerHTML =
      '<svg height="16" viewBox="0 0 14 16" width="14"><path fill-rule="evenodd" d="M2 13h4v1H2v-1zm5-6H2v1h5V7zm2 3V8l-3 3 3 3v-2h5v-2H9zM4.5 9H2v1h2.5V9zM2 12h2.5v-1H2v1zm9 1h1v2c-.02.28-.11.52-.3.7-.19.18-.42.28-.7.3H1c-.55 0-1-.45-1-1V4c0-.55.45-1 1-1h3c0-1.11.89-2 2-2 1.11 0 2 .89 2 2h3c.55 0 1 .45 1 1v5h-1V6H1v9h10v-2zM2 5h8c0-.55-.45-1-1-1H8c-.55 0-1-.45-1-1s-.45-1-1-1-1 .45-1 1-.45 1-1 1H3c-.55 0-1 .45-1 1z"/></svg>';
    copyButton.title = "Copy IDL to clipboard";
    copyButton.classList.add("respec-button-copy-paste", "removeOnSave");
    return copyButton;
  }

  const copyButton = createButton();

  /**
   * Adds a HTML button that copies WebIDL to the clipboard.
   *
   * @param {HTMLSpanElement} idlHeader
   */
  function addCopyIDLButton(idlHeader) {
    // There may be multiple <span>s of IDL, so we take everything
    // apart from the idl header.
    const pre = idlHeader.closest("pre.idl");
    const idl = pre.cloneNode(true);
    idl.querySelector(".idlHeader").remove();
    const { textContent: idlText } = idl;
    const button = copyButton.cloneNode(true);
    button.addEventListener("click", () => {
      navigator.clipboard.writeText(idlText);
    });
    idlHeader.append(button);
  }

  var webidlClipboard = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$t,
    addCopyIDLButton: addCopyIDLButton
  });

  // Module core/webidl

  const name$u = "core/webidl";

  const operationNames = {};
  const idlPartials = {};

  const templates$1 = {
    wrap(items) {
      return items
        .flat()
        .filter(x => x !== "")
        .map(x => (typeof x === "string" ? new Text(x) : x));
    },
    trivia(t) {
      if (!t.trim()) {
        return t;
      }
      return html$1`<span class="idlSectionComment">${t}</span>`;
    },
    generic(keyword) {
      // Shepherd classifies "interfaces" as starting with capital letters,
      // like Promise, FrozenArray, etc.
      return /^[A-Z]/.test(keyword)
        ? html$1`<a data-xref-type="interface" data-cite="WebIDL">${keyword}</a>`
        : // Other keywords like sequence, maplike, etc...
          html$1`<a data-xref-type="dfn" data-cite="WebIDL">${keyword}</a>`;
    },
    reference(wrapped, unescaped, context) {
      if (context.type === "extended-attribute" && context.name !== "Exposed") {
        return wrapped;
      }
      let type = "_IDL_";
      let cite = null;
      let lt;
      switch (unescaped) {
        case "Window":
          type = "interface";
          cite = "HTML";
          break;
        case "object":
          type = "interface";
          cite = "WebIDL";
          break;
        default: {
          const isWorkerType = unescaped.includes("Worker");
          if (isWorkerType && context.type === "extended-attribute") {
            lt = `${unescaped}GlobalScope`;
            type = "interface";
            cite = ["Worker", "DedicatedWorker", "SharedWorker"].includes(
              unescaped
            )
              ? "HTML"
              : null;
          }
        }
      }
      return html$1`<a data-xref-type="${type}" data-cite="${cite}" data-lt="${lt}"
      >${wrapped}</a
    >`;
    },
    name(escaped, { data, parent }) {
      if (data.idlType && data.idlType.type === "argument-type") {
        return html$1`<span class="idlParamName">${escaped}</span>`;
      }
      const idlLink = defineIdlName(escaped, data, parent);
      if (data.type !== "enum-value") {
        const className = parent ? "idlName" : "idlID";
        idlLink.classList.add(className);
      }
      return idlLink;
    },
    nameless(escaped, { data, parent }) {
      switch (data.type) {
        case "constructor":
          return defineIdlName(escaped, data, parent);
        default:
          return escaped;
      }
    },
    type(contents) {
      return html$1`<span class="idlType">${contents}</span>`;
    },
    inheritance(contents) {
      return html$1`<span class="idlSuperclass">${contents}</span>`;
    },
    definition(contents, { data, parent }) {
      const className = getIdlDefinitionClassName(data);
      switch (data.type) {
        case "includes":
        case "enum-value":
          return html$1`<span class="${className}">${contents}</span>`;
      }
      const parentName = parent ? parent.name : "";
      const { name, idlId } = getNameAndId(data, parentName);
      return html$1`<span
      class="${className}"
      id="${idlId}"
      data-idl
      data-title="${name}"
      >${contents}</span
    >`;
    },
    extendedAttribute(contents) {
      const result = html$1`<span class="extAttr">${contents}</span>`;
      return result;
    },
    extendedAttributeReference(name) {
      return html$1`<a data-xref-type="extended-attribute">${name}</a>`;
    },
  };

  /**
   * Returns a link to existing <dfn> or creates one if doesn’t exists.
   */
  function defineIdlName(escaped, data, parent) {
    const parentName = parent ? parent.name : "";
    const { name } = getNameAndId(data, parentName);
    const dfn = findDfn(data, name, {
      parent: parentName,
    });
    const linkType = getDfnType(data.type);
    if (dfn) {
      if (!data.partial) {
        dfn.dataset.export = "";
        dfn.dataset.dfnType = linkType;
      }
      decorateDfn(dfn, data, parentName, name);
      const href = `#${dfn.id}`;
      return html$1`<a
      data-link-for="${parentName}"
      data-link-type="${linkType}"
      href="${href}"
      class="internalDFN"
      ><code>${escaped}</code></a
    >`;
    }

    const isDefaultJSON =
      data.type === "operation" &&
      data.name === "toJSON" &&
      data.extAttrs.some(({ name }) => name === "Default");
    if (isDefaultJSON) {
      return html$1`<a data-link-type="dfn" data-lt="default toJSON steps"
      >${escaped}</a
    >`;
    }
    if (!data.partial) {
      const dfn = html$1`<dfn data-export data-dfn-type="${linkType}"
      >${escaped}</dfn
    >`;
      registerDefinition(dfn, [name]);
      decorateDfn(dfn, data, parentName, name);
      return dfn;
    }

    const unlinkedAnchor = html$1`<a
    data-idl="${data.partial ? "partial" : null}"
    data-link-type="${linkType}"
    data-title="${data.name}"
    data-xref-type="${linkType}"
    >${escaped}</a
  >`;

    const showWarnings =
      name && data.type !== "typedef" && !(data.partial && !dfn);
    if (showWarnings) {
      const styledName = data.type === "operation" ? `${name}()` : name;
      const ofParent = parentName ? ` \`${parentName}\`'s` : "";
      const msg = `Missing \`<dfn>\` for${ofParent} \`${styledName}\` ${data.type}. [More info](https://github.com/w3c/respec/wiki/WebIDL-thing-is-not-defined).`;
      showInlineWarning(unlinkedAnchor, msg, "");
    }
    return unlinkedAnchor;
  }

  /**
   * Map to Shepherd types, for export.
   * @see https://tabatkins.github.io/bikeshed/#dfn-types
   */
  function getDfnType(idlType) {
    switch (idlType) {
      case "operation":
        return "method";
      case "field":
        return "dict-member";
      case "callback interface":
      case "interface mixin":
        return "interface";
      default:
        return idlType;
    }
  }

  function getIdlDefinitionClassName(defn) {
    switch (defn.type) {
      case "callback interface":
        return "idlInterface";
      case "operation":
        return "idlMethod";
      case "field":
        return "idlMember";
      case "enum-value":
        return "idlEnumItem";
      case "callback function":
        return "idlCallback";
    }
    return `idl${defn.type[0].toUpperCase()}${defn.type.slice(1)}`;
  }

  const nameResolverMap = new WeakMap();
  function getNameAndId(defn, parent = "") {
    if (nameResolverMap.has(defn)) {
      return nameResolverMap.get(defn);
    }
    const result = resolveNameAndId(defn, parent);
    nameResolverMap.set(defn, result);
    return result;
  }

  function resolveNameAndId(defn, parent) {
    let name = getDefnName(defn);
    let idlId = getIdlId(name, parent);
    switch (defn.type) {
      // Top-level entities with linkable members.
      case "callback interface":
      case "dictionary":
      case "interface":
      case "interface mixin": {
        idlId += resolvePartial(defn);
        break;
      }
      case "constructor":
      case "operation": {
        const overload = resolveOverload(name, parent);
        if (overload) {
          name += overload;
          idlId += overload;
        } else if (defn.arguments.length) {
          idlId += defn.arguments
            .map(arg => `-${arg.name.toLowerCase()}`)
            .join("");
        }
        break;
      }
    }
    return { name, idlId };
  }

  function resolvePartial(defn) {
    if (!defn.partial) {
      return "";
    }
    if (!idlPartials[defn.name]) {
      idlPartials[defn.name] = 0;
    }
    idlPartials[defn.name] += 1;
    return `-partial-${idlPartials[defn.name]}`;
  }

  function resolveOverload(name, parentName) {
    const qualifiedName = `${parentName}.${name}`;
    const fullyQualifiedName = `${qualifiedName}()`;
    let overload;
    if (!operationNames[fullyQualifiedName]) {
      operationNames[fullyQualifiedName] = 0;
    }
    if (!operationNames[qualifiedName]) {
      operationNames[qualifiedName] = 0;
    } else {
      overload = `!overload-${operationNames[qualifiedName]}`;
    }
    operationNames[fullyQualifiedName] += 1;
    operationNames[qualifiedName] += 1;
    return overload || "";
  }

  function getIdlId(name, parentName) {
    if (!parentName) {
      return `idl-def-${name.toLowerCase()}`;
    }
    return `idl-def-${parentName.toLowerCase()}-${name.toLowerCase()}`;
  }

  function getDefnName(defn) {
    switch (defn.type) {
      case "enum-value":
        return defn.value;
      case "operation":
        return defn.name;
      default:
        return defn.name || defn.type;
    }
  }

  /**
   * @param {Element} idlElement
   * @param {number} index
   */
  function renderWebIDL(idlElement, index) {
    let parse;
    try {
      parse = webidl2.parse(idlElement.textContent, {
        sourceName: String(index),
      });
    } catch (e) {
      showInlineError(
        idlElement,
        `Failed to parse WebIDL: ${e.bareMessage}.`,
        e.bareMessage,
        { details: `<pre>${e.context}</pre>` }
      );
      // Skip this <pre> and move on to the next one.
      return [];
    }
    // we add "idl" as the canonical match, so both "webidl" and "idl" work
    idlElement.classList.add("def", "idl");
    const highlights = webidl2.write(parse, { templates: templates$1 });
    html$1.bind(idlElement)`${highlights}`;
    idlElement.querySelectorAll("[data-idl]").forEach(elem => {
      if (elem.dataset.dfnFor) {
        return;
      }
      const title = elem.dataset.title;
      // Select the nearest ancestor element that can contain members.
      const parent = elem.parentElement.closest("[data-idl][data-title]");
      if (parent) {
        elem.dataset.dfnFor = parent.dataset.title;
      }
      if (elem.localName === "dfn") {
        registerDefinition(elem, [title]);
      }
    });
    // cross reference
    const closestCite = idlElement.closest("[data-cite], body");
    const { dataset } = closestCite;
    if (!dataset.cite) dataset.cite = "WebIDL";
    // includes webidl in some form
    if (!/\bwebidl\b/i.test(dataset.cite)) {
      const cites = dataset.cite.trim().split(/\s+/);
      dataset.cite = ["WebIDL", ...cites].join(" ");
    }
    addIDLHeader(idlElement);
    return parse;
  }
  /**
   * Adds a "WebIDL" decorative header/permalink to a block of WebIDL.
   * @param {HTMLPreElement} pre
   */
  function addIDLHeader(pre) {
    addHashId(pre, "webidl");
    const header = html$1`<span class="idlHeader"
    ><a class="self-link" href="${`#${pre.id}`}">WebIDL</a></span
  >`;
    pre.prepend(header);
    addCopyIDLButton(header);
  }

  const cssPromise$1 = loadStyle$3();

  async function loadStyle$3() {
    try {
      return (await Promise.resolve().then(function () { return webidl$2; })).default;
    } catch {
      return fetchAsset("webidl.css");
    }
  }

  async function run$p() {
    const idls = document.querySelectorAll("pre.idl, pre.webidl");
    if (!idls.length) {
      return;
    }
    if (!document.querySelector(".idl:not(pre), .webidl:not(pre)")) {
      const link = document.querySelector("head link");
      if (link) {
        const style = document.createElement("style");
        style.textContent = await cssPromise$1;
        link.before(style);
      }
    }

    const astArray = [...idls].map(renderWebIDL);

    const validations = webidl2.validate(astArray);
    for (const validation of validations) {
      let details = `<pre>${validation.context}</pre>`;
      if (validation.autofix) {
        validation.autofix();
        const idlToFix = webidl2.write(astArray[validation.sourceName]);
        const escaped = xmlEscape(idlToFix);
        details += `Try fixing as:
      <pre>${escaped}</pre>`;
      }
      showInlineError(
        idls[validation.sourceName],
        `WebIDL validation error: ${validation.bareMessage}`,
        validation.bareMessage,
        { details }
      );
    }
    document.normalize();
  }

  var webidl = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$u,
    addIDLHeader: addIDLHeader,
    run: run$p
  });

  // @ts-check

  const name$v = "ims/biblio";

  /**
   * @param {*} conf
   */
  async function run$q(conf) {
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

  var biblio$2 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$v,
    run: run$q
  });

  // @ts-check
  const name$w = "core/data-cite";

  /**
   * An arbitrary constant value used as an alias to current spec's shortname. It
   * exists to simplify code as passing `conf.shortName` everywhere gets clumsy.
   */
  const THIS_SPEC = "__SPEC__";

  /**
   * @param {CiteDetails} citeDetails
   */
  async function getLinkProps(citeDetails) {
    const { key, frag, path } = citeDetails;
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
    if (path) {
      // See: https://github.com/w3c/respec/issues/1856#issuecomment-429579475
      const relPath = path.startsWith("/") ? `.${path}` : path;
      href = new URL(relPath, href).href;
    }
    if (frag) {
      href = new URL(frag, href).href;
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

    if (elem.localName === "a") {
      const anchor = /** @type {HTMLAnchorElement} */ (elem);
      if (anchor.textContent === "" && anchor.dataset.lt !== "the-empty-string") {
        anchor.textContent = title;
      }
      anchor.href = href;
      if (wrapInCiteEl) {
        const cite = document.createElement("cite");
        anchor.replaceWith(cite);
        cite.append(anchor);
      }
      return;
    }

    if (elem.localName === "dfn") {
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
        showInlineError(
          elem,
          "Exporting an linked external definition is not allowed. Please remove the `data-export` attribute",
          "Please remove the `data-export` attribute."
        );
        delete elem.dataset.export;
      }
      elem.dataset.noExport = "";
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
   *
   * @param {HTMLElement} elem
   * @return {CiteDetails};
   */
  function toCiteDetails(elem) {
    const { dataset } = elem;
    const { cite: rawKey, citeFrag, citePath } = dataset;
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
    const details = { key, isNormative, frag, path };
    return details;
  }

  async function run$r() {
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
        showInlineWarning(elem, `Couldn't find a match for "${originalKey}"`);
      }
    }

    sub("beforesave", cleanup);
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
      Object.assign(biblio, newEntries);
    }
  }

  /** @param {Document} doc */
  function cleanup(doc) {
    const attrToRemove = ["data-cite", "data-cite-frag", "data-cite-path"];
    const elems = doc.querySelectorAll("a[data-cite], dfn[data-cite]");
    elems.forEach(elem =>
      attrToRemove.forEach(attr => elem.removeAttribute(attr))
    );
  }

  var dataCite = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$w,
    THIS_SPEC: THIS_SPEC,
    toCiteDetails: toCiteDetails,
    run: run$r
  });

  // @ts-check

  const name$x = "core/link-to-dfn";

  /** @type {HTMLElement[]} */
  const possibleExternalLinks = [];

  const localizationStrings$6 = {
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
  const l10n$8 = getIntlData(localizationStrings$6);

  async function run$s(conf) {
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
        showInlineError(duplicates, l10n$8.duplicateMsg(key), l10n$8.duplicateTitle);
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
    const needsCode = shouldWrapByCode(anchor) || shouldWrapByCode(dfn, term);
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
        if (elem.querySelector("code")) {
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
      showInlineWarning(
        elem,
        `Found linkless \`<a>\` element with text "${elem.textContent}" but no matching \`<dfn>\``,
        "Linking error: not matching `<dfn>`"
      );
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
    const shortName = new RegExp(
      String.raw`\b${(conf.shortName || "").toLowerCase()}([^-])\b`,
      "i"
    );

    /** @type {NodeListOf<HTMLElement>} */
    const elems = document.querySelectorAll(
      "dfn[data-cite]:not([data-cite='']), a[data-cite]:not([data-cite=''])"
    );
    for (const elem of elems) {
      elem.dataset.cite = elem.dataset.cite.replace(shortName, `${THIS_SPEC}$1`);
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
    name: name$x,
    possibleExternalLinks: possibleExternalLinks,
    run: run$s
  });

  // @ts-check

  /**
   * @typedef {import('core/xref').RequestEntry} RequestEntry
   * @typedef {import('core/xref').Response} Response
   * @typedef {import('core/xref').SearchResultEntry} SearchResultEntry
   */

  const VERSION_CHECK_WAIT = 5 * 60 * 1000; // 5 min

  async function getIdbCache() {
    const db = await idb.openDB("xref", 1, {
      upgrade(db) {
        db.createObjectStore("xrefs");
      },
    });
    return new IDBKeyVal(db, "xrefs");
  }

  /**
   * @param {RequestEntry[]} uniqueQueryKeys
   * @returns {Promise<Map<string, SearchResultEntry[]>>}
   */
  async function resolveXrefCache(uniqueQueryKeys) {
    try {
      const cache = await getIdbCache();
      return await resolveFromCache(uniqueQueryKeys, cache);
    } catch (err) {
      console.error(err);
      return new Map();
    }
  }

  /**
   * @param {RequestEntry[]} keys
   * @param {IDBKeyVal} cache
   * @returns {Promise<Map<string, SearchResultEntry[]>>}
   */
  async function resolveFromCache(keys, cache) {
    const bustCache = await shouldBustCache(cache);
    if (bustCache) {
      await cache.clear();
      return new Map();
    }

    const cachedData = await cache.getMany(keys.map(key => key.id));
    return cachedData;
  }

  /**
   * Get last updated timestamp from server and bust cache based on that. This
   * way, we prevent dirty/erroneous/stale data being kept on a client (which is
   * possible if we use a `MAX_AGE` based caching strategy).
   * @param {IDBKeyVal} cache
   */
  async function shouldBustCache(cache) {
    const lastChecked = await cache.get("__LAST_VERSION_CHECK__");
    const now = Date.now();

    if (!lastChecked) {
      await cache.set("__LAST_VERSION_CHECK__", now);
      return false;
    }
    if (now - lastChecked < VERSION_CHECK_WAIT) {
      // avoid checking network for any data update if old cache "fresh"
      return false;
    }

    const url = new URL("meta/version", API_URL).href;
    const res = await fetch(url);
    if (!res.ok) return false;
    const lastUpdated = await res.text();
    await cache.set("__LAST_VERSION_CHECK__", now);
    return parseInt(lastUpdated, 10) > lastChecked;
  }

  /**
   * @param {Map<string, SearchResultEntry[]>} data
   */
  async function cacheXrefData(data) {
    try {
      const cache = await getIdbCache();
      // add data to cache
      await cache.addMany(data);
    } catch (e) {
      console.error(e);
    }
  }

  // @ts-check

  const name$y = "core/xref";

  const profiles = {
    "web-platform": ["HTML", "INFRA", "URL", "WEBIDL", "DOM", "FETCH"],
  };

  const API_URL = "https://respec.org/xref/";

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
  async function run$t(conf) {
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
      const id = await objectHash(entry);
      queryKeys.push({ ...entry, id });
    }

    const data = await getData(queryKeys, xref.url);
    addDataCiteToTerms(elems, queryKeys, data, conf);

    sub("beforesave", cleanup$1);
  }

  /**
   * Find additional references that need to be looked up externally.
   * Examples: a[data-cite="spec"], dfn[data-cite="spec"], dfn.externalDFN
   */
  function findExplicitExternalLinks() {
    /** @type {NodeListOf<HTMLElement>} */
    const links = document.querySelectorAll(
      "a[data-cite]:not([data-cite='']):not([data-cite*='#']), " +
        "dfn[data-cite]:not([data-cite='']):not([data-cite*='#'])"
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
      url: API_URL,
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
            const specs = (xref.specs || []).concat(profiles[profile]);
            Object.assign(config, { specs });
          } else {
            invalidProfileError(xref.profile);
          }
        }
        break;
      default:
        pub(
          "error",
          `Invalid value for \`xref\` configuration option. Received: "${xref}".`
        );
    }
    return config;

    function invalidProfileError(profile) {
      const supportedProfiles = Object.keys(profiles)
        .map(p => `"${p}"`)
        .join(", ");
      const msg =
        `Invalid profile "${profile}" in \`respecConfig.xref\`. ` +
        `Please use one of the supported profiles: ${supportedProfiles}.`;
      pub("error", msg);
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
      await cacheXrefData(fetchedResults);
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
    const url = new URL(uri, "https://example.org");
    const { pathname: citePath } = url;
    const citeFrag = url.hash.slice(1);
    const dataset = { cite, citePath, citeFrag, type };
    if (forContext) dataset.linkFor = forContext[0];
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

    const msg =
      `Adding an informative reference to "${term}" from "${cite}" ` +
      "in a normative section";
    const title = "Error: Informative reference in normative section";
    showInlineWarning(elem, msg, title);
  }

  /** @param {Errors} errors */
  function showErrors({ ambiguous, notFound }) {
    const getPrefilledFormURL = (term, query, specs = []) => {
      const url = new URL(API_URL);
      url.searchParams.set("term", term);
      if (query.for) url.searchParams.set("for", query.for);
      url.searchParams.set("types", query.types.join(","));
      if (specs.length) url.searchParams.set("specs", specs.join(","));
      return url;
    };

    const howToFix = howToCiteURL =>
      "[Learn more about this error](https://respec.org/docs/#error-term-not-found)" +
      ` or see [how to cite to resolve the error](${howToCiteURL})`;

    for (const { query, elems } of notFound.values()) {
      const specs = query.specs ? [...new Set(query.specs.flat())].sort() : [];
      const originalTerm = getTermFromElement(elems[0]);
      const formUrl = getPrefilledFormURL(originalTerm, query);
      const specsString = specs.map(spec => `\`${spec}\``).join(", ");
      const hint = howToFix(formUrl);
      const msg = `Couldn't match "**${originalTerm}**" to anything in the document or in any other document cited in this specification: ${specsString}. ${hint}`;
      showInlineError(elems, msg, "Error: No matching dfn found.");
    }

    for (const { query, elems, results } of ambiguous.values()) {
      const specs = [...new Set(results.map(entry => entry.shortname))].sort();
      const specsString = specs.map(s => `**${s}**`).join(", ");
      const originalTerm = getTermFromElement(elems[0]);
      const formUrl = getPrefilledFormURL(originalTerm, query, specs);
      const hint = howToFix(formUrl);
      const msg = `The term "**${originalTerm}**" is defined in ${specsString} in multiple ways, so it's ambiguous. ${hint}`;
      showInlineError(elems, msg, "Error: Linking an ambiguous dfn.");
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

  function cleanup$1(doc) {
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
    name: name$y,
    API_URL: API_URL,
    run: run$t,
    getTermFromElement: getTermFromElement
  });

  // @ts-check
  /**
   * Module: core/webidl-index
   * constructs a summary of WebIDL in the document by
   * cloning all the generated WebIDL nodes and
   * appending them to pre element.
   *
   * Usage
   * Add a <section id="idl-index"> to the document.
   * It also supports title elements to generate a header.
   * Or if a header element is an immediate child, then
   * that is preferred.
   */
  const name$z = "core/webidl-index";

  function run$u() {
    /** @type {HTMLElement | null} */
    const idlIndexSec = document.querySelector("section#idl-index");
    if (!idlIndexSec) {
      return;
    }
    // Query for decedents headings, e.g., "h2:first-child, etc.."
    const query = [2, 3, 4, 5, 6].map(level => `h${level}:first-child`).join(",");
    if (!idlIndexSec.querySelector(query)) {
      const header = document.createElement("h2");
      if (idlIndexSec.title) {
        header.textContent = idlIndexSec.title;
        idlIndexSec.removeAttribute("title");
      } else {
        header.textContent = "IDL Index";
      }
      idlIndexSec.prepend(header);
    }

    // filter out the IDL marked with class="exclude" and the IDL in non-normative sections
    const idlIndex = Array.from(
      document.querySelectorAll("pre.def.idl:not(.exclude)")
    ).filter(idl => !idl.closest(nonNormativeSelector));

    if (idlIndex.length === 0) {
      const text = "This specification doesn't declare any Web IDL.";
      idlIndexSec.append(text);
      return;
    }

    const pre = document.createElement("pre");
    pre.classList.add("idl", "def");
    pre.id = "actual-idl-index";
    idlIndex
      .map(elem => {
        const fragment = document.createDocumentFragment();
        for (const child of elem.children) {
          fragment.appendChild(child.cloneNode(true));
        }
        return fragment;
      })
      .forEach(elem => {
        if (pre.lastChild) {
          pre.append("\n\n");
        }
        pre.appendChild(elem);
      });
    // Remove duplicate IDs
    pre.querySelectorAll("*[id]").forEach(elem => elem.removeAttribute("id"));
    // Remove IDL headers
    pre.querySelectorAll(".idlHeader").forEach(elem => elem.remove());
    // Add our own IDL header
    idlIndexSec.appendChild(pre);
    addIDLHeader(pre);
  }

  var webidlIndex = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$z,
    run: run$u
  });

  // @ts-check

  const name$A = "core/dfn-index";

  const localizationStrings$7 = {
    en: {
      heading: "Index",
      headingExternal: "Terms defined by reference",
      headlingLocal: "Terms defined by this specification",
      dfnOf: "definition of",
    },
  };
  const l10n$9 = getIntlData(localizationStrings$7);

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

  async function run$v() {
    const index = document.querySelector("section#index");
    if (!index) {
      return;
    }

    const styleEl = document.createElement("style");
    styleEl.textContent = await loadStyle$4();
    document.head.appendChild(styleEl);

    index.classList.add("appendix");
    if (!index.querySelector("h2")) {
      index.prepend(html$1`<h2>${l10n$9.heading}</h2>`);
    }

    const localTermIndex = html$1`<section id="index-defined-here">
    <h3>${l10n$9.headlingLocal}</h3>
    ${createLocalTermIndex()}
  </section>`;
    index.append(localTermIndex);

    const externalTermIndex = html$1`<section id="index-defined-elsewhere">
    <h3>${l10n$9.headingExternal}</h3>
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

    sub("beforesave", cleanup$2);
  }

  function createLocalTermIndex() {
    const dataSortedByTerm = collectLocalTerms();
    return html$1`<ul class="index">
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
      return html$1`<li data-id=${dfn.id}>
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
    return html$1`<li>
    ${term}
    <ul>
      ${dfns.map(dfn => {
        const type = getLocalTermType(dfn);
        const text = getLocalTermSuffix(dfn, type, term) || l10n$9.dfnOf;
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
      return html$1`<span class="print-only">${secNum}</span>`;
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
    return html$1`<ul class="index">
    ${dataSortedBySpec.map(
      ([spec, entries]) => html$1`<li data-spec="${spec}">
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
    const el = html$1`<li>
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
    "void",
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

  async function loadStyle$4() {
    try {
      return (await Promise.resolve().then(function () { return dfnIndex$2; })).default;
    } catch {
      return fetchAsset("dfn-index.css");
    }
  }

  /** @param {Document} doc */
  function cleanup$2(doc) {
    doc
      .querySelectorAll("#index-defined-elsewhere li[data-spec]")
      .forEach(el => el.removeAttribute("data-spec"));

    doc
      .querySelectorAll("#index-defined-here li[data-id]")
      .forEach(el => el.removeAttribute("data-id"));
  }

  var dfnIndex = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$A,
    run: run$v
  });

  // @ts-check

  const name$B = "ims/contrib";

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
    name: name$B,
    run: run$w
  });

  // @ts-check

  const name$C = "core/fix-headers";

  function run$x() {
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
    name: name$C,
    run: run$x
  });

  // @ts-check

  const lowerHeaderTags = ["h2", "h3", "h4", "h5", "h6"];
  const headerTags = ["h1", ...lowerHeaderTags];

  const name$D = "core/structure";

  const localizationStrings$8 = {
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

  const l10n$a = getIntlData(localizationStrings$8);

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
    const ol = html$1`<ol class="toc"></ol>`;
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
        section.header.prepend(html$1`<bdi class="secno">${secno} </bdi>`);
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
  function getSectionTree(parent, { tocIntroductory = false } = {}) {
    /** @type {NodeListOf<HTMLElement>} */
    const sectionElements = tocIntroductory
      ? parent.querySelectorAll(":scope > section")
      : parent.querySelectorAll(":scope > section:not(.introductory)");
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
        isIntro: section.classList.contains("introductory"),
        isAppendix: section.classList.contains("appendix"),
        subsections: getSectionTree(section, { tocIntroductory }),
      });
    }
    return sections;
  }

  /**
   * @param {Element} header
   * @param {string} id
   */
  function createTocListItem(header, id) {
    const anchor = html$1`<a href="${`#${id}`}" class="tocxref" />`;
    anchor.append(...header.cloneNode(true).childNodes);
    filterHeader(anchor);
    return html$1`<li class="tocline">${anchor}</li>`;
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

  function run$y(conf) {
    if ("tocIntroductory" in conf === false) {
      conf.tocIntroductory = false;
    }
    if ("maxTocLevel" in conf === false) {
      conf.maxTocLevel = Infinity;
    }

    renameSectionHeaders();

    // makeTOC
    if (!conf.noTOC) {
      skipFromToC();
      const sectionTree = getSectionTree(document.body, {
        tocIntroductory: conf.tocIntroductory,
      });
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
    const headerSelector = headerTags
      .map(h => `section:not(.introductory) ${h}:first-child`)
      .join(",");
    return [...document.querySelectorAll(headerSelector)].filter(
      elem => !elem.closest("section.introductory")
    );
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
        showInlineError(section, msg, msg);
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
    const nav = html$1`<nav id="toc"></nav>`;
    const h2 = html$1`<h2 class="introductory">${l10n$a.toc}</h2>`;
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

    const link = html$1`<p role="navigation" id="back-to-top">
    <a href="#title"><abbr title="Back to Top">&uarr;</abbr></a>
  </p>`;
    document.body.append(link);
  }

  var structure$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$D,
    run: run$y
  });

  // @ts-check

  const name$E = "core/informative";

  const localizationStrings$9 = {
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

  const l10n$b = getIntlData(localizationStrings$9);

  function run$z() {
    Array.from(document.querySelectorAll("section.informative"))
      .map(informative => informative.querySelector("h2, h3, h4, h5, h6"))
      .filter(heading => heading)
      .forEach(heading => {
        heading.after(html$1`<p><em>${l10n$b.informative}</em></p>`);
      });
  }

  var informative = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$E,
    run: run$z
  });

  // @ts-check

  const name$F = "core/caniuse";

  const API_URL$1 = "https://respec.org/caniuse/";

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

  if (
    !document.querySelector("link[rel='preconnect'][href='https://respec.org']")
  ) {
    const link = createResourceHint({
      hint: "preconnect",
      href: "https://respec.org",
    });
    document.head.appendChild(link);
  }

  const caniuseCssPromise = loadStyle$5();

  async function loadStyle$5() {
    try {
      return (await Promise.resolve().then(function () { return caniuse$2; })).default;
    } catch {
      return fetchAsset("caniuse.css");
    }
  }

  async function run$A(conf) {
    if (!conf.caniuse) {
      return; // nothing to do.
    }
    const options = getNormalizedConf(conf);
    conf.caniuse = options; // for tests
    if (!options.feature) {
      return; // no feature to show
    }
    const featureURL = new URL(options.feature, "https://caniuse.com/").href;

    const caniuseCss = await caniuseCssPromise;
    document.head.appendChild(html$1`<style class="removeOnSave">
    ${caniuseCss}
  </style>`);

    const headDlElem = document.querySelector(".head dl");
    const contentPromise = (async () => {
      try {
        const apiUrl = options.apiURL || API_URL$1;
        const stats = await fetchStats(apiUrl, options);
        return html$1`${{ html: stats }}`;
      } catch (err) {
        console.error(err);
        const msg =
          `Couldn't find feature "${options.feature}" on caniuse.com? ` +
          "Please check the feature key on [caniuse.com](https://caniuse.com)";
        pub("error", msg);
        return html$1`<a href="${featureURL}">caniuse.com</a>`;
      }
    })();
    const definitionPair = html$1`<dt class="caniuse-title">Browser support:</dt>
    <dd class="caniuse-stats">
      ${{
        any: contentPromise,
        placeholder: "Fetching data from caniuse.com...",
      }}
    </dd>`;
    headDlElem.append(...definitionPair.childNodes);
    await contentPromise;

    // remove from export
    pub("amend-user-config", { caniuse: options.feature });
    sub("beforesave", outputDoc => {
      html$1.bind(outputDoc.querySelector(".caniuse-stats"))`
      <a href="${featureURL}">caniuse.com</a>`;
    });
  }

  /**
   * returns normalized `conf.caniuse` configuration
   * @param {Object} conf   configuration settings
   */
  function getNormalizedConf(conf) {
    const DEFAULTS = { versions: 4 };
    if (typeof conf.caniuse === "string") {
      return { feature: conf.caniuse, ...DEFAULTS };
    }
    const caniuseConf = { ...DEFAULTS, ...conf.caniuse };
    const { browsers } = caniuseConf;
    if (Array.isArray(browsers)) {
      const invalidBrowsers = browsers.filter(browser => !BROWSERS.has(browser));
      if (invalidBrowsers.length) {
        const names = invalidBrowsers.map(b => `"\`${b}\`"`).join(", ");
        pub(
          "warn",
          `Ignoring invalid browser(s): ${names} in ` +
            "[`respecConfig.caniuse.browsers`](https://github.com/w3c/respec/wiki/caniuse)"
        );
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
    name: name$F,
    run: run$A
  });

  // @ts-check

  const name$G = "core/mdn-annotation";

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

  const localizationStrings$a = {
    en: {
      inAllEngines: "This feature is in all major engines.",
      inSomeEngines: "This feature has limited support.",
    },
    zh: {
      inAllEngines: "所有主要引擎均支持此特性。",
      inSomeEngines: "此功能支持有限。",
    },
  };
  const l10n$c = getIntlData(localizationStrings$a);

  async function loadStyle$6() {
    try {
      return (await Promise.resolve().then(function () { return mdnAnnotation$2; })).default;
    } catch {
      return fetchAsset("mdn-annotation.css");
    }
  }

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
    const mdnBox = html$1`<aside class="mdn"></aside>`;
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
    return html$1`<details>
    <summary aria-label="${label}"><span>MDN</span>${engineSupport}</summary>
    <a title="${summary}" href="${href}">${mdnSubPath}</a>
    ${getEngineSupport(engines)}
    ${support
      ? buildBrowserSupportTable(support)
      : html$1`<p class="nosupportdata">No support data.</p>`}
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
      return html$1`<tr class="${classList}">
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

    return html$1`<table>
    ${Object.keys(MDN_BROWSERS).map(browserId => {
      return support[browserId]
        ? createRowFromBrowserData(browserId, support[browserId])
        : createRow(browserId, "Unknown", "");
    })}
  </table>`;
  }

  async function run$B(conf) {
    const mdnKey = getMdnKey(conf);
    if (!mdnKey) return;

    const mdnSpecJson = await getMdnData(mdnKey, conf.mdn);
    if (!mdnSpecJson) return;

    const style = document.createElement("style");
    style.textContent = await loadStyle$6();
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
    const {
      baseJsonPath = BASE_JSON_PATH,
      maxAge = 60 * 60 * 24 * 1000,
    } = mdnConf;
    const url = new URL(`${key}.json`, baseJsonPath).href;
    const res = await fetchAndCache(url, maxAge);
    if (res.status === 404) {
      const msg = `Could not find MDN data associated with key "${key}".`;
      const hint = "Please add a valid key to `respecConfig.mdn`";
      pub("error", `${msg} ${hint}`);
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
      return html$1`<span title="${l10n$c.inAllEngines}">✅</span>`;
    }
    if (engines.length < 2) {
      return html$1`<span title="${l10n$c.inSomeEngines}">🚫</span>`;
    }
    return html$1`<span>&emsp;</span>`;
  }

  /**
   * @param {MdnEntry['engines']} engines
   * @returns {HTMLParagraphElement|undefined}
   */
  function getEngineSupport(engines) {
    if (engines.length === 3) {
      return html$1`<p class="engines-all">${l10n$c.inAllEngines}</p>`;
    }
    if (engines.length < 2) {
      return html$1`<p class="engines-some">${l10n$c.inSomeEngines}</p>`;
    }
  }

  var mdnAnnotation = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$G,
    run: run$B
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
  function rsDocToDataURL(mimeType, doc = document) {
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
    cleanup$3(cloneDoc);
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

  function cleanup$3(cloneDoc) {
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
      metaCharset = html$1`<meta charset="utf-8" />`;
    }
    insertions.appendChild(metaCharset);

    // Add meta generator
    const respecVersion = `ReSpec ${window.respecVersion || "Developer Channel"}`;
    const metaGenerator = html$1`
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

  expose("ims/exporter", { rsDocToDataURL });

  // @ts-check

  const name$H = "ui/save-html";

  const localizationStrings$b = {
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
  const l10n$d = getIntlData(localizationStrings$b);

  const downloadLinks = [
    {
      id: "respec-save-as-html",
      fileName: "index.html",
      title: "HTML",
      type: "text/html",
      get href() {
        return rsDocToDataURL(this.type);
      },
    },
    {
      id: "respec-save-as-xml",
      fileName: "index.xhtml",
      title: "XML",
      type: "application/xml",
      get href() {
        return rsDocToDataURL(this.type);
      },
    },
    {
      id: "respec-save-as-epub",
      fileName: "spec.epub",
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
      fileName: "body.html",
      title: "CMS EXTRACT",
      type: "application/cms",
      get href() {
        return rsDocToDataURL(this.type);
      },
    },
  ];

  function toDownloadLink(details) {
    const { id, href, fileName, title, type } = details;
    return html$1`<a
    href="${href}"
    id="${id}"
    download="${fileName}"
    type="${type}"
    class="respec-save-button"
    onclick=${() => ui.closeModal()}
    >${title}</a
  >`;
  }

  const saveDialog = {
    async show(button) {
      await document.respecIsReady;
      const div = html$1`<div class="respec-save-buttons">
      ${downloadLinks.map(toDownloadLink)}
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

  /**
   * @param {*} _
   * @param {string} mimeType
   */
  function exportDocument(_, mimeType) {
    const msg =
      "Exporting via ui/save-html module's `exportDocument()` is deprecated and will be removed. " +
      "Use core/exporter `rsDocToDataURL()` instead.";
    pub("warn", msg);
    console.warn(msg);
    return rsDocToDataURL(mimeType);
  }

  var saveHtml = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$H,
    exportDocument: exportDocument
  });

  // @ts-check

  const localizationStrings$c = {
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
  const l10n$e = getIntlData(localizationStrings$c);

  const button$1 = ui.addCommand(
    l10n$e.search_specref,
    show$1,
    "Ctrl+Shift+Alt+space",
    "🔎"
  );
  const specrefURL = "https://specref.herokuapp.com/";
  const refSearchURL = `${specrefURL}search-refs`;
  const reveseLookupURL = `${specrefURL}reverse-lookup`;
  const form = document.createElement("form");
  const renderer = html$1.bind(form);
  const resultList = html$1.bind(document.createElement("div"));

  form.id = "specref-ui";

  /**
   * @param {Map<string, string>} resultMap
   * @param {string} query
   * @param {number} timeTaken
   */
  function renderResults(resultMap, query, timeTaken) {
    if (!resultMap.size) {
      return resultList`
      <p class="state">
        Your search - <strong> ${query} </strong> -
        did not match any references.
      </p>
    `;
    }
    const wires = Array.from(resultMap)
      .slice(0, 99)
      .map(toDefinitionPair)
      .reduce((collector, pair) => collector.concat(pair), []);
    return resultList`
    <p class="result-stats">
      ${resultMap.size} results (${timeTaken} seconds).
      ${resultMap.size > 99 ? "First 100 results." : ""}
    </p>
    <dl class="specref-results">${wires}</dl>
  `;
  }

  function toDefinitionPair([key, entry]) {
    return html$1.wire(entry)`
    <dt>
      [${key}]
    </dt>
    <dd>${wireReference(entry)}</dd>
  `;
  }

  function resultProcessor({ includeVersions = false } = {}) {
    return (...fetchedData) => {
      /** @type {{ [key: string]: any }} */
      const combinedResults = Object.assign({}, ...fetchedData);
      const results = new Map(Object.entries(combinedResults));
      // remove aliases
      Array.from(results)
        .filter(([, entry]) => entry.aliasOf)
        .map(([key]) => key)
        .reduce((results, key) => results.delete(key) && results, results);
      // Remove versions, if asked to
      if (!includeVersions) {
        Array.from(results.values())
          .filter(entry => typeof entry === "object" && "versions" in entry)
          .flat()
          .forEach(version => {
            results.delete(version);
          });
      }
      // Remove legacy string entries
      Array.from(results)
        .filter(([, value]) => typeof value !== "object")
        .forEach(([key]) => results.delete(key));
      return results;
    };
  }

  form.addEventListener("submit", async ev => {
    ev.preventDefault();
    const { searchBox } = form;
    const query = searchBox.value;
    if (!query) {
      searchBox.focus();
      return;
    }
    render({ state: "Searching Specref…" });
    const refSearch = new URL(refSearchURL);
    refSearch.searchParams.set("q", query);
    const reverseLookup = new URL(reveseLookupURL);
    reverseLookup.searchParams.set("urls", query);
    try {
      const startTime = performance.now();
      const jsonData = await Promise.all([
        fetch(refSearch).then(response => response.json()),
        fetch(reverseLookup).then(response => response.json()),
      ]);
      const { checked: includeVersions } = form.includeVersions;
      const processResults = resultProcessor({ includeVersions });
      const results = processResults(...jsonData);
      render({
        query,
        results,
        state: "",
        timeTaken: Math.round(performance.now() - startTime) / 1000,
      });
    } catch (err) {
      console.error(err);
      render({ state: "Error! Couldn't do search." });
    } finally {
      searchBox.focus();
    }
  });

  function show$1() {
    render();
    ui.freshModal(l10n$e.search_specref, form, button$1);
    /** @type {HTMLElement} */
    const input = form.querySelector("input[type=search]");
    input.focus();
  }

  const mast = html$1.wire()`
  <header>
    <p>
      An Open-Source, Community-Maintained Database of
      Web Standards & Related References.
    </p>
  </header>
  <div class="searchcomponent">
    <input
      name="searchBox"
      type="search"
      aria-label="Search"
      autocomplete="off"
      placeholder="Keywords, titles, authors, urls…">
    <button
      type="submit">
        Search
    </button>
    <label>
      <input type="checkbox" name="includeVersions"> Include all versions.
    </label>
  </div>
`;

  /**
   * @param {object} options
   * @param {string} [options.state]
   * @param {Map<string, string>} [options.results]
   * @param {number} [options.timeTaken]
   * @param {string} [options.query]
   */
  function render({ state = "", results, timeTaken, query } = {}) {
    if (!results) {
      renderer`<div>${mast}</div>`;
      return;
    }
    renderer`
    <div>${mast}</div>
    <p class="state" hidden="${!state}">
      ${state}
    </p>
    <section hidden="${!results}" aria-live="polite">${
    results ? renderResults(results, query, timeTaken) : []
  }</section>
  `;
  }

  var searchSpecref = /*#__PURE__*/Object.freeze({
    __proto__: null
  });

  // @ts-check

  const XREF_URL = "https://respec.org/xref/";

  const localizationStrings$d = {
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
  const lang$2 = lang in localizationStrings$d ? lang : "en";
  const l10n$f = localizationStrings$d[lang$2];

  const button$2 = ui.addCommand(l10n$f.title, show$2, "Ctrl+Shift+Alt+x", "📚");

  function show$2() {
    const onLoad = e => e.target.classList.add("ready");
    const xrefSearchUI = html$1`
    <iframe id="xref-ui" src="${XREF_URL}" onload=${onLoad}></iframe>
    <a href="${XREF_URL}" target="_blank">Open Search UI in a new tab</a>
  `;
    ui.freshModal(l10n$f.title, xrefSearchUI, button$2);
  }

  var searchXref = /*#__PURE__*/Object.freeze({
    __proto__: null
  });

  // @ts-check

  const localizationStrings$e = {
    en: {
      definition_list: "Definitions",
      list_of_definitions: "List of Definitions",
    },
    nl: {
      definition_list: "Lijst van Definities",
      list_of_definitions: "Lijst van Definities",
    },
    ja: {
      definition_list: "定義",
      list_of_definitions: "定義リスト",
    },
    de: {
      definition_list: "Definitionen",
      list_of_definitions: "Liste der Definitionen",
    },
    zh: {
      definition_list: "定义",
      list_of_definitions: "文档中的定义",
    },
  };
  const l10n$g = getIntlData(localizationStrings$e);

  const button$3 = ui.addCommand(
    l10n$g.definition_list,
    show$3,
    "Ctrl+Shift+Alt+D",
    "📔"
  );

  const ul = document.createElement("ul");
  ul.classList.add("respec-dfn-list");
  const render$1 = html$1.bind(ul);

  ul.addEventListener("click", ev => {
    if (ev.target instanceof HTMLElement && ev.target.matches("a")) {
      ui.closeModal();
      ev.stopPropagation();
    }
  });

  function show$3() {
    const definitionLinks = Array.from(definitionMap)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([, [dfn]]) => {
        return html$1.wire(dfn, ":li>a")`
        <li>
          <a href="${`#${dfn.id}`}">
            ${dfn.textContent}
          </a>
          ${labelDfnIfExported(dfn)} ${labelDfnIfUnused(dfn)}
        </li>
      `;
      });
    render$1`${definitionLinks}`;
    ui.freshModal(l10n$g.list_of_definitions, ul, button$3);
  }

  /**
   * If a definition is exported, label it accordingly
   * @param {HTMLElement} dfn a definition
   */
  function labelDfnIfExported(dfn) {
    const isExported = dfn.hasAttribute("data-export");
    if (isExported) {
      return html$1`<span class="dfn-status exported">exported</span>`;
    }
    return null;
  }

  /**
   * If a definition is unused, label it accordingly
   * @param {HTMLElement} dfn a definition
   */
  function labelDfnIfUnused(dfn) {
    // find an <a> that is not inside a `.dfn-panel` and references this <dfn>
    const isUsed = document.querySelector(
      `:not(.dfn-panel) > :not(li) > a[href^="#${dfn.id}"]`
    );
    if (!isUsed) {
      return html$1`<span class="dfn-status unused">unused</span>`;
    }
    return null;
  }

  var dfnList = /*#__PURE__*/Object.freeze({
    __proto__: null
  });

  // @ts-check

  const localizationStrings$f = {
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
  const l10n$h = getIntlData(localizationStrings$f);

  // window.respecVersion is added at build time (see tools/builder.js)
  window.respecVersion = window.respecVersion || "Developer Edition";
  const div = document.createElement("div");
  const render$2 = html$1.bind(div);
  const button$4 = ui.addCommand(
    `${l10n$h.about_respec} ${window.respecVersion}`,
    show$4,
    "Ctrl+Shift+Alt+A",
    "ℹ️"
  );

  function show$4() {
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
    render$2`
  <p>
    ReSpec is a document production toolchain, with a notable focus on W3C specifications.
  </p>
  <p>
    <a href='https://github.com/w3c/respec/wiki'>Documentation</a>,
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
    ui.freshModal(`${l10n$h.about_respec} - ${window.respecVersion}`, div, button$4);
  }

  function perfEntryToTR({ name, duration }) {
    const moduleURL = `https://github.com/w3c/respec/blob/develop/src/${name}.js`;
    return html$1`
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

  const name$I = "core/seo";

  function run$C() {
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

  var seo = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$I,
    run: run$C
  });

  // @ts-check
  const name$J = "ims/seo";

  /**
   * Add a canonical href
   *
   * @param {*} conf respecConfig
   *
   * Can be run before or after core/seo
   */
  async function run$D(conf) {
    const linkElem = document.createElement("link");
    linkElem.setAttribute("rel", "canonical");
    linkElem.setAttribute("href", conf.thisURL);
    document.head.appendChild(linkElem);
  }

  var seo$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$J,
    run: run$D
  });

  // @ts-check
  /**
   * Module core/worker
   *
   * Exports a Web Worker for ReSpec, allowing for
   * multi-threaded processing of things.
   */
  const name$K = "core/worker";
  // Opportunistically preload syntax highlighter
  const hint = {
    hint: "preload",
    href: "https://www.w3.org/Tools/respec/respec-highlight",
    as: "script",
  };
  const link$1 = createResourceHint(hint);
  document.head.appendChild(link$1);

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
    name$K,
    workerPromise.then(worker => ({ worker }))
  );

  // @ts-check
  const name$L = "core/highlight";

  const nextMsgId = msgIdGenerator("highlight");

  const ghCssPromise = loadStyle$7();

  async function loadStyle$7() {
    try {
      return (await Promise.resolve().then(function () { return highlight$2; })).default;
    } catch {
      return fetchAsset("highlight.css");
    }
  }

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

  async function run$E(conf) {
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
    const ghCss = await ghCssPromise;
    document.head.appendChild(
      html$1`<style>
      ${ghCss}
    </style>`
    );
    await Promise.all(promisesToHighlight);
  }

  var highlight = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$L,
    run: run$E
  });

  // @ts-check
  const localizationStrings$g = {
    en: {
      missing_test_suite_uri:
        "Found tests in your spec, but missing '" +
        "[`testSuiteURI`](https://github.com/w3c/respec/wiki/testSuiteURI)' in your ReSpec config.",
      tests: "tests",
      test: "test",
    },
    ja: {
      missing_test_suite_uri:
        "この仕様内にテストの項目を検出しましたが，ReSpec の設定に '" +
        "[`testSuiteURI`](https://github.com/w3c/respec/wiki/testSuiteURI)' が見つかりません．",
      tests: "テスト",
      test: "テスト",
    },
    de: {
      missing_test_suite_uri:
        "Die Spezifikation enthält Tests, aber in der ReSpec-Konfiguration ist keine '" +
        "[`testSuiteURI`](https://github.com/w3c/respec/wiki/testSuiteURI)' angegeben.",
      tests: "Tests",
      test: "Test",
    },
    zh: {
      missing_test_suite_uri:
        "本规范中包含测试，但在 ReSpec 配置中缺少 '" +
        "[`testSuiteURI`](https://github.com/w3c/respec/wiki/testSuiteURI)'。",
      tests: "测试",
      test: "测试",
    },
  };

  const l10n$i = getIntlData(localizationStrings$g);

  const name$M = "core/data-tests";

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

    const testList = html$1`
    <li>
      <a href="${href}">
        ${testFileName}
      </a>
      ${emojiList}
    </li>
  `;
    return testList;
  }

  function run$F(conf) {
    /** @type {NodeListOf<HTMLElement>} */
    const elems = document.querySelectorAll("[data-tests]");
    const testables = [...elems].filter(elem => elem.dataset.tests);

    if (!testables.length) {
      return;
    }
    if (!conf.testSuiteURI) {
      pub("error", l10n$i.missing_test_suite_uri);
      return;
    }

    for (const elem of testables) {
      const tests = elem.dataset.tests.split(/,/gm).map(url => url.trim());
      const testURLs = toTestURLs(tests, conf.testSuiteURI);
      handleDuplicates(testURLs, elem);
      const details = toHTML(testURLs);
      elem.append(details);
    }
  }

  /**
   * @param {string[]} tests
   * @param {string} testSuiteURI
   */
  function toTestURLs(tests, testSuiteURI) {
    return tests
      .map(test => {
        try {
          return new URL(test, testSuiteURI).href;
        } catch {
          pub("warn", `Bad URI: ${test}`);
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
      showInlineWarning(
        elem,
        `Duplicate tests found`,
        `To fix, remove duplicates from "data-tests": ${duplicates
        .map(url => new URL(url).pathname)
        .join(", ")}`
      );
    }
  }

  /**
   * @param {string[]} testURLs
   */
  function toHTML(testURLs) {
    const uniqueList = [...new Set(testURLs)];
    const details = html$1`
    <details class="respec-tests-details removeOnSave">
      <summary>
        tests: ${uniqueList.length}
      </summary>
      <ul>
        ${uniqueList.map(toListItem)}
      </ul>
    </details>
  `;
    return details;
  }

  var dataTests = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$M,
    run: run$F
  });

  // @ts-check
  const name$N = "core/list-sorter";

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

  function run$G() {
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
        default:
          pub("warning", `ReSpec can't sort ${elem.localName} elements.`);
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
    name: name$N,
    sortListItems: sortListItems,
    sortDefinitionTerms: sortDefinitionTerms,
    run: run$G
  });

  // @ts-check

  const name$O = "core/highlight-vars";

  const hlVarsPromise = loadStyle$8();

  async function loadStyle$8() {
    try {
      return (await Promise.resolve().then(function () { return _var$1; })).default;
    } catch {
      return fetchAsset("var.css");
    }
  }

  async function run$H(conf) {
    if (!conf.highlightVars) {
      return;
    }
    const styleElement = document.createElement("style");
    styleElement.textContent = await hlVarsPromise;
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
    name: name$O,
    run: run$H
  });

  // @ts-check

  const name$P = "core/dfn-panel";

  async function run$I() {
    const css = await loadStyle$9();
    document.head.insertBefore(
      html$1`<style>
      ${css}
    </style>`,
      document.querySelector("link")
    );

    /** @type {NodeListOf<HTMLElement>} */
    const elems = document.querySelectorAll(
      "dfn[id], #index-defined-elsewhere .index-term"
    );
    const panels = document.createDocumentFragment();
    for (const el of elems) {
      panels.append(createPanel(el));
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
    /** @type {HTMLElement} */
    const panel = html$1`
    <aside class="dfn-panel" id="${panelId}" hidden>
      <span class="caret"></span>
      <div>
        <a class="self-link" href="${href}">Permalink</a>
        ${dfnExportedMarker(dfn)}
      </div>
      <b>Referenced in:</b>
      ${referencesToHTML(id, links)}
    </aside>
  `;
    return panel;
  }

  /** @param {HTMLElement} dfn */
  function dfnExportedMarker(dfn) {
    if (!dfn.matches("dfn[data-export]")) return null;
    return html$1`<span
    class="dfn-exported"
    title="Definition can be referenced by other specifications"
    >exported</span
  >`;
  }

  /**
   * @param {string} id dfn id
   * @param {NodeListOf<HTMLAnchorElement>} links
   * @returns {HTMLUListElement}
   */
  function referencesToHTML(id, links) {
    if (!links.length) {
      return html$1`<ul>
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
     * @returns {{ title: string, id: string }[]} The first list item contains
     * title from `getReferenceTitle`, rest of items contain strings like `(2)`,
     * `(3)` as title.
     */
    const toLinkProps = ([title, ids]) => {
      return [{ title, id: ids[0] }].concat(
        ids.slice(1).map((id, i) => ({ title: `(${i + 2})`, id }))
      );
    };

    /**
     * @param {[string, string[]]} entry
     * @returns {HTMLLIElement}
     */
    const listItemToHTML = entry => html$1`<li>
    ${toLinkProps(entry).map(
      link => html$1`<a href="#${link.id}">${link.title}</a>${" "}`
    )}
  </li>`;

    return html$1`<ul>
    ${[...titleToIDs].map(listItemToHTML)}
  </ul>`;
  }

  /** @param {HTMLAnchorElement} link */
  function getReferenceTitle(link) {
    const section = link.closest("section");
    if (!section) return null;
    const heading = section.querySelector("h1, h2, h3, h4, h5, h6");
    if (!heading) return null;
    return norm(heading.textContent);
  }

  async function loadStyle$9() {
    try {
      return (await Promise.resolve().then(function () { return dfnPanel$2; })).default;
    } catch {
      return fetchAsset("dfn-panel.css");
    }
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
    name: name$P,
    run: run$I
  });

  // @ts-check

  const name$Q = "core/data-type";

  const tooltipStylePromise = loadStyle$a();

  async function loadStyle$a() {
    try {
      return (await Promise.resolve().then(function () { return datatype$1; })).default;
    } catch {
      return fetchAsset("datatype.css");
    }
  }

  async function run$J(conf) {
    if (!conf.highlightVars) {
      return;
    }

    const style = document.createElement("style");
    style.textContent = await tooltipStylePromise;
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
    name: name$Q,
    run: run$J
  });

  // @ts-check

  const name$R = "core/algorithms";

  const cssPromise$2 = loadStyle$b();

  async function loadStyle$b() {
    try {
      return (await Promise.resolve().then(function () { return algorithms$2; })).default;
    } catch {
      return fetchAsset("algorithms.css");
    }
  }

  async function run$K() {
    const elements = Array.from(document.querySelectorAll("ol.algorithm li"));
    elements
      .filter(li => li.textContent.trim().startsWith("Assert: "))
      .forEach(li => li.classList.add("assert"));
    if (document.querySelector(".assert")) {
      const style = document.createElement("style");
      style.textContent = await cssPromise$2;
      document.head.appendChild(style);
    }
  }

  var algorithms = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$R,
    run: run$K
  });

  // @ts-check

  const name$S = "core/anchor-expander";

  function run$L() {
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
        showInlineError(a, msg, `No matching id in document: ${id}.`);
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
          showInlineError(a, msg, `Can't expand "#${id}".`);
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
      showInlineError(a, msg, "Missing title.");
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
      showInlineError(a, msg, "Missing figcaption in referenced figure.");
      return;
    }
    // remove the figure's title
    const children = [...makeSafeCopy(figcaption).childNodes].filter(
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
      showInlineError(a, msg, `No matching id in document: "${id}".`);
      return;
    }
    processHeading(heading, a);
    localize(heading, a);
  }

  function processHeading(heading, a) {
    const hadSelfLink = heading.querySelector(".self-link");
    const children = [...makeSafeCopy(heading).childNodes].filter(
      node => !node.classList || !node.classList.contains("self-link")
    );
    a.append(...children);
    if (hadSelfLink) a.prepend("§\u00A0");
    a.classList.add("sec-ref");
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
    name: name$S,
    run: run$L
  });

  // @ts-check
  /** @type {Promise<{ apiBase: string, fullName: string, branch: string, repoURL: string } | null>} */
  const github = new Promise((resolve, reject) => {
  });

  const localizationStrings$h = {
    en: {
      file_a_bug: "File a bug",
      participate: "Participate",
      commit_history: "Commit history",
    },
    ko: {
      participate: "참여",
    },
    zh: {
      participate: "参与：",
      file_a_bug: "反馈错误",
    },
    ja: {
      file_a_bug: "問題報告",
      participate: "参加方法：",
      commit_history: "変更履歴",
    },
    nl: {
      commit_history: "Revisiehistorie",
      file_a_bug: "Dien een melding in",
      participate: "Doe mee",
    },
    es: {
      commit_history: "Historia de cambios",
      file_a_bug: "Nota un bug",
      participate: "Participe",
    },
    de: {
      file_a_bug: "Fehler melden",
      participate: "Mitmachen",
      commit_history: "Revisionen",
    },
  };
  const l10n$j = getIntlData(localizationStrings$h);

  // @ts-check

  const name$T = "rs-changelog";

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
      html$1.bind(this)`
      <ul>
      ${{
        any: fetchCommits(from, to, filter)
          .then(commits => toHTML$1(commits))
          .catch(error => showInlineError(this, error.message, error.message))
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

  async function toHTML$1(commits) {
    const { repoURL } = await github;
    return commits.map(commit => {
      const [message, prNumber = null] = commit.message.split(/\(#(\d+)\)/, 2);
      const commitURL = `${repoURL}commit/${commit.hash}`;
      const prURL = prNumber ? `${repoURL}pull/${prNumber}` : null;
      const pr = prNumber && html$1` (<a href="${prURL}">#${prNumber}</a>)`;
      return html$1`<li><a href="${commitURL}">${message.trim()}</a>${pr}</li>`;
    });
  }

  var changelog = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$T,
    element: element
  });

  // @ts-check
  /** @type {CustomElementDfn[]} */
  const CUSTOM_ELEMENTS = [changelog];

  const name$U = "core/custom-elements/index";

  async function run$M() {
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
    name: name$U,
    run: run$M
  });

  // @ts-check

  const name$V = "ims/boilerplate";

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
      pub("warn", msg);
      console.warn("warn", msg, link);
      return;
    }
    return html$1`
    <tr class="${link.class ? link.class : null}">
      <td>${link.key}:</td>
      ${link.data ? link.data.map(showLinkData) : showLinkData(link)}
    </tr>
  `;
  }

  function showLinkData(data) {
    return html$1` <td class="${data.class ? data.class : null}">
    ${data.href
      ? html$1`<a href="${data.href}">${data.value || data.href}</a>`
      : data.value}
  </td>`;
  }

  /**
   * @param {*} conf
   */
  async function run$N(conf) {
    document.title = `${conf.specTitle} ${conf.specVersion ?? ""} ${conf.specStatus ?? ""}`;

    const body = document.body;

    const header = document.createElement("header");
    const headerTop = document.createElement("div");
    headerTop.setAttribute("class", "header-top");

    const hd = html$1`<h1 class="title" id="title">${conf.specTitle}</h1>`;
    headerTop.appendChild(hd);

    const imgURL =
      "https://www.imsglobal.org/sites/default/files/IMSglobalreg2_2.png";
    const logo = html$1`<a href='https://www.imsglobal.org' id='ims-logo'><img src='${imgURL}' alt='IMS logo'></img></a>`;
    headerTop.appendChild(logo);

    header.appendChild(headerTop);

    if (conf.specType !== "doc" && conf.specType !== "proposal") {
      const release = html$1`<div class="subtitle">
      ${conf.specStatus}<br />Spec Version ${conf.specVersion}
    </div>`;
      header.appendChild(release);

      const statusClass = `statusPD${
      conf.specStatus === "IMS Final Release" ? " final" : ""
    }`;
      const statusPD = html$1`<span
      class="${statusClass}"
      data-content="${conf.specStatus}"
      >${conf.specStatus}</span
    >`;
      header.appendChild(statusPD);
    }

    // Display IMS document version (required for all doc types)

    const docVersion = html$1`<div class="subtitle">
    Doc Version ${conf.docVersion ?? "(MISSING)"}
  </div>`;
    header.appendChild(docVersion);

    const versionTable = html$1`<table
    id="version-table"
    title="Version/Release Details"
    summary="Details about the version and release."
      <tbody>
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
        ${
          conf.specNature === "normative"
            ? html$1` <tr>
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

    if (conf.specType !== "doc" && conf.specType !== "proposal") {
      header.appendChild(versionTable);
    } else {
      const genericDocTable = html$1` <table
      id="version-table"
      title="Version/Release Details"
      summary="Details about the version and release."
    >
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
      header.appendChild(genericDocTable);
    }

    const copyright = html$1`<div id="cpr">
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

    const disclosure = html$1`<div id="disclosure">
    <p>
      Use of this specification to develop products or services is governed by
      the license with IMS found on the IMS website:
      <a href="http://www.imsglobal.org/speclicense.html">
        http://www.imsglobal.org/speclicense.html</a
      >.
    </p>
    <p>
      Permission is granted to all parties to use excerpts from this document as
      needed in producing requests for proposals.
    </p>
    <p>
      The limited permissions granted above are perpetual and will not be
      revoked by IMS or its successors or assigns.
    </p>
    <p>
      THIS SPECIFICATION IS BEING OFFERED WITHOUT ANY WARRANTY WHATSOEVER, AND
      IN PARTICULAR, ANY WARRANTY OF NONINFRINGEMENT IS EXPRESSLY DISCLAIMED.
      ANY USE OF THIS SPECIFICATION SHALL BE MADE ENTIRELY AT THE IMPLEMENTER'S
      OWN RISK, AND NEITHER THE CONSORTIUM, NOR ANY OF ITS MEMBERS OR
      SUBMITTERS, SHALL HAVE ANY LIABILITY WHATSOEVER TO ANY IMPLEMENTER OR
      THIRD PARTY FOR ANY DAMAGES OF ANY NATURE WHATSOEVER, DIRECTLY OR
      INDIRECTLY, ARISING FROM THE USE OF THIS SPECIFICATION.
    </p>
    <p>
      Public contributions, comments and questions can be posted here:
      <a href="http://www.imsglobal.org/forums/ims-glc-public-forums-and-resources">
        http://www.imsglobal.org/forums/ims-glc-public-forums-and-resources
      </a>.
    </p>
  </div>`;

    const ipr = html$1`<div id="ipr">
    <h2>IPR and Distribution Notice</h2>
    <p>
      Recipients of this document are requested to submit, with their comments,
      notification of any relevant patent claims or other intellectual property
      rights of which they may be aware that might be infringed by any
      implementation of the specification set forth in this document, and to
      provide supporting documentation.
    </p>
    <p>
      IMS takes no position regarding the validity or scope of any intellectual
      property or other rights that might be claimed to pertain implementation
      or use of the technology described in this document or the extent to which
      any license under such rights might or might not be available; neither
      does it represent that it has made any effort to identify any such rights.
      Information on IMS's procedures with respect to rights in IMS
      specifications can be found at the IMS Intellectual Property Rights
      webpage:
      <a href="http://www.imsglobal.org/ipr/imsipr_policyFinal.pdf">
        http://www.imsglobal.org/ipr/imsipr_policyFinal.pdf
      </a>.
    </p>
  </div>`;

    const proposal = html$1`<div id="proposal">
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

    if (conf.specType === "proposal") {
      header.appendChild(proposal);
      header.appendChild(copyright);
    } else {
      header.appendChild(ipr);

      if (conf.iprs) {
        header.appendChild(html$1`<p>
        The following participating organizations have made explicit license
        commitments to this specification:
      </p>`);
        let iprTable = `<table>
        <thead>
          <tr>
            <th>Org name</th>
            <th>Date election made</th>
            <th>Necessary claims</th>
            <th>Type</th>
          </th>
        </thead>
        <tbody>`;
        conf.iprs.forEach(element => {
          iprTable += `<tr>
            <td>${element.company}</td>
            <td>${element.electionDate}</td>
            <td>${element.necessaryClaims}</td>
            <td>${element.type}</td>
          </tr>`;
        });
        iprTable += `</tbody></table>`;
        const iprTableElement = document.createElement("div");
        iprTableElement.innerHTML = iprTable;
        header.appendChild(iprTableElement);
      }
      header.appendChild(disclosure);
      header.appendChild(copyright);
    }

    if (body.firstChild) {
      body.insertBefore(header, body.firstChild);
    } else {
      body.appendChild(header);
    }

    const footer = document.createElement("footer");

    const endWarranty = html$1`<div id="endWarranty">
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
    <p>IMS Global would appreciate receiving your comments and suggestions.</p>
    <p>
      Please contact IMS Global through our website at http://www.imsglobal.org.
    </p>
    <p>
      Please refer to Document Name: ${conf.specTitle.replace("<br/>", " ")}
      ${conf.specVersion}
    </p>
    <p>Date: ${conf.specDate}</p>
    <div></div>
  </div>`;
    footer.appendChild(endWarranty);

    document.body.appendChild(footer);
  }

  var boilerplate = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$V,
    run: run$N
  });

  // @ts-check
  const name$W = "ims/cleanBody";

  /**
   * A snapshot-time body merciless script and inline css remover. Intended to
   * be used only by admins. The activators are conf.cleanBodyScripts,
   * conf.cleanBodyCSS, alternatively conf.cleanBodyAll
   *
   * @param {*} conf respecConfig
   */
  async function run$O(conf) {
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
    name: name$W,
    run: run$O
  });

  // @ts-check

  const name$X = "ims/title-attrs";

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
  async function run$P(conf) {
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
    name: name$X,
    run: run$P
  });

  // @ts-check
  const name$Y = "ims/scripts";

  /**
   * Attach fixup script.
   *
   * @param {*} conf respecConfig
   */
  async function run$Q(conf) {
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
    name: name$Y,
    run: run$Q
  });

  // @ts-check

  const name$Z = "ims/comments";

  /**
   * Remove all comment nodes.
   */
  async function run$R() {
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
    name: name$Z,
    run: run$R
  });

  // @ts-check
  const name$_ = "core/linter";

  /** @type {WeakMap<Linter, { rules: Set<import("./LinterRule").default> }>} */
  const privates = new WeakMap();

  class Linter {
    constructor() {
      privates.set(this, {
        rules: new Set(),
      });
    }
    get rules() {
      return privates.get(this).rules;
    }
    /**
     * @param  {...import("./LinterRule").default} newRules
     */
    register(...newRules) {
      newRules.forEach(newRule => this.rules.add(newRule));
    }
    async lint(conf, doc = window.document) {
      const promisesToLint = [...privates.get(this).rules].map(rule =>
        toLinterWarning(rule.lint(conf, doc))
      );
      await promisesToLint;
    }
  }

  const linter = new Linter();

  const baseResult = {
    name: "unknown",
    description: "",
    occurrences: 0,
    howToFix: "",
    offendingElements: [], // DOM Nodes
    help: "", // where to get help
  };

  /**
   * @typedef {import("./LinterRule").LinterResult} LinterResult
   * @param {LinterResult | Promise<LinterResult>} [resultPromise]
   */
  async function toLinterWarning(resultPromise) {
    const result = await resultPromise;
    if (!result) {
      return;
    }
    const output = { ...baseResult, ...result };
    const {
      description,
      help,
      howToFix,
      name,
      occurrences,
      offendingElements,
    } = output;
    const message = `Linter (${name}): ${description} ${howToFix} ${help}`;
    if (offendingElements.length) {
      showInlineWarning(offendingElements, `${message} Occured`);
    } else {
      pub("warn", `${message} (Count: ${occurrences})`);
    }
  }

  function run$S(conf) {
    if (conf.lint === false) {
      return; // nothing to do
    }
    // return early, continue processing other things
    (async () => {
      await document.respecIsReady;
      try {
        await linter.lint(conf, document);
      } catch (err) {
        console.error("Error ocurred while running the linter", err);
      }
    })();
  }

  var linter$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    name: name$_,
    'default': linter,
    run: run$S
  });

  // @ts-check

  const name$$ = "core/a11y";

  const DISABLED_RULES = [
    "color-contrast", // too slow 🐢
    "landmark-one-main", // need to add a <main>, else it marks entire page as errored
    "landmark-unique",
    "region",
  ];

  async function run$T(conf) {
    if (!conf.a11y) {
      return;
    }

    const options = conf.a11y === true ? {} : conf.a11y;
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
        showInlineWarning(elements, title, title, { details });
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
      const msg =
        "Failed to load a11y linter. See developer console for details.";
      pub("error", msg);
      console.error(error);
      return [];
    }

    try {
      const result = await axe.run(document, options);
      return result.violations;
    } catch (error) {
      pub("error", "Error while looking for a11y issues.");
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
    name: name$$,
    run: run$T
  });

  var ui$2 = ".respec-modal .close-button{position:absolute;z-index:inherit;padding:.2em;font-weight:700;cursor:pointer;margin-left:5px;border:none;background:0 0}#respec-ui{position:fixed;display:flex;flex-direction:row-reverse;top:20px;right:20px;width:202px;text-align:right;z-index:9000}#respec-pill,.respec-info-button{background:#fff;height:2.5em;color:#787878;border:1px solid #ccc;box-shadow:1px 1px 8px 0 rgba(100,100,100,.5)}.respec-info-button{border:none;opacity:.75;border-radius:2em;margin-right:1em;min-width:3.5em}.respec-info-button:focus,.respec-info-button:hover{opacity:1;transition:opacity .2s}#respec-pill:disabled{font-size:2.8px;text-indent:-9999em;border-top:1.1em solid rgba(40,40,40,.2);border-right:1.1em solid rgba(40,40,40,.2);border-bottom:1.1em solid rgba(40,40,40,.2);border-left:1.1em solid #fff;transform:translateZ(0);animation:respec-spin .5s infinite linear;box-shadow:none}#respec-pill:disabled,#respec-pill:disabled:after{border-radius:50%;width:10em;height:10em}@keyframes respec-spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}.respec-hidden{visibility:hidden;opacity:0;transition:visibility 0s .2s,opacity .2s linear}.respec-visible{visibility:visible;opacity:1;transition:opacity .2s linear}#respec-pill:focus,#respec-pill:hover{color:#000;background-color:#f5f5f5;transition:color .2s}#respec-menu{position:absolute;margin:0;padding:0;font-family:sans-serif;background:#fff;box-shadow:1px 1px 8px 0 rgba(100,100,100,.5);width:200px;display:none;text-align:left;margin-top:32px;font-size:.8em}#respec-menu:not([hidden]){display:block}#respec-menu li{list-style-type:none;margin:0;padding:0}.respec-save-buttons{display:grid;grid-template-columns:repeat(auto-fill,minmax(47%,2fr));grid-gap:.5cm;padding:.5cm}.respec-save-button:link{padding-top:16px;color:#f0f0f0;background:#2a5aa8;justify-self:stretch;height:1cm;text-decoration:none;text-align:center;font-size:inherit;border:none;border-radius:.2cm}.respec-save-button:link:hover{color:#fff;background:#2a5aa8;padding:0;margin:0;border:0;padding-top:16px}.respec-save-button:link:focus{background:#193766}#respec-pill:focus,#respec-ui button:focus,.respec-option:focus{outline:0;outline-style:none}#respec-pill-error{background-color:red;color:#fff}#respec-pill-warning{background-color:orange;color:#fff}.respec-error-list,.respec-warning-list{margin:0;padding:0;list-style:none;font-family:sans-serif;background-color:#fffbe6;font-size:.85em}.respec-error-list>li,.respec-warning-list>li{padding:.4em .7em}.respec-warning-list>li::before{content:\"⚠️\";padding-right:.5em}.respec-error-list p,.respec-warning-list p{padding:0;margin:0}.respec-warning-list li{color:#5c3b00;border-bottom:thin solid #fff5c2}.respec-error-list,.respec-error-list li{background-color:#fff0f0}.respec-error-list li::before{content:\"💥\";padding-right:.5em}.respec-error-list li{padding:.4em .7em;color:#5c3b00;border-bottom:thin solid #ffd7d7}.respec-error-list li>p{margin:0;padding:0;display:inline-block}.respec-error-list li>p:first-child,.respec-warning-list li>p:first-child{display:inline}.respec-error-list>li li,.respec-warning-list>li li{margin:0;list-style:disc}#respec-overlay{display:block;position:fixed;z-index:10000;top:0;left:0;height:100%;width:100%;background:#000}.respec-show-overlay{transition:opacity .2s linear;opacity:.5}.respec-hide-overlay{transition:opacity .2s linear;opacity:0}.respec-modal{display:block;position:fixed;z-index:11000;margin:auto;top:10%;background:#fff;border:5px solid #666;min-width:20%;width:79%;padding:0;max-height:80%;overflow-y:auto;margin:0 -.5cm}@media screen and (min-width:78em){.respec-modal{width:62%}}.respec-modal h3{margin:0;padding:.2em;text-align:center;color:#000;background:linear-gradient(to bottom,#eee 0,#eee 50%,#ccc 100%);font-size:1em}.respec-modal .inside div p{padding-left:1cm}#respec-menu button.respec-option{background:#fff;padding:0 .2cm;border:none;width:100%;text-align:left;font-size:inherit;padding:1.2em 1.2em}#respec-menu button.respec-option:hover,#respec-menu button:focus{background-color:#eee}.respec-cmd-icon{padding-right:.5em}#respec-ui button.respec-option:last-child{border:none;border-radius:inherit}.respec-button-copy-paste{position:absolute;height:28px;width:40px;cursor:pointer;background-image:linear-gradient(#fcfcfc,#eee);border:1px solid #90b8de;border-left:0;border-radius:0 0 3px 0;-webkit-user-select:none;user-select:none;-webkit-appearance:none;top:0;left:127px}#specref-ui{margin:0 2%;margin-bottom:.5cm}#specref-ui header{font-size:.7em;background-color:#eee;text-align:center;padding:.2cm;margin-bottom:.5cm;border-radius:0 0 .2cm .2cm}#specref-ui header h1{padding:0;margin:0;color:#000}#specref-ui p{padding:0;margin:0;font-size:.8em;text-align:center}#specref-ui p.state{margin:1cm}#specref-ui .searchcomponent{font-size:16px;display:grid;grid-template-columns:auto 2cm}#specref-ui button,#specref-ui input{border:0;padding:6px 12px}#specref-ui label{font-size:.6em;grid-column-end:3;text-align:right;grid-column-start:1}#specref-ui input[type=search]{-webkit-appearance:none;font-size:16px;border-radius:.1cm 0 0 .1cm;border:1px solid #ccc}#specref-ui button[type=submit]{color:#fff;border-radius:0 .1cm .1cm 0;background-color:#337ab7}#specref-ui button[type=submit]:hover{background-color:#286090;border-color:#204d74}#specref-ui .result-stats{margin:0;padding:0;color:grey;font-size:.7em;font-weight:700}#specref-ui .specref-results{font-size:.8em}#specref-ui .specref-results dd+dt{margin-top:.51cm}#specref-ui .specref-results a{text-transform:capitalize}#specref-ui .specref-results .authors{display:block;color:#006621}@media print{#respec-ui{display:none}}#xref-ui{width:100%;min-height:550px;height:100%;overflow:hidden;padding:0;margin:0;border:0}#xref-ui:not(.ready){background:url(https://respec.org/xref/loader.gif) no-repeat center}.respec-dfn-list .dfn-status{margin-left:.5em;padding:.1em;text-align:center;white-space:nowrap;font-size:90%;border-radius:.2em}.respec-dfn-list .exported{background:#d1edfd;color:#040b1c;box-shadow:0 0 0 .125em #1ca5f940}.respec-dfn-list .unused{background:#fde0e6;color:#9d0c29;box-shadow:0 0 0 .125em #f1466840}#xref-ui+a[href]{font-size:.9rem;float:right;margin:0 .5em .5em;border-bottom-width:1px}";

  var ui$3 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    'default': ui$2
  });

  var respec = "@keyframes pop{0%{transform:scale(1,1)}25%{transform:scale(1.25,1.25);opacity:.75}100%{transform:scale(1,1)}}.hljs{background:0 0!important}a abbr,h1 abbr,h2 abbr,h3 abbr,h4 abbr,h5 abbr,h6 abbr{border:none}dfn{font-weight:700}a.internalDFN{color:inherit;border-bottom:1px solid #99c;text-decoration:none}a.externalDFN{color:inherit;border-bottom:1px dotted #ccc;text-decoration:none}a.bibref{text-decoration:none}.respec-offending-element:target{animation:pop .25s ease-in-out 0s 1}.respec-offending-element,a[href].respec-offending-element{text-decoration:red wavy underline}@supports not (text-decoration:red wavy underline){.respec-offending-element:not(pre){display:inline-block}.respec-offending-element{background:url(data:image/gif;base64,R0lGODdhBAADAPEAANv///8AAP///wAAACwAAAAABAADAEACBZQjmIAFADs=) bottom repeat-x}}#references :target{background:#eaf3ff;animation:pop .4s ease-in-out 0s 1}cite .bibref{font-style:normal}code{color:#c63501}th code{color:inherit}a[href].orcid{padding-left:4px;padding-right:4px}a[href].orcid>svg{margin-bottom:-2px}.toc a,.tof a{text-decoration:none}a .figno,a .secno{color:#000}ol.tof,ul.tof{list-style:none outside none}.caption{margin-top:.5em;font-style:italic}table.simple{border-spacing:0;border-collapse:collapse;border-bottom:3px solid #005a9c}.simple th{background:#005a9c;color:#fff;padding:3px 5px;text-align:left}.simple th a{color:#fff;padding:3px 5px;text-align:left}.simple th[scope=row]{background:inherit;color:inherit;border-top:1px solid #ddd}.simple td{padding:3px 10px;border-top:1px solid #ddd}.simple tr:nth-child(even){background:#f0f6ff}.section dd>p:first-child{margin-top:0}.section dd>p:last-child{margin-bottom:0}.section dd{margin-bottom:1em}.section dl.attrs dd,.section dl.eldef dd{margin-bottom:0}#issue-summary>ul,.respec-dfn-list{column-count:2}#issue-summary li,.respec-dfn-list li{list-style:none}details.respec-tests-details{margin-left:1em;display:inline-block;vertical-align:top}details.respec-tests-details>*{padding-right:2em}details.respec-tests-details[open]{z-index:999999;position:absolute;border:thin solid #cad3e2;border-radius:.3em;background-color:#fff;padding-bottom:.5em}details.respec-tests-details[open]>summary{border-bottom:thin solid #cad3e2;padding-left:1em;margin-bottom:1em;line-height:2em}details.respec-tests-details>ul{width:100%;margin-top:-.3em}details.respec-tests-details>li{padding-left:1em}a[href].self-link:hover{opacity:1;text-decoration:none;background-color:transparent}h2,h3,h4,h5,h6{position:relative}aside.example .marker>a.self-link{color:inherit}h2>a.self-link,h3>a.self-link,h4>a.self-link,h5>a.self-link,h6>a.self-link{border:none;color:inherit;font-size:83%;height:2em;left:-1.6em;opacity:.5;position:absolute;text-align:center;text-decoration:none;top:0;transition:opacity .2s;width:2em}h2>a.self-link::before,h3>a.self-link::before,h4>a.self-link::before,h5>a.self-link::before,h6>a.self-link::before{content:\"§\";display:block}@media (max-width:767px){dd{margin-left:0}h2>a.self-link,h3>a.self-link,h4>a.self-link,h5>a.self-link,h6>a.self-link{left:auto;top:auto}}@media print{.removeOnSave{display:none}}";

  var respec$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    'default': respec
  });

  var examples$1 = "span.example-title{text-transform:none}aside.example,div.example,div.illegal-example{padding:.5em;margin:1em 0;position:relative;clear:both}div.illegal-example{color:red}div.illegal-example p{color:#000}aside.example,div.example{padding:.5em;border-left-width:.5em;border-left-style:solid;border-color:#e0cb52;background:#fcfaee}aside.example div.example{border-left-width:.1em;border-color:#999;background:#fff}aside.example div.example span.example-title{color:#999}";

  var examples$2 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    'default': examples$1
  });

  var webidl$1 = "pre.idl{padding:1em;position:relative}@media print{pre.idl{white-space:pre-wrap}}.idlHeader{display:block;width:150px;background:#8ccbf2;color:#fff;font-family:sans-serif;font-weight:700;margin:-1em 0 1em -1em;height:28px;line-height:28px}.idlHeader a.self-link{margin-left:.3cm;text-decoration:none;border-bottom:none}.idlID{font-weight:700;color:#005a9c}.idlType{color:#005a9c}.idlName{color:#ff4500}.idlName a{color:#ff4500;border-bottom:1px dotted #ff4500;text-decoration:none}a.idlEnumItem{color:#000;border-bottom:1px dotted #ccc;text-decoration:none}.idlSuperclass{font-style:italic;color:#005a9c}.idlDefaultValue,.idlParamName{font-style:italic}.extAttr{color:#666}.idlSectionComment{color:gray}.idlIncludes a{font-weight:700}.respec-button-copy-paste:focus{text-decoration:none;border-color:#51a7e8;outline:0;box-shadow:0 0 5px rgba(81,167,232,.5)}.respec-button-copy-paste.selected:focus,.respec-button-copy-paste:focus:hover{border-color:#51a7e8}.respec-button-copy-paste.zeroclipboard-is-active,.respec-button-copy-paste.zeroclipboard-is-hover,.respec-button-copy-paste:active,.respec-button-copy-paste:hover{text-decoration:none;background-color:#ddd;background-image:linear-gradient(#eee,#ddd);border-color:#ccc}.respec-button-copy-paste.selected,.respec-button-copy-paste.zeroclipboard-is-active,.respec-button-copy-paste:active{background-color:#dcdcdc;background-image:none;border-color:#b5b5b5;box-shadow:inset 0 2px 4px rgba(0,0,0,.15)}.respec-button-copy-paste.selected:hover{background-color:#cfcfcf}.respec-button-copy-paste.disabled,.respec-button-copy-paste.disabled:hover,.respec-button-copy-paste:disabled,.respec-button-copy-paste:disabled:hover{color:rgba(102,102,102,.5);cursor:default;background-color:rgba(229,229,229,.5);background-image:none;border-color:rgba(197,197,197,.5);box-shadow:none}@media print{.respec-button-copy-paste{visibility:hidden}}";

  var webidl$2 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    'default': webidl$1
  });

  var dfnIndex$1 = "ul.index{columns:30ch;column-gap:1.5em}ul.index li{list-style:inherit}ul.index li span{color:inherit;cursor:pointer;white-space:normal}#index-defined-here ul.index li{font-size:.9rem}ul.index code{color:inherit}#index-defined-here .print-only{display:none}@media print{#index-defined-here .print-only{display:initial}}";

  var dfnIndex$2 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    'default': dfnIndex$1
  });

  var caniuse$1 = ".caniuse-stats{display:flex;flex-wrap:wrap;justify-content:flex-start;align-items:baseline;cursor:pointer}button.caniuse-cell{margin:1px 1px 0 0;border:none}.caniuse-browser{position:relative}@media print{.caniuse-cell.y::before{content:\"✔️\";padding:.5em}.caniuse-cell.n::before{content:\"❌\";padding:.5em}.caniuse-cell.a::before,.caniuse-cell.d::before,.caniuse-cell.p::before,.caniuse-cell.x::before{content:\"⚠️\";padding:.5em}}.caniuse-browser ul{display:none;margin:0;padding:0;list-style:none;position:absolute;left:0;z-index:2;background:#fff;margin-top:1px}.caniuse-stats a{white-space:nowrap;align-self:center;margin-left:.5em}.caniuse-cell{display:flex;color:rgba(0,0,0,.8);font-size:90%;height:.8cm;margin-right:1px;margin-top:0;min-width:3cm;overflow:visible;justify-content:center;align-items:center}li.caniuse-cell{margin-bottom:1px}.caniuse-cell:focus{outline:0}.caniuse-cell:hover{color:#000}.caniuse-cell.y{background:#8bc34a}.caniuse-cell.n{background:#e53935}.caniuse-cell.a,.caniuse-cell.d,.caniuse-cell.p,.caniuse-cell.x{background:#ffc107}.caniuse-stats .caniuse-browser:hover>ul,.caniuse-stats button:focus+ul{display:block}";

  var caniuse$2 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    'default': caniuse$1
  });

  var mdnAnnotation$1 = ".mdn{font-size:.75em;position:absolute;right:.3em;min-width:0;margin-top:3em}.mdn details{width:100%;margin:1px 0;position:relative;z-index:10;box-sizing:border-box;padding:.4em;padding-top:0}.mdn details[open]{min-width:25ch;max-width:32ch;background:#fff;box-shadow:0 1em 3em -.4em rgba(0,0,0,.3),0 0 1px 1px rgba(0,0,0,.05);border-radius:2px;z-index:11;margin-bottom:.4em}.mdn summary{text-align:right;cursor:default;margin-right:-.4em}.mdn summary span{font-family:zillaslab,Palatino,\"Palatino Linotype\",serif;color:#fff;background-color:#000;display:inline-block;padding:3px}.mdn a{display:inline-block;word-break:break-all}.mdn p{margin:0}.mdn .engines-all{color:#058b00}.mdn .engines-some{color:#b00}.mdn table{width:100%;font-size:.9em}.mdn td{border:none}.mdn td:nth-child(2){text-align:right}.mdn .nosupportdata{font-style:italic;margin:0}.mdn tr::before{content:\"\";display:table-cell;width:1.5em;height:1.5em;background:no-repeat center center/contain;font-size:.75em}.mdn .no,.mdn .unknown{color:#ccc;filter:grayscale(100%)}.mdn .no::before,.mdn .unknown::before{opacity:.5}.mdn .chrome::before,.mdn .chrome_android::before{background-image:url(https://resources.whatwg.org/browser-logos/chrome.svg)}.mdn .edge::before,.mdn .edge_mobile::before{background-image:url(https://resources.whatwg.org/browser-logos/edge.svg)}.mdn .firefox::before,.mdn .firefox_android::before{background-image:url(https://resources.whatwg.org/browser-logos/firefox.png)}.mdn .ie::before{background-image:url(https://resources.whatwg.org/browser-logos/ie.png)}.mdn .opera::before,.mdn .opera_android::before{background-image:url(https://resources.whatwg.org/browser-logos/opera.svg)}.mdn .safari::before{background-image:url(https://resources.whatwg.org/browser-logos/safari.png)}.mdn .safari_ios::before{background-image:url(https://resources.whatwg.org/browser-logos/safari-ios.svg)}.mdn .samsunginternet_android::before{background-image:url(https://resources.whatwg.org/browser-logos/samsung.svg)}.mdn .webview_android::before{background-image:url(https://resources.whatwg.org/browser-logos/android-webview.png)}";

  var mdnAnnotation$2 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    'default': mdnAnnotation$1
  });

  var respecWorker = "// ReSpec Worker v1.0.0\r\n\"use strict\";\r\ntry {\r\n  importScripts(\"https://www.w3.org/Tools/respec/respec-highlight\");\r\n} catch (err) {\r\n  console.error(\"Network error loading highlighter\", err);\r\n}\r\n\r\nself.addEventListener(\"message\", ({ data: originalData }) => {\r\n  const data = Object.assign({}, originalData);\r\n  switch (data.action) {\r\n    case \"highlight-load-lang\": {\r\n      const { langURL, propName, lang } = data;\r\n      importScripts(langURL);\r\n      self.hljs.registerLanguage(lang, self[propName]);\r\n      break;\r\n    }\r\n    case \"highlight\": {\r\n      const { code } = data;\r\n      const langs = data.languages.length ? data.languages : undefined;\r\n      try {\r\n        const { value, language } = self.hljs.highlightAuto(code, langs);\r\n        Object.assign(data, { value, language });\r\n      } catch (err) {\r\n        console.error(\"Could not transform some code?\", err);\r\n        // Post back the original code\r\n        Object.assign(data, { value: code, language: \"\" });\r\n      }\r\n      break;\r\n    }\r\n  }\r\n  self.postMessage(data);\r\n});\r\n";

  var respecWorker$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    'default': respecWorker
  });

  var highlight$1 = ".hljs{display:block;overflow-x:auto;padding:.5em;color:#383a42;background:#fafafa}.hljs-comment,.hljs-quote{color:#717277;font-style:italic}.hljs-doctag,.hljs-formula,.hljs-keyword{color:#a626a4}.hljs-deletion,.hljs-name,.hljs-section,.hljs-selector-tag,.hljs-subst{color:#ca4706;font-weight:700}.hljs-literal{color:#0b76c5}.hljs-addition,.hljs-attribute,.hljs-meta-string,.hljs-regexp,.hljs-string{color:#42803c}.hljs-built_in,.hljs-class .hljs-title{color:#9a6a01}.hljs-attr,.hljs-number,.hljs-selector-attr,.hljs-selector-class,.hljs-selector-pseudo,.hljs-template-variable,.hljs-type,.hljs-variable{color:#986801}.hljs-bullet,.hljs-link,.hljs-meta,.hljs-selector-id,.hljs-symbol,.hljs-title{color:#336ae3}.hljs-emphasis{font-style:italic}.hljs-strong{font-weight:700}.hljs-link{text-decoration:underline}";

  var highlight$2 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    'default': highlight$1
  });

  var _var = "var:hover{text-decoration:underline;cursor:pointer}var.respec-hl{color:var(--color,#000);background-color:var(--bg-color);box-shadow:0 0 0 2px var(--bg-color)}var.respec-hl-c1{--bg-color:#f4d200}var.respec-hl-c2{--bg-color:#ff87a2}var.respec-hl-c3{--bg-color:#96e885}var.respec-hl-c4{--bg-color:#3eeed2}var.respec-hl-c5{--bg-color:#eacfb6}var.respec-hl-c6{--bg-color:#82ddff}var.respec-hl-c7{--bg-color:#ffbcf2}@media print{var.respec-hl{background:0 0;color:#000;box-shadow:unset}}";

  var _var$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    'default': _var
  });

  var dfnPanel$1 = "dfn{cursor:pointer}.dfn-panel{position:absolute;z-index:35;min-width:300px;max-width:500px;padding:.5em .75em;margin-top:.6em;font:small Helvetica Neue,sans-serif,Droid Sans Fallback;background:#fff;color:#000;box-shadow:0 1em 3em -.4em rgba(0,0,0,.3),0 0 1px 1px rgba(0,0,0,.05);border-radius:2px}.dfn-panel:not(.docked)>.caret{position:absolute;top:-9px}.dfn-panel:not(.docked)>.caret::after,.dfn-panel:not(.docked)>.caret::before{content:\"\";position:absolute;border:10px solid transparent;border-top:0;border-bottom:10px solid #fff;top:0}.dfn-panel:not(.docked)>.caret::before{border-bottom:9px solid #a2a9b1}.dfn-panel *{margin:0}.dfn-panel b{display:block;color:#000;margin-top:.25em}.dfn-panel ul a[href]{color:#333}.dfn-panel a.self-link{font-weight:700}.dfn-panel .dfn-exported{float:right;padding:.1em;border-radius:.2em;text-align:center;white-space:nowrap;font-size:90%;background:#d1edfd;color:#040b1c;box-shadow:0 0 0 .125em #1ca5f940}.dfn-panel a:not(:hover){text-decoration:none!important;border-bottom:none!important}.dfn-panel a[href]:hover{border-bottom-width:1px}.dfn-panel ul{padding:0}.dfn-panel li{margin-left:1em}.dfn-panel.docked{position:fixed;left:.5em;top:unset;bottom:2em;margin:0 auto;max-width:calc(100vw - .75em * 2 - .5em - .2em * 2);max-height:30vh;overflow:auto}";

  var dfnPanel$2 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    'default': dfnPanel$1
  });

  var dfnPanel_runtime = "(() => {\n// @ts-check\r\nif (document.respecIsReady) {\r\n  document.respecIsReady.then(dfnPanel);\r\n} else {\r\n  dfnPanel();\r\n}\r\n\r\nfunction dfnPanel() {\r\n  /** @type {HTMLElement} */\r\n  let panel;\r\n  document.body.addEventListener(\"click\", event => {\r\n    if (!(event.target instanceof HTMLElement)) return;\r\n\r\n    /** @type {HTMLElement} */\r\n    const el = event.target;\r\n\r\n    const action = deriveAction(el);\r\n    switch (action) {\r\n      case \"show\": {\r\n        if (panel) hidePanel(panel);\r\n        /** @type {HTMLElement} */\r\n        const dfn = el.closest(\"dfn, .index-term\");\r\n        panel = document.getElementById(`dfn-panel-for-${dfn.id}`);\r\n        displayPanel(dfn, panel, { x: event.clientX, y: event.clientY });\r\n        break;\r\n      }\r\n      case \"dock\": {\r\n        panel.style.left = null;\r\n        panel.style.top = null;\r\n        panel.classList.add(\"docked\");\r\n        break;\r\n      }\r\n      case \"hide\": {\r\n        hidePanel(panel);\r\n        break;\r\n      }\r\n    }\r\n  });\r\n}\r\n\r\n/** @param {HTMLElement} clickTarget */\r\nfunction deriveAction(clickTarget) {\r\n  const hitALink = !!clickTarget.closest(\"a\");\r\n  if (clickTarget.closest(\"dfn, .index-term\")) {\r\n    return hitALink ? null : \"show\";\r\n  }\r\n  if (clickTarget.closest(\".dfn-panel\")) {\r\n    if (hitALink) {\r\n      const clickedSelfLink = clickTarget.classList.contains(\"self-link\");\r\n      return clickedSelfLink ? \"hide\" : \"dock\";\r\n    }\r\n    const panel = clickTarget.closest(\".dfn-panel\");\r\n    return panel.classList.contains(\"docked\") ? \"hide\" : null;\r\n  }\r\n  if (document.querySelector(\".dfn-panel:not([hidden])\")) {\r\n    return \"hide\";\r\n  }\r\n  return null;\r\n}\r\n\r\n/**\r\n * @param {HTMLElement} dfn\r\n * @param {HTMLElement} panel\r\n * @param {{ x: number, y: number }} clickPosition\r\n */\r\nfunction displayPanel(dfn, panel, { x, y }) {\r\n  panel.hidden = false;\r\n  // distance (px) between edge of panel and the pointing triangle (caret)\r\n  const MARGIN = 20;\r\n\r\n  const dfnRects = dfn.getClientRects();\r\n  // Find the `top` offset when the `dfn` can be spread across multiple lines\r\n  let closestTop = 0;\r\n  let minDiff = Infinity;\r\n  for (const rect of dfnRects) {\r\n    const { top, bottom } = rect;\r\n    const diffFromClickY = Math.abs((top + bottom) / 2 - y);\r\n    if (diffFromClickY < minDiff) {\r\n      minDiff = diffFromClickY;\r\n      closestTop = top;\r\n    }\r\n  }\r\n\r\n  const top = window.scrollY + closestTop + dfnRects[0].height;\r\n  const left = x - MARGIN;\r\n  panel.style.left = `${left}px`;\r\n  panel.style.top = `${top}px`;\r\n\r\n  // Find if the panel is flowing out of the window\r\n  const panelRect = panel.getBoundingClientRect();\r\n  const SCREEN_WIDTH = Math.min(window.innerWidth, window.screen.width);\r\n  if (panelRect.right > SCREEN_WIDTH) {\r\n    const newLeft = Math.max(MARGIN, x + MARGIN - panelRect.width);\r\n    const newCaretOffset = left - newLeft;\r\n    panel.style.left = `${newLeft}px`;\r\n    /** @type {HTMLElement} */\r\n    const caret = panel.querySelector(\".caret\");\r\n    caret.style.left = `${newCaretOffset}px`;\r\n  }\r\n}\r\n\r\n/** @param {HTMLElement} panel */\r\nfunction hidePanel(panel) {\r\n  panel.hidden = true;\r\n  panel.classList.remove(\"docked\");\r\n}\r\n})()";

  var dfnPanel_runtime$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    'default': dfnPanel_runtime
  });

  var datatype = "var{position:relative;cursor:pointer}var[data-type]::after,var[data-type]::before{position:absolute;left:50%;top:-6px;opacity:0;transition:opacity .4s;pointer-events:none}var[data-type]::before{content:\"\";transform:translateX(-50%);border-width:4px 6px 0 6px;border-style:solid;border-color:transparent;border-top-color:#000}var[data-type]::after{content:attr(data-type);transform:translateX(-50%) translateY(-100%);background:#000;text-align:center;font-family:\"Dank Mono\",\"Fira Code\",monospace;font-style:normal;padding:6px;border-radius:3px;color:#daca88;text-indent:0;font-weight:400}var[data-type]:hover::after,var[data-type]:hover::before{opacity:1}";

  var datatype$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    'default': datatype
  });

  var algorithms$1 = ".assert{background:#eee;border-left:.5em solid #aaa;padding:.3em}";

  var algorithms$2 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    'default': algorithms$1
  });

}());
//# sourceMappingURL=respec-ims-default.js.map
