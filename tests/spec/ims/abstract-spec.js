import { flushIframes, makeRSDoc, makeStandardImsOps } from "../SpecHelper.js";

describe("IMS — Abstract", () => {
  afterAll(flushIframes);

  it("includes a h2 and sets the class", async () => {
    const ops = makeStandardImsOps();
    const doc = await makeRSDoc(ops);
    const abs = doc.getElementById("abstract");
    const h2 = abs.querySelector("h2");
    expect(h2).toBeTruthy();
    expect(h2.textContent).toBe("Abstract");
    expect(abs.classList).toContain("introductory");
    expect(abs.querySelector("p")).toBeTruthy();
    const pill = doc.getElementById("respec-pill-warning");
    expect(pill).toBeFalsy();
  });

  it("warns if abstract is missing", async () => {
    const ops = makeStandardImsOps();
    ops.abstract = null;
    const doc = await makeRSDoc(ops);
    const pill = doc.getElementById("respec-pill-warning");
    expect(pill).toBeTruthy();
    expect(pill.textContent).toEqual("1");
    // ims/abstract will insert a blank, empty abstract
    // with class "remove" so it should be missing
    const abs = doc.getElementById("abstract");
    expect(abs).toBeFalsy();
  });
});
