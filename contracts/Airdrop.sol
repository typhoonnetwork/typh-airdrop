// SPDX-License-Identifier: MIT

pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Airdrop {
  mapping(address => uint256) public claims;
  address public tokenAddress;

  struct Recipient {
    address to;
    uint256 amount;
  }

  address public operator;
  modifier onlyOperator {
    require(msg.sender == operator, "only operator can call this function.");
    _;
  }

  event Claim(address to, uint256 amount, uint256 timestamp);

  constructor(
    address _tokenAddress,
    Recipient[] memory _targets,
    address _operator
  ) public {
    operator = _operator;
    tokenAddress = _tokenAddress;

    for (uint256 i = 0; i < _targets.length; i++) {
      claims[_targets[i].to] = _targets[i].amount;
    }
  }

  function add(Recipient[] calldata _targets) external onlyOperator {
    for (uint256 i = 0; i < _targets.length; i++) {
      claims[_targets[i].to] = _targets[i].amount;
    }
  }

  function availableClaim() view external returns (uint256) {
    return claims[msg.sender];
  }

  function claim() external {
    IERC20 t = IERC20(tokenAddress);
    require(claims[msg.sender] > 0, "no claim available");
    require(t.balanceOf(address(this)) > 0, "no tokens left to claim");
    uint256 amount = claims[msg.sender];

    // claim is resolved
    claims[msg.sender] = 0;
    t.transfer(msg.sender, amount);

    emit Claim(msg.sender, amount, block.timestamp);
  }

  function withdrawUnspentClaims() external onlyOperator {
    IERC20 t = IERC20(tokenAddress);
    require(t.balanceOf(address(this)) > 0, "all tokens already spent");
    t.transfer(operator, t.balanceOf(address(this)));
  }

  /** @dev operator can change his address */
  function changeOperator(address _newOperator) external onlyOperator {
    operator = _newOperator;
  }
}
