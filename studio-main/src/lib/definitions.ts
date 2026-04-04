export type DisplayStyle = 'style1' | 'style2' | 'style3' | 'style4' | 'style5' | 'style6' | 'style7';

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  displayStyle: DisplayStyle;
  fileTypes?: string;
  createdAt?: any;
  order?: number;
  visibility: 'public' | 'pro';
  isUnderMaintenance?: boolean;
}

export interface ContentItem {
  id: string;
  title: string;
  imageUrl: string;
  downloadUrl?: string;
  audioUrl?: string;
  prompt?: string;
  videoUrl?: string;
  instructions?: string;
  createdAt?: any;
  order?: number;
  screenshots?: string[];
  appVersion?: string;
  visibility: 'public' | 'pro';
  status?: 'pending' | 'approved';
  isNew?: boolean;
}

export interface AffiliateAd {
  id: string;
  imageUrl: string;
  link: string;
  placement: 'inline' | 'banner';
  targetCategoryId?: string | null; // New field
  enabled: boolean;
  order: number;
  createdAt: any;
}

export interface AffiliateConfig {
    adFrequency: number; // New config
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

export interface RequestDesignConfig {
  url: string;
  enabled: boolean;
}

export interface ThemeConfig {
  primaryColor: string;
  primaryColorDark?: string;
}

export interface ReferralConfig {
  requiredReferrals: number;
  rewardInterval: number; 
  pointsPerReferral: number;
  pointsPerUnlock: number;
  pointsForProUpgrade: number;
  pointsToGenerateCode: number;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  createdAt: any; 
}

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt: any;
  subscriptionTier: 'free' | 'pro';
  subscriptionEndDate?: any;
  referralCode: string;
  referralCount: number;
  points: number;
  unlockedProCodes: string[];
  referredBy?: string | null;
  deviceFingerprint?: string;
  status?: 'pending' | 'approved' | 'rejected';
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
  deviceFingerprints?: string[] | null;
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
    paymentInstructions?: string;
}

export interface SubscriptionRequest {
  id: string;
  name: string;
  phoneNumber: string;
  planName: string;
  email: string;
  createdAt: any;
}

export interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  link: string;
  isUrl: boolean;
  country: string;
  order: number;
  enabled: boolean;
}
