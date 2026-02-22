'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import type { AffiliateAd, AffiliateConfig } from '@/lib/definitions';

interface AffiliateContextType {
  allAds: AffiliateAd[];
  adFrequency: number;
  currentBannerIndex: number;
  currentInlineIndex: number;
  isLoading: boolean;
}

const AffiliateContext = createContext<AffiliateContextType | undefined>(undefined);

export function AffiliateAdsProvider({ children }: { children: React.ReactNode }) {
  const firestore = useFirestore();
  
  // Fetch Config
  const configRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'affiliate') : null, [firestore]);
  const { data: config } = useDoc<AffiliateConfig>(configRef);
  const adFrequency = config?.adFrequency || 6;

  // Fetch Ads
  const adsQuery = useMemoFirebase(() => firestore ? query(
    collection(firestore, 'affiliateAds'),
    where('enabled', '==', true),
    orderBy('order', 'asc')
  ) : null, [firestore]);

  const { data: allAds = [], isLoading } = useCollection<AffiliateAd>(adsQuery);

  const bannerAdsCount = useMemo(() => allAds.filter(ad => ad.placement === 'banner').length, [allAds]);
  const inlineAdsCount = useMemo(() => allAds.filter(ad => ad.placement === 'inline').length, [allAds]);

  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [currentInlineIndex, setCurrentInlineIndex] = useState(0);

  // Rotate banner ads
  useEffect(() => {
    if (bannerAdsCount <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex(prev => (prev + 1) % bannerAdsCount);
    }, 9000);
    return () => clearInterval(interval);
  }, [bannerAdsCount]);

  // Rotate inline ads
  useEffect(() => {
    if (inlineAdsCount <= 1) return;
    const interval = setInterval(() => {
      setCurrentInlineIndex(prev => (prev + 1) % inlineAdsCount);
    }, 9000);
    return () => clearInterval(interval);
  }, [inlineAdsCount]);

  return (
    <AffiliateContext.Provider value={{ allAds, adFrequency, currentBannerIndex, currentInlineIndex, isLoading }}>
      {children}
    </AffiliateContext.Provider>
  );
}

export function useAffiliateAds() {
  const context = useContext(AffiliateContext);
  if (!context) throw new Error('useAffiliateAds must be used within AffiliateAdsProvider');
  return context;
}

export function AffiliateAdSlot({ placement, categoryId, className }: { placement: 'banner' | 'inline', categoryId?: string, className?: string }) {
  const { allAds, currentBannerIndex, currentInlineIndex } = useAffiliateAds();
  
  // Filter ads based on placement and targeting
  const ads = useMemo(() => {
      let filtered = allAds.filter(ad => ad.placement === placement);
      
      if (placement === 'inline' && categoryId) {
          // Priority: specific category ads, then global ads
          const categorySpecific = filtered.filter(ad => ad.targetCategoryId === categoryId);
          if (categorySpecific.length > 0) return categorySpecific;
          return filtered.filter(ad => !ad.targetCategoryId);
      }
      
      return filtered;
  }, [allAds, placement, categoryId]);
  
  if (ads.length === 0) return null;
  
  const index = placement === 'banner' ? currentBannerIndex : currentInlineIndex;
  const currentAd = ads[index % ads.length];

  return (
    <a 
      href={currentAd.link} 
      target="_blank" 
      rel="noopener noreferrer" 
      className={`block w-full overflow-hidden transition-all duration-500 animate-in fade-in ${className}`}
    >
      <img 
        src={currentAd.imageUrl} 
        alt="Affiliate Ad" 
        className="w-full h-full object-cover" 
      />
    </a>
  );
}
