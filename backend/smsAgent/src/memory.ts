import { BaseMessage } from "@langchain/core/messages";

class MemoryStore {
  private conversations: Map<string, BaseMessage[]>;

  constructor() {
    this.conversations = new Map();
  }

  // Get conversation history for a user
  getHistory(userId: string): BaseMessage[] {
    return this.conversations.get(userId) || [];
  }

  // Save conversation history for a user
  saveHistory(userId: string, messages: BaseMessage[]): void {
    this.conversations.set(userId, messages);
  }

  // Clear conversation history for a user
  clearHistory(userId: string): void {
    this.conversations.delete(userId);
  }
}

export const memoryStore = new MemoryStore(); 