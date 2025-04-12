import { tool } from "@langchain/core/tools";
import { z } from "zod";
import StellarSdk from '@stellar/stellar-sdk';
import { BalanceResponse, TransactionResponse, SendTokensParams } from "./types.js";
import {config} from 'dotenv';

config();

const server = new StellarSdk.Horizon.Server(process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org');


// Tool to check wallet balance
const checkBalanceTool = tool(
  async (input: { address: string }): Promise<string> => {
    try {
      const account = await server.loadAccount(input.address);

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
      if (!process.env.STELLA_WALLET_ADDRESS || !process.env.STELLA_WALLET_SECRET) {
        throw new Error("Stellar credentials not configured");
      }

      let walletAddress = process.env.STELLA_WALLET_ADDRESS;
      let walletSecret = process.env.STELLA_WALLET_SECRET;

      // Load the source account
      const sourceAccount = await server.loadAccount(walletAddress);

      // Create transaction
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

      // Sign the transaction
      const sourceKeys = StellarSdk.Keypair.fromSecret(walletSecret);
      transaction.sign(sourceKeys);

      // Submit the transaction
      const transactionResult = await server.submitTransaction(transaction);

      // Get updated balance
      const updatedAccount = await server.loadAccount(walletAddress);
      const assetBalance = updatedAccount.balances.find((balance: any) => 
        input.asset === 'XLM' 
          ? balance.asset_type === 'native'
          : balance.asset_code === input.asset
      );

      const response: TransactionResponse = {
        success: true,
        transaction_hash: transactionResult.hash,
        explorer_link: `https://stellar.expert/explorer/testnet/tx/${transactionResult.hash}`,
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
    description: "Sends tokens from your Stellar wallet to another address",
    schema: z.object({
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