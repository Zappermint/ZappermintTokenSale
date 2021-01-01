const Migrations = artifacts.require("Migrations");
const ZappermintTokenSale = artifacts.require("ZappermintTokenSale.sol");

const adapter = Migrations.interfaceAdapter;
const web3 = adapter.web3;

module.exports = async function (deployer, network, accounts) {
    
    const e6 = "000000";
    const e8 = "00000000";
    const e18 = "000000000000000000";
    let openingTime, closingTime, softCap, hardCap, ethPrice, zappPrice, aggregator;

    switch (network) {
        case 'development':
            openingTime = Date.now() / 1000 + 30;// Open in 30 seconds after deployment //*/1610647200;
            closingTime = openingTime + 600;// Close in 10 minutes after opening //*/1613325600;
            softCap = "432"+e18; // 0.03 ETH * 14400 //6000000E18;
            hardCap = "1440"+e18; // 0.1 ETH * 14400 //120000000E18;
            ethPrice = "720"+e8; // 720 USD -> Rate 14400 ZAPP / ETH
            zappPrice = "5"+e6; // 0.05 USD
            aggregator = "0x8A753747A1Fa494EC906cE90E9f37563A8AF630e";
            break;
        case 'rinkeby':
            openingTime = Date.now() / 1000 + 540;// Open in 9 minutes after deployment //*/1610647200;
            closingTime = openingTime + 660;// Close in 11 minutes after opening //*/1613325600;
            softCap = "432"+e18; // 0.03 ETH * 14400 //6000000E18;
            hardCap = "1440"+e18; // 0.1 ETH * 14400 //120000000E18;
            ethPrice = "720"+e8; // 720 USD -> Rate 14400 ZAPP / ETH
            zappPrice = "5"+e6; // 0.05 USD
            aggregator = "0x8A753747A1Fa494EC906cE90E9f37563A8AF630e";
            break;
        case 'goerli':
            openingTime = Date.now() / 1000 + 540;// Open in 9 minutes after deployment //*/1610647200;
            closingTime = openingTime + 660;// Close in 11 minutes after opening //*/1613325600;
            softCap = "432"+e18; // 0.03 ETH * 14400 //6000000E18;
            hardCap = "1440"+e18; // 0.1 ETH * 14400 //120000000E18;
            ethPrice = "720"+e8; // 720 USD -> Rate 14400 ZAPP / ETH
            zappPrice = "5"+e6; // 0.05 USD
            aggregator = "0x0000000000000000000000000000000000000000";
            break;
        case 'main':
            openingTime = 1610647140; // Jan 14, 2021, 05:59:00PM UTC (1 minute before to make sure the blockchain can confirm)
            closingTime = 1613325600; // Feb 14, 2021, 06:00:00PM UTC
            softCap = "6000000"+e18;
            hardCap = "120000000"+e18;
            ethPrice = "720"+e8; // 720 USD -> Rate 14400 ZAPP / ETH
            zappPrice = "5"+e6; // 0.05 USD
            aggregator = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";
            break;
    }
    // Remix: "1610647200","1613325600","6000000000000000000000000","120000000000000000000000000","72000000000","5000000","0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419"

    openingTime = openingTime.toFixed();
    closingTime = closingTime.toFixed()

    await deployer.deploy(ZappermintTokenSale, openingTime, closingTime, softCap, hardCap, ethPrice, zappPrice, aggregator);

    let address = (await ZappermintTokenSale.deployed()).address;
    let abi = web3.eth.abi.encodeParameters(
        ['uint256',   'uint256',   'uint256', 'uint256', 'uint256', 'uint256', 'address'], 
        [openingTime, closingTime, softCap,   hardCap,   ethPrice,  zappPrice, aggregator]
    );
    abi = abi.substr(2, abi.length - 2);

    console.log(`Addr : ${address}`);
    console.log(`Open : ${openingTime}`);
    console.log(`Close: ${closingTime}`);
    console.log(`ABI  : ${abi}`);
};
