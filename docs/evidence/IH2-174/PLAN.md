# IH2-174 · Keep the location card steady during movement

Walking past a landmark changes the available action. The location card now keeps its room title, location hint and weather element in place when the nearby action changes. The action button changes its disabled state only when it becomes available or unavailable. Room and weather text, accessible action names, input guards and the shared resume gate use their existing data.

Native Chromium walked from the allotment beds past the exit and onto open ground in nine viewport and text combinations. It retained the location hint and sky nodes, kept the game and toolbar geometry steady and made zero redundant writes to the action button. The baseline set the button state on every rendered frame and replaced the hint and sky nodes. See [native measurements](NATIVE_HUD_COUNTS.json). Glyph sizes, full labels, menu focus, touch and keyboard controls retain existing browser coverage. These counts measure browser work on this route. Frame rate, physical-phone performance and installed preview play remain unmeasured.

If playtesting finds another hitch, measure the affected scene and action before changing the underlying systems.
