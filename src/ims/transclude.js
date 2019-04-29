import { pub } from "core/pubsubhub";
import { toHTMLNodes } from "ims/utils";

export const name = "ims/transclude";

export async function run(conf) {  
  
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
  
  while(true) {
    var transclude = document.querySelector('script.transclude');
    
    if (transclude == null) { 
      break; 
    }
    
    if(!transclude.hasAttribute("data-id")) {
      pub("error", "transclude script element without data-id attribute");
      break;
    }
    
    var str = window[transclude.getAttribute("data-id")];
    
    if (str === undefined || typeof str !== 'string') {
      pub("error", "no transclude variable named '" + str + "' found in global scope");
      break;
    }
    
    var newNodes = toHTMLNodes(str);          
    
    for(var k=0; k<newNodes.length; k++) {         
      var clone = newNodes[k].cloneNode(true);
      transclude.parentNode.insertBefore(clone,transclude);
    }
    
    transclude.parentNode.removeChild(transclude);
    
  }
}

