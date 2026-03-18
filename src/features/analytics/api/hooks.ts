import { useQuery } from '@tanstack/react-query';
import { analyticsApi, Period, VisitorMetric } from '@/entities/analytics';

export const useOverviewMetrics = (period: Period) => {
  return useQuery({
    queryKey: ['analytics', 'overview', period],
    queryFn: () => analyticsApi.fetchOverviewMetrics(period),
  });
};

export const useServiceHealth = (period: Period) => {
  return useQuery({
    queryKey: ['analytics', 'health', 'services', period],
    queryFn: () => analyticsApi.fetchServiceHealth(period),
  });
};

export const useDeploymentInfo = () => {
  return useQuery({
    queryKey: ['analytics', 'health', 'deployment'],
    queryFn: () => analyticsApi.fetchDeploymentInfo(),
  });
};

export const useHealthMetrics = (period: Period) => {
  return useQuery({
    queryKey: ['analytics', 'health', 'metrics', period],
    queryFn: () => analyticsApi.fetchHealthMetrics(period),
  });
};

export const useQueryPerformance = (filters: any) => {
  return useQuery({
    queryKey: ['analytics', 'performance', 'queries', filters],
    queryFn: () => analyticsApi.fetchQueryPerformance(filters),
  });
};

export const useVisitorStats = (period: Period, metric: VisitorMetric) => {
  return useQuery({
    queryKey: ['analytics', 'visitors', 'stats', period, metric],
    queryFn: () => analyticsApi.fetchVisitorStats(period, metric),
  });
};

export const useVisitorBreakdown = (period: Period) => {
  return useQuery({
    queryKey: ['analytics', 'visitors', 'breakdown', period],
    queryFn: () => analyticsApi.fetchVisitorBreakdown(period),
  });
};

export const useCurrentVisitors = () => {
  return useQuery({
    queryKey: ['analytics', 'visitors', 'current'],
    queryFn: () => analyticsApi.fetchCurrentVisitors(),
    refetchInterval: 30000,
  });
};
