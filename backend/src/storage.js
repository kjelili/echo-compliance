import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "redis";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const useEphemeralStorage = process.env.VERCEL === "1";
const baseDataDir = useEphemeralStorage ? path.resolve("/tmp/echo-compliance") : path.resolve(__dirname, "../data");
const logsFilePath = path.resolve(baseDataDir, "logs.json");
const backupsDir = path.resolve(baseDataDir, "backups");
const MAX_BACKUPS = 25;
const REDIS_LOGS_KEY = "echo-compliance:logs";
const REDIS_BACKUPS_KEY = "echo-compliance:logs:backups";
const DEFAULT_REDIS_ENDPOINT = "redis-17105.c325.us-east-1-4.ec2.cloud.redislabs.com:17105";

let redisClient;
let redisConnectPromise;

function inferRedisUrl() {
  const redisUrlFromEnv = process.env.REDIS_URL?.trim();
  if (redisUrlFromEnv) {
    if (/^redis(s)?:\/\//i.test(redisUrlFromEnv)) {
      return redisUrlFromEnv;
    }
    return `rediss://${redisUrlFromEnv}`;
  }

  const redisPassword = process.env.REDIS_PASSWORD?.trim();
  if (!redisPassword) {
    return null;
  }

  const endpoint = (process.env.REDIS_ENDPOINT || DEFAULT_REDIS_ENDPOINT).trim();
  const username = (process.env.REDIS_USERNAME || "default").trim();
  return `rediss://${encodeURIComponent(username)}:${encodeURIComponent(redisPassword)}@${endpoint}`;
}

async function getRedisClient() {
  const redisUrl = inferRedisUrl();
  if (!redisUrl) {
    return null;
  }

  if (!redisClient) {
    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 2000)
      }
    });
    redisClient.on("error", (error) => {
      console.error("Redis client error:", error.message);
    });
  }

  if (!redisClient.isOpen) {
    if (!redisConnectPromise) {
      redisConnectPromise = redisClient.connect().finally(() => {
        redisConnectPromise = null;
      });
    }
    await redisConnectPromise;
  }

  return redisClient;
}

async function ensureDataDirs() {
  await fs.mkdir(baseDataDir, { recursive: true });
  await fs.mkdir(backupsDir, { recursive: true });
}

export async function readLogs() {
  const client = await getRedisClient();
  if (client) {
    const content = await client.get(REDIS_LOGS_KEY);
    if (!content) {
      return [];
    }
    return JSON.parse(content);
  }

  try {
    await ensureDataDirs();
    const content = await fs.readFile(logsFilePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function writeLogs(logs) {
  const client = await getRedisClient();
  if (client) {
    const content = JSON.stringify(logs, null, 2);
    const backupEntry = JSON.stringify({
      createdAt: new Date().toISOString(),
      logs
    });
    await client.set(REDIS_LOGS_KEY, content);
    await client.lPush(REDIS_BACKUPS_KEY, backupEntry);
    await client.lTrim(REDIS_BACKUPS_KEY, 0, MAX_BACKUPS - 1);
    return;
  }

  await ensureDataDirs();
  const content = JSON.stringify(logs, null, 2);
  await fs.writeFile(logsFilePath, JSON.stringify(logs, null, 2), "utf-8");
  const backupName = `logs-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  await fs.writeFile(path.resolve(backupsDir, backupName), content, "utf-8");

  const backups = await fs.readdir(backupsDir);
  const sortedBackups = backups.sort();
  const staleBackups = sortedBackups.slice(0, Math.max(0, sortedBackups.length - MAX_BACKUPS));
  await Promise.all(staleBackups.map((name) => fs.unlink(path.resolve(backupsDir, name))));
}
