/**
 * Seed SQL strings for v1 vocabulary.
 *
 * Exported separately from seeds.ts so the seed-integrity test can execute
 * these strings directly with better-sqlite3 (Node-native) without requiring
 * the expo-sqlite native module — same pattern as MIGRATION_V1_SQL in migrations.ts.
 *
 * All inserts use INSERT OR IGNORE with name-based deduplication via UNIQUE
 * constraints on name columns. No explicit integer IDs are used; FK references
 * are resolved at insert time via subquery SELECTs by name.
 *
 * label inserts omit is_default, is_enabled, sort_order, and seed_version —
 * all covered by schema defaults (1, 1, 0, 1). Only entry_type_id, name, and
 * optionally parent_id or category_id are specified.
 */

export const SEED_V1_MEASUREMENT_TYPES = `
INSERT OR IGNORE INTO measurement_type (name, display_name) VALUES
  ('numeric', 'Numeric'),
  ('label_select', 'Label Select'),
  ('label_select_severity', 'Label Select with Severity');
`;

export const SEED_V1_CATEGORIES = `
INSERT OR IGNORE INTO category (name) VALUES
  ('Move'),
  ('Create'),
  ('Connect'),
  ('Ground'),
  ('Breathe'),
  ('Reflect'),
  ('Nourish'),
  ('Structure');
`;

export const SEED_V1_ENTRY_TYPES = `
INSERT OR IGNORE INTO entry_type (name, measurement_type_id, prompt, icon, is_enabled, is_default, sort_order)
SELECT 'Sleep', id, 'How many hours did you sleep?', 'moon', 1, 1, 1 FROM measurement_type WHERE name = 'numeric'
UNION ALL
SELECT 'Hydration', id, 'How much did you drink?', 'droplet', 1, 1, 2 FROM measurement_type WHERE name = 'numeric'
UNION ALL
SELECT 'Food', id, 'What did you eat?', 'utensils', 1, 1, 3 FROM measurement_type WHERE name = 'label_select'
UNION ALL
SELECT 'Emotion', id, 'How are you feeling?', 'heart', 1, 1, 4 FROM measurement_type WHERE name = 'label_select'
UNION ALL
SELECT 'Physical State', id, 'How does your body feel?', 'body', 1, 1, 5 FROM measurement_type WHERE name = 'label_select_severity'
UNION ALL
SELECT 'Energy', id, 'What is your energy level?', 'bolt', 1, 1, 6 FROM measurement_type WHERE name = 'numeric'
UNION ALL
SELECT 'Activity', id, 'What did you do?', 'activity', 1, 1, 7 FROM measurement_type WHERE name = 'label_select';
`;

export const SEED_V1_TAGS = `
INSERT OR IGNORE INTO tag (name, tag_group, seed_version) VALUES
  ('dairy',          'food_sensitivity', 1),
  ('gluten',         'food_sensitivity', 1),
  ('fodmap',         'food_sensitivity', 1),
  ('nightshade',     'food_sensitivity', 1),
  ('caffeine',       'food_sensitivity', 1),
  ('alcohol',        'food_sensitivity', 1),
  ('high_sugar',     'food_sensitivity', 1),
  ('high_fat',       'food_sensitivity', 1),
  ('tree_nuts',      'allergy',          1),
  ('peanuts',        'allergy',          1),
  ('nervous_system', 'emotion_system',   1),
  ('hormone',        'emotion_system',   1),
  ('cardiovascular', 'activity_type',    1),
  ('strength',       'activity_type',    1),
  ('flexibility',    'activity_type',    1),
  ('mindfulness',    'activity_type',    1),
  ('social',         'activity_type',    1),
  ('creative',       'activity_type',    1);
`;

/**
 * Food labels — flat, no parent, no category.
 */
export const SEED_V1_LABELS_FOOD = `
WITH v(name) AS (VALUES
  ('Rice, White'),
  ('Rice, Brown'),
  ('Oats'),
  ('Bread'),
  ('Pasta'),
  ('Corn tortilla'),
  ('Cheese'),
  ('Milk'),
  ('Milk, Almond'),
  ('Milk, Oat'),
  ('Yogurt'),
  ('Butter'),
  ('Cream'),
  ('Ice cream'),
  ('Chicken'),
  ('Beef'),
  ('Pork'),
  ('Fish'),
  ('Eggs'),
  ('Tofu'),
  ('Beans'),
  ('Lentils'),
  ('Broccoli'),
  ('Spinach'),
  ('Kale'),
  ('Onion'),
  ('Garlic'),
  ('Tomato'),
  ('Pepper'),
  ('Carrot'),
  ('Cucumber'),
  ('Zucchini'),
  ('Potato'),
  ('Sweet potato'),
  ('Mushroom'),
  ('Apple'),
  ('Banana'),
  ('Berries'),
  ('Orange'),
  ('Avocado'),
  ('Grapes'),
  ('Olive oil'),
  ('Seeds'),
  ('Almonds'),
  ('Cashews'),
  ('Hazelnuts'),
  ('Macadamia'),
  ('Peanuts'),
  ('Pecans'),
  ('Pistachios'),
  ('Walnuts'),
  ('Chocolate, Dark'),
  ('Coffee'),
  ('Tea'),
  ('Alcohol'),
  ('Chips, Potato'),
  ('Chips, Corn'),
  ('Crackers')
)
INSERT OR IGNORE INTO label (entry_type_id, name)
SELECT et.id, v.name FROM entry_type et, v WHERE et.name = 'Food';
`;

/**
 * Emotion Layer 1 — arousal/valence buckets (saveable on their own).
 */
export const SEED_V1_LABELS_EMOTION_L1 = `
WITH v(name) AS (VALUES ('Bright'), ('Warm'), ('Still'), ('Heavy'), ('Charged'))
INSERT OR IGNORE INTO label (entry_type_id, name)
SELECT et.id, v.name FROM entry_type et, v WHERE et.name = 'Emotion';
`;

/**
 * Emotion Layer 2 — mid-level clusters, each parented to an L1 bucket.
 * Must be inserted after L1.
 */
export const SEED_V1_LABELS_EMOTION_L2 = `
WITH v(parent, child) AS (VALUES
  ('Bright',  'Joyful'),
  ('Bright',  'Excited'),
  ('Bright',  'Empowered'),
  ('Bright',  'Inspired'),
  ('Warm',    'Grateful'),
  ('Warm',    'Connected'),
  ('Warm',    'Tender'),
  ('Warm',    'Hopeful'),
  ('Warm',    'Calm'),
  ('Still',   'Curious'),
  ('Still',   'Present'),
  ('Still',   'Flat'),
  ('Heavy',   'Melancholy'),
  ('Heavy',   'Grief'),
  ('Heavy',   'Longing'),
  ('Heavy',   'Numb'),
  ('Heavy',   'Disenchanted'),
  ('Heavy',   'Ashamed'),
  ('Heavy',   'Burned out'),
  ('Charged', 'Anxious'),
  ('Charged', 'Dread'),
  ('Charged', 'Overwhelmed'),
  ('Charged', 'Panicked'),
  ('Charged', 'Disgusted'),
  ('Charged', 'Angry')
)
INSERT OR IGNORE INTO label (entry_type_id, name, parent_id)
SELECT et.id, v.child, pl.id
FROM entry_type et
JOIN v ON 1=1
JOIN label pl ON pl.entry_type_id = et.id AND pl.name = v.parent
WHERE et.name = 'Emotion';
`;

/**
 * Emotion Layer 3 — specific emotions, each parented to an L2 cluster.
 * Must be inserted after L2.
 */
export const SEED_V1_LABELS_EMOTION_L3 = `
WITH v(parent, child) AS (VALUES
  ('Joyful',        'Happy'),
  ('Joyful',        'Delighted'),
  ('Joyful',        'Playful'),
  ('Joyful',        'Giddy'),
  ('Excited',       'Enthusiastic'),
  ('Excited',       'Eager'),
  ('Excited',       'Elated'),
  ('Excited',       'Exhilarated'),
  ('Empowered',     'Confident'),
  ('Empowered',     'Capable'),
  ('Empowered',     'Courageous'),
  ('Empowered',     'Accomplished'),
  ('Empowered',     'Proud'),
  ('Inspired',      'Motivated'),
  ('Inspired',      'Energised'),
  ('Grateful',      'Thankful'),
  ('Grateful',      'Appreciative'),
  ('Grateful',      'Moved'),
  ('Grateful',      'Touched'),
  ('Connected',     'Loved'),
  ('Connected',     'Accepted'),
  ('Connected',     'Valued'),
  ('Connected',     'Safe'),
  ('Connected',     'Cherished'),
  ('Tender',        'Compassionate'),
  ('Tender',        'Affectionate'),
  ('Tender',        'Gentle'),
  ('Hopeful',       'Optimistic'),
  ('Hopeful',       'Encouraged'),
  ('Hopeful',       'Reassured'),
  ('Calm',          'Peaceful'),
  ('Calm',          'Relieved'),
  ('Calm',          'Content'),
  ('Calm',          'Settled'),
  ('Calm',          'At-ease'),
  ('Calm',          'Comfortable'),
  ('Curious',       'Interested'),
  ('Curious',       'Inquisitive'),
  ('Curious',       'Wondering'),
  ('Present',       'Attentive'),
  ('Present',       'Aware'),
  ('Present',       'Centered'),
  ('Present',       'Absorbed'),
  ('Flat',          'Bored'),
  ('Flat',          'Indifferent'),
  ('Flat',          'Meh'),
  ('Flat',          'Disengaged'),
  ('Melancholy',    'Sad'),
  ('Melancholy',    'Hurt'),
  ('Melancholy',    'Blue'),
  ('Melancholy',    'Sorrowful'),
  ('Melancholy',    'Dejected'),
  ('Melancholy',    'Disappointed'),
  ('Grief',         'Heartbroken'),
  ('Grief',         'Devastated'),
  ('Grief',         'Bereft'),
  ('Grief',         'Bereaved'),
  ('Grief',         'Mourning'),
  ('Longing',       'Isolated'),
  ('Longing',       'Disconnected'),
  ('Longing',       'Wistful'),
  ('Longing',       'Nostalgic'),
  ('Longing',       'Lonely'),
  ('Numb',          'Empty'),
  ('Numb',          'Withdrawn'),
  ('Numb',          'Detached'),
  ('Numb',          'Checked-out'),
  ('Disenchanted',  'Ennui'),
  ('Disenchanted',  'Listless'),
  ('Disenchanted',  'Apathetic'),
  ('Disenchanted',  'World-weary'),
  ('Disenchanted',  'Restless'),
  ('Ashamed',       'Guilty'),
  ('Ashamed',       'Embarrassed'),
  ('Ashamed',       'Remorseful'),
  ('Burned out',    'Drained'),
  ('Burned out',    'Depleted'),
  ('Burned out',    'Exhausted'),
  ('Burned out',    'Resigned'),
  ('Anxious',       'Insecure'),
  ('Anxious',       'Worried'),
  ('Anxious',       'Nervous'),
  ('Anxious',       'Jittery'),
  ('Anxious',       'On edge'),
  ('Dread',         'Foreboding'),
  ('Dread',         'Apprehensive'),
  ('Dread',         'Bracing'),
  ('Dread',         'Uneasy'),
  ('Overwhelmed',   'Stressed'),
  ('Overwhelmed',   'Pressured'),
  ('Overwhelmed',   'Scattered'),
  ('Overwhelmed',   'Flooded'),
  ('Overwhelmed',   'Frozen'),
  ('Overwhelmed',   'Helpless'),
  ('Angry',         'Frustrated'),
  ('Angry',         'Irritated'),
  ('Angry',         'Resentful'),
  ('Angry',         'Bitter'),
  ('Angry',         'Mad'),
  ('Panicked',      'Terrified'),
  ('Panicked',      'Out of control'),
  ('Panicked',      'Alarmed'),
  ('Disgusted',     'Repulsed'),
  ('Disgusted',     'Appalled'),
  ('Disgusted',     'Revolted')
)
INSERT OR IGNORE INTO label (entry_type_id, name, parent_id)
SELECT et.id, v.child, pl.id
FROM entry_type et
JOIN v ON 1=1
JOIN label pl ON pl.entry_type_id = et.id AND pl.name = v.parent
WHERE et.name = 'Emotion';
`;

/**
 * Physical State parent labels (body areas) — must be inserted before children.
 */
export const SEED_V1_LABELS_PHYSICAL_PARENTS = `
WITH v(name) AS (VALUES
  ('Head'), ('Gut'), ('Chest'), ('Joints'),
  ('Skin'), ('Whole body')
)
INSERT OR IGNORE INTO label (entry_type_id, name)
SELECT et.id, v.name FROM entry_type et, v WHERE et.name = 'Physical State';
`;

/**
 * Physical State child labels — requires parents to exist first.
 */
export const SEED_V1_LABELS_PHYSICAL_CHILDREN = `
WITH v(parent, child) AS (VALUES
  ('Head',          'Headache'),
  ('Head',          'Migraine'),
  ('Head',          'Brain fog'),
  ('Head',          'Clear-headed'),
  ('Head',          'Sharp focus'),
  ('Head',          'Sinus pressure'),
  ('Head',          'Eye strain'),
  ('Head',          'Dizziness'),
  ('Gut',           'Bloating'),
  ('Gut',           'Cramping'),
  ('Gut',           'Nausea'),
  ('Gut',           'Acid reflux'),
  ('Gut',           'Constipation'),
  ('Gut',           'Diarrhea'),
  ('Gut',           'Gas'),
  ('Gut',           'Comfortable'),
  ('Gut',           'Full'),
  ('Gut',           'Empty'),
  ('Chest',         'Tight'),
  ('Chest',         'Open'),
  ('Chest',         'Palpitations'),
  ('Chest',         'Shortness of breath'),
  ('Chest',         'Calm'),
  ('Chest',         'Chest pain'),
  ('Joints',        'Stiff'),
  ('Joints',        'Sore'),
  ('Joints',        'Pain'),
  ('Joints',        'Swollen'),
  ('Joints',        'Flexible'),
  ('Joints',        'Warm'),
  ('Skin',          'Itchy'),
  ('Skin',          'Rash'),
  ('Skin',          'Dry'),
  ('Skin',          'Clear'),
  ('Skin',          'Flushed'),
  ('Skin',          'Hives'),
  ('Whole body',    'Achy'),
  ('Whole body',    'Tense'),
  ('Whole body',    'Relaxed'),
  ('Whole body',    'Inflamed'),
  ('Whole body',    'Strong'),
  ('Whole body',    'Weak'),
  ('Whole body',    'Shaky')
)
INSERT OR IGNORE INTO label (entry_type_id, name, parent_id)
SELECT et.id, v.child, pl.id
FROM entry_type et
JOIN v ON 1=1
JOIN label pl ON pl.entry_type_id = et.id AND pl.name = v.parent
WHERE et.name = 'Physical State';
`;

/**
 * Activity labels — flat, with category resolved by name.
 */
export const SEED_V1_LABELS_ACTIVITY = `
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
`;

/**
 * label_tag associations — all FK references resolved by name via joins.
 */
export const SEED_V1_LABEL_TAGS = `
INSERT OR IGNORE INTO label_tag (label_id, tag_id, seed_version)
-- Food: dairy
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'dairy' WHERE et.name = 'Food' AND l.name = 'Cheese'
UNION ALL
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'dairy' WHERE et.name = 'Food' AND l.name = 'Milk'
UNION ALL
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'dairy' WHERE et.name = 'Food' AND l.name = 'Yogurt'
UNION ALL
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'dairy' WHERE et.name = 'Food' AND l.name = 'Butter'
UNION ALL
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'dairy' WHERE et.name = 'Food' AND l.name = 'Cream'
UNION ALL
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'dairy' WHERE et.name = 'Food' AND l.name = 'Ice cream'
UNION ALL
-- Ice cream: also high_fat, high_sugar
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'high_fat' WHERE et.name = 'Food' AND l.name = 'Ice cream'
UNION ALL
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'high_sugar' WHERE et.name = 'Food' AND l.name = 'Ice cream'
UNION ALL
-- Food: gluten
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'gluten' WHERE et.name = 'Food' AND l.name = 'Bread'
UNION ALL
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'gluten' WHERE et.name = 'Food' AND l.name = 'Pasta'
UNION ALL
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'gluten' WHERE et.name = 'Food' AND l.name = 'Crackers'
UNION ALL
-- Food: fodmap
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'fodmap' WHERE et.name = 'Food' AND l.name = 'Onion'
UNION ALL
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'fodmap' WHERE et.name = 'Food' AND l.name = 'Garlic'
UNION ALL
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'fodmap' WHERE et.name = 'Food' AND l.name = 'Beans'
UNION ALL
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'fodmap' WHERE et.name = 'Food' AND l.name = 'Lentils'
UNION ALL
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'fodmap' WHERE et.name = 'Food' AND l.name = 'Grapes'
UNION ALL
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'fodmap' WHERE et.name = 'Food' AND l.name = 'Apple'
UNION ALL
-- Grapes also high_sugar
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'high_sugar' WHERE et.name = 'Food' AND l.name = 'Grapes'
UNION ALL
-- Food: nightshade
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'nightshade' WHERE et.name = 'Food' AND l.name = 'Tomato'
UNION ALL
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'nightshade' WHERE et.name = 'Food' AND l.name = 'Pepper'
UNION ALL
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'nightshade' WHERE et.name = 'Food' AND l.name = 'Potato'
UNION ALL
-- Food: caffeine
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'caffeine' WHERE et.name = 'Food' AND l.name = 'Coffee'
UNION ALL
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'caffeine' WHERE et.name = 'Food' AND l.name = 'Tea'
UNION ALL
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'caffeine' WHERE et.name = 'Food' AND l.name = 'Chocolate, Dark'
UNION ALL
-- Food: alcohol
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'alcohol' WHERE et.name = 'Food' AND l.name = 'Alcohol'
UNION ALL
-- Food: high_fat chips
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'high_fat' WHERE et.name = 'Food' AND l.name = 'Chips, Potato'
UNION ALL
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'high_fat' WHERE et.name = 'Food' AND l.name = 'Chips, Corn'
UNION ALL
-- Food: tree_nuts (all except peanuts)
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'tree_nuts' WHERE et.name = 'Food' AND l.name IN ('Almonds', 'Cashews', 'Hazelnuts', 'Macadamia', 'Pecans', 'Pistachios', 'Walnuts')
UNION ALL
-- Food: peanuts (separate allergen)
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'peanuts' WHERE et.name = 'Food' AND l.name = 'Peanuts'
UNION ALL
-- Activity: cardiovascular
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'cardiovascular' WHERE et.name = 'Activity' AND l.name IN ('Walk','Run','Cycle','Swim','HIIT','Dancing','Hiking','Climbing')
UNION ALL
-- Activity: strength
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'strength' WHERE et.name = 'Activity' AND l.name IN ('Weight training','HIIT','Climbing')
UNION ALL
-- Activity: flexibility
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'flexibility' WHERE et.name = 'Activity' AND l.name IN ('Yoga','Stretching','Pilates')
UNION ALL
-- Activity: mindfulness — Breathe category
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'mindfulness' JOIN category c ON l.category_id = c.id WHERE et.name = 'Activity' AND c.name = 'Breathe'
UNION ALL
-- Activity: mindfulness — Reflect category
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'mindfulness' JOIN category c ON l.category_id = c.id WHERE et.name = 'Activity' AND c.name = 'Reflect'
UNION ALL
-- Activity: social — Connect category
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'social' JOIN category c ON l.category_id = c.id WHERE et.name = 'Activity' AND c.name = 'Connect'
UNION ALL
-- Activity: creative — Create category
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'creative' JOIN category c ON l.category_id = c.id WHERE et.name = 'Activity' AND c.name = 'Create';
`;
