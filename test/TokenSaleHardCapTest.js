const assert = require("assert");
const Utils = require("./TestUtils.js");
const Exceptions = require ("./Exceptions.js");
const { e6, e8, e18, createContract } = require("./Common.js");

contract("Hard Cap Test", function(accounts) {

    let contract, snapshotId, result, code;

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

    it("Buy 200 ZAPP without code during Early Adoption", async function() {
        result = await contract.isEarlyAdoptionActive();
        assert.strictEqual(result, true, "Early Adoption not active");
        result = await contract.buyZAPP({value: "0x2386F26FC10000", from: accounts[1]});
        result = await contract.getBuyerZAPP(accounts[1]);
        assert.strictEqual(result.toString(), "200"+e18, "Bought ZAPP");
        result = await contract.getEarlyAdopterBonus(accounts[1]);
        assert.strictEqual(result.toString(), "10"+e18, "Early Adopter bonus");
        result = await contract.getReferralCode({from: accounts[1]});
        assert.strictEqual(result, "0x000000", "Code generated");
    });

    it("Buy 2000 ZAPP without code after Early Adoption", async function() {
        await Utils.advanceTimeAndBlock(601);
        result = await contract.isEarlyAdoptionActive();
        assert.strictEqual(result, false, "Early Adoption still active");
        result = await contract.buyZAPP({value: "0x16345785D8A0000", from: accounts[1]});
        result = await contract.getBuyerZAPP(accounts[1]);
        assert.strictEqual(result.toString(), "2200"+e18, "Bought ZAPP");
        result = await contract.getEarlyAdopterBonus(accounts[1]);
        assert.strictEqual(result.toString(), "10"+e18, "Early Adopter bonus");
        result = await contract.getReferralCode({from: accounts[1]});
        assert.notStrictEqual(result, "0x000000", "No code generated");
        code = result;
    });

    it("Buy 400 ZAPP with code after Early Adoption", async function() {
        result = await contract.buyZAPPWithCode(code, {value:"0x470DE4DF820000", from: accounts[2]});
        result = await contract.getBuyerZAPP(accounts[2]);
        assert.strictEqual(result.toString(), "400"+e18, "Bought ZAPP");
        result = await contract.getRefereeBonus(accounts[2]);
        assert.strictEqual(result.toString(), "20"+e18, "Referee bonus");
        result = await contract.getReferralCode({from: accounts[2]});
        assert.strictEqual(result, "0x000000", "Code generated");
        result = await contract.getReferrerBonus(accounts[1]);
        assert.strictEqual(result.toString(), "20"+e18, "Referrer bonus");
        result = await contract.getTopReferrers();
        assert.strictEqual(`${result[0]},${result[1]},${result[2]},${result[3]},${result[4]}`, `400${e18},0,0,0,0`, `Top referrers`);
    });
    
});