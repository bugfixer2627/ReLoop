import type { Platform } from "@/lib/contracts";

export const platformDefinitions = {
  shopify_us: { label: "Shopify US", labelZh: "Shopify 美国站", market: "US", segment: "b2c", format: "shopify_description" },
  amazon_de: { label: "Amazon Germany", labelZh: "亚马逊德国站", market: "DE", segment: "b2c", format: "amazon_listing" },
  alibaba_intl: { label: "Alibaba International", labelZh: "阿里巴巴国际站", market: "global_b2b", segment: "b2b", format: "alibaba_b2b" },
} as const satisfies Record<Platform, { label: string; labelZh: string; market: string; segment: "b2c" | "b2b"; format: string }>;

export function platformLabel(platform: Platform, locale = 'en-US') {
  return locale === 'zh-CN' ? platformDefinitions[platform].labelZh : platformDefinitions[platform].label;
}

// These are development targets, not a claim that generation or speech works.
export const languageTargets = [
  { locale: "zh-CN", label: "中文", priority: 0, required: true, status: "unavailable" },
  { locale: "en-US", label: "English", priority: 1, required: true, status: "unavailable" },
  { locale: "de-DE", label: "Deutsch", priority: 2, required: false, status: "unavailable" },
  { locale: "ar-AE", label: "العربية", priority: 3, required: false, status: "unavailable" },
] as const;
