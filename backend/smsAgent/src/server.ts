import express from "express";
import {Request, Response} from "express";
import cors from "cors";
import { config } from "dotenv";
import { graph } from "./index.js";
import { memoryStore } from "./memory.js";
import { HumanMessage } from "@langchain/core/messages";
import { connectDB } from "./db/connect.js";
import User from "./models/User.js";
import StellarSdk from '@stellar/stellar-sdk';

config();

// Connect to MongoDB
connectDB();

const app = express();
const port = process.env.PORT || 3020;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


let server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');


//route to create a new user
app.get("/create-user", async (req: Request, res: Response) => {
  //strip the + from the phone number
  const phoneNumber = +1234567899;

  let secretPhase = process.env.SECRET_PHASE;
  
  // Create a 32-byte seed from phone number (for demo purposes)
  const seed = Buffer.alloc(32).fill(phoneNumber + secretPhase);
  
  const keypair = StellarSdk.Keypair.fromRawEd25519Seed(seed);
  // console.log("keypair:", keypair);

  //fund the account so that it becomes active
  try {
    await server.loadAccount(keypair.publicKey());
    console.log("Destination account exists");
   return  res.json({ walletAddress: keypair.publicKey() });
  } catch (e) {
    console.log("Destination account does not exist - creating new account");
  }

  //load the funding account
  const fundingAccount = await server.loadAccount(process.env.FUNDING_ACCOUNT_ADDRESS as string);
      // Create account transaction
      const transaction = new StellarSdk.TransactionBuilder(fundingAccount, {
        fee: await server.fetchBaseFee() as any,
        networkPassphrase: StellarSdk.Networks.TESTNET
      })
       //fund the account balance if it is new and does not have any funds
       .addOperation(
        StellarSdk.Operation.createAccount({
          destination: keypair.publicKey(),
          startingBalance: "4" // Minimum balance + extra for operations
        })
      )

      .setTimeout(180)
      .build();

      transaction.sign(StellarSdk.Keypair.fromSecret(process.env.FUNDING_ACCOUNT_SECRET as string));
      
      try {
        const createAccountResult = await server.submitTransaction(transaction);
        console.log("Account created successfully:", createAccountResult.hash);
        
        // Wait a bit for the transaction to be processed
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (createError: any) {
        console.error("Error creating account:", createError.response?.data?.extras?.result_codes);
        throw createError;
      }

  const user = await User.create({ 
    phoneNumber,
    publicKey: keypair.publicKey(),
    privateKey: keypair.secret(),
    pin: "1234"
  });

  //save the user to the database
  await user.save();

  //send the user public key only
  res.json({ walletAddress: keypair.publicKey() });
});



//route to reset the database
app.get("/reset-db", async (req: Request, res: Response) => {
  await User.deleteMany();
  res.json({ message: "Database reset" });
});



// Message route
app.post("/message", async (req: Request, res: Response) => {
  try {
    const { message, userId } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    // Get existing chat history for this user
    const chatHistory = memoryStore.getHistory(userId);

    // Add user message to chat history using HumanMessage constructor
    chatHistory.push(new HumanMessage(message));

    // Invoke the graph with the updated chat history
    const result = await graph.invoke({
      messages: chatHistory,
      userId: userId,
    });

    // Extract the last AI message from the result
    const aiMessages = result.messages.filter(
      (msg: any) => msg._getType() === "ai"
    );
    const lastAIMessage = aiMessages[aiMessages.length - 1];

    // Save updated conversation history
    memoryStore.saveHistory(userId, result.messages);

    // Send response
    res.json({
      response: lastAIMessage.content,
      userId: userId,
    });
  } catch (error: any) {
    console.error("Error processing message:", error);
    res.status(500).json({
      error: "Error processing message",
      details: error.message,
    });
  }
});

// Clear conversation history for a user
app.delete("/conversation/:userId", (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    memoryStore.clearHistory(userId);
    res.json({ status: "ok", message: "Conversation history cleared" });
  } catch (error: any) {
    res.status(500).json({
      error: "Error clearing conversation history",
      details: error.message,
    });
  }
});

// Get conversation history for a user
app.get("/conversation/:userId", (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const history = memoryStore.getHistory(userId);
    res.json({ history });
  } catch (error: any) {
    res.status(500).json({
      error: "Error fetching conversation history",
      details: error.message,
    });
  }
});

//return all the users
app.get("/users", async (req: Request, res: Response) => {
  const users = await User.find();
  res.json({ users });
});


// Health check route
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 