

export type DisplayStyle = 'style1' | 'style2' | 'style3' | 'style4' | 'style5';

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  displayStyle: DisplayStyle;
  fileTypes?: string;
  createdAt?: any;
  order?: number;
  visibility: 'public' | 'pro';
}

export interface ContentItem {
  id: string;
  title: string;
  imageUrl: string;
  downloadUrl?: string;
  prompt?: string;
  videoUrl?: string;
  instructions?: string;
  createdAt?: any;
  order?: number;
  screenshots?: string[];
  appVersion?: string;
  visibility: 'public' | 'pro';
  status?: 'pending' | 'approved';
}

export interface SubscriptionDialogConfig {
  title: string;
  description: string;
  link: string;
  enabled: boolean;
}

export interface ShareLinkConfig {
  url: string;
  text?: string;
  enabled: boolean;
}

export interface ThemeConfig {
  primaryColor: string;
  primaryColorDark?: string;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  createdAt: any; // Using any for Firebase Timestamp
}

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt: any; // Firebase Timestamp
  subscriptionTier: 'free' | 'pro';
  subscriptionEndDate?: any; // Firebase Timestamp
}

export interface WhitelistEntry {
  id?: string;
  email: string;
  role: 'admin' | 'editor' | 'pro';
  activationCode?: string;
  createdAt: any;
  subscriptionStartDate?: any;
  subscriptionEndDate?: any;
  isActivated?: boolean;
  activatedByUid?: string | null;
  deviceFingerprint?: string | null;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: string;
  currency: string;
  frequency: string;
  description: string;
  features: string[];
  isFeatured: boolean;
  order: number;
  enabled: boolean;
  link?: string;
}

export interface PaymentLinksConfig {
    paypalUrl?: string;
    whatsappUrl?: string;
    telegramUrl?: string;
}

export interface SubscriptionRequest {
  id: string;
  name: string;
  phoneNumber: string;
  planName: string;
  email: string;
  createdAt: any; // Firebase Timestamp
}
