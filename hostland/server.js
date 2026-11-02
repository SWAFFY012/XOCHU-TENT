// Обёртка над сервером Next.js для Hostland.
// 1. Отдаёт файлы проверки SSL (Let's Encrypt, /.well-known/acme-challenge/*)
//    из htdocs/www сайта — нужны для продления сертификата.
// 2. Перенаправляет все запросы по http на https (301).
// 3. Перезапускается после деплоя: когда меняется tmp/restart.txt, перестаёт принимать запросы и завершается,
//    хостинг поднимает новый процесс со свежей сборкой на следующем запросе (сам Hostland restart.txt не отслеживает).
// Остальные запросы обрабатывает Next.js (next-server.js — это server.js из .next/standalone).
// 4. Применяет server-update.tgz: .next/server (около 700 мелких файлов, которые меняются при каждой сборке) приходит
//    по FTP одним архивом, потому что FTP Hostland тратит на каждый файл около секунды.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

function applyUpdate() {
  const archive = path.join(__dirname, "server-update.tgz");
  if (!fs.existsSync(archive)) return;
  const next = path.join(__dirname, ".next");
  const fresh = path.join(next, "server.new");
  const old = path.join(next, "server.old");
  const current = path.join(next, "server");
  let swapped = false;
  try {
    fs.rmSync(fresh, { recursive: true, force: true });
    fs.mkdirSync(fresh, { recursive: true });
    execFileSync("tar", ["-xzf", archive, "-C", fresh, "--strip-components=1"], { timeout: 120_000 });
    // архив битый или пустой — старый .next/server остаётся как есть
    if (!fs.existsSync(path.join(fresh, "pages-manifest.json"))) throw new Error("в архиве нет .next/server");
    fs.rmSync(old, { recursive: true, force: true });
    if (fs.existsSync(current)) fs.renameSync(current, old);
    swapped = true;
    fs.renameSync(fresh, current);
    fs.rmSync(archive, { force: true });
    fs.rm(old, { recursive: true, force: true }, () => {});
    console.log("[hostland] .next/server обновлён из server-update.tgz");
  } catch (e) {
    console.error("[hostland] не удалось применить server-update.tgz:", e.message);
    // возвращаем прежний .next/server, а архив откладываем, чтобы не пробовать снова при каждом запуске
    if (swapped && !fs.existsSync(current) && fs.existsSync(old)) fs.renameSync(old, current);
    fs.rmSync(fresh, { recursive: true, force: true });
    try {
      fs.renameSync(archive, archive + ".bad");
    } catch {}
  }
}
applyUpdate();

const ACME_DIR = path.join(__dirname, "../../htdocs/www/.well-known/acme-challenge");
const PREFIX = "/.well-known/acme-challenge/";

const originalCreateServer = http.createServer;
http.createServer = function (...args) {
  const i = args.findIndex((a) => typeof a === "function");
  if (i !== -1) {
    const next = args[i];
    args[i] = (req, res) => {
      if (req.url && req.url.startsWith(PREFIX)) {
        const name = path.basename(req.url.slice(PREFIX.length).split("?")[0]);
        return fs.readFile(path.join(ACME_DIR, name), (err, body) => {
          if (err) return next(req, res);
          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end(body);
        });
      }
      // nginx Hostland передаёт исходный протокол в X-Forwarded-Proto
      if (req.headers["x-forwarded-proto"] === "http" && req.headers.host) {
        res.writeHead(301, { Location: "https://" + req.headers.host + req.url });
        return res.end();
      }
      return next(req, res);
    };
  }
  const server = originalCreateServer.apply(this, args);
  servers.push(server);
  return server;
};

const servers = [];
const RESTART_FILE = path.join(__dirname, "tmp/restart.txt");
fs.watchFile(RESTART_FILE, { interval: 5000 }, (cur, prev) => {
  if (cur.mtimeMs === prev.mtimeMs) return;
  console.log("[hostland] restart.txt изменился — перезапуск");
  servers.forEach((s) => s.close());
  // текущие запросы дорабатывают, но не дольше 10 секунд
  setTimeout(() => process.exit(0), 10_000).unref();
  Promise.all(servers.map((s) => new Promise((r) => s.on("close", r)))).then(() => process.exit(0));
});

require("./next-server.js");
