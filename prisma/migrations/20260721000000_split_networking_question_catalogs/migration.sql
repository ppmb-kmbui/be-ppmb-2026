BEGIN;

CREATE TYPE "NetworkingQuestionType" AS ENUM ('PEER', 'SENIOR');

ALTER TABLE "networking_questions"
ADD COLUMN "question_type" "NetworkingQuestionType" NOT NULL DEFAULT 'PEER';

DROP INDEX "networking_questions_code_key";
DROP INDEX "networking_questions_position_key";

CREATE UNIQUE INDEX "networking_questions_question_type_code_key"
ON "networking_questions"("question_type", "code");

CREATE UNIQUE INDEX "networking_questions_question_type_position_key"
ON "networking_questions"("question_type", "position");

INSERT INTO "networking_questions" (
    "question_type",
    "code",
    "prompt",
    "position",
    "is_custom",
    "is_active"
) VALUES
    (
        'SENIOR',
        'freshman_do_differently',
        'Apabila Ko/Ci bisa kembali menjadi mahasiswa baru, hal apa yang ingin Ko/Ci lakukan secara berbeda? Mengapa?',
        1,
        false,
        true
    ),
    (
        'SENIOR',
        'maximize_ui_experience',
        'Apakah Ko/Ci memiliki saran untuk mahasiswa baru supaya dapat memaksimalkan pengalaman selama berkuliah di UI?',
        2,
        false,
        true
    ),
    (
        'SENIOR',
        'ui_survival',
        'Menurut Ko/Ci, UI itu perguruan tinggi yang seperti apa sih? Apakah Ko/Ci memiliki tips and trick supaya bisa survive di UI?',
        3,
        false,
        true
    ),
    (
        'SENIOR',
        'kmbui_experience',
        'Menurut Ko/Ci, KMBUI itu organisasi yang seperti apa sih? Apa saja pengalaman yang Ko/Ci miliki di KMBUI?',
        4,
        false,
        true
    ),
    (
        'SENIOR',
        'comfort_zone_challenge',
        'Selama menjadi mahasiswa UI, apakah ada situasi tertentu yang membuat Ko/Ci keluar dari zona nyaman dan menjadi tantangan untuk Ko/Ci? Bagaimana cara Ko/Ci mengatasi hal tersebut?',
        5,
        false,
        true
    ),
    (
        'SENIOR',
        'custom_question',
        'Pertanyaan Bebas dari mahasiswa baru',
        6,
        true,
        true
    );

COMMIT;
