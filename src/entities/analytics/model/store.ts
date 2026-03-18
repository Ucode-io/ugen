import { create } from 'zustand';
import { Period, VisitorMetric } from './types';

interface QueryPerformanceFilters {
  search: string;
  callsFilter: string;
  totalTimeFilter: string;
  rolesFilter: string;
}

interface AnalyticsState {
  activePeriod: Period;
  activeVisitorMetric: VisitorMetric;
  queryPerformanceFilters: QueryPerformanceFilters;
  expandedQueryRow: string | null;
  indexAdvisorVisible: boolean;
  collapsedSections: Set<string>;

  setActivePeriod: (period: Period) => void;
  setActiveVisitorMetric: (metric: VisitorMetric) => void;
  setQueryPerformanceFilter: (key: keyof QueryPerformanceFilters, value: string) => void;
  toggleExpandedQueryRow: (id: string | null) => void;
  setIndexAdvisorVisible: (visible: boolean) => void;
  toggleSection: (id: string) => void;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  activePeriod: '24h',
  activeVisitorMetric: 'visitors',
  queryPerformanceFilters: {
    search: '',
    callsFilter: 'all',
    totalTimeFilter: 'all',
    rolesFilter: 'all',
  },
  expandedQueryRow: null,
  indexAdvisorVisible: true,
  collapsedSections: new Set(),

  setActivePeriod: (period) => set({ activePeriod: period }),
  setActiveVisitorMetric: (metric) => set({ activeVisitorMetric: metric }),
  setQueryPerformanceFilter: (key, value) =>
    set((state) => ({
      queryPerformanceFilters: {
        ...state.queryPerformanceFilters,
        [key]: value,
      },
    })),
  toggleExpandedQueryRow: (id) =>
    set((state) => ({ expandedQueryRow: state.expandedQueryRow === id ? null : id })),
  setIndexAdvisorVisible: (visible) => set({ indexAdvisorVisible: visible }),
  toggleSection: (id) =>
    set((state) => {
      const next = new Set(state.collapsedSections);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { collapsedSections: next };
    }),
}));
