

export type DisplayStyle = 'style1' | 'style2' | 'style3' | 'style4' | 'style5';

export type LocalizedString = {
  ar: string;
  en: string;
};

export interface Category {
  id: string;
  name: LocalizedString | string;
  parentId: string | null;
  displayStyle: DisplayStyle;
  fileTypes?: string;
  createdAt?: any;
  order?: number;
}

export interface ContentItem {
  id: string;
  title: LocalizedString | string;
  imageUrl: string;
  downloadUrl?: string;
  prompt?: string;
  videoUrl?: string;
  instructions?: LocalizedString | string;
  createdAt?: any;
  order?: number;
  screenshots?: string[];
  appVersion?: string;
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
  title: LocalizedString | string;
  description: LocalizedString | string;
  createdAt: any; // Using any for Firebase Timestamp
}
    

    
