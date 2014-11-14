'use strict';

(function() {
    // default tree options
    var defaults = {
        fonts: {
            node: {
                'font-family': 'Open Sans',
                'font-size': 18,
                'color': '#2e1a06',
                'bold': false,
                'italic': false
            },
            head: {
                'font-family': 'Open Sans',
                'font-size': 12,
                'color': '#9b1d00',
                'bold': false,
                'italic': false
            }
        },

        nodeSpacingY: 50,
        nodeSpacingX: 12,
        linePadding: 0,
        lineWidth: 2,
        lineColor: '#2e1a06',
        headLines: true,
        lazyTriangles: false
    };

    // make a basic tree
    var tree = new Tree('[VP [VP [V Draw][NP ^syntax trees]][PP [P with][NP Sprouts]]]', defaults);

    // populate settings elements with defaults
    var elem;
    for(var key in defaults) {
        if(key === 'fonts') { continue; }

        elem = document.getElementsByName('settings_' + key);
        if(elem.length) {
            if(elem[0].type === 'checkbox') {
                elem[0].checked = defaults[key];
            } else if(elem[0].nodeName === 'SELECT') {
                elem[0].querySelector('[value="' + defaults[key] + '"]').selected = true;
            } else {
                elem[0].value = defaults[key];
            }
        } else {
            console.log('no DOM element for setting', key);
        }
    }


    // font selectors
    var fonts = ['Open Sans', 'Arial', 'Times New Roman', 'Impact', 'Garamond', 'Comic Sans MS', 'Courier New'];
    var fontSelectors = document.getElementsByClassName('font-selector'),
        fontListTemplate = document.createElement('ul'),
        i, j;

    // populate template
    for(i in fonts) {
        var li = document.createElement('li');
        li.setAttribute('style', 'font-family: ' + fonts[i]);
        li.innerHTML = fonts[i];
        fontListTemplate.appendChild(li);
    }

    // update preview and tree
    var updateFont = function(fontPreview, destFont, attrs) {
        // copy attrs to destination font
        for(var key in attrs) {
            destFont[key] = attrs[key];
        }

        // update preview
        var style = 'font-family: ' + destFont['font-family'] +
            ';font-size: ' + destFont['font-size'] + 'pt' +
            ';color: ' + destFont['color'] +
            ';font-weight: ' + (destFont['bold'] ? 'bold' : 'normal') +
            ';font-style: ' + (destFont['italic'] ? 'italic' : 'normal');
        fontPreview.style.cssText = style;
        fontPreview.innerHTML = destFont['font-family'] + ' ' +
            destFont['font-size'] + 'pt' +
            (destFont['bold'] ? ' bold' : '') +
            (destFont['italic'] ? ' italic' : '');

        // redraw tree if changed
        tree.draw();
    }

    for(i=0; i<fontSelectors.length; i++) {
        var selector = fontSelectors[i],
            destFont = tree.options.fonts[selector.dataset.font],
            fontPreview = selector.getElementsByClassName('font-preview')[0],
            fontList = selector.insertBefore(fontListTemplate.cloneNode(true), fontPreview);

        // update font family on list item click
        fontList.onclick = function() {
            if(event.target.nodeName === 'LI') {
                updateFont(this.parentNode.getElementsByClassName('font-preview')[0],
                    tree.options.fonts[this.parentNode.dataset.font],
                    { 'font-family': event.target.innerHTML });
            }
            // hide
            this.className = '';
        };

        // show font list when preview is clicked
        fontPreview.onclick = function() {
            this.previousSibling.className = 'visible';
        };

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
        selector.children['font-size'].oninput = function() {
            updateFont(this.parentNode.getElementsByClassName('font-preview')[0],
                tree.options.fonts[this.parentNode.dataset.font],
                { 'font-size': this.value });
        };
        selector.children['color'].onchange = function() {
            updateFont(this.parentNode.getElementsByClassName('font-preview')[0],
                tree.options.fonts[this.parentNode.dataset.font],
                { 'color': this.value });
        };
        selector.children['bold'].onchange = function() {
            updateFont(this.parentNode.getElementsByClassName('font-preview')[0],
                tree.options.fonts[this.parentNode.dataset.font],
                { 'bold': this.checked });
        };
        selector.children['italic'].onchange = function() {
            updateFont(this.parentNode.getElementsByClassName('font-preview')[0],
                tree.options.fonts[this.parentNode.dataset.font],
                { 'italic': this.checked });
        };

        // initialize
        selector.children['font-size'].value = destFont['font-size'];
        selector.children['color'].value = destFont['color'];
        selector.children['bold'].checked = destFont['bold'];
        selector.children['italic'].checked = destFont['italic'];
        updateFont(fontPreview, destFont);
    }

    // non-font settings handlers
    function changeSetting() {
        var value = this.value;
        if(this.type === 'number' || this.type === 'range') {
            value = parseFloat(value);
        } else if(this.type === 'checkbox') {
            value = this.checked;
        }
        tree.options[this.name.substr(9)] = value;
        tree.draw();
    }
    var settingElems = document.getElementsByClassName('setting');
    for(var i=0; i<settingElems.length; i++) {
        settingElems[i].onchange = changeSetting.bind(settingElems[i]);
    }

    // collapsible settings groups
    function toggleCollapsible() {
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
    }
    var collapsibleElems = document.getElementsByClassName('collapsible');
    for(var i=0; i<collapsibleElems.length; i++) {
        collapsibleElems[i].onclick = toggleCollapsible.bind(collapsibleElems[i]);
    }

    // action buttons
    var actions = {
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

        addChild: function() {
            var child = tree.selectedNode.addChild('XP');
            tree.select(child, true);
        },

        removeNode: function() {
            var newSelection = tree.selectedNode.parent;
            for(var i in newSelection.children) {
                if(newSelection.children[i] === tree.selectedNode) {
                    newSelection.children.splice(i, 1);
                    break;
                }
            }

            tree.select(newSelection, true);
        },

        startMovement: function() {
            console.log('start movement', tree.selectedNode);
        },

        saveSVG: function() {
            var slug = tree.toString(true),
                svg = tree.root.svg,
                xml = '<svg xmlns="http://www.w3.org/2000/svg" width="' + svg.offsetWidth +
                    '" height="' + svg.offsetHeight + '">' + svg.innerHTML + '</svg>';

            // make slug filename-friendly
            slug = slug.toLowerCase().replace(/\s+/g, '-').substr(0,32);

            _download('data:image/svg+xml,' + encodeURIComponent(xml), 'sprouts-' + slug + '.svg');
        },

        savePNG: function() {
            var slug = tree.toString(true);

            // make slug filename-friendly
            slug = slug.toLowerCase().replace(/\s+/g, '-').substr(0,32);

            _download(tree.root.toPNG(), 'sprouts-' + slug + '.png');
        }
    };
    function handleAction(event) {
        var target = event.target;
        while(target.parentNode && target.nodeName !== 'BUTTON') {
            target = target.parentNode;
        }
        // get target action
        var action = actions[target.dataset.action];
        if(action) { action(event, target); }
    }
    var buttonElems = document.getElementsByTagName('button');
    for(var i=0; i<buttonElems.length; i++) {
        buttonElems[i].onclick = handleAction;
    }

    // databind the tree contents text input
    function updateText(event) {
        // check if text was really updated
        if(this.lastText &&
           this.lastText === this.innerText &&
           event.type !== 'blur') {
            return;
        }
        var parent = tree.selectedNode.parent;

        // create new node from contents
        var newNode = new TreeNode({
            fromString: this.innerText,
            options: tree.options
        });

        if(parent) {
            // replace reference in the parent
            for(var i in parent.children) {
                if(parent.children[i] === tree.selectedNode) {
                    parent.children[i] = newNode;
                }
            }

            // reference parent in the new node
            newNode.parent = parent;
        } else {
            // replace root
            tree.root = newNode;
        }

        // update selection and redraw
        tree.select(newNode, true, (event.type === 'blur' || event.type === 'paste'));
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

        this.lastText = this.innerText;
    }
    tree.textElement.onkeyup = updateText;
    tree.textElement.onblur = updateText;
    tree.textElement.onpaste = updateText;
    tree.textElement.oninput = updateText;

    // keyboard controls
    document.onkeydown = function(event) {
        if(event.target.nodeName !== 'BODY') { return; }

        var selectedNode = tree.selectedNode,
            parent = selectedNode.parent,
            siblings = parent ? parent.children : null;

        switch(event.keyCode) {
            case 37:
                // left arrow: select sibling to the left
                var target;

                if(siblings) {
                    var index = siblings.indexOf(tree.selectedNode);
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
                
                if(target) { tree.select(target); }
                break;

            case 38:
                // up arrow: select parent
                if(selectedNode.parent) {
                    tree.select(selectedNode.parent);
                }
                break;

            case 39:
                // right arrow: select sibling to the right
                var target;
                
                if(siblings) {
                    var index = siblings.indexOf(tree.selectedNode);
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
                
                if(target) { tree.select(target); }
                break;

            case 40:
                // down arrow: select first child
                if(selectedNode.children.length) {
                    var index = Math.floor(selectedNode.children.length / 2) - 1;
                    tree.select(selectedNode.children[index]);
                }
                break;

            case 13:
                // enter: create child
                tree.select(selectedNode.addChild('XP'), true);
                break;

            default:
                console.log('keycode', event.keyCode);
        }
    };
})();