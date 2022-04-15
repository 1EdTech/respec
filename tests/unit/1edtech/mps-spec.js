"use strict";

import { flushIframes, makePluginDoc } from "../SpecHelper.js";

describe("1EdTech - mps.js", () => {
  afterAll(flushIframes);

  const plugins = ["/src/ims/mps.js"];
  const config = { format: "markdown" };

  it("Removes <md-only> blocks when format='markdown'", async () => {
    // This is what the body looks like after w3c/markdown has run
    const body = `
    <md-only>
      <p>
        This should be removed
      </p>
    </md-only>
    
    <section>
      <h2 id="custom-id">Section Title</h2>
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

  it("Removes <md-only> blocks when data-format='markdown'", async () => {
    const body = `
    <section data-format="markdown">

      <md-only>
        <p>
          This should be removed
        </p>
      </md-only>

      <ul>
        <li>Test</li>
      </ul>
      
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
