define(["exports", "core/pubsubhub"], function (_exports, _pubsubhub) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.run = run;
  _exports.name = void 0;
  const name = "ims/biblio";
  /* 
  * Fetch the online ims-biblio json and append the data to conf.localBiblio.
  * This approach allows us to reuse the W3C biblio logic & implementation untouched. 
  * The effect is that we have three levels of sources for biblio entries: 
  * - localBiblio
  * - ims-biblio on purl.imsglobal.org
  * - specref.org
  */

  _exports.name = name;

  async function run(conf) {
    var imsBiblioURL = "https://purl.imsglobal.org/spec/ims-biblio.json";

    if (conf.overrideIMSbiblioLocation) {
      imsBiblioURL = conf.overrideIMSbiblioLocation;
    }

    if (!conf.disableFetchIMSbiblio) {
      //console.log("fetching ims biblio...");
      fetch(imsBiblioURL, {
        mode: 'cors'
      }).then(function (response) {
        if (response.ok) {
          return response.json();
        }

        throw new Error(response.statusText);
      }).then(function (json) {
        //TODO invalid json should be caught here
        //JSON.stringify(conf.localBiblio) --> throws error?
        //TODO we might want to worry about dupes and precedence
        conf.localBiblio = Object.assign(conf.localBiblio, json);
      }).catch(function (error) {
        console.log("imsbiblio error: " + error.toString());
        (0, _pubsubhub.pub)("warning", error.toString());
      });
    }
  }
});
//# sourceMappingURL=biblio.js.map