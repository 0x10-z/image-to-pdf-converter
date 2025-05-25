export function getThemeClasses(isDarkMode: boolean) {
  return {
    background: isDarkMode
      ? "bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900"
      : "bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50",

    card: isDarkMode
      ? "bg-gradient-to-br from-slate-800/50 to-slate-700/50 border-slate-600/50"
      : "bg-gradient-to-br from-white/80 to-slate-50/80 border-slate-300/50",

    text: {
      primary: isDarkMode ? "text-slate-200" : "text-slate-800",
      secondary: isDarkMode ? "text-slate-400" : "text-slate-600",
      muted: "text-slate-500",
    },

    button: {
      primary: isDarkMode
        ? "bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-slate-200 border-slate-500/50"
        : "bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white border-slate-400/50",

      success: isDarkMode
        ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-emerald-500/50"
        : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 border-emerald-400/50",
    },

    upload: isDarkMode
      ? "border-slate-500/50 hover:border-slate-400/70 hover:bg-slate-700/20"
      : "border-slate-400/50 hover:border-slate-500/70 hover:bg-slate-200/20",

    uploadActive: isDarkMode
      ? "border-slate-400 bg-slate-700/30"
      : "border-slate-500 bg-slate-200/30",
  };
}
