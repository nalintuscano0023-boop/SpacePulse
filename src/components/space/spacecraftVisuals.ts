import * as THREE from 'three';


const goldFoilMat = new THREE.MeshStandardMaterial({
  color: 0xd4af37,
  metalness: 0.88,
  roughness: 0.22,
  depthWrite: true,
  depthTest: true
});

const silverBlanketMat = new THREE.MeshStandardMaterial({
  color: 0xf1f5f9,
  metalness: 0.78,
  roughness: 0.32,
  depthWrite: true,
  depthTest: true
});

const solarCellMat = new THREE.MeshStandardMaterial({
  color: 0x172554,
  metalness: 0.92,
  roughness: 0.18,
  depthWrite: true,
  depthTest: true
});

const carbonTrussMat = new THREE.MeshStandardMaterial({
  color: 0x0f172a,
  metalness: 0.45,
  roughness: 0.75,
  depthWrite: true,
  depthTest: true
});

const highGainDishMat = new THREE.MeshStandardMaterial({
  color: 0xfbbf24,
  metalness: 0.85,
  roughness: 0.25,
  depthWrite: true,
  depthTest: true
});

const opticsApertureMat = new THREE.MeshStandardMaterial({
  color: 0x020617,
  metalness: 0.2,
  roughness: 0.15,
  depthWrite: true,
  depthTest: true
});

export function createDetailedSatelliteModel(
  scale = 1.0,
  craftType: 'station' | 'telescope' | 'observation' | 'standard' = 'standard'
): THREE.Group {
  const group = new THREE.Group();
  group.name = `SatelliteModel_${craftType}`;

  if (craftType === 'station') {
    const labGeo = new THREE.CylinderGeometry(0.28, 0.28, 1.6, 16);
    const labMesh = new THREE.Mesh(labGeo, silverBlanketMat);
    labMesh.rotation.z = Math.PI / 2;
    group.add(labMesh);

    const nodeGeo = new THREE.CylinderGeometry(0.24, 0.24, 1.1, 16);
    const nodeMesh = new THREE.Mesh(nodeGeo, silverBlanketMat);
    nodeMesh.rotation.x = Math.PI / 2;
    group.add(nodeMesh);

    const trussGeo = new THREE.BoxGeometry(4.2, 0.12, 0.12);
    const trussMesh = new THREE.Mesh(trussGeo, carbonTrussMat);
    trussMesh.position.y = 0.32;
    group.add(trussMesh);

    [-1.6, 1.6].forEach(xOffset => {
      [-0.55, 0.55].forEach(zOffset => {
        const wingGeo = new THREE.BoxGeometry(1.1, 0.02, 0.85);
        const wingMesh = new THREE.Mesh(wingGeo, solarCellMat);
        wingMesh.position.set(xOffset, 0.32, zOffset);
        group.add(wingMesh);

        const mastGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6);
        const mastMesh = new THREE.Mesh(mastGeo, carbonTrussMat);
        mastMesh.rotation.z = Math.PI / 2;
        mastMesh.position.set(xOffset > 0 ? xOffset - 0.6 : xOffset + 0.6, 0.32, zOffset);
        group.add(mastMesh);
      });
    });

    [-0.5, 0.5].forEach(xOff => {
      const radGeo = new THREE.BoxGeometry(0.45, 0.02, 0.7);
      const radMesh = new THREE.Mesh(radGeo, silverBlanketMat);
      radMesh.position.set(xOff, -0.38, 0);
      group.add(radMesh);
    });

    const dockGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.2, 12);
    const dockMesh = new THREE.Mesh(dockGeo, carbonTrussMat);
    dockMesh.position.set(0.9, 0, 0);
    dockMesh.rotation.z = Math.PI / 2;
    group.add(dockMesh);

  } else if (craftType === 'telescope') {
    const tubeGeo = new THREE.CylinderGeometry(0.32, 0.36, 1.6, 20);
    const tubeMesh = new THREE.Mesh(tubeGeo, silverBlanketMat);
    group.add(tubeMesh);

    const baffleGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.4, 20);
    const baffleMesh = new THREE.Mesh(baffleGeo, opticsApertureMat);
    baffleMesh.position.y = 0.9;
    group.add(baffleMesh);

    const doorGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.04, 16);
    const doorMesh = new THREE.Mesh(doorGeo, silverBlanketMat);
    doorMesh.position.set(0.2, 1.12, 0);
    doorMesh.rotation.z = 0.55;
    group.add(doorMesh);

    const aftGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.6, 16);
    const aftMesh = new THREE.Mesh(aftGeo, goldFoilMat);
    aftMesh.position.y = -0.65;
    group.add(aftMesh);

    [-0.9, 0.9].forEach(xSide => {
      const boomGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.45, 6);
      const boomMesh = new THREE.Mesh(boomGeo, carbonTrussMat);
      boomMesh.position.set(xSide * 0.45, -0.2, 0);
      boomMesh.rotation.z = Math.PI / 2;
      group.add(boomMesh);

      const wingGeo = new THREE.BoxGeometry(0.75, 0.02, 0.55);
      const wingMesh = new THREE.Mesh(wingGeo, solarCellMat);
      wingMesh.position.set(xSide, -0.2, 0);
      group.add(wingMesh);
    });

    const hgaGeo = new THREE.SphereGeometry(0.22, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.4);
    const hgaMesh = new THREE.Mesh(hgaGeo, highGainDishMat);
    hgaMesh.position.set(0, -0.95, 0.3);
    hgaMesh.rotation.x = Math.PI * 0.6;
    group.add(hgaMesh);

  } else {
    const busGeo = new THREE.BoxGeometry(0.55, 0.75, 0.55);
    const busMesh = new THREE.Mesh(busGeo, goldFoilMat);
    group.add(busMesh);

    [-1.0, 1.0].forEach(xSide => {
      const boomGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6);
      const boomMesh = new THREE.Mesh(boomGeo, carbonTrussMat);
      boomMesh.position.set(xSide * 0.48, 0, 0);
      boomMesh.rotation.z = Math.PI / 2;
      group.add(boomMesh);

      const wingGeo = new THREE.BoxGeometry(0.9, 0.02, 0.5);
      const wingMesh = new THREE.Mesh(wingGeo, solarCellMat);
      wingMesh.position.set(xSide * 1.05, 0, 0);
      group.add(wingMesh);
    });

    const cameraGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.35, 16);
    const cameraMesh = new THREE.Mesh(cameraGeo, carbonTrussMat);
    cameraMesh.position.set(0, -0.48, 0);
    group.add(cameraMesh);

    const apertureGeo = new THREE.CircleGeometry(0.16, 16);
    const apertureMesh = new THREE.Mesh(apertureGeo, opticsApertureMat);
    apertureMesh.position.set(0, -0.66, 0);
    apertureMesh.rotation.x = Math.PI / 2;
    group.add(apertureMesh);

    const dishGeo = new THREE.SphereGeometry(0.24, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.45);
    const dishMesh = new THREE.Mesh(dishGeo, highGainDishMat);
    dishMesh.position.set(0.32, 0.35, -0.2);
    dishMesh.rotation.x = -Math.PI * 0.35;
    dishMesh.scale.set(1, 0.45, 1);
    group.add(dishMesh);

    const starTrackerGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.15, 8);
    const starTracker = new THREE.Mesh(starTrackerGeo, opticsApertureMat);
    starTracker.position.set(-0.24, 0.42, 0.15);
    starTracker.rotation.z = 0.3;
    group.add(starTracker);
  }

  group.scale.set(scale, scale, scale);
  return group;
}

export function createScientificReticle(radius = 1.4): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Scientific_Target_Reticle';

  const ringGeo = new THREE.RingGeometry(radius * 0.94, radius, 48);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.65,
    depthWrite: false
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  group.add(ringMesh);

  const bracketGeo = new THREE.BufferGeometry();
  const bPts: THREE.Vector3[] = [];
  const bSize = radius * 0.28;
  const bDist = radius * 1.15;

  bPts.push(new THREE.Vector3(-bDist, bSize, 0), new THREE.Vector3(-bDist, -bSize, 0));
  bPts.push(new THREE.Vector3(bDist, bSize, 0), new THREE.Vector3(bDist, -bSize, 0));
  bPts.push(new THREE.Vector3(-bSize, bDist, 0), new THREE.Vector3(bSize, bDist, 0));
  bPts.push(new THREE.Vector3(-bSize, -bDist, 0), new THREE.Vector3(bSize, -bDist, 0));

  bracketGeo.setFromPoints(bPts);
  const bracketMat = new THREE.LineBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.85,
    depthWrite: false
  });
  const brackets = new THREE.LineSegments(bracketGeo, bracketMat);
  group.add(brackets);

  const arcGeo = new THREE.RingGeometry(radius * 0.65, radius * 0.72, 32, 1, 0, Math.PI * 0.75);
  const arcMat = new THREE.MeshBasicMaterial({
    color: 0x0284c7,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
    depthWrite: false
  });
  const arcMesh = new THREE.Mesh(arcGeo, arcMat);
  arcMesh.name = 'InnerScanningArc';
  group.add(arcMesh);

  return group;
}

export function createDirectionalOrbitLine(
  points: THREE.Vector3[],
  colorHex: number
): THREE.Line {
  const count = points.length;
  const geo = new THREE.BufferGeometry().setFromPoints(points);

  const colors = new Float32Array(count * 3);
  const baseColor = new THREE.Color(colorHex);

  for (let i = 0; i < count; i++) {
    const t = i / count;
    const intensity = 0.35 + (1.0 - t) * 0.65;
    colors[i * 3] = baseColor.r * intensity;
    colors[i * 3 + 1] = baseColor.g * intensity;
    colors[i * 3 + 2] = baseColor.b * intensity;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.65,
    depthWrite: false
  });

  return new THREE.Line(geo, mat);
}
