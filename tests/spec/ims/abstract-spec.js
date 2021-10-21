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
  });
});
