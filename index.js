const express = require("express");
const app = express();
const path = require("path");
const fs = require("fs");
const mime = require("mime-types");
const cors = require("cors");
const etag = require("etag");


const minimist = require('minimist');



const config = require("./config.json");

const argv = minimist(process.argv.slice(2));

const serverConfig = config.server;
const uploadDir = config.uploadDir;
const cacheConfig = config.cacheConfig;

app.disable("x-powered-by");

function cacheControl(req, res, next) {
  const ext = path.extname(req.path);
  const rule = cacheConfig.customRules[ext] || {};
  const maxAge = rule.maxAge || cacheConfig.defaultMaxAge;

  res.set("cache-control", `public, max-age=${maxAge}, s-maxage=${maxAge}`);
  next();
}

function loggingMiddleware(req, res, next) {
  const startTime = new Date();
  const ip = req.ip || req.connection.remoteAddress;

  res.on("finish", () => {
    const responseTime = new Date() - startTime;

    console.log(
      `[${new Date().toISOString()}]` +
        " \033[1;4m" +
        `${ip}` +
        "\033[0m " +
        `${req.method} ${req.originalUrl} ${res.statusCode} ${responseTime}ms`,
    );
  });

  next();
}

app.use(loggingMiddleware);

app.use(cacheControl);
app.use(cors());

app.use((req, res, next) => {
  if (["PATCH", "PUT", "DELETE", "OPTIONS"].includes(req.method)) {
    res.set("content-type", "application/json");
    return res.status(405).json({
      status: 405,
      message: "Why did you do this :sob:",
    });
  }
  next();
});


app.get("/metrics", (req, res) => {
	res.json(process.memoryUsage());
})


app.get("/*", (req, res) => {
  const filePath = path.join(
    __dirname,
    uploadDir,
    req.path.replace(/^\/+/, ""),
  );

  fs.stat(filePath, (err, stats) => {
    if (err) {
      if (err.code === "ENOENT") {
        return res.status(404).send("File not found");
      } else {
        return res.status(500).send("Server error");
      }
    }

    if (stats.isFile()) {
      const fileData = fs.readFileSync(filePath);
      const eTag = etag(fileData);
      res.set("timing-allow-origin", "*");
      res.set("access-control-expose-headers", "*");
      res.set("content-type", mime.lookup(filePath));
      res.set("content-length", stats.size.toString());
      res.set("etag", eTag);
      res.set("vary", "Accept-Encoding");
      res.set("server", argv.servername || "unknow-server");
      const clientETag = req.headers["if-none-match"];
      if (clientETag === eTag) {
        return res.status(304).end();
      }

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      fileStream.on("error", (error) => {
        console.error("Error sending file:", error);
        res.status(500).send("Error occurred while sending file");
      });
    } else {
      res.status(403).send("Forbidden: Not a file");
    }
  });
});

const PORT = argv.port || serverConfig.port || 3000
const HOST = argv.host || serverConfig.host || "localhost"
app.listen(PORT, HOST, () => {
  console.log(`CDN Server listening on port: ${PORT}, host: ${HOST}`);
});


