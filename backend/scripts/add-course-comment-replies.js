const path = require('path');
const { sql } = require('../config/db');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });

const dbConfig = {
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'LearningPath_Base',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'sa123',
    port: parseInt(process.env.DB_PORT || '1433', 10),
    options: { encrypt: false, trustServerCertificate: true },
};

async function main() {
    await sql.connect(dbConfig);

    await new sql.Request().query(`
        IF COL_LENGTH('dbo.Course_Comments', 'ReplyContent') IS NULL
            ALTER TABLE dbo.Course_Comments ADD ReplyContent NVARCHAR(MAX) NULL;

        IF COL_LENGTH('dbo.Course_Comments', 'ReplyAt') IS NULL
            ALTER TABLE dbo.Course_Comments ADD ReplyAt DATETIME2 NULL;

        IF COL_LENGTH('dbo.Course_Comments', 'ReplyByUserId') IS NULL
            ALTER TABLE dbo.Course_Comments ADD ReplyByUserId INT NULL;
    `);

    console.log('Course_Comments reply columns are ready.');
    process.exit(0);
}

main().catch((err) => {
    console.error('Failed to add reply columns:', err.message);
    process.exit(1);
});
