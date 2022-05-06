var md=`

## Introduction

Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore
magna aliqua.

Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit [[ISO8601]]in voluptate velit esse cillum dolore eu fugiat nulla pariatur.

Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

### Subheading

## ActivityObject

An <code>ActivityState</code> object is to be used by the EPUB to store stateful information on behalf of the student.

Examples of stateful data might be an incomplete multiple choice activity, an incomplete essay or a even the current location in a streaming video.

The properties of the ActivityState object are defined below.

Name | Data&nbsp;Type | Required | Description
--- | --- | --- | ---
type | String | yes | MUST be set to 'ActivityState'
createdTime | ISO 8601 | yes | The date when the ActivityState object was created. The format MUST be <code>yyyy-MM-ddTHH:mm:ss.SSSZ</code> [[ISO8601]].
activityId | String | yes | References the <code>data-activityId</code> value in the EPUB markup
data | Object | yes | An object used to store data. The object structure is purposively arbitrary; the <code>profile</code> property below can be used to inform Reading Systems of the object's format.
profile | String | no | A standards-based or vendor-specific identifier that can be used to specify the format of the <code>data</code> object and/or indicate the availability of one or more <code>extensions</code> properties. For example, "ims.qti_v2p1.choice" might be used to specify that the <code>data</code> object conforms to the schema of a qti 2.1 Choice Activity.
extensions | Object | no | A map of arbitrary vendor-specific extensions to support non-standard reading system functionality. Keys should start with <code>vnd.</code> followed by the vendor name to avoid naming conflicts.

### Admonitions (have to use HTML)

<aside class="note">Example of text content of note aside</aside>
<aside class="warning">Example of text content of warning aside</aside>
<aside class="issue">Example of text content of issue aside</aside>

### Figures (have to use HTML)

<figure class="example">
  <pre>
    {
      "type": "ActivityState",
      "createdTime": new Date().toISOString(),
      "activityId": "unit_1_activity_5",
      "data": {
        "choice": "blue",
        "directionLine": "What color is the sky?",
        "choices": ["blue","red","green"],
        "correct": "blue"
      },
      "profile": "ims.qti_v2p1.choice",
      "extensions": {
        "vnd.vst.timesync_offset": 42000
      }
    }
  </pre>
  <figcaption>Example of the ActivityState object.</figcaption>
</figure>

`;
