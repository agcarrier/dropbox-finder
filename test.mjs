// node test.mjs
import assert from "node:assert/strict";
import { nextPickup, clock, week } from "./public/pickup.js";

const at = (day, hh, mm = 0) => new Date(2026, 10, 15 + day, hh, mm); // 2026-11-15 is a Sunday
const T = "Mo-Fr 16:00; Sa 12:00";

assert.deepEqual(nextPickup(T, at(1, 9)), { inDays: 0, day: 1, min: 960 });   // Mon morning -> today 4 PM
assert.deepEqual(nextPickup(T, at(1, 16)), { inDays: 1, day: 2, min: 960 });  // at 4:00 exactly it's gone
assert.deepEqual(nextPickup(T, at(5, 17)), { inDays: 1, day: 6, min: 720 });  // Fri evening -> Sat noon
assert.deepEqual(nextPickup(T, at(6, 13)), { inDays: 2, day: 1, min: 960 });  // Sat afternoon -> Mon
assert.deepEqual(nextPickup("Mo 09:00,15:00", at(1, 10)).min, 900);           // second slot same day
assert.deepEqual(nextPickup("Mo 09:00", at(1, 10)), { inDays: 7, day: 1, min: 540 }); // next week
assert.deepEqual(week("Fr-Mo 10:00").map(a => a.length), [1, 1, 0, 0, 0, 1, 1]); // wraps the weekend
assert.equal(nextPickup(undefined), null);
assert.equal(nextPickup("garbage"), null);
assert.equal(clock(0), "12:00 AM");
assert.equal(clock(720), "12:00 PM");
assert.equal(clock(975), "4:15 PM");
console.log("pickup ok");
