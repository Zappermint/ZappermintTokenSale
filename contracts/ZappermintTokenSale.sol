// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.7.6;

import './SafeMath.sol';
import './AggregatorV3Interface.sol';

struct Buyer {
    address payable addr;
    uint256 eth;
    uint256 zapp;
    bool claimed;
}

// Crowdsale contract for ZAPP. Functionalities:
// - Timed: opens Jan 14, 2021, 6:00:00PM UTC (1610647200) and closes Feb 14, 2021, 6:00:00PM UTC (1613325600)
// - Capped: soft cap of 6M ZAPP, hard cap of 120M ZAPP
// - Refundable: ETH can be refunded if soft cap hasn't been reached
// - Post Delivery: ZAPP can be claimed after Token Sale end, if soft cap has been reached
contract ZappermintTokenSale {
    using SafeMath for uint256; // Avoid overflow issues

// ----
// Variables
// ----

    uint256 private _openingTime; // Start of Token Sale
    uint256 private _closingTime; // End of Token Sale
    uint256 private _softCap; // Minimum amount of ZAPP to sell (18 decimals)
    uint256 private _hardCap; // Maximum amount of ZAPP to sell (18 decimals)
    uint256 private _ethPrice; // Fallback ETH/USD price in case ChainLink breaks (8 decimals)
    uint256 private _zappPrice; // ZAPP/USD price (8 decimals)

    AggregatorV3Interface internal _priceFeed; // ChainLink ETH/USD Price Feed

    mapping(address => Buyer) private _buyers; // Addresses that have bought ZAPP
    uint256 private _soldZAPP; // Amount of ZAPP sold (18 decimals)

    address private _owner; // Owner of the contract
    bool private _ended; // Whether the Token Sale has ended

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

        // Rinkeby: 0x8A753747A1Fa494EC906cE90E9f37563A8AF630e
        // Main: 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419
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
        uint256 price = getLatestPrice(); // 8 decimals
        return price.div(_zappPrice);
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
        return block.timestamp >= _openingTime && block.timestamp <= _closingTime;
    }

    /**
     * @return Whether Token Sale is closed
     */
    function isClosed() public view returns (bool) {
        return block.timestamp > _closingTime;
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
     * @param weiAmount amount of wei
     * @return ZAPP bits (18 decimals)
     */
    function calculateZAPPAmount(uint256 weiAmount) public view returns (uint256) {
        return weiAmount.mul(getRate());
    }

    /**
     * Calculate amount of ETH for a given amount of ZAPP bits
     * @param zappAmount amount of ZAPP bits (18 decimals)
     * @return wei
     */
    function calculateETHAmount(uint256 zappAmount) public view returns (uint256) {
        return zappAmount.div(getRate());
    }

    /**
     * @return The amount of wei this address has spent
     */
    function getBuyerETH(address addr) public view returns (uint256) {
        Buyer memory buyer = _buyers[addr];
        return buyer.eth;
    }

    /**
     * @return The amount of ZAPP bits this address has bought
     */
    function getBuyerZAPP(address addr) public view returns (uint256) {
        Buyer memory buyer = _buyers[addr];
        return buyer.zapp;
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

// ----
// Transaction functions
// ----

    /**
     * Fallback function to buy ZAPP
     */
    fallback () external payable whileOpen beforeEnd {
        buyZAPP();
    }

    /**
     * Receive function to buy ZAPP
     */
    receive() external payable whileOpen beforeEnd {
        buyZAPP();
    }

    /**
     * Buy ZAPP. Beneficiary is sender
     */
    function buyZAPP() public payable whileOpen beforeEnd {
        address beneficiary = msg.sender;

        // Verify amount of ETH
        uint256 eth = msg.value;
        require(eth > 0, "Not enough ETH");

        // Get the buyer by address
        Buyer memory buyer = _buyers[beneficiary];
        buyer.addr = msg.sender;

        // Calculate the amount of ZAPP to receive and add it to the total sold
        uint256 zapp = calculateZAPPAmount(eth); 
        _soldZAPP = _soldZAPP.add(zapp);

        // Verify that this purchase isn't surpassing the hard cap, otherwise refund exceeding amount 
        uint256 exceedingZAPP = _soldZAPP - _hardCap;
        if (exceedingZAPP > 0) {
            uint256 exceedingETH = calculateETHAmount(exceedingZAPP);
            buyer.addr.transfer(exceedingETH);

            // Adjust sold amount and close Token Sale
            _soldZAPP = _hardCap;
            _ended = true;

            // Adjust amount of bought zapp
            zapp = zapp.sub(exceedingZAPP);
        }

        // Adjust buyer variables
        buyer.eth = buyer.eth.add(eth);
        buyer.zapp = buyer.zapp.add(zapp);
        buyer.claimed = false;
        _buyers[beneficiary] = buyer;
    }

    /**
     * Transfers the contract's wei to a wallet, after Token Sale ended and has reached the soft cap
     * @param wallet address to send wei to
     */
    function claimETH(address payable wallet) public payable afterEnd aboveSoftCap onlyOwner {
        // Don't change the `_soldZAPP` here, for potential future reference
        wallet.transfer(address(this).balance);
    }

    /**
     * Lets a buyer claim their ZAPP, after Token Sale ended and has reached the soft cap
     * @return Amount of ZAPP that have been claimed
     * NOTE The true implementation of this is in the Zappermint Token Contract. 
     * ! Do not call this function manually, as you will lose your bought ZAPP
     */
    function claimZAPP() public afterEnd aboveSoftCap returns (uint256) {
        address beneficiary = tx.origin; // Use tx, as msg should point to the Zappermint Token Contract

        // Make sure the sender has bought ZAPP
        Buyer memory buyer = _buyers[beneficiary];
        require(buyer.zapp > 0, "Not a buyer");
        require(!buyer.claimed, "Already claimed");
        uint256 zapp = buyer.zapp;

        // Adjust buyer variables
        buyer.claimed = true;
        _buyers[beneficiary] = buyer;

        // Return amount of ZAPP of the buyer
        return zapp;
    }

    /**
     * Lets the buyer claim their ETH, after Token Sale ended and hasn't reached the soft cap
     */
    function claimRefund() public payable afterEnd belowSoftCap {
        address beneficiary = msg.sender;

        // Make sure the sender has bought ZAPP
        Buyer memory buyer = _buyers[beneficiary];
        require(buyer.eth > 0, "Not a buyer");
        uint256 eth = buyer.eth;

        // Adjust Token Sale state
        _soldZAPP = _soldZAPP.sub(buyer.zapp);

        // Adjust buyer variables
        buyer.eth = 0;
        buyer.zapp = 0;
        _buyers[beneficiary] = buyer;

        // Refund the ETH of the buyer
        buyer.addr.transfer(eth);
    }

}