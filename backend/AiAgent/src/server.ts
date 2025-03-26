import express from "express";
import cors from "cors";
import { config } from "dotenv";
import { graph } from "./index.js";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { memoryStore } from "./memory.js";

config();

const app = express();
const port = process.env.PORT || 3030;

// Middleware
app.use(cors());
app.use(express.json());

// Message route
app.post("/message", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Add user message to history
    const userMessage = new HumanMessage(message);
    memoryStore.addMessage(userMessage);

    // Get full conversation history
    const messages = memoryStore.getHistory();

    // Invoke the graph with full history
    const result = await graph.invoke({
      messages: messages,
    });

    // Extract the last AI message
    const aiMessages = result.messages.filter(
      (msg: any) => msg._getType() === "ai"
    );
    const lastAIMessage = aiMessages[aiMessages.length - 1];

    // Add AI response to history
    memoryStore.addMessage(lastAIMessage);

    // Send response with full conversation history
    res.json({
      response: lastAIMessage.content,
      history: messages.map(msg => ({
        type: msg._getType(),
        content: msg.content
      }))
    });
  } catch (error: any) {
    console.error("Error processing message:", error);
    res.status(500).json({
      error: "Error processing message",
      details: error.message,
    });
  }
});

// Clear conversation history
app.post("/clear", (req, res) => {
  memoryStore.clearHistory();
  res.json({ status: "ok" });
});

// Get conversation history
app.get("/history", (req, res) => {
  const history = memoryStore.getHistory();
  res.json({
    history: history.map(msg => ({
      type: msg._getType(),
      content: msg.content
    }))
  });
});

// Health check route
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 