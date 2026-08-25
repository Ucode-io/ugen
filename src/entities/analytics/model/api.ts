import { Period, ServiceHealth, OverviewMetric, DeploymentInfo, ChartDataPoint, QueryPerformanceMetric, VisitorStats, VisitorBreakdown, VisitorMetric } from './types';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const generatePoints = (count: number, keys: string[] = ['value']) => 
  Array.from({ length: count }).map((_, i) => {
    const point: any = {
      timestamp: new Date(Date.now() - (count - i) * 3600000).toISOString(),
    };
    keys.forEach(key => {
      point[key] = Math.floor(Math.random() * 100);
    });
    return point;
  });

export const analyticsApi = {
  async fetchOverviewMetrics(period: Period): Promise<OverviewMetric[]> {
    await sleep(Math.random() * 500 + 300);
    return [
      { id: 'slow_queries', title: 'Slow Queries', value: '12', icon: 'zap' },
      { id: 'connections', title: 'Connections', value: '6/60', icon: 'network' },
      { id: 'disk_usage', title: 'Disk Usage', value: '45', unit: '%', icon: 'hard-drive' },
      { id: 'disk_io', title: 'Disk IO', value: '12', unit: '%', icon: 'activity' },
      { id: 'memory', title: 'Memory', value: '68', unit: '%', icon: 'cpu' },
      { id: 'cpu', title: 'CPU', value: '25', unit: '%', icon: 'bar-chart' },
    ];
  },

  async fetchServiceHealth(period: Period): Promise<ServiceHealth[]> {
    await sleep(Math.random() * 500 + 300);
    const services: ServiceHealth['name'][] = ['Database', 'Auth', 'Edge Functions', 'Realtime', 'Storage', 'Data API'];
    return services.map(name => ({
      id: name.toLowerCase().replace(' ', '-'),
      name,
      status: Math.random() > 0.1 ? 'HEALTHY' : 'UNHEALTHY',
      errorRate: Math.floor(Math.random() * 5),
      history: Array.from({ length: 40 }).map((_, i) => ({
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        calls: Math.floor(Math.random() * 1000)
      }))
    }));
  },

  async fetchHealthMetrics(period: Period): Promise<{
    functions: { calls: ChartDataPoint[], failureRate: ChartDataPoint[], cacheHitRate: ChartDataPoint[] },
    concurrency: { scheduler: ChartDataPoint[], running: ChartDataPoint[], queued: ChartDataPoint[] }
  }> {
    await sleep(Math.random() * 500 + 200);
    return {
      functions: {
        calls: generatePoints(24),
        failureRate: generatePoints(24),
        cacheHitRate: generatePoints(24)
      },
      concurrency: {
        scheduler: generatePoints(24),
        running: generatePoints(24, ['actions', 'queries']),
        queued: generatePoints(24, ['actions', 'queries'])
      }
    };
  },

  async fetchDeploymentInfo(): Promise<DeploymentInfo> {
    await sleep(Math.random() * 300 + 200);
    return {
      environment: 'production',
      projectName: 'Ucode App',
      region: 'eu-central-1',
      runtimeVersion: 'Node.js 20.10.0',
      hasUpdate: true,
      lastDeploy: {
        date: new Date().toISOString(),
        author: 'Nur Muhammad'
      },
      backupStatus: 'Healthy (daily)',
      cloudUrl: 'ugen-app.vercel.app',
      actionsUrl: 'github.com/mukhammadyn/ugen-app/actions'
    };
  },

  async fetchQueryPerformance(filters: any): Promise<QueryPerformanceMetric[]> {
    await sleep(Math.random() * 500 + 300);
    return [
      {
        id: '1',
        query: 'SELECT * FROM users WHERE id = $1',
        timeConsumedPercent: 35,
        timeConsumedSeconds: 12.5,
        calls: 1250,
        maxTime: 120,
        meanTime: 10,
        minTime: 2,
        rowsProcessed: 1250,
        cacheHitRate: 85,
        role: 'postgres',
        application: 'Web App'
      },
      {
        id: '2',
        query: 'UPDATE orders SET status = $1 WHERE created_at < $2',
        timeConsumedPercent: 20,
        timeConsumedSeconds: 8.2,
        calls: 450,
        maxTime: 500,
        meanTime: 18,
        minTime: 5,
        rowsProcessed: 14500,
        cacheHitRate: 20,
        role: 'postgres',
        application: 'Cron Job'
      }
    ];
  },

  async fetchVisitorStats(period: Period, metric: VisitorMetric): Promise<VisitorStats[]> {
    await sleep(Math.random() * 500 + 300);
    const days = period === '24h' ? 24 : period === '7d' ? 7 : period === '30d' ? 30 : 90;
    return Array.from({ length: days }).map((_, i) => ({
      date: new Date(Date.now() - (days - i) * 86400000).toISOString(),
      value: Math.floor(Math.random() * 5000)
    }));
  },

  async fetchVisitorBreakdown(period: Period): Promise<VisitorBreakdown> {
    await sleep(Math.random() * 500 + 300);
    return {
      sources: [
        { id: '1', label: 'Google', value: 4500, percentage: 45 },
        { id: '2', label: 'Direct', value: 3000, percentage: 30 },
        { id: '3', label: 'Twitter', value: 1500, percentage: 15 },
        { id: '4', label: 'GitHub', value: 1000, percentage: 10 },
      ],
      pages: [
        { id: '1', label: '/', value: 5000, percentage: 50 },
        { id: '2', label: '/onboarding', value: 2000, percentage: 20 },
        { id: '3', label: '/dashboard', value: 2000, percentage: 20 },
        { id: '4', label: '/settings', value: 1000, percentage: 10 },
      ],
      countries: [
        { id: '1', label: 'United States', value: 4000, percentage: 40, flag: '🇺🇸' },
        { id: '2', label: 'Uzbekistan', value: 3000, percentage: 30, flag: '🇺🇿' },
        { id: '3', label: 'Germany', value: 1500, percentage: 15, flag: '🇩🇪' },
        { id: '4', label: 'United Kingdom', value: 1500, percentage: 15, flag: '🇬🇧' },
      ],
      devices: [
        { id: '1', label: 'Desktop', value: 6000, percentage: 60 },
        { id: '2', label: 'Mobile', value: 3000, percentage: 30 },
        { id: '3', label: 'Tablet', value: 1000, percentage: 10 },
      ]
    };
  },

  async fetchCurrentVisitors(): Promise<number> {
    await sleep(200);
    return Math.floor(Math.random() * 50) + 10;
  }
};
