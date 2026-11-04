import mongoose from "mongoose";
import dns from "dns";

// Support MongoDB Atlas on Windows environments where local ISP DNS refuses SRV queries
const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/courier_system";
if (uri.startsWith("mongodb+srv://")) {
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
  } catch (e) {}
}

const MONGODB_URI = uri;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose | null> | null;
  isConnected: boolean;
  lastFailureTime: number;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const RETRY_COOLDOWN_MS = 20000; // 20 seconds cooldown between retry attempts to prevent UI stalls

let cached: MongooseCache = global.mongooseCache || {
  conn: null,
  promise: null,
  isConnected: false,
  lastFailureTime: 0,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToDatabase(): Promise<boolean> {
  if (cached.conn && cached.isConnected && mongoose.connection.readyState === 1) {
    return true;
  }

  // Fast path: If a recent connection attempt failed within the last 20 seconds,
  // do not block the HTTP request with a long timeout; use fast local fallback.
  if (Date.now() - cached.lastFailureTime < RETRY_COOLDOWN_MS) {
    return false;
  }

  if (!cached.promise || mongoose.connection.readyState === 0) {
    if (MONGODB_URI.startsWith("mongodb+srv://")) {
      try {
        dns.setServers(["8.8.8.8", "1.1.1.1"]);
      } catch (e) {}
    }

    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 4000, // 4-second timeout for cloud connections
    };

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((m) => {
        cached.isConnected = true;
        cached.conn = m;
        cached.lastFailureTime = 0;
        console.log("✓ MongoDB Atlas connected successfully to:", MONGODB_URI.split("@")[1] || MONGODB_URI);
        return m;
      })
      .catch((err) => {
        cached.promise = null;
        cached.isConnected = false;
        cached.lastFailureTime = Date.now();
        console.warn("MongoDB connection failed (IP not whitelisted or network down). Using fast local persistent fallback:", err.message);
        return null;
      });
  }

  try {
    cached.conn = await cached.promise;
    return !!(cached.conn && cached.isConnected);
  } catch {
    cached.promise = null;
    cached.isConnected = false;
    cached.lastFailureTime = Date.now();
    return false;
  }
}

export function isMongoConnected(): boolean {
  return cached.isConnected && mongoose.connection.readyState === 1;
}
