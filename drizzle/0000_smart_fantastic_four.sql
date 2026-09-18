CREATE TABLE `interviewQuestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`questionKey` varchar(64) NOT NULL,
	`category` varchar(120) NOT NULL,
	`question` text NOT NULL,
	`why` text NOT NULL,
	`followUp` text NOT NULL,
	`answerNote` text,
	`feedbackJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `interviewQuestions_id` PRIMARY KEY(`id`),
	CONSTRAINT `interview_owner_question_idx` UNIQUE(`userId`,`questionKey`)
);
--> statement-breakpoint
CREATE TABLE `studySessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionDate` varchar(10) NOT NULL,
	`minutes` int NOT NULL DEFAULT 25,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `studySessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`profileJson` text NOT NULL,
	`skillsJson` text NOT NULL,
	`projectsJson` text NOT NULL,
	`sqlJson` text NOT NULL,
	`studyLogJson` text NOT NULL,
	`weeklyGoal` int NOT NULL DEFAULT 5,
	`theme` varchar(16) NOT NULL DEFAULT 'light',
	`timerRemaining` int NOT NULL DEFAULT 1500,
	`timerSessions` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workspaces_id` PRIMARY KEY(`id`),
	CONSTRAINT `workspaces_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `workspaces_user_idx` UNIQUE(`userId`)
);
