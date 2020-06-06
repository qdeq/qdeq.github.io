(function () {
  let client;
  const download = document.querySelector("#download");
  const upload = document.querySelector("#upload");
  const body = document.querySelector("body");

  // only the ones usable in the browser
  const announce = createTorrent.announceList
    .map((arr) => arr[0])
    .filter((url) => url.startsWith("wss://") || url.startsWith("ws://"));

  // register events
  download.addEventListener("submit", (event) => {
    event.preventDefault();
    const torrentId = document.querySelector("#torrentId").value.trim();
    addTorrent(torrentId);
  });

  function updateSpeed (torrent) {
    const speed = `
      <b>Progress:</b> ${torrent.progress}%
      <b>Peers:</b> ${torrent.numPeers}
      <b>Download speed:</b> ${prettierBytes(torrent.downloadSpeed)}/s
      <b>Upload speed:</b> ${prettierBytes(torrent.uploadSpeed)}/s
    `
  
    document.querySelector('#speed').innerHTML = speed
  }

  function handleTorrent(torrent) {
    updateSpeed(torrent);

    // Update the speed stats once per second
    const interval = setInterval(() => {
      updateSpeed(torrent);
    }, 1000);
    torrent.on("warning", logError);
    torrent.on("error", logError);
    torrent.on("done", () => {
      updateSpeed(torrent);
      clearInterval(interval);
    });

    log(`Torrent name: ${torrent.name}`);
    log(`Number of files: ${torrent.files.length}`);
    log(`Magnet URI: ${torrent.magnetURI}`);

    log("Files:");

    torrent.files.forEach((file) => {
      // Log file name and size
      log(`- ${file.name} | ${prettierBytes(file.length)}`);

      // Render the file in the page
      // file.appendTo("#log", { autoplay: true, muted: true }, (err) => {
      //   if (err) logError(err);
      // });

      file.getBlobURL((err, url) => {
        if (err) {
          // If there was an error, add it to the log section
          logError(err);
          return;
        }

        // Create a link element
        const a = document.createElement("a");
        a.href = url;
        a.textContent = "Download " + file.name;
        a.style.display = "block";

        // Download the file with given name when clicked
        a.download = file.name;

        // Add the link to the log section
        logElement(a);
      });
    });
  }

  function addTorrent(magnetUrl) {
    client.add(magnetUrl, { announce }, handleTorrent);
    log("Adding torrent!");
  }

  function log(message) {
    const log = document.querySelector("#log");
    const p = document.createElement("p");
    p.textContent = message;
    log.appendChild(p);
  }

  // Log an error object
  function logError(err) {
    const log = document.querySelector("#log");
    const p = document.createElement("p");
    p.textContent = err.message;
    p.style.color = "red";
    log.appendChild(p);
  }

  // Log an HTML element
  function logElement(elem) {
    const log = document.querySelector("#log");
    log.appendChild(elem);
  }

  function seedFiles(files) {
    if (files.length === 0) return;
    client.seed(files, handleTorrent);
    log(`Seeding new torrent with ${files.length} files!`);
  }

  function init() {
    client = new WebTorrent();
    client.on("warning", logError);
    client.on("error", logError);
    dragDrop(body, seedFiles);
    uploadElement(upload, (err, results) => {
      if (err) {
        logError(err);
        return;
      }

      // For each result, get the File object
      const files = results.map((result) => result.file);
      seedFiles(files);
    });
  }

  init();
})();
