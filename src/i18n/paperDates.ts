import { en, registerTranslation, type TranslationsType } from 'react-native-paper-dates';

const bn: TranslationsType = {
  save: 'সংরক্ষণ',
  selectSingle: 'তারিখ নির্বাচন করুন',
  selectMultiple: 'তারিখগুলো নির্বাচন করুন',
  selectRange: 'সময়কাল নির্বাচন করুন',
  notAccordingToDateFormat: (inputFormat) => `তারিখের ফরম্যাট ${inputFormat} হতে হবে`,
  mustBeHigherThan: (date) => `${date} এর পরের তারিখ হতে হবে`,
  mustBeLowerThan: (date) => `${date} এর আগের তারিখ হতে হবে`,
  mustBeBetween: (startDate, endDate) => `${startDate} এবং ${endDate}-এর মধ্যে হতে হবে`,
  dateIsDisabled: 'এই দিনটি অনুমোদিত নয়',
  previous: 'পূর্ববর্তী',
  next: 'পরবর্তী',
  typeInDate: 'তারিখ লিখুন',
  pickDateFromCalendar: 'ক্যালেন্ডার থেকে তারিখ নির্বাচন করুন',
  close: 'বন্ধ করুন',
  minute: 'মিনিট',
  hour: 'ঘণ্টা',
};

registerTranslation('en', en);
registerTranslation('bn', bn);
