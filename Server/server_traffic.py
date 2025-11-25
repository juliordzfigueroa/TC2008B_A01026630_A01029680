# TC2008B. Sistemas Multiagentes y Gráficas Computacionales
# Jin Sik Yoon A01026630 
# Julio César Rodríguez Figueroa A01029680
# Servidor de Python flask para interactuar con JavaScript

from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from traffic_model.model import CityModel
from traffic_model.agent import Road, Traffic_Light, Obstacle, Destination, Car

# Parametros del modelo
model = None
currentStep = 0

# This application will be used to interact with Unity
app = Flask("Traffic Simulation")
cors = CORS(app, origins=['http://localhost'])

# This route will be used to send the parameters of the simulation to the server.
# The servers expects a POST request with the parameters in a form.
@app.route('/init', methods=['GET', 'POST'])
@cross_origin()
def initModel():
    global currentStep, model

    if request.method == 'POST':
        try:
            data = request.get_json()
            number_agents = int(data.get('NAgents', 5))
            currentStep = 0
        except Exception as e:
            print("INIT ERROR:", e)
            return jsonify({"message": "Error initializing the model"}), 500

    print(f"Model parameters:{number_agents}")
    model = CityModel(number_agents)
    return jsonify({"message": f"Parameters recieved, model initiated"})

# This route will be used to get the positions of the agents
@app.route('/getCars', methods=['GET'])
@cross_origin()
def getCars():
    global model

    if request.method == 'GET':
        # Get the positions of the agents and return them to WebGL in JSON.json.t.
        # Note that the positions are sent as a list of dictionaries, where each dictionary has the id and position of an agent.
        # The y coordinate is set to 1, since the agents are in a 3D world. The z coordinate corresponds to the row (y coordinate) of the grid in mesa.
        try:
            agentCells = model.grid.all_cells.select(
                lambda cell: any(isinstance(obj, Car) for obj in cell.agents)
            ).cells
            # print(f"CELLS: {agentCells}")

            agents = [
                (cell.coordinate, agent)
                for cell in agentCells
                for agent in cell.agents
                if isinstance(agent, Car)
            ]
            # print(f"AGENTS: {agents}")

            agentPositions = [
                {"id": str(a.unique_id), "x": coordinate[0], "y":1, "z":coordinate[1]}
                for (coordinate, a) in agents
            ]
            # print(f"AGENT POSITIONS: {agentPositions}")

            return jsonify({'positions': agentPositions})
        except Exception as e:
            print(e)
            return jsonify({"message": "Error with the agent positions"}), 500

# This route will be used to get the positions of the obstacles
@app.route('/getObstacles', methods=['GET'])
@cross_origin()
def getObstacles():
    global model

    if request.method == 'GET':
        try:
            # Get the positions of the obstacles and return them to WebGL in JSON.json.t.
            # Same as before, the positions are sent as a list of dictionaries, where each dictionary has the id and position of an obstacle.

            obstacleCells = model.grid.all_cells.select(
                lambda cell: any(isinstance(obj, Obstacle) for obj in cell.agents)
            )
            # print(f"CELLS: {agentCells}")

            agents = [
                (cell.coordinate, agent)
                for cell in obstacleCells
                for agent in cell.agents
                if isinstance(agent, Obstacle)
            ]
            # print(f"AGENTS: {agents}")

            obstaclePositions = [
                {"id": str(a.unique_id), "x": coordinate[0], "y":1, "z":coordinate[1]}
                for (coordinate, a) in agents
            ]
            # print(f"OBSTACLE POSITIONS: {obstaclePositions}")

            return jsonify({'positions': obstaclePositions})
        except Exception as e:
            print(e)
            return jsonify({"message": "Error with obstacle positions"}), 500
        
@app.route('/getTrafficLights', methods=['GET'])
@cross_origin()
def getTrafficLights():
    global model

    if request.method == 'GET':
        try:
            # Get the positions of the traffic lights and return them to WebGL in JSON.json.t.
            # Same as before, the positions are sent as a list of dictionaries, where each dictionary has the id and position of a traffic light.

            trafficLightCells = model.grid.all_cells.select(
                lambda cell: any(isinstance(obj, Traffic_Light) for obj in cell.agents)
            )

            agents = [
                (cell.coordinate, agent)
                for cell in trafficLightCells
                for agent in cell.agents
                if isinstance(agent, Traffic_Light)
            ]

            trafficLightPositions = [
                {"id": str(a.unique_id), "x": coordinate[0], "y":1, "z":coordinate[1], "state": a.state}
                for (coordinate, a) in agents
            ]
            # print(f"TRAFFIC LIGHT POSITIONS: {trafficLightPositions}")

            return jsonify({'positions': trafficLightPositions})
        except Exception as e:
            print(e)
            return jsonify({"message": "Error with traffic light positions"}), 500

@app.route('/getDestinations', methods=['GET'])
@cross_origin()
def getDestinations():
    global model

    if request.method == 'GET':
        try:
            # Get the positions of the destinations and return them to WebGL in JSON.json.t.
            # Same as before, the positions are sent as a list of dictionaries, where each dictionary has the id and position of a destination.

            destinationCells = model.grid.all_cells.select(
                lambda cell: any(isinstance(obj, Destination) for obj in cell.agents)
            )

            agents = [
                (cell.coordinate, agent)
                for cell in destinationCells
                for agent in cell.agents
                if isinstance(agent, Destination)
            ]

            destinationPositions = [
                {"id": str(a.unique_id), "x": coordinate[0], "y":1, "z":coordinate[1]}
                for (coordinate, a) in agents
            ]
            # print(f"DESTINATION POSITIONS: {destinationPositions}")

            return jsonify({'positions': destinationPositions})
        except Exception as e:
            print(e)
            return jsonify({"message": "Error with destination positions"}), 500
        
@app.route('/getRoads', methods=['GET'])
@cross_origin()
def getRoads():
    global model

    if request.method == 'GET':
        try:
            # Get the positions of the roads and return them to WebGL in JSON.json.t.
            # Same as before, the positions are sent as a list of dictionaries, where each dictionary has the id and position of a road.

            roadCells = model.grid.all_cells.select(
                lambda cell: any(isinstance(obj, Road) for obj in cell.agents)
            )

            agents = [
                (cell.coordinate, agent)
                for cell in roadCells
                for agent in cell.agents
                if isinstance(agent, Road)
            ]

            roadPositions = [
                {"id": str(a.unique_id), "x": coordinate[0], "y":1, "z":coordinate[1], "direction": a.direction}
                for (coordinate, a) in agents
            ]
            # print(f"ROAD POSITIONS: {roadPositions}")

            return jsonify({'positions': roadPositions})
        except Exception as e:
            print(e)
            return jsonify({"message": "Error with road positions"}), 500
        

# This route will be used to update the model
@app.route('/update', methods=['GET'])
@cross_origin()
def updateModel():
    global currentStep, model
    if request.method == 'GET':
        try:
        # Update the model and return a message to WebGL saying that the model was updated successfully
            model.step()
            currentStep += 1
            return jsonify({'message': f'Model updated to step {currentStep}.', 'currentStep':currentStep})
        except Exception as e:
            print(e)
            return jsonify({"message": "Error during step."}), 500


if __name__=='__main__':
    # Run the flask server in port 8585
    app.run(host="localhost", port=8585, debug=True)