gulp = require('gulp');
sass = require('gulp-sass');
sourcemaps = require('gulp-sourcemaps');

sass.compiler = require('node-sass');

gulp.task('sass', () => {
    return gulp.src('./sass/style.scss')
        .pipe(sourcemaps.init())
        .pipe(sass().on('error', sass.logError))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./css'));
});

gulp.task('sass-release', () => {
    return gulp.src('./sass/style.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest('./css'));
});

gulp.task('modules', () => {
    sources = [
        './node_modules/jquery/dist/jquery.min.js',
        './node_modules/aos/dist/aos.js',
        './node_modules/aos/dist/aos.css',
        './node_modules/xterm/lib/xterm.js',
        'node_modules/xterm/css/xterm.css'
    ]
    return gulp.src( sources ).pipe(gulp.dest('./dist/'));
});
 
gulp.task('default', () => {
    gulp.watch('./sass/style.scss', gulp.series('sass'));
});

gulp.task('release', () => {
    return Promise.all([
        gulp.series('modules'),
        gulp.series('sass-release')
    ]);
});
