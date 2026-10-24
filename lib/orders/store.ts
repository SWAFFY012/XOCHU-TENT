import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Order } from "./types";

/**
 * Заказы в одном JSON-файле. Рассчитано на десятки заказов в день на одном сервере (Hostland).
 * Файл лежит вне папки сборки: деплой по FTP удаляет только то, что сам загрузил, и .data не трогает.
 */
const FILE = process.env.ORDERS_FILE || path.join(process.cwd(), ".data", "orders.json");

type Db = { seq: number; orders: Order[] };

// Все записи идут по очереди: два заказа одновременно не перезапишут друг друга
let queue: Promise<unknown> = Promise.resolve();

async function load(): Promise<Db> {
  try {
    return JSON.parse(await readFile(FILE, "utf8")) as Db;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return { seq: 1000, orders: [] };
    throw e;
  }
}

async function save(db: Db) {
  await mkdir(path.dirname(FILE), { recursive: true });
  // запись через временный файл: при сбое посреди записи старый файл останется целым
  const tmp = `${FILE}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(db, null, 1));
  await rename(tmp, FILE);
}

function exclusive<T>(fn: (db: Db) => Promise<T> | T): Promise<T> {
  const run = queue.then(async () => {
    const db = await load();
    const result = await fn(db);
    await save(db);
    return result;
  });
  queue = run.catch(() => {});
  return run;
}

/** Сохраняет новый заказ и выдаёт ему следующий номер. */
export function createOrder(draft: Omit<Order, "id">): Promise<Order> {
  return exclusive((db) => {
    db.seq += 1;
    const order = { ...draft, id: String(db.seq) };
    db.orders.push(order);
    return order;
  });
}

/** Меняет заказ под блокировкой. fn может вернуть false — тогда изменения не нужны. */
export function updateOrder(id: string, fn: (o: Order) => boolean | void): Promise<Order | undefined> {
  return exclusive((db) => {
    const order = db.orders.find((o) => o.id === id);
    if (!order) return undefined;
    if (fn(order) !== false) order.updatedAt = new Date().toISOString();
    return order;
  });
}

export async function getOrder(id: string): Promise<Order | undefined> {
  await queue;
  return (await load()).orders.find((o) => o.id === id);
}

/** Последние заказы, новые сверху. */
export async function listOrders(limit = 200): Promise<Order[]> {
  await queue;
  return (await load()).orders.slice(-limit).reverse();
}
