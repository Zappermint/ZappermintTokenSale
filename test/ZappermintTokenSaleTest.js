const ZappermintTokenSale = artifacts.require("ZappermintTokenSale");
const Utils = require("./TestUtils.js");

contract("ZappermintTokenSale", async (accounts) => {

    let c, snapshotId;
    before("deploy ZappermintTokenSale", async () => {
        c = await ZappermintTokenSale.deployed();
        snapshotId = await Utils.takeSnapshot();
    });

})