-- measurement_type
INSERT OR IGNORE INTO measurement_type (name, display_name) VALUES
  ('numeric', 'Numeric'),
  ('label_select', 'Label Select'),
  ('label_select_severity', 'Label Select with Severity');

-- entry_type
INSERT OR IGNORE INTO entry_type (name, measurement_type_id, title, prompt, icon, is_enabled, is_default, sort_order)
SELECT 'Sleep', id, 'Slumber', 'How many hours did you sleep?', 'cloud-moon', 1, 1, 5 FROM measurement_type WHERE name = 'numeric'
UNION ALL
SELECT 'Hydration', id, 'Replenish', 'How much did you drink?', 'tint', 1, 1, 2 FROM measurement_type WHERE name = 'numeric'
UNION ALL
SELECT 'Food', id, 'Nourish', 'What did you eat?', 'apple-alt', 1, 1, 1 FROM measurement_type WHERE name = 'label_select'
UNION ALL
SELECT 'Emotion', id, 'Unveil', 'How are you feeling?', 'hand-holding-heart', 1, 1, 3 FROM measurement_type WHERE name = 'label_select'
UNION ALL
SELECT 'Physical', id, 'Attune', 'How does your body feel?', 'child', 1, 1, 4 FROM measurement_type WHERE name = 'label_select_severity'
UNION ALL
SELECT 'Activity', id, 'Journey', 'What did you do?', 'hand-sparkles', 1, 1, 6 FROM measurement_type WHERE name = 'label_select';
