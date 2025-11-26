/*
 * Functions to connect to an external API to get the coordinates of agents
 *
 * Gilberto Echeverria
 * 2025-11-08
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
        // Send a GET request to the agent server to retrieve the agent positions
        let response = await fetch(agent_server_uri + "getCars");

        // Check if the response was successful
        if (response.ok) {
            // Parse the response as JSON
            let result = await response.json();

            // Log the agent positions
            //console.log("getAgents positions: ", result.positions)

            // Check if the agents array is empty
            if (cars.length == 0) {
                // Create new agents and add them to the agents array
                for (const car of result.positions) {
                    const newAgent = new Object3D(car.id, [car.x, car.y, car.z]);
                    // Store the initial position
                    newAgent['oldPosArray'] = newAgent.posArray;
                    cars.push(newAgent);
                }
                // Log the agents array
                //console.log("Agents:", agents);

            } else {
                // Update the positions of existing agents
                for (const car of result.positions) {
                    const current_car = cars.find((object3d) => object3d.id == car.id);

                    // Check if the agent exists in the agents array
                    if(current_car != undefined){
                        // Update the agent's position
                        current_car.oldPosArray = current_car.posArray;
                        current_car.position = {x: car.x, y: car.y, z: car.z};
                    }

                    //console.log("OLD: ", current_car.oldPosArray,
                    //            " NEW: ", current_car.posArray);
                }
            }
        }

    } catch (error) {
        // Log any errors that occur during the request
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
            // Log the obstacles array
            //console.log("Obstacles:", obstacles);
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

            for (const light of result.positions) {
                const newLight = new Object3D(light.id, [light.x, light.y, light.z]);
                newLight['state'] = light.state; 
                newLight.color = light.state === 'red' ? [1.0, 0.0, 0.0, 1.0] : [0.0, 1.0, 0.0, 1.0];
                trafficLights.push(newLight);
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
                newRoad.color = [0.2, 0.2, 0.2, 1.0]; // Gris oscuro para las carreteras
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
            await getCars();
            await getTrafficLights();
            // Log a message indicating that the agents have been updated
            //console.log("Updated agents");
        }

    } catch (error) {
        // Log any errors that occur during the request
        console.log(error);
    }
}

export { cars, obstacles, trafficLights, roads, destinations, initAgentsModel, update, getCars, getObstacles, getTrafficLights, getDestinations, getRoads };
