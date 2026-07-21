import assert from "node:assert/strict";

import {
  NETWORKING_BATCH_REQUIREMENTS,
  NETWORKING_CONNECTION_STATUSES,
  NETWORKING_FIXED_QUESTION_COUNTS,
  NETWORKING_OWNER_BATCH,
  NETWORKING_PROFILE_ORDER,
  NETWORKING_REQUIRED_TOTAL,
  canNetworkWithTarget,
  calculateNetworkingProgressFromBatches,
  getQuestionTypeForBatch,
  isFriendshipPairAllowed,
  isCompleteNetworkingSubmission,
  isValidNetworkingQuestionCatalog,
  shouldApplyNetworkingDiscoverScope,
} from "../src/lib/networking";
import {
  PeerNetworkingSubmissionSchema,
  SeniorNetworkingSubmissionSchema,
} from "../src/lib/networkingContract";

const validPayload = {
  photo_url: "https://res.cloudinary.com/ppmb/image/upload/networking/photo",
  answers: [
    { question_id: 1, answer: "Jawaban pertama" },
    { question_id: 2, answer: "Jawaban kedua" },
    { question_id: 3, answer: "Jawaban ketiga" },
  ],
  custom_question: "Apa kegiatan yang ingin kamu ikuti?",
  custom_answer: "Saya ingin mengikuti kepanitiaan kampus.",
};

assert.deepEqual(NETWORKING_BATCH_REQUIREMENTS, {
  2026: 10,
  2025: 4,
  2024: 2,
  2023: 2,
});
assert.equal(NETWORKING_REQUIRED_TOTAL, 18);
assert.equal(NETWORKING_OWNER_BATCH, 2026);
assert.deepEqual(NETWORKING_PROFILE_ORDER, [
  { batch: "desc" },
  { fullname: "asc" },
  { id: "asc" },
]);
assert.deepEqual(NETWORKING_FIXED_QUESTION_COUNTS, { PEER: 3, SENIOR: 5 });
assert.deepEqual(NETWORKING_CONNECTION_STATUSES, ["accepted", "done"]);
assert.equal(getQuestionTypeForBatch(2026), "PEER");
assert.equal(getQuestionTypeForBatch(2025), "SENIOR");
assert.equal(getQuestionTypeForBatch(2024), "SENIOR");
assert.equal(getQuestionTypeForBatch(2023), "SENIOR");
assert.equal(getQuestionTypeForBatch(2022), null);
assert.equal(
  isFriendshipPairAllowed(
    { batch: 2026, isAdmin: false },
    { batch: 2026, isAdmin: false },
  ),
  true,
);
assert.equal(
  isFriendshipPairAllowed(
    { batch: 2026, isAdmin: false },
    { batch: 2025, isAdmin: false },
  ),
  false,
);
assert.equal(
  canNetworkWithTarget({ batch: 2026, isAdmin: false }, 2026, false),
  false,
);
assert.equal(
  canNetworkWithTarget({ batch: 2026, isAdmin: false }, 2026, true),
  true,
);
assert.equal(
  canNetworkWithTarget({ batch: 2026, isAdmin: false }, 2025, false),
  true,
);
assert.equal(
  canNetworkWithTarget({ batch: 2025, isAdmin: false }, 2026, true),
  false,
);
assert.equal(
  shouldApplyNetworkingDiscoverScope(
    { batch: 2026, isAdmin: false },
    "discover",
  ),
  true,
);
assert.equal(
  shouldApplyNetworkingDiscoverScope(
    { batch: 2025, isAdmin: false },
    "discover",
  ),
  false,
);
assert.equal(
  shouldApplyNetworkingDiscoverScope(
    { batch: 2026, isAdmin: false },
    "all",
  ),
  false,
);
assert.equal(
  isValidNetworkingQuestionCatalog([
    { id: 1, isCustom: false },
    { id: 2, isCustom: false },
    { id: 3, isCustom: false },
    { id: 4, isCustom: true },
  ], "PEER"),
  true,
);
assert.equal(
  isValidNetworkingQuestionCatalog(
    [
      { id: 5, isCustom: false },
      { id: 6, isCustom: false },
      { id: 7, isCustom: false },
      { id: 8, isCustom: false },
      { id: 9, isCustom: false },
      { id: 10, isCustom: true },
    ],
    "SENIOR",
  ),
  true,
);
assert.equal(isValidNetworkingQuestionCatalog([], "PEER"), false);
assert.equal(
  isValidNetworkingQuestionCatalog([
    { id: 1, isCustom: false },
    { id: 2, isCustom: false },
    { id: 3, isCustom: false },
    { id: 4, isCustom: false },
  ], "PEER"),
  false,
);
assert.equal(
  isCompleteNetworkingSubmission(
    {
      photoUrl: validPayload.photo_url,
      answers: [],
    } as unknown as Parameters<typeof isCompleteNetworkingSubmission>[0],
    new Set(),
  ),
  false,
);
assert.equal(PeerNetworkingSubmissionSchema.safeParse(validPayload).success, true);
assert.equal(
  PeerNetworkingSubmissionSchema.safeParse({ ...validPayload, photo_url: "http://example.com/photo.jpg" }).success,
  false,
);
assert.equal(
  PeerNetworkingSubmissionSchema.safeParse({
    ...validPayload,
    answers: [
      validPayload.answers[0],
      validPayload.answers[0],
      validPayload.answers[2],
    ],
  }).success,
  false,
);
assert.equal(
  PeerNetworkingSubmissionSchema.safeParse({ ...validPayload, custom_question: "   " }).success,
  false,
);
assert.equal(
  PeerNetworkingSubmissionSchema.safeParse({
    ...validPayload,
    answers: validPayload.answers.slice(0, 2),
  }).success,
  false,
);

const seniorPayload = {
  ...validPayload,
  answers: [
    ...validPayload.answers,
    { question_id: 4, answer: "Jawaban keempat" },
    { question_id: 5, answer: "Jawaban kelima" },
  ],
};
assert.equal(SeniorNetworkingSubmissionSchema.safeParse(seniorPayload).success, true);
assert.equal(SeniorNetworkingSubmissionSchema.safeParse(validPayload).success, false);

const partialProgress = calculateNetworkingProgressFromBatches([
  ...Array(3).fill(2026),
  ...Array(2).fill(2025),
  2024,
  2022,
]);
assert.deepEqual(partialProgress.byBatch["2026"], {
  completed: 3,
  required: 10,
  percentage: 30,
});
assert.equal(partialProgress.completed, 6);
assert.equal(partialProgress.required, 18);

const cappedProgress = calculateNetworkingProgressFromBatches([
  ...Array(12).fill(2026),
  ...Array(6).fill(2025),
  ...Array(4).fill(2024),
  ...Array(3).fill(2023),
]);
assert.equal(cappedProgress.completed, 18);
assert.equal(cappedProgress.percentage, 100);
assert.equal(cappedProgress.byBatch["2026"].completed, 10);
assert.equal(cappedProgress.byBatch["2025"].completed, 4);
assert.equal(cappedProgress.byBatch["2024"].completed, 2);
assert.equal(cappedProgress.byBatch["2023"].completed, 2);

console.log("Validator kontrak Networking lulus.");
