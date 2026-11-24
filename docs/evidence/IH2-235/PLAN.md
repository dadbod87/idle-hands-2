# IH2-235 · Keep the garden quote steady

An idle planting quote and its selected bed facts no longer rewrite unchanged copy, disabled state or hover text. Changing crop, bed, save permissions or remaining time still updates the appropriate controls. Planting, harvesting, deadlines, quote confirmation, auto-selected ready beds and read-only handling use their original rules. The canopy and garden world renderer are outside this change.

A fresh 320px local touch profile traveled to the garden, chose a radish and opened its quote. For about 6.2s, a MutationObserver measured 112 subtree updates in Chromium and 96 in WebKit before the change, including 28/24 selected facts updates. Both had zero matching updates afterwards. The same saved bytes remained during preview in all four observations. A native confirmation still planted exactly one radish in each engine. No time, inventory or proximity fixtures were used. This measures redundant browser writes, not frame rate or battery.

The final build and seven selected Chromium garden cases passed. Native WebKit also completed the instrumentation journey on the actual client. Saved local services and production were not used. Preserve full exact-head checks for acceptance.
