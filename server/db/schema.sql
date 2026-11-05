-- Tables are created automatically when the server starts (CREATE TABLE IF NOT EXISTS).
-- You can also run this file by hand in phpMyAdmin / MySQL Workbench.

CREATE TABLE IF NOT EXISTS admins (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(200) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bookings (
  id VARCHAR(20) NOT NULL PRIMARY KEY,
  booking_type VARCHAR(10) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Confirmed',
  operator_id VARCHAR(40) NOT NULL,
  operator_name VARCHAR(80) NOT NULL,
  from_city VARCHAR(40) NOT NULL,
  to_city VARCHAR(40) NOT NULL,
  via VARCHAR(40) NULL,
  travel_date CHAR(10) NOT NULL,
  dep_time VARCHAR(12) NULL,
  class_label VARCHAR(80) NULL,
  contact_name VARCHAR(80) NOT NULL,
  contact_cnic VARCHAR(20) NOT NULL,
  contact_phone VARCHAR(20) NOT NULL,
  phone_key VARCHAR(20) NOT NULL,
  current_city VARCHAR(60) NOT NULL,
  pickup_lat DOUBLE NULL,
  pickup_lng DOUBLE NULL,
  seats TEXT NOT NULL,
  passengers TEXT NOT NULL,
  payment_method VARCHAR(20) NULL,
  base_amount INT NOT NULL,
  service_fee INT NOT NULL,
  total_amount INT NOT NULL,
  created_at VARCHAR(30) NOT NULL,
  cancelled_at VARCHAR(30) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One row per booked seat. The PRIMARY KEY makes it impossible for two
-- bookings to hold the same seat on the same trip, even with many servers.
CREATE TABLE IF NOT EXISTS booking_seats (
  slot_key VARCHAR(150) NOT NULL,
  seat VARCHAR(8) NOT NULL,
  booking_id VARCHAR(20) NOT NULL,
  PRIMARY KEY (slot_key, seat),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  email VARCHAR(120) NOT NULL,
  message TEXT NOT NULL,
  created_at VARCHAR(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
