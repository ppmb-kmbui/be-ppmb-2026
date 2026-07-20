BEGIN;

-- The two-Google-Docs Networking rows contain development dummy data and have
-- been explicitly retired. No other task, user, connection, or legacy table is
-- modified by this migration.
DROP TABLE "networking_submissions";

CREATE TABLE "networking_questions" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "is_custom" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "networking_questions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "networking_questions_code_not_blank_check" CHECK (BTRIM("code") <> ''),
    CONSTRAINT "networking_questions_prompt_not_blank_check" CHECK (BTRIM("prompt") <> ''),
    CONSTRAINT "networking_questions_position_positive_check" CHECK ("position" > 0)
);

CREATE UNIQUE INDEX "networking_questions_code_key"
ON "networking_questions"("code");

CREATE UNIQUE INDEX "networking_questions_position_key"
ON "networking_questions"("position");

INSERT INTO "networking_questions" (
    "id",
    "code",
    "prompt",
    "position",
    "is_custom",
    "is_active"
) VALUES
    (
        1,
        'study_path_choice',
        'Dari banyaknya pilihan yang ada, apa yang akhirnya membuat kamu memilih jalan yang membawa kamu sampai ke jurusan dan universitas ini?',
        1,
        false,
        true
    ),
    (
        2,
        'formative_experience',
        'Dari perjalanan kamu sampai saat ini, pengalaman apa yang paling berpengaruh dalam membentuk dirimu yang sekarang?',
        2,
        false,
        true
    ),
    (
        3,
        'first_year_goal',
        'Apa target yang ingin kamu capai di tahun pertama kuliah ini?',
        3,
        false,
        true
    ),
    (
        4,
        'custom_question',
        'Pertanyaan Bebas dari mahasiswa baru',
        4,
        true,
        true
    );

SELECT setval(
    pg_get_serial_sequence('"networking_questions"', 'id'),
    (SELECT MAX("id") FROM "networking_questions")
);

CREATE TABLE "networking_submissions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "friend_id" INTEGER NOT NULL,
    "photo_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "networking_submissions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "networking_submissions_different_users_check" CHECK ("user_id" <> "friend_id"),
    CONSTRAINT "networking_submissions_photo_https_check" CHECK (LOWER("photo_url") LIKE 'https://%'),
    CONSTRAINT "networking_submissions_photo_image_check" CHECK (
        LOWER("photo_url") ~ '^https://res\.cloudinary\.com/[^/]+/image/upload/'
        OR LOWER(SPLIT_PART(SPLIT_PART("photo_url", '?', 1), '#', 1)) ~ '\.(png|jpe?g|webp|gif|heic|avif)$'
        OR LOWER(SPLIT_PART(SPLIT_PART("photo_url", '?', 1), '#', 1)) ~ '/(png|jpe?g|webp|gif|heic|avif)$'
    )
);

CREATE UNIQUE INDEX "networking_submissions_user_id_friend_id_key"
ON "networking_submissions"("user_id", "friend_id");

CREATE INDEX "networking_submissions_friend_id_idx"
ON "networking_submissions"("friend_id");

ALTER TABLE "networking_submissions"
ADD CONSTRAINT "networking_submissions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "networking_submissions"
ADD CONSTRAINT "networking_submissions_friend_id_fkey"
FOREIGN KEY ("friend_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "networking_answers" (
    "submission_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,
    "answer" TEXT NOT NULL,
    "custom_question" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "networking_answers_pkey" PRIMARY KEY ("submission_id", "question_id"),
    CONSTRAINT "networking_answers_answer_not_blank_check" CHECK (BTRIM("answer") <> ''),
    CONSTRAINT "networking_answers_custom_question_not_blank_check" CHECK (
        "custom_question" IS NULL OR BTRIM("custom_question") <> ''
    )
);

CREATE INDEX "networking_answers_question_id_idx"
ON "networking_answers"("question_id");

ALTER TABLE "networking_answers"
ADD CONSTRAINT "networking_answers_submission_id_fkey"
FOREIGN KEY ("submission_id") REFERENCES "networking_submissions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "networking_answers"
ADD CONSTRAINT "networking_answers_question_id_fkey"
FOREIGN KEY ("question_id") REFERENCES "networking_questions"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Enforce the custom-question shape against catalog metadata without coupling
-- the constraint to a hard-coded question ID.
CREATE FUNCTION "validate_networking_answer_custom_question"()
RETURNS TRIGGER AS $$
DECLARE
    question_is_custom BOOLEAN;
BEGIN
    SELECT "is_custom"
    INTO question_is_custom
    FROM "networking_questions"
    WHERE "id" = NEW."question_id";

    IF question_is_custom = true AND (
        NEW."custom_question" IS NULL OR BTRIM(NEW."custom_question") = ''
    ) THEN
        RAISE EXCEPTION 'custom Networking question requires custom_question'
            USING ERRCODE = '23514';
    END IF;

    IF question_is_custom = false AND NEW."custom_question" IS NOT NULL THEN
        RAISE EXCEPTION 'fixed Networking question cannot have custom_question'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "networking_answers_custom_question_trigger"
BEFORE INSERT OR UPDATE OF "question_id", "custom_question"
ON "networking_answers"
FOR EACH ROW
EXECUTE FUNCTION "validate_networking_answer_custom_question"();

COMMIT;
