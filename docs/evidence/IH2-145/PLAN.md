# Choose a travel destination on the town map

A resident can open Places → Town map, choose a labeled landmark and see its pin highlighted before pressing Walk there. Choosing or clearing a landmark keeps feet still. There is only one confirmation button. The native select stays large enough to use by touch without tiny overlapping map hit areas. The current Places walk callback still handles pending requests, routing, interruption and arrival.

The initial destinations are the six existing named outdoor landmarks. The map's Town square label is orientation only because its drawing anchor does not represent an exact named stop. The ordinary Places routes and search are still available.

Acceptance requires real desktop, narrow touch, and short enlarged-text browser checks. Confirm that choosing a landmark changes only the selected pin, a clear choice removes the highlight, the button stays within the scroller, and a native trip arrives at the same confirmed landmark as the existing list. No shared command or map/terrain geometry change is needed.

Focused local Chromium replay passed alongside the existing Places search and paper-map trips. Native browser keyboard/touch travel arrived at Riverwalk and East Commons; at 200% text we confirmed travel began and the controls remained reachable. No game API was requested. Terra reviewed all six actual browser stills and identified a naming mismatch. The selector and pin now use the same existing world stop name, including Orchard walk and Founders’ pond. On short viewports the map and its controls remain in separate scroll positions.
