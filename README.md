# sprouts

 - draw syntax trees in the browser
 - build tree from strings
 - full Unicode support
 - export as SVG or PNG


usage
-----
 - live version currently unavailable


todo
----
 - **features**
 	- movement
 	- interactive drawing
 	- merge (bottom-up drawing)

 - **tech**
 	- use embedded CSS instead of SVG attributes where possible
 	- support webfonts and arbitrary local fonts (redo fonts menu)
 	- better garbage collection
 	- **haven't tested a thing outside of chrome**


contributing
------------
 - built using [gulp](http://gulpjs.com), scaffolded with [yeoman](http://yeoman.io) ([generator-gulp-webapp](https://github.com/yeoman/generator-gulp-webapp))
 - `npm install` to setup development dependencies
 - `gulp watch` to setup livereload + local web server
 - `gulp docs` to generate documentation in docs/


license
-------
MIT License. [See LICENSE.md](LICENSE.md)