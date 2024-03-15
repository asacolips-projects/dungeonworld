const yargs = require('yargs');
const fs = require('fs');

const argv = yargs
    .option('fvtt_token', {
        'type': 'string',
        description: 'Foundry VTT package manager token'
    })
    .demandOption(['fvtt_token'])
    .argv;

// Load the existing manifest.
const systemRaw = fs.readFileSync('./dist/system.json');
let system = JSON.parse(systemRaw);

// Attempt the request.
response = await fetch("https://api.foundryvtt.com/_api/packages/release_version/", {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `fvttp_${argv.fvtt_token}`
  },
  method: "POST",
  body: JSON.stringify({
    "id": "dungeonworld",
    "dry-run": true,
    "release": {
      "version": `${system.version}`,
      "manifest": `https://asacolips-artifacts.s3.amazonaws.com/dungeonworld/${system.version}/system.json`,
      "notes": `https://github.com/asacolips-projects/dungeonworld/releases/tag/${system.version}`,
      "compatibility": {
        "minimum": `${system.compatibility.minimum}`,
        "verified": `${system.compatibility.verified}`,
        "maximum": `${system.compatibility.maximum}`
      }
    }
  })
});

// Handle response.
response_data = await response.json()
if (response_data?.status == 'success') {
  console.log(`New release created at ${response_data.page ?? '[page missing from response]'}`);
}
else {
  console.error(response_data?.errors ?? 'Unknown error');
}