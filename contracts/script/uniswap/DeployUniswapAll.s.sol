// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {Math} from "lib/openzeppelin-contracts/contracts/utils/math/Math.sol";

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address);
    function createPool(address tokenA, address tokenB, uint24 fee) external returns (address);
}

interface IUniswapV3Pool {
    function initialize(uint160 sqrtPriceX96) external;
    function slot0() external view returns (
        uint160 sqrtPriceX96,
        int24   tick,
        uint16  observationIndex,
        uint16  observationCardinality,
        uint16  observationCardinalityNext,
        uint8   feeProtocol,
        bool    unlocked
    );
    function tickSpacing() external view returns (int24);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
}

interface IKYCRegistry {
    function getStatus(address user) external view returns (uint8);
    function setStatus(address user, uint8 status) external;
}

interface IERC20 {
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address) external view returns (uint256);
}

interface INonfungiblePositionManager {
    struct MintParams {
        address token0;
        address token1;
        uint24  fee;
        int24   tickLower;
        int24   tickUpper;
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

contract DeployUniswapAll is Script {
    // Constantes de statut KYC
    uint8 constant WHITELISTED = 1;

    function run() external {
        // === ENV (toutes nécessaires) ===
        address FACTORY = vm.envAddress("UNIV3_FACTORY");
        address KYC     = vm.envAddress("CONTRACT_KYC_REGISTRY");
        address RWA     = vm.envAddress("CONTRACT_RWA20");
        address WETH    = vm.envAddress("WETH");
        address PMGR    = vm.envAddress("POSITION_MANAGER");

        uint24  FEE             = uint24(vm.envUint("FEE"));
        uint256 PRICE_HUMAN_1e18= vm.envUint("PRICE_HUMAN_1e18");
        uint8   RWA_DECIMALS    = uint8(vm.envUint("RWA_DECIMALS"));
        uint8   WETH_DECIMALS   = uint8(vm.envUint("WETH_DECIMALS"));
        uint256 AMOUNT_RWA_1e18 = vm.envUint("AMOUNT_RWA_1e18");
        uint256 AMOUNT_WETH_1e18= vm.envUint("AMOUNT_WETH_1e18");

        vm.startBroadcast();

        // 1) Pool: get or create
        address pool = IUniswapV3Factory(FACTORY).getPool(RWA, WETH, FEE);
        if (pool == address(0)) {
            pool = IUniswapV3Factory(FACTORY).createPool(RWA, WETH, FEE);
            console2.log("Pool created:", pool);
        } else {
            console2.log("Pool exists:", pool);
        }

        // 2) Whitelist pool si nécessaire
        uint8 status = IKYCRegistry(KYC).getStatus(pool);
        if (status != WHITELISTED) {
            IKYCRegistry(KYC).setStatus(pool, WHITELISTED);
            console2.log("Whitelisted POOL in KYC:", pool);
        } else {
            console2.log("POOL already whitelisted in KYC");
        }

        // 3) Initialize price si nécessaire
        (uint160 s0,, , , , ,) = IUniswapV3Pool(pool).slot0();
        if (s0 == 0) {
            // calc sqrtPriceX96 à partir de PRICE_HUMAN_1e18 (WETH per RWA), en tenant compte des décimales token0/token1.
            // ATTENTION: on suppose token0 = adresse la plus petite; notre prix est exprimé en token1/token0.
            uint256 priceQ18;
            if (WETH_DECIMALS >= RWA_DECIMALS) {
                priceQ18 = PRICE_HUMAN_1e18 * (10 ** (WETH_DECIMALS - RWA_DECIMALS));
            } else {
                priceQ18 = PRICE_HUMAN_1e18 / (10 ** (RWA_DECIMALS - WETH_DECIMALS));
            }
            uint256 sqrtQ9 = Math.sqrt(priceQ18);                  // sqrt(Q18) ~ Q9
            uint160 sqrtPriceX96 = uint160((sqrtQ9 << 96) / 1e9);  // -> Q96

            IUniswapV3Pool(pool).initialize(sqrtPriceX96);
            console2.log("Pool initialized. sqrtPriceX96:", sqrtPriceX96);
        } else {
            console2.log("Pool already initialized. sqrtPriceX96:", s0);
        }

        // 4) Approvals conditionnels (owner = msg.sender)
        _approveIfNeeded(RWA, PMGR, AMOUNT_RWA_1e18);
        _approveIfNeeded(WETH, PMGR, AMOUNT_WETH_1e18);

        // 5) Add liquidity (range étroite autour du tick courant)
        ( , int24 currentTick, , , , , ) = IUniswapV3Pool(pool).slot0();
        int24 spacing = IUniswapV3Pool(pool).tickSpacing();
        address token0 = IUniswapV3Pool(pool).token0();
        address token1 = IUniswapV3Pool(pool).token1();
        uint24 fee     = IUniswapV3Pool(pool).fee();

        // centrer correctement pour ticks négatifs (floor vers multiple de spacing)
        int24 center = (currentTick / spacing) * spacing;
        if (currentTick < 0 && (currentTick % spacing != 0)) {
            center -= spacing;
        }
        int24 tickLower = center - spacing;
        int24 tickUpper = center + spacing;

        // Montants désirés dans l'ordre token0/token1
        uint256 desired0 = (token0 == RWA) ? AMOUNT_RWA_1e18 : AMOUNT_WETH_1e18;
        uint256 desired1 = (token1 == WETH) ? AMOUNT_WETH_1e18 : AMOUNT_RWA_1e18;

        // Cap aux soldes disponibles
        uint256 bal0 = IERC20(token0).balanceOf(msg.sender);
        uint256 bal1 = IERC20(token1).balanceOf(msg.sender);

        uint256 amount0 = bal0 < desired0 ? bal0 : desired0;
        uint256 amount1 = bal1 < desired1 ? bal1 : desired1;

        // Si l’un des deux tombe à 0, on peut éviter d’appeler mint
        require(amount0 > 0 && amount1 > 0, "insufficient balances for LP");

        INonfungiblePositionManager.MintParams memory mp = INonfungiblePositionManager.MintParams({
            token0: token0,
            token1: token1,
            fee:    fee,
            tickLower: tickLower,
            tickUpper: tickUpper,
            amount0Desired: amount0,
            amount1Desired: amount1,
            amount0Min: 0,
            amount1Min: 0,
            recipient: msg.sender,
            deadline: block.timestamp + 600
        });

        (uint256 tokenId, uint128 liq, uint256 used0, uint256 used1) =
            INonfungiblePositionManager(PMGR).mint(mp);

        vm.stopBroadcast();

        console2.log("==== DONE ====");
        console2.log("POOL         :", pool);
        console2.log("LP tokenId   :", tokenId);
        console2.log("Liquidity    :", uint256(liq));
        console2.log("Used token0  :", used0);
        console2.log("Used token1  :", used1);
        console2.log("tickLower    :", tickLower);
        console2.log("tickUpper    :", tickUpper);
    }

    function _approveIfNeeded(address token, address spender, uint256 amount) internal {
        uint256 allowanceNow = IERC20(token).allowance(msg.sender, spender);
        if (allowanceNow < amount) {
            // Approuve exactement 'amount' (pour la démo). En prod, on peut approuver un max/cache.
            bool ok = IERC20(token).approve(spender, amount);
            require(ok, "approve failed");
            console2.log("Approved:");
            console2.log("  spender:");
            console2.logAddress(spender);
            console2.log("  token:");
            console2.logAddress(token);
            console2.log("  amount:");
            console2.logUint(amount);
        } else {
            console2.log("Allowance already sufficient for", token, "->", spender);
        }
    }
}
