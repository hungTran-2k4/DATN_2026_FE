/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      boxShadow: {
        soft: '0 10px 30px rgba(14, 30, 62, 0.08)',
      },
      colors: {
        admin: {
          primary: 'var(--admin-primary)',
          primaryStrong: 'var(--admin-primary-strong)',
          primaryWeak: 'var(--admin-primary-weak)',
          bgSoft: 'var(--admin-bg-soft)',
          border: 'var(--admin-border)',
          textPrimary: 'var(--admin-text-primary)',
          textMuted: 'var(--admin-text-muted)',
          surface: 'var(--admin-surface)',
          surfaceSoft: 'var(--admin-surface-soft)',
          success: 'var(--admin-success)',
          warning: 'var(--admin-warning)',
          danger: 'var(--admin-danger)',
          info: 'var(--admin-info)',
        },
      },
    },
  },
  plugins: [],
};
