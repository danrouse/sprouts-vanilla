'use strict';
// generated on 2014-11-12 using generator-gulp-webapp 0.1.0

var gulp = require('gulp');

// load plugins
var $ = require('gulp-load-plugins')();

gulp.task('styles', function () {
    return gulp.src('app/styles/main.scss')
        .pipe($.plumber())
        .pipe($.rubySass({
            style: 'expanded',
            precision: 10
        }))
        .pipe($.autoprefixer('last 1 version'))
        .pipe(gulp.dest('.tmp/styles'))
        .pipe($.size());
});

gulp.task('scripts', function () {
    return gulp.src('app/scripts/**/*.js')
        .pipe($.jshint())
        .pipe($.jshint.reporter(require('jshint-stylish')))
        .pipe($.size());
});

gulp.task('html', ['styles', 'scripts'], function () {
    return gulp.src('app/*.html')
        .pipe($.useref.assets({searchPath: '{.tmp,app}'}))
        .pipe($.if('**/*.js', $.uglify()))
        .pipe($.if('**/*.css', $.csso()))
        .pipe($.useref.restore())
        .pipe($.useref())
        .pipe(gulp.dest('dist'))
        .pipe($.size());
});

gulp.task('svg', function () {
    var svgs = gulp.src('app/images/**/*.svg')
        .pipe($.svgmin())
        .pipe($.svgstore({ prefix: 'icon-', inlineSvg: true }));

    function contents(path, file) { return file.contents.toString('utf8'); }
    return gulp.src('app/index.html')
        .pipe($.inject(svgs, { transform: contents }))
        .pipe(gulp.dest('app'));
});

// gulp.task('images', function () {
//     return gulp.src('app/images/**/*')
//         // .pipe($.cache($.imagemin({
//         //     optimizationLevel: 3,
//         //     progressive: true,
//         //     interlaced: true
//         // })))
//         .pipe(gulp.dest('dist/images'))
//         .pipe($.size());
// });

// gulp.task('fonts', function () {
//     return $.bowerFiles()
//         .pipe($.filter('**/*.{eot,svg,ttf,woff}'))
//         .pipe($.flatten())
//         .pipe(gulp.dest('dist/fonts'))
//         .pipe($.size());
// });

gulp.task('extras', function () {
    return gulp.src(['app/*.*', '!app/*.html'], { dot: true })
        .pipe(gulp.dest('dist'));
});

gulp.task('clean', function () {
    return gulp.src(['.tmp', 'dist', 'docs'], { read: false }).pipe($.clean());
});

gulp.task('build', ['html', 'svg', /*'images', 'fonts',*/ 'extras', 'docs']);

gulp.task('default', ['clean'], function () {
    gulp.start('build');
});

gulp.task('connect', function () {
    var connect = require('connect');
    var app = connect()
        .use(require('connect-livereload')({ port: 35729 }))
        .use(connect.static('app'))
        .use(connect.static('.tmp'))
        .use(connect.directory('app'));

    require('http').createServer(app)
        .listen(9000)
        .on('listening', function () {
            console.log('Started connect web server on http://localhost:9000');
        });
});

gulp.task('serve', ['connect', 'styles'], function () {
    require('opn')('http://localhost:9000');
});

// inject bower components
gulp.task('wiredep', function () {
    var wiredep = require('wiredep').stream;

    gulp.src('app/styles/*.scss')
        .pipe(wiredep({
            directory: 'app/bower_components'
        }))
        .pipe(gulp.dest('app/styles'));

    gulp.src('app/*.html')
        .pipe(wiredep({
            directory: 'app/bower_components'
        }))
        .pipe(gulp.dest('app'));
});

gulp.task('watch', ['connect', 'serve'], function () {
    var server = $.livereload();

    // watch for changes

    gulp.watch([
        'app/*.html',
        '.tmp/styles/**/*.css',
        'app/scripts/**/*.js'//,
        //'app/images/**/*.svg'
        //'app/images/**/*'
    ]).on('change', function (file) {
        server.changed(file.path);
    });

    gulp.watch('app/styles/**/*.scss', ['styles']);
    gulp.watch('app/scripts/**/*.js', ['scripts']);
    //gulp.watch('app/images/**/*', ['images']);
    gulp.watch('app/images/**/*.svg', ['svg']);
    gulp.watch('bower.json', ['wiredep']);
});

// generate docs
gulp.task('docs', function () {
    return gulp.src('app/scripts/**/*.js')
        .pipe($.yuidoc())
        .pipe(gulp.dest('docs'));
});