import * as prepareRoute from "../app/api/ai/transactions/prepare/route";
import * as collectionRoute from "../app/api/collection/route";

test("transaction preparation exports only Next.js route handlers and configuration", () => {
  expect(Object.keys(prepareRoute).sort()).toEqual(["POST", "dynamic", "runtime"]);
});

test("collection exports only its Next.js route handler", () => {
  expect(Object.keys(collectionRoute)).toEqual(["GET"]);
});
