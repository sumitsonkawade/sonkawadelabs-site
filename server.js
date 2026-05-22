const http = require("http");
const fs = require("fs");
const path = require("path");
const { Readable } = require("stream");

const PORT = Number(process.env.PORT || 3000);
const HOST = "0.0.0.0";
const REPO = process.env.DOWNLOAD_REPO || "sumitsonkawade/CSC-Pro";
const TOKEN = process.env.GITHUB_TOKEN || "";
const INDEX_PATH = path.join(__dirname, "index.html");

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function sendFile(res, filePath, contentType) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendJson(res, 500, { error: "Failed to read file." });
      return;
    }
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
      "Content-Length": content.length,
    });
    res.end(content);
  });
}

function githubHeaders(extra = {}) {
  const headers = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "sonkawadelabs-site",
    "X-GitHub-Api-Version": "2022-11-28",
    ...extra,
  };
  if (TOKEN) {
    headers.Authorization = `Bearer ${TOKEN}`;
  }
  return headers;
}

async function getLatestExeAsset() {
  const releaseResponse = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers: githubHeaders(),
  });
  if (!releaseResponse.ok) {
    const text = await releaseResponse.text();
    throw new Error(`GitHub latest release lookup failed (${releaseResponse.status}): ${text}`);
  }
  const release = await releaseResponse.json();
  const exeAsset = Array.isArray(release.assets)
    ? release.assets.find((asset) => typeof asset.name === "string" && asset.name.toLowerCase().endsWith(".exe"))
    : null;
  if (!exeAsset || !exeAsset.url) {
    throw new Error("No .exe asset found in the latest release.");
  }
  return exeAsset;
}

async function streamLatestExe(res) {
  if (!TOKEN) {
    sendJson(res, 500, { error: "Server is missing GITHUB_TOKEN." });
    return;
  }

  try {
    const exeAsset = await getLatestExeAsset();
    const assetResponse = await fetch(exeAsset.url, {
      headers: githubHeaders({ Accept: "application/octet-stream" }),
      redirect: "follow",
    });

    if (!assetResponse.ok || !assetResponse.body) {
      const text = await assetResponse.text();
      throw new Error(`GitHub asset download failed (${assetResponse.status}): ${text}`);
    }

    res.writeHead(200, {
      "Content-Type": assetResponse.headers.get("content-type") || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${exeAsset.name || "CSC_Pro_Setup.exe"}"`,
      "Cache-Control": "no-store",
    });

    Readable.fromWeb(assetResponse.body).pipe(res);
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Download failed.",
    });
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/") {
    sendFile(res, INDEX_PATH, "text/html; charset=utf-8");
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, { status: "ok" });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/download-latest") {
    void streamLatestExe(res);
    return;
  }

  sendJson(res, 404, { error: "Not found." });
});

server.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
