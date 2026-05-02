import { createRouter, createWebHistory } from 'vue-router';
import HomeView from './views/HomeView.vue';
import DesignPreview from './views/DesignPreview.vue';
import ComponentsPreview from './views/ComponentsPreview.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomeView },
    {
      path: '/beaches/:id',
      name: 'beach-detail',
      component: () => import('./views/BeachDetailView.vue'),
    },
    {
      path: '/map',
      name: 'beach-map',
      component: () => import('./views/MapView.vue'),
    },
    { path: '/design', component: DesignPreview },
    { path: '/components', component: ComponentsPreview },
  ],
});

export default router;
