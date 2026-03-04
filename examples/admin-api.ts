/**
 * Admin API Example
 *
 * This example demonstrates how to set up and use the Admin Panel API
 * for managing your chatbot system.
 *
 * Prerequisites:
 * 1. A Supabase project with admin_users table (see docs/admin-panel-setup.md)
 * 2. Environment variables configured
 *
 * Run with:
 * npx tsx examples/admin-api.ts
 */

import express from "express";
import {
  AdminAPI,
  Chatbot,
  LiveChatPlugin,
  BroadcastPlugin,
  SupabaseAdapter,
  SupabaseAuthProvider,
} from "../src/index.js";

// Load environment variables (in production, use a proper .env loader)
const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://your-project.supabase.co";
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY || "your-service-key";
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:password@localhost:5432/chatbot";
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || "your-secret-key";
const PORT = Number.parseInt(process.env.PORT || "3001");

async function main() {
  console.log("🚀 Starting Admin API Example...\n");

  // 1. Initialize Database
  console.log("📦 Initializing database...");
  const database = new SupabaseAdapter({
    url: DATABASE_URL,
  });

  await database.connect();
  console.log("✅ Database connected\n");

  // 2. Initialize Chatbot
  console.log("🤖 Initializing chatbot...");
  const bot = new Chatbot({
    platforms: {
      // Add your platform configurations here
      // For this example, we'll run without platforms
    },
    database: {
      provider: "supabase",
      url: DATABASE_URL,
    },
    logging: {
      level: "info",
    },
  });

  // 3. Install Plugins
  console.log("🔌 Installing plugins...");

  const liveChatPlugin = new LiveChatPlugin({
    autoAssign: true,
    maxConversationsPerAgent: 5,
  });

  const broadcastPlugin = new BroadcastPlugin();

  bot.use(liveChatPlugin);
  bot.use(broadcastPlugin);
  console.log("✅ Plugins installed\n");

  // 4. Add some demo agents to LiveChat
  console.log("👥 Adding demo agents...");
  bot.use(liveChatPlugin);
  bot.use(broadcastPlugin);
  console.log("✅ Plugins installed\n");

  // 4. Add some demo agents to LiveChat
  console.log("👥 Adding demo agents...");
  liveChatPlugin.addAgent({
    id: "agent-1",
    name: "Alice Agent",
    email: "alice@example.com",
    status: "online",
    maxConversations: 5,
    activeConversations: 0,
  });

  liveChatPlugin.addAgent({
    id: "agent-2",
    name: "Bob Agent",
    email: "bob@example.com",
    status: "online",
    maxConversations: 3,
    activeConversations: 0,
  });
  console.log("✅ Demo agents added\n");

  // 5. Initialize Admin API
  console.log("🔐 Initializing Admin API...");
  const adminAPI = new AdminAPI(bot, {
    jwtSecret: ADMIN_JWT_SECRET,
    tokenExpiresIn: "24h",
    refreshTokenExpiresIn: "7d",
    cors: {
      origin: "*", // In production, set this to your admin UI URL
      credentials: true,
    },
    features: {
      analytics: true,
      broadcasts: true,
      liveChat: true,
      userManagement: true,
    },
  });
  console.log("✅ Admin API initialized\n");

  // 6. Create Express App
  console.log("🌐 Setting up Express server...");
  const app = express();

  // Mount admin API
  app.use("/api/admin", adminAPI.router);

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      service: "Omnichannel Chatbot Admin API",
      version: "1.0.0",
    });
  });

  // 7. Start Server
  app.listen(PORT, () => {
    console.log("✅ Express server started\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🎉 Admin API is now running!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log(`📍 Base URL: http://localhost:${PORT}`);
    console.log(`📍 Health Check: http://localhost:${PORT}/health`);
    console.log(`📍 Admin API: http://localhost:${PORT}/api/admin\n`);

    console.log("Available Endpoints:");
    console.log("  POST   /api/admin/auth/login");
    console.log("  POST   /api/admin/auth/refresh");
    console.log("  POST   /api/admin/auth/logout");
    console.log("  GET    /api/admin/auth/me");
    console.log("  GET    /api/admin/conversations");
    console.log("  GET    /api/admin/conversations/:id");
    console.log("  POST   /api/admin/conversations/:id/assign");
    console.log("  POST   /api/admin/conversations/:id/close");
    console.log("  GET    /api/admin/users");
    console.log("  GET    /api/admin/users/:id");
    console.log("  GET    /api/admin/broadcasts");
    console.log("  POST   /api/admin/broadcasts");
    console.log("  POST   /api/admin/broadcasts/:id/send");
    console.log("  GET    /api/admin/agents");
    console.log("  POST   /api/admin/agents");
    console.log("  GET    /api/admin/analytics");
    console.log("  GET    /api/admin/settings\n");

    console.log("📝 Example curl commands:\n");
    console.log("# Login");
    console.log(
      `curl -X POST http://localhost:${PORT}/api/admin/auth/login \\`
    );
    console.log('  -H "Content-Type: application/json" \\');
    console.log(
      '  -d \'{"email": "admin@example.com", "password": "your-password"}\'\n'
    );

    console.log("# List agents (requires authentication)");
    console.log(`curl http://localhost:${PORT}/api/admin/agents \\`);
    console.log('  -H "Authorization: Bearer YOUR_TOKEN_HERE"\n');

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("💡 To create an admin user, run:");
    console.log("   npx tsx examples/create-admin-user.ts\n");
  });

  // 8. Optional: Create a demo admin user programmatically
  if (process.env.CREATE_DEMO_ADMIN === "true") {
    console.log("👤 Creating demo admin user...");
    try {
      const authProvider = new SupabaseAuthProvider({
        supabaseUrl: SUPABASE_URL,
        supabaseServiceKey: SUPABASE_SERVICE_KEY,
      });

      const demoAdmin = await authProvider.createAdminUser(
        "admin@example.com",
        "demo-password-123",
        "admin"
      );

      console.log("✅ Demo admin user created:");
      console.log("   Email: admin@example.com");
      console.log("   Password: demo-password-123");
      console.log("   Role: admin\n");
    } catch (error: any) {
      console.log("⚠️  Demo admin user creation failed (may already exist)");
      console.log(`   ${error.message}\n`);
    }
  }

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\n🛑 Shutting down gracefully...");
    await database.disconnect();
    process.exit(0);
  });
}

// Run the example
main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
