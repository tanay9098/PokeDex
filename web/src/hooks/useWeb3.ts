import { useEffect, useState } from 'react';
import {
  initializeWeb3,
  switchToPolygon,
  getConnectedAccount,
  ContractAddresses,
  getSigner,
} from '../utils/web3-validated';
import { Web3Error, logError } from '../utils/web3-error-handler';

export interface UseWeb3State {
  isConnected: boolean;
  isInitialized: boolean;
  currentAccount: string | null;
  error: Web3Error | null;
  isLoading: boolean;
}

const initialState: UseWeb3State = {
  isConnected: false,
  isInitialized: false,
  currentAccount: null,
  error: null,
  isLoading: true,
};

/**
 * Custom hook for managing Web3 connections and state
 */
export function useWeb3(contractAddresses?: ContractAddresses) {
  const [state, setState] = useState<UseWeb3State>(initialState);

  // Initialize Web3 on component mount
  useEffect(() => {
    const initializeWeb3Connection = async () => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        // Switch to Polygon network
        await switchToPolygon();
        setState((prev) => ({ ...prev, isConnected: true }));

        // Get connected account
        const account = await getConnectedAccount();
        setState((prev) => ({ ...prev, currentAccount: account }));

        // Initialize Web3 if contract addresses provided
        if (contractAddresses) {
          await initializeWeb3(contractAddresses);
          setState((prev) => ({ ...prev, isInitialized: true }));
        }

        setState((prev) => ({ ...prev, isLoading: false }));
      } catch (error) {
        logError(error, 'useWeb3.initialize');
        setState((prev) => ({
          ...prev,
          error: error instanceof Web3Error ? error : new Web3Error(String(error), 'UNKNOWN'),
          isLoading: false,
        }));
      }
    };

    initializeWeb3Connection();
  }, [contractAddresses]);

  // Listen for account changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setState((prev) => ({
          ...prev,
          isConnected: false,
          currentAccount: null,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          currentAccount: accounts[0],
        }));
      }
    };

    const handleChainChanged = () => {
      // Reload page on chain change for safety
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  return state;
}
