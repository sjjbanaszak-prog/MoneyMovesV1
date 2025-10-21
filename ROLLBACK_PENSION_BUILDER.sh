#!/bin/bash

# Pension Builder Enhancement Rollback Script
# This script reverts the Pension Builder to its previous state

echo "🔄 Rolling back Pension Builder changes..."

# Check if backup files exist
if [ ! -f "src/pages/PensionBuilderNEW.js.backup" ] || [ ! -f "src/pages/PensionBuilderStyles.css.backup" ]; then
    echo "❌ Error: Backup files not found!"
    echo "Cannot rollback without backup files."
    exit 1
fi

# Restore backup files
cp src/pages/PensionBuilderNEW.js.backup src/pages/PensionBuilderNEW.js
cp src/pages/PensionBuilderStyles.css.backup src/pages/PensionBuilderStyles.css

echo "✅ Pension Builder files restored to previous state"
echo ""
echo "Backup files are preserved at:"
echo "  - src/pages/PensionBuilderNEW.js.backup"
echo "  - src/pages/PensionBuilderStyles.css.backup"
echo ""
echo "You can safely delete backup files after confirming the rollback:"
echo "  rm src/pages/PensionBuilderNEW.js.backup"
echo "  rm src/pages/PensionBuilderStyles.css.backup"
