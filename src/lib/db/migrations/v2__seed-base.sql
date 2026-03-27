-- measurement_type
INSERT OR IGNORE INTO measurement_type (name, display_name) VALUES
  ('numeric', 'Numeric'),
  ('label_select', 'Label Select'),
  ('label_select_severity', 'Label Select with Severity');

-- entry_type
INSERT OR IGNORE INTO entry_type (name, measurement_type_id, title, prompt, icon, is_enabled, is_default, sort_order)
SELECT 'Sleep', id, 'Slumber', 'How long did you rest?', 'weather-night', 1, 1, 5 FROM measurement_type WHERE name = 'numeric'
UNION ALL
SELECT 'Hydration', id, 'Replenish', 'How much water did you take in?', 'water-pump', 1, 1, 2 FROM measurement_type WHERE name = 'numeric'
UNION ALL
SELECT 'Food', id, 'Nourish', 'What nourished you?', 'pot-steam-outline', 1, 1, 1 FROM measurement_type WHERE name = 'label_select'
UNION ALL
SELECT 'Emotion', id, 'Unveil', 'What''s upon your heart?', 'candle', 1, 1, 3 FROM measurement_type WHERE name = 'label_select'
UNION ALL
SELECT 'Physical', id, 'Attune', 'How fares your body?', 'hand-heart-outline', 1, 1, 4 FROM measurement_type WHERE name = 'label_select_severity'
UNION ALL
SELECT 'Activity', id, 'Journey', 'What have you been about?', 'compass-rose', 1, 1, 6 FROM measurement_type WHERE name = 'label_select';
