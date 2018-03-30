import { pub } from "core/pubsubhub";
import { toHTMLNode } from "ims/utils";

export const name =  "ims/boilerplate";

export function run(conf, doc, cb) {
  
  doc.title = conf.specTitle + " " + conf.specVersion + " " + conf.specStatus;
  
  var body = doc.body;

  var header = doc.createElement("header");
  var headerTop = doc.createElement("div");
  headerTop.setAttribute("class", "header-top");

  var hd = toHTMLNode(`<h1 class='title'>${conf.specTitle}</h1>`);    
  headerTop.appendChild(hd);

  const imgURL = "https://www.imsglobal.org/sites/default/files/IMSglobalreg2_2.png";    
  var logo = toHTMLNode("<a href='https://www.imsglobal.org' id='logo'><img src='"+imgURL+"' alt='IMS logo'></img></a>");    
  headerTop.appendChild(logo);

  header.appendChild(headerTop);
  
  var release = toHTMLNode(`<div class='subtitle'>${conf.specStatus}<br/>Version ${conf.specVersion}</div>`);
  header.appendChild(release);

  var statusPD = toHTMLNode(`<span class='statusPD' data-content="${conf.specStatus}">${conf.specStatus}</span>`);
  header.appendChild(statusPD);

  var versionTable = `<table id='version-table' title='Version/Release Details' summary='Details about the version and release.'>
  <tbody><tr>
  <td>Date Issued:</td><td>${conf.specDate}</td></tr>
  <td>Status:</td><td>${getStatusString(conf)}</td></tr>
  <tr><td>This version:</td>
  <td><a href='${conf.thisURL}'>${conf.thisURL}</a></td></tr>`;
  
  if(conf.specNature === "normative") {
    versionTable += `<tr><td>Latest version:</td>
    <td><a href='${conf.latestURI}'>${conf.latestURI}</a></td></tr>
    <tr><td>Errata:</td>
    <td><a href='${conf.errataURL}'>${conf.errataURL}</a></td></tr>`;  
  }
  versionTable += `</tbody></table>`;
  header.appendChild(toHTMLNode(versionTable));

  var ipr = toHTMLNode(`<div id="ipr">
  <h2>IPR and Distribution Notices</h2>
  <p>Recipients of this document are requested to submit, with their comments, notification of any relevant patent claims or other intellectual property rights of which they may be aware that might be infringed by any implementation of the specification set forth in this document, and to provide supporting documentation.</p>
  <p>IMS takes no position regarding the validity or scope of any intellectual property or other rights that might be claimed to pertain to the implementation or use of the technology described in this document or the extent to which any license under such rights might or might not be available; neither does it represent that it has made any effort to identify any such rights. Information on IMS's procedures with respect to rights in IMS specifications can be found at the IMS Intellectual Property Rights web page: <a href="http://www.imsglobal.org/ipr/imsipr_policyFinal.pdf">http://www.imsglobal.org/ipr/imsipr_policyFinal.pdf</a>.</p>
  <p>Copyright © ${(new Date()).getFullYear()} IMS Global Learning Consortium. All Rights Reserved.</p>
  <p>Use of this specification to develop products or services is governed by the license with IMS found on the IMS website: <a href="http://www.imsglobal.org/speclicense.html">http://www.imsglobal.org/speclicense.html</a>.</p>
  <p>Permission is granted to all parties to use excerpts from this document as needed in producing requests for proposals.</p>
  <p>The limited permissions granted above are perpetual and will not be revoked by IMS or its successors or assigns.</p>
  <p>THIS SPECIFICATION IS BEING OFFERED WITHOUT ANY WARRANTY WHATSOEVER, AND IN PARTICULAR, ANY WARRANTY OF NONINFRINGEMENT IS EXPRESSLY DISCLAIMED. ANY USE OF THIS SPECIFICATION SHALL BE MADE ENTIRELY AT THE IMPLEMENTER'S OWN RISK, AND NEITHER THE CONSORTIUM, NOR ANY OF ITS MEMBERS OR SUBMITTERS, SHALL HAVE ANY LIABILITY WHATSOEVER TO ANY IMPLEMENTER OR THIRD PARTY FOR ANY DAMAGES OF ANY NATURE WHATSOEVER, DIRECTLY OR INDIRECTLY, ARISING FROM THE USE OF THIS SPECIFICATION.</p>
  <p>Public contributions, comments and questions can be posted here: <a href="http://www.imsglobal.org/forums/ims-glc-public-forums-and-resources">http://www.imsglobal.org/forums/ims-glc-public-forums-and-resources</a>.</p>
  </div>`);
  header.appendChild(ipr);

  var copyRight = toHTMLNode(`<div id="cpr">      
      <p>© ${(new Date()).getFullYear()} IMS Global Learning Consortium, Inc. All Rights Reserved.</p>        
      <p>Trademark information: <a href="http://www.imsglobal.org/copyright.html">http://www.imsglobal.org/copyright.html</a></p>
    </div>`);
    
  header.appendChild(copyRight);

  if(body.firstChild) {
    body.insertBefore(header, body.firstChild);  
  } else {
    body.appendChild(header);
  }
  
  var footer = doc.createElement("footer");
  
  var endWarranty = toHTMLNode(`<div id="endWarranty">
  <p>IMS Global Learning Consortium, Inc. ("IMS Global") is publishing the information contained in this document ("Specification") for purposes of scientific, experimental, and scholarly collaboration only.</p>
  <p>IMS Global makes no warranty or representation regarding the accuracy or completeness of the Specification.</p>
  <p>This material is provided on an "As Is" and "As Available" basis.</p>
  <p>The Specification is at all times subject to change and revision without notice.</p>
  <p>It is your sole responsibility to evaluate the usefulness, accuracy, and completeness of the Specification as it relates to you.</p>
  <p>IMS Global would appreciate receiving your comments and suggestions.</p>
  <p>Please contact IMS Global through our website at http://www.imsglobal.org.</p>
  <p>Please refer to Document Name: ${conf.specTitle.replace("<br/>", " ")} ${conf.specVersion} </p>
  <p>Date: ${conf.specDate}</p>
  <div>`);
  footer.appendChild(endWarranty);

  doc.body.appendChild(footer);

  cb();
}

function getStatusString(conf) {
  //specStatusString: an override of the default descriptions
  if(conf.specStatusString) {
    return conf.specStatusString;
  }
  //specStatus: IMS Base Document, IMS Candidate Final (Public) or IMS Final Release
  switch(conf.specStatus) {
    case 'IMS Base Document': return "This document is for review and comment by IMS Contributing Members.";
    case 'IMS Candidate Final': return "This document is for review and adoption by the IMS membership.";
    case 'IMS Candidate Final Public': return "This document is for review and adoption by the IMS membership.";
    case 'IMS Final Release': return "This document is made available for adoption by the public community at large.";
    default: 
      pub("warn", "Unrecognized specStatus, please use one of 'IMS Base Document', 'IMS Candidate Final (Public)' or 'IMS Final Release'");
      return "specStatus ERROR";
  }
  
}
