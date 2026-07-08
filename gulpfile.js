import gulp from 'gulp';
import autoprefixer from 'gulp-autoprefixer';

gulp.task('styles', function () {
    return gulp.src('dist/index.css')
        .pipe(autoprefixer())
        .pipe(gulp.dest('dist'));
});