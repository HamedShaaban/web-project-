CREATE TABLE `skillProgressHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`skillId` int NOT NULL,
	`skillName` varchar(180) NOT NULL,
	`status` varchar(40) NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `skillProgressHistory_id` PRIMARY KEY(`id`)
);
