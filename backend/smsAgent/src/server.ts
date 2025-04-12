import express from "express";
import { Request, Response } from "express";
import cors from "cors";
import { config } from "dotenv";
import { graph } from "./index.js";
import { memoryStore } from "./memory.js";
import { HumanMessage } from "@langchain/core/messages";
import { connectDB } from "./db/connect.js";
import User from "./models/User.js";
import StellarSdk from "@stellar/stellar-sdk";
import africastalking from "./utils.js";
config();

// Connect to MongoDB
connectDB();

const app = express();
const port = process.env.PORT || 3021;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let server = new StellarSdk.Horizon.Server(
  "https://horizon-testnet.stellar.org"
);

//route to create a new user
app.get("/create-user", async (req: Request, res: Response) => {
  //strip the + from the phone number
  const phoneNumber = +1234567899;

  let secretPhase = process.env.SECRET_PHASE;

  // Create a 32-byte seed from phone number (for demo purposes)
  const seed = Buffer.alloc(32).fill((phoneNumber + secretPhase) as string);

  const keypair = StellarSdk.Keypair.fromRawEd25519Seed(seed);
  // console.log("keypair:", keypair);

  //fund the account so that it becomes active
  try {
    await server.loadAccount(keypair.publicKey());
    console.log("Destination account exists");
    return res.json({ walletAddress: keypair.publicKey() });
  } catch (e) {
    console.log("Destination account does not exist - creating new account");
  }

  //load the funding account
  const fundingAccount = await server.loadAccount(
    process.env.FUNDING_ACCOUNT_ADDRESS as string
  );
  // Create account transaction
  const transaction = new StellarSdk.TransactionBuilder(fundingAccount, {
    fee: (await server.fetchBaseFee()) as any,
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    //fund the account balance if it is new and does not have any funds
    .addOperation(
      StellarSdk.Operation.createAccount({
        destination: keypair.publicKey(),
        startingBalance: "4", // Minimum balance + extra for operations
      })
    )

    .setTimeout(180)
    .build();

  transaction.sign(
    StellarSdk.Keypair.fromSecret(process.env.FUNDING_ACCOUNT_SECRET as string)
  );

  try {
    const createAccountResult = await server.submitTransaction(transaction);
    console.log("Account created successfully:", createAccountResult.hash);

    // Wait a bit for the transaction to be processed
    // await new Promise((resolve) => setTimeout(resolve, 5000));
  } catch (createError: any) {
    console.error(
      "Error creating account:",
      createError.response?.data?.extras?.result_codes
    );
    throw createError;
  }

  const user = await User.create({
    phoneNumber,
    publicKey: keypair.publicKey(),
    privateKey: keypair.secret(),
    pin: "1234",
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

//ussd route
app.post("/new-ussd", async (req: Request, res: Response) => {
  const { phoneNumber, text } = req.body;

  console.log("new ussd", req.body);
  let textArray = text?.includes("*") ? text.split("*") : [text];
  const level = textArray.length;
  const currentInput = textArray[textArray.length - 1];

  //sote the whole text respo

  try {
    let user = await User.findOne({ phoneNumber });
    // Main menu
    if (text === "") {
      let response = "CON Welcome to Stellar Wallet\n";
      response += "1. Create Wallet\n";
      response += "2. View Wallet\n";
      response += "3. Modify Pin\n";
      response += "4. Delete Wallet\n";
      response += "5. Send XLM\n";
      response += "6. Send USDT\n";
      response += "6. Check Balance\n";
      response += "7. Transaction History\n";
      response += "8. Help & Support\n";
      response += "9. Exit";
      return res.send(response);
    }

    // Handle menu options
    switch (textArray[0]) {
      case "1": // Create Wallet
        if (!user) {
          // Create a new account
          const seed = Buffer.alloc(32).fill(
            (phoneNumber + process.env.SECRET_PHASE) as string
          );
          const keypair = StellarSdk.Keypair.fromRawEd25519Seed(seed);

          try {
            // Try to load the account first
            const account = await server.loadAccount(keypair.publicKey());
            
            // If we reach here, account exists and is funded
            if (level === 1) {
              return res.send("CON Enter a PIN for your account (4 digits):");
            } else if (level === 2) {
              if (!/^\d{4}$/.test(currentInput)) {
                return res.send("END Invalid PIN. Please try again with 4 digits.");
              }
              // Save user directly since account already exists and is funded
              user = new User({
                phoneNumber,
                privateKey: keypair.secret(),
                publicKey: keypair.publicKey(),
                pin: currentInput,
              });
              await user.save();
              return res.send("END Account created successfully!");
            }
          } catch (e) {
            // Account doesn't exist, proceed with creation and funding
            try {
              // Load the funding account
              const fundingAccount = await server.loadAccount(
                process.env.FUNDING_ACCOUNT_ADDRESS as string
              );

              // Create account transaction
              const transaction = new StellarSdk.TransactionBuilder(fundingAccount, {
                fee: (await server.fetchBaseFee()) as any,
                networkPassphrase: StellarSdk.Networks.TESTNET,
              })
                .addOperation(
                  StellarSdk.Operation.createAccount({
                    destination: keypair.publicKey(),
                    startingBalance: "4",
                  })
                )
                .setTimeout(30)
                .build();

              transaction.sign(
                StellarSdk.Keypair.fromSecret(
                  process.env.FUNDING_ACCOUNT_SECRET as string
                )
              );

              await server.submitTransaction(transaction);

              if (level === 1) {
                return res.send("CON Enter a PIN for your account (4 digits):");
              } else if (level === 2) {
                if (!/^\d{4}$/.test(currentInput)) {
                  return res.send("END Invalid PIN. Please try again with 4 digits.");
                }
                user = new User({
                  phoneNumber,
                  privateKey: keypair.secret(),
                  publicKey: keypair.publicKey(),
                  pin: currentInput,
                });
                await user.save();
                return res.send("END Account created successfully!");
              }
            } catch (createError: any) {
              console.error(
                "Error creating account:",
                createError.response?.data?.extras?.result_codes
              );
              return res.send("END Error creating account. Please try again later.");
            }
          }
        } else {
          return res.send("END Account already exists!");
        }
        break;

      case "2": // View Private Key
        if (!user) {
          return res.send("END Please create an account first");
        }
        if (level === 1) {
          return res.send("CON Enter your PIN:");
        } else if (level === 2) {
          if (currentInput !== user.pin) {
            return res.send("END Invalid PIN");
          }
          // Send private key via SMS for security
          await africastalking.SMS.send({
            to: phoneNumber,
            message: `Your private key is: ${user.privateKey}`,
            from: process.env.AFRICASTALKING_SENDER_ID as string,
          });
          return res.send("END Your private key has been sent via SMS");
        }
        break;

      case "3": // Set PIN
        if (!user) {
          return res.send("END Please create an account first");
        }
        if (level === 1) {
          return res.send("CON Enter your current PIN:");
        } else if (level === 2) {
          if (currentInput !== user.pin) {
            return res.send("END Invalid PIN");
          }
          return res.send("CON Enter new PIN (4 digits):");
        } else if (level === 3) {
          if (!/^\d{4}$/.test(currentInput)) {
            return res.send("END Invalid PIN format. Use 4 digits.");
          }
          user.pin = currentInput;
          await user.save();
          return res.send("END PIN updated successfully!");
        }
        break;

      case "4": // Delete Account
        if (!user) {
          return res.send("END No account to delete");
        }
        if (level === 1) {
          return res.send("CON Enter PIN to confirm account deletion:");
        } else if (level === 2) {
          if (currentInput !== user.pin) {
            return res.send("END Invalid PIN");
          }
          await User.deleteOne({ phoneNumber });
          return res.send("END Account deleted successfully");
        }
        break;

      case "5": // Send XLM
        if (!user) {
          return res.send("END Please create an account first");
        }
        if (level === 1) {
          return res.send("CON Enter the recipient's phone number:");
        } else if (level === 2) {
          return res.send("CON Enter the amount to send:");
        } else if (level === 3) {
          return res.send("CON Enter your PIN:");
        } else if (level === 4) {
          if (currentInput !== user.pin) {
            return res.send("END Invalid PIN");
          }

          //get the recipient from the text and the amount

          console.log("textArray", textArray);
          let userPhoneNumber = textArray[1];
          let amount = textArray[2];

          console.log("userPhoneNumber", userPhoneNumber);
          console.log("amount", amount);

          //get the recipient from the database
          let recipientPublicKey: string;
          const recipient = await User.findOne({ phoneNumber: userPhoneNumber });

          if (!recipient) {
            const seed = Buffer.alloc(32).fill(
              (userPhoneNumber + process.env.SECRET_PHASE) as string
            );
            const keypair = StellarSdk.Keypair.fromRawEd25519Seed(seed);
            recipientPublicKey = keypair.publicKey();
          } else {
            recipientPublicKey = recipient.publicKey;
          }
          

          // Send XLM via Stellar SDK
          const sourceAccount = await server.loadAccount(user.publicKey);
          const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
            fee: (await server.fetchBaseFee()) as any,
            networkPassphrase: StellarSdk.Networks.TESTNET,
          })
            .addOperation(
              StellarSdk.Operation.payment({
                destination: recipientPublicKey,
                amount: amount,
                asset: StellarSdk.Asset.native(),
              })
            )
            .setTimeout(30)
            .build();

          transaction.sign(StellarSdk.Keypair.fromSecret(user.privateKey));

          const result = await server.submitTransaction(transaction);
          return res.send("END Transaction sent successfully");
        }
        break;

      case "6": // Send USDT
        if (!user) {
          return res.send("END Please create an account first");
        }
        if (level === 1) {
          return res.send("CON Enter the recipient's phone number:");
        } else if (level === 2) {
          return res.send("CON Enter the amount to send:");
        } else if (level === 3) {
          return res.send("CON Enter the memo:");
        } else if (level === 4) {
          return res.send("CON Enter your PIN:");
        } else if (level === 5) {
          if (currentInput !== user.pin) {
            return res.send("END Invalid PIN");
          }

          let userPhoneNumber = textArray[textArray.length - 2];
          let amount = textArray[textArray.length - 1];

          //get the recipient from the database
          let recipientPublicKey: string;
          const recipient = await User.findOne({ phoneNumber: userPhoneNumber });

          if (!recipient) {
            const seed = Buffer.alloc(32).fill(
              (userPhoneNumber + process.env.SECRET_PHASE) as string
            );
            const keypair = StellarSdk.Keypair.fromRawEd25519Seed(seed);
            recipientPublicKey = keypair.publicKey();
          } else {
            recipientPublicKey = recipient.publicKey;
          }

          // Send USDT via Stellar SDK
          const sourceAccount = await server.loadAccount(user.publicKey);
          const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
            fee: (await server.fetchBaseFee()) as any,
            networkPassphrase: StellarSdk.Networks.TESTNET,
          })
            .addOperation(
              StellarSdk.Operation.payment({
                destination: recipientPublicKey,
                amount: amount,
                asset: StellarSdk.Asset.native(),
              })
            )
            .setTimeout(30)
            .build();

          transaction.sign(StellarSdk.Keypair.fromSecret(user.privateKey));

          const result = await server.submitTransaction(transaction);
          return res.send("END Transaction sent successfully");
        }
        break;
        
        
        
        
        

      default:
        return res.send("END Invalid option");
    }
  } catch (error) {
    console.error("Error:", error);
    return res.send("END An error occurred. Please try again.");
  }
});

// Message route
app.post("/new-message", async (req: Request, res: Response) => {
  try {
    const { text, userId,from } = req.body;
    console.log("new message", req.body);

    if (!text) {
      return res.status(400).json({ error: "Message is required" });
    }

        if (!from) {
          return res.status(400).json({ error: "phone number is required" });
        }

    // Get existing chat history for this user
    const chatHistory = memoryStore.getHistory(from);

    // Add user message to chat history using HumanMessage constructor
    chatHistory.push(new HumanMessage(text));

    // Invoke the graph with the updated chat history
    const result = await graph.invoke({
      messages: chatHistory,
      userId: from,
    });

    // Extract the last AI message from the result
    const aiMessages = result.messages.filter(
      (msg: any) => msg._getType() === "ai"
    );
    const lastAIMessage = aiMessages[aiMessages.length - 1];

    // Save updated conversation history
    memoryStore.saveHistory(from, result.messages);

    console.log("lastAIMessage", lastAIMessage.content);
    //initialize the africastalking client
    await africastalking.SMS.send({
      to: from,
      message: lastAIMessage.content as string,
      from: process.env.AFRICASTALKING_SENDER_ID as string,
    });

    // Send response
    res.json({message:"Message sent successfully"});
    
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
