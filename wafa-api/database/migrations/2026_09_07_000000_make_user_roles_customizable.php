<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            $tableSql = DB::selectOne("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'")?->sql ?? '';
            if (!str_contains($tableSql, 'CHECK(role IN')) {
                return;
            }

            DB::statement('PRAGMA foreign_keys = OFF');
            DB::beginTransaction();
            try {
                DB::statement(<<<'SQL'
CREATE TABLE users_custom_role (
    id VARCHAR PRIMARY KEY,
    username VARCHAR NOT NULL UNIQUE,
    display_name VARCHAR NOT NULL,
    password VARCHAR NOT NULL,
    role VARCHAR(120) NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    permissions_customized INTEGER NOT NULL DEFAULT 0,
    created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
    last_login_at DATETIME,
    remember_token VARCHAR,
    created_at DATETIME,
    updated_at DATETIME,
    deleted_at DATETIME
)
SQL);
                DB::statement(<<<'SQL'
INSERT INTO users_custom_role
(id, username, display_name, password, role, active, permissions_customized, created_by, last_login_at, remember_token, created_at, updated_at, deleted_at)
SELECT id, username, display_name, password, role, active, permissions_customized, created_by, last_login_at, remember_token, created_at, updated_at, deleted_at
FROM users
SQL);
                DB::statement('DROP TABLE users');
                DB::statement('ALTER TABLE users_custom_role RENAME TO users');
                DB::statement('CREATE INDEX users_role_index ON users(role)');
                DB::commit();
            } catch (Throwable $e) {
                DB::rollBack();
                throw $e;
            } finally {
                DB::statement('PRAGMA foreign_keys = ON');
            }
            return;
        }

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement('ALTER TABLE users MODIFY role VARCHAR(120) NOT NULL');
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 120)->change();
        });
    }

    public function down(): void
    {
        // Intentionally keep role as free text to avoid losing custom user types on rollback.
    }
};
