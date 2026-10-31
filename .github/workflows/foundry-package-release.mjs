import yargs from 'yargs/yargs';
import * as fs from 'fs';

const argv = yargs(process.argv.slice(2))
  .option('fvtt_token', {
    'type': 'string',
    description: 'Foundry VTT package manager token'
  })
  .demandOption(['fvtt_token'])
  .argv;

// Load the existing manifest.
const systemRaw = fs.readFileSync('./system.json');
let system = JSON.parse(systemRaw);

// Attempt the request.
const release_data = {
  "version": `${system.version}`,
  "manifest": `https://asacolips-artifacts.s3.amazonaws.com/dungeonworld/${system.version}/system.json`,
  "notes": `https://github.com/asacolips-projects/dungeonworld/releases/tag/${system.version}`,
  "compatibility": {
    "minimum": `${system.compatibility.minimum}`,
    "verified": `${system.compatibility.verified}`,
    "maximum": `${system.compatibility.maximum}`,
  }
};

const response = await fetch("https://foundryvtt.com/_api/packages/release_version/", {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `${argv.fvtt_token}`
  },
  method: "POST",
  body: JSON.stringify({
    "id": "dungeonworld",
    // "dry-run": true,
    "release": release_data
  })
});

// Handle response.
const response_data = await response.json()
if (response_data?.status == 'success') {
  console.log(`New release created at ${response_data.page ?? '[page missing from response]'}`);
}
else {
  const error_message = response_data?.errors ? JSON.stringify(response_data.errors) : '[unknown error]';
  console.error(`Error: ${error_message}`);
}