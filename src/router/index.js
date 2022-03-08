import { createRouter, createWebHashHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    name: 'ElTable',
    component: () => import(/* webpackChunkName: "ElTable" */ '../views/Table/ElTable.vue'),
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
