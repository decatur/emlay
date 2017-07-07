# emlay – a minimalist graph drawing editor in JavaScript
See [online demo](https://decatur.github.io/emlay) for both documentation and demonstration.

Input to emlay is a graph composed of nodes and links (edges). Nodes can be embedded in parent nodes (aka composition or grouping). 

Currently only the position can be edited. Insertion or deletion of nodes or links is not supported.

## Dependencies
emlay is a one file library and only uses [d3v4](https://www.npmjs.com/package/d3v4) and no other third-party software.

## Related Work
Other libraries provide online shape layout drawing, including JointJS, mxgraph and yFiles.
These range from completely free to strictly commercial. I have found some of these buggy and/or too slow for bigger use cases.
