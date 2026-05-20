const fs = require('fs');
const path = require('path');

const version = {
  version: new Date().toISOString(),
};

const outputPath = path.join(__dirname, '..', 'public', 'version.json');
fs.writeFileSync(outputPath, JSON.stringify(version));
console.log(`✅ version.json generated: ${version.version}`);
