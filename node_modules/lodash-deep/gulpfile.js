var gulp = require("gulp");
var uglify = require("gulp-uglify");
var rename = require("gulp-rename");
var KarmaServer = require("karma").Server;
var jasmine = require("gulp-jasmine");

gulp.task("test-browser", ["minify"], function(callback){
    var karmaServer = new KarmaServer({
        configFile: __dirname + '/config/karma.conf.js'
    });
    karmaServer.start(callback);
});

gulp.task("test-node", ["minify"], function(){
    return gulp.src('test/*')
        .pipe(jasmine());
});

gulp.task("test", ["test-browser", "test-node"]);

gulp.task("minify", function(){
    return gulp.src("lodash-deep.js")
        .pipe(uglify())
        .pipe(rename("lodash-deep.min.js"))
        .pipe(gulp.dest("./"));
});
