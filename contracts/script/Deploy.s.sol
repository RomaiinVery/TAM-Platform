// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {KYCRegistry} from "../src/KYCRegistry.sol";
import {GatedERC20} from "../src/GatedERC20.sol";
import {GatedERC721} from "../src/GatedERC721.sol";

contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);

        // 1) Registry
        KYCRegistry registry = new KYCRegistry(deployer);

        // 2) ERC20
        GatedERC20 erc20 = new GatedERC20("RWA Share", "RWA", address(registry), deployer);

        // 3) ERC721
        GatedERC721 erc721 = new GatedERC721("RWA721", "RWA721", address(registry), deployer, "ipfs://base/");

        // KYC + petit mint de démo
        registry.setStatus(deployer, KYCRegistry.Status.WHITELISTED);
        erc20.mint(deployer, 1_000e18);
        erc721.mint(deployer, 1);

        vm.stopBroadcast();

        console2.log("Deployer   :", deployer);
        console2.log("KYCRegistry:", address(registry));
        console2.log("GatedERC20 :", address(erc20));
        console2.log("GatedERC721:", address(erc721));
    }
}
