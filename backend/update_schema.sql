USE crop_project;

ALTER TABLE seed_batches 
ADD COLUMN seed_variety VARCHAR(255) AFTER seed_name,
ADD COLUMN crop_type VARCHAR(255) AFTER seed_variety,
ADD COLUMN manufacturer_id INT AFTER crop_type;
