// @ts-check
/**
 * module: ims/exporter
 * Exports a ReSpec document, based on mime type, so it can be saved, etc.
 * Also performs cleanup, removing things that shouldn't be in published documents.
 * That is, elements that have a "removeOnSave" css class.
 *
 * Clone of core/exporter. This clone accepts application/cms as a mimeType
 * and will generate an HTML except suitable for Drupal or other CMS.
 */

import { removeCommentNodes, removeReSpec, showError } from "../core/utils.js";
import { expose } from "../core/expose-modules.js";
import { html } from "../core/import-maps.js";
import { pub } from "../core/pubsubhub.js";

const name = "ims/exporter";
const mimeTypes = new Map([
  ["text/html", "html"],
  ["application/xml", "xml"],
  ["application/cms", "cms"],
]);

/**
 * Creates a dataURI from a ReSpec document. It also cleans up the document
 * removing various things.
 *
 * @param {Document} doc document to export. useful for testing purposes
 * @returns a stringified data-uri of document that can be saved.
 */
export function rsDocToCmsDataURL(doc = document) {
  const data = serialize(doc);
  const encodedString = encodeURIComponent(data);
  return `data:text/html;charset=utf-8,${encodedString}`;
}

function serialize(doc) {
  // Convert image urls to data uris before
  // cloning the document. The clone does not
  // have rendered images.
  const images = doc.querySelectorAll("img");
  images.forEach(img => {
    img.setAttribute("src", getDataURL(img));
  });
  const cloneDoc = doc.cloneNode(true);
  cleanup(cloneDoc);
  createCmsExtract(cloneDoc.body);
  return cloneDoc.body.innerHTML;
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

/**
 * Return a Data URL for the image. The Data URL will relace
 * the image source URL. This makes it easier to update the CMS
 * because there are no external image files to update.
 *
 * @param {HTMLImageElement} img
 */
function getDataURL(img) {
  try {
    const canvas = img.ownerDocument.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const context = canvas.getContext("2d");
    context.drawImage(img, 0, 0, img.width, img.height);
    return canvas.toDataURL();
  } catch (err) {
    const message = err.toString();
    if (!message.startsWith("SecurityError")) {
      showError(message, name);
    }
    return img.src;
  }
}

expose(name, { rsDocToCmsDataURL });
