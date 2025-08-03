-- ROLES
CREATE TABLE IF NOT EXISTS `roles` 
    (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `name` varchar(10) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
            PRIMARY KEY (`id`),
            UNIQUE KEY `name` (`name`)
    ) 
ENGINE=InnoDB DEFAULT CHARSET=ascii COLLATE=ascii_bin;

    -- Add default roles
    INSERT IGNORE INTO `roles` (name) VALUES ('admin'), ('user');


-- ACCOUNTS
CREATE TABLE IF NOT EXISTS `accounts` 
    (
        `id` varchar(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, 
        `username` varchar(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, 
        `nickname` text COLLATE utf8mb4_bin, 
        `url` varchar(1000) CHARACTER SET ascii COLLATE ascii_bin, 
        `password` varchar(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, 
        `created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, 
        `role` varchar(10) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, 
            PRIMARY KEY (`id`), 
            UNIQUE KEY `username` (`username`),
            CONSTRAINT `fk_role_user` 
                FOREIGN KEY (`role`) REFERENCES `roles`(`name`) 
                ON UPDATE CASCADE
    ) 
ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;


-- AUTHENTICATION
CREATE TABLE IF NOT EXISTS `authentication` 
    (
        `id` int(11) NOT NULL AUTO_INCREMENT, 
        `user` varchar(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, 
        `ip` varchar(45) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        `time` varchar(25) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, 
            PRIMARY KEY (`id`),
            CONSTRAINT `fk_authentication_user` 
                FOREIGN KEY (`user`) REFERENCES `accounts`(`id`) 
                ON DELETE CASCADE
                ON UPDATE CASCADE
    ) 
ENGINE=InnoDB DEFAULT CHARSET=ascii COLLATE=ascii_bin;


-- AUDIT LOG
CREATE TABLE IF NOT EXISTS `auditlog` 
    (
        `id` int(11) NOT NULL AUTO_INCREMENT, 
        `user` varchar(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, 
        `from` tinytext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin, 
        `to` tinytext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin, 
        `reference` varchar(128) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL, 
        `type` varchar(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, 
        `time` varchar(25) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, 
            PRIMARY KEY (`id`), 
            CONSTRAINT `fk_auditlog_user` 
                FOREIGN KEY (`user`) REFERENCES `accounts`(`id`) 
                ON DELETE CASCADE
                ON UPDATE CASCADE
    ) 
ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=155;


-- COURSES
CREATE TABLE IF NOT EXISTS `courses` 
    (
        `id` varchar(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, 
        `name` varchar(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, 
        `alias` varchar(16) CHARACTER SET ascii COLLATE ascii_bin, 
        `description` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin, 
        `semester` int NOT NULL, 
        `sks` int NOT NULL,
            PRIMARY KEY (`id`), 
            UNIQUE KEY `name` (`name`)
    ) 
ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;


-- TOPICS
CREATE TABLE IF NOT EXISTS `topics` 
    (
        `id` int UNSIGNED NOT NULL AUTO_INCREMENT, 
        `name` varchar(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, 
        `course` varchar(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        `problemcount` int UNSIGNED DEFAULT 0 NOT NULL,
        `lastedited` bigint UNSIGNED DEFAULT 0 NOT NULL,
        `sort` int NOT NULL,
            PRIMARY KEY (`id`), 
            CONSTRAINT `fk_topic_id` 
                FOREIGN KEY (`course`) REFERENCES `courses`(`id`) 
                ON DELETE CASCADE
                ON UPDATE CASCADE
    ) 
ENGINE=InnoDB DEFAULT CHARSET=ascii COLLATE=ascii_bin;


-- PROBLEM SOURCES
CREATE TABLE IF NOT EXISTS `problem_sources` 
    (
        `id` int UNSIGNED NOT NULL AUTO_INCREMENT, 
        `name` varchar(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
            PRIMARY KEY (`id`), 
            UNIQUE KEY `name` (`name`)
    ) 
ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;


-- PROBLEMS
CREATE TABLE IF NOT EXISTS `problems` 
    (
        `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, 
        `question` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        `solution` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
        `source` int UNSIGNED NOT NULL, 
        `year` int NOT NULL, 
        `topic` int UNSIGNED NOT NULL,
        `course` varchar(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, 
        `timeadded` bigint UNSIGNED NOT NULL, 
        `lastedited` bigint UNSIGNED NOT NULL,
            PRIMARY KEY (`id`),
            CONSTRAINT `fk_problem_source` 
                FOREIGN KEY (`source`) REFERENCES `problem_sources`(`id`) 
                ON UPDATE CASCADE,
            CONSTRAINT `fk_course_topic` 
                FOREIGN KEY (`topic`) REFERENCES `topics`(`id`) 
                ON DELETE CASCADE
                ON UPDATE CASCADE,
            CONSTRAINT `fk_course_id` 
                FOREIGN KEY (`course`) REFERENCES `courses`(`id`) 
                ON DELETE CASCADE
                ON UPDATE CASCADE
    ) 
ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

    -- Triggers
    DROP TRIGGER IF EXISTS trg_problem_insert;
    CREATE TRIGGER `trg_problem_insert` AFTER INSERT ON problems FOR EACH ROW BEGIN
        UPDATE topics
        SET 
            problemcount = problemcount + 1,
            lastedited = GREATEST(lastedited, IFNULL(NEW.lastedited, NEW.timeadded))
        WHERE id = NEW.topic\;
    END;
    
    DROP TRIGGER IF EXISTS trg_problem_delete;
    CREATE TRIGGER `trg_problem_delete` AFTER DELETE ON problems FOR EACH ROW BEGIN
        UPDATE topics
        SET 
            problemcount = problemcount - 1,
            lastedited = (
                SELECT IFNULL(MAX(GREATEST(IFNULL(lastedited, 0), timeadded)), 0)
                FROM problems
                WHERE topic = OLD.topic
            )
        WHERE id = OLD.topic\;
    END;

    DROP TRIGGER IF EXISTS trg_problem_update;
    CREATE TRIGGER `trg_problem_update` AFTER UPDATE ON problems FOR EACH ROW BEGIN
        IF OLD.topic != NEW.topic THEN
            -- Remove count on old topic
            UPDATE topics
            SET 
                problemcount = problemcount - 1,
                lastedited = (
                    SELECT IFNULL(MAX(GREATEST(IFNULL(lastedited, 0), timeadded)), 0)
                    FROM problems
                    WHERE topic = OLD.topic
                )
            WHERE id = OLD.topic\;

            -- Add count on new topic
            UPDATE topics
            SET 
                problemcount = problemcount + 1,
                lastedited = GREATEST(lastedited, IFNULL(NEW.lastedited, NEW.timeadded))
            WHERE id = NEW.topic\;

        ELSE
            -- Only update last edited
            UPDATE topics
            SET 
                lastedited = (
                    SELECT MAX(GREATEST(IFNULL(lastedited, 0), timeadded))
                    FROM problems
                    WHERE topic = NEW.topic
                )
            WHERE id = NEW.topic\;
        END IF\;
    END;