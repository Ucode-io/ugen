export type Period = '24h' | '7d' | '30d' | '90d';

export interface OverviewMetric {
  id: string;
  title: string;
  value: string;
  unit?: string;
  trend?: number;
  icon: string;
}

export interface ServiceHealth {
  id: string;
  name: string;
  status: 'HEALTHY' | 'UNHEALTHY' | 'UNKNOWN';
  errorRate: number;
  history: {
    timestamp: string;
    calls: number;
  }[];
}

export interface DeploymentInfo {
  environment: 'development' | 'production';
  projectName: string;
  region: string;
  runtimeVersion: string;
  hasUpdate: boolean;
  lastDeploy: {
    date: string;
    author: string;
  };
  backupStatus: string;
  cloudUrl: string;
  actionsUrl: string;
}

export interface ChartDataPoint {
  timestamp: string;
  value: number;
  [key: string]: string | number;
}

export interface QueryPerformanceMetric {
  id: string;
  query: string;
  timeConsumedPercent: number;
  timeConsumedSeconds: number;
  calls: number;
  maxTime: number;
  meanTime: number;
  minTime: number;
  rowsProcessed: number;
  cacheHitRate: number;
  role: string;
  application: string;
}

export type VisitorMetric = 'visitors' | 'pageviews' | 'viewsPerVisit' | 'visitDuration' | 'bounceRate';

export interface VisitorStats {
  date: string;
  value: number;
}

export interface BreakdownItem {
  id: string;
  label: string;
  value: number;
  percentage: number;
  icon?: string;
  flag?: string;
}

export interface VisitorBreakdown {
  sources: BreakdownItem[];
  pages: BreakdownItem[];
  countries: BreakdownItem[];
  devices: BreakdownItem[];
}
