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
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || {
  conn: null,
  promise: null,
  isConnected: false,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToDatabase(): Promise<boolean> {
  if (cached.conn && cached.isConnected && mongoose.connection.readyState === 1) {
    return true;
  }

  if (!cached.promise || mongoose.connection.readyState === 0) {
    if (MONGODB_URI.startsWith("mongodb+srv://")) {
      try {
        dns.setServers(["8.8.8.8", "1.1.1.1"]);
      } catch (e) {}
    }

    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
    };

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((m) => {
        cached.isConnected = true;
        cached.conn = m;
        console.log("MongoDB Atlas connected successfully to:", MONGODB_URI.split("@")[1] || MONGODB_URI);
        return m;
      })
      .catch((err) => {
        cached.promise = null;
        cached.isConnected = false;
        console.warn("MongoDB connection failed, using local persistent data store fallback:", err.message);
        return null;
      });
  }

  try {
    cached.conn = await cached.promise;
    return !!(cached.conn && cached.isConnected);
  } catch {
    cached.promise = null;
    cached.isConnected = false;
    return false;
  }
}

export function isMongoConnected(): boolean {
  return cached.isConnected && mongoose.connection.readyState === 1;
}
