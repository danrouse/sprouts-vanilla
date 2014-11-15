/* global _download, _listen, TreeNode */
'use strict';

/**
 * UI master object
 * provides a root object and DOM interface
 *
 * @class UserInterface
 * @constructor
 * @param rootNode {TreeNode} root node of the tree
 **/
var UserInterface = function(rootNode) {
    /**
     * root node of the tree
     *
     * @property tree {TreeNode}
     **/
    this.tree = rootNode;

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
     * node to move. Next node selected will be target.
     *
     * @property nodeToMove {TreeNode}
     **/
    this.nodeToMove = null;

    /**
     * current selection
     *
     * @property selectedNode {TreeNode}
     **/
    this.selectedNode = null;

    this.fonts = ['Open Sans', 'Arial', 'Times New Roman', 'Impact', 'Garamond', 'Comic Sans MS', 'Courier New'];

    this.init();
};
UserInterface.prototype = {
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
        var svg = this.tree.toSVG();

        // replace the element in the DOM
        if(this.treeElement.children.length) {
            this.treeElement.removeChild(this.treeElement.firstChild);
        }
        this.treeElement.appendChild(svg);

        // reapply UI styles
        if(this.nodeToMove) {
            this.nodeToMove.svg._attrs({'class': 'moving'});
        } else if(this.selectedNode) {
            this.selectedNode.svg._attrs({'class': 'selected'});
        }

        // bind UI events
        var that = this;
        svg.onclick = function(event) {
            // find first svg parent of click event target
            var target = event.target;
            while(target.nodeName !== 'svg') {
                target = target.parentNode;
            }

            if(that.nodeToMove) {
                that.select(that.nodeToMove.moveTo(target.treeNode), true);
                that.nodeToMove = null;
            } else {
                that.select(target.treeNode);
            }
        };
    },

    toggleSidebar: function(event, target) {
        var sidebar = document.getElementById('sidebar');
        if(sidebar.className === 'sidebar collapsed') {
            sidebar.className = 'sidebar';
            target.firstElementChild.firstElementChild.setAttribute('xlink:href', '#icon-left');
        } else {
            sidebar.className = 'sidebar collapsed';
            target.firstElementChild.firstElementChild.setAttribute('xlink:href', '#icon-right');
        }
    },

    toggleCollapsible: function() {
        // dataset won't hold true booleans
        if(this.dataset.collapsed !== 'true') {
            console.log('hiding');
            this.nextElementSibling.style.display = 'none';
            this.dataset.collapsed = 'true';
            this.firstChild.firstChild.setAttribute('xlink:href', '#icon-plus');
        } else {
            console.log('showing');
            this.nextElementSibling.style.display = 'block';
            this.dataset.collapsed = false;
            this.firstChild.firstChild.setAttribute('xlink:href', '#icon-minus');
        }
    },

    addChild: function() {
        var child = this.selectedNode.addChild('XP');
        this.select(child, true);
    },

    removeNode: function() {
        var newSelection = this.selectedNode.parent;
        for(var i in newSelection.children) {
            if(newSelection.children[i] === this.selectedNode) {
                newSelection.children.splice(i, 1);
                break;
            }
        }

        this.select(newSelection, true);
    },

    startMovement: function() {
        var target = this.selectedNode;
        if(!this.nodeToMove) {
            this.nodeToMove = target;
            target.svg._attrs({ 'class': 'moving' });
        } else {
            this.nodeToMove = null;
            target.svg._attrs({ 'class': 'selected' });
        }
    },

    saveSVG: function() {
        var slug = this.tree.toString(true),
            svg = this.tree.svg,
            xml = '<svg xmlns="http://www.w3.org/2000/svg" width="' + svg.offsetWidth +
                '" height="' + svg.offsetHeight + '">' + svg.innerHTML + '</svg>';

        // make slug filename-friendly
        slug = slug.toLowerCase().replace(/\s+/g, '-').substr(0,32);

        _download('data:image/svg+xml,' + encodeURIComponent(xml), 'sprouts-' + slug + '.svg');
    },

    savePNG: function() {
        var slug = this.tree.toString(true);

        // make slug filename-friendly
        slug = slug.toLowerCase().replace(/\s+/g, '-').substr(0,32);

        _download(this.tree.toPNG(), 'sprouts-' + slug + '.png');
    },

    /***
     * Event handlers
     **/
    handleClick: function(event) {
        var target = event.target;
        while(target.parentNode && !target.dataset.action) {
            target = target.parentNode;
        }
        // get target action
        var action = this[target.dataset.action];
        if(typeof action === 'function') { action.bind(this)(event, target); }
    },

    handleTextUpdate: function(event) {
        // check if text was really updated
        if(this.textElement.lastText &&
           this.textElement.lastText === this.textElement.innerText &&
           event.type !== 'blur') {
            return;
        }
        var parent = this.selectedNode.parent;

        // create new node from contents
        var newNode = new TreeNode({
            fromString: this.textElement.innerText,
            options: this.tree.options
        });

        if(parent) {
            // replace reference in the parent
            for(var i in parent.children) {
                if(parent.children[i] === this.selectedNode) {
                    parent.children[i] = newNode;
                }
            }

            // reference parent in the new node
            newNode.parent = parent;
        } else {
            // replace root
            this.tree = newNode;
        }

        // update selection and redraw
        this.select(newNode, true, (event.type === 'blur' || event.type === 'paste'));
        // var selection = window.getSelection(),
        //     rangeBefore = selection.getRangeAt(0).startOffset;
        // tree.select(newNode, true, false);
        // var rangeAfter = selection.getRangeAt(0).startOffset;
        // var targetTextNode = this.childNodes[rangeAfter],
        //     targetRange = document.createRange();
        // console.log('target node offset', rangeBefore, rangeAfter, targetTextNode);
        // targetRange.selectNodeContents(targetTextNode);
        // console.log('new range', targetTextNode.nodeType);
        // //targetRange.setStart(targetTextNode, rangeBefore);
        // targetRange.collapse(true);
        // selection.removeAllRanges();
        // selection.addRange(targetRange);

        this.textElement.lastText = this.textElement.innerText;
    },

    handleGlobalKeypress: function(event) {
        if(event.target.nodeName !== 'BODY') { return; }

        var selectedNode = this.selectedNode,
            parent = selectedNode.parent,
            siblings = parent ? parent.children : null,
            target, index;

        switch(event.keyCode) {
            case 37:
                // left arrow: select sibling to the left
                if(siblings) {
                    index = siblings.indexOf(this.selectedNode);
                    if(index > 0) {
                        target = siblings[index - 1];
                    }
                }
                if(!target) {
                    // select first child
                    if(selectedNode.children.length) {
                        target = selectedNode.children[0];
                    }
                }
                
                if(target) { this.select(target); }
                break;

            case 38:
                // up arrow: select parent
                if(selectedNode.parent) {
                    this.select(selectedNode.parent);
                }
                break;

            case 39:
                // right arrow: select sibling to the right
                if(siblings) {
                    index = siblings.indexOf(this.selectedNode);
                    if(index < siblings.length - 1) {
                        target = siblings[index + 1];
                    }
                }
                if(!target) {
                    // select last child
                    if(selectedNode.children.length) {
                        target = selectedNode.children[selectedNode.children.length - 1];
                    }
                }
                
                if(target) { this.select(target); }
                break;

            case 40:
                // down arrow: select first child
                if(selectedNode.children.length) {
                    index = Math.floor(selectedNode.children.length / 2) - 1;
                    this.select(selectedNode.children[index]);
                }
                break;

            case 13:
                // enter: create child
                this.select(selectedNode.addChild('XP'), true);
                break;

            default:
                console.log('keycode', event.keyCode);
        }
    },

    handleSettingChange: function(event) {
        var elem = event.target,
            val = elem.value;
        if(elem.type === 'number' || elem.type === 'range') {
            val = parseFloat(val);
        } else if(elem.type === 'checkbox') {
            val = elem.checked;
        }

        this.tree.options[elem.name.substr(9)] = val;
        this.draw();
    },

    updateFont: function(fontPreview, destFont, attrs) {
        // copy attrs to destination font
        for(var key in attrs) {
            destFont[key] = attrs[key];
        }

        // update preview
        var style = 'font-family: ' + destFont.fontFamily +
            ';font-size: ' + destFont.fontSize + 'pt' +
            ';color: ' + destFont.color +
            ';font-weight: ' + (destFont.bold ? 'bold' : 'normal') +
            ';font-style: ' + (destFont.italic ? 'italic' : 'normal');
        fontPreview.style.cssText = style;
        fontPreview.innerHTML = destFont.fontFamily + ' ' +
            destFont.fontSize + 'pt' +
            (destFont.bold ? ' bold' : '') +
            (destFont.italic ? ' italic' : '');

        // redraw tree if changed
        this.draw();
    },

    handleFontEvent: function(event) {

    },

    /**
     * Initializer
     **/
    initFonts: function() {
        var fontSelectors = document.getElementsByClassName('font-selector'),
            fontListTemplate = document.createElement('ul'),
            options = this.tree.options,
            that = this;

        // populate template
        this.fonts.forEach(function(font) {
            var li = document.createElement('li');
            li.setAttribute('style', 'font-family: ' + font);
            li.innerHTML = font;
            fontListTemplate.appendChild(li);
        });

        for(var i=0; i<fontSelectors.length; i++) {
            var selector = fontSelectors[i],
                destFont = options.fonts[selector.dataset.font],
                fontPreview = selector.getElementsByClassName('font-preview')[0],
                fontList = selector.insertBefore(fontListTemplate.cloneNode(true), fontPreview);

            // update font family on list item click
            _listen(fontList, 'click', function(event) {
                if(event.target.nodeName === 'LI') {
                    that.updateFont(this.parentNode.getElementsByClassName('font-preview')[0],
                        options.fonts[this.parentNode.dataset.font],
                        { fontFamily: event.target.innerHTML });
                }
                // hide
                this.className = '';
            });

            // show font list when preview is clicked
            _listen(fontPreview, 'click', function() {
                this.previousSibling.className = 'visible';
            });

            // hide the font list if we click out anywhere else
            // document.onclick = function(e) {
            //     if(fontListVisible &&
            //        event.target.parentNode !== fontList &&
            //        event.target.parentNode !== fontPreview &&
            //        event.target.parentNode !== selector) {
            //         // this is conflicting with multiple elements
            //         // (multiple document.onclick functions hiding each other)

            //         // fontList.className = '';
            //         // console.log('hiding', event.target.parentNode, 'selector', selector);
            //         // fontListVisible = false;
            //     }
            // }

            // simple event handlers for the chirrens
            selector.children.fontSize.oninput = function() {
                that.updateFont(this.parentNode.getElementsByClassName('font-preview')[0],
                    options.fonts[this.parentNode.dataset.font],
                    { fontSize: this.value });
            };
            selector.children.color.onchange = function() {
                that.updateFont(this.parentNode.getElementsByClassName('font-preview')[0],
                    options.fonts[this.parentNode.dataset.font],
                    { color: this.value });
            };
            selector.children.bold.onchange = function() {
                that.updateFont(this.parentNode.getElementsByClassName('font-preview')[0],
                    options.fonts[this.parentNode.dataset.font],
                    { bold: this.checked });
            };
            selector.children.italic.onchange = function() {
                that.updateFont(this.parentNode.getElementsByClassName('font-preview')[0],
                    options.fonts[this.parentNode.dataset.font],
                    { italic: this.checked });
            };

            // initialize
            selector.children.fontSize.value = destFont.fontSize;
            selector.children.color.value = destFont.color;
            selector.children.bold.checked = destFont.bold;
            selector.children.italic.checked = destFont.italic;
            this.updateFont(fontPreview, destFont);
        }
    },

    init: function() {
        var options = this.tree.options,
            elem;

        this.initFonts();

        // populate settings elements with defaults
        for(var key in options) {
            if(key === 'fonts') { continue; }

            elem = document.getElementsByName('settings_' + key);
            if(elem.length) {
                if(elem[0].type === 'checkbox') {
                    elem[0].checked = options[key];
                } else if(elem[0].nodeName === 'SELECT') {
                    elem[0].querySelector('[value="' + options[key] + '"]').selected = true;
                } else {
                    elem[0].value = options[key];
                }
            } else {
                console.log('no DOM element for setting', key);
            }
        }     

        // settings handlers
        _listen(document.getElementsByClassName('setting'), 'change', this.handleSettingChange.bind(this));

        // action click handlers
        _listen(document.querySelectorAll('[data-action]'), 'click', this.handleClick.bind(this));

        // databind the tree contents text input
        _listen(this.textElement, 'keyup blur paste input', this.handleTextUpdate.bind(this));

        // keyboard controls
        _listen(document, 'keydown', this.handleGlobalKeypress.bind(this));

        // select root node
        this.select(this.tree, true);
    }
};