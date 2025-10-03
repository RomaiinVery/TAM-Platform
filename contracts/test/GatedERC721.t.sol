// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Test} from "forge-std/Test.sol";
import {KYCRegistry} from "../src/KYCRegistry.sol";
import {GatedERC721} from "../src/GatedERC721.sol";

contract GatedERC721Test is Test {
    KYCRegistry registry;
    GatedERC721 token;

    address admin = address(0xA11CE);
    address alice = address(0xA11A);
    address bob = address(0xB0B);

    function setUp() public {
        registry = new KYCRegistry(admin);

        vm.startPrank(admin);
        token = new GatedERC721("RWA721", "RWA721", address(registry), admin, "ipfs://base/");
        // whitelist de base
        registry.setStatus(admin, KYCRegistry.Status.WHITELISTED);
        registry.setStatus(alice, KYCRegistry.Status.WHITELISTED);
        registry.setStatus(bob, KYCRegistry.Status.WHITELISTED);
        vm.stopPrank();
    }

    function testMintRequiresWhitelistedTo() public {
        // OK: admin minte pour alice (whitelist)
        vm.prank(admin);
        token.mint(alice, 1);
        assertEq(token.ownerOf(1), alice);

        // KO: bob blacklist -> mint doit revert Blacklisted(bob)
        vm.startPrank(admin);
        registry.setStatus(bob, KYCRegistry.Status.BLACKLISTED);
        vm.expectRevert(abi.encodeWithSelector(GatedERC721.Blacklisted.selector, bob));
        token.mint(bob, 2);
        vm.stopPrank();
    }

    function testTransferRequiresWhitelist() public {
        // Mint initial vers alice
        vm.prank(admin);
        token.mint(alice, 10);
        assertEq(token.ownerOf(10), alice);

        // Transfert OK alice -> bob
        vm.prank(alice);
        token.safeTransferFrom(alice, bob, 10);
        assertEq(token.ownerOf(10), bob);

        // bob passe NONE -> son prochain transfert doit revert NotWhitelisted(bob)
        vm.prank(admin);
        registry.setStatus(bob, KYCRegistry.Status.NONE);

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(GatedERC721.NotWhitelisted.selector, bob));
        token.safeTransferFrom(bob, alice, 10);
    }

    function testBurnRequiresWhitelistedFrom() public {
        // Mint initial vers alice
        vm.prank(admin);
        token.mint(alice, 20);

        // Burn OK par alice
        vm.prank(alice);
        token.burn(20);
        vm.expectRevert(); // ownerOf doit revert si token brûlé
        token.ownerOf(20);

        // Minte un nouveau token pour alice, puis blacklist alice -> burn doit revert Blacklisted(alice)
        vm.prank(admin);
        token.mint(alice, 21);
        vm.prank(admin);
        registry.setStatus(alice, KYCRegistry.Status.BLACKLISTED);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(GatedERC721.Blacklisted.selector, alice));
        token.burn(21);
    }
}
