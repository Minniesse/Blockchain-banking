// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ITokenVault {
    struct TokenInfo {
        bool isSupported;
        uint256 totalBalance;
        uint256 reserveBalance;
        uint256 minimumReserve;
    }

    function deposit(address token, uint256 amount) external returns (bool);
    function withdraw(address token, address to, uint256 amount) external returns (bool);
    function getTokenBalance(address token) external view returns (uint256);
    function getAvailableBalance(address token) external view returns (uint256);
    function addSupportedToken(address token, uint256 minimumReserve) external;
    function updateMinimumReserve(address token, uint256 newMinimumReserve) external;
}
