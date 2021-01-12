const assert = require("assert");
const Utils = require("./TestUtils.js");
const Exceptions = require ("./Exceptions.js");
const { e6, e8, e18, createContract } = require("./Common.js");

contract("Below Hard Cap", function(accounts) {

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

    describe("Buy 2500 ZAPP", function () {
        it("From buyer", async function() {
            result = await contract.buyZAPP({value: "0x1BC16D674EC8000", from: buyer});
            result = await contract.getBuyerZAPP(buyer);
            assert.strictEqual(result.toString(), "2500"+e18, "Bought ZAPP");
        });
    });
    
    describe("Contract state", function () {
        it("Above soft cap", async function() {
            result = await contract.isSoftCapReached();
            assert.strictEqual(result, true, "Soft cap not reached");
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
        it("Refund", async function() {
            result = await Exceptions.revert(contract.claimRefund({from: buyer}), "soft cap");
        });
        
        it("ZAPP", async function() {
            result = await Exceptions.revert(contract.claimZAPP({from: buyer}), "claimed yet");
        });
    });

    describe("Accept claims", function() {
        it("ETH", async function() {
            let bal = await Utils.balanceOf(owner);
            result = await contract.claimETH(owner, {from: owner});
            assert.strictEqual((await Utils.balanceOf(owner)) > bal, true, "Claim ETH");
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
        })
    });

    describe("Accept claims", function() {
        it("ZAPP", async function() {
            result = await contract.claimZAPP({from: zappContract});
            result = await contract.hasWalletClaimed(buyer);
            assert.strictEqual(result, true, "Not claimed");
        });
    });
    
});