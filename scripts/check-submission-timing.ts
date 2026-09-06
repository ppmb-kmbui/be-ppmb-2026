import assert from "node:assert/strict";
import { getLatestSubmissionTiming, getTaskSubmissionTimings } from "../src/lib/taskSubmissionTiming";

const onTime = new Date("2026-09-05T23:59:59.999+07:00");
const late = new Date("2026-09-06T00:00:00+07:00");

assert.deepEqual(getLatestSubmissionTiming([onTime]), {
  submittedAt: "2026-09-05T16:59:59.999Z", isLate: false,
});
assert.deepEqual(getLatestSubmissionTiming([late]), {
  submittedAt: "2026-09-05T17:00:00.000Z", isLate: true,
});
assert.deepEqual(getLatestSubmissionTiming([late, onTime]), getLatestSubmissionTiming([late]));
assert.deepEqual(getLatestSubmissionTiming([null, undefined, new Date("invalid")]), {
  submittedAt: null, isLate: null,
});
assert.deepEqual(getLatestSubmissionTiming([]), { submittedAt: null, isLate: null });

const timings = getTaskSubmissionTimings({
  networking: [onTime, late], explorer: [null], mentoring: [onTime],
  fossib: [late], "insight-hunting": [],
});
assert.equal(timings.networking.isLate, true);
assert.equal(timings.explorer.isLate, null);
assert.equal(timings.mentoring.isLate, false);
assert.equal(timings.fossib.isLate, true);
assert.equal(timings["insight-hunting"].isLate, null);

console.log("Waktu submission lulus: batas akhir 5 September WIB, waktu terakhir, dan histori tanpa timestamp.");
