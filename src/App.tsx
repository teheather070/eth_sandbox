/**
 * @DEV: If the sandbox is throwing dependency errors, chances are you need to clear your browser history.
 * This will trigger a re-install of the dependencies in the sandbox – which should fix things right up.
 * Alternatively, you can fork this sandbox to refresh the dependencies manually.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { clusterApiUrl, Connection, PublicKey } from '@solana/web3.js';

import {
  getProvider,
  signAllTransactions,
  signAndSendTransaction,
  signMessage,
  signTransaction,
  createTransferTransaction,
  pollSignatureStatus,
} from './utils';

import { TLog } from './types';

import { Logs, Sidebar, NoProvider } from './components';

// =============================================================================
// Styled Components
// =============================================================================

const StyledApp = styled.div`
  display: flex;
  flex-direction: row;
  height: 100vh;
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

// =============================================================================
// Constants
// =============================================================================

// alternatively, use 'https://solana-api.projectserum.com' for demo purposes only
const NETWORK = clusterApiUrl('mainnet-beta');
const provider = getProvider();
let accounts = []
const connection = new Connection(NETWORK);
const message = 'To avoid digital dognappers, sign below to authenticate with CryptoCorgis.';

// =============================================================================
// Typedefs
// =============================================================================

export type ConnectedMethods =
  | {
      name: string;
      onClick: () => Promise<string>;
    }
  | {
      name: string;
      onClick: () => Promise<void>;
    };

interface Props {
  address: string | null;
  connectedMethods: ConnectedMethods[];
  handleConnect: () => Promise<void>;
  logs: TLog[];
  clearLogs: () => void;
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * @DEVELOPERS
 * The fun stuff!
 */
const useProps = (): Props => {
  const [logs, setLogs] = useState<TLog[]>([]);

  const createLog = useCallback(
    (log: TLog) => {
      return setLogs((logs) => [...logs, log]);
    },
    [setLogs]
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, [setLogs]);

  useEffect(() => {
    if (!provider) return

    provider.on('connect', (connectionInfo: {chainId: string}) => {
      createLog({
        status: 'success',
        method: 'connect',
        message: `Connected to chain: ${connectionInfo.chainId}`,
      });
    });

    provider.on('disconnect', () => {
      createLog({
        status: 'warning',
        method: 'disconnect',
        message: '👋',
      });
    });

    provider.on('accountChanged', (accounts: String[]) => {
      if (accounts) {
        createLog({
          status: 'info',
          method: 'accountChanged',
          message: `Switched to account ${accounts[0]}`,
        });
      } else {
        /**
         * In this case dApps could...
         *
         * 1. Not do anything
         * 2. Only re-connect to the new account if it is trusted
         *
         * ```
         * provider.connect({ onlyIfTrusted: true }).catch((err) => {
         *  // fail silently
         * });
         * ```
         *
         * 3. Always attempt to reconnect
         */

        createLog({
          status: 'info',
          method: 'accountChanged',
          message: 'Attempting to switch accounts.',
        });

        provider.request({method: 'eth_requestAccounts'}).catch((error) => {
          createLog({
            status: 'error',
            method: 'accountChanged',
            message: `Failed to re-connect: ${error.message}`,
          });
        });
      }
    });

    return () => {
      provider.request({
        method: "wallet_requestPermissions",
        params: [
          {
            eth_accounts: {}
          }
        ]
      })
    };
  }, [createLog]);

  /** SignAndSendTransaction */
  const handleSignAndSendTransaction = useCallback(async () => {
    if (!provider) return;

    const transactionParameters = {
      nonce: '0x00', // ignored by Phantom
      gasPrice: '0x09184e72a000', // customizable by user during MetaMask confirmation.
      gas: '0x2710', // customizable by user during phantom confirmation.
      to: provider.selectedAddress, // Required except during contract publications.
      from: provider.selectedAddress, // must match user's active address.
      value: '0x001', // Only required to send ether to the recipient from the initiating external account.
      data:
        '0x7f7465737432000000000000000000000000000000000000000000000000000000600057', // Optional, but used for defining smart contract creation and interaction.
    };
    try {
      const transaction = await provider.request({
        method: 'eth_sendTransaction',
        params: [transactionParameters],
      })
      createLog({
        status: 'info',
        method: 'signAndSendTransaction',
        message: `Requesting signature for: ${JSON.stringify(transaction)}`,
      });
    } catch (error) {
      createLog({
        status: 'error',
        method: 'signAndSendTransaction',
        message: error.message,
      });
    }
  }, [createLog]);

  /** SignTransaction */
  const handleSignTransaction = useCallback(async () => {
    if (!provider) return;
    const transactionParameters = {
      nonce: '0x00', // ignored by Phantom
      gasPrice: '0x09184e72a000', // customizable by user during MetaMask confirmation.
      gas: '0x2710', // customizable by user during MetaMask confirmation.
      to: provider.selectedAddress, // Required except during contract publications.
      from: provider.selectedAddress, // must match user's active address.
      value: '0x00', // Only required to send ether to the recipient from the initiating external account.
      data:
        '0x7f7465737432000000000000000000000000000000000000000000000000000000600057', // Optional, but used for defining smart contract creation and interaction.
      chainId: '0x1', // Used to prevent transaction reuse across blockchains. Auto-filled by MetaMask.
    };
    try {
      createLog({
        status: 'info',
        method: 'signTransaction',
        message: `Requesting signature for: ${JSON.stringify(transactionParameters)}`,
      });
      const signedTransaction = await provider.request({
        method: 'eth_sendTransaction',
        params: [transactionParameters]
      })
      createLog({
        status: 'success',
        method: 'signTransaction',
        message: `Transaction signed: ${JSON.stringify(signedTransaction)}`,
      });
    } catch (error) {
      createLog({
        status: 'error',
        method: 'signTransaction',
        message: error.message,
      });
    }
  }, [createLog]);

  /** SignAllTransactions */
  const handleSignAllTransactions = useCallback(async () => {
    if (!provider) return;

    try {
      const transactions = [
        await createTransferTransaction(provider.publicKey, connection),
        await createTransferTransaction(provider.publicKey, connection),
      ];
      createLog({
        status: 'info',
        method: 'signAllTransactions',
        message: `Requesting signature for: ${JSON.stringify(transactions)}`,
      });
      const signedTransactions = await signAllTransactions(provider, transactions[0], transactions[1]);
      createLog({
        status: 'success',
        method: 'signAllTransactions',
        message: `Transactions signed: ${JSON.stringify(signedTransactions)}`,
      });
    } catch (error) {
      createLog({
        status: 'error',
        method: 'signAllTransactions',
        message: error.message,
      });
    }
  }, [createLog]);

  /** SignMessage */
  const handleSignMessage = useCallback(async () => {
    if (!provider) return;

    try {
      const signedMessage = await signMessage(provider, message);
      createLog({
        status: 'success',
        method: 'signMessage',
        message: `Message signed: ${JSON.stringify(signedMessage)}`,
      });
      return signedMessage;
    } catch (error) {
      createLog({
        status: 'error',
        method: 'signMessage',
        message: error.message,
      });
    }
  }, [createLog]);

  /** Connect */
  const handleConnect = useCallback(async () => {
    if (!provider) return;

    try {
      accounts = await provider.request({ method: 'eth_requestAccounts'});
      createLog({
        status: 'success',
        method: 'connect',
        message: `connected to account: ${accounts[0]}`,
      });
    } catch (error) {
      createLog({
        status: 'error',
        method: 'connect',
        message: error.message,
      });
    }
  }, [createLog]);

  /** Disconnect */
  const handleDisconnect = useCallback(async () => {
    if (!provider) return;

    try {
      // this won't work currently, we need the exetension to be updated
      await provider.request({
        method: "wallet_requestPermissions",
        params: [
          {
            eth_accounts: {}
          }
        ]
      });
    } catch (error) {
      createLog({
        status: 'error',
        method: 'disconnect',
        message: error.message,
      });
    }
  }, [createLog]);

  const connectedMethods = useMemo(() => {
    return [
      {
        name: 'Sign and Send Transaction',
        onClick: handleSignAndSendTransaction,
      },
      {
        name: 'Sign Transaction',
        onClick: handleSignTransaction,
      },
      {
        name: 'Sign All Transactions',
        onClick: handleSignAllTransactions,
      },
      {
        name: 'Sign Message',
        onClick: handleSignMessage,
      },
      {
        name: 'Disconnect',
        onClick: handleDisconnect,
      },
    ];
  }, [
    handleSignAndSendTransaction,
    handleSignTransaction,
    handleSignAllTransactions,
    handleSignMessage,
    handleDisconnect,
  ]);

  return {
    address: accounts[0],
    connectedMethods,
    handleConnect,
    logs,
    clearLogs,
  };
};

// =============================================================================
// Stateless Component
// =============================================================================

const StatelessApp = React.memo((props: Props) => {
  const { address, connectedMethods, handleConnect, logs, clearLogs } = props;

  return (
    <StyledApp>
      <Sidebar address={address} connectedMethods={connectedMethods} connect={handleConnect} />
      <Logs address={address} logs={logs} clearLogs={clearLogs} />
    </StyledApp>
  );
});

// =============================================================================
// Main Component
// =============================================================================

const App = () => {
  const props = useProps();

  if (!provider) {
    return <NoProvider />;
  }

  return <StatelessApp {...props} />;
};

export default App;
