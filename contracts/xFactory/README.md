# xFactory

Non-upgradeable, permissioned CREATE/CREATE2 factory. Deployed and source-verified on X Layer mainnet (196); not independently audited.

## Production deployment and vanity addresses

Public deployment values are saved in `xlayer-mainnet.json` beside this README. See `VANITY_DEPLOY_VN.md` for the CREATE2 workflow and required checkpoint values. These files are the reusable repository reference; local deployment archives under `deployments/` are ignored by Git.

Factory: `0x3348ccD25887E8d5e82C098ff03647d8D94cc44d`.
Initial owner/direct caller: `0x92809f2837f708163d375960063C8A3156fCeACb`. Recheck live owner/operator permissions before each deployment; the initial owner is not a permanent authorization guarantee.

## API

- `deployCreate(initCode)`: forwards all `msg.value` to the constructor.
- `deployCreate2(userSalt, initCode)`: same, with deterministic deployment.
- `deployCreateAndCall(initCode, constructorValue, callData)` and `deployCreate2AndCall(userSalt, initCode, constructorValue, callData)`: forward constructorValue to deployment and the remainder of msg.value to initialization on the newly deployed address only. Failure reverts deployment too.
- `computeEffectiveSalt(deployer, userSalt)`: keccak256(abi.encode(deployer, userSalt)). All CREATE2 entry points use this namespace, including for the owner.
- `predictCreate2Address(deployer, userSalt, initCodeHash)`: deployer MUST be the calling wallet, multisig or caller contract, not necessarily the factory owner.
- `computeInitCodeHash`, `hasCode`, `getCodeHash`: inspection helpers. No code does not guarantee absence of nonce collisions.
- `setOperator`, `pause`, `unpause`: owner controls deployment permissions. Pausing blocks all four deploy methods, not asset recovery or ownership management.
- `transferOwnership`, `acceptOwnership`, `pendingOwner`, `owner`: inherited two-step ownership. Renunciation is disabled. Existing operators remain authorized after ownership transfer; review/revoke them explicitly.
- `recoverNative`, `recoverERC20`: owner-only recovery of assets held by the factory, not assets in deployed contracts. Ordinary native transfers are rejected; forcibly sent native funds can be recovered.

## Important constraints

The constructor requires an explicit nonzero initialOwner. Constructors and initialization calls in child contracts see xFactory as msg.sender. Pass child ownership/royalty/treasury addresses explicitly. Deploying a child does not automatically grant the factory owner control over it. There is no arbitrary-call escape hatch for a child accidentally owned by the factory.

Initialization success means the EVM call succeeded, not that the intended business state was established. Inspect child getters afterwards. A returned false value or successful fallback does not automatically revert. Use child initializers that revert on failure. Initialization calldata and native value are NOT included in the CREATE2 address formula; the caller namespace prevents another caller from using the same namespace, not mistakes or competing transactions from the same authorized caller.

All four deployment paths reject empty init code, failed creation and empty deployed runtime. Deploy calls spend their own msg.value rather than existing factory funds. Owner recovery and deployments are nonreentrant. Operators are trusted to deploy arbitrary bytecode; do not authorize untrusted contracts. This utility does not audit child bytecode.

No batch deployment, arbitrary delegatecall, upgrades or on-chain vanity mining. CREATE nonce prediction belongs in off-chain tooling; CREATE2 vanity mining must use this factory address AND its effective-salt formula. Old mining checkpoints for another factory are not reusable.

## Hardening and compatibility

- `batchSetOperator(ops, flags)` is owner-only and atomic. Lengths must match; duplicate addresses are processed in order (last flag wins). Empty batches are no-ops. Split large batches to fit the chain gas limit.
- `operatorCount()` and `operatorAt(index)` enumerate explicitly granted operators, not the implicit owner permission. Indices can change after removal; read at a fixed block. Ownership transfer does not clear operators.
- `deployedBy(address)` records historical successful factory deployments. Initialization failure rolls back this record too. It does not certify safety, ownership, initialization correctness or continued code existence.
- Init code is limited to 49,152 bytes, matching EIP-3860. This is input validation, not a network-wide DoS fix.
- AndCall methods now reject empty calldata, including intentional receive-only calls. Nonempty calldata can still hit a successful fallback or return false; this is not semantic initialization verification.
- Recovery now rejects zero amounts; ERC-20 recovery explicitly rejects the zero token address. These are intentional API behavior changes.
- `code.length` checks cannot reliably detect a child scheduled for destruction at transaction end. Even with EIP-6780, a child created and destroyed in the same transaction can disappear. Only deploy trusted/reviewed bytecode.
- This contract is non-upgradeable. An existing deployment requires replacement, not an in-place update. A different factory address changes CREATE2 predictions even though the salt formula is unchanged.

## Local validation

Run `node node_modules/jest/bin/jest.js --testPathPatterns=xFactory --runInBand` from the repository root. Tests compile Solidity using installed solc and OpenZeppelin, targeting Shanghai, and deploy to Ganache only. Confirm the target chain EVM and compiler settings before preparing a mainnet release.
