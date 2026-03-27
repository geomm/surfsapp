<template>
  <div class="dev-nav">
    <h2>Dev Navigation</h2>
    <ul>
      <li><RouterLink to="/design">Design System</RouterLink></li>
      <li><RouterLink to="/components">Component Library</RouterLink></li>
      <li><a href="http://localhost:3000/beaches" target="_blank">GET /beaches (JSON)</a></li>
    </ul>
  </div>
</template>

<style scoped>
.dev-nav {
  padding: var(--space-6);
  font-family: var(--font-family-base);
}
.dev-nav h2 {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--space-4);
  color: var(--color-text-primary);
}
.dev-nav ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.dev-nav a {
  color: var(--color-primary);
  font-size: var(--font-size-md);
  text-decoration: none;
}
.dev-nav a:hover {
  text-decoration: underline;
}
</style>
