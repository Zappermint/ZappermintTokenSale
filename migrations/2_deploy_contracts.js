const ZappermintTokenSale = artifacts.require("ZappermintTokenSale.sol");

const adapter = ZappermintTokenSale.interfaceAdapter;
const web3 = adapter.web3;

module.exports = async function (deployer, network, accounts) {
    
    const e6 = "000000";
    const e8 = "00000000";
    const e18 = "000000000000000000";
    let openingTime, closingTime, claimTime, 
        softCap, hardCap, 
        ethPrice, zappPrice, 
        referrerMin, refereeMin, referralBonus, rankRewards, 
        earlyAdoptionEndTime, earlyAdoptionBonus,
        maxHunters,
        aggregator;

    // Settings for deployment on Mainnet
    openingTime             = 1610647140; // Jan 14, 2021, 05:59:00PM UTC (1 minute before to make sure the blockchain can confirm)
    closingTime             = 1613325600; // Feb 14, 2021, 06:00:00PM UTC
    claimTime               = 1615744800; // Mar 14, 2021, 06:00:00PM UTC 
    softCap                 = "6000000"+e18; // 6M ZAPP
    hardCap                 = "120000000"+e18; // 120M ZAPP
    ethPrice                = "1300"+e8; // 1300 USD -> Rate 26000 ZAPP / ETH
    zappPrice               = "5"+e6; // 0.05 USD
    referrerMin             = "2000"+e18; // 2K ZAPP
    refereeMin              = "0"+e18; // 0 ZAPP
    referralBonus           = "5"+e8; // 5%
    rankRewards             = ["20000"+e18, "12000"+e18, "8000"+e18, "6000"+e18, "4000"+e18]; // 20K,12K,8K,6K,4K
    earlyAdoptionEndTime    = openingTime + 259200; // 3 days
    earlyAdoptionBonus      = "5"+e8; // 5%
    maxHunters              = "100"; // 100
    aggregator              = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419"; // ChainLink

    // Overrides for Testnet
    switch (network) {
        case "development":
            openingTime             = Date.now() / 1000 + 30; 
            closingTime             = openingTime + 1800; 
            claimTime               = closingTime + 300; 
            softCap                 = "2500"+e18; 
            hardCap                 = "250000"+e18; 
            earlyAdoptionEndTime    = openingTime + 600; 
            maxHunters              = "3";
            aggregator              = "0x0000000000000000000000000000000000000000";
            break;
        case "rinkeby":
            openingTime             = Date.now() / 1000 + 300; 
            closingTime             = openingTime + 172800; 
            claimTime               = closingTime + 1800; 
            softCap                 = "183600"+e18; 
            hardCap                 = "3672000"+e18; 
            earlyAdoptionEndTime    = openingTime + 600; 
            maxHunters              = "3";
            aggregator              = "0x8A753747A1Fa494EC906cE90E9f37563A8AF630e";
            break;
        case "goerli":
            openingTime             = Date.now() / 1000 + 660; 
            closingTime             = openingTime + 172800; 
            claimTime               = closingTime + 1800; 
            softCap                 = "183600"+e18; 
            hardCap                 = "3672000"+e18; 
            earlyAdoptionEndTime    = openingTime + 86400; 
            maxHunters              = "3";
            aggregator              = "0x0000000000000000000000000000000000000000";
            break;
    }

    openingTime = openingTime.toFixed();
    closingTime = closingTime.toFixed();
    claimTime = claimTime.toFixed();
    earlyAdoptionEndTime = earlyAdoptionEndTime.toFixed();

    await deployer.deploy(ZappermintTokenSale, 
        openingTime, 
        closingTime, 
        claimTime,
        softCap, 
        hardCap,
        ethPrice,
        zappPrice,
        referrerMin,
        refereeMin,
        referralBonus,
        rankRewards,
        earlyAdoptionEndTime,
        earlyAdoptionBonus,
        maxHunters,
        aggregator
    );
    let contract = await ZappermintTokenSale.deployed();

    // Constructor ABI
    let ctorTypes = [
        "uint256",      // openingTime
        "uint256",      // closingTime
        "uint256",      // claimTime
        "uint256",      // softCap
        "uint256",      // hardCap
        "uint256",      // ethPrice
        "uint256",      // zappPrice
        "uint256",      // referrerMin
        "uint256",      // refereeMin
        "uint256",      // referralBonus
        "uint256[5]",   // rankRewards
        "uint256",      // earlyAdoptionEndTime
        "uint256",      // earlyAdoptionBonus
        "uint256",      // maxHunters
        "address"       // aggregator
    ];
    let ctorValues = [
        openingTime, 
        closingTime, 
        claimTime,
        softCap, 
        hardCap,
        ethPrice,
        zappPrice,
        referrerMin,
        refereeMin,
        referralBonus,
        rankRewards,
        earlyAdoptionEndTime,
        earlyAdoptionBonus,
        maxHunters,
        aggregator
    ];
    let ctorABI = web3.eth.abi.encodeParameters(ctorTypes, ctorValues);
    ctorABI = ctorABI.substr(2, ctorABI.length - 2);

    // Function ABIs
    let funcABI = '';
    for (let func in contract.methods) {
        funcABI += `\`${web3.eth.abi.encodeFunctionSignature(func)}\` => ${func}\n`;
    }
        
    // Layout a message to copy and paste for internal use
    console.log(`https://${network}.etherscan.io/address/${contract.address}`);
    console.log('```JS'); 
    console.log(`${ZappermintTokenSale.contractName}`);
    console.log(`Addr : ${contract.address}`);
    console.log(`Net  : ${network}`);
    console.log(`Open : ${openingTime}`);
    console.log(`Close: ${closingTime}`);
    console.log(`ABI  : ${ctorABI}`);
    console.log('```');
    console.log(funcABI);
};
