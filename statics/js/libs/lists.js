/*
 * File with all lists used in the simulation
 * Jin Sik Yoon A01026630
 * Julio César Rodríguez Figueroa A01029680
 * 
 * 03/12/2025
*/

// List for the different building models, each one has different dimensions we will use for scaling in our model
const BUILDING_MODELS = [
  {
    id: 'b1',
    path: './models/objs/building1.obj',
    mtl: './models/mtls/building1.mtl',
    width: 10.46,
    depth: 10.34,
    height: 22.68,
  },
  {
    id: 'b2',
    path: './models/objs/building2.obj',
    mtl: './models/mtls/building2.mtl',
    width: 11.08,
    depth: 11.00,
    height: 38.71,
  },
  {
    id: 'b3',
    path: './models/objs/building3.obj',
    mtl: './models/mtls/building3.mtl',
    width: 17.46,
    depth: 17.46,
    height: 37.61,
  },
  {
    id: 'b4',
    path: './models/objs/building4.obj',
    mtl: './models/mtls/building4.mtl',
    width: 14.10,
    depth: 14.10,
    height: 55.61,
  },
];

// Car model details
const CAR_MODEL = {
  id: 'car',
  path: './models/objs/lowpoly_car.obj',
  mtl:  './models/mtls/lowpoly_car.mtl',
  width:  2.7,   
  depth:  4.8,  
  height: 1.6,
};

// Wheel model details
const WHEEL_MODEL = {
  id: 'wheel',
  path: './models/objs/wheel.obj',
  mtl: './models/mtls/wheel_basic.mtl',
  width: 1.0,
  depth: 1.0,
  height: 1.0,
};

// Texture paths
const WHEEL_TEXTURE_PATH = './models/textures/wheel_texture.png';
const ROAD_TEXTURE_PATH = './models/textures/road_texture.png';

export { BUILDING_MODELS, CAR_MODEL, WHEEL_MODEL, WHEEL_TEXTURE_PATH, ROAD_TEXTURE_PATH };