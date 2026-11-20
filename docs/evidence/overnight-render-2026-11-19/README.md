# Overnight render sample · November 19, 2026

Three passes per build compared the verified doorway build with the prepared source through the Lodge board. Each pass used fresh local Chromium at 2560 × 1440, 3840 × 2160 and 360 × 640. The resident walked right for four seconds. All 18 sessions successfully built the first frame and reloaded with no browser errors or API requests.

| View | Median time to first frame, baseline → candidate | Movement callback p95, baseline → candidate |
|---|---:|---:|
| 2K desktop | 384 → 379 ms | 16.8 → 16.8 ms |
| 4K desktop | 359 → 329 ms | 16.8 → 16.8 ms |
| 360-pixel phone | 330 → 308 ms | 16.7 → 16.8 ms |

The same route recorded 141 resource entries per baseline session and 117 per candidate. The browser crossed about the same distance in each session. First-frame measurements vary on this workstation, and the movement callback timings are practically unchanged. The sample compares integrated builds rather than isolating one patch. Physical-device, slow-network and presented-frame performance remain separate. [Raw observations](OBSERVATIONS.json).

Terra inspected the captured 2K, 4K and phone layouts. Terrain reached the edges in both wide scenes. The 4K grass area appears sparse around the northern approach, where people and labels are small in the frame. The phone keeps the resident and controls visible. These are observations from the sampled stills.
