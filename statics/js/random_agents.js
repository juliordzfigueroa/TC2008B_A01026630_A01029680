/*
 * Base program for a 3D scene that connects to an API to get the movement of the city simulation.
 *
 * Jin Sik Yoon A01026630
 * Julio César Rodríguez Figueroa A01029680
 * 
 * 03/12/2025
 */

'use strict';

import * as twgl from 'twgl-base.js';
import GUI from 'lil-gui';
import { M4 } from './libs/3d-lib.js';
import { Scene3D } from './libs/scene3d.js';
import { Object3D } from './libs/object3d.js';
import { Camera3D } from './libs/camera3d.js';
import { loadMtl } from './libs/obj_loader.js';

import {
  cars, obstacles, trafficLights, destinations, roads, 
  initAgentsModel, update, getCars, getObstacles,
  getTrafficLights, getDestinations, getRoads
} from './libs/api_connection.js';

// Shaders used in the program
import vsGLSL from './shaders/vs_phong_302.glsl?raw';
import fsGLSL from './shaders/fs_phong_302.glsl?raw';

// Lists form the models used in the simulation
import { BUILDING_MODELS, CAR_MODEL, WHEEL_MODEL, WHEEL_TEXTURE_PATH, ROAD_TEXTURE_PATH } from './libs/lists.js';

const scene = new Scene3D();

// Global variables
let colorProgramInfo = undefined;
let gl = undefined;
const duration = 1000; // ms
let elapsed = 0;
let then = 0;
const EPS = 0.0001; // Small epsilon to avoid division by zero when used in interpolations

// 3D objects control variables
const BUILDING_HEIGHT_CELLS = 6; // Height of buildings in cells

const BUILDING_GLOBAL_SCALE = 1.0; // Global scale factor for buildings

const CAR_GLOBAL_SCALE = 0.7; // Global scale factor for cars

const maxBuildings = 320; // Maximum number of buildings to place

// For the traffic light lights in the simulation and their illumination effect
const MAX_TRAFFIC_LIGHTS = 16;
let activeTraffcLightsPositions = new Float32Array(MAX_TRAFFIC_LIGHTS * 3); // x, y, z for each light
let activeTraffcLightsColors = new Float32Array(MAX_TRAFFIC_LIGHTS * 3); // r, g, b for each light
let activeTrafficLightCount = 0;
const TRAFFIC_LIGHT_MAX_RADIUS = 8.0;

// Textures paths
let buildingMeshes = {}; // To store building meshes loaded from files
let carMesh = null; // To store car mesh loaded from file
let carTemplate = null; // Template for car objects
let wheelMesh = null; // To store wheel mesh loaded from file
let wheelTemplate = null; // Template for wheel objects
let wheelTexture = null; // Texture for wheels
let roadTexture = null; // Texture for roads

// Variable for the scene settings
const settings = {
    camDistance: 10,
    camAzimuth: 4,
    camElevation: 0.8,
    trafficIntensity: 0.6,
    sceneBrightness: 1.0,
};

// Function to update the camera parameters from the settings with the UI
function updateCamera() {
  const cam = scene.camera;
  if (!cam) return;

  cam.distance  = settings.camDistance;
  cam.azimuth   = settings.camAzimuth;
  cam.elevation = settings.camElevation;
}

// Main function is async to be able to make the requests
async function main() {
  // Setup the canvas area
  const canvas = document.querySelector('canvas');
  gl = canvas.getContext('webgl2');
  twgl.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  // Prepare the program with the shaders
  colorProgramInfo = twgl.createProgramInfo(gl, [vsGLSL, fsGLSL]);

  // Prepares the buildings models
  buildingMeshes = {};
  for (const model of BUILDING_MODELS) {
    // Load MTL and register materials (Kd, Ns, etc.)
    const [mtlRes, objRes] = await Promise.all([
      fetch(model.mtl),
      fetch(model.path),
    ]);

    const mtlText = await mtlRes.text();
    loadMtl(mtlText);

    const objText = await objRes.text();
    buildingMeshes[model.id] = objText;
  }

  // Load car model
  const [carMtlRes, carObjRes] = await Promise.all([
    fetch(CAR_MODEL.mtl),
    fetch(CAR_MODEL.path),
  ]);

  const carMtlText = await carMtlRes.text();
  loadMtl(carMtlText);

  const carObjText = await carObjRes.text();
  carMesh = carObjText;

  // Load wheel model
  const [wheelMtlRes, wheelObjRes] = await Promise.all([
    fetch(WHEEL_MODEL.mtl),
    fetch(WHEEL_MODEL.path),
  ]); 
  const wheelMtlText = await wheelMtlRes.text();
  loadMtl(wheelMtlText);

  const wheelObjText = await wheelObjRes.text();
  wheelMesh = wheelObjText;

  // Load wheel texture
  wheelTexture = twgl.createTexture(gl, {
    src: WHEEL_TEXTURE_PATH,
    flipY: true,
  });

  // Load road texture
  roadTexture = twgl.createTexture(gl, {
    src: ROAD_TEXTURE_PATH,
    flipY: true,
  });

  // Initialize the agents model
  await initAgentsModel();

  // Get the agents and obstacles, traffic lights, destinations and roads from the server
  await getCars();
  await getObstacles();
  await getTrafficLights();
  await getDestinations();
  await getRoads();
  
  // Initialize the scene
  setupScene();

  // Position the objects in the scene
  setupObjects(scene, gl, colorProgramInfo);

  // Prepare the user interface
  setupUI();

  // Fisrt call to the drawing loop
  drawScene();
}



function setupScene() {
  let camera = new Camera3D(
    0,
    settings.camDistance, // Distance to target
    settings.camAzimuth, // Azimut
    settings.camElevation, // Elevation
    [0, 0, 10],
    [0, 0, 0]);
  // These values are empyrical.
  // Maybe find a better way to determine them
  camera.panOffset = [0, 8, 0];
  scene.setCamera(camera);
  scene.camera.setupControls();
  // Updates the camera when is updated from the UI
  updateCamera();
}

function setupObjects(scene, gl, programInfo) {
  // Create VAOs for the different shapes
  const baseCube = new Object3D(-1);
  baseCube.prepareVAO(gl, programInfo);

  // Prepare car template
  if (carMesh) {
    carTemplate = new Object3D(-1);
    carTemplate.prepareVAO(gl, programInfo, carMesh);
  } else {
    carTemplate = baseCube;
  }

  // Prepare wheel template
  if (wheelMesh) {
    wheelTemplate = new Object3D(-1);
    wheelTemplate.prepareVAO(gl, programInfo, wheelMesh);
  } else {
    wheelTemplate = baseCube;
  }

  // Prepare building templates

  const buildingTemplates = {};
  for (const modelInfo of BUILDING_MODELS) {
    const objText = buildingMeshes[modelInfo.id];
    if (!objText) continue;

    const template = new Object3D(-1);
    template.prepareVAO(gl, programInfo, objText);
    buildingTemplates[modelInfo.id] = template;
  }
  
  // Add the agents to the scene

  // Roads

  for (const road of roads){
    road.arrays = baseCube.arrays;
    road.bufferInfo = baseCube.bufferInfo;
    road.vao = baseCube.vao;
    road.scale = { x: 0.5, y: 0.5, z: 0.5 };
    road.material = 'ground';
    road.isRoad = true;
    road.texture = roadTexture;
    road.color = [1.0, 1.0, 1.0, 1.0]; // White color for the roads
    scene.addObject(road);
  }

  // Traffic Lights

  for (const light of trafficLights){
    if (light.id.toString().endsWith("tile")) { // Asure that the end of the id of the object is "tile" to indicate it is the base of the traffic light
      light.arrays = baseCube.arrays;
      light.bufferInfo = baseCube.bufferInfo;
      light.vao = baseCube.vao;
      light.scale = { x: 0.5, y: 0.5, z: 0.5 };
      light.color = [0.7, 0.7, 0.7, 1.0]; // Gray for the tile
      scene.addObject(light);
    } else {
      light.arrays = baseCube.arrays;
      light.bufferInfo = baseCube.bufferInfo;
      light.vao = baseCube.vao;
      light.scale = { x: 0.1, y: 0.15, z: 0.1 }; 
      light.isTrafficLight = true; // Flag to identify traffic lights
      scene.addObject(light);
    }
  }

  // Destinations

  for (const dest of destinations){
    dest.arrays = baseCube.arrays;
    dest.bufferInfo = baseCube.bufferInfo;
    dest.vao = baseCube.vao;
    dest.scale = { x: 0.5, y: 0.5, z: 0.5 };
    dest.material = 'ground';
    scene.addObject(dest);
  }

  // Obstacles
  for (const obstacle of obstacles) {
    obstacle.arrays = baseCube.arrays;
    obstacle.bufferInfo = baseCube.bufferInfo;
    obstacle.vao = baseCube.vao;
    obstacle.scale = { x: 0.5, y: 0.5, z: 0.5 };
    obstacle.color = [0.7, 0.7, 0.7, 1.0];
    obstacle.material = 'ground';
    scene.addObject(obstacle);
  }

  // We use the obstacles and destinations to place buildings models
  const buildingCells = [...obstacles, ...destinations];

  // Shuffle the buildingCells array to randomize building placement

  for (let i = buildingCells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [buildingCells[i], buildingCells[j]] = [buildingCells[j], buildingCells[i]];
  }

  let buildingCount = 0; // Count of buildings placed
  const cellsWithBuilding = new Set();

  for (const cell of buildingCells) {
    // Limit the amount of buildings placed
    if (buildingCount >= maxBuildings) break;

    // Also, randomly skip some cells
    if (Math.random() > 0.5) continue;
    const [x, y, z] = cell.posArray;

    // Choose a random building model
    const modelInfo = BUILDING_MODELS[Math.floor(Math.random() * BUILDING_MODELS.length)];
    const template = buildingTemplates[modelInfo.id];
    if (!template) continue; // in case something went wrong creating the template

    // Create a new Object3D for the building in this cell
    const building = new Object3D(cell.id + 'building', [x, y, z]);

    // Reuse VAO and buffers from the template
    building.arrays = template.arrays;
    building.bufferInfo = template.bufferInfo;
    building.vao = template.vao;

    building.isBuilding = true;

    // Scale so that the building base occupies ≈ 1×1 cells
    const scaleX = (1.0 / modelInfo.width)  * BUILDING_GLOBAL_SCALE;
    const scaleZ = (1.0 / modelInfo.depth)  * BUILDING_GLOBAL_SCALE;
    const scaleY = (BUILDING_HEIGHT_CELLS / modelInfo.height) * BUILDING_GLOBAL_SCALE;

    building.scale = {
      x: scaleX,
      y: scaleY,
      z: scaleZ,
    };

    // White color for the buildings, changed with fragment shader if there is a mtl file
    building.color = [1.0, 1.0, 1.0, 1.0];
    scene.addObject(building);
    buildingCount++;

    // Mark this cell as having a building
    cellsWithBuilding.add(cell);
  }

  // For the rest of the buildings places that are free, and are obstacles, change their color to green
  for (const obstacle of obstacles) {
    if (!scene.objects.includes(obstacle)) continue; // Skip if not in scene
    obstacle.color = [0.2, 0.6, 0.2, 1.0]; // Green color
  }
  // Synchronize car objects with the cars array
  syncCarObjects();
}

// Function to update the active traffic lights arrays for the shader for the lights effect
function updateTrafficLights() { 
  const camPos = scene.camera.posArray;
  const candidates = [];

  for (const light of trafficLights) {
    if (light.id.toString().endsWith("tile")) continue; // Skip tiles
    if (!light.posArray) continue;

    const p = light.posArray;;
    const dx = p[0] - camPos[0];
    const dy = p[1] - camPos[1];
    const dz = p[2] - camPos[2];
    const distSq = dx * dx + dy * dy + dz * dz;

    candidates.push({ light, distSq });
  }

  // Sort the traffic lights by their distance
  candidates.sort((a, b) => a.distSq - b.distSq);

  activeTrafficLightCount = Math.min(candidates.length, MAX_TRAFFIC_LIGHTS); // Number of active traffic lights

  const intensity = settings.trafficIntensity ?? 1.0; // Intensity from settings, showing how brighter the traffic lights are

  for (let i = 0; i < activeTrafficLightCount; i++) {
    const light = candidates[i].light; // Current traffic light
    const p = light.posArray; // Position of the traffic light

    const c = light.color; // Color of the traffic light

    const idx = i * 3; // Index in the arrays for this traffic light, Based on 3 components per light and position in the simulation

    activeTraffcLightsPositions[idx] = p[0];
    activeTraffcLightsPositions[idx + 1] = p[1];
    activeTraffcLightsPositions[idx + 2] = p[2];

    activeTraffcLightsColors[idx] = c[0] * intensity;
    activeTraffcLightsColors[idx + 1] = c[1] * intensity;
    activeTraffcLightsColors[idx + 2] = c[2] * intensity;
  }
}

// Function to convert direction vector to angle in radians around Z and X axis
function directionToAngleY(dir) {
  if (typeof dir === 'string') { // Using typeof to avoid issues with undefined, and to extract the value
    switch (dir) {
      case 'Down': // +Z
        return Math.PI;
      case 'Up': // -Z
        return 0.0;
      case 'Right': // +X
        return Math.PI * 0.5;
      case 'Left': // -X
        return -Math.PI * 0.5;
      default:
        return 0.0;
    }
  }
  return 0.0;
}

// Linear interpolation between two angles a and b by factor t in between 0 and 1
function lerpAngle(a, b, t) {
  let diff = b - a; // Difference between angles
  while (diff < -Math.PI) diff += 2 * Math.PI; // Wrap around
  while (diff > Math.PI) diff -= 2 * Math.PI;
  return a + diff * t; // Interpolated angle
}

// Function to synchronize car objects in the scene with the cars array in the API connection
function syncCarObjects() {
  if (carTemplate === null) return; // Ensure the car template is available

  const aliveCars = new Set(cars.map(car => car.id));

  // Remove cars that have reached their destination
  scene.objects = scene.objects.filter(obj => {
    if (!obj.isCar) return true; // If an object is not a car, keep it 
    return aliveCars.has(obj.id); // Keep only cars that haven't get to their destination
  });

  // Remove the wheels of removed cars
  scene.objects = scene.objects.filter(obj => {
    if (!obj.isWheel) return true; // If an object is not a wheel, keep it
    return aliveCars.has(obj.parentCar.id); // Keep only wheels of cars that haven't get to their destination
  });

  for (const car of cars) {
    // Create or update Object3D for each car
    car.arrays = carTemplate.arrays;
    car.bufferInfo = carTemplate.bufferInfo;
    car.vao = carTemplate.vao;

    // Scale the car model appropriately
    const baseXZ = (1.0 / CAR_MODEL.depth) * CAR_GLOBAL_SCALE; // base scale for X and Z
    
    car.scale = {
      x: baseXZ,
      y: (1.0 / CAR_MODEL.height) * CAR_GLOBAL_SCALE,
      z: baseXZ,
    };

    car.color = [1.0, 1.0, 1.0, 1.0]; // White color for loading correctly the texture of the material
    car.isCar = true;
    car.isBuilding = true; // To use building shader features

    if (!car.serverPos || !car.oldServerPos) {
      const p = car.posArray || [0, 0, 0];
      car.serverPos = [...p];
      car.oldServerPos = [...p];
    }

    // Assign wheel template to car wheels
    if (!car.wheels) {
      car.wheels = [];

      // Dimensons of the car in world coordinates
      const carWidthWorld  = CAR_MODEL.width  * car.scale.x;
      const carLengthWorld = CAR_MODEL.depth  * car.scale.z;
      const carHeightWorld = CAR_MODEL.height * car.scale.y;

      const SIDE_FACTOR   = 0.45;  // From center to side
      const FRONT_FACTOR  = 0.45;  // From center to front
      const HEIGHT_FACTOR = 0.25;  // Height from the base of the car

      const sideOffset = carWidthWorld * SIDE_FACTOR;
      const frontOffset = carLengthWorld * FRONT_FACTOR;
      const wheelHeight = carHeightWorld * HEIGHT_FACTOR;

      const wheelOffsets = [ // Adjusted manually to fit the car model
        {name: 'front_left',  offset: [-sideOffset + 0.04, wheelHeight + 0.38, -frontOffset + 0.09]},
        {name: 'front_right', offset: [sideOffset - 0.04, wheelHeight + 0.38, -frontOffset + 0.09]},
        {name: 'rear_left',   offset: [-sideOffset + 0.04, wheelHeight + 0.38, frontOffset - 0.09]},
        {name: 'rear_right',  offset: [sideOffset - 0.04, wheelHeight + 0.38, frontOffset - 0.09]},
      ];

      for (const wheelOffset of wheelOffsets) {
        const wheel = new Object3D(-1);
        
        if (wheelTemplate) {
          wheel.arrays = wheelTemplate.arrays;
          wheel.bufferInfo = wheelTemplate.bufferInfo;
          wheel.vao = wheelTemplate.vao;
        } else {
          wheel.arrays = carTemplate.arrays;
          wheel.bufferInfo = carTemplate.bufferInfo;
          wheel.vao = carTemplate.vao;
        }

        wheel.isWheel = true;
        wheel.parentCar = car;
        wheel.localOffset = wheelOffset.offset;

        // Calculate wheel dimensions based on car dimensions
        const wheelRadiusWorld = carHeightWorld * 0.15;
        const wheelThicknessWorld = carWidthWorld * 0.3;

        // Scale the wheel acording to the car dimensions
        wheel.scale = {
          x: wheelThicknessWorld,
          y: wheelRadiusWorld,
          z: wheelRadiusWorld,
        };

        // Texture
        wheel.texture = wheelTexture;

        wheel.color = [0.92, 0.92, 0.92, 1.0]; // Light gray for the wheels
        car.wheels.push(wheel);
        scene.addObject(wheel);
      }
    }
    
    // For the starting position, set the target angle based on the direction of the street
    if (car.targetAngleY === undefined || car.oldAngle === undefined) {
      const basePos = car.posArray || car.serverPos;
      if (basePos){
        const roadHere = roads.find(r => 
          Math.round(r.posArray[0]) === Math.round(basePos[0]) &&
          Math.round(r.posArray[2]) === Math.round(basePos[2])
        );

        if (roadHere && roadHere.direction !== undefined) {
          const initAngle = directionToAngleY(roadHere.direction);
          car.oldAngle = initAngle;
          car.targetAngleY = initAngle;
          car.rotRad.y = initAngle;
          car.turning = false;
        }
      }
    }

    // Find the road under the car to get its direction and rotate the car accordingly, using previous and target positions for smooth rotation
    if (car.oldServerPos && car.serverPos) {
      // Find the road corresponding to the old and new positions
      const dx = car.serverPos[0] - car.oldServerPos[0];
      const dz = car.serverPos[2] - car.oldServerPos[2];

      const lenSq = dx * dx + dz * dz; // Length squared of the movement vector

      if (lenSq > EPS) {
        const newAngle = Math.atan2(dx, dz); // Angle in radians

        // Set the angle for the rotation interpolation
        if (car.targetAngleY === undefined || car.oldAngle === undefined) { // If the direction is not set yet
          car.oldAngle = newAngle;
          car.targetAngleY = newAngle;
          car.rotRad.y = newAngle;
          car.turning = false; // Flag to indicate if the car is turning
        } else if (car.targetAngleY !== newAngle) { // Only turn if the direction has changed
          car.oldAngle = car.targetAngleY;
          car.targetAngleY = newAngle;
          car.turning = true; // Flag to indicate if the car is turning
        }
      }
    }
    // Add the car to the scene if not already present
    if (!scene.objects.includes(car)) {
      scene.addObject(car);
    }
  }
}

// Draw an object with its corresponding transformations
function drawObject(gl, programInfo, object, viewProjectionMatrix, fract) {
  // Prepare the vector for translation and scale
  let v3_tra;

  if (object.isCar && object.oldServerPos) {
    const a = object.oldServerPos || object.serverPos; // Previous position 
    const b = object.serverPos; // New position
    let t = fract; // Goes from 0 to 1 between updates

    const carInterpPos = [
      a[0] + (b[0] - a[0]) * t,
      1, 
      a[2] + (b[2] - a[2]) * t,
    ];

    object.currentInterpPos = carInterpPos;

    object.setPosition(carInterpPos);
      
    v3_tra = [carInterpPos[0], carInterpPos[1], carInterpPos[2]];
    // Interpolate rotation
    if (object.turning && object.targetAngleY !== undefined && object.oldAngle !== undefined) {
      const t = fract;
      object.rotRad.y = lerpAngle(object.oldAngle, object.targetAngleY, t);

      if (t >= 0.999) {
        object.oldAngle = object.targetAngleY;
        object.rotRad.y = object.targetAngleY;
        object.turning = false; // Reset turning flag when interpolation is complete
      }
    } else if (object.targetAngleY !== undefined && object.oldAngle !== undefined) {
      object.rotRad.y = object.targetAngleY; 
    }

    // Update wheels positions based on interpolated car position
    if (!object.lastInterpPos) {
      object.lastInterpPos = [...carInterpPos];
      object.wheelSpin = 0;
    }

    const dx = carInterpPos[0] - object.lastInterpPos[0];
    const dz = carInterpPos[2] - object.lastInterpPos[2];
    const dist = Math.sqrt(dx * dx + dz * dz);

    const WHEEL_R = 0.3; // Approximate wheel radius in world units
    object.wheelSpin += (dist / WHEEL_R);

    object.lastInterpPos = carInterpPos; // Update last interpolated position

    v3_tra = [carInterpPos[0], carInterpPos[1] + 0.3, carInterpPos[2]];
  } else {
    // Normal case, no interpolation
    v3_tra = object.posArray;
  }

  if (object.isWheel){
    const car = object.parentCar; // Get the parent car object
    if (!car){
      v3_tra = object.posArray;
    } else {
      // Recalculate wheel position based on car position and local offset
      const carPos = car.currentInterpPos || car.posArray;

      const [lx, ly, lz] = object.localOffset; // Local offset of the wheel
      const angleY = car.rotRad.y; // Car rotation around Y axis

      const cosY = Math.cos(angleY); 
      const sinY = Math.sin(angleY);

      const offsetX = lx * cosY + lz * sinY;
      const offsetZ = -lx * sinY + lz * cosY;

      const modelCenterY = 0.5; // Assuming wheel model is centered at Y=0.5, adjusted by testing
      const wheelScaleY = object.scale ? object.scale.y : object.scaArray[1]; // Get the scale in Y
      const centerOffsetY = modelCenterY * wheelScaleY; // Calculate center offset in world units

      const worldX = carPos[0] + offsetX;
      const worldY = carPos[1] + ly - centerOffsetY; // Adjust for wheel model center
      const worldZ = carPos[2] + offsetZ;

      v3_tra = [worldX, worldY + 0.1, worldZ]; // Slightly raise the wheel to avoid z-fighting

      object.setPosition(v3_tra); // Update wheel position

      object.rotRad.y = angleY; // Rotate wheel around Y axis with the car

      object.rotRad.x = (car.wheelSpin || 0); // Rotate wheel around X axis based on wheel spin
    }
  }

  let v3_sca = object.scaArray;

  // Create the individual transform matrices
  const scaMat = M4.scale(v3_sca);
  const rotXMat = M4.rotationX(object.rotRad.x);
  const rotYMat = M4.rotationY(object.rotRad.y);
  const rotZMat = M4.rotationZ(object.rotRad.z);
  const traMat = M4.translation(v3_tra);

  // Create the composite matrix with all transformations (world matrix)
  let world = M4.identity();
  world = M4.multiply(scaMat, world);
  world = M4.multiply(rotXMat, world);
  world = M4.multiply(rotYMat, world);
  world = M4.multiply(rotZMat, world);
  world = M4.multiply(traMat, world);

  object.matrix = world;

  // World-View-Projection
  const worldViewProjection = M4.multiply(viewProjectionMatrix, world);

  // Matrix to transform normals
  const worldInverse = M4.inverse(world);

  // Determine if the object category flags for the shader, use of textures, and other specific parameters for specular, diffuse and ambient light
  const isBuilding = object.isBuilding === true;
  const isGround = object.material === 'ground';
  const isTrafficLight = object.isTrafficLight === true;
  const isWheel = object.isWheel === true;
  const isRoad = object.isRoad === true;
  const useTexture = isWheel || isRoad;

  let roadDir = [0.0, 0.0]; // Default road direction for the texture placing
  if (isRoad && object.direction) {
    const d = object.direction;
    if (d === 'Up' || d === 'Down') {
      roadDir = [1.0, 0.0]; // Z direction
    } else if (d === 'Left' || d === 'Right') {
      roadDir = [0.0, 1.0]; // X direction
    }
  }

  let trafficColor = [1.0, 0.1, 0.1, 1.0]; // Default to red
  if (isTrafficLight && object.color) {
    if (object.color.length === 4) {
      trafficColor = object.color;
    } else {
      trafficColor = [object.color[0], object.color[1], object.color[2], 1.0];
    }
  }

  // Object color
  const color = object.color;

  // Camera position
  const cameraPos = scene.camera.posArray;

  // Light position
  const lightPos = [20, 30, 20];

  // Setting ambient, diffuse and specular light properties for the simulation depending in the object type
  let ambientLight, diffuseLight, specularLight, shininess;
  if (isGround) { // For the ground plane
    ambientLight  = [1.0, 1.0, 1.0, 1.0];
    diffuseLight  = [0.2, 0.2, 0.2, 1.0]; 
    specularLight = [0.0, 0.0, 0.0, 1.0]; 
    shininess = 2.0;
  } else if (isWheel) { // For the car wheels
    ambientLight  = [0.15, 0.15, 0.15, 1.0];
    diffuseLight  = [0.5, 0.5, 0.5, 1.0];
    specularLight = [0.0, 0.0, 0.0, 1.0];
    shininess = 1.0;
  } else {
    // For buildings and other objects
    ambientLight  = [0.2, 0.2, 0.2, 1.0];
    diffuseLight  = [1.0, 1.0, 1.0, 1.0];
    specularLight = [1.0, 1.0, 1.0, 1.0];
    shininess = 20.0;
  }

  // Adjust light colors based on scene brightness
  const sceneBrightness = settings.sceneBrightness ?? 1.0;
  ambientLight = ambientLight.map(c => c * sceneBrightness);
  diffuseLight = diffuseLight.map(c => c * sceneBrightness);
  specularLight = specularLight.map(c => c * sceneBrightness);

  // Uniforms expected by the shader programs
  const uniforms = {
    // Scene
    u_lightWorldPosition: lightPos,
    u_viewWorldPosition: cameraPos,

    // Model
    u_world: world,
    u_worldInverseTransform: worldInverse,
    u_worldViewProjection: worldViewProjection,

    // Lights
    u_ambientLight:  ambientLight,
    u_diffuseLight:  diffuseLight,
    u_specularLight: specularLight,

    // Material
    u_ambientColor:  color,
    u_diffuseColor:  color,
    u_specularColor: color,

    // Textures 
    u_useTexture: useTexture,
    u_diffuseMap: object.texture || null, 

    // Flags 0 or 1 for the shader

    u_isBuilding: isBuilding ? 1 : 0,
    u_isRoad: isRoad ? 1 : 0,
    u_roadDir : roadDir,

    // Shininess
    u_shininess: shininess,

    // Traffic light specific
    u_isTrafficLight: isTrafficLight ? 1 : 0,
    u_trafficColor: trafficColor,

    // Traffic lights in the scene
    u_numTrafficLights: activeTrafficLightCount,
    u_trafficLightPositions: activeTraffcLightsPositions,
    u_trafficLightColors: activeTraffcLightsColors,
    u_trafficLightMaxRadius: TRAFFIC_LIGHT_MAX_RADIUS,
  };

  twgl.setUniforms(programInfo, uniforms);

  gl.bindVertexArray(object.vao);
  twgl.drawBufferInfo(gl, object.bufferInfo);
}

// Function to do the actual display of the objects
async function drawScene() {
  // Compute time elapsed since last frame
  let now = Date.now();
  let deltaTime = now - then;
  elapsed += deltaTime;
  let fract = Math.min(1.0, elapsed / duration);
  then = now;

  // Clear the canvas
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Tell webgl to cull faces
  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  scene.camera.checkKeys();
  updateTrafficLights();
  const viewProjectionMatrix = setupViewProjection(gl);

  // Draw the objects
  gl.useProgram(colorProgramInfo.program);
  for (let object of scene.objects) {
    drawObject(gl, colorProgramInfo, object, viewProjectionMatrix, fract);
  }

  // Update the scene after the elapsed duration
  if (elapsed >= duration) {
    elapsed = 0;
    await update();
    syncCarObjects(); // Synchronize car objects with the cars array
  }

  requestAnimationFrame(drawScene);
}

function setupViewProjection(gl) {
  // Field of view of 60 degrees vertically, in radians
  const fov = 60 * Math.PI / 180;
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;

  // Matrices for the world view
  const projectionMatrix = M4.perspective(fov, aspect, 1, 200);

  const cameraPosition = scene.camera.posArray;
  const target = scene.camera.targetArray;
  const up = [0, 1, 0];

  const cameraMatrix = M4.lookAt(cameraPosition, target, up);
  const viewMatrix = M4.inverse(cameraMatrix);
  const viewProjectionMatrix = M4.multiply(projectionMatrix, viewMatrix);

  return viewProjectionMatrix;
}

// Setup a ui for the settings of the camera and traffic lights
function setupUI() {
  const gui = new GUI();

  // Settings for the camera movement
  const camFolder = gui.addFolder('Cámara');
  camFolder
    .add(settings, 'camAzimuth', 0, Math.PI * 2, 0.01)
    .name('Azimut')
    .onChange(updateCamera);
  camFolder
    .add(settings, 'camElevation', 0.1, Math.PI / 2, 0.01)
    .name('Elevation')
    .onChange(updateCamera);
  camFolder
    .add(settings, 'camDistance', 5, 40, 0.1)
    .name('Distance')
    .onChange(updateCamera);
  
  // Settings for the traffic lights intensity
  const lightFolder = gui.addFolder('Traffic Lights');
  lightFolder
    .add(settings, 'trafficIntensity', 0.0, 2.0, 0.01)
    .name('Brightness');

  // Settings for the scene brightness
  const sceneFolder = gui.addFolder('Scene');
  sceneFolder
    .add(settings, 'sceneBrightness', 0.0, 2.0, 0.01)
    .name('Brightness');
  camFolder.close();
  lightFolder.close();
  sceneFolder.close();
}

main();
