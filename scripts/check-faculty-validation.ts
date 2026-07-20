import assert from "node:assert/strict";

import { FACULTIES, FacultySchema } from "../src/lib/faculty";

assert.equal(FACULTIES.length, 16);

for (const faculty of FACULTIES) {
  assert.equal(FacultySchema.parse(faculty), faculty);
}

assert.equal(FacultySchema.parse("  Fasilkom  "), "Fasilkom");
assert.equal(FacultySchema.parse("FIB"), "FIB");

for (const invalidFaculty of ["", "fasilkom", "Ilmu Komputer", "Panitia", "Fakultas Bebas"]) {
  assert.equal(FacultySchema.safeParse(invalidFaculty).success, false);
}

console.log("Validator fakultas lulus.");
