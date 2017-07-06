/**
 * Inspired by https://bl.ocks.org/mbostock/22994cc97fefaeede0d861e6815a847e
 */
 
(function() {
    "use strict"

window.embedded_layout = {
    create: function() {
        return new EmbeddedLayout()
    }
};

function Port(desc) {
    this.orientation = desc.orientation;
    this.cssClass = desc.cssClass;
    
    if ( ['top', 'bottom', 'left', 'right'].indexOf(this.orientation) == -1 ) {
        throw new Error('Invalid port orientation: ' + this.orientation)
    }
    
}

Port.prototype.append = function(parentDomElement, model) {
    var selection = d3.select(parentDomElement).append("rect");
    
    selection.classed(this.cssClass, true)

    if ( this.orientation == 'top' ) {
        selection
            .attr("width", 15)
            .attr("height", 7)
    } else if ( this.orientation == 'bottom' ) {
        selection
            .attr("width", 15)
            .attr("height", 7)
    } else if ( this.orientation == 'left' ) {
        selection
            .attr("width", 7)
            .attr("height", 15)
    } else if ( this.orientation == 'right' ) {
        selection
            .attr("width", 7)
            .attr("height", 15)
    }

    return selection.node()
}

Port.prototype._attachConnectBehaviour = function(embeddedLayout, domElement) {
    d3.select(domElement)
        .call(d3.drag()
            .on("start", function() {
                var bcr = embeddedLayout.svgElement.getBoundingClientRect();
                embeddedLayout.createLinkSelection = embeddedLayout.linksSelection.append('line')
                    .attr('stroke', '#222')
                    .attr('stroke-width', 3)
                    .attr('x1', d3.event.sourceEvent.x-bcr.left)
                    .attr('y1', d3.event.sourceEvent.y-bcr.top)
                    .attr('x2', d3.event.sourceEvent.x-bcr.left)
                    .attr('y2', d3.event.sourceEvent.y-bcr.top)
            })
            .on("drag", function() {
                var bcr = embeddedLayout.svgElement.getBoundingClientRect();
                embeddedLayout.createLinkSelection
                    .attr('x2', d3.event.sourceEvent.x-bcr.left)
                    .attr('y2', d3.event.sourceEvent.y-bcr.top)
            })
            .on("end", function() {
                embeddedLayout.createLinkSelection.node().parentNode.removeChild(embeddedLayout.createLinkSelection.node())
            }));
}

Port.prototype.update = function(domElement, model) {
    var selection = d3.select(domElement);
    if ( this.orientation == 'top' ) {
        selection
            .attr("x", (model.width-15)/2)
            .attr("y", -7)
    } else if ( this.orientation == 'bottom' ) {
        selection
            .attr("x", (model.width-15)/2)
            .attr("y", model.height)
    } else if ( this.orientation == 'left' ) {
        selection
            .attr("x", -7)
            .attr("y", (model.height-15)/2)
    } else if ( this.orientation == 'right' ) {
        selection
            .attr("x", model.width)
            .attr("y", (model.height-15)/2)
    }
}

Port.prototype.attachPosition = function(model) {
    if ( this.orientation == 'top' ) {
        return { x: model.width/2, y:-7/2 }
    } else if ( this.orientation == 'bottom' ) {
        return { x:model.width/2, y:model.height+7/2 }
    } else if ( this.orientation == 'left' ) {
        return { x:-7/2, y:model.height/2 }
    } else if ( this.orientation == 'right' ) {
        return { x:model.width+7/2, y:model.height/2 }
    }
}

function GraphModel(rawGraphModel) {
    console.assert(typeof rawGraphModel ==='object')
    var self = this;
    this.rawGraphModel = rawGraphModel;
    this.links = {};
    this.nodes = {};
    
    Object.keys(rawGraphModel.nodes).forEach(function(id) {
        var rawNode = rawGraphModel.nodes[id];
        var node = self.nodes[id] = { id: id, links:[] };
        ['x', 'y', 'width', 'height', 'parentId', 'type', 'label', 'userData'].forEach(function(key) {
            node[key] = rawNode[key]
        })
        
        node.x = node.x || 0
        node.y = node.y || 0
        node.width = node.width || 100
        node.height = node.height || 50
    })
    
    Object.keys(self.nodes).forEach(function(id) {
        var node = self.nodes[id];
        node.children = self._getChildren(id, false)
        node.desendants = self._getChildren(id, false)
    })
    
    Object.keys(rawGraphModel.links).forEach(function(id) {
        self.addLink(id, rawGraphModel.links[id])
    })
    
}

GraphModel.prototype.addLink = function(id, linkModel) {
    var self = this;
    this.links[id] = linkModel

    function refAnchestors(nodeId) {
        var node;
        do {
            node = self.nodes[nodeId];
            node.links.push(id);
            nodeId = node.parentId;
        } while (nodeId);
    }
    
    refAnchestors(linkModel.source.id)
    refAnchestors(linkModel.target.id)
}

GraphModel.prototype._getChildren = function(nodeId, deep) {
    var self = this;
    var children = [];
    Object.keys(this.nodes).forEach(function(id) {
        var model = self.nodes[id];
        if ( model.parentId == nodeId ) {
            children.push(model);
            if ( deep ) children = children.concat(model.self._getChildren(model.id, true))
        }
    })
    return children
}

function EmbeddedLayout() {
    this.graphModel = undefined;
    this._nodeTemplates = undefined;
    this.nodesSelection = undefined;
    this.svgElement = undefined;
    this.linksSelection = undefined;
    this.createLinkSelection = undefined;
}

EmbeddedLayout.prototype.model = function(rawGraphModel) {
    if ( this.svgElement ) this.svgElement.textContent = ''
    this.graphModel = new GraphModel(rawGraphModel);
    return this;
}

EmbeddedLayout.prototype.nodeTypes = function(nodeTemplates) {
    for ( var id in this.graphModel.nodes ) {
        var node = this.graphModel.nodes[id];
        
        if ( !node.type ) {
            throw Error('You must specify a type for node ' + id);
        }
        
        if ( !(node.type in nodeTemplates) ) {
            throw Error('You must specify a template for type ' + node.type);
        }
    }
    
    this._nodeTemplates = {};
    for ( var key in nodeTemplates ) {
        var template = nodeTemplates[key];
        var clone = { ports: {}, cssClass: template.cssClass };
        for ( var portKey in template.ports ) {
            clone.ports[portKey] = new Port(template.ports[portKey])
        }
        this._nodeTemplates[key] = clone;
    }
    
    return this
}

EmbeddedLayout.prototype.writeToModel = function() {
    var graphModel = this.graphModel;
    var rawGraphModel = this.graphModel.rawGraphModel;
    
    Object.keys(rawGraphModel.nodes).forEach(function(id) {
        var node = rawGraphModel.nodes[id];
        node.type = graphModel.nodes[id].type;
        ['x', 'y', 'width', 'height'].forEach(function(key) {
            node[key] = Math.round(100*graphModel.nodes[id][key])/100
        })
    })
}

/**

*/
EmbeddedLayout.prototype.show = function(svgElement) {
    var self = this;
    
    if (typeof(svgElement) == 'string') svgElement = document.getElementById(svgElement)
    
    self.svgElement = svgElement;
    
    self.nodesSelection = d3.select(svgElement).append('g');
    self.linksSelection = d3.select(svgElement).append('g');
    
    Object.keys(this.graphModel.nodes).forEach(function(id) {
        var model = self.graphModel.nodes[id];
        var parentSelection = ( model.parentId?self.nodesSelection.select('#' + model.parentId):self.nodesSelection);
        self.createShape(parentSelection, model)
    })
    
    Object.keys(this.graphModel.links).forEach(function(id) {
        self.createLink(id);
    })
}

EmbeddedLayout.prototype.createShape = function(parentSelection, model) {
    var self = this;
    var shapeTemplate = self._nodeTemplates[model.type];
    
    var shapeSelection = parentSelection.selectAll("#" + model.id)
      .data([model])
      .enter().append('g')
        .attr("id", model.id)
        .call(d3.drag()
            .on("start", function(_model) {
                // Note that _model = model and this is the DOMElement
                self.dragstarted(this, model)
            })
            .on("drag", function dragged(_model) {
                self.dragged(this, model)
            })
            .on("end", function dragended(_model) {
                self.dragended(this, model)
            }));

    var rect = shapeSelection.append("rect")
        .attr("fill", function(d, i) { return '#eee'; })
        .attr("stroke-width", function(d, i) { return 2; })
        .attr("stroke", function(d, i) { return '#444'; })
    
    if ( shapeTemplate.cssClass ) {
        rect.classed(shapeTemplate.cssClass, true)
    }
        
    var parentDomElement = shapeSelection.node();
    
    for ( var portKey in shapeTemplate.ports ) {
        var port = shapeTemplate.ports[portKey];
        var domElement = port.append(parentDomElement, model);
        port._attachConnectBehaviour(self, domElement)
    }

    shapeSelection.append("text")
        .text(model.label || model.id)
        .attr('y', 15)
        .attr('text-anchor', 'middle')
        .attr('font-size', 'large')
    
    var count = 0;     
    for ( var prop in model.userData ) {
        count++
        shapeSelection.append("text")
            .text(prop + ': ' + model.userData[prop])
            .attr('y', 15+count*20)
            .attr('text-anchor', 'left')
    }
        
    this.updateShape(model)
}

EmbeddedLayout.prototype.updateShape = function(model) {
    var shapeSelection = this.nodesSelection.select("#" + model.id);

    shapeSelection.attr("transform", "translate(" + model.x + "," + model.y + ")")
      
    d3.select(shapeSelection.node().firstChild)
        .attr("width", model.width)
        .attr("height", model.height)

    var domElement = shapeSelection.node().firstChild.nextSibling;
    var shapeTemplate = this._nodeTemplates[model.type];
    for ( var portKey in shapeTemplate.ports ) {
        var port = shapeTemplate.ports[portKey];
        port.update(domElement, model)
        domElement = domElement.nextSibling
    }
        
    d3.select(domElement)
        .attr('x', model.width/2)
}

EmbeddedLayout.prototype.createLink = function(linkId) {
    var linkSelection = this.linksSelection.append('line');
    
    linkSelection        
            .attr('id', linkId)
            .attr('stroke', '#222')
            .attr('stroke-width', 3)
            .attr('stroke-linecap', 'round')
            .on('mouseenter', function() {
                linkSelection.attr('stroke-width', 7)
            })
            .on('mouseleave', function() {
                linkSelection.attr('stroke-width', 3)
            });
    
    this.updateLink(linkId);
}

EmbeddedLayout.prototype.updateLink = function(linkId) {
    var linkModel = this.graphModel.links[linkId];
    var self = this;
    
    function setPoint(modelId, port, index) {
        var model = self.graphModel.nodes[modelId];
        var ctm = self.nodesSelection.select('#' + model.id).node().getCTM();
        var portPos = self._nodeTemplates[model.type].ports[port].attachPosition(model);
        self.linksSelection.select('#' + linkId)
            .attr('x' + index, ctm.e + portPos.x)
            .attr('y' + index, ctm.f + portPos.y)
    }
    
    setPoint(linkModel.source.id, linkModel.source.port, 1)
    setPoint(linkModel.target.id, linkModel.target.port, 2)
}

EmbeddedLayout.prototype.updateLinks = function(nodeModel) {
    var self = this;
    nodeModel.links.forEach(function(linkId) {
        self.updateLink(linkId)
    })
}

EmbeddedLayout.prototype.fitEmbeds = function(parentModel) {
    var padding = {left:10, top:30, right:10, bottom:10};
    var left   = Number.MAX_VALUE;
    var top    = Number.MAX_VALUE;
    var right  = Number.MIN_VALUE;
    var bottom = Number.MIN_VALUE;
    
    parentModel.children.forEach(function(embedModel) {
        left = Math.min(left, embedModel.x - padding.left);
        top  = Math.min(top,  embedModel.y - padding.top );
        right  = Math.max(right,  embedModel.x + embedModel.width  + padding.right);
        bottom = Math.max(bottom, embedModel.y + embedModel.height + padding.bottom);
    })
    
    var self = this;
    parentModel.children.forEach(function(embedModel) {
        embedModel.x -= left
        embedModel.y -= top
        self.updateShape(embedModel)
    })
    
    parentModel.x += left
    parentModel.y += top
    parentModel.width  = right-left
    parentModel.height = bottom-top

    this.updateShape(parentModel)
    this.updateLinks(parentModel)
    
    return { x:left, y:top }
}
    
EmbeddedLayout.prototype.dragstarted = function(node, d) {
    d3.select(node).classed("active", true).raise()
}

EmbeddedLayout.prototype.dragged = function(node, nodeModel) {
    nodeModel.x = d3.event.x
    nodeModel.y = d3.event.y

    while ( nodeModel.parentId ) {
        nodeModel = this.graphModel.nodes[nodeModel.parentId]
        this.fitEmbeds(nodeModel);
    }
    
    this.updateShape(nodeModel)
    this.updateLinks(nodeModel)

}

EmbeddedLayout.prototype.dragended = function(node, d) {
  d3.select(node).classed("active", false);
}

})();
