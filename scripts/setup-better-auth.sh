#!/bin/bash

# Better-Auth Setup Script
# This script helps you set up Better-Auth in your EixoGlobal ERP project

set -e

echo "🚀 Better-Auth Setup Script"
echo "============================"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local not found. Creating from example..."
    cp .env.better-auth.example .env.local
    
    # Generate secret
    SECRET=$(openssl rand -base64 32)
    echo "" >> .env.local
    echo "BETTER_AUTH_SECRET=\"$SECRET\"" >> .env.local
    
    echo "✅ Created .env.local with generated secret"
    echo "⚠️  Please edit .env.local and configure your database and other settings"
    echo ""
else
    echo "✅ .env.local already exists"
    echo ""
fi

# Check if DATABASE_URL is set
if ! grep -q "DATABASE_URL=" .env.local; then
    echo "❌ DATABASE_URL not found in .env.local"
    echo "Please add your database URL to .env.local"
    exit 1
fi

# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

echo "📊 Running database migration..."
echo ""

# Check if psql is available
if command -v psql &> /dev/null; then
    echo "Using psql to run migration..."
    psql "$DATABASE_URL" -f drizzle/migrations/add_better_auth_tables.sql
    echo "✅ Migration completed successfully!"
else
    echo "⚠️  psql not found. Please run the migration manually:"
    echo "   psql \$DATABASE_URL -f drizzle/migrations/add_better_auth_tables.sql"
    echo ""
    echo "Or use Drizzle Kit:"
    echo "   npx drizzle-kit push:pg"
fi

echo ""
echo "✅ Better-Auth setup complete!"
echo ""
echo "Next steps:"
echo "1. Review .env.local and configure all required variables"
echo "2. Create auth pages in app/auth/ (login, register, etc.)"
echo "3. Test the authentication flow"
echo "4. Configure email sending for verification"
echo ""
echo "📖 See BETTER_AUTH_SETUP.md for detailed documentation"
echo "🚀 See QUICK_START.md for quick examples"
