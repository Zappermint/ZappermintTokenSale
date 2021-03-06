const assert = require("assert");
const Utils = require("./TestUtils.js");
const Exceptions = require ("./Exceptions.js");
const { e6, e8, e18, createContract } = require("./Common.js");

contract("Reach Hard Cap", function(accounts) {

    let contract, snapshotId, result, code;
    let owner = accounts[0], buyer = accounts[1], 
        // Set token contract to buyer to allow claiming ZAPP as buyer
        // NOTE This is not the correct way of doing things, but importing
        //      the token contract is a hassle
        zappContract = accounts[1]; 

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

    describe("Buy 400000 ZAPP", function () {
        let bal;
        it("From buyer", async function() {
            bal = await Utils.balanceOf(buyer);
            result = await contract.buyZAPP({value: "0x1158E460913D00000", from: buyer});
            result = await contract.getBuyerZAPP(buyer);
            assert.strictEqual(result.toString(), "250000"+e18, "Bought ZAPP");
        });

        it("Refund exceeding", async function () {
            assert.strictEqual(Utils.toDecimal(await Utils.balanceOf(buyer), 18) > Utils.toDecimal(bal, 18) - 20, true, "Refund exceeding");
        });
    });
    
    describe("Contract state", function () {
        it("Above soft cap", async function() {
            result = await contract.isSoftCapReached();
            assert.strictEqual(result, true, "Soft cap not reached");
        });

        it("Below hard cap", async function() {
            result = await contract.isHardCapReached();
            assert.strictEqual(result, true, "Hard cap not reached");
        });

        it("Not open", async function() {
            result = await contract.isOpen();
            assert.strictEqual(result, false, "Still open");
        });

        it("Closed", async function() {
            result = await contract.isClosed();
            assert.strictEqual(result, true, "Not closed");
        });
    });
    
    describe("Reject claims", function() {
        it("Refund", async function() {
            result = await Exceptions.revert(contract.claimRefund({from: buyer}), "soft cap");
        });
        
        it("ZAPP", async function() {
            result = await Exceptions.revert(contract.claimZAPP({from: buyer}), "claimed yet");
        });
    });

    describe("Set claimable", function() {
        it("Set Zappermint Token Address", async function() {
            result = await contract.setZAPPContract(zappContract);
            result = await contract.getZAPPContract();
            assert.strictEqual(result, zappContract, "ZAPP Contract");
        });

        it("Jump in time", async function() {
            await Utils.advanceTimeAndBlock(2101);
            result = await contract.isClaimable();
            assert.strictEqual(result, true, "Claimable");
        });
    });

    describe("Accept claims", function() {
        it("ETH", async function() {
            let bal = await Utils.balanceOf(owner);
            result = await contract.claimETH(owner, {from: owner});
            assert.strictEqual(Utils.toDecimal(await Utils.balanceOf(owner), 18) > Utils.toDecimal(bal, 18), true, "Claim ETH");
        });

        it("ZAPP", async function() {
            result = await contract.claimZAPP({from: zappContract});
            result = await contract.hasWalletClaimed(buyer);
            assert.strictEqual(result, true, "Not claimed");
        });
    });

    describe("Totals", function() {
        it("Early Adopter", async function() {
            result = await contract.getTotalEarlyAdoptionZAPP();
            assert.strictEqual(result.toString(), "250000"+e18, "Early Adopter");
        });

        it("Without Code", async function() {
            result = await contract.getTotalWithoutCodeZAPP();
            assert.strictEqual(result.toString(), "250000"+e18, "Without Code");
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