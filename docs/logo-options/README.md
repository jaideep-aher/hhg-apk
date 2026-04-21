# HHG Farmers -- launcher icon options

The current launcher icon (`app/src/main/res/drawable/ic_launcher_foreground.xml`) is marked in the source as a placeholder ("Replace with a proper artwork before Play Store launch"). Below are four replacement concepts. All keep the brand orange `#F97316` as the adaptive-icon background and use a solid white foreground for maximum contrast and readability at small sizes.

Open **`preview.svg`** in a browser to see all four side-by-side.

## Options

### 1. HHG monogram with leaf -- `option-1-monogram.svg`
A bold geometric **H** with a single leaf sprouting off the top of the right bar. Leads with the brand initial, clearly ties to agriculture via the leaf. Extremely legible at 48dp and under. Best pick if you want the mark to read "HHG" at a glance.

### 2. Wheat ear -- `option-2-wheat.svg`
A symmetrical stylized **ear of wheat** (5 pairs of grains + stem + base). Universal farming symbol, no language dependency, works across all of India. Best pick if you want a purely iconographic mark with no letters.

### 3. Devanagari "ह" as sprout -- `option-3-ha-sprout.svg`
The Marathi/Hindi letter **ह** (the current placeholder's idea) redrawn properly -- shirorekha on top, a body curve that morphs into a leaf at its tail, plus a small seed/matra above. Culturally grounded for the app's Marathi-first audience. Best pick if you want to signal "made for Marathi farmers" immediately.

### 4. Sunrise over a field -- `option-4-sunrise.svg`
A half **sun** with three rays rising over **three curved field furrows**. Evokes dawn on the farm, prosperity, new season. Most "editorial" of the four and the strongest silhouette. Best pick if you want the most distinctive, non-letterform mark.

## How to apply your pick

Each option ships with an Android-ready foreground vector drawable (`option-N-foreground.xml`). To use one:

1. Copy the chosen `option-N-foreground.xml` over the existing file:
   ```bash
   cp docs/logo-options/option-2-foreground.xml \
      app/src/main/res/drawable/ic_launcher_foreground.xml
   ```
2. Rebuild. The adaptive-icon definitions in `mipmap-anydpi-v26/ic_launcher.xml` and the API-24/25 fallback in `mipmap/ic_launcher.xml` already reference `@drawable/ic_launcher_foreground` and `@color/hhg_orange_500` -- no other files need to change.
3. For Play Store upload, a 512×512 PNG is also required. Render the matching `option-N-*.svg` on an orange (`#F97316`) 512×512 background and export.

## Notes

- Brand color `@color/hhg_orange_500` = `#F97316` is unchanged across all four options.
- Each foreground keeps the icon content within the 66dp Android adaptive-icon safe zone, so it will not get clipped by round / squircle / teardrop launcher masks.
- The SVG previews render the final on-device look (squircle-masked, full bleed). The `.xml` files are the actual Android vector drawables used at build time.
