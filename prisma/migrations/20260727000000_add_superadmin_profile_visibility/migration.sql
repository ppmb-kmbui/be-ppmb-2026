BEGIN;

ALTER TABLE "users"
    ADD COLUMN "is_super_admin" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "is_profile_hidden" BOOLEAN NOT NULL DEFAULT false,
    ADD CONSTRAINT "users_super_admin_requires_admin_check"
        CHECK (NOT "is_super_admin" OR "is_admin");

DO $migration$
DECLARE
    allowlist_2024 TEXT[] := ARRAY[
        'jennifferjericalioe@gmail.com',
        'brigitachuanes@gmail.com',
        'chelseaangelinewinata@gmail.com',
        'styvenchai@gmail.com',
        'leanryfai@gmail.com',
        'aridarrellmuljono@gmail.com',
        'steven@gmail.com',
        'celyneadriani@gmail.com',
        'derrick@gmail.com',
        'jaysenlestari@gmail.com',
        'matthewwijaya@gmail.com',
        'anandagautamasekarkhosmana@gmail.com',
        'ameliajuliawati@gmail.com',
        'calistaangelinasepriandi@gmail.com',
        'thejamonicaervina@gmail.com',
        'charliewijaya@gmail.com',
        'steviebu@gmail.com',
        'ivanasanniealiansyah@gmail.com',
        'peterfarhamdysusilo@gmail.com',
        'michelynverencia@gmail.com',
        'raymond@gmail.com',
        'evansidhartatanjung@gmail.com',
        'teresyamaretadewi@gmail.com',
        'michelle@gmail.com'
    ];
    allowlist_2025 TEXT[] := ARRAY[
        'anandaputerasidhisutanto@gmail.com',
        'sheilabudiman@gmail.com',
        'adelinelei@gmail.com',
        'ardiansyahhendrawinata@gmail.com',
        'claydenlorentzhoa@gmail.com',
        'liesian@gmail.com',
        'evanandrian@gmail.com',
        'owenviriyachandra@gmail.com',
        'justinlie@gmail.com',
        'felicechan@gmail.com',
        'leedevingerrard@gmail.com',
        'violinmonica@gmail.com',
        'nimittapurwaningtyaslestari@gmail.com',
        'nikitaviryaatmadja@gmail.com',
        'jessicaphowena@gmail.com',
        'joshelineangelica@gmail.com',
        'sherinnatalia@gmail.com',
        'nirinayoung@gmail.com',
        'raisekurniaty@gmail.com',
        'elysiakosasih@gmail.com',
        'nicholas@gmail.com',
        'jeffreynard@gmail.com',
        'juliusiskandar@gmail.com',
        'vinsonutama@gmail.com',
        'enricorayfanchia@gmail.com',
        'pietherju@gmail.com',
        'chindy@gmail.com',
        'priscilliafelyanamory@gmail.com',
        'assavasantihandoyo@gmail.com',
        'jeslineviriyaloe@gmail.com',
        'marshanandariawan@gmail.com',
        'michael@gmail.com',
        'revalinaaugustine@gmail.com',
        'terraputradarmawan@gmail.com',
        'darwin@gmail.com',
        'richiebryantirta@gmail.com'
    ];
    all_allowlisted_emails TEXT[];
    admin_matches INTEGER;
    unique_allowlist_emails INTEGER;
    duplicate_accounts INTEGER;
    wrong_batch_accounts INTEGER;
BEGIN
    all_allowlisted_emails := allowlist_2024 || allowlist_2025;

    IF CARDINALITY(allowlist_2024) <> 24
        OR CARDINALITY(allowlist_2025) <> 36
        OR CARDINALITY(all_allowlisted_emails) <> 60 THEN
        RAISE EXCEPTION
            'Lampiran I harus berisi tepat 24 akun angkatan 2024 dan 36 akun angkatan 2025';
    END IF;

    SELECT COUNT(*)
    INTO unique_allowlist_emails
    FROM (
        SELECT DISTINCT email
        FROM UNNEST(all_allowlisted_emails) AS allowlist(email)
    ) AS unique_allowlist;

    IF unique_allowlist_emails <> 60 THEN
        RAISE EXCEPTION 'Lampiran I berisi email duplikat';
    END IF;

    SELECT COUNT(*)
    INTO admin_matches
    FROM "users"
    WHERE LOWER("email") = 'adminppmb@gmail.com';

    IF admin_matches <> 1 THEN
        RAISE EXCEPTION
            'Promosi SUPERADMIN dibatalkan: ditemukan % akun adminppmb@gmail.com, seharusnya tepat 1',
            admin_matches;
    END IF;

    SELECT COUNT(*)
    INTO duplicate_accounts
    FROM (
        SELECT LOWER("email")
        FROM "users"
        WHERE LOWER("email") = ANY(all_allowlisted_emails)
        GROUP BY LOWER("email")
        HAVING COUNT(*) > 1
    ) AS duplicate_allowlist_accounts;

    IF duplicate_accounts <> 0 THEN
        RAISE EXCEPTION
            'Migrasi visibilitas dibatalkan: terdapat % email Lampiran I yang memiliki akun duplikat',
            duplicate_accounts;
    END IF;

    SELECT COUNT(*)
    INTO wrong_batch_accounts
    FROM "users"
    WHERE LOWER("email") = ANY(all_allowlisted_emails)
      AND NOT (
          ("batch" = 2024 AND LOWER("email") = ANY(allowlist_2024))
          OR ("batch" = 2025 AND LOWER("email") = ANY(allowlist_2025))
      );

    IF wrong_batch_accounts <> 0 THEN
        RAISE EXCEPTION
            'Migrasi visibilitas dibatalkan: terdapat % akun Lampiran I pada angkatan yang salah',
            wrong_batch_accounts;
    END IF;

    UPDATE "users"
    SET
        "is_admin" = true,
        "is_super_admin" = true,
        "is_profile_hidden" = false
    WHERE LOWER("email") = 'adminppmb@gmail.com';

    UPDATE "users"
    SET "is_profile_hidden" = NOT (
        ("batch" = 2024 AND LOWER("email") = ANY(allowlist_2024))
        OR ("batch" = 2025 AND LOWER("email") = ANY(allowlist_2025))
    )
    WHERE "is_admin" = false
      AND "batch" IN (2023, 2024, 2025);

    IF EXISTS (
        SELECT 1
        FROM "users"
        WHERE "is_admin" = false
          AND "batch" IN (2023, 2024, 2025)
          AND "is_profile_hidden" <> NOT (
              ("batch" = 2024 AND LOWER("email") = ANY(allowlist_2024))
              OR ("batch" = 2025 AND LOWER("email") = ANY(allowlist_2025))
          )
    ) THEN
        RAISE EXCEPTION 'Migrasi visibilitas dibatalkan: hasil akhir tidak memenuhi Lampiran I';
    END IF;
END;
$migration$;

ALTER TABLE "users"
    ADD CONSTRAINT "users_adminppmb_must_be_super_admin_check"
        CHECK (
            LOWER("email") <> 'adminppmb@gmail.com'
            OR ("is_admin" AND "is_super_admin")
        );

CREATE INDEX "users_profile_visibility_batch_idx"
    ON "users"("is_profile_hidden", "batch");

COMMIT;
