/**
 * Automated Deployment Database Migration & Seeding Script
 * 
 * Runs automatically during deployment (e.g., on Vercel build)
 * to ensure PostgreSQL tables are synchronized with prisma/schema.prisma
 * and default Bayero University Kano records (Admin, Faculties, Units, Venues)
 * are seeded without needing manual terminal commands.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run() {
  if (process.env.SKIP_DB_DEPLOY === 'true' || process.env.SKIP_DB_DEPLOY === '1') {
    console.log('⏭️  [deploy-db] SKIP_DB_DEPLOY is set. Skipping automated DB deployment.');
    return;
  }

  // Load .env if DATABASE_URL is not set in environment
  if (!process.env.DATABASE_URL) {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/^DATABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?/m);
      if (match) {
        process.env.DATABASE_URL = match[1];
      }
    }
  }

  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    console.log('⚠️  [deploy-db] DATABASE_URL is not defined.');
    console.log('⏭️  Skipping automated database migration & seed.');
    return;
  }

  // Validate that DATABASE_URL is a PostgreSQL connection
  const isPostgres = dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://');
  if (!isPostgres) {
    console.log(`⚠️  [deploy-db] DATABASE_URL is not a PostgreSQL URL (provider is postgresql).`);
    console.log('⏭️  Skipping automated database push to avoid schema mismatch.');
    return;
  }

  console.log('====================================================');
  console.log('⚡ [BUK-FRAS] Automated Deployment Database Sync');
  console.log('====================================================');

  try {
    console.log('\n📦 Step 1: Pushing Prisma schema to PostgreSQL database...');
    execSync('npx prisma db push --accept-data-loss', {
      stdio: 'inherit',
      shell: true,
      env: process.env,
    });
    console.log('✅ Schema synchronization completed successfully.');

    console.log('\n🌱 Step 2: Seeding default Bayero University Kano records...');
    execSync('node prisma/seed.js', {
      stdio: 'inherit',
      shell: true,
      env: process.env,
    });
    console.log('✅ Database seeding completed successfully.');

    console.log('\n🎉 [BUK-FRAS] Database is ready for live production traffic!');
    console.log('====================================================\n');
  } catch (error) {
    console.error('\n❌ [deploy-db] Failed to execute database push or seed:');
    console.error(error.message);
    process.exit(1);
  }
}

run();
