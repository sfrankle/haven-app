-- Research-grounded activity taxonomy for Haven
-- Based on domains consistently correlate with happiness:
  -- Movement
  -- Connection
  -- Meaning / Purpose
  -- Creativity / Flow
  -- Reflection / Awareness
  -- Regulation / Calm
-- Core domains: Move, Connect, Create, Reflect, Breathe, Contribute
-- Supporting domains: Restore, Nourish, Structure

-- category
INSERT OR IGNORE INTO category (name) VALUES
  ('Move'),
  ('Connect'),
  ('Create'),
  ('Reflect'),
  ('Breathe'),
  ('Contribute'),
  ('Restore'),
  ('Nourish'),
  ('Structure');

-- tag
INSERT OR IGNORE INTO tag (name, tag_group, seed_version) VALUES
  ('cardio',        'activity_trait', 1),
  ('strength',      'activity_trait', 1),
  ('mobility',      'activity_trait', 1),
  ('flexibility',   'activity_trait', 1),
  ('mindfulness',   'activity_trait', 1),
  ('creative',      'activity_trait', 1),
  ('social',        'activity_trait', 1),
  ('outdoors',      'activity_trait', 1),
  ('focus',         'activity_trait', 1),
  ('productive',    'activity_trait', 1);

-- label: Activity
WITH v(cat, name, sort_order) AS (VALUES
  ('Move',       'Walk',                      10),
  ('Move',       'Run outside',                 20),
  ('Move',       'Treadmill run',              21),
  ('Move',       'Bike',                       30),
  ('Move',       'Yoga',                       40),
  ('Move',       'Stretching',                 50),
  ('Move',       'Pilates',                    60),
  ('Move',       'Padel',                      70),
  ('Move',       'Tennis',                     71),
  ('Move',       'Pickleball',                 72),
  ('Move',       'Gym workout',                80),
  ('Move',       'Fitness class',                90),
  ('Move',       'Dance',                     100),
  ('Move',       'Sport',                     110),
  ('Move',       'Hike',                      120),
  ('Move',       'Swim',                      130),

  ('Connect',    'Call a friend',              10),
  ('Connect',    'Meet friends',               20),
  ('Connect',    'Time with partner',          30),
  ('Connect',    'Time with family',           40),
  ('Connect',    'Social meal',                50),
  ('Connect',    'Community event',            60),
  ('Connect',    'Pet time',                   70),
  ('Connect',    'Meaningful conversation',    80),

  ('Create',     'Writing',                    10),
  ('Create',     'Drawing',                    30),
  ('Create',     'Painting',                   40),
  ('Create',     'Music',                      50),
  ('Create',     'Crafts',                     60),
  ('Create',     'Sewing',                     70),
  ('Create',     'Design',                     80),
  ('Create',     'Photography',               100),
  ('Create',     'DIY',                       110),
  ('Create',     'Bake for fun',              120),

  ('Reflect',    'Journaling',                 10),
  ('Reflect',    'Gratitude practice',         20),
  ('Reflect',    'Values check-in',            30),
  ('Reflect',    'Review goals',               40),
  ('Reflect',    'Planning',                   50),
  ('Reflect',    'Therapy',                    60),
  ('Reflect',    'Reflection writing',         70),
  ('Reflect',    'Read something meaningful',  80),

  ('Breathe',    'Meditation',                 10),
  ('Breathe',    'Breathwork',                 20),
  ('Breathe',    'Body scan',                  30),
  ('Breathe',    'Progressive relaxation',     40),
  ('Breathe',    'Guided visualization',       50),
  ('Breathe',    'Quiet sitting',              60),

  ('Contribute', 'Help someone',               10),
  ('Contribute', 'Support a friend',           20),
  ('Contribute', 'Act of kindness',            30),
  ('Contribute', 'Give a gift',                40),
  ('Contribute', 'Mentor',                     50),
  ('Contribute', 'Volunteer',                  60),

  ('Restore',    'Bath or shower',             10),
  ('Restore',    'Sauna',                      20),
  ('Restore',    'Cold exposure',              30),
  ('Restore',    'Nap',                        40),
  ('Restore',    'Lie down and rest',          50),
  ('Restore',    'Listen to music',            60),
  ('Restore',    'Read for pleasure',          70),
  ('Restore',    'Sit outside',                80),
  ('Restore',    'Time in nature',             90),
  ('Restore',    'Nature walk',               95),
  ('Restore',    'Gardening',                100),

  ('Nourish',    'Meal prep',                  10),
  ('Nourish',    'Mindful eating',             20),
  ('Nourish',    'Eat something nourishing',   40),
  ('Nourish',    'Cooking',                    50),

  ('Structure',  'Work block',                 10),
  ('Structure',  'Study',                      20),
  ('Structure',  'Adulting',                      30),
  ('Structure',  'Errands',                    40),
  ('Structure',  'Tidying',                    50),
  ('Structure',  'Cleaning',                   60),
  ('Structure',  'Organizing',                 70),
  ('Structure',  'Budgeting / finances',       80)
)
INSERT OR IGNORE INTO label (
  entry_type_id,
  name,
  category_id,
  is_default,
  is_enabled,
  sort_order,
  seed_version
)
SELECT
  et.id,
  v.name,
  c.id,
  1,
  1,
  v.sort_order,
  2
FROM v
JOIN category c ON c.name = v.cat
JOIN entry_type et ON et.name = 'Activity';


-- label_tag
INSERT OR IGNORE INTO label_tag (label_id, tag_id, seed_version)

-- cardio
SELECT l.id, t.id, 2
FROM label l
JOIN entry_type et ON l.entry_type_id = et.id
JOIN tag t ON t.name = 'cardio'
WHERE et.name = 'Activity'
AND l.name IN (
  'Walk',
  'Run outside',
  'Treadmill run',
  'Bike',
  'Swim',
  'Dance',
  'Sport',
  'Hike',
  'Padel',
  'Tennis',
  'Pickleball',
  'Fitness class',
  'Gym workout'
)

UNION ALL

-- strength
SELECT l.id, t.id, 2
FROM label l
JOIN entry_type et ON l.entry_type_id = et.id
JOIN tag t ON t.name = 'strength'
WHERE et.name = 'Activity'
AND l.name IN (
  'Gym workout',
  'Sport'
)

UNION ALL

-- mobility
SELECT l.id, t.id, 2
FROM label l
JOIN entry_type et ON l.entry_type_id = et.id
JOIN tag t ON t.name = 'mobility'
WHERE et.name = 'Activity'
AND l.name IN (
  'Stretching',
  'Yoga',
  'Pilates'
)

UNION ALL

-- flexibility
SELECT l.id, t.id, 2
FROM label l
JOIN entry_type et ON l.entry_type_id = et.id
JOIN tag t ON t.name = 'flexibility'
WHERE et.name = 'Activity'
AND l.name IN (
  'Yoga',
  'Stretching',
  'Pilates'
)

UNION ALL

-- mindfulness
SELECT l.id, t.id, 2
FROM label l
JOIN entry_type et ON l.entry_type_id = et.id
JOIN tag t ON t.name = 'mindfulness'
WHERE et.name = 'Activity'
AND l.name IN (
  'Meditation',
  'Breathwork',
  'Body scan',
  'Progressive relaxation',
  'Guided visualization',
  'Quiet sitting',
  'Journaling',
  'Gratitude practice',
  'Reflection writing',
  'Values check-in',
  'Therapy',
  'Read something meaningful',
  'Mindful eating'
)

UNION ALL

-- creative
SELECT l.id, t.id, 2
FROM label l
JOIN entry_type et ON l.entry_type_id = et.id
JOIN tag t ON t.name = 'creative'
WHERE et.name = 'Activity'
AND l.name IN (
  'Writing',
  'Drawing',
  'Painting',
  'Music',
  'Crafts',
  'Sewing',
  'Design',
  'Photography',
  'DIY',
  'Cooking',
  'Bake for fun'
)

UNION ALL

-- social
SELECT l.id, t.id, 2
FROM label l
JOIN entry_type et ON l.entry_type_id = et.id
JOIN tag t ON t.name = 'social'
WHERE et.name = 'Activity'
AND l.name IN (
  'Call a friend',
  'Meet friends',
  'Time with partner',
  'Time with family',
  'Social meal',
  'Community event',
  'Pet time',
  'Meaningful conversation',
  'Padel',
  'Tennis',
  'Pickleball',
  'Fitness class',
  'Volunteer',
  'Help someone',
  'Support a friend',
  'Act of kindness',
  'Give a gift',
  'Mentor'
)

UNION ALL

-- outdoors
SELECT l.id, t.id, 2
FROM label l
JOIN entry_type et ON l.entry_type_id = et.id
JOIN tag t ON t.name = 'outdoors'
WHERE et.name = 'Activity'
AND l.name IN (
  'Walk',
  'Run outside',
  'Bike',
  'Hike',
  'Sit outside',
  'Time in nature',
  'Nature walk',
  'Gardening'
)

UNION ALL

-- focus
SELECT l.id, t.id, 2
FROM label l
JOIN entry_type et ON l.entry_type_id = et.id
JOIN tag t ON t.name = 'focus'
WHERE et.name = 'Activity'
AND l.name IN (
  'Writing',
  'Journaling',
  'Design',
  'Sewing',
  'Crafts',
  'Drawing',
  'Painting',
  'Music',
  'Photography',
  'DIY',
  'Planning',
  'Review goals',
  'Study',
  'Read for pleasure',
  'Read something meaningful',
  'Meditation',
  'Breathwork',
  'Body scan',
  'Progressive relaxation',
  'Guided visualization'
)

UNION ALL

-- productive
SELECT l.id, t.id, 2
FROM label l
JOIN entry_type et ON l.entry_type_id = et.id
JOIN tag t ON t.name = 'productive'
WHERE et.name = 'Activity'
AND l.name IN (
  'Work block',
  'Adulting',
  'Errands',
  'Tidying',
  'Cleaning',
  'Organizing',
  'Budgeting / finances',
  'Meal prep',
  'Planning',
  'Review goals'
);