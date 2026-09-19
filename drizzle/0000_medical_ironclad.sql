CREATE TABLE `request_budgets` (
	`bucket` text PRIMARY KEY NOT NULL,
	`window` integer NOT NULL,
	`count` integer NOT NULL
);
