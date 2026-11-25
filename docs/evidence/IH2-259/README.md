# Nursery pigments and the Swatch Book

After the Glasshouse opens, residents could opt into one illustrated growing tray. Inkmint makes green pigment in 24 hours. Dusk basil makes blue-violet pigment in 36 hours. Ripe crops wait until explicitly collected. One harvest supplies one pigment. Each cultivar supports two permanent samples in the Swatch Book, a stripe and a dot. Each sample consumes one matching pigment.

The shortest possible path to all four swatches is 120 hours, five days, after enrollment. Players can garden, craft, contribute or explore between visits. There is no streak, missed-visit penalty, auto-harvest, resource reward, production multiplier or town gate tied to this collection. One player can finish independently. A new color or finish should change parts of a future item while preserving its silhouette, original detail and recognition.

Use the standalone design preview at `/docs/evidence/IH2-259/pigment-preview/` on an isolated local Vite server. The preview clock advances in 12-hour steps. It uses the actual pure study rules, owns all of its state in memory, and makes no game or database calls.

Before integration, finish connected acceptance of the Glasshouse and test which items should receive an elective pigment finish. Keep permanent sample ownership independent of that choice. Compare the two fictional crops with real players for immediate readability and perceived value before introducing more cultivars or paid finish decisions.

Terra 6.1 reviewed desktop and 320-pixel phone captures. The review led to a separate Swatch Book receipt, spacing between the two tray controls and distinct text for saved and unavailable samples. Chromium desktop completed all four designs with keyboard activation. Phone WebKit completed the same actions by touch at 320×640. Both matched the exact rule timings, conserved all four pigments, fit without horizontal scrolling and reported zero automated accessibility violations for the tested final view. Playtest acceptance remains open.
