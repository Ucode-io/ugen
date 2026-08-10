'use client'

import { Fragment, useState, useEffect, useMemo, useRef } from 'react'
import {
  BarChart3,
  AlertCircle,
  Bot,
  Box,
  Check,
  ChevronLeft,
  Cloud,
  Code2,
  Database,
  ExternalLink,
  Loader2,
  Mail,
  Megaphone,
  Plug,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Table2,
  Trash2,
  Video,
  type LucideIcon,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi, api } from '@/shared/api'
import { githubIntegrationApi } from '@/features/github-integration'
import type { GithubIntegration } from '@/features/github-integration'
import { gitlabIntegrationApi } from '@/features/gitlab-integration'
import { bitbucketIntegrationApi } from '@/features/bitbucket-integration'
import { googleDriveIntegrationApi } from '@/features/google-drive-integration'
import { googleCalendarIntegrationApi, GoogleCalendarFieldMappingModal } from '@/features/google-calendar-integration'
import { googleAdsIntegrationApi, GoogleAdsSetupModal } from '@/features/google-ads-integration'
import { useAuthStore } from '@/entities/session'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Skeleton,
} from '@/shared/ui'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui'
import { DataLoadingState } from '@/shared/ui'
import { cn } from '@/shared/lib/utils/cn'
import { centeredPopupFeatures } from '@/shared/lib/utils/centered-popup'
import { toast } from 'sonner'
import { StyledQr } from './styled-qr'
import { useTranslations } from 'next-intl'

const GOOGLE_DRIVE_TYPE_VALUE = 1001
const GOOGLE_CALENDAR_TYPE_VALUE = 1002
const TELEGRAM_TYPE_VALUE = 14
const INSTAGRAM_DIRECT_TYPE_VALUE = 15
const GOOGLE_ADS_TYPE_VALUE = 16
const META_ADS_TYPE_VALUE = 17
const SOON_TYPE_VALUES = new Set<number>()

interface ResourceItem {
  label: string
  typeValue: number
  icon: string
  summary: string
}

interface ResourceCategory {
  id: string
  label: string
  icon: LucideIcon
  items: ResourceItem[]
}

// Resource categories with their items (static config)
const resourceCategories: ResourceCategory[] = [
  {
    id: 'databases',
    label: 'Databases',
    icon: Database,
    items: [
      { label: 'MongoDB', typeValue: 1, icon: 'mongodb', summary: 'Document database' },
      { label: 'ClickHouse', typeValue: 2, icon: 'clickhouse', summary: 'Analytical database' },
      { label: 'PostgreSQL', typeValue: 3, icon: 'postgresql', summary: 'Relational database' },
    ],
  },
  {
    id: 'api_messaging',
    label: 'API & Messaging',
    icon: Mail,
    items: [
      { label: 'REST', typeValue: 4, icon: 'rest', summary: 'HTTP API endpoint' },
      { label: 'SMS', typeValue: 6, icon: 'sms', summary: 'SMS delivery provider' },
      { label: 'SMTP', typeValue: 7, icon: 'smtp', summary: 'Email delivery provider' },
      { label: 'Telegram', typeValue: TELEGRAM_TYPE_VALUE, icon: 'telegram', summary: 'Telegram bot messaging' },
      { label: 'Instagram Direct', typeValue: INSTAGRAM_DIRECT_TYPE_VALUE, icon: 'instagram-direct', summary: 'Instagram direct messages' },
    ],
  },
  {
    id: 'source_control',
    label: 'Source Control',
    icon: Code2,
    items: [
      { label: 'GitHub', typeValue: 5, icon: 'github', summary: 'Repository hosting' },
      { label: 'GitLab', typeValue: 8, icon: 'gitlab', summary: 'Repository hosting' },
      { label: 'Bitbucket', typeValue: 9, icon: 'bitbucket', summary: 'Repository hosting' },
    ],
  },
  {
    id: 'productivity',
    label: 'Productivity',
    icon: Cloud,
    items: [
      { label: 'Google Drive', typeValue: GOOGLE_DRIVE_TYPE_VALUE, icon: 'google-drive', summary: 'Cloud file storage' },
      { label: 'Google Calendar', typeValue: GOOGLE_CALENDAR_TYPE_VALUE, icon: 'google-calendar', summary: 'Calendar and events' },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: Megaphone,
    items: [
      { label: 'Google Ads', typeValue: GOOGLE_ADS_TYPE_VALUE, icon: 'google-ads', summary: 'Google advertising account' },
      { label: 'Meta Ads', typeValue: META_ADS_TYPE_VALUE, icon: 'meta-ads', summary: 'Meta advertising account' },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    items: [
      { label: 'Superset', typeValue: 11, icon: 'superset', summary: 'BI dashboards' },
      { label: 'Metabase', typeValue: 12, icon: 'metabase', summary: 'BI dashboards' },
    ],
  },
  {
    id: 'media',
    label: 'Media',
    icon: Video,
    items: [
      { label: 'Transcode', typeValue: 13, icon: 'transcoder', summary: 'Media processing' },
    ],
  },
]

const OAUTH_ONLY_TYPE_VALUES = new Set([GOOGLE_DRIVE_TYPE_VALUE, GOOGLE_CALENDAR_TYPE_VALUE])

const allResourceItems = resourceCategories.flatMap(category =>
  category.items.map(item => ({
    ...item,
    categoryId: category.id,
    categoryLabel: category.label,
  }))
)

const formResourceCategories = resourceCategories
  .map(category => ({
    ...category,
    items: category.items.filter(item => !OAUTH_ONLY_TYPE_VALUES.has(item.typeValue)),
  }))
  .filter(category => category.items.length > 0)

// Resource type options — these are static, no API needed
const resourceTypes = allResourceItems
  .filter(item => !OAUTH_ONLY_TYPE_VALUES.has(item.typeValue))
  .map(item => ({ label: item.label, value: item.typeValue }))

const resourceItemByType = new Map(allResourceItems.map(item => [item.typeValue, item]))

// Map server-side string type → numeric typeValue used across the UI
const RESOURCE_TYPE_STRING_TO_VALUE: Record<string, number> = {
  MONGO: 1,
  MONGODB: 1,
  CLICK_HOUSE: 2,
  CLICKHOUSE: 2,
  POSTGRES: 3,
  POSTGRESQL: 3,
  REST: 4,
  GITHUB: 5,
  SMS: 6,
  SMTP: 7,
  GITLAB: 8,
  BITBUCKET: 9,
  INSTAGRAM: INSTAGRAM_DIRECT_TYPE_VALUE,
  SUPERSET: 11,
  METABASE: 12,
  TRANSCODE: 13,
  TRANSCODER: 13,
  TELEGRAM: TELEGRAM_TYPE_VALUE,
  INSTAGRAM_DIRECT: INSTAGRAM_DIRECT_TYPE_VALUE,
  INSTAGRAMDIRECT: INSTAGRAM_DIRECT_TYPE_VALUE,
  GOOGLE_ADS: GOOGLE_ADS_TYPE_VALUE,
  GOOGLEADS: GOOGLE_ADS_TYPE_VALUE,
  META_ADS: META_ADS_TYPE_VALUE,
  METAADS: META_ADS_TYPE_VALUE,
}

const normalizeApiResource = (item: any) => {
  const numericType =
    typeof item.resource_type === 'number'
      ? item.resource_type
      : RESOURCE_TYPE_STRING_TO_VALUE[String(item.resource_type ?? item.type ?? '').toUpperCase()] ?? null
  // Google Drive has no entry in resourceTypes (it connects via OAuth, not the
  // create form), so the server type doesn't resolve to a numeric value and the
  // icon fell back to MongoDB. Detect it explicitly and pin it to its UI value.
  const canonType = String(item.type ?? item.resource_type ?? '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
  const isGoogleDrive =
    numericType === GOOGLE_DRIVE_TYPE_VALUE ||
    canonType === 'GOOGLEDRIVE' ||
    canonType === 'GDRIVE' ||
    String(item.provider ?? '').toLowerCase() === 'google-drive' ||
    String(item.name ?? '').trim().toLowerCase() === 'google drive'
  // Google Calendar — same story as Drive: connects via OAuth, not the create
  // form, so pin it to its UI value and label by detecting its server type.
  const isGoogleCalendar =
    numericType === GOOGLE_CALENDAR_TYPE_VALUE ||
    canonType === 'GOOGLECALENDAR' ||
    canonType === 'GCALENDAR' ||
    canonType === 'GCAL' ||
    String(item.provider ?? '').toLowerCase() === 'google-calendar' ||
    String(item.name ?? '').trim().toLowerCase() === 'google calendar'
  const finalType = isGoogleDrive
    ? GOOGLE_DRIVE_TYPE_VALUE
    : isGoogleCalendar
      ? GOOGLE_CALENDAR_TYPE_VALUE
      : numericType
  const typeLabel =
    resourceTypes.find(t => t.value === finalType)?.label ??
    (isGoogleDrive ? 'Google Drive' : isGoogleCalendar ? 'Google Calendar' : undefined)
  return {
    ...item,
    resource_type: finalType,
    name: item.name || typeLabel || item.type || 'Resource',
    is_configured: item.is_configured ?? true,
  }
}

const ResourceIcon = ({ type }: { type: string }) => {
  const icons: Record<string, React.ReactNode> = {
    'google-drive': (
      <svg width="22" height="20" viewBox="0 0 87.3 78" aria-hidden="true">
        <path fill="#0066DA" d="M6.6 66.85 10.45 73.5c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5Z" />
        <path fill="#00AC47" d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44A9.06 9.06 0 0 0 0 53h27.5L43.65 25Z" />
        <path fill="#EA4335" d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H58.55l5.85 11.5L73.55 76.8Z" />
        <path fill="#00832D" d="M43.65 25 57.4 1.2c-1.35-.8-2.9-1.2-4.5-1.2H34.4c-1.6 0-3.15.45-4.5 1.2L43.65 25Z" />
        <path fill="#2684FC" d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2L59.8 53Z" />
        <path fill="#FFBA00" d="M73.4 26.5 60.7 4.5c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5L73.4 26.5Z" />
      </svg>
    ),
    'google-calendar': (
      <svg width="22" height="22" viewBox="0 0 200 200" aria-hidden="true">
        <path fill="#fff" d="M152 47H48v106h104z" />
        <path fill="#1a73e8" d="M152 200l48-48h-48z" />
        <path fill="#ea4335" d="M0 47l48-1V0H12C5.4 0 0 5.4 0 12z" />
        <path fill="#4285f4" d="M48 0v47h104V0H60z" />
        <path fill="#34a853" d="M0 153v35c0 6.6 5.4 12 12 12h36v-47z" />
        <path fill="#188038" d="M0 47h48v106H0z" />
        <path fill="#fbbc04" d="M200 47v106h-48V47z" />
        <path fill="#1967d2" d="M200 47V12c0-6.6-5.4-12-12-12h-36v47z" />
        <path fill="#4285f4" d="M48 153h104v47H48z" />
        <path fill="#4285f4" d="M71.6 124.3c-4-2.7-6.7-6.6-8.2-11.8l9-3.7c.8 3.2 2.3 5.6 4.4 7.4 2 1.7 4.5 2.6 7.4 2.6 3 0 5.5-.9 7.6-2.7 2.1-1.8 3.1-4.1 3.1-6.9 0-2.9-1.1-5.2-3.3-7-2.2-1.8-5-2.7-8.2-2.7h-5.2v-8.9h4.7c2.8 0 5.2-.8 7.1-2.3 2-1.5 2.9-3.6 2.9-6.3 0-2.4-.9-4.3-2.6-5.7-1.7-1.4-4-2.1-6.6-2.1-2.6 0-4.7.7-6.2 2.1-1.6 1.4-2.7 3.1-3.4 5.1l-8.9-3.7c1.1-3.2 3.2-6 6.2-8.5 3-2.5 6.9-3.7 11.6-3.7 3.5 0 6.6.7 9.4 2 2.7 1.4 4.9 3.2 6.4 5.6 1.6 2.4 2.3 5.1 2.3 8 0 3-.7 5.6-2.2 7.6-1.4 2.1-3.3 3.7-5.4 4.8v.5c2.8 1.2 5.2 3 7 5.5 1.8 2.5 2.8 5.5 2.8 9 0 3.5-.9 6.6-2.7 9.3-1.8 2.7-4.2 4.9-7.4 6.4-3.1 1.5-6.6 2.3-10.6 2.3-4.6.1-8.8-1.3-12.8-4z" />
        <path fill="#4285f4" d="M124.5 79.3l-9.9 7.2-5-7.6 17.8-12.8h6.8v60.4h-9.7z" />
      </svg>
    ),
    rest: <Plug className="h-5 w-5 text-text-muted" />,
    telegram: (
      <span
        aria-hidden="true"
        className="h-5 w-5 bg-contain bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/telegram.svg')" }}
      />
    ),
    'instagram-direct': (
      <span
        aria-hidden="true"
        className="h-5 w-5 bg-contain bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/instagram.svg')" }}
      />
    ),
    'google-ads': (
      <span
        aria-hidden="true"
        className="h-5 w-5 bg-contain bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/googleads.svg')" }}
      />
    ),
    'meta-ads': (
      <span
        aria-hidden="true"
        className="h-5 w-5 bg-contain bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/meta.svg')" }}
      />
    ),
    github: (
      <svg xmlns="http://www.w3.org/2000/svg" width="21" height="20" viewBox="0 0 21 20" fill="none">
        <path d="M10.5 1.25C5.66562 1.25 1.75 5.16562 1.75 10C1.75 13.8719 4.25469 17.1422 7.73281 18.3016C8.17031 18.3781 8.33437 18.1156 8.33437 17.8859C8.33437 17.6781 8.32344 16.9891 8.32344 16.2563C6.125 16.6609 5.55625 15.7203 5.38125 15.2281C5.28281 14.9766 4.85625 14.2 4.48438 13.9922C4.17812 13.8281 3.74063 13.4234 4.47344 13.4125C5.1625 13.4016 5.65469 14.0469 5.81875 14.3094C6.60625 15.6328 7.86406 15.2609 8.36719 15.0312C8.44375 14.4625 8.67344 14.0797 8.925 13.8609C6.97813 13.6422 4.94375 12.8875 4.94375 9.54062C4.94375 8.58906 5.28281 7.80156 5.84062 7.18906C5.75313 6.97031 5.44687 6.07344 5.92812 4.87031C5.92812 4.87031 6.66094 4.64063 8.33437 5.76719C9.03438 5.57031 9.77813 5.47187 10.5219 5.47187C11.2656 5.47187 12.0094 5.57031 12.7094 5.76719C14.3828 4.62969 15.1156 4.87031 15.1156 4.87031C15.5969 6.07344 15.2906 6.97031 15.2031 7.18906C15.7609 7.80156 16.1 8.57812 16.1 9.54062C16.1 12.8984 14.0547 13.6422 12.1078 13.8609C12.425 14.1344 12.6984 14.6594 12.6984 15.4797C12.6984 16.65 12.6875 17.5906 12.6875 17.8859C12.6875 18.1156 12.8516 18.3891 13.2891 18.3016C15.0261 17.7152 16.5355 16.5988 17.6048 15.1096C18.6741 13.6204 19.2495 11.8333 19.25 10C19.25 5.16562 15.3344 1.25 10.5 1.25Z" fill="currentColor" />
      </svg>
    ),
    gitlab: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M16.7673 8.54208L16.7475 8.48981L14.842 3.32576C14.8032 3.22453 14.7346 3.13866 14.6459 3.08045C14.5571 3.02322 14.4536 2.99564 14.3493 3.00146C14.2451 3.00727 14.145 3.04618 14.0627 3.11295C13.9814 3.18172 13.9224 3.27473 13.8936 3.37943L12.607 7.46713H7.39713L6.11044 3.37943C6.08247 3.27416 6.02332 3.18069 5.94136 3.11225C5.85905 3.04549 5.75898 3.00657 5.65469 3.00076C5.55039 2.99495 5.44689 3.02252 5.35817 3.07975C5.26968 3.1382 5.20108 3.224 5.16202 3.32507L3.25293 8.4868L3.234 8.53908C2.67052 10.068 3.14902 11.7998 4.40763 12.7857L4.4142 12.791L4.43169 12.8039L7.33442 15.0611L8.77047 16.1897L9.64526 16.8756C9.74757 16.9563 9.87253 17 10.001 17C10.1295 17 10.2545 16.9563 10.3568 16.8756L11.2316 16.1897L12.6676 15.0611L15.5878 12.7902L15.5951 12.7842C16.8507 11.7981 17.3284 10.0694 16.7673 8.54208Z" fill="#E24329" />
        <path d="M16.7667 8.55169L16.747 8.5C15.8186 8.69571 14.9437 9.09949 14.1848 9.68251L10 12.9314C11.4251 14.0383 12.6657 15 12.6657 15L15.5858 12.7548L15.593 12.7489C16.8506 11.7738 17.329 10.063 16.7667 8.55169Z" fill="#FC6D26" />
        <path d="M7 15.0761L8.6156 16.196L9.59977 16.8766C9.71487 16.9566 9.85545 17 10 17C10.1446 17 10.2851 16.9566 10.4002 16.8766L11.3844 16.196L13 15.0761C13 15.0761 11.6026 14.1079 9.99925 13C8.99888 13.6913 7.99913 14.3833 7 15.0761Z" fill="#FCA326" />
        <path d="M5.8144 9.68551C5.0562 9.1012 4.18147 8.69635 3.25293 8.5L3.23399 8.55169C2.67053 10.0633 3.14901 11.7756 4.40758 12.7503L4.41416 12.7556L4.43164 12.7683L7.33427 15L10 12.9313L5.8144 9.68551Z" fill="#FC6D26" />
      </svg>
    ),
    bitbucket: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 62 62" fill="none">
        <path d="M2.99 5.99a1.5 1.5 0 0 0-1.48 1.74l8.06 48.96a2.04 2.04 0 0 0 2 1.71h38.66a1.5 1.5 0 0 0 1.49-1.26l8.06-49.4a1.5 1.5 0 0 0-1.48-1.75L2.99 5.99ZM37.13 40.3H24.94l-3.3-17.25h18.4L37.13 40.3Z" fill="#2684FF" />
        <path d="M59.36 23.05H40.04l-3.24 17.25H24.94l-15.8 18.75c.5.43 1.13.67 1.79.68h38.67a1.5 1.5 0 0 0 1.49-1.26l8.28-35.42Z" fill="url(#bb-grad)" />
        <defs>
          <linearGradient id="bb-grad" x1="62.27" y1="27.88" x2="35.97" y2="48.41" gradientUnits="userSpaceOnUse">
            <stop offset=".18" stopColor="#0052CC" />
            <stop offset="1" stopColor="#2684FF" />
          </linearGradient>
        </defs>
      </svg>
    ),
    sms: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M14.8668 12.4544C13.821 12.4544 12.9361 13.098 12.6143 14.0634H9.23556C9.23556 13.5002 9.07467 13.0175 8.83332 12.6153L14.5451 6.74268C14.7864 6.74268 15.0277 6.82313 15.2691 6.82313C16.3953 6.82313 17.2803 5.93821 17.2803 4.81195C17.2803 3.6857 16.3953 2.80078 15.2691 2.80078C14.1428 2.80078 13.2579 3.6857 13.2579 4.81195C13.2579 5.0533 13.3384 5.37508 13.4188 5.61642L7.78751 11.4086C7.30483 11.0064 6.66126 10.8455 6.01768 10.8455V7.4667C6.98305 7.14492 7.62662 6.26 7.62662 5.21419C7.62662 3.84659 6.58081 2.80078 5.21321 2.80078C3.84561 2.80078 2.7998 3.84659 2.7998 5.21419C2.7998 6.26 3.44338 7.14492 4.40874 7.4667V11.2477C3.44338 11.8108 2.7998 12.8566 2.7998 13.9829C2.7998 15.7527 4.24785 17.2008 6.01768 17.2008C7.22439 17.2008 8.2702 16.5572 8.75288 15.5918H12.5339C12.8557 16.4768 13.7406 17.2008 14.7864 17.2008C16.0735 17.2008 17.1998 16.155 17.1998 14.7874C17.2803 13.5002 16.154 12.4544 14.8668 12.4544Z" fill="currentColor" />
      </svg>
    ),
    smtp: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M14.8668 12.4544C13.821 12.4544 12.9361 13.098 12.6143 14.0634H9.23556C9.23556 13.5002 9.07467 13.0175 8.83332 12.6153L14.5451 6.74268C14.7864 6.74268 15.0277 6.82313 15.2691 6.82313C16.3953 6.82313 17.2803 5.93821 17.2803 4.81195C17.2803 3.6857 16.3953 2.80078 15.2691 2.80078C14.1428 2.80078 13.2579 3.6857 13.2579 4.81195C13.2579 5.0533 13.3384 5.37508 13.4188 5.61642L7.78751 11.4086C7.30483 11.0064 6.66126 10.8455 6.01768 10.8455V7.4667C6.98305 7.14492 7.62662 6.26 7.62662 5.21419C7.62662 3.84659 6.58081 2.80078 5.21321 2.80078C3.84561 2.80078 2.7998 3.84659 2.7998 5.21419C2.7998 6.26 3.44338 7.14492 4.40874 7.4667V11.2477C3.44338 11.8108 2.7998 12.8566 2.7998 13.9829C2.7998 15.7527 4.24785 17.2008 6.01768 17.2008C7.22439 17.2008 8.2702 16.5572 8.75288 15.5918H12.5339C12.8557 16.4768 13.7406 17.2008 14.7864 17.2008C16.0735 17.2008 17.1998 16.155 17.1998 14.7874C17.2803 13.5002 16.154 12.4544 14.8668 12.4544Z" fill="currentColor" />
      </svg>
    ),
    superset: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24">
        <path fill="#484848" d="M17.7115 6.167c-2.0149 0 -3.871 1.133575 -5.664775 3.114225C10.28405 7.269425 8.396825 6.167 6.2885 6.167 2.79745 6.167 0.25 8.658375 0.25 12.0124c0 3.354025 2.54745 5.814275 6.0385 5.814275 2.1457 0 3.8087 -1.0059 5.664775 -3.01145 1.7938 2.011775 3.61875 3.017675 5.758225 3.017675C21.20255 17.826675 23.75 15.375775 23.75 12.0124S21.20255 6.167 17.7115 6.167ZM6.3134 14.3076c-1.47925 0 -2.360575 -0.97475 -2.360575 -2.26405 0 -1.2893 0.881325 -2.292075 2.360575 -2.292075 1.2457 0 2.26405 1.002775 3.3665 2.35435 -1.04015 1.25815 -2.139475 2.201775 -3.3665 2.201775Zm11.292225 0c-1.227025 0 -2.26405 -0.97475 -3.3665 -2.26405 1.1336 -1.351575 2.10835 -2.292075 3.3665 -2.292075 1.47925 0 2.35125 1.01525 2.35125 2.292075s-0.872 2.26405 -2.35125 2.26405Z" strokeWidth="0.25" />
        <path fill="#20a7c9" d="m14.58165 16.99515 2.34815 -2.8028c-0.934275 -0.280275 -1.796925 -1.121125 -2.6907 -2.1644l-2.28585 2.78725c0.74835 0.86825 1.63685 1.605075 2.6284 2.17995Z" strokeWidth="0.25" />
        <path fill="#20a7c9" d="M12.04685 9.278c-0.743375 -0.8807 -1.62625 -1.634025 -2.61285 -2.229775l-2.351225 2.83395c0.893775 0.311425 1.6848 1.1149 2.525625 2.139475l0.093425 0.0654 2.345025 -2.80905Z" strokeWidth="0.25" />
      </svg>
    ),
    metabase: (
      <svg width="20px" height="20px" viewBox="0 0 256 324" version="1.1" preserveAspectRatio="xMidYMid">
        <g fill="#509EE3">
          <ellipse cx="19.3939396" cy="82.7565395" rx="19.3939394" ry="19.703938" />
          <ellipse cx="19.3939396" cy="137.927566" rx="19.3939394" ry="19.703938" />
          <ellipse opacity="0.2" cx="73.6969698" cy="82.7565395" rx="19.3939394" ry="19.703938" />
          <ellipse cx="73.6969698" cy="138.463513" rx="19.3939394" ry="19.703938" />
          <ellipse opacity="0.2" cx="128" cy="82.7565395" rx="19.3939394" ry="19.703938" />
          <ellipse opacity="0.2" cx="128" cy="19.703938" rx="19.3939394" ry="19.703938" />
          <ellipse opacity="0.2" cx="128" cy="138.463513" rx="19.3939394" ry="19.703938" />
          <ellipse opacity="0.2" cx="182.30303" cy="82.7565395" rx="19.3939394" ry="19.703938" />
          <ellipse cx="236.60606" cy="82.7565395" rx="19.3939394" ry="19.703938" />
          <ellipse cx="182.30303" cy="138.463513" rx="19.3939394" ry="19.703938" />
          <ellipse cx="236.60606" cy="138.463513" rx="19.3939394" ry="19.703938" />
          <ellipse cx="19.3939396" cy="193.098592" rx="19.3939394" ry="19.703938" />
          <ellipse opacity="0.2" cx="73.6969698" cy="193.634539" rx="19.3939394" ry="19.703938" />
          <ellipse cx="128" cy="193.634539" rx="19.3939394" ry="19.703938" />
          <ellipse opacity="0.2" cx="182.30303" cy="193.634539" rx="19.3939394" ry="19.703938" />
          <ellipse cx="236.60606" cy="193.634539" rx="19.3939394" ry="19.703938" />
          <ellipse cx="19.3939396" cy="248.269618" rx="19.3939394" ry="19.703938" />
          <ellipse opacity="0.2" cx="73.6969698" cy="248.805565" rx="19.3939394" ry="19.703938" />
          <ellipse opacity="0.2" cx="128" cy="248.805565" rx="19.3939394" ry="19.703938" />
          <ellipse opacity="0.2" cx="128" cy="303.976591" rx="19.3939394" ry="19.703938" />
          <ellipse opacity="0.2" cx="182.30303" cy="248.805565" rx="19.3939394" ry="19.703938" />
          <ellipse cx="236.60606" cy="248.805565" rx="19.3939394" ry="19.703938" />
        </g>
      </svg>
    ),
    transcoder: (
      <svg width="20" height="20" viewBox="0 0 48 48">
        <rect x="2" y="2" width="44" height="44" rx="6" fill="#111827" opacity="0.95" />
        <polygon points="18,14 34,24 18,34" fill="#ffffff" />
      </svg>
    ),
    postgresql: (
      <svg width="20" height="20" fill="none">
        <g clipPath="url(#pg-clip)">
          <path fill="#336791" d="M14.658 14.392c.122-1.021.085-1.17.846-1.005l.193.016c.585.027 1.35-.094 1.799-.302.967-.45 1.54-1.199.587-1.002-2.176.45-2.325-.288-2.325-.288 2.297-3.408 3.257-7.735 2.428-8.794-2.26-2.89-6.174-1.523-6.24-1.488l-.02.004a7.8 7.8 0 0 0-1.452-.151c-.985-.016-1.732.258-2.298.688 0 0-6.982-2.877-6.657 3.617.069 1.381 1.98 10.453 4.26 7.713.832-1.002 1.637-1.85 1.637-1.85.4.266.879.402 1.38.353l.04-.033a1.5 1.5 0 0 0 .015.39c-.587.656-.415.771-1.588 1.013-1.188.245-.49.68-.035.794.552.138 1.83.334 2.693-.874l-.034.137c.23.185.215 1.325.247 2.14.033.814.088 1.574.254 2.022.166.449.362 1.603 1.905 1.272 1.289-.275 2.275-.673 2.365-4.372" />
        </g>
        <defs>
          <clipPath id="pg-clip"><path fill="#fff" d="M0 0h20v20H0z" /></clipPath>
        </defs>
      </svg>
    ),
    clickhouse: (
      <svg width="20" height="20" viewBox="0 0 64 64">
        <rect x="8" y="4" width="6" height="52" fill="#F9D34A" />
        <rect x="8" y="48" width="6" height="8" fill="#E93524" />
        <rect x="18" y="4" width="6" height="52" fill="#F9D34A" />
        <rect x="28" y="4" width="6" height="52" fill="#F9D34A" />
        <rect x="38" y="4" width="6" height="52" fill="#F9D34A" />
        <rect x="54" y="24" width="6" height="16" fill="#F9D34A" />
      </svg>
    ),
    mongodb: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path fillRule="evenodd" clipRule="evenodd" d="M13.756 6.6875C14.0068 7.41297 14.1874 8.15359 14.2468 8.92125C14.3205 9.87359 14.2868 10.8192 14.086 11.7559C14.0805 11.7817 14.069 11.8059 14.0604 11.8309C13.9974 11.8311 13.9332 11.8233 13.8716 11.8328C13.3515 11.9145 12.8318 11.9992 12.3121 12.0834C11.7749 12.1705 11.2369 12.2541 10.7007 12.347C10.5107 12.3798 10.2755 12.3406 10.1988 12.6034C10.1966 12.6106 10.1747 12.6119 10.1621 12.6159L10.188 11.0455L10.1616 7.25609L10.4119 7.21312C10.8213 7.14609 11.2307 7.07813 11.6404 7.01297C12.1293 6.93531 12.6187 6.85984 13.1079 6.78406C13.3237 6.75047 13.5397 6.71969 13.756 6.6875Z" fill="#439934" />
        <path fillRule="evenodd" clipRule="evenodd" d="M9.64494 17.1973C9.38087 16.9703 9.10759 16.7533 8.85447 16.5145C7.49244 15.2298 6.49619 13.7178 6.00556 11.8948C5.87041 11.3931 5.78025 10.8833 5.75134 10.3648C5.73103 10.002 5.70166 9.63594 5.72728 9.275C5.79556 8.315 5.93431 7.36422 6.21587 6.43953L6.23134 6.41797C6.25869 6.45437 6.29806 6.48656 6.31197 6.52766C6.58676 7.33703 6.85978 8.14698 7.13103 8.9575C7.98384 11.5044 8.83556 14.0519 9.68978 16.5981C9.7065 16.6478 9.74978 16.6886 9.78087 16.7334L9.64494 17.1973Z" fill="#45A538" />
        <path fillRule="evenodd" clipRule="evenodd" d="M13.7558 6.69031C13.5395 6.7225 13.3233 6.75328 13.1075 6.78656C12.6183 6.86234 12.1289 6.93781 11.64 7.01547C11.2303 7.08063 10.8209 7.14859 10.4116 7.21562L10.1613 7.25859L10.1594 7.09531C10.1511 6.96109 10.1369 6.82703 10.1353 6.69281C10.1245 5.83687 10.1178 4.98094 10.1072 4.125C10.1006 3.58922 10.0908 3.05359 10.0798 2.51797C10.0731 2.18516 10.0659 1.85219 10.0509 1.51984C10.0428 1.34125 10.0141 1.16359 10.0023 0.985C9.99579 0.882344 10.0048 0.778906 10.0069 0.675781C10.1345 0.923125 10.2594 1.17234 10.3906 1.41781C10.598 1.80594 10.9283 2.09187 11.2256 2.40391C12.4011 3.63703 13.2356 5.07078 13.7558 6.69031Z" fill="#46A037" />
        <path fillRule="evenodd" clipRule="evenodd" d="M10.162 12.6161C10.1746 12.612 10.1967 12.6107 10.1987 12.6036C10.2754 12.3407 10.5106 12.38 10.7006 12.3472C11.2368 12.2543 11.7748 12.1706 12.312 12.0836C12.8317 11.9993 13.3513 11.9147 13.8715 11.8329C13.9331 11.8232 13.9973 11.8312 14.0603 11.8311C13.9631 12.1779 13.8865 12.5323 13.7632 12.8697C13.6232 13.2523 13.4538 13.6257 13.274 13.9918C13.0049 14.538 12.6717 15.0501 12.2813 15.5173C11.9815 15.8779 11.6473 16.2112 11.3123 16.5404C11.1271 16.7225 10.9088 16.8707 10.7057 17.0343L10.6531 16.9984L10.4634 16.8362L10.2671 16.4061C10.1331 15.9043 10.0599 15.3882 10.0493 14.8689L10.0529 14.7812L10.0796 14.4022C10.0885 14.2728 10.1004 14.1436 10.1059 14.0139C10.126 13.5479 10.1435 13.082 10.162 12.6161Z" fill="#409433" />
        <path fillRule="evenodd" clipRule="evenodd" d="M10.1617 12.6178C10.1433 13.0837 10.1258 13.5497 10.106 14.0158C10.1005 14.1455 10.0886 14.2747 10.0797 14.4041L9.96018 14.4492C9.69471 13.6677 9.42908 12.8944 9.16924 12.1191C8.73955 10.8364 8.31502 9.55172 7.88596 8.26875C7.53941 7.2332 7.19045 6.19846 6.83908 5.16453C6.82268 5.11609 6.77549 5.07828 6.74268 5.03547L7.50768 3.62891C7.53393 3.67453 7.56861 3.71719 7.58518 3.76625C7.93948 4.81346 8.29198 5.86127 8.64268 6.90969C9.0983 8.27375 9.55111 9.63891 10.0064 11.0031C10.0246 11.0577 10.0546 11.108 10.0831 11.1691L10.1878 11.0472L10.1617 12.6178Z" fill="#4FAA41" />
        <path fillRule="evenodd" clipRule="evenodd" d="M6.74318 5.03516C6.776 5.07797 6.82303 5.11578 6.83959 5.16422C7.19096 6.19814 7.53992 7.23289 7.88646 8.26844C8.31553 9.55141 8.74006 10.8361 9.16975 12.1188C9.42943 12.8939 9.69506 13.6673 9.96068 14.4489L10.0802 14.4038L10.0535 14.7828L10.0293 14.8702C9.98771 15.2852 9.95272 15.7011 9.90209 16.1152C9.87662 16.3227 9.82256 16.5264 9.78146 16.7319C9.75053 16.687 9.70709 16.6463 9.69037 16.5966C8.83615 14.0502 7.98443 11.5028 7.13162 8.95594C6.86031 8.14541 6.58729 7.33546 6.31256 6.52609C6.29865 6.485 6.25943 6.45281 6.23193 6.41641L6.74318 5.03516Z" fill="#4AA73C" />
        <path fillRule="evenodd" clipRule="evenodd" d="M10.188 11.0456L10.0833 11.1675C10.0547 11.1064 10.0247 11.0559 10.0066 11.0016C9.55141 9.63734 9.09844 8.27219 8.64281 6.90812C8.29212 5.85971 7.93961 4.81189 7.58531 3.76469C7.56891 3.71562 7.53422 3.67281 7.50781 3.62734L8.45391 2.38281C8.48375 2.42266 8.52625 2.45812 8.54172 2.50297C8.80422 3.27193 9.06479 4.04161 9.32344 4.81203C9.56516 5.53141 9.80328 6.25187 10.0478 6.97031C10.0642 7.01844 10.1212 7.0525 10.1594 7.09312L10.1612 7.25641C10.1703 8.51932 10.1792 9.7824 10.188 11.0456Z" fill="#57AE47" />
        <path fillRule="evenodd" clipRule="evenodd" d="M10.1596 7.0925C10.1214 7.05187 10.0644 7.01781 10.048 6.96969C9.80348 6.25125 9.56535 5.53078 9.32363 4.81141C9.06499 4.04109 8.80441 3.27141 8.54191 2.50234C8.52645 2.4575 8.48395 2.42203 8.4541 2.38219C8.76176 2.08094 9.05988 1.76891 9.37988 1.48156C9.66441 1.22625 9.89316 0.9525 9.90363 0.549062C9.9041 0.532344 9.91285 0.515625 9.92629 0.46875L10.0074 0.672812C10.0054 0.776094 9.99613 0.879375 10.0029 0.982031C10.0146 1.16062 10.0433 1.33828 10.0514 1.51688C10.0664 1.84922 10.0736 2.18219 10.0804 2.515C10.0911 3.05062 10.101 3.58625 10.1077 4.12203C10.1182 4.97797 10.125 5.83391 10.1358 6.68984C10.1371 6.82437 10.1511 6.95828 10.1596 7.0925Z" fill="#60B24F" />
        <path fillRule="evenodd" clipRule="evenodd" d="M9.78096 16.7305C9.82205 16.525 9.87611 16.3211 9.90158 16.1137C9.95236 15.6998 9.98721 15.2837 10.0288 14.8687L10.0391 14.8672L10.0494 14.8689C10.06 15.3882 10.1332 15.9043 10.2672 16.4061C10.2397 16.4423 10.2008 16.4747 10.1863 16.5156C10.0727 16.8359 9.96564 17.1587 9.85143 17.4791C9.8358 17.5228 9.79236 17.5569 9.76174 17.5953L9.64502 17.1944L9.78096 16.7305Z" fill="#A9AA88" />
        <path fillRule="evenodd" clipRule="evenodd" d="M9.76172 17.5955C9.79234 17.557 9.83594 17.523 9.85141 17.4792C9.96562 17.1589 10.0728 16.8362 10.1862 16.5158C10.2008 16.4748 10.2395 16.4425 10.2672 16.4062L10.4633 16.8366C10.4245 16.8916 10.3711 16.9411 10.3495 17.0023L9.97391 18.1053C9.95844 18.1495 9.90562 18.1808 9.87031 18.2181L9.76172 17.5955Z" fill="#B6B598" />
        <path fillRule="evenodd" clipRule="evenodd" d="M9.87061 18.2214C9.90607 18.1842 9.95873 18.1528 9.9742 18.1086L10.3498 17.0056C10.3712 16.9445 10.4248 16.8948 10.4636 16.8398L10.6534 17.0019C10.5617 17.0925 10.5108 17.1972 10.5414 17.3295L10.4837 17.5183C10.4575 17.5506 10.4195 17.5787 10.4065 17.6158C10.2754 17.9912 10.1503 18.3687 10.0183 18.7442C10.0015 18.7919 9.95514 18.8292 9.92232 18.8711C9.90524 18.6545 9.888 18.438 9.87061 18.2214Z" fill="#C2C1A7" />
        <path fillRule="evenodd" clipRule="evenodd" d="M9.92219 18.8684C9.95484 18.8264 10.0012 18.7891 10.0181 18.7416C10.1502 18.3662 10.2753 17.9887 10.4064 17.6131C10.4194 17.5762 10.4572 17.548 10.4836 17.5156L10.4041 18.382C10.3828 18.4066 10.352 18.428 10.3419 18.4566C10.252 18.7087 10.1673 18.9628 10.0772 19.215C10.0586 19.267 10.023 19.313 9.99516 19.3616C9.97047 19.3292 9.92625 19.298 9.92422 19.2642C9.91625 19.1328 9.92172 19.0005 9.92219 18.8684Z" fill="#CECDB7" />
        <path fillRule="evenodd" clipRule="evenodd" d="M9.99512 19.3623C10.0229 19.3136 10.0586 19.2677 10.0771 19.2158C10.1675 18.9638 10.252 18.7097 10.3418 18.4573C10.352 18.4287 10.3829 18.4075 10.404 18.3828L10.4059 18.9516L10.2156 19.4397L9.99512 19.3623Z" fill="#DBDAC7" />
        <path fillRule="evenodd" clipRule="evenodd" d="M10.2158 19.4413L10.4061 18.9531L10.4454 19.5306L10.2158 19.4413Z" fill="#EBE9DC" />
        <path fillRule="evenodd" clipRule="evenodd" d="M10.5412 17.3277C10.5105 17.1953 10.5613 17.0905 10.6532 17L10.7058 17.0359L10.5412 17.3277Z" fill="#CECDB7" />
        <path fillRule="evenodd" clipRule="evenodd" d="M10.0494 14.8687L10.0391 14.867L10.0288 14.8686L10.053 14.7812L10.0494 14.8687Z" fill="#4FAA41" />
      </svg>
    ),
  }

  const icon = icons[type]

  return (
    <div className={cn(
      "w-10 h-10 rounded-xl flex items-center justify-center border border-border-subtle overflow-hidden shrink-0",
      !icon && "bg-bg-sidebar"
    )}>
      {icon || <Box className="w-5 h-5 text-text-muted" />}
    </div>
  )
}

type TelegramMappingFieldKey =
  | 'telegram_chat_id_field'
  | 'telegram_user_id_field'
  | 'display_name_field'
  | 'username_field'
  | 'last_message_field'
  | 'last_message_at_field'
  | 'unread_count_field'
  | 'status_field'

interface TelegramFieldTarget {
  key: TelegramMappingFieldKey
  label: string
  hint: string
  patterns: string[]
}

interface TelegramFieldOption {
  id: string
  value: string
  label: string
  type?: string
}

interface TelegramTableOption {
  id: string
  slug: string
  label: string
  fields: TelegramFieldOption[]
  suggestedMapping: Partial<Record<TelegramMappingFieldKey, string>>
}

interface TelegramManagedSession {
  id: string
  status: string
  startLink: string
  createLink: string
  displayName: string
  suggestedUsername: string
}

type InstagramMappingFieldKey =
  | 'instagram_user_id_field'
  | 'username_field'
  | 'display_name_field'
  | 'profile_picture_field'
  | 'last_message_field'
  | 'last_message_at_field'
  | 'unread_count_field'
  | 'status_field'
  | 'conversation_id_field'

interface InstagramFieldTarget {
  key: InstagramMappingFieldKey
  label: string
  hint: string
  patterns: string[]
}

interface InstagramTableOption {
  id: string
  slug: string
  label: string
  fields: TelegramFieldOption[]
  suggestedMapping: Partial<Record<InstagramMappingFieldKey, string>>
}

const TELEGRAM_FIELD_TARGETS: TelegramFieldTarget[] = [
  {
    key: 'telegram_chat_id_field',
    label: 'Telegram chat ID',
    hint: 'Unique chat identifier used to route incoming and outgoing messages.',
    patterns: ['ugen_telegram_chat_id', 'telegram_chat_id', 'chat_id'],
  },
  {
    key: 'telegram_user_id_field',
    label: 'Telegram user ID',
    hint: 'Telegram user identifier for the person behind the chat.',
    patterns: ['telegram_user_id', 'telegram_id', 'user_id'],
  },
  {
    key: 'display_name_field',
    label: 'Display name',
    hint: 'Human-readable customer name shown in the inbox.',
    patterns: ['customer_name', 'display_name', 'full_name', 'name', 'title'],
  },
  {
    key: 'username_field',
    label: 'Username',
    hint: 'Telegram username, when the user has one.',
    patterns: ['telegram_username', 'username', 'user_name', 'login'],
  },
  {
    key: 'last_message_field',
    label: 'Last message',
    hint: 'Preview text for the most recent message.',
    patterns: ['last_message', 'message', 'text', 'body'],
  },
  {
    key: 'last_message_at_field',
    label: 'Last message time',
    hint: 'Timestamp of the most recent message.',
    patterns: ['last_message_at', 'message_at', 'updated_at', 'created_at'],
  },
  {
    key: 'unread_count_field',
    label: 'Unread count',
    hint: 'Number of unread messages in the chat.',
    patterns: ['unread_count', 'unread', 'unread_messages', 'count'],
  },
  {
    key: 'status_field',
    label: 'Status',
    hint: 'Conversation state, for example open, pending or closed.',
    patterns: ['status', 'state'],
  },
]

const TELEGRAM_DEFAULT_MAPPING: Record<TelegramMappingFieldKey, string> = {
  telegram_chat_id_field: 'ugen_telegram_chat_id',
  telegram_user_id_field: 'telegram_user_id',
  display_name_field: 'customer_name',
  username_field: 'telegram_username',
  last_message_field: 'last_message',
  last_message_at_field: 'last_message_at',
  unread_count_field: 'unread_count',
  status_field: 'status',
}

const INSTAGRAM_FIELD_TARGETS: InstagramFieldTarget[] = [
  {
    key: 'instagram_user_id_field',
    label: 'Instagram user ID',
    hint: 'Instagram sender identifier used to match incoming messages to a contact.',
    patterns: ['instagram_user_id', 'instagram_id', 'sender_id', 'user_id'],
  },
  {
    key: 'username_field',
    label: 'Username',
    hint: 'Instagram username shown in conversations.',
    patterns: ['instagram_username', 'username', 'user_name', 'login'],
  },
  {
    key: 'display_name_field',
    label: 'Display name',
    hint: 'Human-readable customer name shown in the inbox.',
    patterns: ['display_name', 'customer_name', 'full_name', 'name', 'title'],
  },
  {
    key: 'profile_picture_field',
    label: 'Profile picture',
    hint: 'Profile image URL for the Instagram contact.',
    patterns: ['profile_picture', 'profile_picture_url', 'avatar', 'avatar_url', 'photo_url'],
  },
  {
    key: 'last_message_field',
    label: 'Last message',
    hint: 'Preview text for the most recent Instagram Direct message.',
    patterns: ['last_message', 'message', 'text', 'body'],
  },
  {
    key: 'last_message_at_field',
    label: 'Last message time',
    hint: 'Timestamp of the most recent Instagram Direct message.',
    patterns: ['last_message_at', 'message_at', 'updated_at', 'created_at'],
  },
  {
    key: 'unread_count_field',
    label: 'Unread count',
    hint: 'Number of unread messages in the conversation.',
    patterns: ['unread_count', 'unread', 'unread_messages', 'count'],
  },
  {
    key: 'status_field',
    label: 'Status',
    hint: 'Conversation state, for example open, pending or closed.',
    patterns: ['status', 'state'],
  },
  {
    key: 'conversation_id_field',
    label: 'Conversation ID',
    hint: 'Instagram Direct conversation identifier used for message routing.',
    patterns: ['conversation_id', 'instagram_conversation_id', 'thread_id', 'chat_id'],
  },
]

const INSTAGRAM_DEFAULT_MAPPING: Record<InstagramMappingFieldKey, string> = {
  instagram_user_id_field: 'instagram_user_id',
  username_field: 'instagram_username',
  display_name_field: 'display_name',
  profile_picture_field: 'profile_picture',
  last_message_field: 'last_message',
  last_message_at_field: 'last_message_at',
  unread_count_field: 'unread_count',
  status_field: 'status',
  conversation_id_field: 'conversation_id',
}

const INSTAGRAM_CONNECT_FIELD_KEYS: InstagramMappingFieldKey[] = [
  'instagram_user_id_field',
  'username_field',
  'display_name_field',
  'profile_picture_field',
  'last_message_field',
  'last_message_at_field',
  'unread_count_field',
  'status_field',
  'conversation_id_field',
]

const TELEGRAM_UNMAPPED_VALUE = '__telegram_unmapped__'
const INSTAGRAM_UNMAPPED_VALUE = '__instagram_unmapped__'

const readObject = (value: unknown): Record<string, any> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}

const readArray = (value: unknown): any[] => Array.isArray(value) ? value : []

const unwrapApiPayload = (payload: unknown): any => {
  const root = readObject(payload)
  if ('data' in root) {
    const data = root.data
    if (data && typeof data === 'object' && 'data' in readObject(data)) return readObject(data).data
    return data
  }
  return payload
}

const normalizeTelegramString = (value: unknown): string =>
  typeof value === 'string' ? value : value == null ? '' : String(value)

const readOAuthUrl = (payload: unknown): string | null => {
  if (typeof payload === 'string') {
    try {
      const url = new URL(payload)
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
    } catch {
      return null
    }
  }
  const data = readObject(payload)
  if (Object.keys(data).length === 0) return null

  return (
    readOAuthUrl(data.data) ??
    readOAuthUrl(data.auth_url) ??
    readOAuthUrl(data.authorization_url) ??
    readOAuthUrl(data.authorizationUrl) ??
    readOAuthUrl(data.url)
  )
}

const getTelegramBotUsername = (resource: any): string => {
  const username = normalizeTelegramString(
    resource?.settings?.telegram?.bot_username ??
      resource?.settings?.telegram?.botUsername ??
      resource?.bot_username ??
      resource?.botUsername,
  ).trim()

  return username.replace(/^@+/, '')
}

const formatTelegramBotUsername = (resource: any): string => {
  const username = getTelegramBotUsername(resource)
  return username ? `@${username}` : ''
}

const getTelegramResourceMapping = (
  resource: any,
): Partial<Record<TelegramMappingFieldKey | 'table_id', string>> => {
  const rawMapping = readObject(resource?.settings?.telegram?.mapping)
  const mapping: Partial<Record<TelegramMappingFieldKey | 'table_id', string>> = {}
  const tableId = normalizeTelegramString(rawMapping.table_id ?? rawMapping.tableId)
  if (tableId) mapping.table_id = tableId

  TELEGRAM_FIELD_TARGETS.forEach((target) => {
    const value = normalizeTelegramString(rawMapping[target.key])
    if (value) mapping[target.key] = value
  })

  return mapping
}

const getInstagramResourceMapping = (
  resource: any,
): Partial<Record<InstagramMappingFieldKey | 'table_id' | 'table_slug', string>> => {
  const rawMapping = readObject(
    resource?.settings?.instagram?.mapping ??
      resource?.settings?.instagram_direct?.mapping ??
      resource?.settings?.instagramDirect?.mapping ??
      resource?.settings?.instagramDirectMessages?.mapping,
  )
  const mapping: Partial<Record<InstagramMappingFieldKey | 'table_id' | 'table_slug', string>> = {}
  const tableId = normalizeTelegramString(rawMapping.table_id ?? rawMapping.tableId)
  const tableSlug = normalizeTelegramString(rawMapping.table_slug ?? rawMapping.tableSlug)
  if (tableId) mapping.table_id = tableId
  if (tableSlug) mapping.table_slug = tableSlug

  INSTAGRAM_FIELD_TARGETS.forEach((target) => {
    const value = normalizeTelegramString(rawMapping[target.key])
    if (value) mapping[target.key] = value
  })

  return mapping
}

const getTelegramFieldValue = (field: any): string =>
  normalizeTelegramString(
    field?.slug ??
      field?.name ??
      field?.key ??
      field?.field_slug ??
      field?.field_name ??
      field?.column_name ??
      field?.id,
  )

const normalizeTelegramMapping = (raw: any): Partial<Record<TelegramMappingFieldKey, string>> => {
  const source = readObject(raw)
  const mapping: Partial<Record<TelegramMappingFieldKey, string>> = {}
  TELEGRAM_FIELD_TARGETS.forEach((target) => {
    const value = normalizeTelegramString(source[target.key])
    if (value) mapping[target.key] = value
  })
  return mapping
}

const normalizeInstagramMapping = (raw: any): Partial<Record<InstagramMappingFieldKey, string>> => {
  const source = readObject(raw)
  const mapping: Partial<Record<InstagramMappingFieldKey, string>> = {}
  INSTAGRAM_FIELD_TARGETS.forEach((target) => {
    const value = normalizeTelegramString(source[target.key])
    if (value) mapping[target.key] = value
  })
  return mapping
}

const normalizeTelegramManagedSession = (payload: unknown): TelegramManagedSession => {
  const data = readObject(unwrapApiPayload(payload))
  const startLink = normalizeTelegramString(data.start_link ?? data.startLink)
  const createLink = normalizeTelegramString(data.create_link ?? data.createLink)
  if (!createLink && !startLink) throw new Error('Telegram setup response is missing setup link')

  return {
    id: normalizeTelegramString(data.id),
    status: normalizeTelegramString(data.status),
    startLink,
    createLink,
    displayName: normalizeTelegramString(data.display_name ?? data.displayName),
    suggestedUsername: normalizeTelegramString(data.suggested_username ?? data.suggestedUsername),
  }
}

const normalizeTelegramField = (field: any, index: number): TelegramFieldOption | null => {
  const value = getTelegramFieldValue(field)
  if (!value) return null
  return {
    id: normalizeTelegramString(field?.id) || value || String(index),
    value,
    label: normalizeTelegramString(field?.label ?? field?.title ?? field?.name ?? field?.slug) || value,
    type: normalizeTelegramString(field?.type ?? field?.field_type ?? field?.data_type) || undefined,
  }
}

const normalizeTelegramMappingOptions = (payload: unknown): TelegramTableOption[] => {
  const root = unwrapApiPayload(payload)
  const data = readObject(root)
  const tablesRaw = readArray(
    Array.isArray(root)
      ? root
      : data.tables ??
          data.table_options ??
          data.mapping_options ??
          data.options ??
          data.items ??
          data.response,
  )
  const fieldsByTable = readObject(data.fields_by_table ?? data.fieldsByTable ?? data.table_fields)

  return tablesRaw.map((table: any, index: number) => {
    const id = normalizeTelegramString(table?.id ?? table?.table_id ?? table?.tableId)
    const slug = normalizeTelegramString(table?.slug ?? table?.name ?? table?.table_slug ?? id)
    const key = id || slug || String(index)
    const fieldsRaw = readArray(
      table?.fields ??
        table?.columns ??
        table?.table_fields ??
        table?.schema?.fields ??
        fieldsByTable[id] ??
        fieldsByTable[slug],
    )
    const fields = fieldsRaw
      .map((field: any, fieldIndex: number) => normalizeTelegramField(field, fieldIndex))
      .filter(Boolean) as TelegramFieldOption[]

    return {
      id: key,
      slug: slug || key,
      label: normalizeTelegramString(table?.label ?? table?.title ?? table?.name ?? slug ?? id) || 'Untitled table',
      fields,
      suggestedMapping: normalizeTelegramMapping(table?.mapping ?? table?.suggested_mapping ?? table?.suggestedMapping),
    }
  }).filter((table) => table.id)
}

const normalizeInstagramMappingOptions = (payload: unknown): InstagramTableOption[] => {
  const root = unwrapApiPayload(payload)
  const data = readObject(root)
  const tablesRaw = readArray(
    Array.isArray(root)
      ? root
      : data.tables ??
          data.table_options ??
          data.mapping_options ??
          data.options ??
          data.items ??
          data.response,
  )
  const fieldsByTable = readObject(data.fields_by_table ?? data.fieldsByTable ?? data.table_fields)

  return tablesRaw.map((table: any, index: number) => {
    const id = normalizeTelegramString(table?.id ?? table?.table_id ?? table?.tableId)
    const slug = normalizeTelegramString(table?.slug ?? table?.name ?? table?.table_slug ?? id)
    const key = id || slug || String(index)
    const fieldsRaw = readArray(
      table?.fields ??
        table?.columns ??
        table?.table_fields ??
        table?.schema?.fields ??
        fieldsByTable[id] ??
        fieldsByTable[slug],
    )
    const fields = fieldsRaw
      .map((field: any, fieldIndex: number) => normalizeTelegramField(field, fieldIndex))
      .filter(Boolean) as TelegramFieldOption[]

    return {
      id: key,
      slug: slug || key,
      label: normalizeTelegramString(table?.label ?? table?.title ?? table?.name ?? slug ?? id) || 'Untitled table',
      fields,
      suggestedMapping: normalizeInstagramMapping(table?.mapping ?? table?.suggested_mapping ?? table?.suggestedMapping),
    }
  }).filter((table) => table.id)
}

const findTelegramFieldMatch = (
  fields: TelegramFieldOption[],
  patterns: string[],
): string => {
  const normalized = fields.map((field) => ({
    ...field,
    comparable: field.value.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
  }))

  for (const pattern of patterns) {
    const target = pattern.toLowerCase()
    const exact = normalized.find((field) => field.comparable === target)
    if (exact) return exact.value
  }

  for (const pattern of patterns) {
    const target = pattern.toLowerCase()
    const partial = normalized.find((field) => field.comparable.includes(target))
    if (partial) return partial.value
  }

  return ''
}

const normalizeFieldComparable = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')

const isTelegramFieldValue = (value: string): boolean => {
  const comparable = normalizeFieldComparable(value)
  return comparable.includes('telegram') || comparable === 'chat_id' || comparable.endsWith('_chat_id')
}

const findInstagramFieldMatch = (
  fields: TelegramFieldOption[],
  patterns: string[],
): string => {
  const normalized = fields
    .filter((field) => !isTelegramFieldValue(field.value))
    .map((field) => ({
      ...field,
      comparable: normalizeFieldComparable(field.value),
    }))

  for (const pattern of patterns) {
    const target = normalizeFieldComparable(pattern)
    const exact = normalized.find((field) => field.comparable === target)
    if (exact) return exact.value
  }

  const instagramSpecific = normalized.find((field) => field.comparable.startsWith('instagram_'))
  if (instagramSpecific) {
    for (const pattern of patterns) {
      const target = normalizeFieldComparable(pattern)
      if (instagramSpecific.comparable.includes(target)) return instagramSpecific.value
    }
  }

  return ''
}

const createTelegramAutoMapping = (
  table: TelegramTableOption,
): Partial<Record<TelegramMappingFieldKey, string>> => {
  const mapping: Partial<Record<TelegramMappingFieldKey, string>> = { ...table.suggestedMapping }
  TELEGRAM_FIELD_TARGETS.forEach((target) => {
    if (!mapping[target.key]) mapping[target.key] = findTelegramFieldMatch(table.fields, target.patterns)
  })
  return mapping
}

const createTelegramPayloadMapping = (
  tableId: string,
  mapping: Partial<Record<TelegramMappingFieldKey, string>>,
) => {
  const payload: Record<string, string> = { table_id: tableId }
  TELEGRAM_FIELD_TARGETS.forEach((target) => {
    payload[target.key] = mapping[target.key]?.trim() || TELEGRAM_DEFAULT_MAPPING[target.key]
  })
  return payload
}

const createInstagramAutoMapping = (
  table: InstagramTableOption,
): Partial<Record<InstagramMappingFieldKey, string>> => {
  const mapping: Partial<Record<InstagramMappingFieldKey, string>> = {}
  INSTAGRAM_FIELD_TARGETS.forEach((target) => {
    const suggested = table.suggestedMapping[target.key]
    if (suggested && !isTelegramFieldValue(suggested)) mapping[target.key] = suggested
  })
  INSTAGRAM_FIELD_TARGETS.forEach((target) => {
    if (!mapping[target.key]) mapping[target.key] = findInstagramFieldMatch(table.fields, target.patterns)
  })
  return mapping
}

const createInstagramConnectParams = (
  table: InstagramTableOption,
  mapping: Partial<Record<InstagramMappingFieldKey, string>>,
) => {
  const params: Record<string, string> = {
    table_id: table.id,
    table_slug: table.slug,
  }
  INSTAGRAM_CONNECT_FIELD_KEYS.forEach((key) => {
    const selected = mapping[key]?.trim() || ''
    params[key] =
      selected && !isTelegramFieldValue(selected) ? selected : INSTAGRAM_DEFAULT_MAPPING[key]
  })
  return params
}

const createTelegramBotUsername = (name: string): string => {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
  const trimmed = (base || 'support').replace(/_?bot$/i, '').slice(0, 24)
  return `${trimmed}_bot`
}

const isTelegramBotUsernameValid = (value: string): boolean =>
  /^[a-z][a-z0-9_]{2,28}bot$/i.test(value) && value.length >= 5 && value.length <= 32

const TelegramSetupModal = ({
  open,
  onOpenChange,
  mcpProjectId,
  mainProjectId,
  mainEnvironmentId,
  projectTitle,
  onSaved,
  mockSession,
  initialResource,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mcpProjectId: string
  mainProjectId: string
  mainEnvironmentId: string
  projectTitle: string
  onSaved: () => void
  mockSession?: TelegramManagedSession
  initialResource?: any
}) => {
  const t = useTranslations('widgets.projectWorkspace')
  const [search, setSearch] = useState('')
  const [selectedTableId, setSelectedTableId] = useState<string>('')
  const [displayName, setDisplayName] = useState('Support Bot')
  const [suggestedUsername, setSuggestedUsername] = useState('')
  const [mappingByTable, setMappingByTable] = useState<Record<string, Partial<Record<TelegramMappingFieldKey, string>>>>({})
  const [managedSession, setManagedSession] = useState<TelegramManagedSession | null>(null)
  const [isWaitingForResource, setIsWaitingForResource] = useState(false)
  const pollInFlightRef = useRef(false)

  const setupReady = !!mcpProjectId && !!mainProjectId && !!mainEnvironmentId
  const isMockSession = !!mockSession

  useEffect(() => {
    if (!open) return
    if (mockSession) {
      setManagedSession(mockSession)
      setIsWaitingForResource(true)
      return
    }
    const resourceName = normalizeTelegramString(initialResource?.name).trim()
    const botUsername = getTelegramBotUsername(initialResource)
    const resourceMapping = getTelegramResourceMapping(initialResource)

    setDisplayName(resourceName || 'Support Bot')
    setSuggestedUsername(botUsername || createTelegramBotUsername(projectTitle || 'support'))
    setManagedSession(null)
    setIsWaitingForResource(false)

    if (resourceMapping.table_id) {
      const tableMapping: Partial<Record<TelegramMappingFieldKey, string>> = {}
      TELEGRAM_FIELD_TARGETS.forEach((target) => {
        const value = resourceMapping[target.key]
        if (value) tableMapping[target.key] = value
      })
      setSelectedTableId(resourceMapping.table_id)
      setMappingByTable({ [resourceMapping.table_id]: tableMapping })
    } else {
      setSelectedTableId('')
      setMappingByTable({})
    }
  }, [open, projectTitle, mockSession, initialResource])

  const {
    data: tables = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['telegram-mapping-options', mcpProjectId, mainProjectId, mainEnvironmentId],
    queryFn: async () => {
      const { data } = await api.get(`/v1/mcp_project/${mcpProjectId}/telegram/mapping-options`, {
        params: { 'project-id': mainProjectId },
        headers: { 'Environment-Id': mainEnvironmentId },
      })
      return normalizeTelegramMappingOptions(data)
    },
    enabled: open && setupReady && !isMockSession,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const filteredTables = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return tables
    return tables.filter((table) =>
      `${table.label} ${table.slug}`.toLowerCase().includes(query),
    )
  }, [tables, search])

  useEffect(() => {
    if (!open || selectedTableId || tables.length === 0) return
    const first = tables[0]
    setSelectedTableId(first.id)
    setMappingByTable((prev) => ({
      ...prev,
      [first.id]: prev[first.id] ?? createTelegramAutoMapping(first),
    }))
  }, [open, selectedTableId, tables])

  const selectedTable = useMemo(
    () => tables.find((table) => table.id === selectedTableId) ?? null,
    [tables, selectedTableId],
  )
  const mapping = selectedTable ? mappingByTable[selectedTable.id] ?? {} : {}
  const missingFields = TELEGRAM_FIELD_TARGETS.filter((target) => !mapping[target.key])
  const mappedCount = TELEGRAM_FIELD_TARGETS.length - missingFields.length
  const usernameValid = isTelegramBotUsernameValid(suggestedUsername)
  const canSave =
    setupReady &&
    !!selectedTable &&
    !!displayName.trim() &&
    usernameValid

  const selectTable = (table: TelegramTableOption) => {
    setSelectedTableId(table.id)
    setMappingByTable((prev) => ({
      ...prev,
      [table.id]: prev[table.id] ?? createTelegramAutoMapping(table),
    }))
  }

  const setMappingValue = (key: TelegramMappingFieldKey, value: string) => {
    if (!selectedTable) return
    setMappingByTable((prev) => ({
      ...prev,
      [selectedTable.id]: {
        ...(prev[selectedTable.id] ?? {}),
        [key]: value,
      },
    }))
  }

  const { mutate: saveTelegramSession, isPending: isSaving } = useMutation({
    mutationFn: async (): Promise<TelegramManagedSession> => {
      if (!selectedTable) throw new Error('Select a table first')
      const payload = {
        display_name: displayName.trim(),
        suggested_username: suggestedUsername.trim(),
        mapping: createTelegramPayloadMapping(selectedTable.id, mapping),
      }
      const { data } = await api.post(`/v1/mcp_project/${mcpProjectId}/telegram/managed-session`, payload, {
        params: { 'project-id': mainProjectId },
        headers: { 'Environment-Id': mainEnvironmentId },
      })
      return normalizeTelegramManagedSession(data)
    },
    onSuccess: (session) => {
      setManagedSession(session)
      setIsWaitingForResource(true)
      toast.success(t('telegramLinkCreated'))
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.data || err?.response?.data?.message || err?.message || 'Failed to configure Telegram')
    },
  })

  useEffect(() => {
    if (!open || !managedSession || !isWaitingForResource || !mcpProjectId || isMockSession) return

    let cancelled = false

    const pollTelegramResource = async () => {
      if (pollInFlightRef.current) return
      pollInFlightRef.current = true
      try {
        const { data } = await api.get('/v2/company/project/resource', {
          params: { project_id: mcpProjectId },
        })
        const resources = readArray(data?.data?.resources).map(normalizeApiResource)
        const hasTelegram = resources.some((resource: any) => resource.resource_type === TELEGRAM_TYPE_VALUE)
        if (!cancelled && hasTelegram) {
          setIsWaitingForResource(false)
          toast.success(t('telegramConnected'))
          onSaved()
          onOpenChange(false)
        }
      } catch (err) {
        console.error('Telegram resource polling failed', err)
      } finally {
        pollInFlightRef.current = false
      }
    }

    void pollTelegramResource()
    const interval = window.setInterval(() => {
      void pollTelegramResource()
    }, 2000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      pollInFlightRef.current = false
    }
  }, [open, managedSession, isWaitingForResource, mcpProjectId, isMockSession, onSaved, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        'gap-0 overflow-hidden p-0',
        managedSession ? 'sm:max-w-[420px]' : 'sm:max-w-[980px]',
      )}>
        <div className="flex max-h-[86vh] flex-col">
          <DialogHeader className="border-border-subtle space-y-1 border-b px-5 py-4 text-left">
            <DialogTitle className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-5 w-5 bg-contain bg-center bg-no-repeat"
                style={{ backgroundImage: "url('/telegram.svg')" }}
              />
              {t('telegramIntegration')}
            </DialogTitle>
            <DialogDescription>
              Select the chat table, map Telegram fields, then create a managed Telegram session.
            </DialogDescription>
          </DialogHeader>

          {managedSession ? (
            (() => {
              const telegramSetupLink = managedSession.createLink || managedSession.startLink
              return (
                <div className="flex min-h-0 flex-1 flex-col items-center px-6 py-6 text-center">
                  <h3 className="text-text-main text-base font-semibold">{t('openTelegramSetup')}</h3>
                  <p className="text-text-muted mt-1 max-w-72 text-sm leading-relaxed">
                    Scan the QR code or open Telegram. This window closes automatically after connection.
                  </p>

                  <a
                    href={telegramSetupLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-border-subtle mt-5 rounded-xl border bg-white p-2.5 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md"
                    aria-label={t('openTelegramSetupLink')}
                  >
                    <StyledQr value={telegramSetupLink} size={220} />
                  </a>

                  <div className="mt-4 w-full max-w-72">
                    <a
                      href={telegramSetupLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium shadow transition-all active:scale-[0.98]"
                    >
                      <ExternalLink size={14} />
                      {t('openTelegramSetup')}
                    </a>
                  </div>
                </div>
              )
            })()
          ) : !setupReady ? (
            <div className="flex flex-col items-center justify-center gap-3 px-8 py-14 text-center">
              <AlertCircle className="text-amber-500" size={28} />
              <div>
                <p className="text-text-main text-sm font-semibold">{t('contextLoading')}</p>
                <p className="text-text-muted mt-1 text-sm">
                  Telegram setup needs the main project id and environment id. Try again after the project finishes loading.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1">
              <div className="border-border-subtle flex w-72 shrink-0 flex-col border-r">
                <div className="border-border-subtle border-b p-3">
                  <div className="bg-bg-main border-border-subtle focus-within:border-primary/60 flex items-center rounded-lg border px-2.5 transition-colors">
                    <Search size={14} className="text-text-muted shrink-0" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t('searchTables')}
                      className="placeholder:text-text-muted text-text-main w-full bg-transparent px-2 py-2 text-sm outline-none"
                    />
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-3">
                  {isLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 8 }).map((_, index) => (
                        <Skeleton key={index} className="h-14 rounded-lg" />
                      ))}
                    </div>
                  ) : isError ? (
                    <div className="text-text-muted flex flex-col items-center gap-3 px-2 py-8 text-center text-sm">
                      <AlertCircle className="text-destructive" size={22} />
                      <span>{t('loadTablesFailed')}</span>
                      <Button size="sm" variant="outline" onClick={() => refetch()}>
                        {t('retry')}
                      </Button>
                    </div>
                  ) : filteredTables.length === 0 ? (
                    <div className="text-text-muted px-2 py-8 text-center text-sm">
                      {t('noTables')}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredTables.map((table) => {
                        const tableMapping = mappingByTable[table.id] ?? createTelegramAutoMapping(table)
                        const tableMappedCount = TELEGRAM_FIELD_TARGETS.filter((target) => tableMapping[target.key]).length
                        const isActive = selectedTableId === table.id
                        return (
                          <button
                            key={table.id}
                            type="button"
                            onClick={() => selectTable(table)}
                            className={cn(
                              'border-border-subtle flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all',
                              isActive
                                ? 'border-primary/50 bg-primary/5'
                                : 'hover:border-primary/30 hover:bg-bg-sidebar',
                            )}
                          >
                            <div className={cn(
                              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
                              isActive ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border-subtle bg-bg-main text-text-muted',
                            )}>
                              <Table2 size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-text-main truncate text-sm font-semibold">
                                {table.label}
                              </div>
                              <div className="text-text-muted mt-0.5 text-xs">
                                {table.fields.length} fields · {tableMappedCount}/{TELEGRAM_FIELD_TARGETS.length} matched
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="border-border-subtle border-b p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-text-main text-sm font-medium">{t('displayName')}</label>
                      <Input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder={t('supportBot')}
                        className="bg-bg-sidebar border-border-subtle"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-text-main text-sm font-medium">{t('suggestedUsername')}</label>
                      <Input
                        value={suggestedUsername}
                        onChange={(e) =>
                          setSuggestedUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                        }
                        placeholder="my_shop_support_bot"
                        className={cn(
                          'bg-bg-sidebar border-border-subtle',
                          suggestedUsername && !usernameValid && 'border-amber-500/60',
                        )}
                      />
                      {suggestedUsername && !usernameValid && (
                        <p className="text-amber-600 dark:text-amber-400 text-xs">
                          Use 5-32 latin letters, numbers or underscores. Bot usernames must end with "bot".
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {!selectedTable ? (
                  <div className="text-text-muted flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
                    <Database size={28} className="opacity-40" />
                    <p className="text-sm">{t('selectTableTelegram')}</p>
                  </div>
                ) : (
                  <>
                    <div className="border-border-subtle flex items-center gap-3 border-b px-5 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Bot size={16} className="text-[#26A5E4]" />
                          <span className="text-text-main truncate text-sm font-semibold">
                            {selectedTable.label}
                          </span>
                        </div>
                        <p className="text-text-muted mt-0.5 text-xs">
                          {t('mapFieldsHint')}
                        </p>
                      </div>
                      <span className={cn(
                        'ml-auto shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold',
                        missingFields.length === 0
                          ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                      )}>
                        {mappedCount}/{TELEGRAM_FIELD_TARGETS.length} mapped
                      </span>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto">
                      {TELEGRAM_FIELD_TARGETS.map((target) => {
                        const selected = mapping[target.key] ?? ''
                        const isMissing = !selected
                        return (
                          <div
                            key={target.key}
                            className={cn(
                              'border-border-subtle flex items-start gap-4 border-b px-5 py-4',
                              isMissing ? 'bg-amber-500/[0.03]' : 'hover:bg-hover-bg/40',
                            )}
                          >
                            <div className={cn(
                              'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                              selected
                                ? 'border-green-500/30 bg-green-500/10 text-green-500'
                                : 'border-amber-500/30 bg-amber-500/10 text-amber-500',
                            )}>
                              {selected ? <Check size={15} /> : <AlertCircle size={15} />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-text-main text-sm font-semibold">{target.label}</span>
                                <span className={cn(
                                  'rounded-full px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide',
                                  selected
                                    ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                                    : 'bg-bg-sidebar text-text-muted',
                                )}>
                                  {selected ? 'Mapped' : 'Default'}
                                </span>
                              </div>
                              <p className="text-text-muted mt-1 text-xs leading-snug">{target.hint}</p>
                            </div>
                            <div className="w-64 shrink-0">
                              <Select
                                value={selected || TELEGRAM_UNMAPPED_VALUE}
                                onValueChange={(value) =>
                                  setMappingValue(target.key, value === TELEGRAM_UNMAPPED_VALUE ? '' : value)
                                }
                              >
                                <SelectTrigger
                                  className={cn(
                                    'h-9 bg-bg-sidebar text-sm',
                                    selected ? 'border-green-500/40' : 'border-amber-500/50',
                                  )}
                                >
                                  <SelectValue placeholder={t('chooseField')} />
                                </SelectTrigger>
                                <SelectContent className="max-h-72">
                                  <SelectItem value={TELEGRAM_UNMAPPED_VALUE}>
                                    <span className="text-text-muted">
                                      Use default: {TELEGRAM_DEFAULT_MAPPING[target.key]}
                                    </span>
                                  </SelectItem>
                                  {selectedTable.fields.map((field) => (
                                    <SelectItem key={field.value} value={field.value}>
                                      <span className="flex min-w-0 items-center gap-2">
                                        <span className="truncate">{field.label}</span>
                                        {field.type && (
                                          <span className="bg-bg-sidebar text-text-muted shrink-0 rounded px-1 py-px font-mono text-[10px]">
                                            {field.type}
                                          </span>
                                        )}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="border-border-subtle flex items-center justify-between gap-3 border-t px-5 py-3">
            {managedSession ? (
              <>
                <p className="text-text-muted flex items-center gap-2 text-xs">
                  {isWaitingForResource ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      {t('waitingConnection')}
                    </>
                  ) : (
                    'Connected.'
                  )}
                </p>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  {t('close')}
                </Button>
              </>
            ) : (
              <>
                <p className="text-text-muted hidden text-xs sm:block">
                  {!selectedTable
                    ? 'Select a table to continue.'
                    : missingFields.length > 0
                      ? `${mappedCount}/${TELEGRAM_FIELD_TARGETS.length} fields selected. Defaults will be sent for the rest.`
                      : 'All mappings are ready.'}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    {t('close')}
                  </Button>
                  <Button
                    variant="primary"
                    loading={isSaving}
                    disabled={!canSave}
                    onClick={() => saveTelegramSession()}
                  >
                    {t('createManagedSession')}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const InstagramSetupModal = ({
  open,
  onOpenChange,
  mcpProjectId,
  mainProjectId,
  openOAuthPopup,
  initialResource,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mcpProjectId: string
  mainProjectId: string
  openOAuthPopup: () => Window | null
  initialResource?: any
}) => {
  const t = useTranslations('widgets.projectWorkspace')
  const [search, setSearch] = useState('')
  const [selectedTableId, setSelectedTableId] = useState<string>('')
  const [mappingByTable, setMappingByTable] = useState<Record<string, Partial<Record<InstagramMappingFieldKey, string>>>>({})
  const [isWaitingForOAuth, setIsWaitingForOAuth] = useState(false)

  const setupReady = !!mcpProjectId && !!mainProjectId

  useEffect(() => {
    if (!open) return
    const resourceMapping = getInstagramResourceMapping(initialResource)
    setIsWaitingForOAuth(false)

    const selectedId = resourceMapping.table_id || resourceMapping.table_slug || ''
    if (selectedId) {
      const tableMapping: Partial<Record<InstagramMappingFieldKey, string>> = {}
      INSTAGRAM_FIELD_TARGETS.forEach((target) => {
        const value = resourceMapping[target.key]
        if (value) tableMapping[target.key] = value
      })
      setSelectedTableId(selectedId)
      setMappingByTable({ [selectedId]: tableMapping })
    } else {
      setSelectedTableId('')
      setMappingByTable({})
    }
  }, [open, initialResource])

  const {
    data: tables = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['instagram-mapping-options', mcpProjectId, mainProjectId],
    queryFn: async () => {
      const { data } = await api.get(`/v1/mcp_project/${mcpProjectId}/instagram/mapping-options`, {
        params: { 'project-id': mainProjectId },
      })
      return normalizeInstagramMappingOptions(data)
    },
    enabled: open && setupReady,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const filteredTables = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return tables
    return tables.filter((table) =>
      `${table.label} ${table.slug}`.toLowerCase().includes(query),
    )
  }, [tables, search])

  useEffect(() => {
    if (!open || tables.length === 0) return
    if (!selectedTableId) {
      const first = tables[0]
      setSelectedTableId(first.id)
      setMappingByTable((prev) => ({
        ...prev,
        [first.id]: prev[first.id] ?? createInstagramAutoMapping(first),
      }))
      return
    }

    if (tables.some((table) => table.id === selectedTableId)) return
    const matchBySlug = tables.find((table) => table.slug === selectedTableId)
    if (!matchBySlug) return
    setSelectedTableId(matchBySlug.id)
    setMappingByTable((prev) => ({
      ...prev,
      [matchBySlug.id]: prev[matchBySlug.id] ?? prev[selectedTableId] ?? createInstagramAutoMapping(matchBySlug),
    }))
  }, [open, selectedTableId, tables])

  const selectedTable = useMemo(
    () => tables.find((table) => table.id === selectedTableId) ?? null,
    [tables, selectedTableId],
  )
  const mapping = selectedTable ? mappingByTable[selectedTable.id] ?? {} : {}
  const missingFields = INSTAGRAM_FIELD_TARGETS.filter((target) => !mapping[target.key])
  const mappedCount = INSTAGRAM_FIELD_TARGETS.length - missingFields.length
  const canConnect = setupReady && !!selectedTable && !isWaitingForOAuth

  const selectTable = (table: InstagramTableOption) => {
    setSelectedTableId(table.id)
    setMappingByTable((prev) => ({
      ...prev,
      [table.id]: prev[table.id] ?? createInstagramAutoMapping(table),
    }))
  }

  const setMappingValue = (key: InstagramMappingFieldKey, value: string) => {
    if (!selectedTable) return
    setMappingByTable((prev) => ({
      ...prev,
      [selectedTable.id]: {
        ...(prev[selectedTable.id] ?? {}),
        [key]: value,
      },
    }))
  }

  const { mutate: connectInstagram, isPending: isConnecting } = useMutation({
    mutationFn: async (popup: Window | null): Promise<void> => {
      try {
        if (!selectedTable) throw new Error('Select a table first')
        const { data } = await api.get(`/v1/mcp_project/${mcpProjectId}/instagram/connect`, {
          params: {
            'project-id': mainProjectId,
            ...createInstagramConnectParams(selectedTable, mapping),
          },
        })
        const authUrl = readOAuthUrl(data)
        if (!authUrl) throw new Error('Instagram connect endpoint returned no OAuth URL')
        if (popup && !popup.closed) popup.location.href = authUrl
        else window.open(authUrl, '_blank')
      } catch (err) {
        popup?.close()
        throw err
      }
    },
    onSuccess: () => {
      setIsWaitingForOAuth(true)
      toast.success(t('instagramAuthOpened'))
    },
    onError: (err: any) => {
      setIsWaitingForOAuth(false)
      toast.error(err?.response?.data?.data || err?.response?.data?.message || err?.message || 'Failed to connect Instagram')
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[980px]">
        <div className="flex max-h-[86vh] flex-col">
          <DialogHeader className="border-border-subtle space-y-1 border-b px-5 py-4 text-left">
            <DialogTitle className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-5 w-5 bg-contain bg-center bg-no-repeat"
                style={{ backgroundImage: "url('/instagram.svg')" }}
              />
              {t('instagramIntegration')}
            </DialogTitle>
            <DialogDescription>
              Select the conversation table, map Instagram fields, then authorize the Instagram account.
            </DialogDescription>
          </DialogHeader>

          {!setupReady ? (
            <div className="flex flex-col items-center justify-center gap-3 px-8 py-14 text-center">
              <AlertCircle className="text-amber-500" size={28} />
              <div>
                <p className="text-text-main text-sm font-semibold">{t('contextLoading')}</p>
                <p className="text-text-muted mt-1 text-sm">
                  Instagram Direct setup needs the main project id. Try again after the project finishes loading.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1">
              <div className="border-border-subtle flex w-72 shrink-0 flex-col border-r">
                <div className="border-border-subtle border-b p-3">
                  <div className="bg-bg-main border-border-subtle focus-within:border-primary/60 flex items-center rounded-lg border px-2.5 transition-colors">
                    <Search size={14} className="text-text-muted shrink-0" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t('searchTables')}
                      className="placeholder:text-text-muted text-text-main w-full bg-transparent px-2 py-2 text-sm outline-none"
                    />
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-3">
                  {isLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 8 }).map((_, index) => (
                        <Skeleton key={index} className="h-14 rounded-lg" />
                      ))}
                    </div>
                  ) : isError ? (
                    <div className="text-text-muted flex flex-col items-center gap-3 px-2 py-8 text-center text-sm">
                      <AlertCircle className="text-destructive" size={22} />
                      <span>{t('loadTablesFailed')}</span>
                      <Button size="sm" variant="outline" onClick={() => refetch()}>
                        {t('retry')}
                      </Button>
                    </div>
                  ) : filteredTables.length === 0 ? (
                    <div className="text-text-muted px-2 py-8 text-center text-sm">
                      {t('noTables')}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredTables.map((table) => {
                        const tableMapping = mappingByTable[table.id] ?? createInstagramAutoMapping(table)
                        const tableMappedCount = INSTAGRAM_FIELD_TARGETS.filter((target) => tableMapping[target.key]).length
                        const isActive = selectedTableId === table.id
                        return (
                          <button
                            key={table.id}
                            type="button"
                            onClick={() => selectTable(table)}
                            className={cn(
                              'border-border-subtle flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all',
                              isActive
                                ? 'border-primary/50 bg-primary/5'
                                : 'hover:border-primary/30 hover:bg-bg-sidebar',
                            )}
                          >
                            <div className={cn(
                              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
                              isActive ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border-subtle bg-bg-main text-text-muted',
                            )}>
                              <Table2 size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-text-main truncate text-sm font-semibold">
                                {table.label}
                              </div>
                              <div className="text-text-muted mt-0.5 text-xs">
                                {table.fields.length} fields · {tableMappedCount}/{INSTAGRAM_FIELD_TARGETS.length} matched
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                {!selectedTable ? (
                  <div className="text-text-muted flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
                    <Database size={28} className="opacity-40" />
                    <p className="text-sm">{t('selectTableInstagram')}</p>
                  </div>
                ) : (
                  <>
                    <div className="border-border-subtle flex items-center gap-3 border-b px-5 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className="h-4 w-4 shrink-0 bg-contain bg-center bg-no-repeat"
                            style={{ backgroundImage: "url('/instagram.svg')" }}
                          />
                          <span className="text-text-main truncate text-sm font-semibold">
                            {selectedTable.label}
                          </span>
                        </div>
                        <p className="text-text-muted mt-0.5 text-xs">
                          {t('mapFieldsHint')}
                        </p>
                      </div>
                      <span className={cn(
                        'ml-auto shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold',
                        missingFields.length === 0
                          ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                      )}>
                        {mappedCount}/{INSTAGRAM_FIELD_TARGETS.length} mapped
                      </span>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto">
                      {INSTAGRAM_FIELD_TARGETS.map((target) => {
                        const selected = mapping[target.key] ?? ''
                        const isMissing = !selected
                        return (
                          <div
                            key={target.key}
                            className={cn(
                              'border-border-subtle flex items-start gap-4 border-b px-5 py-4',
                              isMissing ? 'bg-amber-500/[0.03]' : 'hover:bg-hover-bg/40',
                            )}
                          >
                            <div className={cn(
                              'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                              selected
                                ? 'border-green-500/30 bg-green-500/10 text-green-500'
                                : 'border-amber-500/30 bg-amber-500/10 text-amber-500',
                            )}>
                              {selected ? <Check size={15} /> : <AlertCircle size={15} />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-text-main text-sm font-semibold">{target.label}</span>
                                <span className={cn(
                                  'rounded-full px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide',
                                  selected
                                    ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                                    : 'bg-bg-sidebar text-text-muted',
                                )}>
                                  {selected ? 'Mapped' : 'Default'}
                                </span>
                              </div>
                              <p className="text-text-muted mt-1 text-xs leading-snug">{target.hint}</p>
                            </div>
                            <div className="w-64 shrink-0">
                              <Select
                                value={selected || INSTAGRAM_UNMAPPED_VALUE}
                                onValueChange={(value) =>
                                  setMappingValue(target.key, value === INSTAGRAM_UNMAPPED_VALUE ? '' : value)
                                }
                              >
                                <SelectTrigger
                                  className={cn(
                                    'h-9 bg-bg-sidebar text-sm',
                                    selected ? 'border-green-500/40' : 'border-amber-500/50',
                                  )}
                                >
                                  <SelectValue placeholder={t('chooseField')} />
                                </SelectTrigger>
                                <SelectContent className="max-h-72">
                                  <SelectItem value={INSTAGRAM_UNMAPPED_VALUE}>
                                    <span className="text-text-muted">
                                      Use default: {INSTAGRAM_DEFAULT_MAPPING[target.key]}
                                    </span>
                                  </SelectItem>
                                  {selectedTable.fields.map((field) => (
                                    <SelectItem key={field.value} value={field.value}>
                                      <span className="flex min-w-0 items-center gap-2">
                                        <span className="truncate">{field.label}</span>
                                        {field.type && (
                                          <span className="bg-bg-sidebar text-text-muted shrink-0 rounded px-1 py-px font-mono text-[10px]">
                                            {field.type}
                                          </span>
                                        )}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="border-border-subtle flex items-center justify-between gap-3 border-t px-5 py-3">
            <p className="text-text-muted hidden text-xs sm:flex sm:items-center sm:gap-2">
              {isWaitingForOAuth ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  {t('completeInstagramAuth')}
                </>
              ) : !selectedTable ? (
                'Select a table to continue.'
              ) : missingFields.length > 0 ? (
                `${mappedCount}/${INSTAGRAM_FIELD_TARGETS.length} fields selected. Defaults will be sent for the rest.`
              ) : (
                'All mappings are ready.'
              )}
            </p>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('close')}
              </Button>
              <Button
                variant="primary"
                loading={isConnecting}
                disabled={!canConnect}
                onClick={() => connectInstagram(openOAuthPopup())}
              >
                {t('authorizeInstagram')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

type View = 'grid' | 'detail'

export const ResourcesPage = ({ projectId }: { projectId: string }) => {
  const t = useTranslations('widgets.projectWorkspace')
  const mainProjectId = useAuthStore((state) => state.ucodeProjectId || '')
  const mainEnvironmentId = useAuthStore((state) => state.projectEnvId || '')
  const projectTitle = useAuthStore((state) => state.project?.title || 'support')
  const [view, setView] = useState<View>('grid')
  const [selectedResource, setSelectedResource] = useState<ResourceItem | null>(null)
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null)
  const [editingResourceType, setEditingResourceType] = useState<number | null>(null)
  const [formData, setFormData] = useState({ name: '', type: '', environment: '' })
  const [extraFields, setExtraFields] = useState<Record<string, any>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All Categories')
  const [isGoogleDriveConnected, setIsGoogleDriveConnected] = useState(false)
  const [isGoogleCalendarConnected, setIsGoogleCalendarConnected] = useState(false)
  const [isInstagramDirectConnected, setIsInstagramDirectConnected] = useState(false)
  // Field-mapping modal (bind a uCode table's fields to Google Calendar event
  // properties). Kept here so it's reachable from every Google Calendar card.
  const [calendarMappingOpen, setCalendarMappingOpen] = useState(false)
  const [telegramSetupOpen, setTelegramSetupOpen] = useState(false)
  const [telegramSetupResource, setTelegramSetupResource] = useState<any | null>(null)
  const [instagramSetupOpen, setInstagramSetupOpen] = useState(false)
  const [instagramSetupResource, setInstagramSetupResource] = useState<any | null>(null)
  // Google Lead Ads setup/management modal (table + field mapping → key/webhook).
  const [googleAdsModalOpen, setGoogleAdsModalOpen] = useState(false)
  const [googleAdsModalMode, setGoogleAdsModalMode] = useState<'list' | 'create'>('list')

  const queryClient = useQueryClient()
  const isEditMode = !!editingResourceId

  // GitHub integration is user-level — share cache with GithubPopover by using
  // the same project-less query keys.
  const { data: githubStatus } = useQuery({
    queryKey: ['github-integration-status'],
    queryFn: githubIntegrationApi.validate,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  const { data: githubIntegration } = useQuery({
    queryKey: ['github-integration'],
    queryFn: githubIntegrationApi.getIntegration,
    enabled: githubStatus?.connected === true,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  // The popup is opened synchronously on click (see openOAuthPopup) and handed
  // to the mutation — opening it after the await would trip popup blockers.
  const { mutate: connectGithub, isPending: isConnectingGithub } = useMutation({
    mutationFn: async (popup: Window | null) => {
      try {
        const url = await githubIntegrationApi.getConnectUrl()
        if (popup && !popup.closed) popup.location.href = url
        else window.open(url, '_blank')
      } catch (err) {
        popup?.close()
        throw err
      }
    },
  })

  const { mutate: disconnectGithub, isPending: isDisconnectingGithub } = useMutation({
    mutationFn: (id: string) => githubIntegrationApi.disconnect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['github-integration-status'] })
      queryClient.invalidateQueries({ queryKey: ['github-integration'] })
    },
  })

  const { mutate: connectGoogleDrive, isPending: isConnectingGoogleDrive } = useMutation({
    mutationFn: async (popup: Window | null) => {
      try {
        // Resolve the project API key for the API-KEY auth header. Prefer the
        // session store, but it may not be populated yet when Connect is clicked
        // right after opening the page — fall back to fetching the project (the
        // same /v1/mcp_project source project-client uses) to read its api_key.
        const session = useAuthStore.getState()
        let apiKey =
          session.apiKey && session.apiKeyProjectId === projectId ? session.apiKey : null
        if (!apiKey) {
          const { data } = await api.get(`/v1/mcp_project/${projectId}`)
          apiKey = data?.data?.api_key ?? null
          if (apiKey) session.setApiKey(apiKey, projectId)
        }
        if (!apiKey) {
          popup?.close()
          throw new Error('Project API key is not available')
        }
        const url = await googleDriveIntegrationApi.getConnectUrl(apiKey, projectId)
        if (popup && !popup.closed) popup.location.href = url
        else window.open(url, '_blank')
      } catch (err) {
        popup?.close()
        throw err
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.data || err?.message || 'Failed to connect Google Drive')
    },
  })

  const { mutate: connectGoogleCalendar, isPending: isConnectingGoogleCalendar } = useMutation({
    mutationFn: async (popup: Window | null) => {
      try {
        // Same API-KEY resolution as Google Drive — prefer the session store and
        // fall back to fetching the project's api_key.
        const session = useAuthStore.getState()
        let apiKey =
          session.apiKey && session.apiKeyProjectId === projectId ? session.apiKey : null
        if (!apiKey) {
          const { data } = await api.get(`/v1/mcp_project/${projectId}`)
          apiKey = data?.data?.api_key ?? null
          if (apiKey) session.setApiKey(apiKey, projectId)
        }
        if (!apiKey) {
          popup?.close()
          throw new Error('Project API key is not available')
        }
        const url = await googleCalendarIntegrationApi.getConnectUrl(apiKey, projectId)
        if (popup && !popup.closed) popup.location.href = url
        else window.open(url, '_blank')
      } catch (err) {
        popup?.close()
        throw err
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.data || err?.message || 'Failed to connect Google Calendar')
    },
  })

  // Environment options — loaded as soon as the project is known (not just in
  // detail view), because the GitLab scope below derives environment_id from
  // the first environment.
  const { data: environments = [], isLoading: isLoadingEnvs } = useQuery({
    queryKey: ['resource-environments', projectId],
    queryFn: async () => {
      const { data } = await authApi.get('/v2/resource-environment', {
        params: { project_id: projectId, 'project-id': projectId }
      })
      const items = data.data.data || []
      return items.map((item: any) => ({
        label: item.name,
        value: item.id
      }))
    },
    enabled: !!projectId
  })

  // GitLab & Bitbucket — unlike GitHub (user-level), these are scoped to a
  // project environment, so project_id + environment_id key the cache and gate
  // the calls. environment_id comes from the first available environment.
  const integrationEnvId: string = environments[0]?.value ?? ''
  const integrationScope = { project_id: projectId, environment_id: integrationEnvId }
  const integrationScopeReady = !!projectId && !!integrationEnvId
  const gitlabScope = integrationScope
  const gitlabScopeReady = integrationScopeReady

  const { data: gitlabStatus } = useQuery({
    queryKey: ['gitlab-integration-status', projectId, integrationEnvId],
    queryFn: () => gitlabIntegrationApi.validate(gitlabScope),
    enabled: gitlabScopeReady,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  const { data: gitlabIntegration } = useQuery({
    queryKey: ['gitlab-integration', projectId, integrationEnvId],
    queryFn: () => gitlabIntegrationApi.getIntegration(gitlabScope),
    enabled: gitlabScopeReady && gitlabStatus?.connected === true,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  const { mutate: connectGitlab, isPending: isConnectingGitlab } = useMutation({
    mutationFn: async (popup: Window | null) => {
      try {
        const url = await gitlabIntegrationApi.getConnectUrl(gitlabScope)
        if (popup && !popup.closed) popup.location.href = url
        else window.open(url, '_blank')
      } catch (err) {
        popup?.close()
        throw err
      }
    },
  })

  const { mutate: disconnectGitlab, isPending: isDisconnectingGitlab } = useMutation({
    mutationFn: (id: string) => gitlabIntegrationApi.disconnect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gitlab-integration-status', projectId, integrationEnvId] })
      queryClient.invalidateQueries({ queryKey: ['gitlab-integration', projectId, integrationEnvId] })
    },
  })

  // Bitbucket integration — same project-environment scope as GitLab.
  const { data: bitbucketStatus } = useQuery({
    queryKey: ['bitbucket-integration-status', projectId, integrationEnvId],
    queryFn: () => bitbucketIntegrationApi.validate(integrationScope),
    enabled: integrationScopeReady,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  const { data: bitbucketIntegration } = useQuery({
    queryKey: ['bitbucket-integration', projectId, integrationEnvId],
    queryFn: () => bitbucketIntegrationApi.getIntegration(integrationScope),
    enabled: integrationScopeReady && bitbucketStatus?.connected === true,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  const { mutate: connectBitbucket, isPending: isConnectingBitbucket } = useMutation({
    mutationFn: async (popup: Window | null) => {
      try {
        const url = await bitbucketIntegrationApi.getConnectUrl(integrationScope)
        if (popup && !popup.closed) popup.location.href = url
        else window.open(url, '_blank')
      } catch (err) {
        popup?.close()
        throw err
      }
    },
  })

  const { mutate: disconnectBitbucket, isPending: isDisconnectingBitbucket } = useMutation({
    mutationFn: (id: string) => bitbucketIntegrationApi.disconnect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bitbucket-integration-status', projectId, integrationEnvId] })
      queryClient.invalidateQueries({ queryKey: ['bitbucket-integration', projectId, integrationEnvId] })
    },
  })

  // Google Lead Ads — no OAuth: connections are created/listed via the dedicated
  // /v1/google-leads endpoints (project API-KEY, attached by the shared `api`
  // interceptor), so they don't appear in the /v2 resource list. We query them
  // separately to drive the connected card, and the modal handles create /
  // mapping / verify / disconnect.
  const { data: googleAdsData } = useQuery({
    queryKey: ['google-ads-integration', mainProjectId],
    queryFn: () => googleAdsIntegrationApi.getIntegration(),
    enabled: !!projectId,
    retry: false,
    staleTime: 60 * 1000,
  })
  const googleAdsIntegrations = googleAdsData?.integrations ?? []
  const isGoogleAdsConnected = googleAdsIntegrations.length > 0

  const openGoogleAdsModal = (mode: 'list' | 'create') => {
    setGoogleAdsModalMode(mode)
    setGoogleAdsModalOpen(true)
  }

  // Open the OAuth window synchronously (within the click) so popup blockers
  // allow it, then let the mutation point it at the fetched authorize URL.
  const openOAuthPopup = () =>
    window.open('about:blank', '_blank', centeredPopupFeatures(600, 720, 'popup'))

  // The /oauth/success page (opened in the popup) postMessages back here when
  // the connection lands, so we refresh the matching integration card.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return
      const d = e.data
      if (d?.source !== 'ucode-oauth') return
      const provider = String(d.provider ?? '').toLowerCase()
      if (d.provider === 'google-drive') {
        if (d.status === 'success') {
          setIsGoogleDriveConnected(true)
          // Refetch the resource lists so the new Google Drive card shows up —
          // same as GitHub/GitLab/Bitbucket below.
          queryClient.invalidateQueries({ queryKey: ['resources-v2', projectId] })
          queryClient.invalidateQueries({ queryKey: ['resources-v1', projectId] })
          queryClient.invalidateQueries({ queryKey: ['resources-clickhouse', projectId] })
          toast.success(t('driveConnected'))
        } else {
          toast.error(t('driveConnectFailed'))
        }
        return
      }
      if (d.provider === 'google-calendar') {
        if (d.status === 'success') {
          setIsGoogleCalendarConnected(true)
          queryClient.invalidateQueries({ queryKey: ['resources-v2', projectId] })
          queryClient.invalidateQueries({ queryKey: ['resources-v1', projectId] })
          queryClient.invalidateQueries({ queryKey: ['resources-clickhouse', projectId] })
          toast.success(t('calendarConnected'))
          // Right after a successful connect, prompt the user to pick a table and
          // bind its fields — the field-mapping modal opens immediately.
          setCalendarMappingOpen(true)
        } else {
          toast.error(t('calendarConnectFailed'))
        }
        return
      }
      if (provider.startsWith('instagram')) {
        if (d.status === 'success') {
          setIsInstagramDirectConnected(true)
          setInstagramSetupOpen(false)
          setInstagramSetupResource(null)
          queryClient.invalidateQueries({ queryKey: ['resources-v2', projectId] })
          queryClient.invalidateQueries({ queryKey: ['resources-v1', projectId] })
          queryClient.invalidateQueries({ queryKey: ['resources-clickhouse', projectId] })
          toast.success(t('instagramConnected'))
        } else {
          toast.error(t('instagramConnectFailed'))
        }
        return
      }
      if (d.status !== 'success') return
      if (d.provider === 'github') {
        queryClient.invalidateQueries({ queryKey: ['github-integration-status'] })
        queryClient.invalidateQueries({ queryKey: ['github-integration'] })
      } else if (d.provider === 'gitlab') {
        queryClient.invalidateQueries({ queryKey: ['gitlab-integration-status', projectId, integrationEnvId] })
        queryClient.invalidateQueries({ queryKey: ['gitlab-integration', projectId, integrationEnvId] })
      } else if (d.provider === 'bitbucket') {
        queryClient.invalidateQueries({ queryKey: ['bitbucket-integration-status', projectId, integrationEnvId] })
        queryClient.invalidateQueries({ queryKey: ['bitbucket-integration', projectId, integrationEnvId] })
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [queryClient, projectId, integrationEnvId])

  // Source 1: V2 resources list
  const { data: resourcesV2 = [], isLoading: isLoadingV2 } = useQuery({
    queryKey: ['resources-v2', projectId],
    queryFn: async () => {
      const { data } = await api.get('/v2/company/project/resource', {
        params: { project_id: projectId }
      })
      const resources = data.data?.resources || []
      return resources.map(normalizeApiResource)
    },
    enabled: !!projectId
  })

  // Source 2: V1 resources list
  const { data: resourcesV1 = [] } = useQuery({
    queryKey: ['resources-v1', projectId],
    queryFn: async () => {
      const { data } = await api.get('/v2/company/project/resource', {
        params: { project_id: projectId }
      })
      const resources = data.data?.resources || []
      return resources.map(normalizeApiResource)
    },
    enabled: !!projectId
  })

  // Source 3: ClickHouse list (airbytes)
  const { data: clickHouseList = [] } = useQuery({
    queryKey: ['resources-clickhouse', projectId],
    queryFn: async () => {
      const { data } = await api.get('/v1/company/airbyte', {
        params: { project_id: projectId, limit: 0, offset: 0 }
      })
      const airbytes = data.data?.airbytes || []
      return airbytes.map((item: any) => ({
        ...item,
        resource_type: 2,           // ClickHouse typeValue
        name: item.name || 'ClickHouse',
        is_configured: item.is_configured ?? true,
      }))
    },
    enabled: !!projectId
  })

  const resourcesList = useMemo(() => {
    const all = [...resourcesV2, ...clickHouseList, ...resourcesV1]
    const seen = new Set<string>()
    return all.filter((r: any) => {
      if (!r?.id || seen.has(r.id)) return false
      seen.add(r.id)
      return true
    })
  }, [resourcesV2, resourcesV1, clickHouseList])

  const isListLoading = isLoadingV2

  // 3. Get Resource Detail for Edit
  const { data: resourceDetail } = useQuery({
    queryKey: ['resource-detail', editingResourceId],
    queryFn: async () => {
      const { data } = await api.get(`/v2/company/project/resource/${editingResourceId}`, {
        params: { type: editingResourceType }
      })
      return data.data
    },
    enabled: !!editingResourceId && view === 'detail'
  })

  // Transcoder pipelines
  const { data: pipelinesData } = useQuery({
    queryKey: ['transcoder-pipelines'],
    queryFn: async () => {
      const { data } = await api.get('/v1/resource/transcoders', {
        params: { limit: 10, page: 1, order_by_created_at: 1 }
      })
      return data.pipelines || []
    },
    enabled: Number(formData.type) === 13 && view === 'detail'
  })

  // Auto-set environment default for postgres/clickhouse create flow
  useEffect(() => {
    const rt = Number(formData.type)
    if (view !== 'detail' || isEditMode) return
    if (rt !== 2 && rt !== 3) return
    if (formData.environment || environments.length === 0) return
    setFormData(prev => ({ ...prev, environment: environments[0].value }))
  }, [view, isEditMode, formData.type, formData.environment, environments])

  // Sync edit data
  useEffect(() => {
    if (resourceDetail) {
      setFormData(prev => ({ ...prev, name: resourceDetail.name }))

      if (resourceDetail.settings) {
        const flattenSettings = (obj: any, prefix = '') =>
          Object.keys(obj).reduce((acc: any, key) => {
            const fullKey = prefix ? `${prefix}.${key}` : key
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
              Object.assign(acc, flattenSettings(obj[key], fullKey))
            } else {
              acc[fullKey] = obj[key]
            }
            return acc
          }, {})

        setExtraFields(flattenSettings({ settings: resourceDetail.settings }))
      } else if (resourceDetail.host) {
        // Special case for ClickHouse or others with top-level settings in detail
        setExtraFields({
          host: resourceDetail.host,
          port: resourceDetail.port,
          username: resourceDetail.username,
          password: resourceDetail.password,
          database: resourceDetail.database
        })
      }
    }
  }, [resourceDetail])

  // Mutation: Save / Update
  const { mutate: handleSave, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      const typeValue = Number(formData.type)
      const settingsObject: Record<string, any> = {}

      Object.entries(extraFields).forEach(([key, value]) => {
        const parts = key.split('.')
        if (parts[0] === 'settings' && parts.length >= 3) {
          const category = parts[1]
          const field = parts.slice(2).join('.')
          if (!settingsObject[category]) settingsObject[category] = {}
          settingsObject[category][field] = value
        } else if (!key.includes('.')) {
          // Top level fields
          settingsObject[key] = value
        }
      })

      const basePayload = {
        name: formData.name,
        type: typeValue,
        project_id: projectId,
        environment_id: formData.environment,
        is_configured: true,
      }

      if (isEditMode) {
        const settingsPayload = (() => {
          if (typeValue === 5) return { github: { ...(resourceDetail?.settings?.github || {}), ...settingsObject.github } }
          if (typeValue === 8) return { gitlab: { ...(resourceDetail?.settings?.gitlab || {}), ...settingsObject.gitlab } }
          return { ...(resourceDetail?.settings || {}), ...settingsObject.settings }
        })()

        return api.put('/v2/resource', {
          name: formData.name,
          type: typeValue,
          id: editingResourceId,
          settings: settingsPayload
        })
      }

      // CREATE MODE
      if (typeValue === 2) { // ClickHouse
        return api.post('/v1/resource', {
          ...basePayload,
          node_type: "LOW",
          resource: {
            is_configured: true,
            node_type: "LOW",
            project_id: projectId,
            resource_type: 2,
            title: formData.name,
            host: extraFields.host,
            port: extraFields.port,
            username: extraFields.username,
            password: extraFields.password,
            database: extraFields.database
          }
        })
      }

      if (typeValue === 3) { // Postgres
        return api.post('/v2/resource', {
          ...basePayload,
          default: false,
          settings: settingsObject.settings?.postgres ? { postgres: settingsObject.settings.postgres } : {}
        })
      }

      return api.post('/v2/resource', {
        ...basePayload,
        settings: settingsObject.settings
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources-v2', projectId] })
      queryClient.invalidateQueries({ queryKey: ['resources-v1', projectId] })
      queryClient.invalidateQueries({ queryKey: ['resources-clickhouse', projectId] })
      setView('grid')
      setEditingResourceId(null)
    }
  })

  // Mutation: Delete
  const { mutate: handleDelete, isPending: isDeleting } = useMutation({
    mutationFn: async () => {
      return api.delete(`/v2/resource/${editingResourceId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources-v2', projectId] })
      queryClient.invalidateQueries({ queryKey: ['resources-v1', projectId] })
      queryClient.invalidateQueries({ queryKey: ['resources-clickhouse', projectId] })
      setView('grid')
      setEditingResourceId(null)
    }
  })

  // Mutation: Reconnect
  const { mutate: handleReconnect, isPending: isReconnecting } = useMutation({
    mutationFn: async () => {
      return api.post('/v2/resource/reconnect', { id: editingResourceId })
    }
  })

  const handleSelectResource = (item: ResourceItem) => {
    if (SOON_TYPE_VALUES.has(item.typeValue)) return

    if (item.typeValue === TELEGRAM_TYPE_VALUE) {
      setTelegramSetupResource(null)
      setTelegramSetupOpen(true)
      return
    }

    if (item.typeValue === INSTAGRAM_DIRECT_TYPE_VALUE) {
      setInstagramSetupResource(null)
      setInstagramSetupOpen(true)
      return
    }

    if (item.typeValue === GOOGLE_DRIVE_TYPE_VALUE) {
      connectGoogleDrive(openOAuthPopup())
      return
    }

    if (item.typeValue === GOOGLE_CALENDAR_TYPE_VALUE) {
      connectGoogleCalendar(openOAuthPopup())
      return
    }

    if (item.typeValue === GOOGLE_ADS_TYPE_VALUE) {
      openGoogleAdsModal(isGoogleAdsConnected ? 'list' : 'create')
      return
    }

    // GitHub — connect via backend OAuth flow (opens in a popup window)
    if (item.typeValue === 5) {
      connectGithub(openOAuthPopup())
      return
    }

    // GitLab — connect via backend OAuth flow (same pattern as GitHub)
    if (item.typeValue === 8) {
      connectGitlab(openOAuthPopup())
      return
    }

    // Bitbucket — connect via backend OAuth flow (same pattern as GitLab)
    if (item.typeValue === 9) {
      connectBitbucket(openOAuthPopup())
      return
    }

    setSelectedResource(item)
    setEditingResourceId(null)
    setEditingResourceType(null)
    setFormData({
      name: (item.typeValue === 2 || item.typeValue === 3) ? item.label : '',
      type: String(item.typeValue),
      environment: '',
    })
    setExtraFields({})
    setView('detail')
  }

  const handleEditResource = (resource: any) => {
    // resource_type может быть числом или type строкой ('GITHUB', 'CLICK_HOUSE' etc)
    const rawType = resource.resource_type ?? resource.type_value ?? resource.type
    const numericType =
      typeof rawType === 'number'
        ? rawType
        : RESOURCE_TYPE_STRING_TO_VALUE[String(rawType ?? '').toUpperCase()] ?? null
    // Google Calendar has no editable connection form; instead of the detail
    // view it opens the field-mapping modal (records → calendar event fields).
    if (numericType === GOOGLE_CALENDAR_TYPE_VALUE) {
      setCalendarMappingOpen(true)
      return
    }
    if (numericType === TELEGRAM_TYPE_VALUE) {
      setTelegramSetupResource(resource)
      setTelegramSetupOpen(true)
      return
    }
    if (numericType === INSTAGRAM_DIRECT_TYPE_VALUE) {
      setInstagramSetupResource(resource)
      setInstagramSetupOpen(true)
      return
    }
    const categoryItem = numericType == null ? undefined : resourceItemByType.get(numericType)

    setSelectedResource(categoryItem ?? {
      label: resource.name || 'Resource',
      typeValue: numericType ?? 0,
      icon: 'mongodb',
      summary: 'Custom integration',
    })
    setEditingResourceId(resource.id)
    setEditingResourceType(numericType)
    setFormData({ name: resource.name, type: String(numericType ?? ''), environment: '' })
    setExtraFields({})
    setView('detail')
  }

  const ExtraField = ({ label, name, placeholder, type = 'text', disabled = false }: any) => (
    <div className="space-y-1.5 animate-in fade-in duration-300">
      <label className="text-sm font-medium text-text-main">{label}</label>
      <Input
        type={type}
        placeholder={placeholder}
        value={extraFields[name] ?? ''}
        onChange={(e) => setExtraFields(prev => ({ ...prev, [name]: e.target.value }))}
        disabled={disabled}
        className="bg-bg-sidebar border-border-subtle focus:ring-1 focus:ring-primary/20"
      />
    </div>
  )

  if (isListLoading && view === 'grid') return <DataLoadingState message="Connecting to your resources..." />

  if (view === 'detail' && selectedResource) {
    const rType = Number(formData.type)
    const isPostgresLike = rType === 3 || rType === 2

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setView('grid')}
              className="h-8 w-8 rounded-lg"
            >
              <ChevronLeft size={16} />
            </Button>
            <div className="flex items-center gap-3">
              <ResourceIcon type={selectedResource.icon} />
              <div>
                <h1 className="text-xl font-bold text-text-main leading-tight">{isEditMode ? 'Edit' : 'Connect'} {selectedResource.label}</h1>
                <p className="text-xs text-text-muted">{t('fillConnectionParams')}</p>
              </div>
            </div>
          </div>
          {isEditMode && !isPostgresLike && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete()}
                disabled={isDeleting}
                className="text-destructive hover:bg-destructive/10 rounded-xl"
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={18} />}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleReconnect()}
                disabled={isReconnecting}
                className="rounded-xl h-9"
              >
                {isReconnecting ? <Loader2 size={14} className="animate-spin mr-2" /> : <RefreshCw size={14} className="mr-2" />}
                Reconnect
              </Button>
            </div>
          )}
        </div>

        <div className={cn(
          "bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm",
          isPostgresLike ? "w-full" : "max-w-lg"
        )}>
          <div className="space-y-5">
            {!isPostgresLike && (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-main">{t('name')}</label>
                  <Input
                    placeholder={t('resourceNamePlaceholder')}
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-bg-sidebar border-border-subtle focus:ring-1 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-main">{t('type')}</label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, type: v }))}
                  >
                    <SelectTrigger className="bg-bg-sidebar border-border-subtle">
                      <SelectValue placeholder={t('selectResourceType')} />
                    </SelectTrigger>
                    <SelectContent>
                      {formResourceCategories.map((category, index) => (
                        <Fragment key={category.id}>
                          {index > 0 && <SelectSeparator />}
                          <SelectGroup>
                            <SelectLabel className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                              {category.label}
                            </SelectLabel>
                            {category.items.map(item => (
                              <SelectItem key={item.typeValue} value={String(item.typeValue)}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </Fragment>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-main">{t('environment')}</label>
                  <Select
                    value={formData.environment}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, environment: v }))}
                    disabled={isLoadingEnvs}
                  >
                    <SelectTrigger className="bg-bg-sidebar border-border-subtle">
                      <SelectValue placeholder={isLoadingEnvs ? "Loading environment..." : "Select environment"} />
                    </SelectTrigger>
                    <SelectContent>
                      {environments.map((env: any) => (
                        <SelectItem key={env.value} value={env.value}>
                          {env.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Dynamic Extra Fields */}
            {rType === 7 && (
              <>
                <ExtraField label={t('email')} name="settings.smtp.email" placeholder={t('email')} />
                <ExtraField label={t('password')} name="settings.smtp.password" placeholder={t('password')} type="password" />
                <ExtraField label={t('defaultOtp')} name="settings.smtp.default_otp" placeholder={t('defaultOtp')} />
                <ExtraField label={t('numberOfOtp')} name="settings.smtp.number_of_otp" placeholder={t('numberOfOtp')} type="number" />
              </>
            )}

            {rType === 6 && (
              <>
                <ExtraField label={t('defaultOtp')} name="settings.sms.default_otp" placeholder={t('defaultOtp')} />
                <ExtraField label={t('login')} name="settings.sms.login" placeholder={t('login')} />
                <ExtraField label={t('numberOfOtp')} name="settings.sms.number_of_otp" placeholder={t('numberOfOtp')} type="number" />
                <ExtraField label={t('originator')} name="settings.sms.originator" placeholder={t('originator')} />
                <ExtraField label={t('password')} name="settings.sms.password" placeholder={t('password')} type="password" />
              </>
            )}

            {rType === 3 && (
              <>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <ExtraField label={t('host')} name="settings.postgres.host" placeholder={t('host')} />
                  </div>
                  <div className="w-28">
                    <ExtraField label={t('port')} name="settings.postgres.port" placeholder={t('port')} />
                  </div>
                </div>
                <ExtraField label={t('database')} name="settings.postgres.database" placeholder={t('databaseName')} />
                <div className="grid grid-cols-2 gap-3">
                  <ExtraField label={t('username')} name="settings.postgres.username" placeholder={t('username')} />
                  <ExtraField label={t('password')} name="settings.postgres.password" placeholder={t('password')} type="password" />
                </div>
              </>
            )}

            {rType === 2 && (
              <>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <ExtraField label={t('host')} name="host" placeholder={t('host')} disabled={isEditMode} />
                  </div>
                  <div className="w-28">
                    <ExtraField label={t('port')} name="port" placeholder={t('port')} disabled={isEditMode} />
                  </div>
                </div>
                <ExtraField label={t('database')} name="database" placeholder={t('database')} disabled={isEditMode} />
                <div className="grid grid-cols-2 gap-3">
                  <ExtraField label={t('username')} name="username" placeholder={t('username')} disabled={isEditMode} />
                  <ExtraField label={t('password')} name="password" placeholder={t('password')} type="password" disabled={isEditMode} />
                </div>
              </>
            )}

            {(rType === 5 || rType === 8) && !isEditMode && (
              <div className="p-4 rounded-xl bg-bg-sidebar border border-border-subtle text-sm text-text-muted text-center">
                Click "Authenticate with {rType === 5 ? 'GitHub' : 'GitLab'}" on the resources grid to connect via OAuth.
              </div>
            )}

            {(rType === 5 || rType === 8) && isEditMode && (
              <>
                <ExtraField
                  label={`${rType === 5 ? 'GitHub' : 'GitLab'} Username`}
                  name={rType === 5 ? 'settings.github.username' : 'settings.gitlab.username'}
                  placeholder={t('username')}
                  disabled={true}
                />
                <ExtraField
                  label={t('token')}
                  name={rType === 5 ? 'settings.github.token' : 'settings.gitlab.token'}
                  placeholder={t('token')}
                  disabled={true}
                />
              </>
            )}

            {(rType === 11 || rType === 12) && isEditMode && (
              <>
                <ExtraField label={t('url')} name={`settings.${rType === 11 ? 'superset' : 'metabase'}.url`} placeholder={t('url')} />
                <ExtraField label={t('username')} name={`settings.${rType === 11 ? 'superset' : 'metabase'}.username`} placeholder={t('username')} />
                <ExtraField label={t('password')} name={`settings.${rType === 11 ? 'superset' : 'metabase'}.password`} placeholder={t('password')} type="password" />
              </>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" onClick={() => setView('grid')} className="rounded-xl px-4">
                {t('cancel')}
              </Button>
              <Button
                disabled={!formData.name || !formData.type || (!isEditMode && !formData.environment) || isSaving}
                onClick={() => handleSave()}
                className="bg-primary hover:bg-primary/90 text-white rounded-xl px-8 shadow-sm"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                {isEditMode ? 'Update' : 'Save'}
              </Button>
            </div>
          </div>
        </div>

        {rType === 13 && pipelinesData?.length > 0 && (
          <div className="bg-bg-card border border-border-subtle rounded-2xl overflow-hidden mt-6 max-w-lg shadow-sm">
            <div className="bg-bg-sidebar px-4 py-3 border-b border-border-subtle">
              <h3 className="text-xs font-bold text-text-main flex items-center gap-2">
                <RefreshCw size={12} />
                {t('transcoderPipelines')}
              </h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-bg-sidebar/50 border-b-border-subtle">
                  <TableHead className="w-12 text-center text-[10px] uppercase font-bold text-text-muted">№</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-text-muted">{t('status')}</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-text-muted">{t('videoKey')}</TableHead>
                  <TableHead className="text-right text-[10px] uppercase font-bold text-text-muted">{t('size')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pipelinesData.map((item: any, idx: number) => {
                  const isFail = item.stage_status === 'fail'
                  const isProcessing = item.stage !== 'upload'
                  const statusLabel = isFail ? 'Failed' : isProcessing ? 'Processing' : 'Success'
                  return (
                    <TableRow key={item.id} className="border-b-border-subtle/40 last:border-0 hover:bg-hover-bg/30">
                      <TableCell className="text-center text-xs text-text-muted">{idx + 1}</TableCell>
                      <TableCell>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight",
                          isFail ? "bg-destructive/10 text-destructive" : isProcessing ? "bg-primary/10 text-primary" : "bg-green-500/10 text-green-500"
                        )}>
                          {statusLabel}
                        </span>
                      </TableCell>
                      <TableCell className="text-[11px] font-mono text-text-main truncate max-w-[140px]">{item.output_key}</TableCell>
                      <TableCell className="text-right text-[11px] text-text-muted">
                        {Math.floor((item.size_kb / 1000) * 100) / 100} MB
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    )
  }

  const isGithubConnected = githubStatus?.connected === true
  const isGithubExpired = githubStatus?.connected === false && githubStatus?.reason === 'token_expired'

  const isGitlabConnected = gitlabStatus?.connected === true
  const isGitlabExpired = gitlabStatus?.connected === false && gitlabStatus?.reason === 'token_expired'

  const isBitbucketConnected = bitbucketStatus?.connected === true
  const isBitbucketExpired = bitbucketStatus?.connected === false && bitbucketStatus?.reason === 'token_expired'

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const matchesIntegrationSearch = (label: string) =>
    normalizedSearchQuery === '' || label.toLowerCase().includes(normalizedSearchQuery)
  const matchesCategoryFilter = (categoryId?: string) =>
    categoryFilter === 'All Categories' || categoryId === categoryFilter

  const filteredConnectedResources = resourcesList.filter((resource: any) => {
    const categoryItem = resourceItemByType.get(resource.resource_type)
    const telegramBotUsername =
      resource.resource_type === TELEGRAM_TYPE_VALUE ? formatTelegramBotUsername(resource) : ''
    const label = `${resource.name ?? ''} ${telegramBotUsername} ${categoryItem?.label ?? ''}`
    return matchesIntegrationSearch(label) && matchesCategoryFilter(categoryItem?.categoryId)
  })

  // Types that are already connected — exclude them from Available
  const connectedTypeValues = new Set(resourcesList.map((r: any) => r.resource_type))
  if (isGithubConnected || isGithubExpired) connectedTypeValues.add(5)
  if (isGitlabConnected || isGitlabExpired) connectedTypeValues.add(8)
  if (isBitbucketConnected || isBitbucketExpired) connectedTypeValues.add(9)
  if (isGoogleDriveConnected) connectedTypeValues.add(GOOGLE_DRIVE_TYPE_VALUE)
  if (isGoogleCalendarConnected) connectedTypeValues.add(GOOGLE_CALENDAR_TYPE_VALUE)
  if (isInstagramDirectConnected) connectedTypeValues.add(INSTAGRAM_DIRECT_TYPE_VALUE)
  if (isGoogleAdsConnected) connectedTypeValues.add(GOOGLE_ADS_TYPE_VALUE)

  const filteredAvailableResources = allResourceItems.filter(item => {
    if (connectedTypeValues.has(item.typeValue)) return false
    return matchesIntegrationSearch(`${item.label} ${item.summary}`) && matchesCategoryFilter(item.categoryId)
  })

  const filteredAvailableResourceGroups = resourceCategories
    .map(category => ({
      ...category,
      items: filteredAvailableResources.filter(item => item.categoryId === category.id),
    }))
    .filter(category => category.items.length > 0)

  const githubMatchesSearch = matchesIntegrationSearch('GitHub Repository hosting')
  const githubMatchesCategory = matchesCategoryFilter('source_control')
  const gitlabMatchesSearch = matchesIntegrationSearch('GitLab Repository hosting')
  const gitlabMatchesCategory = matchesCategoryFilter('source_control')
  const bitbucketMatchesSearch = matchesIntegrationSearch('Bitbucket Repository hosting')
  const bitbucketMatchesCategory = matchesCategoryFilter('source_control')
  const googleDriveMatchesSearch = matchesIntegrationSearch('Google Drive Cloud file storage')
  const googleDriveMatchesCategory = matchesCategoryFilter('productivity')
  const googleCalendarMatchesSearch = matchesIntegrationSearch('Google Calendar Calendar and events')
  const googleCalendarMatchesCategory = matchesCategoryFilter('productivity')
  const instagramDirectMatchesSearch = matchesIntegrationSearch('Instagram Direct Instagram direct messages')
  const instagramDirectMatchesCategory = matchesCategoryFilter('api_messaging')
  const googleAdsMatchesSearch = matchesIntegrationSearch('Google Ads Google advertising account')
  const googleAdsMatchesCategory = matchesCategoryFilter('marketing')

  // Once the refetched resource list contains the Drive/Calendar resource it
  // renders its own connected card below, so drop the session-state card to
  // avoid a brief duplicate right after connecting (state flag + API resource).
  const apiHasGoogleDrive = resourcesList.some((r: any) => r.resource_type === GOOGLE_DRIVE_TYPE_VALUE)
  const apiHasGoogleCalendar = resourcesList.some((r: any) => r.resource_type === GOOGLE_CALENDAR_TYPE_VALUE)
  const apiHasInstagramDirect = resourcesList.some((r: any) => r.resource_type === INSTAGRAM_DIRECT_TYPE_VALUE)
  const showGoogleDriveCard =
    isGoogleDriveConnected && !apiHasGoogleDrive && googleDriveMatchesSearch && googleDriveMatchesCategory
  const showGoogleCalendarCard =
    isGoogleCalendarConnected && !apiHasGoogleCalendar && googleCalendarMatchesSearch && googleCalendarMatchesCategory
  const showInstagramDirectCard =
    isInstagramDirectConnected && !apiHasInstagramDirect && instagramDirectMatchesSearch && instagramDirectMatchesCategory
  const showGithubCard = (isGithubConnected || isGithubExpired) && githubMatchesSearch && githubMatchesCategory
  const showGitlabCard = (isGitlabConnected || isGitlabExpired) && gitlabMatchesSearch && gitlabMatchesCategory
  const showBitbucketCard =
    (isBitbucketConnected || isBitbucketExpired) && bitbucketMatchesSearch && bitbucketMatchesCategory
  const showGoogleAdsCard = isGoogleAdsConnected && googleAdsMatchesSearch && googleAdsMatchesCategory

  const showConnectedSection =
    filteredConnectedResources.length > 0 ||
    showGoogleDriveCard ||
    showGoogleCalendarCard ||
    showInstagramDirectCard ||
    showGithubCard ||
    showGitlabCard ||
    showBitbucketCard ||
    showGoogleAdsCard

  return (
    <div className="@container space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
      <div>
        <h1 className="text-2xl font-bold text-text-main tracking-tight">{t('integrations')}</h1>
        <p className="text-text-muted text-sm mt-1">{t('integrationsSubtitle')}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 py-3 border-b border-border-subtle bg-bg-main sticky top-0 z-10">
        <div className="flex items-center bg-bg-sidebar border border-border-subtle rounded-xl px-3 py-2 flex-1 min-w-[160px]">
          <Search className="w-4 h-4 text-text-muted mr-2 shrink-0" />
          <input
            className="bg-transparent border-none outline-none text-sm w-full placeholder:text-text-muted text-text-main"
            placeholder={t('searchIntegrations')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full @[480px]:w-45 bg-bg-sidebar border-border-subtle rounded-xl h-10">
            <SelectValue placeholder={t('allCategories')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All Categories">{t('allCategories')}</SelectItem>
            {resourceCategories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">

        {/* Connected section — old-API resources + GitHub (new API) */}
        {showConnectedSection && (
          <div className="mb-8">
            <div className="text-xs font-semibold text-text-muted uppercase tracking-[0.04em] mb-3">
              {t('connected')}
            </div>
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 @[720px]:grid-cols-3 @[1024px]:grid-cols-4 gap-4">

              {/* Google Drive card */}
              {showGoogleDriveCard && (
                <div
                  className="bg-bg-card border-border-subtle flex flex-col gap-3 rounded-xl border p-4 shadow-sm"
                  style={{ borderLeftWidth: '3px', borderLeftColor: 'var(--green, #22c55e)' }}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <ResourceIcon type="google-drive" />
                    <div className="min-w-0 flex-1">
                      <div className="text-text-main truncate text-sm font-bold">Google Drive</div>
                      <div className="text-text-muted truncate text-[11px]">{t('cloudFileStorage')}</div>
                    </div>
                    <span className="ml-auto shrink-0 rounded-md border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-green-500 uppercase">
                      {t('connected')}
                    </span>
                  </div>
                  <div className="text-text-muted text-xs leading-relaxed">
                    {t('driveAuthDone')}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border-subtle bg-bg-main text-text-muted hover:bg-primary/5 hover:text-primary mt-auto w-full justify-center gap-2 rounded-lg font-semibold"
                    onClick={() => connectGoogleDrive(openOAuthPopup())}
                    disabled={isConnectingGoogleDrive}
                  >
                    {isConnectingGoogleDrive ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    {isConnectingGoogleDrive ? 'Connecting…' : 'Reconnect'}
                  </Button>
                </div>
              )}

              {/* Google Calendar card */}
              {showGoogleCalendarCard && (
                <div
                  className="bg-bg-card border-border-subtle flex flex-col gap-3 rounded-xl border p-4 shadow-sm"
                  style={{ borderLeftWidth: '3px', borderLeftColor: 'var(--green, #22c55e)' }}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <ResourceIcon type="google-calendar" />
                    <div className="min-w-0 flex-1">
                      <div className="text-text-main truncate text-sm font-bold">Google Calendar</div>
                      <div className="text-text-muted truncate text-[11px]">Calendar &amp; scheduling</div>
                    </div>
                    <span className="ml-auto shrink-0 rounded-md border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-green-500 uppercase">
                      {t('connected')}
                    </span>
                  </div>
                  <div className="text-text-muted text-xs leading-relaxed">
                    {t('calendarAuthDone')}
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border-subtle bg-bg-main text-primary hover:bg-primary/5 min-w-27.5 flex-1 justify-center gap-2 rounded-lg font-semibold"
                      onClick={() => setCalendarMappingOpen(true)}
                    >
                      <SlidersHorizontal size={14} />
                      {t('mapFields')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border-subtle bg-bg-main text-text-muted hover:bg-primary/5 hover:text-primary min-w-27.5 flex-1 justify-center gap-2 rounded-lg font-semibold"
                      onClick={() => connectGoogleCalendar(openOAuthPopup())}
                      disabled={isConnectingGoogleCalendar}
                    >
                      {isConnectingGoogleCalendar ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      {isConnectingGoogleCalendar ? 'Connecting…' : 'Reconnect'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Instagram Direct card */}
              {showInstagramDirectCard && (
                <div
                  className="bg-bg-card border-border-subtle flex flex-col gap-3 rounded-xl border p-4 shadow-sm"
                  style={{ borderLeftWidth: '3px', borderLeftColor: 'var(--green, #22c55e)' }}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <ResourceIcon type="instagram-direct" />
                    <div className="min-w-0 flex-1">
                      <div className="text-text-main truncate text-sm font-bold">Instagram Direct</div>
                      <div className="text-text-muted truncate text-[11px]">{t('directMessages')}</div>
                    </div>
                    <span className="ml-auto shrink-0 rounded-md border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-green-500 uppercase">
                      {t('connected')}
                    </span>
                  </div>
                  <div className="text-text-muted text-xs leading-relaxed">
                    {t('instagramAuthDone')}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border-subtle bg-bg-main text-primary hover:bg-primary/5 mt-auto w-full justify-center gap-2 rounded-lg font-semibold"
                    onClick={() => {
                      setInstagramSetupResource(null)
                      setInstagramSetupOpen(true)
                    }}
                  >
                    <SlidersHorizontal size={14} />
                    {t('configure')}
                  </Button>
                </div>
              )}

              {/* GitHub card (new API) */}
              {showGithubCard && (
                <div
                  className="bg-bg-card border border-border-subtle rounded-xl p-4 flex flex-col gap-3 shadow-sm"
                  style={{ borderLeftWidth: '3px', borderLeftColor: isGithubConnected ? 'var(--green, #22c55e)' : 'var(--destructive, #ef4444)' }}
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <ResourceIcon type="github" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-text-main truncate">GitHub</div>
                      {isGithubConnected && githubStatus.user
                        ? <div className="text-[11px] text-text-muted truncate">@{githubStatus.user.login}</div>
                        : <div className="text-[11px] text-text-muted">{t('sourceControl')}</div>
                      }
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 border ml-auto",
                      isGithubConnected
                        ? "bg-green-500/10 text-green-500 border-green-500/20"
                        : "bg-destructive/10 text-destructive border-destructive/20"
                    )}>
                      {isGithubConnected ? 'Connected' : 'Expired'}
                    </span>
                  </div>

                  {isGithubConnected && githubStatus.user?.avatar_url && (
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-bg-sidebar border border-border-subtle">
                      <img src={githubStatus.user.avatar_url} alt={githubStatus.user.login} className="w-5 h-5 rounded-full shrink-0" />
                      <span className="text-xs text-text-main font-medium truncate">@{githubStatus.user.login}</span>
                    </div>
                  )}

                  {isGithubExpired && (
                    <div className="text-xs text-text-muted leading-relaxed">
                      Token expired — reconnect to restore access.
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mt-auto">
                    {isGithubConnected && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 min-w-27.5 justify-center gap-2 rounded-lg font-semibold text-destructive hover:bg-destructive/5 hover:text-destructive border-border-subtle bg-bg-main"
                        onClick={() => githubIntegration && disconnectGithub(githubIntegration.id)}
                        disabled={isDisconnectingGithub || !githubIntegration}
                      >
                        {isDisconnectingGithub ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        Disconnect
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 min-w-27.5 justify-center gap-2 rounded-lg font-semibold border-border-subtle bg-bg-main text-text-muted hover:bg-primary/5 hover:text-primary"
                      onClick={() => connectGithub(openOAuthPopup())}
                      disabled={isConnectingGithub}
                    >
                      {isConnectingGithub ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      {isConnectingGithub ? 'Connecting…' : 'Reconnect'}
                    </Button>
                  </div>
                </div>
              )}

              {/* GitLab card (new API) */}
              {showGitlabCard && (
                <div
                  className="bg-bg-card border border-border-subtle rounded-xl p-4 flex flex-col gap-3 shadow-sm"
                  style={{ borderLeftWidth: '3px', borderLeftColor: isGitlabConnected ? 'var(--green, #22c55e)' : 'var(--destructive, #ef4444)' }}
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <ResourceIcon type="gitlab" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-text-main truncate">GitLab</div>
                      {isGitlabConnected && gitlabStatus.user
                        ? <div className="text-[11px] text-text-muted truncate">@{gitlabStatus.user.username}</div>
                        : <div className="text-[11px] text-text-muted">{t('sourceControl')}</div>
                      }
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 border ml-auto",
                      isGitlabConnected
                        ? "bg-green-500/10 text-green-500 border-green-500/20"
                        : "bg-destructive/10 text-destructive border-destructive/20"
                    )}>
                      {isGitlabConnected ? 'Connected' : 'Expired'}
                    </span>
                  </div>

                  {isGitlabConnected && gitlabStatus.user?.avatar_url && (
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-bg-sidebar border border-border-subtle">
                      <img src={gitlabStatus.user.avatar_url} alt={gitlabStatus.user.username} className="w-5 h-5 rounded-full shrink-0" />
                      <span className="text-xs text-text-main font-medium truncate">@{gitlabStatus.user.username}</span>
                    </div>
                  )}

                  {isGitlabExpired && (
                    <div className="text-xs text-text-muted leading-relaxed">
                      Token expired — reconnect to restore access.
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mt-auto">
                    {isGitlabConnected && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 min-w-27.5 justify-center gap-2 rounded-lg font-semibold text-destructive hover:bg-destructive/5 hover:text-destructive border-border-subtle bg-bg-main"
                        onClick={() => gitlabIntegration && disconnectGitlab(gitlabIntegration.id)}
                        disabled={isDisconnectingGitlab || !gitlabIntegration}
                      >
                        {isDisconnectingGitlab ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        Disconnect
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 min-w-27.5 justify-center gap-2 rounded-lg font-semibold border-border-subtle bg-bg-main text-text-muted hover:bg-primary/5 hover:text-primary"
                      onClick={() => connectGitlab(openOAuthPopup())}
                      disabled={isConnectingGitlab}
                    >
                      {isConnectingGitlab ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      {isConnectingGitlab ? 'Connecting…' : 'Reconnect'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Bitbucket card (new API) */}
              {showBitbucketCard && (
                <div
                  className="bg-bg-card border border-border-subtle rounded-xl p-4 flex flex-col gap-3 shadow-sm"
                  style={{ borderLeftWidth: '3px', borderLeftColor: isBitbucketConnected ? 'var(--green, #22c55e)' : 'var(--destructive, #ef4444)' }}
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <ResourceIcon type="bitbucket" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-text-main truncate">Bitbucket</div>
                      {isBitbucketConnected && bitbucketStatus.user
                        ? <div className="text-[11px] text-text-muted truncate">@{bitbucketStatus.user.username}</div>
                        : <div className="text-[11px] text-text-muted">{t('sourceControl')}</div>
                      }
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 border ml-auto",
                      isBitbucketConnected
                        ? "bg-green-500/10 text-green-500 border-green-500/20"
                        : "bg-destructive/10 text-destructive border-destructive/20"
                    )}>
                      {isBitbucketConnected ? 'Connected' : 'Expired'}
                    </span>
                  </div>

                  {isBitbucketConnected && bitbucketStatus.user?.avatar_url && (
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-bg-sidebar border border-border-subtle">
                      <img src={bitbucketStatus.user.avatar_url} alt={bitbucketStatus.user.username} className="w-5 h-5 rounded-full shrink-0" />
                      <span className="text-xs text-text-main font-medium truncate">@{bitbucketStatus.user.username}</span>
                    </div>
                  )}

                  {isBitbucketExpired && (
                    <div className="text-xs text-text-muted leading-relaxed">
                      Token expired — reconnect to restore access.
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mt-auto">
                    {isBitbucketConnected && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 min-w-27.5 justify-center gap-2 rounded-lg font-semibold text-destructive hover:bg-destructive/5 hover:text-destructive border-border-subtle bg-bg-main"
                        onClick={() => bitbucketIntegration && disconnectBitbucket(bitbucketIntegration.id)}
                        disabled={isDisconnectingBitbucket || !bitbucketIntegration}
                      >
                        {isDisconnectingBitbucket ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        Disconnect
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 min-w-27.5 justify-center gap-2 rounded-lg font-semibold border-border-subtle bg-bg-main text-text-muted hover:bg-primary/5 hover:text-primary"
                      onClick={() => connectBitbucket(openOAuthPopup())}
                      disabled={isConnectingBitbucket}
                    >
                      {isConnectingBitbucket ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      {isConnectingBitbucket ? 'Connecting…' : 'Reconnect'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Google Lead Ads card (dedicated /v1/google-leads endpoints) */}
              {showGoogleAdsCard && (
                <div
                  className="bg-bg-card border-border-subtle flex flex-col gap-3 rounded-xl border p-4 shadow-sm"
                  style={{ borderLeftWidth: '3px', borderLeftColor: 'var(--green, #22c55e)' }}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <ResourceIcon type="google-ads" />
                    <div className="min-w-0 flex-1">
                      <div className="text-text-main truncate text-sm font-bold">Google Lead Ads</div>
                      <div className="text-text-muted truncate text-[11px]">
                        {googleAdsIntegrations.length} connection{googleAdsIntegrations.length > 1 ? 's' : ''}
                      </div>
                    </div>
                    <span className="ml-auto shrink-0 rounded-md border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-green-500 uppercase">
                      {t('connected')}
                    </span>
                  </div>
                  <div className="text-text-muted text-xs leading-relaxed">
                    {t('leadsHint')}
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border-subtle bg-bg-main text-primary hover:bg-primary/5 min-w-27.5 flex-1 justify-center gap-2 rounded-lg font-semibold"
                      onClick={() => openGoogleAdsModal('list')}
                    >
                      <SlidersHorizontal size={14} />
                      {t('manage')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border-subtle bg-bg-main text-text-muted hover:bg-primary/5 hover:text-primary min-w-27.5 flex-1 justify-center gap-2 rounded-lg font-semibold"
                      onClick={() => openGoogleAdsModal('create')}
                    >
                      <Plug size={14} />
                      New
                    </Button>
                  </div>
                </div>
              )}

              {/* Old-API connected resources */}
              {filteredConnectedResources.map((resource: any) => {
                const typeInfo = resourceTypes.find(t => t.value === resource.resource_type)
                const categoryItem = resourceItemByType.get(resource.resource_type)
                const isTelegramResource = resource.resource_type === TELEGRAM_TYPE_VALUE
                const isInstagramResource = resource.resource_type === INSTAGRAM_DIRECT_TYPE_VALUE
                const telegramBotUsername = isTelegramResource ? formatTelegramBotUsername(resource) : ''
                const resourceName = resource.name || categoryItem?.label || typeInfo?.label || 'Resource'
                return (
                  <div
                    key={resource.id}
                    onClick={() => handleEditResource(resource)}
                    className="bg-bg-card border border-border-subtle rounded-xl p-4 flex flex-col gap-3 group shadow-sm cursor-pointer hover:shadow-md transition-all"
                    style={{ borderLeftWidth: '3px', borderLeftColor: 'var(--green, #22c55e)' }}
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <ResourceIcon type={categoryItem?.icon ?? 'mongodb'} />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-text-main truncate group-hover:text-primary transition-colors">{resourceName}</div>
                        <div className="text-[11px] text-text-muted font-medium truncate">
                          {telegramBotUsername || typeInfo?.label || categoryItem?.label}
                        </div>
                      </div>
                      <span className="bg-green-500/10 text-green-500 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 border border-green-500/20 ml-auto">
                        {resource.is_configured ? 'Connected' : 'Pending'}
                      </span>
                    </div>
                    <div className="text-xs text-text-muted leading-relaxed">
                      {isTelegramResource && telegramBotUsername ? (
                        <>
                          Bot username:{' '}
                          <span className="text-text-main font-medium">{telegramBotUsername}</span>
                        </>
                      ) : isInstagramResource ? (
                        'Instagram Direct messaging is connected.'
                      ) : (
                        `${categoryItem?.summary ?? 'Custom integration'}: ${resourceName}`
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Available section — only types without connected instances */}
        {filteredAvailableResourceGroups.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-semibold text-text-muted uppercase tracking-[0.04em]">
                {t('available')}
              </div>
              <div className="text-text-muted text-xs">
                {filteredAvailableResources.length} integrations
              </div>
            </div>
            <div className="space-y-6">
              {filteredAvailableResourceGroups.map(category => {
                const CategoryIcon = category.icon
                return (
                  <section key={category.id} className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="border-border-subtle bg-bg-sidebar flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border">
                          <CategoryIcon className="text-text-muted h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-text-main truncate text-sm font-semibold">
                            {category.label}
                          </h2>
                          <div className="text-text-muted text-[11px]">
                            {category.items.length} available
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 @[480px]:grid-cols-2 @[720px]:grid-cols-3 @[1024px]:grid-cols-4">
                      {category.items.map(item => {
                        const isSoon = SOON_TYPE_VALUES.has(item.typeValue)
                        const isConnecting =
                          (item.typeValue === 5 && isConnectingGithub) ||
                          (item.typeValue === 8 && isConnectingGitlab) ||
                          (item.typeValue === 9 && isConnectingBitbucket) ||
                          (item.typeValue === GOOGLE_DRIVE_TYPE_VALUE && isConnectingGoogleDrive) ||
                          (item.typeValue === GOOGLE_CALENDAR_TYPE_VALUE && isConnectingGoogleCalendar)

                        return (
                          <div
                            key={item.typeValue}
                            className={cn(
                              'bg-bg-card border-border-subtle flex flex-col gap-3 rounded-xl border p-4 transition-all',
                              isSoon
                                ? 'opacity-75'
                                : 'hover:border-primary/40 hover:shadow-md',
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <ResourceIcon type={item.icon} />
                              <div className="min-w-0 flex-1">
                                <div className="text-text-main truncate text-sm font-bold">{item.label}</div>
                                <div className="text-text-muted text-[11px]">{item.categoryLabel}</div>
                              </div>
                              {isSoon && (
                                <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 ml-auto shrink-0 rounded-md border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                  {t('soon')}
                                </span>
                              )}
                            </div>
                            <div className="text-text-muted flex-1 text-xs leading-relaxed">
                              {item.summary}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                'border-border-subtle bg-bg-main w-full justify-center gap-2 rounded-lg font-semibold',
                                isSoon
                                  ? 'text-text-muted'
                                  : 'text-text-main hover:bg-primary/5 hover:text-primary',
                              )}
                              onClick={() => handleSelectResource(item)}
                              disabled={isConnecting || isSoon}
                            >
                              {isConnecting ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Plug size={14} />
                              )}
                              {isSoon ? 'Soon' : isConnecting ? 'Connecting…' : 'Connect'}
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )
              })}
            </div>
          </div>
        )}

        {filteredAvailableResourceGroups.length === 0 && !showConnectedSection && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-text-muted text-sm">{t('noIntegrationsMatch')}</div>
          </div>
        )}
      </div>

      {calendarMappingOpen && (
        <GoogleCalendarFieldMappingModal
          open={calendarMappingOpen}
          onOpenChange={setCalendarMappingOpen}
        />
      )}

      {telegramSetupOpen && (
        <TelegramSetupModal
          open={telegramSetupOpen}
          onOpenChange={(nextOpen) => {
            setTelegramSetupOpen(nextOpen)
            if (!nextOpen) setTelegramSetupResource(null)
          }}
          mcpProjectId={projectId}
          mainProjectId={mainProjectId}
          mainEnvironmentId={mainEnvironmentId}
          projectTitle={projectTitle}
          initialResource={telegramSetupResource}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['resources-v2', projectId] })
            queryClient.invalidateQueries({ queryKey: ['resources-v1', projectId] })
            queryClient.invalidateQueries({ queryKey: ['resources-clickhouse', projectId] })
          }}
        />
      )}

      {instagramSetupOpen && (
        <InstagramSetupModal
          open={instagramSetupOpen}
          onOpenChange={(nextOpen) => {
            setInstagramSetupOpen(nextOpen)
            if (!nextOpen) setInstagramSetupResource(null)
          }}
          mcpProjectId={projectId}
          mainProjectId={mainProjectId}
          openOAuthPopup={openOAuthPopup}
          initialResource={instagramSetupResource}
        />
      )}

      {googleAdsModalOpen && (
        <GoogleAdsSetupModal
          open={googleAdsModalOpen}
          onOpenChange={setGoogleAdsModalOpen}
          mainProjectId={mainProjectId}
          initialMode={googleAdsModalMode}
          onChanged={() => {
            queryClient.invalidateQueries({ queryKey: ['google-ads-integration', mainProjectId] })
          }}
        />
      )}
    </div>
  )
}
