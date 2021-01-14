const { projectId, mnemonic, key, address } = require('./secrets.json');
const HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = {

  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*",
      gas: 5000000,
      gasPrice: 10000000000,
    },
    rinkeby: {
      provider: () => new HDWalletProvider(mnemonic, `https://rinkeby.infura.io/v3/${projectId}`),
      network_id: 4,
      gas: 5000000,
      gasPrice: 10000000000,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true,
    },
    goerli: {
      provider: () => new HDWalletProvider(key, `https://goerli.infura.io/v3/${projectId}`),
      network_id: 5,
      gas: 5000000,
      gasPrice: 10000000000,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true,
    },
    main: { 
      provider: () => new HDWalletProvider(key, `https://mainnet.infura.io/v3/${projectId}`),
      network_id: 1,
      gas: 5000000,
      gasPrice: 44000000000,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true,
    }
  },
  mocha: {
    // timeout: 100000
  },
  compilers: {
    solc: {
      version: "0.7.6",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        evmVersion: "istanbul"
      }
    }
  }
};
