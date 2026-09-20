import * as THREE from 'three';


let cachedEarthDayTexture: THREE.CanvasTexture | null = null;
let cachedEarthNightTexture: THREE.CanvasTexture | null = null;
let cachedEarthCloudsTexture: THREE.CanvasTexture | null = null;
let cachedEarthSpecularTexture: THREE.CanvasTexture | null = null;

function geoToCanvas(lonDeg: number, latDeg: number, width: number, height: number): [number, number] {
  const x = ((lonDeg + 180) / 360) * width;
  const y = ((90 - latDeg) / 180) * height;
  return [x, y];
}

function drawGeoPolygon(
  ctx: CanvasRenderingContext2D,
  points: [number, number][],
  width: number,
  height: number,
  fillColor?: string,
  strokeColor?: string,
  strokeWidth?: number
) {
  if (points.length < 2) return;
  ctx.beginPath();
  const [firstX, firstY] = geoToCanvas(points[0][0], points[0][1], width, height);
  ctx.moveTo(firstX, firstY);

  for (let i = 1; i < points.length; i++) {
    const [px, py] = geoToCanvas(points[i][0], points[i][1], width, height);
    ctx.lineTo(px, py);
  }
  ctx.closePath();

  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor && strokeWidth) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}

export function getRealisticEarthDayTexture(): THREE.CanvasTexture {
  if (cachedEarthDayTexture) return cachedEarthDayTexture;

  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, '#0a2342');
  oceanGrad.addColorStop(0.2, '#041d3d');
  oceanGrad.addColorStop(0.5, '#031933');
  oceanGrad.addColorStop(0.8, '#041d3d');
  oceanGrad.addColorStop(1, '#09213e');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  const northAmerica: [number, number][] = [
    [-168, 65], [-160, 71], [-140, 70], [-130, 69], [-120, 68], [-110, 68], [-95, 70],
    [-85, 68], [-80, 62], [-75, 58], [-60, 52], [-53, 47], [-64, 44], [-70, 42],
    [-76, 35], [-81, 25], [-82, 28], [-88, 30], [-95, 29], [-97, 26], [-97, 21],
    [-90, 19], [-88, 15], [-84, 10], [-79, 8], [-83, 10], [-88, 14], [-94, 16],
    [-105, 20], [-110, 24], [-115, 30], [-124, 40], [-124, 48], [-130, 54],
    [-138, 59], [-150, 60], [-162, 55], [-166, 60], [-168, 65]
  ];

  const greenland: [number, number][] = [
    [-45, 60], [-35, 65], [-20, 70], [-18, 77], [-25, 83], [-45, 83],
    [-55, 80], [-58, 76], [-52, 70], [-45, 60]
  ];

  const southAmerica: [number, number][] = [
    [-77, 8], [-72, 11], [-62, 10], [-50, 2], [-38, -4], [-35, -7],
    [-38, -13], [-40, -22], [-48, -28], [-53, -33], [-60, -38], [-65, -45],
    [-68, -53], [-74, -53], [-75, -45], [-72, -35], [-71, -25], [-76, -15],
    [-80, -3], [-79, 2], [-77, 8]
  ];

  const eurasia: [number, number][] = [
    [-9, 39], [-9, 43], [-1, 44], [0, 49], [-4, 53], [5, 53], [5, 58],
    [10, 56], [12, 54], [18, 55], [20, 60], [25, 71], [35, 70], [50, 68],
    [70, 72], [90, 74], [110, 74], [140, 72], [170, 68], [178, 65],
    [165, 60], [156, 50], [140, 50], [130, 42], [122, 38], [120, 32],
    [118, 25], [108, 22], [106, 12], [100, 4], [98, 10], [92, 22],
    [88, 22], [80, 16], [78, 8], [73, 18], [68, 24], [60, 25],
    [55, 27], [50, 30], [45, 13], [44, 28], [35, 32], [28, 41],
    [15, 40], [14, 45], [5, 43], [-5, 36], [-9, 39]
  ];

  const scandinavia: [number, number][] = [
    [5, 58], [10, 59], [15, 56], [20, 60], [28, 70], [24, 71], [15, 68], [5, 62], [5, 58]
  ];
  const britishIsles: [number, number][] = [
    [-5, 50], [-1, 51], [1, 53], [-2, 57], [-5, 58], [-7, 55], [-5, 50]
  ];

  const africa: [number, number][] = [
    [-17, 15], [-17, 21], [-13, 28], [-5, 36], [10, 37], [12, 33],
    [25, 32], [32, 31], [33, 27], [38, 20], [43, 12], [51, 10],
    [45, 0], [40, -10], [35, -20], [32, -28], [28, -33], [18, -34],
    [15, -28], [12, -18], [12, -6], [9, 4], [3, 6], [-5, 5],
    [-13, 8], [-17, 15]
  ];

  const madagascar: [number, number][] = [
    [44, -12], [50, -14], [47, -25], [44, -25], [44, -12]
  ];

  const india: [number, number][] = [
    [68, 24], [72, 21], [74, 15], [77, 8], [80, 13], [84, 18], [88, 22],
    [88, 27], [80, 28], [72, 28], [68, 24]
  ];

  const australia: [number, number][] = [
    [113, -22], [115, -34], [125, -32], [135, -34], [142, -38], [150, -36],
    [153, -28], [148, -20], [142, -11], [132, -12], [130, -16], [123, -16],
    [118, -20], [113, -22]
  ];

  const japan: [number, number][] = [
    [130, 32], [136, 35], [141, 38], [144, 44], [141, 45], [138, 38], [132, 34], [130, 32]
  ];

  const antarctica: [number, number][] = [
    [-180, -70], [-120, -73], [-70, -64], [-55, -64], [-30, -74], [20, -69],
    [70, -66], [120, -66], [160, -71], [180, -78], [180, -90], [-180, -90]
  ];

  const drawContinentalShelf = (pts: [number, number][]) => {
    drawGeoPolygon(ctx, pts, width, height, undefined, '#134e75', 18);
    drawGeoPolygon(ctx, pts, width, height, undefined, '#1e628f', 8);
  };

  [northAmerica, southAmerica, eurasia, africa, australia, greenland, india, scandinavia, britishIsles].forEach(drawContinentalShelf);

  const landBaseColor = '#2d5a27';
  [northAmerica, southAmerica, eurasia, africa, australia, scandinavia, britishIsles, madagascar, japan].forEach(pts => {
    drawGeoPolygon(ctx, pts, width, height, landBaseColor);
  });

  const sahara: [number, number][] = [
    [-14, 18], [-12, 28], [-2, 32], [12, 31], [25, 30], [33, 27], [32, 17],
    [24, 16], [15, 14], [0, 16], [-14, 18]
  ];
  drawGeoPolygon(ctx, sahara, width, height, '#c49a52');

  const arabia: [number, number][] = [
    [36, 28], [42, 30], [50, 26], [58, 23], [54, 17], [48, 14], [44, 13], [36, 28]
  ];
  drawGeoPolygon(ctx, arabia, width, height, '#bfa163');

  const outback: [number, number][] = [
    [120, -22], [130, -20], [140, -23], [142, -30], [132, -31], [122, -28], [120, -22]
  ];
  drawGeoPolygon(ctx, outback, width, height, '#b05d3b');

  const gobi: [number, number][] = [
    [92, 44], [105, 45], [115, 43], [110, 38], [95, 38], [92, 44]
  ];
  drawGeoPolygon(ctx, gobi, width, height, '#ad8e5b');

  const himalayas: [number, number][] = [
    [74, 34], [82, 31], [90, 29], [96, 28], [94, 32], [85, 35], [74, 34]
  ];
  drawGeoPolygon(ctx, himalayas, width, height, '#e2e8f0', '#64748b', 3);

  const andes: [number, number][] = [
    [-77, 8], [-76, -2], [-78, -14], [-70, -24], [-69, -35], [-72, -48],
    [-70, -48], [-67, -35], [-68, -24], [-75, -14], [-74, -2], [-75, 8]
  ];
  drawGeoPolygon(ctx, andes, width, height, '#52525b');

  const rockies: [number, number][] = [
    [-122, 55], [-116, 50], [-112, 44], [-106, 36], [-104, 33],
    [-107, 34], [-114, 43], [-119, 50], [-124, 55]
  ];
  drawGeoPolygon(ctx, rockies, width, height, '#64748b');

  const siberiaTaiga: [number, number][] = [
    [40, 58], [70, 62], [100, 64], [130, 64], [150, 60], [150, 54],
    [120, 52], [90, 52], [60, 54], [40, 58]
  ];
  drawGeoPolygon(ctx, siberiaTaiga, width, height, '#1a3d1e');

  const canadaTaiga: [number, number][] = [
    [-135, 62], [-115, 60], [-95, 58], [-75, 54], [-65, 50],
    [-80, 48], [-105, 52], [-125, 55], [-135, 62]
  ];
  drawGeoPolygon(ctx, canadaTaiga, width, height, '#1a3d1e');

  drawGeoPolygon(ctx, greenland, width, height, '#f8fafc');
  drawGeoPolygon(ctx, antarctica, width, height, '#f1f5f9');

  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, width, 42);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const r = 2 + Math.random() * 8;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  cachedEarthDayTexture = new THREE.CanvasTexture(canvas);
  cachedEarthDayTexture.wrapS = THREE.RepeatWrapping;
  cachedEarthDayTexture.wrapT = THREE.ClampToEdgeWrapping;
  return cachedEarthDayTexture;
}

export function getRealisticEarthNightTexture(): THREE.CanvasTexture {
  if (cachedEarthNightTexture) return cachedEarthNightTexture;

  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#020408';
  ctx.fillRect(0, 0, width, height);

  const drawCityCluster = (lonDeg: number, latDeg: number, radiusKm: number, intensity: number) => {
    const [cx, cy] = geoToCanvas(lonDeg, latDeg, width, height);
    const r = Math.max(2, (radiusKm / 40000) * width * 1.8);

    const radGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    radGrad.addColorStop(0, `rgba(255, 238, 170, ${intensity * 0.95})`);
    radGrad.addColorStop(0.3, `rgba(245, 158, 11, ${intensity * 0.7})`);
    radGrad.addColorStop(0.7, `rgba(217, 119, 6, ${intensity * 0.3})`);
    radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = radGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  };

  const europeCities: [number, number, number, number][] = [
    [-0.1, 51.5, 450, 0.95],
    [2.35, 48.85, 420, 0.95],
    [6.9, 51.2, 500, 0.98],
    [4.9, 52.3, 350, 0.9],
    [9.2, 45.46, 380, 0.9],
    [-3.7, 40.4, 300, 0.85],
    [13.4, 52.5, 320, 0.85],
    [21.0, 52.2, 280, 0.75],
    [37.6, 55.75, 450, 0.9]
  ];
  europeCities.forEach(([lon, lat, r, int]) => drawCityCluster(lon, lat, r, int));

  const naCities: [number, number, number, number][] = [
    [-74.0, 40.7, 550, 0.98],
    [-87.6, 41.88, 420, 0.95],
    [-118.2, 34.05, 520, 0.95],
    [-122.4, 37.77, 400, 0.92],
    [-95.3, 29.76, 380, 0.85],
    [-96.8, 32.78, 360, 0.85],
    [-84.3, 33.75, 340, 0.8],
    [-80.2, 25.76, 320, 0.85],
    [-123.1, 49.28, 280, 0.75],
    [-99.1, 19.43, 480, 0.95]
  ];
  naCities.forEach(([lon, lat, r, int]) => drawCityCluster(lon, lat, r, int));

  const asiaCities: [number, number, number, number][] = [
    [139.7, 35.68, 650, 1.0],
    [121.47, 31.23, 600, 1.0],
    [116.4, 39.9, 580, 0.98],
    [113.2, 23.1, 620, 1.0],
    [126.97, 37.56, 520, 0.95],
    [77.2, 28.6, 580, 0.95],
    [72.87, 19.07, 520, 0.95],
    [77.59, 12.97, 420, 0.9],
    [88.36, 22.57, 400, 0.85],
    [80.27, 13.08, 360, 0.85],
    [100.5, 13.75, 420, 0.88],
    [106.8, -6.2, 450, 0.9],
    [103.8, 1.35, 300, 0.95],
    [31.2, 30.0, 480, 0.92]
  ];
  asiaCities.forEach(([lon, lat, r, int]) => drawCityCluster(lon, lat, r, int));

  const otherCities: [number, number, number, number][] = [
    [-46.6, -23.55, 520, 0.95],
    [-43.17, -22.9, 450, 0.9],
    [-58.38, -34.6, 450, 0.9],
    [-70.66, -33.45, 350, 0.8],
    [28.04, -26.2, 380, 0.85],
    [151.2, -33.86, 380, 0.85],
    [144.96, -37.81, 350, 0.8]
  ];
  otherCities.forEach(([lon, lat, r, int]) => drawCityCluster(lon, lat, r, int));

  ctx.strokeStyle = 'rgba(245, 158, 11, 0.2)';
  ctx.lineWidth = 1.2;
  const filaments: [number, number, number, number][] = [
    [-74, 40.7, -87.6, 41.88],
    [-87.6, 41.88, -96.8, 32.78],
    [-96.8, 32.78, -95.3, 29.76],
    [-118.2, 34.05, -122.4, 37.77],
    [-0.1, 51.5, 2.35, 48.85],
    [2.35, 48.85, 6.9, 51.2],
    [6.9, 51.2, 13.4, 52.5],
    [77.2, 28.6, 88.36, 22.57],
    [77.2, 28.6, 72.87, 19.07],
    [72.87, 19.07, 77.59, 12.97],
    [116.4, 39.9, 121.47, 31.23]
  ];
  filaments.forEach(([lon1, lat1, lon2, lat2]) => {
    const [x1, y1] = geoToCanvas(lon1, lat1, width, height);
    const [x2, y2] = geoToCanvas(lon2, lat2, width, height);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });

  cachedEarthNightTexture = new THREE.CanvasTexture(canvas);
  cachedEarthNightTexture.wrapS = THREE.RepeatWrapping;
  cachedEarthNightTexture.wrapT = THREE.ClampToEdgeWrapping;
  return cachedEarthNightTexture;
}

export function getRealisticEarthSpecularTexture(): THREE.CanvasTexture {
  if (cachedEarthSpecularTexture) return cachedEarthSpecularTexture;

  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const landmassMasks = [
    [[-168, 65], [-120, 68], [-60, 52], [-76, 35], [-84, 10], [-105, 20], [-130, 54], [-168, 65]],
    [[-77, 8], [-35, -7], [-53, -33], [-68, -53], [-75, -45], [-80, -3], [-77, 8]],
    [[-9, 39], [25, 71], [110, 74], [178, 65], [140, 50], [106, 12], [78, 8], [44, 28], [-9, 39]],
    [[-17, 15], [-5, 36], [32, 31], [51, 10], [28, -33], [12, -18], [-17, 15]],
    [[113, -22], [142, -38], [153, -28], [130, -16], [113, -22]]
  ];

  landmassMasks.forEach(poly => {
    drawGeoPolygon(ctx, poly as [number, number][], width, height, '#080808');
  });

  cachedEarthSpecularTexture = new THREE.CanvasTexture(canvas);
  return cachedEarthSpecularTexture;
}

export function getRealisticEarthCloudsTexture(): THREE.CanvasTexture {
  if (cachedEarthCloudsTexture) return cachedEarthCloudsTexture;

  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, width, height);

  const drawCloudlet = (cx: number, cy: number, rx: number, ry: number, angle: number, opacity: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, ry));
    grad.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
    grad.addColorStop(0.5, `rgba(240, 248, 255, ${opacity * 0.6})`);
    grad.addColorStop(0.85, `rgba(220, 235, 250, ${opacity * 0.2})`);
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const drawCyclonicStorm = (lonDeg: number, latDeg: number, radiusKm: number) => {
    const [cx, cy] = geoToCanvas(lonDeg, latDeg, width, height);
    const baseR = (radiusKm / 40000) * width;
    for (let arm = 0; arm < 3; arm++) {
      const armOffset = (arm / 3) * Math.PI * 2;
      for (let s = 0; s < 18; s++) {
        const t = s / 18;
        const theta = armOffset + t * Math.PI * 2.8;
        const r = (0.2 + t * 0.8) * baseR;
        const px = cx + Math.cos(theta) * r;
        const py = cy + Math.sin(theta) * r * 0.7;
        drawCloudlet(px, py, 12 + t * 24, 6 + t * 14, theta + 0.5, 0.45 - t * 0.2);
      }
    }
    drawCloudlet(cx, cy, 18, 14, 0, 0.65);
  };

  for (let lon = -180; lon <= 180; lon += 6) {
    const lat = 2 + Math.sin((lon / 180) * Math.PI * 3) * 6;
    const [x, y] = geoToCanvas(lon, lat, width, height);
    drawCloudlet(x, y, 45 + Math.random() * 35, 14 + Math.random() * 12, (Math.random() - 0.5) * 0.2, 0.45);
  }

  for (let lon = -180; lon <= 180; lon += 12) {
    const nLat = 48 + Math.cos((lon / 180) * Math.PI * 4) * 12;
    const [nx, ny] = geoToCanvas(lon, nLat, width, height);
    drawCloudlet(nx, ny, 60 + Math.random() * 40, 18 + Math.random() * 15, 0.25, 0.42);

    const sLat = -50 + Math.sin((lon / 180) * Math.PI * 4) * 8;
    const [sx, sy] = geoToCanvas(lon, sLat, width, height);
    drawCloudlet(sx, sy, 70 + Math.random() * 45, 16 + Math.random() * 12, -0.2, 0.48);
  }

  drawCyclonicStorm(-45, 38, 1200);
  drawCyclonicStorm(148, 22, 1400);
  drawCyclonicStorm(90, 16, 1100);
  drawCyclonicStorm(-110, -32, 1300);

  cachedEarthCloudsTexture = new THREE.CanvasTexture(canvas);
  cachedEarthCloudsTexture.wrapS = THREE.RepeatWrapping;
  cachedEarthCloudsTexture.wrapT = THREE.ClampToEdgeWrapping;
  return cachedEarthCloudsTexture;
}

export function createRealisticEarthShaderMaterial(sunDirectionUniform: THREE.Vector3): THREE.ShaderMaterial {
  const dayTex = getRealisticEarthDayTexture();
  const nightTex = getRealisticEarthNightTexture();
  const specTex = getRealisticEarthSpecularTexture();

  const vertexShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec3 vViewDirection;

    void main() {
      vUv = uv;
      vNormal = normalize(mat3(modelMatrix) * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      vViewDirection = normalize(cameraPosition - worldPos.xyz);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform sampler2D uDayTexture;
    uniform sampler2D uNightTexture;
    uniform sampler2D uSpecularTexture;
    uniform vec3 uSunDirection;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec3 vViewDirection;

    void main() {
      vec3 dayColor = texture2D(uDayTexture, vUv).rgb;
      vec3 nightColor = texture2D(uNightTexture, vUv).rgb;
      float specMask = texture2D(uSpecularTexture, vUv).r;

      // Surface normal & Sun direction in world space
      float NdotL = dot(vNormal, normalize(uSunDirection));

      // Smooth day-to-night terminator transition
      float dayFactor = smoothstep(-0.10, 0.20, NdotL);

      // Specular ocean reflection on sunlit water in world space
      vec3 lightDir = normalize(uSunDirection);
      vec3 halfVector = normalize(lightDir + vViewDirection);
      float NdotH = max(0.0, dot(vNormal, halfVector));
      float specular = pow(NdotH, 36.0) * specMask * dayFactor * 0.95;
      vec3 specularColor = vec3(1.0, 0.96, 0.88) * specular;

      // Subtle warm twilight glow along the terminator
      float terminatorGlow = smoothstep(-0.02, 0.12, NdotL) * smoothstep(0.24, 0.08, NdotL);
      vec3 twilightColor = vec3(0.85, 0.48, 0.18) * terminatorGlow * 0.38;

      // Subtle planetary limb darkening for realistic spherical depth
      float viewDot = clamp(dot(vNormal, vViewDirection), 0.0, 1.0);
      float limbDarkening = 0.84 + 0.16 * pow(viewDot, 0.45);

      // Dark unlit side maintains astronomical deep tone with glowing city lights
      vec3 nightSide = nightColor * (1.0 - dayFactor) * 2.4 + dayColor * 0.035;
      vec3 daySide = dayColor * (0.85 + 0.35 * max(0.0, NdotL)) * limbDarkening;

      // Subtle atmospheric ocean horizon scatter
      float horizonScatter = pow(1.0 - viewDot, 2.8) * dayFactor * 0.28;
      vec3 scatterColor = vec3(0.18, 0.52, 0.88) * horizonScatter;

      vec3 finalColor = mix(nightSide, daySide, dayFactor) + specularColor + twilightColor + scatterColor;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  return new THREE.ShaderMaterial({
    uniforms: {
      uDayTexture: { value: dayTex },
      uNightTexture: { value: nightTex },
      uSpecularTexture: { value: specTex },
      uSunDirection: { value: sunDirectionUniform }
    },
    vertexShader,
    fragmentShader,
    roughness: 0.5,
    metalness: 0.1
  } as THREE.ShaderMaterialParameters);
}

export function createRealisticAtmosphereMesh(radius: number, sunDirectionUniform: THREE.Vector3): THREE.Mesh {
  const atmoGeo = new THREE.SphereGeometry(radius * 1.022, 64, 64);

  const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vViewDirection;
    varying vec3 vWorldPosition;

    void main() {
      vNormal = normalize(mat3(modelMatrix) * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      vViewDirection = normalize(cameraPosition - worldPos.xyz);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform vec3 uSunDirection;
    varying vec3 vNormal;
    varying vec3 vViewDirection;
    varying vec3 vWorldPosition;

    void main() {
      // Fresnel limb factor: strongest at tangential viewing angles
      float viewDot = clamp(dot(vNormal, vViewDirection), 0.0, 1.0);
      float fresnel = pow(1.0 - viewDot, 4.2);

      // Sunlight interaction: atmosphere glows intensely where sunlit, dims on night limb
      float sunDot = dot(vNormal, normalize(uSunDirection));
      float sunFacing = smoothstep(-0.2, 0.45, sunDot);

      // Rayleigh blue spectrum with thin turquoise-white inner rim
      vec3 outerRayleigh = vec3(0.24, 0.62, 0.98); // Deep stratospheric blue
      vec3 innerAerosol = vec3(0.68, 0.90, 1.0);  // Bright limb aerosol tint
      vec3 atmoColor = mix(outerRayleigh, innerAerosol, pow(fresnel, 2.0));

      // Final opacity: thin, non-intrusive, authentic limb
      float alpha = fresnel * (0.12 + 0.88 * sunFacing) * 0.88;

      gl_FragColor = vec4(atmoColor, alpha);
    }
  `;

  const atmoMat = new THREE.ShaderMaterial({
    uniforms: {
      uSunDirection: { value: sunDirectionUniform }
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    depthWrite: false
  });

  return new THREE.Mesh(atmoGeo, atmoMat);
}

export function createRealisticCloudMesh(radius: number): THREE.Mesh {
  const cloudsTex = getRealisticEarthCloudsTexture();
  const cloudGeo = new THREE.SphereGeometry(radius * 1.012, 64, 64);
  const cloudMat = new THREE.MeshStandardMaterial({
    map: cloudsTex,
    transparent: true,
    opacity: 0.55,
    roughness: 0.9,
    metalness: 0.05,
    blending: THREE.NormalBlending,
    depthWrite: false
  });
  return new THREE.Mesh(cloudGeo, cloudMat);
}
