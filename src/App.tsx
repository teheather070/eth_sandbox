/**
 * @DEV: If the sandbox is throwing dependency errors, chances are you need to clear your browser history.
 * This will trigger a re-install of the dependencies in the sandbox – which should fix things right up.
 * Alternatively, you can fork this sandbox to refresh the dependencies manually.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { ethers } from 'ethers'
import { getListingHash } from './utils/hash';

import { getProvider, sendTransaction } from './utils';

import { TLog, Web3Provider } from './types';

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

declare global {
  interface Window {
    ethereum: any
  }
}
let accounts = [];
const OBJECT = {
  "listingAssets": {
      "tokens": [
          "0x0C0D1E9f35CB9FA05eCb96d35d127Fb0F65a4572"
      ],
      "tokenIds": [
          "33"
      ],
      "paymentTokens": [
          "0x5bDaC4aCdCff26CC27a03C6bcCa81cE4FDB1fEE9"
      ],
      "amounts": [
          "100000000000000000000"
      ]
  },
  "directSwaps": [
      {
          "tokens": [
              "0x0C0D1E9f35CB9FA05eCb96d35d127Fb0F65a4572"
          ],
          "roots": [
              "0xa03837a25210ee280c2113ff4b77ca23440b19d4866cca721c801278fd08d807"
          ],
          "paymentTokens": [],
          "amounts": []
      }
  ],
  "reserves": [],
  "royalty": {
      "to": [],
      "percentage": []
  },
  "tradeIntendedFor": "0x286066E3849c361f3B7029C545e0586cafc3127e",
  "timePeriod": 1680708904,
  "owner": "0xA3DD166E03f63280340CA4Ac2E4fCeB7A2a686f1",
  "nonce": 23
}

const hashedOBJ = getListingHash(OBJECT)
const hexed = ethers.utils.hexlify(hashedOBJ)
const arr = ethers.utils.arrayify(hexed)
const message = arr
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
  provider: Web3Provider;
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
      // sleep for 100 ms to give time to inject
      await sleep(100);
      setProvider(getProvider());
    })();
  }, []);

  useEffect(() => {
    if (!provider) return;

    window.ethereum.on('connect', (connectionInfo: { chainId: string }) => {
      createLog({
        status: 'success',
        method: 'connect',
        message: `Connected to chain: ${connectionInfo.chainId}`,
      });
    });

    window.ethereum.on('disconnect', () => {
      createLog({
        status: 'warning',
        method: 'disconnect',
        message: 'lost connection to the rpc',
      });
    });

    window.ethereum.on('accountsChanged', (newAccounts: String[]) => {
      if (newAccounts) {
        createLog({
          status: 'info',
          method: 'accountChanged',
          message: `Switched to account: ${newAccounts}`,
        });
        accounts = newAccounts;
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

    try {
      // send the transaction up to the network
      const transaction = await sendTransaction(provider);
      createLog({
        status: 'info',
        method: 'eth_sendTransaction',
        message: `Sending transaction: ${JSON.stringify(transaction)}`,
      });
      try {
        // wait for the transaction to be included in the next block
        const txReceipt = await transaction.wait(1); // 1 is number of blocks to be confirmed before returning the receipt
        createLog({
          status: 'success',
          method: 'eth_sendTransaction',
          message: `TX included: ${JSON.stringify(txReceipt)}`,
        });
      } catch (error) {
        // log out if the tx didn't get included for some reason
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
  }, [provider, createLog, accounts]);

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
      {
        name: 'Reconnect',
        onClick: handleConnect,
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
