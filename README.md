# Water Cycle Simulator
##  _An Ongoing Simulation Project_
I'll aim to provide something of a dev log on this little project.


# Day 1 Development Log
1.24.24:
- initial setup with barebones html and PIXI.js
- separate land and water blocks created, arrangements randomized
- created base evaporation (assuming 100% sunlight) of water bodies
- created condensation into clouds with animated size/color showing their water density
- created precipitation effect where water volume re-enters water blocks or 'soaks' land blocks
- created reduced evaporation effect for soaked water on land blocks

# Impressions
- My first time building with PIXI.js as a graphics framework, it's very easy to use and quite permissive.
- The main render loop has a straightforward syntax

# Future Plans
- extending the land out horizontally and moving a 'sun' across it periodically to change evaporation levels in affected areas
- applying some noise generation techniques (i.e. Perlin) to the land block surfaces to create stepped terrain, and physics for the raindrops so new lakes can be created
- creating primitive plant life