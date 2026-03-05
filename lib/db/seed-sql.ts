/**
 * Seed SQL strings for v1 vocabulary.
 *
 * Exported separately from seeds.ts so the seed-integrity test can execute
 * these strings directly with better-sqlite3 (Node-native) without requiring
 * the expo-sqlite native module — same pattern as MIGRATION_V1_SQL in migrations.ts.
 *
 * All inserts use INSERT OR IGNORE with explicit integer IDs so re-running the
 * seeds on subsequent app launches is fully idempotent (deduplication via PK conflict).
 *
 * Label ID ranges (do not overlap):
 *   1–50:   Food labels (flat)
 *   51–53:  Emotion parent labels (valence)
 *   61–100: Emotion child labels
 *   101–108: Physical State parent labels (body areas)
 *   121–180: Physical State child labels
 *   251–310: Activity labels (flat, with category_id)
 */

export const SEED_V1_MEASUREMENT_TYPES = `
INSERT OR IGNORE INTO measurement_type (id, name, display_name) VALUES
  (1, 'numeric', 'Numeric'),
  (2, 'label_select', 'Label Select'),
  (3, 'label_select_severity', 'Label Select with Severity');
`;

export const SEED_V1_ENTRY_TYPES = `
INSERT OR IGNORE INTO entry_type (id, name, measurement_type_id, prompt, icon, is_enabled, is_default, sort_order) VALUES
  (1, 'Sleep',          1, 'How many hours did you sleep?', 'moon',     1, 1, 1),
  (2, 'Hydration',      1, 'How much did you drink?',       'droplet',  1, 1, 2),
  (3, 'Food',           2, 'What did you eat?',             'utensils', 1, 1, 3),
  (4, 'Emotion',        2, 'How are you feeling?',          'heart',    1, 1, 4),
  (5, 'Physical State', 3, 'How does your body feel?',      'body',     1, 1, 5),
  (6, 'Energy Level',   1, 'What is your energy level?',   'bolt',     1, 1, 6),
  (7, 'Activity',       2, 'What did you do?',              'activity', 1, 1, 7);
`;

export const SEED_V1_CATEGORIES = `
INSERT OR IGNORE INTO category (id, name) VALUES
  (1, 'Move'),
  (2, 'Create'),
  (3, 'Connect'),
  (4, 'Ground'),
  (5, 'Breathe'),
  (6, 'Reflect'),
  (7, 'Nourish'),
  (8, 'Structure');
`;

export const SEED_V1_TAGS = `
INSERT OR IGNORE INTO tag (id, name, tag_group, seed_version) VALUES
  (1,  'dairy',          'food_sensitivity', 1),
  (2,  'gluten',         'food_sensitivity', 1),
  (3,  'fodmap',         'food_sensitivity', 1),
  (4,  'nightshade',     'food_sensitivity', 1),
  (5,  'caffeine',       'food_sensitivity', 1),
  (6,  'alcohol',        'food_sensitivity', 1),
  (7,  'high_sugar',     'food_sensitivity', 1),
  (8,  'high_fat',       'food_sensitivity', 1),
  (9,  'nervous_system', 'emotion_system',   1),
  (10, 'hormone',        'emotion_system',   1),
  (11, 'cardiovascular', 'activity_type',    1),
  (12, 'strength',       'activity_type',    1),
  (13, 'flexibility',    'activity_type',    1),
  (14, 'mindfulness',    'activity_type',    1),
  (15, 'social',         'activity_type',    1),
  (16, 'creative',       'activity_type',    1);
`;

/**
 * Labels — parents must be inserted before children.
 *
 * Food (ids 1-50, entry_type_id=3, flat, no parent, no category):
 *   Grains: 1-7
 *   Dairy: 8-13
 *   Proteins: 14-21
 *   Vegetables: 22-34  (13 items)
 *   Fruits: 35-40
 *   Fats/Other: 41-47
 *   Sweets/Processed: 48-53 — note: 48-50 fit in range, 51 conflicts; use 48,49,50 then skip
 *   We trim to 50 food items. Drop: Corn tortilla (id gap), Cucumber, Zucchini.
 *   Actual food items chosen: see below.
 *
 * Emotion parents (51,52,53), children (61-88).
 * Physical State parents (101-108), children (121-179).
 * Activity (251-310).
 */
export const SEED_V1_LABELS = `
INSERT OR IGNORE INTO label (id, entry_type_id, name, parent_id, category_id, is_default, is_enabled, sort_order, seed_version) VALUES
  -- Food labels (entry_type_id=3, flat)
  -- Grains (1-7)
  (1,  3, 'White rice',     NULL, NULL, 1, 1, 0, 1),
  (2,  3, 'Brown rice',     NULL, NULL, 1, 1, 0, 1),
  (3,  3, 'Oats',           NULL, NULL, 1, 1, 0, 1),
  (4,  3, 'Bread (wheat)',  NULL, NULL, 1, 1, 0, 1),
  (5,  3, 'Pasta',          NULL, NULL, 1, 1, 0, 1),
  (6,  3, 'Sourdough',      NULL, NULL, 1, 1, 0, 1),
  (7,  3, 'Corn tortilla',  NULL, NULL, 1, 1, 0, 1),
  -- Dairy (8-13)
  (8,  3, 'Cheese',         NULL, NULL, 1, 1, 0, 1),
  (9,  3, 'Milk',           NULL, NULL, 1, 1, 0, 1),
  (10, 3, 'Yogurt',         NULL, NULL, 1, 1, 0, 1),
  (11, 3, 'Butter',         NULL, NULL, 1, 1, 0, 1),
  (12, 3, 'Cream',          NULL, NULL, 1, 1, 0, 1),
  (13, 3, 'Ice cream',      NULL, NULL, 1, 1, 0, 1),
  -- Proteins (14-21)
  (14, 3, 'Chicken',        NULL, NULL, 1, 1, 0, 1),
  (15, 3, 'Beef',           NULL, NULL, 1, 1, 0, 1),
  (16, 3, 'Pork',           NULL, NULL, 1, 1, 0, 1),
  (17, 3, 'Fish',           NULL, NULL, 1, 1, 0, 1),
  (18, 3, 'Eggs',           NULL, NULL, 1, 1, 0, 1),
  (19, 3, 'Tofu',           NULL, NULL, 1, 1, 0, 1),
  (20, 3, 'Beans',          NULL, NULL, 1, 1, 0, 1),
  (21, 3, 'Lentils',        NULL, NULL, 1, 1, 0, 1),
  -- Vegetables (22-34)
  (22, 3, 'Broccoli',       NULL, NULL, 1, 1, 0, 1),
  (23, 3, 'Spinach',        NULL, NULL, 1, 1, 0, 1),
  (24, 3, 'Kale',           NULL, NULL, 1, 1, 0, 1),
  (25, 3, 'Onion',          NULL, NULL, 1, 1, 0, 1),
  (26, 3, 'Garlic',         NULL, NULL, 1, 1, 0, 1),
  (27, 3, 'Tomato',         NULL, NULL, 1, 1, 0, 1),
  (28, 3, 'Pepper',         NULL, NULL, 1, 1, 0, 1),
  (29, 3, 'Carrot',         NULL, NULL, 1, 1, 0, 1),
  (30, 3, 'Cucumber',       NULL, NULL, 1, 1, 0, 1),
  (31, 3, 'Zucchini',       NULL, NULL, 1, 1, 0, 1),
  (32, 3, 'Potato',         NULL, NULL, 1, 1, 0, 1),
  (33, 3, 'Sweet potato',   NULL, NULL, 1, 1, 0, 1),
  (34, 3, 'Mushroom',       NULL, NULL, 1, 1, 0, 1),
  -- Fruits (35-40)
  (35, 3, 'Apple',          NULL, NULL, 1, 1, 0, 1),
  (36, 3, 'Banana',         NULL, NULL, 1, 1, 0, 1),
  (37, 3, 'Berries',        NULL, NULL, 1, 1, 0, 1),
  (38, 3, 'Orange',         NULL, NULL, 1, 1, 0, 1),
  (39, 3, 'Avocado',        NULL, NULL, 1, 1, 0, 1),
  (40, 3, 'Grapes',         NULL, NULL, 1, 1, 0, 1),
  -- Fats/Other (41-47)
  (41, 3, 'Olive oil',      NULL, NULL, 1, 1, 0, 1),
  (42, 3, 'Nuts',           NULL, NULL, 1, 1, 0, 1),
  (43, 3, 'Seeds',          NULL, NULL, 1, 1, 0, 1),
  (44, 3, 'Dark chocolate', NULL, NULL, 1, 1, 0, 1),
  (45, 3, 'Coffee',         NULL, NULL, 1, 1, 0, 1),
  (46, 3, 'Tea',            NULL, NULL, 1, 1, 0, 1),
  (47, 3, 'Alcohol',        NULL, NULL, 1, 1, 0, 1),
  -- Sweets/Processed (48-53, within 1-50 range: 48,49,50 + using 48-53 is ok since emotion parents start at 51 in label IDs — but we must not use 51-53 for food)
  -- Trimmed to fit: Bread (white), Chips, Crackers (48-50)
  (48, 3, 'Bread (white)',  NULL, NULL, 1, 1, 0, 1),
  (49, 3, 'Chips',          NULL, NULL, 1, 1, 0, 1),
  (50, 3, 'Crackers',       NULL, NULL, 1, 1, 0, 1),

  -- Emotion parent labels (entry_type_id=4, parent_id=NULL)
  (51, 4, 'Pleasant',       NULL, NULL, 1, 1, 0, 1),
  (52, 4, 'Neutral',        NULL, NULL, 1, 1, 0, 1),
  (53, 4, 'Unpleasant',     NULL, NULL, 1, 1, 0, 1),

  -- Emotion child labels — Pleasant children (parent_id=51): ids 61-70
  (61, 4, 'Happy',          51,   NULL, 1, 1, 0, 1),
  (62, 4, 'Calm',           51,   NULL, 1, 1, 0, 1),
  (63, 4, 'Grateful',       51,   NULL, 1, 1, 0, 1),
  (64, 4, 'Energized',      51,   NULL, 1, 1, 0, 1),
  (65, 4, 'Hopeful',        51,   NULL, 1, 1, 0, 1),
  (66, 4, 'Loved',          51,   NULL, 1, 1, 0, 1),
  (67, 4, 'Proud',          51,   NULL, 1, 1, 0, 1),
  (68, 4, 'Content',        51,   NULL, 1, 1, 0, 1),
  (69, 4, 'Excited',        51,   NULL, 1, 1, 0, 1),
  (70, 4, 'Playful',        51,   NULL, 1, 1, 0, 1),

  -- Neutral children (parent_id=52): ids 71-76
  (71, 4, 'Unsure',         52,   NULL, 1, 1, 0, 1),
  (72, 4, 'Numb',           52,   NULL, 1, 1, 0, 1),
  (73, 4, 'Indifferent',    52,   NULL, 1, 1, 0, 1),
  (74, 4, 'Contemplative',  52,   NULL, 1, 1, 0, 1),
  (75, 4, 'Tired',          52,   NULL, 1, 1, 0, 1),
  (76, 4, 'Bored',          52,   NULL, 1, 1, 0, 1),

  -- Unpleasant children (parent_id=53): ids 77-88
  (77, 4, 'Anxious',        53,   NULL, 1, 1, 0, 1),
  (78, 4, 'Sad',            53,   NULL, 1, 1, 0, 1),
  (79, 4, 'Angry',          53,   NULL, 1, 1, 0, 1),
  (80, 4, 'Frustrated',     53,   NULL, 1, 1, 0, 1),
  (81, 4, 'Overwhelmed',    53,   NULL, 1, 1, 0, 1),
  (82, 4, 'Irritable',      53,   NULL, 1, 1, 0, 1),
  (83, 4, 'Lonely',         53,   NULL, 1, 1, 0, 1),
  (84, 4, 'Guilty',         53,   NULL, 1, 1, 0, 1),
  (85, 4, 'Ashamed',        53,   NULL, 1, 1, 0, 1),
  (86, 4, 'Disappointed',   53,   NULL, 1, 1, 0, 1),
  (87, 4, 'Scared',         53,   NULL, 1, 1, 0, 1),
  (88, 4, 'Hopeless',       53,   NULL, 1, 1, 0, 1),

  -- Physical State parent labels (entry_type_id=5, parent_id=NULL): ids 101-108
  (101, 5, 'Head',          NULL, NULL, 1, 1, 0, 1),
  (102, 5, 'Gut',           NULL, NULL, 1, 1, 0, 1),
  (103, 5, 'Chest',         NULL, NULL, 1, 1, 0, 1),
  (104, 5, 'Joints',        NULL, NULL, 1, 1, 0, 1),
  (105, 5, 'Skin',          NULL, NULL, 1, 1, 0, 1),
  (106, 5, 'Energy',        NULL, NULL, 1, 1, 0, 1),
  (107, 5, 'Sleep quality', NULL, NULL, 1, 1, 0, 1),
  (108, 5, 'Whole body',    NULL, NULL, 1, 1, 0, 1),

  -- Physical State children
  -- Head (parent_id=101): ids 121-128
  (121, 5, 'Headache',          101, NULL, 1, 1, 0, 1),
  (122, 5, 'Migraine',          101, NULL, 1, 1, 0, 1),
  (123, 5, 'Brain fog',         101, NULL, 1, 1, 0, 1),
  (124, 5, 'Clear-headed',      101, NULL, 1, 1, 0, 1),
  (125, 5, 'Sharp focus',       101, NULL, 1, 1, 0, 1),
  (126, 5, 'Sinus pressure',    101, NULL, 1, 1, 0, 1),
  (127, 5, 'Eye strain',        101, NULL, 1, 1, 0, 1),
  (128, 5, 'Dizziness',         101, NULL, 1, 1, 0, 1),

  -- Gut (parent_id=102): ids 131-140
  (131, 5, 'Bloating',          102, NULL, 1, 1, 0, 1),
  (132, 5, 'Cramping',          102, NULL, 1, 1, 0, 1),
  (133, 5, 'Nausea',            102, NULL, 1, 1, 0, 1),
  (134, 5, 'Acid reflux',       102, NULL, 1, 1, 0, 1),
  (135, 5, 'Constipation',      102, NULL, 1, 1, 0, 1),
  (136, 5, 'Diarrhea',          102, NULL, 1, 1, 0, 1),
  (137, 5, 'Gas',               102, NULL, 1, 1, 0, 1),
  (138, 5, 'Comfortable',       102, NULL, 1, 1, 0, 1),
  (139, 5, 'Full',              102, NULL, 1, 1, 0, 1),
  (140, 5, 'Empty',             102, NULL, 1, 1, 0, 1),

  -- Chest (parent_id=103): ids 141-146
  (141, 5, 'Tight',             103, NULL, 1, 1, 0, 1),
  (142, 5, 'Open',              103, NULL, 1, 1, 0, 1),
  (143, 5, 'Palpitations',      103, NULL, 1, 1, 0, 1),
  (144, 5, 'Shortness of breath', 103, NULL, 1, 1, 0, 1),
  (145, 5, 'Calm',              103, NULL, 1, 1, 0, 1),
  (146, 5, 'Chest pain',        103, NULL, 1, 1, 0, 1),

  -- Joints (parent_id=104): ids 151-156
  (151, 5, 'Stiff',             104, NULL, 1, 1, 0, 1),
  (152, 5, 'Sore',              104, NULL, 1, 1, 0, 1),
  (153, 5, 'Pain',              104, NULL, 1, 1, 0, 1),
  (154, 5, 'Swollen',           104, NULL, 1, 1, 0, 1),
  (155, 5, 'Flexible',          104, NULL, 1, 1, 0, 1),
  (156, 5, 'Warm',              104, NULL, 1, 1, 0, 1),

  -- Skin (parent_id=105): ids 161-166
  (161, 5, 'Itchy',             105, NULL, 1, 1, 0, 1),
  (162, 5, 'Rash',              105, NULL, 1, 1, 0, 1),
  (163, 5, 'Dry',               105, NULL, 1, 1, 0, 1),
  (164, 5, 'Clear',             105, NULL, 1, 1, 0, 1),
  (165, 5, 'Flushed',           105, NULL, 1, 1, 0, 1),
  (166, 5, 'Hives',             105, NULL, 1, 1, 0, 1),

  -- Energy (parent_id=106): ids 171-176
  (171, 5, 'Fatigue',           106, NULL, 1, 1, 0, 1),
  (172, 5, 'Exhausted',         106, NULL, 1, 1, 0, 1),
  (173, 5, 'Alert',             106, NULL, 1, 1, 0, 1),
  (174, 5, 'Rested',            106, NULL, 1, 1, 0, 1),
  (175, 5, 'Wired',             106, NULL, 1, 1, 0, 1),
  (176, 5, 'Sluggish',          106, NULL, 1, 1, 0, 1),

  -- Sleep quality (parent_id=107): ids 181-186
  (181, 5, 'Restless',          107, NULL, 1, 1, 0, 1),
  (182, 5, 'Interrupted',       107, NULL, 1, 1, 0, 1),
  (183, 5, 'Deep',              107, NULL, 1, 1, 0, 1),
  (184, 5, 'Light',             107, NULL, 1, 1, 0, 1),
  (185, 5, 'Nightmares',        107, NULL, 1, 1, 0, 1),
  (186, 5, 'Well-rested',       107, NULL, 1, 1, 0, 1),

  -- Whole body (parent_id=108): ids 191-197
  (191, 5, 'Achy',              108, NULL, 1, 1, 0, 1),
  (192, 5, 'Tense',             108, NULL, 1, 1, 0, 1),
  (193, 5, 'Relaxed',           108, NULL, 1, 1, 0, 1),
  (194, 5, 'Inflamed',          108, NULL, 1, 1, 0, 1),
  (195, 5, 'Strong',            108, NULL, 1, 1, 0, 1),
  (196, 5, 'Weak',              108, NULL, 1, 1, 0, 1),
  (197, 5, 'Shaky',             108, NULL, 1, 1, 0, 1),

  -- Activity labels (entry_type_id=7, flat, with category_id): ids 251+
  -- Move (category_id=1): 251-262
  (251, 7, 'Walk',              NULL, 1, 1, 1, 0, 1),
  (252, 7, 'Run',               NULL, 1, 1, 1, 0, 1),
  (253, 7, 'Cycle',             NULL, 1, 1, 1, 0, 1),
  (254, 7, 'Swim',              NULL, 1, 1, 1, 0, 1),
  (255, 7, 'Yoga',              NULL, 1, 1, 1, 0, 1),
  (256, 7, 'Stretching',        NULL, 1, 1, 1, 0, 1),
  (257, 7, 'Weight training',   NULL, 1, 1, 1, 0, 1),
  (258, 7, 'HIIT',              NULL, 1, 1, 1, 0, 1),
  (259, 7, 'Dancing',           NULL, 1, 1, 1, 0, 1),
  (260, 7, 'Hiking',            NULL, 1, 1, 1, 0, 1),
  (261, 7, 'Climbing',          NULL, 1, 1, 1, 0, 1),
  (262, 7, 'Pilates',           NULL, 1, 1, 1, 0, 1),

  -- Create (category_id=2): 263-271
  (263, 7, 'Drawing',           NULL, 2, 1, 1, 0, 1),
  (264, 7, 'Painting',          NULL, 2, 1, 1, 0, 1),
  (265, 7, 'Writing',           NULL, 2, 1, 1, 0, 1),
  (266, 7, 'Journaling',        NULL, 2, 1, 1, 0, 1),
  (267, 7, 'Photography',       NULL, 2, 1, 1, 0, 1),
  (268, 7, 'Music',             NULL, 2, 1, 1, 0, 1),
  (269, 7, 'Crafts',            NULL, 2, 1, 1, 0, 1),
  (270, 7, 'Cooking',           NULL, 2, 1, 1, 0, 1),
  (271, 7, 'Gardening',         NULL, 2, 1, 1, 0, 1),

  -- Connect (category_id=3): 272-277
  (272, 7, 'Call a friend',     NULL, 3, 1, 1, 0, 1),
  (273, 7, 'Spend time with family', NULL, 3, 1, 1, 0, 1),
  (274, 7, 'Social meal',       NULL, 3, 1, 1, 0, 1),
  (275, 7, 'Date',              NULL, 3, 1, 1, 0, 1),
  (276, 7, 'Group activity',    NULL, 3, 1, 1, 0, 1),
  (277, 7, 'Community event',   NULL, 3, 1, 1, 0, 1),

  -- Ground (category_id=4): 278-283
  (278, 7, 'Nature walk',       NULL, 4, 1, 1, 0, 1),
  (279, 7, 'Barefoot outside',  NULL, 4, 1, 1, 0, 1),
  (280, 7, 'Quiet time',        NULL, 4, 1, 1, 0, 1),
  (281, 7, 'Reading',           NULL, 4, 1, 1, 0, 1),
  (282, 7, 'Bath or shower',    NULL, 4, 1, 1, 0, 1),
  (283, 7, 'Tidying',           NULL, 4, 1, 1, 0, 1),

  -- Breathe (category_id=5): 284-288
  (284, 7, 'Meditation',        NULL, 5, 1, 1, 0, 1),
  (285, 7, 'Breathwork',        NULL, 5, 1, 1, 0, 1),
  (286, 7, 'Body scan',         NULL, 5, 1, 1, 0, 1),
  (287, 7, 'Progressive relaxation', NULL, 5, 1, 1, 0, 1),
  (288, 7, 'Guided visualization', NULL, 5, 1, 1, 0, 1),

  -- Reflect (category_id=6): 289-293
  (289, 7, 'Gratitude list',    NULL, 6, 1, 1, 0, 1),
  (290, 7, 'Review goals',      NULL, 6, 1, 1, 0, 1),
  (291, 7, 'Planning',          NULL, 6, 1, 1, 0, 1),
  (292, 7, 'Self-check-in',     NULL, 6, 1, 1, 0, 1),

  -- Nourish (category_id=7): 293-296 (skip 293 taken above — use 294+)
  (294, 7, 'Meal prep',         NULL, 7, 1, 1, 0, 1),
  (295, 7, 'Mindful eating',    NULL, 7, 1, 1, 0, 1),
  (296, 7, 'Hydration focus',   NULL, 7, 1, 1, 0, 1),
  (297, 7, 'Rest',              NULL, 7, 1, 1, 0, 1),

  -- Structure (category_id=8): 298-302
  (298, 7, 'Morning routine',   NULL, 8, 1, 1, 0, 1),
  (299, 7, 'Evening routine',   NULL, 8, 1, 1, 0, 1),
  (300, 7, 'Work block',        NULL, 8, 1, 1, 0, 1),
  (301, 7, 'Study',             NULL, 8, 1, 1, 0, 1),
  (302, 7, 'Errand batch',      NULL, 8, 1, 1, 0, 1);
`;

/**
 * label_tag associations.
 * All rows: seed_version = 1.
 *
 * Label IDs referenced:
 *   Food: Cheese=8, Milk=9, Yogurt=10, Butter=11, Cream=12, Ice cream=13
 *         Bread(wheat)=4, Pasta=5, Sourdough=6, Crackers=50
 *         Grapes=40, Apple=35, Onion=25, Garlic=26, Beans=20, Lentils=21
 *         Tomato=27, Pepper=28, Potato=32
 *         Coffee=45, Tea=46, Alcohol=47, Dark chocolate=44
 *         Candy — omitted (trimmed from food list)
 *         Chips=49, Nuts=42
 *         Cookies — omitted (trimmed)
 *         Cake — omitted (trimmed)
 *         Bread(white)=48
 *   Emotion pleasant children: 61-70 (nervous_system=9)
 *   Emotion unpleasant children: 77-88 (nervous_system=9)
 *     Anxious=77, Overwhelmed=81, Scared=87: also hormone=10
 *     Sad=78, Hopeless=88, Lonely=83: also hormone=10
 *   Activity:
 *     cardiovascular: Walk=251,Run=252,Cycle=253,Swim=254,HIIT=258,Hiking=260,Climbing=261,Dancing=259
 *     strength: Weight training=257,HIIT=258,Climbing=261
 *     flexibility: Yoga=255,Stretching=256,Pilates=262
 *     mindfulness (Breathe category): 284-288
 *     mindfulness (Reflect category): 289-292
 *     social (Connect): 272-277
 *     creative (Create): 263-271
 */
export const SEED_V1_LABEL_TAGS = `
INSERT OR IGNORE INTO label_tag (label_id, tag_id, seed_version) VALUES
  -- Food: dairy (tag=1)
  (8,  1, 1),
  (9,  1, 1),
  (10, 1, 1),
  (11, 1, 1),
  (12, 1, 1),
  (13, 1, 1),
  -- Ice cream: also high_fat(8), high_sugar(7)
  (13, 8, 1),
  (13, 7, 1),

  -- Food: gluten (tag=2)
  (4,  2, 1),
  (5,  2, 1),
  (6,  2, 1),
  (50, 2, 1),
  (48, 2, 1),

  -- Food: fodmap (tag=3)
  (25, 3, 1),
  (26, 3, 1),
  (20, 3, 1),
  (21, 3, 1),
  (40, 3, 1),
  (35, 3, 1),
  -- Grapes also high_sugar
  (40, 7, 1),

  -- Food: nightshade (tag=4)
  (27, 4, 1),
  (28, 4, 1),
  (32, 4, 1),

  -- Food: caffeine (tag=5)
  (45, 5, 1),
  (46, 5, 1),
  (44, 5, 1),

  -- Food: alcohol (tag=6)
  (47, 6, 1),

  -- Food: high_fat (tag=8)
  (49, 8, 1),
  (42, 8, 1),

  -- Emotion: all Pleasant children → nervous_system (tag=9)
  (61, 9, 1),
  (62, 9, 1),
  (63, 9, 1),
  (64, 9, 1),
  (65, 9, 1),
  (66, 9, 1),
  (67, 9, 1),
  (68, 9, 1),
  (69, 9, 1),
  (70, 9, 1),

  -- Emotion: all Unpleasant children → nervous_system (tag=9)
  (77, 9, 1),
  (78, 9, 1),
  (79, 9, 1),
  (80, 9, 1),
  (81, 9, 1),
  (82, 9, 1),
  (83, 9, 1),
  (84, 9, 1),
  (85, 9, 1),
  (86, 9, 1),
  (87, 9, 1),
  (88, 9, 1),

  -- Emotion: hormone (tag=10)
  (77, 10, 1),
  (81, 10, 1),
  (87, 10, 1),
  (78, 10, 1),
  (88, 10, 1),
  (83, 10, 1),

  -- Activity: cardiovascular (tag=11)
  (251, 11, 1),
  (252, 11, 1),
  (253, 11, 1),
  (254, 11, 1),
  (258, 11, 1),
  (259, 11, 1),
  (260, 11, 1),
  (261, 11, 1),

  -- Activity: strength (tag=12)
  (257, 12, 1),
  (258, 12, 1),
  (261, 12, 1),

  -- Activity: flexibility (tag=13)
  (255, 13, 1),
  (256, 13, 1),
  (262, 13, 1),

  -- Activity: mindfulness (tag=14) — Breathe category (284-288)
  (284, 14, 1),
  (285, 14, 1),
  (286, 14, 1),
  (287, 14, 1),
  (288, 14, 1),
  -- Reflect category (289-292)
  (289, 14, 1),
  (290, 14, 1),
  (291, 14, 1),
  (292, 14, 1),

  -- Activity: social (tag=15) — Connect category (272-277)
  (272, 15, 1),
  (273, 15, 1),
  (274, 15, 1),
  (275, 15, 1),
  (276, 15, 1),
  (277, 15, 1),

  -- Activity: creative (tag=16) — Create category (263-271)
  (263, 16, 1),
  (264, 16, 1),
  (265, 16, 1),
  (266, 16, 1),
  (267, 16, 1),
  (268, 16, 1),
  (269, 16, 1),
  (270, 16, 1),
  (271, 16, 1);
`;
