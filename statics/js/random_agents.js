/*
 * Base program for a 3D scene that connects to an API to get the movement of the city simulation.
 *
 * Jin Sik Yoon A01026630
 * Julio César Rodríguez Figueroa A01029680
 * 
 * 25/11/2025
 */


'use strict';

import * as twgl from 'twgl-base.js';
import GUI from 'lil-gui';
import { M4 } from './3d-lib.js';
import { Scene3D } from './scene3d.js';
import { Object3D } from './object3d.js';
import { Camera3D } from './camera3d.js';

import {
  cars, obstacles, trafficLights, destinations, roads, 
  initAgentsModel, update, getCars, getObstacles,
  getTrafficLights, getDestinations, getRoads
} from './api_connection.js';

// Shaders usados in the program
import vsGLSL from './shaders/vs_phong_302.glsl?raw';
import fsGLSL from './shaders/fs_phong_302.glsl?raw';

const scene = new Scene3D();

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
    scene.addObject(road);
  }

  // Traffic Lights

  for (const light of trafficLights){
    light.arrays = baseCube.arrays;
    light.bufferInfo = baseCube.bufferInfo;
    light.vao = baseCube.vao;
    light.scale = { x: 0.5, y: 0.5, z: 0.5 };
    scene.addObject(light);
  }

  // Destinations

  for (const dest of destinations){
    dest.arrays = baseCube.arrays;
    dest.bufferInfo = baseCube.bufferInfo;
    dest.vao = baseCube.vao;
    dest.scale = { x: 0.5, y: 0.5, z: 0.5 };
    scene.addObject(dest);
  }
  
  // Copy the properties of the base objects
  for (const car of cars) {
    car.arrays = baseCube.arrays;
    car.bufferInfo = baseCube.bufferInfo;
    car.vao = baseCube.vao;
    car.scale = { x: 0.5, y: 0.5, z: 0.5 };
    scene.addObject(car);
  }

  // Copy the properties of the base objects
  for (const obstacle of obstacles) {
    obstacle.arrays = baseCube.arrays;
    obstacle.bufferInfo = baseCube.bufferInfo;
    obstacle.vao = baseCube.vao;
    obstacle.scale = { x: 0.5, y: 0.5, z: 0.5 };
    obstacle.color = [0.7, 0.7, 0.7, 1.0];
    scene.addObject(obstacle);
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

  // Matriz para transformar normales (aprox: inversa)
  const worldInverse = M4.inverse(world);

  // Color del objeto (si no tiene, blanco)
  const color = object.color || [1.0, 1.0, 1.0, 1.0];

  // Posición de la cámara (ya la tiene la escena)
  const cameraPos = scene.camera.posArray;

  // Luz en el mundo (elige la que quieras)
  const lightPos = [20, 30, 20];

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
    u_ambientLight:  [0.2, 0.2, 0.2, 1.0],
    u_diffuseLight:  [1.0, 1.0, 1.0, 1.0],
    u_specularLight: [1.0, 1.0, 1.0, 1.0],

    // Model colors (using the color from the API)
    u_ambientColor:  color,
    u_diffuseColor:  color,
    u_specularColor: [1.0, 1.0, 1.0, 1.0],

    // Shininess
    u_shininess: 20.0,
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
