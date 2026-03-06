-- measurement_type
INSERT OR IGNORE INTO measurement_type (name, display_name) VALUES
  ('numeric', 'Numeric'),
  ('label_select', 'Label Select'),
  ('label_select_severity', 'Label Select with Severity');

-- category
INSERT OR IGNORE INTO category (name) VALUES
  ('Move'),
  ('Create'),
  ('Connect'),
  ('Ground'),
  ('Breathe'),
  ('Reflect'),
  ('Nourish'),
  ('Structure'),
  ('Grains'),
  ('Dairy'),
  ('Protein'),
  ('Vegetables'),
  ('Fruit'),
  ('Nuts & Seeds'),
  ('Drinks'),
  ('Snacks');

-- entry_type
INSERT OR IGNORE INTO entry_type (name, measurement_type_id, prompt, icon, is_enabled, is_default, sort_order)
SELECT 'Sleep', id, 'How many hours did you sleep?', 'moon', 1, 1, 1 FROM measurement_type WHERE name = 'numeric'
UNION ALL
SELECT 'Hydration', id, 'How much did you drink?', 'droplet', 1, 1, 2 FROM measurement_type WHERE name = 'numeric'
UNION ALL
SELECT 'Food', id, 'What did you eat?', 'utensils', 1, 1, 3 FROM measurement_type WHERE name = 'label_select'
UNION ALL
SELECT 'Emotion', id, 'How are you feeling?', 'heart', 1, 1, 4 FROM measurement_type WHERE name = 'label_select'
UNION ALL
SELECT 'Physical', id, 'How does your body feel?', 'body', 1, 1, 5 FROM measurement_type WHERE name = 'label_select_severity'
UNION ALL
SELECT 'Activity', id, 'What did you do?', 'activity', 1, 1, 6 FROM measurement_type WHERE name = 'label_select';

-- tag
INSERT OR IGNORE INTO tag (name, tag_group, seed_version) VALUES
  ('dairy',                'food_sensitivity', 1),
  ('gluten',               'food_sensitivity', 1),
  ('fodmap',               'food_sensitivity', 1),
  ('nightshade',           'food_sensitivity', 1),
  ('caffeine',             'food_sensitivity', 1),
  ('alcohol',              'food_sensitivity', 1),
  ('high_sugar',           'food_sensitivity', 1),
  ('high_fat',             'food_sensitivity', 1),
  ('processed',            'food_sensitivity', 1),
  ('fermented',            'food_sensitivity', 1),
  ('spicy',                'food_sensitivity', 1),
  ('artificial_sweetener', 'food_sensitivity', 1),
  ('high_sodium',          'food_sensitivity', 1),
  ('lactose',              'food_sensitivity', 1),
  ('shellfish',            'allergy',          1),
  ('soy',                  'allergy',          1),
  ('tree_nuts',            'allergy',          1),
  ('peanuts',              'allergy',          1),
  ('nervous_system',       'emotion_system',   1),
  ('hormone',              'emotion_system',   1),
  ('cardiovascular',       'activity_type',    1),
  ('strength',             'activity_type',    1),
  ('flexibility',          'activity_type',    1),
  ('mindfulness',          'activity_type',    1),
  ('social',               'activity_type',    1),
  ('creative',             'activity_type',    1);

-- label: Food
WITH v(cat, name) AS (VALUES
  ('Grains',      'Rice, White'),
  ('Grains',      'Rice, Brown'),
  ('Grains',      'Oats'),
  ('Grains',      'Bread'),
  ('Grains',      'Bread (GF)'),
  ('Grains',      'Pasta'),
  ('Grains',      'Pasta (GF)'),
  ('Grains',      'Corn tortilla'),
  ('Grains',      'Couscous'),
  ('Grains',      'Quinoa'),
  ('Grains',      'Polenta'),
  ('Grains',      'Sourdough'),
  ('Dairy',       'Cheese'),
  ('Dairy',       'Milk'),
  ('Dairy',       'Yogurt'),
  ('Dairy',       'Butter'),
  ('Dairy',       'Cream'),
  ('Dairy',       'Ice cream'),
  ('Dairy',       'Cheese, Goat'),
  ('Protein',     'Chicken'),
  ('Protein',     'Beef'),
  ('Protein',     'Pork'),
  ('Protein',     'Fish'),
  ('Protein',     'Eggs'),
  ('Protein',     'Tofu'),
  ('Protein',     'Beans'),
  ('Protein',     'Lentils'),
  ('Protein',     'Turkey'),
  ('Protein',     'Lamb'),
  ('Protein',     'Duck'),
  ('Protein',     'Shellfish'),
  ('Protein',     'Deli meat'),
  ('Vegetables',  'Broccoli'),
  ('Vegetables',  'Spinach'),
  ('Vegetables',  'Kale'),
  ('Vegetables',  'Onion'),
  ('Vegetables',  'Garlic'),
  ('Vegetables',  'Tomato'),
  ('Vegetables',  'Pepper'),
  ('Vegetables',  'Carrot'),
  ('Vegetables',  'Cucumber'),
  ('Vegetables',  'Zucchini'),
  ('Vegetables',  'Potato'),
  ('Vegetables',  'Sweet potato'),
  ('Vegetables',  'Mushroom'),
  ('Vegetables',  'Cauliflower'),
  ('Vegetables',  'Cabbage'),
  ('Vegetables',  'Brussels sprouts'),
  ('Vegetables',  'Eggplant'),
  ('Vegetables',  'Bell pepper'),
  ('Vegetables',  'Chili pepper'),
  ('Vegetables',  'Celery'),
  ('Vegetables',  'Asparagus'),
  ('Vegetables',  'Artichoke'),
  ('Vegetables',  'Leek'),
  ('Vegetables',  'Kimchi'),
  ('Vegetables',  'Sauerkraut'),
  ('Fruit',       'Apple'),
  ('Fruit',       'Banana'),
  ('Fruit',       'Berries'),
  ('Fruit',       'Orange'),
  ('Fruit',       'Avocado'),
  ('Fruit',       'Grapes'),
  ('Fruit',       'Pear'),
  ('Fruit',       'Plum'),
  ('Fruit',       'Peach'),
  ('Fruit',       'Mango'),
  ('Fruit',       'Pineapple'),
  ('Fruit',       'Lemon'),
  ('Fruit',       'Lime'),
  ('Nuts & Seeds','Seeds, Pumpkin'),
  ('Nuts & Seeds','Seeds, Sesame'),
  ('Nuts & Seeds','Almonds'),
  ('Nuts & Seeds','Cashews'),
  ('Nuts & Seeds','Hazelnuts'),
  ('Nuts & Seeds','Macadamia'),
  ('Nuts & Seeds','Peanuts'),
  ('Nuts & Seeds','Pecans'),
  ('Nuts & Seeds','Pistachios'),
  ('Nuts & Seeds','Walnuts'),
  ('Snacks',      'Mayonnaise'),
  ('Snacks',      'Chocolate, Dark'),
  ('Snacks',      'Chips, Potato'),
  ('Snacks',      'Chips, Corn'),
  ('Snacks',      'Crackers'),
  ('Snacks',      'Candy'),
  ('Snacks',      'Hummus'),
  ('Snacks',      'Hot sauce'),
  ('Drinks',      'Coffee'),
  ('Drinks',      'Tea'),
  ('Drinks',      'Alcohol'),
  ('Drinks',      'Wine'),
  ('Drinks',      'Beer'),
  ('Drinks',      'Milk, Almond'),
  ('Drinks',      'Milk, Oat'),
  ('Drinks',      'Soda'),
  ('Drinks',      'Fruit juice')
)
INSERT OR IGNORE INTO label (entry_type_id, name, category_id)
SELECT et.id, v.name, c.id
FROM entry_type et
JOIN v ON 1=1
JOIN category c ON c.name = v.cat
WHERE et.name = 'Food';

-- label: Emotion L1
WITH v(name) AS (VALUES ('Bright'), ('Warm'), ('Still'), ('Heavy'), ('Charged'))
INSERT OR IGNORE INTO label (entry_type_id, name)
SELECT et.id, v.name FROM entry_type et, v WHERE et.name = 'Emotion';

-- label: Emotion L2
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

-- label: Emotion L3
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

-- label: Physical parents
-- 'Body' is the universal symptom pool (not a selectable area in the UI)
WITH v(name) AS (VALUES
  ('Energy'), ('Head'), ('Arms'), ('Chest'), ('Gut'),
  ('Legs'), ('Whole body'), ('Body')
)
INSERT OR IGNORE INTO label (entry_type_id, name)
SELECT et.id, v.name FROM entry_type et, v WHERE et.name = 'Physical';

-- label: Physical universal symptoms (children of 'Body')
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
  -- Arms: Weak/Strong/Fine are universal cross-area labels
  -- Chest
  ('Chest',      'Tight'),
  ('Chest',      'Palpitations'),
  ('Chest',      'Shortness of breath'),
  ('Chest',      'Open'),
  ('Chest',      'Calm'),
  -- Gut
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
  -- Legs: Weak/Strong/Fine are universal cross-area labels
  ('Legs',       'Heavy'),
  ('Legs',       'Restless'),
  -- Whole body
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

-- label_tag: Food
INSERT OR IGNORE INTO label_tag (label_id, tag_id, seed_version)
-- dairy
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'dairy' WHERE et.name = 'Food' AND l.name IN ('Cheese', 'Milk', 'Yogurt', 'Butter', 'Cream', 'Ice cream', 'Cheese, Goat')
UNION ALL
-- lactose (high-lactose dairy — butter/aged cheese are naturally low)
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'lactose' WHERE et.name = 'Food' AND l.name IN ('Milk', 'Cream', 'Ice cream', 'Yogurt')
UNION ALL
-- gluten
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'gluten' WHERE et.name = 'Food' AND l.name IN ('Bread', 'Pasta', 'Couscous', 'Crackers', 'Beer', 'Sourdough')
UNION ALL
-- nightshade
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'nightshade' WHERE et.name = 'Food' AND l.name IN ('Tomato', 'Pepper', 'Potato', 'Eggplant', 'Bell pepper', 'Chili pepper')
UNION ALL
-- caffeine
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'caffeine' WHERE et.name = 'Food' AND l.name IN ('Coffee', 'Tea', 'Chocolate, Dark')
UNION ALL
-- alcohol
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'alcohol' WHERE et.name = 'Food' AND l.name IN ('Alcohol', 'Wine', 'Beer')
UNION ALL
-- high_fat (rich/greasy foods — not cooking oils)
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'high_fat' WHERE et.name = 'Food' AND l.name IN ('Ice cream', 'Chips, Potato', 'Chips, Corn', 'Butter', 'Cream', 'Mayonnaise', 'Almonds', 'Cashews', 'Hazelnuts', 'Macadamia', 'Peanuts', 'Pecans', 'Pistachios', 'Walnuts', 'Seeds, Pumpkin', 'Seeds, Sesame')
UNION ALL
-- tree_nuts (allergen)
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'tree_nuts' WHERE et.name = 'Food' AND l.name IN ('Almonds', 'Cashews', 'Hazelnuts', 'Macadamia', 'Pecans', 'Pistachios', 'Walnuts')
UNION ALL
-- peanuts (separate allergen)
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'peanuts' WHERE et.name = 'Food' AND l.name = 'Peanuts'
UNION ALL
-- soy (allergen)
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'soy' WHERE et.name = 'Food' AND l.name = 'Tofu'
UNION ALL
-- shellfish (allergen)
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'shellfish' WHERE et.name = 'Food' AND l.name = 'Shellfish'
UNION ALL
-- spicy
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'spicy' WHERE et.name = 'Food' AND l.name IN ('Chili pepper', 'Kimchi', 'Hot sauce')
UNION ALL
-- fermented
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'fermented' WHERE et.name = 'Food' AND l.name IN ('Yogurt', 'Sourdough', 'Kimchi', 'Sauerkraut')
UNION ALL
-- high_sugar
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'high_sugar' WHERE et.name = 'Food' AND l.name IN ('Soda', 'Fruit juice', 'Candy', 'Chocolate, Dark', 'Banana', 'Mango', 'Pineapple', 'Grapes', 'Wine', 'Ice cream')
UNION ALL
-- high_sodium
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'high_sodium' WHERE et.name = 'Food' AND l.name IN ('Chips, Potato', 'Chips, Corn', 'Crackers', 'Deli meat', 'Hot sauce')
UNION ALL
-- processed (ultra-processed foods)
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'processed' WHERE et.name = 'Food' AND l.name IN ('Chips, Potato', 'Chips, Corn', 'Crackers', 'Candy', 'Soda', 'Deli meat', 'Ice cream', 'Mayonnaise', 'Fruit juice', 'Milk, Almond', 'Milk, Oat')
UNION ALL
-- label_tag: Activity
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
