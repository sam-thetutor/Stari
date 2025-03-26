import { BaseMessage } from "@langchain/core/messages";

class MemoryStore {
  private conversations: BaseMessage[];

  constructor() {
    this.conversations = [];
  }

  // Get conversation history
  getHistory(): BaseMessage[] {
    return this.conversations;
  }

  // Add message to history
  addMessage(message: BaseMessage): void {
    this.conversations.push(message);
  }

  // Clear conversation history
  clearHistory(): void {
    this.conversations = [];
  }
}

export const memoryStore = new MemoryStore(); 