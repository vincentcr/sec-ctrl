CREATE USER :DB_USER with password :'DB_PASSWORD';
CREATE DATABASE :DB_NAME owner :DB_USER;

\c :DB_NAME
CREATE EXTENSION pgcrypto;
