const yargs = require('yargs');
const fs = require('fs');

const argv = yargs
    .option('branch', {
        'type': 'string',
        description: 'specifies the branch (CI_COMMIT_BRANCH)'
    })
    .option('gitlabpath', {
        type: 'string',
        description: 'The path on gitlab where this branch is stored (CI_PROJECT_PATH)'
    })
    .option('version', {
      type: 'string',
      description: 'The git tag used for this version (CI_COMMIT_TAG)'
    })
    .option('versionpre', {
      type: 'string',
      description: 'specifies the timestamp as a prefix on beta builds (CI_COMMIT_TIMESTAMP)'
    })
    .demandOption(['branch', 'gitlabpath'])
    .argv;

const systemRaw = fs.readFileSync('./dist/system.json');
let system = JSON.parse(systemRaw);

// Calculate the version.
console.log(argv);
if (argv.branch == 'beta' && argv.versionpre) {
  if (system.nextVersion) {
    system.version = `beta${argv.versionpre}-${system.nextVersion}`;
  }
  else {
    system.version = `beta${argv.versionpre}-${system.version.replace(/beta\d*-/g, '')}`;
  }
}
else if (argv.version) {
  system.version = argv.version;
}

delete system.nextVersion;

system.url = `https://gitlab.com/${argv.gitlabpath}`;
system.manifest = `https://gitlab.com/${argv.gitlabpath}/-/jobs/artifacts/${argv.branch}/raw/system.json?job=build`;
system.download = `https://gitlab.com/${argv.gitlabpath}/-/jobs/artifacts/${argv.branch}/raw/dungeonworld.zip?job=build`;

fs.writeFileSync('./dist/system.json', JSON.stringify(system, null, 2));
console.log({version: system.version, manifest: system.manifest});
