'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { AffiliateAd } from '@/lib/definitions';

interface AffiliateContextType {
  bannerAds: AffiliateAd[];
  inlineAds: AffiliateAd[];
  currentBannerIndex: number;
  currentInlineIndex: number;
  isLoading: boolean;
}

const AffiliateContext = createContext<AffiliateContextType | undefined>(undefined);

export function AffiliateAdsProvider({ children }: { children: React.ReactNode }) {
  const firestore = useFirestore();
  const adsQuery = useMemoFirebase(() => firestore ? query(
    collection(firestore, 'affiliateAds'),
    where('enabled', '==', true),
    orderBy('order', 'asc')
  ) : null, [firestore]);

  const { data: allAds, isLoading } = useCollection<AffiliateAd>(adsQuery);

  const bannerAds = useMemo(() => allAds?.filter(ad => ad.placement === 'banner') || [], [allAds]);
  const inlineAds = useMemo(() => allAds?.filter(ad => ad.placement === 'inline') || [], [allAds]);

  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [currentInlineIndex, setCurrentInlineIndex] = useState(0);

  useEffect(() => {
    if (bannerAds.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex(prev => (prev + 1) % bannerAds.length);
    }, 9000);
    return () => clearInterval(interval);
  }, [bannerAds.length]);

  useEffect(() => {
    if (inlineAds.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentInlineIndex(prev => (prev + 1) % inlineAds.length);
    }, 9000);
    return () => clearInterval(interval);
  }, [inlineAds.length]);

  return (
    <AffiliateContext.Provider value={{ bannerAds, inlineAds, currentBannerIndex, currentInlineIndex, isLoading }}>
      {children}
    </AffiliateContext.Provider>
  );
}

export function useAffiliateAds() {
  const context = useContext(AffiliateContext);
  if (!context) throw new Error('useAffiliateAds must be used within AffiliateAdsProvider');
  return context;
}

export function AffiliateAdSlot({ placement, className }: { placement: 'banner' | 'inline', className?: string }) {
  const { bannerAds, inlineAds, currentBannerIndex, currentInlineIndex } = useAffiliateAds();
  
  const ads = placement === 'banner' ? bannerAds : inlineAds;
  const index = placement === 'banner' ? currentBannerIndex : currentInlineIndex;
  
  if (ads.length === 0) return null;
  const currentAd = ads[index];

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
