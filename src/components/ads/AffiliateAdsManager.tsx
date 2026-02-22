'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
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
  
  const configRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'affiliate') : null, [firestore]);
  const { data: config } = useDoc<AffiliateConfig>(configRef);
  const adFrequency = config?.adFrequency || 6;

  const adsQuery = useMemoFirebase(() => firestore ? query(
    collection(firestore, 'affiliateAds'),
    where('enabled', '==', true)
  ) : null, [firestore]);

  const { data: rawAds, isLoading } = useCollection<AffiliateAd>(adsQuery);
  
  // Sort client-side to avoid Firebase Index requirement
  const allAds = useMemo(() => {
    if (!rawAds) return [];
    return [...rawAds].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [rawAds]);

  const bannerAdsCount = useMemo(() => allAds.filter(ad => ad.placement === 'banner').length, [allAds]);
  const inlineAdsCount = useMemo(() => allAds.filter(ad => ad.placement === 'inline').length, [allAds]);

  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [currentInlineIndex, setCurrentInlineIndex] = useState(0);

  useEffect(() => {
    if (bannerAdsCount <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex(prev => (prev + 1) % bannerAdsCount);
    }, 9000);
    return () => clearInterval(interval);
  }, [bannerAdsCount]);

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
  if (context === undefined) {
    return { allAds: [], adFrequency: 6, currentBannerIndex: 0, currentInlineIndex: 0, isLoading: false };
  }
  return context;
}

export function AffiliateAdSlot({ placement, categoryId, className }: { placement: 'banner' | 'inline', categoryId?: string, className?: string }) {
  const { allAds, currentBannerIndex, currentInlineIndex } = useAffiliateAds();
  
  const ads = useMemo(() => {
      if (!allAds || allAds.length === 0) return [];
      let filtered = allAds.filter(ad => ad && ad.placement === placement);
      
      if (placement === 'inline' && categoryId) {
          const categorySpecific = filtered.filter(ad => ad.targetCategoryId === categoryId);
          if (categorySpecific.length > 0) return categorySpecific;
          return filtered.filter(ad => !ad.targetCategoryId);
      }
      
      return filtered;
  }, [allAds, placement, categoryId]);
  
  if (ads.length === 0) return null;
  
  const index = placement === 'banner' ? currentBannerIndex : currentInlineIndex;
  const currentAd = ads[index % ads.length];

  if (!currentAd) return null;

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
