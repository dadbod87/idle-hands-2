# OpenAI Game Studio skills

Publisher/author: OpenAI. Source: https://github.com/openai/plugins/tree/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/game-studio

The upstream plugin manifest declares version 0.1.2 and license MIT. Its original author/license declaration is preserved in `game-studio.upstream.json`. The upstream bundle has no separate LICENSE file at this revision; this notice records its published declaration, preserves its source attribution, and includes the standard MIT terms below. Original files are unmodified; their exact paths/hashes are in `game-studio.lock.json`. This is a repository-local installation of skills and supporting resources, not an installation/connection of an app plugin or a game-runtime dependency. Upstream branding is retained only as bundled tooling provenance, not game artwork.

## MIT License

Attribution: OpenAI (as declared by the upstream plugin manifest).

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Local QA dependencies

`tools/qa/package-lock.json` pins the actual installed dependency graph. Playwright / @playwright/test are Apache-2.0; axe-core and @axe-core/playwright are MPL-2.0. Their upstream license/notice files remain in their installed packages; those packages are development tools and are not bundled into the game. Review their package notices before redistributing modified tooling.
