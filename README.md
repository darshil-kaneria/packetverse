# Packetverse
This document details the implementation of Packetverse, an educational website for the students of Carnegie Mellon University. The website provides interactive simulations for network concepts such as Spanning Tree Protocol (STP), TCP/IP, Mixnet routing, and more. Users are anonymously identified through their current session, and each session can have multiple active simulations. A simulation is considered active if the user has interacted with it, and each simulation can be uniquely identified by its session.

## Simulations
A simulation serves as a playground where users can explore networking concepts. Users can set up nodes, configure initial algorithm parameters, and control the simulation timeline. The timeline is interactive, allowing users to play, pause, fast-forward, rewind, and reset the simulation to its default state.

For each active simulation, a log is maintained for the current session and is continuously transferred to the client as the simulation progresses. If the user rewinds the timeline, the client replays the log locally in the browser. Any modifications to simulation parameters update the log accordingly. If the user resets the simulation, the log is cleared, and a new one is created. Each type of simulation (e.g., STP, OSPF, TCP/IP) may have its own method for logging events, but all simulations share core functionalities such as playing, pausing, rewinding, and resetting.

New simulation types can be created by implementing the simulation engine interface.

The current simulation engine interface is as follows:
```
type Engine interface {
	Run(ctx context.Context, config interface{}, resultChan chan []byte) error
	Stop() error
}
```

The interface can be extended to add more functions if needed.

## Website User Interface
The website's user interface is like many other websites that you've seen before. A sidebar lists all available simulations, with each item representing a networking concept. Each concept page includes an explanation followed by an interactive simulation area.

## Simulation User Interface
The simulation interface consists of a blank playground area. When a user navigates to a simulation for the first time, a default demo setup is loaded. Users can modify this setup or reset it to a blank state to start from scratch. At the bottom of the interface, a draggable timeline provides controls for playing, pausing, adjusting speed, and other interactions.
