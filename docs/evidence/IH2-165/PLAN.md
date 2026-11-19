# Check for café parcels from Journal

Shared-practice residents can explicitly check the café shelf from the Journal’s Around town section. The paper note reports how many incoming snacks were waiting at the time of the check. It offers the normal walk to the café, where the resident can open the actual shelf and make a choice. Browser-practice residents use their own orchard and do not see the shared parcel shortcut.

The note uses the existing authenticated shelf request one time on open and once for each deliberate check again. It shows a count without item or sender detail. The source client keeps the existing resident and server-instance checks. The note starts no polling, changes no pantry, sends no parcel command and does not bypass the café for collection. Opening Journal alone does not read the shelf.

The native test uses intercepted fictional responses. It exercises a failed read and explicit retry, then follows the real named walk to the Café counter. Reading the note does not reveal the sender or submit a command. The game’s actual shelf shows sender detail after the resident chooses to open it. The browser-only Journal stays separate. Screenshots cover desktop, 320-pixel touch and enlarged short landscape. Disposable server authority and the unmodified shelf delivery remain covered by the existing suite.
