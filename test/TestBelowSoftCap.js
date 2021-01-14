const assert = require("assert");
const Utils = require("./TestUtils.js");
const Exceptions = require ("./Exceptions.js");
const { e6, e8, e18, createContract } = require("./Common.js");

contract("Below Soft Cap", function(accounts) {

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

    describe("Buy 200 ZAPP", function () {
        it("From buyer", async function() {
            result = await contract.buyZAPP({value: "0x2386F26FC10000", from: buyer});
            result = await contract.getBuyerZAPP(buyer);
            assert.strictEqual(result.toString(), "200"+e18, "Bought ZAPP");
        });
    });
    
    describe("Contract state", function () {
        it("Below soft cap", async function() {
            result = await contract.isSoftCapReached();
            assert.strictEqual(result, false, "Soft cap reached");
        });

        it("Below hard cap", async function() {
            result = await contract.isHardCapReached();
            assert.strictEqual(result, false, "Hard cap reached");
        });

        it("Still open", async function() {
            result = await contract.isOpen();
            assert.strictEqual(result, true, "Not open");
        });

        it("Not closed", async function() {
            result = await contract.isClosed();
            assert.strictEqual(result, false, "Closed");
        });
    });
    
    describe("Reject claims", function() {
        it("ZAPP", async function() {
            result = await Exceptions.revert(contract.claimZAPP({from: buyer}), "ended");
        });
    
        it("Refund", async function() {
            result = await Exceptions.revert(contract.claimRefund({from: buyer}), "ended");
        });
        
        it("ETH", async function() {
            result = await Exceptions.revert(contract.claimZAPP({from: owner}), "ended");
        });
    });
    
    describe("End sale", function() {
        it("As buyer", async function() {
            result = await Exceptions.revert(contract.endTokenSale({from: buyer}), "owner");
            result = await contract.isEnded();
            assert.strictEqual(result, false, "Ended by buyer");
        });

        it("As owner", async function() {
            result = await contract.endTokenSale({from: owner});
            result = await contract.isEnded();
            assert.strictEqual(result, true, "Not ended by owner");
        });
    });

    describe("Reject claims", function() {
        it("ZAPP", async function() {
            result = await Exceptions.revert(contract.claimZAPP({from: buyer}), "soft cap");
        });
        
        it("ETH", async function() {
            result = await Exceptions.revert(contract.claimZAPP({from: owner}), "soft cap");
        });
    });

    describe("Refund", function() {
        it("Buyer", async function() {
            let bal = await Utils.balanceOf(buyer);
            result = await contract.claimRefund({from: buyer});
            assert.strictEqual((await Utils.balanceOf(buyer)) > bal, true, "Refund");
        });
    });

    describe("Totals", function() {
        it("Early Adopter", async function() {
            result = await contract.getTotalEarlyAdoptionZAPP();
            assert.strictEqual(result.toString(), "200"+e18, "Early Adopter");
        });

        it("Without Code", async function() {
            result = await contract.getTotalWithoutCodeZAPP();
            assert.strictEqual(result.toString(), "200"+e18, "Without Code");
        });

        it("Referred", async function() {
            result = await contract.getTotalReferredZAPP();
            assert.strictEqual(result.toString(), "0", "Referred");
        });

        it("Hunter Referred", async function() {
            result = await contract.getTotalHunterReferredZAPP();
            assert.strictEqual(result.toString(), "0", "Hunter Referred");
        });
    });
    
});