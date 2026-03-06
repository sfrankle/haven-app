-- label: parents
-- 'Body' is the universal symptom pool (not a selectable area in the UI)
WITH v(name) AS (VALUES
  ('Energy'), ('Head'), ('Arms'), ('Chest'), ('Gut'),
  ('Legs'), ('Whole body'), ('Body')
)
INSERT OR IGNORE INTO label (entry_type_id, name)
SELECT et.id, v.name FROM entry_type et, v WHERE et.name = 'Physical';

-- label: universal symptoms (children of 'Body')
WITH v(name) AS (VALUES
  ('Pain'), ('Stiff'), ('Numb'), ('Tingling'),
  ('Itchy'), ('Rash'), ('Swollen'), ('Warm'), ('Sore'),
  ('Weak'), ('Strong'), ('Fine')
)
INSERT OR IGNORE INTO label (entry_type_id, name, parent_id)
SELECT et.id, v.name, pl.id
FROM entry_type et
JOIN v ON 1=1
JOIN label pl ON pl.entry_type_id = et.id AND pl.name = 'Body'
WHERE et.name = 'Physical';

-- label: Physical area-specific symptoms
WITH v(parent, child) AS (VALUES
  -- Head
  ('Head',       'Headache'),
  ('Head',       'Migraine'),
  ('Head',       'Brain fog'),
  ('Head',       'Dizziness'),
  ('Head',       'Eye strain'),
  ('Head',       'Sinus pressure'),
  ('Head',       'Sore throat'),
  ('Head',       'Clear-headed'),
  ('Head',       'Sharp focus'), 
  ('Chest',      'Tight'),
  ('Chest',      'Palpitations'),
  ('Chest',      'Shortness of breath'),
  ('Chest',      'Open'),
  ('Chest',      'Calm'),
  ('Gut',        'Bloating'),
  ('Gut',        'Cramping'),
  ('Gut',        'Nausea'),
  ('Gut',        'Acid reflux'),
  ('Gut',        'Gas'),
  ('Gut',        'Constipation'),
  ('Gut',        'Diarrhea'),
  ('Gut',        'Comfortable'),
  ('Gut',        'Full'),
  ('Gut',        'Empty'),
  ('Legs',       'Heavy'),
  ('Legs',       'Restless'),
  ('Whole body', 'Achy'),
  ('Whole body', 'Tense'),
  ('Whole body', 'Relaxed'),
  ('Whole body', 'Inflamed'),
  ('Whole body', 'Shaky')
)
INSERT OR IGNORE INTO label (entry_type_id, name, parent_id)
SELECT et.id, v.child, pl.id
FROM entry_type et
JOIN v ON 1=1
JOIN label pl ON pl.entry_type_id = et.id AND pl.name = v.parent
WHERE et.name = 'Physical';
