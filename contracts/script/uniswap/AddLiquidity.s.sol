// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

interface IUniswapV3PoolView {
    function slot0() external view returns (
        uint160 sqrtPriceX96,
        int24 tick,
        uint16 observationIndex,
        uint16 observationCardinality,
        uint16 observationCardinalityNext,
        uint8 feeProtocol,
        bool unlocked
    );
    function tickSpacing() external view returns (int24);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
}

interface INonfungiblePositionManager {
    struct MintParams {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        address recipient;
        uint256 deadline;
    }
    function mint(MintParams calldata params)
        external
        payable
        returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1);
}

contract AddLiquidity is Script {
    function run() external {
        address pool = vm.envAddress("POOL");
        address pmgr = vm.envAddress("POSITION_MANAGER");

        // Montants fournis via env
        uint256 amountRWA = vm.envUint("AMOUNT_RWA_1e18");
        uint256 amountWETH = vm.envUint("AMOUNT_WETH_1e18");

        IUniswapV3PoolView p = IUniswapV3PoolView(pool);
        ( , int24 currentTick, , , , , ) = p.slot0();
        int24 spacing = p.tickSpacing();
        address token0 = p.token0();
        address token1 = p.token1();
        uint24 fee = p.fee();

        int24 center = (currentTick / spacing) * spacing;
        if (currentTick < 0 && currentTick % spacing != 0) {
            center -= spacing;
        }
        int24 tickLower = center - spacing;
        int24 tickUpper = center + spacing;

        uint256 amount0 = (token0 == vm.envAddress("CONTRACT_RWA20")) ? amountRWA : amountWETH;
        uint256 amount1 = (token1 == vm.envAddress("WETH"))          ? amountWETH : amountRWA;

        INonfungiblePositionManager.MintParams memory mp = INonfungiblePositionManager.MintParams({
            token0: token0,
            token1: token1,
            fee: fee,
            tickLower: tickLower,
            tickUpper: tickUpper,
            amount0Desired: amount0,
            amount1Desired: amount1,
            amount0Min: 0,
            amount1Min: 0,
            recipient: msg.sender,
            deadline: block.timestamp + 600
        });

        vm.startBroadcast();
        (uint256 tokenId, uint128 liq, uint256 used0, uint256 used1) = INonfungiblePositionManager(pmgr).mint(mp);
        vm.stopBroadcast();

        console2.log("LP NFT tokenId:", tokenId);
        console2.log("Liquidity    :", uint256(liq));
        console2.log("Used token0  :", used0);
        console2.log("Used token1  :", used1);
        console2.log("tickLower    :", tickLower);
        console2.log("tickUpper    :", tickUpper);
    }
}
