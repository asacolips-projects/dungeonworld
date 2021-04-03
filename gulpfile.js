const gulp = require('gulp');
const prefix = require('gulp-autoprefixer');
const del = require('del');
const sass = require('gulp-sass');
const yaml = require('gulp-yaml');
const webp = require('gulp-webp');
const git = require('gulp-git');
const tagVersion = require('gulp-tag-version');
const jsYaml = require('js-yaml');
const fs = require('fs');
const replace = require('gulp-replace');

// Dependencies for compendium tasks.
const through2 = require("through2");
const Datastore = require("nedb");
const mergeStream = require("merge-stream");
const path = require("path");
const clean = require("gulp-clean");

// Constants.
const PACK_SRC = "src/packs";
const PACK_DEST = "dist/packs";

/* ----------------------------------------- */
/*  Compile Compendia
/* ----------------------------------------- */

/**
 * Gulp Task: Compile packs from the yaml source content to .db files.
 */
function compilePacks() {
  // Every folder in the src dir will become a compendium.
  const folders = fs.readdirSync(PACK_SRC).filter((file) => {
    return fs.statSync(path.join(PACK_SRC, file)).isDirectory();
  });

  // Iterate over each folder/compendium.
  const packs = folders.map((folder) => {
    // Initialize a blank nedb database based on the directory name. The new
    // database will be stored in the dest directory as <foldername>.db
    const db = new Datastore({ filename: path.resolve(__dirname, PACK_DEST, `${folder}.db`), autoload: true });
    // Process the folder contents and insert them in the database.
    return gulp.src(path.join(PACK_SRC, folder, "/**/*.yml")).pipe(
      through2.obj((file, enc, cb) => {
        let json = jsYaml.loadAll(file.contents.toString());
        db.insert(json);
        cb(null, file);
      })
    );
  });

  // Execute the streams.
  return mergeStream.call(null, packs);
}

/**
 * Cleanup the packs directory.
 *
 * This task will delete the existing compendiums so that the compile task can
 * write fresh copies in their place.
 */
function cleanPacks() {
  return gulp.src(`${PACK_DEST}`, { allowEmpty: true }, {read: false}).pipe(clean());
}

/* ----------------------------------------- */
/*  Export Compendia
/* ----------------------------------------- */

/**
 * Santize pack entries.
 *
 * This function will deep clone a given compendium object, such as an Actor or
 * Item, and will then delete the `_id` key along with replacing the
 * `_permission` object with a generic version that doesn't reference user IDs.
 *
 * @param {object} pack Loaded compendium content.
 */
function sanitizePack(pack) {
  let sanitizedPack = JSON.parse(JSON.stringify(pack));
  // Leave the IDs in for now, so that item links are persisted.
  // delete sanitizedPack._id;
  sanitizedPack.permission = { default: 0 };
  return sanitizedPack;
}

/**
 * Sluggify a string.
 *
 * This function will take a given string and strip it of non-machine-safe
 * characters, so that it contains only lowercase alphanumeric characters and
 * hyphens.
 *
 * @param {string} string String to sluggify.
 */
function sluggify(string) {
  return string
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .replace(/\s+|-{2,}/g, '-');
}

/**
 * Gulp Task: Export Packs
 *
 * This gulp task will load all compendium .db files from the dest directory,
 * load them into memory, and then export them to a human-readable YAML format.
 */
function extractPacks() {
  // Start a stream for all db files in the packs dir.
  const packs = gulp.src(`${PACK_DEST}/**/*.db`)
    // Run a callback on each pack file to load it and then write its
    // contents to the pack src dir in yaml format.
    .pipe(through2.obj((file, enc, callback) => {
      // Create directory.
      let filename = path.parse(file.path).name;
      if (!fs.existsSync(`./${PACK_SRC}/${filename}`)) {
        fs.mkdirSync(`./${PACK_SRC}/${filename}`);
      }

      // Load the database.
      const db = new Datastore({ filename: file.path, autoload: true });
      db.loadDatabase();

      // Export the packs.
      db.find({}, (err, packs) => {
        // Iterate through each compendium entry.
        packs.forEach(pack => {
          // Remove permissions and _id
          pack = sanitizePack(pack);

          // Convert to a Yaml document.
          let output = jsYaml.dump(pack, {
            quotingType: "'",
            forceQuotes: true,
            noRefs: true,
            sortKeys: false
          });

          // Sluggify the filename.
          let packName = sluggify(pack.name);

          // Write to the file system.
          fs.writeFileSync(`./${PACK_SRC}/${filename}/${packName}.yml`, output);
        });
      });

      // Complete the through2 callback.
      callback(null, file);
    }));

  // Call the streams.
  return mergeStream.call(null, packs);
}

/* ----------------------------------------- */
/* Compile Sass
/* ----------------------------------------- */

// Small error handler helper function.
function handleError(err) {
  console.log(err.toString());
  this.emit('end');
}

const SYSTEM_SCSS = ["src/styles/src/**/*.scss"];
function compileScss() {
  // Configure options for sass output. For example, 'expanded' or 'nested'
  let options = {
    outputStyle: 'nested'
  };
  return gulp.src(SYSTEM_SCSS)
    .pipe(
      sass(options)
        .on('error', handleError)
    )
    .pipe(prefix({
      cascade: false
    }))
    .pipe(gulp.dest("./dist/styles/dist"))
}
const cssTask = gulp.series(compileScss);

/* ----------------------------------------- */
/* Compile YAML
/* ----------------------------------------- */
const SYSTEM_YAML = ['src/yaml/**/*.yml', 'src/yaml/**/*.yaml'];
function compileYaml() {
  return gulp.src(SYSTEM_YAML)
    .pipe(yaml({ space: 2 }))
    .pipe(gulp.dest('./dist'))
}
const yamlTask = gulp.series(compileYaml);

/* ----------------------------------------- */
/* Delete files
/* ----------------------------------------- */
const SYSTEM_DELETE = ['dist'];
function deleteFiles() {
  return del('dist/**', {force: true});
}
const deleteTask = gulp.series(deleteFiles);

/* ----------------------------------------- */
/* Copy files
/* ----------------------------------------- */
const SYSTEM_COPY = [
  'src/assets/**/*',
  '!src/assets/**/*.{png,jpeg,jpg}',
  'src/module/**/*',
  'src/packs/**/*',
  'src/scripts/**/*',
  'src/styles/lib/**/*',
  'src/templates/**/*',
  'src/tokens/**/*',
  '!src/tokens/**/*.{png,jpeg,jpg}'
];
function copyFiles() {
  return gulp.src(SYSTEM_COPY, {base: 'src'})
    .pipe(gulp.dest('./dist'))
}
function copyManifest() {
  return gulp.src('./dist/system.json')
    .pipe(gulp.dest('./'))
}
const copyTask = gulp.series(copyFiles, copyManifest);

/* ----------------------------------------- */
/* Convert images
/* ----------------------------------------- */
const SYSTEM_IMAGES = [
  'src/assets/**/*.{png,jpeg,jpg}',
  'src/tokens/**/*.{png,jpeg,jpg}'
];
function compileImages() {
  return gulp.src(SYSTEM_IMAGES, {base: 'src'})
    .pipe(webp())
    .pipe(gulp.dest('./dist'));
};
const imageTask = gulp.series(compileImages);

/* ----------------------------------------- */
/* Retrieve current version from system.yml
/* ----------------------------------------- */
function getTagVersion() {
  try {
    // Load the manifest and determine the version.
    const doc = jsYaml.safeLoad(fs.readFileSync('./src/yaml/system.yml', 'utf8'));
    return doc.version;
  } catch (e) {
    console.log(e);
    // Output the original file as a fail safe.
    return false;
  }
}

/* ----------------------------------------- */
/* Increment version in system.yml
/* ----------------------------------------- */
function inc(importance) {
  let version = getTagVersion();
  if (version) {
    let oldVersion = version;
    let newVersionSplit = version.split('.');
    switch (importance) {
      case 'patch':
        newVersionSplit[2]++;
        break;

      case 'minor':
        newVersionSplit[1]++;
        break;

      case 'major':
        newVersionSplit[0]++;
        break;

      default:
        break;
    }
    let newVersion = newVersionSplit.join('.');
    // Output the version to the file.
    return gulp.src(['./src/yaml/system.yml'])
      // String replacements.
      .pipe(replace(oldVersion, newVersion))
      .pipe(replace('jobs/artifacts/master', `jobs/artifacts/${newVersion}`))
      // Overwrite system.yml.
      .pipe(gulp.dest('./src/yaml'))
  } else {
    return gulp.src(['./src/yaml/system.yml']);
  }
}

/* ----------------------------------------- */
/* Commit changes and make a new git tag.
/* ----------------------------------------- */
function commitTag() {
  let version = getTagVersion();
  if (version) {
    return gulp.src(['./system.json'])
      .pipe(git.commit(`Release ${version}`))
      .pipe(tagVersion({ prefix: '' }));
  }
  else {
    return gulp.src(['./system.json']);
  }
}

/* ----------------------------------------- */
/* Watch Updates
/* ----------------------------------------- */

function watchUpdates() {
  gulp.watch(SYSTEM_YAML, yamlTask);
  gulp.watch(SYSTEM_IMAGES, compileImages);
  gulp.watch(SYSTEM_SCSS, gulp.series(compileScss, copyFiles));
  gulp.watch(SYSTEM_COPY, copyTask);
}

/* ----------------------------------------- */
/* Export Tasks
/* ----------------------------------------- */

const defaultTask = gulp.series(
  deleteFiles,
  compileYaml,
  compileImages,
  compileScss,
  copyFiles,
  copyManifest,
  watchUpdates
);
const buildTask = gulp.series(
  deleteFiles,
  compileYaml,
  compileImages,
  compileScss,
  copyFiles,
  copyManifest,
  compilePacks
);

exports.default = defaultTask;
exports.build = buildTask;

exports.copy = copyTask;
exports.images = imageTask;
exports.css = cssTask;
exports.yaml = yamlTask;

exports.cleanPacks = gulp.series(cleanPacks);
exports.compilePacks = gulp.series(cleanPacks, compilePacks);
exports.extractPacks = gulp.series(extractPacks);

/**
 * Bumping version number and tagging the repository with it.
 * Please read http://semver.org/
 *
 * You can use the commands
 *
 *     gulp patch     # makes v0.1.0 → v0.1.1
 *     gulp feature   # makes v0.1.1 → v0.2.0
 *     gulp release   # makes v0.2.1 → v1.0.0
 *
 * To bump the version numbers accordingly after you did a patch,
 * introduced a feature or made a backwards-incompatible release.
 */
patch = function() { return inc('patch') };
major = function() { return inc('major') };
minor = function() { return inc('minor') };
exports.patch = gulp.series(patch, buildTask, commitTag);
exports.minor = gulp.series(minor, buildTask, commitTag);
exports.major = gulp.series(major, buildTask, commitTag);