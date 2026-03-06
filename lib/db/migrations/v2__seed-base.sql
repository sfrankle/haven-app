-- measurement_type
INSERT OR IGNORE INTO measurement_type (name, display_name) VALUES
  ('numeric', 'Numeric'),
  ('label_select', 'Label Select'),
  ('label_select_severity', 'Label Select with Severity');

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



