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
     * DOM element containing the node actions menu
     *
     * @property treeElement {Element}
     **/
    this.menuElement = document.getElementById('sprouts-menu');

    /**
     * whether the menu is visible or not
     *
     * @property menuVisible {Boolean}
     **/
    this.menuVisible = false;

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

    /**
     * coreference names in use
     *
     * @property coreferences {Array}
     **/
    this.coreferences = [];

    /**
     * Available font face names
     *
     * @property fonts {Array}
     **/
    this.fonts = ['Open Sans', 'Arial', 'Times New Roman', 'Impact', 'Garamond', 'Comic Sans MS', 'Courier New'];

    this.init();
};
UserInterface.prototype = {

    /********************************
     * TREE TRAVERSAL
     ********************************/

    /**
     * Selects a node in the tree.
     *
     * @method select
     * @param targetNode {TreeNode}
     * @param redrawTree {Boolean}
     * @param redrawText {Boolean}
     * @param selectText {Boolean}
     * @return targetNode {TreeNode} selected node
     **/
    select: function(targetNode, redrawTree, redrawText, selectText) {
        if(redrawTree) { this.draw(); }

        // remove existing selection class
        if(this.selectedNode) {
            this.selectedNode.svg._attrs({'class': ''});
        }

        // select target node
        targetNode.svg._attrs({'class': 'selected'});
        this.selectedNode = targetNode || this.tree;

        // move menu to new selection
        if(this.menuVisible) {
            this.showMenu();
        }

        // update selected text area
        if(redrawText !== false) {
            this.textElement.innerHTML = targetNode.toString(false, true);
        }

        // highlight whatever we just selected
        if(selectText) {
            var selection = window.getSelection(),
                range = document.createRange();
            
            range.setStart(this.textElement, 1);
            range.setEnd(this.textElement, 2);
            selection.removeAllRanges();
            selection.addRange(range);
        }

        return targetNode;
    },

    /**
     * Selects the current node's parent
     *
     * @method traverseUp
     * @param selectText {Boolean} move the caret over the node text
     **/
    traverseUp: function(selectText) {
        if(this.selectedNode.parent) {
            this.select(this.selectedNode.parent, false, true, selectText);
        }
    },

    /**
     * Select the current node's middle descendant
     *
     * @method traverseDown
     * @param selectText {Boolean} move the caret over the node text
     **/
    traverseDown: function(selectText) {
        if(this.selectedNode.children.length) {
            this.select(this.selectedNode.children[Math.floor(this.selectedNode.children.length / 2)], false, true, selectText);
        }
    },

    /**
     * Select the sibling to the left of the current node
     * If no candidates, move up.
     *
     * @method traverseLeft
     * @param selectText {Boolean} move the caret over the node text
     **/
    traverseLeft: function(selectText) {
        var selectedNode = this.selectedNode,
            siblings = selectedNode.parent ? selectedNode.parent.children : null,
            target, index;

        if(siblings) {
            index = siblings.indexOf(this.selectedNode);
            if(index > 0) {
                target = siblings[index - 1];
            }
        }
        
        if(target) {
            this.select(target, false, true, selectText);
        } else {
            this.traverseUp(selectText);
        }
    },

    /**
     * Select the sibling to the right of the current node
     * If no candidates, move down.
     *
     * @method traverseRight
     * @param selectText {Boolean} move the caret over the node text
     **/
    traverseRight: function(selectText) {
        var selectedNode = this.selectedNode,
            siblings = selectedNode.parent ? selectedNode.parent.children : null,
            index, target;

        if(siblings) {
            index = siblings.indexOf(this.selectedNode);
            if(index < siblings.length - 1) {
                target = siblings[index + 1];
            }
        }
        
        if(target) {
            this.select(target, false, true, selectText);
        } else {
            this.traverseDown(selectText);
        }
    },



    /********************************
     * TREE BUILDING
     ********************************/

    /**
     * Adds a new child directly below the selected node.
     * 
     * @method addChild
     **/
    addChild: function() {
        var child = this.selectedNode.addChild('XP',
            Math.floor(this.selectedNode.children.length / 2));
        this.select(child, true, true, true);
    },

    /**
     * Adds a new child as the leftmost child of the selected node
     *
     * @method addChildLeft
     */
    addChildLeft: function() {
        var child = this.selectedNode.addChild('XP', 0);
        this.select(child, true, true, true);
    },

    /**
     * Adds a new child as the rightmost child of the selected node
     *
     * @method addChildRight
     */
    addChildRight: function() {
        var child = this.selectedNode.addChild('XP',
            this.selectedNode.children.length);
        this.select(child, true, true, true);
    },

    /**
     * Adds a parent above the selected node.
     * 
     * @method addParent
     **/
    addParent: function() {
        var parent = this.selectedNode.addParent('XP');
        if(this.selectedNode === this.tree) {
            this.tree = parent;
        }
        this.select(parent, true, true, true);
    },

    /**
     * Removes the selected node from the tree.
     * 
     * @method removeNode
     **/
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

    /**
     * Starts movement from the current selected node.
     * 
     * @method startMovement
     **/
    startMovement: function() {
        var target = this.selectedNode;
        if(!this.nodeToMove) {
            if(!target.coreferenceName.length) {
                target.coreferenceName = this.coreferences.length.toString();
                this.coreferences.push(this.coreferences.length);
            }

            this.nodeToMove = target;
            target.svg._attrs({ 'class': 'moving' });

            this.hideMenu();
        } else {
            if(!target.coreference) {
                target.coreferenceName = '';
                this.coreferences.pop();
            }
            this.nodeToMove = null;
            target.svg._attrs({ 'class': 'selected' });
        }
    },



    /********************************
     * OUTPUT GENERATORS
     ********************************/

    /**
     * Generates a new SVG of the tree and inserts it in the DOM.
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

        // reposition menu
        if(this.menuVisible) {
            this.showMenu();
        }

        // bind UI events
        _listen(svg, 'click', this.handleSVGClick.bind(this));
    },

    /**
     * Triggers a download of an SVG image of the current tree.
     * 
     * @method saveSVG
     **/
    saveSVG: function() {
        var slug = this.tree.toString(true),
            svg = this.tree.svg,
            xml = '<svg xmlns="http://www.w3.org/2000/svg" width="' + svg.offsetWidth +
                '" height="' + svg.offsetHeight + '">' + svg.innerHTML + '</svg>';

        // make slug filename-friendly
        slug = slug.toLowerCase().replace(/\s+/g, '-').substr(0,32);

        _download('data:image/svg+xml,' + encodeURIComponent(xml), 'sprouts-' + slug + '.svg');
    },

    /**
     * Triggers a download of a PNG image of the current tree.
     * 
     * @method savePNG
     **/
    savePNG: function() {
        var slug = this.tree.toString(true);

        // make slug filename-friendly
        slug = slug.toLowerCase().replace(/\s+/g, '-').substr(0,32);

        _download(this.tree.toPNG(), 'sprouts-' + slug + '.png');
    },



    /********************************
     * ELEMENT TOGGLERS
     ********************************/

    /**
     * Shows or hides the sidebar.
     * 
     * @method toggleSidebar
     * @param event {Event} click event
     * @param target
     **/
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

    /**
     * Toggles visibility a collapsible settings group.
     * 
     * @method toggleCollapsible
     **/
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

    /**
     * Shows the popup node actions menu
     *
     * @method showMenu
     **/
    showMenu: function() {
        var sel = this.selectedNode,
            label = sel.svg.querySelector('.sprouts__label:first-of-type'),
            pos = label.getBoundingClientRect();

        // decide which buttons should be available
        var rules = {
            'removeNode': sel.parent,
            'startMovement': !sel.isTrace,
            'addChild': sel.children.length !== 1,
            'addChildLeft': sel.children.length,
            'addChildRight': sel.children.length,
            'addSiblingLeft': sel.parent,
            'addSiblingRight': sel.parent
        }
        for(var rule in rules) {
            this.menuElement.querySelector('[data-action="' + rule + '"]').style.display = (rules[rule]) ? 'block' : 'none';
        }

        // place over label
        this.menuElement.style.transform = 'translateX(' + pos.left + 'px) ' +
            'translateY(' + pos.top + 'px)';

        // replay the active animation
        this.menuElement.className = 'sprouts-menu';
        setTimeout(function() {
            this.menuElement.className = 'sprouts-menu active'
        }.bind(this), 50);

        this.menuVisible = true;
    },

    /**
     * Hides the popup node actions menu
     *
     * @method hideMenu
     **/
    hideMenu: function() {
        this.menuElement.className = 'sprouts-menu';
        this.menuVisible = false;
    },

    

    /********************************
     * EVENT HANDLERS
     ********************************/

    /**
     * Calls the UI method from the data-action attribute
     * of an element. Click handler.
     * 
     * @method handleAction
     * @param event {Event}
     **/
    handleAction: function(event) {
        var target = event.target;
        while(target.parentNode && !target.dataset.action) {
            target = target.parentNode;
        }
        // get target action
        var action = this[target.dataset.action];
        if(typeof action === 'function') {
            action.bind(this)(event, target);
        } else {
            console.log('unknown action', target.dataset.action);
        }
    },

    /**
     * Handles clicks from inside the SVG element
     *
     * @method handleSVGClick
     * @param event {Event}
     **/
    handleSVGClick: function(event) {
        // find first svg parent of click event target
        var target = event.target;

        while(target.nodeName !== 'svg') {
            target = target.parentNode;
        }

        // clicks outside deselect
        if(target === event.target && !target.treeNode.parent) {
            this.hideMenu();
        } else {
            // finish movement or select the node
            if(this.nodeToMove) {
                this.select(this.nodeToMove.moveTo(target.treeNode), true, false, true);
                this.nodeToMove = null;
            } else {
                this.select(target.treeNode, false, true, true);
            }

            // show menu
            this.showMenu();
        }
    },

    /**
     * Handles bracketed text input events.
     * 
     * @method handleTextUpdate
     * @param event {Event}
     **/
    handleTextUpdate: function(event) {
        // if text wasn't really updated, noop
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
        this.select(newNode, true, (event.type === 'paste'));

        this.textElement.lastText = this.textElement.innerText;
    },

    /**
     * Handles keyboard control within the textarea
     * 
     * @method handleTextKeypress
     * @param event {Event}
     **/
    handleTextKeypress: function(event) {
        var captured = true;

        switch(event.keyCode) {
            // arrow keys
            case 38: this.traverseUp(true); break;
            case 40: this.traverseDown(true); break;
            // enter key
            case 13: this.addChild(); break;
            // tab key
            case 9:
                if(event.shiftKey) {
                    this.traverseLeft(true);
                } else {
                    this.traverseRight(true);
                }
                break;

            default: captured = false;
        }
        if(captured) {
            event.preventDefault();
        }
    },

    /**
     * Handles global keyboard control.
     * 
     * @method handleKeypress
     * @param event {Event}
     **/
    handleKeypress: function(event) {
        var captured = true;
        switch(event.keyCode) {
            // arrow keys
            case 37: this.traverseLeft(); break;
            case 38: this.traverseUp(); break;
            case 39: this.traverseRight(); break;
            case 40: this.traverseDown(); break;

            // esc key
            case 27: this.hideMenu(); break;

            // enter key
            case 13: this.addChild(); break;

            // tab key
            case 9:
                if(event.shiftKey) {
                    this.traverseLeft(true);
                } else {
                    this.traverseRight(true);
                }
                break;

            default:
                captured = false;
                console.log('uncaptured global keypress', event.keyCode);
        }

        if(captured) {
            event.preventDefault();
        }
    },

    /**
     * Handles viewport resize
     * 
     * @method handleResize
     * @param event {Event}
     **/
    handleResize: function(event) {
        // move absolutely positioned menu
        if(this.menuVisible) {
            this.showMenu();
        }
    },

    /**
     * Updates a setting from DOM input.
     * 
     * @method handleSetting
     * @param event {Event}
     **/
    handleSetting: function(event) {
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

    /**
     * Updates font preview.
     * 
     * @method updateFont
     * @param fontPreview {HTMLElement} preview element to update
     * @param destFont {Object} font object to update
     * @param attrs {Object} attrs in the font object to update
     **/
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



    /********************************
     * INITIALIZERS
     ********************************/

    /**
     * Initializes font settings selectors.
     * 
     * @method initFonts
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

    /**
     * Initializes the UI. Called from constructor.
     * 
     * @method init
     **/
    init: function() {
        var options = this.tree.options,
            elem;

        this.initFonts();

        // populate settings elements with defaults
        // any named element [name="settings_{key}"]
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
            }
        }     

        // settings handlers
        _listen(document.getElementsByClassName('setting'), 'change', this.handleSetting.bind(this));

        // action click handlers
        _listen(document.querySelectorAll('[data-action]'), 'click', this.handleAction.bind(this));

        // databind the tree contents text input
        _listen(this.textElement, 'keyup paste input', this.handleTextUpdate.bind(this));

        // keyboard controls
        _listen(document, 'keydown', this.handleKeypress.bind(this));

        // resizing
        _listen(window, 'resize', this.handleResize.bind(this));

        // select root node
        this.select(this.tree, true, true, false);
    }
};