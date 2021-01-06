const Migrations = artifacts.require("Migrations");
const ZappermintTokenSale = artifacts.require("ZappermintTokenSale.sol");

const adapter = Migrations.interfaceAdapter;
const web3 = adapter.web3;

module.exports = async function (deployer, network, accounts) {
    
    const e6 = "000000";
    const e8 = "00000000";
    const e18 = "000000000000000000";
    let openingTime, closingTime, softCap, hardCap, ethPrice, zappPrice, referrerMin, refereeMin, referralBonus, bonusEndTime, aggregator;

    switch (network) {
        case 'development':
            openingTime = Date.now() / 1000 + 30; // Open in 30 seconds after deployment
            closingTime = openingTime + 1800; // Close after 30 minutes
            softCap = "2500"+e18; // 0.03 ETH * 14400 
            hardCap = "250000"+e18; // 0.1 ETH * 14400 
            ethPrice = "1000"+e8; // 1000 USD -> Rate 20000 ZAPP / ETH
            zappPrice = "5"+e6; // 0.05 USD
            referrerMin = "2000"+e18; // 2K ZAPP
            refereeMin = "1000"+e18; // 1K ZAPP
            referralBonus = "5"+e8; // 5%
            bonusEndTime = openingTime + 600; // End after 10 minutes
            aggregator = "0x8A753747A1Fa494EC906cE90E9f37563A8AF630e";
            break;
        case 'rinkeby':
            openingTime = Date.now() / 1000 + 300; // Open in 5 minutes after deployment
            closingTime = openingTime + 172800; // Close after 2 days 
            softCap = "183600"+e18; // 0.03 ETH * 14400
            hardCap = "3672000"+e18; // 0.1 ETH * 14400
            ethPrice = "1000"+e8; // 1000 USD -> Rate 20000 ZAPP / ETH
            zappPrice = "5"+e6; // 0.05 USD
            referrerMin = "2000"+e18; // 2K ZAPP
            refereeMin = "1000"+e18; // 1K ZAPP
            referralBonus = "5"+e8; // 5%
            bonusEndTime = openingTime + 86400; // End after 1 day
            aggregator = "0x8A753747A1Fa494EC906cE90E9f37563A8AF630e";
            break;
        case 'goerli':
            openingTime = Date.now() / 1000 + 30; // Open in 30 seconds after deployment
            closingTime = openingTime + 172800; // Close after 2 days 
            softCap = "183600"+e18; // 0.03 ETH * 14400 
            hardCap = "3672000"+e18; // 0.1 ETH * 14400 
            ethPrice = "1000"+e8; // 1000 USD -> Rate 20000 ZAPP / ETH
            zappPrice = "5"+e6; // 0.05 USD
            referrerMin = "2000"+e18; // 2K ZAPP
            refereeMin = "2000"+e18; // 2K ZAPP
            referralBonus = "5"+e8; // 5%
            bonusEndTime = openingTime + 64800; // End after 18 hours
            aggregator = "0x0000000000000000000000000000000000000000";
            break;
        case 'main':
            openingTime = 1610647140; // Jan 14, 2021, 05:59:00PM UTC (1 minute before to make sure the blockchain can confirm)
            closingTime = 1613325600; // Feb 14, 2021, 06:00:00PM UTC
            softCap = "6000000"+e18; // 6M ZAPP
            hardCap = "120000000"+e18; // 120M ZAPP
            ethPrice = "1000"+e8; // 1000 USD -> Rate 20000 ZAPP / ETH
            zappPrice = "5"+e6; // 0.05 USD
            referrerMin = "2000"+e18; // 2K ZAPP
            refereeMin = "1000"+e18; // 1K ZAPP
            referralBonus = "5"+e8; // 5%
            bonusEndTime = openingTime + 259200; // End after 3 days
            aggregator = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";
            break;
    }

    openingTime = openingTime.toFixed();
    closingTime = closingTime.toFixed();
    bonusEndTime = bonusEndTime.toFixed();

    await deployer.deploy(ZappermintTokenSale, openingTime, closingTime, softCap, hardCap, ethPrice, zappPrice, referrerMin, refereeMin, referralBonus, bonusEndTime, aggregator);

    let address = (await ZappermintTokenSale.deployed()).address;
    let abi = web3.eth.abi.encodeParameters(
        ['uint256'  , 'uint256'  , 'uint256', 'uint256', 'uint256', 'uint256', 'uint256'  , 'uint256' , 'uint256'    , 'uint256'   , 'address' ], 
        [openingTime, closingTime, softCap  , hardCap  , ethPrice , zappPrice, referrerMin, refereeMin, referralBonus, bonusEndTime, aggregator]
    );
    abi = abi.substr(2, abi.length - 2);

    console.log(`${ZappermintTokenSale.contractName}`);
    console.log(`Addr : ${address}`);
    console.log(`Net  : ${network}`);
    console.log(`Open : ${openingTime}`);
    console.log(`Close: ${closingTime}`);
    console.log(`ABI  : ${abi}`);
};
