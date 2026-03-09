
-- category
INSERT OR IGNORE INTO category (name) VALUES
  ('Grains'),
  ('Dairy'),
  ('Protein'),
  ('Vegetables'),
  ('Fruit'),
  ('Nuts & Seeds'),
  ('Drinks'),
  ('Snacks');

-- tag
INSERT OR IGNORE INTO tag (name, tag_group, seed_version) VALUES
  ('dairy',                'food_sensitivity', 1),
  ('gluten',               'food_sensitivity', 1),
  ('fodmap',               'food_sensitivity', 1),
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
  ('peanuts',              'allergy',          1);

-- label
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
  ('Vegetables',  'Courgette'),
  ('Vegetables',  'Potato'),
  ('Vegetables',  'Sweet potato'),
  ('Vegetables',  'Mushroom'),
  ('Vegetables',  'Cauliflower'),
  ('Vegetables',  'Cabbage'),
  ('Vegetables',  'Brussels sprouts'),
  ('Vegetables',  'Aubergine'),
  ('Vegetables',  'Pepper'),
  ('Vegetables',  'Chilli pepper'),
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
  ('Snacks',      'Crisps'),
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

-- label_tag
INSERT OR IGNORE INTO label_tag (label_id, tag_id, seed_version)
-- dairy
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'dairy' WHERE et.name = 'Food' AND l.name IN ('Cheese', 'Milk', 'Yogurt', 'Butter', 'Cream', 'Ice cream', 'Cheese, Goat')
UNION ALL
-- lactose (high-lactose dairy — butter/aged cheese are naturally low)
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'lactose' WHERE et.name = 'Food' AND l.name IN ('Milk', 'Cream', 'Ice cream', 'Yogurt')
UNION ALL
-- gluten
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'gluten' WHERE et.name = 'Food' AND l.name IN ('Bread', 'Pasta', 'Couscous', 'Crackers', 'Beer')
UNION ALL
-- caffeine
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'caffeine' WHERE et.name = 'Food' AND l.name IN ('Coffee', 'Tea', 'Chocolate, Dark')
UNION ALL
-- alcohol
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'alcohol' WHERE et.name = 'Food' AND l.name IN ('Alcohol', 'Wine', 'Beer')
UNION ALL
-- high_fat (rich/greasy foods — not cooking oils)
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'high_fat' WHERE et.name = 'Food' AND l.name IN ('Ice cream', 'Crisps', 'Chips, Corn', 'Butter', 'Cream', 'Mayonnaise', 'Almonds', 'Cashews', 'Hazelnuts', 'Macadamia', 'Peanuts', 'Pecans', 'Pistachios', 'Walnuts', 'Seeds, Pumpkin', 'Seeds, Sesame')
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
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'spicy' WHERE et.name = 'Food' AND l.name IN ('Chilli pepper', 'Kimchi', 'Hot sauce')
UNION ALL
-- fermented
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'fermented' WHERE et.name = 'Food' AND l.name IN ('Yogurt', 'Kimchi', 'Sauerkraut')
UNION ALL
-- high_sugar
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'high_sugar' WHERE et.name = 'Food' AND l.name IN ('Soda', 'Fruit juice', 'Candy', 'Wine', 'Ice cream')
UNION ALL
-- high_sodium
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'high_sodium' WHERE et.name = 'Food' AND l.name IN ('Crisps', 'Chips, Corn', 'Crackers', 'Deli meat', 'Hot sauce')
UNION ALL
-- processed (ultra-processed foods)
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'processed' WHERE et.name = 'Food' AND l.name IN ('Crisps', 'Chips, Corn', 'Crackers', 'Candy', 'Soda', 'Deli meat', 'Ice cream', 'Mayonnaise', 'Fruit juice', 'Milk, Almond', 'Milk, Oat')
