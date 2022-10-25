/**
 * @DEV: If the sandbox is throwing dependency errors, chances are you need to clear your browser history.
 * This will trigger a re-install of the dependencies in the sandbox – which should fix things right up.
 * Alternatively, you can fork this sandbox to refresh the dependencies manually.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';

// TODO: Remove @solana/web3.js package?
// import { clusterApiUrl, Connection } from '@solana/web3.js';

import { getProvider } from './utils';

import { TLog, Web3Provider } from './types';

import { Logs, Sidebar, NoProvider } from './components';
import { ethers } from 'ethers';

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

// const provider = getProvider();
let accounts = [];
const message = 'To avoid digital dognappers, sign below to authenticate with CryptoCorgis.';
const sleep = (timeInMS) => new Promise((resolve) => setTimeout(resolve, timeInMS));

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
  provider: any;
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
  const [provider, setProvider] = useState<Web3Provider | null>(null);
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
    (async () => {
      await sleep(100);
      setProvider(getProvider());
    })();
  }, []);

  useEffect(() => {
    if (!provider) return;

    provider.on('connect', (connectionInfo: { chainId: string }) => {
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
        message: 'lost connection to the rpc',
      });
    });

    provider.on('accountsChanged', (newAccounts: String[]) => {
      if (newAccounts) {
        accounts = newAccounts;
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
         * provider.send('eth_requestAccounts', []).catch((err) => {
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

        provider.send('eth_requestAccounts', []).catch((error) => {
          createLog({
            status: 'error',
            method: 'accountChanged',
            message: `Failed to re-connect: ${error.message}`,
          });
        });
      }
    });
  }, [provider, createLog]);

  /** eth_sendTransaction */
  const handleEthSendTransaction = useCallback(async () => {
    if (!provider) return;

    const signer = provider.getSigner();
    const address = await signer.getAddress();
    const gasPrice = await provider.getGasPrice();
    const transactionParameters = {
      nonce: await provider.getTransactionCount(address), // ignored by Phantom
      gasPrice, // customizable by user during MetaMask confirmation.
      gasLimit: ethers.utils.hexlify(100000),
      to: address, // Required except during contract publications.
      from: address, // must match user's active address.
      value: ethers.utils.parseUnits('1', 'wei'), // Only required to send ether to the recipient from the initiating external account.
      data: '0x2208b07b3c285f9998749c90d270a61c63230983054b5cf1ddee97ea763d3b22', // optional arbitrary hex data
    };
    try {
      const transaction = await signer.sendTransaction(transactionParameters);
      createLog({
        status: 'info',
        method: 'eth_sendTransaction',
        message: `Sending transaction: ${JSON.stringify(transaction)}`,
      });
      try {
        const txReceipt = await transaction.wait(1);
        createLog({
          status: 'info',
          method: 'eth_sendTransaction',
          message: `TX included: ${JSON.stringify(txReceipt)}`,
        });
      } catch (error) {
        createLog({
          status: 'error',
          method: 'eth_sendTransaction',
          message: `Failed to include transaction on the chain: ${error.message}`,
        });
      }
    } catch (error) {
      createLog({
        status: 'error',
        method: 'eth_sendTransaction',
        message: error.message,
      });
    }
  }, [provider, createLog]);

  /** SignMessage */
  const handleSignMessage = useCallback(async () => {
    if (!provider) return;
    try {
      const signer = provider.getSigner();
      const signature = await signer.signMessage(message);
      createLog({
        status: 'success',
        method: 'signMessage',
        message: `Message signed: ${JSON.stringify(signature)}`,
      });
      return signature;
    } catch (error) {
      createLog({
        status: 'error',
        method: 'signMessage',
        message: error.message,
      });
    }
  }, [provider, createLog]);

  /** Connect */
  const handleConnect = useCallback(async () => {
    if (!provider) return;

    try {
      accounts = await provider.send('eth_requestAccounts', []);
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
  }, [provider, createLog]);

  const connectedMethods = useMemo(() => {
    return [
      {
        name: 'Send Transaction',
        onClick: handleEthSendTransaction,
      },
      {
        name: 'Sign Message',
        onClick: handleSignMessage,
      },
    ];
  }, [handleEthSendTransaction, handleSignMessage]);

  return {
    address: accounts[0],
    connectedMethods,
    handleConnect,
    provider,
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

  if (!props.provider) {
    return <NoProvider />;
  }

  return <StatelessApp {...props} />;
};

export default App;
