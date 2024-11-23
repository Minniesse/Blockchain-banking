// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract PriceOracle is AccessControl {
    bytes32 public constant PRICE_UPDATER_ROLE = keccak256("PRICE_UPDATER_ROLE");

    struct PriceFeed {
        AggregatorV3Interface chainlinkFeed;
        uint256 lastUpdateTimestamp;
        uint256 heartbeat;
        bool isActive;
    }

    mapping(address => PriceFeed) public priceFeeds;
    mapping(address => uint256) public prices;

    event PriceUpdated(address indexed token, uint256 price, uint256 timestamp);
    event FeedAdded(address indexed token, address indexed feed);
    event FeedRemoved(address indexed token);
    event FeedFailed(address indexed token, string reason);

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function addPriceFeed(
        address token,
        address feedAddress,
        uint256 heartbeat
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(feedAddress != address(0), "Invalid feed address");
        require(heartbeat > 0, "Invalid heartbeat");

        priceFeeds[token] = PriceFeed({
            chainlinkFeed: AggregatorV3Interface(feedAddress),
            lastUpdateTimestamp: 0,
            heartbeat: heartbeat,
            isActive: true
        });

        emit FeedAdded(token, feedAddress);
    }

    function getLatestPrice(address token) public view returns (uint256, bool) {
        PriceFeed memory feed = priceFeeds[token];
        require(feed.isActive, "Price feed not active");

        try feed.chainlinkFeed.latestRoundData() returns (
            uint80 roundId,
            int256 answer,
            uint256 /* startedAt */,
            uint256 updatedAt,
            uint80 answeredInRound
        ) {
            require(answer > 0, "Negative price");
            require(updatedAt > 0, "Round not complete");
            require(answeredInRound >= roundId, "Stale price");
            
            // Check if the price is fresh according to heartbeat
            bool isFresh = (block.timestamp - updatedAt) <= feed.heartbeat;
            
            return (uint256(answer), isFresh);
        } catch {
            return (0, false);
        }
    }

    function updatePrice(address token) external onlyRole(PRICE_UPDATER_ROLE) {
        (uint256 price, bool isFresh) = getLatestPrice(token);
        require(isFresh, "Price is stale");
        require(price > 0, "Invalid price");

        prices[token] = price;
        priceFeeds[token].lastUpdateTimestamp = block.timestamp;

        emit PriceUpdated(token, price, block.timestamp);
    }

    function removePriceFeed(address token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(priceFeeds[token].isActive, "Feed not active");
        priceFeeds[token].isActive = false;
        emit FeedRemoved(token);
    }

    function getPrice(address token) external view returns (uint256) {
        require(priceFeeds[token].isActive, "Price feed not active");
        require(prices[token] > 0, "Price not available");
        return prices[token];
    }
}