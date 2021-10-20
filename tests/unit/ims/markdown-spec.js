"use strict";

import { flushIframes, makePluginDoc } from "../SpecHelper.js";

describe("IMS - Markdown", () => {
  afterAll(flushIframes);

  const plugins = ["/src/ims/post-markdown.js"];
  const config = { format: "markdown" };

  it("Removes <md-only> blocks when format='markdown'", async () => {
    const body = `
    <md-only>
      <p>
        This should be removed
      </p>
    </md-only>
    
    ## Section Title {#custom-id}
    
    <md-only>
      <p>
        This should be removed
      </p>
    </md-only>
    `;

    const makeDoc = () => makePluginDoc(plugins, { config, body });

    const doc = await makeDoc();

    expect(doc.querySelectorAll("md-only")).toHaveSize(0);
  });

  it("Removes <md-only> blocks when data-format='markdown'", async () => {
    const body = `
    <section data-format="markdown">

    <md-only>
      <p>
        This should be removed
      </p>
    </md-only>
    
    - A list itme

    <md-only>
      <p>
        This should be removed
      </p>
    </md-only>
    
    </section>
    `;

    const makeDoc = () => makePluginDoc(plugins, { config, body });

    const doc = await makeDoc();

    expect(doc.querySelectorAll("md-only")).toHaveSize(0);
  });
});
