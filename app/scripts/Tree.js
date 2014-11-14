'use strict';

/**
 * Tree master object
 * provides a root object and DOM interface
 *
 * @class Tree
 * @constructor
 * @param contents {String} bracketed text to parse into the tree
 * @param initialOptions {Object} display options
 **/
var Tree = function(contents, initialOptions) {
    /**
     * display options
     *
     * @property options {Object}
     **/
    this.options = Object.create(initialOptions) || {};

    /**
     * DOM element containing the tree SVG
     *
     * @property treeElement {Element}
     **/
    this.treeElement = document.getElementById('sprouts-tree');

    /**
     * DOM element containing the bracketed text representation of the tree
     *
     * @property treeElement {Element}
     **/
    this.textElement = document.getElementById('sprouts-text');

    /**
     * root node
     *
     * @property root {TreeNode}
     **/
    /**
     * current selection
     *
     * @property selectedNode {TreeNode}
     **/
    this.root = new TreeNode({
        fromString: contents,
        options: this.options
    });

    // render
    this.select(this.root, true);
};
Tree.prototype = {
    /**
     * converts entire Tree structure to bracketed text
     *
     * @method toString
     * @param headsOnly {Boolean} only output heads, no brackets or phrase names
     * @return bracketed_text {string}
     **/
    toString: function(headsOnly) {
        return this.root.toString(headsOnly);
    },

    /**
     * generates PNG of the entire tree
     *
     * @method toPNG
     * @return image {String} dataURL image/png
     **/
    toPNG: function() {
        return this.root.toPNG();
    },

    /**
     * selects a node in the tree
     *
     * @method select
     * @param targetNode {TreeNode}
     * @param redrawTree {Boolean} redraw the tree
     * @param redrawText {Boolean}
     * @return targetNode {TreeNode} selected node
     **/
    select: function(targetNode, redrawTree, redrawText) {
        if(redrawTree) { this.draw(); }

        // remove existing selection class
        if(this.selectedNode) {
            this.selectedNode.svg._attrs({'class': ''});
        }

        // select target node
        targetNode.svg._attrs({'class': 'selected'});
        this.selectedNode = targetNode;

        // update UI action buttons
        // TODO: make a better system for this
        if(targetNode.parent) {
            document.getElementById('button-startMovement').style.display = 'block';
        } else {
            document.getElementById('button-startMovement').style.display = 'none';
        }

        // update selected text area
        if(redrawText !== false) {
            this.textElement.innerHTML = targetNode.toString(false, true);
        }

        return targetNode;
    },

    /**
     * generates SVG and updates the DOM
     *
     * @method draw
     **/
    draw: function() {
        // generate SVG
        var svg = this.root.toSVG();

        // replace the element in the DOM
        if(this.treeElement.children.length) {
            this.treeElement.removeChild(this.treeElement.firstChild);
        }
        this.treeElement.appendChild(svg);

        // bind UI events
        var that = this;
        svg.onclick = function(event) {
            // find first svg parent of click event target
            var target = event.target;
            while(target.nodeName !== 'svg') {
                target = target.parentNode;
            }

            that.select(target.treeNode);
        };
    }
};