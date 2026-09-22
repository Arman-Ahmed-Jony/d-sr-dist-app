export const bn = {
  appName: 'এসআর ডিস্ট',
  login: 'লগইন',
  logout: 'লগআউট',
  email: 'ইমেইল',
  password: 'পাসওয়ার্ড',
  dashboard: 'ড্যাশবোর্ড',
  loading: 'লোড হচ্ছে…',
  errorGeneric: 'কিছু ভুল হয়েছে। আবার চেষ্টা করুন।',
  loginTitle: 'এসআর ডিস্ট সিস্টেম',
  loginSubtitle: 'লগইন করে চালিয়ে যান',
  name: 'নাম',
  role: 'ভূমিকা',
  distributorId: 'ডিস্ট্রিবিউটর আইডি',
} as const;

export type TranslationKey = keyof typeof bn;
