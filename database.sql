
-- ==========================================================
-- DATABASE SCHEMA FOR YTMANAGER PRO V2.5
-- Tối ưu hóa cho MySQL 8.0+ / MariaDB
-- Đồng bộ hoàn toàn với logic dbService.ts và types.ts
-- ==========================================================

CREATE DATABASE IF NOT EXISTS yt_pro;
USE yt_pro;

-- 1. Bảng Người dùng (Nhân sự & Admin)
-- Chỉnh sửa avatar_url thành LONGTEXT để hỗ trợ lưu trữ ảnh Base64 trực tiếp từ PC
CREATE TABLE IF NOT EXISTS `users` (
    `id` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('ADMIN', 'USER') DEFAULT 'USER',
    `status` ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    `avatar_url` LONGTEXT, -- Chứa chuỗi Base64 hoặc URL
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Bảng Kênh YouTube
CREATE TABLE IF NOT EXISTS `channels` (
    `id` VARCHAR(50) NOT NULL, -- YouTube Channel ID (UC...)
    `name` VARCHAR(255) NOT NULL,
    `niche` VARCHAR(100) DEFAULT 'General',
    `subscriber_count` BIGINT DEFAULT 0,
    `view_count` BIGINT DEFAULT 0,
    `status` ENUM('LIVE', 'SUSPENDED', 'WARNING') DEFAULT 'LIVE',
    `gmail` VARCHAR(100),
    `last_checked` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `thumbnail_url` TEXT,
    `uploads_playlist_id` VARCHAR(100),
    `is_monetized` BOOLEAN DEFAULT FALSE,
    `assigned_staff_id` VARCHAR(50),
    `network_name` VARCHAR(100),
    `revenue_share_percent` DECIMAL(5,2) DEFAULT 100.00,
    `channel_category` VARCHAR(50),
    `channel_origin` ENUM('COLD', 'NET') DEFAULT 'COLD',
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_staff_assignment` 
        FOREIGN KEY (`assigned_staff_id`) REFERENCES `users`(`id`) 
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Bảng Doanh thu thủ công (Manual Revenue Data)
-- Đồng bộ với manualRevenueData: Record<number, number[]>
CREATE TABLE IF NOT EXISTS `manual_revenue` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `channel_id` VARCHAR(50) NOT NULL,
    `year` INT NOT NULL,
    `month` TINYINT NOT NULL CHECK (`month` BETWEEN 1 AND 12),
    `amount` DECIMAL(15,2) DEFAULT 0.00,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_channel_year_month` (`channel_id`, `year`, `month`),
    CONSTRAINT `fk_revenue_channel` 
        FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) 
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Bảng Tài khoản Google (Google Accounts / OAuth Tokens)
CREATE TABLE IF NOT EXISTS `google_accounts` (
    `email` VARCHAR(100) NOT NULL,
    `access_token` TEXT NOT NULL,
    `refresh_token` TEXT,
    `expiry_date` BIGINT NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Bảng liên kết Google Account với Channel (Ownership)
-- Đồng bộ với ownedChannelIds trong dbService
CREATE TABLE IF NOT EXISTS `account_channels` (
    `account_email` VARCHAR(100) NOT NULL,
    `channel_id` VARCHAR(50) NOT NULL,
    PRIMARY KEY (`account_email`, `channel_id`),
    CONSTRAINT `fk_junction_account` 
        FOREIGN KEY (`account_email`) REFERENCES `google_accounts`(`email`) 
        ON DELETE CASCADE,
    CONSTRAINT `fk_junction_channel` 
        FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) 
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Bảng Nhật ký hệ thống (System Logs)
CREATE TABLE IF NOT EXISTS `system_logs` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `level` ENUM('INFO', 'SUCCESS', 'WARNING', 'ERROR') DEFAULT 'INFO',
    `message` TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Bảng Cấu hình hệ thống (System Config)
CREATE TABLE IF NOT EXISTS `system_config` (
    `id` INT PRIMARY KEY DEFAULT 1,
    `client_id` TEXT,
    `client_secret` TEXT,
    `api_keys` JSON, -- Lưu mảng chuỗi API keys
    `active_key_index` INT DEFAULT 0,
    `is_api_active` BOOLEAN DEFAULT TRUE,
    `language` ENUM('vi', 'en') DEFAULT 'vi',
    `redirect_uri_override` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Bảng Tác vụ (Upload Tasks)
CREATE TABLE IF NOT EXISTS `upload_tasks` (
    `id` VARCHAR(50) PRIMARY KEY,
    `channel_id` VARCHAR(50),
    `video_title` VARCHAR(255),
    `status` ENUM('PENDING', 'UPLOADING', 'COMPLETED', 'FAILED') DEFAULT 'PENDING',
    `progress` INT DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_task_channel` 
        FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) 
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- DỮ LIỆU KHỞI TẠO (SEED DATA)
-- ==========================================================

-- Tạo tài khoản Admin mặc định
INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `status`, `avatar_url`) 
VALUES (
    'admin-001', 
    'Hệ Thống Admin', 
    'admin', 
    '1', 
    'ADMIN', 
    'ACTIVE', 
    'https://i.pravatar.cc/150?u=admin-studio'
) ON DUPLICATE KEY UPDATE `email`=`email`;

-- Khởi tạo cấu hình hệ thống ban đầu
INSERT INTO `system_config` (`id`, `language`, `api_keys`) 
VALUES (1, 'vi', '[]')
ON DUPLICATE KEY UPDATE `id`=`id`;

-- Ghi log hệ thống đầu tiên
INSERT INTO `system_logs` (`level`, `message`) 
VALUES ('SUCCESS', 'Hệ thống khởi tạo thành công với cấu trúc Database MySQL compatible v2.5.');
