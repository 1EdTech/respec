// @ts-check
// Temporary workaround until browsers get real import-maps

import * as _idb from "../../node_modules/idb/build/index.js";
import * as _webidl2 from "../../node_modules/webidl2/index.js";
import { MIMEType as _MIMEType } from "../../node_modules/sniffy-mimetype/index.js";
import { marked as _marked } from "../../node_modules/marked/lib/marked.esm.js";
import _pluralize from "../../js/deps/builds/pluralize.js";
import hyperHTML from "../../node_modules/hyperhtml/esm.js";

export const html = hyperHTML;
export const idb = _idb;
export const marked = _marked;
export const MIMEType = _MIMEType;
export const pluralize = _pluralize;
export const webidl2 = _webidl2;

// dinamycally import mermaid to avoid increase of size of the library
// @ts-ignore
export const mermaidModule =
  "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs";
