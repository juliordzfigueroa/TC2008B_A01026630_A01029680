""""
Agentes del modelo de tráfico.
Jin Sik Yoon A01026630 
Julio César Rodríguez Figueroa A01029680
"""

from mesa.discrete_space import CellAgent, FixedAgent
import random

class Car(CellAgent):
    """
    Agente móvil que representa un carro.
    """
    def __init__(self, model, cell):
        super().__init__(model)
        self.cell = cell
        self.target = None
        self.route = []
        self.route_index = 0
        self.blocked_steps = 0

    def freeCell(self, cell):
        """
        Comprueba si el carro puede avanzar al cell dado.
        """
        # Si hay un carro, bloqueo
        if any(isinstance(a, Car) for a in cell.agents):
            return False
        
        # Si hay un obstáculo, bloqueo
        if any(isinstance(a, Obstacle) for a in cell.agents):
            return False

        # Si hay semáforo en rojo, bloqueo
        for a in cell.agents:
            if isinstance(a, Traffic_Light) and a.state == False:
                return False
        
        return True

    def step(self):
        """
        Comportamiento del coche en cada paso.
        """
        # Si ya llegó al destino
        if self.target and self.pos == self.target:
            self.model.remove_car(self)
            return

        # Si no hay ruta o se terminó la ruta
        if not self.route or self.route_index >= len(self.route):
            # elegir destino nuevo
            self.target = random.choice(self.model.destinations) \
                if self.model.destinations else self.model.random_destination()

            self.route = self.model.a_star(self.pos, self.target)
            self.route_index = 0
            return

        # Siguiente celda a mover
        next_pos = self.route[self.route_index]
        next_cell = self.model.grid[next_pos]

        # Checar si hay bloqueo
        if not self.freeCell(next_cell):
            self.blocked_steps += 1

            if self.blocked_steps >= 5:
                self.target = random.choice(self.model.destinations) \
                    if self.model.destinations else self.model.random_destination()
                self.route = self.model.a_star(self.pos, self.target)
                self.route_index = 0
                self.blocked_steps = 0
            return

        # Moverse a la siguiente celda
        self.cell = next_cell
        self.route_index += 1
        self.blocked_steps = 0


class Traffic_Light(FixedAgent):
    """
    Semáforo fijo.
    """
    def __init__(self, model, cell, state=False, timeToChange=10):
        super().__init__(model)
        self.cell = cell
        self.state = state
        self.timeToChange = timeToChange

    def step(self):
        if self.model.steps % self.timeToChange == 0:
            self.state = not self.state


class Destination(FixedAgent):
    """
    Lugar de destino
    """
    def __init__(self, model, cell):
        super().__init__(model)
        self.cell = cell


class Obstacle(FixedAgent):
    """
    Obstáculo fijo
    """
    def __init__(self, model, cell):
        super().__init__(model)
        self.cell = cell


class Road(FixedAgent):
    """
    Carretera fija con dirección
    """
    def __init__(self, model, cell, direction="Left"):
        super().__init__(model)
        self.cell = cell
        self.direction = direction