/*
 * Base program for a 3D scene that connects to an API to get the movement of the city simulation.
 *
 * Jin Sik Yoon A01026630
 * Julio César Rodríguez Figueroa A01029680
 * 
 * 26/11/2025
 */


'use strict';

import * as twgl from 'twgl-base.js';
import GUI from 'lil-gui';
import { M4 } from './3d-lib.js';
import { Scene3D } from './scene3d.js';
import { Object3D } from './object3d.js';
import { Camera3D } from './camera3d.js';
import { loadMtl } from './obj_loader.js';

import {
  cars, obstacles, trafficLights, destinations, roads, 
  initAgentsModel, update, getCars, getObstacles,
  getTrafficLights, getDestinations, getRoads
} from './api_connection.js';

// Shaders used in the program
import vsGLSL from './shaders/vs_phong_302.glsl?raw';
import fsGLSL from './shaders/fs_phong_302.glsl?raw';

const scene = new Scene3D();

// Desired building height in "cells" (adjust as needed)
const BUILDING_HEIGHT_CELLS = 6;  // for example, 6 cells high

// List for the different building models, each one has different dimensions we will use for scaling in our model
const BUILDING_MODELS = [
  {
    id: 'b1',
    path: './models/building1.obj',
    mtl: './models/building1.mtl',
    width: 10.46,
    depth: 10.34,
    height: 22.68,
  },
  {
    id: 'b2',
    path: './models/building2.obj',
    mtl: './models/building2.mtl',
    width: 11.08,
    depth: 11.00,
    height: 38.71,
  },
  {
    id: 'b3',
    path: './models/building3.obj',
    mtl: './models/building3.mtl',
    width: 17.46,
    depth: 17.46,
    height: 37.61,
  },
  {
    id: 'b4',
    path: './models/building4.obj',
    mtl: './models/building4.mtl',
    width: 14.10,
    depth: 14.10,
    height: 55.61,
  },
];

// For free obstacles decorations
const DECORATION_SCALE = 0.5; // Global scale factor for decorations

const DECORATION_MODELS = [
  {
    id: 'dog',
    path: './models/13463_Australian_Cattle_Dog_v3.obj',
    mtl: './models/13463_Australian_Cattle_Dog_v3.mtl',
    width: 2.0,
    depth: 1.0,
    height: 1.5,
  },
];

const BUILDING_GLOBAL_SCALE = 1.0; // Global scale factor for buildings

const maxBuildings = 90; // Maximum number of buildings to place

let buildingMeshes = {};
let decorationMeshes = {};
let carTemplate = null;

/*
// Variable for the scene settings
const settings = {
    // Speed in degrees
    rotationSpeed: {
        x: 0,
        y: 0,
        z: 0,
    },
};
*/


// Global variables
let colorProgramInfo = undefined;
let gl = undefined;
const duration = 1000; // ms
let elapsed = 0;
let then = 0;

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
    loadMtl(mtlText);   // llena el diccionario global "materials" en obj_loader.js

    const objText = await objRes.text();
    buildingMeshes[model.id] = objText;
  }

  // Load decoration models if needed in future

  decorationMeshes = {};
  for (const model of DECORATION_MODELS) {
    const [mtlRes, objRes] = await Promise.all([
      fetch(model.mtl),
      fetch(model.path),
    ]);

    const mtlText = await mtlRes.text();
    loadMtl(mtlText);

    const objText = await objRes.text();
    decorationMeshes[model.id] = objText;
  }

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
  let camera = new Camera3D(0,
    10,             // Distance to target
    4,              // Azimut
    0.8,              // Elevation
    [0, 0, 10],
    [0, 0, 0]);
  // These values are empyrical.
  // Maybe find a better way to determine them
  camera.panOffset = [0, 8, 0];
  scene.setCamera(camera);
  scene.camera.setupControls();
}

function setupObjects(scene, gl, programInfo) {
  // Create VAOs for the different shapes
  const baseCube = new Object3D(-1);
  baseCube.prepareVAO(gl, programInfo);

  carTemplate = baseCube

  const buildingTemplates = {};
  for (const modelInfo of BUILDING_MODELS) {
    const objText = buildingMeshes[modelInfo.id];
    if (!objText) continue;

    const template = new Object3D(-1);
    template.prepareVAO(gl, programInfo, objText);
    buildingTemplates[modelInfo.id] = template;
  }

  /*
  // A scaled cube to use as the ground
  const ground = new Object3D(-3, [14, 0, 14]);
  ground.arrays = baseCube.arrays;
  ground.bufferInfo = baseCube.bufferInfo;
  ground.vao = baseCube.vao;
  ground.scale = {x: 50, y: 0.1, z: 50};
  ground.color = [0.6, 0.6, 0.6, 1];
  scene.addObject(ground);
  */

  // Add the agents to the scene

  // Roads

  for (const road of roads){
    road.arrays = baseCube.arrays;
    road.bufferInfo = baseCube.bufferInfo;
    road.vao = baseCube.vao;
    road.scale = { x: 0.5, y: 0.5, z: 0.5 };
    road.material = 'ground';
    scene.addObject(road);
  }

  // Traffic Lights

  for (const light of trafficLights){
    light.arrays = baseCube.arrays;
    light.bufferInfo = baseCube.bufferInfo;
    light.vao = baseCube.vao;
    light.scale = { x: 0.4, y: 0.8, z: 0.4 }; 
    light.isTrafficLight = true; // Flag to identify traffic lights
    
    scene.addObject(light);
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
  
  // Cars will be loaded next in the scene

  console.log('Total cars added:', cars.length);

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

  let buildingCount = 0;
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
    const building = new Object3D(cell.id + '_bldg', [x, y, z]);

    // Reuse VAO and buffers from the template
    building.arrays     = template.arrays;
    building.bufferInfo = template.bufferInfo;
    building.vao        = template.vao;

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

  // For the rest of the buildings places that are free, and are obstacles, change their color to greenish
  for (const obstacle of obstacles) {
    if (!scene.objects.includes(obstacle)) continue; // Skip if not in scene
    obstacle.color = [0.2, 0.6, 0.2, 1.0]; // Greenish color
  }

  

  // Log the total number of objects and buildings
  console.log('Total objects in scene:', scene.objects.length, 'buildings:', buildingCount);
  // Finally, synchronize car objects
  syncCarObjects();
}

function syncCarObjects() {
  if (carTemplate === null) return; // Ensure the car template is available

  for (const car of cars) {

    car.arrays = carTemplate.arrays;
    car.bufferInfo = carTemplate.bufferInfo;
    car.vao = carTemplate.vao;
    car.scale = { x: 0.4, y: 0.4, z: 0.8 };
    car.color = [0.0, 0.0, 1.0, 1.0]; // Blue color for cars
    car.isCar = true; // Flag to identify cars
    scene.addObject(car);
  }
}
// Draw an object with its corresponding transformations
function drawObject(gl, programInfo, object, viewProjectionMatrix, fract) {
  // Prepare the vector for translation and scale
  let v3_tra = object.posArray;
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

  // Determine if the object is a building
  const isBuilding = object.isBuilding === true;
  const isGround = object.material === 'ground';
  const isTrafficLight = object.isTrafficLight === true;

  const trafficColor = [1.0, 0.1, 0.1, 1.0]; // Default to red

  // Object color
  const color = object.color || [1.0, 1.0, 1.0, 1.0];

  // Camera position
  const cameraPos = scene.camera.posArray;

  // Light position
  const lightPos = [20, 30, 20];

  // Setting ambient, diffuse and specular light properties for the simulation depending in the material
  let ambientLight, diffuseLight, specularLight, shininess;
  if (isGround) { // For the ground plane
    ambientLight  = [1.0, 1.0, 1.0, 1.0];
    diffuseLight  = [0.2, 0.2, 0.2, 1.0]; 
    specularLight = [0.0, 0.0, 0.0, 1.0]; 
    shininess     = 2.0;
  } else {
    // For buildings and other objects
    ambientLight  = [0.2, 0.2, 0.2, 1.0];
    diffuseLight  = [1.0, 1.0, 1.0, 1.0];
    specularLight = [1.0, 1.0, 1.0, 1.0];
    shininess     = 20.0;
  }

  // Uniforms expected by the Phong shaders
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

    // Flags

    u_isBuilding: isBuilding ? 1 : 0,

    // Shininess
    u_shininess: shininess,

    // Traffic light specific
    u_isTrafficLight: isTrafficLight ? 1 : 0,
    u_trafficColor: trafficColor,
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

  // tell webgl to cull faces
  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  scene.camera.checkKeys();
  //console.log(scene.camera);
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
    syncCarObjects();
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

// Setup a ui.
function setupUI() {
  /*
  const gui = new GUI();

  // Settings for the animation
  const animFolder = gui.addFolder('Animation:');
  animFolder.add( settings.rotationSpeed, 'x', 0, 360)
      .decimals(2)
  animFolder.add( settings.rotationSpeed, 'y', 0, 360)
      .decimals(2)
  animFolder.add( settings.rotationSpeed, 'z', 0, 360)
      .decimals(2)
  */
}

main();
