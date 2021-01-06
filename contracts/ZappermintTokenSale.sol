// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.7.6;

import './SafeMath.sol';
import './AggregatorV3Interface.sol';

// Crowdsale contract for ZAPP. Functionalities:
// - Timed: opens Jan 14, 2021, 6:00:00PM UTC (1610647200) and closes Feb 14, 2021, 6:00:00PM UTC (1613325600)
// - Capped: soft cap of 6M ZAPP, hard cap of 120M ZAPP
// - Refundable: ETH can be refunded if soft cap hasn't been reached
// - Post Delivery: ZAPP can be claimed after Token Sale end, if soft cap has been reached
// - Bonus Time: Bonus ZAPP for a set duration
// - Referral System: Bonus ZAPP when buying with referral link
contract ZappermintTokenSale {
    using SafeMath for uint256; // Avoid overflow issues

// ----
// Structs
// ----

    struct Buyer {
        address payable addr;
        uint256 eth;
        uint256 zapp;
        uint256 bonus;
        uint256[] referrals;
        bytes3 code;
        bool claimed;
    }

// ----
// Variables
// ----

    uint256 private _openingTime; // Start of Token Sale
    uint256 private _closingTime; // End of Token Sale
    uint256 private _softCap; // Minimum amount of ZAPP to sell (18 decimals)
    uint256 private _hardCap; // Maximum amount of ZAPP to sell (18 decimals)
    uint256 private _ethPrice; // Fallback ETH/USD price in case ChainLink breaks (8 decimals)
    uint256 private _zappPrice; // ZAPP/USD price (8 decimals)
    uint256 private _referrerMin; // Referrer minimum ZAPP bits (18 decimals)
    uint256 private _refereeMin; // Referee minimum ZAPP bits (18 decimals)
    uint256 private _referralBonus; // Percentage of purchase to receive as bonus (8 decimals)
    uint256 private _bonusEndTime; // End of limited-time bonus


    mapping(address => Buyer) private _buyers; // Addresses that have bought ZAPP
    address[] _buyerKeys; // Address list, for iterating over `_buyers`
    mapping(bytes3 => address) private _codes; // Referral codes

    uint256 private _soldZAPP; // Amount of ZAPP sold (18 decimals)
    bool private _ended; // Whether the Token Sale has ended

    address private _owner; // Owner of the contract
    address private _zappContract; // Zappermint Token Contract
    AggregatorV3Interface private _priceFeed; // ChainLink ETH/USD Price Feed

// ----
// Modifiers
// ----

    /**
     * Only allow function with this modifier to run while the Token Sale is open
     */
    modifier whileOpen {
        require(isOpen(), "Token Sale not open");
        _;
    }

    /**
     * Only allow function with this modifier to run after the Token Sale has ended
     */
    modifier afterEnd {
        require(_ended, "Token Sale not ended");
        _;
    }

    /**
     * Only allow function with this modifier to run before the Token Sale has ended
     */
    modifier beforeEnd {
        require(!_ended, "Token Sale ended");
        _;
    }

    /**
     * Only allow function with this modifier to run when the Token Sale has reached the soft cap
     */
    modifier aboveSoftCap {
        require(isSoftCapReached(), "Token Sale hasn't reached soft cap");
        _;
    }

    /**
     * Only allow function with this modifier to run when the Token Sale hasn't reached the soft cap
     */
    modifier belowSoftCap {
        require(!isSoftCapReached(), "Token Sale reached soft cap");
        _;
    }

    /**
     * Only allow function with this modifier to be run by the owner
     */
    modifier onlyOwner {
        require(msg.sender == _owner, "Only the owner can do this");
        _;
    }

    /**
     * Only allow function with this modifier to be run by the Zappermint Token Contract
     */
    modifier onlyZAPPContract {
        require(msg.sender == _zappContract, "Only the Zappermint Token Contract can do this");
        _;
    }

// ----
// Constructor
// ----

    /**
     * @dev Constructor of the Token Sale. Sets the wallet, time and caps
     * @param openingTime start time of the Token Sale (epoch)
     * @param closingTime end time of the Token Sale (epoch)
     * @param softCap minimum amount of ZAPP to sell (18 decimals)
     * @param hardCap maximum amount of ZAPP to sell (18 decimals)
     * @param ethPrice price of 1 ETH in USD (8 decimals) to use in case ChainLink breaks
     * @param zappPrice price of 1 ZAPP in USD (8 decimals)
     * @param referrerMin minimum amount of ZAPP referrer must have purchased before getting a referral link (18 decimals)
     * @param refereeMin minimum amount of ZAPP referee must purchase to get referral bonus (18 decimals)
     * @param referralBonus percentage of purchase to receive as bonus (8 decimals)
     * @param bonusEndTime end of limited-time bonus
     * @param aggregator address of ChainLink Aggregator price feed
     * NOTE The Zappermint Token Contract is still in the works, which is why it's not mentioned in this contract.
     *      The Token Contract will allow to claim ZAPP according to the `_buyers` mapping.
     */
    constructor(
        uint256 openingTime, 
        uint256 closingTime, 
        uint256 softCap, 
        uint256 hardCap,
        uint256 ethPrice,
        uint256 zappPrice,
        uint256 referrerMin,
        uint256 refereeMin,
        uint256 referralBonus,
        uint256 bonusEndTime,
        address aggregator
    ) {
        require(openingTime >= block.timestamp, "Opening time is before current time");
        require(closingTime > openingTime, "Opening time is not before closing time");
        require(softCap < hardCap, "Hard cap is below soft cap");

        _openingTime = openingTime;
        _closingTime = closingTime;
        _softCap = softCap;
        _hardCap = hardCap;
        _ethPrice = ethPrice;
        _zappPrice = zappPrice;
        _referrerMin = referrerMin;
        _refereeMin = refereeMin;
        _referralBonus = referralBonus;
        _bonusEndTime = bonusEndTime;
        _priceFeed = AggregatorV3Interface(aggregator);
        _owner = msg.sender;
    }

// ----
// Getters
// ----

    /**
     * @return The current number of ZAPP a buyer gets per 1 ETH
     * NOTE Based on ETH/USD pair. 1 ZAPP = 0.05 USD
     */
    function getRate() public view returns (uint256) {
        return getLatestPrice().div(_zappPrice); // 8 decimals
    }

    /**
     * @return Token Sale opening time
     */
    function getOpeningTime() public view returns (uint256) {
        return _openingTime;
    }

    /**
     * @return Token Sale closing time
     */
    function getClosingTime() public view returns (uint256) {
        return _closingTime;
    }

    /**
     * @return The minimum amount of ZAPP to sell (18 decimals)
     */
    function getSoftCap() public view returns (uint256) {
        return _softCap;
    }

    /**
     * @return The maximum amount of ZAPP to sell (18 decimals)
     */
    function getHardCap() public view returns (uint256) {
        return _hardCap;
    }

    /**
     * @return The total amount of ZAPP sold so far (18 decimals)
     */
    function getSoldZAPP() public view returns (uint256) {
        return _soldZAPP;    
    }

    /**
     * @return Whether Token Sale is open
     */
    function isOpen() public view returns (bool) {
        return block.timestamp >= _openingTime && block.timestamp <= _closingTime && !_ended;
    }

    /**
     * @return Whether Token Sale is closed
     */
    function isClosed() public view returns (bool) {
        return block.timestamp > _closingTime || _ended;
    }

    /**
     * @return Whether the soft cap has been reached
     */
    function isSoftCapReached() public view returns (bool) {
        return _soldZAPP >= _softCap;
    }

    /** 
     * @return Whether the hard cap has been reached
     */
    function isHardCapReached() public view returns (bool) {
        return _soldZAPP >= _hardCap;
    }

    /**
     * @return The price of 1 ETH in USD. Attempts using ChainLink Aggregator, falls back to `_ethPrice` if broken.
     * NOTE 8 decimals
     */
    function getLatestPrice() public view returns (uint256) {
        // Try/catch only works on external function calls. `this.f()` uses a message call instead of a direct jump, 
        //   which is considered external.
        //   https://docs.soliditylang.org/en/v0.7.6/control-structures.html#external-function-calls
        // Note when ChainLink is broken, this will log an internal `revert` error, but the code will complete successfully
        try this.getChainlinkPrice() returns (uint256 price) {
            return price;
        }
        catch {
            return _ethPrice;
        }
    }

    /**
     * @return The price of 1 ETH in USD (from ChainLink Aggregator) 
     * NOTE 8 decimals
     */
    function getChainlinkPrice() public view returns (uint256) {
        // Get the ETH/USD price from ChainLink's Aggregator
        (,int256 p,,,) = _priceFeed.latestRoundData();
        
        // This price is a signed int, so make sure it's higher than 0
        require(p > 0, "Price feed invalid");

        // We can now safely cast it to unsigned int and use SafeMath on it
        uint256 price = uint256(p);

        // Verify the number of decimals. We work with 8 decimals for USD prices, 
        //   but ChainLink can choose to change this at any point outside of our control.
        // We ensure that the price has 8 decimals with the math below.
        // Note that the exponent must be positive, so we use div instead of mul in case
        //   the number of decimals is smaller than 8.
        uint8 decimals = _priceFeed.decimals();
        if (decimals == 8) return price;
        else if (decimals < 8) return price.div(10**(8 - decimals));
        else return price.mul(10**(decimals - 8));
    }

    /**
     * Calculate amount of ZAPP for a given amount of wei
     * @param weiAmount amount of wei (18 decimals)
     * @return ZAPP
     */
    function calculateZAPPAmount(uint256 weiAmount) public view returns (uint256) {
        return weiAmount.mul(getRate());
    }

    /**
     * Calculate amount of ETH for a given amount of ZAPP bits
     * @param zappAmount amount of ZAPP bits (18 decimals)
     * @return Wei
     */
    function calculateETHAmount(uint256 zappAmount) public view returns (uint256) {
        return zappAmount.div(getRate());
    }

    /**
     * Calculates bonus amount without referral code
     * @param zappAmount amount of ZAPP bits bought (18 decimals)
     * @return Amount of bonus ZAPP bits (18 decimals)
     */
    function calculateBonusAmount(uint256 zappAmount) public view returns (uint256) {
        return _calculateBonusAmount(zappAmount, false);
    }

    /**
     * Calculates bonus amount with referral code
     * @param zappAmount amount of ZAPP bits bought (18 decimals)
     * @return Amount of bonus ZAPP bits (18 decimals)
     */
    function calculateBonusAmountWithCode(uint256 zappAmount, bytes3 code) public view returns (uint256) {
        if (!isReferralCodeValid(code)) return 0;
        return _calculateBonusAmount(zappAmount, true);
    }

    /**
     * @return Minimum amount of ZAPP a referrer must have bought to get a referral link (18 decimals)
     */
    function getReferrerMin() public view returns (uint256) {
        return _referrerMin;
    }

    /**
     * @return Minimum amount of ZAPP a referee must buy to get referral bonus (18 decimals)
     */
    function getRefereeMin() public view returns (uint256) {
        return _refereeMin;
    }

    /**
     * @return Percentage of purchase to receive as bonus (8 decimals)
     */
    function getReferralBonus() public view returns (uint256) {
        return _referralBonus;
    }

    /**
     * @return The referral code for this address
     */
    function getReferralCode() public view returns (bytes3) {
        require(_buyers[msg.sender].zapp >= _referrerMin, "You haven't bought enough ZAPP to be eligible for referrals");
        return _buyers[msg.sender].code;
    }

    /**
     * @param code referral code
     * @return Whether the referral code is valid
     */
    function isReferralCodeValid(bytes3 code) public view returns (bool) {
        return _codes[code] != address(0) && _codes[code] != msg.sender;
    }

    function isBonusTime() public view returns (bool) {
        return block.timestamp <= _bonusEndTime;
    }

    /**
     * @return End time of limited-time bonus
     */
    function getBonusEndTime() public view returns (uint256) {
        return _bonusEndTime;
    }

    /**
     * @param addr address to get ETH of
     * @return The amount of wei this address has spent (18 decimals)
     */
    function getBuyerETH(address addr) public view returns (uint256) {
        return _buyers[addr].eth;
    }

    /**
     * @param addr address to get ZAPP of
     * @return The amount of ZAPP bits this address has bought (18 decimals)
     */
    function getBuyerZAPP(address addr) public view returns (uint256) {
        return _buyers[addr].zapp;
    }

    /**
     * @param addr address to get bonus of
     * @return The total bonus ZAPP the buyer will receive (18 decimals)
     */
    function getBuyerBonus(address addr) public view returns (uint256) {
        return _buyers[addr].bonus;
    }

    /**
     * @param addr address to get referrals of
     * @return The list of successful referrals of the buyer
     */
    function getBuyerReferrals(address addr) public view returns (uint256[] memory) {
        return _buyers[addr].referrals;
    }

    /**
     * @param addr address to get claimed state of
     * @return Whether this address has claimed their ZAPP
     */
    function hasBuyerClaimed(address addr) public view returns (bool) {
        return _buyers[addr].claimed;
    }

    /**
     * Get the top 5 referrers
     * @return The array of referred amounts of the top 5 referrers
     */
    function getTopReferrers() public view returns (uint256[5] memory) {
        uint256[5] memory top = [uint256(0), uint256(0), uint256(0), uint256(0), uint256(0)];
        for (uint256 b = 0; b < _buyerKeys.length; ++b) {
            uint256 sum = _calculateBuyerReferralSum(_buyerKeys[b]);
            for (uint256 t = 0; t < top.length; ++t) {
                if (sum > top[t]) {
                    for (uint256 i = 4; i > t; --i) {
                        top[i] = top[i - 1];
                    }
                    top[t] = sum;
                    break;
                }
            }
        }
        return top;
    }

    /**
     * @return The Zappermint Token Contract address
     */
    function getZAPPContract() public view returns (address) {
        return _zappContract;
    }

    /**
     * @return The owner of the Token Sale Contract
     */
    function getOwner() public view returns (address) {
        return _owner;
    }

// ----
// Setters
// ----

    /**
     * Changes the ETH price in case ChainLink breaks
     * @param price Price of 1 ETH in USD (8 decimals)
     */
    function setETHPrice(uint256 price) public beforeEnd onlyOwner {
        _ethPrice = price;
    }

    /**
     * Closes the Token Sale manually
     */
    function endTokenSale() public onlyOwner {
        _ended = true;
    }

    /**
     * Sets the address of the Zappermint Token Contract
     * @param zappContract address of the Zappermint Token Contract
     */
    function setZAPPContract(address zappContract) public onlyOwner {
        _zappContract = zappContract;
    }

    /**
     * Transfers ownership
     * @param newOwner address of the new owner
     */
    function changeOwner(address newOwner) public onlyOwner {
        _owner = newOwner;
    }

// ----
// Transaction functions
// ----

    /**
     * Fallback function shouldn't do anything, as it won't have any ETH to buy ZAPP with
     */
    fallback () external whileOpen {
        revert("Fallback function called");
    }

    /**
     * Receive function to buy ZAPP
     */
    receive() external payable whileOpen {
        buyZAPP();
    }

    /**
     * Buy ZAPP without referral code
     */
    function buyZAPP() public payable whileOpen {
        uint256 zapp = _buyZAPP(msg.sender, msg.value);
        _assignBonuses(msg.sender, zapp);
        _getReferralCode(msg.sender);
    }

    /**
     * Buy ZAPP with referral code
     * @param referralCode used referral code
     */
    function buyZAPPWithCode(bytes3 referralCode) public payable whileOpen {
        uint256 zapp = _buyZAPP(msg.sender, msg.value);
        _assignBonusesWithCode(msg.sender, referralCode, zapp);
        _getReferralCode(msg.sender);
    }

    /**
     * Transfers the contract's wei to a wallet, after Token Sale ended and has reached the soft cap
     * @param wallet address to send wei to
     */
    function claimETH(address payable wallet) public afterEnd aboveSoftCap onlyOwner {
        // Don't change the `_soldZAPP` here, for potential future reference
        wallet.transfer(address(this).balance);
    }

    /**
     * Lets a buyer claim their ZAPP through the Zappermint Token Contract, after Token Sale ended and has reached the soft cap
     * @return Amount of ZAPP that have been claimed, Bonus ZAPP
     * NOTE The true implementation of this is in the Zappermint Token Contract. 
     */
    function claimZAPP() public afterEnd aboveSoftCap onlyZAPPContract returns (uint256, uint256) {
        address beneficiary = tx.origin; // Use tx, as msg points to the Zappermint Token Contract

        // Make sure the sender has bought ZAPP
        Buyer storage buyer = _buyers[beneficiary];
        uint256 zapp = buyer.zapp;
        uint256 bonus = buyer.bonus;
        require(zapp > 0, "Not a buyer");
        require(!buyer.claimed, "Already claimed");

        // Adjust buyer variables
        buyer.claimed = true;

        // Return amount of ZAPP and bonus of the buyer
        // NOTE Returned separately so the Token Contract can send the ZAPP from the correct pools
        return (zapp, bonus);
    }

    /**
     * Lets the buyer claim their ETH, after Token Sale ended and hasn't reached the soft cap
     */
    function claimRefund() public afterEnd belowSoftCap {
        address beneficiary = msg.sender;

        // Make sure the sender has bought ZAPP
        Buyer storage buyer = _buyers[beneficiary];
        uint256 eth = buyer.eth;
        require(eth > 0, "Not a buyer");

        // Adjust Token Sale state
        _soldZAPP = _soldZAPP.sub(buyer.zapp);

        // Adjust buyer variables
        buyer.eth = 0;
        buyer.zapp = 0;

        // Refund the ETH of the buyer
        buyer.addr.transfer(eth);
    }

// ----
// Internal functions
// ----

    /**
     * Calculate amount of ZAPP for a given amount of wei
     * @param weiAmount amount of wei
     * @param rate ZAPP/ETH rate
     * @return ZAPP bits (18 decimals)
     * NOTE Internally used as optimization by avoiding multiple Chainlink calls
     */
    function _calculateZAPPAmount(uint256 weiAmount, uint256 rate) internal pure returns (uint256) {
        return weiAmount.mul(rate);
    }

    /**
     * Calculate amount of ETH for a given amount of ZAPP bits
     * @param zappAmount amount of ZAPP bits (18 decimals)
     * @param rate ZAPP/ETH rate
     * @return wei
     * NOTE Internally used as optimization by avoiding multiple Chainlink calls
     */
    function _calculateETHAmount(uint256 zappAmount, uint256 rate) internal pure returns (uint256) {
        return zappAmount.div(rate);
    }

    /**
     * Calculates amount of bonus ZAPP to receive
     * @param zappAmount amount of bought ZAPP bits (18 decimals)
     * @param hasCode whether a referral code was given
     * @return The amount of bonus ZAPP bits (18 decimals)
     */
    function _calculateBonusAmount(uint256 zappAmount, bool hasCode) internal view returns (uint256) {
        uint256 amount = zappAmount.mul(_referralBonus).div(10000000000);
        
        // During bonus time, always give bonus
        if (isBonusTime()) return amount;
        
        // After bonus time, only give bonus when using code and buying enough ZAPP
        if (hasCode && zappAmount >= _refereeMin) return amount;
        return 0;
    }

    /**
     * Buys ZAPP
     * @param beneficiary address of buyer
     * @param eth amount of ETH sent
     * @return Amount of ZAPP bought
     */
    function _buyZAPP(address beneficiary, uint256 eth) internal returns (uint256) {
        // Verify amount of ETH
        require(eth > 0, "Not enough ETH");

        // Get the buyer by address
        Buyer storage buyer = _buyers[beneficiary];
        
        // If first purchase, this buyer's address will be the zero address.
        // In that case, add the buyer and its key for iteration
        if (buyer.addr == address(0)) { 
            buyer.addr = payable(beneficiary);
            _buyerKeys.push(beneficiary);
        }

        // Make sure the rate is consistent in this purchase
        uint256 rate = getRate();

        // Calculate the amount of ZAPP to receive and add it to the total sold
        uint256 zapp = _calculateZAPPAmount(eth, rate); 
        _soldZAPP = _soldZAPP.add(zapp);

        // Verify that this purchase isn't surpassing the hard cap, otherwise refund exceeding amount 
        int256 exceeding = int256(_soldZAPP - _hardCap);
        uint256 exceedingZAPP = 0;
        uint256 exceedingETH = 0;
        
        if (exceeding > 0) {
            // Adjust sold amount and close Token Sale
            _soldZAPP = _hardCap;
            _ended = true;

            // Adjust amount of bought ZAPP and paid ETH
            exceedingZAPP = uint256(exceeding);
            exceedingETH = _calculateETHAmount(exceedingZAPP, rate);
            zapp = zapp.sub(exceedingZAPP);
            eth = eth.sub(exceedingETH);
        }

        // Adjust buyer variables
        buyer.eth = buyer.eth.add(eth);
        buyer.zapp = buyer.zapp.add(zapp);
        buyer.claimed = false; // Cannot be true while sale is open, so it's safe to always set this to false here

        // Checks-Effects-Interactions pattern
        if (exceeding > 0) {
            // Send the exceeding ETH back
            buyer.addr.transfer(exceedingETH);
        }

        return zapp;
    }

    /**
     * Assigns limited-time bonus ZAPP to buyer without referral code
     * @param addr address of buyer
     * @param zapp amount of ZAPP purchased
     */
    function _assignBonuses(address addr, uint256 zapp) internal {
        // Bonus percentage of this purchase
        uint256 bonus = calculateBonusAmount(zapp);
        if (bonus == 0) return;

        // Find buyer
        Buyer storage buyer = _buyers[addr];
        
        // Assign bonus
        buyer.bonus = buyer.bonus.add(bonus);
    }

    /**
     * Assigns bonus ZAPP to referrer and referee
     * @param addr address of referee
     * @param code used referral code
     * @param zapp amount of ZAPP purchased
     */
    function _assignBonusesWithCode(address addr, bytes3 code, uint256 zapp) internal {
        // Make sure code is valid
        require(isReferralCodeValid(code), "Invalid referral code");

        // Bonus percentage of this purchase
        uint256 bonus = calculateBonusAmountWithCode(zapp, code);
        if (bonus == 0) return;

        // Find involved buyers
        Buyer storage referee = _buyers[addr];
        Buyer storage referrer = _buyers[_codes[code]];
        
        // Assign bonuses
        referee.bonus = referee.bonus.add(bonus);
        referrer.bonus = referrer.bonus.add(bonus);

        // Add full purchase to referral list
        referrer.referrals.push(zapp);
    }

    /**
     * Finds a new code to assign
     * @param addr address of buyer
     * @return Unique referral code
     */
    function _getReferralCode(address addr) internal returns (bytes3) {
        Buyer storage buyer = _buyers[addr];
        
        // Only create the code once
        if (buyer.code != bytes3(0)) return buyer.code;

        // Make sure buyer has bought enough ZAPP
        if (buyer.zapp < _referrerMin) return "";

        // Find a unique referral code that is not 0x000000
        // NOTE The loop can be very expensive if many collisions occur. The chances of this happening are very slim though
        bytes memory enc = abi.encodePacked(addr);
        bytes3 code = "";
        while (true) {
            bytes32 h = keccak256(enc);
            code = _keccak256ToReferralCode(h);
            if (code != bytes3(0) && _codes[code] == address(0)) {
                _codes[code] = addr;
                break;
            }
            // If the code already exists, we hash the hash to generate a new code
            enc = abi.encodePacked(h);
        }

        // Set the code for this buyer
        buyer.code = code;

        return code;
    }

    /**
     * @param h keccak256 hash to use
     * @return The referral code
     */
    function _keccak256ToReferralCode(bytes32 h) internal pure returns (bytes3) {
        bytes3 b;
        for (uint8 i = 0; i < 3; ++i) {
            b |= bytes3(h[i]) >> (i * 8);
        }
        return b;
    }

    /**
     * Calculate the sum of the buyer's referred purchases
     * @param addr address of the buyer
     * @return The sum
     */
    function _calculateBuyerReferralSum(address addr) internal view returns (uint256) {
        Buyer storage buyer = _buyers[addr];
        uint256[] storage referrals = buyer.referrals;
        uint256 sum = 0;
        for (uint8 i = 0; i < referrals.length; ++i) {
            sum = sum.add(referrals[i]);
        }
        return sum;
    }

}