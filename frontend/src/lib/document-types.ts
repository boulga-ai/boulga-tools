export type ContactInfo = {
  email: string;
  phone?: string;
  address?: string;
  linkedin?: string;
};

export type Experience = {
  title: string;
  company: string;
  location?: string;
  start_date: string;
  end_date?: string;
  description: string;
  achievements: string[];
};

export type Education = {
  degree: string;
  institution: string;
  location?: string;
  year: string;
  details?: string;
};

export type LanguageLevel = {
  language: string;
  level: string;
};

export type CVContent = {
  full_name: string;
  title: string;
  contact: ContactInfo;
  summary: string;
  experiences: Experience[];
  education: Education[];
  skills: string[];
  languages: LanguageLevel[];
  certifications: string[];
};

export type CoverLetterContent = {
  full_name: string;
  contact: ContactInfo;
  recipient_name?: string;
  recipient_title?: string;
  company_name: string;
  date: string;
  subject: string;
  greeting: string;
  paragraphs: string[];
  closing: string;
  signature: string;
};
