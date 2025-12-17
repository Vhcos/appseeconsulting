import {getRequestConfig} from 'next-intl/server';

const SUPPORTED = ['es', 'en'] as const;
type Locale = (typeof SUPPORTED)[number];

export default getRequestConfig(async ({requestLocale}) => {
  const maybe = await requestLocale;
  const locale: Locale = SUPPORTED.includes(maybe as Locale) ? (maybe as Locale) : 'es';

  const messagesByLocale: Record<Locale, any> = {
    es: (await import('../messages/es.json')).default,
    en: (await import('../messages/en.json')).default
  };

  return {
    locale,
    messages: messagesByLocale[locale]
  };
});
