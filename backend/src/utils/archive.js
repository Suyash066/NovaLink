const zlib = require("zlib");
const tarStream = require("tar-stream");

const MAX_FILES_LISTED = 1000;
const MAX_FILE_BYTES_TO_READ = 1 * 1024 * 1024; // 1MB — plenty for viewing source, not for binaries

function listArchiveFiles(buffer) {
  return new Promise((resolve, reject) => {
    const files = [];
    let truncated = false;

    const extract = tarStream.extract();
    extract.on("entry", (header, stream, next) => {
      if (header.type === "file") {
        if (files.length < MAX_FILES_LISTED) {
          files.push({ path: header.name, size: header.size });
        } else {
          truncated = true;
        }
      }
      stream.on("end", next);
      stream.resume();
    });
    extract.on("finish", () => resolve({ files, truncated }));
    extract.on("error", reject);

    zlib.gunzip(buffer, (err, unzipped) => {
      if (err) return reject(err);
      extract.end(unzipped);
    });
  });
}

function readArchiveFile(buffer, targetPath) {
  return new Promise((resolve, reject) => {
    let result = null;

    const extract = tarStream.extract();
    extract.on("entry", (header, stream, next) => {
      if (header.name === targetPath && header.type === "file") {
        if (header.size > MAX_FILE_BYTES_TO_READ) {
          result = { tooLarge: true, size: header.size };
          stream.on("end", next);
          stream.resume();
          return;
        }
        const chunks = [];
        stream.on("data", (c) => chunks.push(c));
        stream.on("end", () => {
          result = { buffer: Buffer.concat(chunks) };
          next();
        });
      } else {
        stream.on("end", next);
        stream.resume();
      }
    });
    extract.on("finish", () => resolve(result));
    extract.on("error", reject);

    zlib.gunzip(buffer, (err, unzipped) => {
      if (err) return reject(err);
      extract.end(unzipped);
    });
  });
}

// Rewrites one file's content inside the archive and returns a new gzipped
// tarball — used by the OWNER/MAINTAINER "edit on the website" flow. Copies
// every other entry through unchanged; adds the target as a new entry if it
// didn't already exist.
function repackArchiveWithFile(buffer, targetPath, newContent) {
  return new Promise((resolve, reject) => {
    const pack = tarStream.pack();
    const extract = tarStream.extract();
    const outChunks = [];
    let sawTarget = false;

    const gzip = zlib.createGzip();
    gzip.on("data", (c) => outChunks.push(c));
    gzip.on("end", () => resolve(Buffer.concat(outChunks)));
    gzip.on("error", reject);
    pack.pipe(gzip);

    extract.on("entry", (header, stream, next) => {
      if (header.name === targetPath && header.type === "file") {
        sawTarget = true;
        stream.resume(); // discard the old content
        stream.on("end", () => {
          const contentBuffer = Buffer.from(newContent, "utf8");
          pack.entry({ name: targetPath, size: contentBuffer.length, mtime: new Date() }, contentBuffer, next);
        });
      } else {
        const entry = pack.entry(header, next);
        stream.pipe(entry);
      }
    });

    extract.on("finish", () => {
      if (!sawTarget) {
        const contentBuffer = Buffer.from(newContent, "utf8");
        pack.entry({ name: targetPath, size: contentBuffer.length, mtime: new Date() }, contentBuffer, () => pack.finalize());
      } else {
        pack.finalize();
      }
    });
    extract.on("error", reject);

    zlib.gunzip(buffer, (err, unzipped) => {
      if (err) return reject(err);
      extract.end(unzipped);
    });
  });
}

module.exports = { listArchiveFiles, readArchiveFile, repackArchiveWithFile };
