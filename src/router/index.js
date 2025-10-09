import { createRouter, createWebHistory } from 'vue-router';
import TraceViewer from '../components/runtime/components/TraceViewer.vue';
import TraceDetails from '../components/runtime/components/TraceDetailsNew.vue';
import WelcomePage from '../components/Welcome.vue';
import RuntimeAnalysis from '../components/runtime/components/RuntimeAnalysis.vue';
import SetLanguage from '../components/Language.vue';
import StaticAnalysisLayout from '../views/StaticAnalysisLayout.vue';

const routes = [
  {
    path: '/',
    name: 'WelcomePage',
    component: WelcomePage,
  },
  {
    path: '/allgids',
    name: 'TraceViewer',
    component: TraceViewer,
    redirect: '/runtime-analysis',
    children: [
      {
        path: '/runtime-analysis/:projectPath?',
        name: 'RuntimeAnalysis',
        component: RuntimeAnalysis,
        props: true
      }
    ]
  },
  {
    path: '/trace/:gid',
    name: 'TraceDetails',
    component: TraceDetails,
  },
  {
    path: '/static-analysis',
    name: 'StaticAnalysis',
    component: StaticAnalysisLayout
  },
  {
    path: '/language',
    name: 'SetLanguage',
    component: SetLanguage
  }
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

export default router; 