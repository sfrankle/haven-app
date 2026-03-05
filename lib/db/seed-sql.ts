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
SELECT 'Energy Level', id, 'What is your energy level?', 'bolt', 1, 1, 6 FROM measurement_type WHERE name = 'numeric'
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
INSERT OR IGNORE INTO label (entry_type_id, name, parent_id, category_id, is_default, is_enabled, sort_order, seed_version)
SELECT id, 'White rice',    NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Brown rice',    NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Oats',          NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Bread (wheat)', NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Pasta',         NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Sourdough',     NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Corn tortilla', NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Cheese',        NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Milk',          NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Yogurt',        NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Butter',        NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Cream',         NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Ice cream',     NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Chicken',       NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Beef',          NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Pork',          NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Fish',          NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Eggs',          NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Tofu',          NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Beans',         NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Lentils',       NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Broccoli',      NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Spinach',       NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Kale',          NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Onion',         NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Garlic',        NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Tomato',        NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Pepper',        NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Carrot',        NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Cucumber',      NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Zucchini',      NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Potato',        NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Sweet potato',  NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Mushroom',      NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Apple',         NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Banana',        NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Berries',       NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Orange',        NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Avocado',       NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Grapes',        NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Olive oil',     NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Nuts',          NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Seeds',         NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Dark chocolate',NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Coffee',        NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Tea',           NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Alcohol',       NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Bread (white)', NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Chips',         NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food'
UNION ALL
SELECT id, 'Crackers',      NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Food';
`;

/**
 * Emotion parent labels (valence groups) — must be inserted before children.
 */
export const SEED_V1_LABELS_EMOTION_PARENTS = `
INSERT OR IGNORE INTO label (entry_type_id, name, parent_id, category_id, is_default, is_enabled, sort_order, seed_version)
SELECT id, 'Pleasant',   NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Emotion'
UNION ALL
SELECT id, 'Neutral',    NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Emotion'
UNION ALL
SELECT id, 'Unpleasant', NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Emotion';
`;

/**
 * Emotion child labels — requires parents to exist first.
 */
export const SEED_V1_LABELS_EMOTION_CHILDREN = `
INSERT OR IGNORE INTO label (entry_type_id, name, parent_id, category_id, is_default, is_enabled, sort_order, seed_version)
SELECT et.id, 'Happy',        pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Emotion' AND pl.name = 'Pleasant'
UNION ALL
SELECT et.id, 'Calm',         pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Emotion' AND pl.name = 'Pleasant'
UNION ALL
SELECT et.id, 'Grateful',     pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Emotion' AND pl.name = 'Pleasant'
UNION ALL
SELECT et.id, 'Energized',    pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Emotion' AND pl.name = 'Pleasant'
UNION ALL
SELECT et.id, 'Hopeful',      pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Emotion' AND pl.name = 'Pleasant'
UNION ALL
SELECT et.id, 'Loved',        pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Emotion' AND pl.name = 'Pleasant'
UNION ALL
SELECT et.id, 'Proud',        pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Emotion' AND pl.name = 'Pleasant'
UNION ALL
SELECT et.id, 'Content',      pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Emotion' AND pl.name = 'Pleasant'
UNION ALL
SELECT et.id, 'Excited',      pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Emotion' AND pl.name = 'Pleasant'
UNION ALL
SELECT et.id, 'Playful',      pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Emotion' AND pl.name = 'Pleasant'
UNION ALL
SELECT et.id, 'Unsure',       pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Emotion' AND pl.name = 'Neutral'
UNION ALL
SELECT et.id, 'Numb',         pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Emotion' AND pl.name = 'Neutral'
UNION ALL
SELECT et.id, 'Indifferent',  pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Emotion' AND pl.name = 'Neutral'
UNION ALL
SELECT et.id, 'Contemplative',pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Emotion' AND pl.name = 'Neutral'
UNION ALL
SELECT et.id, 'Tired',        pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Emotion' AND pl.name = 'Neutral'
UNION ALL
SELECT et.id, 'Bored',        pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Emotion' AND pl.name = 'Neutral'
UNION ALL
SELECT et.id, 'Anxious',      pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Emotion' AND pl.name = 'Unpleasant'
UNION ALL
SELECT et.id, 'Sad',          pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Emotion' AND pl.name = 'Unpleasant'
UNION ALL
SELECT et.id, 'Angry',        pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Emotion' AND pl.name = 'Unpleasant'
UNION ALL
SELECT et.id, 'Frustrated',   pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Emotion' AND pl.name = 'Unpleasant'
UNION ALL
SELECT et.id, 'Overwhelmed',  pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Emotion' AND pl.name = 'Unpleasant'
UNION ALL
SELECT et.id, 'Irritable',    pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Emotion' AND pl.name = 'Unpleasant'
UNION ALL
SELECT et.id, 'Lonely',       pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Emotion' AND pl.name = 'Unpleasant'
UNION ALL
SELECT et.id, 'Guilty',       pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Emotion' AND pl.name = 'Unpleasant'
UNION ALL
SELECT et.id, 'Ashamed',      pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Emotion' AND pl.name = 'Unpleasant'
UNION ALL
SELECT et.id, 'Disappointed', pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Emotion' AND pl.name = 'Unpleasant'
UNION ALL
SELECT et.id, 'Scared',       pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Emotion' AND pl.name = 'Unpleasant'
UNION ALL
SELECT et.id, 'Hopeless',     pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Emotion' AND pl.name = 'Unpleasant';
`;

/**
 * Physical State parent labels (body areas) — must be inserted before children.
 */
export const SEED_V1_LABELS_PHYSICAL_PARENTS = `
INSERT OR IGNORE INTO label (entry_type_id, name, parent_id, category_id, is_default, is_enabled, sort_order, seed_version)
SELECT id, 'Head',          NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Physical State'
UNION ALL
SELECT id, 'Gut',           NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Physical State'
UNION ALL
SELECT id, 'Chest',         NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Physical State'
UNION ALL
SELECT id, 'Joints',        NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Physical State'
UNION ALL
SELECT id, 'Skin',          NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Physical State'
UNION ALL
SELECT id, 'Energy',        NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Physical State'
UNION ALL
SELECT id, 'Sleep quality', NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Physical State'
UNION ALL
SELECT id, 'Whole body',    NULL, NULL, 1, 1, 0, 1 FROM entry_type WHERE name = 'Physical State';
`;

/**
 * Physical State child labels — requires parents to exist first.
 */
export const SEED_V1_LABELS_PHYSICAL_CHILDREN = `
INSERT OR IGNORE INTO label (entry_type_id, name, parent_id, category_id, is_default, is_enabled, sort_order, seed_version)
SELECT et.id, 'Headache',            pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Head'
UNION ALL
SELECT et.id, 'Migraine',            pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Head'
UNION ALL
SELECT et.id, 'Brain fog',           pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Head'
UNION ALL
SELECT et.id, 'Clear-headed',        pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Head'
UNION ALL
SELECT et.id, 'Sharp focus',         pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Head'
UNION ALL
SELECT et.id, 'Sinus pressure',      pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Head'
UNION ALL
SELECT et.id, 'Eye strain',          pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Head'
UNION ALL
SELECT et.id, 'Dizziness',           pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Head'
UNION ALL
SELECT et.id, 'Bloating',            pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Gut'
UNION ALL
SELECT et.id, 'Cramping',            pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Gut'
UNION ALL
SELECT et.id, 'Nausea',              pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Gut'
UNION ALL
SELECT et.id, 'Acid reflux',         pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Gut'
UNION ALL
SELECT et.id, 'Constipation',        pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Gut'
UNION ALL
SELECT et.id, 'Diarrhea',            pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Gut'
UNION ALL
SELECT et.id, 'Gas',                 pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Gut'
UNION ALL
SELECT et.id, 'Comfortable',         pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Gut'
UNION ALL
SELECT et.id, 'Full',                pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Gut'
UNION ALL
SELECT et.id, 'Empty',               pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Gut'
UNION ALL
SELECT et.id, 'Tight',               pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Chest'
UNION ALL
SELECT et.id, 'Open',                pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Chest'
UNION ALL
SELECT et.id, 'Palpitations',        pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Chest'
UNION ALL
SELECT et.id, 'Shortness of breath', pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Chest'
UNION ALL
SELECT et.id, 'Calm',                pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Chest'
UNION ALL
SELECT et.id, 'Chest pain',          pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Chest'
UNION ALL
SELECT et.id, 'Stiff',               pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Joints'
UNION ALL
SELECT et.id, 'Sore',                pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Joints'
UNION ALL
SELECT et.id, 'Pain',                pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Joints'
UNION ALL
SELECT et.id, 'Swollen',             pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Joints'
UNION ALL
SELECT et.id, 'Flexible',            pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Joints'
UNION ALL
SELECT et.id, 'Warm',                pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Joints'
UNION ALL
SELECT et.id, 'Itchy',               pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Skin'
UNION ALL
SELECT et.id, 'Rash',                pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Skin'
UNION ALL
SELECT et.id, 'Dry',                 pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Skin'
UNION ALL
SELECT et.id, 'Clear',               pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Skin'
UNION ALL
SELECT et.id, 'Flushed',             pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Skin'
UNION ALL
SELECT et.id, 'Hives',               pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Skin'
UNION ALL
SELECT et.id, 'Fatigue',             pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Energy'
UNION ALL
SELECT et.id, 'Exhausted',           pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Energy'
UNION ALL
SELECT et.id, 'Alert',               pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Energy'
UNION ALL
SELECT et.id, 'Rested',              pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Energy'
UNION ALL
SELECT et.id, 'Wired',               pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Energy'
UNION ALL
SELECT et.id, 'Sluggish',            pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Energy'
UNION ALL
SELECT et.id, 'Restless',            pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Sleep quality'
UNION ALL
SELECT et.id, 'Interrupted',         pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Sleep quality'
UNION ALL
SELECT et.id, 'Deep',                pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Sleep quality'
UNION ALL
SELECT et.id, 'Light',               pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Sleep quality'
UNION ALL
SELECT et.id, 'Nightmares',          pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Sleep quality'
UNION ALL
SELECT et.id, 'Well-rested',         pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Sleep quality'
UNION ALL
SELECT et.id, 'Achy',                pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Whole body'
UNION ALL
SELECT et.id, 'Tense',               pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Whole body'
UNION ALL
SELECT et.id, 'Relaxed',             pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Whole body'
UNION ALL
SELECT et.id, 'Inflamed',            pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Whole body'
UNION ALL
SELECT et.id, 'Strong',              pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Whole body'
UNION ALL
SELECT et.id, 'Weak',                pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Whole body'
UNION ALL
SELECT et.id, 'Shaky',               pl.id, NULL, 1, 1, 0, 1 FROM entry_type et JOIN label pl ON pl.entry_type_id = et.id WHERE et.name = 'Physical State' AND pl.name = 'Whole body';
`;

/**
 * Activity labels — flat, with category_id resolved by name.
 */
export const SEED_V1_LABELS_ACTIVITY = `
INSERT OR IGNORE INTO label (entry_type_id, name, parent_id, category_id, is_default, is_enabled, sort_order, seed_version)
SELECT et.id, 'Walk',                     NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Move'
UNION ALL
SELECT et.id, 'Run',                      NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Move'
UNION ALL
SELECT et.id, 'Cycle',                    NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Move'
UNION ALL
SELECT et.id, 'Swim',                     NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Move'
UNION ALL
SELECT et.id, 'Yoga',                     NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Move'
UNION ALL
SELECT et.id, 'Stretching',               NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Move'
UNION ALL
SELECT et.id, 'Weight training',          NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Move'
UNION ALL
SELECT et.id, 'HIIT',                     NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Move'
UNION ALL
SELECT et.id, 'Dancing',                  NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Move'
UNION ALL
SELECT et.id, 'Hiking',                   NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Move'
UNION ALL
SELECT et.id, 'Climbing',                 NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Move'
UNION ALL
SELECT et.id, 'Pilates',                  NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Move'
UNION ALL
SELECT et.id, 'Drawing',                  NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Create'
UNION ALL
SELECT et.id, 'Painting',                 NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Create'
UNION ALL
SELECT et.id, 'Writing',                  NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Create'
UNION ALL
SELECT et.id, 'Journaling',               NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Create'
UNION ALL
SELECT et.id, 'Photography',              NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Create'
UNION ALL
SELECT et.id, 'Music',                    NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Create'
UNION ALL
SELECT et.id, 'Crafts',                   NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Create'
UNION ALL
SELECT et.id, 'Cooking',                  NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Create'
UNION ALL
SELECT et.id, 'Gardening',                NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Create'
UNION ALL
SELECT et.id, 'Call a friend',            NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Connect'
UNION ALL
SELECT et.id, 'Spend time with family',   NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Connect'
UNION ALL
SELECT et.id, 'Social meal',              NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Connect'
UNION ALL
SELECT et.id, 'Date',                     NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Connect'
UNION ALL
SELECT et.id, 'Group activity',           NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Connect'
UNION ALL
SELECT et.id, 'Community event',          NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Connect'
UNION ALL
SELECT et.id, 'Nature walk',              NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Ground'
UNION ALL
SELECT et.id, 'Barefoot outside',         NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Ground'
UNION ALL
SELECT et.id, 'Quiet time',               NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Ground'
UNION ALL
SELECT et.id, 'Reading',                  NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Ground'
UNION ALL
SELECT et.id, 'Bath or shower',           NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Ground'
UNION ALL
SELECT et.id, 'Tidying',                  NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Ground'
UNION ALL
SELECT et.id, 'Meditation',               NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Breathe'
UNION ALL
SELECT et.id, 'Breathwork',               NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Breathe'
UNION ALL
SELECT et.id, 'Body scan',                NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Breathe'
UNION ALL
SELECT et.id, 'Progressive relaxation',   NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Breathe'
UNION ALL
SELECT et.id, 'Guided visualization',     NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Breathe'
UNION ALL
SELECT et.id, 'Gratitude list',           NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Reflect'
UNION ALL
SELECT et.id, 'Review goals',             NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Reflect'
UNION ALL
SELECT et.id, 'Planning',                 NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Reflect'
UNION ALL
SELECT et.id, 'Self-check-in',            NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Reflect'
UNION ALL
SELECT et.id, 'Meal prep',                NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Nourish'
UNION ALL
SELECT et.id, 'Mindful eating',           NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Nourish'
UNION ALL
SELECT et.id, 'Hydration focus',          NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Nourish'
UNION ALL
SELECT et.id, 'Rest',                     NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Nourish'
UNION ALL
SELECT et.id, 'Morning routine',          NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Structure'
UNION ALL
SELECT et.id, 'Evening routine',          NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Structure'
UNION ALL
SELECT et.id, 'Work block',               NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Structure'
UNION ALL
SELECT et.id, 'Study',                    NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Structure'
UNION ALL
SELECT et.id, 'Errand batch',             NULL, c.id, 1, 1, 0, 1 FROM entry_type et, category c WHERE et.name = 'Activity' AND c.name = 'Structure';
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
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'gluten' WHERE et.name = 'Food' AND l.name = 'Bread (wheat)'
UNION ALL
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'gluten' WHERE et.name = 'Food' AND l.name = 'Pasta'
UNION ALL
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'gluten' WHERE et.name = 'Food' AND l.name = 'Sourdough'
UNION ALL
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'gluten' WHERE et.name = 'Food' AND l.name = 'Crackers'
UNION ALL
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'gluten' WHERE et.name = 'Food' AND l.name = 'Bread (white)'
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
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'caffeine' WHERE et.name = 'Food' AND l.name = 'Dark chocolate'
UNION ALL
-- Food: alcohol
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'alcohol' WHERE et.name = 'Food' AND l.name = 'Alcohol'
UNION ALL
-- Food: high_fat
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'high_fat' WHERE et.name = 'Food' AND l.name = 'Chips'
UNION ALL
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'high_fat' WHERE et.name = 'Food' AND l.name = 'Nuts'
UNION ALL
-- Emotion: all Pleasant children → nervous_system
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'nervous_system' JOIN label pl ON pl.id = l.parent_id WHERE et.name = 'Emotion' AND pl.name = 'Pleasant'
UNION ALL
-- Emotion: all Unpleasant children → nervous_system
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'nervous_system' JOIN label pl ON pl.id = l.parent_id WHERE et.name = 'Emotion' AND pl.name = 'Unpleasant'
UNION ALL
-- Emotion: hormone — specific Unpleasant children
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'hormone' WHERE et.name = 'Emotion' AND l.name = 'Anxious'
UNION ALL
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'hormone' WHERE et.name = 'Emotion' AND l.name = 'Overwhelmed'
UNION ALL
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'hormone' WHERE et.name = 'Emotion' AND l.name = 'Scared'
UNION ALL
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'hormone' WHERE et.name = 'Emotion' AND l.name = 'Sad'
UNION ALL
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'hormone' WHERE et.name = 'Emotion' AND l.name = 'Hopeless'
UNION ALL
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'hormone' WHERE et.name = 'Emotion' AND l.name = 'Lonely'
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
