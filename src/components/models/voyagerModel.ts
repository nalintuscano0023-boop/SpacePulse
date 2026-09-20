import * as THREE from 'three';

export function createVoyagerSpacecraftModel(): THREE.Group {
  const voyagerGroup = new THREE.Group();
  voyagerGroup.name = 'Voyager1_Spacecraft';

  const goldFoilMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    metalness: 0.85,
    roughness: 0.3,
    depthWrite: true,
    depthTest: true
  });

  const dishMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.25,
    roughness: 0.45,
    side: THREE.DoubleSide,
    depthWrite: true,
    depthTest: true
  });

  const titaniumMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.7,
    roughness: 0.4,
    depthWrite: true,
    depthTest: true
  });

  const darkStructureMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.5,
    roughness: 0.8,
    depthWrite: true,
    depthTest: true
  });

  const sensorMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.3,
    roughness: 0.2,
    depthWrite: true,
    depthTest: true
  });

  const goldenRecordMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.95,
    roughness: 0.15,
    depthWrite: true,
    depthTest: true
  });

  const busGeo = new THREE.CylinderGeometry(1.0, 1.0, 0.45, 10);
  const busMesh = new THREE.Mesh(busGeo, goldFoilMat);
  busMesh.castShadow = true;
  busMesh.receiveShadow = true;
  voyagerGroup.add(busMesh);

  const tankGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 16);
  const tankMesh = new THREE.Mesh(tankGeo, titaniumMat);
  tankMesh.position.y = -0.32;
  voyagerGroup.add(tankMesh);

  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const thrusterGeo = new THREE.ConeGeometry(0.06, 0.15, 8);
    const thrusterMesh = new THREE.Mesh(thrusterGeo, titaniumMat);
    thrusterMesh.position.set(Math.cos(angle) * 1.05, -0.15, Math.sin(angle) * 1.05);
    thrusterMesh.rotation.z = Math.PI;
    voyagerGroup.add(thrusterMesh);
  }

  const dishRadius = 1.85;
  const dishGeo = new THREE.SphereGeometry(
    dishRadius,
    32,
    16,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.36
  );
  const dishMesh = new THREE.Mesh(dishGeo, dishMat);
  dishMesh.position.y = 0.22;
  dishMesh.rotation.x = Math.PI;
  dishMesh.scale.set(1.0, 0.55, 1.0);
  dishMesh.castShadow = true;
  voyagerGroup.add(dishMesh);

  const hubGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.2, 16);
  const hubMesh = new THREE.Mesh(hubGeo, titaniumMat);
  hubMesh.position.y = 0.3;
  voyagerGroup.add(hubMesh);

  const strutRadius = 0.025;
  const strutHeight = 0.95;
  for (let s = 0; s < 3; s++) {
    const strutAngle = (s * Math.PI * 2) / 3;
    const strutGeo = new THREE.CylinderGeometry(strutRadius, strutRadius, strutHeight, 6);
    const strutMesh = new THREE.Mesh(strutGeo, titaniumMat);
    strutMesh.position.set(
      Math.cos(strutAngle) * 0.45,
      0.75,
      Math.sin(strutAngle) * 0.45
    );
    strutMesh.rotation.y = -strutAngle;
    strutMesh.rotation.z = 0.38;
    voyagerGroup.add(strutMesh);
  }

  const apexGeo = new THREE.ConeGeometry(0.18, 0.22, 12);
  const apexMesh = new THREE.Mesh(apexGeo, goldFoilMat);
  apexMesh.position.y = 1.25;
  apexMesh.rotation.x = Math.PI;
  voyagerGroup.add(apexMesh);

  const rtgArmGeo = new THREE.CylinderGeometry(0.04, 0.05, 2.2, 8);
  const rtgArmMesh = new THREE.Mesh(rtgArmGeo, titaniumMat);
  rtgArmMesh.position.set(-1.8, -0.05, 0);
  rtgArmMesh.rotation.z = Math.PI / 2;
  voyagerGroup.add(rtgArmMesh);

  for (let r = 0; r < 3; r++) {
    const rtgGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.52, 12);
    const rtgMesh = new THREE.Mesh(rtgGeo, darkStructureMat);
    rtgMesh.position.set(-2.4 - r * 0.35, -0.05, 0);
    rtgMesh.rotation.x = Math.PI / 2;
    voyagerGroup.add(rtgMesh);

    const finGeo = new THREE.TorusGeometry(0.18, 0.02, 6, 16);
    const finMesh = new THREE.Mesh(finGeo, titaniumMat);
    finMesh.position.set(-2.4 - r * 0.35, -0.05, 0);
    voyagerGroup.add(finMesh);
  }

  const magBoomGeo = new THREE.CylinderGeometry(0.02, 0.03, 5.2, 6);
  const magBoomMesh = new THREE.Mesh(magBoomGeo, titaniumMat);
  magBoomMesh.position.set(3.2, 0.15, -0.5);
  magBoomMesh.rotation.z = -Math.PI / 2.3;
  magBoomMesh.rotation.y = -0.15;
  voyagerGroup.add(magBoomMesh);

  const lfmGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.18, 8);
  const lfmMesh = new THREE.Mesh(lfmGeo, goldFoilMat);
  lfmMesh.position.set(2.8, 0.1, -0.45);
  voyagerGroup.add(lfmMesh);

  const hfmGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.24, 8);
  const hfmMesh = new THREE.Mesh(hfmGeo, goldFoilMat);
  hfmMesh.position.set(5.5, 0.45, -0.85);
  voyagerGroup.add(hfmMesh);

  const scanTrussGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6);
  const scanTrussMesh = new THREE.Mesh(scanTrussGeo, titaniumMat);
  scanTrussMesh.position.set(-0.6, 0.6, 1.2);
  scanTrussMesh.rotation.x = Math.PI / 3;
  scanTrussMesh.rotation.y = -0.3;
  voyagerGroup.add(scanTrussMesh);

  const platGeo = new THREE.BoxGeometry(0.55, 0.28, 0.45);
  const platMesh = new THREE.Mesh(platGeo, darkStructureMat);
  platMesh.position.set(-0.8, 1.25, 1.85);
  voyagerGroup.add(platMesh);

  const nacGeo = new THREE.CylinderGeometry(0.09, 0.12, 0.48, 12);
  const nacMesh = new THREE.Mesh(nacGeo, sensorMat);
  nacMesh.position.set(-0.65, 1.35, 2.05);
  nacMesh.rotation.x = Math.PI / 2;
  voyagerGroup.add(nacMesh);

  const wacGeo = new THREE.CylinderGeometry(0.07, 0.1, 0.28, 12);
  const wacMesh = new THREE.Mesh(wacGeo, sensorMat);
  wacMesh.position.set(-0.95, 1.35, 1.98);
  wacMesh.rotation.x = Math.PI / 2;
  voyagerGroup.add(wacMesh);

  const irisGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.35, 12);
  const irisMesh = new THREE.Mesh(irisGeo, goldFoilMat);
  irisMesh.position.set(-0.8, 1.1, 2.0);
  irisMesh.rotation.x = Math.PI / 2;
  voyagerGroup.add(irisMesh);

  const uvsGeo = new THREE.BoxGeometry(0.18, 0.15, 0.25);
  const uvsMesh = new THREE.Mesh(uvsGeo, titaniumMat);
  uvsMesh.position.set(-0.8, 1.45, 1.8);
  voyagerGroup.add(uvsMesh);

  const whipLength = 3.6;
  const whipRadius = 0.012;
  for (let w = 0; w < 2; w++) {
    const whipAngle = (w === 0 ? 1 : -1) * 0.65;
    const whipGeo = new THREE.CylinderGeometry(whipRadius, whipRadius, whipLength, 6);
    const whipMesh = new THREE.Mesh(whipGeo, titaniumMat);
    whipMesh.position.set(Math.sin(whipAngle) * (whipLength / 2), -0.4, Math.cos(whipAngle) * (whipLength / 2));
    whipMesh.rotation.y = whipAngle;
    whipMesh.rotation.z = Math.PI / 2.2;
    voyagerGroup.add(whipMesh);
  }

  const recordRadius = 0.32;
  const recordThickness = 0.015;
  const recordGeo = new THREE.CylinderGeometry(recordRadius, recordRadius, recordThickness, 32);
  const recordMesh = new THREE.Mesh(recordGeo, goldenRecordMat);
  recordMesh.position.set(0.68, 0.0, 0.72);
  recordMesh.rotation.x = Math.PI / 2;
  recordMesh.rotation.y = -Math.PI / 4;
  voyagerGroup.add(recordMesh);

  const recordRimGeo = new THREE.TorusGeometry(recordRadius + 0.015, 0.01, 8, 32);
  const recordRimMesh = new THREE.Mesh(recordRimGeo, goldFoilMat);
  recordRimMesh.position.copy(recordMesh.position);
  recordRimMesh.rotation.copy(recordMesh.rotation);
  voyagerGroup.add(recordRimMesh);

  voyagerGroup.scale.set(0.9, 0.9, 0.9);

  return voyagerGroup;
}
