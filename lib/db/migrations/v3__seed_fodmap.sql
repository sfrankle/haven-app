-- FODMAP label_tag associations
--
-- Source: Monash University FODMAP research
-- https://www.monashfodmap.com/about-fodmap-and-ibs/high-and-low-fodmap-foods
--
-- Only foods explicitly listed as high-FODMAP by Monash are included.
-- Classifications are conservative and prioritise accuracy over completeness.
-- Update only when referencing a reliable medical source.

INSERT OR IGNORE INTO label_tag (label_id, tag_id, seed_version)
-- Vegetables
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'fodmap' WHERE et.name = 'Food' AND l.name IN ('Onion', 'Garlic', 'Leek', 'Mushroom', 'Asparagus', 'Artichoke', 'Bell pepper')
UNION ALL
-- Fruits
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'fodmap' WHERE et.name = 'Food' AND l.name IN ('Apple', 'Pear', 'Peach', 'Plum', 'Mango')
UNION ALL
-- Dairy (lactose)
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'fodmap' WHERE et.name = 'Food' AND l.name IN ('Milk', 'Ice cream', 'Yogurt')
UNION ALL
-- Legumes
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'fodmap' WHERE et.name = 'Food' AND l.name IN ('Beans', 'Lentils', 'Hummus')
UNION ALL
-- Grains (wheat/rye/barley — fructans)
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'fodmap' WHERE et.name = 'Food' AND l.name IN ('Bread', 'Pasta', 'Couscous', 'Beer')
UNION ALL
-- Nuts
SELECT l.id, t.id, 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id JOIN tag t ON t.name = 'fodmap' WHERE et.name = 'Food' AND l.name IN ('Cashews', 'Pistachios');
