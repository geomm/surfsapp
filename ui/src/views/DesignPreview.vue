<template>
  <div class="design-preview">
    <h1>Design System Preview</h1>

    <!-- Section 1: Colour Palette -->
    <section>
      <h2>Colour Palette</h2>

      <h3>Ocean</h3>
      <div class="swatch-row">
        <div v-for="token in oceanTokens" :key="token.name" class="swatch">
          <div class="swatch-box" :style="{ backgroundColor: `var(${token.name})` }"></div>
          <span class="swatch-label">{{ token.name }}</span>
        </div>
      </div>

      <h3>Sand</h3>
      <div class="swatch-row">
        <div v-for="token in sandTokens" :key="token.name" class="swatch">
          <div class="swatch-box" :style="{ backgroundColor: `var(${token.name})` }"></div>
          <span class="swatch-label">{{ token.name }}</span>
        </div>
      </div>

      <h3>Neutral</h3>
      <div class="swatch-row">
        <div v-for="token in neutralTokens" :key="token.name" class="swatch">
          <div class="swatch-box" :style="{ backgroundColor: `var(${token.name})` }"></div>
          <span class="swatch-label">{{ token.name }}</span>
        </div>
      </div>

      <h3>Surf Score</h3>
      <div class="swatch-row">
        <div v-for="token in surfScoreTokens" :key="token.name" class="swatch">
          <div class="swatch-box" :style="{ backgroundColor: `var(${token.name})` }"></div>
          <span class="swatch-label">{{ token.name }}</span>
        </div>
      </div>

      <h3>UI Aliases</h3>
      <div class="swatch-row">
        <div v-for="token in uiAliasTokens" :key="token.name" class="swatch">
          <div class="swatch-box" :style="{ backgroundColor: `var(${token.name})` }"></div>
          <span class="swatch-label">{{ token.name }}</span>
        </div>
      </div>
    </section>

    <!-- Section 2: Spacing Scale -->
    <section>
      <h2>Spacing Scale</h2>
      <div class="spacing-list">
        <div v-for="token in spacingTokens" :key="token.name" class="spacing-row">
          <span class="spacing-label">{{ token.name }} ({{ token.value }})</span>
          <div class="spacing-bar" :style="{ width: `var(${token.name})`, height: '16px', backgroundColor: 'var(--color-primary)' }"></div>
        </div>
      </div>
    </section>

    <!-- Section 3: Typography -->
    <section>
      <h2>Typography</h2>
      <div class="type-list">
        <div v-for="token in typographyTokens" :key="token.name" class="type-row">
          <span class="type-label">{{ token.name }}</span>
          <span :style="{ fontSize: `var(${token.name})` }">The quick brown fox</span>
        </div>
      </div>
    </section>

    <!-- Section 4: Z-Index -->
    <section>
      <h2>Z-Index</h2>
      <table class="z-table">
        <thead>
          <tr>
            <th>Token</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="token in zIndexTokens" :key="token.name">
            <td>{{ token.name }}</td>
            <td>{{ token.value }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup lang="ts">
const oceanTokens = [
  { name: '--color-ocean-50' },
  { name: '--color-ocean-100' },
  { name: '--color-ocean-200' },
  { name: '--color-ocean-300' },
  { name: '--color-ocean-400' },
  { name: '--color-ocean-500' },
  { name: '--color-ocean-600' },
  { name: '--color-ocean-700' },
  { name: '--color-ocean-800' },
  { name: '--color-ocean-900' },
]

const sandTokens = [
  { name: '--color-sand-50' },
  { name: '--color-sand-100' },
  { name: '--color-sand-200' },
  { name: '--color-sand-300' },
  { name: '--color-sand-400' },
  { name: '--color-sand-500' },
  { name: '--color-sand-600' },
  { name: '--color-sand-700' },
  { name: '--color-sand-800' },
  { name: '--color-sand-900' },
]

const neutralTokens = [
  { name: '--color-neutral-0' },
  { name: '--color-neutral-50' },
  { name: '--color-neutral-100' },
  { name: '--color-neutral-200' },
  { name: '--color-neutral-300' },
  { name: '--color-neutral-400' },
  { name: '--color-neutral-500' },
  { name: '--color-neutral-600' },
  { name: '--color-neutral-700' },
  { name: '--color-neutral-800' },
  { name: '--color-neutral-900' },
]

const surfScoreTokens = [
  { name: '--color-surf-very-good' },
  { name: '--color-surf-good' },
  { name: '--color-surf-maybe' },
  { name: '--color-surf-poor' },
]

const uiAliasTokens = [
  { name: '--color-background' },
  { name: '--color-surface' },
  { name: '--color-text-primary' },
  { name: '--color-text-secondary' },
  { name: '--color-border' },
  { name: '--color-primary' },
  { name: '--color-accent' },
]

const spacingTokens = [
  { name: '--space-1', value: '4px' },
  { name: '--space-2', value: '8px' },
  { name: '--space-3', value: '12px' },
  { name: '--space-4', value: '16px' },
  { name: '--space-5', value: '20px' },
  { name: '--space-6', value: '24px' },
  { name: '--space-7', value: '28px' },
  { name: '--space-8', value: '32px' },
  { name: '--space-9', value: '36px' },
  { name: '--space-10', value: '40px' },
  { name: '--space-11', value: '44px' },
  { name: '--space-12', value: '48px' },
]

const typographyTokens = [
  { name: '--font-size-xs' },
  { name: '--font-size-sm' },
  { name: '--font-size-md' },
  { name: '--font-size-lg' },
  { name: '--font-size-xl' },
  { name: '--font-size-2xl' },
  { name: '--font-size-3xl' },
  { name: '--font-size-4xl' },
]

const zIndexTokens = [
  { name: '--z-below', value: '-1' },
  { name: '--z-base', value: '0' },
  { name: '--z-raised', value: '10' },
  { name: '--z-dropdown', value: '100' },
  { name: '--z-overlay', value: '200' },
  { name: '--z-modal', value: '300' },
  { name: '--z-toast', value: '400' },
]
</script>

<style scoped>
.design-preview {
  padding: var(--space-6);
  max-width: 1200px;
  margin: 0 auto;
}

section {
  margin-bottom: var(--space-12);
}

.swatch-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.swatch {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
}

.swatch-box {
  width: 48px;
  height: 48px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

.swatch-label {
  font-size: var(--font-size-xs);
  text-align: center;
  word-break: break-all;
  max-width: 80px;
}

.spacing-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.spacing-row {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.spacing-label {
  font-size: var(--font-size-sm);
  width: 200px;
  flex-shrink: 0;
}

.type-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.type-row {
  display: flex;
  align-items: baseline;
  gap: var(--space-4);
}

.type-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  width: 180px;
  flex-shrink: 0;
}

.z-table {
  border-collapse: collapse;
  width: 400px;
}

.z-table th,
.z-table td {
  border: 1px solid var(--color-border);
  padding: var(--space-2) var(--space-3);
  text-align: left;
}

.z-table th {
  background-color: var(--color-surface);
  font-weight: var(--font-weight-semibold);
}
</style>
