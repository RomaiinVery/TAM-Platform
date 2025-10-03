// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address);
    function createPool(address tokenA, address tokenB, uint24 fee) external returns (address);
}

contract CreatePool is Script {
    function run() external {
        address factory = vm.envAddress("UNIV3_FACTORY");
        address rwa     = vm.envAddress("CONTRACT_RWA20");
        address weth    = vm.envAddress("WETH");
        uint24 fee      = uint24(vm.envUint("FEE"));

        vm.startBroadcast();

        address existing = IUniswapV3Factory(factory).getPool(rwa, weth, fee);
        address pool;
        if (existing != address(0)) {
            pool = existing;
            console2.log("Pool already exists:", pool);
        } else {
            pool = IUniswapV3Factory(factory).createPool(rwa, weth, fee);
            console2.log("Pool created:", pool);
        }

        vm.stopBroadcast();

        console2.log("NOTE: whitelist this POOL in KYC, then initialize price.");
    }
}
