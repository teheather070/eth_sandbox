/**
 * Retrieves the Phantom Provider from the window object
 * @returns {any | undefined} a Phantom provider if one exists in the window
 */
const getProvider = (): any | undefined => {
  if ('phantom' in window) {
    const anyWindow: any = window;
    const provider = anyWindow.ethereum

    if (provider) {
      return provider;
    }
  }

  window.open('https://phantom.app/', '_blank');
};

export default getProvider;
