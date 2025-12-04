/*
 * Functions to connect to an external API to get the coordinates of agents. Adapted to the traffic simulation.
 *
 * Jin Sik Yoon A01026630
 * Julio Cesar Rodriguez Figueroa A01029680
 * 30/11/2025
 */


'use strict';

import { Object3D } from './object3d';

// Define the agent server URI
const agent_server_uri = "http://localhost:8585/";

// Initialize arrays to store agents and obstacles
const cars = [];
const obstacles = [];
const trafficLights = [];
const destinations = [];
const roads = [];

// Define the data object
const initData = {
    NAgents: 5,
};


/* FUNCTIONS FOR THE INTERACTION WITH THE MESA SERVER */

/*
 * Initializes the agents model by sending a POST request to the agent server.
 */
async function initAgentsModel() {
    try {
        // Send a POST request to the agent server to initialize the model
        let response = await fetch(agent_server_uri + "init", {
            method: 'POST',
            headers: { 'Content-Type':'application/json' },
            body: JSON.stringify(initData)
        });

        // Check if the response was successful
        if (response.ok) {
            // Parse the response as JSON and log the message
            let result = await response.json();
            console.log(result.message);
        }

    } catch (error) {
        // Log any errors that occur during the request
        console.log(error);
    }
}

/*
 * Retrieves the current positions of all agents from the agent server.
 */
async function getCars() {
    try {
        let response = await fetch(agent_server_uri + "getCars");

        if (response.ok) {
            let result = await response.json();

            const positions = result.positions || [];

            const aliveCars = new Set(positions.map(car => car.id));

            // Remove cars that are no longer present
            for (let i = cars.length - 1; i >= 0; i--) {
                const c = cars[i];
                if (!aliveCars.has(c.id)) {
                    cars.splice(i, 1);
                }
            }

            for (const car of positions) {
                // Create an or update Object3D for each car
                const newPos = [car.x, car.y, car.z]; 

                let obj = cars.find(object3d => object3d.id === car.id);

                if (!obj) {
                    // First create the new car
                    obj = new Object3D(car.id, newPos);
                    obj.isCar = true;
                    // Initial position in Mesa server
                    obj.serverPos = [...newPos];
                    obj.oldServerPos = [...newPos];
                    cars.push(obj);
                } else {
                    // Update existing car position in the simulation using the server position
                    obj.oldServerPos = obj.serverPos ? [...obj.serverPos] : [...obj.posArray];
                    obj.serverPos = [...newPos];
                    obj.direction = car.actualDirection; // Update the direction
                    obj.setPosition(newPos);
                }
            }
        }
    } catch (error) {
        console.log(error);
    }
}

/*
 * Retrieves the current positions of all obstacles from the agent server.
 */
async function getObstacles() {
    try {
        // Send a GET request to the agent server to retrieve the obstacle positions
        let response = await fetch(agent_server_uri + "getObstacles");

        // Check if the response was successful
        if (response.ok) {
            // Parse the response as JSON
            let result = await response.json();

            // Create new obstacles and add them to the obstacles array
            for (const obstacle of result.positions) {
                const newObstacle = new Object3D(obstacle.id, [obstacle.x, obstacle.y, obstacle.z]);
                obstacles.push(newObstacle);
            }
        }

    } catch (error) {
        // Log any errors that occur during the request
        console.log(error);
    }
}

async function getTrafficLights() {
  try {
    let response = await fetch(agent_server_uri + "getTrafficLights");

    if (response.ok) {
      let result = await response.json();

      if (trafficLights.length === 0) {
        // Create new objects
        for (const light of result.positions) {
          const obj2 = new Object3D(light.id, [light.x, light.y + 2, light.z]);
          obj2.state = light.state;
          const tile = new Object3D(light.id + "tile", [light.x, light.y, light.z]);

          if (light.state === false) {
            obj2.color = [1.0, 0.0, 0.0, 1.0];   // Red
          } else if (light.state === true) {
            obj2.color = [0.0, 1.0, 0.0, 1.0];   // Green
          } else {
            obj2.color = [0.7, 0.7, 0.7, 1.0];   // Gray for tiles
          }

          trafficLights.push(tile);
          trafficLights.push(obj2);
        }
      } else {
        // To update existing objects
        for (const light of result.positions) {
          const obj2 = trafficLights.find(object3d => object3d.id === light.id );
          if (!obj2) continue;

          obj2.setPosition([light.x, light.y + 2, light.z]); 
          obj2.state = light.state;

          if (light.state === false) {
            obj2.color = [1.0, 0.0, 0.0, 1.0]; // Red
          } else if (light.state === true) {
            obj2.color = [0.0, 1.0, 0.0, 1.0]; // Green
          }
        }
      }
    }
  } catch (error) {
    console.log(error);
  }
}


async function getDestinations() {
    try {
        let response = await fetch(agent_server_uri + "getDestinations");
        if (response.ok) {
            let result = await response.json();

            for (const dest of result.positions) {
                const newDest = new Object3D(dest.id, [dest.x, dest.y, dest.z]);
                newDest.color = [0.0, 0.0, 1.0, 1.0]; // Azul para los destinos
                destinations.push(newDest); 
            }
        }
    } catch (error) {   
        console.log(error);
    }
}

async function getRoads() {
    try {
        let response = await fetch(agent_server_uri + "getRoads");
        if (response.ok) {
            let result = await response.json();

            for (const road of result.positions) {
                const newRoad = new Object3D(road.id, [road.x, road.y, road.z]);
                newRoad.color = [0.2, 0.2, 0.2, 1.0]; // Dark gray for roads
                newRoad['direction'] = road.direction;
                roads.push(newRoad);
            }
        }
    } catch (error) {
        console.log(error);
    }
}

/*
 * Updates the agent positions by sending a request to the agent server.
 */
async function update() {
    try {
        // Send a request to the agent server to update the agent positions
        let response = await fetch(agent_server_uri + "update");

        // Check if the response was successful
        if (response.ok) {
            // Retrieve the updated agent positions
            const data = await response.json();

            // Debug the current step
            await getCars();
            await getTrafficLights();
            await getDestinations();
            await getRoads();
        }

    } catch (error) {
        // Log any errors that occur during the request
        console.log(error);
    }
}

export { cars, obstacles, trafficLights, roads, destinations, initAgentsModel, update, getCars, getObstacles, getTrafficLights, getDestinations, getRoads };
