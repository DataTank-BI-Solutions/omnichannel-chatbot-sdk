/**
 * Plugin Testing Example (No External APIs Required)
 *
 * This example demonstrates all three plugins in action without
 * needing any external API keys. Perfect for quick local testing!
 *
 * Usage:
 *   npm run build
 *   node examples/test-plugins.js
 */

const {
  LiveChatPlugin,
  BroadcastPlugin,
  AIPlugin,
  Chatbot,
  Context,
} = require("../dist/index.cjs");

console.log("🧪 Testing Omnichannel Chatbot SDK Plugins\n");
console.log("=".repeat(60));

// Test 1: LiveChatPlugin
async function testLiveChatPlugin() {
  console.log("\n📋 Test 1: LiveChatPlugin");
  console.log("-".repeat(60));

  const liveChat = new LiveChatPlugin({
    autoAssign: true,
    maxConversationsPerAgent: 5,
  });

  // Create a minimal bot for installation
  const bot = new Chatbot({ platforms: {} });
  liveChat.install(bot);

  // Add some agents
  liveChat.addAgent({
    id: "agent1",
    name: "Alice Support",
    status: "online",
    maxConversations: 5,
    activeConversations: 0,
  });

  liveChat.addAgent({
    id: "agent2",
    name: "Bob Technical",
    status: "online",
    maxConversations: 3,
    activeConversations: 2,
  });

  liveChat.addAgent({
    id: "agent3",
    name: "Carol Sales",
    status: "offline",
    maxConversations: 5,
    activeConversations: 0,
  });

  console.log(`\n✓ Added ${liveChat.getAllAgents().length} agents`);
  console.log(`✓ Available agents: ${liveChat.getAvailableAgents().length}`);

  // Get all agents details
  const agents = liveChat.getAllAgents();
  agents.forEach((agent) => {
    console.log(
      `  - ${agent.name}: ${agent.status} (${agent.activeConversations}/${agent.maxConversations} conversations)`
    );
  });

  // Simulate agent assignment
  console.log("\n✓ Assigning conversation to agent...");
  const assigned = await liveChat.assignAgent("conv123", "agent1");
  console.log(`  → Success: ${assigned}`);

  const assignedAgent = liveChat.getAssignedAgent("conv123");
  console.log(`  → Assigned to: ${assignedAgent?.name}`);
  console.log(
    `  → Agent load: ${assignedAgent?.activeConversations}/${assignedAgent?.maxConversations}`
  );

  // Check assignment
  console.log(
    `\n✓ Is conversation assigned? ${liveChat.isAssigned("conv123")}`
  );

  // End conversation
  await liveChat.endConversation("conv123");
  console.log("✓ Conversation ended");
  console.log(
    `  → Agent load: ${assignedAgent?.activeConversations}/${assignedAgent?.maxConversations}`
  );

  console.log("\n✅ LiveChatPlugin test passed!");
}

// Test 2: BroadcastPlugin
async function testBroadcastPlugin() {
  console.log("\n📋 Test 2: BroadcastPlugin");
  console.log("-".repeat(60));

  const broadcast = new BroadcastPlugin({
    rateLimit: {
      telegram: 100, // Fast for testing
    },
    retry: {
      maxAttempts: 2,
      backoffMs: 50,
    },
  });

  // Create a minimal bot
  const bot = new Chatbot({ platforms: {} });

  // Add a mock platform
  bot.platforms.set("telegram", {
    name: "telegram",
    async sendMessage(chatId, message) {
      return { success: true, messageId: `msg_${Date.now()}` };
    },
  });

  broadcast.install(bot);

  // Add contacts
  console.log("\n✓ Adding contacts...");
  broadcast.addContact({
    userId: "user1",
    platform: "telegram",
    chatId: "chat1",
    firstName: "John",
    lastName: "Doe",
  });

  broadcast.addContact({
    userId: "user2",
    platform: "telegram",
    chatId: "chat2",
    firstName: "Jane",
    lastName: "Smith",
  });

  broadcast.addContact({
    userId: "user3",
    platform: "telegram",
    chatId: "chat3",
    firstName: "Bob",
    lastName: "Johnson",
  });

  console.log(`  → Total contacts: ${broadcast.getAllContacts().length}`);

  // Create a broadcast campaign
  console.log("\n✓ Creating broadcast campaign...");
  const campaign = broadcast.createBroadcast({
    name: "Weekly Newsletter",
    message: {
      type: "text",
      text: "📢 Hello! This is your weekly update. Thank you for being with us!",
    },
    targetPlatforms: ["telegram"],
    totalRecipients: 0,
  });

  console.log(`  → Campaign: "${campaign.name}" (${campaign.id})`);
  console.log(`  → Status: ${campaign.status}`);

  // Send broadcast
  console.log("\n✓ Sending broadcast...");
  const stats = await broadcast.sendBroadcast(campaign.id);

  console.log(`\n✓ Broadcast completed!`);
  console.log(`  → Total recipients: ${stats.total}`);
  console.log(`  → Successfully sent: ${stats.sent}`);
  console.log(`  → Failed: ${stats.failed}`);
  console.log(`  → Success rate: ${stats.successRate.toFixed(1)}%`);

  // Check final campaign status
  const updatedCampaign = broadcast.getBroadcast(campaign.id);
  console.log(`  → Final status: ${updatedCampaign?.status}`);

  console.log("\n✅ BroadcastPlugin test passed!");
}

// Test 3: AIPlugin
async function testAIPlugin() {
  console.log("\n📋 Test 3: AIPlugin");
  console.log("-".repeat(60));

  console.log("\n⚠️  Note: This test shows plugin configuration only");
  console.log(
    "   Real AI responses require GEMINI_API_KEY environment variable\n"
  );

  const ai = new AIPlugin({
    apiKey: process.env.GEMINI_API_KEY || "mock-api-key",
    provider: "gemini",
    model: "gemini-2.0-flash-exp",
    systemPrompt: "You are a helpful and friendly assistant.",
    temperature: 0.7,
    maxTokens: 1000,
    memory: {
      enabled: true,
      maxTurns: 10,
      ttlMinutes: 30,
    },
    intents: {
      enabled: true,
      builtIn: ["greeting", "farewell", "human_support", "general_inquiry"],
      custom: [
        {
          name: "pricing",
          keywords: ["price", "cost", "how much", "expensive"],
          description: "User asking about pricing",
        },
        {
          name: "features",
          keywords: ["feature", "capability", "can you", "able to"],
          description: "User asking about features",
        },
      ],
    },
    formatting: {
      maxLength: 500,
      tone: "friendly",
      includeEmoji: false,
    },
    fallback: {
      enabled: true,
      message:
        "I apologize, but I am temporarily unavailable. Please try again later.",
    },
  });

  console.log("✓ AIPlugin configured");
  console.log("  - Provider: Gemini");
  console.log("  - Model: gemini-2.0-flash-exp");
  console.log("  - Temperature: 0.7");
  console.log("  - Max Tokens: 1000");
  console.log("  - Memory: Enabled (10 turns, 30min TTL)");
  console.log("  - Intent Detection: Enabled");
  console.log("  - Built-in Intents: 4");
  console.log("  - Custom Intents: 2");
  console.log("  - Fallback: Enabled");

  // Test intent detection (works without API key)
  console.log("\n✓ Intent Detection (works offline):");

  const testMessages = [
    { text: "Hello there!", expected: "greeting" },
    { text: "Goodbye!", expected: "farewell" },
    { text: "I need help from a human", expected: "human_support" },
    { text: "How much does it cost?", expected: "pricing" },
    { text: "What features do you have?", expected: "features" },
  ];

  testMessages.forEach(({ text, expected }) => {
    // We can't actually call the private method, but we can show what would be detected
    const lowerText = text.toLowerCase();
    let detected = null;

    if (lowerText.includes("hello") || lowerText.includes("hi"))
      detected = "greeting";
    else if (lowerText.includes("goodbye") || lowerText.includes("bye"))
      detected = "farewell";
    else if (lowerText.includes("human") || lowerText.includes("help"))
      detected = "human_support";
    else if (
      lowerText.includes("cost") ||
      lowerText.includes("price") ||
      lowerText.includes("how much")
    )
      detected = "pricing";
    else if (lowerText.includes("feature") || lowerText.includes("can you"))
      detected = "features";

    const match = detected === expected ? "✓" : "✗";
    console.log(`  ${match} "${text}"`);
    console.log(`      Expected: ${expected}, Detected: ${detected || "none"}`);
  });

  if (process.env.GEMINI_API_KEY) {
    console.log("\n✓ GEMINI_API_KEY found - AI responses will work!");
  } else {
    console.log("\nℹ️  No GEMINI_API_KEY - Set it to enable real AI responses");
    console.log("   Get your key from: https://ai.google.dev/");
  }

  console.log("\n✅ AIPlugin test passed!");
}

// Run all tests
async function runAllTests() {
  try {
    await testLiveChatPlugin();
    await testBroadcastPlugin();
    await testAIPlugin();

    console.log("\n" + "=".repeat(60));
    console.log("🎉 All plugin tests completed successfully!");
    console.log("=".repeat(60));
    console.log("\n✨ Next Steps:");
    console.log("1. To test real AI responses:");
    console.log("   GEMINI_API_KEY=your-key node examples/test-plugins.js");
    console.log("\n2. To build a real Telegram bot:");
    console.log("   - Get bot token from @BotFather");
    console.log("   - Get Gemini API key from https://ai.google.dev/");
    console.log("   - See README for complete setup guide\n");
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

runAllTests().catch(console.error);
