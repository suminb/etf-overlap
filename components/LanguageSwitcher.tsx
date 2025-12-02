"use client";

import { useTranslation } from "react-i18next";

const languages = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const currentLanguage =
    languages.find((lang) => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div
      className="language-switcher"
      style={{
        position: "fixed",
        top: "1rem",
        right: "1rem",
        zIndex: 1000,
      }}
    >
      <select
        value={i18n.language}
        onChange={handleLanguageChange}
        style={{
          padding: "0.5rem 2.5rem 0.5rem 0.75rem",
          fontSize: "0.875rem",
          border: "1px solid #ddd",
          borderRadius: "4px",
          backgroundColor: "#fff",
          cursor: "pointer",
          appearance: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0.75rem center",
          backgroundSize: "12px",
        }}
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
}
