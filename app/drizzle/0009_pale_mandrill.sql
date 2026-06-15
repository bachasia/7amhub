ALTER TABLE `sources` ADD `group` text;
--> statement-breakpoint
UPDATE `sources` SET `group` = substr(`label`, 1, instr(`label`, ' · ') - 1) WHERE instr(`label`, ' · ') > 0;
