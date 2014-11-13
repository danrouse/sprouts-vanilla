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
    this.root = this.selectedNode = new TreeNode({
        fromString: contents,
        options: this.options
    });

    // render
    this.draw();
    this.textElement.value = this.toString();
};
Tree.prototype = {
    /**
     * converts entire Tree structure to bracketed text
     *
     * @method toString
     * @return bracketed_text {String}
     **/
    toString: function() {
        return this.root.toString();
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
     * generates SVG and updates the DOM
     *
     * @method draw
     **/
    draw: function() {
        // generate SVG
        var svg = this.root.toSVG();

        // replace the element in the DOM
        if(this.treeElement.children.length) {
            this.treeElement.firstChild.remove();
        }
        this.treeElement.appendChild(svg);

        // bind UI events
        var that = this;
        svg.onclick = function(event) {
            // remove existing selection class
            if(that.selectedNode) {
                that.selectedNode.svg.classList.remove('selected');
            }

            // find first svg parent of click event target
            var target = event.target;
            while(target.nodeName !== 'svg') {
                target = target.parentNode;
            }
            
            // select target node
            target.classList.add('selected');
            that.selectedNode = target.treeNode;

            // update selected text area
            that.textElement.value = target.treeNode.toString();
        };
    }
};