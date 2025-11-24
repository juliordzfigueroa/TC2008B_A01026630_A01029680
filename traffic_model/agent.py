from mesa import Agent

class Car(Agent):
    """
    Agente Car. Representa un coche en el modelo de tráfico.
    Se aplica el algoritmo Dijkstra para encontrar la ruta más corta desde la posición actual hasta el destino.
    """
    def __init__(self, unique_id, model, start_pos):
        """
        Crea un nuevo agente aleatorio.
        Args:
            unique_id: ID del agente
            model: Referencia al modelo del agente
            start_pos: Posición inicial del coche en la cuadrícula
        """
        super().__init__(unique_id, model)
        self.model.grid.place_agent(self, start_pos)
        self.target = self.model.random_destination()
        self.route = self.model.dijkstra(self.pos, self.target)
        self.route_index = 0
        
    def freeCell(self, pos):
        """
        Verifica si se puede entrar a la celda
        """
        if not self.model.grid.in_bounds(pos):
            return False

        cell_agents = self.model.grid.get_cell_list_contents(pos)

        # Si hay otro coche, bloquear
        if any(isinstance(a, Car) for a in cell_agents):
            return False

        # Si hay un obstáculo, bloquear
        if any(isinstance(a, Obstacle) for a in cell_agents):
            return False

        # Si hay un semáforo en rojo, bloquear
        for a in cell_agents:
            if isinstance(a, Traffic_Light) and a.state == 0:
                return False

        return True

    def step(self):
        """ 
        Define el comportamiento del coche en cada paso del modelo.
        """
        # Si no hay ruta o se llegó al destino, calcular nueva ruta
        if not self.route or self.route_index >= len(self.route):
            self.target = self.model.random_destination()
            self.route = self.model.dijkstra(self.pos, self.target)
            self.route_index = 0
            return

        next_pos = self.route[self.route_index]

        # Semáforos, autos, obstáculos
        if not self.freeCell(next_pos):
            return

        # Mover el auto
        self.model.grid.move_agent(self, next_pos)
        self.route_index += 1

class Traffic_Light(Agent):
    """
    Semáforo. Donde están los semáforos en la cuadrícula.
    """
    def __init__(self, unique_id, model, initial_state, timeToChange):
        super().__init__(unique_id, model)
        """
        Creamos un nuevo semáforo.
        Args:
            unique_id: ID del agente
            model: Referencia al modelo del agente
            initial_state: Estado inicial del semáforo (verde o rojo)
            timeToChange: Después de cuántos pasos debe cambiar el semáforo de color
        """
        self.state = initial_state
        self.timeToChange = timeToChange

    def step(self):
        """ 
        Cambia el estado del semáforo después de un número determinado de pasos.
        """
        if self.model.schedule.steps % self.timeToChange == 0:
            self.state = not self.state

class Destination(Agent):
    """
    Agente Destination. Donde los coches quieren llegar.
    """
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)

    def step(self):
        pass

class Obstacle(Agent):
    """
    Agente Obstacle. Donde hay obstáculos o edificios en la cuadrícula.
    """
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)

    def step(self):
        pass

class Road(Agent):
    """
    Agente Road. Donde los coches pueden moverse.
    """
    def __init__(self, unique_id, model, direction):
        """
        Creamos el agente Road.
        Args:
            unique_id: ID del agente
            model: Referencia al modelo del agente
            direction: Dirección en la que se puede mover el coche
        """
        super().__init__(unique_id, model)
        self.direction = direction

    def step(self):
        pass