export interface StellarBalance {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
}

export interface BalanceResponse {
  address: string;
  balances: StellarBalance[];
}

export interface TransactionResponse {
  success: boolean;
  transaction_hash?: string;
  explorer_link?: string;
  new_balance?: string;
  error?: string;
}

export interface SendTokensParams {
  userId: string;
  destination: string;
  asset: string;
  amount: string;
} 