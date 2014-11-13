'use strict';

(function() {
    // default tree options
    var defaults = {
        nodeFontFamily: 'Arial',
        nodeFontSize: 18,
        nodeFontColor: '#2e1a06',
        nodeFontBold: true,
        nodeFontItalic: false,

        headFontFamily: 'Courier New',
        headFontSize: 14,
        headFontColor: '#9b1d00',
        headFontBold: false,
        headFontItalic: false,

        nodeSpacingY: 50,
        nodeSpacingX: 12,
        linePadding: 2,
        lineWidth: 2,
        lineColor: '#2e1a06'
    };

    // make a basic tree
    var tree = new Tree('[XP [YP [ZP [Z foo]]] [WP [FP [XX [X bar]] [AF]]] [WP] [WP]]', defaults);

    // post initial settings to DOM
    var elem;
    for(var key in defaults) {
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

    // settings handlers
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

    // action buttons
    var actions = {
        savePNG: function() {
            var png = tree.root.toPNG();
            window.open(png, 'sprouts PNG', 'width=' + tree.root.svg.offsetWidth +
                ',height=' + tree.root.svg.offsetHeight);
        }
    };
    function handleAction(event) {
        // get target action
        var action = actions[event.target.dataset.action];
        if(action) { action(event); }
    }
    var buttonElems = document.getElementsByClassName('button');
    for(var i=0; i<buttonElems.length; i++) {
        buttonElems[i].onclick = handleAction;
    }

    // databind the tree contents text input
    tree.textElement.onkeyup = function() {
        var parent = tree.selectedNode.parent;

        // create new node from contents
        var newNode = new TreeNode({
            fromString: this.value,
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
        tree.selectedNode = newNode;
        tree.draw();
    };
})();