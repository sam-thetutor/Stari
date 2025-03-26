import { ToolNode } from "@langchain/langgraph/prebuilt";
import {
  Annotation,
  END,
  START,
  StateGraph,
  MessagesAnnotation,
} from "@langchain/langgraph";
import { BaseMessage, type AIMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { ALL_TOOLS_LIST } from "./tools.js";
import { config } from "dotenv";

config();

const GraphAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
});

const llm = new ChatOpenAI({
  model: "gpt-4",
  temperature: 0,
});

const toolNode = new ToolNode(ALL_TOOLS_LIST);

const callModel = async (state: typeof GraphAnnotation.State) => {
  const { messages } = state;

  const systemMessage = {
    role: "system",
    content:
      "You are a Stellar blockchain assistant. You can help users check wallet " +
      "balances and send tokens using their configured Stellar wallet. " +
      "Make sure to validate addresses and amounts before proceeding.",
  };

  const llmWithTools = llm.bindTools(ALL_TOOLS_LIST);
  const result = await llmWithTools.invoke([systemMessage, ...messages]);
  return { messages: result };
};

const shouldContinue = (state: typeof GraphAnnotation.State) => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];
  const messageCastAI = lastMessage as AIMessage;
  
  if (messageCastAI._getType() !== "ai" || !messageCastAI.tool_calls?.length) {
    return END;
  }

  return "tools";
};

const workflow = new StateGraph(GraphAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue, ["tools", END]);

export const graph = workflow.compile(); 