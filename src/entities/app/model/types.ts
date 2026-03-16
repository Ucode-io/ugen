export type AppVisibility = 'Public' | 'Private' | 'Team only';

export interface AppSettings {
  name: string;
  description: string;
  visibility: AppVisibility;
  requireLogin: boolean;
  platformBadgeVisible: boolean;
  createdAt: string;
}
