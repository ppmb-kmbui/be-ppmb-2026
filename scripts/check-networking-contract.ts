import assert from "node:assert/strict";

import {
  NETWORKING_BATCH_REQUIREMENTS,
  NETWORKING_CONNECTION_STATUSES,
  NETWORKING_REQUIRED_TOTAL,
  calculateNetworkingProgressFromBatches,
  isCompleteNetworkingSubmission,
  isValidNetworkingQuestionCatalog,
} from "../src/lib/networking";
import { NetworkingSubmissionSchema } from "../src/lib/networkingContract";

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
assert.deepEqual(NETWORKING_CONNECTION_STATUSES, ["accepted", "done"]);
assert.equal(
  isValidNetworkingQuestionCatalog([
    { id: 1, isCustom: false },
    { id: 2, isCustom: false },
    { id: 3, isCustom: false },
    { id: 4, isCustom: true },
  ]),
  true,
);
assert.equal(isValidNetworkingQuestionCatalog([]), false);
assert.equal(
  isValidNetworkingQuestionCatalog([
    { id: 1, isCustom: false },
    { id: 2, isCustom: false },
    { id: 3, isCustom: false },
    { id: 4, isCustom: false },
  ]),
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
assert.equal(NetworkingSubmissionSchema.safeParse(validPayload).success, true);
assert.equal(
  NetworkingSubmissionSchema.safeParse({ ...validPayload, photo_url: "http://example.com/photo.jpg" }).success,
  false,
);
assert.equal(
  NetworkingSubmissionSchema.safeParse({
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
  NetworkingSubmissionSchema.safeParse({ ...validPayload, custom_question: "   " }).success,
  false,
);
assert.equal(
  NetworkingSubmissionSchema.safeParse({
    ...validPayload,
    answers: validPayload.answers.slice(0, 2),
  }).success,
  false,
);

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
