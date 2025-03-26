import { tool } from "@langchain/core/tools";
import { z } from "zod";
import StellarSdk from '@stellar/stellar-sdk';
import { BalanceResponse, TransactionResponse, SendTokensParams } from "./types.js";
import User from './models/User.js';

// Initialize Stellar SDK
// const server = new StellarSdk.Server(
//   process.env.STELLAR_NETWORK === 'TESTNET' 
//     ? 'https://horizon-testnet.stellar.org' 
//     : 'https://horizon.stellar.org'
// );

var server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');




// Tool to check wallet balance
const checkBalanceTool = tool(
  async (input: { address: string }): Promise<string> => {
    try {
      const account = await server.loadAccount(input.address);
      console.log("account :",account);

      const balances = account.balances.map((balance: any) => ({
        asset_type: balance.asset_type,
        asset_code: balance.asset_code,
        asset_issuer: balance.asset_issuer,
        balance: balance.balance,
      }));


      const response: BalanceResponse = {
        address: input.address,
        balances: balances,
      };
      console.log("balance response :",response);
      return JSON.stringify(response, null, 2);
    } catch (e: any) {
      console.warn("Error fetching balance", e.message);
      return `Error fetching balance: ${e.message}`;
    }
  },
  {
    name: "check_balance",
    description: "Checks the balance of a Stellar wallet address",
    schema: z.object({
      address: z.string().describe("The Stellar wallet address to check"),
    }),
  }
);

// Tool to send tokens
const sendTokensTool = tool(
  async (input: SendTokensParams): Promise<string> => {
    try {
      console.log("Sending tokens with input:", input);
      const user = await User.findOne({ phoneNumber: input.userId });
      console.log("Found user:", user ? "yes" : "no", "for phoneNumber:", input.userId);
      if (!user) {
        throw new Error("User not found. Please create an account first.");
      }

      // 2. Load the source account using user's public key
      const sourceAccount = await server.loadAccount(user.publicKey);

      // 3. Create a transaction
      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: input.destination,
            asset: input.asset === 'XLM' 
              ? StellarSdk.Asset.native()
              : new StellarSdk.Asset(input.asset, process.env.ASSET_ISSUER || ''),
            amount: input.amount,
          })
        )
        .setTimeout(30)
        .build();

      // 4. Sign the transaction with user's private key
      const sourceKeys = StellarSdk.Keypair.fromSecret(user.privateKey);
      transaction.sign(sourceKeys);

      // 5. Submit the transaction
      const transactionResult = await server.submitTransaction(transaction);

      // Get updated balance after transaction
      const updatedAccount = await server.loadAccount(user.publicKey);
      const assetBalance = updatedAccount.balances.find((balance: any) => 
        input.asset === 'XLM' 
          ? balance.asset_type === 'native'
          : balance.asset_code === input.asset
      );

      console.log("Transaction successful:", transactionResult);
      const response: TransactionResponse = {
        success: true,
        transaction_hash: transactionResult.hash,
        explorer_link: `https://stellar.expert/explorer/testnet/tx/${transactionResult.paging_token}`,
        new_balance: assetBalance ? assetBalance.balance : '0',
      };
      
      return JSON.stringify(response, null, 2);
    } catch (e: any) {
      console.warn("Error sending tokens", e.message);
      const response: TransactionResponse = {
        success: false,
        error: e.message,
      };
      return JSON.stringify(response, null, 2);
    }
  },
  {
    name: "send_tokens",
    description: "Sends tokens from one Stellar wallet to another. Requires user to have an account.",
    schema: z.object({
      userId: z.string().describe("The phone number of the sender"),
      destination: z.string().describe("The destination Stellar wallet address"),
      asset: z.string().describe("The asset/token to send (e.g., 'XLM', 'USDC')"),
      amount: z.string().describe("The amount of tokens to send"),
    }),
  }
);

export const ALL_TOOLS_LIST = [
  checkBalanceTool,
  sendTokensTool,
]; 







// curl -X POST http://localhost:3020/message \
//   -H "Content-Type: application/json" \
//   -d '{
//     "message": "Check the balance of GCUE26HAHUDLLQ33FRX4KLK2EBITG4XDSWN5XIXMHH67BI5VJRXBF4JN"
//   }'