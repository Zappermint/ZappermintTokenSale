const assert = require("assert");
const Utils = require("./TestUtils.js");
const Exceptions = require ("./Exceptions.js");
const { e6, e8, e18, createContract } = require("./Common.js");

contract("Refund Test", function(accounts) {

    let contract, snapshotId, result, code;
    let owner = accounts[0], referrer = accounts[1], referee = accounts[2];

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
    it("Token Sale closed on deployment", async function() {
        await Utils.advanceBlock();
        result = await contract.isOpen();
        assert.strictEqual(result, false, "Token Sale is open");
        result = await contract.isClosed();
        assert.strictEqual(result, false, "Token Sale ended");
    });
    
    it("Token Sale open after 30 seconds", async function() {
        await Utils.advanceTimeAndBlock(31);
        result = await contract.isOpen();
        assert.strictEqual(result, true, "Token Sale not open");
        result = await contract.isClosed();
        assert.strictEqual(result, false, "Token Sale ended");
    });

    it("Buy 2000 ZAPP without code during Early Adoption", async function() {
        result = await contract.isEarlyAdoptionActive();
        assert.strictEqual(result, true, "Early Adoption not active");
        result = await contract.buyZAPP({value: "0x16345785D8A0000", from: referrer});
        bal1 = await Utils.balanceOf(referrer);
        result = await contract.getBuyerZAPP(referrer);
        assert.strictEqual(result.toString(), "2000"+e18, "Bought ZAPP");
        result = await contract.getEarlyAdopterBonus(referrer);
        assert.strictEqual(result.toString(), "100"+e18, "Early Adopter bonus");
        result = await contract.getReferralCode({from: referrer});
        assert.notStrictEqual(result, "0x000000", "No code generated");
        code = result;
    });

    it("Buy 400 ZAPP with code after Early Adoption", async function() {
        await Utils.advanceTimeAndBlock(601);
        result = await contract.isEarlyAdoptionActive();
        assert.strictEqual(result, false, "Early Adoption still active");
        result = await contract.isReferralCodeValid(code, {from: referee});
        assert.strictEqual(result, true, "Code invalid");
        result = await contract.buyZAPPWithCode(code, {value:"0x470DE4DF820000", from: referee});
        bal2 = await Utils.balanceOf(referee);
        result = await contract.getBuyerZAPP(referee);
        assert.strictEqual(result.toString(), "400"+e18, "Bought ZAPP");
        result = await contract.getRefereeBonus(referee);
        assert.strictEqual(result.toString(), "20"+e18, "Referee bonus");
        result = await contract.getReferralCode({from: referee});
        assert.strictEqual(result, "0x000000", "Code generated");
        result = await contract.getReferrerBonus(referrer);
        assert.strictEqual(result.toString(), "20"+e18, "Referrer bonus");
        result = await contract.getTopReferrers();
        assert.strictEqual(`${result[0]},${result[1]},${result[2]},${result[3]},${result[4]}`, `400${e18},0,0,0,0`, `Top referrers`);
    });

    it("End Token Sale", async function() {
        result = await contract.endTokenSale();
        result = await contract.isClosed();
        assert.strictEqual(result, true, "Token Sale not ended");
    });

    it("Revert on claim ETH", async function() {
        await Exceptions.revert(contract.claimETH(owner, {from: owner}), "hasn't reached soft cap");
    });
    
    it("Revert on claim ZAPP", async function() {
        await Exceptions.revert(contract.claimZAPP({from: referrer}), "hasn't reached soft cap");
    });

    it("Refund", async function() {
        result = await contract.claimRefund({from: referrer});
        assert.strictEqual((await Utils.balanceOf(referrer)) > bal1, true, "Refund failed");
        result = await contract.claimRefund({from: referee});
        assert.strictEqual((await Utils.balanceOf(referee)) > bal2, true, "Refund failed");
    });
    
});