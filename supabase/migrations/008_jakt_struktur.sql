-- ─── 008: Skattjakt – Steg-typdefinitioner & Mallar ─────────────────────────

-- Pool av alla möjliga steg-typer (INTRO, PUSSEL_FYSISKT, etc.)
CREATE TABLE steg_typ_definitioner (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kategori                  TEXT NOT NULL CHECK (kategori IN ('BERATTELSE','SOKNING','PUSSEL','FRAGA','AKTIVITET')),
  typ                       TEXT NOT NULL UNIQUE CHECK (typ IN ('INTRO','FINAL','SOK','PUSSEL_FYSISKT','PUSSEL_LOGIK','GATA','VAL','LASUPPDRAG','MINISPEL')),
  namn                      JSONB NOT NULL,   -- {"en":"...","sv":"..."}
  beskrivning               JSONB NOT NULL,
  tema_kompatibilitet       TEXT[] DEFAULT '{}',
  rekommenderad_alder       TEXT[] DEFAULT '{}',
  estimerad_tid_minuter     INT,
  material                  TEXT[] DEFAULT '{}',
  format                    TEXT NOT NULL DEFAULT 'FYSISK' CHECK (format IN ('FYSISK','DIGITAL','HYBRID')),
  is_active                 BOOLEAN NOT NULL DEFAULT true,
  sort_order                INT NOT NULL DEFAULT 0,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_steg_typ_kategori ON steg_typ_definitioner(kategori);

-- Mallar – ett skelett av steg_typer som en agent kan utgå från
CREATE TABLE jakt_mallar (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  namn                      TEXT NOT NULL,
  beskrivning               TEXT,
  steg_typer                TEXT[] NOT NULL,  -- ordnad lista, t.ex. ['INTRO','SOK','GATA','FINAL']
  passar_teman              TEXT[] DEFAULT '{}',
  rekommenderad_alder       TEXT[] DEFAULT '{}',
  rekommenderad_tid_minuter INT,
  is_system_mall            BOOLEAN NOT NULL DEFAULT false,
  is_active                 BOOLEAN NOT NULL DEFAULT true,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- Koppla produkt till den mall som användes (för analytics)
ALTER TABLE products ADD COLUMN mall_id UUID REFERENCES jakt_mallar(id);

CREATE INDEX idx_products_mall_id ON products(mall_id);

-- ─── Seed: Steg-typdefinitioner ──────────────────────────────────────────────

INSERT INTO steg_typ_definitioner (kategori, typ, namn, beskrivning, tema_kompatibilitet, rekommenderad_alder, estimerad_tid_minuter, material, format, sort_order) VALUES

('BERATTELSE', 'INTRO',
  '{"en":"Introduction","sv":"Introduktion"}',
  '{"en":"Narrative that sets the theme – bottle message, letter, mission text","sv":"Berättelse som sätter temat – flaskpost, brev, uppdragstext"}',
  ARRAY['pirat','detektiv','saga','rymd','djungel','jul','födelsedag'],
  ARRAY['toddler','child','teen','adult','all'], 3, ARRAY['kuvert','papper'], 'FYSISK', 0),

('BERATTELSE', 'FINAL',
  '{"en":"Finale","sv":"Final"}',
  '{"en":"The closing scene – treasure chest, reward, celebration","sv":"Avslutningsscenen – kistan, belöning, firande"}',
  ARRAY['pirat','detektiv','saga','rymd','djungel','jul','födelsedag'],
  ARRAY['toddler','child','teen','adult','all'], 5, ARRAY['kista','chokladpengar','godis'], 'FYSISK', 1),

('SOKNING', 'SOK',
  '{"en":"Search","sv":"Sökning"}',
  '{"en":"Find a physical object hidden somewhere","sv":"Hitta ett föremål som är gömt på en plats"}',
  ARRAY['pirat','detektiv','djungel','jul','födelsedag'],
  ARRAY['toddler','child','teen','adult','all'], 5, ARRAY['ledtråd på papper'], 'FYSISK', 2),

('PUSSEL', 'PUSSEL_FYSISKT',
  '{"en":"Physical puzzle","sv":"Fysiskt pussel"}',
  '{"en":"Assemble puzzle pieces into a picture or map","sv":"Lägg ihop bitar till en bild eller karta"}',
  ARRAY['pirat','saga','djungel','födelsedag'],
  ARRAY['child','teen','adult','all'], 8, ARRAY['pusselbitsmall','A4-papper','sax'], 'FYSISK', 3),

('PUSSEL', 'PUSSEL_LOGIK',
  '{"en":"Logic puzzle","sv":"Logikpussel"}',
  '{"en":"Think your way through a sequence, code, or logical challenge","sv":"Tänk dig fram – sekvens, kod eller logisk utmaning"}',
  ARRAY['detektiv','rymd','saga','födelsedag'],
  ARRAY['child','teen','adult'], 8, ARRAY['papper','penna'], 'HYBRID', 4),

('FRAGA', 'GATA',
  '{"en":"Riddle","sv":"Gåta"}',
  '{"en":"Classic riddle with one correct answer","sv":"Klassisk gåta med ett svar"}',
  ARRAY['pirat','detektiv','saga','rymd','djungel','jul','födelsedag'],
  ARRAY['child','teen','adult','all'], 4, ARRAY[]::TEXT[], 'HYBRID', 5),

('FRAGA', 'VAL',
  '{"en":"Picture choice","sv":"Bildval"}',
  '{"en":"Point out or choose the correct image or alternative","sv":"Peka ut eller välj rätt bild/alternativ"}',
  ARRAY['djungel','saga','födelsedag','pirat'],
  ARRAY['toddler','child','all'], 4, ARRAY['bildkort'], 'FYSISK', 6),

('FRAGA', 'LASUPPDRAG',
  '{"en":"Reading mission","sv":"Läsuppdrag"}',
  '{"en":"Read a text or book passage and extract the answer","sv":"Läs ett textavsnitt och extrahera svaret"}',
  ARRAY['detektiv','saga','jul'],
  ARRAY['child','teen','adult'], 6, ARRAY['utskriven text'], 'FYSISK', 7),

('AKTIVITET', 'MINISPEL',
  '{"en":"Mini-game","sv":"Minispel"}',
  '{"en":"Physical activity – fishing pond, throwing game, etc.","sv":"Fysisk aktivitet – fiskedam, kastelek, etc."}',
  ARRAY['pirat','djungel','födelsedag','jul'],
  ARRAY['toddler','child','all'], 10, ARRAY['spelmaterial'], 'FYSISK', 8);

-- ─── Seed: Systemmallar ───────────────────────────────────────────────────────

INSERT INTO jakt_mallar (namn, beskrivning, steg_typer, passar_teman, rekommenderad_alder, rekommenderad_tid_minuter, is_system_mall) VALUES

('Klassisk äventyr',
 'En balanserad jakt med sökning, gåta och pussel.',
 ARRAY['INTRO','SOK','GATA','PUSSEL_FYSISKT','FINAL'],
 ARRAY['pirat','detektiv','saga','djungel'],
 ARRAY['child','teen','all'], 30, true),

('Liten jakt',
 'Kort och enkel – perfekt för de minsta eller när tiden är knapp.',
 ARRAY['INTRO','SOK','GATA','FINAL'],
 ARRAY['pirat','födelsedag','jul','saga'],
 ARRAY['toddler','child','all'], 15, true),

('Pusselmarathon',
 'Tre pussel i rad för de som älskar att lägga ihop saker.',
 ARRAY['INTRO','PUSSEL_FYSISKT','PUSSEL_FYSISKT','PUSSEL_FYSISKT','FINAL'],
 ARRAY['saga','djungel','pirat'],
 ARRAY['child','teen'], 35, true),

('Mycket aktiviteter',
 'Fullt av rörelseglädje – passar yngre barn och utomhusfester.',
 ARRAY['INTRO','MINISPEL','MINISPEL','SOK','MINISPEL','FINAL'],
 ARRAY['pirat','djungel','födelsedag'],
 ARRAY['toddler','child','all'], 40, true),

('Detektivjakt',
 'Läs, analysera och lista ut – för de lite äldre med analytisk hjärna.',
 ARRAY['INTRO','LASUPPDRAG','GATA','PUSSEL_LOGIK','VAL','SOK','FINAL'],
 ARRAY['detektiv','rymd','saga'],
 ARRAY['child','teen','adult'], 45, true);
