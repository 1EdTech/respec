define(["exports", "core/pubsubhub", "ims/utils"], function (exports, _pubsubhub, _utils) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.name = undefined;
  exports.run = run;
  const name = exports.name = "ims/transclude";

  function run(conf, doc, cb) {

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
    var transcludes = doc.querySelectorAll('script.transclude');
    for (var i = 0; i < transcludes.length; i++) {

      var script = transcludes[i];
      console.log(script);

      if (!script.hasAttribute("data-id")) {
        (0, _pubsubhub.pub)("error", "transclude script element without data-id attribute");
        continue;
      }

      var str = window[script.getAttribute("data-id")];
      //console.log(">>"+str);        

      if (str === undefined || typeof str !== 'string') {
        (0, _pubsubhub.pub)("error", "no transclude variable named '" + str + "' found in global scope");
        continue;
      }

      var newNodes = (0, _utils.toHTMLNodes)(str);

      for (var k = 0; k < newNodes.length; k++) {
        var clone = newNodes[k].cloneNode(true);
        //console.log("==>"+clone.textContent);
        script.parentNode.insertBefore(clone, script);
      }
    }

    // transcludes = doc.querySelectorAll('script.transclude');
    // for(var i=0; i<transcludes.length; i++) {
    //   var script = transcludes[i];
    //   script.parentNode.removeChild(script);
    // }  

    cb();
  }
});
//# sourceMappingURL=transclude.js.map