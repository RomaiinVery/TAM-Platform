// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Test} from "forge-std/Test.sol";
import {KYCRegistry} from "../src/KYCRegistry.sol";

contract KYCRegistryTest is Test {
    KYCRegistry registry;
    address admin = address(0xA11CE);
    address user = address(0xBEEF);

    function setUp() public {
        registry = new KYCRegistry(admin);
    }

    function testOwnerCanSetStatus() public {
        vm.prank(admin);
        registry.setStatus(user, KYCRegistry.Status.WHITELISTED);
        assertTrue(registry.isWhitelisted(user));
    }

    function testNonOwnerCannotSetStatus() public {
        vm.expectRevert(); // Ownable revert
        registry.setStatus(user, KYCRegistry.Status.BLACKLISTED);
    }
}
