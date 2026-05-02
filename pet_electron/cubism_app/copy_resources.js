/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

"use strict";
const fs = require('fs');

const publicResources = [
  { src: './sdk/Core', dst: './public/Core' },
  { src: './sdk/Resources', dst: './public/Resources' },
  { src: './sdk/Framework/Shaders', dst: './public/Framework/Shaders' },
];

publicResources.forEach((entry) => {
  if (fs.existsSync(entry.dst)) {
    fs.rmSync(entry.dst, { recursive: true, force: true });
  }
});

publicResources.forEach((entry) => {
  fs.cpSync(entry.src, entry.dst, { recursive: true });
});

// Override the sample Hiyori with the project's own model files.
fs.cpSync('../models/Hiyori', './public/Resources/Hiyori', {
  recursive: true,
  force: true
});
