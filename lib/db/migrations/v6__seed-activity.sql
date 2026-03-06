-- category
INSERT OR IGNORE INTO category (name) VALUES
  ('Move'),
  ('Create'),
  ('Connect'),
  ('Ground'),
  ('Breathe'),
  ('Reflect'),
  ('Nourish'),
  ('Structure');

-- tag
INSERT OR IGNORE INTO tag (name, tag_group, seed_version) VALUES
  ('cardiovascular',       'activity_type',    1),
  ('strength',             'activity_type',    1),
  ('flexibility',          'activity_type',    1),
  ('mindfulness',          'activity_type',    1),
  ('social',               'activity_type',    1),
  ('creative',             'activity_type',    1);

-- label: Activity
WITH v(cat, name) AS (VALUES
  ('Move',      'Walk'),
  ('Move',      'Run'),
  ('Move',      'Cycle'),
  ('Move',      'Swim'),
  ('Move',      'Yoga'),
  ('Move',      'Stretching'),
  ('Move',      'Weight training'),
  ('Move',      'HIIT'),
  ('Move',      'Dancing'),
  ('Move',      'Hiking'),
  ('Move',      'Climbing'),
  ('Move',      'Pilates'),
  ('Create',    'Drawing'),
  ('Create',    'Painting'),
  ('Create',    'Writing'),
  ('Create',    'Journaling'),
  ('Create',    'Photography'),
  ('Create',    'Music'),
  ('Create',    'Crafts'),
  ('Create',    'Cooking'),
  ('Create',    'Gardening'),
  ('Connect',   'Call a friend'),
  ('Connect',   'Spend time with family'),
  ('Connect',   'Social meal'),
  ('Connect',   'Date'),
  ('Connect',   'Group activity'),
  ('Connect',   'Community event'),
  ('Connect',   'Pet time'),
  ('Ground',    'Nature walk'),
  ('Ground',    'Barefoot outside'),
  ('Ground',    'Quiet time'),
  ('Ground',    'Reading'),
  ('Ground',    'Bath or shower'),
  ('Ground',    'Tidying'),
  ('Breathe',   'Meditation'),
  ('Breathe',   'Breathwork'),
  ('Breathe',   'Body scan'),
  ('Breathe',   'Progressive relaxation'),
  ('Breathe',   'Guided visualization'),
  ('Reflect',   'Gratitude list'),
  ('Reflect',   'Review goals'),
  ('Reflect',   'Planning'),
  ('Reflect',   'Self-check-in'),
  ('Nourish',   'Meal prep'),
  ('Nourish',   'Mindful eating'),
  ('Nourish',   'Hydration focus'),
  ('Nourish',   'Rest'),
  ('Structure', 'Work block'),
  ('Structure', 'Study'),
  ('Structure', 'Errand batch')
)
INSERT OR IGNORE INTO label (entry_type_id, name, category_id)
SELECT et.id, v.name, c.id
FROM entry_type et
JOIN v ON 1=1
JOIN category c ON c.name = v.cat
WHERE et.name = 'Activity';

-- label_tag: Activity
INSERT OR IGNORE INTO label_tag (label_id, tag_id, seed_version)
-- cardiovascular
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'cardiovascular' WHERE et.name = 'Activity' AND l.name IN ('Walk','Run','Cycle','Swim','HIIT','Dancing','Hiking','Climbing')
UNION ALL
-- strength
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'strength' WHERE et.name = 'Activity' AND l.name IN ('Weight training','HIIT','Climbing')
UNION ALL
-- flexibility
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'flexibility' WHERE et.name = 'Activity' AND l.name IN ('Yoga','Stretching','Pilates')
UNION ALL
-- mindfulness — Breathe + Reflect categories
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'mindfulness' JOIN category c ON l.category_id = c.id WHERE et.name = 'Activity' AND c.name IN ('Breathe', 'Reflect')
UNION ALL
-- social — Connect category
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'social' JOIN category c ON l.category_id = c.id WHERE et.name = 'Activity' AND c.name = 'Connect'
UNION ALL
-- creative — Create category
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'creative' JOIN category c ON l.category_id = c.id WHERE et.name = 'Activity' AND c.name = 'Create';
