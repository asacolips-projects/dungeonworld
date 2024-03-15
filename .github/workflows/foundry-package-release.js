response = await fetch("https://api.foundryvtt.com/_api/packages/release_version/", {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `fvttp_${FVTT_PACKAGE_TOKEN}`
  },
  method: "POST",
  body: JSON.stringify({
    "id": "dungeonworld",
    "dry-run": true,
    "release": {
      "version": `${VERSION}`,
      "manifest": `https://asacolips-artifacts.s3.amazonaws.com/dungeonworld/${VERSION}/system.json`,
      "notes": `https://github.com/asacolips-projects/dungeonworld/releases/tag/${VERSION}`,
      "compatibility": {
        "minimum": `${MIN}`,
        "verified": `${VERIFIED}`,
        "maximum": `${MAX}`
      }
    }
  })
});
response_data = await response.json()