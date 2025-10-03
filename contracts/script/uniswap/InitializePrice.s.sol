// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {Math} from "lib/openzeppelin-contracts/contracts/utils/math/Math.sol";

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address);
}

interface IUniswapV3Pool {
    function initialize(uint160 sqrtPriceX96) external;
    function slot0() external view returns (uint160, int24, uint16, uint16, uint16, uint8, bool);
}

contract InitializePrice is Script {
    function run() external {
        address factory         = vm.envAddress("UNIV3_FACTORY");
        address rwa             = vm.envAddress("CONTRACT_RWA20");
        address weth            = vm.envAddress("WETH");
        uint24  fee             = uint24(vm.envUint("FEE"));
        uint256 priceHuman1e18  = vm.envUint("PRICE_HUMAN_1e18");
        uint8   dec0            = uint8(vm.envUint("RWA_DECIMALS"));
        uint8   dec1            = uint8(vm.envUint("WETH_DECIMALS"));

        address pool = IUniswapV3Factory(factory).getPool(rwa, weth, fee);
        require(pool != address(0), "pool not found");

        (uint160 s0, , , , , , ) = IUniswapV3Pool(pool).slot0();
        if (s0 != 0) {
            console2.log("Already initialized. sqrtPriceX96:", s0);
            return;
        }

        uint256 priceQ18;
        if (dec1 >= dec0) {
            priceQ18 = priceHuman1e18 * (10 ** (dec1 - dec0));
        } else {
            priceQ18 = priceHuman1e18 / (10 ** (dec0 - dec1));
        }
        uint256 sqrtQ9 = Math.sqrt(priceQ18);
        uint160 sqrtPriceX96 = uint160((sqrtQ9 << 96) / 1e9);

        vm.startBroadcast();
        IUniswapV3Pool(pool).initialize(sqrtPriceX96);
        vm.stopBroadcast();

        console2.log("Pool initialized:", pool);
        console2.log("sqrtPriceX96   :", sqrtPriceX96);
    }
}
