/* 1EdTech styles and overrides */
const css = String.raw;

// prettier-ignore
export default css`@charset "UTF-8";
/* Base CSS for 1EdTech specifications. This builds on and in some cases
 * overrides the ReSpec and W3C/TR stylesheets:
 * - https://github.com/w3c/respec/assets/respec2.css
 * - https://www.w3.org/StyleSheets/TR/2016/base.css
 */
@import url(https://fonts.googleapis.com/css?family=Roboto|Roboto+Condensed|Source+Code+Pro);
/** variables ******************************************************************/
:root {
  --fgclr1: rgba(0, 0, 0, 1);
  --fgclr2: rgba(0, 90, 156, 1);
  --fgclr3: rgba(70, 130, 180, 1);
  --fgclr4: rgba(40, 100, 150, 1);
  --gray: rgba(200, 200, 200, 0.9);
  --lightgray: rgba(240, 240, 240, 1);
  --lightestgray: rgba(250, 250, 250, 0.8);
  --darkgray: rgba(180, 180, 180, 1);
}

/** fonts **********************************************************************/
body {
  font-family: 'Roboto', Arial, Helvetica, sans-serif;
}

pre, code, samp {
  font-family: 'Source Code Pro', monospace;
}

/** Header *********************************************************************/
header {
  border-bottom: 2px solid var(--gray);
  padding-bottom: 2em;
}

.header-top {
  display: -webkit-box;
  display: -ms-flexbox;
  display: flex;
  -webkit-box-orient: horizontal;
  -webkit-box-direction: normal;
      -ms-flex-flow: row nowrap;
          flex-flow: row nowrap;
  -webkit-box-pack: justify;
      -ms-flex-pack: justify;
          justify-content: space-between;
}

a#logo, a#ims-logo {
  text-decoration: none;
  border: 0;
}

h1.title {
  font-size: 200%;
}

div.subtitle {
  font-size: 150%;
  color: var(--fgclr2);
}

/* the copyright notice */
#cpr {
  margin-bottom: 1.5em;
  margin-top: 2.5em;
}

#cpr p {
  margin-top: 0em;
  margin-bottom: 0em;
}

/* the vertical status bar top left */
.statusPD {
  position: fixed;
  display: block;
  top: 0px;
  left: 0px;
  width: 300px;
  height: 30px;
  text-align: right;
  padding-top: 2px;
  padding-right: 2em;
  background-color: red;
  color: white;
  font-size: 20px;
  transform-origin: left top;
  transform: rotate(-90deg) translate(-100%, 0%);
  -ms-transform-origin: left top;
  -ms-transform: rotate(90deg);
  -webkit-transform-origin: left top;
  -webkit-transform: rotate(-90deg) translate(-100%, 0%);
  -moz-transform-origin: left top;
  -moz-transform: rotate(-90deg) translate(-100%, 0%);
  -o-transform-origin: left top;
  -o-transform: rotate(-90deg) translate(-100%, 0%);
  z-index: 12000;
}

.statusPD.final {
  background-color: blue;
}

/** Headings ******************************************************************/
h1, h2, h3, h4, h5, h6, dt {
  page-break-after: avoid;
  page-break-inside: avoid;
  font: 100% sans-serif;
  font-family: inherit;
  line-height: 1.2;
  -webkit-hyphens: manual;
      -ms-hyphens: manual;
          hyphens: manual;
}

h2, h3, h4, h5, h6 {
  margin-top: 3rem;
}

h1, h2, h3, h4 {
  color: var(--fgclr4);
  background: transparent;
}

h1 {
  font-size: 170%;
}

h2 {
  font-size: 140%;
}

h3 {
  font-size: 120%;
}

h4 {
  font-weight: bold;
}

h5 {
  font-style: italic;
}

h6 {
  font-variant: small-caps;
}

dt {
  font-weight: bold;
}

/** Linkage ******************************************************************/
a[href].internalDFN {
  color: var(--fgclr1);
  text-decoration: none;
  border-bottom: 1px var(--fgclr2) dotted;
}

a[href]:focus,
a[href]:hover {
  background: var(--lightgray);
}

a[href]:active {
  color: #C00;
  border-color: #C00;
}

/** Examples *******************************************************************/
.example {
  border: 1px solid var(--darkgray);
  counter-increment: example;
}

.example figcaption {
  background-color: var(--fgclr3);
  color: white;
}

/** Footer ******************************************************************/
section#revisionhistory table {
  margin-bottom: 3em;
}

div#endWarranty p {
  margin-top: 0.3em;
  margin-bottom: 0.3em;
}

div#endWarranty {
  margin-top: 6em;
  padding-top: 3em;
  border-top: 2px solid var(--gray);
  text-align: center;
}

/** tables *****************************************************************/
/* The default table style has gray border, with th bgclr being light gray */
table {
  border-collapse: collapse;
  word-wrap: normal;
  overflow-wrap: normal;
  -webkit-hyphens: manual;
      -ms-hyphens: manual;
          hyphens: manual;
  width: 100%;
  margin-top: 1.5em;
  margin-bottom: 1.5em;
  max-width: 50em;
  border: 1px solid var(--gray);
  /*margin-left: 0em;*/
}

td, th {
  padding-left: 1em;
  padding-right: 1em;
  padding-left: 1em;
  padding-right: 1em;
  text-align: left;
  text-align: start;
  vertical-align: top;
  border: 1px solid var(--gray);
}

th {
  font-weight: bold;
  background-color: var(--fgclr3);
  color: var(--lightgray);
  padding: 0.6em;
}

td {
  padding: 0.8em;
}

th > * {
  padding: 0;
  margin: 0;
}

/* specific table styles */
table#version-table, table#no-cell-borders {
  border: 1px solid var(--gray);
}

table#version-table td, table#no-cell-borders td {
  border: none;
}

table#version-table td {
  padding: 0.2em;
}

/* For when values are extra-complex and need formatting for readability */
td.pre, td code {
  white-space: pre;
  overflow: scroll;
}

/** Index Tables *****************************************************/
/* See also the data table styling section, which this effectively subclasses */
table.index {
  font-size: small;
  border-collapse: collapse;
  border-spacing: 0;
  text-align: left;
  margin: 1em 0;
}

table.index td,
table.index th {
  padding: 0.4em;
}

table.index tr:hover td:not([rowspan]),
table.index tr:hover th:not([rowspan]) {
  background: #f7f8f9;
}

/* The link in the first column in the property table (formerly a TD) */
table.index th:first-child a {
  font-weight: bold;
}

/** boxes *************************************************************/
.alert {
  border: 2px solid red;
  padding: 0.3em;
}

/** inlines *************************************************************/
dt > dfn {
  font-weight: bold;
}

/** "Link here" for section headings  *****************************************/
a[href].hidden-reveal::before {
  content: "›";
  text-decoration: none;
}

/* w3c/respec change in how section headers are formed */
:is(h2, h3, h4, h5, h6) + a.self-link::before {
  content: "›";
}

a.self-link {
  text-decoration: none;
}

a[href].hidden-reveal, a[href].hidden-reveal:visited,
a[href].self-link:visited, a[href].self-link:hover {
  opacity: 1;
  text-decoration: none;
}

/** Admonitions for section headings  *****************************************/
.admonition {
  margin-top: 1em;
  margin-bottom: 1em;
  margin: 1em 0;
  border-left-width: .5em;
  border-left-style: solid;
  padding: 0.5em 1.2em 0.5em;
  position: relative;
  clear: both;
}

.admonition .admon-top {
  padding-right: 1em;
  min-width: 7.5em;
  color: #e05252;
  text-transform: uppercase;
}

.admonition .note-title, .admonition .ednote-title {
  color: #2b2;
}

.admonition .warning-title, .admonition .ednote-title {
  color: #f22;
}

.admonition.issue {
  border-color: #e05252;
  background: #fbe9e9;
  counter-increment: issue;
  overflow: auto;
}

.admonition.note, .admonition.ednote {
  border-color: #52e052;
  background: #e9fbe9;
}

.admonition > p:first-child {
  margin-top: 0;
}

.admonition.warning {
  border-color: #f11;
  border-width: .2em;
  border-style: solid;
  background: #fbe9e9;
  padding-top: 1em;
}

.admonition .warning-title:before {
  content: "⚠";
  /*U+26A0 WARNING SIGN*/
  font-size: 3em;
  float: left;
  height: 100%;
  padding-right: .3em;
  vertical-align: top;
  margin-top: -0.5em;
}

/******************************************************************************
 * Overrides to W3C/TR/2016/base.css                                          *
 ******************************************************************************

/******************************************************************************/
/*                                   Body                                     */
/******************************************************************************/
body {
  -webkit-hyphens: auto;
      -ms-hyphens: auto;
          hyphens: auto;
  /* Colors */
  color: var(--fgclr1);
}

/******************************************************************************/
/*                                    Images                                  */
/******************************************************************************/
figure, .figure, .sidefigure {
  text-align: left;
}

.figure img, .sidefigure img, figure img,
.figure pre, .sidefigure pre, figure pre {
  display: unset;
}

.caption, figcaption, caption {
  display: block;
  padding: 0.5em 0 0.5em 0.5em;
}
`;
