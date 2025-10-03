// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Test} from "forge-std/Test.sol";
import {KYCRegistry} from "../src/KYCRegistry.sol";
import {GatedERC20} from "../src/GatedERC20.sol";

contract GatedERC20Test is Test {
    KYCRegistry registry;
    GatedERC20 token;

    address admin = address(0xA11CE);
    address alice = address(0xA11A);
    address bob = address(0xB0B);

    function setUp() public {
        registry = new KYCRegistry(admin);

        vm.startPrank(admin);
        token = new GatedERC20("RWA", "RWA", address(registry), admin);
        // whitelist admin, alice, bob
        registry.setStatus(admin, KYCRegistry.Status.WHITELISTED);
        registry.setStatus(alice, KYCRegistry.Status.WHITELISTED);
        registry.setStatus(bob, KYCRegistry.Status.WHITELISTED);
        vm.stopPrank();
    }

    function testMintRequiresWhitelistedTo() public {
        // Ok: admin est minter et alice est whitelist
        vm.prank(admin);
        token.mint(alice, 100);
        assertEq(token.balanceOf(alice), 100);

        // KO: bob passe blacklist -> mint doit revert
        vm.prank(admin);
        registry.setStatus(bob, KYCRegistry.Status.BLACKLISTED);

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(GatedERC20.Blacklisted.selector, bob));
        token.mint(bob, 10);
    }

    function testTransferRequiresWhitelist() public {
        vm.startPrank(admin);
        token.mint(alice, 100);
        vm.stopPrank();

        // transfert OK alice -> bob
        vm.prank(alice);
        bool ok = token.transfer(bob, 40);
        assertTrue(ok);
        assertEq(token.balanceOf(alice), 60);
        assertEq(token.balanceOf(bob), 40);

        // bob devient NON whitelist -> futur transfert doit revert
        vm.prank(admin);
        registry.setStatus(bob, KYCRegistry.Status.NONE);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(GatedERC20.NotWhitelisted.selector, bob));
        bool ignored = token.transfer(bob, 1);
        ignored;

        assertEq(token.balanceOf(alice), 60);
        assertEq(token.balanceOf(bob), 40);
    }

    function testBurnRequiresWhitelistedFrom() public {
        vm.startPrank(admin);
        token.mint(alice, 50);
        vm.stopPrank();

        // burn OK
        vm.prank(alice);
        token.burn(10);
        assertEq(token.balanceOf(alice), 40);

        // alice blacklist -> burn doit revert
        vm.prank(admin);
        registry.setStatus(alice, KYCRegistry.Status.BLACKLISTED);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(GatedERC20.Blacklisted.selector, alice));
        token.burn(1);
    }
}
