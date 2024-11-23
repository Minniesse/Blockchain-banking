// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IPriceOracle {
    struct PriceFeed {
        address chainlinkFeed;
        uint256 lastUpdateTimestamp;
        uint256 heartbeat;
        bool isActive;
    }

    function getLatestPrice(address token) external view returns (uint256, bool);
    function getPrice(address token) external view returns (uint256);
    function updatePrice(address token) external;
    function addPriceFeed(address token, address feedAddress, uint256 heartbeat) external;
    function removePriceFeed(address token) external;
}
