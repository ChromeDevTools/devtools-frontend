const babel = require("gulp-babel");
const del = require("del");
const gulp = require("gulp");

const dirs = {
  src: "src",
  dest: "lib",
};

const sources = {
  scripts: `${dirs.src}/**/*.js`,
};

const build = () => gulp.src(sources.scripts)
  .pipe(babel())
  .pipe(gulp.dest(dirs.dest));

gulp.task("build", build);

gulp.task("clean", () => del([`${dirs.dest}/**`]));

gulp.task("default", gulp.series("clean", "build", (done) => {
  done();
}));

