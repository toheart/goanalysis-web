import { createRouter, createWebHistory } from 'vue-router';
import TraceViewer from '../components/runtime/components/TraceViewer.vue';
import TraceDetails from '../components/runtime/components/TraceDetailsNew.vue';
import WelcomePage from '../components/Welcome.vue';
import RuntimeAnalysis from '../components/runtime/components/RuntimeAnalysis.vue';
import SetLanguage from '../components/Language.vue';
import StaticAnalysisLayout from '../views/StaticAnalysisLayout.vue';
// 静态分析子视图（路由分离）
import StaticOverviewView from '../views/static/OverviewView.vue';
import StaticPackagesView from '../views/static/PackagesView.vue';
// 函数搜索视图
import StaticFunctionSearchView from '../views/static/FunctionSearchView.vue';

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
    component: StaticAnalysisLayout,
    redirect: { name: 'StaticOverview' },
    children: [
      {
        path: 'overview',
        name: 'StaticOverview',
        component: StaticOverviewView
      },
      {
        path: 'packages',
        name: 'StaticPackages',
        component: StaticPackagesView
      },
      {
        path: 'search',
        name: 'StaticFunctionSearch',
        component: StaticFunctionSearchView
      }
    ]
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

// 兼容旧链接：/static-analysis?tab=overview|packages|hotfunctions → 新路由
router.beforeEach((to, from, next) => {
  if (to.path === '/static-analysis' && typeof to.query.tab === 'string') {
    const map = {
      overview: { name: 'StaticOverview' },
      packages: { name: 'StaticPackages' },
      hotfunctions: { name: 'StaticHotFunctions' },
    };
    const target = map[to.query.tab];
    if (target) return next(target);
  }
  next();
});

export default router; 