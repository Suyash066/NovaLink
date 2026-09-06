const fs = require("fs-extra");
const tar = require("tar");
const { Readable } = require("stream");

const EXCLUDES = new Set(["node_modules", ".git", ".nova-link"]);

// Gzipped tarball of everything in `dir` except the excluded set above.
async function packDirectory(dir = process.cwd()) {
  const entries = fs.readdirSync(dir).filter((name) => !EXCLUDES.has(name));
  const chunks = [];
  await new Promise((resolve, reject) => {
    const stream = tar.create({ gzip: true, cwd: dir }, entries);
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", resolve);
    stream.on("error", reject);
  });
  return Buffer.concat(chunks);
}

async function unpackArchive(buffer, destDir) {
  fs.ensureDirSync(destDir);
  await new Promise((resolve, reject) => {
    Readable.from(buffer)
      .pipe(tar.extract({ cwd: destDir }))
      .on("finish", resolve)
      .on("error", reject);
  });
}

module.exports = { packDirectory, unpackArchive };
