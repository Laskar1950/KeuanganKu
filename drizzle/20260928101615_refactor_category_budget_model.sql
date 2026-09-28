-- =============================================================================
-- MIGRASI: Refactor model kategori & anggaran
-- Tujuan :
--   1. Pengeluaran (expense) kini wajib punya category_id (bukan budget_id)
--   2. budget_id pada expense menjadi OPSIONAL (boleh null)
--   3. Anggaran (budgets) kini wajib punya category_id
--   4. Data lama dibackfill secara aman tanpa kehilangan relasi
--
-- Strategi (4 tahap):
--   Tahap 1 — Longgarkan constraint lama agar backfill bisa berjalan
--   Tahap 2 — Backfill: buat kategori dari nama alokasi, isi category_id
--   Tahap 3 — Perketat constraint baru sesuai model bisnis baru
--   Tahap 4 — Update RLS policy transactions agar sesuai constraint baru
-- =============================================================================

-- =============================================================================
-- TAHAP 1: Longgarkan constraint lama
-- Constraint lama memaksa: expense → budgetId NOT NULL, categoryId NULL
--                          income  → categoryId NOT NULL, budgetId NULL
-- Kita hapus dulu agar backfill bisa mengisi category_id pada expense lama.
-- =============================================================================

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_check;

-- Pasang constraint sementara yang sangat longgar: hanya pastikan amount > 0
-- dan income tidak boleh punya budget_id. Expense boleh bebas sementara.
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_check CHECK (
    amount > 0
    AND (type = 'expense' OR budget_id IS NULL)
  );

-- =============================================================================
-- TAHAP 2: Backfill data
-- Langkah A: Untuk setiap alokasi (budget) yang belum punya category_id,
--            cari kategori expense yang namanya cocok (case-insensitive).
--            Jika tidak ada, buat kategori baru dari nama alokasi tsb.
-- Langkah B: Isi budgets.category_id dari hasil pemetaan nama.
-- Langkah C: Isi transactions.category_id dari budgets.category_id.
-- Langkah D: Fallback untuk expense yang masih NULL → "Lainnya".
-- =============================================================================

DO $$
DECLARE
  v_budget       RECORD;
  v_cat_id       uuid;
  v_fallback_id  uuid;
BEGIN

  -- Ambil id kategori fallback "Lainnya" (expense, default)
  SELECT id INTO v_fallback_id
  FROM public.categories
  WHERE family_id IS NULL AND lower(name) = 'lainnya' AND type = 'expense'
  LIMIT 1;

  -- Langkah A + B: iterasi setiap budget yang belum punya category_id
  FOR v_budget IN
    SELECT DISTINCT b.id, b.family_id, b.name
    FROM public.budgets b
    WHERE b.category_id IS NULL
  LOOP
    -- Cari kategori expense yang namanya cocok (family khusus atau default)
    SELECT c.id INTO v_cat_id
    FROM public.categories c
    WHERE c.type = 'expense'
      AND lower(btrim(c.name)) = lower(btrim(v_budget.name))
      AND (c.family_id = v_budget.family_id OR c.family_id IS NULL)
    ORDER BY (c.family_id = v_budget.family_id) DESC  -- prioritaskan family-specific
    LIMIT 1;

    -- Jika tidak ditemukan, buat kategori baru dari nama alokasi
    IF v_cat_id IS NULL THEN
      INSERT INTO public.categories (family_id, name, type, is_default)
      VALUES (v_budget.family_id, btrim(v_budget.name), 'expense', false)
      ON CONFLICT (family_id, name, type) DO NOTHING
      RETURNING id INTO v_cat_id;

      -- ON CONFLICT tidak mengembalikan id, fetch ulang jika perlu
      IF v_cat_id IS NULL THEN
        SELECT id INTO v_cat_id
        FROM public.categories
        WHERE family_id = v_budget.family_id
          AND lower(btrim(name)) = lower(btrim(v_budget.name))
          AND type = 'expense'
        LIMIT 1;
      END IF;
    END IF;

    -- Fallback terakhir jika masih null (seharusnya tidak terjadi)
    IF v_cat_id IS NULL THEN
      v_cat_id := v_fallback_id;
    END IF;

    -- Update budget.category_id
    UPDATE public.budgets
    SET category_id = v_cat_id
    WHERE id = v_budget.id;

  END LOOP;

  -- Langkah C: Isi category_id transaksi expense dari budget-nya
  UPDATE public.transactions t
  SET category_id = b.category_id
  FROM public.budgets b
  WHERE t.budget_id = b.id
    AND t.type = 'expense'
    AND t.category_id IS NULL
    AND b.category_id IS NOT NULL;

  -- Langkah D: Fallback untuk expense yang masih tidak punya category_id
  -- (kasus edge: budget_id sudah null atau budget tidak punya category_id)
  UPDATE public.transactions t
  SET category_id = v_fallback_id
  WHERE t.type = 'expense'
    AND t.category_id IS NULL
    AND v_fallback_id IS NOT NULL;

  RAISE NOTICE 'Backfill selesai.';
  RAISE NOTICE 'Sisa expense tanpa category_id: %',
    (SELECT count(*) FROM public.transactions WHERE type = 'expense' AND category_id IS NULL);

END $$;

-- =============================================================================
-- TAHAP 3: Perketat constraint baru
-- Model baru:
--   - Semua transaksi WAJIB punya category_id
--   - income  → budget_id HARUS null
--   - expense → budget_id BOLEH null (opsional)
--   - budget  → category_id WAJIB (diisi lewat backfill di atas)
-- =============================================================================

-- Hapus constraint sementara
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_check;

-- Pasang constraint final
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_check CHECK (
    amount > 0
    AND category_id IS NOT NULL
    AND (type = 'expense' OR budget_id IS NULL)
  );

-- =============================================================================
-- TAHAP 4: Update RLS policy transactions agar sesuai constraint baru
-- Policy lama mensyaratkan:
--   expense: budget_id linked ke account_id yang sama
-- Policy baru:
--   budget_id opsional; jika ada, tetap harus valid di family yang sama
--   (tidak perlu cocok account_id lagi karena dompet dipilih langsung)
-- =============================================================================

DROP POLICY IF EXISTS transactions_insert_member_matching_refs ON public.transactions;
CREATE POLICY transactions_insert_member_matching_refs ON public.transactions
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    public.is_family_member(family_id)
    AND created_by = auth.uid()
    AND category_id IS NOT NULL
    AND exists (
      SELECT 1 FROM public.accounts a
      WHERE a.id = account_id AND a.family_id = transactions.family_id
    )
    AND exists (
      SELECT 1 FROM public.categories c
      WHERE c.id = category_id
        AND (c.family_id = transactions.family_id OR c.family_id IS NULL)
    )
    AND (
      budget_id IS NULL
      OR exists (
        SELECT 1 FROM public.budgets b
        WHERE b.id = budget_id AND b.family_id = transactions.family_id
      )
    )
  );

DROP POLICY IF EXISTS transactions_update_manager_or_creator_matching_refs ON public.transactions;
CREATE POLICY transactions_update_manager_or_creator_matching_refs ON public.transactions
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    public.is_family_admin_or_owner(family_id) OR created_by = auth.uid()
  )
  WITH CHECK (
    public.is_family_member(family_id)
    AND (created_by = auth.uid() OR public.is_family_admin_or_owner(family_id))
    AND category_id IS NOT NULL
    AND exists (
      SELECT 1 FROM public.accounts a
      WHERE a.id = account_id AND a.family_id = transactions.family_id
    )
    AND exists (
      SELECT 1 FROM public.categories c
      WHERE c.id = category_id
        AND (c.family_id = transactions.family_id OR c.family_id IS NULL)
    )
    AND (
      budget_id IS NULL
      OR exists (
        SELECT 1 FROM public.budgets b
        WHERE b.id = budget_id AND b.family_id = transactions.family_id
      )
    )
  );

-- =============================================================================
-- VERIFIKASI AKHIR (dijalankan sebagai NOTICE, tidak memblokir migrasi)
-- =============================================================================

DO $$
DECLARE
  v_bad_expense   integer;
  v_bad_income    integer;
  v_bad_budget    integer;
BEGIN
  SELECT count(*) INTO v_bad_expense
  FROM public.transactions
  WHERE type = 'expense' AND category_id IS NULL;

  SELECT count(*) INTO v_bad_income
  FROM public.transactions
  WHERE type = 'income' AND budget_id IS NOT NULL;

  SELECT count(*) INTO v_bad_budget
  FROM public.budgets
  WHERE category_id IS NULL;

  RAISE NOTICE '=== HASIL VERIFIKASI MIGRASI ===';
  RAISE NOTICE 'Expense tanpa category_id : % (harus 0)', v_bad_expense;
  RAISE NOTICE 'Income dengan budget_id   : % (harus 0)', v_bad_income;
  RAISE NOTICE 'Budget tanpa category_id  : % (harus 0)', v_bad_budget;

  IF v_bad_expense > 0 OR v_bad_income > 0 OR v_bad_budget > 0 THEN
    RAISE WARNING 'Ada data yang belum bersih. Periksa log di atas.';
  ELSE
    RAISE NOTICE 'Semua data bersih. Migrasi berhasil!';
  END IF;
END $$;
