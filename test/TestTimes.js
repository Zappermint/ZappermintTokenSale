const assert = require("assert");
const Utils = require("./TestUtils.js");
const Exceptions = require ("./Exceptions.js");
const { e6, e8, e18, createContract } = require("./Common.js");

contract("Times", function(accounts) {

    let contract, snapshotId, result, code;
    let owner = accounts[0], buyer = accounts[1], hunter1 = accounts[2], hunter2 = accounts[3], hunter3 = accounts[4];

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
    describe("Buyer", function () {
        it("Cannot buy", async function() {
            result = await Exceptions.revert(contract.buyZAPP({value: "0x2386F26FC10000", from: buyer}), "not open");
        });
    });

    describe("Hunter", function () {
        it("Can register", async function() {
            result = await contract.registerHunter({from: hunter1});
        });
    });

    describe("Open sale", function () {
        it("Sale closed", async function() {
            await Utils.advanceBlock();
            result = await contract.isOpen();
            assert.strictEqual(result, false, "Token Sale is open");
        });

        it("Jump in time", async function() {
            await Utils.advanceTimeAndBlock(31);
        });

        it("Sale open", async function() {
            result = await contract.isOpen();
            assert.strictEqual(result, true, "Token Sale not open");
        });
    });

    describe("Buyer", function () {
        it("Can buy", async function() {
            result = await contract.buyZAPP({value: "0x2386F26FC10000", from: buyer});
        });

        it("Early Adopter", async function() {
            result = await contract.getEarlyAdopterBonus(buyer);
            assert.strictEqual(result.toString(), "10"+e18, "No Early Adopter bonus");
        });
    });

    describe("Hunter", function () {
        it("Can register", async function() {
            result = await contract.registerHunter({from: hunter2});
        });
    });

    describe("Referee", function () {
        it("Can buy", async function() {
            result = await contract.buyZAPPWithCode(await contract.getReferralCode({from: hunter1}), {value: "0x2386F26FC10000", from: buyer});
        });
    });
    
    describe("End Early Adoption", function () {
        it("Jump in time", async function() {
            await Utils.advanceTimeAndBlock(601);
        });
        
        it("Ended", async function() {
            result = await contract.isEarlyAdoptionActive();
            assert.strictEqual(result, false, "Still active");
            result = await contract.buyZAPP({value: "0x2386F26FC10000", from: buyer});
            result = await contract.getEarlyAdopterBonus(buyer);
            assert.strictEqual(result.toString(), "10"+e18, "Still got Early Adopter bonus");
        });
    });

    describe("Claims", function () {
        it("Cannot claim refund", async function() {
            result = await Exceptions.revert(contract.claimRefund({from: buyer}), "not ended");
        });

        it("Cannot claim ETH", async function() {
            result = await Exceptions.revert(contract.claimETH(owner, {from: owner}), "not ended");
        })
    });

    describe("Close sale", function() {
        it("Jump in time", async function() {
            await Utils.advanceTimeAndBlock(1201);
        });

        it("Closed", async function() {
            result = await contract.isOpen();
            assert.strictEqual(result, false, "Token Sale still open");
            result = await contract.isClosed();
            assert.strictEqual(result, true, "Token Sale not closed");
        });
    });

    describe("Buyer", function() {
        it("Cannot buy", async function() {
            result = await Exceptions.revert(contract.buyZAPP({value: "0x2386F26FC10000", from: buyer}), "not open");
        });
    });

    describe("Hunter", function() {
        it("Cannot register", async function() {
            result = await Exceptions.revert(contract.registerHunter({from: hunter3}), "closed");
        });
    });

});