# Local Development Setup Guide

## Step-by-Step Instructions

1. **Verify Node & pnpm**:
   ```bash
   node -v # Should be >= 20
   pnpm -v # Should be >= 9
   ```

2. **Install Workspace Dependencies**:
   ```bash
   pnpm install
   ```

3. **Build Shared Packages**:
   ```bash
   pnpm run build:packages
   ```

4. **Generate Database Client**:
   ```bash
   pnpm run db:generate
   ```

5. **Start Applications**:
   ```bash
   pnpm dev
   ```
