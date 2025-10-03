// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

interface IKYCRegistry {
    function setStatus(address user, uint8 status) external;
}

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address);
}

contract WhitelistPool is Script {
    function run() external {
        address kyc     = vm.envAddress("CONTRACT_KYC_REGISTRY");
        address factory = vm.envAddress("UNIV3_FACTORY");
        address rwa     = vm.envAddress("CONTRACT_RWA20");
        address weth    = vm.envAddress("WETH");
        uint24 fee      = uint24(vm.envUint("FEE"));
        uint8  WL       = 1; // WHITELISTED

        address pool = IUniswapV3Factory(factory).getPool(rwa, weth, fee);
        require(pool != address(0), "pool not found");

        vm.startBroadcast();
        IKYCRegistry(kyc).setStatus(pool, WL);
        vm.stopBroadcast();

        console2.log("Whitelisted POOL:", pool);
    }
}
