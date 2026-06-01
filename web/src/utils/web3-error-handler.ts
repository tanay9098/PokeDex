/**
 * Web3 Error Handler
 * Centralized error handling for Web3 operations
 */

export class Web3Error extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'Web3Error';
  }
}

export class WalletNotConnectedError extends Web3Error {
  constructor() {
    super(
      'Wallet not connected. Please install MetaMask and connect your wallet.',
      'WALLET_NOT_CONNECTED'
    );
    this.name = 'WalletNotConnectedError';
  }
}

export class InvalidContractAddressError extends Web3Error {
  constructor(address: string) {
    super(
      `Invalid contract address: ${address}. Please check your environment variables.`,
      'INVALID_CONTRACT_ADDRESS'
    );
    this.name = 'InvalidContractAddressError';
  }
}

export class NetworkSwitchError extends Web3Error {
  constructor(originalError?: unknown) {
    super(
      'Failed to switch to Polygon network. Please switch manually in MetaMask.',
      'NETWORK_SWITCH_FAILED',
      originalError
    );
    this.name = 'NetworkSwitchError';
  }
}

export class SignerError extends Web3Error {
  constructor(originalError?: unknown) {
    super(
      'Failed to get signer. Please make sure your wallet is unlocked.',
      'SIGNER_ERROR',
      originalError
    );
    this.name = 'SignerError';
  }
}

export class ContractInitializationError extends Web3Error {
  constructor(contractName: string, originalError?: unknown) {
    super(
      `Failed to initialize ${contractName} contract. Please check contract addresses and network.`,
      'CONTRACT_INITIALIZATION_FAILED',
      originalError
    );
    this.name = 'ContractInitializationError';
  }
}

export class TransactionError extends Web3Error {
  constructor(operation: string, originalError?: unknown) {
    super(
      `Transaction failed for ${operation}. Please check your wallet balance and try again.`,
      'TRANSACTION_FAILED',
      originalError
    );
    this.name = 'TransactionError';
  }
}

/**
 * Validate Ethereum address format
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Log error with context
 */
export function logError(error: unknown, context: string): void {
  console.error(`[Web3Error - ${context}]`, error);
  if (error instanceof Web3Error) {
    console.error(`Code: ${error.code}`);
    if (error.originalError) {
      console.error(`Original Error:`, error.originalError);
    }
  }
}
