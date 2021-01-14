const assert = require("assert");
const Utils = require("./TestUtils.js");
const Exceptions = require ("./Exceptions.js");
const { e6, e8, e18, createContract } = require("./Common.js");

contract("Referrals", function(accounts) {

    let contract, snapshotId, result, code;
    let owner = accounts[0], referrer1 = accounts[1], referrer2 = accounts[2], buyer = accounts[3];

    // Startup
    before(async function() {
        contract = await createContract();
        snapshotId = (await Utils.takeSnapshot())["result"];
        await Utils.advanceBlock();
    });
    // Cleanup
    after(async function() {
        await Utils.revertToSnapShot(snapshotId);
    });

    // Tests
    describe("Test", function() {
        it("Action", async function() {

        });
    });
    
});