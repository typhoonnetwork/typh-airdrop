pragma solidity ^0.6.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract BEP20Mock is ERC20 {
  constructor(uint256 _initialSupply) public ERC20("Typhoon", "TYPH") {
    _mint(msg.sender, _initialSupply);
  }
}
