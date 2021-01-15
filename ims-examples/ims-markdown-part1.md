var mdbody=`

<md-only>

Anything you put inside here will be removed from the
rendered document.

</md-only>

## Abstract

This is the abstract text.

## Introduction {#intro}

This is the introduction text. The section has a custom <code>id="intro"</code>.

<pre class="example" title="How to override generated id in markdown">

## Introduction {#intro}

</pre>

You can use nested markdown lists, but be careful about indentation. In this example, the first item must be indented to start the list.

  - List item
    1. List item
      - List item

<pre class="example" title="How to nest markdown lists">

You can use...

  - List item
    1. List item
      - List item

</pre>

### Use Cases & Scope {#use-cases}

This is the use cases & scope text. The section has a custom <code>id="use-cases"</code>.

### Terminology

This is the terminology text.

### Document Set

This is the list of documents in this spec.

### Conformance

`;
