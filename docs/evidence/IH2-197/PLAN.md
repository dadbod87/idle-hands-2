# IH2-197 · Deliberate touch walking

A phone tap confirms its destination on release. The game ignores swipes, long holds, extra fingers, canceled touches and touches interrupted by a scene resize. A short touch on the playfield still takes the existing walk or assisted approach path. Primary mouse input still responds immediately. Secondary mouse clicks leave the current route alone.

The new browser test reproduced immediate walking on touchdown using the parent build. The candidate passed all 18 focused cases across desktop, narrow phones and short landscape, including direct Workshop and garden interactions, world resize, keyboard movement, reload and workshop persistence. These tests use the actual compiled client in Chromium emulation. Touch filtering leaves camera behavior alone. A resize cancels any unfinished touch. Physical phone and Safari behavior remain unverified.

Terra 6.1 checked that the canvas, controls and contextual footer stayed aligned at 320px and at short landscape. The input pass comes from the actual Chromium touch events, including a swipe that moves away and returns before release. The short field notes retain their existing scrollable one-line presentation.
