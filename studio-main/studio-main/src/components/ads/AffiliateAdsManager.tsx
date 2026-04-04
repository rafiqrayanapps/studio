
'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import type { AffiliateAd, AffiliateConfig } from '@/lib/definitions';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

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

  // Fetch only enabled ads
  const adsQuery = useMemoFirebase(() => firestore ? query(
    collection(firestore, 'affiliateAds'),
    where('enabled', '==', true)
  ) : null, [firestore]);

  const { data: rawAds, isLoading } = useCollection<AffiliateAd>(adsQuery);
  
  // Sort ads locally
  const allAds = useMemo(() => {
    if (!rawAds) return [];
    return [...rawAds].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [rawAds]);

  const bannerAds = useMemo(() => allAds.filter(ad => ad.placement === 'banner'), [allAds]);
  const inlineAds = useMemo(() => allAds.filter(ad => ad.placement === 'inline'), [allAds]);

  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [currentInlineIndex, setCurrentInlineIndex] = useState(0);

  // Rotation logic: 9 seconds
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
  const { allAds, currentBannerIndex, currentInlineIndex, isLoading } = useAffiliateAds();
  
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
  
  if (isLoading) {
      return (
          <div className={cn(
              "w-full bg-white/5 backdrop-blur-xl border border-white/10 animate-pulse flex items-center justify-center rounded-2xl overflow-hidden",
              placement === 'banner' ? "h-[60px]" : "aspect-video",
              className
          )}>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
              <div className="w-12 h-1.5 bg-white/10 rounded-full" />
          </div>
      );
  }

  if (ads.length === 0) return null;
  
  const index = placement === 'banner' ? currentBannerIndex : currentInlineIndex;
  const currentAd = ads[index % ads.length];

  if (!currentAd) return null;

  return (
    <div className={cn("w-full relative overflow-hidden", className)}>
        <AnimatePresence mode="wait">
            <motion.div
                key={currentAd.id}
                initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                    "w-full flex justify-center items-center",
                    placement === 'banner' ? "h-[60px]" : "h-auto"
                )}
            >
                <a 
                  href={currentAd.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="block w-full h-full"
                >
                  <img 
                    src={currentAd.imageUrl} 
                    alt="Affiliate Ad" 
                    className={cn(
                        "w-full block",
                        placement === 'banner' ? "h-[60px] object-contain" : "h-auto w-full object-contain rounded-[2rem] shadow-2xl"
                    )}
                  />
                </a>
            </motion.div>
        </AnimatePresence>
    </div>
  );
}
