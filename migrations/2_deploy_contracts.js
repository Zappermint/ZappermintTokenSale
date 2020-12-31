//const Test = artifacts.require("Test.sol");
const ZappermintTokenSale = artifacts.require("ZappermintTokenSale.sol");

module.exports = async function (deployer, network, accounts) {
    
    const e18 = "000000000000000000";
    let openingTime, closingTime, softCap, hardCap, ethPrice, zappPrice, aggregator;

    switch (network) {
        case 'development':
            openingTime = (Date.now() / 1000 + 30).toFixed();// Open in 30 seconds after deployment //*/1610647200;
            closingTime = (Date.now() / 1000 + 300).toFixed();// Close in 5 minutes after deployment //*/1613325600;
            softCap = "432"+e18; // 0.03 ETH * 14400 //6000000E18;
            hardCap = "1440"+e18; // 0.1 ETH * 14400 //120000000E18;
            ethPrice = 720E8; // 720 USD -> Rate 14400 ZAPP / ETH
            zappPrice = 5E6; // 0.05 USD
            aggregator = "0x0000000000000000000000000000000000000000";
            break;
        case 'rinkeby':
            openingTime = (Date.now() / 1000 + 30).toFixed();// Open in 30 seconds after deployment //*/1610647200;
            closingTime = (Date.now() / 1000 + 28800).toFixed();// Close in 8 hours after deployment //*/1613325600;
            softCap = "432"+e18; // 0.03 ETH * 14400 //6000000E18;
            hardCap = "1440"+e18; // 0.1 ETH * 14400 //120000000E18;
            ethPrice = 720E8; // 720 USD -> Rate 14400 ZAPP / ETH
            zappPrice = 5E6; // 0.05 USD
            aggregator = "0x8A753747A1Fa494EC906cE90E9f37563A8AF630e";
            break;
        case 'goerli':
            openingTime = (Date.now() / 1000 + 30).toFixed();// Open in 30 seconds after deployment //*/1610647200;
            closingTime = (Date.now() / 1000 + 28800).toFixed();// Close in 8 hours after deployment //*/1613325600;
            softCap = "432"+e18; // 0.03 ETH * 14400 //6000000E18;
            hardCap = "1440"+e18; // 0.1 ETH * 14400 //120000000E18;
            ethPrice = 720E8; // 720 USD -> Rate 14400 ZAPP / ETH
            zappPrice = 5E6; // 0.05 USD
            aggregator = "0x0000000000000000000000000000000000000000";
            break;
        case 'main':
            openingTime = 1610647200; // Jan 14, 2021, 06:00:00PM UTC
            closingTime = 1613325600; // Feb 14, 2021, 06:00:00PM UTC
            softCap = "6000000"+e18;
            hardCap = "120000000"+e18;
            ethPrice = 720E8; // 720 USD -> Rate 14400 ZAPP / ETH
            zappPrice = 5E6; // 0.05 USD
            aggregator = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";
            break;


    }
    // Remix: 1610647200","1613325600","6000000000000000000000000","120000000000000000000000000","72000000000","5000000"

    await deployer.deploy(ZappermintTokenSale, openingTime, closingTime, softCap, hardCap, ethPrice, zappPrice, aggregator);

};
