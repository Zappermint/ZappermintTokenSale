const assert = require("assert");
const Utils = require("./TestUtils.js");
const Exceptions = require ("./Exceptions.js");
const { e6, e8, e18, createContract } = require("./Common.js");

contract("Early Adopter", function(accounts) {

    let contract, snapshotId, result, code;
    let owner = accounts[0], buyer = accounts[1];

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
    describe("Open sale", function () {
        it("Jump in time", async function() {
            await Utils.advanceTimeAndBlock(31);
        });
    });

    describe("Buy 2500 ZAPP", function () {
        it("From buyer", async function() {
            result = await contract.buyZAPP({value: "0x1BC16D674EC8000", from: buyer});
            result = await contract.getBuyerZAPP(buyer);
            assert.strictEqual(result.toString(), "2500"+e18, "Bought ZAPP");
        });
    });

    describe("Check bonus", function () { 
        it("Early adopter", async function () {
            let bonus = 2500 * Utils.toDecimal(await contract.getEarlyAdoptionBonus(), 8);
            result = await contract.getEarlyAdopterBonus(buyer);
            assert.strictEqual(result.toString(), bonus.toFixed()+e18, "Bonus");
        });
    });

    describe("End Early Adoption", function () {
        it("Jump in time", async function() {
            await Utils.advanceTimeAndBlock(601);
        });

        it("Ended", async function () {
            result = await contract.isEarlyAdoptionActive();
            assert.strictEqual(result, false, "Still active");
        });

        it("No bonus", async function () {
            
        })
    });

});