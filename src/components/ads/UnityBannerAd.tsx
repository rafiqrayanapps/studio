
'use client';

import { useEffect, useRef, useState } from 'react';
import { useUnityAds } from './UnityAdsProvider';

/**
 * مكون عرض بانر Adsterra المطور.
 * يستخدم تقنية التلاعب المباشر بالـ DOM لضمان تنفيذ السكريبتات الخارجية (invoke.js) 
 * فوراً بمجرد ظهور الحاوية الخاصة بها.
 */
export default function UnityBannerAd() {
  const { config } = useUnityAds();
  const bannerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !config?.enabled || !config.adsterraEnabled || !config.nativeBannerScript || !bannerRef.current) return;

    const container = bannerRef.current;
    container.innerHTML = ''; // تنظيف الحاوية

    const injectAd = () => {
        try {
            // 1. استخراج الـ HTML (الديف) والسكريبتات من الكود المدخل
            const parser = new DOMParser();
            const doc = parser.parseFromString(`<div>${config.nativeBannerScript}</div>`, 'text/html');
            const scripts = doc.querySelectorAll('script');
            const elements = doc.querySelector('div')?.childNodes;

            // 2. إضافة كافة العناصر غير السكريبتية أولاً (مثل الحاوية div)
            if (elements) {
                elements.forEach(node => {
                    if (node.nodeName !== 'SCRIPT') {
                        container.appendChild(node.cloneNode(true));
                    }
                });
            }

            // 3. إنشاء السكريبتات يدوياً لضمان تنفيذها من قبل المتصفح
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                Array.from(oldScript.attributes).forEach(attr => {
                    newScript.setAttribute(attr.name, attr.value);
                });
                if (oldScript.innerHTML) {
                    newScript.innerHTML = oldScript.innerHTML;
                }
                container.appendChild(newScript);
            });
        } catch (e) {
            console.error("Adsterra Banner injection failed:", e);
        }
    };

    // تأخير بسيط لضمان استقرار الـ DOM
    const timer = setTimeout(injectAd, 800);

    return () => {
        clearTimeout(timer);
        if (container) container.innerHTML = '';
    };
  }, [config?.nativeBannerScript, config?.enabled, config?.adsterraEnabled, mounted]);

  if (!config?.enabled || !mounted) return null;

  return (
    <div className="fixed bottom-24 left-0 right-0 flex justify-center pointer-events-none z-40 px-4">
        <div 
            ref={bannerRef}
            className="w-full max-w-sm min-h-[50px] pointer-events-auto flex flex-col items-center justify-center transition-all bg-transparent"
        >
            {/* خيار الإعلان اليدوي في حال تعطيل Adsterra */}
            {!config.adsterraEnabled && config.manualAdsEnabled && config.manualBannerImg && (
                <a href={config.manualBannerLink || '#'} target="_blank" rel="noopener noreferrer" className="w-full h-full flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-card/20 backdrop-blur-md">
                    <img src={config.manualBannerImg} alt="Ad" className="w-full h-auto object-cover max-h-16" />
                </a>
            )}
        </div>
    </div>
  );
}
