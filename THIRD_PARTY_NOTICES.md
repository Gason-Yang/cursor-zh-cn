# Third-party notices

This independent project is not affiliated with, endorsed by, or sponsored by Anysphere, Microsoft, or the upstream language-pack authors. No Cursor executable, original bundle, patched bundle, original product configuration, or user account/profile data is included in this repository or its release archive.

## Runtime dependencies, not redistributed here

- `polang233/cursor-language-pack`, copyright (c) 2026 cursor-language-pack contributors, MIT: <https://github.com/polang233/cursor-language-pack>. Installed separately by the user. The builder reads its `zh-cn/main.i18n.json` locally.
- `microsoft/vscode-loc`, copyright (c) Microsoft Corporation, MIT: <https://github.com/microsoft/vscode-loc>. Workbench translations incorporated by the separately installed upstream language pack.
- Acorn, copyright (C) 2012–2022 by various contributors (see upstream AUTHORS), MIT: <https://github.com/acornjs/acorn>. The builder loads the copy already installed with Cursor. No Acorn files are bundled here.

If you redistribute outputs incorporating these dependencies, you must preserve the applicable upstream license and copyright notices in addition to this project's license. This project does not grant rights to redistribute Cursor's proprietary application bundles.

## MIT terms for the dependencies named above

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Translation provenance

`translations.tsv` contains project-maintained supplemental wording and revisions. `machine-translations.json` contains machine-generated supplemental Chinese wording, created from public UI strings using Google Translate and subsequently normalized for some technical terms. It has not been entirely reviewed by a professional translator. No live translation API is used by the released installer.

Small build-specific identifiers and matching fragments in the generator are used to locate compatible UI rendering sites. These are compatibility references, not a distribution of the full application source.
