describe("W3C — Abstract", function () {
    var MAXOUT = 5000
    ,   basicConfig = {
            editors:    [{ name: "Robin Berjon" }]
        ,   specStatus: "WD"
        ,   abstract:   $("<section id='abstract'>test abstract</section>")
        };
    it("should include an h2, set the class, and wrap the content", function () {
        var doc;
        runs(function () {
            makeRSDoc({ config: basicConfig }, function (rsdoc) { doc = rsdoc; });
        });
        waitsFor(function () { return doc; }, MAXOUT);
        runs(function () {
            var $abs = $("#abstract", doc);
            expect($abs.find("h2").length).toBeTruthy();
            expect($abs.find("h2").text()).toEqual("Abstract");
            expect($abs.hasClass("introductory")).toBeTruthy();
            expect($abs.find("p").length).toBeTruthy();
            flushIframes();
        });
    });
    // XXX we should also test that an error is sent when absent
});