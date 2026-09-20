import * as THREE from 'three';


const solarPanelMat = new THREE.MeshStandardMaterial({
  color: 0x1d4ed8,
  metalness: 0.85,
  roughness: 0.25,
  depthWrite: true,
  depthTest: true
});

const satelliteBodyMat = new THREE.MeshStandardMaterial({
  color: 0xe2e8f0,
  metalness: 0.75,
  roughness: 0.35,
  depthWrite: true,
  depthTest: true
});

const goldDishMat = new THREE.MeshStandardMaterial({
  color: 0xf59e0b,
  metalness: 0.9,
  roughness: 0.2,
  depthWrite: true,
  depthTest: true
});

const darkFrameMat = new THREE.MeshStandardMaterial({
  color: 0x0f172a,
  metalness: 0.5,
  roughness: 0.8,
  depthWrite: true,
  depthTest: true
});

export function createSatelliteModel(scale = 1.0, isStation = false): THREE.Group {
  const group = new THREE.Group();

  if (isStation) {
    const moduleGeo = new THREE.CylinderGeometry(0.25, 0.25, 1.4, 16);
    const moduleMesh = new THREE.Mesh(moduleGeo, satelliteBodyMat);
    moduleMesh.rotation.z = Math.PI / 2;
    group.add(moduleMesh);

    const nodeGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.9, 16);
    const nodeMesh = new THREE.Mesh(nodeGeo, satelliteBodyMat);
    nodeMesh.rotation.x = Math.PI / 2;
    group.add(nodeMesh);

    const trussGeo = new THREE.BoxGeometry(3.6, 0.1, 0.1);
    const trussMesh = new THREE.Mesh(trussGeo, darkFrameMat);
    trussMesh.position.y = 0.25;
    group.add(trussMesh);

    [-1.4, 1.4].forEach(xOffset => {
      [-0.45, 0.45].forEach(zOffset => {
        const wingGeo = new THREE.BoxGeometry(0.9, 0.03, 0.65);
        const wingMesh = new THREE.Mesh(wingGeo, solarPanelMat);
        wingMesh.position.set(xOffset, 0.25, zOffset);
        group.add(wingMesh);
      });
    });

    const radGeo = new THREE.BoxGeometry(0.4, 0.02, 0.5);
    const radMesh = new THREE.Mesh(radGeo, satelliteBodyMat);
    radMesh.position.set(0, -0.3, 0);
    group.add(radMesh);
  } else {
    const bodyGeo = new THREE.BoxGeometry(0.5, 0.7, 0.5);
    const bodyMesh = new THREE.Mesh(bodyGeo, satelliteBodyMat);
    group.add(bodyMesh);

    [-0.9, 0.9].forEach(xSide => {
      const boomGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.4, 6);
      const boomMesh = new THREE.Mesh(boomGeo, darkFrameMat);
      boomMesh.position.set(xSide * 0.45, 0, 0);
      boomMesh.rotation.z = Math.PI / 2;
      group.add(boomMesh);

      const wingGeo = new THREE.BoxGeometry(0.85, 0.02, 0.45);
      const wingMesh = new THREE.Mesh(wingGeo, solarPanelMat);
      wingMesh.position.set(xSide, 0, 0);
      group.add(wingMesh);
    });

    const dishGeo = new THREE.SphereGeometry(0.2, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.4);
    const dishMesh = new THREE.Mesh(dishGeo, goldDishMat);
    dishMesh.position.set(0, -0.42, 0);
    dishMesh.rotation.x = Math.PI;
    dishMesh.scale.set(1, 0.5, 1);
    group.add(dishMesh);

    const optGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.25, 12);
    const optMesh = new THREE.Mesh(optGeo, darkFrameMat);
    optMesh.position.set(0, 0.45, 0);
    group.add(optMesh);
  }

  group.scale.set(scale, scale, scale);
  return group;
}

export function createSelectionRing(radius = 1.2): THREE.Mesh {
  const ringGeo = new THREE.RingGeometry(radius * 0.85, radius, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.75
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.rotation.x = Math.PI / 2;
  return ringMesh;
}

export function createEarthAtmosphereGlow(radius: number): THREE.Mesh {
  const atmoGeo = new THREE.SphereGeometry(radius * 1.055, 48, 48);
  const atmoMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.18,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending
  });
  return new THREE.Mesh(atmoGeo, atmoMat);
}
