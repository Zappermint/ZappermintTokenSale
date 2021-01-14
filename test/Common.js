const ZappermintTokenSale = artifacts.require("ZappermintTokenSale");
const Utils = require("./TestUtils.js");

const e6 = "000000";
const e8 = "00000000";
const e18 = "000000000000000000";

const createContract = async function() {
    let openingTime, closingTime, claimTime, 
    softCap, hardCap, 
    ethPrice, zappPrice, 
    referrerMin, refereeMin, referralBonus, rankRewards, 
    earlyAdoptionEndTime, earlyAdoptionBonus,
    maxHunters, registerBonus,
    aggregator;
    
    // Settings for deployment on Mainnet
    openingTime             = 1610647140; // Jan 14, 2021, 05:59:00PM UTC (1 minute before to make sure the blockchain can confirm)
    closingTime             = 1613325600; // Feb 14, 2021, 06:00:00PM UTC
    claimTime               = 1615744800; // Mar 14, 2021, 06:00:00PM UTC 
    softCap                 = "6000000"+e18; // 6M ZAPP
    hardCap                 = "120000000"+e18; // 120M ZAPP
    ethPrice                = "1000"+e8; // 1000 USD -> Rate 20000 ZAPP / ETH (use simple rate for testing)
    zappPrice               = "5"+e6; // 0.05 USD
    referrerMin             = "2000"+e18; // 2K ZAPP
    refereeMin              = "0"+e18; // 0 ZAPP
    referralBonus           = "5"+e6; // 5%
    rankRewards             = ["20000"+e18, "12000"+e18, "8000"+e18, "6000"+e18, "4000"+e18]; // 20K,12K,8K,6K,4K
    earlyAdoptionEndTime    = openingTime + 259200; // 3 days
    earlyAdoptionBonus      = "5"+e6; // 5%
    maxHunters              = "400"; // 100
    registerBonus           = "400"+e18; // 400 ZAPP
    aggregator              = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419"; // ChainLink
    
    // Development overrides
    openingTime             = Date.now() / 1000 + 30; 
    closingTime             = openingTime + 1800; 
    claimTime               = closingTime + 300; 
    softCap                 = "2500"+e18; 
    hardCap                 = "250000"+e18; 
    earlyAdoptionEndTime    = openingTime + 600; 
    maxHunters              = "3";
    aggregator              = "0x0000000000000000000000000000000000000000";
    
    // Fix times
    openingTime = openingTime.toFixed();
    closingTime = closingTime.toFixed();
    claimTime = claimTime.toFixed();
    earlyAdoptionEndTime = earlyAdoptionEndTime.toFixed();

    return await ZappermintTokenSale.new({
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
        registerBonus,
        aggregator
    });
}

module.exports = {
    e6, e8, e18,
    createContract
}