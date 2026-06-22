// Tailwind generates physical-direction utilities (ml-, pl-, text-left, left-0 …).
// postcss-rtlcss runs AFTER Tailwind and emits mirrored copies of every direction-
// aware rule, scoped under [dir="rtl"], so the whole layout flips automatically for
// Arabic/Urdu (which set dir="rtl" on <html>) without rewriting any component.
module.exports = {
  plugins: {
    tailwindcss: {},
    "postcss-rtlcss": {},
    autoprefixer: {},
  },
}
