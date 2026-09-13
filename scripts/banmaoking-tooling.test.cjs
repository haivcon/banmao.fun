"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validateConfig } = require("./deploy-banmaoking.cjs");
const valid = { chainId: 1952, treasury: "0x0000000000000000000000000000000000000001", royaltyReceiver: "0x0000000000000000000000000000000000000002", maxSupply: 9216, royaltyBps: 500, nativePrice: "1000000000000000000", payments: [], collectionSeed: `0x${"12".repeat(32)}` };
test("accepts explicit base-unit configuration", () => assert.deepEqual(validateConfig(valid), valid));
for (const [field, values] of Object.entries({ chainId: [1, "196"], maxSupply: [0, 9217, 1.5], royaltyBps: [-1, 10001], nativePrice: [1, "0", "1.2", "-1", (2n ** 256n).toString()], treasury: ["0x0000000000000000000000000000000000000000", "invalid"], collectionSeed: ["0x12"], payments: [null] })) {
  test(`rejects invalid ${field}`, () => values.forEach((value) => assert.throws(() => validateConfig({ ...valid, [field]: value }))));
}
test("rejects duplicate payment addresses", () => assert.throws(() => validateConfig({ ...valid, payments: [{ token: valid.treasury, price: "1" }, { token: valid.treasury, price: "2" }] })));
test("accepts ERC20-only minting but not zero ERC20 prices", () => {
  const config = { ...valid, nativePrice: "0", royaltyBps: 200, payments: [{ token: valid.treasury, price: "6666000000000000000000" }] };
  assert.deepEqual(validateConfig(config), config);
  assert.throws(() => validateConfig({ ...config, payments: [{ token: valid.treasury, price: "0" }] }));
  assert.throws(() => validateConfig({ ...config, nativePrice: "00" }));
});
